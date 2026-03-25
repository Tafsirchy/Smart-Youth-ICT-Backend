const Notification = require('../models/Notification');
const { notifyBranch, notifyGlobal } = require('../services/notification.service');

// @desc    Get current user's notifications (Personal + Broadcasts)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { role, branchId, _id: userId } = req.user;

    // Fetch personal OR branch broadcast OR global broadcast
    const notifications = await Notification.find({
      $or: [
        { user: userId },
        { branchId, user: null, targetRole: { $in: ['all', role] } },
        { branchId: null, user: null, targetRole: { $in: ['all', role] } },
      ]
    }).sort('-createdAt').limit(50);

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Create branch or global broadcast (Admin only)
// @route   POST /api/notifications/broadcast
// @access  Private (Admin/SuperAdmin)
exports.createBroadcast = async (req, res, next) => {
  try {
    const { title, message, type, targetRole, isGlobal } = req.body;
    let notification;

    if (isGlobal && req.user.role === 'super_admin') {
      notification = await notifyGlobal({ title, message, type, targetRole });
    } else {
      const branchId = req.user.branchId || req.body.branchId;
      if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required' });
      notification = await notifyBranch(branchId, { title, message, type, targetRole });
    }

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};
