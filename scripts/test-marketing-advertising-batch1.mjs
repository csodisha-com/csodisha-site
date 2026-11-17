import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureMarketingAdvertisingBatch1Schema,
  formatInrFromPaise,
  handleMarketingAdvertisingBatch1Admin as H,
  handlePublicMarketingBannersApi
} from '../functions/_lib/marketing-advertising-batch1.js';
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
const jcall = async (method, path, id, sub, extra, body) => (await H(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/placements`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/sponsors`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/banners`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureMarketingAdvertisingBatch1Schema(env.DB);
await ensureMarketingAdvertisingBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('mkt_ad_placements'), 4);
assert.equal(await cnt('mkt_sponsors'), 2);
assert.equal(await cnt('mkt_promo_banners'), 2);
assert.equal(await cnt('mkt_campaigns'), 2);

// 3. Overview & INR paise formatting
assert.equal(formatInrFromPaise(12000000), '₹1,20,000.00');
const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.active_ad_placements, 4);
assert.equal(ov.active_sponsors, 2);
assert.equal(ov.total_sponsor_contract_paise, 18500000);
assert.equal(ov.live_promotional_banners, 2);
assert.equal(ov.active_campaigns, 2);
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.modules['05'].status, 'queued');

// 4. Module 01: Placements CRUD & rollback
const pNew = (await jcall('POST', 'placements', 'placements', undefined, undefined, {
  slot_name_en: 'Community Q&A Banner',
  portal_section: 'community',
  position_zone: 'sidebar_card',
  pricing_model: 'flat_weekly_paise',
  rate_paise: 350000
})).item;
assert.equal(pNew.rate_inr, '₹3,500.00');
await jcall('PUT', `placements/${pNew.id}`, 'placements', pNew.id, undefined, { rate_paise: 400000 });
const revs01 = await jcall('GET', `revisions?module_code=01&entity_id=${pNew.id}`, 'revisions');
assert.ok(revs01.items.length >= 2);
await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs01.items[1].id });

// 5. Module 02: Sponsors CRUD, GSTIN masking & rollback
const sNew = (await jcall('POST', 'sponsors', 'sponsors', undefined, undefined, {
  organization_name: 'Odisha Skill Hub',
  gstin: '21AABCU9603R1Z5',
  contract_value_paise: 5000000,
  amount_paid_paise: 2500000
})).item;
assert.ok(sNew.gstin_masked.includes('••••'));
assert.equal(sNew.paid_pct, 50);
await jcall('PATCH', `sponsors/${sNew.id}/status`, 'sponsors', sNew.id, 'status', { sponsor_status: 'renewal_due' });

// 6. Module 03: Banners CRUD, <script> sanitization, bulk_status & rollback
const bNew = (await jcall('POST', 'banners', 'banners', undefined, undefined, {
  placement_id: 'mkt-plc-01',
  headline_en: '<script>alert(1)</script>OPSC OAS Free Notes',
  subcopy_en: '<b>Download</b> now',
  theme_variant: 'royal_indigo',
  banner_status: 'active_live'
})).item;
assert.equal(bNew.headline_en, 'OPSC OAS Free Notes');
assert.equal(bNew.subcopy_en, 'Download now');
await jcall('PATCH', 'banners/bulk_status', 'banners', 'bulk_status', undefined, {
  ids: [bNew.id],
  banner_status: 'paused'
});
const revs03 = await jcall('GET', `revisions?module_code=03&entity_id=${bNew.id}`, 'revisions');
await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs03.items[0].id });

// 7. Module 04: Campaigns CRUD & rollback
const cNew = (await jcall('POST', 'campaigns', 'campaigns', undefined, undefined, {
  campaign_name_en: 'Odisha Police SI Crash Course',
  objective: 'mock_test_enrollment',
  target_exam_audience: 'OSSC/OSSSC',
  budget_paise: 1000000,
  spent_paise: 250000,
  target_conversions: 400,
  actual_conversions: 100,
  campaign_status: 'active'
})).item;
assert.equal(cNew.budget_used_pct, 25);
assert.equal(cNew.conversion_pct, 25);

// 8. Public edge-cached GET /api/marketing/banners
const pubRes = await handlePublicMarketingBannersApi(
  new Request('https://csodisha.com/api/marketing/banners?portal_section=study-library'),
  env
);
assert.equal(pubRes.status, 200);
assert.ok((pubRes.headers.get('Cache-Control') || '').includes('s-maxage=300'));
const pubData = await pubRes.json();
assert.ok(pubData.items.length >= 1);
assert.ok(pubData.items.every(x => x.portal_section === 'study-library'));

console.log('✅ All Marketing & Advertising Batch 1 (01-04) tests passed!');
