/**
 * Global setup — boots one in-memory MongoDB for the whole test run.
 *
 * `mongodb-memory-server` downloads and caches a MongoDB binary on first use.
 * If the download is blocked in a given environment, set
 * `MONGOMS_SYSTEM_BINARY` to a local mongod and the suite still works.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-not-used-in-production';

  const mongo = await MongoMemoryServer.create();
  global.__MONGO_SERVER__ = mongo;
  process.env.MONGO_URI = mongo.getUri('syict_test');
};
