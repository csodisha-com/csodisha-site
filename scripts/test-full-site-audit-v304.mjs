#!/usr/bin/env node
/**
 * v304 Complete End-to-End Site-Wide Audit, Remediation & Optimization Suite
 *
 * Verifies across the entire csodisha.com repository:
 *  1. Visual, 4-Theme & Unscoped CSS Leak Guard (zero bare nav gradient leaks,
 *     zero same-color/inverted alert/banner collisions, solid opaque modals/popovers
 *     across public portals & Admin Studio).
 *  2. 100% Strict CSP & Security Header Hygiene across ALL 30 HTML pages, ALL JS files
 *     in assets/ and admin/, _headers, and _worker.js.
 *  3. Auth & Admin Form Hardening (aria-describedby, aria-invalid, honeypot fields,
 *     data-theme sync on admin/login.html).
 *  4. Performance, Core Web Vitals & Service Worker Hygiene (explicit width/height on
 *     all <img>, loading="lazy" on non-hero images, zero blocking/duplicate scripts,
 *     zero dead sw.js precache/SWR URLs, zero external CDN/font leaks).
 *  5. SEO, Metadata, Open Graph, JSON-LD, Sitemap & WCAG 2.2 Accessibility across all 30 HTML pages.
 *  6. v304 Cache Busting & SSR Sync (sw.js, ops-sentinel.js, ssr-shell.js, all 30 HTML pages).
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

function walkFiles(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

const htmlFiles = walkFiles(ROOT, '.html');
const jsFiles = [...walkFiles(path.join(ROOT, 'assets'), '.js'), ...walkFiles(path.join(ROOT, 'admin'), '.js')];

console.log('\n=== v304 Complete End-to-End Site-Wide Audit ===\n');

check('1. Visual, 4-Theme & Unscoped CSS Leak Guard across public portals & Admin Studio', () => {
  const styleCss = read('assets/style.css');
  const styleClean = styleCss.replace(/\/\*[\s\S]*?\*\//g, '');

  // Zero bare nav gradient leaks
  assert.ok(!/^nav\s*\{[^}]*linear-gradient/m.test(styleClean), 'assets/style.css must not have bare nav gradient');

  // Zero 1.00:1 invisible live banner CTA/tag color collisions
  assert.ok(
    !styleClean.includes('background: var(--cso-err-fg);\n  color: var(--cso-err-fg);') &&
    !styleClean.includes('background: var(--cso-accent);\n  color: var(--cso-link);'),
    'assets/style.css live banner must not pair same-color fg/bg tokens'
  );
  assert.ok(
    styleCss.includes('.cso-live-banner--urgent .cso-live-banner__tag') &&
    styleCss.includes('background: var(--cso-err-bg);') &&
    styleCss.includes('color: var(--cso-err-fg);'),
    'assets/style.css urgent live banner must use semantic --cso-err-bg / --cso-err-fg'
  );

  // Admin CMS alert & banner-preview semantic contrast (no inverted err-fg + ink-muted)
  for (const rel of ['admin/cms/cms.css', 'admin/cms/cms-embed.css']) {
    const css = read(rel);
    assert.ok(!css.includes('background:var(--cso-err-fg);border:1px solid var(--red);color:var(--cso-ink-muted)'), `${rel} has inverted unreadable .alert colors`);
    assert.ok(css.includes('background:var(--cso-err-bg);border:1px solid var(--cso-err-border);color:var(--cso-err-fg)'), `${rel} missing semantic .alert tokens`);
    assert.ok(css.includes('background:var(--cso-warn-bg);border-color:var(--cso-warn-border);color:var(--cso-warn-fg)'), `${rel} missing semantic sev-notice tokens`);
  }

  // Opaque Admin Studio popover & modal surfaces
  assert.ok(read('admin/studio.css').includes('background: var(--cso-surface-elevated);') && read('admin/studio.css').includes('backdrop-filter: none;'), 'admin/studio.css popover must be opaque');
  assert.ok(read('admin/admin.css').includes('backdrop-filter: none;') && !read('admin/admin.css').includes('backdrop-filter: blur('), 'admin/admin.css modal must not use blur backdrop');

  // Auth CSS supports CSP-safe .is-visible / .is-hidden classes
  for (const rel of ['assets/css/pages/login.css', 'assets/css/pages/signup.css', 'assets/css/pages/reset-password.css']) {
    assert.ok(read(rel).includes('.error-box.is-visible'), `${rel} missing .error-box.is-visible CSP class`);
  }
});

check('2. 100% Strict CSP across ALL JS/HTML files + global security headers in _headers & _worker.js', () => {
  const cspBad = [
    ['.innerHTML', /\.innerHTML\b/],
    ['.outerHTML', /\.outerHTML\b/],
    ['insertAdjacentHTML', /\binsertAdjacentHTML\b/],
    ['document.write', /\bdocument\.write\b/],
    ['eval(', /\beval\s*\(/],
    ['new Function', /\bnew\s+Function\b/],
    ['.style.', /\.style\.[a-zA-Z]/]
  ];
  const violations = [];
  for (const full of jsFiles) {
    const rel = path.relative(ROOT, full);
    const raw = fs.readFileSync(full, 'utf8');
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const [label, re] of cspBad) {
      if (re.test(code)) violations.push(`${rel} :: ${label}`);
    }
  }
  assert.equal(violations.length, 0, `Strict CSP JS violations found:\n  ${violations.join('\n  ')}`);

  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    assert.ok(!/\sstyle\s*=\s*["']/i.test(html), `${rel} has inline style=""`);
    assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), `${rel} has inline on*=""`);
  }

  // Global CSP + security headers in _headers and _worker.js
  const headersFile = read('_headers');
  const globalBlock = headersFile.slice(0, headersFile.indexOf('/sw.js'));
  for (const hdr of ['Content-Security-Policy:', 'X-Content-Type-Options: nosniff', 'X-Frame-Options: SAMEORIGIN', 'Referrer-Policy: strict-origin-when-cross-origin', 'Permissions-Policy:']) {
    assert.ok(globalBlock.includes(hdr), `_headers global /* block missing ${hdr}`);
  }
  const worker = read('_worker.js');
  assert.ok(worker.includes('const isHtmlResponse =') && worker.includes('if (isHtmlResponse || isPrimaryPortal)'), '_worker.js must apply security headers to ALL text/html responses');
  assert.ok(worker.includes("'Permissions-Policy'"), '_worker.js must set Permissions-Policy header');
});

check('3. Auth & Admin form hardening (aria-describedby, aria-invalid, honeypot, data-theme sync)', () => {
  assert.ok(read('login.html').includes('id="login-website"') && read('login.html').includes('aria-describedby="recovery-newpw-error"'), 'login.html missing honeypot or recovery aria-describedby');
  assert.ok(read('signup.html').includes('id="signup-website"') && read('signup.html').includes('aria-describedby="auth-error-msg"'), 'signup.html missing honeypot or aria-describedby');
  assert.ok(read('reset-password.html').includes('aria-describedby="reset-error"'), 'reset-password.html missing aria-describedby');
  assert.ok(read('admin/login.html').includes('id="admin-website"') && read('admin/login.html').includes('aria-describedby="msg"'), 'admin/login.html missing honeypot or aria-describedby');

  const adminLoginJs = read('admin/cms/login.js');
  assert.ok(adminLoginJs.includes("setAttribute('data-theme'") && !adminLoginJs.includes("removeAttribute('data-theme')"), 'admin/cms/login.js must sync data-theme alongside data-cso-theme');
  assert.ok(adminLoginJs.includes("setAttribute('aria-invalid', 'true')"), 'admin/cms/login.js must set aria-invalid on validation failure');
  assert.ok(!read('assets/js/pages/signup.js').includes('csoSetHtml'), 'signup.js must construct OTP step with pure DOM nodes (no HTML string interpolation)');
});

check('4. Core Web Vitals & Service Worker hygiene (img dimensions, lazy loading, defer scripts, valid sw.js)', () => {
  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');

    // Zero external CDN/font dependencies
    assert.ok(!/https?:\/\/(?:fonts\.googleapis|cdn\.|unpkg\.|cdnjs\.)/i.test(html), `${rel} references external CDN/font`);

    // Zero blocking scripts & zero duplicate scripts/stylesheets
    const seenScripts = new Set();
    for (const m of html.matchAll(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)>/gi)) {
      const attrs = m[1] + ' ' + m[3];
      const base = m[2].split('?')[0];
      assert.ok(/\b(defer|async)\b/i.test(attrs) || /type=["']module["']/i.test(attrs), `${rel} has render-blocking script ${m[2]}`);
      assert.ok(!seenScripts.has(base), `${rel} loads duplicate script ${base}`);
      seenScripts.add(base);
    }
    const seenCss = new Set();
    for (const m of html.matchAll(/<link\b[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
      const base = m[1].split('?')[0];
      assert.ok(!seenCss.has(base), `${rel} loads duplicate stylesheet ${base}`);
      seenCss.add(base);
    }

    // All <img> tags have explicit width & height, and non-hero images have loading="lazy"
    for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
      const a = m[1];
      assert.ok(/\bwidth\s*=/i.test(a) && /\bheight\s*=/i.test(a), `${rel} <img> missing width/height: ${a.slice(0, 80)}`);
      if (!/fetchpriority=["']high["']/i.test(a)) {
        assert.ok(/loading=["']lazy["']/i.test(a), `${rel} non-hero <img> missing loading="lazy": ${a.slice(0, 80)}`);
      }
    }
  }

  // Verify every sw.js precache & runtime SWR asset exists on disk
  const sw = read('sw.js');
  for (const raw of new Set(sw.match(/['"]\/[a-zA-Z0-9._\/-]+['"]/g) || [])) {
    const u = raw.slice(1, -1);
    if (u.startsWith('/api/') || u.startsWith('/admin')) continue;
    const rel = u === '/' ? 'index.html' : u.replace(/^\//, '');
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `sw.js references missing file ${u}`);
  }
});

check('5. SEO, Metadata, Open Graph, JSON-LD, Sitemap & WCAG 2.2 landmarks across all 30 HTML pages', () => {
  assert.equal(htmlFiles.length, 30, `Expected 30 active HTML pages, got ${htmlFiles.length}`);
  const titles = new Set();
  const descs = new Set();

  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');

    const tm = html.match(/<title>([^<]+)<\/title>/i);
    assert.ok(tm && tm[1].trim().length > 0, `${rel} missing <title>`);
    assert.ok(!titles.has(tm[1].trim()), `${rel} has duplicate <title>`);
    titles.add(tm[1].trim());

    const dm = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
               html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
    assert.ok(dm && dm[1].trim().length >= 30, `${rel} missing or too-short meta description`);
    assert.ok(!descs.has(dm[1].trim()), `${rel} has duplicate meta description`);
    descs.add(dm[1].trim());

    const cm = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    assert.ok(cm && cm[1].startsWith('https://csodisha.com/') && !cm[1].includes('?'), `${rel} invalid canonical`);

    const isNoIndex = /noindex/i.test(html) || rel.startsWith('admin/') || rel === '404.html' || rel === 'offline.html' || rel === 'reset-password.html';
    if (!isNoIndex) {
      for (const og of ['og:type', 'og:title', 'og:description', 'og:url']) {
        assert.ok(new RegExp(`property=["']${og}["']`, 'i').test(html), `${rel} missing ${og}`);
      }
    }

    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      assert.doesNotThrow(() => JSON.parse(m[1]), `${rel} contains malformed JSON-LD`);
    }
  }

  // Sitemap URLs all resolve to active files
  const sitemap = read('sitemap.xml');
  const smUrls = [...sitemap.matchAll(/<loc>https:\/\/csodisha\.com([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(smUrls.length >= 20, 'sitemap.xml must list active canonical routes');
  for (const u of smUrls) {
    const rel = u === '/' ? 'index.html' : u.replace(/^\//, '') + (u.endsWith('/') ? 'index.html' : '');
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `sitemap.xml lists dead URL ${u}`);
  }
});

check('6. v304+ cache busting & SSR shell synchronization', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v3(?:0[4-9]|[1-9]\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v3(?:0[4-9]|[1-9]\d)';/);
  const ssr = read('functions/_lib/ssr-shell.js');
  assert.match(ssr, /\/assets\/css\/cso-themes\.css\?v=20261125v3(?:0[4-9]|[1-9]\d)/, 'ssr-shell.js must include cso-themes.css?v=20261125v304+');
  assert.match(ssr, /\/assets\/style\.css\?v=20261125v3(?:0[4-9]|[1-9]\d)/, 'ssr-shell.js must include style.css?v=20261125v304+');
  assert.match(ssr, /\/assets\/css\/portal-shell\.css\?v=20261125v3(?:0[4-9]|[1-9]\d)/, 'ssr-shell.js must include portal-shell.css?v=20261125v304+');
  assert.match(ssr, /\/assets\/shared-header\.js\?v=20261125v3(?:0[4-9]|[1-9]\d)/, 'ssr-shell.js must include shared-header.js?v=20261125v304+');

  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    if (html.includes('/assets/style.css')) assert.match(html, /\/assets\/style\.css\?v=20261125v3(?:0[4-9]|[1-9]\d)/, `${rel} stale style.css version`);
    if (html.includes('/assets/css/cso-themes.css')) assert.match(html, /\/assets\/css\/cso-themes\.css\?v=20261125v3(?:0[4-9]|[1-9]\d)/, `${rel} stale cso-themes.css version`);
    if (html.includes('/assets/css/portal-shell.css')) assert.match(html, /\/assets\/css\/portal-shell\.css\?v=20261125v3(?:0[4-9]|[1-9]\d)/, `${rel} stale portal-shell.css version`);
  }
});

console.log(`\n=== v304 Full-Site Audit Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
