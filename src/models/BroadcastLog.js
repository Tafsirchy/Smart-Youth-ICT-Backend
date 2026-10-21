const mongoose = require('mongoose');

const broadcastLogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      trim: true,
      default: ''
    },
    message: {
      type: String,
      required: true
    },
    channels: [{
      type: String,
      enum: ['sms', 'email', 'in_app'],
      required: true
    }],
    targetAudience: {
      type: String,
      enum: ['all_students', 'all_instructors', 'all_branch_staff', 'specific_branch', 'all_users'],
      default: 'all_users'
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null
    },
    urgency: {
      type: String,
      enum: ['normal', 'urgent', 'critical'],
      default: 'normal'
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    stats: {
      totalRecipients: { type: Number, default: 0 },
      smsSent: { type: Number, default: 0 },
      emailSent: { type: Number, default: 0 },
      inAppSent: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BroadcastLog', broadcastLogSchema);
