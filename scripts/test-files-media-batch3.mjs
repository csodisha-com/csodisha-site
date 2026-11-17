import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureFilesMediaBatch3Schema,
  getFilesMediaBatch3Overview,
  handleFilesMediaBatch3Admin
} from '../functions/_lib/files-media-batch3.js';
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

const env = { DB: createMockDb(), MEDIA: { async put() {}, async get() { return null; } } };
const admin = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return new Request(url, opts);
};

// 1. RBAC & CSRF protection
await assert.rejects(
  () => requireRole(new Request('https://csodisha.com/api/admin/media/providers', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/media/permissions', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Schema & starter seeds
await ensureFilesMediaBatch3Schema(env.DB);
await ensureFilesMediaBatch3Schema(env.DB);
const ov3 = await getFilesMediaBatch3Overview(env);
assert.ok(ov3.providers >= 3 && ov3.versions >= 2 && ov3.policies >= 3);

// 3. Module 09: Storage Providers CRUD & Health Ping
const pRes = await handleFilesMediaBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/media/providers', {
    provider_key: 'github_releases',
    name_en: 'GitHub Open Releases Mirror',
    bucket_or_root_label: 'csodisha/releases',
    base_url_prefix: 'https://github.com/csodisha/',
    status: 'published'
  }),
  env, admin, 'providers'
);
assert.equal(pRes.status, 201);
const pingRes = await (await handleFilesMediaBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/media/providers/health-check', {}),
  env, admin, 'providers', 'health-check'
)).json();
assert.ok(pingRes.checked.length >= 4);

// 4. Module 10: File Versions create v2.0 & restore v1.0
const targetFileId = 'mfile-odisha-gk-compendium';
const v1List = await (await handleFilesMediaBatch3Admin(
  req('GET', `https://csodisha.com/api/admin/media/versions?file_id=${targetFileId}`),
  env, admin, 'versions'
)).json();
const v1 = v1List.items[0];
assert.ok(v1 && v1.is_current);

const v2Res = await handleFilesMediaBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/media/versions', {
    file_id: targetFileId,
    version_label: 'v2.0',
    public_url: '/api/media/vault/pdf/2026/v2.pdf',
    file_size_bytes: 3100000,
    change_summary_en: 'Added 2026 Odisha Budget chapters'
  }),
  env, admin, 'versions'
);
assert.equal(v2Res.status, 201);
const v2 = (await v2Res.json()).item;
assert.equal(v2.is_current, true);

const restoreRes = await (await handleFilesMediaBatch3Admin(
  req('PATCH', 'https://csodisha.com/api/admin/media/versions', { action: 'restore_version', version_id: v1.id }),
  env, admin, 'versions'
)).json();
assert.equal(restoreRes.restored_version, 'v1.0');

// 5. Module 11: File Permissions & Access Simulator
const simDenied = await (await handleFilesMediaBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/media/permissions/simulate', {
    role: 'public',
    logged_in: false,
    target_type: 'folder',
    target_ref_id: 'mf-pyq-archive'
  }),
  env, admin, 'permissions', 'simulate'
)).json();
assert.equal(simDenied.allowed_download, false);

const simAllowed = await (await handleFilesMediaBatch3Admin(
  req('POST', 'https://csodisha.com/api/admin/media/permissions/simulate', {
    role: 'student',
    logged_in: true,
    target_type: 'folder',
    target_ref_id: 'mf-pyq-archive'
  }),
  env, admin, 'permissions', 'simulate'
)).json();
assert.equal(simAllowed.allowed_download, true);

// 6. Module 12: Live Storage Usage Analytics
const usageRes = await (await handleFilesMediaBatch3Admin(
  req('GET', 'https://csodisha.com/api/admin/media/usage'),
  env, admin, 'usage'
)).json();
assert.ok(usageRes.total_files >= 2);
assert.ok(usageRes.by_category.length >= 2);
assert.ok(usageRes.largest_files.length >= 2);

console.log('✅ All Files, Media & Cloud Batch 3 tests passed!');
