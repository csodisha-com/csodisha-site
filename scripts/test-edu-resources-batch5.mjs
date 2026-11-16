import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureEduResourcesBatch5Schema,
  getBatch5Overview,
  handleEduBatch5Admin,
  handlePublicEduScholarshipsApi,
  handlePublicEduCareersApi
} from '../functions/_lib/edu-resources-batch5.js';
import { handleEduBatch1Admin } from '../functions/_lib/edu-resources-batch1.js';
import { handlePublicSchemesItemsApi } from '../functions/_lib/schemes-directory-studio.js';
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
  () => requireRole(new Request('https://csodisha.com/api/admin/edu/access-rules', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/edu/access-rules', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Ensure Batch 1 + Batch 5 schema & starter records
await handleEduBatch1Admin(req('GET', 'https://csodisha.com/api/admin/edu/overview'), env, admin, 'overview');
await ensureEduResourcesBatch5Schema(env.DB);
await ensureEduResourcesBatch5Schema(env.DB);
const b5Ov = await getBatch5Overview(env);
assert.ok(b5Ov.access_rules >= 2 && b5Ov.schemes >= 1 && b5Ov.scholarships >= 2 && b5Ov.careers >= 1, 'Starter seeds should exist');

// 3. Module 17: Downloads & Access Rules CRUD + Rollback
const ruleCreate = await handleEduBatch5Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/access-rules', {
    rule_name_en: 'Mock Test Registered Student Policy',
    target_scope: 'mock_test',
    access_policy: 'registered_free',
    daily_download_limit: 10,
    watermark_footer_enabled: true,
    status: 'published'
  }),
  env, admin, 'access-rules'
);
assert.equal(ruleCreate.status, 201);
const ruleItem = (await ruleCreate.json()).item;

await handleEduBatch5Admin(
  req('PUT', `https://csodisha.com/api/admin/edu/access-rules/${ruleItem.id}`, { daily_download_limit: 5 }),
  env, admin, 'access-rules', ruleItem.id
);
const ruleDetail = await (await handleEduBatch5Admin(
  req('GET', `https://csodisha.com/api/admin/edu/access-rules/${ruleItem.id}`),
  env, admin, 'access-rules', ruleItem.id
)).json();
assert.ok(ruleDetail.revisions.length >= 2);
const v1Rule = ruleDetail.revisions.find(r => r.version_num === 1);
const ruleRb = await (await handleEduBatch5Admin(
  req('PATCH', `https://csodisha.com/api/admin/edu/access-rules/${ruleItem.id}`, { action: 'rollback', revision_id: v1Rule.id }),
  env, admin, 'access-rules', ruleItem.id
)).json();
assert.equal(ruleRb.item.daily_download_limit, 10);

// 4. Module 18: Government Schemes synced bi-directionally with /schemes/
const schCreate = await handleEduBatch5Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/schemes', {
    title_en: 'Subhadra Yojana Odisha Student Support',
    title_or: 'ସୁଭଦ୍ରା ଯୋଜନା ଓଡ଼ିଶା',
    sponsor_level: 'Odisha State',
    department_name: 'WCD Odisha',
    benefit_amount: 'Rs 10,000 / year',
    status: 'published'
  }),
  env, admin, 'schemes'
);
assert.equal(schCreate.status, 201);
const schItem = (await schCreate.json()).item;
const pubSchemes = await (await handlePublicSchemesItemsApi(new Request('https://csodisha.com/api/public/schemes-directory/items?q=Subhadra'), env)).json();
assert.ok((pubSchemes.items || []).some(s => s.id === schItem.id), 'Scheme created in Module 18 must appear in public /schemes/ API');

// 5. Module 19: Scholarships filtering & deadline state
const scCreate = await handleEduBatch5Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/scholarships', {
    provider_type: 'Odisha State Govt',
    category_eligibility: 'Girls/Women',
    title_en: 'Sudakshya Technical Girls Scholarship Odisha',
    income_limit_inr: 600000,
    min_marks_pct: 60,
    award_amount_text: 'Rs 15,000 / year',
    application_deadline: '2026-12-28',
    status: 'published'
  }),
  env, admin, 'scholarships'
);
assert.equal(scCreate.status, 201);
const pubSchol = await (await handlePublicEduScholarshipsApi(
  new Request('https://csodisha.com/api/edu/scholarships?category_eligibility=Girls/Women'),
  env
)).json();
assert.ok(pubSchol.items.some(s => s.title_en.includes('Sudakshya')));

// 6. Module 20: Career Explorer structured roadmap steps & public API
const carCreate = await handleEduBatch5Admin(
  req('POST', 'https://csodisha.com/api/admin/edu/careers', {
    entry_stage: 'After +2 Science',
    career_domain: 'Engineering & IT',
    title_en: 'B.Tech & Software Engineering in Odisha (OJEE / JEE Main)',
    roadmap_steps: [
      { step_no: 1, stage_label_en: 'JEE Main / OJEE', action_en: 'Qualify entrance exam', duration_text: '1 Year' },
      { step_no: 2, stage_label_en: 'B.Tech (CET / VSSUT / NIT Rourkela)', action_en: 'Complete 4-year degree', duration_text: '4 Years' }
    ],
    recommended_exams: ['JEE Main', 'OJEE', 'GATE'],
    avg_salary_range: 'Rs 5 LPA - Rs 24 LPA',
    status: 'published'
  }),
  env, admin, 'careers'
);
assert.equal(carCreate.status, 201);
const carItem = (await carCreate.json()).item;
assert.equal(carItem.roadmap_steps.length, 2);
const pubCareers = await (await handlePublicEduCareersApi(
  new Request('https://csodisha.com/api/edu/careers?entry_stage=After%20%2B2%20Science'),
  env
)).json();
assert.ok(pubCareers.items.some(c => c.id === carItem.id));

console.log('✅ All Educational Resources Batch 5 tests passed!');
