const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { 
  getMyAffiliate, 
  trackClick, 
  requestWithdrawal, 
  updateReferralCode,
  getBranchAffiliates,
  processWithdrawalStatus
} = require('../controllers/affiliate.controller');

const router = express.Router();

router.get('/track/:code', trackClick); // Public — track referral clicks

router.use(protect);
router.get('/me', getMyAffiliate);
router.post('/withdraw', requestWithdrawal);
router.put('/code', updateReferralCode);

// Admin Routes
const managerRoles = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'];
router.get('/admin', authorize(...managerRoles), getBranchAffiliates);
router.patch('/admin/withdrawals/:affiliateId/:withdrawalId', authorize(...managerRoles), processWithdrawalStatus);

module.exports = router;
