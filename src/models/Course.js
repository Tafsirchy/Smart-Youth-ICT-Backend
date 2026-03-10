const mongoose = require('mongoose');

const CurriculumItemSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  duration:   String,
  isFree:     { type: Boolean, default: false },
}, { _id: false });

const CourseSchema = new mongoose.Schema(
  {
    title:         { bn: String, en: String },
    slug:          { type: String, required: true, unique: true },
    description:   { bn: String, en: String },
    category:      { type: String, enum: ['web-dev','graphic-design','smm','ai','other'], required: true },
    instructor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    thumbnail:     { type: String, default: '' },
    previewVideo:  { type: String, default: '' },
    price:         { type: Number, required: true },
    installmentPlan: {
      enabled:  { type: Boolean, default: false },
      parts:    { type: Number, default: 2 },
    },
    duration:      String,   // e.g. "6 Months"
    curriculum:    [CurriculumItemSchema],
    isPublished:   { type: Boolean, default: false },
    totalStudents: { type: Number, default: 0 },
    rating:        { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Course', CourseSchema);
