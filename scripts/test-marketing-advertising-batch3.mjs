import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureMarketingAdvertisingBatch1Schema,
  handleMarketingAdvertisingBatch1Admin as H1
} from '../functions/_lib/marketing-advertising-batch1.js';
import { ensureMarketingAdvertisingBatch2Schema } from '../functions/_lib/marketing-advertising-batch2.js';
import {
  MKT_REPORT_TYPES,
  ensureMarketingAdvertisingBatch3Schema,
  getFull10ModuleMarketingOverview,
  handleMarketingAdvertisingBatch3Admin as H3,
  handlePublicMarketingLandingPagesApi
} from '../functions/_lib/marketing-advertising-batch3.js';
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
const B = 'https://csodisha.com/api/admin/marketing';
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall3 = async (...a) => (await call3(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/landing-pages`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/landing-pages`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/reports`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureMarketingAdvertisingBatch1Schema(env.DB);
await ensureMarketingAdvertisingBatch2Schema(env.DB);
await ensureMarketingAdvertisingBatch3Schema(env.DB);
await ensureMarketingAdvertisingBatch3Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('mkt_promo_landing_pages'), 2);
assert.equal(await cnt('mkt_advertising_reports'), 1);

// 3. Unified 10-module overview (suite_10)
const ov = await getFull10ModuleMarketingOverview(env);
assert.equal(ov.suite_10.total_modules, 10);
assert.equal(ov.suite_10.active_modules, 10);
for (let i = 1; i <= 10; i++) {
  const k = String(i).padStart(2, '0');
  assert.equal(ov.modules[k].status, 'active');
}
assert.equal(ov.live_landing_pages, 2);
assert.equal(ov.saved_advertising_reports, 1);

// 4. Module 09: Landing pages CRUD, sanitization, rollback & public slug lookup
const lpNew = (await jcall3('POST', 'landing-pages', 'landing-pages', undefined, undefined, {
  slug: 'ossc-cgl-2026-sprint',
  hero_title_en: '<script>alert(1)</script>OSSC CGL 2026 Sprint Pack',
  hero_title_or: 'OSSC CGL ୨୦୨୬ ସ୍ପ୍ରିଣ୍ଟ ପ୍ୟାକ୍',
  highlights: [{ title_en: '<b>20 Mock Tests</b>', desc_en: 'With Odia explanations' }],
  page_status: 'published_live'
})).item;
assert.equal(lpNew.hero_title_en, 'OSSC CGL 2026 Sprint Pack');
assert.equal(lpNew.highlights[0].title_en, '20 Mock Tests');

await jcall3('PATCH', `landing-pages/${lpNew.id}/status`, 'landing-pages', lpNew.id, 'status', { page_status: 'draft' });
const revs09 = await jcall1('GET', `revisions?module_code=09&entity_id=${lpNew.id}`, 'revisions');
assert.ok(revs09.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs09.items[0].id });

const pubSlug = await handlePublicMarketingLandingPagesApi(
  new Request('https://csodisha.com/api/marketing/landing-pages?slug=ossc-cgl-2026-sprint'),
  env
);
assert.equal(pubSlug.status, 200);
assert.ok((pubSlug.headers.get('Cache-Control') || '').includes('s-maxage=300'));
const pubData = await pubSlug.json();
assert.equal(pubData.item.slug, 'ossc-cgl-2026-sprint');

// 5. Module 10: All 5 live report aggregations + snapshot + CSV/JSON exports
for (const rt of MKT_REPORT_TYPES) {
  const r = await jcall3('GET', `reports?report_type=${rt}`, 'reports');
  assert.equal(r.report_type, rt);
  assert.ok(Array.isArray(r.live_rows));
}

const savedRep = (await jcall3('POST', 'reports', 'reports', undefined, undefined, {
  report_type: 'campaign_performance_ledger',
  period_label: '2026-Q4 / Nov 2026',
  title_en: 'Campaign Ledger Nov 2026'
})).item;
assert.ok(savedRep.report_code.startsWith('ADR-2026-'));

const csvRes = await call3('GET', `reports/${savedRep.id}/export?format=csv`, 'reports', savedRep.id, 'export');
assert.equal(csvRes.status, 200);
assert.ok((csvRes.headers.get('Content-Type') || '').includes('text/csv'));
const csvText = await csvRes.text();
assert.ok(csvText.includes('CMP-2026-0001'));

const jsonRes = await call3('GET', `reports/${savedRep.id}/export?format=json`, 'reports', savedRep.id, 'export');
assert.equal(jsonRes.status, 200);
const jsonBody = await jsonRes.json();
assert.equal(jsonBody.report_code, savedRep.report_code);

console.log('✅ All Marketing & Advertising Batch 3 (09-10) & Full 10-Module Suite tests passed!');
