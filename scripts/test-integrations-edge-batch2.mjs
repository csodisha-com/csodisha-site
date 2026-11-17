import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  computeHmacSha256Hex,
  handleIntegrationsEdgeBatch1Admin as H1,
  sha256Hex
} from '../functions/_lib/integrations-webhooks-edge-batch1.js';
import {
  ensureIntegrationsEdgeBatch2Schema,
  getFull8ModuleIntegrationsOverview,
  handleIntegrationsEdgeBatch2Admin as H2,
  handlePublicInboundWebhookApi,
  timingSafeEqualHex
} from '../functions/_lib/integrations-webhooks-edge-batch2.js';
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
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall2 = async (...a) => (await call2(...a)).json();
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/whatsapp-connectors`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/api-gateway`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/inbound-receivers`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Constant-time hex comparison
assert.equal(timingSafeEqualHex('sha256=abcdef', 'abcdef'), true);
assert.equal(timingSafeEqualHex('sha256=abcdef', 'abcdeg'), false);
assert.equal(timingSafeEqualHex('', 'abcdef'), false);

// 3. Idempotent schema, starter seeds & 8-module overview
await ensureIntegrationsEdgeBatch2Schema(env.DB);
await ensureIntegrationsEdgeBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('int_whatsapp_connectors'), 2);
assert.equal(await cnt('int_api_gateway_tokens'), 3);
assert.equal(await cnt('int_inbound_receivers'), 4);
assert.equal(await cnt('int_d1_replication_snapshots'), 3);

const ov = await getFull8ModuleIntegrationsOverview(env);
assert.equal(ov.active_whatsapp_connectors, 2);
assert.equal(ov.active_gateway_tokens, 3);
assert.equal(ov.verifying_inbound_receivers, 4);
assert.equal(ov.consistent_d1_groups, 3);
for (const c of ['01', '02', '03', '04', '05', '06', '07', '08']) {
  assert.equal(ov.modules[c].status, 'active');
}
assert.equal(ov.modules['09'].status, 'queued');

// 4. Module 05: WhatsApp WABA Connector, Token Masking & Rollback
const wabNew = (await jcall2('POST', 'whatsapp-connectors', 'whatsapp-connectors', undefined, undefined, {
  connector_code: 'WAB-CONN-099',
  template_name: 'cso_result_declared_or',
  lang_code: 'or',
  access_token: 'EAAG_SECRET_TOKEN_99ZZ',
  daily_tier_limit: 10000
})).item;
assert.equal(wabNew.access_token_masked_hint, 'EAAG••••99ZZ');
assert.equal(wabNew.access_token_hash_sha256, undefined);
const wabSend = await jcall2('POST', `whatsapp-connectors/${wabNew.id}/test-send`, 'whatsapp-connectors', wabNew.id, 'test-send', {});
assert.equal(wabSend.ok, true);
assert.equal(wabSend.item.sent_today_count, 1);
await jcall2('PATCH', `whatsapp-connectors/${wabNew.id}/status`, 'whatsapp-connectors', wabNew.id, 'status', { connector_status: 'paused' });
const revs05 = await jcall1('GET', `revisions?module_code=05&entity_id=${wabNew.id}`, 'revisions');
assert.ok(revs05.items.length >= 2);
const rb05 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, {
  revision_id: revs05.items[revs05.items.length - 1].id
});
assert.equal(rb05.restored.connector_status, 'connected_live');

// 5. Module 06: Public API Gateway Token Issuance, Rate Limit Sim & Revoke
const gwCreated = await jcall2('POST', 'api-gateway', 'api-gateway', undefined, undefined, {
  token_code: 'GWK-2026-0099',
  client_app_name: 'Odisha State Library Partner',
  tier_level: 'partner_standard',
  rate_limit_rpm: 250,
  burst_limit: 50
});
assert.ok(gwCreated.one_time_plain_token.startsWith('cso_gw_'));
assert.equal(gwCreated.item.token_hash_sha256, undefined);
const gwList = await jcall2('GET', 'api-gateway', 'api-gateway');
assert.ok(gwList.items.every(t => t.token_hash_sha256 === undefined && t.one_time_plain_token === undefined));

const simOk = await jcall2('POST', 'api-gateway/simulate-rate-limit', 'api-gateway', 'simulate-rate-limit', undefined, {
  token_id: gwCreated.item.id,
  simulated_rpm: 200
});
assert.equal(simOk.allowed, true);
assert.equal(simOk.http_status, 200);

const sim429 = await jcall2('POST', 'api-gateway/simulate-rate-limit', 'api-gateway', 'simulate-rate-limit', undefined, {
  token_id: gwCreated.item.id,
  simulated_rpm: 400
});
assert.equal(sim429.allowed, false);
assert.equal(sim429.http_status, 429);

await jcall2('PATCH', `api-gateway/${gwCreated.item.id}/revoke`, 'api-gateway', gwCreated.item.id, 'revoke', {});

// 6. Module 07: Inbound HMAC Receiver + Public POST /api/webhooks/inbound/:slug
const recCreated = await jcall2('POST', 'inbound-receivers', 'inbound-receivers', undefined, undefined, {
  receiver_slug: 'odisha-partner-events',
  provider_name: 'Odisha Partner Bus',
  signature_header: 'X-CSO-Signature-256'
});
assert.ok(recCreated.one_time_signing_secret.startsWith('insec_'));
assert.equal(recCreated.item.signing_secret_hash_sha256, undefined);

const sampleRes = await jcall2('POST', `inbound-receivers/${recCreated.item.id}/verify-sample`, 'inbound-receivers', recCreated.item.id, 'verify-sample', {
  payload: '{"event":"test.ok"}'
});
assert.equal(sampleRes.verified, true);

const bodyStr = JSON.stringify({ event: 'admit.published', id: 'evt-1' });
const secretHash = await sha256Hex(recCreated.one_time_signing_secret);
const validSig = `sha256=${await computeHmacSha256Hex(secretHash, bodyStr)}`;

const pubValid = await handlePublicInboundWebhookApi(
  new Request('https://csodisha.com/api/webhooks/inbound/odisha-partner-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSO-Signature-256': validSig },
    body: bodyStr
  }),
  env,
  'odisha-partner-events'
);
assert.equal(pubValid.status, 200);
assert.equal(pubValid.headers.get('Cache-Control'), 'no-store');

const pubBad = await handlePublicInboundWebhookApi(
  new Request('https://csodisha.com/api/webhooks/inbound/odisha-partner-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSO-Signature-256': 'sha256=deadbeef' },
    body: bodyStr
  }),
  env,
  'odisha-partner-events'
);
assert.equal(pubBad.status, 401);

// 7. Module 08: Live D1 Checksum & Replication Audit
const d1Audit = await jcall2('POST', 'd1-sync/run-checksum-audit', 'd1-sync', 'run-checksum-audit', undefined, {
  table_group: 'integrations_audit_state'
});
assert.equal(d1Audit.ok, true);
assert.equal(d1Audit.item.sync_status, 'consistent_synced');
assert.ok(d1Audit.item.tables_covered_count >= 7);
assert.ok(d1Audit.item.schema_checksum_sha256.length === 64);

// Cleanup
await jcall2('DELETE', `whatsapp-connectors/${wabNew.id}`, 'whatsapp-connectors', wabNew.id);
await jcall2('DELETE', `inbound-receivers/${recCreated.item.id}`, 'inbound-receivers', recCreated.item.id);

console.log('ALL INTEGRATIONS, WEBHOOKS & EDGE BATCH 2 TESTS PASSED');
