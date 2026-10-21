const jwt = require("jsonwebtoken");

const buildPayload = (userOrPayload) => {
  const impersonationFields = userOrPayload?.isImpersonating
    ? {
        isImpersonating: true,
        originalAdminId: userOrPayload.originalAdminId,
        originalAdminName: userOrPayload.originalAdminName,
        originalAdminEmail: userOrPayload.originalAdminEmail,
        originalAdminRole: userOrPayload.originalAdminRole,
      }
    : {};

  if (
    userOrPayload &&
    userOrPayload.ver !== undefined &&
    userOrPayload._id === undefined &&
    userOrPayload.tokenVersion === undefined
  ) {
    return {
      id: userOrPayload.id,
      ver: userOrPayload.ver,
      ...impersonationFields,
    };
  }

  return {
    id: userOrPayload._id?.toString() || userOrPayload.id,
    ver: userOrPayload.tokenVersion || 0,
    ...impersonationFields,
  };
};

const generateToken = (
  userOrPayload,
  expiresIn = process.env.JWT_EXPIRES_IN || "7d",
) =>
  jwt.sign(buildPayload(userOrPayload), process.env.JWT_SECRET, { expiresIn });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { generateToken, verifyToken };
