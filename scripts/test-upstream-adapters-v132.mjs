import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureIntegrationsEdgeBatch1Schema,
  handleIntegrationsEdgeBatch1Admin as H1
} from '../functions/_lib/integrations-webhooks-edge-batch1.js';
import {
  ensureIntegrationsEdgeBatch3Schema,
  handleIntegrationsEdgeBatch3Admin as H3
} from '../functions/_lib/integrations-webhooks-edge-batch3.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
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

const db = createMockDb();
await ensureIntegrationsEdgeBatch1Schema(db);
await ensureIntegrationsEdgeBatch3Schema(db);

const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, path, body) => new Request(`https://csodisha.com/api/admin/integrations/${path}`, {
  method,
  headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1', 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

// 1. Safe-fallback mode (env secrets unset)
const envFallback = { DB: db };
const purgeFb = await (await H1(
  req('POST', 'cache-purge/execute', { purge_scope: 'url_prefix', target_pattern: '/api/config/public' }),
  envFallback, staff, 'cache-purge', 'execute'
)).json();
assert.equal(purgeFb.ok, true);
assert.equal(purgeFb.upstream_mode, 'worker_edge_cache_only');

const gws = await (await H3(
  new Request('https://csodisha.com/api/admin/integrations/sms-otp-gateways', { method: 'GET' }),
  envFallback, staff, 'sms-otp-gateways'
)).json();
const gwId = gws.items[0].id;

const otpFb = await (await H3(
  req('POST', `sms-otp-gateways/${gwId}/simulate-otp`, { phone: '9861234567' }),
  envFallback, staff, 'sms-otp-gateways', gwId, 'simulate-otp'
)).json();
assert.equal(otpFb.ok, true);
assert.equal(otpFb.dispatch_mode, 'local_zero_pii_simulation');
assert.ok(!JSON.stringify(otpFb).includes('9861234567'));

// 2. Live upstream mode with mocked fetch & secret env vars
const fetchCalls = [];
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  fetchCalls.push({ url: String(url), opts });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

try {
  const SECRET_CF_TOKEN = 'cf_secret_tok_99999';
  const SECRET_SMS_KEY = 'sms_secret_key_88888';
  const rawPhone = '9861998877';

  const envLive = {
    DB: db,
    CF_API_TOKEN: SECRET_CF_TOKEN,
    CF_ZONE_ID: 'zone_live_12345',
    SMS_GATEWAY_API_KEY: SECRET_SMS_KEY,
    SMS_GATEWAY_ENDPOINT: 'https://sms-carrier.example.in/v1/otp'
  };

  // 2a. Scoped Cloudflare purge
  const purgeLive = await (await H1(
    req('POST', 'cache-purge/execute', { purge_scope: 'url_prefix', target_pattern: '/api/events/upcoming' }),
    envLive, staff, 'cache-purge', 'execute'
  )).json();
  assert.equal(purgeLive.upstream_mode, 'cloudflare_zone_api_live');
  assert.equal(purgeLive.upstream_ok, true);
  assert.ok(!JSON.stringify(purgeLive).includes(SECRET_CF_TOKEN));

  // 2b. Full Cloudflare purge
  await H1(
    req('POST', 'cache-purge/execute', { purge_scope: 'full_api_cache', target_pattern: '/*' }),
    envLive, staff, 'cache-purge', 'execute'
  );

  const cfCalls = fetchCalls.filter(c => c.url.includes('api.cloudflare.com/client/v4/zones/zone_live_12345/purge_cache'));
  assert.equal(cfCalls.length, 2);
  assert.equal(cfCalls[0].opts.headers.Authorization, `Bearer ${SECRET_CF_TOKEN}`);
  assert.ok(Array.isArray(JSON.parse(cfCalls[0].opts.body).files));
  assert.equal(JSON.parse(cfCalls[1].opts.body).purge_everything, true);

  // 2c. Live TRAI DLT SMS dispatch
  const otpLive = await (await H3(
    req('POST', `sms-otp-gateways/${gwId}/simulate-otp`, { phone: rawPhone }),
    envLive, staff, 'sms-otp-gateways', gwId, 'simulate-otp'
  )).json();
  assert.equal(otpLive.dispatch_mode, 'trai_dlt_carrier_live');
  assert.equal(otpLive.upstream_ok, true);
  assert.ok(!JSON.stringify(otpLive).includes(SECRET_SMS_KEY));
  assert.ok(!JSON.stringify(otpLive).includes(rawPhone));

  const smsCalls = fetchCalls.filter(c => c.url === 'https://sms-carrier.example.in/v1/otp');
  assert.equal(smsCalls.length, 1);
  assert.equal(smsCalls[0].opts.headers.Authorization, `Bearer ${SECRET_SMS_KEY}`);
  const smsBody = JSON.parse(smsCalls[0].opts.body);
  assert.ok(smsBody.pe_id);
  assert.ok(smsBody.dlt_template_id !== undefined);
  assert.match(smsBody.otp, /^\d{6}$/);

  // Verify zero raw OTP, raw phone, or secrets leaked into D1 logs
  const dlqRow = await db.prepare(`SELECT sanitized_payload_json FROM int_webhook_dlq_logs WHERE event_uid = ?`).bind(otpLive.log_event_uid).first();
  assert.ok(!dlqRow.sanitized_payload_json.includes(smsBody.otp));
  assert.ok(!dlqRow.sanitized_payload_json.includes(rawPhone));
  assert.ok(!dlqRow.sanitized_payload_json.includes(SECRET_SMS_KEY));

  // 2d. dry_run bypasses carrier fetch even with env secrets set
  const otpDry = await (await H3(
    req('POST', `sms-otp-gateways/${gwId}/simulate-otp`, { phone: rawPhone, mode: 'dry_run' }),
    envLive, staff, 'sms-otp-gateways', gwId, 'simulate-otp'
  )).json();
  assert.equal(otpDry.dispatch_mode, 'local_zero_pii_simulation');
  assert.equal(fetchCalls.filter(c => c.url === 'https://sms-carrier.example.in/v1/otp').length, 1);
} finally {
  globalThis.fetch = origFetch;
}

console.log('ALL UPSTREAM ADAPTERS (CLOUDFLARE PURGE + TRAI DLT SMS, v132) TESTS PASSED');
