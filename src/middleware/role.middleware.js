const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: `Role '${req.user?.role}' is not authorised` });
  }
  next();
};

const authorizeBranch = (req, res, next) => {
  if (req.user?.role === "super_admin" || req.user?.role === "super_management") return next();
  
  const targetBranch = req.params.branchId || req.body.branchId || req.query.branchId;
  if (!targetBranch) {
    return res.status(400).json({ message: "Branch ID is required for this action." });
  }
  
  if (req.user?.branchId?.toString() !== targetBranch.toString()) {
    return res.status(403).json({ message: "Access denied: You do not have permission for this branch." });
  }
  
  next();
};

module.exports = { authorize, authorizeBranch };
