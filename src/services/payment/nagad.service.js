/**
 * Stub service for Nagad API Integration
 * Note: Nagad integration typically requires a dedicated merchant agreement 
 * and specific RSA key pairings that must be provided by the Nagad technical team.
 */

const createPaymentUrl = async (amount, invoiceNumber, callbackUrl) => {
  console.log(`Nagad Payment requested for ${amount} BDT (Invoice: ${invoiceNumber})`);
  // This is a stub. Replace with actual Nagad crypto/API logic.
  return `${process.env.FRONTEND_URL}/payment/mock-nagad?invoice=${invoiceNumber}&amount=${amount}`;
};

const verifyPayment = async (paymentRefId) => {
    // Stub definition
    return { status: 'Success', transactionId: 'NG' + Date.now() };
};

module.exports = {
  createPaymentUrl,
  verifyPayment
};
