/**
 * Structured application log.
 *
 * Every line is a single JSON object so it can be shipped to a log store
 * without a parser. Credentials never reach a line: a context key that looks
 * like a secret is replaced before the line is written, and the message
 * itself is length limited.
 */

const crypto = require('crypto');

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const SECRET_KEY_PATTERN = /(token|secret|password|passwd|authorization|cookie|apikey|api_key|otp|credential|privatekey|signature)/i;

const REDACTED = '[REDACTED]';
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 4;

/**
 * The active level.
 *
 * `LOG_LEVEL` wins; otherwise the level follows the environment. The test
 * environment is silent so a failing assertion is not buried in log noise.
 *
 * @returns {string}
 */
const resolveLevel = () => {
  const configured = String(process.env.LOG_LEVEL || '').toLowerCase();
  if (configured && LEVELS[configured] !== undefined) return configured;
  if (process.env.NODE_ENV === 'test') return 'silent';
  if (process.env.NODE_ENV === 'development') return 'debug';
  return 'info';
};

/**
 * Make a value safe to log.
 *
 * @param {*} value
 * @param {number} [depth]
 * @returns {*}
 */
const redactValue = (value, depth = 0) => {
  if (value === null || value === undefined) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      code: value.code,
      stack: value.stack,
    };
  }

  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[buffer ${value.length}]`;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (depth >= MAX_DEPTH) return '[depth limit]';

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const safe = {};
    for (const [key, entry] of Object.entries(value)) {
      safe[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactValue(entry, depth + 1);
    }
    return safe;
  }

  return String(value);
};

/**
 * Write one log line.
 *
 * @param {string} level
 * @param {string} message
 * @param {Object} [context]
 * @param {Object} [bound] - context bound by `child()`
 */
const write = (level, message, context = {}, bound = {}) => {
  if (LEVELS[level] < LEVELS[resolveLevel()]) return;

  const line = {
    ts: new Date().toISOString(),
    level,
    message: String(message).slice(0, MAX_STRING_LENGTH),
    ...redactValue(bound, 0),
    ...redactValue(context, 0),
  };

  process.stdout.write(`${JSON.stringify(line)}\n`);
};

/**
 * Build a logger.
 *
 * @param {Object} [boundContext] - context added to every line
 */
const createLogger = (boundContext = {}) => ({
  debug: (message, context = {}) => write('debug', message, context, boundContext),
  info: (message, context = {}) => write('info', message, context, boundContext),
  warn: (message, context = {}) => write('warn', message, context, boundContext),
  error: (message, context = {}) => write('error', message, context, boundContext),
  child: (context = {}) => createLogger({ ...boundContext, ...context }),
});

const logger = createLogger();

/**
 * A fresh request identifier.
 *
 * @returns {string}
 */
const createRequestId = () => crypto.randomUUID();

module.exports = {
  logger,
  createLogger,
  createRequestId,
  redactValue,
  resolveLevel,
  LEVELS,
};
