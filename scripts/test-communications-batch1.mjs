import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCommunicationsBatch1Schema,
  handleCommunicationsBatch1Admin as H,
  validateDltTemplate
} from '../functions/_lib/communications-batch1.js';
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
const B = 'https://csodisha.com/api/admin/communications';
const call = (method, path, id, sub, extra, body) => H(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/overview`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/sms-dlt`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/emails`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureCommunicationsBatch1Schema(env.DB);
await ensureCommunicationsBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('comm_sms_dlt_templates'), 2);
assert.equal(await cnt('comm_email_campaigns'), 1);
assert.equal(await cnt('comm_admit_card_alerts'), 2);
assert.equal(await cnt('comm_deadline_broadcasts'), 1);

const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.approved_dlt_templates, 2);

// 3. Module 01: TRAI DLT validation, secret masking & revision rollback
const vEn = validateDltTemplate({
  sender_id: 'CSODSH',
  dlt_template_id: '1107170000000000999',
  template_body: 'OTP is {#var#} for {#var#}.',
  lang_code: 'en'
});
assert.equal(vEn.valid, true);
assert.equal(vEn.var_count, 2);
assert.equal(vEn.encoding, 'GSM-7');

const vOr = validateDltTemplate({
  sender_id: 'CSODSH',
  dlt_template_id: '1107170000000000999',
  template_body: 'ଆପଣଙ୍କ OTP ହେଉଛି {#var#}।',
  lang_code: 'or'
});
assert.equal(vOr.encoding, 'UCS-2 (Unicode/Odia)');

const smsNew = (await jcall('POST', 'sms-dlt', 'sms-dlt', undefined, undefined, {
  gateway_provider: 'msg91',
  sender_id: 'CSODSH',
  dlt_template_id: '1107170000000000555',
  template_category: 'service_implicit',
  lang_code: 'en',
  template_body: 'OSSC Alert: {#var#} deadline is {#var#}.',
  raw_api_key: 'super_secret_msg91_key_1234',
  approval_status: 'approved_dlt'
})).item;
assert.equal(smsNew.secret_masked_hint, 'supe••••••1234');
assert.equal('raw_api_key' in smsNew, false);

const revs01 = await jcall('GET', `revisions?module_code=01&entity_id=${smsNew.id}`, 'revisions');
assert.ok(revs01.items.length >= 1);

// 4. Module 02: Email campaign creation, send & rollback
const emlNew = (await jcall('POST', 'emails', 'emails', undefined, undefined, {
  campaign_type: 'exam_bulletin',
  audience_segment: 'opsc_oas_aspirants',
  subject_en: 'OPSC OAS 2026 Mains Test Series Launch',
  subject_or: 'OPSC OAS ୨୦୨୬ ମେନ୍ସ ଟେଷ୍ଟ ସିରିଜ୍',
  body_blocks: [{ heading_en: 'Schedule', paragraph_en: 'Starts Sunday.' }]
})).item;
assert.equal(emlNew.campaign_status, 'draft');
const emlSent = (await jcall('PATCH', `emails/${emlNew.id}/send`, 'emails', emlNew.id, 'send', { recipient_count: 850 })).item;
assert.equal(emlSent.campaign_status, 'sent');
assert.equal(emlSent.recipient_count, 850);
const revs02 = await jcall('GET', `revisions?module_code=02&entity_id=${emlNew.id}`, 'revisions');
await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs02.items[0].id });

// 5. Module 03: Instant Admit Card push dispatch
const admDisp = (await jcall('PATCH', 'admit-cards/comm-adm-02/dispatch', 'admit-cards', 'comm-adm-02', 'dispatch', { batch_size: 400 })).item;
assert.equal(admDisp.dispatch_status, 'dispatched_live');
assert.equal(admDisp.dispatched_count, 400);

// 6. Module 04: Deadline Countdown trigger
const ddlTrig = (await jcall('PATCH', 'deadlines/comm-ddl-01/trigger-reminder', 'deadlines', 'comm-ddl-01', 'trigger-reminder', { batch_size: 300 })).item;
assert.equal(ddlTrig.broadcast_status, 'active_countdown');
assert.equal(ddlTrig.subscribers_notified, 1540);

console.log('✅ All Communications & Alerts Batch 1 (01-04) tests passed!');
