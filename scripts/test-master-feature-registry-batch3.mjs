import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleMasterFeatureRegistryBatch1Admin as H1 } from '../functions/_lib/master-feature-registry-batch1.js';
import { handleMasterFeatureRegistryBatch2Admin as H2 } from '../functions/_lib/master-feature-registry-batch2.js';
import {
  ensureMasterFeatureRegistryBatch3Schema,
  getFull11ModuleRegistryOverview,
  handleMasterFeatureRegistryBatch3Admin as H3
} from '../functions/_lib/master-feature-registry-batch3.js';
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
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const jcall2 = async (...a) => (await call2(...a)).json();
const jcall3 = async (...a) => (await call3(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/releases`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/releases`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/docs`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Ensure schema + unified 11-module overview + 100% 23-suite / 299-module completion
await ensureMasterFeatureRegistryBatch3Schema(env.DB);
const ov = await getFull11ModuleRegistryOverview(env);
assert.equal(Object.keys(ov.modules).length, 11);
assert.equal(ov.modules['09'].status, 'active');
assert.equal(ov.modules['10'].status, 'active');
assert.equal(ov.modules['11'].status, 'active');
assert.equal(ov.suite_11.total_modules, 11);
assert.equal(ov.suite_11.active_modules, 11);
assert.equal(ov.suite_11.total_suites, 23);
assert.equal(ov.suite_11.implemented_modules, 299);
assert.equal(ov.suite_11.total_command_center_suites, 23);
assert.equal(ov.suite_11.total_command_center_modules, 299);
assert.equal(ov.suite_11.overall_coverage_pct, 100);
assert.equal(ov.suite_11.open_missing_controls_count, 0);
assert.ok(ov.deployed_releases_count >= 12);
assert.ok(ov.passing_test_suites_count >= 6);
assert.ok(ov.published_docs_count >= 5);

const cov = await jcall2('GET', 'coverage-matrix', 'coverage-matrix');
assert.equal(cov.total_suites, 23);
assert.equal(cov.total_modules, 299);
assert.equal(cov.implemented_modules, 299);
assert.equal(cov.overall_coverage_pct, 100);
const s19 = cov.items.find(s => s.suite_code === 'SUITE-19');
assert.equal(s19.implemented_modules_count, 11);
assert.equal(s19.coverage_pct, 100);
assert.equal(s19.matrix_status, 'complete_100');

const intro3 = await jcall1('POST', 'db-entities/introspect-live-d1', 'db-entities', 'introspect-live-d1', null, {});
assert.equal(intro3.ok, true);
assert.ok(intro3.tables_introspected >= 15);

// 3. Module 09: Implementation Status (Releases) + Sanitization + Revision Rollback
const seededRels = await jcall3('GET', 'releases', 'releases');
assert.ok(seededRels.items.length >= 12);
const createdRel = await jcall3('POST', 'releases', 'releases', null, null, {
  release_version: 'v128',
  domain_suite: 'Public Edge<script>alert(1)</script>',
  modules_range: '01-02',
  modules_shipped_count: 2,
  migration_files_range: '0128',
  sw_cache_tag: 'cso-candidate-cache-v128',
  csp_zero_inline_passed: true,
  link_audit_passed: true,
  deployment_status: 'staging_qa'
});
assert.equal(createdRel.item.release_version, 'v128');
assert.ok(!createdRel.item.domain_suite.includes('<script>'));

await jcall3('PUT', `releases/${createdRel.item.id}`, 'releases', createdRel.item.id, null, {
  modules_shipped_count: 3
});
const patchedRel = await jcall3('PATCH', `releases/${createdRel.item.id}/status`, 'releases', createdRel.item.id, 'status', {
  deployment_status: 'deployed_verified'
});
assert.equal(patchedRel.item.deployment_status, 'deployed_verified');

const relRevs = await jcall1('GET', `revisions?module_code=09&entity_id=${createdRel.item.id}`, 'revisions');
assert.ok(relRevs.items.length >= 3);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', null, { revision_id: relRevs.items[relRevs.items.length - 1].id });
const afterRelRb = await jcall3('GET', 'releases?q=v128', 'releases');
assert.equal(afterRelRb.items[0].deployment_status, 'staging_qa');

// 4. Module 10: Regression Test Coverage + Record Run + Revision Rollback
const seededTests = await jcall3('GET', 'test-coverage', 'test-coverage');
assert.ok(seededTests.items.length >= 6);
assert.equal(seededTests.pass_rate_pct, 100);

const createdTst = await jcall3('POST', 'test-coverage', 'test-coverage', null, null, {
  test_code: 'TST-099',
  script_path: 'scripts/test-sample-check.mjs',
  domain_suite: 'Master Feature Registry',
  test_category: 'csp_static_guard',
  assertions_count: 15,
  last_run_status: 'skipped',
  last_duration_ms: 0
});
assert.equal(createdTst.item.last_run_status, 'skipped');

const recorded = await jcall3('POST', `test-coverage/${createdTst.item.id}/record-run`, 'test-coverage', createdTst.item.id, 'record-run', {
  last_run_status: 'passed_green',
  last_duration_ms: 185,
  assertions_count: 19
});
assert.equal(recorded.item.last_run_status, 'passed_green');
assert.equal(recorded.item.last_duration_ms, 185);
assert.equal(recorded.item.assertions_count, 19);

const tstRevs = await jcall1('GET', `revisions?module_code=10&entity_id=${createdTst.item.id}`, 'revisions');
assert.ok(tstRevs.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', null, { revision_id: tstRevs.items[tstRevs.items.length - 1].id });
const afterTstRb = await jcall3('GET', 'test-coverage?q=TST-099', 'test-coverage');
assert.equal(afterTstRb.items[0].last_run_status, 'skipped');

// 5. Module 11: Bilingual Feature Documentation + Sanitization + Soft Archive + Rollback
const seededDocs = await jcall3('GET', 'docs', 'docs');
assert.ok(seededDocs.items.length >= 5);

const createdDoc = await jcall3('POST', 'docs', 'docs', null, null, {
  doc_slug: 'sample-bilingual-adr',
  domain_suite: 'Master Feature Registry',
  doc_category: 'architecture_adr',
  title_en: 'Sample Architecture ADR',
  title_or: 'ନମୁନା ସ୍ଥାପତ୍ୟ ADR',
  summary_en: 'Short summary.',
  summary_or: 'ସଂକ୍ଷିପ୍ତ ସାରାଂଶ।',
  body_markdown_en: '## Details\nSafe markdown <script>alert(1)</script> body.',
  body_markdown_or: '## ବିବରଣୀ\nସୁରକ୍ଷିତ ଓଡ଼ିଆ <script>evil()</script> ବିଷୟବସ୍ତୁ।',
  related_modules_csv: 'module-19-009..011',
  doc_status: 'published_canonical'
});
assert.equal(createdDoc.item.doc_slug, 'sample-bilingual-adr');
assert.ok(!createdDoc.item.body_markdown_en.includes('<script>'));
assert.ok(!createdDoc.item.body_markdown_or.includes('<script>'));

await jcall3('PUT', `docs/${createdDoc.item.id}`, 'docs', createdDoc.item.id, null, {
  doc_status: 'draft_review'
});
const archivedDoc = await jcall3('DELETE', `docs/${createdDoc.item.id}`, 'docs', createdDoc.item.id);
assert.equal(archivedDoc.doc_status, 'archived');

const docRevs = await jcall1('GET', `revisions?module_code=11&entity_id=${createdDoc.item.id}`, 'revisions');
assert.ok(docRevs.items.length >= 3);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', null, { revision_id: docRevs.items[docRevs.items.length - 1].id });
const afterDocRb = await jcall3('GET', 'docs?q=sample-bilingual-adr', 'docs');
assert.equal(afterDocRb.items[0].doc_status, 'published_canonical');

console.log('ALL MASTER FEATURE REGISTRY BATCH 3 (11-MODULE SUITE) TESTS PASSED');
