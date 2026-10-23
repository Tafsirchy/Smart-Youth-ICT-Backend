// ─── Fatal error handling ─────────────────────────────────────────
// A process that keeps running after an uncaught exception continues with
// undefined state. Log the failure and exit so the platform can start a
// clean instance instead of serving requests from a corrupted one.
process.on('uncaughtException', (err) => {
  console.error('FATAL uncaught exception:', err?.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('FATAL unhandled promise rejection:', reason);
  process.exit(1);
});

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./sockets/socket');

const PORT = process.env.PORT || 5000;

// Diagnostic: Log environment status (Masked)
const maskedUri = process.env.MONGO_URI ? `${process.env.MONGO_URI.substring(0, 15)}...` : 'MISSING';
console.log(`[Diagnostic] MONGO_URI status: ${maskedUri}`);
console.log(`[Diagnostic] NODE_ENV: ${process.env.NODE_ENV}`);

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

// ─── HTTP Server & WebSocket Gateway ──────────────────────────────
const server = http.createServer(app);
// socket.io applies the same origin check as the HTTP layer.
initSocket(server, app.isAllowedOrigin);

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_DEV) {
  server.listen(PORT, () => {
    console.log(`🚀 SYICT Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.server = server;
