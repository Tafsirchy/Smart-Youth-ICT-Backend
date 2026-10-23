const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const SUPER_ROLES = ['super_admin', 'super_management'];

/**
 * Every branch a user may act within: their primary branch plus any
 * secondary branches they have been delegated.
 *
 * @param {Object} user
 * @returns {string[]}
 */
const getAllowedBranches = (user) => {
  if (!user) return [];

  const branches = [];
  if (user.branchId) {
    branches.push(user.branchId.toString());
  }

  if (user.secondaryBranches && Array.isArray(user.secondaryBranches)) {
    user.secondaryBranches.forEach((branch) => {
      if (branch) {
        branches.push(branch.toString());
      }
    });
  }

  // Return unique branches
  return [...new Set(branches)];
};

/** Roles that are not confined to a single branch. */
const isSuperRole = (user) => Boolean(user) && SUPER_ROLES.includes(user.role);

/**
 * Controller-level helper to verify that a fetched document's branch matches
 * the user's branch.
 *
 * Lives here (rather than in the RBAC middleware) so that every branch-scope
 * check in the codebase goes through one implementation. `rbac.middleware.js`
 * re-exports it for backward compatibility.
 *
 * @param {Object} req - Express request object
 * @param {string|ObjectId} docBranchId - The branchId of the document being accessed
 * @returns {boolean} - true if authorized, false otherwise
 */
const isBranchAuthorized = (req, docBranchId) => {
  if (!req?.user) return false;
  if (isSuperRole(req.user)) return true;
  if (!docBranchId) return false;

  const allowedBranches = getAllowedBranches(req.user);
  return allowedBranches.includes(docBranchId.toString());
};

/**
 * Look up the branch a client-supplied reference points at.
 *
 * A reference is either an ObjectId, a branch slug or a branch code. The
 * lookup is shared by every caller that has to turn such a reference into a
 * branch id, so the resolution rules cannot drift apart per controller.
 *
 * @param {string|ObjectId|null|undefined} rawBranch
 * @param {{ verifyExists?: boolean }} options
 *   `verifyExists: true` confirms that the branch really exists (one extra
 *   query) — used where a reference comes from an unauthenticated caller.
 *   `verifyExists: false` (default) trusts an ObjectId-shaped reference
 *   without a round trip, because the authorization check that follows is
 *   what decides access.
 * @returns {Promise<string|null>} the branch id, or null when unresolvable
 */
const lookupBranchReference = async (rawBranch, { verifyExists = false } = {}) => {
  if (rawBranch === undefined || rawBranch === null || rawBranch === '') return null;

  const requested = String(rawBranch);

  // Required lazily so this helper stays usable from modules that are loaded
  // while the models are still being registered.
  const Branch = require('../models/Branch');

  if (OBJECT_ID_REGEX.test(requested)) {
    if (!verifyExists) return requested;
    const doc = await Branch.findById(requested)
      .select('_id')
      .lean();
    return doc ? doc._id.toString() : null;
  }

  const doc = await Branch.findOne({
    $or: [{ slug: requested.toLowerCase() }, { code: requested.toUpperCase() }],
  })
    .select('_id')
    .lean();
  return doc ? doc._id.toString() : null;
};

/**
 * Resolve a branch reference without any authorization check.
 *
 * Only for flows that legitimately have no signed-in caller yet (public
 * booking forms). Everything that runs on behalf of a user must go through
 * `resolveBranchScope` instead.
 *
 * @param {string|ObjectId|null|undefined} rawBranch
 * @returns {Promise<string|null>}
 */
const resolveBranchReference = (rawBranch) => lookupBranchReference(rawBranch, { verifyExists: true });

/**
 * Resolve the branch a request is scoped to.
 *
 * This is the single entry point for turning a client-supplied branch
 * reference into an authorized branch. It accepts an ObjectId, a branch slug
 * or a branch code, and it never returns a branch the caller may not act
 * within.
 *
 * The returned shape distinguishes the three outcomes a caller has to
 * handle, because "no branch" and "branch not allowed" are not the same
 * condition:
 *
 *   { branchId: null, isAll: true,  denied: false } — no specific branch;
 *                                                      super role, all branches
 *   { branchId: '...', isAll: false, denied: false } — the authorized branch
 *   { branchId: null, isAll: false, denied: true  } — the caller asked for a
 *                                                      branch it cannot access
 *
 * @param {Object} req - Express request (must carry `req.user`)
 * @param {string|ObjectId} rawBranch - branch id, slug or code from the request
 * @returns {Promise<{ branchId: string|null, isAll: boolean, denied: boolean }>}
 */
const resolveBranchScope = async (req, rawBranch) => {
  const user = req?.user;
  if (!user) return { branchId: null, isAll: false, denied: true };

  const isSuper = isSuperRole(user);
  const allowed = getAllowedBranches(user);

  const requested =
    rawBranch === undefined || rawBranch === null || rawBranch === '' || rawBranch === 'all'
      ? null
      : String(rawBranch);

  // No branch requested: super roles span every branch, everyone else is
  // pinned to their primary branch.
  if (!requested) {
    if (isSuper) return { branchId: null, isAll: true, denied: false };
    return { branchId: allowed[0] || null, isAll: false, denied: false };
  }

  const resolvedId = await lookupBranchReference(requested);

  if (!resolvedId) {
    // An unresolvable reference is a client error, not an authorization
    // failure — except for super roles, where it is equally unresolvable.
    return { branchId: null, isAll: false, denied: !isSuper };
  }

  if (isSuper) return { branchId: resolvedId, isAll: false, denied: false };

  if (!allowed.includes(resolvedId)) {
    return { branchId: null, isAll: false, denied: true };
  }

  return { branchId: resolvedId, isAll: false, denied: false };
};

/**
 * Synchronous branch resolution for callers that already hold a plain branch
 * id (for example a document loaded from the database).
 *
 * @param {Object} req
 * @param {string|ObjectId} requestedBranchId
 * @returns {string|null} an authorized branch id, or null
 */
const resolveBranchId = (req, requestedBranchId) => {
  const user = req?.user;
  if (!user) return null;

  const isSuper = isSuperRole(user);
  const requested = requestedBranchId && requestedBranchId !== 'all' ? String(requestedBranchId) : null;
  const isValidRequested = requested && OBJECT_ID_REGEX.test(requested);

  if (isSuper) {
    return isValidRequested ? requested : null;
  }

  const allowed = getAllowedBranches(user);
  if (isValidRequested && allowed.includes(requested)) {
    return requested;
  }

  return allowed[0] || null;
};

module.exports = {
  getAllowedBranches,
  isSuperRole,
  isBranchAuthorized,
  resolveBranchId,
  resolveBranchScope,
  resolveBranchReference,
  lookupBranchReference,
};
