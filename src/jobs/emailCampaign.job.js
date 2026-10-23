const cron = require('node-cron');

/**
 * Scheduled email campaigns (newsletters, promotions).
 *
 * The campaign pipeline is not implemented yet: there is no campaign model,
 * no audience selection and no dispatch queue. The job therefore refuses to
 * run and refuses to enqueue instead of pretending that a campaign was
 * scheduled. Once a real implementation lands, flip CAMPAIGNS_ENABLED and
 * replace the two branches below with the actual pipeline.
 */
const CAMPAIGNS_ENABLED = false;

const CAMPAIGN_NOT_IMPLEMENTED = 'CAMPAIGN_NOT_IMPLEMENTED';

/**
 * Enqueue a campaign for delivery.
 *
 * @throws {Error} with `code === 'CAMPAIGN_NOT_IMPLEMENTED'` while the
 *   campaign pipeline does not exist.
 */
const enqueueCampaign = async (campaign) => {
  if (!CAMPAIGNS_ENABLED) {
    const error = new Error(
      'Scheduled email campaigns are not available yet: the campaign pipeline is not implemented.'
    );
    error.code = CAMPAIGN_NOT_IMPLEMENTED;
    error.statusCode = 501;
    throw error;
  }

  // Campaign delivery goes here.
  return { queued: false, campaign };
};

// Runs every Monday at 10 AM BDT (4 AM UTC)
cron.schedule('0 4 * * 1', async () => {
  if (!CAMPAIGNS_ENABLED) {
    console.log('[JOB] Email campaigns are disabled: the campaign pipeline is not implemented yet.');
    return;
  }

  console.log('[JOB] Running email campaign...');
  // TODO: fetch active campaign from DB and dispatch via emailService
});

module.exports = {
  enqueueCampaign,
  CAMPAIGNS_ENABLED,
  CAMPAIGN_NOT_IMPLEMENTED,
};
