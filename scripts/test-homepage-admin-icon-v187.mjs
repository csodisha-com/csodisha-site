import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8');

// 1. Verify index.html renders the /admin/ shield icon next to Login without cso-adm-stealth
const acctMatch = indexHtml.match(/<div class="acct">([\s\S]*?)<\/div>/);
assert.ok(acctMatch, 'index.html must contain .acct utility container');
const acctBlock = acctMatch[1];
assert.ok(acctBlock.includes('href="/admin/"'), 'index.html .acct must link to /admin/');
assert.ok(acctBlock.includes('class="adm cso-adm-icon-only"'), 'index.html admin shield must use class="adm cso-adm-icon-only"');
assert.equal(acctBlock.includes('cso-adm-stealth'), false, 'index.html admin shield must not be hidden by cso-adm-stealth');
assert.ok(acctBlock.includes('aria-label="Admin Studio"'), 'index.html admin shield must have aria-label="Admin Studio"');
assert.ok(acctBlock.includes('title="Admin Studio"'), 'index.html admin shield must have title="Admin Studio"');
assert.ok(acctBlock.indexOf('href="/admin/"') < acctBlock.indexOf('id="auth"'), 'Admin shield must appear immediately to the left of Login (#auth)');

// 2. Verify style.css keeps .top .adm.cso-adm-icon-only visible on desktop and 44px on mobile
assert.ok(styleCss.includes('.top .adm.cso-adm-icon-only {\n  display: inline-flex !important;'), 'Desktop CSS must keep .top .adm.cso-adm-icon-only visible');
assert.ok(styleCss.includes('min-width: 44px !important;\n    min-height: 44px !important;'), 'Mobile CSS must enforce 44px touch target');

// 3. Verify 100% CSP compliance on index.html
assert.equal(/<style\b/i.test(indexHtml), false, 'Zero <style> in index.html');
assert.equal(/\sstyle="/i.test(indexHtml), false, 'Zero style="" in index.html');
assert.equal(/\sonclick=/i.test(indexHtml), false, 'Zero onclick= in index.html');
const nonLdScripts = [...indexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
for (const s of nonLdScripts) {
  assert.equal(s[2].trim(), '', 'Executable scripts in index.html must be external');
}

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v187'"), 'sw.js must be bumped to v187');

console.log('test-homepage-admin-icon-v187: ALL CHECKS PASSED');
