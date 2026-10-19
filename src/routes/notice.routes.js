const express = require('express');
const router = express.Router();
const {
  getPublicCampusNotices,
  getStudentNotices,
  getAdminNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  togglePinNotice,
} = require('../controllers/notice.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Public route for landing campus page
router.get('/public/:branchId', getPublicCampusNotices);

// Student notices (Protected)
router.get('/student', protect, getStudentNotices);

// Admin notices (Protected)
router.get(
  '/admin',
  protect,
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management', 'employee'),
  getAdminNotices
);

router.post(
  '/admin',
  protect,
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  createNotice
);

router.put(
  '/admin/:id',
  protect,
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  updateNotice
);

router.delete(
  '/admin/:id',
  protect,
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  deleteNotice
);

router.patch(
  '/admin/:id/pin',
  protect,
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  togglePinNotice
);

module.exports = router;
