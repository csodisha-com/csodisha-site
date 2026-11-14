// Unit tests for Modules #6 (DDL Schema Journal & Fingerprint),
// #11 (Dead-Letter Message Vacuum & Retention Expiry Purge),
// #13 (Post-Incident Forensic Audit & State Diff Inspector),
// and #14 (Automated Daily Backup Schedule & Retention Policy).
// Run: node scripts/test-ops-hygiene.mjs
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createPlatformSnapshot } from '../functions/_lib/ops-snapshots.js';
import {
  inspectDatabaseSchema,
  runDeadLetterVacuum,
  computeForensicDiff,
  inspectForensicAudit,
  saveBackupRetentionPolicy,
  runScheduledBackupPolicy
} from '../functions/_lib/ops-hygiene.js';

function makeD1() {
  const db = new DatabaseSync(':memory:');
  const nowSec = Math.floor(Date.now() / 1000);
  db.exec(`
    CREATE TABLE site_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE site_pages (id INTEGER PRIMARY KEY, route TEXT, title TEXT, status TEXT);
    CREATE TABLE site_page_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, route TEXT NOT NULL, snapshot_json TEXT NOT NULL, editor_email TEXT, note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE posts (id TEXT PRIMARY KEY, type TEXT, slug TEXT, title TEXT, status TEXT, deleted_at TEXT);
    CREATE TABLE schemes_directory (id TEXT PRIMARY KEY, slug TEXT, title TEXT, status TEXT);
    CREATE TABLE resources (id TEXT PRIMARY KEY, kind TEXT, title TEXT, status TEXT);
    CREATE TABLE media_assets (id TEXT PRIMARY KEY, object_key TEXT, kind TEXT, mime_type TEXT, size_bytes INTEGER, original_name TEXT, uploaded_by TEXT, created_at TEXT, deleted_at TEXT);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, salt TEXT, role TEXT, failed_attempts INTEGER, lockout_until INTEGER, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE admin_otps (user_id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE index idx_posts_slug ON posts(slug);
  `);

  // Seed baseline users, sessions, OTPs, rate limits
  db.prepare(`INSERT INTO users VALUES ('u-1', 'admin@csodisha.com', 'hash', 'salt', 'admin', 0, 0, ?, ?)`).run(nowSec, nowSec);
  // 1 expired session + 1 active session
  db.prepare(`INSERT INTO sessions VALUES ('tok-expired', 'u-1', 'admin@csodisha.com', 'admin', ?, ?)`).run(nowSec - 7200, nowSec - 60);
  db.prepare(`INSERT INTO sessions VALUES ('tok-active', 'u-1', 'admin@csodisha.com', 'admin', ?, ?)`).run(nowSec, nowSec + 86400);
  // 1 expired OTP + 1 active OTP
  db.prepare(`INSERT INTO admin_otps VALUES ('u-expired', 'h1', ?, 0, ?)`).run(nowSec - 300, nowSec - 900);
  db.prepare(`INSERT INTO admin_otps VALUES ('u-active', 'h2', ?, 0, ?)`).run(nowSec + 600, nowSec);
  // 1 stale rate limit (>24h old) + 1 fresh rate limit
  db.prepare(`INSERT INTO admin_rate_limits VALUES ('rl-stale', ?, 5)`).run(nowSec - 90000);
  db.prepare(`INSERT INTO admin_rate_limits VALUES ('rl-fresh', ?, 2)`).run(nowSec - 60);

  // Seed 28 revisions for route '/' (keepNewest=25 -> 3 excess revisions)
  for (let i = 1; i <= 28; i++) {
    db.prepare(`INSERT INTO site_page_revisions (route, snapshot_json, editor_email, note) VALUES ('/', ?, 'admin@csodisha.com', ?)`).run(
      JSON.stringify({ rev: i }),
      'Revision #' + i
    );
  }

  // Seed forensic audit_log rows with before/after JSON diffs
  db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata_json, ip_address)
     VALUES ('u-1', 'post.update', 'posts', 'job-1', ?, '127.0.0.1')`
  ).run(JSON.stringify({
    before: { title: 'OPSC OAS 2025', vacancies: 200, status: 'draft', legacy_tag: 'old' },
    after: { title: 'OPSC OAS 2026', vacancies: 200, status: 'published', apply_url: 'https://opsc.gov.in' }
  }));

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
  const store = new Map();
  return {
    store,
    async put(key, bytes, opts = {}) {
      const u8 = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new TextEncoder().encode(String(bytes));
      store.set(key, { bytes: u8, customMetadata: opts.customMetadata || {} });
    },
    async head(key) {
      const item = store.get(key);
      return item ? { key, size: item.bytes.byteLength, customMetadata: item.customMetadata } : null;
    },
    async get(key) {
      const item = store.get(key);
      if (!item) return null;
      return {
        key,
        size: item.bytes.byteLength,
        body: item.bytes,
        async arrayBuffer() {
          return item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength);
        }
      };
    },
    async delete(key) {
      return store.delete(key);
    }
  };
}

const env = { DB: makeD1(), MEDIA: makeR2() };

// 1. Module #6: Database Migration Version & DDL Schema Journal
const schema1 = await inspectDatabaseSchema(env);
assert.equal(schema1.ok, true);
assert.match(schema1.schema_sha256, /^[0-9a-f]{64}$/);
assert.ok(schema1.table_count >= 12);
assert.equal(schema1.index_count, 1);
assert.equal(schema1.migrations.length, 12);
const revTableMeta = schema1.tables.find(t => t.name === 'site_page_revisions');
assert.ok(revTableMeta, 'site_page_revisions must appear in DDL journal');
assert.equal(revTableMeta.row_count, 28);
assert.match(revTableMeta.ddl_sql, /CREATE TABLE site_page_revisions/i);

// Drift check: adding a table changes schema_sha256 immediately
env.DB.db.exec(`CREATE TABLE schema_drift_probe (id TEXT PRIMARY KEY);`);
const schema2 = await inspectDatabaseSchema(env);
assert.notEqual(schema2.schema_sha256, schema1.schema_sha256, 'schema SHA-256 must change when DDL changes');
env.DB.db.exec(`DROP TABLE schema_drift_probe;`);
const schema3 = await inspectDatabaseSchema(env);
assert.equal(schema3.schema_sha256, schema1.schema_sha256, 'schema SHA-256 must be deterministic when restored');

// 2. Module #11: Dead-Letter Message Vacuum & Retention Expiry Purge
// 2a. Dry-Run Preview
const dryVac = await runDeadLetterVacuum(env, { dryRun: true, trimRevisions: true, revisionKeepLimit: 25 });
assert.equal(dryVac.ok, true);
assert.equal(dryVac.dry_run, true);
assert.equal(dryVac.tables.admin_otps, 1);
assert.equal(dryVac.tables.sessions, 1);
assert.equal(dryVac.tables.admin_rate_limits, 1);
assert.equal(dryVac.tables.site_page_revisions, 3);
assert.equal(dryVac.total_reclaimed, 6);

// Confirm dry-run did not delete rows
const revCountAfterDry = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM site_page_revisions`).first()).n;
assert.equal(revCountAfterDry, 28, 'dry_run vacuum must not delete rows');

// 2b. Live Purge Execution
const liveVac = await runDeadLetterVacuum(env, { dryRun: false, trimRevisions: true, revisionKeepLimit: 25 });
assert.equal(liveVac.ok, true);
assert.equal(liveVac.dry_run, false);
assert.equal(liveVac.total_reclaimed, 6);
assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_otps`).first()).n, 1);
assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM sessions`).first()).n, 1);
assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_rate_limits`).first()).n, 1);
assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM site_page_revisions`).first()).n, 25);

// Verify newest 25 revisions (ids 4..28) were kept and oldest 3 (ids 1..3) purged
const minRevRow = await env.DB.prepare(`SELECT MIN(id) AS min_id, MAX(id) AS max_id FROM site_page_revisions`).first();
assert.equal(minRevRow.min_id, 4);
assert.equal(minRevRow.max_id, 28);

// 3. Module #13: Post-Incident Forensic Audit & State Diff Inspector
const forensics = await inspectForensicAudit(env, { actionFilter: 'post.', actorFilter: 'admin@csodisha.com' });
assert.equal(forensics.ok, true);
assert.equal(forensics.total, 1);
const entry = forensics.items[0];
assert.equal(entry.action, 'post.update');
assert.equal(entry.diff.has_state_diff, true);
assert.equal(entry.diff.unchanged_count, 1); // vacancies: 200
assert.deepEqual(entry.diff.added, [{ field: 'apply_url', after: 'https://opsc.gov.in' }]);
assert.deepEqual(entry.diff.removed, [{ field: 'legacy_tag', before: 'old' }]);
assert.equal(entry.diff.modified.length, 2); // status & title

// 4. Module #14: Automated Daily Backup Schedule & Retention Policy
// Create 1 manual snapshot (must never be auto-pruned) and 2 scheduled snapshots
const manualSnap = await createPlatformSnapshot(env, { label: 'Manual Golden Backup', triggerType: 'manual', createdBy: 'admin@csodisha.com' });
await createPlatformSnapshot(env, { label: 'Scheduled #1', triggerType: 'scheduled', createdBy: 'system:cron' });
await createPlatformSnapshot(env, { label: 'Scheduled #2', triggerType: 'scheduled', createdBy: 'system:cron' });

// Configure policy to retain at most 2 scheduled snapshots
await saveBackupRetentionPolicy(env, {
  enabled: true,
  interval_hours: 6,
  max_snapshots: 2,
  max_age_days: 30
}, 'admin@csodisha.com');

// Execute scheduled backup policy (creates Scheduled #3 and prunes oldest scheduled snapshot so only 2 scheduled remain)
const policyRun = await runScheduledBackupPolicy(env, { force: true, actorEmail: 'system:cron' });
assert.equal(policyRun.ok, true);
assert.equal(policyRun.skipped, false);
assert.ok(policyRun.created_snapshot && policyRun.created_snapshot.id);
assert.equal(policyRun.pruned_count, 1, 'oldest scheduled snapshot exceeding max_snapshots=2 must be pruned');

// Verify manual snapshot is still intact in D1 and R2, and scheduled count is exactly 2
const remainingManual = await env.DB.prepare(`SELECT id FROM ops_snapshots WHERE id = ?`).bind(manualSnap.id).first();
assert.ok(remainingManual, 'manual snapshot must never be deleted by retention pruning');
assert.ok(env.MEDIA.store.has(manualSnap.r2_key), 'manual snapshot R2 object must remain intact');

const remainingScheduled = (await env.DB.prepare(`SELECT id FROM ops_snapshots WHERE trigger_type = 'scheduled'`).all()).results;
assert.equal(remainingScheduled.length, 2, 'exactly max_snapshots=2 scheduled snapshots must remain');

console.log('OPS SCHEMA JOURNAL, VACUUM, FORENSICS & RETENTION POLICY TESTS PASSED');
