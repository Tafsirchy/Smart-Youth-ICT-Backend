/**
 * Branch authorization matrix.
 *
 * These are the cross-tenant access tests that the codebase never had. Each
 * case asserts that a request from one branch cannot read or write another
 * branch's records.
 */
const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const { createBranch, createAsset, createExpense, createSchedule, createCourse } = require('../helpers/fixtures');
const Asset = require('../../src/models/Asset');
const Expense = require('../../src/models/Expense');
const ClassSchedule = require('../../src/models/ClassSchedule');

describe('branch authorization', () => {
  let branchA;
  let branchB;

  beforeEach(async () => {
    branchA = await createBranch({ name: 'Campus Alpha', code: 'ALPHA' });
    branchB = await createBranch({ name: 'Campus Beta', code: 'BETA' });
  });

  describe('GET /api/assets', () => {
    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request().get('/api/assets').set(student.auth);
      expect(res.status).toBe(403);
    });

    it('denies an instructor', async () => {
      const instructor = await createUser({ role: 'instructor', branchId: branchA._id });
      const res = await request().get('/api/assets').set(instructor.auth);
      expect(res.status).toBe(403);
    });

    it('denies an employee without the assets permission', async () => {
      const employee = await createUser({ role: 'employee', branchId: branchA._id, permissions: [] });
      const res = await request().get('/api/assets').set(employee.auth);
      expect(res.status).toBe(403);
    });

    it('allows an employee holding staff:manage', async () => {
      const employee = await createUser({
        role: 'employee',
        branchId: branchA._id,
        permissions: ['staff:manage'],
      });
      const res = await request().get('/api/assets').set(employee.auth);
      expect(res.status).toBe(200);
    });

    it('returns only the caller branch inventory', async () => {
      await createAsset({ branchId: branchA._id, name: 'Alpha Projector' });
      await createAsset({ branchId: branchB._id, name: 'Beta Camera' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/assets').set(admin.auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alpha Projector');
    });

    it('denies a request that targets another branch by id', async () => {
      await createAsset({ branchId: branchB._id, name: 'Beta Camera' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .get('/api/assets')
        .query({ branchId: branchB._id.toString() })
        .set(admin.auth);

      expect(res.status).toBe(403);
    });

    it('denies a request that targets another branch by slug', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .get('/api/assets')
        .query({ branchId: branchB.slug })
        .set(admin.auth);

      expect(res.status).toBe(403);
    });

    it('denies a request that targets another branch by code', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .get('/api/assets')
        .query({ branchId: 'BETA' })
        .set(admin.auth);

      expect(res.status).toBe(403);
    });

    it('allows a super admin to see every branch', async () => {
      await createAsset({ branchId: branchA._id, name: 'Alpha Projector' });
      await createAsset({ branchId: branchB._id, name: 'Beta Camera' });

      const superAdmin = await createUser({ role: 'super_admin' });
      const res = await request().get('/api/assets').set(superAdmin.auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/assets', () => {
    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request()
        .post('/api/assets')
        .set(student.auth)
        .send({ name: 'Sneaky Asset', branchId: branchA._id.toString() });
      expect(res.status).toBe(403);
    });

    it('denies creating an asset in another branch', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .post('/api/assets')
        .set(admin.auth)
        .send({ name: 'Sneaky Asset', branchId: branchB._id.toString() });

      expect(res.status).toBe(403);
      expect(await Asset.countDocuments({ name: 'Sneaky Asset' })).toBe(0);
    });

    it('creates the asset in the caller branch', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .post('/api/assets')
        .set(admin.auth)
        .send({ name: 'Alpha Laptop', branchId: branchA._id.toString() });

      expect(res.status).toBe(201);
      const created = await Asset.findOne({ name: 'Alpha Laptop' });
      expect(created.branchId.toString()).toBe(branchA._id.toString());
    });
  });

  describe('PATCH /api/assets/:id', () => {
    it('denies updating an asset in another branch', async () => {
      const asset = await createAsset({ branchId: branchB._id, name: 'Beta Camera' });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .patch(`/api/assets/${asset._id}`)
        .set(admin.auth)
        .send({ name: 'Hijacked' });

      expect(res.status).toBe(403);
      const untouched = await Asset.findById(asset._id);
      expect(untouched.name).toBe('Beta Camera');
    });

    it('rejects an update that targets another branch', async () => {
      const asset = await createAsset({ branchId: branchA._id, name: 'Alpha Projector' });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .patch(`/api/assets/${asset._id}`)
        .set(admin.auth)
        .send({ name: 'Alpha Projector XL', branchId: branchB._id.toString() });

      expect(res.status).toBe(403);
      const untouched = await Asset.findById(asset._id);
      expect(untouched.name).toBe('Alpha Projector');
      expect(untouched.branchId.toString()).toBe(branchA._id.toString());
    });

    it('does not allow moving an asset to another branch', async () => {
      const asset = await createAsset({ branchId: branchA._id, name: 'Alpha Projector' });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .patch(`/api/assets/${asset._id}`)
        .set(admin.auth)
        .send({ name: 'Alpha Projector XL', branchId: branchA._id.toString() });

      expect(res.status).toBe(200);
      const updated = await Asset.findById(asset._id);
      expect(updated.name).toBe('Alpha Projector XL');
      expect(updated.branchId.toString()).toBe(branchA._id.toString());
    });
  });

  describe('DELETE /api/assets/:id', () => {
    it('denies deleting an asset in another branch', async () => {
      const asset = await createAsset({ branchId: branchB._id, name: 'Beta Camera' });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request().delete(`/api/assets/${asset._id}`).set(admin.auth);

      expect(res.status).toBe(403);
      expect(await Asset.countDocuments({ _id: asset._id })).toBe(1);
    });
  });

  describe('GET /api/expenses', () => {
    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request().get('/api/expenses').set(student.auth);
      expect(res.status).toBe(403);
    });

    it('returns only the caller branch ledger', async () => {
      const submitter = await createUser({ role: 'employee', branchId: branchA._id });
      await createExpense({ branchId: branchA._id, submittedBy: submitter.user._id, title: 'Alpha Rent' });
      await createExpense({ branchId: branchB._id, submittedBy: submitter.user._id, title: 'Beta Rent' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/expenses').set(admin.auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Alpha Rent');
    });

    it('denies a request that targets another branch', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .get('/api/expenses')
        .query({ branchId: branchB._id.toString() })
        .set(admin.auth);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/expenses/:id', () => {
    it('denies a staff member without the expenses permission', async () => {
      const submitter = await createUser({ role: 'employee', branchId: branchA._id, permissions: [] });
      const expense = await createExpense({
        branchId: branchA._id,
        submittedBy: submitter.user._id,
        title: 'Alpha Electricity',
      });

      const res = await request()
        .put(`/api/expenses/${expense._id}`)
        .set(submitter.auth)
        .send({ title: 'Renamed' });

      expect(res.status).toBe(403);
    });

    it('ignores a status field submitted by a staff member', async () => {
      const submitter = await createUser({
        role: 'employee',
        branchId: branchA._id,
        permissions: ['expenses:manage'],
      });
      const expense = await createExpense({
        branchId: branchA._id,
        submittedBy: submitter.user._id,
        title: 'Alpha Electricity',
        status: 'pending',
      });

      const res = await request()
        .put(`/api/expenses/${expense._id}`)
        .set(submitter.auth)
        .send({ title: 'Alpha Electricity Q3', status: 'approved', actionBy: submitter.id, actionDate: new Date().toISOString() });

      expect(res.status).toBe(200);
      const unchanged = await Expense.findById(expense._id);
      expect(unchanged.title).toBe('Alpha Electricity Q3');
      expect(unchanged.status).toBe('pending');
      expect(unchanged.actionBy).toBeFalsy();
    });

    it('denies updating an expense in another branch', async () => {
      const submitter = await createUser({ role: 'employee', branchId: branchB._id });
      const expense = await createExpense({
        branchId: branchB._id,
        submittedBy: submitter.user._id,
        title: 'Beta Electricity',
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .put(`/api/expenses/${expense._id}`)
        .set(admin.auth)
        .send({ title: 'Hijacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/expenses/:id/approval', () => {
    it('denies a staff member', async () => {
      const submitter = await createUser({ role: 'employee', branchId: branchA._id });
      const expense = await createExpense({
        branchId: branchA._id,
        submittedBy: submitter.user._id,
      });

      const res = await request()
        .patch(`/api/expenses/${expense._id}/approval`)
        .set(submitter.auth)
        .send({ status: 'approved' });

      expect(res.status).toBe(403);
    });

    it('denies a manager from another branch', async () => {
      const submitter = await createUser({ role: 'employee', branchId: branchB._id });
      const expense = await createExpense({
        branchId: branchB._id,
        submittedBy: submitter.user._id,
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .patch(`/api/expenses/${expense._id}/approval`)
        .set(admin.auth)
        .send({ status: 'approved' });

      expect(res.status).toBe(403);
    });

    it('approves within the manager branch', async () => {
      const submitter = await createUser({ role: 'employee', branchId: branchA._id });
      const expense = await createExpense({
        branchId: branchA._id,
        submittedBy: submitter.user._id,
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .patch(`/api/expenses/${expense._id}/approval`)
        .set(admin.auth)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      const approved = await Expense.findById(expense._id);
      expect(approved.status).toBe('approved');
      expect(approved.actionBy.toString()).toBe(admin.id);
    });
  });

  describe('GET /api/routines', () => {
    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request().get('/api/routines').set(student.auth);
      expect(res.status).toBe(403);
    });

    it('returns only the caller branch schedules', async () => {
      const trainer = await createUser({ role: 'instructor', branchId: branchA._id });
      const course = await createCourse({ branchId: branchA._id, instructor: trainer.user._id });
      await createSchedule({ branchId: branchA._id, course: course._id, trainer: trainer.user._id, batchName: 'Alpha Batch' });
      await createSchedule({ branchId: branchB._id, course: course._id, trainer: trainer.user._id, batchName: 'Beta Batch' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/routines').set(admin.auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].batchName).toBe('Alpha Batch');
    });

    it('denies a request that targets another branch', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .get('/api/routines')
        .query({ branchId: branchB._id.toString() })
        .set(admin.auth);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/routines/my-routine', () => {
    it('stays available to students', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request().get('/api/routines/my-routine').set(student.auth);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/routines', () => {
    it('denies creating a schedule in another branch', async () => {
      const trainer = await createUser({ role: 'instructor', branchId: branchA._id });
      const course = await createCourse({ branchId: branchA._id, instructor: trainer.user._id });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .post('/api/routines')
        .set(admin.auth)
        .send({
          branchId: branchB._id.toString(),
          course: course._id.toString(),
          trainer: trainer.id,
          batchName: 'Rogue Batch',
          dayOfWeek: 'Saturday',
          startTime: '10:00',
          endTime: '12:00',
          roomOrLab: 'Lab 1',
        });

      expect(res.status).toBe(403);
      expect(await ClassSchedule.countDocuments({ batchName: 'Rogue Batch' })).toBe(0);
    });
  });

  describe('delegated secondary branches', () => {
    it('allows a manager to act on a delegated secondary branch', async () => {
      await createAsset({ branchId: branchB._id, name: 'Beta Camera' });

      const admin = await createUser({
        role: 'branch_admin',
        branchId: branchA._id,
        secondaryBranches: [branchB._id],
      });
      const res = await request()
        .get('/api/assets')
        .query({ branchId: branchB._id.toString() })
        .set(admin.auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
