const mongoose = require('mongoose');
const Seminar = require('../models/Seminar');
const SeminarRegistration = require('../models/SeminarRegistration');
const emailService = require('../services/email.service');
const {
  isBranchAuthorized,
  resolveBranchScope,
  resolveBranchReference,
} = require('../utils/branchHelper');
const { escapeRegex } = require('../utils/regex');

// Fields a seminar owner may change. `branchId`, `createdBy` and
// `registeredCount` are server owned and must never come from the body.
const UPDATABLE_SEMINAR_FIELDS = [
  'title',
  'description',
  'date',
  'time',
  'venue',
  'mode',
  'meetingLink',
  'speaker',
  'maxSeats',
  'banner',
  'topics',
  'status',
  'isPublished',
  'featured',
];

const pickUpdatableSeminarFields = (body = {}) =>
  UPDATABLE_SEMINAR_FIELDS.reduce((acc, field) => {
    if (body[field] !== undefined) acc[field] = body[field];
    return acc;
  }, {});

// @desc    Create a seminar for a branch (admin/staff/super_admin)
// @route   POST /api/seminars
// @access  Private (seminars:manage)
exports.createSeminar = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const targetBranchInput = isSuper ? (req.body.branchId || req.query.branchId) : req.user.branchId;
    const scope = await resolveBranchScope(req, targetBranchInput);
    const branchId = scope.branchId;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Valid branch reference is required' });
    }

    if (scope.denied) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    const {
      title,
      description,
      date,
      time,
      venue,
      mode,
      meetingLink,
      speaker,
      maxSeats,
      banner,
      topics,
      status,
      isPublished,
      featured,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'Title and Date are required' });
    }

    const seminar = await Seminar.create({
      title,
      description: description || '',
      branchId,
      date,
      time: time || '',
      venue: venue || 'Main Campus Hall',
      mode: mode || 'offline',
      meetingLink: meetingLink || '',
      speaker: speaker || {},
      maxSeats: Number(maxSeats) || 50,
      banner: banner || '',
      topics: Array.isArray(topics) ? topics : (topics ? topics.split(',').map(t => t.trim()) : []),
      status: status || 'upcoming',
      isPublished: isPublished !== undefined ? isPublished : true,
      featured: featured || false,
      createdBy: req.user._id,
    });

    const populated = await Seminar.findById(seminar._id).populate('branchId', 'name code city address phone');
    res.status(201).json({ success: true, data: populated, message: 'Seminar arranged successfully!' });
  } catch (err) { next(err); }
};

// @desc    Get all seminars (Public or filtered by branch)
// @route   GET /api/seminars
// @access  Public (optional branchId filter)
exports.getSeminars = async (req, res, next) => {
  try {
    const { branchId, status, mode, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (branchId) {
      const resolved = await resolveBranchReference(branchId);
      if (resolved) filter.branchId = resolved;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (mode && mode !== 'all') {
      filter.mode = mode;
    }

    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { title: new RegExp(escaped, 'i') },
        { description: new RegExp(escaped, 'i') },
        { 'speaker.name': new RegExp(escaped, 'i') },
      ];
    }

    const seminars = await Seminar.find(filter)
      .populate('branchId', 'name code city address phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Seminar.countDocuments(filter);
    res.json({ success: true, count: seminars.length, total, data: seminars });
  } catch (err) { next(err); }
};

// @desc    Get single seminar by ID
// @route   GET /api/seminars/:id
// @access  Public
exports.getSeminarById = async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id).populate('branchId', 'name code city address phone');
    if (!seminar) return res.status(404).json({ success: false, message: 'Seminar not found' });
    res.json({ success: true, data: seminar });
  } catch (err) { next(err); }
};

// @desc    Update a seminar (admin/staff)
// @route   PATCH /api/seminars/:id
// @access  Private (seminars:manage)
exports.updateSeminar = async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ success: false, message: 'Seminar not found' });

    if (!isBranchAuthorized(req, seminar.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    const updates = pickUpdatableSeminarFields(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    if (updates.topics && typeof updates.topics === 'string') {
      updates.topics = updates.topics.split(',').map(t => t.trim());
    }

    Object.assign(seminar, updates);
    await seminar.save();

    const populated = await Seminar.findById(seminar._id).populate('branchId', 'name code city address phone');
    res.json({ success: true, data: populated, message: 'Seminar updated successfully' });
  } catch (err) { next(err); }
};

// @desc    Delete a seminar (admin/staff)
// @route   DELETE /api/seminars/:id
// @access  Private (seminars:manage)
exports.deleteSeminar = async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ success: false, message: 'Seminar not found' });

    if (!isBranchAuthorized(req, seminar.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await Seminar.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Seminar deleted successfully' });
  } catch (err) { next(err); }
};

// @desc    Register for a free seminar (Public)
// @route   POST /api/seminars/register
// @access  Public
exports.registerForSeminar = async (req, res, next) => {
  try {
    const { name, phone, email, source, seminar, seminarId, branchId } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone are required' });

    let targetSeminar = null;
    let targetBranchId = branchId;
    let seminarTitle = seminar;

    if (seminarId && mongoose.Types.ObjectId.isValid(seminarId)) {
      targetSeminar = await Seminar.findById(seminarId);
      if (targetSeminar) {
        seminarTitle = targetSeminar.title;
        targetBranchId = targetSeminar.branchId;
      }
    }

    const resolvedBranch = await resolveBranchReference(targetBranchId);

    // Prevent duplicate registrations by phone + seminar
    const existing = await SeminarRegistration.findOne({ phone, seminar: seminarTitle });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already registered for this seminar' });
    }

    const registration = await SeminarRegistration.create({
      name,
      phone,
      email,
      source: source || 'website',
      seminar: seminarTitle,
      seminarId: targetSeminar ? targetSeminar._id : undefined,
      branchId: resolvedBranch || undefined,
      attendanceStatus: 'registered',
    });

    if (targetSeminar) {
      await Seminar.findByIdAndUpdate(targetSeminar._id, { $inc: { registeredCount: 1 } });
    }

    // Send confirmation email
    if (email) {
      try {
        await emailService.sendSeminarConfirmation({ name, email }, targetSeminar || seminarTitle);
      } catch (mailErr) {
        console.error('Seminar email failed:', mailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      data: registration,
      message: `Successfully registered for ${seminarTitle || 'the seminar'}! We will contact you shortly.`
    });
  } catch (err) { next(err); }
};

// @desc    Get all seminar registrations (admin/staff only)
// @route   GET /api/seminars/registrations
// @access  Private (admin/staff)
exports.getAllRegistrations = async (req, res, next) => {
  try {
    const { seminar, seminarId, attended, attendanceStatus, page = 1, limit = 50, branchId } = req.query;
    const filter = {};
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const targetBranchInput = isSuper ? branchId : req.user.branchId;

    if (targetBranchInput) {
      const scope = await resolveBranchScope(req, targetBranchInput);
      if (scope.denied) {
        return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
      }
      if (scope.branchId) filter.branchId = scope.branchId;
    }

    if (seminarId && mongoose.Types.ObjectId.isValid(seminarId)) {
      filter.seminarId = seminarId;
    }
    if (seminar) filter.seminar = new RegExp(escapeRegex(seminar), 'i');
    if (attendanceStatus) filter.attendanceStatus = attendanceStatus;
    if (attended !== undefined) filter.attended = attended === 'true';

    const registrations = await SeminarRegistration.find(filter)
      .populate('branchId', 'name code city')
      .populate('seminarId', 'title date time venue mode')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SeminarRegistration.countDocuments(filter);
    res.json({ success: true, count: registrations.length, total, data: registrations });
  } catch (err) { next(err); }
};

// @desc    Mark a registrant as attended / absent
// @route   PATCH /api/seminars/registrations/:id
// @access  Private (admin/staff)
exports.markAttended = async (req, res, next) => {
  try {
    const reg = await SeminarRegistration.findById(req.params.id);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

    // A registration created through the public form may carry no branch of
    // its own — fall back to the branch of the seminar it belongs to.
    let ownerBranchId = reg.branchId;
    if (!ownerBranchId && reg.seminarId) {
      const seminar = await Seminar.findById(reg.seminarId).select('branchId').lean();
      ownerBranchId = seminar?.branchId;
    }

    if (ownerBranchId && !isBranchAuthorized(req, ownerBranchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    const { attendanceStatus, attended } = req.body;
    if (attendanceStatus) {
      reg.attendanceStatus = attendanceStatus;
      reg.attended = attendanceStatus === 'attended';
    } else if (attended !== undefined) {
      reg.attended = Boolean(attended);
      reg.attendanceStatus = attended ? 'attended' : 'absent';
    } else {
      reg.attended = true;
      reg.attendanceStatus = 'attended';
    }

    await reg.save();
    res.json({ success: true, data: reg });
  } catch (err) { next(err); }
};
