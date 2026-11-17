import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handlePaymentsFinanceBatch1Admin as H1 } from '../functions/_lib/payments-finance-batch1.js';
import {
  ensurePaymentsFinanceBatch4Schema,
  handlePaymentsFinanceBatch4Admin as H4,
  calculateGstSplit
} from '../functions/_lib/payments-finance-batch4.js';
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
const call = (method, path, id, sub, body) => H4(req(method, `${B}/${path}`, body), env, admin, id, sub);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/tax-rules`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(() => verifyCsrf(new Request(`${B}/settlements`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })), err => err.status === 403);
assert.throws(() => verifyCsrf(new Request(`${B}/reconciliation/run`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })), err => err.status === 403);

// 2. Idempotent schema & starter seeds
await ensurePaymentsFinanceBatch4Schema(env.DB);
await ensurePaymentsFinanceBatch4Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('fin_tax_rules'), 4);
assert.equal(await cnt('fin_payout_settlements'), 2);
assert.equal(await cnt('fin_reconciliation_runs'), 1);
assert.equal(await cnt('fin_saved_reports'), 1);

// 3. Overview aggregates Batches 1-4
const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.active_tax_rules_count, 3);
assert.equal(ov.settled_payouts_paise, 212200);
assert.equal(ov.open_variances_count, 0);
assert.equal(ov.saved_reports_count, 1);
assert.ok(ov.gross_revenue_paise > 0 && ov.total_donations_raised_paise > 0);
assert.equal(ov.modules['13'], 4);
assert.equal(ov.modules['16'], 1);

// 4. Module 13: Tax Configuration & Odisha CGST+SGST vs Inter-State IGST
const intra = calculateGstSplit(100000, { customerState: 'Odisha', gstPct: 18, isTaxInclusive: false });
assert.equal(intra.is_intra_state, true);
assert.equal(intra.cgst_paise, 9000);
assert.equal(intra.sgst_paise, 9000);
assert.equal(intra.igst_paise, 0);
assert.equal(intra.total_paise, 118000);

const inter = calculateGstSplit(100000, { customerState: 'Maharashtra', gstPct: 18, isTaxInclusive: false });
assert.equal(inter.is_intra_state, false);
assert.equal(inter.cgst_paise, 0);
assert.equal(inter.sgst_paise, 0);
assert.equal(inter.igst_paise, 18000);

const incRes = await jcall('POST', 'tax-rules/calculate', 'tax-rules', 'calculate', {
  amount_paise: 118000, customer_state: 'Odisha', total_gst_pct: 18, is_tax_inclusive: true
});
assert.equal(incRes.taxable_paise, 100000);
assert.equal(incRes.cgst_paise, 9000);
assert.equal(incRes.sgst_paise, 9000);

const newTax = (await jcall('POST', 'tax-rules', 'tax-rules', undefined, {
  rule_code: 'GST-MOCK-12', rule_name_en: 'Mock Series 12% GST', tax_regime: 'indian_gst',
  applicable_scope: 'mock_tests', hsn_sac_code: '999293', total_gst_pct: 12, status: 'published'
})).item;
assert.equal(newTax.cgst_pct, 6);
assert.equal(newTax.sgst_pct, 6);
assert.equal(newTax.igst_pct, 12);
await rej(call('POST', 'tax-rules', 'tax-rules', undefined, { rule_code: 'GST-MOCK-12', rule_name_en: 'Dup' }), 409);
await rej(call('POST', 'tax-rules', 'tax-rules', undefined, { rule_code: 'BAD', rule_name_en: 'Bad', total_gst_pct: 28 }), 422);

await jcall('PATCH', `tax-rules/${newTax.id}`, 'tax-rules', newTax.id, { total_gst_pct: 5, change_note: 'Lowered to 5%' });
const revs13 = (await (await H1(req('GET', `${B}/revisions?module_code=13&entity_id=${newTax.id}`), env, admin, 'revisions')).json()).items;
assert.ok(revs13.length >= 2);
const v1Tax = revs13.find(r => r.version_num === 1);
await (await H1(req('POST', `${B}/revisions/rollback`, { revision_id: v1Tax.id }), env, admin, 'revisions', 'rollback')).json();
assert.equal((await jcall('GET', `tax-rules/${newTax.id}`, 'tax-rules', newTax.id)).item.total_gst_pct, 12);
assert.equal((await jcall('DELETE', `tax-rules/${newTax.id}`, 'tax-rules', newTax.id)).status, 'archived');

// 5. Module 14: Payouts & Settlements
const setl = (await jcall('POST', 'settlements', 'settlements', undefined, {
  settlement_utr: 'UTR-RZP-20260099', gateway_key: 'razorpay-live',
  period_start: '2026-11-11', period_end: '2026-11-17',
  gross_captured_paise: 100000, gateway_fee_paise: 2000, txn_count: 2, settlement_status: 'processing'
})).item;
assert.equal(setl.gst_on_fee_paise, 360);
assert.equal(setl.net_settled_paise, 97640);
assert.equal(setl.settlement_status, 'processing');

const settled = (await jcall('PATCH', `settlements/${setl.id}`, 'settlements', setl.id, { settlement_status: 'settled' })).item;
assert.equal(settled.settlement_status, 'settled');
assert.ok(settled.settled_at);
await rej(call('DELETE', `settlements/${setl.id}`, 'settlements', setl.id), 409);

// 6. Module 15: Reconciliation Run & Variance Resolution
const balRun = (await jcall('POST', 'reconciliation/run', 'reconciliation', 'run', { gateway_key: 'razorpay-live' })).item;
assert.equal(balRun.run_status, 'balanced');
assert.equal(balRun.variance_paise, 0);
assert.equal(balRun.matched_txn_count, 3);

const varRun = (await jcall('POST', 'reconciliation/run', 'reconciliation', 'run', {
  gateway_key: 'razorpay-live', gateway_reported_paise: 200000
})).item;
assert.equal(varRun.run_status, 'variance_detected');
assert.notEqual(varRun.variance_paise, 0);
assert.ok(varRun.discrepancy_items.length >= 1);

const resolved = (await jcall('PATCH', `reconciliation/${varRun.id}`, 'reconciliation', varRun.id, {
  run_status: 'resolved', resolution_note: 'Adjusted for pending refund'
})).item;
assert.equal(resolved.run_status, 'resolved');

// 7. Module 16: Finance Reports & CSV/JSON Export
for (const rt of ['gst_gstr1_summary', 'revenue_by_product', 'gateway_settlement_ledger', 'refund_chargeback_register', 'donation_80g_ledger']) {
  const rep = await jcall('GET', `reports?report_type=${rt}`, 'reports');
  assert.equal(rep.live_report.report_type, rt);
  assert.ok(Array.isArray(rep.live_report.columns) && rep.live_report.columns.length > 0);
}

const snap = (await jcall('POST', 'reports', 'reports', undefined, { report_type: 'gst_gstr1_summary', title_en: 'Q3 Odisha GST Snapshot' })).item;
assert.equal(snap.title_en, 'Q3 Odisha GST Snapshot');

const csvRes = await call('GET', 'reports/export?report_type=gst_gstr1_summary&format=csv', 'reports', 'export');
assert.match(csvRes.headers.get('Content-Type'), /text\/csv/);
assert.match(csvRes.headers.get('Content-Disposition'), /attachment;/);
const csvText = await csvRes.text();
assert.match(csvText, /invoice_number,customer_name/);

const jsonRes = await call('GET', 'reports/export?report_type=revenue_by_product&format=json', 'reports', 'export');
assert.match(jsonRes.headers.get('Content-Type'), /application\/json/);
const jsonExport = await jsonRes.json();
assert.equal(jsonExport.report_type, 'revenue_by_product');

// 8. Audit trail
const aud = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'finance.%'`).first();
assert.ok(aud.n >= 8);

console.log('✅ All Payments & Finance Batch 4 (13-16) tests passed!');
