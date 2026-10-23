const mongoose = require('mongoose');
const User = require('../../models/User');
const Enrollment = require('../../models/Enrollment');

exports.getPublicInstructors = async (req, res, next) => {
  try {
    const { branchId, courseId, q, page = 1, limit = 50 } = req.query;
    const filter = { role: 'instructor', isActive: true };

    if (branchId) filter.branchId = branchId;

    if (courseId) {
      const Course = require('../../models/Course');
      const instructorIds = await Course.find({ _id: courseId }).distinct('instructor');
      filter._id = { $in: instructorIds };
    }

    if (q) {
      const escapedQ = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedQ, $options: 'i' } },
        { expertise: { $regex: escapedQ, $options: 'i' } }
      ];
    }

    const limitNum = Number(limit) || 50;
    const instructors = await User.find(filter)
      .select('name avatar bio expertise role branchId')
      .populate('branchId', 'name')
      .skip((page - 1) * limitNum)
      .limit(limitNum)
      .sort('name')
      .lean();

    const total = await User.countDocuments(filter);
    res.json({
      success: true,
      count: instructors.length,
      total,
      data: instructors
    });
  } catch (err) { next(err); }
};

// ============================================================================
// BRANCH STAFF DELEGATION CONTROLLERS (Branch Manager & Super Admin)
// ============================================================================

const { PERMISSIONS, PERMISSION_METADATA } = require('../../config/permissions');

// @desc    Get permissions registry & catalog for UI selection
// @route   GET /api/users/permissions/catalog
// @access  Private (Branch Admin / Super Admin)
exports.getPermissionsCatalog = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        permissions: PERMISSIONS,
        catalog: PERMISSION_METADATA,
      },
    });
  } catch (err) { next(err); }
};

// @desc    Get all staff/employees for caller's branch
// @route   GET /api/users/branch/staff
// @access  Private (Branch Admin / Super Admin)
exports.verifyStudentPublic = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid Student ID format' });
    }

    const user = await User.findOne({ _id: studentId, role: 'student' })
      .select('name avatar role branchId createdAt isActive isVerified')
      .populate('branchId', 'name code city');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No student found with this identification record.'
      });
    }

    const enrollments = await Enrollment.find({ user: user._id, isActive: true })
      .populate('course', 'title thumbnail')
      .select('course createdAt');

    const formattedStudentId = `SYICT-${user.branchId?.code || 'HQ'}-${user._id.toString().slice(-6).toUpperCase()}`;

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        studentId: formattedStudentId,
        role: user.role,
        branch: user.branchId,
        isVerified: Boolean(user.isVerified),
        enrollmentCount: enrollments.length,
        courses: enrollments.map(e => ({
          title: e.course?.title,
          thumbnail: e.course?.thumbnail,
          enrolledAt: e.createdAt
        })),
        memberSince: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Force revoke all active sessions for a user (Super Admin)
// @route   POST /api/users/:id/force-logout
// @access  Private (Super Admin)
