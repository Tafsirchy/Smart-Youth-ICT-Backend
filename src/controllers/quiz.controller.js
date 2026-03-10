const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');

// @desc    Get all published quizzes for a course
// @route   GET /api/quizzes/course/:courseId
// @access  Private (Student checking enrollment)
exports.getQuizzesByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (req.user.role === 'student') {
      const isEnrolled = await Enrollment.findOne({ user: req.user._id, course: courseId, isActive: true });
      if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    const quizzes = await Quiz.find({ course: courseId, status: 'published' }).select('-questions.correctOptions');
    res.json({ success: true, count: quizzes.length, data: quizzes });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single quiz (omits answers for students)
// @route   GET /api/quizzes/:id
// @access  Private
exports.getQuizDetails = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Remove correct answers from response if requested by a student
    if (req.user.role === 'student') {
      const sanitizedQuestions = quiz.questions.map(q => {
        const { correctOptions, ...safeQ } = q.toObject();
        return safeQ;
      });
      return res.json({ success: true, data: { ...quiz.toObject(), questions: sanitizedQuestions } });
    }

    res.json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit a quiz attempt
// @route   POST /api/quizzes/:id/submit
// @access  Private (Student)
exports.submitQuiz = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body; // Array of { questionId, selectedOptions: [0, 1] }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || quiz.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Quiz not available' });
    }

    let totalPoints = 0;
    let earnedPoints = 0;

    // Calculate score
    quiz.questions.forEach(q => {
      totalPoints += q.points;
      const studentAnswer = answers.find(a => a.questionId.toString() === q._id.toString());
      
      if (studentAnswer) {
        // Compare arrays (assuming simple exact match required for points)
        const isCorrect = 
          studentAnswer.selectedOptions.length === q.correctOptions.length &&
          studentAnswer.selectedOptions.every(opt => q.correctOptions.includes(opt));
        
        if (isCorrect) earnedPoints += q.points;
      }
    });

    const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = scorePercentage >= quiz.passingScore;

    const attempt = await QuizAttempt.create({
      quiz: quizId,
      student: req.user._id,
      answers,
      score: scorePercentage,
      passed,
    });

    res.status(201).json({ 
      success: true, 
      message: passed ? 'Congratulations, you passed!' : 'You did not pass. Try again.',
      data: { score: scorePercentage, passed, attemptId: attempt._id }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new quiz
// @route   POST /api/quizzes
// @access  Private (Admin/Instructor)
exports.createQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.create(req.body);
    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
};
