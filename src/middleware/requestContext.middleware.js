/**
 * Request context.
 *
 * Every request gets an identifier that follows it through the logs, and the
 * authenticated account is attached to it once the token has been verified.
 */

const { logger, createRequestId } = require('../utils/logger');

const MAX_INBOUND_ID_LENGTH = 100;

/**
 * Attach a request id and a logger to the request.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
const requestContext = (req, res, next) => {
  const inbound = req.headers['x-request-id'];
  const requestId =
    typeof inbound === 'string' && inbound.trim() && inbound.length <= MAX_INBOUND_ID_LENGTH
      ? inbound.trim()
      : createRequestId();

  req.requestId = requestId;
  req.log = logger.child({ requestId });
  res.setHeader('X-Request-Id', requestId);

  next();
};

/**
 * Attach the authenticated account to the request logger.
 *
 * @param {Object} req
 * @param {Object} user
 */
const attachUserContext = (req, user) => {
  if (!req.log || !user) return;

  req.log = req.log.child({
    userId: user._id ? user._id.toString() : undefined,
    branchId: user.branchId ? user.branchId.toString() : undefined,
    role: user.role,
  });
};

module.exports = { requestContext, attachUserContext };
