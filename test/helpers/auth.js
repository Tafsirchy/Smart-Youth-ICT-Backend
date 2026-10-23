/**
 * Auth helpers — build real JWTs for real user documents.
 *
 * Tokens are signed with the production signing function so the suite
 * exercises the same token shape (`{ id, ver }`) the API and the socket
 * gateway accept.
 */
const User = require('../../src/models/User');
const { generateToken } = require('../../src/utils/jwt');

let counter = 0;

/**
 * Create a user and return it together with a bearer header.
 *
 * @param {Object} overrides - any User field; `role`, `branchId`,
 *   `secondaryBranches` and `permissions` are the ones the authorization
 *   suite varies most.
 */
const createUser = async (overrides = {}) => {
  counter += 1;
  const suffix = `${Date.now().toString(36)}${counter}`;

  const user = await User.create({
    name: overrides.name || `Test User ${counter}`,
    email: overrides.email || `user.${suffix}@test.local`,
    password: overrides.password || 'TestPassw0rd!',
    role: overrides.role || 'student',
    branchId: overrides.branchId,
    secondaryBranches: overrides.secondaryBranches || [],
    permissions: overrides.permissions || [],
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    tokenVersion: overrides.tokenVersion || 0,
    providers: ['credentials'],
  });

  const token = generateToken(user);

  return {
    user,
    token,
    id: user._id.toString(),
    auth: { Authorization: `Bearer ${token}` },
  };
};

/** Create a user without a password field (e.g. OAuth-only accounts). */
const createUserWithoutPassword = async (overrides = {}) => {
  const created = await createUser(overrides);
  await User.updateOne({ _id: created.user._id }, { $unset: { password: 1 } });
  return created;
};

module.exports = { createUser, createUserWithoutPassword, generateToken };
