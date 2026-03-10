const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { getMyAffiliate, trackClick, requestWithdrawal } = require('../controllers/affiliate.controller');

const router = express.Router();

router.get('/track/:code', trackClick);       // Public — track referral clicks

router.use(protect);
router.get('/me', getMyAffiliate);
router.post('/withdraw', requestWithdrawal);

module.exports = router;
