const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    course:        { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
    branchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch',  index: true },
    method:        { type: String, enum: ['bkash','nagad','rocket','stripe','bank'], required: true },
    amount:        { type: Number, required: true },
    currency:      { type: String, default: 'BDT' },
    status:        { type: String, enum: ['pending','completed','failed','refunded'], default: 'pending' },
    transactionId: String,
    senderNumber:  String,
    gatewayRef:    String,
    slip:          String,     // Bank slip image URL
    isInstallment: { type: Boolean, default: false },
    installmentNo: Number,
    adminNote:     String,
    coupon:        { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode:    { type: String, uppercase: true, trim: true },
    originalAmount:{ type: Number },
    discountAmount:{ type: Number, default: 0 },
    couponRedeemed:{ type: Boolean, default: false },
    verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt:    Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Payment', PaymentSchema);
