/**
 * Runs after the test framework is installed, in every worker.
 *
 * Establishes the database connection the same way the request path does
 * (through `src/config/db.js`, which caches the connection on `global`), then
 * resets every collection and the user cache before each test so cases cannot
 * leak state into one another.
 */
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const userCache = require('../src/utils/userCache');

beforeAll(async () => {
  await connectDB();
});

beforeEach(async () => {
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
  userCache.flush();
});
