const express = require('express');
const router = express.Router();
const {
  getRequisitions,
  createRequisition,
  updateRequisitionStatus,
  markRequisitionReceived,
  deleteRequisition,
  getWarehouseInventory,
  createWarehouseItem,
  updateWarehouseItem,
  courierWebhook,
  simulateCourierWebhook,
} = require('../controllers/requisition.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Public Courier Webhooks (Bypasses JWT authentication for automated delivery servers)
router.post('/webhook/courier', courierWebhook);
router.post('/webhook/courier/steadfast', courierWebhook);
router.post('/webhook/courier/pathao', courierWebhook);

router.use(protect);

const staffAndManagers = ['branch_admin', 'branch_management', 'super_admin', 'super_management', 'employee'];
const managersOnly = ['branch_admin', 'branch_management', 'super_admin', 'super_management'];
const superOnly = ['super_admin', 'super_management'];

// Central Warehouse Stock Management (Super Admin)
router.get('/warehouse/items', authorize(...superOnly), getWarehouseInventory);
router.post('/warehouse/items', authorize(...superOnly), createWarehouseItem);
router.put('/warehouse/items/:id', authorize(...superOnly), updateWarehouseItem);
router.post('/:id/simulate-delivery', authorize(...superOnly), simulateCourierWebhook);

router.get('/', authorize(...staffAndManagers), getRequisitions);
router.post('/', authorize(...managersOnly), createRequisition);
router.patch('/:id/status', authorize(...superOnly), updateRequisitionStatus);
router.patch('/:id/receive', authorize(...managersOnly), markRequisitionReceived);
router.delete('/:id', authorize(...managersOnly), deleteRequisition);

module.exports = router;
