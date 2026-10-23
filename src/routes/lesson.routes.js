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
const lessonManagers = ['super_admin', 'super_management', 'branch_admin', 'branch_management', 'admin', 'instructor'];
const lessonAdmins = ['super_admin', 'super_management', 'branch_admin', 'admin'];

router.post('/',    protect, authorize(...lessonManagers), createLesson);
router.put('/:id',  protect, authorize(...lessonManagers), updateLesson);
router.delete('/:id', protect, authorize(...lessonAdmins), deleteLesson);

module.exports = router;
