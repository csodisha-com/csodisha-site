import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureEduResourcesBatch2Schema,
  handleEduBatch2Admin,
  getBatch2Overview,
  handlePublicEduTaxonomyApi,
  handlePublicEduExaminationsApi
} from '../functions/_lib/edu-resources-batch2.js';
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
  () => requireRole(new Request('https://csodisha.com/api/admin/edu/classes', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/edu/classes', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Auto-ensure & starter records
await ensureEduResourcesBatch2Schema(env.DB);
await ensureEduResourcesBatch2Schema(env.DB);
const b2Ov = await getBatch2Overview(env);
assert.ok(b2Ov.classes >= 8 && b2Ov.subjects >= 6 && b2Ov.examinations >= 3 && b2Ov.recruitments >= 1);

// 3. Module 06: Class / Grade CRUD, stage ordering & rollback
const clsCreate = await handleEduBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/classes', {
    name_en: 'OAVS Entrance Class 6', name_or: 'OAVS ପ୍ରବେଶିକା ଷଷ୍ଠ ଶ୍ରେଣୀ',
    stage_group: 'school_1_10', board_or_body: 'OAVS / BSE', sort_order: 9, status: 'published'
  }),
  env, admin, 'classes'
);
assert.equal(clsCreate.status, 201);
const clsItem = (await clsCreate.json()).item;
await handleEduBatch2Admin(
  req('PUT', `https://csodisha.com/api/admin/edu/classes/${clsItem.id}`, { name_en: 'OAVS Entrance Updated' }),
  env, admin, 'classes', clsItem.id
);
const clsDetail = await (await handleEduBatch2Admin(req('GET', `https://csodisha.com/api/admin/edu/classes/${clsItem.id}`), env, admin, 'classes', clsItem.id)).json();
assert.equal(clsDetail.revisions.length, 2);
const clsRb = await (await handleEduBatch2Admin(
  req('PATCH', `https://csodisha.com/api/admin/edu/classes/${clsItem.id}`, { action: 'rollback', revision_id: clsDetail.revisions[1].id }),
  env, admin, 'classes', clsItem.id
)).json();
assert.equal(clsRb.item.name_en, 'OAVS Entrance Class 6');

// 4. Module 05: Hierarchical Subject -> Unit -> Topic tree
const rootSub = await (await handleEduBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/subjects', {
    class_grade_id: clsItem.id, code: 'MATH-6', title_en: 'Mathematics Class 6', status: 'published'
  }),
  env, admin, 'subjects'
)).json();
const childTopic = await (await handleEduBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/subjects', {
    class_grade_id: clsItem.id, parent_topic_id: rootSub.item.id, code: 'MATH-6-U1', title_en: 'Unit 1: Number System', status: 'published'
  }),
  env, admin, 'subjects'
)).json();
const treeRes = await (await handleEduBatch2Admin(
  req('GET', `https://csodisha.com/api/admin/edu/subjects?class_grade_id=${clsItem.id}`),
  env, admin, 'subjects'
)).json();
assert.equal(treeRes.tree.length, 1);
assert.equal(treeRes.tree[0].children[0].id, childTopic.item.id);

// 5. Module 07: Examinations, dates, smart auto-matcher & interlink
const exCreate = await (await handleEduBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/examinations', {
    exam_code: 'OSSSC-RI-2026', conducting_body: 'OSSSC', exam_level: 'State',
    title_en: 'OSSSC Revenue Inspector (RI) 2026', tags: ['osssc', 'arithmetic'],
    important_dates: { apply_start: '2026-03-01', exam_date: '2026-05-20' },
    status: 'published'
  }),
  env, admin, 'examinations'
)).json();
const exDetail = await (await handleEduBatch2Admin(
  req('GET', `https://csodisha.com/api/admin/edu/examinations/${exCreate.item.id}`),
  env, admin, 'examinations', exCreate.item.id
)).json();
assert.ok(exDetail.smart_matches.length >= 1, 'Smart auto-matcher must suggest matching Batch 1 resources');
await handleEduBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/interlinks', {
    source_module: '07', source_id: exCreate.item.id, target_module: '03', target_id: exDetail.smart_matches[0].id, relation_type: 'notes_for'
  }),
  env, admin, 'interlinks'
);

// 6. Module 08: Live Recruitment bridged with jobs_directory_items (/jobs/)
const recListBefore = await (await handleEduBatch2Admin(req('GET', 'https://csodisha.com/api/admin/edu/recruitments'), env, admin, 'recruitments')).json();
assert.ok(recListBefore.items.length >= 1, 'Existing live /jobs/ recruitments must appear in See Existing Contents');

const recCreate = await (await handleEduBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/recruitments', {
    title_en: 'OPSC Assistant Section Officer (ASO) 2026', recruiting_body: 'OPSC',
    qualification_tag: 'Graduate', vacancies: '796', deadline_date: '2026-04-30',
    tags: ['opsc', 'aso'], status: 'published'
  }),
  env, admin, 'recruitments'
)).json();
const jobRowInD1 = await env.DB.prepare(`SELECT id, title, status FROM jobs_directory_items WHERE id = ?`).bind(recCreate.item.id).first();
assert.equal(jobRowInD1.title, 'OPSC Assistant Section Officer (ASO) 2026');
assert.equal(jobRowInD1.status, 'published');

// 7. Public cached endpoints /api/edu/taxonomy & /api/edu/examinations
const pubTax = await (await handlePublicEduTaxonomyApi(new Request('https://csodisha.com/api/edu/taxonomy'), env)).json();
assert.ok(pubTax.classes.length >= 9 && pubTax.subjects_tree.length >= 4);

const pubExams = await (await handlePublicEduExaminationsApi(new Request('https://csodisha.com/api/edu/examinations'), env)).json();
const riExam = pubExams.items.find(e => e.id === exCreate.item.id);
assert.ok(riExam && riExam.interlinked_resources.length >= 1);

console.log('ALL EDUCATIONAL RESOURCES BATCH 2 (05-08) TESTS PASSED');
