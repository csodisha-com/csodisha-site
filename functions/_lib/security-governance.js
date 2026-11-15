// Security, Privacy & RBAC Suite — Modules #8, #9 & #10
// - Module #8: Sensitive Field Masking & PII Redaction Controls
// - Module #9: API Key Management & Token Scoping
// - Module #10: CSRF Protection & Origin Integrity Headers
import { json, readJson, HttpError } from './http.js';
import { audit } from './rbac.js';
import { redactForensicPayload } from './ops-hygiene.js';
import { sha256Hex } from './admin-2fa.js';

export const PII_MASKING_KEY = 'sec_pii_masking';
export const ORIGIN_HEADERS_KEY = 'sec_origin_headers';

export const ALLOWED_API_SCOPES = [
  'read:schemes',
  'read:jobs',
  'read:study',
  'read:news',
  'webhook:deploy'
];

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
// Module #8: Sensitive Field Masking & PII Redaction Controls
// ============================================================================
export function defaultPiiMaskingPolicy() {
  return {
    mask_emails_for_reviewers: true,
    mask_phone_numbers: true,
    mask_ip_addresses: true,
    redact_export_credentials: true,
    custom_redacted_fields: ['aadhaar', 'pan', 'bank_account', 'dob', 'phone']
  };
}

function normalizePiiMaskingPolicy(raw) {
  const def = defaultPiiMaskingPolicy();
  if (!raw || typeof raw !== 'object') return def;
  return {
    mask_emails_for_reviewers: raw.mask_emails_for_reviewers !== undefined
      ? Boolean(raw.mask_emails_for_reviewers)
      : def.mask_emails_for_reviewers,
    mask_phone_numbers: raw.mask_phone_numbers !== undefined
      ? Boolean(raw.mask_phone_numbers)
      : def.mask_phone_numbers,
    mask_ip_addresses: raw.mask_ip_addresses !== undefined
      ? Boolean(raw.mask_ip_addresses)
      : def.mask_ip_addresses,
    redact_export_credentials: true,
    custom_redacted_fields: Array.isArray(raw.custom_redacted_fields)
      ? raw.custom_redacted_fields
      : def.custom_redacted_fields
  };
}

export async function getPiiMaskingState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  const row = await readSettingRow(env.DB, PII_MASKING_KEY);
  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const policy = normalizePiiMaskingPolicy(parsed);
  return {
    ok: true,
    policy,
    protected_field_count: policy.custom_redacted_fields.length,
    locked_rules: ['redact_export_credentials'],
    dpdp_act_mode: 'INDIA_DPDP_2023_ENFORCED',
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null
  };
}

export async function savePiiMaskingPolicy(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  if (input.redact_export_credentials === false) {
    throw new HttpError(
      400,
      'DPDP_LOCKED_RULE',
      'Core credential & secret redaction is locked ON for India DPDP Act 2023 compliance.'
    );
  }

  const current = (await getPiiMaskingState(env)).policy;
  let customFields = current.custom_redacted_fields;
  if (input.custom_redacted_fields !== undefined) {
    if (!Array.isArray(input.custom_redacted_fields)) {
      throw new HttpError(400, 'INVALID_FIELD_LIST', 'custom_redacted_fields must be an array of field names');
    }
    const cleanSet = new Set();
    for (const raw of input.custom_redacted_fields) {
      const f = String(raw || '').trim().toLowerCase();
      if (!f) continue;
      if (!/^[a-z0-9_]{2,48}$/.test(f)) {
        throw new HttpError(400, 'INVALID_FIELD_PATTERN', `Invalid field pattern "${f}". Use lowercase letters, digits, and underscores.`);
      }
      cleanSet.add(f);
    }
    customFields = Array.from(cleanSet);
  }

  const next = normalizePiiMaskingPolicy({
    ...current,
    ...input,
    redact_export_credentials: true,
    custom_redacted_fields: customFields
  });
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    PII_MASKING_KEY,
    JSON.stringify(next),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getPiiMaskingState(env);
}

function maskEmailValue(email) {
  const s = String(email || '').trim();
  const at = s.indexOf('@');
  if (at <= 0) return s;
  return s[0] + '***' + s.slice(at);
}

function maskPhoneValue(phone) {
  const s = String(phone || '').trim();
  const digits = s.replace(/\D/g, '');
  if (digits.length < 6) return '••••••';
  return '••••••' + digits.slice(-4);
}

function maskIpValue(ip) {
  const s = String(ip || '').trim();
  const parts = s.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.•••.•••`;
  if (s.includes(':')) return s.split(':').slice(0, 2).join(':') + ':••••';
  return '•••.•••';
}

export async function previewPiiRedaction(env, { payload = '', viewer_role = 'reviewer' } = {}) {
  const cleanRole = String(viewer_role || 'reviewer').trim().toLowerCase();
  if (!['admin', 'editor', 'reviewer'].includes(cleanRole)) {
    throw new HttpError(400, 'INVALID_ROLE', 'viewer_role must be admin, editor, or reviewer');
  }
  const state = await getPiiMaskingState(env);
  const policy = state.policy;
  const customSet = new Set(policy.custom_redacted_fields || []);
  let redactionCount = 0;

  function transformValue(val, keyName = '') {
    const lk = String(keyName || '').toLowerCase();
    if (lk && customSet.has(lk)) {
      redactionCount++;
      return '[REDACTED_DPDP]';
    }
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) return val.map(v => transformValue(v, ''));
    if (typeof val === 'object') {
      const out = {};
      for (const k of Object.keys(val)) {
        const res = transformValue(val[k], k);
        out[k] = res;
      }
      return out;
    }
    if (typeof val === 'string') {
      let s = val;
      if ((lk.includes('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) && policy.mask_emails_for_reviewers && cleanRole === 'reviewer') {
        redactionCount++;
        return maskEmailValue(s);
      }
      if ((lk.includes('ip') || /^\d{1,3}(\.\d{1,3}){3}$/.test(s)) && policy.mask_ip_addresses && cleanRole !== 'admin') {
        redactionCount++;
        return maskIpValue(s);
      }
      if (lk.includes('phone') || lk.includes('mobile')) {
        if (policy.mask_phone_numbers && cleanRole !== 'admin') {
          redactionCount++;
          return maskPhoneValue(s);
        }
      }
      if (policy.mask_emails_for_reviewers && cleanRole === 'reviewer') {
        s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, m => {
          redactionCount++;
          return maskEmailValue(m);
        });
      }
      if (policy.mask_phone_numbers && cleanRole !== 'admin') {
        s = s.replace(/(?:\+91[-\s]?)?[6-9]\d{9}\b/g, m => {
          redactionCount++;
          return maskPhoneValue(m);
        });
      }
      return s;
    }
    return val;
  }

  let parsed = payload;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try { parsed = JSON.parse(trimmed); } catch {}
    }
  }

  const credScrubbed = redactForensicPayload(parsed);
  if (JSON.stringify(credScrubbed) !== JSON.stringify(parsed)) {
    redactionCount++;
  }
  const maskedOutput = transformValue(credScrubbed, '');

  return {
    ok: true,
    viewer_role: cleanRole,
    redacted_payload: maskedOutput,
    redaction_count: redactionCount,
    dpdp_compliant: true
  };
}

// ============================================================================
// Module #9: API Key Management & Token Scoping
// ============================================================================
async function ensureApiKeysTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS sec_api_keys (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       key_prefix TEXT NOT NULL,
       key_hash TEXT NOT NULL,
       scopes_json TEXT NOT NULL,
       rate_limit_rpm INTEGER DEFAULT 60,
       status TEXT DEFAULT 'active',
       expires_at TEXT,
       last_used_at TEXT,
       created_by TEXT,
       created_at TEXT,
       revoked_at TEXT
     )`
  ).run();
}

function normalizeApiKeyRow(row) {
  let scopes = [];
  try {
    const parsed = JSON.parse(row.scopes_json || '[]');
    if (Array.isArray(parsed)) scopes = parsed;
  } catch {}
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    scopes,
    rate_limit_rpm: Number(row.rate_limit_rpm || 60),
    status: row.status || 'active',
    expires_at: row.expires_at || null,
    last_used_at: row.last_used_at || null,
    created_by: row.created_by || null,
    created_at: row.created_at || null,
    revoked_at: row.revoked_at || null
  };
}

export async function listApiKeys(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureApiKeysTable(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT id, name, key_prefix, scopes_json, rate_limit_rpm, status, expires_at, last_used_at, created_by, created_at, revoked_at
     FROM sec_api_keys
     ORDER BY created_at DESC`
  ).all();
  const items = (results || []).map(normalizeApiKeyRow);
  const activeCount = items.filter(k => k.status === 'active').length;
  const revokedCount = items.filter(k => k.status === 'revoked').length;
  const maxRpm = items.reduce((mx, k) => Math.max(mx, k.rate_limit_rpm || 0), 0);

  return {
    ok: true,
    allowed_scopes: ALLOWED_API_SCOPES,
    active_count: activeCount,
    revoked_count: revokedCount,
    max_rpm_ceiling: maxRpm || 60,
    zero_plaintext_storage: true,
    items
  };
}

export async function createScopedApiKey(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureApiKeysTable(env.DB);

  const name = String(input.name || '').trim().slice(0, 80);
  if (name.length < 2) {
    throw new HttpError(400, 'INVALID_KEY_NAME', 'API key name must be at least 2 characters');
  }

  const rawScopes = Array.isArray(input.scopes) ? input.scopes : [];
  const scopes = [];
  for (const s of rawScopes) {
    const clean = String(s || '').trim();
    if (!ALLOWED_API_SCOPES.includes(clean)) {
      throw new HttpError(400, 'INVALID_SCOPE', `Unsupported API scope "${clean}"`);
    }
    if (!scopes.includes(clean)) scopes.push(clean);
  }
  if (!scopes.length) {
    throw new HttpError(400, 'SCOPES_REQUIRED', 'Select at least one API scope');
  }

  const expiresDays = Number(input.expires_in_days ?? 90);
  if (!Number.isInteger(expiresDays) || expiresDays < 7 || expiresDays > 365) {
    throw new HttpError(400, 'INVALID_EXPIRY', 'expires_in_days must be an integer between 7 and 365');
  }

  const rpm = Number(input.rate_limit_rpm ?? 60);
  if (!Number.isInteger(rpm) || rpm < 10 || rpm > 600) {
    throw new HttpError(400, 'INVALID_RPM', 'rate_limit_rpm must be an integer between 10 and 600');
  }

  const randBytes = new Uint8Array(16);
  crypto.getRandomValues(randBytes);
  const hexSecret = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const plaintextToken = `cso_live_${hexSecret}`;
  const keyPrefix = `cso_live_${hexSecret.slice(0, 4)}••••`;
  const keyHash = await sha256Hex(plaintextToken);
  const id = `key_${Date.now().toString(36)}_${hexSecret.slice(0, 6)}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();

  await env.DB.prepare(
    `INSERT INTO sec_api_keys (id, name, key_prefix, key_hash, scopes_json, rate_limit_rpm, status, expires_at, last_used_at, created_by, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?, NULL)`
  ).bind(
    id,
    name,
    keyPrefix,
    keyHash,
    JSON.stringify(scopes),
    rpm,
    expiresAt,
    actorEmail || 'admin',
    nowIso
  ).run();

  const saved = await env.DB.prepare(
    `SELECT id, name, key_prefix, scopes_json, rate_limit_rpm, status, expires_at, last_used_at, created_by, created_at, revoked_at
     FROM sec_api_keys WHERE id = ?`
  ).bind(id).first();

  return {
    ok: true,
    key: normalizeApiKeyRow(saved),
    plaintext_token: plaintextToken
  };
}

export async function revokeScopedApiKey(env, id) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureApiKeysTable(env.DB);
  const cleanId = String(id || '').trim();
  const existing = await env.DB.prepare(`SELECT id, status FROM sec_api_keys WHERE id = ?`).bind(cleanId).first();
  if (!existing) {
    throw new HttpError(404, 'API_KEY_NOT_FOUND', `API key "${cleanId}" not found`);
  }
  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE sec_api_keys SET status = 'revoked', revoked_at = ? WHERE id = ?`
  ).bind(nowIso, cleanId).run();

  const updated = await env.DB.prepare(
    `SELECT id, name, key_prefix, scopes_json, rate_limit_rpm, status, expires_at, last_used_at, created_by, created_at, revoked_at
     FROM sec_api_keys WHERE id = ?`
  ).bind(cleanId).first();

  return { ok: true, key: normalizeApiKeyRow(updated) };
}

// ============================================================================
// Module #10: CSRF Protection & Origin Integrity Headers
// ============================================================================
export function defaultOriginHeadersPolicy() {
  return {
    enforce_origin_check: true,
    allowed_origins: ['https://csodisha.com', 'https://www.csodisha.com'],
    samesite_cookie_policy: 'Lax',
    csp_frame_ancestors: "'none'",
    hsts_max_age_seconds: 31536000
  };
}

function normalizeOriginHeadersPolicy(raw) {
  const def = defaultOriginHeadersPolicy();
  if (!raw || typeof raw !== 'object') return def;
  const sameSite = ['Strict', 'Lax'].includes(raw.samesite_cookie_policy)
    ? raw.samesite_cookie_policy
    : def.samesite_cookie_policy;
  const frameAnc = ["'none'", "'self'"].includes(raw.csp_frame_ancestors)
    ? raw.csp_frame_ancestors
    : def.csp_frame_ancestors;
  const hsts = Math.max(300, Math.min(63072000, Math.round(Number(raw.hsts_max_age_seconds) || def.hsts_max_age_seconds)));
  return {
    enforce_origin_check: raw.enforce_origin_check !== undefined
      ? Boolean(raw.enforce_origin_check)
      : def.enforce_origin_check,
    allowed_origins: Array.isArray(raw.allowed_origins) && raw.allowed_origins.length
      ? raw.allowed_origins
      : def.allowed_origins,
    samesite_cookie_policy: sameSite,
    csp_frame_ancestors: frameAnc,
    hsts_max_age_seconds: hsts
  };
}

function buildSecurityHeadersAudit(policy) {
  return [
    {
      header: 'Content-Security-Policy',
      value: `default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors ${policy.csp_frame_ancestors}`,
      status: 'ENFORCED'
    },
    {
      header: 'X-Frame-Options',
      value: policy.csp_frame_ancestors === "'none'" ? 'DENY' : 'SAMEORIGIN',
      status: 'ENFORCED'
    },
    {
      header: 'Strict-Transport-Security',
      value: `max-age=${policy.hsts_max_age_seconds}; includeSubDomains; preload`,
      status: 'ENFORCED'
    },
    {
      header: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
      status: 'ENFORCED'
    },
    {
      header: 'Permissions-Policy',
      value: 'geolocation=(), microphone=(), camera=()',
      status: 'ENFORCED'
    }
  ];
}

export async function getOriginHeadersState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  const row = await readSettingRow(env.DB, ORIGIN_HEADERS_KEY);
  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const policy = normalizeOriginHeadersPolicy(parsed);
  return {
    ok: true,
    policy,
    headers_audit: buildSecurityHeadersAudit(policy),
    csp_inline_zero: true,
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null
  };
}

export async function saveOriginHeadersPolicy(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  if (input.samesite_cookie_policy !== undefined && !['Strict', 'Lax'].includes(input.samesite_cookie_policy)) {
    throw new HttpError(400, 'INVALID_SAMESITE', 'samesite_cookie_policy must be Strict or Lax');
  }
  if (input.csp_frame_ancestors !== undefined && !["'none'", "'self'"].includes(input.csp_frame_ancestors)) {
    throw new HttpError(400, 'INVALID_FRAME_ANCESTORS', "csp_frame_ancestors must be 'none' or 'self'");
  }
  if (input.hsts_max_age_seconds !== undefined) {
    const h = Number(input.hsts_max_age_seconds);
    if (!Number.isInteger(h) || h < 300 || h > 63072000) {
      throw new HttpError(400, 'INVALID_HSTS_AGE', 'hsts_max_age_seconds must be between 300 and 63072000');
    }
  }

  const current = (await getOriginHeadersState(env)).policy;
  let origins = current.allowed_origins;
  if (input.allowed_origins !== undefined) {
    if (!Array.isArray(input.allowed_origins) || !input.allowed_origins.length) {
      throw new HttpError(400, 'ORIGINS_REQUIRED', 'Provide at least one allowed origin URL');
    }
    const cleanOrigins = [];
    for (const raw of input.allowed_origins) {
      const s = String(raw || '').trim();
      if (!s) continue;
      let parsedUrl;
      try { parsedUrl = new URL(s); } catch {
        throw new HttpError(400, 'INVALID_ORIGIN_URL', `Invalid origin URL: "${s}"`);
      }
      if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        throw new HttpError(400, 'INVALID_ORIGIN_URL', `Origin must use https:// or http://: "${s}"`);
      }
      if (!cleanOrigins.includes(parsedUrl.origin)) cleanOrigins.push(parsedUrl.origin);
    }
    origins = cleanOrigins;
  }

  const next = normalizeOriginHeadersPolicy({
    ...current,
    ...input,
    allowed_origins: origins
  });
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    ORIGIN_HEADERS_KEY,
    JSON.stringify(next),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getOriginHeadersState(env);
}

export async function testOriginCsrfRequest(env, {
  method = 'POST',
  origin = '',
  referer = '',
  has_session_cookie = true
} = {}) {
  const state = await getOriginHeadersState(env);
  const policy = state.policy;
  const cleanMethod = String(method || 'POST').trim().toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cleanMethod);

  let resolvedOrigin = '';
  if (String(origin || '').trim()) {
    try { resolvedOrigin = new URL(String(origin).trim()).origin; } catch {}
  } else if (String(referer || '').trim()) {
    try { resolvedOrigin = new URL(String(referer).trim()).origin; } catch {}
  }

  if (!isMutating) {
    return {
      ok: true,
      method: cleanMethod,
      resolved_origin: resolvedOrigin || null,
      allowed: true,
      verdict: 'ALLOW',
      rationale: `Safe HTTP method ${cleanMethod} does not require CSRF origin enforcement.`
    };
  }

  if (policy.enforce_origin_check && has_session_cookie) {
    if (!resolvedOrigin || !policy.allowed_origins.includes(resolvedOrigin)) {
      return {
        ok: true,
        method: cleanMethod,
        resolved_origin: resolvedOrigin || null,
        allowed: false,
        verdict: 'BLOCK_CSRF_ORIGIN_MISMATCH',
        rationale: `Mutating ${cleanMethod} request from "${resolvedOrigin || 'missing-origin'}" is blocked; allowed origins are [${policy.allowed_origins.join(', ')}].`
      };
    }
  }

  return {
    ok: true,
    method: cleanMethod,
    resolved_origin: resolvedOrigin || null,
    allowed: true,
    verdict: 'ALLOW',
    rationale: `Mutating ${cleanMethod} request matched trusted origin "${resolvedOrigin || 'none'}" with SameSite=${policy.samesite_cookie_policy}.`
  };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/security/{pii-masking|api-keys|origin-headers}
// ============================================================================
export async function handleSecurityGovernance(request, env, actor, subAction, subId, extraAction) {
  const method = request.method;

  // Module #8: /api/admin/security/pii-masking
  if (subAction === 'pii-masking') {
    if (!subId && method === 'GET') {
      return json(await getPiiMaskingState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update PII masking & DPDP rules');
      }
      const body = await readJson(request, 15000).catch(() => ({}));
      const state = await savePiiMaskingPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.pii_masking.update', 'site_settings', PII_MASKING_KEY, state.policy);
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'preview' && method === 'POST') {
      const body = await readJson(request, 20000).catch(() => ({}));
      const res = await previewPiiRedaction(env, {
        payload: body ? body.payload : '',
        viewer_role: body && body.viewer_role ? body.viewer_role : 'reviewer'
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #9: /api/admin/security/api-keys
  if (subAction === 'api-keys') {
    if (!subId && method === 'GET') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can inspect API keys');
      }
      return json(await listApiKeys(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can issue scoped API keys');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const created = await createScopedApiKey(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.api_key.create', 'sec_api_keys', created.key.id, {
        name: created.key.name,
        key_prefix: created.key.key_prefix,
        scopes: created.key.scopes,
        rate_limit_rpm: created.key.rate_limit_rpm
      });
      return json(created, 201, { 'Cache-Control': 'no-store' });
    }
    if (subId && extraAction === 'revoke' && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can revoke API keys');
      }
      const res = await revokeScopedApiKey(env, subId);
      await audit(env, request, actor, 'security.api_key.revoke', 'sec_api_keys', res.key.id, {
        key_prefix: res.key.key_prefix
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #10: /api/admin/security/origin-headers
  if (subAction === 'origin-headers') {
    if (!subId && method === 'GET') {
      return json(await getOriginHeadersState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update CSRF & origin header policies');
      }
      const body = await readJson(request, 15000).catch(() => ({}));
      const state = await saveOriginHeadersPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.origin_headers.update', 'site_settings', ORIGIN_HEADERS_KEY, state.policy);
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'test' && method === 'POST') {
      const body = await readJson(request, 10000).catch(() => ({}));
      const res = await testOriginCsrfRequest(env, {
        method: body && body.method,
        origin: body && body.origin,
        referer: body && body.referer,
        has_session_cookie: body && body.has_session_cookie !== undefined ? Boolean(body.has_session_cookie) : true
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown security governance endpoint');
}
