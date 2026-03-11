const jwt = require("jsonwebtoken");

const buildPayload = (userOrPayload) => {
  if (userOrPayload?.id || userOrPayload?.ver !== undefined)
    return userOrPayload;

  return {
    id: userOrPayload._id?.toString() || userOrPayload.id,
    ver: userOrPayload.tokenVersion || 0,
  };
};

const generateToken = (
  userOrPayload,
  expiresIn = process.env.JWT_EXPIRES_IN || "7d",
) =>
  jwt.sign(buildPayload(userOrPayload), process.env.JWT_SECRET, { expiresIn });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { generateToken, verifyToken };
