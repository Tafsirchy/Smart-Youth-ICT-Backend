const mongoose = require('mongoose');

const HelpArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['getting-started', 'billing', 'courses', 'technical', 'other'],
      default: 'getting-started',
    },
    content: {
      type: String,
      required: true,
    }, // HTML or Markdown
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HelpArticle', HelpArticleSchema);
