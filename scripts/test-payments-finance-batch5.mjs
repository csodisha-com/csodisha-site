import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handlePaymentsFinanceBatch1Admin as H1 } from '../functions/_lib/payments-finance-batch1.js';
import {
  ensurePaymentsFinanceBatch5Schema,
  handlePaymentsFinanceBatch5Admin as H5,
  sanitizeWebhookPayload
} from '../functions/_lib/payments-finance-batch5.js';
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
const call = (method, path, id, sub, extra, body) => H5(req(method, `${B}/${path}`, body), env, admin, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/webhooks`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(() => verifyCsrf(new Request(`${B}/webhooks/simulate`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })), err => err.status === 403);
assert.throws(() => verifyCsrf(new Request(`${B}/fraud/evaluate`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })), err => err.status === 403);

// 2. Idempotent schema & starter seeds
await ensurePaymentsFinanceBatch5Schema(env.DB);
await ensurePaymentsFinanceBatch5Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('fin_webhook_events'), 3);
assert.equal(await cnt('fin_fraud_rules'), 5);
assert.equal(await cnt('fin_fraud_risk_events'), 2);

// 3. Full 18-module suite overview (01-18)
const ov = await jcall('GET', 'overview', 'overview');
assert.ok(ov.suite_18, 'suite_18 summary present');
assert.equal(ov.suite_18.total_modules, 18, 'All 18 modules 01-18 aggregated');
for (let i = 1; i <= 18; i++) {
  const k = String(i).padStart(2, '0');
  assert.ok(k in ov.suite_18.modules, `Module ${k} present in suite_18`);
}
assert.ok(ov.suite_18.gross_revenue_paise > 0);
assert.ok(ov.suite_18.mrr_estimate_paise > 0);
assert.ok(ov.suite_18.total_donations_raised_paise > 0);
assert.ok(ov.suite_18.settled_payouts_paise > 0);
assert.equal(ov.suite_18.open_fraud_alerts_count, 1);

// 4. Module 17: Payment Webhooks (sanitization, simulate, replay)
const red = sanitizeWebhookPayload({ event: 'payment.captured', webhook_secret: 'whsec_12345', nested: { api_key: 'live_abc' } });
assert.equal(red.webhook_secret, '[REDACTED]');
assert.equal(red.nested.api_key, '[REDACTED]');

const simOk = (await jcall('POST', 'webhooks/simulate', 'webhooks', 'simulate', undefined, {
  event_uid: 'evt_rzp_test_9001',
  gateway_key: 'razorpay',
  event_type: 'payment.captured',
  linked_order_number: 'CSO-ORD-2026-0001',
  amount_paise: 52982,
  simulate_valid_signature: true,
  payload: { order: 'CSO-ORD-2026-0001', secret_token: 'SHOULD_NOT_LEAK' }
})).item;
assert.equal(simOk.processing_status, 'processed');
assert.equal(simOk.signature_verified, true);
assert.equal(simOk.sanitized_payload.secret_token, '[REDACTED]');
assert.ok(!JSON.stringify(simOk).includes('SHOULD_NOT_LEAK'));

const simBadSig = (await jcall('POST', 'webhooks/simulate', 'webhooks', 'simulate', undefined, {
  event_uid: 'evt_rzp_test_9002',
  gateway_key: 'razorpay',
  event_type: 'payment.captured',
  amount_paise: 10000,
  simulate_valid_signature: false
})).item;
assert.equal(simBadSig.processing_status, 'failed_signature');
assert.equal(simBadSig.http_status_returned, 401);

const replayed = (await jcall('POST', `webhooks/${simBadSig.id}/replay`, 'webhooks', simBadSig.id, 'replay', {})).item;
assert.equal(replayed.processing_status, 'replayed');
assert.equal(replayed.replay_count, 1);
assert.equal(replayed.http_status_returned, 200);

const whFiltered = await jcall('GET', 'webhooks?gateway_key=razorpay&processing_status=replayed', 'webhooks');
assert.equal(whFiltered.items.length, 1);

// 5. Module 18: Fraud & Risk Events (rules, evaluate, resolve, rollback)
const evalRes = await jcall('POST', 'fraud/evaluate', 'fraud', 'evaluate', undefined, {
  amount_paise: 650000,
  failed_attempts_15m: 3,
  ip_requests_15m: 2,
  order_number: 'CSO-ORD-2026-0002',
  txn_reference: 'TXN-RZP-20260002',
  customer_email: 'biswajit.panda@example.com'
});
assert.ok(evalRes.risk_score >= 70);
assert.ok(evalRes.alert && evalRes.alert.id);
const alertId = evalRes.alert.id;

const cleared = (await jcall('PATCH', `fraud/${alertId}`, 'fraud', alertId, undefined, {
  resolution_status: 'false_positive_cleared',
  analyst_notes: 'Confirmed genuine student'
})).item;
assert.equal(cleared.resolution_status, 'false_positive_cleared');
assert.equal(cleared.action_taken, 'cleared_safe');

// Revision rollback for Module 18
const revs18 = (await (await H1(req('GET', `${B}/revisions?module_code=18&entity_id=${alertId}`), env, admin, 'revisions')).json()).items;
assert.ok(revs18.length >= 2);
const v1Alert = revs18.find(r => r.version_num === 1);
await (await H1(req('POST', `${B}/revisions/rollback`, { revision_id: v1Alert.id }), env, admin, 'revisions', 'rollback')).json();
const afterRb = (await jcall('GET', `fraud/${alertId}`, 'fraud', alertId)).item;
assert.equal(afterRb.resolution_status, 'open');

// Confirm block holds linked order
const blocked = (await jcall('PATCH', `fraud/${alertId}`, 'fraud', alertId, undefined, {
  resolution_status: 'blocked_confirmed',
  hold_order: true
})).item;
assert.equal(blocked.resolution_status, 'blocked_confirmed');
const ord2 = (await (await H1(req('GET', `${B}/orders/ford-002`), env, admin, 'orders', 'ford-002')).json()).item;
assert.equal(ord2.fulfillment_status, 'cancelled');

// Toggle fraud rule
const ruleUpd = (await jcall('PUT', 'fraud/rules', 'fraud', 'rules', undefined, {
  rule_key: 'geo_mismatch_upi',
  enabled: false,
  threshold_value: 2
})).rule;
assert.equal(ruleUpd.enabled, false);
assert.equal(ruleUpd.threshold_value, 2);

// 6. Audit trail
const aud = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'finance.%'`).first();
assert.ok(aud.n >= 6);

console.log('✅ All Payments & Finance Batch 5 (17-18) & 18-Module Suite tests passed!');
