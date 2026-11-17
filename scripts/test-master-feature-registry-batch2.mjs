import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleMasterFeatureRegistryBatch1Admin as H1 } from '../functions/_lib/master-feature-registry-batch1.js';
import {
  ensureMasterFeatureRegistryBatch2Schema,
  getFull8ModuleRegistryOverview,
  handleMasterFeatureRegistryBatch2Admin as H2
} from '../functions/_lib/master-feature-registry-batch2.js';
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
const jcall1 = async (...a) => (await call1(...a)).json();
const jcall2 = async (...a) => (await call2(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/api-endpoints`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/api-endpoints`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/dependencies`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Ensure schema + unified 8-module overview
await ensureMasterFeatureRegistryBatch2Schema(env.DB);
const ov = await getFull8ModuleRegistryOverview(env);
assert.ok(Object.keys(ov.modules).length >= 8);
assert.equal(ov.modules['08'].status, 'active');
assert.ok(ov.verified_api_endpoints_count >= 6);
assert.ok(ov.total_suite_modules > 0);
assert.ok(ov.overall_coverage_pct >= 95 && ov.overall_coverage_pct <= 100);
assert.ok(ov.open_missing_controls_count >= 2);
assert.ok(ov.healthy_dependencies_count >= 5);

// 3. Module 05: API Endpoints + Sanitization + Status PATCH + Revision Rollback
const seededApis = await jcall2('GET', 'api-endpoints', 'api-endpoints');
assert.ok(seededApis.items.length >= 6);

const createdApi = await jcall2('POST', 'api-endpoints', 'api-endpoints', null, null, {
  endpoint_code: 'API-099',
  http_method: 'POST',
  endpoint_path: '/api/public/test<script>alert(1)</script>',
  domain_suite: 'Public Edge APIs',
  auth_guard: 'public_rate_limited',
  cache_strategy: 'no_store',
  rate_limit_tier: 'public_60_rpm'
});
assert.equal(createdApi.item.endpoint_code, 'API-099');
assert.ok(!createdApi.item.endpoint_path.includes('<script>'));

await jcall2('PUT', `api-endpoints/${createdApi.item.id}`, 'api-endpoints', createdApi.item.id, null, {
  domain_suite: 'Events & Scheduling',
  contract_status: 'needs_audit'
});
const patchedApi = await jcall2('PATCH', `api-endpoints/${createdApi.item.id}/status`, 'api-endpoints', createdApi.item.id, 'status', {
  contract_status: 'deprecated'
});
assert.equal(patchedApi.item.contract_status, 'deprecated');

const apiRevs = await jcall1('GET', `revisions?module_code=05&entity_id=${createdApi.item.id}`, 'revisions');
assert.ok(apiRevs.items.length >= 3);
const firstApiRev = apiRevs.items[apiRevs.items.length - 1];
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', null, { revision_id: firstApiRev.id });
const afterApiRb = await jcall2('GET', 'api-endpoints?q=API-099', 'api-endpoints');
assert.equal(afterApiRb.items[0].contract_status, 'verified_live');

// 4. Module 06: Admin Coverage Matrix + Recalculate
const covList = await jcall2('GET', 'coverage-matrix', 'coverage-matrix');
assert.equal(covList.items.length, 13);
assert.ok(covList.overall_coverage_pct >= 95 && covList.overall_coverage_pct <= 100);
const recalc = await jcall2('POST', 'coverage-matrix/recalculate', 'coverage-matrix', 'recalculate', null, {});
assert.equal(recalc.ok, true);
assert.equal(recalc.items.length, 13);

// 5. Module 07: Missing Admin Controls + Resolve + Revision Rollback
const gaps = await jcall2('GET', 'missing-controls?remediation_status=open_gap', 'missing-controls');
assert.ok(gaps.items.length >= 1);
const createdGap = await jcall2('POST', 'missing-controls', 'missing-controls', null, null, {
  gap_code: 'GAP-2026-099',
  surface_area: 'District Cutoff Banner',
  domain_suite: 'Candidate Portal',
  severity_tier: 'p1_high',
  gap_description_en: 'Add toggle for district cutoff banner.',
  recommended_module_target: 'module-19-009'
});
assert.equal(createdGap.item.remediation_status, 'open_gap');
const resolvedGap = await jcall2('PATCH', `missing-controls/${createdGap.item.id}/resolve`, 'missing-controls', createdGap.item.id, 'resolve', {});
assert.equal(resolvedGap.item.remediation_status, 'resolved_wired');
assert.equal(resolvedGap.item.resolved_by, 'editor@csodisha.com');

const gapRevs = await jcall1('GET', `revisions?module_code=07&entity_id=${createdGap.item.id}`, 'revisions');
assert.ok(gapRevs.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', null, { revision_id: gapRevs.items[gapRevs.items.length - 1].id });
const afterGapRb = await jcall2('GET', 'missing-controls?q=GAP-2026-099', 'missing-controls');
assert.equal(afterGapRb.items[0].remediation_status, 'open_gap');

// 6. Module 08: Feature Dependencies + 400 Cycle Detection (self-loop & 2-node cycle) + Delete
const deps = await jcall2('GET', 'dependencies', 'dependencies');
assert.ok(deps.items.length >= 5);

// Self-loop must reject with HTTP 400
await rej(
  call2('POST', 'dependencies', 'dependencies', null, null, {
    dep_code: 'DEP-LOOP',
    source_feature_code: 'FEAT-001',
    target_feature_code: 'FEAT-001'
  }),
  400
);

// Create A -> B
const depAB = await jcall2('POST', 'dependencies', 'dependencies', null, null, {
  dep_code: 'DEP-099',
  source_feature_code: 'FEAT-A',
  source_feature_name: 'Feature A',
  target_feature_code: 'FEAT-B',
  target_feature_name: 'Feature B',
  dependency_type: 'requires_d1_schema',
  is_critical_path: true
});
assert.equal(depAB.item.dep_code, 'DEP-099');

// Reverse B -> A must reject with HTTP 400 (2-node cycle)
await rej(
  call2('POST', 'dependencies', 'dependencies', null, null, {
    dep_code: 'DEP-REV',
    source_feature_code: 'FEAT-B',
    target_feature_code: 'FEAT-A'
  }),
  400
);

// Update & Delete dependency
const depUpd = await jcall2('PUT', `dependencies/${depAB.item.id}`, 'dependencies', depAB.item.id, null, {
  health_status: 'degraded_warning',
  is_critical_path: false
});
assert.equal(depUpd.item.health_status, 'degraded_warning');
assert.equal(depUpd.item.is_critical_path, 0);

const depDel = await jcall2('DELETE', `dependencies/${depAB.item.id}`, 'dependencies', depAB.item.id);
assert.equal(depDel.ok, true);

console.log('ALL MASTER FEATURE REGISTRY BATCH 2 TESTS PASSED');
