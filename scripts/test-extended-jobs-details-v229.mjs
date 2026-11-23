import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const root = process.cwd();
const dirJson = JSON.parse(fs.readFileSync(path.join(root, 'jobs-careers/generated/directory.json'), 'utf8'));
const masterNav = JSON.parse(fs.readFileSync(path.join(root, 'admin/data/master-navigation.json'), 'utf8'));
const jobsDirApi = require(path.join(root, 'assets/js/jobs-directory-data.js'));
const extMap = require(path.join(root, 'assets/js/extended-jobs-1-3-to-1-10-data.js'));
assert.equal(masterNav.folders.length, 23);
const totalModules = masterNav.folders.reduce((s, f) => s + (Array.isArray(f.modules) ? f.modules.length : 0), 0); assert.equal(totalModules, 299);
const rootCat = dirJson.sections.find(s => s.title === 'Jobs & Recruitment').children.find(c => c.number === '1');
let totalBranches = 0;
for (const code of ['1.3','1.4','1.5','1.6','1.7','1.8','1.9','1.10']) {
  for (const sub of rootCat.children.find(c => c.number === code).children || []) {
    assert.ok((sub.notes || []).length >= 2);
    for (const note of sub.notes) { totalBranches++; const slug = jobsDirApi.slugifyBranch(note.text); const item = jobsDirApi.getItemBySlug(slug); assert.ok(item && item.organisation && item.qualification && item.pay_level && item.summary && item.summary_or, slug); }
  }
}
const extJs = fs.readFileSync(path.join(root, 'assets/js/extended-jobs-1-3-to-1-10-data.js'), 'utf8');
assert.ok(!extJs.includes('.innerHTML') && !extJs.includes('.style.'), 'CSP violation');
console.log('PASS test-extended-jobs-details-v229: All ' + totalBranches + ' entries (' + Object.keys(extMap).length + ' specs) across 1.3-1.10 verified, 23 folders / ' + totalModules + ' modules preserved, 100% CSP compliant.');
