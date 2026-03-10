const jwt = require('jsonwebtoken');

const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

module.exports = { generateToken, verifyToken };
