const User = require('../../models/User');

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

