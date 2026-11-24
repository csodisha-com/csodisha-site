// v243 Executive Command Suite backend: overview stats, audit feed, diagnostics, cache purge,
// command index (palette), media library, bulk content operations & slug-collision checks.
// Every number is read live from D1 / R2 — no dummy data.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';
import { ACTIVE_SW_CACHE_VERSION, runSentinelProbe, manageEdgeCache } from './ops-sentinel.js';

// Pillar -> content table registry (id/title/status/updated_at are common to all).
export const PILLAR_TABLES = {
  jobs: { label: 'Jobs & Careers', table: 'jobs_directory_items', title: 'title', slug: 'slug' },
  schemes: { label: 'Schemes & Benefits', table: 'schemes_directory_items', title: 'title', slug: 'slug' },
  study: { label: 'Study Library', table: 'study_library_items', title: 'title', slug: 'slug' },
  community: { label: 'Community', table: 'community_directory_items', title: 'title', slug: 'slug' },
  about: { label: 'About', table: 'about_directory_items', title: 'title', slug: 'slug' },
  current_affairs: { label: 'Current Affairs', table: 'cso_current_affairs', title: 'title_en', slug: null }
};

const AUDIT_PILLAR_PATTERNS = {
  homepage: ['%homepage%'],
  jobs: ['%job%'],
  schemes: ['%scheme%'],
  study: ['%study%', '%current_affair%', '%current-affair%', '%mock%', '%syllabus%', '%edu%'],
  community: ['%communit%', '%forum%'],
  about: ['%about%'],
  navigation: ['%nav%', '%categor%', '%menu%'],
  media: ['%media%', '%upload%']
};
const AUDIT_ACTION_PATTERNS = {
  create: ['%create%', '%insert%', '%upload%', '%duplicate%'],
  update: ['%update%', '%edit%', '%patch%', '%move%', '%reorder%'],
  publish: ['%publish%'],
  unpublish: ['%unpublish%'],
  delete: ['%delete%', '%remove%']
};

export function classifyPillar(action, targetType) {
  const hay = `${action || ''} ${targetType || ''}`.toLowerCase();
  for (const [pillar, pats] of Object.entries(AUDIT_PILLAR_PATTERNS)) {
    if (pats.some((p) => hay.includes(p.replace(/%/g, '')))) return pillar;
  }
  return 'system';
}

export function classifyActionType(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('unpublish')) return 'unpublish';
  if (a.includes('publish')) return 'publish';
  if (/delete|remove/.test(a)) return 'delete';
  if (/create|insert|upload|duplicate/.test(a)) return 'create';
  if (/update|edit|patch|move|reorder/.test(a)) return 'update';
  return 'other';
}

async function safeFirst(db, sql, binds = []) {
  try { return await db.prepare(sql).bind(...binds).first(); } catch { return null; }
}
async function safeAll(db, sql, binds = []) {
  try { const r = await db.prepare(sql).bind(...binds).all(); return r.results || []; } catch { return null; }
}

async function pillarCounts(db, def) {
  const row = await safeFirst(db,
    `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) AS published FROM ${def.table}`);
  if (!row) return { available: false, total: 0, published: 0, draft: 0 };
  const total = Number(row.total || 0); const published = Number(row.published || 0);
  return { available: true, total, published, draft: total - published };
}

// ---------- GET /api/admin/overview-stats ----------
export async function handleOverviewStats(request, env) {
  const db = env.DB;
  const pillars = [];
  for (const [key, def] of Object.entries(PILLAR_TABLES)) {
    pillars.push({ key, label: def.label, ...(await pillarCounts(db, def)) });
  }
  const hp = await safeFirst(db,
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_published), 0) AS published, COALESCE(SUM(clicks_count), 0) AS clicks FROM homepage_blocks`);
  const homepage = hp
    ? { available: true, total: Number(hp.total), published: Number(hp.published), draft: Number(hp.total) - Number(hp.published), clicks: Number(hp.clicks) }
    : { available: false, total: 0, published: 0, draft: 0, clicks: 0 };
  const cand = await safeFirst(db, "SELECT COUNT(*) AS n FROM users WHERE role = 'candidate'");
  const staff = await safeFirst(db, "SELECT COUNT(*) AS n FROM users WHERE role IN ('editor','admin')");
  const cats = await safeFirst(db, "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status='published' THEN 1 ELSE 0 END),0) AS published FROM nav_categories");
  const menus = await safeFirst(db, "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status='published' THEN 1 ELSE 0 END),0) AS published FROM nav_menu_items");

  let health = { posture: 'UNKNOWN', subsystems: [], error: '' };
  try {
    const probe = await runSentinelProbe(request, env, { persist: false });
    health = { posture: probe.posture, subsystems: probe.subsystems, probed_at: probe.probed_at, total_latency_ms: probe.total_latency_ms, freeze_enabled: probe.freeze_enabled, error: '' };
  } catch (e) { health.error = String(e && e.message || e).slice(0, 200); }

  const published = pillars.reduce((n, p) => n + p.published, 0) + homepage.published;
  const draft = pillars.reduce((n, p) => n + p.draft, 0) + homepage.draft;
  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    totals: { published, draft },
    pillars,
    homepage,
    candidates: Number((cand && cand.n) || 0),
    staff: Number((staff && staff.n) || 0),
    categories: { total: Number((cats && cats.total) || 0), published: Number((cats && cats.published) || 0) },
    menus: { total: Number((menus && menus.total) || 0), published: Number((menus && menus.published) || 0) },
    health,
    sw_cache_version: ACTIVE_SW_CACHE_VERSION
  });
}

// ---------- GET /api/admin/audit-feed ----------
export async function handleAuditFeed(request, env) {
  const url = new URL(request.url);
  const pillar = url.searchParams.get('pillar') || '';
  const type = url.searchParams.get('type') || '';
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 30));
  const before = Number(url.searchParams.get('before')) || 0;
  const where = ['1=1']; const binds = [];
  const hay = "lower(a.action || ' ' || COALESCE(a.target_type, ''))";
  if (pillar && AUDIT_PILLAR_PATTERNS[pillar]) {
    where.push('(' + AUDIT_PILLAR_PATTERNS[pillar].map(() => `${hay} LIKE ?`).join(' OR ') + ')');
    binds.push(...AUDIT_PILLAR_PATTERNS[pillar]);
  } else if (pillar === 'system') {
    const all = Object.values(AUDIT_PILLAR_PATTERNS).flat();
    where.push('NOT (' + all.map(() => `${hay} LIKE ?`).join(' OR ') + ')');
    binds.push(...all);
  } else if (pillar) throw validationError({ pillar: 'Unknown pillar filter' });
  if (type) {
    if (!AUDIT_ACTION_PATTERNS[type]) throw validationError({ type: 'Unknown action type' });
    where.push('(' + AUDIT_ACTION_PATTERNS[type].map(() => 'lower(a.action) LIKE ?').join(' OR ') + ')');
    binds.push(...AUDIT_ACTION_PATTERNS[type]);
    if (type === 'publish') where.push("lower(a.action) NOT LIKE '%unpublish%'");
  }
  if (before > 0) { where.push('a.id < ?'); binds.push(before); }
  const rows = await safeAll(env.DB,
    `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata_json, a.created_at, u.email AS actor_email
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id
     WHERE ${where.join(' AND ')} ORDER BY a.id DESC LIMIT ?`, [...binds, limit + 1]);
  if (rows === null) throw new HttpError(500, 'AUDIT_UNAVAILABLE', 'Audit log is unavailable');
  const page = rows.slice(0, limit).map((r) => {
    let meta = null;
    try { meta = r.metadata_json ? JSON.parse(r.metadata_json) : null; } catch { meta = null; }
    return {
      id: r.id, action: r.action, target_type: r.target_type || '', target_id: r.target_id || '',
      actor: r.actor_email || 'system', created_at: r.created_at,
      pillar: classifyPillar(r.action, r.target_type), type: classifyActionType(r.action), meta
    };
  });
  return json({ ok: true, items: page, has_more: rows.length > limit, next_before: page.length ? page[page.length - 1].id : null });
}

// ---------- GET /api/admin/system-diagnostics ----------
const DIAG_TABLES = ['users', 'audit_log', 'homepage_blocks', 'jobs_directory_items', 'schemes_directory_items', 'study_library_items',
  'community_directory_items', 'cso_current_affairs', 'nav_categories', 'nav_menu_items', 'media_files', 'media_assets', 'site_settings'];

export async function handleDiagnostics(request, env) {
  const db = env.DB;
  const tables = [];
  for (const t of DIAG_TABLES) {
    const row = await safeFirst(db, `SELECT COUNT(*) AS n FROM ${t}`);
    tables.push({ table: t, rows: row ? Number(row.n) : null });
  }
  const tc = await safeFirst(db, "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'");
  const media = (await safeFirst(db, 'SELECT COUNT(*) AS n, COALESCE(SUM(file_size_bytes),0) AS bytes FROM media_files'))
    || (await safeFirst(db, 'SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes),0) AS bytes FROM media_assets WHERE deleted_at IS NULL'));
  let r2 = { bound: Boolean(env.MEDIA), reachable: false, error: '' };
  if (env.MEDIA && typeof env.MEDIA.list === 'function') {
    const t0 = Date.now();
    try { await env.MEDIA.list({ limit: 1 }); r2 = { bound: true, reachable: true, latency_ms: Date.now() - t0, error: '' }; }
    catch (e) { r2 = { bound: true, reachable: false, error: String(e && e.message || e).slice(0, 160) }; }
  }
  return json({
    ok: true,
    d1: { table_count: Number((tc && tc.n) || 0), tables },
    r2: { ...r2, bucket: 'cso-media', files: Number((media && media.n) || 0), bytes: Number((media && media.bytes) || 0) },
    service_worker: { expected_cache_version: ACTIVE_SW_CACHE_VERSION },
    generated_at: new Date().toISOString()
  });
}

// ---------- POST /api/admin/purge-caches (admin only) ----------
export async function handlePurgeCaches(request, env, actor) {
  const invalidated = await invalidateAllPublicCaches(request);
  let purged = null;
  try { purged = await manageEdgeCache(request, env, { action: 'purge' }); } catch { purged = null; }
  await audit(env, request, actor, 'cache.purge_all', 'edge_cache', null, { by: actor && actor.email });
  return json({ ok: true, invalidated: invalidated && invalidated.invalidated ? invalidated.invalidated : 0, purged: Boolean(purged), at: new Date().toISOString() });
}

// ---------- GET /api/admin/command-index (palette search corpus) ----------
export async function handleCommandIndex(request, env) {
  const [blocks, cats, menus] = await Promise.all([
    safeAll(env.DB, 'SELECT id, section_key, title_en, is_published FROM homepage_blocks ORDER BY section_key, sort_order LIMIT 200'),
    safeAll(env.DB, 'SELECT id, name_en, name_or, landing_url, status FROM nav_categories ORDER BY sort_order LIMIT 200'),
    safeAll(env.DB, "SELECT id, label_en, label_or, url, status FROM nav_menu_items WHERE menu_location = 'header' ORDER BY sort_order LIMIT 200")
  ]);
  return json({
    ok: true,
    homepage_blocks: blocks || [],
    categories: cats || [],
    menu_items: menus || []
  });
}

// ---------- GET /api/admin/media-library ----------
export async function handleMediaLibrary(request, env) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const kind = url.searchParams.get('kind') || '';
  const like = `%${q.replace(/[%_\\]/g, '')}%`;
  let rows = await safeAll(env.DB,
    `SELECT id, original_filename, title_en, file_category, mime_type, file_size_bytes, public_url, created_at
     FROM media_files WHERE public_url != '' AND (? = '' OR file_category = ?) AND (original_filename LIKE ? OR title_en LIKE ?)
     ORDER BY created_at DESC LIMIT 60`, [kind, kind, like, like]);
  if (rows === null) rows = [];
  const origin = new URL(request.url).origin;
  return json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id, name: r.original_filename || r.title_en || r.id, category: r.file_category, mime: r.mime_type,
      size: Number(r.file_size_bytes || 0), url: r.public_url, absolute_url: r.public_url.startsWith('/') ? origin + r.public_url : r.public_url,
      created_at: r.created_at
    }))
  });
}

// ---------- GET /api/admin/slug-check?pillar=&slug=&exclude= ----------
export async function handleSlugCheck(request, env) {
  const url = new URL(request.url);
  const pillar = url.searchParams.get('pillar') || '';
  const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase().slice(0, 160);
  const exclude = url.searchParams.get('exclude') || '';
  const def = PILLAR_TABLES[pillar];
  if (!def || !def.slug) throw validationError({ pillar: 'Pillar does not support slugs' });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return json({ ok: true, valid: false, available: false, reason: 'Slug must be lowercase letters, numbers and hyphens.' });
  const row = await safeFirst(env.DB, `SELECT id FROM ${def.table} WHERE slug = ? AND id != ? LIMIT 1`, [slug, exclude]);
  return json({ ok: true, valid: true, available: !row, conflict_id: row ? row.id : null });
}

// ---------- /api/admin/bulk-content (list / status change / delete / export) ----------
export async function handleBulkContent(request, env, actor) {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const pillar = url.searchParams.get('pillar') || 'jobs';
    const def = PILLAR_TABLES[pillar];
    if (!def) throw validationError({ pillar: 'Unknown pillar' });
    const status = url.searchParams.get('status') || '';
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80).replace(/[%_\\]/g, '');
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 100));
    const where = ['1=1']; const binds = [];
    if (status) { where.push('status = ?'); binds.push(status); }
    if (q) { where.push(`${def.title} LIKE ?`); binds.push(`%${q}%`); }
    const rows = await safeAll(env.DB,
      `SELECT id, ${def.title} AS title, ${def.slug ? 'slug' : "'' AS slug"}, status, updated_at FROM ${def.table} WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`, [...binds, limit]);
    if (rows === null) return json({ ok: true, pillar, available: false, items: [] });
    return json({ ok: true, pillar, available: true, label: def.label, items: rows });
  }
  if (request.method === 'POST') {
    const body = await readJson(request);
    const def = PILLAR_TABLES[body.pillar];
    if (!def) throw validationError({ pillar: 'Unknown pillar' });
    const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 200) : [];
    if (!ids.length) throw validationError({ ids: 'ids array is required.' });
    const action = String(body.action || '');
    let stmts;
    if (action === 'publish' || action === 'draft') {
      const status = action === 'publish' ? 'published' : 'draft';
      stmts = ids.map((id) => env.DB.prepare(`UPDATE ${def.table} SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id));
    } else if (action === 'delete') {
      stmts = ids.map((id) => env.DB.prepare(`DELETE FROM ${def.table} WHERE id = ?`).bind(id));
    } else if (action === 'export') {
      const marks = ids.map(() => '?').join(',');
      const rows = await safeAll(env.DB, `SELECT * FROM ${def.table} WHERE id IN (${marks})`, ids);
      return json({ ok: true, pillar: body.pillar, exported_at: new Date().toISOString(), items: rows || [] });
    } else throw validationError({ action: 'action must be publish, draft, delete or export.' });
    await env.DB.batch(stmts);
    await audit(env, request, actor, `${body.pillar}.bulk_${action}`, def.table, null, { count: ids.length });
    return json({ ok: true, action, affected: ids.length });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// Router entry: resource names handled here.
export const COMMAND_SUITE_RESOURCES = ['overview-stats', 'audit-feed', 'system-diagnostics', 'purge-caches', 'command-index', 'media-library', 'slug-check', 'bulk-content'];

export async function handleCommandSuiteAdmin(request, env, actor, resource) {
  const method = request.method;
  const isRead = method === 'GET' || method === 'HEAD';
  let res;
  switch (resource) {
    case 'overview-stats': if (!isRead) break; return handleOverviewStats(request, env);
    case 'audit-feed': if (!isRead) break; return handleAuditFeed(request, env);
    case 'system-diagnostics': if (!isRead) break; return handleDiagnostics(request, env);
    case 'command-index': if (!isRead) break; return handleCommandIndex(request, env);
    case 'media-library': if (!isRead) break; return handleMediaLibrary(request, env);
    case 'slug-check': if (!isRead) break; return handleSlugCheck(request, env);
    case 'purge-caches':
      if (method !== 'POST') break;
      if (!actor || actor.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Only admins can purge edge caches');
      res = await handlePurgeCaches(request, env, actor);
      return res;
    case 'bulk-content':
      res = await handleBulkContent(request, env, actor);
      if (method === 'POST' && res.status < 400) await invalidateAllPublicCaches(request);
      return res;
    default: break;
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
