const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");
const userCache = require("../utils/userCache");

const protect = async (req, res, next) => {
  let token;
  const auth = req.headers.authorization;

  if (auth && auth.startsWith("Bearer ")) {
    token = auth.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorised — no token" });
  }

  try {
    const decoded = verifyToken(token);

    // 1. Check Cache
    let user = userCache.get(decoded.id);

    // 2. Fetch from DB if miss
    if (!user) {
      user = await User.findById(decoded.id)
        .select("-password -resetToken -resetExpiry -googleId")
        .lean();
      if (!user) return res.status(401).json({ message: "User not found" });
      
      // Store in cache
      userCache.set(decoded.id, user);
    }

    req.user = user;

    if (!req.user.isActive)
      return res.status(403).json({ message: "This account is disabled" });

    if ((req.user.tokenVersion || 0) !== (decoded.ver || 0)) {
      return res
        .status(401)
        .json({ message: "Session expired. Please sign in again." });
    }

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { protect };
