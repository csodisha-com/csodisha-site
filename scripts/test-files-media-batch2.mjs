import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureFilesMediaBatch2Schema,
  getFilesMediaBatch2Overview,
  handleFilesMediaBatch2Admin,
  parseGoogleDriveUrl
} from '../functions/_lib/files-media-batch2.js';
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
const admin = { userId: 'u_admin', email: 'admin@csodisha.com', role: 'admin' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return new Request(url, opts);
};

// 1. RBAC & CSRF protection
await assert.rejects(
  () => requireRole(new Request('https://csodisha.com/api/admin/media/images', { method: 'GET' }), env, STAFF_ROLES),
  err => err.status === 401
);
assert.throws(
  () => verifyCsrf(new Request('https://csodisha.com/api/admin/media/gdrive', { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Schema & starter seeds
await ensureFilesMediaBatch2Schema(env.DB);
await ensureFilesMediaBatch2Schema(env.DB);
const ov2 = await getFilesMediaBatch2Overview(env);
assert.ok(ov2.images >= 1 && ov2.av_items >= 1 && ov2.cloud_links >= 1 && ov2.gdrive_links >= 1);

// 3. Module 05: Image Library metadata & alt-text persistence + Rollback
const imgCreate = await handleFilesMediaBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/media/images', {
    title_en: 'Konark Sun Temple Diagram',
    title_or: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ଚିତ୍ର',
    public_url: '/assets/konark-diagram.webp',
    usage_context: 'study_diagram',
    alt_or_caption_en: 'Architectural diagram of Konark Sun Temple Wheel',
    width_px: 1200,
    height_px: 800,
    status: 'published'
  }),
  env, admin, 'images'
);
assert.equal(imgCreate.status, 201);
const imgItem = (await imgCreate.json()).item;
assert.equal(imgItem.usage_context, 'study_diagram');

await handleFilesMediaBatch2Admin(
  req('PUT', `https://csodisha.com/api/admin/media/images/${imgItem.id}`, { title_en: 'Konark Diagram v2' }),
  env, admin, 'images', imgItem.id
);
const imgDetail = await (await handleFilesMediaBatch2Admin(
  req('GET', `https://csodisha.com/api/admin/media/images/${imgItem.id}`),
  env, admin, 'images', imgItem.id
)).json();
const v1Img = imgDetail.revisions.find(r => r.version_num === 1);
const imgRb = await (await handleFilesMediaBatch2Admin(
  req('PATCH', `https://csodisha.com/api/admin/media/images/${imgItem.id}`, { action: 'rollback', revision_id: v1Img.id }),
  env, admin, 'images', imgItem.id
)).json();
assert.equal(imgRb.item.title_en, 'Konark Sun Temple Diagram');

// 4. Module 06: Video & Audio stream + chapters
const avCreate = await handleFilesMediaBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/media/av', {
    media_kind: 'audio',
    source_mode: 'external_stream',
    title_en: 'Odisha Current Affairs Podcast Ep 12',
    embed_id_or_url: 'https://csodisha.com/audio/ep12.mp3',
    duration_seconds: 720,
    chapters: [{ time_sec: 0, label_en: 'Odisha Budget Highlights' }],
    status: 'published'
  }),
  env, admin, 'av'
);
assert.equal(avCreate.status, 201);
const avItem = (await avCreate.json()).item;
assert.equal(avItem.chapters.length, 1);

// 5. Module 07: Cloud Links & Verify
const clCreate = await handleFilesMediaBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/media/cloud-links', {
    connector_type: 'github_raw',
    title_en: 'Odisha District GeoJSON Pack',
    raw_share_url: 'https://raw.githubusercontent.com/csodisha/data/main/odisha.geojson',
    estimated_size_label: '4 MB',
    status: 'published'
  }),
  env, admin, 'cloud-links'
);
assert.equal(clCreate.status, 201);
const verRes = await (await handleFilesMediaBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/media/cloud-links/verify', {}),
  env, admin, 'cloud-links', 'verify'
)).json();
assert.ok(verRes.ok_count >= 2);

// 6. Module 08: Google Drive URL Parser (file/d/... & folders/...)
const parsedFile = parseGoogleDriveUrl('https://drive.google.com/file/d/1XyZ_98765AbCdEf/view?usp=sharing');
assert.equal(parsedFile.drive_file_id, '1XyZ_98765AbCdEf');
assert.equal(parsedFile.drive_resource_kind, 'pdf_file');
assert.equal(parsedFile.preview_embed_url, 'https://drive.google.com/file/d/1XyZ_98765AbCdEf/preview');
assert.equal(parsedFile.direct_download_url, 'https://drive.google.com/uc?export=download&id=1XyZ_98765AbCdEf');

const parsedFolder = parseGoogleDriveUrl('https://drive.google.com/drive/folders/1FolderIdABC123?usp=drive_link');
assert.equal(parsedFolder.drive_file_id, '1FolderIdABC123');
assert.equal(parsedFolder.drive_resource_kind, 'folder_share');

const gdCreate = await handleFilesMediaBatch2Admin(
  req('POST', 'https://csodisha.com/api/admin/media/gdrive', {
    title_en: 'OSSC CGL 2025 Complete Notes Drive PDF',
    raw_share_url: 'https://drive.google.com/file/d/1XyZ_98765AbCdEf/view?usp=sharing',
    estimated_size_label: '18 MB',
    status: 'published'
  }),
  env, admin, 'gdrive'
);
assert.equal(gdCreate.status, 201);
const gdItem = (await gdCreate.json()).item;
assert.equal(gdItem.drive_file_id, '1XyZ_98765AbCdEf');

console.log('✅ All Files, Media & Cloud Batch 2 tests passed!');
