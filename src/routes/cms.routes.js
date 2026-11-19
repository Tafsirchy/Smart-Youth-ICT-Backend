const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const {
  getTeam, createTeamMember, updateTeamMember, deleteTeamMember,
  getSuccessStories, adminGetSuccessStories, createSuccessStory, updateSuccessStory, deleteSuccessStory,
  getPartners, createPartner, updatePartner, deletePartner,
  getMemberships, createMembership, updateMembership, deleteMembership,
  getMentors, createMentor, updateMentor, deleteMentor, toggleFeaturedMentor,
  getTestimonials, updateTestimonialStatus, createTestimonial, updateTestimonial, deleteTestimonial,
  getWebServiceContent, updateWebServiceContent,
  getSettingByKey, getPublicSettings, updateSetting,
  getCompanyCertifications, adminGetCompanyCertifications,
  createCompanyCertification, updateCompanyCertification,
  deleteCompanyCertification, toggleCompanyCertificationStatus,
  getHomeERPs, adminGetHomeERPs, createHomeERP, updateHomeERP, deleteHomeERP, toggleHomeERPStatus,
  getHomeTechStacks, adminGetHomeTechStacks, createHomeTechStack, updateHomeTechStack, deleteHomeTechStack, toggleHomeTechStackStatus,
  getHomeBrands, adminGetHomeBrands, createHomeBrand, updateHomeBrand, deleteHomeBrand, toggleHomeBrandStatus
} = require("../controllers/cms.controller");

const router = express.Router();

// 🔓 Public Routes (for the website)
router.get("/settings/public", getPublicSettings);
router.get("/settings/:key", getSettingByKey);
router.get("/team", getTeam);
router.get("/stories", getSuccessStories);
router.get("/partners", getPartners);
router.get("/memberships", getMemberships);
router.get("/certifications", getCompanyCertifications);
router.get("/about-certifications", getCompanyCertifications);
router.get("/mentors", getMentors);
router.get("/home-erp", getHomeERPs);
router.get("/home-tech", getHomeTechStacks);
router.get("/home-brands", getHomeBrands);
router.get("/services/web-software/:pageType", getWebServiceContent);
router.get("/services/creative-marketing/:pageType", getWebServiceContent);
router.get("/services/content-seo/:pageType", getWebServiceContent);
router.get("/services/ai-managed/:pageType", getWebServiceContent);

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
router.get("/partners/admin", getPartners);
router.post("/partners", createPartner);
router.put("/partners/:id", updatePartner);
router.delete("/partners/:id", deletePartner);

// Memberships
router.get("/memberships/admin", getMemberships);
router.post("/memberships", createMembership);
router.put("/memberships/:id", updateMembership);
router.delete("/memberships/:id", deleteMembership);

// 📜 Institutional Certifications (/about/certifications)
router.get("/certifications/admin", adminGetCompanyCertifications);
router.post("/certifications", createCompanyCertification);
router.put("/certifications/:id", updateCompanyCertification);
router.delete("/certifications/:id", deleteCompanyCertification);
router.patch("/certifications/:id/toggle", toggleCompanyCertificationStatus);

// Mentors
router.post("/mentors", createMentor);
router.patch("/mentors/:id", updateMentor);
router.delete("/mentors/:id", deleteMentor);
router.patch("/mentors/:id/toggle", toggleFeaturedMentor);

// Testimonials
router.get("/testimonials", getTestimonials);
router.get("/testimonials/admin", getTestimonials);
router.post("/testimonials", createTestimonial);
router.put("/testimonials/:id", updateTestimonial);
router.delete("/testimonials/:id", deleteTestimonial);
router.patch("/testimonials/:id/status", updateTestimonialStatus);

// 💻 Web & Software Services
router.put("/services/web-software/:pageType", updateWebServiceContent);
router.put("/services/creative-marketing/:pageType", updateWebServiceContent);
router.put("/services/content-seo/:pageType", updateWebServiceContent);
router.put("/services/ai-managed/:pageType", updateWebServiceContent);

// 🏢 Home ERP Showcase (Admin)
router.get("/home-erp/admin", adminGetHomeERPs);
router.post("/home-erp", createHomeERP);
router.put("/home-erp/:id", updateHomeERP);
router.delete("/home-erp/:id", deleteHomeERP);
router.patch("/home-erp/:id/toggle", toggleHomeERPStatus);

// 💻 Home Tech Stack & Languages Showcase (Admin)
router.get("/home-tech/admin", adminGetHomeTechStacks);
router.post("/home-tech", createHomeTechStack);
router.put("/home-tech/:id", updateHomeTechStack);
router.delete("/home-tech/:id", deleteHomeTechStack);
router.patch("/home-tech/:id/toggle", toggleHomeTechStackStatus);

// 🌐 Trusted Brands & Logo Cloud (Admin)
router.get("/home-brands/admin", adminGetHomeBrands);
router.post("/home-brands", createHomeBrand);
router.put("/home-brands/:id", updateHomeBrand);
router.delete("/home-brands/:id", deleteHomeBrand);
router.patch("/home-brands/:id/toggle", toggleHomeBrandStatus);

// ⚙️ System Settings (Admin write)
router.patch("/settings/:key", updateSetting);

module.exports = router;
