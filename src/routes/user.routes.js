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
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  updateUserRole,
  getPublicInstructors
} = require('../controllers/user.controller');

// Public listing
router.get('/instructors/public', getPublicInstructors);

// Current user (any authenticated user)
router.get('/me',           protect, getMyProfile);
router.put('/me',           protect, updateMyProfile);

// Admin / Management only
const superRoles = ['super_admin', 'super_management'];
const adminRoles = [...superRoles, 'branch_admin', 'branch_management'];

router.get('/',             protect, authorize(...adminRoles), getAllUsers);
router.post('/',            protect, authorize(...superRoles), adminCreateUser);

router.get('/:id',          protect, authorize(...adminRoles), getUserById);
router.put('/:id',          protect, authorize(...adminRoles), adminUpdateUser);
router.delete('/:id',       protect, authorize(...superRoles), adminDeleteUser);

router.patch('/:id/status', protect, authorize(...adminRoles), toggleUserStatus);
router.put('/:id/role',     protect, authorize(...superRoles), updateUserRole);

module.exports = router;
