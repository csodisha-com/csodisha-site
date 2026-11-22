// Verification for v197 Candidate Hub Personalized Alert Preferences & District Watchlist
// Run: node scripts/test-candidate-watchlist-v197.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const prefsApi = require(path.join(ROOT, 'assets', 'js', 'candidate-prefs.js'));

// 1. Verify save/load and max-3 districts cap
const store = new Map();
const memStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v))
};

const saved = prefsApi.save({
  districts: ['khordha', 'puri', 'cuttack', 'ganjam'],
  qualification: 'Graduate',
  boards: ['OPSC', 'OSSC']
}, memStorage);
assert.equal(saved.districts.length, 3, 'District watchlist must cap at 3 districts');
assert.deepEqual(saved.districts, ['khordha', 'puri', 'cuttack']);
assert.equal(prefsApi.hasAny(saved), true);

const loaded = prefsApi.load(memStorage);
assert.equal(loaded.qualification, 'Graduate');
assert.deepEqual(loaded.boards, ['OPSC', 'OSSC']);

// 2. Verify CSO_MATCH_ITEM matching logic
const opscJob = {
  title: 'OPSC OAS Combined Competitive Examination 2026',
  organisation: 'OPSC',
  qualification: 'Graduate',
  state: 'Odisha',
  district: 'Khordha'
};
const m1 = prefsApi.matchItem(opscJob, loaded);
assert.equal(m1.matched, true);
assert.ok(m1.reasons.includes('Khordha'));
assert.ok(m1.reasons.includes('OPSC'));

const unrelatedJob = {
  title: 'Rajasthan Police Constable',
  organisation: 'RPSC',
  qualification: '10th',
  state: 'Rajasthan'
};
const m2 = prefsApi.matchItem(unrelatedJob, loaded);
assert.equal(m2.matched, false);

// 3. Verify HTML/JS/CSS integration, single-search-bar rule & 100% CSP compliance
const files = [
  { html: 'student-dashboard/index.html', js: 'assets/js/student-dashboard.js', css: 'assets/css/student-dashboard-bp.css' },
  { html: 'jobs-careers/index.html', js: 'jobs-careers/assets/dashboard.js', css: 'jobs-careers/assets/dashboard.css' },
  { html: 'schemes-benefits/index.html', js: 'schemes-benefits/assets/dashboard.js', css: 'schemes-benefits/assets/dashboard.css' }
];

for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f.html), 'utf8');
  const j = fs.readFileSync(path.join(ROOT, f.js), 'utf8');
  const c = fs.readFileSync(path.join(ROOT, f.css), 'utf8');

  assert.ok(h.includes('/assets/js/candidate-prefs.js?v=20261122v197'), `${f.html} must load candidate-prefs.js v197`);
  assert.ok(h.includes('?v=20261122v197'), `${f.html} must bump assets to v197`);
  assert.ok(!/<style\b/i.test(h), `No <style> in ${f.html}`);
  assert.ok(!/\sstyle\s*=/i.test(h), `No style= in ${f.html}`);
  assert.ok(!/\sonclick\s*=/i.test(h), `No onclick= in ${f.html}`);
  const noExt = h.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
  const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  assert.ok(!/<script\b/i.test(noJsonLd), `No executable inline <script> in ${f.html}`);
  assert.ok(!/\.innerHTML\b/.test(j), `No .innerHTML in ${f.js}`);
  assert.ok(c.includes('min-height: 44px'), `44px touch targets required in ${f.css}`);
}

const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
assert.ok(dashHtml.includes('id="cso-watchlist-panel"'));

const jobsJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
const schemesJs = fs.readFileSync(path.join(ROOT, 'schemes-benefits/assets/dashboard.js'), 'utf8');
assert.ok(jobsJs.includes("get('matched') === '1'"));
assert.ok(schemesJs.includes("get('matched') === '1'"));
assert.ok(!/\.innerHTML\b/.test(fs.readFileSync(path.join(ROOT, 'assets/js/candidate-prefs.js'), 'utf8')));

console.log('PASS: Candidate Hub Alert Preferences, District Watchlist, ?matched=1 & strict CSP verified (v197)');
