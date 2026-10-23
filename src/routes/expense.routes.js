const express = require('express');
const {
  getBranchExpenses,
  createExpense,
  updateExpense,
  processExpenseApproval,
  deleteExpense
} = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);

// The expense ledger is a branch-management resource. `staff:manage` is
// accepted alongside the granular permissions because it is what the
// dashboard navigation already gates these screens on.
const canViewExpenses = requireAccess(PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.STAFF_MANAGE);
const canManageExpenses = requireAccess(PERMISSIONS.EXPENSES_MANAGE, PERMISSIONS.STAFF_MANAGE);
const managersOnly = requireAccess(PERMISSIONS.EXPENSES_MANAGE, PERMISSIONS.STAFF_MANAGE);

router.get('/', canViewExpenses, getBranchExpenses);
router.post('/', canManageExpenses, createExpense);
router.put('/:id', canManageExpenses, updateExpense);
router.patch('/:id/approval', managersOnly, processExpenseApproval);
router.delete('/:id', managersOnly, deleteExpense);

module.exports = router;
