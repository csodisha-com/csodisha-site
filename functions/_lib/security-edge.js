// Security, Privacy & RBAC Suite — Modules #4, #5, #6 & #7
// - Module #4: Cloudflare Turnstile & Edge Bot Deterrence Rules
// - Module #5: Visual Audit Log Timeline Explorer & Event Streams
// - Module #6: IP Access Control Lists (Allowlist / Blocklist) & Geofencing
// - Module #7: Two-Factor Authentication (2FA / TOTP) & Hardware Keys
import { json, readJson, HttpError, clientIp } from './http.js';
import { audit } from './rbac.js';
import { redactForensicPayload } from './ops-hygiene.js';
import {
  twoFactorChannels,
  isTwoFactorConfigured,
  verifyTotp,
  generateBackupCode,
  sha256Hex
} from './admin-2fa.js';

export const BOT_DETERRENCE_KEY = 'sec_bot_deterrence';
export const IP_GEOFENCE_KEY = 'sec_ip_geofence';
export const TWOFA_POLICY_KEY = 'sec_2fa_policy';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function upsertSettingSql() {
  return `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_by = excluded.updated_by,
            updated_at = excluded.updated_at`;
}

async function ensureSiteSettingsTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS site_settings (
       key TEXT PRIMARY KEY,
       value_json TEXT NOT NULL,
       updated_by TEXT,
       updated_at TEXT NOT NULL
     )`
  ).run();
}

export async function ensureAuditLogTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS audit_log (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       actor_user_id TEXT,
       action TEXT NOT NULL,
       target_type TEXT,
       target_id TEXT,
       metadata_json TEXT,
       ip_address TEXT,
       created_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`
  ).run();
}

async function tableExists(db, tableName) {
  try {
    const row = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
    ).bind(tableName).first();
    return Boolean(row && row.name);
  } catch {
    return false;
  }
}

async function readSettingRow(db, key) {
  await ensureSiteSettingsTable(db);
  try {
    return await db.prepare(
      `SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`
    ).bind(key).first();
  } catch {
    return null;
  }
}

// ============================================================================
// Module #4: Cloudflare Turnstile & Edge Bot Deterrence Rules
// ============================================================================
export function defaultBotDeterrenceConfig() {
  return {
    turnstile_mode: 'managed',
    protect_login: true,
    protect_contact_forms: true,
    protect_public_search_api: false,
    login_rate_limit_max: 10,
    login_window_minutes: 15,
    block_empty_user_agent: true
  };
}

function normalizeBotDeterrenceConfig(raw) {
  const def = defaultBotDeterrenceConfig();
  if (!raw || typeof raw !== 'object') return def;
  const allowedModes = ['managed', 'non_interactive', 'invisible', 'off'];
  const mode = allowedModes.includes(raw.turnstile_mode) ? raw.turnstile_mode : def.turnstile_mode;
  return {
    turnstile_mode: mode,
    protect_login: raw.protect_login !== undefined ? Boolean(raw.protect_login) : def.protect_login,
    protect_contact_forms: raw.protect_contact_forms !== undefined ? Boolean(raw.protect_contact_forms) : def.protect_contact_forms,
    protect_public_search_api: raw.protect_public_search_api !== undefined ? Boolean(raw.protect_public_search_api) : def.protect_public_search_api,
    login_rate_limit_max: Math.max(3, Math.min(30, Math.round(Number(raw.login_rate_limit_max) || def.login_rate_limit_max))),
    login_window_minutes: Math.max(5, Math.min(60, Math.round(Number(raw.login_window_minutes) || def.login_window_minutes))),
    block_empty_user_agent: raw.block_empty_user_agent !== undefined ? Boolean(raw.block_empty_user_agent) : def.block_empty_user_agent
  };
}

export async function getBotDeterrenceState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  const row = await readSettingRow(env.DB, BOT_DETERRENCE_KEY);
  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const config = normalizeBotDeterrenceConfig(parsed);

  let rateLimitBlocks = 0;
  if (await tableExists(env.DB, 'admin_rate_limits')) {
    try {
      const rlRow = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM admin_rate_limits WHERE count >= ?`
      ).bind(config.login_rate_limit_max).first();
      rateLimitBlocks = Number(rlRow && rlRow.n) || 0;
    } catch {}
  }

  let recentEvents = [];
  if (await tableExists(env.DB, 'audit_log')) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, actor_user_id, action, target_id, ip_address, created_at
         FROM audit_log
         WHERE action LIKE 'auth.fail%' OR action LIKE 'auth.lockout%' OR action LIKE 'security.bot%'
         ORDER BY id DESC LIMIT 10`
      ).all();
      recentEvents = results || [];
    } catch {}
  }

  return {
    ok: true,
    config,
    env_bindings: {
      turnstile_site_key_configured: Boolean(String(env.TURNSTILE_SITE_KEY || '').trim()),
      turnstile_secret_key_configured: Boolean(String(env.TURNSTILE_SECRET_KEY || '').trim())
    },
    rate_limit_blocks: rateLimitBlocks,
    recent_events: recentEvents,
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null
  };
}

export async function saveBotDeterrenceConfig(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  const allowedModes = ['managed', 'non_interactive', 'invisible', 'off'];
  if (input.turnstile_mode !== undefined && !allowedModes.includes(input.turnstile_mode)) {
    throw new HttpError(400, 'INVALID_TURNSTILE_MODE', 'turnstile_mode must be managed, non_interactive, invisible, or off');
  }
  if (input.login_rate_limit_max !== undefined) {
    const n = Number(input.login_rate_limit_max);
    if (!Number.isInteger(n) || n < 3 || n > 30) {
      throw new HttpError(400, 'INVALID_RATE_LIMIT', 'login_rate_limit_max must be an integer between 3 and 30');
    }
  }
  if (input.login_window_minutes !== undefined) {
    const w = Number(input.login_window_minutes);
    if (!Number.isInteger(w) || w < 5 || w > 60) {
      throw new HttpError(400, 'INVALID_WINDOW', 'login_window_minutes must be an integer between 5 and 60');
    }
  }

  const current = (await getBotDeterrenceState(env)).config;
  const next = normalizeBotDeterrenceConfig({ ...current, ...input });
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    BOT_DETERRENCE_KEY,
    JSON.stringify(next),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getBotDeterrenceState(env);
}

export async function simulateBotChallenge(env, {
  path = '/api/auth/login',
  user_agent = 'Mozilla/5.0',
  attempts_in_window = 1,
  has_turnstile_token = false
} = {}) {
  const state = await getBotDeterrenceState(env);
  const cfg = state.config;
  const cleanPath = String(path || '/').trim() || '/';
  const cleanUa = String(user_agent || '').trim();
  const attempts = Math.max(0, Number(attempts_in_window) || 0);

  if (attempts >= cfg.login_rate_limit_max) {
    return {
      ok: true,
      path: cleanPath,
      verdict: 'RATE_LIMITED',
      reason_code: 'RATE_LIMIT_EXCEEDED',
      rationale: `Requests (${attempts}) reached or exceeded login_rate_limit_max (${cfg.login_rate_limit_max} per ${cfg.login_window_minutes}m).`
    };
  }

  if (cfg.block_empty_user_agent && !cleanUa) {
    return {
      ok: true,
      path: cleanPath,
      verdict: 'CHALLENGE',
      reason_code: 'EMPTY_USER_AGENT',
      rationale: 'Empty User-Agent triggered automated bot challenge policy.'
    };
  }

  const isLoginSurface = /^\/(api\/auth|login|admin\/login)/i.test(cleanPath);
  const isFormSurface = /^\/(api\/feedback|contact)/i.test(cleanPath);
  const isSearchSurface = /^\/api\/(search|jobs|schemes)/i.test(cleanPath);

  const surfaceProtected =
    (isLoginSurface && cfg.protect_login) ||
    (isFormSurface && cfg.protect_contact_forms) ||
    (isSearchSurface && cfg.protect_public_search_api);

  if (cfg.turnstile_mode !== 'off' && surfaceProtected && !has_turnstile_token) {
    return {
      ok: true,
      path: cleanPath,
      verdict: 'CHALLENGE',
      reason_code: 'TURNSTILE_TOKEN_REQUIRED',
      rationale: `Protected surface "${cleanPath}" requires a verified Turnstile (${cfg.turnstile_mode}) token.`
    };
  }

  return {
    ok: true,
    path: cleanPath,
    verdict: 'PASS',
    reason_code: 'ALLOW_EDGE_REQUEST',
    rationale: `Request to "${cleanPath}" passed rate-limit, User-Agent, and Turnstile (${cfg.turnstile_mode}) checks.`
  };
}

// ============================================================================
// Module #5: Visual Audit Log Timeline Explorer & Event Streams
// ============================================================================
export async function getAuditTimelineStream(env, {
  category = 'all',
  actor = '',
  hours = 0,
  q = '',
  limit = 25,
  offset = 0
} = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureAuditLogTable(env.DB);

  const hasUsers = await tableExists(env.DB, 'users');
  const cleanCategory = ['all', 'auth', 'security', 'content', 'ops'].includes(category) ? category : 'all';
  const cleanHours = Math.max(0, Math.min(8760, Number(hours) || 0));
  const cleanLimit = Math.max(1, Math.min(100, Math.round(Number(limit) || 25)));
  const cleanOffset = Math.max(0, Math.round(Number(offset) || 0));

  const where = ['1=1'];
  const binds = [];

  if (cleanCategory === 'auth') {
    where.push(`a.action LIKE 'auth.%'`);
  } else if (cleanCategory === 'security') {
    where.push(`(a.action LIKE 'security.%' OR a.action LIKE 'incident.%' OR a.action LIKE 'user.%')`);
  } else if (cleanCategory === 'content') {
    where.push(`(a.action LIKE 'post.%' OR a.action LIKE 'page.%' OR a.action LIKE 'mock.%' OR a.action LIKE 'media.%')`);
  } else if (cleanCategory === 'ops') {
    where.push(`a.action LIKE 'ops.%'`);
  }

  const cleanActor = String(actor || '').trim().slice(0, 120);
  if (cleanActor) {
    if (hasUsers) {
      where.push(`(a.actor_user_id LIKE ? OR u.email LIKE ?)`);
      binds.push(`%${cleanActor}%`, `%${cleanActor}%`);
    } else {
      where.push(`a.actor_user_id LIKE ?`);
      binds.push(`%${cleanActor}%`);
    }
  }

  if (cleanHours > 0) {
    where.push(`a.created_at >= datetime('now', ?)`);
    binds.push(`-${cleanHours} hours`);
  }

  const cleanQ = String(q || '').trim().slice(0, 120);
  if (cleanQ) {
    const likeQ = `%${cleanQ}%`;
    where.push(`(a.action LIKE ? OR a.target_type LIKE ? OR a.target_id LIKE ? OR a.metadata_json LIKE ?)`);
    binds.push(likeQ, likeQ, likeQ, likeQ);
  }

  const joinSql = hasUsers ? 'LEFT JOIN users u ON u.id = a.actor_user_id' : '';
  const whereSql = where.join(' AND ');

  const [countRow, totalAllRow, highRiskRow, contribRow, bucketRows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log a ${joinSql} WHERE ${whereSql}`).bind(...binds).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'security.%' OR action LIKE 'auth.fail%' OR action LIKE 'incident.%'`).first(),
    env.DB.prepare(`SELECT COUNT(DISTINCT actor_user_id) AS n FROM audit_log WHERE actor_user_id IS NOT NULL`).first(),
    env.DB.prepare(
      `SELECT
         SUM(CASE WHEN action LIKE 'auth.%' THEN 1 ELSE 0 END) AS auth_n,
         SUM(CASE WHEN action LIKE 'security.%' OR action LIKE 'incident.%' OR action LIKE 'user.%' THEN 1 ELSE 0 END) AS security_n,
         SUM(CASE WHEN action LIKE 'post.%' OR action LIKE 'page.%' OR action LIKE 'mock.%' OR action LIKE 'media.%' THEN 1 ELSE 0 END) AS content_n,
         SUM(CASE WHEN action LIKE 'ops.%' THEN 1 ELSE 0 END) AS ops_n,
         COUNT(*) AS all_n
       FROM audit_log`
    ).first()
  ]);

  const sql = hasUsers
    ? `SELECT a.id, a.actor_user_id, COALESCE(u.email, a.actor_user_id, 'system') AS actor_email,
              a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE ${whereSql}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`
    : `SELECT a.id, a.actor_user_id, COALESCE(a.actor_user_id, 'system') AS actor_email,
              a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at
       FROM audit_log a
       WHERE ${whereSql}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`;

  const { results } = await env.DB.prepare(sql).bind(...binds, cleanLimit, cleanOffset).all();
  const items = (results || []).map(row => {
    let parsedMeta = {};
    if (row.metadata_json) {
      try { parsedMeta = JSON.parse(row.metadata_json); } catch { parsedMeta = { raw: '[UNPARSEABLE]' }; }
    }
    const redactedMeta = redactForensicPayload(parsedMeta);
    return {
      id: row.id,
      actor_user_id: row.actor_user_id,
      actor_email: row.actor_email || 'system',
      action: row.action,
      target_type: row.target_type || null,
      target_id: row.target_id || null,
      ip_address: row.ip_address || null,
      created_at: row.created_at,
      metadata: redactedMeta
    };
  });

  const allN = Math.max(1, Number(bucketRows && bucketRows.all_n) || 0);
  const authN = Number(bucketRows && bucketRows.auth_n) || 0;
  const secN = Number(bucketRows && bucketRows.security_n) || 0;
  const contentN = Number(bucketRows && bucketRows.content_n) || 0;
  const opsN = Number(bucketRows && bucketRows.ops_n) || 0;

  return {
    ok: true,
    total: Number(countRow && countRow.n) || 0,
    total_all_events: Number(totalAllRow && totalAllRow.n) || 0,
    high_risk_events: Number(highRiskRow && highRiskRow.n) || 0,
    active_contributors: Number(contribRow && contribRow.n) || 0,
    dpdp_redacted: true,
    limit: cleanLimit,
    offset: cleanOffset,
    velocity_buckets: [
      { key: 'auth', label: 'Auth & Sessions', count: authN, pct: Math.round((authN / allN) * 100) },
      { key: 'security', label: 'Security & RBAC', count: secN, pct: Math.round((secN / allN) * 100) },
      { key: 'content', label: 'Content Engines', count: contentN, pct: Math.round((contentN / allN) * 100) },
      { key: 'ops', label: 'Ops & Backups', count: opsN, pct: Math.round((opsN / allN) * 100) }
    ],
    items
  };
}

// ============================================================================
// Module #6: IP Access Control Lists (Allowlist / Blocklist) & Geofencing
// ============================================================================
export function defaultIpGeofencePolicy() {
  return {
    enforcement_mode: 'monitor_only',
    allowed_countries: ['IN'],
    blocked_countries: [],
    allowlist_ips: [],
    blocklist_ips: []
  };
}

function isValidCountryCode(code) {
  return /^[A-Z]{2}$/.test(String(code || '').trim());
}

function parseIpv4(ip) {
  const parts = String(ip || '').trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    num = (num << 8) | n;
  }
  return num >>> 0;
}

function isValidIpOrCidr(val) {
  const s = String(val || '').trim();
  if (!s) return false;
  const slashIdx = s.indexOf('/');
  const ipPart = slashIdx >= 0 ? s.slice(0, slashIdx) : s;
  const prefixStr = slashIdx >= 0 ? s.slice(slashIdx + 1) : '';
  if (parseIpv4(ipPart) !== null) {
    if (slashIdx < 0) return true;
    if (!/^\d{1,2}$/.test(prefixStr)) return false;
    const p = Number(prefixStr);
    return p >= 0 && p <= 32;
  }
  // IPv6 / IPv6 CIDR validation
  if (/^[0-9a-fA-F:]+$/.test(ipPart) && ipPart.includes(':')) {
    if (slashIdx < 0) return true;
    if (!/^\d{1,3}$/.test(prefixStr)) return false;
    const p = Number(prefixStr);
    return p >= 0 && p <= 128;
  }
  return false;
}

function ipMatchesRule(ip, rule) {
  const cleanIp = String(ip || '').trim();
  const cleanRule = String(rule || '').trim();
  if (!cleanIp || !cleanRule) return false;
  if (cleanIp === cleanRule) return true;
  const slashIdx = cleanRule.indexOf('/');
  if (slashIdx < 0) return false;
  const baseIp = cleanRule.slice(0, slashIdx);
  const prefix = Number(cleanRule.slice(slashIdx + 1));
  const ipNum = parseIpv4(cleanIp);
  const baseNum = parseIpv4(baseIp);
  if (ipNum !== null && baseNum !== null && Number.isInteger(prefix) && prefix >= 0 && prefix <= 32) {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (ipNum & mask) === (baseNum & mask);
  }
  return false;
}

function sanitizeStringList(arr, validator, errCode, label) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    const clean = String(raw || '').trim();
    if (!clean) continue;
    const norm = label === 'country' ? clean.toUpperCase() : clean;
    if (!validator(norm)) {
      throw new HttpError(400, errCode, `Invalid ${label} entry: "${clean}"`);
    }
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

function normalizeIpGeofencePolicy(raw) {
  const def = defaultIpGeofencePolicy();
  if (!raw || typeof raw !== 'object') return def;
  return {
    enforcement_mode: raw.enforcement_mode === 'enforce' ? 'enforce' : 'monitor_only',
    allowed_countries: Array.isArray(raw.allowed_countries) ? raw.allowed_countries : def.allowed_countries,
    blocked_countries: Array.isArray(raw.blocked_countries) ? raw.blocked_countries : [],
    allowlist_ips: Array.isArray(raw.allowlist_ips) ? raw.allowlist_ips : [],
    blocklist_ips: Array.isArray(raw.blocklist_ips) ? raw.blocklist_ips : []
  };
}

export function evaluateIpAccess(policy, { ip = '', country = 'IN' } = {}) {
  const cleanIp = String(ip || '').trim();
  const cleanCountry = String(country || '').trim().toUpperCase();
  const isEnforce = policy.enforcement_mode === 'enforce';

  for (const rule of (policy.allowlist_ips || [])) {
    if (ipMatchesRule(cleanIp, rule)) {
      return {
        allowed: true,
        decision: 'ALLOW',
        matching_rule: `allowlist:${rule}`,
        rationale: `IP "${cleanIp}" explicitly matched allowlist rule "${rule}".`
      };
    }
  }

  for (const rule of (policy.blocklist_ips || [])) {
    if (ipMatchesRule(cleanIp, rule)) {
      return {
        allowed: !isEnforce,
        decision: isEnforce ? 'BLOCKED' : 'WOULD_BLOCK (MONITOR)',
        matching_rule: `blocklist:${rule}`,
        rationale: `IP "${cleanIp}" matched blocklist rule "${rule}" (${isEnforce ? 'enforced' : 'monitor-only'}).`
      };
    }
  }

  if (cleanCountry && (policy.blocked_countries || []).includes(cleanCountry)) {
    return {
      allowed: !isEnforce,
      decision: isEnforce ? 'BLOCKED' : 'WOULD_BLOCK (MONITOR)',
      matching_rule: `blocked_country:${cleanCountry}`,
      rationale: `Country "${cleanCountry}" is in blocked_countries (${isEnforce ? 'enforced' : 'monitor-only'}).`
    };
  }

  const allowedCountries = policy.allowed_countries || [];
  if (allowedCountries.length > 0 && cleanCountry && !allowedCountries.includes(cleanCountry)) {
    return {
      allowed: !isEnforce,
      decision: isEnforce ? 'BLOCKED' : 'WOULD_BLOCK (MONITOR)',
      matching_rule: `geofence_outside:${allowedCountries.join(',')}`,
      rationale: `Country "${cleanCountry}" is outside allowed_countries [${allowedCountries.join(', ')}] (${isEnforce ? 'enforced' : 'monitor-only'}).`
    };
  }

  return {
    allowed: true,
    decision: 'ALLOW',
    matching_rule: 'default_allow',
    rationale: `IP "${cleanIp || 'unknown'}" (${cleanCountry || 'unknown'}) passed IP ACL and country geofence checks.`
  };
}

function getCallerEdgeContext(request) {
  const ip = String(
    request.headers.get('CF-Connecting-IP') ||
    clientIp(request) ||
    '127.0.0.1'
  ).trim();
  const country = String(
    (request.cf && request.cf.country) ||
    request.headers.get('CF-IPCountry') ||
    'IN'
  ).trim().toUpperCase();
  return { ip, country };
}

export async function getIpGeofenceState(env, request) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  const row = await readSettingRow(env.DB, IP_GEOFENCE_KEY);
  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const policy = normalizeIpGeofencePolicy(parsed);
  const caller = request ? getCallerEdgeContext(request) : { ip: '127.0.0.1', country: 'IN' };

  return {
    ok: true,
    policy,
    caller,
    stats: {
      allowlist_count: policy.allowlist_ips.length,
      blocklist_count: policy.blocklist_ips.length,
      allowed_countries_count: policy.allowed_countries.length,
      blocked_countries_count: policy.blocked_countries.length
    },
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null
  };
}

export async function saveIpGeofencePolicy(env, request, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  const mode = input.enforcement_mode !== undefined
    ? String(input.enforcement_mode).trim()
    : 'monitor_only';
  if (!['monitor_only', 'enforce'].includes(mode)) {
    throw new HttpError(400, 'INVALID_ENFORCEMENT_MODE', 'enforcement_mode must be monitor_only or enforce');
  }

  const next = {
    enforcement_mode: mode,
    allowed_countries: sanitizeStringList(input.allowed_countries ?? ['IN'], isValidCountryCode, 'INVALID_COUNTRY_CODE', 'country'),
    blocked_countries: sanitizeStringList(input.blocked_countries ?? [], isValidCountryCode, 'INVALID_COUNTRY_CODE', 'country'),
    allowlist_ips: sanitizeStringList(input.allowlist_ips ?? [], isValidIpOrCidr, 'INVALID_IP_OR_CIDR', 'IP/CIDR'),
    blocklist_ips: sanitizeStringList(input.blocklist_ips ?? [], isValidIpOrCidr, 'INVALID_IP_OR_CIDR', 'IP/CIDR')
  };

  // Anti-Self-Lockout Guard: reject enforce mode if caller's own live IP/country would be blocked
  const caller = getCallerEdgeContext(request);
  if (next.enforcement_mode === 'enforce') {
    const check = evaluateIpAccess(next, caller);
    if (!check.allowed) {
      throw new HttpError(
        400,
        'SELF_LOCKOUT_PREVENTED',
        `Saving with enforce mode would block your own current edge IP (${caller.ip}) / country (${caller.country}) via ${check.matching_rule}. Add your IP to allowlist first.`
      );
    }
  }

  const nowIso = new Date().toISOString();
  await env.DB.prepare(upsertSettingSql()).bind(
    IP_GEOFENCE_KEY,
    JSON.stringify(next),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getIpGeofenceState(env, request);
}

// ============================================================================
// Module #7: Two-Factor Authentication (2FA / TOTP) & Hardware Keys
// ============================================================================
export function defaultTwoFactorPolicy() {
  return {
    enforcement: 'optional',
    grace_period_days: 7,
    allow_webauthn_passkeys: true
  };
}

function normalizeTwoFactorPolicy(raw) {
  const def = defaultTwoFactorPolicy();
  if (!raw || typeof raw !== 'object') return def;
  const enf = ['optional', 'admins_only', 'all_staff'].includes(raw.enforcement)
    ? raw.enforcement
    : def.enforcement;
  return {
    enforcement: enf,
    grace_period_days: Math.max(0, Math.min(90, Math.round(Number(raw.grace_period_days ?? def.grace_period_days)))),
    allow_webauthn_passkeys: raw.allow_webauthn_passkeys !== undefined
      ? Boolean(raw.allow_webauthn_passkeys)
      : def.allow_webauthn_passkeys
  };
}

function generateBase32Secret(byteLen = 20) {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export async function getTwoFactorGovernanceState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  const row = await readSettingRow(env.DB, TWOFA_POLICY_KEY);
  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const policy = normalizeTwoFactorPolicy(parsed);
  const channels = twoFactorChannels(env);
  const envConfigured = isTwoFactorConfigured(env) ||
    env.ENABLE_ADMIN_2FA === '1' ||
    env.ENABLE_ADMIN_2FA === 'true';

  const staffEnrollment = [];
  let enrolledCount = 0;
  if (await tableExists(env.DB, 'users')) {
    try {
      const cols = await env.DB.prepare(`PRAGMA table_info("users")`).all();
      const colSet = new Set((cols.results || []).map(c => c.name));
      const roleCol = colSet.has('role') ? 'role' : `'candidate' AS role`;
      const totpCol = colSet.has('totp_enabled') ? 'totp_enabled' : '0 AS totp_enabled';
      const { results } = await env.DB.prepare(
        `SELECT id, email, ${roleCol}, ${totpCol}
         FROM users
         WHERE ${colSet.has('role') ? `role IN ('admin', 'editor', 'reviewer')` : '1=0'}
         ORDER BY email ASC`
      ).all();
      for (const u of (results || [])) {
        const enabled = Boolean(u.totp_enabled) || (u.role === 'admin' && channels.totp);
        if (enabled) enrolledCount++;
        staffEnrollment.push({
          user_id: u.id,
          email: u.email,
          role: u.role,
          totp_enabled: enabled
        });
      }
    } catch {}
  }

  let backupCodesRemaining = 0;
  if (await tableExists(env.DB, 'admin_backup_codes')) {
    try {
      const bc = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM admin_backup_codes WHERE used_at IS NULL`
      ).first();
      backupCodesRemaining = Number(bc && bc.n) || 0;
    } catch {}
  }

  return {
    ok: true,
    binding_posture: envConfigured ? 'ENV_SECRET_ACTIVE' : 'ENV_SECRET_UNSET_DEV_MODE',
    channels,
    policy,
    staff_enrollment: staffEnrollment,
    enrolled_count: enrolledCount,
    total_staff: staffEnrollment.length,
    backup_codes_remaining: backupCodesRemaining,
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null
  };
}

export async function saveTwoFactorPolicy(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  if (input.enforcement !== undefined && !['optional', 'admins_only', 'all_staff'].includes(input.enforcement)) {
    throw new HttpError(400, 'INVALID_ENFORCEMENT', 'enforcement must be optional, admins_only, or all_staff');
  }
  if (input.grace_period_days !== undefined) {
    const g = Number(input.grace_period_days);
    if (!Number.isInteger(g) || g < 0 || g > 90) {
      throw new HttpError(400, 'INVALID_GRACE_DAYS', 'grace_period_days must be an integer between 0 and 90');
    }
  }

  const current = (await getTwoFactorGovernanceState(env)).policy;
  const next = normalizeTwoFactorPolicy({ ...current, ...input });
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    TWOFA_POLICY_KEY,
    JSON.stringify(next),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getTwoFactorGovernanceState(env);
}

export async function generateTwoFactorSetupPreview(actorEmail = 'admin@csodisha.com') {
  const secret = generateBase32Secret(20);
  const label = encodeURIComponent(`CS Odisha:${actorEmail || 'admin@csodisha.com'}`);
  const otpauthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('CS Odisha')}&algorithm=SHA1&digits=6&period=30`;

  const recoveryCodes = [];
  const hashedRecoveryCodes = [];
  for (let i = 0; i < 8; i++) {
    const code = generateBackupCode();
    recoveryCodes.push(code);
    hashedRecoveryCodes.push(await sha256Hex(code));
  }

  return {
    ok: true,
    secret_base32: secret,
    otpauth_uri: otpauthUri,
    recovery_codes: recoveryCodes,
    recovery_code_hashes: hashedRecoveryCodes,
    period_seconds: 30,
    digits: 6
  };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/security/{bot-deterrence|audit-stream|ip-geofence|2fa}
// ============================================================================
export async function handleSecurityEdge(request, env, actor, subAction, subId) {
  const method = request.method;
  const url = new URL(request.url);

  // Module #4: /api/admin/security/bot-deterrence
  if (subAction === 'bot-deterrence') {
    if (!subId && method === 'GET') {
      return json(await getBotDeterrenceState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update Turnstile & bot deterrence rules');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const state = await saveBotDeterrenceConfig(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.bot_deterrence.update', 'site_settings', BOT_DETERRENCE_KEY, state.config);
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'simulate' && method === 'POST') {
      const body = await readJson(request, 10000).catch(() => ({}));
      const sim = await simulateBotChallenge(env, {
        path: body && body.path,
        user_agent: body && body.user_agent,
        attempts_in_window: body && body.attempts_in_window,
        has_turnstile_token: Boolean(body && body.has_turnstile_token)
      });
      return json(sim, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #5: /api/admin/security/audit-stream
  if (subAction === 'audit-stream') {
    if (!subId && method === 'GET') {
      const stream = await getAuditTimelineStream(env, {
        category: url.searchParams.get('category') || 'all',
        actor: url.searchParams.get('actor') || '',
        hours: url.searchParams.get('hours') || 0,
        q: url.searchParams.get('q') || '',
        limit: url.searchParams.get('limit') || 25,
        offset: url.searchParams.get('offset') || 0
      });
      if (url.searchParams.get('download') === '1') {
        return new Response(JSON.stringify(stream, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': 'attachment; filename="cso-audit-stream.json"',
            'Cache-Control': 'no-store'
          }
        });
      }
      return json(stream, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #6: /api/admin/security/ip-geofence
  if (subAction === 'ip-geofence') {
    if (!subId && method === 'GET') {
      return json(await getIpGeofenceState(env, request), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update IP ACL & Geofencing rules');
      }
      const body = await readJson(request, 20000).catch(() => ({}));
      const state = await saveIpGeofencePolicy(env, request, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.ip_geofence.update', 'site_settings', IP_GEOFENCE_KEY, state.policy);
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'simulate' && method === 'POST') {
      const body = await readJson(request, 10000).catch(() => ({}));
      const state = await getIpGeofenceState(env, request);
      const cleanIp = String((body && body.ip) || state.caller.ip).trim();
      const cleanCountry = String((body && body.country) || state.caller.country).trim().toUpperCase();
      const evalRes = evaluateIpAccess(state.policy, { ip: cleanIp, country: cleanCountry });
      return json({
        ok: true,
        ip: cleanIp,
        country: cleanCountry,
        enforcement_mode: state.policy.enforcement_mode,
        ...evalRes
      }, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #7: /api/admin/security/2fa
  if (subAction === '2fa') {
    if (!subId && method === 'GET') {
      return json(await getTwoFactorGovernanceState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'policy' && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update 2FA enforcement policy');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const state = await saveTwoFactorPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.2fa.policy.update', 'site_settings', TWOFA_POLICY_KEY, state.policy);
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'setup-preview' && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can preview TOTP enrollment secrets');
      }
      const preview = await generateTwoFactorSetupPreview(actor.email || actor.userId);
      return json(preview, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'verify-code' && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can test TOTP verification');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const secret = String((body && body.secret_base32) || '').trim();
      const code = String((body && body.code) || '').trim();
      const valid = await verifyTotp(secret, code);
      return json({
        ok: true,
        valid,
        window_seconds: 30,
        message: valid ? 'Valid RFC 6238 TOTP code verified.' : 'Invalid or expired 6-digit TOTP code.'
      }, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown security edge endpoint');
}
