const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT) || 465,
  secure: true, // Use SSL for port 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.warn('⚠️  Mail transport not ready:', err.message);
  else     console.log('✉️  Gmail SMTP Server Ready');
});

module.exports = transporter;
