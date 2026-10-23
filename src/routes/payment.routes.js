const express = require('express');
const upload = require('../middleware/upload.middleware');
const { uploadToImageBB } = require('../services/imagebb.service');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireAccess, isBranchAuthorized } = require('../middleware/rbac.middleware');
const { authorize } = require('../middleware/role.middleware');
const { PERMISSIONS } = require('../config/permissions');
const Payment    = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course     = require('../models/Course');
const { validateCouponForAmount } = require('../services/coupon.service');
const { validateImageUpload } = require('../utils/imageValidation');
const { 
  initializeCheckout, 
  stripeWebhook, 
  getPayments, 
  exportPaymentsCSV,
  bkashCallback, 
  nagadCallback,
  redeemPaymentCoupon,
  replayPaymentWebhook,
} = require('../controllers/payment.controller');

// ─────────────────────────────────────────────────────────
// Checkout Routing
// ─────────────────────────────────────────────────────────
router.post('/checkout', protect, initializeCheckout);
// Replaying a gateway callback marks a payment as completed and provisions an
// enrollment, so it stays a super-role operation. `requireAccess` takes
// permission names, not role names, and it grants branch roles a blanket pass
// — the role guard below is what actually keeps branch admins out.
router.post('/:id/replay-webhook', protect, authorize('super_admin', 'super_management'), replayPaymentWebhook);
router.get('/export', protect, requireAccess(PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_VERIFY), exportPaymentsCSV);
router.get('/', protect, requireAccess(PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_VERIFY), getPayments);

// ─────────────────────────────────────────────────────────
// Manual Payments (Bank, bKash, Nagad, Rocket)
// ─────────────────────────────────────────────────────────
const handleSlipUpload = (req, res, next) => {
  upload.single('slip')(req, res, (err) => {
    if (err) {
      console.warn('[Manual Payment] Multer notice:', err.message);
    }
    next();
  });
};

router.post('/manual/submit', protect, handleSlipUpload, async (req, res, next) => {
  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        req.log?.error('manual payment body is not valid JSON', { err: e });
        return res.status(400).json({ success: false, message: 'Malformed request body' });
      }
    }
    const courseId = body.courseId || body.course || body.course_id;
    let rawAmount = body.amount;
    if (typeof rawAmount === 'string') {
      rawAmount = rawAmount.replace(/[^0-9.]/g, '');
    }
    const amount = (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') ? Number(rawAmount) : null;
    const method = body.method ? String(body.method).toLowerCase().trim() : '';
    const transactionId = String(body.transactionId || '').trim();
    const senderNumber = String(body.senderNumber || '').trim();
    const bankName = String(body.bankName || '').trim();
    const couponCode = String(body.couponCode || '').trim();
    let slipUrl = body.slipUrl;

    if (!courseId || amount === null || isNaN(amount) || !method) {
      return res.status(400).json({ success: false, message: 'Course ID, amount, and payment method are required' });
    }

    // The course is the source of truth for both the branch and the price.
    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    if (courseDoc.price === undefined || courseDoc.price === null || Number.isNaN(Number(courseDoc.price))) {
      return res.status(400).json({ success: false, message: 'This course has no configured price' });
    }

    // The client never decides what was paid. The authoritative amount always
    // comes from the course price; the value the payer declared is kept
    // separately so verification can compare the two.
    const originalAmount = Number(courseDoc.price);
    let expectedAmount = originalAmount;

    // Server-side coupon application — client amount is never trusted when a coupon is used
    let coupon = null;
    let discountAmount = 0;
    if (couponCode) {
      const couponCheck = await validateCouponForAmount({
        code: couponCode,
        amount: originalAmount,
        courseId: courseId.toString(),
        branchId: courseDoc.branchId || req.user.branchId
      });
      if (!couponCheck.ok) {
        return res.status(couponCheck.status).json({ success: false, message: couponCheck.message });
      }
      coupon = couponCheck.coupon;
      discountAmount = couponCheck.discountAmount;
      expectedAmount = Math.max(0, originalAmount - discountAmount);
    }

    if (req.file) {
      // The slip is validated by content, not by the declared type.
      const slipValidation = validateImageUpload(req.file.buffer, req.file.mimetype);
      if (!slipValidation.ok) {
        return res.status(slipValidation.status).json({ success: false, message: slipValidation.message });
      }

      try {
        slipUrl = await uploadToImageBB(req.file.buffer);
      } catch {
        slipUrl = `data:${slipValidation.mime};base64,${req.file.buffer.toString('base64')}`;
      }
    }

    // Check for existing pending/completed payments for this course
    const existing = await Payment.findOne({ 
      user: req.user._id, 
      course: courseId, 
      status: { $in: ['pending', 'completed'] } 
    });
    
    if (existing) {
      return res.status(409).json({ success: false, message: 'A payment record already exists for this course' });
    }

    // The course owns the branch context — the client cannot re-point a
    // payment at another tenant.
    const targetBranchId = courseDoc.branchId || req.user.branchId;

    const amountMismatch = Math.abs(amount - expectedAmount) > 0.5;

    const payment = await Payment.create({
      user: req.user._id, 
      course: courseId,
      branchId: targetBranchId || undefined,
      method: method || 'bank', 
      amount: expectedAmount,
      declaredAmount: amount,
      originalAmount: coupon ? originalAmount : undefined,
      discountAmount: coupon ? discountAmount : 0,
      coupon: coupon ? coupon._id : undefined,
      couponCode: coupon ? coupon.code : undefined,
      transactionId,
      senderNumber,
      bankName,
      slip: slipUrl || '', 
      status: 'pending',
    });
    res.status(201).json({
      success: true,
      data: payment,
      message: amountMismatch
        ? 'Payment submitted for review. The submitted amount differs from the course price and needs an administrator override.'
        : 'Payment submitted for review',
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────
// Webhooks (Must bypass JSON body parser if using Stripe raw body, handled in server.js)
// ─────────────────────────────────────────────────────────
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
router.get('/callback/bkash', bkashCallback);
router.get('/callback/nagad', nagadCallback);

// ─────────────────────────────────────────────────────────
// User History
// ─────────────────────────────────────────────────────────
router.get('/history', protect, async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).populate('course', 'title slug');
    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────
// Admin Verification & Rejection (Guarded by RBAC and Branch Isolation)
// ─────────────────────────────────────────────────────────
router.put('/:id/verify', protect, requireAccess(PERMISSIONS.PAYMENTS_VERIFY), async (req, res, next) => {
  try {
    const { status, note } = req.body; // status should be 'completed' or 'failed'
    
    if (!['completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status for verification' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Strict Tenant Isolation Check
    if (!isBranchAuthorized(req, payment.branchId)) {
      return res.status(403).json({ message: 'Access denied: Payment belongs to another branch' });
    }

    // Amount integrity: a manual payment whose declared amount differs from
    // the authoritative course price cannot be approved without an explicit
    // override. Rejecting is always allowed — a mismatch is a valid reason to
    // reject the payment.
    const declaredAmount = payment.declaredAmount;
    const hasMismatch =
      declaredAmount !== undefined &&
      declaredAmount !== null &&
      Math.abs(Number(declaredAmount) - Number(payment.amount)) > 0.5;

    if (hasMismatch && status === 'completed') {
      const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
      const canOverride =
        isSuper || (req.user.permissions || []).includes(PERMISSIONS.PAYMENTS_OVERRIDE_AMOUNT);

      if (!canOverride) {
        return res.status(409).json({
          success: false,
          message:
            'Amount mismatch: the submitted amount does not match the course price. An administrator with amount-override rights must approve this payment.',
          declaredAmount,
          expectedAmount: payment.amount,
          requiresOverride: true,
        });
      }

      payment.amountOverridden = true;
      payment.amountOverriddenBy = req.user._id;
      payment.amountOverriddenAt = new Date();
    }

    payment.status = status;
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    payment.adminNote = note;
    await payment.save();
    
    if (status === 'completed') {
      // Redeem coupon usage (exactly once)
      await redeemPaymentCoupon(payment);

      // Activate enrollment
      await Enrollment.findOneAndUpdate(
        { user: payment.user, course: payment.course },
        { paymentStatus: 'paid', isActive: true, branchId: payment.branchId },
        { upsert: true, new: true },
      );
    } else if (status === 'failed') {
      // Mark enrollment as failed if it exists
      await Enrollment.findOneAndUpdate(
        { user: payment.user, course: payment.course },
        { paymentStatus: 'failed', isActive: false },
        { upsert: true, new: true },
      );
    }

    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
});

module.exports = router;
