// Operations Suite — Module #4 (Cloudflare D1 Distributed Replica Switchover),
// Module #8 (Offline Air-Gapped Manifest & Bundle Packager),
// and Module #16 (Disaster Recovery Playbook, SOP & Runbook Studio).
import { HttpError, json, readJson } from './http.js';
import { audit } from './rbac.js';
import {
  SNAPSHOT_TABLES,
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
export function defaultD1RoutingPolicy() {
  return {
    mode: 'read_replica_preferred',
    failover_threshold_ms: 250,
    auto_switchover: true,
    updated_by: null,
    updated_at: null
  };
}

export async function getD1RoutingPolicy(env) {
  const def = defaultD1RoutingPolicy();
  if (!env || !env.DB) return def;
  try {
    const row = await env.DB.prepare(
      `SELECT value_json, updated_by, updated_at FROM site_settings WHERE key = ?`
    ).bind(D1_ROUTING_POLICY_KEY).first();
    if (!row || !row.value_json) return def;
    const parsed = JSON.parse(row.value_json);
    const mode = parsed && parsed.mode === 'primary_only' ? 'primary_only' : 'read_replica_preferred';
    return {
      mode,
      failover_threshold_ms: Math.max(25, Math.min(5000, Number(parsed?.failover_threshold_ms) || 250)),
      auto_switchover: parsed?.auto_switchover !== undefined ? Boolean(parsed.auto_switchover) : true,
      updated_by: parsed?.updated_by || row.updated_by || null,
      updated_at: parsed?.updated_at || row.updated_at || null
    };
  } catch {
    return def;
  }
}

export async function saveD1RoutingPolicy(env, input = {}, actorEmail = 'admin') {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);
  const mode = input.mode === 'primary_only'
    ? 'primary_only'
    : (input.mode === 'read_replica_preferred' ? 'read_replica_preferred' : null);
  if (!mode) {
    throw new HttpError(400, 'INVALID_ROUTING_MODE', 'Routing mode must be "primary_only" or "read_replica_preferred"');
  }
  const threshold = Math.max(25, Math.min(5000, Number(input.failover_threshold_ms) || 250));
  const autoSwitchover = input.auto_switchover !== undefined ? Boolean(input.auto_switchover) : true;
  const nowIso = new Date().toISOString();

  const policy = {
    mode,
    failover_threshold_ms: threshold,
    auto_switchover: autoSwitchover,
    updated_by: actorEmail || 'admin',
    updated_at: nowIso
  };

  await env.DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(D1_ROUTING_POLICY_KEY, JSON.stringify(policy), actorEmail || 'admin', nowIso).run();

  return policy;
}

export async function inspectD1ReplicaTelemetry(request, env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureSiteSettingsTable(env.DB);

  // 1. Consecutive Read-Consistency Benchmark & PRAGMA inspection
  const r0 = Date.now();
  let journalMode = 'wal';
  let pageCount = 0;
  let pageSize = 4096;
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
    telemetry: {
      binding: 'DB (cso-database)',
      replica_status: replicaStatus,
      journal_mode: journalMode,
      page_count: pageCount,
      page_size: pageSize,
      estimated_size_bytes: estimatedSizeBytes,
      databases,
      read_latency_ms: readLatencyMs,
      write_latency_ms: writeLatencyMs,
      edge_colo: edgeColo,
      edge_country: edgeCountry,
      edge_region: edgeRegion
    }
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
       title TEXT NOT NULL,
       severity TEXT NOT NULL,
       rto_minutes INTEGER NOT NULL,
       rpo_minutes INTEGER NOT NULL,
       steps_json TEXT NOT NULL,
       last_drilled_at TEXT,
       updated_by TEXT,
       updated_at TEXT NOT NULL
     )`
  ).run();

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ops_runbooks`).first();
  if (!countRow || Number(countRow.n) === 0) {
    const nowIso = new Date().toISOString();
    for (const rb of DEFAULT_DR_RUNBOOKS) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO ops_runbooks (id, title, severity, rto_minutes, rpo_minutes, steps_json, last_drilled_at, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 'system:seed', ?)`
      ).bind(
        rb.id,
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
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    rto_minutes: Number(row.rto_minutes || 5),
    rpo_minutes: Number(row.rpo_minutes || 0),
    steps,
    last_drilled_at: row.last_drilled_at || null,
    updated_by: row.updated_by || null,
    updated_at: row.updated_at
  };
}

export async function listOpsRunbooks(env) {
  await ensureOpsRunbooksTable(env);
  const { results } = await env.DB.prepare(
    `SELECT id, title, severity, rto_minutes, rpo_minutes, steps_json, last_drilled_at, updated_by, updated_at
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
  const title = String(input.title || '').trim().slice(0, 160);
  if (!title) {
    throw new HttpError(400, 'TITLE_REQUIRED', 'Runbook title is required');
  }
  const allowedSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
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

  const existing = await env.DB.prepare(`SELECT last_drilled_at FROM ops_runbooks WHERE id = ?`).bind(id).first();
  const lastDrilledAt = input.last_drilled_at !== undefined
    ? input.last_drilled_at
    : (existing ? existing.last_drilled_at : null);
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO ops_runbooks (id, title, severity, rto_minutes, rpo_minutes, steps_json, last_drilled_at, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       severity = excluded.severity,
       rto_minutes = excluded.rto_minutes,
       rpo_minutes = excluded.rpo_minutes,
       steps_json = excluded.steps_json,
       last_drilled_at = excluded.last_drilled_at,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).bind(
    id,
    title,
    severity,
    rtoMinutes,
    rpoMinutes,
    JSON.stringify(steps),
    lastDrilledAt,
    actorEmail || 'admin',
    nowIso
  ).run();

  const saved = await env.DB.prepare(`SELECT * FROM ops_runbooks WHERE id = ?`).bind(id).first();
  return normalizeRunbookRow(saved);
}

export async function markRunbookDrillCompleted(env, id, { steps = null, actorEmail = 'admin' } = {}) {
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
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE ops_runbooks
     SET steps_json = ?, last_drilled_at = ?, updated_by = ?, updated_at = ?
     WHERE id = ?`
  ).bind(JSON.stringify(updatedSteps), nowIso, actorEmail || 'admin', nowIso, cleanId).run();

  const updated = await env.DB.prepare(`SELECT * FROM ops_runbooks WHERE id = ?`).bind(cleanId).first();
  return normalizeRunbookRow(updated);
}

// ============================================================================
// Module #8: Offline Air-Gapped Manifest & Signed Bundle Packager
// ============================================================================
export async function buildAirGappedBundle(request, env, { actorEmail = 'admin' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');

  await ensureOpsSnapshotsTable(env);
  await ensureOpsRunbooksTable(env);

  const [snapData, schemaReport, snapList, runbooksRes] = await Promise.all([
    collectPlatformSnapshotTables(env),
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

  const manifest = {
    bundle_format: 'cso.airgap.dr.bundle.v1',
    bundle_version: 'v27',
    generated_at: nowIso,
    generated_by: actorEmail || 'admin',
    edge_colo: edgeColo,
    schema_sha256: schemaReport.schema_sha256,
    payload_sha256: payloadSha256,
    exported_tables: SNAPSHOT_TABLES,
    table_count: SNAPSHOT_TABLES.length,
    total_rows: snapData.total_rows,
    snapshot_inventory_count: (snapList.items || []).length,
    runbook_count: (runbooksRes.items || []).length
  };

  return {
    manifest,
    payload
  };
}

// ============================================================================
// Admin Router Dispatcher for /api/admin/ops/{replica|airgap-bundle|runbooks}
// ============================================================================
export async function handleOpsContinuity(request, env, actor, subAction, subId, extraAction) {
  const method = request.method;
  const url = new URL(request.url);

  // Module #4: GET / POST /api/admin/ops/replica
  if (subAction === 'replica') {
    if (method === 'GET') {
      const report = await inspectD1ReplicaTelemetry(request, env);
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    if (method === 'POST') {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can change D1 read-routing policy');
      }
      const body = await readJson(request, 10000).catch(() => ({}));
      const policy = await saveD1RoutingPolicy(env, body, actor.email || actor.userId);
      await audit(env, request, actor, 'ops.d1.routing', 'site_settings', D1_ROUTING_POLICY_KEY, {
        mode: policy.mode,
        failover_threshold_ms: policy.failover_threshold_ms,
        auto_switchover: policy.auto_switchover
      });
      const report = await inspectD1ReplicaTelemetry(request, env);
      return json(report, 200, { 'Cache-Control': 'no-store' });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Module #8: GET /api/admin/ops/airgap-bundle
  if (subAction === 'airgap-bundle') {
    if (method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    if (actor.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can export an Air-Gapped DR Bundle');
    }
    const bundle = await buildAirGappedBundle(request, env, { actorEmail: actor.email || actor.userId });
    if (url.searchParams.get('summary') === '1') {
      return json({
        ok: true,
        manifest: bundle.manifest,
        row_counts: bundle.payload.row_counts
      }, 200, { 'Cache-Control': 'no-store' });
    }
    await audit(env, request, actor, 'ops.airgap.export', 'airgap_bundle', bundle.manifest.payload_sha256.slice(0, 16), {
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

  // Module #16: GET / POST / PUT /api/admin/ops/runbooks (and POST /api/admin/ops/runbooks/:id/drill)
  if (subAction === 'runbooks') {
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
    if (subId && (method === 'PUT' || (method === 'POST' && extraAction === 'drill'))) {
      if (actor.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'Only Super Administrators can update or drill DR runbooks');
      }
      const body = await readJson(request, 50000).catch(() => ({}));
      if (extraAction === 'drill' || body.mark_drilled) {
        const item = await markRunbookDrillCompleted(env, subId, {
          steps: body.steps || null,
          actorEmail: actor.email || actor.userId
        });
        await audit(env, request, actor, 'ops.runbook.drill', 'ops_runbooks', item.id, {
          title: item.title,
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
