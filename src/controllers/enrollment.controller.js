const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Course = require('../models/Course');

// @desc    Get all enrollments (Admin/Management only, branch-aware)
// @route   GET /api/enrollments
// @access  Private (Branch Admin/Management)
exports.getEnrollments = async (req, res, next) => {
  try {
    const branchId = req.user.branchId || req.query.branchId;
    const filter   = {};

    if (req.user.role !== 'super_admin') {
      if (!branchId) return res.status(403).json({ success: false, message: 'Branch ID required for this role.' });
      filter.branchId = branchId;
    }

    const enrollments = await Enrollment.find(filter)
      .populate('user', 'name email image')
      .populate('course', 'title price')
      .sort(req.query.sort || '-createdAt')
      .limit(parseInt(req.query.limit) || 50);

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single enrollment
// @route   GET /api/enrollments/:id
// @access  Private
exports.getEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('course', 'title');

    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

    // Isolation check
    if (req.user.role !== 'super_admin' && enrollment.branchId?.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this branch data.' });
    }

    res.json({ success: true, data: enrollment });
  } catch (err) {
    next(err);
  }
};

// @desc    Create enrollment (Admin manual)
// @route   POST /api/enrollments
// @access  Private (Admin)
exports.createEnrollment = async (req, res, next) => {
  try {
    const { userId, courseId, branchId } = req.body;
    const targetBranch = branchId || req.user.branchId;

    if (!userId || !courseId || !targetBranch) {
        return res.status(400).json({ success: false, message: 'UserID, CourseID and BranchID are required.' });
    }

    const enrollment = await Enrollment.create({
      user: userId,
      course: courseId,
      branchId: targetBranch,
      paymentStatus: 'paid' // Assuming manual admin enrollment is paid or handle otherwise
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current student's enrollments
// @route   GET /api/enrollments/me
// @access  Private (Student)
exports.getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate('course', 'title price category')
      .sort('-createdAt');

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (err) {
    next(err);
  }
};

