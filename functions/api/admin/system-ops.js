// Folder #10 Backend: System, Security, Audit Logs, Sessions, Feature Flags, Redirects & Backups (v310)
// Zero mock data: all audit logs, sessions, flags, redirects, and backups come strictly from D1.
import { HttpError, json, readJson, validationError, clientIp } from '../../_lib/http.js';
import { invalidateAllPublicCaches, registerCacheInvalidator } from '../../_lib/edge-cache-invalidator.js';
import { setReadOnlyFreezeState, ACTIVE_SW_CACHE_VERSION } from '../../_lib/ops-sentinel.js';
import {
  hasEmailProviderSecret,
  getEmailProviderName,
  isAdminEmailOtpFlagEnabled,
  isAdminEmailOtpEnabled,
  createAndSendAdminEmailOtp
} from '../../_lib/admin-email-otp.js';
import { handleSitemapXml } from '../content/_seo.js';
import { escShell } from '../../_lib/ssr-shell.js';

export const CANONICAL_FEATURE_FLAGS = [
  {
    key: 'maintenance_mode',
    label: 'Maintenance Mode',
    description: 'Serve a clean HTTP 503 maintenance notice to public visitors while keeping /admin/ accessible.',
    defaultEnabled: false
  },
  {
    key: 'registrations_enabled',
    label: 'Candidate Registrations Enabled',
    description: 'Allow new candidate account sign-ups via /api/auth/register.',
    defaultEnabled: true
  },
  {
    key: 'community_posting_enabled',
    label: 'Community Posting Enabled',
    description: 'Allow authenticated members to publish posts, replies, and quizzes on /community/.',
    defaultEnabled: true
  },
  {
    key: 'emergency_read_only_mode',
    label: 'Emergency Read-Only Mode',
    description: 'Block all public write/mutating requests at the edge while preserving browsing and admin recovery.',
    defaultEnabled: false
  },
  {
    key: 'admin_email_otp_enabled',
    label: 'Admin Login Email OTP',
    description: 'Require 6-digit Email OTP verification on staff/admin login when RESEND_API_KEY or BREVO_API_KEY is configured.',
    defaultEnabled: true
  }
];

const VALID_FLAG_KEYS = new Set(CANONICAL_FEATURE_FLAGS.map(f => f.key));

export const BACKUP_CORE_TABLES = [
  'job_articles',
  'careers_articles',
  'scheme_articles',
  'study_articles',
  'mock_tests',
  'mock_questions',
  'mock_attempts',
  'candidate_assignments',
  'support_tickets',
  'community_posts',
  'about_articles',
  'institutional_pages',
  'site_snippets',
  'homepage_blocks',
  'media_files',
  'ad_slots',
  'monetization_plans',
  'payment_coupons',
  'payment_orders',
  'feature_flags',
  'redirects',
  'admin_audit_logs'
];

const EDGE_MEMO_TTL_MS = 30 * 1000;
let _schemaReadyDb = null;
let _flagsMemo = { at: 0, map: null };
let _redirectsMemo = { at: 0, map: null };
const _revokedHashMemo = new Map();

export function invalidateSystemOpsCache() {
  _flagsMemo = { at: 0, map: null };
  _redirectsMemo = { at: 0, map: null };
  _revokedHashMemo.clear();
}
registerCacheInvalidator(invalidateSystemOpsCache);

export async function ensureSystemOpsSchema(db) {
  if (!db || _schemaReadyDb === db) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id TEXT,
        actor_email TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        target TEXT NOT NULL DEFAULT '',
        ip_address TEXT NOT NULL DEFAULT '',
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS admin_sessions (
        id TEXT PRIMARY KEY,
        session_token_hash TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        ip_address TEXT NOT NULL DEFAULT '',
        user_agent TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at INTEGER NOT NULL DEFAULT 0,
        revoked_at TEXT
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS feature_flags (
        key TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by TEXT NOT NULL DEFAULT ''
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS redirects (
        id TEXT PRIMARY KEY,
        source_path TEXT NOT NULL UNIQUE,
        target_url TEXT NOT NULL,
        status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
        is_active INTEGER NOT NULL DEFAULT 1,
        hits INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by TEXT NOT NULL DEFAULT ''
      )`
    ).run();
    _schemaReadyDb = db;
  } catch {
    // Graceful skip if DB unavailable
  }
}

export async function hashSessionToken(token) {
  const data = new TextEncoder().encode(String(token || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Records a real admin audit event asynchronously via ctx.waitUntil() when available. */
export function recordAdminAuditLog(env, request, actor, action, target = '', metadata = null, ctx = null) {
  if (!env || !env.DB || !action) return Promise.resolve();
  const ip = request ? clientIp(request) : '';
  const task = (async () => {
    try {
      await ensureSystemOpsSchema(env.DB);
      await env.DB.prepare(
        `INSERT INTO admin_audit_logs (actor_user_id, actor_email, action, target, ip_address, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        actor && actor.userId ? String(actor.userId) : null,
        actor && actor.email ? String(actor.email) : 'system',
        String(action).slice(0, 120),
        String(target || '').slice(0, 240),
        String(ip || '').slice(0, 80),
        metadata ? JSON.stringify(metadata).slice(0, 4000) : null,
        new Date().toISOString()
      ).run();
    } catch (err) {
      console.error('admin_audit_logs write failed:', err);
    }
  })();

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  }
  return task;
}

/** Tracks an active admin/editor session in `admin_sessions` using only the SHA-256 token hash. */
export function registerAdminSession(env, request, { token, userId, email, role, expiresAt }, ctx = null) {
  if (!env || !env.DB || !token || !userId) return Promise.resolve();
  const ip = request ? clientIp(request) : '';
  const ua = request ? String(request.headers.get('User-Agent') || '').slice(0, 240) : '';
  const task = (async () => {
    try {
      await ensureSystemOpsSchema(env.DB);
      const tokenHash = await hashSessionToken(token);
      const nowIso = new Date().toISOString();
      const id = `asess_${tokenHash.slice(0, 16)}`;
      await env.DB.prepare(
        `INSERT INTO admin_sessions (id, session_token_hash, user_id, email, role, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(session_token_hash) DO UPDATE SET
           last_seen_at = excluded.last_seen_at,
           ip_address = CASE WHEN excluded.ip_address != '' THEN excluded.ip_address ELSE admin_sessions.ip_address END,
           expires_at = CASE WHEN excluded.expires_at > 0 THEN excluded.expires_at ELSE admin_sessions.expires_at END`
      ).bind(id, tokenHash, String(userId), String(email || ''), String(role || 'admin'), ip, ua, nowIso, nowIso, Number(expiresAt || 0)).run();
    } catch (err) {
      console.error('admin_sessions register failed:', err);
    }
  })();
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  }
  return task;
}

/** Checks whether a staff session token has been explicitly force-revoked in `admin_sessions`. */
export async function isAdminSessionRevoked(env, token) {
  if (!env || !env.DB || !token) return false;
  try {
    const tokenHash = await hashSessionToken(token);
    const now = Date.now();
    const cached = _revokedHashMemo.get(tokenHash);
    if (cached && (now - cached.at) < 10000) return cached.revoked;

    const row = await env.DB.prepare(
      'SELECT revoked_at FROM admin_sessions WHERE session_token_hash = ?'
    ).bind(tokenHash).first();
    const revoked = Boolean(row && row.revoked_at);
    if (_revokedHashMemo.size > 500) _revokedHashMemo.clear();
    _revokedHashMemo.set(tokenHash, { at: now, revoked });
    return revoked;
  } catch {
    return false;
  }
}

export async function revokeAdminSessionByToken(env, token) {
  if (!env || !env.DB || !token) return;
  try {
    await ensureSystemOpsSchema(env.DB);
    const tokenHash = await hashSessionToken(token);
    await env.DB.prepare(
      'UPDATE admin_sessions SET revoked_at = ? WHERE session_token_hash = ? AND revoked_at IS NULL'
    ).bind(new Date().toISOString(), tokenHash).run();
    _revokedHashMemo.set(tokenHash, { at: Date.now(), revoked: true });
  } catch { /* ignore */ }
}

// ============================================================================
// EDGE-CACHED PUBLIC EVALUATORS (Read-only, zero D1 writes on hot public traffic)
// ============================================================================
export async function getPublicFeatureFlags(env) {
  const defaults = {};
  for (const f of CANONICAL_FEATURE_FLAGS) defaults[f.key] = f.defaultEnabled;
  if (!env || !env.DB) return defaults;

  const now = Date.now();
  if (_flagsMemo.at && (now - _flagsMemo.at) < EDGE_MEMO_TTL_MS && _flagsMemo.map) {
    return _flagsMemo.map;
  }
  try {
    const { results } = await env.DB.prepare('SELECT key, enabled FROM feature_flags').all();
    const map = { ...defaults };
    for (const r of results || []) {
      if (r && VALID_FLAG_KEYS.has(r.key)) {
        map[r.key] = Number(r.enabled) === 1;
      }
    }
    _flagsMemo = { at: now, map };
    return map;
  } catch {
    return defaults;
  }
}

function normalizeSourcePath(raw) {
  let p = String(raw || '').trim();
  if (!p) return '';
  if (!p.startsWith('/')) p = '/' + p;
  p = p.split('?')[0].split('#')[0].replace(/\/{2,}/g, '/');
  return p;
}

export async function matchActiveEdgeRedirect(env, pathname) {
  if (!env || !env.DB) return null;
  const cleanPath = normalizeSourcePath(pathname);
  if (!cleanPath || cleanPath.startsWith('/admin') || cleanPath.startsWith('/api/')) return null;

  const now = Date.now();
  if (!_redirectsMemo.at || (now - _redirectsMemo.at) >= EDGE_MEMO_TTL_MS || !_redirectsMemo.map) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT source_path, target_url, status_code FROM redirects WHERE is_active = 1'
      ).all();
      const map = new Map();
      for (const r of results || []) {
        if (r && r.source_path && r.target_url) {
          const sp = normalizeSourcePath(r.source_path);
          map.set(sp, {
            target_url: String(r.target_url),
            status_code: Number(r.status_code) === 302 ? 302 : 301
          });
        }
      }
      _redirectsMemo = { at: now, map };
    } catch {
      return null;
    }
  }

  const map = _redirectsMemo.map;
  if (!map || !map.size) return null;
  if (map.has(cleanPath)) return map.get(cleanPath);
  if (cleanPath.length > 1 && cleanPath.endsWith('/') && map.has(cleanPath.slice(0, -1))) {
    return map.get(cleanPath.slice(0, -1));
  }
  if (!cleanPath.endsWith('/') && map.has(cleanPath + '/')) {
    return map.get(cleanPath + '/');
  }
  return null;
}

export function renderMaintenancePageResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex, nofollow">
  <title>Scheduled Maintenance | Common Sense Odisha</title>
  <link rel="stylesheet" href="/assets/css/cso-themes.css?v=20261125v310">
  <link rel="stylesheet" href="/assets/style.css?v=20261125v310">
</head>
<body>
  <main id="main-content" class="cso-legal-main">
    <section class="cso-legal-card">
      <h1>Scheduled Maintenance in Progress</h1>
      <p>Common Sense Odisha is undergoing brief scheduled maintenance to keep recruitment alerts, welfare schemes, and study resources accurate and fast.</p>
      <p lang="or">କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ବର୍ତ୍ତମାନ ରକ୍ଷଣାବେକ୍ଷଣ ଅଧୀନରେ ଅଛି। ଦୟାକରି କିଛି ମିନିଟ୍ ପରେ ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।</p>
      <p>Please check back in a few minutes. Administrators may still access <a href="/admin/">Admin Studio</a>.</p>
    </section>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '300',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-CSO-Maintenance': '1'
    }
  });
}

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows) {
  if (!Array.isArray(rows) || !rows.length) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.map(csvEscape).join(',');
  const lines = rows.map(r => keys.map(k => csvEscape(r[k])).join(','));
  return [header, ...lines].join('\r\n');
}

// ============================================================================
// ADMIN API: /api/admin/system-ops/*
// ============================================================================
export async function handleAdminSystemOpsApi(request, env, actor, id, sub, ctx) {
  await ensureSystemOpsSchema(env.DB);
  const method = request.method;
  const url = new URL(request.url);

  // Lazily ensure the current active staff session is represented in admin_sessions
  if (actor && actor.sessionToken && actor.userId) {
    await registerAdminSession(env, request, {
      token: actor.sessionToken,
      userId: actor.userId,
      email: actor.email,
      role: actor.role,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30
    }, ctx);
  }

  // 1. GET /api/admin/system-ops/audit-logs
  if (id === 'audit-logs' && !sub && method === 'GET') {
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const action = (url.searchParams.get('action') || '').trim().slice(0, 80);

    const where = [];
    const binds = [];
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push("(actor_email LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\' OR target LIKE ? ESCAPE '\\' OR ip_address LIKE ? ESCAPE '\\')");
      binds.push(like, like, like, like);
    }
    if (action) {
      where.push("action LIKE ? ESCAPE '\\'");
      binds.push(`${action.replace(/[%_\\]/g, '\\$&')}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_audit_logs ${whereSql}`).bind(...binds).first();
    const { results } = await env.DB.prepare(
      `SELECT id, actor_user_id, actor_email, action, target, ip_address, metadata_json, created_at
       FROM admin_audit_logs ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all();

    return json({
      ok: true,
      total: Number((totalRow && totalRow.n) || 0),
      limit,
      offset,
      items: (results || []).map(r => {
        let meta = null;
        try { meta = r.metadata_json ? JSON.parse(r.metadata_json) : null; } catch { meta = null; }
        return {
          id: r.id,
          actor_user_id: r.actor_user_id,
          actor_email: r.actor_email || 'system',
          action: r.action,
          target: r.target || '',
          ip_address: r.ip_address || '',
          metadata: meta,
          created_at: r.created_at
        };
      })
    });
  }

  // 2. GET /api/admin/system-ops/sessions — list real active admin sessions (never exposing token hashes/tokens)
  if (id === 'sessions' && !sub && method === 'GET') {
    const nowUnix = Math.floor(Date.now() / 1000);
    const currentHash = actor && actor.sessionToken ? await hashSessionToken(actor.sessionToken) : '';
    const { results } = await env.DB.prepare(
      `SELECT id, session_token_hash, user_id, email, role, ip_address, user_agent, created_at, last_seen_at, expires_at
       FROM admin_sessions
       WHERE revoked_at IS NULL AND (expires_at = 0 OR expires_at > ?)
       ORDER BY last_seen_at DESC LIMIT 100`
    ).bind(nowUnix).all();

    return json({
      ok: true,
      total: (results || []).length,
      items: (results || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        email: r.email,
        role: r.role,
        ip_address: r.ip_address || '',
        user_agent: r.user_agent || '',
        created_at: r.created_at,
        last_seen_at: r.last_seen_at,
        expires_at: r.expires_at,
        is_current: Boolean(currentHash && r.session_token_hash === currentHash)
      }))
    });
  }

  // 3. POST /api/admin/system-ops/sessions/:sessionId/revoke (or DELETE /api/admin/system-ops/sessions/:sessionId)
  if (id === 'sessions' && sub && (method === 'POST' || method === 'DELETE')) {
    const sessionId = String(sub).trim();
    const row = await env.DB.prepare(
      'SELECT id, session_token_hash, user_id, email, revoked_at FROM admin_sessions WHERE id = ?'
    ).bind(sessionId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Admin session not found');

    const nowIso = new Date().toISOString();
    await env.DB.prepare('UPDATE admin_sessions SET revoked_at = ? WHERE id = ?').bind(nowIso, sessionId).run();
    if (row.session_token_hash) {
      _revokedHashMemo.set(row.session_token_hash, { at: Date.now(), revoked: true });
    }

    // Also remove matching session row from legacy `sessions` table if present
    try {
      const { results: userSessions } = await env.DB.prepare('SELECT token FROM sessions WHERE user_id = ?').bind(row.user_id).all();
      for (const s of userSessions || []) {
        if (s && s.token && (await hashSessionToken(s.token)) === row.session_token_hash) {
          await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(s.token).run();
        }
      }
    } catch { /* ignore if sessions table absent in unit tests */ }

    recordAdminAuditLog(env, request, actor, 'security.session.revoke', `admin_sessions:${sessionId}`, {
      revoked_email: row.email
    }, ctx);

    return json({ ok: true, revoked_id: sessionId, revoked_at: nowIso });
  }

  // 4. GET /api/admin/system-ops/flags
  if (id === 'flags' && !sub && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT key, enabled, description, updated_at, updated_by FROM feature_flags'
    ).all();
    const byKey = new Map((results || []).map(r => [r.key, r]));
    const items = CANONICAL_FEATURE_FLAGS.map(def => {
      const row = byKey.get(def.key);
      return {
        key: def.key,
        label: def.label,
        description: (row && row.description) || def.description,
        enabled: row ? Number(row.enabled) === 1 : def.defaultEnabled,
        persisted: Boolean(row),
        updated_at: row ? row.updated_at : null,
        updated_by: row ? row.updated_by : null
      };
    });
    return json({ ok: true, items });
  }

  // 5. PUT /api/admin/system-ops/flags/:key
  if (id === 'flags' && sub && (method === 'PUT' || method === 'POST')) {
    const key = String(sub).trim().toLowerCase();
    if (!VALID_FLAG_KEYS.has(key)) {
      throw validationError({ key: 'Unknown feature flag key' });
    }
    const def = CANONICAL_FEATURE_FLAGS.find(f => f.key === key);
    const body = await readJson(request, 8000);
    const enabled = Boolean(body.enabled);
    if (key === 'admin_email_otp_enabled' && enabled && !hasEmailProviderSecret(env)) {
      throw validationError({
        enabled: 'Cannot enable Admin Email OTP until RESEND_API_KEY or BREVO_API_KEY is configured.'
      });
    }
    const nowIso = new Date().toISOString();
    const updatedBy = (actor && actor.email) || 'admin';

    await env.DB.prepare(
      `INSERT INTO feature_flags (key, enabled, description, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         enabled = excluded.enabled,
         description = excluded.description,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    ).bind(key, enabled ? 1 : 0, def ? def.description : '', nowIso, updatedBy).run();

    // Keep legacy Ops Sentinel read-only freeze in sync when emergency_read_only_mode toggles
    if (key === 'emergency_read_only_mode') {
      try {
        await setReadOnlyFreezeState(env, { enabled, actorEmail: updatedBy });
      } catch { /* ignore if site_settings unavailable */ }
    }

    invalidateSystemOpsCache();
    await invalidateAllPublicCaches(request);
    recordAdminAuditLog(env, request, actor, 'system.flag.update', `feature_flags:${key}`, { enabled }, ctx);

    return json({
      ok: true,
      item: { key, enabled, description: def ? def.description : '', updated_at: nowIso, updated_by: updatedBy }
    });
  }

  // 6. GET /api/admin/system-ops/redirects
  if (id === 'redirects' && !sub && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, source_path, target_url, status_code, is_active, hits, created_at, updated_at, updated_by FROM redirects ORDER BY updated_at DESC'
    ).all();
    return json({ ok: true, total: (results || []).length, items: results || [] });
  }

  // 7. POST /api/admin/system-ops/redirects
  if (id === 'redirects' && !sub && method === 'POST') {
    const body = await readJson(request, 10000);
    const sourcePath = normalizeSourcePath(body.source_path);
    const targetUrl = String(body.target_url || '').trim();
    const statusCode = Number(body.status_code) === 302 ? 302 : 301;
    const isActive = body.is_active === false || body.is_active === 0 ? 0 : 1;

    if (!sourcePath || sourcePath === '/' || sourcePath.startsWith('/admin') || sourcePath.startsWith('/api/')) {
      throw validationError({ source_path: 'Source path must start with / and cannot override /, /admin, or /api.' });
    }
    if (!targetUrl || !(/^\/(?!\/)/.test(targetUrl) || /^https:\/\//i.test(targetUrl))) {
      throw validationError({ target_url: 'Target URL must be an internal /path or https:// URL.' });
    }
    if (targetUrl === sourcePath) {
      throw validationError({ target_url: 'Target URL cannot be identical to source path.' });
    }

    const rand = new Uint8Array(5);
    crypto.getRandomValues(rand);
    const redirId = `rdr_${Date.now()}_${Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    const nowIso = new Date().toISOString();
    const updatedBy = (actor && actor.email) || 'admin';

    await env.DB.prepare(
      `INSERT INTO redirects (id, source_path, target_url, status_code, is_active, hits, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
       ON CONFLICT(source_path) DO UPDATE SET
         target_url = excluded.target_url,
         status_code = excluded.status_code,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    ).bind(redirId, sourcePath, targetUrl, statusCode, isActive, nowIso, nowIso, updatedBy).run();

    const saved = await env.DB.prepare('SELECT * FROM redirects WHERE source_path = ?').bind(sourcePath).first();
    invalidateSystemOpsCache();
    recordAdminAuditLog(env, request, actor, 'seo.redirect.upsert', sourcePath, { target_url: targetUrl, status_code: statusCode, is_active: isActive }, ctx);

    return json({ ok: true, item: saved }, 201);
  }

  // 8. PUT / DELETE /api/admin/system-ops/redirects/:redirectId
  if (id === 'redirects' && sub && (method === 'PUT' || method === 'PATCH')) {
    const body = await readJson(request, 10000);
    const existing = await env.DB.prepare('SELECT * FROM redirects WHERE id = ?').bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Redirect rule not found');
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;
    const statusCode = body.status_code !== undefined ? (Number(body.status_code) === 302 ? 302 : 301) : existing.status_code;
    const targetUrl = body.target_url !== undefined ? String(body.target_url).trim() : existing.target_url;
    if (!(/^\/(?!\/)/.test(targetUrl) || /^https:\/\//i.test(targetUrl))) {
      throw validationError({ target_url: 'Target URL must be an internal /path or https:// URL.' });
    }
    const nowIso = new Date().toISOString();
    await env.DB.prepare(
      'UPDATE redirects SET target_url = ?, status_code = ?, is_active = ?, updated_at = ?, updated_by = ? WHERE id = ?'
    ).bind(targetUrl, statusCode, isActive, nowIso, (actor && actor.email) || 'admin', sub).run();
    const updated = await env.DB.prepare('SELECT * FROM redirects WHERE id = ?').bind(sub).first();
    invalidateSystemOpsCache();
    recordAdminAuditLog(env, request, actor, 'seo.redirect.update', existing.source_path, { is_active: isActive, status_code: statusCode }, ctx);
    return json({ ok: true, item: updated });
  }

  if (id === 'redirects' && sub && method === 'DELETE') {
    const existing = await env.DB.prepare('SELECT id, source_path FROM redirects WHERE id = ?').bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Redirect rule not found');
    await env.DB.prepare('DELETE FROM redirects WHERE id = ?').bind(sub).run();
    invalidateSystemOpsCache();
    recordAdminAuditLog(env, request, actor, 'seo.redirect.delete', existing.source_path, { id: sub }, ctx);
    return json({ ok: true, deleted_id: sub });
  }

  // 9. POST /api/admin/system-ops/purge-caches — returns X-CSO-Cache-Purged: 1
  if (id === 'purge-caches' && !sub && method === 'POST') {
    invalidateSystemOpsCache();
    const inv = await invalidateAllPublicCaches(request, ['/sitemap.xml', '/about/', '/terms/', '/terms-of-use/', '/privacy/', '/privacy-policy/', '/copyright/', '/copyright-policy/', '/disclaimer/']);
    recordAdminAuditLog(env, request, actor, 'system.cache.purge', 'edge_cache', { invalidated: inv.invalidated || 0 }, ctx);
    return json({
      ok: true,
      purged: true,
      invalidated: inv.invalidated || 0,
      sw_cache_version: ACTIVE_SW_CACHE_VERSION,
      purged_at: new Date().toISOString()
    }, 200, { 'X-CSO-Cache-Purged': '1' });
  }

  // 10. POST /api/admin/system-ops/regenerate-sitemap — purges & live-regenerates /sitemap.xml
  if (id === 'regenerate-sitemap' && !sub && method === 'POST') {
    await invalidateAllPublicCaches(request, ['/sitemap.xml', '/robots.txt', '/llms.txt']);
    const sitemapReq = new Request(new URL('/sitemap.xml', request.url).toString(), { method: 'GET' });
    let urlCount = 0;
    let xmlBytes = 0;
    try {
      const smRes = await handleSitemapXml(sitemapReq, env);
      const xml = await smRes.text();
      xmlBytes = xml.length;
      urlCount = (xml.match(/<loc>/g) || []).length;
    } catch {
      urlCount = 0;
    }
    const regeneratedAt = new Date().toISOString();
    recordAdminAuditLog(env, request, actor, 'seo.sitemap.regenerate', '/sitemap.xml', { url_count: urlCount, bytes: xmlBytes }, ctx);
    return json({
      ok: true,
      sitemap_url: '/sitemap.xml',
      url_count: urlCount,
      bytes: xmlBytes,
      regenerated_at: regeneratedAt
    }, 200, { 'X-CSO-Cache-Purged': '1' });
  }

  // 11. GET /api/admin/system-ops/backup?format=json|csv&table=... — real D1 export of core tables
  if (id === 'backup' && !sub && method === 'GET') {
    const format = (url.searchParams.get('format') || 'json').toLowerCase();
    const tableParam = (url.searchParams.get('table') || '').trim();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'csv') {
      const targetTable = BACKUP_CORE_TABLES.includes(tableParam) ? tableParam : 'job_articles';
      let rows = [];
      try {
        const res = await env.DB.prepare(`SELECT * FROM ${targetTable} LIMIT 5000`).all();
        rows = res.results || [];
      } catch {
        rows = [];
      }
      recordAdminAuditLog(env, request, actor, 'system.backup.export', `${targetTable}.csv`, { format: 'csv', rows: rows.length }, ctx);
      const csv = rowsToCsv(rows);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="cso-backup-${targetTable}-${stamp}.csv"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    const tablesToExport = tableParam && BACKUP_CORE_TABLES.includes(tableParam) ? [tableParam] : BACKUP_CORE_TABLES;
    const tablesData = {};
    const counts = {};
    for (const t of tablesToExport) {
      try {
        const res = await env.DB.prepare(`SELECT * FROM ${t} LIMIT 5000`).all();
        tablesData[t] = res.results || [];
        counts[t] = tablesData[t].length;
      } catch {
        tablesData[t] = [];
        counts[t] = 0;
      }
    }
    const payload = {
      exported_at: new Date().toISOString(),
      exported_by: (actor && actor.email) || 'admin',
      schema_version: 'v310',
      table_counts: counts,
      tables: tablesData
    };
    recordAdminAuditLog(env, request, actor, 'system.backup.export', tablesToExport.length === 1 ? tablesToExport[0] : 'all_core_tables', {
      format: 'json',
      table_counts: counts
    }, ctx);

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="cso-d1-backup-${stamp}.json"`,
        'Cache-Control': 'no-store'
      }
    });
  }

  // 13. GET /api/admin/system-ops/email-otp-status (v315)
  if (id === 'email-otp-status' && !sub && method === 'GET') {
    const providerConfigured = hasEmailProviderSecret(env);
    const flagEnabled = await isAdminEmailOtpFlagEnabled(env);
    const active = await isAdminEmailOtpEnabled(env);
    return json({
      ok: true,
      provider_configured: providerConfigured,
      provider: getEmailProviderName(env),
      flag_enabled: flagEnabled,
      active
    });
  }

  // 14. POST /api/admin/system-ops/test-email-otp (v315)
  if (id === 'test-email-otp' && !sub && method === 'POST') {
    if (!hasEmailProviderSecret(env)) {
      throw validationError({
        email: 'Email OTP: Provider Key Required (configure RESEND_API_KEY or BREVO_API_KEY).'
      });
    }
    const targetEmail = (actor && actor.email) || '';
    const targetId = (actor && actor.userId) || 'admin';
    if (!targetEmail) {
      throw validationError({ email: 'Current admin session has no email address.' });
    }
    const issued = await createAndSendAdminEmailOtp(env, { id: targetId, email: targetEmail }, request);
    recordAdminAuditLog(env, request, actor, 'admin.email_otp.test_sent', 'admin_email_otps', {
      challenge_id: issued.challenge_id,
      masked_email: issued.masked_email
    }, ctx);
    return json({
      ok: true,
      masked_email: issued.masked_email,
      expires_in: issued.expires_in
    });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown system-ops route');
}
