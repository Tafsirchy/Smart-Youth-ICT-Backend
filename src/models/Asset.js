const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema(
  {
    branchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name:        { type: String, required: true },
    category:    { type: String, enum: ['furniture', 'electronics', 'stationary', 'other'], default: 'other' },
    quantity:    { type: Number, default: 1 },
    unitPrice:   { type: Number, default: 0 },
    status:      { type: String, enum: ['available', 'in-use', 'maintenance', 'retired'], default: 'available' },
    purchasedAt: Date,
    description: String,
    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: Assign to staff
  },
  { timestamps: true },
);

module.exports = mongoose.model('Asset', AssetSchema);
