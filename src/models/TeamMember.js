const mongoose = require("mongoose");

const TeamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    institution: { type: String, trim: true },
    type: {
      type: String,
      enum: ["core", "advisory", "instructor"],
      required: true,
      index: true,
    },
    image: { type: String, default: "" },
    bio: { type: String, trim: true },
    badge: { type: String, trim: true },
    experience: { type: String, trim: true },
    expertise: [{ type: String, trim: true }],
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    socials: {
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
      website: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMember", TeamMemberSchema);
