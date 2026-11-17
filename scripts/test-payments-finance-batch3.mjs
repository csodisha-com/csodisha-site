import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensurePaymentsFinanceBatch1Schema,
  handlePaymentsFinanceBatch1Admin as H1
} from '../functions/_lib/payments-finance-batch1.js';
import {
  ensurePaymentsFinanceBatch2Schema,
  handlePaymentsFinanceBatch2Admin as H2
} from '../functions/_lib/payments-finance-batch2.js';
import {
  ensurePaymentsFinanceBatch3Schema,
  handlePaymentsFinanceBatch3Admin as H3,
  calculateCouponDiscount,
  calculateGstBreakdown
} from '../functions/_lib/payments-finance-batch3.js';
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
const call = (method, path, id, sub, body) => H3(req(method, `${B}/${path}`, body), env, admin, id, sub);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF
await rej(requireRole(new Request(`${B}/donations`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(() => verifyCsrf(new Request(`${B}/donations`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })), err => err.status === 403);
assert.throws(() => verifyCsrf(new Request(`${B}/donations`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })), err => err.status === 403);

// 2. Schema Idempotent & Starter Seed Records
await ensurePaymentsFinanceBatch3Schema(env.DB);
await ensurePaymentsFinanceBatch3Schema(env.DB);

const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.ok((await cnt('fin_donation_campaigns')) >= 1);
assert.ok((await cnt('fin_donation_entries')) >= 3);
assert.ok((await cnt('fin_coupons')) >= 3);
assert.ok((await cnt('fin_refunds_disputes')) >= 2);
assert.ok((await cnt('fin_invoices')) >= 2);

// 3. Extended Overview with Batch 3 KPIs
const ov = await jcall('GET', 'overview', 'overview');
assert.ok(ov.total_donations_raised_paise >= 3600000);
assert.ok(ov.active_coupons_count >= 2);
assert.ok(ov.open_refunds_count >= 1);
assert.ok(ov.issued_invoices_count >= 2);
assert.equal(ov.modules['09'], 1);
assert.equal(ov.modules['10'], 3);
assert.equal(ov.modules['11'], 2);
assert.equal(ov.modules['12'], 2);

// 4. Module 09: Donations (Campaigns & Ledger)
const donCamp = (await jcall('POST', 'donations', 'donations', undefined, {
  title_en: 'Odisha High School Science Lab Fund',
  title_or: 'ବିଜ୍ଞାନାଗାର ପାଣ୍ଠି',
  campaign_code: 'SCI-LAB-2026',
  cause_category: 'open_pyq_digitization',
  goal_paise: 20000000,
  suggested_amounts: [10000, 50000, 100000],
  status: 'published'
})).item;
assert.equal(donCamp.campaign_code, 'SCI-LAB-2026');

// Record a donation entry for this campaign
const donEntry = (await jcall('POST', 'donations/entries', 'donations', 'entries', {
  campaign_id: donCamp.id,
  donor_name: 'Debashis Ray',
  donor_city: 'Berhampur',
  amount_paise: 50000,
  payment_method: 'upi',
  txn_reference: 'UPI-SCI-001'
})).item;
assert.equal(donEntry.amount_paise, 50000);

// Check that campaign raised_paise and donor_count incremented
const updatedCamp = (await jcall('GET', `donations/${donCamp.id}`, 'donations', donCamp.id)).item;
assert.equal(updatedCamp.raised_paise, 50000);
assert.equal(updatedCamp.donor_count, 1);

// Rollback revision check for campaign
const revs09 = (await (await H1(req('GET', `${B}/revisions?module_code=09&entity_id=${donCamp.id}`), env, admin, 'revisions')).json()).items;
assert.ok(revs09.length >= 2);

// 5. Module 10: Coupons & Offers
const cpnSim1 = calculateCouponDiscount({
  status: 'published',
  discount_type: 'percent',
  discount_value: 20,
  max_discount_paise: 10000,
  min_order_paise: 29900,
  usage_limit_total: 100,
  used_count: 5
}, 50000);
assert.equal(cpnSim1.valid, true);
assert.equal(cpnSim1.discount_paise, 10000); // capped at max_discount_paise

const cpnSim2 = calculateCouponDiscount({
  status: 'published',
  discount_type: 'flat_paise',
  discount_value: 10000,
  min_order_paise: 49900
}, 30000);
assert.equal(cpnSim2.valid, false); // below minimum order

// Interactive Coupon Validation Endpoint
const simApi = await jcall('POST', 'coupons/validate', 'coupons', 'validate', {
  code: 'ODISHA20',
  order_paise: 40000
});
assert.equal(simApi.ok, true);
assert.equal(simApi.valid, true);
assert.equal(simApi.discount_paise, 8000); // 20% of 40,000

// Coupon CRUD & Clone
const newCpn = (await jcall('POST', 'coupons', 'coupons', undefined, {
  code: 'CSOFLASH50',
  title_en: 'Flash 50% Off',
  discount_type: 'percent',
  discount_value: 50,
  min_order_paise: 10000,
  status: 'published'
})).item;
assert.equal(newCpn.code, 'CSOFLASH50');

const clonedCpn = (await jcall('POST', `coupons/${newCpn.id}`, 'coupons', newCpn.id, { action: 'clone' })).item;
assert.notEqual(clonedCpn.code, newCpn.code);
assert.equal(clonedCpn.status, 'draft');

// 6. Module 11: Refunds & Disputes (Approval cascades to Orders/Transactions)
// Create a sample refund request on ford-001
const newRfd = (await jcall('POST', 'refunds', 'refunds', undefined, {
  order_id: 'ford-001',
  transaction_id: 'ftxn-001',
  amount_paise: 52982, // exact total of ford-001 (49900 - 5000 + 18% gst = 52982)
  reason_code: 'duplicate_payment',
  reason_notes: 'Duplicate payment processed on gateway',
  revoke_digital_access: true
})).item;
assert.equal(newRfd.case_status, 'open');

// Approve refund
const approvedRfd = (await jcall('PATCH', `refunds/${newRfd.id}`, 'refunds', newRfd.id, {
  case_status: 'approved_processed',
  gateway_refund_id: 'rfnd_LIVE_001'
})).item;
assert.equal(approvedRfd.case_status, 'approved_processed');

// Verify order status cascaded to refunded and fulfillment cancelled
const ord1 = (await (await H1(req('GET', `${B}/orders/ford-001`), env, admin, 'orders', 'ford-001')).json()).item;
assert.equal(ord1.payment_status, 'refunded');
assert.equal(ord1.fulfillment_status, 'cancelled');

// Verify transaction status cascaded to refunded
const txn1 = (await (await H1(req('GET', `${B}/transactions/ftxn-001`), env, admin, 'transactions', 'ftxn-001')).json()).item;
assert.equal(txn1.txn_status, 'refunded');

// 7. Module 12: Invoices & Receipts (Intra-state Odisha CGST+SGST vs Inter-state IGST)
const intraGst = calculateGstBreakdown(100000, 'Odisha', 18);
assert.equal(intraGst.isIntraState, true);
assert.equal(intraGst.cgst_paise, 9000);
assert.equal(intraGst.sgst_paise, 9000);
assert.equal(intraGst.igst_paise, 0);

const interGst = calculateGstBreakdown(100000, 'Jharkhand', 18);
assert.equal(interGst.isIntraState, false);
assert.equal(interGst.cgst_paise, 0);
assert.equal(interGst.sgst_paise, 0);
assert.equal(interGst.igst_paise, 18000);

// Auto-generate invoice from paid order ford-002
const genInv = (await jcall('POST', 'invoices/generate-from-order', 'invoices', 'generate-from-order', {
  order_id: 'ford-002'
})).item;
assert.ok(genInv.invoice_number.startsWith('CSO-INV-'));
assert.equal(genInv.order_id, 'ford-002');
assert.ok(genInv.cgst_paise > 0);
assert.ok(genInv.sgst_paise > 0);
assert.equal(genInv.igst_paise, 0);

// Revision rollback check for invoice
const revs12 = (await (await H1(req('GET', `${B}/revisions?module_code=12&entity_id=${genInv.id}`), env, admin, 'revisions')).json()).items;
assert.ok(revs12.length >= 1);

// Void invoice
const voided = await jcall('DELETE', `invoices/${genInv.id}`, 'invoices', genInv.id);
assert.equal(voided.status, 'voided');

// 8. Audit trail
const aud = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'finance.%'`).first();
assert.ok(aud.n >= 5);

console.log('✅ All Payments & Finance Batch 3 (09-12) tests passed!');
