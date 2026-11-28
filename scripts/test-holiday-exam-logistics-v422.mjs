#!/usr/bin/env node
/**
 * v422 Automated Audit: Interactive Odisha Govt Holiday, Treasury &
 * Exam-Day Logistics Calendar (/guides/ & /exams/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v422 Odisha Govt Holiday, Treasury & Exam-Day Logistics Calendar Audit ===');

const jsPath = path.join(ROOT, 'assets/js/holiday-exam-logistics.js');
const examsHtmlPath = path.join(ROOT, 'exams/index.html');
const guidesSsrPath = path.join(ROOT, 'functions/_lib/informative-guides.js');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const examsHtml = fs.readFileSync(examsHtmlPath, 'utf8');
const guidesSsr = fs.readFileSync(guidesSsrPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(examsHtml), 'exams/index.html must have zero inline on* handlers');
assert.ok(!/\sstyle\s*=/i.test(examsHtml), 'exams/index.html must have zero inline style attributes');

// 2. Sandbox evaluation
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOHolidayExamLogistics;
assert.ok(api, 'window.CSOHolidayExamLogistics must be exported');
assert.equal(api.version, 'v422');
assert.ok(api.HOLIDAYS.length >= 18, 'Must include at least 18 verified 2026-27 Odisha holidays');
assert.equal(api.EXAM_CHECKLIST_ITEMS.length, 8, 'Must include 8 exam-day reporting checklist items');

// 3. Holiday filtering checks
assert.ok(api.filterHolidays({ type: 'gazetted' }).length >= 16);
assert.ok(api.filterHolidays({ type: 'optional' }).some((h) => h.id === 'newyear-2027'));
assert.ok(api.filterHolidays({ type: 'bank' }).some((h) => h.id === 'utkal-divas-2027'));
assert.ok(api.filterHolidays({ period: 'apr-jun-2027' }).some((h) => h.id === 'raja-2027'));
assert.ok(api.filterHolidays({ query: 'Nuakhai' }).some((h) => h.id === 'nuakhai-2027'));
assert.ok(api.filterHolidays({ query: 'ରଥଯାତ୍ରା' }).some((h) => h.id === 'rath-yatra-2027'));

// 4. Backward Exam-Day timeline math checks (Morning, Afternoon, Custom)
const morning = api.computeExamDayTimeline('09:30', 45, 'omr');
assert.equal(morning.examStart, '09:30 AM');
assert.equal(morning.gateClosure, '09:00 AM');
assert.equal(morning.biometric, '08:30 AM');
assert.equal(morning.arrival, '08:00 AM');
assert.equal(morning.departure, '07:15 AM');
assert.equal(morning.mode, 'omr');

const afternoon = api.computeExamDayTimeline('14:30', 60, 'cbt');
assert.equal(afternoon.examStart, '02:30 PM');
assert.equal(afternoon.gateClosure, '02:00 PM');
assert.equal(afternoon.arrival, '01:00 PM');
assert.equal(afternoon.departure, '12:00 PM');
assert.equal(afternoon.mode, 'cbt');

const custom = api.computeExamDayTimeline('11:00', 30, 'omr');
assert.equal(custom.arrival, '09:30 AM');
assert.equal(custom.departure, '09:00 AM');

const prog = api.getChecklistProgress({ admit_card: true, photo_id: true, photos: true, stationery: true });
assert.equal(prog.completed, 4);
assert.equal(prog.total, 8);
assert.equal(prog.pct, 50);

// 5. Mounts on /exams/ & SSR /guides/, SW & Ops-Sentinel sync
assert.ok(examsHtml.includes('id="cso-holiday-exam-logistics-root"'), 'exams/index.html must mount #cso-holiday-exam-logistics-root');
assert.ok(examsHtml.includes('/assets/js/holiday-exam-logistics.js?v=20261128v451'), 'exams/index.html must load holiday-exam-logistics.js?v=20261128v451');
assert.ok(guidesSsr.includes('id="cso-holiday-exam-logistics-root"'), 'informative-guides.js must mount #cso-holiday-exam-logistics-root');
assert.ok(guidesSsr.includes('/assets/js/holiday-exam-logistics.js?v=20261128v451'), 'informative-guides.js must load holiday-exam-logistics.js?v=20261128v451');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v451'"), 'sw.js must bump CACHE_NAME to v422');
assert.ok(swSrc.includes("'/assets/js/holiday-exam-logistics.js?v=20261128v451'"), 'sw.js must precache holiday-exam-logistics.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v451'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v422');

// 6. CSS 4-theme semantic tokens check
const helCssIdx = cssSrc.indexOf('/* ===== v422:');
assert.ok(helCssIdx !== -1, 'assets/style.css must contain v422 .cso-hel-* CSS block');
const helCssBlock = cssSrc.slice(helCssIdx);
assert.ok(helCssBlock.includes('.cso-hel-wrap') && helCssBlock.includes('var(--cso-'), 'CSS must style .cso-hel-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(helCssBlock), 'v422 .cso-hel-* CSS block must have zero hardcoded hex colors');
assert.ok(helCssBlock.includes('prefers-reduced-motion'), 'v422 CSS must include prefers-reduced-motion guard');
assert.ok(helCssBlock.includes('@media print'), 'v422 CSS must include @media print rules');

console.log('✅ v422 Odisha Govt Holiday, Treasury & Exam-Day Logistics Calendar Audit PASSED');
