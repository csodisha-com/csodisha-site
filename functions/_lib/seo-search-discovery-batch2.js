// SEO, Search & Discovery Batch 2 (v112): Modules 05-08
// 05 Canonical & Redirects | 06 Robots.txt Studio | 07 Odia Tokenizer | 08 Exam Synonyms
import { HttpError, json, readJson, validationError } from './http.js';
import { invalidateEdgePaths, SEO_PUBLIC_PATHS } from './edge-cache-invalidator.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  SEO_REV_TABLES,
  ensureSeoSearchDiscoveryBatch1Schema,
  getSeoOverview,
  sanitizeSeoText,
  snapshotSeoRevision
} from './seo-search-discovery-batch1.js';

export const SEO_RULE_KINDS = ['redirect_301', 'redirect_302', 'canonical_override'];
export const SEO_MATCH_MODES = ['exact', 'prefix'];
export const SEO_RULE_STATUSES = ['active_live', 'paused', 'archived'];

export const SEO_ROBOTS_DIRECTIVES = ['Allow', 'Disallow', 'Crawl-delay'];
export const SEO_ROBOTS_PURPOSES = [
  'core_search_allow', 'private_area_block', 'ai_scraper_governance', 'crawl_rate_guard'
];
export const SEO_UNICODE_FORMS = ['NFC', 'NFKC'];
export const SEO_EXAM_DOMAINS = [
  'OPSC OCS/OAS', 'OSSC CGL', 'OSSSC RI/ARI/Amin', 'NTA UGC NET', 'OSSTET/OTET', 'Odisha Schemes'
];

const _seo2Ready = new WeakSet();

export function registerBatch2RevisionTables() {
  SEO_REV_TABLES['05'] = {
    table: 'seo_redirects_canonicals',
    cols: ['rule_code', 'rule_kind', 'source_path', 'target_url', 'preserve_query_string', 'match_mode', 'hits_count', 'reason_note', 'rule_status']
  };
  SEO_REV_TABLES['06'] = {
    table: 'seo_robots_directives',
    cols: ['rule_order', 'user_agent', 'directive_type', 'path_or_value', 'policy_purpose', 'is_locked_safety_rule', 'is_active']
  };
  SEO_REV_TABLES['07'] = {
    table: 'seo_search_tokenizer_configs',
    cols: ['index_key', 'index_name_en', 'index_name_or', 'unicode_normalization', 'odia_matra_folding', 'strip_odia_stopwords', 'cross_script_phonetic_bridge', 'title_weight', 'odia_title_weight', 'tags_weight', 'body_weight', 'is_active']
  };
  SEO_REV_TABLES['08'] = {
    table: 'seo_keyword_synonyms',
    cols: ['synonym_code', 'exam_or_domain', 'primary_term', 'synonyms_json', 'boost_factor_x10', 'pinned_target_url', 'is_bidirectional', 'is_active']
  };
}
registerBatch2RevisionTables();

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

function normalizePath(raw) {
  let p = sanitizeSeoText(raw, 240).trim();
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) {
    try { p = new URL(p).pathname || '/'; } catch { /* keep raw */ }
  }
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function targetPathOf(targetUrl) {
  const t = String(targetUrl || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (!u.hostname.endsWith('csodisha.com')) return null; // external host cannot self-loop
      return normalizePath(u.pathname || '/');
    } catch { return null; }
  }
  return normalizePath(t);
}

export async function ensureSeoSearchDiscoveryBatch2Schema(db) {
  await ensureSeoSearchDiscoveryBatch1Schema(db);
  registerBatch2RevisionTables();
  if (_seo2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS seo_redirects_canonicals (
      id TEXT PRIMARY KEY,
      rule_code TEXT NOT NULL UNIQUE,
      rule_kind TEXT NOT NULL DEFAULT 'redirect_301' CHECK (rule_kind IN ('redirect_301', 'redirect_302', 'canonical_override')),
      source_path TEXT NOT NULL UNIQUE,
      target_url TEXT NOT NULL,
      preserve_query_string INTEGER NOT NULL DEFAULT 1,
      match_mode TEXT NOT NULL DEFAULT 'exact' CHECK (match_mode IN ('exact', 'prefix')),
      hits_count INTEGER NOT NULL DEFAULT 0,
      reason_note TEXT NOT NULL DEFAULT '',
      rule_status TEXT NOT NULL DEFAULT 'active_live' CHECK (rule_status IN ('active_live', 'paused', 'archived')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_redirects_status ON seo_redirects_canonicals(rule_status, rule_kind)`,
    `CREATE TABLE IF NOT EXISTS seo_robots_directives (
      id TEXT PRIMARY KEY,
      rule_order INTEGER NOT NULL DEFAULT 10,
      user_agent TEXT NOT NULL DEFAULT '*',
      directive_type TEXT NOT NULL DEFAULT 'Allow' CHECK (directive_type IN ('Allow', 'Disallow', 'Crawl-delay')),
      path_or_value TEXT NOT NULL,
      policy_purpose TEXT NOT NULL DEFAULT 'core_search_allow' CHECK (policy_purpose IN ('core_search_allow', 'private_area_block', 'ai_scraper_governance', 'crawl_rate_guard')),
      is_locked_safety_rule INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_robots_order ON seo_robots_directives(is_active, rule_order)`,
    `CREATE TABLE IF NOT EXISTS seo_search_tokenizer_configs (
      id TEXT PRIMARY KEY,
      index_key TEXT NOT NULL UNIQUE,
      index_name_en TEXT NOT NULL,
      index_name_or TEXT NOT NULL DEFAULT '',
      unicode_normalization TEXT NOT NULL DEFAULT 'NFC' CHECK (unicode_normalization IN ('NFC', 'NFKC')),
      odia_matra_folding INTEGER NOT NULL DEFAULT 1,
      strip_odia_stopwords INTEGER NOT NULL DEFAULT 1,
      cross_script_phonetic_bridge INTEGER NOT NULL DEFAULT 1,
      title_weight INTEGER NOT NULL DEFAULT 8,
      odia_title_weight INTEGER NOT NULL DEFAULT 9,
      tags_weight INTEGER NOT NULL DEFAULT 6,
      body_weight INTEGER NOT NULL DEFAULT 2,
      indexed_docs_count INTEGER NOT NULL DEFAULT 0,
      last_reindexed_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS seo_keyword_synonyms (
      id TEXT PRIMARY KEY,
      synonym_code TEXT NOT NULL UNIQUE,
      exam_or_domain TEXT NOT NULL,
      primary_term TEXT NOT NULL,
      synonyms_json TEXT NOT NULL DEFAULT '[]',
      boost_factor_x10 INTEGER NOT NULL DEFAULT 20,
      pinned_target_url TEXT NOT NULL DEFAULT '',
      is_bidirectional INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_seo_synonyms_domain ON seo_keyword_synonyms(exam_or_domain, is_active)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 05: Canonical & Redirect Rules
  const rCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_redirects_canonicals`).first();
  if (Number(rCnt?.n || 0) === 0) {
    const redirects = [
      ['seo-rdr-01', 'RDR-2026-0001', 'redirect_301', '/jobs/opsc-oas-old', '/jobs-careers/opsc-oas-2026/', 1, 'exact', 342, 'Legacy OPSC OAS slug consolidated to 2026 hub'],
      ['seo-rdr-02', 'RDR-2026-0002', 'redirect_301', '/kalia-yojana', 'https://csodisha.com/schemes/cm-kisan-kalia/', 1, 'exact', 819, 'KALIA merged into CM-Kisan Odisha scheme'],
      ['seo-rdr-03', 'RDR-2026-0003', 'redirect_302', '/ocs-temp-2026', '/study-library/opsc-ocs/', 1, 'exact', 94, 'Temporary campaign redirect during OPSC prelims'],
      ['seo-rdr-04', 'RDR-2026-0004', 'canonical_override', '/study-library/index.html', 'https://csodisha.com/study-library/', 0, 'exact', 210, 'Enforce trailing-slash canonical URL for Study Library']
    ];
    for (const r of redirects) {
      await db.prepare(
        `INSERT INTO seo_redirects_canonicals (id, rule_code, rule_kind, source_path, target_url, preserve_query_string, match_mode, hits_count, reason_note, rule_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active_live')`
      ).bind(...r).run();
    }
  }

  // Seed Module 06: Robots.txt & Crawler Directives
  const robCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_robots_directives`).first();
  if (Number(robCnt?.n || 0) === 0) {
    const directives = [
      ['seo-rob-01', 10, '*', 'Allow', '/', 'core_search_allow', 0, 1],
      ['seo-rob-02', 20, '*', 'Disallow', '/admin/', 'private_area_block', 1, 1],
      ['seo-rob-03', 30, '*', 'Disallow', '/api/', 'private_area_block', 1, 1],
      ['seo-rob-04', 40, '*', 'Disallow', '/candidate/private/', 'private_area_block', 0, 1],
      ['seo-rob-05', 50, 'Googlebot', 'Allow', '/', 'core_search_allow', 0, 1],
      ['seo-rob-06', 60, 'GPTBot', 'Disallow', '/', 'ai_scraper_governance', 0, 1],
      ['seo-rob-07', 70, 'CCBot', 'Disallow', '/', 'ai_scraper_governance', 0, 1],
      ['seo-rob-08', 80, 'Bytespider', 'Crawl-delay', '2', 'crawl_rate_guard', 0, 1]
    ];
    for (const d of directives) {
      await db.prepare(
        `INSERT INTO seo_robots_directives (id, rule_order, user_agent, directive_type, path_or_value, policy_purpose, is_locked_safety_rule, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...d).run();
    }
  }

  // Seed Module 07: Bilingual Search Index & Odia Tokenizer Configs
  const tokCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_search_tokenizer_configs`).first();
  if (Number(tokCnt?.n || 0) === 0) {
    const configs = [
      ['seo-tok-01', 'global_portal_index', 'Global Portal Bilingual Index', 'ସମଗ୍ର ପୋର୍ଟାଲ୍ ଦ୍ୱିଭାଷୀ ସୂଚୀ', 'NFC', 1, 1, 1, 9, 10, 7, 3, 1840],
      ['seo-tok-02', 'study_library_index', 'Study Library & PYQ Index', 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ ଏବଂ PYQ ସୂଚୀ', 'NFC', 1, 1, 1, 10, 10, 8, 2, 920],
      ['seo-tok-03', 'jobs_schemes_index', 'Odisha Jobs & Schemes Index', 'ଓଡ଼ିଶା ଚାକିରି ଏବଂ ଯୋଜନା ସୂଚୀ', 'NFKC', 1, 1, 1, 8, 9, 8, 3, 640]
    ];
    for (const c of configs) {
      await db.prepare(
        `INSERT INTO seo_search_tokenizer_configs (id, index_key, index_name_en, index_name_or, unicode_normalization, odia_matra_folding, strip_odia_stopwords, cross_script_phonetic_bridge, title_weight, odia_title_weight, tags_weight, body_weight, indexed_docs_count, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(...c).run();
    }
  }

  // Seed Module 08: Keyword Boosting & Odisha Exam Synonyms
  const synCnt = await db.prepare(`SELECT COUNT(*) AS n FROM seo_keyword_synonyms`).first();
  if (Number(synCnt?.n || 0) === 0) {
    const synonyms = [
      ['seo-syn-01', 'SYN-OD-001', 'OPSC OCS/OAS', 'OCS', JSON.stringify(['Odisha Civil Services', 'OAS', 'OPSC Administrative Service', 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା']), 35, '/jobs-careers/opsc-ocs/', 1],
      ['seo-syn-02', 'SYN-OD-002', 'OSSC CGL', 'CGL', JSON.stringify(['Combined Graduate Level', 'OSSC CGLRE', 'ଓଡ଼ିଶା ସ୍ନାତକ ସ୍ତରୀୟ ପରୀକ୍ଷା']), 30, '/jobs-careers/ossc-cgl/', 1],
      ['seo-syn-03', 'SYN-OD-003', 'OSSSC RI/ARI/Amin', 'RI', JSON.stringify(['Revenue Inspector', 'OSSSC RI', 'ରାଜସ୍ୱ ନିରୀକ୍ଷକ']), 32, '/jobs-careers/osssc-ri-ari-amin/', 1],
      ['seo-syn-04', 'SYN-OD-004', 'OSSSC RI/ARI/Amin', 'ARI', JSON.stringify(['Assistant Revenue Inspector', 'OSSSC ARI', 'ସହକାରୀ ରାଜସ୍ୱ ନିରୀକ୍ଷକ']), 30, '/jobs-careers/osssc-ri-ari-amin/', 1],
      ['seo-syn-05', 'SYN-OD-005', 'OSSSC RI/ARI/Amin', 'Amin', JSON.stringify(['OSSSC Amin', 'District Revenue Amin', 'ଅମିନ']), 28, '/jobs-careers/osssc-ri-ari-amin/', 1],
      ['seo-syn-06', 'SYN-OD-006', 'NTA UGC NET', 'UGC NET', JSON.stringify(['NET JRF', 'Assistant Professor Eligibility', 'ୟୁଜିସି ନେଟ୍']), 25, '/study-library/ugc-net/', 1],
      ['seo-syn-07', 'SYN-OD-007', 'Odisha Schemes', 'Subhadra', JSON.stringify(['Subhadra Yojana', 'ସୁଭଦ୍ରା ଯୋଜନା', 'Women Welfare Odisha']), 40, '/schemes/subhadra-yojana/', 1]
    ];
    for (const s of synonyms) {
      await db.prepare(
        `INSERT INTO seo_keyword_synonyms (id, synonym_code, exam_or_domain, primary_term, synonyms_json, boost_factor_x10, pinned_target_url, is_bidirectional, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(...s).run();
    }
  }

  _seo2Ready.add(db);
}

/* ================= FULL 8-MODULE OVERVIEW ================= */
export async function getFull8ModuleSeoOverview(db) {
  await ensureSeoSearchDiscoveryBatch2Schema(db);
  const base = await getSeoOverview(db);
  const [rdrAct, rdrTot, robAct, robTot, tokAct, tokTot, synAct, synTot] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM seo_redirects_canonicals WHERE rule_status = 'active_live'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_redirects_canonicals`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_robots_directives WHERE is_active = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_robots_directives`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_search_tokenizer_configs WHERE is_active = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_search_tokenizer_configs`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_keyword_synonyms WHERE is_active = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM seo_keyword_synonyms`).first()
  ]);

  base.modules['05'] = { status: 'active', count: Number(rdrTot?.n || 0) };
  base.modules['06'] = { status: 'active', count: Number(robTot?.n || 0) };
  base.modules['07'] = { status: 'active', count: Number(tokTot?.n || 0) };
  base.modules['08'] = { status: 'active', count: Number(synTot?.n || 0) };

  return {
    ...base,
    active_redirects_canonicals: Number(rdrAct?.n || 0),
    active_robots_rules: Number(robAct?.n || 0),
    active_search_indexes: Number(tokAct?.n || 0),
    active_synonym_clusters: Number(synAct?.n || 0)
  };
}

/* ================= MODULE 05: CANONICALS & REDIRECTS ================= */
async function nextRedirectCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM seo_redirects_canonicals`).first();
  return `RDR-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function validateRedirectRule(db, sourcePath, targetUrl, excludeId = null) {
  const srcNorm = normalizePath(sourcePath);
  const tgtNorm = targetPathOf(targetUrl);
  if (!srcNorm) throw validationError({ source_path: 'Valid source_path starting with / is required' });
  if (!targetUrl || !String(targetUrl).trim()) throw validationError({ target_url: 'target_url is required' });

  if (tgtNorm !== null && srcNorm === tgtNorm) {
    throw new HttpError(400, 'REDIRECT_LOOP', `Self-redirect loop rejected: ${srcNorm} cannot target itself`);
  }

  // Prevent redirect chain or 2-hop cycle among active rules
  if (tgtNorm !== null) {
    const { results: others } = await db.prepare(
      `SELECT id, rule_code, source_path, target_url FROM seo_redirects_canonicals WHERE rule_status != 'archived'`
    ).all();
    for (const row of others || []) {
      if (excludeId && row.id === excludeId) continue;
      const otherSrc = normalizePath(row.source_path);
      const otherTgt = targetPathOf(row.target_url);
      if (otherSrc === tgtNorm) {
        throw new HttpError(400, 'REDIRECT_CHAIN', `Redirect chain detected: target ${tgtNorm} is already a source_path in ${row.rule_code}`);
      }
      if (otherTgt === srcNorm && otherSrc === tgtNorm) {
        throw new HttpError(400, 'REDIRECT_CYCLE', `Redirect cycle detected with ${row.rule_code}`);
      }
    }
  }
  return srcNorm;
}

async function handleRedirects(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const kind = (url.searchParams.get('rule_kind') || '').trim();
    const st = (url.searchParams.get('rule_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (kind) { where.push('rule_kind = ?'); binds.push(kind); }
    if (st) { where.push('rule_status = ?'); binds.push(st); }
    if (q) {
      const pat = `%${likeEscape(q)}%`;
      where.push(`(source_path LIKE ? ESCAPE '\\' OR target_url LIKE ? ESCAPE '\\' OR rule_code LIKE ? ESCAPE '\\')`);
      binds.push(pat, pat, pat);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM seo_redirects_canonicals ${w} ORDER BY updated_at DESC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const kind = pick(body.rule_kind, SEO_RULE_KINDS, 'rule_kind', errors, 'redirect_301');
    const mode = pick(body.match_mode, SEO_MATCH_MODES, 'match_mode', errors, 'exact');
    const st = pick(body.rule_status, SEO_RULE_STATUSES, 'rule_status', errors, 'active_live');
    if (Object.keys(errors).length) throw validationError(errors);

    const tgt = sanitizeSeoText(body.target_url || '', 320);
    const srcNorm = await validateRedirectRule(db, body.source_path, tgt);
    const code = sanitizeSeoText(body.rule_code || '', 40) || (await nextRedirectCode(db));
    const id = rid('seo-rdr');

    try {
      await db.prepare(
        `INSERT INTO seo_redirects_canonicals (id, rule_code, rule_kind, source_path, target_url, preserve_query_string, match_mode, hits_count, reason_note, rule_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      ).bind(
        id, code, kind, srcNorm, tgt,
        body.preserve_query_string === false || body.preserve_query_string === 0 ? 0 : 1,
        mode, sanitizeSeoText(body.reason_note || '', 260), st
      ).run();
    } catch (e) {
      if (String(e.message || '').includes('UNIQUE')) {
        throw new HttpError(409, 'DUPLICATE_SOURCE_PATH', `A rule already exists for ${srcNorm}`);
      }
      throw e;
    }
    await snapshotSeoRevision(db, '05', id, actor, 'create redirect rule');
    await audit(env, request, actor, 'seo.redirect.create', 'seo_redirects_canonicals', id, { source_path: srcNorm, rule_kind: kind });
    const created = await db.prepare(`SELECT * FROM seo_redirects_canonicals WHERE id = ?`).bind(id).first();
    return json({ item: created }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_redirects_canonicals WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Redirect rule not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const kind = body.rule_kind !== undefined ? pick(body.rule_kind, SEO_RULE_KINDS, 'rule_kind', errors, ex.rule_kind) : ex.rule_kind;
    const mode = body.match_mode !== undefined ? pick(body.match_mode, SEO_MATCH_MODES, 'match_mode', errors, ex.match_mode) : ex.match_mode;
    const st = body.rule_status !== undefined ? pick(body.rule_status, SEO_RULE_STATUSES, 'rule_status', errors, ex.rule_status) : ex.rule_status;
    if (Object.keys(errors).length) throw validationError(errors);

    const srcCandidate = body.source_path !== undefined ? body.source_path : ex.source_path;
    const tgtCandidate = body.target_url !== undefined ? sanitizeSeoText(body.target_url, 320) : ex.target_url;
    const srcNorm = await validateRedirectRule(db, srcCandidate, tgtCandidate, sub);

    await snapshotSeoRevision(db, '05', sub, actor, 'update redirect rule');
    await db.prepare(
      `UPDATE seo_redirects_canonicals
       SET rule_kind = ?, source_path = ?, target_url = ?, preserve_query_string = ?, match_mode = ?, reason_note = ?, rule_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      kind, srcNorm, tgtCandidate,
      body.preserve_query_string !== undefined ? (body.preserve_query_string ? 1 : 0) : ex.preserve_query_string,
      mode,
      body.reason_note !== undefined ? sanitizeSeoText(body.reason_note, 260) : ex.reason_note,
      st, sub
    ).run();
    await audit(env, request, actor, 'seo.redirect.update', 'seo_redirects_canonicals', sub, { source_path: srcNorm });
    const updated = await db.prepare(`SELECT * FROM seo_redirects_canonicals WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_redirects_canonicals WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Redirect rule not found');
    const body = await readJson(request, 4000);
    const errors = {};
    const st = pick(body.rule_status, SEO_RULE_STATUSES, 'rule_status', errors, ex.rule_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotSeoRevision(db, '05', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE seo_redirects_canonicals SET rule_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    const updated = await db.prepare(`SELECT * FROM seo_redirects_canonicals WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && !extra && method === 'DELETE') {
    const ex = await db.prepare(`SELECT * FROM seo_redirects_canonicals WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Redirect rule not found');
    await snapshotSeoRevision(db, '05', sub, actor, 'archive redirect rule');
    await db.prepare(`UPDATE seo_redirects_canonicals SET rule_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, rule_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 06: ROBOTS.TXT STUDIO ================= */
export function compileRobotsTxt(rules) {
  const active = (rules || []).filter(r => Number(r.is_active) === 1);
  const byUa = new Map();
  for (const r of active) {
    const ua = r.user_agent || '*';
    if (!byUa.has(ua)) byUa.set(ua, []);
    byUa.get(ua).push(r);
  }
  const blocks = [];
  for (const [ua, list] of byUa.entries()) {
    const lines = [`User-agent: ${ua}`];
    for (const item of list) {
      lines.push(`${item.directive_type}: ${item.path_or_value}`);
    }
    blocks.push(lines.join('\n'));
  }
  blocks.push('Sitemap: https://csodisha.com/sitemap-index.xml');
  return blocks.join('\n\n') + '\n';
}

function isProtectedAdminOrApiAllow(directiveType, pathVal) {
  if (directiveType !== 'Allow') return false;
  const p = String(pathVal || '').trim().toLowerCase();
  return p.startsWith('/admin') || p.startsWith('/api');
}

async function handleRobots(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const ua = (url.searchParams.get('user_agent') || '').trim();
    const { results: allRules } = await db.prepare(`SELECT * FROM seo_robots_directives ORDER BY rule_order ASC, id ASC`).all();
    const filtered = ua ? (allRules || []).filter(r => r.user_agent === ua) : (allRules || []);
    return json({
      items: filtered,
      compiled_robots_txt: compileRobotsTxt(allRules || [])
    });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 8000);
    const errors = {};
    const dir = pick(body.directive_type, SEO_ROBOTS_DIRECTIVES, 'directive_type', errors, 'Disallow');
    const purpose = pick(body.policy_purpose, SEO_ROBOTS_PURPOSES, 'policy_purpose', errors, 'core_search_allow');
    const ua = sanitizeSeoText(body.user_agent || '*', 80) || '*';
    const pathVal = sanitizeSeoText(body.path_or_value || '', 180);
    if (!pathVal) errors.path_or_value = 'path_or_value is required';
    if (isProtectedAdminOrApiAllow(dir, pathVal)) {
      errors.path_or_value = 'Cannot Allow /admin or /api paths in robots.txt';
    }
    if (Object.keys(errors).length) throw validationError(errors);

    const id = rid('seo-rob');
    const order = Math.max(1, Math.min(999, Number(body.rule_order || 90)));
    await db.prepare(
      `INSERT INTO seo_robots_directives (id, rule_order, user_agent, directive_type, path_or_value, policy_purpose, is_locked_safety_rule, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(id, order, ua, dir, pathVal, purpose, body.is_active === false || body.is_active === 0 ? 0 : 1).run();
    await snapshotSeoRevision(db, '06', id, actor, 'create robots directive');
    await audit(env, request, actor, 'seo.robots.create', 'seo_robots_directives', id, { user_agent: ua, directive_type: dir, path_or_value: pathVal });
    const created = await db.prepare(`SELECT * FROM seo_robots_directives WHERE id = ?`).bind(id).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_robots_directives WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Robots directive not found');
    const body = await readJson(request, 8000);

    if (Number(ex.is_locked_safety_rule) === 1) {
      if (body.is_active === false || body.is_active === 0 ||
          (body.directive_type !== undefined && body.directive_type !== ex.directive_type) ||
          (body.path_or_value !== undefined && body.path_or_value !== ex.path_or_value)) {
        throw new HttpError(409, 'SAFETY_RULE_LOCKED', `Safety rule ${ex.path_or_value} is locked and cannot be disabled or altered`);
      }
    }

    const errors = {};
    const dir = body.directive_type !== undefined ? pick(body.directive_type, SEO_ROBOTS_DIRECTIVES, 'directive_type', errors, ex.directive_type) : ex.directive_type;
    const purpose = body.policy_purpose !== undefined ? pick(body.policy_purpose, SEO_ROBOTS_PURPOSES, 'policy_purpose', errors, ex.policy_purpose) : ex.policy_purpose;
    const pathVal = body.path_or_value !== undefined ? sanitizeSeoText(body.path_or_value, 180) : ex.path_or_value;
    if (isProtectedAdminOrApiAllow(dir, pathVal)) {
      errors.path_or_value = 'Cannot Allow /admin or /api paths in robots.txt';
    }
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotSeoRevision(db, '06', sub, actor, 'update robots directive');
    await db.prepare(
      `UPDATE seo_robots_directives
       SET rule_order = ?, user_agent = ?, directive_type = ?, path_or_value = ?, policy_purpose = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.rule_order !== undefined ? Math.max(1, Math.min(999, Number(body.rule_order))) : ex.rule_order,
      body.user_agent !== undefined ? sanitizeSeoText(body.user_agent, 80) : ex.user_agent,
      dir, pathVal, purpose,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : ex.is_active,
      sub
    ).run();
    await audit(env, request, actor, 'seo.robots.update', 'seo_robots_directives', sub, {});
    const updated = await db.prepare(`SELECT * FROM seo_robots_directives WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && method === 'DELETE') {
    const ex = await db.prepare(`SELECT * FROM seo_robots_directives WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Robots directive not found');
    if (Number(ex.is_locked_safety_rule) === 1) {
      throw new HttpError(409, 'SAFETY_RULE_LOCKED', `Safety rule protecting ${ex.path_or_value} cannot be deleted`);
    }
    await snapshotSeoRevision(db, '06', sub, actor, 'delete robots directive');
    await db.prepare(`DELETE FROM seo_robots_directives WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'seo.robots.delete', 'seo_robots_directives', sub, { path_or_value: ex.path_or_value });
    return json({ ok: true, id: sub });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 07: ODIA TOKENIZER & SEARCH INDEX ================= */
const ODIA_STOPWORDS = new Set(['ଏବଂ', 'ଓ', 'ର', 'କୁ', 'ରେ', 'ପାଇଁ', 'ଏହି', 'ସେ', 'the', 'and', 'of', 'in', 'for', 'to', 'a', 'an']);
const CROSS_SCRIPT_MAP = {
  'ଓଡ଼ିଶା': ['odisha', 'orissa'],
  'ଓଡିଶା': ['odisha', 'orissa'],
  'ଚାକିରି': ['chakiri', 'jobs', 'recruitment'],
  'ଯୋଜନା': ['yojana', 'scheme', 'schemes'],
  'ପରୀକ୍ଷା': ['pariksha', 'exam', 'exams'],
  'ବୃତ୍ତି': ['scholarship', 'brutti'],
  'odisha': ['ଓଡ଼ିଶା'],
  'jobs': ['ଚାକିରି'],
  'yojana': ['ଯୋଜନା'],
  'scheme': ['ଯୋଜନା']
};

export function tokenizeBilingualQuery(text, cfg = {}) {
  const form = cfg.unicode_normalization === 'NFKC' ? 'NFKC' : 'NFC';
  let normalized = sanitizeSeoText(text || '', 400).normalize(form);
  if (Number(cfg.odia_matra_folding ?? 1) === 1) {
    normalized = normalized
      .replace(/ଡ଼/g, 'ଡ')
      .replace(/ଢ଼/g, 'ଢ')
      .replace(/ୟ/g, 'ଯ')
      .replace(/ଁ/g, 'ଂ');
  }
  const rawTokens = normalized
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'\/\\|+-]+/)
    .filter(Boolean);

  const stripStop = Number(cfg.strip_odia_stopwords ?? 1) === 1;
  const tokens = stripStop ? rawTokens.filter(t => !ODIA_STOPWORDS.has(t)) : rawTokens;

  const bridgeTokens = [];
  if (Number(cfg.cross_script_phonetic_bridge ?? 1) === 1) {
    for (const tok of tokens) {
      const mapped = CROSS_SCRIPT_MAP[tok];
      if (mapped) {
        for (const m of mapped) {
          if (!bridgeTokens.includes(m)) bridgeTokens.push(m);
        }
      }
    }
  }

  return {
    unicode_normalization: form,
    normalized_text: normalized,
    raw_token_count: rawTokens.length,
    tokens,
    bridge_tokens: bridgeTokens,
    weights: {
      title_weight: Number(cfg.title_weight ?? 8),
      odia_title_weight: Number(cfg.odia_title_weight ?? 9),
      tags_weight: Number(cfg.tags_weight ?? 6),
      body_weight: Number(cfg.body_weight ?? 2)
    }
  };
}

async function handleTokenizer(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM seo_search_tokenizer_configs ORDER BY id ASC`).all();
    return json({ items: results || [] });
  }

  if (sub === 'test-tokenize' && method === 'POST') {
    const body = await readJson(request, 8000);
    const query = String(body.query || '');
    if (!query.trim()) throw validationError({ query: 'query is required' });
    let cfg = null;
    if (body.index_key) {
      cfg = await db.prepare(`SELECT * FROM seo_search_tokenizer_configs WHERE index_key = ?`).bind(cleanStr(body.index_key, 80)).first();
    }
    if (!cfg) {
      cfg = await db.prepare(`SELECT * FROM seo_search_tokenizer_configs WHERE is_active = 1 ORDER BY id ASC LIMIT 1`).first();
    }
    const mergedCfg = { ...(cfg || {}), ...(body.overrides || {}) };
    return json({
      index_key: cfg?.index_key || 'global_portal_index',
      ...tokenizeBilingualQuery(query, mergedCfg)
    });
  }

  if (sub && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_search_tokenizer_configs WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Tokenizer config not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const norm = body.unicode_normalization !== undefined
      ? pick(body.unicode_normalization, SEO_UNICODE_FORMS, 'unicode_normalization', errors, ex.unicode_normalization)
      : ex.unicode_normalization;
    if (Object.keys(errors).length) throw validationError(errors);

    const clamp = (v, min, max, def) => v !== undefined ? Math.min(max, Math.max(min, Number(v))) : def;
    await snapshotSeoRevision(db, '07', sub, actor, 'update tokenizer config');
    await db.prepare(
      `UPDATE seo_search_tokenizer_configs
       SET unicode_normalization = ?, odia_matra_folding = ?, strip_odia_stopwords = ?, cross_script_phonetic_bridge = ?,
           title_weight = ?, odia_title_weight = ?, tags_weight = ?, body_weight = ?, is_active = ?,
           last_reindexed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      norm,
      body.odia_matra_folding !== undefined ? (body.odia_matra_folding ? 1 : 0) : ex.odia_matra_folding,
      body.strip_odia_stopwords !== undefined ? (body.strip_odia_stopwords ? 1 : 0) : ex.strip_odia_stopwords,
      body.cross_script_phonetic_bridge !== undefined ? (body.cross_script_phonetic_bridge ? 1 : 0) : ex.cross_script_phonetic_bridge,
      clamp(body.title_weight, 1, 10, ex.title_weight),
      clamp(body.odia_title_weight, 1, 10, ex.odia_title_weight),
      clamp(body.tags_weight, 1, 10, ex.tags_weight),
      clamp(body.body_weight, 1, 5, ex.body_weight),
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : ex.is_active,
      sub
    ).run();
    await audit(env, request, actor, 'seo.tokenizer.update', 'seo_search_tokenizer_configs', sub, { unicode_normalization: norm });
    const updated = await db.prepare(`SELECT * FROM seo_search_tokenizer_configs WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 08: KEYWORD BOOSTING & SYNONYMS ================= */
async function nextSynonymCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM seo_keyword_synonyms`).first();
  return `SYN-OD-${String(Number(r?.n || 0) + 1).padStart(3, '0')}`;
}

function formatSynonymRow(row) {
  if (!row) return null;
  return {
    ...row,
    synonyms: parseJson(row.synonyms_json, []),
    boost_factor: Number((Number(row.boost_factor_x10 || 10) / 10).toFixed(1))
  };
}

async function handleSynonyms(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const dom = (url.searchParams.get('exam_or_domain') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (dom) { where.push('exam_or_domain = ?'); binds.push(dom); }
    if (q) {
      const pat = `%${likeEscape(q)}%`;
      where.push(`(primary_term LIKE ? ESCAPE '\\' OR synonyms_json LIKE ? ESCAPE '\\' OR exam_or_domain LIKE ? ESCAPE '\\')`);
      binds.push(pat, pat, pat);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM seo_keyword_synonyms ${w} ORDER BY boost_factor_x10 DESC, synonym_code ASC`).bind(...binds).all();
    return json({ items: (results || []).map(formatSynonymRow) });
  }

  if (sub === 'expand-query' && method === 'POST') {
    const body = await readJson(request, 8000);
    const query = sanitizeSeoText(body.query || '', 240);
    if (!query) throw validationError({ query: 'query is required' });
    const qLower = query.toLowerCase();
    const qTokens = qLower.split(/[\s,]+/).filter(Boolean);

    const { results: allSyns } = await db.prepare(`SELECT * FROM seo_keyword_synonyms WHERE is_active = 1`).all();
    const matchedClusters = [];
    const expandedSet = new Set(qTokens);
    let maxBoost = 1.0;

    for (const row of allSyns || []) {
      const syns = parseJson(row.synonyms_json, []);
      const pLower = String(row.primary_term || '').toLowerCase();
      const hitPrimary = qTokens.includes(pLower) || qLower.includes(pLower);
      const hitSyn = Number(row.is_bidirectional) === 1 && syns.some(s => qLower.includes(String(s).toLowerCase()));
      if (hitPrimary || hitSyn) {
        const boost = Number((Number(row.boost_factor_x10 || 10) / 10).toFixed(1));
        if (boost > maxBoost) maxBoost = boost;
        expandedSet.add(row.primary_term);
        syns.forEach(s => expandedSet.add(s));
        matchedClusters.push({
          synonym_code: row.synonym_code,
          exam_or_domain: row.exam_or_domain,
          primary_term: row.primary_term,
          boost_factor: boost,
          pinned_target_url: row.pinned_target_url
        });
      }
    }

    return json({
      original_query: query,
      expanded_terms: Array.from(expandedSet),
      max_boost_factor: maxBoost,
      matched_clusters: matchedClusters
    });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const dom = sanitizeSeoText(body.exam_or_domain || '', 80);
    const term = sanitizeSeoText(body.primary_term || '', 80);
    if (!dom) errors.exam_or_domain = 'exam_or_domain is required';
    if (!term) errors.primary_term = 'primary_term is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const rawSyns = Array.isArray(body.synonyms)
      ? body.synonyms
      : String(body.synonyms || '').split(',').map(s => s.trim()).filter(Boolean);
    const syns = rawSyns.map(s => sanitizeSeoText(s, 100)).filter(Boolean);
    const boostX10 = Math.min(50, Math.max(10, Math.round(Number(body.boost_factor || 2.0) * 10)));
    const code = sanitizeSeoText(body.synonym_code || '', 40) || (await nextSynonymCode(db));
    const id = rid('seo-syn');

    await db.prepare(
      `INSERT INTO seo_keyword_synonyms (id, synonym_code, exam_or_domain, primary_term, synonyms_json, boost_factor_x10, pinned_target_url, is_bidirectional, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(
      id, code, dom, term, JSON.stringify(syns), boostX10,
      sanitizeSeoText(body.pinned_target_url || '', 240),
      body.is_bidirectional === false || body.is_bidirectional === 0 ? 0 : 1
    ).run();
    await snapshotSeoRevision(db, '08', id, actor, 'create synonym cluster');
    await audit(env, request, actor, 'seo.synonym.create', 'seo_keyword_synonyms', id, { primary_term: term });
    const created = await db.prepare(`SELECT * FROM seo_keyword_synonyms WHERE id = ?`).bind(id).first();
    return json({ item: formatSynonymRow(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM seo_keyword_synonyms WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Synonym cluster not found');
    const body = await readJson(request, 12000);
    const rawSyns = body.synonyms !== undefined
      ? (Array.isArray(body.synonyms) ? body.synonyms : String(body.synonyms).split(',').map(s => s.trim()).filter(Boolean))
      : parseJson(ex.synonyms_json, []);
    const syns = rawSyns.map(s => sanitizeSeoText(s, 100)).filter(Boolean);
    const boostX10 = body.boost_factor !== undefined
      ? Math.min(50, Math.max(10, Math.round(Number(body.boost_factor) * 10)))
      : ex.boost_factor_x10;

    await snapshotSeoRevision(db, '08', sub, actor, 'update synonym cluster');
    await db.prepare(
      `UPDATE seo_keyword_synonyms
       SET exam_or_domain = ?, primary_term = ?, synonyms_json = ?, boost_factor_x10 = ?, pinned_target_url = ?, is_bidirectional = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.exam_or_domain !== undefined ? sanitizeSeoText(body.exam_or_domain, 80) : ex.exam_or_domain,
      body.primary_term !== undefined ? sanitizeSeoText(body.primary_term, 80) : ex.primary_term,
      JSON.stringify(syns),
      boostX10,
      body.pinned_target_url !== undefined ? sanitizeSeoText(body.pinned_target_url, 240) : ex.pinned_target_url,
      body.is_bidirectional !== undefined ? (body.is_bidirectional ? 1 : 0) : ex.is_bidirectional,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : ex.is_active,
      sub
    ).run();
    await audit(env, request, actor, 'seo.synonym.update', 'seo_keyword_synonyms', sub, {});
    const updated = await db.prepare(`SELECT * FROM seo_keyword_synonyms WHERE id = ?`).bind(sub).first();
    return json({ item: formatSynonymRow(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM seo_keyword_synonyms WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Synonym cluster not found');
    const body = await readJson(request, 4000);
    const active = body.is_active === false || body.is_active === 0 ? 0 : 1;
    await snapshotSeoRevision(db, '08', sub, actor, `is_active -> ${active}`);
    await db.prepare(`UPDATE seo_keyword_synonyms SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).bind(active, sub).run();
    const updated = await db.prepare(`SELECT * FROM seo_keyword_synonyms WHERE id = ?`).bind(sub).first();
    return json({ item: formatSynonymRow(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    const ex = await db.prepare(`SELECT * FROM seo_keyword_synonyms WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Synonym cluster not found');
    await snapshotSeoRevision(db, '08', sub, actor, 'archive synonym cluster');
    await db.prepare(`UPDATE seo_keyword_synonyms SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, is_active: 0 });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleSeoSearchDiscoveryBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureSeoSearchDiscoveryBatch2Schema(env.DB);
  let res = null;
  if (id === 'redirects') res = await handleRedirects(request, env, actor, sub, extra);
  else if (id === 'robots') res = await handleRobots(request, env, actor, sub);
  else if (id === 'tokenizer') res = await handleTokenizer(request, env, actor, sub);
  else if (id === 'synonyms') res = await handleSynonyms(request, env, actor, sub, extra);
  else throw new HttpError(404, 'NOT_FOUND', 'Unknown SEO Batch 2 route');
  if (request.method !== 'GET' && request.method !== 'HEAD' && res && res.status >= 200 && res.status < 300) {
    await invalidateEdgePaths(request, SEO_PUBLIC_PATHS);
  }
  return res;
}

/* ================= PUBLIC EDGE-CACHED ROBOTS.TXT ================= */
export async function handlePublicSeoRobotsTxt(request, env) {
  await ensureSeoSearchDiscoveryBatch2Schema(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT * FROM seo_robots_directives WHERE is_active = 1 ORDER BY rule_order ASC, id ASC`
  ).all();
  const txt = compileRobotsTxt(results || []);
  return new Response(txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600'
    }
  });
}
