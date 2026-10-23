/**
 * Origin allowlist for the API.
 *
 * Three sources are combined into the exact-match set:
 *   1. FRONTEND_URL - the primary front-end deployment.
 *   2. A static list of stable origins.
 *   3. ALLOWED_ORIGINS - extra exact origins, comma separated.
 *
 * ALLOWED_ORIGIN_PATTERNS additionally admits origins that match an explicit
 * pattern. That is how a Vercel preview deployment is allowed without
 * re-opening every `*.vercel.app` host, which the previous suffix check did.
 * A pattern is matched against the whole origin, so it can never match a
 * host it was not written for.
 */

// A value copied out of a file or a terminal usually keeps a trailing newline.
// Both a real line break and an escaped "\r\n" have to be removed, otherwise
// the origin never matches and every request is rejected.
const cleanValue = (value) =>
  String(value == null ? '' : value)
    .replace(/\\r\\n/g, '')
    .replace(/[\r\n]+/g, '')
    .trim();

const normalizeOrigin = (value) => cleanValue(value).replace(/\/+$/, '');

const STATIC_ORIGINS = [
  'https://syict-frontend.vercel.app',
  'https://smart-youth-ict-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.smartyouthict.com',
  'https://smartyouthict.com',
];

const compilePatterns = (raw) => {
  const patterns = [];

  for (const entry of String(raw || '').split(',')) {
    const source = entry.trim();
    if (!source) continue;

    try {
      // Anchored at both ends, so the pattern has to describe the entire
      // origin. `https://app.vercel.app` can therefore not be matched by a
      // pattern that was written for a different host.
      patterns.push(new RegExp(`^(?:${source})$`));
    } catch {
      // A broken pattern must never take the API down.
      console.error(`[CORS] Ignoring invalid ALLOWED_ORIGIN_PATTERNS entry: ${source}`);
    }
  }

  return patterns;
};

/**
 * @param {object} env - the environment to read, defaults to process.env
 * @returns {{ exact: Set<string>, patterns: RegExp[], isAllowed: (origin?: string) => boolean }}
 */
const buildAllowedOrigins = (env = process.env) => {
  const exact = new Set(
    [
      env.FRONTEND_URL,
      ...STATIC_ORIGINS,
      ...String(env.ALLOWED_ORIGINS || '').split(','),
    ]
      .map(normalizeOrigin)
      .filter(Boolean)
  );

  const patterns = compilePatterns(env.ALLOWED_ORIGIN_PATTERNS);

  const isAllowed = (origin) => {
    // No Origin header: same-origin navigation, curl, or a server-to-server
    // call. The browser is not involved, so there is nothing to protect.
    if (!origin) return true;

    const normalized = normalizeOrigin(origin);
    if (exact.has(normalized)) return true;

    return patterns.some((pattern) => pattern.test(normalized));
  };

  return { exact, patterns, isAllowed };
};

module.exports = {
  STATIC_ORIGINS,
  buildAllowedOrigins,
  cleanValue,
  normalizeOrigin,
};
