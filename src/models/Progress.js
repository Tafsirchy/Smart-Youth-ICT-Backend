const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema(
  {
    user:               { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    course:             { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completedLessons:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    quizScores:         [{ quiz: mongoose.Schema.Types.ObjectId, score: Number, date: Date }],
    assignmentsSubmitted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' }],
    progressPercent:    { type: Number, default: 0 },
    completedAt:        Date,
  },
  { timestamps: true },
);

ProgressSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
