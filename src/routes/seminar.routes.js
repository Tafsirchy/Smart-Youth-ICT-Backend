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

// Admin — view registrations and mark attendance
router.get('/',            protect, authorize('admin'), getAllRegistrations);
router.patch('/:id/attend',protect, authorize('admin'), markAttended);

module.exports = router;
