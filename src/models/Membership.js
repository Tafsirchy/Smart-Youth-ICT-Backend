const mongoose = require("mongoose");

const MembershipSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, required: true },
    category: { type: String, trim: true },
    memberSince: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Membership", MembershipSchema);
