/**
 * Certificate service.
 *
 * A certificate is a database record with a credential id that can be
 * verified publicly. The PDF is rendered on demand from that record, so the
 * certificate and the PDF can never drift apart.
 */
const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const emailService = require('./email.service');

let chromium;
let puppeteer;

if (process.env.VERCEL) {
  // Use Vercel specific puppeteer-core and chromium
  try {
    puppeteer = require('puppeteer-core');
    chromium = require('@sparticuz/chromium');
  } catch (e) {
    console.error('Failed to load serverless puppeteer dependencies:', e.message);
  }
} else {
  // Use standard puppeteer for local dev
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.warn('Puppeteer not installed or failed to load');
  }
}

const generateCredentialId = () => `SYICT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

const buildHtml = (certificate) => {
  const studentName = certificate.student?.name || 'Student';
  const courseTitle = certificate.course?.title?.en || certificate.course?.title || 'the course';

  return `
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
          <div class="student-name">${studentName}</div>
          <h2>For successfully completing the course</h2>
          <div class="course-name">${courseTitle}</div>

          <div class="footer">
             <div>
               <p>Smart Youth ICT Platform</p>
               <p>Date: ${new Date(certificate.issueDate || Date.now()).toLocaleDateString()}</p>
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
};

const certificateService = {
  generateCredentialId,
  buildHtml,

  /**
   * Render the certificate as a PDF.
   *
   * @param {Object} certificate - a Certificate document (populated)
   * @returns {Promise<Buffer>} the PDF
   */
  renderPdf: async (certificate) => {
    if (!puppeteer) {
      throw new Error('PDF generation engine is not available.');
    }

    let browser;
    if (process.env.VERCEL && chromium) {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      browser = await puppeteer.launch({ headless: 'new' });
    }

    try {
      const page = await browser.newPage();
      await page.setContent(buildHtml(certificate), { waitUntil: 'networkidle0' });

      return await page.pdf({
        format: 'Letter',
        landscape: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
    } finally {
      await browser.close();
    }
  },

  /**
   * Issue a certificate for a user who completed a course.
   */
  generate: async (user, course) => {
    const studentId = user?._id || user;
    const courseId = course?._id || course;

    const credentialId = generateCredentialId();
    const certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      credentialId,
    });

    await emailService.sendCertificateReady(user, certificate);
    return certificate;
  },

  /**
   * Look up a certificate by its credential id.
   */
  verify: async (credentialId) => {
    return Certificate.findOne({ credentialId })
      .populate('student', 'name')
      .populate('course', 'title duration');
  },
};

module.exports = certificateService;
