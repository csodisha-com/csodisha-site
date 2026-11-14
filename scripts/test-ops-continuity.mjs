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
assert.equal(rep1.routing_policy.mode, 'read_replica_preferred');
assert.equal(rep1.telemetry.edge_colo, 'BOM');
assert.ok(rep1.telemetry.page_size > 0);
assert.ok(rep1.telemetry.read_latency_ms >= 1);
assert.ok(rep1.telemetry.write_latency_ms >= 1);

const savedPolicy = await saveD1RoutingPolicy(env, {
  mode: 'primary_only',
  failover_threshold_ms: 150,
  auto_switchover: true
}, 'admin@csodisha.com');
assert.equal(savedPolicy.mode, 'primary_only');
assert.equal(savedPolicy.failover_threshold_ms, 150);

const readBackPolicy = await getD1RoutingPolicy(env);
assert.equal(readBackPolicy.mode, 'primary_only');
assert.equal(readBackPolicy.failover_threshold_ms, 150);

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
assert.equal(bundle.manifest.bundle_version, 'v27');
assert.equal(bundle.manifest.edge_colo, 'BOM');
assert.match(bundle.manifest.schema_sha256, /^[0-9a-f]{64}$/);
assert.match(bundle.manifest.payload_sha256, /^[0-9a-f]{64}$/);
assert.equal(bundle.manifest.runbook_count, 5);

// Verify cryptographic signature over bundle.payload matches manifest.payload_sha256
const recomputedSha = await computeSnapshotChecksum(bundle.payload);
assert.equal(recomputedSha, bundle.manifest.payload_sha256, 'bundle payload SHA-256 signature must verify');

// Verify HTTP download response headers and credential exclusion
const adminActor = { userId: 'u-1', email: 'admin@csodisha.com', role: 'admin' };
const dlRes = await handleOpsContinuity(
  new Request('https://csodisha.com/api/admin/ops/airgap-bundle', { method: 'GET' }),
  env,
  adminActor,
  'airgap-bundle'
);
assert.equal(dlRes.status, 200);
assert.match(dlRes.headers.get('Content-Disposition') || '', /attachment; filename="cso-airgap-bundle-.*\.cso-bundle\.json"/);
assert.equal(dlRes.headers.get('X-Airgap-Payload-SHA256'), bundle.manifest.payload_sha256);
const rawBundleText = await dlRes.text();
assert.ok(!rawBundleText.includes('TOP_SECRET_PASSWORD_HASH'), 'air-gapped bundle must never include password_hash');
assert.ok(!rawBundleText.includes('TOP_SECRET_SALT'), 'air-gapped bundle must never include salt');
assert.ok(rawBundleText.includes('SOP-05: R2 Regional Cold-Vault Failover Drill'), 'air-gapped bundle must include SOP runbooks');

console.log('OPS CONTINUITY, AIR-GAP BUNDLE & DR RUNBOOK TESTS PASSED');
