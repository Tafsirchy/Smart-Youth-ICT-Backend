const express = require('express');
const { getBranchStats, getPublicBranches } = require('../controllers/branch.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize, authorizeBranch } = require('../middleware/role.middleware');

const router = express.Router({ mergeParams: true });

// Public Listing
router.get('/public/list', getPublicBranches);

router.use(protect);
router.use(authorize('super_admin', 'super_management', 'branch_admin', 'branch_management'));
router.use(authorizeBranch);

router.get('/stats', getBranchStats);

module.exports = router;
