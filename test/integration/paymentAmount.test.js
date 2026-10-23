/**
 * Payment amount integrity.
 *
 * A payer must never be able to decide what a payment is worth. The
 * authoritative amount always comes from the course price; the value the
 * payer declared is kept for the audit trail and is checked at verification
 * time.
 */
const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const {
  createBranch,
  createCourse,
  createCoupon,
  createPayment,
} = require('../helpers/fixtures');
const Payment = require('../../src/models/Payment');
const Enrollment = require('../../src/models/Enrollment');

describe('payment amount integrity', () => {
  let branch;
  let course;

  beforeEach(async () => {
    branch = await createBranch({ name: 'Payment Campus', code: 'PAYC' });
    const instructor = await createUser({ role: 'instructor', branchId: branch._id });
    course = await createCourse({
      branchId: branch._id,
      instructor: instructor.user._id,
      price: 50000,
    });
  });

  describe('POST /api/payments/manual/submit', () => {
    it('stores the course price, not the amount the client declared', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });

      const res = await request()
        .post('/api/payments/manual/submit')
        .set(student.auth)
        .send({
          courseId: course._id.toString(),
          amount: 1,
          method: 'bkash',
          transactionId: 'TX-1',
          senderNumber: '01700000000',
        });

      expect(res.status).toBe(201);
      const payment = await Payment.findById(res.body.data._id);
      expect(payment.amount).toBe(50000);
      expect(payment.declaredAmount).toBe(1);
    });

    it('flags the mismatch in the response message', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });

      const res = await request()
        .post('/api/payments/manual/submit')
        .set(student.auth)
        .send({
          courseId: course._id.toString(),
          amount: 100,
          method: 'bank',
          transactionId: 'TX-2',
          bankName: 'Bank',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/differs from the course price/i);
    });

    it('applies a coupon server-side', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const coupon = await createCoupon({
        createdBy: student.user._id,
        discountType: 'percentage',
        discountValue: 10,
      });

      const res = await request()
        .post('/api/payments/manual/submit')
        .set(student.auth)
        .send({
          courseId: course._id.toString(),
          amount: 45000,
          method: 'bkash',
          transactionId: 'TX-3',
          senderNumber: '01700000000',
          couponCode: coupon.code,
        });

      expect(res.status).toBe(201);
      const payment = await Payment.findById(res.body.data._id);
      expect(payment.amount).toBe(45000);
      expect(payment.originalAmount).toBe(50000);
      expect(payment.discountAmount).toBe(5000);
    });

    it('rejects an unknown course', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });

      const res = await request()
        .post('/api/payments/manual/submit')
        .set(student.auth)
        .send({
          courseId: '64b8f0c2a1b2c3d4e5f60718',
          amount: 100,
          method: 'bkash',
          transactionId: 'TX-4',
          senderNumber: '01700000000',
        });

      expect(res.status).toBe(404);
    });

    it('ignores a client-supplied branch and uses the course branch', async () => {
      const otherBranch = await createBranch({ name: 'Other Campus', code: 'OTHR' });
      const student = await createUser({ role: 'student', branchId: branch._id });

      const res = await request()
        .post('/api/payments/manual/submit')
        .set(student.auth)
        .send({
          courseId: course._id.toString(),
          amount: 50000,
          method: 'bkash',
          transactionId: 'TX-5',
          senderNumber: '01700000000',
          branchId: otherBranch._id.toString(),
        });

      expect(res.status).toBe(201);
      const payment = await Payment.findById(res.body.data._id);
      expect(payment.branchId.toString()).toBe(branch._id.toString());
    });

    it('requires an amount to be declared', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });

      const res = await request()
        .post('/api/payments/manual/submit')
        .set(student.auth)
        .send({ courseId: course._id.toString(), method: 'bkash' });

      expect(res.status).toBe(400);
    });

    it('rejects a duplicate payment for the same course', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      await createPayment({ user: student.user._id, course: course._id, branchId: branch._id });

      const res = await request()
        .post('/api/payments/manual/submit')
        .set(student.auth)
        .send({
          courseId: course._id.toString(),
          amount: 50000,
          method: 'bkash',
          transactionId: 'TX-6',
          senderNumber: '01700000000',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/payments/:id/verify', () => {
    it('approves a payment whose declared amount matches', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const payment = await createPayment({
        user: student.user._id,
        course: course._id,
        branchId: branch._id,
        amount: 50000,
        declaredAmount: 50000,
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branch._id });
      const res = await request()
        .put(`/api/payments/${payment._id}/verify`)
        .set(admin.auth)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      const verified = await Payment.findById(payment._id);
      expect(verified.status).toBe('completed');
      expect(verified.amountOverridden).toBe(false);

      const enrollment = await Enrollment.findOne({
        user: student.user._id,
        course: course._id,
      });
      expect(enrollment.paymentStatus).toBe('paid');
    });

    it('blocks approval of a mismatched amount', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const payment = await createPayment({
        user: student.user._id,
        course: course._id,
        branchId: branch._id,
        amount: 50000,
        declaredAmount: 100,
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branch._id });
      const res = await request()
        .put(`/api/payments/${payment._id}/verify`)
        .set(admin.auth)
        .send({ status: 'completed' });

      expect(res.status).toBe(409);
      expect(res.body.requiresOverride).toBe(true);
      expect(res.body.declaredAmount).toBe(100);
      expect(res.body.expectedAmount).toBe(50000);

      const untouched = await Payment.findById(payment._id);
      expect(untouched.status).toBe('pending');
    });

    it('allows a super admin to override a mismatched amount', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const payment = await createPayment({
        user: student.user._id,
        course: course._id,
        branchId: branch._id,
        amount: 50000,
        declaredAmount: 100,
      });

      const superAdmin = await createUser({ role: 'super_admin' });
      const res = await request()
        .put(`/api/payments/${payment._id}/verify`)
        .set(superAdmin.auth)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      const verified = await Payment.findById(payment._id);
      expect(verified.status).toBe('completed');
      expect(verified.amountOverridden).toBe(true);
      expect(verified.amountOverriddenBy.toString()).toBe(superAdmin.id);
    });

    it('allows a manager with the override permission to approve', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const payment = await createPayment({
        user: student.user._id,
        course: course._id,
        branchId: branch._id,
        amount: 50000,
        declaredAmount: 100,
      });

      const admin = await createUser({
        role: 'branch_admin',
        branchId: branch._id,
        permissions: ['payments:override-amount'],
      });
      const res = await request()
        .put(`/api/payments/${payment._id}/verify`)
        .set(admin.auth)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      const verified = await Payment.findById(payment._id);
      expect(verified.amountOverridden).toBe(true);
    });

    it('always allows a mismatched payment to be rejected', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const payment = await createPayment({
        user: student.user._id,
        course: course._id,
        branchId: branch._id,
        amount: 50000,
        declaredAmount: 100,
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branch._id });
      const res = await request()
        .put(`/api/payments/${payment._id}/verify`)
        .set(admin.auth)
        .send({ status: 'failed' });

      expect(res.status).toBe(200);
      const rejected = await Payment.findById(payment._id);
      expect(rejected.status).toBe('failed');
    });

    it('denies verifying a payment that belongs to another branch', async () => {
      const otherBranch = await createBranch({ name: 'Other Campus', code: 'OTHR' });
      const student = await createUser({ role: 'student', branchId: otherBranch._id });
      const payment = await createPayment({
        user: student.user._id,
        course: course._id,
        branchId: otherBranch._id,
        amount: 50000,
        declaredAmount: 50000,
      });

      const admin = await createUser({ role: 'branch_admin', branchId: branch._id });
      const res = await request()
        .put(`/api/payments/${payment._id}/verify`)
        .set(admin.auth)
        .send({ status: 'completed' });

      expect(res.status).toBe(403);
    });

    it('denies a student the verification endpoint', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const payment = await createPayment({
        user: student.user._id,
        course: course._id,
        branchId: branch._id,
      });

      const res = await request()
        .put(`/api/payments/${payment._id}/verify`)
        .set(student.auth)
        .send({ status: 'completed' });

      expect(res.status).toBe(403);
    });
  });
});
