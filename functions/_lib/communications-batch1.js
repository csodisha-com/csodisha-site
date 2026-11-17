// Communications, Alerts & Candidate Notifications Batch 1 (v105): Modules 01-04
// 01 SMS Gateway & TRAI DLT | 02 Multilingual Email Campaigns | 03 Admit Card Push Alerts | 04 Deadline Countdown Broadcaster
// Never expose raw SMS/SMTP API keys or secrets in API responses.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';

export const COMM_GATEWAYS = ['msg91', 'kaleyra', 'fast2sms_dlt', 'gupshup', 'twilio_in'];
export const COMM_DLT_CATEGORIES = ['transactional_otp', 'service_implicit', 'service_explicit'];
export const COMM_DLT_STATUSES = ['approved_dlt', 'pending_dlt', 'rejected', 'archived'];
export const COMM_EMAIL_TYPES = ['exam_bulletin', 'weekly_study_digest', 'scheme_alert', 'mock_test_invite', 'onboarding'];
export const COMM_EMAIL_SEGMENTS = ['all_subscribers', 'opsc_oas_aspirants', 'ossc_osssc_aspirants', 'ugc_net_scholars', 'odia_medium_learners'];
export const COMM_EMAIL_STATUSES = ['draft', 'scheduled', 'sent', 'archived'];
export const COMM_COMMISSIONS = ['opsc', 'ossc', 'osssc', 'nta_ugc_net', 'bse_chse', 'rrc_bhubaneswar'];
export const COMM_URGENCY_LEVELS = ['standard', 'high_priority', 'urgent_hall_ticket'];
export const COMM_DISPATCH_STATUSES = ['draft', 'dispatched_live', 'archived'];
export const COMM_CADENCES = ['7d_3d_24h_final', '48h_6h_closing', 'single_final_call'];
export const COMM_DEADLINE_STATUSES = ['scheduled', 'active_countdown', 'closed_expired', 'archived'];

const _comm1Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

export function maskSecret(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.length <= 6) return '••••';
  return `${s.slice(0, 4)}••••••${s.slice(-4)}`;
}

function stripSecrets(row) {
  if (!row) return row;
  const out = { ...row };
  delete out.api_key;
  delete out.auth_key;
  delete out.smtp_password;
  delete out.secret;
  return out;
}

/** Deterministic TRAI DLT & SMS segment validator. */
export function validateDltTemplate({ sender_id = '', dlt_template_id = '', template_body = '', lang_code = 'en' }) {
  const senderOk = /^[A-Z0-9]{6}$/.test(String(sender_id || '').trim());
  const dltIdOk = /^\d{19}$/.test(String(dlt_template_id || '').trim());
  const body = String(template_body || '');
  const vars = body.match(/\{#var#\}/gi) || [];
  const isUnicode = lang_code === 'or' || /[^\x00-\x7F]/.test(body);
  const singleLimit = isUnicode ? 70 : 160;
  const multiLimit = isUnicode ? 67 : 153;
  const charCount = body.length;
  const segments = charCount === 0 ? 0 : charCount <= singleLimit ? 1 : Math.ceil(charCount / multiLimit);
  return {
    valid: senderOk && dltIdOk && charCount > 0,
    sender_id_valid: senderOk,
    dlt_template_id_valid: dltIdOk,
    var_count: vars.length,
    encoding: isUnicode ? 'UCS-2 (Unicode/Odia)' : 'GSM-7',
    char_count: charCount,
    sms_segments: segments
  };
}

export const COMM_REV_TABLES = {
  '01': {
    table: 'comm_sms_dlt_templates',
    cols: ['template_code', 'gateway_provider', 'sender_id', 'pe_id', 'dlt_template_id', 'template_category', 'lang_code', 'template_body', 'var_count', 'secret_masked_hint', 'approval_status', 'sent_count']
  },
  '02': {
    table: 'comm_email_campaigns',
    cols: ['campaign_code', 'campaign_type', 'audience_segment', 'subject_en', 'subject_or', 'preheader_en', 'preheader_or', 'body_blocks_json', 'recipient_count', 'open_rate_pct', 'click_rate_pct', 'campaign_status', 'sent_at']
  },
  '03': {
    table: 'comm_admit_card_alerts',
    cols: ['alert_code', 'commission_key', 'exam_title_en', 'exam_title_or', 'advt_number', 'exam_date', 'download_portal_url', 'channels_json', 'target_district_scope', 'urgency_level', 'dispatched_count', 'dispatch_status', 'dispatched_at']
  },
  '04': {
    table: 'comm_deadline_broadcasts',
    cols: ['broadcast_code', 'commission_key', 'post_title_en', 'post_title_or', 'vacancy_count', 'application_deadline_at', 'fee_last_date', 'apply_url', 'reminder_cadence', 'channels_json', 'subscribers_notified', 'broadcast_status']
  }
};

export async function snapshotCommRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = COMM_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM comm_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('comm-rev');
  await db.prepare(
    `INSERT INTO comm_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(stripSecrets(row)), cleanStr(changeNote, 200), actor?.email || actor?.userId || 'system').run();
  return { id: revId, version_num: nextVer };
}

export async function ensureCommunicationsBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_comm1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS comm_sms_dlt_templates (
      id TEXT PRIMARY KEY,
      template_code TEXT NOT NULL UNIQUE,
      gateway_provider TEXT NOT NULL DEFAULT 'msg91' CHECK (gateway_provider IN ('msg91', 'kaleyra', 'fast2sms_dlt', 'gupshup', 'twilio_in')),
      sender_id TEXT NOT NULL DEFAULT 'CSODSH',
      pe_id TEXT NOT NULL DEFAULT '',
      dlt_template_id TEXT NOT NULL,
      template_category TEXT NOT NULL DEFAULT 'transactional_otp' CHECK (template_category IN ('transactional_otp', 'service_implicit', 'service_explicit')),
      lang_code TEXT NOT NULL DEFAULT 'en' CHECK (lang_code IN ('en', 'or')),
      template_body TEXT NOT NULL,
      var_count INTEGER NOT NULL DEFAULT 0,
      secret_masked_hint TEXT NOT NULL DEFAULT '',
      approval_status TEXT NOT NULL DEFAULT 'pending_dlt' CHECK (approval_status IN ('approved_dlt', 'pending_dlt', 'rejected', 'archived')),
      sent_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_sms_dlt_status ON comm_sms_dlt_templates(approval_status, gateway_provider, template_category)`,
    `CREATE TABLE IF NOT EXISTS comm_email_campaigns (
      id TEXT PRIMARY KEY,
      campaign_code TEXT NOT NULL UNIQUE,
      campaign_type TEXT NOT NULL DEFAULT 'exam_bulletin' CHECK (campaign_type IN ('exam_bulletin', 'weekly_study_digest', 'scheme_alert', 'mock_test_invite', 'onboarding')),
      audience_segment TEXT NOT NULL DEFAULT 'all_subscribers' CHECK (audience_segment IN ('all_subscribers', 'opsc_oas_aspirants', 'ossc_osssc_aspirants', 'ugc_net_scholars', 'odia_medium_learners')),
      subject_en TEXT NOT NULL,
      subject_or TEXT NOT NULL DEFAULT '',
      preheader_en TEXT NOT NULL DEFAULT '',
      preheader_or TEXT NOT NULL DEFAULT '',
      body_blocks_json TEXT NOT NULL DEFAULT '[]',
      recipient_count INTEGER NOT NULL DEFAULT 0,
      open_rate_pct REAL NOT NULL DEFAULT 0,
      click_rate_pct REAL NOT NULL DEFAULT 0,
      campaign_status TEXT NOT NULL DEFAULT 'draft' CHECK (campaign_status IN ('draft', 'scheduled', 'sent', 'archived')),
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_email_status ON comm_email_campaigns(campaign_status, audience_segment, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS comm_admit_card_alerts (
      id TEXT PRIMARY KEY,
      alert_code TEXT NOT NULL UNIQUE,
      commission_key TEXT NOT NULL DEFAULT 'opsc' CHECK (commission_key IN ('opsc', 'ossc', 'osssc', 'nta_ugc_net', 'bse_chse', 'rrc_bhubaneswar')),
      exam_title_en TEXT NOT NULL,
      exam_title_or TEXT NOT NULL DEFAULT '',
      advt_number TEXT NOT NULL DEFAULT '',
      exam_date TEXT NOT NULL DEFAULT '',
      download_portal_url TEXT NOT NULL DEFAULT '',
      channels_json TEXT NOT NULL DEFAULT '["web_push","email"]',
      target_district_scope TEXT NOT NULL DEFAULT 'all_30_districts' CHECK (target_district_scope IN ('all_30_districts', 'selected_zones')),
      urgency_level TEXT NOT NULL DEFAULT 'high_priority' CHECK (urgency_level IN ('standard', 'high_priority', 'urgent_hall_ticket')),
      dispatched_count INTEGER NOT NULL DEFAULT 0,
      dispatch_status TEXT NOT NULL DEFAULT 'draft' CHECK (dispatch_status IN ('draft', 'dispatched_live', 'archived')),
      dispatched_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_admit_status ON comm_admit_card_alerts(dispatch_status, commission_key, urgency_level)`,
    `CREATE TABLE IF NOT EXISTS comm_deadline_broadcasts (
      id TEXT PRIMARY KEY,
      broadcast_code TEXT NOT NULL UNIQUE,
      commission_key TEXT NOT NULL DEFAULT 'osssc' CHECK (commission_key IN ('opsc', 'ossc', 'osssc', 'nta_ugc_net', 'bse_chse', 'rrc_bhubaneswar')),
      post_title_en TEXT NOT NULL,
      post_title_or TEXT NOT NULL DEFAULT '',
      vacancy_count INTEGER NOT NULL DEFAULT 0,
      application_deadline_at TEXT NOT NULL,
      fee_last_date TEXT NOT NULL DEFAULT '',
      apply_url TEXT NOT NULL DEFAULT '',
      reminder_cadence TEXT NOT NULL DEFAULT '7d_3d_24h_final' CHECK (reminder_cadence IN ('7d_3d_24h_final', '48h_6h_closing', 'single_final_call')),
      channels_json TEXT NOT NULL DEFAULT '["web_push","sms_dlt","email"]',
      subscribers_notified INTEGER NOT NULL DEFAULT 0,
      broadcast_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (broadcast_status IN ('scheduled', 'active_countdown', 'closed_expired', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_deadline_status ON comm_deadline_broadcasts(broadcast_status, application_deadline_at ASC)`,
    `CREATE TABLE IF NOT EXISTS comm_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_rev_lookup ON comm_revisions(module_code, entity_id, version_num DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 01 TRAI DLT SMS templates
  const smsCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_sms_dlt_templates`).first();
  if (Number(smsCnt?.n || 0) === 0) {
    const smsSeeds = [
      ['comm-sms-01', 'DLT-CSO-001', 'msg91', 'CSODSH', '1101598420000012345', '1107170000000000101', 'transactional_otp', 'en', 'Your CS Odisha verification OTP is {#var#}. Valid for 10 minutes. Do not share.', 1, 'msg9••••••9a2f', 'approved_dlt', 1420],
      ['comm-sms-02', 'DLT-CSO-002', 'kaleyra', 'CSODSH', '1101598420000012345', '1107170000000000102', 'service_implicit', 'en', 'CS Odisha Alert: {#var#} Admit Card released! Download at {#var#}', 2, 'klyr••••••4c1b', 'approved_dlt', 860]
    ];
    for (const s of smsSeeds) {
      await db.prepare(
        `INSERT INTO comm_sms_dlt_templates (id, template_code, gateway_provider, sender_id, pe_id, dlt_template_id, template_category, lang_code, template_body, var_count, secret_masked_hint, approval_status, sent_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...s).run();
    }
  }

  // Seed Module 02 Email campaigns
  const emlCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_email_campaigns`).first();
  if (Number(emlCnt?.n || 0) === 0) {
    const blocks = [
      {
        heading_en: 'OPSC OAS 2026 Prelims Strategy & New PYQs',
        heading_or: 'OPSC OAS ୨୦୨୬ ପ୍ରିଲିମ୍ସ ରଣନୀତି ଏବଂ ନୂତନ PYQ',
        paragraph_en: 'Download bilingual Odisha History & Polity notes and attempt this week\'s 50-question GS-1 mock.',
        paragraph_or: 'ଓଡ଼ିଶା ଇତିହାସ ଏବଂ ରାଜନୀତି ନୋଟ୍ସ ଡାଉନଲୋଡ୍ କରନ୍ତୁ ଏବଂ ମକ୍ ଟେଷ୍ଟ ଦିଅନ୍ତୁ।',
        cta_label_en: 'Open Study Library',
        cta_url: 'https://csodisha.com/study-library/'
      }
    ];
    await db.prepare(
      `INSERT INTO comm_email_campaigns (id, campaign_code, campaign_type, audience_segment, subject_en, subject_or, preheader_en, preheader_or, body_blocks_json, recipient_count, open_rate_pct, click_rate_pct, campaign_status, sent_at)
       VALUES ('comm-eml-01', 'EML-2026-0001', 'weekly_study_digest', 'all_subscribers',
               'CS Odisha Weekly Exam & Study Digest — OPSC, OSSC & UGC NET',
               'CS ଓଡ଼ିଶା ସାପ୍ତାହିକ ପରୀକ୍ଷା ଏବଂ ଅଧ୍ୟୟନ ସାରାଂଶ',
               'New PYQ packs, live job deadlines, and Odisha scheme updates.',
               'ନୂତନ PYQ ପ୍ୟାକ୍ ଏବଂ ସରକାରୀ ଚାକିରି ସୂଚନା।',
               ?, 2450, 42.5, 11.8, 'sent', datetime('now'))`
    ).bind(JSON.stringify(blocks)).run();
  }

  // Seed Module 03 Admit Card Alerts
  const admCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_admit_card_alerts`).first();
  if (Number(admCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO comm_admit_card_alerts (id, alert_code, commission_key, exam_title_en, exam_title_or, advt_number, exam_date, download_portal_url, channels_json, target_district_scope, urgency_level, dispatched_count, dispatch_status, dispatched_at)
       VALUES ('comm-adm-01', 'ADM-ALT-2026-0001', 'opsc', 'OPSC OAS Prelims 2026 Hall Ticket', 'OPSC OAS ପ୍ରିଲିମ୍ସ ୨୦୨୬ ଆଡମିଟ୍ କାର୍ଡ', 'Advt. No. 20 of 2025-26', '2026-12-14', 'https://www.opsc.gov.in', '["web_push","sms_dlt","email"]', 'all_30_districts', 'urgent_hall_ticket', 1840, 'dispatched_live', datetime('now'))`
    ).run();
    await db.prepare(
      `INSERT INTO comm_admit_card_alerts (id, alert_code, commission_key, exam_title_en, exam_title_or, advt_number, exam_date, download_portal_url, channels_json, target_district_scope, urgency_level, dispatched_count, dispatch_status)
       VALUES ('comm-adm-02', 'ADM-ALT-2026-0002', 'ossc', 'OSSC CGL Mains Skill Test Admit Card', 'OSSC CGL ମେନ୍ସ ସ୍କିଲ୍ ଟେଷ୍ଟ ଆଡମିଟ୍ କାର୍ଡ', 'Advt. No. 4120/OSSC', '2026-12-22', 'https://www.ossc.gov.in', '["web_push","email"]', 'all_30_districts', 'high_priority', 0, 'draft')`
    ).run();
  }

  // Seed Module 04 Deadline Countdown Broadcaster
  const ddlCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_deadline_broadcasts`).first();
  if (Number(ddlCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO comm_deadline_broadcasts (id, broadcast_code, commission_key, post_title_en, post_title_or, vacancy_count, application_deadline_at, fee_last_date, apply_url, reminder_cadence, channels_json, subscribers_notified, broadcast_status)
       VALUES ('comm-ddl-01', 'DDL-2026-0001', 'osssc', 'OSSSC Revenue Inspector (RI), ARI & Amin Combined 2026', 'OSSSC RI, ARI ଏବଂ ଅମିନ ନିଯୁକ୍ତି ୨୦୨୬', 2895, date('now', '+5 days') || 'T23:59:00Z', date('now', '+4 days'), 'https://www.osssc.gov.in', '7d_3d_24h_final', '["web_push","sms_dlt","email"]', 1240, 'active_countdown')`
    ).run();
  }

  _comm1Ready.add(db);
}

export async function getCommunicationsOverview(db) {
  const [smsApp, smsTot, emlSent, emlTot, admLive, admDisp, ddlAct, ddlTot] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM comm_sms_dlt_templates WHERE approval_status = 'approved_dlt'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_sms_dlt_templates`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_email_campaigns WHERE campaign_status = 'sent'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_email_campaigns`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_admit_card_alerts WHERE dispatch_status = 'dispatched_live'`).first(),
    db.prepare(`SELECT COALESCE(SUM(dispatched_count), 0) AS n FROM comm_admit_card_alerts`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_deadline_broadcasts WHERE broadcast_status = 'active_countdown'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM comm_deadline_broadcasts`).first()
  ]);

  const modules = {};
  for (let i = 1; i <= 12; i++) {
    const k = String(i).padStart(2, '0');
    let count = 0;
    if (i === 1) count = Number(smsTot?.n || 0);
    else if (i === 2) count = Number(emlTot?.n || 0);
    else if (i === 3) count = Number(admLive?.n || 0);
    else if (i === 4) count = Number(ddlTot?.n || 0);
    modules[k] = { status: i <= 4 ? 'active' : 'queued', count };
  }

  return {
    approved_dlt_templates: Number(smsApp?.n || 0),
    sent_email_campaigns: Number(emlSent?.n || 0),
    live_admit_card_alerts: Number(admLive?.n || 0),
    total_admit_dispatched: Number(admDisp?.n || 0),
    active_deadline_countdowns: Number(ddlAct?.n || 0),
    modules
  };
}

/* ================= MODULE 01: SMS & TRAI DLT ================= */
async function nextSmsCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_sms_dlt_templates`).first();
  return `DLT-CSO-${String(Number(r?.n || 0) + 1).padStart(3, '0')}`;
}

async function handleSmsDlt(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('approval_status') || '').trim();
    const gw = (url.searchParams.get('gateway_provider') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('approval_status = ?'); binds.push(status); }
    if (gw) { where.push('gateway_provider = ?'); binds.push(gw); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(template_code LIKE ? ESCAPE '\\' OR dlt_template_id LIKE ? ESCAPE '\\' OR template_body LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_sms_dlt_templates ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(stripSecrets) });
  }

  if (sub === 'validate' && method === 'POST') {
    const body = await readJson(request, 10000);
    return json(validateDltTemplate(body));
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const gw = pick(body.gateway_provider, COMM_GATEWAYS, 'gateway_provider', errors, 'msg91');
    const cat = pick(body.template_category, COMM_DLT_CATEGORIES, 'template_category', errors, 'transactional_otp');
    const lang = body.lang_code === 'or' ? 'or' : 'en';
    const sender = cleanStr(body.sender_id || 'CSODSH', 10).toUpperCase();
    const dltId = cleanStr(body.dlt_template_id || '', 30);
    const tplBody = cleanStr(body.template_body || '', 1000);
    const status = pick(body.approval_status, COMM_DLT_STATUSES, 'approval_status', errors, 'pending_dlt');

    const check = validateDltTemplate({ sender_id: sender, dlt_template_id: dltId, template_body: tplBody, lang_code: lang });
    if (!check.sender_id_valid) errors.sender_id = 'Sender ID must be 6 uppercase alphanumeric characters';
    if (!check.dlt_template_id_valid) errors.dlt_template_id = 'DLT Template ID must be 19 digits';
    if (!tplBody) errors.template_body = 'template_body is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('comm-sms');
    const code = cleanStr(body.template_code || '', 30) || await nextSmsCode(db);
    const hint = body.raw_api_key ? maskSecret(body.raw_api_key) : cleanStr(body.secret_masked_hint || '', 40);

    await db.prepare(
      `INSERT INTO comm_sms_dlt_templates (id, template_code, gateway_provider, sender_id, pe_id, dlt_template_id, template_category, lang_code, template_body, var_count, secret_masked_hint, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, code, gw, sender, cleanStr(body.pe_id || '', 30), dltId, cat, lang, tplBody, check.var_count, hint, status).run();

    await snapshotCommRevision(db, '01', newId, actor, 'create DLT template');
    await audit(env, request, actor, 'comm.sms_dlt.create', 'comm_sms_dlt_templates', newId, { template_code: code });
    const created = await db.prepare(`SELECT * FROM comm_sms_dlt_templates WHERE id = ?`).bind(newId).first();
    return json({ item: stripSecrets(created), validation: check }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM comm_sms_dlt_templates WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'DLT template not found');
    const body = await readJson(request, 15000);
    const errors = {};
    const tplBody = body.template_body !== undefined ? cleanStr(body.template_body, 1000) : existing.template_body;
    const status = body.approval_status !== undefined ? pick(body.approval_status, COMM_DLT_STATUSES, 'approval_status', errors, existing.approval_status) : existing.approval_status;
    if (Object.keys(errors).length) throw validationError(errors);
    const vars = (tplBody.match(/\{#var#\}/gi) || []).length;

    await snapshotCommRevision(db, '01', sub, actor, body.change_note || 'update DLT template');
    await db.prepare(
      `UPDATE comm_sms_dlt_templates SET template_body = ?, var_count = ?, approval_status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(tplBody, vars, status, sub).run();
    await audit(env, request, actor, 'comm.sms_dlt.update', 'comm_sms_dlt_templates', sub, { approval_status: status });
    const updated = await db.prepare(`SELECT * FROM comm_sms_dlt_templates WHERE id = ?`).bind(sub).first();
    return json({ item: stripSecrets(updated) });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM comm_sms_dlt_templates WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'DLT template not found');
    await snapshotCommRevision(db, '01', sub, actor, 'archive DLT template');
    await db.prepare(`UPDATE comm_sms_dlt_templates SET approval_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, approval_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 02: EMAIL CAMPAIGNS ================= */
function decorateEmail(r) {
  if (!r) return r;
  return { ...r, body_blocks: parseJson(r.body_blocks_json, []) };
}

async function nextEmailCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_email_campaigns`).first();
  return `EML-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleEmails(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('campaign_status') || '').trim();
    const seg = (url.searchParams.get('audience_segment') || '').trim();
    const where = [];
    const binds = [];
    if (status) { where.push('campaign_status = ?'); binds.push(status); }
    if (seg) { where.push('audience_segment = ?'); binds.push(seg); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_email_campaigns ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decorateEmail) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 35000);
    const errors = {};
    const cType = pick(body.campaign_type, COMM_EMAIL_TYPES, 'campaign_type', errors, 'exam_bulletin');
    const seg = pick(body.audience_segment, COMM_EMAIL_SEGMENTS, 'audience_segment', errors, 'all_subscribers');
    const subjEn = cleanStr(body.subject_en || '', 200);
    if (!subjEn) errors.subject_en = 'subject_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const blocks = Array.isArray(body.body_blocks) ? body.body_blocks : parseJson(body.body_blocks_json, []);
    const newId = rid('comm-eml');
    const code = await nextEmailCode(db);
    await db.prepare(
      `INSERT INTO comm_email_campaigns (id, campaign_code, campaign_type, audience_segment, subject_en, subject_or, preheader_en, preheader_or, body_blocks_json, recipient_count, campaign_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    ).bind(
      newId, code, cType, seg, subjEn, cleanStr(body.subject_or || '', 240),
      cleanStr(body.preheader_en || '', 200), cleanStr(body.preheader_or || '', 220),
      JSON.stringify(blocks), Math.max(0, Number(body.recipient_count || 0) || 0)
    ).run();

    await snapshotCommRevision(db, '02', newId, actor, 'create email campaign');
    await audit(env, request, actor, 'comm.email.create', 'comm_email_campaigns', newId, { campaign_code: code });
    const created = await db.prepare(`SELECT * FROM comm_email_campaigns WHERE id = ?`).bind(newId).first();
    return json({ item: decorateEmail(created) }, 201);
  }

  if (sub && extra === 'send' && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_email_campaigns WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Email campaign not found');
    const body = await readJson(request, 10000).catch(() => ({}));
    const recCount = Math.max(1, Number(body.recipient_count || existing.recipient_count || 500));

    await snapshotCommRevision(db, '02', sub, actor, 'send email campaign');
    await db.prepare(
      `UPDATE comm_email_campaigns SET campaign_status = 'sent', recipient_count = ?, sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(recCount, sub).run();
    await audit(env, request, actor, 'comm.email.send', 'comm_email_campaigns', sub, { recipient_count: recCount });
    const updated = await db.prepare(`SELECT * FROM comm_email_campaigns WHERE id = ?`).bind(sub).first();
    return json({ item: decorateEmail(updated) });
  }

  if (sub && !extra && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM comm_email_campaigns WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Email campaign not found');
    const body = await readJson(request, 35000);
    const subjEn = body.subject_en !== undefined ? cleanStr(body.subject_en, 200) : existing.subject_en;
    const subjOr = body.subject_or !== undefined ? cleanStr(body.subject_or, 240) : existing.subject_or;
    const blocksJson = body.body_blocks !== undefined ? JSON.stringify(body.body_blocks) : existing.body_blocks_json;

    await snapshotCommRevision(db, '02', sub, actor, body.change_note || 'update email campaign');
    await db.prepare(
      `UPDATE comm_email_campaigns SET subject_en = ?, subject_or = ?, body_blocks_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(subjEn, subjOr, blocksJson, sub).run();
    const updated = await db.prepare(`SELECT * FROM comm_email_campaigns WHERE id = ?`).bind(sub).first();
    return json({ item: decorateEmail(updated) });
  }

  if (sub && method === 'DELETE') {
    await snapshotCommRevision(db, '02', sub, actor, 'archive email campaign');
    await db.prepare(`UPDATE comm_email_campaigns SET campaign_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, campaign_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 03: ADMIT CARD ALERTS ================= */
function decorateAdmit(r) {
  if (!r) return r;
  return { ...r, channels: parseJson(r.channels_json, []) };
}

async function nextAdmitCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_admit_card_alerts`).first();
  return `ADM-ALT-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleAdmitCards(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const comm = (url.searchParams.get('commission_key') || '').trim();
    const status = (url.searchParams.get('dispatch_status') || '').trim();
    const where = [];
    const binds = [];
    if (comm) { where.push('commission_key = ?'); binds.push(comm); }
    if (status) { where.push('dispatch_status = ?'); binds.push(status); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_admit_card_alerts ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decorateAdmit) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const comm = pick(body.commission_key, COMM_COMMISSIONS, 'commission_key', errors, 'opsc');
    const urg = pick(body.urgency_level, COMM_URGENCY_LEVELS, 'urgency_level', errors, 'high_priority');
    const titleEn = cleanStr(body.exam_title_en || '', 200);
    if (!titleEn) errors.exam_title_en = 'exam_title_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const channels = Array.isArray(body.channels) ? body.channels : ['web_push', 'sms_dlt', 'email'];
    const newId = rid('comm-adm');
    const code = await nextAdmitCode(db);
    await db.prepare(
      `INSERT INTO comm_admit_card_alerts (id, alert_code, commission_key, exam_title_en, exam_title_or, advt_number, exam_date, download_portal_url, channels_json, urgency_level, dispatch_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    ).bind(
      newId, code, comm, titleEn, cleanStr(body.exam_title_or || '', 240),
      cleanStr(body.advt_number || '', 80), cleanStr(body.exam_date || '', 40),
      cleanStr(body.download_portal_url || '', 300), JSON.stringify(channels), urg
    ).run();

    await snapshotCommRevision(db, '03', newId, actor, 'create admit card alert');
    await audit(env, request, actor, 'comm.admit_card.create', 'comm_admit_card_alerts', newId, { alert_code: code });
    const created = await db.prepare(`SELECT * FROM comm_admit_card_alerts WHERE id = ?`).bind(newId).first();
    return json({ item: decorateAdmit(created) }, 201);
  }

  if (sub && extra === 'dispatch' && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_admit_card_alerts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admit card alert not found');
    const body = await readJson(request, 10000).catch(() => ({}));
    const inc = Math.max(1, Number(body.batch_size || 250) || 250);

    await snapshotCommRevision(db, '03', sub, actor, 'dispatch instant admit card alert');
    await db.prepare(
      `UPDATE comm_admit_card_alerts
       SET dispatch_status = 'dispatched_live', dispatched_count = dispatched_count + ?, dispatched_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(inc, sub).run();
    await audit(env, request, actor, 'comm.admit_card.dispatch', 'comm_admit_card_alerts', sub, { dispatched_inc: inc });
    const updated = await db.prepare(`SELECT * FROM comm_admit_card_alerts WHERE id = ?`).bind(sub).first();
    return json({ item: decorateAdmit(updated) });
  }

  if (sub && method === 'DELETE') {
    await snapshotCommRevision(db, '03', sub, actor, 'archive admit card alert');
    await db.prepare(`UPDATE comm_admit_card_alerts SET dispatch_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, dispatch_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 04: DEADLINE COUNTDOWN BROADCASTER ================= */
function decorateDeadline(r) {
  if (!r) return r;
  return { ...r, channels: parseJson(r.channels_json, []) };
}

async function nextDdlCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_deadline_broadcasts`).first();
  return `DDL-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleDeadlines(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM comm_deadline_broadcasts ORDER BY application_deadline_at ASC`).all();
    return json({ items: (results || []).map(decorateDeadline) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const comm = pick(body.commission_key, COMM_COMMISSIONS, 'commission_key', errors, 'osssc');
    const cad = pick(body.reminder_cadence, COMM_CADENCES, 'reminder_cadence', errors, '7d_3d_24h_final');
    const titleEn = cleanStr(body.post_title_en || '', 200);
    const deadlineAt = cleanStr(body.application_deadline_at || '', 40);
    if (!titleEn) errors.post_title_en = 'post_title_en is required';
    if (!deadlineAt) errors.application_deadline_at = 'application_deadline_at is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const channels = Array.isArray(body.channels) ? body.channels : ['web_push', 'sms_dlt', 'email'];
    const newId = rid('comm-ddl');
    const code = await nextDdlCode(db);
    await db.prepare(
      `INSERT INTO comm_deadline_broadcasts (id, broadcast_code, commission_key, post_title_en, post_title_or, vacancy_count, application_deadline_at, fee_last_date, apply_url, reminder_cadence, channels_json, broadcast_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active_countdown')`
    ).bind(
      newId, code, comm, titleEn, cleanStr(body.post_title_or || '', 240),
      Math.max(0, Number(body.vacancy_count || 0) || 0), deadlineAt,
      cleanStr(body.fee_last_date || '', 40), cleanStr(body.apply_url || '', 300),
      cad, JSON.stringify(channels)
    ).run();

    await snapshotCommRevision(db, '04', newId, actor, 'create deadline broadcast');
    await audit(env, request, actor, 'comm.deadline.create', 'comm_deadline_broadcasts', newId, { broadcast_code: code });
    const created = await db.prepare(`SELECT * FROM comm_deadline_broadcasts WHERE id = ?`).bind(newId).first();
    return json({ item: decorateDeadline(created) }, 201);
  }

  if (sub && extra === 'trigger-reminder' && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_deadline_broadcasts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Deadline broadcast not found');
    const body = await readJson(request, 10000).catch(() => ({}));
    const inc = Math.max(1, Number(body.batch_size || 150) || 150);

    await snapshotCommRevision(db, '04', sub, actor, 'trigger deadline countdown blast');
    await db.prepare(
      `UPDATE comm_deadline_broadcasts SET broadcast_status = 'active_countdown', subscribers_notified = subscribers_notified + ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(inc, sub).run();
    await audit(env, request, actor, 'comm.deadline.trigger', 'comm_deadline_broadcasts', sub, { notified_inc: inc });
    const updated = await db.prepare(`SELECT * FROM comm_deadline_broadcasts WHERE id = ?`).bind(sub).first();
    return json({ item: decorateDeadline(updated) });
  }

  if (sub && method === 'DELETE') {
    await snapshotCommRevision(db, '04', sub, actor, 'archive deadline broadcast');
    await db.prepare(`UPDATE comm_deadline_broadcasts SET broadcast_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, broadcast_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleCommRevisions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const modCode = (url.searchParams.get('module_code') || '').trim();
    const entityId = (url.searchParams.get('entity_id') || '').trim();
    const where = [];
    const binds = [];
    if (modCode) { where.push('module_code = ?'); binds.push(modCode); }
    if (entityId) { where.push('entity_id = ?'); binds.push(entityId); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM comm_revisions ${w} ORDER BY version_num DESC LIMIT 50`
    ).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = cleanStr(body.revision_id || '', 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM comm_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = COMM_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', `Rollback unsupported for module ${rev.module_code}`);
    const snap = parseJson(rev.snapshot_json, null);
    if (!snap) throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid revision snapshot');

    await snapshotCommRevision(db, rev.module_code, rev.entity_id, actor, `pre-rollback to v${rev.version_num}`);
    const setCols = cfg.cols.filter(c => c in snap);
    const sets = setCols.map(c => `${c} = ?`).join(', ');
    await db.prepare(`UPDATE ${cfg.table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...setCols.map(c => snap[c]), rev.entity_id).run();
    await audit(env, request, actor, 'comm.revision.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    return json({ ok: true, module_code: rev.module_code, entity_id: rev.entity_id, restored_version: rev.version_num });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCommunicationsBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureCommunicationsBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') return json(await getCommunicationsOverview(env.DB));
  if (id === 'sms-dlt') return handleSmsDlt(request, env, actor, sub, extra);
  if (id === 'emails') return handleEmails(request, env, actor, sub, extra);
  if (id === 'admit-cards') return handleAdmitCards(request, env, actor, sub, extra);
  if (id === 'deadlines') return handleDeadlines(request, env, actor, sub, extra);
  if (id === 'revisions') return handleCommRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown communications route');
}
