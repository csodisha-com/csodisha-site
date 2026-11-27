#!/usr/bin/env node
/**
 * v431 Test Suite — Interactive Odisha Scholarship & Student Financial Aid Finder
 * (/schemes/ & /admissions/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox
const jsCode = read('assets/js/scholarship-aid-finder.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOScholarshipAidFinder;

assert.ok(api, 'window.CSOScholarshipAidFinder must be exposed');
assert.equal(api.VERSION, 'v431');
assert.equal(api.ROOT_ID, 'cso-scholarship-aid-finder-root');
assert.equal(api.PREFS_KEY, 'cso_scholarship_finder_prefs_v1');
assert.equal(api.CHECKLIST_KEY, 'cso_scholarship_renewal_checklist_v1');
assert.equal(api.SCHOLARSHIP_SCHEMES.length, 8, 'Must include all 8 verified OSSP schemes');
assert.equal(api.RENEWAL_CHECKLIST_ITEMS.length, 8, 'Must include all 8 Fresh & Renewal OSSP checklist items');

// 2. Verify every scheme exposes bilingual metadata, OSSP URL, payout & deadline
for (const s of Array.from(api.SCHOLARSHIP_SCHEMES)) {
  assert.ok(s.nameEn && s.nameOr, `Scheme ${s.id} must have bilingual name`);
  assert.ok(s.deptEn && s.deptOr, `Scheme ${s.id} must have bilingual dept`);
  assert.ok(s.payoutEn && s.payoutOr, `Scheme ${s.id} must have bilingual payout`);
  assert.equal(s.applyUrl, 'https://scholarship.odisha.gov.in/', `Scheme ${s.id} must link to scholarship.odisha.gov.in`);
  assert.match(s.deadlineIso, /^\d{4}-\d{2}-\d{2}$/, `Scheme ${s.id} must have ISO deadline`);
}

// 3. Verify evaluateScholarshipEligibility across categories, courses, income ceilings & marks
// 3a. ST student in UG with ₹1,00,000 income, 48% marks & GSSY vulnerable household -> Post-Matric (no % bar for SC/ST) + GSSY eligible, e-Medhabruti needs 55%
const stGssy = api.evaluateScholarshipEligibility({
  category: 'st',
  courseLevel: 'ug',
  annualIncome: 100000,
  marksPct: 48,
  special: { gssyVulnerable: true }
});
const stEligibleIds = Array.from(stGssy.eligible).map((r) => r.scheme.id);
assert.ok(stEligibleIds.includes('post-matric'), 'ST student with 48% & ₹1L income must be eligible for Post-Matric');
assert.ok(stEligibleIds.includes('gssy'), 'Student with ₹1L income & vulnerable household must be eligible for GSSY');
assert.ok(!stEligibleIds.includes('e-medhabruti'), '48% marks must not be eligible for e-Medhabruti (requires 55%)');

// 3b. OBC/SEBC student in Technical with ₹2,50,000 income & 52% marks -> Post-Matric eligible (>=50%), e-Medhabruti check (<55%)
const obcTech = api.evaluateScholarshipEligibility({
  category: 'obc-sebc',
  courseLevel: 'technical',
  annualIncome: 250000,
  marksPct: 52,
  special: { girlTech: true }
});
const obcIds = Array.from(obcTech.eligible).map((r) => r.scheme.id);
assert.ok(obcIds.includes('post-matric'), 'OBC/SEBC with 52% & ₹2.5L income must be eligible for Post-Matric');
assert.ok(obcIds.includes('sudakshya'), 'Girl student in ITI/Polytechnic must be eligible for Sudakshya');
assert.ok(!obcIds.includes('e-medhabruti'), '52% must not meet e-Medhabruti 55% requirement');

// 3c. General PG student with ₹7,50,000 income & 65% marks + Odia Honours -> e-Medhabruti + Fakirmohan eligible; Post-Matric excluded for General
const genPg = api.evaluateScholarshipEligibility({
  category: 'general',
  courseLevel: 'pg',
  annualIncome: 750000,
  marksPct: 65,
  special: { odiaHonours: true }
});
const genIds = Array.from(genPg.eligible).map((r) => r.scheme.id);
assert.ok(genIds.includes('e-medhabruti'), 'General PG with ₹7.5L income & 65% must be eligible for e-Medhabruti (<=₹8L)');
assert.ok(genIds.includes('fakirmohan-bhasabruti'), 'M.A. Odia student with 65% must be eligible for Fakirmohan Bhasabruti');
assert.ok(!Array.from(genPg.results).some((r) => r.scheme.id === 'post-matric'), 'General category must not match ST/SC/OBC/EBC Post-Matric');

// 3d. Income above ₹8,00,000 fails e-Medhabruti & Post-Matric ceilings
const highInc = api.evaluateScholarshipEligibility({
  category: 'sc',
  courseLevel: 'ug',
  annualIncome: 950000,
  marksPct: 80,
  special: {}
});
const highIds = Array.from(highInc.eligible).map((r) => r.scheme.id);
assert.ok(!highIds.includes('post-matric'), '₹9.5L income must exceed Post-Matric ₹2.5L ceiling');
assert.ok(!highIds.includes('e-medhabruti'), '₹9.5L income must exceed e-Medhabruti ₹8L ceiling');
assert.ok(highIds.includes('godabarisha-laptop'), 'Merit-only Godabarisha Laptop DBT has no income bar');

// 4. Verify strict CSP, mounts on both /schemes/ and /admissions/, 4-theme CSS & SW/ops-sentinel sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

for (const htmlPath of ['schemes/index.html', 'admissions/index.html']) {
  const html = read(htmlPath);
  const mounts = html.match(/id=["']cso-scholarship-aid-finder-root["']/g) || [];
  assert.equal(mounts.length, 1, `${htmlPath} must have exactly one #cso-scholarship-aid-finder-root`);
  assert.ok(html.includes('/assets/js/scholarship-aid-finder.js?v=20261127v431'), `${htmlPath} must load scholarship-aid-finder.js?v=20261127v431`);
  assert.ok(!/\son[a-z]+\s*=/i.test(html), `${htmlPath} must have zero inline on* attributes`);
  assert.ok(!/\sstyle\s*=/i.test(html), `${htmlPath} must have zero inline style attributes`);
}

const css = read('assets/style.css');
const safIdx = css.indexOf('v431: Odisha Scholarship & Student Financial Aid Finder');
assert.ok(safIdx > 0, 'assets/style.css must contain v431 .cso-saf-* CSS block');
const safBlock = css.slice(safIdx);
assert.ok(safBlock.includes('.cso-saf-card'), 'CSS must style .cso-saf-card');
assert.ok(safBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(safBlock), 'v431 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v431'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v431');
assert.ok(sw.includes('/assets/js/scholarship-aid-finder.js?v=20261127v431'), 'sw.js must pre-cache scholarship-aid-finder.js?v=20261127v431');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v431'"), 'ops-sentinel.js must match cso-candidate-cache-v431');

console.log('✅ v431 Odisha Scholarship & Student Financial Aid Finder tests passed!');
