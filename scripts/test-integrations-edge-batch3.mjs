import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleIntegrationsEdgeBatch1Admin as H1 } from '../functions/_lib/integrations-webhooks-edge-batch1.js';
import {
  ensureIntegrationsEdgeBatch3Schema,
  getFull11ModuleIntegrationsOverview,
  handleIntegrationsEdgeBatch3Admin as H3,
  maskPhoneNumber,
  scrubSensitivePayload
} from '../functions/_lib/integrations-webhooks-edge-batch3.js';
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
const B = 'https://csodisha.com/api/admin/integrations';
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall3 = async (...a) => (await call3(...a)).json();
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/sms-otp-gateways`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/health-monitors/ping-all`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/dlq-logs/ingest`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Zero-PII Masking & Payload Scrubbing Unit Checks
assert.equal(maskPhoneNumber('9437012109'), '94••••2109');
const scrubbed = scrubSensitivePayload({
  authorization: 'Bearer secret123',
  api_key: 'live_key',
  otp: '654321',
  phone: '9437012109',
  exam: '<script>alert(1)</script>OPSC OAS'
});
assert.equal(scrubbed.authorization, '[REDACTED]');
assert.equal(scrubbed.api_key, '[REDACTED]');
assert.equal(scrubbed.otp, '[REDACTED]');
assert.equal(scrubbed.phone, '94••••2109');
assert.equal(scrubbed.exam, 'OPSC OAS');

// 3. Idempotent schema, starter seeds & Full 11-Module Suite Overview
await ensureIntegrationsEdgeBatch3Schema(env.DB);
await ensureIntegrationsEdgeBatch3Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('int_sms_otp_gateways'), 2);
assert.equal(await cnt('int_service_health_monitors'), 6);
assert.equal(await cnt('int_webhook_dlq_logs'), 4);

const ov = await getFull11ModuleIntegrationsOverview(env);
assert.equal(ov.suite_11.total_modules, 11);
assert.equal(ov.suite_11.active_modules, 11);
assert.equal(ov.active_sms_otp_gateways, 2);
assert.equal(ov.operational_service_monitors, 6);
assert.equal(ov.pending_dlq_count, 2);
for (const c of ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']) {
  assert.equal(ov.modules[c].status, 'active');
}

// 4. Module 09: SMS/OTP Gateway CRUD, Zero-PII OTP Simulation & Rollback
const smsNew = (await jcall3('POST', 'sms-otp-gateways', 'sms-otp-gateways', undefined, undefined, {
  gateway_code: 'SMSGW-099',
  provider_name: 'Gupshup Enterprise',
  route_type: 'transactional_otp',
  sender_id: 'CSODSH',
  api_key: 'gup_live_secret_7788',
  gateway_status: 'standby_failover'
})).item;
assert.equal(smsNew.api_key_masked_hint, 'sms_••••7788');
assert.equal(smsNew.api_key_hash_sha256, undefined);

const simOtp = await jcall3('POST', `sms-otp-gateways/${smsNew.id}/simulate-otp`, 'sms-otp-gateways', smsNew.id, 'simulate-otp', {
  phone: '9861098765'
});
assert.equal(simOtp.ok, true);
assert.equal(simOtp.phone_masked, '98••••8765');
assert.equal(simOtp.otp_hash_sha256.length, 64);

const otpLogRow = await env.DB.prepare(`SELECT sanitized_payload_json FROM int_webhook_dlq_logs WHERE event_uid = ?`).bind(simOtp.log_event_uid).first();
assert.ok(!otpLogRow.sanitized_payload_json.includes('9861098765'));
assert.ok(otpLogRow.sanitized_payload_json.includes('98••••8765'));

await jcall3('PATCH', `sms-otp-gateways/${smsNew.id}/status`, 'sms-otp-gateways', smsNew.id, 'status', { gateway_status: 'paused' });
const revs09 = await jcall1('GET', `revisions?module_code=09&entity_id=${smsNew.id}`, 'revisions');
assert.ok(revs09.items.length >= 2);
const rb09 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, {
  revision_id: revs09.items[revs09.items.length - 1].id
});
assert.equal(rb09.restored.gateway_status, 'standby_failover');

// 5. Module 10: Live Third-Party & D1 Heartbeat Ping
const pingRes = await jcall3('POST', 'health-monitors/ping-all', 'health-monitors', 'ping-all', undefined, {});
assert.equal(pingRes.ok, true);
assert.ok(pingRes.d1_probe_ms >= 1);
assert.equal(pingRes.items.length, 6);

// 6. Module 11: Scrubbed DLQ Ingestion, Replay & Rollback
const ingRes = (await jcall3('POST', 'dlq-logs/ingest', 'dlq-logs', 'ingest', undefined, {
  event_uid: 'EVT-LOG-2026-0099',
  direction: 'outbound_webhook',
  integration_ref_code: 'WHK-OUT-001',
  event_topic: 'scheme.dbt_alert',
  endpoint_or_channel: 'https://hooks.csodisha.com/v1/events-ingest',
  payload: { authorization: 'Bearer raw_tok', phone: '9437012109', scheme: 'Subhadra Yojana' },
  http_status_code: 502,
  error_summary: 'Bad Gateway 502'
})).item;
assert.equal(ingRes.queue_state, 'dlq_failed_retryable');
assert.ok(ingRes.sanitized_payload_json.includes('[REDACTED]'));
assert.ok(!ingRes.sanitized_payload_json.includes('raw_tok'));
assert.ok(!ingRes.sanitized_payload_json.includes('9437012109'));

const repRes = await jcall3('POST', `dlq-logs/${ingRes.id}/replay`, 'dlq-logs', ingRes.id, 'replay', {});
assert.equal(repRes.ok, true);
assert.equal(repRes.item.queue_state, 'replayed_success');
assert.equal(repRes.item.http_status_code, 200);
assert.equal(repRes.item.attempt_count, 2);

const revs11 = await jcall1('GET', `revisions?module_code=11&entity_id=${ingRes.id}`, 'revisions');
assert.ok(revs11.items.length >= 2);
const rb11 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, {
  revision_id: revs11.items[revs11.items.length - 1].id
});
assert.equal(rb11.restored.queue_state, 'dlq_failed_retryable');

console.log('ALL INTEGRATIONS, WEBHOOKS & EDGE BATCH 3 & 11-MODULE SUITE TESTS PASSED');
