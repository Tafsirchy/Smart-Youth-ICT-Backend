const crypto = require('crypto');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.warn('Puppeteer not installed or failed to load');
}

const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const Progress = require('../models/Progress');

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
    if (!puppeteer) {
       return res.status(500).json({ success: false, message: 'PDF generation engine is not available.' });
    }

    const certificateId = req.params.id;
    const certificate = await Certificate.findById(certificateId)
      .populate('student', 'name email')
      .populate('course', 'title');

    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });
    
    // Ensure the student owns the certificate or is an admin
    if (certificate.student._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to download this certificate' });
    }

    // We use a simple HTML string to render the PDF for now
    // In production, you would map this to a heavily styled EJS template in a 'views' directory
    const htmlContent = `
      <html>
        <head>
          <style>
             body { font-family: 'Helvetica', sans-serif; text-align: center; margin: 0; padding: 0; }
             .container { padding: 100px; border: 20px solid #2563eb; margin: 50px; border-radius: 10px; }
             h1 { font-size: 50px; color: #1e3a8a; margin-bottom: 10px; }
             h2 { font-size: 30px; color: #4b5563; font-weight: normal; margin-bottom: 40px; }
             .student-name { font-size: 40px; font-weight: bold; color: #111827; border-bottom: 2px solid #e5e7eb; display: inline-block; padding-bottom: 10px; margin-bottom: 40px; }
             .course-name { font-size: 35px; color: #2563eb; font-weight: bold; }
             .footer { margin-top: 80px; display: flex; justify-content: space-between; color: #6b7280; }
             .credential { font-size: 14px; margin-top: 40px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Certificate of Completion</h1>
            <h2>This is proudly presented to</h2>
            <div class="student-name">${certificate.student.name}</div>
            <h2>For successfully completing the course</h2>
            <div class="course-name">${certificate.course.title.en || certificate.course.title}</div>
            
            <div class="footer">
               <div>
                 <p>Smart Youth ICT Platform</p>
                 <p>Date: ${new Date(certificate.issueDate).toLocaleDateString()}</p>
               </div>
               <div>
                 <p>_______________________</p>
                 <p>Lead Instructor</p>
               </div>
            </div>
            <div class="credential">Credential ID: ${certificate.credentialId}</div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

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
