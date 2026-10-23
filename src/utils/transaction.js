const mongoose = require('mongoose');

/**
 * Execute a unit of work inside a MongoDB transaction if the connected
 * deployment supports it (ReplicaSet / MongoDB Atlas / mongos).
 *
 * If running on a standalone MongoDB deployment (such as in local tests
 * or basic single-node dev instances), gracefully falls back to direct
 * execution so tests and dev environments continue functioning without
 * requiring replica set configuration.
 *
 * @param {Function} workFn - async (session) => Promise<any>
 * @returns {Promise<any>}
 */
async function runWithTransaction(workFn) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return await workFn(null);
  }

  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    return await workFn(null);
  }

  try {
    let result;
    await session.withTransaction(async () => {
      result = await workFn(session);
    });
    return result;
  } catch (err) {
    const msg = err && err.message ? err.message : '';
    if (
      msg.includes('Transaction numbers are only allowed on a replica set member') ||
      msg.includes('This MongoDB deployment does not support retryable writes') ||
      msg.includes('Standalone')
    ) {
      return await workFn(null);
    }
    throw err;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        // Ignored: session cleanup is best-effort
      }
    }
  }
}

module.exports = { runWithTransaction };
