import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  computeDeadlineUrgency,
  ensureEventsSchedulingBatch1Schema,
  handleEventsSchedulingBatch1Admin as H,
  handlePublicEventsUpcomingApi,
  normalizeIstDate,
  normalizeIstTimestamp
} from '../functions/_lib/events-scheduling-batch1.js';
import { requireRole, verifyCsrf, STAFF_ROLES } from '../functions/_lib/rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
  `);
  return {
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const env = { DB: createMockDb() };
const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/events';
const call = (method, path, id, sub, extra, body) => H(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/exam-calendar`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/exam-calendar`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/deadlines`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. IST Normalization & Countdown Urgency Unit Checks
assert.equal(normalizeIstDate('2026-12-13T18:45:00Z'), '2026-12-14');
assert.equal(normalizeIstTimestamp('2026-11-30'), '2026-11-30T23:59:00+05:30');
assert.equal(normalizeIstTimestamp('2026-11-30T18:30:00Z'), '2026-12-01T00:00:00+05:30');

const nowMs = Date.parse('2026-11-17T12:00:00+05:30');
const u24 = computeDeadlineUrgency('2026-11-18T00:00:00+05:30', 'open_normal', nowMs);
assert.equal(u24.remaining_hours, 12);
assert.equal(u24.urgency_badge, 'final_24h');
const u72 = computeDeadlineUrgency('2026-11-19T12:00:00+05:30', 'open_normal', nowMs);
assert.equal(u72.remaining_hours, 48);
assert.equal(u72.urgency_badge, 'closing_72h');
const uExp = computeDeadlineUrgency('2026-11-17T10:00:00+05:30', 'open_normal', nowMs);
assert.equal(uExp.is_expired, true);
assert.equal(uExp.urgency_badge, 'closed');

// 3. Idempotent schema & starter seeds
await ensureEventsSchedulingBatch1Schema(env.DB);
await ensureEventsSchedulingBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('evt_exam_calendar'), 4);
assert.equal(await cnt('evt_admission_milestones'), 3);
assert.equal(await cnt('evt_deadline_countdowns'), 4);

const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.timezone, 'Asia/Kolkata');
assert.equal(ov.confirmed_exam_dates, 3);
assert.equal(ov.active_admission_milestones, 2);
assert.equal(ov.open_application_countdowns, 4);
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['02'].status, 'active');
assert.equal(ov.modules['03'].status, 'active');
assert.equal(ov.modules['04'].status, 'queued');
assert.equal(ov.modules['09'].status, 'queued');

// 4. Module 01: Competitive Exam Calendar CRUD, sanitization & rollback
const exNew = (await jcall('POST', 'exam-calendar', 'exam-calendar', undefined, undefined, {
  event_code: 'EXM-2026-0099',
  commission_body: 'OSSC',
  exam_name_en: '<script>alert(1)</script>OSSC Technical Services Preliminary Exam',
  exam_name_or: 'OSSC ବୈଷୟିକ ସେବା ପରୀକ୍ଷା',
  advt_number: 'Advt. No. 5001/OSSC',
  exam_stage: 'prelims',
  exam_date_start: '2027-02-07',
  exam_date_end: '2027-02-07',
  shift_timing_ist: '10:00 AM – 12:30 PM IST',
  official_notice_url: 'https://www.ossc.gov.in/notice',
  district_scope: 'major_centers',
  schedule_status: 'confirmed',
  is_featured: true
})).item;
assert.equal(exNew.exam_name_en, 'OSSC Technical Services Preliminary Exam');
await jcall('PUT', `exam-calendar/${exNew.id}`, 'exam-calendar', exNew.id, undefined, {
  exam_name_en: 'OSSC Technical Services Prelims (Updated)',
  schedule_status: 'postponed'
});
await jcall('PATCH', `exam-calendar/${exNew.id}/status`, 'exam-calendar', exNew.id, 'status', { schedule_status: 'confirmed' });
const revs01 = await jcall('GET', `revisions?module_code=01&entity_id=${exNew.id}`, 'revisions');
assert.ok(revs01.items.length >= 3);
const firstRev01 = revs01.items[revs01.items.length - 1];
const rb01 = await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: firstRev01.id });
assert.equal(rb01.restored.exam_name_en, 'OSSC Technical Services Preliminary Exam');

// 5. Module 02: Entrance & Admission Milestones CRUD & rollback
const admNew = (await jcall('POST', 'admissions', 'admissions', undefined, undefined, {
  milestone_code: 'ADM-2026-0099',
  portal_authority: 'OJEE',
  program_stream: 'ojee_technical',
  title_en: '<script>bad()</script>OJEE B.Tech Counselling Round-1 Choice Locking',
  title_or: 'OJEE B.Tech କାଉନସେଲିଂ ରାଉଣ୍ଡ-୧',
  milestone_phase: 'slide_freeze_float',
  starts_at_ist: '2026-12-01T10:00:00+05:30',
  ends_at_ist: '2026-12-08T23:59:00+05:30',
  official_portal_url: 'https://ojee.nic.in',
  status: 'upcoming'
})).item;
assert.equal(admNew.title_en, 'OJEE B.Tech Counselling Round-1 Choice Locking');
await jcall('PATCH', `admissions/${admNew.id}/status`, 'admissions', admNew.id, 'status', { status: 'active_live' });
const filteredAdm = await jcall('GET', 'admissions?portal_authority=OJEE', 'admissions');
assert.equal(filteredAdm.items.length, 1);

// 6. Module 03: Deadlines & Countdown Engine (IST remaining_hours, ticker pin, soft-archive)
const in12hIst = normalizeIstTimestamp(new Date(Date.now() + 12 * 3600000).toISOString());
const ddlNew = (await jcall('POST', 'deadlines', 'deadlines', undefined, undefined, {
  deadline_code: 'DDL-2026-0099',
  commission_body: 'OPSC',
  post_title_en: '<script>x</script>OPSC Assistant Executive Engineer (Civil)',
  advt_number: 'Advt. 11/2026',
  total_vacancies: 120,
  registration_opens_ist: '2026-11-01T10:00:00+05:30',
  registration_closes_ist: in12hIst,
  apply_portal_url: 'https://www.opsc.gov.in',
  is_pinned_ticker: true,
  status: 'active_live'
})).item;
assert.equal(ddlNew.post_title_en, 'OPSC Assistant Executive Engineer (Civil)');
assert.equal(ddlNew.urgency_badge, 'final_24h');
assert.ok(ddlNew.remaining_hours > 10 && ddlNew.remaining_hours <= 12.5);

await jcall('PATCH', `deadlines/${ddlNew.id}/status`, 'deadlines', ddlNew.id, 'status', { is_pinned_ticker: 0 });
const ddlList = await jcall('GET', 'deadlines?urgency_badge=final_24h', 'deadlines');
assert.ok(ddlList.items.some(d => d.id === ddlNew.id && d.is_pinned_ticker === 0));

// Soft-archive test on Module 01 & 03
await jcall('DELETE', `exam-calendar/${exNew.id}`, 'exam-calendar', exNew.id);
await jcall('DELETE', `deadlines/${ddlNew.id}`, 'deadlines', ddlNew.id);
const exListAfter = await jcall('GET', 'exam-calendar', 'exam-calendar');
assert.ok(!exListAfter.items.some(e => e.id === exNew.id));

// 7. Public edge-cached GET /api/events/upcoming
const pubRes = await handlePublicEventsUpcomingApi(new Request('https://csodisha.com/api/events/upcoming'), env);
assert.equal(pubRes.status, 200);
assert.equal(pubRes.headers.get('X-CSO-Timezone'), 'Asia/Kolkata');
const pubJson = await pubRes.json();
assert.equal(pubJson.timezone, 'Asia/Kolkata');
assert.ok(Array.isArray(pubJson.upcoming_exams) && pubJson.upcoming_exams.length >= 4);
assert.ok(Array.isArray(pubJson.admission_milestones) && pubJson.admission_milestones.length >= 3);
assert.ok(Array.isArray(pubJson.active_deadlines) && pubJson.active_deadlines.length >= 4);
assert.ok(pubJson.active_deadlines.every(d => typeof d.remaining_hours === 'number' && d.remaining_hours > 0));

console.log('ALL EVENTS & SCHEDULING BATCH 1 TESTS PASSED');
