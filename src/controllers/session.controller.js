const Session = require('../models/Session');
const Course = require('../models/Course');
const { isBranchAuthorized } = require('../middleware/rbac.middleware');

// @desc    Get all sessions for a branch/course
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const filter = {};

    if (isSuper) {
      if (req.query.branchId) filter.branchId = req.query.branchId;
    } else if (req.user.role === 'instructor') {
      filter.instructor = req.user._id;
    } else {
      if (!req.user.branchId) return res.status(403).json({ success: false, message: 'Branch ID context required' });
      filter.branchId = req.user.branchId;
    }
    
    if (req.query.courseId) filter.course = req.query.courseId;

    const sessions = await Session.find(filter)
      .populate('course', 'title')
      .populate('instructor', 'name email avatar')
      .populate('management', 'name')
      .sort('startTime');

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new live session (Dual-Control: Admin/Management/Instructor)
// @route   POST /api/sessions
// @access  Private (Admin/Branch Management/Instructor/Employee with sessions:manage)
exports.createSession = async (req, res, next) => {
  try {
    const { courseId, title, startTime, endTime, meetingLink, instructorId } = req.body;
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const branchId = isSuper ? (req.body.branchId || req.user.branchId) : req.user.branchId;

    if (!branchId) return res.status(400).json({ success: false, message: 'Branch context missing.' });

    const session = await Session.create({
      course: courseId,
      branchId,
      title,
      startTime,
      endTime,
      meetingLink,
      instructor: instructorId || req.user._id,
      management: req.user.role !== 'instructor' ? req.user._id : null
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// @desc    Update session (Start Live/Complete)
// @route   PATCH /api/sessions/:id
// @access  Private (Host/Co-Host/Branch Manager/Authorized Employee)
exports.updateSession = async (req, res, next) => {
  try {
    let session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // Authorization check
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const isInstructorOwner = session.instructor.toString() === req.user._id.toString();
    const isBranchAuthorizedForDoc = isBranchAuthorized(req, session.branchId);
    const isManager = ['branch_admin', 'branch_management'].includes(req.user.role);
    const hasEmployeePerm = req.user.role === 'employee' && req.user.permissions?.includes('sessions:manage');

    if (!isSuper && !isInstructorOwner && !(isBranchAuthorizedForDoc && (isManager || hasEmployeePerm))) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this session' });
    }

    const updates = { ...req.body };
    delete updates.branchId; // prevent cross-branch migration

    session = await Session.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};
