const TeamMember = require("../models/TeamMember");
const SuccessStory = require("../models/SuccessStory");
const Partner = require("../models/Partner");
const Membership = require("../models/Membership");
const User = require("../models/User");
const Testimonial = require("../models/Testimonial");
const CareerTrack = require("../models/CareerTrack");
const CertificationProgram = require("../models/CertificationProgram");
const FreelancingTraining = require("../models/FreelancingTraining");
const JobPlacement = require("../models/JobPlacement");
const ServicePageContent = require("../models/ServicePageContent");
const WebServiceContent = require("../models/WebServiceContent");
const CompanyCertification = require("../models/CompanyCertification");
const SystemSetting = require("../models/SystemSetting");
const { escapeRegex } = require("../utils/regex");
const {
  normalizeServiceContent,
  parseServiceContent,
  parseCareerServiceContent,
} = require("../schemas/serviceContent.schema");

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
    const start = Date.now();
    const partners = await Partner.find({ isActive: true }).sort("order").lean();
    console.log(`[getPartners] DB query took ${Date.now() - start}ms`);
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
 * 🤝 Memberships (organisations SYICT is a member of)
 */
exports.getMemberships = async (req, res, next) => {
  try {
    const memberships = await Membership.find({ isActive: true }).sort("order");
    res.json({ success: true, data: memberships });
  } catch (err) { next(err); }
};

exports.createMembership = async (req, res, next) => {
  try {
    const membership = await Membership.create(req.body);
    res.status(201).json({ success: true, data: membership });
  } catch (err) { next(err); }
};

exports.updateMembership = async (req, res, next) => {
  try {
    const membership = await Membership.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!membership) return res.status(404).json({ success: false, message: "Membership not found" });
    res.json({ success: true, data: membership });
  } catch (err) { next(err); }
};

exports.deleteMembership = async (req, res, next) => {
  try {
    await Membership.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Membership removed" });
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
      const escaped = escapeRegex(String(search).trim());
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } }
      ];
    }
    const mentors = await User.find(filter).select("-password").sort("-createdAt");
    res.json({ success: true, data: mentors });
  } catch (err) { next(err); }
};

exports.createMentor = async (req, res, next) => {
  try {
    const { name, email, password, expertise, bio, featuredBio, avatar, badge, experience, socials } = req.body;
    const user = await User.create({
      name, email, password, expertise, bio, featuredBio, avatar, badge, experience, socials,
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
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    const { pageType } = req.params;
    const content = await ServicePageContent.findOne({ pageType });
    res.json({ success: true, data: normalizeServiceContent(content, { pageType }) });
  } catch (err) { next(err); }
};

exports.updateServicePageContent = async (req, res, next) => {
  try {
    const { pageType } = req.params;
    const validation = parseCareerServiceContent(req.body, { pageType });
    if (!validation.ok) {
      return res.status(422).json({
        success: false,
        message: "The content does not match the service content schema",
        issues: validation.issues,
      });
    }

    const content = await ServicePageContent.findOneAndUpdate(
      { pageType },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: normalizeServiceContent(content, { pageType }) });
  } catch (err) { next(err); }
};

// 2. Career Tracks
exports.getCareerTracks = async (req, res, next) => {
  try {
    const tracks = await CareerTrack.find().sort("order createdAt").lean();
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
    const programs = await CertificationProgram.find().sort("order createdAt").lean();
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
    const programs = await FreelancingTraining.find().sort("order -createdAt").lean();
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
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    const { pageType } = req.params;
    const content = await WebServiceContent.findOne({ pageType });
    res.json({ success: true, data: normalizeServiceContent(content, { pageType }) });
  } catch (err) { next(err); }
};

exports.updateWebServiceContent = async (req, res, next) => {
  try {
    const { pageType } = req.params;
    const validation = parseServiceContent(req.body, { pageType });
    if (!validation.ok) {
      return res.status(422).json({
        success: false,
        message: "The content does not match the service content schema",
        issues: validation.issues,
      });
    }

    const content = await WebServiceContent.findOneAndUpdate(
      { pageType },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: normalizeServiceContent(content, { pageType }) });
  } catch (err) { next(err); }
};

/**
 * ⚙️ System Settings (Public Fetch)
 */
exports.getSettingByKey = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOne({ key: req.params.key });
    res.json({ success: true, data: setting ? setting.value : null });
  } catch (err) { next(err); }
};

exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.find({
      key: { $in: ['maintenanceMode', 'registrationOpen', 'globalMessage'] }
    });
    const map = {
      maintenanceMode: false,
      registrationOpen: true,
      globalMessage: []
    };
    settings.forEach(s => {
      map[s.key] = s.value;
    });
    res.json({ success: true, data: map });
  } catch (err) { next(err); }
};

/**
 * 📜 Institutional & Company Certifications (/about/certifications)
 */
exports.getCompanyCertifications = async (req, res, next) => {
  try {
    const [certifications, heroSetting] = await Promise.all([
      CompanyCertification.find({ isActive: true })
        .sort({ order: 1, createdAt: -1 })
        .lean(),
      SystemSetting.findOne({ key: "about_certifications_hero" }).lean(),
    ]);

    res.json({
      success: true,
      count: certifications.length,
      data: certifications,
      hero: heroSetting?.value || null,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminGetCompanyCertifications = async (req, res, next) => {
  try {
    const { category, isActive, search } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }
    if (isActive !== undefined && isActive !== "all") {
      filter.isActive = isActive === "true";
    }
    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [
        { title: regex },
        { issuer: regex },
        { category: regex },
        { credentialId: regex },
        { description: regex },
      ];
    }

    const certifications = await CompanyCertification.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: certifications.length,
      data: certifications,
    });
  } catch (err) {
    next(err);
  }
};

exports.createCompanyCertification = async (req, res, next) => {
  try {
    const {
      title,
      issuer,
      category,
      credentialId,
      issueDate,
      expiryDate,
      description,
      image,
      verificationUrl,
      highlights,
      order,
      isActive,
      isFeatured,
    } = req.body;

    if (!title || !issuer || !image) {
      return res.status(400).json({
        success: false,
        message: "Title, issuer, and certificate image are required.",
      });
    }

    const count = await CompanyCertification.countDocuments();

    const certification = await CompanyCertification.create({
      title: title.trim(),
      issuer: issuer.trim(),
      category: (category || "Accreditation").trim(),
      credentialId: (credentialId || "").trim(),
      issueDate: (issueDate || "").trim(),
      expiryDate: (expiryDate || "").trim(),
      description: (description || "").trim(),
      image: image.trim(),
      verificationUrl: (verificationUrl || "").trim(),
      highlights: Array.isArray(highlights) ? highlights : [],
      order: order !== undefined ? Number(order) : count,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isFeatured: Boolean(isFeatured),
    });

    res.status(201).json({
      success: true,
      data: certification,
      message: "Certification added successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCompanyCertification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    const certification = await CompanyCertification.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!certification) {
      return res.status(404).json({
        success: false,
        message: "Certification not found.",
      });
    }

    res.json({
      success: true,
      data: certification,
      message: "Certification updated successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteCompanyCertification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const certification = await CompanyCertification.findByIdAndDelete(id);

    if (!certification) {
      return res.status(404).json({
        success: false,
        message: "Certification not found.",
      });
    }

    res.json({
      success: true,
      message: `Certification "${certification.title}" removed successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleCompanyCertificationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const certification = await CompanyCertification.findById(id);

    if (!certification) {
      return res.status(404).json({
        success: false,
        message: "Certification not found.",
      });
    }

    certification.isActive = !certification.isActive;
    await certification.save();

    res.json({
      success: true,
      data: certification,
      message: `Certification "${certification.title}" is now ${
        certification.isActive ? "Active" : "Paused"
      }.`,
    });
  } catch (err) {
    next(err);
  }
};


