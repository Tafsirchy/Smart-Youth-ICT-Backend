const mongoose = require('mongoose');

const CounselingSessionSchema = new mongoose.Schema(
  {
    branchId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    fullName:       { type: String, required: true, trim: true },
    phone:          { type: String, required: true, trim: true, index: true },
    email:          { type: String, trim: true, lowercase: true },
    interestedCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    preferredDate:  { type: Date, required: true },
    preferredSlot:  { type: String, required: true, trim: true }, // e.g. "11:00 AM - 12:00 PM"
    mode:           { type: String, enum: ['in-person', 'online'], default: 'in-person' },
    source:         { type: String, default: 'website', trim: true },
    assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Counselor / Staff
    status:         { 
      type: String, 
      enum: ['booked', 'attended', 'follow-up', 'enrolled', 'cancelled'], 
      default: 'booked', 
      index: true 
    },
    counselorNotes: [
      {
        note: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    convertedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    followUpDate:   { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CounselingSession', CounselingSessionSchema);
