const express = require('express');
const {
  getSchedules,
  getMyRoutine,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/classSchedule.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

// My Routine (Available for Students & Instructors)
router.get('/my-routine', getMyRoutine);

// Branch Management / Staff
const staffAndManagers = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management', 'staff', 'employee', 'instructor'];
const managersOnly = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'];

router.get('/', authorize(...staffAndManagers), getSchedules);
router.post('/', authorize(...managersOnly), createSchedule);
router.put('/:id', authorize(...managersOnly), updateSchedule);
router.delete('/:id', authorize(...managersOnly), deleteSchedule);

module.exports = router;
