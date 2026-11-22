// Verification for v194 30-District Odisha Recruitment & Collectorate Filter
// Run: node scripts/test-30district-filter-v194.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EXPECTED_SLUGS = [
  'angul', 'balangir', 'balasore', 'bargarh', 'bhadrak', 'boudh',
  'cuttack', 'deogarh', 'dhenkanal', 'gajapati', 'ganjam', 'jagatsinghpur',
  'jajpur', 'jharsuguda', 'kalahandi', 'kandhamal', 'kendrapara', 'kendujhar',
  'khordha', 'koraput', 'malkangiri', 'mayurbhanj', 'nabarangpur', 'nayagarh',
  'nuapada', 'puri', 'rayagada', 'sambalpur', 'subarnapur', 'sundargarh'
];

// 1. Load assets/js/odisha-districts.js and verify all 30 districts + Crawl4AI sources.json parity
const districtsJs = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'odisha-districts.js'), 'utf8');
const sourcesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'crawl4ai', 'sources.json'), 'utf8'));
const sourceMap = new Map(sourcesJson.filter(s => s.category === 'district').map(s => [s.id, s.url]));

const sandbox = { window: {} };
vm.runInNewContext(districtsJs, sandbox, { filename: 'assets/js/odisha-districts.js' });
const districts = sandbox.window.CSO_ODISHA_DISTRICTS;
assert.ok(Array.isArray(districts), 'CSO_ODISHA_DISTRICTS must be an array');
assert.equal(districts.length, 30, 'Expected exactly 30 Odisha districts');

districts.forEach((d, idx) => {
  assert.equal(d.slug, EXPECTED_SLUGS[idx], `Alphabetical order mismatch at index ${idx}`);
  assert.ok(d.name_en && d.name_or && d.division, `Missing fields for ${d.slug}`);
  assert.match(d.notice_url, /^https:\/\/[^/]+\.(?:gov\.in|nic\.in)\//, `Invalid .gov.in/.nic.in URL for ${d.slug}`);
  assert.equal(d.notice_url, sourceMap.get(d.slug), `URL mismatch vs sources.json for ${d.slug}`);
});

assert.equal(sandbox.window.CSO_FIND_ODISHA_DISTRICT('khordha').name_en, 'Khordha');
assert.equal(sandbox.window.CSO_FIND_ODISHA_DISTRICT('unknown'), null);

// 2. Verify /jobs-careers/ and /schemes-benefits/ load odisha-districts.js, have district selector + banner, and 100% CSP compliance
const targets = [
  {
    htmlPath: 'jobs-careers/index.html',
    jsPath: 'jobs-careers/assets/dashboard.js',
    cssPath: 'jobs-careers/assets/dashboard.css',
    selectId: 'live-jobs-district',
    bannerId: 'live-jobs-district-banner'
  },
  {
    htmlPath: 'schemes-benefits/index.html',
    jsPath: 'schemes-benefits/assets/dashboard.js',
    cssPath: 'schemes-benefits/assets/dashboard.css',
    selectId: 'scheme-district',
    bannerId: 'scheme-district-banner'
  }
];

for (const t of targets) {
  const html = fs.readFileSync(path.join(ROOT, t.htmlPath), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, t.jsPath), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, t.cssPath), 'utf8');

  assert.ok(html.includes('/assets/js/odisha-districts.js?v=20261122v194'), `${t.htmlPath} must load odisha-districts.js v194`);
  assert.ok(html.includes('./assets/dashboard.js?v=20261122v194'), `${t.htmlPath} must bump dashboard.js to v194`);
  assert.ok(html.includes('./assets/dashboard.css?v=20261122v194'), `${t.htmlPath} must bump dashboard.css to v194`);
  assert.ok(html.includes(`id="${t.selectId}"`), `${t.htmlPath} missing #${t.selectId}`);
  assert.ok(html.includes(`id="${t.bannerId}"`), `${t.htmlPath} missing #${t.bannerId}`);
  assert.ok(js.includes('CSO_ODISHA_DISTRICTS'), `${t.jsPath} must read CSO_ODISHA_DISTRICTS`);
  assert.ok(js.includes("get('district')"), `${t.jsPath} must support ?district= deep-linking`);
  assert.match(css, /\.cso-district-banner__link[\s\S]*?min-height:\s*44px;/, `${t.cssPath} must enforce 44px touch target`);

  // Strict CSP compliance
  assert.ok(!/<style\b/i.test(html), `No inline <style> in ${t.htmlPath}`);
  assert.ok(!/\sstyle\s*=/i.test(html), `No style="" in ${t.htmlPath}`);
  assert.ok(!/\sonclick\s*=/i.test(html), `No onclick= in ${t.htmlPath}`);
  const noExt = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
  const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  assert.ok(!/<script\b/i.test(noJsonLd), `No executable inline <script> in ${t.htmlPath}`);
  assert.ok(!/\.innerHTML\b/.test(js), `No .innerHTML in ${t.jsPath}`);
}

assert.ok(!/\.innerHTML\b/.test(districtsJs), 'No .innerHTML in assets/js/odisha-districts.js');

console.log('PASS: All 30 Odisha districts, Collectorate banner, ?district= deep-link & strict CSP verified (v194)');
