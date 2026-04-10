const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    }, // E.g. "CREATE_BRANCH", "UPDATE_MASTER_COURSE", "ROLE_CHANGE"
    entity: {
      type: String,
      required: true,
    }, // E.g. "Branch", "Course", "User"
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    }, // Before/After state or metadata
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
