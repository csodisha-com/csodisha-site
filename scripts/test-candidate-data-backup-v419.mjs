#!/usr/bin/env node
/**
 * v419 Automated Audit: Candidate Saved-Alerts, Watchlist & Study Streak
 * JSON Backup / Restore & Shareable Study-Pack Generator (/tools/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v419 Candidate Profile JSON Backup, Restore & Shareable Study-Pack Audit ===');

const jsPath = path.join(ROOT, 'assets/js/candidate-data-backup.js');
const htmlPath = path.join(ROOT, 'tools/index.html');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(htmlSrc), 'tools/index.html must have zero inline on* handlers');
assert.ok(!/\sstyle\s*=/i.test(htmlSrc), 'tools/index.html must have zero inline style attributes');

// 2. Sandbox evaluation with mock localStorage
function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); }
  };
}

const sandbox = {
  window: { localStorage: makeStorage() },
  globalThis: {},
  TextEncoder,
  TextDecoder,
  Buffer
};
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOCandidateDataBackup;
assert.ok(api, 'window.CSOCandidateDataBackup must be exported');
assert.equal(api.version, 'v419');
assert.equal(api.SCHEMA_VERSION, 'csodisha-candidate-backup-v1');

// 3. Test buildCandidateBackupPayload
const storageA = makeStorage({
  cso_saved_alerts_v1: JSON.stringify([
    { id: 'opsc-oas-2026', url: '/jobs/opsc-oas-2026', title: 'OPSC OAS 2026' },
    { id: 'ossc-cgl-2026', url: '/jobs/ossc-cgl-2026', title: 'OSSC CGL 2026' }
  ]),
  cso_candidate_watchlist_v1: JSON.stringify({
    districts: ['kalahandi', 'khordha'],
    tracks: ['opsc-ossc'],
    keywords: ['OAS']
  }),
  cso_study_streak_planner_v1: JSON.stringify({
    dailyTarget: 25,
    bestStreak: 2,
    days: {
      '2026-11-26': { mcqs: 20, correct: 16, sessions: 1 },
      '2026-11-27': { mcqs: 15, correct: 12, sessions: 1 }
    },
    topics: { 'odisha-gk': { attempted: 35, correct: 28 } },
    planByDate: { '2026-11-27': 'ଓଡ଼ିଶା GK · Odisha GK' }
  })
});

const exported = api.buildCandidateBackupPayload(storageA);
assert.equal(exported.schema, 'csodisha-candidate-backup-v1');
assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:30$/.test(exported.exportedAtIst), 'exportedAtIst must be valid IST ISO timestamp');
assert.equal(exported.data.savedAlerts.length, 2);
assert.deepEqual(Array.from(exported.data.watchlist.districts), ['kalahandi', 'khordha']);
assert.equal(exported.data.studyStreak.dailyTarget, 25);
assert.equal(exported.data.studyStreak.planByDate['2026-11-27'], 'ଓଡ଼ିଶା GK · Odisha GK');

// 4. Test malformed JSON validation (safe error return, no throw)
const badRes = api.importCandidateBackupPayload('{broken json!!!', 'merge', storageA);
assert.equal(badRes.ok, false);
assert.ok(badRes.error && badRes.error.length > 5);

const badSchema = api.importCandidateBackupPayload(JSON.stringify({ schema: 'unknown-v0', data: {} }), 'merge', storageA);
assert.equal(badSchema.ok, false);

// 5. Test Smart Merge mode (dedup alerts, union districts, Math.max daily MCQs)
const storageB = makeStorage({
  cso_saved_alerts_v1: JSON.stringify([
    { id: 'opsc-oas-2026', url: '/jobs/opsc-oas-2026', title: 'OPSC OAS 2026' },
    { id: 'osssc-ri-2026', url: '/jobs/osssc-ri-2026', title: 'OSSSC RI 2026' }
  ]),
  cso_candidate_watchlist_v1: JSON.stringify({
    districts: ['cuttack', 'kalahandi'],
    tracks: ['teaching-tet'],
    keywords: ['OTET']
  }),
  cso_study_streak_planner_v1: JSON.stringify({
    dailyTarget: 50,
    bestStreak: 1,
    days: {
      '2026-11-27': { mcqs: 30, correct: 25, sessions: 2 },
      '2026-11-25': { mcqs: 10, correct: 8, sessions: 1 }
    },
    topics: { 'odisha-gk': { attempted: 10, correct: 7 } },
    planByDate: { '2026-11-28': 'Current Affairs' }
  })
});

const mergeRes = api.importCandidateBackupPayload(JSON.stringify(exported), 'merge', storageB);
assert.equal(mergeRes.ok, true);
assert.equal(mergeRes.mode, 'merge');
const afterMerge = api.buildCandidateBackupPayload(storageB).data;
assert.equal(afterMerge.savedAlerts.length, 3, 'Merge must deduplicate opsc-oas-2026 and keep 3 unique alerts');
assert.equal(afterMerge.watchlist.districts.length, 3, 'Merge must union cuttack + kalahandi + khordha');
assert.equal(afterMerge.studyStreak.days['2026-11-27'].mcqs, 30, 'Merge must take Math.max(30, 15) = 30 MCQs');
assert.equal(afterMerge.studyStreak.days['2026-11-26'].mcqs, 20, 'Merge must import missing day 2026-11-26');
assert.equal(afterMerge.studyStreak.bestStreak, 3, 'Merge must recompute 3-day consecutive streak (Nov 25, 26, 27)');
assert.equal(afterMerge.studyStreak.planByDate['2026-11-27'], 'ଓଡ଼ିଶା GK · Odisha GK');
assert.equal(afterMerge.studyStreak.planByDate['2026-11-28'], 'Current Affairs');

// 6. Test Full Replace mode
const replaceRes = api.importCandidateBackupPayload(JSON.stringify(exported), 'replace', storageB);
assert.equal(replaceRes.ok, true);
assert.equal(replaceRes.mode, 'replace');
const afterReplace = api.buildCandidateBackupPayload(storageB).data;
assert.equal(afterReplace.savedAlerts.length, 2, 'Replace must overwrite saved alerts to exact backup count');
assert.deepEqual(Array.from(afterReplace.watchlist.districts), ['kalahandi', 'khordha']);
assert.equal(afterReplace.studyStreak.days['2026-11-27'].mcqs, 15);
assert.equal(afterReplace.studyStreak.days['2026-11-25'], undefined);

// 7. Test encodeStudyPack / decodeStudyPack UTF-8 Odia + English round-trip
const token = api.encodeStudyPack(exported);
assert.ok(token.length > 10 && /^[A-Za-z0-9_-]+$/.test(token), 'Study-Pack token must be URL-safe Base64');
const decoded = api.decodeStudyPack(token);
assert.equal(decoded.ok, true);
assert.deepEqual(Array.from(decoded.data.watchlist.districts), ['kalahandi', 'khordha']);
assert.equal(decoded.data.studyStreak.dailyTarget, 25);
assert.equal(decoded.data.studyStreak.planByDate['2026-11-27'], 'ଓଡ଼ିଶା GK · Odisha GK', 'UTF-8 Odia revision focus must round-trip cleanly');

const packUrl = api.buildShareablePackUrl(exported);
assert.ok(packUrl.startsWith('https://csodisha.com/tools/?pack='), 'Shareable URL must target /tools/?pack=');
const decodedFromUrl = api.decodeStudyPack(packUrl);
assert.equal(decodedFromUrl.ok, true, 'decodeStudyPack must also accept full share URL');

// 8. HTML mount, CSS tokens & SW / Ops-Sentinel sync
assert.ok(htmlSrc.includes('id="cso-candidate-data-backup-root"'), 'tools/index.html must mount #cso-candidate-data-backup-root');
assert.ok(htmlSrc.includes('/assets/js/candidate-data-backup.js?v=20261127v436'), 'tools/index.html must load candidate-data-backup.js?v=20261127v436');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v436'"), 'sw.js must bump CACHE_NAME to v419');
assert.ok(swSrc.includes("'/assets/js/candidate-data-backup.js?v=20261127v436'"), 'sw.js must precache candidate-data-backup.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v436'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v419');

const cdbCssIdx = cssSrc.indexOf('/* ===== v419:');
assert.ok(cdbCssIdx !== -1, 'assets/style.css must contain v419 .cso-cdb-* CSS block');
const cdbCssBlock = cssSrc.slice(cdbCssIdx);
assert.ok(cdbCssBlock.includes('.cso-cdb-wrap') && cdbCssBlock.includes('var(--cso-'), 'CSS must style .cso-cdb-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(cdbCssBlock), 'v419 .cso-cdb-* CSS block must have zero hardcoded hex colors');
assert.ok(cdbCssBlock.includes('prefers-reduced-motion'), 'v419 CSS must include prefers-reduced-motion guard');
assert.ok(cdbCssBlock.includes('@media print'), 'v419 CSS must include @media print rules');

console.log('✅ v419 Candidate Profile JSON Backup, Restore & Shareable Study-Pack Audit PASSED');
