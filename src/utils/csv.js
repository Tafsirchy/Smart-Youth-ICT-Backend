/**
 * CSV Security Utilities
 *
 * Prevents CSV Formula Injection (CWE-1236) where user-supplied inputs
 * starting with `=`, `+`, `-`, `@`, `\t`, or `\r` can execute arbitrary formulas
 * when opened in spreadsheet software like Microsoft Excel or LibreOffice Calc.
 */

const FORMULA_PREFIXES = /^[=+@-|\t\r]/;

/**
 * Escapes and neutralizes a value for safe CSV serialization.
 *
 * @param {*} val - Value to serialize
 * @returns {string} Safe CSV cell string enclosed in double quotes
 */
const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');

  // If the cell begins with a formula trigger character, prepend a single quote
  // to force the spreadsheet application to treat it as a literal string.
  if (FORMULA_PREFIXES.test(str)) {
    str = `'${str}`;
  }

  return `"${str}"`;
};

module.exports = {
  sanitizeCsvCell,
};
