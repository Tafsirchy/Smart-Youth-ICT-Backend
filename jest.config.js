/**
 * Jest configuration — backend integration suite.
 *
 * The suite drives the real Express application (`src/app.js`) through
 * Supertest against an in-memory MongoDB. It is deliberately an integration
 * suite: the defects this project shipped (branch-scope leaks, mass-assigned
 * fields, client-supplied prices) are only observable through the full
 * middleware stack.
 */
module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js',
  setupFiles: ['<rootDir>/test/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/test/setupAfterEnv.js'],
  testMatch: ['<rootDir>/test/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/test/helpers/'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/jobs/**',
  ],
  testTimeout: 30000,
  // The in-memory MongoDB instance is shared across the run; a single worker
  // keeps the connection stable and the suite deterministic.
  maxWorkers: 1,
  // The worker's mongoose handle outlives the last test file; the mongod
  // process is stopped by globalTeardown, so the worker is force-exited.
  forceExit: true,
  verbose: true,
};
