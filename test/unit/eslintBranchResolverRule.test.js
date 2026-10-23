/**
 * The lint configuration is part of the branch-isolation guarantee, so it
 * needs a test of its own: a controller that defines its own branch
 * resolver has to be reported as an error, while the shared helper in
 * `src/utils/branchHelper.js` has to stay allowed.
 */
const path = require('path');
const { ESLint } = require('eslint');

const projectRoot = path.resolve(__dirname, '..', '..');

const lint = async (code, filePath) => {
  const eslint = new ESLint({ cwd: projectRoot });
  const results = await eslint.lintText(code, { filePath: path.join(projectRoot, filePath) });
  return results.flatMap((result) => result.messages);
};

describe('eslint branch resolver rule', () => {
  jest.setTimeout(60000);

  it('reports a locally defined resolveBranchId in a controller', async () => {
    const messages = await lint(
      `const mongoose = require('mongoose');
async function resolveBranchId(target) {
  return mongoose.Types.ObjectId.isValid(target) ? target : null;
}
module.exports = { resolveBranchId };
`,
      'src/controllers/__lint_probe__.js'
    );

    const restricted = messages.filter((message) => message.ruleId === 'no-restricted-syntax');
    expect(restricted.length).toBeGreaterThan(0);
    expect(restricted[0].severity).toBe(2);
    expect(restricted[0].message).toMatch(/branchHelper/);
  });

  it('reports a locally defined resolveBranchId assigned to a const', async () => {
    const messages = await lint(
      `const resolveBranchId = (target) => target;
module.exports = { resolveBranchId };
`,
      'src/controllers/__lint_probe__.js'
    );

    expect(messages.some((message) => message.ruleId === 'no-restricted-syntax')).toBe(true);
  });

  it('allows the shared helper to define resolveBranchId', async () => {
    const messages = await lint(
      `const resolveBranchId = (req, requestedBranchId) => requestedBranchId;
module.exports = { resolveBranchId };
`,
      'src/utils/__lint_probe__.js'
    );

    expect(messages.some((message) => message.ruleId === 'no-restricted-syntax')).toBe(false);
  });
});
