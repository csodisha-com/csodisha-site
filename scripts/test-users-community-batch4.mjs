import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handleUsersCommunityBatch1Admin as H1,
  ensureUsersCommunityBatch1Schema
} from '../functions/_lib/users-community-batch1.js';
import { ensureUsersCommunityBatch2Schema } from '../functions/_lib/users-community-batch2.js';
import { ensureUsersCommunityBatch3Schema } from '../functions/_lib/users-community-batch3.js';
import {
  ensureUsersCommunityBatch4Schema,
  handleUsersCommunityBatch4Admin as H4,
  handlePublicCommunityQnaApi
} from '../functions/_lib/users-community-batch4.js';
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
const admin = { userId: 'urc-u-001', email: 'founder@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/users';
const call4 = (method, path, id, sub, extra, body) => H4(req(method, `${B}/${path}`, body), env, admin, id, sub, extra);
const jcall4 = async (...a) => (await call4(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, admin, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/activity`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/data-requests`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/forum`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureUsersCommunityBatch1Schema(env.DB);
await ensureUsersCommunityBatch2Schema(env.DB);
await ensureUsersCommunityBatch3Schema(env.DB);
await ensureUsersCommunityBatch4Schema(env.DB);
await ensureUsersCommunityBatch4Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('urc_user_activity_logs'), 4);
assert.equal(await cnt('urc_data_access_requests'), 2);
assert.equal(await cnt('urc_forum_threads'), 2);
assert.equal(await cnt('urc_student_questions'), 2);

const ov = await jcall1('GET', 'overview', 'overview');
assert.equal(ov.modules['13'].status, 'active');
assert.equal(ov.modules['14'].status, 'active');
assert.equal(ov.modules['15'].status, 'active');
assert.equal(ov.modules['16'].status, 'active');
assert.equal(ov.activity_events_24h, 4);
assert.equal(ov.open_dpdp_requests, 1);
assert.equal(ov.active_forum_threads, 2);
assert.equal(ov.unanswered_questions_count, 1);

// 3. Module 13: Activity log filtering & recording
const actBal = await jcall4('GET', 'activity?district_odisha=Balasore&portal_area=student-hub', 'activity');
assert.equal(actBal.items.length, 1);
assert.ok(actBal.breakdown.by_portal.length >= 3);

const newAct = (await jcall4('POST', 'activity', 'activity', undefined, undefined, {
  user_id: 'urc-u-004',
  user_name: 'Ananya Senapati',
  user_email: 'ananya.balasore@example.in',
  activity_type: 'pdf_download',
  portal_area: 'study-library',
  target_ref: 'ossc-cgl-2026-syllabus.pdf',
  district_odisha: 'Balasore'
})).item;
assert.equal(newAct.activity_type, 'pdf_download');

// 4. Module 14: DPDP sanitized export & PII anonymization with super_admin guard
const expRes = await jcall4('PATCH', 'data-requests/urc-dpdp-001', 'data-requests', 'urc-dpdp-001', undefined, {
  action: 'generate_export'
});
assert.equal(expRes.item.fulfillment_status, 'fulfilled');
assert.ok(expRes.export_bundle, 'Export bundle returned');
assert.equal(expRes.export_bundle.user.email, 'ananya.balasore@example.in');
assert.equal('password_hash' in expRes.export_bundle.user, false, 'No password_hash in DPDP export');
assert.equal('sessionToken' in expRes.export_bundle.user, false, 'No sessionToken in DPDP export');
assert.ok(expRes.export_bundle.activity_logs.length >= 1);

// Super Admin erasure guard (409)
const saDpdp = (await jcall4('POST', 'data-requests', 'data-requests', undefined, undefined, {
  requester_name: 'Rajesh Behera',
  requester_email: 'founder@csodisha.com',
  request_type: 'account_erasure_anonymize',
  verification_status: 'identity_verified'
})).item;
await rej(call4('PATCH', `data-requests/${saDpdp.id}`, 'data-requests', saDpdp.id, undefined, {
  action: 'anonymize_erase'
}), 409);

// Valid non-admin PII anonymization
const stuDpdp = (await jcall4('POST', 'data-requests', 'data-requests', undefined, undefined, {
  user_id: 'urc-u-005',
  requester_name: 'Debasis Pradhan',
  requester_email: 'debasis.khordha@example.in',
  request_type: 'account_erasure_anonymize',
  verification_status: 'identity_verified'
})).item;
const erased = await jcall4('PATCH', `data-requests/${stuDpdp.id}`, 'data-requests', stuDpdp.id, undefined, {
  action: 'anonymize_erase'
});
assert.equal(erased.item.fulfillment_status, 'fulfilled');
const erasedU = await env.DB.prepare(`SELECT full_name, email, account_status FROM urc_users WHERE id = 'urc-u-005'`).first();
assert.equal(erasedU.full_name, 'Erased User');
assert.ok(erasedU.email.endsWith('@redacted.invalid'));
assert.equal(erasedU.account_status, 'blocked');

// 5. Module 15: Discussion Forum CRUD, pin/lock & revision rollback
const th = (await jcall4('POST', 'forum', 'forum', undefined, undefined, {
  category_key: 'odisha_gk_history',
  title_en: 'Konark Sun Temple & Kalinga Architecture Notes',
  title_or: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ଏବଂ କଳିଙ୍ଗ ସ୍ଥାପତ୍ୟ ନୋଟ୍ସ',
  tags: ['Odisha GK', 'Art & Culture'],
  status: 'published'
})).item;
await jcall4('PATCH', `forum/${th.id}`, 'forum', th.id, undefined, { is_pinned: true, is_locked: true });
const revs15 = await jcall1('GET', `revisions?module_code=15&entity_id=${th.id}`, 'revisions');
assert.ok(revs15.items.length >= 1);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs15.items[0].id });

// 6. Module 16: Ask a Question, mentor answer & public /api/community/qna
const ansRes = (await jcall4('PATCH', 'questions/urc-qna-002', 'questions', 'urc-qna-002', undefined, {
  answer_en: 'Under RTE Act 2009, the recommended PTR for upper primary (Classes 6-8) is 35:1.',
  answer_or: 'RTE ଆଇନ ୨୦୦୯ ଅନୁଯାୟୀ ଉଚ୍ଚ ପ୍ରାଥମିକ (ଷଷ୍ଠ-ଅଷ୍ଟମ) ପାଇଁ ଛାତ୍ର-ଶିକ୍ଷକ ଅନୁପାତ ୩୫:୧ ଅଟେ।',
  answer_status: 'answered_verified',
  is_verified_answer: true
})).item;
assert.equal(ansRes.is_verified_answer, true);
assert.equal(ansRes.answer_status, 'answered_verified');

const pubQna = await (await handlePublicCommunityQnaApi(
  new Request('https://csodisha.com/api/community/qna', { method: 'GET' }),
  env
)).json();
assert.ok(pubQna.questions.length >= 2, 'Both verified/featured Q&As published');
assert.ok(pubQna.threads.length >= 2, 'Published forum threads returned');

const revs16 = await jcall1('GET', 'revisions?module_code=16&entity_id=urc-qna-002', 'revisions');
assert.ok(revs16.items.length >= 1);

console.log('✅ All Users, Roles & Community Batch 4 (13-16) tests passed!');
