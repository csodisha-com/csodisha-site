#!/usr/bin/env node
/**
 * v418 Automated Audit: Interactive Odisha 30-District & 314-Block Administrative Directory
 * Verifies:
 *  1) Exact dataset integrity: 30 districts, 3 revenue divisions (10+10+10), 58 sub-divisions,
 *     exact sum of 314 Panchayat Samiti blocks (115 + 95 + 104) with zero duplicate or empty entries.
 *  2) Search & filter accuracy across district names, Odia names, HQs, sub-divisions, individual blocks
 *     (Junagarh -> Kalahandi, Athmallik -> Angul, Bhanjanagar -> Ganjam), and /jobs/?district=<slug> links.
 *  3) odisha-special/index.html mounts #cso-odisha-admin-directory-root & loads v418 JS with strict CSP,
 *     assets/style.css styles .cso-oad-* with var(--cso-*) tokens and zero hardcoded hex,
 *     and sw.js + ops-sentinel.js sync cso-candidate-cache-v449.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v418 Interactive Odisha 30-District & 314-Block Administrative Directory Audit ===');

const jsPath = path.join(ROOT, 'assets/js/odisha-admin-directory.js');
const dfPath = path.join(ROOT, 'assets/js/odisha-district-filter.js');
const htmlPath = path.join(ROOT, 'odisha-special/index.html');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const dfSrc = fs.readFileSync(dfPath, 'utf8');
const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks on JS & HTML
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(htmlSrc), 'odisha-special/index.html must have zero inline on* handlers');
assert.ok(!/\sstyle\s*=/i.test(htmlSrc), 'odisha-special/index.html must have zero inline style attributes');

// 2. Evaluate module in sandbox
const sandbox = {
  window: { localStorage: new Map() },
  globalThis: {}
};
sandbox.window.localStorage.getItem = (k) => (sandbox.window.localStorage.has(k) ? sandbox.window.localStorage.get(k) : null);
sandbox.window.localStorage.setItem = (k, v) => sandbox.window.localStorage.set(k, String(v));
sandbox.globalThis = sandbox.window;

vm.runInNewContext(dfSrc, sandbox);
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOOdishaAdminDirectory;
const dfApi = sandbox.window.CSODistrictFilter;
assert.ok(api, 'window.CSOOdishaAdminDirectory must be defined');
assert.equal(api.version, 'v418');
assert.equal(api.PREFS_KEY, 'cso_odisha_admin_dir_prefs_v1');

// 3. Exact Dataset Integrity: 30 Districts, 3 Divisions (10+10+10), 58 Sub-Divisions, 314 Blocks
const totals = api.getTotals();
assert.equal(totals.districts, 30, 'Must have exactly 30 districts');
assert.equal(totals.divisions, 3, 'Must have exactly 3 revenue divisions');
assert.equal(totals.byDivision.central.districts, 10, 'Central division must have 10 districts');
assert.equal(totals.byDivision.northern.districts, 10, 'Northern division must have 10 districts');
assert.equal(totals.byDivision.southern.districts, 10, 'Southern division must have 10 districts');
assert.equal(totals.byDivision.central.blocks, 115, 'Central division must have 115 blocks');
assert.equal(totals.byDivision.northern.blocks, 95, 'Northern division must have 95 blocks');
assert.equal(totals.byDivision.southern.blocks, 104, 'Southern division must have 104 blocks');
assert.equal(totals.subDivisions, 58, 'State total sub-divisions must equal 58');
assert.equal(totals.blocks, 314, 'State total Panchayat Samiti blocks must equal 314');

const seenSlugs = new Set();
const seenBlocks = new Set();
for (const d of api.DISTRICTS) {
  assert.ok(d.slug && !seenSlugs.has(d.slug), `Unique district slug required: ${d.slug}`);
  seenSlugs.add(d.slug);
  assert.ok(dfApi.getDistrictBySlug(d.slug), `District slug ${d.slug} must align with window.CSODistrictFilter`);
  assert.ok(d.en && d.or && d.hq && d.portal.startsWith('https://'), `Complete bilingual + portal metadata required for ${d.slug}`);
  assert.ok(Array.isArray(d.subDivisions) && d.subDivisions.length >= 1, `Sub-divisions required for ${d.slug}`);
  assert.ok(Array.isArray(d.blocks) && d.blocks.length >= 3, `Blocks required for ${d.slug}`);
  for (const blk of d.blocks) {
    const cleanBlk = String(blk || '').trim();
    assert.ok(cleanBlk.length > 0, `Empty block in ${d.slug}`);
    const key = cleanBlk.toLowerCase();
    assert.ok(!seenBlocks.has(key), `Duplicate block entry detected: ${cleanBlk}`);
    seenBlocks.add(key);
  }
}
assert.equal(seenBlocks.size, 314, 'Exactly 314 unique block entries verified');

// 4. Search & Filter Accuracy
const rJunagarh = api.filterDistricts({ query: 'Junagarh' });
assert.equal(rJunagarh.length, 1);
assert.equal(rJunagarh[0].district.slug, 'kalahandi');
assert.ok(rJunagarh[0].matchedBlocks.includes('Junagarh'));
assert.equal(rJunagarh[0].links.jobs, '/jobs/?district=kalahandi');

const rAthmallik = api.filterDistricts({ query: 'Athmallik' });
assert.equal(rAthmallik.length, 1);
assert.equal(rAthmallik[0].district.slug, 'angul');
assert.ok(rAthmallik[0].matchedBlocks.includes('Athmallik'));

const rBhanjanagar = api.filterDistricts({ query: 'Bhanjanagar' });
assert.equal(rBhanjanagar.length, 1);
assert.equal(rBhanjanagar[0].district.slug, 'ganjam');
assert.ok(rBhanjanagar[0].matchedBlocks.includes('Bhanjanagar'));

const rOdia = api.filterDistricts({ query: 'କଳାହାଣ୍ଡି' });
assert.equal(rOdia.length, 1);
assert.equal(rOdia[0].district.slug, 'kalahandi');

const rRourkela = api.filterDistricts({ query: 'Rourkela' });
assert.ok(rRourkela.some((r) => r.district.slug === 'sundargarh'), 'Exam center/sub-division Rourkela must resolve Sundargarh');

const rSouthern = api.filterDistricts({ division: 'southern' });
assert.equal(rSouthern.length, 10, 'Southern division filter must return 10 districts');

// 5. HTML mount & SW / Ops-Sentinel cache sync
assert.ok(htmlSrc.includes('id="cso-odisha-admin-directory-root"'), 'odisha-special/index.html must mount #cso-odisha-admin-directory-root');
assert.ok(htmlSrc.includes('/assets/js/odisha-admin-directory.js?v=20261127v449'), 'odisha-special/index.html must load odisha-admin-directory.js?v=20261127v449');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v449'"), 'sw.js must bump CACHE_NAME to v418');
assert.ok(swSrc.includes("'/assets/js/odisha-admin-directory.js?v=20261127v449'"), 'sw.js must precache odisha-admin-directory.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v449'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v418');

// 6. CSS 4-theme semantic token check (zero hardcoded hex in .cso-oad-* block)
const oadCssIdx = cssSrc.indexOf('/* ===== v418:');
assert.ok(oadCssIdx !== -1, 'assets/style.css must contain v418 .cso-oad-* CSS block');
const oadCssBlock = cssSrc.slice(oadCssIdx);
assert.ok(oadCssBlock.includes('.cso-oad-wrap') && oadCssBlock.includes('var(--cso-'), 'CSS must style .cso-oad-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(oadCssBlock), 'v418 .cso-oad-* CSS block must have zero hardcoded hex colors');
assert.ok(oadCssBlock.includes('prefers-reduced-motion'), 'v418 CSS must include prefers-reduced-motion guard');
assert.ok(oadCssBlock.includes('@media print'), 'v418 CSS must include @media print rules');

console.log('✅ v418 Interactive Odisha 30-District & 314-Block Administrative Directory Audit PASSED');
