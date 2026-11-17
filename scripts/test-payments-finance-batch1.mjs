import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensurePaymentsFinanceBatch1Schema,
  handlePaymentsFinanceBatch1Admin as H,
  maskSecret
} from '../functions/_lib/payments-finance-batch1.js';
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
const call = async (method, path, id, sub, body) => (await H(req(method, `${B}/${path}`, body), env, admin, id, sub));
const jcall = async (...a) => (await call(...a)).json();

// 1. RBAC & CSRF
await assert.rejects(
  () => requireRole(new Request(`${B}/overview`, { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/orders`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/orders`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema + seed
await ensurePaymentsFinanceBatch1Schema(env.DB);
await ensurePaymentsFinanceBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('fin_gateways'), 4);
assert.equal(await cnt('fin_orders'), 5);
assert.equal(await cnt('fin_transactions'), 5);

// 3. Module 01 overview
const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.captured_count, 3);
assert.equal(ov.failed_count, 1);
assert.ok(ov.gross_revenue_paise > 0 && ov.net_settled_paise > 0 && ov.net_settled_paise <= ov.gross_revenue_paise);
assert.equal(ov.conversion_rate_pct, 60);
assert.equal(ov.pending_orders, 1);
assert.equal(ov.active_gateways, 3);
assert.ok(ov.payment_method_breakdown.some(m => m.method === 'upi'));
assert.ok(ov.recent_orders.length > 0 && ov.recent_transactions.length > 0);
await assert.rejects(() => call('POST', 'overview', 'overview', undefined, {}), err => err.status === 405);

// 4. Module 02 gateways: CRUD + secret masking
const RAW = 'sk_live_SUPERSECRET1234567890';
const created = await jcall('POST', 'gateways', 'gateways', undefined, {
  provider_key: 'stripe', display_name_en: 'Stripe India', environment_mode: 'live_production',
  merchant_id_or_key_id: 'pk_live_abc123', secret_key: RAW, webhook_endpoint_path: '/api/webhooks/stripe',
  supported_methods: ['cards'], convenience_fee_pct: 2.9, status: 'published'
});
const gid = created.item.id;
assert.equal(created.item.secret_masked_hint, maskSecret(RAW));
assert.ok(!JSON.stringify(created).includes('SUPERSECRET'));
assert.ok(!JSON.stringify(await env.DB.prepare('SELECT * FROM fin_gateways').all()).includes('SUPERSECRET'));
const gwList = await jcall('GET', 'gateways', 'gateways');
assert.ok(!JSON.stringify(gwList).includes('SUPERSECRET'));
assert.equal(gwList.items.length, 5);
await assert.rejects(() => call('POST', 'gateways', 'gateways', undefined, { provider_key: 'bitcoin', display_name_en: 'X' }), err => err.status === 422);
await assert.rejects(() => call('POST', 'gateways', 'gateways', undefined, { display_name_en: 'Stripe India' }), err => err.status === 409);

const upd = await jcall('PATCH', `gateways/${gid}`, 'gateways', gid, { is_primary: true, secret_key: 'sk_live_NEWSECRET98765', change_note: 'Make primary' });
assert.equal(upd.item.is_primary, true);
assert.ok(!JSON.stringify(upd).includes('NEWSECRET'));
assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_gateways WHERE is_primary = 1`).first()).n, 1);

const ping = await jcall('POST', 'gateways/ping', 'gateways', 'ping', { id: gid });
assert.equal(ping.ready, true);
assert.equal(ping.webhook_ready, true);
assert.equal(ping.health_status, 'connected');
const pingBad = await jcall('POST', 'gateways/ping', 'gateways', 'ping', { id: 'fgw-cashfree' });
assert.equal(pingBad.ready, false); // draft => not published

// 5. Revision rollback (gateway)
const revs = (await jcall('GET', `revisions?module_code=02&entity_id=${gid}`, 'revisions')).items;
assert.ok(revs.length >= 2);
const v1 = revs.find(r => r.version_num === 1);
const rb = await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', { revision_id: v1.id });
assert.equal(rb.restored_version, 1);
const afterRb = await jcall('GET', `gateways/${gid}`, 'gateways', gid);
assert.equal(afterRb.item.is_primary, false);
assert.equal(afterRb.item.secret_masked_hint, maskSecret(RAW));

await jcall('DELETE', `gateways/${gid}`, 'gateways', gid);
assert.equal((await jcall('GET', `gateways/${gid}`, 'gateways', gid)).item.status, 'archived');

// 6. Module 04 orders: create, totals, pay, grant access
const ord = (await jcall('POST', 'orders', 'orders', undefined, {
  customer_name: 'Tapan Sahoo', customer_email: 'tapan@example.com', customer_phone: '9090909090', order_type: 'mock_test_series',
  coupon_code: 'oas10', discount_paise: 5000,
  items: [{ item_type: 'mock_test_series', item_id: 'mts-opsc-oas', title_en: 'OPSC OAS Mock Series', qty: 2, unit_price_paise: 49900, gst_rate_pct: 18 }]
})).item;
assert.match(ord.order_number, /^CSO-ORD-\d{4}-0006$/);
assert.equal(ord.subtotal_paise, 99800);
assert.equal(ord.total_paise, ord.subtotal_paise - ord.discount_paise + ord.tax_paise);
assert.equal(ord.payment_status, 'pending');
assert.equal(ord.coupon_code, 'OAS10');
await assert.rejects(() => call('POST', 'orders', 'orders', undefined, { customer_name: 'X', items: [] }), err => err.status === 422);

// access cannot be granted before payment
await assert.rejects(() => call('PATCH', `orders/${ord.id}`, 'orders', ord.id, { action: 'grant_access' }), err => err.status === 409);

// 7. Module 03 transactions: manual UPI receipt marks order paid
const orderList = await jcall('GET', 'orders?payment_status=pending', 'orders');
assert.ok(orderList.items.some(o => o.id === ord.id));
const txn = (await jcall('POST', 'transactions', 'transactions', undefined, {
  order_id: ord.id, payment_method: 'upi', upi_vpa_or_last4: 'tapan@okhdfcbank', amount_paise: ord.total_paise, utr: 'UTR402611170001'
})).item;
assert.match(txn.txn_reference, /^TXN-MAN-\d{4}\d{4}$/);
assert.equal(txn.txn_status, 'captured');
assert.equal(txn.net_settled_paise, ord.total_paise);
assert.equal((await jcall('GET', `orders/${ord.id}`, 'orders', ord.id)).item.payment_status, 'paid');
await assert.rejects(() => call('POST', 'transactions', 'transactions', undefined, { amount_paise: -5 }), err => err.status === 422);
await assert.rejects(() => call('POST', 'transactions', 'transactions', undefined, { amount_paise: 100, order_id: 'nope' }), err => err.status === 422);

// filters
const f1 = await jcall('GET', 'transactions?txn_status=captured', 'transactions');
assert.ok(f1.items.every(t => t.txn_status === 'captured') && f1.items.length === 4);
assert.equal((await jcall('GET', 'transactions?q=sasmita', 'transactions')).items.length, 1);
assert.equal((await jcall('GET', 'transactions?payment_method=card', 'transactions')).items.length, 2);
assert.equal((await jcall('GET', 'transactions?gateway_key=manual-upi-qr', 'transactions')).items.length, 1);
assert.equal((await jcall('GET', 'transactions?date_from=2999-01-01', 'transactions')).items.length, 0);
assert.equal((await jcall('GET', 'orders?q=Tapan&order_type=mock_test_series', 'orders')).items.length, 1);

// grant access now allowed
const granted = (await jcall('PATCH', `orders/${ord.id}`, 'orders', ord.id, { action: 'grant_access' })).item;
assert.equal(granted.fulfillment_status, 'access_granted');
const revoked = (await jcall('PATCH', `orders/${ord.id}`, 'orders', ord.id, { action: 'revoke_access' })).item;
assert.equal(revoked.fulfillment_status, 'unfulfilled');

// Order revision rollback
const orevs = (await jcall('GET', `revisions?module_code=04&entity_id=${ord.id}`, 'revisions')).items;
const grantRev = orevs.find(r => r.change_note === 'Digital access granted');
assert.ok(grantRev);
await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', { revision_id: grantRev.id });
assert.equal((await jcall('GET', `orders/${ord.id}`, 'orders', ord.id)).item.fulfillment_status, 'access_granted');

// Refund through txn PATCH updates order
const refunded = await jcall('PATCH', `transactions/${txn.id}`, 'transactions', txn.id, { txn_status: 'refunded' });
assert.equal(refunded.order_payment_status, 'refunded');
const sync = await jcall('PATCH', `transactions/${txn.id}`, 'transactions', txn.id, { action: 'sync' });
assert.equal(sync.order_payment_status, 'refunded');
await assert.rejects(() => call('PATCH', `transactions/${txn.id}`, 'transactions', txn.id, { txn_status: 'bogus' }), err => err.status === 422);

// cancel draft order: pending only
const draft = (await jcall('POST', 'orders', 'orders', undefined, {
  customer_name: 'Draft Buyer', items: [{ title_en: 'OSSC Pack', qty: 1, unit_price_paise: 10000, gst_rate_pct: 5 }]
})).item;
assert.equal((await jcall('DELETE', `orders/${draft.id}`, 'orders', draft.id)).fulfillment_status, 'cancelled');
await assert.rejects(() => call('DELETE', `orders/ford-001`, 'orders', 'ford-001'), err => err.status === 409);

// 8. Audit trail written
const aud = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'finance.%'`).first();
assert.ok(aud.n >= 10);

console.log('✅ All Payments & Finance Batch 1 (01-04) tests passed!');
