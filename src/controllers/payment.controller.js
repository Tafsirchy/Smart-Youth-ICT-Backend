const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const stripeService = require('../services/payment/stripe.service');
const bkashService = require('../services/payment/bkash.service');
const nagadService = require('../services/payment/nagad.service');
const whatsappService = require('../services/whatsapp.service');
const smsService      = require('../services/sms.service');
const emailService    = require('../services/email.service');

/**
 * @desc    Initialize a checkout session for a course
 * @route   POST /api/payments/checkout
 * @access  Private (Student)
 */
const initializeCheckout = async (req, res, next) => {
  try {
    const { courseId, paymentMethod, isInstallment } = req.body;
    const user = req.user;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Amount calculation logic
    // Simplified: Full amount for now
    const amount = Number(course.price);
    const invoiceNumber = `INV-${Date.now()}-${user._id.toString().slice(-4)}`;

    // Create a pending Payment record
    const paymentRecord = await Payment.create({
      user: user._id,
      course: courseId,
      method: paymentMethod, // 'card', 'bkash', 'nagad', 'bank'
      amount,
      status: 'pending',
      transactionId: invoiceNumber // Temporary TRID
    });

    let paymentUrl = '';

    // Route to appropriate gateway
    if (paymentMethod === 'card') {
      const successUrl = `${process.env.FRONTEND_URL}/student/payments/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${process.env.FRONTEND_URL}/courses/${course.slug}`;
      const metadata = {
        paymentId: paymentRecord._id.toString(),
        courseId: courseId.toString(),
        userId: user._id.toString()
      };
      const sessionData = await stripeService.createCheckoutSession(amount, course.title?.en || course.title || 'Course', successUrl, cancelUrl, metadata);
      paymentUrl = sessionData.url;
    } else if (paymentMethod === 'bkash') {
      const callbackUrl = `${process.env.FRONTEND_URL}/api/webhooks/bkash/callback`;
      const bkashData = await bkashService.createPayment(amount, invoiceNumber, callbackUrl);
      paymentUrl = bkashData.bkashURL;
    } else if (paymentMethod === 'nagad') {
      const callbackUrl = `${process.env.FRONTEND_URL}/api/webhooks/nagad/callback`;
      const nagadData = await nagadService.createPayment(amount, invoiceNumber, callbackUrl);
      paymentUrl = nagadData.paymentURL;
    } else if (paymentMethod === 'bank') {
      // Manual bank logic handles directly via frontend UI forms returning a pending approval state
      return res.status(200).json({ success: true, message: 'Bank details required', type: 'manual' });
    }

    res.status(200).json({ success: true, paymentUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payments (Admin/Branch Admin)
 * @route   GET /api/payments
 * @access  Private
 */
const getPayments = async (req, res, next) => {
  try {
    const { branchId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (branchId) query.branchId = branchId;
    // Branch admins should only see their branch's payments
    if (['branch_admin', 'branch_management'].includes(req.user.role)) {
      query.branchId = req.user.branchId;
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate('user', 'name email avatar')
      .populate('course', 'title slug')
      .sort('-createdAt')
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page: Number(page),
      limit: Number(limit),
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stripe Webhook Receiver
 * @route   POST /api/payments/webhook/stripe
 * @access  Public
 */
const stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  let event;
  try {
    // req.body must be raw string for constructWebhookEvent
    event = stripeService.constructWebhookEvent(req.body, signature);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { paymentId, courseId, userId } = session.metadata || {};
    
    if (paymentId) {
      // 1. Update pending payment
      const payment = await Payment.findByIdAndUpdate(paymentId, { 
        status: 'completed',
        transactionId: session.payment_intent || session.id
      });

      if (payment) {
        // 2. Create actual Enrollment record
        await Enrollment.findOneAndUpdate(
          { user: payment.user, course: payment.course },
          { paymentStatus: 'paid', branchId: payment.branchId },
          { upsert: true, new: true }
        );

        // 3. Send notifications (Structural placeholders)
        try {
          // await whatsappService.sendEnrollmentNotice(payment.user, payment.course);
          // await smsService.sendSMS(payment.user.phone, 'Payment success! Access granted.');
        } catch (notifyErr) { console.error('Fulfillment notification error:', notifyErr.message); }

        console.log(`[Fulfillment] Success: Course ${courseId} activated for user ${userId}`);
      }
    }
  }

  res.send();
};

/**
 * @desc    bKash Callback Receiver
 * @route   GET /api/payments/callback/bkash
 * @access  Public
 */
const bkashCallback = async (req, res, next) => {
  try {
    const { paymentID, status } = req.query;

    if (status === 'success') {
      const result = await bkashService.executePayment(paymentID);
      
      if (result.statusCode === '0000') {
        // Find existing record by gateway reference (paymentID or previous TRID)
        const payment = await Payment.findOne({ 
          transactionId: { $in: [paymentID, req.query.invoice] }, 
          status: 'pending' 
        });

        if (payment) {
          payment.status = 'completed';
          payment.transactionId = result.trxID;
          await payment.save();

          await Enrollment.findOneAndUpdate(
            { user: payment.user, course: payment.course },
            { paymentStatus: 'paid', branchId: payment.branchId },
            { upsert: true }
          );

          // Notify (Placeholder)
          try {
             // await whatsappService.sendEnrollmentNotice(payment.user, payment.course);
          } catch(e) {}
        }
        return res.redirect(`${process.env.FRONTEND_URL}/student/payments/success`);
      }
    }
    
    res.redirect(`${process.env.FRONTEND_URL}/student/payments/failed`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Nagad Callback Receiver
 * @route   GET /api/payments/callback/nagad
 * @access  Public
 */
const nagadCallback = async (req, res, next) => {
  try {
    const { payment_ref_id, status } = req.query;

    if (status === 'Success') {
      const result = await nagadService.verifyPayment(payment_ref_id);
      
      if (result.status === 'Success') {
        const payment = await Payment.findOne({ 
          transactionId: payment_ref_id, 
          status: 'pending' 
        });

        if (payment) {
          payment.status = 'completed';
          await payment.save();

          await Enrollment.findOneAndUpdate(
            { user: payment.user, course: payment.course },
            { paymentStatus: 'paid', branchId: payment.branchId },
            { upsert: true }
          );

          // Notify (Placeholder)
          try {
             // await whatsappService.sendEnrollmentNotice(payment.user, payment.course);
          } catch(e) {}
        }
        return res.redirect(`${process.env.FRONTEND_URL}/student/payments/success`);
      }
    }
    
    res.redirect(`${process.env.FRONTEND_URL}/student/payments/failed`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initializeCheckout,
  stripeWebhook,
  getPayments,
  bkashCallback,
  nagadCallback
};
