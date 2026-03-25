const Invoice = require('../models/Invoice');
const Branch = require('../models/Branch');

// @desc    Get all invoices (branch-aware)
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res, next) => {
  try {
    const branchId = req.user.branchId || req.query.branchId;
    const filter   = {};

    if (req.user.role !== 'super_admin') {
      if (!branchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = branchId;
    }

    const invoices = await Invoice.find(filter)
      .populate('user', 'name email image')
      .populate('course', 'title')
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
    const branchId = req.user.branchId || req.body.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID context missing' });

    // Generate unique invoice number logic
    const count = await Invoice.countDocuments({ branchId });
    const invoiceNo = `INV-${branchId.toString().slice(-4)}-${(count + 1).toString().padStart(5, '0')}`;

    const invoice = await Invoice.create({
      ...req.body,
      branchId,
      invoiceNo
    });

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

        if (req.user.role !== 'super_admin' && invoice.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
        }

        invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: invoice });
    } catch (err) {
        next(err);
    }
};
