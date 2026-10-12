const { getAllowedBranches } = require("../utils/branchHelper");

/**
 * Require Access Middleware
 * Supports:
 * - Super Admin / Super Management: Global bypass (access all branches & modules)
 * - Branch Admin / Branch Management: Full access to all modules within their own branch
 * - Employee: Dynamic task-based access (requires one of the specified permissions within their branch)
 *
 * @param {...string} requiredPermissions - One or more permission strings (e.g. 'leads:manage', 'leads:view')
 */
const requireAccess = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, permissions = [] } = req.user;

    // 1. Super Admins bypass all role & permission checks
    if (role === "super_admin" || role === "super_management") {
      return next();
    }

    // 2. Resolve target branch if provided in request
    const targetBranch = req.params?.branchId || req.body?.branchId || req.query?.branchId;
    const allowedBranches = getAllowedBranches(req.user);

    if (targetBranch && !allowedBranches.includes(targetBranch.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You do not have permission for this branch."
      });
    }

    // Bind primary branch to req for controllers to safely scope queries
    req.branchId = req.user.branchId;

    // 3. Branch Managers have full CRUD within their branch
    if (role === "branch_admin" || role === "branch_management") {
      return next();
    }

    // 4. Employees require explicit delegated permission
    if (role === "employee") {
      // If no specific permission is required for the route, grant basic access
      if (requiredPermissions.length === 0) {
        return next();
      }

      const hasRequired = requiredPermissions.some(perm => permissions.includes(perm));
      if (!hasRequired) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Missing required permission [${requiredPermissions.join(", ")}]`
        });
      }

      return next();
    }

    // 5. Any other role (e.g. student, instructor)
    return res.status(403).json({
      success: false,
      message: `Access denied: Role '${role}' is not authorized for this resource`
    });
  };
};

/**
 * Controller-level helper to verify that a fetched document's branch matches the user's branch
 * @param {Object} req - Express request object
 * @param {string|ObjectId} docBranchId - The branchId of the document being accessed
 * @returns {boolean} - true if authorized, false otherwise
 */
const isBranchAuthorized = (req, docBranchId) => {
  if (!req.user) return false;
  if (req.user.role === "super_admin" || req.user.role === "super_management") return true;
  if (!docBranchId) return false;

  const allowedBranches = getAllowedBranches(req.user);
  return allowedBranches.includes(docBranchId.toString());
};

module.exports = {
  requireAccess,
  isBranchAuthorized,
};
