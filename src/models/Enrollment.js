const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema(
  {
    user:              { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    course:            { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
    paymentStatus:     { type: String, enum: ['pending','paid','installment','failed'], default: 'pending' },
    installmentsPaid:  { type: Number, default: 0 },
    expiresAt:         Date,
    referredBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', EnrollmentSchema);
