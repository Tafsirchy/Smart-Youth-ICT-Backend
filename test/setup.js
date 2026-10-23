/**
 * Runs before the test framework is installed, in every worker.
 *
 * `dotenv` never overrides variables that are already present in
 * `process.env`, so the values set here win over the developer's real `.env`.
 * That is what keeps the suite from ever touching a live database.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-not-used-in-production';
process.env.JWT_EXPIRES_IN = '1h';

// Keep the access log out of the test output.
process.env.MORGAN_SILENT = 'true';
