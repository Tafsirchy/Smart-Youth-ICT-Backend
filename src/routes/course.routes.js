/**
 * Generic route stub factory.
 * Each stub exports an Express Router with placeholder handlers.
 * Replace stubs with real controller functions as you build each feature.
 */
const express = require('express');
const router  = express.Router();
const { protect }    = require('../middleware/auth.middleware');
const { authorize }  = require('../middleware/role.middleware');
const Course         = require('../models/Course');

// GET  /api/courses            — public
router.get('/', async (req, res, next) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    const courses = await Course.find(filter)
      .populate('instructor', 'name avatar')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort('-createdAt');
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
});

// GET  /api/courses/enrolled   — student
router.get('/enrolled', protect, async (req, res, next) => {
  try {
    const Enrollment = require('../models/Enrollment');
    const enrollments = await Enrollment.find({ user: req.user._id, paymentStatus: 'paid' })
      .populate('course');
    res.json({ success: true, data: enrollments.map((e) => e.course) });
  } catch (err) { next(err); }
});

// GET  /api/courses/:slug      — public
router.get('/:slug', async (req, res, next) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).populate('instructor', 'name avatar');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err) { next(err); }
});

// POST /api/courses/:id/enroll — student
router.post('/:id/enroll', protect, async (req, res) => {
  res.json({ success: true, message: 'Enroll endpoint — complete payment flow to activate' });
});

// POST /api/courses            — admin/instructor
router.post('/', protect, authorize('admin', 'instructor'), async (req, res, next) => {
  try {
    const course = await Course.create({ ...req.body, instructor: req.user._id });
    res.status(201).json({ success: true, data: course });
  } catch (err) { next(err); }
});

module.exports = router;
