/**
 * SMS Notification Service (Skeleton)
 * The user will implement actual integration (e.g. SSLWireless or others) later.
 */
const smsService = {
  /**
   * Send an SMS message.
   * @param {string} phone - User's phone number.
   * @param {string} message - SMS content.
   */
  sendSMS: async (phone, message) => {
    try {
      console.log(`[SMS Skeleton] Sending SMS to ${phone}: ${message}`);
      // TODO: Implement actual SMS gateway API call here
      return { success: true };
    } catch (error) {
       console.error('SMS Service Error:', error.message);
       return { success: false, error: error.message };
    }
  }
};

module.exports = smsService;
