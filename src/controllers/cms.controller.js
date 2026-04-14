const TeamMember = require("../models/TeamMember");
const SuccessStory = require("../models/SuccessStory");
const Partner = require("../models/Partner");
const User = require("../models/User");
const Testimonial = require("../models/Testimonial");
const CareerTrack = require("../models/CareerTrack");
const CertificationProgram = require("../models/CertificationProgram");
const FreelancingTraining = require("../models/FreelancingTraining");
const JobPlacement = require("../models/JobPlacement");
const ServicePageContent = require("../models/ServicePageContent");
const WebServiceContent = require("../models/WebServiceContent");

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
 * 👨‍🏫 Mentors Management (Instructors)
 */
exports.getMentors = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = { role: "instructor" };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    const mentors = await User.find(filter).select("-password").sort("-createdAt");
    res.json({ success: true, data: mentors });
  } catch (err) { next(err); }
};

exports.createMentor = async (req, res, next) => {
  try {
    const { name, email, password, expertise, bio, featuredBio, avatar } = req.body;
    const user = await User.create({
      name, email, password, expertise, bio, featuredBio, avatar,
      role: "instructor",
      isVerified: true
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.updateMentor = async (req, res, next) => {
  try {
    const mentor = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!mentor) return res.status(404).json({ success: false, message: "Mentor not found" });
    res.json({ success: true, data: mentor });
  } catch (err) { next(err); }
};

exports.deleteMentor = async (req, res, next) => {
  try {
    // Instead of deletion, we deactivate to preserve course links
    const mentor = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!mentor) return res.status(404).json({ success: false, message: "Mentor not found" });
    res.json({ success: true, message: "Mentor deactivated" });
  } catch (err) { next(err); }
};

exports.toggleFeaturedMentor = async (req, res, next) => {
  try {
    const { isFeaturedMentor } = req.body;
    const mentor = await User.findByIdAndUpdate(req.params.id, { isFeaturedMentor }, { new: true });
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

exports.createTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    res.status(201).json({ success: true, data: testimonial });
  } catch (err) { next(err); }
};

exports.updateTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: testimonial });
  } catch (err) { next(err); }
};

exports.deleteTestimonial = async (req, res, next) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Testimonial removed" });
  } catch (err) { next(err); }
};

/**
 * 🎓 Career Services (Learning & Career)
 */

// 1. Service Page Content (Hero/Methodology)
exports.getServicePageContent = async (req, res, next) => {
  try {
    const { pageType } = req.params;
    const content = await ServicePageContent.findOne({ pageType });
    res.json({ success: true, data: content });
  } catch (err) { next(err); }
};

exports.updateServicePageContent = async (req, res, next) => {
  try {
    const { pageType } = req.params;
    const content = await ServicePageContent.findOneAndUpdate(
      { pageType }, 
      req.body, 
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: content });
  } catch (err) { next(err); }
};

// 2. Career Tracks
exports.getCareerTracks = async (req, res, next) => {
  try {
    const tracks = await CareerTrack.find().sort("order createdAt");
    res.json({ success: true, data: tracks });
  } catch (err) { next(err); }
};

exports.createCareerTrack = async (req, res, next) => {
  try {
    const track = await CareerTrack.create(req.body);
    res.status(201).json({ success: true, data: track });
  } catch (err) { next(err); }
};

exports.updateCareerTrack = async (req, res, next) => {
  try {
    const track = await CareerTrack.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: track });
  } catch (err) { next(err); }
};

exports.deleteCareerTrack = async (req, res, next) => {
  try {
    await CareerTrack.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Career track removed" });
  } catch (err) { next(err); }
};

// 3. Certifications
exports.getCertificationPrograms = async (req, res, next) => {
  try {
    const programs = await CertificationProgram.find().sort("order createdAt");
    res.json({ success: true, data: programs });
  } catch (err) { next(err); }
};

exports.createCertificationProgram = async (req, res, next) => {
  try {
    const program = await CertificationProgram.create(req.body);
    res.status(201).json({ success: true, data: program });
  } catch (err) { next(err); }
};

exports.updateCertificationProgram = async (req, res, next) => {
  try {
    const program = await CertificationProgram.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: program });
  } catch (err) { next(err); }
};

exports.deleteCertificationProgram = async (req, res, next) => {
  try {
    await CertificationProgram.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Certification removed" });
  } catch (err) { next(err); }
};

// 4. Freelancing
exports.getFreelancingPrograms = async (req, res, next) => {
  try {
    const programs = await FreelancingTraining.find().sort("order -createdAt");
    res.json({ success: true, data: programs });
  } catch (err) { next(err); }
};

exports.createFreelancingProgram = async (req, res, next) => {
  try {
    const program = await FreelancingTraining.create(req.body);
    res.status(201).json({ success: true, data: program });
  } catch (err) { next(err); }
};

exports.updateFreelancingProgram = async (req, res, next) => {
  try {
    const program = await FreelancingTraining.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: program });
  } catch (err) { next(err); }
};

exports.deleteFreelancingProgram = async (req, res, next) => {
  try {
    await FreelancingTraining.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Freelancing program removed" });
  } catch (err) { next(err); }
};

// 5. Job Placement
exports.getJobPlacements = async (req, res, next) => {
  try {
    const placements = await JobPlacement.find().sort("order -createdAt");
    res.json({ success: true, data: placements });
  } catch (err) { next(err); }
};

exports.createJobPlacement = async (req, res, next) => {
  try {
    const placement = await JobPlacement.create(req.body);
    res.status(201).json({ success: true, data: placement });
  } catch (err) { next(err); }
};

exports.updateJobPlacement = async (req, res, next) => {
  try {
    const placement = await JobPlacement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: placement });
  } catch (err) { next(err); }
};

exports.deleteJobPlacement = async (req, res, next) => {
  try {
    await JobPlacement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Job placement removed" });
  } catch (err) { next(err); }
};
// 6. Web & Software Services (Portfolio/Business)
exports.getWebServiceContent = async (req, res, next) => {
  try {
    const { pageType } = req.params;
    const content = await WebServiceContent.findOne({ pageType });
    res.json({ success: true, data: content });
  } catch (err) { next(err); }
};

exports.updateWebServiceContent = async (req, res, next) => {
  try {
    const { pageType } = req.params;
    const content = await WebServiceContent.findOneAndUpdate(
      { pageType },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: content });
  } catch (err) { next(err); }
};
