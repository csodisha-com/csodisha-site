import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureAnalyticsTelemetryBatch1Schema,
  handleAnalyticsBatch1Admin as H1
} from '../functions/_lib/analytics-telemetry-batch1.js';
import { ensureAnalyticsTelemetryBatch2Schema } from '../functions/_lib/analytics-telemetry-batch2.js';
import {
  ensureAnalyticsTelemetryBatch3Schema,
  handleAnalyticsBatch3Admin as H3,
  handlePublicTelemetryOutboundApi,
  computeBiggestDropoffStage,
  computeOdiaSharePct
} from '../functions/_lib/analytics-telemetry-batch3.js';
import { ensureUsersCommunityBatch5Schema } from '../functions/_lib/users-community-batch5.js';
import { requireRole, verifyCsrf, STAFF_ROLES } from '../functions/_lib/rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
  `);
  return {
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const env = { DB: createMockDb() };
const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/analytics';
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall3 = async (...a) => (await call3(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/outbound`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/outbound/record`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/community-index/recompute`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds (including URC tables for live D1 bridge)
await ensureUsersCommunityBatch5Schema(env.DB);
await ensureAnalyticsTelemetryBatch1Schema(env.DB);
await ensureAnalyticsTelemetryBatch2Schema(env.DB);
await ensureAnalyticsTelemetryBatch3Schema(env.DB);
await ensureAnalyticsTelemetryBatch3Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('at_outbound_referrals'), 5);
assert.equal(await cnt('at_exam_funnels'), 4);
assert.equal(await cnt('at_bilingual_usage'), 6);
assert.equal(await cnt('at_community_engagement_index'), 2);

const ov = await jcall1('GET', 'overview', 'overview');
assert.equal(ov.modules['09'].status, 'active');
assert.equal(ov.modules['12'].status, 'active');
assert.ok(ov.total_outbound_clicks_30d > 5000);
assert.ok(ov.avg_funnel_completion_pct > 10);
assert.ok(ov.overall_odia_share_pct > 40);
assert.equal(ov.latest_community_engagement_index, 86);

// 3. Module 09: Outbound referral tracking & public POST /api/telemetry/outbound
const pubOutRes = await handlePublicTelemetryOutboundApi(
  req('POST', 'https://csodisha.com/api/telemetry/outbound', {
    authority_key: 'opsc',
    link_category: 'apply_online'
  }),
  env
);
assert.equal(pubOutRes.status, 202);
assert.equal(pubOutRes.headers.get('Set-Cookie'), null);
const opscRow = await env.DB.prepare(`SELECT clicks_30d FROM at_outbound_referrals WHERE id = 'at-ob-01'`).first();
assert.equal(opscRow.clicks_30d, 1681);

// 4. Module 10: 5-stage exam funnel drop-off calculation & rollback
assert.equal(computeBiggestDropoffStage(1000, 900, 800, 200, 180), 'mock_attempts');
const fnUpd = (await jcall3('PATCH', 'funnels/at-fn-01', 'funnels', 'at-fn-01', undefined, {
  stage_1_discovery_views: 5000,
  stage_2_syllabus_reads: 4500,
  stage_3_pyq_downloads: 1200,
  stage_4_mock_attempts: 900,
  stage_5_official_apply_clicks: 600,
  optimization_note_en: 'Test PYQ dropoff'
})).item;
assert.equal(fnUpd.biggest_dropoff_stage, 'pyq_downloads');
const revs10 = await jcall1('GET', 'revisions?module_code=10&entity_id=at-fn-01', 'revisions');
assert.ok(revs10.items.length >= 1);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs10.items[0].id });

// 5. Module 11: Bilingual EN/OR share computation
assert.equal(computeOdiaSharePct(60, 40), 40);
const biRec = (await jcall3('POST', 'bilingual/record', 'bilingual', 'record', undefined, {
  portal_section: 'schemes',
  lang_mode: 'or',
  is_toggle_switch: true
})).item;
assert.equal(biRec.odia_views, 2241);
assert.equal(biRec.bilingual_toggle_switches, 521);

// 6. Module 12: Live D1 community index recomputation
const ciGet = await jcall3('GET', 'community-index', 'community-index');
assert.ok(ciGet.live_snapshot.posts_created >= 3);
assert.ok(ciGet.live_snapshot.forum_threads_created >= 2);
const ciRecomp = (await jcall3('POST', 'community-index/recompute', 'community-index', 'recompute', undefined, {
  bucket_week: '2026-W47',
  top_active_district: 'Balasore'
})).item;
assert.ok(ciRecomp.engagement_index_score > 0 && ciRecomp.engagement_index_score <= 100);
assert.equal(ciRecomp.top_active_district, 'Balasore');

console.log('✅ All Analytics & Telemetry Batch 3 (09-12) tests passed!');
