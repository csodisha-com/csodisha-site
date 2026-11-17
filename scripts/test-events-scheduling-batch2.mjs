import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  handleEventsSchedulingBatch1Admin as H1,
  normalizeIstTimestamp
} from '../functions/_lib/events-scheduling-batch1.js';
import {
  computeObjectionRemainingHours,
  ensureEventsSchedulingBatch2Schema,
  formatInrFromPaise,
  getFull6ModuleEventsOverview,
  handleEventsSchedulingBatch2Admin as H2,
  handlePublicEventsUpcomingBatch2Api
} from '../functions/_lib/events-scheduling-batch2.js';
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
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall2 = async (...a) => (await call2(...a)).json();
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/admit-cards`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/answer-keys`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/results-dv`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. INR Paise Formatting & IST Objection Remaining Hours
assert.equal(formatInrFromPaise(20000), '₹200.00');
assert.equal(formatInrFromPaise(150000), '₹1,500.00');
assert.equal(formatInrFromPaise(0), '₹0.00');

const nowMs = Date.parse('2026-11-17T12:00:00+05:30');
assert.equal(computeObjectionRemainingHours('2026-11-18T12:00:00+05:30', nowMs), 24);
assert.equal(computeObjectionRemainingHours('2026-11-17T10:00:00+05:30', nowMs), 0);

// 3. Idempotent schema, starter seeds & 6-module overview
await ensureEventsSchedulingBatch2Schema(env.DB);
await ensureEventsSchedulingBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('evt_admit_card_releases'), 3);
assert.equal(await cnt('evt_answer_key_challenges'), 3);
assert.equal(await cnt('evt_results_dv_rosters'), 2);

const ov = await getFull6ModuleEventsOverview(env);
assert.equal(ov.live_admit_card_portals, 2);
assert.equal(ov.open_answer_key_challenges, 2);
assert.equal(ov.published_results_dv_rosters, 2);
assert.equal(ov.active_dv_ongoing_count, 1);
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.modules['05'].status, 'active');
assert.equal(ov.modules['06'].status, 'active');
assert.equal(ov.modules['07'].status, 'queued');

// 4. Module 04: Admit Cards CRUD, sanitization & rollback
const halNew = (await jcall2('POST', 'admit-cards', 'admit-cards', undefined, undefined, {
  release_code: 'HAL-2026-0099',
  commission_body: 'OSSC',
  exam_name_en: '<script>x</script>OSSC Vital Statistics Assistant Hall Ticket',
  exam_name_or: 'OSSC ହଲ୍ ଟିକେଟ୍',
  release_stage: 'admit_card_live',
  released_at_ist: '2026-11-18T10:00:00+05:30',
  exam_date_ist: '2026-12-06',
  allotted_districts: ['Bhubaneswar', 'Cuttack', 'Puri'],
  download_portal_url: 'https://www.ossc.gov.in',
  release_status: 'live_download'
})).item;
assert.equal(halNew.exam_name_en, 'OSSC Vital Statistics Assistant Hall Ticket');
assert.deepEqual(halNew.allotted_districts, ['Bhubaneswar', 'Cuttack', 'Puri']);
await jcall2('PUT', `admit-cards/${halNew.id}`, 'admit-cards', halNew.id, undefined, {
  exam_name_en: 'OSSC Vital Statistics Assistant Hall Ticket (Revised)'
});
await jcall2('PATCH', `admit-cards/${halNew.id}/status`, 'admit-cards', halNew.id, 'status', { release_status: 'closed' });
const revs04 = await jcall1('GET', `revisions?module_code=04&entity_id=${halNew.id}`, 'revisions');
assert.ok(revs04.items.length >= 3);
const rb04 = await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, {
  revision_id: revs04.items[revs04.items.length - 1].id
});
assert.equal(rb04.restored.exam_name_en, 'OSSC Vital Statistics Assistant Hall Ticket');

// 5. Module 05: Answer Key Challenges (INR paise + IST remaining hours + rollback)
const in30h = normalizeIstTimestamp(new Date(Date.now() + 30 * 3600000).toISOString());
const keyNew = (await jcall2('POST', 'answer-keys', 'answer-keys', undefined, undefined, {
  key_code: 'ANS-2026-0099',
  commission_body: 'NTA_UGC_NET',
  exam_name_en: '<script>bad</script>NTA UGC NET Paper-I Provisional Key',
  key_stage: 'provisional_key_open',
  objection_deadline_ist: in30h,
  fee_per_question_paise: 150000,
  is_fee_refundable_if_accepted: true,
  status: 'open_for_challenge'
})).item;
assert.equal(keyNew.exam_name_en, 'NTA UGC NET Paper-I Provisional Key');
assert.equal(keyNew.fee_display_inr, '₹1,500.00');
assert.ok(keyNew.objection_remaining_hours > 28 && keyNew.objection_remaining_hours <= 30.5);
await jcall2('PATCH', `answer-keys/${keyNew.id}/status`, 'answer-keys', keyNew.id, 'status', { status: 'under_expert_review' });

// 6. Module 06: Result Declarations & Privacy-Safe DV Rosters
const resNew = (await jcall2('POST', 'results-dv', 'results-dv', undefined, undefined, {
  roster_code: 'RES-2026-0099',
  commission_body: 'OSSSC',
  exam_name_en: '<script>z</script>OSSSC Livestock Inspector DV Roster',
  declaration_type: 'dv_biometric_schedule',
  dv_start_date_ist: '2026-12-01',
  dv_end_date_ist: '2026-12-07',
  dv_venue_odisha: 'District Collectorate Conference Hall, Cuttack',
  shortlisted_candidates_count: 640,
  roll_range_summary: 'Roll 510001 – 518900 (District-wise Roster)',
  cutoff_summary_en: 'UR: 92.50 | SEBC: 88.00',
  status: 'dv_ongoing'
})).item;
assert.equal(resNew.exam_name_en, 'OSSSC Livestock Inspector DV Roster');
assert.equal(resNew.shortlisted_candidates_count, 640);

// Soft-archive test
await jcall2('DELETE', `admit-cards/${halNew.id}`, 'admit-cards', halNew.id);
await jcall2('DELETE', `answer-keys/${keyNew.id}`, 'answer-keys', keyNew.id);
await jcall2('DELETE', `results-dv/${resNew.id}`, 'results-dv', resNew.id);

// 7. Public Enriched GET /api/events/upcoming
const pubRes = await handlePublicEventsUpcomingBatch2Api(new Request('https://csodisha.com/api/events/upcoming'), env);
assert.equal(pubRes.status, 200);
assert.equal(pubRes.headers.get('X-CSO-Timezone'), 'Asia/Kolkata');
const pubJson = await pubRes.json();
assert.equal(pubJson.timezone, 'Asia/Kolkata');
assert.ok(Array.isArray(pubJson.upcoming_exams) && pubJson.upcoming_exams.length >= 4);
assert.ok(Array.isArray(pubJson.admit_cards) && pubJson.admit_cards.length >= 3);
assert.ok(Array.isArray(pubJson.answer_keys) && pubJson.answer_keys.length >= 3);
assert.ok(pubJson.answer_keys.some(k => k.fee_display_inr === '₹200.00'));
assert.ok(Array.isArray(pubJson.results_dv) && pubJson.results_dv.length >= 2);

console.log('ALL EVENTS & SCHEDULING BATCH 2 TESTS PASSED');
