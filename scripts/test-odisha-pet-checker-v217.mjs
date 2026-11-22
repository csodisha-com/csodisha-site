// Verification test for Odisha Uniformed Services PET & Physical Standards Checker (v217)
// Run: node scripts/test-odisha-pet-checker-v217.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Verify tools/index.html & student-dashboard/index.html markup & v217 asset bumps
console.log('1. Checking tools/index.html & student-dashboard/index.html markup...');
const toolsHtml = fs.readFileSync(path.join(ROOT, 'tools/index.html'), 'utf8');
assert.ok(toolsHtml.includes('id="odisha-pet-checker"'), 'Missing #odisha-pet-checker');
assert.ok(toolsHtml.includes('id="pet-force"'), 'Missing #pet-force');
assert.ok(toolsHtml.includes('id="pet-gender"'), 'Missing #pet-gender');
assert.ok(toolsHtml.includes('id="pet-category"'), 'Missing #pet-category');
assert.ok(toolsHtml.includes('id="pet-height"'), 'Missing #pet-height');
assert.ok(toolsHtml.includes('id="pet-weight"'), 'Missing #pet-weight');
assert.ok(toolsHtml.includes('id="pet-chest-unexp"'), 'Missing #pet-chest-unexp');
assert.ok(toolsHtml.includes('id="pet-chest-exp"'), 'Missing #pet-chest-exp');
assert.ok(toolsHtml.includes('id="pet-result"'), 'Missing #pet-result');
assert.ok(toolsHtml.includes('id="pet-log-form"'), 'Missing #pet-log-form');
assert.ok(toolsHtml.includes('tools.css?v=20261122v217'), 'Missing ?v=20261122v217 on tools.css');
assert.ok(toolsHtml.includes('tools.js?v=20261122v217'), 'Missing ?v=20261122v217 on tools.js');

for (const f of ['police-si', 'police-constable', 'forest-guard', 'excise']) {
  assert.ok(toolsHtml.includes(`value="${f}"`), `Missing force option ${f}`);
}

const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
assert.ok(dashHtml.includes('href="/tools/#odisha-pet-checker"'), 'Missing cross-link to /tools/#odisha-pet-checker');

// 2. Unit test evaluateOdishaPetStandards across all 4 forces, Male/Female, General/SEBC vs SC/ST
console.log('2. Testing evaluateOdishaPetStandards across 4 forces, gender, category & chest expansion...');
const toolsMod = require(path.join(ROOT, 'tools/assets/tools.js'));
assert.equal(toolsMod.PET_LOG_KEY, 'cso_pet_practice_log_v1');
assert.equal(Object.keys(toolsMod.ODISHA_PET_STANDARDS).length, 4);

// Male Police SI General/SEBC passing
const maleSiPass = toolsMod.evaluateOdishaPetStandards({
  force: 'police-si', gender: 'Male', category: 'General / SEBC',
  heightCm: 170, weightKg: 60, chestUnexpCm: 80, chestExpCm: 85
});
assert.equal(maleSiPass.eligible, true);
assert.equal(maleSiPass.checks.chestExpansion, 5);
assert.ok(maleSiPass.petEvents.some(e => e.includes('1600m')));

// Male Police Constable failing chest expansion (< 5 cm)
const maleConstFail = toolsMod.evaluateOdishaPetStandards({
  force: 'police-constable', gender: 'Male', category: 'General / SEBC',
  heightCm: 170, weightKg: 60, chestUnexpCm: 80, chestExpCm: 83
});
assert.equal(maleConstFail.eligible, false);
assert.equal(maleConstFail.checks.chestOk, false);
assert.equal(maleConstFail.checks.chestExpansion, 3);

// Male Forest Guard SC/ST relaxation (158 cm)
const fgStPass = toolsMod.evaluateOdishaPetStandards({
  force: 'forest-guard', gender: 'Male', category: 'SC / ST',
  heightCm: 159, weightKg: 46, chestUnexpCm: 77, chestExpCm: 83
});
assert.equal(fgStPass.eligible, true);

// Female Excise SC/ST (chest ignored)
const femExcisePass = toolsMod.evaluateOdishaPetStandards({
  force: 'excise', gender: 'Female', category: 'SC / ST',
  heightCm: 151, weightKg: 46, chestUnexpCm: 0, chestExpCm: 0
});
assert.equal(femExcisePass.eligible, true);
assert.equal(femExcisePass.checks.chestOk, true);

// 3. Test cso_pet_practice_log_v1 persistence
console.log('3. Testing cso_pet_practice_log_v1 persistence...');
const mem = new Map();
const fakeStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v))
};
toolsMod.addPetPracticeRun({ event: '1600m Run', value: '6m 40s', date: '2026-11-22' }, fakeStorage);
toolsMod.addPetPracticeRun({ event: '3200m Run', value: '14m 10s', date: '2026-11-22' }, fakeStorage);
let logged = toolsMod.loadPetPracticeLog(fakeStorage);
assert.equal(logged.length, 2);
assert.equal(logged[0].event, '3200m Run');
logged = toolsMod.removePetPracticeRun(0, fakeStorage);
assert.equal(logged.length, 1);
assert.equal(logged[0].event, '1600m Run');

// 4. Verify 44px touch targets & CSS styles
console.log('4. Checking tools/assets/tools.css styles...');
const toolsCss = fs.readFileSync(path.join(ROOT, 'tools/assets/tools.css'), 'utf8');
assert.ok(toolsCss.includes('.cso-pet-log-row'), 'Missing .cso-pet-log-row');
assert.ok(toolsCss.includes('min-height: 44px'), 'Missing 44px touch target');

// 5. Verify master navigation 23 folders / 299 modules
console.log('5. Checking admin/data/master-navigation.json (23 folders / 299 modules)...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 6. Strict CSP compliance across touched files
console.log('6. Checking 100% CSP compliance across touched files...');
const touched = [
  'tools/index.html',
  'tools/assets/tools.js',
  'tools/assets/tools.css',
  'student-dashboard/index.html'
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

// 7. Verify cache version bump to cso-candidate-cache-v217
console.log('7. Checking cache version bump to cso-candidate-cache-v217...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v217';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v217';"));

console.log('All v217 Odisha Uniformed Services PET & Physical Standards Checker tests PASSED!');
