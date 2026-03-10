/**
 * Build a mongoose-compatible pagination object.
 * @param {number} page  - current page (1-indexed)
 * @param {number} limit - items per page
 * @returns {{ skip: number, limit: number, page: number }}
 */
const paginate = (page = 1, limit = 10) => ({
  skip:  (Number(page) - 1) * Number(limit),
  limit: Number(limit),
  page:  Number(page),
});

module.exports = { paginate };
