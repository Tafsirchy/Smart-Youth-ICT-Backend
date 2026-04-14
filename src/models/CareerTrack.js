const mongoose = require("mongoose");

const CareerTrackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    phase1: { type: String, required: true },
    phase2: { type: String, required: true },
    phase3: { type: String, required: true },
    phase4: { type: String, required: true },
    duration: { type: String, default: "6 Months" },
    outcome: { type: String },
    color: { type: String, default: "from-blue-500 to-cyan-400" },
    bg: { type: String, default: "bg-blue-500" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CareerTrack", CareerTrackSchema);
