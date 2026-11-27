#!/usr/bin/env node
/**
 * v432 Test Suite — Interactive Odisha 30-District Exam Center & Travel Logistics Planner
 * (/exams/ & /odisha-special/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/district-exam-center-planner.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSODistrictExamCenterPlanner;

assert.ok(api, 'window.CSODistrictExamCenterPlanner must be exposed');
assert.equal(api.VERSION, 'v432');
assert.equal(api.ROOT_ID, 'cso-district-exam-center-root');
assert.equal(api.PREFS_KEY, 'cso_district_exam_center_prefs_v1');
assert.equal(api.DISTRICT_HUBS.length, 30, 'Must cover all 30 Odisha districts');
assert.equal(api.STATE_EXAM_HELPLINES.length, 4, 'Must include OPSC, OSSC, OSSSC & OJEE helplines');
assert.equal(api.SHIFT_PRESETS.length, 3, 'Must include 3 shift presets');

// 2. Verify all 30 districts have unique slugs, bilingual names, CBT/OMR zones, rail/bus corridors & .odisha.gov.in portals
const slugs = new Set();
const divCounts = { central: 0, northern: 0, southern: 0 };
for (const d of Array.from(api.DISTRICT_HUBS)) {
  assert.ok(!slugs.has(d.slug), `Duplicate district slug: ${d.slug}`);
  slugs.add(d.slug);
  assert.ok(d.en && d.or, `District ${d.slug} must have bilingual EN/OR names`);
  assert.ok(d.cbtZones && d.omrZones, `District ${d.slug} must include CBT & OMR zones`);
  assert.ok(d.railhead && d.busCorridor, `District ${d.slug} must include railhead & bus corridor`);
  assert.match(d.portal, /^https:\/\/[a-z]+\.odisha\.gov\.in\/$/, `District ${d.slug} must have official .odisha.gov.in portal`);
  assert.ok(d.lastMileBufferMin >= 30 && d.lastMileBufferMin <= 60, `District ${d.slug} last-mile buffer must be 30–60 mins`);
  assert.ok(Array.from(d.boards).length >= 1, `District ${d.slug} must list exam boards`);
  divCounts[d.division] += 1;
}
assert.equal(divCounts.central, 10, 'Central division must have 10 districts');
assert.equal(divCounts.northern, 10, 'Northern division must have 10 districts');
assert.equal(divCounts.southern, 10, 'Southern division must have 10 districts');

// 3. Verify planDistrictExamTrip calculations
const sameDist = api.planDistrictExamTrip({ homeDistrict: 'khordha', centerDistrict: 'khordha', shiftPreset: 'morning' });
assert.equal(sameDist.isSameDistrict, true);
assert.equal(sameDist.travelType, 'same-district');
assert.equal(sameDist.gateClosureBufferMin, 30);
assert.equal(sameDist.shift.gateCloses, '08:30 AM');
assert.equal(sameDist.recommendedLeadMinutes, 120, 'Khordha same-district: 30 gate + 60 last-mile + 30 prep = 120 mins');

const sameDiv = api.planDistrictExamTrip({ homeDistrict: 'cuttack', centerDistrict: 'khordha', shiftPreset: 'midday' });
assert.equal(sameDiv.isSameDistrict, false);
assert.equal(sameDiv.sameDivision, true);
assert.equal(sameDiv.travelType, 'same-division-inter');
assert.equal(sameDiv.shift.gateCloses, '12:00 PM');

const crossDiv = api.planDistrictExamTrip({ homeDistrict: 'koraput', centerDistrict: 'sambalpur', shiftPreset: 'afternoon' });
assert.equal(crossDiv.isSameDistrict, false);
assert.equal(crossDiv.sameDivision, false);
assert.equal(crossDiv.travelType, 'cross-division-overnight');
assert.ok(crossDiv.recommendedLeadMinutes >= 500, 'Cross-division trip must recommend overnight buffer');

// 4. Verify strict CSP, mounts on both /exams/ and /odisha-special/, 4-theme CSS & SW/ops-sentinel sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

for (const htmlPath of ['exams/index.html', 'odisha-special/index.html']) {
  const html = read(htmlPath);
  const mounts = html.match(/id=["']cso-district-exam-center-root["']/g) || [];
  assert.equal(mounts.length, 1, `${htmlPath} must have exactly one #cso-district-exam-center-root`);
  assert.ok(html.includes('/assets/js/district-exam-center-planner.js?v=20261127v440'), `${htmlPath} must load district-exam-center-planner.js?v=20261127v440`);
  assert.ok(!/\son[a-z]+\s*=/i.test(html), `${htmlPath} must have zero inline on* attributes`);
  assert.ok(!/\sstyle\s*=/i.test(html), `${htmlPath} must have zero inline style attributes`);
}

const css = read('assets/style.css');
const decIdx = css.indexOf('v432: Odisha 30-District Exam Center');
assert.ok(decIdx > 0, 'assets/style.css must contain v432 .cso-dec-* CSS block');
const decBlock = css.slice(decIdx);
assert.ok(decBlock.includes('.cso-dec-card'), 'CSS must style .cso-dec-card');
assert.ok(decBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(decBlock), 'v432 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v440'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v440');
assert.ok(sw.includes('/assets/js/district-exam-center-planner.js?v=20261127v440'), 'sw.js must pre-cache district-exam-center-planner.js?v=20261127v440');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v440'"), 'ops-sentinel.js must match cso-candidate-cache-v440');

console.log('✅ v432 Odisha 30-District Exam Center & Travel Logistics Planner tests passed!');
