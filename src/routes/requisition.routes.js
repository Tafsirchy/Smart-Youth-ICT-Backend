const express = require('express');
const router = express.Router();
const {
  getRequisitions,
  createRequisition,
  updateRequisitionStatus,
  markRequisitionReceived,
  deleteRequisition,
} = require('../controllers/requisition.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

const staffAndManagers = ['branch_admin', 'branch_management', 'super_admin', 'super_management', 'employee'];
const managersOnly = ['branch_admin', 'branch_management', 'super_admin', 'super_management'];
const superOnly = ['super_admin', 'super_management'];

router.get('/', authorize(...staffAndManagers), getRequisitions);
router.post('/', authorize(...managersOnly), createRequisition);
router.patch('/:id/status', authorize(...superOnly), updateRequisitionStatus);
router.patch('/:id/receive', authorize(...managersOnly), markRequisitionReceived);
router.delete('/:id', authorize(...managersOnly), deleteRequisition);

module.exports = router;
