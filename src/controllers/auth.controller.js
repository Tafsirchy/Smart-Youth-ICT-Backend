const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/email.service');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user  = await User.create({ name, email, phone, password });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    // Always return 200 to prevent email enumeration (security fix)
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token  = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      user.resetToken  = token;
      user.resetExpiry = Date.now() + 3600000;
      await user.save({ validateBeforeSave: false });
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      // Send the password reset email
      try {
        await emailService.sendPasswordReset(user, resetUrl);
      } catch (mailErr) {
        console.error('Reset email failed:', mailErr.message);
      }
    }
    res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }
    const user = await User.findById(decoded.id);
    if (!user || user.resetToken !== token || user.resetExpiry < Date.now()) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }
    user.password    = password; // Will be hashed by pre-save hook
    user.resetToken  = undefined;
    user.resetExpiry = undefined;
    await user.save();
    res.json({ success: true, message: 'Password has been reset. Please log in.' });
  } catch (err) { next(err); }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'avatar', 'language'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword, updateProfile };
