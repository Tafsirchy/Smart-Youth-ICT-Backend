const express = require('express');
const {
  getSchedules,
  getMyRoutine,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/classSchedule.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);

// My Routine (Available for Students & Instructors).
// Scoped to the caller's own enrolments and taught classes, so it needs no
// branch-management permission.
router.get('/my-routine', getMyRoutine);

// Branch Management / Staff.
// `courses:view` is accepted alongside the granular schedule permissions
// because it is what the dashboard navigation already gates this screen on.
const canViewSchedules = requireAccess(PERMISSIONS.SCHEDULES_VIEW, PERMISSIONS.COURSES_VIEW);
const canManageSchedules = requireAccess(
  PERMISSIONS.SCHEDULES_MANAGE,
  PERMISSIONS.COURSES_VIEW,
  PERMISSIONS.STAFF_MANAGE
);

router.get('/', canViewSchedules, getSchedules);
router.post('/', canManageSchedules, createSchedule);
router.put('/:id', canManageSchedules, updateSchedule);
router.delete('/:id', canManageSchedules, deleteSchedule);

module.exports = router;
