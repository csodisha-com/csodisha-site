/**
 * Common Sense Odisha — IndexNow Verification Key, Persistent Telemetry & Auto-Ping (v394)
 * - Serves GET /<INDEXNOW_KEY>.txt with exact plain-text key verification body
 * - Non-blocking `pingIndexNowUrls(env, urls, ctx, triggerSource)` on publish (5s AbortController)
 *   and synchronous mode for Admin Studio 1-click "Re-Ping All Active URLs"
 * - Persists last ping telemetry in D1 `seo_indexnow_log`
 * - Admin-RBAC-protected GET /api/admin/seo/status & POST /api/admin/seo/ping-indexnow
 */
import { json, readJson, validationError } from './http.js';
import { collectLiveSitemapData } from './dynamic-sitemap.js';
import { invalidateEdgePaths } from './edge-cache-invalidator.js';

export const DEFAULT_INDEXNOW_KEY = 'cso2026indexnow8f3a9d4e7b1c5024';
export const INDEXNOW_HOST = 'csodisha.com';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

let _indexNowSchemaDb = null;

export async function ensureIndexNowLogSchema(db) {
  if (!db) return;
  if (_indexNowSchemaDb === db) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS seo_indexnow_log (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_ping_at TEXT NOT NULL DEFAULT '',
        last_status INTEGER NOT NULL DEFAULT 0,
        last_ok INTEGER NOT NULL DEFAULT 0,
        last_url_count INTEGER NOT NULL DEFAULT 0,
        last_urls_json TEXT NOT NULL DEFAULT '[]',
        last_trigger TEXT NOT NULL DEFAULT '',
        last_error TEXT NOT NULL DEFAULT ''
      )`
    ).run();
  } catch { /* mock db or already exists */ }
  _indexNowSchemaDb = db;
}

export async function recordIndexNowLog(db, entry) {
  if (!db) return;
  try {
    await ensureIndexNowLogSchema(db);
    await db.prepare(
      `INSERT INTO seo_indexnow_log (id, last_ping_at, last_status, last_ok, last_url_count, last_urls_json, last_trigger, last_error)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         last_ping_at = excluded.last_ping_at,
         last_status = excluded.last_status,
         last_ok = excluded.last_ok,
         last_url_count = excluded.last_url_count,
         last_urls_json = excluded.last_urls_json,
         last_trigger = excluded.last_trigger,
         last_error = excluded.last_error`
    ).bind(
      String(entry.last_ping_at || new Date().toISOString()),
      Number(entry.last_status || 0),
      entry.last_ok ? 1 : 0,
      Number(entry.last_url_count || 0),
      JSON.stringify(Array.isArray(entry.last_urls) ? entry.last_urls.slice(0, 15) : []),
      String(entry.last_trigger || 'auto_publish').slice(0, 60),
      String(entry.last_error || '').slice(0, 300)
    ).run();
  } catch { /* best-effort telemetry */ }
}

export async function readIndexNowLog(db) {
  if (!db) return null;
  try {
    await ensureIndexNowLogSchema(db);
    const row = await db.prepare('SELECT * FROM seo_indexnow_log WHERE id = 1 LIMIT 1').first();
    if (!row) return null;
    let urls = [];
    try { urls = JSON.parse(row.last_urls_json || '[]'); } catch { urls = []; }
    return {
      last_ping_at: String(row.last_ping_at || ''),
      last_status: Number(row.last_status || 0),
      last_ok: Number(row.last_ok || 0) === 1,
      last_url_count: Number(row.last_url_count || 0),
      last_urls: Array.isArray(urls) ? urls : [],
      last_trigger: String(row.last_trigger || ''),
      last_error: String(row.last_error || '')
    };
  } catch {
    return null;
  }
}

export function getIndexNowKey(env) {
  const fromEnv = env && typeof env.INDEXNOW_KEY === 'string' ? env.INDEXNOW_KEY.trim() : '';
  return /^[a-zA-Z0-9-]{8,128}$/.test(fromEnv) ? fromEnv : DEFAULT_INDEXNOW_KEY;
}

export function isIndexNowKeyPath(pathname, env) {
  const key = getIndexNowKey(env);
  return pathname === `/${key}.txt`;
}

export function handleIndexNowKeyTxt(env) {
  const key = getIndexNowKey(env);
  return new Response(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function normalizeUrlList(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of (Array.isArray(urls) ? urls : [urls])) {
    const s = String(raw || '').trim();
    if (!s) continue;
    let abs = s;
    if (s.startsWith('/') && !s.startsWith('//')) {
      abs = `https://${INDEXNOW_HOST}${s}`;
    }
    if (!/^https:\/\/csodisha\.com\//i.test(abs) && abs !== `https://${INDEXNOW_HOST}`) continue;
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
    if (out.length >= 1000) break;
  }
  return out;
}

async function executeIndexNowPost(env, key, urlList, triggerSource) {
  const keyLocation = `https://${INDEXNOW_HOST}/${key}.txt`;
  const payload = {
    host: INDEXNOW_HOST,
    key,
    keyLocation,
    urlList
  };
  const pingedAt = new Date().toISOString();
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
  let status = 0;
  let ok = false;
  let errorMsg = '';
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    });
    status = Number(res.status || 0);
    ok = res.ok || status === 202;
    if (!ok) errorMsg = `HTTP ${status}`;
  } catch (err) {
    errorMsg = err && err.message ? String(err.message) : 'Network or timeout error';
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (env && env.DB) {
    await recordIndexNowLog(env.DB, {
      last_ping_at: pingedAt,
      last_status: status,
      last_ok: ok,
      last_url_count: urlList.length,
      last_urls: urlList,
      last_trigger: triggerSource || 'auto_publish',
      last_error: errorMsg
    });
  }
  return {
    queued: true,
    ok,
    status,
    url_count: urlList.length,
    urls: urlList.slice(0, 20),
    key_location: keyLocation,
    trigger: triggerSource || 'auto_publish',
    pinged_at: pingedAt,
    error: errorMsg
  };
}

/**
 * Queues a non-blocking IndexNow JSON POST (5s AbortController timeout) via ctx.waitUntil
 * and persists telemetry to `seo_indexnow_log`. When `options.sync === true`, returns a Promise
 * resolving to the live HTTP status & telemetry object.
 */
export function pingIndexNowUrls(env, urls, ctx = null, triggerSource = 'auto_publish', options = {}) {
  const key = getIndexNowKey(env);
  const urlList = normalizeUrlList(urls);
  if (!urlList.length) {
    const emptyRes = { queued: false, ok: false, status: 0, url_count: 0, urls: [], reason: 'no_valid_urls' };
    return options && options.sync ? Promise.resolve(emptyRes) : emptyRes;
  }

  const task = executeIndexNowPost(env, key, urlList, triggerSource);
  if (options && options.sync) {
    return task;
  }
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  }
  return {
    queued: true,
    key_location: `https://${INDEXNOW_HOST}/${key}.txt`,
    url_count: urlList.length,
    urls: urlList.slice(0, 20),
    trigger: triggerSource
  };
}

/**
 * GET /api/admin/seo/status
 * Returns live D1 sitemap breakdown, IndexNow verification key status, and persisted ping telemetry.
 */
export async function handleAdminSeoStatus(request, env) {
  const key = getIndexNowKey(env);
  const [sitemapData, log] = await Promise.all([
    collectLiveSitemapData(env, `https://${INDEXNOW_HOST}`),
    readIndexNowLog(env && env.DB)
  ]);

  return json({
    ok: true,
    sitemap: {
      url: `https://${INDEXNOW_HOST}/sitemap.xml`,
      total_urls: sitemapData.total_urls,
      hubs_count: sitemapData.hubs_count,
      jobs_count: sitemapData.jobs_count,
      guides_count: sitemapData.guides_count,
      latest_lastmod: sitemapData.latest_lastmod
    },
    indexnow: {
      key,
      key_path: `/${key}.txt`,
      key_location: `https://${INDEXNOW_HOST}/${key}.txt`,
      verified_ready: true,
      last_ping_at: (log && log.last_ping_at) || '',
      last_status: (log && log.last_status) || 0,
      last_ok: Boolean(log && log.last_ok),
      last_url_count: (log && log.last_url_count) || 0,
      last_urls: (log && log.last_urls) || [],
      last_trigger: (log && log.last_trigger) || '',
      last_error: (log && log.last_error) || ''
    }
  });
}

/**
 * POST /api/admin/seo/ping-indexnow
 * Supports:
 *  - { mode: 'all_active' }: collects all live sitemap URLs, purges /sitemap.xml edge cache, submits synchronously
 *  - { urls: [...] } or { url: '...' }: submits explicit URL list synchronously
 */
export async function handleAdminPingIndexNow(request, env, ctx = null) {
  const body = await readJson(request, 64000).catch(() => ({}));
  const mode = String((body && body.mode) || '').trim().toLowerCase();

  if (mode === 'all_active') {
    const sitemapData = await collectLiveSitemapData(env, `https://${INDEXNOW_HOST}`);
    await invalidateEdgePaths(request, ['/sitemap.xml', '/robots.txt']).catch(() => {});
    const result = await pingIndexNowUrls(env, sitemapData.urls, ctx, 'manual_reping_all', { sync: true });
    return json({
      ok: true,
      mode: 'all_active',
      indexnow: result,
      sitemap: {
        url: `https://${INDEXNOW_HOST}/sitemap.xml`,
        total_urls: sitemapData.total_urls,
        hubs_count: sitemapData.hubs_count,
        jobs_count: sitemapData.jobs_count,
        guides_count: sitemapData.guides_count,
        latest_lastmod: sitemapData.latest_lastmod
      }
    });
  }

  const rawUrls = Array.isArray(body && body.urls)
    ? body.urls
    : (body && body.url ? [body.url] : []);
  const urlList = normalizeUrlList(rawUrls);
  if (!urlList.length) {
    throw validationError({ urls: 'Provide mode: "all_active" or at least one valid https://csodisha.com/... URL to ping.' });
  }
  const result = await pingIndexNowUrls(env, urlList, ctx, 'manual_custom', { sync: true });
  return json({ ok: true, mode: 'custom', indexnow: result });
}
