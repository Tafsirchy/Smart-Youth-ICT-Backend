const mongoose = require("mongoose");

const CurriculumItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    duration: String,
    isFree: { type: Boolean, default: false },
    topics: [String], // Array of sub-topics/lessons
  },
  { _id: false },
);

const FeatureSchema = new mongoose.Schema(
  {
    iconKey: String, // E.g. 'FaLaptopCode', mapped on frontend
    text: String,
  },
  { _id: false },
);

const ProjectSchema = new mongoose.Schema(
  {
    title: String,
    desc: String,
    techs: [String],
    image: String, // URL
  },
  { _id: false },
);

const FAQSchema = new mongoose.Schema(
  {
    question: String,
    answer: String,
  },
  { _id: false },
);

const CourseSchema = new mongoose.Schema(
  {
    title: { bn: String, en: String },
    slug: { type: String, required: true, unique: true },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      index: true,
    },
    isMaster: { type: Boolean, default: false },
    masterCourseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    description: { bn: String, en: String },
    tagline: { type: String, default: "" },
    outcomes: [String],
    targetAudience: [String],
    language: { type: String, default: "Bengali / English" },
    mode: { type: String, default: "Online / Hybrid" },
    features: [FeatureSchema],
    faqs: [FAQSchema],
    projects: [ProjectSchema],
    certification: {
      included: { type: Boolean, default: true },
      desc: {
        type: String,
        default:
          "Earn an industry-recognized certificate upon passing all modules and assignments.",
      },
    },
    category: {
      type: String,
      enum: ["web-dev", "graphic-design", "smm", "ai", "other"],
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    thumbnail: { type: String, default: "" },
    previewVideo: { type: String, default: "" },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null }, // crossed-out "was" price for discounts
    totalLectures: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
    instructorName: { type: String, default: "" },
    instructorBio: { type: String, default: "" },
    whatsIncluded: [
      {
        text: String,
        included: { type: Boolean, default: true },
      },
    ],
    installmentPlan: {
      enabled: { type: Boolean, default: false },
      parts: { type: Number, default: 2 },
    },
    duration: String, // e.g. "6 Months"
    curriculum: [CurriculumItemSchema],
    isPublished: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }, // Soft Delete flag
    totalStudents: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────
CourseSchema.index({ isPublished: 1, isDeleted: 1, createdAt: -1 });
CourseSchema.index({ category: 1, isPublished: 1, isDeleted: 1 });
CourseSchema.index({ branchId: 1, isPublished: 1, isDeleted: 1 });
CourseSchema.index({ isPopular: 1, isPublished: 1, isDeleted: 1 });
CourseSchema.index({ isMaster: 1, isPublished: 1, isDeleted: 1 });
CourseSchema.index({ slug: 1 }, { unique: true });
CourseSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Course", CourseSchema);
