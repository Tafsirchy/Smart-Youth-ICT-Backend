/**
 * Super admin endpoints.
 *
 * The handlers of the former god file now live in the sub-controllers under
 * src/controllers/super, and the index re-exports them. These tests make sure
 * the split did not lose a handler, and that the role guard still keeps the
 * super endpoints out of reach of branch level accounts.
 */
const superController = require('../../src/controllers/super.controller');

const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const { createBranch } = require('../helpers/fixtures');

const EXPECTED_HANDLERS = [
  'getGlobalStats',
  'getAllBranchesDetails',
  'deployMasterCourse',
  'syncMasterCourseLessons',
  'getBranchCoursesAssignment',
  'updateBranchCoursesAssignment',
  'toggleCourseAllBranches',
  'getGlobalFinanceReport',
  'exportGlobalLedger',
  'onboardBranch',
  'updateBranch',
  'toggleBranchStatus',
  'deleteBranch',
  'createMasterCourse',
  'updateMasterCourse',
  'getMasterCourses',
  'deleteMasterCourse',
  'getTickets',
  'replyToTicket',
  'escalateTicket',
  'resolveTicket',
  'getSettings',
  'updateSettings',
  'getHelpArticles',
  'createHelpArticle',
  'updateHelpArticle',
  'deleteHelpArticle',
  'getAuditLogs',
  'getBranchLeaderboardAnalytics',
  'transferStudentBranch',
  'sendEmergencyBroadcast',
  'getBroadcastLogs',
  'getDevopsHealthProbe',
  'getDatabaseBackupPreview',
  'downloadDatabaseBackup',
];

describe('super admin controller split', () => {
  it('exports every handler exactly once', () => {
    EXPECTED_HANDLERS.forEach((handler) => {
      expect(typeof superController[handler]).toBe('function');
    });

    expect(Object.keys(superController).sort()).toEqual([...EXPECTED_HANDLERS].sort());
  });

  it('keeps the super endpoints closed for branch admins', async () => {
    const branch = await createBranch();
    const branchAdmin = await createUser({ role: 'branch_admin', branchId: branch._id });

    const response = await request().get('/api/super/stats').set(branchAdmin.auth);

    expect(response.status).toBe(403);
  });

  it('serves the global stats to a super admin', async () => {
    const superAdmin = await createUser({ role: 'super_admin' });

    const response = await request().get('/api/super/stats').set(superAdmin.auth);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  it('serves the branch list to a super admin', async () => {
    const superAdmin = await createUser({ role: 'super_admin' });

    const response = await request().get('/api/super/branches').set(superAdmin.auth);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});
