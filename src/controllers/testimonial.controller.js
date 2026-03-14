const Testimonial = require("../models/Testimonial");

const buildStatusFilter = (status) => {
  if (status === "approved") return { moderationStatus: "approved" };
  if (status === "rejected") return { moderationStatus: "rejected" };
  if (status === "pending") return { moderationStatus: "pending" };
  return { moderationStatus: "approved" };
};

// @desc    Get all approved testimonials (public)
// @route   GET /api/testimonials
// @access  Public
exports.getTestimonials = async (req, res, next) => {
  try {
    const { courseId, limit = 12, status } = req.query;
    const filter = buildStatusFilter(status);
    if (courseId) filter.course = courseId;

    const testimonials = await Testimonial.find(filter)
      .populate("user", "name avatar")
      .populate("course", "title slug")
      .sort("-createdAt")
      .limit(Number(limit));

    res.json({
      success: true,
      count: testimonials.length,
      data: testimonials.map((testimonial) => ({
        ...testimonial.toObject(),
        status: testimonial.moderationStatus,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a testimonial (student after completing course)
// @route   POST /api/testimonials
// @access  Private (student)
exports.createTestimonial = async (req, res, next) => {
  try {
    const { courseId, rating, text, incomeProof } = req.body;
    if (!courseId || !rating || !text) {
      return res
        .status(400)
        .json({
          success: false,
          message: "courseId, rating, and text are required",
        });
    }

    // Prevent duplicates
    const existing = await Testimonial.findOne({
      user: req.user._id,
      course: courseId,
    });
    if (existing)
      return res
        .status(409)
        .json({
          success: false,
          message: "You have already submitted a testimonial for this course",
        });

    const testimonial = await Testimonial.create({
      user: req.user._id,
      course: courseId,
      rating: Math.min(5, Math.max(1, Number(rating))),
      text,
      incomeProof: incomeProof || "",
      moderationStatus: "pending",
      isApproved: false,
    });

    res
      .status(201)
      .json({
        success: true,
        data: testimonial,
        message: "Testimonial submitted and pending approval",
      });
  } catch (err) {
    next(err);
  }
};

// @desc    Update testimonial moderation status (admin)
// @route   PATCH /api/testimonials/:id/status
// @access  Private (admin)
exports.updateTestimonialStatus = async (req, res, next) => {
  try {
    const requestedStatus =
      req.body.status || (req.body.approved ? "approved" : "rejected");
    if (!["approved", "rejected", "pending"].includes(requestedStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid testimonial status" });
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      {
        moderationStatus: requestedStatus,
        isApproved: requestedStatus === "approved",
      },
      { new: true },
    );
    if (!testimonial)
      return res
        .status(404)
        .json({ success: false, message: "Testimonial not found" });
    res.json({
      success: true,
      data: { ...testimonial.toObject(), status: testimonial.moderationStatus },
      message: `Testimonial ${requestedStatus}`,
    });
  } catch (err) {
    next(err);
  }
};

exports.approveTestimonial = exports.updateTestimonialStatus;

// @desc    Delete a testimonial (admin)
// @route   DELETE /api/testimonials/:id
// @access  Private (admin)
exports.deleteTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial)
      return res
        .status(404)
        .json({ success: false, message: "Testimonial not found" });
    res.json({ success: true, message: "Testimonial deleted" });
  } catch (err) {
    next(err);
  }
};
