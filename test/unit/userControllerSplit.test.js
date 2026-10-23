const userController = require('../../src/controllers/user.controller');

describe('user controller split', () => {
  const expectedHandlers = [
    'getMyProfile',
    'updateMyProfile',
    'getAllUsers',
    'getUserById',
    'toggleUserStatus',
    'adminCreateUser',
    'inviteStaff',
    'acceptInvite',
    'adminUpdateUser',
    'adminDeleteUser',
    'updateUserRole',
    'getPublicInstructors',
    'getPermissionsCatalog',
    'getBranchStaff',
    'createBranchStaff',
    'updateStaffPermissions',
    'toggleBranchStaffStatus',
    'deleteBranchStaff',
    'verifyStudentPublic',
    'forceLogoutUser',
    'updateUserPermissions',
    'bulkUserAction',
    'bulkImportUsers',
  ];

  it('exports every user handler as a function', () => {
    expectedHandlers.forEach((handler) => {
      expect(typeof userController[handler]).toBe('function');
    });
  });

  it('exports exactly the expected number of handlers', () => {
    expect(Object.keys(userController).sort()).toEqual(expectedHandlers.sort());
  });
});
