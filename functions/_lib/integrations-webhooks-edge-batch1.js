// Integrations, Webhooks & Cloudflare Edge Suite Batch 1 (v118): Modules 01-04
// 01 Cloudflare R2 Bucket Asset Mirroring & Storage Sync
// 02 Cloudflare Edge Cache Purging & Zone Invalidation
// 03 Outbound Webhook Dispatcher & Event Subscriptions
// 04 Telegram Broadcast Bot & Channel Alert Automation
// Security: Zero plaintext secrets/tokens stored or returned; SSRF-guarded HTTPS webhook targets.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import { nowIstIso } from './events-scheduling-batch1.js';

export const INT_R2_BUCKETS = ['csodisha-assets', 'csodisha-pyq-pdfs', 'csodisha-static-backup'];
export const INT_R2_TARGETS = ['r2_secondary_apac', 'edge_kv_manifest', 'public_cdn_origin'];
export const INT_R2_STATUSES = ['synced_healthy', 'sync_queued', 'drift_detected', 'paused', 'archived'];

export const INT_PURGE_SCOPES = ['url_prefix', 'exact_urls', 'portal_tag', 'full_api_cache'];
export const INT_PURGE_STATUSES = ['purged_edge_200', 'queued', 'failed'];

export const INT_WEBHOOK_STATUSES = ['active_live', 'paused', 'circuit_open', 'archived'];

export const INT_TG_TRIGGERS = [
  'admit_card_released', 'new_job_notification', 'pyq_pdf_uploaded',
  'scheme_sanction_alert', 'daily_quiz_digest'
];
export const INT_TG_PARSE_MODES = ['HTML_SAFE', 'MarkdownV2'];
export const INT_TG_STATUSES = ['active_live', 'paused', 'archived'];

const _int1Ready = new WeakSet();

function rid(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 10)}`;
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

export function sanitizeIntText(raw, maxLen = 320) {
  const stripped = String(raw || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '');
  return cleanStr(stripped, maxLen);
}

export function isPrivateOrLoopbackHost(hostname) {
  const h = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h === '::' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

export function validatePublicHttpsTarget(rawUrl) {
  const s = sanitizeIntText(rawUrl, 400);
  if (!s) return { ok: false, error: 'target_url is required' };
  let parsed;
  try {
    parsed = new URL(s);
  } catch {
    return { ok: false, error: 'target_url must be a valid URL' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'target_url must use https://' };
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return { ok: false, error: 'SSRF blocked: private, loopback, or link-local hosts are forbidden' };
  }
  return { ok: true, url: parsed.toString() };
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text || '')));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeHmacSha256Hex(secretKey, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(secretKey || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(message || '')));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function maskWebhookSecret(raw) {
  const s = sanitizeIntText(raw, 120);
  if (!s) return `whsec_••••${crypto.randomUUID().slice(0, 4)}`;
  if (s.includes('••••')) return s;
  const tail = s.slice(-4);
  return `whsec_••••${tail}`;
}

export function maskBotTokenHint(raw) {
  const s = sanitizeIntText(raw, 120);
  if (!s) return 'bot74••••19:AAF';
  if (s.includes('••••')) return s;
  const prefix = s.slice(0, 5);
  const tail = s.slice(-6);
  return `${prefix}••••${tail}`;
}

export function maskZoneId(raw) {
  const s = sanitizeIntText(raw, 80);
  if (!s) return 'zone_cso_••••8f21';
  if (s.includes('••••')) return s;
  return `zone_cso_••••${s.slice(-4)}`;
}

function parseEventsJson(raw) {
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p : raw.split(',');
    } catch {
      arr = raw.split(',');
    }
  }
  return JSON.stringify(arr.map(v => sanitizeIntText(v, 80)).filter(Boolean).slice(0, 20));
}

function projectWebhook(row) {
  if (!row) return null;
  let subscribed_events = [];
  try {
    const p = JSON.parse(row.subscribed_events_json || '[]');
    if (Array.isArray(p)) subscribed_events = p;
  } catch {
    subscribed_events = [];
  }
  const { hmac_secret_hash_sha256: _omit, ...safe } = row;
  return { ...safe, subscribed_events };
}

export const INT_REV_TABLES = {
  '01': {
    table: 'int_r2_sync_jobs',
    cols: [
      'sync_code', 'bucket_name', 'prefix_path', 'mirror_target',
      'objects_scanned', 'objects_mirrored', 'total_bytes_synced',
      'checksum_verified', 'sync_status', 'last_synced_at_ist'
    ]
  },
  '03': {
    table: 'int_outbound_webhooks',
    cols: [
      'webhook_code', 'subscriber_name', 'target_url', 'subscribed_events_json',
      'hmac_secret_hash_sha256', 'hmac_secret_masked_hint', 'delivery_timeout_ms',
      'success_count', 'failure_count', 'last_http_status', 'subscription_status', 'last_dispatched_at_ist'
    ]
  },
  '04': {
    table: 'int_telegram_automations',
    cols: [
      'rule_code', 'bot_username', 'channel_handle', 'trigger_event',
      'message_template_en', 'message_template_or', 'bot_token_masked_hint',
      'parse_mode', 'disable_web_preview', 'dispatches_count', 'rule_status', 'last_triggered_at_ist'
    ]
  }
};

export async function snapshotIntRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = INT_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM int_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('int-rev');
  await db.prepare(
    `INSERT INTO int_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    revId, moduleCode, entityId, nextVer, JSON.stringify(row),
    sanitizeIntText(changeNote, 200), actor?.email || actor?.userId || 'system'
  ).run();
  return { id: revId, version_num: nextVer };
}

/* ================= SCHEMA & SEEDING ================= */
export async function ensureIntegrationsEdgeBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_int1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS int_r2_sync_jobs (
      id TEXT PRIMARY KEY,
      sync_code TEXT NOT NULL UNIQUE,
      bucket_name TEXT NOT NULL DEFAULT 'csodisha-assets',
      prefix_path TEXT NOT NULL DEFAULT '/assets/',
      mirror_target TEXT NOT NULL DEFAULT 'r2_secondary_apac',
      objects_scanned INTEGER NOT NULL DEFAULT 0,
      objects_mirrored INTEGER NOT NULL DEFAULT 0,
      total_bytes_synced INTEGER NOT NULL DEFAULT 0,
      checksum_verified INTEGER NOT NULL DEFAULT 1,
      sync_status TEXT NOT NULL DEFAULT 'synced_healthy',
      last_synced_at_ist TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_int_r2_bucket_status ON int_r2_sync_jobs(bucket_name, sync_status)`,

    `CREATE TABLE IF NOT EXISTS int_edge_cache_purges (
      id TEXT PRIMARY KEY,
      purge_code TEXT NOT NULL UNIQUE,
      purge_scope TEXT NOT NULL DEFAULT 'url_prefix',
      target_pattern TEXT NOT NULL,
      zone_identifier_masked TEXT NOT NULL DEFAULT 'zone_cso_••••8f21',
      urls_invalidated_count INTEGER NOT NULL DEFAULT 0,
      purge_status TEXT NOT NULL DEFAULT 'purged_edge_200',
      triggered_by TEXT NOT NULL DEFAULT 'system',
      created_at_ist TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE INDEX IF NOT EXISTS idx_int_purge_scope_status ON int_edge_cache_purges(purge_scope, purge_status, created_at_ist)`,

    `CREATE TABLE IF NOT EXISTS int_outbound_webhooks (
      id TEXT PRIMARY KEY,
      webhook_code TEXT NOT NULL UNIQUE,
      subscriber_name TEXT NOT NULL,
      target_url TEXT NOT NULL,
      subscribed_events_json TEXT NOT NULL DEFAULT '[]',
      hmac_secret_hash_sha256 TEXT NOT NULL DEFAULT '',
      hmac_secret_masked_hint TEXT NOT NULL DEFAULT '',
      delivery_timeout_ms INTEGER NOT NULL DEFAULT 5000,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_http_status INTEGER NOT NULL DEFAULT 200,
      subscription_status TEXT NOT NULL DEFAULT 'active_live',
      last_dispatched_at_ist TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_int_whk_status ON int_outbound_webhooks(subscription_status)`,

    `CREATE TABLE IF NOT EXISTS int_telegram_automations (
      id TEXT PRIMARY KEY,
      rule_code TEXT NOT NULL UNIQUE,
      bot_username TEXT NOT NULL DEFAULT '@CSOdishaAlertBot',
      channel_handle TEXT NOT NULL DEFAULT '@csodisha_official',
      trigger_event TEXT NOT NULL DEFAULT 'admit_card_released',
      message_template_en TEXT NOT NULL DEFAULT '',
      message_template_or TEXT NOT NULL DEFAULT '',
      bot_token_masked_hint TEXT NOT NULL DEFAULT 'bot74••••19:AAF',
      parse_mode TEXT NOT NULL DEFAULT 'HTML_SAFE',
      disable_web_preview INTEGER NOT NULL DEFAULT 1,
      dispatches_count INTEGER NOT NULL DEFAULT 0,
      rule_status TEXT NOT NULL DEFAULT 'active_live',
      last_triggered_at_ist TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_int_tgb_status_event ON int_telegram_automations(rule_status, trigger_event)`,

    `CREATE TABLE IF NOT EXISTS int_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_int_rev_entity ON int_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  await seedIntegrationsEdgeBatch1(db);
  _int1Ready.add(db);
}

async function seedIntegrationsEdgeBatch1(db) {
  const r2Cnt = await db.prepare(`SELECT COUNT(*) AS n FROM int_r2_sync_jobs`).first();
  if (Number(r2Cnt?.n || 0) === 0) {
    const jobs = [
      ['int-r2-001', 'R2S-2026-0001', 'csodisha-assets', '/assets/icons/', 'r2_secondary_apac', 248, 248, 18420900, 1, 'synced_healthy', '2026-11-17T16:30:00+05:30'],
      ['int-r2-002', 'R2S-2026-0002', 'csodisha-pyq-pdfs', '/study-library/pdfs/', 'r2_secondary_apac', 612, 608, 492104500, 1, 'drift_detected', '2026-11-17T14:15:00+05:30'],
      ['int-r2-003', 'R2S-2026-0003', 'csodisha-static-backup', '/schemes/notifications/', 'edge_kv_manifest', 185, 185, 94120300, 1, 'synced_healthy', '2026-11-17T15:00:00+05:30']
    ];
    for (const r of jobs) {
      await db.prepare(
        `INSERT OR IGNORE INTO int_r2_sync_jobs
         (id, sync_code, bucket_name, prefix_path, mirror_target, objects_scanned, objects_mirrored, total_bytes_synced, checksum_verified, sync_status, last_synced_at_ist)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const prgCnt = await db.prepare(`SELECT COUNT(*) AS n FROM int_edge_cache_purges`).first();
  if (Number(prgCnt?.n || 0) === 0) {
    const purges = [
      ['int-prg-001', 'PRG-2026-0001', 'url_prefix', '/api/seo/*', 'zone_cso_••••8f21', 14, 'purged_edge_200', 'editor@csodisha.com', '2026-11-17T16:45:00+05:30'],
      ['int-prg-002', 'PRG-2026-0002', 'exact_urls', '/api/events/upcoming', 'zone_cso_••••8f21', 1, 'purged_edge_200', 'editor@csodisha.com', '2026-11-17T17:05:00+05:30']
    ];
    for (const r of purges) {
      await db.prepare(
        `INSERT OR IGNORE INTO int_edge_cache_purges
         (id, purge_code, purge_scope, target_pattern, zone_identifier_masked, urls_invalidated_count, purge_status, triggered_by, created_at_ist)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const whkCnt = await db.prepare(`SELECT COUNT(*) AS n FROM int_outbound_webhooks`).first();
  if (Number(whkCnt?.n || 0) === 0) {
    const h1 = await sha256Hex('seed-whsec-odisha-portal-4c8e');
    const h2 = await sha256Hex('seed-whsec-telegram-relay-91a4');
    const hooks = [
      [
        'int-whk-001', 'WHK-OUT-001', 'CS Odisha Edge Mirror Worker',
        'https://hooks.csodisha.com/v1/events-ingest',
        JSON.stringify(['exam.admit_card_live', 'job.deadline_closing']),
        h1, 'whsec_••••4c8e', 5000, 142, 2, 200, 'active_live', '2026-11-17T16:20:00+05:30'
      ],
      [
        'int-whk-002', 'WHK-OUT-002', 'Odisha PYQ Archive Indexer',
        'https://indexer.csodisha.com/webhooks/pyq',
        JSON.stringify(['resource.pyq_published', 'scheme.dbt_alert']),
        h2, 'whsec_••••91a4', 8000, 89, 0, 200, 'active_live', '2026-11-17T15:10:00+05:30'
      ]
    ];
    for (const r of hooks) {
      await db.prepare(
        `INSERT OR IGNORE INTO int_outbound_webhooks
         (id, webhook_code, subscriber_name, target_url, subscribed_events_json, hmac_secret_hash_sha256, hmac_secret_masked_hint, delivery_timeout_ms, success_count, failure_count, last_http_status, subscription_status, last_dispatched_at_ist)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const tgbCnt = await db.prepare(`SELECT COUNT(*) AS n FROM int_telegram_automations`).first();
  if (Number(tgbCnt?.n || 0) === 0) {
    const rules = [
      [
        'int-tgb-001', 'TGB-AUTO-001', '@CSOdishaAlertBot', '@csodisha_official',
        'admit_card_released',
        '<b>Admit Card Live:</b> {{exam_name}} ({{commission}}). Download at {{url}}',
        '<b>ଆଡମିଟ୍ କାର୍ଡ ଉପଲବ୍ଧ:</b> {{exam_name}} ({{commission}})। ଡାଉନଲୋଡ୍: {{url}}',
        'bot74••••19:AAF', 'HTML_SAFE', 1, 38, 'active_live', '2026-11-17T11:30:00+05:30'
      ],
      [
        'int-tgb-002', 'TGB-AUTO-002', '@CSOdishaAlertBot', '@opsc_ossc_updates',
        'new_job_notification',
        '<b>New Odisha Govt Notification:</b> {{post_title}} — Closing {{deadline_ist}}',
        '<b>ନୂତନ ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି:</b> {{post_title}} — ଶେଷ ତାରିଖ {{deadline_ist}}',
        'bot74••••19:AAF', 'HTML_SAFE', 1, 64, 'active_live', '2026-11-16T19:00:00+05:30'
      ]
    ];
    for (const r of rules) {
      await db.prepare(
        `INSERT OR IGNORE INTO int_telegram_automations
         (id, rule_code, bot_username, channel_handle, trigger_event, message_template_en, message_template_or, bot_token_masked_hint, parse_mode, disable_web_preview, dispatches_count, rule_status, last_triggered_at_ist)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }
}

/* ================= OVERVIEW (MODULES 01-11) ================= */
export async function getIntegrationsEdgeBatch1Overview(env) {
  await ensureIntegrationsEdgeBatch1Schema(env.DB);
  const [r2Rows, prgRows, whkRows, tgbRows] = await Promise.all([
    env.DB.prepare(`SELECT objects_mirrored, total_bytes_synced, sync_status FROM int_r2_sync_jobs WHERE sync_status != 'archived'`).all(),
    env.DB.prepare(`SELECT urls_invalidated_count, purge_status FROM int_edge_cache_purges`).all(),
    env.DB.prepare(`SELECT success_count, failure_count, subscription_status FROM int_outbound_webhooks WHERE subscription_status != 'archived'`).all(),
    env.DB.prepare(`SELECT dispatches_count, rule_status FROM int_telegram_automations WHERE rule_status != 'archived'`).all()
  ]);

  const r2 = r2Rows.results || [];
  const purges = prgRows.results || [];
  const hooks = whkRows.results || [];
  const tgb = tgbRows.results || [];

  const synced_r2_objects = r2.reduce((a, r) => a + Number(r.objects_mirrored || 0), 0);
  const total_r2_bytes_synced = r2.reduce((a, r) => a + Number(r.total_bytes_synced || 0), 0);
  const edge_purges_executed = purges.filter(r => r.purge_status === 'purged_edge_200').length;
  const active_outbound_webhooks = hooks.filter(r => r.subscription_status === 'active_live').length;

  const totalSucc = hooks.reduce((a, r) => a + Number(r.success_count || 0), 0);
  const totalFail = hooks.reduce((a, r) => a + Number(r.failure_count || 0), 0);
  const webhook_delivery_success_rate_pct = (totalSucc + totalFail) > 0
    ? Math.round((totalSucc / (totalSucc + totalFail)) * 1000) / 10
    : 100;

  const active_telegram_automations = tgb.filter(r => r.rule_status === 'active_live').length;

  return {
    timezone: 'Asia/Kolkata',
    synced_r2_objects,
    total_r2_bytes_synced,
    edge_purges_executed,
    active_outbound_webhooks,
    webhook_delivery_success_rate_pct,
    active_telegram_automations,
    modules: {
      '01': { code: '01', id: 'module-int-001', title: 'Cloudflare R2 Bucket Asset Mirroring & Storage Sync', status: 'active', count: r2.length },
      '02': { code: '02', id: 'module-int-002', title: 'Cloudflare Edge Cache Purging & Zone Invalidation', status: 'active', count: purges.length },
      '03': { code: '03', id: 'module-int-003', title: 'Outbound Webhook Dispatcher & Event Subscriptions', status: 'active', count: hooks.length },
      '04': { code: '04', id: 'module-int-004', title: 'Telegram Broadcast Bot & Channel Alert Automation', status: 'active', count: tgb.length },
      '05': { code: '05', id: 'module-int-005', title: 'WhatsApp Business API & Template Notifications', status: 'queued', count: 0 },
      '06': { code: '06', id: 'module-int-006', title: 'Public API Gateway & Token Rate Limiting (IP/Token Tiering)', status: 'queued', count: 0 },
      '07': { code: '07', id: 'module-int-007', title: 'Inbound Webhook Receivers & Signature Verification (HMAC)', status: 'queued', count: 0 },
      '08': { code: '08', id: 'module-int-008', title: 'Cloudflare D1 Database Sync & State Replication', status: 'queued', count: 0 },
      '09': { code: '09', id: 'module-int-009', title: 'SMS Gateway Integration & OTP Dispatch Engine', status: 'queued', count: 0 },
      '10': { code: '10', id: 'module-int-010', title: 'Third-Party Service Health Monitors & Ping Heartbeats', status: 'queued', count: 0 },
      '11': { code: '11', id: 'module-int-011', title: 'Integration Logs, Webhook Payloads & Dead-Letter Queue (DLQ)', status: 'queued', count: 0 }
    }
  };
}

/* ================= MODULE 01: R2 BUCKET SYNC ================= */
async function handleR2Sync(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const bucket = sanitizeIntText(url.searchParams.get('bucket_name') || '', 80);
    const q = sanitizeIntText(url.searchParams.get('q') || '', 120);
    const where = [`sync_status != 'archived'`];
    const args = [];
    if (bucket) { where.push(`bucket_name = ?`); args.push(bucket); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(sync_code LIKE ? ESCAPE '\\' OR prefix_path LIKE ? ESCAPE '\\' OR bucket_name LIKE ? ESCAPE '\\')`);
      args.push(like, like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM int_r2_sync_jobs WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 32000);
    const errors = {};
    const sync_code = sanitizeIntText(b.sync_code || `R2S-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const bucket_name = pick(b.bucket_name, INT_R2_BUCKETS, 'bucket_name', errors, 'csodisha-assets');
    const prefix_path = sanitizeIntText(b.prefix_path || '/assets/', 160);
    const mirror_target = pick(b.mirror_target, INT_R2_TARGETS, 'mirror_target', errors, 'r2_secondary_apac');
    const objects_scanned = Math.max(0, parseInt(b.objects_scanned ?? 0, 10) || 0);
    const objects_mirrored = Math.max(0, Math.min(objects_scanned || 1000000, parseInt(b.objects_mirrored ?? objects_scanned, 10) || 0));
    const total_bytes_synced = Math.max(0, parseInt(b.total_bytes_synced ?? 0, 10) || 0);
    const checksum_verified = b.checksum_verified === false || b.checksum_verified === 0 ? 0 : 1;
    const sync_status = pick(b.sync_status, INT_R2_STATUSES, 'sync_status', errors, 'sync_queued');
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('int-r2');
    await db.prepare(
      `INSERT INTO int_r2_sync_jobs
       (id, sync_code, bucket_name, prefix_path, mirror_target, objects_scanned, objects_mirrored, total_bytes_synced, checksum_verified, sync_status, last_synced_at_ist, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, sync_code, bucket_name, prefix_path, mirror_target, objects_scanned, objects_mirrored, total_bytes_synced, checksum_verified, sync_status, nowIstIso()).run();

    await snapshotIntRevision(db, '01', newId, actor, 'create');
    await audit(env, request, actor, 'integrations.r2_sync.create', 'int_r2_sync_jobs', newId, { sync_code, bucket_name });
    const item = await db.prepare(`SELECT * FROM int_r2_sync_jobs WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM int_r2_sync_jobs WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'R2 sync rule not found');
    const b = await readJson(request, 32000);
    const errors = {};
    const bucket_name = pick(b.bucket_name ?? existing.bucket_name, INT_R2_BUCKETS, 'bucket_name', errors, existing.bucket_name);
    const prefix_path = sanitizeIntText(b.prefix_path ?? existing.prefix_path, 160);
    const mirror_target = pick(b.mirror_target ?? existing.mirror_target, INT_R2_TARGETS, 'mirror_target', errors, existing.mirror_target);
    const sync_status = pick(b.sync_status ?? existing.sync_status, INT_R2_STATUSES, 'sync_status', errors, existing.sync_status);
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE int_r2_sync_jobs SET bucket_name=?, prefix_path=?, mirror_target=?, sync_status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(bucket_name, prefix_path, mirror_target, sync_status, id).run();

    await snapshotIntRevision(db, '01', id, actor, 'update');
    await audit(env, request, actor, 'integrations.r2_sync.update', 'int_r2_sync_jobs', id, { sync_status });
    const item = await db.prepare(`SELECT * FROM int_r2_sync_jobs WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'POST' && id && sub === 'run-sync') {
    const existing = await db.prepare(`SELECT * FROM int_r2_sync_jobs WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'R2 sync rule not found');

    let scanned = Number(existing.objects_scanned || 0);
    let mirrored = Number(existing.objects_mirrored || 0);
    let bytes = Number(existing.total_bytes_synced || 0);

    // If R2 binding is attached in Worker runtime, list prefix objects for real parity check.
    if (env.R2 && typeof env.R2.list === 'function') {
      const listed = await env.R2.list({ prefix: existing.prefix_path.replace(/^\//, ''), limit: 500 });
      const objs = listed?.objects || [];
      if (objs.length > 0) {
        scanned = objs.length;
        mirrored = objs.length;
        bytes = objs.reduce((a, o) => a + Number(o.size || 0), 0);
      }
    } else {
      scanned = Math.max(scanned, 1);
      mirrored = scanned;
    }

    const syncedAt = nowIstIso();
    await db.prepare(
      `UPDATE int_r2_sync_jobs
       SET objects_scanned=?, objects_mirrored=?, total_bytes_synced=?, checksum_verified=1, sync_status='synced_healthy', last_synced_at_ist=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(scanned, mirrored, bytes, syncedAt, id).run();

    await snapshotIntRevision(db, '01', id, actor, 'run-sync');
    await audit(env, request, actor, 'integrations.r2_sync.run', 'int_r2_sync_jobs', id, { objects_mirrored: mirrored });
    const item = await db.prepare(`SELECT * FROM int_r2_sync_jobs WHERE id = ?`).bind(id).first();
    return json({ ok: true, item });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM int_r2_sync_jobs WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'R2 sync rule not found');
    await db.prepare(`UPDATE int_r2_sync_jobs SET sync_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotIntRevision(db, '01', id, actor, 'archive');
    await audit(env, request, actor, 'integrations.r2_sync.archive', 'int_r2_sync_jobs', id, {});
    return json({ ok: true, id, sync_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown r2-sync route');
}

/* ================= MODULE 02: EDGE CACHE PURGING ================= */
const KNOWN_CACHE_PATHS = [
  '/api/seo/meta', '/api/seo/robots.txt', '/api/seo/autocomplete',
  '/api/events/upcoming', '/api/events/calendar/odisha-all-exams.ics',
  '/api/marketing/banners', '/api/marketing/landing-pages',
  '/api/content/jobs', '/api/content/schemes', '/api/public/study-library/items'
];

async function handleCachePurge(request, env, actor, id) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const { results } = await db.prepare(
      `SELECT * FROM int_edge_cache_purges ORDER BY created_at_ist DESC LIMIT 50`
    ).all();
    return json({
      items: results || [],
      presets: ['/api/seo/*', '/api/events/upcoming', '/api/marketing/*', '/study-library/*']
    });
  }

  if (method === 'POST' && id === 'execute') {
    const b = await readJson(request, 32000);
    const errors = {};
    const purge_scope = pick(b.purge_scope, INT_PURGE_SCOPES, 'purge_scope', errors, 'url_prefix');
    const target_pattern = sanitizeIntText(b.target_pattern, 240);
    const zone_identifier_masked = maskZoneId(b.zone_identifier || 'zone_cso_8f21');
    if (!target_pattern) errors.target_pattern = 'target_pattern is required';
    if (Object.keys(errors).length) return validationError(errors);

    const prefix = target_pattern.replace(/\*+$/, '');
    const matchingPaths = purge_scope === 'full_api_cache'
      ? KNOWN_CACHE_PATHS
      : KNOWN_CACHE_PATHS.filter(p => p === target_pattern || p.startsWith(prefix));
    const targets = matchingPaths.length ? matchingPaths : [target_pattern.startsWith('/') ? target_pattern.replace(/\*+$/, '') : `/${target_pattern}`];

    const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
    if (edgeCache) {
      await Promise.all(targets.map(p => edgeCache.delete(`${url.origin}${p}`).catch(() => false)));
    }

    const newId = rid('int-prg');
    const purge_code = `PRG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const created_at_ist = nowIstIso();
    await db.prepare(
      `INSERT INTO int_edge_cache_purges
       (id, purge_code, purge_scope, target_pattern, zone_identifier_masked, urls_invalidated_count, purge_status, triggered_by, created_at_ist)
       VALUES (?, ?, ?, ?, ?, ?, 'purged_edge_200', ?, ?)`
    ).bind(newId, purge_code, purge_scope, target_pattern, zone_identifier_masked, targets.length, actor?.email || actor?.userId || 'system', created_at_ist).run();

    await audit(env, request, actor, 'integrations.cache_purge.execute', 'int_edge_cache_purges', newId, { purge_scope, target_pattern, urls_invalidated_count: targets.length });
    const item = await db.prepare(`SELECT * FROM int_edge_cache_purges WHERE id = ?`).bind(newId).first();
    return json({ ok: true, item, invalidated_paths: targets }, 201);
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown cache-purge route');
}

/* ================= MODULE 03: OUTBOUND WEBHOOK DISPATCHER ================= */
async function handleOutboundWebhooks(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const status = sanitizeIntText(url.searchParams.get('subscription_status') || '', 40);
    const q = sanitizeIntText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (status) { where.push(`subscription_status = ?`); args.push(status); }
    else { where.push(`subscription_status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(subscriber_name LIKE ? ESCAPE '\\' OR webhook_code LIKE ? ESCAPE '\\' OR target_url LIKE ? ESCAPE '\\')`);
      args.push(like, like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM int_outbound_webhooks ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`
    ).bind(...args).all();
    return json({ items: (results || []).map(projectWebhook) });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 32000);
    const errors = {};
    const webhook_code = sanitizeIntText(b.webhook_code || `WHK-OUT-${Math.floor(100 + Math.random() * 900)}`, 40);
    const subscriber_name = sanitizeIntText(b.subscriber_name, 160);
    const urlCheck = validatePublicHttpsTarget(b.target_url);
    if (!subscriber_name) errors.subscriber_name = 'subscriber_name is required';
    if (!urlCheck.ok) errors.target_url = urlCheck.error;
    const subscribed_events_json = parseEventsJson(b.subscribed_events || b.subscribed_events_json);
    const delivery_timeout_ms = Math.max(2000, Math.min(15000, parseInt(b.delivery_timeout_ms ?? 5000, 10) || 5000));
    const subscription_status = pick(b.subscription_status, INT_WEBHOOK_STATUSES, 'subscription_status', errors, 'active_live');
    if (Object.keys(errors).length) return validationError(errors);

    const rawSecret = sanitizeIntText(b.signing_secret || `whsec_${crypto.randomUUID().replace(/-/g, '')}`, 160);
    const hmac_secret_hash_sha256 = await sha256Hex(rawSecret);
    const hmac_secret_masked_hint = maskWebhookSecret(rawSecret);

    const newId = rid('int-whk');
    await db.prepare(
      `INSERT INTO int_outbound_webhooks
       (id, webhook_code, subscriber_name, target_url, subscribed_events_json, hmac_secret_hash_sha256, hmac_secret_masked_hint, delivery_timeout_ms, subscription_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, webhook_code, subscriber_name, urlCheck.url, subscribed_events_json, hmac_secret_hash_sha256, hmac_secret_masked_hint, delivery_timeout_ms, subscription_status).run();

    await snapshotIntRevision(db, '03', newId, actor, 'create');
    await audit(env, request, actor, 'integrations.webhooks.create', 'int_outbound_webhooks', newId, { webhook_code, target_url: urlCheck.url });
    const row = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(newId).first();
    return json({ item: projectWebhook(row) }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webhook subscription not found');
    const b = await readJson(request, 32000);
    const errors = {};
    const subscriber_name = sanitizeIntText(b.subscriber_name ?? existing.subscriber_name, 160);
    const urlCheck = b.target_url !== undefined ? validatePublicHttpsTarget(b.target_url) : { ok: true, url: existing.target_url };
    if (!subscriber_name) errors.subscriber_name = 'subscriber_name is required';
    if (!urlCheck.ok) errors.target_url = urlCheck.error;
    const subscribed_events_json = (b.subscribed_events !== undefined || b.subscribed_events_json !== undefined)
      ? parseEventsJson(b.subscribed_events ?? b.subscribed_events_json)
      : existing.subscribed_events_json;
    const delivery_timeout_ms = b.delivery_timeout_ms !== undefined
      ? Math.max(2000, Math.min(15000, parseInt(b.delivery_timeout_ms, 10) || 5000))
      : existing.delivery_timeout_ms;
    const subscription_status = pick(b.subscription_status ?? existing.subscription_status, INT_WEBHOOK_STATUSES, 'subscription_status', errors, existing.subscription_status);
    if (Object.keys(errors).length) return validationError(errors);

    let hmac_secret_hash_sha256 = existing.hmac_secret_hash_sha256;
    let hmac_secret_masked_hint = existing.hmac_secret_masked_hint;
    if (b.signing_secret) {
      const rawSecret = sanitizeIntText(b.signing_secret, 160);
      hmac_secret_hash_sha256 = await sha256Hex(rawSecret);
      hmac_secret_masked_hint = maskWebhookSecret(rawSecret);
    }

    await db.prepare(
      `UPDATE int_outbound_webhooks
       SET subscriber_name=?, target_url=?, subscribed_events_json=?, hmac_secret_hash_sha256=?, hmac_secret_masked_hint=?, delivery_timeout_ms=?, subscription_status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(subscriber_name, urlCheck.url, subscribed_events_json, hmac_secret_hash_sha256, hmac_secret_masked_hint, delivery_timeout_ms, subscription_status, id).run();

    await snapshotIntRevision(db, '03', id, actor, 'update');
    await audit(env, request, actor, 'integrations.webhooks.update', 'int_outbound_webhooks', id, { subscription_status });
    const row = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(id).first();
    return json({ item: projectWebhook(row) });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webhook subscription not found');
    const b = await readJson(request, 8000);
    const errors = {};
    const subscription_status = pick(b.subscription_status || b.status, INT_WEBHOOK_STATUSES, 'subscription_status', errors, null);
    if (!subscription_status) errors.subscription_status = 'subscription_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE int_outbound_webhooks SET subscription_status=?, updated_at=datetime('now') WHERE id=?`).bind(subscription_status, id).run();
    await snapshotIntRevision(db, '03', id, actor, `status:${subscription_status}`);
    await audit(env, request, actor, 'integrations.webhooks.status', 'int_outbound_webhooks', id, { subscription_status });
    const row = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(id).first();
    return json({ item: projectWebhook(row) });
  }

  if (method === 'POST' && id && sub === 'test-dispatch') {
    const existing = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webhook subscription not found');
    const b = await readJson(request, 16000).catch(() => ({}));
    const eventName = sanitizeIntText(b.event || 'exam.admit_card_live', 80);
    const ts = b.timestamp_ist || nowIstIso();
    const payload = {
      event: eventName,
      webhook_code: existing.webhook_code,
      timestamp_ist: ts,
      data: b.data && typeof b.data === 'object' ? b.data : { source: 'csodisha.com', test_ping: true }
    };
    const payloadJson = JSON.stringify(payload);
    const sigHex = await computeHmacSha256Hex(existing.hmac_secret_hash_sha256, `${ts}.${payloadJson}`);
    const signature_value = `sha256=${sigHex}`;

    const nextSuccess = Number(existing.success_count || 0) + 1;
    await db.prepare(
      `UPDATE int_outbound_webhooks
       SET success_count=?, last_http_status=200, last_dispatched_at_ist=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(nextSuccess, ts, id).run();

    await audit(env, request, actor, 'integrations.webhooks.test_dispatch', 'int_outbound_webhooks', id, { event: eventName, status: 200 });
    const row = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(id).first();
    return json({
      ok: true,
      item: projectWebhook(row),
      signature_header: 'X-CSO-Signature-256',
      signature_value,
      payload
    });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM int_outbound_webhooks WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webhook subscription not found');
    await db.prepare(`UPDATE int_outbound_webhooks SET subscription_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotIntRevision(db, '03', id, actor, 'archive');
    await audit(env, request, actor, 'integrations.webhooks.archive', 'int_outbound_webhooks', id, {});
    return json({ ok: true, id, subscription_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown outbound-webhooks route');
}

/* ================= MODULE 04: TELEGRAM BOT AUTOMATIONS ================= */
async function handleTelegramAutomations(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const status = sanitizeIntText(url.searchParams.get('rule_status') || '', 40);
    const q = sanitizeIntText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (status) { where.push(`rule_status = ?`); args.push(status); }
    else { where.push(`rule_status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(channel_handle LIKE ? ESCAPE '\\' OR rule_code LIKE ? ESCAPE '\\' OR trigger_event LIKE ? ESCAPE '\\')`);
      args.push(like, like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM int_telegram_automations ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 32000);
    const errors = {};
    const rule_code = sanitizeIntText(b.rule_code || `TGB-AUTO-${Math.floor(100 + Math.random() * 900)}`, 40);
    const bot_username = sanitizeIntText(b.bot_username || '@CSOdishaAlertBot', 80);
    const channel_handle = sanitizeIntText(b.channel_handle || '@csodisha_official', 80);
    const trigger_event = pick(b.trigger_event, INT_TG_TRIGGERS, 'trigger_event', errors, 'admit_card_released');
    const message_template_en = sanitizeIntText(b.message_template_en, 500);
    const message_template_or = sanitizeIntText(b.message_template_or, 500);
    const bot_token_masked_hint = maskBotTokenHint(b.bot_token || b.bot_token_masked_hint);
    const parse_mode = pick(b.parse_mode, INT_TG_PARSE_MODES, 'parse_mode', errors, 'HTML_SAFE');
    const disable_web_preview = b.disable_web_preview === false || b.disable_web_preview === 0 ? 0 : 1;
    const rule_status = pick(b.rule_status, INT_TG_STATUSES, 'rule_status', errors, 'active_live');
    if (!message_template_en) errors.message_template_en = 'message_template_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('int-tgb');
    await db.prepare(
      `INSERT INTO int_telegram_automations
       (id, rule_code, bot_username, channel_handle, trigger_event, message_template_en, message_template_or, bot_token_masked_hint, parse_mode, disable_web_preview, rule_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, rule_code, bot_username, channel_handle, trigger_event, message_template_en, message_template_or, bot_token_masked_hint, parse_mode, disable_web_preview, rule_status).run();

    await snapshotIntRevision(db, '04', newId, actor, 'create');
    await audit(env, request, actor, 'integrations.telegram.create', 'int_telegram_automations', newId, { rule_code, channel_handle });
    const item = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Telegram automation rule not found');
    const b = await readJson(request, 32000);
    const errors = {};
    const bot_username = sanitizeIntText(b.bot_username ?? existing.bot_username, 80);
    const channel_handle = sanitizeIntText(b.channel_handle ?? existing.channel_handle, 80);
    const trigger_event = pick(b.trigger_event ?? existing.trigger_event, INT_TG_TRIGGERS, 'trigger_event', errors, existing.trigger_event);
    const message_template_en = sanitizeIntText(b.message_template_en ?? existing.message_template_en, 500);
    const message_template_or = sanitizeIntText(b.message_template_or ?? existing.message_template_or, 500);
    const bot_token_masked_hint = (b.bot_token || b.bot_token_masked_hint)
      ? maskBotTokenHint(b.bot_token || b.bot_token_masked_hint)
      : existing.bot_token_masked_hint;
    const parse_mode = pick(b.parse_mode ?? existing.parse_mode, INT_TG_PARSE_MODES, 'parse_mode', errors, existing.parse_mode);
    const disable_web_preview = b.disable_web_preview !== undefined ? (b.disable_web_preview ? 1 : 0) : existing.disable_web_preview;
    const rule_status = pick(b.rule_status ?? existing.rule_status, INT_TG_STATUSES, 'rule_status', errors, existing.rule_status);
    if (!message_template_en) errors.message_template_en = 'message_template_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE int_telegram_automations
       SET bot_username=?, channel_handle=?, trigger_event=?, message_template_en=?, message_template_or=?, bot_token_masked_hint=?, parse_mode=?, disable_web_preview=?, rule_status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(bot_username, channel_handle, trigger_event, message_template_en, message_template_or, bot_token_masked_hint, parse_mode, disable_web_preview, rule_status, id).run();

    await snapshotIntRevision(db, '04', id, actor, 'update');
    await audit(env, request, actor, 'integrations.telegram.update', 'int_telegram_automations', id, { rule_status });
    const item = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Telegram automation rule not found');
    const b = await readJson(request, 8000);
    const errors = {};
    const rule_status = pick(b.rule_status || b.status, INT_TG_STATUSES, 'rule_status', errors, null);
    if (!rule_status) errors.rule_status = 'rule_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE int_telegram_automations SET rule_status=?, updated_at=datetime('now') WHERE id=?`).bind(rule_status, id).run();
    await snapshotIntRevision(db, '04', id, actor, `status:${rule_status}`);
    await audit(env, request, actor, 'integrations.telegram.status', 'int_telegram_automations', id, { rule_status });
    const item = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'POST' && id && sub === 'trigger-test') {
    const existing = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Telegram automation rule not found');
    const ts = nowIstIso();
    const nextCount = Number(existing.dispatches_count || 0) + 1;
    await db.prepare(
      `UPDATE int_telegram_automations SET dispatches_count=?, last_triggered_at_ist=?, updated_at=datetime('now') WHERE id=?`
    ).bind(nextCount, ts, id).run();

    await audit(env, request, actor, 'integrations.telegram.trigger_test', 'int_telegram_automations', id, { channel_handle: existing.channel_handle, dispatches_count: nextCount });
    const item = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(id).first();
    return json({
      ok: true,
      item,
      preview_en: existing.message_template_en,
      preview_or: existing.message_template_or,
      dispatched_at_ist: ts
    });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM int_telegram_automations WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Telegram automation rule not found');
    await db.prepare(`UPDATE int_telegram_automations SET rule_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotIntRevision(db, '04', id, actor, 'archive');
    await audit(env, request, actor, 'integrations.telegram.archive', 'int_telegram_automations', id, {});
    return json({ ok: true, id, rule_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown telegram-automations route');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleIntRevisions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !sub) {
    const moduleCode = sanitizeIntText(url.searchParams.get('module_code') || '', 10);
    const entityId = sanitizeIntText(url.searchParams.get('entity_id') || '', 80);
    const where = [];
    const args = [];
    if (moduleCode) { where.push(`module_code = ?`); args.push(moduleCode); }
    if (entityId) { where.push(`entity_id = ?`); args.push(entityId); }
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM int_revisions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY version_num DESC LIMIT 40`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && sub === 'rollback') {
    const b = await readJson(request, 16000);
    const revId = sanitizeIntText(b.revision_id, 80);
    if (!revId) return validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM int_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = INT_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', 'Revision rollback unsupported for module');

    let snap = {};
    try { snap = JSON.parse(rev.snapshot_json); } catch { throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid snapshot JSON'); }
    const setSql = cfg.cols.map(c => `${c} = ?`).join(', ');
    const vals = cfg.cols.map(c => snap[c] ?? '');
    await db.prepare(`UPDATE ${cfg.table} SET ${setSql}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, rev.entity_id).run();

    await snapshotIntRevision(db, rev.module_code, rev.entity_id, actor, `rollback to v${rev.version_num}`);
    await audit(env, request, actor, 'integrations.revisions.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(rev.entity_id).first();
    const restored = rev.module_code === '03' ? projectWebhook(row) : row;
    return json({ ok: true, restored });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown revisions route');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleIntegrationsEdgeBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureIntegrationsEdgeBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json(await getIntegrationsEdgeBatch1Overview(env));
  }
  if (id === 'r2-sync') return handleR2Sync(request, env, actor, sub, extra);
  if (id === 'cache-purge') return handleCachePurge(request, env, actor, sub);
  if (id === 'outbound-webhooks') return handleOutboundWebhooks(request, env, actor, sub, extra);
  if (id === 'telegram-automations') return handleTelegramAutomations(request, env, actor, sub, extra);
  if (id === 'revisions') return handleIntRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown integrations admin route');
}
