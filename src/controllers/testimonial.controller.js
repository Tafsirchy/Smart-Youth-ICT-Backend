const Testimonial = require('../models/Testimonial');

// @desc    Get all approved testimonials (public)
// @route   GET /api/testimonials
// @access  Public
exports.getTestimonials = async (req, res, next) => {
  try {
    const { courseId, limit = 12 } = req.query;
    const filter = { isApproved: true };
    if (courseId) filter.course = courseId;

    const testimonials = await Testimonial.find(filter)
      .populate('user', 'name avatar')
      .populate('course', 'title slug')
      .sort('-createdAt')
      .limit(Number(limit));

    res.json({ success: true, count: testimonials.length, data: testimonials });
  } catch (err) { next(err); }
};

// @desc    Create a testimonial (student after completing course)
// @route   POST /api/testimonials
// @access  Private (student)
exports.createTestimonial = async (req, res, next) => {
  try {
    const { courseId, rating, text, incomeProof } = req.body;
    if (!courseId || !rating || !text) {
      return res.status(400).json({ success: false, message: 'courseId, rating, and text are required' });
    }

    // Prevent duplicates
    const existing = await Testimonial.findOne({ user: req.user._id, course: courseId });
    if (existing) return res.status(409).json({ success: false, message: 'You have already submitted a testimonial for this course' });

    const testimonial = await Testimonial.create({
      user: req.user._id,
      course: courseId,
      rating: Math.min(5, Math.max(1, Number(rating))),
      text,
      incomeProof: incomeProof || '',
      isApproved: false, // Admin must approve before public display
    });

    res.status(201).json({ success: true, data: testimonial, message: 'Testimonial submitted and pending approval' });
  } catch (err) { next(err); }
};

// @desc    Approve or reject a testimonial (admin)
// @route   PATCH /api/testimonials/:id/approve
// @access  Private (admin)
exports.approveTestimonial = async (req, res, next) => {
  try {
    const { approved } = req.body;
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { isApproved: Boolean(approved) },
      { new: true }
    );
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, data: testimonial, message: `Testimonial ${approved ? 'approved' : 'rejected'}` });
  } catch (err) { next(err); }
};

// @desc    Delete a testimonial (admin)
// @route   DELETE /api/testimonials/:id
// @access  Private (admin)
exports.deleteTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (err) { next(err); }
};
