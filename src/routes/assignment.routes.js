const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getAssignmentsByCourse,
  submitAssignment,
  createAssignment,
  gradeSubmission,
  getMyAssignments,
  getMySubmissions,
  getInstructorSubmissions
} = require('../controllers/assignment.controller');

const router = express.Router();

// Routes for everyone (with role checks inside methods)
router.get('/course/:courseId', protect, getAssignmentsByCourse);
router.get('/my-assignments', protect, authorize('student'), getMyAssignments);
router.get('/my-submissions', protect, authorize('student'), getMySubmissions);


// Student actions
router.post('/:id/submit', protect, authorize('student'), submitAssignment);

// Admin / Instructor actions
const assignmentManagers = ['super_admin', 'super_management', 'branch_admin', 'branch_management', 'admin', 'instructor'];

router.get('/instructor/submissions', protect, authorize(...assignmentManagers), getInstructorSubmissions);
router.post('/', protect, authorize(...assignmentManagers), createAssignment);
router.put('/submissions/:id/grade', protect, authorize(...assignmentManagers), gradeSubmission);

module.exports = router;
