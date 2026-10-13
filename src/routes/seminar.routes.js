const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');
const {
  createSeminar,
  getSeminars,
  getSeminarById,
  updateSeminar,
  deleteSeminar,
  registerForSeminar,
  getAllRegistrations,
  markAttended,
} = require('../controllers/seminar.controller');

// Public — list seminars (can filter by branchId) and register
router.get('/', getSeminars);
router.post('/register', registerForSeminar);
router.get('/details/:id', getSeminarById);

// Admin / Staff — manage branch seminars
router.post('/', protect, requireAccess(PERMISSIONS.SEMINARS_MANAGE), createSeminar);
router.patch('/:id', protect, requireAccess(PERMISSIONS.SEMINARS_MANAGE), updateSeminar);
router.delete('/:id', protect, requireAccess(PERMISSIONS.SEMINARS_MANAGE), deleteSeminar);

// Admin / Staff — view registrations and mark attendance
router.get('/registrations', protect, requireAccess(PERMISSIONS.SEMINARS_VIEW, PERMISSIONS.SEMINARS_MANAGE), getAllRegistrations);
router.patch('/:id/attend', protect, requireAccess(PERMISSIONS.SEMINARS_MANAGE), markAttended);
router.patch('/registrations/:id', protect, requireAccess(PERMISSIONS.SEMINARS_MANAGE), markAttended);

module.exports = router;
