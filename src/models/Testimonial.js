const mongoose = require("mongoose");

const TestimonialSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() { return !this.isManual; },
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: function() { return !this.isManual; },
    },
    isManual: { type: Boolean, default: false },
    manualName: { type: String, trim: true },
    manualAvatar: { type: String, trim: true },
    manualCourse: { type: String, trim: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    incomeProof: {
      type: String,
      default: "",
      trim: true,
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

TestimonialSchema.index({ moderationStatus: 1 });
TestimonialSchema.index({ isApproved: 1 });

module.exports = mongoose.model("Testimonial", TestimonialSchema);
