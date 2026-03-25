const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./email.service');

/**
 * Send a notification to a specific user and mirror through other channels
 */
exports.notifyUser = async (user, { title, message, type = 'info', link, mirrorEmail = false }) => {
  try {
    const userId = typeof user === 'string' ? user : user._id;
    const branchId = typeof user === 'string' ? (await User.findById(user)).branchId : user.branchId;

    const notification = await Notification.create({
      user: userId,
      branchId,
      title,
      message,
      type,
      link,
      sentApp: true,
      sentEmail: mirrorEmail
    });

    if (mirrorEmail) {
      const targetUser = typeof user === 'string' ? await User.findById(user) : user;
      await emailService.sendCustomEmail(targetUser, title, message);
    }

    return notification;
  } catch (err) {
    console.error('Notification Service Error:', err.message);
  }
};

/**
 * Broadcast notification to a branch (or subset roles in branch)
 */
exports.notifyBranch = async (branchId, { title, message, type = 'info', link, targetRole = 'all' }) => {
  try {
    // Create one record as a "Broadcast" notification
    const notification = await Notification.create({
      branchId,
      user: null, // Broadcast
      title,
      message,
      type,
      link,
      targetRole,
      sentApp: true
    });

    return notification;
  } catch (err) {
    console.error('Branch Broadcast Error:', err.message);
  }
};

/**
 * Global broadcast (Super Admin)
 */
exports.notifyGlobal = async ({ title, message, type = 'info', link, targetRole = 'all' }) => {
  try {
    const notification = await Notification.create({
      branchId: null, // Global
      user: null,    // Broadcast
      title,
      message,
      type,
      link,
      targetRole,
      sentApp: true
    });

    return notification;
  } catch (err) {
    console.error('Global Broadcast Error:', err.message);
  }
};
