const mongoose = require('mongoose');

const BranchNoticeSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null, // null means global announcement across all branches
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Notice content is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['general', 'academic', 'holiday', 'exam', 'event', 'urgent'],
      default: 'general',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'instructors', 'staff'],
      default: 'all',
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BranchNotice', BranchNoticeSchema);
