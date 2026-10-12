const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');
const {
  registerForSeminar,
  getAllRegistrations,
  markAttended,
} = require('../controllers/seminar.controller');

// Public — anyone can register
router.post('/register', registerForSeminar);

// Admin / Staff — view registrations and mark attendance
router.get('/',                    protect, requireAccess(PERMISSIONS.SEMINARS_VIEW, PERMISSIONS.SEMINARS_MANAGE), getAllRegistrations);
router.get('/registrations',       protect, requireAccess(PERMISSIONS.SEMINARS_VIEW, PERMISSIONS.SEMINARS_MANAGE), getAllRegistrations);
router.patch('/:id/attend',        protect, requireAccess(PERMISSIONS.SEMINARS_MANAGE), markAttended);
router.patch('/registrations/:id', protect, requireAccess(PERMISSIONS.SEMINARS_MANAGE), markAttended);

module.exports = router;
