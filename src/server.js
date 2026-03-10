require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const connectDB  = require('./config/db');
const errorMiddleware = require('./middleware/error.middleware');

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

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Connect Database ─────────────────────────────────────────────
connectDB();

// ─── Global Middleware ────────────────────────────────────────────
app.use(helmet());
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(morgan('dev'));

// ─── Stripe Webhook Exception (Must be before express.json) ───
// Stripe requires the raw body to construct the event and verify signatures.
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json()); // Parse incoming JSON payloads
app.use(express.urlencoded({ extended: true }));

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

// ─── Health check ────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── 404 handler ─────────────────────────────────────────────────
app.use('*', (_, res) => res.status(404).json({ message: 'Route not found' }));

// ─── Error handler ────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start Jobs ──────────────────────────────────────────────────
require('./jobs/installmentReminder.job');
require('./jobs/emailCampaign.job');
require('./jobs/certificateAward.job');

app.listen(PORT, () => {
  console.log(`🚀 SYICT Backend running on http://localhost:${PORT}`);
});

module.exports = app;
