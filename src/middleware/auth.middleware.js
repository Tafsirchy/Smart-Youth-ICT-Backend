const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");
const userCache = require("../utils/userCache");
const { attachUserContext } = require("./requestContext.middleware");

/**
 * A failed authentication carries the HTTP status and the message the API
 * has always returned, so `protect` and the socket handshake can share one
 * implementation.
 */
class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") return null;
  if (!authorizationHeader.startsWith("Bearer ")) return null;
  return authorizationHeader.split(" ")[1] || null;
};

/**
 * Resolve a bearer token to a live user.
 *
 * Shared by the HTTP middleware and the Socket.IO handshake so both layers
 * enforce exactly the same rules: valid signature, existing account, active
 * account, and a token version that has not been revoked.
 *
 * @param {string} token
 * @returns {Promise<{ user: Object, decoded: Object }>}
 * @throws {AuthError}
 */
const authenticateToken = async (token) => {
  if (!token) {
    throw new AuthError(401, "Not authorised — no token");
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new AuthError(401, "Invalid or expired token");
  }

  // 1. Check Cache
  let user = userCache.get(decoded.id);

  // 2. Fetch from DB if miss
  if (!user) {
    user = await User.findById(decoded.id)
      .select("-password -resetToken -resetExpiry -googleId")
      .lean();
    if (!user) throw new AuthError(401, "User not found");

    // Store in cache
    userCache.set(decoded.id, user);
  }

  if (!user.isActive) {
    throw new AuthError(403, "This account is disabled");
  }

  if ((user.tokenVersion || 0) !== (decoded.ver || 0)) {
    throw new AuthError(401, "Session expired. Please sign in again.");
  }

  return { user, decoded };
};

const protect = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  try {
    const { user, decoded } = await authenticateToken(token);

    req.user = user;
    attachUserContext(req, user);

    if (decoded.isImpersonating) {
      req.isImpersonating = true;
      req.originalAdmin = {
        id: decoded.originalAdminId,
        name: decoded.originalAdminName,
        email: decoded.originalAdminEmail,
        role: decoded.originalAdminRole,
      };
    }

    next();
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const optionalProtect = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) return next();

  try {
    const { user, decoded } = await authenticateToken(token);
    req.user = user;
    req.decoded = decoded;
    attachUserContext(req, user);
  } catch {
    // silently ignore and proceed without req.user
  }
  next();
};

module.exports = { protect, optionalProtect, authenticateToken, AuthError, extractBearerToken };
