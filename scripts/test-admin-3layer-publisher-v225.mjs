// Verification test for Admin Studio 3-Layer Cascading Selector & Publisher (v225)
// Run: node scripts/test-admin-3layer-publisher-v225.mjs
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

// 2. Verify Admin Studio 3-Layer Cascading Selector Bar & Full Add/Modify/Preview/Publish UI
console.log('2. Checking Admin Studio #cso-admin-category-selector & bilingual form...');
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8');
const requiredAdminIds = [
  'cso-admin-category-selector',
  'cso-admin-select-section',
  'cso-admin-select-l1',
  'cso-admin-select-l2',
  'cso-admin-select-l3',
  'cso-admin-select-reset',
  'cso-admin-btn-add-new',
  'cso-admin-path-badge',
  'csoJobEditingId',
  'csoJobSectionSlug',
  'csoJobL1Code',
  'csoJobL2Code',
  'csoJobL3Slug',
  'csoJobTitle',
  'csoJobTitleOr',
  'csoJobDistrict',
  'csoJobQualification',
  'csoJobAgeLimit',
  'csoJobPayLevel',
  'csoJobSummary',
  'csoJobSummaryOr',
  'csoBtnPreviewJob',
  'csoBtnPublishJob',
  'csoAdminJobsList'
];
for (const id of requiredAdminIds) {
  assert.ok(adminHtml.includes(`id="${id}"`), `admin/index.html missing #${id}`);
}
assert.ok(adminHtml.includes('/admin/studio.css?v=20261122v225'), 'Missing v225 studio.css');
assert.ok(adminHtml.includes('/admin/fast-publish.js?v=20261122v225'), 'Missing v225 fast-publish.js');
assert.ok(adminHtml.includes('/admin/admin.js?v=20261122v225'), 'Missing v225 admin.js');

const fastPubJs = fs.readFileSync(path.join(ROOT, 'admin/fast-publish.js'), 'utf8');
assert.ok(fastPubJs.includes('initJobsDirectoryPublisher'), 'Missing initJobsDirectoryPublisher');
assert.ok(fastPubJs.includes('/api/admin/jobs'), 'Missing /api/admin/jobs endpoint wiring');
assert.ok(fastPubJs.includes('/jobs-careers/generated/directory.json'), 'Missing directory.json loading');

const adminJs = fs.readFileSync(path.join(ROOT, 'admin/admin.js'), 'utf8');
assert.ok(adminJs.includes('initJobsDirectoryPublisher'), 'admin.js must initialize initJobsDirectoryPublisher');

// 3. Verify D1 API persistence & explicit taxonomy priority in classifyJobToBranch
console.log('3. Checking D1 API persistence (_posts.js, _public.js) & classifyJobToBranch...');
const postsApi = fs.readFileSync(path.join(ROOT, 'functions/api/admin/_posts.js'), 'utf8');
assert.ok(postsApi.includes('ensureJobTaxonomyColumns'), '_posts.js must ensure job taxonomy columns');
for (const col of ['section_slug', 'l1_code', 'l2_code', 'l3_slug', 'district_tag', 'stage']) {
  assert.ok(postsApi.includes(col), `_posts.js missing ${col}`);
}

const publicApi = fs.readFileSync(path.join(ROOT, 'functions/api/content/_public.js'), 'utf8');
assert.ok(publicApi.includes('ensureJobTaxonomyColumns'), '_public.js must ensure job taxonomy columns');
for (const col of ['l1_code', 'l2_code', 'l3_slug', 'qualification', 'age_limit', 'pay_level']) {
  assert.ok(publicApi.includes(col), `_public.js missing ${col}`);
}

const dashJs = fs.readFileSync(path.join(ROOT, 'jobs-careers/assets/dashboard.js'), 'utf8');
assert.ok(dashJs.includes('if (job && job.l1_code)'), 'classifyJobToBranch must honor explicit l1_code/l2_code/l3_slug first');

// 4. Strict 100% CSP compliance & v225 cache bump
console.log('4. Checking 100% CSP compliance & v225 cache bump...');
const touched = [
  'admin/index.html',
  'admin/fast-publish.js',
  'admin/admin.js',
  'admin/studio.css',
  'jobs-careers/index.html',
  'jobs-careers/assets/dashboard.js',
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

assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('cso-candidate-cache-v225'), 'sw.js must be bumped to v225');
assert.ok(fs.readFileSync(path.join(ROOT, 'functions/_lib/ops-sentinel.js'), 'utf8').includes('cso-candidate-cache-v225'), 'ops-sentinel.js must be bumped to v225');

console.log('All v225 Admin 3-Layer Publisher & D1 Taxonomy Sync tests PASSED!');
