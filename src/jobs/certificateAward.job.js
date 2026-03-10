const cron    = require('node-cron');
const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');
const certificateService = require('../services/certificate.service');

// Check every hour for newly completed courses
cron.schedule('0 * * * *', async () => {
  console.log('[JOB] Checking for certificate-eligible students...');
  try {
    const completed = await Progress.find({
      progressPercent: 100,
      completedAt:     { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    }).populate('user').populate('course');

    for (const progress of completed) {
      const exists = await Certificate.findOne({ user: progress.user._id, course: progress.course._id });
      if (!exists) {
        await certificateService.generate(progress.user, progress.course);
        console.log(`[JOB] Certificate issued: ${progress.user.email} – ${progress.course.title?.en}`);
      }
    }
  } catch (err) {
    console.error('[JOB] Certificate award error:', err.message);
  }
});
