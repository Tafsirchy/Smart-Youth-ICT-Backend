const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');

// @desc    Get instructor dashboard stats
// @route   GET /api/instructor/stats
// @access  Private (Instructor/Admin)
exports.getInstructorStats = async (req, res, next) => {
  try {
    const instructorId = req.user._id;

    // 1. Get courses taught by instructor
    const courses = await Course.find({ instructor: instructorId, isDeleted: false });
    const courseIds = courses.map(c => c._id);

    // 2. Count total students enrolled in these courses
    const studentCount = await Enrollment.countDocuments({ 
      course: { $in: courseIds },
      paymentStatus: 'paid' 
    });

    // 3. Count pending submissions for these courses
    const pendingSubmissions = await Submission.countDocuments({
      status: 'pending',
      assignment: { 
        $in: await require('../models/Assignment').find({ course: { $in: courseIds } }).select('_id') 
      }
    });

    res.json({
      success: true,
      data: {
        totalCourses: courses.length,
        totalStudents: studentCount,
        pendingSubmissions,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get courses taught by the instructor
// @route   GET /api/instructor/courses
// @access  Private (Instructor/Admin)
exports.getMyCoursesForInstructor = async (req, res, next) => {
  try {
    const courses = await Course.find({ instructor: req.user._id, isDeleted: false })
      .populate('branchId', 'name')
      .sort('-createdAt');

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (err) {
    next(err);
  }
};
