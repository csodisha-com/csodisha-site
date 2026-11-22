// Verification test for Candidate Hub Offline JSON Backup & Cross-Device Restore (v213)
// Run: node scripts/test-candidate-backup-v213.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Verify student-dashboard/index.html markup & v213 asset bumps
console.log('1. Checking student-dashboard/index.html markup & v213 asset bumps...');
const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
assert.ok(dashHtml.includes('id="cso-candidate-backup-panel"'), 'Missing #cso-candidate-backup-panel');
assert.ok(dashHtml.includes('student-dashboard-bp.css?v=20261122v213'), 'Missing ?v=20261122v213 on student-dashboard-bp.css');
assert.ok(dashHtml.includes('student-dashboard.js?v=20261122v213'), 'Missing ?v=20261122v213 on student-dashboard.js');

// 2. Verify assets/js/student-dashboard.js backup & restore logic
console.log('2. Testing cso-candidate-v1 export, validation & strict allowlisting...');
const dashJs = fs.readFileSync(path.join(ROOT, 'assets/js/student-dashboard.js'), 'utf8');
assert.ok(dashJs.includes("BACKUP_SCHEMA_VERSION = 'cso-candidate-v1'"), 'Missing schemaVersion cso-candidate-v1');
assert.ok(dashJs.includes('buildCandidateBackupPayload'), 'Missing buildCandidateBackupPayload');
assert.ok(dashJs.includes('restoreCandidateBackupPayload'), 'Missing restoreCandidateBackupPayload');
assert.ok(dashJs.includes('renderCandidateBackupPanel'), 'Missing renderCandidateBackupPanel');

const EXPECTED_KEYS = [
  'cso_tracked_deadlines_v1',
  'cso_doc_readiness_v1',
  'cso_syllabus_progress_v1',
  'cso_exam_day_bag_v1',
  'cso_saved_schemes_v1',
  'cso_candidate_alert_prefs_v1',
  'cso_ca_quiz_streak_v1',
  'cso_cbt_history_v1'
];
for (const k of EXPECTED_KEYS) {
  assert.ok(dashJs.includes(`'${k}'`), `Missing backup allowlist key ${k}`);
}

// Extract backup/restore slice and run in isolated VM
const sliceStart = dashJs.indexOf("  const BACKUP_SCHEMA_VERSION = 'cso-candidate-v1';");
const sliceEnd = dashJs.indexOf('  function renderSyllabusMasteryPanel()');
const snippet = dashJs.slice(sliceStart, sliceEnd);

const syncCalls = [];
function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v))
  };
}

const sourceStore = makeStorage({
  cso_tracked_deadlines_v1: JSON.stringify([{ id: 'opsc-1', title: 'OPSC OCS' }]),
  cso_doc_readiness_v1: JSON.stringify({ checked: { 'hsc-10th': true } }),
  cso_syllabus_progress_v1: JSON.stringify({ 'opsc-oas': { 'opsc-gs1-hist': true } }),
  cso_exam_day_bag_v1: JSON.stringify({ admit_card: true }),
  cso_saved_schemes_v1: JSON.stringify([{ id: 'subhadra-yojana', title: 'Subhadra Yojana' }]),
  cso_candidate_alert_prefs_v1: JSON.stringify({ districts: ['khordha'] }),
  cso_ca_quiz_streak_v1: JSON.stringify({ streak: 5 }),
  cso_cbt_history_v1: JSON.stringify([{ examLabel: 'OSSC Mock' }]),
  unrelated_secret_key: 'should-never-be-exported'
});

const targetStore = makeStorage();
const ctx = vm.createContext({
  localStorage: targetStore,
  console,
  Date,
  Object,
  Array,
  JSON,
  fetch: async (url, opts) => {
    syncCalls.push({ url, opts });
    return { ok: true };
  }
});

vm.runInContext(`
  function clear(n){ while(n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function el(t, c, txt){ return { tagName: t, className: c || '', textContent: txt || '', children: [], appendChild(){}, setAttribute(){} }; }
  function renderReadinessSummaryCard(){}
  function renderTrackedDeadlinesPanel(){}
  function renderDocumentReadinessPanel(){}
  function renderSavedSchemesPanel(){}
  function renderSyllabusMasteryPanel(){}
  const document = { getElementById: () => null, createElement: t => el(t), body: { appendChild(){} } };
  ${snippet}
  globalThis.__api = { buildCandidateBackupPayload, restoreCandidateBackupPayload, BACKUP_ALLOWED_KEYS };
`, ctx);

const exported = ctx.__api.buildCandidateBackupPayload(sourceStore);
assert.equal(exported.schemaVersion, 'cso-candidate-v1');
assert.equal(Object.keys(exported.data).length, 8);
assert.equal(exported.data.unrelated_secret_key, undefined, 'Non-allowlisted keys must never be exported');

// Reject corrupt JSON
const badJson = ctx.__api.restoreCandidateBackupPayload('{not-json', targetStore);
assert.equal(badJson.ok, false);

// Reject wrong schemaVersion
const badSchema = ctx.__api.restoreCandidateBackupPayload(JSON.stringify({ schemaVersion: 'wrong-v99', data: {} }), targetStore);
assert.equal(badSchema.ok, false);

// Inject malicious extra key and verify strict allowlist
exported.data.malicious_key = 'injected';
exported.data.__proto__ = { polluted: true };
const restored = ctx.__api.restoreCandidateBackupPayload(JSON.stringify(exported), targetStore);
assert.equal(restored.ok, true);
assert.equal(restored.restoredCount, 8);
assert.equal(targetStore.getItem('malicious_key'), null, 'Non-allowlisted keys must NOT be written to localStorage');
assert.equal(JSON.parse(targetStore.getItem('cso_ca_quiz_streak_v1')).streak, 5);
assert.equal(syncCalls.length, 1, 'Restore should trigger best-effort POST /api/sync');
assert.equal(syncCalls[0].url, '/api/sync');

// 3. Verify 44px touch targets & CSS styles in assets/css/student-dashboard-bp.css
console.log('3. Checking 44px touch targets & backup styles in student-dashboard-bp.css...');
const dashCss = fs.readFileSync(path.join(ROOT, 'assets/css/student-dashboard-bp.css'), 'utf8');
assert.ok(dashCss.includes('.cso-backup-btn'), 'Missing .cso-backup-btn');
assert.ok(dashCss.includes('min-height: 44px'), 'Missing 44px touch targets');
assert.ok(dashCss.includes('.cso-backup-status.is-error'), 'Missing error status style');

// 4. Verify master navigation 23 folders / 299 modules
console.log('4. Checking admin/data/master-navigation.json (23 folders / 299 modules)...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 5. Strict CSP compliance across touched files
console.log('5. Checking 100% CSP compliance across touched files...');
const touched = [
  'student-dashboard/index.html',
  'assets/js/student-dashboard.js',
  'assets/css/student-dashboard-bp.css'
];
for (const rel of touched) {
  const c = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.ok(!/\sstyle\s*=/i.test(c), `${rel} must have 0 style="" attributes`);
  assert.ok(!/\sonclick\s*=/i.test(c), `${rel} must have 0 onclick= attributes`);
  if (rel.endsWith('.js')) {
    assert.ok(!/\.innerHTML\s*=/.test(c), `${rel} must have 0 .innerHTML assignments`);
  }
  if (rel.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(c), `${rel} must have 0 inline <style>`);
    const noExt = c.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
    const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(!/<script\b/i.test(noJsonLd), `${rel} must have 0 executable inline <script>`);
  }
}

// 6. Verify cache version bump to cso-candidate-cache-v213
console.log('6. Checking cache version bump to cso-candidate-cache-v213...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v213';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v213';"));

console.log('All v213 Candidate Hub Offline JSON Backup & Cross-Device Restore tests PASSED!');
