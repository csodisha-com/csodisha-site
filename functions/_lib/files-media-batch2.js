// Files, Media & Cloud Batch 2 (v88): Modules 05-08
// 05 Image Library | 06 Video & Audio | 07 Cloud Links | 08 Google Drive Links
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import {
  ensureFilesMediaBatch1Schema,
  MEDIA_STATUSES,
  ACCESS_TIERS
} from './files-media-batch1.js';

export const IMAGE_CONTEXTS = ['hero_banner', 'study_diagram', 'book_cover', 'social_og_card', 'icon_badge'];
export const AV_SOURCE_MODES = ['r2_upload', 'youtube_embed', 'vimeo_embed', 'external_stream'];
export const CLOUD_CONNECTORS = ['google_drive', 'onedrive', 'dropbox', 'internet_archive', 'github_raw', 'custom_cdn'];
export const DRIVE_KINDS = ['pdf_file', 'folder_share', 'google_doc', 'google_sheet', 'google_slides', 'video_file', 'other'];

const _media2Ready = new WeakSet();

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

export function parseGoogleDriveUrl(rawUrl) {
  const urlStr = validateSafeUrl(rawUrl);
  if (!urlStr) throw validationError({ raw_share_url: 'Share URL is required' });
  let u;
  try { u = new URL(urlStr); } catch { throw validationError({ raw_share_url: 'Valid Google Drive URL required' }); }

  const path = u.pathname;
  let id = '';
  let kind = 'other';

  const mFolder = path.match(/\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/);
  const mFile = path.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const mDoc = path.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  const mSheet = path.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const mSlide = path.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  const qId = u.searchParams.get('id') || '';

  if (mFolder) {
    id = mFolder[1]; kind = 'folder_share';
    return {
      drive_file_id: id,
      drive_resource_kind: kind,
      raw_share_url: urlStr,
      preview_embed_url: `https://drive.google.com/embeddedfolderview?id=${id}#list`,
      direct_download_url: `https://drive.google.com/drive/folders/${id}`
    };
  }
  if (mFile) {
    id = mFile[1]; kind = 'pdf_file';
    return {
      drive_file_id: id,
      drive_resource_kind: kind,
      raw_share_url: urlStr,
      preview_embed_url: `https://drive.google.com/file/d/${id}/preview`,
      direct_download_url: `https://drive.google.com/uc?export=download&id=${id}`
    };
  }
  if (mDoc) {
    id = mDoc[1]; kind = 'google_doc';
    return {
      drive_file_id: id,
      drive_resource_kind: kind,
      raw_share_url: urlStr,
      preview_embed_url: `https://docs.google.com/document/d/${id}/preview`,
      direct_download_url: `https://docs.google.com/document/d/${id}/export?format=pdf`
    };
  }
  if (mSheet) {
    id = mSheet[1]; kind = 'google_sheet';
    return {
      drive_file_id: id,
      drive_resource_kind: kind,
      raw_share_url: urlStr,
      preview_embed_url: `https://docs.google.com/spreadsheets/d/${id}/preview`,
      direct_download_url: `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
    };
  }
  if (mSlide) {
    id = mSlide[1]; kind = 'google_slides';
    return {
      drive_file_id: id,
      drive_resource_kind: kind,
      raw_share_url: urlStr,
      preview_embed_url: `https://docs.google.com/presentation/d/${id}/preview`,
      direct_download_url: `https://docs.google.com/presentation/d/${id}/export/pdf`
    };
  }
  if (qId) {
    id = qId; kind = 'pdf_file';
    return {
      drive_file_id: id,
      drive_resource_kind: kind,
      raw_share_url: urlStr,
      preview_embed_url: `https://drive.google.com/file/d/${id}/preview`,
      direct_download_url: `https://drive.google.com/uc?export=download&id=${id}`
    };
  }
  return {
    drive_file_id: '',
    drive_resource_kind: 'other',
    raw_share_url: urlStr,
    preview_embed_url: urlStr,
    direct_download_url: urlStr
  };
}

export async function ensureFilesMediaBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureFilesMediaBatch1Schema(db);
  if (_media2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS media_image_meta (
      file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
      width_px INTEGER NOT NULL DEFAULT 0,
      height_px INTEGER NOT NULL DEFAULT 0,
      aspect_ratio TEXT NOT NULL DEFAULT '',
      dominant_color TEXT NOT NULL DEFAULT '#0f766e',
      usage_context TEXT NOT NULL DEFAULT 'study_diagram' CHECK (usage_context IN (
        'hero_banner', 'study_diagram', 'book_cover', 'social_og_card', 'icon_badge'
      )),
      webp_optimized INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS media_av_meta (
      file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
      media_kind TEXT NOT NULL DEFAULT 'video' CHECK (media_kind IN ('video', 'audio')),
      source_mode TEXT NOT NULL DEFAULT 'youtube_embed' CHECK (source_mode IN (
        'r2_upload', 'youtube_embed', 'vimeo_embed', 'external_stream'
      )),
      embed_id_or_url TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      transcript_en TEXT NOT NULL DEFAULT '',
      transcript_or TEXT NOT NULL DEFAULT '',
      chapters_json TEXT NOT NULL DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS media_cloud_links (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      connector_type TEXT NOT NULL DEFAULT 'custom_cdn' CHECK (connector_type IN (
        'google_drive', 'onedrive', 'dropbox', 'internet_archive', 'github_raw', 'custom_cdn'
      )),
      drive_resource_kind TEXT NOT NULL DEFAULT 'other' CHECK (drive_resource_kind IN (
        'pdf_file', 'folder_share', 'google_doc', 'google_sheet', 'google_slides', 'video_file', 'other'
      )),
      drive_file_id TEXT NOT NULL DEFAULT '',
      raw_share_url TEXT NOT NULL,
      preview_embed_url TEXT NOT NULL DEFAULT '',
      direct_download_url TEXT NOT NULL DEFAULT '',
      folder_id TEXT REFERENCES media_folders(id) ON DELETE SET NULL,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      estimated_size_label TEXT NOT NULL DEFAULT '',
      access_tier TEXT NOT NULL DEFAULT 'public' CHECK (access_tier IN ('public', 'registered', 'admin_only')),
      link_health_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (link_health_status IN ('ok', 'broken', 'restricted', 'unchecked')),
      last_checked_at TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      linked_modules_json TEXT NOT NULL DEFAULT '[]',
      click_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_cloud_conn_status ON media_cloud_links(connector_type, status, updated_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed image meta for existing starter banner
  await db.prepare(
    `INSERT OR IGNORE INTO media_image_meta (file_id, width_px, height_px, aspect_ratio, usage_context, webp_optimized)
     VALUES ('mfile-portal-hero-banner', 1200, 630, '1.91:1', 'social_og_card', 1)`
  ).run();

  // Seed starter Video/Audio lecture if none exist
  const avCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_files WHERE file_category IN ('video', 'audio')`).first();
  if (!avCnt || Number(avCnt.n || 0) === 0) {
    await db.prepare(
      `INSERT OR IGNORE INTO media_files (id, slug, folder_id, file_category, storage_provider, public_url, title_en, title_or, mime_type, access_tier, tags_json, status)
       VALUES ('mfile-av-paika-lecture', 'paika-rebellion-1817-video-lecture', 'mf-study-notes', 'video', 'external_cloud', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Odisha History: 1817 Paika Rebellion Revision Lecture', 'ଓଡ଼ିଶା ଇତିହାସ: ୧୮୧୭ ପାଇକ ବିଦ୍ରୋହ ଭିଡିଓ', 'video/mp4', 'public', '["odisha-history","opsc"]', 'published')`
    ).run();
    await db.prepare(
      `INSERT OR IGNORE INTO media_av_meta (file_id, media_kind, source_mode, embed_id_or_url, duration_seconds, transcript_en, chapters_json)
       VALUES ('mfile-av-paika-lecture', 'video', 'youtube_embed', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 920, 'Summary of Buxi Jagabandhu and the 1817 Khordha uprising.', ?)`
    ).bind(JSON.stringify([{ time_sec: 0, label_en: 'Background of Khordha', label_or: 'ଖୋର୍ଦ୍ଧା ପୃଷ୍ଠଭୂମି' }, { time_sec: 320, label_en: 'Role of Buxi Jagabandhu', label_or: 'ବକ୍ସି ଜଗବନ୍ଧୁଙ୍କ ଭୂମିକା' }])).run();
  }

  // Seed starter Cloud Links & Google Drive Links
  const clCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_cloud_links`).first();
  if (!clCnt || Number(clCnt.n || 0) === 0) {
    await db.prepare(
      `INSERT OR IGNORE INTO media_cloud_links (id, slug, connector_type, drive_resource_kind, raw_share_url, preview_embed_url, direct_download_url, folder_id, title_en, title_or, estimated_size_label, link_health_status, status)
       VALUES ('mcl-archive-odisha-gazette', 'internet-archive-odisha-reference-books', 'internet_archive', 'other', 'https://archive.org/details/texts', 'https://archive.org/details/texts', 'https://archive.org/details/texts', 'mf-study-notes', 'Internet Archive: Public Domain Odisha Reference Books', 'ଇଣ୍ଟରନେଟ୍ ଆର୍କାଇଭ୍ ଓଡ଼ିଶା ପୁସ୍ତକ', '45 MB', 'ok', 'published')`
    ).run();
    await db.prepare(
      `INSERT OR IGNORE INTO media_cloud_links (id, slug, connector_type, drive_resource_kind, drive_file_id, raw_share_url, preview_embed_url, direct_download_url, folder_id, title_en, title_or, estimated_size_label, link_health_status, status)
       VALUES ('mcl-gdrive-opsc-pyq-folder', 'gdrive-opsc-oas-pyq-archive-folder', 'google_drive', 'folder_share', '1AbCdEfGhIjKlMnOpQrStUvWxYz', 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz', 'https://drive.google.com/embeddedfolderview?id=1AbCdEfGhIjKlMnOpQrStUvWxYz#list', 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz', 'mf-pyq-archive', 'Google Drive: OPSC OAS 2015-2025 PYQ Bundle', 'ଗୁଗୁଲ୍ ଡ୍ରାଇଭ୍: OPSC OAS PYQ ଫୋଲ୍ଡର୍', '120 MB', 'ok', 'published')`
    ).run();
  }

  _media2Ready.add(db);
}

export async function getFilesMediaBatch2Overview(env) {
  await ensureFilesMediaBatch2Schema(env.DB);
  const [imgRow, avRow, clRes] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_files WHERE file_category = 'image'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_files WHERE file_category IN ('video', 'audio')`).first(),
    env.DB.prepare(`SELECT connector_type, link_health_status FROM media_cloud_links`).all()
  ]);
  const links = clRes.results || [];
  return {
    images: Number(imgRow?.n || 0),
    av_items: Number(avRow?.n || 0),
    cloud_links: links.filter(l => l.connector_type !== 'google_drive').length,
    gdrive_links: links.filter(l => l.connector_type === 'google_drive').length,
    healthy_links: links.filter(l => l.link_health_status === 'ok').length,
    broken_links: links.filter(l => l.link_health_status === 'broken').length
  };
}

// ---------- Module 05: Image Library ----------
function formatImage(row) {
  if (!row) return null;
  return {
    ...row,
    webp_optimized: Boolean(row.webp_optimized ?? 1),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleImages(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const ctx = url.searchParams.get('usage_context') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [`f.file_category = 'image'`]; const binds = [];
      if (ctx && IMAGE_CONTEXTS.includes(ctx)) { where.push('m.usage_context = ?'); binds.push(ctx); }
      if (status && MEDIA_STATUSES.includes(status)) { where.push('f.status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(f.title_en LIKE ? ESCAPE '\\' OR f.alt_or_caption_en LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(
        `SELECT f.*, m.width_px, m.height_px, m.aspect_ratio, m.dominant_color, m.usage_context, m.webp_optimized
         FROM media_files f LEFT JOIN media_image_meta m ON m.file_id = f.id
         WHERE ${where.join(' AND ')} ORDER BY f.updated_at DESC`
      ).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM media_files WHERE file_category = 'image'`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatImage), counts });
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
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const status = MEDIA_STATUSES.includes(body.status) ? body.status : 'draft';
      const ctx = IMAGE_CONTEXTS.includes(body.usage_context) ? body.usage_context : 'study_diagram';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'image';
      const dup = await env.DB.prepare(`SELECT id FROM media_files WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mfile-${crypto.randomUUID().slice(0, 10)}`;
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO media_files (id, slug, folder_id, file_category, storage_provider, public_url, original_filename, title_en, title_or, alt_or_caption_en, alt_or_caption_or, mime_type, file_size_bytes, tags_json, status, uploaded_by)
         VALUES (?, ?, ?, 'image', 'r2_primary', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, body.folder_id || 'mf-branding-images', validateSafeUrl(body.public_url || '/assets/og-banner.png'),
        cleanStr(body.original_filename || `${finalSlug}.webp`, 200), title_en, cleanStr(body.title_or || '', 220),
        cleanStr(body.alt_or_caption_en || '', 300), cleanStr(body.alt_or_caption_or || '', 300),
        cleanStr(body.mime_type || 'image/webp', 80), Number(body.file_size_bytes || 0), JSON.stringify(tags), status, actor.email
      ).run();
      await env.DB.prepare(
        `INSERT INTO media_image_meta (file_id, width_px, height_px, aspect_ratio, dominant_color, usage_context, webp_optimized)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId, Number(body.width_px || 1200), Number(body.height_px || 630), cleanStr(body.aspect_ratio || '16:9', 20), cleanStr(body.dominant_color || '#0f766e', 20), ctx, body.webp_optimized !== false ? 1 : 0).run();
      const created = await env.DB.prepare(`SELECT f.*, m.width_px, m.height_px, m.aspect_ratio, m.dominant_color, m.usage_context, m.webp_optimized FROM media_files f LEFT JOIN media_image_meta m ON m.file_id = f.id WHERE f.id = ?`).bind(newId).first();
      await saveMediaRevision(env.DB, '05', newId, created, 'Created image entry', actor.email);
      return json({ ok: true, item: formatImage(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT f.*, m.width_px, m.height_px, m.aspect_ratio, m.dominant_color, m.usage_context, m.webp_optimized FROM media_files f LEFT JOIN media_image_meta m ON m.file_id = f.id WHERE f.id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Image not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(`SELECT id, version_num, change_note, created_by, created_at FROM media_revisions WHERE module_code = '05' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`).bind(id).all();
    return json({ ok: true, item: formatImage(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const status = MEDIA_STATUSES.includes(body.status) ? body.status : existing.status;
    const ctx = IMAGE_CONTEXTS.includes(body.usage_context) ? body.usage_context : (existing.usage_context || 'study_diagram');
    await env.DB.prepare(`UPDATE media_files SET title_en = ?, title_or = ?, alt_or_caption_en = ?, alt_or_caption_or = ?, public_url = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220), cleanStr(body.alt_or_caption_en ?? existing.alt_or_caption_en, 300), cleanStr(body.alt_or_caption_or ?? existing.alt_or_caption_or, 300), validateSafeUrl(body.public_url ?? existing.public_url), status, id).run();
    await env.DB.prepare(`INSERT INTO media_image_meta (file_id, width_px, height_px, aspect_ratio, usage_context, webp_optimized) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(file_id) DO UPDATE SET width_px = excluded.width_px, height_px = excluded.height_px, usage_context = excluded.usage_context, webp_optimized = excluded.webp_optimized`)
      .bind(id, Number(body.width_px ?? existing.width_px ?? 0), Number(body.height_px ?? existing.height_px ?? 0), cleanStr(body.aspect_ratio ?? existing.aspect_ratio ?? '', 20), ctx, body.webp_optimized !== undefined ? (body.webp_optimized ? 1 : 0) : 1).run();
    const updated = await env.DB.prepare(`SELECT f.*, m.width_px, m.height_px, m.aspect_ratio, m.dominant_color, m.usage_context, m.webp_optimized FROM media_files f LEFT JOIN media_image_meta m ON m.file_id = f.id WHERE f.id = ?`).bind(id).first();
    await saveMediaRevision(env.DB, '05', id, updated, body.change_note || 'Updated image', actor.email);
    return json({ ok: true, item: formatImage(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM media_revisions WHERE id = ? AND module_code = '05' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE media_files SET title_en = ?, alt_or_caption_en = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).bind(snap.title_en, snap.alt_or_caption_en || '', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT f.*, m.width_px, m.height_px, m.aspect_ratio, m.dominant_color, m.usage_context, m.webp_optimized FROM media_files f LEFT JOIN media_image_meta m ON m.file_id = f.id WHERE f.id = ?`).bind(id).first();
      return json({ ok: true, item: formatImage(rolled) });
    }
    if (body.status && MEDIA_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE media_files SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT f.*, m.width_px, m.height_px, m.aspect_ratio, m.dominant_color, m.usage_context, m.webp_optimized FROM media_files f LEFT JOIN media_image_meta m ON m.file_id = f.id WHERE f.id = ?`).bind(id).first();
      return json({ ok: true, item: formatImage(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM media_files WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 06: Video & Audio ----------
function formatAv(row) {
  if (!row) return null;
  return { ...row, chapters: parseJson(row.chapters_json, []), tags: parseJson(row.tags_json, []) };
}

async function handleAv(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const kind = url.searchParams.get('media_kind') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [`f.file_category IN ('video', 'audio')`]; const binds = [];
      if (kind === 'video' || kind === 'audio') { where.push('f.file_category = ?'); binds.push(kind); }
      if (status && MEDIA_STATUSES.includes(status)) { where.push('f.status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(f.title_en LIKE ? ESCAPE '\\' OR a.transcript_en LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(
        `SELECT f.*, a.media_kind, a.source_mode, a.embed_id_or_url, a.duration_seconds, a.transcript_en, a.transcript_or, a.chapters_json
         FROM media_files f LEFT JOIN media_av_meta a ON a.file_id = f.id
         WHERE ${where.join(' AND ')} ORDER BY f.updated_at DESC`
      ).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM media_files WHERE file_category IN ('video', 'audio')`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatAv), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 250_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !MEDIA_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE media_files SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const kind = body.media_kind === 'audio' ? 'audio' : 'video';
      const srcMode = AV_SOURCE_MODES.includes(body.source_mode) ? body.source_mode : 'youtube_embed';
      const status = MEDIA_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'av';
      const dup = await env.DB.prepare(`SELECT id FROM media_files WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mfile-${crypto.randomUUID().slice(0, 10)}`;
      const chapters = parseJson(body.chapters ?? body.chapters_json, []);
      await env.DB.prepare(
        `INSERT INTO media_files (id, slug, folder_id, file_category, storage_provider, public_url, title_en, title_or, mime_type, status, uploaded_by)
         VALUES (?, ?, 'mf-study-notes', ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, kind, srcMode === 'r2_upload' ? 'r2_primary' : 'external_cloud',
        validateSafeUrl(body.embed_id_or_url || body.public_url || ''), title_en, cleanStr(body.title_or || '', 220),
        kind === 'audio' ? 'audio/mpeg' : 'video/mp4', status, actor.email
      ).run();
      await env.DB.prepare(
        `INSERT INTO media_av_meta (file_id, media_kind, source_mode, embed_id_or_url, duration_seconds, transcript_en, transcript_or, chapters_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId, kind, srcMode, validateSafeUrl(body.embed_id_or_url || ''), Number(body.duration_seconds || 0), cleanStr(body.transcript_en || '', 4000), cleanStr(body.transcript_or || '', 4000), JSON.stringify(chapters)).run();
      const created = await env.DB.prepare(`SELECT f.*, a.media_kind, a.source_mode, a.embed_id_or_url, a.duration_seconds, a.transcript_en, a.transcript_or, a.chapters_json FROM media_files f LEFT JOIN media_av_meta a ON a.file_id = f.id WHERE f.id = ?`).bind(newId).first();
      await saveMediaRevision(env.DB, '06', newId, created, 'Created A/V item', actor.email);
      return json({ ok: true, item: formatAv(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT f.*, a.media_kind, a.source_mode, a.embed_id_or_url, a.duration_seconds, a.transcript_en, a.transcript_or, a.chapters_json FROM media_files f LEFT JOIN media_av_meta a ON a.file_id = f.id WHERE f.id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'A/V item not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(`SELECT id, version_num, change_note, created_by, created_at FROM media_revisions WHERE module_code = '06' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`).bind(id).all();
    return json({ ok: true, item: formatAv(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 250_000);
    const status = MEDIA_STATUSES.includes(body.status) ? body.status : existing.status;
    const chapters = body.chapters !== undefined ? parseJson(body.chapters, []) : parseJson(existing.chapters_json, []);
    await env.DB.prepare(`UPDATE media_files SET title_en = ?, title_or = ?, public_url = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220), validateSafeUrl(body.embed_id_or_url ?? existing.public_url), status, id).run();
    await env.DB.prepare(`UPDATE media_av_meta SET source_mode = ?, embed_id_or_url = ?, duration_seconds = ?, transcript_en = ?, transcript_or = ?, chapters_json = ? WHERE file_id = ?`)
      .bind(AV_SOURCE_MODES.includes(body.source_mode) ? body.source_mode : existing.source_mode, validateSafeUrl(body.embed_id_or_url ?? existing.embed_id_or_url), Number(body.duration_seconds ?? existing.duration_seconds), cleanStr(body.transcript_en ?? existing.transcript_en, 4000), cleanStr(body.transcript_or ?? existing.transcript_or, 4000), JSON.stringify(chapters), id).run();
    const updated = await env.DB.prepare(`SELECT f.*, a.media_kind, a.source_mode, a.embed_id_or_url, a.duration_seconds, a.transcript_en, a.transcript_or, a.chapters_json FROM media_files f LEFT JOIN media_av_meta a ON a.file_id = f.id WHERE f.id = ?`).bind(id).first();
    await saveMediaRevision(env.DB, '06', id, updated, body.change_note || 'Updated A/V', actor.email);
    return json({ ok: true, item: formatAv(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM media_revisions WHERE id = ? AND module_code = '06' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE media_files SET title_en = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).bind(snap.title_en, snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT f.*, a.media_kind, a.source_mode, a.embed_id_or_url, a.duration_seconds, a.transcript_en, a.transcript_or, a.chapters_json FROM media_files f LEFT JOIN media_av_meta a ON a.file_id = f.id WHERE f.id = ?`).bind(id).first();
      return json({ ok: true, item: formatAv(rolled) });
    }
    if (body.status && MEDIA_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE media_files SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT f.*, a.media_kind, a.source_mode, a.embed_id_or_url, a.duration_seconds, a.transcript_en, a.transcript_or, a.chapters_json FROM media_files f LEFT JOIN media_av_meta a ON a.file_id = f.id WHERE f.id = ?`).bind(id).first();
      return json({ ok: true, item: formatAv(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM media_files WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Modules 07 & 08: Cloud Links & Google Drive Links ----------
function formatCloudLink(row) {
  if (!row) return null;
  return { ...row, tags: parseJson(row.tags_json, []), linked_modules: parseJson(row.linked_modules_json, []) };
}

async function handleCloudLinks(request, env, actor, id, isGdrive) {
  const method = request.method;
  const modCode = isGdrive ? '08' : '07';

  if (isGdrive && id === 'parse' && method === 'POST') {
    const body = await readJson(request, 20_000);
    const parsed = parseGoogleDriveUrl(body.raw_share_url || '');
    return json({ ok: true, ...parsed });
  }
  if (!isGdrive && id === 'verify' && method === 'POST') {
    const { results } = await env.DB.prepare(`SELECT id, raw_share_url FROM media_cloud_links WHERE connector_type != 'google_drive'`).all();
    const now = new Date().toISOString();
    let okCount = 0; let brokenCount = 0;
    for (const r of results || []) {
      let valid = false;
      try { const u = new URL(r.raw_share_url); valid = u.protocol === 'https:' || u.protocol === 'http:'; } catch {}
      const st = valid ? 'ok' : 'broken';
      if (valid) okCount++; else brokenCount++;
      await env.DB.prepare(`UPDATE media_cloud_links SET link_health_status = ?, last_checked_at = ? WHERE id = ?`).bind(st, now, r.id).run();
    }
    return json({ ok: true, checked: (results || []).length, ok_count: okCount, broken_count: brokenCount });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const conn = url.searchParams.get('connector_type') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [isGdrive ? `connector_type = 'google_drive'` : `connector_type != 'google_drive'`];
      const binds = [];
      if (!isGdrive && conn && CLOUD_CONNECTORS.includes(conn)) { where.push('connector_type = ?'); binds.push(conn); }
      if (status && MEDIA_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(title_en LIKE ? ESCAPE '\\' OR drive_file_id LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM media_cloud_links WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).bind(...binds).all();
      const countSql = isGdrive ? `SELECT status FROM media_cloud_links WHERE connector_type = 'google_drive'` : `SELECT status FROM media_cloud_links WHERE connector_type != 'google_drive'`;
      const { results: allRows } = await env.DB.prepare(countSql).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatCloudLink), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !MEDIA_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE media_cloud_links SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      let driveParsed = { drive_file_id: '', drive_resource_kind: 'other', raw_share_url: validateSafeUrl(body.raw_share_url || ''), preview_embed_url: validateSafeUrl(body.preview_embed_url || ''), direct_download_url: validateSafeUrl(body.direct_download_url || '') };
      if (isGdrive) driveParsed = parseGoogleDriveUrl(body.raw_share_url || '');

      const conn = isGdrive ? 'google_drive' : (CLOUD_CONNECTORS.includes(body.connector_type) && body.connector_type !== 'google_drive' ? body.connector_type : 'custom_cdn');
      const status = MEDIA_STATUSES.includes(body.status) ? body.status : 'draft';
      const tier = ACCESS_TIERS.includes(body.access_tier) ? body.access_tier : 'public';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'cloud';
      const dup = await env.DB.prepare(`SELECT id FROM media_cloud_links WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `mcl-${crypto.randomUUID().slice(0, 10)}`;
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO media_cloud_links (id, slug, connector_type, drive_resource_kind, drive_file_id, raw_share_url, preview_embed_url, direct_download_url, folder_id, title_en, title_or, description_en, estimated_size_label, access_tier, tags_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, conn, driveParsed.drive_resource_kind, driveParsed.drive_file_id, driveParsed.raw_share_url,
        driveParsed.preview_embed_url, driveParsed.direct_download_url, body.folder_id || null,
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.description_en || '', 500),
        cleanStr(body.estimated_size_label || '', 40), tier, JSON.stringify(tags), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM media_cloud_links WHERE id = ?`).bind(newId).first();
      await saveMediaRevision(env.DB, modCode, newId, created, 'Created cloud link', actor.email);
      await audit(env, request, actor, `media.${modCode}.create`, 'media_cloud_links', newId);
      return json({ ok: true, item: formatCloudLink(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM media_cloud_links WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Cloud link not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(`SELECT id, version_num, change_note, created_by, created_at FROM media_revisions WHERE module_code = ? AND entity_id = ? ORDER BY version_num DESC LIMIT 20`).bind(modCode, id).all();
    return json({ ok: true, item: formatCloudLink(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const status = MEDIA_STATUSES.includes(body.status) ? body.status : existing.status;
    let parsed = { drive_file_id: existing.drive_file_id, drive_resource_kind: existing.drive_resource_kind, raw_share_url: validateSafeUrl(body.raw_share_url ?? existing.raw_share_url), preview_embed_url: validateSafeUrl(body.preview_embed_url ?? existing.preview_embed_url), direct_download_url: validateSafeUrl(body.direct_download_url ?? existing.direct_download_url) };
    if (isGdrive && body.raw_share_url) parsed = parseGoogleDriveUrl(body.raw_share_url);
    await env.DB.prepare(
      `UPDATE media_cloud_links SET title_en = ?, title_or = ?, raw_share_url = ?, preview_embed_url = ?, direct_download_url = ?, drive_file_id = ?, drive_resource_kind = ?, estimated_size_label = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      parsed.raw_share_url, parsed.preview_embed_url, parsed.direct_download_url, parsed.drive_file_id, parsed.drive_resource_kind,
      cleanStr(body.estimated_size_label ?? existing.estimated_size_label, 40), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM media_cloud_links WHERE id = ?`).bind(id).first();
    await saveMediaRevision(env.DB, modCode, id, updated, body.change_note || 'Updated cloud link', actor.email);
    return json({ ok: true, item: formatCloudLink(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `mcl-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO media_cloud_links (id, slug, connector_type, drive_resource_kind, drive_file_id, raw_share_url, preview_embed_url, direct_download_url, folder_id, title_en, title_or, description_en, estimated_size_label, access_tier, tags_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.connector_type, existing.drive_resource_kind, existing.drive_file_id, existing.raw_share_url, existing.preview_embed_url, existing.direct_download_url, existing.folder_id, `${existing.title_en} (Copy)`, existing.title_or, existing.description_en, existing.estimated_size_label, existing.access_tier, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM media_cloud_links WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatCloudLink(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM media_revisions WHERE id = ? AND module_code = ? AND entity_id = ?`).bind(body.revision_id, modCode, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE media_cloud_links SET title_en = ?, raw_share_url = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).bind(snap.title_en, snap.raw_share_url, snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM media_cloud_links WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCloudLink(rolled) });
    }
    if (body.status && MEDIA_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE media_cloud_links SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM media_cloud_links WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCloudLink(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM media_cloud_links WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleFilesMediaBatch2Admin(request, env, actor, id, sub) {
  await ensureFilesMediaBatch2Schema(env.DB);
  if (id === 'images') return handleImages(request, env, actor, sub);
  if (id === 'av') return handleAv(request, env, actor, sub);
  if (id === 'cloud-links') return handleCloudLinks(request, env, actor, sub, false);
  if (id === 'gdrive') return handleCloudLinks(request, env, actor, sub, true);
  return null;
}
