const nodemailer = require('nodemailer');

// We use SMTP_HOST etc, or fallback to the older MAIL_HOST just in case.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.MAIL_HOST,
  port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 587,
  secure: Number(process.env.SMTP_PORT || process.env.MAIL_PORT) === 465, 
  auth: {
    user: process.env.SMTP_USER || process.env.MAIL_USER,
    pass: process.env.SMTP_PASS || process.env.MAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.warn('⚠️  Mail transport not ready. Please check SMTP configuration in .env', err.message);
  } else {
    console.log('✉️  SMTP Server Ready');
  }
});

module.exports = transporter;
