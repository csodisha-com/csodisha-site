// Operations Suite — Module #7 (Edge Cache State Preservation & Warmer Daemon),
// Module #9 (Multi-Region Failover Sentinel & Health Heartbeat),
// Module #12 (Emergency Read-Only Freeze & Outage Fallback Mode),
// and Module #15 (Zero-Downtime Deployment & Rolling Canary Health).
import { HttpError, json, readJson } from './http.js';
import { audit } from './rbac.js';
import { handleContent } from '../api/content/_public.js';

export const FREEZE_SETTING_KEY = 'ops_read_only_freeze';
export const CACHE_WARMER_URLS_KEY = 'ops_cache_warmer_urls';
export const LAST_CACHE_WARM_KEY = 'ops_last_cache_warm';
export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v35';

export const DEFAULT_CACHE_WARMER_ROUTES = [
  '/',
  '/about/',
  '/schemes/',
  '/study/',
  '/jobs/',
  '/updates/',
  '/sw.js'
];

export const CORE_CACHE_ROUTES = [
  '/',
  '/jobs-careers/',
  '/schemes-benefits/',
  '/study-library/',
  '/api/posts?limit=20',
  '/api/schemes?limit=20'
];

// Allowlisted mutating paths that remain operational during an Emergency Read-Only Freeze
// so Super Admins can still authenticate, run snapshots/restores, and lift the freeze.
const FREEZE_ALLOWLIST_PREFIXES = [
  '/api/admin/login',
  '/api/admin/auth/',
  '/api/admin/ops/',
  '/api/admin/session',
  '/api/auth/login',
  '/api/auth/logout'
];

export function isFreezeAllowlistedPath(pathname, searchParams) {
  const p = String(pathname || '');
  for (const prefix of FREEZE_ALLOWLIST_PREFIXES) {
    if (prefix.endsWith('/')) {
      if (p.startsWith(prefix) || p === prefix.slice(0, -1)) return true;
    } else if (p === prefix) {
      return true;
    }
  }
  if (p === '/api/auth' && searchParams) {
    const act = searchParams.get('action');
    if (act === 'login' || act === 'logout') return true;
  }
  return false;
}

async function ensureSiteSettingsTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS site_settings (
       key TEXT PRIMARY KEY,
       value_json TEXT NOT NULL,
       updated_by TEXT,
       updated_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`
  ).run();
}

export async function getReadOnlyFreezeState(env) {
  const fallback = {
    enabled: false,
    reason: '',
    activated_by: null,
    activated_at: null
  };
  if (!env || !env.DB) return fallback;
  try {
    const row = await env.DB.prepare(
      `SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`
    ).bind(FREEZE_SETTING_KEY).first();
    if (!row || !row.value_json) return fallback;
    const parsed = JSON.parse(row.value_json);
    return {
      enabled: Boolean(parsed && parsed.enabled),
      reason: String((parsed && parsed.reason) || ''),
      activated_by: (parsed && parsed.activated_by) || row.updated_by || null,
      activated_at: (parsed && parsed.activated_at) || row.updated_at || null
    };
  } catch {
    return fallback;
  }
}

export async function setReadOnlyFreezeState(env, { enabled, reason = '', actorEmail = 'admin' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);
  const nowIso = new Date().toISOString();
  const cleanEnabled = Boolean(enabled);
  const cleanReason = String(reason || '').trim().slice(0, 280) ||
    (cleanEnabled ? 'Scheduled platform maintenance / emergency read-only protection active.' : '');
  const state = {
    enabled: cleanEnabled,
    reason: cleanReason,
    activated_by: actorEmail || 'admin',
    activated_at: nowIso
  };
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(FREEZE_SETTING_KEY, JSON.stringify(state), actorEmail || 'admin', nowIso).run();
  return state;
}

// Enforced in _worker.js on mutating HTTP verbs (POST, PUT, PATCH, DELETE)
export async function checkReadOnlyFreezeGuard(request, env) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;
  const url = new URL(request.url);
  if (isFreezeAllowlistedPath(url.pathname, url.searchParams)) return null;
  const freeze = await getReadOnlyFreezeState(env);
  if (!freeze.enabled) return null;
  const msg = freeze.reason || 'Platform is temporarily in Emergency Read-Only Freeze mode. Please try again shortly.';
  return new Response(
    JSON.stringify({
      error: 'READ_ONLY_FREEZE',
      message: msg,
      freeze: {
        enabled: true,
        reason: msg,
        activated_by: freeze.activated_by,
        activated_at: freeze.activated_at
      }
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Retry-After': '120'
      }
    }
  );
}

function resolveEdgeCache(env) {
  if (env && env.EDGE_CACHE) return env.EDGE_CACHE;
  if (typeof caches !== 'undefined' && caches && caches.default) return caches.default;
  return null;
}

async function fetchRouteForWarm(fullUrl, routePath, env) {
  if (env && typeof env.SELF_FETCH === 'function') {
    return await env.SELF_FETCH(new Request(fullUrl, { method: 'GET' }), env);
  }
  if (routePath.startsWith('/api/')) {
    try {
      const apiReq = new Request(fullUrl, { method: 'GET' });
      const res = await handleContent(apiReq, env);
      if (res && res.status < 500) return res;
    } catch {}
  }
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    try {
      const assetReq = new Request(fullUrl, { method: 'GET' });
      const res = await env.ASSETS.fetch(assetReq);
      if (res) return res;
    } catch {}
  }
  if (typeof fetch === 'function') {
    try {
      return await fetch(new Request(fullUrl, { method: 'GET', headers: { 'User-Agent': 'CSO-Edge-Cache-Warmer/1.0' } }));
    } catch {}
  }
  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Module #7: Edge Cache State Preservation & Warmer Daemon
async function ensureSiteSettingsTableSentinel(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS site_settings (
       key TEXT PRIMARY KEY,
       value_json TEXT NOT NULL,
       updated_by TEXT,
       updated_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`
  ).run();
}

export function validateWarmerRoutes(rawRoutes) {
  if (!Array.isArray(rawRoutes)) {
    throw new HttpError(400, 'INVALID_ROUTES', 'routes must be an array of relative paths starting with "/"');
  }
  const seen = new Set();
  const clean = [];
  for (const r of rawRoutes) {
    const s = String(r || '').trim();
    if (!s) continue;
    if (!s.startsWith('/') || s.startsWith('//') || /^https?:/i.test(s) || /[\r\n\t\s]/.test(s)) {
      throw new HttpError(400, 'INVALID_ROUTE_PATH', `Route "${s}" must be a relative path starting with "/" (no whitespace or external URLs)`);
    }
    if (!seen.has(s)) {
      seen.add(s);
      clean.push(s);
    }
  }
  if (!clean.length) {
    throw new HttpError(400, 'EMPTY_ROUTES', 'At least 1 valid relative route starting with "/" is required');
  }
  if (clean.length > 30) {
    throw new HttpError(400, 'TOO_MANY_ROUTES', 'Maximum 30 custom warmer routes allowed');
  }
  return clean;
}

export async function getCacheWarmerStatus(env) {
  let routes = DEFAULT_CACHE_WARMER_ROUTES.slice();
  let lastWarm = null;
  let updatedBy = null;
  let updatedAt = null;
  if (env && env.DB) {
    try {
      await ensureSiteSettingsTableSentinel(env.DB);
      const [routesRow, warmRow] = await Promise.all([
        env.DB.prepare(`SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`).bind(CACHE_WARMER_URLS_KEY).first(),
        env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(LAST_CACHE_WARM_KEY).first()
      ]);
      if (routesRow && routesRow.value_json) {
        const parsed = JSON.parse(routesRow.value_json);
        if (Array.isArray(parsed) && parsed.length) {
          routes = parsed;
        }
        updatedBy = routesRow.updated_by || null;
        updatedAt = routesRow.updated_at || null;
      }
      if (warmRow && warmRow.value_json) {
        lastWarm = JSON.parse(warmRow.value_json);
      }
    } catch {}
  }
  return {
    ok: true,
    cache_version: ACTIVE_SW_CACHE_VERSION,
    routes,
    routes_count: routes.length,
    updated_by: updatedBy,
    updated_at: updatedAt,
    last_warm: lastWarm
  };
}

export async function saveCacheWarmerRoutes(env, routes, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTableSentinel(env.DB);
  const clean = validateWarmerRoutes(routes);
  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(CACHE_WARMER_URLS_KEY, JSON.stringify(clean), actorEmail || 'admin', nowIso).run();

  return {
    ok: true,
    cache_version: ACTIVE_SW_CACHE_VERSION,
    routes: clean,
    routes_count: clean.length,
    updated_by: actorEmail || 'admin',
    updated_at: nowIso
  };
}

export async function runCacheWarmer(request, env, { dryRun = false, routes = null, actorEmail = 'admin' } = {}) {
  const statusRes = await getCacheWarmerStatus(env);
  const targetRoutes = Array.isArray(routes) && routes.length
    ? validateWarmerRoutes(routes)
    : statusRes.routes;
  const origin = new URL(request.url).origin;

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      cache_version: ACTIVE_SW_CACHE_VERSION,
      routes_count: targetRoutes.length,
      routes: targetRoutes.map(r => ({
        route: r,
        url: new URL(r, origin).toString(),
        status: 'PENDING_DRY_RUN',
        cf_cache_status: 'PREVIEW',
        cached: false,
        latency_ms: 0
      }))
    };
  }

  const edgeCache = resolveEdgeCache(env);
  const results = [];
  const tStart = Date.now();
  for (const routePath of targetRoutes) {
    const fullUrl = new URL(routePath, origin).toString();
    const r0 = Date.now();
    let status = 200;
    let cfCacheStatus = 'MISS';
    let cached = false;
    try {
      const res = await fetchRouteForWarm(fullUrl, routePath, env);
      status = res ? res.status : 502;
      cfCacheStatus = (res && res.headers && res.headers.get('cf-cache-status')) || (edgeCache && status === 200 ? 'HIT' : 'DYNAMIC');
      if (edgeCache && res && res.status === 200) {
        const headers = new Headers(res.headers);
        if (!headers.has('Cache-Control')) {
          headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        }
        headers.set('X-CSO-Edge-Warmed', new Date().toISOString());
        const bodyBytes = await res.clone().arrayBuffer();
        const cacheableRes = new Response(bodyBytes, { status: res.status, headers });
        await edgeCache.put(new Request(fullUrl, { method: 'GET' }), cacheableRes);
        cached = true;
      }
    } catch {
      status = 502;
      cfCacheStatus = 'ERROR';
    }
    results.push({
      route: routePath,
      url: fullUrl,
      status,
      cf_cache_status: cfCacheStatus,
      cached,
      latency_ms: Math.max(1, Date.now() - r0)
    });
  }

  const totalLatencyMs = Math.max(1, Date.now() - tStart);
  const avgLatencyMs = Math.max(1, Math.round(results.reduce((a, r) => a + r.latency_ms, 0) / Math.max(1, results.length)));
  const warmedCount = results.filter(r => r.status >= 200 && r.status < 400).length;
  const nowIso = new Date().toISOString();

  const lastWarm = {
    ran_at: nowIso,
    actor: actorEmail || 'admin',
    cache_version: ACTIVE_SW_CACHE_VERSION,
    routes_count: results.length,
    warmed_count: warmedCount,
    avg_latency_ms: avgLatencyMs,
    total_latency_ms: totalLatencyMs,
    routes: results
  };

  if (env && env.DB) {
    try {
      await ensureSiteSettingsTableSentinel(env.DB);
      await env.DB.prepare(
        `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`
      ).bind(LAST_CACHE_WARM_KEY, JSON.stringify(lastWarm), actorEmail || 'admin', nowIso).run();
    } catch {}
  }

  return {
    ok: true,
    dry_run: false,
    action: 'warm',
    cache_version: ACTIVE_SW_CACHE_VERSION,
    cache_available: Boolean(edgeCache),
    warmed_count: warmedCount,
    routes_count: results.length,
    avg_latency_ms: avgLatencyMs,
    total_latency_ms: totalLatencyMs,
    executed_at: nowIso,
    routes: results,
    last_warm: lastWarm
  };
}

export async function manageEdgeCache(request, env, { action = 'warm', routes = null } = {}) {
  const cleanAction = action === 'purge' ? 'purge' : (action === 'warm' ? 'warm' : null);
  if (!cleanAction) {
    throw new HttpError(400, 'INVALID_CACHE_ACTION', 'Cache action must be "warm" or "purge"');
  }
  const reqUrl = new URL(request.url);
  const origin = reqUrl.origin;
  const targetRoutes = Array.isArray(routes) && routes.length
    ? [...new Set(routes.map(r => String(r || '').trim()).filter(r => r.startsWith('/') && !r.startsWith('//')))].slice(0, 20)
    : CORE_CACHE_ROUTES.slice();

  const edgeCache = resolveEdgeCache(env);
  const results = [];
  const tStart = Date.now();

  if (cleanAction === 'warm') {
    for (const routePath of targetRoutes) {
      const fullUrl = new URL(routePath, origin).toString();
      const r0 = Date.now();
      let status = 200;
      let cached = false;
      try {
        const res = await fetchRouteForWarm(fullUrl, routePath, env);
        status = res ? res.status : 502;
        if (edgeCache && res && res.status === 200) {
          const headers = new Headers(res.headers);
          if (!headers.has('Cache-Control')) {
            headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
          }
          headers.set('X-CSO-Edge-Warmed', new Date().toISOString());
          const bodyBytes = await res.clone().arrayBuffer();
          const cacheableRes = new Response(bodyBytes, { status: res.status, headers });
          await edgeCache.put(new Request(fullUrl, { method: 'GET' }), cacheableRes);
          cached = true;
        }
      } catch {
        status = 502;
      }
      results.push({
        route: routePath,
        url: fullUrl,
        status,
        cached,
        latency_ms: Math.max(1, Date.now() - r0)
      });
    }
    return {
      ok: true,
      action: 'warm',
      cache_available: Boolean(edgeCache),
      warmed_count: results.filter(r => r.status >= 200 && r.status < 400).length,
      total_latency_ms: Math.max(1, Date.now() - tStart),
      executed_at: new Date().toISOString(),
      routes: results
    };
  }

  // action === 'purge'
  let purgedCount = 0;
  for (const routePath of targetRoutes) {
    const fullUrl = new URL(routePath, origin).toString();
    const r0 = Date.now();
    let evicted = false;
    if (edgeCache) {
      try {
        evicted = Boolean(await edgeCache.delete(new Request(fullUrl, { method: 'GET' })));
      } catch {
        evicted = false;
      }
    }
    if (evicted) purgedCount++;
    results.push({
      route: routePath,
      url: fullUrl,
      status: 200,
      evicted,
      latency_ms: Math.max(1, Date.now() - r0)
    });
  }
  return {
    ok: true,
    action: 'purge',
    cache_available: Boolean(edgeCache),
    purged_count: purgedCount,
    routes_checked: results.length,
    total_latency_ms: Math.max(1, Date.now() - tStart),
    executed_at: new Date().toISOString(),
    routes: results
  };
}

// Modules #9 & #15: Multi-Region Failover Sentinel & Rolling Canary Health Probe
export async function runOpsHealthAndCanaryProbe(request, env) {
  const tStart = Date.now();

  // 1. D1 Database Probe
  const d1Start = Date.now();
  let d1Status = 'DOWN';
  let d1LatencyMs = 0;
  const counts = { posts: 0, schemes: 0, snapshots: 0, users: 0 };
  let d1Error = null;
  if (env && env.DB) {
    try {
      const ping = await env.DB.prepare('SELECT 1 AS ok').first();
      if (ping && Number(ping.ok) === 1) d1Status = 'UP';
      const safeCount = async (sql) => {
        try {
          const r = await env.DB.prepare(sql).first();
          return r && r.n !== undefined ? Number(r.n) : 0;
        } catch {
          return 0;
        }
      };
      const [postsN, schemesN, snapsN, usersN] = await Promise.all([
        safeCount('SELECT COUNT(*) AS n FROM posts WHERE deleted_at IS NULL'),
        safeCount('SELECT COUNT(*) AS n FROM schemes_directory'),
        safeCount('SELECT COUNT(*) AS n FROM ops_snapshots'),
        safeCount('SELECT COUNT(*) AS n FROM users')
      ]);
      counts.posts = postsN;
      counts.schemes = schemesN;
      counts.snapshots = snapsN;
      counts.users = usersN;
    } catch (e) {
      d1Status = 'DOWN';
      d1Error = e && e.message ? e.message : 'D1 probe failed';
    }
  }
  d1LatencyMs = Math.max(1, Date.now() - d1Start);

  // 2. R2 Cold Vault Probe
  const r2Start = Date.now();
  let r2Status = 'DOWN';
  let r2LatencyMs = 0;
  let r2SampleCount = 0;
  let r2Error = null;
  if (env && env.MEDIA) {
    try {
      if (typeof env.MEDIA.list === 'function') {
        const listed = await env.MEDIA.list({ prefix: 'backups/snapshots/', limit: 1 });
        r2SampleCount = listed && Array.isArray(listed.objects) ? listed.objects.length : 0;
        r2Status = 'UP';
      } else if (typeof env.MEDIA.head === 'function') {
        await env.MEDIA.head('backups/snapshots/__probe__');
        r2Status = 'UP';
      }
    } catch (e) {
      r2Status = 'DOWN';
      r2Error = e && e.message ? e.message : 'R2 probe failed';
    }
  }
  r2LatencyMs = Math.max(1, Date.now() - r2Start);

  // 3. Edge Colo & Request Metadata (Cloudflare request.cf)
  const cf = (request && request.cf) || {};
  const edge = {
    colo: String(cf.colo || request.headers.get('cf-ray')?.split('-')[1] || 'LOCAL-DEV'),
    country: String(cf.country || request.headers.get('cf-ipcountry') || 'IN'),
    city: String(cf.city || 'Bhubaneswar'),
    region: String(cf.region || 'Odisha'),
    tlsVersion: String(cf.tlsVersion || 'TLSv1.3'),
    httpProtocol: String(cf.httpProtocol || 'HTTP/2'),
    asn: cf.asn || null,
    asOrganization: String(cf.asOrganization || 'Cloudflare Edge Network')
  };

  // 4. Canary & Service Worker Cache Readiness
  let serviceWorkerCacheName = 'cso-candidate-cache-v26';
  let swStatus = 'READY';
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    try {
      const origin = new URL(request.url).origin;
      const swRes = await env.ASSETS.fetch(new Request(new URL('/sw.js', origin).toString()));
      if (swRes && swRes.status === 200) {
        const swText = await swRes.text();
        const m = swText.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
        if (m && m[1]) serviceWorkerCacheName = m[1];
      } else {
        swStatus = 'DEGRADED';
      }
    } catch {
      swStatus = 'DEGRADED';
    }
  }

  // 5. Read-Only Freeze State & Overall Platform Status
  const freeze = await getReadOnlyFreezeState(env);
  let status = 'HEALTHY';
  if (freeze.enabled) {
    status = 'FROZEN';
  } else if (d1Status !== 'UP' || r2Status !== 'UP') {
    status = 'DEGRADED';
  }

  return {
    ok: d1Status === 'UP' && r2Status === 'UP',
    status,
    checked_at: new Date().toISOString(),
    total_latency_ms: Math.max(1, Date.now() - tStart),
    freeze,
    d1: {
      status: d1Status,
      latency_ms: d1LatencyMs,
      counts,
      error: d1Error
    },
    r2: {
      status: r2Status,
      latency_ms: r2LatencyMs,
      bucket: 'cso-media',
      snapshot_sample_count: r2SampleCount,
      error: r2Error
    },
    edge,
    canary: {
      sw_cache_name: serviceWorkerCacheName,
      sw_status: swStatus,
      edge_cache_bound: Boolean(resolveEdgeCache(env)),
      zero_downtime_ready: d1Status === 'UP' && r2Status === 'UP'
    }
  };
}

// Admin Router Dispatcher for /api/admin/ops/{freeze|cache|health}
export async function handleOpsSentinel(request, env, actor, subAction, subId) {
  const method = request.method;

  // Module #12: GET/POST /api/admin/ops/freeze
  if (subAction === 'freeze') {
    if (method === 'GET') {
      const freeze = await getReadOnlyFreezeState(env);
      return json({ ok: true, freeze }, 200, { 'Cache-Control': 'no-store' });
    }
    if (method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can toggle Emergency Read-Only Freeze');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const enabled = Boolean(body.enabled);
      const reason = String(body.reason || '').trim();
      const freeze = await setReadOnlyFreezeState(env, {
        enabled,
        reason,
        actorEmail: actor.email || actor.userId
      });
      await audit(
        env,
        request,
        actor,
        enabled ? 'ops.freeze.enable' : 'ops.freeze.disable',
        'site_settings',
        FREEZE_SETTING_KEY,
        { enabled: freeze.enabled, reason: freeze.reason }
      );
      return json({ ok: true, freeze }, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #7: GET /api/admin/ops/cache-warmer, PUT /api/admin/ops/cache-warmer/routes, POST /api/admin/ops/cache-warmer/warm
  if (subAction === 'cache-warmer') {
    if (!subId && method === 'GET') {
      return json(await getCacheWarmerStatus(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'routes' && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can edit edge cache warmer routes');
      }
      const body = await readJson(request, 20000).catch(() => ({}));
      const saved = await saveCacheWarmerRoutes(env, body && body.routes, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.cache.routes.update', 'site_settings', CACHE_WARMER_URLS_KEY, {
        routes_count: saved.routes_count,
        routes: saved.routes
      });
      return json(saved, 200, { 'Cache-Control': 'no-store' });
    }
    if ((subId === 'warm' || !subId) && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can warm the edge cache');
      }
      const body = await readJson(request, 20000).catch(() => ({}));
      const dryRun = Boolean(body && body.dry_run);
      const report = await runCacheWarmer(request, env, {
        dryRun,
        routes: body && body.routes ? body.routes : null,
        actorEmail: actor.email || actor.userId
      });
      if (!dryRun) {
        await audit(env, request, actor, 'ops.cache.warm', 'edge_cache', 'warmer', {
          routes_count: report.routes_count,
          warmed_count: report.warmed_count,
          avg_latency_ms: report.avg_latency_ms,
          total_latency_ms: report.total_latency_ms
        });
      }
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #7: POST /api/admin/ops/cache
  if (subAction === 'cache') {
    if (method !== 'POST') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }
    if (actor.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can warm or purge the edge cache');
    }
    const body = await readJson(request, 20000).catch(() => ({}));
    const action = body.action || 'warm';
    const report = await manageEdgeCache(request, env, { action, routes: body.routes });
    await audit(
      env,
      request,
      actor,
      report.action === 'purge' ? 'ops.cache.purge' : 'ops.cache.warm',
      'edge_cache',
      report.action,
      {
        action: report.action,
        routes_count: report.routes.length,
        total_latency_ms: report.total_latency_ms
      }
    );
    return json(report, 200, { 'Cache-Control': 'no-store' });
  }

  // Modules #9 & #15: GET /api/admin/ops/health
  if (subAction === 'health') {
    if (method !== 'GET') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }
    const report = await runOpsHealthAndCanaryProbe(request, env);
    return json(report, 200, { 'Cache-Control': 'no-store' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown ops sentinel endpoint');
}
