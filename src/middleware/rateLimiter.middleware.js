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
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      3,
  message:  { message: 'You have reached the maximum number of email requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { authLimiter, apiLimiter, emailLimiter };
