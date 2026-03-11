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

// Admin only
router.get('/',            protect, authorize('admin'), getAllUsers);
router.get('/:id',         protect, authorize('admin'), getUserById);
router.patch('/:id/status',protect, authorize('admin'), toggleUserStatus);

module.exports = router;
