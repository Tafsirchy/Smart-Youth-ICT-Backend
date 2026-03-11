const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getTestimonials,
  createTestimonial,
  approveTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonial.controller');

// Public
router.get('/', getTestimonials);

// Student — submit testimonial
router.post('/', protect, authorize('student'), createTestimonial);

// Admin — approve / delete
router.patch('/:id/approve', protect, authorize('admin'), approveTestimonial);
router.delete('/:id',        protect, authorize('admin'), deleteTestimonial);

module.exports = router;
