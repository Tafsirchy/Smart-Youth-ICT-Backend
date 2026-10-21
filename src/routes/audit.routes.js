const express = require('express');
const {
  getBranchComprehensiveAuditReport,
  sendBranchAuditAlert,
  autoEnforceDirectives,
} = require('../controllers/audit.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);
router.use(authorize('super_admin', 'super_management'));

// Comprehensive 360° Branch Audit Report (Daily / Weekly / Monthly / Custom)
router.get('/branch-report', getBranchComprehensiveAuditReport);

// Direct Executive Intervention: Send audit warning or directive to branch
router.post('/send-branch-alert', sendBranchAuditAlert);

// Automated Executive Directive Auto-Enforcement
router.post('/auto-enforce', autoEnforceDirectives);

module.exports = router;
