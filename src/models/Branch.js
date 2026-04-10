const mongoose = require("mongoose");

const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['head_office', 'regional', 'local'], default: 'local' },
    establishedDate: { type: Date },
    logo: { type: String },
    website: { type: String },
    address: {
      street: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true, default: "Bangladesh" },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      },
      googleMapsUrl: { type: String }
    },
    contact: {
      email: { type: String, trim: true, lowercase: true },
      phones: [{ type: String, trim: true }], // Support multiple numbers
    },
    officeHours: [
      {
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false }
      }
    ],
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
    settings: {
      allowCustomFees: { type: Boolean, default: false },
      maxStudents: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

BranchSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Branch", BranchSchema);
