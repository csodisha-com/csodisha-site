import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureEduResourcesBatch3Schema,
  getBatch3Overview,
  handleEduBatch3Admin,
  handlePublicEduAdmitResultsApi,
  handlePublicEduSyllabiApi,
  handlePublicEduPyqsApi
} from '../functions/_lib/edu-resources-batch3.js';
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
  () => requireRole(new Request('https://csodisha.com/api/admin/edu/admit-results', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/edu/admit-results', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Ensure Batch 1 (for edu_resources coverage) + Batch 3 schema & starter records
await handleEduBatch1Admin(req('GET', 'https://csodisha.com/api/admin/edu/overview'), env, admin, 'overview');
await ensureEduResourcesBatch3Schema(env.DB);
await ensureEduResourcesBatch3Schema(env.DB); // idempotent
const b3Ov = await getBatch3Overview(env);
assert.ok(b3Ov.admit_results >= 1 && b3Ov.syllabi >= 1 && b3Ov.pyqs >= 1 && b3Ov.questions >= 1, 'Starter seeds should exist');

// 3. Module 09: Admit Cards & Results + Cut-off table persistence & rollback
const admCreate = await handleEduBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/admit-results', {
    notice_type: 'final_result',
    conducting_body: 'OSSC',
    title_en: 'OSSC CGLRE 2025 Final Cut-off & Merit List',
    title_or: 'OSSC CGLRE ୨୦୨୫ ଚୂଡ଼ାନ୍ତ କଟ୍-ଅଫ୍',
    cutoff_table: [
      { category: 'UR', marks: '128.5', qualifying_pct: '64.25%' },
      { category: 'SEBC', marks: '124.0', qualifying_pct: '62.0%' },
      { category: 'SC', marks: '108.5', qualifying_pct: '54.25%' }
    ],
    status: 'published'
  }),
  env, admin, 'admit-results'
);
assert.equal(admCreate.status, 201);
const admItem = (await admCreate.json()).item;
assert.equal(admItem.cutoff_table.length, 3);

await handleEduBatch3Admin(
  req('PUT', `https://csodisha.com/api/admin/edu/admit-results/${admItem.id}`, {
    title_en: 'OSSC CGLRE 2025 Revised Cut-off',
    cutoff_table: [{ category: 'UR', marks: '130.0', qualifying_pct: '65.0%' }]
  }),
  env, admin, 'admit-results', admItem.id
);
const admDetail = await (await handleEduBatch3Admin(
  req('GET', `https://csodisha.com/api/admin/edu/admit-results/${admItem.id}`),
  env, admin, 'admit-results', admItem.id
)).json();
assert.ok(admDetail.revisions.length >= 2);
const v1Rev = admDetail.revisions.find(r => r.version_num === 1);
const admRollback = await (await handleEduBatch3Admin(
  req('PATCH', `https://csodisha.com/api/admin/edu/admit-results/${admItem.id}`, { action: 'rollback', revision_id: v1Rev.id }),
  env, admin, 'admit-results', admItem.id
)).json();
assert.equal(admRollback.item.title_en, 'OSSC CGLRE 2025 Final Cut-off & Merit List');
assert.equal(admRollback.item.cutoff_table.length, 3);

// 4. Module 10: Syllabus & Exam Patterns + Topic Coverage Heatmap
const sylCreate = await handleEduBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/syllabi', {
    conducting_body: 'OPSC',
    title_en: 'OPSC OAS Prelims 2026 Syllabus',
    exam_pattern: [{ stage: 'Prelims', paper: 'GS Paper I', questions: 100, marks: 200, duration_mins: 120 }],
    topics_checklist: [
      { title_en: 'Odisha History & Culture', subject_name: 'Odisha GK', weightage_marks: 25 },
      { title_en: 'Quantum Chromodynamics Advanced', subject_name: 'Theoretical Physics', weightage_marks: 10 }
    ],
    status: 'published'
  }),
  env, admin, 'syllabi'
);
assert.equal(sylCreate.status, 201);
const sylId = (await sylCreate.json()).item.id;
const sylDetail = await (await handleEduBatch3Admin(
  req('GET', `https://csodisha.com/api/admin/edu/syllabi/${sylId}`),
  env, admin, 'syllabi', sylId
)).json();
assert.equal(sylDetail.item.heatmap.total_topics, 2);
assert.ok(sylDetail.item.heatmap.coverage_pct >= 0 && sylDetail.item.heatmap.coverage_pct <= 100);

// 5. Module 11: PYQ -> Module 12 Question Bank parser
const pyqCreate = await handleEduBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/pyqs', {
    subject_name: 'Odisha GK',
    exam_year: 2024,
    title_en: 'OSSSC RI 2024 Paper I',
    question_count: 100,
    status: 'published'
  }),
  env, admin, 'pyqs'
);
assert.equal(pyqCreate.status, 201);
const pyqItem = (await pyqCreate.json()).item;

const parseRes = await handleEduBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/pyqs/parse-to-bank', {
    pyq_paper_id: pyqItem.id,
    subject_name: 'Odisha GK',
    exam_tag: 'OSSSC RI 2024',
    exam_year: 2024,
    raw_text: `Q1. Which temple in Puri is one of the Char Dham pilgrimage sites?
A) Jagannath Temple
B) Lingaraj Temple
C) Konark Sun Temple
D) Mukteswara Temple
Answer: A
Explanation: Shree Jagannath Temple at Puri is one of the four Char Dham sites.

Q2. Who was the first Chief Minister of Odisha?
A) Harekrushna Mahatab
B) Biju Patnaik
C) Nabakrushna Choudhuri
D) Biswanath Das
Answer: A
Explanation: Harekrushna Mahatab served as the first Chief Minister of Odisha.`
  }),
  env, admin, 'pyqs', 'parse-to-bank'
);
assert.equal(parseRes.status, 201);
const parsedData = await parseRes.json();
assert.equal(parsedData.inserted_count, 2);

// 6. Module 12: Bulk MCQ Import & Duplicate Detection + Export
const dryRun = await (await handleEduBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/questions/import', {
    dry_run: true,
    items: [
      { question_en: 'Who was the first Chief Minister of Odisha?', A_en: 'A', B_en: 'B', C_en: 'C', D_en: 'D', correct_option: 'A' },
      { question_en: 'Which district of Odisha is famous for Chilika Lake?', A_en: 'Puri/Khordha/Ganjam', B_en: 'Sambalpur', C_en: 'Koraput', D_en: 'Mayurbhanj', correct_option: 'A', difficulty: 'Easy' }
    ]
  }),
  env, admin, 'questions', 'import'
)).json();
assert.equal(dryRun.duplicate_count, 1);
assert.equal(dryRun.valid_count, 1);

const impRes = await handleEduBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/questions/import', {
    dry_run: false,
    items: [
      { question_en: 'Which district of Odisha is famous for Chilika Lake?', A_en: 'Puri/Khordha/Ganjam', B_en: 'Sambalpur', C_en: 'Koraput', D_en: 'Mayurbhanj', correct_option: 'A', difficulty: 'Easy' }
    ]
  }),
  env, admin, 'questions', 'import'
);
assert.equal(impRes.status, 201);
assert.equal((await impRes.json()).imported, 1);

const expRes = await handleEduBatch3Admin(
  req('GET', 'https://csodisha.com/api/admin/edu/questions/export'),
  env, admin, 'questions', 'export'
);
assert.equal(expRes.status, 200);
const expJson = await expRes.json();
assert.ok(expJson.items.length >= 4);

// 7. Public cached endpoints
const pubAdm = await handlePublicEduAdmitResultsApi(new Request('https://csodisha.com/api/edu/admit-results'), env);
assert.equal(pubAdm.status, 200);
assert.ok((await pubAdm.json()).items.length >= 2);

const pubSyl = await handlePublicEduSyllabiApi(new Request('https://csodisha.com/api/edu/syllabi'), env);
assert.equal(pubSyl.status, 200);
assert.ok((await pubSyl.json()).items.length >= 2);

const pubPyq = await handlePublicEduPyqsApi(new Request('https://csodisha.com/api/edu/pyqs'), env);
assert.equal(pubPyq.status, 200);
assert.ok((await pubPyq.json()).items.length >= 2);

console.log('✅ All Educational Resources Batch 3 tests passed!');
