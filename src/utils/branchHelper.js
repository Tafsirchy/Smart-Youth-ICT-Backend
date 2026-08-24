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
  getAllowedBranches
};
