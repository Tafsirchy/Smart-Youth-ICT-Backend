const mongoose = require('mongoose');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const crypto = require('crypto');
const Branch = require('../models/Branch');
const emailService = require('../services/email.service');

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -resetToken -resetExpiry');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
exports.updateMyProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'avatar', 'language'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
      .select('-password -resetToken -resetExpiry');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, branchId, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    
    // 🛡️ Security Fix: Enforce Branch Isolation (IDOR Mitigation & Super Admin inspection)
    let targetBranchId = branchId;
    if (['branch_admin', 'branch_management'].includes(req.user.role)) {
      const { getAllowedBranches } = require('../utils/branchHelper');
      const allowedBranches = getAllowedBranches(req.user);
      
      if (branchId && allowedBranches.includes(branchId.toString())) {
        targetBranchId = branchId;
      } else {
        targetBranchId = allowedBranches;
      }
    }

    if (targetBranchId) {
      const Branch = require('../models/Branch');
      const mongoose = require('mongoose');
      
      if (Array.isArray(targetBranchId)) {
        filter.branchId = { $in: targetBranchId };
      } else {
        let branchDoc = null;
        if (mongoose.Types.ObjectId.isValid(targetBranchId)) {
          branchDoc = await Branch.findById(targetBranchId).lean();
        }
        if (!branchDoc) {
          branchDoc = await Branch.findOne({
            $or: [
              { slug: targetBranchId },
              { code: targetBranchId?.toString().toUpperCase() }
            ]
          }).lean();
        }

        const resolvedBranchId = branchDoc ? branchDoc._id : (mongoose.Types.ObjectId.isValid(targetBranchId) ? targetBranchId : null);

        if (resolvedBranchId) {
          const Enrollment = require('../models/Enrollment');
          const enrolledUserIds = await Enrollment.find({ branchId: resolvedBranchId }).distinct('user');

          filter.$or = [
            { branchId: resolvedBranchId },
            { secondaryBranches: resolvedBranchId },
            { _id: { $in: enrolledUserIds } }
          ];
        } else {
          filter.branchId = targetBranchId;
        }
      }
    }

    if (q) {
      // 🛡️ Security Fix: Escape regex special characters to prevent NoSQL injection
      const escapedQ = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchConditions = [
        { name: { $regex: escapedQ, $options: 'i' } },
        { email: { $regex: escapedQ, $options: 'i' } }
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const limitNum = Number(limit) || 20;

    const users = await User.find(filter)
      .select('name email role branchId isActive phone createdAt')
      .skip((page - 1) * limitNum)
      .limit(limitNum)
      .sort('-createdAt')
      .lean();

    const total = await User.countDocuments(filter);
    res.json({ 
      success: true, 
      count: users.length, 
      total, 
      totalPages: Math.ceil(total / limitNum),
      data: users 
    });
  } catch (err) { next(err); }
};

// @desc    Get a single user by ID (admin only)
// @route   GET /api/users/:id
// @access  Private (admin)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetToken -resetExpiry')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // 🛡️ Security Fix: Branch Isolation Check
    if (['branch_admin', 'branch_management'].includes(req.user.role)) {
      const { getAllowedBranches } = require('../utils/branchHelper');
      if (!getAllowedBranches(req.user).includes(user.branchId?.toString())) {
        return res.status(403).json({ success: false, message: 'Access denied: User belongs to another branch' });
      }
    }

    // Include enrollment count for context
    const enrollmentCount = await Enrollment.countDocuments({ user: user._id });
    res.json({ success: true, data: { ...user, enrollmentCount } });
  } catch (err) { next(err); }
};

// @desc    Deactivate or reactivate a user (admin only)
// @route   PATCH /api/users/:id/status
// @access  Private (admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // 🛡️ Security Fix: Branch Isolation Check
    if (['branch_admin', 'branch_management'].includes(req.user.role)) {
      const { getAllowedBranches } = require('../utils/branchHelper');
      if (!getAllowedBranches(req.user).includes(user.branchId?.toString())) {
        return res.status(403).json({ success: false, message: 'Access denied: Target user belongs to another branch' });
      }
    }

    user.isActive = !user.isActive;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing sessions

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) { next(err); }
};

// @desc    Admin: Create a new user manually (with credential email)
// @route   POST /api/users
// @access  Private (super_admin / branch_admin / branch_management)
exports.adminCreateUser = async (req, res, next) => {
  try {
    const { name, email, role, phone } = req.body;
    let { branchId, password } = req.body;

    // 🛡️ Branch Isolation: branch managers can only create users in their own branch
    if (['branch_admin', 'branch_management'].includes(req.user.role)) {
      const { getAllowedBranches } = require('../utils/branchHelper');
      const allowedBranches = getAllowedBranches(req.user);
      if (branchId && !allowedBranches.includes(branchId.toString())) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only create students for your own branch.' });
      }
      // Default to the manager's own branch if not specified
      if (!branchId && allowedBranches.length > 0) {
        branchId = allowedBranches[0];
      }
    }

    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    // 🔑 Auto-generate a secure password if not provided
    const rawPassword = password && password.trim() ? password.trim() : crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) + '@1';

    // Resolve branch name for the email
    let branchDoc = null;
    if (branchId) {
      branchDoc = await Branch.findById(branchId).lean();
    }

    const user = await User.create({
      name,
      email: String(email).toLowerCase().trim(),
      password: rawPassword,
      role: role || 'student',
      branchId: branchId || null,
      phone: phone || '',
      isVerified: true // Admins bypass email verification
    });

    // 📧 Fire credential email asynchronously (don't block response)
    const locale = user.language === 'en' ? 'en' : 'bn';
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${locale}/login`;
    setTimeout(() => {
      emailService.sendStudentCredentials({
        name: user.name,
        email: user.email,
        password: rawPassword,
        branchName: branchDoc?.name || 'Smart Youth ICT',
        loginUrl
      }).catch(err => console.error('[Student Credentials Email Failed]', err.message));
    }, 0);

    const responseUser = await User.findById(user._id).select('-password');
    res.status(201).json({
      success: true,
      data: responseUser,
      message: `Student account created. Credentials have been sent to ${user.email}.`
    });
  } catch (err) { next(err); }
};


// @desc    Super Admin invites a staff member (role + branch pre-assigned, staff sets own password via emailed link)
// @route   POST /api/users/invite
// @access  Private (super_admin / super_management)
const INVITABLE_ROLES = ['instructor', 'branch_admin', 'branch_management', 'super_admin', 'super_management', 'student'];
const INVITE_EXPIRY_MS = 72 * 3600000; // 72 hours

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
exports.adminUpdateUser = async (req, res, next) => {
  try {
    const { name, email, role, branchId, phone, isActive } = req.body;

    // Normalize empty branch selection ("") to null so it maps to "Global" instead of
    // failing the ObjectId cast on the branchId path.
    const normalizedBranchId =
      branchId === undefined ? undefined : (branchId === '' || branchId === null ? null : branchId);

    // Authorization check: Only Super Admins can change roles or move branches
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // 🛡️ Security Fix: Branch Isolation Check
    if (!isSuper && ['branch_admin', 'branch_management'].includes(req.user.role)) {
      const { getAllowedBranches } = require('../utils/branchHelper');
      if (!getAllowedBranches(req.user).includes(user.branchId?.toString())) {
        return res.status(403).json({ success: false, message: 'Access denied: Target user belongs to another branch' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    if (isSuper && role && role !== user.role) {
      const administrativeRoles = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'];
      
      // Prevent self-role modification
      if (req.params.id === req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Security Protocol: Self-role reconfiguration is restricted' });
      }

      // Prevent non-super admins from modifying administrative tiers
      if (['super_admin', 'super_management'].includes(user.role) && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Security Protocol: Super Admin tier cannot be reconfigured by peers' });
      }

      user.role = role;
      user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing sessions on role change
      if (normalizedBranchId !== undefined) user.branchId = normalizedBranchId;
    } else if (isSuper && normalizedBranchId !== undefined) {
      user.branchId = normalizedBranchId;
    }

    await user.save();
    const userCache = require('../utils/userCache');
    userCache.del(user._id);

    const updated = await User.findById(user._id).select('-password');
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// @desc    Admin: Delete a user permanently
// @route   DELETE /api/users/:id
// @access  Private (super_admin)
exports.adminDeleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Note: In a production app, you might want to handle dependent records 
    // like Enrollments, Invoices, etc. (Soft delete is usually preferred).
    
    const userCache = require('../utils/userCache');
    userCache.del(req.params.id);

    res.json({ success: true, message: 'User permanently removed from system' });
  } catch (err) { next(err); }
};

// @desc    Update user role (super admin only)
// @route   PUT /api/users/:id/role
// @access  Private (super_admin)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    
    // Prevent updating a user to a non-existent role
    const validRoles = ['student', 'instructor', 'employee', 'branch_admin', 'branch_management', 'super_admin', 'super_management'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    // Prevent changing your own role
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Security Guards
    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Security Protocol: Self-role reconfiguration is restricted' });
    }

    if (['super_admin', 'super_management'].includes(user.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Security Protocol: Super Admin tier cannot be reconfigured by peers' });
    }

    user.role = role;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing sessions
    await user.save();

    const userCache = require('../utils/userCache');
    userCache.del(user._id);
    
    // Select fields for response
    const updatedUser = await User.findById(user._id).select('-password -resetToken -resetExpiry');
    
    res.json({ success: true, data: updatedUser, message: 'Role updated successfully' });
  } catch (err) { next(err); }
};
// @desc    Get all instructors/mentors for public showcase
// @route   GET /api/users/instructors/public
// @access  Public
exports.getPublicInstructors = async (req, res, next) => {
  try {
    const { branchId, courseId, q, page = 1, limit = 50 } = req.query;
    const filter = { role: 'instructor', isActive: true };

    if (branchId) filter.branchId = branchId;

    if (courseId) {
      const Course = require('../models/Course');
      const instructorIds = await Course.find({ _id: courseId }).distinct('instructor');
      filter._id = { $in: instructorIds };
    }

    if (q) {
      const escapedQ = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedQ, $options: 'i' } },
        { expertise: { $regex: escapedQ, $options: 'i' } }
      ];
    }

    const limitNum = Number(limit) || 50;
    const instructors = await User.find(filter)
      .select('name avatar bio expertise role branchId')
      .populate('branchId', 'name')
      .skip((page - 1) * limitNum)
      .limit(limitNum)
      .sort('name')
      .lean();

    const total = await User.countDocuments(filter);
    res.json({
      success: true,
      count: instructors.length,
      total,
      data: instructors
    });
  } catch (err) { next(err); }
};

// ============================================================================
// BRANCH STAFF DELEGATION CONTROLLERS (Branch Manager & Super Admin)
// ============================================================================

const { PERMISSIONS, PERMISSION_METADATA } = require('../config/permissions');
const { isBranchAuthorized } = require('../middleware/rbac.middleware');

// @desc    Get permissions registry & catalog for UI selection
// @route   GET /api/users/permissions/catalog
// @access  Private (Branch Admin / Super Admin)
exports.getPermissionsCatalog = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        permissions: PERMISSIONS,
        catalog: PERMISSION_METADATA,
      },
    });
  } catch (err) { next(err); }
};

// @desc    Get all staff/employees for caller's branch
// @route   GET /api/users/branch/staff
// @access  Private (Branch Admin / Super Admin)
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

    const userCache = require('../utils/userCache');
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

    const userCache = require('../utils/userCache');
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

    const userCache = require('../utils/userCache');
    userCache.del(targetUser._id);

    res.json({ success: true, message: 'Staff account removed successfully' });
  } catch (err) { next(err); }
};

// @desc    Public verification of student identity and enrollment credentials
// @route   GET /api/users/public/verify-student/:studentId
// @access  Public
exports.verifyStudentPublic = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    let query = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      query = { _id: studentId };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid Student ID format' });
    }

    const user = await User.findOne(query)
      .select('name avatar role branchId createdAt isActive isVerified')
      .populate('branchId', 'name code city address phone');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No student found with this identification record.'
      });
    }

    const Enrollment = require('../models/Enrollment');
    const enrollments = await Enrollment.find({ user: user._id, isActive: true })
      .populate('course', 'title thumbnail')
      .select('course createdAt paymentStatus');

    const formattedStudentId = `SYICT-${user.branchId?.code || 'HQ'}-${user._id.toString().slice(-6).toUpperCase()}`;

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        studentId: formattedStudentId,
        role: user.role,
        branch: user.branchId,
        isVerified: user.isVerified || user.isActive,
        enrollmentCount: enrollments.length,
        courses: enrollments.map(e => ({
          title: e.course?.title,
          thumbnail: e.course?.thumbnail,
          enrolledAt: e.createdAt,
          paymentStatus: e.paymentStatus
        })),
        memberSince: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

