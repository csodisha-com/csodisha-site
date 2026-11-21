// v168: About Dark-Mode Sidebar Uniformity & Cross-Explorer Sidebar Audit.
// Usage: node scripts/test-about-dark-sidebar-v168.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const aboutCss = read('about/assets/about-explorer.css');
const aboutHtml = read('about/index.html');
const aboutJs = read('about/assets/about-explorer.js');

// 1. /about/ CSS binds :root tokens to --cso-* theme variables
ok(aboutCss.includes('--bg: var(--cso-bg'), 'about-explorer.css :root --bg uses var(--cso-bg)');
ok(aboutCss.includes('--card: var(--cso-surface'), 'about-explorer.css :root --card uses var(--cso-surface)');
ok(aboutCss.includes('--ink: var(--cso-text'), 'about-explorer.css :root --ink uses var(--cso-text)');
ok(aboutCss.includes('--line: var(--cso-border'), 'about-explorer.css :root --line uses var(--cso-border)');

// 2. /about/ sidebar (.cso-about-rail), nav links, active state & buttons have zero hardcoded white surfaces
const railStart = aboutCss.indexOf('.about-sidebar,\n.cso-about-rail {');
ok(railStart >= 0, 'about-explorer.css defines .cso-about-rail');
const railBlock = aboutCss.slice(railStart, aboutCss.indexOf('}', railStart) + 1);
ok(/background:\s*var\(--cso-surface\b/.test(railBlock), '.cso-about-rail uses var(--cso-surface)');
ok(!/background:\s*#fff(?:fff)?\b/i.test(railBlock), '.cso-about-rail has zero hardcoded #fff/#ffffff');

const navLinkStart = aboutCss.indexOf('.cso-about-nav-link {');
const navLinkBlock = aboutCss.slice(navLinkStart, aboutCss.indexOf('}', navLinkStart) + 1);
ok(/color:\s*var\(--cso-text\b/.test(navLinkBlock), '.cso-about-nav-link uses var(--cso-text)');

const navActiveStart = aboutCss.indexOf('.cso-about-nav-link.is-active {');
const navActiveBlock = aboutCss.slice(navActiveStart, aboutCss.indexOf('}', navActiveStart) + 1);
ok(/background:\s*var\(--cso-highlight-bg\b/.test(navActiveBlock), '.cso-about-nav-link.is-active uses var(--cso-highlight-bg)');
ok(/color:\s*var\(--cso-highlight-fg\b/.test(navActiveBlock), '.cso-about-nav-link.is-active uses var(--cso-highlight-fg)');

const btnStart = aboutCss.indexOf('.cso-about-btn {');
const btnBlock = aboutCss.slice(btnStart, aboutCss.indexOf('}', btnStart) + 1);
ok(/background:\s*var\(--cso-surface-alt\b/.test(btnBlock), '.cso-about-btn (Print A4 Guide) uses var(--cso-surface-alt)');
ok(!/background:\s*#fff(?:fff)?\b/i.test(btnBlock), '.cso-about-btn has zero hardcoded #fff/#ffffff');

// 3. Explicit dark-mode overrides exist for [data-cso-theme="dark"] and [data-theme="dark"]
ok(aboutCss.includes(':root[data-cso-theme="dark"] .cso-about-rail') && aboutCss.includes(':root[data-theme="dark"] .cso-about-rail'), 'explicit dark-mode .cso-about-rail override exists');
ok(aboutCss.includes(':root[data-cso-theme="dark"] .cso-about-nav-link.is-active'), 'explicit dark-mode active pill override exists');

// 4. Cross-explorer sidebar audit: /schemes/, /community/, /study-library/
const schemesCss = read('schemes/assets/schemes-explorer.css');
const commCss = read('community/assets/community-explorer.css');
const studyCss = read('study-library/assets/dashboard.css');
ok(/\.cso-schemes-rail\{[^}]*background:var\(--cso-surface/.test(schemesCss), 'schemes-explorer.css rail uses var(--cso-surface)');
ok(/\.cso-comm-rail\{[^}]*background:var\(--cso-surface/.test(commCss), 'community-explorer.css rail uses var(--cso-surface)');
ok(/\.sidebar\s*\{[^}]*background:\s*var\(--cso-surface\b[^}]*!important/.test(studyCss), 'study-library/assets/dashboard.css sidebar uses var(--cso-surface)');

// 5. 100% CSP compliance on /about/
ok(!/<style[\s>]/i.test(aboutHtml), 'about/index.html: zero inline <style>');
ok(!/\sstyle\s*=/i.test(aboutHtml), 'about/index.html: zero style="" attributes');
ok(!/<[^>]*\son[a-z]+\s*=/i.test(aboutHtml), 'about/index.html: zero inline event handlers');
for (const m of aboutHtml.matchAll(/<script\b([^>]*)>/gi)) {
  ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), 'about/index.html: zero executable inline <script>');
}
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(aboutJs), 'about-explorer.js: zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(aboutJs), 'about-explorer.js: zero onclick=');

// 6. Asset & Cache version bumps (v168)
ok(aboutHtml.includes('/about/assets/about-explorer.css?v=20261121v168'), 'about/index.html references about-explorer.css v168');
ok(/CACHE_NAME = 'cso-candidate-cache-v168'/.test(read('sw.js')), 'sw.js bumped to v168');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v168'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v168');
ok(/cso-candidate-cache-v168/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v168');

console.log(`test-about-dark-sidebar-v168: ${passed} assertions passed`);
