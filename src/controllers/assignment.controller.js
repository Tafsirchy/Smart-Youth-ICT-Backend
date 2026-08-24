const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const emailService = require('../services/email.service');

// @desc    Get assignments for a specific course
// @route   GET /api/assignments/:courseId
// @access  Private
exports.getAssignmentsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    // Check enrollment if student
    if (req.user.role === 'student') {
      const isEnrolled = await Enrollment.findOne({ user: req.user._id, course: courseId, isActive: true });
      if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    const assignments = await Assignment.find({ course: courseId }).sort({ dueDate: 1 });
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit an assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
exports.submitAssignment = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const { fileUrl, notes } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    
    if (assignment.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Assignment is no longer accepting submissions' });
    }

    // Check if already submitted
    const existing = await Submission.findOne({ assignment: assignmentId, student: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already submitted this assignment' });
    }

    // 🛡️ Security Fix: Sanitize input to prevent Stored XSS
    const cleanFileUrl = String(fileUrl || "").trim();
    if (cleanFileUrl.toLowerCase().startsWith('javascript:')) {
      return res.status(400).json({ success: false, message: 'Invalid file URL provided' });
    }

    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.user._id,
      branchId: req.user.branchId, // Denormalized branchId for isolation
      fileUrl: cleanFileUrl, 
      notes: typeof notes === 'string' ? require('sanitize-html')(notes) : notes,
    });

    res.status(201).json({ success: true, data: submission, message: 'Assignment submitted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private (Admin/Instructor)
exports.createAssignment = async (req, res, next) => {
  try {
    // 🛡️ Security Fix: Explicit allow-list for Mass Assignment protection
    const { course: courseId, title, lessonTitle, description, dueDate, points, status } = req.body;
    
    // Authorization: Ensure instructor owns the course
    const course = await require('../models/Course').findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role === 'instructor') {
      if (course.instructor?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only create assignments for your own courses' });
      }
    }

    const assignment = await Assignment.create({
      course: courseId,
      branchId: course.branchId,
      title,
      lessonTitle,
      description,
      dueDate,
      points,
      status: status || 'active'
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
};

// @desc    Grade submission
// @route   PUT /api/assignments/submissions/:id/grade
// @access  Private (Admin/Instructor)
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;
    let submission = await Submission.findById(req.params.id);
    
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    // 🛡️ Security Fix: Authorization Check
    // Ensure instructor owns the course associated with this assignment
    const assignment = await Assignment.findById(submission.assignment).populate('course');
    if (req.user.role === 'instructor' && assignment?.course?.instructor?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You do not teach this course' });
    }

    submission.grade = grade;
    submission.feedback = require('sanitize-html')(feedback || "");
    submission.status = 'graded';
    await submission.save();

    // 📧 Notify Student
    try {
      const student = await User.findById(submission.student);
      if (student) {
        emailService.sendAssignmentFeedback(student, assignment, grade)
          .catch(e => console.error('[Assignment Email Failed]', e.message));
      }
    } catch(e) {}

    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all assignments for current student (based on enrollments)
// @route   GET /api/assignments/my-assignments
// @access  Private (Student)
exports.getMyAssignments = async (req, res, next) => {
  try {
    // 1. Find all active enrollments for this student
    const enrollments = await Enrollment.find({ user: req.user._id, isActive: true }).select('course');
    const courseIds = enrollments.map(e => e.course);

    if (courseIds.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // 2. Find all assignments for those courses
    const assignments = await Assignment.find({ course: { $in: courseIds }, status: 'active' })
      .populate('course', 'title category')
      .sort({ dueDate: 1 });

    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all submissions by current student
// @route   GET /api/assignments/my-submissions
// @access  Private (Student)
exports.getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate({
        path: 'assignment',
        select: 'title lessonTitle course',
        populate: { path: 'course', select: 'title' }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all submissions for an instructor's courses
// @route   GET /api/assignments/instructor/submissions
// @access  Private (Instructor/Admin)
exports.getInstructorSubmissions = async (req, res, next) => {
  try {
    const instructorId = req.user._id;

    // 1. Get courses taught by instructor
    const courses = await require('../models/Course').find({ instructor: instructorId }).select('_id');
    const courseIds = courses.map(c => c._id);

    // 2. Get assignments for those courses
    const assignments = await Assignment.find({ course: { $in: courseIds } }).select('_id');
    const assignmentIds = assignments.map(a => a._id);

    // 3. Get submissions for those assignments
    const submissions = await Submission.find({ assignment: { $in: assignmentIds } })
      .populate('student', 'name email avatar')
      .populate({
        path: 'assignment',
        select: 'title course',
        populate: { path: 'course', select: 'title' }
      })
      .sort('-createdAt');

    res.json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
};
