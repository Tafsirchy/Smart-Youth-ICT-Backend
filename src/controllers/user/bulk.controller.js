const crypto = require('crypto');
const User = require('../../models/User');

exports.bulkUserAction = async (req, res, next) => {
  try {
    const { userIds, action, newRole } = req.body;
    if (!userIds || !Array.isArray(userIds) || !userIds.length || !action) {
      return res.status(400).json({ success: false, message: 'userIds array and action are required' });
    }

    const callerId = req.user._id.toString();
    const targetUsers = await User.find({ _id: { $in: userIds } });
    const eligibleUsers = targetUsers.filter(u => {
      if (u._id.toString() === callerId) return false;
      if (['super_admin', 'super_management'].includes(u.role) && ['suspend', 'change_role'].includes(action)) return false;
      return true;
    });

    if (!eligibleUsers.length) {
      return res.status(400).json({ success: false, message: 'No eligible target users found for this action.' });
    }

    const eligibleIds = eligibleUsers.map(u => u._id);
    const userCache = require('../../utils/userCache');
    eligibleIds.forEach(id => userCache.del(id));

    let affectedCount = 0;

    if (action === 'activate') {
      const result = await User.updateMany(
        { _id: { $in: eligibleIds } },
        { $set: { isActive: true } }
      );
      affectedCount = result.modifiedCount;
    } else if (action === 'suspend') {
      const result = await User.updateMany(
        { _id: { $in: eligibleIds } },
        { $set: { isActive: false }, $inc: { tokenVersion: 1 } }
      );
      affectedCount = result.modifiedCount;
    } else if (action === 'force_logout') {
      const result = await User.updateMany(
        { _id: { $in: eligibleIds } },
        { $inc: { tokenVersion: 1 } }
      );
      affectedCount = result.modifiedCount;
    } else if (action === 'change_role') {
      if (!newRole) return res.status(400).json({ success: false, message: 'newRole is required' });
      const result = await User.updateMany(
        { _id: { $in: eligibleIds } },
        { $set: { role: newRole }, $inc: { tokenVersion: 1 } }
      );
      affectedCount = result.modifiedCount;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action specified' });
    }

    const AuditLog = require('../../models/AuditLog');
    await AuditLog.create({
      actor: req.user._id,
      action: 'BULK_USER_ACTION',
      entity: 'User',
      details: {
        action,
        requestedCount: userIds.length,
        affectedCount,
        newRole: newRole || null,
        adminName: req.user.name,
        adminEmail: req.user.email
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: `Bulk action "${action}" completed for ${affectedCount} user(s).`,
      affectedCount
    });
  } catch (err) { next(err); }
};

// @desc    Bulk Import Users from CSV / Excel JSON payload
// @route   POST /api/users/bulk-import
// @access  Private (super_admin, super_management)
exports.bulkImportUsers = async (req, res, next) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users) || !users.length) {
      return res.status(400).json({ success: false, message: 'An array of users is required' });
    }

    if (users.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 users can be imported in a single batch' });
    }

    const Branch = require('../../models/Branch');
    const allBranches = await Branch.find().select('_id name code').lean();
    const branchMapByCode = {};
    allBranches.forEach(b => {
      if (b.code) branchMapByCode[b.code.toUpperCase()] = b._id;
    });

    const validRoles = ['student', 'instructor', 'employee', 'branch_admin', 'branch_management'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const emailsInBatch = new Set();
    const validBatch = [];
    const skipped = [];

    for (let i = 0; i < users.length; i++) {
      const row = users[i];
      const rowNum = i + 1;
      const rawEmail = String(row.email || '').trim().toLowerCase();
      const rawName = String(row.name || '').trim();

      if (!rawEmail || !emailRegex.test(rawEmail)) {
        skipped.push({ row: rowNum, email: rawEmail || 'empty', reason: 'Invalid or missing email' });
        continue;
      }

      if (!rawName) {
        skipped.push({ row: rowNum, email: rawEmail, reason: 'Name is required' });
        continue;
      }

      if (emailsInBatch.has(rawEmail)) {
        skipped.push({ row: rowNum, email: rawEmail, reason: 'Duplicate email inside current batch' });
        continue;
      }
      emailsInBatch.add(rawEmail);

      const existingUser = await User.findOne({ email: rawEmail }).select('_id').lean();
      if (existingUser) {
        skipped.push({ row: rowNum, email: rawEmail, reason: 'Email already registered in system' });
        continue;
      }

      const role = validRoles.includes(row.role?.toLowerCase()) ? row.role.toLowerCase() : 'student';
      let branchId = row.branchId || null;
      if (!branchId && row.branchCode && branchMapByCode[row.branchCode.toUpperCase()]) {
        branchId = branchMapByCode[row.branchCode.toUpperCase()];
      }

      const rawPassword = row.password && String(row.password).trim()
        ? String(row.password).trim()
        : crypto.randomBytes(4).toString('hex') + '@Sy1';

      validBatch.push({
        name: rawName,
        email: rawEmail,
        password: rawPassword,
        phone: String(row.phone || '').trim(),
        role,
        branchId,
        isActive: true,
        isVerified: true
      });
    }

    let createdUsers = [];
    if (validBatch.length > 0) {
      for (const u of validBatch) {
        await User.create(u);
      }
      createdUsers = validBatch;
    }

    const AuditLog = require('../../models/AuditLog');
    await AuditLog.create({
      actor: req.user._id,
      action: 'BULK_USERS_IMPORTED',
      entity: 'User',
      details: {
        totalRows: users.length,
        createdCount: createdUsers.length,
        skippedCount: skipped.length,
        adminName: req.user.name,
        adminEmail: req.user.email
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: `Successfully imported ${createdUsers.length} user(s). ${skipped.length} row(s) skipped.`,
      data: {
        createdCount: createdUsers.length,
        skippedCount: skipped.length,
        skipped
      }
    });
  } catch (err) { next(err); }
};
