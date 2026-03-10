const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema(
  {
    user:              { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    course:            { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    certificateUrl:    { type: String, required: true },
    verificationCode:  { type: String, required: true, unique: true },
    issuedAt:          { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Certificate', CertificateSchema);
