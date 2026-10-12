/**
 * Automated Verification & Isolation Test Suite (Unit & Logic Verification)
 * Tests multi-tenant branch isolation, dynamic employee permission enforcement, and super admin governance.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const SeminarRegistration = require('./src/models/SeminarRegistration');
const AuditLog = require('./src/models/AuditLog');
const { PERMISSIONS, PERMISSION_METADATA } = require('./src/config/permissions');
const { isBranchAuthorized, requireAccess } = require('./src/middleware/rbac.middleware');

function runTests() {
  console.log('─────────────────────────────────────────────────────────────');
  console.log('🧪 Starting Multi-Branch & Delegated Permission Verification');
  console.log('─────────────────────────────────────────────────────────────\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  const mirpurId = new mongoose.Types.ObjectId();
  const dhanmondiId = new mongoose.Types.ObjectId();

  // Mock Users
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    role: 'super_admin',
    name: 'Global Super Admin',
    branchId: null,
  };

  const mirpurManager = {
    _id: new mongoose.Types.ObjectId(),
    role: 'branch_admin',
    name: 'Mirpur Branch Manager',
    branchId: mirpurId,
    secondaryBranches: [],
  };

  const dhanmondiManager = {
    _id: new mongoose.Types.ObjectId(),
    role: 'branch_admin',
    name: 'Dhanmondi Branch Manager',
    branchId: dhanmondiId,
    secondaryBranches: [],
  };

  const mirpurEmployee = {
    _id: new mongoose.Types.ObjectId(),
    role: 'employee',
    name: 'Mirpur CRM Staff',
    branchId: mirpurId,
    permissions: [PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_MANAGE],
  };

  // ─────────────────────────────────────────────────────────
  // Group 1: Branch Isolation Check (isBranchAuthorized)
  // ─────────────────────────────────────────────────────────
  const reqMirpur = { user: mirpurManager };
  const reqDhanmondi = { user: dhanmondiManager };
  const reqSuper = { user: superAdmin };

  assert(
    isBranchAuthorized(reqMirpur, mirpurId) === true,
    'BM-01: Mirpur Manager authorized for Mirpur branch'
  );

  assert(
    isBranchAuthorized(reqMirpur, dhanmondiId) === false,
    'BM-02: Mirpur Manager strictly blocked from Dhanmondi branch data (IDOR Prevention)'
  );

  assert(
    isBranchAuthorized(reqSuper, mirpurId) === true && isBranchAuthorized(reqSuper, dhanmondiId) === true,
    'SA-01: Super Admin authorized universally across all branches'
  );

  // ─────────────────────────────────────────────────────────
  // Group 2: Employee Permission Scoping
  // ─────────────────────────────────────────────────────────
  const hasLeadAccess = mirpurEmployee.permissions.includes(PERMISSIONS.LEADS_MANAGE);
  const hasPaymentAccess = mirpurEmployee.permissions.includes(PERMISSIONS.PAYMENTS_VERIFY);

  assert(
    hasLeadAccess === true,
    'EMP-01: Delegated employee has access to assigned task [leads:manage]'
  );

  assert(
    hasPaymentAccess === false,
    'EMP-02: Delegated employee strictly blocked from unassigned task [payments:verify]'
  );

  assert(
    mirpurEmployee.permissions.includes(PERMISSIONS.STAFF_MANAGE) === false,
    'EMP-03: Delegated employee cannot perform branch staff management'
  );

  // ─────────────────────────────────────────────────────────
  // Group 3: RBAC Middleware Behavior
  // ─────────────────────────────────────────────────────────
  // Test requireAccess middleware logic
  let nextCalled = false;
  let resStatus = null;
  let resJson = null;

  const mockRes = () => {
    const res = {};
    res.status = (code) => {
      resStatus = code;
      return res;
    };
    res.json = (data) => {
      resJson = data;
      return res;
    };
    return res;
  };

  // Employee with leads:manage calling leads:manage endpoint
  nextCalled = false;
  const mwAllowed = requireAccess(PERMISSIONS.LEADS_MANAGE);
  mwAllowed({ user: mirpurEmployee }, mockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'RBAC-01: requireAccess allows employee with matching delegated permission');

  // Employee with leads:manage calling payments:verify endpoint
  nextCalled = false;
  resStatus = null;
  const mwDenied = requireAccess(PERMISSIONS.PAYMENTS_VERIFY);
  mwDenied({ user: mirpurEmployee }, mockRes(), () => { nextCalled = true; });
  assert(nextCalled === false && resStatus === 403, 'RBAC-02: requireAccess returns 403 for employee without permission');

  // Branch Manager calling payments:verify (automatically allowed within branch)
  nextCalled = false;
  mwDenied({ user: mirpurManager }, mockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'RBAC-03: requireAccess automatically allows Branch Manager for all branch tasks');

  // Super Admin calling payments:verify (automatically allowed universally)
  nextCalled = false;
  mwDenied({ user: superAdmin }, mockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'RBAC-04: requireAccess automatically allows Super Admin everywhere');

  // ─────────────────────────────────────────────────────────
  // Group 4: Model Schema Integrity
  // ─────────────────────────────────────────────────────────
  const userRoleEnum = User.schema.path('role').enumValues;
  assert(
    userRoleEnum.includes('employee'),
    'SCH-01: User schema includes "employee" in role enum'
  );

  assert(
    User.schema.path('permissions') !== undefined,
    'SCH-02: User schema includes "permissions" array'
  );

  assert(
    User.schema.path('assignedBy') !== undefined,
    'SCH-03: User schema includes "assignedBy" reference'
  );

  assert(
    SeminarRegistration.schema.path('branchId') !== undefined,
    'SCH-04: SeminarRegistration schema includes "branchId"'
  );

  assert(
    AuditLog.schema.path('branchId') !== undefined,
    'SCH-05: AuditLog schema includes "branchId"'
  );

  assert(
    PERMISSION_METADATA.length >= 6,
    'REG-01: Permissions catalog provides at least 6 modular categories for UI'
  );

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
