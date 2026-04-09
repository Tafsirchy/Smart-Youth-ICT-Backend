const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  toggleUserStatus,
} = require('../controllers/user.controller');

// Current user (any authenticated user)
router.get('/me',          protect, getMyProfile);
router.put('/me',          protect, updateMyProfile);

// Admin / Management only
const adminRoles = ['super_admin', 'super_management', 'branch_admin', 'branch_management'];
router.get('/',            protect, authorize(...adminRoles), getAllUsers);
router.get('/:id',         protect, authorize(...adminRoles), getUserById);
router.patch('/:id/status',protect, authorize(...adminRoles), toggleUserStatus);
router.put('/:id/role',    protect, authorize('super_admin', 'super_management'), require('../controllers/user.controller').updateUserRole);

module.exports = router;
