/**
 * The CMS service content endpoints.
 *
 * The editors wrote five different shapes, so the read path hands out one
 * canonical document and the write path refuses a payload that does not fit
 * the schema.
 */
const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const WebServiceContent = require('../../src/models/WebServiceContent');

describe('cms service content', () => {
  let superAdmin;

  beforeEach(async () => {
    superAdmin = await createUser({ role: 'super_admin' });
  });

  afterEach(async () => {
    await WebServiceContent.deleteMany({});
  });

  it('serves the canonical content for a stored landing page', async () => {
    await WebServiceContent.create({
      pageType: 'automation',
      landing: {
        hero: { title: 'Automation', badge: 'New' },
        sections: { pillars: [{ title: 'Pillar' }] },
        cta: { title: 'Start' },
      },
      details: {
        hero: { title: 'Details' },
      },
    });

    const response = await request().get('/api/cms/services/web-software/automation');

    expect(response.status).toBe(200);
    expect(response.body.data.version).toBe(1);
    expect(response.body.data.landing.hero.title).toBe('Automation');
    expect(response.body.data.landing.sections.pillars).toHaveLength(1);
    expect(response.body.data.details.hero.title).toBe('Details');
  });

  it('adapts a document that was stored in the flat shape', async () => {
    await WebServiceContent.create({
      pageType: 'business-websites',
      hero: { title: 'Websites' },
      sections: { pillars: [{ title: 'Pillar' }] },
      cta: { title: 'Start' },
    });

    const response = await request().get('/api/cms/services/web-software/business-websites');

    expect(response.status).toBe(200);
    expect(response.body.data.landing.hero.title).toBe('Websites');
    expect(response.body.data.landing.sections.pillars).toHaveLength(1);
    // The legacy key stays reachable for the pages that still read it.
    expect(response.body.data.hero.title).toBe('Websites');
  });

  it('stores a valid payload and answers with the canonical content', async () => {
    const response = await request()
      .put('/api/cms/services/web-software/seo')
      .set(superAdmin.auth)
      .send({
        landing: {
          hero: { title: 'SEO' },
          sections: { pillars: [] },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.landing.hero.title).toBe('SEO');
    expect(response.body.data.version).toBe(1);

    const stored = await WebServiceContent.findOne({ pageType: 'seo' });
    expect(stored.landing.hero.title).toBe('SEO');
  });

  it('refuses a payload that does not match the schema', async () => {
    const response = await request()
      .put('/api/cms/services/web-software/seo')
      .set(superAdmin.auth)
      .send({ landing: 'not an object' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.issues.join(' ')).toMatch(/landing/);
  });

  it('keeps the write endpoint closed for branch admins', async () => {
    const branchAdmin = await createUser({ role: 'branch_admin' });

    const response = await request()
      .put('/api/cms/services/web-software/seo')
      .set(branchAdmin.auth)
      .send({ landing: { hero: { title: 'SEO' } } });

    expect(response.status).toBe(403);
  });
});
