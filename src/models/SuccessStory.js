const mongoose = require("mongoose");

const SuccessStorySchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    studentAvatar: { type: String, default: "" },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    company: { type: String, trim: true },
    location: { type: String, trim: true },
    storyType: { type: String, enum: ['text', 'video'], default: 'text' },
    videoUrl: { type: String, trim: true },
    videoThumbnail: { type: String, trim: true },
    resultSummary: { type: String, required: true, trim: true }, // e.g. "Earned $1200 on Fiverr"
    description: { type: String, trim: true },
    proofImage: { type: String, default: "" },
    isPublished: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuccessStory", SuccessStorySchema);
