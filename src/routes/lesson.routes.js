const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} = require('../controllers/lesson.controller');

// Public / enrolled student
router.get('/',     protect, getLessonsByCourse);   // ?courseId=xxx
router.get('/:id',  protect, getLessonById);

// Instructor / Admin
router.post('/',    protect, authorize('admin', 'instructor'), createLesson);
router.put('/:id',  protect, authorize('admin', 'instructor'), updateLesson);
router.delete('/:id', protect, authorize('admin'), deleteLesson);

module.exports = router;
