const mongoose = require('mongoose');

const ClassScheduleSchema = new mongoose.Schema(
  {
    branchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    batchName:   { type: String, required: true, trim: true }, // e.g. "Batch 42 - Web", "Evening Lab A"
    course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    trainer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dayOfWeek:   { 
      type: String, 
      enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 
      required: true,
      index: true 
    },
    startTime:   { type: String, required: true, trim: true }, // "10:00" (24-hour format HH:MM)
    endTime:     { type: String, required: true, trim: true }, // "12:00" (24-hour format HH:MM)
    roomOrLab:   { type: String, required: true, trim: true, index: true }, // "Lab 1", "Room 204", "Online Zoom"
    meetingLink: { type: String, trim: true },
    notes:       { type: String, trim: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClassSchedule', ClassScheduleSchema);
