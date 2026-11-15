// Security, Privacy & RBAC Suite — Modules #11, #12 & #13
// - Module #11: Emergency Maintenance Mode & Lockdown Dispatcher
// - Module #12: Data Privacy, DPDP Act 2023 Compliance & Consent Vault
// - Module #13: Security Incident Response & Audit Snapshot Export
import { json, readJson, HttpError } from './http.js';
import { audit } from './rbac.js';
import { sha256Hex } from './admin-2fa.js';
import { getReadOnlyFreezeState, setReadOnlyFreezeState } from './ops-sentinel.js';
import { getRbacHierarchyState, getEngineGuardsState } from './security-rbac.js';
import {
  getBotDeterrenceState,
  getIpGeofenceState,
  getTwoFactorGovernanceState,
  getAuditTimelineStream
} from './security-edge.js';
import { getPiiMaskingState, getOriginHeadersState } from './security-governance.js';

export const LOCKDOWN_STATE_KEY = 'sec_lockdown_state';
export const DPDP_POLICY_KEY = 'sec_dpdp_policy';
export const LAST_EVIDENCE_PACK_KEY = 'sec_last_evidence_pack';

const ALLOWED_LOCKDOWN_LEVELS = [
  'normal',
  'read_only_freeze',
  'public_maintenance',
  'full_session_lockdown'
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

function maskSubjectIdentifier(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'subj_***';
  const at = s.indexOf('@');
  if (at > 0) return s[0] + '***' + s.slice(at);
  if (s.length <= 4) return s[0] + '***';
  return s.slice(0, 2) + '••••' + s.slice(-2);
}

// ============================================================================
// Module #11: Emergency Maintenance Mode & Lockdown Dispatcher
// ============================================================================
export function defaultLockdownState() {
  return {
    level: 'normal',
    incident_banner_title: '',
    incident_banner_body: '',
    allow_super_admin_bypass: true,
    updated_by: null,
    updated_at: null
  };
}

function normalizeLockdownState(raw, rowMeta = null) {
  const def = defaultLockdownState();
  const lvl = raw && ALLOWED_LOCKDOWN_LEVELS.includes(raw.level) ? raw.level : def.level;
  return {
    level: lvl,
    incident_banner_title: String((raw && raw.incident_banner_title) || '').replace(/[<>]/g, '').slice(0, 120),
    incident_banner_body: String((raw && raw.incident_banner_body) || '').replace(/[<>]/g, '').slice(0, 320),
    allow_super_admin_bypass: true,
    updated_by: (raw && raw.updated_by) || (rowMeta && rowMeta.updated_by) || null,
    updated_at: (raw && raw.updated_at) || (rowMeta && rowMeta.updated_at) || null
  };
}

async function countNonAdminActiveSessions(db) {
  if (!(await tableExists(db, 'sessions'))) return 0;
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const row = await db.prepare(
      `SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ? AND COALESCE(role, 'candidate') != 'admin'`
    ).bind(nowSec).first();
    return Number(row && row.n) || 0;
  } catch {
    return 0;
  }
}

export async function getLockdownPosture(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  const [row, freeze, nonAdminCount] = await Promise.all([
    readSettingRow(env.DB, LOCKDOWN_STATE_KEY),
    getReadOnlyFreezeState(env),
    countNonAdminActiveSessions(env.DB)
  ]);

  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const lockdown = normalizeLockdownState(parsed, row);
  if (freeze.enabled && lockdown.level === 'normal') {
    lockdown.level = 'read_only_freeze';
    if (!lockdown.incident_banner_body && freeze.banner) {
      lockdown.incident_banner_body = freeze.banner;
    }
  }

  let dispatchHistory = [];
  if (await tableExists(env.DB, 'audit_log')) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, actor_user_id, action, metadata_json, created_at
         FROM audit_log
         WHERE action = 'security.lockdown.dispatch'
         ORDER BY id DESC LIMIT 12`
      ).all();
      dispatchHistory = (results || []).map(r => ({
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
    lockdown,
    freeze,
    non_admin_active_sessions: nonAdminCount,
    dispatch_history: dispatchHistory
  };
}

export async function dispatchSecurityLockdown(env, {
  level = 'read_only_freeze',
  incident_banner_title = '',
  incident_banner_body = '',
  dry_run = true,
  confirm = '',
  actorEmail = 'admin',
  currentToken = ''
} = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  const cleanLevel = String(level || '').trim();
  if (!ALLOWED_LOCKDOWN_LEVELS.includes(cleanLevel)) {
    throw new HttpError(400, 'INVALID_LOCKDOWN_LEVEL', `Level must be one of: ${ALLOWED_LOCKDOWN_LEVELS.join(', ')}`);
  }

  const cleanTitle = String(incident_banner_title || '').trim().replace(/[<>]/g, '').slice(0, 120);
  const cleanBody = String(incident_banner_body || '').trim().replace(/[<>]/g, '').slice(0, 320);
  const nonAdminCount = await countNonAdminActiveSessions(env.DB);
  const isDryRun = dry_run !== false;

  if (isDryRun) {
    return {
      ok: true,
      dry_run: true,
      target_level: cleanLevel,
      would_enable_freeze: cleanLevel !== 'normal',
      would_revoke_non_admin_sessions: cleanLevel === 'full_session_lockdown' ? nonAdminCount : 0,
      preview_banner: { title: cleanTitle, body: cleanBody },
      rationale: cleanLevel === 'normal'
        ? 'Dry-run: Restores normal platform operations and lifts Read-Only Freeze.'
        : `Dry-run: Escalates to "${cleanLevel}", enables Read-Only Freeze, and ${cleanLevel === 'full_session_lockdown' ? `revokes ${nonAdminCount} non-admin session(s)` : 'preserves existing sessions'}.`
    };
  }

  const phrase = String(confirm || '').trim();
  const expectedPhrase = cleanLevel === 'normal' ? 'RESTORE_NORMAL' : 'LOCKDOWN';
  if (phrase !== expectedPhrase) {
    throw new HttpError(
      400,
      'CONFIRMATION_REQUIRED',
      `Type ${expectedPhrase} in the confirmation field to dispatch "${cleanLevel}".`
    );
  }

  await ensureSiteSettingsTable(env.DB);
  const nowIso = new Date().toISOString();
  const nextState = {
    level: cleanLevel,
    incident_banner_title: cleanTitle,
    incident_banner_body: cleanBody,
    allow_super_admin_bypass: true,
    updated_by: actorEmail || 'admin',
    updated_at: nowIso
  };

  await env.DB.prepare(upsertSettingSql()).bind(
    LOCKDOWN_STATE_KEY,
    JSON.stringify(nextState),
    actorEmail || 'admin',
    nowIso
  ).run();

  const freeze = await setReadOnlyFreezeState(env, {
    enabled: cleanLevel !== 'normal',
    reason: cleanTitle || `Security lockdown level: ${cleanLevel}`,
    banner: cleanBody || (cleanLevel === 'normal' ? '' : 'Scheduled security maintenance in progress.'),
    actorEmail: actorEmail || 'admin'
  });

  let revokedSessions = 0;
  if (cleanLevel === 'full_session_lockdown' && (await tableExists(env.DB, 'sessions'))) {
    const delRes = currentToken
      ? await env.DB.prepare(`DELETE FROM sessions WHERE COALESCE(role, 'candidate') != 'admin' AND token != ?`).bind(currentToken).run()
      : await env.DB.prepare(`DELETE FROM sessions WHERE COALESCE(role, 'candidate') != 'admin'`).run();
    revokedSessions = Number(delRes?.meta?.changes || 0);
  }

  return {
    ok: true,
    dry_run: false,
    lockdown: nextState,
    freeze,
    revoked_sessions: revokedSessions
  };
}

// ============================================================================
// Module #12: Data Privacy, DPDP Act 2023 Compliance & Consent Vault
// ============================================================================
export function defaultDpdpPolicy() {
  return {
    dpo_name: 'Data Protection Officer — CS Odisha',
    dpo_email: 'dpo@csodisha.com',
    privacy_notice_version: '2026.1-DPDP',
    dsar_sla_days: 15,
    consent_purposes: ['essential_platform', 'exam_alerts_opt_in', 'analytics_anonymized'],
    auto_purge_withdrawn_days: 30
  };
}

function normalizeDpdpPolicy(raw) {
  const def = defaultDpdpPolicy();
  if (!raw || typeof raw !== 'object') return def;
  return {
    dpo_name: String(raw.dpo_name || def.dpo_name).trim().slice(0, 120),
    dpo_email: String(raw.dpo_email || def.dpo_email).trim().slice(0, 120),
    privacy_notice_version: String(raw.privacy_notice_version || def.privacy_notice_version).trim().slice(0, 48),
    dsar_sla_days: Math.max(7, Math.min(30, Math.round(Number(raw.dsar_sla_days) || def.dsar_sla_days))),
    consent_purposes: Array.isArray(raw.consent_purposes) && raw.consent_purposes.length
      ? raw.consent_purposes
      : def.consent_purposes,
    auto_purge_withdrawn_days: Math.max(1, Math.min(365, Math.round(Number(raw.auto_purge_withdrawn_days) || def.auto_purge_withdrawn_days)))
  };
}

async function ensureDpdpTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS dpdp_consent_records (
       id TEXT PRIMARY KEY,
       subject_hash TEXT NOT NULL,
       subject_masked TEXT NOT NULL,
       purpose_code TEXT NOT NULL,
       lawful_basis TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'granted',
       notice_version TEXT NOT NULL,
       source_channel TEXT,
       granted_at TEXT,
       withdrawn_at TEXT,
       updated_at TEXT
     )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS dpdp_dsar_requests (
       id TEXT PRIMARY KEY,
       request_type TEXT NOT NULL,
       subject_masked TEXT NOT NULL,
       subject_hash TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'pending',
       notes TEXT,
       sla_due_at TEXT,
       resolved_by TEXT,
       resolved_at TEXT,
       created_at TEXT
     )`
  ).run();
}

export async function getDpdpComplianceState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureDpdpTables(env.DB);
  const row = await readSettingRow(env.DB, DPDP_POLICY_KEY);
  let parsed = null;
  if (row && row.value_json) {
    try { parsed = JSON.parse(row.value_json); } catch {}
  }
  const policy = normalizeDpdpPolicy(parsed);

  const [consentCounts, consentsRes, dsarRes] = await Promise.all([
    env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'granted' THEN 1 ELSE 0 END) AS granted,
         SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) AS withdrawn
       FROM dpdp_consent_records`
    ).first(),
    env.DB.prepare(
      `SELECT id, subject_hash, subject_masked, purpose_code, lawful_basis, status, notice_version, source_channel, granted_at, withdrawn_at, updated_at
       FROM dpdp_consent_records ORDER BY updated_at DESC LIMIT 30`
    ).all(),
    env.DB.prepare(
      `SELECT id, request_type, subject_masked, subject_hash, status, notes, sla_due_at, resolved_by, resolved_at, created_at
       FROM dpdp_dsar_requests ORDER BY created_at DESC LIMIT 40`
    ).all()
  ]);

  const dsarItems = dsarRes.results || [];
  const openDsar = dsarItems.filter(d => d.status === 'pending' || d.status === 'in_review').length;
  const fulfilledDsar = dsarItems.filter(d => d.status === 'fulfilled').length;

  return {
    ok: true,
    dpdp_readiness: 'INDIA_DPDP_2023_COMPLIANT',
    policy,
    consent_summary: {
      total: Number(consentCounts && consentCounts.total) || 0,
      granted: Number(consentCounts && consentCounts.granted) || 0,
      withdrawn: Number(consentCounts && consentCounts.withdrawn) || 0
    },
    recent_consents: consentsRes.results || [],
    dsar_summary: {
      total: dsarItems.length,
      open_count: openDsar,
      fulfilled_count: fulfilledDsar
    },
    dsar_requests: dsarItems,
    updated_by: row ? (row.updated_by || null) : null,
    updated_at: row ? (row.updated_at || null) : null
  };
}

export async function saveDpdpPolicy(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  if (input.dpo_email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.dpo_email).trim())) {
    throw new HttpError(400, 'INVALID_DPO_EMAIL', 'Provide a valid Data Protection Officer email address');
  }
  if (input.dsar_sla_days !== undefined) {
    const d = Number(input.dsar_sla_days);
    if (!Number.isInteger(d) || d < 7 || d > 30) {
      throw new HttpError(400, 'INVALID_SLA_DAYS', 'dsar_sla_days must be an integer between 7 and 30');
    }
  }
  if (input.auto_purge_withdrawn_days !== undefined) {
    const p = Number(input.auto_purge_withdrawn_days);
    if (!Number.isInteger(p) || p < 1 || p > 365) {
      throw new HttpError(400, 'INVALID_PURGE_DAYS', 'auto_purge_withdrawn_days must be between 1 and 365');
    }
  }

  const current = (await getDpdpComplianceState(env)).policy;
  const next = normalizeDpdpPolicy({ ...current, ...input });
  const nowIso = new Date().toISOString();

  await env.DB.prepare(upsertSettingSql()).bind(
    DPDP_POLICY_KEY,
    JSON.stringify(next),
    actorEmail || 'admin',
    nowIso
  ).run();

  return await getDpdpComplianceState(env);
}

export async function createDpdpDsarRequest(env, input = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureDpdpTables(env.DB);

  const reqType = String(input.request_type || '').trim().toLowerCase();
  if (!['access', 'correction', 'erasure'].includes(reqType)) {
    throw new HttpError(400, 'INVALID_DSAR_TYPE', 'request_type must be access, correction, or erasure');
  }
  const rawSubject = String(input.subject_identifier || input.subject || '').trim();
  if (rawSubject.length < 3) {
    throw new HttpError(400, 'SUBJECT_REQUIRED', 'Provide a Data Principal identifier (email or ID)');
  }

  const state = await getDpdpComplianceState(env);
  const subjectHash = await sha256Hex(rawSubject.toLowerCase());
  const subjectMasked = maskSubjectIdentifier(rawSubject);
  const id = `dsar_${Date.now().toString(36)}_${subjectHash.slice(0, 6)}`;
  const nowIso = new Date().toISOString();
  const slaDueAt = new Date(Date.now() + state.policy.dsar_sla_days * 86400000).toISOString();
  const notes = String(input.notes || '').trim().slice(0, 500);

  await env.DB.prepare(
    `INSERT INTO dpdp_dsar_requests (id, request_type, subject_masked, subject_hash, status, notes, sla_due_at, resolved_by, resolved_at, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL, NULL, ?)`
  ).bind(id, reqType, subjectMasked, subjectHash, notes, slaDueAt, nowIso).run();

  const item = await env.DB.prepare(`SELECT * FROM dpdp_dsar_requests WHERE id = ?`).bind(id).first();
  return { ok: true, item };
}

export async function updateDpdpDsarStatus(env, id, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureDpdpTables(env.DB);
  const cleanId = String(id || '').trim();
  const existing = await env.DB.prepare(`SELECT * FROM dpdp_dsar_requests WHERE id = ?`).bind(cleanId).first();
  if (!existing) {
    throw new HttpError(404, 'DSAR_NOT_FOUND', `DSAR request "${cleanId}" not found`);
  }

  const nextStatus = String(input.status || '').trim();
  if (!['pending', 'in_review', 'fulfilled', 'rejected_with_reason'].includes(nextStatus)) {
    throw new HttpError(400, 'INVALID_DSAR_STATUS', 'status must be pending, in_review, fulfilled, or rejected_with_reason');
  }
  const notes = input.notes !== undefined ? String(input.notes || '').trim().slice(0, 500) : (existing.notes || '');
  const isFinal = nextStatus === 'fulfilled' || nextStatus === 'rejected_with_reason';
  const resolvedAt = isFinal ? new Date().toISOString() : null;
  const resolvedBy = isFinal ? (actorEmail || 'admin') : null;

  await env.DB.prepare(
    `UPDATE dpdp_dsar_requests SET status = ?, notes = ?, resolved_by = ?, resolved_at = ? WHERE id = ?`
  ).bind(nextStatus, notes, resolvedBy, resolvedAt, cleanId).run();

  const item = await env.DB.prepare(`SELECT * FROM dpdp_dsar_requests WHERE id = ?`).bind(cleanId).first();
  return { ok: true, item };
}

// ============================================================================
// Module #13: Security Incident Response & Audit Snapshot Export
// ============================================================================
async function ensureSecIncidentsTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS sec_incidents (
       id TEXT PRIMARY KEY,
       title TEXT NOT NULL,
       severity TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'open',
       vector TEXT,
       summary TEXT,
       containment_actions_json TEXT,
       opened_by TEXT,
       closed_by TEXT,
       created_at TEXT,
       updated_at TEXT,
       closed_at TEXT
     )`
  ).run();
}

function normalizeIncidentRow(row) {
  let containment = [];
  try {
    const parsed = JSON.parse(row.containment_actions_json || '[]');
    if (Array.isArray(parsed)) containment = parsed;
  } catch {}
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    vector: row.vector || '',
    summary: row.summary || '',
    containment_actions: containment,
    opened_by: row.opened_by || null,
    closed_by: row.closed_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed_at: row.closed_at || null
  };
}

export async function getSecurityIncidentsState(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSecIncidentsTable(env.DB);

  const [incRes, packRow, stream] = await Promise.all([
    env.DB.prepare(`SELECT * FROM sec_incidents ORDER BY created_at DESC LIMIT 50`).all(),
    readSettingRow(env.DB, LAST_EVIDENCE_PACK_KEY),
    getAuditTimelineStream(env, { category: 'security', limit: 10, offset: 0 })
  ]);

  const items = (incRes.results || []).map(normalizeIncidentRow);
  const openCount = items.filter(i => i.status === 'open' || i.status === 'investigating').length;
  const closedCount = items.filter(i => i.status === 'contained' || i.status === 'resolved').length;
  const p1Open = items.filter(i => i.severity === 'P1-CRITICAL' && (i.status === 'open' || i.status === 'investigating')).length;
  const postureScore = Math.max(40, 100 - (p1Open * 25) - (openCount * 8));

  let lastPack = null;
  if (packRow && packRow.value_json) {
    try { lastPack = JSON.parse(packRow.value_json); } catch {}
  }

  return {
    ok: true,
    summary: {
      total: items.length,
      open_count: openCount,
      contained_or_resolved_count: closedCount,
      posture_score: postureScore
    },
    last_pack_sha256: lastPack ? lastPack.pack_sha256 : null,
    last_pack_at: lastPack ? lastPack.exported_at : null,
    items,
    recent_security_events: stream.items || []
  };
}

export async function createSecurityIncident(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSecIncidentsTable(env.DB);

  const title = String(input.title || '').trim().slice(0, 160);
  if (title.length < 3) {
    throw new HttpError(400, 'TITLE_REQUIRED', 'Incident title must be at least 3 characters');
  }
  const severity = String(input.severity || 'P2-HIGH').toUpperCase();
  if (!['P1-CRITICAL', 'P2-HIGH', 'P3-MEDIUM', 'P4-LOW'].includes(severity)) {
    throw new HttpError(400, 'INVALID_SEVERITY', 'severity must be P1-CRITICAL, P2-HIGH, P3-MEDIUM, or P4-LOW');
  }
  const vector = String(input.vector || '').trim().slice(0, 100);
  const summary = String(input.summary || '').trim().slice(0, 800);
  const containment = Array.isArray(input.containment_actions)
    ? input.containment_actions.map(s => String(s || '').trim()).filter(Boolean).slice(0, 20)
    : [];

  const id = `INC-${Date.now().toString(36).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO sec_incidents (id, title, severity, status, vector, summary, containment_actions_json, opened_by, closed_by, created_at, updated_at, closed_at)
     VALUES (?, ?, ?, 'open', ?, ?, ?, ?, NULL, ?, ?, NULL)`
  ).bind(
    id,
    title,
    severity,
    vector,
    summary,
    JSON.stringify(containment),
    actorEmail || 'admin',
    nowIso,
    nowIso
  ).run();

  const row = await env.DB.prepare(`SELECT * FROM sec_incidents WHERE id = ?`).bind(id).first();
  return { ok: true, item: normalizeIncidentRow(row) };
}

export async function updateSecurityIncident(env, id, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSecIncidentsTable(env.DB);

  const cleanId = String(id || '').trim();
  const existing = await env.DB.prepare(`SELECT * FROM sec_incidents WHERE id = ?`).bind(cleanId).first();
  if (!existing) {
    throw new HttpError(404, 'INCIDENT_NOT_FOUND', `Incident "${cleanId}" not found`);
  }

  const nextStatus = input.status !== undefined ? String(input.status).trim() : existing.status;
  if (!['open', 'investigating', 'contained', 'resolved'].includes(nextStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', 'status must be open, investigating, contained, or resolved');
  }
  const summary = input.summary !== undefined ? String(input.summary).trim().slice(0, 800) : (existing.summary || '');
  let containmentJson = existing.containment_actions_json || '[]';
  if (Array.isArray(input.containment_actions)) {
    containmentJson = JSON.stringify(input.containment_actions.map(s => String(s || '').trim()).filter(Boolean).slice(0, 20));
  }

  const nowIso = new Date().toISOString();
  const isClosed = nextStatus === 'resolved';
  const closedBy = isClosed ? (actorEmail || 'admin') : null;
  const closedAt = isClosed ? nowIso : null;

  await env.DB.prepare(
    `UPDATE sec_incidents
     SET status = ?, summary = ?, containment_actions_json = ?, closed_by = ?, updated_at = ?, closed_at = ?
     WHERE id = ?`
  ).bind(nextStatus, summary, containmentJson, closedBy, nowIso, closedAt, cleanId).run();

  const row = await env.DB.prepare(`SELECT * FROM sec_incidents WHERE id = ?`).bind(cleanId).first();
  return { ok: true, item: normalizeIncidentRow(row) };
}

export async function generateSecurityEvidencePack(env, request, actorEmail = 'admin') {
  const [
    rbac,
    engineGuards,
    botDeterrence,
    ipGeofence,
    twoFactor,
    piiMasking,
    originHeaders,
    lockdown,
    dpdp,
    incidents,
    auditStream
  ] = await Promise.all([
    getRbacHierarchyState(env),
    getEngineGuardsState(env),
    getBotDeterrenceState(env),
    getIpGeofenceState(env, request),
    getTwoFactorGovernanceState(env),
    getPiiMaskingState(env),
    getOriginHeadersState(env),
    getLockdownPosture(env),
    getDpdpComplianceState(env),
    getSecurityIncidentsState(env),
    getAuditTimelineStream(env, { category: 'all', limit: 100, offset: 0 })
  ]);

  const packBody = {
    rbac_matrix: rbac.matrix,
    engine_guards: engineGuards.guards,
    bot_deterrence: botDeterrence.config,
    ip_geofence: ipGeofence.policy,
    two_factor_posture: {
      binding_posture: twoFactor.binding_posture,
      policy: twoFactor.policy,
      enrolled_count: twoFactor.enrolled_count,
      total_staff: twoFactor.total_staff
    },
    pii_masking: piiMasking.policy,
    origin_headers: originHeaders.policy,
    lockdown_posture: lockdown.lockdown,
    dpdp_compliance: {
      readiness: dpdp.dpdp_readiness,
      policy: dpdp.policy,
      consent_summary: dpdp.consent_summary,
      dsar_summary: dpdp.dsar_summary
    },
    incidents: incidents.items,
    dpdp_redacted_audit_events: auditStream.items
  };

  const exportedAt = new Date().toISOString();
  const packSha256 = await sha256Hex(JSON.stringify(packBody));
  const filename = `cso-security-evidence-pack-${exportedAt.slice(0, 10)}.json`;

  await ensureSiteSettingsTable(env.DB);
  await env.DB.prepare(upsertSettingSql()).bind(
    LAST_EVIDENCE_PACK_KEY,
    JSON.stringify({ pack_sha256: packSha256, exported_at: exportedAt, exported_by: actorEmail || 'admin' }),
    actorEmail || 'admin',
    exportedAt
  ).run();

  return {
    ok: true,
    exported_at: exportedAt,
    pack_sha256: packSha256,
    filename,
    pack: {
      manifest: {
        suite: 'CS Odisha Security, Privacy & RBAC Suite',
        version: 'v41',
        exported_at: exportedAt,
        exported_by: actorEmail || 'admin',
        pack_sha256: packSha256,
        dpdp_redacted: true
      },
      ...packBody
    }
  };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/security/{lockdown|dpdp|incidents}
// ============================================================================
export async function handleSecurityCompliance(request, env, actor, subAction, subId, extraAction) {
  const method = request.method;

  // Module #11: /api/admin/security/lockdown
  if (subAction === 'lockdown') {
    if (!subId && method === 'GET') {
      return json(await getLockdownPosture(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'dispatch' && method === 'POST') {
      const body = await readJson(request, 10000).catch(() => ({}));
      const dryRun = body.dry_run !== false;
      if (!dryRun && actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can dispatch live lockdown changes');
      }
      const res = await dispatchSecurityLockdown(env, {
        level: body && body.level,
        incident_banner_title: body && body.incident_banner_title,
        incident_banner_body: body && body.incident_banner_body,
        dry_run: dryRun,
        confirm: body && (body.confirm !== undefined ? body.confirm : body.confirm_phrase),
        actorEmail: actor.email || actor.userId,
        currentToken: actor.sessionToken || ''
      });
      if (!dryRun) {
        await audit(env, request, actor, 'security.lockdown.dispatch', 'site_settings', LOCKDOWN_STATE_KEY, {
          level: res.lockdown.level,
          revoked_sessions: res.revoked_sessions
        });
      }
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #12: /api/admin/security/dpdp
  if (subAction === 'dpdp') {
    if (!subId && method === 'GET') {
      return json(await getDpdpComplianceState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'policy' && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update DPDP Act 2023 governance settings');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const state = await saveDpdpPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.dpdp.policy.update', 'site_settings', DPDP_POLICY_KEY, state.policy);
      return json(state, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'dsar' && !extraAction && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can log DSAR requests');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const res = await createDpdpDsarRequest(env, body);
      await audit(env, request, actor, 'security.dpdp.dsar.update', 'dpdp_dsar_requests', res.item.id, {
        request_type: res.item.request_type,
        status: res.item.status
      });
      return json(res, 201, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'dsar' && extraAction && (method === 'PATCH' || method === 'PUT')) {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can resolve DSAR requests');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const res = await updateDpdpDsarStatus(env, extraAction, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.dpdp.dsar.update', 'dpdp_dsar_requests', res.item.id, {
        status: res.item.status
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #13: /api/admin/security/incidents
  if (subAction === 'incidents') {
    if (!subId && method === 'GET') {
      return json(await getSecurityIncidentsState(env), 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can open security incidents');
      }
      const body = await readJson(request, 15000).catch(() => ({}));
      const res = await createSecurityIncident(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.incident.save', 'sec_incidents', res.item.id, {
        title: res.item.title,
        severity: res.item.severity,
        status: res.item.status
      });
      return json(res, 201, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'export-pack' && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can export the security evidence pack');
      }
      const res = await generateSecurityEvidencePack(env, request, actor.email || actor.userId);
      await audit(env, request, actor, 'security.incident.export_pack', 'sec_incidents', 'evidence_pack', {
        pack_sha256: res.pack_sha256,
        filename: res.filename
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId && (method === 'PATCH' || method === 'PUT')) {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update security incidents');
      }
      const body = await readJson(request, 15000).catch(() => ({}));
      const res = await updateSecurityIncident(env, subId, body, actor.email || actor.userId);
      await audit(env, request, actor, 'security.incident.save', 'sec_incidents', res.item.id, {
        status: res.item.status
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown security compliance endpoint');
}
