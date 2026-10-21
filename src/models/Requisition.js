const mongoose = require('mongoose');

const RequisitionItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['books', 'kits', 'stationery', 'hardware', 'marketing', 'other'],
    default: 'stationery',
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unit: {
    type: String,
    default: 'pcs', // pcs, boxes, sets, bundles, rolls
  },
  warehouseItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WarehouseItem',
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const RequisitionSchema = new mongoose.Schema(
  {
    requisitionNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    urgency: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'dispatched', 'received', 'rejected'],
      default: 'pending',
      index: true,
    },
    stockDeducted: {
      type: Boolean,
      default: false,
    },
    items: [RequisitionItemSchema],
    purpose: {
      type: String,
      trim: true,
      default: '',
    },
    hqNotes: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    courierInfo: {
      provider: { type: String, trim: true, default: '' }, // e.g. Sundarban Courier, SA Paribahan, Pathao, Steadfast
      trackingNumber: { type: String, trim: true, default: '' },
      dispatchedDate: { type: Date, default: null },
      receiptSlipUrl: { type: String, trim: true, default: '' },
      deliveryStatus: { type: String, default: 'pending' }, // pending, in_transit, delivered, returned
      courierPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    receivingNotes: {
      type: String,
      trim: true,
      default: '',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Requisition', RequisitionSchema);
