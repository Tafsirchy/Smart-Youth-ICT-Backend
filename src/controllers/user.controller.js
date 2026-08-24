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
    
    // 🛡️ Security Fix: Enforce Branch Isolation (IDOR Mitigation)
    if (['branch_admin', 'branch_management'].includes(req.user.role)) {
      const { getAllowedBranches } = require('../utils/branchHelper');
      const allowedBranches = getAllowedBranches(req.user);
      
      if (branchId && allowedBranches.includes(branchId.toString())) {
        filter.branchId = branchId;
      } else {
        filter.branchId = { $in: allowedBranches };
      }
    } else if (branchId) {
      filter.branchId = branchId;
    }
    if (q) {
      // 🛡️ Security Fix: Escape regex special characters to prevent NoSQL injection
      const escapedQ = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedQ, $options: 'i' } },
        { email: { $regex: escapedQ, $options: 'i' } }
      ];
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

// @desc    Admin: Create a new user manually
// @route   POST /api/users
// @access  Private (super_admin)
exports.adminCreateUser = async (req, res, next) => {
  try {
    const { name, email, password, role, branchId, phone } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      branchId: branchId || null,
      phone: phone || '',
      isVerified: true // Admins bypass verification
    });

    const responseUser = await User.findById(user._id).select('-password');
    res.status(201).json({ success: true, data: responseUser });
  } catch (err) { next(err); }
};

// @desc    Super Admin invites a staff member (role + branch pre-assigned, staff sets own password via emailed link)
// @route   POST /api/users/invite
// @access  Private (super_admin / super_management)
const INVITABLE_ROLES = ['instructor', 'branch_admin', 'branch_management'];
const INVITE_EXPIRY_MS = 72 * 3600000; // 72 hours

exports.inviteStaff = async (req, res, next) => {
  try {
    const { name, email, role, branchId, phone } = req.body;

    if (!INVITABLE_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Invitable roles: instructor, branch_admin, branch_management' });
    }
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch is required for staff assignment' });
    }
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(400).json({ success: false, message: 'Branch not found' });

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
      user.branchId = branchId;
      if (phone !== undefined) user.phone = phone;
    } else {
      user = new User({
        name,
        email: normalizedEmail,
        phone: phone || '',
        role,
        branchId,
        providers: [], // no credentials until invite accepted
        isVerified: true
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.inviteToken = crypto.createHash('sha256').update(token).digest('hex');
    user.inviteExpiry = Date.now() + INVITE_EXPIRY_MS;
    await user.save({ validateBeforeSave: false });

    const locale = user.language === 'en' ? 'en' : 'bn';
    const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${locale}/accept-invite?token=${token}`;

    setTimeout(() => {
      emailService.sendStaffInvite(user, branch, role, setupUrl)
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

      // Prevent modification of other administrative peers
      if (administrativeRoles.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Security Protocol: Administrative hierarchy nodes cannot be reconfigured by peers' });
      }

      user.role = role;
      if (branchId !== undefined) user.branchId = branchId;
    } else if (isSuper && branchId !== undefined) {
      user.branchId = branchId;
    }

    await user.save();
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
    const validRoles = ['student', 'instructor', 'branch_admin', 'branch_management', 'super_admin', 'super_management'];
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

    const administrativeRoles = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'];
    if (administrativeRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Security Protocol: Administrative hierarchy nodes cannot be reconfigured by peers' });
    }

    user.role = role;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing sessions
    await user.save();
    
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
