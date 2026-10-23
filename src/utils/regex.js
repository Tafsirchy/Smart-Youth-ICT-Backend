/**
 * Safely escape regular expression special characters to prevent ReDoS and regex syntax injection.
 * @param {string} str - Raw input string
 * @returns {string} - Escaped string safe for RegExp or MongoDB $regex
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  escapeRegex,
};
