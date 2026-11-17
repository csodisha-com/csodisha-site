// Events & Scheduling Batch 2 (v116): Modules 04-06
// 04 Admit Card, Hall Ticket & Center Allotment Alerts
// 05 Answer Key Challenges & Provisional Key Timelines
// 06 Result Declarations & Document Verification (DV) Rosters
// All timestamps normalized to IST (Asia/Kolkata, +05:30). INR fees stored in integer paise.
// Never store raw candidate PII/roll lists in public rosters (range summaries only).
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { likeEscape } from './validate.js';
import {
  EVT_COMMISSION_BODIES,
  EVT_REV_TABLES,
  ensureEventsSchedulingBatch1Schema,
  getEventsSchedulingBatch1Overview,
  handlePublicEventsUpcomingApi,
  normalizeIstDate,
  normalizeIstTimestamp,
  nowIstIso,
  sanitizeEvtText,
  snapshotEvtRevision
} from './events-scheduling-batch1.js';

export const EVT_RELEASE_STAGES = ['exam_city_intimation', 'admit_card_live', 're_exam_hall_ticket', 'skill_test_call_letter'];
export const EVT_RELEASE_STATUSES = ['live_download', 'scheduled_soon', 'closed', 'archived'];

export const EVT_KEY_STAGES = ['provisional_key_open', 'objection_window_closing', 'final_revised_key', 'archived_key'];
export const EVT_KEY_STATUSES = ['open_for_challenge', 'under_expert_review', 'final_published', 'archived'];

export const EVT_DECLARATION_TYPES = ['prelims_shortlist', 'written_result', 'dv_biometric_schedule', 'final_merit_list', 'supplementary_list'];
export const EVT_RESULT_STATUSES = ['published_live', 'dv_ongoing', 'completed', 'archived'];

const _evt2Ready = new WeakSet();

EVT_REV_TABLES['04'] = {
  table: 'evt_admit_card_releases',
  cols: [
    'release_code', 'commission_body', 'exam_name_en', 'exam_name_or', 'advt_number',
    'release_stage', 'released_at_ist', 'exam_date_ist', 'allotted_districts_json',
    'download_portal_url', 'login_credentials_required', 'release_status'
  ]
};
EVT_REV_TABLES['05'] = {
  table: 'evt_answer_key_challenges',
  cols: [
    'key_code', 'commission_body', 'exam_name_en', 'exam_name_or', 'advt_number',
    'key_stage', 'provisional_released_at_ist', 'objection_deadline_ist',
    'fee_per_question_paise', 'is_fee_refundable_if_accepted', 'answer_key_pdf_url',
    'objection_portal_url', 'total_sets_covered', 'status'
  ]
};
EVT_REV_TABLES['06'] = {
  table: 'evt_results_dv_rosters',
  cols: [
    'roster_code', 'commission_body', 'exam_name_en', 'exam_name_or', 'advt_number',
    'declaration_type', 'declared_at_ist', 'dv_start_date_ist', 'dv_end_date_ist',
    'dv_venue_odisha', 'shortlisted_candidates_count', 'roll_range_summary',
    'cutoff_summary_en', 'cutoff_summary_or', 'result_pdf_url', 'status'
  ]
};

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

function sanitizeOptionalUrl(raw) {
  const s = sanitizeEvtText(raw, 400);
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return '';
}

function parseDistrictsJson(raw) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : raw.split(',');
    } catch {
      list = raw.split(',');
    }
  }
  const clean = list
    .map(v => sanitizeEvtText(v, 60))
    .filter(Boolean)
    .slice(0, 30);
  return JSON.stringify(clean);
}

export function formatInrFromPaise(paise) {
  const num = Math.max(0, Number(paise || 0)) / 100;
  return `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)}`;
}

export function computeObjectionRemainingHours(deadlineIst, nowMs = Date.now()) {
  const norm = normalizeIstTimestamp(deadlineIst);
  if (!norm) return 0;
  const ms = Date.parse(norm);
  if (Number.isNaN(ms)) return 0;
  const diff = (ms - nowMs) / 3600000;
  return diff <= 0 ? 0 : Math.round(diff * 10) / 10;
}

function enrichAdmitRow(row) {
  let allotted_districts = [];
  try {
    const parsed = JSON.parse(row.allotted_districts_json || '[]');
    if (Array.isArray(parsed)) allotted_districts = parsed;
  } catch {
    allotted_districts = [];
  }
  return { ...row, allotted_districts };
}

function enrichAnswerKeyRow(row, nowMs = Date.now()) {
  const paise = Math.max(0, Number(row.fee_per_question_paise || 0));
  return {
    ...row,
    fee_display_inr: formatInrFromPaise(paise),
    objection_remaining_hours: computeObjectionRemainingHours(row.objection_deadline_ist, nowMs)
  };
}

export async function ensureEventsSchedulingBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureEventsSchedulingBatch1Schema(db);
  if (_evt2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS evt_admit_card_releases (
      id TEXT PRIMARY KEY,
      release_code TEXT NOT NULL UNIQUE,
      commission_body TEXT NOT NULL DEFAULT 'OPSC',
      exam_name_en TEXT NOT NULL,
      exam_name_or TEXT NOT NULL DEFAULT '',
      advt_number TEXT NOT NULL DEFAULT '',
      release_stage TEXT NOT NULL DEFAULT 'admit_card_live',
      released_at_ist TEXT NOT NULL,
      exam_date_ist TEXT NOT NULL,
      allotted_districts_json TEXT NOT NULL DEFAULT '[]',
      download_portal_url TEXT NOT NULL DEFAULT '',
      login_credentials_required TEXT NOT NULL DEFAULT 'PPSAN / User ID + DOB',
      release_status TEXT NOT NULL DEFAULT 'live_download',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_admit_body_status ON evt_admit_card_releases(commission_body, release_status, exam_date_ist)`,

    `CREATE TABLE IF NOT EXISTS evt_answer_key_challenges (
      id TEXT PRIMARY KEY,
      key_code TEXT NOT NULL UNIQUE,
      commission_body TEXT NOT NULL DEFAULT 'OSSC',
      exam_name_en TEXT NOT NULL,
      exam_name_or TEXT NOT NULL DEFAULT '',
      advt_number TEXT NOT NULL DEFAULT '',
      key_stage TEXT NOT NULL DEFAULT 'provisional_key_open',
      provisional_released_at_ist TEXT NOT NULL,
      objection_deadline_ist TEXT NOT NULL,
      fee_per_question_paise INTEGER NOT NULL DEFAULT 0,
      is_fee_refundable_if_accepted INTEGER NOT NULL DEFAULT 1,
      answer_key_pdf_url TEXT NOT NULL DEFAULT '',
      objection_portal_url TEXT NOT NULL DEFAULT '',
      total_sets_covered TEXT NOT NULL DEFAULT 'Sets A, B, C, D',
      status TEXT NOT NULL DEFAULT 'open_for_challenge',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_key_body_status ON evt_answer_key_challenges(commission_body, status, objection_deadline_ist)`,

    `CREATE TABLE IF NOT EXISTS evt_results_dv_rosters (
      id TEXT PRIMARY KEY,
      roster_code TEXT NOT NULL UNIQUE,
      commission_body TEXT NOT NULL DEFAULT 'OSSC',
      exam_name_en TEXT NOT NULL,
      exam_name_or TEXT NOT NULL DEFAULT '',
      advt_number TEXT NOT NULL DEFAULT '',
      declaration_type TEXT NOT NULL DEFAULT 'prelims_shortlist',
      declared_at_ist TEXT NOT NULL,
      dv_start_date_ist TEXT NOT NULL DEFAULT '',
      dv_end_date_ist TEXT NOT NULL DEFAULT '',
      dv_venue_odisha TEXT NOT NULL DEFAULT '',
      shortlisted_candidates_count INTEGER NOT NULL DEFAULT 0,
      roll_range_summary TEXT NOT NULL DEFAULT '',
      cutoff_summary_en TEXT NOT NULL DEFAULT '',
      cutoff_summary_or TEXT NOT NULL DEFAULT '',
      result_pdf_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published_live',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_res_body_type_status ON evt_results_dv_rosters(commission_body, declaration_type, status, declared_at_ist)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  await seedEventsSchedulingBatch2(db);
  _evt2Ready.add(db);
}

async function seedEventsSchedulingBatch2(db) {
  const now = Date.now();
  const plusHoursIst = (hrs) => normalizeIstTimestamp(new Date(now + hrs * 3600000).toISOString());

  const admCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_admit_card_releases`).first();
  if (Number(admCnt?.n || 0) === 0) {
    const admits = [
      [
        'evt-hal-001', 'HAL-2026-0001', 'OPSC',
        'OPSC Odisha Civil Services (OAS) Preliminary Admit Card 2026',
        'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS) ପ୍ରାରମ୍ଭିକ ଆଡମିଟ୍ କାର୍ଡ ୨୦୨୬',
        'Advt. No. 08 of 2025-26', 'admit_card_live',
        '2026-11-16T11:00:00+05:30', '2026-12-13',
        JSON.stringify(['Bhubaneswar', 'Cuttack', 'Balasore', 'Berhampur', 'Sambalpur']),
        'https://www.opsc.gov.in', 'PPSAN + Date of Birth', 'live_download'
      ],
      [
        'evt-hal-002', 'HAL-2026-0002', 'OSSC',
        'OSSC Combined Graduate Level (CGLRE) Exam City Intimation Slip',
        'OSSC ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGLRE) ପରୀକ୍ଷା ସହର ସୂଚନା ସ୍ଲିପ୍',
        'Advt. No. 4120/OSSC', 'exam_city_intimation',
        '2026-11-17T15:30:00+05:30', '2026-12-20',
        JSON.stringify(['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Balasore', 'Sambalpur', 'Koraput']),
        'https://www.ossc.gov.in', 'Registered User ID + Password / OTP', 'live_download'
      ],
      [
        'evt-hal-003', 'HAL-2026-0003', 'OSSSC',
        'OSSSC RI, ARI & Amin Computer Skill Test Call Letter',
        'OSSSC RI, ARI ଏବଂ ଅମିନ କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା କଲ୍ ଲେଟର',
        'Advt. No. IIE-112/2025', 'skill_test_call_letter',
        '2026-12-26T10:00:00+05:30', '2027-01-10',
        JSON.stringify(['All 30 Odisha Districts']),
        'https://www.osssc.gov.in', 'User ID / Mobile + DOB', 'scheduled_soon'
      ]
    ];
    for (const r of admits) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_admit_card_releases
         (id, release_code, commission_body, exam_name_en, exam_name_or, advt_number, release_stage, released_at_ist, exam_date_ist, allotted_districts_json, download_portal_url, login_credentials_required, release_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const keyCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_answer_key_challenges`).first();
  if (Number(keyCnt?.n || 0) === 0) {
    const keys = [
      [
        'evt-ans-001', 'ANS-2026-0001', 'OSSSC',
        'OSSSC Combined Recruitment Preliminary Provisional Answer Key',
        'OSSSC ମିଳିତ ନିଯୁକ୍ତି ପ୍ରାରମ୍ଭିକ ସମ୍ଭାବ୍ୟ ଉତ୍ତର ସଙ୍କେତ',
        'Advt. No. IIE-112/2025', 'provisional_key_open',
        plusHoursIst(-24), plusHoursIst(96),
        0, 1,
        'https://www.osssc.gov.in/answer-key.pdf', 'https://www.osssc.gov.in',
        'Sets A, B, C, D', 'open_for_challenge'
      ],
      [
        'evt-ans-002', 'ANS-2026-0002', 'NTA_UGC_NET',
        'NTA UGC NET Odisha Center Provisional Answer Key Challenge',
        'NTA UGC NET ଓଡ଼ିଶା କେନ୍ଦ୍ର ସମ୍ଭାବ୍ୟ ଉତ୍ତର ସଙ୍କେତ ଆପତ୍ତି',
        'UGC-NET-2026-II', 'objection_window_closing',
        plusHoursIst(-48), plusHoursIst(36),
        20000, 1,
        'https://ugcnet.nta.ac.in', 'https://ugcnet.nta.ac.in',
        'All Shifts (Paper I & II)', 'open_for_challenge'
      ],
      [
        'evt-ans-003', 'ANS-2026-0003', 'OSSC',
        'OSSC Statistical Investigator Final Revised Answer Key',
        'OSSC ପରିସଂଖ୍ୟାନ ଅନୁସନ୍ଧାନକାରୀ ଚୂଡ଼ାନ୍ତ ସଂଶୋଧିତ ଉତ୍ତର ସଙ୍କେତ',
        'Advt. No. 3890/OSSC', 'final_revised_key',
        plusHoursIst(-240), plusHoursIst(-72),
        0, 1,
        'https://www.ossc.gov.in/final-key.pdf', 'https://www.ossc.gov.in',
        'Sets A, B, C, D', 'final_published'
      ]
    ];
    for (const r of keys) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_answer_key_challenges
         (id, key_code, commission_body, exam_name_en, exam_name_or, advt_number, key_stage, provisional_released_at_ist, objection_deadline_ist, fee_per_question_paise, is_fee_refundable_if_accepted, answer_key_pdf_url, objection_portal_url, total_sets_covered, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const resCnt = await db.prepare(`SELECT COUNT(*) AS n FROM evt_results_dv_rosters`).first();
  if (Number(resCnt?.n || 0) === 0) {
    const rosters = [
      [
        'evt-res-001', 'RES-2026-0001', 'OSSC',
        'OSSC Combined Technical Services Certificate Verification Roster',
        'OSSC ମିଳିତ ବୈଷୟିକ ସେବା ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ ରୋଷ୍ଟର',
        'Advt. No. 3945/OSSC', 'dv_biometric_schedule',
        '2026-11-12T18:00:00+05:30', '2026-11-24', '2026-12-02',
        'OSSC Campus, Unit-II, Bhubaneswar', 1420,
        'Roll 2600101 – 2608450 (Board-wise Roster)',
        'UR: 118.50 | SEBC: 112.00 | SC: 96.25 | ST: 88.75',
        'UR: ୧୧୮.୫୦ | SEBC: ୧୧୨.୦୦ | SC: ୯୬.୨୫ | ST: ୮୮.୭୫',
        'https://www.ossc.gov.in/dv-roster.pdf', 'dv_ongoing'
      ],
      [
        'evt-res-002', 'RES-2026-0002', 'OPSC',
        'OPSC Assistant Section Officer (ASO) Final Merit List 2026',
        'OPSC ସହକାରୀ ସେକ୍ସନ୍ ଅଫିସର (ASO) ଚୂଡ଼ାନ୍ତ ମେରିଟ୍ ତାଲିକା ୨୦୨୬',
        'Advt. No. 26 of 2025-26', 'final_merit_list',
        '2026-11-15T19:15:00+05:30', '2026-11-28', '2026-12-05',
        'OPSC Office, 19 Dr. P.K. Parija Road, Cuttack', 796,
        'Roll 110001 – 149820 (796 Selected Candidates)',
        'UR: 264.25 | SEBC: 255.00 | SC: 228.50 | ST: 204.75',
        'UR: ୨୬୪.୨୫ | SEBC: ୨୫୫.୦୦ | SC: ୨୨୮.୫୦ | ST: ୨୦୪.୭୫',
        'https://www.opsc.gov.in/aso-final-merit.pdf', 'published_live'
      ]
    ];
    for (const r of rosters) {
      await db.prepare(
        `INSERT OR IGNORE INTO evt_results_dv_rosters
         (id, roster_code, commission_body, exam_name_en, exam_name_or, advt_number, declaration_type, declared_at_ist, dv_start_date_ist, dv_end_date_ist, dv_venue_odisha, shortlisted_candidates_count, roll_range_summary, cutoff_summary_en, cutoff_summary_or, result_pdf_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }
}

/* ================= FULL 6-MODULE OVERVIEW (01-06 ACTIVE, 07-09 QUEUED) ================= */
export async function getFull6ModuleEventsOverview(env) {
  await ensureEventsSchedulingBatch2Schema(env.DB);
  const [base, admitRows, keyRows, resRows] = await Promise.all([
    getEventsSchedulingBatch1Overview(env),
    env.DB.prepare(`SELECT release_status FROM evt_admit_card_releases WHERE release_status != 'archived'`).all(),
    env.DB.prepare(`SELECT status FROM evt_answer_key_challenges WHERE status != 'archived'`).all(),
    env.DB.prepare(`SELECT status FROM evt_results_dv_rosters WHERE status != 'archived'`).all()
  ]);

  const admits = admitRows.results || [];
  const keys = keyRows.results || [];
  const results = resRows.results || [];

  const live_admit_card_portals = admits.filter(r => r.release_status === 'live_download').length;
  const open_answer_key_challenges = keys.filter(r => r.status === 'open_for_challenge').length;
  const published_results_dv_rosters = results.filter(r => r.status === 'published_live' || r.status === 'dv_ongoing').length;
  const active_dv_ongoing_count = results.filter(r => r.status === 'dv_ongoing').length;

  return {
    ...base,
    live_admit_card_portals,
    total_admit_card_releases: admits.length,
    open_answer_key_challenges,
    total_answer_key_timelines: keys.length,
    published_results_dv_rosters,
    active_dv_ongoing_count,
    total_results_dv_rosters: results.length,
    modules: {
      ...base.modules,
      '04': { code: '04', id: 'module-es-004', title: 'Admit Card, Hall Ticket & Center Allotment Alerts', status: 'active', count: admits.length },
      '05': { code: '05', id: 'module-es-005', title: 'Answer Key Challenges & Provisional Key Timelines', status: 'active', count: keys.length },
      '06': { code: '06', id: 'module-es-006', title: 'Result Declarations & Document Verification (DV) Rosters', status: 'active', count: results.length }
    }
  };
}

/* ================= MODULE 04: ADMIT CARDS & CENTER ALLOTMENT ================= */
async function handleAdmitCards(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const bodyFilter = sanitizeEvtText(url.searchParams.get('commission_body') || '', 40);
    const stageFilter = sanitizeEvtText(url.searchParams.get('release_stage') || '', 40);
    const statusFilter = sanitizeEvtText(url.searchParams.get('release_status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (bodyFilter) { where.push(`commission_body = ?`); args.push(bodyFilter); }
    if (stageFilter) { where.push(`release_stage = ?`); args.push(stageFilter); }
    if (statusFilter) { where.push(`release_status = ?`); args.push(statusFilter); }
    else { where.push(`release_status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(exam_name_en LIKE ? ESCAPE '\\' OR exam_name_or LIKE ? ESCAPE '\\' OR advt_number LIKE ? ESCAPE '\\' OR release_code LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like);
    }
    const sql = `SELECT * FROM evt_admit_card_releases ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY released_at_ist DESC, updated_at DESC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    return json({ items: (results || []).map(enrichAdmitRow), timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const release_code = sanitizeEvtText(b.release_code || `HAL-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const commission_body = pick(b.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, 'OPSC');
    const exam_name_en = sanitizeEvtText(b.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number, 100);
    const release_stage = pick(b.release_stage, EVT_RELEASE_STAGES, 'release_stage', errors, 'admit_card_live');
    const released_at_ist = normalizeIstTimestamp(b.released_at_ist || nowIstIso(), '10:00:00');
    const exam_date_ist = normalizeIstDate(b.exam_date_ist);
    const allotted_districts_json = parseDistrictsJson(b.allotted_districts || b.allotted_districts_json);
    const download_portal_url = sanitizeOptionalUrl(b.download_portal_url);
    const login_credentials_required = sanitizeEvtText(b.login_credentials_required || 'PPSAN / User ID + DOB', 160);
    const release_status = pick(b.release_status, EVT_RELEASE_STATUSES, 'release_status', errors, 'live_download');

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (!exam_date_ist) errors.exam_date_ist = 'exam_date_ist must be a valid YYYY-MM-DD date';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-hal');
    await db.prepare(
      `INSERT INTO evt_admit_card_releases
       (id, release_code, commission_body, exam_name_en, exam_name_or, advt_number, release_stage, released_at_ist, exam_date_ist, allotted_districts_json, download_portal_url, login_credentials_required, release_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      newId, release_code, commission_body, exam_name_en, exam_name_or, advt_number,
      release_stage, released_at_ist, exam_date_ist, allotted_districts_json,
      download_portal_url, login_credentials_required, release_status
    ).run();

    await snapshotEvtRevision(db, '04', newId, actor, 'create');
    await audit(env, request, actor, 'events.admit_cards.create', 'evt_admit_card_releases', newId, { release_code, release_stage });
    const row = await db.prepare(`SELECT * FROM evt_admit_card_releases WHERE id = ?`).bind(newId).first();
    return json({ item: enrichAdmitRow(row) }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_admit_card_releases WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admit card release not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const commission_body = pick(b.commission_body ?? existing.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, existing.commission_body);
    const exam_name_en = sanitizeEvtText(b.exam_name_en ?? existing.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or ?? existing.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number ?? existing.advt_number, 100);
    const release_stage = pick(b.release_stage ?? existing.release_stage, EVT_RELEASE_STAGES, 'release_stage', errors, existing.release_stage);
    const released_at_ist = normalizeIstTimestamp(b.released_at_ist ?? existing.released_at_ist, '10:00:00');
    const exam_date_ist = normalizeIstDate(b.exam_date_ist ?? existing.exam_date_ist);
    const allotted_districts_json = (b.allotted_districts !== undefined || b.allotted_districts_json !== undefined)
      ? parseDistrictsJson(b.allotted_districts ?? b.allotted_districts_json)
      : existing.allotted_districts_json;
    const download_portal_url = b.download_portal_url !== undefined ? sanitizeOptionalUrl(b.download_portal_url) : existing.download_portal_url;
    const login_credentials_required = sanitizeEvtText(b.login_credentials_required ?? existing.login_credentials_required, 160);
    const release_status = pick(b.release_status ?? existing.release_status, EVT_RELEASE_STATUSES, 'release_status', errors, existing.release_status);

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (!exam_date_ist) errors.exam_date_ist = 'exam_date_ist must be valid';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_admit_card_releases
       SET commission_body=?, exam_name_en=?, exam_name_or=?, advt_number=?, release_stage=?, released_at_ist=?, exam_date_ist=?, allotted_districts_json=?, download_portal_url=?, login_credentials_required=?, release_status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(
      commission_body, exam_name_en, exam_name_or, advt_number, release_stage,
      released_at_ist, exam_date_ist, allotted_districts_json, download_portal_url,
      login_credentials_required, release_status, id
    ).run();

    await snapshotEvtRevision(db, '04', id, actor, 'update');
    await audit(env, request, actor, 'events.admit_cards.update', 'evt_admit_card_releases', id, { release_status });
    const row = await db.prepare(`SELECT * FROM evt_admit_card_releases WHERE id = ?`).bind(id).first();
    return json({ item: enrichAdmitRow(row) });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_admit_card_releases WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admit card release not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const release_status = pick(b.release_status || b.status, EVT_RELEASE_STATUSES, 'release_status', errors, null);
    if (!release_status) errors.release_status = 'release_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE evt_admit_card_releases SET release_status=?, updated_at=datetime('now') WHERE id=?`).bind(release_status, id).run();
    await snapshotEvtRevision(db, '04', id, actor, `status:${release_status}`);
    await audit(env, request, actor, 'events.admit_cards.status', 'evt_admit_card_releases', id, { release_status });
    const row = await db.prepare(`SELECT * FROM evt_admit_card_releases WHERE id = ?`).bind(id).first();
    return json({ item: enrichAdmitRow(row) });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_admit_card_releases WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admit card release not found');
    await db.prepare(`UPDATE evt_admit_card_releases SET release_status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '04', id, actor, 'archive');
    await audit(env, request, actor, 'events.admit_cards.archive', 'evt_admit_card_releases', id, {});
    return json({ ok: true, id, release_status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown admit-cards route');
}

/* ================= MODULE 05: ANSWER KEY CHALLENGES & PROVISIONAL KEY TIMELINES ================= */
async function handleAnswerKeys(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const bodyFilter = sanitizeEvtText(url.searchParams.get('commission_body') || '', 40);
    const statusFilter = sanitizeEvtText(url.searchParams.get('status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (bodyFilter) { where.push(`commission_body = ?`); args.push(bodyFilter); }
    if (statusFilter) { where.push(`status = ?`); args.push(statusFilter); }
    else { where.push(`status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(exam_name_en LIKE ? ESCAPE '\\' OR exam_name_or LIKE ? ESCAPE '\\' OR advt_number LIKE ? ESCAPE '\\' OR key_code LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like);
    }
    const sql = `SELECT * FROM evt_answer_key_challenges ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY objection_deadline_ist DESC, updated_at DESC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    const nowMs = Date.now();
    return json({ items: (results || []).map(r => enrichAnswerKeyRow(r, nowMs)), timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const key_code = sanitizeEvtText(b.key_code || `ANS-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const commission_body = pick(b.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, 'OSSC');
    const exam_name_en = sanitizeEvtText(b.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number, 100);
    const key_stage = pick(b.key_stage, EVT_KEY_STAGES, 'key_stage', errors, 'provisional_key_open');
    const provisional_released_at_ist = normalizeIstTimestamp(b.provisional_released_at_ist || nowIstIso(), '10:00:00');
    const objection_deadline_ist = normalizeIstTimestamp(b.objection_deadline_ist, '23:59:00');
    const fee_per_question_paise = Math.max(0, Math.min(1000000, parseInt(b.fee_per_question_paise ?? 0, 10) || 0));
    const is_fee_refundable_if_accepted = b.is_fee_refundable_if_accepted === false || b.is_fee_refundable_if_accepted === 0 ? 0 : 1;
    const answer_key_pdf_url = sanitizeOptionalUrl(b.answer_key_pdf_url);
    const objection_portal_url = sanitizeOptionalUrl(b.objection_portal_url);
    const total_sets_covered = sanitizeEvtText(b.total_sets_covered || 'Sets A, B, C, D', 100);
    const status = pick(b.status, EVT_KEY_STATUSES, 'status', errors, 'open_for_challenge');

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (!objection_deadline_ist) errors.objection_deadline_ist = 'objection_deadline_ist must be a valid IST date/timestamp';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-ans');
    await db.prepare(
      `INSERT INTO evt_answer_key_challenges
       (id, key_code, commission_body, exam_name_en, exam_name_or, advt_number, key_stage, provisional_released_at_ist, objection_deadline_ist, fee_per_question_paise, is_fee_refundable_if_accepted, answer_key_pdf_url, objection_portal_url, total_sets_covered, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      newId, key_code, commission_body, exam_name_en, exam_name_or, advt_number,
      key_stage, provisional_released_at_ist, objection_deadline_ist,
      fee_per_question_paise, is_fee_refundable_if_accepted,
      answer_key_pdf_url, objection_portal_url, total_sets_covered, status
    ).run();

    await snapshotEvtRevision(db, '05', newId, actor, 'create');
    await audit(env, request, actor, 'events.answer_keys.create', 'evt_answer_key_challenges', newId, { key_code, fee_per_question_paise });
    const row = await db.prepare(`SELECT * FROM evt_answer_key_challenges WHERE id = ?`).bind(newId).first();
    return json({ item: enrichAnswerKeyRow(row) }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_answer_key_challenges WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Answer key timeline not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const commission_body = pick(b.commission_body ?? existing.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, existing.commission_body);
    const exam_name_en = sanitizeEvtText(b.exam_name_en ?? existing.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or ?? existing.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number ?? existing.advt_number, 100);
    const key_stage = pick(b.key_stage ?? existing.key_stage, EVT_KEY_STAGES, 'key_stage', errors, existing.key_stage);
    const provisional_released_at_ist = normalizeIstTimestamp(b.provisional_released_at_ist ?? existing.provisional_released_at_ist, '10:00:00');
    const objection_deadline_ist = normalizeIstTimestamp(b.objection_deadline_ist ?? existing.objection_deadline_ist, '23:59:00');
    const fee_per_question_paise = b.fee_per_question_paise !== undefined
      ? Math.max(0, Math.min(1000000, parseInt(b.fee_per_question_paise, 10) || 0))
      : existing.fee_per_question_paise;
    const is_fee_refundable_if_accepted = b.is_fee_refundable_if_accepted !== undefined
      ? (b.is_fee_refundable_if_accepted ? 1 : 0)
      : existing.is_fee_refundable_if_accepted;
    const answer_key_pdf_url = b.answer_key_pdf_url !== undefined ? sanitizeOptionalUrl(b.answer_key_pdf_url) : existing.answer_key_pdf_url;
    const objection_portal_url = b.objection_portal_url !== undefined ? sanitizeOptionalUrl(b.objection_portal_url) : existing.objection_portal_url;
    const total_sets_covered = sanitizeEvtText(b.total_sets_covered ?? existing.total_sets_covered, 100);
    const status = pick(b.status ?? existing.status, EVT_KEY_STATUSES, 'status', errors, existing.status);

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (!objection_deadline_ist) errors.objection_deadline_ist = 'objection_deadline_ist must be valid';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_answer_key_challenges
       SET commission_body=?, exam_name_en=?, exam_name_or=?, advt_number=?, key_stage=?, provisional_released_at_ist=?, objection_deadline_ist=?, fee_per_question_paise=?, is_fee_refundable_if_accepted=?, answer_key_pdf_url=?, objection_portal_url=?, total_sets_covered=?, status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(
      commission_body, exam_name_en, exam_name_or, advt_number, key_stage,
      provisional_released_at_ist, objection_deadline_ist, fee_per_question_paise,
      is_fee_refundable_if_accepted, answer_key_pdf_url, objection_portal_url,
      total_sets_covered, status, id
    ).run();

    await snapshotEvtRevision(db, '05', id, actor, 'update');
    await audit(env, request, actor, 'events.answer_keys.update', 'evt_answer_key_challenges', id, { status });
    const row = await db.prepare(`SELECT * FROM evt_answer_key_challenges WHERE id = ?`).bind(id).first();
    return json({ item: enrichAnswerKeyRow(row) });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_answer_key_challenges WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Answer key timeline not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const status = pick(b.status, EVT_KEY_STATUSES, 'status', errors, null);
    if (!status) errors.status = 'status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE evt_answer_key_challenges SET status=?, updated_at=datetime('now') WHERE id=?`).bind(status, id).run();
    await snapshotEvtRevision(db, '05', id, actor, `status:${status}`);
    await audit(env, request, actor, 'events.answer_keys.status', 'evt_answer_key_challenges', id, { status });
    const row = await db.prepare(`SELECT * FROM evt_answer_key_challenges WHERE id = ?`).bind(id).first();
    return json({ item: enrichAnswerKeyRow(row) });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_answer_key_challenges WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Answer key timeline not found');
    await db.prepare(`UPDATE evt_answer_key_challenges SET status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '05', id, actor, 'archive');
    await audit(env, request, actor, 'events.answer_keys.archive', 'evt_answer_key_challenges', id, {});
    return json({ ok: true, id, status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown answer-keys route');
}

/* ================= MODULE 06: RESULT DECLARATIONS & DV ROSTERS ================= */
async function handleResultsDv(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const bodyFilter = sanitizeEvtText(url.searchParams.get('commission_body') || '', 40);
    const typeFilter = sanitizeEvtText(url.searchParams.get('declaration_type') || '', 40);
    const statusFilter = sanitizeEvtText(url.searchParams.get('status') || '', 40);
    const q = sanitizeEvtText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (bodyFilter) { where.push(`commission_body = ?`); args.push(bodyFilter); }
    if (typeFilter) { where.push(`declaration_type = ?`); args.push(typeFilter); }
    if (statusFilter) { where.push(`status = ?`); args.push(statusFilter); }
    else { where.push(`status != 'archived'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(exam_name_en LIKE ? ESCAPE '\\' OR exam_name_or LIKE ? ESCAPE '\\' OR advt_number LIKE ? ESCAPE '\\' OR roster_code LIKE ? ESCAPE '\\' OR dv_venue_odisha LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like, like);
    }
    const sql = `SELECT * FROM evt_results_dv_rosters ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY declared_at_ist DESC, updated_at DESC`;
    const { results } = await db.prepare(sql).bind(...args).all();
    return json({ items: results || [], timezone: 'Asia/Kolkata' });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 64000);
    const errors = {};
    const roster_code = sanitizeEvtText(b.roster_code || `RES-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const commission_body = pick(b.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, 'OSSC');
    const exam_name_en = sanitizeEvtText(b.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number, 100);
    const declaration_type = pick(b.declaration_type, EVT_DECLARATION_TYPES, 'declaration_type', errors, 'prelims_shortlist');
    const declared_at_ist = normalizeIstTimestamp(b.declared_at_ist || nowIstIso(), '18:00:00');
    const dv_start_date_ist = b.dv_start_date_ist ? normalizeIstDate(b.dv_start_date_ist) : '';
    const dv_end_date_ist = b.dv_end_date_ist ? normalizeIstDate(b.dv_end_date_ist) : dv_start_date_ist;
    const dv_venue_odisha = sanitizeEvtText(b.dv_venue_odisha, 240);
    const shortlisted_candidates_count = Math.max(0, Math.min(500000, parseInt(b.shortlisted_candidates_count ?? 0, 10) || 0));
    const roll_range_summary = sanitizeEvtText(b.roll_range_summary, 200);
    const cutoff_summary_en = sanitizeEvtText(b.cutoff_summary_en, 320);
    const cutoff_summary_or = sanitizeEvtText(b.cutoff_summary_or, 320);
    const result_pdf_url = sanitizeOptionalUrl(b.result_pdf_url);
    const status = pick(b.status, EVT_RESULT_STATUSES, 'status', errors, 'published_live');

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('evt-res');
    await db.prepare(
      `INSERT INTO evt_results_dv_rosters
       (id, roster_code, commission_body, exam_name_en, exam_name_or, advt_number, declaration_type, declared_at_ist, dv_start_date_ist, dv_end_date_ist, dv_venue_odisha, shortlisted_candidates_count, roll_range_summary, cutoff_summary_en, cutoff_summary_or, result_pdf_url, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      newId, roster_code, commission_body, exam_name_en, exam_name_or, advt_number,
      declaration_type, declared_at_ist, dv_start_date_ist, dv_end_date_ist,
      dv_venue_odisha, shortlisted_candidates_count, roll_range_summary,
      cutoff_summary_en, cutoff_summary_or, result_pdf_url, status
    ).run();

    await snapshotEvtRevision(db, '06', newId, actor, 'create');
    await audit(env, request, actor, 'events.results_dv.create', 'evt_results_dv_rosters', newId, { roster_code, declaration_type });
    const item = await db.prepare(`SELECT * FROM evt_results_dv_rosters WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_results_dv_rosters WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Result/DV roster not found');
    const b = await readJson(request, 64000);
    const errors = {};
    const commission_body = pick(b.commission_body ?? existing.commission_body, EVT_COMMISSION_BODIES, 'commission_body', errors, existing.commission_body);
    const exam_name_en = sanitizeEvtText(b.exam_name_en ?? existing.exam_name_en, 240);
    const exam_name_or = sanitizeEvtText(b.exam_name_or ?? existing.exam_name_or, 240);
    const advt_number = sanitizeEvtText(b.advt_number ?? existing.advt_number, 100);
    const declaration_type = pick(b.declaration_type ?? existing.declaration_type, EVT_DECLARATION_TYPES, 'declaration_type', errors, existing.declaration_type);
    const declared_at_ist = normalizeIstTimestamp(b.declared_at_ist ?? existing.declared_at_ist, '18:00:00');
    const dv_start_date_ist = b.dv_start_date_ist !== undefined ? (b.dv_start_date_ist ? normalizeIstDate(b.dv_start_date_ist) : '') : existing.dv_start_date_ist;
    const dv_end_date_ist = b.dv_end_date_ist !== undefined ? (b.dv_end_date_ist ? normalizeIstDate(b.dv_end_date_ist) : '') : existing.dv_end_date_ist;
    const dv_venue_odisha = sanitizeEvtText(b.dv_venue_odisha ?? existing.dv_venue_odisha, 240);
    const shortlisted_candidates_count = b.shortlisted_candidates_count !== undefined
      ? Math.max(0, Math.min(500000, parseInt(b.shortlisted_candidates_count, 10) || 0))
      : existing.shortlisted_candidates_count;
    const roll_range_summary = sanitizeEvtText(b.roll_range_summary ?? existing.roll_range_summary, 200);
    const cutoff_summary_en = sanitizeEvtText(b.cutoff_summary_en ?? existing.cutoff_summary_en, 320);
    const cutoff_summary_or = sanitizeEvtText(b.cutoff_summary_or ?? existing.cutoff_summary_or, 320);
    const result_pdf_url = b.result_pdf_url !== undefined ? sanitizeOptionalUrl(b.result_pdf_url) : existing.result_pdf_url;
    const status = pick(b.status ?? existing.status, EVT_RESULT_STATUSES, 'status', errors, existing.status);

    if (!exam_name_en) errors.exam_name_en = 'exam_name_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE evt_results_dv_rosters
       SET commission_body=?, exam_name_en=?, exam_name_or=?, advt_number=?, declaration_type=?, declared_at_ist=?, dv_start_date_ist=?, dv_end_date_ist=?, dv_venue_odisha=?, shortlisted_candidates_count=?, roll_range_summary=?, cutoff_summary_en=?, cutoff_summary_or=?, result_pdf_url=?, status=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(
      commission_body, exam_name_en, exam_name_or, advt_number, declaration_type,
      declared_at_ist, dv_start_date_ist, dv_end_date_ist, dv_venue_odisha,
      shortlisted_candidates_count, roll_range_summary, cutoff_summary_en,
      cutoff_summary_or, result_pdf_url, status, id
    ).run();

    await snapshotEvtRevision(db, '06', id, actor, 'update');
    await audit(env, request, actor, 'events.results_dv.update', 'evt_results_dv_rosters', id, { status });
    const item = await db.prepare(`SELECT * FROM evt_results_dv_rosters WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM evt_results_dv_rosters WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Result/DV roster not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const status = pick(b.status, EVT_RESULT_STATUSES, 'status', errors, null);
    if (!status) errors.status = 'status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE evt_results_dv_rosters SET status=?, updated_at=datetime('now') WHERE id=?`).bind(status, id).run();
    await snapshotEvtRevision(db, '06', id, actor, `status:${status}`);
    await audit(env, request, actor, 'events.results_dv.status', 'evt_results_dv_rosters', id, { status });
    const item = await db.prepare(`SELECT * FROM evt_results_dv_rosters WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM evt_results_dv_rosters WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Result/DV roster not found');
    await db.prepare(`UPDATE evt_results_dv_rosters SET status='archived', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotEvtRevision(db, '06', id, actor, 'archive');
    await audit(env, request, actor, 'events.results_dv.archive', 'evt_results_dv_rosters', id, {});
    return json({ ok: true, id, status: 'archived' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown results-dv route');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleEventsSchedulingBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureEventsSchedulingBatch2Schema(env.DB);
  if (id === 'admit-cards') return handleAdmitCards(request, env, actor, sub, extra);
  if (id === 'answer-keys') return handleAnswerKeys(request, env, actor, sub, extra);
  if (id === 'results-dv') return handleResultsDv(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown events batch 2 admin route');
}

/* ================= PUBLIC ENRICHED UPCOMING EVENTS API ================= */
export async function handlePublicEventsUpcomingBatch2Api(request, env) {
  await ensureEventsSchedulingBatch2Schema(env.DB);
  const baseRes = await handlePublicEventsUpcomingApi(request, env);
  const baseData = await baseRes.json();
  const nowMs = Date.now();

  const [admitRes, keyRes, resRes] = await Promise.all([
    env.DB.prepare(
      `SELECT id, release_code, commission_body, exam_name_en, exam_name_or, advt_number, release_stage, released_at_ist, exam_date_ist, allotted_districts_json, download_portal_url, login_credentials_required, release_status
       FROM evt_admit_card_releases
       WHERE release_status IN ('live_download', 'scheduled_soon')
       ORDER BY released_at_ist DESC LIMIT 20`
    ).all(),
    env.DB.prepare(
      `SELECT id, key_code, commission_body, exam_name_en, exam_name_or, advt_number, key_stage, provisional_released_at_ist, objection_deadline_ist, fee_per_question_paise, is_fee_refundable_if_accepted, answer_key_pdf_url, objection_portal_url, total_sets_covered, status
       FROM evt_answer_key_challenges
       WHERE status IN ('open_for_challenge', 'under_expert_review', 'final_published')
       ORDER BY objection_deadline_ist DESC LIMIT 20`
    ).all(),
    env.DB.prepare(
      `SELECT id, roster_code, commission_body, exam_name_en, exam_name_or, advt_number, declaration_type, declared_at_ist, dv_start_date_ist, dv_end_date_ist, dv_venue_odisha, shortlisted_candidates_count, roll_range_summary, cutoff_summary_en, cutoff_summary_or, result_pdf_url, status
       FROM evt_results_dv_rosters
       WHERE status IN ('published_live', 'dv_ongoing')
       ORDER BY declared_at_ist DESC LIMIT 20`
    ).all()
  ]);

  return json({
    ...baseData,
    admit_cards: (admitRes.results || []).map(enrichAdmitRow),
    answer_keys: (keyRes.results || []).map(r => enrichAnswerKeyRow(r, nowMs)),
    results_dv: resRes.results || []
  }, 200, {
    'Cache-Control': 'public, max-age=120, s-maxage=300',
    'X-CSO-Timezone': 'Asia/Kolkata'
  });
}
