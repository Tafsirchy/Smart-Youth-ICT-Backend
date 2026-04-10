const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { uploadToImageBB } = require("../services/imagebb.service");
const slugify = require("slugify");

/**
 * @desc    Get all published courses
 * @route   GET /api/courses
 * @access  Public
 */
const getCourses = async (req, res, next) => {
  try {
    const {
      category,
      page = 1,
      limit = 12,
      branchId,
      isMaster,
      includeUnpublished,
      isPopular,
    } = req.query;

    // Default filter for public endpoints
    const filter = { isDeleted: false };
    if (includeUnpublished !== "true") {
      filter.isPublished = true;
    }
    if (category) filter.category = String(category);

    // Multi-tenant filtering
    if (branchId) filter.branchId = String(branchId);
    if (isMaster !== undefined) filter.isMaster = isMaster === "true";
    if (isPopular !== undefined) filter.isPopular = isPopular === "true";

    const courses = await Course.find(filter)
      .populate("instructor", "name avatar")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort("-createdAt");

    res.json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single course by slug
 * @route   GET /api/courses/:slug
 * @access  Public
 */
const getCourseBySlug = async (req, res, next) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).populate(
      "instructor",
      "name avatar",
    );

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get enrolled courses for student
 * @route   GET /api/courses/enrolled
 * @access  Private (Student)
 */
const getEnrolledCourses = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({
      user: req.user._id,
      paymentStatus: "paid",
    }).populate("course");

    res.json({ success: true, data: enrollments.map((e) => e.course) });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private (Admin/Instructor)
 */
const createCourse = async (req, res, next) => {
  try {
    let thumbnailUrl = "";

    // Handle thumbnail upload if file exists
    if (req.file) {
      thumbnailUrl = await uploadToImageBB(req.file.buffer);
    }

    // Generate slug from English title
    const slug = slugify(req.body.title?.en || "course", {
      lower: true,
      strict: true,
    });

    // Build course data
    const courseData = {
      ...req.body,
      slug,
      instructor: req.user._id,
      branchId:
        req.user.role === "super_admin"
          ? req.body.branchId || null
          : req.user.branchId,
      thumbnail: thumbnailUrl || req.body.thumbnail,
    };

    // If super_admin, they can create master templates
    if (req.user.role === "super_admin" && req.body.isMaster) {
      courseData.isMaster = true;
    }

    // Parse complex JSON structures sent via form-data
    const parseField = (field) => {
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return field;
      }
    };

    courseData.title = parseField(courseData.title);
    courseData.description = parseField(courseData.description);
    if (courseData.price) courseData.price = Number(courseData.price);
    if (courseData.originalPrice)
      courseData.originalPrice = Number(courseData.originalPrice);
    if (courseData.isPublished !== undefined)
      courseData.isPublished =
        courseData.isPublished === true || courseData.isPublished === "true";
    if (courseData.isPopular !== undefined)
      courseData.isPopular =
        courseData.isPopular === true || courseData.isPopular === "true";

    courseData.curriculum = parseField(courseData.curriculum);
    courseData.outcomes = parseField(courseData.outcomes);
    courseData.targetAudience = parseField(courseData.targetAudience);
    courseData.features = parseField(courseData.features);
    courseData.faqs = parseField(courseData.faqs);
    courseData.projects = parseField(courseData.projects);
    courseData.installmentPlan = parseField(courseData.installmentPlan);
    courseData.certification = parseField(courseData.certification);

    // Create the course
    const course = await Course.create(courseData);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Enroll a student in a course (post-payment)
 * @route   POST /api/courses/:id/enroll
 * @access  Private (Student)
 */
const enrollCourse = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    // Check if already enrolled
    const existing = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });
    if (existing) {
      return res
        .status(409)
        .json({
          success: false,
          message: "You are already enrolled in this course",
        });
    }

    // Create enrollment record
    const enrollment = await Enrollment.create({
      user: userId,
      course: courseId,
      branchId: course.branchId, // Inherit branch from course
      paymentStatus: "pending",
      isActive: false,
    });

    // Attempt to send enrollment confirmation email (non-blocking)
    try {
      const emailService = require("../services/email.service");
      await emailService.sendEnrollmentConfirm(req.user, course);
    } catch (mailErr) {
      console.error("Enrollment email failed:", mailErr.message);
    }

    res
      .status(201)
      .json({
        success: true,
        data: enrollment,
        message:
          "Enrollment initiated. Complete payment to activate course access.",
      });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update course details
 * @route   PUT /api/courses/:id
 * @access  Private (Admin/Instructor)
 */
const updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    // Authorization check
    if (
      req.user.role === "instructor" &&
      course.instructor.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Cannot edit a course you do not own",
        });
    }

    let thumbnailUrl = course.thumbnail;
    if (req.file) {
      // If new file is uploaded
      thumbnailUrl = await uploadToImageBB(req.file.buffer);
    }

    const courseData = {
      ...req.body,
      thumbnail: thumbnailUrl || req.body.thumbnail,
    };

    // JSON parse form-data fields securely
    const parseField = (field) => {
      if (!field) return field;
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return field;
      }
    };

    if (courseData.title !== undefined)
      courseData.title = parseField(courseData.title);
    if (courseData.description !== undefined)
      courseData.description = parseField(courseData.description);
    if (courseData.price !== undefined)
      courseData.price = Number(courseData.price);
    if (courseData.originalPrice !== undefined)
      courseData.originalPrice = Number(courseData.originalPrice);
    if (courseData.isPublished !== undefined)
      courseData.isPublished =
        courseData.isPublished === true || courseData.isPublished === "true";
    if (courseData.isPopular !== undefined)
      courseData.isPopular =
        courseData.isPopular === true || courseData.isPopular === "true";

    if (courseData.curriculum !== undefined)
      courseData.curriculum = parseField(courseData.curriculum);
    if (courseData.outcomes !== undefined)
      courseData.outcomes = parseField(courseData.outcomes);
    if (courseData.targetAudience !== undefined)
      courseData.targetAudience = parseField(courseData.targetAudience);
    if (courseData.features !== undefined)
      courseData.features = parseField(courseData.features);
    if (courseData.faqs !== undefined)
      courseData.faqs = parseField(courseData.faqs);
    if (courseData.projects !== undefined)
      courseData.projects = parseField(courseData.projects);
    if (courseData.installmentPlan !== undefined)
      courseData.installmentPlan = parseField(courseData.installmentPlan);
    if (courseData.certification !== undefined)
      courseData.certification = parseField(courseData.certification);

    course = await Course.findByIdAndUpdate(req.params.id, courseData, {
      new: true,
      runValidators: true,
    });
    res.json({
      success: true,
      data: course,
      message: "Course updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Soft delete a course
 * @route   DELETE /api/courses/:id
 * @access  Private (Admin/Instructor)
 */
const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    if (
      req.user.role === "instructor" &&
      course.instructor.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Cannot delete a course you do not own",
        });
    }

    course.isDeleted = true;
    course.isPublished = false;
    await course.save();

    res.json({
      success: true,
      message: "Course safely removed (soft delete).",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCourses,
  getCourseBySlug,
  getEnrolledCourses,
  createCourse,
  enrollCourse,
  updateCourse,
  deleteCourse,
};
