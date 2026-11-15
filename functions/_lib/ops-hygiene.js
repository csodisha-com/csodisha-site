// Operations Suite — Module #6 (Database Migration Version & DDL Schema Journal),
// Module #11 (Dead-Letter Message Vacuum & Retention Expiry Purge),
// Module #13 (Post-Incident Forensic Audit & State Diff Inspector),
// and Module #14 (Automated Daily Backup Schedule & Retention Policy).
import { HttpError, json, readJson } from './http.js';
import { audit } from './rbac.js';
import { createPlatformSnapshot, canonicalizeValue, collectPlatformSnapshotTables } from './ops-snapshots.js';

export const BACKUP_POLICY_KEY = 'ops_backup_policy';
export const RETENTION_POLICY_KEY = 'ops_retention_policy';
export const LAST_RETENTION_PRUNE_KEY = 'ops_last_retention_prune';

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
export async function ensureOpsDdlJournalTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS ops_ddl_journal (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       version_tag TEXT NOT NULL,
       schema_sha256 TEXT NOT NULL,
       table_count INTEGER NOT NULL DEFAULT 0,
       index_count INTEGER NOT NULL DEFAULT 0,
       trigger_count INTEGER NOT NULL DEFAULT 0,
       note TEXT NOT NULL DEFAULT '',
       diff_json TEXT NOT NULL DEFAULT '{}',
       snapshot_json TEXT NOT NULL DEFAULT '{}',
       created_by TEXT,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       updated_at TEXT
     )`
  ).run();
}

export async function inspectDatabaseSchema(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  const { results } = await env.DB.prepare(
    `SELECT type, name, tbl_name, sql
     FROM sqlite_master
     WHERE type IN ('table', 'index', 'trigger')
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '_cf_%'
     ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name ASC`
  ).all();

  const items = results || [];
  const tables = [];
  const indexes = [];
  const triggers = [];
  const canonicalLines = [];
  let totalRows = 0;

  for (const item of items) {
    const normSql = normalizeDdlSql(item.sql || '');

    if (item.type === 'table') {
      let rowCount = 0;
      let columns = [];
      const safeIdent = String(item.name).replace(/"/g, '""');
      try {
        const cRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM "${safeIdent}"`).first();
        rowCount = cRow && cRow.n !== undefined ? Number(cRow.n) : 0;
      } catch {
        rowCount = 0;
      }
      try {
        const cols = await env.DB.prepare(`PRAGMA table_info("${safeIdent}")`).all();
        columns = Array.isArray(cols.results)
          ? cols.results.map(c => ({
              name: String(c.name || ''),
              type: String(c.type || ''),
              notnull: Boolean(c.notnull),
              pk: Number(c.pk) || 0
            }))
          : [];
      } catch {
        columns = [];
      }
      const colSig = columns.map(c => `${c.name}:${c.type}:${c.notnull ? 1 : 0}:${c.pk}`).join(',');
      canonicalLines.push(`${item.type}:${item.name}:${normSql}:[${colSig}]`);
      totalRows += rowCount;
      tables.push({
        name: item.name,
        row_count: rowCount,
        column_count: columns.length,
        columns,
        ddl_sql: item.sql || '',
        normalized_ddl: normSql
      });
    } else if (item.type === 'index') {
      canonicalLines.push(`${item.type}:${item.name}:${normSql}`);
      indexes.push({
        name: item.name,
        table_name: item.tbl_name,
        ddl_sql: item.sql || '',
        normalized_ddl: normSql
      });
    } else if (item.type === 'trigger') {
      canonicalLines.push(`${item.type}:${item.name}:${normSql}`);
      triggers.push({
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
    live_schema_hash: schemaSha256,
    table_count: tables.length,
    index_count: indexes.length,
    trigger_count: triggers.length,
    total_rows: totalRows,
    tables,
    live_tables: tables,
    indexes,
    triggers,
    migrations
  };
}

function buildSchemaSnapshotMap(tables) {
  const out = {};
  for (const t of (tables || [])) {
    out[t.name] = {
      normalized_ddl: t.normalized_ddl || '',
      columns: (t.columns || []).map(c => `${c.name}:${c.type}:${c.notnull ? 1 : 0}:${c.pk}`)
    };
  }
  return out;
}

export function computeSchemaDiff(previousSnapshot, liveTables) {
  const prevTables = (previousSnapshot && previousSnapshot.tables) ? previousSnapshot.tables : {};
  const liveMap = buildSchemaSnapshotMap(liveTables);
  const added_tables = [];
  const removed_tables = [];
  const altered_tables = [];

  for (const name of Object.keys(liveMap).sort()) {
    if (!prevTables[name]) {
      added_tables.push(name);
    } else {
      const prevSig = `${prevTables[name].normalized_ddl || ''}|${(prevTables[name].columns || []).join(',')}`;
      const liveSig = `${liveMap[name].normalized_ddl || ''}|${(liveMap[name].columns || []).join(',')}`;
      if (prevSig !== liveSig) {
        altered_tables.push(name);
      }
    }
  }
  for (const name of Object.keys(prevTables).sort()) {
    if (!liveMap[name]) {
      removed_tables.push(name);
    }
  }
  return { added_tables, removed_tables, altered_tables };
}

function presentDdlJournalRow(row) {
  let diff = { added_tables: [], removed_tables: [], altered_tables: [] };
  try {
    if (row.diff_json) diff = JSON.parse(row.diff_json);
  } catch {}
  return {
    id: Number(row.id),
    version_tag: row.version_tag,
    schema_sha256: row.schema_sha256,
    table_count: Number(row.table_count) || 0,
    index_count: Number(row.index_count) || 0,
    trigger_count: Number(row.trigger_count) || 0,
    note: row.note || '',
    diff,
    created_by: row.created_by || 'admin',
    created_at: row.created_at,
    updated_at: row.updated_at || null
  };
}

export async function getDdlJournalReport(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureOpsDdlJournalTable(env.DB);
  const schema = await inspectDatabaseSchema(env);

  const { results } = await env.DB.prepare(
    `SELECT id, version_tag, schema_sha256, table_count, index_count, trigger_count, note, diff_json, snapshot_json, created_by, created_at, updated_at
     FROM ops_ddl_journal
     ORDER BY id DESC
     LIMIT 50`
  ).all();

  const rows = results || [];
  const journal_history = rows.map(presentDdlJournalRow);
  const latestRow = rows[0] || null;
  const latest_checkpoint = latestRow ? journal_history[0] : null;
  const baseline_missing = !latestRow;

  let prevSnapshot = null;
  if (latestRow && latestRow.snapshot_json) {
    try { prevSnapshot = JSON.parse(latestRow.snapshot_json); } catch {}
  }

  const pending_diff = latestRow
    ? computeSchemaDiff(prevSnapshot, schema.tables)
    : {
        added_tables: schema.tables.map(t => t.name),
        removed_tables: [],
        altered_tables: []
      };

  const drift_detected = latestRow
    ? latestRow.schema_sha256 !== schema.schema_sha256
    : true;

  return {
    ...schema,
    drift_detected,
    baseline_missing,
    latest_checkpoint,
    journal_history,
    pending_diff
  };
}

export async function recordDdlCheckpoint(env, { version_tag, note = '', actorEmail = 'admin' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureOpsDdlJournalTable(env.DB);

  const cleanTag = String(version_tag || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 64);
  if (!cleanTag) {
    throw new HttpError(400, 'MISSING_VERSION_TAG', 'version_tag is required (e.g. v1.0.0-baseline)');
  }
  const cleanNote = String(note || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 400);

  const current = await getDdlJournalReport(env);
  const snapshotObj = { tables: buildSchemaSnapshotMap(current.tables) };
  const nowIso = new Date().toISOString();

  const ins = await env.DB.prepare(
    `INSERT INTO ops_ddl_journal
       (version_tag, schema_sha256, table_count, index_count, trigger_count, note, diff_json, snapshot_json, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    cleanTag,
    current.schema_sha256,
    current.table_count,
    current.index_count,
    current.trigger_count,
    cleanNote,
    JSON.stringify(current.pending_diff),
    JSON.stringify(snapshotObj),
    actorEmail || 'admin',
    nowIso
  ).run();

  const createdId = Number(ins && ins.meta && ins.meta.last_row_id) || null;
  const updatedReport = await getDdlJournalReport(env);
  const created = createdId
    ? updatedReport.journal_history.find(j => j.id === createdId) || updatedReport.latest_checkpoint
    : updatedReport.latest_checkpoint;

  return {
    ok: true,
    checkpoint: created,
    report: updatedReport
  };
}

export async function updateDdlCheckpoint(env, id, { version_tag, note } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureOpsDdlJournalTable(env.DB);

  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    throw new HttpError(400, 'INVALID_CHECKPOINT_ID', 'Checkpoint id must be a positive integer');
  }
  const existing = await env.DB.prepare(
    `SELECT id, version_tag, note FROM ops_ddl_journal WHERE id = ?`
  ).bind(numId).first();
  if (!existing) {
    throw new HttpError(404, 'CHECKPOINT_NOT_FOUND', `DDL checkpoint #${numId} not found`);
  }

  const nextTag = version_tag !== undefined
    ? String(version_tag || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 64)
    : existing.version_tag;
  if (!nextTag) {
    throw new HttpError(400, 'MISSING_VERSION_TAG', 'version_tag cannot be empty');
  }
  const nextNote = note !== undefined
    ? String(note || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 400)
    : (existing.note || '');
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE ops_ddl_journal SET version_tag = ?, note = ?, updated_at = ? WHERE id = ?`
  ).bind(nextTag, nextNote, nowIso, numId).run();

  const updated = await env.DB.prepare(
    `SELECT id, version_tag, schema_sha256, table_count, index_count, trigger_count, note, diff_json, created_by, created_at, updated_at
     FROM ops_ddl_journal WHERE id = ?`
  ).bind(numId).first();

  return {
    ok: true,
    checkpoint: presentDdlJournalRow(updated)
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

export const VACUUM_LAST_RUN_KEY = 'ops_last_vacuum';

export function normalizeRetentionDays(raw) {
  if (raw === undefined || raw === null || raw === '') return 90;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 7 || n > 365) {
    throw new HttpError(400, 'INVALID_RETENTION_DAYS', 'retention_days must be an integer between 7 and 365');
  }
  return n;
}

export async function readLastVacuumRun(env) {
  try {
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(VACUUM_LAST_RUN_KEY).first();
    return row && row.value_json ? JSON.parse(row.value_json) : null;
  } catch {
    return null;
  }
}

export async function runDeadLetterVacuum(env, { dryRun = false, trimRevisions = true, revisionKeepLimit = 25, retentionDays = 90, actorEmail = 'admin' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  const isDryRun = Boolean(dryRun);
  const retDays = normalizeRetentionDays(retentionDays);
  const retentionModifier = `-${retDays} days`;
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
    site_page_revisions: 0,
    orphaned_revisions: 0,
    audit_log: 0
  };
  const tablesPresent = {};

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

  // 5. Orphaned site_page_revisions: route no longer exists in site_pages AND older than retention window
  const hasRevisions = await tableExists(env.DB, 'site_page_revisions');
  const hasPages = await tableExists(env.DB, 'site_pages');
  tablesPresent.site_page_revisions = hasRevisions;
  if (hasRevisions && hasPages) {
    const whereOrphan = `route NOT IN (SELECT route FROM site_pages WHERE route IS NOT NULL)
      AND created_at < datetime('now', ?)`;
    if (isDryRun) {
      // Exclude rows already counted in the keep-limit trim so the preview never double-counts
      const excl = doTrimRevs
        ? ` AND id IN (SELECT r2.id FROM site_page_revisions r2 WHERE r2.id IN (
              SELECT r3.id FROM site_page_revisions r3 WHERE r3.route = r2.route ORDER BY r3.id DESC LIMIT ?))`
        : '';
      const binds = doTrimRevs ? [retentionModifier, keepLimit] : [retentionModifier];
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM site_page_revisions WHERE ${whereOrphan}${excl}`).bind(...binds).first();
      breakdown.orphaned_revisions = Number(r?.n || 0);
    } else {
      const r = await env.DB.prepare(`DELETE FROM site_page_revisions WHERE ${whereOrphan}`).bind(retentionModifier).run();
      breakdown.orphaned_revisions = Number(r?.meta?.changes || 0);
    }
  }

  // 6. audit_log entries older than retention_days (minimum 7 days preserves recent forensic trail)
  const hasAudit = await tableExists(env.DB, 'audit_log');
  tablesPresent.audit_log = hasAudit;
  if (hasAudit) {
    const whereAudit = `created_at < datetime('now', ?)`;
    if (isDryRun) {
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE ${whereAudit}`).bind(retentionModifier).first();
      breakdown.audit_log = Number(r?.n || 0);
    } else {
      const r = await env.DB.prepare(`DELETE FROM audit_log WHERE ${whereAudit}`).bind(retentionModifier).run();
      breakdown.audit_log = Number(r?.meta?.changes || 0);
    }
  }

  for (const t of ['admin_otps', 'sessions', 'admin_rate_limits']) {
    tablesPresent[t] = await tableExists(env.DB, t);
  }

  const totalReclaimed =
    breakdown.admin_otps +
    breakdown.sessions +
    breakdown.admin_rate_limits +
    breakdown.site_page_revisions +
    breakdown.orphaned_revisions +
    breakdown.audit_log;

  // Rough reclaimable estimate (~256 bytes avg per row, D1/SQLite page overhead included)
  const report = {
    ok: true,
    dry_run: isDryRun,
    retention_days: retDays,
    trim_revisions: doTrimRevs,
    revision_keep_limit: keepLimit,
    total_reclaimed: totalReclaimed,
    estimated_reclaimable_bytes: totalReclaimed * 256,
    tables: breakdown,
    tables_present: tablesPresent,
    executed_at: nowIso,
    executed_by: actorEmail || 'admin'
  };

  if (!isDryRun) {
    try {
      await ensureSiteSettingsTable(env.DB);
      await env.DB.prepare(
        `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`
      ).bind(VACUUM_LAST_RUN_KEY, JSON.stringify(report), report.executed_by, nowIso).run();
    } catch (e) {
      report.persist_warning = 'Vacuum executed but last-run telemetry could not be persisted: ' + (e && e.message ? e.message : 'unknown error');
    }
  }
  return report;
}

// ============================================================================
// Module #13: Post-Incident Forensic Audit & State Diff Inspector
// ============================================================================
const FORENSIC_REDACT_KEYS = new Set([
  'password_hash',
  'salt',
  'code_hash',
  'totp_secret',
  'password',
  'token',
  'session_token',
  'access_token',
  'refresh_token',
  'otp',
  'otp_code',
  'api_key',
  'private_key',
  'secret',
  'authorization',
  'cookie'
]);

async function ensureAuditLogTable(db) {
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

export function redactForensicPayload(val) {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(redactForensicPayload);
  const out = {};
  for (const k of Object.keys(val)) {
    if (FORENSIC_REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED_DPDP]';
    } else {
      out[k] = redactForensicPayload(val[k]);
    }
  }
  return out;
}

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
  const meta = redactForensicPayload(parseJsonObjectSafe(rawMetadata) || {});
  const beforeCandidate = meta.before_json ?? meta.before ?? meta.previous ?? (meta.from !== undefined ? { value: meta.from } : null);
  const afterCandidate = meta.after_json ?? meta.after ?? meta.current ?? (meta.to !== undefined ? { value: meta.to } : null);

  const beforeObj = parseJsonObjectSafe(beforeCandidate);
  const afterObj = parseJsonObjectSafe(afterCandidate);

  if (beforeObj || afterObj) {
    const b = redactForensicPayload(beforeObj || {});
    const a = redactForensicPayload(afterObj || {});
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

export async function inspectForensicAudit(env, {
  actionFilter = '',
  actionPrefix = '',
  actorFilter = '',
  q = '',
  limit = 25,
  offset = 0
} = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  await ensureAuditLogTable(env.DB);

  const cleanLimit = Math.max(1, Math.min(100, Number(limit) || 25));
  const cleanOffset = Math.max(0, Number(offset) || 0);
  const where = ['1=1'];
  const binds = [];

  const cleanAction = String(actionPrefix || actionFilter || '').trim().slice(0, 80);
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

  const cleanQ = String(q || '').trim().slice(0, 120);
  if (cleanQ) {
    const likeQ = `%${cleanQ}%`;
    where.push(`(a.action LIKE ? OR a.target_type LIKE ? OR a.target_id LIKE ? OR a.metadata_json LIKE ?)`);
    binds.push(likeQ, likeQ, likeQ, likeQ);
  }

  const joinClause = hasUsers ? 'LEFT JOIN users u ON u.id = a.actor_user_id' : '';
  const whereSql = where.join(' AND ');

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM audit_log a ${joinClause} WHERE ${whereSql}`
  ).bind(...binds).first();
  const totalMatching = Number(countRow && countRow.n) || 0;

  let uniqueActors = 0;
  let last24hCount = 0;
  try {
    const [uaRow, h24Row] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(DISTINCT actor_user_id) AS n FROM audit_log`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE created_at >= datetime('now', '-1 day')`).first()
    ]);
    uniqueActors = Number(uaRow && uaRow.n) || 0;
    last24hCount = Number(h24Row && h24Row.n) || 0;
  } catch {}

  const sql = hasUsers
    ? `SELECT a.id, a.actor_user_id, a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at, u.email AS actor_email
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE ${whereSql}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`
    : `SELECT a.id, a.actor_user_id, a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at, a.actor_user_id AS actor_email
       FROM audit_log a
       WHERE ${whereSql}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`;

  const { results } = await env.DB.prepare(sql).bind(...binds, cleanLimit, cleanOffset).all();
  const items = (results || []).map(row => {
    const rawParsed = parseJsonObjectSafe(row.metadata_json) || {};
    const redactedMeta = redactForensicPayload(rawParsed);
    const diff = computeForensicDiff(redactedMeta);
    return {
      id: row.id,
      action: row.action,
      actor_user_id: row.actor_user_id,
      actor_email: row.actor_email || row.actor_user_id || 'system',
      target_type: row.target_type,
      target_id: row.target_id,
      ip_address: row.ip_address,
      created_at: row.created_at,
      metadata: redactedMeta,
      detail_json: JSON.stringify(redactedMeta),
      diff
    };
  });

  return {
    ok: true,
    total: totalMatching,
    page_count: items.length,
    limit: cleanLimit,
    offset: cleanOffset,
    unique_actors: uniqueActors,
    last_24h_count: last24hCount,
    dpdp_redacted: true,
    items
  };
}

function csvCell(val) {
  const s = String(val === null || val === undefined ? '' : val);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function formatForensicAuditCsv(items) {
  const header = 'id,created_at,actor_email,action,target_type,target_id,ip_address,change_count';
  const rows = (items || []).map(it => [
    csvCell(it.id),
    csvCell(it.created_at),
    csvCell(it.actor_email),
    csvCell(it.action),
    csvCell(it.target_type || ''),
    csvCell(it.target_id || ''),
    csvCell(it.ip_address || ''),
    csvCell(it.diff && it.diff.change_count !== undefined ? it.diff.change_count : 0)
  ].join(','));
  return [header, ...rows].join('\n');
}

async function loadSnapshotTablesForDiff(env, snapId) {
  const cleanId = String(snapId || '').trim();
  if (!cleanId || cleanId === 'LIVE_D1') {
    const live = await collectPlatformSnapshotTables(env);
    return { id: 'LIVE_D1', label: 'Live Cloudflare D1 Database', tables: live.tables || {} };
  }
  const row = await env.DB.prepare(`SELECT id, label, r2_key, created_at FROM ops_snapshots WHERE id = ?`).bind(cleanId).first();
  if (!row) throw new HttpError(404, 'SNAPSHOT_NOT_FOUND', `Snapshot "${cleanId}" not found`);
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 storage unavailable');
  const obj = await env.MEDIA.get(row.r2_key);
  if (!obj) throw new HttpError(404, 'MISSING_R2_OBJECT', `R2 blob missing for snapshot "${cleanId}"`);
  const parsed = JSON.parse(new TextDecoder().decode(await obj.arrayBuffer()));
  return {
    id: row.id,
    label: row.label,
    created_at: row.created_at,
    tables: parsed.tables || (parsed.payload && parsed.payload.tables) || {}
  };
}

function rowDiffKey(row) {
  if (!row || typeof row !== 'object') return String(row);
  if (row.id !== undefined && row.id !== null) return 'id:' + String(row.id);
  if (row.key !== undefined && row.key !== null) return 'key:' + String(row.key);
  if (row.slug !== undefined && row.slug !== null) return 'slug:' + String(row.slug);
  return JSON.stringify(canonicalizeValue(row));
}

export async function compareForensicSnapshots(env, { snapshotA, snapshotB = 'LIVE_D1' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  if (!String(snapshotA || '').trim()) {
    throw new HttpError(400, 'MISSING_SNAPSHOT_A', 'snapshot_a is required');
  }
  const [a, b] = await Promise.all([
    loadSnapshotTablesForDiff(env, snapshotA),
    loadSnapshotTablesForDiff(env, snapshotB || 'LIVE_D1')
  ]);

  const tableNames = [...new Set([...Object.keys(a.tables || {}), ...Object.keys(b.tables || {})])].sort();
  const table_diffs = [];
  let total_changes = 0;

  for (const tbl of tableNames) {
    const rowsA = Array.isArray(a.tables[tbl]) ? a.tables[tbl] : [];
    const rowsB = Array.isArray(b.tables[tbl]) ? b.tables[tbl] : [];
    const mapA = new Map();
    const mapB = new Map();
    for (const r of rowsA) mapA.set(rowDiffKey(r), redactForensicPayload(r));
    for (const r of rowsB) mapB.set(rowDiffKey(r), redactForensicPayload(r));

    const allKeys = [...new Set([...mapA.keys(), ...mapB.keys()])].sort();
    let added_rows = 0;
    let removed_rows = 0;
    let modified_rows = 0;
    let unchanged_rows = 0;
    const sample_diffs = [];

    for (const k of allKeys) {
      const ra = mapA.get(k);
      const rb = mapB.get(k);
      if (!ra && rb) {
        added_rows++;
        if (sample_diffs.length < 20) sample_diffs.push({ key: k, kind: 'added', after: rb });
      } else if (ra && !rb) {
        removed_rows++;
        if (sample_diffs.length < 20) sample_diffs.push({ key: k, kind: 'removed', before: ra });
      } else {
        const canonA = JSON.stringify(canonicalizeValue(ra));
        const canonB = JSON.stringify(canonicalizeValue(rb));
        if (canonA === canonB) {
          unchanged_rows++;
        } else {
          modified_rows++;
          if (sample_diffs.length < 20) sample_diffs.push({ key: k, kind: 'modified', before: ra, after: rb });
        }
      }
    }

    total_changes += added_rows + removed_rows + modified_rows;
    table_diffs.push({
      table: tbl,
      rows_a: rowsA.length,
      rows_b: rowsB.length,
      added_rows,
      removed_rows,
      modified_rows,
      unchanged_rows,
      sample_diffs
    });
  }

  return {
    ok: true,
    snapshot_a: { id: a.id, label: a.label },
    snapshot_b: { id: b.id, label: b.label },
    tables_compared: tableNames.length,
    total_changes,
    table_diffs
  };
}

// ============================================================================
// Module #14: Automated Daily Backup Schedule & Retention Policy
// ============================================================================
export function defaultBackupPolicy() {
  return {
    enabled: false,
    auto_prune_enabled: false,
    interval_hours: 24,
    max_snapshots: 30,
    max_total_snapshots: 30,
    max_age_days: 30,
    keep_daily_days: 30,
    keep_weekly_count: 12,
    keep_monthly_count: 12,
    protect_worm_locked: true,
    last_auto_snapshot_at: null,
    last_auto_snapshot_id: null,
    last_pruned_count: 0
  };
}

export async function getBackupRetentionPolicy(env) {
  const def = defaultBackupPolicy();
  if (!env || !env.DB) return def;
  try {
    await ensureSiteSettingsTable(env.DB);
    const [retRow, bakRow] = await Promise.all([
      env.DB.prepare(`SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`).bind(RETENTION_POLICY_KEY).first(),
      env.DB.prepare(`SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`).bind(BACKUP_POLICY_KEY).first()
    ]);
    const row = (retRow && retRow.value_json) ? retRow : bakRow;
    if (!row || !row.value_json) return def;
    const parsed = JSON.parse(row.value_json);
    const keepDailyDays = Math.max(1, Math.min(3650, Number(parsed?.keep_daily_days ?? parsed?.max_age_days) || 30));
    const maxTotal = Math.max(1, Math.min(500, Number(parsed?.max_total_snapshots ?? parsed?.max_snapshots) || 30));
    const autoPrune = Boolean(parsed && (parsed.auto_prune_enabled !== undefined ? parsed.auto_prune_enabled : parsed.enabled));
    return {
      enabled: autoPrune,
      auto_prune_enabled: autoPrune,
      interval_hours: Math.max(1, Math.min(168, Number(parsed?.interval_hours) || 24)),
      max_snapshots: maxTotal,
      max_total_snapshots: maxTotal,
      max_age_days: keepDailyDays,
      keep_daily_days: keepDailyDays,
      keep_weekly_count: Math.max(0, Math.min(520, Number(parsed?.keep_weekly_count ?? 12))),
      keep_monthly_count: Math.max(0, Math.min(120, Number(parsed?.keep_monthly_count ?? 12))),
      protect_worm_locked: true,
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

  if (input.keep_daily_days !== undefined) {
    const d = Number(input.keep_daily_days);
    if (!Number.isInteger(d) || d < 1 || d > 3650) {
      throw new HttpError(400, 'INVALID_KEEP_DAYS', 'keep_daily_days must be between 1 and 3650');
    }
  }
  if (input.max_total_snapshots !== undefined) {
    const m = Number(input.max_total_snapshots);
    if (!Number.isInteger(m) || m < 1 || m > 500) {
      throw new HttpError(400, 'INVALID_MAX_SNAPSHOTS', 'max_total_snapshots must be between 1 and 500');
    }
  }

  const autoPrune = input.auto_prune_enabled !== undefined
    ? Boolean(input.auto_prune_enabled)
    : (input.enabled !== undefined ? Boolean(input.enabled) : current.auto_prune_enabled);
  const keepDailyDays = input.keep_daily_days !== undefined
    ? Number(input.keep_daily_days)
    : (input.max_age_days !== undefined ? Math.max(1, Math.min(3650, Number(input.max_age_days) || 30)) : current.keep_daily_days);
  const maxTotal = input.max_total_snapshots !== undefined
    ? Number(input.max_total_snapshots)
    : (input.max_snapshots !== undefined ? Math.max(1, Math.min(500, Number(input.max_snapshots) || 30)) : current.max_total_snapshots);
  const keepWeekly = input.keep_weekly_count !== undefined
    ? Math.max(0, Math.min(520, Number(input.keep_weekly_count) || 0))
    : current.keep_weekly_count;
  const keepMonthly = input.keep_monthly_count !== undefined
    ? Math.max(0, Math.min(120, Number(input.keep_monthly_count) || 0))
    : current.keep_monthly_count;

  const next = {
    enabled: autoPrune,
    auto_prune_enabled: autoPrune,
    interval_hours: input.interval_hours !== undefined
      ? Math.max(1, Math.min(168, Number(input.interval_hours) || 24))
      : current.interval_hours,
    max_snapshots: maxTotal,
    max_total_snapshots: maxTotal,
    max_age_days: keepDailyDays,
    keep_daily_days: keepDailyDays,
    keep_weekly_count: keepWeekly,
    keep_monthly_count: keepMonthly,
    protect_worm_locked: true,
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

  const upsertSql = `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`;
  const actor = actorEmail || 'admin';
  await Promise.all([
    env.DB.prepare(upsertSql).bind(BACKUP_POLICY_KEY, JSON.stringify(next), actor, nowIso).run(),
    env.DB.prepare(upsertSql).bind(RETENTION_POLICY_KEY, JSON.stringify(next), actor, nowIso).run()
  ]);

  return { ...next, updated_by: actor, updated_at: nowIso };
}

async function readLastRetentionPrune(env) {
  if (!env || !env.DB) return null;
  try {
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(LAST_RETENTION_PRUNE_KEY).first();
    return row && row.value_json ? JSON.parse(row.value_json) : null;
  } catch {
    return null;
  }
}

export async function evaluateRetentionCandidates(env, policyOverride = null, { nowMs = Date.now() } = {}) {
  const policy = policyOverride || await getBackupRetentionPolicy(env);
  if (!env || !env.DB || !(await tableExists(env.DB, 'ops_snapshots'))) {
    return {
      ok: true,
      total_snapshots: 0,
      worm_protected_count: 0,
      pinned_count: 0,
      policy_kept_count: 0,
      prunable_count: 0,
      reclaimable_bytes: 0,
      candidates: []
    };
  }

  // Backward compatible if legacy test ops_snapshots schema lacks immutable_until / vault_tier
  let hasWormCols = false;
  try {
    const cols = await env.DB.prepare(`PRAGMA table_info("ops_snapshots")`).all();
    hasWormCols = (cols.results || []).some(c => c.name === 'immutable_until');
  } catch {}

  const sql = hasWormCols
    ? `SELECT id, label, r2_key, size_bytes, trigger_type, created_at, immutable_until, vault_tier
       FROM ops_snapshots ORDER BY created_at DESC, rowid DESC`
    : `SELECT id, label, r2_key, size_bytes, trigger_type, created_at
       FROM ops_snapshots ORDER BY created_at DESC, rowid DESC`;
  const { results } = await env.DB.prepare(sql).all();
  const rows = results || [];
  const cutoffMs = nowMs - Math.max(1, Number(policy.keep_daily_days ?? policy.max_age_days) || 30) * 86400 * 1000;
  const maxKeep = Math.max(1, Number(policy.max_total_snapshots ?? policy.max_snapshots) || 30);

  let scheduledIdx = 0;
  let wormProtected = 0;
  let pinnedCount = 0;
  let policyKept = 0;
  let prunableCount = 0;
  let reclaimableBytes = 0;
  const candidates = [];

  for (const row of rows) {
    const sizeBytes = Number(row.size_bytes) || 0;
    const isWorm = Boolean(
      (row.immutable_until && Date.parse(row.immutable_until) > nowMs) ||
      row.vault_tier === 'cold_immutable'
    );
    let decision = 'KEEP_POLICY';
    let isProtected = true;
    let reason = 'Within retention window';

    if (isWorm) {
      decision = 'KEEP_WORM';
      isProtected = true;
      reason = 'WORM immutability lock active';
      wormProtected++;
    } else if (row.trigger_type === 'pre_restore' || row.trigger_type === 'manual') {
      decision = 'KEEP_PINNED';
      isProtected = true;
      reason = 'Pinned manual / pre-restore safety snapshot';
      pinnedCount++;
    } else {
      const createdMs = Date.parse(row.created_at);
      const overCount = scheduledIdx >= maxKeep;
      const overAge = Number.isFinite(createdMs) && createdMs < cutoffMs;
      scheduledIdx++;
      if (overCount || overAge) {
        decision = 'PRUNE';
        isProtected = false;
        reason = overCount ? 'Exceeds max_total_snapshots' : 'Older than keep_daily_days';
        prunableCount++;
        reclaimableBytes += sizeBytes;
      } else {
        policyKept++;
      }
    }

    candidates.push({
      id: row.id,
      label: row.label,
      r2_key: row.r2_key,
      size_bytes: sizeBytes,
      trigger_type: row.trigger_type,
      created_at: row.created_at,
      immutable_until: row.immutable_until || null,
      decision,
      protected: isProtected,
      reason
    });
  }

  return {
    ok: true,
    total_snapshots: candidates.length,
    worm_protected_count: wormProtected,
    pinned_count: pinnedCount,
    policy_kept_count: policyKept,
    prunable_count: prunableCount,
    reclaimable_bytes: reclaimableBytes,
    candidates
  };
}

export async function executeRetentionPrune(env, { dryRun = true, confirm = '', actorEmail = 'admin', nowMs = Date.now() } = {}) {
  const preview = await evaluateRetentionCandidates(env, null, { nowMs });
  if (dryRun !== false) {
    return { ...preview, dry_run: true };
  }
  if (String(confirm || '').trim() !== 'PRUNE') {
    throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Type PRUNE in the confirmation field to execute retention pruning');
  }

  const pruned_ids = [];
  let reclaimed_bytes = 0;
  for (const c of preview.candidates) {
    if (c.decision !== 'PRUNE' || c.protected) continue;
    if (env.MEDIA && c.r2_key && typeof env.MEDIA.delete === 'function') {
      try { await env.MEDIA.delete(c.r2_key); } catch {}
    }
    await env.DB.prepare(`DELETE FROM ops_snapshots WHERE id = ? AND trigger_type = 'scheduled'`).bind(c.id).run();
    pruned_ids.push(c.id);
    reclaimed_bytes += Number(c.size_bytes) || 0;
  }

  const nowIso = new Date().toISOString();
  const res = {
    ok: true,
    dry_run: false,
    pruned_count: pruned_ids.length,
    pruned_ids,
    reclaimed_bytes,
    worm_skipped_count: preview.worm_protected_count,
    executed_at: nowIso,
    executed_by: actorEmail || 'admin'
  };

  try {
    await ensureSiteSettingsTable(env.DB);
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(LAST_RETENTION_PRUNE_KEY, JSON.stringify(res), res.executed_by, nowIso).run();
  } catch {}

  return res;
}

// Prunes old `scheduled` snapshots exceeding `max_snapshots` or `max_age_days`.
// Never deletes `manual` or `pre_restore` snapshots automatically.
export async function pruneScheduledSnapshots(env, { maxSnapshots = 30, maxAgeDays = 30, nowMs = Date.now() } = {}) {
  if (!env || !env.DB) return { pruned_count: 0, pruned_ids: [] };
  if (!(await tableExists(env.DB, 'ops_snapshots'))) {
    return { pruned_count: 0, pruned_ids: [] };
  }

  let hasWormCols = false;
  try {
    const cols = await env.DB.prepare(`PRAGMA table_info("ops_snapshots")`).all();
    hasWormCols = (cols.results || []).some(c => c.name === 'immutable_until');
  } catch {}

  const { results } = await env.DB.prepare(
    hasWormCols
      ? `SELECT id, r2_key, created_at, trigger_type, immutable_until, vault_tier
         FROM ops_snapshots
         WHERE trigger_type = 'scheduled'
         ORDER BY created_at DESC, rowid DESC`
      : `SELECT id, r2_key, created_at, trigger_type
         FROM ops_snapshots
         WHERE trigger_type = 'scheduled'
         ORDER BY created_at DESC, rowid DESC`
  ).all();

  const scheduledRows = results || [];
  const cutoffMs = nowMs - Math.max(1, Number(maxAgeDays) || 30) * 86400 * 1000;
  const maxKeep = Math.max(1, Number(maxSnapshots) || 30);

  const toDelete = [];
  let activeIdx = 0;
  scheduledRows.forEach((row) => {
    const isWorm = Boolean(
      (row.immutable_until && Date.parse(row.immutable_until) > nowMs) ||
      row.vault_tier === 'cold_immutable'
    );
    if (isWorm) return;
    const createdMs = Date.parse(row.created_at);
    const overCount = activeIdx >= maxKeep;
    const overAge = Number.isFinite(createdMs) && createdMs < cutoffMs;
    activeIdx++;
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
export async function handleOpsHygiene(request, env, actor, subAction, subId) {
  const method = request.method;
  const url = new URL(request.url);

  // Module #6: GET/POST /api/admin/ops/ddl-journal, PATCH /api/admin/ops/ddl-journal/:id, and GET /api/admin/ops/schema
  if (subAction === 'schema' || subAction === 'ddl-journal') {
    if (!subId && method === 'GET') {
      const report = await getDdlJournalReport(env);
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can record DDL schema checkpoints');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const res = await recordDdlCheckpoint(env, {
        version_tag: body && body.version_tag,
        note: body && body.note,
        actorEmail: actor.email || actor.userId
      });
      await audit(env, request, actor, 'ops.ddl.checkpoint', 'ops_ddl_journal', String(res.checkpoint.id), {
        version_tag: res.checkpoint.version_tag,
        schema_sha256: res.checkpoint.schema_sha256,
        table_count: res.checkpoint.table_count,
        diff: res.checkpoint.diff
      });
      return json(res, 201, { 'Cache-Control': 'no-store' });
    }
    if (subId && (method === 'PATCH' || method === 'PUT')) {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can edit DDL schema checkpoints');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const res = await updateDdlCheckpoint(env, subId, {
        version_tag: body && body.version_tag,
        note: body && body.note
      });
      await audit(env, request, actor, 'ops.ddl.update', 'ops_ddl_journal', String(res.checkpoint.id), {
        version_tag: res.checkpoint.version_tag,
        note: res.checkpoint.note
      });
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #11: GET (dry-run preview + last run) / POST /api/admin/ops/vacuum
  if (subAction === 'vacuum') {
    if (method === 'GET') {
      const preview = await runDeadLetterVacuum(env, {
        dryRun: true,
        trimRevisions: url.searchParams.get('trim_revisions') !== '0',
        revisionKeepLimit: url.searchParams.get('revision_keep_limit') || 25,
        retentionDays: url.searchParams.get('retention_days') || 90
      });
      const last_vacuum = await readLastVacuumRun(env);
      return json({ ...preview, last_vacuum }, 200, { 'Cache-Control': 'no-store' });
    }
    if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    if (actor.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can run Dead-Letter Vacuum');
    }
    const body = await readJson(request, 10000).catch(() => ({}));
    // Safe default: anything other than an explicit dry_run:false is a non-destructive preview
    const dryRun = body.dry_run !== false;
    if (!dryRun) {
      const confirmVal = String((body.confirm !== undefined ? body.confirm : body.confirm_phrase) || '').trim();
      if (confirmVal !== 'VACUUM') {
        throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Type VACUUM in the confirmation field to permanently purge dead-letter rows');
      }
    }
    const trimRevisions = body.trim_revisions !== undefined ? Boolean(body.trim_revisions) : true;
    const report = await runDeadLetterVacuum(env, {
      dryRun,
      trimRevisions,
      revisionKeepLimit: body.revision_keep_limit || 25,
      retentionDays: body.retention_days,
      actorEmail: actor.email || actor.userId
    });
    if (!dryRun) {
      await audit(env, request, actor, 'ops.vacuum.execute', 'database', 'vacuum', {
        total_reclaimed: report.total_reclaimed,
        retention_days: report.retention_days,
        tables: report.tables
      });
    }
    const last_vacuum = await readLastVacuumRun(env);
    return json({ ...report, last_vacuum }, 200, { 'Cache-Control': 'no-store' });
  }

  // Module #13: GET /api/admin/ops/forensics and POST /api/admin/ops/forensics/diff
  if (subAction === 'forensics') {
    if (subId === 'diff' && method === 'POST') {
      const body = await readJson(request, 20000).catch(() => ({}));
      const report = await compareForensicSnapshots(env, {
        snapshotA: body && body.snapshot_a,
        snapshotB: body && body.snapshot_b ? body.snapshot_b : 'LIVE_D1'
      });
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'GET') {
      const format = url.searchParams.get('format') || 'json';
      const report = await inspectForensicAudit(env, {
        actionPrefix: url.searchParams.get('action_prefix') || url.searchParams.get('action') || '',
        actorFilter: url.searchParams.get('actor') || '',
        q: url.searchParams.get('q') || '',
        limit: url.searchParams.get('limit') || 25,
        offset: url.searchParams.get('offset') || 0
      });
      if (format === 'csv') {
        const csv = formatForensicAuditCsv(report.items);
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="cso-forensic-audit.csv"',
            'Cache-Control': 'no-store'
          }
        });
      }
      if (url.searchParams.get('download') === '1') {
        return new Response(JSON.stringify(report, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': 'attachment; filename="cso-forensic-audit.json"',
            'Cache-Control': 'no-store'
          }
        });
      }
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #14: GET / PUT /api/admin/ops/retention and POST /api/admin/ops/retention[/prune]
  if (subAction === 'retention') {
    if (!subId && method === 'GET') {
      const policy = await getBackupRetentionPolicy(env);
      const [preview, last_prune] = await Promise.all([
        evaluateRetentionCandidates(env, policy),
        readLastRetentionPrune(env)
      ]);
      return json({ ok: true, policy, preview, last_prune }, 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'PUT') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update backup retention policies');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const policy = await saveBackupRetentionPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.retention.policy.update', 'site_settings', RETENTION_POLICY_KEY, {
        keep_daily_days: policy.keep_daily_days,
        keep_weekly_count: policy.keep_weekly_count,
        keep_monthly_count: policy.keep_monthly_count,
        max_total_snapshots: policy.max_total_snapshots,
        auto_prune_enabled: policy.auto_prune_enabled
      });
      const preview = await evaluateRetentionCandidates(env, policy);
      return json({ ok: true, policy, preview }, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId === 'prune' && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can execute retention pruning');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const dryRun = body.dry_run !== false;
      const result = await executeRetentionPrune(env, {
        dryRun,
        confirm: body.confirm !== undefined ? body.confirm : body.confirm_phrase,
        actorEmail: actor.email || actor.userId
      });
      if (!dryRun) {
        await audit(env, request, actor, 'ops.retention.prune', 'ops_snapshots', 'retention', {
          pruned_count: result.pruned_count,
          pruned_ids: result.pruned_ids,
          reclaimed_bytes: result.reclaimed_bytes,
          worm_skipped_count: result.worm_skipped_count
        });
      }
      return json(result, 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'POST') {
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
