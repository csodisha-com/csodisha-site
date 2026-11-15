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
  'code_hash',
  'totp_secret'
]);

export const CORE_CONTENT_TABLES = new Set(RESTORABLE_TABLES);

export function sanitizeSnapshotLabel(raw) {
  return String(raw || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 80);
}

export function normalizeSnapshotScope(raw) {
  if (raw === undefined || raw === null || raw === '') return 'all';
  const s = String(raw).trim();
  if (s === 'all' || s === 'content_only') return s;
  throw new HttpError(400, 'INVALID_SCOPE', 'Snapshot scope must be "all" or "content_only"');
}

function quoteIdent(name) {
  return '"' + String(name || '').replace(/"/g, '""') + '"';
}

async function discoverMasterTables(db) {
  const { results: masterRows } = await db.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '_cf_%'
     ORDER BY name ASC`
  ).all();
  return (masterRows || []).map(r => String((r && r.name) || '').trim()).filter(Boolean);
}

async function getTableSchemaInfo(db, name) {
  const safeTbl = quoteIdent(name);
  try {
    const pragma = await db.prepare(`PRAGMA table_info(${safeTbl})`).all();
    const rows = pragma && Array.isArray(pragma.results) ? pragma.results : [];
    const columns = rows.map(c => String(c.name || '').trim()).filter(Boolean);
    const pkColumns = rows
      .filter(c => Number(c.pk) > 0)
      .sort((a, b) => Number(a.pk) - Number(b.pk))
      .map(c => String(c.name || '').trim())
      .filter(Boolean);
    return { columns, pkColumns };
  } catch {
    return { columns: [], pkColumns: [] };
  }
}

async function getTableColumns(db, name) {
  const info = await getTableSchemaInfo(db, name);
  return info.columns;
}

async function ensureSiteSettingsTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT,
      updated_by TEXT,
      updated_at TEXT
    )`
  ).run();
}

async function readLastDrDrill(env) {
  try {
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'ops_last_dr_drill'`).first();
    if (!row || !row.value_json) return null;
    return JSON.parse(row.value_json);
  } catch {
    return null;
  }
}

async function persistLastDrDrill(env, summary) {
  try {
    await ensureSiteSettingsTable(env);
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
       VALUES ('ops_last_dr_drill', ?, 'dr-engine', ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(JSON.stringify(summary), summary.drilled_at).run();
  } catch {}
}

async function readLastRestore(env) {
  try {
    const row = await env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'ops_last_restore'`).first();
    if (!row || !row.value_json) return null;
    return JSON.parse(row.value_json);
  } catch {
    return null;
  }
}

async function persistLastRestore(env, summary) {
  try {
    await ensureSiteSettingsTable(env);
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value_json, updated_by, updated_at)
       VALUES ('ops_last_restore', ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(JSON.stringify(summary), String(summary.actor || 'restore-engine'), summary.restored_at).run();
  } catch {}
}

export async function previewPlatformSnapshotScope(env) {
  if (!env || !env.DB) return { discovered_tables: [], excluded_tables: [], scrubbed_columns: [] };
  const db = env.DB;
  const masterNames = await discoverMasterTables(db);
  const excludedSet = new Set();
  const scrubbedColsSet = new Set();
  const discovered_tables = [];

  for (const name of masterNames) {
    if (EXCLUDED_SNAPSHOT_TABLES.has(name)) {
      excludedSet.add(name);
      continue;
    }
    const cols = await getTableColumns(db, name);
    for (const c of cols) {
      if (SENSITIVE_SNAPSHOT_COLUMNS.has(c.toLowerCase())) {
        scrubbedColsSet.add(c.toLowerCase());
      }
    }
    const safeTbl = quoteIdent(name);
    let rowsCount = 0;
    try {
      const cntRow = await db.prepare(`SELECT COUNT(*) AS cnt FROM ${safeTbl}`).first();
      rowsCount = Number(cntRow && cntRow.cnt) || 0;
    } catch {
      rowsCount = 0;
    }
    discovered_tables.push({
      table: name,
      rows: rowsCount,
      is_core_content: CORE_CONTENT_TABLES.has(name)
    });
  }

  return {
    discovered_tables,
    excluded_tables: Array.from(excludedSet).sort(),
    scrubbed_columns: Array.from(scrubbedColsSet).sort()
  };
}

export async function collectPlatformSnapshotTables(env, { scope = 'all' } = {}) {
  const cleanScope = normalizeSnapshotScope(scope);
  const db = env.DB;
  const masterNames = await discoverMasterTables(db);

  const scrubbedTablesSet = new Set();
  const scrubbedColsSet = new Set();
  const discoveredNames = [];

  for (const name of masterNames) {
    if (EXCLUDED_SNAPSHOT_TABLES.has(name)) {
      scrubbedTablesSet.add(name);
      continue;
    }
    if (cleanScope === 'content_only' && !CORE_CONTENT_TABLES.has(name)) {
      continue;
    }
    discoveredNames.push(name);
  }

  const tables = {};
  const row_counts = {};
  let total_rows = 0;

  for (const name of discoveredNames) {
    const safeTbl = quoteIdent(name);
    const cols = await getTableColumns(db, name);
    const safeCols = [];
    for (const c of cols) {
      if (SENSITIVE_SNAPSHOT_COLUMNS.has(c.toLowerCase())) {
        scrubbedColsSet.add(c.toLowerCase());
      } else {
        safeCols.push(c);
      }
    }
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
        if (SENSITIVE_SNAPSHOT_COLUMNS.has(k.toLowerCase())) {
          scrubbedColsSet.add(k.toLowerCase());
        } else {
          out[k] = row[k];
        }
      }
      return out;
    });

    tables[name] = cleanRows;
    row_counts[name] = cleanRows.length;
    total_rows += cleanRows.length;
  }

  return {
    tables,
    row_counts,
    total_rows,
    scope: cleanScope,
    scrubbed_tables: Array.from(scrubbedTablesSet).sort(),
    scrubbed_columns: Array.from(scrubbedColsSet).sort()
  };
}

export async function createPlatformSnapshot(env, { label = '', scope = 'all', triggerType = 'manual', createdBy = 'staff' } = {}) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 media storage binding unavailable');

  const cleanScope = normalizeSnapshotScope(scope);
  await ensureOpsSnapshotsTable(env);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const tsCompact = createdAt.replace(/[:.]/g, '-');
  const cleanLabel = sanitizeSnapshotLabel(label) || `Platform Snapshot (${createdAt.slice(0, 10)})`;
  const r2Key = `backups/snapshots/${tsCompact}-${id}.json`;

  const { tables, row_counts, total_rows, scrubbed_tables, scrubbed_columns } = await collectPlatformSnapshotTables(env, { scope: cleanScope });

  const snapshotEnvelope = {
    schema_version: 'cso-snapshot-v1',
    snapshot_id: id,
    label: cleanLabel,
    scope: cleanScope,
    created_at: createdAt,
    created_by: createdBy,
    trigger_type: triggerType,
    scrubbed_tables,
    scrubbed_columns,
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
    scope: cleanScope,
    r2_key: r2Key,
    sha256,
    size_bytes: bytes.byteLength,
    row_counts,
    total_rows,
    scrubbed_tables,
    scrubbed_columns,
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
  const [{ results }, preview, lastDrill, lastRestore] = await Promise.all([
    env.DB.prepare('SELECT * FROM ops_snapshots ORDER BY created_at DESC, id DESC LIMIT 100').all(),
    previewPlatformSnapshotScope(env),
    readLastDrDrill(env),
    readLastRestore(env)
  ]);
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

  return {
    items,
    total: items.length,
    discovered_tables: preview.discovered_tables,
    excluded_tables: preview.excluded_tables,
    scrubbed_columns: preview.scrubbed_columns,
    last_drill: lastDrill,
    last_restore: lastRestore
  };
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

function buildRowKey(row, pkCols) {
  if (!row || typeof row !== 'object') return null;
  if (pkCols.length === 1) {
    const k = pkCols[0];
    if (row[k] === undefined || row[k] === null) return null;
    return String(row[k]);
  }
  const parts = [];
  for (const k of pkCols) {
    if (row[k] === undefined || row[k] === null) return null;
    parts.push(String(row[k]));
  }
  return parts.join('\u0000');
}

function projectCommonColumns(row, cols) {
  const out = {};
  for (const c of cols) {
    if (Object.prototype.hasOwnProperty.call(row, c)) {
      out[c] = row[c];
    }
  }
  return out;
}

// Module #2: Non-Destructive Disaster Recovery Drill
export async function runDisasterRecoveryDrill(env, id, { tables = null } = {}) {
  const t0 = Date.now();
  const { row, envelope, sha256, size_bytes } = await loadVerifiedSnapshotEnvelope(env, id);

  const snapshotTableNames = Object.keys(envelope.tables || {})
    .filter(t => /^[a-zA-Z0-9_]+$/.test(t) && !EXCLUDED_SNAPSHOT_TABLES.has(t))
    .sort();

  let targetTables;
  if (tables && Array.isArray(tables) && tables.length) {
    const seen = new Set();
    targetTables = [];
    for (const raw of tables) {
      const name = String(raw || '').trim();
      if (name && /^[a-zA-Z0-9_]+$/.test(name) && !EXCLUDED_SNAPSHOT_TABLES.has(name) && !seen.has(name)) {
        seen.add(name);
        targetTables.push(name);
      }
    }
  } else {
    targetTables = snapshotTableNames;
  }

  if (!targetTables.length) {
    throw new HttpError(400, 'INVALID_TABLES', 'Select at least one valid table for the DR drill');
  }

  const liveMasterNames = await discoverMasterTables(env.DB);
  const liveMasterSet = new Set(liveMasterNames);
  const live = await collectPlatformSnapshotTables(env);

  const table_diffs = {};
  const schema_drift_warnings = [];
  let totalSnapshotRows = 0;
  let totalLiveRows = 0;
  let totalToInsert = 0;
  let totalToUpdate = 0;
  let totalUnchanged = 0;
  let totalLiveOnly = 0;

  for (const tbl of targetTables) {
    const snapRows = Array.isArray(envelope.tables[tbl]) ? envelope.tables[tbl] : [];
    const liveExists = liveMasterSet.has(tbl);

    if (!liveExists) {
      const fallbackPk = TABLE_PRIMARY_KEY[tbl] || 'id';
      const warning = {
        table: tbl,
        type: 'TABLE_MISSING_IN_LIVE',
        missing_in_live: [],
        added_in_live: [],
        message: `Table "${tbl}" exists in snapshot (${snapRows.length} rows) but is missing in live D1.`
      };
      schema_drift_warnings.push(warning);
      table_diffs[tbl] = {
        table: tbl,
        primary_key: fallbackPk,
        snapshot_rows: snapRows.length,
        live_rows: 0,
        to_insert: snapRows.length,
        to_update: 0,
        unchanged: 0,
        live_only_rows: 0,
        schema_status: 'DRIFT',
        drift_warning: warning
      };
      totalSnapshotRows += snapRows.length;
      totalToInsert += snapRows.length;
      continue;
    }

    const schemaInfo = await getTableSchemaInfo(env.DB, tbl);
    const pkCols = schemaInfo.pkColumns.length
      ? schemaInfo.pkColumns
      : [TABLE_PRIMARY_KEY[tbl] || 'id'];
    const pkLabel = pkCols.join('+');

    const liveCols = schemaInfo.columns.filter(c => !SENSITIVE_SNAPSHOT_COLUMNS.has(c.toLowerCase()));
    const snapColsSet = new Set();
    for (const sr of snapRows) {
      if (sr && typeof sr === 'object') {
        for (const k of Object.keys(sr)) {
          if (!SENSITIVE_SNAPSHOT_COLUMNS.has(k.toLowerCase())) snapColsSet.add(k);
        }
      }
    }

    const liveColsSet = new Set(liveCols);
    const missingInLive = snapRows.length
      ? Array.from(snapColsSet).filter(c => !liveColsSet.has(c)).sort()
      : [];
    const addedInLive = snapRows.length
      ? liveCols.filter(c => !snapColsSet.has(c)).sort()
      : [];

    let driftWarning = null;
    if (missingInLive.length || addedInLive.length) {
      const parts = [];
      if (missingInLive.length) parts.push('missing in live: ' + missingInLive.join(', '));
      if (addedInLive.length) parts.push('added in live: ' + addedInLive.join(', '));
      driftWarning = {
        table: tbl,
        type: 'COLUMN_DRIFT',
        missing_in_live: missingInLive,
        added_in_live: addedInLive,
        message: `Schema drift on "${tbl}" (${parts.join(' · ')})`
      };
      schema_drift_warnings.push(driftWarning);
    }

    const commonCols = driftWarning
      ? liveCols.filter(c => snapColsSet.has(c)).sort()
      : null;

    const liveRows = Array.isArray(live.tables[tbl]) ? live.tables[tbl] : [];
    const liveMap = new Map();
    for (const lr of liveRows) {
      const key = buildRowKey(lr, pkCols);
      if (key !== null) {
        const val = commonCols ? projectCommonColumns(lr, commonCols) : lr;
        liveMap.set(key, JSON.stringify(canonicalizeValue(val)));
      }
    }

    const seenKeys = new Set();
    let toInsert = 0;
    let toUpdate = 0;
    let unchanged = 0;

    for (const sr of snapRows) {
      const k = buildRowKey(sr, pkCols);
      if (k === null) continue;
      seenKeys.add(k);
      if (!liveMap.has(k)) {
        toInsert++;
      } else {
        const snapVal = commonCols ? projectCommonColumns(sr, commonCols) : sr;
        const snapCanon = JSON.stringify(canonicalizeValue(snapVal));
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
      primary_key: pkLabel,
      snapshot_rows: snapRows.length,
      live_rows: liveRows.length,
      to_insert: toInsert,
      to_update: toUpdate,
      unchanged,
      live_only_rows: liveOnly,
      schema_status: driftWarning ? 'DRIFT' : 'OK',
      drift_warning: driftWarning
    };

    totalSnapshotRows += snapRows.length;
    totalLiveRows += liveRows.length;
    totalToInsert += toInsert;
    totalToUpdate += toUpdate;
    totalUnchanged += unchanged;
    totalLiveOnly += liveOnly;
  }

  const latencyMs = Math.max(1, Date.now() - t0);
  const readiness = schema_drift_warnings.length > 0 ? 'WARN' : 'PASS';
  const drilledAt = new Date().toISOString();

  const lastDrillSummary = {
    drilled_at: drilledAt,
    snapshot_id: row.id,
    snapshot_label: row.label,
    tables_tested: targetTables.length,
    total_inserts: totalToInsert,
    total_updates: totalToUpdate,
    total_unchanged: totalUnchanged,
    total_live_only: totalLiveOnly,
    drift_warnings_count: schema_drift_warnings.length,
    latency_ms: latencyMs,
    readiness
  };
  await persistLastDrDrill(env, lastDrillSummary);

  return {
    ok: true,
    readiness,
    snapshot_id: row.id,
    snapshot_label: row.label,
    snapshot_created_at: row.created_at,
    sha256_verified: true,
    sha256,
    size_bytes,
    latency_ms: latencyMs,
    drilled_at: drilledAt,
    tables_checked: targetTables,
    schema_drift_warnings,
    last_drill: lastDrillSummary,
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
  const t0 = Date.now();
  if (String(confirmPhrase || '').trim() !== 'RESTORE') {
    throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Type RESTORE in the confirmation field to authorize state restoration');
  }
  const cleanMode = mode === 'replace' ? 'replace' : (mode === 'upsert' ? 'upsert' : null);
  if (!cleanMode) {
    throw new HttpError(400, 'INVALID_MODE', 'Restore mode must be "upsert" or "replace"');
  }
  if (!Array.isArray(tables) || !tables.length) {
    throw new HttpError(400, 'EMPTY_TABLES', 'Select at least one valid table to restore');
  }

  // 1. Re-verify target snapshot SHA-256 integrity BEFORE touching anything
  const { row, envelope, sha256 } = await loadVerifiedSnapshotEnvelope(env, id);

  // 2. Dynamically validate requested tables against both snapshot payload and live sqlite_master
  //    (never overwrite auth/session/credential tables or the ops_snapshots ledger)
  const liveMasterSet = new Set(await discoverMasterTables(env.DB));
  const snapshotTables = envelope.tables || {};
  const seen = new Set();
  const targetTables = [];
  for (const raw of tables) {
    const name = String(raw || '').trim();
    if (
      name &&
      /^[a-zA-Z0-9_]+$/.test(name) &&
      !EXCLUDED_SNAPSHOT_TABLES.has(name) &&
      name !== 'ops_snapshots' &&
      name !== 'users' &&
      Object.prototype.hasOwnProperty.call(snapshotTables, name) &&
      liveMasterSet.has(name) &&
      !seen.has(name)
    ) {
      seen.add(name);
      targetTables.push(name);
    }
  }
  if (!targetTables.length) {
    throw new HttpError(400, 'EMPTY_TABLES', 'No selected tables are eligible for restore in live D1');
  }

  // 3. Mandatory Safety Guard: create an automatic pre-restore backup in R2 + D1
  const safetySnapshot = await createPlatformSnapshot(env, {
    label: `Auto-Pre-Restore Safety Backup (before ${row.label.slice(0, 40)})`,
    triggerType: 'pre_restore',
    createdBy
  });

  // 4. Restore each selected table using column intersection & credential scrubbing
  const row_summary = {};
  let totalRowsRestored = 0;

  for (const tbl of targetTables) {
    const safeTbl = quoteIdent(tbl);
    const schemaInfo = await getTableSchemaInfo(env.DB, tbl);
    const safeLiveCols = schemaInfo.columns.filter(c => !SENSITIVE_SNAPSHOT_COLUMNS.has(c.toLowerCase()));
    if (!safeLiveCols.length) {
      row_summary[tbl] = {
        mode: cleanMode,
        restored_rows: 0,
        rows_restored: 0,
        columns_skipped: []
      };
      continue;
    }

    const safeLiveColSet = new Set(safeLiveCols);
    const snapRows = Array.isArray(snapshotTables[tbl]) ? snapshotTables[tbl] : [];
    const skippedColsSet = new Set();

    const stmts = [];
    if (cleanMode === 'replace') {
      stmts.push(env.DB.prepare(`DELETE FROM ${safeTbl}`));
    }

    let restoredCount = 0;
    for (const sr of snapRows) {
      if (!sr || typeof sr !== 'object') continue;
      const cols = [];
      for (const c of Object.keys(sr)) {
        if (!/^[a-zA-Z0-9_]+$/.test(c)) continue;
        if (SENSITIVE_SNAPSHOT_COLUMNS.has(c.toLowerCase()) || !safeLiveColSet.has(c)) {
          skippedColsSet.add(c);
        } else {
          cols.push(c);
        }
      }
      if (!cols.length) continue;
      const quotedCols = cols.map(quoteIdent).join(', ');
      const placeholders = cols.map(() => '?').join(', ');
      const vals = cols.map(c => (sr[c] === undefined ? null : sr[c]));
      stmts.push(
        env.DB.prepare(`INSERT OR REPLACE INTO ${safeTbl} (${quotedCols}) VALUES (${placeholders})`).bind(...vals)
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

    totalRowsRestored += restoredCount;
    row_summary[tbl] = {
      mode: cleanMode,
      restored_rows: restoredCount,
      rows_restored: restoredCount,
      columns_skipped: Array.from(skippedColsSet).sort()
    };
  }

  const latencyMs = Math.max(1, Date.now() - t0);
  const restoredAt = new Date().toISOString();
  const lastRestoreSummary = {
    restored_at: restoredAt,
    snapshot_id: row.id,
    snapshot_label: row.label,
    mode: cleanMode,
    safety_snapshot_id: safetySnapshot.id,
    tables_restored: targetTables.length,
    total_rows_restored: totalRowsRestored,
    latency_ms: latencyMs,
    actor: createdBy,
    status: 'SUCCESS'
  };
  await persistLastRestore(env, lastRestoreSummary);

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
    latency_ms: latencyMs,
    restored_at: restoredAt,
    last_restore: lastRestoreSummary
  };
}

export const executeGranularRestore = restorePlatformSnapshot;

export async function renamePlatformSnapshot(env, id, newLabel) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
  await ensureOpsSnapshotsTable(env);
  const cleanLabel = sanitizeSnapshotLabel(newLabel);
  if (!cleanLabel) {
    throw new HttpError(400, 'INVALID_LABEL', 'Snapshot label must be between 1 and 80 characters');
  }
  const row = await env.DB.prepare('SELECT id, label FROM ops_snapshots WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Snapshot not found');

  await env.DB.prepare('UPDATE ops_snapshots SET label = ? WHERE id = ?').bind(cleanLabel, id).run();
  return {
    ok: true,
    id: row.id,
    previous_label: row.label,
    label: cleanLabel
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
        scope: body && body.scope !== undefined ? body.scope : 'all',
        triggerType: body && body.trigger_type === 'scheduled' ? 'scheduled' : 'manual',
        createdBy: actor.email || actor.userId
      });
      await audit(env, request, actor, 'ops.snapshot.create', 'ops_snapshot', snap.id, {
        label: snap.label,
        scope: snap.scope,
        r2_key: snap.r2_key,
        sha256: snap.sha256,
        size_bytes: snap.size_bytes,
        total_rows: snap.total_rows,
        scrubbed_tables: snap.scrubbed_tables,
        scrubbed_columns: snap.scrubbed_columns
      });
      return json({ snapshot: snap }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  if (!action && method === 'PATCH') {
    if (actor.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Only administrators can rename platform snapshots');
    const body = await readJson(request, 10000).catch(() => ({}));
    const result = await renamePlatformSnapshot(env, subId, body && body.label);
    await audit(env, request, actor, 'ops.snapshot.rename', 'ops_snapshot', subId, {
      previous_label: result.previous_label,
      label: result.label
    });
    return json(result);
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
    await audit(env, request, actor, 'ops.drill.run', 'ops_snapshot', subId, {
      readiness: report.readiness,
      latency_ms: report.latency_ms,
      tables_checked: report.tables_checked,
      drift_warnings_count: (report.schema_drift_warnings || []).length,
      totals: report.totals
    });
    return json(report);
  }

  if (action === 'restore' && method === 'POST') {
    if (actor.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Only administrators can execute point-in-time state restores');
    const body = await readJson(request, 20000);
    const confirmPhrase = body && (body.confirm_phrase !== undefined ? body.confirm_phrase : body.confirm);
    const result = await restorePlatformSnapshot(env, subId, {
      tables: body && body.tables,
      mode: body && body.mode,
      confirmPhrase,
      createdBy: actor.email || actor.userId
    });
    await audit(env, request, actor, 'ops.restore.execute', 'ops_snapshot', subId, {
      actor: actor.email || actor.userId,
      snapshot_id: subId,
      mode: result.mode,
      safety_snapshot_id: result.safety_snapshot_id,
      restored_tables: result.restored_tables,
      latency_ms: result.latency_ms,
      row_summary: result.row_summary
    });
    return json(result);
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown snapshot route');
}
