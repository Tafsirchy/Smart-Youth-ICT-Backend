const NodeCache = require("node-cache");

/**
 * Singleton Cache Service for User Security Lookups
 * 
 * Standard TTL: 15 Minutes (enough for significant DB offloading)
 * Check period: 60 seconds (garbage collection)
 */
const userCache = new NodeCache({ stdTTL: 900, checkperiod: 60 });

module.exports = {
  /**
   * Retrieve user from cache
   * @param {string|ObjectId} id
   */
  get: (id) => {
    if (!id) return null;
    return userCache.get(id.toString());
  },

  /**
   * Store user in cache
   * @param {string|ObjectId} id 
   * @param {Object} data 
   */
  set: (id, data) => {
    if (!id || !data) return;
    return userCache.set(id.toString(), data);
  },

  /**
   * Invalidate a specific user from cache
   * @param {string|ObjectId} id 
   */
  del: (id) => {
    if (!id) return;
    return userCache.del(id.toString());
  },

  /**
   * Clear entire cache
   */
  flush: () => userCache.flushAll()
};
