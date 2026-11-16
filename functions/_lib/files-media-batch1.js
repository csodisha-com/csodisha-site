// Files, Media & Cloud Batch 1 (v87): Modules 01-04
// 01 File Library | 02 Bulk Uploads | 03 Folders & Collections | 04 PDF Manager
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';

export const MEDIA_STATUSES = ['draft', 'published', 'archived'];
export const FILE_CATEGORIES = ['pdf', 'image', 'video', 'audio', 'document', 'archive'];
export const STORAGE_PROVIDERS = ['r2_primary', 'google_drive', 'external_cloud'];
export const ACCESS_TIERS = ['public', 'registered', 'admin_only'];
export const FOLDER_SCOPES = ['general', 'study_notes', 'pyq_archive', 'syllabus', 'exam_notices', 'schemes', 'branding_assets'];

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const _media1Ready = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function parseTags(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) { try { arr = JSON.parse(t); } catch { arr = t.split(','); } }
    else arr = t ? t.split(',') : [];
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => cleanStr(x, 48).toLowerCase()).filter(Boolean))].slice(0, 16);
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

function detectFileSignature(bytes, mimeHint = '', filename = '') {
  const b = new Uint8Array(bytes);
  const extHint = String(filename || '').split('.').pop().toLowerCase();
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return { ext: 'pdf', mime: 'application/pdf', category: 'pdf' };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg', category: 'image' };
  }
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { ext: 'png', mime: 'image/png', category: 'image' };
  }
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return { ext: 'webp', mime: 'image/webp', category: 'image' };
  }
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    return { ext: 'zip', mime: 'application/zip', category: 'archive' };
  }
  if (mimeHint === 'image/svg+xml' || extHint === 'svg') {
    return { ext: 'svg', mime: 'image/svg+xml', category: 'image' };
  }
  if (mimeHint === 'audio/mpeg' || extHint === 'mp3') {
    return { ext: 'mp3', mime: 'audio/mpeg', category: 'audio' };
  }
  if (mimeHint === 'video/mp4' || extHint === 'mp4') {
    return { ext: 'mp4', mime: 'video/mp4', category: 'video' };
  }
  return null;
}

async function sha256Hex(arrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

const STARTER_FOLDERS = [
  { id: 'mf-study-notes', parent_folder_id: null, slug: 'odisha-study-notes', name_en: 'Odisha Study Notes', name_or: 'ଓଡ଼ିଶା ଅଧ୍ୟୟନ ନୋଟ୍ସ', folder_scope: 'study_notes', icon_key: '📚', sort_order: 1, status: 'published' },
  { id: 'mf-pyq-archive', parent_folder_id: null, slug: 'previous-year-papers', name_en: 'Previous Year Papers', name_or: 'ପୂର୍ବ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର', folder_scope: 'pyq_archive', icon_key: '📝', sort_order: 2, status: 'published' },
  { id: 'mf-exam-notices', parent_folder_id: null, slug: 'official-exam-notifications', name_en: 'Official Exam Notifications', name_or: 'ସରକାରୀ ପରୀକ୍ଷା ବିଜ୍ଞପ୍ତି', folder_scope: 'exam_notices', icon_key: '📢', sort_order: 3, status: 'published' },
  { id: 'mf-schemes-pdfs', parent_folder_id: null, slug: 'government-schemes-pdfs', name_en: 'Government Schemes PDFs', name_or: 'ସରକାରୀ ଯୋଜନା PDF', folder_scope: 'schemes', icon_key: '🏛️', sort_order: 4, status: 'published' },
  { id: 'mf-branding-images', parent_folder_id: null, slug: 'portal-images-banners', name_en: 'Portal Images & Banners', name_or: 'ପୋର୍ଟାଲ୍ ଛବି ଏବଂ ବ୍ୟାନର୍', folder_scope: 'branding_assets', icon_key: '🖼️', sort_order: 5, status: 'published' }
];

const STARTER_FILES = [
  {
    id: 'mfile-odisha-gk-compendium',
    slug: 'odisha-gk-history-compendium-pdf',
    folder_id: 'mf-study-notes',
    file_category: 'pdf',
    storage_provider: 'r2_primary',
    r2_key: '',
    public_url: '/study-library/',
    original_filename: 'odisha-gk-compendium-2026.pdf',
    title_en: 'Odisha GK & History Complete Compendium (PDF)',
    title_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଏବଂ ଇତିହାସ PDF',
    mime_type: 'application/pdf',
    file_size_bytes: 2450000,
    page_count: 64,
    pdf_version: '1.7',
    watermark_enabled: 1,
    offline_ready: 1,
    access_tier: 'public',
    tags_json: JSON.stringify(['odisha-gk', 'notes', 'opsc']),
    status: 'published'
  },
  {
    id: 'mfile-portal-hero-banner',
    slug: 'csodisha-portal-hero-banner-webp',
    folder_id: 'mf-branding-images',
    file_category: 'image',
    storage_provider: 'r2_primary',
    r2_key: '',
    public_url: '/assets/og-banner.png',
    original_filename: 'csodisha-hero-banner.webp',
    title_en: 'Common Sense Odisha Portal Social Banner',
    title_or: 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ପୋର୍ଟାଲ୍ ବ୍ୟାନର୍',
    alt_or_caption_en: 'Common Sense Odisha Free Education & Jobs Portal',
    alt_or_caption_or: 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ମାଗଣା ଶିକ୍ଷା ଓ ଚାକିରି ପୋର୍ଟାଲ୍',
    mime_type: 'image/webp',
    file_size_bytes: 142000,
    access_tier: 'public',
    tags_json: JSON.stringify(['branding', 'banner']),
    status: 'published'
  }
];

async function bridgeExistingEduMedia(db) {
  try {
    const { results } = await db.prepare(
      `SELECT id, slug, title_en, title_or, r2_key, file_url, file_size_bytes, page_count, status FROM edu_resources WHERE file_url != '' OR r2_key != '' LIMIT 100`
    ).all();
    for (const r of results || []) {
      const fid = `mfile-edu-${r.id}`;
      await db.prepare(
        `INSERT OR IGNORE INTO media_files (id, slug, folder_id, file_category, storage_provider, r2_key, public_url, original_filename, title_en, title_or, mime_type, file_size_bytes, page_count, offline_ready, linked_modules_json, status)
         VALUES (?, ?, 'mf-study-notes', 'pdf', 'r2_primary', ?, ?, ?, ?, ?, 'application/pdf', ?, ?, 1, ?, ?)`
      ).bind(
        fid, `edu-${r.slug}`.slice(0, 95), r.r2_key || '', r.file_url || '', `${r.slug}.pdf`,
        r.title_en, r.title_or || '', Number(r.file_size_bytes || 0), Number(r.page_count || 0),
        JSON.stringify([{ module_code: '01', entity_id: r.id, title: r.title_en }]),
        r.status === 'published' ? 'published' : 'draft'
      ).run();
    }
  } catch {}
}

export async function ensureFilesMediaBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_media1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS media_folders (
      id TEXT PRIMARY KEY,
      parent_folder_id TEXT,
      slug TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      folder_scope TEXT NOT NULL DEFAULT 'general' CHECK (folder_scope IN (
        'general', 'study_notes', 'pyq_archive', 'syllabus', 'exam_notices', 'schemes', 'branding_assets'
      )),
      color_token TEXT NOT NULL DEFAULT 'teal',
      icon_key TEXT NOT NULL DEFAULT 'folder',
      access_tier TEXT NOT NULL DEFAULT 'public' CHECK (access_tier IN ('public', 'registered', 'admin_only')),
      sort_order INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON media_folders(parent_folder_id, status, sort_order)`,
    `CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      folder_id TEXT REFERENCES media_folders(id) ON DELETE SET NULL,
      file_category TEXT NOT NULL DEFAULT 'pdf' CHECK (file_category IN (
        'pdf', 'image', 'video', 'audio', 'document', 'archive'
      )),
      storage_provider TEXT NOT NULL DEFAULT 'r2_primary' CHECK (storage_provider IN (
        'r2_primary', 'google_drive', 'external_cloud'
      )),
      r2_key TEXT NOT NULL DEFAULT '',
      public_url TEXT NOT NULL DEFAULT '',
      external_url TEXT NOT NULL DEFAULT '',
      original_filename TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      alt_or_caption_en TEXT NOT NULL DEFAULT '',
      alt_or_caption_or TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT 'application/pdf',
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      sha256_hash TEXT NOT NULL DEFAULT '',
      page_count INTEGER NOT NULL DEFAULT 0,
      pdf_version TEXT NOT NULL DEFAULT '',
      watermark_enabled INTEGER NOT NULL DEFAULT 0,
      offline_ready INTEGER NOT NULL DEFAULT 0,
      access_tier TEXT NOT NULL DEFAULT 'public' CHECK (access_tier IN ('public', 'registered', 'admin_only')),
      tags_json TEXT NOT NULL DEFAULT '[]',
      linked_modules_json TEXT NOT NULL DEFAULT '[]',
      download_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      uploaded_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_files_cat_status ON media_files(file_category, status, updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_media_files_folder ON media_files(folder_id, status)`,
    `CREATE TABLE IF NOT EXISTS media_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_rev_entity ON media_revisions(module_code, entity_id, version_num DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  const fldCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_folders`).first();
  if (!fldCnt || Number(fldCnt.n || 0) === 0) {
    for (const f of STARTER_FOLDERS) {
      await db.prepare(
        `INSERT OR IGNORE INTO media_folders (id, parent_folder_id, slug, name_en, name_or, folder_scope, icon_key, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(f.id, f.parent_folder_id, f.slug, f.name_en, f.name_or, f.folder_scope, f.icon_key, f.sort_order, f.status).run();
    }
  }

  const fileCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_files`).first();
  if (!fileCnt || Number(fileCnt.n || 0) === 0) {
    for (const m of STARTER_FILES) {
      await db.prepare(
        `INSERT OR IGNORE INTO media_files (id, slug, folder_id, file_category, storage_provider, r2_key, public_url, original_filename, title_en, title_or, alt_or_caption_en, alt_or_caption_or, mime_type, file_size_bytes, page_count, pdf_version, watermark_enabled, offline_ready, access_tier, tags_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        m.id, m.slug, m.folder_id, m.file_category, m.storage_provider, m.r2_key, m.public_url, m.original_filename,
        m.title_en, m.title_or, m.alt_or_caption_en || '', m.alt_or_caption_or || '', m.mime_type,
        m.file_size_bytes, m.page_count || 0, m.pdf_version || '', m.watermark_enabled || 0, m.offline_ready || 0,
        m.access_tier, m.tags_json, m.status
      ).run();
    }
    await bridgeExistingEduMedia(db);
  }

  _media1Ready.add(db);
}

export async function getFilesMediaOverview(env) {
  await ensureFilesMediaBatch1Schema(env.DB);
  const [filesRes, fldRes] = await Promise.all([
    env.DB.prepare(`SELECT file_category, file_size_bytes, title_or FROM media_files`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_folders`).first()
  ]);
  const rows = filesRes.results || [];
  const totalBytes = rows.reduce((s, r) => s + Number(r.file_size_bytes || 0), 0);
  const biCount = rows.filter(r => Boolean(String(r.title_or || '').trim())).length;
  return {
    total_files: rows.length,
    pdf_count: rows.filter(r => r.file_category === 'pdf').length,
    image_count: rows.filter(r => r.file_category === 'image').length,
    folder_count: Number(fldRes?.n || 0),
    total_r2_bytes: totalBytes,
    bilingual_pct: rows.length ? Math.round((biCount / rows.length) * 100) : 100
  };
}

function formatFile(row) {
  if (!row) return null;
  return {
    ...row,
    watermark_enabled: Boolean(row.watermark_enabled),
    offline_ready: Boolean(row.offline_ready),
    tags: parseJson(row.tags_json, []),
    linked_modules: parseJson(row.linked_modules_json, [])
  };
}

// ---------- Modules 01 & 04: File Library & PDF Manager ----------
async function handleFiles(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const cat = url.searchParams.get('file_category') || '';
      const folderId = url.searchParams.get('folder_id') || '';
      const prov = url.searchParams.get('storage_provider') || '';
      const tier = url.searchParams.get('access_tier') || '';
      const status = url.searchParams.get('status') || '';
      const tag = (url.searchParams.get('tag') || '').trim();
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (cat && FILE_CATEGORIES.includes(cat)) { where.push('file_category = ?'); binds.push(cat); }
      if (folderId) { where.push('folder_id = ?'); binds.push(folderId); }
      if (prov && STORAGE_PROVIDERS.includes(prov)) { where.push('storage_provider = ?'); binds.push(prov); }
      if (tier && ACCESS_TIERS.includes(tier)) { where.push('access_tier = ?'); binds.push(tier); }
      if (status && MEDIA_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (tag) { where.push(`tags_json LIKE ? ESCAPE '\\'`); binds.push(`%${likeEscape(tag)}%`); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(title_en LIKE ? ESCAPE '\\' OR original_filename LIKE ? ESCAPE '\\')`); binds.push(l, l); }

      const { results } = await env.DB.prepare(`SELECT * FROM media_files WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT 250`).bind(...binds).all();
      const countWhere = cat && FILE_CATEGORIES.includes(cat) ? `WHERE file_category = '${cat}'` : '';
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM media_files ${countWhere}`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }

      const { results: folders } = await env.DB.prepare(`SELECT id, name_en FROM media_folders ORDER BY sort_order ASC`).all();
      return json({ ok: true, items: (results || []).map(formatFile), counts, folders: folders || [] });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !MEDIA_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE media_files SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      if (body.action === 'bulk_move_folder') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        const folderId = body.folder_id ? cleanStr(body.folder_id, 100) : null;
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE media_files SET folder_id = ?, updated_at = datetime('now') WHERE id = ?`).bind(folderId, itemId).run();
        }
        return json({ ok: true, moved: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const cat = FILE_CATEGORIES.includes(body.file_category) ? body.file_category : 'pdf';
      const prov = STORAGE_PROVIDERS.includes(body.storage_provider) ? body.storage_provider : 'r2_primary';
      const tier = ACCESS_TIERS.includes(body.access_tier) ? body.access_tier : 'public';
      const status = MEDIA_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'file';
      const dup = await env.DB.prepare(`SELECT id FROM media_files WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mfile-${crypto.randomUUID().slice(0, 10)}`;
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO media_files (id, slug, folder_id, file_category, storage_provider, r2_key, public_url, external_url, original_filename, title_en, title_or, alt_or_caption_en, alt_or_caption_or, mime_type, file_size_bytes, sha256_hash, page_count, pdf_version, watermark_enabled, offline_ready, access_tier, tags_json, status, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, body.folder_id || null, cat, prov, cleanStr(body.r2_key || '', 240),
        validateSafeUrl(body.public_url || ''), validateSafeUrl(body.external_url || ''),
        cleanStr(body.original_filename || `${finalSlug}.${cat === 'image' ? 'webp' : 'pdf'}`, 200),
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.alt_or_caption_en || '', 300),
        cleanStr(body.alt_or_caption_or || '', 300), cleanStr(body.mime_type || 'application/pdf', 100),
        Number(body.file_size_bytes || 0), cleanStr(body.sha256_hash || '', 80), Number(body.page_count || 0),
        cleanStr(body.pdf_version || '', 20), body.watermark_enabled ? 1 : 0, body.offline_ready ? 1 : 0,
        tier, JSON.stringify(tags), status, cleanStr(actor.email || 'admin', 120)
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(newId).first();
      await saveMediaRevision(env.DB, cat === 'pdf' ? '04' : '01', newId, created, 'Created media file entry', actor.email);
      await audit(env, request, actor, 'media.file.create', 'media_files', newId);
      return json({ ok: true, item: formatFile(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Media file not found');
  const modCode = existing.file_category === 'pdf' ? '04' : '01';

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM media_revisions WHERE module_code = ? AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(modCode, id).all();
    return json({ ok: true, item: formatFile(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const tier = ACCESS_TIERS.includes(body.access_tier) ? body.access_tier : existing.access_tier;
    const status = MEDIA_STATUSES.includes(body.status) ? body.status : existing.status;
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE media_files SET folder_id = ?, title_en = ?, title_or = ?, alt_or_caption_en = ?, alt_or_caption_or = ?, page_count = ?, pdf_version = ?, watermark_enabled = ?, offline_ready = ?, access_tier = ?, tags_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      body.folder_id !== undefined ? (body.folder_id || null) : existing.folder_id,
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.alt_or_caption_en ?? existing.alt_or_caption_en, 300), cleanStr(body.alt_or_caption_or ?? existing.alt_or_caption_or, 300),
      Number(body.page_count ?? existing.page_count), cleanStr(body.pdf_version ?? existing.pdf_version, 20),
      body.watermark_enabled !== undefined ? (body.watermark_enabled ? 1 : 0) : existing.watermark_enabled,
      body.offline_ready !== undefined ? (body.offline_ready ? 1 : 0) : existing.offline_ready,
      tier, JSON.stringify(tags), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(id).first();
    await saveMediaRevision(env.DB, modCode, id, updated, body.change_note || 'Updated file metadata', actor.email);
    return json({ ok: true, item: formatFile(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `mfile-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO media_files (id, slug, folder_id, file_category, storage_provider, r2_key, public_url, external_url, original_filename, title_en, title_or, alt_or_caption_en, alt_or_caption_or, mime_type, file_size_bytes, sha256_hash, page_count, pdf_version, watermark_enabled, offline_ready, access_tier, tags_json, status, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.folder_id, existing.file_category, existing.storage_provider, existing.r2_key, existing.public_url, existing.external_url, existing.original_filename, `${existing.title_en} (Copy)`, existing.title_or, existing.alt_or_caption_en, existing.alt_or_caption_or, existing.mime_type, existing.file_size_bytes, existing.sha256_hash, existing.page_count, existing.pdf_version, existing.watermark_enabled, existing.offline_ready, existing.access_tier, existing.tags_json, actor.email).run();
      const cloned = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatFile(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM media_revisions WHERE id = ? AND module_code = ? AND entity_id = ?`).bind(body.revision_id, modCode, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE media_files SET title_en = ?, watermark_enabled = ?, offline_ready = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.watermark_enabled ? 1 : 0, snap.offline_ready ? 1 : 0, snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatFile(rolled) });
    }
    if (body.status && MEDIA_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE media_files SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatFile(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM media_files WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 02: Single & Bulk Upload ----------
async function handleMediaVaultUpload(request, env, actor) {
  const formData = await request.formData();
  const folderId = cleanStr(formData.get('folder_id') || '', 100) || null;
  const accessTier = ACCESS_TIERS.includes(formData.get('access_tier')) ? formData.get('access_tier') : 'public';
  const tags = parseTags(formData.get('tags') || '');
  const rawFiles = [...formData.getAll('files'), formData.get('file')].filter(f => f && typeof f === 'object' && typeof f.arrayBuffer === 'function');
  if (!rawFiles.length) throw validationError({ file: 'Provide at least one file' });

  const year = new Date().getUTCFullYear();
  const uploadedItems = [];

  for (const f of rawFiles.slice(0, 20)) {
    const buf = await f.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_FILE_BYTES) {
      throw new HttpError(400, 'INVALID_FILE_SIZE', `File ${f.name || 'upload'} exceeds 25 MB or is empty`);
    }
    const sig = detectFileSignature(buf, f.type, f.name);
    if (!sig) {
      throw new HttpError(400, 'UNSUPPORTED_FILE', `Unsupported file signature for ${f.name || 'upload'}`);
    }
    const hash = await sha256Hex(buf);
    const uuid = crypto.randomUUID();
    const r2Key = `vault/${sig.category}/${year}/${uuid}.${sig.ext}`;
    if (env.MEDIA && typeof env.MEDIA.put === 'function') {
      await env.MEDIA.put(r2Key, buf, { httpMetadata: { contentType: sig.mime } });
    }
    const publicUrl = `/api/media/${r2Key}`;
    const fileId = `mfile-${uuid.slice(0, 10)}`;
    const baseName = cleanStr((f.name || 'upload').replace(/\.[^.]+$/, ''), 160) || 'Uploaded File';
    const fileSlug = `${slugify(baseName).slice(0, 80)}-${uuid.slice(0, 5)}`;

    await env.DB.prepare(
      `INSERT INTO media_files (id, slug, folder_id, file_category, storage_provider, r2_key, public_url, original_filename, title_en, mime_type, file_size_bytes, sha256_hash, offline_ready, access_tier, tags_json, status, uploaded_by)
       VALUES (?, ?, ?, ?, 'r2_primary', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`
    ).bind(
      fileId, fileSlug, folderId, sig.category, r2Key, publicUrl, cleanStr(f.name || `${fileSlug}.${sig.ext}`, 200),
      baseName, sig.mime, buf.byteLength, hash, sig.category === 'pdf' ? 1 : 0, accessTier,
      JSON.stringify(tags), cleanStr(actor.email || 'admin', 120)
    ).run();

    const created = await env.DB.prepare(`SELECT * FROM media_files WHERE id = ?`).bind(fileId).first();
    await saveMediaRevision(env.DB, sig.category === 'pdf' ? '04' : '01', fileId, created, 'Uploaded via Vault Bulk Upload', actor.email);
    uploadedItems.push(formatFile(created));
  }

  await audit(env, request, actor, 'media.vault.upload', 'media_files', uploadedItems[0]?.id || null, { count: uploadedItems.length });
  return json({
    ok: true,
    uploaded_count: uploadedItems.length,
    key: uploadedItems[0]?.r2_key || '',
    url: uploadedItems[0]?.public_url || '',
    items: uploadedItems
  }, 201);
}

// ---------- Module 03: Folders & Collections ----------
async function handleFolders(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && MEDIA_STATUSES.includes(status)) { where.push('f.status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(f.name_en LIKE ? ESCAPE '\\' OR f.name_or LIKE ? ESCAPE '\\')`); binds.push(l, l); }

      const { results } = await env.DB.prepare(
        `SELECT f.*, COUNT(m.id) AS file_count, COALESCE(SUM(m.file_size_bytes), 0) AS total_size_bytes
         FROM media_folders f
         LEFT JOIN media_files m ON m.folder_id = f.id
         WHERE ${where.join(' AND ')}
         GROUP BY f.id
         ORDER BY f.sort_order ASC, f.updated_at DESC`
      ).bind(...binds).all();

      const { results: allRows } = await env.DB.prepare(`SELECT status FROM media_folders`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: results || [], counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 100_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !MEDIA_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE media_folders SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const name_en = cleanStr(body.name_en || '', 160);
      if (!name_en) throw validationError({ name_en: 'name_en is required' });
      const scope = FOLDER_SCOPES.includes(body.folder_scope) ? body.folder_scope : 'general';
      const tier = ACCESS_TIERS.includes(body.access_tier) ? body.access_tier : 'public';
      const status = MEDIA_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || name_en).slice(0, 90) || 'folder';
      const dup = await env.DB.prepare(`SELECT id FROM media_folders WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mf-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO media_folders (id, parent_folder_id, slug, name_en, name_or, description_en, description_or, folder_scope, icon_key, access_tier, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, body.parent_folder_id || null, finalSlug, name_en, cleanStr(body.name_or || '', 160),
        cleanStr(body.description_en || '', 500), cleanStr(body.description_or || '', 500),
        scope, cleanStr(body.icon_key || '📁', 24), tier, Number(body.sort_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM media_folders WHERE id = ?`).bind(newId).first();
      await saveMediaRevision(env.DB, '03', newId, created, 'Created folder', actor.email);
      return json({ ok: true, item: created }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM media_folders WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Folder not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM media_revisions WHERE module_code = '03' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: existing, revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 100_000);
    const scope = FOLDER_SCOPES.includes(body.folder_scope) ? body.folder_scope : existing.folder_scope;
    const tier = ACCESS_TIERS.includes(body.access_tier) ? body.access_tier : existing.access_tier;
    const status = MEDIA_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE media_folders SET parent_folder_id = ?, name_en = ?, name_or = ?, description_en = ?, folder_scope = ?, icon_key = ?, access_tier = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      body.parent_folder_id !== undefined ? (body.parent_folder_id || null) : existing.parent_folder_id,
      cleanStr(body.name_en ?? existing.name_en, 160), cleanStr(body.name_or ?? existing.name_or, 160),
      cleanStr(body.description_en ?? existing.description_en, 500), scope,
      cleanStr(body.icon_key ?? existing.icon_key, 24), tier, Number(body.sort_order ?? existing.sort_order), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM media_folders WHERE id = ?`).bind(id).first();
    await saveMediaRevision(env.DB, '03', id, updated, body.change_note || 'Updated folder', actor.email);
    return json({ ok: true, item: updated });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `mf-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO media_folders (id, parent_folder_id, slug, name_en, name_or, description_en, folder_scope, icon_key, access_tier, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, existing.parent_folder_id, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, `${existing.name_en} (Copy)`, existing.name_or, existing.description_en, existing.folder_scope, existing.icon_key, existing.access_tier, existing.sort_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM media_folders WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: cloned }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM media_revisions WHERE id = ? AND module_code = '03' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE media_folders SET name_en = ?, access_tier = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.name_en, snap.access_tier || 'public', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM media_folders WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: rolled });
    }
    if (body.status && MEDIA_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE media_folders SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM media_folders WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: patched });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM media_folders WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleFilesMediaBatch1Admin(request, env, actor, id, sub) {
  await ensureFilesMediaBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json({ ok: true, ...(await getFilesMediaOverview(env)) });
  }
  if (id === 'files') return handleFiles(request, env, actor, sub);
  if (id === 'folders') return handleFolders(request, env, actor, sub);
  if (id === 'upload' && request.method === 'POST') return handleMediaVaultUpload(request, env, actor);
  return null;
}
