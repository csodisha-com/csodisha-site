// Verification for v199 Compact 3-Tab Admin Studio (eliminating 299-module bloat)
// Run: node scripts/test-admin-compact-v199.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(ROOT, 'admin', 'admin.js'), 'utf8');
const fastPubJs = fs.readFileSync(path.join(ROOT, 'admin', 'fast-publish.js'), 'utf8');
const studioCss = fs.readFileSync(path.join(ROOT, 'admin', 'studio.css'), 'utf8');

// 1. No 299-module unpaginated wall in admin/index.html or admin/admin.js
assert.ok(!adminHtml.includes('id="accordionNav"'), '299-module #accordionNav wall must be removed from admin/index.html');
assert.ok(!adminHtml.includes('299'), '299-module bloat labels must be removed from admin/index.html');
assert.ok(!adminJs.includes('renderNavigationTree'), 'Unpaginated renderNavigationTree must be removed from admin/admin.js');
assert.ok(adminJs.includes('PAGE_SIZE = 10'), 'Schemes & Study module list must paginate at 10 items per page');

// 2. 3-tab simplified navigation & 3-mode Jobs bar + <details class="cso-advanced-toggle">
assert.ok(adminHtml.includes('data-admin-tab="jobs"'), 'Tab 1 (Jobs & .gov.in Queue) required');
assert.ok(adminHtml.includes('data-admin-tab="schemes-study"'), 'Tab 2 (Schemes & Study) required');
assert.ok(adminHtml.includes('data-admin-tab="system-ops"'), 'Tab 3 (System & Ops) required');
assert.ok(adminJs.includes('cso-advanced-toggle'), 'Optional job fields must be tucked inside details.cso-advanced-toggle');
assert.ok(adminJs.includes('New / Edit Job') && adminJs.includes('.gov.in Queue') && adminJs.includes('Daily Digest'));

// 3. Asset version bumps & centered 820px workspace + 44px touch targets
assert.ok(adminHtml.includes('/admin/studio.css?v=20261122v199'));
assert.ok(adminHtml.includes('/admin/fast-publish.js?v=20261122v199'));
assert.ok(adminHtml.includes('/admin/cms/cms.js?v=20261122v199'));
assert.ok(adminHtml.includes('/admin/admin.js?v=20261122v199'));
assert.ok(studioCss.includes('max-width: 820px'));
assert.ok(studioCss.includes('min-height: 44px'));

// 4. /api/admin/crawl-drafts queue & Daily Digest preserved
assert.ok(fastPubJs.includes('/api/admin/crawl-drafts'));
assert.ok(fastPubJs.includes('Sync Live D1 Queue'));
assert.ok(fastPubJs.includes('renderBroadcastDigestPanel'));

// 5. 100% CSP compliance
assert.ok(!/<style\b/i.test(adminHtml), 'No <style> in admin/index.html');
assert.ok(!/\sstyle\s*=/i.test(adminHtml), 'No style= in admin/index.html');
assert.ok(!/\sonclick\s*=/i.test(adminHtml), 'No onclick= in admin/index.html');
const noExt = adminHtml.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
assert.ok(!/<script\b/i.test(noExt), 'No executable inline <script> in admin/index.html');
assert.ok(!/\.innerHTML\b/.test(adminJs), 'No .innerHTML in admin/admin.js');
assert.ok(!/\.innerHTML\b/.test(fastPubJs), 'No .innerHTML in admin/fast-publish.js');

console.log('PASS: Compact 3-tab Admin Studio, 10/page pagination, .gov.in queue & strict CSP verified (v199)');
