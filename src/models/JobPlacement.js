const mongoose = require("mongoose");

const PlacementCategorySchema = new mongoose.Schema({
  title: String,
  type: String,
  desc: String,
  icon: String,
  color: String,
  avgSalary: String,
}, { _id: true });

const LifecycleStepSchema = new mongoose.Schema({
  step: String,
  title: String,
  d: String,
}, { _id: true });

const JobPlacementSchema = new mongoose.Schema(
  {
    placements: [PlacementCategorySchema],
    lifecycle: [LifecycleStepSchema],
    stats: {
      partners: { type: String, default: "120+" },
      rate: { type: String, default: "90%" },
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobPlacement", JobPlacementSchema);
