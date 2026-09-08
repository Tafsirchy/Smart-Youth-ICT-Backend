const express = require('express');
const { 
  getGlobalStats, 
  getAllBranchesDetails, 
  updateBranch,
  deleteBranch,
  toggleBranchStatus,
  getBranchCoursesAssignment,
  updateBranchCoursesAssignment,
  onboardBranch,
  createMasterCourse,
  updateMasterCourse,
  getMasterCourses,
  deployMasterCourse, 
  toggleCourseAllBranches, 
  getGlobalFinanceReport, 
  getAuditLogs,
  getTickets,
  replyToTicket,
  resolveTicket,
  getSettings,
  updateSettings,
  getHelpArticles,
  createHelpArticle,
  updateHelpArticle,
  deleteHelpArticle,
  deleteMasterCourse
} = require('../controllers/super.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);
router.use(authorize('super_admin', 'super_management'));

// Global Analytics
router.get('/stats',    getGlobalStats);
router.get('/audit-logs', getAuditLogs);

// Branch Management
router.get('/branches',    getAllBranchesDetails);
router.post('/onboard-branch', onboardBranch);
router.put('/branches/:id',    updateBranch);
router.patch('/branches/:id/toggle-status', toggleBranchStatus);
router.delete('/branches/:id', deleteBranch);
router.get('/branches/:id/courses', getBranchCoursesAssignment);
router.put('/branches/:id/courses', updateBranchCoursesAssignment);

// Master Curriculum
router.get('/courses',           getMasterCourses);
router.post('/courses',          createMasterCourse);
router.put('/courses/:id',       updateMasterCourse);
router.delete('/courses/:id',    deleteMasterCourse);
router.post('/deploy-course',    deployMasterCourse);
router.patch('/courses/:id/toggle-all-branches', toggleCourseAllBranches);

// Global Finance
router.get('/finance',         getGlobalFinanceReport);

// Support & System
router.get('/tickets',       getTickets);
router.post('/tickets/:id/reply', replyToTicket);
router.put('/tickets/:id/resolve', resolveTicket);

router.get('/settings',      getSettings);
router.put('/settings',      updateSettings);

router.get('/help-center',      getHelpArticles);
router.post('/help-center',     createHelpArticle);
router.put('/help-center/:id',  updateHelpArticle);
router.delete('/help-center/:id', deleteHelpArticle);

module.exports = router;
