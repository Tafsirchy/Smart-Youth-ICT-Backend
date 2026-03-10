const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    phone:         { type: String, required: true },
    password:      { type: String, required: true, minlength: 8, select: false },
    role:          { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
    language:      { type: String, enum: ['bn', 'en'], default: 'bn' },
    avatar:        { type: String, default: '' },
    isVerified:    { type: Boolean, default: false },
    isActive:      { type: Boolean, default: true },

    // Affiliate
    affiliateCode: { type: String, unique: true, sparse: true },
    referredBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Password reset
    resetToken:    String,
    resetExpiry:   Date,
  },
  { timestamps: true },
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
