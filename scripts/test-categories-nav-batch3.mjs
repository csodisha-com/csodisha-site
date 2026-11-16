import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCategoriesNavBatch3Schema,
  getFull11ModuleNavOverview,
  handleCategoriesNavBatch3Admin,
  getPublishedNavBatch3Config
} from '../functions/_lib/categories-nav-batch3.js';
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
  () => requireRole(new Request('https://csodisha.com/api/admin/nav/internal-links', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/nav/social-links', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Schema & starter seeds
await ensureCategoriesNavBatch3Schema(env.DB);
await ensureCategoriesNavBatch3Schema(env.DB);

// 3. Module 09: Internal Links CRUD + Verify Internal Routes + Rollback
const ilOk = await handleCategoriesNavBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/internal-links', {
    link_group: 'quick_access_bar',
    source_portal: 'home',
    anchor_text_en: 'OPSC OAS Syllabus 2026',
    target_url: '/study-library/?type=syllabus',
    status: 'published'
  }),
  env, admin, 'internal-links'
);
assert.equal(ilOk.status, 201);
const ilItem = (await ilOk.json()).item;

const ilBroken = await handleCategoriesNavBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/internal-links', {
    link_group: 'contextual_cta',
    source_portal: 'home',
    anchor_text_en: 'Broken Portal Route',
    target_url: '/nonexistent-portal-xyz/',
    status: 'draft'
  }),
  env, admin, 'internal-links'
);
assert.equal(ilBroken.status, 201);

const verOut = await (await handleCategoriesNavBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/internal-links/verify', {}),
  env, admin, 'internal-links', 'verify'
)).json();
assert.ok(verOut.ok_count >= 5 && verOut.broken_count >= 1);

await handleCategoriesNavBatch3Admin(
  req('PUT', `https://csodisha.com/api/admin/nav/internal-links/${ilItem.id}`, { anchor_text_en: 'OPSC OAS Syllabus v2' }),
  env, admin, 'internal-links', ilItem.id
);
const ilDetail = await (await handleCategoriesNavBatch3Admin(
  req('GET', `https://csodisha.com/api/admin/nav/internal-links/${ilItem.id}`),
  env, admin, 'internal-links', ilItem.id
)).json();
const v1Il = ilDetail.revisions.find(r => r.version_num === 1);
const ilRb = await (await handleCategoriesNavBatch3Admin(
  req('PATCH', `https://csodisha.com/api/admin/nav/internal-links/${ilItem.id}`, { action: 'rollback', revision_id: v1Il.id }),
  env, admin, 'internal-links', ilItem.id
)).json();
assert.equal(ilRb.item.anchor_text_en, 'OPSC OAS Syllabus 2026');

// 4. Module 10: Atomic Batch Menu Ordering
const hdrList = await (await handleCategoriesNavBatch3Admin(
  req('GET', 'https://csodisha.com/api/admin/nav/ordering?location=header'),
  env, admin, 'ordering'
)).json();
assert.ok(hdrList.items.length >= 7);
const reversedIds = [...hdrList.items].map(x => x.id).reverse();
const ordSave = await (await handleCategoriesNavBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/ordering', { location: 'header', ordered_ids: reversedIds }),
  env, admin, 'ordering'
)).json();
assert.equal(ordSave.reordered, reversedIds.length);
const hdrAfter = await (await handleCategoriesNavBatch3Admin(
  req('GET', 'https://csodisha.com/api/admin/nav/ordering?location=header'),
  env, admin, 'ordering'
)).json();
assert.equal(hdrAfter.items[0].id, reversedIds[0]);

// 5. Module 11: Social Links CRUD & Public Config
const socRes = await handleCategoriesNavBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/social-links', {
    platform_key: 'linkedin',
    label_en: 'LinkedIn',
    handle_text: 'company/csodisha',
    profile_url: 'https://linkedin.com/company/csodisha',
    placement: 'footer_only',
    sort_order: 6,
    status: 'published'
  }),
  env, admin, 'social-links'
);
assert.equal(socRes.status, 201);

const pubB3 = await getPublishedNavBatch3Config(env);
assert.ok(pubB3.internal_links.length >= 5);
assert.ok(pubB3.social_links.length >= 6);

// 6. Full 11-Module Overview Aggregation (01-11)
const suite11 = await getFull11ModuleNavOverview(env);
assert.equal(Object.keys(suite11.modules).length, 11, 'All 11 modules 01-11 must be aggregated');
assert.ok(suite11.totals.total_items >= 25);
assert.ok(suite11.social_channels >= 6);

console.log('✅ All Categories & Navigation Batch 3 & 11-Module Suite tests passed!');
