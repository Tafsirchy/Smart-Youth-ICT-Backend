const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getProgress,
  markLessonComplete,
  getDashboardStats
} = require('../controllers/progress.controller');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET routes — accessible by student, admin, and instructor
router.get('/dashboard/stats', getDashboardStats);
router.get('/:courseId', getProgress);

// PUT routes — student only (writing progress)
router.put('/:courseId/complete-lesson', authorize('student'), markLessonComplete);

module.exports = router;
