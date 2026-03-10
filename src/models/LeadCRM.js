const mongoose = require('mongoose');

const LeadCRMSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true },
    phone:         String,
    email:         String,
    source:        { type: String, enum: ['facebook','whatsapp','organic','referral','seminar','other'], default: 'other' },
    interest:      String,  // Course name
    status:        { type: String, enum: ['new','contacted','interested','enrolled','cold','lost'], default: 'new' },
    notes:         [{ text: String, createdAt: { type: Date, default: Date.now } }],
    followUpDate:  Date,
    assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('LeadCRM', LeadCRMSchema);
