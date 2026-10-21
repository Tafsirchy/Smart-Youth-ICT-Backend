const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Branch = require("../models/Branch");
const SystemSetting = require("../models/SystemSetting");
const emailService = require("../services/email.service");
const { generateToken } = require("../utils/jwt");
const userCache = require("../utils/userCache");

const {
  generateEmailOtp,
  hashOtp,
  verifyHashedOtp,
  generateTotpSecret,
  verifyTotpCode,
  generateOtpAuthUrl,
  generateBackupCodes,
  maskEmail,
  generate2FATempToken,
  verify2FATempToken,
} = require("../utils/twoFactor");

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
  branchId: user.branchId,
  secondaryBranches: user.secondaryBranches || [],
  permissions: user.permissions || [],
  twoFactorEnabled: user.twoFactorEnabled || false,
  twoFactorMethod: user.twoFactorMethod || "email",
});

const sendAuthResponse = (res, statusCode, user) => {
  if (user?._id) {
    userCache.del(user._id);
  }
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
    // 🛡️ Security Check: Are registrations open globally?
    const regSetting = await SystemSetting.findOne({ key: "registrationOpen" });
    if (regSetting && regSetting.value === false) {
      return res.status(403).json({
        success: false,
        code: "REGISTRATIONS_CLOSED",
        message: "New student registrations are currently closed by administration.",
      });
    }

    const { name, phone, password, branchId } = req.body;
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

    let assignedBranch = branchId;
    if (!assignedBranch) {
      const firstBranch = await Branch.findOne().sort({ createdAt: 1 });
      if (firstBranch) assignedBranch = firstBranch._id;
    }

    const user = await User.create({
      name: name.trim(),
      email,
      phone: phone.trim(),
      password,
      providers: ["credentials"],
      branchId: assignedBranch,
    });

    // Generate Verification Token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
    user.verificationExpiry = Date.now() + 24 * 3600000; // 24 hours
    await user.save({ validateBeforeSave: false });

    // Send Verification Email
    const locale = req.headers['accept-language']?.includes('bn') ? 'bn' : 'en';
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${locale}/verify-email?token=${verifyToken}`;
    
    emailService.sendVerificationEmail(user, verifyUrl).catch(err => console.error('[Verification Email Failed]', err.message));

    return sendAuthResponse(res, 201, user);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password, twoFactorCode, tempToken } = req.body;

    // Handle direct 2FA verification if tempToken and twoFactorCode are passed
    if (tempToken && twoFactorCode) {
      const decoded = verify2FATempToken(tempToken);
      if (!decoded) {
        return res.status(401).json({ success: false, message: "Verification session expired. Please sign in again." });
      }

      const user2FA = await User.findById(decoded.sub).select(
        "+twoFactorSecret +twoFactorOtp +twoFactorOtpExpiry +twoFactorBackupCodes"
      );
      if (!user2FA || !user2FA.isActive) {
        return res.status(401).json({ success: false, message: "Account disabled or not found." });
      }

      const method = user2FA.twoFactorMethod || "email";
      let isVerified = false;

      if (method === "email") {
        if (user2FA.twoFactorOtpExpiry && user2FA.twoFactorOtpExpiry > Date.now()) {
          isVerified = verifyHashedOtp(twoFactorCode, user2FA.twoFactorOtp);
        }
      } else if (method === "authenticator") {
        isVerified = verifyTotpCode(twoFactorCode, user2FA.twoFactorSecret);
      }

      // Check backup codes fallback
      if (!isVerified && user2FA.twoFactorBackupCodes?.length) {
        const cleanCode = twoFactorCode.toUpperCase().replace(/\s+/g, "");
        const backupIdx = user2FA.twoFactorBackupCodes.findIndex(
          (b) => !b.used && (b.code === cleanCode || b.code.replace("-", "") === cleanCode)
        );
        if (backupIdx !== -1) {
          user2FA.twoFactorBackupCodes[backupIdx].used = true;
          isVerified = true;
        }
      }

      if (!isVerified) {
        return res.status(401).json({ success: false, message: "Invalid or expired verification code." });
      }

      // Clear one-time OTP
      user2FA.twoFactorOtp = undefined;
      user2FA.twoFactorOtpExpiry = undefined;
      await user2FA.save({ validateBeforeSave: false });

      return sendAuthResponse(res, 200, user2FA);
    }

    const user = await User.findOne({ email }).select(
      "+password +twoFactorSecret +twoFactorOtp +twoFactorOtpExpiry +twoFactorBackupCodes"
    );
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

    // Check system-level 2FA enforcement
    const enforceAdmin2FASetting = await SystemSetting.findOne({ key: "enforceAdmin2FA" });
    const isPrivilegedRole = ["super_admin", "super_management", "branch_admin", "branch_management"].includes(user.role);
    const requires2FA = user.twoFactorEnabled || (enforceAdmin2FASetting?.value === true && isPrivilegedRole);

    if (requires2FA) {
      const method = user.twoFactorMethod || "email"; // Default: Email OTP

      // If user provided twoFactorCode in the first attempt
      if (twoFactorCode) {
        let isVerified = false;
        if (method === "email") {
          if (user.twoFactorOtpExpiry && user.twoFactorOtpExpiry > Date.now()) {
            isVerified = verifyHashedOtp(twoFactorCode, user.twoFactorOtp);
          }
        } else if (method === "authenticator") {
          isVerified = verifyTotpCode(twoFactorCode, user.twoFactorSecret);
        }

        if (isVerified) {
          user.twoFactorOtp = undefined;
          user.twoFactorOtpExpiry = undefined;
          await user.save({ validateBeforeSave: false });
          return sendAuthResponse(res, 200, user);
        }
      }

      // Generate 2FA Challenge
      const tempToken = generate2FATempToken(user);

      if (method === "email") {
        const otp = generateEmailOtp();
        user.twoFactorOtp = hashOtp(otp);
        user.twoFactorOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save({ validateBeforeSave: false });

        // Dispatch Email in background
        emailService.sendTwoFactorOtp(user, otp).catch((err) =>
          console.error("[2FA OTP Email Dispatch Error]", err.message)
        );
      }

      return res.status(200).json({
        success: true,
        require2FA: true,
        tempToken,
        method,
        emailMasked: maskEmail(user.email),
        message:
          method === "email"
            ? "A 6-digit verification code has been sent to your registered email."
            : "Please enter the 6-digit code from your Authenticator app.",
      });
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

    const { idToken, phone, name, branchId } = req.body;
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
      // 🛡️ Security Check: Are registrations open globally?
      const regSetting = await SystemSetting.findOne({ key: "registrationOpen" });
      if (regSetting && regSetting.value === false) {
        return res.status(403).json({
          success: false,
          code: "REGISTRATIONS_CLOSED",
          message: "New registrations are currently closed by administration. Existing accounts can still log in.",
        });
      }

      user = await User.create({
        name: (name || payload.name || email.split("@")[0]).trim(),
        email,
        phone: phone?.trim() || "",
        avatar: payload.picture || "",
        googleId: payload.sub,
        providers: ["google"],
        isVerified: true,
        branchId,
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
    const tokenErrorMessage = err.message || "";
    const isTokenVerificationError =
      tokenErrorMessage.includes("Wrong recipient") ||
      tokenErrorMessage.includes("Token used too late") ||
      tokenErrorMessage.includes("Wrong number of segments") ||
      tokenErrorMessage.includes("invalid") ||
      tokenErrorMessage.includes("expired") ||
      tokenErrorMessage.includes("verifyIdToken");

    if (isTokenVerificationError) {
      return res
        .status(401)
        .json({ message: "Google token is invalid or expired" });
    }

    next(err);
  }
};

// GET /api/auth/verify-email
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    // Fire-and-forget Welcome Email now that they are verified
    emailService.sendWelcome(user).catch(err => console.error('[Welcome Email Failed]', err.message));

    res.json({ success: true, message: "Email successfully verified!" });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (user && !user.isVerified && user.hasProvider("credentials")) {
      const verifyToken = crypto.randomBytes(32).toString("hex");
      user.verificationToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
      user.verificationExpiry = Date.now() + 24 * 3600000;
      await user.save({ validateBeforeSave: false });

      const locale = req.headers['accept-language']?.includes('bn') ? 'bn' : 'en';
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${locale}/verify-email?token=${verifyToken}`;
      
      emailService.sendVerificationEmail(user, verifyUrl).catch(err => console.error('[Verification Email Failed]', err.message));
    }
    
    // Always return success to prevent enumeration
    res.json({ success: true, message: "If your account exists and is unverified, a verification link has been sent." });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    data: req.user,
    isImpersonating: req.isImpersonating || false,
    originalAdmin: req.originalAdmin || null,
  });
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
      const locale = user.language || 'bn';
      const resetUrl = `${process.env.FRONTEND_URL}/${locale}/reset-password?token=${token}`;
      
      // Fire-and-forget the password reset email on the next tick so it doesn't block the frontend UI
      setTimeout(() => {
        emailService.sendPasswordReset(user, resetUrl).catch(mailErr => {
          console.error("Reset email failed:", mailErr.message);
        });
      }, 0);
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
    user.isVerified = true; // also verify them if they reset password
    user.addProvider("credentials");
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Send Security Alert on the next tick
    setTimeout(() => {
      emailService.sendPasswordChangedAlert(user).catch(err => console.error('[Password Changed Alert Failed]', err.message));
    }, 0);

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

// PUT /api/auth/password
const updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(oldPassword))) {
      return res.status(401).json({ message: "Invalid current password" });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Send Security Alert
    emailService.sendPasswordChangedAlert(user).catch(err => console.error('[Password Changed Alert Failed]', err.message));

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/impersonate/:userId
const impersonateUser = async (req, res, next) => {
  try {
    if (!['super_admin', 'super_management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Super Admin privileges required for user impersonation',
      });
    }

    const { userId } = req.params;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot impersonate your own active session' });
    }

    if (['super_admin', 'super_management'].includes(targetUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Security Restriction: Impersonation of another Super Administrator is prohibited',
      });
    }

    if (!targetUser.isActive) {
      return res.status(403).json({ success: false, message: 'Cannot impersonate a suspended or deactivated account' });
    }

    const impersonationPayload = {
      id: targetUser._id.toString(),
      ver: targetUser.tokenVersion || 0,
      isImpersonating: true,
      originalAdminId: req.user._id.toString(),
      originalAdminName: req.user.name,
      originalAdminEmail: req.user.email,
      originalAdminRole: req.user.role,
    };

    const token = generateToken(impersonationPayload, '2h');

    // Audit Log for impersonation
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actor: req.user._id,
      action: 'IMPERSONATE_USER',
      entity: 'User',
      entityId: targetUser._id,
      branchId: targetUser.branchId || req.user.branchId,
      details: {
        impersonatedUserId: targetUser._id,
        impersonatedUserName: targetUser.name,
        impersonatedUserEmail: targetUser.email,
        impersonatedRole: targetUser.role,
        adminName: req.user.name,
        adminEmail: req.user.email,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.json({
      success: true,
      token,
      accessToken: token,
      user: serializeUser(targetUser),
      targetUser: serializeUser(targetUser),
      impersonation: {
        isImpersonating: true,
        originalAdmin: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        targetUser: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          branchId: targetUser.branchId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// Two-Factor Authentication (2FA) Controller Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/2fa/verify
 * Public endpoint to verify 2FA challenge using tempToken & code
 */
const verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ success: false, message: "Temporary token and 6-digit code are required." });
    }

    const decoded = verify2FATempToken(tempToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Verification session expired. Please sign in again." });
    }

    const user = await User.findById(decoded.sub).select(
      "+twoFactorSecret +twoFactorOtp +twoFactorOtpExpiry +twoFactorBackupCodes"
    );
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Account disabled or not found." });
    }

    const method = user.twoFactorMethod || "email";
    let isVerified = false;

    if (method === "email") {
      if (user.twoFactorOtpExpiry && user.twoFactorOtpExpiry > Date.now()) {
        isVerified = verifyHashedOtp(code, user.twoFactorOtp);
      }
    } else if (method === "authenticator") {
      isVerified = verifyTotpCode(code, user.twoFactorSecret);
    }

    // Check backup codes
    if (!isVerified && user.twoFactorBackupCodes?.length) {
      const cleanCode = code.toUpperCase().replace(/\s+/g, "");
      const backupIdx = user.twoFactorBackupCodes.findIndex(
        (b) => !b.used && (b.code === cleanCode || b.code.replace("-", "") === cleanCode)
      );
      if (backupIdx !== -1) {
        user.twoFactorBackupCodes[backupIdx].used = true;
        isVerified = true;
      }
    }

    if (!isVerified) {
      return res.status(401).json({ success: false, message: "Invalid or expired verification code." });
    }

    // Clear OTP
    user.twoFactorOtp = undefined;
    user.twoFactorOtpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return sendAuthResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/resend
 * Resend Email OTP during 2FA login challenge
 */
const resendTwoFactorOtp = async (req, res, next) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      return res.status(400).json({ success: false, message: "Verification session token is required." });
    }

    const decoded = verify2FATempToken(tempToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Verification session expired. Please sign in again." });
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const otp = generateEmailOtp();
    user.twoFactorOtp = hashOtp(otp);
    user.twoFactorOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Send email
    await emailService.sendTwoFactorOtp(user, otp);

    res.json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${maskEmail(user.email)}.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/2fa/status
 * Get current 2FA status for authenticated user
 */
const getTwoFactorStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+twoFactorBackupCodes");
    const remainingBackupCodes = (user.twoFactorBackupCodes || []).filter((b) => !b.used).length;

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled || false,
        method: user.twoFactorMethod || "email",
        remainingBackupCodes,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/setup
 * Initiate 2FA setup (returns secret for authenticator, or sends code for email)
 */
const setupTwoFactor = async (req, res, next) => {
  try {
    const method = req.body.method === "authenticator" ? "authenticator" : "email"; // Default: email
    const user = await User.findById(req.user._id);

    if (method === "authenticator") {
      const secret = generateTotpSecret();
      const otpauthUrl = generateOtpAuthUrl(secret, user.email);

      // Temporarily store secret on user pending verification
      user.twoFactorSecret = secret;
      await user.save({ validateBeforeSave: false });

      return res.json({
        success: true,
        method: "authenticator",
        secret,
        otpauthUrl,
        message: "Scan the QR code or enter the secret in Google Authenticator / Authy.",
      });
    }

    // Default: Email OTP
    const otp = generateEmailOtp();
    user.twoFactorOtp = hashOtp(otp);
    user.twoFactorOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await emailService.sendTwoFactorOtp(user, otp);

    return res.json({
      success: true,
      method: "email",
      emailMasked: maskEmail(user.email),
      message: `A test verification code has been sent to ${maskEmail(user.email)}.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/enable
 * Confirm and activate 2FA
 */
const enableTwoFactor = async (req, res, next) => {
  try {
    const { code, method = "email" } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "Verification code is required." });
    }

    const user = await User.findById(req.user._id).select("+twoFactorSecret +twoFactorOtp +twoFactorOtpExpiry");

    let isVerified = false;
    if (method === "authenticator") {
      // The TOTP secret is server-side state. Never trust a client-supplied secret,
      // otherwise a caller could enable 2FA with a secret they control.
      const activeSecret = user.twoFactorSecret;
      if (!activeSecret) {
        return res.status(400).json({ success: false, message: "TOTP secret missing. Please restart setup." });
      }
      isVerified = verifyTotpCode(code, activeSecret);
      if (isVerified) {
        user.twoFactorSecret = activeSecret;
      }
    } else {
      // Email OTP
      if (user.twoFactorOtpExpiry && user.twoFactorOtpExpiry > Date.now()) {
        isVerified = verifyHashedOtp(code, user.twoFactorOtp);
      }
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, message: "Invalid verification code. Please try again." });
    }

    // Generate 8 backup emergency codes
    const backupCodes = generateBackupCodes(8);

    user.twoFactorEnabled = true;
    user.twoFactorMethod = method;
    user.twoFactorOtp = undefined;
    user.twoFactorOtpExpiry = undefined;
    user.twoFactorBackupCodes = backupCodes.map((c) => ({ code: c, used: false }));
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: `Two-Factor Authentication activated with ${method === "email" ? "Email Verification" : "Authenticator App"}!`,
      backupCodes,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA with password confirmation
 */
const disableTwoFactor = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Your current password is required to disable 2FA." });
    }

    const user = await User.findById(req.user._id).select("+password +twoFactorSecret +twoFactorOtp");
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid password." });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorOtp = undefined;
    user.twoFactorOtpExpiry = undefined;
    user.twoFactorBackupCodes = [];
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: "Two-Factor Authentication has been successfully disabled.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  getMe,
  impersonateUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  updateProfile,
  updatePassword,
  verifyTwoFactorLogin,
  resendTwoFactorOtp,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
};


