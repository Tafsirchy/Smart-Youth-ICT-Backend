/**
 * support — part of the former
 * super.controller.js. The handlers are unchanged; they only live in a
 * smaller file now.
 */
const Branch = require('../../models/Branch');
const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');
const SystemSetting = require('../../models/SystemSetting');
const HelpArticle = require('../../models/HelpArticle');
const BroadcastLog = require('../../models/BroadcastLog');
const slugify = require('slugify');
const emailService = require('../../services/email.service');
const smsService = require('../../services/sms.service');
const { escapeRegex } = require('../../utils/regex');
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.find();
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
};

// @desc    Update system setting
// @route   PUT /api/super/settings
// @access  Private (Super Admin)

exports.updateSettings = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const setting = await SystemSetting.findOneAndUpdate(
      { key }, 
      { value, updatedBy: req.user._id }, 
      { upsert: true, new: true }
    );
    res.json({ success: true, data: setting });
  } catch (err) { next(err); }
};

// @desc    Help Center Management (CRUD)

exports.getHelpArticles = async (req, res, next) => {
  try {
    const articles = await HelpArticle.find().sort('-createdAt');
    res.json({ success: true, data: articles });
  } catch (err) { next(err); }
};

exports.createHelpArticle = async (req, res, next) => {
  try {
    const { title, category, content, isPublished } = req.body;
    const slug = slugify(title, { lower: true });
    const article = await HelpArticle.create({ title, slug, category, content, isPublished, author: req.user._id });
    res.status(201).json({ success: true, data: article });
  } catch (err) { next(err); }
};

exports.updateHelpArticle = async (req, res, next) => {
  try {
    const article = await HelpArticle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data: article });
  } catch (err) { next(err); }
};

exports.deleteHelpArticle = async (req, res, next) => {
  try {
    const article = await HelpArticle.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, message: 'Article deleted permanently' });
  } catch (err) { next(err); }
};

// @desc    Get system-wide audit logs with server-side pagination and filters
// @route   GET /api/super/audit-logs
// @access  Private (Super Admin)

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, entity, branchId, search, startDate, endDate } = req.query;
    const query = {};

    if (action) query.action = action;
    if (entity) query.entity = entity;
    if (branchId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        query.branchId = new mongoose.Types.ObjectId(branchId);
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const escaped = escapeRegex(String(search).trim());
      query.$or = [
        { action: { $regex: escaped, $options: 'i' } },
        { entity: { $regex: escaped, $options: 'i' } },
        { ipAddress: { $regex: escaped, $options: 'i' } }
      ];
    }

    const currentPage = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(10, parseInt(limit, 10)));
    const skip = (currentPage - 1) * pageLimit;

    const [total, rawLogs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .populate('actor', 'name email role')
        .populate('branchId', 'name code')
        .sort('-createdAt')
        .skip(skip)
        .limit(pageLimit)
        .lean()
    ]);

    // Collect all branch IDs from logs where entity === 'Branch'
    const branchIdsToFetch = new Set();
    rawLogs.forEach(log => {
      if (!log.branchId && log.entity === 'Branch' && log.entityId) {
        branchIdsToFetch.add(log.entityId.toString());
      }
    });

    const branchMap = {};
    if (branchIdsToFetch.size > 0) {
      const branches = await Branch.find({ _id: { $in: Array.from(branchIdsToFetch) } })
        .select('name code')
        .lean();
      branches.forEach(b => {
        branchMap[b._id.toString()] = b;
      });
    }

    const logs = rawLogs.map(log => {
      let resolvedBranchName = log.branchId?.name || log.details?.branchName || log.details?.name || null;
      let resolvedBranchCode = log.branchId?.code || log.details?.code || null;

      if (!resolvedBranchName && log.entity === 'Branch' && log.entityId) {
        const found = branchMap[log.entityId.toString()];
        if (found) {
          resolvedBranchName = found.name;
          resolvedBranchCode = found.code;
        }
      }

      return {
        ...log,
        resolvedBranchName,
        resolvedBranchCode
      };
    });

    res.json({
      success: true,
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
      data: logs
    });
  } catch (err) { next(err); }
};

// @desc    Get Central Branch Leaderboard & Comparative Intelligence
// @route   GET /api/super/branches/analytics
// @access  Private (Super Admin)

exports.sendEmergencyBroadcast = async (req, res, next) => {
  try {
    const { title, subject, message, channels, targetAudience, branchId, urgency } = req.body;

    if (!title || !message || !channels || !channels.length) {
      return res.status(400).json({ success: false, message: 'Title, message, and at least one channel are required.' });
    }

    // Determine target users query
    const userQuery = { isActive: true };
    if (targetAudience === 'all_students') userQuery.role = 'student';
    else if (targetAudience === 'all_instructors') userQuery.role = 'instructor';
    else if (targetAudience === 'all_branch_staff') userQuery.role = { $in: ['branch_admin', 'branch_management', 'employee'] };
    else if (targetAudience === 'specific_branch' && branchId) userQuery.branchId = branchId;

    const targetUsers = await User.find(userQuery).select('name email phone role branchId');
    const totalRecipients = targetUsers.length;

    let smsSent = 0;
    let emailSent = 0;
    let inAppSent = 0;
    let failedCount = 0;

    // 1. In-App Broadcast
    if (channels.includes('in_app')) {
      try {
        const notifService = require('../../services/notification.service');
        await notifService.dispatchNotification({
          branchId: targetAudience === 'specific_branch' ? branchId : null,
          user: null, // Broadcast
          title: `[${(urgency || 'normal').toUpperCase()}] ${title}`,
          message,
          type: urgency === 'critical' ? 'error' : urgency === 'urgent' ? 'warning' : 'info',
          priority: urgency === 'critical' || urgency === 'urgent' ? 'urgent' : 'high',
          category: 'system',
          targetRole: targetAudience === 'all_students' ? 'student' : targetAudience === 'all_instructors' ? 'instructor' : 'all',
          actor: req.user._id,
        });
        inAppSent = totalRecipients;
      } catch (e) {
        console.error('[Broadcast In-App Error]', e.message);
        failedCount++;
      }
    }

    // 2. Email Dispatch
    if (channels.includes('email')) {
      const emailRecipients = targetUsers.filter(u => u.email);
      if (emailRecipients.length > 0) {
        // Asynchronously dispatch email alerts without blocking main loop
        (async () => {
          for (const recipient of emailRecipients) {
            try {
              await emailService._send({
                to: recipient.email,
                subject: subject || `ðŸš¨ SYICT Emergency Notice: ${title}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 16px; background-color: #ffffff;">
                    <div style="background: ${urgency === 'critical' ? '#dc2626' : urgency === 'urgent' ? '#ea580c' : '#4f46e5'}; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
                      ${urgency === 'critical' ? 'ðŸš¨ CRITICAL ADVISORY' : urgency === 'urgent' ? 'âš ï¸ URGENT BROADCAST' : 'ðŸ“¢ OFFICIAL NOTICE'}
                    </div>
                    <h2 style="color: #0f172a; margin-top: 18px; font-size: 20px; font-weight: 800;">${title}</h2>
                    <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear ${recipient.name},</p>
                    <div style="background: #f8fafc; border-left: 4px solid ${urgency === 'critical' ? '#dc2626' : urgency === 'urgent' ? '#ea580c' : '#4f46e5'}; padding: 16px; border-radius: 8px; margin: 18px 0; font-size: 14px; color: #1e293b; line-height: 1.6;">
                      ${message}
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                      Smart Youth ICT Head Office Emergency Dispatch Network. Please do not reply directly to this automated email.
                    </p>
                  </div>
                `
              });
            } catch (err) {
              console.error(`[Broadcast Email Fail] ${recipient.email}:`, err.message);
            }
          }
        })().catch(e => console.error('[Broadcast Worker Error]', e));
        emailSent = emailRecipients.length;
      }
    }

    // 3. SMS Dispatch
    if (channels.includes('sms')) {
      const smsRecipients = targetUsers.filter(u => u.phone);
      for (const recipient of smsRecipients) {
        try {
          const smsText = `[SYICT Alert] ${title}: ${message.slice(0, 110)}`;
          await smsService.sendSMS(recipient.phone, smsText);
          smsSent++;
        } catch {
          failedCount++;
        }
      }
    }

    const broadcastLog = await BroadcastLog.create({
      title,
      subject: subject || title,
      message,
      channels,
      targetAudience: targetAudience || 'all_users',
      branchId: branchId || null,
      urgency: urgency || 'normal',
      sentBy: req.user._id,
      stats: {
        totalRecipients,
        smsSent,
        emailSent,
        inAppSent,
        failedCount
      }
    });

    await AuditLog.create({
      actor: req.user._id,
      action: 'SEND_EMERGENCY_BROADCAST',
      entity: 'BroadcastLog',
      entityId: broadcastLog._id,
      details: {
        title,
        channels,
        targetAudience,
        totalRecipients,
        urgency
      }
    });

    try {
      const { emitToAll, emitToBranch } = require('../../sockets/socket');
      if (branchId) {
        emitToBranch(branchId, 'EMERGENCY_BROADCAST', { title, message, urgency, channels });
      } else {
        emitToAll('EMERGENCY_BROADCAST', { title, message, urgency, channels });
      }
    } catch (e) {
      console.error('[Socket Broadcast Error]', e.message);
    }

    res.json({
      success: true,
      message: `Emergency broadcast successfully dispatched to ${totalRecipients} recipients.`,
      data: broadcastLog
    });
  } catch (err) { next(err); }
};

// @desc    Get Broadcast Dispatch Logs
// @route   GET /api/super/broadcast/logs
// @access  Private (Super Admin)

exports.getBroadcastLogs = async (req, res, next) => {
  try {
    const logs = await BroadcastLog.find()
      .populate('sentBy', 'name email role')
      .populate('branchId', 'name city')
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

// @desc    Get Real-time DevOps & Server Health Probe
// @route   GET /api/super/devops-probe
// @access  Private (Super Admin)
