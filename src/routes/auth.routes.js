const express = require('express');
const router  = express.Router();
const { register, login, getMe, forgotPassword } = require('../controllers/auth.controller');
const { protect }     = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/register',        authLimiter, register);
router.post('/login',           authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.get('/me',               protect,     getMe);

module.exports = router;
