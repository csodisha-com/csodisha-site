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
assert.ok(html.includes('student-dashboard-bp.css?v=20261118v143') && html.includes('student-dashboard.js?v=20261118v143'), 'cache-bust query strings');

// 4c. v143: typography & contrast tokens
const v143 = css.slice(css.indexOf('v143 Typography'));
assert.ok(v143.length > 100, 'v143 typography block present');
assert.match(v143, /font-size: 0\.9375rem;[\s\S]*?line-height: 1\.55;[\s\S]*?-webkit-font-smoothing: antialiased/, 'base 15px / 1.55 / antialiased');
const sizeOf = (sel) => {
  const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{]*\\{([^}]*)\\}', 'g');
  let m, last = null;
  while ((m = re.exec(v143))) { const f = m[1].match(/font-size:\s*([\d.]+)px/); if (f) last = Number(f[1]); }
  return last;
};
for (const sel of ['.cso-list-item-sub', '.cso-cd-meta', '.bp-user-district', '.cso-pill-badge', '.cso-paper-pill', '.cso-metric-pill', '.cso-readiness-tag', '.cso-nav-never']) {
  if (sel === '.cso-nav-never') continue;
  assert.ok(sizeOf(sel) >= 13, `${sel} font-size >= 13px (got ${sizeOf(sel)})`);
}
for (const sel of ['.bp-nav-item', '.cso-list-item-title', '.cso-drill-opt']) {
  assert.ok(sizeOf(sel) >= 14, `${sel} font-size >= 14px (got ${sizeOf(sel)})`);
}
assert.ok(sizeOf('.bp-panel-title') >= 17 && sizeOf('.bp-panel-title') <= 22, 'panel titles 17-22px');
assert.ok(sizeOf('.bp-nav-label') === 12, 'section headers 12px');
for (const tok of ['#111827', '#374151', '#F8FAFC', '#CBD5E1', '#241C14', '#4A3B2C']) {
  assert.ok(v143.includes(tok), `contrast token ${tok}`);
}
// WCAG contrast checks (>= 7:1)
const lum = (hex) => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const [fg, bg] of [['#111827', '#FAF9F6'], ['#374151', '#FAF9F6'], ['#374151', '#F5EFE2'], ['#F8FAFC', '#0B1218'], ['#CBD5E1', '#0B1218'], ['#CBD5E1', '#131E29'], ['#241C14', '#F5EFE2'], ['#4A3B2C', '#F5EFE2']]) {
  assert.ok(ratio(fg, bg) >= 7, `${fg} on ${bg} contrast ${ratio(fg, bg).toFixed(2)} >= 7`);
}
assert.ok(html.includes('student-dashboard-bp.css?v=20261118v143') && html.includes('student-dashboard.js?v=20261118v143'), 'v143 cache-bust');

// 5. Cache bump
assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v143'"), 'sw.js CACHE_NAME v143');
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v143'"), 'ops-sentinel v143');

console.log('Candidate Hub v143 checks passed.');
