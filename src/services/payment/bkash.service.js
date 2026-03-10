const axios = require('axios');

/**
 * Generates an auth token for bKash API
 */
const getBkashToken = async () => {
  try {
    const { data } = await axios.post(
      `${process.env.BKASH_BASE_URL}/checkout/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      },
      {
        headers: {
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD,
        },
      }
    );
    return data.id_token;
  } catch (error) {
    console.error('bKash Token Error:', error.response?.data || error.message);
    throw new Error('Could not generate bKash token');
  }
};

/**
 * Creates a bKash Payment URL
 */
const createPaymentUrl = async (amount, invoiceNumber, callbackUrl) => {
  try {
    const token = await getBkashToken();
    const { data } = await axios.post(
      `${process.env.BKASH_BASE_URL}/checkout/payment/create`,
      {
        mode: '0011',
        payerReference: invoiceNumber,
        callbackURL: callbackUrl,
        amount: amount,
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: invoiceNumber,
      },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
        },
      }
    );
    return data.bkashURL;
  } catch (error) {
    console.error('bKash Payment Create Error:', error.response?.data || error.message);
    throw new Error('Could not create bKash payment');
  }
};

/**
 * Executes a bKash Payment after callback
 */
const executePayment = async (paymentID) => {
  try {
    const token = await getBkashToken();
    const { data } = await axios.post(
      `${process.env.BKASH_BASE_URL}/checkout/payment/execute/${paymentID}`,
      {},
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
        },
      }
    );
    return data;
  } catch (error) {
    console.error('bKash Payment Execute Error:', error.response?.data || error.message);
    throw new Error('Could not execute bKash payment');
  }
};

module.exports = {
  createPaymentUrl,
  executePayment,
};
