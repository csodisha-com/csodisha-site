import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const globalEnhJs = fs.readFileSync(path.join(root, 'assets/js/cso-global-enhancements.js'), 'utf8');

// 1. Verify index.html has clean <a href="/admin/"> and v189 script tags
assert.ok(indexHtml.includes('<a class="adm cso-adm-icon-only" href="/admin/" aria-label="Admin Studio" title="Admin Studio">'));
assert.ok(indexHtml.includes('/assets/app.js?v=20261122v189'));
assert.ok(indexHtml.includes('/assets/js/cso-global-enhancements.js?v=20261122v189'));

// 2. Verify global click listeners bail out early on .adm / /admin/ before preventDefault()
const appClickMatches = [...appJs.matchAll(/document\.addEventListener\('click',e=>\{([\s\S]{0,220})/g)];
assert.equal(appClickMatches.length, 2, 'app.js must have 2 document click handlers checked');
for (const m of appClickMatches) {
  const snippet = m[1];
  assert.ok(snippet.includes("e.target.closest('a.adm, a[href^=\"/admin\"]')"), 'app.js click handler must bail out early on .adm / /admin');
  assert.ok(snippet.indexOf('admLink') < snippet.indexOf('preventDefault'), 'admLink bailout must precede preventDefault()');
}
assert.ok(globalEnhJs.includes("e.target.closest('a.adm, a[href^=\"/admin\"]')"), 'cso-global-enhancements.js must bail out early on .adm / /admin');

// 3. 100% CSP compliance
assert.equal(/<style\b/i.test(indexHtml), false);
assert.equal(/\sstyle="/i.test(indexHtml), false);
assert.equal(/\sonclick=/i.test(indexHtml), false);

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v189'"));

console.log('test-homepage-admin-click-v189: ALL CHECKS PASSED');
