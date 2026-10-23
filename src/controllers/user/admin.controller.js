const crypto = require('crypto');
const User = require('../../models/User');
const Enrollment = require('../../models/Enrollment');
const Branch = require('../../models/Branch');
const emailService = require('../../services/email.service');
const { getAllowedBranches, isBranchAuthorized, resolveBranchScope } = require('../../utils/branchHelper');

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, branchId, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    
    // 🛡️ Branch isolation (IDOR mitigation): a branch manager only ever sees
    // its own branches, a super admin may inspect any single branch.
    const allowedBranches = getAllowedBranches(req.user);
    const isBranchRole = ['branch_admin', 'branch_management'].includes(req.user.role);

    if (isBranchRole) {
      const requested = branchId && allowedBranches.includes(String(branchId)) ? branchId : null;
      const scope = await resolveBranchScope(req, requested);
      const branchIds = requested ? [scope.branchId] : allowedBranches;
      filter.branchId = { $in: branchIds };
    } else if (branchId) {
      const scope = await resolveBranchScope(req, branchId);
      if (scope.denied) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not have permission for this branch.' });
      }
      if (!scope.branchId) {
        return res.status(400).json({ success: false, message: 'Invalid branch reference' });
      }

      const enrolledUserIds = await Enrollment.find({ branchId: scope.branchId }).distinct('user');

      filter.$or = [
        { branchId: scope.branchId },
        { secondaryBranches: scope.branchId },
        { _id: { $in: enrolledUserIds } }
      ];
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
      .select('name email role branchId isActive phone createdAt permissions tokenVersion')
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
    
    // 🛡️ Branch isolation through the shared helper.
    if (!isBranchAuthorized(req, user.branchId)) {
      return res.status(403).json({ success: false, message: 'Access denied: User belongs to another branch' });
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

    // 🛡️ Branch isolation through the shared helper.
    if (!isBranchAuthorized(req, user.branchId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Target user belongs to another branch' });
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
    const { name, email, role, phone, password } = req.body;
    let { branchId } = req.body;

    // 🛡️ Branch Isolation: branch managers can only create users in their own branch
    if (['branch_admin', 'branch_management'].includes(req.user.role)) {
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

    // 🛡️ Branch isolation through the shared helper.
    if (!isBranchAuthorized(req, user.branchId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Target user belongs to another branch' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    if (isSuper && role && role !== user.role) {
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
    const userCache = require('../../utils/userCache');
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
    
    const userCache = require('../../utils/userCache');
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

    const userCache = require('../../utils/userCache');
    userCache.del(user._id);
    
    // Select fields for response
    const updatedUser = await User.findById(user._id).select('-password -resetToken -resetExpiry');
    
    res.json({ success: true, data: updatedUser, message: 'Role updated successfully' });
  } catch (err) { next(err); }
};
// @desc    Get all instructors/mentors for public showcase
// @route   GET /api/users/instructors/public
// @access  Public
