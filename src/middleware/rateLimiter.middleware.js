const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      15,
  message:  { message: 'Too many requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  { message: 'Rate limit exceeded. Please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
