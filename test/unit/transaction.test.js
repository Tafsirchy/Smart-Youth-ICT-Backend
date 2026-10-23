const { runWithTransaction } = require('../../src/utils/transaction');
const mongoose = require('mongoose');

describe('runWithTransaction utility', () => {
  it('executes a work function and returns its result', async () => {
    const result = await runWithTransaction(async (session) => {
      return { ok: true, hasSession: Boolean(session) };
    });

    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
  });

  it('propagates errors thrown inside the work function', async () => {
    await expect(
      runWithTransaction(async () => {
        throw new Error('Application error inside transaction');
      })
    ).rejects.toThrow('Application error inside transaction');
  });

  it('runs safely even when not connected to mongoose', async () => {
    const originalReadyState = mongoose.connection.readyState;
    try {
      // Temporarily mock disconnected state
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true, writable: true });
      const result = await runWithTransaction(async (session) => {
        expect(session).toBeNull();
        return 'fallback-executed';
      });
      expect(result).toBe('fallback-executed');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true, writable: true });
    }
  });
});
