const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Enrollment = require('../models/Enrollment');

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

    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.user._id,
      fileUrl, // e.g., GitHub repo link or ImgBB screenshot
      notes,
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
    const assignment = await Assignment.create(req.body);
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

    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'graded';
    await submission.save();

    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};
