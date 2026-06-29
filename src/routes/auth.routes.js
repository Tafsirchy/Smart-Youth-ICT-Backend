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
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
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

module.exports = router;
