// Express application wiring.
//
// This module builds the HTTP application and exports it *without* opening a
// port. `src/server.js` owns the process lifecycle (HTTP server, socket.io
// gateway, background jobs, listen) and requires this module.
//
// The split exists so integration tests can drive the real middleware stack
// with Supertest instead of a re-assembled approximation of it.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { requestContext } = require('./middleware/requestContext.middleware');
const { verifyToken } = require('./utils/jwt');
const SystemSetting = require('./models/SystemSetting');

// ─── Route imports ────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const courseRoutes = require('./routes/course.routes');
const lessonRoutes = require('./routes/lesson.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const progressRoutes = require('./routes/progress.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const quizRoutes = require('./routes/quiz.routes');
const certificateRoutes = require('./routes/certificate.routes');
const paymentRoutes = require('./routes/payment.routes');
const blogRoutes = require('./routes/blog.routes');
const testimonialRoutes = require('./routes/testimonial.routes');
const projectRoutes = require('./routes/project.routes');
const portfolioRoutes = require('./routes/portfolio.routes');
const affiliateRoutes = require('./routes/affiliate.routes');
const crmRoutes = require('./routes/crm.routes');
const seminarRoutes = require('./routes/seminar.routes');
const branchRoutes = require('./routes/branch.routes');
const sessionRoutes = require('./routes/session.routes');
const assetRoutes = require('./routes/asset.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const notificationRoutes = require('./routes/notification.routes');
const superRoutes = require('./routes/super.routes');
const cmsRoutes = require('./routes/cms.routes');
const supportRoutes = require('./routes/support.routes');
const expenseRoutes = require('./routes/expense.routes');
const counselingRoutes = require('./routes/counseling.routes');
const routineRoutes = require('./routes/classSchedule.routes');
const couponRoutes = require('./routes/coupon.routes');
const noticeRoutes = require('./routes/notice.routes');
const requisitionRoutes = require('./routes/requisition.routes');
const auditRoutes = require('./routes/audit.routes');
const emailRoutes = require('./routes/email.routes');

const app = express();
app.set('trust proxy', 1);

// ─── Middleware ───────────────────────────────────────────────────
app.use(compression());
app.use(
  helmet({
    // This API only serves JSON, so the document-level CSP belongs to the
    // Next.js frontend. The remaining headers (HSTS, X-Content-Type-Options,
    // X-Frame-Options, Referrer-Policy, ...) are applied.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // The API is read cross-origin by the Next.js frontend.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────
// Exact-match allowlist only. Suffix matching (`.vercel.app`,
// `smartyouthict.com`) previously made the check meaningless because the
// reject branch allowed every origin as well.
const { buildAllowedOrigins } = require('./config/allowedOrigins');
const { isAllowed: isAllowedOrigin } = buildAllowedOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    const error = new Error(`Origin '${origin}' is not allowed by the CORS policy.`);
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Global API rate limiting. Kept behind the CORS layer so a rejected origin
// never consumes a caller's quota, and ahead of the database middleware so
// abusive traffic is dropped before it reaches MongoDB.
app.use(apiLimiter);

// ─── Database & Sync Middleware ────────────────────────────────────
app.use(async (req, res, next) => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[Middleware] Database Error:', err.message);
    res.status(503).json({ success: false, message: 'Database connection failed. Request timed out.' });
  }
});

// Structured access log in production; the verbose dev format stays local-only.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Every request carries an id that follows it through the logs.
app.use(requestContext);
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── 🛡️ Platform Maintenance Mode Middleware ─────────────────────────
let cachedMaintenanceMode = null;
let lastMaintenanceCheck = 0;

app.use(async (req, res, next) => {
  try {
    const path = req.path;
    // Always permit health checks, public settings, login, super admin endpoints, stripe webhook
    if (
      path === '/health' ||
      path.startsWith('/api/cms/settings') ||
      path.startsWith('/api/super') ||
      path === '/api/auth/login' ||
      path.startsWith('/api/payments/webhook') ||
      path.startsWith('/api/requisitions/webhook') ||
      path.startsWith('/api/webhooks')
    ) {
      return next();
    }

    // Cache check for 3 seconds to avoid constant DB queries
    const now = Date.now();
    if (cachedMaintenanceMode === null || now - lastMaintenanceCheck > 3000) {
      const setting = await SystemSetting.findOne({ key: 'maintenanceMode' });
      cachedMaintenanceMode = setting ? Boolean(setting.value) : false;
      lastMaintenanceCheck = now;
    }

    if (!cachedMaintenanceMode) {
      return next();
    }

    // If maintenance mode is active, allow Super Admins with valid Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (decoded?.role === 'super_admin' || decoded?.role === 'super_management') {
          return next();
        }
      } catch {
        // invalid or expired token
      }
    }

    return res.status(503).json({
      success: false,
      code: 'MAINTENANCE_MODE',
      message: 'The Smart Youth ICT platform is currently undergoing scheduled maintenance. Please check back shortly.'
    });
  } catch {
    next();
  }
});

// ─── API Routes ───────────────────────────────────────────────────
const API = '/api';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/courses`, courseRoutes);
app.use(`${API}/lessons`, lessonRoutes);
app.use(`${API}/enrollments`, enrollmentRoutes);
app.use(`${API}/progress`, progressRoutes);
app.use(`${API}/assignments`, assignmentRoutes);
app.use(`${API}/quizzes`, quizRoutes);
app.use(`${API}/certificates`, certificateRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/blog`, blogRoutes);
app.use(`${API}/testimonials`, testimonialRoutes);
app.use(`${API}/projects`, projectRoutes);
app.use(`${API}/portfolio`, portfolioRoutes);
app.use(`${API}/affiliate`, affiliateRoutes);
app.use(`${API}/crm`, crmRoutes);
app.use(`${API}/seminar`, seminarRoutes);
app.use(`${API}/seminars`, seminarRoutes);
app.use(`${API}/branches`, branchRoutes);
app.use(`${API}/sessions`, sessionRoutes);
app.use(`${API}/assets`, assetRoutes);
app.use(`${API}/invoices`, invoiceRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/super/audit`, auditRoutes);
app.use(`${API}/super`, superRoutes);
app.use(`${API}/cms`, cmsRoutes);
app.use(`${API}/support`, supportRoutes);
app.use(`${API}/expenses`, expenseRoutes);
app.use(`${API}/counseling`, counselingRoutes);
app.use(`${API}/routines`, routineRoutes);
app.use(`${API}/coupons`, couponRoutes);
app.use(`${API}/notices`, noticeRoutes);
app.use(`${API}/requisitions`, requisitionRoutes);
app.use(`${API}/email`, emailRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));
app.use('*', (_, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorMiddleware);

module.exports = app;
module.exports.isAllowedOrigin = isAllowedOrigin;
