const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const stripeService = require('../services/payment/stripe.service');
const bkashService = require('../services/payment/bkash.service');
const nagadService = require('../services/payment/nagad.service');

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
      const sessionData = await stripeService.createCheckoutSession(amount, course.title?.en || course.title || 'Course', successUrl, cancelUrl);
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
    
    // Find pending payment and update
    // Create actual Enrollment record
    // Send email/whatsapp success notification
    console.log('Payment Successful via Stripe:', session.id);
  }

  res.send();
};

module.exports = {
  initializeCheckout,
  stripeWebhook
};
