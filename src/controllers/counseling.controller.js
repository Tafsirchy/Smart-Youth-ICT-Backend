const CounselingSession = require('../models/CounselingSession');
const {
  isBranchAuthorized,
  resolveBranchScope,
  resolveBranchReference,
} = require('../utils/branchHelper');
const { escapeRegex } = require('../utils/regex');

// Fields a branch admin may change on a counseling session. Everything else —
// most importantly `branchId` — is server owned and must never come from the
// request body.
const UPDATABLE_SESSION_FIELDS = [
  'status',
  'preferredDate',
  'preferredSlot',
  'mode',
  'interestedCourse',
  'assignedTo',
  'followUpDate',
];

const pickUpdatableFields = (body = {}) =>
  UPDATABLE_SESSION_FIELDS.reduce((acc, field) => {
    if (body[field] !== undefined) acc[field] = body[field];
    return acc;
  }, {});

// ─── Public Booking ──────────────────────────────────────────────────
exports.bookCounseling = async (req, res, next) => {
  try {
    const { branchId: rawBranch, fullName, phone, email, interestedCourse, preferredDate, preferredSlot, mode } = req.body;
    
    if (!fullName || !phone || !preferredDate || !preferredSlot) {
      return res.status(400).json({ success: false, message: 'Full name, phone, preferred date, and slot are required' });
    }

    const branchId = await resolveBranchReference(rawBranch);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Invalid or missing Branch' });
    }

    const session = await CounselingSession.create({
      branchId,
      fullName,
      phone,
      email,
      interestedCourse: interestedCourse || null,
      preferredDate: new Date(preferredDate),
      preferredSlot,
      mode: mode || 'in-person',
      source: 'website',
      status: 'booked'
    });

    const populated = await CounselingSession.findById(session._id)
      .populate('branchId', 'name code slug address phone')
      .populate('interestedCourse', 'title price');

    res.status(201).json({
      success: true,
      message: 'Counseling appointment booked successfully! Our branch counselor will reach out shortly.',
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin Pipeline ──────────────────────────────────────────────────
exports.getCounselingSessions = async (req, res, next) => {
  try {
    const rawBranch = req.query.branchId || req.user.branchId;
    const scope = await resolveBranchScope(req, rawBranch);

    if (scope.denied) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission for this branch.',
      });
    }

    const filter = {};

    if (scope.branchId) {
      filter.branchId = scope.branchId;
    }

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    if (req.query.mode && req.query.mode !== 'all') {
      filter.mode = req.query.mode;
    }
    if (req.query.search) {
      const q = String(req.query.search).trim();
      const escapedQ = escapeRegex(q);
      filter.$or = [
        { fullName: { $regex: escapedQ, $options: 'i' } },
        { phone: { $regex: escapedQ, $options: 'i' } },
        { email: { $regex: escapedQ, $options: 'i' } }
      ];
    }

    const sessions = await CounselingSession.find(filter)
      .populate('branchId', 'name code slug')
      .populate('interestedCourse', 'title price thumbnail')
      .populate('assignedTo', 'name email avatar phone')
      .populate('counselorNotes.author', 'name role')
      .sort('-preferredDate -createdAt');

    // Pipeline Analytics
    const statsFilter = scope.branchId ? { branchId: scope.branchId } : {};
    const allSessions = await CounselingSession.find(statsFilter);

    const counts = {
      booked: 0,
      attended: 0,
      'follow-up': 0,
      enrolled: 0,
      cancelled: 0
    };

    allSessions.forEach((s) => {
      if (counts[s.status] !== undefined) counts[s.status]++;
    });

    const total = allSessions.length;
    const conversionRate = total > 0 ? ((counts.enrolled / total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
      analytics: {
        total,
        counts,
        conversionRate: Number(conversionRate)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCounselingSession = async (req, res, next) => {
  try {
    const session = await CounselingSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (!isBranchAuthorized(req, session.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    const updates = pickUpdatableFields(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const updated = await CounselingSession.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('branchId', 'name code slug')
      .populate('interestedCourse', 'title price thumbnail')
      .populate('assignedTo', 'name email avatar phone')
      .populate('counselorNotes.author', 'name role');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.addCounselingNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Note text required' });

    let session = await CounselingSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (!isBranchAuthorized(req, session.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    session.counselorNotes.push({
      note,
      author: req.user._id,
      createdAt: new Date()
    });

    await session.save();

    const populated = await CounselingSession.findById(session._id)
      .populate('branchId', 'name code slug')
      .populate('interestedCourse', 'title price thumbnail')
      .populate('assignedTo', 'name email avatar phone')
      .populate('counselorNotes.author', 'name role');

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.deleteCounselingSession = async (req, res, next) => {
  try {
    const session = await CounselingSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (!isBranchAuthorized(req, session.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await CounselingSession.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    next(err);
  }
};
