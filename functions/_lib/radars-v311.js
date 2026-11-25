// Phase 2 (v311): Operational Radars & Public Enforcement Helpers
// - Expiring Deadlines Radar (published Jobs & Schemes expiring within next 7 days)
// - Broken .gov.in Link Sentinel (`link_health_checks` real HTTP HEAD/GET scans)
// - Real "Zero-Result" Visitor Search Logger (`search_zero_logs` async via ctx.waitUntil())
// - Offline PWA Study Pack Manifest (`GET /api/public/study/offline-pack`)
import { HttpError, json, readJson } from './http.js';
import { recordAdminAuditLog } from '../api/admin/system-ops.js';

const ensuredDbs = new WeakSet();

export async function ensureRadarsV311Schema(db) {
  if (!db || ensuredDbs.has(db)) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS link_health_checks (
        id TEXT PRIMARY KEY,
        pillar TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_slug TEXT NOT NULL DEFAULT '',
        item_title TEXT NOT NULL DEFAULT '',
        field_name TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        http_status INTEGER NOT NULL DEFAULT 0,
        is_broken INTEGER NOT NULL DEFAULT 0,
        error_message TEXT NOT NULL DEFAULT '',
        checked_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS search_zero_logs (
        query_norm TEXT PRIMARY KEY,
        sample_query TEXT NOT NULL DEFAULT '',
        pillar TEXT NOT NULL DEFAULT 'all',
        hits INTEGER NOT NULL DEFAULT 1,
        last_searched_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      )`
    ).run();
    ensuredDbs.add(db);
  } catch {
    // Graceful skip if DB unavailable
  }
}

export async function ensureTableColumns(db, table, additions) {
  if (!db) return new Set();
  try {
    const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
    const cols = new Set((results || []).map(r => r.name));
    if (!cols.size) return cols;
    for (const [col, def] of additions) {
      if (!cols.has(col)) {
        try {
          await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
          cols.add(col);
        } catch { /* already exists or read-only */ }
      }
    }
    return cols;
  } catch {
    return new Set();
  }
}

export async function ensureV311ContentColumns(db) {
  await Promise.all([
    ensureTableColumns(db, 'job_articles', [
      ['publish_at', "TEXT NOT NULL DEFAULT ''"],
      ['expires_at', "TEXT NOT NULL DEFAULT ''"],
      ['notification_url', "TEXT NOT NULL DEFAULT ''"],
      ['apply_url', "TEXT NOT NULL DEFAULT ''"],
      ['admit_card_url', "TEXT NOT NULL DEFAULT ''"],
      ['answer_key_url', "TEXT NOT NULL DEFAULT ''"],
      ['result_url', "TEXT NOT NULL DEFAULT ''"],
      ['corrigendum_note', "TEXT NOT NULL DEFAULT ''"]
    ]),
    ensureTableColumns(db, 'scheme_articles', [
      ['publish_at', "TEXT NOT NULL DEFAULT ''"],
      ['expires_at', "TEXT NOT NULL DEFAULT ''"],
      ['district_codes', "TEXT NOT NULL DEFAULT ''"],
      ['required_docs', "TEXT NOT NULL DEFAULT '[]'"]
    ]),
    ensureTableColumns(db, 'study_articles', [
      ['offline_pack', 'INTEGER NOT NULL DEFAULT 0']
    ])
  ]);
}

function parseDateMs(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const t = Date.parse(`${s}T23:59:59Z`);
    return Number.isNaN(t) ? null : t;
  }
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function isFuturePublishAt(publishAt, nowMs = Date.now()) {
  const ms = parseDateMs(publishAt);
  return ms !== null && ms > nowMs;
}

export function isExpiredTimestamp(expiresAt, nowMs = Date.now()) {
  const ms = parseDateMs(expiresAt);
  return ms !== null && ms < nowMs;
}

// ============================================================================
// 1. EXPIRING DEADLINES RADAR (Next 7 Days — Real D1 Query)
// ============================================================================
export async function getExpiringDeadlinesRadar(db, windowDays = 7) {
  if (!db) return { window_days: windowDays, total: 0, items: [] };
  await ensureV311ContentColumns(db);

  const nowMs = Date.now();
  const maxMs = nowMs + windowDays * 86400 * 1000;
  const items = [];

  try {
    const jobsRes = await db.prepare(
      `SELECT id, slug, title_en, organisation_en, last_date, expires_at, publish_at, is_published
       FROM job_articles WHERE is_published = 1`
    ).all();
    for (const r of (jobsRes.results || [])) {
      const expRaw = String(r.expires_at || r.last_date || '').trim();
      const expMs = parseDateMs(expRaw);
      if (expMs === null || expMs < nowMs || expMs > maxMs) continue;
      items.push({
        pillar: 'jobs',
        pillar_label: 'Jobs',
        id: r.id,
        slug: r.slug,
        title_en: r.title_en,
        org_or_dept: r.organisation_en || '',
        expires_at: expRaw,
        expires_ms: expMs,
        days_left: Math.max(0, Math.ceil((expMs - nowMs) / 86400000)),
        public_url: `/jobs/?slug=${encodeURIComponent(r.slug || '')}`
      });
    }
  } catch { /* table absent */ }

  try {
    const schemesRes = await db.prepare(
      `SELECT id, slug, title_en, department_en, last_date, expires_at, publish_at, is_published, is_ongoing
       FROM scheme_articles WHERE is_published = 1 AND COALESCE(is_ongoing, 0) = 0`
    ).all();
    for (const r of (schemesRes.results || [])) {
      const expRaw = String(r.expires_at || r.last_date || '').trim();
      const expMs = parseDateMs(expRaw);
      if (expMs === null || expMs < nowMs || expMs > maxMs) continue;
      items.push({
        pillar: 'schemes',
        pillar_label: 'Schemes & Benefits',
        id: r.id,
        slug: r.slug,
        title_en: r.title_en,
        org_or_dept: r.department_en || '',
        expires_at: expRaw,
        expires_ms: expMs,
        days_left: Math.max(0, Math.ceil((expMs - nowMs) / 86400000)),
        public_url: `/schemes/?slug=${encodeURIComponent(r.slug || '')}`
      });
    }
  } catch { /* table absent */ }

  items.sort((a, b) => a.expires_ms - b.expires_ms);
  return {
    window_days: windowDays,
    total: items.length,
    items: items.slice(0, 50)
  };
}

// ============================================================================
// 2. BROKEN .gov.in LINK SENTINEL (Real HTTP Check + `link_health_checks`)
// ============================================================================
export async function probeExternalUrl(urlStr, fetchFn = fetch, timeoutMs = 5000) {
  const clean = String(urlStr || '').trim();
  if (!/^https?:\/\//i.test(clean)) {
    return { ok: false, status: 0, error: 'Invalid URL protocol (must be http/https)' };
  }
  const runMethod = async (method) => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetchFn(clean, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': 'CSOdisha-LinkSentinel/1.0 (+https://csodisha.com)' },
        signal: ctrl ? ctrl.signal : undefined
      });
      return { status: Number(res.status || 0), ok: res.status >= 200 && res.status < 400, error: res.status >= 400 ? `HTTP ${res.status}` : '' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  try {
    const headRes = await runMethod('HEAD');
    if (headRes.ok) return headRes;
    if (headRes.status === 405 || headRes.status === 403 || headRes.status === 501) {
      return await runMethod('GET');
    }
    return headRes;
  } catch (err) {
    const msg = err && err.name === 'AbortError' ? 'Request timed out' : String((err && err.message) || err || 'Network error').slice(0, 140);
    return { ok: false, status: 0, error: msg };
  }
}

async function collectOfficialLinksToScan(db) {
  await ensureV311ContentColumns(db);
  const targets = [];

  const addIfExternal = (pillar, row, fieldName, rawUrl) => {
    const u = String(rawUrl || '').trim();
    if (!/^https?:\/\//i.test(u)) return;
    targets.push({
      pillar,
      item_id: String(row.id || ''),
      item_slug: String(row.slug || ''),
      item_title: String(row.title_en || row.slug || 'Untitled'),
      field_name: fieldName,
      url: u
    });
  };

  try {
    const jobs = await db.prepare(
      `SELECT id, slug, title_en, notification_url, notification_pdf_url, apply_url, official_apply_url, official_website_url, admit_card_url, answer_key_url, result_url
       FROM job_articles WHERE is_published = 1 LIMIT 100`
    ).all();
    for (const r of (jobs.results || [])) {
      addIfExternal('jobs', r, 'notification_url', r.notification_url || r.notification_pdf_url);
      addIfExternal('jobs', r, 'apply_url', r.apply_url || r.official_apply_url);
      addIfExternal('jobs', r, 'official_website_url', r.official_website_url);
      addIfExternal('jobs', r, 'admit_card_url', r.admit_card_url);
      addIfExternal('jobs', r, 'answer_key_url', r.answer_key_url);
      addIfExternal('jobs', r, 'result_url', r.result_url);
    }
  } catch { /* ignore */ }

  try {
    const schemes = await db.prepare(
      `SELECT id, slug, title_en, official_apply_url, official_portal_url, guidelines_pdf_url
       FROM scheme_articles WHERE is_published = 1 LIMIT 100`
    ).all();
    for (const r of (schemes.results || [])) {
      addIfExternal('schemes', r, 'official_apply_url', r.official_apply_url);
      addIfExternal('schemes', r, 'official_portal_url', r.official_portal_url);
      addIfExternal('schemes', r, 'guidelines_pdf_url', r.guidelines_pdf_url);
    }
  } catch { /* ignore */ }

  try {
    const careers = await db.prepare(
      `SELECT id, slug, title_en, official_links_json
       FROM careers_articles WHERE status = 'published' LIMIT 100`
    ).all();
    for (const r of (careers.results || [])) {
      let links = [];
      try { links = JSON.parse(r.official_links_json || '[]'); } catch { links = []; }
      if (Array.isArray(links)) {
        links.forEach((lk, i) => {
          const u = typeof lk === 'string' ? lk : (lk && lk.url);
          addIfExternal('careers', r, `official_links[${i}]`, u);
        });
      }
    }
  } catch { /* ignore */ }

  return targets;
}

export async function runLinkHealthScan(env, request, actor, ctx = null, fetchFn = fetch) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureRadarsV311Schema(env.DB);
  const targets = await collectOfficialLinksToScan(env.DB);
  const capped = targets.slice(0, 60); // bounded per-scan budget for Worker execution safety
  const nowIso = new Date().toISOString();

  const results = [];
  // Run in small concurrent batches of 6
  for (let i = 0; i < capped.length; i += 6) {
    const slice = capped.slice(i, i + 6);
    const probed = await Promise.all(slice.map(async (t) => {
      const check = await probeExternalUrl(t.url, fetchFn, 5000);
      const id = `lhc_${t.pillar}_${t.item_id}_${t.field_name}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
      const isBroken = check.ok ? 0 : 1;
      await env.DB.prepare(
        `INSERT INTO link_health_checks (id, pillar, item_id, item_slug, item_title, field_name, url, http_status, is_broken, error_message, checked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           item_slug = excluded.item_slug,
           item_title = excluded.item_title,
           url = excluded.url,
           http_status = excluded.http_status,
           is_broken = excluded.is_broken,
           error_message = excluded.error_message,
           checked_at = excluded.checked_at`
      ).bind(id, t.pillar, t.item_id, t.item_slug, t.item_title, t.field_name, t.url, check.status, isBroken, check.error || '', nowIso).run();
      return {
        id,
        ...t,
        http_status: check.status,
        is_broken: Boolean(isBroken),
        error_message: check.error || '',
        checked_at: nowIso
      };
    }));
    results.push(...probed);
  }

  const brokenCount = results.filter(r => r.is_broken).length;
  recordAdminAuditLog(env, request, actor, 'radar.link_health.scan', 'link_health_checks', {
    scanned: results.length,
    broken: brokenCount
  }, ctx);

  return {
    scanned: results.length,
    healthy: results.length - brokenCount,
    broken: brokenCount,
    checked_at: nowIso,
    items: results.sort((a, b) => Number(b.is_broken) - Number(a.is_broken))
  };
}

export async function getLinkHealthReport(db) {
  if (!db) return { total: 0, broken: 0, healthy: 0, items: [] };
  await ensureRadarsV311Schema(db);
  try {
    const { results } = await db.prepare(
      `SELECT id, pillar, item_id, item_slug, item_title, field_name, url, http_status, is_broken, error_message, checked_at
       FROM link_health_checks ORDER BY is_broken DESC, checked_at DESC LIMIT 100`
    ).all();
    const items = (results || []).map(r => ({
      ...r,
      is_broken: Number(r.is_broken) === 1
    }));
    const broken = items.filter(i => i.is_broken).length;
    return {
      total: items.length,
      broken,
      healthy: items.length - broken,
      items
    };
  } catch {
    return { total: 0, broken: 0, healthy: 0, items: [] };
  }
}

// ============================================================================
// 3. REAL "ZERO-RESULT" VISITOR SEARCH LOGGER (Async via ctx.waitUntil())
// ============================================================================
export function normalizeSearchQuery(raw) {
  return String(raw || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function logZeroResultSearch(env, rawQuery, pillar = 'all', ctx = null) {
  if (!env || !env.DB) return Promise.resolve();
  const sample = normalizeSearchQuery(rawQuery);
  if (sample.length < 2) return Promise.resolve();
  const norm = sample.toLowerCase();
  const cleanPillar = ['all', 'jobs', 'careers', 'schemes', 'study', 'community'].includes(pillar) ? pillar : 'all';

  const task = (async () => {
    try {
      await ensureRadarsV311Schema(env.DB);
      await env.DB.prepare(
        `INSERT INTO search_zero_logs (query_norm, sample_query, pillar, hits, last_searched_at, resolved_at)
         VALUES (?, ?, ?, 1, ?, NULL)
         ON CONFLICT(query_norm) DO UPDATE SET
           sample_query = excluded.sample_query,
           pillar = excluded.pillar,
           hits = search_zero_logs.hits + 1,
           last_searched_at = excluded.last_searched_at,
           resolved_at = NULL`
      ).bind(norm, sample, cleanPillar, new Date().toISOString()).run();
    } catch {
      // Never impact public search latency or responses
    }
  })();

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  }
  return task;
}

export async function getZeroResultSearches(db, limit = 30) {
  if (!db) return { total: 0, items: [] };
  await ensureRadarsV311Schema(db);
  try {
    const { results } = await db.prepare(
      `SELECT query_norm, sample_query, pillar, hits, last_searched_at
       FROM search_zero_logs
       WHERE resolved_at IS NULL
       ORDER BY hits DESC, last_searched_at DESC
       LIMIT ?`
    ).bind(Math.max(1, Math.min(100, Number(limit) || 30))).all();
    const items = (results || []).map(r => ({
      query_norm: r.query_norm,
      sample_query: r.sample_query || r.query_norm,
      pillar: r.pillar || 'all',
      hits: Number(r.hits || 0),
      last_searched_at: r.last_searched_at
    }));
    return { total: items.length, items };
  } catch {
    return { total: 0, items: [] };
  }
}

export async function handleAdminRadarsApi(request, env, actor, id, sub, ctx, fetchFn = fetch) {
  const method = request.method;

  if (!id && method === 'GET') {
    const [expiring, links, zeroSearches] = await Promise.all([
      getExpiringDeadlinesRadar(env.DB, 7),
      getLinkHealthReport(env.DB),
      getZeroResultSearches(env.DB, 25)
    ]);
    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      expiring_deadlines: expiring,
      link_health: links,
      zero_searches: zeroSearches
    });
  }

  if (id === 'expiring-deadlines' && method === 'GET') {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(30, Number(url.searchParams.get('days')) || 7));
    return json({ ok: true, ...(await getExpiringDeadlinesRadar(env.DB, days)) });
  }

  if (id === 'link-health') {
    if (method === 'GET') {
      return json({ ok: true, ...(await getLinkHealthReport(env.DB)) });
    }
    if (method === 'POST' && (!sub || sub === 'scan')) {
      const report = await runLinkHealthScan(env, request, actor, ctx, fetchFn);
      return json({ ok: true, ...report });
    }
  }

  if (id === 'zero-searches') {
    if (method === 'GET') {
      return json({ ok: true, ...(await getZeroResultSearches(env.DB, 50)) });
    }
    if ((method === 'POST' || method === 'DELETE') && sub === 'dismiss') {
      const body = await readJson(request, 4000);
      const qNorm = normalizeSearchQuery(body.query_norm || body.query).toLowerCase();
      if (!qNorm) throw new HttpError(400, 'INVALID_QUERY', 'query_norm is required');
      await ensureRadarsV311Schema(env.DB);
      await env.DB.prepare('UPDATE search_zero_logs SET resolved_at = ? WHERE query_norm = ?')
        .bind(new Date().toISOString(), qNorm).run();
      return json({ ok: true, dismissed: qNorm });
    }
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown radars route');
}

// ============================================================================
// 4. PUBLIC OFFLINE PWA STUDY PACK MANIFEST (`GET /api/public/study/offline-pack`)
// ============================================================================
export async function handlePublicStudyOfflinePackApi(request, env) {
  if (!env || !env.DB) {
    return json({ ok: true, total: 0, cache_urls: [], items: [] }, 200, { 'Cache-Control': 'no-store' });
  }
  await ensureV311ContentColumns(env.DB);
  const nowMs = Date.now();

  let rows = [];
  try {
    const res = await env.DB.prepare(
      `SELECT id, slug, title_en, title_or, resource_type_badge, exam_board_tag, notes_pdf_url, pyq_pdf_url, answer_key_pdf_url, scheduled_publish_at, updated_at
       FROM study_articles
       WHERE is_published = 1 AND COALESCE(offline_pack, 0) = 1
       ORDER BY updated_at DESC LIMIT 50`
    ).all();
    rows = (res.results || []).filter(r => !isFuturePublishAt(r.scheduled_publish_at, nowMs));
  } catch {
    rows = [];
  }

  const urlSet = new Set();
  const items = rows.map(r => {
    const pdfs = [r.notes_pdf_url, r.pyq_pdf_url, r.answer_key_pdf_url]
      .map(u => String(u || '').trim())
      .filter(u => u && (u.startsWith('/files/') || u.startsWith('/api/media/') || u.startsWith('/assets/')));
    pdfs.forEach(u => urlSet.add(u));
    return {
      id: r.id,
      slug: r.slug,
      title_en: r.title_en,
      title_or: r.title_or || '',
      resource_type: r.resource_type_badge || 'Study Notes',
      exam_board: r.exam_board_tag || '',
      page_url: `/study-library/?slug=${encodeURIComponent(r.slug || '')}`,
      pdf_urls: pdfs,
      updated_at: r.updated_at || ''
    };
  });

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    total: items.length,
    cache_urls: Array.from(urlSet),
    items
  }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=60' });
}
