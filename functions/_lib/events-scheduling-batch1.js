// Events & Scheduling Batch 1 (v115): Modules 01-03
// 01 State Competitive Exam Calendar | 02 Entrance & Admission Milestones | 03 Recruitment Application Deadlines & Countdown Engine
// All event dates & deadlines normalized to IST (Asia/Kolkata, +05:30).
// Sanitize all text inputs so raw <script> tags or HTML markup can never be stored or emitted.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';

export const EVT_COMMISSION_BODIES = ['OPSC', 'OSSC', 'OSSSC', 'NTA_UGC_NET', 'OTET_OSSTET', 'RRC_BBS', 'OTHER'];
export const EVT_EXAM_STAGES = ['prelims', 'mains', 'written_cbt', 'skill_physical', 'viva_voce'];
export const EVT_DISTRICT_SCOPES = ['all_30_districts', 'major_centers', 'bhubaneswar_cuttack'];
export const EVT_SCHEDULE_STATUSES = ['confirmed', 'tentative', 'postponed', 'completed', 'archived'];

export const EVT_PORTAL_AUTHORITIES = ['SAMS_ODISHA', 'OJEE', 'OSHEC_CPET', 'TE_SCERT_BED', 'CHSE_ODISHA', 'BSE_ODISHA'];
export const EVT_PROGRAM_STREAMS = ['plus_two_plus_three', 'bed_med_teacher_ed', 'cpet_pg_entrance', 'ojee_technical', 'iti_diploma'];
export const EVT_MILESTONE_PHASES = ['caf_application', 'entrance_test', 'merit_list_round_1', 'slide_freeze_float', 'spot_admission'];
export const EVT_ADMISSION_STATUSES = ['active_live', 'upcoming', 'closed', 'archived'];

export const EVT_URGENCY_BADGES = ['open_normal', 'closing_72h', 'final_24h', 'extended', 'closed'];
export const EVT_DEADLINE_STATUSES = ['active_live', 'scheduled', 'expired', 'archived'];

const _evt1Ready = new WeakSet();

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

export function sanitizeEvtText(raw, maxLen = 320) {
  const stripped = String(raw || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '');
  return cleanStr(stripped, maxLen);
}

function sanitizeOptionalUrl(raw) {
  const s = sanitizeEvtText(raw, 400);
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return '';
}

function formatIstDateParts(ms) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date(ms));
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const hour = map.hour === '24' ? '00' : map.hour;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${hour}:${map.minute}:${map.second}`
  };
}

export function nowIstIso() {
  const { date, time } = formatIstDateParts(Date.now());
  return `${date}T${time}+05:30`;
}

export function normalizeIstDate(raw) {
  const s = sanitizeEvtText(raw, 64);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    return s.slice(0, 10);
  }
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return '';
  return formatIstDateParts(ms).date;
}

export function normalizeIstTimestamp(raw, defaultTime = '23:59:00') {
  const s = sanitizeEvtText(raw, 64);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s}T${defaultTime}+05:30`;
  }
  const localMatch = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/);
  if (localMatch) {
    const sec = localMatch[3] || '00';
    return `${localMatch[1]}T${localMatch[2]}:${sec}+05:30`;
  }
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return '';
  const { date, time } = formatIstDateParts(ms);
  return `${date}T${time}+05:30`;
}

export function computeDeadlineUrgency(closesIst, explicitUrgency = 'open_normal', nowMs = Date.now()) {
  const normalized = normalizeIstTimestamp(closesIst);
  if (!normalized) {
    return {
      remaining_hours: 0,
      urgency_badge: explicitUrgency === 'extended' ? 'extended' : 'closed',
      is_expired: true
    };
  }
  const closeMs = Date.parse(normalized);
  if (Number.isNaN(closeMs)) {
    return { remaining_hours: 0, urgency_badge: 'closed', is_expired: true };
  }
  const diffHours = (closeMs - nowMs) / 3600000;
  const remaining_hours = Math.round(diffHours * 10) / 10;

  if (explicitUrgency === 'closed' || diffHours <= 0) {
    return {
      remaining_hours: Math.max(0, remaining_hours),
      urgency_badge: 'closed',
      is_expired: true
    };
  }
  if (diffHours <= 24) {
    return { remaining_hours, urgency_badge: 'final_24h', is_expired: false };
  }
  if (diffHours <= 72) {
    return { remaining_hours, urgency_badge: 'closing_72h', is_expired: false };
  }
  if (explicitUrgency === 'extended') {
    return { remaining_hours, urgency_badge: 'extended', is_expired: false };
  }
  return { remaining_hours, urgency_badge: 'open_normal', is_expired: false };
}

export const EVT_REV_TABLES = {
  '01': {
    table: 'evt_exam_calendar',
    cols: [
      'event_code', 'commission_body', 'exam_name_en', 'exam_name_or', 'advt_number',
      'exam_stage', 'exam_date_start', 'exam_date_end', 'shift_timing_ist',
      'official_notice_url', 'district_scope', 'schedule_status', 'is_featured'
    ]
  },
  '02': {
    table: 'evt_admission_milestones',
    cols: [
      'milestone_code', 'portal_authority', 'program_stream', 'title_en', 'title_or',
      'milestone_phase', 'starts_at_ist', 'ends_at_ist', 'official_portal_url',
      'eligibility_note_en', 'eligibility_note_or', 'status'
    ]
  },
  '03': {
    table: 'evt_deadline_countdowns',
    cols: [
      'deadline_code', 'commission_body', 'post_title_en', 'post_title_or', 'advt_number',
      'total_vacancies', 'registration_opens_ist', 'registration_closes_ist',
      'fee_payment_closes_ist', 'correction_window_note', 'apply_portal_url',
      'urgency_badge', 'is_pinned_ticker', 'status'
    ]
  }
};

export async function snapshotEvtRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = EVT_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM evt_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('evt-rev');
  await db.prepare(
    `INSERT INTO evt_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    revId,
    moduleCode,
    entityId,
    nextVer,
    JSON.stringify(row),
    sanitizeEvtText(changeNote, 200),
    actor?.email || actor?.userId || 'system'
  ).run();
  return { id: revId, version_num: nextVer };
}

export async function ensureEventsSchedulingBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_evt1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS evt_exam_calendar (
      id TEXT PRIMARY KEY,
      event_code TEXT NOT NULL UNIQUE,
      commission_body TEXT NOT NULL DEFAULT 'OPSC',
      exam_name_en TEXT NOT NULL,
      exam_name_or TEXT NOT NULL DEFAULT '',
      advt_number TEXT NOT NULL DEFAULT '',
      exam_stage TEXT NOT NULL DEFAULT 'prelims',
      exam_date_start TEXT NOT NULL,
      exam_date_end TEXT NOT NULL,
      shift_timing_ist TEXT NOT NULL DEFAULT '10:00 AM – 12:00 PM IST',
      official_notice_url TEXT NOT NULL DEFAULT '',
      district_scope TEXT NOT NULL DEFAULT 'all_30_districts',
      schedule_status TEXT NOT NULL DEFAULT 'confirmed',
      is_featured INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_exam_body_status ON evt_exam_calendar(commission_body, schedule_status, exam_date_start)`,

    `CREATE TABLE IF NOT EXISTS evt_admission_milestones (
      id TEXT PRIMARY KEY,
      milestone_code TEXT NOT NULL UNIQUE,
      portal_authority TEXT NOT NULL DEFAULT 'SAMS_ODISHA',
      program_stream TEXT NOT NULL DEFAULT 'plus_two_plus_three',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      milestone_phase TEXT NOT NULL DEFAULT 'caf_application',
      starts_at_ist TEXT NOT NULL,
      ends_at_ist TEXT NOT NULL,
      official_portal_url TEXT NOT NULL DEFAULT '',
      eligibility_note_en TEXT NOT NULL DEFAULT '',
      eligibility_note_or TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active_live',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_adm_auth_status ON evt_admission_milestones(portal_authority, status, starts_at_ist)`,

    `CREATE TABLE IF NOT EXISTS evt_deadline_countdowns (
      id TEXT PRIMARY KEY,
      deadline_code TEXT NOT NULL UNIQUE,
      commission_body TEXT NOT NULL DEFAULT 'OPSC',
      post_title_en TEXT NOT NULL,
      post_title_or TEXT NOT NULL DEFAULT '',
      advt_number TEXT NOT NULL DEFAULT '',
      total_vacancies INTEGER NOT NULL DEFAULT 0,
      registration_opens_ist TEXT NOT NULL,
      registration_closes_ist TEXT NOT NULL,
      fee_payment_closes_ist TEXT NOT NULL DEFAULT '',
      correction_window_note TEXT NOT NULL DEFAULT '',
      apply_portal_url TEXT NOT NULL DEFAULT '',
      urgency_badge TEXT NOT NULL DEFAULT 'open_normal',
      is_pinned_ticker INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active_live',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_ddl_status_close ON evt_deadline_countdowns(status, urgency_badge, registration_closes_ist)`,

    `CREATE TABLE IF NOT EXISTS evt_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_rev_entity ON evt_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  await seedEventsSchedulingBatch1(db);
  _evt1Ready.add(db);
}

async function seedEventsSchedulingBatch1(db) {
  const exCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_exam_calendar`).first();
  if (Number(exCnt?.n || 0) === 0) {
    const exams = [
      [
        'evt-exm-001', 'EXM-2026-0001', 'OPSC',
        'OPSC Odisha Civil Services (OAS) Preliminary Exam 2026',
        'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS) ପ୍ରାରମ୍ଭିକ ପରୀକ୍ଷା ୨୦୨୬',
        'Advt. No. 08 of 2025-26', 'prelims', '2026-12-13', '2026-12-13',
        '10:00 AM – 12:00 PM & 01:30 PM – 03:30 PM IST',
        'https://www.opsc.gov.in', 'major_centers', 'confirmed', 1
      ],
      [
        'evt-exm-002', 'EXM-2026-0002', 'OPSC',
        'OPSC Odisha Civil Services (OAS) Mains Written Exam',
        'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS) ମୁଖ୍ୟ ପରୀକ୍ଷା',
        'Advt. No. 08 of 2025-26', 'mains', '2027-03-14', '2027-03-22',
        '09:00 AM – 12:00 PM & 02:00 PM – 05:00 PM IST',
        'https://www.opsc.gov.in', 'bhubaneswar_cuttack', 'tentative', 1
      ],
      [
        'evt-exm-003', 'EXM-2026-0003', 'OSSC',
        'OSSC Combined Graduate Level (CGLRE) Stage-I Written CBT',
        'OSSC ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGL) ପରୀକ୍ଷା',
        'Advt. No. 4120/OSSC', 'written_cbt', '2026-12-20', '2026-12-21',
        '09:30 AM – 12:00 PM IST',
        'https://www.ossc.gov.in', 'all_30_districts', 'confirmed', 1
      ],
      [
        'evt-exm-004', 'EXM-2026-0004', 'OSSSC',
        'OSSSC RI, ARI, Amin, SFS & ICDS Supervisor Written Test',
        'OSSSC RI, ARI, ଅମିନ ଏବଂ ICDS ସୁପରଭାଇଜର ପରୀକ୍ଷା',
        'Advt. No. IIE-112/2025', 'written_cbt', '2027-01-10', '2027-01-12',
        '10:00 AM – 01:00 PM IST',
        'https://www.osssc.gov.in', 'all_30_districts', 'confirmed', 1
      ]
    ];
    for (const r of exams) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_exam_calendar
         (id, event_code, commission_body, exam_name_en, exam_name_or, advt_number, exam_stage, exam_date_start, exam_date_end, shift_timing_ist, official_notice_url, district_scope, schedule_status, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const admCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_admission_milestones`).first();
  if (Number(admCnt?.n || 0) === 0) {
    const milestones = [
      [
        'evt-adm-001', 'ADM-2026-0001', 'SAMS_ODISHA', 'plus_two_plus_three',
        'SAMS Odisha +3 Degree Spot Admission & Final Slide-Up',
        'SAMS ଓଡ଼ିଶା +୩ ଡିଗ୍ରୀ ସ୍ପଟ୍ ଆଡମିଶନ୍ ଏବଂ ଚୂଡ଼ାନ୍ତ ସ୍ଲାଇଡ୍-ଅପ୍',
        'spot_admission', '2026-11-15T10:00:00+05:30', '2026-11-30T17:00:00+05:30',
        'https://samsodisha.gov.in',
        'Eligible +2 pass candidates registered on SAMS Odisha e-Admission portal.',
        'SAMS ଓଡ଼ିଶା ପୋର୍ଟାଲରେ ପଞ୍ଜୀକୃତ +୨ ପାସ୍ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ।',
        'active_live'
      ],
      [
        'evt-adm-002', 'ADM-2026-0002', 'OSHEC_CPET', 'cpet_pg_entrance',
        'CPET Odisha Postgraduate Common Entrance Merit List Round-1',
        'CPET ଓଡ଼ିଶା ସ୍ନାତକୋତ୍ତର ପ୍ରବେଶିକା ମେରିଟ୍ ତାଲିକା ରାଉଣ୍ଡ-୧',
        'merit_list_round_1', '2026-11-22T11:00:00+05:30', '2026-12-05T17:00:00+05:30',
        'https://pg.samsodisha.gov.in',
        'Graduates with 45%+ aggregate in honours/pass subjects across Odisha universities.',
        'ଓଡ଼ିଶାର ବିଶ୍ୱବିଦ୍ୟାଳୟଗୁଡ଼ିକରେ ୪୫%+ ନମ୍ବର ସହିତ ସ୍ନାତକ ପ୍ରାର୍ଥୀ।',
        'upcoming'
      ],
      [
        'evt-adm-003', 'ADM-2026-0003', 'TE_SCERT_BED', 'bed_med_teacher_ed',
        'SCERT Odisha State B.Ed. & M.Ed. CAF Application Window',
        'SCERT ଓଡ଼ିଶା ରାଜ୍ୟ B.Ed. ଏବଂ M.Ed. CAF ଆବେଦନ ସମୟସୀମା',
        'caf_application', '2026-11-10T10:00:00+05:30', '2026-12-10T23:45:00+05:30',
        'https://scertodisha.nic.in',
        'Bachelors/Masters degree holders with minimum 50% marks (45% for SC/ST/SEBC).',
        'ସର୍ବନିମ୍ନ ୫୦% ନମ୍ବର ସହିତ ସ୍ନାତକ/ସ୍ନାତକୋତ୍ତର ପ୍ରାର୍ଥୀ।',
        'active_live'
      ]
    ];
    for (const r of milestones) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_admission_milestones
         (id, milestone_code, portal_authority, program_stream, title_en, title_or, milestone_phase, starts_at_ist, ends_at_ist, official_portal_url, eligibility_note_en, eligibility_note_or, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const ddlCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_deadline_countdowns`).first();
  if (Number(ddlCnt?.n || 0) === 0) {
    const now = Date.now();
    const plusHoursIst = (hrs) => normalizeIstTimestamp(new Date(now + hrs * 3600000).toISOString());
    const deadlines = [
      [
        'evt-ddl-001', 'DDL-2026-0001', 'OPSC',
        'Odisha Civil Services (OAS / OFS / OPS) Recruitment 2026',
        'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS / OPS) ନିଯୁକ୍ତି ୨୦୨୬',
        'Advt. No. 08 of 2025-26', 399,
        plusHoursIst(-240), plusHoursIst(18), plusHoursIst(24),
        'Edit/Correction window opens for 5 days after closing.',
        'https://www.opsc.gov.in', 'final_24h', 1, 'active_live'
      ],
      [
        'evt-ddl-002', 'DDL-2026-0002', 'OSSC',
        'OSSC Combined Graduate Level Specialist & Auditor Posts',
        'OSSC ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ ସ୍ପେଶାଲିଷ୍ଟ ଏବଂ ଅଡିଟର ପଦବୀ',
        'Advt. No. 4120/OSSC', 586,
        plusHoursIst(-180), plusHoursIst(54), plusHoursIst(72),
        'One-time OTR edit allowed prior to final submission.',
        'https://www.ossc.gov.in', 'closing_72h', 1, 'active_live'
      ],
      [
        'evt-ddl-003', 'DDL-2026-0003', 'OSSSC',
        'OSSSC Revenue Inspector (RI), ARI, Amin & ICDS Supervisor',
        'OSSSC ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI), ARI, ଅମିନ ଏବଂ ICDS ସୁପରଭାଇଜର',
        'Advt. No. IIE-112/2025', 2895,
        plusHoursIst(-120), plusHoursIst(320), plusHoursIst(344),
        'District preference lock available till closing date.',
        'https://www.osssc.gov.in', 'open_normal', 1, 'active_live'
      ],
      [
        'evt-ddl-004', 'DDL-2026-0004', 'OTET_OSSTET',
        'OSSTET 2026 Odisha Secondary School Teacher Eligibility Test',
        'OSSTET ୨୦୨୬ ଓଡ଼ିଶା ମାଧ୍ୟମିକ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା',
        'BSE/OSSTET-2026-II', 0,
        plusHoursIst(-96), plusHoursIst(240), plusHoursIst(240),
        'Extended by BSE Odisha for B.Ed. final-semester candidates.',
        'https://www.bseodisha.ac.in', 'extended', 0, 'active_live'
      ]
    ];
    for (const r of deadlines) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_deadline_countdowns
         (id, deadline_code, commission_body, post_title_en, post_title_or, advt_number, total_vacancies, registration_opens_ist, registration_closes_ist, fee_payment_closes_ist, correction_window_note, apply_portal_url, urgency_badge, is_pinned_ticker, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }
}

/* ================= OVERVIEW (MODULES 01-09) ================= */
export async function getEventsSchedulingBatch1Overview(env) {
  await ensureEventsSchedulingBatch1Schema(env.DB);
  const [exRows, admRows, ddlRows] = await Promise.all([
    env.DB.prepare(`SELECT schedule_status FROM evt_exam_calendar WHERE schedule_status != 'archived'`).all(),
    env.DB.prepare(`SELECT status FROM evt_admission_milestones WHERE status != 'archived'`).all(),
    env.DB.prepare(`SELECT registration_closes_ist, urgency_badge, is_pinned_ticker, status FROM evt_deadline_countdowns WHERE status != 'archived'`).all()
  ]);

  const exams = exRows.results || [];
  const admissions = admRows.results || [];
  const deadlines = ddlRows.results || [];

  const confirmed_exam_dates = exams.filter(r => r.schedule_status === 'confirmed').length;
  const active_admission_milestones = admissions.filter(r => r.status === 'active_live').length;
  const upcoming_admission_milestones = admissions.filter(r => r.status === 'upcoming').length;

  let open_application_countdowns = 0;
  let closing_72h_count = 0;
  let final_24h_count = 0;
  let pinned_ticker_count = 0;

  for (const d of deadlines) {
    if (d.status === 'active_live') {
      open_application_countdowns += 1;
      const ev = computeDeadlineUrgency(d.registration_closes_ist, d.urgency_badge);
      if (ev.urgency_badge === 'closing_72h') closing_72h_count += 1;
      if (ev.urgency_badge === 'final_24h') final_24h_count += 1;
      if (Number(d.is_pinned_ticker) === 1) pinned_ticker_count += 1;
    }
  }

  return {
    timezone: 'Asia/Kolkata',
    confirmed_exam_dates,
    total_exam_dates: exams.length,
    active_admission_milestones,
    upcoming_admission_milestones,
    total_admission_milestones: admissions.length,
    open_application_countdowns,
    closing_72h_count,
    final_24h_count,
    pinned_ticker_count,
    modules: {
      '01': { code: '01', id: 'module-es-001', title: 'State Competitive Exam Calendar', status: 'active', count: exams.length },
      '02': { code: '02', id: 'module-es-002', title: 'Entrance & Admission Milestones', status: 'active', count: admissions.length },
      '03': { code: '03', id: 'module-es-003', title: 'Recruitment Application Deadlines & Countdown Engine', status: 'active', count: deadlines.length },
      '04': { code: '04', id: 'module-es-004', title: 'Admit Card, Hall Ticket & Center Allotment Alerts', status: 'queued', count: 0 },
      '05': { code: '05', id: 'module-es-005', title: 'Answer Key Challenges & Provisional Key Timelines', status: 'queued', count: 0 },
      '06': { code: '06', id: 'module-es-006', title: 'Result Declarations & Document Verification (DV) Rosters', status: 'queued', count: 0 },
      '07': { code: '07', id: 'module-es-007', title: 'Offline Workshops & District Meetups', status: 'queued', count: 0 },
      '08': { code: '08', id: 'module-es-008', title: 'Live Webinars & Virtual Counseling Sessions', status: 'queued', count: 0 },
      '09': { code: '09', id: 'module-es-009', title: 'Calendar Sync, ICS Feeds & Push Notification Dispatcher', status: 'queued', count: 0 }
    }
  };
}

/* ================= MODULE 01: STATE COMPETITIVE EXAM CALENDAR ================= */
async function handleExamCalendar(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const bodyFilter = sanitizeEvtText(url.searchParams.get('commission_body') || '', 40);
    const statusFilter = sanitizeEvtText(url.searchParams.get('schedule_status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (bodyFilter) { where.push(`commission_body = ?`); args.push(bodyFilter); }
    if (statusFilter) { where.push(`schedule_status = ?`); args.push(statusFilter); }
    else { where.push(`schedule_status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(exam_name_en LIKE ? ESCAPE '\\' OR exam_name_or LIKE ? ESCAPE '\\' OR advt_number LIKE ? ESCAPE '\\' OR event_code LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like);
    }
    const sql = `SELECT * FROM evt_exam_calendar ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY exam_date_start ASC, updated_at DESC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    return json({ items: results || [], timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const event_code = sanitizeEvtText(b.event_code || `EXM-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const commission_body = pick(b.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, 'OPSC');
    const exam_name_en = sanitizeEvtText(b.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number, 100);
    const exam_stage = pick(b.exam_stage, EVT_EXAM_STAGES, 'exam_stage', errors, 'prelims');
    const exam_date_start = normalizeIstDate(b.exam_date_start);
    const exam_date_end = normalizeIstDate(b.exam_date_end || b.exam_date_start);
    const shift_timing_ist = sanitizeEvtText(b.shift_timing_ist || '10:00 AM – 12:00 PM IST', 120);
    const official_notice_url = sanitizeOptionalUrl(b.official_notice_url);
    const district_scope = pick(b.district_scope, EVT_DISTRICT_SCOPES, 'district_scope', errors, 'all_30_districts');
    const schedule_status = pick(b.schedule_status, EVT_SCHEDULE_STATUSES, 'schedule_status', errors, 'confirmed');
    const is_featured = b.is_featured ? 1 : 0;

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (!exam_date_start) errors.exam_date_start = 'exam_date_start must be a valid YYYY-MM-DD date';
    if (!exam_date_end) errors.exam_date_end = 'exam_date_end must be a valid YYYY-MM-DD date';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-exm');
    await db.prepare(
      `INSERT INTO evt_exam_calendar
       (id, event_code, commission_body, exam_name_en, exam_name_or, advt_number, exam_stage, exam_date_start, exam_date_end, shift_timing_ist, official_notice_url, district_scope, schedule_status, is_featured, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, event_code, commission_body, exam_name_en, exam_name_or, advt_number, exam_stage, exam_date_start, exam_date_end, shift_timing_ist, official_notice_url, district_scope, schedule_status, is_featured).run();

    await snapshotEvtRevision(db, '01', newId, actor, 'create');
    await audit(env, request, actor, 'events.exam_calendar.create', 'evt_exam_calendar', newId, { event_code, commission_body });
    const item = await db.prepare(`SELECT * FROM evt_exam_calendar WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_exam_calendar WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Exam calendar entry not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const commission_body = pick(b.commission_body ?? existing.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, existing.commission_body);
    const exam_name_en = sanitizeEvtText(b.exam_name_en ?? existing.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or ?? existing.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number ?? existing.advt_number, 100);
    const exam_stage = pick(b.exam_stage ?? existing.exam_stage, EVT_EXAM_STAGES, 'exam_stage', errors, existing.exam_stage);
    const exam_date_start = normalizeIstDate(b.exam_date_start ?? existing.exam_date_start);
    const exam_date_end = normalizeIstDate(b.exam_date_end ?? existing.exam_date_end);
    const shift_timing_ist = sanitizeEvtText(b.shift_timing_ist ?? existing.shift_timing_ist, 120);
    const official_notice_url = b.official_notice_url !== undefined ? sanitizeOptionalUrl(b.official_notice_url) : existing.official_notice_url;
    const district_scope = pick(b.district_scope ?? existing.district_scope, EVT_DISTRICT_SCOPES, 'district_scope', errors, existing.district_scope);
    const schedule_status = pick(b.schedule_status ?? existing.schedule_status, EVT_SCHEDULE_STATUSES, 'schedule_status', errors, existing.schedule_status);
    const is_featured = b.is_featured !== undefined ? (b.is_featured ? 1 : 0) : existing.is_featured;

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (!exam_date_start) errors.exam_date_start = 'exam_date_start must be valid';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_exam_calendar
       SET commission_body=?, exam_name_en=?, exam_name_or=?, advt_number=?, exam_stage=?, exam_date_start=?, exam_date_end=?, shift_timing_ist=?, official_notice_url=?, district_scope=?, schedule_status=?, is_featured=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(commission_body, exam_name_en, exam_name_or, advt_number, exam_stage, exam_date_start, exam_date_end, shift_timing_ist, official_notice_url, district_scope, schedule_status, is_featured, id).run();

    await snapshotEvtRevision(db, '01', id, actor, 'update');
    await audit(env, request, actor, 'events.exam_calendar.update', 'evt_exam_calendar', id, { schedule_status });
    const item = await db.prepare(`SELECT * FROM evt_exam_calendar WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_exam_calendar WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Exam calendar entry not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const schedule_status = pick(b.schedule_status || b.status, EVT_SCHEDULE_STATUSES, 'schedule_status', errors, null);
    if (!schedule_status) errors.schedule_status = 'schedule_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE evt_exam_calendar SET schedule_status=?, updated_at=datetime('now') WHERE id=?`).bind(schedule_status, id).run();
    await snapshotEvtRevision(db, '01', id, actor, `status:${schedule_status}`);
    await audit(env, request, actor, 'events.exam_calendar.status', 'evt_exam_calendar', id, { schedule_status });
    const item = await db.prepare(`SELECT * FROM evt_exam_calendar WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_exam_calendar WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Exam calendar entry not found');
    await db.prepare(`UPDATE evt_exam_calendar SET schedule_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '01', id, actor, 'archive');
    await audit(env, request, actor, 'events.exam_calendar.archive', 'evt_exam_calendar', id, {});
    return json({ ok: true, id, schedule_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown exam-calendar route');
}

/* ================= MODULE 02: ENTRANCE & ADMISSION MILESTONES ================= */
async function handleAdmissions(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const authFilter = sanitizeEvtText(url.searchParams.get('portal_authority') || '', 40);
    const statusFilter = sanitizeEvtText(url.searchParams.get('status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (authFilter) { where.push(`portal_authority = ?`); args.push(authFilter); }
    if (statusFilter) { where.push(`status = ?`); args.push(statusFilter); }
    else { where.push(`status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR milestone_code LIKE ? ESCAPE '\\' OR eligibility_note_en LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like);
    }
    const sql = `SELECT * FROM evt_admission_milestones ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY starts_at_ist ASC, updated_at DESC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    return json({ items: results || [], timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const milestone_code = sanitizeEvtText(b.milestone_code || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const portal_authority = pick(b.portal_authority, EVT_PORTAL_AUTHORITIES, 'portal_authority', errors, 'SAMS_ODISHA');
    const program_stream = pick(b.program_stream, EVT_PROGRAM_STREAMS, 'program_stream', errors, 'plus_two_plus_three');
    const title_en = sanitizeEvtText(b.title_en, 240);
    const title_or = sanitizeEvtText(b.title_or, 240);
    const milestone_phase = pick(b.milestone_phase, EVT_MILESTONE_PHASES, 'milestone_phase', errors, 'caf_application');
    const starts_at_ist = normalizeIstTimestamp(b.starts_at_ist, '10:00:00');
    const ends_at_ist = normalizeIstTimestamp(b.ends_at_ist, '23:59:00');
    const official_portal_url = sanitizeOptionalUrl(b.official_portal_url);
    const eligibility_note_en = sanitizeEvtText(b.eligibility_note_en, 400);
    const eligibility_note_or = sanitizeEvtText(b.eligibility_note_or, 400);
    const status = pick(b.status, EVT_ADMISSION_STATUSES, 'status', errors, 'active_live');

    if (!title_en) errors.title_en = 'title_en is required';
    if (!starts_at_ist) errors.starts_at_ist = 'starts_at_ist must be a valid date/timestamp';
    if (!ends_at_ist) errors.ends_at_ist = 'ends_at_ist must be a valid date/timestamp';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-adm');
    await db.prepare(
      `INSERT INTO evt_admission_milestones
       (id, milestone_code, portal_authority, program_stream, title_en, title_or, milestone_phase, starts_at_ist, ends_at_ist, official_portal_url, eligibility_note_en, eligibility_note_or, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, milestone_code, portal_authority, program_stream, title_en, title_or, milestone_phase, starts_at_ist, ends_at_ist, official_portal_url, eligibility_note_en, eligibility_note_or, status).run();

    await snapshotEvtRevision(db, '02', newId, actor, 'create');
    await audit(env, request, actor, 'events.admissions.create', 'evt_admission_milestones', newId, { milestone_code, portal_authority });
    const item = await db.prepare(`SELECT * FROM evt_admission_milestones WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_admission_milestones WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admission milestone not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const portal_authority = pick(b.portal_authority ?? existing.portal_authority, EVT_PORTAL_AUTHORITIES, 'portal_authority', errors, existing.portal_authority);
    const program_stream = pick(b.program_stream ?? existing.program_stream, EVT_PROGRAM_STREAMS, 'program_stream', errors, existing.program_stream);
    const title_en = sanitizeEvtText(b.title_en ?? existing.title_en, 240);
    const title_or = sanitizeEvtText(b.title_or ?? existing.title_or, 240);
    const milestone_phase = pick(b.milestone_phase ?? existing.milestone_phase, EVT_MILESTONE_PHASES, 'milestone_phase', errors, existing.milestone_phase);
    const starts_at_ist = normalizeIstTimestamp(b.starts_at_ist ?? existing.starts_at_ist, '10:00:00');
    const ends_at_ist = normalizeIstTimestamp(b.ends_at_ist ?? existing.ends_at_ist, '23:59:00');
    const official_portal_url = b.official_portal_url !== undefined ? sanitizeOptionalUrl(b.official_portal_url) : existing.official_portal_url;
    const eligibility_note_en = sanitizeEvtText(b.eligibility_note_en ?? existing.eligibility_note_en, 400);
    const eligibility_note_or = sanitizeEvtText(b.eligibility_note_or ?? existing.eligibility_note_or, 400);
    const status = pick(b.status ?? existing.status, EVT_ADMISSION_STATUSES, 'status', errors, existing.status);

    if (!title_en) errors.title_en = 'title_en is required';
    if (!starts_at_ist || !ends_at_ist) errors.starts_at_ist = 'Valid IST timestamps required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_admission_milestones
       SET portal_authority=?, program_stream=?, title_en=?, title_or=?, milestone_phase=?, starts_at_ist=?, ends_at_ist=?, official_portal_url=?, eligibility_note_en=?, eligibility_note_or=?, status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(portal_authority, program_stream, title_en, title_or, milestone_phase, starts_at_ist, ends_at_ist, official_portal_url, eligibility_note_en, eligibility_note_or, status, id).run();

    await snapshotEvtRevision(db, '02', id, actor, 'update');
    await audit(env, request, actor, 'events.admissions.update', 'evt_admission_milestones', id, { status });
    const item = await db.prepare(`SELECT * FROM evt_admission_milestones WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_admission_milestones WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admission milestone not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const status = pick(b.status, EVT_ADMISSION_STATUSES, 'status', errors, null);
    if (!status) errors.status = 'status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE evt_admission_milestones SET status=?, updated_at=datetime('now') WHERE id=?`).bind(status, id).run();
    await snapshotEvtRevision(db, '02', id, actor, `status:${status}`);
    await audit(env, request, actor, 'events.admissions.status', 'evt_admission_milestones', id, { status });
    const item = await db.prepare(`SELECT * FROM evt_admission_milestones WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_admission_milestones WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admission milestone not found');
    await db.prepare(`UPDATE evt_admission_milestones SET status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '02', id, actor, 'archive');
    await audit(env, request, actor, 'events.admissions.archive', 'evt_admission_milestones', id, {});
    return json({ ok: true, id, status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown admissions route');
}

/* ================= MODULE 03: RECRUITMENT DEADLINES & COUNTDOWN ENGINE ================= */
function enrichDeadlineRow(row, nowMs = Date.now()) {
  const evald = computeDeadlineUrgency(row.registration_closes_ist, row.urgency_badge, nowMs);
  return {
    ...row,
    remaining_hours: evald.remaining_hours,
    urgency_badge: evald.urgency_badge,
    is_expired: evald.is_expired
  };
}

async function handleDeadlines(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const urgencyFilter = sanitizeEvtText(url.searchParams.get('urgency_badge') || '', 40);
    const statusFilter = sanitizeEvtText(url.searchParams.get('status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (statusFilter) { where.push(`status = ?`); args.push(statusFilter); }
    else { where.push(`status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(post_title_en LIKE ? ESCAPE '\\' OR post_title_or LIKE ? ESCAPE '\\' OR advt_number LIKE ? ESCAPE '\\' OR deadline_code LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like);
    }
    const sql = `SELECT * FROM evt_deadline_countdowns ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY is_pinned_ticker DESC, registration_closes_ist ASC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    const nowMs = Date.now();
    let items = (results || []).map(r => enrichDeadlineRow(r, nowMs));
    if (urgencyFilter) {
      items = items.filter(r => r.urgency_badge === urgencyFilter);
    }
    return json({ items, timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const deadline_code = sanitizeEvtText(b.deadline_code || `DDL-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const commission_body = pick(b.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, 'OPSC');
    const post_title_en = sanitizeEvtText(b.post_title_en, 240);
    const post_title_or = sanitizeEvtText(b.post_title_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number, 100);
    const total_vacancies = Math.max(0, Math.min(500000, parseInt(b.total_vacancies ?? 0, 10) || 0));
    const registration_opens_ist = normalizeIstTimestamp(b.registration_opens_ist || nowIstIso(), '10:00:00');
    const registration_closes_ist = normalizeIstTimestamp(b.registration_closes_ist, '23:59:00');
    const fee_payment_closes_ist = b.fee_payment_closes_ist ? normalizeIstTimestamp(b.fee_payment_closes_ist, '23:59:00') : registration_closes_ist;
    const correction_window_note = sanitizeEvtText(b.correction_window_note, 320);
    const apply_portal_url = sanitizeOptionalUrl(b.apply_portal_url);
    const reqUrgency = pick(b.urgency_badge, EVT_URGENCY_BADGES, 'urgency_badge', errors, 'open_normal');
    const is_pinned_ticker = b.is_pinned_ticker ? 1 : 0;
    const status = pick(b.status, EVT_DEADLINE_STATUSES, 'status', errors, 'active_live');

    if (!post_title_en) errors.post_title_en = 'post_title_en is required';
    if (!registration_closes_ist) errors.registration_closes_ist = 'registration_closes_ist must be a valid date/timestamp';
    if (Object.keys(errors).length) return validationError(errors);

    const evald = computeDeadlineUrgency(registration_closes_ist, reqUrgency);
    const newId = rid('evt-ddl');
    await db.prepare(
      `INSERT INTO evt_deadline_countdowns
       (id, deadline_code, commission_body, post_title_en, post_title_or, advt_number, total_vacancies, registration_opens_ist, registration_closes_ist, fee_payment_closes_ist, correction_window_note, apply_portal_url, urgency_badge, is_pinned_ticker, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      newId, deadline_code, commission_body, post_title_en, post_title_or, advt_number,
      total_vacancies, registration_opens_ist, registration_closes_ist, fee_payment_closes_ist,
      correction_window_note, apply_portal_url, evald.urgency_badge, is_pinned_ticker, status
    ).run();

    await snapshotEvtRevision(db, '03', newId, actor, 'create');
    await audit(env, request, actor, 'events.deadlines.create', 'evt_deadline_countdowns', newId, { deadline_code, urgency_badge: evald.urgency_badge });
    const row = await db.prepare(`SELECT * FROM evt_deadline_countdowns WHERE id = ?`).bind(newId).first();
    return json({ item: enrichDeadlineRow(row) }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_deadline_countdowns WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Deadline countdown not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const commission_body = pick(b.commission_body ?? existing.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, existing.commission_body);
    const post_title_en = sanitizeEvtText(b.post_title_en ?? existing.post_title_en, 240);
    const post_title_or = sanitizeEvtText(b.post_title_or ?? existing.post_title_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number ?? existing.advt_number, 100);
    const total_vacancies = b.total_vacancies !== undefined ? Math.max(0, Math.min(500000, parseInt(b.total_vacancies, 10) || 0)) : existing.total_vacancies;
    const registration_opens_ist = normalizeIstTimestamp(b.registration_opens_ist ?? existing.registration_opens_ist, '10:00:00');
    const registration_closes_ist = normalizeIstTimestamp(b.registration_closes_ist ?? existing.registration_closes_ist, '23:59:00');
    const fee_payment_closes_ist = b.fee_payment_closes_ist !== undefined
      ? (b.fee_payment_closes_ist ? normalizeIstTimestamp(b.fee_payment_closes_ist, '23:59:00') : '')
      : existing.fee_payment_closes_ist;
    const correction_window_note = sanitizeEvtText(b.correction_window_note ?? existing.correction_window_note, 320);
    const apply_portal_url = b.apply_portal_url !== undefined ? sanitizeOptionalUrl(b.apply_portal_url) : existing.apply_portal_url;
    const reqUrgency = pick(b.urgency_badge ?? existing.urgency_badge, EVT_URGENCY_BADGES, 'urgency_badge', errors, existing.urgency_badge);
    const is_pinned_ticker = b.is_pinned_ticker !== undefined ? (b.is_pinned_ticker ? 1 : 0) : existing.is_pinned_ticker;
    const status = pick(b.status ?? existing.status, EVT_DEADLINE_STATUSES, 'status', errors, existing.status);

    if (!post_title_en) errors.post_title_en = 'post_title_en is required';
    if (!registration_closes_ist) errors.registration_closes_ist = 'registration_closes_ist must be valid';
    if (Object.keys(errors).length) return validationError(errors);

    const evald = computeDeadlineUrgency(registration_closes_ist, reqUrgency);
    await db.prepare(
      `UPDATE evt_deadline_countdowns
       SET commission_body=?, post_title_en=?, post_title_or=?, advt_number=?, total_vacancies=?, registration_opens_ist=?, registration_closes_ist=?, fee_payment_closes_ist=?, correction_window_note=?, apply_portal_url=?, urgency_badge=?, is_pinned_ticker=?, status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(
      commission_body, post_title_en, post_title_or, advt_number, total_vacancies,
      registration_opens_ist, registration_closes_ist, fee_payment_closes_ist,
      correction_window_note, apply_portal_url, evald.urgency_badge, is_pinned_ticker, status, id
    ).run();

    await snapshotEvtRevision(db, '03', id, actor, 'update');
    await audit(env, request, actor, 'events.deadlines.update', 'evt_deadline_countdowns', id, { urgency_badge: evald.urgency_badge, is_pinned_ticker });
    const row = await db.prepare(`SELECT * FROM evt_deadline_countdowns WHERE id = ?`).bind(id).first();
    return json({ item: enrichDeadlineRow(row) });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_deadline_countdowns WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Deadline countdown not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const status = b.status !== undefined ? pick(b.status, EVT_DEADLINE_STATUSES, 'status', errors, existing.status) : existing.status;
    const is_pinned_ticker = b.is_pinned_ticker !== undefined ? (b.is_pinned_ticker ? 1 : 0) : existing.is_pinned_ticker;
    const urgency_badge = b.urgency_badge !== undefined ? pick(b.urgency_badge, EVT_URGENCY_BADGES, 'urgency_badge', errors, existing.urgency_badge) : existing.urgency_badge;
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_deadline_countdowns SET status=?, is_pinned_ticker=?, urgency_badge=?, updated_at=datetime('now') WHERE id=?`
    ).bind(status, is_pinned_ticker, urgency_badge, id).run();

    await snapshotEvtRevision(db, '03', id, actor, `status:${status}`);
    await audit(env, request, actor, 'events.deadlines.status', 'evt_deadline_countdowns', id, { status, is_pinned_ticker });
    const row = await db.prepare(`SELECT * FROM evt_deadline_countdowns WHERE id = ?`).bind(id).first();
    return json({ item: enrichDeadlineRow(row) });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_deadline_countdowns WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Deadline countdown not found');
    await db.prepare(`UPDATE evt_deadline_countdowns SET status='archived', is_pinned_ticker=0, updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '03', id, actor, 'archive');
    await audit(env, request, actor, 'events.deadlines.archive', 'evt_deadline_countdowns', id, {});
    return json({ ok: true, id, status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown deadlines route');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleEvtRevisions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !sub) {
    const moduleCode = sanitizeEvtText(url.searchParams.get('module_code') || '', 10);
    const entityId = sanitizeEvtText(url.searchParams.get('entity_id') || '', 80);
    const where = [];
    const args = [];
    if (moduleCode) { where.push(`module_code = ?`); args.push(moduleCode); }
    if (entityId) { where.push(`entity_id = ?`); args.push(entityId); }
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM evt_revisions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY version_num DESC LIMIT 40`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && sub === 'rollback') {
    const b = await readJson(request, 16000);
    const revId = sanitizeEvtText(b.revision_id, 80);
    if (!revId) return validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM evt_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = EVT_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', 'Revision rollback unsupported for module');

    let snap = {};
    try { snap = JSON.parse(rev.snapshot_json); } catch { throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid snapshot JSON'); }
    const setSql = cfg.cols.map(c => `${c} = ?`).join(', ');
    const vals = cfg.cols.map(c => snap[c] ?? '');
    await db.prepare(`UPDATE ${cfg.table} SET ${setSql}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, rev.entity_id).run();

    await snapshotEvtRevision(db, rev.module_code, rev.entity_id, actor, `rollback to v${rev.version_num}`);
    await audit(env, request, actor, 'events.revisions.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    const restored = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(rev.entity_id).first();
    return json({ ok: true, restored });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown revisions route');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleEventsSchedulingBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureEventsSchedulingBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json(await getEventsSchedulingBatch1Overview(env));
  }
  if (id === 'exam-calendar') return handleExamCalendar(request, env, actor, sub, extra);
  if (id === 'admissions') return handleAdmissions(request, env, actor, sub, extra);
  if (id === 'deadlines') return handleDeadlines(request, env, actor, sub, extra);
  if (id === 'revisions') return handleEvtRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown events admin route');
}

/* ================= PUBLIC EDGE-CACHED CALENDAR & COUNTDOWN API ================= */
export async function handlePublicEventsUpcomingApi(request, env) {
  await ensureEventsSchedulingBatch1Schema(env.DB);
  const nowMs = Date.now();
  const todayIst = formatIstDateParts(nowMs).date;

  const [exRes, admRes, ddlRes] = await Promise.all([
    env.DB.prepare(
      `SELECT id, event_code, commission_body, exam_name_en, exam_name_or, advt_number, exam_stage, exam_date_start, exam_date_end, shift_timing_ist, official_notice_url, district_scope, schedule_status, is_featured
       FROM evt_exam_calendar
       WHERE schedule_status IN ('confirmed', 'tentative', 'postponed') AND exam_date_end >= ?
       ORDER BY is_featured DESC, exam_date_start ASC LIMIT 30`
    ).bind(todayIst).all(),
    env.DB.prepare(
      `SELECT id, milestone_code, portal_authority, program_stream, title_en, title_or, milestone_phase, starts_at_ist, ends_at_ist, official_portal_url, eligibility_note_en, eligibility_note_or, status
       FROM evt_admission_milestones
       WHERE status IN ('active_live', 'upcoming')
       ORDER BY starts_at_ist ASC LIMIT 30`
    ).all(),
    env.DB.prepare(
      `SELECT id, deadline_code, commission_body, post_title_en, post_title_or, advt_number, total_vacancies, registration_opens_ist, registration_closes_ist, fee_payment_closes_ist, correction_window_note, apply_portal_url, urgency_badge, is_pinned_ticker, status
       FROM evt_deadline_countdowns
       WHERE status = 'active_live'
       ORDER BY is_pinned_ticker DESC, registration_closes_ist ASC LIMIT 30`
    ).all()
  ]);

  const active_deadlines = (ddlRes.results || [])
    .map(r => enrichDeadlineRow(r, nowMs))
    .filter(r => !r.is_expired);

  return json({
    timezone: 'Asia/Kolkata',
    generated_at_ist: nowIstIso(),
    upcoming_exams: exRes.results || [],
    admission_milestones: admRes.results || [],
    active_deadlines
  }, 200, {
    'Cache-Control': 'public, max-age=120, s-maxage=300',
    'X-CSO-Timezone': 'Asia/Kolkata'
  });
}
