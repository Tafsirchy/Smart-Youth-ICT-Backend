const mongoose = require("mongoose");

const ClassificationSchema = new mongoose.Schema({
  title: String,
  type: String,
  desc: String,
  icon: String,
  color: String,
  features: [String],
}, { _id: true });

const PhaseSchema = new mongoose.Schema({
  step: String,
  title: String,
  desc: String,
}, { _id: true });

const FreelancingTrainingSchema = new mongoose.Schema(
  {
    classifications: [ClassificationSchema],
    phases: [PhaseSchema],
    toolkit: [String],
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FreelancingTraining", FreelancingTrainingSchema);
