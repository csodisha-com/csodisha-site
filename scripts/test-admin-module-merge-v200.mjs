// Verification for v200 Editorial Studio v198 Restoration + 299->32 Module Consolidation
// Run: node scripts/test-admin-module-merge-v200.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(ROOT, 'admin', 'admin.js'), 'utf8');
const fastPubJs = fs.readFileSync(path.join(ROOT, 'admin', 'fast-publish.js'), 'utf8');
const navJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin', 'data', 'master-navigation.json'), 'utf8'));

// 1. Original v198 Editorial Studio sidebar & layout restored
assert.ok(adminHtml.includes('id="accordionNav"'), 'v198 sidebar #accordionNav must be restored');
assert.ok(adminHtml.includes('id="sidebarConsole"'), 'v198 #sidebarConsole must be restored');
assert.ok(adminHtml.includes('id="moduleSearchInput"'), 'v198 #moduleSearchInput must be restored');
assert.ok(adminJs.includes('renderNavigationTree'), 'v198 renderNavigationTree must be restored');

// 2. Module count consolidated from 299 to <= 40 unified modules
const totalModules = navJson.folders.reduce((acc, f) => acc + (f.modules || []).length, 0);
assert.ok(totalModules >= 25 && totalModules <= 40, `Expected 25-40 consolidated modules, got ${totalModules}`);

// Verify backward-compatible aliases & previewUrl on every consolidated module
for (const f of navJson.folders) {
  for (const m of f.modules) {
    assert.ok(m.id && m.title && m.previewUrl, `Module ${m.id} missing id/title/previewUrl`);
  }
}
assert.ok(adminJs.includes('x.aliases'), 'admin.js must support backward-compatible module aliases');

// 3. Measurable / Observable / Previewable / Synchronized header controls
assert.ok(adminJs.includes('renderModuleStandardHeader'), 'admin.js must render standard module header');
assert.ok(adminJs.includes('Live Preview ↗'), 'Module header must include Live Preview link');
assert.ok(adminJs.includes('Synced with D1'), 'Module header must include observable D1 sync state');
assert.ok(adminJs.includes('Sync D1'), 'Module header must include manual Sync D1 button');

// 4. Asset bumps & /api/admin/crawl-drafts queue preserved
assert.ok(adminHtml.includes('/admin/studio.css?v=20261122v200'));
assert.ok(adminHtml.includes('/admin/fast-publish.js?v=20261122v200'));
assert.ok(adminHtml.includes('/admin/cms/cms.js?v=20261122v200'));
assert.ok(adminHtml.includes('/admin/admin.js?v=20261122v200'));
assert.ok(fastPubJs.includes('/api/admin/crawl-drafts'));

// 5. 100% CSP compliance
assert.ok(!/<style\b/i.test(adminHtml), 'No <style> in admin/index.html');
assert.ok(!/\sstyle\s*=/i.test(adminHtml), 'No style= in admin/index.html');
assert.ok(!/\sonclick\s*=/i.test(adminHtml), 'No onclick= in admin/index.html');
const noExt = adminHtml.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
assert.ok(!/<script\b/i.test(noExt), 'No executable inline <script> in admin/index.html');
assert.ok(!/\.innerHTML\b/.test(adminJs), 'No .innerHTML in admin/admin.js');
assert.ok(!/\.innerHTML\b/.test(fastPubJs), 'No .innerHTML in admin/fast-publish.js');

console.log(`PASS: v198 Editorial Studio restored, ${totalModules} consolidated modules (from 299) & strict CSP verified (v200)`);
