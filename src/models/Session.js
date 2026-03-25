const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema(
  {
    course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    branchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    title:       { type: String, required: true },
    description: String,
    startTime:   { type: Date, required: true },
    endTime:     { type: Date, required: true },
    meetingLink: { type: String, required: true },
    platform:    { type: String, enum: ['zoom', 'meet', 'other'], default: 'zoom' },
    
    // Dual control
    instructor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    management:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Branch Mgmt/Admin co-host
    
    isLive:      { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    recordingUrl: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Session', SessionSchema);
