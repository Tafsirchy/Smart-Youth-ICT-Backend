const Requisition = require('../models/Requisition');
const Branch = require('../models/Branch');
const { resolveBranchId } = require('../utils/branchHelper');

// @desc    Get requisitions list (Branch scoped for manager, global for super admin)
// @route   GET /api/requisitions
// @access  Private (branch_admin, branch_management, super_admin, super_management, employee)
exports.getRequisitions = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const branchId = resolveBranchId(req, req.query.branchId);

    const filter = {};
    if (!isSuper) {
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'Branch context required' });
      }
      filter.branchId = branchId;
    } else if (req.query.branchId && req.query.branchId !== 'all') {
      filter.branchId = req.query.branchId;
    }

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.urgency && req.query.urgency !== 'all') {
      filter.urgency = req.query.urgency;
    }

    const requisitions = await Requisition.find(filter)
      .populate('branchId', 'name code city address')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email')
      .populate('receivedBy', 'name email')
      .sort('-createdAt')
      .lean();

    const pendingCount = requisitions.filter(r => ['pending', 'under_review'].includes(r.status)).length;
    const approvedCount = requisitions.filter(r => r.status === 'approved').length;
    const inTransitCount = requisitions.filter(r => r.status === 'dispatched').length;
    const receivedCount = requisitions.filter(r => r.status === 'received').length;

    res.json({
      success: true,
      count: requisitions.length,
      metrics: {
        total: requisitions.length,
        pendingCount,
        approvedCount,
        inTransitCount,
        receivedCount
      },
      data: requisitions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new requisition ticket
// @route   POST /api/requisitions
// @access  Private (branch_admin, branch_management, super_admin)
exports.createRequisition = async (req, res, next) => {
  try {
    const { title, items, urgency, purpose, branchId: requestedBranchId } = req.body;

    if (!title || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Requisition title and at least one item are required'
      });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const targetBranchId = resolveBranchId(req, requestedBranchId);

    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch context required' });
    }

    const branch = await Branch.findById(targetBranchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const branchCode = (branch.code || 'HQ').toUpperCase();
    const count = await Requisition.countDocuments({ branchId: targetBranchId });
    const year = new Date().getFullYear();
    const requisitionNumber = `REQ-${year}-${branchCode}-${String(count + 1).padStart(4, '0')}`;

    const requisition = await Requisition.create({
      requisitionNumber,
      branchId: targetBranchId,
      requestedBy: req.user._id,
      title: title.trim(),
      items: items.map(item => ({
        itemName: item.itemName.trim(),
        category: item.category || 'stationery',
        quantity: Math.max(1, Number(item.quantity) || 1),
        unit: item.unit || 'pcs',
        notes: item.notes?.trim() || ''
      })),
      urgency: urgency || 'normal',
      purpose: purpose?.trim() || '',
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          updatedBy: req.user._id,
          note: 'Requisition ticket submitted to Central HQ'
        }
      ]
    });

    const populated = await Requisition.findById(requisition._id)
      .populate('branchId', 'name code city')
      .populate('requestedBy', 'name email');

    res.status(201).json({
      success: true,
      data: populated,
      message: `Requisition ${requisitionNumber} submitted successfully to Central HQ.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Super Admin review & update requisition status (approve, dispatch, reject)
// @route   PATCH /api/requisitions/:id/status
// @access  Private (super_admin, super_management)
exports.updateRequisitionStatus = async (req, res, next) => {
  try {
    const { status, hqNotes, courierProvider, trackingNumber, receiptSlipUrl } = req.body;

    const requisition = await Requisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    const validStatuses = ['under_review', 'approved', 'dispatched', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    requisition.status = status;
    requisition.reviewedBy = req.user._id;
    requisition.reviewedAt = new Date();

    if (hqNotes) requisition.hqNotes = hqNotes.trim();

    if (status === 'dispatched') {
      requisition.courierInfo = {
        provider: courierProvider || 'Sundarban Courier Service',
        trackingNumber: trackingNumber || 'N/A',
        dispatchedDate: new Date(),
        receiptSlipUrl: receiptSlipUrl || ''
      };
    }

    requisition.statusHistory.push({
      status,
      updatedBy: req.user._id,
      note: hqNotes || `Status updated to ${status} by HQ`
    });

    await requisition.save();

    const updated = await Requisition.findById(requisition._id)
      .populate('branchId', 'name code city')
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email');

    res.json({
      success: true,
      data: updated,
      message: `Requisition status updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Branch Manager marks parcel as received
// @route   PATCH /api/requisitions/:id/receive
// @access  Private (branch_admin, branch_management, super_admin)
exports.markRequisitionReceived = async (req, res, next) => {
  try {
    const { receivingNotes } = req.body;

    const requisition = await Requisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    if (!isSuper && requisition.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Belongs to another branch' });
    }

    if (requisition.status !== 'dispatched' && !isSuper) {
      return res.status(400).json({
        success: false,
        message: 'Only dispatched parcels can be marked as received'
      });
    }

    requisition.status = 'received';
    requisition.receivedAt = new Date();
    requisition.receivedBy = req.user._id;
    if (receivingNotes) requisition.receivingNotes = receivingNotes.trim();

    requisition.statusHistory.push({
      status: 'received',
      updatedBy: req.user._id,
      note: receivingNotes || 'Parcel safely received and verified at campus'
    });

    await requisition.save();

    const updated = await Requisition.findById(requisition._id)
      .populate('branchId', 'name code city')
      .populate('requestedBy', 'name email')
      .populate('receivedBy', 'name email');

    res.json({
      success: true,
      data: updated,
      message: 'Stock requisition marked as successfully received!'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete requisition ticket (Only if pending)
// @route   DELETE /api/requisitions/:id
// @access  Private (branch_admin, super_admin)
exports.deleteRequisition = async (req, res, next) => {
  try {
    const requisition = await Requisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    if (!isSuper && requisition.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Belongs to another branch' });
    }

    if (!isSuper && requisition.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete requisition that is already under review or processed'
      });
    }

    await Requisition.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Requisition ticket deleted successfully' });
  } catch (err) {
    next(err);
  }
};
