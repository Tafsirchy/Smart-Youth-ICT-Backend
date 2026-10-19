const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { authLimiter, emailLimiter } = require('../middleware/rateLimiter.middleware');
const { acceptInviteValidation, handleValidation } = require('../middleware/authValidation.middleware');
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
  getPublicInstructors,
  inviteStaff,
  acceptInvite,
  getPermissionsCatalog,
  getBranchStaff,
  createBranchStaff,
  updateStaffPermissions,
  toggleBranchStaffStatus,
  deleteBranchStaff,
  verifyStudentPublic,
} = require('../controllers/user.controller');

// Public listing & verification
router.get('/instructors/public', getPublicInstructors);
router.get('/public/verify-student/:studentId', verifyStudentPublic);

// Public: staff accepts invite (token-gated)
router.post('/invite/accept', authLimiter, acceptInviteValidation, handleValidation, acceptInvite);

// Current user (any authenticated user)
router.get('/me',           protect, getMyProfile);
router.put('/me',           protect, updateMyProfile);

// Admin / Management roles
const superRoles = ['super_admin', 'super_management'];
const branchManagerRoles = ['branch_admin', 'branch_management'];
const allManagerRoles = [...superRoles, ...branchManagerRoles];

// ─────────────────────────────────────────────────────────────
// Branch Staff Delegation (Branch Managers & Super Admins)
// ─────────────────────────────────────────────────────────────
router.get('/permissions/catalog',           protect, authorize(...allManagerRoles), getPermissionsCatalog);
router.get('/branch/staff',                  protect, authorize(...allManagerRoles), getBranchStaff);
router.post('/branch/staff',                 protect, authorize(...allManagerRoles), createBranchStaff);
router.put('/branch/staff/:id/permissions',  protect, authorize(...allManagerRoles), updateStaffPermissions);
router.patch('/branch/staff/:id/status',     protect, authorize(...allManagerRoles), toggleBranchStaffStatus);
router.delete('/branch/staff/:id',           protect, authorize(...allManagerRoles), deleteBranchStaff);

// ─────────────────────────────────────────────────────────────
// General User Management (Super Admin & Admins)
// ─────────────────────────────────────────────────────────────
router.get('/',             protect, authorize(...allManagerRoles), getAllUsers);
router.post('/',            protect, authorize(...allManagerRoles), adminCreateUser);
router.post('/invite',      protect, emailLimiter, authorize(...superRoles), inviteStaff);

router.get('/:id',          protect, authorize(...allManagerRoles), getUserById);
router.put('/:id',          protect, authorize(...allManagerRoles), adminUpdateUser);
router.delete('/:id',       protect, authorize(...superRoles), adminDeleteUser);

router.patch('/:id/status', protect, authorize(...allManagerRoles), toggleUserStatus);
router.put('/:id/role',     protect, authorize(...superRoles), updateUserRole);

module.exports = router;
