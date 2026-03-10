const mongoose = require('mongoose');

const AffiliateSchema = new mongoose.Schema(
  {
    user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referralCode:   { type: String, required: true, unique: true },
    referredUsers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalEarnings:  { type: Number, default: 0 },
    pendingAmount:  { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10 }, // percentage
    withdrawals:    [{
      amount:     Number,
      method:     String,
      status:     { type: String, enum: ['pending','paid'], default: 'pending' },
      requestedAt: Date,
      paidAt:     Date,
    }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Affiliate', AffiliateSchema);
