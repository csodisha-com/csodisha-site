// Shared helper for reading, normalizing, and enforcing candidate_controls and candidate_audit_logs.
import { HttpError } from './http.js';

export const ACCOUNT_STATUSES = ['active', 'restricted', 'suspended', 'banned'];
export const NOTICE_LEVELS = ['info', 'warning', 'urgent'];
export const DEFAULT_PERMISSIONS = {
  canTakeCbt: true,
  canEditProfile: true,
  canSyncCloud: true,
  canBookmark: true,
  canExportData: true
};

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function normalizePermissions(raw) {
  const obj = typeof raw === 'string' ? parseJson(raw, {}) : (raw && typeof raw === 'object' ? raw : {});
  return {
    canTakeCbt: obj.canTakeCbt !== false,
    canEditProfile: obj.canEditProfile !== false,
    canSyncCloud: obj.canSyncCloud !== false,
    canBookmark: obj.canBookmark !== false,
    canExportData: obj.canExportData !== false
  };
}

export async function getCandidateControls(env, userId) {
  const defaults = {
    user_id: userId,
    account_status: 'active',
    restriction_reason: null,
    suspended_until: null,
    permissions: { ...DEFAULT_PERMISSIONS },
    assigned_exams: [],
    lock_exam_preferences: false,
    admin_notice_text: null,
    admin_notice_level: 'info',
    session_version: 1,
    updated_by: null,
    updated_at: null
  };
  if (!env || !env.DB || !userId) return defaults;

  const row = await env.DB.prepare(
    `SELECT user_id, account_status, restriction_reason, suspended_until, permissions_json,
            assigned_exams_json, lock_exam_preferences, admin_notice_text, admin_notice_level,
            session_version, updated_by, updated_at
     FROM candidate_controls WHERE user_id = ?`
  ).bind(userId).first().catch(() => null);

  if (!row) return defaults;

  let status = ACCOUNT_STATUSES.includes(row.account_status) ? row.account_status : 'active';
  if (status === 'suspended' && row.suspended_until) {
    const untilMs = Date.parse(row.suspended_until);
    if (!Number.isNaN(untilMs) && untilMs <= Date.now()) {
      status = 'active';
    }
  }

  const assigned = parseJson(row.assigned_exams_json, []);
  return {
    user_id: row.user_id,
    account_status: status,
    restriction_reason: row.restriction_reason || null,
    suspended_until: row.suspended_until || null,
    permissions: normalizePermissions(row.permissions_json),
    assigned_exams: Array.isArray(assigned) ? assigned.map(String) : [],
    lock_exam_preferences: Boolean(row.lock_exam_preferences),
    admin_notice_text: row.admin_notice_text || null,
    admin_notice_level: NOTICE_LEVELS.includes(row.admin_notice_level) ? row.admin_notice_level : 'info',
    session_version: Number(row.session_version || 1),
    updated_by: row.updated_by || null,
    updated_at: row.updated_at || null
  };
}

export async function enforceCandidateControls(env, userId, { isWrite = false, permission = null } = {}) {
  const controls = await getCandidateControls(env, userId);

  if (controls.account_status === 'banned' || controls.account_status === 'suspended') {
    throw new HttpError(
      403,
      'ACCOUNT_RESTRICTED',
      controls.restriction_reason || `Account is ${controls.account_status}.`,
      {
        account_status: controls.account_status,
        restriction_reason: controls.restriction_reason,
        suspended_until: controls.suspended_until
      }
    );
  }

  if (isWrite && controls.account_status === 'restricted') {
    throw new HttpError(
      403,
      'ACCOUNT_RESTRICTED',
      controls.restriction_reason || 'Account is in read-only restricted mode.',
      {
        account_status: 'restricted',
        restriction_reason: controls.restriction_reason
      }
    );
  }

  if (permission && controls.permissions[permission] === false) {
    throw new HttpError(
      403,
      'PERMISSION_DENIED',
      'This feature has been disabled for your account by an administrator.',
      {
        permission,
        account_status: controls.account_status
      }
    );
  }

  return controls;
}

export async function logCandidateAudit(env, userId, action, actor, details = null) {
  if (!env || !env.DB || !userId || !action) return;
  try {
    const serialized = details == null ? null : (typeof details === 'string' ? details : JSON.stringify(details));
    await env.DB.prepare(
      `INSERT INTO candidate_audit_logs (user_id, action, actor, details, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(userId, action, actor || 'system', serialized ? serialized.slice(0, 4000) : null).run();
  } catch (e) {
    console.error('candidate_audit_logs write failed:', e);
  }
}
