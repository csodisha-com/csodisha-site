#!/usr/bin/env node
/**
 * v204 Verification:
 * 1. assets/js/deadline-tracker.js countdown math & RFC-5545 .ics generation
 * 2. /jobs-careers/ Track & .ics card buttons + single #directory-search bar
 * 3. /student-dashboard/ #cso-deadlines-panel + renderTrackedDeadlinesPanel()
 * 4. 100% CSP compliance & SW cache v204
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// 1. Load deadline-tracker.js into globalThis
await import('../assets/js/deadline-tracker.js');
const tracker = globalThis.CSO_DEADLINE_TRACKER;
assert.ok(tracker, 'window.CSO_DEADLINE_TRACKER must be defined');

// Countdown math
const refNow = new Date(2026, 10, 22, 11, 0, 0); // 2026-11-22 local
assert.equal(tracker.calculateDaysRemaining('2026-11-22', refNow), 0);
assert.equal(tracker.calculateDaysRemaining('2026-11-25', refNow), 3);
assert.equal(tracker.calculateDaysRemaining('2026-11-20', refNow), -2);
assert.equal(tracker.formatUrgencyLabel(0), 'Closes Today');
assert.equal(tracker.formatUrgencyLabel(3), '3 Days Left');
assert.equal(tracker.formatUrgencyLabel(-2), 'Closed');

// localStorage persistence & sorting
const store = new Map();
const mockStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v))
};
tracker.trackItem({
  id: 'opsc-oas-2026',
  title: 'OPSC OAS 2026',
  board: 'OPSC',
  district: 'Odisha',
  lastDate: '2026-12-10',
  applyUrl: 'https://www.opsc.gov.in/'
}, mockStorage);
tracker.trackItem({
  id: 'osssc-ri-2026',
  title: 'OSSSC RI 2026',
  board: 'OSSSC',
  district: 'Cuttack',
  lastDate: '2026-11-25',
  applyUrl: 'https://www.osssc.gov.in/'
}, mockStorage);

const loaded = tracker.load(mockStorage);
assert.equal(loaded.length, 2);
assert.equal(loaded[0].id, 'osssc-ri-2026', 'Tracked deadlines must sort by nearest lastDate');
assert.equal(loaded[1].id, 'opsc-oas-2026');
assert.equal(tracker.isTracked('opsc-oas-2026', mockStorage), true);

const toggled = tracker.toggleTrack({ id: 'opsc-oas-2026', title: 'OPSC OAS 2026' }, mockStorage);
assert.equal(toggled.tracked, false);
assert.equal(tracker.load(mockStorage).length, 1);

// RFC-5545 .ics output
const ics = tracker.buildIcsContent({
  id: 'osssc-ri-2026',
  title: 'OSSSC RI 2026',
  board: 'OSSSC',
  district: 'Cuttack',
  lastDate: '2026-11-25',
  applyUrl: 'https://www.osssc.gov.in/'
});
assert.ok(ics.includes('BEGIN:VCALENDAR\r\n'), '.ics must use CRLF line endings');
assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
assert.ok(ics.includes('DTSTART;VALUE=DATE:20261125\r\n'));
assert.ok(ics.includes('DTEND;VALUE=DATE:20261126\r\n'));
assert.ok(ics.includes('BEGIN:VALARM\r\n') && ics.includes('TRIGGER:-PT24H\r\n'));
assert.ok(ics.includes('END:VCALENDAR\r\n'));

// 2. Check /jobs-careers/ and /student-dashboard/ wiring & CSP compliance
const jobsHtml = read('jobs-careers/index.html');
assert.ok(jobsHtml.includes('/assets/js/deadline-tracker.js?v=20261122v204'));
assert.ok(jobsHtml.includes('./assets/dashboard.css?v=20261122v204'));
assert.ok(jobsHtml.includes('./assets/dashboard.js?v=20261122v204'));
assert.equal((jobsHtml.match(/id="directory-search"/g) || []).length, 1, 'Only single #directory-search bar');

const jobsJs = read('jobs-careers/assets/dashboard.js');
assert.ok(jobsJs.includes('live-btn--track') && jobsJs.includes('live-btn--ics'));

const studHtml = read('student-dashboard/index.html');
assert.ok(studHtml.includes('id="cso-deadlines-panel"'));
assert.ok(studHtml.includes('/assets/js/deadline-tracker.js?v=20261122v204'));
assert.ok(studHtml.includes('/assets/js/student-dashboard.js?v=20261122v204'));
assert.ok(studHtml.includes('/assets/css/student-dashboard-bp.css?v=20261122v204'));

const studJs = read('assets/js/student-dashboard.js');
assert.ok(studJs.includes('function renderTrackedDeadlinesPanel()'));

const cspFiles = [
  ['assets/js/deadline-tracker.js', read('assets/js/deadline-tracker.js')],
  ['jobs-careers/index.html', jobsHtml],
  ['jobs-careers/assets/dashboard.js', jobsJs],
  ['student-dashboard/index.html', studHtml],
  ['assets/js/student-dashboard.js', studJs]
];
for (const [name, content] of cspFiles) {
  assert.ok(!/\.innerHTML\s*=/.test(content), `${name}: no .innerHTML`);
  assert.ok(!/\sonclick\s*=/i.test(content), `${name}: no onclick=`);
  assert.ok(!/\sstyle\s*=/i.test(content), `${name}: no style=`);
  if (name.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(content), `${name}: no inline <style>`);
    assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i.test(content), `${name}: no executable inline <script>`);
  }
}

assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v204';"));
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v204';"));

console.log('PASS: test-deadline-tracker-v204.mjs');
