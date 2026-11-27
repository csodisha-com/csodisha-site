#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v417 Candidate Study Streak, Daily Goal & Revision Planner Audit ===');

const sspSrc = read('assets/js/study-streak-planner.js');
const mockHtml = read('mock-tests/index.html');
const caHtml = read('current-affairs/index.html');
const mockJs = read('assets/js/mock-tests-hub.js');
const caJs = read('assets/js/current-affairs-hub.js');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const store = new Map();
const mockWin = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); }
  }
};
const sandbox = { window: mockWin, globalThis: mockWin, console };
vm.runInNewContext(sspSrc, sandbox);
const SSP = mockWin.CSOStudyStreakPlanner;
assert.ok(SSP, 'window.CSOStudyStreakPlanner must be exported');
assert.equal(SSP.version, 'v417');
assert.equal(SSP.STORAGE_KEY, 'cso_study_streak_planner_v1');

// 1. Verify consecutive IST days streak, daily targets (10/25/50) & weak-topic ranking
const refDate = new Date('2026-11-27T08:00:00Z'); // 2026-11-27 IST
assert.equal(SSP.getIstDateKey(refDate), '2026-11-27');

SSP.recordPracticeActivity({ count: 25, correct: 22, topicKey: 'odisha-gk', dateKey: '2026-11-25', refDate });
SSP.recordPracticeActivity({ count: 25, correct: 12, topicKey: 'reasoning-quant', dateKey: '2026-11-26', refDate });
SSP.recordPracticeActivity({ count: 25, correct: 20, topicKey: 'teaching-pedagogy', dateKey: '2026-11-27', refDate });

const d25 = SSP.loadData();
const m25 = SSP.computeStreakMetrics(d25, refDate);
assert.equal(m25.currentStreak, 3, '3 consecutive days meeting 25 MCQs/day must yield streak = 3');
assert.equal(m25.bestStreak, 3);
assert.equal(m25.goalMetToday, true);
assert.equal(m25.todayCount, 25);

// Switch target to 50 -> goal not yet met today, remaining = 25
d25.dailyTarget = 50;
const m50 = SSP.computeStreakMetrics(d25, refDate);
assert.equal(m50.goalMetToday, false);
assert.equal(m50.remainingToday, 25);
assert.equal(m50.currentStreak, 0);

// Weak topics: unpracticed topics + lowest practiced (reasoning-quant at 48%)
const weak = SSP.getWeakTopics(d25, 7);
const rqIdx = weak.findIndex(t => t.key === 'reasoning-quant');
const gkIdx = weak.findIndex(t => t.key === 'odisha-gk');
assert.ok(rqIdx < gkIdx, 'Lower-accuracy reasoning-quant (48%) must rank higher priority than odisha-gk (88%)');

// 2. Verify 7-day rolling IST revision calendar & persistence of custom focus tracks
d25.planByDate['2026-11-28'] = 'Weak-Topic Revision';
SSP.saveData(d25);
const cal = SSP.buildSevenDayCalendar(SSP.loadData(), refDate);
assert.equal(cal.length, 7, '7-day revision calendar must emit exactly 7 cells');
assert.equal(cal[3].isToday, true);
assert.equal(cal[3].dateKey, '2026-11-27');
assert.equal(cal[4].focusTrack, 'Weak-Topic Revision', 'Custom focus track for tomorrow must persist');

// 3. Markup, Hooks, Strict CSP, 4-Theme CSS & v417 SW Cache Sync
assert.match(mockHtml, /id="cso-study-streak-planner-root"/, 'mock-tests/index.html must mount #cso-study-streak-planner-root');
assert.match(mockHtml, /\/assets\/js\/study-streak-planner\.js\?v=20261127v425/, 'mock-tests/index.html must load study-streak-planner.js?v=20261127v425');
assert.match(caHtml, /id="cso-study-streak-planner-root"/, 'current-affairs/index.html must mount #cso-study-streak-planner-root');
assert.match(caHtml, /\/assets\/js\/study-streak-planner\.js\?v=20261127v425/, 'current-affairs/index.html must load study-streak-planner.js?v=20261127v425');
assert.ok(mockJs.includes('CSOStudyStreakPlanner') && caJs.includes('CSOStudyStreakPlanner'), 'Both mock-tests-hub.js and current-affairs-hub.js must log practice activity to CSOStudyStreakPlanner');
assert.ok(!/\sstyle="/i.test(mockHtml) && !/\son[a-z]+="/i.test(mockHtml), 'mock-tests/index.html strict CSP');
assert.ok(!/\sstyle="/i.test(caHtml) && !/\son[a-z]+="/i.test(caHtml), 'current-affairs/index.html strict CSP');
assert.ok(!sspSrc.includes('.innerHTML') && !sspSrc.includes('.outerHTML') && !sspSrc.includes('insertAdjacentHTML') && !sspSrc.includes('.style.'), 'study-streak-planner.js must obey strict CSP');

const v417CssIdx = styleCss.indexOf('v417: Candidate Study Streak, Daily Goal & 7-Day Revision Planner');
assert.ok(v417CssIdx !== -1, 'assets/style.css must contain v417 Study Streak CSS block');
const v417Css = styleCss.slice(v417CssIdx);
assert.ok(v417Css.includes('.cso-ssp-card') && v417Css.includes('var(--cso-surface-elevated)') && v417Css.includes('var(--cso-ink)'), 'v417 CSS must use semantic --cso-* tokens');
assert.ok(v417Css.includes('min-height: 44px'), 'v417 CSS must enforce >=44px touch targets');
assert.ok(v417Css.includes('prefers-reduced-motion: reduce'), 'v417 CSS must respect prefers-reduced-motion');
assert.ok(v417Css.includes('@media print'), 'v417 CSS must include @media print support');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v417Css), 'v417 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v425'"), 'sw.js CACHE_NAME must be v417');
assert.ok(swJs.includes("'/assets/js/study-streak-planner.js?v=20261127v425'"), 'sw.js must pre-cache study-streak-planner.js');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v425'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v417');

console.log('✅ v417 Candidate Study Streak, Daily Goal & Revision Planner Audit PASSED');
