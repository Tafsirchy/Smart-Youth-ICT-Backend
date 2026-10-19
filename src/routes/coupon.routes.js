const express = require('express');
const router = express.Router();
const {
  validateCouponPublic,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
} = require('../controllers/coupon.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Public checkout validation
router.post('/validate', validateCouponPublic);

// Admin Coupon Management (Protected)
router.use(protect);

router.get(
  '/',
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management', 'employee'),
  getCoupons
);

router.post(
  '/',
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  createCoupon
);

router.put(
  '/:id',
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  updateCoupon
);

router.delete(
  '/:id',
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  deleteCoupon
);

router.patch(
  '/:id/status',
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  toggleCouponStatus
);

module.exports = router;
