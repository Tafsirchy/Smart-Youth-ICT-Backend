const rateLimit = require('express-rate-limit');
const net = require('net');

/**
 * Key generator that can never throw.
 *
 * express-rate-limit's default key generator validates `request.ip` with
 * `net.isIP()` and throws ERR_ERL_INVALID_IP_ADDRESS / ERR_ERL_UNDEFINED_IP_ADDRESS
 * when the address is missing or malformed (a spoofed `X-Forwarded-For` header
 * is enough to do it). Because the key generator runs inside an async handler,
 * that throw used to surface as a 500 on every request, which is why the
 * global limiter was previously disabled.
 */
const safeKeyGenerator = (req) => {
  const ip = req.ip;
  if (ip && net.isIP(ip)) return ip;

  const remote = req.socket && req.socket.remoteAddress;
  if (remote && net.isIP(remote)) return remote;

  return 'unresolved-client';
};

/**
 * The trust proxy configuration is set explicitly (`trust proxy` count) in
 * server.js, so the two validations that throw a fatal error when it is
 * permissive or unset only add risk without adding protection.
 */
const validate = { trustProxy: false, xForwardedForHeader: false };

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      15,
  message:  { message: 'Too many requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: safeKeyGenerator,
  validate,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      300,
  message:  { message: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: safeKeyGenerator,
  validate,
  // Health checks and payment/requisition webhooks are called by machines
  // that share an egress IP and retry on failure, so they are not throttled.
  // The test suite drives hundreds of requests from one address, so the
  // limiter is disabled there rather than being worked around per test.
  skip: (req) =>
    process.env.NODE_ENV === 'test' ||
    req.path === '/health' ||
    req.path.startsWith('/api/payments/webhook') ||
    req.path.startsWith('/api/requisitions/webhook'),
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      50,
  message:  { message: 'You have reached the maximum number of email requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: safeKeyGenerator,
  validate,
});

module.exports = { authLimiter, apiLimiter, emailLimiter };
