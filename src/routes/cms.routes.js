const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const {
  getTeam, createTeamMember, updateTeamMember, deleteTeamMember,
  getSuccessStories, adminGetSuccessStories, createSuccessStory, updateSuccessStory, deleteSuccessStory,
  getPartners, createPartner, updatePartner, deletePartner,
  getMentors, createMentor, updateMentor, deleteMentor, toggleFeaturedMentor,
  getTestimonials, updateTestimonialStatus, createTestimonial, updateTestimonial, deleteTestimonial,
  getServicePageContent, updateServicePageContent,
  getCareerTracks, createCareerTrack, updateCareerTrack, deleteCareerTrack,
  getCertificationPrograms, createCertificationProgram, updateCertificationProgram, deleteCertificationProgram,
  getFreelancingPrograms, createFreelancingProgram, updateFreelancingProgram, deleteFreelancingProgram,
  getJobPlacements, createJobPlacement, updateJobPlacement, deleteJobPlacement,
  getWebServiceContent, updateWebServiceContent
} = require("../controllers/cms.controller");

const router = express.Router();

// 🔓 Public Routes (for the website)
router.get("/team", getTeam);
router.get("/stories", getSuccessStories);
router.get("/partners", getPartners);
router.get("/mentors", getMentors);
router.get("/services/content/:pageType", getServicePageContent);
router.get("/services/career-tracks", getCareerTracks);
router.get("/services/certifications", getCertificationPrograms);
router.get("/services/freelancing", getFreelancingPrograms);
router.get("/services/job-placements", getJobPlacements);
router.get("/services/web-software/:pageType", getWebServiceContent);

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
router.post("/mentors", createMentor);
router.patch("/mentors/:id", updateMentor);
router.delete("/mentors/:id", deleteMentor);
router.patch("/mentors/:id/toggle", toggleFeaturedMentor);

// Testimonials
router.get("/testimonials", getTestimonials);
router.post("/testimonials", createTestimonial);
router.put("/testimonials/:id", updateTestimonial);
router.delete("/testimonials/:id", deleteTestimonial);
router.patch("/testimonials/:id/status", updateTestimonialStatus);

// 🎓 Career Services (Admin Only)
router.put("/services/content/:pageType", updateServicePageContent);

router.post("/services/career-tracks", createCareerTrack);
router.put("/services/career-tracks/:id", updateCareerTrack);
router.delete("/services/career-tracks/:id", deleteCareerTrack);

router.post("/services/certifications", createCertificationProgram);
router.put("/services/certifications/:id", updateCertificationProgram);
router.delete("/services/certifications/:id", deleteCertificationProgram);

router.post("/services/freelancing", createFreelancingProgram);
router.put("/services/freelancing/:id", updateFreelancingProgram);
router.delete("/services/freelancing/:id", deleteFreelancingProgram);

router.post("/services/job-placements", createJobPlacement);
router.put("/services/job-placements/:id", updateJobPlacement);
router.delete("/services/job-placements/:id", deleteJobPlacement);

// 💻 Web & Software Services
router.put("/services/web-software/:pageType", updateWebServiceContent);

module.exports = router;
