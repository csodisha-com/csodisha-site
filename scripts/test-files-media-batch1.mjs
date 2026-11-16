import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureFilesMediaBatch1Schema,
  getFilesMediaOverview,
  handleFilesMediaBatch1Admin
} from '../functions/_lib/files-media-batch1.js';
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

const r2Store = new Map();
const env = {
  DB: createMockDb(),
  MEDIA: {
    async put(key, val, opts) { r2Store.set(key, { val, opts }); },
    async get(key) { return r2Store.get(key) || null; }
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
  () => requireRole(new Request('https://csodisha.com/api/admin/media/files', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/media/folders', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Schema & starter seeds
await ensureFilesMediaBatch1Schema(env.DB);
await ensureFilesMediaBatch1Schema(env.DB);
const ov = await getFilesMediaOverview(env);
assert.ok(ov.total_files >= 2 && ov.folder_count >= 5 && ov.pdf_count >= 1);

// 3. Module 03: Nested Folder hierarchy & file counts
const pFld = (await (await handleFilesMediaBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/media/folders', {
    name_en: 'OPSC 2026 Vault',
    name_or: 'OPSC ୨୦୨୬ ଭଲ୍ଟ',
    folder_scope: 'exam_notices',
    access_tier: 'public',
    status: 'published'
  }),
  env, admin, 'folders'
)).json()).item;
const cFld = (await (await handleFilesMediaBatch1Admin(
  req('POST', 'https://csodisha.com/api/admin/media/folders', {
    parent_folder_id: pFld.id,
    name_en: 'OPSC Prelims Admit Cards',
    folder_scope: 'exam_notices',
    status: 'published'
  }),
  env, admin, 'folders'
)).json()).item;
assert.equal(cFld.parent_folder_id, pFld.id);

// 4. Module 02: Multi-file Bulk Upload & SHA-256 indexing
const pdfBytes = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const fd = new FormData();
fd.append('folder_id', cFld.id);
fd.append('access_tier', 'registered');
fd.append('tags', 'opsc, admit-card');
fd.append('files', new File([pdfBytes], 'opsc-admit-notice.pdf', { type: 'application/pdf' }));
fd.append('files', new File([pngBytes], 'opsc-banner.png', { type: 'image/png' }));

const upRes = await handleFilesMediaBatch1Admin(
  new Request('https://csodisha.com/api/admin/media/upload', {
    method: 'POST',
    headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' },
    body: fd
  }),
  env, admin, 'upload'
);
assert.equal(upRes.status, 201);
const upData = await upRes.json();
assert.equal(upData.uploaded_count, 2);
assert.ok(upData.items[0].sha256_hash.length === 64);
assert.ok(upData.items[0].r2_key.startsWith('vault/pdf/'));
assert.ok(r2Store.has(upData.items[0].r2_key));

// Verify folder file count updated
const fldList = await (await handleFilesMediaBatch1Admin(
  req('GET', 'https://csodisha.com/api/admin/media/folders'),
  env, admin, 'folders'
)).json();
const cFldStats = fldList.items.find(f => f.id === cFld.id);
assert.equal(cFldStats.file_count, 2);

// 5. Module 01 & 04: PDF Manager metadata, watermark/offline toggles & Rollback
const pdfId = upData.items[0].id;
await handleFilesMediaBatch1Admin(
  req('PUT', `https://csodisha.com/api/admin/media/files/${pdfId}`, {
    title_en: 'OPSC Admit Notice v2',
    page_count: 12,
    watermark_enabled: true,
    offline_ready: true
  }),
  env, admin, 'files', pdfId
);
const pdfDetail = await (await handleFilesMediaBatch1Admin(
  req('GET', `https://csodisha.com/api/admin/media/files/${pdfId}`),
  env, admin, 'files', pdfId
)).json();
assert.equal(pdfDetail.item.page_count, 12);
assert.equal(pdfDetail.item.watermark_enabled, true);
assert.ok(pdfDetail.revisions.length >= 2);
const v1Pdf = pdfDetail.revisions.find(r => r.version_num === 1);
const pdfRb = await (await handleFilesMediaBatch1Admin(
  req('PATCH', `https://csodisha.com/api/admin/media/files/${pdfId}`, { action: 'rollback', revision_id: v1Pdf.id }),
  env, admin, 'files', pdfId
)).json();
assert.equal(pdfRb.item.title_en, 'opsc-admit-notice');

console.log('✅ All Files, Media & Cloud Batch 1 tests passed!');
