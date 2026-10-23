/**
 * SMS notification service.
 *
 * The delivery itself needs a gateway account. When the gateway credentials
 * are present the message is sent through SSLWireless; when they are not,
 * the service reports that the message was skipped instead of pretending
 * that it was delivered. Callers can therefore tell the difference between
 * "sent" and "not sent".
 */
const axios = require('axios');
const { logger } = require('../utils/logger');

const API_URL = process.env.SSLWIRELESS_API_URL || 'https://api.sslwireless.com/v1/sms-send';
const API_KEY = process.env.SSLWIRELESS_API_KEY;
const SENDER_ID = process.env.SSLWIRELESS_SENDER_ID;

const isConfigured = () => Boolean(API_KEY && SENDER_ID);

const smsService = {
  isConfigured,

  /**
   * Send an SMS message.
   *
   * @param {string} phone - Recipient number in 01XXXXXXXXX format.
   * @param {string} message - Message content.
   * @returns {Promise<{success: boolean, skipped?: boolean, reason?: string, id?: string}>}
   */
  sendSMS: async (phone, message) => {
    if (!isConfigured()) {
      logger.warn('sms skipped: gateway not configured');
      return {
        success: false,
        skipped: true,
        reason: 'SMS gateway is not configured on this server.',
      };
    }

    if (!phone) {
      return { success: false, reason: 'Recipient phone number is missing.' };
    }

    try {
      const { data } = await axios.post(
        API_URL,
        {
          message,
          to: String(phone),
          senderid: SENDER_ID,
          apikey: API_KEY,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // SSLWireless answers with status "success" / "fail" in the body.
      const delivered = String(data?.status || '').toLowerCase() === 'success';

      if (!delivered) {
        logger.warn('sms delivery rejected by gateway', {
          recipient: phone,
          status: data?.status,
          message: data?.message,
        });
      }

      return {
        success: delivered,
        id: data?.id,
        reason: delivered ? undefined : data?.message || 'Gateway rejected the message.',
      };
    } catch (error) {
      logger.error('sms delivery failed', {
        recipient: phone,
        status: error.response?.status,
        err: error,
      });
      return { success: false, reason: error.message };
    }
  },
};

module.exports = smsService;
