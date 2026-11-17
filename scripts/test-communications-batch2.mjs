import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCommunicationsBatch1Schema,
  handleCommunicationsBatch1Admin as H1
} from '../functions/_lib/communications-batch1.js';
import {
  ensureCommunicationsBatch2Schema,
  handleCommunicationsBatch2Admin as H2,
  validateWabaTemplate
} from '../functions/_lib/communications-batch2.js';
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
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall2 = async (...a) => (await call2(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/scheme-alerts`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/whatsapp`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/telegram`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureCommunicationsBatch1Schema(env.DB);
await ensureCommunicationsBatch2Schema(env.DB);
await ensureCommunicationsBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('comm_scheme_dbt_alerts'), 2);
assert.equal(await cnt('comm_whatsapp_waba_templates'), 2);
assert.equal(await cnt('comm_telegram_broadcasts'), 1);
assert.equal(await cnt('comm_frequency_caps'), 5);

const ov = await jcall1('GET', 'overview', 'overview');
assert.equal(ov.modules['05'].status, 'active');
assert.equal(ov.modules['08'].status, 'active');
assert.equal(ov.approved_waba_templates, 2);
assert.equal(ov.active_frequency_caps, 5);

// 3. Module 05: Scheme DBT alert dispatch & rollback
const schDisp = (await jcall2('PATCH', 'scheme-alerts/comm-sch-02/dispatch', 'scheme-alerts', 'comm-sch-02', 'dispatch', { batch_size: 450 })).item;
assert.equal(schDisp.alert_status, 'dispatched_live');
assert.equal(schDisp.dispatched_count, 450);
const revs05 = await jcall1('GET', 'revisions?module_code=05&entity_id=comm-sch-02', 'revisions');
assert.ok(revs05.items.length >= 1);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs05.items[0].id });

// 4. Module 06: Meta WABA validation, secret masking & rollback
const vOk = validateWabaTemplate({
  waba_template_name: 'cso_ossc_alert',
  meta_category: 'UTILITY',
  body_text: 'Hi {{1}}, {{2}} deadline is tomorrow.'
});
assert.equal(vOk.valid, true);
assert.equal(vOk.variable_count, 2);

const vBad = validateWabaTemplate({
  waba_template_name: 'Bad Name!',
  meta_category: 'UTILITY',
  body_text: 'Hi {{2}} skipped 1'
});
assert.equal(vBad.valid, false);
assert.equal(vBad.name_valid, false);
assert.equal(vBad.sequential_vars_valid, false);

const wabaNew = (await jcall2('POST', 'whatsapp', 'whatsapp', undefined, undefined, {
  waba_template_name: 'cso_subhadra_dbt_ok',
  meta_category: 'UTILITY',
  lang_code: 'en',
  body_text: 'Hello {{1}}, Subhadra DBT of ₹{{2}} credited.',
  raw_access_token: 'EAAG_SECRET_WABA_TOKEN_9876',
  raw_phone_number_id: '104988210001234',
  meta_review_status: 'approved_meta'
})).item;
assert.equal(wabaNew.token_masked_hint, 'EAAG••••••9876');
assert.equal('raw_access_token' in wabaNew, false);

// 5. Module 07: Telegram broadcast publish & secret masking
const tgNew = (await jcall2('POST', 'telegram', 'telegram', undefined, undefined, {
  channel_handle: '@csodisha_official',
  automation_trigger: 'auto_new_job_pdf',
  headline_en: 'OSSC CGL 2026 Notification PDF Out!',
  message_body_en: 'Check eligibility and apply before deadline.',
  pin_in_channel: true,
  raw_bot_token: '74129988:AAH_SECRET_TG_TOKEN_XYZ1'
})).item;
assert.equal(tgNew.bot_token_masked_hint, '7412••••••XYZ1');
assert.equal('raw_bot_token' in tgNew, false);

const tgPub = (await jcall2('PATCH', `telegram/${tgNew.id}/publish`, 'telegram', tgNew.id, 'publish', { reach_inc: 1200 })).item;
assert.equal(tgPub.broadcast_status, 'posted_live');
assert.equal(tgPub.reach_views_count, 1200);

// 6. Module 08: Frequency Cap & IST Quiet Hours Simulator
const simQuiet = await jcall2('POST', 'frequency-caps/simulate-check', 'frequency-caps', 'simulate-check', undefined, {
  channel_key: 'sms_dlt',
  ist_hour_str: '22:15',
  daily_sent: 0,
  is_urgent_admit_card: false
});
assert.equal(simQuiet.decision, 'deferred_quiet_hours');

const simBypass = await jcall2('POST', 'frequency-caps/simulate-check', 'frequency-caps', 'simulate-check', undefined, {
  channel_key: 'sms_dlt',
  ist_hour_str: '22:15',
  daily_sent: 0,
  is_urgent_admit_card: true
});
assert.equal(simBypass.decision, 'allowed');

const simCap = await jcall2('POST', 'frequency-caps/simulate-check', 'frequency-caps', 'simulate-check', undefined, {
  channel_key: 'sms_dlt',
  ist_hour_str: '11:00',
  daily_sent: 2,
  is_urgent_admit_card: false
});
assert.equal(simCap.decision, 'capped_daily_limit');

const capUpd = (await jcall2('PUT', 'frequency-caps/comm-cap-01', 'frequency-caps', 'comm-cap-01', undefined, {
  max_per_day: 3,
  enforcement_mode: 'strict_drop'
})).item;
assert.equal(capUpd.max_per_day, 3);
const revs08 = await jcall1('GET', 'revisions?module_code=08&entity_id=comm-cap-01', 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs08.items[0].id });

console.log('✅ All Communications & Alerts Batch 2 (05-08) tests passed!');
