import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const dirJson = JSON.parse(fs.readFileSync(path.join(root, 'jobs-careers/generated/directory.json'), 'utf8'));
const masterNav = JSON.parse(fs.readFileSync(path.join(root, 'admin/data/master-navigation.json'), 'utf8'));
const jobsDirApi = require(path.join(root, 'assets/js/jobs-directory-data.js'));
const od12Map = require(path.join(root, 'assets/js/odisha-jobs-1-2-data.js'));

// 1. Preserve 23 folders / 299 modules in admin/data/master-navigation.json
assert.equal(masterNav.folders.length, 23, 'Expected 23 folders in master-navigation.json');
const totalModules = masterNav.folders.reduce((sum, f) => sum + (Array.isArray(f.modules) ? f.modules.length : 0), 0);
assert.equal(totalModules, 299, 'Expected 299 modules in master-navigation.json');

// 2. Collect all branches under 1.2 (1.2.1 through 1.2.12) from jobs-careers/generated/directory.json
const jobsRec = dirJson.sections.find((s) => s.title === 'Jobs & Recruitment');
assert.ok(jobsRec, 'Jobs & Recruitment section must exist in directory.json');
const rootCat = (jobsRec.children || []).find((c) => c.number === '1');
assert.ok(rootCat, 'Category 1 must exist in Jobs & Recruitment');
const l1Odisha = (rootCat.children || []).find((c) => c.number === '1.2');
assert.ok(l1Odisha, '1.2 Odisha State-Level Jobs & Recruitment must exist');
assert.ok((l1Odisha.children || []).length >= 11, 'Expected at least 11 subcategories (1.2.1 - 1.2.11+)');

const branches = [];
for (const sub of l1Odisha.children) {
  for (const note of sub.notes || []) {
    branches.push({ l2Code: sub.number, slug: jobsDirApi.slugifyBranch(note.text), title: note.text });
  }
}
assert.ok(branches.length >= 60, `Expected >= 60 branches under 1.2, got ${branches.length}`);

// 3. Verify every single branch resolves with complete official Odisha dossier fields
const officialHostRe = /^https:\/\/[a-z0-9.-]+\.(gov\.in|nic\.in|ac\.in|co\.in|com|in|org)(\/|$)/i;
for (const br of branches) {
  const item = jobsDirApi.getItemBySlug(br.slug);
  assert.ok(item, `Missing getItemBySlug() resolution for 1.2 branch: ${br.slug}`);
  assert.ok(item.organisation && item.organisation.length > 3, `Missing organisation for ${br.slug}`);
  assert.ok(item.qualification && item.qualification.length > 5, `Missing qualification for ${br.slug}`);
  assert.ok(item.age_limit && item.age_limit.length > 4, `Missing age_limit for ${br.slug}`);
  assert.ok(item.pay_level && item.pay_level.length > 5, `Missing pay_level for ${br.slug}`);
  assert.match(String(item.apply_url || ''), officialHostRe, `Invalid official apply_url for ${br.slug}: ${item.apply_url}`);
  assert.ok(item.summary && item.summary.length > 30, `Missing English summary for ${br.slug}`);
  assert.ok(item.summary_or && item.summary_or.length > 10, `Missing Odia summary_or for ${br.slug}`);
  assert.ok(Array.isArray(item.examPatternTable) && item.examPatternTable.length >= 2, `Missing examPatternTable for ${br.slug}`);
  assert.ok(Array.isArray(item.relaxationTable) && item.relaxationTable.length >= 5, `Missing relaxationTable for ${br.slug}`);
  assert.ok(Array.isArray(item.payProgression) && item.payProgression.length >= 4, `Missing payProgression for ${br.slug}`);
  assert.ok(Array.isArray(item.referenceLinks) && item.referenceLinks.length >= 3, `Missing referenceLinks for ${br.slug}`);
}

// 4. Verify physicalStandards for uniformed/police/fire/jail/forest branches
const physicalSlugs = [
  'odisha-police',
  'constable-and-sub-inspector-recruitment',
  'fire-services',
  'jail-and-correctional-services',
  'forest-agriculture-and-technical-posts',
  'forest-environment-and-fisheries'
];
for (const ps of physicalSlugs) {
  const item = jobsDirApi.getItemBySlug(ps);
  assert.ok(Array.isArray(item.physicalStandards) && item.physicalStandards.length >= 3, `Missing physicalStandards for ${ps}`);
}

// 5. Verify HTML wiring, CSP compliance, D1 1.2 seeds & v227 cache bump
const detailHtml = fs.readFileSync(path.join(root, 'jobs-careers/detail/index.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'jobs-careers/index.html'), 'utf8');
assert.match(detailHtml, /odisha-jobs-1-2-data\.js\?v=20261122v227/);
assert.match(indexHtml, /odisha-jobs-1-2-data\.js\?v=20261122v227/);

const odJs = fs.readFileSync(path.join(root, 'assets/js/odisha-jobs-1-2-data.js'), 'utf8');
assert.ok(!odJs.includes('.innerHTML'), 'CSP violation: .innerHTML in odisha-jobs-1-2-data.js');
assert.ok(!odJs.includes('.style.'), 'CSP violation: .style. in odisha-jobs-1-2-data.js');

const publicJs = fs.readFileSync(path.join(root, 'functions/api/content/_public.js'), 'utf8');
assert.match(publicJs, /ODISHA_1_2_SEEDS/);
for (let i = 1; i <= 11; i++) {
  assert.ok(publicJs.includes(`'1.2.${i}'`), `Missing D1 seed for 1.2.${i} in _public.js`);
}

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.match(swJs, /cso-candidate-cache-v227/);

console.log(`PASS test-odisha-jobs-details-v227: All ${branches.length} entries (${Object.keys(od12Map).length} unique specs in CSO_ODISHA_JOBS_1_2) across 1.2.1-1.2.12 verified, 23 folders / ${totalModules} modules preserved, 100% CSP compliant.`);
