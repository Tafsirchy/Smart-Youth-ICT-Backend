const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    questions: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctOptions: [{ type: Number, required: true }], // Array of indices (e.g. [0] for A)
        points: { type: Number, default: 10 },
      },
    ],
    timeLimitMinutes: {
      type: Number, // Optional time limit
    },
    passingScore: {
      type: Number,
      default: 70, // percentage
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
