const mongoose = require("mongoose");

const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g., "HQ", "B1"
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true, default: "Bangladesh" },
    },
    contact: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users with branch_management role
    isActive: { type: Boolean, default: true },
    settings: {
      allowCustomFees: { type: Boolean, default: false },
      maxStudents: { type: Number, default: 0 }, // 0 means unlimited
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", BranchSchema);
