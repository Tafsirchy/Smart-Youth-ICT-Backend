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
    const { role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password -resetToken -resetExpiry')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort('-createdAt');

    const total = await User.countDocuments(filter);
    res.json({ success: true, count: users.length, total, data: users });
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
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) { next(err); }
};
