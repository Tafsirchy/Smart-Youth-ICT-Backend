const express = require('express');
const { getInvoices, createInvoice, updateInvoice } = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/',  getInvoices);
router.post('/', authorize('super_admin', 'super_management', 'admin', 'branch_admin'), createInvoice);
router.patch('/:id', authorize('super_admin', 'super_management', 'admin', 'branch_admin'), updateInvoice);

module.exports = router;
