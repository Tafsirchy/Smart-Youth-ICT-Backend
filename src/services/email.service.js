const transporter = require('../config/mail');
const { wrapLayout } = require('../utils/emailLayout');

const MAIL_FROM = process.env.MAIL_FROM || 'smartyouthictbd@gmail.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const emailService = {
  /**
   * Internal async sender
   */
  _send: async (options) => {
    try {
      if (!process.env.MAIL_PASS) {
        console.log('[Email Simulation]', options.to, options.subject);
        return { success: true, simulated: true };
      }
      const info = await transporter.sendMail({
        from: `"Smart Youth ICT" <${MAIL_FROM}>`,
        ...options,
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Email SMTP Error]', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🎓 Welcome Email (Student Onboarding)
   */
  sendWelcome: async (user) => {
    const content = `
      <h2 style="color: #1e1b4b; font-size: 20px; font-weight: 700; border-bottom: 2px solid #db2711; display: inline-block; padding-bottom: 5px;">Welcome to the Family, ${user.name}!</h2>
      <p style="margin-top: 20px;">Your journey to IT mastery starts now. We're excited to have you on board with SYICT, <strong>Bangladesh's leading youth ICT platform.</strong></p>
      
      <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px dashed #e2e8f0;">
        <h4 style="margin: 0 0 15px 0; color: #1e1b4b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Roadmap to Mastery:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
          <li style="margin-bottom: 10px;">Explore over 50+ cutting-edge IT courses</li>
          <li style="margin-bottom: 10px;">Access your lessons anywhere, anytime</li>
          <li style="margin-bottom: 10px;">Join our community of over 5,000 students</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${FRONTEND_URL}/login" style="background-color: #db2777; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(219, 39, 119, 0.4);">Launch Dashboard</a>
      </div>
    `;
    return emailService._send({
      to: user.email,
      subject: 'Welcome to SYICT — Bangladesh\'s Leading ICT Platform 🎓',
      html: wrapLayout('Student Onboarding', content, 'This email confirms your official registration with SYICT LTD.')
    });
  },

  /**
   * 🧾 Payment Receipt (Transaction Confirmation)
   */
  sendPaymentReceipt: async (user, payment) => {
    const content = `
      <p>Hi ${user.name}, we've successfully received your payment. Your enrollment is now active.</p>
      
      <div style="margin: 30px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 15px 25px; border-bottom: 1px solid #e2e8f0;">
          <h4 style="margin: 0; color: #1e1b4b; font-size: 13px; text-transform: uppercase;">Transaction Details</h4>
        </div>
        <table width="100%" style="border-collapse: collapse; padding: 20px;">
          <tr>
            <td style="padding: 15px 25px; color: #64748b; font-size: 14px;">Transaction ID:</td>
            <td align="right" style="padding: 15px 25px; color: #1e293b; font-weight: 600; font-family: monospace;">${payment.transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 15px 25px; color: #64748b; font-size: 14px;">Payment Method:</td>
            <td align="right" style="padding: 15px 25px; color: #1e293b; font-weight: 600;">${payment.method.toUpperCase()}</td>
          </tr>
          <tr style="background-color: #fff1f2;">
            <td style="padding: 15px 25px; color: #e11d48; font-weight: 700; font-size: 16px;">Total Paid:</td>
            <td align="right" style="padding: 15px 25px; color: #e11d48; font-weight: 800; font-size: 18px;">৳${payment.amount}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 13px; color: #94a3b8; text-align: center;">Please keep this receipt for your records. If you didn't make this purchase, contact us immediately.</p>
    `;
    return emailService._send({
      to: user.email,
      subject: `🧾 Payment Receipt: ${payment.transactionId} — SYICT`,
      html: wrapLayout('Payment Receipt', content, `Receipt ID: ${payment._id.toString().slice(-8).toUpperCase()}`)
    });
  },

  /**
   * ✅ Enrollment Confirmation (Course Activated)
   */
  sendEnrollmentConfirm: async (user, course) => {
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 48px;">🎯</span>
        <h2 style="color: #059669; font-size: 22px; margin: 10px 0;">Goal Achieved: You're Enrolled!</h2>
      </div>
      <p>Congratulations <strong>${user.name}</strong>, you've gained full access to one of our premium pathways:</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 25px; border-radius: 12px; margin: 25px 0;">
        <h3 style="color: #166534; font-size: 18px; font-weight: 700; margin: 0;">${course.title?.en || course.title}</h3>
        <p style="color: #15803d; font-size: 14px; margin: 5px 0 0 0;">Access: Full Lifetime Entry (incl. all future updates)</p>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${FRONTEND_URL}/student" style="background-color: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Start First Lesson</a>
      </div>
    `;
    return emailService._send({
      to: user.email,
      subject: `🎯 Admission Confirmed: ${course.title?.en || course.title}`,
      html: wrapLayout('Enrollment Successful', content, 'Happy Learning! 🚀')
    });
  },

  /**
   * 🏗️ Branch Onboarding (Logistics/B2B)
   */
  sendBranchOnboarding: async (admin, branch, tempPassword) => {
    const content = `
      <p>Dear <strong>${admin.name}</strong>,</p>
      <p>Welcome to the SYICT Strategic Partner Network. You have been appointed as the administrator for the <strong>${branch.name}</strong> branch.</p>
      
      <div style="background-color: #fff7ed; border: 2px solid #fdba74; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <p style="color: #9a3412; font-weight: 600; margin: 0 0 15px 0;">Administrative Credentials:</p>
        <p style="font-family: monospace; font-size: 14px; margin: 5px 0;">Portal LOGIN: <span style="background: white; padding: 2px 5px;">${admin.email}</span></p>
        <p style="font-family: monospace; font-size: 14px; margin: 5px 0;">ACCESS KEY: <span style="background: white; padding: 2px 5px;">${tempPassword}</span></p>
      </div>
      
      <p style="color: #ef4444; font-size: 13px; font-weight: 600;">⚠️ MANDATORY ACTION: You must change this temporary password during your first session to secure the branch data.</p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${FRONTEND_URL}/login" style="background-color: #1e1b4b; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Enter Admin Portal</a>
      </div>
    `;
    return emailService._send({
      to: admin.email,
      subject: `🏢 Branch Operations Initialized: ${branch.name}`,
      html: wrapLayout('Branch Onboarding', content, 'Welcome to the operational team.')
    });
  },

  /**
   * 📝 Assignment Feedback (Academic Progress)
   */
  sendAssignmentFeedback: async (student, assignment, grade) => {
    const content = `
      <p>Hi ${student.name}, our academic team has evaluated your submission for:</p>
      <h3 style="color: #1e1b4b; margin: 10px 0;">${assignment.title}</h3>
      
      <div style="background-color: #f1f5f9; padding: 30px; border-radius: 16px; text-align: center; margin: 30px 0;">
        <p style="color: #64748b; font-size: 14px; text-transform: uppercase;">Your Performance Score:</p>
        <h1 style="color: #2563eb; font-size: 48px; margin: 5px 0;">${grade}</h1>
        <p style="color: #3b82f6; font-size: 13px; font-weight: 600;">Assessment Status: Graded</p>
      </div>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${FRONTEND_URL}/student/assignments" style="color: #2563eb; text-decoration: underline; font-weight: 600;">Read Detailed Instructor Feedback</a>
      </div>
    `;
    return emailService._send({
      to: student.email,
      subject: `📝 Assignment Graded: ${assignment.title} — SYICT`,
      html: wrapLayout('Performance Report', content, 'Consistency is key to mastery.')
    });
  },

  /**
   * 🎙️ Seminar / Webinar Ticket
   */
  sendSeminarConfirmation: async (guest, seminar) => {
    const content = `
      <p>Hi ${guest.name}, we've successfully reserved your seat for the following session:</p>
      
      <div style="background-color: #1e1b4b; border-radius: 12px; padding: 0; overflow: hidden; margin: 25px 0; color: white;">
        <div style="background-color: #db2711; padding: 10px 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Entry Ticket - Reserved</div>
        <div style="padding: 25px;">
           <h3 style="margin: 0 0 15px 0; color: white;">${typeof seminar === 'string' ? seminar : seminar.title}</h3>
           <p style="font-size: 14px; opacity: 0.9; margin: 5px 0;">📅 Date: ${seminar.date || 'TBA'}</p>
           <p style="font-size: 14px; opacity: 0.9; margin: 5px 0;">🕒 Time: ${seminar.time || 'TBA'}</p>
           <p style="font-size: 14px; opacity: 0.9; margin: 5px 0;">📍 Location: ${seminar.location || 'Online Session'}</p>
        </div>
      </div>
      
      <p style="font-size: 14px; color: #475569;">You will receive the access link/joining details 2 hours before the session starts.</p>
    `;
    return emailService._send({
      to: guest.email,
      subject: `🎙️ Ticket Confirmed: ${typeof seminar === 'string' ? seminar : seminar.title}`,
      html: wrapLayout('Seminar Access Pass', content, 'See you at the session! 🚀')
    });
  },

  /**
   * 🔐 Password Reset (Security/Recovery)
   */
  sendPasswordReset: async (user, resetUrl) => {
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 48px;">🔐</span>
        <h2 style="color: #1e1b4b; font-size: 22px; margin: 10px 0;">Reset Your Password</h2>
      </div>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>You're receiving this email because we received a password reset request for your account. If you didn't request this, please ignore this email.</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${resetUrl}" style="background-color: #db2777; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(219, 39, 119, 0.4);">Reset My Password</a>
      </div>

      <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 15px 20px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #9f1239; font-size: 13px; margin: 0;"><strong>Security Note:</strong> This link will expire in 1 hour for your protection. For your security, never share this link with anyone.</p>
      </div>
      
      <p style="font-size: 13px; color: #94a3b8; text-align: center;">If the button above doesn't work, copy and paste the following link into your browser:</p>
      <p style="font-size: 11px; color: #6366f1; text-align: center; word-break: break-all;">${resetUrl}</p>
    `;
    return emailService._send({
      to: user.email,
      subject: '🔐 Reset Your SYICT Password',
      html: wrapLayout('Security Alert', content, 'Password recovery initialized.')
    });
  }
};

module.exports = emailService;
