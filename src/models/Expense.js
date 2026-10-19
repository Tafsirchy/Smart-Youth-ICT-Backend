const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
  {
    branchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    title:       { type: String, required: true, trim: true },
    category:    { 
      type: String, 
      enum: ['rent', 'utility', 'internet', 'entertainment', 'stationery', 'maintenance', 'other'], 
      default: 'other',
      index: true 
    },
    amount:      { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, default: Date.now },
    voucherUrl:  { type: String, trim: true },
    description: { type: String, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending', 
      index: true 
    },
    actionBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionNote:  { type: String, trim: true },
    actionDate:  { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', ExpenseSchema);
