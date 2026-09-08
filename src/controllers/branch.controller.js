const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');

exports.getBranchStats = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.user.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch context missing' });

    const stats = await User.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId) } }, // Ensure ObjectId
      { $facet: {
          students: [{ $match: { role: 'student' } }, { $count: 'count' }],
          courses:  [{ $lookup: { from: 'courses', pipeline: [{ $match: { branchId: new mongoose.Types.ObjectId(branchId) } }], as: 'c' } }, { $count: 'count' }], // This is inefficient, better separate
          revenue:  [{ $lookup: { from: 'payments', pipeline: [{ $match: { branchId: new mongoose.Types.ObjectId(branchId), status: 'completed' } }], as: 'p' } }, { $unwind: '$p' }, { $group: { _id: null, total: { $sum: '$p.amount' } } }]
      }}
    ]);
    
    // Actually, simpler is often better for different collections. 
    // Let's use Promise.all but ensure indexes are used.
    
    const [studentCount, courseCount, paymentAgg] = await Promise.all([
        User.countDocuments({ branchId, role: 'student' }),
        Course.countDocuments({ branchId }),
        Payment.aggregate([
            { $match: { branchId: new mongoose.Types.ObjectId(branchId), status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
    ]);

    res.json({
      success: true,
      data: {
        totalStudents: studentCount,
        totalCourses: courseCount,
        totalRevenue: paymentAgg[0]?.total || 0,
        certificates: 0 
      }
    });

  } catch (err) {
    next(err);
  }
};

const Branch = require('../models/Branch');
const LeadCRM = require('../models/LeadCRM');

// @desc    Get lightweight list of active branches for dropdowns
// @route   GET /api/branches/public/list
// @access  Public
exports.getPublicBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true }).select('name code slug division').sort('name');
    res.json({ success: true, data: branches });
  } catch (err) { next(err); }
};

// @desc    Get detailed list of active branches for public directory
// @route   GET /api/branches/public/all
// @access  Public
exports.getPublicBranchesDetailed = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true })
      .select('name code slug type division address contact location officeHours facilities coverImage gallery logo website whatsapp notice isActive')
      .sort({ type: 1, name: 1 });
    res.json({ success: true, count: branches.length, data: branches });
  } catch (err) { next(err); }
};

// @desc    Get single branch public details with available courses
// @route   GET /api/branches/public/:slugOrId
// @access  Public
exports.getPublicBranchBySlug = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(slugOrId);
    
    const query = isObjectId 
      ? { _id: slugOrId, isActive: true } 
      : { slug: slugOrId.toLowerCase(), isActive: true };

    const branch = await Branch.findOne(query);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const courses = await Course.find({
      $or: [
        { branchId: branch._id },
        { availableBranches: branch._id },
        { isAllBranches: true }
      ],
      isDeleted: false,
      isPublished: true
    }).select('title slug thumbnail price originalPrice duration category mode isPopular isAllBranches');

    res.json({ 
      success: true, 
      data: {
        ...branch._doc,
        courses
      }
    });
  } catch (err) { next(err); }
};

// @desc    Submit public campus visit or consultation inquiry
// @route   POST /api/branches/public/:branchId/inquiry
// @access  Public
exports.createBranchInquiry = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { name, phone, email, interest, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const lead = await LeadCRM.create({
      name,
      phone,
      email: email || '',
      branchId: branch._id,
      source: 'organic',
      interest: interest || `Campus Visit @ ${branch.name}`,
      status: 'new',
      notes: message ? [{ text: `Campus Tour / Inquiry: ${message}` }] : []
    });

    res.status(201).json({
      success: true,
      message: `Thank you, ${name}! Your campus visit inquiry for ${branch.name} has been received. Our team will contact you shortly.`,
      data: { id: lead._id }
    });
  } catch (err) { next(err); }
};
