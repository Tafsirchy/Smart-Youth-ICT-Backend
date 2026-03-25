const express = require('express');
const { getGlobalStats, getAllBranchesDetails, deployMasterCourse, getGlobalFinanceReport, onboardBranch } = require('../controllers/super.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);
router.use(authorize('super_admin')); // Strictly for Super Admins

router.get('/stats',    getGlobalStats);
router.get('/branches', getAllBranchesDetails);
router.post('/deploy-course',  deployMasterCourse);
router.get('/finance',         getGlobalFinanceReport);
router.post('/onboard-branch', onboardBranch);

module.exports = router;
