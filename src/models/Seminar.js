const mongoose = require('mongoose');

const SeminarSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Seminar title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch reference is required'],
      index: true,
    },
    date: {
      type: String, // e.g. "2026-10-25" or ISO string
      required: [true, 'Seminar date is required'],
    },
    time: {
      type: String, // e.g. "03:30 PM - 05:30 PM"
      default: '',
    },
    venue: {
      type: String, // e.g. "Campus Seminar Hall / Lab 02" or "Google Meet"
      default: 'Main Campus Hall',
    },
    mode: {
      type: String,
      enum: ['offline', 'online', 'hybrid'],
      default: 'offline',
    },
    meetingLink: {
      type: String,
      default: '',
    },
    speaker: {
      name: { type: String, default: '' },
      designation: { type: String, default: '' },
      organization: { type: String, default: 'Smart Youth ICT' },
      avatar: { type: String, default: '' },
    },
    maxSeats: {
      type: Number,
      default: 50,
      min: [1, 'Must allow at least 1 seat'],
    },
    registeredCount: {
      type: Number,
      default: 0,
    },
    banner: {
      type: String,
      default: '',
    },
    topics: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Seminar', SeminarSchema);
