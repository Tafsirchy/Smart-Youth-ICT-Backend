/**
 * Nagad payment gateway service.
 *
 * Implements the Nagad merchant API (token grant → transaction initiate →
 * transaction verify). Every call needs merchant credentials; when they are
 * missing the service fails closed instead of returning a dummy payment URL
 * or a fake verification result, so an unconfigured gateway can never mark a
 * payment as paid.
 */
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = (process.env.NAGAD_BASE_URL || '').replace(/\/+$/, '');
const MERCHANT_ID = process.env.NAGAD_MERCHANT_ID;
const MERCHANT_KEY = process.env.NAGAD_MERCHANT_KEY;
const API_KEY = process.env.NAGAD_API_KEY;
const API_SECRET = process.env.NAGAD_API_SECRET;
const USERNAME = process.env.NAGAD_USERNAME;
const PASSWORD = process.env.NAGAD_PASSWORD;

const isConfigured = () =>
  Boolean(BASE_URL && MERCHANT_ID && MERCHANT_KEY && API_KEY && API_SECRET && USERNAME && PASSWORD);

const signRequest = (dateTime, body) => {
  const digest = crypto
    .createHmac('sha512', MERCHANT_KEY)
    .update(`${dateTime}${API_KEY}${API_SECRET}${body}`)
    .digest('base64');
  return digest;
};

class NagadService {
  isConfigured() {
    return isConfigured();
  }

  async getToken() {
    const { data } = await axios.post(
      `${BASE_URL}/merchant/authentication/login`,
      { username: USERNAME, password: PASSWORD },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!data?.accessToken) {
      throw new Error('Nagad did not return an access token');
    }

    return data.accessToken;
  }

  /**
   * Create a payment and return the URL the customer has to visit.
   *
   * @param {number} amount - Amount in BDT.
   * @param {string} invoiceNumber - Merchant order id.
   * @param {string} callbackUrl - Where the customer returns after paying.
   */
  async createPayment(amount, invoiceNumber, callbackUrl) {
    if (!isConfigured()) {
      throw new Error('Nagad gateway is not configured on this server.');
    }

    const accessToken = await this.getToken();
    const dateTime = new Date().toISOString();
    const body = JSON.stringify({
      merchantId: MERCHANT_ID,
      orderId: invoiceNumber,
      amount: String(amount),
      currency: 'BDT',
      callbackUrl,
      referenceNumber: invoiceNumber,
      description: `Payment for invoice ${invoiceNumber}`,
    });

    const { data } = await axios.post(`${BASE_URL}/merchant/transaction/initiate`, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Api-Key': API_KEY,
        'X-Api-Secret': API_SECRET,
        'X-DateTime': dateTime,
        'X-Signature': signRequest(dateTime, body),
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    if (!data?.paymentURL || !data?.paymentReferenceId) {
      throw new Error('Nagad did not return a payment URL');
    }

    return {
      paymentURL: data.paymentURL,
      paymentReferenceId: data.paymentReferenceId,
    };
  }

  /**
   * Verify a payment reference with the gateway.
   *
   * The result is normalised to the two fields the callback controller
   * checks: `status` and `paymentStatus`.
   */
  async verifyPayment(paymentReferenceId) {
    if (!isConfigured()) {
      throw new Error('Nagad gateway is not configured on this server.');
    }

    const accessToken = await this.getToken();
    const dateTime = new Date().toISOString();
    const body = JSON.stringify({
      merchantId: MERCHANT_ID,
      paymentReferenceId,
    });

    const { data } = await axios.post(`${BASE_URL}/merchant/transaction/verify`, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-DateTime': dateTime,
        'X-Signature': signRequest(dateTime, body),
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const status = data?.status || data?.paymentStatus || 'Failed';

    return {
      ...data,
      status,
      paymentStatus: status,
    };
  }
}

module.exports = new NagadService();
