/**
 * branch — part of the former
 * super.controller.js. The handlers are unchanged; they only live in a
 * smaller file now.
 */
const Branch = require('../../models/Branch');
const User = require('../../models/User');
const Course = require('../../models/Course');
const AuditLog = require('../../models/AuditLog');
const slugify = require('slugify');
const emailService = require('../../services/email.service');
const { parseLocation } = require('../../utils/geoPoint');
const { clearCourseCache } = require('../course.controller');
const { invalidatePublicBranchesCache } = require('../branch.controller');
const { runWithTransaction } = require('../../utils/transaction');
const BRANCHES_DETAILS_CACHE_TTL = 30 * 1000; // 30 seconds
let branchesDetailsCache = null;
let branchesDetailsCacheTime = 0;

exports.clearBranchesDetailsCache = () => {
    branchesDetailsCache = null;
    branchesDetailsCacheTime = 0;
};

exports.getAllBranchesDetails = async (req, res, next) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        if (!forceRefresh && branchesDetailsCache && (Date.now() - branchesDetailsCacheTime < BRANCHES_DETAILS_CACHE_TTL)) {
            return res.json(branchesDetailsCache);
        }

        const [branches, studentCountsAgg, branchCourseAgg, globalCoursesCount] = await Promise.all([
            Branch.find().sort('-createdAt').lean(),
            User.aggregate([
                { $match: { role: 'student', branchId: { $ne: null } } },
                { $group: { _id: '$branchId', count: { $sum: 1 } } }
            ]),
            Course.aggregate([
                { $match: { isDeleted: false, isAllBranches: { $ne: true } } },
                {
                    $project: {
                        targets: {
                            $setUnion: [
                                { $ifNull: ['$availableBranches', []] },
                                { $cond: [{ $ifNull: ['$branchId', false] }, ['$branchId'], []] }
                            ]
                        }
                    }
                },
                { $unwind: '$targets' },
                { $group: { _id: '$targets', count: { $sum: 1 } } }
            ]),
            Course.countDocuments({ isAllBranches: true, isDeleted: false })
        ]);

        const studentMap = new Map();
        studentCountsAgg.forEach((s) => {
            if (s._id) studentMap.set(String(s._id), s.count);
        });

        const courseMap = new Map();
        branchCourseAgg.forEach((c) => {
            if (c._id) courseMap.set(String(c._id), c.count);
        });

        let totalStudentsCount = 0;
        let totalCoursesCount = 0;

        const enhancedBranches = branches.map((b) => {
            const bIdStr = String(b._id);
            const studentCount = studentMap.get(bIdStr) || 0;
            const courseCount = (courseMap.get(bIdStr) || 0) + globalCoursesCount;

            totalStudentsCount += studentCount;
            totalCoursesCount += courseCount;

            return {
                ...b,
                stats: {
                    students: studentCount,
                    courses: courseCount
                }
            };
        });

        const payload = {
            success: true,
            summary: {
                totalBranches: branches.length,
                activeBranches: branches.filter(b => b.isActive).length,
                inactiveBranches: branches.filter(b => !b.isActive).length,
                totalStudents: totalStudentsCount,
                totalCourses: totalCoursesCount
            },
            data: enhancedBranches
        };

        branchesDetailsCache = payload;
        branchesDetailsCacheTime = Date.now();

        res.json(payload);
    } catch (err) {
        next(err);
    }
};

// @desc    Deploy/Push a Master Course to multiple branches
// @route   POST /api/super/deploy-course
// @access  Private (Super Admin)

exports.onboardBranch = async (req, res, next) => {
  try {
    const { 
      name, code, type, division, establishedDate, logo, coverImage, gallery, facilities, website,
      address, location, contact, whatsapp, notice, officeHours,
      adminName, adminEmail, adminPassword 
    } = req.body;

    // Normalise + validate the unique branch code up-front. Without this the
    // duplicate surfaces as a raw MongoServerError ("E11000 duplicate key error
    // collection: syict.branches index: code_1 ...") which is meaningless to the
    // dashboard. The schema applies `uppercase`/`trim`, so compare the same way.
    const normalizedCode = String(code || '').trim().toUpperCase();

    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, message: 'Branch name is required.' });
    }

    if (!normalizedCode) {
      return res.status(400).json({ success: false, message: 'Branch code is required.' });
    }

    const codeClash = await Branch.exists({ code: normalizedCode });

    if (codeClash) {
      const taken = (await Branch.distinct('code')).map((c) => String(c).toUpperCase());
      let suggestion = `${normalizedCode}-B`;
      let n = 1;
      while (taken.includes(`SYICT-${String(n).padStart(3, '0')}`)) n += 1;
      if (!taken.includes(suggestion)) {
        suggestion = `SYICT-${String(n).padStart(3, '0')}`;
      }

      return res.status(409).json({
        success: false,
        message: `Branch code "${normalizedCode}" is already in use. Try "${suggestion}" instead.`,
        data: { field: 'code', value: normalizedCode, suggestion },
      });
    }

    // Normalise location to GeoJSON. When the admin never picked a point on the
    // map the client still sends `location: { lat: '', long: '' }`; persisting
    // that would create an invalid Point and MongoDB's 2dsphere index would
    // reject the whole document.
    const parsedLocation = parseLocation(location);
    if (!parsedLocation.valid) {
      return res.status(400).json({ success: false, message: parsedLocation.error });
    }

    // 1. Create Branch with comprehensive metadata
    const branch = await Branch.create({
      name, 
      code: normalizedCode, 
      type, 
      division: division || 'Dhaka',
      establishedDate, 
      logo, 
      coverImage,
      gallery: Array.isArray(gallery) ? gallery : [],
      facilities: Array.isArray(facilities) ? facilities : [],
      website,
      address, 
      ...(parsedLocation.point ? { location: parsedLocation.point } : {}),
      contact, 
      whatsapp,
      notice,
      officeHours,
      slug: slugify(name, { lower: true })
    });

    // 2. Create Primary Branch Admin if provided
    let admin = null;
    if (adminEmail && adminPassword && adminName) {
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'branch_admin',
        branchId: branch._id
      });

      // ðŸ“§ Notify Branch Admin with temporary credentials
      emailService.sendBranchOnboarding(admin, branch, adminPassword)
        .catch(err => console.error('[Onboarding Email Failed]', err.message));
    }

    branchesDetailsCache = null;
    invalidatePublicBranchesCache(); // ✅ new branch visible on public page immediately

    res.status(201).json({
      success: true,
      data: { branch, admin: admin ? { id: admin._id, name: admin.name, email: admin.email } : null },
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
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    const unset = {};

    // Reject a code collision before MongoDB does, so the dashboard gets a
    // readable message instead of "E11000 duplicate key error ...".
    if ('code' in updateData) {
      const normalizedCode = String(updateData.code || '').trim().toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({ success: false, message: 'Branch code is required.' });
      }

      const codeClash = await Branch.exists({ code: normalizedCode, _id: { $ne: req.params.id } });

      if (codeClash) {
        return res.status(409).json({
          success: false,
          message: `Branch code "${normalizedCode}" is already in use by another branch.`,
          data: { field: 'code', value: normalizedCode },
        });
      }

      updateData.code = normalizedCode;
    }

    if ('location' in updateData) {
      const parsedLocation = parseLocation(updateData.location);

      if (!parsedLocation.valid) {
        return res.status(400).json({ success: false, message: parsedLocation.error });
      }

      if (parsedLocation.point) {
        updateData.location = parsedLocation.point;
      } else {
        // Coordinates were cleared â†’ remove the field entirely so the 2dsphere
        // index never sees an empty Point.
        delete updateData.location;
        unset.location = 1;
      }
    }

    const payload = Object.keys(unset).length ? { $set: updateData, $unset: unset } : updateData;

    const branch = await Branch.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    
    // Log action
    await AuditLog.create({ actor: req.user._id, action: 'UPDATE_BRANCH', entity: 'Branch', entityId: branch._id, details: { name: branch.name } });

    branchesDetailsCache = null;
    invalidatePublicBranchesCache(); // ✅ flush public /branches/public/all cache

    res.json({ success: true, data: branch });
  } catch (err) { next(err); }
};

// @desc    Toggle branch active status (Activate / Deactivate)
// @route   PATCH /api/super/branches/:id/toggle-status
// @access  Private (Super Admin)

exports.toggleBranchStatus = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    branch.isActive = !branch.isActive;
    await branch.save();

    await AuditLog.create({ 
      actor: req.user._id, 
      action: branch.isActive ? 'ACTIVATE_BRANCH' : 'DEACTIVATE_BRANCH', 
      entity: 'Branch', 
      entityId: branch._id,
      branchId: branch._id,
      details: { branchName: branch.name, code: branch.code, status: branch.isActive ? 'Active' : 'Inactive' }
    });

    branchesDetailsCache = null;

    res.json({ 
      success: true, 
      data: branch, 
      message: `Branch ${branch.name} is now ${branch.isActive ? 'Active' : 'Inactive'}` 
    });
  } catch (err) { next(err); }
};

// @desc    Hard delete a branch (Super Admin only)
// @route   DELETE /api/super/branches/:id
// @access  Private (Super Admin)

exports.deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    const branchId = branch._id;
    const branchName = branch.name;

    // Cascade: remove branch reference from users (don't delete the users themselves)
    const User = require('../../models/User');
    await User.updateMany(
      { branchId },
      { $unset: { branchId: '' }, $pull: { secondaryBranches: branchId } }
    );

    // Cascade: remove branchId from enrollments (keep enrollment records)
    const Enrollment = require('../../models/Enrollment');
    await Enrollment.updateMany({ branchId }, { $unset: { branchId: '' } });

    // Cascade: unset branchId from courses owned by this branch
    const Course = require('../../models/Course');
    await Course.updateMany({ branchId }, { $unset: { branchId: '' } });
    await Course.updateMany(
      { availableBranches: branchId },
      { $pull: { availableBranches: branchId } }
    );

    // Hard delete the branch
    await Branch.findByIdAndDelete(branchId);

    // Log action
    await AuditLog.create({
      actor: req.user._id,
      action: 'DELETE_BRANCH',
      entity: 'Branch',
      entityId: branchId,
      metadata: { name: branchName }
    });

    branchesDetailsCache = null;
    invalidatePublicBranchesCache(); // ✅ deleted branch removed from public page immediately

    res.json({ success: true, message: `Branch "${branchName}" permanently deleted.` });
  } catch (err) { next(err); }
};

// @desc    Create a new Master Course
// @route   POST /api/super/courses
// @access  Private (Super Admin)

exports.getBranchCoursesAssignment = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    const courses = await Course.find({ isDeleted: false })
      .select('title slug category thumbnail price originalPrice mode duration isPublished isAllBranches availableBranches branchId')
      .sort('title.en title.bn');

    const branchIdStr = branch._id.toString();
    const branchCourseIds = (branch.courses || []).map(id => id.toString());

    const result = courses.map((c) => {
      const isAvailableInBranch =
        Boolean(c.isAllBranches) ||
        (Array.isArray(c.availableBranches) && c.availableBranches.some(b => b.toString() === branchIdStr)) ||
        (c.branchId && c.branchId.toString() === branchIdStr) ||
        branchCourseIds.includes(c._id.toString());

      return {
        _id: c._id,
        title: c.title,
        slug: c.slug,
        category: c.category,
        thumbnail: c.thumbnail,
        price: c.price,
        originalPrice: c.originalPrice,
        mode: c.mode,
        duration: c.duration,
        isPublished: c.isPublished,
        isAllBranches: Boolean(c.isAllBranches),
        isAssigned: isAvailableInBranch,
      };
    });

    res.json({
      success: true,
      branch: {
        _id: branch._id,
        name: branch.name,
        code: branch.code,
      },
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update courses assigned to a branch
// @route   PUT /api/super/branches/:id/courses
// @access  Private (Super Admin)

exports.updateBranchCoursesAssignment = async (req, res, next) => {
  try {
    const { courseIds } = req.body;
    if (!Array.isArray(courseIds)) {
      return res.status(400).json({ success: false, message: 'courseIds must be an array of IDs' });
    }

    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    // 1. Update Branch.courses
    branch.courses = courseIds;
    await branch.save();

    // 2. Add branch to availableBranches for assigned courses
    await Course.updateMany(
      { _id: { $in: courseIds } },
      { $addToSet: { availableBranches: branch._id } }
    );

    // 3. Remove branch from availableBranches for unassigned courses
    await Course.updateMany(
      { _id: { $nin: courseIds }, availableBranches: branch._id },
      { $pull: { availableBranches: branch._id } }
    );

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'UPDATE_BRANCH_COURSES',
      entity: 'Branch',
      entityId: branch._id,
      details: { branchName: branch.name, assignedCount: courseIds.length }
    });

    // Flush cache so public and frontend instantly reflect changes
    if (typeof clearCourseCache === 'function') {
      clearCourseCache();
    }

    res.json({
      success: true,
      message: `Successfully updated courses for ${branch.name}. ${courseIds.length} courses are now available.`,
      count: courseIds.length,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle whether a course is available across all branches
// @route   PATCH /api/super/courses/:id/toggle-all-branches
// @access  Private (Super Admin)

exports.transferStudentBranch = async (req, res, next) => {
  try {
    // "toBranchId" is the canonical field; "targetBranchId" is accepted as an alias.
    const { studentId, toBranchId, targetBranchId, reason = '', transferNotes = '' } = req.body;
    const destinationBranchId = toBranchId || targetBranchId;

    if (!studentId || !destinationBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Destination Branch ID are required',
      });
    }

    const User = require('../../models/User');
    const Branch = require('../../models/Branch');
    const Enrollment = require('../../models/Enrollment');
    const Invoice = require('../../models/Invoice');
    const AuditLog = require('../../models/AuditLog');

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ success: false, message: 'Only accounts with the student role can be transferred' });
    }

    const targetBranch = await Branch.findById(destinationBranchId);
    if (!targetBranch) {
      return res.status(404).json({ success: false, message: 'Target destination campus branch not found' });
    }

    const fromBranchId = student.branchId;
    if (fromBranchId && fromBranchId.toString() === destinationBranchId.toString()) {
      return res.status(400).json({ success: false, message: 'Student is already assigned to this campus branch' });
    }

    const fromBranch = fromBranchId ? await Branch.findById(fromBranchId) : null;

    await runWithTransaction(async (session) => {
      // 1. Maintain historical branch trail in secondaryBranches
      const secondary = student.secondaryBranches || [];
      if (fromBranchId && !secondary.some(b => b.toString() === fromBranchId.toString())) {
        secondary.push(fromBranchId);
      }

      student.branchId = targetBranch._id;
      student.secondaryBranches = secondary;
      student.tokenVersion = (student.tokenVersion || 0) + 1; // Invalidate session so new branch takes effect
      await student.save(session ? { session } : undefined);

      // 2. Transfer active enrollments to the new campus branch
      await Enrollment.updateMany(
        { user: student._id },
        { $set: { branchId: targetBranch._id } },
        session ? { session } : undefined
      );

      // 3. Update pending/unpaid invoices to the new campus branch
      await Invoice.updateMany(
        { user: student._id, status: { $ne: 'paid' } },
        { $set: { branchId: targetBranch._id } },
        session ? { session } : undefined
      );

      // 4. Log Audit Trail
      const audit = new AuditLog({
        actor: req.user._id,
        action: 'TRANSFER_STUDENT_BRANCH',
        entity: 'User',
        entityId: student._id,
        branchId: targetBranch._id,
        details: {
          studentId: student._id,
          studentName: student.name,
          studentEmail: student.email,
          fromBranchId: fromBranchId || null,
          fromBranchName: fromBranch?.name || 'HQ / Central',
          toBranchId: targetBranch._id,
          toBranchName: targetBranch.name,
          reason: reason.trim(),
          transferNotes: transferNotes.trim(),
          adminName: req.user.name,
        },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
      await audit.save(session ? { session } : undefined);
    });

    const userCache = require('../../utils/userCache');
    userCache.del(student._id);

    res.json({
      success: true,
      message: `Student ${student.name} successfully transferred from ${fromBranch?.name || 'HQ'} to ${targetBranch.name}.`,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          branchId: targetBranch._id,
          branchName: targetBranch.name,
          secondaryBranches: student.secondaryBranches,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send Multi-Channel Emergency Broadcast (SMS, Email, In-App)
// @route   POST /api/super/broadcast/send
// @access  Private (Super Admin)
