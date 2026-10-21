const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const stripeService = require('../services/payment/stripe.service');
const bkashService = require('../services/payment/bkash.service');
const nagadService = require('../services/payment/nagad.service');
const whatsappService = require('../services/whatsapp.service');
const smsService      = require('../services/sms.service');
const emailService    = require('../services/email.service');
const { validateCouponForAmount, consumeCouponUsage } = require('../services/coupon.service');
const notificationService = require('../services/notification.service');

/**
 * Real-time In-App, Socket, and Audit Notifications on Payment Success
 */
const dispatchPaymentSuccessNotifications = async (payment, courseDoc = null, userDoc = null) => {
  try {
    const user = userDoc || (await User.findById(payment.user).select('name email phone').lean());
    const course = courseDoc || (payment.course?.title ? payment.course : await Course.findById(payment.course).select('title').lean());
    const courseTitle = course?.title || 'Enrolled Course';

    // 1. Notify Student (Financial / In-app + Sound)
    if (user?._id || payment.user) {
      notificationService.notifyUser(user?._id || payment.user, {
        title: 'Payment Confirmed & Enrolled',
        message: `Your payment of ৳${payment.amount} for "${courseTitle}" was received (${(payment.method || 'Online').toUpperCase()}). You can now access your course classes!`,
        category: 'financial',
        priority: 'high',
        type: 'success',
        link: '/student/payments',
        metadata: {
          invoiceId: payment._id,
          courseId: course?._id || payment.course,
          branchId: payment.branchId,
          amount: payment.amount,
          method: payment.method,
          actorName: user?.name
        }
      }).catch(err => console.error('[Payment Notification to Student failed]', err.message));
    }

    // 2. Notify Branch Admins (Tuition fee collected)
    if (payment.branchId) {
      notificationService.notifyBranchAdmins(payment.branchId, {
        title: 'Tuition Fee Collected',
        message: `৳${payment.amount} collected from ${user?.name || 'Student'} for "${courseTitle}" via ${(payment.method || 'Online').toUpperCase()}.`,
        category: 'financial',
        priority: 'normal',
        type: 'success',
        link: '/admin/payments',
        metadata: {
          invoiceId: payment._id,
          courseId: course?._id || payment.course,
          branchId: payment.branchId,
          amount: payment.amount
        }
      }).catch(err => console.error('[Payment Notification to Branch Admin failed]', err.message));
    }
  } catch (err) {
    console.error('[dispatchPaymentSuccessNotifications error]', err.message);
  }
};

/**
 * Standardized Payment Gateway Fee Calculator
 * bKash: 1.5%, Nagad: 1.2%, Rocket: 1.5%, SSLCommerz: 2.5%, Stripe/Card: 2.9% + 35 BDT (~$0.30)
 */
const calculateGatewayFee = (method, amount) => {
  if (!amount || amount <= 0) return { fee: 0, net: 0 };
  let rate = 0;
  let fixed = 0;
  const m = String(method || '').toLowerCase();
  if (m === 'bkash') rate = 0.015;
  else if (m === 'nagad') rate = 0.012;
  else if (m === 'rocket') rate = 0.015;
  else if (m === 'sslcommerz') rate = 0.025;
  else if (m === 'stripe' || m === 'card') { rate = 0.029; fixed = 35; }
  else rate = 0; // bank, cash, manual = 0%

  const fee = Math.round(amount * rate + fixed);
  const net = Math.max(0, amount - fee);
  return { fee, net };
};

/**
 * Redeem a coupon referenced by a completed payment exactly once.
 * Failures are logged, never blocking fulfillment.
 */
const redeemPaymentCoupon = async (payment) => {
  if (!payment || !payment.coupon || payment.couponRedeemed) return;
  try {
    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, couponRedeemed: { $ne: true } },
      { $set: { couponRedeemed: true } },
      { new: true }
    );
    if (!claimed) return;
    const consumed = await consumeCouponUsage({
      couponId: claimed.coupon,
      discountAmount: claimed.discountAmount,
      revenueAmount: claimed.amount
    });
    if (!consumed) {
      console.warn(`[Coupon] Usage limit reached at redemption for payment ${claimed._id} (${claimed.couponCode})`);
    }
  } catch (err) {
    console.error('[Coupon] Redemption error:', err.message);
  }
};


/**
 * @desc    Initialize a checkout session for a course
 * @route   POST /api/payments/checkout
 * @access  Private (Student)
 */
const initializeCheckout = async (req, res, next) => {
  try {
    const { courseId, paymentMethod, isInstallment, couponCode } = req.body;
    const user = req.user;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Amount calculation logic — server-side only; client amounts are never trusted
    const originalAmount = Number(course.price);
    let amount = originalAmount;
    let coupon = null;
    let discountAmount = 0;

    if (couponCode) {
      const couponCheck = await validateCouponForAmount({
        code: couponCode,
        amount: originalAmount,
        courseId: courseId.toString(),
        branchId: user.branchId
      });
      if (!couponCheck.ok) {
        return res.status(couponCheck.status).json({ success: false, message: couponCheck.message });
      }
      coupon = couponCheck.coupon;
      discountAmount = couponCheck.discountAmount;
      amount = couponCheck.finalAmount;
    }

    const invoiceNumber = `INV-${Date.now()}-${user._id.toString().slice(-4)}`;

    // Create a pending Payment record
    const paymentRecord = await Payment.create({
      user: user._id,
      course: courseId,
      branchId: user.branchId, // 🛡️ Security Fix: Link payment to branch for isolation
      method: paymentMethod, 
      amount,
      originalAmount,
      discountAmount,
      coupon: coupon ? coupon._id : undefined,
      couponCode: coupon ? coupon.code : undefined,
      status: 'pending',
      transactionId: invoiceNumber 
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
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    let targetBranchId = isSuper ? branchId : req.user.branchId;

    if (targetBranchId) {
      const Branch = require('../models/Branch');
      const mongoose = require('mongoose');
      const branchDoc = await Branch.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(targetBranchId) ? [{ _id: targetBranchId }] : []),
          { slug: targetBranchId },
          { code: targetBranchId?.toString().toUpperCase() }
        ]
      });
      const resolvedBranchId = branchDoc ? branchDoc._id : (mongoose.Types.ObjectId.isValid(targetBranchId) ? targetBranchId : null);
      if (resolvedBranchId) {
        const Course = require('../models/Course');
        const branchCourses = await Course.find({
          $or: [{ branchId: resolvedBranchId }, { availableBranches: resolvedBranchId }]
        }).distinct('_id');

        query.$or = [
          { branchId: resolvedBranchId },
          { course: { $in: branchCourses } }
        ];
      }
    }

    const skip = (page - 1) * limit;

    const [payments, total, summaryAgg] = await Promise.all([
      Payment.find(query)
        .populate('user', 'name email avatar phone')
        .populate('course', 'title slug')
        .sort('-createdAt')
        .skip(Number(skip))
        .limit(Number(limit)),
      Payment.countDocuments(query),
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
            },
            completedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $in: ['$status', ['failed', 'cancelled']] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const summary = summaryAgg[0] || {
      totalRevenue: 0,
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0
    };

    const totalRevenue = summary.totalRevenue || 0;
    const totalGatewayFees = Math.round(totalRevenue * 0.018); // Average 1.8% gateway fee across bKash/Nagad/SSL
    const netRevenue = Math.max(0, totalRevenue - totalGatewayFees);

    const enrichedPayments = payments.map(p => {
      const doc = p.toObject ? p.toObject() : { ...p };
      if (!doc.gatewayFee || !doc.netAmount) {
        const { fee, net } = calculateGatewayFee(doc.method, doc.amount);
        doc.gatewayFee = doc.gatewayFee || fee;
        doc.netAmount = doc.netAmount || net;
      }
      return doc;
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page: Number(page),
      limit: Number(limit),
      summary: {
        totalRevenue,
        netRevenue,
        totalGatewayFees,
        completedCount: summary.completedCount || 0,
        pendingCount: summary.pendingCount || 0,
        failedCount: summary.failedCount || 0
      },
      data: enrichedPayments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export Payments to CSV with current filters
 * @route   GET /api/payments/export
 * @access  Private (Staff/Admin)
 */
const exportPaymentsCSV = async (req, res, next) => {
  try {
    const { branchId, status, startDate, endDate } = req.query;
    const query = {};

    if (status) query.status = status;
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    let targetBranchId = isSuper ? branchId : req.user.branchId;

    if (targetBranchId) {
      const Branch = require('../models/Branch');
      const mongoose = require('mongoose');
      const branchDoc = await Branch.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(targetBranchId) ? [{ _id: targetBranchId }] : []),
          { slug: targetBranchId },
          { code: targetBranchId?.toString().toUpperCase() }
        ]
      });
      const resolvedBranchId = branchDoc ? branchDoc._id : (mongoose.Types.ObjectId.isValid(targetBranchId) ? targetBranchId : null);
      if (resolvedBranchId) {
        const Course = require('../models/Course');
        const branchCourses = await Course.find({
          $or: [{ branchId: resolvedBranchId }, { availableBranches: resolvedBranchId }]
        }).distinct('_id');

        query.$or = [
          { branchId: resolvedBranchId },
          { course: { $in: branchCourses } }
        ];
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('user', 'name email phone')
      .populate('course', 'title slug')
      .populate('branchId', 'name code')
      .sort('-createdAt')
      .lean();

    const headers = ['Transaction ID', 'Student Name', 'Student Email', 'Student Phone', 'Course', 'Branch', 'Method', 'Gross Amount (BDT)', 'Gateway Fee (BDT)', 'Net Amount (BDT)', 'Status', 'Date'];
    const rows = payments.map(p => {
      const studentName = p.user?.name || 'N/A';
      const studentEmail = p.user?.email || 'N/A';
      const studentPhone = p.user?.phone || 'N/A';
      const courseTitle = p.course?.title?.en || p.course?.title || 'N/A';
      const branchName = p.branchId?.name || 'Central/Online';
      const date = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '';
      const fee = p.gatewayFee || calculateGatewayFee(p.method, p.amount).fee;
      const net = p.netAmount || Math.max(0, (p.amount || 0) - fee);
      return [
        `"${p.transactionId || p._id}"`,
        `"${studentName}"`,
        `"${studentEmail}"`,
        `"${studentPhone}"`,
        `"${courseTitle}"`,
        `"${branchName}"`,
        `"${p.method || 'Unknown'}"`,
        p.amount || 0,
        fee,
        net,
        `"${p.status}"`,
        `="${date}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=SYICT_Payments_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    res.status(200).send(csvContent);
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
        // 1b. Redeem coupon usage (exactly once)
        await redeemPaymentCoupon(payment);

        // 2. Create actual Enrollment record
        await Enrollment.findOneAndUpdate(
          { user: payment.user, course: payment.course },
          { paymentStatus: 'paid', isActive: true, branchId: payment.branchId },
          { upsert: true, new: true }
        );

        // 3. Send notifications (In-app, WebSocket, Sound & Email)
        try {
          const userObj = await User.findById(userId);
          if (userObj) {
            await emailService.sendPaymentReceipt(userObj, payment);
          }
          dispatchPaymentSuccessNotifications(payment, null, userObj);
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
      
      // 🛡️ Security Fix: Strictly verify gateway status server-to-server before activation
      if (result && result.statusCode === '0000' && result.transactionStatus === 'Completed') {
        const payment = await Payment.findOne({ 
          transactionId: { $in: [paymentID, req.query.invoice] }, 
          status: 'pending' 
        });

        if (payment) {
          payment.status = 'completed';
          payment.transactionId = result.trxID;
          await payment.save();

          await redeemPaymentCoupon(payment);

          await Enrollment.findOneAndUpdate(
            { user: payment.user, course: payment.course },
            { paymentStatus: 'paid', isActive: true, branchId: payment.branchId },
            { upsert: true, new: true }
          );

          // Notify Student & Admins
          try {
             const userObj = await User.findById(payment.user);
             if (userObj) {
               await emailService.sendPaymentReceipt(userObj, payment);
             }
             dispatchPaymentSuccessNotifications(payment, null, userObj);
          } catch(e) {}
        }
        
        // 🛡️ Security Fix: Strict Redirect White-listing
        const safeRedirect = `${process.env.FRONTEND_URL}/student/payments/success`;
        return res.redirect(safeRedirect);
      }
    }
    
    const failRedirect = `${process.env.FRONTEND_URL}/student/payments/failed`;
    res.redirect(failRedirect);
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
      
      // 🛡️ Security Fix: Strictly verify gateway status server-to-server before activation
      if (result && result.status === 'Success' && result.paymentStatus === 'Success') {
        const payment = await Payment.findOne({ 
          transactionId: payment_ref_id, 
          status: 'pending' 
        });

        if (payment) {
          payment.status = 'completed';
          await payment.save();

          await redeemPaymentCoupon(payment);

          await Enrollment.findOneAndUpdate(
            { user: payment.user, course: payment.course },
            { paymentStatus: 'paid', branchId: payment.branchId },
            { upsert: true }
          );

          // Notify Student & Admins
          try {
             const userObj = await User.findById(payment.user);
             if (userObj) {
               await emailService.sendPaymentReceipt(userObj, payment);
             }
             dispatchPaymentSuccessNotifications(payment, null, userObj);
          } catch(e) {}
        }
        
        // 🛡️ Security Fix: Strict Redirect White-listing
        const safeRedirect = `${process.env.FRONTEND_URL}/student/payments/success`;
        return res.redirect(safeRedirect);
      }
    }
    
    const failRedirect = `${process.env.FRONTEND_URL}/student/payments/failed`;
    res.redirect(failRedirect);
  } catch (error) {
    next(error);
  }
};

// @desc    Replay / Force Fulfill Payment Webhook (Super Admin)
// @route   POST /api/payments/:id/replay-webhook
// @access  Private (super_admin, super_management)
const replayPaymentWebhook = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('course', 'title');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const { fee, net } = calculateGatewayFee(payment.method, payment.amount);
    payment.gatewayFee = payment.gatewayFee || fee;
    payment.netAmount = payment.netAmount || net;
    payment.status = 'completed';
    payment.webhookReplayed = true;
    payment.webhookReplayedAt = new Date();
    payment.webhookReplayedBy = req.user._id;
    await payment.save();

    await redeemPaymentCoupon(payment);

    // Upsert Enrollment record
    const enrollment = await Enrollment.findOneAndUpdate(
      { user: payment.user._id || payment.user, course: payment.course._id || payment.course },
      { paymentStatus: 'paid', isActive: true, branchId: payment.branchId },
      { upsert: true, new: true }
    );

    // 🔔 Real-time Notification Dispatch
    try {
      dispatchPaymentSuccessNotifications(payment, payment.course, payment.user);
    } catch (e) {}

    // Record AuditLog
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actor: req.user._id,
      action: 'REPLAY_PAYMENT_WEBHOOK',
      entity: 'Payment',
      entityId: payment._id,
      branchId: payment.branchId,
      details: {
        paymentId: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        gatewayFee: payment.gatewayFee,
        netAmount: payment.netAmount,
        method: payment.method,
        userId: payment.user?._id || payment.user,
        userName: payment.user?.name,
        courseId: payment.course?._id || payment.course,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      success: true,
      message: `Webhook successfully replayed. Enrollment activated for ${payment.user?.name || 'student'}.`,
      data: {
        payment,
        enrollmentId: enrollment._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  initializeCheckout,
  stripeWebhook,
  getPayments,
  exportPaymentsCSV,
  bkashCallback,
  nagadCallback,
  redeemPaymentCoupon,
  calculateGatewayFee,
  replayPaymentWebhook,
};

