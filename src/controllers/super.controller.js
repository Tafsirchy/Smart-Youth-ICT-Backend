const Branch = require('../models/Branch');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Invoice = require('../models/Invoice');
const Course = require('../models/Course');
const AuditLog = require('../models/AuditLog');
const SupportTicket = require('../models/SupportTicket');
const SystemSetting = require('../models/SystemSetting');
const HelpArticle = require('../models/HelpArticle');
const slugify = require('slugify');
const emailService = require('../services/email.service');
const sanitizeHtml = require('sanitize-html');

// @desc    Get global analytics (Super Admin only)
// @route   GET /api/super/stats
// @access  Private (Super Admin)
exports.getGlobalStats = async (req, res, next) => {
  try {
    const [totalBranches, totalStudents, totalInvoices, branchPerformance] = await Promise.all([
      Branch.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { 
            _id: '$branchId', 
            revenue: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
        { $unwind: '$branch' },
        { $project: { name: '$branch.name', revenue: 1, count: 1 } },
        { $sort: { revenue: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        branches: totalBranches,
        students: totalStudents,
        revenue:  totalInvoices[0]?.total || 0,
        performance: branchPerformance
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed list of all branches with metrics
// @route   GET /api/super/branches
// @access  Private (Super Admin)
exports.getAllBranchesDetails = async (req, res, next) => {
    try {
        const branches = await Branch.find().sort('-createdAt');
        
        // Enhance with quick stats per branch
        const enhancedBranches = await Promise.all(branches.map(async (b) => {
            const studentCount = await User.countDocuments({ branchId: b._id, role: 'student' });
            const courseCount  = await Enrollment.distinct('course', { branchId: b._id }).countDocuments(); // Simplified
            return {
                ...b._doc,
                stats: {
                    students: studentCount,
                    courses:  courseCount
                }
            };
        }));

        res.json({ success: true, data: enhancedBranches });
    } catch (err) {
        next(err);
    }
};

// @desc    Deploy/Push a Master Course to multiple branches
// @route   POST /api/super/deploy-course
// @access  Private (Super Admin)
exports.deployMasterCourse = async (req, res, next) => {
  try {
    const { masterCourseId, branchIds } = req.body;
    if (!masterCourseId || !branchIds || !Array.isArray(branchIds)) {
      return res.status(400).json({ success: false, message: 'MasterCourseID and BranchIDs array required' });
    }

    const masterCourse = await Course.findById(masterCourseId);
    if (!masterCourse || !masterCourse.isMaster) {
      return res.status(404).json({ success: false, message: 'Master course not found' });
    }

    const results = [];
    for (const bId of branchIds) {
      // Check if already deployed to this branch
      const existing = await Course.findOne({ masterCourseId, branchId: bId });
      if (existing) {
        results.push({ branchId: bId, status: 'skipped', message: 'Already deployed' });
        continue;
      }

      // Create new branch course
      const branchCourse = await Course.create({
        ...masterCourse._doc,
        _id: undefined, // mongo will generate new id
        isMaster: false,
        masterCourseId: masterCourse._id,
        branchId: bId,
        slug: `${masterCourse.slug}-${bId.toString().slice(-4)}`,
        isPublished: false // Let branch admin publish it
      });

      results.push({ branchId: bId, status: 'deployed', courseId: branchCourse._id });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

// @desc    Get consolidated finance report
// @route   GET /api/super/finance
// @access  Private (Super Admin)
exports.getGlobalFinanceReport = async (req, res, next) => {
  try {
    const report = await Invoice.aggregate([
      { $group: {
          _id: '$status',
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    const branchBreakdown = await Invoice.aggregate([
      { $group: {
          _id: '$branchId',
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0] } }
        }
      },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: '$branch' },
      { $project: { name: '$branch.name', revenue: 1, pending: 1 } }
    ]);

    res.json({ success: true, data: { summary: report, branches: branchBreakdown } });
  } catch (err) {
    next(err);
  }
};

// @desc    1-Click Branch Onboarding (Premium Lifecycle)
// @route   POST /api/super/onboard-branch
// @access  Private (Super Admin)
exports.onboardBranch = async (req, res, next) => {
  try {
    const { 
      name, code, type, establishedDate, logo, website,
      address, location, contact, officeHours,
      adminName, adminEmail, adminPassword 
    } = req.body;

    // Transform location to GeoJSON if it arrives as {lat, long}
    let geoJSONLocation = location;
    if (location && location.lat && location.long) {
      geoJSONLocation = {
        type: 'Point',
        coordinates: [parseFloat(location.long), parseFloat(location.lat)],
        googleMapsUrl: location.googleMapsUrl
      };
    }

    // 1. Create Branch with comprehensive metadata
    const branch = await Branch.create({
      name, 
      code, 
      type, 
      establishedDate, 
      logo, 
      website,
      address, 
      location: geoJSONLocation, 
      contact, 
      officeHours,
      slug: slugify(name, { lower: true })
    });

    // 2. Create Primary Branch Admin
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'branch_admin',
      branchId: branch._id
    });

    // 📧 Notify Branch Admin with temporary credentials
    emailService.sendBranchOnboarding(admin, branch, adminPassword)
      .catch(err => console.error('[Onboarding Email Failed]', err.message));

    res.status(201).json({
      success: true,
      data: { branch, admin: { id: admin._id, name: admin.name, email: admin.email } },
      message: `Strategic location ${name} (${code}) onboarded successfully.`
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Update branch details
// @route   PUT /api/super/branches/:id
// @access  Private (Super Admin)
exports.updateBranch = async (req, res, next) => {
  try {
    let updateData = { ...req.body };
    
    // Transform location to GeoJSON if it arrives as {lat, long}
    if (updateData.location && updateData.location.lat && updateData.location.long) {
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(updateData.location.long), parseFloat(updateData.location.lat)],
        googleMapsUrl: updateData.location.googleMapsUrl
      };
    }

    const branch = await Branch.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    
    // Log action
    await AuditLog.create({ actor: req.user._id, action: 'UPDATE_BRANCH', entity: 'Branch', entityId: branch._id, details: { name: branch.name } });

    res.json({ success: true, data: branch });
  } catch (err) { next(err); }
};

// @desc    Soft delete a branch
// @route   DELETE /api/super/branches/:id
// @access  Private (Super Admin)
exports.deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    branch.isActive = false;
    await branch.save();

    // Log action
    await AuditLog.create({ actor: req.user._id, action: 'DEACTIVATE_BRANCH', entity: 'Branch', entityId: branch._id });

    res.json({ success: true, message: 'Branch deactivated' });
  } catch (err) { next(err); }
};

// @desc    Create a new Master Course
// @route   POST /api/super/courses
// @access  Private (Super Admin)
exports.createMasterCourse = async (req, res, next) => {
  try {
    const courseData = { ...req.body, isMaster: true, branchId: null };
    if (!courseData.slug && courseData.title?.en) {
      courseData.slug = slugify(courseData.title.en, { lower: true });
    }

    const course = await Course.create(courseData);
    
    await AuditLog.create({ actor: req.user._id, action: 'CREATE_MASTER_COURSE', entity: 'Course', entityId: course._id });

    res.status(201).json({ success: true, data: course });
  } catch (err) { next(err); }
};

// @desc    Update a Master Course
// @route   PUT /api/super/courses/:id
// @access  Private (Super Admin)
exports.updateMasterCourse = async (req, res, next) => {
  try {
    const course = await Course.findOneAndUpdate({ _id: req.params.id, isMaster: true }, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ success: false, message: 'Master course not found' });

    await AuditLog.create({ actor: req.user._id, action: 'UPDATE_MASTER_COURSE', entity: 'Course', entityId: course._id });

    res.json({ success: true, data: course });
  } catch (err) { next(err); }
};

// @desc    Get all Master Courses
// @route   GET /api/super/courses
// @access  Private (Super Admin)
exports.getMasterCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ isMaster: true, isDeleted: false }).sort('-createdAt');
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
};

// @desc    Delete a Master Course (Soft Delete)
// @route   DELETE /api/super/courses/:id
// @access  Private (Super Admin)
exports.deleteMasterCourse = async (req, res, next) => {
  try {
    const course = await Course.findOneAndUpdate({ _id: req.params.id, isMaster: true }, { isDeleted: true }, { new: true });
    if (!course) return res.status(404).json({ success: false, message: 'Master course not found' });
    
    await AuditLog.create({ actor: req.user._id, action: 'DELETE_MASTER_COURSE', entity: 'Course', entityId: course._id });
    res.json({ success: true, message: 'Master course removed from active curriculum' });
  } catch (err) { next(err); }
};

// @desc    Get all support tickets
// @route   GET /api/super/tickets
// @access  Private (Super Admin)
exports.getTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find().populate('user', 'name email').sort('-createdAt');
    res.json({ success: true, data: tickets });
  } catch (err) { next(err); }
};

// @desc    Reply to a support ticket
// @route   POST /api/super/tickets/:id/reply
// @access  Private (Super Admin)
exports.replyToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const cleanMessage = sanitizeHtml(message || "", {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
      allowedAttributes: { 'a': ['href'] }
    });

    ticket.responses.push({
      user: req.user._id,
      message: cleanMessage,
      createdAt: Date.now()
    });
    
    if (ticket.status === 'open') ticket.status = 'in-progress';
    await ticket.save();

    // 📧 Notify Student (Async)
    emailService._send({
      to: ticket.user.email,
      subject: `🎫 Update on Ticket: ${ticket.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e1b4b;">Support Ticket Update</h2>
          <p style="color: #475569;">Hi ${ticket.user.name}, the Head Office has responded to your ticket:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #db2777;">
            <p style="margin: 0;">${cleanMessage}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">Log in to the dashboard to view the full conversation history.</p>
        </div>
      `
    }).catch(e => console.error('[Ticket Email Failed]', e.message));

    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
};

// @desc    Resolve a support ticket
// @route   PUT /api/super/tickets/:id/resolve
// @access  Private (Super Admin)
exports.resolveTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: 'resolved' }, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
};

// @desc    Get system settings
// @route   GET /api/super/settings
// @access  Private (Super Admin)
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.find();
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
};

// @desc    Update system setting
// @route   PUT /api/super/settings
// @access  Private (Super Admin)
exports.updateSettings = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const setting = await SystemSetting.findOneAndUpdate(
      { key }, 
      { value, updatedBy: req.user._id }, 
      { upsert: true, new: true }
    );
    res.json({ success: true, data: setting });
  } catch (err) { next(err); }
};

// @desc    Help Center Management (CRUD)
exports.getHelpArticles = async (req, res, next) => {
  try {
    const articles = await HelpArticle.find().sort('-createdAt');
    res.json({ success: true, data: articles });
  } catch (err) { next(err); }
};

exports.createHelpArticle = async (req, res, next) => {
  try {
    const { title, category, content, isPublished } = req.body;
    const slug = slugify(title, { lower: true });
    const article = await HelpArticle.create({ title, slug, category, content, isPublished, author: req.user._id });
    res.status(201).json({ success: true, data: article });
  } catch (err) { next(err); }
};

exports.updateHelpArticle = async (req, res, next) => {
  try {
    const article = await HelpArticle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data: article });
  } catch (err) { next(err); }
};

exports.deleteHelpArticle = async (req, res, next) => {
  try {
    const article = await HelpArticle.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, message: 'Article deleted permanently' });
  } catch (err) { next(err); }
};

// @desc    Get system-wide audit logs
// @route   GET /api/super/audit-logs
// @access  Private (Super Admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'name role')
      .sort('-createdAt')
      .limit(200);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};
