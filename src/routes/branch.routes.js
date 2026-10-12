const express = require('express');
const { 
  getBranchStats, 
  getPublicBranches, 
  getPublicBranchesDetailed,
  getPublicBranchBySlug,
  createBranchInquiry
} = require('../controllers/branch.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');

const router = express.Router({ mergeParams: true });

// Public Listing & Inquiry
router.get('/public/list', getPublicBranches);
router.get('/public/all', getPublicBranchesDetailed);
router.get('/public/:slugOrId', getPublicBranchBySlug);
router.post('/public/:branchId/inquiry', createBranchInquiry);

router.use(protect);
router.use(requireAccess());

router.get('/stats', getBranchStats);

module.exports = router;
