const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const emailService = require("../services/email.service");
const { generateToken } = require("../utils/jwt");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  language: user.language,
  avatar: user.avatar,
  bio: user.bio,
  providers: user.providers,
  isVerified: user.isVerified,
});

const sendAuthResponse = (res, statusCode, user) => {
  const accessToken = generateToken(user);

  return res.status(statusCode).json({
    success: true,
    token: accessToken,
    accessToken,
    user: serializeUser(user),
  });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.hasProvider("credentials")) {
        return res.status(409).json({ message: "Email already registered" });
      }

      return res.status(409).json({
        message:
          "This email is already linked to Google sign-in. Continue with Google or use password reset to add email login.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email,
      phone: phone.trim(),
      password,
      providers: ["credentials"],
    });

    return sendAuthResponse(res, 201, user);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.hasProvider("credentials") || !user.password) {
      return res.status(400).json({
        message:
          "This account uses Google sign-in. Continue with Google or reset your password to add email login.",
      });
    }
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return sendAuthResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/google
const googleLogin = async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res
        .status(500)
        .json({ message: "Google sign-in is not configured" });
    }

    const { idToken, phone, name } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email || !payload.email_verified) {
      return res
        .status(401)
        .json({ message: "Google account verification failed" });
    }

    const email = normalizeEmail(payload.email);
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email }],
    }).select("+password");

    if (user && !user.isActive) {
      return res.status(403).json({ message: "This account is disabled" });
    }

    if (!user) {
      user = await User.create({
        name: (name || payload.name || email.split("@")[0]).trim(),
        email,
        phone: phone?.trim() || "",
        avatar: payload.picture || "",
        googleId: payload.sub,
        providers: ["google"],
        isVerified: true,
      });
    } else {
      user.email = email;
      user.googleId = user.googleId || payload.sub;
      user.avatar = user.avatar || payload.picture || "";
      user.name =
        user.name || (name || payload.name || email.split("@")[0]).trim();
      user.isVerified = true;
      if (!user.phone && phone) user.phone = phone.trim();
      user.addProvider("google");
      await user.save();
    }

    return sendAuthResponse(res, 200, user);
  } catch (err) {
    if (
      err.message?.includes("Wrong recipient") ||
      err.message?.includes("Token used too late")
    ) {
      return res
        .status(401)
        .json({ message: "Google token is invalid or expired" });
    }
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user, data: req.user });
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    // Always return 200 to prevent email enumeration (security fix)
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetToken = crypto.createHash("sha256").update(token).digest("hex");
      user.resetExpiry = Date.now() + 3600000;
      await user.save({ validateBeforeSave: false });
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      // Send the password reset email
      try {
        await emailService.sendPasswordReset(user, resetUrl);
      } catch (mailErr) {
        console.error("Reset email failed:", mailErr.message);
      }
    }
    res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res
        .status(400)
        .json({ message: "Token and new password are required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetToken: hashedToken,
      resetExpiry: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset link is invalid or has expired" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "This account is disabled" });
    }

    user.password = password; // Will be hashed by pre-save hook
    user.resetToken = undefined;
    user.resetExpiry = undefined;
    user.isVerified = true;
    user.addProvider("credentials");
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    res.json({
      success: true,
      message: "Password has been reset. Please log in.",
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ["name", "phone", "avatar", "language", "bio"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");
    res.json({ success: true, user, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
};
