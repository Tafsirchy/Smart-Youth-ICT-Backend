const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    skills: [{ type: String }],
    socialLinks: {
      github: { type: String },
      linkedin: { type: String },
      website: { type: String },
    },
    projects: [
      {
        title: { type: String, required: true },
        description: { type: String },
        imageUrl: { type: String },
        projectUrl: { type: String }, // Live link or repo
        dateCompleted: { type: Date },
      },
    ],
    resumeUrl: { type: String },
    isPublic: {
      type: Boolean,
      default: true,
    },
    // Custom vanity URL slug
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
