/**
 * The stub services must fail closed.
 *
 * Every one of them talks to an external system. When that system is not
 * configured they have to say so instead of pretending that a message was
 * sent or that a payment was verified — a fake success would mark payments
 * as paid or tell an admin a notification went out when it did not.
 */
const smsService = require('../../src/services/sms.service');
const whatsappService = require('../../src/services/whatsapp.service');
const nagadService = require('../../src/services/payment/nagad.service');
const bkashService = require('../../src/services/payment/bkash.service');
const emailCampaignJob = require('../../src/jobs/emailCampaign.job');

describe('stub services fail closed', () => {
  describe('sms service', () => {
    it('reports a skipped message when no gateway is configured', async () => {
      const result = await smsService.sendSMS('01700000000', 'hello');

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/not configured/i);
    });
  });

  describe('whatsapp service', () => {
    it('reports a skipped message when the cloud api is not configured', async () => {
      const result = await whatsappService.sendMessage('01700000000', 'hello');

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/not configured/i);
    });
  });

  describe('nagad service', () => {
    it('refuses to create a payment when the gateway is not configured', async () => {
      expect(nagadService.isConfigured()).toBe(false);
      await expect(nagadService.createPayment(500, 'INV-1', 'https://example.test/cb')).rejects.toThrow(
        /not configured/i
      );
    });

    it('refuses to verify a payment when the gateway is not configured', async () => {
      await expect(nagadService.verifyPayment('ref-1')).rejects.toThrow(/not configured/i);
    });
  });

  describe('bkash service', () => {
    it('never answers with a dummy payment url', async () => {
      // No bKash credentials in the test environment: the gateway call fails
      // and the service must surface that instead of handing out a fake URL.
      await expect(
        bkashService.createPayment(500, 'INV-1', 'https://example.test/cb')
      ).rejects.toThrow(/bKash/i);
    });
  });

  describe('email campaign job', () => {
    it('refuses to enqueue while the campaign pipeline is not implemented', async () => {
      expect(emailCampaignJob.CAMPAIGNS_ENABLED).toBe(false);
      await expect(emailCampaignJob.enqueueCampaign({ subject: 'newsletter' })).rejects.toMatchObject({
        code: 'CAMPAIGN_NOT_IMPLEMENTED',
        statusCode: 501,
      });
    });
  });
});
