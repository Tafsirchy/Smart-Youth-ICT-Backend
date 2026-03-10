const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getQuizzesByCourse,
  getQuizDetails,
  submitQuiz,
  createQuiz
} = require('../controllers/quiz.controller');

const router = express.Router();

// View routes (students & admins)
router.get('/course/:courseId', protect, getQuizzesByCourse);
router.get('/:id', protect, getQuizDetails);

// Student actions
router.post('/:id/submit', protect, authorize('student'), submitQuiz);

// Admin / Instructor actions
router.post('/', protect, authorize('admin', 'instructor'), createQuiz);

module.exports = router;
