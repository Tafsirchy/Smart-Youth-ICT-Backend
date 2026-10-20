const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const SUPER_ROLES = ['super_admin', 'super_management'];

const resolveBranchId = (req, requestedBranchId) => {
  const user = req?.user;
  const isSuper = user && SUPER_ROLES.includes(user.role);
  const requested = requestedBranchId && requestedBranchId !== 'all'
    ? String(requestedBranchId)
    : null;
  const isValidRequested = requested && OBJECT_ID_REGEX.test(requested);

  if (isSuper) {
    return isValidRequested ? requested : null;
  }

  const allowed = getAllowedBranches(user);
  if (isValidRequested && allowed.includes(requested)) {
    return requested;
  }

  return allowed[0] || null;
};

const getAllowedBranches = (user) => {
  if (!user) return [];
  
  const branches = [];
  if (user.branchId) {
    branches.push(user.branchId.toString());
  }
  
  if (user.secondaryBranches && Array.isArray(user.secondaryBranches)) {
    user.secondaryBranches.forEach(branch => {
      if (branch) {
        branches.push(branch.toString());
      }
    });
  }
  
  // Return unique branches
  return [...new Set(branches)];
};

module.exports = {
  getAllowedBranches,
  resolveBranchId
};
