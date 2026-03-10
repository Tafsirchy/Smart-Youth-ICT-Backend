const mongoose = require('mongoose');

const SeminarSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    phone:    { type: String, required: true },
    email:    String,
    source:   String,
    seminar:  String,  // Seminar name/date
    attended: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SeminarRegistration', SeminarSchema);
