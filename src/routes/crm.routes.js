const express = require('express');
const router  = express.Router();
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  addNote,
  deleteLead,
  getCRMStats,
} = require('../controllers/crm.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');

router.use(protect);

router.get('/stats',     requireAccess(PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_MANAGE), getCRMStats);
router.get('/',          requireAccess(PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_MANAGE), getLeads);
router.get('/:id',       requireAccess(PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_MANAGE), getLeadById);
router.post('/',         requireAccess(PERMISSIONS.LEADS_MANAGE), createLead);
router.put('/:id',       requireAccess(PERMISSIONS.LEADS_MANAGE), updateLead);
router.patch('/:id/note', requireAccess(PERMISSIONS.LEADS_MANAGE), addNote);
router.delete('/:id',    requireAccess(PERMISSIONS.LEADS_DELETE), deleteLead);

module.exports = router;
