const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const certificateService = require('../services/certificate.service');

// Helper to generate unique credential ID
const generateCredentialId = () => crypto.randomBytes(6).toString('hex').toUpperCase();

// @desc    Generate or retrieve a certificate for a completed course
// @route   GET /api/certificates/:courseId
// @access  Private
exports.getCertificate = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Check if progress is completed
    const progress = await Progress.findOne({ student: req.user._id, course: courseId });
    if (!progress || !progress.isCompleted) {
      return res.status(400).json({ success: false, message: 'Course must be 100% completed to earn a certificate.' });
    }

    // Check if certificate already exists
    let certificate = await Certificate.findOne({ student: req.user._id, course: courseId }).populate('course', 'title');
    
    if (!certificate) {
      const course = await Course.findById(courseId);
      certificate = await Certificate.create({
        student: req.user._id,
        course: courseId,
        credentialId: `SYICT-${generateCredentialId()}`,
      });
      // Attach course title for immediate response without re-querying
      certificate = certificate.toObject();
      certificate.course = { _id: course._id, title: course.title };
    }

    res.json({ success: true, data: certificate });
  } catch (err) {
    next(err);
  }
};

// @desc    Download Certificate as PDF via Puppeteer
// @route   GET /api/certificates/:id/download
// @access  Private
exports.downloadCertificate = async (req, res, next) => {
  try {
    const certificateId = req.params.id;
    const certificate = await Certificate.findById(certificateId)
      .populate('student', 'name email')
      .populate('course', 'title');

    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });

    // Ensure the student owns the certificate or is staff/admin
    const isStaffOrAdmin = ['super_admin', 'super_management', 'branch_admin', 'branch_management'].includes(req.user.role);
    if (certificate.student._id.toString() !== req.user._id.toString() && !isStaffOrAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this certificate' });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await certificateService.renderPdf(certificate);
    } catch (renderError) {
      req.log?.error('certificate pdf rendering failed', { certificateId, err: renderError });
      return res.status(503).json({
        success: false,
        message: 'PDF generation is currently unavailable. The certificate can still be verified with its credential id.',
      });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="SYICT_Certificate_' + certificate.credentialId + '.pdf"'
    });

    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// @desc    Verify a certificate by credential ID (Public)
// @route   GET /api/certificates/verify/:credentialId
// @access  Public
exports.verifyCertificate = async (req, res, next) => {
  try {
    const { credentialId } = req.params;
    const certificate = await Certificate.findOne({ credentialId })
      .populate('student', 'name')
      .populate('course', 'title duration');
      
    if (!certificate) return res.status(404).json({ success: false, message: 'Invalid or fake certificate ID' });

    res.json({ success: true, data: certificate });
  } catch (err) {
    next(err);
  }
};
