const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    branchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true }, // Null if global
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },   // Null if broadcast
    
    title:       { type: String, required: true },
    message:     { type: String, required: true },
    
    type:        { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    targetRole:  { type: String, enum: ['student', 'instructor', 'branch_management', 'branch_admin', 'super_admin', 'parent', 'all'], default: 'all' },
    
    link:        String, // Optional URL to navigate to
    isRead:      { type: Boolean, default: false },
    
    // Mirroring flags
    sentEmail:   { type: Boolean, default: false },
    sentSMS:     { type: Boolean, default: false },
    sentApp:     { type: Boolean, default: true }
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', NotificationSchema);
