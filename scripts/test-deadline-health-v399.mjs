/**
 * v399: Admin Studio Active Deadlines & Expiring Notices Health Panel Verification Suite
 * Validates:
 *  1. GET /api/admin/deadlines/health and POST /api/admin/deadlines/action enforce Admin RBAC (HTTP 401/403 unauthenticated)
 *  2. IST 72-hour window & expired classification accurately buckets expired (<0h), expiring_72h (0..72h), and upcoming (>72h)
 *     and 1-click actions (extend_date, mark_closed, archive) update D1 & trigger cache purge
 *  3. Admin Studio JS/CSS renders CSODeadlineHealthPanel cleanly with zero inline style/on* attributes or hardcoded hex
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  classifyNoticeDeadline,
  handleAdminDeadlinesHealth,
  handleAdminDeadlinesAction
} from '../functions/_lib/jobs-publishing-house.js';
import { requireRole, STAFF_ROLES } from '../functions/_lib/rbac.js';

// Fixed reference time: 2026-11-27 12:00:00 IST (06:30:00 UTC)
const FIXED_NOW = new Date('2026-11-27T06:30:00Z');

const sampleRows = [
  {
    id: 'job_exp_1',
    slug: 'expired-walkin-2026',
    title_en: 'Expired District Walk-in 2026',
    title_or: 'ସମାପ୍ତ ୱାକ୍-ଇନ୍',
    organisation_en: 'District Office',
    lifecycle_stage: 'notification',
    last_date: '2026-11-25',
    is_published: 1,
    important_dates_json: JSON.stringify([{ label: 'Last Date', date: '25 Nov 2026' }])
  },
  {
    id: 'job_soon_1',
    slug: 'tomorrow-walkin-2026',
    title_en: 'Kalahandi Walk-in Interview 2026',
    title_or: 'କଳାହାଣ୍ଡି ୱାକ୍-ଇନ୍',
    organisation_en: 'MMU Bhawanipatna',
    lifecycle_stage: 'notification',
    last_date: '2026-11-28',
    is_published: 1,
    important_dates_json: JSON.stringify([{ label: 'Walk-in Date', date: '28 Nov 2026' }])
  },
  {
    id: 'job_soon_2',
    slug: 'closes-in-48h-2026',
    title_en: 'OSSC Junior Clerk 2026',
    title_or: 'OSSC କ୍ଲର୍କ',
    organisation_en: 'OSSC',
    lifecycle_stage: 'notification',
    last_date: '2026-11-29',
    is_published: 1,
    important_dates_json: '[]'
  },
  {
    id: 'job_up_1',
    slug: 'opsc-oas-dec-2026',
    title_en: 'OPSC OAS 2026 Notification',
    title_or: 'OPSC OAS ୨୦୨୬',
    organisation_en: 'OPSC',
    lifecycle_stage: 'notification',
    last_date: '2026-12-15',
    is_published: 1,
    important_dates_json: '[]'
  }
];

const updatesSeen = [];
const mockDb = {
  prepare(sql) {
    let bound = [];
    return {
      bind(...args) { bound = args; return this; },
      run: async () => {
        if (/^\s*UPDATE\s+job_articles/i.test(sql)) {
          updatesSeen.push({ sql, bound });
        }
        return { success: true, meta: { changes: 1 } };
      },
      first: async () => {
        if (/FROM\s+job_articles/i.test(sql)) {
          return sampleRows.find((r) => r.id === bound[0] || r.slug === bound[0]) || null;
        }
        return null;
      },
      all: async () => {
        if (/FROM\s+job_articles/i.test(sql)) {
          return { results: sampleRows };
        }
        return { results: [] };
      }
    };
  }
};

// 1. Admin RBAC protection on GET /api/admin/deadlines/health & POST /api/admin/deadlines/action
for (const [method, path] of [['GET', '/api/admin/deadlines/health'], ['POST', '/api/admin/deadlines/action']]) {
  let status = 200;
  try {
    await requireRole(new Request('https://csodisha.com' + path, { method }), { DB: mockDb }, STAFF_ROLES);
  } catch (err) {
    status = err && err.status ? err.status : 500;
  }
  assert.ok(status === 401 || status === 403, `Expected 401/403 for unauthenticated ${method} ${path}, got ${status}`);
}

const adminRouterSrc = fs.readFileSync('functions/api/admin/_router.js', 'utf8');
assert.ok(adminRouterSrc.includes("if (resource === 'deadlines')"), 'Admin router wires /api/admin/deadlines/*');
assert.ok(adminRouterSrc.includes("id === 'health' && method === 'GET'"), 'Admin router wires GET /api/admin/deadlines/health');
assert.ok(adminRouterSrc.includes("id === 'action' && method === 'POST'"), 'Admin router wires POST /api/admin/deadlines/action');

// 2. IST 72-hour window & expired classification
const cExp = classifyNoticeDeadline(sampleRows[0], FIXED_NOW);
assert.equal(cExp.bucket, 'expired');
assert.ok(cExp.delta_hours < 0);
assert.ok(cExp.deadline_label.includes('Expired'));

const cSoon1 = classifyNoticeDeadline(sampleRows[1], FIXED_NOW);
assert.equal(cSoon1.bucket, 'expiring_72h');
assert.ok(cSoon1.delta_hours >= 0 && cSoon1.delta_hours <= 72);
assert.equal(cSoon1.deadline_label, 'Walk-in Tomorrow');

const cSoon2 = classifyNoticeDeadline(sampleRows[2], FIXED_NOW);
assert.equal(cSoon2.bucket, 'expiring_72h');
assert.ok(cSoon2.delta_hours >= 0 && cSoon2.delta_hours <= 72);

const cUp = classifyNoticeDeadline(sampleRows[3], FIXED_NOW);
assert.equal(cUp.bucket, 'upcoming');
assert.ok(cUp.delta_hours > 72);

const healthRes = await handleAdminDeadlinesHealth(
  new Request('https://csodisha.com/api/admin/deadlines/health'),
  { DB: mockDb },
  { now: FIXED_NOW }
);
assert.equal(healthRes.status, 200);
const healthData = await healthRes.json();
assert.equal(healthData.ok, true);
assert.equal(healthData.expired_count, 1);
assert.equal(healthData.expiring_72h_count, 2);
assert.equal(healthData.upcoming_count, 1);
assert.equal(healthData.total_tracked, 4);

// 2b. 1-Click Actions (extend_date, mark_closed, archive)
const actor = { userId: 'adm_1', email: 'admin@csodisha.com', role: 'super_admin' };
const extRes = await handleAdminDeadlinesAction(
  new Request('https://csodisha.com/api/admin/deadlines/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'job_exp_1', action: 'extend_date', new_date: '2026-12-10' })
  }),
  { DB: mockDb },
  actor
);
assert.equal(extRes.status, 200);
const extData = await extRes.json();
assert.equal(extData.ok, true);
assert.equal(extData.new_date, '2026-12-10');
assert.equal(extData.cache_purged, true);

const closeRes = await handleAdminDeadlinesAction(
  new Request('https://csodisha.com/api/admin/deadlines/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'job_soon_1', action: 'mark_closed' })
  }),
  { DB: mockDb },
  actor
);
assert.equal((await closeRes.json()).status, 'closed');

const archRes = await handleAdminDeadlinesAction(
  new Request('https://csodisha.com/api/admin/deadlines/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'job_soon_2', action: 'archive' })
  }),
  { DB: mockDb },
  actor
);
assert.equal((await archRes.json()).status, 'archived');
assert.equal(updatesSeen.length, 3, 'All 3 1-click actions executed SQL UPDATE on job_articles');

// 3. Admin Studio UI & Strict CSP checks
const jobsStudioJs = fs.readFileSync('admin/jobs-publishing-studio.js', 'utf8');
const guidesStudioJs = fs.readFileSync('admin/guides-publishing-studio.js', 'utf8');
const jobsStudioCss = fs.readFileSync('admin/jobs-publishing-studio.css', 'utf8');

assert.ok(jobsStudioJs.includes('window.CSODeadlineHealthPanel'), 'CSODeadlineHealthPanel exported in jobs-publishing-studio.js');
assert.ok(jobsStudioJs.includes('/api/admin/deadlines/health'), 'Panel fetches /api/admin/deadlines/health');
assert.ok(jobsStudioJs.includes('/api/admin/deadlines/action'), 'Panel posts to /api/admin/deadlines/action');
assert.ok(jobsStudioJs.includes('📅 +7 Days') && jobsStudioJs.includes('🔒 Mark Closed') && jobsStudioJs.includes('📦 Archive'), '1-click action buttons present');
assert.ok(guidesStudioJs.includes('CSODeadlineHealthPanel.buildDeadlineHealthCard'), 'Panel mounted in Guides Studio');
assert.ok(!/\.innerHTML\s*=/.test(jobsStudioJs), 'Zero .innerHTML in jobs-publishing-studio.js');
assert.ok(!/\.style\./.test(jobsStudioJs.slice(jobsStudioJs.indexOf('initCSODeadlineHealthPanel'))), 'Zero .style.* in CSODeadlineHealthPanel');

const dhCss = jobsStudioCss.slice(jobsStudioCss.indexOf('v399:'));
assert.ok(dhCss.includes('.jph-dh-panel') && dhCss.includes('min-height: 44px'), 'v399 CSS defines .jph-dh-panel and >=44px touch targets');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(dhCss), 'Zero hardcoded hex colors in v399 Deadline Health CSS');

console.log('✅ v399 Admin Studio Active Deadlines & Expiring Notices Health Panel test suite passed!');
