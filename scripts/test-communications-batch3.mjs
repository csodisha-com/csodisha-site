import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCommunicationsBatch1Schema,
  handleCommunicationsBatch1Admin as H1
} from '../functions/_lib/communications-batch1.js';
import { ensureCommunicationsBatch2Schema } from '../functions/_lib/communications-batch2.js';
import {
  ensureCommunicationsBatch3Schema,
  getFull12ModuleCommunicationsOverview,
  handleCommunicationsBatch3Admin as H3
} from '../functions/_lib/communications-batch3.js';
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
const jcall3 = async (method, path, id, sub, extra, body) => (await H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/dpdp-optouts`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/dpdp-optouts/suppress`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/queue`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureCommunicationsBatch1Schema(env.DB);
await ensureCommunicationsBatch2Schema(env.DB);
await ensureCommunicationsBatch3Schema(env.DB);
await ensureCommunicationsBatch3Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('comm_dpdp_optouts'), 3);
assert.equal(await cnt('comm_variable_tags'), 7);
assert.equal(await cnt('comm_delivery_receipts'), 6);
assert.equal(await cnt('comm_broadcast_queue'), 3);

// 3. Unified 12-module overview
const ov = await getFull12ModuleCommunicationsOverview(env);
assert.equal(ov.suite_12.total_modules, 12);
assert.equal(ov.suite_12.active_modules, 12);
for (let i = 1; i <= 12; i++) {
  const k = String(i).padStart(2, '0');
  assert.equal(ov.modules[k].status, 'active');
}
assert.equal(ov.active_dpdp_suppressions, 2);
assert.equal(ov.active_bilingual_tags, 7);
assert.equal(ov.dlr_total_events, 6);
assert.equal(ov.scheduled_queue_jobs, 2);

// 4. Module 09: SHA-256 DPDP opt-out suppression, check, re-consent & rollback
const rawPhone = '+91 94370-88123';
const supRes = await jcall3('POST', 'dpdp-optouts/suppress', 'dpdp-optouts', 'suppress', undefined, {
  contact: rawPhone,
  channel_scope: 'sms_dlt',
  revocation_source: 'sms_stop_keyword',
  reason_note: 'STOP received'
});
assert.equal(supRes.item.suppression_status, 'active_suppressed');
assert.equal(supRes.item.contact_masked_hint, '91••••8123');
assert.equal(supRes.item.contact_hash_sha256.length, 64);
assert.ok(!JSON.stringify(supRes.item).includes('9437088123'));

const chkTrue = await jcall3('POST', 'dpdp-optouts/check', 'dpdp-optouts', 'check', undefined, {
  contact: '9437088123',
  channel_key: 'sms_dlt'
});
assert.equal(chkTrue.suppressed, true);

const reCons = await jcall3('PATCH', `dpdp-optouts/${supRes.item.id}`, 'dpdp-optouts', supRes.item.id, undefined, {
  suppression_status: 're_consented'
});
assert.equal(reCons.item.suppression_status, 're_consented');

const revs09 = await jcall1('GET', `revisions?module_code=09&entity_id=${supRes.item.id}`, 'revisions');
assert.ok(revs09.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs09.items[0].id });
const afterRb09 = await jcall3('POST', 'dpdp-optouts/check', 'dpdp-optouts', 'check', undefined, {
  contact: '9437088123',
  channel_key: 'sms_dlt'
});
assert.equal(afterRb09.suppressed, true);

// 5. Module 10: Bilingual EN + OR variable tag interpolation & rollback
const interp = await jcall3('POST', 'variable-tags/render-preview', 'variable-tags', 'render-preview', undefined, {
  template_en: 'Hi {{candidate_name}}, {{exam_title}} is on {{admit_card_date}}.',
  template_or: 'ନମସ୍କାର {{candidate_name}}, {{exam_title}} ({{admit_card_date}})।',
  use_samples: true
});
assert.ok(interp.rendered_en.includes('Subham Mohanty'));
assert.ok(interp.rendered_or.includes('ଶୁଭମ ମହାନ୍ତି'));
assert.equal(interp.missing_tags.length, 0);

const createdTag = await jcall3('POST', 'variable-tags', 'variable-tags', undefined, undefined, {
  tag_key: 'center_city',
  category_group: 'exam_recruitment',
  fallback_en: 'Cuttack',
  fallback_or: 'କଟକ',
  sample_value_en: 'Bhubaneswar',
  sample_value_or: 'ଭୁବନେଶ୍ୱର'
});
assert.equal(createdTag.item.placeholder_syntax, '{{center_city}}');
await jcall3('PUT', `variable-tags/${createdTag.item.id}`, 'variable-tags', createdTag.item.id, undefined, {
  sample_value_en: 'Sambalpur'
});
const revs10 = await jcall1('GET', `revisions?module_code=10&entity_id=${createdTag.item.id}`, 'revisions');
assert.ok(revs10.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs10.items[1].id });

// 6. Module 11: Carrier DLR breakdown & ingestion
const dlrList = await jcall3('GET', 'dlr', 'dlr');
assert.ok(dlrList.carrier_breakdown.length >= 4);
const dlrIng = await jcall3('POST', 'dlr/ingest', 'dlr', 'ingest', undefined, {
  channel_key: 'sms_dlt',
  carrier_or_mx: 'Reliance Jio',
  campaign_or_template_code: 'DLT-CSO-001',
  recipient: '9861007788',
  delivery_status: 'delivered',
  carrier_error_code: '000_DELIVERED',
  latency_ms: 350
});
assert.equal(dlrIng.item.recipient_masked_hint, '98••••7788');

// 7. Module 12: Scheduled broadcast queue DPDP-filtered execution & rollback
const qNew = await jcall3('POST', 'queue', 'queue', undefined, undefined, {
  source_module_code: '01',
  source_ref_code: 'DLT-CSO-002',
  title_en: 'OSSC CGL Hall Ticket SMS',
  title_or: 'OSSC CGL ଆଡମିଟ୍ କାର୍ଡ SMS',
  channel_key: 'sms_dlt',
  target_count: 3200,
  scheduled_for_ist: '2026-11-20T09:00:00+05:30',
  priority: 'urgent_exam'
});
assert.equal(qNew.item.queue_status, 'scheduled');

const qExec = await jcall3('PATCH', `queue/${qNew.item.id}`, 'queue', qNew.item.id, undefined, {
  action: 'execute_now'
});
assert.equal(qExec.item.queue_status, 'completed');
assert.ok(qExec.item.dpdp_optouts_skipped >= 2);

const revs12 = await jcall1('GET', `revisions?module_code=12&entity_id=${qNew.item.id}`, 'revisions');
assert.ok(revs12.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs12.items[0].id });

console.log('✅ All Communications & Alerts Batch 3 (09-12) & Full 12-Module Suite tests passed!');
