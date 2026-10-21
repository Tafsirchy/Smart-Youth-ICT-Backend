const Notification = require('../models/Notification');
const User = require('../models/User');
const Branch = require('../models/Branch');
const emailService = require('./email.service');
const smsService = require('./sms.service');
const { emitNotification } = require('../sockets/socket');

/**
 * Universal Master Dispatcher for Enterprise Notifications
 * Persists to MongoDB, dispatches real-time WebSocket events, and handles email/SMS mirroring
 */
const dispatchNotification = async ({
  user = null,
  branchId = null,
  targetRole = 'all',
  title,
  message,
  category = 'system',
  priority = 'normal',
  type = 'info',
  link = '',
  metadata = {},
  actor = null,
  mirrorEmail = false,
  mirrorSMS = false,
  isPersonalOnly = false,
}) => {
  try {
    let resolvedUserId = null;
    let resolvedBranchId = branchId;
    let targetUserDoc = null;

    if (user) {
      if (typeof user === 'string' || user instanceof require('mongoose').Types.ObjectId) {
        resolvedUserId = user;
        targetUserDoc = await User.findById(user).select('name email phone branchId').lean();
        if (!resolvedBranchId && targetUserDoc?.branchId) {
          resolvedBranchId = targetUserDoc.branchId;
        }
      } else if (user._id) {
        resolvedUserId = user._id;
        targetUserDoc = user;
        if (!resolvedBranchId && user.branchId) {
          resolvedBranchId = user.branchId;
        }
      }
    }

    // Auto-resolve branchId from course if not provided
    if (!resolvedBranchId && metadata?.courseId) {
      try {
        const Course = require('../models/Course');
        const courseDoc = await Course.findById(metadata.courseId).select('branchId').lean();
        if (courseDoc?.branchId) {
          resolvedBranchId = courseDoc.branchId;
        }
      } catch (e) {}
    }

    // Resolve branch name for metadata if not provided
    if (resolvedBranchId && !metadata.branchName) {
      try {
        const branchDoc = await Branch.findById(resolvedBranchId).select('name code').lean();
        if (branchDoc) {
          metadata.branchName = branchDoc.name;
          metadata.branchCode = branchDoc.code;
        }
      } catch (e) {
        // Non-blocking
      }
    }

    // 1. Persist Notification in MongoDB
    const notification = await Notification.create({
      user: resolvedUserId,
      branchId: resolvedBranchId || null,
      targetRole,
      title: title.trim(),
      message: message.trim(),
      category,
      priority,
      type,
      link: link.trim(),
      metadata,
      actor: actor || null,
      channels: {
        inApp: true,
        email: Boolean(mirrorEmail),
        sms: Boolean(mirrorSMS),
      },
      sentApp: true,
      sentEmail: Boolean(mirrorEmail),
      sentSMS: Boolean(mirrorSMS),
    });

    // 2. Real-time WebSocket Emission via Socket.io
    try {
      const socketTarget = {
        userId: resolvedUserId ? resolvedUserId.toString() : null,
        branchId: resolvedBranchId ? resolvedBranchId.toString() : null,
        role: targetRole,
        courseId: metadata?.courseId ? metadata.courseId.toString() : null,
        isGlobal: !resolvedUserId && !resolvedBranchId,
        isPersonalOnly,
      };

      emitNotification(socketTarget, {
        _id: notification._id,
        id: notification._id,
        user: resolvedUserId,
        branchId: resolvedBranchId,
        targetRole,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        priority: notification.priority,
        type: notification.type,
        link: notification.link,
        metadata: notification.metadata,
        isRead: false,
        createdAt: notification.createdAt,
      });
    } catch (wsErr) {
      console.error('[WebSocket Notification Error]', wsErr.message);
    }

    // 3. Optional Email Mirroring
    if (mirrorEmail && targetUserDoc?.email) {
      setTimeout(() => {
        emailService.sendCustomEmail(targetUserDoc, title, message).catch((mErr) => {
          console.error('[Notification Email Mirror Failed]', mErr.message);
        });
      }, 0);
    }

    // 4. Optional SMS Mirroring
    if (mirrorSMS && targetUserDoc?.phone && smsService?.sendSMS) {
      setTimeout(() => {
        const smsText = `[SYICT] ${title}: ${message.slice(0, 120)}`;
        smsService.sendSMS(targetUserDoc.phone, smsText).catch((sErr) => {
          console.error('[Notification SMS Mirror Failed]', sErr.message);
        });
      }, 0);
    }

    return notification;
  } catch (err) {
    console.error('[Dispatch Notification Error]', err.message);
    return null;
  }
};

/**
 * Send notification to a specific user (Student, Instructor, Admin)
 */
const notifyUser = async (user, options) => {
  return dispatchNotification({
    user,
    ...options,
  });
};

/**
 * Broadcast notification to a specific branch campus
 */
const notifyBranch = async (branchId, options) => {
  return dispatchNotification({
    branchId,
    user: null,
    ...options,
  });
};

/**
 * Send notification specifically to Branch Admins & Branch Management
 */
const notifyBranchAdmins = async (branchId, options) => {
  return dispatchNotification({
    branchId,
    targetRole: 'branch_admin',
    category: options.category || 'administrative',
    ...options,
  });
};

/**
 * Broadcast notification to all enrolled students & instructors of a specific course
 */
const notifyCourse = async (courseId, options) => {
  return dispatchNotification({
    category: options.category || 'academic',
    metadata: { ...(options.metadata || {}), courseId },
    ...options,
  });
};

/**
 * Global HQ Broadcast across all branches
 */
const notifyGlobal = async (options) => {
  return dispatchNotification({
    branchId: null,
    user: null,
    isGlobal: true,
    ...options,
  });
};

/**
 * Send notification to Super Admin HQ (Executives)
 */
const notifySuperAdmins = async (options) => {
  return dispatchNotification({
    targetRole: 'super_admin',
    category: options.category || 'system',
    ...options,
  });
};

module.exports = {
  dispatchNotification,
  notifyUser,
  notifyBranch,
  notifyBranchAdmins,
  notifyCourse,
  notifyGlobal,
  notifySuperAdmins,
};
