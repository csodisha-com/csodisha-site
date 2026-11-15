// Operations Suite — Module #4 (Cloudflare D1 Distributed Replica Switchover),
// Module #8 (Offline Air-Gapped Manifest & Bundle Packager),
// and Module #16 (Disaster Recovery Playbook, SOP & Runbook Studio).
import { HttpError, json, readJson } from './http.js';
import { audit } from './rbac.js';
import {
  SNAPSHOT_TABLES,
  EXCLUDED_SNAPSHOT_TABLES,
  SENSITIVE_SNAPSHOT_COLUMNS,
  ensureOpsSnapshotsTable,
  collectPlatformSnapshotTables,
  listPlatformSnapshots,
  serializeCanonicalSnapshot,
  computeSnapshotChecksum
} from './ops-snapshots.js';
import { inspectDatabaseSchema, KNOWN_MIGRATIONS } from './ops-hygiene.js';

export const D1_ROUTING_POLICY_KEY = 'ops_d1_routing_policy';
export const D1_HEARTBEAT_KEY = 'ops_d1_last_heartbeat';

export const DEFAULT_DR_RUNBOOKS = [
  {
    id: 'SOP-01',
    title: 'SOP-01: Accidental Content / Table Corruption Rollback',
    severity: 'HIGH',
    rto_minutes: 5,
    rpo_minutes: 15,
    steps: [
      { step: 'Open Module #12 and activate Emergency Read-Only Freeze to halt concurrent editor writes.', done: false },
      { step: 'Open Module #2 (DR Drill Engine), select the latest verified R2 snapshot, and run a non-destructive table diff.', done: false },
      { step: 'Open Module #3 (Granular Restore), check only the affected tables (e.g. posts or schemes_directory), choose Upsert or Replace mode, and type RESTORE.', done: false },
      { step: 'Verify the automatic pre_restore safety snapshot ID in the Snapshot Vault, purge the Edge Cache (Module #7), and lift the Read-Only Freeze.', done: false }
    ]
  },
  {
    id: 'SOP-02',
    title: 'SOP-02: Suspected Credential Compromise or Traffic Spike Lockdown',
    severity: 'CRITICAL',
    rto_minutes: 1,
    rpo_minutes: 0,
    steps: [
      { step: 'Immediately activate Emergency Read-Only Freeze (Module #12) so all public and editor mutating endpoints return HTTP 503.', done: false },
      { step: 'Run Dead-Letter & Session Vacuum (Module #11) or revoke active sessions in D1, then regenerate the 8 single-use 2FA backup codes in Security.', done: false },
      { step: 'Inspect Post-Incident Forensic Audit & State Diffs (Module #13) filtered by actor/action to identify any unauthorized mutations.', done: false },
      { step: 'Rotate ADMIN_TOTP_SECRET / Telegram bot credentials in Cloudflare Worker secrets, verify 2FA login, and lift the Read-Only Freeze.', done: false }
    ]
  },
  {
    id: 'SOP-03',
    title: 'SOP-03: Full D1 + R2 Cold-Vault Air-Gapped Rebuild',
    severity: 'CRITICAL',
    rto_minutes: 30,
    rpo_minutes: 1440,
    steps: [
      { step: 'Locate the latest signed Air-Gapped DR Bundle (.cso-bundle.json) or download the latest snapshot from the R2 Cold Vault (Module #5).', done: false },
      { step: 'Verify the bundle payload_sha256 and schema_sha256 cryptographic checksums before importing any state.', done: false },
      { step: 'Provision or target the standby Cloudflare D1 database, apply tracked migrations (0001..0012), and bind it in wrangler.json.', done: false },
      { step: 'Execute Point-in-Time Restore (Module #3) across all restorable tables, run the Live Health & Canary Probe (Module #9/#15), and warm core edge routes (Module #7).', done: false }
    ]
  },
  {
    id: 'SOP-04',
    title: 'SOP-04: 2FA Lockout & Emergency Backup Code Recovery',
    severity: 'MEDIUM',
    rto_minutes: 2,
    rpo_minutes: 0,
    steps: [
      { step: 'At /admin/login, enter your staff email/password and either request an Instant Push OTP (Telegram/Email) or enter one of the 8 XXXX-XXXX backup codes.', done: false },
      { step: 'Once authenticated into the Admin Portal, open Operations & Backups -> Multi-Factor Backup Recovery Codes.', done: false },
      { step: 'Check remaining unused backup codes; if fewer than 3 remain, click Regenerate 8 Backup Codes and store them in an offline vault.', done: false },
      { step: 'Verify audit_log recorded auth.backup_codes.regenerate in Module #13 (Forensic Diff Inspector).', done: false }
    ]
  }
];

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
// Module #4: Cloudflare D1 Distributed Replica & Read-Routing Telemetry
// ============================================================================
export const VALID_REPLICA_MODES = ['auto_edge_replica', 'primary_only', 'pinned_region'];
export const VALID_REPLICA_REGIONS = ['WNAM', 'ENAM', 'WEUR', 'EEUR', 'APAC', 'OC', 'ME', 'AFR'];

const REPLICA_MODE_KEY = 'ops_d1_replica_mode';
const REPLICA_REGION_KEY = 'ops_d1_replica_region';
const REPLICA_LAST_SWITCHOVER_KEY = 'ops_d1_replica_last_switchover';

export function defaultD1RoutingPolicy() {
  return {
    mode: 'auto_edge_replica',
    region: 'APAC',
    failover_threshold_ms: 250,
    auto_switchover: true,
    updated_by: null,
    updated_at: null
  };
}

function normalizeReplicaMode(raw) {
  const s = String(raw || '').trim();
  if (s === 'read_replica_preferred') return 'auto_edge_replica';
  if (VALID_REPLICA_MODES.includes(s)) return s;
  return null;
}

function normalizeReplicaRegion(raw) {
  if (raw === undefined || raw === null || raw === '') return 'APAC';
  const r = String(raw).trim().toUpperCase();
  return VALID_REPLICA_REGIONS.includes(r) ? r : null;
}

function consistencyPostureFor(mode, region) {
  if (mode === 'primary_only') return 'Strict Linearizable Primary (Zero Replica Lag)';
  if (mode === 'pinned_region') return `Regional Replica Pinned (${region} · Session Bookmark)`;
  return 'Sequential Session Bookmarks (Read-Your-Writes)';
}

export async function getD1RoutingPolicy(env) {
  const def = defaultD1RoutingPolicy();
  if (!env || !env.DB) return def;
  try {
    const [polRow, modeRow, regionRow, lastRow] = await Promise.all([
      env.DB.prepare(`SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`).bind(D1_ROUTING_POLICY_KEY).first(),
      env.DB.prepare(`SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`).bind(REPLICA_MODE_KEY).first(),
      env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(REPLICA_REGION_KEY).first(),
      env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = ?`).bind(REPLICA_LAST_SWITCHOVER_KEY).first()
    ]);

    let parsed = {};
    if (polRow && polRow.value_json) {
      try { parsed = JSON.parse(polRow.value_json); } catch {}
    }

    let rawMode = parsed.mode;
    if (modeRow && modeRow.value_json) {
      try { rawMode = JSON.parse(modeRow.value_json); } catch { rawMode = modeRow.value_json; }
    }
    const mode = normalizeReplicaMode(rawMode) || 'auto_edge_replica';

    let rawRegion = parsed.region;
    if (regionRow && regionRow.value_json) {
      try { rawRegion = JSON.parse(regionRow.value_json); } catch { rawRegion = regionRow.value_json; }
    }
    const region = normalizeReplicaRegion(rawRegion) || 'APAC';

    let lastSwitchover = null;
    if (lastRow && lastRow.value_json) {
      try { lastSwitchover = JSON.parse(lastRow.value_json); } catch {}
    }

    return {
      mode,
      region,
      failover_threshold_ms: Math.max(25, Math.min(5000, Number(parsed?.failover_threshold_ms) || 250)),
      auto_switchover: parsed?.auto_switchover !== undefined ? Boolean(parsed.auto_switchover) : true,
      consistency_posture: consistencyPostureFor(mode, region),
      last_switchover: lastSwitchover,
      updated_by: parsed?.updated_by || (modeRow && modeRow.updated_by) || (polRow && polRow.updated_by) || null,
      updated_at: parsed?.updated_at || (modeRow && modeRow.updated_at) || (polRow && polRow.updated_at) || null
    };
  } catch {
    return def;
  }
}

export async function saveD1RoutingPolicy(env, input = {}, actorEmail = 'admin', { latencyMs = 1 } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  const mode = normalizeReplicaMode(input.mode);
  if (!mode) {
    throw new HttpError(400, 'INVALID_ROUTING_MODE', 'Routing mode must be "auto_edge_replica", "primary_only", or "pinned_region"');
  }

  const region = normalizeReplicaRegion(input.region);
  if (!region) {
    throw new HttpError(400, 'INVALID_REGION_HINT', 'Region hint must be one of: ' + VALID_REPLICA_REGIONS.join(', '));
  }

  const prev = await getD1RoutingPolicy(env);
  const threshold = Math.max(25, Math.min(5000, Number(input.failover_threshold_ms) || prev.failover_threshold_ms || 250));
  const autoSwitchover = input.auto_switchover !== undefined ? Boolean(input.auto_switchover) : true;
  const nowIso = new Date().toISOString();
  const actor = actorEmail || 'admin';

  const lastSwitchover = {
    switched_at: nowIso,
    actor,
    previous_mode: prev.mode,
    new_mode: mode,
    previous_region: prev.region,
    region,
    latency_ms: Math.max(1, Number(latencyMs) || 1)
  };

  const policy = {
    mode,
    region,
    failover_threshold_ms: threshold,
    auto_switchover: autoSwitchover,
    consistency_posture: consistencyPostureFor(mode, region),
    last_switchover: lastSwitchover,
    updated_by: actor,
    updated_at: nowIso
  };

  const upsertSql = `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`;

  await Promise.all([
    env.DB.prepare(upsertSql).bind(D1_ROUTING_POLICY_KEY, JSON.stringify(policy), actor, nowIso).run(),
    env.DB.prepare(upsertSql).bind(REPLICA_MODE_KEY, JSON.stringify(mode), actor, nowIso).run(),
    env.DB.prepare(upsertSql).bind(REPLICA_REGION_KEY, JSON.stringify(region), actor, nowIso).run(),
    env.DB.prepare(upsertSql).bind(REPLICA_LAST_SWITCHOVER_KEY, JSON.stringify(lastSwitchover), actor, nowIso).run()
  ]);

  return policy;
}

export async function inspectD1ReplicaTelemetry(request, env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  // 1. Consecutive Read-Consistency Benchmark, PRAGMA & sqlite_master table count
  const r0 = Date.now();
  let journalMode = 'wal';
  let pageCount = 0;
  let pageSize = 4096;
  let tableCount = 0;
  let databases = [{ seq: 0, name: 'main', file: 'cso-database' }];

  try {
    const jmRow = await env.DB.prepare('PRAGMA journal_mode').first();
    if (jmRow) {
      const val = jmRow.journal_mode ?? Object.values(jmRow)[0];
      if (val) journalMode = String(val);
    }
  } catch {}

  try {
    const pcRow = await env.DB.prepare('PRAGMA page_count').first();
    if (pcRow) {
      const val = pcRow.page_count ?? Object.values(pcRow)[0];
      if (val !== undefined) pageCount = Number(val) || 0;
    }
  } catch {}

  try {
    const psRow = await env.DB.prepare('PRAGMA page_size').first();
    if (psRow) {
      const val = psRow.page_size ?? Object.values(psRow)[0];
      if (val !== undefined) pageSize = Number(val) || 4096;
    }
  } catch {}

  try {
    const dbList = await env.DB.prepare('PRAGMA database_list').all();
    if (dbList && Array.isArray(dbList.results) && dbList.results.length) {
      databases = dbList.results.map(d => ({
        seq: d.seq ?? 0,
        name: d.name || 'main',
        file: d.file || 'cso-database'
      }));
    }
  } catch {}

  try {
    const tblRow = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`
    ).first();
    tableCount = Number(tblRow && tblRow.cnt) || 0;
  } catch {}

  // Second read probe to measure consecutive read consistency
  await env.DB.prepare('SELECT 1 AS read_probe').first();
  const readLatencyMs = Math.max(1, Date.now() - r0);

  // 2. Write-Roundtrip Latency Benchmark
  const w0 = Date.now();
  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, 'system:probe', ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`
  ).bind(D1_HEARTBEAT_KEY, JSON.stringify({ ts: nowIso }), nowIso).run();
  const writeLatencyMs = Math.max(1, Date.now() - w0);

  // 3. R2 Warm-Standby Snapshot Age
  let latestSnapshotAt = null;
  let snapshotAgeMinutes = null;
  try {
    const snapRow = await env.DB.prepare(`SELECT created_at FROM ops_snapshots ORDER BY created_at DESC LIMIT 1`).first();
    if (snapRow && snapRow.created_at) {
      latestSnapshotAt = snapRow.created_at;
      const msDiff = Date.now() - Date.parse(snapRow.created_at);
      if (Number.isFinite(msDiff) && msDiff >= 0) {
        snapshotAgeMinutes = Math.round(msDiff / 60000);
      }
    }
  } catch {}

  // 4. Recent Switchover History from audit_log
  let switchoverHistory = [];
  try {
    const hist = await env.DB.prepare(
      `SELECT id, actor_user_id, metadata_json, created_at
       FROM audit_log
       WHERE action = 'ops.replica.switchover'
       ORDER BY id DESC
       LIMIT 15`
    ).all();
    switchoverHistory = (hist && Array.isArray(hist.results) ? hist.results : []).map(r => {
      let meta = {};
      try { meta = JSON.parse(r.metadata_json || '{}'); } catch {}
      return {
        id: r.id,
        created_at: r.created_at,
        actor: meta.actor || r.actor_user_id || 'admin',
        previous_mode: meta.previous_mode || '—',
        new_mode: meta.new_mode || '—',
        region: meta.region || 'APAC',
        latency_ms: meta.latency_ms || null
      };
    });
  } catch {}

  const policy = await getD1RoutingPolicy(env);
  const cf = (request && request.cf) || {};
  const edgeColo = String(cf.colo || (request && request.headers && request.headers.get('cf-ray')?.split('-')[1]) || 'LOCAL-DEV');
  const edgeCountry = String(cf.country || 'IN');
  const edgeRegion = String(cf.region || 'Odisha');

  const estimatedSizeBytes = pageCount * pageSize;
  const replicaStatus = readLatencyMs <= policy.failover_threshold_ms ? 'SYNCHRONIZED' : 'HIGH_LATENCY_PRIMARY_PINNED';

  return {
    ok: true,
    checked_at: nowIso,
    routing_policy: policy,
    switchover_history: switchoverHistory,
    telemetry: {
      binding: 'DB (cso-database)',
      replica_status: replicaStatus,
      consistency_posture: policy.consistency_posture || consistencyPostureFor(policy.mode, policy.region),
      journal_mode: journalMode,
      table_count: tableCount,
      page_count: pageCount,
      page_size: pageSize,
      estimated_size_bytes: estimatedSizeBytes,
      databases,
      read_latency_ms: readLatencyMs,
      write_latency_ms: writeLatencyMs,
      latest_snapshot_at: latestSnapshotAt,
      snapshot_age_minutes: snapshotAgeMinutes,
      edge_colo: edgeColo,
      edge_country: edgeCountry,
      edge_region: edgeRegion
    }
  };
}

export const getReplicaSwitchoverStatus = inspectD1ReplicaTelemetry;

export async function previewReplicaSwitchover(request, env, input = {}) {
  const mode = normalizeReplicaMode(input.mode);
  if (!mode) {
    throw new HttpError(400, 'INVALID_ROUTING_MODE', 'Routing mode must be "auto_edge_replica", "primary_only", or "pinned_region"');
  }
  const region = normalizeReplicaRegion(input.region);
  if (!region) {
    throw new HttpError(400, 'INVALID_REGION_HINT', 'Region hint must be one of: ' + VALID_REPLICA_REGIONS.join(', '));
  }

  const current = await inspectD1ReplicaTelemetry(request, env);
  const readEst = mode === 'primary_only'
    ? 'Higher cross-region read RTT (routed to primary leader)'
    : (mode === 'pinned_region'
      ? `Low regional read RTT pinned to ${region} edge replica`
      : 'Lowest global edge read RTT via nearest D1 replica');
  const writeEst = 'All writes route to primary leader with sequential bookmark propagation';

  return {
    ok: true,
    dry_run: true,
    preview: {
      proposed_mode: mode,
      proposed_region: region,
      current_mode: current.routing_policy.mode,
      current_region: current.routing_policy.region,
      consistency_posture: consistencyPostureFor(mode, region),
      expected_read_impact: readEst,
      expected_write_impact: writeEst,
      measured_read_latency_ms: current.telemetry.read_latency_ms,
      measured_write_latency_ms: current.telemetry.write_latency_ms
    },
    routing_policy: current.routing_policy,
    telemetry: current.telemetry
  };
}

// ============================================================================
// Module #16: Disaster Recovery Playbook, SOP & Runbook Studio
// ============================================================================
export async function ensureOpsRunbooksTable(env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ops_runbooks (
       id TEXT PRIMARY KEY,
       slug TEXT UNIQUE,
       title TEXT NOT NULL,
       severity TEXT NOT NULL,
       rto_minutes INTEGER NOT NULL,
       rpo_minutes INTEGER NOT NULL,
       steps_json TEXT NOT NULL,
       last_drilled_at TEXT,
       last_executed_at TEXT,
       last_executed_by TEXT,
       operator_notes TEXT,
       updated_by TEXT,
       updated_at TEXT NOT NULL
     )`
  ).run();

  // Idempotent migration for existing tables created without newer columns
  try {
    const pragma = await env.DB.prepare(`PRAGMA table_info("ops_runbooks")`).all();
    const cols = new Set((pragma.results || []).map(c => c.name));
    const additions = [
      ['slug', 'TEXT'],
      ['last_executed_at', 'TEXT'],
      ['last_executed_by', 'TEXT'],
      ['operator_notes', 'TEXT']
    ];
    for (const [col, typ] of additions) {
      if (!cols.has(col)) {
        await env.DB.prepare(`ALTER TABLE ops_runbooks ADD COLUMN ${col} ${typ}`).run();
      }
    }
  } catch {}

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ops_runbooks`).first();
  if (!countRow || Number(countRow.n) === 0) {
    const nowIso = new Date().toISOString();
    for (const rb of DEFAULT_DR_RUNBOOKS) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO ops_runbooks (id, slug, title, severity, rto_minutes, rpo_minutes, steps_json, last_drilled_at, last_executed_at, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'system:seed', ?)`
      ).bind(
        rb.id,
        String(rb.id).toLowerCase(),
        rb.title,
        rb.severity,
        rb.rto_minutes,
        rb.rpo_minutes,
        JSON.stringify(rb.steps),
        nowIso
      ).run();
    }
  }
}

function normalizeRunbookRow(row) {
  let steps = [];
  try {
    const parsed = JSON.parse(row.steps_json || '[]');
    if (Array.isArray(parsed)) {
      steps = parsed.map(s => (typeof s === 'string' ? { step: s, done: false } : { step: String(s.step || ''), done: Boolean(s.done) })).filter(s => s.step);
    }
  } catch {
    steps = [];
  }
  const execAt = row.last_executed_at || row.last_drilled_at || null;
  return {
    id: row.id,
    slug: row.slug || String(row.id || '').toLowerCase(),
    title: row.title,
    severity: row.severity,
    rto_minutes: Number(row.rto_minutes || 5),
    rpo_minutes: Number(row.rpo_minutes || 0),
    steps,
    last_drilled_at: row.last_drilled_at || execAt,
    last_executed_at: execAt,
    last_executed_by: row.last_executed_by || row.updated_by || null,
    operator_notes: row.operator_notes || '',
    updated_by: row.updated_by || null,
    updated_at: row.updated_at
  };
}

export async function listOpsRunbooks(env) {
  await ensureOpsRunbooksTable(env);
  const { results } = await env.DB.prepare(
    `SELECT id, slug, title, severity, rto_minutes, rpo_minutes, steps_json, last_drilled_at, last_executed_at, last_executed_by, operator_notes, updated_by, updated_at
     FROM ops_runbooks
     ORDER BY id ASC`
  ).all();
  const items = (results || []).map(normalizeRunbookRow);
  return { ok: true, total: items.length, items };
}

export async function saveOpsRunbook(env, input = {}, actorEmail = 'admin') {
  await ensureOpsRunbooksTable(env);
  const rawId = String(input.id || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  const id = rawId || `SOP-${Date.now().toString(36).toUpperCase()}`;
  const slug = String(input.slug || id).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 48) || id.toLowerCase();
  const title = String(input.title || '').trim().slice(0, 160);
  if (!title) {
    throw new HttpError(400, 'TITLE_REQUIRED', 'Runbook title is required');
  }
  const allowedSeverities = ['P1-CRITICAL', 'P2-HIGH', 'P3-STANDARD', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const sevUpper = String(input.severity || 'HIGH').toUpperCase();
  const severity = allowedSeverities.includes(sevUpper) ? sevUpper : 'HIGH';
  const rtoMinutes = Math.max(0, Math.min(10080, Number(input.rto_minutes ?? 15)));
  const rpoMinutes = Math.max(0, Math.min(10080, Number(input.rpo_minutes ?? 60)));

  let rawSteps = input.steps;
  if (typeof rawSteps === 'string') {
    rawSteps = rawSteps.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }
  const steps = Array.isArray(rawSteps)
    ? rawSteps.map(s => (typeof s === 'string' ? { step: s.trim(), done: false } : { step: String(s?.step || '').trim(), done: Boolean(s?.done) })).filter(s => s.step)
    : [];
  if (!steps.length) {
    throw new HttpError(400, 'STEPS_REQUIRED', 'At least one SOP checklist step is required');
  }

  const existing = await env.DB.prepare(`SELECT last_drilled_at, last_executed_at, last_executed_by, operator_notes FROM ops_runbooks WHERE id = ?`).bind(id).first();
  const lastDrilledAt = input.last_drilled_at !== undefined
    ? input.last_drilled_at
    : (existing ? existing.last_drilled_at : null);
  const lastExecutedAt = existing ? (existing.last_executed_at || lastDrilledAt) : lastDrilledAt;
  const lastExecutedBy = existing ? existing.last_executed_by : null;
  const opNotes = input.operator_notes !== undefined
    ? String(input.operator_notes || '').trim().slice(0, 500)
    : (existing ? (existing.operator_notes || '') : '');
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO ops_runbooks (id, slug, title, severity, rto_minutes, rpo_minutes, steps_json, last_drilled_at, last_executed_at, last_executed_by, operator_notes, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       slug = excluded.slug,
       title = excluded.title,
       severity = excluded.severity,
       rto_minutes = excluded.rto_minutes,
       rpo_minutes = excluded.rpo_minutes,
       steps_json = excluded.steps_json,
       last_drilled_at = excluded.last_drilled_at,
       last_executed_at = excluded.last_executed_at,
       last_executed_by = excluded.last_executed_by,
       operator_notes = excluded.operator_notes,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(
    id,
    slug,
    title,
    severity,
    rtoMinutes,
    rpoMinutes,
    JSON.stringify(steps),
    lastDrilledAt,
    lastExecutedAt,
    lastExecutedBy,
    opNotes,
    actorEmail || 'admin',
    nowIso
  ).run();

  const saved = await env.DB.prepare(`SELECT * FROM ops_runbooks WHERE id = ?`).bind(id).first();
  return normalizeRunbookRow(saved);
}

export async function markRunbookDrillCompleted(env, id, { steps = null, operatorNotes = '', actorEmail = 'admin' } = {}) {
  await ensureOpsRunbooksTable(env);
  const cleanId = String(id || '').trim();
  const existing = await env.DB.prepare(`SELECT * FROM ops_runbooks WHERE id = ?`).bind(cleanId).first();
  if (!existing) {
    throw new HttpError(404, 'RUNBOOK_NOT_FOUND', `Runbook "${cleanId}" not found`);
  }
  const norm = normalizeRunbookRow(existing);
  const updatedSteps = Array.isArray(steps) && steps.length
    ? steps.map(s => ({ step: String(s?.step || s || '').trim(), done: Boolean(s?.done ?? true) })).filter(s => s.step)
    : norm.steps.map(s => ({ ...s, done: true }));
  const cleanNotes = String(operatorNotes || '').trim().slice(0, 500);
  const nowIso = new Date().toISOString();
  const actor = actorEmail || 'admin';

  await env.DB.prepare(
    `UPDATE ops_runbooks
     SET steps_json = ?, last_drilled_at = ?, last_executed_at = ?, last_executed_by = ?, operator_notes = ?, updated_by = ?, updated_at = ?
     WHERE id = ?`
  ).bind(JSON.stringify(updatedSteps), nowIso, nowIso, actor, cleanNotes, actor, nowIso, cleanId).run();

  const updated = await env.DB.prepare(`SELECT * FROM ops_runbooks WHERE id = ?`).bind(cleanId).first();
  return normalizeRunbookRow(updated);
}

// ============================================================================
// Module #8: Offline Air-Gapped Manifest & Signed Bundle Packager
// ============================================================================
export async function buildAirGappedBundle(request, env, { actorEmail = 'admin', scope = 'full' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  await ensureOpsSnapshotsTable(env);
  await ensureOpsRunbooksTable(env);

  const normalizedScope = scope === 'core' || scope === 'content_only' ? 'core' : 'full';
  const snapScope = normalizedScope === 'core' ? 'content_only' : 'all';

  const [snapData, schemaReport, snapList, runbooksRes] = await Promise.all([
    collectPlatformSnapshotTables(env, snapScope),
    inspectDatabaseSchema(env),
    listPlatformSnapshots(env, { limit: 100 }).catch(() => ({ total: 0, items: [] })),
    listOpsRunbooks(env)
  ]);

  const payload = {
    schema_sha256: schemaReport.schema_sha256,
    table_count: schemaReport.table_count,
    index_count: schemaReport.index_count,
    row_counts: snapData.row_counts,
    tables: snapData.tables,
    migrations: KNOWN_MIGRATIONS,
    snapshot_inventory: snapList.items || [],
    runbooks: runbooksRes.items || []
  };

  const payloadSha256 = await computeSnapshotChecksum(payload);
  const cf = (request && request.cf) || {};
  const edgeColo = String(cf.colo || (request && request.headers && request.headers.get('cf-ray')?.split('-')[1]) || 'LOCAL-DEV');
  const nowIso = new Date().toISOString();
  const exportedTables = Object.keys(snapData.tables || {});

  const manifest = {
    bundle_format: 'cso.airgap.dr.bundle.v1',
    bundle_version: 'v35',
    scope: normalizedScope,
    dpdp_scrubbed: true,
    excluded_tables: Array.from(EXCLUDED_SNAPSHOT_TABLES),
    scrubbed_columns: Array.from(SENSITIVE_SNAPSHOT_COLUMNS),
    generated_at: nowIso,
    generated_by: actorEmail || 'admin',
    edge_colo: edgeColo,
    schema_sha256: schemaReport.schema_sha256,
    payload_sha256: payloadSha256,
    exported_tables: exportedTables,
    table_count: exportedTables.length,
    total_rows: snapData.total_rows,
    snapshot_inventory_count: (snapList.items || []).length,
    runbook_count: (runbooksRes.items || []).length,
    verification_instructions: 'To verify offline: canonicalize bundle.payload with sorted keys (JSON.stringify(..., null, 2)), compute SHA-256 hex, and compare against bundle.manifest.payload_sha256.'
  };

  return {
    manifest,
    payload
  };
}

export async function verifyAirGappedBundlePayload(input) {
  let bundle = input;
  if (bundle && typeof bundle.json_text === 'string') {
    try {
      bundle = JSON.parse(bundle.json_text);
    } catch {
      throw new HttpError(400, 'INVALID_BUNDLE_JSON', 'Uploaded bundle is not valid JSON');
    }
  } else if (bundle && bundle.bundle && typeof bundle.bundle === 'object') {
    bundle = bundle.bundle;
  }

  if (!bundle || typeof bundle !== 'object' || !bundle.manifest || !bundle.payload || typeof bundle.payload !== 'object') {
    throw new HttpError(400, 'INVALID_BUNDLE_STRUCTURE', 'Bundle must contain top-level "manifest" and "payload" objects');
  }

  const manifest = bundle.manifest;
  const payload = bundle.payload;
  const expectedSha = String(manifest.payload_sha256 || '').trim().toLowerCase();
  if (!expectedSha || expectedSha.length !== 64) {
    throw new HttpError(400, 'MISSING_MANIFEST_SHA256', 'manifest.payload_sha256 must be a 64-character SHA-256 hex digest');
  }

  const computedSha = await computeSnapshotChecksum(payload);
  const signatureMatch = computedSha === expectedSha;

  const tablesObj = payload.tables && typeof payload.tables === 'object' ? payload.tables : {};
  const leakedTables = Object.keys(tablesObj).filter(t => EXCLUDED_SNAPSHOT_TABLES.has(t));
  let leakedSensitiveFields = 0;
  for (const rows of Object.values(tablesObj)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      for (const col of SENSITIVE_SNAPSHOT_COLUMNS) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '[SCRUBBED_DPDP]') {
          leakedSensitiveFields++;
        }
      }
    }
  }

  const dpdpCompliant = leakedTables.length === 0 && leakedSensitiveFields === 0;
  const rowCounts = payload.row_counts && typeof payload.row_counts === 'object' ? payload.row_counts : {};
  const totalRows = Object.values(rowCounts).reduce((a, n) => a + (Number(n) || 0), 0);

  return {
    ok: true,
    valid: signatureMatch && dpdpCompliant,
    signature_match: signatureMatch,
    dpdp_compliant: dpdpCompliant,
    leaked_tables: leakedTables,
    leaked_sensitive_fields: leakedSensitiveFields,
    expected_sha256: expectedSha,
    computed_sha256: computedSha,
    schema_sha256: manifest.schema_sha256 || payload.schema_sha256 || null,
    bundle_format: manifest.bundle_format || 'unknown',
    bundle_version: manifest.bundle_version || 'unknown',
    scope: manifest.scope || 'full',
    generated_at: manifest.generated_at || null,
    generated_by: manifest.generated_by || null,
    table_count: Object.keys(tablesObj).length,
    total_rows: totalRows,
    row_counts: rowCounts
  };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/ops/{replica|airgap-bundle|runbooks}
// ============================================================================
export async function handleOpsContinuity(request, env, actor, subAction, subId, extraAction) {
  const method = request.method;
  const url = new URL(request.url);

  // Module #4: GET / POST /api/admin/ops/replica and /api/admin/ops/replica-switchover
  if (subAction === 'replica' || subAction === 'replica-switchover') {
    if (method === 'GET') {
      const report = await getReplicaSwitchoverStatus(request, env);
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    if (method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can change D1 read-routing policy');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      if (body && body.dry_run === true) {
        const previewRes = await previewReplicaSwitchover(request, env, body);
        return json(previewRes, 200, { 'Cache-Control': 'no-store' });
      }
      const confirmVal = String((body && (body.confirm !== undefined ? body.confirm : body.confirm_phrase)) || '').trim();
      if (confirmVal !== 'SWITCHOVER') {
        throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Type SWITCHOVER in the confirmation field to commit live D1 routing changes');
      }
      const prevPolicy = await getD1RoutingPolicy(env);
      const probe = await inspectD1ReplicaTelemetry(request, env);
      const policy = await saveD1RoutingPolicy(env, body, actor.email || actor.userId, {
        latencyMs: probe.telemetry.read_latency_ms
      });
      await audit(env, request, actor, 'ops.replica.switchover', 'site_settings', REPLICA_MODE_KEY, {
        actor: actor.email || actor.userId,
        previous_mode: prevPolicy.mode,
        new_mode: policy.mode,
        previous_region: prevPolicy.region,
        region: policy.region,
        latency_ms: probe.telemetry.read_latency_ms,
        failover_threshold_ms: policy.failover_threshold_ms
      });
      const report = await inspectD1ReplicaTelemetry(request, env);
      return json({ ...report, switched: true }, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #8: GET / POST /api/admin/ops/airgap-bundle and POST /api/admin/ops/airgap-bundle/verify
  if (subAction === 'airgap-bundle') {
    if (actor.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can export or verify an Air-Gapped DR Bundle');
    }
    if (subId === 'verify' && method === 'POST') {
      const body = await readJson(request, 2_000_000).catch(() => ({}));
      const report = await verifyAirGappedBundlePayload(body);
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && (method === 'GET' || method === 'POST')) {
      const body = method === 'POST' ? await readJson(request, 10000).catch(() => ({})) : {};
      const scope = (body && body.scope) || url.searchParams.get('scope') || 'full';
      const bundle = await buildAirGappedBundle(request, env, {
        actorEmail: actor.email || actor.userId,
        scope
      });
      if (url.searchParams.get('summary') === '1') {
        return json({
          ok: true,
          manifest: bundle.manifest,
          row_counts: bundle.payload.row_counts
        }, 200, { 'Cache-Control': 'no-store' });
      }
      await audit(env, request, actor, 'ops.airgap.export', 'airgap_bundle', bundle.manifest.payload_sha256.slice(0, 16), {
        scope: bundle.manifest.scope,
        schema_sha256: bundle.manifest.schema_sha256,
        payload_sha256: bundle.manifest.payload_sha256,
        total_rows: bundle.manifest.total_rows
      });
      const serialized = serializeCanonicalSnapshot(bundle);
      const dateSlug = bundle.manifest.generated_at.slice(0, 10);
      return new Response(serialized, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="cso-airgap-bundle-${dateSlug}.cso-bundle.json"`,
          'Cache-Control': 'no-store',
          'X-Airgap-Payload-SHA256': bundle.manifest.payload_sha256,
          'X-Airgap-Schema-SHA256': bundle.manifest.schema_sha256
        }
      });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #16: GET / POST / PUT /api/admin/ops/runbooks (and POST /api/admin/ops/runbooks/:id/{drill|complete})
  if (subAction === 'runbooks' || subAction === 'sop' || subAction === 'playbook') {
    if (!subId && method === 'GET') {
      const res = await listOpsRunbooks(env);
      return json(res, 200, { 'Cache-Control': 'no-store' });
    }
    if (!subId && method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can create or edit DR runbooks');
      }
      const body = await readJson(request, 50000).catch(() => ({}));
      const item = await saveOpsRunbook(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.runbook.save', 'ops_runbooks', item.id, {
        title: item.title,
        severity: item.severity,
        rto_minutes: item.rto_minutes,
        rpo_minutes: item.rpo_minutes
      });
      return json({ ok: true, item }, 200, { 'Cache-Control': 'no-store' });
    }
    if (subId && (method === 'PUT' || (method === 'POST' && (extraAction === 'drill' || extraAction === 'complete')))) {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update or drill DR runbooks');
      }
      const body = await readJson(request, 50000).catch(() => ({}));
      if (extraAction === 'drill' || extraAction === 'complete' || body.mark_drilled) {
        const opNotes = body.operator_notes || body.note || '';
        const item = await markRunbookDrillCompleted(env, subId, {
          steps: body.steps || null,
          operatorNotes: opNotes,
          actorEmail: actor.email || actor.userId
        });
        const auditAction = extraAction === 'complete' ? 'ops.runbook.execute' : 'ops.runbook.drill';
        await audit(env, request, actor, auditAction, 'ops_runbooks', item.id, {
          title: item.title,
          operator_notes: item.operator_notes,
          last_executed_at: item.last_executed_at,
          last_drilled_at: item.last_drilled_at
        });
        return json({ ok: true, item }, 200, { 'Cache-Control': 'no-store' });
      }
      const item = await saveOpsRunbook(env, { ...body, id: subId }, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.runbook.save', 'ops_runbooks', item.id, {
        title: item.title,
        severity: item.severity
      });
      return json({ ok: true, item }, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown ops continuity endpoint');
}
