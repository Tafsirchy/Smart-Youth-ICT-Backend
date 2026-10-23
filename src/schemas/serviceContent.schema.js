/**
 * The one CMS content contract.
 *
 * The CMS editors used to write five different shapes (`content.landing`,
 * `data.hero`, `data.details.hero`, `{ tracks, content }`,
 * `{ programs, content }`), and the marketing pages read them back under
 * different names. This module is the single definition of what a service
 * page holds, plus the adapter that turns the documents already in the
 * database into that shape.
 *
 * The schema is deliberately structural: it checks that a hero, a set of
 * sections and a call to action are objects and that the known section
 * collections are arrays, but it leaves the text fields free — the editors
 * store translated objects in some of them.
 *
 * The frontend keeps a mirror of this schema in
 * `syict-frontend/src/lib/cms/serviceContentSchema.js`; both sides carry the
 * same `SERVICE_CONTENT_SCHEMA_VERSION`.
 */
const { z } = require('zod');

/** Bump this whenever the canonical shape changes. */
const SERVICE_CONTENT_SCHEMA_VERSION = 1;

const HeroSchema = z.object({}).loose();

const SectionItemSchema = z.object({}).loose();

const SectionsSchema = z
  .object({
    pillars: z.array(SectionItemSchema).optional(),
    philosophies: z.array(SectionItemSchema).optional(),
    verticals: z.array(SectionItemSchema).optional(),
    phases: z.array(SectionItemSchema).optional(),
    integrations: z.array(SectionItemSchema).optional(),
    pricing: z.array(SectionItemSchema).optional(),
    metrics: z.array(SectionItemSchema).optional(),
    techStack: z.array(SectionItemSchema).optional(),
    checklist: z.array(SectionItemSchema).optional(),
    manifest: z.array(SectionItemSchema).optional(),
    roi: z.array(SectionItemSchema).optional(),
    codeSnippet: z.object({}).loose().optional(),
  })
  .loose();

const CtaSchema = z.object({}).loose();

const PageBodySchema = z
  .object({
    hero: HeroSchema.optional(),
    sections: SectionsSchema.optional(),
    cta: CtaSchema.optional(),
  })
  .loose();

/**
 * The canonical shape of a web service page (landing page and details page
 * in one document).
 *
 * The legacy flat body (`hero`, `sections`, `cta`) and the career service
 * body (`hero`, `methodology`, `cta`) are still accepted, because the
 * editors write them; the adapter turns them into the canonical names.
 */
const ServiceContentSchema = z
  .object({
    version: z.number().int().positive().default(SERVICE_CONTENT_SCHEMA_VERSION),
    pageType: z.string().min(1),
    landing: PageBodySchema.optional(),
    details: PageBodySchema.optional(),
    // Legacy flat body.
    hero: HeroSchema.optional(),
    sections: SectionsSchema.optional(),
    cta: CtaSchema.optional(),
    // Legacy career service body.
    methodology: z.array(SectionItemSchema).optional(),
  })
  .loose();

/**
 * The same for the career service pages, which share the canonical shape
 * and keep their own legacy body.
 */
const CareerServiceContentSchema = z
  .object({
    version: z.number().int().positive().default(SERVICE_CONTENT_SCHEMA_VERSION),
    pageType: z.string().min(1),
    landing: PageBodySchema.optional(),
    details: PageBodySchema.optional(),
    // Legacy career service body.
    hero: HeroSchema.optional(),
    methodology: z.array(SectionItemSchema).optional(),
    cta: CtaSchema.optional(),
  })
  .loose();

const toPlainObject = (document) => {
  if (!document) return null;
  if (typeof document.toObject === 'function') return document.toObject();
  return { ...document };
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Whether a page body carries any content.
 *
 * Mongoose fills the nested objects of a document with empty arrays, so a
 * `landing` without a hero and without a single section is only a
 * placeholder — the real content may still sit in the flat body.
 */
const hasContent = (body) => {
  if (!isPlainObject(body)) return false;

  if (isPlainObject(body.hero) && Object.keys(body.hero).length > 0) return true;
  if (isPlainObject(body.cta) && Object.keys(body.cta).length > 0) return true;

  if (isPlainObject(body.sections)) {
    return Object.values(body.sections).some((entry) => {
      if (Array.isArray(entry)) return entry.length > 0;
      return isPlainObject(entry) && Object.keys(entry).length > 0;
    });
  }

  return false;
};

/** The flat body of a document, whether it carries content or not. */
const flatBody = (raw) => {
  if (!isPlainObject(raw)) return {};

  return {
    hero: raw.hero,
    sections: raw.sections,
    cta: raw.cta,
  };
};

/**
 * The landing body of a document, no matter which of the legacy shapes it
 * was stored in.
 */
const resolveLanding = (raw) => {
  if (!isPlainObject(raw)) return undefined;

  // The canonical landing wins as soon as it holds content — a document
  // that was migrated keeps its old flat fields next to it.
  if (isPlainObject(raw.landing) && hasContent(raw.landing)) return raw.landing;

  // `{ hero, methodology, details, cta }` — the career service shape.
  if (Array.isArray(raw.methodology) && raw.methodology.length > 0) {
    return {
      hero: raw.hero,
      sections: { pillars: raw.methodology },
      cta: raw.cta,
    };
  }

  // `{ hero, sections, cta }` — the flat shape.
  const flat = flatBody(raw);
  if (hasContent(flat)) return flat;

  // Only the placeholder mongoose filled in.
  if (isPlainObject(raw.landing)) return raw.landing;

  return undefined;
};

/**
 * The details body of a document, no matter which of the legacy shapes it
 * was stored in.
 */
const resolveDetails = (raw) => {
  if (!isPlainObject(raw)) return undefined;

  // `details` is either the details body itself or `{ hero, sections, cta }`.
  if (isPlainObject(raw.details)) {
    const { hero, sections, cta } = raw.details;
    return { hero, sections, cta };
  }

  return undefined;
};

/**
 * Turns any stored document into the canonical shape.
 *
 * The legacy keys are kept, so a page that still reads `content.landing` or
 * `data.hero` keeps working while the rest of the app moves to the
 * canonical names.
 */
const normalizeServiceContent = (document, { pageType } = {}) => {
  const raw = toPlainObject(document);
  if (!raw) return null;

  const landing = resolveLanding(raw);
  const details = resolveDetails(raw);

  const normalized = {
    ...raw,
    version: Number.isInteger(raw.version) ? raw.version : SERVICE_CONTENT_SCHEMA_VERSION,
    pageType: raw.pageType || pageType,
  };

  if (landing) normalized.landing = landing;
  if (details) normalized.details = details;

  // The flat legacy shape stays reachable through `landing`.
  if (landing && !normalized.hero && landing.hero) normalized.hero = landing.hero;

  return normalized;
};

/**
 * Validates a payload before it is written.
 *
 * @returns {{ ok: true, data: Object } | { ok: false, issues: string[] }}
 */
const parseServiceContent = (payload, { pageType } = {}) => {
  const candidate = {
    ...(payload || {}),
    pageType: payload?.pageType || pageType,
  };

  const result = ServiceContentSchema.safeParse(candidate);

  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) => `${issue.path.join('.') || 'content'}: ${issue.message}`),
    };
  }

  return { ok: true, data: result.data };
};

/**
 * The same for the career service pages, which share the canonical shape
 * and keep their own legacy body.
 */
const parseCareerServiceContent = (payload, { pageType } = {}) => {
  const candidate = {
    ...(payload || {}),
    pageType: payload?.pageType || pageType,
  };

  const result = CareerServiceContentSchema.safeParse(candidate);

  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) => `${issue.path.join('.') || 'content'}: ${issue.message}`),
    };
  }

  return { ok: true, data: result.data };
};
module.exports = {
  SERVICE_CONTENT_SCHEMA_VERSION,
  ServiceContentSchema,
  CareerServiceContentSchema,
  HeroSchema,
  SectionsSchema,
  CtaSchema,
  PageBodySchema,
  normalizeServiceContent,
  parseServiceContent,
  parseCareerServiceContent,
};
