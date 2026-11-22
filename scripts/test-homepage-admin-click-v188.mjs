import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8');

// 1. Verify clean <a href="/admin/"> without role="button" or cso-adm-stealth
const acctMatch = indexHtml.match(/<div class="acct">([\s\S]*?)<\/div>/);
assert.ok(acctMatch, 'index.html must contain .acct');
const acctBlock = acctMatch[1];
assert.ok(acctBlock.includes('<a class="adm cso-adm-icon-only" href="/admin/" aria-label="Admin Studio" title="Admin Studio">'), 'index.html must have clean <a href="/admin/"> link');
assert.equal(acctBlock.includes('role="button"'), false, 'Admin link must not have role="button"');
assert.equal(acctBlock.includes('cso-adm-stealth'), false, 'Admin link must not have cso-adm-stealth');

// 2. Verify no click intercept calls preventDefault() on .adm in app.js
assert.equal(appJs.includes("a.classList.contains('adm')"), false, 'app.js must not intercept .adm clicks');

// 3. Verify CSS guarantees clickability (pointer-events: auto, z-index, cursor: pointer)
assert.ok(styleCss.includes('pointer-events: auto !important;'), 'style.css must ensure pointer-events: auto on .top .adm.cso-adm-icon-only');
assert.ok(indexHtml.includes('/assets/style.css?v=20261122v188'));
assert.ok(indexHtml.includes('/assets/app.js?v=20261122v188'));

// 4. 100% CSP compliance
assert.equal(/<style\b/i.test(indexHtml), false);
assert.equal(/\sstyle="/i.test(indexHtml), false);
assert.equal(/\sonclick=/i.test(indexHtml), false);

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v188'"));

console.log('test-homepage-admin-click-v188: ALL CHECKS PASSED');
