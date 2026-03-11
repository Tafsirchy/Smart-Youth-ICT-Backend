const { body, validationResult } = require("express-validator");

const passwordRules = body("password")
  .isString()
  .withMessage("Password is required")
  .trim()
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters long")
  .matches(/[a-z]/)
  .withMessage("Password must include at least one lowercase letter")
  .matches(/[A-Z]/)
  .withMessage("Password must include at least one uppercase letter")
  .matches(/[0-9]/)
  .withMessage("Password must include at least one number");

const registerValidation = [
  body("name")
    .isString()
    .withMessage("Name is required")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters"),
  body("email")
    .isString()
    .withMessage("Email is required")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("phone")
    .isString()
    .withMessage("Phone is required")
    .trim()
    .notEmpty()
    .withMessage("Phone is required")
    .isLength({ min: 10, max: 20 })
    .withMessage("Please provide a valid phone number"),
  passwordRules,
];

const loginValidation = [
  body("email")
    .isString()
    .withMessage("Email is required")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isString()
    .withMessage("Password is required")
    .trim()
    .notEmpty()
    .withMessage("Password is required"),
];

const forgotPasswordValidation = [
  body("email")
    .isString()
    .withMessage("Email is required")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

const resetPasswordValidation = [
  body("token")
    .isString()
    .withMessage("Reset token is required")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),
  passwordRules,
];

const googleAuthValidation = [
  body("idToken")
    .isString()
    .withMessage("Google ID token is required")
    .trim()
    .notEmpty()
    .withMessage("Google ID token is required"),
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters"),
  body("phone")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Phone must be a string")
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Please provide a valid phone number"),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors: errors
      .array()
      .map(({ path, msg }) => ({ field: path, message: msg })),
  });
};

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  googleAuthValidation,
  handleValidation,
};
