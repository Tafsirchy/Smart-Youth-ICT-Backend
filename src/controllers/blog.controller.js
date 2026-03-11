const BlogPost = require('../models/BlogPost');
const slugify  = require('slugify');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a unique slug: append -2, -3, … if collision exists */
async function generateUniqueSlug(title, existingId = null) {
  let base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (existingId) query._id = { $ne: existingId };
    const found = await BlogPost.findOne(query);
    if (!found) break;
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc  Get all posts (public: published only; admin: all)
 * @route GET /api/blog
 * @access Public / Admin
 */
const getAllPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 9, tag, q } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';

    const filter = {};
    if (!isAdmin) filter.isPublished = true;
    if (tag) filter.tags = tag;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const total = await BlogPost.countDocuments(filter);
    const posts  = await BlogPost.find(filter)
      .populate('author', 'name avatar')
      .select('-content') // Exclude heavy content from listing
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: posts });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get post by slug (increments view count)
 * @route GET /api/blog/:slug
 * @access Public
 */
const getPostBySlug = async (req, res, next) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug })
      .populate('author', 'name avatar');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    // Increment views
    post.views = (post.views || 0) + 1;
    await post.save({ validateBeforeSave: false });

    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create a new post
 * @route POST /api/blog
 * @access Private (Admin / Instructor)
 */
const createPost = async (req, res, next) => {
  try {
    const { title, excerpt, content, thumbnail, tags, isPublished } = req.body;
    const slug = await generateUniqueSlug(title);

    const post = await BlogPost.create({
      title,
      slug,
      excerpt,
      content,
      thumbnail,
      tags: tags || [],
      isPublished: isPublished || false,
      author: req.user._id,
    });

    res.status(201).json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update a post
 * @route PUT /api/blog/:id
 * @access Private (Admin / Instructor)
 */
const updatePost = async (req, res, next) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { title, excerpt, content, thumbnail, tags, isPublished } = req.body;

    // Re-slug only if title changed
    if (title && title !== post.title) {
      post.slug = await generateUniqueSlug(title, post._id);
      post.title = title;
    }
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (content  !== undefined) post.content = content;
    if (thumbnail !== undefined) post.thumbnail = thumbnail;
    if (tags !== undefined) post.tags = tags;
    if (isPublished !== undefined) post.isPublished = isPublished;

    await post.save();
    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Toggle publish status
 * @route PATCH /api/blog/:id/publish
 * @access Private (Admin)
 */
const togglePublish = async (req, res, next) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    post.isPublished = !post.isPublished;
    await post.save({ validateBeforeSave: false });
    res.json({ success: true, isPublished: post.isPublished });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Delete a post
 * @route DELETE /api/blog/:id
 * @access Private (Admin)
 */
const deletePost = async (req, res, next) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── All Tags helper ──────────────────────────────────────────────────────────

/**
 * @desc  Get all unique tags from published posts
 * @route GET /api/blog/tags
 * @access Public
 */
const getAllTags = async (req, res, next) => {
  try {
    const tags = await BlogPost.distinct('tags', { isPublished: true });
    res.json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPosts,
  getPostBySlug,
  createPost,
  updatePost,
  togglePublish,
  deletePost,
  getAllTags,
};
