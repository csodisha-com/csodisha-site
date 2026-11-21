// v177: Unified Candidate Hub Verification.
// Usage: node scripts/test-candidate-hub-v177.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const hub = require(path.join(root, 'assets/js/candidate-hub-unified.js'));
const hubSrc = read('assets/js/candidate-hub-unified.js');
const bpCss = read('assets/css/student-dashboard-bp.css');
const dashHtml = read('student-dashboard/index.html');

// 1. Profile & 30 Odisha Districts + Eligibility Match
ok(hub.DISTRICTS.length === 30, 'Contains all 30 Odisha districts');
const m1 = hub.evaluateMatch({ title: 'Cuttack District Teacher Recruitment', qualification: 'Graduate' }, { qualification: 'Graduate', district: 'Cuttack' });
ok(m1.eligible && m1.districtMatch, 'evaluateMatch detects eligible & district match');
const m2 = hub.evaluateMatch({ title: 'Graduate Officer Post', qualification: 'Graduate' }, { qualification: '10th', district: 'Puri' });
ok(!m2.eligible && !m2.districtMatch, 'evaluateMatch filters out mismatched qualification');

// 2. Deadline Countdown Calculation
const baseNow = Date.parse('2026-11-21T10:00:00Z');
ok(hub.computeDaysLeft('2026-11-21', baseNow) === 0 && hub.formatCountdownLabel(0) === 'Closing Today', 'Closing Today countdown accurate');
ok(hub.computeDaysLeft('2026-11-26', baseNow) === 5 && hub.formatCountdownLabel(5) === '5 days left', 'X days left countdown accurate');
ok(hub.computeDaysLeft('2026-11-19', baseNow) === -2 && hub.formatCountdownLabel(-2) === 'Closed', 'Past deadline labeled Closed');

// 3. Revise Again Deck, Quick Toolkit & JSON Backup/Restore Validation
ok(hubSrc.includes('cso_study_mistake_deck') && hubSrc.includes('cso_study_lang_mode') && hubSrc.includes('Revise Again ('), 'Integrates Study Revise Again & lang mode');
ok(hubSrc.includes('/tools/#photo-resizer') && hubSrc.includes('/tools/#age-calculator') && hubSrc.includes('/tools/#scam-checker'), 'Includes Quick Student Toolkit links');

const store = new Map();
const mockSt = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); }
};
mockSt.setItem('cso_eligibility_profile', JSON.stringify({ age: 24, qualification: 'Graduate', category: 'UR', district: 'Khordha' }));
mockSt.setItem('cso_study_mistake_deck', JSON.stringify([{ id: 'm1', q: 'Test Q', a: 'Test A' }]));
mockSt.setItem('cso_study_lang_mode', 'dual');
const exported = hub.buildBackupPayload(mockSt);
ok(exported.version === 177 && exported.cso_eligibility_profile.district === 'Khordha' && exported.cso_study_mistake_deck.length === 1, 'buildBackupPayload exports all hub keys');

ok(!hub.validateBackupPayload({ foo: 'bar' }).ok, 'validateBackupPayload rejects unrelated JSON');
ok(!hub.validateBackupPayload({ cso_study_lang_mode: 'xx' }).ok, 'validateBackupPayload rejects invalid lang mode');

const restoreTarget = new Map();
const mockRestoreSt = {
  getItem: (k) => (restoreTarget.has(k) ? restoreTarget.get(k) : null),
  setItem: (k, v) => { restoreTarget.set(k, String(v)); },
  removeItem: (k) => { restoreTarget.delete(k); }
};
ok(hub.restoreBackupPayload(exported, mockRestoreSt).ok, 'restoreBackupPayload restores valid backup');
ok(JSON.parse(restoreTarget.get('cso_eligibility_profile')).district === 'Khordha' && restoreTarget.get('cso_study_lang_mode') === 'dual', 'Restored values match exported backup');

// 4. Theme uniformity, 44px touch targets & 100% CSP compliance
ok(bpCss.includes('.cso-uh-card') && bpCss.includes('var(--cso-surface') && bpCss.includes('var(--cso-text'), 'v177 CSS uses --cso-* theme tokens');
ok(/\.cso-uh-btn\s*\{[\s\S]*?min-height:\s*44px/.test(bpCss), 'v177 buttons enforce 44px minimum touch targets');
ok(dashHtml.includes('id="cso-unified-hub-root"'), 'student-dashboard/index.html mounts #cso-unified-hub-root');

ok(!/<style[\s>]/i.test(dashHtml), 'student-dashboard/index.html: zero inline <style>');
ok(!/\sstyle\s*=/i.test(dashHtml), 'student-dashboard/index.html: zero style="" attributes');
ok(!/<[^>]*\son[a-z]+\s*=/i.test(dashHtml), 'student-dashboard/index.html: zero inline event handlers');
for (const m of dashHtml.matchAll(/<script\b([^>]*)>/gi)) {
  ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), 'student-dashboard/index.html: zero executable inline <script>');
}
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(hubSrc), 'candidate-hub-unified.js: zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(hubSrc), 'candidate-hub-unified.js: zero onclick=');

// 5. Asset & Cache bumps (v177)
ok(dashHtml.includes('/assets/css/student-dashboard-bp.css?v=20261121v177'), 'student-dashboard/index.html references student-dashboard-bp.css v177');
ok(dashHtml.includes('/assets/js/candidate-hub-unified.js?v=20261121v177'), 'student-dashboard/index.html references candidate-hub-unified.js v177');
ok(/CACHE_NAME = 'cso-candidate-cache-v177'/.test(read('sw.js')), 'sw.js bumped to v177');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v177'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v177');
ok(/cso-candidate-cache-v177/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v177');

console.log(`test-candidate-hub-v177: ${passed} assertions passed`);
