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
const { protect }   = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All CRM routes — Admin & Super Admin
router.use(protect, authorize('super_admin', 'super_management', 'branch_admin', 'admin'));

router.get('/stats',     getCRMStats);
router.get('/',          getLeads);
router.get('/:id',       getLeadById);
router.post('/',         createLead);
router.put('/:id',       updateLead);
router.patch('/:id/note', addNote);
router.delete('/:id',    deleteLead);

module.exports = router;
