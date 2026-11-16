import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureEduResourcesBatch6Schema,
  getBatch6Overview,
  getFull22ModuleOverview,
  handleEduBatch6Admin,
  handlePublicEduStudentHubApi,
  handlePublicEduToolsApi
} from '../functions/_lib/edu-resources-batch6.js';
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
  () => requireRole(new Request('https://csodisha.com/api/admin/edu/student-dashboard', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/edu/tools', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Ensure Batch 1 + Batch 6 schema & starter records
await handleEduBatch1Admin(req('GET', 'https://csodisha.com/api/admin/edu/overview'), env, admin, 'overview');
await ensureEduResourcesBatch6Schema(env.DB);
await ensureEduResourcesBatch6Schema(env.DB);
const b6Ov = await getBatch6Overview(env);
assert.ok(b6Ov.widgets >= 2 && b6Ov.tools >= 4, 'Starter seeds should exist');

// 3. Module 21: Student Dashboard Widget CRUD & Rollback
const wCreate = await handleEduBatch6Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/student-dashboard', {
    widget_type: 'pinned_announcement',
    target_stage: 'Higher Secondary +2',
    title_en: 'CHSE +2 Science & Arts Revision Pack Live',
    body_en: 'Download free chapter-wise notes and 2024 PYQs.',
    pinned: true,
    priority_order: 3,
    status: 'published'
  }),
  env, admin, 'student-dashboard'
);
assert.equal(wCreate.status, 201);
const wItem = (await wCreate.json()).item;

await handleEduBatch6Admin(
  req('PUT', `https://csodisha.com/api/admin/edu/student-dashboard/${wItem.id}`, { title_en: 'CHSE +2 Pack Updated' }),
  env, admin, 'student-dashboard', wItem.id
);
const wDetail = await (await handleEduBatch6Admin(
  req('GET', `https://csodisha.com/api/admin/edu/student-dashboard/${wItem.id}`),
  env, admin, 'student-dashboard', wItem.id
)).json();
assert.ok(wDetail.revisions.length >= 2);
const v1W = wDetail.revisions.find(r => r.version_num === 1);
const wRb = await (await handleEduBatch6Admin(
  req('PATCH', `https://csodisha.com/api/admin/edu/student-dashboard/${wItem.id}`, { action: 'rollback', revision_id: v1W.id }),
  env, admin, 'student-dashboard', wItem.id
)).json();
assert.equal(wRb.item.title_en, 'CHSE +2 Science & Arts Revision Pack Live');

// 4. Module 22: Educational Tools CRUD, JSON rule config & Rollback
const tCreate = await handleEduBatch6Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/tools', {
    tool_type: 'exam_countdown_tracker',
    title_en: 'Odisha Exam Countdown & Target Tracker',
    config: { exams: ['OPSC OAS', 'OSSC CGL', 'OSSSC RI'] },
    status: 'published'
  }),
  env, admin, 'tools'
);
assert.equal(tCreate.status, 201);
const tItem = (await tCreate.json()).item;
assert.deepEqual(tItem.config.exams, ['OPSC OAS', 'OSSC CGL', 'OSSSC RI']);

// 5. Full 22-Module Overview Aggregation (01-22)
const suite22 = await getFull22ModuleOverview(env);
assert.equal(Object.keys(suite22.modules).length, 22, 'All 22 modules 01-22 must be aggregated');
assert.ok(suite22.totals.total_items >= 22);
assert.ok(suite22.bilingual_parity_pct >= 0 && suite22.bilingual_parity_pct <= 100);

// 6. Public Student Hub & Tools APIs
const pubHub = await (await handlePublicEduStudentHubApi(
  new Request('https://csodisha.com/api/edu/student-hub?target_stage=Higher%20Secondary%20%2B2'),
  env
)).json();
assert.ok(pubHub.widgets.length >= 2);
assert.ok(pubHub.todays_updates.length >= 1, 'Today updates digest must aggregate live Exams/Recruitments/Admit/Scholarships');

const pubTools = await (await handlePublicEduToolsApi(new Request('https://csodisha.com/api/edu/tools'), env)).json();
assert.ok(pubTools.items.length >= 5);

console.log('✅ All Educational Resources Batch 6 & 22-Module Suite tests passed!');
