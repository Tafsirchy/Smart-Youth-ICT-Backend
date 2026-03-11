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
  /**
   * Send a password reset link email.
   */
  sendPasswordReset: async (user, resetUrl) => {
    await transporter.sendMail({
      from:    `"Smart Youth ICT" <${process.env.MAIL_FROM}>`,
      to:      user.email,
      subject: '🔒 Password Reset Request — SYICT',
      html:    `
        <h2>Hi ${user.name},</h2>
        <p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Reset My Password</a></p>
        <p style="color:#6b7280;font-size:12px;margin-top:20px;">If you did not request this, please ignore this email. Your password will remain unchanged.</p>
      `,
    });
  },
};

module.exports = emailService;
