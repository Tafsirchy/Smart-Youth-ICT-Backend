// 🚨 EMERGENCY DIAGNOSTIC START 🚨
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🧊 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});
// 🚨 EMERGENCY DIAGNOSTIC END 🚨

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const compression = require('compression');
const errorMiddleware = require('./middleware/error.middleware');
const { verifyToken } = require('./utils/jwt');
const SystemSetting = require('./models/SystemSetting');

// Diagnostic: Log environment status (Masked)
const maskedUri = process.env.MONGO_URI ? `${process.env.MONGO_URI.substring(0, 15)}...` : 'MISSING';
console.log(`[Diagnostic] MONGO_URI status: ${maskedUri}`);
console.log(`[Diagnostic] NODE_ENV: ${process.env.NODE_ENV}`);

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

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────
app.use(compression());
// Removed broken app.use(apiLimiter) - Root Cause of 500 Crash

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://syict-frontend.vercel.app',
  'https://smart-youth-ict-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.smartyouthict.com',
  'https://smartyouthict.com'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('smartyouthict.com')
    ) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Database & Sync Middleware ────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[Middleware] Database Error:', err.message);
    res.status(503).json({ success: false, message: 'Database connection failed. Request timed out.' });
  }
});

app.use(morgan('dev'));
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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
      path.startsWith('/api/payments/webhook')
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
      } catch (e) {
        // invalid or expired token
      }
    }

    return res.status(503).json({
      success: false,
      code: 'MAINTENANCE_MODE',
      message: 'The Smart Youth ICT platform is currently undergoing scheduled maintenance. Please check back shortly.'
    });
  } catch (err) {
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
app.use(`${API}/super`, superRoutes);
app.use(`${API}/cms`, cmsRoutes);
app.use(`${API}/support`, supportRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));
app.use('*', (_, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorMiddleware);

// ─── Start Jobs (Development & Local Only) ─────────────────────────
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  try {
    require('./jobs/installmentReminder.job');
    require('./jobs/emailCampaign.job');
    require('./jobs/certificateAward.job');
  } catch (err) {
    console.error('Job loading error:', err.message);
  }
}

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_DEV) {
  app.listen(PORT, () => {
    console.log(`🚀 SYICT Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
