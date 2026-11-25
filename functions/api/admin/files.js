// Folder #9 Backend: Cloudflare R2 File & Media Manager + Live /files/:key Delivery (v310)
// Strict MIME/extension allowlist, magic-byte validation, size caps (15 MB docs, 3 MB images),
// graceful unbound-R2 status, pre-delete D1 content reference scan, and immutable /files/:key delivery.
import { HttpError, json } from '../../_lib/http.js';
import { likeEscape } from '../../_lib/validate.js';
import { recordAdminAuditLog } from './system-ops.js';

export const ALLOWED_FOLDERS = ['Jobs', 'Schemes', 'Study PDFs', 'Images', 'Legal'];

export const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

export const ALLOWED_FILE_RULES = {
  pdf: {
    ext: 'pdf',
    kind: 'document',
    maxBytes: MAX_DOC_BYTES,
    canonicalMime: 'application/pdf',
    mimes: ['application/pdf']
  },
  docx: {
    ext: 'docx',
    kind: 'document',
    maxBytes: MAX_DOC_BYTES,
    canonicalMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream']
  },
  xlsx: {
    ext: 'xlsx',
    kind: 'document',
    maxBytes: MAX_DOC_BYTES,
    canonicalMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream']
  },
  csv: {
    ext: 'csv',
    kind: 'document',
    maxBytes: MAX_DOC_BYTES,
    canonicalMime: 'text/csv; charset=utf-8',
    mimes: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel']
  },
  webp: {
    ext: 'webp',
    kind: 'image',
    maxBytes: MAX_IMAGE_BYTES,
    canonicalMime: 'image/webp',
    mimes: ['image/webp']
  },
  png: {
    ext: 'png',
    kind: 'image',
    maxBytes: MAX_IMAGE_BYTES,
    canonicalMime: 'image/png',
    mimes: ['image/png']
  },
  jpg: {
    ext: 'jpg',
    kind: 'image',
    maxBytes: MAX_IMAGE_BYTES,
    canonicalMime: 'image/jpeg',
    mimes: ['image/jpeg', 'image/jpg']
  },
  jpeg: {
    ext: 'jpg',
    kind: 'image',
    maxBytes: MAX_IMAGE_BYTES,
    canonicalMime: 'image/jpeg',
    mimes: ['image/jpeg', 'image/jpg']
  }
};

export const HARD_BLOCKED_EXTENSIONS = new Set([
  'html', 'htm', 'xhtml', 'shtml', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'svg', 'svgz', 'xml', 'exe', 'dll', 'msi', 'bat', 'cmd', 'sh', 'bash',
  'zsh', 'ps1', 'vbs', 'scr', 'com', 'php', 'phtml', 'py', 'rb', 'pl',
  'jar', 'war', 'class', 'wasm', 'apk', 'ipa', 'dmg', 'pkg', 'deb', 'rpm', 'iso', 'lnk'
]);

export const HARD_BLOCKED_MIMES = new Set([
  'text/html', 'application/xhtml+xml', 'image/svg+xml',
  'application/javascript', 'text/javascript', 'application/x-javascript', 'text/ecmascript',
  'application/x-msdownload', 'application/x-executable', 'application/x-sh', 'application/x-httpd-php',
  'application/wasm', 'text/xml', 'application/xml'
]);

const SAFE_DELIVERY_MIMES = new Set(Object.values(ALLOWED_FILE_RULES).map(r => r.canonicalMime));

function sanitizeFilename(raw) {
  const base = String(raw || 'file').replace(/^.*[\\/]/, '').trim();
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-{2,}/g, '-').replace(/^\.+/, '');
  return clean.slice(0, 120) || 'file';
}

function getExtension(filename) {
  const clean = String(filename || '').trim().toLowerCase();
  const idx = clean.lastIndexOf('.');
  if (idx <= 0 || idx === clean.length - 1) return '';
  return clean.slice(idx + 1);
}

function normalizeFolder(raw) {
  const val = String(raw || '').trim();
  const match = ALLOWED_FOLDERS.find(f => f.toLowerCase() === val.toLowerCase());
  return match || 'Jobs';
}

function folderSlug(folder) {
  return String(folder || 'jobs').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'files';
}

function checkMagicBytes(ext, bytes) {
  if (!bytes || bytes.length < 4) return ext === 'csv';
  if (ext === 'pdf') {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  }
  if (ext === 'png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  }
  if (ext === 'jpg' || ext === 'jpeg') {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }
  if (ext === 'webp') {
    return bytes.length >= 12
      && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 // RIFF
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50; // WEBP
  }
  if (ext === 'docx' || ext === 'xlsx') {
    return bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07); // PK zip
  }
  if (ext === 'csv') {
    const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 4096));
    if (/<(?:script|svg|html|iframe|object|embed|body)\b/i.test(head)) return false;
    return true;
  }
  return false;
}

/** Validates file extension, MIME type, size cap, and magic bytes. Throws HttpError on violation. */
export function validateUploadFile({ name, type, size, bytes }) {
  const originalName = sanitizeFilename(name);
  const ext = getExtension(originalName);
  const mime = String(type || '').split(';')[0].trim().toLowerCase();

  if (HARD_BLOCKED_EXTENSIONS.has(ext) || HARD_BLOCKED_MIMES.has(mime)) {
    throw new HttpError(400, 'FILE_TYPE_BLOCKED', `Blocked file type (.${ext || mime || 'unknown'}). HTML, JS, SVG, and executables are strictly prohibited.`);
  }

  const rule = ALLOWED_FILE_RULES[ext];
  if (!rule) {
    throw new HttpError(400, 'FILE_TYPE_NOT_ALLOWED', 'Only PDF, WEBP, PNG, JPG/JPEG, DOCX, XLSX, and CSV files are allowed.');
  }

  if (mime && !rule.mimes.includes(mime)) {
    throw new HttpError(415, 'MIME_MISMATCH', `MIME type "${mime}" is not allowed for .${ext} files.`);
  }

  const byteLen = bytes ? bytes.byteLength : Number(size || 0);
  if (!byteLen || byteLen <= 0) {
    throw new HttpError(400, 'EMPTY_FILE', 'Uploaded file is empty.');
  }
  if (byteLen > rule.maxBytes) {
    const capMb = Math.round(rule.maxBytes / (1024 * 1024));
    throw new HttpError(413, 'FILE_TOO_LARGE', `${rule.kind === 'image' ? 'Image' : 'Document'} exceeds the ${capMb} MB limit.`);
  }

  if (bytes && !checkMagicBytes(ext, bytes)) {
    throw new HttpError(400, 'INVALID_FILE_SIGNATURE', `File contents do not match expected .${ext.toUpperCase()} format.`);
  }

  return {
    originalName,
    ext: rule.ext,
    kind: rule.kind,
    mimeType: rule.canonicalMime,
    sizeBytes: byteLen
  };
}

// Reconcile existing 0087 media_files schema safely with additive v310 columns without ever dropping/renaming columns.
let _schemaInfo = null;

export async function ensureMediaFilesSchema(db) {
  if (!db) return { hasLegacyCols: false };
  if (_schemaInfo && _schemaInfo.db === db) return _schemaInfo;

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      file_key TEXT UNIQUE,
      original_name TEXT NOT NULL DEFAULT '',
      folder TEXT NOT NULL DEFAULT 'Jobs',
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      uploaded_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();

  const { results } = await db.prepare('PRAGMA table_info(media_files)').all();
  const cols = new Set((results || []).map(c => c.name));

  const additive = [
    ['file_key', "TEXT DEFAULT ''"],
    ['original_name', "TEXT NOT NULL DEFAULT ''"],
    ['folder', "TEXT NOT NULL DEFAULT 'Jobs'"],
    ['size_bytes', 'INTEGER NOT NULL DEFAULT 0']
  ];
  for (const [col, def] of additive) {
    if (!cols.has(col)) {
      await db.prepare(`ALTER TABLE media_files ADD COLUMN ${col} ${def}`).run();
      cols.add(col);
    }
  }
  try {
    await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_media_files_file_key_v310 ON media_files(file_key) WHERE file_key IS NOT NULL AND file_key != ''").run();
  } catch { /* ignore if partial index unsupported */ }

  _schemaInfo = {
    db,
    cols,
    hasLegacyCols: cols.has('slug') && cols.has('r2_key') && cols.has('title_en')
  };
  return _schemaInfo;
}

const REFERENCE_TARGETS = [
  { table: 'job_articles', idCol: 'id', titleCol: 'title_en', cols: ['banner_url', 'notification_pdf_url', 'body_en', 'body_or', 'structured_json'] },
  { table: 'scheme_articles', idCol: 'id', titleCol: 'title_en', cols: ['banner_url', 'guideline_pdf_url', 'body_en', 'body_or', 'structured_json'] },
  { table: 'study_articles', idCol: 'id', titleCol: 'title_en', cols: ['cover_url', 'pdf_url', 'body_en', 'body_or', 'structured_json'] },
  { table: 'careers_articles', idCol: 'id', titleCol: 'title_en', cols: ['body_en', 'body_or', 'roadmap_json', 'banner_url'] },
  { table: 'community_posts', idCol: 'id', titleCol: 'title_en', cols: ['body_en', 'body_or', 'attachment_url', 'media_url'] },
  { table: 'about_articles', idCol: 'id', titleCol: 'title_en', cols: ['body_en', 'body_or', 'banner_url', 'structured_json'] },
  { table: 'institutional_pages', idCol: 'slug', titleCol: 'title_en', cols: ['body_en', 'body_or'] },
  { table: 'homepage_blocks', idCol: 'id', titleCol: 'title_en', cols: ['target_url', 'badge_text', 'subtitle_en', 'metadata_json'] },
  { table: 'candidate_assigned_items', idCol: 'id', titleCol: 'title', cols: ['resource_url', 'description'] },
  { table: 'site_pages', idCol: 'route', titleCol: 'title', cols: ['blocks_json', 'reusable_sections_json'] },
  { table: 'posts', idCol: 'id', titleCol: 'title', cols: ['body_md', 'apply_url', 'pdf_url'] }
];

async function getTableCols(db, table) {
  try {
    const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
    return new Set((results || []).map(r => r.name));
  } catch {
    return null;
  }
}

/** Scans D1 content tables for any reference to /files/<fileKey> or <fileKey> before deleting. */
export async function findFileReferences(db, fileKey) {
  if (!db || !fileKey) return [];
  const refs = [];
  const needle = `%${likeEscape(fileKey)}%`;
  for (const target of REFERENCE_TARGETS) {
    const existingCols = await getTableCols(db, target.table);
    if (!existingCols || !existingCols.size) continue;
    const searchable = target.cols.filter(c => existingCols.has(c));
    if (!searchable.length) continue;
    const idExpr = existingCols.has(target.idCol) ? target.idCol : 'rowid';
    const titleExpr = existingCols.has(target.titleCol) ? target.titleCol : idExpr;
    const whereClause = searchable.map(c => `COALESCE(${c}, '') LIKE ? ESCAPE '\\'`).join(' OR ');
    try {
      const binds = searchable.map(() => needle);
      const { results } = await db.prepare(
        `SELECT ${idExpr} AS ref_id, ${titleExpr} AS ref_title FROM ${target.table} WHERE ${whereClause} LIMIT 10`
      ).bind(...binds).all();
      for (const row of results || []) {
        refs.push({
          table: target.table,
          id: String(row.ref_id || ''),
          title: String(row.ref_title || row.ref_id || 'Untitled item')
        });
      }
    } catch {
      // Skip table safely on query error
    }
  }
  return refs;
}

function getFilesBucket(env) {
  return (env && env.CSO_FILES && typeof env.CSO_FILES.put === 'function' && typeof env.CSO_FILES.get === 'function')
    ? env.CSO_FILES
    : null;
}

function normalizeFileRow(r) {
  const key = r.file_key || r.r2_key || '';
  const name = r.original_name || r.original_filename || r.title_en || key;
  const size = Number(r.size_bytes || r.file_size_bytes || 0);
  const folder = r.folder || 'Jobs';
  return {
    id: r.id,
    file_key: key,
    original_name: name,
    folder,
    mime_type: r.mime_type || 'application/octet-stream',
    size_bytes: size,
    uploaded_by: r.uploaded_by || '',
    created_at: r.created_at || '',
    clean_url: key ? `/files/${key}` : (r.public_url || '')
  };
}

// ============================================================================
// ADMIN API: /api/admin/files/*
// ============================================================================
export async function handleAdminFilesApi(request, env, actor, id, sub, ctx) {
  const schema = await ensureMediaFilesSchema(env.DB);
  const bucket = getFilesBucket(env);
  const r2Configured = Boolean(bucket);
  const method = request.method;
  const url = new URL(request.url);

  // GET /api/admin/files — list real D1 media_files rows, folder totals, R2 config status
  if (!id && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
    const folder = (url.searchParams.get('folder') || '').trim();
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 100));

    const where = ["COALESCE(file_key, r2_key, '') != ''"];
    const binds = [];
    if (!schema.hasLegacyCols) {
      where[0] = "COALESCE(file_key, '') != ''";
    }
    if (folder && ALLOWED_FOLDERS.includes(folder)) {
      where.push('folder = ?');
      binds.push(folder);
    }
    if (q) {
      const l = `%${likeEscape(q)}%`;
      if (schema.hasLegacyCols) {
        where.push("(COALESCE(original_name, original_filename, '') LIKE ? ESCAPE '\\' OR COALESCE(file_key, r2_key, '') LIKE ? ESCAPE '\\')");
      } else {
        where.push("(original_name LIKE ? ESCAPE '\\' OR file_key LIKE ? ESCAPE '\\')");
      }
      binds.push(l, l);
    }

    const selectCols = schema.hasLegacyCols
      ? 'id, file_key, r2_key, original_name, original_filename, title_en, folder, mime_type, size_bytes, file_size_bytes, public_url, uploaded_by, created_at'
      : 'id, file_key, original_name, folder, mime_type, size_bytes, uploaded_by, created_at';

    const { results } = await env.DB.prepare(
      `SELECT ${selectCols} FROM media_files WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`
    ).bind(...binds, limit).all();

    const sizeExpr = schema.hasLegacyCols ? 'COALESCE(NULLIF(size_bytes, 0), file_size_bytes, 0)' : 'COALESCE(size_bytes, 0)';
    const keyCond = schema.hasLegacyCols ? "COALESCE(file_key, r2_key, '') != ''" : "COALESCE(file_key, '') != ''";
    const totalsRow = await env.DB.prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(${sizeExpr}), 0) AS bytes FROM media_files WHERE ${keyCond}`
    ).first();

    const folderRows = await env.DB.prepare(
      `SELECT folder, COUNT(*) AS n, COALESCE(SUM(${sizeExpr}), 0) AS bytes FROM media_files WHERE ${keyCond} GROUP BY folder`
    ).all();
    const folderCounts = {};
    for (const f of ALLOWED_FOLDERS) folderCounts[f] = { count: 0, bytes: 0 };
    for (const r of (folderRows.results || [])) {
      const fk = ALLOWED_FOLDERS.includes(r.folder) ? r.folder : 'Jobs';
      folderCounts[fk] = {
        count: (folderCounts[fk].count || 0) + Number(r.n || 0),
        bytes: (folderCounts[fk].bytes || 0) + Number(r.bytes || 0)
      };
    }

    return json({
      ok: true,
      r2_configured: r2Configured,
      bucket_binding: 'CSO_FILES',
      config_status: r2Configured ? 'connected' : 'unbound',
      config_message: r2Configured
        ? 'Cloudflare R2 bucket CSO_FILES is connected and serving live /files/:key links.'
        : 'R2 binding CSO_FILES is unbound in this environment. Bind CSO_FILES in wrangler.json / Cloudflare Pages dashboard to enable live uploads.',
      folders: ALLOWED_FOLDERS,
      folder_counts: folderCounts,
      total_files: Number((totalsRow && totalsRow.n) || 0),
      total_bytes: Number((totalsRow && totalsRow.bytes) || 0),
      limits: { doc_max_bytes: MAX_DOC_BYTES, image_max_bytes: MAX_IMAGE_BYTES },
      items: (results || []).map(normalizeFileRow)
    });
  }

  // POST /api/admin/files — upload file to R2 CSO_FILES & record real metadata in D1 media_files
  if (!id && method === 'POST') {
    if (!r2Configured) {
      return json({
        ok: false,
        code: 'R2_UNBOUND',
        r2_configured: false,
        bucket_binding: 'CSO_FILES',
        config_status: 'unbound',
        error: 'Cloudflare R2 bucket binding CSO_FILES is not configured in this environment. Bind CSO_FILES to enable uploads.'
      }, 503);
    }

    const ct = request.headers.get('Content-Type') || '';
    if (!ct.includes('multipart/form-data')) {
      throw new HttpError(400, 'INVALID_CONTENT_TYPE', 'Expected multipart/form-data upload');
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      throw new HttpError(400, 'MISSING_FILE', 'Select a file to upload.');
    }

    const folder = normalizeFolder(form.get('folder'));
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const validated = validateUploadFile({
      name: file.name,
      type: file.type,
      size: file.size,
      bytes
    });

    const idBytes = new Uint8Array(6);
    crypto.getRandomValues(idBytes);
    const shortRand = Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const stem = validated.originalName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'asset';
    const fileKey = `${folderSlug(folder)}/${ym}/${stem}-${shortRand}.${validated.ext}`;
    const fileId = `mf_${Date.now()}_${shortRand}`;
    const nowIso = now.toISOString();
    const uploadedBy = (actor && actor.email) || 'admin';
    const cleanUrl = `/files/${fileKey}`;

    await bucket.put(fileKey, ab, {
      httpMetadata: {
        contentType: validated.mimeType,
        cacheControl: 'public, max-age=31536000, immutable'
      },
      customMetadata: {
        original_name: validated.originalName,
        folder,
        uploaded_by: uploadedBy
      }
    });

    if (schema.hasLegacyCols) {
      const legacyCat = validated.kind === 'image' ? 'image' : (validated.ext === 'pdf' ? 'pdf' : 'document');
      await env.DB.prepare(
        `INSERT INTO media_files (
          id, slug, file_category, storage_provider, r2_key, public_url, original_filename,
          title_en, mime_type, file_size_bytes, status, uploaded_by, created_at, updated_at,
          file_key, original_name, folder, size_bytes
        ) VALUES (?, ?, ?, 'r2_primary', ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        fileId, fileId, legacyCat, fileKey, cleanUrl, validated.originalName,
        validated.originalName, validated.mimeType, validated.sizeBytes, uploadedBy, nowIso, nowIso,
        fileKey, validated.originalName, folder, validated.sizeBytes
      ).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO media_files (id, file_key, original_name, folder, mime_type, size_bytes, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(fileId, fileKey, validated.originalName, folder, validated.mimeType, validated.sizeBytes, uploadedBy, nowIso).run();
    }

    recordAdminAuditLog(env, request, actor, 'files.upload', fileKey, {
      id: fileId,
      folder,
      original_name: validated.originalName,
      mime_type: validated.mimeType,
      size_bytes: validated.sizeBytes
    }, ctx);

    return json({
      ok: true,
      item: {
        id: fileId,
        file_key: fileKey,
        original_name: validated.originalName,
        folder,
        mime_type: validated.mimeType,
        size_bytes: validated.sizeBytes,
        uploaded_by: uploadedBy,
        created_at: nowIso,
        clean_url: cleanUrl
      }
    }, 201);
  }

  // GET /api/admin/files/:id/references — pre-delete D1 reference scan
  if (id && sub === 'references' && method === 'GET') {
    const keyExpr = schema.hasLegacyCols ? 'COALESCE(file_key, r2_key) AS file_key' : 'file_key';
    const row = await env.DB.prepare(`SELECT id, ${keyExpr} FROM media_files WHERE id = ?`).bind(id).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'File record not found');
    const references = await findFileReferences(env.DB, row.file_key);
    return json({
      ok: true,
      id: row.id,
      file_key: row.file_key,
      reference_count: references.length,
      references
    });
  }

  // DELETE /api/admin/files/:id — reference-checked R2 + D1 deletion
  if (id && !sub && method === 'DELETE') {
    const keyExpr = schema.hasLegacyCols ? 'COALESCE(file_key, r2_key) AS file_key, COALESCE(original_name, original_filename) AS original_name' : 'file_key, original_name';
    const row = await env.DB.prepare(`SELECT id, ${keyExpr} FROM media_files WHERE id = ?`).bind(id).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'File record not found');

    const force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true';
    const references = await findFileReferences(env.DB, row.file_key);
    if (references.length > 0 && !force) {
      return json({
        ok: false,
        code: 'FILE_IN_USE',
        error: `File is currently referenced by ${references.length} content item(s). Confirm force deletion to proceed.`,
        id: row.id,
        file_key: row.file_key,
        reference_count: references.length,
        references
      }, 409);
    }

    if (bucket && row.file_key && typeof bucket.delete === 'function') {
      await bucket.delete(row.file_key);
    }
    await env.DB.prepare('DELETE FROM media_files WHERE id = ?').bind(id).run();

    recordAdminAuditLog(env, request, actor, 'files.delete', row.file_key || id, {
      id,
      original_name: row.original_name || '',
      forced: force,
      reference_count: references.length
    }, ctx);

    return json({ ok: true, deleted_id: id, file_key: row.file_key, reference_count: references.length });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown files route');
}

// ============================================================================
// PUBLIC ROUTE: GET /files/:key (served directly from env.CSO_FILES)
// ============================================================================
export async function handlePublicFileDelivery(request, env, rawKey) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  let key = '';
  try {
    key = decodeURIComponent(String(rawKey || '')).replace(/^\/+/, '');
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!key || key.includes('..') || key.includes('\\') || /[\u0000-\u001f\u007f]/.test(key)) {
    return new Response('Invalid file key', { status: 400 });
  }
  const ext = getExtension(key);
  if (HARD_BLOCKED_EXTENSIONS.has(ext)) {
    return new Response('Forbidden file type', { status: 403 });
  }

  const bucket = getFilesBucket(env);
  if (!bucket) {
    return new Response(JSON.stringify({ ok: false, code: 'R2_UNBOUND', error: 'File storage binding CSO_FILES is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const obj = await bucket.get(key);
  if (!obj) {
    return new Response('File Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const rule = ALLOWED_FILE_RULES[ext];
  const rawMime = (obj.httpMetadata && obj.httpMetadata.contentType) || (rule && rule.canonicalMime) || 'application/octet-stream';
  const safeMime = SAFE_DELIVERY_MIMES.has(rawMime) ? rawMime : (rule ? rule.canonicalMime : 'application/octet-stream');

  const headers = new Headers();
  headers.set('Content-Type', safeMime);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  if (obj.httpEtag) headers.set('ETag', obj.httpEtag);
  if (obj.size !== undefined) headers.set('Content-Length', String(obj.size));

  return new Response(request.method === 'HEAD' ? null : obj.body, { status: 200, headers });
}
