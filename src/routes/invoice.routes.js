const express = require('express');
const { getInvoices, createInvoice, updateInvoice } = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/',  getInvoices);
router.post('/', authorize('admin', 'branch_admin', 'super_admin'), createInvoice);
router.patch('/:id', authorize('admin', 'branch_admin', 'super_admin'), updateInvoice);

module.exports = router;
