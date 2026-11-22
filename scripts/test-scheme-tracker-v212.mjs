// Verification test for Live Odisha Govt Scheme Eligibility Finder & Saved Schemes Tracker (v212)
// Run: node scripts/test-scheme-tracker-v212.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// 1. Test assets/js/scheme-tracker.js live filtering & cso_saved_schemes_v1 persistence
console.log('1. Testing assets/js/scheme-tracker.js live filtering & persistence...');
const tracker = require(path.join(ROOT, 'assets/js/scheme-tracker.js'));
assert.equal(tracker.STORAGE_KEY, 'cso_saved_schemes_v1');

const sampleLiveSchemes = [
  {
    id: 'subhadra-yojana',
    slug: 'subhadra-yojana',
    title: 'Subhadra Yojana',
    department_name: 'Women & Child Development Dept',
    scheme_type: 'state_scheme',
    beneficiary_group: 'Women',
    benefit_amount: '₹10,000/year',
    summary: 'Financial assistance for eligible women empowerment in Odisha (All Categories).',
    official_apply_url: 'https://subhadra.odisha.gov.in/'
  },
  {
    id: 'post-matric-sc-st',
    slug: 'post-matric-sc-st',
    title: 'Post-Matric Scholarship for SC & ST Students',
    department_name: 'ST & SC Development Dept',
    scheme_type: 'scholarship',
    beneficiary_group: 'SC/ST Students',
    benefit_amount: 'Full Tuition + Maintenance',
    summary: 'State scholarship for SC / ST students pursuing higher education.',
    official_apply_url: 'https://scholarship.odisha.gov.in/'
  },
  {
    id: 'cm-kisan-odisha',
    slug: 'cm-kisan-odisha',
    title: 'CM-KISAN (KALIA) Assistance',
    department_name: 'Agriculture & Farmers Empowerment',
    scheme_type: 'state_scheme',
    beneficiary_group: 'Farmers',
    benefit_amount: '₹4,000/year',
    summary: 'Direct income support for small and marginal farmers across all categories.',
    official_apply_url: 'https://cmkisan.odisha.gov.in/'
  },
  {
    id: 'swayam-youth',
    slug: 'swayam-youth',
    title: 'SWAYAM Youth Entrepreneurship Loan',
    department_name: 'Skill Development & Technical Education',
    scheme_type: 'subsidy_loan',
    beneficiary_group: 'Youth / SEBC',
    benefit_amount: 'Up to ₹1 Lakh interest-free',
    summary: 'Self-employment and skill startup support for Odisha youth including SEBC / OBC.',
    official_apply_url: 'https://swayam.odisha.gov.in/'
  },
  {
    id: 'gjay-health',
    slug: 'gjay-health',
    title: 'Gopabandhu Jan Arogya Yojana (GJAY)',
    department_name: 'Health & Family Welfare Dept',
    scheme_type: 'health_insurance',
    beneficiary_group: 'Families',
    benefit_amount: '₹5–10 Lakh cashless cover',
    summary: 'Health insurance and hospital treatment cover for families (EWS / General & BSKY cards).',
    official_apply_url: 'https://health.odisha.gov.in/'
  }
];

assert.equal(tracker.filterLiveSchemesByProfile(sampleLiveSchemes, { applicantProfile: 'All', socialCategory: 'All Categories' }).length, 5);
assert.equal(tracker.filterLiveSchemesByProfile(sampleLiveSchemes, { applicantProfile: 'Women Empowerment', socialCategory: 'All Categories' })[0].id, 'subhadra-yojana');
assert.equal(tracker.filterLiveSchemesByProfile(sampleLiveSchemes, { applicantProfile: 'Student / Scholarship', socialCategory: 'SC / ST' })[0].id, 'post-matric-sc-st');
assert.equal(tracker.filterLiveSchemesByProfile(sampleLiveSchemes, { applicantProfile: 'Farmer / Agriculture', socialCategory: 'All Categories' })[0].id, 'cm-kisan-odisha');
assert.equal(tracker.filterLiveSchemesByProfile(sampleLiveSchemes, { applicantProfile: 'Youth Skill & Employment', socialCategory: 'SEBC / OBC' })[0].id, 'swayam-youth');
assert.equal(tracker.filterLiveSchemesByProfile(sampleLiveSchemes, { applicantProfile: 'Health & Family Welfare', socialCategory: 'EWS / General' })[0].id, 'gjay-health');

const memStore = new Map();
const fakeStorage = {
  getItem: k => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v))
};

const saved1 = tracker.toggleSave(sampleLiveSchemes[0], fakeStorage);
assert.equal(saved1.saved, true);
assert.equal(tracker.isSaved('subhadra-yojana', fakeStorage), true);
assert.equal(tracker.load(fakeStorage).length, 1);

const saved2 = tracker.toggleSave(sampleLiveSchemes[1], fakeStorage);
assert.equal(saved2.saved, true);
assert.equal(tracker.load(fakeStorage).length, 2);

const afterRemove = tracker.removeScheme('subhadra-yojana', fakeStorage);
assert.equal(afterRemove.length, 1);
assert.equal(tracker.isSaved('subhadra-yojana', fakeStorage), false);
assert.equal(tracker.isSaved('post-matric-sc-st', fakeStorage), true);

// 2. Verify /schemes/ eligibility bar, save button, & single search bar rule
console.log('2. Checking /schemes/ index.html, JS & CSS...');
const schemesHtml = fs.readFileSync(path.join(ROOT, 'schemes/index.html'), 'utf8');
assert.ok(schemesHtml.includes('/assets/js/scheme-tracker.js?v=20261122v212'), 'schemes/index.html missing scheme-tracker.js');
assert.ok(schemesHtml.includes('/schemes/assets/schemes-explorer.js?v=20261122v212'), 'schemes/index.html missing v212 schemes-explorer.js');
assert.ok(schemesHtml.includes('/schemes/assets/schemes-explorer.css?v=20261122v212'), 'schemes/index.html missing v212 schemes-explorer.css');
assert.ok(schemesHtml.includes('id="schemes-eligibility-bar"'), 'Missing #schemes-eligibility-bar');
assert.ok(schemesHtml.includes('id="schemes-elig-profile"'), 'Missing #schemes-elig-profile');
assert.ok(schemesHtml.includes('id="schemes-elig-category"'), 'Missing #schemes-elig-category');
assert.ok(schemesHtml.includes('id="schemes-elig-count"'), 'Missing #schemes-elig-count');

const schemesSearchInputs = (schemesHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(schemesSearchInputs.length, 1, 'schemes/index.html must keep strictly 1 search bar');

const schemesJs = fs.readFileSync(path.join(ROOT, 'schemes/assets/schemes-explorer.js'), 'utf8');
assert.ok(schemesJs.includes('filterLiveSchemesByProfile'), 'schemes-explorer.js missing filterLiveSchemesByProfile');
assert.ok(schemesJs.includes('📌 Save Scheme'), 'schemes-explorer.js missing Save Scheme button');
assert.ok(schemesJs.includes('✓ Saved'), 'schemes-explorer.js missing Saved toggle label');

const schemesCss = fs.readFileSync(path.join(ROOT, 'schemes/assets/schemes-explorer.css'), 'utf8');
assert.ok(schemesCss.includes('.cso-schemes-elig-bar'), 'Missing .cso-schemes-elig-bar');
assert.ok(schemesCss.includes('min-height: 44px'), 'Missing 44px touch target in schemes-explorer.css');

// 3. Verify /student-dashboard/ saved schemes panel
console.log('3. Checking /student-dashboard/ saved schemes panel...');
const dashHtml = fs.readFileSync(path.join(ROOT, 'student-dashboard/index.html'), 'utf8');
assert.ok(dashHtml.includes('id="cso-saved-schemes-panel"'), 'Missing #cso-saved-schemes-panel');
assert.ok(dashHtml.includes('/assets/js/scheme-tracker.js?v=20261122v212'), 'student-dashboard/index.html missing scheme-tracker.js');
assert.ok(dashHtml.includes('/assets/js/student-dashboard.js?v=20261122v212'), 'student-dashboard/index.html missing v212 student-dashboard.js');
assert.ok(dashHtml.includes('/assets/css/student-dashboard-bp.css?v=20261122v212'), 'student-dashboard/index.html missing v212 student-dashboard-bp.css');

const dashJs = fs.readFileSync(path.join(ROOT, 'assets/js/student-dashboard.js'), 'utf8');
assert.ok(dashJs.includes('renderSavedSchemesPanel'), 'Missing renderSavedSchemesPanel()');
assert.ok(dashJs.includes('CSO_SCHEME_TRACKER'), 'Missing CSO_SCHEME_TRACKER usage');

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
  'assets/js/scheme-tracker.js',
  'schemes/index.html',
  'schemes/assets/schemes-explorer.js',
  'schemes/assets/schemes-explorer.css',
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

// 6. Verify cache version bump to cso-candidate-cache-v212
console.log('6. Checking cache version bump to cso-candidate-cache-v212...');
assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("const CACHE_NAME = 'cso-candidate-cache-v212';"));
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v212';"));

console.log('All v212 Live Odisha Govt Scheme Eligibility Finder & Saved Schemes Tracker tests PASSED!');
