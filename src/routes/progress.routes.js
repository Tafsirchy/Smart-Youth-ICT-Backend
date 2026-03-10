const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getProgress,
  markLessonComplete,
  getDashboardStats
} = require('../controllers/progress.controller');

const router = express.Router();

router.use(protect);
router.use(authorize('student'));

router.get('/dashboard/stats', getDashboardStats);
router.get('/:courseId', getProgress);
router.put('/:courseId/complete-lesson', markLessonComplete);

module.exports = router;
