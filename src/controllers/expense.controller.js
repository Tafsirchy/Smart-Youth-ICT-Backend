const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const { resolveBranchScope, isBranchAuthorized } = require('../utils/branchHelper');
const { escapeRegex } = require('../utils/regex');

/**
 * Fields a client may write through the generic update route.
 *
 * `status`, `actionBy`, `actionDate` and `actionNote` are deliberately absent:
 * they belong to the approval workflow (`PATCH /:id/approval`), which sets
 * them from the acting manager's identity. `branchId` is absent because it
 * would move the ledger entry to another tenant.
 */
const WRITABLE_EXPENSE_FIELDS = [
  'title',
  'category',
  'amount',
  'expenseDate',
  'voucherUrl',
  'description',
];

exports.getBranchExpenses = async (req, res, next) => {
  try {
    const rawBranch = req.query.branchId || req.user.branchId;
    const scope = await resolveBranchScope(req, rawBranch);

    if (scope.denied) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission for this branch.' });
    }

    const resolvedBranchId = scope.isAll ? null : scope.branchId;

    const filter = {};
    if (!scope.isAll) {
      if (!resolvedBranchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = resolvedBranchId;
    }

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      const q = String(req.query.search).trim();
      const escapedQ = escapeRegex(q);
      filter.$or = [
        { title: { $regex: escapedQ, $options: 'i' } },
        { description: { $regex: escapedQ, $options: 'i' } },
        { actionNote: { $regex: escapedQ, $options: 'i' } }
      ];
    }
    if (req.query.startDate || req.query.endDate) {
      filter.expenseDate = {};
      if (req.query.startDate) filter.expenseDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.expenseDate.$lte = new Date(req.query.endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('submittedBy', 'name email avatar phone role')
      .populate('actionBy', 'name email avatar role')
      .populate('branchId', 'name code slug')
      .sort('-expenseDate -createdAt');

    // Financial Analytics Aggregation
    const statsFilter = resolvedBranchId ? { branchId: resolvedBranchId } : {};
    const allBranchExpenses = await Expense.find(statsFilter);

    let totalApprovedExpense = 0;
    let totalPendingExpense = 0;
    let totalRejectedExpense = 0;
    const categoryBreakdown = {
      rent: 0,
      utility: 0,
      internet: 0,
      entertainment: 0,
      stationery: 0,
      maintenance: 0,
      other: 0
    };

    allBranchExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      if (exp.status === 'approved') {
        totalApprovedExpense += amt;
        if (categoryBreakdown[exp.category] !== undefined) {
          categoryBreakdown[exp.category] += amt;
        }
      } else if (exp.status === 'pending') {
        totalPendingExpense += amt;
      } else if (exp.status === 'rejected') {
        totalRejectedExpense += amt;
      }
    });

    // Calculate Branch Collected Revenue for P&L
    const paymentFilter = { status: 'completed' };
    if (resolvedBranchId) paymentFilter.branchId = resolvedBranchId;
    
    const branchPayments = await Payment.find(paymentFilter).select('amount');
    const totalRevenue = branchPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const netMargin = totalRevenue - totalApprovedExpense;

    res.json({
      success: true,
      count: expenses.length,
      data: expenses,
      analytics: {
        totalRevenue,
        totalApprovedExpense,
        totalPendingExpense,
        totalRejectedExpense,
        netMargin,
        isProfitable: netMargin >= 0,
        categoryBreakdown,
        totalEntries: allBranchExpenses.length
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const rawBranch = req.body.branchId || req.user.branchId;
    const scope = await resolveBranchScope(req, rawBranch);

    if (scope.denied) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission for this branch.' });
    }
    if (!scope.branchId) {
      return res.status(400).json({ success: false, message: 'Valid Branch ID required' });
    }

    const { title, category, amount, expenseDate, voucherUrl, description } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    const expense = await Expense.create({
      branchId: scope.branchId,
      title,
      category: category || 'other',
      amount: Number(amount),
      expenseDate: expenseDate || new Date(),
      voucherUrl,
      description,
      submittedBy: req.user._id,
      status: 'pending'
    });

    const populated = await Expense.findById(expense._id)
      .populate('submittedBy', 'name email avatar phone role')
      .populate('branchId', 'name code slug');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense record not found' });

    // Isolation — a user may only touch expenses in a branch they belong to.
    if (!isBranchAuthorized(req, expense.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    if (expense.status === 'approved' && !isSuper) {
      return res.status(400).json({ success: false, message: 'Cannot edit an already approved expense' });
    }

    // Only the business fields are writable here. The approval fields
    // (status, actionBy, actionDate, actionNote) belong to the dedicated
    // approval endpoint, and `branchId` would move the ledger entry to
    // another tenant.
    const updates = { ...req.body };
    for (const key of Object.keys(updates)) {
      if (!WRITABLE_EXPENSE_FIELDS.includes(key)) {
        delete updates[key];
      }
    }
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
    }

    const updated = await Expense.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('submittedBy', 'name email avatar phone role')
      .populate('actionBy', 'name email avatar role')
      .populate('branchId', 'name code slug');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.processExpenseApproval = async (req, res, next) => {
  try {
    const { status, actionNote } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    let expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense record not found' });

    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    const isManager = req.user.role === 'admin' || req.user.role === 'branch_admin' || req.user.role === 'branch_management';

    if (!isSuper && (!isManager || !isBranchAuthorized(req, expense.branchId))) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch management permissions' });
    }

    // Note on separation of duties: the approval route is already gated to
    // manager roles (see `expense.routes.js`), so a staff member cannot reach
    // it. Branch managers are allowed to review their own submissions — that
    // is the operating model for a single-office campus. If the business
    // later requires a four-eyes rule, add it here.

    expense.status = status;
    expense.actionBy = req.user._id;
    expense.actionNote = actionNote || '';
    expense.actionDate = new Date();
    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('submittedBy', 'name email avatar phone role')
      .populate('actionBy', 'name email avatar role')
      .populate('branchId', 'name code slug');

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense record not found' });

    // Isolation
    if (!isBranchAuthorized(req, expense.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
};
