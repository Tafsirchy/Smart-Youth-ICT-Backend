const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Creates a Stripe Checkout Session for enrolling in a course.
 * @param {Object} course - The course object
 * @param {Object} user - The user object
 * @param {String} successUrl - URL to redirect on success
 * @param {String} cancelUrl - URL to redirect on cancel
 * @returns {Promise<String>} The Stripe Checkout Session URL
 */
const createCheckoutSession = async (course, user, successUrl, cancelUrl) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user._id.toString(),
      metadata: {
        courseId: course._id.toString(),
        userId: user._id.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: 'bdt',
            product_data: {
              name: course.title?.en || course.title,
              images: course.thumbnail ? [course.thumbnail] : [],
            },
            unit_amount: Math.round(course.price * 100), // Stripe expects amounts in cents/paisa
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session.url;
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    throw new Error('Failed to create Stripe payment session');
  }
};

/**
 * Validates a Stripe Webhook Event
 */
const constructWebhookEvent = (rawBody, signature) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
};

module.exports = {
  createCheckoutSession,
  constructWebhookEvent,
};
