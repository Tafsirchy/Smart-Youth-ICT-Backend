/**
 * Structured logging.
 *
 * A log line has to be machine readable, has to carry the request it belongs
 * to, and must never carry a credential.
 */
const fs = require('fs');
const path = require('path');

const { logger, createLogger, redactValue, resolveLevel } = require('../../src/utils/logger');
const { requestContext } = require('../../src/middleware/requestContext.middleware');

const SRC_DIR = path.join(__dirname, '..', '..', 'src');

const collectSourceFiles = (dir) => {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }

  return files;
};

const captureStdout = (run) => {
  const original = process.stdout.write;
  const lines = [];

  process.stdout.write = (chunk) => {
    lines.push(chunk.toString());
    return true;
  };

  try {
    run();
  } finally {
    process.stdout.write = original;
  }

  return lines.join('').split('\n').filter(Boolean);
};

describe('structured logger', () => {
  const originalLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    if (originalLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = originalLevel;
  });

  it('writes one JSON object per line', () => {
    process.env.LOG_LEVEL = 'info';
    const lines = captureStdout(() => logger.info('service started', { port: 5000 }));

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('service started');
    expect(parsed.port).toBe(5000);
    expect(typeof parsed.ts).toBe('string');
  });

  it('keeps the request context of the logger it was bound to', () => {
    process.env.LOG_LEVEL = 'info';
    const requestLogger = createLogger({ requestId: 'req-1', userId: 'user-1', branchId: 'branch-1' });
    const lines = captureStdout(() => requestLogger.warn('slow query', { ms: 900 }));

    const parsed = JSON.parse(lines[0]);
    expect(parsed.requestId).toBe('req-1');
    expect(parsed.userId).toBe('user-1');
    expect(parsed.branchId).toBe('branch-1');
    expect(parsed.ms).toBe(900);
  });

  it('never writes a credential', () => {
    const safe = redactValue({
      accessToken: 'secret-token',
      refreshToken: 'secret-refresh',
      password: 'secret-password',
      authorization: 'Bearer abc',
      cookie: 'sid=abc',
      apiKey: 'secret-key',
      otp: '123456',
      nested: { resetToken: 'secret-reset', keep: 'visible' },
    });

    expect(safe.accessToken).toBe('[REDACTED]');
    expect(safe.refreshToken).toBe('[REDACTED]');
    expect(safe.password).toBe('[REDACTED]');
    expect(safe.authorization).toBe('[REDACTED]');
    expect(safe.cookie).toBe('[REDACTED]');
    expect(safe.apiKey).toBe('[REDACTED]');
    expect(safe.otp).toBe('[REDACTED]');
    expect(safe.nested.resetToken).toBe('[REDACTED]');
    expect(safe.nested.keep).toBe('visible');
  });

  it('does not log below the configured level', () => {
    process.env.LOG_LEVEL = 'warn';
    const lines = captureStdout(() => {
      logger.info('quiet');
      logger.debug('quieter');
      logger.warn('loud');
    });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).message).toBe('loud');
  });

  it('is silent in the test environment by default', () => {
    delete process.env.LOG_LEVEL;
    expect(resolveLevel()).toBe('silent');
  });

  it('gives every request an id and a logger', () => {
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };

    requestContext(req, res, () => {});

    expect(req.requestId).toEqual(expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
    expect(typeof req.log.error).toBe('function');
  });

  it('keeps an inbound request id', () => {
    const req = { headers: { 'x-request-id': 'inbound-123' } };
    const res = { setHeader: jest.fn() };

    requestContext(req, res, () => {});

    expect(req.requestId).toBe('inbound-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'inbound-123');
  });
});

describe('source hygiene', () => {
  it('has no empty catch block left in the backend source', () => {
    const offenders = [];

    for (const file of collectSourceFiles(SRC_DIR)) {
      const source = fs.readFileSync(file, 'utf8');
      const pattern = /catch\s*(\([^)]*\))?\s*\{\s*\}/g;

      if (pattern.test(source)) {
        offenders.push(path.relative(SRC_DIR, file).replace(/\\/g, '/'));
      }
    }

    expect(offenders).toEqual([]);
  });
});
