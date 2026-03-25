const express = require('express');
const { getNotifications, markAsRead, createBroadcast } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/',  getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/broadcast', authorize('admin', 'branch_admin', 'super_admin'), createBroadcast);

module.exports = router;
