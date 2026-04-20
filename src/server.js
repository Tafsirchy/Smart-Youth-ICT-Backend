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
const express    = require('express');
const cors       = require('cors');
// Temporarily disabled helmet to rule out Vercel infrastructure conflicts
// const helmet     = require('helmet'); 
const morgan     = require('morgan');
const connectDB  = require('./config/db');
const compression = require('compression');
const errorMiddleware = require('./middleware/error.middleware');

// Diagnostic: Log environment status (Masked)
const maskedUri = process.env.MONGO_URI ? `${process.env.MONGO_URI.substring(0, 15)}...` : 'MISSING';
console.log(`[Diagnostic] MONGO_URI status: ${maskedUri}`);
console.log(`[Diagnostic] NODE_ENV: ${process.env.NODE_ENV}`);

// ─── Route imports ────────────────────────────────────────────────
const authRoutes        = require('./routes/auth.routes');
const userRoutes        = require('./routes/user.routes');
const courseRoutes      = require('./routes/course.routes');
const lessonRoutes      = require('./routes/lesson.routes');
const enrollmentRoutes  = require('./routes/enrollment.routes');
const progressRoutes    = require('./routes/progress.routes');
const assignmentRoutes  = require('./routes/assignment.routes');
const quizRoutes        = require('./routes/quiz.routes');
const certificateRoutes = require('./routes/certificate.routes');
const paymentRoutes     = require('./routes/payment.routes');
const blogRoutes        = require('./routes/blog.routes');
const testimonialRoutes = require('./routes/testimonial.routes');
const projectRoutes     = require('./routes/project.routes');
const portfolioRoutes   = require('./routes/portfolio.routes');
const affiliateRoutes   = require('./routes/affiliate.routes');
const crmRoutes         = require('./routes/crm.routes');
const seminarRoutes     = require('./routes/seminar.routes');
const branchRoutes      = require('./routes/branch.routes');
const sessionRoutes     = require('./routes/session.routes');
const assetRoutes       = require('./routes/asset.routes');
const invoiceRoutes     = require('./routes/invoice.routes');
const notificationRoutes = require('./routes/notification.routes');
const superRoutes        = require('./routes/super.routes');
const cmsRoutes          = require('./routes/cms.routes');
const supportRoutes      = require('./routes/support.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(compression());
// app.use(helmet()); // Temporarily disabled

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://syict-frontend.vercel.app',
  'https://smart-youth-ict-frontend.vercel.app',
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
app.use(express.json({ limit: '20kb' })); 
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

// ─── API Routes ───────────────────────────────────────────────────
const API = '/api';
app.use(`${API}/auth`,         authRoutes);
app.use(`${API}/users`,        userRoutes);
app.use(`${API}/courses`,      courseRoutes);
app.use(`${API}/lessons`,      lessonRoutes);
app.use(`${API}/enrollments`,  enrollmentRoutes);
app.use(`${API}/progress`,     progressRoutes);
app.use(`${API}/assignments`,  assignmentRoutes);
app.use(`${API}/quizzes`,      quizRoutes);
app.use(`${API}/certificates`, certificateRoutes);
app.use(`${API}/payments`,     paymentRoutes);
app.use(`${API}/blog`,         blogRoutes);
app.use(`${API}/testimonials`, testimonialRoutes);
app.use(`${API}/projects`,     projectRoutes);
app.use(`${API}/portfolio`,    portfolioRoutes);
app.use(`${API}/affiliate`,    affiliateRoutes);
app.use(`${API}/crm`,          crmRoutes);
app.use(`${API}/seminar`,      seminarRoutes);
app.use(`${API}/branches`,     branchRoutes);
app.use(`${API}/sessions`,     sessionRoutes);
app.use(`${API}/assets`,       assetRoutes);
app.use(`${API}/invoices`,     invoiceRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/super`,         superRoutes);
app.use(`${API}/cms`,           cmsRoutes);
app.use(`${API}/support`,       supportRoutes);

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
