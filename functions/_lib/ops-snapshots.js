// Operations & Disaster Recovery: Automated Platform Snapshot Engine, R2 Cold Vault,
// SHA-256 Integrity Verifier, Non-Destructive DR Drill & Granular Point-in-Time Restorer.
// Powers Folder 17 Modules #1, #2, #3, #5, and #10.

import { HttpError, json, readJson } from './http.js';
import { audit } from './rbac.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SNAPSHOT_TABLES = [
  'site_settings',
  'site_pages',
  'site_page_revisions',
  'posts',
  'schemes_directory',
  'resources',
  'media_assets',
  'users'
];

// Allowlisted tables for DR drills and point-in-time restores (never overwrites `users` credentials or `ops_snapshots`).
export const RESTORABLE_TABLES = [
  'site_settings',
  'site_pages',
  'site_page_revisions',
  'posts',
  'schemes_directory',
  'resources',
  'media_assets'
];

const TABLE_PRIMARY_KEY = {
  site_settings: 'key',
  site_pages: 'id',
  site_page_revisions: 'id',
  posts: 'id',
  schemes_directory: 'id',
  resources: 'id',
  media_assets: 'id'
};

export async function sha256Hex(input) {
  const bytes = typeof input === 'string' ? enc.encode(input) : input;
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Recursively sorts object keys so canonical JSON serialization is 100% deterministic.
export function canonicalizeValue(val) {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(canonicalizeValue);
  const out = {};
  for (const k of Object.keys(val).sort()) {
    if (val[k] !== undefined) out[k] = canonicalizeValue(val[k]);
  }
  return out;
}

export function serializeCanonicalSnapshot(snapshotData) {
  return JSON.stringify(canonicalizeValue(snapshotData), null, 2);
}

export async function computeSnapshotChecksum(snapshotDataOrString) {
  const raw = typeof snapshotDataOrString === 'string'
    ? snapshotDataOrString
    : serializeCanonicalSnapshot(snapshotDataOrString);
  return sha256Hex(raw);
}

export async function ensureOpsSnapshotsTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ops_snapshots (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      row_counts_json TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL
    )`
  ).run();
}

async function safeQueryAll(db, sql) {
  try {
    const res = await db.prepare(sql).all();
    return Array.isArray(res && res.results) ? res.results : [];
  } catch {
    return [];
  }
}

export const EXCLUDED_SNAPSHOT_TABLES = new Set([
  'sessions',
  'admin_otps',
  'admin_rate_limits'
]);

export const SENSITIVE_SNAPSHOT_COLUMNS = new Set([
  'password_hash',
  'salt',
  'code_hash'
]);

function quoteIdent(name) {
  return '"' + String(name || '').replace(/"/g, '""') + '"';
}

export async function collectPlatformSnapshotTables(env) {
  const db = env.DB;
  const { results: masterRows } = await db.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '_cf_%'
     ORDER BY name ASC`
  ).all();

  const discoveredNames = (masterRows || [])
    .map(r => String(r && r.name || '').trim())
    .filter(name => name && !EXCLUDED_SNAPSHOT_TABLES.has(name));

  const tables = {};
  const row_counts = {};
  let total_rows = 0;

  for (const name of discoveredNames) {
    const safeTbl = quoteIdent(name);
    let cols = [];
    try {
      const pragma = await db.prepare(`PRAGMA table_info(${safeTbl})`).all();
      cols = (pragma && Array.isArray(pragma.results) ? pragma.results : [])
        .map(c => String(c.name || '').trim())
        .filter(Boolean);
    } catch {
      cols = [];
    }

    const safeCols = cols.filter(c => !SENSITIVE_SNAPSHOT_COLUMNS.has(c.toLowerCase()));
    if (!safeCols.length) {
      tables[name] = [];
      row_counts[name] = 0;
      continue;
    }

    const selectCols = safeCols.map(quoteIdent).join(', ');
    const orderCol = safeCols.includes('id')
      ? quoteIdent('id')
      : (safeCols.includes('key') ? quoteIdent('key') : 'rowid');

    const rows = await safeQueryAll(db, `SELECT ${selectCols} FROM ${safeTbl} ORDER BY ${orderCol} ASC`);
    // Defensive scrub in case any driver returns an unexpected sensitive key
    const cleanRows = rows.map(row => {
      const out = {};
      for (const k of Object.keys(row || {})) {
        if (!SENSITIVE_SNAPSHOT_COLUMNS.has(k.toLowerCase())) {
          out[k] = row[k];
        }
      }
      return out;
    });

    tables[name] = cleanRows;
    row_counts[name] = cleanRows.length;
    total_rows += cleanRows.length;
  }

  return { tables, row_counts, total_rows };
}

export async function createPlatformSnapshot(env, { label = '', triggerType = 'manual', createdBy = 'staff' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 media storage binding unavailable');

  await ensureOpsSnapshotsTable(env);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const tsCompact = createdAt.replace(/[:.]/g, '-');
  const cleanLabel = String(label || '').trim().slice(0, 120) || `Platform Snapshot (${createdAt.slice(0, 10)})`;
  const r2Key = `backups/snapshots/${tsCompact}-${id}.json`;

  const { tables, row_counts, total_rows } = await collectPlatformSnapshotTables(env);

  const snapshotEnvelope = {
    schema_version: 'cso-snapshot-v1',
    snapshot_id: id,
    label: cleanLabel,
    created_at: createdAt,
    created_by: createdBy,
    trigger_type: triggerType,
    row_counts,
    total_rows,
    tables
  };

  const canonicalJson = serializeCanonicalSnapshot(snapshotEnvelope);
  const bytes = enc.encode(canonicalJson);
  const sha256 = await sha256Hex(bytes);

  await env.MEDIA.put(r2Key, bytes, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      snapshot_id: id,
      label: cleanLabel,
      sha256,
      created_by: String(createdBy || 'staff'),
      created_at: createdAt,
      table_counts: JSON.stringify(row_counts)
    }
  });

  await env.DB.prepare(
    `INSERT INTO ops_snapshots (id, label, r2_key, sha256, size_bytes, row_counts_json, trigger_type, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    cleanLabel,
    r2Key,
    sha256,
    bytes.byteLength,
    JSON.stringify(row_counts),
    triggerType,
    createdBy,
    createdAt
  ).run();

  return {
    id,
    label: cleanLabel,
    r2_key: r2Key,
    sha256,
    size_bytes: bytes.byteLength,
    row_counts,
    total_rows,
    trigger_type: triggerType,
    created_by: createdBy,
    created_at: createdAt,
    r2_exists: true
  };
}

function presentSnapshotRow(row, r2Exists = true) {
  let rowCounts = {};
  try { rowCounts = JSON.parse(row.row_counts_json || '{}'); } catch {}
  const totalRows = Object.values(rowCounts).reduce((acc, v) => acc + (Number(v) || 0), 0);
  return {
    id: row.id,
    label: row.label,
    r2_key: row.r2_key,
    sha256: row.sha256,
    size_bytes: Number(row.size_bytes) || 0,
    row_counts: rowCounts,
    total_rows: totalRows,
    trigger_type: row.trigger_type,
    created_by: row.created_by,
    created_at: row.created_at,
    r2_exists: Boolean(r2Exists)
  };
}

export async function listPlatformSnapshots(env) {
  await ensureOpsSnapshotsTable(env);
  const { results } = await env.DB.prepare(
    'SELECT * FROM ops_snapshots ORDER BY created_at DESC, id DESC LIMIT 100'
  ).all();
  const rows = results || [];

  const items = await Promise.all(rows.map(async row => {
    let exists = false;
    if (env.MEDIA && typeof env.MEDIA.head === 'function') {
      try {
        const h = await env.MEDIA.head(row.r2_key);
        exists = Boolean(h);
      } catch {
        exists = false;
      }
    } else if (env.MEDIA && typeof env.MEDIA.get === 'function') {
      try {
        const obj = await env.MEDIA.get(row.r2_key);
        exists = Boolean(obj);
      } catch {
        exists = false;
      }
    }
    return presentSnapshotRow(row, exists);
  }));

  return { items, total: items.length };
}

export async function verifyPlatformSnapshot(env, id) {
  await ensureOpsSnapshotsTable(env);
  const row = await env.DB.prepare('SELECT * FROM ops_snapshots WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Snapshot not found');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 storage unavailable');

  const obj = await env.MEDIA.get(row.r2_key);
  const verifiedAt = new Date().toISOString();
  if (!obj) {
    return {
      id: row.id,
      valid: false,
      reason: 'MISSING_R2_OBJECT',
      expected_sha256: row.sha256,
      r2_meta_sha256: null,
      actual_sha256: null,
      size_bytes: 0,
      verified_at: verifiedAt
    };
  }

  const buf = await obj.arrayBuffer();
  const actualSha256 = await sha256Hex(new Uint8Array(buf));
  const r2MetaSha = obj.customMetadata && obj.customMetadata.sha256 ? obj.customMetadata.sha256 : null;
  const matchesD1 = actualSha256 === row.sha256;
  const matchesR2Meta = !r2MetaSha || actualSha256 === r2MetaSha;
  const valid = matchesD1 && matchesR2Meta;

  return {
    id: row.id,
    valid,
    expected_sha256: row.sha256,
    r2_meta_sha256: r2MetaSha,
    actual_sha256: actualSha256,
    size_bytes: buf.byteLength,
    verified_at: verifiedAt
  };
}

export async function downloadPlatformSnapshot(env, id) {
  await ensureOpsSnapshotsTable(env);
  const row = await env.DB.prepare('SELECT * FROM ops_snapshots WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Snapshot not found');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 storage unavailable');

  const obj = await env.MEDIA.get(row.r2_key);
  if (!obj) throw new HttpError(404, 'NOT_FOUND', 'Snapshot object missing in R2 cold vault');

  const safeId = String(row.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const body = obj.body !== undefined ? obj.body : await obj.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="cso-snapshot-${safeId}.json"`,
      'Cache-Control': 'no-store',
      'X-Snapshot-SHA256': row.sha256
    }
  });
}

// Loads and cryptographically verifies a snapshot from R2 before reading its tables.
async function loadVerifiedSnapshotEnvelope(env, id) {
  await ensureOpsSnapshotsTable(env);
  const row = await env.DB.prepare('SELECT * FROM ops_snapshots WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Snapshot not found');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 storage unavailable');

  const obj = await env.MEDIA.get(row.r2_key);
  if (!obj) throw new HttpError(404, 'NOT_FOUND', 'Snapshot object missing in R2 cold vault');

  const buf = await obj.arrayBuffer();
  const u8 = new Uint8Array(buf);
  const actualSha256 = await sha256Hex(u8);
  const r2MetaSha = obj.customMetadata && obj.customMetadata.sha256 ? obj.customMetadata.sha256 : null;
  if (actualSha256 !== row.sha256 || (r2MetaSha && actualSha256 !== r2MetaSha)) {
    throw new HttpError(422, 'CHECKSUM_MISMATCH', 'Snapshot SHA-256 verification failed; aborting operation');
  }

  let envelope;
  try {
    envelope = JSON.parse(dec.decode(u8));
  } catch {
    throw new HttpError(422, 'INVALID_SNAPSHOT_JSON', 'Snapshot JSON payload is malformed');
  }
  if (!envelope || typeof envelope.tables !== 'object' || envelope.tables === null) {
    throw new HttpError(422, 'INVALID_SNAPSHOT_SCHEMA', 'Snapshot payload is missing table definitions');
  }

  return { row, envelope, sha256: actualSha256, size_bytes: u8.byteLength };
}

function normalizeRequestedTables(tablesInput) {
  if (!Array.isArray(tablesInput) || !tablesInput.length) return [];
  const seen = new Set();
  const out = [];
  for (const raw of tablesInput) {
    const name = String(raw || '').trim();
    if (RESTORABLE_TABLES.includes(name) && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

// Module #2: Non-Destructive Disaster Recovery Drill
export async function runDisasterRecoveryDrill(env, id, { tables = null } = {}) {
  const t0 = Date.now();
  const targetTables = tables && Array.isArray(tables) && tables.length
    ? normalizeRequestedTables(tables)
    : RESTORABLE_TABLES.slice();
  if (!targetTables.length) {
    throw new HttpError(400, 'INVALID_TABLES', 'Select at least one allowlisted table for the DR drill');
  }

  const { row, envelope, sha256, size_bytes } = await loadVerifiedSnapshotEnvelope(env, id);
  const live = await collectPlatformSnapshotTables(env);

  const table_diffs = {};
  let totalSnapshotRows = 0;
  let totalLiveRows = 0;
  let totalToInsert = 0;
  let totalToUpdate = 0;
  let totalUnchanged = 0;
  let totalLiveOnly = 0;

  for (const tbl of targetTables) {
    const pk = TABLE_PRIMARY_KEY[tbl] || 'id';
    const snapRows = Array.isArray(envelope.tables[tbl]) ? envelope.tables[tbl] : [];
    const liveRows = Array.isArray(live.tables[tbl]) ? live.tables[tbl] : [];

    const liveMap = new Map();
    for (const lr of liveRows) {
      if (lr && lr[pk] !== undefined && lr[pk] !== null) {
        liveMap.set(String(lr[pk]), JSON.stringify(canonicalizeValue(lr)));
      }
    }

    const seenKeys = new Set();
    let toInsert = 0;
    let toUpdate = 0;
    let unchanged = 0;

    for (const sr of snapRows) {
      if (!sr || sr[pk] === undefined || sr[pk] !== 0 && !sr[pk]) continue;
      const k = String(sr[pk]);
      seenKeys.add(k);
      if (!liveMap.has(k)) {
        toInsert++;
      } else {
        const snapCanon = JSON.stringify(canonicalizeValue(sr));
        if (liveMap.get(k) === snapCanon) unchanged++;
        else toUpdate++;
      }
    }

    let liveOnly = 0;
    for (const lk of liveMap.keys()) {
      if (!seenKeys.has(lk)) liveOnly++;
    }

    table_diffs[tbl] = {
      table: tbl,
      primary_key: pk,
      snapshot_rows: snapRows.length,
      live_rows: liveRows.length,
      to_insert: toInsert,
      to_update: toUpdate,
      unchanged,
      live_only_rows: liveOnly
    };

    totalSnapshotRows += snapRows.length;
    totalLiveRows += liveRows.length;
    totalToInsert += toInsert;
    totalToUpdate += toUpdate;
    totalUnchanged += unchanged;
    totalLiveOnly += liveOnly;
  }

  const latencyMs = Math.max(1, Date.now() - t0);
  return {
    ok: true,
    readiness: 'PASS',
    snapshot_id: row.id,
    snapshot_label: row.label,
    snapshot_created_at: row.created_at,
    sha256_verified: true,
    sha256,
    size_bytes,
    latency_ms: latencyMs,
    drilled_at: new Date().toISOString(),
    tables_checked: targetTables,
    totals: {
      snapshot_rows: totalSnapshotRows,
      live_rows: totalLiveRows,
      to_insert: totalToInsert,
      to_update: totalToUpdate,
      unchanged: totalUnchanged,
      live_only_rows: totalLiveOnly
    },
    table_diffs
  };
}

async function getLiveTableColumns(db, tableName) {
  const { results } = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  return (results || []).map(c => c.name).filter(Boolean);
}

// Module #3: Granular Point-in-Time Restore with Automatic Pre-Restore Safety Backup
export async function restorePlatformSnapshot(env, id, { tables = [], mode = 'upsert', confirmPhrase = '', createdBy = 'staff' } = {}) {
  if (String(confirmPhrase || '').trim() !== 'RESTORE') {
    throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Type RESTORE in the confirmation field to authorize state restoration');
  }
  const cleanMode = mode === 'replace' ? 'replace' : (mode === 'upsert' ? 'upsert' : null);
  if (!cleanMode) {
    throw new HttpError(400, 'INVALID_MODE', 'Restore mode must be "upsert" or "replace"');
  }

  const targetTables = normalizeRequestedTables(tables);
  if (!targetTables.length) {
    throw new HttpError(400, 'EMPTY_TABLES', 'Select at least one allowlisted table to restore');
  }

  // 1. Re-verify target snapshot SHA-256 integrity BEFORE touching anything
  const { row, envelope, sha256 } = await loadVerifiedSnapshotEnvelope(env, id);

  // 2. Mandatory Safety Guard: create an automatic pre-restore backup in R2 + D1
  const safetySnapshot = await createPlatformSnapshot(env, {
    label: `Auto-Pre-Restore Safety Backup (before ${row.label.slice(0, 50)})`,
    triggerType: 'pre_restore',
    createdBy
  });

  // 3. Restore each selected allowlisted table using parameterized statements
  const row_summary = {};
  for (const tbl of targetTables) {
    const validCols = await getLiveTableColumns(env.DB, tbl);
    if (!validCols.length) continue;
    const validColSet = new Set(validCols);
    const snapRows = Array.isArray(envelope.tables[tbl]) ? envelope.tables[tbl] : [];

    const stmts = [];
    if (cleanMode === 'replace') {
      stmts.push(env.DB.prepare(`DELETE FROM ${tbl}`));
    }

    let restoredCount = 0;
    for (const sr of snapRows) {
      if (!sr || typeof sr !== 'object') continue;
      const cols = Object.keys(sr).filter(c => validColSet.has(c) && /^[a-zA-Z0-9_]+$/.test(c));
      if (!cols.length) continue;
      const placeholders = cols.map(() => '?').join(', ');
      const vals = cols.map(c => (sr[c] === undefined ? null : sr[c]));
      stmts.push(
        env.DB.prepare(`INSERT OR REPLACE INTO ${tbl} (${cols.join(', ')}) VALUES (${placeholders})`).bind(...vals)
      );
      restoredCount++;
    }

    if (stmts.length) {
      if (typeof env.DB.batch === 'function') {
        await env.DB.batch(stmts);
      } else {
        for (const st of stmts) await st.run();
      }
    }

    row_summary[tbl] = {
      mode: cleanMode,
      restored_rows: restoredCount
    };
  }

  return {
    ok: true,
    snapshot_id: row.id,
    snapshot_label: row.label,
    sha256,
    mode: cleanMode,
    safety_snapshot_id: safetySnapshot.id,
    safety_snapshot_r2_key: safetySnapshot.r2_key,
    restored_tables: targetTables,
    row_summary,
    restored_at: new Date().toISOString()
  };
}

export async function deletePlatformSnapshot(env, id) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureOpsSnapshotsTable(env);
  const row = await env.DB.prepare('SELECT id, label, r2_key FROM ops_snapshots WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Snapshot not found');

  if (env.MEDIA && row.r2_key && typeof env.MEDIA.delete === 'function') {
    try {
      await env.MEDIA.delete(row.r2_key);
    } catch {}
  }

  await env.DB.prepare('DELETE FROM ops_snapshots WHERE id = ?').bind(id).run();
  return {
    ok: true,
    deleted_id: row.id,
    label: row.label,
    r2_key: row.r2_key
  };
}

// Route dispatcher for /api/admin/ops/snapshots[/:id[/download|/verify|/drill|/restore]]
export async function handleOpsSnapshots(request, env, actor, subId, action) {
  const method = request.method;

  if (!subId) {
    if (method === 'GET') {
      return json(await listPlatformSnapshots(env));
    }
    if (method === 'POST') {
      if (actor.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Only administrators can create platform snapshots');
      const body = await readJson(request, 10000).catch(() => ({}));
      const snap = await createPlatformSnapshot(env, {
        label: body && body.label ? String(body.label) : '',
        triggerType: body && body.trigger_type === 'scheduled' ? 'scheduled' : 'manual',
        createdBy: actor.email || actor.userId
      });
      await audit(env, request, actor, 'ops.snapshot.create', 'ops_snapshot', snap.id, {
        label: snap.label,
        r2_key: snap.r2_key,
        sha256: snap.sha256,
        size_bytes: snap.size_bytes,
        total_rows: snap.total_rows
      });
      return json({ snapshot: snap }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  if (!action && method === 'DELETE') {
    if (actor.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Only administrators can delete platform snapshots');
    const result = await deletePlatformSnapshot(env, subId);
    await audit(env, request, actor, 'ops.snapshot.delete', 'ops_snapshot', subId, {
      label: result.label,
      r2_key: result.r2_key
    });
    return json(result);
  }

  if (action === 'download' && method === 'GET') {
    await audit(env, request, actor, 'ops.snapshot.download', 'ops_snapshot', subId, null);
    return await downloadPlatformSnapshot(env, subId);
  }

  if (action === 'verify' && method === 'POST') {
    const result = await verifyPlatformSnapshot(env, subId);
    await audit(env, request, actor, 'ops.snapshot.verify', 'ops_snapshot', subId, {
      valid: result.valid,
      expected_sha256: result.expected_sha256,
      actual_sha256: result.actual_sha256
    });
    return json(result);
  }

  if (action === 'drill' && method === 'POST') {
    const body = await readJson(request, 20000).catch(() => ({}));
    const report = await runDisasterRecoveryDrill(env, subId, {
      tables: body && Array.isArray(body.tables) ? body.tables : null
    });
    await audit(env, request, actor, 'ops.dr.drill', 'ops_snapshot', subId, {
      readiness: report.readiness,
      latency_ms: report.latency_ms,
      tables_checked: report.tables_checked,
      totals: report.totals
    });
    return json(report);
  }

  if (action === 'restore' && method === 'POST') {
    if (actor.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Only administrators can execute point-in-time state restores');
    const body = await readJson(request, 20000);
    const result = await restorePlatformSnapshot(env, subId, {
      tables: body && body.tables,
      mode: body && body.mode,
      confirmPhrase: body && body.confirm_phrase,
      createdBy: actor.email || actor.userId
    });
    await audit(env, request, actor, 'ops.dr.restore', 'ops_snapshot', subId, {
      mode: result.mode,
      safety_snapshot_id: result.safety_snapshot_id,
      restored_tables: result.restored_tables,
      row_summary: result.row_summary
    });
    return json(result);
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown snapshot route');
}
