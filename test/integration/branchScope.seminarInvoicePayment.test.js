/**
 * Branch authorization for seminars, invoices and payments.
 *
 * These three areas were never covered by the cross-tenant tests. The cases
 * below lock the behaviour down: a request from one branch may not read or
 * write another branch's records, and a record may not be moved to another
 * branch by the body of the request.
 */
const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const { createBranch, createCourse, createPayment } = require('../helpers/fixtures');
const Seminar = require('../../src/models/Seminar');
const SeminarRegistration = require('../../src/models/SeminarRegistration');
const Invoice = require('../../src/models/Invoice');

describe('seminars, invoices and payments branch scope', () => {
  let branchA;
  let branchB;

  beforeEach(async () => {
    branchA = await createBranch({ name: 'Campus Alpha', code: 'ALPHA' });
    branchB = await createBranch({ name: 'Campus Beta', code: 'BETA' });
  });

  describe('seminars', () => {
    const createSeminar = (branchId, overrides = {}) =>
      Seminar.create({
        title: 'Career Workshop',
        branchId,
        date: '2026-11-01',
        ...overrides,
      });

    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request().get('/api/seminars/registrations').set(student.auth);
      expect(res.status).toBe(403);
    });

    it('denies updating a seminar of another branch', async () => {
      const seminar = await createSeminar(branchB._id);
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .patch(`/api/seminars/${seminar._id}`)
        .set(admin.auth)
        .send({ title: 'Hijacked' });

      expect(res.status).toBe(403);
      expect((await Seminar.findById(seminar._id)).title).toBe('Career Workshop');
    });

    it('denies deleting a seminar of another branch', async () => {
      const seminar = await createSeminar(branchB._id);
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request().delete(`/api/seminars/${seminar._id}`).set(admin.auth);

      expect(res.status).toBe(403);
      expect(await Seminar.findById(seminar._id)).not.toBeNull();
    });

    it('denies creating a seminar for another branch', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .post('/api/seminars')
        .set(admin.auth)
        .send({ title: 'Branch Seminar', date: '2026-11-02', branchId: branchB._id.toString() });

      expect(res.status).toBe(403);
      expect(await Seminar.countDocuments({ title: 'Branch Seminar' })).toBe(0);
    });

    it('creates a seminar in the caller branch', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .post('/api/seminars')
        .set(admin.auth)
        .send({ title: 'Branch Seminar', date: '2026-11-02' });

      expect(res.status).toBe(201);
      expect(res.body.data.branchId._id || res.body.data.branchId).toBe(branchA._id.toString());
    });

    it('returns only the registrations of the caller branch', async () => {
      const seminarA = await createSeminar(branchA._id);
      const seminarB = await createSeminar(branchB._id);

      await SeminarRegistration.create({ name: 'Alpha Lead', phone: '01700000001', branchId: branchA._id, seminarId: seminarA._id });
      await SeminarRegistration.create({ name: 'Beta Lead', phone: '01700000002', branchId: branchB._id, seminarId: seminarB._id });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/seminars/registrations').set(admin.auth);

      expect(res.status).toBe(200);
      const names = res.body.data.map((entry) => entry.name);
      expect(names).toContain('Alpha Lead');
      expect(names).not.toContain('Beta Lead');
    });

    it('denies marking attendance for a registration of another branch', async () => {
      const seminar = await createSeminar(branchB._id);
      const registration = await SeminarRegistration.create({
        name: 'Beta Lead',
        phone: '01700000003',
        branchId: branchB._id,
        seminarId: seminar._id,
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .patch(`/api/seminars/registrations/${registration._id}`)
        .set(admin.auth)
        .send({ attendanceStatus: 'attended' });

      expect(res.status).toBe(403);
      expect((await SeminarRegistration.findById(registration._id)).attendanceStatus).toBe('registered');
    });
  });

  describe('invoices', () => {
    const createInvoice = (branchId, user, overrides = {}) =>
      Invoice.create({
        branchId,
        user,
        invoiceNo: `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        amount: 5000,
        total: 5000,
        ...overrides,
      });

    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request().get('/api/invoices').set(student.auth);
      expect(res.status).toBe(403);
    });

    it('returns only the invoices of the caller branch', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      await createInvoice(branchA._id, student.user._id, { invoiceNo: 'INV-ALPHA-0001' });
      await createInvoice(branchB._id, student.user._id, { invoiceNo: 'INV-BETA-0001' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/invoices').set(admin.auth);

      expect(res.status).toBe(200);
      const numbers = res.body.data.map((entry) => entry.invoiceNo);
      expect(numbers).toEqual(['INV-ALPHA-0001']);
    });

    it('denies updating an invoice of another branch', async () => {
      const student = await createUser({ role: 'student', branchId: branchB._id });
      const invoice = await createInvoice(branchB._id, student.user._id, { invoiceNo: 'INV-BETA-0002' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request()
        .patch(`/api/invoices/${invoice._id}`)
        .set(admin.auth)
        .send({ status: 'paid' });

      expect(res.status).toBe(403);
      expect((await Invoice.findById(invoice._id)).status).toBe('pending');
    });

    it('creates an invoice in the caller branch', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .post('/api/invoices')
        .set(admin.auth)
        .send({
          user: student.user._id.toString(),
          amount: 2500,
          total: 2500,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.branchId).toBe(branchA._id.toString());
    });

    it('denies creating an invoice for another branch', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });

      const res = await request()
        .post('/api/invoices')
        .set(admin.auth)
        .send({
          user: student.user._id.toString(),
          amount: 2500,
          total: 2500,
          branchId: branchB._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(await Invoice.countDocuments({ amount: 2500 })).toBe(0);
    });
  });

  describe('payments', () => {
    it('returns only the payments of the caller branch', async () => {
      const studentA = await createUser({ role: 'student', branchId: branchA._id });
      const studentB = await createUser({ role: 'student', branchId: branchB._id });
      const instructor = await createUser({ role: 'instructor', branchId: branchA._id });

      const courseA = await createCourse({ branchId: branchA._id, instructor: instructor.user._id });
      const courseB = await createCourse({ branchId: branchB._id, instructor: instructor.user._id });

      await createPayment({ user: studentA.user._id, course: courseA._id, branchId: branchA._id, transactionId: 'TXN-ALPHA' });
      await createPayment({ user: studentB.user._id, course: courseB._id, branchId: branchB._id, transactionId: 'TXN-BETA' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/payments').set(admin.auth);

      expect(res.status).toBe(200);
      const transactions = res.body.data.map((entry) => entry.transactionId);
      expect(transactions).toContain('TXN-ALPHA');
      expect(transactions).not.toContain('TXN-BETA');
    });

    it('exports only the payments of the caller branch', async () => {
      const studentA = await createUser({ role: 'student', branchId: branchA._id });
      const studentB = await createUser({ role: 'student', branchId: branchB._id });
      const instructor = await createUser({ role: 'instructor', branchId: branchA._id });

      const courseA = await createCourse({ branchId: branchA._id, instructor: instructor.user._id });
      const courseB = await createCourse({ branchId: branchB._id, instructor: instructor.user._id });

      await createPayment({ user: studentA.user._id, course: courseA._id, branchId: branchA._id, transactionId: 'TXN-EXPORT-A' });
      await createPayment({ user: studentB.user._id, course: courseB._id, branchId: branchB._id, transactionId: 'TXN-EXPORT-B' });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().get('/api/payments/export').set(admin.auth);

      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-EXPORT-A');
      expect(res.text).not.toContain('TXN-EXPORT-B');
    });

    it('denies replaying a payment webhook to a branch admin', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const instructor = await createUser({ role: 'instructor', branchId: branchA._id });
      const course = await createCourse({ branchId: branchA._id, instructor: instructor.user._id });
      const payment = await createPayment({ user: student.user._id, course: course._id, branchId: branchA._id });

      const admin = await createUser({ role: 'branch_admin', branchId: branchA._id });
      const res = await request().post(`/api/payments/${payment._id}/replay-webhook`).set(admin.auth);

      expect(res.status).toBe(403);
    });

    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branchA._id });
      const res = await request().get('/api/payments').set(student.auth);
      expect(res.status).toBe(403);
    });
  });
});
