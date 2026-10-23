/**
 * Harness smoke test.
 *
 * Proves the suite can reach the real Express app, authenticate against a
 * real user document and read the database back. If this file fails, every
 * other test in the suite is untrustworthy.
 */
const { request } = require('./helpers/request');
const { createUser } = require('./helpers/auth');
const { createBranch, createAsset } = require('./helpers/fixtures');
const Asset = require('../src/models/Asset');

describe('test harness', () => {
  it('serves the health endpoint without a database round trip', async () => {
    const res = await request().get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    const res = await request().get('/api/assets');
    expect(res.status).toBe(401);
  });

  it('authenticates a real user against the real middleware stack', async () => {
    const branch = await createBranch();
    const { auth } = await createUser({ role: 'super_admin', branchId: branch._id });

    const res = await request().get('/api/assets').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('persists and reads fixtures from the in-memory database', async () => {
    const branch = await createBranch();
    await createAsset({ branchId: branch._id, name: 'Projector' });

    const found = await Asset.findOne({ name: 'Projector' });
    expect(found).toBeTruthy();
    expect(found.branchId.toString()).toBe(branch._id.toString());
  });
});
