const Expense = require('../models/Expense');
const Branch = require('../models/Branch');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

async function resolveBranchId(param) {
  if (!param) return null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    const doc = await Branch.findById(param).select('_id');
    if (doc) return doc._id;
  }
  const bySlugOrCode = await Branch.findOne({
    $or: [{ slug: param.toLowerCase() }, { code: param.toUpperCase() }]
  }).select('_id');
  return bySlugOrCode ? bySlugOrCode._id : null;
}

exports.getBranchExpenses = async (req, res, next) => {
  try {
    const rawBranch = req.query.branchId || req.user.branchId;
    const resolvedBranchId = await resolveBranchId(rawBranch);

    const filter = {};
    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';

    if (!isSuper) {
      if (!resolvedBranchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = resolvedBranchId;
    } else if (resolvedBranchId) {
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
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { actionNote: { $regex: q, $options: 'i' } }
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
    const branchId = await resolveBranchId(rawBranch);
    if (!branchId) return res.status(400).json({ success: false, message: 'Valid Branch ID required' });

    const { title, category, amount, expenseDate, voucherUrl, description } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    const expense = await Expense.create({
      branchId,
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

    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    if (!isSuper && expense.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    if (expense.status === 'approved' && !isSuper) {
      return res.status(400).json({ success: false, message: 'Cannot edit an already approved expense' });
    }

    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true })
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

    if (!isSuper && (!isManager || expense.branchId.toString() !== req.user.branchId?.toString())) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch management permissions' });
    }

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

    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    if (!isSuper && expense.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
};
