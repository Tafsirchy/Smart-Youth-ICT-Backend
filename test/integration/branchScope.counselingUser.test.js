/**
 * Branch authorization for counseling sessions and user administration.
 *
 * Counseling used to resolve a branch reference with a private helper that
 * performed no authorization check, so a branch manager could read (and
 * write) the sessions of any other branch by passing a branch slug. These
 * cases lock that down and also cover the mass-assignment guard on the
 * session update endpoint.
 */
const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const { createBranch } = require('../helpers/fixtures');
const CounselingSession = require('../../src/models/CounselingSession');
const User = require('../../src/models/User');

describe('counseling and user administration branch scope', () => {
  let branchA;
  let branchB;

  beforeEach(async () => {
    branchA = await createBranch({ name: 'Campus Alpha', code: 'ALPHA' });
    branchB = await createBranch({ name: 'Campus Beta', code: 'BETA' });
  });

  describe('counseling sessions', () => {
    const createSession = (branchId, overrides = {}) =>
      CounselingSession.create({
        branchId,
        fullName: 'Prospective Student',
        phone: '01700000009',
        preferredDate: new Date('2026-11-05'),
        preferredSlot: '11:00 AM - 12:00 PM',
        ...overrides,
      });

    it('returns only the sessions of the caller branch', async () => {
      await createSession(branchA._id, { fullName: 'Alpha Student' });
      await createSession(branchB._id, { fullName: 'Beta Student' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/counseling').set(admin.auth);

      expect(res.status).toBe(200);
      const names = res.body.data.map((session) => session.fullName);
      expect(names).toEqual(['Alpha Student']);
    });

    it('denies listing the sessions of another branch addressed by slug', async () => {
      await createSession(branchB._id, { fullName: 'Beta Student' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/counseling').query({ branchId: branchB.slug }).set(admin.auth);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('denies listing the sessions of another branch addressed by id', async () => {
      await createSession(branchB._id, { fullName: 'Beta Student' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/counseling').query({ branchId: branchB._id.toString() }).set(admin.auth);

      expect(res.status).toBe(403);
    });

    it('denies updating a session of another branch', async () => {
      const session = await createSession(branchB._id);

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .patch(`/api/counseling/${session._id}`)
        .set(admin.auth)
        .send({ status: 'enrolled' });

      expect(res.status).toBe(403);
      expect((await CounselingSession.findById(session._id)).status).toBe('booked');
    });

    it('does not let an update move a session to another branch', async () => {
      const session = await createSession(branchA._id);

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .patch(`/api/counseling/${session._id}`)
        .set(admin.auth)
        .send({ status: 'attended', branchId: branchB._id.toString() });

      expect(res.status).toBe(200);
      const updated = await CounselingSession.findById(session._id);
      expect(updated.status).toBe('attended');
      expect(updated.branchId.toString()).toBe(branchA._id.toString());
    });

    it('denies adding a note to a session of another branch', async () => {
      const session = await createSession(branchB._id);

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .post(`/api/counseling/${session._id}/notes`)
        .set(admin.auth)
        .send({ note: 'Not my student' });

      expect(res.status).toBe(403);
      expect((await CounselingSession.findById(session._id)).counselorNotes).toHaveLength(0);
    });

    it('denies deleting a session of another branch', async () => {
      const session = await createSession(branchB._id);

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().delete(`/api/counseling/${session._id}`).set(admin.auth);

      expect(res.status).toBe(403);
      expect(await CounselingSession.findById(session._id)).not.toBeNull();
    });

    it('books a public appointment against the requested branch', async () => {
      const res = await request()
        .post('/api/counseling/book')
        .send({
          branchId: branchB.slug,
          fullName: 'Walk In',
          phone: '01700000010',
          preferredDate: '2026-11-06',
          preferredSlot: '10:00 AM - 11:00 AM',
        });

      expect(res.status).toBe(201);
      const created = await CounselingSession.findById(res.body.data._id);
      expect(created.branchId.toString()).toBe(branchB._id.toString());
    });
  });

  describe('user administration', () => {
    it('denies reading a user of another branch', async () => {
      const otherAdmin = await createUser({ role: 'branch_admin', branchId: branchB._id });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request().get(`/api/users/${otherAdmin.user._id}`).set(admin.auth);

      expect(res.status).toBe(403);
    });

    it('denies toggling the status of a user of another branch', async () => {
      const otherAdmin = await createUser({ role: 'branch_admin', branchId: branchB._id });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request().patch(`/api/users/${otherAdmin.user._id}/status`).set(admin.auth);

      expect(res.status).toBe(403);
      expect((await User.findById(otherAdmin.user._id)).isActive).toBe(true);
    });

    it('lists only the users of the caller branch', async () => {
      const ownStudent = await createUser({ role: 'student', branchId: branchA._id });
      const foreignStudent = await createUser({ role: 'student', branchId: branchB._id });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/users').set(admin.auth);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((entry) => entry._id);
      expect(ids).toContain(ownStudent.user._id.toString());
      expect(ids).not.toContain(foreignStudent.user._id.toString());
    });

    it('denies listing the users of another branch addressed by slug', async () => {
      await createUser({ role: 'student', branchId: branchB._id });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/users').query({ branchId: branchB.slug }).set(admin.auth);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((entry) => entry._id);
      const foreign = await User.findOne({ branchId: branchB._id, role: 'student' });
      expect(ids).not.toContain(foreign._id.toString());
    });

    it('lets a super admin read a user of another branch', async () => {
      const otherAdmin = await createUser({ role: 'branch_admin', branchId: branchB._id });
      const superAdmin = await createUser({ role: 'super_admin' });

      const res = await request().get(`/api/users/${otherAdmin.user._id}`).set(superAdmin.auth);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(otherAdmin.user._id.toString());
    });
  });
});
