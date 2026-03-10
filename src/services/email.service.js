const transporter = require('../config/mail');

const emailService = {
  /**
   * Send a welcome email after registration.
   */
  sendWelcome: async (user) => {
    await transporter.sendMail({
      from:    `"Smart Youth ICT" <${process.env.MAIL_FROM}>`,
      to:      user.email,
      subject: 'Welcome to SYICT 🎓',
      html:    `
        <h2>Welcome, ${user.name}!</h2>
        <p>Your journey to IT mastery starts now. Login to your dashboard to get started.</p>
        <a href="${process.env.FRONTEND_URL}/student">Go to Dashboard →</a>
      `,
    });
  },

  /**
   * Send enrollment confirmation.
   */
  sendEnrollmentConfirm: async (user, course) => {
    await transporter.sendMail({
      from:    `"Smart Youth ICT" <${process.env.MAIL_FROM}>`,
      to:      user.email,
      subject: `✅ Enrolled: ${course.title?.en || course.title}`,
      html:    `<h2>Congrats ${user.name}!</h2><p>You are now enrolled in <strong>${course.title?.en}</strong>.</p>`,
    });
  },

  /**
   * Send installment payment reminder.
   */
  sendInstallmentReminder: async (user, payment) => {
    await transporter.sendMail({
      from:    `"Smart Youth ICT" <${process.env.MAIL_FROM}>`,
      to:      user.email,
      subject: '⚠️ Installment Payment Reminder',
      html:    `<p>Hi ${user.name}, your next installment of ৳${payment.amount} is due. Please pay to continue your course access.</p>`,
    });
  },

  /**
   * Send certificate issuance notification.
   */
  sendCertificateReady: async (user, certificate) => {
    await transporter.sendMail({
      from:    `"Smart Youth ICT" <${process.env.MAIL_FROM}>`,
      to:      user.email,
      subject: '🏆 Your Certificate is Ready!',
      html:    `<h2>Congratulations ${user.name}!</h2><p>Download your certificate: <a href="${certificate.certificateUrl}">Click here</a></p>`,
    });
  },
};

module.exports = emailService;
