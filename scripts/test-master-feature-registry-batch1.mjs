import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureMasterFeatureRegistryBatch1Schema,
  handleMasterFeatureRegistryBatch1Admin as H
} from '../functions/_lib/master-feature-registry-batch1.js';
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
const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/registry';
const call = (method, path, id, sub, extra, body) => H(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/features`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/features`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/db-entities/introspect-live-d1`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema, starter seeds & overview
await ensureMasterFeatureRegistryBatch1Schema(env.DB);
await ensureMasterFeatureRegistryBatch1Schema(env.DB);
const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.total_discovered_features, 7);
assert.equal(ov.verified_routes_count, 8);
assert.equal(ov.csp_verified_components_count, 6);
assert.equal(ov.introspected_tables_count, 4);
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.modules['05'].status, 'queued');
assert.equal(ov.modules['11'].status, 'queued');

// 3. Module 01: Discovered Features CRUD, Sanitization & Rollback
const ftrNew = (await jcall('POST', 'features', 'features', undefined, undefined, {
  feature_code: 'FTR-099',
  feature_name_en: '<script>x</script>Odia Voice Study Reader',
  feature_name_or: 'ଓଡ଼ିଆ ଭଏସ୍ ଅଧ୍ୟୟନ ରିଡର୍',
  domain_suite: 'Educational Resources',
  surface_layer: 'public_pwa',
  lifecycle_state: 'beta_rollout'
})).item;
assert.equal(ftrNew.feature_name_en, 'Odia Voice Study Reader');
await jcall('PATCH', `features/${ftrNew.id}/status`, 'features', ftrNew.id, 'status', { lifecycle_state: 'production_live' });
const revs01 = await jcall('GET', `revisions?module_code=01&entity_id=${ftrNew.id}`, 'revisions');
assert.ok(revs01.items.length >= 2);
const rb01 = await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs01.items[1].id });
assert.equal(rb01.restored.lifecycle_state, 'beta_rollout');

// 4. Module 02: Page & Route Inventory CRUD & Rollback
const rteNew = (await jcall('POST', 'routes', 'routes', undefined, undefined, {
  route_path: '/odisha-gk/',
  file_or_handler: 'study-library/index.html',
  route_kind: 'static_html_page',
  auth_requirement: 'public_open',
  audit_status: 'verified_200'
})).item;
assert.equal(rteNew.route_path, '/odisha-gk/');
await jcall('PATCH', `routes/${rteNew.id}/status`, 'routes', rteNew.id, 'status', { audit_status: 'needs_review' });
const filteredRtes = await jcall('GET', 'routes?route_kind=static_html_page', 'routes');
assert.ok(filteredRtes.items.some(r => r.route_path === '/odisha-gk/' && r.audit_status === 'needs_review'));

// 5. Module 03: Public UI Components CRUD & Rollback
const cmpNew = (await jcall('POST', 'ui-components', 'ui-components', undefined, undefined, {
  component_code: 'CMP-099',
  component_name: '<script>z</script>District Alert Banner',
  asset_script_path: 'assets/js/district-banner.js',
  css_stylesheet_path: 'assets/css/public-content.css',
  csp_zero_inline_verified: true,
  wcag_aa_verified: true,
  used_on_pages_count: 12
})).item;
assert.equal(cmpNew.component_name, 'District Alert Banner');

// 6. Module 04: Live D1 Schema Introspection (sqlite_master & PRAGMA table_info)
const intro = await jcall('POST', 'db-entities/introspect-live-d1', 'db-entities', 'introspect-live-d1', undefined, {});
assert.equal(intro.ok, true);
assert.ok(intro.tables_introspected >= 9);
const regFtrDb = intro.items.find(t => t.table_name === 'reg_discovered_features');
assert.ok(regFtrDb);
assert.equal(regFtrDb.column_count, 12);
assert.equal(regFtrDb.live_row_count, 8);
assert.equal(regFtrDb.schema_health, 'synced_verified');

// Cleanup soft-deprecate
await jcall('DELETE', `features/${ftrNew.id}`, 'features', ftrNew.id);

console.log('ALL MASTER FEATURE REGISTRY BATCH 1 TESTS PASSED');
