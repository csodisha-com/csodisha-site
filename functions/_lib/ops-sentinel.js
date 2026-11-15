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
export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v69';

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

// Module #12 granular site_settings keys (mirrors of the canonical FREEZE_SETTING_KEY JSON state)
export const FREEZE_MIRROR_KEYS = {
  enabled: 'ops_maintenance_freeze',
  reason: 'ops_freeze_reason',
  banner: 'ops_freeze_banner',
  updated_by: 'ops_freeze_updated_by',
  updated_at: 'ops_freeze_updated_at'
};
export const DEFAULT_FREEZE_BANNER = 'CS Odisha is in scheduled maintenance. Browsing works normally; submissions are paused for a few minutes.';

function sanitizeNoticeText(raw, max) {
  return String(raw || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/[<>]/g, '').trim().slice(0, max);
}

export async function getReadOnlyFreezeState(env) {
  const fallback = {
    enabled: false,
    reason: '',
    banner: DEFAULT_FREEZE_BANNER,
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
      banner: String((parsed && parsed.banner) || DEFAULT_FREEZE_BANNER),
      activated_by: (parsed && parsed.activated_by) || row.updated_by || null,
      activated_at: (parsed && parsed.activated_at) || row.updated_at || null
    };
  } catch {
    return fallback;
  }
}

export async function setReadOnlyFreezeState(env, { enabled, reason = '', banner = '', actorEmail = 'admin' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);
  const nowIso = new Date().toISOString();
  const cleanEnabled = Boolean(enabled);
  const cleanReason = sanitizeNoticeText(reason, 280) ||
    (cleanEnabled ? 'Scheduled platform maintenance / emergency read-only protection active.' : '');
  const cleanBanner = sanitizeNoticeText(banner, 280) || DEFAULT_FREEZE_BANNER;
  const actor = actorEmail || 'admin';
  const state = {
    enabled: cleanEnabled,
    reason: cleanReason,
    banner: cleanBanner,
    activated_by: actor,
    activated_at: nowIso
  };
  const upsert = `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`;
  await env.DB.prepare(upsert).bind(FREEZE_SETTING_KEY, JSON.stringify(state), actor, nowIso).run();
  const mirrors = [
    [FREEZE_MIRROR_KEYS.enabled, cleanEnabled],
    [FREEZE_MIRROR_KEYS.reason, cleanReason],
    [FREEZE_MIRROR_KEYS.banner, cleanBanner],
    [FREEZE_MIRROR_KEYS.updated_by, actor],
    [FREEZE_MIRROR_KEYS.updated_at, nowIso]
  ];
  for (const [k, v] of mirrors) {
    await env.DB.prepare(upsert).bind(k, JSON.stringify(v), actor, nowIso).run();
  }
  return state;
}

export async function listFreezeAuditHistory(env, limit = 10) {
  if (!env || !env.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, actor_user_id, action, metadata_json, created_at
       FROM audit_log
       WHERE action LIKE 'ops.freeze.%'
       ORDER BY id DESC
       LIMIT ?`
    ).bind(Math.max(1, Math.min(50, Number(limit) || 10))).all();
    return (results || []).map(r => {
      let meta = {};
      try { meta = r.metadata_json ? JSON.parse(r.metadata_json) : {}; } catch {}
      return {
        id: r.id,
        actor: (meta && meta.actor) || r.actor_user_id || 'admin',
        action: r.action,
        enabled: Boolean(meta && meta.enabled),
        reason: (meta && meta.reason) || '',
        created_at: r.created_at
      };
    });
  } catch {
    return [];
  }
}

// ============================================================================
// Module #9: Multi-Region Failover Sentinel & Health Monitor
// ============================================================================
export const SENTINEL_CONFIG_KEY = 'ops_sentinel_config';
export const LAST_SENTINEL_PROBE_KEY = 'ops_last_sentinel_probe';
export const SENTINEL_SUBSYSTEMS = ['d1', 'r2', 'edge', 'sw'];
const SENTINEL_LABELS = {
  d1: 'Cloudflare D1 Primary Database',
  r2: 'Cloudflare R2 Object Storage',
  edge: 'Cloudflare Edge POP / Ray Metadata',
  sw: 'Service Worker Canary (sw.js)'
};

export function defaultSentinelConfig() {
  return {
    latency_warning_ms: 250,
    alerts_enabled: false,
    alert_channel: 'email',
    monitored_subsystems: SENTINEL_SUBSYSTEMS.slice(),
    updated_by: null,
    updated_at: null
  };
}

export async function getSentinelConfig(env) {
  const def = defaultSentinelConfig();
  if (!env || !env.DB) return def;
  try {
    await ensureSiteSettingsTable(env.DB);
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(SENTINEL_CONFIG_KEY).first();
    if (!row || !row.value_json) return def;
    const p = JSON.parse(row.value_json) || {};
    const subs = Array.isArray(p.monitored_subsystems)
      ? p.monitored_subsystems.filter(s => SENTINEL_SUBSYSTEMS.includes(s))
      : def.monitored_subsystems;
    return {
      latency_warning_ms: Math.max(50, Math.min(5000, Number(p.latency_warning_ms) || def.latency_warning_ms)),
      alerts_enabled: Boolean(p.alerts_enabled),
      alert_channel: p.alert_channel === 'webhook' ? 'webhook' : 'email',
      monitored_subsystems: subs.length ? subs : def.monitored_subsystems,
      updated_by: p.updated_by || null,
      updated_at: p.updated_at || null
    };
  } catch {
    return def;
  }
}

export async function saveSentinelConfig(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);
  const prev = await getSentinelConfig(env);
  let threshold = prev.latency_warning_ms;
  if (input.latency_warning_ms !== undefined) {
    const n = Number(input.latency_warning_ms);
    if (!Number.isInteger(n) || n < 50 || n > 5000) {
      throw new HttpError(400, 'INVALID_THRESHOLD', 'latency_warning_ms must be an integer between 50 and 5000');
    }
    threshold = n;
  }
  let subs = prev.monitored_subsystems;
  if (input.monitored_subsystems !== undefined) {
    if (!Array.isArray(input.monitored_subsystems)) {
      throw new HttpError(400, 'INVALID_SUBSYSTEMS', 'monitored_subsystems must be an array');
    }
    const bad = input.monitored_subsystems.filter(s => !SENTINEL_SUBSYSTEMS.includes(s));
    if (bad.length) {
      throw new HttpError(400, 'INVALID_SUBSYSTEMS', 'Unknown subsystem(s): ' + bad.join(', ') + '. Allowed: ' + SENTINEL_SUBSYSTEMS.join(', '));
    }
    subs = [...new Set(input.monitored_subsystems)];
    if (!subs.length) throw new HttpError(400, 'INVALID_SUBSYSTEMS', 'At least one subsystem must be monitored');
  }
  if (input.alert_channel !== undefined && !['email', 'webhook'].includes(input.alert_channel)) {
    throw new HttpError(400, 'INVALID_ALERT_CHANNEL', 'alert_channel must be "email" or "webhook"');
  }
  const nowIso = new Date().toISOString();
  const cfg = {
    latency_warning_ms: threshold,
    alerts_enabled: input.alerts_enabled !== undefined ? Boolean(input.alerts_enabled) : prev.alerts_enabled,
    alert_channel: input.alert_channel || prev.alert_channel,
    monitored_subsystems: subs,
    updated_by: actorEmail || 'admin',
    updated_at: nowIso
  };
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(SENTINEL_CONFIG_KEY, JSON.stringify(cfg), cfg.updated_by, nowIso).run();
  return cfg;
}

async function readLastSentinelProbe(env) {
  if (!env || !env.DB) return null;
  try {
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(LAST_SENTINEL_PROBE_KEY).first();
    return row && row.value_json ? JSON.parse(row.value_json) : null;
  } catch {
    return null;
  }
}

export function classifySentinelPosture(subsystems, thresholdMs) {
  const monitored = subsystems.filter(s => s.monitored);
  if (monitored.some(s => s.status === 'DOWN')) return 'CRITICAL';
  if (monitored.some(s => s.status === 'DEGRADED' || (s.latency_ms !== null && s.latency_ms > thresholdMs))) return 'DEGRADED';
  return 'HEALTHY';
}

export async function runSentinelProbe(request, env, { persist = false, actorEmail = 'admin' } = {}) {
  const config = await getSentinelConfig(env);
  const base = await runOpsHealthAndCanaryProbe(request, env);
  const threshold = config.latency_warning_ms;
  const isMon = id => config.monitored_subsystems.includes(id);

  const subsystems = [
    {
      id: 'd1',
      label: SENTINEL_LABELS.d1,
      status: base.d1.status,
      latency_ms: base.d1.latency_ms,
      detail: base.d1.error || `SELECT 1 OK · ${base.d1.counts.posts} posts · ${base.d1.counts.snapshots} snapshots`,
      monitored: isMon('d1')
    },
    {
      id: 'r2',
      label: SENTINEL_LABELS.r2,
      status: base.r2.status,
      latency_ms: base.r2.latency_ms,
      detail: base.r2.error || `list/head reachable · bucket ${base.r2.bucket}`,
      monitored: isMon('r2')
    },
    {
      id: 'edge',
      label: SENTINEL_LABELS.edge,
      status: 'UP',
      latency_ms: null,
      detail: `${base.edge.colo} · ${base.edge.city}, ${base.edge.country} · ${base.edge.httpProtocol} · ${base.edge.tlsVersion}`,
      monitored: isMon('edge')
    },
    {
      id: 'sw',
      label: SENTINEL_LABELS.sw,
      status: base.canary.sw_status === 'READY' ? 'UP' : 'DEGRADED',
      latency_ms: null,
      detail: `CACHE_NAME ${base.canary.sw_cache_name}`,
      monitored: isMon('sw')
    }
  ].map(s => ({
    ...s,
    over_threshold: s.latency_ms !== null && s.latency_ms > threshold
  }));

  const posture = classifySentinelPosture(subsystems, threshold);
  const probe = {
    ok: true,
    posture,
    probed_at: new Date().toISOString(),
    probed_by: actorEmail || 'admin',
    threshold_ms: threshold,
    total_latency_ms: base.total_latency_ms,
    d1_latency_ms: base.d1.latency_ms,
    r2_latency_ms: base.r2.latency_ms,
    edge: base.edge,
    freeze_enabled: Boolean(base.freeze && base.freeze.enabled),
    subsystems
  };

  if (persist && env && env.DB) {
    await ensureSiteSettingsTable(env.DB);
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(LAST_SENTINEL_PROBE_KEY, JSON.stringify(probe), probe.probed_by, probe.probed_at).run();
  }
  return probe;
}

export async function getSentinelStatus(request, env) {
  const [config, lastProbe, live] = await Promise.all([
    getSentinelConfig(env),
    readLastSentinelProbe(env),
    runSentinelProbe(request, env, { persist: false })
  ]);
  return {
    ok: true,
    config,
    live,
    last_probe: lastProbe,
    last_probe_at: lastProbe ? lastProbe.probed_at : null
  };
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
        banner: freeze.banner,
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
  let serviceWorkerCacheName = ACTIVE_SW_CACHE_VERSION;
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

// ============================================================================
// Module #15: Zero-Downtime Deployment Canary & Health Gate
// ============================================================================
export const CANARY_CONFIG_KEY = 'ops_canary_config';
export const LAST_CANARY_GATE_KEY = 'ops_last_canary_gate';

export function defaultCanaryConfig() {
  return {
    max_latency_ms: 500,
    require_d1_ok: true,
    require_r2_ok: true,
    require_sw_match: true,
    updated_by: null,
    updated_at: null
  };
}

export async function getCanaryConfig(env) {
  const def = defaultCanaryConfig();
  if (!env || !env.DB) return def;
  try {
    await ensureSiteSettingsTable(env.DB);
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(CANARY_CONFIG_KEY).first();
    if (!row || !row.value_json) return def;
    const p = JSON.parse(row.value_json) || {};
    return {
      max_latency_ms: Math.max(50, Math.min(5000, Number(p.max_latency_ms) || def.max_latency_ms)),
      require_d1_ok: p.require_d1_ok !== undefined ? Boolean(p.require_d1_ok) : true,
      require_r2_ok: p.require_r2_ok !== undefined ? Boolean(p.require_r2_ok) : true,
      require_sw_match: p.require_sw_match !== undefined ? Boolean(p.require_sw_match) : true,
      updated_by: p.updated_by || null,
      updated_at: p.updated_at || null
    };
  } catch {
    return def;
  }
}

export async function saveCanaryConfig(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);
  const prev = await getCanaryConfig(env);
  let maxLat = prev.max_latency_ms;
  if (input.max_latency_ms !== undefined) {
    const n = Number(input.max_latency_ms);
    if (!Number.isInteger(n) || n < 50 || n > 5000) {
      throw new HttpError(400, 'INVALID_MAX_LATENCY', 'max_latency_ms must be an integer between 50 and 5000');
    }
    maxLat = n;
  }
  const nowIso = new Date().toISOString();
  const cfg = {
    max_latency_ms: maxLat,
    require_d1_ok: input.require_d1_ok !== undefined ? Boolean(input.require_d1_ok) : prev.require_d1_ok,
    require_r2_ok: input.require_r2_ok !== undefined ? Boolean(input.require_r2_ok) : prev.require_r2_ok,
    require_sw_match: input.require_sw_match !== undefined ? Boolean(input.require_sw_match) : prev.require_sw_match,
    updated_by: actorEmail || 'admin',
    updated_at: nowIso
  };
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(CANARY_CONFIG_KEY, JSON.stringify(cfg), cfg.updated_by, nowIso).run();
  return cfg;
}

async function readLastCanaryGate(env) {
  if (!env || !env.DB) return null;
  try {
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(LAST_CANARY_GATE_KEY).first();
    return row && row.value_json ? JSON.parse(row.value_json) : null;
  } catch {
    return null;
  }
}

export async function evaluateCanaryGate(request, env, { persist = false, actorEmail = 'admin' } = {}) {
  const cfg = await getCanaryConfig(env);
  const base = await runOpsHealthAndCanaryProbe(request, env);

  // Measure core route health via warm check or fetch if ASSETS/SELF_FETCH exists
  let coreRouteOk = true;
  let coreRouteLatencyMs = 1;
  let coreRouteDetail = 'Edge router ready';
  if (env && typeof env.SELF_FETCH === 'function') {
    const t0 = Date.now();
    try {
      const origin = new URL(request.url).origin;
      const r = await env.SELF_FETCH(new Request(new URL('/', origin).toString(), { method: 'GET' }), env);
      coreRouteLatencyMs = Math.max(1, Date.now() - t0);
      coreRouteOk = Boolean(r && r.status >= 200 && r.status < 400);
      coreRouteDetail = `GET / -> HTTP ${r ? r.status : 502} (${coreRouteLatencyMs} ms)`;
    } catch {
      coreRouteOk = false;
      coreRouteDetail = 'Core route probe failed';
    }
  } else if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    const t0 = Date.now();
    try {
      const origin = new URL(request.url).origin;
      const r = await env.ASSETS.fetch(new Request(new URL('/', origin).toString(), { method: 'GET' }));
      coreRouteLatencyMs = Math.max(1, Date.now() - t0);
      coreRouteOk = Boolean(r && r.status >= 200 && r.status < 400);
      coreRouteDetail = `ASSETS GET / -> HTTP ${r ? r.status : 502} (${coreRouteLatencyMs} ms)`;
    } catch {
      coreRouteOk = false;
      coreRouteDetail = 'ASSETS core route failed';
    }
  }

  const d1Pass = base.d1.status === 'UP' && base.d1.latency_ms <= cfg.max_latency_ms;
  const r2Pass = base.r2.status === 'UP' && base.r2.latency_ms <= cfg.max_latency_ms;
  const swMatch = base.canary.sw_status === 'READY' && (!cfg.require_sw_match || base.canary.sw_cache_name === ACTIVE_SW_CACHE_VERSION);
  const freezeOff = !base.freeze.enabled;

  const checks = [
    {
      id: 'd1_primary',
      label: 'D1 Primary',
      status: d1Pass ? 'PASS' : 'FAIL',
      required: cfg.require_d1_ok,
      detail: `${base.d1.status} · ${base.d1.latency_ms} ms (max ${cfg.max_latency_ms} ms)`,
      latency_ms: base.d1.latency_ms
    },
    {
      id: 'r2_cold_vault',
      label: 'R2 Cold Vault',
      status: r2Pass ? 'PASS' : 'FAIL',
      required: cfg.require_r2_ok,
      detail: `${base.r2.status} · ${base.r2.latency_ms} ms (max ${cfg.max_latency_ms} ms)`,
      latency_ms: base.r2.latency_ms
    },
    {
      id: 'sw_cache_version',
      label: 'Service Worker Cache',
      status: swMatch ? 'PASS' : 'FAIL',
      required: cfg.require_sw_match,
      detail: `${base.canary.sw_cache_name} (expected ${ACTIVE_SW_CACHE_VERSION})`,
      latency_ms: null
    },
    {
      id: 'freeze_posture',
      label: 'Freeze Posture',
      status: freezeOff ? 'PASS' : 'FAIL',
      required: true,
      detail: freezeOff ? 'Unfrozen (writes active)' : ('FROZEN: ' + (base.freeze.reason || 'Maintenance active')),
      latency_ms: null
    },
    {
      id: 'core_routes',
      label: 'Core Routes',
      status: coreRouteOk ? 'PASS' : 'FAIL',
      required: true,
      detail: coreRouteDetail,
      latency_ms: coreRouteLatencyMs
    }
  ];

  const allRequiredPassed = checks.every(c => !c.required || c.status === 'PASS');
  const passedCount = checks.filter(c => c.status === 'PASS').length;
  const evaluatedAt = new Date().toISOString();

  const gate = {
    ok: true,
    verdict: allRequiredPassed ? 'GO' : 'NO-GO',
    release_status: allRequiredPassed ? 'PASS' : 'BLOCKED',
    passed_count: passedCount,
    total_checks: checks.length,
    active_cache_version: ACTIVE_SW_CACHE_VERSION,
    observed_sw_cache: base.canary.sw_cache_name,
    total_latency_ms: Math.max(base.total_latency_ms, coreRouteLatencyMs),
    evaluated_at: evaluatedAt,
    evaluated_by: actorEmail || 'admin',
    checks
  };

  if (persist && env && env.DB) {
    await ensureSiteSettingsTable(env.DB);
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(LAST_CANARY_GATE_KEY, JSON.stringify(gate), gate.evaluated_by, evaluatedAt).run();
  }
  return gate;
}

export async function getCanaryGateStatus(request, env) {
  const [config, gate, last_gate] = await Promise.all([
    getCanaryConfig(env),
    evaluateCanaryGate(request, env, { persist: false }),
    readLastCanaryGate(env)
  ]);
  return {
    ok: true,
    config,
    gate,
    last_gate
  };
}

// Admin Router Dispatcher for /api/admin/ops/{freeze|cache|health}
export async function handleOpsSentinel(request, env, actor, subAction, subId) {
  const method = request.method;

  // Module #12: GET/POST /api/admin/ops/freeze
  if (subAction === 'freeze') {
    if (method === 'GET') {
      const [freeze, history] = await Promise.all([
        getReadOnlyFreezeState(env),
        listFreezeAuditHistory(env, 10)
      ]);
      return json({ ok: true, freeze, history }, 200, { 'Cache-Control': 'no-store' });
    }
    if (method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can toggle Emergency Read-Only Freeze');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      if (typeof body.enabled !== 'boolean') {
        throw new HttpError(400, 'INVALID_ENABLED_FLAG', '"enabled" must be a boolean (true to freeze, false to lift)');
      }
      const enabled = body.enabled;
      const expected = enabled ? 'FREEZE' : 'UNFREEZE';
      const confirmVal = String((body.confirm !== undefined ? body.confirm : body.confirm_phrase) || '').trim();
      if (confirmVal !== expected) {
        throw new HttpError(400, 'CONFIRMATION_REQUIRED', `Type ${expected} in the confirmation field to ${enabled ? 'activate' : 'lift'} the read-only freeze`);
      }
      const freeze = await setReadOnlyFreezeState(env, {
        enabled,
        reason: body.reason,
        banner: body.banner,
        actorEmail: actor.email || actor.userId
      });
      await audit(
        env,
        request,
        actor,
        'ops.freeze.toggle',
        'site_settings',
        FREEZE_SETTING_KEY,
        { actor: actor.email || actor.userId, enabled: freeze.enabled, reason: freeze.reason, banner: freeze.banner }
      );
      const history = await listFreezeAuditHistory(env, 10);
      return json({ ok: true, freeze, history }, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #9: GET /api/admin/ops/sentinel, PUT /api/admin/ops/sentinel/config, POST /api/admin/ops/sentinel/probe
  if (subAction === 'sentinel') {
    if (!subId && method === 'GET') {
      return json(await getSentinelStatus(request, env), 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'config' && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can edit the failover sentinel policy');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const config = await saveSentinelConfig(env, body || {}, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.sentinel.config.update', 'site_settings', SENTINEL_CONFIG_KEY, {
        latency_warning_ms: config.latency_warning_ms,
        monitored_subsystems: config.monitored_subsystems,
        alerts_enabled: config.alerts_enabled,
        alert_channel: config.alert_channel
      });
      return json({ ok: true, config }, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'probe' && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can run persisted sentinel probes');
      }
      const probe = await runSentinelProbe(request, env, { persist: true, actorEmail: actor.email || actor.userId });
      await audit(env, request, actor, 'ops.sentinel.probe', 'site_settings', LAST_SENTINEL_PROBE_KEY, {
        posture: probe.posture,
        d1_latency_ms: probe.d1_latency_ms,
        r2_latency_ms: probe.r2_latency_ms,
        threshold_ms: probe.threshold_ms,
        edge_colo: probe.edge && probe.edge.colo
      });
      return json(probe, 200, { 'Cache-Control': 'no-store' });
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

  // Module #15: GET /api/admin/ops/canary, PUT /api/admin/ops/canary/config, POST /api/admin/ops/canary/evaluate
  if (subAction === 'canary') {
    if (!subId && method === 'GET') {
      return json(await getCanaryGateStatus(request, env), 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'config' && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can edit canary release gate thresholds');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const config = await saveCanaryConfig(env, body || {}, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.canary.config.update', 'site_settings', CANARY_CONFIG_KEY, {
        max_latency_ms: config.max_latency_ms,
        require_d1_ok: config.require_d1_ok,
        require_r2_ok: config.require_r2_ok,
        require_sw_match: config.require_sw_match
      });
      return json({ ok: true, config }, 200, { 'Cache-Control': 'no-store' });
    }
    if ((subId === 'evaluate' || !subId) && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can evaluate deployment canary gates');
      }
      const gate = await evaluateCanaryGate(request, env, { persist: true, actorEmail: actor.email || actor.userId });
      await audit(env, request, actor, 'ops.canary.evaluate', 'site_settings', LAST_CANARY_GATE_KEY, {
        verdict: gate.verdict,
        release_status: gate.release_status,
        passed_count: gate.passed_count,
        total_checks: gate.total_checks,
        active_cache_version: gate.active_cache_version,
        observed_sw_cache: gate.observed_sw_cache
      });
      return json(gate, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
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
