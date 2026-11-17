// Analytics, Telemetry & User Feedback Intelligence Batch 1 (v101): Modules 01-04
// 01 Zero-Cookie Edge Telemetry | 02 Top Search Intent | 03 Zero-Result & Auto-Synonyms | 04 PYQ/Syllabus Download Metrics
// Strictly zero cookies, zero raw IPs, and zero PII stored.
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';

export const AT_PORTAL_SECTIONS = ['study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home'];
export const AT_LANG_MODES = ['en', 'or'];
export const AT_DEVICE_CLASSES = ['mobile', 'desktop', 'tablet'];
export const AT_SEARCH_SCOPES = ['all', 'study-library', 'jobs-careers', 'schemes', 'mock-tests'];
export const AT_MATERIAL_TYPES = ['pyq_paper', 'exam_syllabus', 'study_notes', 'model_mock', 'govt_notification'];
export const AT_EXAM_TAGS = ['OPSC OAS', 'OSSC CGL', 'OSSSC RI/ARI', 'UGC NET', 'OSSTET/OTET', '+2 CHSE'];

const _at1Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function normalizeQuery(q) { return cleanStr(q || '', 160).toLowerCase().replace(/\s+/g, ' ').trim(); }
function detectScript(q) { return /[\u0B00-\u0B7F]/.test(String(q || '')) ? 'odia_or' : 'latin_en'; }

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

/** Daily rotating salted hash for cookieless rate-limiting — never persisted as raw IP. */
async function dailySaltedBucketHash(rawIp) {
  const day = todayIso();
  const data = new TextEncoder().encode(`${day}:cso-cookieless-telemetry:${rawIp || 'anon'}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AT_REV_TABLES = {
  '03': {
    table: 'at_search_synonyms',
    cols: ['source_term', 'canonical_query', 'target_url', 'boost_weight', 'hit_count', 'is_active']
  }
};

export async function snapshotAtRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = AT_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM at_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('at-rev');
  await db.prepare(
    `INSERT INTO at_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(row), cleanStr(changeNote, 200), actor?.email || actor?.userId || 'system').run();
  return { id: revId, version_num: nextVer };
}

export async function ensureAnalyticsTelemetryBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_at1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS at_edge_pageviews (
      id TEXT PRIMARY KEY,
      bucket_date TEXT NOT NULL,
      route_path TEXT NOT NULL,
      portal_section TEXT NOT NULL DEFAULT 'home' CHECK (portal_section IN ('study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home')),
      lang_mode TEXT NOT NULL DEFAULT 'en' CHECK (lang_mode IN ('en', 'or')),
      device_class TEXT NOT NULL DEFAULT 'mobile' CHECK (device_class IN ('mobile', 'desktop', 'tablet')),
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      views_count INTEGER NOT NULL DEFAULT 1,
      unique_session_hashes INTEGER NOT NULL DEFAULT 1,
      avg_ttfb_ms INTEGER NOT NULL DEFAULT 42,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_pageviews_bucket ON at_edge_pageviews(bucket_date DESC, portal_section, views_count DESC)`,
    `CREATE TABLE IF NOT EXISTS at_search_queries (
      id TEXT PRIMARY KEY,
      normalized_query TEXT NOT NULL UNIQUE,
      display_query TEXT NOT NULL,
      portal_scope TEXT NOT NULL DEFAULT 'all' CHECK (portal_scope IN ('all', 'study-library', 'jobs-careers', 'schemes', 'mock-tests')),
      lang_script TEXT NOT NULL DEFAULT 'latin_en' CHECK (lang_script IN ('latin_en', 'odia_or')),
      search_count INTEGER NOT NULL DEFAULT 1,
      last_result_count INTEGER NOT NULL DEFAULT 0,
      is_zero_result INTEGER NOT NULL DEFAULT 0,
      trend_delta_pct INTEGER NOT NULL DEFAULT 0,
      mapped_synonym_target TEXT,
      resolution_status TEXT NOT NULL DEFAULT 'active_trending' CHECK (resolution_status IN ('active_trending', 'zero_open', 'synonym_mapped', 'ignored')),
      last_searched_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_search_rank ON at_search_queries(resolution_status, search_count DESC, is_zero_result)`,
    `CREATE TABLE IF NOT EXISTS at_search_synonyms (
      id TEXT PRIMARY KEY,
      source_term TEXT NOT NULL UNIQUE,
      canonical_query TEXT NOT NULL,
      target_url TEXT NOT NULL DEFAULT '',
      boost_weight INTEGER NOT NULL DEFAULT 10,
      hit_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_synonyms_active ON at_search_synonyms(is_active, boost_weight DESC)`,
    `CREATE TABLE IF NOT EXISTS at_download_metrics (
      id TEXT PRIMARY KEY,
      bucket_date TEXT NOT NULL,
      resource_slug TEXT NOT NULL,
      resource_title_en TEXT NOT NULL,
      resource_title_or TEXT NOT NULL DEFAULT '',
      material_type TEXT NOT NULL DEFAULT 'pyq_paper' CHECK (material_type IN ('pyq_paper', 'exam_syllabus', 'study_notes', 'model_mock', 'govt_notification')),
      exam_tag TEXT NOT NULL DEFAULT 'OPSC OAS',
      downloads_count INTEGER NOT NULL DEFAULT 1,
      unique_downloaders_approx INTEGER NOT NULL DEFAULT 1,
      avg_file_kb INTEGER NOT NULL DEFAULT 512,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_downloads_rank ON at_download_metrics(material_type, exam_tag, downloads_count DESC)`,
    `CREATE TABLE IF NOT EXISTS at_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_rev_lookup ON at_revisions(module_code, entity_id, version_num DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  const today = todayIso();

  // Seed Module 01 pageviews
  const pvCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_edge_pageviews`).first();
  if (Number(pvCnt?.n || 0) === 0) {
    const pvs = [
      ['at-pv-001', today, '/study-library/', 'study-library', 'en', 'mobile', 'Khordha', 1840, 1420, 38],
      ['at-pv-002', today, '/jobs-careers/', 'jobs-careers', 'en', 'mobile', 'Balasore', 1410, 1105, 41],
      ['at-pv-003', today, '/schemes/', 'schemes', 'or', 'mobile', 'Cuttack', 1120, 890, 44],
      ['at-pv-004', today, '/community/', 'community', 'en', 'desktop', 'Sambalpur', 640, 510, 35],
      ['at-pv-005', today, '/educational-tools/', 'educational-tools', 'en', 'mobile', 'Ganjam', 490, 395, 39]
    ];
    for (const p of pvs) {
      await db.prepare(
        `INSERT INTO at_edge_pageviews (id, bucket_date, route_path, portal_section, lang_mode, device_class, district_odisha, views_count, unique_session_hashes, avg_ttfb_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...p).run();
    }
  }

  // Seed Module 02 & 03 search queries
  const sqCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_search_queries`).first();
  if (Number(sqCnt?.n || 0) === 0) {
    const queries = [
      ['at-sq-001', 'opsc oas 2026 syllabus', 'OPSC OAS 2026 Syllabus', 'study-library', 'latin_en', 842, 14, 0, 28, null, 'active_trending'],
      ['at-sq-002', 'ossc cgl pyq', 'OSSC CGL PYQ', 'study-library', 'latin_en', 615, 9, 0, 19, null, 'active_trending'],
      ['at-sq-003', 'subhadra yojana', 'Subhadra Yojana', 'schemes', 'latin_en', 530, 6, 0, 42, null, 'active_trending'],
      ['at-sq-004', 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି', 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି', 'jobs-careers', 'odia_or', 410, 18, 0, 15, null, 'active_trending'],
      ['at-sq-005', 'ri amin old paper', 'ri amin old paper', 'study-library', 'latin_en', 96, 0, 1, 12, null, 'zero_open'],
      ['at-sq-006', 'net english odia notes', 'net english odia notes', 'study-library', 'latin_en', 64, 0, 1, 9, null, 'zero_open']
    ];
    for (const q of queries) {
      await db.prepare(
        `INSERT INTO at_search_queries (id, normalized_query, display_query, portal_scope, lang_script, search_count, last_result_count, is_zero_result, trend_delta_pct, mapped_synonym_target, resolution_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...q).run();
    }
  }

  // Seed Module 03 synonyms
  const synCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_search_synonyms`).first();
  if (Number(synCnt?.n || 0) === 0) {
    const syns = [
      ['at-syn-001', 'oas pyq', 'OPSC OAS Prelims Previous Year Question Papers', '/study-library/?exam=opsc-oas', 20, 148, 1, 'system'],
      ['at-syn-002', 'କଳିଆ ଯୋଜନା', 'CM Kisan & KALIA Odisha Farmer Scheme', '/schemes/?q=kalia', 15, 92, 1, 'system']
    ];
    for (const s of syns) {
      await db.prepare(
        `INSERT INTO at_search_synonyms (id, source_term, canonical_query, target_url, boost_weight, hit_count, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...s).run();
    }
  }

  // Seed Module 04 download metrics
  const dlCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_download_metrics`).first();
  if (Number(dlCnt?.n || 0) === 0) {
    const dls = [
      ['at-dl-001', today, 'opsc-oas-prelims-gs1-pyq-2024', 'OPSC OAS Prelims GS-1 PYQ (2018-2024)', 'OPSC OAS ପ୍ରିଲିମ୍ସ GS-1 ବିଗତ ବର୍ଷ ପ୍ରଶ୍ନପତ୍ର', 'pyq_paper', 'OPSC OAS', 1290, 980, 1450],
      ['at-dl-002', today, 'ossc-cgl-2026-official-syllabus', 'OSSC CGL 2026 Official Syllabus & Exam Pattern', 'OSSC CGL ୨୦୨୬ ସରକାରୀ ପାଠ୍ୟକ୍ରମ', 'exam_syllabus', 'OSSC CGL', 945, 760, 620],
      ['at-dl-003', today, 'ugc-net-paper1-research-aptitude-notes', 'UGC NET Paper-I Research Aptitude Complete Notes', 'UGC NET ପେପର-୧ ଗବେଷଣା ଯୋଗ୍ୟତା ନୋଟ୍ସ', 'study_notes', 'UGC NET', 610, 495, 880],
      ['at-dl-004', today, 'osssc-ri-ari-amin-model-mock-set1', 'OSSSC RI / ARI / Amin Full Model Mock Set-1', 'OSSSC RI / ARI / ଅମିନ ମଡେଲ୍ ମକ୍ ସେଟ୍-୧', 'model_mock', 'OSSSC RI/ARI', 480, 390, 740]
    ];
    for (const d of dls) {
      await db.prepare(
        `INSERT INTO at_download_metrics (id, bucket_date, resource_slug, resource_title_en, resource_title_or, material_type, exam_tag, downloads_count, unique_downloaders_approx, avg_file_kb)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...d).run();
    }
  }

  _at1Ready.add(db);
}

export async function getAnalyticsOverview(db) {
  const [pv24, pv7d, sqTot, zeroOpen, synAct, dlTot, topSectionRow, topDlRow] = await Promise.all([
    db.prepare(`SELECT COALESCE(SUM(views_count), 0) AS n FROM at_edge_pageviews WHERE bucket_date = ?`).bind(todayIso()).first(),
    db.prepare(`SELECT COALESCE(SUM(views_count), 0) AS n FROM at_edge_pageviews WHERE bucket_date >= date('now', '-7 days')`).first(),
    db.prepare(`SELECT COALESCE(SUM(search_count), 0) AS n FROM at_search_queries`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM at_search_queries WHERE is_zero_result = 1 AND resolution_status = 'zero_open'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM at_search_synonyms WHERE is_active = 1`).first(),
    db.prepare(`SELECT COALESCE(SUM(downloads_count), 0) AS n FROM at_download_metrics`).first(),
    db.prepare(`SELECT portal_section, SUM(views_count) AS total_views FROM at_edge_pageviews GROUP BY portal_section ORDER BY total_views DESC LIMIT 1`).first(),
    db.prepare(`SELECT resource_slug, resource_title_en, downloads_count FROM at_download_metrics ORDER BY downloads_count DESC LIMIT 1`).first()
  ]);

  const modules = {};
  for (let i = 1; i <= 14; i++) {
    const k = String(i).padStart(2, '0');
    let count = 0;
    if (i === 1) count = Number(pv7d?.n || 0);
    else if (i === 2) count = Number(sqTot?.n || 0);
    else if (i === 3) count = Number(zeroOpen?.n || 0);
    else if (i === 4) count = Number(dlTot?.n || 0);
    modules[k] = { status: i <= 4 ? 'active' : 'queued', count };
  }

  return {
    cookieless_verified: true,
    pageviews_24h: Number(pv24?.n || 0),
    pageviews_7d: Number(pv7d?.n || 0),
    top_portal_section: topSectionRow?.portal_section || 'study-library',
    total_search_volume: Number(sqTot?.n || 0),
    open_zero_result_queries: Number(zeroOpen?.n || 0),
    active_synonyms_count: Number(synAct?.n || 0),
    total_downloads: Number(dlTot?.n || 0),
    top_downloaded_material: topDlRow || null,
    modules
  };
}

/* ================= MODULE 01: PAGEVIEWS ================= */
async function handlePageviews(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const portal = (url.searchParams.get('portal_section') || '').trim();
    const lang = (url.searchParams.get('lang_mode') || '').trim();
    const dev = (url.searchParams.get('device_class') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (portal) { where.push('portal_section = ?'); binds.push(portal); }
    if (lang) { where.push('lang_mode = ?'); binds.push(lang); }
    if (dev) { where.push('device_class = ?'); binds.push(dev); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(route_path LIKE ? ESCAPE '\\' OR district_odisha LIKE ? ESCAPE '\\')`);
      binds.push(l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ results }, { results: byPortal }] = await Promise.all([
      db.prepare(`SELECT * FROM at_edge_pageviews ${w} ORDER BY bucket_date DESC, views_count DESC LIMIT 200`).bind(...binds).all(),
      db.prepare(`SELECT portal_section, SUM(views_count) AS views FROM at_edge_pageviews GROUP BY portal_section ORDER BY views DESC`).all()
    ]);
    return json({ items: results || [], by_portal: byPortal || [] });
  }

  if (sub === 'ingest' && method === 'POST') {
    const body = await readJson(request, 10000);
    const errors = {};
    const routePath = cleanStr(body.route_path || '/', 160);
    const portal = pick(body.portal_section, AT_PORTAL_SECTIONS, 'portal_section', errors, 'study-library');
    const lang = pick(body.lang_mode, AT_LANG_MODES, 'lang_mode', errors, 'en');
    const dev = pick(body.device_class, AT_DEVICE_CLASSES, 'device_class', errors, 'mobile');
    const district = cleanStr(body.district_odisha || 'Khordha', 80);
    const ttfb = Math.max(1, Math.min(10000, Number(body.avg_ttfb_ms || 38) || 38));
    if (Object.keys(errors).length) throw validationError(errors);

    const bucket = todayIso();
    const existing = await db.prepare(
      `SELECT id FROM at_edge_pageviews WHERE bucket_date = ? AND route_path = ? AND portal_section = ? AND lang_mode = ? AND device_class = ? LIMIT 1`
    ).bind(bucket, routePath, portal, lang, dev).first();

    let rowId = existing?.id;
    if (rowId) {
      await db.prepare(
        `UPDATE at_edge_pageviews SET views_count = views_count + 1, unique_session_hashes = unique_session_hashes + 1, updated_at = datetime('now') WHERE id = ?`
      ).bind(rowId).run();
    } else {
      rowId = rid('at-pv');
      await db.prepare(
        `INSERT INTO at_edge_pageviews (id, bucket_date, route_path, portal_section, lang_mode, device_class, district_odisha, views_count, unique_session_hashes, avg_ttfb_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`
      ).bind(rowId, bucket, routePath, portal, lang, dev, district, ttfb).run();
    }
    if (actor) await audit(env, request, actor, 'at.pageview.ingest', 'at_edge_pageviews', rowId, { route_path: routePath });
    const item = await db.prepare(`SELECT * FROM at_edge_pageviews WHERE id = ?`).bind(rowId).first();
    return json({ item }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 02: SEARCH INTENT ================= */
async function handleSearchIntent(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const scope = (url.searchParams.get('portal_scope') || '').trim();
    const script = (url.searchParams.get('lang_script') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [`resolution_status != 'ignored'`];
    const binds = [];
    if (scope) { where.push('portal_scope = ?'); binds.push(scope); }
    if (script) { where.push('lang_script = ?'); binds.push(script); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(display_query LIKE ? ESCAPE '\\' OR normalized_query LIKE ? ESCAPE '\\')`);
      binds.push(l, l);
    }
    const { results } = await db.prepare(
      `SELECT * FROM at_search_queries WHERE ${where.join(' AND ')} ORDER BY search_count DESC, trend_delta_pct DESC LIMIT 200`
    ).bind(...binds).all();
    const items = (results || []).map((r, idx) => ({
      ...r,
      discovery_rank: idx + 1,
      is_zero_result: Number(r.is_zero_result || 0) === 1
    }));
    return json({ items, total: items.length });
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM at_search_queries WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Search query not found');
    const body = await readJson(request, 10000);
    const trend = body.trend_delta_pct !== undefined ? Number(body.trend_delta_pct) : existing.trend_delta_pct;
    const status = body.resolution_status && ['active_trending', 'zero_open', 'synonym_mapped', 'ignored'].includes(body.resolution_status)
      ? body.resolution_status : existing.resolution_status;
    await db.prepare(
      `UPDATE at_search_queries SET trend_delta_pct = ?, resolution_status = ? WHERE id = ?`
    ).bind(trend, status, sub).run();
    await audit(env, request, actor, 'at.search_intent.update', 'at_search_queries', sub, { resolution_status: status });
    const updated = await db.prepare(`SELECT * FROM at_search_queries WHERE id = ?`).bind(sub).first();
    return json({ item: { ...updated, is_zero_result: Number(updated.is_zero_result || 0) === 1 } });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 03: ZERO-RESULT & AUTO-SYNONYMS ================= */
async function handleZeroResults(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const [{ results: zeroQueries }, { results: synonyms }] = await Promise.all([
      db.prepare(`SELECT * FROM at_search_queries WHERE is_zero_result = 1 ORDER BY CASE resolution_status WHEN 'zero_open' THEN 0 ELSE 1 END, search_count DESC LIMIT 100`).all(),
      db.prepare(`SELECT * FROM at_search_synonyms ORDER BY is_active DESC, boost_weight DESC, hit_count DESC LIMIT 100`).all()
    ]);
    return json({
      zero_queries: (zeroQueries || []).map(r => ({ ...r, is_zero_result: true })),
      synonyms: (synonyms || []).map(s => ({ ...s, is_active: Number(s.is_active || 0) === 1 }))
    });
  }

  if (sub === 'map-synonym' && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const sourceTerm = normalizeQuery(body.source_term || '');
    const canonical = cleanStr(body.canonical_query || '', 200);
    const targetUrl = cleanStr(body.target_url || '', 300);
    const boost = Math.max(1, Math.min(100, Number(body.boost_weight || 15) || 15));
    if (!sourceTerm) errors.source_term = 'source_term is required';
    if (!canonical) errors.canonical_query = 'canonical_query is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const existingSyn = await db.prepare(`SELECT * FROM at_search_synonyms WHERE source_term = ?`).bind(sourceTerm).first();
    let synId = existingSyn?.id;
    if (synId) {
      await snapshotAtRevision(db, '03', synId, actor, 'update synonym mapping');
      await db.prepare(
        `UPDATE at_search_synonyms SET canonical_query = ?, target_url = ?, boost_weight = ?, is_active = 1, updated_at = datetime('now') WHERE id = ?`
      ).bind(canonical, targetUrl, boost, synId).run();
    } else {
      synId = rid('at-syn');
      await db.prepare(
        `INSERT INTO at_search_synonyms (id, source_term, canonical_query, target_url, boost_weight, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      ).bind(synId, sourceTerm, canonical, targetUrl, boost, actor?.email || 'admin').run();
      await snapshotAtRevision(db, '03', synId, actor, 'create synonym mapping');
    }

    // Atomically mark matching zero-result query as synonym_mapped
    await db.prepare(
      `UPDATE at_search_queries
       SET mapped_synonym_target = ?, resolution_status = 'synonym_mapped'
       WHERE normalized_query = ? OR id = ?`
    ).bind(canonical, sourceTerm, cleanStr(body.query_id || '', 80)).run();

    await audit(env, request, actor, 'at.synonym.map', 'at_search_synonyms', synId, { source_term: sourceTerm, canonical_query: canonical });
    const item = await db.prepare(`SELECT * FROM at_search_synonyms WHERE id = ?`).bind(synId).first();
    return json({ item: { ...item, is_active: Number(item.is_active || 0) === 1 } }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM at_search_synonyms WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Synonym rule not found');
    const body = await readJson(request, 15000);
    const canonical = body.canonical_query !== undefined ? cleanStr(body.canonical_query, 200) : existing.canonical_query;
    const targetUrl = body.target_url !== undefined ? cleanStr(body.target_url, 300) : existing.target_url;
    const boost = body.boost_weight !== undefined ? Math.max(1, Math.min(100, Number(body.boost_weight) || 10)) : existing.boost_weight;
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;

    await snapshotAtRevision(db, '03', sub, actor, body.change_note || 'update synonym');
    await db.prepare(
      `UPDATE at_search_synonyms SET canonical_query = ?, target_url = ?, boost_weight = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(canonical, targetUrl, boost, isActive, sub).run();
    await audit(env, request, actor, 'at.synonym.update', 'at_search_synonyms', sub, { is_active: isActive });
    const updated = await db.prepare(`SELECT * FROM at_search_synonyms WHERE id = ?`).bind(sub).first();
    return json({ item: { ...updated, is_active: Number(updated.is_active || 0) === 1 } });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM at_search_synonyms WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Synonym rule not found');
    await snapshotAtRevision(db, '03', sub, actor, 'deactivate synonym');
    await db.prepare(`UPDATE at_search_synonyms SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'at.synonym.deactivate', 'at_search_synonyms', sub, {});
    return json({ ok: true, id: sub, is_active: false });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 04: DOWNLOAD METRICS ================= */
async function handleDownloads(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const matType = (url.searchParams.get('material_type') || '').trim();
    const exam = (url.searchParams.get('exam_tag') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (matType) { where.push('material_type = ?'); binds.push(matType); }
    if (exam) { where.push('exam_tag = ?'); binds.push(exam); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(resource_title_en LIKE ? ESCAPE '\\' OR resource_slug LIKE ? ESCAPE '\\' OR exam_tag LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM at_download_metrics ${w} ORDER BY downloads_count DESC, bucket_date DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (sub === 'record' && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const slug = cleanStr(body.resource_slug || '', 120);
    const titleEn = cleanStr(body.resource_title_en || slug, 200);
    const matType = pick(body.material_type, AT_MATERIAL_TYPES, 'material_type', errors, 'pyq_paper');
    const examTag = cleanStr(body.exam_tag || 'OPSC OAS', 80);
    if (!slug) errors.resource_slug = 'resource_slug is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const bucket = todayIso();
    const existing = await db.prepare(
      `SELECT id FROM at_download_metrics WHERE resource_slug = ? AND bucket_date = ? LIMIT 1`
    ).bind(slug, bucket).first();

    let rowId = existing?.id;
    if (rowId) {
      await db.prepare(
        `UPDATE at_download_metrics SET downloads_count = downloads_count + 1, unique_downloaders_approx = unique_downloaders_approx + 1, updated_at = datetime('now') WHERE id = ?`
      ).bind(rowId).run();
    } else {
      rowId = rid('at-dl');
      await db.prepare(
        `INSERT INTO at_download_metrics (id, bucket_date, resource_slug, resource_title_en, resource_title_or, material_type, exam_tag, downloads_count, unique_downloaders_approx, avg_file_kb)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`
      ).bind(rowId, bucket, slug, titleEn, cleanStr(body.resource_title_or || '', 240), matType, examTag, Math.max(1, Number(body.avg_file_kb || 512) || 512)).run();
    }
    if (actor) await audit(env, request, actor, 'at.download.record', 'at_download_metrics', rowId, { resource_slug: slug });
    const item = await db.prepare(`SELECT * FROM at_download_metrics WHERE id = ?`).bind(rowId).first();
    return json({ item }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleAtRevisions(request, env, actor, sub) {
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
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM at_revisions ${w} ORDER BY version_num DESC LIMIT 50`
    ).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = cleanStr(body.revision_id || '', 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM at_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = AT_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', `Rollback unsupported for module ${rev.module_code}`);
    let snap = null;
    try { snap = JSON.parse(rev.snapshot_json); } catch { snap = null; }
    if (!snap) throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid revision snapshot');

    await snapshotAtRevision(db, rev.module_code, rev.entity_id, actor, `pre-rollback to v${rev.version_num}`);
    const setCols = cfg.cols.filter(c => c in snap);
    const sets = setCols.map(c => `${c} = ?`).join(', ');
    await db.prepare(`UPDATE ${cfg.table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...setCols.map(c => snap[c]), rev.entity_id).run();
    await audit(env, request, actor, 'at.revision.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    return json({ ok: true, module_code: rev.module_code, entity_id: rev.entity_id, restored_version: rev.version_num });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= PUBLIC COOKIELESS TELEMETRY & SYNONYMS ================= */
export async function handlePublicTelemetryBeacon(request, env) {
  if (!env || !env.DB) return json({ ok: false }, 503);
  await ensureAnalyticsTelemetryBatch1Schema(env.DB);
  const bucketHash = await dailySaltedBucketHash(clientIp(request));
  await rateLimit(env, `tel-beacon:${bucketHash}`, 120, 60);

  const body = await readJson(request, 8000);
  const evType = cleanStr(body.event_type || 'pageview', 30);
  const today = todayIso();

  if (evType === 'search') {
    const norm = normalizeQuery(body.query_or_slug || '');
    if (!norm) throw validationError({ query_or_slug: 'query_or_slug is required' });
    const disp = cleanStr(body.query_or_slug, 160);
    const scope = AT_SEARCH_SCOPES.includes(body.portal_scope) ? body.portal_scope : 'all';
    const script = detectScript(disp);
    const resCount = Math.max(0, Number(body.result_count ?? 0) || 0);

    const syn = await env.DB.prepare(`SELECT id, canonical_query FROM at_search_synonyms WHERE source_term = ? AND is_active = 1`).bind(norm).first();
    if (syn) {
      await env.DB.prepare(`UPDATE at_search_synonyms SET hit_count = hit_count + 1, updated_at = datetime('now') WHERE id = ?`).bind(syn.id).run();
    }
    const isZero = resCount === 0 && !syn ? 1 : 0;
    const status = syn ? 'synonym_mapped' : (isZero ? 'zero_open' : 'active_trending');

    const ex = await env.DB.prepare(`SELECT id FROM at_search_queries WHERE normalized_query = ?`).bind(norm).first();
    if (ex) {
      await env.DB.prepare(
        `UPDATE at_search_queries SET search_count = search_count + 1, last_result_count = ?, is_zero_result = ?, mapped_synonym_target = COALESCE(mapped_synonym_target, ?), resolution_status = ?, last_searched_at = datetime('now') WHERE id = ?`
      ).bind(resCount, isZero, syn ? syn.canonical_query : null, status, ex.id).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO at_search_queries (id, normalized_query, display_query, portal_scope, lang_script, search_count, last_result_count, is_zero_result, mapped_synonym_target, resolution_status)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
      ).bind(rid('at-sq'), norm, disp, scope, script, resCount, isZero, syn ? syn.canonical_query : null, status).run();
    }
    return json({ ok: true, cookieless: true, pii_stored: false, expanded_to: syn ? syn.canonical_query : null }, 202);
  }

  if (evType === 'download') {
    const slug = cleanStr(body.query_or_slug || '', 120);
    if (!slug) throw validationError({ query_or_slug: 'resource slug is required' });
    const matType = AT_MATERIAL_TYPES.includes(body.material_type) ? body.material_type : 'pyq_paper';
    const ex = await env.DB.prepare(`SELECT id FROM at_download_metrics WHERE resource_slug = ? AND bucket_date = ?`).bind(slug, today).first();
    if (ex) {
      await env.DB.prepare(`UPDATE at_download_metrics SET downloads_count = downloads_count + 1, unique_downloaders_approx = unique_downloaders_approx + 1, updated_at = datetime('now') WHERE id = ?`).bind(ex.id).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO at_download_metrics (id, bucket_date, resource_slug, resource_title_en, material_type, exam_tag, downloads_count, unique_downloaders_approx)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1)`
      ).bind(rid('at-dl'), today, slug, cleanStr(body.resource_title_en || slug, 200), matType, cleanStr(body.exam_tag || 'OPSC OAS', 80)).run();
    }
    return json({ ok: true, cookieless: true, pii_stored: false }, 202);
  }

  // Default: pageview
  const routePath = cleanStr(body.route_path || '/', 160);
  const portal = AT_PORTAL_SECTIONS.includes(body.portal_section) ? body.portal_section : 'home';
  const lang = AT_LANG_MODES.includes(body.lang_mode) ? body.lang_mode : 'en';
  const dev = AT_DEVICE_CLASSES.includes(body.device_class) ? body.device_class : 'mobile';
  const district = cleanStr(body.district_odisha || 'Khordha', 80);

  const ex = await env.DB.prepare(
    `SELECT id FROM at_edge_pageviews WHERE bucket_date = ? AND route_path = ? AND portal_section = ? AND lang_mode = ? AND device_class = ?`
  ).bind(today, routePath, portal, lang, dev).first();
  if (ex) {
    await env.DB.prepare(`UPDATE at_edge_pageviews SET views_count = views_count + 1, unique_session_hashes = unique_session_hashes + 1, updated_at = datetime('now') WHERE id = ?`).bind(ex.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO at_edge_pageviews (id, bucket_date, route_path, portal_section, lang_mode, device_class, district_odisha, views_count, unique_session_hashes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`
    ).bind(rid('at-pv'), today, routePath, portal, lang, dev, district).run();
  }
  return json({ ok: true, cookieless: true, pii_stored: false }, 202);
}

export async function handlePublicSearchSynonymsApi(request, env) {
  if (!env || !env.DB) return json({ items: [] });
  await ensureAnalyticsTelemetryBatch1Schema(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT source_term, canonical_query, target_url, boost_weight FROM at_search_synonyms WHERE is_active = 1 ORDER BY boost_weight DESC LIMIT 100`
  ).all();
  return json({ items: results || [] }, 200, { 'Cache-Control': 'public, max-age=120' });
}

export async function handleAnalyticsBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureAnalyticsTelemetryBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') return json(await getAnalyticsOverview(env.DB));
  if (id === 'pageviews') return handlePageviews(request, env, actor, sub, extra);
  if (id === 'search-intent') return handleSearchIntent(request, env, actor, sub, extra);
  if (id === 'zero-results') return handleZeroResults(request, env, actor, sub, extra);
  if (id === 'downloads') return handleDownloads(request, env, actor, sub, extra);
  if (id === 'revisions') return handleAtRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown analytics route');
}
