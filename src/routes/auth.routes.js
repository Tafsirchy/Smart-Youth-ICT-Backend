const express = require('express');
const router  = express.Router();
const { register, login, getMe, forgotPassword, resetPassword, updateProfile } = require('../controllers/auth.controller');
const { protect }     = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/register',        authLimiter, register);
router.post('/login',           authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password',  authLimiter, resetPassword);
router.get('/me',               protect,     getMe);
router.put('/profile',          protect,     updateProfile);

module.exports = router;
