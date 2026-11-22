import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const dirJson = JSON.parse(fs.readFileSync(path.join(root, 'jobs-careers/generated/directory.json'), 'utf8'));
const masterNav = JSON.parse(fs.readFileSync(path.join(root, 'admin/data/master-navigation.json'), 'utf8'));
const jobsDirApi = require(path.join(root, 'assets/js/jobs-directory-data.js'));
const nat11Map = require(path.join(root, 'assets/js/national-jobs-1-1-data.js'));

// 1. Preserve 23 folders / 299 modules in admin/data/master-navigation.json
assert.equal(masterNav.folders.length, 23, 'Expected 23 folders in master-navigation.json');
const totalModules = masterNav.folders.reduce((sum, f) => sum + (Array.isArray(f.modules) ? f.modules.length : 0), 0);
assert.equal(totalModules, 299, 'Expected 299 modules in master-navigation.json');

// 2. Collect all branches under 1.1.1 through 1.1.12 from jobs-careers/generated/directory.json
const jobsRec = dirJson.sections.find((s) => s.title === 'Jobs & Recruitment');
assert.ok(jobsRec, 'Jobs & Recruitment section must exist in directory.json');
const rootCat = (jobsRec.children || []).find((c) => c.number === '1');
assert.ok(rootCat, 'Category 1 must exist in Jobs & Recruitment');
const l1National = (rootCat.children || []).find((c) => c.number === '1.1');
assert.ok(l1National, '1.1 National-Level Government Jobs & Recruitment must exist');
assert.equal((l1National.children || []).length, 12, 'Expected 12 subcategories (1.1.1 - 1.1.12)');

const branches = [];
for (const sub of l1National.children) {
  for (const note of sub.notes || []) {
    branches.push({ l2Code: sub.number, slug: jobsDirApi.slugifyBranch(note.text), title: note.text });
  }
}
assert.equal(branches.length, 71, `Expected 71 branches under 1.1.1-1.1.12, got ${branches.length}`);

// 3. Verify every single one of the 71 branches resolves with complete official dossier fields
const officialHostRe = /^https:\/\/[a-z0-9.-]+\.(gov\.in|nic\.in|res\.in|ac\.in|org|in)(\/|$)/i;
for (const br of branches) {
  const item = jobsDirApi.getItemBySlug(br.slug);
  assert.ok(item, `Missing getItemBySlug() resolution for 1.1 branch: ${br.slug}`);
  assert.ok(item.organisation && item.organisation.length > 3, `Missing organisation for ${br.slug}`);
  assert.ok(item.qualification && item.qualification.length > 5, `Missing qualification for ${br.slug}`);
  assert.ok(item.age_limit && item.age_limit.length > 4, `Missing age_limit for ${br.slug}`);
  assert.ok(item.pay_level && item.pay_level.length > 5, `Missing pay_level for ${br.slug}`);
  assert.match(String(item.apply_url || ''), officialHostRe, `Invalid official apply_url for ${br.slug}: ${item.apply_url}`);
  assert.ok(item.summary && item.summary.length > 30, `Missing English summary for ${br.slug}`);
  assert.ok(item.summary_or && item.summary_or.length > 10, `Missing Odia summary_or for ${br.slug}`);

  const hasExamTable = (Array.isArray(item.examStages) && item.examStages.length > 0) ||
    (Array.isArray(item.examPatternTable) && item.examPatternTable.length > 0);
  assert.ok(hasExamTable, `Missing examPatternTable/examStages for ${br.slug}`);

  const hasRelax = (Array.isArray(item.attemptMatrix) && item.attemptMatrix.length > 0) ||
    (Array.isArray(item.relaxationTable) && item.relaxationTable.length > 0);
  assert.ok(hasRelax, `Missing relaxationTable/attemptMatrix for ${br.slug}`);

  assert.ok(Array.isArray(item.payProgression) && item.payProgression.length >= 2, `Missing payProgression for ${br.slug}`);
  assert.ok(Array.isArray(item.referenceLinks) && item.referenceLinks.length >= 2, `Missing referenceLinks for ${br.slug}`);
}

// 4. Verify physicalStandards for uniformed/defence/CAPF/police branches
const physicalSlugs = [
  'ssc-cpo',
  'ssc-gd-constable',
  'railway-protection-force',
  'nda-and-cds',
  'agniveer-recruitment',
  'bsf',
  'crpf',
  'cisf'
];
for (const ps of physicalSlugs) {
  const item = jobsDirApi.getItemBySlug(ps);
  assert.ok(Array.isArray(item.physicalStandards) && item.physicalStandards.length >= 2, `Missing physicalStandards for ${ps}`);
}

// 5. Verify HTML wiring, CSS clipping fix, CSP compliance & D1 1.1 seeds
const detailHtml = fs.readFileSync(path.join(root, 'jobs-careers/detail/index.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'jobs-careers/index.html'), 'utf8');
assert.match(detailHtml, /national-jobs-1-1-data\.js\?v=20261122v226/);
assert.match(indexHtml, /national-jobs-1-1-data\.js\?v=20261122v226/);

const dossierJs = fs.readFileSync(path.join(root, 'assets/js/content-dossier.js'), 'utf8');
const natJs = fs.readFileSync(path.join(root, 'assets/js/national-jobs-1-1-data.js'), 'utf8');
for (const [fname, src] of [['content-dossier.js', dossierJs], ['national-jobs-1-1-data.js', natJs]]) {
  assert.ok(!src.includes('.innerHTML'), `CSP violation: .innerHTML in ${fname}`);
  assert.ok(!src.includes('.style.'), `CSP violation: .style. in ${fname}`);
}
assert.match(dossierJs, /examPatternTable/);
assert.match(dossierJs, /relaxationTable/);
assert.match(dossierJs, /physicalStandards/);

const dashCss = fs.readFileSync(path.join(root, 'jobs-careers/assets/dashboard.css'), 'utf8');
assert.match(dashCss, /\.cso-top-selector__select[\s\S]*?line-height:\s*1\.4/);

const publicJs = fs.readFileSync(path.join(root, 'functions/api/content/_public.js'), 'utf8');
assert.match(publicJs, /NATIONAL_1_1_SEEDS/);
for (let i = 1; i <= 12; i++) {
  assert.ok(publicJs.includes(`'1.1.${i}'`), `Missing D1 seed for 1.1.${i} in _public.js`);
}

console.log(`PASS test-national-jobs-details-v226: All ${branches.length} branches across 1.1.1-1.1.12 verified (${Object.keys(nat11Map).length} specs in CSO_NATIONAL_JOBS_1_1), 23 folders / ${totalModules} modules preserved, 100% CSP compliant.`);
