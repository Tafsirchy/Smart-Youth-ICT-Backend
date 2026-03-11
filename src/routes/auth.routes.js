const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter.middleware");
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
  authLimiter,
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
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

module.exports = router;
