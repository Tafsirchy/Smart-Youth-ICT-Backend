const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearReadNotifications,
  createBroadcast,
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

// User notification feed & counters
router.get('/',               getNotifications);
router.get('/unread-count',    getUnreadCount);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/clear-read',   clearReadNotifications);
router.patch('/:id/read',      markAsRead);

// Broadcast dispatcher (Campus & HQ admins)
router.post(
  '/broadcast',
  authorize('branch_admin', 'branch_management', 'super_admin', 'super_management'),
  createBroadcast
);

module.exports = router;
