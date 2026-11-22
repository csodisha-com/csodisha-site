// Verification test for Selector-First Directory Section Views (#cso-top-category-selector),
// Overview Preservation, Matching Live Notices Sub-Block, and 100% CSP Compliance (v222)
// Run: node scripts/test-jobs-selector-first-v222.mjs
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

// 2. Verify selector-first DOM, CSS hiding rules, and Overview preservation
console.log('2. Checking selector-first section views & Overview preservation...');
const jobsHtml = fs.readFileSync(path.join(ROOT, 'jobs-careers/index.html'), 'utf8');
assert.ok(jobsHtml.includes('id="cso-top-category-selector"'), 'Missing #cso-top-category-selector');
assert.ok(jobsHtml.includes('id="cso-matching-live-notices"'), 'Missing #cso-matching-live-notices sub-block');
assert.ok(/\/assets\/js\/jobs-directory-data\.js\?v=20261122v22(2|3)/.test(jobsHtml), 'Missing v222/v223 jobs-directory-data.js');
assert.ok(/\.\/assets\/dashboard\.js\?v=20261122v22(2|3)/.test(jobsHtml), 'Missing v222/v223 dashboard.js');
assert.ok(/\.\/assets\/dashboard\.css\?v=20261122v22(2|3)/.test(jobsHtml), 'Missing v222/v223 dashboard.css');

const explorerPos = jobsHtml.indexOf('id="explorer"');
const selectorPos = jobsHtml.indexOf('id="cso-top-category-selector"');
const itemsPos = jobsHtml.indexOf('id="explorer-items"');
const matchingPos = jobsHtml.indexOf('id="cso-matching-live-notices"');
assert.ok(explorerPos > 0 && selectorPos > explorerPos && itemsPos > selectorPos && matchingPos > itemsPos,
  '#cso-top-category-selector must appear first inside #explorer, followed by #explorer-items and #cso-matching-live-notices');

// Single search bar check
const jobsSearchInputs = (jobsHtml.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [])
  .filter(tag => !/id=["']bp-search-modal-input["']/i.test(tag));
assert.equal(jobsSearchInputs.length, 1, 'jobs-careers/index.html must keep strictly 1 search bar (#directory-search)');

const dashCss = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.ok(dashCss.includes('body.cso-section-view .cso-jobs-hero'), 'CSS must hide hero in section view');
assert.ok(dashCss.includes('body.cso-section-view .cso-elig-drawer'), 'CSS must hide eligibility quick profile in section view');
assert.ok(dashCss.includes('body.cso-section-view #live-jobs-section'), 'CSS must hide unfiltered live-jobs wall in section view');
assert.ok(dashCss.includes('body.cso-section-view #explorer .explorer-header'), 'CSS must hide redundant ← Back header above selector in section view');

const dashJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
assert.ok(dashJs.includes("document.body.classList.add('cso-section-view')"), 'renderExplorer must add cso-section-view');
assert.ok(dashJs.includes('renderMatchingLiveNotices'), 'Missing renderMatchingLiveNotices sub-block renderer');

// 3. Strict 100% CSP compliance & v222 cache bump
console.log('3. Checking 100% CSP compliance & v222 cache bump...');
const touched = [
  'jobs-careers/index.html',
  'jobs-careers/assets/dashboard.js',
  'jobs-careers/assets/dashboard.css',
  'jobs-careers/detail/index.html'
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

assert.ok(/cso-candidate-cache-v22(2|3)/.test(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')), 'sw.js must be bumped to v222+');
assert.ok(/cso-candidate-cache-v22(2|3)/.test(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8')), 'ops-sentinel.js must be bumped to v222+');

console.log('All v222 Selector-First Section View & CSP tests PASSED!');
