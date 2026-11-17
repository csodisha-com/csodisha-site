// Communications, Alerts & Candidate Notifications Batch 3 (v107): Modules 09-12
// 09 DPDP Opt-Outs | 10 Bilingual Variable Tag Interpolator | 11 Carrier DLR Diagnostics | 12 Broadcast Queue
// Never store raw plaintext phone/email PII in opt-out suppression records (SHA-256 hash + masked hint only).
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  COMM_REV_TABLES,
  ensureCommunicationsBatch1Schema,
  getCommunicationsOverview,
  snapshotCommRevision
} from './communications-batch1.js';
import { ensureCommunicationsBatch2Schema } from './communications-batch2.js';

export const DPDP_CHANNEL_SCOPES = ['all_channels', 'sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push'];
export const DPDP_REVOCATION_SOURCES = [
  'candidate_self_portal', 'sms_stop_keyword', 'email_unsubscribe_link',
  'whatsapp_stop_reply', 'dpdp_erasure_request', 'admin_compliance_entry'
];
export const DPDP_STATUSES = ['active_suppressed', 're_consented'];
export const VAR_TAG_CATEGORIES = ['identity', 'exam_recruitment', 'welfare_scheme', 'security_otp'];
export const DLR_CHANNELS = ['sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push'];
export const DLR_STATUSES = ['delivered', 'bounced_hard', 'bounced_soft', 'dlt_scrubbed_failed', 'dnd_blocked', 'queued'];
export const QUEUE_SOURCE_MODULES = ['01', '02', '03', '04', '05', '06', '07'];
export const QUEUE_PRIORITIES = ['normal', 'high', 'urgent_exam'];
export const QUEUE_STATUSES = ['scheduled', 'processing', 'completed', 'paused', 'cancelled'];

const _comm3Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

export function normalizeContact(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('@')) return s;
  const digits = s.replace(/\D+/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return s;
}

export function maskContactHint(raw) {
  const s = String(raw || '').trim();
  if (!s) return '••••';
  if (s.includes('@')) {
    const [local, domain] = s.split('@');
    const head = (local || 'u').slice(0, 2);
    return `${head}•••@${domain || 'mail'}`;
  }
  const digits = s.replace(/\D+/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 2)}••••${digits.slice(-4)}`;
  }
  if (s.length <= 4) return '••••';
  return `${s.slice(0, 2)}••••${s.slice(-2)}`;
}

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function interpolateBilingualTemplate({ template_en = '', template_or = '', tags = [], values = {}, use_samples = true }) {
  const byKey = new Map();
  for (const t of tags) {
    if (t && t.tag_key && Number(t.is_active) !== 0) byKey.set(t.tag_key, t);
  }
  const missing = new Set();
  const resolved = new Set();
  const render = (tpl, lang) => String(tpl || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, rawKey) => {
    const k = String(rawKey).toLowerCase();
    const override = values && values[k] !== undefined && values[k] !== null && String(values[k]).trim() !== ''
      ? String(values[k]).trim() : '';
    if (override) { resolved.add(k); return override; }
    const def = byKey.get(k);
    if (!def) { missing.add(k); return `{{${k}}}`; }
    resolved.add(k);
    if (lang === 'or') {
      if (use_samples && def.sample_value_or) return def.sample_value_or;
      return def.fallback_or || def.fallback_en || `{{${k}}}`;
    }
    if (use_samples && def.sample_value_en) return def.sample_value_en;
    return def.fallback_en || `{{${k}}}`;
  });
  return {
    rendered_en: render(template_en, 'en'),
    rendered_or: render(template_or, 'or'),
    resolved_tags: Array.from(resolved),
    missing_tags: Array.from(missing)
  };
}

// Extend comm_revisions table registry for Modules 09, 10 & 12
COMM_REV_TABLES['09'] = {
  table: 'comm_dpdp_optouts',
  cols: ['suppression_code', 'channel_scope', 'contact_hash_sha256', 'contact_masked_hint', 'revocation_source', 'reason_note', 'suppression_status', 'revoked_at', 'reconsented_at']
};
COMM_REV_TABLES['10'] = {
  table: 'comm_variable_tags',
  cols: ['tag_key', 'placeholder_syntax', 'dlt_slot_mapping', 'category_group', 'fallback_en', 'fallback_or', 'sample_value_en', 'sample_value_or', 'is_active']
};
COMM_REV_TABLES['12'] = {
  table: 'comm_broadcast_queue',
  cols: ['job_code', 'source_module_code', 'source_ref_code', 'title_en', 'title_or', 'channel_key', 'audience_segment', 'target_count', 'scheduled_for_ist', 'priority', 'queue_status', 'dpdp_optouts_skipped', 'executed_at']
};

export async function ensureCommunicationsBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_comm3Ready.has(db)) return;
  await ensureCommunicationsBatch1Schema(db);
  await ensureCommunicationsBatch2Schema(db);

  const ddl = [
    `CREATE TABLE IF NOT EXISTS comm_dpdp_optouts (
      id TEXT PRIMARY KEY,
      suppression_code TEXT NOT NULL UNIQUE,
      channel_scope TEXT NOT NULL DEFAULT 'all_channels' CHECK (channel_scope IN ('all_channels', 'sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
      contact_hash_sha256 TEXT NOT NULL UNIQUE,
      contact_masked_hint TEXT NOT NULL DEFAULT '',
      revocation_source TEXT NOT NULL DEFAULT 'candidate_self_portal' CHECK (revocation_source IN ('candidate_self_portal', 'sms_stop_keyword', 'email_unsubscribe_link', 'whatsapp_stop_reply', 'dpdp_erasure_request', 'admin_compliance_entry')),
      reason_note TEXT NOT NULL DEFAULT '',
      suppression_status TEXT NOT NULL DEFAULT 'active_suppressed' CHECK (suppression_status IN ('active_suppressed', 're_consented')),
      revoked_at TEXT NOT NULL DEFAULT (datetime('now')),
      reconsented_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_dpdp_optouts_scope ON comm_dpdp_optouts(channel_scope, suppression_status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS comm_variable_tags (
      id TEXT PRIMARY KEY,
      tag_key TEXT NOT NULL UNIQUE,
      placeholder_syntax TEXT NOT NULL,
      dlt_slot_mapping TEXT NOT NULL DEFAULT '{#var#}',
      category_group TEXT NOT NULL DEFAULT 'identity' CHECK (category_group IN ('identity', 'exam_recruitment', 'welfare_scheme', 'security_otp')),
      fallback_en TEXT NOT NULL DEFAULT '',
      fallback_or TEXT NOT NULL DEFAULT '',
      sample_value_en TEXT NOT NULL DEFAULT '',
      sample_value_or TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_var_tags_cat ON comm_variable_tags(category_group, is_active)`,
    `CREATE TABLE IF NOT EXISTS comm_delivery_receipts (
      id TEXT PRIMARY KEY,
      dlr_uid TEXT NOT NULL UNIQUE,
      channel_key TEXT NOT NULL DEFAULT 'sms_dlt' CHECK (channel_key IN ('sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
      carrier_or_mx TEXT NOT NULL DEFAULT 'Reliance Jio',
      circle_region TEXT NOT NULL DEFAULT 'Odisha Telecom Circle',
      campaign_or_template_code TEXT NOT NULL DEFAULT '',
      recipient_masked_hint TEXT NOT NULL DEFAULT '',
      delivery_status TEXT NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('delivered', 'bounced_hard', 'bounced_soft', 'dlt_scrubbed_failed', 'dnd_blocked', 'queued')),
      carrier_error_code TEXT NOT NULL DEFAULT '000_DELIVERED',
      latency_ms INTEGER NOT NULL DEFAULT 0,
      reported_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_dlr_lookup ON comm_delivery_receipts(channel_key, delivery_status, carrier_or_mx, reported_at DESC)`,
    `CREATE TABLE IF NOT EXISTS comm_broadcast_queue (
      id TEXT PRIMARY KEY,
      job_code TEXT NOT NULL UNIQUE,
      source_module_code TEXT NOT NULL DEFAULT '03' CHECK (source_module_code IN ('01', '02', '03', '04', '05', '06', '07')),
      source_ref_code TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      channel_key TEXT NOT NULL DEFAULT 'web_push' CHECK (channel_key IN ('sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
      audience_segment TEXT NOT NULL DEFAULT 'all_odisha_candidates',
      target_count INTEGER NOT NULL DEFAULT 0,
      scheduled_for_ist TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent_exam')),
      queue_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (queue_status IN ('scheduled', 'processing', 'completed', 'paused', 'cancelled')),
      dpdp_optouts_skipped INTEGER NOT NULL DEFAULT 0,
      executed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_queue_sched ON comm_broadcast_queue(queue_status, priority, scheduled_for_ist ASC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 09 DPDP Opt-Outs (hashed only)
  const optCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_dpdp_optouts`).first();
  if (Number(optCnt?.n || 0) === 0) {
    const h1 = await sha256Hex('9861004321');
    const h2 = await sha256Hex('rashmita.odisha@gmail.com');
    const h3 = await sha256Hex('7978001108');
    const seeds = [
      ['comm-opt-01', 'OPT-2026-0001', 'sms_dlt', h1, '98••••4321', 'sms_stop_keyword', 'Candidate replied STOP to promotional SMS', 'active_suppressed'],
      ['comm-opt-02', 'OPT-2026-0002', 'email', h2, 'ra•••@gmail.com', 'email_unsubscribe_link', 'Unsubscribed from weekly study digest', 'active_suppressed'],
      ['comm-opt-03', 'OPT-2026-0003', 'whatsapp_waba', h3, '79••••1108', 'whatsapp_stop_reply', 'Requested WhatsApp pause during exam prep', 're_consented']
    ];
    for (const s of seeds) {
      await db.prepare(
        `INSERT INTO comm_dpdp_optouts (id, suppression_code, channel_scope, contact_hash_sha256, contact_masked_hint, revocation_source, reason_note, suppression_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...s).run();
    }
  }

  // Seed Module 10 Bilingual EN/OR Variable Tags (7 starter tags)
  const tagCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_variable_tags`).first();
  if (Number(tagCnt?.n || 0) === 0) {
    const tags = [
      ['comm-tag-01', 'candidate_name', '{{candidate_name}}', '{#var#}', 'identity', 'Aspirant', 'ପ୍ରାର୍ଥୀ', 'Subham Mohanty', 'ଶୁଭମ ମହାନ୍ତି'],
      ['comm-tag-02', 'exam_title', '{{exam_title}}', '{#var#}', 'exam_recruitment', 'Odisha State Exam', 'ଓଡ଼ିଶା ରାଜ୍ୟ ପରୀକ୍ଷା', 'OPSC OAS Prelims 2026', 'OPSC OAS ପ୍ରିଲିମ୍ସ ୨୦୨୬'],
      ['comm-tag-03', 'admit_card_date', '{{admit_card_date}}', '{#var#}', 'exam_recruitment', 'Released Soon', 'ଶୀଘ୍ର ପ୍ରକାଶିତ ହେବ', '22 Nov 2026 (10:00 AM IST)', '୨୨ ନଭେମ୍ବର ୨୦୨୬'],
      ['comm-tag-04', 'scheme_name', '{{scheme_name}}', '{#var#}', 'welfare_scheme', 'Odisha Welfare Scheme', 'ଓଡ଼ିଶା କଲ୍ୟାଣ ଯୋଜନା', 'Subhadra Yojana DBT', 'ସୁଭଦ୍ରା ଯୋଜନା DBT'],
      ['comm-tag-05', 'deadline_countdown', '{{deadline_countdown}}', '{#var#}', 'exam_recruitment', '48 Hours Left', '୪୮ ଘଣ୍ଟା ବାକି ଅଛି', '2 Days Remaining', '୨ ଦିନ ବାକି ଅଛି'],
      ['comm-tag-06', 'district_name', '{{district_name}}', '{#var#}', 'identity', 'Odisha', 'ଓଡ଼ିଶା', 'Khordha (Bhubaneswar)', 'ଖୋର୍ଦ୍ଧା (ଭୁବନେଶ୍ୱର)'],
      ['comm-tag-07', 'otp_code', '{{otp_code}}', '{#var#}', 'security_otp', '000000', '୦୦୦୦୦୦', '482910', '482910']
    ];
    for (const t of tags) {
      await db.prepare(
        `INSERT INTO comm_variable_tags (id, tag_key, placeholder_syntax, dlt_slot_mapping, category_group, fallback_en, fallback_or, sample_value_en, sample_value_or, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(...t).run();
    }
  }

  // Seed Module 11 Delivery Receipts & Telecom Carrier Diagnostics
  const dlrCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_delivery_receipts`).first();
  if (Number(dlrCnt?.n || 0) === 0) {
    const dlrs = [
      ['comm-dlr-01', 'DLR-2026-0001', 'sms_dlt', 'Reliance Jio', 'Odisha Telecom Circle', 'DLT-CSO-001', '98••••4321', 'delivered', '000_DELIVERED', 410],
      ['comm-dlr-02', 'DLR-2026-0002', 'sms_dlt', 'Bharti Airtel', 'Odisha Telecom Circle', 'DLT-CSO-002', '94••••7712', 'delivered', '000_DELIVERED', 520],
      ['comm-dlr-03', 'DLR-2026-0003', 'sms_dlt', 'BSNL Odisha', 'Odisha Telecom Circle', 'DLT-CSO-002', '94••••1904', 'dlt_scrubbed_failed', '650_DLT_TEMPLATE_MISMATCH', 890],
      ['comm-dlr-04', 'DLR-2026-0004', 'email', 'Gmail MX', 'IN-East Edge', 'EML-2026-0001', 'su•••@gmail.com', 'delivered', '250_OK_ACCEPTED', 630],
      ['comm-dlr-05', 'DLR-2026-0005', 'email', 'Gmail MX', 'IN-East Edge', 'EML-2026-0001', 'old•••@yahoo.in', 'bounced_hard', '550_MAILBOX_UNAVAILABLE', 1120],
      ['comm-dlr-06', 'DLR-2026-0006', 'whatsapp_waba', 'Meta Cloud API', 'Asia-South', 'WABA-CSO-001', '99••••5501', 'delivered', 'META_200_READ', 340]
    ];
    for (const d of dlrs) {
      await db.prepare(
        `INSERT INTO comm_delivery_receipts (id, dlr_uid, channel_key, carrier_or_mx, circle_region, campaign_or_template_code, recipient_masked_hint, delivery_status, carrier_error_code, latency_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...d).run();
    }
  }

  // Seed Module 12 Scheduled Broadcast Queue
  const qCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_broadcast_queue`).first();
  if (Number(qCnt?.n || 0) === 0) {
    const jobs = [
      ['comm-q-01', 'QJOB-2026-0001', '03', 'ADM-2026-0001', 'OPSC OAS Prelims Hall Ticket Reminder', 'OPSC OAS ପ୍ରିଲିମ୍ସ ଆଡମିଟ୍ କାର୍ଡ ସୂଚନା', 'web_push', 'opsc_oas_aspirants', 4200, '2026-11-18T08:00:00+05:30', 'urgent_exam', 'scheduled', 0],
      ['comm-q-02', 'QJOB-2026-0002', '05', 'SCH-ALT-2026-0001', 'Subhadra Yojana NPCI e-KYC Morning Digest', 'ସୁଭଦ୍ରା ଯୋଜନା e-KYC ସୂଚନା', 'whatsapp_waba', 'women_entrepreneurs', 6800, '2026-11-18T09:30:00+05:30', 'high', 'scheduled', 0],
      ['comm-q-03', 'QJOB-2026-0003', '02', 'EML-2026-0001', 'Weekly Odisha GK & Current Affairs Digest', 'ସାପ୍ତାହିକ ଓଡ଼ିଶା GK ସାରାଂଶ', 'email', 'all_subscribers', 2450, '2026-11-16T08:30:00+05:30', 'normal', 'completed', 2]
    ];
    for (const j of jobs) {
      await db.prepare(
        `INSERT INTO comm_broadcast_queue (id, job_code, source_module_code, source_ref_code, title_en, title_or, channel_key, audience_segment, target_count, scheduled_for_ist, priority, queue_status, dpdp_optouts_skipped)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...j).run();
    }
  }

  _comm3Ready.add(db);
}

/* ================= UNIFIED 12-MODULE OVERVIEW ================= */
export async function getFull12ModuleCommunicationsOverview(env) {
  const db = env.DB;
  await ensureCommunicationsBatch3Schema(db);
  const base = await getCommunicationsOverview(db);

  const [optAct, optTot, tagAct, dlrTot, dlrDel, qSched, qComp, qTot] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM comm_dpdp_optouts WHERE suppression_status = 'active_suppressed'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_dpdp_optouts`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_variable_tags WHERE is_active = 1`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_delivery_receipts`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_delivery_receipts WHERE delivery_status = 'delivered'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_broadcast_queue WHERE queue_status = 'scheduled'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_broadcast_queue WHERE queue_status = 'completed'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_broadcast_queue`).first()
  ]);

  const totalDlr = Number(dlrTot?.n || 0);
  const delivDlr = Number(dlrDel?.n || 0);
  const dlrSuccessRatePct = totalDlr > 0 ? Math.round((delivDlr / totalDlr) * 1000) / 10 : 100;

  const modules = {
    ...(base.modules || {}),
    '09': { status: 'active', count: Number(optTot?.n || 0) },
    '10': { status: 'active', count: Number(tagAct?.n || 0) },
    '11': { status: 'active', count: totalDlr },
    '12': { status: 'active', count: Number(qTot?.n || 0) }
  };

  return {
    ...base,
    active_dpdp_suppressions: Number(optAct?.n || 0),
    active_bilingual_tags: Number(tagAct?.n || 0),
    dlr_total_events: totalDlr,
    dlr_delivered_events: delivDlr,
    dlr_success_rate_pct: dlrSuccessRatePct,
    scheduled_queue_jobs: Number(qSched?.n || 0),
    completed_queue_jobs: Number(qComp?.n || 0),
    modules,
    suite_12: {
      total_modules: 12,
      active_modules: 12,
      approved_dlt_templates: base.approved_dlt_templates,
      sent_email_campaigns: base.sent_email_campaigns,
      live_admit_card_alerts: base.live_admit_card_alerts,
      active_deadlines: base.active_deadlines,
      dispatched_scheme_alerts: base.dispatched_scheme_alerts,
      approved_waba_templates: base.approved_waba_templates,
      live_telegram_posts: base.live_telegram_posts,
      active_frequency_caps: base.active_frequency_caps,
      active_dpdp_suppressions: Number(optAct?.n || 0),
      active_bilingual_tags: Number(tagAct?.n || 0),
      dlr_success_rate_pct: dlrSuccessRatePct,
      scheduled_queue_jobs: Number(qSched?.n || 0)
    }
  };
}

/* ================= MODULE 09: DPDP OPT-OUT REGISTRY ================= */
async function nextOptCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_dpdp_optouts`).first();
  return `OPT-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleDpdpOptouts(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const scope = (url.searchParams.get('channel_scope') || '').trim();
    const status = (url.searchParams.get('suppression_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (scope && DPDP_CHANNEL_SCOPES.includes(scope)) { where.push('channel_scope = ?'); binds.push(scope); }
    if (status && DPDP_STATUSES.includes(status)) { where.push('suppression_status = ?'); binds.push(status); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(suppression_code LIKE ? ESCAPE '\\' OR contact_masked_hint LIKE ? ESCAPE '\\' OR reason_note LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_dpdp_optouts ${w} ORDER BY created_at DESC LIMIT 100`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'suppress' && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const rawContact = cleanStr(body.contact || '', 160);
    if (!rawContact) errors.contact = 'contact (phone or email) is required to compute SHA-256 suppression hash';
    const scope = pick(body.channel_scope, DPDP_CHANNEL_SCOPES, 'channel_scope', errors, 'all_channels');
    const source = pick(body.revocation_source, DPDP_REVOCATION_SOURCES, 'revocation_source', errors, 'admin_compliance_entry');
    if (Object.keys(errors).length) throw validationError(errors);

    const normalized = normalizeContact(rawContact);
    const hash = await sha256Hex(normalized);
    const maskedHint = maskContactHint(rawContact);
    const note = cleanStr(body.reason_note || '', 300);

    const existing = await db.prepare(`SELECT * FROM comm_dpdp_optouts WHERE contact_hash_sha256 = ?`).bind(hash).first();
    if (existing) {
      await snapshotCommRevision(db, '09', existing.id, actor, 're-suppress existing contact hash');
      await db.prepare(
        `UPDATE comm_dpdp_optouts
         SET channel_scope = ?, contact_masked_hint = ?, revocation_source = ?, reason_note = ?,
             suppression_status = 'active_suppressed', revoked_at = datetime('now'), reconsented_at = NULL, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(scope, maskedHint, source, note || existing.reason_note, existing.id).run();
      await audit(env, request, actor, 'comm.dpdp.suppress', 'comm_dpdp_optouts', existing.id, { channel_scope: scope });
      const updated = await db.prepare(`SELECT * FROM comm_dpdp_optouts WHERE id = ?`).bind(existing.id).first();
      return json({ item: updated, deduplicated: true });
    }

    const newId = rid('comm-opt');
    const code = await nextOptCode(db);
    await db.prepare(
      `INSERT INTO comm_dpdp_optouts (id, suppression_code, channel_scope, contact_hash_sha256, contact_masked_hint, revocation_source, reason_note, suppression_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active_suppressed')`
    ).bind(newId, code, scope, hash, maskedHint, source, note).run();
    await snapshotCommRevision(db, '09', newId, actor, 'create dpdp opt-out suppression');
    await audit(env, request, actor, 'comm.dpdp.suppress', 'comm_dpdp_optouts', newId, { suppression_code: code, channel_scope: scope });
    const created = await db.prepare(`SELECT * FROM comm_dpdp_optouts WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub === 'check' && method === 'POST') {
    const body = await readJson(request, 8000);
    const rawContact = cleanStr(body.contact || '', 160);
    if (!rawContact) throw validationError({ contact: 'contact is required' });
    const channel = cleanStr(body.channel_key || body.channel_scope || 'sms_dlt', 40);
    const hash = await sha256Hex(normalizeContact(rawContact));
    const match = await db.prepare(
      `SELECT id, suppression_code, channel_scope, contact_masked_hint, suppression_status, revoked_at
       FROM comm_dpdp_optouts
       WHERE contact_hash_sha256 = ? AND suppression_status = 'active_suppressed'
         AND (channel_scope = 'all_channels' OR channel_scope = ?)`
    ).bind(hash, channel).first();
    return json({
      suppressed: Boolean(match),
      channel_checked: channel,
      contact_hash_sha256: hash,
      contact_masked_hint: maskContactHint(rawContact),
      match: match || null
    });
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_dpdp_optouts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Suppression record not found');
    const body = await readJson(request, 10000);
    const errors = {};
    const nextStatus = pick(body.suppression_status, DPDP_STATUSES, 'suppression_status', errors, 're_consented');
    if (Object.keys(errors).length) throw validationError(errors);
    const note = body.reason_note !== undefined ? cleanStr(body.reason_note, 300) : existing.reason_note;

    await snapshotCommRevision(db, '09', sub, actor, `dpdp status -> ${nextStatus}`);
    if (nextStatus === 're_consented') {
      await db.prepare(
        `UPDATE comm_dpdp_optouts SET suppression_status = 're_consented', reason_note = ?, reconsented_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(note, sub).run();
    } else {
      await db.prepare(
        `UPDATE comm_dpdp_optouts SET suppression_status = 'active_suppressed', reason_note = ?, revoked_at = datetime('now'), reconsented_at = NULL, updated_at = datetime('now') WHERE id = ?`
      ).bind(note, sub).run();
    }
    await audit(env, request, actor, 'comm.dpdp.status', 'comm_dpdp_optouts', sub, { suppression_status: nextStatus });
    const updated = await db.prepare(`SELECT * FROM comm_dpdp_optouts WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 10: BILINGUAL VARIABLE TAG INTERPOLATOR ================= */
async function handleVariableTags(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const cat = (url.searchParams.get('category_group') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (cat && VAR_TAG_CATEGORIES.includes(cat)) { where.push('category_group = ?'); binds.push(cat); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(tag_key LIKE ? ESCAPE '\\' OR fallback_en LIKE ? ESCAPE '\\' OR fallback_or LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_variable_tags ${w} ORDER BY category_group ASC, tag_key ASC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'render-preview' && method === 'POST') {
    const body = await readJson(request, 20000);
    const { results } = await db.prepare(`SELECT * FROM comm_variable_tags WHERE is_active = 1`).all();
    const rendered = interpolateBilingualTemplate({
      template_en: body.template_en || '',
      template_or: body.template_or || '',
      tags: results || [],
      values: body.values && typeof body.values === 'object' ? body.values : {},
      use_samples: body.use_samples !== false
    });
    return json(rendered);
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const tagKey = cleanStr(body.tag_key || '', 60).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const cat = pick(body.category_group, VAR_TAG_CATEGORIES, 'category_group', errors, 'identity');
    if (!tagKey) errors.tag_key = 'tag_key is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('comm-tag');
    const syntax = `{{${tagKey}}}`;
    await db.prepare(
      `INSERT INTO comm_variable_tags (id, tag_key, placeholder_syntax, dlt_slot_mapping, category_group, fallback_en, fallback_or, sample_value_en, sample_value_or, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, tagKey, syntax, cleanStr(body.dlt_slot_mapping || '{#var#}', 40), cat,
      cleanStr(body.fallback_en || '', 120), cleanStr(body.fallback_or || '', 120),
      cleanStr(body.sample_value_en || '', 120), cleanStr(body.sample_value_or || '', 120),
      body.is_active === false || body.is_active === 0 ? 0 : 1
    ).run();

    await snapshotCommRevision(db, '10', newId, actor, 'create variable tag');
    await audit(env, request, actor, 'comm.vartag.create', 'comm_variable_tags', newId, { tag_key: tagKey });
    const created = await db.prepare(`SELECT * FROM comm_variable_tags WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM comm_variable_tags WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Variable tag not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const cat = body.category_group !== undefined
      ? pick(body.category_group, VAR_TAG_CATEGORIES, 'category_group', errors, existing.category_group)
      : existing.category_group;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotCommRevision(db, '10', sub, actor, 'update variable tag');
    await db.prepare(
      `UPDATE comm_variable_tags
       SET dlt_slot_mapping = ?, category_group = ?, fallback_en = ?, fallback_or = ?,
           sample_value_en = ?, sample_value_or = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.dlt_slot_mapping !== undefined ? cleanStr(body.dlt_slot_mapping, 40) : existing.dlt_slot_mapping,
      cat,
      body.fallback_en !== undefined ? cleanStr(body.fallback_en, 120) : existing.fallback_en,
      body.fallback_or !== undefined ? cleanStr(body.fallback_or, 120) : existing.fallback_or,
      body.sample_value_en !== undefined ? cleanStr(body.sample_value_en, 120) : existing.sample_value_en,
      body.sample_value_or !== undefined ? cleanStr(body.sample_value_or, 120) : existing.sample_value_or,
      body.is_active === undefined ? existing.is_active : (body.is_active ? 1 : 0),
      sub
    ).run();
    await audit(env, request, actor, 'comm.vartag.update', 'comm_variable_tags', sub, { tag_key: existing.tag_key });
    const updated = await db.prepare(`SELECT * FROM comm_variable_tags WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 11: CARRIER DLR & BOUNCE DIAGNOSTICS ================= */
async function nextDlrUid(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_delivery_receipts`).first();
  return `DLR-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleDlr(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const ch = (url.searchParams.get('channel_key') || '').trim();
    const carrier = (url.searchParams.get('carrier_or_mx') || '').trim();
    const st = (url.searchParams.get('delivery_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (ch && DLR_CHANNELS.includes(ch)) { where.push('channel_key = ?'); binds.push(ch); }
    if (carrier) { where.push('carrier_or_mx = ?'); binds.push(carrier); }
    if (st && DLR_STATUSES.includes(st)) { where.push('delivery_status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(dlr_uid LIKE ? ESCAPE '\\' OR campaign_or_template_code LIKE ? ESCAPE '\\' OR carrier_error_code LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ results: items }, { results: breakdown }] = await Promise.all([
      db.prepare(`SELECT * FROM comm_delivery_receipts ${w} ORDER BY reported_at DESC LIMIT 120`).bind(...binds).all(),
      db.prepare(
        `SELECT carrier_or_mx, channel_key,
                COUNT(*) AS total_count,
                SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
                ROUND(AVG(latency_ms), 0) AS avg_latency_ms
         FROM comm_delivery_receipts
         GROUP BY carrier_or_mx, channel_key
         ORDER BY total_count DESC`
      ).all()
    ]);

    const carrier_breakdown = (breakdown || []).map(r => ({
      ...r,
      delivery_rate_pct: Number(r.total_count || 0) > 0
        ? Math.round((Number(r.delivered_count || 0) / Number(r.total_count)) * 1000) / 10
        : 0
    }));
    const list = items || [];
    const deliv = list.filter(x => x.delivery_status === 'delivered').length;
    return json({
      items: list,
      carrier_breakdown,
      summary: {
        total_events: list.length,
        delivered_events: deliv,
        delivery_rate_pct: list.length ? Math.round((deliv / list.length) * 1000) / 10 : 100
      }
    });
  }

  if (sub === 'ingest' && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const ch = pick(body.channel_key, DLR_CHANNELS, 'channel_key', errors, 'sms_dlt');
    const st = pick(body.delivery_status, DLR_STATUSES, 'delivery_status', errors, 'delivered');
    const carrier = cleanStr(body.carrier_or_mx || 'Reliance Jio', 80);
    if (!carrier) errors.carrier_or_mx = 'carrier_or_mx is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('comm-dlr');
    const uid = await nextDlrUid(db);
    await db.prepare(
      `INSERT INTO comm_delivery_receipts (id, dlr_uid, channel_key, carrier_or_mx, circle_region, campaign_or_template_code, recipient_masked_hint, delivery_status, carrier_error_code, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, uid, ch, carrier,
      cleanStr(body.circle_region || 'Odisha Telecom Circle', 80),
      cleanStr(body.campaign_or_template_code || '', 60),
      maskContactHint(body.recipient_masked_hint || body.recipient || '9800000000'),
      st,
      cleanStr(body.carrier_error_code || (st === 'delivered' ? '000_DELIVERED' : 'ERR_CARRIER'), 80),
      Math.max(0, Number(body.latency_ms || 0) || 0)
    ).run();
    await audit(env, request, actor, 'comm.dlr.ingest', 'comm_delivery_receipts', newId, { dlr_uid: uid, delivery_status: st });
    const created = await db.prepare(`SELECT * FROM comm_delivery_receipts WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 12: SCHEDULED BROADCAST QUEUE ================= */
async function nextJobCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_broadcast_queue`).first();
  return `QJOB-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleQueue(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const st = (url.searchParams.get('queue_status') || '').trim();
    const ch = (url.searchParams.get('channel_key') || '').trim();
    const prio = (url.searchParams.get('priority') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (st && QUEUE_STATUSES.includes(st)) { where.push('queue_status = ?'); binds.push(st); }
    if (ch && DLR_CHANNELS.includes(ch)) { where.push('channel_key = ?'); binds.push(ch); }
    if (prio && QUEUE_PRIORITIES.includes(prio)) { where.push('priority = ?'); binds.push(prio); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(job_code LIKE ? ESCAPE '\\' OR title_en LIKE ? ESCAPE '\\' OR source_ref_code LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_broadcast_queue ${w} ORDER BY scheduled_for_ist ASC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 16000);
    const errors = {};
    const srcMod = pick(body.source_module_code, QUEUE_SOURCE_MODULES, 'source_module_code', errors, '03');
    const ch = pick(body.channel_key, DLR_CHANNELS, 'channel_key', errors, 'web_push');
    const prio = pick(body.priority, QUEUE_PRIORITIES, 'priority', errors, 'normal');
    const titleEn = cleanStr(body.title_en || '', 200);
    const sched = cleanStr(body.scheduled_for_ist || '', 60);
    if (!titleEn) errors.title_en = 'title_en is required';
    if (!sched) errors.scheduled_for_ist = 'scheduled_for_ist is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('comm-q');
    const code = await nextJobCode(db);
    await db.prepare(
      `INSERT INTO comm_broadcast_queue (id, job_code, source_module_code, source_ref_code, title_en, title_or, channel_key, audience_segment, target_count, scheduled_for_ist, priority, queue_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`
    ).bind(
      newId, code, srcMod, cleanStr(body.source_ref_code || '', 60),
      titleEn, cleanStr(body.title_or || '', 240), ch,
      cleanStr(body.audience_segment || 'all_odisha_candidates', 80),
      Math.max(0, Number(body.target_count || 0) || 0),
      sched, prio
    ).run();

    await snapshotCommRevision(db, '12', newId, actor, 'enqueue broadcast job');
    await audit(env, request, actor, 'comm.queue.enqueue', 'comm_broadcast_queue', newId, { job_code: code, channel_key: ch });
    const created = await db.prepare(`SELECT * FROM comm_broadcast_queue WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_broadcast_queue WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Queue job not found');
    const body = await readJson(request, 10000);
    const action = cleanStr(body.action || '', 40);
    if (!['execute_now', 'pause', 'resume', 'cancel'].includes(action)) {
      throw validationError({ action: 'action must be execute_now, pause, resume, or cancel' });
    }

    await snapshotCommRevision(db, '12', sub, actor, `queue action: ${action}`);
    if (action === 'execute_now') {
      const optRow = await db.prepare(
        `SELECT COUNT(*) AS n FROM comm_dpdp_optouts
         WHERE suppression_status = 'active_suppressed' AND (channel_scope = 'all_channels' OR channel_scope = ?)`
      ).bind(existing.channel_key).first();
      const skipped = Number(optRow?.n || 0);
      await db.prepare(
        `UPDATE comm_broadcast_queue
         SET queue_status = 'completed', dpdp_optouts_skipped = ?, executed_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      ).bind(skipped, sub).run();
      await audit(env, request, actor, 'comm.queue.execute', 'comm_broadcast_queue', sub, { dpdp_optouts_skipped: skipped });
    } else {
      const nextSt = action === 'pause' ? 'paused' : action === 'resume' ? 'scheduled' : 'cancelled';
      await db.prepare(
        `UPDATE comm_broadcast_queue SET queue_status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(nextSt, sub).run();
      await audit(env, request, actor, `comm.queue.${action}`, 'comm_broadcast_queue', sub, { queue_status: nextSt });
    }
    const updated = await db.prepare(`SELECT * FROM comm_broadcast_queue WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCommunicationsBatch3Admin(request, env, actor, id, sub) {
  await ensureCommunicationsBatch3Schema(env.DB);
  if (id === 'dpdp-optouts') return handleDpdpOptouts(request, env, actor, sub);
  if (id === 'variable-tags') return handleVariableTags(request, env, actor, sub);
  if (id === 'dlr') return handleDlr(request, env, actor, sub);
  if (id === 'queue') return handleQueue(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown communications batch 3 route');
}
