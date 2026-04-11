const express = require('express');
const router  = express.Router();
const {
  getAllPosts,
  getPostBySlug,
  createPost,
  updatePost,
  togglePublish,
  deletePost,
  getAllTags,
} = require('../controllers/blog.controller');
const { protect }   = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Public routes
router.get('/tags', getAllTags);
router.get('/',     getAllPosts);
router.get('/:slug', getPostBySlug);

// Protected routes (Admin / Instructor)
router.post('/',          protect, authorize('super_admin', 'branch_admin', 'instructor'), createPost);
router.put('/:id',        protect, authorize('super_admin', 'branch_admin', 'instructor'), updatePost);
router.patch('/:id/publish', protect, authorize('super_admin', 'branch_admin'),            togglePublish);
router.delete('/:id',     protect, authorize('super_admin'),                           deletePost);

module.exports = router;
