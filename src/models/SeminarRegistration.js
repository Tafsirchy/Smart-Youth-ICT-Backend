const mongoose = require('mongoose');

const SeminarSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    phone:    { type: String, required: true },
    email:    String,
    source:   String,
    seminar:  String,  // Seminar name/date
    seminarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seminar', index: true },
    attended: { type: Boolean, default: false },
    attendanceStatus: { type: String, enum: ['registered', 'attended', 'absent'], default: 'registered' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SeminarRegistration', SeminarSchema);
