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
  enrollCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/course.controller');

// GET  /api/courses            — public
router.get('/', getCourses);

// GET  /api/courses/enrolled   — student
router.get('/enrolled', protect, getEnrolledCourses);

// GET  /api/courses/:slug      — public
router.get('/:slug', getCourseBySlug);

// POST /api/courses/:id/enroll — student
router.post('/:id/enroll', protect, enrollCourse);

const courseManagers = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management', 'instructor'];

// POST /api/courses            — auth
router.post('/', protect, authorize(...courseManagers), upload.single('thumbnail'), createCourse);

// PUT /api/courses/:id
router.put('/:id', protect, authorize(...courseManagers), upload.single('thumbnail'), updateCourse);

// DELETE /api/courses/:id
router.delete('/:id', protect, authorize(...courseManagers), deleteCourse);

module.exports = router;
