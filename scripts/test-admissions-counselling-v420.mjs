#!/usr/bin/env node
/**
 * v420 Automated Audit: Interactive Odisha Polytechnic, ITI, B.Ed. & Higher-Ed
 * Admission & Counselling Tracker (/admissions/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v420 Odisha Admission & Counselling Tracker (/admissions/) Audit ===');

const jsPath = path.join(ROOT, 'assets/js/admissions-counselling-tracker.js');
const htmlPath = path.join(ROOT, 'admissions/index.html');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');
const smPath = path.join(ROOT, 'functions/_lib/dynamic-sitemap.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');
const smSrc = fs.readFileSync(smPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(htmlSrc), 'admissions/index.html must have zero inline on* handlers');
assert.ok(!/\sstyle\s*=/i.test(htmlSrc), 'admissions/index.html must have zero inline style attributes');

// 2. Sandbox module check
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOAdmissionsTracker;
assert.ok(api, 'window.CSOAdmissionsTracker must be exported');
assert.equal(api.version, 'v420');
assert.equal(api.ADMISSION_TRACKS.length, 8, 'Must include all 8 Odisha admission & counselling tracks');
assert.equal(api.REPORTING_DOCS.length, 8, 'Must include 8 counselling reporting checklist documents');

for (const tr of api.ADMISSION_TRACKS) {
  assert.ok(tr.id && tr.en && tr.or, `Track must have bilingual title: ${tr.id}`);
  assert.ok(tr.portal.startsWith('https://'), `Track must have HTTPS official portal: ${tr.id}`);
  assert.ok(tr.seatMatrix && tr.fee, `Track must include seat matrix & fee details: ${tr.id}`);
  assert.equal(tr.steps.length, 4, `Track must include 4 counselling round steps: ${tr.id}`);
}

// 3. Deterministic filtering checks
assert.equal(api.filterTracks({ authority: 'all' }).length, 8);
assert.equal(api.filterTracks({ authority: 'sams' }).length, 4);
assert.equal(api.filterTracks({ authority: 'ojee' }).length, 2);
assert.equal(api.filterTracks({ authority: 'dtet' }).length, 2);
assert.equal(api.filterTracks({ authority: 'ncet' }).length, 1);
assert.ok(api.filterTracks({ query: 'Polytechnic' }).some((t) => t.id === 'dtet-polytechnic'));
assert.ok(api.filterTracks({ query: 'ITEP' }).some((t) => t.id === 'dtet-iti-ncet-itep'));
assert.ok(api.filterTracks({ level: 'class10' }).some((t) => t.id === 'sams-plus2'));

// 4. Live D1 notice extraction & document checklist progress
const live = api.extractLiveAdmissionNotices([
  { id: '1', type: 'guide', title: 'SAMS Odisha +3 Admission 2026 Allotment', url: '/guides/sams-plus3' },
  { id: '2', type: 'job_alert', title: 'OSSC CGL Recruitment 2026', url: '/jobs/ossc-cgl' },
  { id: '3', type: 'guide', title: 'DTE&T Odisha Polytechnic Diploma Counselling', url: '/guides/dtet-diploma' }
]);
assert.equal(live.length, 2, 'Should extract only admission/counselling notices');

const prog0 = api.getChecklistProgress({});
assert.equal(prog0.completed, 0);
assert.equal(prog0.total, 8);
const prog3 = api.getChecklistProgress({ marksheets: true, slc_clc: true, allotment: true });
assert.equal(prog3.completed, 3);
assert.equal(prog3.pct, 38);

// 5. HTML mount, Sitemap, SW & Ops-Sentinel sync
assert.ok(htmlSrc.includes('id="cso-admissions-counselling-root"'), 'admissions/index.html must mount #cso-admissions-counselling-root');
assert.ok(htmlSrc.includes('/assets/js/admissions-counselling-tracker.js?v=20261127v426'), 'admissions/index.html must load admissions-counselling-tracker.js?v=20261127v426');
assert.ok(smSrc.includes("'/admissions/'"), 'dynamic-sitemap.js must include /admissions/');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v426'"), 'sw.js must bump CACHE_NAME to v420');
assert.ok(swSrc.includes("'/admissions/'") && swSrc.includes("'/assets/js/admissions-counselling-tracker.js?v=20261127v426'"), 'sw.js must precache /admissions/ and tracker JS');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v426'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v420');

// 6. CSS 4-theme semantic tokens check
const actCssIdx = cssSrc.indexOf('/* ===== v420:');
assert.ok(actCssIdx !== -1, 'assets/style.css must contain v420 .cso-act-* CSS block');
const actCssBlock = cssSrc.slice(actCssIdx);
assert.ok(actCssBlock.includes('.cso-act-wrap') && actCssBlock.includes('var(--cso-'), 'CSS must style .cso-act-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(actCssBlock), 'v420 .cso-act-* CSS block must have zero hardcoded hex colors');
assert.ok(actCssBlock.includes('prefers-reduced-motion'), 'v420 CSS must include prefers-reduced-motion guard');
assert.ok(actCssBlock.includes('@media print'), 'v420 CSS must include @media print rules');

console.log('✅ v420 Odisha Admission & Counselling Tracker (/admissions/) Audit PASSED');
