/**
 * The CMS content contract.
 *
 * The editors wrote five different shapes and the marketing pages read them
 * back under different names. The schema and the adapter are the single
 * definition of what a service page holds, and they have to keep every
 * legacy shape readable while the app moves to the canonical names.
 */
const {
  SERVICE_CONTENT_SCHEMA_VERSION,
  normalizeServiceContent,
  parseServiceContent,
  parseCareerServiceContent,
} = require('../../src/schemas/serviceContent.schema');

describe('service content schema', () => {
  describe('normalizeServiceContent', () => {
    it('keeps the canonical shape as it is', () => {
      const document = {
        pageType: 'automation',
        landing: { hero: { title: 'Automation' }, sections: { pillars: [] } },
        details: { hero: { title: 'Details' } },
      };

      const normalized = normalizeServiceContent(document);

      expect(normalized.landing.hero.title).toBe('Automation');
      expect(normalized.details.hero.title).toBe('Details');
      expect(normalized.version).toBe(SERVICE_CONTENT_SCHEMA_VERSION);
    });

    it('adapts the flat shape', () => {
      const document = {
        pageType: 'business-websites',
        hero: { title: 'Websites' },
        sections: { pillars: [{ title: 'One' }] },
        cta: { title: 'Start' },
      };

      const normalized = normalizeServiceContent(document);

      expect(normalized.landing.hero.title).toBe('Websites');
      expect(normalized.landing.sections.pillars).toHaveLength(1);
      expect(normalized.landing.cta.title).toBe('Start');
      // The legacy key stays reachable.
      expect(normalized.hero.title).toBe('Websites');
    });

    it('adapts the career service shape', () => {
      const document = {
        pageType: 'career-tracks',
        hero: { title: 'Tracks' },
        methodology: [{ title: 'Method', description: 'How' }],
        cta: { title: 'Apply' },
        details: { hero: { title: 'Details' } },
      };

      const normalized = normalizeServiceContent(document);

      expect(normalized.landing.hero.title).toBe('Tracks');
      expect(normalized.landing.sections.pillars[0].title).toBe('Method');
      expect(normalized.details.hero.title).toBe('Details');
      expect(normalized.methodology).toHaveLength(1);
    });

    it('reads a mongoose document', () => {
      const document = {
        toObject: () => ({ pageType: 'seo', landing: { hero: { title: 'SEO' } } }),
      };

      expect(normalizeServiceContent(document).landing.hero.title).toBe('SEO');
    });

    it('takes the page type from the route when the document has none', () => {
      const normalized = normalizeServiceContent({ hero: { title: 'X' } }, { pageType: 'branding' });

      expect(normalized.pageType).toBe('branding');
    });

    it('returns null for an empty document', () => {
      expect(normalizeServiceContent(null)).toBeNull();
    });
  });

  describe('parseServiceContent', () => {
    it('accepts a canonical payload', () => {
      const result = parseServiceContent(
        { landing: { hero: { title: 'Automation' }, sections: { pillars: [] } } },
        { pageType: 'automation' }
      );

      expect(result.ok).toBe(true);
      expect(result.data.pageType).toBe('automation');
    });

    it('accepts a payload without a page type because the route provides one', () => {
      const result = parseServiceContent({ landing: { hero: {} } }, { pageType: 'automation' });

      expect(result.ok).toBe(true);
    });

    it('rejects a payload whose landing is not an object', () => {
      const result = parseServiceContent({ landing: 'not an object' }, { pageType: 'automation' });

      expect(result.ok).toBe(false);
      expect(result.issues.join(' ')).toMatch(/landing/);
    });

    it('rejects a payload whose known section collection is not an array', () => {
      const result = parseServiceContent(
        { landing: { sections: { pillars: { title: 'One' } } } },
        { pageType: 'automation' }
      );

      expect(result.ok).toBe(false);
      expect(result.issues.join(' ')).toMatch(/pillars/);
    });

    it('keeps unknown fields, the editors store their own keys', () => {
      const result = parseServiceContent(
        { landing: { hero: { title: 'X' }, customBlock: { a: 1 } } },
        { pageType: 'automation' }
      );

      expect(result.ok).toBe(true);
      expect(result.data.landing.customBlock).toEqual({ a: 1 });
    });

    it('validates the career service payload with the same rules', () => {
      expect(parseCareerServiceContent({ hero: { title: 'X' } }, { pageType: 'career-tracks' }).ok).toBe(true);
      expect(parseCareerServiceContent({ hero: 5 }, { pageType: 'career-tracks' }).ok).toBe(false);
    });
  });
});
