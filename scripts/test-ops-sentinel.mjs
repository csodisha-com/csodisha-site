// Unit tests for Modules #7 (Edge Cache Warmer/Purger), #9 (Failover Sentinel),
// #12 (Emergency Read-Only Freeze), and #15 (Rolling Canary Health).
// Run: node scripts/test-ops-sentinel.mjs
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  CORE_CACHE_ROUTES,
  ACTIVE_SW_CACHE_VERSION,
  getReadOnlyFreezeState,
  setReadOnlyFreezeState,
  checkReadOnlyFreezeGuard,
  manageEdgeCache,
  getCacheWarmerStatus,
  saveCacheWarmerRoutes,
  runCacheWarmer,
  runOpsHealthAndCanaryProbe,
  getSentinelConfig,
  saveSentinelConfig,
  runSentinelProbe,
  classifySentinelPosture,
  getCanaryGateStatus,
  saveCanaryConfig,
  evaluateCanaryGate,
  handleOpsSentinel
} from '../functions/_lib/ops-sentinel.js';

function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE site_settings (key TEXT PRIMARY KEY, value_json TEXT, updated_by TEXT, updated_at TEXT);
    CREATE TABLE posts (id TEXT PRIMARY KEY, type TEXT, slug TEXT, title TEXT, status TEXT, deleted_at TEXT);
    CREATE TABLE schemes_directory (id TEXT PRIMARY KEY, slug TEXT, title TEXT, status TEXT);
    CREATE TABLE ops_snapshots (id TEXT PRIMARY KEY, label TEXT, r2_key TEXT, sha256 TEXT, size_bytes INTEGER, row_counts_json TEXT, trigger_type TEXT, created_by TEXT, created_at TEXT);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, salt TEXT, role TEXT, failed_attempts INTEGER, lockout_until INTEGER, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now')));
    INSERT INTO posts VALUES ('job-1', 'job', 'opsc-oas-2026', 'OPSC Civil Services', 'published', NULL);
    INSERT INTO schemes_directory VALUES ('sch-1', 'subhadra-yojana', 'Subhadra Yojana', 'published');
    INSERT INTO users VALUES ('u-1', 'admin@csodisha.com', '00', '00', 'admin', 0, 0, 1700000000, 1700000000);
  `);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) || [] })
  });
  return { db, prepare: s => stmt(s) };
}

function makeR2() {
  return {
    async list() {
      return { objects: [{ key: 'backups/snapshots/sample.json', size: 512 }] };
    },
    async head() {
      return null;
    }
  };
}

function makeEdgeCache() {
  const map = new Map();
  return {
    map,
    async put(req, res) {
      const k = typeof req === 'string' ? req : req.url;
      map.set(k, res);
    },
    async match(req) {
      const k = typeof req === 'string' ? req : req.url;
      return map.get(k) || null;
    },
    async delete(req) {
      const k = typeof req === 'string' ? req : req.url;
      return map.delete(k);
    }
  };
}

function makeAssets() {
  return {
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/sw.js') {
        return new Response("const CACHE_NAME = 'cso-candidate-cache-v26';", {
          status: 200,
          headers: { 'Content-Type': 'application/javascript' }
        });
      }
      return new Response('<!doctype html><html><head><title>CS Odisha</title></head><body>OK</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  };
}

const env = {
  DB: makeD1(),
  MEDIA: makeR2(),
  EDGE_CACHE: makeEdgeCache(),
  ASSETS: makeAssets(),
  SELF_FETCH: async (req) => new Response('WARMED:' + new URL(req.url).pathname, { status: 200 })
};

// 1. Default freeze state is disabled
const initialFreeze = await getReadOnlyFreezeState(env);
assert.equal(initialFreeze.enabled, false);
const allowedWhenUnfrozen = await checkReadOnlyFreezeGuard(
  new Request('https://csodisha.com/api/admin/jobs', { method: 'POST' }),
  env
);
assert.equal(allowedWhenUnfrozen, null, 'writes must be allowed when freeze is disabled');

// 2. Enable Emergency Read-Only Freeze (Module #12)
const activeFreeze = await setReadOnlyFreezeState(env, {
  enabled: true,
  reason: 'Emergency D1 replica cutover drill',
  actorEmail: 'admin@csodisha.com'
});
assert.equal(activeFreeze.enabled, true);
assert.equal(activeFreeze.reason, 'Emergency D1 replica cutover drill');

// 2a. Public & editor POST writes return HTTP 503 READ_ONLY_FREEZE via checkReadOnlyFreezeGuard
for (const blockedPath of ['/api/admin/jobs', '/api/admin/pages', '/api/auth/register', '/api/candidate/bookmarks']) {
  const res = await checkReadOnlyFreezeGuard(
    new Request('https://csodisha.com' + blockedPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    }),
    env
  );
  assert.ok(res instanceof Response, `${blockedPath} must be intercepted during read-only freeze`);
  assert.equal(res.status, 503, `${blockedPath} must return 503 during read-only freeze`);
  const body = await res.json();
  assert.equal(body.error, 'READ_ONLY_FREEZE');
  assert.equal(body.message, 'Emergency D1 replica cutover drill');
}

// 2b. Public GET requests remain unaffected during freeze
const getHealthRes = await checkReadOnlyFreezeGuard(
  new Request('https://csodisha.com/api/posts?limit=20', { method: 'GET' }),
  env
);
assert.equal(getHealthRes, null, 'GET requests must never be blocked by read-only freeze');

// 2c. Allowlisted admin recovery/login routes bypass the 503 freeze guard
for (const allowPath of [
  '/api/admin/login',
  '/api/admin/auth/send-otp',
  '/api/admin/ops/freeze',
  '/api/admin/ops/snapshots',
  '/api/admin/session',
  '/api/auth/login'
]) {
  const guardRes = await checkReadOnlyFreezeGuard(
    new Request('https://csodisha.com' + allowPath, { method: 'POST' }),
    env
  );
  assert.equal(guardRes, null, `allowlisted route ${allowPath} must bypass read-only freeze`);
}

// Verify handleOpsSentinel('freeze') allows Super Admin to inspect and toggle freeze over HTTP
const adminActor = { userId: 'u-1', email: 'admin@csodisha.com', role: 'admin' };
const getFreezeHttp = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/freeze', { method: 'GET' }),
  env,
  adminActor,
  'freeze'
);
assert.equal(getFreezeHttp.status, 200);
const getFreezeJson = await getFreezeHttp.json();
assert.equal(getFreezeJson.freeze.enabled, true);

// 3. Health & Canary Probe while frozen -> status === 'FROZEN' (Modules #9 & #15)
const probeReq = new Request('https://csodisha.com/api/admin/ops/health', { method: 'GET' });
Object.defineProperty(probeReq, 'cf', {
  value: { colo: 'CCU', country: 'IN', city: 'Kolkata', tlsVersion: 'TLSv1.3', httpProtocol: 'HTTP/3' }
});
const healthFrozen = await runOpsHealthAndCanaryProbe(probeReq, env);
assert.equal(healthFrozen.ok, true);
assert.equal(healthFrozen.status, 'FROZEN');
assert.equal(healthFrozen.d1.status, 'UP');
assert.equal(healthFrozen.d1.counts.posts, 1);
assert.equal(healthFrozen.r2.status, 'UP');
assert.equal(healthFrozen.edge.colo, 'CCU');
assert.equal(healthFrozen.canary.sw_cache_name, 'cso-candidate-cache-v26');

// Lift freeze and re-run health probe -> status === 'HEALTHY'
await setReadOnlyFreezeState(env, { enabled: false, reason: '', actorEmail: 'admin@csodisha.com' });
const healthHealthy = await runOpsHealthAndCanaryProbe(probeReq, env);
assert.equal(healthHealthy.status, 'HEALTHY');
assert.equal(healthHealthy.freeze.enabled, false);

// 4. Edge Cache Warmer & Purger (Module #7)
const warmReport = await manageEdgeCache(
  new Request('https://csodisha.com/api/admin/ops/cache', { method: 'POST' }),
  env,
  { action: 'warm' }
);
assert.equal(warmReport.ok, true);
assert.equal(warmReport.action, 'warm');
assert.equal(warmReport.warmed_count, CORE_CACHE_ROUTES.length);
assert.equal(env.EDGE_CACHE.map.size, CORE_CACHE_ROUTES.length, 'all core routes must be stored in EDGE_CACHE');

const purgeReport = await manageEdgeCache(
  new Request('https://csodisha.com/api/admin/ops/cache', { method: 'POST' }),
  env,
  { action: 'purge' }
);
assert.equal(purgeReport.ok, true);
assert.equal(purgeReport.action, 'purge');
assert.equal(purgeReport.purged_count, CORE_CACHE_ROUTES.length);
assert.equal(env.EDGE_CACHE.map.size, 0, 'all core routes must be evicted from EDGE_CACHE after purge');

// 5. Module #7 Hardened Cache Warmer Routes, Dry Run & Telemetry Persistence
const warmerInit = await getCacheWarmerStatus(env);
assert.equal(warmerInit.ok, true);
assert.equal(warmerInit.cache_version, ACTIVE_SW_CACHE_VERSION);
assert.ok(warmerInit.routes.includes('/'));

await assert.rejects(
  () => saveCacheWarmerRoutes(env, ['https://evil.example.com/'], 'admin@csodisha.com'),
  err => err && err.status === 400 && err.code === 'INVALID_ROUTE_PATH'
);

const savedRoutes = await saveCacheWarmerRoutes(env, ['/', '/schemes/', '/study/'], 'admin@csodisha.com');
assert.equal(savedRoutes.routes_count, 3);

const dryWarm = await runCacheWarmer(
  new Request('https://csodisha.com/api/admin/ops/cache-warmer/warm', { method: 'POST' }),
  env,
  { dryRun: true, actorEmail: 'admin@csodisha.com' }
);
assert.equal(dryWarm.dry_run, true);
assert.equal(dryWarm.routes_count, 3);
assert.equal(dryWarm.routes[0].status, 'PENDING_DRY_RUN');

const liveWarm = await runCacheWarmer(
  new Request('https://csodisha.com/api/admin/ops/cache-warmer/warm', { method: 'POST' }),
  env,
  { dryRun: false, actorEmail: 'admin@csodisha.com' }
);
assert.equal(liveWarm.dry_run, false);
assert.equal(liveWarm.warmed_count, 3);
assert.ok(liveWarm.avg_latency_ms >= 1);

const warmerAfter = await getCacheWarmerStatus(env);
assert.ok(warmerAfter.last_warm && warmerAfter.last_warm.warmed_count === 3);

// 6. Module #9: Failover Sentinel config validation, probe classification & persistence
const sentDefault = await getSentinelConfig(env);
assert.equal(sentDefault.latency_warning_ms, 250);
assert.deepEqual(sentDefault.monitored_subsystems, ['d1', 'r2', 'edge', 'sw']);
await assert.rejects(() => saveSentinelConfig(env, { latency_warning_ms: 10 }), err => err.status === 400 && err.code === 'INVALID_THRESHOLD');
await assert.rejects(() => saveSentinelConfig(env, { latency_warning_ms: 9000 }), err => err.status === 400 && err.code === 'INVALID_THRESHOLD');
await assert.rejects(() => saveSentinelConfig(env, { monitored_subsystems: ['d1', 'bogus'] }), err => err.status === 400 && err.code === 'INVALID_SUBSYSTEMS');
await assert.rejects(() => saveSentinelConfig(env, { monitored_subsystems: [] }), err => err.status === 400 && err.code === 'INVALID_SUBSYSTEMS');

const cfgPut = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/sentinel/config', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latency_warning_ms: 400, monitored_subsystems: ['d1', 'r2'], alerts_enabled: true, alert_channel: 'webhook' })
  }),
  env, adminActor, 'sentinel', 'config'
);
assert.equal(cfgPut.status, 200);
assert.equal((await cfgPut.json()).config.latency_warning_ms, 400);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'ops.sentinel.config.update'`).first()).n >= 1);

const probeHttp = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/sentinel/probe', { method: 'POST' }),
  env, adminActor, 'sentinel', 'probe'
);
assert.equal(probeHttp.status, 200);
const probeBody = await probeHttp.json();
assert.equal(probeBody.posture, 'HEALTHY');
assert.equal(probeBody.threshold_ms, 400);
assert.equal(probeBody.subsystems.find(s => s.id === 'edge').monitored, false);
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'ops.sentinel.probe'`).first()).n >= 1);

const sentStatus = await handleOpsSentinel(new Request('https://csodisha.com/api/admin/ops/sentinel', { method: 'GET' }), env, adminActor, 'sentinel');
const sentStatusBody = await sentStatus.json();
assert.equal(sentStatusBody.last_probe_at, probeBody.probed_at, 'ops_last_sentinel_probe must persist');

// Posture classifier
assert.equal(classifySentinelPosture([{ monitored: true, status: 'UP', latency_ms: 500 }], 400), 'DEGRADED');
assert.equal(classifySentinelPosture([{ monitored: true, status: 'DOWN', latency_ms: 5 }], 400), 'CRITICAL');
assert.equal(classifySentinelPosture([{ monitored: false, status: 'DOWN', latency_ms: 5 }, { monitored: true, status: 'UP', latency_ms: 5 }], 400), 'HEALTHY');
const brokenEnv = { ...env, MEDIA: { async list() { throw new Error('R2 unreachable'); } } };
assert.equal((await runSentinelProbe(probeReq, brokenEnv)).posture, 'CRITICAL');

// 7. Module #12: FREEZE / UNFREEZE confirmation guards, banner & mirror keys
const freezePost = (body, actor = adminActor) => handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/freeze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  env, actor, 'freeze'
);
await assert.rejects(() => freezePost({ enabled: true, reason: 'x' }), err => err.status === 400 && err.code === 'CONFIRMATION_REQUIRED');
await assert.rejects(() => freezePost({ enabled: true, confirm: 'UNFREEZE' }), err => err.status === 400 && err.code === 'CONFIRMATION_REQUIRED');
await assert.rejects(() => freezePost({ enabled: 'yes', confirm: 'FREEZE' }), err => err.status === 400 && err.code === 'INVALID_ENABLED_FLAG');
await assert.rejects(() => freezePost({ enabled: true, confirm: 'FREEZE' }, { userId: 'u-2', email: 'ed@csodisha.com', role: 'editor' }), err => err.status === 403);
assert.equal((await getReadOnlyFreezeState(env)).enabled, false, 'rejected requests must not change freeze state');

const frozeRes = await freezePost({ enabled: true, confirm: 'FREEZE', reason: 'D1 migration window', banner: 'Maintenance <b>now</b>' });
const frozeBody = await frozeRes.json();
assert.equal(frozeBody.freeze.enabled, true);
assert.equal(frozeBody.freeze.banner, 'Maintenance bnow/b', 'banner must strip angle brackets');
assert.ok(frozeBody.history.length >= 1 && frozeBody.history[0].enabled === true);
const mirror = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'ops_maintenance_freeze'`).first();
assert.equal(JSON.parse(mirror.value_json), true);
assert.ok(await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'ops_freeze_updated_by'`).first());
const blockedWhileFrozen = await checkReadOnlyFreezeGuard(new Request('https://csodisha.com/api/candidate/bookmarks', { method: 'POST' }), env);
assert.equal(blockedWhileFrozen.status, 503);
assert.equal(await checkReadOnlyFreezeGuard(new Request('https://csodisha.com/api/admin/ops/freeze', { method: 'POST' }), env), null, 'admins retain emergency access');

await assert.rejects(() => freezePost({ enabled: false, confirm: 'FREEZE' }), err => err.code === 'CONFIRMATION_REQUIRED');
const liftRes = await freezePost({ enabled: false, confirm: 'UNFREEZE' });
assert.equal((await liftRes.json()).freeze.enabled, false);
assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'ops.freeze.toggle'`).first()).n, 2);

// 8. Module #15: Zero-Downtime Deployment Canary & Health Gate (GO / NO-GO)
assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v159');

const canaryGetRes = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/canary', { method: 'GET' }),
  env, adminActor, 'canary'
);
assert.equal(canaryGetRes.status, 200);
const canaryGetBody = await canaryGetRes.json();
assert.equal(canaryGetBody.ok, true);
assert.equal(canaryGetBody.config.require_sw_match, true);

// Evaluation with sw.js returning v26 while target is v37 => NO-GO / BLOCKED
const blockedSwRes = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/canary/evaluate', { method: 'POST' }),
  env, adminActor, 'canary', 'evaluate'
);
assert.equal(blockedSwRes.status, 200);
const blockedSwBody = await blockedSwRes.json();
assert.equal(blockedSwBody.verdict, 'NO-GO');
assert.equal(blockedSwBody.release_status, 'BLOCKED');
assert.equal(blockedSwBody.observed_sw_cache, 'cso-candidate-cache-v26');

// Editor forbidden from updating canary config
await assert.rejects(
  () => handleOpsSentinel(
    new Request('https://csodisha.com/api/admin/ops/canary/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ require_sw_match: false, max_latency_ms: 1500 })
    }),
    env, { userId: 'u-2', email: 'ed@csodisha.com', role: 'editor' }, 'canary', 'config'
  ),
  err => err.status === 403
);

// Disable strict SW version match when testing staging assets mock -> verdict becomes GO
const cfgPutRes = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/canary/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ require_sw_match: false, require_d1_ok: true, require_r2_ok: true, max_latency_ms: 1500 })
  }),
  env, adminActor, 'canary', 'config'
);
assert.equal(cfgPutRes.status, 200);
const passRes = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/canary/evaluate', { method: 'POST' }),
  env, adminActor, 'canary', 'evaluate'
);
const passBody = await passRes.json();
assert.equal(passBody.verdict, 'GO');
assert.equal(passBody.release_status, 'PASS');
assert.equal(passBody.passed_count, passBody.total_checks);

// When Emergency Freeze is active, Canary Gate MUST block release (NO-GO)
await freezePost({ enabled: true, confirm: 'FREEZE', reason: 'Hold deploy for migration' });
const frozenCanaryRes = await handleOpsSentinel(
  new Request('https://csodisha.com/api/admin/ops/canary/evaluate', { method: 'POST' }),
  env, adminActor, 'canary', 'evaluate'
);
const frozenCanaryBody = await frozenCanaryRes.json();
assert.equal(frozenCanaryBody.verdict, 'NO-GO');
assert.equal(frozenCanaryBody.release_status, 'BLOCKED');
await freezePost({ enabled: false, confirm: 'UNFREEZE' });
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'ops.canary.evaluate'`).first()).n >= 3);

console.log('OPS SENTINEL, FREEZE, CACHE, CANARY & FAILOVER SENTINEL TESTS PASSED');
