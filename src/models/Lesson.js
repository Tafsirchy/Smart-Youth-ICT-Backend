const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema(
  {
    course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title:       { type: String, required: true },
    description: String,
    videoUrl:    String,
    duration:    Number,  // seconds
    order:       { type: Number, required: true },
    isPreview:   { type: Boolean, default: false },
    resources:   [{ name: String, url: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Lesson', LessonSchema);
