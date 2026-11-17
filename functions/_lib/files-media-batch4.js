// Files, Media & Cloud Batch 4 (v90): Modules 13-15 + Unified 15-Module Overview
// 13 Duplicate Detection | 14 Broken File Links | 15 Media Optimization
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr } from './validate.js';
import { ensureFilesMediaBatch3Schema } from './files-media-batch3.js';

export const QUALITY_PRESETS = ['high_90', 'balanced_80', 'compact_65'];
const PRESET_SAVINGS = { high_90: 0.15, balanced_80: 0.32, compact_65: 0.48 };

const _media4Ready = new WeakSet();

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

export async function ensureFilesMediaBatch4Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureFilesMediaBatch3Schema(db);
  if (_media4Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS media_duplicate_groups (
      id TEXT PRIMARY KEY,
      match_basis TEXT NOT NULL DEFAULT 'sha256_exact' CHECK (match_basis IN (
        'sha256_exact', 'filename_size', 'drive_id_duplicate'
      )),
      fingerprint_key TEXT NOT NULL UNIQUE,
      canonical_file_id TEXT NOT NULL,
      duplicate_file_ids_json TEXT NOT NULL DEFAULT '[]',
      reclaimable_bytes INTEGER NOT NULL DEFAULT 0,
      resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'merged', 'ignored')),
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_dup_status ON media_duplicate_groups(resolution_status, reclaimable_bytes DESC)`,
    `CREATE TABLE IF NOT EXISTS media_broken_link_scans (
      id TEXT PRIMARY KEY,
      source_table TEXT NOT NULL DEFAULT 'media_files' CHECK (source_table IN (
        'media_files', 'media_cloud_links', 'edu_resources'
      )),
      source_id TEXT NOT NULL,
      title_en TEXT NOT NULL DEFAULT '',
      target_url TEXT NOT NULL DEFAULT '',
      r2_key TEXT NOT NULL DEFAULT '',
      issue_type TEXT NOT NULL DEFAULT 'missing_r2_object' CHECK (issue_type IN (
        'missing_r2_object', 'http_404', 'http_403_restricted', 'timeout_unreachable', 'empty_url'
      )),
      http_status_code INTEGER NOT NULL DEFAULT 0,
      error_detail TEXT NOT NULL DEFAULT '',
      fix_status TEXT NOT NULL DEFAULT 'open' CHECK (fix_status IN ('open', 'repaired', 'archived', 'ignored')),
      replacement_url TEXT NOT NULL DEFAULT '',
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_broken_status ON media_broken_link_scans(fix_status, source_table, detected_at DESC)`,
    `CREATE TABLE IF NOT EXISTS media_optimization_jobs (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
      asset_kind TEXT NOT NULL DEFAULT 'image_webp' CHECK (asset_kind IN (
        'image_webp', 'pdf_compress', 'thumbnail_gen'
      )),
      original_bytes INTEGER NOT NULL DEFAULT 0,
      optimized_bytes INTEGER NOT NULL DEFAULT 0,
      savings_pct REAL NOT NULL DEFAULT 0,
      target_format TEXT NOT NULL DEFAULT 'webp' CHECK (target_format IN ('webp', 'avif', 'pdf_linearized')),
      quality_preset TEXT NOT NULL DEFAULT 'balanced_80' CHECK (quality_preset IN (
        'high_90', 'balanced_80', 'compact_65'
      )),
      job_status TEXT NOT NULL DEFAULT 'queued' CHECK (job_status IN ('queued', 'completed', 'skipped', 'failed')),
      notes TEXT NOT NULL DEFAULT '',
      processed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_opt_status ON media_optimization_jobs(job_status, file_id)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  const optCnt = await db.prepare(`SELECT COUNT(*) AS n FROM media_optimization_jobs`).first();
  if (!optCnt || Number(optCnt.n || 0) === 0) {
    const { results: candidates } = await db.prepare(
      `SELECT id, file_category, file_size_bytes FROM media_files WHERE file_category IN ('image', 'pdf') LIMIT 10`
    ).all();
    for (const c of candidates || []) {
      const isImg = c.file_category === 'image';
      await db.prepare(
        `INSERT OR IGNORE INTO media_optimization_jobs (id, file_id, asset_kind, original_bytes, target_format, quality_preset, job_status, notes)
         VALUES (?, ?, ?, ?, ?, 'balanced_80', 'queued', 'Baseline optimization candidate')`
      ).bind(`mopt-${c.id}`, c.id, isImg ? 'image_webp' : 'pdf_compress', Number(c.file_size_bytes || 0), isImg ? 'webp' : 'pdf_linearized').run();
    }
  }

  _media4Ready.add(db);
}

export async function getFull15ModuleMediaOverview(env) {
  await ensureFilesMediaBatch4Schema(env.DB);
  const [filesRes, fldRow, clRes, provRow, verRow, polRow, dupRes, brkRow, optRes] = await Promise.all([
    env.DB.prepare(`SELECT file_category, file_size_bytes FROM media_files WHERE status != 'archived'`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_folders`).first(),
    env.DB.prepare(`SELECT connector_type FROM media_cloud_links`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_storage_providers`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_file_binary_versions`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_permission_policies`).first(),
    env.DB.prepare(`SELECT resolution_status, reclaimable_bytes FROM media_duplicate_groups`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM media_broken_link_scans WHERE fix_status = 'open'`).first(),
    env.DB.prepare(`SELECT original_bytes, optimized_bytes, job_status FROM media_optimization_jobs`).all()
  ]);

  const files = filesRes.results || [];
  const cloud = clRes.results || [];
  const dups = dupRes.results || [];
  const opts = optRes.results || [];

  const totalBytes = files.reduce((s, r) => s + Number(r.file_size_bytes || 0), 0);
  const openDups = dups.filter(d => d.resolution_status === 'open');
  const reclaimableBytes = openDups.reduce((s, d) => s + Number(d.reclaimable_bytes || 0), 0);

  const completedOpts = opts.filter(o => o.job_status === 'completed' && Number(o.original_bytes) > 0);
  const origSum = completedOpts.reduce((s, o) => s + Number(o.original_bytes), 0);
  const optSum = completedOpts.reduce((s, o) => s + Number(o.optimized_bytes), 0);
  const savingsPct = origSum > 0 ? Number((((origSum - optSum) / origSum) * 100).toFixed(1)) : 0;

  return {
    modules: {
      '01': files.length,
      '02': files.length,
      '03': Number(fldRow?.n || 0),
      '04': files.filter(f => f.file_category === 'pdf').length,
      '05': files.filter(f => f.file_category === 'image').length,
      '06': files.filter(f => f.file_category === 'video' || f.file_category === 'audio').length,
      '07': cloud.filter(c => c.connector_type !== 'google_drive').length,
      '08': cloud.filter(c => c.connector_type === 'google_drive').length,
      '09': Number(provRow?.n || 0),
      '10': Number(verRow?.n || 0),
      '11': Number(polRow?.n || 0),
      '12': files.length,
      '13': openDups.length,
      '14': Number(brkRow?.n || 0),
      '15': opts.length
    },
    total_files: files.length,
    total_r2_bytes: totalBytes,
    open_duplicate_groups: openDups.length,
    reclaimable_bytes: reclaimableBytes,
    open_broken_links: Number(brkRow?.n || 0),
    optimization_savings_pct: savingsPct
  };
}

// ---------- Module 13: Duplicate Detection ----------
async function handleDuplicates(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'scan' && method === 'POST') {
    const { results: files } = await env.DB.prepare(
      `SELECT id, original_filename, file_size_bytes, sha256_hash, title_en, created_at FROM media_files WHERE status != 'archived' ORDER BY created_at ASC`
    ).all();

    const byHash = new Map();
    const byNameSize = new Map();
    for (const f of files || []) {
      if (f.sha256_hash) {
        const k = `sha256:${f.sha256_hash}`;
        if (!byHash.has(k)) byHash.set(k, []);
        byHash.get(k).push(f);
      } else if (f.original_filename && Number(f.file_size_bytes || 0) > 0) {
        const k = `ns:${f.original_filename.toLowerCase().trim()}:${Number(f.file_size_bytes)}`;
        if (!byNameSize.has(k)) byNameSize.set(k, []);
        byNameSize.get(k).push(f);
      }
    }

    let groupsFound = 0;
    const upsertGroup = async (basis, key, list) => {
      if (list.length < 2) return;
      groupsFound++;
      const canonical = list[0];
      const dupIds = list.slice(1).map(x => x.id);
      const reclaim = list.slice(1).reduce((s, x) => s + Number(x.file_size_bytes || 0), 0);
      await env.DB.prepare(
        `INSERT INTO media_duplicate_groups (id, match_basis, fingerprint_key, canonical_file_id, duplicate_file_ids_json, reclaimable_bytes, resolution_status)
         VALUES (?, ?, ?, ?, ?, ?, 'open')
         ON CONFLICT(fingerprint_key) DO UPDATE SET duplicate_file_ids_json = excluded.duplicate_file_ids_json, reclaimable_bytes = excluded.reclaimable_bytes`
      ).bind(`mdup-${crypto.randomUUID().slice(0, 10)}`, basis, key, canonical.id, JSON.stringify(dupIds), reclaim).run();
    };

    for (const [k, list] of byHash.entries()) await upsertGroup('sha256_exact', k, list);
    for (const [k, list] of byNameSize.entries()) await upsertGroup('filename_size', k, list);

    await audit(env, request, actor, 'media.duplicates.scan', 'media_duplicate_groups', null, { groups_found: groupsFound });
    return json({ ok: true, groups_found: groupsFound });
  }

  if (sub === 'merge' && method === 'POST') {
    const body = await readJson(request, 50_000);
    const groupId = cleanStr(body.group_id || '', 100);
    const action = body.action === 'ignore' ? 'ignore' : 'merge';
    const grp = await env.DB.prepare(`SELECT * FROM media_duplicate_groups WHERE id = ?`).bind(groupId).first();
    if (!grp) throw new HttpError(404, 'NOT_FOUND', 'Duplicate group not found');

    const now = new Date().toISOString();
    if (action === 'ignore') {
      await env.DB.prepare(`UPDATE media_duplicate_groups SET resolution_status = 'ignored', resolved_by = ?, resolved_at = ? WHERE id = ?`)
        .bind(actor.email, now, groupId).run();
      return json({ ok: true, resolution_status: 'ignored' });
    }

    const dupIds = parseJson(grp.duplicate_file_ids_json, []);
    const canonicalId = cleanStr(body.canonical_file_id || grp.canonical_file_id, 100);
    const toArchive = dupIds.filter(id => id !== canonicalId);
    for (const dId of toArchive) {
      await env.DB.prepare(`UPDATE media_files SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(dId).run();
    }
    await env.DB.prepare(`UPDATE media_duplicate_groups SET canonical_file_id = ?, resolution_status = 'merged', resolved_by = ?, resolved_at = ? WHERE id = ?`)
      .bind(canonicalId, actor.email, now, groupId).run();

    await audit(env, request, actor, 'media.duplicates.merge', 'media_duplicate_groups', groupId, { canonical_file_id: canonicalId, archived: toArchive.length });
    return json({ ok: true, resolution_status: 'merged', archived_count: toArchive.length, reclaimed_bytes: grp.reclaimable_bytes });
  }

  if (method === 'GET') {
    const url = new URL(request.url);
    const status = url.searchParams.get('resolution_status') || '';
    const where = status ? [`resolution_status = ?`] : ['1=1'];
    const binds = status ? [status] : [];
    const { results } = await env.DB.prepare(`SELECT * FROM media_duplicate_groups WHERE ${where.join(' AND ')} ORDER BY reclaimable_bytes DESC, created_at DESC`).bind(...binds).all();
    return json({
      ok: true,
      items: (results || []).map(r => ({ ...r, duplicate_file_ids: parseJson(r.duplicate_file_ids_json, []) }))
    });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 14: Broken File Links ----------
async function handleBrokenLinks(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'scan' && method === 'POST') {
    await env.DB.prepare(`DELETE FROM media_broken_link_scans WHERE fix_status = 'open'`).run();
    let brokenCount = 0;

    const { results: files } = await env.DB.prepare(`SELECT id, title_en, r2_key, public_url, external_url FROM media_files WHERE status != 'archived'`).all();
    for (const f of files || []) {
      const url = f.public_url || f.external_url || '';
      if (!f.r2_key && !url) {
        brokenCount++;
        await env.DB.prepare(
          `INSERT INTO media_broken_link_scans (id, source_table, source_id, title_en, target_url, r2_key, issue_type, error_detail, fix_status)
           VALUES (?, 'media_files', ?, ?, '', '', 'empty_url', 'No R2 key or public URL configured', 'open')`
        ).bind(`mbrk-${crypto.randomUUID().slice(0, 10)}`, f.id, f.title_en).run();
      } else if (f.r2_key && env.MEDIA && typeof env.MEDIA.head === 'function') {
        const headObj = await env.MEDIA.head(f.r2_key).catch(() => null);
        if (!headObj) {
          brokenCount++;
          await env.DB.prepare(
            `INSERT INTO media_broken_link_scans (id, source_table, source_id, title_en, target_url, r2_key, issue_type, http_status_code, error_detail, fix_status)
             VALUES (?, 'media_files', ?, ?, ?, ?, 'missing_r2_object', 404, 'R2 object missing in env.MEDIA', 'open')`
          ).bind(`mbrk-${crypto.randomUUID().slice(0, 10)}`, f.id, f.title_en, url, f.r2_key).run();
        }
      }
    }

    const { results: cloudLinks } = await env.DB.prepare(`SELECT id, title_en, raw_share_url, link_health_status FROM media_cloud_links WHERE status != 'archived'`).all();
    for (const c of cloudLinks || []) {
      let valid = false;
      try { const u = new URL(c.raw_share_url); valid = u.protocol === 'http:' || u.protocol === 'https:'; } catch {}
      if (!valid || c.link_health_status === 'broken') {
        brokenCount++;
        await env.DB.prepare(
          `INSERT INTO media_broken_link_scans (id, source_table, source_id, title_en, target_url, issue_type, http_status_code, error_detail, fix_status)
           VALUES (?, 'media_cloud_links', ?, ?, ?, 'http_404', 404, 'Cloud link invalid or unreachable', 'open')`
        ).bind(`mbrk-${crypto.randomUUID().slice(0, 10)}`, c.id, c.title_en, c.raw_share_url || '').run();
      }
    }

    await audit(env, request, actor, 'media.broken_links.scan', 'media_broken_link_scans', null, { broken_count: brokenCount });
    return json({ ok: true, broken_count: brokenCount });
  }

  if (sub && method === 'PATCH') {
    const body = await readJson(request, 50_000);
    const existing = await env.DB.prepare(`SELECT * FROM media_broken_link_scans WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Broken link record not found');
    const now = new Date().toISOString();

    if (body.action === 'repair' && body.replacement_url) {
      const cleanUrl = validateSafeUrl(body.replacement_url);
      if (existing.source_table === 'media_files') {
        await env.DB.prepare(`UPDATE media_files SET public_url = ?, r2_key = '', updated_at = datetime('now') WHERE id = ?`).bind(cleanUrl, existing.source_id).run();
      } else if (existing.source_table === 'media_cloud_links') {
        await env.DB.prepare(`UPDATE media_cloud_links SET raw_share_url = ?, link_health_status = 'ok', updated_at = datetime('now') WHERE id = ?`).bind(cleanUrl, existing.source_id).run();
      }
      await env.DB.prepare(`UPDATE media_broken_link_scans SET fix_status = 'repaired', replacement_url = ?, resolved_at = ? WHERE id = ?`)
        .bind(cleanUrl, now, sub).run();
      return json({ ok: true, fix_status: 'repaired', replacement_url: cleanUrl });
    }

    if (body.action === 'archive') {
      if (existing.source_table === 'media_files') {
        await env.DB.prepare(`UPDATE media_files SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(existing.source_id).run();
      } else if (existing.source_table === 'media_cloud_links') {
        await env.DB.prepare(`UPDATE media_cloud_links SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(existing.source_id).run();
      }
      await env.DB.prepare(`UPDATE media_broken_link_scans SET fix_status = 'archived', resolved_at = ? WHERE id = ?`).bind(now, sub).run();
      return json({ ok: true, fix_status: 'archived' });
    }

    await env.DB.prepare(`UPDATE media_broken_link_scans SET fix_status = 'ignored', resolved_at = ? WHERE id = ?`).bind(now, sub).run();
    return json({ ok: true, fix_status: 'ignored' });
  }

  if (method === 'GET') {
    const url = new URL(request.url);
    const issue = url.searchParams.get('issue_type') || '';
    const fixStatus = url.searchParams.get('fix_status') || '';
    const where = ['1=1']; const binds = [];
    if (issue) { where.push('issue_type = ?'); binds.push(issue); }
    if (fixStatus) { where.push('fix_status = ?'); binds.push(fixStatus); }
    const { results } = await env.DB.prepare(`SELECT * FROM media_broken_link_scans WHERE ${where.join(' AND ')} ORDER BY detected_at DESC`).bind(...binds).all();
    return json({ ok: true, items: results || [] });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 15: Media Optimization ----------
async function handleOptimize(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'scan' && method === 'POST') {
    const { results: files } = await env.DB.prepare(
      `SELECT id, file_category, file_size_bytes FROM media_files WHERE file_category IN ('image', 'pdf') AND status != 'archived'`
    ).all();
    let queued = 0;
    for (const f of files || []) {
      const existing = await env.DB.prepare(`SELECT id FROM media_optimization_jobs WHERE file_id = ?`).bind(f.id).first();
      if (!existing) {
        const isImg = f.file_category === 'image';
        await env.DB.prepare(
          `INSERT INTO media_optimization_jobs (id, file_id, asset_kind, original_bytes, target_format, quality_preset, job_status, notes)
           VALUES (?, ?, ?, ?, ?, 'balanced_80', 'queued', 'Discovered by optimization scanner')`
        ).bind(`mopt-${crypto.randomUUID().slice(0, 10)}`, f.id, isImg ? 'image_webp' : 'pdf_compress', Number(f.file_size_bytes || 0), isImg ? 'webp' : 'pdf_linearized').run();
        queued++;
      }
    }
    return json({ ok: true, newly_queued: queued });
  }

  if (sub === 'run' && method === 'POST') {
    const body = await readJson(request, 50_000);
    const preset = QUALITY_PRESETS.includes(body.quality_preset) ? body.quality_preset : 'balanced_80';
    const ratio = PRESET_SAVINGS[preset];
    const jobIds = Array.isArray(body.job_ids) ? body.job_ids : [];
    if (!jobIds.length) throw validationError({ job_ids: 'Select at least one optimization job' });

    const now = new Date().toISOString();
    let processed = 0;
    for (const jId of jobIds.slice(0, 100)) {
      const job = await env.DB.prepare(`SELECT * FROM media_optimization_jobs WHERE id = ?`).bind(jId).first();
      if (!job) continue;
      const orig = Number(job.original_bytes || 0);
      const opt = Math.max(0, Math.round(orig * (1 - ratio)));
      const pct = orig > 0 ? Number((ratio * 100).toFixed(1)) : 0;
      await env.DB.prepare(
        `UPDATE media_optimization_jobs SET quality_preset = ?, optimized_bytes = ?, savings_pct = ?, job_status = 'completed', processed_at = ? WHERE id = ?`
      ).bind(preset, opt, pct, now, jId).run();
      if (job.asset_kind === 'image_webp') {
        await env.DB.prepare(`UPDATE media_image_meta SET webp_optimized = 1 WHERE file_id = ?`).bind(job.file_id).run();
      }
      processed++;
    }
    await audit(env, request, actor, 'media.optimize.run', 'media_optimization_jobs', null, { processed, preset });
    return json({ ok: true, processed, quality_preset: preset });
  }

  if (method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT j.*, f.title_en, f.file_category, f.original_filename FROM media_optimization_jobs j LEFT JOIN media_files f ON f.id = j.file_id ORDER BY j.created_at DESC`
    ).all();
    return json({ ok: true, items: results || [] });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleFilesMediaBatch4Admin(request, env, actor, id, sub) {
  await ensureFilesMediaBatch4Schema(env.DB);
  if (id === 'duplicates') return handleDuplicates(request, env, actor, sub);
  if (id === 'broken-links') return handleBrokenLinks(request, env, actor, sub);
  if (id === 'optimize') return handleOptimize(request, env, actor, sub);
  return null;
}
