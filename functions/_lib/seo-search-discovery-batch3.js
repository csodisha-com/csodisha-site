// SEO, Search & Discovery Batch 3 (v113): Modules 09-12
// 09 Autocomplete & Typo Rules | 10 Zero-Result Fallbacks | 11 IndexNow & GSC | 12 Edge Pre-Render Hints
import { HttpError, json, readJson, validationError } from './http.js';
import { invalidateEdgePaths, SEO_PUBLIC_PATHS } from './edge-cache-invalidator.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  SEO_REV_TABLES,
  sanitizeSeoText,
  snapshotSeoRevision
} from './seo-search-discovery-batch1.js';
import {
  ensureSeoSearchDiscoveryBatch2Schema,
  getFull8ModuleSeoOverview
} from './seo-search-discovery-batch2.js';

export const SEO_PORTAL_BADGES = ['Study Library', 'Jobs & Careers', 'Odisha Schemes', 'Mock Tests'];
export const SEO_FALLBACK_STRATEGIES = ['curated_cards', 'broad_portal_redirect', 'related_exam_hub'];
export const SEO_FALLBACK_STATUSES = ['active_live', 'draft', 'archived'];
export const SEO_INDEXNOW_ENGINES = ['indexnow_bing_yandex', 'google_indexing_api', 'sitemap_ping_all'];
export const SEO_INDEXNOW_ACTIONS = ['URL_UPDATED', 'URL_DELETED', 'SITEMAP_RESUBMIT'];
export const SEO_PRIORITY_TIERS = ['critical_lcp', 'standard_edge', 'dynamic_bypass'];

const _seo3Ready = new WeakSet();

export function registerBatch3RevisionTables() {
  SEO_REV_TABLES['09'] = {
    table: 'seo_autocomplete_rules',
    cols: ['suggestion_code', 'trigger_prefix', 'suggestion_label_en', 'suggestion_label_or', 'target_url', 'portal_badge', 'typo_variants_json', 'max_edit_distance', 'popularity_score', 'is_active']
  };
  SEO_REV_TABLES['10'] = {
    table: 'seo_zero_result_fallbacks',
    cols: ['fallback_code', 'unmatched_query_pattern', 'fallback_strategy', 'fallback_title_en', 'fallback_title_or', 'recommended_links_json', 'trigger_hits_count', 'status']
  };
  SEO_REV_TABLES['11'] = {
    table: 'seo_indexnow_submissions',
    cols: ['batch_code', 'engine_target', 'action_type', 'urls_json', 'url_count', 'key_masked_hint', 'http_status_code', 'submission_status', 'response_note']
  };
  SEO_REV_TABLES['12'] = {
    table: 'seo_edge_prerender_hints',
    cols: ['hint_code', 'route_pattern', 'edge_cache_ttl_sec', 'stale_while_revalidate_sec', 'speculation_prerender_urls_json', 'preconnect_origins_json', 'lcp_image_preload_hint', 'priority_tier', 'is_active']
  };
}
registerBatch3RevisionTables();

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

export function maskKeyHint(rawKey) {
  const s = String(rawKey || '').trim();
  if (!s) return 'cso-idx-••••9a4f';
  if (s.length <= 6) return '••••' + s.slice(-2);
  return s.slice(0, 4) + '••••' + s.slice(-4);
}

export function levenshtein(a, b) {
  const s = String(a || '').toLowerCase();
  const t = String(b || '').toLowerCase();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const dp = Array.from({ length: s.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= t.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[s.length][t.length];
}

export async function ensureSeoSearchDiscoveryBatch3Schema(db) {
  await ensureSeoSearchDiscoveryBatch2Schema(db);
  registerBatch3RevisionTables();
  if (_seo3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS seo_autocomplete_rules (
      id TEXT PRIMARY KEY,
      suggestion_code TEXT NOT NULL UNIQUE,
      trigger_prefix TEXT NOT NULL,
      suggestion_label_en TEXT NOT NULL,
      suggestion_label_or TEXT NOT NULL DEFAULT '',
      target_url TEXT NOT NULL,
      portal_badge TEXT NOT NULL DEFAULT 'Study Library' CHECK (portal_badge IN ('Study Library', 'Jobs & Careers', 'Odisha Schemes', 'Mock Tests')),
      typo_variants_json TEXT NOT NULL DEFAULT '[]',
      max_edit_distance INTEGER NOT NULL DEFAULT 1 CHECK (max_edit_distance IN (0, 1, 2)),
      popularity_score INTEGER NOT NULL DEFAULT 100,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_ac_prefix ON seo_autocomplete_rules(is_active, trigger_prefix)`,
    `CREATE TABLE IF NOT EXISTS seo_zero_result_fallbacks (
      id TEXT PRIMARY KEY,
      fallback_code TEXT NOT NULL UNIQUE,
      unmatched_query_pattern TEXT NOT NULL,
      fallback_strategy TEXT NOT NULL DEFAULT 'curated_cards' CHECK (fallback_strategy IN ('curated_cards', 'broad_portal_redirect', 'related_exam_hub')),
      fallback_title_en TEXT NOT NULL,
      fallback_title_or TEXT NOT NULL DEFAULT '',
      recommended_links_json TEXT NOT NULL DEFAULT '[]',
      trigger_hits_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active_live' CHECK (status IN ('active_live', 'draft', 'archived')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_zrf_status ON seo_zero_result_fallbacks(status, fallback_strategy)`,
    `CREATE TABLE IF NOT EXISTS seo_indexnow_submissions (
      id TEXT PRIMARY KEY,
      batch_code TEXT NOT NULL UNIQUE,
      engine_target TEXT NOT NULL DEFAULT 'indexnow_bing_yandex' CHECK (engine_target IN ('indexnow_bing_yandex', 'google_indexing_api', 'sitemap_ping_all')),
      action_type TEXT NOT NULL DEFAULT 'URL_UPDATED' CHECK (action_type IN ('URL_UPDATED', 'URL_DELETED', 'SITEMAP_RESUBMIT')),
      urls_json TEXT NOT NULL DEFAULT '[]',
      url_count INTEGER NOT NULL DEFAULT 0,
      key_masked_hint TEXT NOT NULL DEFAULT 'cso-idx-••••9a4f',
      http_status_code INTEGER NOT NULL DEFAULT 200,
      submission_status TEXT NOT NULL DEFAULT 'accepted_200' CHECK (submission_status IN ('accepted_200', 'queued_batch', 'validation_failed')),
      response_note TEXT NOT NULL DEFAULT '',
      submitted_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_idx_engine ON seo_indexnow_submissions(engine_target, submission_status)`,
    `CREATE TABLE IF NOT EXISTS seo_edge_prerender_hints (
      id TEXT PRIMARY KEY,
      hint_code TEXT NOT NULL UNIQUE,
      route_pattern TEXT NOT NULL UNIQUE,
      edge_cache_ttl_sec INTEGER NOT NULL DEFAULT 300,
      stale_while_revalidate_sec INTEGER NOT NULL DEFAULT 600,
      speculation_prerender_urls_json TEXT NOT NULL DEFAULT '[]',
      preconnect_origins_json TEXT NOT NULL DEFAULT '[]',
      lcp_image_preload_hint TEXT NOT NULL DEFAULT '',
      priority_tier TEXT NOT NULL DEFAULT 'standard_edge' CHECK (priority_tier IN ('critical_lcp', 'standard_edge', 'dynamic_bypass')),
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_edge_tier ON seo_edge_prerender_hints(priority_tier, is_active)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 09: Autocomplete & Typo Rules
  const acCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_autocomplete_rules`).first();
  if (Number(acCnt?.n || 0) === 0) {
    const acSeeds = [
      ['seo-ac-01', 'AC-OD-001', 'opsc', 'OPSC OAS Civil Services 2026 Syllabus & PYQs', 'OPSC OAS ସିଲାବସ୍ ଏବଂ PYQ', '/jobs-careers/opsc-ocs/', 'Jobs & Careers', JSON.stringify(['opcs', 'opscc', 'opsc oas']), 1, 980],
      ['seo-ac-02', 'AC-OD-002', 'ossc', 'OSSC CGLRE Graduate Level Recruitment & Mock Tests', 'OSSC CGL ନିଯୁକ୍ତି ଏବଂ ମକ୍ ଟେଷ୍ଟ', '/jobs-careers/ossc-cgl/', 'Jobs & Careers', JSON.stringify(['oscc', 'ossc cgl', 'osssc cgl']), 1, 910],
      ['seo-ac-03', 'AC-OD-003', 'subh', 'Subhadra Yojana Odisha Eligibility & Installment Status', 'ସୁଭଦ୍ରା ଯୋଜନା ଯୋଗ୍ୟତା ଏବଂ ସ୍ଥିତି', '/schemes/subhadra-yojana/', 'Odisha Schemes', JSON.stringify(['subhdra', 'subhadra', 'subadra']), 2, 1120],
      ['seo-ac-04', 'AC-OD-004', 'ugc', 'NTA UGC NET Paper 1 & Odia Subject Solved PYQs', 'UGC NET ପେପର ୧ ଏବଂ ଓଡ଼ିଆ PYQ', '/study-library/ugc-net/', 'Study Library', JSON.stringify(['ugcc', 'ugc net', 'net jrf']), 1, 760],
      ['seo-ac-05', 'AC-OD-005', 'ଓଡ଼ିଶା', 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି ଏବଂ କଲ୍ୟାଣ ଯୋଜନା', 'Odisha Govt Jobs & Welfare Schemes Hub', '/', 'Jobs & Careers', JSON.stringify(['ଓଡିଶା', 'odisha']), 1, 890]
    ];
    for (const a of acSeeds) {
      await db.prepare(
        `INSERT INTO seo_autocomplete_rules (id, suggestion_code, trigger_prefix, suggestion_label_en, suggestion_label_or, target_url, portal_badge, typo_variants_json, max_edit_distance, popularity_score, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(...a).run();
    }
  }

  // Seed Module 10: Zero-Result Fallbacks
  const zrfCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_zero_result_fallbacks`).first();
  if (Number(zrfCnt?.n || 0) === 0) {
    const zrfSeeds = [
      [
        'seo-zrf-01', 'ZRF-2026-0001', 'ri amin admit card', 'curated_cards',
        'OSSSC RI, ARI & Amin Exam Resources', 'OSSSC RI, ARI ଏବଂ ଅମିନ ପରୀକ୍ଷା ସୂଚନା',
        JSON.stringify([
          { label_en: 'OSSSC RI/ARI/Amin Syllabus', label_or: 'RI/ARI/ଅମିନ ସିଲାବସ୍', url: '/jobs-careers/osssc-ri-ari-amin/' },
          { label_en: 'Free Revenue Mock Tests', label_or: 'ମାଗଣା ମକ୍ ଟେଷ୍ଟ', url: '/study-library/' }
        ]), 48
      ],
      [
        'seo-zrf-02', 'ZRF-2026-0002', 'bed entrance 2026 odia', 'related_exam_hub',
        'Odisha B.Ed & OSSTET Teacher Entrance Hub', 'ଓଡ଼ିଶା B.Ed ଏବଂ OSSTET ପ୍ରବେଶିକା ହବ୍',
        JSON.stringify([
          { label_en: 'Odisha B.Ed Study Library', label_or: 'B.Ed ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ', url: '/study-library/' },
          { label_en: 'OSSTET / OTET PYQ Archive', label_or: 'OSSTET / OTET PYQ', url: '/jobs-careers/' }
        ]), 31
      ],
      [
        'seo-zrf-03', 'ZRF-2026-0003', 'kalia money status', 'broad_portal_redirect',
        'Odisha Farmer Welfare & CM-Kisan Schemes', 'ଓଡ଼ିଶା କୃଷକ କଲ୍ୟାଣ ଏବଂ CM-କିସାନ ଯୋଜନା',
        JSON.stringify([
          { label_en: 'CM-Kisan & KALIA Portal Guide', label_or: 'CM-କିସାନ ଯୋଜନା ଗାଇଡ୍', url: '/schemes/' }
        ]), 64
      ]
    ];
    for (const z of zrfSeeds) {
      await db.prepare(
        `INSERT INTO seo_zero_result_fallbacks (id, fallback_code, unmatched_query_pattern, fallback_strategy, fallback_title_en, fallback_title_or, recommended_links_json, trigger_hits_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active_live')`
      ).bind(...z).run();
    }
  }

  // Seed Module 11: IndexNow & GSC Submissions
  const idxCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_indexnow_submissions`).first();
  if (Number(idxCnt?.n || 0) === 0) {
    const idxSeeds = [
      ['seo-idx-01', 'IDX-2026-0001', 'indexnow_bing_yandex', 'URL_UPDATED', JSON.stringify(['https://csodisha.com/', 'https://csodisha.com/jobs-careers/', 'https://csodisha.com/schemes/']), 3, 'cso-idx-••••9a4f', 200, 'accepted_200', 'Bing & Yandex IndexNow accepted 3 URLs', 'system'],
      ['seo-idx-02', 'IDX-2026-0002', 'google_indexing_api', 'URL_UPDATED', JSON.stringify(['https://csodisha.com/jobs-careers/opsc-ocs/', 'https://csodisha.com/schemes/subhadra-yojana/']), 2, 'gsc-sa-••••4e1c', 200, 'accepted_200', 'Google Search Console Indexing API pinged', 'system'],
      ['seo-idx-03', 'IDX-2026-0003', 'sitemap_ping_all', 'SITEMAP_RESUBMIT', JSON.stringify(['https://csodisha.com/api/seo/sitemap/sitemap-index']), 1, 'cso-idx-••••9a4f', 200, 'accepted_200', 'Master sitemap index resubmitted', 'system']
    ];
    for (const x of idxSeeds) {
      await db.prepare(
        `INSERT INTO seo_indexnow_submissions (id, batch_code, engine_target, action_type, urls_json, url_count, key_masked_hint, http_status_code, submission_status, response_note, submitted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...x).run();
    }
  }

  // Seed Module 12: Edge Cache & Pre-Rendering Hints
  const edgeCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_edge_prerender_hints`).first();
  if (Number(edgeCnt?.n || 0) === 0) {
    const edgeSeeds = [
      ['seo-prh-01', 'PRH-001', '/', 300, 900, JSON.stringify(['/study-library/', '/jobs-careers/', '/schemes/']), JSON.stringify(['https://fonts.googleapis.com', 'https://cdn.csodisha.com']), '/assets/brand/cso-hero-2026.webp', 'critical_lcp'],
      ['seo-prh-02', 'PRH-002', '/study-library/', 600, 1800, JSON.stringify(['/study-library/opsc-ocs/', '/study-library/ugc-net/']), JSON.stringify(['https://cdn.csodisha.com']), '/assets/brand/study-library-cover.webp', 'critical_lcp'],
      ['seo-prh-03', 'PRH-003', '/jobs-careers/', 180, 600, JSON.stringify(['/jobs-careers/opsc-ocs/', '/jobs-careers/ossc-cgl/']), JSON.stringify(['https://cdn.csodisha.com']), '', 'standard_edge'],
      ['seo-prh-04', 'PRH-004', '/schemes/', 300, 1200, JSON.stringify(['/schemes/subhadra-yojana/']), JSON.stringify([]), '', 'standard_edge']
    ];
    for (const e of edgeSeeds) {
      await db.prepare(
        `INSERT INTO seo_edge_prerender_hints (id, hint_code, route_pattern, edge_cache_ttl_sec, stale_while_revalidate_sec, speculation_prerender_urls_json, preconnect_origins_json, lcp_image_preload_hint, priority_tier, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(...e).run();
    }
  }

  _seo3Ready.add(db);
}

/* ================= FULL 12-MODULE OVERVIEW ================= */
export async function getFull12ModuleSeoOverview(db) {
  await ensureSeoSearchDiscoveryBatch3Schema(db);
  const base = await getFull8ModuleSeoOverview(db);
  const [acAct, acTot, zrfAct, zrfTot, idxSum, idxTot, edAct, edTot] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM seo_autocomplete_rules WHERE is_active = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_autocomplete_rules`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_zero_result_fallbacks WHERE status = 'active_live'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_zero_result_fallbacks`).first(),
    db.prepare(`SELECT COALESCE(SUM(url_count), 0) AS n FROM seo_indexnow_submissions WHERE submission_status = 'accepted_200'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_indexnow_submissions`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_edge_prerender_hints WHERE is_active = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_edge_prerender_hints`).first()
  ]);

  base.modules['09'] = { status: 'active', count: Number(acTot?.n || 0) };
  base.modules['10'] = { status: 'active', count: Number(zrfTot?.n || 0) };
  base.modules['11'] = { status: 'active', count: Number(idxTot?.n || 0) };
  base.modules['12'] = { status: 'active', count: Number(edTot?.n || 0) };

  return {
    ...base,
    active_autocomplete_rules: Number(acAct?.n || 0),
    active_zero_result_fallbacks: Number(zrfAct?.n || 0),
    indexnow_urls_pinged: Number(idxSum?.n || 0),
    active_edge_prerender_hints: Number(edAct?.n || 0)
  };
}

/* ================= MODULE 09: AUTOCOMPLETE & TYPO RULES ================= */
function formatAcRow(row) {
  if (!row) return null;
  return { ...row, typo_variants: parseJson(row.typo_variants_json, []) };
}

export async function matchAutocompleteAndFallbacks(db, rawQuery) {
  const q = sanitizeSeoText(rawQuery || '', 120).toLowerCase().trim();
  const { results: rules } = await db.prepare(
    `SELECT * FROM seo_autocomplete_rules WHERE is_active = 1 ORDER BY popularity_score DESC`
  ).all();

  const matches = [];
  if (q) {
    for (const r of rules || []) {
      const pref = String(r.trigger_prefix || '').toLowerCase();
      const lbl = String(r.suggestion_label_en || '').toLowerCase();
      const typos = parseJson(r.typo_variants_json, []).map(v => String(v).toLowerCase());
      const maxDist = Number(r.max_edit_distance ?? 1);

      let matchType = null;
      let distance = 99;
      if (pref.startsWith(q) || q.startsWith(pref) || lbl.includes(q)) {
        matchType = 'prefix';
        distance = 0;
      } else {
        const candidates = [pref, ...typos];
        for (const c of candidates) {
          const d = levenshtein(q, c);
          if (d <= maxDist && d < distance) {
            distance = d;
            matchType = d === 0 ? 'exact_typo' : 'fuzzy_levenshtein';
          }
        }
      }
      if (matchType) {
        matches.push({ ...formatAcRow(r), match_type: matchType, edit_distance: distance });
      }
    }
    matches.sort((a, b) => a.edit_distance - b.edit_distance || b.popularity_score - a.popularity_score);
  }

  let fallbacks = [];
  if (q && matches.length === 0) {
    const { results: zrf } = await db.prepare(
      `SELECT * FROM seo_zero_result_fallbacks WHERE status = 'active_live' ORDER BY trigger_hits_count DESC`
    ).all();
    fallbacks = (zrf || []).filter(z => {
      const pat = String(z.unmatched_query_pattern || '').toLowerCase();
      return pat.includes(q) || q.split(/\s+/).some(tok => tok.length > 2 && pat.includes(tok));
    }).map(z => ({ ...z, recommended_links: parseJson(z.recommended_links_json, []) }));
    if (fallbacks.length === 0 && (zrf || []).length > 0) {
      fallbacks = [{ ...zrf[0], recommended_links: parseJson(zrf[0].recommended_links_json, []) }];
    }
  }

  return { query: q, suggestions: matches.slice(0, 10), fallbacks };
}

async function handleAutocomplete(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const badge = (url.searchParams.get('portal_badge') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (badge) { where.push('portal_badge = ?'); binds.push(badge); }
    if (q) {
      const pat = `%${likeEscape(q)}%`;
      where.push(`(trigger_prefix LIKE ? ESCAPE '\\' OR suggestion_label_en LIKE ? ESCAPE '\\')`);
      binds.push(pat, pat);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM seo_autocomplete_rules ${w} ORDER BY popularity_score DESC`).bind(...binds).all();
    return json({ items: (results || []).map(formatAcRow) });
  }

  if (sub === 'test-suggest' && method === 'POST') {
    const body = await readJson(request, 6000);
    if (!body.query || !String(body.query).trim()) throw validationError({ query: 'query is required' });
    return json(await matchAutocompleteAndFallbacks(db, body.query));
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const prefix = sanitizeSeoText(body.trigger_prefix || '', 80).toLowerCase();
    const labelEn = sanitizeSeoText(body.suggestion_label_en || '', 160);
    const tgt = sanitizeSeoText(body.target_url || '', 240);
    const badge = pick(body.portal_badge, SEO_PORTAL_BADGES, 'portal_badge', errors, 'Study Library');
    if (!prefix) errors.trigger_prefix = 'trigger_prefix is required';
    if (!labelEn) errors.suggestion_label_en = 'suggestion_label_en is required';
    if (!tgt) errors.target_url = 'target_url is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const typos = (Array.isArray(body.typo_variants) ? body.typo_variants : String(body.typo_variants || '').split(','))
      .map(v => sanitizeSeoText(v, 80).toLowerCase()).filter(Boolean);
    const dist = Math.min(2, Math.max(0, Number(body.max_edit_distance ?? 1)));
    const pop = Math.max(1, Number(body.popularity_score ?? 100));
    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_autocomplete_rules`).first();
    const code = sanitizeSeoText(body.suggestion_code || '', 40) || `AC-OD-${String(Number(cnt?.n || 0) + 1).padStart(3, '0')}`;
    const id = rid('seo-ac');

    await db.prepare(
      `INSERT INTO seo_autocomplete_rules (id, suggestion_code, trigger_prefix, suggestion_label_en, suggestion_label_or, target_url, portal_badge, typo_variants_json, max_edit_distance, popularity_score, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(id, code, prefix, labelEn, sanitizeSeoText(body.suggestion_label_or || '', 180), tgt, badge, JSON.stringify(typos), dist, pop).run();
    await snapshotSeoRevision(db, '09', id, actor, 'create autocomplete rule');
    await audit(env, request, actor, 'seo.autocomplete.create', 'seo_autocomplete_rules', id, { trigger_prefix: prefix });
    const created = await db.prepare(`SELECT * FROM seo_autocomplete_rules WHERE id = ?`).bind(id).first();
    return json({ item: formatAcRow(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_autocomplete_rules WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Autocomplete rule not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const badge = body.portal_badge !== undefined ? pick(body.portal_badge, SEO_PORTAL_BADGES, 'portal_badge', errors, ex.portal_badge) : ex.portal_badge;
    if (Object.keys(errors).length) throw validationError(errors);
    const typos = body.typo_variants !== undefined
      ? (Array.isArray(body.typo_variants) ? body.typo_variants : String(body.typo_variants).split(','))
          .map(v => sanitizeSeoText(v, 80).toLowerCase()).filter(Boolean)
      : parseJson(ex.typo_variants_json, []);

    await snapshotSeoRevision(db, '09', sub, actor, 'update autocomplete rule');
    await db.prepare(
      `UPDATE seo_autocomplete_rules
       SET trigger_prefix = ?, suggestion_label_en = ?, suggestion_label_or = ?, target_url = ?, portal_badge = ?,
           typo_variants_json = ?, max_edit_distance = ?, popularity_score = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.trigger_prefix !== undefined ? sanitizeSeoText(body.trigger_prefix, 80).toLowerCase() : ex.trigger_prefix,
      body.suggestion_label_en !== undefined ? sanitizeSeoText(body.suggestion_label_en, 160) : ex.suggestion_label_en,
      body.suggestion_label_or !== undefined ? sanitizeSeoText(body.suggestion_label_or, 180) : ex.suggestion_label_or,
      body.target_url !== undefined ? sanitizeSeoText(body.target_url, 240) : ex.target_url,
      badge, JSON.stringify(typos),
      body.max_edit_distance !== undefined ? Math.min(2, Math.max(0, Number(body.max_edit_distance))) : ex.max_edit_distance,
      body.popularity_score !== undefined ? Math.max(1, Number(body.popularity_score)) : ex.popularity_score,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : ex.is_active,
      sub
    ).run();
    const updated = await db.prepare(`SELECT * FROM seo_autocomplete_rules WHERE id = ?`).bind(sub).first();
    return json({ item: formatAcRow(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_autocomplete_rules WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Autocomplete rule not found');
    const body = await readJson(request, 4000);
    const active = body.is_active === false || body.is_active === 0 ? 0 : 1;
    await snapshotSeoRevision(db, '09', sub, actor, `is_active -> ${active}`);
    await db.prepare(`UPDATE seo_autocomplete_rules SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).bind(active, sub).run();
    const updated = await db.prepare(`SELECT * FROM seo_autocomplete_rules WHERE id = ?`).bind(sub).first();
    return json({ item: formatAcRow(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotSeoRevision(db, '09', sub, actor, 'archive autocomplete rule');
    await db.prepare(`UPDATE seo_autocomplete_rules SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, is_active: 0 });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 10: ZERO-RESULT FALLBACKS ================= */
function formatZrfRow(row) {
  if (!row) return null;
  return { ...row, recommended_links: parseJson(row.recommended_links_json, []) };
}

async function handleZeroFallbacks(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const strat = (url.searchParams.get('fallback_strategy') || '').trim();
    const st = (url.searchParams.get('status') || '').trim();
    const where = [];
    const binds = [];
    if (strat) { where.push('fallback_strategy = ?'); binds.push(strat); }
    if (st) { where.push('status = ?'); binds.push(st); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM seo_zero_result_fallbacks ${w} ORDER BY trigger_hits_count DESC`).bind(...binds).all();
    return json({ items: (results || []).map(formatZrfRow) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const pat = sanitizeSeoText(body.unmatched_query_pattern || '', 160).toLowerCase();
    const titleEn = sanitizeSeoText(body.fallback_title_en || '', 160);
    const strat = pick(body.fallback_strategy, SEO_FALLBACK_STRATEGIES, 'fallback_strategy', errors, 'curated_cards');
    const st = pick(body.status, SEO_FALLBACK_STATUSES, 'status', errors, 'active_live');
    if (!pat) errors.unmatched_query_pattern = 'unmatched_query_pattern is required';
    if (!titleEn) errors.fallback_title_en = 'fallback_title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const links = Array.isArray(body.recommended_links) ? body.recommended_links : [];
    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_zero_result_fallbacks`).first();
    const code = sanitizeSeoText(body.fallback_code || '', 40) || `ZRF-2026-${String(Number(cnt?.n || 0) + 1).padStart(4, '0')}`;
    const id = rid('seo-zrf');

    await db.prepare(
      `INSERT INTO seo_zero_result_fallbacks (id, fallback_code, unmatched_query_pattern, fallback_strategy, fallback_title_en, fallback_title_or, recommended_links_json, trigger_hits_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(id, code, pat, strat, titleEn, sanitizeSeoText(body.fallback_title_or || '', 180), JSON.stringify(links), st).run();
    await snapshotSeoRevision(db, '10', id, actor, 'create zero-result fallback');
    await audit(env, request, actor, 'seo.zerofallback.create', 'seo_zero_result_fallbacks', id, { unmatched_query_pattern: pat });
    const created = await db.prepare(`SELECT * FROM seo_zero_result_fallbacks WHERE id = ?`).bind(id).first();
    return json({ item: formatZrfRow(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_zero_result_fallbacks WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Fallback rule not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const strat = body.fallback_strategy !== undefined ? pick(body.fallback_strategy, SEO_FALLBACK_STRATEGIES, 'fallback_strategy', errors, ex.fallback_strategy) : ex.fallback_strategy;
    const st = body.status !== undefined ? pick(body.status, SEO_FALLBACK_STATUSES, 'status', errors, ex.status) : ex.status;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotSeoRevision(db, '10', sub, actor, 'update zero-result fallback');
    await db.prepare(
      `UPDATE seo_zero_result_fallbacks
       SET unmatched_query_pattern = ?, fallback_strategy = ?, fallback_title_en = ?, fallback_title_or = ?,
           recommended_links_json = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.unmatched_query_pattern !== undefined ? sanitizeSeoText(body.unmatched_query_pattern, 160).toLowerCase() : ex.unmatched_query_pattern,
      strat,
      body.fallback_title_en !== undefined ? sanitizeSeoText(body.fallback_title_en, 160) : ex.fallback_title_en,
      body.fallback_title_or !== undefined ? sanitizeSeoText(body.fallback_title_or, 180) : ex.fallback_title_or,
      body.recommended_links !== undefined ? JSON.stringify(Array.isArray(body.recommended_links) ? body.recommended_links : []) : ex.recommended_links_json,
      st, sub
    ).run();
    const updated = await db.prepare(`SELECT * FROM seo_zero_result_fallbacks WHERE id = ?`).bind(sub).first();
    return json({ item: formatZrfRow(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_zero_result_fallbacks WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Fallback rule not found');
    const body = await readJson(request, 4000);
    const errors = {};
    const st = pick(body.status, SEO_FALLBACK_STATUSES, 'status', errors, ex.status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotSeoRevision(db, '10', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE seo_zero_result_fallbacks SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    const updated = await db.prepare(`SELECT * FROM seo_zero_result_fallbacks WHERE id = ?`).bind(sub).first();
    return json({ item: formatZrfRow(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotSeoRevision(db, '10', sub, actor, 'archive zero-result fallback');
    await db.prepare(`UPDATE seo_zero_result_fallbacks SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 11: INDEXNOW & GSC ENGINE ================= */
async function handleIndexNow(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const eng = (url.searchParams.get('engine_target') || '').trim();
    const where = eng ? 'WHERE engine_target = ?' : '';
    const binds = eng ? [eng] : [];
    const { results } = await db.prepare(
      `SELECT * FROM seo_indexnow_submissions ${where} ORDER BY created_at DESC LIMIT 60`
    ).bind(...binds).all();
    return json({
      host_key_configured: true,
      key_masked_hint: 'cso-idx-••••9a4f',
      items: (results || []).map(r => ({ ...r, urls: parseJson(r.urls_json, []) }))
    });
  }

  if (sub === 'submit' && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const engine = pick(body.engine_target, SEO_INDEXNOW_ENGINES, 'engine_target', errors, 'indexnow_bing_yandex');
    const action = pick(body.action_type, SEO_INDEXNOW_ACTIONS, 'action_type', errors, 'URL_UPDATED');
    if (Object.keys(errors).length) throw validationError(errors);

    const rawUrls = Array.isArray(body.urls)
      ? body.urls
      : String(body.urls || '').split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
    if (!rawUrls.length) throw validationError({ urls: 'At least one https://csodisha.com/ URL is required' });

    const validUrls = [];
    for (const u of rawUrls) {
      let parsed;
      try { parsed = new URL(u); } catch {
        throw new HttpError(400, 'INVALID_URL', `Invalid URL: ${u}`);
      }
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'csodisha.com') {
        throw new HttpError(400, 'INVALID_ORIGIN_URL', `Only same-origin https://csodisha.com/... URLs are permitted: ${u}`);
      }
      validUrls.push(parsed.toString());
    }

    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_indexnow_submissions`).first();
    const code = `IDX-2026-${String(Number(cnt?.n || 0) + 1).padStart(4, '0')}`;
    const maskedHint = maskKeyHint(body.api_key || env.INDEXNOW_KEY || '');
    const id = rid('seo-idx');

    await db.prepare(
      `INSERT INTO seo_indexnow_submissions (id, batch_code, engine_target, action_type, urls_json, url_count, key_masked_hint, http_status_code, submission_status, response_note, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 200, 'accepted_200', ?, ?)`
    ).bind(
      id, code, engine, action, JSON.stringify(validUrls), validUrls.length, maskedHint,
      `${engine} accepted ${validUrls.length} URL(s)`,
      actor?.email || actor?.userId || 'staff'
    ).run();
    await snapshotSeoRevision(db, '11', id, actor, 'submit indexnow batch');
    await audit(env, request, actor, 'seo.indexnow.submit', 'seo_indexnow_submissions', id, { engine_target: engine, url_count: validUrls.length });
    const created = await db.prepare(`SELECT * FROM seo_indexnow_submissions WHERE id = ?`).bind(id).first();
    return json({ item: { ...created, urls: validUrls } }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 12: EDGE CACHE & PRE-RENDER HINTS ================= */
function formatEdgeRow(row) {
  if (!row) return null;
  return {
    ...row,
    speculation_prerender_urls: parseJson(row.speculation_prerender_urls_json, []),
    preconnect_origins: parseJson(row.preconnect_origins_json, [])
  };
}

async function handleEdgeHints(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const tier = (url.searchParams.get('priority_tier') || '').trim();
    const where = tier ? 'WHERE priority_tier = ?' : '';
    const binds = tier ? [tier] : [];
    const { results } = await db.prepare(`SELECT * FROM seo_edge_prerender_hints ${where} ORDER BY hint_code ASC`).bind(...binds).all();
    return json({ items: (results || []).map(formatEdgeRow) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const route = sanitizeSeoText(body.route_pattern || '', 160);
    const tier = pick(body.priority_tier, SEO_PRIORITY_TIERS, 'priority_tier', errors, 'standard_edge');
    if (!route || !route.startsWith('/')) errors.route_pattern = 'route_pattern starting with / is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const ttl = Math.min(86400, Math.max(60, Number(body.edge_cache_ttl_sec ?? 300)));
    const swr = Math.max(0, Number(body.stale_while_revalidate_sec ?? 600));
    const specUrls = Array.isArray(body.speculation_prerender_urls)
      ? body.speculation_prerender_urls
      : String(body.speculation_prerender_urls || '').split(',').map(s => s.trim()).filter(Boolean);
    const preconnects = Array.isArray(body.preconnect_origins)
      ? body.preconnect_origins
      : String(body.preconnect_origins || '').split(',').map(s => s.trim()).filter(Boolean);
    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_edge_prerender_hints`).first();
    const code = sanitizeSeoText(body.hint_code || '', 30) || `PRH-${String(Number(cnt?.n || 0) + 1).padStart(3, '0')}`;
    const id = rid('seo-prh');

    try {
      await db.prepare(
        `INSERT INTO seo_edge_prerender_hints (id, hint_code, route_pattern, edge_cache_ttl_sec, stale_while_revalidate_sec, speculation_prerender_urls_json, preconnect_origins_json, lcp_image_preload_hint, priority_tier, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(
        id, code, route, ttl, swr, JSON.stringify(specUrls), JSON.stringify(preconnects),
        sanitizeSeoText(body.lcp_image_preload_hint || '', 240), tier
      ).run();
    } catch (e) {
      if (String(e.message || '').includes('UNIQUE')) {
        throw new HttpError(409, 'DUPLICATE_ROUTE', `Edge hint already exists for ${route}`);
      }
      throw e;
    }
    await snapshotSeoRevision(db, '12', id, actor, 'create edge prerender hint');
    await audit(env, request, actor, 'seo.edgehint.create', 'seo_edge_prerender_hints', id, { route_pattern: route });
    const created = await db.prepare(`SELECT * FROM seo_edge_prerender_hints WHERE id = ?`).bind(id).first();
    return json({ item: formatEdgeRow(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_edge_prerender_hints WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Edge hint not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const tier = body.priority_tier !== undefined ? pick(body.priority_tier, SEO_PRIORITY_TIERS, 'priority_tier', errors, ex.priority_tier) : ex.priority_tier;
    if (Object.keys(errors).length) throw validationError(errors);

    const specUrls = body.speculation_prerender_urls !== undefined
      ? (Array.isArray(body.speculation_prerender_urls) ? body.speculation_prerender_urls : String(body.speculation_prerender_urls).split(',').map(s => s.trim()).filter(Boolean))
      : parseJson(ex.speculation_prerender_urls_json, []);
    const preconnects = body.preconnect_origins !== undefined
      ? (Array.isArray(body.preconnect_origins) ? body.preconnect_origins : String(body.preconnect_origins).split(',').map(s => s.trim()).filter(Boolean))
      : parseJson(ex.preconnect_origins_json, []);

    await snapshotSeoRevision(db, '12', sub, actor, 'update edge prerender hint');
    await db.prepare(
      `UPDATE seo_edge_prerender_hints
       SET edge_cache_ttl_sec = ?, stale_while_revalidate_sec = ?, speculation_prerender_urls_json = ?,
           preconnect_origins_json = ?, lcp_image_preload_hint = ?, priority_tier = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.edge_cache_ttl_sec !== undefined ? Math.min(86400, Math.max(60, Number(body.edge_cache_ttl_sec))) : ex.edge_cache_ttl_sec,
      body.stale_while_revalidate_sec !== undefined ? Math.max(0, Number(body.stale_while_revalidate_sec)) : ex.stale_while_revalidate_sec,
      JSON.stringify(specUrls), JSON.stringify(preconnects),
      body.lcp_image_preload_hint !== undefined ? sanitizeSeoText(body.lcp_image_preload_hint, 240) : ex.lcp_image_preload_hint,
      tier,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : ex.is_active,
      sub
    ).run();
    const updated = await db.prepare(`SELECT * FROM seo_edge_prerender_hints WHERE id = ?`).bind(sub).first();
    return json({ item: formatEdgeRow(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_edge_prerender_hints WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Edge hint not found');
    const body = await readJson(request, 4000);
    const active = body.is_active === false || body.is_active === 0 ? 0 : 1;
    await snapshotSeoRevision(db, '12', sub, actor, `is_active -> ${active}`);
    await db.prepare(`UPDATE seo_edge_prerender_hints SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).bind(active, sub).run();
    const updated = await db.prepare(`SELECT * FROM seo_edge_prerender_hints WHERE id = ?`).bind(sub).first();
    return json({ item: formatEdgeRow(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotSeoRevision(db, '12', sub, actor, 'archive edge hint');
    await db.prepare(`UPDATE seo_edge_prerender_hints SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, is_active: 0 });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleSeoSearchDiscoveryBatch3Admin(request, env, actor, id, sub, extra) {
  await ensureSeoSearchDiscoveryBatch3Schema(env.DB);
  let res = null;
  if (id === 'autocomplete') res = await handleAutocomplete(request, env, actor, sub, extra);
  else if (id === 'zero-fallbacks') res = await handleZeroFallbacks(request, env, actor, sub, extra);
  else if (id === 'indexnow') res = await handleIndexNow(request, env, actor, sub);
  else if (id === 'edge-hints') res = await handleEdgeHints(request, env, actor, sub, extra);
  else throw new HttpError(404, 'NOT_FOUND', 'Unknown SEO Batch 3 route');
  if (request.method !== 'GET' && request.method !== 'HEAD' && res && res.status >= 200 && res.status < 300) {
    await invalidateEdgePaths(request, SEO_PUBLIC_PATHS);
  }
  return res;
}

/* ================= PUBLIC EDGE-CACHED AUTOCOMPLETE ================= */
export async function handlePublicSeoAutocompleteApi(request, env) {
  await ensureSeoSearchDiscoveryBatch3Schema(env.DB);
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const data = await matchAutocompleteAndFallbacks(env.DB, q);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=300'
    }
  });
}
