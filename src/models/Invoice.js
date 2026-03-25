const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    branchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    
    invoiceNo:   { type: String, required: true, unique: true },
    amount:      { type: Number, required: true },
    discount:    { type: Number, default: 0 },
    total:       { type: Number, required: true },
    
    status:      { type: String, enum: ['pending', 'paid', 'partial', 'overdue', 'cancelled'], default: 'pending' },
    dueDate:     Date,
    paidDate:    Date,
    
    // Detailed items for fees Breakdown
    items:       [{
      description: String,
      amount:      Number
    }],
    
    paymentMethod: { type: String, enum: ['cash', 'card', 'bkash', 'rocket', 'bank'], default: 'cash' },
    notes:       String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Invoice', InvoiceSchema);
