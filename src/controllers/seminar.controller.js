const SeminarRegistration = require('../models/SeminarRegistration');
const emailService = require('../services/email.service');
const { isBranchAuthorized } = require('../middleware/rbac.middleware');

// @desc    Register for a free seminar / class
// @route   POST /api/seminar/register
// @access  Public
exports.registerForSeminar = async (req, res, next) => {
  try {
    const { name, phone, email, source, seminar, branchId } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone are required' });

    // Prevent duplicate registrations by phone + seminar
    const existing = await SeminarRegistration.findOne({ phone, seminar });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already registered for this seminar' });
    }

    const registration = await SeminarRegistration.create({ 
      name, 
      phone, 
      email, 
      source, 
      seminar,
      branchId: branchId || undefined
    });

    // Send confirmation email if email is provided (non-blocking)
    if (email) {
      try {
        await emailService.sendSeminarConfirmation({ name, email }, seminar);
      } catch (mailErr) {
        console.error('Seminar email failed:', mailErr.message);
      }
    }

    res.status(201).json({ success: true, data: registration, message: `Successfully registered for ${seminar || 'the seminar'}! We will contact you shortly.` });
  } catch (err) { next(err); }
};

// @desc    Get all seminar registrations (admin/staff only)
// @route   GET /api/seminar
// @access  Private (admin/staff)
exports.getAllRegistrations = async (req, res, next) => {
  try {
    const { seminar, attended, page = 1, limit = 50, branchId } = req.query;
    const filter = {};
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);

    if (isSuper) {
      if (branchId) filter.branchId = branchId;
    } else if (req.user.branchId) {
      filter.branchId = req.user.branchId;
    }

    if (seminar) filter.seminar = new RegExp(seminar, 'i');
    if (attended !== undefined) filter.attended = attended === 'true';

    const registrations = await SeminarRegistration.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SeminarRegistration.countDocuments(filter);
    res.json({ success: true, count: registrations.length, total, data: registrations });
  } catch (err) { next(err); }
};

// @desc    Mark a registrant as attended
// @route   PATCH /api/seminar/:id/attend
// @access  Private (admin/staff)
exports.markAttended = async (req, res, next) => {
  try {
    const reg = await SeminarRegistration.findById(req.params.id);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

    if (reg.branchId && !isBranchAuthorized(req, reg.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    reg.attended = true;
    await reg.save();

    res.json({ success: true, data: reg });
  } catch (err) { next(err); }
};
