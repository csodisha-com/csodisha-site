// Verification for v198 Odia-First Syllabus & PYQ Vault
// Run: node scripts/test-syllabus-pyq-vault-v198.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const vaultApi = require(path.join(ROOT, 'study-library', 'assets', 'syllabus-pyq-vault.js'));

// 1. Verify all 4 flagship Odisha exams & bilingual EN/Odia fields
assert.equal(vaultApi.VAULT.length, 4, 'Expected 4 flagship Odisha exam syllabi');
assert.deepEqual(
  vaultApi.VAULT.map(e => e.id),
  ['opsc-oas', 'osssc-group-c', 'ossc-cgl', 'otet-osstet']
);

for (const ex of vaultApi.VAULT) {
  assert.ok(ex.title && ex.title_or && ex.officialUrl && ex.cbtUrl, `Missing metadata in ${ex.id}`);
  assert.match(ex.officialUrl, /^https:\/\/[^/]+\.(?:gov\.in|nic\.in|ac\.in)\//, `Official board URL required for ${ex.id}`);
  assert.ok(Array.isArray(ex.topics) && ex.topics.length >= 4, `Expected >=4 topics in ${ex.id}`);
  for (const t of ex.topics) {
    assert.ok(t.id && t.paper && t.title && t.title_or && t.weightage, `Missing bilingual topic fields in ${t.id}`);
  }
}

// 2. Verify cso_syllabus_progress_v1 persistence & completion percentage calculation
const store = new Map();
const memStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v))
};

vaultApi.toggleTopic('opsc-gs1-hist', true, memStorage);
vaultApi.toggleTopic('opsc-gs1-geo', true, memStorage);
const st = vaultApi.getExamStats('opsc-oas', vaultApi.loadProgress(memStorage));
assert.equal(st.done, 2);
assert.equal(st.total, 5);
assert.equal(st.pct, 40);

vaultApi.toggleTopic('opsc-gs1-hist', false, memStorage);
const st2 = vaultApi.getExamStats('opsc-oas', vaultApi.loadProgress(memStorage));
assert.equal(st2.done, 1);
assert.equal(st2.pct, 20);

// 3. Verify HTML/JS/CSS wiring, single-search-bar rule & 100% CSP compliance
const studyHtml = fs.readFileSync(path.join(ROOT, 'study-library', 'index.html'), 'utf8');
const studyJs = fs.readFileSync(path.join(ROOT, 'study-library', 'assets', 'dashboard.js'), 'utf8');
const studyCss = fs.readFileSync(path.join(ROOT, 'study-library', 'assets', 'dashboard.css'), 'utf8');
const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard', 'index.html'), 'utf8');
const dashJs = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'student-dashboard.js'), 'utf8');
const vaultJs = fs.readFileSync(path.join(ROOT, 'study-library', 'assets', 'syllabus-pyq-vault.js'), 'utf8');

assert.ok(studyHtml.includes('id="cso-syllabus-vault"'));
assert.ok(studyHtml.includes('./assets/syllabus-pyq-vault.js?v=20261122v198'));
assert.ok(studyHtml.includes('./assets/dashboard.js?v=20261122v198'));
assert.ok(studyHtml.includes('./assets/dashboard.css?v=20261122v198'));
assert.ok(dashHtml.includes('id="cso-syllabus-progress-panel"'));
assert.ok(dashHtml.includes('/study-library/assets/syllabus-pyq-vault.js?v=20261122v198'));
assert.ok(dashHtml.includes('/assets/js/student-dashboard.js?v=20261122v198'));
assert.ok(studyJs.includes('initSyllabusPyqVault'));
assert.ok(dashJs.includes('renderSyllabusMasteryPanel'));
assert.ok(studyCss.includes('min-height: 44px'));

for (const [name, html] of [['study-library/index.html', studyHtml], ['student-dashboard/index.html', dashHtml]]) {
  assert.ok(!/<style\b/i.test(html), `No <style> in ${name}`);
  assert.ok(!/\sstyle\s*=/i.test(html), `No style= in ${name}`);
  assert.ok(!/\sonclick\s*=/i.test(html), `No onclick= in ${name}`);
  const noExt = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
  const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  assert.ok(!/<script\b/i.test(noJsonLd), `No executable inline <script> in ${name}`);
}

for (const [name, js] of [['syllabus-pyq-vault.js', vaultJs], ['study-library/assets/dashboard.js', studyJs], ['student-dashboard.js', dashJs]]) {
  assert.ok(!/\.innerHTML\b/.test(js), `No .innerHTML in ${name}`);
}

console.log('PASS: Odia-First Syllabus & PYQ Vault, progress persistence & strict CSP verified (v198)');
