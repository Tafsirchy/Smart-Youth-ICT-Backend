const express = require('express');
const upload = require('../middleware/upload.middleware');
const { uploadToImageBB } = require('../services/imagebb.service');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireAccess, isBranchAuthorized } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');
const Payment    = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course     = require('../models/Course');
const { 
  initializeCheckout, 
  stripeWebhook, 
  getPayments, 
  bkashCallback, 
  nagadCallback 
} = require('../controllers/payment.controller');

// ─────────────────────────────────────────────────────────
// Checkout Routing
// ─────────────────────────────────────────────────────────
router.post('/checkout', protect, initializeCheckout);
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
      } catch (e) {}
    }
    const courseId = body.courseId || body.course || body.course_id;
    let rawAmount = body.amount;
    if (typeof rawAmount === 'string') {
      rawAmount = rawAmount.replace(/[^0-9.]/g, '');
    }
    const amount = (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') ? Number(rawAmount) : null;
    const method = body.method ? String(body.method).toLowerCase().trim() : '';
    const transactionId = body.transactionId ? String(body.transactionId).trim() : '';
    const senderNumber = body.senderNumber ? String(body.senderNumber).trim() : '';
    const bankName = body.bankName ? String(body.bankName).trim() : '';
    let slipUrl = body.slipUrl;

    if (!courseId || amount === null || isNaN(amount) || !method) {
      return res.status(400).json({ success: false, message: 'Course ID, amount, and payment method are required' });
    }

    if (req.file) {
      try {
        slipUrl = await uploadToImageBB(req.file.buffer);
      } catch (e) {
        slipUrl = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
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

    // Determine branch context
    let targetBranchId = body.branchId || req.user.branchId;
    if (!targetBranchId && courseId) {
      const course = await Course.findById(courseId);
      if (course && course.branchId) targetBranchId = course.branchId;
    }

    const payment = await Payment.create({
      user: req.user._id, 
      course: courseId,
      branchId: targetBranchId || undefined,
      method: method || 'bank', 
      amount: amount,
      transactionId,
      senderNumber,
      bankName,
      slip: slipUrl || '', 
      status: 'pending',
    });
    res.status(201).json({ success: true, data: payment, message: 'Payment submitted for review' });
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

    payment.status = status;
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    payment.adminNote = note;
    await payment.save();
    
    if (status === 'completed') {
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
