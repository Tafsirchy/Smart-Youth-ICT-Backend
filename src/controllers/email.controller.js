const LeadCRM = require('../models/LeadCRM');
const Branch = require('../models/Branch');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @desc  Subscribe visitor email to newsletter (creates LeadCRM with source: 'newsletter')
 * @route POST /api/email/subscribe
 * @access Public
 */
exports.subscribeNewsletter = async (req, res, next) => {
  try {
    const rawEmail = req.body.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Idempotent check: if already subscribed to newsletter, return success gracefully
    const existing = await LeadCRM.findOne({ email, source: 'newsletter' });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to our newsletter.',
        data: { id: existing._id, email: existing.email },
      });
    }

    // Resolve head office or default branch for multi-tenant lead assignment
    let branch = await Branch.findOne({ type: 'head_office' });
    if (!branch) {
      branch = await Branch.findOne().sort({ createdAt: 1 });
    }

    const name = req.body.name && typeof req.body.name === 'string'
      ? req.body.name.trim()
      : email.split('@')[0];

    const lead = await LeadCRM.create({
      name,
      email,
      phone: req.body.phone && typeof req.body.phone === 'string' ? req.body.phone.trim() : '',
      source: 'newsletter',
      interest: req.body.interest || 'Newsletter / Tech Updates',
      status: 'new',
      notes: [{ text: 'Subscribed via website footer newsletter' }],
      branchId: branch ? branch._id : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing to our newsletter!',
      data: {
        id: lead._id,
        email: lead.email,
        source: lead.source,
      },
    });
  } catch (err) {
    next(err);
  }
};
