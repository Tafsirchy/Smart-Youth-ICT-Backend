const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  registerForSeminar,
  getAllRegistrations,
  markAttended,
} = require('../controllers/seminar.controller');

// Public — anyone can register
router.post('/register', registerForSeminar);

// Admin / Staff — view registrations and mark attendance
const staffRoles = authorize('admin', 'branch_admin', 'super_admin', 'branch_management', 'super_management');
router.get('/',                  protect, staffRoles, getAllRegistrations);
router.get('/registrations',     protect, staffRoles, getAllRegistrations);
router.patch('/:id/attend',      protect, staffRoles, markAttended);
router.patch('/registrations/:id', protect, staffRoles, markAttended);

module.exports = router;
