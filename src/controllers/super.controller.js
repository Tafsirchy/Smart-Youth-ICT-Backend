/**
 * Super admin endpoints.
 *
 * The handlers live in the sub-controllers under ./super — the route file
 * keeps importing this module, so no client or route change is involved.
 */
const analytics = require('./super/analytics.controller.js');
const branch = require('./super/branch.controller.js');
const course = require('./super/course.controller.js');
const ticket = require('./super/ticket.controller.js');
const backup = require('./super/backup.controller.js');
const support = require('./super/support.controller.js');

module.exports = {
  getGlobalStats: analytics.getGlobalStats,
  getGlobalFinanceReport: analytics.getGlobalFinanceReport,
  exportGlobalLedger: analytics.exportGlobalLedger,
  exportExecutiveSummary: analytics.exportExecutiveSummary,
  getBranchLeaderboardAnalytics: analytics.getBranchLeaderboardAnalytics,
  getDevopsHealthProbe: analytics.getDevopsHealthProbe,
  getAllBranchesDetails: branch.getAllBranchesDetails,
  onboardBranch: branch.onboardBranch,
  updateBranch: branch.updateBranch,
  toggleBranchStatus: branch.toggleBranchStatus,
  deleteBranch: branch.deleteBranch,
  getBranchCoursesAssignment: branch.getBranchCoursesAssignment,
  updateBranchCoursesAssignment: branch.updateBranchCoursesAssignment,
  transferStudentBranch: branch.transferStudentBranch,
  createMasterCourse: course.createMasterCourse,
  updateMasterCourse: course.updateMasterCourse,
  getMasterCourses: course.getMasterCourses,
  deleteMasterCourse: course.deleteMasterCourse,
  deployMasterCourse: course.deployMasterCourse,
  syncMasterCourseLessons: course.syncMasterCourseLessons,
  toggleCourseAllBranches: course.toggleCourseAllBranches,
  getTickets: ticket.getTickets,
  replyToTicket: ticket.replyToTicket,
  escalateTicket: ticket.escalateTicket,
  resolveTicket: ticket.resolveTicket,
  getDatabaseBackupPreview: backup.getDatabaseBackupPreview,
  downloadDatabaseBackup: backup.downloadDatabaseBackup,
  getSettings: support.getSettings,
  updateSettings: support.updateSettings,
  getHelpArticles: support.getHelpArticles,
  createHelpArticle: support.createHelpArticle,
  updateHelpArticle: support.updateHelpArticle,
  deleteHelpArticle: support.deleteHelpArticle,
  getAuditLogs: support.getAuditLogs,
  sendEmergencyBroadcast: support.sendEmergencyBroadcast,
  getBroadcastLogs: support.getBroadcastLogs,
};
