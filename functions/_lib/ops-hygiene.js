// Operations Suite — Module #6 (Database Migration Version & DDL Schema Journal),
// Module #11 (Dead-Letter Message Vacuum & Retention Expiry Purge),
// Module #13 (Post-Incident Forensic Audit & State Diff Inspector),
// and Module #14 (Automated Daily Backup Schedule & Retention Policy).
import { HttpError, json, readJson } from './http.js';
import { audit } from './rbac.js';
import { createPlatformSnapshot, canonicalizeValue } from './ops-snapshots.js';

export const BACKUP_POLICY_KEY = 'ops_backup_policy';

export const KNOWN_MIGRATIONS = [
  { version: '0001', file: '0001_baseline.sql', description: 'Baseline users, candidates, sessions, checklists, bookmarks & verifications' },
  { version: '0002', file: '0002_roles_audit_ratelimit.sql', description: 'Staff RBAC roles, audit_log trail & admin_rate_limits' },
  { version: '0003', file: '0003_cms_content.sql', description: 'CMS posts, mock_tests, questions & media_assets' },
  { version: '0004', file: '0004_site_settings_resources.sql', description: 'Global site_settings KV table & study resources' },
  { version: '0005', file: '0005_candidate_progress.sql', description: 'Candidate preparation progress & mock test attempts' },
  { version: '0006', file: '0006_lifecycle_maintenance.sql', description: 'Scheduled publishing & deadline expiry indexes' },
  { version: '0007', file: '0007_site_pages_live.sql', description: 'Dynamic site_pages & site_page_revisions journal' },
  { version: '0008', file: '0008_exam_taxonomy_and_candidate_controls.sql', description: '4-tier exam taxonomy & candidate governance' },
  { version: '0009', file: '0009_ecosystem_unification.sql', description: 'Jobs directory, schemes & community feedback tables' },
  { version: '0010', file: '0010_about_directory_cms.sql', description: 'About CSO directory CMS records' },
  { version: '0011', file: '0011_schemes_directory_tree.sql', description: 'Hierarchical schemes directory tree' },
  { version: '0012', file: '0012_study_library_directory.sql', description: 'Study library directory & structured materials' }
];

const enc = new TextEncoder();

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(text)));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeDdlSql(sql) {
  return String(sql || '')
    .replace(/--[^\r\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function ensureSiteSettingsTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS site_settings (
       key TEXT PRIMARY KEY,
       value_json TEXT NOT NULL,
       updated_by TEXT,
       updated_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`
  ).run();
}

// ============================================================================
// Module #6: Database Migration Version & DDL Schema Journal
// ============================================================================
export async function inspectDatabaseSchema(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  const { results } = await env.DB.prepare(
    `SELECT type, name, tbl_name, sql
     FROM sqlite_master
     WHERE type IN ('table', 'index')
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '_cf_%'
     ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name ASC`
  ).all();

  const items = results || [];
  const tables = [];
  const indexes = [];
  const canonicalLines = [];
  let totalRows = 0;

  for (const item of items) {
    const normSql = normalizeDdlSql(item.sql || '');
    canonicalLines.push(`${item.type}:${item.name}:${normSql}`);

    if (item.type === 'table') {
      let rowCount = 0;
      let columnCount = 0;
      const safeIdent = String(item.name).replace(/"/g, '""');
      try {
        const cRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM "${safeIdent}"`).first();
        rowCount = cRow && cRow.n !== undefined ? Number(cRow.n) : 0;
      } catch {
        rowCount = 0;
      }
      try {
        const cols = await env.DB.prepare(`PRAGMA table_info("${safeIdent}")`).all();
        columnCount = Array.isArray(cols.results) ? cols.results.length : 0;
      } catch {
        columnCount = 0;
      }
      totalRows += rowCount;
      tables.push({
        name: item.name,
        row_count: rowCount,
        column_count: columnCount,
        ddl_sql: item.sql || '',
        normalized_ddl: normSql
      });
    } else if (item.type === 'index') {
      indexes.push({
        name: item.name,
        table_name: item.tbl_name,
        ddl_sql: item.sql || '',
        normalized_ddl: normSql
      });
    }
  }

  // Sort canonical DDL lines deterministically before computing SHA-256 fingerprint
  canonicalLines.sort();
  const schemaSha256 = await sha256Hex(canonicalLines.join('\n'));

  // Check if d1_migrations table exists for applied timestamps
  let appliedMap = new Map();
  try {
    const migRows = await env.DB.prepare(`SELECT name, applied_at FROM d1_migrations ORDER BY id ASC`).all();
    for (const r of (migRows.results || [])) {
      if (r && r.name) appliedMap.set(String(r.name), r.applied_at || null);
    }
  } catch {}

  const migrations = KNOWN_MIGRATIONS.map(m => ({
    ...m,
    status: appliedMap.has(m.file) ? 'APPLIED' : 'TRACKED',
    applied_at: appliedMap.get(m.file) || null
  }));

  return {
    ok: true,
    inspected_at: new Date().toISOString(),
    schema_sha256: schemaSha256,
    table_count: tables.length,
    index_count: indexes.length,
    total_rows: totalRows,
    tables,
    indexes,
    migrations
  };
}

// ============================================================================
// Module #11: Dead-Letter Message Vacuum & Retention Expiry Purge
// ============================================================================
async function tableExists(db, tableName) {
  const row = await db.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
  ).bind(tableName).first();
  return Boolean(row && row.name);
}

export async function runDeadLetterVacuum(env, { dryRun = false, trimRevisions = true, revisionKeepLimit = 25 } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  const isDryRun = Boolean(dryRun);
  const doTrimRevs = Boolean(trimRevisions);
  const keepLimit = Math.max(1, Math.min(200, Number(revisionKeepLimit) || 25));
  const nowSec = Math.floor(Date.now() / 1000);
  const dayAgoSec = nowSec - 86400;
  const nowIso = new Date().toISOString();
  const dayAgoIso = new Date(Date.now() - 86400 * 1000).toISOString();

  const breakdown = {
    admin_otps: 0,
    sessions: 0,
    admin_rate_limits: 0,
    site_page_revisions: 0
  };

  // 1. Expired / stale admin_otps (>24h old or expired)
  if (await tableExists(env.DB, 'admin_otps')) {
    const whereOtp = `
      (typeof(expires_at) = 'integer' AND expires_at < ?)
      OR (typeof(expires_at) = 'text' AND expires_at < ?)
      OR (typeof(created_at) = 'integer' AND created_at < ?)
      OR (typeof(created_at) = 'text' AND created_at < ?)
    `;
    const bindsOtp = [nowSec, nowIso, dayAgoSec, dayAgoIso];
    if (isDryRun) {
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_otps WHERE ${whereOtp}`).bind(...bindsOtp).first();
      breakdown.admin_otps = Number(r?.n || 0);
    } else {
      const r = await env.DB.prepare(`DELETE FROM admin_otps WHERE ${whereOtp}`).bind(...bindsOtp).run();
      breakdown.admin_otps = Number(r?.meta?.changes || 0);
    }
  }

  // 2. Expired sessions (expires_at < now)
  if (await tableExists(env.DB, 'sessions')) {
    const whereSess = `
      (typeof(expires_at) = 'integer' AND expires_at < ?)
      OR (typeof(expires_at) = 'text' AND (expires_at < ? OR expires_at < datetime('now')))
    `;
    const bindsSess = [nowSec, nowIso];
    if (isDryRun) {
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sessions WHERE ${whereSess}`).bind(...bindsSess).first();
      breakdown.sessions = Number(r?.n || 0);
    } else {
      const r = await env.DB.prepare(`DELETE FROM sessions WHERE ${whereSess}`).bind(...bindsSess).run();
      breakdown.sessions = Number(r?.meta?.changes || 0);
    }
  }

  // 3. Stale admin_rate_limits older than 24 hours
  if (await tableExists(env.DB, 'admin_rate_limits')) {
    const whereRl = `
      (typeof(window_start) = 'integer' AND window_start < ?)
      OR (typeof(window_start) = 'text' AND (window_start < ? OR window_start < datetime('now', '-1 day')))
    `;
    const bindsRl = [dayAgoSec, dayAgoIso];
    if (isDryRun) {
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_rate_limits WHERE ${whereRl}`).bind(...bindsRl).first();
      breakdown.admin_rate_limits = Number(r?.n || 0);
    } else {
      const r = await env.DB.prepare(`DELETE FROM admin_rate_limits WHERE ${whereRl}`).bind(...bindsRl).run();
      breakdown.admin_rate_limits = Number(r?.meta?.changes || 0);
    }
  }

  // 4. Excess site_page_revisions beyond newest `keepLimit` per route
  if (doTrimRevs && await tableExists(env.DB, 'site_page_revisions')) {
    const excessSubquery = `
      SELECT id FROM site_page_revisions
      WHERE id NOT IN (
        SELECT r2.id FROM site_page_revisions r2
        WHERE r2.route = site_page_revisions.route
        ORDER BY r2.id DESC
        LIMIT ?
      )
    `;
    if (isDryRun) {
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM (${excessSubquery})`).bind(keepLimit).first();
      breakdown.site_page_revisions = Number(r?.n || 0);
    } else {
      const r = await env.DB.prepare(`DELETE FROM site_page_revisions WHERE id IN (${excessSubquery})`).bind(keepLimit).run();
      breakdown.site_page_revisions = Number(r?.meta?.changes || 0);
    }
  }

  const totalReclaimed =
    breakdown.admin_otps +
    breakdown.sessions +
    breakdown.admin_rate_limits +
    breakdown.site_page_revisions;

  return {
    ok: true,
    dry_run: isDryRun,
    trim_revisions: doTrimRevs,
    revision_keep_limit: keepLimit,
    total_reclaimed: totalReclaimed,
    tables: breakdown,
    executed_at: nowIso
  };
}

// ============================================================================
// Module #13: Post-Incident Forensic Audit & State Diff Inspector
// ============================================================================
function parseJsonObjectSafe(val) {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { value: parsed };
    } catch {
      return null;
    }
  }
  return null;
}

export function computeForensicDiff(rawMetadata) {
  const meta = parseJsonObjectSafe(rawMetadata) || {};
  const beforeCandidate = meta.before_json ?? meta.before ?? meta.previous ?? (meta.from !== undefined ? { value: meta.from } : null);
  const afterCandidate = meta.after_json ?? meta.after ?? meta.current ?? (meta.to !== undefined ? { value: meta.to } : null);

  const beforeObj = parseJsonObjectSafe(beforeCandidate);
  const afterObj = parseJsonObjectSafe(afterCandidate);

  if (beforeObj || afterObj) {
    const b = beforeObj || {};
    const a = afterObj || {};
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
    const added = [];
    const modified = [];
    const removed = [];
    let unchangedCount = 0;

    for (const k of keys) {
      const hasB = Object.prototype.hasOwnProperty.call(b, k);
      const hasA = Object.prototype.hasOwnProperty.call(a, k);
      if (!hasB && hasA) {
        added.push({ field: k, after: a[k] });
      } else if (hasB && !hasA) {
        removed.push({ field: k, before: b[k] });
      } else {
        const canonB = JSON.stringify(canonicalizeValue(b[k]));
        const canonA = JSON.stringify(canonicalizeValue(a[k]));
        if (canonB === canonA) {
          unchangedCount++;
        } else {
          modified.push({ field: k, before: b[k], after: a[k] });
        }
      }
    }

    return {
      has_state_diff: true,
      added,
      modified,
      removed,
      unchanged_count: unchangedCount,
      change_count: added.length + modified.length + removed.length
    };
  }

  // Fallback: represent metadata keys as structured payload inspection fields
  const payloadFields = Object.keys(meta).sort().map(k => ({
    field: k,
    value: meta[k]
  }));
  return {
    has_state_diff: false,
    added: [],
    modified: [],
    removed: [],
    unchanged_count: 0,
    change_count: payloadFields.length,
    payload_fields: payloadFields
  };
}

export async function inspectForensicAudit(env, { actionFilter = '', actorFilter = '', limit = 50 } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  if (!(await tableExists(env.DB, 'audit_log'))) {
    return { ok: true, total: 0, items: [] };
  }

  const cleanLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const where = ['1=1'];
  const binds = [];

  const cleanAction = String(actionFilter || '').trim().slice(0, 80);
  if (cleanAction) {
    where.push(`a.action LIKE ?`);
    binds.push(cleanAction.includes('%') ? cleanAction : `${cleanAction}%`);
  }

  const cleanActor = String(actorFilter || '').trim().slice(0, 120);
  const hasUsers = await tableExists(env.DB, 'users');
  if (cleanActor) {
    if (hasUsers) {
      where.push(`(a.actor_user_id LIKE ? OR u.email LIKE ?)`);
      binds.push(`%${cleanActor}%`, `%${cleanActor}%`);
    } else {
      where.push(`a.actor_user_id LIKE ?`);
      binds.push(`%${cleanActor}%`);
    }
  }

  const sql = hasUsers
    ? `SELECT a.id, a.actor_user_id, a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at, u.email AS actor_email
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE ${where.join(' AND ')}
       ORDER BY a.id DESC
       LIMIT ?`
    : `SELECT a.id, a.actor_user_id, a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at, a.actor_user_id AS actor_email
       FROM audit_log a
       WHERE ${where.join(' AND ')}
       ORDER BY a.id DESC
       LIMIT ?`;

  const { results } = await env.DB.prepare(sql).bind(...binds, cleanLimit).all();
  const items = (results || []).map(row => {
    const parsedMeta = parseJsonObjectSafe(row.metadata_json) || {};
    const diff = computeForensicDiff(parsedMeta);
    return {
      id: row.id,
      action: row.action,
      actor_user_id: row.actor_user_id,
      actor_email: row.actor_email || row.actor_user_id || 'system',
      target_type: row.target_type,
      target_id: row.target_id,
      ip_address: row.ip_address,
      created_at: row.created_at,
      metadata: parsedMeta,
      diff
    };
  });

  return {
    ok: true,
    total: items.length,
    items
  };
}

// ============================================================================
// Module #14: Automated Daily Backup Schedule & Retention Policy
// ============================================================================
export function defaultBackupPolicy() {
  return {
    enabled: false,
    interval_hours: 24,
    max_snapshots: 30,
    max_age_days: 30,
    last_auto_snapshot_at: null,
    last_auto_snapshot_id: null,
    last_pruned_count: 0
  };
}

export async function getBackupRetentionPolicy(env) {
  const def = defaultBackupPolicy();
  if (!env || !env.DB) return def;
  try {
    const row = await env.DB.prepare(
      `SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`
    ).bind(BACKUP_POLICY_KEY).first();
    if (!row || !row.value_json) return def;
    const parsed = JSON.parse(row.value_json);
    return {
      enabled: Boolean(parsed && parsed.enabled),
      interval_hours: Math.max(1, Math.min(168, Number(parsed?.interval_hours) || 24)),
      max_snapshots: Math.max(1, Math.min(365, Number(parsed?.max_snapshots) || 30)),
      max_age_days: Math.max(1, Math.min(365, Number(parsed?.max_age_days) || 30)),
      last_auto_snapshot_at: parsed?.last_auto_snapshot_at || null,
      last_auto_snapshot_id: parsed?.last_auto_snapshot_id || null,
      last_pruned_count: Number(parsed?.last_pruned_count || 0),
      updated_by: row.updated_by || null,
      updated_at: row.updated_at || null
    };
  } catch {
    return def;
  }
}

export async function saveBackupRetentionPolicy(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);
  const current = await getBackupRetentionPolicy(env);
  const nowIso = new Date().toISOString();

  const next = {
    enabled: input.enabled !== undefined ? Boolean(input.enabled) : current.enabled,
    interval_hours: input.interval_hours !== undefined
      ? Math.max(1, Math.min(168, Number(input.interval_hours) || 24))
      : current.interval_hours,
    max_snapshots: input.max_snapshots !== undefined
      ? Math.max(1, Math.min(365, Number(input.max_snapshots) || 30))
      : current.max_snapshots,
    max_age_days: input.max_age_days !== undefined
      ? Math.max(1, Math.min(365, Number(input.max_age_days) || 30))
      : current.max_age_days,
    last_auto_snapshot_at: input.last_auto_snapshot_at !== undefined
      ? input.last_auto_snapshot_at
      : current.last_auto_snapshot_at,
    last_auto_snapshot_id: input.last_auto_snapshot_id !== undefined
      ? input.last_auto_snapshot_id
      : current.last_auto_snapshot_id,
    last_pruned_count: input.last_pruned_count !== undefined
      ? Number(input.last_pruned_count || 0)
      : current.last_pruned_count
  };

  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(BACKUP_POLICY_KEY, JSON.stringify(next), actorEmail || 'admin', nowIso).run();

  return { ...next, updated_by: actorEmail || 'admin', updated_at: nowIso };
}

// Prunes old `scheduled` snapshots exceeding `max_snapshots` or `max_age_days`.
// Never deletes `manual` or `pre_restore` snapshots automatically.
export async function pruneScheduledSnapshots(env, { maxSnapshots = 30, maxAgeDays = 30, nowMs = Date.now() } = {}) {
  if (!env || !env.DB) return { pruned_count: 0, pruned_ids: [] };
  if (!(await tableExists(env.DB, 'ops_snapshots'))) {
    return { pruned_count: 0, pruned_ids: [] };
  }

  const { results } = await env.DB.prepare(
    `SELECT id, r2_key, created_at, trigger_type
     FROM ops_snapshots
     WHERE trigger_type = 'scheduled'
     ORDER BY created_at DESC, rowid DESC`
  ).all();

  const scheduledRows = results || [];
  const cutoffMs = nowMs - Math.max(1, Number(maxAgeDays) || 30) * 86400 * 1000;
  const maxKeep = Math.max(1, Number(maxSnapshots) || 30);

  const toDelete = [];
  scheduledRows.forEach((row, idx) => {
    const createdMs = Date.parse(row.created_at);
    const overCount = idx >= maxKeep;
    const overAge = Number.isFinite(createdMs) && createdMs < cutoffMs;
    if (overCount || overAge) {
      toDelete.push(row);
    }
  });

  const prunedIds = [];
  for (const row of toDelete) {
    if (env.MEDIA && row.r2_key && typeof env.MEDIA.delete === 'function') {
      try { await env.MEDIA.delete(row.r2_key); } catch {}
    }
    await env.DB.prepare(`DELETE FROM ops_snapshots WHERE id = ? AND trigger_type = 'scheduled'`).bind(row.id).run();
    prunedIds.push(row.id);
  }

  return {
    pruned_count: prunedIds.length,
    pruned_ids: prunedIds
  };
}

// Invoked by Cron (`scheduled()` in _worker.js) or manually via "Run Policy Now" in the Admin Studio
export async function runScheduledBackupPolicy(env, { force = false, actorEmail = 'system:cron', nowMs = Date.now() } = {}) {
  if (!env || !env.DB) return { ok: false, skipped: true, reason: 'no_db' };
  const policy = await getBackupRetentionPolicy(env);

  if (!force && !policy.enabled) {
    return { ok: true, skipped: true, reason: 'policy_disabled', policy };
  }

  const lastMs = policy.last_auto_snapshot_at ? Date.parse(policy.last_auto_snapshot_at) : 0;
  const intervalMs = policy.interval_hours * 3600 * 1000;
  const isDue = force || !lastMs || !Number.isFinite(lastMs) || (nowMs - lastMs) >= intervalMs;

  if (!isDue) {
    return {
      ok: true,
      skipped: true,
      reason: 'interval_not_elapsed',
      next_due_at: new Date(lastMs + intervalMs).toISOString(),
      policy
    };
  }

  let createdSnapshot = null;
  if (env.MEDIA) {
    createdSnapshot = await createPlatformSnapshot(env, {
      label: `Automated Scheduled Backup (${policy.interval_hours}h policy)`,
      triggerType: 'scheduled',
      createdBy: actorEmail
    });
  }

  const pruneResult = await pruneScheduledSnapshots(env, {
    maxSnapshots: policy.max_snapshots,
    maxAgeDays: policy.max_age_days,
    nowMs
  });

  const updatedPolicy = await saveBackupRetentionPolicy(
    env,
    {
      ...policy,
      last_auto_snapshot_at: createdSnapshot ? createdSnapshot.created_at : new Date(nowMs).toISOString(),
      last_auto_snapshot_id: createdSnapshot ? createdSnapshot.id : policy.last_auto_snapshot_id,
      last_pruned_count: pruneResult.pruned_count
    },
    actorEmail
  );

  return {
    ok: true,
    skipped: false,
    created_snapshot: createdSnapshot,
    pruned_count: pruneResult.pruned_count,
    pruned_ids: pruneResult.pruned_ids,
    policy: updatedPolicy
  };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/ops/{schema|vacuum|forensics|retention}
// ============================================================================
export async function handleOpsHygiene(request, env, actor, subAction) {
  const method = request.method;
  const url = new URL(request.url);

  // Module #6: GET /api/admin/ops/schema
  if (subAction === 'schema') {
    if (method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    const report = await inspectDatabaseSchema(env);
    return json(report, 200, { 'Cache-Control': 'no-store' });
  }

  // Module #11: POST /api/admin/ops/vacuum
  if (subAction === 'vacuum') {
    if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    if (actor.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can run Dead-Letter Vacuum');
    }
    const body = await readJson(request, 10000).catch(() => ({}));
    const dryRun = Boolean(body.dry_run);
    const trimRevisions = body.trim_revisions !== undefined ? Boolean(body.trim_revisions) : true;
    const report = await runDeadLetterVacuum(env, {
      dryRun,
      trimRevisions,
      revisionKeepLimit: body.revision_keep_limit || 25
    });
    if (!dryRun) {
      await audit(env, request, actor, 'ops.vacuum.run', 'database', 'vacuum', {
        total_reclaimed: report.total_reclaimed,
        tables: report.tables
      });
    }
    return json(report, 200, { 'Cache-Control': 'no-store' });
  }

  // Module #13: GET /api/admin/ops/forensics
  if (subAction === 'forensics') {
    if (method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    const report = await inspectForensicAudit(env, {
      actionFilter: url.searchParams.get('action') || '',
      actorFilter: url.searchParams.get('actor') || '',
      limit: url.searchParams.get('limit') || 50
    });
    return json(report, 200, { 'Cache-Control': 'no-store' });
  }

  // Module #14: GET / POST /api/admin/ops/retention
  if (subAction === 'retention') {
    if (method === 'GET') {
      const policy = await getBackupRetentionPolicy(env);
      return json({ ok: true, policy }, 200, { 'Cache-Control': 'no-store' });
    }
    if (method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update backup retention policies');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      if (body.run_now) {
        if (body.enabled !== undefined || body.interval_hours !== undefined || body.max_snapshots !== undefined || body.max_age_days !== undefined) {
          await saveBackupRetentionPolicy(env, body, actor.email || actor.userId);
        }
        const execRes = await runScheduledBackupPolicy(env, {
          force: true,
          actorEmail: actor.email || actor.userId
        });
        await audit(env, request, actor, 'ops.retention.run', 'ops_snapshots', execRes.created_snapshot?.id || 'retention', {
          pruned_count: execRes.pruned_count,
          snapshot_id: execRes.created_snapshot?.id || null
        });
        return json(execRes, 200, { 'Cache-Control': 'no-store' });
      }

      const policy = await saveBackupRetentionPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.retention.update', 'site_settings', BACKUP_POLICY_KEY, {
        enabled: policy.enabled,
        interval_hours: policy.interval_hours,
        max_snapshots: policy.max_snapshots,
        max_age_days: policy.max_age_days
      });
      return json({ ok: true, policy }, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown ops hygiene endpoint');
}
