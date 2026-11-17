import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handlePaymentsFinanceBatch1Admin as H1 } from '../functions/_lib/payments-finance-batch1.js';
import {
  ensurePaymentsFinanceBatch2Schema,
  handlePaymentsFinanceBatch2Admin as H2,
  handlePublicFinanceCatalogApi,
  formatInr,
  discountPct
} from '../functions/_lib/payments-finance-batch2.js';
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
const admin = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/finance';
const call = (method, path, id, sub, body) => H2(req(method, `${B}/${path}`, body), env, admin, id, sub);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF
await rej(requireRole(new Request(`${B}/products`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(() => verifyCsrf(new Request(`${B}/products`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })), err => err.status === 403);
assert.throws(() => verifyCsrf(new Request(`${B}/products`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })), err => err.status === 403);

// 2. Schema idempotent + seeds
await ensurePaymentsFinanceBatch2Schema(env.DB);
await ensurePaymentsFinanceBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('fin_paid_resources'), 4);
assert.equal(await cnt('fin_products'), 3);
assert.equal(await cnt('fin_subscription_plans'), 2);
assert.equal(await cnt('fin_memberships'), 3);
assert.equal(formatInr(149900), '₹1,499.00');
assert.equal(discountPct(49900, 99900), 50);

// 3. Overview (batch1 + batch2 KPIs)
const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.paid_resources_count, 3);
assert.equal(ov.active_product_skus, 2);
assert.equal(ov.active_subscribers, 229);
assert.equal(ov.active_members, 4480);
assert.equal(ov.mrr_estimate_paise, 14900 * 142 + Math.round(119900 * 87 / 12));
assert.ok(ov.gross_revenue_paise > 0, 'batch1 KPIs preserved');
assert.equal(ov.modules['05'], 4);
assert.ok((await (await H1(req('GET', `${B}/overview`), env, admin, 'overview')).json()).ok);

// 4. Module 05 Paid Resources: edu picker + bridging + CRUD
const edu = await jcall('GET', 'paid-resources/search-edu?q=', 'paid-resources', 'search-edu');
assert.ok(edu.items.length > 0, 'edu picker returns live study resources');
const picked = edu.items[0];
assert.ok(['01', '14', '16'].includes(picked.source_module_code));
const pr = (await jcall('POST', 'paid-resources', 'paid-resources', undefined, {
  source_module_code: picked.source_module_code, source_entity_id: picked.source_entity_id, title_en: picked.title_en,
  access_model: 'one_time_purchase', price_paise: 24900, mrp_paise: 49900, status: 'published'
})).item;
assert.equal(pr.price_inr, '₹249.00');
assert.equal(pr.discount_pct, 50);
assert.equal(pr.gst_rate_pct, 18);
assert.equal(pr.validity_days, 0);
const edu2 = await jcall('GET', `paid-resources/search-edu?q=${encodeURIComponent(picked.title_en.slice(0, 12))}`, 'paid-resources', 'search-edu');
assert.ok(edu2.items.find(i => i.source_entity_id === picked.source_entity_id).already_paid);
await rej(call('POST', 'paid-resources', 'paid-resources', undefined, { title_en: 'X', source_module_code: '99' }), 422);
await rej(call('POST', 'paid-resources', 'paid-resources', undefined, { title_en: 'Free pub', status: 'published', price_paise: 0 }), 422);
await rej(call('POST', 'paid-resources', 'paid-resources', undefined, { title_en: 'Bad MRP', price_paise: 500, mrp_paise: 100 }), 422);
await rej(call('POST', 'paid-resources', 'paid-resources', undefined, { title_en: 'Float', price_paise: 99.5 }), 422);
await rej(call('POST', 'paid-resources', 'paid-resources', undefined, { title_en: 'Prev', access_model: 'freemium_preview', price_paise: 100 }), 422);
const upd = (await jcall('PATCH', `paid-resources/${pr.id}`, 'paid-resources', pr.id, { price_paise: 19900, change_note: 'Price cut' })).item;
assert.equal(upd.price_paise, 19900);
assert.equal((await jcall('PUT', `paid-resources/${pr.id}`, 'paid-resources', pr.id, { featured: true })).item.featured, true);

// clone
const clone = (await jcall('POST', `paid-resources/${pr.id}`, 'paid-resources', pr.id, { action: 'clone' })).item;
assert.equal(clone.status, 'draft');
assert.notEqual(clone.slug, pr.slug);
assert.match(clone.title_en, /\(Copy\)$/);
assert.equal(clone.sales_count, 0);
await rej(call('POST', `paid-resources/${pr.id}`, 'paid-resources', pr.id, { action: 'nope' }), 422);

// filters & status tabs
const pub = await jcall('GET', 'paid-resources?status=published', 'paid-resources');
assert.ok(pub.items.every(i => i.status === 'published'));
assert.ok(pub.counts.draft >= 2 && pub.counts.published >= 4);
assert.equal((await jcall('GET', 'paid-resources?q=economy', 'paid-resources')).items.length, 1);
assert.equal((await jcall('GET', 'paid-resources?access_model=member_only', 'paid-resources')).items.length, 1);

// bulk status
const bulk = await jcall('PATCH', 'paid-resources', 'paid-resources', undefined, { action: 'bulk_status', ids: [clone.id, 'fpr-mains-member', 'missing'], status: 'published' });
assert.equal(bulk.updated, 2); // member_only free item may publish; clone priced
assert.equal(bulk.skipped.length, 1);
await rej(call('PATCH', 'paid-resources', 'paid-resources', undefined, { action: 'bulk_status', ids: [], status: 'draft' }), 422);

// revision rollback (module 05) via shared fin_revisions endpoint
const revs = (await (await H1(req('GET', `${B}/revisions?module_code=05&entity_id=${pr.id}`), env, admin, 'revisions')).json()).items;
assert.ok(revs.length >= 3);
const v1 = revs.find(r => r.version_num === 1);
const rb = await (await H1(req('POST', `${B}/revisions/rollback`, { revision_id: v1.id }), env, admin, 'revisions', 'rollback')).json();
assert.equal(rb.restored_version, 1);
const afterRb = (await jcall('GET', `paid-resources/${pr.id}`, 'paid-resources', pr.id)).item;
assert.equal(afterRb.price_paise, 24900);
assert.equal(afterRb.featured, false);

// archive (delete)
assert.equal((await jcall('DELETE', `paid-resources/${clone.id}`, 'paid-resources', clone.id)).status, 'archived');
await rej(call('GET', 'paid-resources/nope', 'paid-resources', 'nope'), 404);

// 5. Module 06 Products & Pricing: SKU, GST, HSN, included items
const prod = (await jcall('POST', 'products', 'products', undefined, {
  sku_code: 'cso-kit-ossc-cre', title_en: 'OSSC CRE Starter Kit', product_type: 'study_kit', price_paise: 79900, mrp_paise: 129900,
  gst_rate_pct: 12, hsn_sac_code: '4901', stock_or_seat_limit: 100,
  included_items: [{ module_code: '01', item_id: 'edu-res-odisha-gk-notes', title_en: 'Odisha GK Notes' }], status: 'published'
})).item;
assert.equal(prod.sku_code, 'CSO-KIT-OSSC-CRE');
assert.equal(prod.gst_rate_pct, 12);
assert.equal(prod.discount_pct, 38);
assert.equal(prod.hsn_sac_code, '4901');
assert.equal(prod.included_items.length, 1);
assert.equal((await jcall('POST', 'products', 'products', undefined, { sku_code: 'X1', title_en: 'Default HSN' })).item.hsn_sac_code, '999293');
await rej(call('POST', 'products', 'products', undefined, { sku_code: 'CSO-KIT-OSSC-CRE', title_en: 'Dup' }), 422);
await rej(call('POST', 'products', 'products', undefined, { sku_code: 'X2', title_en: 'Bad', hsn_sac_code: 'abc' }), 422);
await rej(call('POST', 'products', 'products', undefined, { sku_code: 'X3', title_en: 'Bad gst', gst_rate_pct: 40 }), 422);
await rej(call('POST', 'products', 'products', undefined, { sku_code: 'X4', title_en: 'Bad items', included_items: [{ item_id: 'a' }] }), 422);
await rej(call('POST', 'products', 'products', undefined, { title_en: 'No sku' }), 422);
const pclone = (await jcall('POST', `products/${prod.id}`, 'products', prod.id, { action: 'clone' })).item;
assert.notEqual(pclone.sku_code, prod.sku_code);
assert.equal(pclone.sold_count, 0);
assert.equal((await jcall('GET', 'products?product_type=study_kit&q=CSO-KIT', 'products')).items.length >= 3, true);

// 6. Module 07 Subscriptions: interval, trial, bilingual perks
const sub = (await jcall('POST', 'subscriptions', 'subscriptions', undefined, {
  plan_code: 'cso-pro-q', name_en: 'CS Odisha Pro — Quarterly', name_or: 'ତ୍ରୈମାସିକ', billing_interval: 'quarterly', price_paise: 39900, mrp_paise: 59700,
  trial_days: 3, perks: [{ perk_en: 'All mocks', perk_or: 'ସମସ୍ତ ମକ୍' }, { perk_en: 'No ads' }], status: 'published', active_subscribers_count: 10
})).item;
assert.equal(sub.billing_interval, 'quarterly');
assert.equal(sub.trial_days, 3);
assert.equal(sub.perks.length, 2);
assert.equal(sub.perks[0].perk_or, 'ସମସ୍ତ ମକ୍');
assert.equal(sub.auto_renew_default, true);
await rej(call('POST', 'subscriptions', 'subscriptions', undefined, { plan_code: 'B1', name_en: 'Bad', billing_interval: 'weekly' }), 422);
await rej(call('POST', 'subscriptions', 'subscriptions', undefined, { plan_code: 'B2', name_en: 'Bad', perks: [{ perk_or: 'x' }] }), 422);
const ov2 = await jcall('GET', 'overview', 'overview');
assert.equal(ov2.mrr_estimate_paise, ov.mrr_estimate_paise + Math.round(39900 * 10 / 3));
await jcall('PATCH', `subscriptions/${sub.id}`, 'subscriptions', sub.id, { perks: [{ perk_en: 'Only one' }], change_note: 'perk trim' });
const srev = (await (await H1(req('GET', `${B}/revisions?module_code=07&entity_id=${sub.id}`), env, admin, 'revisions')).json()).items.find(r => r.version_num === 1);
await (await H1(req('POST', `${B}/revisions/rollback`, { revision_id: srev.id }), env, admin, 'revisions', 'rollback')).json();
assert.equal((await jcall('GET', `subscriptions/${sub.id}`, 'subscriptions', sub.id)).item.perks.length, 2);

// 7. Module 08 Memberships: entitlements + reorder
const mem = (await jcall('POST', 'memberships', 'memberships', undefined, {
  tier_code: 'institutional', tier_name_en: 'Institutional Coaching', price_paise: 999900, duration_days: 365, download_quota_daily: 200,
  mock_test_access_level: 'all_mocks_plus_mentorship', offline_packs_allowed: true, ad_free_experience: true, sort_order: 40, status: 'published'
})).item;
assert.equal(mem.download_quota_daily, 200);
assert.equal(mem.mock_test_access_level, 'all_mocks_plus_mentorship');
assert.equal(mem.offline_packs_allowed, true);
assert.equal(mem.price_inr, '₹9,999.00');
await rej(call('POST', 'memberships', 'memberships', undefined, { tier_name_en: 'Bad', mock_test_access_level: 'everything' }), 422);
await rej(call('POST', 'memberships', 'memberships', undefined, { tier_name_en: 'Bad', duration_days: 0 }), 422);
const order = (await jcall('GET', 'memberships', 'memberships')).items;
assert.equal(order[0].tier_code, 'free_scholar');
const reversed = order.map(m => m.id).reverse();
assert.equal((await jcall('PATCH', 'memberships', 'memberships', undefined, { action: 'reorder', ids: reversed })).reordered, order.length);
assert.equal((await jcall('GET', 'memberships', 'memberships')).items[0].id, reversed[0]);
const mclone = (await jcall('POST', `memberships/${mem.id}`, 'memberships', mem.id, { action: 'clone' })).item;
assert.equal(mclone.status, 'draft');
assert.equal(mclone.active_members_count, 0);

// 8. Public cached catalog: only published, INR formatted, no internal stats
const cat = await (await handlePublicFinanceCatalogApi(req('GET', 'https://csodisha.com/api/finance/catalog'), env)).json();
assert.equal(cat.currency_code, 'INR');
assert.ok(cat.paid_resources.length >= 4 && cat.products.length >= 3 && cat.subscription_plans.length >= 3 && cat.membership_tiers.length >= 4);
assert.ok(!cat.paid_resources.some(r => r.id === clone.id), 'archived/draft excluded');
assert.ok(cat.paid_resources.every(r => r.price_inr.startsWith('₹') && !('revenue_paise' in r)));
assert.ok(cat.products.every(p => !('sold_count' in p)));
assert.ok(cat.products.find(p => p.sku_code === 'CSO-KIT-OSSC-CRE').included_items.length === 1);
assert.ok(cat.subscription_plans.every(s => Array.isArray(s.perks)));
const catRes = await handlePublicFinanceCatalogApi(req('GET', 'https://csodisha.com/api/finance/catalog'), env);
assert.match(catRes.headers.get('Cache-Control'), /public/);

// 9. Audit trail
const aud = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'finance.%'`).first();
assert.ok(aud.n >= 15, 'audit rows: ' + aud.n);
assert.equal(await H2(req('GET', `${B}/gateways`), env, admin, 'gateways'), null);

console.log('✅ All Payments & Finance Batch 2 (05-08) tests passed!');
