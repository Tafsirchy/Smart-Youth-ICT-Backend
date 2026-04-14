const mongoose = require("mongoose");

const CertificationProgramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    features: [{ type: String }],
    badgeText: { type: String, default: "Official Validation" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CertificationProgram", CertificationProgramSchema);
