const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const {
  notifyBranch,
  notifyGlobal,
} = require('../services/notification.service');

// Helper to determine if a notification is read by the specific user
const checkIsReadForUser = (notification, userId) => {
  if (!notification || !userId) return false;
  // Personal notification
  if (notification.user) {
    return Boolean(notification.isRead);
  }
  // Broadcast: check readBy array
  if (Array.isArray(notification.readBy)) {
    return notification.readBy.some(
      (r) => r.user && r.user.toString() === userId.toString()
    );
  }
  return false;
};

// Centralized Audience Condition Builder for Strict Multi-Tenant Isolation
const buildAudienceConditions = async (user, filterBranchId = null) => {
  const { role, branchId: userBranchId, _id: userId } = user;
  const isSuperAdmin = ['super_admin', 'super_management'].includes(role);

  const orConditions = [{ user: userId }];

  if (isSuperAdmin) {
    if (filterBranchId && filterBranchId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(filterBranchId)) {
        orConditions.push({ branchId: new mongoose.Types.ObjectId(filterBranchId) });
      }
    } else {
      orConditions.push({ user: null });
    }
  } else {
    const targetRoles = ['all', role];
    if (['branch_admin', 'branch_management'].includes(role)) {
      targetRoles.push('branch_admin', 'branch_management');
    }
    if (['super_admin', 'super_management'].includes(role)) {
      targetRoles.push('super_admin', 'super_management');
    }

    if (role === 'student') {
      // Find active enrolled courses
      const enrolledCourses = await Enrollment.find({ user: userId, isActive: true }).distinct('course');
      
      // 1. General Branch Announcements (no courseId)
      if (userBranchId) {
        orConditions.push({
          branchId: userBranchId,
          user: null,
          targetRole: { $in: targetRoles },
          'metadata.courseId': { $exists: false },
        });
      }
      // 2. Global HQ Announcements (no courseId)
      orConditions.push({
        branchId: null,
        user: null,
        targetRole: { $in: targetRoles },
        'metadata.courseId': { $exists: false },
      });
      // 3. Course Broadcasts for enrolled courses only
      if (enrolledCourses.length > 0) {
        orConditions.push({
          user: null,
          'metadata.courseId': { $in: enrolledCourses },
        });
      }
    } else if (role === 'instructor') {
      // Find courses taught by instructor
      const taughtCourses = await Course.find({ instructor: userId }).distinct('_id');

      if (userBranchId) {
        orConditions.push({
          branchId: userBranchId,
          user: null,
          targetRole: { $in: targetRoles },
          'metadata.courseId': { $exists: false },
        });
      }
      orConditions.push({
        branchId: null,
        user: null,
        targetRole: { $in: targetRoles },
        'metadata.courseId': { $exists: false },
      });
      if (taughtCourses.length > 0) {
        orConditions.push({
          user: null,
          'metadata.courseId': { $in: taughtCourses },
        });
      }
    } else {
      // Branch Admins, Managers, and Staff/Employees
      if (userBranchId) {
        orConditions.push({
          branchId: userBranchId,
          user: null,
          targetRole: { $in: targetRoles },
        });
      }
      orConditions.push({
        branchId: null,
        user: null,
        targetRole: { $in: targetRoles },
      });
    }
  }

  // Base query with dismissal filter
  return {
    $or: orConditions,
    dismissedBy: { $ne: userId },
  };
};

/**
 * Compose the "unread" filter on top of an audience query.
 *
 * The audience query already carries a top-level `$or` (tenant isolation).
 * Spreading it and then re-declaring `$or` would silently OVERWRITE those
 * clauses and leak notifications from other branches, so the two `$or`
 * groups are combined with `$and` instead.
 */
const buildUnreadQuery = (baseQuery, userId) => {
  const { $or: audienceOr, ...rest } = baseQuery || {};
  return {
    ...rest,
    $and: [
      ...(Array.isArray(audienceOr) ? [{ $or: audienceOr }] : []),
      {
        $or: [
          { user: userId, isRead: false },
          { user: null, 'readBy.user': { $ne: userId } },
        ],
      },
    ],
  };
};

// @desc    Get current user's notifications (Personal + Segmented Broadcasts)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    const {
      page = 1,
      limit = 30,
      category = 'all',
      branchId: filterBranchId,
      unreadOnly = 'false',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));

    // 1. Build Isolated Audience Query
    const baseQuery = await buildAudienceConditions(req.user, filterBranchId);
    const query = { ...baseQuery };

    // 2. Category Filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // 3. Unread Only Filter directly in MongoDB for accurate pagination
    if (unreadOnly === 'true') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { user: userId, isRead: false },
          { user: null, 'readBy.user': { $ne: userId } },
        ],
      });
    }

    // 4. Fetch notifications with pagination
    const [rawNotifications, totalCount, totalUnreadCount] = await Promise.all([
      Notification.find(query)
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('actor', 'name email role')
        .populate('branchId', 'name code city')
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        ...buildUnreadQuery(baseQuery, userId),
        ...(category && category !== 'all' ? { category } : {}),
      }),
    ]);

    // 5. Map user-specific `isRead` flag
    const formatted = rawNotifications.map((n) => {
      const isRead = checkIsReadForUser(n, userId);
      return {
        ...n,
        isRead,
        readBy: undefined, // Don't leak other users' read receipts to client
      };
    });

    res.json({
      success: true,
      total: totalCount,
      unreadCount: totalUnreadCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Quick count of unread notifications for topbar badge
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    const baseQuery = await buildAudienceConditions(req.user);

    const count = await Notification.countDocuments(buildUnreadQuery(baseQuery, userId));

    res.json({
      success: true,
      count,
      unreadCount: count,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a single notification as read (Handles Unicast + Broadcast)
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.user) {
      // Unicast
      if (notification.user.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      notification.isRead = true;
      await notification.save();
    } else {
      // Broadcast: the notification must still be inside the caller's audience,
      // otherwise any authenticated user could mark (and thereby read) a
      // broadcast belonging to another branch.
      const audienceQuery = await buildAudienceConditions(req.user);
      const isVisible = await Notification.exists({
        _id: notification._id,
        $or: audienceQuery.$or,
      });

      if (!isVisible) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Broadcast: Add user to readBy array if not already present
      const alreadyRead = notification.readBy.some(
        (r) => r.user && r.user.toString() === userId.toString()
      );
      if (!alreadyRead) {
        notification.readBy.push({ user: userId, readAt: new Date() });
        await notification.save();
      }
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { _id: notification._id, isRead: true },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all unread notifications as read for current user
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;

    // 1. Mark all personal unicast notifications as read
    await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. Mark matching broadcasts by appending to readBy
    const audienceQuery = await buildAudienceConditions(req.user);
    const broadcastQuery = {
      $and: [
        { $or: audienceQuery.$or },
        { user: null, 'readBy.user': { $ne: userId } },
      ],
      dismissedBy: { $ne: userId },
    };

    await Notification.updateMany(broadcastQuery, {
      $push: { readBy: { user: userId, readAt: new Date() } },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear / Dismiss read notifications for current user
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.clearReadNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Delete personal read notifications
    const personalResult = await Notification.deleteMany({
      user: userId,
      isRead: true,
    });

    // 2. Dismiss read broadcast notifications for this user (audience-scoped)
    const audienceQuery = await buildAudienceConditions(req.user);
    await Notification.updateMany(
      {
        $or: audienceQuery.$or,
        user: null,
        'readBy.user': userId,
      },
      { $addToSet: { dismissedBy: userId } }
    );

    res.json({
      success: true,
      message: 'Read notifications cleared successfully.',
      deletedCount: personalResult.deletedCount || 0,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create branch or global broadcast (Admin only)
// @route   POST /api/notifications/broadcast
// @access  Private (Admin / BranchAdmin / SuperAdmin)
exports.createBroadcast = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type = 'info',
      category = 'administrative',
      priority = 'normal',
      targetRole = 'all',
      isGlobal = false,
      link = '',
      mirrorEmail = false,
      mirrorSMS = false,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let notification;
    const isSuperAdmin = ['super_admin', 'super_management'].includes(req.user.role);

    if (isGlobal && isSuperAdmin) {
      notification = await notifyGlobal({
        title,
        message,
        type,
        category,
        priority,
        targetRole,
        link,
        actor: req.user._id,
        mirrorEmail,
        mirrorSMS,
      });
    } else {
      const branchId = req.body.branchId || req.user.branchId;
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'Branch ID required for campus broadcast' });
      }

      notification = await notifyBranch(branchId, {
        title,
        message,
        type,
        category,
        priority,
        targetRole,
        link,
        actor: req.user._id,
        mirrorEmail,
        mirrorSMS,
      });
    }

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Broadcast notification dispatched successfully',
    });
  } catch (err) {
    next(err);
  }
};
