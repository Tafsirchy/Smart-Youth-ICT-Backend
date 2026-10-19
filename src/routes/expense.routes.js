const express = require('express');
const {
  getBranchExpenses,
  createExpense,
  updateExpense,
  processExpenseApproval,
  deleteExpense
} = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

const staffAndManagers = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management', 'staff', 'employee', 'instructor'];
const managersOnly = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'];

router.get('/', authorize(...staffAndManagers), getBranchExpenses);
router.post('/', authorize(...staffAndManagers), createExpense);
router.put('/:id', authorize(...staffAndManagers), updateExpense);
router.patch('/:id/approval', authorize(...managersOnly), processExpenseApproval);
router.delete('/:id', authorize(...managersOnly), deleteExpense);

module.exports = router;
