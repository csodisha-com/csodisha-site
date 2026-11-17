import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const styleCss = read('assets/style.css');
const sharedHeader = read('assets/shared-header.js');
const jobsCss = read('jobs-careers/assets/dashboard.css');
const studyCss = read('study-library/assets/dashboard.css');
const commDashCss = read('community/assets/dashboard.css');
const schemesCss = read('schemes/assets/schemes-explorer.css');
const commCss = read('community/assets/community-explorer.css');

// 1. Conflicting legacy :root / [data-theme="..."] blocks removed from sub-page stylesheets
for (const [name, css] of [
  ['jobs-careers/assets/dashboard.css', jobsCss],
  ['study-library/assets/dashboard.css', studyCss],
  ['community/assets/dashboard.css', commDashCss],
  ['schemes/assets/schemes-explorer.css', schemesCss],
  ['community/assets/community-explorer.css', commCss],
]) {
  assert.equal(/:root\s*\{/.test(css), false, `${name} must not define conflicting :root overrides`);
  assert.equal(/\[data-theme=["']dark["']\]/.test(css), false, `${name} must not define legacy [data-theme="dark"]`);
}

// 2. Global sub-page theme propagation rules exist in assets/style.css
for (const selector of [
  ':root[data-cso-theme] .app-shell',
  ':root[data-cso-theme] .cso-schemes-shell',
  ':root[data-cso-theme] .cso-comm-shell',
  ':root[data-cso-theme] .sidebar',
  ':root[data-cso-theme] .cso-schemes-rail',
  ':root[data-cso-theme] .cso-comm-rail',
  ':root[data-cso-theme] .cso-schemes-hero',
  ':root[data-cso-theme] .cso-comm-hero',
  ':root[data-cso-theme] .dashboard-card',
  ':root[data-cso-theme] .stat-card',
]) {
  assert.ok(styleCss.includes(selector), `assets/style.css must include ${selector}`);
}

// 3. Ctrl+K search pill and Student Hub NEW single-line alignment
assert.ok(sharedHeader.includes('apply: () => setPortalTheme(activePortalTheme, false)'), 'window.CSOTheme.apply() must be exposed');
assert.ok(sharedHeader.includes('cso-ctl-search-label'), 'Ctrl+K search button must render .cso-ctl-search-label');
assert.ok(sharedHeader.includes('cso-ctl-search-kbd'), 'Ctrl+K search button must render <kbd class="cso-ctl-search-kbd">');
assert.equal(sharedHeader.includes('.innerHTML'), false, 'shared-header.js must obey zero .innerHTML CSP rule');

assert.ok(styleCss.includes('#cso-ctl-global-search'), 'assets/style.css must style #cso-ctl-global-search');
assert.ok(styleCss.includes('.cso-ctl-search-kbd'), 'assets/style.css must style .cso-ctl-search-kbd');
assert.ok(styleCss.includes('.main-nav a'), 'assets/style.css must style .main-nav a');
assert.ok(styleCss.includes('.cso-nav-badge'), 'assets/style.css must style .cso-nav-badge');
assert.ok(/\.main-nav a\s*\{[^}]*white-space:\s*nowrap/s.test(styleCss), '.main-nav a must prevent wrapping');

// 4. Synchronous <head> shared-header.js load on all 4 directory pages
for (const htmlPath of [
  'jobs-careers/index.html',
  'schemes/index.html',
  'study-library/index.html',
  'community/index.html',
]) {
  const html = read(htmlPath);
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  assert.ok(headMatch, `${htmlPath} must have <head>`);
  assert.ok(
    /shared-header\.js\?v=20261117ap"><\/script>/.test(headMatch[1]),
    `${htmlPath} must load shared-header.js synchronously in <head>`
  );
  assert.equal(/shared-header\.js[^>]*defer/i.test(html), false, `${htmlPath} must not defer shared-header.js`);
}

console.log('✅ test-theme-system-v137 passed');
