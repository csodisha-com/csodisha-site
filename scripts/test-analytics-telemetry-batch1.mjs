import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureAnalyticsTelemetryBatch1Schema,
  handleAnalyticsBatch1Admin as H,
  handlePublicTelemetryBeacon,
  handlePublicSearchSynonymsApi
} from '../functions/_lib/analytics-telemetry-batch1.js';
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
const req = (method, url, body = null, extraHeaders = {}) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1', ...extraHeaders } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/analytics';
const call = (method, path, id, sub, extra, body) => H(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/overview`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/pageviews/ingest`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/zero-results/map-synonym`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureAnalyticsTelemetryBatch1Schema(env.DB);
await ensureAnalyticsTelemetryBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('at_edge_pageviews'), 5);
assert.equal(await cnt('at_search_queries'), 6);
assert.equal(await cnt('at_search_synonyms'), 2);
assert.equal(await cnt('at_download_metrics'), 4);

const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.cookieless_verified, true);
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.open_zero_result_queries, 2);

// 3. Module 01: Cookieless beacon ingestion & zero-PII enforcement
const beaconRes = await handlePublicTelemetryBeacon(
  req('POST', 'https://csodisha.com/api/telemetry/beacon', {
    event_type: 'pageview',
    route_path: '/study-library/',
    portal_section: 'study-library',
    lang_mode: 'en',
    device_class: 'mobile',
    district_odisha: 'Khordha',
    ip: '1.2.3.4',
    email: 'leak@example.com'
  }, { 'CF-Connecting-IP': '103.21.44.55' }),
  env
);
assert.equal(beaconRes.status, 202);
assert.equal(beaconRes.headers.get('Set-Cookie'), null, 'Must never set cookies');
const beaconJson = await beaconRes.json();
assert.equal(beaconJson.cookieless, true);
assert.equal(beaconJson.pii_stored, false);

const pvRow = await env.DB.prepare(`SELECT * FROM at_edge_pageviews WHERE id = 'at-pv-001'`).first();
assert.equal(pvRow.views_count, 1841, 'Aggregated cookieless pageview');
assert.equal('ip' in pvRow, false);
assert.equal('email' in pvRow, false);

// 4. Module 02: Ranked search intent & synonym expansion via beacon
const searchBeacon = await (await handlePublicTelemetryBeacon(
  req('POST', 'https://csodisha.com/api/telemetry/beacon', {
    event_type: 'search',
    query_or_slug: 'oas pyq',
    portal_scope: 'study-library',
    result_count: 5
  }),
  env
)).json();
assert.equal(searchBeacon.expanded_to, 'OPSC OAS Prelims Previous Year Question Papers');

const intent = await jcall('GET', 'search-intent', 'search-intent');
assert.equal(intent.items[0].discovery_rank, 1);
assert.ok(intent.items.some(i => i.lang_script === 'odia_or'));

// 5. Module 03: Zero-result query -> Auto-synonym mapping & revision rollback
const mapped = (await jcall('POST', 'zero-results/map-synonym', 'zero-results', 'map-synonym', undefined, {
  query_id: 'at-sq-005',
  source_term: 'ri amin old paper',
  canonical_query: 'OSSSC RI ARI Amin Previous Year Question Papers',
  target_url: '/study-library/?exam=osssc-ri',
  boost_weight: 25
})).item;
assert.equal(mapped.is_active, true);

const sqUpdated = await env.DB.prepare(`SELECT resolution_status, mapped_synonym_target FROM at_search_queries WHERE id = 'at-sq-005'`).first();
assert.equal(sqUpdated.resolution_status, 'synonym_mapped');

const pubSyn = await (await handlePublicSearchSynonymsApi(
  new Request('https://csodisha.com/api/search/synonyms', { method: 'GET' }),
  env
)).json();
assert.ok(pubSyn.items.some(s => s.source_term === 'ri amin old paper'));

const revs03 = await jcall('GET', `revisions?module_code=03&entity_id=${mapped.id}`, 'revisions');
assert.ok(revs03.items.length >= 1);
const rb03 = await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs03.items[0].id });
assert.equal(rb03.ok, true);

// 6. Module 04: PYQ / Syllabus Download metrics
const dls = await jcall('GET', 'downloads?material_type=pyq_paper', 'downloads');
assert.ok(dls.items.length >= 1);
const recDl = (await jcall('POST', 'downloads/record', 'downloads', 'record', undefined, {
  resource_slug: 'opsc-oas-prelims-gs1-pyq-2024',
  resource_title_en: 'OPSC OAS Prelims GS-1 PYQ (2018-2024)',
  material_type: 'pyq_paper',
  exam_tag: 'OPSC OAS'
})).item;
assert.equal(recDl.downloads_count, 1291);

console.log('✅ All Analytics & Telemetry Batch 1 (01-04) tests passed!');
