const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

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
    if (branchId) filter.branchId = branchId;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const limitNum = Number(limit) || 20;

    const users = await User.find(filter)
      .select('-password -resetToken -resetExpiry')
      .skip((page - 1) * limitNum)
      .limit(limitNum)
      .sort('-createdAt');

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
    const user = await User.findById(req.params.id).select('-password -resetToken -resetExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Include enrollment count for context
    const enrollmentCount = await Enrollment.countDocuments({ user: user._id });
    res.json({ success: true, data: { ...user.toObject(), enrollmentCount } });
  } catch (err) { next(err); }
};

// @desc    Deactivate or reactivate a user (admin only)
// @route   PATCH /api/users/:id/status
// @access  Private (admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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

