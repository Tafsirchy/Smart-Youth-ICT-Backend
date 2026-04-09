const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const Payment      = require('../models/Payment');
const Enrollment   = require('../models/Enrollment');
const { initializeCheckout, stripeWebhook } = require('../controllers/payment.controller');

// ─────────────────────────────────────────────────────────
// Checkout Routing
// ─────────────────────────────────────────────────────────
router.post('/checkout', protect, initializeCheckout);
router.get('/', protect, authorize('super_admin', 'branch_admin'), require('../controllers/payment.controller').getPayments);

// ─────────────────────────────────────────────────────────
// Manual Bank Transfers
// ─────────────────────────────────────────────────────────
router.post('/bank/submit', protect, async (req, res, next) => {
  try {
    const payment = await Payment.create({
      user: req.user._id, course: req.body.courseId,
      method: 'bank', amount: req.body.amount,
      slip: req.body.slipUrl, status: 'pending',
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
router.put('/:id/verify', protect, authorize('super_admin', 'super_management', 'branch_admin', 'branch_management'), async (req, res, next) => {
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
