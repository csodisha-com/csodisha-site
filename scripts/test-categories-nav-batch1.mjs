import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCategoriesNavBatch1Schema,
  getCategoriesNavOverview,
  handleCategoriesNavBatch1Admin,
  handlePublicNavConfigApi
} from '../functions/_lib/categories-nav-batch1.js';
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
  () => requireRole(new Request('https://csodisha.com/api/admin/nav/categories', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/nav/header', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Schema & starter seeds
await ensureCategoriesNavBatch1Schema(env.DB);
await ensureCategoriesNavBatch1Schema(env.DB);
const ov = await getCategoriesNavOverview(env);
assert.ok(ov.master_categories >= 4 && ov.subcategories >= 3 && ov.canonical_tags >= 4 && ov.header_links >= 7);

// 3. Modules 01 & 02: Master Category + Subcategory hierarchy & Rollback
const mRes = await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/categories', {
    name_en: 'Skill & Startups',
    name_or: 'ଦକ୍ଷତା ଏବଂ ଷ୍ଟାର୍ଟଅପ୍',
    code: 'SKL',
    target_portal: 'jobs-careers',
    landing_url: '/jobs-careers/?cat=skills',
    status: 'published'
  }),
  env, admin, 'categories'
);
assert.equal(mRes.status, 201);
const master = (await mRes.json()).item;
assert.equal(master.parent_id, null);

const sRes = await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/categories', {
    parent_id: master.id,
    name_en: 'Odisha ITI & Polytechnic',
    code: 'ITI',
    target_portal: 'jobs-careers',
    status: 'published'
  }),
  env, admin, 'categories'
);
assert.equal(sRes.status, 201);
const subCat = (await sRes.json()).item;
assert.equal(subCat.parent_id, master.id);

await handleCategoriesNavBatch1Admin(
  req('PUT', `https://csodisha.com/api/admin/nav/categories/${master.id}`, { name_en: 'Skill & Startups v2' }),
  env, admin, 'categories', master.id
);
const mDetail = await (await handleCategoriesNavBatch1Admin(
  req('GET', `https://csodisha.com/api/admin/nav/categories/${master.id}`),
  env, admin, 'categories', master.id
)).json();
const v1M = mDetail.revisions.find(r => r.version_num === 1);
const mRb = await (await handleCategoriesNavBatch1Admin(
  req('PATCH', `https://csodisha.com/api/admin/nav/categories/${master.id}`, { action: 'rollback', revision_id: v1M.id }),
  env, admin, 'categories', master.id
)).json();
assert.equal(mRb.item.name_en, 'Skill & Startups');

// 4. Module 03: Duplicate Tag Merge
const t1 = (await (await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/tags', { label_en: 'Cuttack', canonical_tag: 'cuttack', taxonomy_group: 'district_odisha', usage_count: 8, status: 'published' }),
  env, admin, 'tags'
)).json()).item;
const t2 = (await (await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/tags', { label_en: 'Cuttack District', canonical_tag: 'cuttack-dist', taxonomy_group: 'district_odisha', usage_count: 3, status: 'published' }),
  env, admin, 'tags'
)).json()).item;

const mergeOut = await (await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/tags/merge', { source_tag_id: t2.id, target_tag_id: t1.id }),
  env, admin, 'tags', 'merge'
)).json();
assert.equal(mergeOut.item.usage_count, 11);
assert.ok(mergeOut.item.synonyms.includes('cuttack-dist'));

// 5. Module 04: Header Navigation ordering & /api/nav/config
const hRes = await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/header', {
    label_en: 'Mock Tests',
    label_or: 'ମକ୍ ଟେଷ୍ଟ',
    url: '/study-library/?tab=mocks',
    badge_text_en: 'FREE',
    sort_order: 8,
    status: 'published'
  }),
  env, admin, 'header'
);
assert.equal(hRes.status, 201);
const hItem = (await hRes.json()).item;

const hdrList = await (await handleCategoriesNavBatch1Admin(
  req('GET', 'https://csodisha.com/api/admin/nav/header'),
  env, admin, 'header'
)).json();
const ids = hdrList.items.map(x => x.id);
const reversed = [...ids].reverse();
await handleCategoriesNavBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/header', { action: 'reorder', ordered_ids: reversed }),
  env, admin, 'header'
);

const pubCfg = await (await handlePublicNavConfigApi(new Request('https://csodisha.com/api/nav/config'), env)).json();
assert.equal(pubCfg.header[0].id, hItem.id, 'Reordered header item must appear first in /api/nav/config');
assert.ok(pubCfg.categories.some(c => c.id === master.id && c.subcategories.some(s => s.id === subCat.id)));

console.log('✅ All Categories & Navigation Batch 1 tests passed!');
