// SEO, Search & Discovery Batch 4 (v114): Modules 13-16
// 13 Rich Snippet Previewer | 14 Internal Link Graph | 15 Slug Transliterator | 16 Search Intent Analytics
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  SEO_REV_TABLES,
  sanitizeSeoText,
  snapshotSeoRevision
} from './seo-search-discovery-batch1.js';
import {
  ensureSeoSearchDiscoveryBatch3Schema,
  getFull12ModuleSeoOverview
} from './seo-search-discovery-batch3.js';

export const SEO_SCHEMA_BADGES = ['JobPosting', 'GovernmentService', 'Quiz', 'FAQPage', 'Article'];
export const SEO_OG_READINESS = ['optimal_ready', 'title_truncated', 'missing_og_image'];
export const SEO_NODE_STATUSES = ['healthy_connected', 'orphan_detected', 'linked_to_hub', 'ignored_archive'];
export const SEO_SCRIPT_FAMILIES = ['odia_unicode', 'cyrillic_unicode', 'devanagari_unicode', 'latin_diacritics'];
export const SEO_INTENT_BUCKETS = [
  'exam_syllabus_pyq', 'job_notification_apply', 'welfare_scheme_eligibility', 'mock_test_practice', 'navigational_portal'
];
export const SEO_LANG_SCRIPTS = ['en', 'or', 'mixed_bilingual'];
export const SEO_TRENDS = ['rising', 'steady', 'seasonal_peak'];

const _seo4Ready = new WeakSet();

export function registerBatch4RevisionTables() {
  SEO_REV_TABLES['13'] = {
    table: 'seo_rich_snippet_snapshots',
    cols: ['snapshot_code', 'target_url', 'portal_section', 'title_en', 'title_or', 'description_en', 'description_or', 'og_image_url', 'schema_badge_type', 'breadcrumb_trail', 'serp_pixel_width_est', 'og_card_readiness']
  };
  SEO_REV_TABLES['14'] = {
    table: 'seo_internal_link_nodes',
    cols: ['node_path', 'page_title_en', 'portal_section', 'inbound_links_count', 'outbound_links_count', 'click_depth_from_home', 'link_equity_score', 'is_orphan_node', 'recommended_parent_hub', 'resolution_status']
  };
  SEO_REV_TABLES['15'] = {
    table: 'seo_slug_transliteration_rules',
    cols: ['rule_code', 'script_family', 'source_sample', 'normalized_slug', 'strip_stopwords', 'max_slug_length', 'enforce_lowercase_ascii', 'usage_count', 'is_active']
  };
  SEO_REV_TABLES['16'] = {
    table: 'seo_search_intent_metrics',
    cols: ['intent_code', 'query_cluster', 'intent_bucket', 'lang_script', 'impressions_30d', 'search_clicks_30d', 'ctr_pct', 'avg_result_rank_x10', 'zero_result_rate_pct', 'trend_direction']
  };
}
registerBatch4RevisionTables();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

/* ================= DETERMINISTIC ODIA & CYRILLIC TRANSLITERATION ================= */
const ODIA_INDEP_VOWELS = {
  'ଅ': 'a', 'ଆ': 'aa', 'ଇ': 'i', 'ଈ': 'i', 'ଉ': 'u', 'ଊ': 'u', 'ଋ': 'ri',
  'ଏ': 'e', 'ଐ': 'ai', 'ଓ': 'o', 'ଔ': 'au'
};
const ODIA_CONSONANTS = {
  'କ': 'k', 'ଖ': 'kh', 'ଗ': 'g', 'ଘ': 'gh', 'ଙ': 'ng',
  'ଚ': 'ch', 'ଛ': 'chh', 'ଜ': 'j', 'ଝ': 'jh', 'ଞ': 'ny',
  'ଟ': 't', 'ଠ': 'th', 'ଡ': 'd', 'ଢ': 'dh', 'ଣ': 'n',
  'ତ': 't', 'ଥ': 'th', 'ଦ': 'd', 'ଧ': 'dh', 'ନ': 'n',
  'ପ': 'p', 'ଫ': 'ph', 'ବ': 'b', 'ଭ': 'bh', 'ମ': 'm',
  'ଯ': 'j', 'ର': 'r', 'ଲ': 'l', 'ଳ': 'l', 'ଵ': 'v',
  'ଶ': 'sh', 'ଷ': 'sh', 'ସ': 's', 'ହ': 'h',
  'ଡ଼': 'd', 'ଢ଼': 'dh', 'ୟ': 'y', 'ୱ': 'w', 'କ୍ଷ': 'ksh'
};
const ODIA_MATRAS = {
  'ା': 'a', 'ି': 'i', 'ୀ': 'i', 'ୁ': 'u', 'ୂ': 'u', 'ୃ': 'ri',
  'େ': 'e', 'ୈ': 'ai', 'ୋ': 'o', 'ୌ': 'au'
};
const ODIA_SIGNS = { 'ଂ': 'm', 'ଃ': 'h', 'ଁ': 'n', '୍': '' };
const ODIA_DIGITS = { '୦': '0', '୧': '1', '୨': '2', '୩': '3', '୪': '4', '୫': '5', '୬': '6', '୭': '7', '୮': '8', '୯': '9' };

const CYRILLIC_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
  'я': 'ya', 'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g'
};

const SLUG_STOPWORDS = new Set(['and', 'or', 'the', 'of', 'in', 'for', 'to', 'a', 'an', 'ebam', 'o', 'ra', 'ku', 're']);

export function detectScriptFamily(text) {
  const s = String(text || '');
  if (/[\u0B00-\u0B7F]/.test(s)) return 'odia_unicode';
  if (/[\u0400-\u04FF]/.test(s)) return 'cyrillic_unicode';
  if (/[\u0900-\u097F]/.test(s)) return 'devanagari_unicode';
  return 'latin_diacritics';
}

export function transliterateToAsciiSlug(input, opts = {}) {
  const maxLen = Math.min(120, Math.max(40, Number(opts.max_slug_length || 80)));
  const stripStop = opts.strip_stopwords !== false && opts.strip_stopwords !== 0;
  const lower = opts.enforce_lowercase_ascii !== false && opts.enforce_lowercase_ascii !== 0;
  const raw = sanitizeSeoText(input || '', 260).normalize('NFC');
  const chars = Array.from(raw);
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1] || '';

    if (ODIA_DIGITS[ch] !== undefined) { out += ODIA_DIGITS[ch]; continue; }
    if (ODIA_INDEP_VOWELS[ch] !== undefined) { out += ODIA_INDEP_VOWELS[ch]; continue; }
    if (ODIA_CONSONANTS[ch] !== undefined) {
      out += ODIA_CONSONANTS[ch];
      if (next === '୍') { i++; } // halant suppresses inherent vowel
      else if (ODIA_MATRAS[next] !== undefined) { out += ODIA_MATRAS[next]; i++; }
      else if (next && !/[\s\-_,.;:!?]/.test(next) && ODIA_SIGNS[next] === undefined) {
        out += 'a'; // inherent schwa inside word
      }
      continue;
    }
    if (ODIA_MATRAS[ch] !== undefined) { out += ODIA_MATRAS[ch]; continue; }
    if (ODIA_SIGNS[ch] !== undefined) { out += ODIA_SIGNS[ch]; continue; }

    const low = ch.toLowerCase();
    if (CYRILLIC_MAP[low] !== undefined) { out += CYRILLIC_MAP[low]; continue; }

    // Accented Latin -> ASCII
    const ascii = ch.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    out += ascii;
  }

  let slug = (lower ? out.toLowerCase() : out)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (stripStop) {
    const parts = slug.split('-').filter(p => p && !SLUG_STOPWORDS.has(p.toLowerCase()));
    if (parts.length) slug = parts.join('-');
  }

  if (slug.length > maxLen) {
    slug = slug.slice(0, maxLen).replace(/-+$/g, '');
  }
  return slug;
}

/* ================= RICH SNIPPET SIMULATOR ================= */
export function simulateRichSnippet({ title_en = '', description_en = '', og_image_url = '', target_url = 'https://csodisha.com/', schema_badge_type = 'Article' }) {
  const title = sanitizeSeoText(title_en, 160);
  const desc = sanitizeSeoText(description_en, 280);
  const img = cleanStr(og_image_url, 300);
  const serpPx = Math.round(title.length * 9.2);
  let readiness = 'optimal_ready';
  if (!img) readiness = 'missing_og_image';
  else if (serpPx > 580 || title.length > 62) readiness = 'title_truncated';

  let trail = 'csodisha.com';
  try {
    const u = new URL(target_url.startsWith('http') ? target_url : `https://csodisha.com${target_url}`);
    const segs = u.pathname.split('/').filter(Boolean);
    trail = [u.hostname, ...segs].join(' › ');
  } catch { /* fallback */ }

  return {
    title_en: title,
    description_en: desc,
    og_image_url: img,
    schema_badge_type,
    breadcrumb_trail: trail,
    serp_pixel_width_est: serpPx,
    og_card_readiness: readiness,
    platforms: {
      google_serp: {
        title: title.length > 60 ? title.slice(0, 57) + '...' : title,
        breadcrumb: trail,
        description: desc.length > 160 ? desc.slice(0, 157) + '...' : desc,
        badge: schema_badge_type
      },
      whatsapp: { title, description: desc.slice(0, 120), image: img, domain: 'csodisha.com' },
      telegram: { site_name: 'Common Sense Odisha', title, description: desc, image: img },
      x_card: { card: img ? 'summary_large_image' : 'summary', title, description: desc.slice(0, 140), image: img }
    }
  };
}

export async function ensureSeoSearchDiscoveryBatch4Schema(db) {
  await ensureSeoSearchDiscoveryBatch3Schema(db);
  registerBatch4RevisionTables();
  if (_seo4Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS seo_rich_snippet_snapshots (
      id TEXT PRIMARY KEY,
      snapshot_code TEXT NOT NULL UNIQUE,
      target_url TEXT NOT NULL,
      portal_section TEXT NOT NULL DEFAULT 'home',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      og_image_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/brand/cso-og-default.png',
      schema_badge_type TEXT NOT NULL DEFAULT 'Article' CHECK (schema_badge_type IN ('JobPosting', 'GovernmentService', 'Quiz', 'FAQPage', 'Article')),
      breadcrumb_trail TEXT NOT NULL DEFAULT '',
      serp_pixel_width_est INTEGER NOT NULL DEFAULT 0,
      og_card_readiness TEXT NOT NULL DEFAULT 'optimal_ready' CHECK (og_card_readiness IN ('optimal_ready', 'title_truncated', 'missing_og_image')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_snp_portal ON seo_rich_snippet_snapshots(portal_section, og_card_readiness)`,
    `CREATE TABLE IF NOT EXISTS seo_internal_link_nodes (
      id TEXT PRIMARY KEY,
      node_path TEXT NOT NULL UNIQUE,
      page_title_en TEXT NOT NULL,
      portal_section TEXT NOT NULL DEFAULT 'home',
      inbound_links_count INTEGER NOT NULL DEFAULT 0,
      outbound_links_count INTEGER NOT NULL DEFAULT 0,
      click_depth_from_home INTEGER NOT NULL DEFAULT 1,
      link_equity_score INTEGER NOT NULL DEFAULT 50,
      is_orphan_node INTEGER NOT NULL DEFAULT 0,
      recommended_parent_hub TEXT NOT NULL DEFAULT '/',
      resolution_status TEXT NOT NULL DEFAULT 'healthy_connected' CHECK (resolution_status IN ('healthy_connected', 'orphan_detected', 'linked_to_hub', 'ignored_archive')),
      last_scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_nodes_status ON seo_internal_link_nodes(resolution_status, is_orphan_node)`,
    `CREATE TABLE IF NOT EXISTS seo_slug_transliteration_rules (
      id TEXT PRIMARY KEY,
      rule_code TEXT NOT NULL UNIQUE,
      script_family TEXT NOT NULL DEFAULT 'odia_unicode' CHECK (script_family IN ('odia_unicode', 'cyrillic_unicode', 'devanagari_unicode', 'latin_diacritics')),
      source_sample TEXT NOT NULL,
      normalized_slug TEXT NOT NULL,
      strip_stopwords INTEGER NOT NULL DEFAULT 1,
      max_slug_length INTEGER NOT NULL DEFAULT 80,
      enforce_lowercase_ascii INTEGER NOT NULL DEFAULT 1,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_trn_family ON seo_slug_transliteration_rules(script_family, is_active)`,
    `CREATE TABLE IF NOT EXISTS seo_search_intent_metrics (
      id TEXT PRIMARY KEY,
      intent_code TEXT NOT NULL UNIQUE,
      query_cluster TEXT NOT NULL,
      intent_bucket TEXT NOT NULL DEFAULT 'exam_syllabus_pyq' CHECK (intent_bucket IN ('exam_syllabus_pyq', 'job_notification_apply', 'welfare_scheme_eligibility', 'mock_test_practice', 'navigational_portal')),
      lang_script TEXT NOT NULL DEFAULT 'mixed_bilingual' CHECK (lang_script IN ('en', 'or', 'mixed_bilingual')),
      impressions_30d INTEGER NOT NULL DEFAULT 0,
      search_clicks_30d INTEGER NOT NULL DEFAULT 0,
      ctr_pct INTEGER NOT NULL DEFAULT 0,
      avg_result_rank_x10 INTEGER NOT NULL DEFAULT 15,
      zero_result_rate_pct INTEGER NOT NULL DEFAULT 0,
      trend_direction TEXT NOT NULL DEFAULT 'steady' CHECK (trend_direction IN ('rising', 'steady', 'seasonal_peak')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_int_bucket ON seo_search_intent_metrics(intent_bucket, lang_script)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 13: Rich Snippet Snapshots
  const snpCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_rich_snippet_snapshots`).first();
  if (Number(snpCnt?.n || 0) === 0) {
    const snaps = [
      ['seo-snp-01', 'SNP-2026-0001', 'https://csodisha.com/jobs-careers/opsc-oas-2026/', 'jobs-careers', 'OPSC OAS 2026 Notification, Syllabus & PYQs', 'OPSC OAS ୨୦୨୬ ବିଜ୍ଞପ୍ତି ଏବଂ ସିଲାବସ୍', 'Complete OPSC Odisha Civil Services 2026 notification, eligibility, syllabus PDF & solved PYQs.', 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସ୍ ୨୦୨୬ ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।', 'https://csodisha.com/assets/brand/cso-og-jobs.png', 'JobPosting'],
      ['seo-snp-02', 'SNP-2026-0002', 'https://csodisha.com/schemes/subhadra-yojana/', 'schemes', 'Subhadra Yojana Odisha Eligibility & Apply Guide', 'ସୁଭଦ୍ରା ଯୋଜନା ଯୋଗ୍ୟତା ଏବଂ ଆବେଦନ', 'Check Odisha Subhadra Yojana ₹50,000 assistance eligibility, Aadhaar e-KYC & installment status.', 'ଓଡ଼ିଶା ସୁଭଦ୍ରା ଯୋଜନା ୫୦,୦୦୦ ଟଙ୍କା ସହାୟତା।', 'https://csodisha.com/assets/brand/cso-og-schemes.png', 'GovernmentService'],
      ['seo-snp-03', 'SNP-2026-0003', 'https://csodisha.com/study-library/', 'study-library', 'CS Odisha Free Study Library & Mock Tests', 'CS ଓଡ଼ିଶା ମାଗଣା ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ', 'Download bilingual Odia & English notes, OPSC/OSSC/OSSSC PYQs, and UGC NET mock tests.', 'ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀ ନୋଟ୍ସ ଡାଉନଲୋଡ୍ କରନ୍ତୁ।', 'https://csodisha.com/assets/brand/cso-og-study.png', 'Quiz']
    ];
    for (const s of snaps) {
      const sim = simulateRichSnippet({ title_en: s[4], description_en: s[6], og_image_url: s[8], target_url: s[2], schema_badge_type: s[9] });
      await db.prepare(
        `INSERT INTO seo_rich_snippet_snapshots (id, snapshot_code, target_url, portal_section, title_en, title_or, description_en, description_or, og_image_url, schema_badge_type, breadcrumb_trail, serp_pixel_width_est, og_card_readiness)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], sim.breadcrumb_trail, sim.serp_pixel_width_est, sim.og_card_readiness).run();
    }
  }

  // Seed Module 14: Internal Link Graph & Orphan Nodes
  const nodeCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_internal_link_nodes`).first();
  if (Number(nodeCnt?.n || 0) === 0) {
    const nodes = [
      ['seo-nod-01', '/', 'Common Sense Odisha Home', 'home', 48, 24, 0, 98, 0, '/', 'healthy_connected'],
      ['seo-nod-02', '/study-library/', 'Study Library & PYQs', 'study-library', 22, 18, 1, 88, 0, '/', 'healthy_connected'],
      ['seo-nod-03', '/jobs-careers/', 'Odisha Govt Jobs & Careers', 'jobs-careers', 26, 20, 1, 90, 0, '/', 'healthy_connected'],
      ['seo-nod-04', '/schemes/', 'Odisha Welfare Schemes', 'schemes', 19, 15, 1, 85, 0, '/', 'healthy_connected'],
      ['seo-nod-05', '/educational-tools/', 'Educational Tools & Calculators', 'educational-tools', 12, 10, 1, 76, 0, '/', 'healthy_connected'],
      ['seo-nod-06', '/community/', 'Student Community & Discussions', 'community', 14, 11, 1, 79, 0, '/', 'healthy_connected'],
      ['seo-nod-07', '/study-library/archive-2024-draft/', 'Odisha 2024 Archived PYQ Draft', 'study-library', 0, 2, 3, 18, 1, '/study-library/', 'orphan_detected']
    ];
    for (const n of nodes) {
      await db.prepare(
        `INSERT INTO seo_internal_link_nodes (id, node_path, page_title_en, portal_section, inbound_links_count, outbound_links_count, click_depth_from_home, link_equity_score, is_orphan_node, recommended_parent_hub, resolution_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...n).run();
    }
  }

  // Seed Module 15: URL Slug Transliteration Rules
  const trnCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_slug_transliteration_rules`).first();
  if (Number(trnCnt?.n || 0) === 0) {
    const rules = [
      ['seo-trn-01', 'TRN-001', 'odia_unicode', 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ ୨୦୨୬', 'odisha-lokaseba-ayoga-2026', 1, 80, 1, 312],
      ['seo-trn-02', 'TRN-002', 'odia_unicode', 'ବାଲେଶ୍ୱର ଜିଲ୍ଲା ଶିକ୍ଷା', 'baleshwar-jilla-shikhya', 1, 80, 1, 184],
      ['seo-trn-03', 'TRN-003', 'cyrillic_unicode', 'Одиша Образование 2026', 'odisha-obrazovanie-2026', 1, 80, 1, 42],
      ['seo-trn-04', 'TRN-004', 'latin_diacritics', 'Odisha Résumé & Syllabus Guide', 'odisha-resume-syllabus-guide', 1, 80, 1, 205]
    ];
    for (const r of rules) {
      await db.prepare(
        `INSERT INTO seo_slug_transliteration_rules (id, rule_code, script_family, source_sample, normalized_slug, strip_stopwords, max_slug_length, enforce_lowercase_ascii, usage_count, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(...r).run();
    }
  }

  // Seed Module 16: Search Intent Analytics
  const intCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_search_intent_metrics`).first();
  if (Number(intCnt?.n || 0) === 0) {
    const intents = [
      ['seo-int-01', 'INT-2026-0001', 'OPSC OAS Syllabus & PYQ', 'exam_syllabus_pyq', 'mixed_bilingual', 42800, 6100, 1425, 14, 2, 'rising'],
      ['seo-int-02', 'INT-2026-0002', 'Subhadra Yojana Status & Eligibility', 'welfare_scheme_eligibility', 'or', 58400, 9240, 1582, 12, 1, 'seasonal_peak'],
      ['seo-int-03', 'INT-2026-0003', 'OSSC CGL Mock Test', 'mock_test_practice', 'en', 29500, 3890, 1319, 17, 3, 'rising'],
      ['seo-int-04', 'INT-2026-0004', 'OSSSC RI ARI Amin Apply Online', 'job_notification_apply', 'mixed_bilingual', 36200, 5140, 1420, 15, 2, 'steady'],
      ['seo-int-05', 'INT-2026-0005', 'UGC NET English Notes', 'exam_syllabus_pyq', 'en', 18400, 2110, 1147, 21, 4, 'steady']
    ];
    for (const m of intents) {
      await db.prepare(
        `INSERT INTO seo_search_intent_metrics (id, intent_code, query_cluster, intent_bucket, lang_script, impressions_30d, search_clicks_30d, ctr_pct, avg_result_rank_x10, zero_result_rate_pct, trend_direction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...m).run();
    }
  }

  _seo4Ready.add(db);
}

/* ================= FULL 16-MODULE SUITE OVERVIEW ================= */
export async function getFull16ModuleSeoOverview(envOrDb) {
  const db = envOrDb?.DB || envOrDb;
  await ensureSeoSearchDiscoveryBatch4Schema(db);
  const base = await getFull12ModuleSeoOverview(db);

  const [snpTot, orphCnt, nodTot, trnAct, trnTot, intTot, intSum] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM seo_rich_snippet_snapshots`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_internal_link_nodes WHERE is_orphan_node = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_internal_link_nodes`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_slug_transliteration_rules WHERE is_active = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_slug_transliteration_rules`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_search_intent_metrics`).first(),
    db.prepare(`SELECT COALESCE(SUM(impressions_30d), 0) AS imp, COALESCE(SUM(search_clicks_30d), 0) AS clk FROM seo_search_intent_metrics`).first()
  ]);

  base.modules['13'] = { status: 'active', count: Number(snpTot?.n || 0) };
  base.modules['14'] = { status: 'active', count: Number(nodTot?.n || 0) };
  base.modules['15'] = { status: 'active', count: Number(trnTot?.n || 0) };
  base.modules['16'] = { status: 'active', count: Number(intTot?.n || 0) };

  const imp = Number(intSum?.imp || 0);
  const clk = Number(intSum?.clk || 0);
  const blendedCtrPct = imp > 0 ? Number(((clk / imp) * 100).toFixed(2)) : 0;

  const activeModulesCount = Object.values(base.modules).filter(m => m.status === 'active').length;

  return {
    ...base,
    rich_snippet_snapshots: Number(snpTot?.n || 0),
    orphan_nodes_detected: Number(orphCnt?.n || 0),
    slug_transliteration_rules: Number(trnAct?.n || 0),
    blended_search_ctr_pct: blendedCtrPct,
    suite_16: {
      total_modules: 16,
      active_modules: activeModulesCount,
      active_meta_profiles: base.active_meta_profiles,
      avg_seo_score: base.avg_seo_score,
      valid_jsonld_schemas: base.valid_jsonld_schemas,
      total_indexed_sitemap_urls: base.total_indexed_sitemap_urls,
      active_syndication_feeds: base.active_syndication_feeds,
      active_redirects_canonicals: base.active_redirects_canonicals,
      active_robots_rules: base.active_robots_rules,
      active_search_indexes: base.active_search_indexes,
      active_synonym_clusters: base.active_synonym_clusters,
      active_autocomplete_rules: base.active_autocomplete_rules,
      active_zero_result_fallbacks: base.active_zero_result_fallbacks,
      indexnow_urls_pinged: base.indexnow_urls_pinged,
      active_edge_prerender_hints: base.active_edge_prerender_hints,
      rich_snippet_snapshots: Number(snpTot?.n || 0),
      orphan_nodes_detected: Number(orphCnt?.n || 0),
      slug_transliteration_rules: Number(trnAct?.n || 0),
      blended_search_ctr_pct: blendedCtrPct
    }
  };
}

/* ================= MODULE 13: RICH SNIPPET PREVIEWER ================= */
async function handleRichSnippets(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM seo_rich_snippet_snapshots ORDER BY updated_at DESC`).all();
    return json({ items: results || [] });
  }

  if (sub === 'simulate' && method === 'POST') {
    const body = await readJson(request, 12000);
    if (!body.title_en || !String(body.title_en).trim()) throw validationError({ title_en: 'title_en is required' });
    const sim = simulateRichSnippet(body);
    return json({ simulation: sim });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const targetUrl = sanitizeSeoText(body.target_url || '', 240);
    const titleEn = sanitizeSeoText(body.title_en || '', 160);
    const badge = pick(body.schema_badge_type, SEO_SCHEMA_BADGES, 'schema_badge_type', errors, 'Article');
    if (!targetUrl) errors.target_url = 'target_url is required';
    if (!titleEn) errors.title_en = 'title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const sim = simulateRichSnippet({ ...body, target_url: targetUrl, title_en: titleEn, schema_badge_type: badge });
    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_rich_snippet_snapshots`).first();
    const code = sanitizeSeoText(body.snapshot_code || '', 40) || `SNP-2026-${String(Number(cnt?.n || 0) + 1).padStart(4, '0')}`;
    const id = rid('seo-snp');

    await db.prepare(
      `INSERT INTO seo_rich_snippet_snapshots (id, snapshot_code, target_url, portal_section, title_en, title_or, description_en, description_or, og_image_url, schema_badge_type, breadcrumb_trail, serp_pixel_width_est, og_card_readiness)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, code, targetUrl, cleanStr(body.portal_section || 'home', 60),
      sim.title_en, sanitizeSeoText(body.title_or || '', 180),
      sim.description_en, sanitizeSeoText(body.description_or || '', 260),
      sim.og_image_url, badge, sim.breadcrumb_trail, sim.serp_pixel_width_est, sim.og_card_readiness
    ).run();
    await snapshotSeoRevision(db, '13', id, actor, 'create rich snippet snapshot');
    await audit(env, request, actor, 'seo.richsnippet.create', 'seo_rich_snippet_snapshots', id, { target_url: targetUrl });
    const created = await db.prepare(`SELECT * FROM seo_rich_snippet_snapshots WHERE id = ?`).bind(id).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_rich_snippet_snapshots WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Rich snippet snapshot not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const badge = body.schema_badge_type !== undefined ? pick(body.schema_badge_type, SEO_SCHEMA_BADGES, 'schema_badge_type', errors, ex.schema_badge_type) : ex.schema_badge_type;
    if (Object.keys(errors).length) throw validationError(errors);
    const sim = simulateRichSnippet({
      title_en: body.title_en !== undefined ? body.title_en : ex.title_en,
      description_en: body.description_en !== undefined ? body.description_en : ex.description_en,
      og_image_url: body.og_image_url !== undefined ? body.og_image_url : ex.og_image_url,
      target_url: body.target_url !== undefined ? body.target_url : ex.target_url,
      schema_badge_type: badge
    });
    await snapshotSeoRevision(db, '13', sub, actor, 'update rich snippet snapshot');
    await db.prepare(
      `UPDATE seo_rich_snippet_snapshots
       SET title_en = ?, title_or = ?, description_en = ?, description_or = ?, og_image_url = ?, schema_badge_type = ?,
           breadcrumb_trail = ?, serp_pixel_width_est = ?, og_card_readiness = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      sim.title_en, body.title_or !== undefined ? sanitizeSeoText(body.title_or, 180) : ex.title_or,
      sim.description_en, body.description_or !== undefined ? sanitizeSeoText(body.description_or, 260) : ex.description_or,
      sim.og_image_url, badge, sim.breadcrumb_trail, sim.serp_pixel_width_est, sim.og_card_readiness, sub
    ).run();
    const updated = await db.prepare(`SELECT * FROM seo_rich_snippet_snapshots WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && method === 'DELETE') {
    const ex = await db.prepare(`SELECT * FROM seo_rich_snippet_snapshots WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Rich snippet snapshot not found');
    await snapshotSeoRevision(db, '13', sub, actor, 'delete rich snippet snapshot');
    await db.prepare(`DELETE FROM seo_rich_snippet_snapshots WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 14: INTERNAL LINK GRAPH & ORPHANS ================= */
async function handleLinkGraph(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const st = (url.searchParams.get('resolution_status') || '').trim();
    const sec = (url.searchParams.get('portal_section') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (st) { where.push('resolution_status = ?'); binds.push(st); }
    if (sec) { where.push('portal_section = ?'); binds.push(sec); }
    if (q) {
      const pat = `%${likeEscape(q)}%`;
      where.push(`(node_path LIKE ? ESCAPE '\\' OR page_title_en LIKE ? ESCAPE '\\')`);
      binds.push(pat, pat);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM seo_internal_link_nodes ${w} ORDER BY is_orphan_node DESC, link_equity_score DESC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'scan' && method === 'POST') {
    const { results: nodes } = await db.prepare(`SELECT * FROM seo_internal_link_nodes`).all();
    let orphanCount = 0;
    for (const n of nodes || []) {
      const isOrphan = Number(n.inbound_links_count || 0) === 0 && n.node_path !== '/' ? 1 : 0;
      if (isOrphan) orphanCount++;
      const equity = Math.min(100, Math.max(10, Number(n.inbound_links_count || 0) * 4 + Number(n.outbound_links_count || 0) * 2 + (n.node_path === '/' ? 50 : 20)));
      const nextStatus = isOrphan ? 'orphan_detected' : (n.resolution_status === 'orphan_detected' ? 'healthy_connected' : n.resolution_status);
      await db.prepare(
        `UPDATE seo_internal_link_nodes SET is_orphan_node = ?, link_equity_score = ?, resolution_status = ?, last_scanned_at = datetime('now') WHERE id = ?`
      ).bind(isOrphan, equity, nextStatus, n.id).run();
    }
    await audit(env, request, actor, 'seo.linkgraph.scan', 'seo_internal_link_nodes', 'all', { scanned: (nodes || []).length, orphan_count: orphanCount });
    return json({ ok: true, scanned_count: (nodes || []).length, orphan_count: orphanCount });
  }

  if (sub && extra === 'link-hub' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_internal_link_nodes WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Link node not found');
    const body = await readJson(request, 6000).catch(() => ({}));
    const hub = sanitizeSeoText(body.parent_hub || ex.recommended_parent_hub || '/', 160);
    await snapshotSeoRevision(db, '14', sub, actor, `link to hub ${hub}`);
    const nextInbound = Math.max(1, Number(ex.inbound_links_count || 0) + 1);
    const nextEquity = Math.min(100, Math.max(45, Number(ex.link_equity_score || 20) + 30));
    await db.prepare(
      `UPDATE seo_internal_link_nodes
       SET inbound_links_count = ?, is_orphan_node = 0, recommended_parent_hub = ?, link_equity_score = ?,
           resolution_status = 'linked_to_hub', last_scanned_at = datetime('now')
       WHERE id = ?`
    ).bind(nextInbound, hub, nextEquity, sub).run();
    await audit(env, request, actor, 'seo.linkgraph.link_hub', 'seo_internal_link_nodes', sub, { parent_hub: hub });
    const updated = await db.prepare(`SELECT * FROM seo_internal_link_nodes WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 15: URL SLUG NORMALIZER & TRANSLITERATOR ================= */
async function handleSlugNormalizer(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM seo_slug_transliteration_rules ORDER BY usage_count DESC, rule_code ASC`).all();
    return json({ items: results || [] });
  }

  if (sub === 'transliterate' && method === 'POST') {
    const body = await readJson(request, 8000);
    const text = String(body.source_text || '');
    if (!text.trim()) throw validationError({ source_text: 'source_text is required' });
    const slug = transliterateToAsciiSlug(text, body);
    return json({
      source_text: text,
      script_family: detectScriptFamily(text),
      normalized_slug: slug
    });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 10000);
    const errors = {};
    const sample = sanitizeSeoText(body.source_sample || '', 220);
    if (!sample) errors.source_sample = 'source_sample is required';
    const fam = pick(body.script_family, SEO_SCRIPT_FAMILIES, 'script_family', errors, detectScriptFamily(sample));
    if (Object.keys(errors).length) throw validationError(errors);

    const slug = body.normalized_slug ? transliterateToAsciiSlug(body.normalized_slug, body) : transliterateToAsciiSlug(sample, body);
    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_slug_transliteration_rules`).first();
    const code = sanitizeSeoText(body.rule_code || '', 40) || `TRN-${String(Number(cnt?.n || 0) + 1).padStart(3, '0')}`;
    const id = rid('seo-trn');

    await db.prepare(
      `INSERT INTO seo_slug_transliteration_rules (id, rule_code, script_family, source_sample, normalized_slug, strip_stopwords, max_slug_length, enforce_lowercase_ascii, usage_count, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`
    ).bind(
      id, code, fam, sample, slug,
      body.strip_stopwords === false || body.strip_stopwords === 0 ? 0 : 1,
      Math.min(120, Math.max(40, Number(body.max_slug_length || 80))),
      body.enforce_lowercase_ascii === false || body.enforce_lowercase_ascii === 0 ? 0 : 1
    ).run();
    await snapshotSeoRevision(db, '15', id, actor, 'create slug transliteration rule');
    const created = await db.prepare(`SELECT * FROM seo_slug_transliteration_rules WHERE id = ?`).bind(id).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_slug_transliteration_rules WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Transliteration rule not found');
    const body = await readJson(request, 10000);
    const sample = body.source_sample !== undefined ? sanitizeSeoText(body.source_sample, 220) : ex.source_sample;
    const maxLen = body.max_slug_length !== undefined ? Math.min(120, Math.max(40, Number(body.max_slug_length))) : ex.max_slug_length;
    const stripStop = body.strip_stopwords !== undefined ? (body.strip_stopwords ? 1 : 0) : ex.strip_stopwords;
    const slug = body.normalized_slug !== undefined
      ? transliterateToAsciiSlug(body.normalized_slug, { max_slug_length: maxLen, strip_stopwords: stripStop })
      : transliterateToAsciiSlug(sample, { max_slug_length: maxLen, strip_stopwords: stripStop });
    await snapshotSeoRevision(db, '15', sub, actor, 'update slug transliteration rule');
    await db.prepare(
      `UPDATE seo_slug_transliteration_rules
       SET source_sample = ?, normalized_slug = ?, strip_stopwords = ?, max_slug_length = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(sample, slug, stripStop, maxLen, body.is_active !== undefined ? (body.is_active ? 1 : 0) : ex.is_active, sub).run();
    const updated = await db.prepare(`SELECT * FROM seo_slug_transliteration_rules WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 16: SEARCH ANALYTICS & INTENT TRACKING ================= */
async function handleSearchIntent(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const bucket = (url.searchParams.get('intent_bucket') || '').trim();
    const lang = (url.searchParams.get('lang_script') || '').trim();
    const trend = (url.searchParams.get('trend_direction') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (bucket) { where.push('intent_bucket = ?'); binds.push(bucket); }
    if (lang) { where.push('lang_script = ?'); binds.push(lang); }
    if (trend) { where.push('trend_direction = ?'); binds.push(trend); }
    if (q) { where.push(`query_cluster LIKE ? ESCAPE '\\'`); binds.push(`%${likeEscape(q)}%`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ results }, { results: summary }] = await Promise.all([
      db.prepare(`SELECT * FROM seo_search_intent_metrics ${w} ORDER BY search_clicks_30d DESC`).bind(...binds).all(),
      db.prepare(`SELECT intent_bucket, SUM(impressions_30d) AS impressions, SUM(search_clicks_30d) AS clicks FROM seo_search_intent_metrics GROUP BY intent_bucket`).all()
    ]);
    return json({ items: results || [], bucket_summary: summary || [] });
  }

  if (sub === 'record' && method === 'POST') {
    const body = await readJson(request, 10000);
    const errors = {};
    const cluster = sanitizeSeoText(body.query_cluster || '', 160);
    const bucket = pick(body.intent_bucket, SEO_INTENT_BUCKETS, 'intent_bucket', errors, 'exam_syllabus_pyq');
    const lang = pick(body.lang_script, SEO_LANG_SCRIPTS, 'lang_script', errors, 'mixed_bilingual');
    const trend = pick(body.trend_direction, SEO_TRENDS, 'trend_direction', errors, 'steady');
    if (!cluster) errors.query_cluster = 'query_cluster is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const imp = Math.max(0, Number(body.impressions_30d || 0));
    const clk = Math.max(0, Math.min(imp || 9999999, Number(body.search_clicks_30d || 0)));
    const ctrBps = body.ctr_pct !== undefined
      ? Math.min(10000, Math.max(0, Number(body.ctr_pct)))
      : (imp > 0 ? Math.round((clk / imp) * 10000) : 0);
    const rankX10 = Math.max(10, Number(body.avg_result_rank_x10 || 15));
    const zrr = Math.min(100, Math.max(0, Number(body.zero_result_rate_pct || 0)));

    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_search_intent_metrics`).first();
    const code = sanitizeSeoText(body.intent_code || '', 40) || `INT-2026-${String(Number(cnt?.n || 0) + 1).padStart(4, '0')}`;
    const id = rid('seo-int');

    await db.prepare(
      `INSERT INTO seo_search_intent_metrics (id, intent_code, query_cluster, intent_bucket, lang_script, impressions_30d, search_clicks_30d, ctr_pct, avg_result_rank_x10, zero_result_rate_pct, trend_direction)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, code, cluster, bucket, lang, imp, clk, ctrBps, rankX10, zrr, trend).run();
    await snapshotSeoRevision(db, '16', id, actor, 'record search intent cluster');
    await audit(env, request, actor, 'seo.intent.record', 'seo_search_intent_metrics', id, { intent_bucket: bucket });
    const created = await db.prepare(`SELECT * FROM seo_search_intent_metrics WHERE id = ?`).bind(id).first();
    return json({ item: created }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleSeoSearchDiscoveryBatch4Admin(request, env, actor, id, sub, extra) {
  await ensureSeoSearchDiscoveryBatch4Schema(env.DB);
  if (id === 'rich-snippets') return handleRichSnippets(request, env, actor, sub);
  if (id === 'link-graph') return handleLinkGraph(request, env, actor, sub, extra);
  if (id === 'slug-normalizer') return handleSlugNormalizer(request, env, actor, sub);
  if (id === 'search-intent') return handleSearchIntent(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown SEO Batch 4 route');
}
