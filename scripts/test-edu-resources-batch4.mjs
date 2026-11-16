import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureEduResourcesBatch4Schema,
  getBatch4Overview,
  handleEduBatch4Admin,
  handlePublicEduQuizzesApi,
  handlePublicEduMockTestsApi,
  handlePublicEduAnswerKeysApi,
  handlePublicEduCollectionsApi,
  handlePublicEduAssessmentGradeApi
} from '../functions/_lib/edu-resources-batch4.js';
import { handleEduBatch1Admin } from '../functions/_lib/edu-resources-batch1.js';
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

// 1. RBAC & CSRF protection
await assert.rejects(
  () => requireRole(new Request('https://csodisha.com/api/admin/edu/quizzes', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/edu/quizzes', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Ensure Batch 1 + Batch 4 schema & starter records
await handleEduBatch1Admin(req('GET', 'https://csodisha.com/api/admin/edu/overview'), env, admin, 'overview');
await ensureEduResourcesBatch4Schema(env.DB);
await ensureEduResourcesBatch4Schema(env.DB);
const b4Ov = await getBatch4Overview(env);
assert.ok(b4Ov.quizzes >= 1 && b4Ov.mock_tests >= 1 && b4Ov.answer_keys >= 1 && b4Ov.collections >= 1, 'Starter seeds should exist');

// 3. Module 13: Quiz CRUD, Question Bank linking & Rollback
const qzCreate = await handleEduBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/quizzes', {
    subject_name: 'Odisha General Studies',
    title_en: 'Odisha History Quick Quiz',
    question_ids: ['qb-paika-1817-01'],
    marks_per_question: 2,
    negative_marks: 0.5,
    status: 'published'
  }),
  env, admin, 'quizzes'
);
assert.equal(qzCreate.status, 201);
const qzItem = (await qzCreate.json()).item;
assert.equal(qzItem.total_questions, 1);
assert.equal(qzItem.total_marks, 2);

await handleEduBatch4Admin(
  req('PUT', `https://csodisha.com/api/admin/edu/quizzes/${qzItem.id}`, { title_en: 'Odisha History Quick Quiz v2' }),
  env, admin, 'quizzes', qzItem.id
);
const qzDetail = await (await handleEduBatch4Admin(
  req('GET', `https://csodisha.com/api/admin/edu/quizzes/${qzItem.id}`),
  env, admin, 'quizzes', qzItem.id
)).json();
assert.ok(qzDetail.revisions.length >= 2);
const v1Qz = qzDetail.revisions.find(r => r.version_num === 1);
const qzRb = await (await handleEduBatch4Admin(
  req('PATCH', `https://csodisha.com/api/admin/edu/quizzes/${qzItem.id}`, { action: 'rollback', revision_id: v1Qz.id }),
  env, admin, 'quizzes', qzItem.id
)).json();
assert.equal(qzRb.item.title_en, 'Odisha History Quick Quiz');

// 4. Module 14: Mock Tests multi-section totals & auto-fill
const autoFill = await (await handleEduBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/mock-tests/auto-fill', { subject_name: 'Odisha', limit: 5 }),
  env, admin, 'mock-tests', 'auto-fill'
)).json();
assert.ok(autoFill.question_ids.length >= 1);

const mkCreate = await handleEduBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/mock-tests', {
    conducting_body: 'OSSC',
    title_en: 'OSSC CGL 2026 Full Mock 1',
    sections: [
      { section_name_en: 'Odisha GK', subject_name: 'Odisha General Studies', question_ids_json: autoFill.question_ids, marks_per_q: 2, negative_marks: 0.5, section_time_mins: 30 }
    ],
    status: 'published'
  }),
  env, admin, 'mock-tests'
);
assert.equal(mkCreate.status, 201);
const mkItem = (await mkCreate.json()).item;
assert.equal(mkItem.total_questions, autoFill.question_ids.length);
assert.equal(mkItem.total_marks, autoFill.question_ids.length * 2);

// 5. Module 15: Answer Keys Set A-D persistence
const akCreate = await handleEduBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/answer-keys', {
    conducting_body: 'OPSC',
    exam_year: 2025,
    title_en: 'OPSC ASO 2025 Provisional Answer Key',
    answer_mapping: [{ q_no: 1, set_a: 'A', set_b: 'B', set_c: 'C', set_d: 'D', explanation_en: 'Verified' }],
    objection_window_end: '2026-12-20',
    status: 'published'
  }),
  env, admin, 'answer-keys'
);
assert.equal(akCreate.status, 201);
const akItem = (await akCreate.json()).item;
assert.equal(akItem.answer_mapping.length, 1);

// 6. Module 16: Resource Collections multi-module bundling & search-items
const searchRes = await (await handleEduBatch4Admin(
  req('GET', 'https://csodisha.com/api/admin/edu/collections/search-items?q=Odisha'),
  env, admin, 'collections', 'search-items'
)).json();
assert.ok(searchRes.items.length >= 1);

const colCreate = await handleEduBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/collections', {
    collection_type: 'exam_starter_pack',
    title_en: 'OSSC CGL Complete Starter Pack',
    items: [
      { module_code: '13', item_id: qzItem.id, title_en: qzItem.title_en, step_order: 1, is_required: true },
      { module_code: '14', item_id: mkItem.id, title_en: mkItem.title_en, step_order: 2, is_required: true }
    ],
    offline_pack_ready: true,
    status: 'published'
  }),
  env, admin, 'collections'
);
assert.equal(colCreate.status, 201);
assert.equal((await colCreate.json()).item.items.length, 2);

// 7. Public APIs (no answer leak before submit) & Assessment Grading
const pubQzDetail = await (await handlePublicEduQuizzesApi(
  new Request(`https://csodisha.com/api/edu/quizzes?id=${qzItem.id}`),
  env
)).json();
assert.equal(pubQzDetail.questions.length, 1);
assert.equal(pubQzDetail.questions[0].correct_option, undefined, 'Must not leak correct_option before submission');

const gradeRes = await (await handlePublicEduAssessmentGradeApi(
  req('POST', 'https://csodisha.com/api/edu/assessments/grade', {
    kind: 'quiz',
    id: qzItem.id,
    answers: { 'qb-paika-1817-01': 'A' }
  }),
  env
)).json();
assert.equal(gradeRes.correct, 1);
assert.equal(gradeRes.score, 2);
assert.equal(gradeRes.score_pct, 100);
assert.equal(gradeRes.passed, true);
assert.equal(gradeRes.breakdown[0].correct_option, 'A');

const pubMk = await handlePublicEduMockTestsApi(new Request('https://csodisha.com/api/edu/mock-tests'), env);
assert.equal(pubMk.status, 200);
const pubAk = await handlePublicEduAnswerKeysApi(new Request('https://csodisha.com/api/edu/answer-keys'), env);
assert.equal(pubAk.status, 200);
const pubCol = await handlePublicEduCollectionsApi(new Request('https://csodisha.com/api/edu/collections'), env);
assert.equal(pubCol.status, 200);

console.log('✅ All Educational Resources Batch 4 tests passed!');
