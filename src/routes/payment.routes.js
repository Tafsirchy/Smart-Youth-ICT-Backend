const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/auth.middleware');
const { authorize, authorizeBranch } = require('../middleware/role.middleware');
const Payment      = require('../models/Payment');
const Enrollment   = require('../models/Enrollment');
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
router.get('/', protect, authorize('super_admin', 'branch_admin'), require('../controllers/payment.controller').getPayments);

// ─────────────────────────────────────────────────────────
// Manual Payments (Bank, bKash, Nagad, Rocket)
// ─────────────────────────────────────────────────────────
router.post('/manual/submit', protect, async (req, res, next) => {
  try {
    const { courseId, amount, method, transactionId, senderNumber, slipUrl } = req.body;
    if (!courseId || !amount || !method) {
      return res.status(400).json({ message: 'Course ID, amount, and payment method are required' });
    }

    // Check for existing pending/completed payments for this course
    const existing = await Payment.findOne({ 
      user: req.user._id, 
      course: courseId, 
      status: { $in: ['pending', 'completed'] } 
    });
    
    if (existing) {
      return res.status(409).json({ message: 'A payment record already exists for this course' });
    }

    const payment = await Payment.create({
      user: req.user._id, 
      course: courseId,
      method: method || 'bank', 
      amount: Number(amount),
      transactionId,
      senderNumber,
      slip: slipUrl, 
      status: 'pending',
    });
    res.status(201).json({ success: true, data: payment, message: 'Payment submitted for review' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────
// Webhooks (Must bypass JSON body parser if using Stripe raw body, handled in server.js)
// ─────────────────────────────────────────────────────────
// NOTE: For Stripe, the route in server.js should be configured to use express.raw() 
// before it reaches this router.
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
// Admin Verification & Rejection
// ─────────────────────────────────────────────────────────
router.put('/:id/verify', protect, authorize('super_admin', 'super_management', 'branch_admin', 'branch_management'), authorizeBranch, async (req, res, next) => {
  try {
    const { status, note } = req.body; // status should be 'completed' or 'failed'
    
    if (!['completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status for verification' });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status, verifiedBy: req.user._id, verifiedAt: new Date(), adminNote: note },
      { new: true },
    );
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    
    if (status === 'completed') {
      // Activate enrollment
      await Enrollment.findOneAndUpdate(
        { user: payment.user, course: payment.course },
        { paymentStatus: 'paid' },
        { upsert: true, new: true },
      );
    } else if (status === 'failed') {
      // Mark enrollment as failed if it exists
      await Enrollment.findOneAndUpdate(
        { user: payment.user, course: payment.course },
        { paymentStatus: 'failed' }
      );
    }

    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
});

module.exports = router;
