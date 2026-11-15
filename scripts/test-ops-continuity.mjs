// Unit tests for Modules #4 (Cloudflare D1 Distributed Replica Switchover),
// #8 (Offline Air-Gapped Manifest & Signed Bundle Packager),
// and #16 (Disaster Recovery Playbook, SOP & Runbook Studio).
// Run: node scripts/test-ops-continuity.mjs
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { computeSnapshotChecksum } from '../functions/_lib/ops-snapshots.js';
import {
  inspectD1ReplicaTelemetry,
  saveD1RoutingPolicy,
  getD1RoutingPolicy,
  listOpsRunbooks,
  saveOpsRunbook,
  markRunbookDrillCompleted,
  buildAirGappedBundle,
  handleOpsContinuity
} from '../functions/_lib/ops-continuity.js';

function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE site_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE site_pages (id INTEGER PRIMARY KEY, route TEXT, title TEXT, meta_description TEXT, category TEXT, hero_title TEXT, hero_subtitle TEXT, cta_label TEXT, cta_url TEXT, blocks_json TEXT, reusable_sections_json TEXT, status TEXT, publish_at TEXT, created_by TEXT, updated_by TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE site_page_revisions (id INTEGER PRIMARY KEY, route TEXT, snapshot_json TEXT, editor_email TEXT, note TEXT, created_at TEXT);
    CREATE TABLE posts (id TEXT PRIMARY KEY, type TEXT, slug TEXT, title TEXT, title_or TEXT, summary TEXT, summary_or TEXT, body_md TEXT, body_md_or TEXT, category TEXT, tags TEXT, goal_exam_ids TEXT, cover_media_key TEXT, event_date TEXT, organisation TEXT, vacancies INTEGER, qualification TEXT, last_date TEXT, apply_url TEXT, notification_media_key TEXT, state TEXT, age_limit TEXT, salary_pay TEXT, source_url TEXT, status TEXT, published_at TEXT, created_by TEXT, updated_by TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT);
    CREATE TABLE schemes_directory (id TEXT PRIMARY KEY, slug TEXT, title TEXT, status TEXT);
    CREATE TABLE resources (id TEXT PRIMARY KEY, kind TEXT, title TEXT, status TEXT);
    CREATE TABLE media_assets (id TEXT PRIMARY KEY, object_key TEXT, kind TEXT, mime_type TEXT, size_bytes INTEGER, original_name TEXT, uploaded_by TEXT, created_at TEXT, deleted_at TEXT);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, salt TEXT, role TEXT, failed_attempts INTEGER, lockout_until INTEGER, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO posts (id, type, slug, title, status) VALUES ('job-1', 'job', 'opsc-oas-2026', 'OPSC Civil Services', 'published');
    INSERT INTO schemes_directory VALUES ('sch-1', 'subhadra-yojana', 'Subhadra Yojana', 'published');
    INSERT INTO users VALUES ('u-1', 'admin@csodisha.com', 'TOP_SECRET_PASSWORD_HASH', 'TOP_SECRET_SALT', 'admin', 0, 0, 1700000000, 1700000000);
  `);

  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) || [] })
  });
  return { db, prepare: s => stmt(s) };
}

function makeR2() {
  return {
    async head() { return null; }
  };
}

const env = { DB: makeD1(), MEDIA: makeR2() };
const req = new Request('https://csodisha.com/api/admin/ops/replica', { method: 'GET' });
Object.defineProperty(req, 'cf', {
  value: { colo: 'BOM', country: 'IN', region: 'Maharashtra' }
});

// 1. Module #4: Cloudflare D1 Distributed Replica Telemetry & Routing Policy
const rep1 = await inspectD1ReplicaTelemetry(req, env);
assert.equal(rep1.ok, true);
assert.equal(rep1.routing_policy.mode, 'auto_edge_replica');
assert.equal(rep1.routing_policy.region, 'APAC');
assert.equal(rep1.telemetry.edge_colo, 'BOM');
assert.ok(rep1.telemetry.table_count >= 8);
assert.ok(rep1.telemetry.page_size > 0);
assert.ok(rep1.telemetry.read_latency_ms >= 1);
assert.ok(rep1.telemetry.write_latency_ms >= 1);

const savedPolicy = await saveD1RoutingPolicy(env, {
  mode: 'primary_only',
  region: 'APAC',
  failover_threshold_ms: 150,
  auto_switchover: true
}, 'admin@csodisha.com');
assert.equal(savedPolicy.mode, 'primary_only');
assert.equal(savedPolicy.failover_threshold_ms, 150);

const readBackPolicy = await getD1RoutingPolicy(env);
assert.equal(readBackPolicy.mode, 'primary_only');
assert.equal(readBackPolicy.failover_threshold_ms, 150);

// 1b. Module #4 HTTP handler: dry_run preview, 400 invalid mode/region, SWITCHOVER guard, site_settings & audit_log
const adminActor = { userId: 'u-1', email: 'admin@csodisha.com', role: 'admin' };

// Dry-run preview must NOT mutate site_settings
const dryRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/replica-switchover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'pinned_region', region: 'WEUR', dry_run: true })
  }),
  env,
  adminActor,
  'replica-switchover'
);
assert.equal(dryRes.status, 200);
const dryBody = await dryRes.json();
assert.equal(dryBody.dry_run, true);
assert.equal(dryBody.preview.proposed_mode, 'pinned_region');
assert.equal(dryBody.preview.proposed_region, 'WEUR');
assert.equal((await getD1RoutingPolicy(env)).mode, 'primary_only', 'dry_run must not mutate live mode');

// Reject invalid mode (400) and invalid region (400)
await assert.rejects(
  () => handleOpsContinuity(
    new Request('https://csodisha.com/api/admin/ops/replica-switchover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'bad_mode', region: 'APAC', confirm: 'SWITCHOVER' })
    }),
    env,
    adminActor,
    'replica-switchover'
  ),
  err => err && err.status === 400 && err.code === 'INVALID_ROUTING_MODE'
);

await assert.rejects(
  () => handleOpsContinuity(
    new Request('https://csodisha.com/api/admin/ops/replica-switchover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'pinned_region', region: 'MARS', confirm: 'SWITCHOVER' })
    }),
    env,
    adminActor,
    'replica-switchover'
  ),
  err => err && err.status === 400 && err.code === 'INVALID_REGION_HINT'
);

// Reject missing SWITCHOVER confirmation (400)
await assert.rejects(
  () => handleOpsContinuity(
    new Request('https://csodisha.com/api/admin/ops/replica-switchover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'pinned_region', region: 'WEUR', confirm: 'YES' })
    }),
    env,
    adminActor,
    'replica-switchover'
  ),
  err => err && err.status === 400 && err.code === 'CONFIRMATION_REQUIRED'
);

// Commit live switchover with SWITCHOVER confirmation -> persists site_settings & audit_log
const switchRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/replica-switchover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'pinned_region', region: 'WEUR', failover_threshold_ms: 200, confirm: 'SWITCHOVER' })
  }),
  env,
  adminActor,
  'replica-switchover'
);
assert.equal(switchRes.status, 200);
const switchBody = await switchRes.json();
assert.equal(switchBody.switched, true);
assert.equal(switchBody.routing_policy.mode, 'pinned_region');
assert.equal(switchBody.routing_policy.region, 'WEUR');
assert.ok(Array.isArray(switchBody.switchover_history) && switchBody.switchover_history.length >= 1);
assert.equal(switchBody.switchover_history[0].previous_mode, 'primary_only');
assert.equal(switchBody.switchover_history[0].new_mode, 'pinned_region');

const modeSetting = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'ops_d1_replica_mode'`).first();
assert.equal(JSON.parse(modeSetting.value_json), 'pinned_region');
const regionSetting = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'ops_d1_replica_region'`).first();
assert.equal(JSON.parse(regionSetting.value_json), 'WEUR');
const lastSwSetting = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'ops_d1_replica_last_switchover'`).first();
assert.equal(JSON.parse(lastSwSetting.value_json).new_mode, 'pinned_region');
const auditRow = await env.DB.prepare(`SELECT action, metadata_json FROM audit_log WHERE action = 'ops.replica.switchover' ORDER BY id DESC LIMIT 1`).first();
assert.ok(auditRow && auditRow.action === 'ops.replica.switchover');

// 2. Module #16: Disaster Recovery Playbook, SOP & Runbook Studio
const seededRunbooks = await listOpsRunbooks(env);
assert.equal(seededRunbooks.ok, true);
assert.equal(seededRunbooks.total, 4, '4 default DR SOP runbooks must be auto-seeded');
assert.deepEqual(
  seededRunbooks.items.map(r => r.id),
  ['SOP-01', 'SOP-02', 'SOP-03', 'SOP-04']
);

// Create a custom SOP-05 runbook
const customRb = await saveOpsRunbook(env, {
  id: 'SOP-05',
  title: 'SOP-05: R2 Regional Cold-Vault Failover Drill',
  severity: 'HIGH',
  rto_minutes: 10,
  rpo_minutes: 30,
  steps: [
    'Verify latest R2 snapshot SHA-256 checksum in Module #10.',
    'Download signed air-gapped DR bundle in Module #8.'
  ]
}, 'admin@csodisha.com');
assert.equal(customRb.id, 'SOP-05');
assert.equal(customRb.steps.length, 2);
assert.equal(customRb.last_drilled_at, null);

// Mark SOP-01 drill completed
const drilledRb = await markRunbookDrillCompleted(env, 'SOP-01', { actorEmail: 'admin@csodisha.com' });
assert.equal(drilledRb.id, 'SOP-01');
assert.ok(drilledRb.last_drilled_at, 'last_drilled_at must be set when drill is marked completed');
assert.ok(drilledRb.steps.every(s => s.done === true), 'all steps must be marked done after drill completion');

// 3. Module #8: Offline Air-Gapped Manifest & Signed Bundle Packager
const bundle = await buildAirGappedBundle(req, env, { actorEmail: 'admin@csodisha.com' });
assert.equal(bundle.manifest.bundle_format, 'cso.airgap.dr.bundle.v1');
assert.equal(bundle.manifest.bundle_version, 'v35');
assert.equal(bundle.manifest.dpdp_scrubbed, true);
assert.equal(bundle.manifest.edge_colo, 'BOM');
assert.match(bundle.manifest.schema_sha256, /^[0-9a-f]{64}$/);
assert.match(bundle.manifest.payload_sha256, /^[0-9a-f]{64}$/);
assert.equal(bundle.manifest.runbook_count, 5);

// Verify cryptographic signature over bundle.payload matches manifest.payload_sha256
const recomputedSha = await computeSnapshotChecksum(bundle.payload);
assert.equal(recomputedSha, bundle.manifest.payload_sha256, 'bundle payload SHA-256 signature must verify');

// Verify HTTP POST export with core scope & verify endpoint
const postBundleRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/airgap-bundle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: 'core' })
  }),
  env,
  adminActor,
  'airgap-bundle'
);
assert.equal(postBundleRes.status, 200);
const postBundleJson = await postBundleRes.json();
assert.equal(postBundleJson.manifest.scope, 'core');

const verifyValidRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/airgap-bundle/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bundle: postBundleJson })
  }),
  env,
  adminActor,
  'airgap-bundle',
  'verify'
);
assert.equal(verifyValidRes.status, 200);
const verifyValidBody = await verifyValidRes.json();
assert.equal(verifyValidBody.valid, true);
assert.equal(verifyValidBody.signature_match, true);
assert.equal(verifyValidBody.dpdp_compliant, true);

// Tampered payload must fail signature verification
const tamperedBundle = JSON.parse(JSON.stringify(postBundleJson));
tamperedBundle.payload.table_count = 9999;
const verifyTamperedRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/airgap-bundle/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bundle: tamperedBundle })
  }),
  env,
  adminActor,
  'airgap-bundle',
  'verify'
);
const verifyTamperedBody = await verifyTamperedRes.json();
assert.equal(verifyTamperedBody.valid, false);
assert.equal(verifyTamperedBody.signature_match, false);

// Verify HTTP download response headers and credential exclusion
const dlRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/airgap-bundle', { method: 'GET' }),
  env,
  adminActor,
  'airgap-bundle'
);
assert.equal(dlRes.status, 200);
assert.match(dlRes.headers.get('Content-Disposition') || '', /attachment; filename="cso-airgap-bundle-.*\.cso-bundle\.json"/);
const rawBundleText = await dlRes.text();
const dlParsed = JSON.parse(rawBundleText);
assert.equal(dlRes.headers.get('X-Airgap-Payload-SHA256'), dlParsed.manifest.payload_sha256);
assert.ok(!rawBundleText.includes('TOP_SECRET_PASSWORD_HASH'), 'air-gapped bundle must never include password_hash');
assert.ok(!rawBundleText.includes('TOP_SECRET_SALT'), 'air-gapped bundle must never include salt');
assert.ok(rawBundleText.includes('SOP-05: R2 Regional Cold-Vault Failover Drill'), 'air-gapped bundle must include SOP runbooks');

// 4. Module #16: Disaster Recovery Playbook & Automated Runbook SOPs
const sopActor = { userId: 'u-sop-admin', email: 'admin@csodisha.com', role: 'admin' };
const editorActor = { userId: 'u-sop-ed', email: 'ed@csodisha.com', role: 'editor' };

// Non-admin blocked from creating/completing SOPs
await assert.rejects(
  () => handleOpsContinuity(
    new Request('https://csodisha.com/api/admin/ops/runbooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized SOP', steps: ['step 1'] })
    }),
    env, editorActor, 'runbooks'
  ),
  err => err.status === 403
);

// Create custom P1-CRITICAL SOP
const createSopRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/runbooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'sop-p1-d1-split-brain',
      title: 'SOP-P1: D1 Primary Split-Brain Recovery',
      severity: 'P1-CRITICAL',
      rto_minutes: 10,
      rpo_minutes: 0,
      steps: ['Activate Emergency Read-Only Freeze', 'Verify R2 immutable snapshot SHA-256', 'Run Canary Gate before unfreeze']
    })
  }),
  env, sopActor, 'runbooks'
);
assert.equal(createSopRes.status, 200);
const createSopBody = await createSopRes.json();
assert.equal(createSopBody.ok, true);
assert.equal(createSopBody.item.severity, 'P1-CRITICAL');
assert.equal(createSopBody.item.slug, 'sop-p1-d1-split-brain');
assert.equal(createSopBody.item.rto_minutes, 10);
assert.equal(createSopBody.item.steps.length, 3);
const sopId = createSopBody.item.id;

// Inline-edit SOP via PUT /api/admin/ops/runbooks/:id
const updateSopRes = await handleOpsContinuity(
  new Request(`https://csodisha.com/api/admin/ops/runbooks/${sopId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'SOP-P1: D1 Primary Split-Brain Recovery (Hardened)',
      severity: 'P1-CRITICAL',
      rto_minutes: 8,
      rpo_minutes: 5,
      steps: ['Freeze writes', 'Verify R2 snapshot', 'Execute restore', 'Verify Canary Gate']
    })
  }),
  env, sopActor, 'runbooks', sopId
);
assert.equal(updateSopRes.status, 200);
const updateSopBody = await updateSopRes.json();
assert.equal(updateSopBody.item.rto_minutes, 8);
assert.equal(updateSopBody.item.steps.length, 4);

// Sign off execution drill via POST /api/admin/ops/runbooks/:id/complete
const completeSopRes = await handleOpsContinuity(
  new Request(`https://csodisha.com/api/admin/ops/runbooks/${sopId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operator_notes: 'Completed live failover table-top drill in 6m15s.' })
  }),
  env, sopActor, 'runbooks', sopId, 'complete'
);
assert.equal(completeSopRes.status, 200);
const completeSopBody = await completeSopRes.json();
assert.equal(completeSopBody.ok, true);
assert.ok(completeSopBody.item.last_executed_at, 'last_executed_at must be populated');
assert.equal(completeSopBody.item.last_executed_by, 'admin@csodisha.com');
assert.equal(completeSopBody.item.operator_notes, 'Completed live failover table-top drill in 6m15s.');
assert.ok((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'ops.runbook.execute'`).first()).n >= 1);

console.log('OPS CONTINUITY, AIR-GAP BUNDLE & DR RUNBOOK TESTS PASSED');
