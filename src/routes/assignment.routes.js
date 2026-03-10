const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getAssignmentsByCourse,
  submitAssignment,
  createAssignment,
  gradeSubmission
} = require('../controllers/assignment.controller');

const router = express.Router();

// Routes for everyone (with role checks inside methods)
router.get('/course/:courseId', protect, getAssignmentsByCourse);

// Student actions
router.post('/:id/submit', protect, authorize('student'), submitAssignment);

// Admin / Instructor actions
router.post('/', protect, authorize('admin', 'instructor'), createAssignment);
router.put('/submissions/:id/grade', protect, authorize('admin', 'instructor'), gradeSubmission);

module.exports = router;
