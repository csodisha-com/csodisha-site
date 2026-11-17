import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handleUsersCommunityBatch1Admin as H1,
  ensureUsersCommunityBatch1Schema
} from '../functions/_lib/users-community-batch1.js';
import { ensureUsersCommunityBatch2Schema } from '../functions/_lib/users-community-batch2.js';
import { ensureUsersCommunityBatch3Schema } from '../functions/_lib/users-community-batch3.js';
import { ensureUsersCommunityBatch4Schema } from '../functions/_lib/users-community-batch4.js';
import {
  ensureUsersCommunityBatch5Schema,
  getFull19ModuleUsersOverview,
  handleUsersCommunityBatch5Admin as H5,
  handlePublicCommunityContributeApi
} from '../functions/_lib/users-community-batch5.js';
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
const call5 = (method, path, id, sub, extra, body) => H5(req(method, `${B}/${path}`, body), env, admin, id, sub, extra);
const jcall5 = async (...a) => (await call5(...a)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, admin, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/shared-knowledge`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/shared-knowledge`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/error-reports`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds + full 19-module suite_19 overview
await ensureUsersCommunityBatch1Schema(env.DB);
await ensureUsersCommunityBatch2Schema(env.DB);
await ensureUsersCommunityBatch3Schema(env.DB);
await ensureUsersCommunityBatch4Schema(env.DB);
await ensureUsersCommunityBatch5Schema(env.DB);
await ensureUsersCommunityBatch5Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('urc_shared_knowledge'), 2);
assert.equal(await cnt('urc_topic_suggestions'), 2);
assert.equal(await cnt('urc_error_reports'), 2);

const ov = await getFull19ModuleUsersOverview(env);
assert.ok(ov.suite_19, 'suite_19 present');
assert.equal(ov.suite_19.total_modules, 19);
assert.equal(ov.suite_19.active_modules, 19);
for (let i = 1; i <= 19; i++) {
  const k = String(i).padStart(2, '0');
  assert.equal(ov.suite_19.modules[k].status, 'active', `Module ${k} is active`);
}
assert.equal(ov.suite_19.pending_knowledge_submissions, 1);
assert.equal(ov.suite_19.open_errata_reports, 1);
assert.ok(ov.suite_19.top_voted_topic_suggestions.length >= 2);

// 3. Module 17: Share Knowledge + Promote to edu_resources + revision rollback
const shkPromoted = (await jcall5('PATCH', 'shared-knowledge/urc-shk-001', 'shared-knowledge', 'urc-shk-001', undefined, {
  action: 'promote_to_library'
})).item;
assert.equal(shkPromoted.review_status, 'promoted_to_library');
assert.ok(shkPromoted.promoted_edu_resource_id, 'Promoted to edu_resources');
const libRow = await env.DB.prepare(`SELECT id, title_en, status FROM edu_resources WHERE id = ?`).bind(shkPromoted.promoted_edu_resource_id).first();
assert.ok(libRow, 'Row exists in edu_resources');
assert.equal(libRow.status, 'published');

const revs17 = await jcall1('GET', 'revisions?module_code=17&entity_id=urc-shk-001', 'revisions');
assert.ok(revs17.items.length >= 1);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs17.items[0].id });

// 4. Module 18: Suggest a Topic + upvote + workflow + rollback
const topNew = (await jcall5('POST', 'topic-suggestions', 'topic-suggestions', undefined, undefined, {
  suggested_by_name: 'Pritam Swain',
  target_portal: 'study-library',
  exam_or_class: 'OSSSC RI',
  topic_title_en: 'Odisha Revenue & Land Reforms Act Summary',
  rationale_text: 'Important for OSSSC RI & Amin mains.'
})).item;
assert.equal(topNew.votes_count, 1);

const topUp = (await jcall5('PATCH', `topic-suggestions/${topNew.id}`, 'topic-suggestions', topNew.id, undefined, {
  action: 'upvote',
  workflow_status: 'in_production'
})).item;
assert.equal(topUp.votes_count, 2);
assert.equal(topUp.workflow_status, 'in_production');

const revs18 = await jcall1('GET', `revisions?module_code=18&entity_id=${topNew.id}`, 'revisions');
assert.ok(revs18.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs18.items[0].id });

// 5. Module 19: Report an Error + resolution + rollback
const errFixed = (await jcall5('PATCH', 'error-reports/urc-err-001', 'error-reports', 'urc-err-001', undefined, {
  fix_status: 'fixed_deployed',
  resolution_note: 'Corrected Q14 answer key to Option C.'
})).item;
assert.equal(errFixed.fix_status, 'fixed_deployed');
assert.ok(errFixed.resolved_at);

const revs19 = await jcall1('GET', 'revisions?module_code=19&entity_id=urc-err-001', 'revisions');
assert.ok(revs19.items.length >= 1);

// 6. Public POST /api/community/contribute intake
const pubShk = await (await handlePublicCommunityContributeApi(
  req('POST', 'https://csodisha.com/api/community/contribute', {
    kind: 'shared_knowledge',
    contributor_name: 'Rakesh Nayak',
    district_odisha: 'Puri',
    content_kind: 'mnemonics_cheat_sheet',
    subject_or_exam: 'OPSC OAS',
    title_en: 'Panchayati Raj Constitutional Articles Mnemonic'
  }),
  env
)).json();
assert.equal(pubShk.ok, true);
assert.ok(pubShk.code.startsWith('SHK-'));

const pubTop = await (await handlePublicCommunityContributeApi(
  req('POST', 'https://csodisha.com/api/community/contribute', {
    kind: 'topic_suggestion',
    suggested_by_name: 'Subham Panda',
    target_portal: 'mock-tests',
    topic_title_en: 'Odisha Budget 2026-27 Practice MCQ Set'
  }),
  env
)).json();
assert.equal(pubTop.ok, true);
assert.ok(pubTop.code.startsWith('TOP-'));

const pubErr = await (await handlePublicCommunityContributeApi(
  req('POST', 'https://csodisha.com/api/community/contribute', {
    kind: 'error_report',
    reporter_name: 'Meera Das',
    target_area: 'translation_typo',
    error_type: 'odia_translation_error',
    description_text: 'Spelling typo in Odia heading on Odisha GK page.'
  }),
  env
)).json();
assert.equal(pubErr.ok, true);
assert.ok(pubErr.code.startsWith('ERR-'));

console.log('✅ All Users, Roles & Community Batch 5 (17-19) & 19-Module Suite tests passed!');
