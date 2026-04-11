const TeamMember = require("../models/TeamMember");
const SuccessStory = require("../models/SuccessStory");
const Partner = require("../models/Partner");
const User = require("../models/User");
const Testimonial = require("../models/Testimonial");

/**
 * 🏢 Team Management (Core & Advisory)
 */
exports.getTeam = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;

    const team = await TeamMember.find(filter).sort("order createdAt");
    res.json({ success: true, count: team.length, data: team });
  } catch (err) { next(err); }
};

exports.createTeamMember = async (req, res, next) => {
  try {
    const member = await TeamMember.create(req.body);
    res.status(201).json({ success: true, data: member });
  } catch (err) { next(err); }
};

exports.updateTeamMember = async (req, res, next) => {
  try {
    const member = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, data: member });
  } catch (err) { next(err); }
};

exports.deleteTeamMember = async (req, res, next) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, message: "Member removed" });
  } catch (err) { next(err); }
};

/**
 * 🎯 Success Stories
 */
exports.getSuccessStories = async (req, res, next) => {
  try {
    const stories = await SuccessStory.find({ isPublished: true }).populate("courseId", "title").sort("order -createdAt");
    res.json({ success: true, count: stories.length, data: stories });
  } catch (err) { next(err); }
};

exports.adminGetSuccessStories = async (req, res, next) => {
  try {
    const stories = await SuccessStory.find().populate("courseId", "title").sort("-createdAt");
    res.json({ success: true, data: stories });
  } catch (err) { next(err); }
};

exports.createSuccessStory = async (req, res, next) => {
  try {
    const story = await SuccessStory.create(req.body);
    res.status(201).json({ success: true, data: story });
  } catch (err) { next(err); }
};

exports.updateSuccessStory = async (req, res, next) => {
  try {
    const story = await SuccessStory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: story });
  } catch (err) { next(err); }
};

exports.deleteSuccessStory = async (req, res, next) => {
  try {
    await SuccessStory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Story removed" });
  } catch (err) { next(err); }
};

/**
 * 🤝 Partners
 */
exports.getPartners = async (req, res, next) => {
  try {
    const partners = await Partner.find({ isActive: true }).sort("order");
    res.json({ success: true, data: partners });
  } catch (err) { next(err); }
};

exports.createPartner = async (req, res, next) => {
  try {
    const partner = await Partner.create(req.body);
    res.status(201).json({ success: true, data: partner });
  } catch (err) { next(err); }
};

exports.updatePartner = async (req, res, next) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: partner });
  } catch (err) { next(err); }
};

exports.deletePartner = async (req, res, next) => {
  try {
    await Partner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Partner removed" });
  } catch (err) { next(err); }
};

/**
 * 👨‍🏫 Featured Mentors (Instructor Specialization)
 */
exports.getFeaturedMentors = async (req, res, next) => {
  try {
    const mentors = await User.find({ role: "instructor", isFeaturedMentor: true, isActive: true })
      .select("name avatar bio expertise featuredBio");
    res.json({ success: true, data: mentors });
  } catch (err) { next(err); }
};

exports.toggleFeaturedMentor = async (req, res, next) => {
  try {
    const { isFeaturedMentor, featuredBio } = req.body;
    const mentor = await User.findByIdAndUpdate(
      req.params.id, 
      { isFeaturedMentor, featuredBio }, 
      { new: true }
    );
    res.json({ success: true, data: mentor });
  } catch (err) { next(err); }
};

/**
 * 💬 Testimonials Management
 */
exports.getTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find()
      .populate("user", "name avatar")
      .populate("course", "title")
      .sort("-createdAt");
    res.json({ success: true, data: testimonials });
  } catch (err) { next(err); }
};

exports.updateTestimonialStatus = async (req, res, next) => {
  try {
    const { moderationStatus, isApproved } = req.body;
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id, 
      { moderationStatus, isApproved }, 
      { new: true }
    );
    res.json({ success: true, data: testimonial });
  } catch (err) { next(err); }
};
