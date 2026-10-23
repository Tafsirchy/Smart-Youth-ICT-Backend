const Requisition = require('../models/Requisition');
const Branch = require('../models/Branch');
const { resolveBranchId } = require('../utils/branchHelper');
const { escapeRegex } = require('../utils/regex');
const notificationService = require('../services/notification.service');

// Allowed forward transitions for HQ-managed status updates
const ALLOWED_TRANSITIONS = {
  pending: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['dispatched', 'rejected'],
  dispatched: ['rejected'],
  received: [],
  rejected: []
};

// @desc    Get requisitions list (Branch scoped for manager, global for super admin)
// @route   GET /api/requisitions
// @access  Private (branch_admin, branch_management, super_admin, super_management, employee)
exports.getRequisitions = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const rawBranch = req.query.branchId;
    const branchId = resolveBranchId(req, rawBranch);

    const filter = {};
    if (!isSuper) {
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'Branch context required' });
      }
      filter.branchId = branchId;
    } else if (rawBranch && rawBranch !== 'all') {
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'Invalid branchId' });
      }
      filter.branchId = branchId;
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

    const targetBranchId = resolveBranchId(req, requestedBranchId);

    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch context required' });
    }

    const branch = await Branch.findById(targetBranchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const branchCode = (branch.code || 'HQ').toUpperCase();
    const year = new Date().getFullYear();

    const buildNumber = (seq) => `REQ-${year}-${branchCode}-${String(seq).padStart(4, '0')}`;

    // Base sequence from an existing count; unique index + retry resolves concurrent races
    const baseCount = await Requisition.countDocuments({ branchId: targetBranchId });

    let requisition = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        requisition = await Requisition.create({
          requisitionNumber: buildNumber(baseCount + 1 + attempt),
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
        break;
      } catch (err) {
        // Retry only on duplicate-key collisions
        if (err && err.code === 11000) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }

    if (!requisition) {
      return next(lastErr || new Error('Failed to generate a unique requisition number'));
    }

    const requisitionNumber = requisition.requisitionNumber;

    const populated = await Requisition.findById(requisition._id)
      .populate('branchId', 'name code city')
      .populate('requestedBy', 'name email');

    // 🔔 Notify Super Admin HQ on New Requisition
    try {
      notificationService.notifySuperAdmins({
        title: 'New Branch Requisition Submitted',
        message: `${populated.branchId?.name || 'Branch'} requested: "${title}" (${items.length} items).`,
        category: 'administrative',
        priority: urgency === 'urgent' ? 'urgent' : 'normal',
        type: urgency === 'urgent' ? 'warning' : 'info',
        link: '/super/requisitions',
        actor: req.user._id,
        metadata: {
          requisitionId: requisition._id,
          requisitionNumber,
          branchId: targetBranchId,
          branchName: populated.branchId?.name,
          actorName: req.user.name
        }
      }).catch(err => console.error('[Notification createRequisition failed]', err.message));
    } catch (e) {
      // The requisition is stored; a failed notification only means Central HQ
      // was not told about it yet.
      req.log?.error('requisition created notification failed', {
        requisitionId: requisition._id,
        err: e,
      });
    }

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

    const allowed = ALLOWED_TRANSITIONS[requisition.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move requisition from "${requisition.status}" to "${status}"`
      });
    }

    requisition.status = status;
    requisition.reviewedBy = req.user._id;
    requisition.reviewedAt = new Date();

    if (hqNotes) requisition.hqNotes = hqNotes.trim();

    // 📦 Central Warehouse Stock Auto-Deduction Engine
    if (['approved', 'dispatched'].includes(status) && !requisition.stockDeducted) {
      const WarehouseItem = require('../models/WarehouseItem');
      // 1. Verify stock sufficiency for all items first
      for (const item of requisition.items) {
        let stockItem = null;
        if (item.warehouseItemId) {
          stockItem = await WarehouseItem.findById(item.warehouseItemId);
        } else {
          const escapedName = escapeRegex(item.itemName.trim());
          stockItem = await WarehouseItem.findOne({
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
          });
        }

        if (stockItem) {
          if (stockItem.stockQuantity < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient Central Warehouse stock for "${stockItem.name}". Requested: ${item.quantity}, Available: ${stockItem.stockQuantity}`,
            });
          }
        }
      }

      // 2. Perform deduction and link warehouseItemId if matched
      for (const item of requisition.items) {
        let stockItem = null;
        if (item.warehouseItemId) {
          stockItem = await WarehouseItem.findById(item.warehouseItemId);
        } else {
          const escapedName = escapeRegex(item.itemName.trim());
          stockItem = await WarehouseItem.findOne({
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
          });
        }

        if (stockItem) {
          stockItem.stockQuantity -= item.quantity;
          await stockItem.save();
          item.warehouseItemId = stockItem._id;
        }
      }

      requisition.stockDeducted = true;
    }

    if (status === 'dispatched') {
      requisition.courierInfo = {
        provider: courierProvider || 'Sundarban Courier Service',
        trackingNumber: trackingNumber || 'N/A',
        dispatchedDate: new Date(),
        receiptSlipUrl: receiptSlipUrl || '',
        deliveryStatus: 'in_transit'
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

    // 🔔 Notify Requesting Staff / Branch Admin on Status Update
    try {
      if (requisition.requestedBy) {
        notificationService.notifyUser(requisition.requestedBy, {
          title: `Requisition ${status.toUpperCase().replace('_', ' ')}`,
          message: `Your requisition #${requisition.requisitionNumber} ("${requisition.title}") has been ${status}.${trackingNumber ? ' Tracking: ' + trackingNumber : ''}`,
          category: 'administrative',
          priority: 'high',
          type: status === 'rejected' ? 'error' : 'success',
          link: '/admin/requisitions',
          actor: req.user._id,
          metadata: {
            requisitionId: requisition._id,
            requisitionNumber: requisition.requisitionNumber,
            branchId: requisition.branchId
          }
        }).catch(err => console.error('[Notification updateRequisitionStatus failed]', err.message));
      }
    } catch (e) {
      // The status change is stored; the requester may not have been told.
      req.log?.error('requisition status notification failed', {
        requisitionId: updated._id,
        status,
        err: e,
      });
    }

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

    // 🔔 Notify Super Admin HQ that parcel reached campus
    try {
      notificationService.notifySuperAdmins({
        title: 'Parcel Received at Branch Campus',
        message: `Consignment for requisition #${requisition.requisitionNumber} ("${requisition.title}") was safely received at destination campus.`,
        category: 'administrative',
        priority: 'normal',
        type: 'success',
        link: '/super/requisitions',
        actor: req.user._id,
        metadata: {
          requisitionId: requisition._id,
          requisitionNumber: requisition.requisitionNumber,
          branchId: requisition.branchId
        }
      }).catch(err => console.error('[Notification markRequisitionReceived failed]', err.message));
    } catch (e) {
      // The receipt is stored; Central HQ may not have been told.
      req.log?.error('requisition received notification failed', {
        requisitionId: updated._id,
        err: e,
      });
    }

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

const WarehouseItem = require('../models/WarehouseItem');

// @desc    Get Central Warehouse inventory with KPI metrics (Super Admin)
// @route   GET /api/requisitions/warehouse/items
// @access  Private (super_admin, super_management)
exports.getWarehouseInventory = async (req, res, next) => {
  try {
    let items = await WarehouseItem.find().sort('name').lean();

    // Auto-seed default warehouse items if database table is initially empty
    if (items.length === 0) {
      const defaultItems = [
        {
          name: 'Smart Python & AI Course Book (Vol 1)',
          sku: 'BK-PY-01',
          category: 'books',
          stockQuantity: 250,
          minStockAlert: 30,
          unitCost: 450,
          unit: 'pcs',
          location: 'HQ Warehouse Shelf A-1',
          description: 'Official printed course textbook for Python & Machine Learning.',
        },
        {
          name: 'SYICT Official Student T-Shirt (Navy Blue)',
          sku: 'TS-NV-01',
          category: 'merchandise',
          stockQuantity: 320,
          minStockAlert: 50,
          unitCost: 350,
          unit: 'pcs',
          location: 'HQ Warehouse Rack B-2',
          description: '100% Cotton combed student welcome package apparel.',
        },
        {
          name: 'Digital Student ID Card & Lanyard Set',
          sku: 'ID-LN-01',
          category: 'id_card',
          stockQuantity: 500,
          minStockAlert: 100,
          unitCost: 120,
          unit: 'sets',
          location: 'HQ Warehouse Cabinet C-1',
          description: 'RFID-embedded physical ID card and branded lanyard.',
        },
        {
          name: 'Full Stack Web Development Lab Kit',
          sku: 'KT-WD-01',
          category: 'kits',
          stockQuantity: 140,
          minStockAlert: 25,
          unitCost: 850,
          unit: 'kits',
          location: 'HQ Warehouse Shelf D-3',
          description: 'Physical cheat sheets, notebook, and USB recovery resources.',
        },
      ];
      await WarehouseItem.insertMany(defaultItems);
      items = await WarehouseItem.find().sort('name').lean();
    }

    const totalItems = items.length;
    const lowStockCount = items.filter(i => i.stockQuantity <= i.minStockAlert).length;
    const totalStockUnits = items.reduce((sum, i) => sum + (i.stockQuantity || 0), 0);
    const totalValuation = items.reduce((sum, i) => sum + ((i.stockQuantity || 0) * (i.unitCost || 0)), 0);

    res.json({
      success: true,
      metrics: {
        totalItems,
        lowStockCount,
        totalStockUnits,
        totalValuation,
      },
      data: items,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new Central Warehouse Item
// @route   POST /api/requisitions/warehouse/items
// @access  Private (super_admin, super_management)
exports.createWarehouseItem = async (req, res, next) => {
  try {
    const { name, sku, category, stockQuantity, minStockAlert, unitCost, unit, location, description } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ success: false, message: 'Item name and unique SKU are required' });
    }

    let item;
    try {
      item = await WarehouseItem.create({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category || 'stationery',
        stockQuantity: Number(stockQuantity) || 0,
        minStockAlert: Number(minStockAlert) || 20,
        unitCost: Number(unitCost) || 0,
        unit: unit || 'pcs',
        location: location || 'Central HQ Warehouse',
        description: description || '',
      });
    } catch (createErr) {
      if (createErr && createErr.code === 11000) {
        return res.status(409).json({ success: false, message: 'A warehouse item with this SKU already exists' });
      }
      throw createErr;
    }

    res.status(201).json({
      success: true,
      data: item,
      message: `Warehouse item "${item.name}" registered successfully`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update or restock warehouse item
// @route   PUT|PATCH /api/requisitions/warehouse/items/:id
// @access  Private (super_admin, super_management)
exports.updateWarehouseItem = async (req, res, next) => {
  try {
    // Whitelist mutable fields to prevent mass-assignment (e.g. _id / createdAt tampering).
    const MUTABLE_FIELDS = [
      'name',
      'sku',
      'category',
      'stockQuantity',
      'minStockAlert',
      'unitCost',
      'unit',
      'location',
      'description',
      'isActive',
    ];

    const update = {};
    MUTABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, message: 'No valid warehouse fields supplied for update' });
    }

    if (update.sku !== undefined) {
      update.sku = String(update.sku).trim().toUpperCase();
    }
    if (update.stockQuantity !== undefined) {
      update.stockQuantity = Number(update.stockQuantity);
      if (Number.isNaN(update.stockQuantity) || update.stockQuantity < 0) {
        return res.status(400).json({ success: false, message: 'stockQuantity must be a non-negative number' });
      }
    }
    if (update.minStockAlert !== undefined) {
      update.minStockAlert = Number(update.minStockAlert);
      if (Number.isNaN(update.minStockAlert) || update.minStockAlert < 0) {
        return res.status(400).json({ success: false, message: 'minStockAlert must be a non-negative number' });
      }
    }
    if (update.unitCost !== undefined) {
      update.unitCost = Number(update.unitCost);
      if (Number.isNaN(update.unitCost) || update.unitCost < 0) {
        return res.status(400).json({ success: false, message: 'unitCost must be a non-negative number' });
      }
    }

    let item;
    try {
      item = await WarehouseItem.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (updateErr) {
      if (updateErr && updateErr.code === 11000) {
        return res.status(409).json({ success: false, message: 'A warehouse item with this SKU already exists' });
      }
      throw updateErr;
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Warehouse item not found' });
    }

    res.json({
      success: true,
      data: item,
      message: `Warehouse item "${item.name}" updated successfully`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Courier Delivery Webhook Receiver (Steadfast / Pathao / RedX / Generic)
// @route   POST /api/webhooks/courier
// @access  Public (Webhook)
exports.courierWebhook = async (req, res, next) => {
  try {
    const configuredSecret = process.env.COURIER_WEBHOOK_SECRET;
    if (configuredSecret) {
      const incomingToken =
        req.headers['x-courier-token'] ||
        req.headers['x-webhook-secret'] ||
        req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
        req.query.token;

      if (!incomingToken || incomingToken !== configuredSecret) {
        return res.status(401).json({ success: false, message: 'Invalid or missing courier webhook authorization' });
      }
    }

    const { trackingNumber, consignment_id, status, provider = 'Steadfast Courier' } = req.body;
    const trackId = trackingNumber || consignment_id;

    if (!trackId) {
      return res.status(400).json({ success: false, message: 'trackingNumber or consignment_id required' });
    }

    const requisition = await Requisition.findOne({
      $or: [
        { 'courierInfo.trackingNumber': trackId },
        { requisitionNumber: trackId }
      ]
    });

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'No requisition matching courier tracking number' });
    }

    const normalizedStatus = String(status).toLowerCase();
    requisition.courierInfo.courierPayload = req.body;

    if (['delivered', 'success', 'received'].includes(normalizedStatus)) {
      requisition.status = 'received';
      requisition.receivedAt = new Date();
      requisition.courierInfo.deliveryStatus = 'delivered';
      requisition.receivingNotes = `Auto-marked received via ${provider} delivery webhook API.`;
      requisition.statusHistory.push({
        status: 'received',
        note: `Courier confirmed parcel delivery: Consignment ${trackId}`
      });
      await requisition.save();
    } else if (['in_transit', 'picked_up', 'dispatched'].includes(normalizedStatus)) {
      requisition.courierInfo.deliveryStatus = 'in_transit';
      await requisition.save();
    }

    res.status(200).json({
      success: true,
      message: `Webhook processed. Requisition ${requisition.requisitionNumber} is now ${requisition.status}.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Simulate courier delivery for testing (Super Admin)
// @route   POST /api/requisitions/:id/simulate-delivery
// @access  Private (super_admin, super_management)
exports.simulateCourierWebhook = async (req, res, next) => {
  try {
    const requisition = await Requisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    requisition.status = 'received';
    requisition.receivedAt = new Date();
    requisition.receivedBy = req.user._id;
    requisition.courierInfo.deliveryStatus = 'delivered';
    requisition.receivingNotes = `Simulated automated courier webhook delivery confirmed by ${req.user.name}.`;
    requisition.statusHistory.push({
      status: 'received',
      updatedBy: req.user._id,
      note: 'Simulated Courier Webhook: Consignment delivered to destination campus.'
    });

    await requisition.save();

    const updated = await Requisition.findById(requisition._id)
      .populate('branchId', 'name code city')
      .populate('requestedBy', 'name email');

    res.json({
      success: true,
      data: updated,
      message: `Requisition ${requisition.requisitionNumber} marked received via simulated courier webhook.`,
    });
  } catch (err) {
    next(err);
  }
};

