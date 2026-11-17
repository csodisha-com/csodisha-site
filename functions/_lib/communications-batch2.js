// Communications, Alerts & Candidate Notifications Batch 2 (v106): Modules 05-08
// 05 Scheme DBT Alerts | 06 WhatsApp WABA Registry | 07 Telegram Broadcasting | 08 Frequency Caps
// Never expose raw Meta WABA access tokens or Telegram Bot tokens in API responses.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  ensureCommunicationsBatch1Schema,
  COMM_REV_TABLES,
  snapshotCommRevision,
  maskSecret
} from './communications-batch1.js';

export const COMM_SCHEME_KEYS = [
  'subhadra_yojana', 'cm_kisan_kalia', 'gopabandhu_sambadika',
  'post_matric_scholarship_odisha', 'biju_swasthya_kalyan', 'mo_ghar_housing'
];
export const COMM_SCHEME_STAGES = [
  'application_window_open', 'ekyc_npci_seeding_reminder', 'sanction_list_released',
  'dbt_installment_credited', 'grievance_window'
];
export const COMM_BENEFICIARY_SEGMENTS = [
  'women_entrepreneurs', 'farmers_sharecroppers', 'sc_st_obc_students', 'all_odisha_citizens'
];
export const COMM_SCHEME_STATUSES = ['draft', 'dispatched_live', 'archived'];
export const COMM_WABA_CATEGORIES = ['UTILITY', 'AUTHENTICATION', 'MARKETING'];
export const COMM_WABA_HEADERS = ['TEXT', 'DOCUMENT', 'NONE'];
export const COMM_WABA_STATUSES = ['approved_meta', 'pending_meta_review', 'rejected', 'paused'];
export const COMM_TG_TRIGGERS = ['manual_broadcast', 'auto_new_job_pdf', 'auto_pyq_upload', 'auto_daily_quiz'];
export const COMM_TG_STATUSES = ['draft', 'scheduled', 'posted_live', 'archived'];
export const COMM_CAP_MODES = ['strict_drop', 'defer_to_morning', 'digest_rollup'];

const _comm2Ready = new WeakSet();

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

function stripSecrets(row) {
  if (!row) return row;
  const out = { ...row };
  delete out.raw_access_token;
  delete out.raw_bot_token;
  delete out.access_token;
  delete out.bot_token;
  delete out.token;
  delete out.secret;
  return out;
}

/** Deterministic Meta WABA template & sequential {{1}}..{{N}} variable validator. */
export function validateWabaTemplate({ waba_template_name = '', meta_category = 'UTILITY', body_text = '', lang_code = 'en' }) {
  const nameOk = /^[a-z0-9_]{3,80}$/.test(String(waba_template_name || '').trim());
  const catOk = COMM_WABA_CATEGORIES.includes(meta_category);
  const body = String(body_text || '');
  const matches = [...body.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
  const uniqueVars = [...new Set(matches)].sort((a, b) => a - b);
  let sequentialOk = true;
  for (let i = 0; i < uniqueVars.length; i++) {
    if (uniqueVars[i] !== i + 1) { sequentialOk = false; break; }
  }
  const bodyOk = body.trim().length > 0 && body.length <= 1024;
  return {
    valid: nameOk && catOk && bodyOk && sequentialOk,
    name_valid: nameOk,
    category_valid: catOk,
    sequential_vars_valid: sequentialOk,
    variable_count: uniqueVars.length,
    lang_code: lang_code === 'or' ? 'or' : 'en',
    char_count: body.length
  };
}

function toMins(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function isInQuietHours(istHourStr, startStr, endStr) {
  const cur = toMins(istHourStr);
  const start = toMins(startStr);
  const end = toMins(endStr);
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  // Overnight wrap (e.g. 21:30 to 07:30)
  return cur >= start || cur < end;
}

/** Deterministic frequency cap & IST quiet-hours throttling simulator. */
export function simulateFrequencyCap(policy, { ist_hour_str = '10:00', daily_sent = 0, weekly_sent = 0, is_urgent_admit_card = false }) {
  if (!policy || !Number(policy.is_active)) {
    return { decision: 'allowed', reason: 'Policy inactive' };
  }
  if (is_urgent_admit_card && Number(policy.bypass_for_urgent_admit_cards) === 1) {
    return { decision: 'allowed', reason: 'Urgent admit card bypass enabled' };
  }
  if (Number(daily_sent) >= Number(policy.max_per_day) || Number(weekly_sent) >= Number(policy.max_per_week)) {
    return { decision: 'capped_daily_limit', reason: `Reached cap (${daily_sent}/${policy.max_per_day} day, ${weekly_sent}/${policy.max_per_week} week)` };
  }
  if (isInQuietHours(ist_hour_str, policy.quiet_hours_start, policy.quiet_hours_end)) {
    return { decision: 'deferred_quiet_hours', reason: `IST ${ist_hour_str} is within quiet hours (${policy.quiet_hours_start}-${policy.quiet_hours_end})` };
  }
  return { decision: 'allowed', reason: 'Within daily/weekly cap and active IST window' };
}

COMM_REV_TABLES['05'] = {
  table: 'comm_scheme_dbt_alerts',
  cols: ['alert_code', 'scheme_key', 'scheme_name_en', 'scheme_name_or', 'alert_stage', 'beneficiary_segment', 'official_portal_url', 'message_en', 'message_or', 'channels_json', 'dispatched_count', 'alert_status', 'dispatched_at']
};
COMM_REV_TABLES['06'] = {
  table: 'comm_whatsapp_waba_templates',
  cols: ['template_code', 'waba_template_name', 'meta_category', 'lang_code', 'header_type', 'header_text', 'body_text', 'footer_text', 'cta_button_label', 'cta_button_url', 'waba_phone_number_id_masked', 'token_masked_hint', 'meta_review_status', 'delivered_count']
};
COMM_REV_TABLES['07'] = {
  table: 'comm_telegram_broadcasts',
  cols: ['post_code', 'channel_handle', 'automation_trigger', 'headline_en', 'headline_or', 'message_body_en', 'message_body_or', 'inline_cta_label', 'inline_cta_url', 'bot_token_masked_hint', 'pin_in_channel', 'silent_notification', 'reach_views_count', 'broadcast_status', 'posted_at']
};
COMM_REV_TABLES['08'] = {
  table: 'comm_frequency_caps',
  cols: ['policy_code', 'channel_key', 'channel_label_en', 'channel_label_or', 'max_per_day', 'max_per_week', 'quiet_hours_start', 'quiet_hours_end', 'bypass_for_urgent_admit_cards', 'default_opt_in_en', 'default_opt_in_or', 'enforcement_mode', 'is_active']
};

export async function ensureCommunicationsBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureCommunicationsBatch1Schema(db);
  if (_comm2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS comm_scheme_dbt_alerts (
      id TEXT PRIMARY KEY,
      alert_code TEXT NOT NULL UNIQUE,
      scheme_key TEXT NOT NULL DEFAULT 'subhadra_yojana' CHECK (scheme_key IN ('subhadra_yojana', 'cm_kisan_kalia', 'gopabandhu_sambadika', 'post_matric_scholarship_odisha', 'biju_swasthya_kalyan', 'mo_ghar_housing')),
      scheme_name_en TEXT NOT NULL,
      scheme_name_or TEXT NOT NULL DEFAULT '',
      alert_stage TEXT NOT NULL DEFAULT 'dbt_installment_credited' CHECK (alert_stage IN ('application_window_open', 'ekyc_npci_seeding_reminder', 'sanction_list_released', 'dbt_installment_credited', 'grievance_window')),
      beneficiary_segment TEXT NOT NULL DEFAULT 'all_odisha_citizens' CHECK (beneficiary_segment IN ('women_entrepreneurs', 'farmers_sharecroppers', 'sc_st_obc_students', 'all_odisha_citizens')),
      official_portal_url TEXT NOT NULL DEFAULT '',
      message_en TEXT NOT NULL,
      message_or TEXT NOT NULL DEFAULT '',
      channels_json TEXT NOT NULL DEFAULT '["web_push","whatsapp_waba","sms_dlt"]',
      dispatched_count INTEGER NOT NULL DEFAULT 0,
      alert_status TEXT NOT NULL DEFAULT 'draft' CHECK (alert_status IN ('draft', 'dispatched_live', 'archived')),
      dispatched_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_scheme_dbt_status ON comm_scheme_dbt_alerts(scheme_key, alert_status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS comm_whatsapp_waba_templates (
      id TEXT PRIMARY KEY,
      template_code TEXT NOT NULL UNIQUE,
      waba_template_name TEXT NOT NULL UNIQUE,
      meta_category TEXT NOT NULL DEFAULT 'UTILITY' CHECK (meta_category IN ('UTILITY', 'AUTHENTICATION', 'MARKETING')),
      lang_code TEXT NOT NULL DEFAULT 'en' CHECK (lang_code IN ('en', 'or')),
      header_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (header_type IN ('TEXT', 'DOCUMENT', 'NONE')),
      header_text TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL,
      footer_text TEXT NOT NULL DEFAULT '',
      cta_button_label TEXT NOT NULL DEFAULT '',
      cta_button_url TEXT NOT NULL DEFAULT '',
      waba_phone_number_id_masked TEXT NOT NULL DEFAULT '',
      token_masked_hint TEXT NOT NULL DEFAULT '',
      meta_review_status TEXT NOT NULL DEFAULT 'pending_meta_review' CHECK (meta_review_status IN ('approved_meta', 'pending_meta_review', 'rejected', 'paused')),
      delivered_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_waba_status ON comm_whatsapp_waba_templates(meta_review_status, meta_category)`,
    `CREATE TABLE IF NOT EXISTS comm_telegram_broadcasts (
      id TEXT PRIMARY KEY,
      post_code TEXT NOT NULL UNIQUE,
      channel_handle TEXT NOT NULL DEFAULT '@csodisha_official',
      automation_trigger TEXT NOT NULL DEFAULT 'manual_broadcast' CHECK (automation_trigger IN ('manual_broadcast', 'auto_new_job_pdf', 'auto_pyq_upload', 'auto_daily_quiz')),
      headline_en TEXT NOT NULL,
      headline_or TEXT NOT NULL DEFAULT '',
      message_body_en TEXT NOT NULL DEFAULT '',
      message_body_or TEXT NOT NULL DEFAULT '',
      inline_cta_label TEXT NOT NULL DEFAULT '',
      inline_cta_url TEXT NOT NULL DEFAULT '',
      bot_token_masked_hint TEXT NOT NULL DEFAULT '',
      pin_in_channel INTEGER NOT NULL DEFAULT 0,
      silent_notification INTEGER NOT NULL DEFAULT 0,
      reach_views_count INTEGER NOT NULL DEFAULT 0,
      broadcast_status TEXT NOT NULL DEFAULT 'draft' CHECK (broadcast_status IN ('draft', 'scheduled', 'posted_live', 'archived')),
      posted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_tg_status ON comm_telegram_broadcasts(broadcast_status, channel_handle, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS comm_frequency_caps (
      id TEXT PRIMARY KEY,
      policy_code TEXT NOT NULL UNIQUE,
      channel_key TEXT NOT NULL UNIQUE CHECK (channel_key IN ('sms_dlt', 'email', 'whatsapp_waba', 'telegram', 'web_push')),
      channel_label_en TEXT NOT NULL,
      channel_label_or TEXT NOT NULL DEFAULT '',
      max_per_day INTEGER NOT NULL DEFAULT 2,
      max_per_week INTEGER NOT NULL DEFAULT 6,
      quiet_hours_start TEXT NOT NULL DEFAULT '21:30',
      quiet_hours_end TEXT NOT NULL DEFAULT '07:30',
      bypass_for_urgent_admit_cards INTEGER NOT NULL DEFAULT 1,
      default_opt_in_en INTEGER NOT NULL DEFAULT 1,
      default_opt_in_or INTEGER NOT NULL DEFAULT 1,
      enforcement_mode TEXT NOT NULL DEFAULT 'defer_to_morning' CHECK (enforcement_mode IN ('strict_drop', 'defer_to_morning', 'digest_rollup')),
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comm_caps_channel ON comm_frequency_caps(channel_key, is_active)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 05 scheme DBT alerts
  const schCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_scheme_dbt_alerts`).first();
  if (Number(schCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO comm_scheme_dbt_alerts (id, alert_code, scheme_key, scheme_name_en, scheme_name_or, alert_stage, beneficiary_segment, official_portal_url, message_en, message_or, channels_json, dispatched_count, alert_status, dispatched_at)
       VALUES ('comm-sch-01', 'SCH-ALT-2026-0001', 'subhadra_yojana', 'Subhadra Yojana Odisha', 'ସୁଭଦ୍ରା ଯୋଜନା ଓଡ଼ିଶା', 'ekyc_npci_seeding_reminder', 'women_entrepreneurs', 'https://subhadra.odisha.gov.in',
               'Subhadra Yojana DBT Reminder: Complete NPCI Aadhaar seeding & biometric e-KYC to receive your ₹5,000 installment.',
               'ସୁଭଦ୍ରା ଯୋଜନା DBT ସୂଚନା: ₹୫,୦୦୦ କିସ୍ତି ପାଇବା ପାଇଁ NPCI ଆଧାର ସିଡିଂ ଏବଂ e-KYC ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ।',
               '["web_push","whatsapp_waba","sms_dlt"]', 3120, 'dispatched_live', datetime('now'))`
    ).run();
    await db.prepare(
      `INSERT INTO comm_scheme_dbt_alerts (id, alert_code, scheme_key, scheme_name_en, scheme_name_or, alert_stage, beneficiary_segment, official_portal_url, message_en, message_or, channels_json, dispatched_count, alert_status)
       VALUES ('comm-sch-02', 'SCH-ALT-2026-0002', 'post_matric_scholarship_odisha', 'Odisha State Post-Matric Scholarship', 'ଓଡ଼ିଶା ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି', 'sanction_list_released', 'sc_st_obc_students', 'https://scholarship.odisha.gov.in',
               'Post-Matric Scholarship sanction list released for SC/ST/OBC students. Check institute verification status.',
               'SC/ST/OBC ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି ତାଲିକା ପ୍ରକାଶିତ।',
               '["web_push","email"]', 0, 'draft')`
    ).run();
  }

  // Seed Module 06 WhatsApp WABA templates
  const waCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_whatsapp_waba_templates`).first();
  if (Number(waCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO comm_whatsapp_waba_templates (id, template_code, waba_template_name, meta_category, lang_code, header_type, header_text, body_text, footer_text, cta_button_label, cta_button_url, waba_phone_number_id_masked, token_masked_hint, meta_review_status, delivered_count)
       VALUES ('comm-wa-01', 'WABA-CSO-001', 'cso_exam_admit_card_alert', 'UTILITY', 'en', 'TEXT', 'CS Odisha Exam Alert',
               'Hello {{1}}, the Admit Card for {{2}} has been released. Exam Date: {{3}}.',
               'Common Sense Odisha · Tap below to download', 'Download Hall Ticket', 'https://csodisha.com/jobs-careers/',
               '1049••••••8821', 'EAAG••••••9f4a', 'approved_meta', 1950)`
    ).run();
    await db.prepare(
      `INSERT INTO comm_whatsapp_waba_templates (id, template_code, waba_template_name, meta_category, lang_code, header_type, header_text, body_text, footer_text, cta_button_label, cta_button_url, waba_phone_number_id_masked, token_masked_hint, meta_review_status, delivered_count)
       VALUES ('comm-wa-02', 'WABA-CSO-002', 'cso_odisha_scholarship_dbt_or', 'UTILITY', 'or', 'TEXT', 'ଓଡ଼ିଶା ଛାତ୍ରବୃତ୍ତି ସୂଚନା',
               'ନମସ୍କାର {{1}}, {{2}} ଯୋଜନାର DBT ସ୍ଥିତି ଅପଡେଟ୍ ହୋଇଛି।',
               'CS Odisha', 'ସ୍ଥିତି ଦେଖନ୍ତୁ', 'https://csodisha.com/schemes/',
               '1049••••••8821', 'EAAG••••••9f4a', 'approved_meta', 1120)`
    ).run();
  }

  // Seed Module 07 Telegram broadcasts
  const tgCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_telegram_broadcasts`).first();
  if (Number(tgCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO comm_telegram_broadcasts (id, post_code, channel_handle, automation_trigger, headline_en, headline_or, message_body_en, message_body_or, inline_cta_label, inline_cta_url, bot_token_masked_hint, pin_in_channel, silent_notification, reach_views_count, broadcast_status, posted_at)
       VALUES ('comm-tg-01', 'TG-2026-0001', '@csodisha_official', 'auto_pyq_upload',
               'OPSC OAS Prelims 2018-2024 Solved PYQ Pack Uploaded!',
               'OPSC OAS ପ୍ରିଲିମ୍ସ ୨୦୧୮-୨୦୨୪ ସମାଧାନ PYQ ପ୍ୟାକ୍ ଅପଲୋଡ୍ ହୋଇଛି!',
               'Download free bilingual PDF with Odisha History & Polity solutions.',
               'ଓଡ଼ିଶା ଇତିହାସ ଏବଂ ରାଜନୀତି ସମାଧାନ ସହିତ ମାଗଣା PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ।',
               'Download PDF', 'https://csodisha.com/study-library/', '7412••••••Xk9P', 1, 0, 4280, 'posted_live', datetime('now'))`
    ).run();
  }

  // Seed Module 08 Frequency caps (5 channels)
  const capCnt = await db.prepare(`SELECT COUNT(*) AS n FROM comm_frequency_caps`).first();
  if (Number(capCnt?.n || 0) === 0) {
    const caps = [
      ['comm-cap-01', 'CAP-001', 'sms_dlt', 'SMS (TRAI DLT)', 'SMS (TRAI DLT)', 2, 6, '21:30', '07:30', 1, 1, 1, 'defer_to_morning', 1],
      ['comm-cap-02', 'CAP-002', 'email', 'Email Campaigns', 'ଇମେଲ୍ ଅଭିଯାନ', 2, 5, '21:30', '07:30', 1, 1, 1, 'digest_rollup', 1],
      ['comm-cap-03', 'CAP-003', 'whatsapp_waba', 'WhatsApp (Meta WABA)', 'ହ୍ୱାଟସ୍ଆପ୍ (Meta WABA)', 2, 5, '21:30', '07:30', 1, 1, 1, 'defer_to_morning', 1],
      ['comm-cap-04', 'CAP-004', 'telegram', 'Telegram Channel', 'ଟେଲିଗ୍ରାମ୍ ଚ୍ୟାନେଲ୍', 5, 25, '22:00', '06:30', 1, 1, 1, 'strict_drop', 1],
      ['comm-cap-05', 'CAP-005', 'web_push', 'Web Push Alerts', 'ୱେବ୍ ପୁସ୍ ଆଲର୍ଟ', 3, 12, '21:30', '07:30', 1, 1, 1, 'defer_to_morning', 1]
    ];
    for (const c of caps) {
      await db.prepare(
        `INSERT INTO comm_frequency_caps (id, policy_code, channel_key, channel_label_en, channel_label_or, max_per_day, max_per_week, quiet_hours_start, quiet_hours_end, bypass_for_urgent_admit_cards, default_opt_in_en, default_opt_in_or, enforcement_mode, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...c).run();
    }
  }

  _comm2Ready.add(db);
}

/* ================= MODULE 05: SCHEME DBT ALERTS ================= */
function decorateScheme(r) {
  if (!r) return r;
  return { ...r, channels: parseJson(r.channels_json, []) };
}

async function nextSchCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_scheme_dbt_alerts`).first();
  return `SCH-ALT-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleSchemeAlerts(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const scheme = (url.searchParams.get('scheme_key') || '').trim();
    const status = (url.searchParams.get('alert_status') || '').trim();
    const where = [];
    const binds = [];
    if (scheme) { where.push('scheme_key = ?'); binds.push(scheme); }
    if (status) { where.push('alert_status = ?'); binds.push(status); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_scheme_dbt_alerts ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decorateScheme) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const schemeKey = pick(body.scheme_key, COMM_SCHEME_KEYS, 'scheme_key', errors, 'subhadra_yojana');
    const stage = pick(body.alert_stage, COMM_SCHEME_STAGES, 'alert_stage', errors, 'dbt_installment_credited');
    const seg = pick(body.beneficiary_segment, COMM_BENEFICIARY_SEGMENTS, 'beneficiary_segment', errors, 'all_odisha_citizens');
    const nameEn = cleanStr(body.scheme_name_en || '', 160);
    const msgEn = cleanStr(body.message_en || '', 1000);
    if (!nameEn) errors.scheme_name_en = 'scheme_name_en is required';
    if (!msgEn) errors.message_en = 'message_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('comm-sch');
    const code = await nextSchCode(db);
    const channels = Array.isArray(body.channels) ? body.channels : ['web_push', 'whatsapp_waba', 'sms_dlt'];
    await db.prepare(
      `INSERT INTO comm_scheme_dbt_alerts (id, alert_code, scheme_key, scheme_name_en, scheme_name_or, alert_stage, beneficiary_segment, official_portal_url, message_en, message_or, channels_json, alert_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    ).bind(
      newId, code, schemeKey, nameEn, cleanStr(body.scheme_name_or || '', 180),
      stage, seg, cleanStr(body.official_portal_url || '', 300),
      msgEn, cleanStr(body.message_or || '', 1000), JSON.stringify(channels)
    ).run();

    await snapshotCommRevision(db, '05', newId, actor, 'create scheme DBT alert');
    await audit(env, request, actor, 'comm.scheme_alert.create', 'comm_scheme_dbt_alerts', newId, { alert_code: code });
    const created = await db.prepare(`SELECT * FROM comm_scheme_dbt_alerts WHERE id = ?`).bind(newId).first();
    return json({ item: decorateScheme(created) }, 201);
  }

  if (sub && extra === 'dispatch' && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_scheme_dbt_alerts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme alert not found');
    const body = await readJson(request, 10000).catch(() => ({}));
    const inc = Math.max(1, Number(body.batch_size || 500) || 500);

    await snapshotCommRevision(db, '05', sub, actor, 'dispatch scheme DBT alert');
    await db.prepare(
      `UPDATE comm_scheme_dbt_alerts SET alert_status = 'dispatched_live', dispatched_count = dispatched_count + ?, dispatched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(inc, sub).run();
    await audit(env, request, actor, 'comm.scheme_alert.dispatch', 'comm_scheme_dbt_alerts', sub, { dispatched_inc: inc });
    const updated = await db.prepare(`SELECT * FROM comm_scheme_dbt_alerts WHERE id = ?`).bind(sub).first();
    return json({ item: decorateScheme(updated) });
  }

  if (sub && method === 'DELETE') {
    await snapshotCommRevision(db, '05', sub, actor, 'archive scheme alert');
    await db.prepare(`UPDATE comm_scheme_dbt_alerts SET alert_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, alert_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 06: WHATSAPP WABA REGISTRY ================= */
async function nextWabaCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_whatsapp_waba_templates`).first();
  return `WABA-CSO-${String(Number(r?.n || 0) + 1).padStart(3, '0')}`;
}

async function handleWhatsapp(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const cat = (url.searchParams.get('meta_category') || '').trim();
    const status = (url.searchParams.get('meta_review_status') || '').trim();
    const where = [];
    const binds = [];
    if (cat) { where.push('meta_category = ?'); binds.push(cat); }
    if (status) { where.push('meta_review_status = ?'); binds.push(status); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM comm_whatsapp_waba_templates ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(stripSecrets) });
  }

  if (sub === 'validate' && method === 'POST') {
    const body = await readJson(request, 10000);
    return json(validateWabaTemplate(body));
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const name = cleanStr(body.waba_template_name || '', 80).toLowerCase();
    const cat = pick(body.meta_category, COMM_WABA_CATEGORIES, 'meta_category', errors, 'UTILITY');
    const hdrType = pick(body.header_type, COMM_WABA_HEADERS, 'header_type', errors, 'TEXT');
    const bodyTxt = cleanStr(body.body_text || '', 1024);
    const lang = body.lang_code === 'or' ? 'or' : 'en';
    const status = pick(body.meta_review_status, COMM_WABA_STATUSES, 'meta_review_status', errors, 'pending_meta_review');

    const check = validateWabaTemplate({ waba_template_name: name, meta_category: cat, body_text: bodyTxt, lang_code: lang });
    if (!check.name_valid) errors.waba_template_name = 'waba_template_name must be lowercase snake_case (3-80 chars)';
    if (!check.sequential_vars_valid) errors.body_text = 'Variables must be sequential {{1}}, {{2}}, ...';
    if (!bodyTxt) errors.body_text = 'body_text is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('comm-wa');
    const code = await nextWabaCode(db);
    const tokenHint = body.raw_access_token ? maskSecret(body.raw_access_token) : cleanStr(body.token_masked_hint || '', 40);
    const phoneMask = body.raw_phone_number_id ? maskSecret(body.raw_phone_number_id) : cleanStr(body.waba_phone_number_id_masked || '', 40);

    await db.prepare(
      `INSERT INTO comm_whatsapp_waba_templates (id, template_code, waba_template_name, meta_category, lang_code, header_type, header_text, body_text, footer_text, cta_button_label, cta_button_url, waba_phone_number_id_masked, token_masked_hint, meta_review_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, name, cat, lang, hdrType, cleanStr(body.header_text || '', 100),
      bodyTxt, cleanStr(body.footer_text || '', 100), cleanStr(body.cta_button_label || '', 60),
      cleanStr(body.cta_button_url || '', 300), phoneMask, tokenHint, status
    ).run();

    await snapshotCommRevision(db, '06', newId, actor, 'create WABA template');
    await audit(env, request, actor, 'comm.whatsapp.create', 'comm_whatsapp_waba_templates', newId, { waba_template_name: name });
    const created = await db.prepare(`SELECT * FROM comm_whatsapp_waba_templates WHERE id = ?`).bind(newId).first();
    return json({ item: stripSecrets(created), validation: check }, 201);
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_whatsapp_waba_templates WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'WABA template not found');
    const body = await readJson(request, 10000);
    const errors = {};
    const status = pick(body.meta_review_status, COMM_WABA_STATUSES, 'meta_review_status', errors, existing.meta_review_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotCommRevision(db, '06', sub, actor, `status -> ${status}`);
    await db.prepare(`UPDATE comm_whatsapp_waba_templates SET meta_review_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, sub).run();
    const updated = await db.prepare(`SELECT * FROM comm_whatsapp_waba_templates WHERE id = ?`).bind(sub).first();
    return json({ item: stripSecrets(updated) });
  }

  if (sub && method === 'DELETE') {
    await snapshotCommRevision(db, '06', sub, actor, 'pause WABA template');
    await db.prepare(`UPDATE comm_whatsapp_waba_templates SET meta_review_status = 'paused', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, meta_review_status: 'paused' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 07: TELEGRAM BROADCASTING ================= */
function decorateTg(r) {
  if (!r) return r;
  return {
    ...stripSecrets(r),
    pin_in_channel: Number(r.pin_in_channel || 0) === 1,
    silent_notification: Number(r.silent_notification || 0) === 1
  };
}

async function nextTgCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM comm_telegram_broadcasts`).first();
  return `TG-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleTelegram(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM comm_telegram_broadcasts ORDER BY created_at DESC`).all();
    return json({ items: (results || []).map(decorateTg) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 25000);
    const errors = {};
    const trig = pick(body.automation_trigger, COMM_TG_TRIGGERS, 'automation_trigger', errors, 'manual_broadcast');
    const headEn = cleanStr(body.headline_en || '', 200);
    if (!headEn) errors.headline_en = 'headline_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('comm-tg');
    const code = await nextTgCode(db);
    const botHint = body.raw_bot_token ? maskSecret(body.raw_bot_token) : cleanStr(body.bot_token_masked_hint || '', 40);

    await db.prepare(
      `INSERT INTO comm_telegram_broadcasts (id, post_code, channel_handle, automation_trigger, headline_en, headline_or, message_body_en, message_body_or, inline_cta_label, inline_cta_url, bot_token_masked_hint, pin_in_channel, silent_notification, broadcast_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    ).bind(
      newId, code, cleanStr(body.channel_handle || '@csodisha_official', 80), trig,
      headEn, cleanStr(body.headline_or || '', 220),
      cleanStr(body.message_body_en || '', 2000), cleanStr(body.message_body_or || '', 2000),
      cleanStr(body.inline_cta_label || '', 60), cleanStr(body.inline_cta_url || '', 300),
      botHint, body.pin_in_channel ? 1 : 0, body.silent_notification ? 1 : 0
    ).run();

    await snapshotCommRevision(db, '07', newId, actor, 'create Telegram broadcast');
    await audit(env, request, actor, 'comm.telegram.create', 'comm_telegram_broadcasts', newId, { post_code: code });
    const created = await db.prepare(`SELECT * FROM comm_telegram_broadcasts WHERE id = ?`).bind(newId).first();
    return json({ item: decorateTg(created) }, 201);
  }

  if (sub && extra === 'publish' && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM comm_telegram_broadcasts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Telegram broadcast not found');
    const body = await readJson(request, 10000).catch(() => ({}));
    const reachInc = Math.max(100, Number(body.reach_inc || 850) || 850);

    await snapshotCommRevision(db, '07', sub, actor, 'post live to Telegram');
    await db.prepare(
      `UPDATE comm_telegram_broadcasts SET broadcast_status = 'posted_live', reach_views_count = reach_views_count + ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(reachInc, sub).run();
    await audit(env, request, actor, 'comm.telegram.publish', 'comm_telegram_broadcasts', sub, { reach_inc: reachInc });
    const updated = await db.prepare(`SELECT * FROM comm_telegram_broadcasts WHERE id = ?`).bind(sub).first();
    return json({ item: decorateTg(updated) });
  }

  if (sub && method === 'DELETE') {
    await snapshotCommRevision(db, '07', sub, actor, 'archive Telegram broadcast');
    await db.prepare(`UPDATE comm_telegram_broadcasts SET broadcast_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    return json({ ok: true, id: sub, broadcast_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 08: FREQUENCY CAPS ================= */
function decorateCap(r) {
  if (!r) return r;
  return {
    ...r,
    bypass_for_urgent_admit_cards: Number(r.bypass_for_urgent_admit_cards || 0) === 1,
    default_opt_in_en: Number(r.default_opt_in_en || 0) === 1,
    default_opt_in_or: Number(r.default_opt_in_or || 0) === 1,
    is_active: Number(r.is_active || 0) === 1
  };
}

async function handleFrequencyCaps(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM comm_frequency_caps ORDER BY policy_code ASC`).all();
    return json({ items: (results || []).map(decorateCap) });
  }

  if (sub === 'simulate-check' && method === 'POST') {
    const body = await readJson(request, 10000);
    const chKey = cleanStr(body.channel_key || 'sms_dlt', 40);
    const policy = await db.prepare(`SELECT * FROM comm_frequency_caps WHERE channel_key = ?`).bind(chKey).first();
    if (!policy) throw new HttpError(404, 'NOT_FOUND', `Policy for channel ${chKey} not found`);
    const sim = simulateFrequencyCap(policy, body);
    return json({ channel_key: chKey, ...sim });
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM comm_frequency_caps WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Frequency cap policy not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const maxDay = body.max_per_day !== undefined ? Math.max(1, Number(body.max_per_day)) : existing.max_per_day;
    const maxWeek = body.max_per_week !== undefined ? Math.max(1, Number(body.max_per_week)) : existing.max_per_week;
    const qStart = body.quiet_hours_start !== undefined ? cleanStr(body.quiet_hours_start, 10) : existing.quiet_hours_start;
    const qEnd = body.quiet_hours_end !== undefined ? cleanStr(body.quiet_hours_end, 10) : existing.quiet_hours_end;
    const bypass = body.bypass_for_urgent_admit_cards !== undefined ? (body.bypass_for_urgent_admit_cards ? 1 : 0) : existing.bypass_for_urgent_admit_cards;
    const mode = body.enforcement_mode !== undefined ? pick(body.enforcement_mode, COMM_CAP_MODES, 'enforcement_mode', errors, existing.enforcement_mode) : existing.enforcement_mode;
    const isAct = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotCommRevision(db, '08', sub, actor, 'update frequency cap policy');
    await db.prepare(
      `UPDATE comm_frequency_caps
       SET max_per_day = ?, max_per_week = ?, quiet_hours_start = ?, quiet_hours_end = ?, bypass_for_urgent_admit_cards = ?, enforcement_mode = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(maxDay, maxWeek, qStart, qEnd, bypass, mode, isAct, sub).run();
    await audit(env, request, actor, 'comm.frequency_cap.update', 'comm_frequency_caps', sub, { max_per_day: maxDay, enforcement_mode: mode });
    const updated = await db.prepare(`SELECT * FROM comm_frequency_caps WHERE id = ?`).bind(sub).first();
    return json({ item: decorateCap(updated) });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCommunicationsBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureCommunicationsBatch2Schema(env.DB);
  if (id === 'scheme-alerts') return handleSchemeAlerts(request, env, actor, sub, extra);
  if (id === 'whatsapp') return handleWhatsapp(request, env, actor, sub, extra);
  if (id === 'telegram') return handleTelegram(request, env, actor, sub, extra);
  if (id === 'frequency-caps') return handleFrequencyCaps(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown communications batch 2 route');
}
