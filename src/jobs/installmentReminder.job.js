const cron      = require('node-cron');
const Payment   = require('../models/Payment');
const emailService = require('../services/email.service');

// Run daily at 9 AM (Bangladesh time)
cron.schedule('0 3 * * *', async () => {
  console.log('[JOB] Running installment reminder...');
  try {
    const overduePayments = await Payment.find({
      status:        'pending',
      isInstallment: true,
      createdAt:     { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).populate('user', 'name email phone');

    for (const payment of overduePayments) {
      await emailService.sendInstallmentReminder(payment.user, payment);
      console.log(`[JOB] Reminder sent to ${payment.user.email}`);
    }
  } catch (err) {
    console.error('[JOB] Installment reminder error:', err.message);
  }
});
