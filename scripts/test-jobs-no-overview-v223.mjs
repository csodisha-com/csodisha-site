// Verification test for Permanent Removal of Overview & Direct Jobs & Recruitment Default (v223)
// Run: node scripts/test-jobs-no-overview-v223.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Verify 23 folders / 299 modules in master-navigation.json
console.log('1. Checking 23 folders / 299 modules preservation...');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/data/master-navigation.json'), 'utf8'));
const folders = Object.keys(navJson.folders || {});
assert.equal(folders.length, 23, `Expected 23 folders, got ${folders.length}`);
let totalModules = 0;
for (const f of folders) totalModules += (navJson.folders[f].modules || []).length;
assert.equal(totalModules, 299, `Expected 299 modules, got ${totalModules}`);

// 2. Verify permanent removal of Overview in jobs-careers/index.html & dashboard.js
console.log('2. Checking permanent removal of Overview & default to Jobs & Recruitment...');
const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(!jobsHtml.includes('id="overview"'), '#overview must be permanently removed');
assert.ok(!jobsHtml.includes('data-section-slug="overview"'), 'Overview sidebar link must be removed');
assert.ok(!jobsHtml.includes('class="home-link"'), 'Topbar Overview button must be removed');
assert.ok(!jobsHtml.includes('id="cso-overview-visual-bar"'), '#cso-overview-visual-bar must be removed');
assert.ok(!jobsHtml.includes('id="career-hubs"'), 'Career Hubs grid must be removed');
assert.ok(!jobsHtml.includes('id="cso-hub-suboptions"'), '#cso-hub-suboptions must be removed');
assert.ok(!jobsHtml.includes('id="live-jobs-section"'), 'Unfiltered #live-jobs-section must be removed');

assert.ok(jobsHtml.includes('id="cso-top-category-selector"'), 'Missing #cso-top-category-selector');
assert.ok(jobsHtml.includes('id="cso-matching-live-notices"'), 'Missing #cso-matching-live-notices');
assert.ok(/\/assets\/js\/jobs-directory-data\.js\?v=20261122v22(3|4)/.test(jobsHtml), 'Missing v223/v224 jobs-directory-data.js');
assert.ok(/\.\/assets\/dashboard\.js\?v=20261122v22(3|4)/.test(jobsHtml), 'Missing v223/v224 dashboard.js');
assert.ok(/\.\/assets\/dashboard\.css\?v=20261122v22(3|4)/.test(jobsHtml), 'Missing v223/v224 dashboard.css');

const sectionSlugs = [
  'jobs-recruitment',
  'career-explorer',
  'eligibility-explorer',
  'courses-exams',
  'scholarships-support',
  'international-overseas',
  'career-development',
  'institutions-portals'
];
for (const slug of sectionSlugs) {
  assert.ok(jobsHtml.includes(`href="/jobs-careers/${slug}"`), `Sidebar must include /jobs-careers/${slug}`);
}

const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

const dashJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
assert.ok(!dashJs.includes('function showOverview'), 'showOverview dead code must be removed');
assert.ok(!dashJs.includes('function renderOverviewVisualBar'), 'renderOverviewVisualBar dead code must be removed');
assert.ok(!dashJs.includes('function initCareerHubSuboptions'), 'initCareerHubSuboptions dead code must be removed');
assert.ok(dashJs.includes('const defaultSectionIdx = 0;'), 'Default route must open section 0 (Jobs & Recruitment)');

// 3. Verify detail page back-links point to /jobs-careers/jobs-recruitment (never Overview)
console.log('3. Checking detail page back-links point to /jobs-careers/jobs-recruitment...');
const detailHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/detail/index.html'), 'utf8');
assert.ok(detailHtml.includes('href="/jobs-careers/jobs-recruitment"'), 'Detail breadcrumb must link to /jobs-careers/jobs-recruitment');
assert.ok(!detailHtml.includes('Jobs &amp; Careers Overview'), 'Detail breadcrumb must not mention Overview');
const dossierJs = fs.readFileSync(path.join(ROOT, 'assets/js/content-dossier.js'), 'utf8');
assert.ok(!dossierJs.includes('Back to Jobs & Careers Overview'), 'content-dossier.js must not link back to Overview');

// 4. Strict 100% CSP compliance & v223 cache bump
console.log('4. Checking 100% CSP compliance & v223 cache bump...');
const touched = [
  'jobs-careers/index.html',
  'jobs-careers/assets/dashboard.js',
  'jobs-careers/assets/dashboard.css',
  'jobs-careers/detail/index.html',
  'assets/js/content-dossier.js'
];
for (const rel of touched) {
  const c = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.ok(!/\sstyle\s*=/i.test(c), `${rel} must have 0 style="" attributes`);
  assert.ok(!/\sonclick\s*=/i.test(c), `${rel} must have 0 onclick= attributes`);
  if (rel.endsWith('.js')) {
    assert.ok(!/\.innerHTML\s*=/.test(c), `${rel} must have 0 .innerHTML assignments`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(c), `${rel} must have 0 .style.* assignments`);
  }
  if (rel.endsWith('.html')) {
    assert.ok(!/<style\b/i.test(c), `${rel} must have 0 inline <style>`);
    const noExt = c.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
    assert.ok(!/<script(?![^>]*application\/ld\+json)/i.test(noExt), `${rel} must have 0 executable inline <script>`);
  }
}

assert.ok(/cso-candidate-cache-v22(3|4)/.test(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')), 'sw.js must be bumped to v223+');
assert.ok(/cso-candidate-cache-v22(3|4)/.test(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8')), 'ops-sentinel.js must be bumped to v223+');

console.log('All v223 No-Overview & Direct Jobs & Recruitment Default tests PASSED!');
