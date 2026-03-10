const mongoose = require('mongoose');

const projectApplicationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverLetter: {
      type: String,
      required: true,
    },
    proposedPrice: {
      type: Number,
    },
    estimatedDays: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// A student can apply to a project only once
projectApplicationSchema.index({ project: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ProjectApplication', projectApplicationSchema);
