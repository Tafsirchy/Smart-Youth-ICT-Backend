const crypto = require('crypto');
const User = require('../../models/User');
const Branch = require('../../models/Branch');
const emailService = require('../../services/email.service');
const { isBranchAuthorized } = require('../../utils/branchHelper');
const INVITABLE_ROLES = ['instructor', 'branch_admin', 'branch_management', 'super_admin', 'super_management', 'student'];
const INVITE_EXPIRY_MS = 72 * 3600000; // 72 hours
const { PERMISSIONS } = require('../../config/permissions');

exports.inviteStaff = async (req, res, next) => {
  try {
    const { name, email, role = 'instructor', branchId, phone } = req.body;

    if (!INVITABLE_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Invitable roles: ${INVITABLE_ROLES.join(', ')}` });
    }

    let branch = null;
    let effectiveBranchId = branchId;

    if (effectiveBranchId) {
      branch = await Branch.findById(effectiveBranchId);
    }

    if (!branch && role !== 'super_admin' && role !== 'super_management') {
      // Auto-fallback to head office or first active branch if not specified
      branch = await Branch.findOne({ type: 'head_office', isActive: true }) || await Branch.findOne({ isActive: true });
      if (branch) effectiveBranchId = branch._id;
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    let user;
    if (existing) {
      // Already a completed account -> do not leak or overwrite
      if (existing.hasProvider('credentials') && existing.password) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      // Pending invite exists -> regenerate token and resend
      user = existing;
      if (!INVITABLE_ROLES.includes(existing.role)) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      user.name = name || user.name;
      user.role = role;
      if (effectiveBranchId) user.branchId = effectiveBranchId;
      if (phone !== undefined) user.phone = phone;
    } else {
      user = new User({
        name,
        email: normalizedEmail,
        phone: phone || '',
        role,
        branchId: effectiveBranchId || undefined,
        providers: [], // no credentials until invite accepted
        isVerified: true
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.inviteToken = crypto.createHash('sha256').update(token).digest('hex');
    user.inviteExpiry = Date.now() + INVITE_EXPIRY_MS;
    await user.save({ validateBeforeSave: false });

    const locale = user.language === 'en' ? 'en' : 'bn';
    const setupUrl = `${process.env.FRONTEND_URL || 'https://www.smartyouthict.com'}/${locale}/accept-invite?token=${token}`;

    const branchForEmail = branch || { name: 'Smart Youth ICT', code: 'HQ' };

    setTimeout(() => {
      emailService.sendStaffInvite(user, branchForEmail, role, setupUrl)
        .catch(err => console.error('[Staff Invite Email Failed]', err.message));
    }, 0);

    const responseUser = await User.findById(user._id).select('-password -inviteToken -inviteExpiry');
    res.status(201).json({
      success: true,
      data: responseUser,
      message: `Invitation sent to ${user.email}. The link expires in 72 hours.`
    });
  } catch (err) { next(err); }
};

// @desc    Accept staff invite: set password using emailed token
// @route   POST /api/users/invite/accept
// @access  Public (token-gated)
exports.acceptInvite = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      inviteToken: hashedToken,
      inviteExpiry: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invitation link is invalid or has expired' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account is disabled' });
    }

    user.password = password; // hashed by pre-save hook
    user.addProvider('credentials');
    user.inviteToken = undefined;
    user.inviteExpiry = undefined;
    user.isVerified = true;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    setTimeout(() => {
      emailService.sendPasswordChangedAlert(user)
        .catch(err => console.error('[Password Changed Alert Failed]', err.message));
    }, 0);

    res.json({ success: true, message: 'Account activated. Please log in.' });
  } catch (err) { next(err); }
};

// @desc    Admin: Update any user details
// @route   PUT /api/users/:id
// @access  Private (admin/super_admin)
exports.getBranchStaff = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const branchId = isSuper ? (req.query.branchId || req.user.branchId) : req.user.branchId;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch context is required' });
    }

    const filter = {
      branchId,
      role: { $in: ['employee', 'instructor', 'branch_admin', 'branch_management'] },
    };

    const staffList = await User.find(filter)
      .select('name email phone role permissions isActive avatar createdAt assignedBy')
      .populate('assignedBy', 'name role')
      .sort('-createdAt')
      .lean();

    res.json({
      success: true,
      count: staffList.length,
      data: staffList,
    });
  } catch (err) { next(err); }
};

// @desc    Branch Manager creates or onboards an employee with delegated permissions
// @route   POST /api/users/branch/staff
// @access  Private (Branch Admin / Super Admin)
exports.createBranchStaff = async (req, res, next) => {
  try {
    const { name, email, password, phone, permissions = [], role = 'employee' } = req.body;
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const branchId = isSuper ? (req.body.branchId || req.user.branchId) : req.user.branchId;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch context is required' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Privilege escalation prevention: Branch Manager can only create employees or instructors
    const allowedRolesToCreate = isSuper
      ? ['employee', 'instructor', 'branch_admin', 'branch_management']
      : ['employee', 'instructor'];

    if (!allowedRolesToCreate.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You cannot assign the role '${role}'. Allowed roles: ${allowedRolesToCreate.join(', ')}`,
      });
    }

    // Validate permissions array against known registry
    const validPerms = Object.values(PERMISSIONS);
    const sanitizedPermissions = Array.isArray(permissions)
      ? permissions.filter(p => validPerms.includes(p))
      : [];

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered in system' });
    }

    const newStaff = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password,
      role,
      branchId,
      permissions: role === 'employee' ? sanitizedPermissions : [],
      assignedBy: req.user._id,
      isVerified: true,
      isActive: true,
      providers: ['credentials'],
    });

    const responseUser = await User.findById(newStaff._id).select('-password');
    res.status(201).json({
      success: true,
      data: responseUser,
      message: `Staff member ${name} created successfully with ${sanitizedPermissions.length} delegated permissions.`,
    });
  } catch (err) { next(err); }
};

// @desc    Update employee delegated permissions
// @route   PUT /api/users/branch/staff/:id/permissions
// @access  Private (Branch Admin / Super Admin)
exports.updateStaffPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Permissions must be an array' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Tenant authorization check
    if (!isBranchAuthorized(req, targetUser.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Staff member belongs to another branch' });
    }

    // Protection: Cannot alter permissions of super admins or peers
    if (['super_admin', 'super_management', 'branch_admin'].includes(targetUser.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot reconfigure permissions for administrative superiors' });
    }

    const validPerms = Object.values(PERMISSIONS);
    targetUser.permissions = permissions.filter(p => validPerms.includes(p));
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1; // Invalidate active session tokens
    await targetUser.save();

    const userCache = require('../../utils/userCache');
    userCache.del(targetUser._id);

    res.json({
      success: true,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        role: targetUser.role,
        permissions: targetUser.permissions,
      },
      message: `Permissions updated successfully. ${targetUser.permissions.length} tasks delegated.`,
    });
  } catch (err) { next(err); }
};

// @desc    Toggle active status of a branch staff member
// @route   PATCH /api/users/branch/staff/:id/status
// @access  Private (Branch Admin / Super Admin)
exports.toggleBranchStaffStatus = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (!isBranchAuthorized(req, targetUser.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Staff member belongs to another branch' });
    }

    if (['super_admin', 'super_management', 'branch_admin'].includes(targetUser.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify administrative peers' });
    }

    targetUser.isActive = !targetUser.isActive;
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    await targetUser.save();

    const userCache = require('../../utils/userCache');
    userCache.del(targetUser._id);

    res.json({
      success: true,
      message: `Staff account ${targetUser.isActive ? 'activated' : 'deactivated'}`,
      isActive: targetUser.isActive,
    });
  } catch (err) { next(err); }
};

// @desc    Remove an employee from a branch
// @route   DELETE /api/users/branch/staff/:id
// @access  Private (Branch Admin / Super Admin)
exports.deleteBranchStaff = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (!isBranchAuthorized(req, targetUser.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Staff member belongs to another branch' });
    }

    if (['super_admin', 'super_management', 'branch_admin'].includes(targetUser.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot remove administrative superiors' });
    }

    await User.findByIdAndDelete(req.params.id);

    const userCache = require('../../utils/userCache');
    userCache.del(targetUser._id);

    res.json({ success: true, message: 'Staff account removed successfully' });
  } catch (err) { next(err); }
};

// @desc    Public verification of student identity and enrollment credentials
// @route   GET /api/users/public/verify-student/:studentId
// @access  Public
exports.forceLogoutUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    await targetUser.save();

    const userCache = require('../../utils/userCache');
    userCache.del(targetUser._id);

    const AuditLog = require('../../models/AuditLog');
    await AuditLog.create({
      actor: req.user._id,
      action: 'FORCE_LOGOUT_USER',
      entity: 'User',
      entityId: targetUser._id,
      branchId: targetUser.branchId || req.user.branchId,
      details: {
        targetUserId: targetUser._id,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        newTokenVersion: targetUser.tokenVersion,
        adminName: req.user.name,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      success: true,
      message: `All active sessions for ${targetUser.name} have been revoked immediately.`,
      tokenVersion: targetUser.tokenVersion,
    });
  } catch (err) { next(err); }
};

// @desc    Update user permissions (PBAC matrix) (Super Admin)
// @route   PUT /api/users/:id/permissions
// @access  Private (Super Admin)
exports.updateUserPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Permissions must be an array of permission IDs' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Protection: Super Admin peers cannot have permissions revoked/altered by non-super_admin
    if (['super_admin', 'super_management'].includes(targetUser.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify permissions for Super Administrators' });
    }

    const validPerms = Object.values(PERMISSIONS);
    const sanitizedPermissions = permissions.filter(p => validPerms.includes(p));

    targetUser.permissions = sanitizedPermissions;
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1; // Invalidate current session so updated permissions apply
    await targetUser.save();

    const userCache = require('../../utils/userCache');
    userCache.del(targetUser._id);

    const AuditLog = require('../../models/AuditLog');
    await AuditLog.create({
      actor: req.user._id,
      action: 'UPDATE_PERMISSIONS',
      entity: 'User',
      entityId: targetUser._id,
      branchId: targetUser.branchId || req.user.branchId,
      details: {
        targetUserId: targetUser._id,
        targetUserName: targetUser.name,
        permissionsCount: sanitizedPermissions.length,
        permissions: sanitizedPermissions,
        adminName: req.user.name,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      success: true,
      message: `Permissions updated successfully for ${targetUser.name}. ${sanitizedPermissions.length} permissions assigned.`,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        role: targetUser.role,
        permissions: targetUser.permissions,
      },
    });
  } catch (err) { next(err); }
};



// @desc    Execute bulk action across multiple users (activate, suspend, force_logout, change_role)
// @route   POST /api/users/bulk-action
// @access  Private (super_admin, super_management)
