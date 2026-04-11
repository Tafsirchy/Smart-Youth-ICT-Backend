const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const {
  getTeam, createTeamMember, updateTeamMember, deleteTeamMember,
  getSuccessStories, adminGetSuccessStories, createSuccessStory, updateSuccessStory, deleteSuccessStory,
  getPartners, createPartner, updatePartner, deletePartner,
  getFeaturedMentors, toggleFeaturedMentor,
  getTestimonials, updateTestimonialStatus
} = require("../controllers/cms.controller");

const router = express.Router();

// 🔓 Public Routes (for the website)
router.get("/team", getTeam);
router.get("/stories", getSuccessStories);
router.get("/partners", getPartners);
router.get("/mentors", getFeaturedMentors);

// 🛡️ Admin Routes (Super Admin Only)
router.use(protect);
router.use(authorize("super_admin", "super_management"));

// Team
router.post("/team", createTeamMember);
router.put("/team/:id", updateTeamMember);
router.delete("/team/:id", deleteTeamMember);

// Stories
router.get("/stories/admin", adminGetSuccessStories);
router.post("/stories", createSuccessStory);
router.put("/stories/:id", updateSuccessStory);
router.delete("/stories/:id", deleteSuccessStory);

// Partners
router.post("/partners", createPartner);
router.put("/partners/:id", updatePartner);
router.delete("/partners/:id", deletePartner);

// Mentors
router.patch("/mentors/:id/toggle", toggleFeaturedMentor);

// Testimonials
router.get("/testimonials", getTestimonials);
router.patch("/testimonials/:id/status", updateTestimonialStatus);

module.exports = router;
