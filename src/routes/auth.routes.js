const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  updateProfile,
  updatePassword,
  impersonateUser,
  verifyTwoFactorLogin,
  resendTwoFactorOtp,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { authLimiter, emailLimiter } = require("../middleware/rateLimiter.middleware");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  googleAuthValidation,
  handleValidation,
} = require("../middleware/authValidation.middleware");

router.post(
  "/register",
  authLimiter,
  registerValidation,
  handleValidation,
  register,
);
router.post("/login", authLimiter, loginValidation, handleValidation, login);
router.post(
  "/google",
  authLimiter,
  googleAuthValidation,
  handleValidation,
  googleLogin,
);
router.post(
  "/forgot-password",
  emailLimiter,
  forgotPasswordValidation,
  handleValidation,
  forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  resetPasswordValidation,
  handleValidation,
  resetPassword,
);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", emailLimiter, resendVerification);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);
router.post(
  "/impersonate/:userId",
  protect,
  authorize("super_admin", "super_management"),
  impersonateUser
);

// ─────────────────────────────────────────────────────────────
// Two-Factor Authentication (2FA) Routes
// ─────────────────────────────────────────────────────────────
router.post("/2fa/verify", authLimiter, verifyTwoFactorLogin);
router.post("/2fa/resend", emailLimiter, resendTwoFactorOtp);
router.get("/2fa/status", protect, getTwoFactorStatus);
router.post("/2fa/setup", protect, setupTwoFactor);
router.post("/2fa/enable", protect, enableTwoFactor);
router.post("/2fa/disable", protect, disableTwoFactor);

module.exports = router;
