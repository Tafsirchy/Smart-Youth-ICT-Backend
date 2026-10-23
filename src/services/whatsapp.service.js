/**
 * WhatsApp notification service (Meta WhatsApp Cloud API).
 *
 * The Cloud API needs a permanent access token and the phone number id of a
 * business account. When those are missing the service reports the message as
 * skipped rather than pretending it was delivered.
 */
const axios = require('axios');
const { logger } = require('../utils/logger');

const GRAPH_VERSION = process.env.WA_GRAPH_VERSION || 'v21.0';
const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;

const isConfigured = () => Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID);

const toInternationalFormat = (phone) => {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `880${digits.slice(1)}`;
  return digits;
};

const whatsappService = {
  isConfigured,

  /**
   * Send a WhatsApp text message.
   *
   * @param {string} phone - Recipient number.
   * @param {string} message - Message content.
   * @returns {Promise<{success: boolean, skipped?: boolean, reason?: string, messageId?: string}>}
   */
  sendMessage: async (phone, message) => {
    if (!isConfigured()) {
      logger.warn('whatsapp skipped: cloud api not configured');
      return {
        success: false,
        skipped: true,
        reason: 'WhatsApp Cloud API is not configured on this server.',
      };
    }

    const to = toInternationalFormat(phone);
    if (!to) {
      return { success: false, reason: 'Recipient phone number is missing.' };
    }

    try {
      const { data } = await axios.post(
        `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: String(message || '').slice(0, 1024) },
        },
        { headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
      );

      const messageId = data?.messages?.[0]?.id;

      return {
        success: Boolean(messageId),
        messageId,
        reason: messageId ? undefined : data?.error?.message || 'Gateway rejected the message.',
      };
    } catch (error) {
      logger.error('whatsapp delivery failed', {
        recipient: phone,
        status: error.response?.status,
        err: error,
      });
      return { success: false, reason: error.message };
    }
  },

  /**
   * Send a template message for course enrollment.
   */
  sendEnrollmentNotice: async (user, course) => {
    const msg = `Congratulations ${user.name}! You are now enrolled in ${course.title}. Log in to access your materials.`;
    return whatsappService.sendMessage(user.phone, msg);
  },
};

module.exports = whatsappService;
