import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureCategoriesNavBatch2Schema,
  getCategoriesNavBatch2Overview,
  handleCategoriesNavBatch2Admin,
  getPublishedNavBatch2Config
} from '../functions/_lib/categories-nav-batch2.js';
import { handlePublicNavConfigApi } from '../functions/_lib/categories-nav-batch1.js';
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
  () => requireRole(new Request('https://csodisha.com/api/admin/nav/mega-menu', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/nav/breadcrumbs', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Schema & starter seeds
await ensureCategoriesNavBatch2Schema(env.DB);
await ensureCategoriesNavBatch2Schema(env.DB);
const ov2 = await getCategoriesNavBatch2Overview(env);
assert.ok(ov2.mega_menu_items >= 4 && ov2.footer_links >= 4 && ov2.sidebar_items >= 4 && ov2.breadcrumb_rules >= 4);

// 3. Module 05: Multi-column Mega Menu + Rollback
const mmCreate = await handleCategoriesNavBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/mega-menu', {
    parent_item_id: 'nmenu-library',
    column_group: 'Featured Spotlight',
    label_en: 'OPSC OAS 2026 Starter Pack',
    url: '/study-library/?pack=oas',
    status: 'published'
  }),
  env, admin, 'mega-menu'
);
assert.equal(mmCreate.status, 201);
const mmItem = (await mmCreate.json()).item;

await handleCategoriesNavBatch2Admin(
  req('PUT', `https://csodisha.com/api/admin/nav/mega-menu/${mmItem.id}`, { label_en: 'OPSC OAS Updated' }),
  env, admin, 'mega-menu', mmItem.id
);
const mmDetail = await (await handleCategoriesNavBatch2Admin(
  req('GET', `https://csodisha.com/api/admin/nav/mega-menu/${mmItem.id}`),
  env, admin, 'mega-menu', mmItem.id
)).json();
const v1Mm = mmDetail.revisions.find(r => r.version_num === 1);
const mmRb = await (await handleCategoriesNavBatch2Admin(
  req('PATCH', `https://csodisha.com/api/admin/nav/mega-menu/${mmItem.id}`, { action: 'rollback', revision_id: v1Mm.id }),
  env, admin, 'mega-menu', mmItem.id
)).json();
assert.equal(mmRb.item.label_en, 'OPSC OAS 2026 Starter Pack');

// 4. Module 06: 4-Column Footer Navigation
const ftCreate = await handleCategoriesNavBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/footer', {
    column_group: 'Odisha Exam Boards',
    label_en: 'OSSSC Official Portal',
    url: 'https://www.osssc.gov.in',
    open_new_tab: true,
    badge_text_en: 'nofollow',
    status: 'published'
  }),
  env, admin, 'footer'
);
assert.equal(ftCreate.status, 201);

// 5. Module 07: Portal-Scoped Sidebar Menus
const sbCreate = await handleCategoriesNavBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/sidebars', {
    menu_location: 'sidebar_schemes',
    column_group: 'State Welfare',
    label_en: 'Subhadra Yojana Guide',
    url: '/schemes/subhadra',
    status: 'published'
  }),
  env, admin, 'sidebars'
);
assert.equal(sbCreate.status, 201);

// 6. Module 08: Dynamic Breadcrumb Route Matching & Schema.org JSON-LD
const bcCreate = await handleCategoriesNavBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/breadcrumbs', {
    route_pattern: '/student/*',
    portal_key: 'student',
    trail: [
      { step_no: 1, label_en: 'Home', url_template: '/', is_dynamic_title: false },
      { step_no: 2, label_en: 'Student Hub', url_template: '/student/', is_dynamic_title: false },
      { step_no: 3, label_en: 'Tool', url_template: '{current_url}', is_dynamic_title: true }
    ],
    schema_org_enabled: true,
    status: 'published'
  }),
  env, admin, 'breadcrumbs'
);
assert.equal(bcCreate.status, 201);

const bcTest = await (await handleCategoriesNavBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/nav/breadcrumbs/test', { url: '/student/age-calculator', title: 'Age Eligibility Calculator' }),
  env, admin, 'breadcrumbs', 'test'
)).json();
assert.equal(bcTest.matched.portal_key, 'student');
assert.equal(bcTest.json_ld['@type'], 'BreadcrumbList');
assert.equal(bcTest.json_ld.itemListElement[2].name, 'Age Eligibility Calculator');

// 7. Public /api/nav/config merged payload
const b1 = await (await handlePublicNavConfigApi(new Request('https://csodisha.com/api/nav/config'), env)).json();
const b2 = await getPublishedNavBatch2Config(env);
assert.ok(b1.header.length >= 7);
assert.ok(b2.mega_menu.length >= 5);
assert.ok(b2.footer.length >= 5);
assert.ok(b2.sidebars.length >= 5);
assert.ok(b2.breadcrumb_rules.length >= 5);

console.log('✅ All Categories & Navigation Batch 2 tests passed!');
