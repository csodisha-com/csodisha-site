#!/usr/bin/env node
/**
 * v306 Unified "All" Tab for Latest Updates (Public Homepage + Admin Studio)
 *
 * Verifies:
 *  1. index.html renders 6 Latest Updates tabs in order:
 *     All | Jobs | Schemes | Education | Odisha | National
 *     with data-tab="all", role="tab", aria-selected="true" active by default.
 *  2. assets/js/homepage-blocks.js and assets/app.js preserve canonical categories
 *     under Odia/Hindi localization and guarantee "All" is prepended & active.
 *  3. assets/style.css binds .lu .tabs button to semantic 4-theme tokens and >= 44px touch targets.
 *  4. admin/homepage-studio.js previews the unified 6-tab bar across all 4 themes,
 *     admin/cms/cms.js adds the All | Jobs | Schemes | Education | Odisha | National
 *     filter bar + category selector, and functions/api/admin/_router.js emits X-CSO-Cache-Purged: 1.
 *  5. Strict CSP compliance & v306 cache busting across index.html, admin/index.html,
 *     ssr-shell.js, sw.js, and ops-sentinel.js.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

console.log('\n=== v306 Latest Updates "All" Tab (Public + Admin Studio) Verification ===\n');

check('1. index.html renders 6 Latest Updates tabs (All | Jobs | Schemes | Education | Odisha | National) with All active', () => {
  const html = read('index.html');
  const m = html.match(/<div class="tabs"[^>]*role="tablist"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(m, 'index.html missing .tabs role="tablist"');
  const buttons = [...m[1].matchAll(/<button[^>]*data-tab="([^"]+)"[^>]*>([^<]+)<\/button>/g)];
  assert.deepEqual(buttons.map((b) => b[1]), ['all', 'jobs', 'schemes', 'education', 'odisha', 'national']);
  assert.deepEqual(buttons.map((b) => b[2]), ['All', 'Jobs', 'Schemes', 'Education', 'Odisha', 'National']);
  assert.ok(/data-tab="all"[^>]*aria-selected="true"/.test(m[1]), 'All tab must have aria-selected="true" by default');
});

check('2. homepage-blocks.js & app.js preserve canonical categories & guarantee All tab first', () => {
  const hb = read('assets/js/homepage-blocks.js');
  assert.ok(hb.includes("node.setAttribute('data-tab', tabKey)"), 'homepage-blocks.js must set data-tab');
  assert.ok(hb.includes("node.setAttribute('data-category', canonicalCat)"), 'homepage-blocks.js must preserve canonical data-category');
  assert.ok(hb.includes("title_en: 'All'"), 'homepage-blocks.js must fallback-prepend All tab if missing from D1');

  const app = read('assets/app.js');
  assert.ok(app.includes("activeCat==='all'"), 'app.js lu() must match All case-insensitively');
  assert.ok(app.includes("const canonical=(s.dataset.category||s.textContent||'').trim()||'All'"), 'app.js bindLuTabs must preserve canonical category under localization');
  assert.ok(app.includes('setCategory:'), 'app.js must expose csoHome.setCategory');
});

check('3. assets/style.css binds .lu .tabs button to semantic 4-theme tokens & 44px touch targets', () => {
  const css = read('assets/style.css');
  assert.ok(css.includes('.lu .tabs button.a,') && css.includes('.lu .tabs button[aria-selected="true"]'), 'style.css missing active .lu .tabs button selector');
  assert.ok(css.includes('background: var(--cso-accent);') && css.includes('color: var(--cso-accent-ink);'), 'style.css missing semantic --cso-accent / --cso-accent-ink');
  assert.ok(css.includes('min-height: 44px;'), 'style.css missing 44px touch target on .lu .tabs button');
});

check('4. Admin Homepage Studio, Announcements Studio & _router.js cache purge synced', () => {
  const hs = read('admin/homepage-studio.js');
  assert.ok(hs.includes("title_en: 'All', title_or: 'ସମସ୍ତ'") && hs.includes("title_en: 'National'"), 'homepage-studio.js must preview all 6 unified tabs');
  const hscss = read('admin/homepage-studio.css');
  assert.ok(hscss.includes('.hs-pv__stage--latest_updates_tabs button.is-active'), 'homepage-studio.css missing active preview tab style');

  const cms = read('admin/cms/cms.js');
  assert.ok(cms.includes("var NOTICE_TABS = ['All', 'Jobs', 'Schemes', 'Education', 'Odisha', 'National'];"), 'cms.js missing NOTICE_TABS');
  assert.ok(cms.includes('cso-lu-admin-tabs'), 'cms.js missing Announcements filter bar');
  assert.ok(cms.includes("Homepage Tab / Category"), 'cms.js missing Homepage Tab / Category selector in composer');

  const router = read('functions/api/admin/_router.js');
  assert.ok(router.includes("X-CSO-Cache-Purged"), '_router.js must set X-CSO-Cache-Purged on admin mutations');
});

check('5. Strict CSP compliance & v306+ cache busting', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v3(?:0[6-9]|[1-9]\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v3(?:0[6-9]|[1-9]\d)';/);
  assert.ok(read('index.html').includes('/assets/style.css?v=20261125v306'), 'index.html missing style.css?v=20261125v306');
  assert.ok(read('index.html').includes('/assets/app.js?v=20261125v306'), 'index.html missing app.js?v=20261125v306');
  assert.ok(read('index.html').includes('/assets/js/homepage-blocks.js?v=20261125v306'), 'index.html missing homepage-blocks.js?v=20261125v306');
  assert.ok(read('admin/index.html').includes('/admin/homepage-studio.js?v=20261125v306'), 'admin/index.html missing homepage-studio.js?v=20261125v306');
  assert.ok(read('admin/index.html').includes('/admin/cms/cms.js?v=20261125v306'), 'admin/index.html missing cms.js?v=20261125v306');

  for (const jsRel of ['assets/js/homepage-blocks.js', 'admin/homepage-studio.js']) {
    const code = read(jsRel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.', 'document.write']) {
      assert.ok(!code.includes(bad), `${jsRel} violates strict CSP (${bad})`);
    }
  }
});

console.log(`\n=== v306 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
