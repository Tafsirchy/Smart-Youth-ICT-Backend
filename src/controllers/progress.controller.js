const Progress = require('../models/Progress');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// @desc    Get progress for a specific course
// @route   GET /api/progress/:courseId
// @access  Private
exports.getProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    // Check enrollment
    const enrollment = await Enrollment.findOne({ user: req.user._id, course: courseId, isActive: true });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    let progress = await Progress.findOne({ student: req.user._id, course: courseId });
    
    if (!progress) {
      // Initialize if not exists
      progress = await Progress.create({ student: req.user._id, course: courseId, completedLessons: [], percentage: 0 });
    } else {
      // Update last accessed
      progress.lastAccessedAt = Date.now();
      await progress.save();
    }

    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a lesson as complete and update overall progress
// @route   PUT /api/progress/:courseId/complete-lesson
// @access  Private
exports.markLessonComplete = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { lessonId } = req.body; // Using topic text or lesson ID

    if (!lessonId) return res.status(400).json({ success: false, message: 'Lesson identifier is required' });

    // Ensure course exists to count total lessons
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Calculate total lessons dynamically from course curriculum
    const totalLessons = course.curriculum?.reduce((acc, mod) => acc + (mod.topics?.length || 0), 0) || 1;

    let progress = await Progress.findOne({ student: req.user._id, course: courseId });
    if (!progress) {
      progress = new Progress({ student: req.user._id, course: courseId, completedLessons: [] });
    }

    // Add to completed array if not present
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    // Recalculate percentage
    const completedCount = progress.completedLessons.length;
    let newPercentage = Math.round((completedCount / totalLessons) * 100);
    if (newPercentage > 100) newPercentage = 100;

    progress.percentage = newPercentage;
    progress.isCompleted = newPercentage === 100;
    progress.lastAccessedAt = Date.now();

    await progress.save();

    res.json({ success: true, data: progress, message: 'Lesson marked as complete' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get overall student dashboard stats (all active progresses)
// @route   GET /api/progress/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.countDocuments({ user: req.user._id, isActive: true });
    const completedCourses = await Progress.countDocuments({ student: req.user._id, isCompleted: true });
    
    // Total completed lessons across all courses
    const allProgress = await Progress.find({ student: req.user._id });
    const totalCompletedLessons = allProgress.reduce((acc, p) => acc + p.completedLessons.length, 0);

    // Assuming certificates count equals completed courses for now
    res.json({
      success: true,
      data: {
        enrolledCourses: enrollments,
        completedLessons: totalCompletedLessons,
        certificates: completedCourses,
      }
    });
  } catch (err) {
    next(err);
  }
};
