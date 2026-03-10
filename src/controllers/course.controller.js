const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { uploadToImageBB } = require('../services/imagebb.service');
const slugify = require('slugify');

/**
 * @desc    Get all published courses
 * @route   GET /api/courses
 * @access  Public
 */
const getCourses = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;

    const courses = await Course.find(filter)
      .populate('instructor', 'name avatar')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort('-createdAt');

    res.json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single course by slug
 * @route   GET /api/courses/:slug
 * @access  Public
 */
const getCourseBySlug = async (req, res, next) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate('instructor', 'name avatar');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get enrolled courses for student
 * @route   GET /api/courses/enrolled
 * @access  Private (Student)
 */
const getEnrolledCourses = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id, paymentStatus: 'paid' })
      .populate('course');
      
    res.json({ success: true, data: enrollments.map((e) => e.course) });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private (Admin/Instructor)
 */
const createCourse = async (req, res, next) => {
  try {
    let thumbnailUrl = '';

    // Handle thumbnail upload if file exists
    if (req.file) {
      thumbnailUrl = await uploadToImageBB(req.file.buffer);
    }

    // Generate slug from English title
    const slug = slugify(req.body.title?.en || 'course', { lower: true, strict: true });

    // Build course data
    const courseData = {
      ...req.body,
      slug,
      instructor: req.user._id,
      thumbnail: thumbnailUrl || req.body.thumbnail, // use uploaded URL or fallback to string in body
    };

    // If body fields come as strings from form-data, we might need to parse them
    if (typeof courseData.title === 'string') courseData.title = JSON.parse(courseData.title);
    if (typeof courseData.price === 'string') courseData.price = Number(courseData.price);
    
    // Create the course
    const course = await Course.create(courseData);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Enroll in a course stub
 * @route   POST /api/courses/:id/enroll
 * @access  Private (Student)
 */
const enrollCourse = async (req, res, next) => {
  res.json({ success: true, message: 'Enroll endpoint — complete payment flow to activate' });
};

module.exports = {
  getCourses,
  getCourseBySlug,
  getEnrolledCourses,
  createCourse,
  enrollCourse,
};
