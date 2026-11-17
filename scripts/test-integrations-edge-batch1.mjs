import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  computeHmacSha256Hex,
  ensureIntegrationsEdgeBatch1Schema,
  handleIntegrationsEdgeBatch1Admin as H,
  sha256Hex,
  validatePublicHttpsTarget
} from '../functions/_lib/integrations-webhooks-edge-batch1.js';
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
const call = (method, path, id, sub, extra, body) => H(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/r2-sync`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/outbound-webhooks`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/cache-purge/execute`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. SSRF Protection Unit Checks
for (const bad of [
  'http://hooks.csodisha.com/wh',
  'https://localhost/wh',
  'https://127.0.0.1/wh',
  'https://169.254.169.254/latest/meta-data',
  'https://10.0.0.5/wh',
  'https://192.168.1.10/wh'
]) {
  assert.equal(validatePublicHttpsTarget(bad).ok, false, `Expected SSRF block for ${bad}`);
}
assert.equal(validatePublicHttpsTarget('https://hooks.partner.org/csodisha').ok, true);

// 3. Idempotent schema & starter seeds
await ensureIntegrationsEdgeBatch1Schema(env.DB);
await ensureIntegrationsEdgeBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('int_r2_sync_jobs'), 3);
assert.equal(await cnt('int_edge_cache_purges'), 2);
assert.equal(await cnt('int_outbound_webhooks'), 2);
assert.equal(await cnt('int_telegram_automations'), 2);

const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.synced_r2_objects, 1041);
assert.equal(ov.edge_purges_executed, 2);
assert.equal(ov.active_outbound_webhooks, 2);
assert.equal(ov.active_telegram_automations, 2);
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.modules['05'].status, 'queued');

// 4. Module 01: R2 Sync Execution & Rollback
const r2New = (await jcall('POST', 'r2-sync', 'r2-sync', undefined, undefined, {
  sync_code: 'R2S-2026-0099',
  bucket_name: 'csodisha-pyq-pdfs',
  prefix_path: '/study-library/opsc-oas/',
  mirror_target: 'r2_secondary_apac',
  objects_scanned: 45,
  objects_mirrored: 40,
  sync_status: 'drift_detected'
})).item;
assert.equal(r2New.sync_status, 'drift_detected');
const r2Run = await jcall('POST', `r2-sync/${r2New.id}/run-sync`, 'r2-sync', r2New.id, 'run-sync', {});
assert.equal(r2Run.ok, true);
assert.equal(r2Run.item.sync_status, 'synced_healthy');
assert.equal(r2Run.item.objects_mirrored, 45);
const revs01 = await jcall('GET', `revisions?module_code=01&entity_id=${r2New.id}`, 'revisions');
assert.ok(revs01.items.length >= 2);
const rb01 = await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, {
  revision_id: revs01.items[revs01.items.length - 1].id
});
assert.equal(rb01.restored.sync_status, 'drift_detected');

// 5. Module 02: Cloudflare Edge Cache Purge Execution
const prgRes = await jcall('POST', 'cache-purge/execute', 'cache-purge', 'execute', undefined, {
  purge_scope: 'url_prefix',
  target_pattern: '/api/seo/*'
});
assert.equal(prgRes.ok, true);
assert.equal(prgRes.item.purge_status, 'purged_edge_200');
assert.ok(prgRes.item.urls_invalidated_count >= 3);

// 6. Module 03: Outbound Webhook SSRF Reject, Secret Masking & HMAC-SHA256 Signing
const ssrfRes = await call('POST', 'outbound-webhooks', 'outbound-webhooks', undefined, undefined, {
  subscriber_name: 'Bad SSRF Hook',
  target_url: 'https://169.254.169.254/latest/meta-data'
});
assert.equal(ssrfRes.status, 422);

const whkNew = (await jcall('POST', 'outbound-webhooks', 'outbound-webhooks', undefined, undefined, {
  webhook_code: 'WHK-OUT-099',
  subscriber_name: '<script>x</script>Odisha Job Aggregator',
  target_url: 'https://hooks.partner.org/odisha',
  subscribed_events: ['exam.admit_card_live', 'job.deadline_closing'],
  signing_secret: 'super_secret_token_99ab'
})).item;
assert.equal(whkNew.subscriber_name, 'Odisha Job Aggregator');
assert.equal(whkNew.hmac_secret_masked_hint, 'whsec_••••99ab');
assert.equal(whkNew.hmac_secret_hash_sha256, undefined);

const pingRes = await jcall('POST', `outbound-webhooks/${whkNew.id}/test-dispatch`, 'outbound-webhooks', whkNew.id, 'test-dispatch', {
  event: 'exam.admit_card_live',
  timestamp_ist: '2026-11-17T17:15:00+05:30'
});
assert.equal(pingRes.ok, true);
assert.equal(pingRes.signature_header, 'X-CSO-Signature-256');
const expectedHash = await sha256Hex('super_secret_token_99ab');
const expectedSig = `sha256=${await computeHmacSha256Hex(expectedHash, '2026-11-17T17:15:00+05:30.' + JSON.stringify(pingRes.payload))}`;
assert.equal(pingRes.signature_value, expectedSig);

// 7. Module 04: Telegram Bot Automation & Bilingual Dispatch
const tgbNew = (await jcall('POST', 'telegram-automations', 'telegram-automations', undefined, undefined, {
  rule_code: 'TGB-AUTO-099',
  bot_username: '@CSOdishaAlertBot',
  channel_handle: '@csodisha_official',
  trigger_event: 'pyq_pdf_uploaded',
  message_template_en: '<script>z</script>New OPSC PYQ PDF uploaded!',
  message_template_or: 'ନୂତନ OPSC PYQ PDF ଅପଲୋଡ୍ ହୋଇଛି!',
  bot_token: '74123456:AAF998877665544'
})).item;
assert.equal(tgbNew.message_template_en, 'New OPSC PYQ PDF uploaded!');
assert.equal(tgbNew.bot_token_masked_hint, '74123••••665544');
const trigRes = await jcall('POST', `telegram-automations/${tgbNew.id}/trigger-test`, 'telegram-automations', tgbNew.id, 'trigger-test', {});
assert.equal(trigRes.ok, true);
assert.equal(trigRes.item.dispatches_count, 1);

// Soft-archive cleanup
await jcall('DELETE', `r2-sync/${r2New.id}`, 'r2-sync', r2New.id);
await jcall('DELETE', `outbound-webhooks/${whkNew.id}`, 'outbound-webhooks', whkNew.id);
await jcall('DELETE', `telegram-automations/${tgbNew.id}`, 'telegram-automations', tgbNew.id);

console.log('ALL INTEGRATIONS, WEBHOOKS & EDGE BATCH 1 TESTS PASSED');
