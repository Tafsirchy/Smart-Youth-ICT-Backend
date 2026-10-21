const mongoose = require('mongoose');

const WarehouseItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['books', 'kits', 'stationery', 'hardware', 'marketing', 'merchandise', 'id_card', 'certificate_paper', 'other'],
      default: 'stationery',
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockAlert: {
      type: Number,
      default: 20,
    },
    unitCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: 'pcs',
    },
    location: {
      type: String,
      default: 'Central HQ Warehouse',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WarehouseItem', WarehouseItemSchema);
