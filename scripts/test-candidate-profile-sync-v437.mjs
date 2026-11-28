#!/usr/bin/env node
/**
 * v437 Test Suite — Interactive Candidate Profile Auto-Fill & Cross-Tool Sync Bar
 * (/tools/, /jobs/, /exams/, /results/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. Load module in clean sandbox with mock localStorage & CustomEvent
const store = {};
const dispatched = [];
const sandbox = {
  window: {},
  globalThis: {},
  console,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  },
  CustomEvent: class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; }
  },
  dispatchEvent: (ev) => { dispatched.push(ev); }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const jsCode = read('assets/js/candidate-profile-sync-bar.js');
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOCandidateProfileSyncBar;

assert.ok(api, 'window.CSOCandidateProfileSyncBar must be exposed');
assert.equal(api.VERSION, 'v437');
assert.equal(api.ROOT_ID, 'cso-candidate-profile-sync-root');
assert.equal(api.PROFILE_KEY, 'cso_unified_candidate_profile_v1');
assert.equal(api.ODISHA_DISTRICTS.length, 30, 'Must include all 30 Odisha districts');

// 2. Verify syncProfileAcrossTools propagates to all downstream localStorage keys & emits CustomEvent
const res = api.syncProfileAcrossTools({
  dob: '1997-08-15',
  category: 'sc',
  gender: 'female',
  homeDistrict: 'Sambalpur',
  qualification: 'bed-deled',
  pwbd: true
});

assert.equal(res.syncedCount, 5);
const unified = JSON.parse(store.cso_unified_candidate_profile_v1);
assert.equal(unified.dob, '1997-08-15');
assert.equal(unified.category, 'sc');
assert.equal(unified.gender, 'female');
assert.equal(unified.homeDistrict, 'Sambalpur');
assert.equal(unified.qualification, 'bed-deled');
assert.equal(unified.pwbd, true);

const mp = JSON.parse(store.cso_multi_post_profile_v1);
assert.equal(mp.dob, '1997-08-15');
assert.equal(mp.category, 'sc');
assert.equal(mp.gender, 'female');
assert.equal(mp.qualification, 'bed-deled');
assert.equal(mp.pwbd, true);

const pet = JSON.parse(store.cso_pet_pst_prefs_v1);
assert.equal(pet.gender, 'female');
assert.equal(pet.category, 'sc-st');

const tec = JSON.parse(store.cso_teacher_eligibility_prefs_v1);
assert.equal(tec.category, 'sc-st-sebc-pwbd');
assert.equal(tec.pwbd, true);

const dec = JSON.parse(store.cso_district_exam_center_prefs_v1);
assert.equal(dec.homeDistrict, 'sambalpur');

assert.ok(dispatched.some((e) => e.type === 'cso:profile-synced'), 'Must dispatch cso:profile-synced CustomEvent');

// 3. Verify strict CSP, mounts on all 4 hubs (/tools/, /jobs/, /exams/, /results/), quick-jump, 4-theme CSS & SW sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode), 'JS must not mutate .style.*');

for (const htmlPath of ['tools/index.html', 'jobs/index.html', 'exams/index.html', 'results/index.html']) {
  const html = read(htmlPath);
  const mounts = html.match(/id=["']cso-candidate-profile-sync-root["']/g) || [];
  assert.equal(mounts.length, 1, `${htmlPath} must have exactly one #cso-candidate-profile-sync-root`);
  assert.ok(html.includes('/assets/js/candidate-profile-sync-bar.js?v=20261128v453'), `${htmlPath} must load candidate-profile-sync-bar.js?v=20261128v453`);
  assert.ok(!/\son[a-z]+\s*=/i.test(html), `${htmlPath} must have zero inline on* attributes`);
  assert.ok(!/\sstyle\s*=/i.test(html), `${htmlPath} must have zero inline style attributes`);
}

const qj = read('assets/js/tools-quick-jump-directory.js');
assert.ok(qj.includes('cso-candidate-profile-sync-root'), 'tools-quick-jump-directory.js must register #cso-candidate-profile-sync-root');

const css = read('assets/style.css');
const cpsIdx = css.indexOf('v437: Unified Candidate Profile Auto-Fill');
assert.ok(cpsIdx > 0, 'assets/style.css must contain v437 .cso-cps-* CSS block');
const cpsBlock = css.slice(cpsIdx);
assert.ok(cpsBlock.includes('.cso-cps-card'), 'CSS must style .cso-cps-card');
assert.ok(cpsBlock.includes('var(--cso-'), 'CSS must use semantic var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(cpsBlock), 'v437 CSS block must have zero hardcoded hex colors');

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v453'"), 'sw.js CACHE_NAME must be cso-candidate-cache-v453');
assert.ok(sw.includes('/assets/js/candidate-profile-sync-bar.js?v=20261128v453'), 'sw.js must pre-cache candidate-profile-sync-bar.js?v=20261128v453');

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v453'"), 'ops-sentinel.js must match cso-candidate-cache-v453');

console.log('✅ v437 Unified Candidate Profile Auto-Fill & Cross-Tool Sync Bar tests passed!');
