// v167: Study Library Dark-Mode Surface Bleed & Card Pagination verification.
// Usage: node scripts/test-study-library-theme-v167.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const css = read('study-library/assets/dashboard.css');
const js = read('study-library/assets/dashboard.js');
const html = read('study-library/index.html');
const ssrActions = read('study-library/assets/ssr-actions.js');

// 1. Zero hardcoded white backgrounds on Study Library surface & control selectors
const surfaceChecks = [
  ['.app-shell {\n  background:', /background:\s*var\(--cso-bg\b/],
  ['.main-content {', /background:\s*var\(--cso-surface\b/],
  ['.study-continue-strip {', /background:\s*var\(--cso-surface-alt\b/],
  ['.study-continue-chip {', /background:\s*var\(--cso-surface\b/],
  ['.live-study-section {', /background:\s*var\(--cso-surface-alt\b/],
  ['.study-lang-toggle {', /background:\s*var\(--cso-surface\b/],
  ['.study-input,\n.study-select {\n  width: 100%;', /background:\s*var\(--cso-search-bg\b/],
  ['.study-type-pill {', /background:\s*var\(--cso-pill-bg\b/],
  ['.dashboard-card {', /background:\s*var\(--cso-card-bg\b/],
  ['.dashboard-card:nth-child(n) {', /background:\s*var\(--cso-card-bg\b/],
  ['.recent-card {', /background:\s*var\(--cso-card-bg\b/],
  ['.telemetry-panel {', /background:\s*var\(--cso-surface-alt\b/],
  ['.sidebar-footer a {', /background:\s*var\(--cso-surface-alt\b/],
  ['.study-modal-card {\n  width:', /background:\s*var\(--cso-surface\b/]
];

for (const [marker, re] of surfaceChecks) {
  const idx = css.lastIndexOf(marker);
  ok(idx >= 0, `dashboard.css contains ${marker}`);
  const block = css.slice(idx, css.indexOf('}', idx) + 1);
  ok(re.test(block), `${marker} uses CSS theme variable`);
  ok(!/background:\s*#fff(?:fff)?\b/i.test(block), `${marker} has zero hardcoded #fff/#ffffff background`);
}

// Sidebar desktop & mobile drawers must also use var(--cso-surface) instead of #ffffff !important
ok(!/\.sidebar\s*\{[^}]*background:\s*#ffffff\s*!important/i.test(css), 'sidebar does not force #ffffff !important');
ok(/\.sidebar\s*\{[^}]*background:\s*var\(--cso-surface\b[^}]*!important/i.test(css), 'sidebar uses var(--cso-surface) !important');

// Dark-mode sidebar footer links must not force white text on light surface
ok(!/:root\[data-cso-theme="dark"\] \.sidebar-footer a,\s*:root\[data-cso-theme="dark"\] #back-button\s*\{\s*color:\s*#ffffff;/i.test(css), 'dark mode sidebar-footer a uses theme text var');

// 2. Load More pagination logic in dashboard.js
ok(js.includes('const PAGE_SIZE = 12;'), 'dashboard.js defines PAGE_SIZE = 12');
ok(js.includes('visibleCount: PAGE_SIZE'), 'dashboard.js initializes state.visibleCount = PAGE_SIZE');
ok(js.includes('filtered.slice(0, state.visibleCount)'), 'dashboard.js slices filtered cards to state.visibleCount');
ok(js.includes('study-load-more-wrap') && js.includes('study-load-more-btn'), 'dashboard.js creates Load More wrapper & button');
ok(js.includes('Load More Resources (Showing ${visible.length} of ${filtered.length})'), 'dashboard.js displays Showing X of Y label');
ok(js.includes('state.visibleCount += PAGE_SIZE;') && js.includes("btn.addEventListener('click'"), 'Load More uses addEventListener and increments by PAGE_SIZE');

// Reset visibleCount on search, exam select, type pills, goal match, quickjump, reset
const resetMatches = js.match(/state\.visibleCount\s*=\s*PAGE_SIZE;/g) || [];
ok(resetMatches.length >= 6, `dashboard.js resets visibleCount = PAGE_SIZE across all filter handlers (${resetMatches.length} sites)`);

// Pagination CSS styling
ok(css.includes('.study-load-more-wrap') && css.includes('.study-load-more-btn'), 'dashboard.css styles Load More button');

// 3. 100% CSP compliance (zero inline <style>, style="", executable <script>, onclick=, .innerHTML)
ok(!/<style[\s>]/i.test(html), 'study-library/index.html: zero inline <style>');
ok(!/\sstyle\s*=/i.test(html), 'study-library/index.html: zero style="" attributes');
ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), 'study-library/index.html: zero inline event handlers');
for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
  ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), 'study-library/index.html: zero executable inline <script>');
}
for (const [name, src] of [['dashboard.js', js], ['ssr-actions.js', ssrActions]]) {
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${name}: zero innerHTML sinks`);
  ok(!/\bonclick\s*=/.test(src), `${name}: zero onclick=`);
}

// 4. Asset & Cache version bumps (v167)
ok(html.includes('./assets/dashboard.css?v=20261121v167'), 'study-library/index.html references dashboard.css v167');
ok(html.includes('./assets/dashboard.js?v=20261121v167'), 'study-library/index.html references dashboard.js v167');
ok(read('functions/_lib/study-library-ssr.js').includes('/study-library/assets/dashboard.css?v=20261121v167'), 'study-library-ssr.js references dashboard.css v167');
ok(/CACHE_NAME = 'cso-candidate-cache-v167'/.test(read('sw.js')), 'sw.js bumped to v167');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v167'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v167');
ok(/cso-candidate-cache-v167/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v167');

console.log(`test-study-library-theme-v167: ${passed} assertions passed`);
