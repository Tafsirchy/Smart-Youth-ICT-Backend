const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST   || 'smtp.sendgrid.net',
  port:   Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.warn('⚠️  Mail transport not ready:', err.message);
  else     console.log('✉️  Mail server ready');
});

module.exports = transporter;
