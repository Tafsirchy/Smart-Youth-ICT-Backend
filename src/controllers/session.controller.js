const Session = require('../models/Session');
const Course = require('../models/Course');

// @desc    Get all sessions for a branch/course
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res, next) => {
  try {
    const branchId = req.user.branchId || req.query.branchId;
    const filter   = {};

    if (req.user.role !== 'super_admin') {
      if (!branchId) return res.status(403).json({ success: false, message: 'Branch ID context required' });
      filter.branchId = branchId;
    }
    
    if (req.query.courseId) filter.course = req.query.courseId;

    const sessions = await Session.find(filter)
      .populate('course', 'title')
      .populate('instructor', 'name')
      .populate('management', 'name')
      .sort('startTime');

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new live session (Dual-Control: Admin/Management/Instructor)
// @route   POST /api/sessions
// @access  Private (Admin/Branch Management/Instructor)
exports.createSession = async (req, res, next) => {
  try {
    const { courseId, title, startTime, endTime, meetingLink, instructorId } = req.body;
    const branchId = req.user.branchId;

    if (!branchId) return res.status(403).json({ success: false, message: 'Branch context missing.' });

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
// @access  Private (Host/Co-Host)
exports.updateSession = async (req, res, next) => {
  try {
    let session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // Authorization check
    const isOwner = session.instructor.toString() === req.user._id.toString();
    const isMgmt  = session.management?.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'branch_admin', 'branch_management'].includes(req.user.role);

    if (!isOwner && !isMgmt && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this session' });
    }

    session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};
