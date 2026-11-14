// Unit tests for the Operations Platform Snapshot Engine, R2 Cold Vault & SHA-256 Integrity Verifier.
// Run: node scripts/test-ops-snapshots.mjs
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  canonicalizeValue,
  serializeCanonicalSnapshot,
  computeSnapshotChecksum,
  createPlatformSnapshot,
  listPlatformSnapshots,
  verifyPlatformSnapshot,
  downloadPlatformSnapshot,
  runDisasterRecoveryDrill,
  restorePlatformSnapshot
} from '../functions/_lib/ops-snapshots.js';

function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE site_settings (key TEXT PRIMARY KEY, value_json TEXT, updated_by TEXT, updated_at TEXT);
    CREATE TABLE site_pages (id INTEGER PRIMARY KEY, route TEXT, title TEXT, meta_description TEXT, category TEXT, hero_title TEXT, hero_subtitle TEXT, cta_label TEXT, cta_url TEXT, blocks_json TEXT, reusable_sections_json TEXT, status TEXT, publish_at TEXT, created_by TEXT, updated_by TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE site_page_revisions (id INTEGER PRIMARY KEY, route TEXT, snapshot_json TEXT, editor_email TEXT, note TEXT, created_at TEXT);
    CREATE TABLE posts (id TEXT PRIMARY KEY, type TEXT, slug TEXT, title TEXT, title_or TEXT, summary TEXT, summary_or TEXT, body_md TEXT, body_md_or TEXT, category TEXT, tags TEXT, goal_exam_ids TEXT, cover_media_key TEXT, event_date TEXT, organisation TEXT, vacancies INTEGER, qualification TEXT, last_date TEXT, apply_url TEXT, notification_media_key TEXT, state TEXT, age_limit TEXT, salary_pay TEXT, source_url TEXT, status TEXT, published_at TEXT, created_by TEXT, updated_by TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT);
    CREATE TABLE schemes_directory (id TEXT PRIMARY KEY, slug TEXT, title TEXT, status TEXT);
    CREATE TABLE resources (id TEXT PRIMARY KEY, kind TEXT, title TEXT, status TEXT);
    CREATE TABLE media_assets (id TEXT PRIMARY KEY, object_key TEXT, kind TEXT, mime_type TEXT, size_bytes INTEGER, original_name TEXT, uploaded_by TEXT, created_at TEXT, deleted_at TEXT);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, salt TEXT, role TEXT, failed_attempts INTEGER, lockout_until INTEGER, created_at INTEGER, updated_at INTEGER);
    INSERT INTO site_settings VALUES ('homepage_banner', '{"active":true}', 'admin-1', '2026-11-14');
    INSERT INTO posts (id, type, slug, title, status) VALUES ('job-1', 'job', 'opsc-oas-2026', 'OPSC Civil Services', 'published');
    INSERT INTO schemes_directory VALUES ('sch-1', 'subhadra-yojana', 'Subhadra Yojana', 'published');
    INSERT INTO users VALUES ('u-1', 'admin@csodisha.com', 'SECRET_HASH_DO_NOT_EXPORT', 'SECRET_SALT_DO_NOT_EXPORT', 'admin', 0, 0, 1700000000, 1700000000);
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
  const store = new Map();
  return {
    store,
    async put(key, bytes, opts = {}) {
      const u8 = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new TextEncoder().encode(String(bytes));
      store.set(key, {
        bytes: u8,
        httpMetadata: opts.httpMetadata || {},
        customMetadata: opts.customMetadata || {}
      });
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
        customMetadata: item.customMetadata,
        httpMetadata: item.httpMetadata,
        body: item.bytes,
        async arrayBuffer() {
          return item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength);
        }
      };
    }
  };
}

// 1. Deterministic canonical JSON & SHA-256 hashing regardless of key insertion order
const objA = { b: 2, a: 1, nested: { z: 'last', a: 'first', list: [{ y: 2, x: 1 }] } };
const objB = { nested: { list: [{ x: 1, y: 2 }], a: 'first', z: 'last' }, a: 1, b: 2 };
assert.equal(serializeCanonicalSnapshot(objA), serializeCanonicalSnapshot(objB), 'canonical JSON must match regardless of key order');
const hashA = await computeSnapshotChecksum(objA);
const hashB = await computeSnapshotChecksum(objB);
assert.equal(hashA, hashB, 'SHA-256 checksum must be deterministic');
assert.match(hashA, /^[0-9a-f]{64}$/);

// 2. Create snapshot -> R2 storage + D1 ops_snapshots + password_hash exclusion
const env = { DB: makeD1(), MEDIA: makeR2() };
const snap = await createPlatformSnapshot(env, { label: 'Pre-v27 Baseline', triggerType: 'manual', createdBy: 'admin@csodisha.com' });
assert.equal(snap.label, 'Pre-v27 Baseline');
assert.match(snap.r2_key, /^backups\/snapshots\/.+\.json$/);
assert.match(snap.sha256, /^[0-9a-f]{64}$/);
assert.equal(snap.total_rows, 4);
assert.equal(snap.row_counts.posts, 1);
assert.equal(snap.row_counts.schemes_directory, 1);
assert.equal(snap.row_counts.users, 1);

// Verify raw R2 payload excludes sensitive password hashes & salts
const rawObj = await env.MEDIA.get(snap.r2_key);
const rawText = new TextDecoder().decode(new Uint8Array(await rawObj.arrayBuffer()));
assert.ok(!rawText.includes('SECRET_HASH_DO_NOT_EXPORT'), 'password_hash must never be exported in snapshots');
assert.ok(!rawText.includes('SECRET_SALT_DO_NOT_EXPORT'), 'salt must never be exported in snapshots');
assert.ok(rawText.includes('admin@csodisha.com'), 'safe user metadata is included');

// 3. List snapshots
const listed = await listPlatformSnapshots(env);
assert.equal(listed.total, 1);
assert.equal(listed.items[0].id, snap.id);
assert.equal(listed.items[0].r2_exists, true);

// 4. Verify integrity (untampered -> valid: true)
const verOk = await verifyPlatformSnapshot(env, snap.id);
assert.equal(verOk.valid, true);
assert.equal(verOk.expected_sha256, snap.sha256);
assert.equal(verOk.actual_sha256, snap.sha256);

// 5. Download snapshot response headers & content
const dlRes = await downloadPlatformSnapshot(env, snap.id);
assert.equal(dlRes.status, 200);
assert.match(dlRes.headers.get('Content-Disposition') || '', /attachment; filename="cso-snapshot-/);
assert.equal(dlRes.headers.get('X-Snapshot-SHA256'), snap.sha256);
assert.equal(await dlRes.text(), rawText);

// 6. Tamper detection: mutate 1 byte in R2 object -> verifyPlatformSnapshot returns valid: false
const stored = env.MEDIA.store.get(snap.r2_key);
const tampered = new TextEncoder().encode(rawText.replace('Subhadra Yojana', 'Tampered Scheme'));
stored.bytes = tampered;
const verBad = await verifyPlatformSnapshot(env, snap.id);
assert.equal(verBad.valid, false, 'tampered R2 snapshot must fail SHA-256 verification');
assert.equal(verBad.expected_sha256, snap.sha256);
assert.notEqual(verBad.actual_sha256, snap.sha256);

// Tampered snapshot must also abort DR drill
await assert.rejects(
  () => runDisasterRecoveryDrill(env, snap.id),
  err => err && err.code === 'CHECKSUM_MISMATCH',
  'DR drill must abort when R2 snapshot fails SHA-256 verification'
);

// Restore untampered bytes in R2 for Module #2 & #3 tests
stored.bytes = new TextEncoder().encode(rawText);

// 7. Module #2: Non-Destructive Disaster Recovery Drill
// Mutate live D1 to create drift vs the baseline snapshot:
// - Modify 'job-1' in posts (to_update: 1)
// - Insert 'job-2' in posts (live_only_rows: 1)
// - Delete 'sch-1' in schemes_directory (to_insert: 1)
env.DB.db.exec(`
  UPDATE posts SET title = 'Modified After Snapshot' WHERE id = 'job-1';
  INSERT INTO posts (id, type, slug, title, status) VALUES ('job-2', 'job', 'ossc-cgl-2026', 'OSSC CGL 2026', 'published');
  DELETE FROM schemes_directory WHERE id = 'sch-1';
`);

const drillReport = await runDisasterRecoveryDrill(env, snap.id);
assert.equal(drillReport.ok, true);
assert.equal(drillReport.readiness, 'PASS');
assert.equal(drillReport.sha256_verified, true);
assert.equal(drillReport.table_diffs.posts.snapshot_rows, 1);
assert.equal(drillReport.table_diffs.posts.live_rows, 2);
assert.equal(drillReport.table_diffs.posts.to_insert, 0);
assert.equal(drillReport.table_diffs.posts.to_update, 1);
assert.equal(drillReport.table_diffs.posts.live_only_rows, 1);
assert.equal(drillReport.table_diffs.schemes_directory.snapshot_rows, 1);
assert.equal(drillReport.table_diffs.schemes_directory.live_rows, 0);
assert.equal(drillReport.table_diffs.schemes_directory.to_insert, 1);
assert.equal(drillReport.totals.to_insert, 1);
assert.equal(drillReport.totals.to_update, 1);
assert.equal(drillReport.totals.live_only_rows, 1);

// Confirm DR drill is strictly non-destructive (live D1 unchanged)
const postAfterDrill = await env.DB.prepare(`SELECT title FROM posts WHERE id = 'job-1'`).first();
assert.equal(postAfterDrill.title, 'Modified After Snapshot', 'DR drill must not mutate live D1 data');

// 8. Module #3: Point-in-Time Granular Restore
// 8a. Reject when confirmPhrase !== 'RESTORE'
await assert.rejects(
  () => restorePlatformSnapshot(env, snap.id, { tables: ['posts'], mode: 'upsert', confirmPhrase: 'wrong' }),
  err => err && err.code === 'CONFIRMATION_REQUIRED',
  'Restore must reject unless confirmPhrase === RESTORE'
);

// 8b. Reject when only disallowed tables ('users', 'ops_snapshots') are requested
await assert.rejects(
  () => restorePlatformSnapshot(env, snap.id, { tables: ['users', 'ops_snapshots'], mode: 'upsert', confirmPhrase: 'RESTORE' }),
  err => err && err.code === 'EMPTY_TABLES',
  'Restore must never allow overwriting users or ops_snapshots'
);

// 8c. Granular restore in 'upsert' mode on ['posts', 'schemes_directory']
const upsertRes = await restorePlatformSnapshot(env, snap.id, {
  tables: ['posts', 'schemes_directory'],
  mode: 'upsert',
  confirmPhrase: 'RESTORE',
  createdBy: 'admin@csodisha.com'
});
assert.equal(upsertRes.ok, true);
assert.equal(upsertRes.mode, 'upsert');
assert.ok(upsertRes.safety_snapshot_id, 'Restore must automatically create a pre_restore safety snapshot');
assert.notEqual(upsertRes.safety_snapshot_id, snap.id);

// Verify pre_restore safety snapshot exists in ops_snapshots with trigger_type = 'pre_restore'
const safetyRow = await env.DB.prepare(`SELECT trigger_type, label FROM ops_snapshots WHERE id = ?`).bind(upsertRes.safety_snapshot_id).first();
assert.equal(safetyRow.trigger_type, 'pre_restore');
assert.match(safetyRow.label, /Auto-Pre-Restore Safety Backup/);

// Verify 'job-1' reverted to snapshot state, 'sch-1' re-inserted, and 'job-2' preserved in upsert mode
const job1AfterUpsert = await env.DB.prepare(`SELECT title FROM posts WHERE id = 'job-1'`).first();
assert.equal(job1AfterUpsert.title, 'OPSC Civil Services');
const job2AfterUpsert = await env.DB.prepare(`SELECT title FROM posts WHERE id = 'job-2'`).first();
assert.equal(job2AfterUpsert.title, 'OSSC CGL 2026', 'upsert mode must preserve live-only rows');
const sch1AfterUpsert = await env.DB.prepare(`SELECT title FROM schemes_directory WHERE id = 'sch-1'`).first();
assert.equal(sch1AfterUpsert.title, 'Subhadra Yojana', 'deleted row must be restored from snapshot');

// 8d. Granular restore in 'replace' mode on ['posts']
const replaceRes = await restorePlatformSnapshot(env, snap.id, {
  tables: ['posts'],
  mode: 'replace',
  confirmPhrase: 'RESTORE',
  createdBy: 'admin@csodisha.com'
});
assert.equal(replaceRes.ok, true);
assert.equal(replaceRes.mode, 'replace');
const allPostsAfterReplace = (await env.DB.prepare(`SELECT id, title FROM posts`).all()).results;
assert.equal(allPostsAfterReplace.length, 1, 'replace mode must remove live-only rows not present in the snapshot');
assert.equal(allPostsAfterReplace[0].id, 'job-1');
assert.equal(allPostsAfterReplace[0].title, 'OPSC Civil Services');

console.log('OPS SNAPSHOT, DR DRILL & GRANULAR RESTORE TESTS PASSED');
