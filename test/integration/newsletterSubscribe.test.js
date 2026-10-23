/**
 * Newsletter subscription integration tests.
 *
 * Verifies that the public /api/email/subscribe endpoint validates inputs,
 * records subscribers into LeadCRM with source: 'newsletter', assigns to
 * head office branch, and handles duplicate submissions idempotently.
 */
const { request } = require('../helpers/request');
const LeadCRM = require('../../src/models/LeadCRM');
const Branch = require('../../src/models/Branch');

describe('newsletter subscription', () => {
  let headOfficeBranch;

  beforeEach(async () => {
    await LeadCRM.deleteMany({});
    await Branch.deleteMany({});

    headOfficeBranch = await Branch.create({
      name: 'Smart Youth ICT Head Office',
      code: 'HQ',
      type: 'head_office',
      address: { city: 'Dhaka', country: 'Bangladesh' },
    });
  });

  afterEach(async () => {
    await LeadCRM.deleteMany({});
    await Branch.deleteMany({});
  });

  it('rejects subscription without an email address', async () => {
    const res = await request().post('/api/email/subscribe').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects an invalid email format', async () => {
    const res = await request().post('/api/email/subscribe').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('subscribes a new user and creates a LeadCRM record with source newsletter', async () => {
    const res = await request()
      .post('/api/email/subscribe')
      .send({ email: 'student@example.com', name: 'John Student' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('student@example.com');
    expect(res.body.data.source).toBe('newsletter');

    const lead = await LeadCRM.findOne({ email: 'student@example.com' });
    expect(lead).not.toBeNull();
    expect(lead.source).toBe('newsletter');
    expect(lead.name).toBe('John Student');
    expect(lead.status).toBe('new');
    expect(lead.branchId.toString()).toBe(headOfficeBranch._id.toString());
  });

  it('handles re-subscription gracefully and idempotently', async () => {
    await request()
      .post('/api/email/subscribe')
      .send({ email: 'student@example.com' });

    const res2 = await request()
      .post('/api/email/subscribe')
      .send({ email: 'student@example.com' });

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);

    const count = await LeadCRM.countDocuments({ email: 'student@example.com', source: 'newsletter' });
    expect(count).toBe(1);
  });
});
