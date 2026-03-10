const cron = require('node-cron');

// Placeholder for scheduled email campaigns (newsletters, promotions)
// Runs every Monday at 10 AM BDT (4 AM UTC)
cron.schedule('0 4 * * 1', async () => {
  console.log('[JOB] Running email campaign...');
  // TODO: fetch active campaign from DB and dispatch via emailService
});
