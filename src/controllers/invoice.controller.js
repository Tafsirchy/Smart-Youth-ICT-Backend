const Invoice = require('../models/Invoice');
const { isBranchAuthorized } = require('../middleware/rbac.middleware');

// @desc    Get all invoices (branch-aware)
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const filter = {};

    if (isSuper) {
      if (req.query.branchId) filter.branchId = req.query.branchId;
    } else {
      if (!req.user.branchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = req.user.branchId;
    }

    const invoices = await Invoice.find(filter)
      .populate('user', 'name email image avatar')
      .populate('course', 'title price')
      .sort('-createdAt');

    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (err) {
    next(err);
  }
};

// @desc    Create automated invoice (Admin/System)
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const branchId = isSuper ? (req.body.branchId || req.user.branchId) : req.user.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID context missing' });

    // Generate unique invoice number logic
    const count = await Invoice.countDocuments({ branchId });
    const invoiceNo = `INV-${branchId.toString().slice(-4)}-${(count + 1).toString().padStart(5, '0')}`;

    const invoiceData = { ...req.body, branchId, invoiceNo };
    const invoice = await Invoice.create(invoiceData);

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// @desc    Update invoice status (Pay/Cancel)
// @route   PATCH /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res, next) => {
  try {
    let invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (!isBranchAuthorized(req, invoice.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    const updates = { ...req.body };
    delete updates.branchId; // prevent cross-branch mutation

    invoice = await Invoice.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};
