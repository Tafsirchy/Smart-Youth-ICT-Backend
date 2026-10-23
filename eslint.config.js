/**
 * ESLint configuration for the backend API.
 *
 * The rules below exist to keep the branch-isolation and input-handling
 * guarantees of this codebase from silently regressing:
 *
 * - `no-restricted-syntax` forbids controllers from defining their own
 *   branch resolution helper. Every controller has to use the shared
 *   implementation in `src/utils/branchHelper.js`, otherwise two different
 *   notions of "the caller's branch" exist side by side.
 * - `eslint-plugin-security` flags dynamic regular expressions and dynamic
 *   property access, the two patterns behind the injection issues this
 *   project has had.
 */
const security = require('eslint-plugin-security');

const nodeGlobals = {
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  exports: 'writable',
  global: 'readonly',
  module: 'writable',
  process: 'readonly',
  require: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  queueMicrotask: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  AbortController: 'readonly',
  structuredClone: 'readonly',
  EventEmitter: 'readonly',
  crypto: 'readonly',
  Buffer: 'readonly',
};

const jestGlobals = {
  afterAll: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  it: 'readonly',
  test: 'readonly',
  jest: 'readonly',
};

// A local branch resolver is how the cross-tenant bugs got in: every copy
// resolved branches slightly differently.
const bannedLocalBranchResolvers = [
  {
    selector: 'FunctionDeclaration[id.name="resolveBranchId"]',
    message:
      'Do not define a local resolveBranchId in a controller — use the shared helpers in src/utils/branchHelper.js.',
  },
  {
    selector: 'VariableDeclarator[id.name="resolveBranchId"]',
    message:
      'Do not define a local resolveBranchId in a controller — use the shared helpers in src/utils/branchHelper.js.',
  },
  {
    selector: 'FunctionExpression[id.name="resolveBranchId"]',
    message:
      'Do not define a local resolveBranchId in a controller — use the shared helpers in src/utils/branchHelper.js.',
  },
];

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', '.git/**'],
  },
  {
    files: ['src/**/*.js', 'scripts/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    plugins: {
      security,
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-var': 'warn',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': 'off',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-object-injection': 'warn',
    },
  },
  {
    files: ['src/controllers/**/*.js'],
    rules: {
      'no-restricted-syntax': ['error', ...bannedLocalBranchResolvers],
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...nodeGlobals, ...jestGlobals },
    },
  },
];
