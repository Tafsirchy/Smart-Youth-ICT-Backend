const express = require('express');
const { getBranchStats } = require('../controllers/branch.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize, authorizeBranch } = require('../middleware/role.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect);
router.use(authorize('super_admin', 'branch_admin', 'branch_management'));
router.use(authorizeBranch);

router.get('/stats', getBranchStats);

module.exports = router;
