const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { uploadToImageBB } = require('../services/imagebb.service');

// @desc    Get all lessons for a course
// @route   GET /api/lessons?courseId=:id
// @access  Private (enrolled student, instructor, admin)
exports.getLessonsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId query param is required' });

    // 🛡️ Security Fix: Authorization Check
    if (req.user.role === 'student') {
      const isEnrolled = await require('../models/Enrollment').findOne({ user: req.user._id, course: courseId, isActive: true });
      if (!isEnrolled) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not enrolled in this course.' });
      }
    }

    const lessons = await Lesson.find({ course: courseId }).sort('order');
    res.json({ success: true, count: lessons.length, data: lessons });
  } catch (err) { next(err); }
};

// @desc    Get a single lesson by ID
// @route   GET /api/lessons/:id
// @access  Private
exports.getLessonById = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course', 'title slug');
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
    res.json({ success: true, data: lesson });
  } catch (err) { next(err); }
};

// @desc    Create a new lesson in a course
// @route   POST /api/lessons
// @access  Private (admin, instructor)
exports.createLesson = async (req, res, next) => {
  try {
    const { courseId, title, description, videoUrl, duration, order, isPreview, resources } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // 🛡️ Security Fix: Authorization Check
    if (req.user.role === 'instructor' && course.instructor?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this course.' });
    }

    const lesson = await Lesson.create({
      course: courseId,
      title,
      description: typeof description === 'string' ? require('sanitize-html')(description) : description,
      videoUrl,
      duration: Number(duration) || 0,
      order: Number(order) || 1,
      isPreview: Boolean(isPreview),
      resources: resources || [],
    });

    res.status(201).json({ success: true, data: lesson });
  } catch (err) { next(err); }
};

// @desc    Update a lesson
// @route   PUT /api/lessons/:id
// @access  Private (admin, instructor)
exports.updateLesson = async (req, res, next) => {
  try {
    let lesson = await Lesson.findById(req.params.id).populate('course');
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    // 🛡️ Security Fix: Authorization Check
    if (req.user.role === 'instructor' && lesson.course?.instructor?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not teach this course.' });
    }

    // Explicit allow-list for Mass Assignment protection
    const allowed = ['title', 'description', 'videoUrl', 'duration', 'order', 'isPreview', 'resources'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (updates.description) updates.description = require('sanitize-html')(updates.description);

    lesson = await Lesson.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: lesson });
  } catch (err) { next(err); }
};

// @desc    Delete a lesson
// @route   DELETE /api/lessons/:id
// @access  Private (admin)
exports.deleteLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (err) { next(err); }
};
