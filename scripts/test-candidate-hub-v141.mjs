import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const htmlPath = 'student-dashboard/index.html';
const cssPath = 'assets/css/student-dashboard-bp.css';
const jsPath = 'assets/js/student-dashboard.js';
const html = read(htmlPath);
const css = read(cssPath);
const js = read(jsPath);

// 1. HTML wiring
assert.ok(html.includes('Candidate Hub — OPSC, OSSC, Teaching &amp; National Exam Workspace'), 'hub title present');
const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
assert.match(head, /<link rel="stylesheet" href="\/assets\/style\.css/, 'head loads style.css');
assert.match(head, /<script src="\/assets\/shared-header\.js[^"]*"><\/script>/, 'head loads shared-header.js synchronously');
assert.ok(!/<script src="\/assets\/shared-header\.js[^>]*(defer|async)/.test(head), 'shared-header.js not deferred');
assert.ok(html.includes('/assets/img/cso-logo-96.webp'), 'uses cso-logo-96.webp');
assert.ok(html.includes('class="cso-brand-emblem"'), 'uses cso-brand-emblem');
assert.ok(!html.includes('bp-brand-icon'), 'legacy CS box removed');
assert.ok(!html.includes('bp-sidebar-install-btn') && !html.includes('bp-sidebar-logout-btn'), 'sidebar duplicate buttons removed');
assert.ok(html.includes('id="topbar-pwa-install-btn"') && html.includes('id="bp-topbar-logout-btn"'), 'top bar keeps install/sign out');
assert.ok(html.includes('View All Schemes →'), 'View All Schemes CTA');
assert.ok(html.includes('Continue Syllabus →'), 'Continue Syllabus CTA');
assert.ok(html.includes('PYQ Mastery'), 'PYQ Mastery pill');
assert.ok(!html.includes('data-cso-student-theme'), 'legacy student theme attribute removed');

// 2. CSS theme binding
for (const v of ['--cso-bg', '--cso-surface', '--cso-text', '--cso-primary']) {
  assert.ok(css.includes(`var(${v}`), `CSS uses ${v}`);
}
for (const bad of ['#090e18', '#0f172a', '#131d33', '#1e293b']) {
  assert.ok(!css.toLowerCase().includes(bad), `CSS must not hardcode ${bad}`);
}
assert.ok(!/data-cso-student-theme/.test(css), 'CSS free of legacy student theme selectors');
assert.ok(css.includes('scrollbar-width: thin') && /width: 4px/.test(css), '4px thin nav scrollbar');
assert.ok(css.includes('var(--cso-highlight-bg') && css.includes('var(--cso-highlight-fg'), 'active pill highlight vars');
assert.ok(css.includes('stroke: var(--cso-primary)'), 'theme-reactive ring stroke');

// 3. Schemes cap
const limit = Number((js.match(/SCHEME_PREVIEW_LIMIT\s*=\s*(\d+)/) || [])[1]);
assert.ok(limit > 0 && limit <= 6, `schemes preview limit ${limit} must be <= 6`);
assert.ok(js.includes('ranked.slice(0, SCHEME_PREVIEW_LIMIT)'), 'schemes rows sliced to cap');

// 4. CSP compliance
for (const [name, src] of [[htmlPath, html], [jsPath, js]]) {
  assert.ok(!/\sstyle\s*=\s*["']/i.test(src), `${name}: no inline style=""`);
  assert.ok(!/\.innerHTML\b/.test(src), `${name}: no .innerHTML`);
  assert.ok(!/\sonerror\s*=/i.test(src), `${name}: no inline onerror`);
}
assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), 'no inline <script> in hub HTML');
assert.ok(!/\.style\.|insertAdjacentHTML/.test(js), 'no JS style injection');

// 4b. v142: single Sign Out, no clipping, emblem avatars
const signOutBtns = (html.match(/<button[^>]*>[^<]*Sign Out[^<]*<\/button>/g) || []).filter(b => !b.includes('bp-profile-logout-btn'));
assert.ok(!html.includes('cso-profile-signout'), 'no inner profile card Sign Out button in HTML');
assert.ok(!js.includes('cso-profile-signout'), 'no inner profile card Sign Out wiring in JS');
assert.equal((html.match(/id="bp-topbar-logout-btn"/g) || []).length, 1, 'exactly one top-bar Sign Out');
assert.equal(signOutBtns.length, 0, 'no stray Sign Out text buttons outside top bar/settings');
assert.match(css, /\.cso-logout-icon-btn \{[^}]*flex-shrink: 0;[^}]*white-space: nowrap;[^}]*padding: 8px 14px;/, 'top Sign Out flex-shrink: 0');
assert.match(css, /\.bp-topbar \{\s*flex-wrap: nowrap;\s*gap: 8px;\s*padding-right: 16px;/, 'topbar nowrap');
assert.ok(html.includes('id="bp-top-avatar"') && html.includes('id="cso-profile-avatar"'), 'avatars present');
assert.ok(!/class="bp-avatar" id="bp-top-avatar"/.test(html), 'top avatar is emblem');
assert.ok((html.match(/width="32" height="32" class="cso-brand-emblem"/g) || []).length >= 2, 'emblem avatars 32x32');
assert.ok(html.includes('student-dashboard-bp.css?v=20261118v142') && html.includes('student-dashboard.js?v=20261118v142'), 'cache-bust query strings');

// 5. Cache bump
assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v142'"), 'sw.js CACHE_NAME v142');
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v142'"), 'ops-sentinel v142');

console.log('Candidate Hub v142 checks passed.');
