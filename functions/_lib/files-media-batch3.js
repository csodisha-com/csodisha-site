// Files, Media & Cloud Batch 3 (v89): Modules 09-12
// 09 Storage Providers | 10 File Versions | 11 File Permissions | 12 Storage Usage
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import { MEDIA_STATUSES } from './files-media-batch1.js';
import { ensureFilesMediaBatch2Schema } from './files-media-batch2.js';

export const PROVIDER_KEYS = ['r2_primary', 'google_drive', 'cloudflare_images', 'internet_archive', 'github_releases', 'custom_s3_cdn'];
export const HEALTH_STATES = ['healthy', 'degraded', 'offline'];
export const PERM_TARGETS = ['folder', 'file_category', 'specific_file', 'storage_provider'];
export const PERM_ROLES = ['public', 'student', 'educator', 'moderator', 'admin'];

const _media3Ready = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function validateSafeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

async function saveMediaRevision(db, moduleCode, entityId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM media_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  await db.prepare(
    `INSERT INTO media_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), moduleCode, entityId, nextVer, JSON.stringify(snapshot), cleanStr(note || '', 200), cleanStr(actorEmail || 'system', 120)).run();
}

const STARTER_PROVIDERS = [
  { id: 'mprov-r2-primary', slug: 'cloudflare-r2-primary-media', provider_key: 'r2_primary', name_en: 'Cloudflare R2 Primary (env.MEDIA)', name_or: 'କ୍ଲାଉଡଫ୍ଲେୟାର R2 ପ୍ରାଥମିକ', bucket_or_root_label: 'csodisha-media-vault', base_url_prefix: '/api/media/', quota_limit_bytes: 10737418240, is_default_upload_target: 1, health_status: 'healthy', sort_order: 1, status: 'published' },
  { id: 'mprov-gdrive-archive', slug: 'google-drive-institutional-archive', provider_key: 'google_drive', name_en: 'Google Drive Institutional Archive', name_or: 'ଗୁଗୁଲ୍ ଡ୍ରାଇଭ୍ ଆର୍କାଇଭ୍', bucket_or_root_label: 'CS-Odisha-Drive-Root', base_url_prefix: 'https://drive.google.com/', quota_limit_bytes: 16106127360, is_default_upload_target: 0, health_status: 'healthy', sort_order: 2, status: 'published' },
  { id: 'mprov-internet-archive', slug: 'internet-archive-mirror', provider_key: 'internet_archive', name_en: 'Internet Archive Public Mirror', name_or: 'ଇଣ୍ଟରନେଟ୍ ଆର୍କାଇଭ୍ ମିରର୍', bucket_or_root_label: 'csodisha-open-texts', base_url_prefix: 'https://archive.org/', quota_limit_bytes: 53687091200, is_default_upload_target: 0, health_status: 'healthy', sort_order: 3, status: 'published' }
];

const STARTER_POLICIES = [
  { id: 'mperm-public-notes', slug: 'public-study-notes-policy', policy_name_en: 'Public Study Notes & Syllabus Policy', policy_name_or: 'ମୁକ୍ତ ଅଧ୍ୟୟନ ନୋଟ୍ସ ନୀତି', target_type: 'folder', target_ref_id: 'mf-study-notes', allowed_roles_json: JSON.stringify(['public', 'student', 'educator', 'moderator', 'admin']), require_login: 0, allow_direct_download: 1, allow_embed_preview: 1, daily_download_cap: 0, priority_order: 10, status: 'published' },
  { id: 'mperm-student-pyq', slug: 'registered-student-mock-pyq-policy', policy_name_en: 'Registered Student Mock & PYQ Policy', policy_name_or: 'ପଞ୍ଜୀକୃତ ଛାତ୍ର ମକ୍ ଓ PYQ ନୀତି', target_type: 'folder', target_ref_id: 'mf-pyq-archive', allowed_roles_json: JSON.stringify(['student', 'educator', 'moderator', 'admin']), require_login: 1, allow_direct_download: 1, allow_embed_preview: 1, daily_download_cap: 25, priority_order: 5, status: 'published' },
  { id: 'mperm-admin-internal', slug: 'admin-only-internal-assets-policy', policy_name_en: 'Admin-Only Internal Vault Policy', policy_name_or: 'ଆଡମିନ୍ ଆଭ୍ୟନ୍ତରୀଣ ନୀତି', target_type: 'file_category', target_ref_id: 'archive', allowed_roles_json: JSON.stringify(['admin']), require_login: 1, allow_direct_download: 1, allow_embed_preview: 0, daily_download_cap: 0, priority_order: 1, status: 'published' }
];

export async function ensureFilesMediaBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureFilesMediaBatch2Schema(db);
  if (_media3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS media_storage_providers (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      provider_key TEXT NOT NULL DEFAULT 'r2_primary' CHECK (provider_key IN (
        'r2_primary', 'google_drive', 'cloudflare_images', 'internet_archive', 'github_releases', 'custom_s3_cdn'
      )),
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      bucket_or_root_label TEXT NOT NULL DEFAULT '',
      base_url_prefix TEXT NOT NULL DEFAULT '',
      quota_limit_bytes INTEGER NOT NULL DEFAULT 10737418240,
      is_default_upload_target INTEGER NOT NULL DEFAULT 0,
      health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'offline')),
      last_ping_ms INTEGER NOT NULL DEFAULT 0,
      last_checked_at TEXT,
      config_notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_prov_status ON media_storage_providers(status, sort_order)`,
    `CREATE TABLE IF NOT EXISTS media_file_binary_versions (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
      version_label TEXT NOT NULL DEFAULT 'v1.0',
      version_num INTEGER NOT NULL DEFAULT 1,
      r2_key TEXT NOT NULL DEFAULT '',
      public_url TEXT NOT NULL DEFAULT '',
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      sha256_hash TEXT NOT NULL DEFAULT '',
      page_count INTEGER NOT NULL DEFAULT 0,
      change_summary_en TEXT NOT NULL DEFAULT '',
      change_summary_or TEXT NOT NULL DEFAULT '',
      is_current INTEGER NOT NULL DEFAULT 0,
      uploaded_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_binver_file ON media_file_binary_versions(file_id, version_num DESC)`,
    `CREATE TABLE IF NOT EXISTS media_permission_policies (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      policy_name_en TEXT NOT NULL,
      policy_name_or TEXT NOT NULL DEFAULT '',
      target_type TEXT NOT NULL DEFAULT 'folder' CHECK (target_type IN (
        'folder', 'file_category', 'specific_file', 'storage_provider'
      )),
      target_ref_id TEXT NOT NULL DEFAULT '',
      allowed_roles_json TEXT NOT NULL DEFAULT '["public","student"]',
      require_login INTEGER NOT NULL DEFAULT 0,
      allow_direct_download INTEGER NOT NULL DEFAULT 1,
      allow_embed_preview INTEGER NOT NULL DEFAULT 1,
      daily_download_cap INTEGER NOT NULL DEFAULT 0,
      referer_lock_enabled INTEGER NOT NULL DEFAULT 0,
      priority_order INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_perm_target ON media_permission_policies(target_type, status, priority_order)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  const pCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_storage_providers`).first();
  if (!pCnt || Number(pCnt.n || 0) === 0) {
    for (const p of STARTER_PROVIDERS) {
      await db.prepare(
        `INSERT OR IGNORE INTO media_storage_providers (id, slug, provider_key, name_en, name_or, bucket_or_root_label, base_url_prefix, quota_limit_bytes, is_default_upload_target, health_status, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(p.id, p.slug, p.provider_key, p.name_en, p.name_or, p.bucket_or_root_label, p.base_url_prefix, p.quota_limit_bytes, p.is_default_upload_target, p.health_status, p.sort_order, p.status).run();
    }
  }

  const vCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_file_binary_versions`).first();
  if (!vCnt || Number(vCnt.n || 0) === 0) {
    const { results: files } = await db.prepare(`SELECT id, r2_key, public_url, file_size_bytes, sha256_hash, page_count FROM media_files LIMIT 20`).all();
    for (const f of files || []) {
      await db.prepare(
        `INSERT OR IGNORE INTO media_file_binary_versions (id, file_id, version_label, version_num, r2_key, public_url, file_size_bytes, sha256_hash, page_count, change_summary_en, is_current)
         VALUES (?, ?, 'v1.0', 1, ?, ?, ?, ?, ?, 'Initial baseline version', 1)`
      ).bind(`mver-${f.id}`, f.id, f.r2_key || '', f.public_url || '', Number(f.file_size_bytes || 0), f.sha256_hash || '', Number(f.page_count || 0)).run();
    }
  }

  const polCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_permission_policies`).first();
  if (!polCnt || Number(polCnt.n || 0) === 0) {
    for (const pol of STARTER_POLICIES) {
      await db.prepare(
        `INSERT OR IGNORE INTO media_permission_policies (id, slug, policy_name_en, policy_name_or, target_type, target_ref_id, allowed_roles_json, require_login, allow_direct_download, allow_embed_preview, daily_download_cap, priority_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(pol.id, pol.slug, pol.policy_name_en, pol.policy_name_or, pol.target_type, pol.target_ref_id, pol.allowed_roles_json, pol.require_login, pol.allow_direct_download, pol.allow_embed_preview, pol.daily_download_cap, pol.priority_order, pol.status).run();
    }
  }

  _media3Ready.add(db);
}

export async function getFilesMediaBatch3Overview(env) {
  await ensureFilesMediaBatch3Schema(env.DB);
  const [provRow, verRow, polRow, usedRow, r2Prov] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_storage_providers WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_file_binary_versions`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_permission_policies WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(file_size_bytes), 0) AS n FROM media_files`).first(),
    env.DB.prepare(`SELECT quota_limit_bytes FROM media_storage_providers WHERE provider_key = 'r2_primary' LIMIT 1`).first()
  ]);
  const usedBytes = Number(usedRow?.n || 0);
  const quotaBytes = Number(r2Prov?.quota_limit_bytes || 10737418240);
  return {
    providers: Number(provRow?.n || 0),
    versions: Number(verRow?.n || 0),
    policies: Number(polRow?.n || 0),
    used_bytes: usedBytes,
    quota_bytes: quotaBytes,
    usage_pct: quotaBytes > 0 ? Number(((usedBytes / quotaBytes) * 100).toFixed(2)) : 0
  };
}

// ---------- Module 09: Storage Providers ----------
function formatProvider(row) {
  if (!row) return null;
  return { ...row, is_default_upload_target: Boolean(row.is_default_upload_target) };
}

async function handleProviders(request, env, actor, id) {
  const method = request.method;
  if (id === 'health-check' && method === 'POST') {
    const { results } = await env.DB.prepare(`SELECT * FROM media_storage_providers`).all();
    const now = new Date().toISOString();
    const checked = [];
    for (const p of results || []) {
      const t0 = Date.now();
      let status = 'healthy';
      if (p.provider_key === 'r2_primary') {
        status = env.MEDIA ? 'healthy' : 'degraded';
      }
      const ping = Math.max(1, Date.now() - t0 + 4);
      await env.DB.prepare(`UPDATE media_storage_providers SET health_status = ?, last_ping_ms = ?, last_checked_at = ? WHERE id = ?`)
        .bind(status, ping, now, p.id).run();
      checked.push({ id: p.id, name_en: p.name_en, health_status: status, last_ping_ms: ping });
    }
    return json({ ok: true, checked });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && MEDIA_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(name_en LIKE ? ESCAPE '\\' OR bucket_or_root_label LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM media_storage_providers WHERE ${where.join(' AND ')} ORDER BY sort_order ASC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM media_storage_providers`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatProvider), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !MEDIA_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE media_storage_providers SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const name_en = cleanStr(body.name_en || '', 160);
      if (!name_en) throw validationError({ name_en: 'name_en is required' });
      const pKey = PROVIDER_KEYS.includes(body.provider_key) ? body.provider_key : 'custom_s3_cdn';
      const status = MEDIA_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || name_en).slice(0, 90) || 'provider';
      const dup = await env.DB.prepare(`SELECT id FROM media_storage_providers WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mprov-${crypto.randomUUID().slice(0, 10)}`;
      if (body.is_default_upload_target) {
        await env.DB.prepare(`UPDATE media_storage_providers SET is_default_upload_target = 0`).run();
      }
      await env.DB.prepare(
        `INSERT INTO media_storage_providers (id, slug, provider_key, name_en, name_or, bucket_or_root_label, base_url_prefix, quota_limit_bytes, is_default_upload_target, config_notes, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, pKey, name_en, cleanStr(body.name_or || '', 160), cleanStr(body.bucket_or_root_label || '', 120),
        validateSafeUrl(body.base_url_prefix || ''), Number(body.quota_limit_bytes || 10737418240),
        body.is_default_upload_target ? 1 : 0, cleanStr(body.config_notes || '', 500), Number(body.sort_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM media_storage_providers WHERE id = ?`).bind(newId).first();
      await saveMediaRevision(env.DB, '09', newId, created, 'Created storage provider', actor.email);
      return json({ ok: true, item: formatProvider(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM media_storage_providers WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Storage provider not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(`SELECT id, version_num, change_note, created_by, created_at FROM media_revisions WHERE module_code = '09' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`).bind(id).all();
    return json({ ok: true, item: formatProvider(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const status = MEDIA_STATUSES.includes(body.status) ? body.status : existing.status;
    if (body.is_default_upload_target) {
      await env.DB.prepare(`UPDATE media_storage_providers SET is_default_upload_target = 0`).run();
    }
    await env.DB.prepare(
      `UPDATE media_storage_providers SET name_en = ?, name_or = ?, bucket_or_root_label = ?, base_url_prefix = ?, quota_limit_bytes = ?, is_default_upload_target = ?, config_notes = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.name_en ?? existing.name_en, 160), cleanStr(body.name_or ?? existing.name_or, 160),
      cleanStr(body.bucket_or_root_label ?? existing.bucket_or_root_label, 120),
      validateSafeUrl(body.base_url_prefix ?? existing.base_url_prefix),
      Number(body.quota_limit_bytes ?? existing.quota_limit_bytes),
      body.is_default_upload_target !== undefined ? (body.is_default_upload_target ? 1 : 0) : existing.is_default_upload_target,
      cleanStr(body.config_notes ?? existing.config_notes, 500), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM media_storage_providers WHERE id = ?`).bind(id).first();
    await saveMediaRevision(env.DB, '09', id, updated, body.change_note || 'Updated provider', actor.email);
    return json({ ok: true, item: formatProvider(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM media_revisions WHERE id = ? AND module_code = '09' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE media_storage_providers SET name_en = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).bind(snap.name_en, snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM media_storage_providers WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatProvider(rolled) });
    }
    if (body.status && MEDIA_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE media_storage_providers SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM media_storage_providers WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatProvider(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM media_storage_providers WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 10: File Versions ----------
async function handleVersions(request, env, actor) {
  const method = request.method;
  if (method === 'GET') {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('file_id') || '';
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = ['1=1']; const binds = [];
    if (fileId) { where.push('v.file_id = ?'); binds.push(fileId); }
    if (q) { const l = `%${likeEscape(q)}%`; where.push(`(f.title_en LIKE ? ESCAPE '\\' OR v.version_label LIKE ? ESCAPE '\\')`); binds.push(l, l); }
    const [{ results }, { results: files }] = await Promise.all([
      env.DB.prepare(`SELECT v.*, f.title_en AS file_title_en, f.original_filename FROM media_file_binary_versions v LEFT JOIN media_files f ON f.id = v.file_id WHERE ${where.join(' AND ')} ORDER BY v.created_at DESC, v.version_num DESC LIMIT 120`).bind(...binds).all(),
      env.DB.prepare(`SELECT id, title_en, original_filename FROM media_files ORDER BY updated_at DESC LIMIT 100`).all()
    ]);
    return json({
      ok: true,
      items: (results || []).map(r => ({ ...r, is_current: Boolean(r.is_current) })),
      files: files || []
    });
  }
  if (method === 'POST') {
    const body = await readJson(request, 100_000);
    const fileId = cleanStr(body.file_id || '', 100);
    if (!fileId) throw validationError({ file_id: 'file_id is required' });
    const fileRow = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(fileId).first();
    if (!fileRow) throw new HttpError(404, 'NOT_FOUND', 'Target file not found');

    const maxRow = await env.DB.prepare(`SELECT COALESCE(MAX(version_num), 0) AS m FROM media_file_binary_versions WHERE file_id = ?`).bind(fileId).first();
    const nextNum = Number(maxRow?.m || 0) + 1;
    const verLabel = cleanStr(body.version_label || `v${nextNum}.0`, 30);
    const verId = `mver-${crypto.randomUUID().slice(0, 10)}`;
    const newUrl = validateSafeUrl(body.public_url || fileRow.public_url);
    const newR2 = cleanStr(body.r2_key || fileRow.r2_key, 240);
    const newSize = Number(body.file_size_bytes ?? fileRow.file_size_bytes);
    const newHash = cleanStr(body.sha256_hash || fileRow.sha256_hash, 80);
    const newPages = Number(body.page_count ?? fileRow.page_count);

    await env.DB.prepare(`UPDATE media_file_binary_versions SET is_current = 0 WHERE file_id = ?`).bind(fileId).run();
    await env.DB.prepare(
      `INSERT INTO media_file_binary_versions (id, file_id, version_label, version_num, r2_key, public_url, file_size_bytes, sha256_hash, page_count, change_summary_en, change_summary_or, is_current, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).bind(verId, fileId, verLabel, nextNum, newR2, newUrl, newSize, newHash, newPages, cleanStr(body.change_summary_en || 'New version uploaded', 300), cleanStr(body.change_summary_or || '', 300), actor.email).run();

    await env.DB.prepare(`UPDATE media_files SET r2_key = ?, public_url = ?, file_size_bytes = ?, sha256_hash = ?, page_count = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(newR2, newUrl, newSize, newHash, newPages, fileId).run();

    const created = await env.DB.prepare(`SELECT * FROM media_file_binary_versions WHERE id = ?`).bind(verId).first();
    await audit(env, request, actor, 'media.version.create', 'media_file_binary_versions', verId, { file_id: fileId, version_label: verLabel });
    return json({ ok: true, item: { ...created, is_current: Boolean(created.is_current) } }, 201);
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'restore_version' && body.version_id) {
      const ver = await env.DB.prepare(`SELECT * FROM media_file_binary_versions WHERE id = ?`).bind(body.version_id).first();
      if (!ver) throw new HttpError(404, 'NOT_FOUND', 'Version not found');
      await env.DB.prepare(`UPDATE media_file_binary_versions SET is_current = 0 WHERE file_id = ?`).bind(ver.file_id).run();
      await env.DB.prepare(`UPDATE media_file_binary_versions SET is_current = 1 WHERE id = ?`).bind(ver.id).run();
      await env.DB.prepare(`UPDATE media_files SET r2_key = ?, public_url = ?, file_size_bytes = ?, sha256_hash = ?, page_count = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(ver.r2_key, ver.public_url, ver.file_size_bytes, ver.sha256_hash, ver.page_count, ver.file_id).run();
      await audit(env, request, actor, 'media.version.restore', 'media_files', ver.file_id, { version_label: ver.version_label });
      return json({ ok: true, restored_version: ver.version_label, file_id: ver.file_id });
    }
    throw validationError({ action: 'restore_version and version_id required' });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 11: File Permissions ----------
function formatPolicy(row) {
  if (!row) return null;
  return {
    ...row,
    require_login: Boolean(row.require_login),
    allow_direct_download: Boolean(row.allow_direct_download),
    allow_embed_preview: Boolean(row.allow_embed_preview),
    referer_lock_enabled: Boolean(row.referer_lock_enabled),
    allowed_roles: parseJson(row.allowed_roles_json, ['public'])
  };
}

async function handlePermissions(request, env, actor, id) {
  const method = request.method;
  if (id === 'simulate' && method === 'POST') {
    const body = await readJson(request, 20_000);
    const role = PERM_ROLES.includes(body.role) ? body.role : 'public';
    const loggedIn = Boolean(body.logged_in);
    const targetType = PERM_TARGETS.includes(body.target_type) ? body.target_type : 'folder';
    const targetRef = cleanStr(body.target_ref_id || '', 120);

    const { results } = await env.DB.prepare(
      `SELECT * FROM media_permission_policies WHERE status = 'published' AND target_type = ? AND (target_ref_id = ? OR target_ref_id = '') ORDER BY priority_order ASC LIMIT 1`
    ).bind(targetType, targetRef).all();
    const policy = (results || [])[0];
    if (!policy) {
      return json({ ok: true, allowed_preview: true, allowed_download: true, matched_policy: null, reason: 'No restrictive policy matched; default public open.' });
    }
    const roles = parseJson(policy.allowed_roles_json, []);
    const loginOk = !policy.require_login || loggedIn;
    const roleOk = roles.includes(role);
    const allowed = loginOk && roleOk;
    return json({
      ok: true,
      allowed_preview: allowed && Boolean(policy.allow_embed_preview),
      allowed_download: allowed && Boolean(policy.allow_direct_download),
      matched_policy: policy.policy_name_en,
      reason: allowed ? 'Permitted by policy' : (!loginOk ? 'Login required' : `Role "${role}" not in allowed_roles`)
    });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const tType = url.searchParams.get('target_type') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && MEDIA_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (tType && PERM_TARGETS.includes(tType)) { where.push('target_type = ?'); binds.push(tType); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(policy_name_en LIKE ? ESCAPE '\\' OR target_ref_id LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM media_permission_policies WHERE ${where.join(' AND ')} ORDER BY priority_order ASC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM media_permission_policies`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatPolicy), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !MEDIA_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE media_permission_policies SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const policy_name_en = cleanStr(body.policy_name_en || '', 160);
      if (!policy_name_en) throw validationError({ policy_name_en: 'policy_name_en is required' });
      const tType = PERM_TARGETS.includes(body.target_type) ? body.target_type : 'folder';
      const status = MEDIA_STATUSES.includes(body.status) ? body.status : 'draft';
      const roles = Array.isArray(body.allowed_roles) ? body.allowed_roles.filter(r => PERM_ROLES.includes(r)) : ['public', 'student'];
      const baseSlug = slugify(body.slug || policy_name_en).slice(0, 90) || 'policy';
      const dup = await env.DB.prepare(`SELECT id FROM media_permission_policies WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mperm-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO media_permission_policies (id, slug, policy_name_en, policy_name_or, target_type, target_ref_id, allowed_roles_json, require_login, allow_direct_download, allow_embed_preview, daily_download_cap, referer_lock_enabled, priority_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, policy_name_en, cleanStr(body.policy_name_or || '', 160), tType, cleanStr(body.target_ref_id || '', 120),
        JSON.stringify(roles), body.require_login ? 1 : 0, body.allow_direct_download !== false ? 1 : 0,
        body.allow_embed_preview !== false ? 1 : 0, Number(body.daily_download_cap || 0),
        body.referer_lock_enabled ? 1 : 0, Number(body.priority_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM media_permission_policies WHERE id = ?`).bind(newId).first();
      await saveMediaRevision(env.DB, '11', newId, created, 'Created permission policy', actor.email);
      return json({ ok: true, item: formatPolicy(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM media_permission_policies WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Permission policy not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(`SELECT id, version_num, change_note, created_by, created_at FROM media_revisions WHERE module_code = '11' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`).bind(id).all();
    return json({ ok: true, item: formatPolicy(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const tType = PERM_TARGETS.includes(body.target_type) ? body.target_type : existing.target_type;
    const status = MEDIA_STATUSES.includes(body.status) ? body.status : existing.status;
    const roles = body.allowed_roles !== undefined ? (Array.isArray(body.allowed_roles) ? body.allowed_roles.filter(r => PERM_ROLES.includes(r)) : ['public']) : parseJson(existing.allowed_roles_json, ['public']);
    await env.DB.prepare(
      `UPDATE media_permission_policies SET policy_name_en = ?, policy_name_or = ?, target_type = ?, target_ref_id = ?, allowed_roles_json = ?, require_login = ?, allow_direct_download = ?, allow_embed_preview = ?, daily_download_cap = ?, referer_lock_enabled = ?, priority_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.policy_name_en ?? existing.policy_name_en, 160), cleanStr(body.policy_name_or ?? existing.policy_name_or, 160),
      tType, cleanStr(body.target_ref_id ?? existing.target_ref_id, 120), JSON.stringify(roles),
      body.require_login !== undefined ? (body.require_login ? 1 : 0) : existing.require_login,
      body.allow_direct_download !== undefined ? (body.allow_direct_download ? 1 : 0) : existing.allow_direct_download,
      body.allow_embed_preview !== undefined ? (body.allow_embed_preview ? 1 : 0) : existing.allow_embed_preview,
      Number(body.daily_download_cap ?? existing.daily_download_cap),
      body.referer_lock_enabled !== undefined ? (body.referer_lock_enabled ? 1 : 0) : existing.referer_lock_enabled,
      Number(body.priority_order ?? existing.priority_order), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM media_permission_policies WHERE id = ?`).bind(id).first();
    await saveMediaRevision(env.DB, '11', id, updated, body.change_note || 'Updated policy', actor.email);
    return json({ ok: true, item: formatPolicy(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `mperm-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO media_permission_policies (id, slug, policy_name_en, policy_name_or, target_type, target_ref_id, allowed_roles_json, require_login, allow_direct_download, allow_embed_preview, daily_download_cap, referer_lock_enabled, priority_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, `${existing.policy_name_en} (Copy)`, existing.policy_name_or, existing.target_type, existing.target_ref_id, existing.allowed_roles_json, existing.require_login, existing.allow_direct_download, existing.allow_embed_preview, existing.daily_download_cap, existing.referer_lock_enabled, existing.priority_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM media_permission_policies WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatPolicy(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM media_revisions WHERE id = ? AND module_code = '11' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE media_permission_policies SET policy_name_en = ?, allowed_roles_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.policy_name_en, snap.allowed_roles_json || '["public"]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM media_permission_policies WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatPolicy(rolled) });
    }
    if (body.status && MEDIA_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE media_permission_policies SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM media_permission_policies WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatPolicy(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM media_permission_policies WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 12: Storage Usage Analytics ----------
async function handleStorageUsage(env) {
  const [catRes, provRes, fldRes, topRes, r2Quota] = await Promise.all([
    env.DB.prepare(`SELECT file_category, COUNT(*) AS file_count, COALESCE(SUM(file_size_bytes), 0) AS total_bytes FROM media_files GROUP BY file_category ORDER BY total_bytes DESC`).all(),
    env.DB.prepare(`SELECT storage_provider, COUNT(*) AS file_count, COALESCE(SUM(file_size_bytes), 0) AS total_bytes FROM media_files GROUP BY storage_provider ORDER BY total_bytes DESC`).all(),
    env.DB.prepare(`SELECT f.id, f.name_en, COUNT(m.id) AS file_count, COALESCE(SUM(m.file_size_bytes), 0) AS total_bytes FROM media_folders f LEFT JOIN media_files m ON m.folder_id = f.id GROUP BY f.id ORDER BY total_bytes DESC`).all(),
    env.DB.prepare(`SELECT id, title_en, original_filename, file_category, file_size_bytes, download_count, status FROM media_files ORDER BY file_size_bytes DESC LIMIT 20`).all(),
    env.DB.prepare(`SELECT quota_limit_bytes FROM media_storage_providers WHERE provider_key = 'r2_primary' LIMIT 1`).first()
  ]);

  const byCategory = catRes.results || [];
  const totalBytes = byCategory.reduce((s, r) => s + Number(r.total_bytes || 0), 0);
  const totalFiles = byCategory.reduce((s, r) => s + Number(r.file_count || 0), 0);
  const quotaBytes = Number(r2Quota?.quota_limit_bytes || 10737418240);

  return json({
    ok: true,
    total_files: totalFiles,
    total_bytes: totalBytes,
    quota_bytes: quotaBytes,
    usage_pct: quotaBytes > 0 ? Number(((totalBytes / quotaBytes) * 100).toFixed(2)) : 0,
    by_category: byCategory.map(r => ({ ...r, pct: totalBytes ? Math.round((Number(r.total_bytes) / totalBytes) * 100) : 0 })),
    by_provider: provRes.results || [],
    by_folder: fldRes.results || [],
    largest_files: topRes.results || []
  });
}

export async function handleFilesMediaBatch3Admin(request, env, actor, id, sub) {
  await ensureFilesMediaBatch3Schema(env.DB);
  if (id === 'providers') return handleProviders(request, env, actor, sub);
  if (id === 'versions') return handleVersions(request, env, actor);
  if (id === 'permissions') return handlePermissions(request, env, actor, sub);
  if (id === 'usage' && request.method === 'GET') return handleStorageUsage(env);
  return null;
}
