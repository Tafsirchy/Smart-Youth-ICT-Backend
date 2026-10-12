const express = require('express');
const { getInvoices, createInvoice, updateInvoice } = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);

router.get('/',  requireAccess(PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_MANAGE, PERMISSIONS.PAYMENTS_VIEW), getInvoices);
router.post('/', requireAccess(PERMISSIONS.INVOICES_MANAGE), createInvoice);
router.patch('/:id', requireAccess(PERMISSIONS.INVOICES_MANAGE), updateInvoice);

module.exports = router;
