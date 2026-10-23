const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Course = require('../models/Course');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const { isBranchAuthorized } = require('../middleware/rbac.middleware');

// @desc    Get all enrollments (Admin/Management/Employee, branch-aware)
// @route   GET /api/enrollments
// @access  Private
exports.getEnrollments = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const filter = {};

    let targetBranchId = isSuper ? req.query.branchId : req.user.branchId;
    if (!isSuper && !targetBranchId) {
      return res.status(403).json({ success: false, message: 'Branch ID required for this role.' });
    }

    if (targetBranchId) {
      const Branch = require('../models/Branch');
      const mongoose = require('mongoose');
      const branchDoc = await Branch.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(targetBranchId) ? [{ _id: targetBranchId }] : []),
          { slug: targetBranchId },
          { code: targetBranchId?.toString().toUpperCase() }
        ]
      });
      if (branchDoc) {
        filter.branchId = branchDoc._id;
      } else if (mongoose.Types.ObjectId.isValid(targetBranchId)) {
        filter.branchId = targetBranchId;
      }
    }

    const enrollments = await Enrollment.find(filter)
      .populate('user', 'name email image avatar')
      .populate('course', 'title price thumbnail')
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
      .populate('user', 'name email avatar')
      .populate('course', 'title price');

    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

    // Students must only see their own enrollments
    if (req.user.role === 'student' && enrollment.user?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own enrollment details.' });
    }

    // Branch isolation check for staff
    if (req.user.role !== 'student' && !isBranchAuthorized(req, enrollment.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this branch data.' });
    }

    res.json({ success: true, data: enrollment });
  } catch (err) {
    next(err);
  }
};

// @desc    Create enrollment (Admin manual)
// @route   POST /api/enrollments
// @access  Private (Staff with students:enroll)
exports.createEnrollment = async (req, res, next) => {
  try {
    const { userId, courseId, branchId } = req.body;
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const targetBranch = isSuper ? (branchId || req.user.branchId) : req.user.branchId;

    if (!userId || !courseId || !targetBranch) {
      return res.status(400).json({ success: false, message: 'UserID, CourseID and BranchID are required.' });
    }

    const enrollment = await Enrollment.create({
      user: userId,
      course: courseId,
      branchId: targetBranch,
      paymentStatus: req.body.paymentStatus || 'paid' 
    });

    // Notify Student & Instructor
    let course = null;
    try {
      const [user, fetchedCourse] = await Promise.all([
        User.findById(userId),
        Course.findById(courseId)
      ]);
      course = fetchedCourse;
      if (user && course) {
        emailService.sendEnrollmentConfirm(user, course)
          .catch(e => req.log?.error('enrollment confirmation email failed', { courseId, err: e }));

        // ðŸ”” In-App Notification to Student
        notificationService.notifyUser(userId, {
          title: 'Enrollment Confirmed',
          message: `You have been enrolled in "${course.title}". You can now access your learning modules and assignments!`,
          category: 'academic',
          priority: 'high',
          type: 'success',
          link: '/student/my-courses',
          metadata: { courseId: course._id, branchId: targetBranch, actorName: req.user.name }
        }).catch(err => req.log?.error('enrollment in-app notification failed', { courseId, err }));

        // ðŸ”” Notification to Instructor if assigned
        if (course.instructor) {
          notificationService.notifyUser(course.instructor, {
            title: 'New Student Enrolled',
            message: `${user.name || 'A student'} was enrolled in your course "${course.title}".`,
            category: 'academic',
            priority: 'normal',
            type: 'info',
            link: '/instructor/courses',
            metadata: { courseId: course._id, branchId: targetBranch, studentId: user._id }
          }).catch(err => req.log?.error('instructor enrollment notification failed', { courseId, err }));
        }

        // ðŸ”” Notification to Branch Admins
        notificationService.notifyBranchAdmins(targetBranch, {
          title: 'Student Enrolled',
          message: `${user.name || 'Student'} enrolled in "${course.title}".`,
          category: 'academic',
          priority: 'normal',
          type: 'info',
          link: '/admin/students',
          metadata: { courseId: course._id, studentId: user._id }
        }).catch(err => req.log?.error('branch admin enrollment notification failed', { courseId, branchId: targetBranch, err }));
      }
    } catch(e) {
      // The enrollment is already stored; a failed notification only means
      // the confirmation message did not reach the student or the admin.
      req.log?.error('enrollment notification failed', {
        enrollmentId: enrollment._id,
        courseId: course?._id || courseId,
        err: e,
      });
    }

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
      .populate('course', 'title price category thumbnail')
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
