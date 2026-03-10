/**
 * Manual Bank Payment Service
 */

const { Payment } = require('../models/Payment');
const { Enrollment } = require('../models/Enrollment');

/**
 * Creates a manual bank payment request
 */
const createManualPayment = async (userId, courseId, amount, transactionId, bankName) => {
  // Logic to save a pending manual payment to db
  // Returns status
  return { status: 'pending_approval' };
};

/**
 * Admin logic to approve a manual payment
 */
const approveManualPayment = async (paymentId) => {
  // Approve payment logic
  return { status: 'approved' };
};

module.exports = {
  createManualPayment,
  approveManualPayment
};
