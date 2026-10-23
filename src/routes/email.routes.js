const express = require('express');
const router = express.Router();
const { subscribeNewsletter } = require('../controllers/email.controller');
const { emailLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/subscribe', emailLimiter, subscribeNewsletter);

module.exports = router;
