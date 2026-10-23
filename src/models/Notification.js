const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    // Tenant & Recipient Targeting
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
      default: null, // Null for Global HQ
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null, // Null for Broadcasts
    },
    targetRole: {
      type: String,
      enum: [
        'student',
        'instructor',
        'employee',
        'branch_management',
        'branch_admin',
        'super_admin',
        'super_management',
        'all',
      ],
      default: 'all',
      index: true,
    },

    // Content
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Categorization & Priority
    category: {
      type: String,
      enum: ['academic', 'administrative', 'financial', 'system', 'security'],
      default: 'system',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },

    // Navigation & Context Deep-Linking
    link: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
      invoiceId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
      ticketId:     { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' },
      branchName:   { type: String, default: '' },
      branchCode:   { type: String, default: '' },
      actorName:    { type: String, default: '' },
    },

    // Read State Tracking
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          index: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Tracks users who dismissed/cleared this broadcast
    dismissedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],

    // Multi-Channel Delivery Status
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms:   { type: Boolean, default: false },
    },
    sentApp:   { type: Boolean, default: true },
    sentEmail: { type: Boolean, default: false },
    sentSMS:   { type: Boolean, default: false },

    // Actor attribution
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// High-performance compound indexes for multi-tenant and role-scoped queries
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ branchId: 1, targetRole: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
