/**
 * Unit tests for the shared branch-scope resolver.
 *
 * This helper is the trust boundary for every branch-scoped route, so its
 * behaviour is pinned down case by case rather than inferred from the
 * controllers that use it.
 */
const { resolveBranchScope, isBranchAuthorized, getAllowedBranches } = require('../../src/utils/branchHelper');
const { createBranch } = require('../helpers/fixtures');

const asRequest = (user) => ({ user });

describe('branchHelper.resolveBranchScope', () => {
  let branchA;
  let branchB;

  beforeEach(async () => {
    branchA = await createBranch({ name: 'Alpha Campus', code: 'ALPHA' });
    branchB = await createBranch({ name: 'Beta Campus', code: 'BETA' });
  });

  describe('super roles', () => {
    const superUser = { role: 'super_admin', branchId: undefined, secondaryBranches: [] };

    it('spans every branch when no branch is requested', async () => {
      const scope = await resolveBranchScope(asRequest(superUser), undefined);
      expect(scope).toEqual({ branchId: null, isAll: true, denied: false });
    });

    it('spans every branch when "all" is requested', async () => {
      const scope = await resolveBranchScope(asRequest(superUser), 'all');
      expect(scope.isAll).toBe(true);
      expect(scope.denied).toBe(false);
    });

    it('may target any branch by id', async () => {
      const scope = await resolveBranchScope(asRequest(superUser), branchB._id.toString());
      expect(scope.branchId).toBe(branchB._id.toString());
      expect(scope.denied).toBe(false);
    });

    it('may target any branch by slug', async () => {
      const scope = await resolveBranchScope(asRequest(superUser), branchB.slug);
      expect(scope.branchId).toBe(branchB._id.toString());
    });

    it('may target any branch by code', async () => {
      const scope = await resolveBranchScope(asRequest(superUser), 'BETA');
      expect(scope.branchId).toBe(branchB._id.toString());
    });
  });

  describe('branch-scoped roles', () => {
    const scopedUser = {
      role: 'branch_admin',
      branchId: null,
      secondaryBranches: [],
    };

    it('pins to the primary branch when nothing is requested', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), undefined);
      expect(scope).toEqual({
        branchId: branchA._id.toString(),
        isAll: false,
        denied: false,
      });
    });

    it('allows the primary branch by id', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), branchA._id.toString());
      expect(scope.branchId).toBe(branchA._id.toString());
      expect(scope.denied).toBe(false);
    });

    it('allows the primary branch by slug', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), branchA.slug);
      expect(scope.branchId).toBe(branchA._id.toString());
    });

    it('allows the primary branch by code', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), 'ALPHA');
      expect(scope.branchId).toBe(branchA._id.toString());
    });

    it('allows a delegated secondary branch', async () => {
      scopedUser.branchId = branchA._id;
      scopedUser.secondaryBranches = [branchB._id];
      const scope = await resolveBranchScope(asRequest(scopedUser), branchB._id.toString());
      expect(scope.branchId).toBe(branchB._id.toString());
      expect(scope.denied).toBe(false);
    });

    it('denies a branch the user has no access to', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), branchB._id.toString());
      expect(scope.denied).toBe(true);
      expect(scope.branchId).toBeNull();
    });

    it('denies a foreign branch referenced by slug', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), branchB.slug);
      expect(scope.denied).toBe(true);
    });

    it('denies a foreign branch referenced by code', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), 'BETA');
      expect(scope.denied).toBe(true);
    });

    it('does not fall back to the primary branch for a denied request', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), branchB._id.toString());
      expect(scope.branchId).not.toBe(branchA._id.toString());
    });

    it('denies every branch when the user has none', async () => {
      const scope = await resolveBranchScope(asRequest({ role: 'employee' }), undefined);
      expect(scope.branchId).toBeNull();
      expect(scope.denied).toBe(false);
    });

    it('denies an unresolvable reference', async () => {
      scopedUser.branchId = branchA._id;
      const scope = await resolveBranchScope(asRequest(scopedUser), 'no-such-branch');
      expect(scope.denied).toBe(true);
    });
  });

  it('denies everything when the request carries no user', async () => {
    const scope = await resolveBranchScope({}, branchA._id.toString());
    expect(scope.denied).toBe(true);
  });
});

describe('branchHelper.isBranchAuthorized', () => {
  it('returns true for a super role regardless of the document branch', () => {
    expect(isBranchAuthorized(asRequest({ role: 'super_admin' }), 'anything')).toBe(true);
    expect(isBranchAuthorized(asRequest({ role: 'super_management' }), null)).toBe(true);
  });

  it('returns true for the primary branch', () => {
    const branchId = new (require('mongoose').Types.ObjectId)();
    const req = asRequest({ role: 'branch_admin', branchId });
    expect(isBranchAuthorized(req, branchId)).toBe(true);
  });

  it('returns true for a delegated secondary branch', () => {
    const primary = new (require('mongoose').Types.ObjectId)();
    const secondary = new (require('mongoose').Types.ObjectId)();
    const req = asRequest({ role: 'branch_admin', branchId: primary, secondaryBranches: [secondary] });
    expect(isBranchAuthorized(req, secondary)).toBe(true);
  });

  it('returns false for a foreign branch', () => {
    const primary = new (require('mongoose').Types.ObjectId)();
    const foreign = new (require('mongoose').Types.ObjectId)();
    const req = asRequest({ role: 'branch_admin', branchId: primary });
    expect(isBranchAuthorized(req, foreign)).toBe(false);
  });

  it('returns false when the document has no branch', () => {
    const branchId = new (require('mongoose').Types.ObjectId)();
    const req = asRequest({ role: 'branch_admin', branchId });
    expect(isBranchAuthorized(req, null)).toBe(false);
  });

  it('returns false without a user', () => {
    expect(isBranchAuthorized({}, 'anything')).toBe(false);
  });
});

describe('branchHelper.getAllowedBranches', () => {
  it('returns primary and secondary branches without duplicates', () => {
    const primary = new (require('mongoose').Types.ObjectId)();
    const secondary = new (require('mongoose').Types.ObjectId)();
    const allowed = getAllowedBranches({
      branchId: primary,
      secondaryBranches: [secondary, primary],
    });
    expect(allowed).toEqual([primary.toString(), secondary.toString()]);
  });

  it('returns an empty list without a user', () => {
    expect(getAllowedBranches(null)).toEqual([]);
  });
});
