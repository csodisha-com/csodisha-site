// Security, Privacy & RBAC Suite — Modules #1, #2 & #3
// - Module #1: RBAC Hierarchy & Role Entitlements (Super Admin, Senior Editor, Reviewer)
// - Module #2: Publish & Mutation Permissions Guard across all 6 Engines
// - Module #3: Session Lifecycle, Inactivity Timeouts & Token Expiry
import { json, readJson, HttpError } from './http.js';
import { audit } from './rbac.js';

export const RBAC_MATRIX_KEY = 'sec_rbac_matrix';
export const ENGINE_GUARDS_KEY = 'sec_engine_guards';
export const SESSION_POLICY_KEY = 'sec_session_policy';

export const ROLE_LABELS = {
  admin: 'Super Admin',
  editor: 'Senior Editor',
  reviewer: 'Reviewer'
};

export const CAPABILITY_CATALOG = [
  { key: 'publish', label: 'Publish & Schedule Content', description: 'Promote drafts to live or scheduled status' },
  { key: 'delete', label: 'Soft / Hard Delete Records', description: 'Archive or permanently remove CMS records' },
  { key: 'restore', label: 'DR Rollback & Snapshots', description: 'Execute D1 snapshots and point-in-time restores' },
  { key: 'export_pii', label: 'Export Candidate / PII Data', description: 'Export DPDP-sensitive candidate and forensic logs' },
  { key: 'manage_users', label: 'Manage Staff & User Accounts', description: 'Assign roles, suspend accounts, or reset access' },
  { key: 'manage_security', label: 'Modify Security & RBAC Policies', description: 'Edit role entitlements, engine guards, and sessions' }
];

export const LOCKED_CAPABILITIES = {
  admin: {
    publish: true,
    delete: true,
    restore: true,
    export_pii: true,
    manage_users: true,
    manage_security: true
  },
  editor: {
    manage_security: false
  },
  reviewer: {
    manage_users: false,
    manage_security: false
  }
};

export function defaultRbacMatrix() {
  return {
    admin: {
      publish: true,
      delete: true,
      restore: true,
      export_pii: true,
      manage_users: true,
      manage_security: true
    },
    editor: {
      publish: true,
      delete: false,
      restore: false,
      export_pii: false,
      manage_users: false,
      manage_security: false
    },
    reviewer: {
      publish: false,
      delete: false,
      restore: false,
      export_pii: false,
      manage_users: false,
      manage_security: false
    }
  };
}

export const ENGINE_CATALOG = [
  { key: 'site_pages', label: 'Site Pages', description: 'Static institutional, legal, and guidance pages' },
  { key: 'news_posts', label: 'News & Current Affairs Posts', description: 'Daily current affairs, editorials, and job alerts' },
  { key: 'gov_schemes', label: 'Government Schemes Directory', description: 'Odisha & Central welfare schemes taxonomy' },
  { key: 'study_library', label: 'Study Library & PYQ Resources', description: 'Syllabus, PYQ papers, and mock test banks' },
  { key: 'media_assets', label: 'Media & R2 Assets', description: 'Uploaded PDFs, images, and R2 object metadata' },
  { key: 'nav_broadcast', label: 'Navigation & Broadcast Announcements', description: 'Flash alerts, banners, and master navigation' }
];

export function defaultEngineGuards() {
  return {
    site_pages: {
      require_reviewer_signoff: false,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: true
    },
    news_posts: {
      require_reviewer_signoff: false,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: true
    },
    gov_schemes: {
      require_reviewer_signoff: true,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: true
    },
    study_library: {
      require_reviewer_signoff: false,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: true
    },
    media_assets: {
      require_reviewer_signoff: false,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: false
    },
    nav_broadcast: {
      require_reviewer_signoff: true,
      block_editor_hard_delete: true,
      require_seo_meta_before_publish: false
    }
  };
}

export function defaultSessionPolicy() {
  return {
    idle_timeout_minutes: 60,
    absolute_ttl_hours: 24,
    max_concurrent_sessions: 3,
    bind_user_agent: true
  };
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

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function maskTokenPrefix(token) {
  const s = String(token || '');
  if (!s) return 'sess_***';
  if (s.length <= 8) return s.slice(0, 2) + '••••';
  return s.slice(0, 6) + '••••' + s.slice(-4);
}

function summarizeUserAgent(ua) {
  const s = String(ua || '').trim();
  if (!s) return 'Cloudflare Edge Session';
  const clean = s.replace(/[<>]/g, '').slice(0, 100);
  if (/Edg\//i.test(clean)) return 'Microsoft Edge';
  if (/Chrome\//i.test(clean) && !/Chromium/i.test(clean)) return 'Google Chrome';
  if (/Firefox\//i.test(clean)) return 'Mozilla Firefox';
  if (/Safari\//i.test(clean) && !/Chrome/i.test(clean)) return 'Apple Safari';
  if (/curl\//i.test(clean)) return 'CLI / cURL Client';
  return clean.slice(0, 48);
}

function upsertSettingSql() {
  return `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_by = excluded.updated_by,
            updated_at = excluded.updated_at`;
}

// ============================================================================
// Module #1: RBAC Hierarchy & Role Entitlements
// ============================================================================
function normalizeRbacMatrix(raw) {
  const def = defaultRbacMatrix();
  const out = {};
  for (const role of Object.keys(def)) {
    const src = (raw && typeof raw === 'object' && raw[role] && typeof raw[role] === 'object') ? raw[role] : {};
    out[role] = {};
    for (const cap of CAPABILITY_CATALOG) {
      const k = cap.key;
      const locked = LOCKED_CAPABILITIES[role] && Object.prototype.hasOwnProperty.call(LOCKED_CAPABILITIES[role], k);
      if (locked) {
        out[role][k] = LOCKED_CAPABILITIES[role][k];
      } else {
        out[role][k] = src[k] !== undefined ? Boolean(src[k]) : Boolean(def[role][k]);
      }
    }
  }
  return out;
}

function countCustomRbacOverrides(matrix) {
  const def = defaultRbacMatrix();
  let count = 0;
  for (const role of Object.keys(def)) {
    for (const cap of CAPABILITY_CATALOG) {
      if (Boolean(matrix[role]?.[cap.key]) !== Boolean(def[role][cap.key])) count++;
    }
  }
  return count;
}

export async function getRbacHierarchyState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  let row = null;
  try {
    row = await env.DB.prepare(
      `SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`
    ).bind(RBAC_MATRIX_KEY).first();
  } catch {}

  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const matrix = normalizeRbacMatrix(parsed);

  const userCounts = { admin: 0, editor: 0, reviewer: 0, candidate: 0 };
  if (await tableExists(env.DB, 'users')) {
    try {
      const cols = await env.DB.prepare(`PRAGMA table_info("users")`).all();
      const hasRole = (cols.results || []).some(c => c.name === 'role');
      if (hasRole) {
        const { results } = await env.DB.prepare(
          `SELECT COALESCE(role, 'candidate') AS role, COUNT(*) AS n FROM users GROUP BY COALESCE(role, 'candidate')`
        ).all();
        for (const r of (results || [])) {
          const rk = String(r.role || 'candidate').toLowerCase();
          userCounts[rk] = (userCounts[rk] || 0) + (Number(r.n) || 0);
        }
      }
    } catch {}
  }

  let recentChanges = [];
  if (await tableExists(env.DB, 'audit_log')) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, actor_user_id, action, target_type, target_id, metadata_json, created_at
         FROM audit_log
         WHERE action LIKE 'security.rbac%' OR action LIKE 'user.role%'
         ORDER BY id DESC LIMIT 12`
      ).all();
      recentChanges = (results || []).map(r => ({
        id: r.id,
        actor_user_id: r.actor_user_id,
        action: r.action,
        target_id: r.target_id,
        metadata: (() => { try { return JSON.parse(r.metadata_json || '{}'); } catch { return {}; } })(),
        created_at: r.created_at
      }));
    } catch {}
  }

  const totalStaff = (userCounts.admin || 0) + (userCounts.editor || 0) + (userCounts.reviewer || 0);
  return {
    ok: true,
    matrix,
    defaults: defaultRbacMatrix(),
    locked: LOCKED_CAPABILITIES,
    capabilities: CAPABILITY_CATALOG,
    role_labels: ROLE_LABELS,
    user_counts: userCounts,
    total_staff: totalStaff,
    custom_overrides: countCustomRbacOverrides(matrix),
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null,
    recent_changes: recentChanges
  };
}

export async function saveRbacHierarchyMatrix(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  const payload = (input && input.matrix && typeof input.matrix === 'object') ? input.matrix : input;
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'INVALID_MATRIX', 'A valid RBAC capability matrix object is required');
  }

  // Enforce lockout & privilege-escalation guards explicitly
  if (payload.admin && typeof payload.admin === 'object') {
    for (const cap of CAPABILITY_CATALOG) {
      if (payload.admin[cap.key] === false) {
        throw new HttpError(
          400,
          'ADMIN_LOCKOUT_PREVENTED',
          `Super Admin privilege "${cap.key}" is locked and cannot be revoked to prevent administrative lockout.`
        );
      }
    }
  }
  for (const nonAdmin of ['editor', 'reviewer']) {
    const cfg = payload[nonAdmin];
    if (cfg && typeof cfg === 'object') {
      if (cfg.manage_security === true) {
        throw new HttpError(
          400,
          'PRIVILEGE_ESCALATION_BLOCKED',
          `Role "${ROLE_LABELS[nonAdmin]}" cannot be granted "manage_security".`
        );
      }
      if (nonAdmin === 'reviewer' && cfg.manage_users === true) {
        throw new HttpError(
          400,
          'PRIVILEGE_ESCALATION_BLOCKED',
          'Reviewer role cannot be granted "manage_users".'
        );
      }
    }
  }

  const current = await getRbacHierarchyState(env);
  const merged = {};
  for (const role of Object.keys(ROLE_LABELS)) {
    merged[role] = {
      ...(current.matrix[role] || {}),
      ...(payload[role] && typeof payload[role] === 'object' ? payload[role] : {})
    };
  }
  const normalized = normalizeRbacMatrix(merged);
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    RBAC_MATRIX_KEY,
    JSON.stringify(normalized),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getRbacHierarchyState(env);
}

export async function simulateRbacPermission(env, { role = 'editor', action = 'publish' } = {}) {
  const cleanRole = String(role || '').trim().toLowerCase();
  const cleanAction = String(action || '').trim().toLowerCase();
  const validActions = CAPABILITY_CATALOG.map(c => c.key);
  if (!validActions.includes(cleanAction)) {
    throw new HttpError(400, 'INVALID_ACTION', `Action must be one of: ${validActions.join(', ')}`);
  }

  if (cleanRole === 'candidate') {
    return {
      ok: true,
      role: cleanRole,
      role_label: 'Candidate',
      action: cleanAction,
      allowed: false,
      decision: 'DENY',
      source: 'non_staff',
      rationale: 'Candidate accounts are strictly isolated from all staff CMS and security capabilities.'
    };
  }

  if (!Object.prototype.hasOwnProperty.call(ROLE_LABELS, cleanRole)) {
    throw new HttpError(400, 'INVALID_ROLE', 'Role must be one of: admin, editor, reviewer, candidate');
  }

  const state = await getRbacHierarchyState(env);
  const allowed = Boolean(state.matrix[cleanRole]?.[cleanAction]);
  const isLocked = Boolean(
    LOCKED_CAPABILITIES[cleanRole] &&
    Object.prototype.hasOwnProperty.call(LOCKED_CAPABILITIES[cleanRole], cleanAction)
  );
  const isCustom = Boolean(state.defaults[cleanRole][cleanAction]) !== allowed;
  const capMeta = CAPABILITY_CATALOG.find(c => c.key === cleanAction);

  let source = 'default_matrix';
  if (isLocked) source = 'locked_policy';
  else if (isCustom) source = 'custom_override';

  const rationale = allowed
    ? `${ROLE_LABELS[cleanRole]} is permitted to execute "${capMeta ? capMeta.label : cleanAction}" (${source.replace('_', ' ')}).`
    : `${ROLE_LABELS[cleanRole]} is blocked from "${capMeta ? capMeta.label : cleanAction}" (${source.replace('_', ' ')}).`;

  return {
    ok: true,
    role: cleanRole,
    role_label: ROLE_LABELS[cleanRole],
    action: cleanAction,
    action_label: capMeta ? capMeta.label : cleanAction,
    allowed,
    decision: allowed ? 'ALLOW' : 'DENY',
    source,
    rationale
  };
}

// ============================================================================
// Module #2: Publish & Mutation Permissions Guard across all 6 Engines
// ============================================================================
function normalizeEngineGuards(raw) {
  const def = defaultEngineGuards();
  const out = {};
  for (const eng of ENGINE_CATALOG) {
    const src = (raw && typeof raw === 'object' && raw[eng.key] && typeof raw[eng.key] === 'object')
      ? raw[eng.key]
      : {};
    const d = def[eng.key];
    out[eng.key] = {
      require_reviewer_signoff: src.require_reviewer_signoff !== undefined
        ? Boolean(src.require_reviewer_signoff)
        : d.require_reviewer_signoff,
      block_editor_hard_delete: src.block_editor_hard_delete !== undefined
        ? Boolean(src.block_editor_hard_delete)
        : d.block_editor_hard_delete,
      require_seo_meta_before_publish: src.require_seo_meta_before_publish !== undefined
        ? Boolean(src.require_seo_meta_before_publish)
        : d.require_seo_meta_before_publish
    };
  }
  return out;
}

function computeEngineGuardStats(guards) {
  let activeApprovalGates = 0;
  let hardDeleteProtections = 0;
  let seoGates = 0;
  for (const eng of ENGINE_CATALOG) {
    const g = guards[eng.key] || {};
    if (g.require_reviewer_signoff) activeApprovalGates++;
    if (g.block_editor_hard_delete) hardDeleteProtections++;
    if (g.require_seo_meta_before_publish) seoGates++;
  }
  return {
    total_engines: ENGINE_CATALOG.length,
    protected_engines: ENGINE_CATALOG.length,
    active_approval_gates: activeApprovalGates,
    hard_delete_protections: hardDeleteProtections,
    seo_gates: seoGates
  };
}

export async function getEngineGuardsState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  let row = null;
  try {
    row = await env.DB.prepare(
      `SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`
    ).bind(ENGINE_GUARDS_KEY).first();
  } catch {}

  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const guards = normalizeEngineGuards(parsed);

  let recentChanges = [];
  if (await tableExists(env.DB, 'audit_log')) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, actor_user_id, action, metadata_json, created_at
         FROM audit_log
         WHERE action LIKE 'security.engine_guards%'
         ORDER BY id DESC LIMIT 10`
      ).all();
      recentChanges = (results || []).map(r => ({
        id: r.id,
        actor_user_id: r.actor_user_id,
        action: r.action,
        metadata: (() => { try { return JSON.parse(r.metadata_json || '{}'); } catch { return {}; } })(),
        created_at: r.created_at
      }));
    } catch {}
  }

  return {
    ok: true,
    engines: ENGINE_CATALOG,
    guards,
    defaults: defaultEngineGuards(),
    stats: computeEngineGuardStats(guards),
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null,
    recent_changes: recentChanges
  };
}

export async function saveEngineGuards(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  const payload = (input && input.guards && typeof input.guards === 'object') ? input.guards : input;
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'INVALID_GUARDS', 'A valid engine guards configuration object is required');
  }

  const validEngineKeys = new Set(ENGINE_CATALOG.map(e => e.key));
  for (const key of Object.keys(payload)) {
    if (!validEngineKeys.has(key)) {
      throw new HttpError(400, 'UNKNOWN_ENGINE', `Unknown content engine "${key}"`);
    }
  }

  const current = await getEngineGuardsState(env);
  const merged = {};
  for (const eng of ENGINE_CATALOG) {
    merged[eng.key] = {
      ...(current.guards[eng.key] || {}),
      ...(payload[eng.key] && typeof payload[eng.key] === 'object' ? payload[eng.key] : {})
    };
  }
  const normalized = normalizeEngineGuards(merged);
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    ENGINE_GUARDS_KEY,
    JSON.stringify(normalized),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getEngineGuardsState(env);
}

export async function testEngineMutationGate(env, {
  role = 'editor',
  engine = 'gov_schemes',
  mutation = 'publish',
  has_reviewer_signoff = false,
  has_seo_meta = true
} = {}) {
  const cleanRole = String(role || '').trim().toLowerCase();
  const cleanEngine = String(engine || '').trim();
  const cleanMutation = String(mutation || '').trim().toLowerCase();

  if (!['admin', 'editor', 'reviewer', 'candidate'].includes(cleanRole)) {
    throw new HttpError(400, 'INVALID_ROLE', 'Invalid role specified');
  }
  const engMeta = ENGINE_CATALOG.find(e => e.key === cleanEngine);
  if (!engMeta) {
    throw new HttpError(400, 'UNKNOWN_ENGINE', `Unknown content engine "${cleanEngine}"`);
  }
  if (!['create', 'publish', 'delete'].includes(cleanMutation)) {
    throw new HttpError(400, 'INVALID_MUTATION', 'Mutation must be one of: create, publish, delete');
  }

  const [rbacState, guardState] = await Promise.all([
    getRbacHierarchyState(env),
    getEngineGuardsState(env)
  ]);
  const guard = guardState.guards[cleanEngine];
  const failedGates = [];

  if (cleanRole === 'candidate') {
    failedGates.push({
      code: 'NON_STAFF_ROLE',
      message: 'Candidate accounts cannot perform CMS engine mutations.'
    });
  } else {
    const roleCaps = rbacState.matrix[cleanRole] || {};
    if (cleanMutation === 'publish' && !roleCaps.publish) {
      failedGates.push({
        code: 'RBAC_PUBLISH_DENIED',
        message: `${ROLE_LABELS[cleanRole]} lacks the global "publish" entitlement in Module #1 RBAC Matrix.`
      });
    }
    if (cleanMutation === 'delete' && !roleCaps.delete) {
      failedGates.push({
        code: 'RBAC_DELETE_DENIED',
        message: `${ROLE_LABELS[cleanRole]} lacks the global "delete" entitlement in Module #1 RBAC Matrix.`
      });
    }
    if (cleanMutation === 'delete' && cleanRole !== 'admin' && guard.block_editor_hard_delete) {
      failedGates.push({
        code: 'HARD_DELETE_GUARDED',
        message: `${engMeta.label} blocks hard deletes for non-Super-Admin roles.`
      });
    }
    if (cleanMutation === 'publish' && guard.require_reviewer_signoff && !has_reviewer_signoff && cleanRole !== 'admin') {
      failedGates.push({
        code: 'REVIEWER_SIGNOFF_REQUIRED',
        message: `${engMeta.label} requires Reviewer sign-off before publishing.`
      });
    }
    if (cleanMutation === 'publish' && guard.require_seo_meta_before_publish && !has_seo_meta) {
      failedGates.push({
        code: 'SEO_META_REQUIRED',
        message: `${engMeta.label} requires complete SEO meta title & description prior to publish.`
      });
    }
  }

  const allowed = failedGates.length === 0;
  return {
    ok: true,
    role: cleanRole,
    role_label: ROLE_LABELS[cleanRole] || 'Candidate',
    engine: cleanEngine,
    engine_label: engMeta.label,
    mutation: cleanMutation,
    allowed,
    decision: allowed ? 'ALLOWED' : 'BLOCKED',
    failed_gates: failedGates,
    rationale: allowed
      ? `${cleanMutation.toUpperCase()} on ${engMeta.label} passes all RBAC and engine guardrails for ${ROLE_LABELS[cleanRole] || cleanRole}.`
      : failedGates.map(g => g.message).join(' ')
  };
}

// ============================================================================
// Module #3: Session Lifecycle, Inactivity Timeouts & Token Expiry
// ============================================================================
function normalizeSessionPolicy(raw) {
  const def = defaultSessionPolicy();
  if (!raw || typeof raw !== 'object') return def;
  return {
    idle_timeout_minutes: Math.max(15, Math.min(480, Math.round(Number(raw.idle_timeout_minutes) || def.idle_timeout_minutes))),
    absolute_ttl_hours: Math.max(1, Math.min(168, Math.round(Number(raw.absolute_ttl_hours) || def.absolute_ttl_hours))),
    max_concurrent_sessions: Math.max(1, Math.min(10, Math.round(Number(raw.max_concurrent_sessions) || def.max_concurrent_sessions))),
    bind_user_agent: raw.bind_user_agent !== undefined ? Boolean(raw.bind_user_agent) : def.bind_user_agent
  };
}

export async function getSessionLifecycleState(env, { currentToken = '' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  let policyRow = null;
  try {
    policyRow = await env.DB.prepare(
      `SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`
    ).bind(SESSION_POLICY_KEY).first();
  } catch {}
  let parsedPolicy = null;
  if (policyRow && policyRow.value_json) {
    try { parsedPolicy = JSON.parse(policyRow.value_json); } catch {}
  }
  const policy = normalizeSessionPolicy(parsedPolicy);

  const nowSec = Math.floor(Date.now() / 1000);
  const sessions = [];
  let activeCount = 0;
  let expiredCount = 0;
  let adminActiveCount = 0;

  if (await tableExists(env.DB, 'sessions')) {
    const hasUsers = await tableExists(env.DB, 'users');
    let hasUserAgent = false;
    try {
      const cols = await env.DB.prepare(`PRAGMA table_info("sessions")`).all();
      hasUserAgent = (cols.results || []).some(c => c.name === 'user_agent');
    } catch {}

    const expRow = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sessions WHERE expires_at <= ?`
    ).bind(nowSec).first();
    expiredCount = Number(expRow && expRow.n) || 0;

    const uaCol = hasUserAgent ? 's.user_agent' : 'NULL AS user_agent';
    const sql = hasUsers
      ? `SELECT s.token, s.user_id, COALESCE(u.email, s.email) AS email, COALESCE(u.role, s.role) AS role,
                s.created_at, s.expires_at, ${uaCol}
         FROM sessions s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.expires_at > ?
         ORDER BY s.created_at DESC
         LIMIT 100`
      : `SELECT s.token, s.user_id, s.email, s.role, s.created_at, s.expires_at, ${uaCol}
         FROM sessions s
         WHERE s.expires_at > ?
         ORDER BY s.created_at DESC
         LIMIT 100`;

    const { results } = await env.DB.prepare(sql).bind(nowSec).all();
    for (const row of (results || [])) {
      const digest = await sha256Hex(row.token);
      const sessionId = 'sess_' + digest.slice(0, 16);
      const role = String(row.role || 'candidate').toLowerCase();
      const isCurrent = Boolean(currentToken && row.token === currentToken);
      if (['admin', 'editor', 'reviewer'].includes(role)) adminActiveCount++;
      activeCount++;

      sessions.push({
        session_id: sessionId,
        masked_token: maskTokenPrefix(row.token),
        user_id: row.user_id,
        email: row.email,
        role,
        user_agent_summary: summarizeUserAgent(row.user_agent),
        created_at: Number(row.created_at) || 0,
        created_at_iso: row.created_at ? new Date(Number(row.created_at) * 1000).toISOString() : null,
        expires_at: Number(row.expires_at) || 0,
        expires_at_iso: row.expires_at ? new Date(Number(row.expires_at) * 1000).toISOString() : null,
        remaining_seconds: Math.max(0, (Number(row.expires_at) || 0) - nowSec),
        is_current: isCurrent
      });
    }
  }

  return {
    ok: true,
    policy,
    active_count: activeCount,
    admin_active_count: adminActiveCount,
    expired_count: expiredCount,
    sessions,
    updated_by: policyRow ? (policyRow.updated_by || null) : null,
    updated_at: policyRow ? (policyRow.updated_at || null) : null
  };
}

export async function saveSessionPolicy(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  if (input.idle_timeout_minutes !== undefined) {
    const idle = Number(input.idle_timeout_minutes);
    if (!Number.isInteger(idle) || idle < 15 || idle > 480) {
      throw new HttpError(400, 'INVALID_IDLE_TIMEOUT', 'idle_timeout_minutes must be an integer between 15 and 480');
    }
  }
  if (input.absolute_ttl_hours !== undefined) {
    const ttl = Number(input.absolute_ttl_hours);
    if (!Number.isInteger(ttl) || ttl < 1 || ttl > 168) {
      throw new HttpError(400, 'INVALID_ABSOLUTE_TTL', 'absolute_ttl_hours must be an integer between 1 and 168');
    }
  }
  if (input.max_concurrent_sessions !== undefined) {
    const maxS = Number(input.max_concurrent_sessions);
    if (!Number.isInteger(maxS) || maxS < 1 || maxS > 10) {
      throw new HttpError(400, 'INVALID_MAX_CONCURRENT', 'max_concurrent_sessions must be an integer between 1 and 10');
    }
  }

  const current = (await getSessionLifecycleState(env)).policy;
  const next = normalizeSessionPolicy({
    idle_timeout_minutes: input.idle_timeout_minutes !== undefined ? input.idle_timeout_minutes : current.idle_timeout_minutes,
    absolute_ttl_hours: input.absolute_ttl_hours !== undefined ? input.absolute_ttl_hours : current.absolute_ttl_hours,
    max_concurrent_sessions: input.max_concurrent_sessions !== undefined ? input.max_concurrent_sessions : current.max_concurrent_sessions,
    bind_user_agent: input.bind_user_agent !== undefined ? Boolean(input.bind_user_agent) : current.bind_user_agent
  });
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    SESSION_POLICY_KEY,
    JSON.stringify(next),
    actorEmail || 'admin',
    nowIso
  ).run();

  return {
    ok: true,
    policy: next,
    updated_by: actorEmail || 'admin',
    updated_at: nowIso
  };
}

export async function revokeSessions(env, {
  sessionId = '',
  exceptCurrent = false,
  confirm = '',
  currentToken = ''
} = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  if (!(await tableExists(env.DB, 'sessions'))) {
    return { ok: true, mode: exceptCurrent ? 'revoke_all_others' : 'single', revoked_count: 0 };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (exceptCurrent) {
    const phrase = String(confirm || '').trim();
    if (phrase !== 'REVOKE_OTHERS' && phrase !== 'REVOKE') {
      throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Type REVOKE_OTHERS to invalidate all other active sessions');
    }
    const delRes = currentToken
      ? await env.DB.prepare(`DELETE FROM sessions WHERE token != ? OR expires_at <= ?`).bind(currentToken, nowSec).run()
      : await env.DB.prepare(`DELETE FROM sessions`).run();
    const revokedCount = Number(delRes?.meta?.changes || 0);
    return {
      ok: true,
      mode: 'revoke_all_others',
      revoked_count: revokedCount,
      preserved_current: Boolean(currentToken)
    };
  }

  const cleanId = String(sessionId || '').trim();
  if (!cleanId) {
    throw new HttpError(400, 'SESSION_ID_REQUIRED', 'Provide session_id or except_current: true');
  }

  const { results } = await env.DB.prepare(`SELECT token FROM sessions`).all();
  let matchedToken = null;
  for (const row of (results || [])) {
    const digest = await sha256Hex(row.token);
    if ('sess_' + digest.slice(0, 16) === cleanId) {
      matchedToken = row.token;
      break;
    }
  }
  if (!matchedToken) {
    throw new HttpError(404, 'SESSION_NOT_FOUND', `Session "${cleanId}" not found or already expired`);
  }
  if (currentToken && matchedToken === currentToken && confirm !== 'REVOKE_CURRENT') {
    throw new HttpError(
      400,
      'CANNOT_REVOKE_CURRENT_SESSION',
      'Use Sign Out to end your own active session, or confirm REVOKE_CURRENT.'
    );
  }

  const res = await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(matchedToken).run();
  return {
    ok: true,
    mode: 'single',
    session_id: cleanId,
    revoked_count: Number(res?.meta?.changes || 1)
  };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/security/{rbac|engine-guards|sessions}
// ============================================================================
export async function handleSecurityRbac(request, env, actor, subAction, subId) {
  const method = request.method;

  // Module #1: /api/admin/security/rbac
  if (subAction === 'rbac') {
    if (!subId && method === 'GET') {
      return json(await getRbacHierarchyState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can modify RBAC entitlements');
      }
      const body = await readJson(request, 20000).catch(() => ({}));
      const state = await saveRbacHierarchyMatrix(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.rbac.update', 'site_settings', RBAC_MATRIX_KEY, {
        custom_overrides: state.custom_overrides,
        matrix: state.matrix
      });
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'simulate' && method === 'POST') {
      const body = await readJson(request, 10000).catch(() => ({}));
      const sim = await simulateRbacPermission(env, {
        role: body && body.role,
        action: body && body.action
      });
      return json(sim, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #2: /api/admin/security/engine-guards
  if (subAction === 'engine-guards') {
    if (!subId && method === 'GET') {
      return json(await getEngineGuardsState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update engine mutation guardrails');
      }
      const body = await readJson(request, 20000).catch(() => ({}));
      const state = await saveEngineGuards(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.engine_guards.update', 'site_settings', ENGINE_GUARDS_KEY, {
        stats: state.stats,
        guards: state.guards
      });
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'test' && method === 'POST') {
      const body = await readJson(request, 10000).catch(() => ({}));
      const sim = await testEngineMutationGate(env, {
        role: body && body.role,
        engine: body && body.engine,
        mutation: body && body.mutation,
        has_reviewer_signoff: Boolean(body && body.has_reviewer_signoff),
        has_seo_meta: body && body.has_seo_meta !== undefined ? Boolean(body.has_seo_meta) : true
      });
      return json(sim, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #3: /api/admin/security/sessions
  if (subAction === 'sessions') {
    if (!subId && method === 'GET') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can inspect active staff/candidate sessions');
      }
      const state = await getSessionLifecycleState(env, { currentToken: actor.sessionToken || '' });
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'policy' && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can modify session lifecycle policies');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const res = await saveSessionPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.session.policy.update', 'site_settings', SESSION_POLICY_KEY, res.policy);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'revoke' && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can revoke active sessions');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const res = await revokeSessions(env, {
        sessionId: body && body.session_id,
        exceptCurrent: Boolean(body && body.except_current),
        confirm: body && (body.confirm !== undefined ? body.confirm : body.confirm_phrase),
        currentToken: actor.sessionToken || ''
      });
      await audit(env, request, actor, 'security.session.revoke', 'sessions', res.session_id || 'bulk', {
        mode: res.mode,
        revoked_count: res.revoked_count
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown security endpoint');
}
