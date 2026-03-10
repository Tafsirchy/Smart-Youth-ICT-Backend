const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const Payment      = require('../models/Payment');
const Enrollment   = require('../models/Enrollment');

// POST /api/payments/bkash/initiate
router.post('/bkash/initiate', protect, async (req, res, next) => {
  try {
    // TODO: call bkash.service.js
    const payment = await Payment.create({
      user: req.user._id, course: req.body.courseId,
      method: 'bkash', amount: req.body.amount, status: 'pending',
    });
    res.json({ success: true, paymentId: payment._id, message: 'bKash payment initiated' });
  } catch (err) { next(err); }
});

// POST /api/payments/nagad/initiate
router.post('/nagad/initiate', protect, async (req, res, next) => {
  try {
    const payment = await Payment.create({
      user: req.user._id, course: req.body.courseId,
      method: 'nagad', amount: req.body.amount, status: 'pending',
    });
    res.json({ success: true, paymentId: payment._id, message: 'Nagad payment initiated' });
  } catch (err) { next(err); }
});

// POST /api/payments/stripe/initiate
router.post('/stripe/initiate', protect, async (req, res) => {
  res.json({ success: true, message: 'Stripe checkout session — integrate Stripe SDK here' });
});

// POST /api/payments/bank/submit
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

// GET  /api/payments/history
router.get('/history', protect, async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).populate('course', 'title slug');
    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
});

// PUT  /api/payments/:id/verify  — admin
router.put('/:id/verify', protect, authorize('admin'), async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', verifiedBy: req.user._id, verifiedAt: new Date(), adminNote: req.body.note },
      { new: true },
    );
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    // Activate enrollment
    await Enrollment.findOneAndUpdate(
      { user: payment.user, course: payment.course },
      { paymentStatus: 'paid' },
      { upsert: true, new: true },
    );
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
});

module.exports = router;
