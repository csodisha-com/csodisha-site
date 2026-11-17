// SEO, Search & Discovery Batch 1 (v111): Modules 01-04
// 01 Meta Tags & OpenGraph | 02 Dynamic JSON-LD | 03 XML Sitemaps | 04 RSS/Atom Syndication
// Sanitize all meta/schema/feed inputs so raw <script> tags or broken XML entities can never be emitted.
import { HttpError, json, readJson, validationError } from './http.js';
import { invalidateEdgePaths, SEO_PUBLIC_PATHS } from './edge-cache-invalidator.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';

export const SEO_OG_TYPES = ['website', 'article', 'educational_resource'];
export const SEO_TWITTER_CARDS = ['summary_large_image', 'summary'];
export const SEO_ROBOTS_DIRECTIVES = ['index, follow', 'noindex, follow', 'noindex, nofollow'];
export const SEO_META_STATUSES = ['active_live', 'draft', 'archived'];

export const SEO_SCHEMA_TYPES = [
  'EducationalOrganization', 'JobPosting', 'GovernmentService',
  'Quiz', 'FAQPage', 'Article', 'BreadcrumbList'
];
export const SEO_VALIDATION_STATUSES = ['valid_schema_org', 'warning_missing_optional', 'invalid_json'];

export const SEO_CHANGEFREQS = ['always', 'hourly', 'daily', 'weekly', 'monthly'];
export const SEO_SITEMAP_STATUSES = ['active', 'paused'];

export const SEO_FEED_FORMATS = ['rss_2_0', 'atom_1_0', 'json_feed_1_1'];
export const SEO_FEED_SOURCES = ['jobs-careers', 'schemes', 'study-library', 'all'];
export const SEO_LANG_MODES = ['en-IN', 'or-IN', 'bilingual'];
export const SEO_FEED_STATUSES = ['active_live', 'paused', 'archived'];

const _seo1Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

export function sanitizeSeoText(raw, maxLen = 320) {
  const stripped = String(raw || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '');
  return cleanStr(stripped, maxLen);
}

export function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeDeep(val) {
  if (typeof val === 'string') return sanitizeSeoText(val, 1000);
  if (Array.isArray(val)) return val.map(sanitizeDeep);
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[sanitizeSeoText(k, 80)] = sanitizeDeep(v);
    return out;
  }
  return val;
}

export function computeSeoScore({ meta_title_en = '', meta_title_or = '', meta_description_en = '', meta_description_or = '', og_image_url = '', keywords_en = '' }) {
  const tLen = String(meta_title_en || '').trim().length;
  const dLen = String(meta_description_en || '').trim().length;
  let score = 0;
  if (tLen >= 35 && tLen <= 65) score += 30;
  else if (tLen > 0) score += 15;
  if (dLen >= 110 && dLen <= 165) score += 30;
  else if (dLen > 0) score += 15;
  if (String(meta_title_or || '').trim().length > 0) score += 15;
  if (String(meta_description_or || '').trim().length > 0) score += 10;
  if (String(og_image_url || '').trim().startsWith('http')) score += 10;
  if (String(keywords_en || '').trim().length > 0) score += 5;
  return { title_char_count: tLen, desc_char_count: dLen, seo_score: Math.min(100, score) };
}

export function validateJsonLdSchema({ schema_type = 'EducationalOrganization', payload }) {
  const parsed = typeof payload === 'string' ? parseJson(payload, null) : payload;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, validation_status: 'invalid_json', errors: ['Payload must be a valid JSON object'], warnings: [], sanitized_payload: null };
  }
  const clean = sanitizeDeep(parsed);
  const errors = [];
  const warnings = [];
  const ctx = String(clean['@context'] || '');
  if (!ctx.includes('schema.org')) errors.push('@context must reference https://schema.org');
  if (!clean['@type']) errors.push('@type is required');
  else if (schema_type && clean['@type'] !== schema_type) warnings.push(`@type (${clean['@type']}) differs from selected schema_type (${schema_type})`);

  if (schema_type === 'EducationalOrganization' && !clean.name) warnings.push('Recommended property: name');
  if (schema_type === 'JobPosting' && (!clean.title || !clean.hiringOrganization)) warnings.push('Recommended properties: title, hiringOrganization');
  if (schema_type === 'GovernmentService' && !clean.serviceType) warnings.push('Recommended property: serviceType');
  if (schema_type === 'FAQPage' && !Array.isArray(clean.mainEntity)) warnings.push('Recommended property: mainEntity array');

  const status = errors.length ? 'invalid_json' : warnings.length ? 'warning_missing_optional' : 'valid_schema_org';
  return { valid: errors.length === 0, validation_status: status, errors, warnings, sanitized_payload: clean };
}

export const SEO_REV_TABLES = {
  '01': {
    table: 'seo_meta_profiles',
    cols: ['route_pattern', 'portal_section', 'meta_title_en', 'meta_title_or', 'meta_description_en', 'meta_description_or', 'keywords_en', 'keywords_or', 'og_type', 'og_image_url', 'twitter_card', 'robots_directive', 'title_char_count', 'desc_char_count', 'seo_score', 'status']
  },
  '02': {
    table: 'seo_jsonld_schemas',
    cols: ['schema_code', 'schema_type', 'target_route_pattern', 'name_en', 'name_or', 'schema_payload_json', 'validation_status', 'is_active']
  },
  '04': {
    table: 'seo_syndication_feeds',
    cols: ['feed_slug', 'feed_format', 'portal_source', 'title_en', 'title_or', 'description_en', 'description_or', 'language_mode', 'max_items', 'cache_ttl_sec', 'subscribers_approx', 'feed_status']
  }
};

export async function snapshotSeoRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = SEO_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM seo_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('seo-rev');
  await db.prepare(
    `INSERT INTO seo_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(row), cleanStr(changeNote, 200), actor?.email || actor?.userId || 'system').run();
  return { id: revId, version_num: nextVer };
}

export async function ensureSeoSearchDiscoveryBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_seo1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS seo_meta_profiles (
      id TEXT PRIMARY KEY,
      route_pattern TEXT NOT NULL UNIQUE,
      portal_section TEXT NOT NULL DEFAULT 'home',
      meta_title_en TEXT NOT NULL,
      meta_title_or TEXT NOT NULL DEFAULT '',
      meta_description_en TEXT NOT NULL DEFAULT '',
      meta_description_or TEXT NOT NULL DEFAULT '',
      keywords_en TEXT NOT NULL DEFAULT '',
      keywords_or TEXT NOT NULL DEFAULT '',
      og_type TEXT NOT NULL DEFAULT 'website' CHECK (og_type IN ('website', 'article', 'educational_resource')),
      og_image_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/brand/cso-og-default.png',
      twitter_card TEXT NOT NULL DEFAULT 'summary_large_image' CHECK (twitter_card IN ('summary_large_image', 'summary')),
      robots_directive TEXT NOT NULL DEFAULT 'index, follow' CHECK (robots_directive IN ('index, follow', 'noindex, follow', 'noindex, nofollow')),
      title_char_count INTEGER NOT NULL DEFAULT 0,
      desc_char_count INTEGER NOT NULL DEFAULT 0,
      seo_score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active_live' CHECK (status IN ('active_live', 'draft', 'archived')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_meta_status ON seo_meta_profiles(portal_section, status)`,
    `CREATE TABLE IF NOT EXISTS seo_jsonld_schemas (
      id TEXT PRIMARY KEY,
      schema_code TEXT NOT NULL UNIQUE,
      schema_type TEXT NOT NULL DEFAULT 'EducationalOrganization' CHECK (schema_type IN ('EducationalOrganization', 'JobPosting', 'GovernmentService', 'Quiz', 'FAQPage', 'Article', 'BreadcrumbList')),
      target_route_pattern TEXT NOT NULL DEFAULT '/',
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      schema_payload_json TEXT NOT NULL,
      validation_status TEXT NOT NULL DEFAULT 'valid_schema_org' CHECK (validation_status IN ('valid_schema_org', 'warning_missing_optional', 'invalid_json')),
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_jsonld_route ON seo_jsonld_schemas(target_route_pattern, is_active)`,
    `CREATE TABLE IF NOT EXISTS seo_xml_sitemaps (
      id TEXT PRIMARY KEY,
      sitemap_key TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      portal_scope TEXT NOT NULL DEFAULT 'all',
      changefreq TEXT NOT NULL DEFAULT 'daily' CHECK (changefreq IN ('always', 'hourly', 'daily', 'weekly', 'monthly')),
      priority_decimal TEXT NOT NULL DEFAULT '0.8',
      include_odia_hreflang INTEGER NOT NULL DEFAULT 1,
      url_count INTEGER NOT NULL DEFAULT 0,
      last_generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_sitemaps_status ON seo_xml_sitemaps(status, sitemap_key)`,
    `CREATE TABLE IF NOT EXISTS seo_syndication_feeds (
      id TEXT PRIMARY KEY,
      feed_slug TEXT NOT NULL UNIQUE,
      feed_format TEXT NOT NULL DEFAULT 'rss_2_0' CHECK (feed_format IN ('rss_2_0', 'atom_1_0', 'json_feed_1_1')),
      portal_source TEXT NOT NULL DEFAULT 'all' CHECK (portal_source IN ('jobs-careers', 'schemes', 'study-library', 'all')),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      language_mode TEXT NOT NULL DEFAULT 'bilingual' CHECK (language_mode IN ('en-IN', 'or-IN', 'bilingual')),
      max_items INTEGER NOT NULL DEFAULT 30,
      cache_ttl_sec INTEGER NOT NULL DEFAULT 300,
      subscribers_approx INTEGER NOT NULL DEFAULT 0,
      feed_status TEXT NOT NULL DEFAULT 'active_live' CHECK (feed_status IN ('active_live', 'paused', 'archived')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_feeds_status ON seo_syndication_feeds(feed_status, feed_format)`,
    `CREATE TABLE IF NOT EXISTS seo_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_rev_lookup ON seo_revisions(module_code, entity_id, version_num DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 01: Meta Profiles
  const mCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_meta_profiles`).first();
  if (Number(mCnt?.n || 0) === 0) {
    const metas = [
      ['seo-meta-01', '/', 'home', 'CS Odisha — Odisha Govt Exams, Schemes & Study Portal', 'CS ଓଡ଼ିଶା — ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା ଏବଂ ଯୋଜନା ପୋର୍ଟାଲ୍', 'Bilingual Odisha portal for OPSC OAS, OSSC, OSSSC job alerts, state welfare schemes, PYQ PDFs, and free mock tests.', 'OPSC OAS, OSSC, OSSSC ଚାକିରି, ଓଡ଼ିଶା ଯୋଜନା, PYQ PDF ଏବଂ ମାଗଣା ମକ୍ ଟେଷ୍ଟ।', 'odisha govt jobs, opsc oas, ossc, subhadra yojana', 'ଓଡ଼ିଶା ଚାକିରି, ସୁଭଦ୍ରା ଯୋଜନା', 'website'],
      ['seo-meta-02', '/study-library/', 'study-library', 'Odisha Exam Study Library, Solved PYQs & Notes (EN/OR)', 'ଓଡ଼ିଶା ପରୀକ୍ଷା ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ ଏବଂ ସମାଧାନ PYQ', 'Download free OPSC, OSSC, OSSSC & UGC NET bilingual study notes, syllabus PDFs, and 10-year solved question banks.', 'OPSC, OSSC, OSSSC ଏବଂ UGC NET ଦ୍ୱିଭାଷୀ ନୋଟ୍ସ ଓ PYQ PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ।', 'odisha pyq pdf, opsc notes, ossc study material', 'ଅଧ୍ୟୟନ ନୋଟ୍ସ, PYQ PDF', 'educational_resource'],
      ['seo-meta-03', '/jobs-careers/', 'jobs-careers', 'Odisha Sarkari Jobs 2026 — OPSC, OSSC, OSSSC & Police', 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି ୨୦୨୬ — OPSC, OSSC, OSSSC', 'Live Odisha government recruitment notifications, admit cards, exam dates, and official apply links updated daily.', 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି, ଆଡମିଟ୍ କାର୍ଡ ଏବଂ ପରୀକ୍ଷା ତାରିଖ।', 'odisha jobs 2026, opsc recruitment, osssc vacancy', 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି', 'article'],
      ['seo-meta-04', '/schemes/', 'schemes', 'Odisha State Welfare Schemes & DBT Eligibility Portal', 'ଓଡ଼ିଶା ରାଜ୍ୟ କଲ୍ୟାଣ ଯୋଜନା ଏବଂ DBT ପୋର୍ଟାଲ୍', 'Check Subhadra Yojana, CM-Kisan, Post-Matric Scholarship, and BSKY eligibility, e-KYC, and official sanction lists.', 'ସୁଭଦ୍ରା ଯୋଜନା, CM-କିଷାନ, ବୃତ୍ତି ଏବଂ BSKY ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ।', 'subhadra yojana, cm kisan odisha, odisha scholarship', 'ସୁଭଦ୍ରା ଯୋଜନା, ଓଡ଼ିଶା ବୃତ୍ତି', 'article'],
      ['seo-meta-05', '/educational-tools/', 'educational-tools', 'CS Odisha Free Mock Tests, OMR & Age Calculator Tools', 'CS ଓଡ଼ିଶା ମାଗଣା ମକ୍ ଟେଷ୍ଟ ଏବଂ ପରୀକ୍ଷା ଟୁଲ୍ସ', 'Practice bilingual CBT mock tests for OPSC OAS, OSSC CGL & UGC NET with instant analytics and eligibility calculators.', 'OPSC OAS, OSSC CGL ପାଇଁ ଦ୍ୱିଭାଷୀ CBT ମକ୍ ଟେଷ୍ଟ ଅଭ୍ୟାସ କରନ୍ତୁ।', 'odisha mock test, opsc cbt practice, exam age calculator', 'ମକ୍ ଟେଷ୍ଟ, କ୍ୟାଲକୁଲେଟର୍', 'educational_resource'],
      ['seo-meta-06', '/community/', 'community', 'CS Odisha Aspirant Community, Q&A & Study Circles', 'CS ଓଡ଼ିଶା ପ୍ରାର୍ଥୀ କମ୍ୟୁନିଟି ଏବଂ ପ୍ରଶ୍ନୋତ୍ତର', 'Connect with Odisha civil service & state exam aspirants, discuss PYQs, and join district study circles.', 'ଓଡ଼ିଶା ପରୀକ୍ଷାର୍ଥୀଙ୍କ ସହ ଯୋଡ଼ି ହୁଅନ୍ତୁ ଏବଂ ପ୍ରଶ୍ନୋତ୍ତର ଆଲୋଚନା କରନ୍ତୁ।', 'odisha aspirant forum, opsc qna, cuttack study circle', 'ପ୍ରାର୍ଥୀ କମ୍ୟୁନିଟି', 'website']
    ];
    for (const m of metas) {
      const sc = computeSeoScore({
        meta_title_en: m[3], meta_title_or: m[4], meta_description_en: m[5], meta_description_or: m[6],
        og_image_url: 'https://csodisha.com/assets/brand/cso-og-default.png', keywords_en: m[7]
      });
      await db.prepare(
        `INSERT INTO seo_meta_profiles (id, route_pattern, portal_section, meta_title_en, meta_title_or, meta_description_en, meta_description_or, keywords_en, keywords_or, og_type, title_char_count, desc_char_count, seo_score, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active_live')`
      ).bind(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], sc.title_char_count, sc.desc_char_count, sc.seo_score).run();
    }
  }

  // Seed Module 02: Dynamic JSON-LD Schemas
  const ldCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_jsonld_schemas`).first();
  if (Number(ldCnt?.n || 0) === 0) {
    const schemas = [
      ['seo-ld-01', 'LD-2026-0001', 'EducationalOrganization', '/', 'CS Odisha Educational Organization', 'CS ଓଡ଼ିଶା ଶିକ୍ଷା ପ୍ରତିଷ୍ଠାନ', { '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: 'CS Odisha (Common Sense Odisha)', url: 'https://csodisha.com', areaServed: 'Odisha, India', sameAs: ['https://t.me/csodisha_official'] }],
      ['seo-ld-02', 'LD-2026-0002', 'JobPosting', '/jobs-careers/', 'Odisha State Recruitment JobPosting', 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି ସ୍କିମା', { '@context': 'https://schema.org', '@type': 'JobPosting', title: 'Odisha State Government Recruitment', hiringOrganization: { '@type': 'Organization', name: 'Odisha Public Service Commission (OPSC)' }, jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressRegion: 'Odisha', addressCountry: 'IN' } } }],
      ['seo-ld-03', 'LD-2026-0003', 'GovernmentService', '/schemes/', 'Odisha Welfare GovernmentService', 'ଓଡ଼ିଶା କଲ୍ୟାଣ ଯୋଜନା ସ୍କିମା', { '@context': 'https://schema.org', '@type': 'GovernmentService', name: 'Odisha State Welfare & Scholarship Schemes', serviceType: 'Citizen Welfare & Direct Benefit Transfer', provider: { '@type': 'GovernmentOrganization', name: 'Government of Odisha' } }],
      ['seo-ld-04', 'LD-2026-0004', 'FAQPage', '/study-library/', 'Odisha Exam Prep FAQPage', 'ଓଡ଼ିଶା ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି FAQ', { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Are CS Odisha PYQ PDFs free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, bilingual Odia & English PYQ packs and mock tests are available on csodisha.com.' } }] }]
    ];
    for (const s of schemas) {
      await db.prepare(
        `INSERT INTO seo_jsonld_schemas (id, schema_code, schema_type, target_route_pattern, name_en, name_or, schema_payload_json, validation_status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'valid_schema_org', 1)`
      ).bind(s[0], s[1], s[2], s[3], s[4], s[5], JSON.stringify(s[6])).run();
    }
  }

  // Seed Module 03: Multi-Index XML Sitemaps
  const smCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_xml_sitemaps`).first();
  if (Number(smCnt?.n || 0) === 0) {
    const sitemaps = [
      ['seo-sm-01', 'sitemap-index', 'sitemap-index.xml', 'all', 'daily', '1.0', 1, 4],
      ['seo-sm-02', 'sitemap-core', 'sitemap-core.xml', 'core', 'weekly', '0.9', 1, 12],
      ['seo-sm-03', 'sitemap-study-library', 'sitemap-study-library.xml', 'study-library', 'daily', '0.9', 1, 48],
      ['seo-sm-04', 'sitemap-jobs-careers', 'sitemap-jobs-careers.xml', 'jobs-careers', 'hourly', '0.9', 1, 36],
      ['seo-sm-05', 'sitemap-schemes', 'sitemap-schemes.xml', 'schemes', 'daily', '0.8', 1, 24]
    ];
    for (const sm of sitemaps) {
      await db.prepare(
        `INSERT INTO seo_xml_sitemaps (id, sitemap_key, filename, portal_scope, changefreq, priority_decimal, include_odia_hreflang, url_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
      ).bind(...sm).run();
    }
  }

  // Seed Module 04: RSS, Atom & JSON Feeds
  const fdCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_syndication_feeds`).first();
  if (Number(fdCnt?.n || 0) === 0) {
    const feeds = [
      ['seo-fd-01', 'odisha-jobs-rss', 'rss_2_0', 'jobs-careers', 'CS Odisha Live Govt Jobs RSS', 'CS ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି RSS', 'Real-time OPSC, OSSC & OSSSC recruitment notifications.', 'OPSC, OSSC ଏବଂ OSSSC ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି।', 'bilingual', 30, 300, 1420],
      ['seo-fd-02', 'odisha-schemes-atom', 'atom_1_0', 'schemes', 'Odisha Welfare Schemes Atom Feed', 'ଓଡ଼ିଶା କଲ୍ୟାଣ ଯୋଜନା Atom ଫିଡ୍', 'Subhadra Yojana, CM-Kisan & Scholarship updates.', 'ସୁଭଦ୍ରା ଯୋଜନା ଏବଂ ବୃତ୍ତି ସୂଚନା।', 'bilingual', 25, 300, 860],
      ['seo-fd-03', 'study-library-updates', 'json_feed_1_1', 'study-library', 'Study Library & PYQ JSON Feed', 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ JSON ଫିଡ୍', 'New solved PYQs, syllabus PDFs & bilingual notes.', 'ନୂତନ ସମାଧାନ PYQ ଏବଂ ନୋଟ୍ସ।', 'en-IN', 40, 600, 610],
      ['seo-fd-04', 'all-portals-news', 'rss_2_0', 'all', 'CS Odisha Master Portal Feed', 'CS ଓଡ଼ିଶା ମାଷ୍ଟର ପୋର୍ଟାଲ୍ ଫିଡ୍', 'Unified feed across Jobs, Schemes, and Study Library.', 'ଚାକିରି, ଯୋଜନା ଏବଂ ଅଧ୍ୟୟନ ସୂଚନା।', 'bilingual', 50, 300, 2150]
    ];
    for (const f of feeds) {
      await db.prepare(
        `INSERT INTO seo_syndication_feeds (id, feed_slug, feed_format, portal_source, title_en, title_or, description_en, description_or, language_mode, max_items, cache_ttl_sec, subscribers_approx, feed_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active_live')`
      ).bind(...f).run();
    }
  }

  _seo1Ready.add(db);
}

/* ================= OVERVIEW ================= */
export async function getSeoOverview(db) {
  await ensureSeoSearchDiscoveryBatch1Schema(db);
  const [mAct, mTot, mAvg, ldVal, ldTot, smSum, smTot, fdAct, fdTot] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM seo_meta_profiles WHERE status = 'active_live'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_meta_profiles`).first(),
    db.prepare(`SELECT ROUND(AVG(seo_score), 1) AS avg_score FROM seo_meta_profiles WHERE status = 'active_live'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_jsonld_schemas WHERE is_active = 1 AND validation_status = 'valid_schema_org'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_jsonld_schemas`).first(),
    db.prepare(`SELECT COALESCE(SUM(url_count), 0) AS n FROM seo_xml_sitemaps WHERE status = 'active'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_xml_sitemaps`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_syndication_feeds WHERE feed_status = 'active_live'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_syndication_feeds`).first()
  ]);

  const modules = {};
  for (let i = 1; i <= 16; i++) {
    const k = String(i).padStart(2, '0');
    const active = i <= 4;
    let count = 0;
    if (i === 1) count = Number(mTot?.n || 0);
    else if (i === 2) count = Number(ldTot?.n || 0);
    else if (i === 3) count = Number(smTot?.n || 0);
    else if (i === 4) count = Number(fdTot?.n || 0);
    modules[k] = { status: active ? 'active' : 'queued', count };
  }

  return {
    active_meta_profiles: Number(mAct?.n || 0),
    avg_seo_score: Number(mAvg?.avg_score || 0),
    valid_jsonld_schemas: Number(ldVal?.n || 0),
    total_indexed_sitemap_urls: Number(smSum?.n || 0),
    active_syndication_feeds: Number(fdAct?.n || 0),
    modules
  };
}

/* ================= MODULE 01: META TAGS & OPENGRAPH ================= */
async function handleMeta(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const sec = (url.searchParams.get('portal_section') || '').trim();
    const st = (url.searchParams.get('status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (sec) { where.push('portal_section = ?'); binds.push(sec); }
    if (st && SEO_META_STATUSES.includes(st)) { where.push('status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(route_pattern LIKE ? ESCAPE '\\' OR meta_title_en LIKE ? ESCAPE '\\')`);
      binds.push(p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM seo_meta_profiles ${w} ORDER BY route_pattern ASC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const route = cleanStr(body.route_pattern || '', 160);
    const titleEn = sanitizeSeoText(body.meta_title_en || '', 140);
    if (!route || !route.startsWith('/')) errors.route_pattern = 'route_pattern must start with /';
    if (!titleEn) errors.meta_title_en = 'meta_title_en is required';
    const ogType = pick(body.og_type, SEO_OG_TYPES, 'og_type', errors, 'website');
    const twCard = pick(body.twitter_card, SEO_TWITTER_CARDS, 'twitter_card', errors, 'summary_large_image');
    const robots = pick(body.robots_directive, SEO_ROBOTS_DIRECTIVES, 'robots_directive', errors, 'index, follow');
    const st = pick(body.status, SEO_META_STATUSES, 'status', errors, 'active_live');
    if (Object.keys(errors).length) throw validationError(errors);

    const titleOr = sanitizeSeoText(body.meta_title_or || '', 160);
    const descEn = sanitizeSeoText(body.meta_description_en || '', 240);
    const descOr = sanitizeSeoText(body.meta_description_or || '', 260);
    const kwEn = sanitizeSeoText(body.keywords_en || '', 200);
    const kwOr = sanitizeSeoText(body.keywords_or || '', 220);
    const ogImg = cleanStr(body.og_image_url || 'https://csodisha.com/assets/brand/cso-og-default.png', 300);
    const sc = computeSeoScore({ meta_title_en: titleEn, meta_title_or: titleOr, meta_description_en: descEn, meta_description_or: descOr, og_image_url: ogImg, keywords_en: kwEn });

    const newId = rid('seo-meta');
    await db.prepare(
      `INSERT INTO seo_meta_profiles (id, route_pattern, portal_section, meta_title_en, meta_title_or, meta_description_en, meta_description_or, keywords_en, keywords_or, og_type, og_image_url, twitter_card, robots_directive, title_char_count, desc_char_count, seo_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, route, cleanStr(body.portal_section || 'home', 60), titleEn, titleOr, descEn, descOr, kwEn, kwOr,
      ogType, ogImg, twCard, robots, sc.title_char_count, sc.desc_char_count, sc.seo_score, st
    ).run();

    await snapshotSeoRevision(db, '01', newId, actor, 'create meta profile');
    await audit(env, request, actor, 'seo.meta.create', 'seo_meta_profiles', newId, { route_pattern: route });
    const created = await db.prepare(`SELECT * FROM seo_meta_profiles WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_meta_profiles WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Meta profile not found');
    const body = await readJson(request, 20000);
    const errors = {};
    const ogType = body.og_type !== undefined ? pick(body.og_type, SEO_OG_TYPES, 'og_type', errors, ex.og_type) : ex.og_type;
    const twCard = body.twitter_card !== undefined ? pick(body.twitter_card, SEO_TWITTER_CARDS, 'twitter_card', errors, ex.twitter_card) : ex.twitter_card;
    const robots = body.robots_directive !== undefined ? pick(body.robots_directive, SEO_ROBOTS_DIRECTIVES, 'robots_directive', errors, ex.robots_directive) : ex.robots_directive;
    const st = body.status !== undefined ? pick(body.status, SEO_META_STATUSES, 'status', errors, ex.status) : ex.status;
    if (Object.keys(errors).length) throw validationError(errors);

    const titleEn = body.meta_title_en !== undefined ? sanitizeSeoText(body.meta_title_en, 140) : ex.meta_title_en;
    const titleOr = body.meta_title_or !== undefined ? sanitizeSeoText(body.meta_title_or, 160) : ex.meta_title_or;
    const descEn = body.meta_description_en !== undefined ? sanitizeSeoText(body.meta_description_en, 240) : ex.meta_description_en;
    const descOr = body.meta_description_or !== undefined ? sanitizeSeoText(body.meta_description_or, 260) : ex.meta_description_or;
    const kwEn = body.keywords_en !== undefined ? sanitizeSeoText(body.keywords_en, 200) : ex.keywords_en;
    const kwOr = body.keywords_or !== undefined ? sanitizeSeoText(body.keywords_or, 220) : ex.keywords_or;
    const ogImg = body.og_image_url !== undefined ? cleanStr(body.og_image_url, 300) : ex.og_image_url;
    const sc = computeSeoScore({ meta_title_en: titleEn, meta_title_or: titleOr, meta_description_en: descEn, meta_description_or: descOr, og_image_url: ogImg, keywords_en: kwEn });

    await snapshotSeoRevision(db, '01', sub, actor, 'update meta profile');
    await db.prepare(
      `UPDATE seo_meta_profiles
       SET portal_section = ?, meta_title_en = ?, meta_title_or = ?, meta_description_en = ?, meta_description_or = ?,
           keywords_en = ?, keywords_or = ?, og_type = ?, og_image_url = ?, twitter_card = ?, robots_directive = ?,
           title_char_count = ?, desc_char_count = ?, seo_score = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.portal_section !== undefined ? cleanStr(body.portal_section, 60) : ex.portal_section,
      titleEn, titleOr, descEn, descOr, kwEn, kwOr, ogType, ogImg, twCard, robots,
      sc.title_char_count, sc.desc_char_count, sc.seo_score, st, sub
    ).run();
    await audit(env, request, actor, 'seo.meta.update', 'seo_meta_profiles', sub, { seo_score: sc.seo_score });
    const updated = await db.prepare(`SELECT * FROM seo_meta_profiles WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_meta_profiles WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Meta profile not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.status, SEO_META_STATUSES, 'status', errors, ex.status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotSeoRevision(db, '01', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE seo_meta_profiles SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    await audit(env, request, actor, 'seo.meta.status', 'seo_meta_profiles', sub, { status: st });
    const updated = await db.prepare(`SELECT * FROM seo_meta_profiles WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotSeoRevision(db, '01', sub, actor, 'archive meta profile');
    await db.prepare(`UPDATE seo_meta_profiles SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 02: JSON-LD SCHEMA ENGINE ================= */
async function nextLdCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM seo_jsonld_schemas`).first();
  return `LD-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleSchemas(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const sType = (url.searchParams.get('schema_type') || '').trim();
    const where = sType && SEO_SCHEMA_TYPES.includes(sType) ? `WHERE schema_type = ?` : '';
    const binds = where ? [sType] : [];
    const { results } = await db.prepare(`SELECT * FROM seo_jsonld_schemas ${where} ORDER BY schema_code ASC`).bind(...binds).all();
    return json({ items: (results || []).map(r => ({ ...r, schema_payload: parseJson(r.schema_payload_json, {}) })) });
  }

  if (sub === 'validate' && method === 'POST') {
    const body = await readJson(request, 24000);
    return json(validateJsonLdSchema({ schema_type: body.schema_type, payload: body.schema_payload || body.schema_payload_json }));
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 24000);
    const errors = {};
    const sType = pick(body.schema_type, SEO_SCHEMA_TYPES, 'schema_type', errors, 'EducationalOrganization');
    const nameEn = sanitizeSeoText(body.name_en || '', 160);
    if (!nameEn) errors.name_en = 'name_en is required';
    const val = validateJsonLdSchema({ schema_type: sType, payload: body.schema_payload || body.schema_payload_json });
    if (!val.valid) errors.schema_payload_json = val.errors.join('; ');
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('seo-ld');
    const code = await nextLdCode(db);
    await db.prepare(
      `INSERT INTO seo_jsonld_schemas (id, schema_code, schema_type, target_route_pattern, name_en, name_or, schema_payload_json, validation_status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, sType, cleanStr(body.target_route_pattern || '/', 160),
      nameEn, sanitizeSeoText(body.name_or || '', 200),
      JSON.stringify(val.sanitized_payload), val.validation_status,
      body.is_active === false || body.is_active === 0 ? 0 : 1
    ).run();

    await snapshotSeoRevision(db, '02', newId, actor, 'create json-ld schema');
    await audit(env, request, actor, 'seo.schema.create', 'seo_jsonld_schemas', newId, { schema_code: code });
    const created = await db.prepare(`SELECT * FROM seo_jsonld_schemas WHERE id = ?`).bind(newId).first();
    return json({ item: { ...created, schema_payload: val.sanitized_payload } }, 201);
  }

  if (sub && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_jsonld_schemas WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'JSON-LD schema not found');
    const body = await readJson(request, 24000);
    const errors = {};
    const sType = body.schema_type !== undefined ? pick(body.schema_type, SEO_SCHEMA_TYPES, 'schema_type', errors, ex.schema_type) : ex.schema_type;
    const rawPayload = body.schema_payload !== undefined ? body.schema_payload : (body.schema_payload_json !== undefined ? body.schema_payload_json : ex.schema_payload_json);
    const val = validateJsonLdSchema({ schema_type: sType, payload: rawPayload });
    if (!val.valid) errors.schema_payload_json = val.errors.join('; ');
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotSeoRevision(db, '02', sub, actor, 'update json-ld schema');
    await db.prepare(
      `UPDATE seo_jsonld_schemas
       SET schema_type = ?, target_route_pattern = ?, name_en = ?, name_or = ?,
           schema_payload_json = ?, validation_status = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      sType,
      body.target_route_pattern !== undefined ? cleanStr(body.target_route_pattern, 160) : ex.target_route_pattern,
      body.name_en !== undefined ? sanitizeSeoText(body.name_en, 160) : ex.name_en,
      body.name_or !== undefined ? sanitizeSeoText(body.name_or, 200) : ex.name_or,
      JSON.stringify(val.sanitized_payload), val.validation_status,
      body.is_active === undefined ? ex.is_active : (body.is_active ? 1 : 0),
      sub
    ).run();
    await audit(env, request, actor, 'seo.schema.update', 'seo_jsonld_schemas', sub, { validation_status: val.validation_status });
    const updated = await db.prepare(`SELECT * FROM seo_jsonld_schemas WHERE id = ?`).bind(sub).first();
    return json({ item: { ...updated, schema_payload: val.sanitized_payload } });
  }

  if (sub && method === 'DELETE') {
    await snapshotSeoRevision(db, '02', sub, actor, 'deactivate json-ld schema');
    await db.prepare(`UPDATE seo_jsonld_schemas SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, is_active: 0 });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 03: XML SITEMAPS ================= */
async function buildSitemapXml(db, sitemapRow) {
  const origin = 'https://csodisha.com';
  const nowIso = new Date().toISOString().slice(0, 10);

  if (sitemapRow.sitemap_key === 'sitemap-index') {
    const { results } = await db.prepare(`SELECT * FROM seo_xml_sitemaps WHERE sitemap_key != 'sitemap-index' AND status = 'active' ORDER BY sitemap_key ASC`).all();
    const entries = (results || []).map(r => (
      `  <sitemap>\n    <loc>${escapeXml(`${origin}/api/seo/sitemap/${r.sitemap_key}`)}</loc>\n    <lastmod>${escapeXml((r.last_generated_at || nowIso).slice(0, 10))}</lastmod>\n  </sitemap>`
    )).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
  }

  const { results: metaRows } = await db.prepare(`SELECT route_pattern, portal_section FROM seo_meta_profiles WHERE status = 'active_live'`).all();
  const filtered = (metaRows || []).filter(m => sitemapRow.portal_scope === 'core' || sitemapRow.portal_scope === 'all' || m.portal_section === sitemapRow.portal_scope);
  const urls = filtered.length ? filtered : [{ route_pattern: `/${sitemapRow.portal_scope === 'core' ? '' : `${sitemapRow.portal_scope}/`}` }];
  const hreflang = Number(sitemapRow.include_odia_hreflang) === 1;

  const urlBlocks = urls.map(u => {
    const loc = `${origin}${u.route_pattern}`;
    const links = hreflang
      ? `\n    <xhtml:link rel="alternate" hreflang="en-IN" href="${escapeXml(loc)}" />\n    <xhtml:link rel="alternate" hreflang="or-IN" href="${escapeXml(`${loc}?lang=or`)}" />`
      : '';
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${escapeXml(nowIso)}</lastmod>\n    <changefreq>${escapeXml(sitemapRow.changefreq)}</changefreq>\n    <priority>${escapeXml(sitemapRow.priority_decimal)}</priority>${links}\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlBlocks}\n</urlset>`;
}

async function handleSitemaps(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM seo_xml_sitemaps ORDER BY sitemap_key ASC`).all();
    return json({ items: results || [] });
  }

  if (sub === 'regenerate' && method === 'POST') {
    const { results: metas } = await db.prepare(`SELECT portal_section FROM seo_meta_profiles WHERE status = 'active_live'`).all();
    const { results: sitemaps } = await db.prepare(`SELECT * FROM seo_xml_sitemaps`).all();
    const activeChildren = (sitemaps || []).filter(s => s.sitemap_key !== 'sitemap-index' && s.status === 'active').length;

    for (const sm of (sitemaps || [])) {
      let cnt = 1;
      if (sm.sitemap_key === 'sitemap-index') cnt = activeChildren;
      else if (sm.portal_scope === 'core') cnt = Math.max(6, (metas || []).length);
      else cnt = Math.max(12, (metas || []).filter(m => m.portal_section === sm.portal_scope).length * 12);
      await db.prepare(`UPDATE seo_xml_sitemaps SET url_count = ?, last_generated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(cnt, sm.id).run();
    }
    await audit(env, request, actor, 'seo.sitemap.regenerate', 'seo_xml_sitemaps', 'all', { regenerated: (sitemaps || []).length });
    const { results: updated } = await db.prepare(`SELECT * FROM seo_xml_sitemaps ORDER BY sitemap_key ASC`).all();
    return json({ ok: true, items: updated || [] });
  }

  if (sub && extra === 'preview-xml' && method === 'GET') {
    const sm = await db.prepare(`SELECT * FROM seo_xml_sitemaps WHERE sitemap_key = ? OR id = ?`).bind(sub, sub).first();
    if (!sm) throw new HttpError(404, 'NOT_FOUND', 'Sitemap not found');
    const xml = await buildSitemapXml(db, sm);
    return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_xml_sitemaps WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Sitemap not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const freq = body.changefreq !== undefined ? pick(body.changefreq, SEO_CHANGEFREQS, 'changefreq', errors, ex.changefreq) : ex.changefreq;
    const st = body.status !== undefined ? pick(body.status, SEO_SITEMAP_STATUSES, 'status', errors, ex.status) : ex.status;
    if (Object.keys(errors).length) throw validationError(errors);

    await db.prepare(
      `UPDATE seo_xml_sitemaps SET changefreq = ?, priority_decimal = ?, include_odia_hreflang = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      freq,
      body.priority_decimal !== undefined ? cleanStr(body.priority_decimal, 10) : ex.priority_decimal,
      body.include_odia_hreflang === undefined ? ex.include_odia_hreflang : (body.include_odia_hreflang ? 1 : 0),
      st, sub
    ).run();
    const updated = await db.prepare(`SELECT * FROM seo_xml_sitemaps WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 04: RSS / ATOM / JSON SYNDICATION FEEDS ================= */
async function handleFeeds(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const fmt = (url.searchParams.get('feed_format') || '').trim();
    const where = fmt && SEO_FEED_FORMATS.includes(fmt) ? `WHERE feed_format = ?` : '';
    const binds = where ? [fmt] : [];
    const { results } = await db.prepare(`SELECT * FROM seo_syndication_feeds ${where} ORDER BY feed_slug ASC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 16000);
    const errors = {};
    const slug = cleanStr(body.feed_slug || '', 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const titleEn = sanitizeSeoText(body.title_en || '', 160);
    if (!slug) errors.feed_slug = 'feed_slug is required';
    if (!titleEn) errors.title_en = 'title_en is required';
    const fmt = pick(body.feed_format, SEO_FEED_FORMATS, 'feed_format', errors, 'rss_2_0');
    const src = pick(body.portal_source, SEO_FEED_SOURCES, 'portal_source', errors, 'all');
    const lang = pick(body.language_mode, SEO_LANG_MODES, 'language_mode', errors, 'bilingual');
    const st = pick(body.feed_status, SEO_FEED_STATUSES, 'feed_status', errors, 'active_live');
    if (Object.keys(errors).length) throw validationError(errors);

    const maxItems = Math.min(100, Math.max(10, Number(body.max_items || 30) || 30));
    const newId = rid('seo-fd');
    await db.prepare(
      `INSERT INTO seo_syndication_feeds (id, feed_slug, feed_format, portal_source, title_en, title_or, description_en, description_or, language_mode, max_items, cache_ttl_sec, feed_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, slug, fmt, src, titleEn, sanitizeSeoText(body.title_or || '', 200),
      sanitizeSeoText(body.description_en || '', 260), sanitizeSeoText(body.description_or || '', 280),
      lang, maxItems, Math.max(60, Number(body.cache_ttl_sec || 300) || 300), st
    ).run();

    await snapshotSeoRevision(db, '04', newId, actor, 'create syndication feed');
    await audit(env, request, actor, 'seo.feed.create', 'seo_syndication_feeds', newId, { feed_slug: slug });
    const created = await db.prepare(`SELECT * FROM seo_syndication_feeds WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_syndication_feeds WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Feed not found');
    const body = await readJson(request, 16000);
    const errors = {};
    const fmt = body.feed_format !== undefined ? pick(body.feed_format, SEO_FEED_FORMATS, 'feed_format', errors, ex.feed_format) : ex.feed_format;
    const src = body.portal_source !== undefined ? pick(body.portal_source, SEO_FEED_SOURCES, 'portal_source', errors, ex.portal_source) : ex.portal_source;
    const lang = body.language_mode !== undefined ? pick(body.language_mode, SEO_LANG_MODES, 'language_mode', errors, ex.language_mode) : ex.language_mode;
    const st = body.feed_status !== undefined ? pick(body.feed_status, SEO_FEED_STATUSES, 'feed_status', errors, ex.feed_status) : ex.feed_status;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotSeoRevision(db, '04', sub, actor, 'update syndication feed');
    await db.prepare(
      `UPDATE seo_syndication_feeds
       SET feed_format = ?, portal_source = ?, title_en = ?, title_or = ?, description_en = ?, description_or = ?,
           language_mode = ?, max_items = ?, cache_ttl_sec = ?, feed_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      fmt, src,
      body.title_en !== undefined ? sanitizeSeoText(body.title_en, 160) : ex.title_en,
      body.title_or !== undefined ? sanitizeSeoText(body.title_or, 200) : ex.title_or,
      body.description_en !== undefined ? sanitizeSeoText(body.description_en, 260) : ex.description_en,
      body.description_or !== undefined ? sanitizeSeoText(body.description_or, 280) : ex.description_or,
      lang,
      body.max_items !== undefined ? Math.min(100, Math.max(10, Number(body.max_items || 30))) : ex.max_items,
      body.cache_ttl_sec !== undefined ? Math.max(60, Number(body.cache_ttl_sec || 300)) : ex.cache_ttl_sec,
      st, sub
    ).run();
    await audit(env, request, actor, 'seo.feed.update', 'seo_syndication_feeds', sub, {});
    const updated = await db.prepare(`SELECT * FROM seo_syndication_feeds WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_syndication_feeds WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Feed not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.feed_status, SEO_FEED_STATUSES, 'feed_status', errors, ex.feed_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotSeoRevision(db, '04', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE seo_syndication_feeds SET feed_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    const updated = await db.prepare(`SELECT * FROM seo_syndication_feeds WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotSeoRevision(db, '04', sub, actor, 'archive feed');
    await db.prepare(`UPDATE seo_syndication_feeds SET feed_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, feed_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleSeoRevisions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const modCode = (url.searchParams.get('module_code') || '').trim();
    const entityId = (url.searchParams.get('entity_id') || '').trim();
    const where = [];
    const binds = [];
    if (modCode) { where.push('module_code = ?'); binds.push(modCode); }
    if (entityId) { where.push('entity_id = ?'); binds.push(entityId); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM seo_revisions ${w} ORDER BY version_num DESC LIMIT 50`
    ).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = cleanStr(body.revision_id || '', 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM seo_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = SEO_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', `Rollback unsupported for module ${rev.module_code}`);
    const snap = parseJson(rev.snapshot_json, null);
    if (!snap) throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid revision snapshot');

    await snapshotSeoRevision(db, rev.module_code, rev.entity_id, actor, `pre-rollback to v${rev.version_num}`);
    const setCols = cfg.cols.filter(c => c in snap);
    const sets = setCols.map(c => `${c} = ?`).join(', ');
    await db.prepare(`UPDATE ${cfg.table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...setCols.map(c => snap[c]), rev.entity_id).run();
    await audit(env, request, actor, 'seo.revision.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    return json({ ok: true, module_code: rev.module_code, entity_id: rev.entity_id, restored_version: rev.version_num });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleSeoSearchDiscoveryBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureSeoSearchDiscoveryBatch1Schema(env.DB);
  let res = null;
  if (id === 'overview' && request.method === 'GET') res = json(await getSeoOverview(env.DB));
  else if (id === 'meta') res = await handleMeta(request, env, actor, sub, extra);
  else if (id === 'schemas') res = await handleSchemas(request, env, actor, sub);
  else if (id === 'sitemaps') res = await handleSitemaps(request, env, actor, sub, extra);
  else if (id === 'feeds') res = await handleFeeds(request, env, actor, sub, extra);
  else if (id === 'revisions') res = await handleSeoRevisions(request, env, actor, sub);
  else throw new HttpError(404, 'NOT_FOUND', 'Unknown SEO route');
  if (request.method !== 'GET' && request.method !== 'HEAD' && res && res.status >= 200 && res.status < 300) {
    await invalidateEdgePaths(request, SEO_PUBLIC_PATHS);
  }
  return res;
}

/* ================= PUBLIC EDGE-CACHED SEO & FEED ENDPOINTS ================= */
export async function handlePublicSeoMetaApi(request, env) {
  await ensureSeoSearchDiscoveryBatch1Schema(env.DB);
  const url = new URL(request.url);
  const route = cleanStr(url.searchParams.get('route') || '/', 160);
  const [meta, { results: schemas }] = await Promise.all([
    env.DB.prepare(`SELECT * FROM seo_meta_profiles WHERE route_pattern = ? AND status = 'active_live'`).bind(route).first(),
    env.DB.prepare(`SELECT schema_code, schema_type, schema_payload_json FROM seo_jsonld_schemas WHERE target_route_pattern = ? AND is_active = 1`).bind(route).all()
  ]);

  return new Response(JSON.stringify({
    route,
    meta: meta || null,
    jsonld_schemas: (schemas || []).map(s => parseJson(s.schema_payload_json, {}))
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120, s-maxage=300' }
  });
}

export async function handlePublicSeoSitemapApi(request, env, key) {
  await ensureSeoSearchDiscoveryBatch1Schema(env.DB);
  const cleanKey = cleanStr(key || 'sitemap-index', 80).replace(/\.xml$/i, '');
  const sm = await env.DB.prepare(`SELECT * FROM seo_xml_sitemaps WHERE sitemap_key = ? AND status = 'active'`).bind(cleanKey).first();
  if (!sm) return new Response('Sitemap Not Found', { status: 404 });
  const xml = await buildSitemapXml(env.DB, sm);
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=600' }
  });
}

export async function handlePublicSeoFeedApi(request, env, slug) {
  await ensureSeoSearchDiscoveryBatch1Schema(env.DB);
  const cleanSlug = cleanStr(slug || '', 80).replace(/\.(xml|rss|atom|json)$/i, '');
  const feed = await env.DB.prepare(`SELECT * FROM seo_syndication_feeds WHERE feed_slug = ? AND feed_status = 'active_live'`).bind(cleanSlug).first();
  if (!feed) return new Response('Feed Not Found', { status: 404 });

  const { results: metas } = await env.DB.prepare(
    `SELECT route_pattern, meta_title_en, meta_title_or, meta_description_en, meta_description_or, updated_at
     FROM seo_meta_profiles WHERE status = 'active_live' ORDER BY updated_at DESC LIMIT ?`
  ).bind(Math.min(100, Number(feed.max_items || 30))).all();

  const origin = 'https://csodisha.com';
  const items = (metas || []).map(m => ({
    url: `${origin}${m.route_pattern}`,
    title: feed.language_mode === 'or-IN' ? (m.meta_title_or || m.meta_title_en) : m.meta_title_en,
    description: feed.language_mode === 'or-IN' ? (m.meta_description_or || m.meta_description_en) : m.meta_description_en,
    updated_at: m.updated_at || new Date().toISOString()
  }));

  const cacheHdr = `public, max-age=${Number(feed.cache_ttl_sec || 300)}, s-maxage=${Number(feed.cache_ttl_sec || 300)}`;

  if (feed.feed_format === 'json_feed_1_1') {
    return new Response(JSON.stringify({
      version: 'https://jsonfeed.org/version/1.1',
      title: feed.title_en,
      home_page_url: origin,
      feed_url: `${origin}/api/seo/feed/${feed.feed_slug}`,
      description: feed.description_en,
      items: items.map(it => ({ id: it.url, url: it.url, title: it.title, summary: it.description, date_modified: it.updated_at }))
    }, null, 2), { status: 200, headers: { 'Content-Type': 'application/feed+json; charset=utf-8', 'Cache-Control': cacheHdr } });
  }

  if (feed.feed_format === 'atom_1_0') {
    const entries = items.map(it => (
      `  <entry>\n    <id>${escapeXml(it.url)}</id>\n    <title>${escapeXml(it.title)}</title>\n    <link href="${escapeXml(it.url)}" />\n    <updated>${escapeXml(it.updated_at)}</updated>\n    <summary>${escapeXml(it.description)}</summary>\n  </entry>`
    )).join('\n');
    const atom = `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <id>${escapeXml(`${origin}/api/seo/feed/${feed.feed_slug}`)}</id>\n  <title>${escapeXml(feed.title_en)}</title>\n  <subtitle>${escapeXml(feed.description_en)}</subtitle>\n  <updated>${escapeXml(new Date().toISOString())}</updated>\n${entries}\n</feed>`;
    return new Response(atom, { status: 200, headers: { 'Content-Type': 'application/atom+xml; charset=utf-8', 'Cache-Control': cacheHdr } });
  }

  const rssItems = items.map(it => (
    `    <item>\n      <title>${escapeXml(it.title)}</title>\n      <link>${escapeXml(it.url)}</link>\n      <guid>${escapeXml(it.url)}</guid>\n      <description>${escapeXml(it.description)}</description>\n    </item>`
  )).join('\n');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(feed.title_en)}</title>\n    <link>${escapeXml(origin)}</link>\n    <description>${escapeXml(feed.description_en)}</description>\n${rssItems}\n  </channel>\n</rss>`;
  return new Response(rss, { status: 200, headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': cacheHdr } });
}
