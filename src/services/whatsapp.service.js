/**
 * WhatsApp Notification Service (Skeleton)
 * The user will implement actual integration (e.g. UltraMsg, Twilio, or Meta API) later.
 */
const whatsappService = {
  /**
   * Send a WhatsApp message to a user.
   * @param {string} phone - User's phone number.
   * @param {string} message - Content of the message.
   */
  sendMessage: async (phone, message) => {
    try {
      console.log(`[WhatsApp Skeleton] Sending message to ${phone}: ${message}`);
      // TODO: Implement actual API call here
      return { success: true, messageId: `msg_${Date.now()}` };
    } catch (error) {
      console.error('WhatsApp Service Error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send a template message for course enrollment.
   */
  sendEnrollmentNotice: async (user, course) => {
    const msg = `Congratulations ${user.name}! You are now enrolled in ${course.title}. Log in to access your materials.`;
    return whatsappService.sendMessage(user.phone, msg);
  }
};

module.exports = whatsappService;
