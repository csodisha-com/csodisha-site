#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v410 Interactive Odisha Scheme & Scholarship Eligibility Finder Audit ===');

const sefSrc = read('assets/js/schemes-eligibility-finder.js');
const schemesHtml = read('schemes/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(sefSrc, sandbox);
const SEF = sandbox.window.CSOSchemesFinder;
assert.ok(SEF, 'window.CSOSchemesFinder must be exported');
assert.equal(SEF.version, 'v410');
assert.equal(SEF.PREFS_KEY, 'cso_schemes_finder_prefs_v1');

// 1. Verify all 7 flagship Odisha schemes with bilingual metadata, benefits & documents
assert.equal(SEF.FLAGSHIP_SCHEMES.length, 7, 'Must include all 7 flagship Odisha schemes');
const names = Array.from(SEF.FLAGSHIP_SCHEMES, s => s.name_en).join(' | ');
for (const expected of [
  'Subhadra Yojana',
  'Gopabandhu Jan Arogya Yojana',
  'Post-Matric & Nua-O Scholarship',
  'PM Surya Ghar',
  'CM-KISAN',
  'Madhu Babu Pension Yojana',
  'Antyodaya Gruha Yojana'
]) {
  assert.ok(names.includes(expected), `Catalog must include ${expected}`);
}
for (const s of SEF.FLAGSHIP_SCHEMES) {
  assert.ok(s.name_en && s.name_or, `${s.id} must have bilingual EN + Odia name`);
  assert.ok(s.benefit_en && s.benefit_or, `${s.id} must have bilingual benefit badge`);
  assert.ok(Array.isArray(s.documents) && s.documents.length >= 3, `${s.id} must list required documents`);
  assert.ok(s.official_url.startsWith('https://'), `${s.id} must link to official HTTPS portal`);
}

// 2. Verify pure filtering logic across category, profile, social category & income bracket
const womenLowInc = SEF.filterSchemes(SEF.FLAGSHIP_SCHEMES, { profile: 'women', incomeBracket: '<= 2.5L' });
assert.ok(womenLowInc.some(s => s.id === 'subhadra-yojana'), 'Women <= 2.5L must match Subhadra Yojana');
assert.ok(womenLowInc.every(s => s.matchStatus === 'likely_eligible'), 'Specific profile/income matches must mark likely_eligible');

const studentSc = SEF.filterSchemes(SEF.FLAGSHIP_SCHEMES, { profile: 'student', socialCategory: 'sc', incomeBracket: '<= 2.5L' });
assert.ok(studentSc.some(s => s.id === 'post-matric-nua-o-scholarship'), 'SC Student <= 2.5L must match Post-Matric & Nua-O');

const farmerBpl = SEF.filterSchemes(SEF.FLAGSHIP_SCHEMES, { profile: 'farmer', incomeBracket: '<= 1L' });
assert.ok(farmerBpl.some(s => s.id === 'cm-kisan-samrudha-krushak'), 'Farmer <= 1L must match CM-KISAN');
assert.ok(farmerBpl.some(s => s.id === 'antyodaya-gruha-yojana'), 'Farmer <= 1L must match Antyodaya Gruha');

const highIncome = SEF.filterSchemes(SEF.FLAGSHIP_SCHEMES, { incomeBracket: '> 6L' });
assert.equal(highIncome.length, 1, 'Only no-income-cap schemes should match > 6L');
assert.equal(highIncome[0].id, 'pm-surya-ghar-odisha', 'PM Surya Ghar must be the > 6L no-income-cap match');

const seniorBpl = SEF.filterSchemes(SEF.FLAGSHIP_SCHEMES, { profile: 'senior_pwbd', incomeBracket: '<= 1L' });
assert.ok(seniorBpl.some(s => s.id === 'madhu-babu-pension-yojana'), 'Senior/PwBD <= 1L must match Madhu Babu Pension');

// 3. Markup, Strict CSP, 4-Theme CSS & v410 Cache Sync
assert.match(schemesHtml, /id="cso-schemes-eligibility-finder-root"/, 'schemes/index.html must mount #cso-schemes-eligibility-finder-root');
assert.match(schemesHtml, /\/assets\/js\/schemes-eligibility-finder\.js\?v=20261127v414/, 'schemes/index.html must load schemes-eligibility-finder.js?v=20261127v414');
assert.ok(!/\sstyle="/i.test(schemesHtml), 'schemes/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(schemesHtml), 'schemes/index.html must have zero inline on* handlers');
assert.ok(!sefSrc.includes('.innerHTML') && !sefSrc.includes('.outerHTML') && !sefSrc.includes('insertAdjacentHTML') && !sefSrc.includes('.style.'), 'schemes-eligibility-finder.js must obey strict CSP');

const v410CssIdx = styleCss.indexOf('v410: Interactive Odisha Scheme & Scholarship Eligibility Finder');
assert.ok(v410CssIdx !== -1, 'assets/style.css must contain v410 Schemes Finder CSS block');
const v410Css = styleCss.slice(v410CssIdx);
assert.ok(v410Css.includes('.cso-sef-card') && v410Css.includes('var(--cso-surface-elevated)') && v410Css.includes('var(--cso-ink)'), 'v410 CSS must use semantic --cso-* tokens');
assert.ok(v410Css.includes('min-height: 44px'), 'v410 CSS must enforce >=44px touch targets');
assert.ok(v410Css.includes('prefers-reduced-motion: reduce'), 'v410 CSS must respect prefers-reduced-motion');
assert.ok(v410Css.includes('@media print'), 'v410 CSS must include @media print support');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v410Css), 'v410 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v414'"), 'sw.js CACHE_NAME must be v410');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v414'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v410');

console.log('✅ v410 Interactive Odisha Scheme & Scholarship Eligibility Finder Audit PASSED');
