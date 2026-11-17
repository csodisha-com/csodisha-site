import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureAnalyticsTelemetryBatch1Schema,
  handleAnalyticsBatch1Admin as H1
} from '../functions/_lib/analytics-telemetry-batch1.js';
import {
  ensureAnalyticsTelemetryBatch2Schema,
  handleAnalyticsBatch2Admin as H2,
  handlePublicFeedbackSubmitApi,
  computeCwvRating,
  classifySentiment
} from '../functions/_lib/analytics-telemetry-batch2.js';
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
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall2 = async (...a) => (await call2(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/demographics`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/demographics/ingest`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/sentinel-404/record`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureAnalyticsTelemetryBatch1Schema(env.DB);
await ensureAnalyticsTelemetryBatch2Schema(env.DB);
await ensureAnalyticsTelemetryBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('at_district_demographics'), 8);
assert.equal(await cnt('at_web_vitals_metrics'), 4);
assert.equal(await cnt('at_citizen_feedback'), 3);
assert.equal(await cnt('at_sentinel_404_inbox'), 3);

const ov = await jcall1('GET', 'overview', 'overview');
assert.equal(ov.modules['05'].status, 'active');
assert.equal(ov.modules['08'].status, 'active');
assert.equal(ov.top_odisha_district.district_code, 'OD-KHD');
assert.equal(ov.cwv_good_pass_rate_pct, 75);
assert.ok(ov.avg_csat_score > 3);
assert.equal(ov.open_404_incidents, 2);

// 3. Module 05: District demographics & ingestion
const central = await jcall2('GET', 'demographics?rdc_zone=Central', 'demographics');
assert.ok(central.items.every(d => d.rdc_zone === 'Central'));
const ingDist = (await jcall2('POST', 'demographics/ingest', 'demographics', 'ingest', undefined, {
  district_code: 'OD-BLS',
  district_name_en: 'Balasore',
  rdc_zone: 'Central',
  active_learners_inc: 10,
  pageviews_inc: 50
})).item;
assert.equal(ingDist.active_learners_count, 950);

// 4. Module 06: Web Vitals rating calculation
assert.equal(computeCwvRating(1800, 120, 40), 'good');
assert.equal(computeCwvRating(3200, 150, 80), 'needs_improvement');
assert.equal(computeCwvRating(4500, 100, 30), 'poor');

const cwvIng = (await jcall2('POST', 'web-vitals/ingest', 'web-vitals', 'ingest', undefined, {
  route_group: 'educational-tools',
  device_class: 'mobile_ios',
  connection_tier: '4g_5g',
  p75_lcp_ms: 1400,
  p75_inp_ms: 75,
  p75_cls_milli: 25
})).item;
assert.equal(cwvIng.cwv_rating, 'good');

// 5. Module 07: Citizen feedback, sentiment & public POST /api/feedback/submit
assert.equal(classifySentiment(5, 'Great OPSC notes!'), 'positive');
assert.equal(classifySentiment(1, 'Broken PDF link'), 'negative');

const pubFbRes = await handlePublicFeedbackSubmitApi(
  req('POST', 'https://csodisha.com/api/feedback/submit', {
    portal_section: 'study-library',
    page_url: '/study-library/opsc',
    csat_score: 5,
    topic_tag: 'content_quality',
    comment_text: 'Excellent Odisha History PYQ coverage!',
    lang_mode: 'en',
    district_odisha: 'Puri'
  }),
  env
);
assert.equal(pubFbRes.status, 201);
assert.equal(pubFbRes.headers.get('Set-Cookie'), null);
const pubFb = await pubFbRes.json();
assert.equal(pubFb.sentiment_label, 'positive');
assert.equal(pubFb.cookieless, true);

const fbTriaged = (await jcall2('PATCH', 'feedback/at-fb-02', 'feedback', 'at-fb-02', undefined, {
  triage_status: 'actioned',
  admin_response_note: 'Highlighted in Odia portal banner.'
})).item;
assert.equal(fbTriaged.triage_status, 'actioned');
const revs07 = await jcall1('GET', 'revisions?module_code=07&entity_id=at-fb-02', 'revisions');
assert.ok(revs07.items.length >= 1);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs07.items[0].id });

// 6. Module 08: 404 Sentinel Inbox & redirect mapping + rollback
const rec404 = (await jcall2('POST', 'sentinel-404/record', 'sentinel-404', 'record', undefined, {
  missing_path: '/old-ossc-notes.pdf',
  referrer_path: '/study-library/',
  source_kind: 'edge_404_hit'
})).item;
assert.equal(rec404.hit_count, 1);

const map404 = (await jcall2('PATCH', `sentinel-404/${rec404.id}`, 'sentinel-404', rec404.id, undefined, {
  suggested_redirect_to: '/study-library/?exam=ossc',
  triage_status: 'redirect_mapped',
  resolution_note: 'Mapped to OSSC library filter.'
})).item;
assert.equal(map404.triage_status, 'redirect_mapped');
const revs08 = await jcall1('GET', `revisions?module_code=08&entity_id=${rec404.id}`, 'revisions');
assert.ok(revs08.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs08.items[0].id });

console.log('✅ All Analytics & Telemetry Batch 2 (05-08) tests passed!');
