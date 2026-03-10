const crypto      = require('crypto');
const Certificate = require('../models/Certificate');
const emailService = require('./email.service');

const certificateService = {
  /**
   * Generate a certificate for a user who completed a course.
   * In production: use Puppeteer to render an HTML template → PDF → upload to Cloudinary.
   */
  generate: async (user, course) => {
    const verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();

    // TODO: Render HTML certificate template with Puppeteer → save PDF → upload to Cloudinary
    const certificateUrl = `${process.env.FRONTEND_URL}/verify/${verificationCode}`;

    const cert = await Certificate.create({
      user:             user._id,
      course:           course._id,
      certificateUrl,
      verificationCode,
    });

    await emailService.sendCertificateReady(user, cert);
    return cert;
  },

  verify: async (code) => {
    return Certificate.findOne({ verificationCode: code })
      .populate('user',   'name')
      .populate('course', 'title');
  },
};

module.exports = certificateService;
