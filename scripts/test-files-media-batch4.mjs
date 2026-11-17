import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureFilesMediaBatch4Schema,
  getFull15ModuleMediaOverview,
  handleFilesMediaBatch4Admin
} from '../functions/_lib/files-media-batch4.js';
import { handleFilesMediaBatch1Admin } from '../functions/_lib/files-media-batch1.js';
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

const r2Present = new Set(['vault/pdf/2026/ok.pdf']);
const env = {
  DB: createMockDb(),
  MEDIA: {
    async put(k) { r2Present.add(k); },
    async head(k) { return r2Present.has(k) ? { size: 1234 } : null; }
  }
};
const admin = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return new Request(url, opts);
};

// 1. RBAC & CSRF protection
await assert.rejects(
  () => requireRole(new Request('https://csodisha.com/api/admin/media/duplicates', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/media/optimize', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Schema & starter baselines
await ensureFilesMediaBatch4Schema(env.DB);
await ensureFilesMediaBatch4Schema(env.DB);

// 3. Module 13: Duplicate Detection scan & canonical merge
const dupHash = 'a'.repeat(64);
await handleFilesMediaBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/media/files', {
    title_en: 'Odisha Atlas Copy 1', file_category: 'pdf', sha256_hash: dupHash, file_size_bytes: 500000, status: 'published'
  }),
  env, admin, 'files'
);
await handleFilesMediaBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/media/files', {
    title_en: 'Odisha Atlas Copy 2', file_category: 'pdf', sha256_hash: dupHash, file_size_bytes: 500000, status: 'published'
  }),
  env, admin, 'files'
);

const dupScan = await (await handleFilesMediaBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/media/duplicates/scan', {}),
  env, admin, 'duplicates', 'scan'
)).json();
assert.ok(dupScan.groups_found >= 1);

const dupList = await (await handleFilesMediaBatch4Admin(
  req('GET', 'https://csodisha.com/api/admin/media/duplicates?resolution_status=open'),
  env, admin, 'duplicates'
)).json();
assert.ok(dupList.items.length >= 1);
const firstGrp = dupList.items[0];
assert.equal(firstGrp.reclaimable_bytes, 500000);

const mergeRes = await (await handleFilesMediaBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/media/duplicates/merge', {
    group_id: firstGrp.id,
    canonical_file_id: firstGrp.canonical_file_id,
    action: 'merge'
  }),
  env, admin, 'duplicates', 'merge'
)).json();
assert.equal(mergeRes.resolution_status, 'merged');
assert.equal(mergeRes.archived_count, 1);

// 4. Module 14: Broken File Links scan & URL repair
const missingFile = (await (await handleFilesMediaBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/media/files', {
    title_en: 'Missing R2 File', file_category: 'pdf', r2_key: 'vault/pdf/2026/missing.pdf', public_url: '/api/media/vault/pdf/2026/missing.pdf', status: 'published'
  }),
  env, admin, 'files'
)).json()).item;

const brkScan = await (await handleFilesMediaBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/media/broken-links/scan', {}),
  env, admin, 'broken-links', 'scan'
)).json();
assert.ok(brkScan.broken_count >= 1);

const brkList = await (await handleFilesMediaBatch4Admin(
  req('GET', 'https://csodisha.com/api/admin/media/broken-links?fix_status=open'),
  env, admin, 'broken-links'
)).json();
const missingRec = brkList.items.find(b => b.source_id === missingFile.id);
assert.ok(missingRec && missingRec.issue_type === 'missing_r2_object');

const repairRes = await (await handleFilesMediaBatch4Admin(
  req('PATCH', `https://csodisha.com/api/admin/media/broken-links/${missingRec.id}`, {
    action: 'repair',
    replacement_url: '/api/media/vault/pdf/2026/ok.pdf'
  }),
  env, admin, 'broken-links', missingRec.id
)).json();
assert.equal(repairRes.fix_status, 'repaired');

// 5. Module 15: Optimization scan & execution
const optScan = await (await handleFilesMediaBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/media/optimize/scan', {}),
  env, admin, 'optimize', 'scan'
)).json();
assert.ok(optScan.newly_queued >= 1);

const optList = await (await handleFilesMediaBatch4Admin(
  req('GET', 'https://csodisha.com/api/admin/media/optimize'),
  env, admin, 'optimize'
)).json();
const queuedIds = optList.items.filter(j => j.job_status === 'queued').map(j => j.id);
assert.ok(queuedIds.length >= 1);

const optRun = await (await handleFilesMediaBatch4Admin(
  req('POST', 'https://csodisha.com/api/admin/media/optimize/run', {
    job_ids: queuedIds,
    quality_preset: 'balanced_80'
  }),
  env, admin, 'optimize', 'run'
)).json();
assert.equal(optRun.processed, queuedIds.length);

// 6. Full 15-Module Suite Overview (01-15)
const suite15 = await getFull15ModuleMediaOverview(env);
assert.equal(Object.keys(suite15.modules).length, 15, 'All 15 modules 01-15 must be aggregated');
assert.ok(suite15.total_files >= 4);
assert.ok(suite15.optimization_savings_pct > 0);

console.log('✅ All Files, Media & Cloud Batch 4 & 15-Module Suite tests passed!');
