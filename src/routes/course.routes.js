const express = require('express');
const router  = express.Router();
const { protect }    = require('../middleware/auth.middleware');
const { authorize }  = require('../middleware/role.middleware');
const upload         = require('../middleware/upload.middleware');
const {
  getCourses,
  getCourseBySlug,
  getEnrolledCourses,
  createCourse,
  enrollCourse
} = require('../controllers/course.controller');

// GET  /api/courses            — public
router.get('/', getCourses);

// GET  /api/courses/enrolled   — student
router.get('/enrolled', protect, getEnrolledCourses);

// GET  /api/courses/:slug      — public
router.get('/:slug', getCourseBySlug);

// POST /api/courses/:id/enroll — student
router.post('/:id/enroll', protect, enrollCourse);

// POST /api/courses            — admin/instructor
// Uses multer `upload.single('thumbnail')` to parse form-data and attach file
router.post('/', protect, authorize('admin', 'instructor'), upload.single('thumbnail'), createCourse);

module.exports = router;
