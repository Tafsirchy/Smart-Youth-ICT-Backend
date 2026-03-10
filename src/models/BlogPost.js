const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    slug:        { type: String, required: true, unique: true },
    excerpt:     String,
    content:     { type: String, required: true },
    thumbnail:   String,
    tags:        [String],
    author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
    views:       { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BlogPost', BlogPostSchema);
