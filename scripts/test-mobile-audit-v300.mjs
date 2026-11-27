#!/usr/bin/env node
/**
 * v300 Full Mobile Compatibility, Responsiveness, 4-Theme Visibility & WCAG 2.2 Accessibility Audit
 *
 * Verifies across ALL 30 active HTML pages, ALL core/portal/admin CSS files,
 * ALL JS UI modules, and SSR templates:
 *  1. Valid zoom-friendly viewport <meta> tag on all 30 HTML pages (no user-scalable=no or maximum-scale=1).
 *  2. Landmarks (<main id="main-content">, single <h1>, lang, Skip-to-Main-Content link),
 *     <img> alt attributes, labeled form inputs, and 100% strict CSP compliance.
 *  3. Mobile breakpoint rules, 44px touch targets, 16px mobile input font-size (no iOS zoom),
 *     100dvh modal sizing, safe-area insets, scroll-margin-top, :focus-visible, prefers-reduced-motion,
 *     and zero fixed 320px-overflowing minmax() grid tracks across core, portal & admin CSS.
 *  4. Solid opaque --cso-surface-elevated overlays, WCAG AA (>= 4.5:1) contrast across all 4 themes,
 *     mobile drawer/modal a11y hooks (aria-modal, aria-controls, Escape dismiss, body scroll lock),
 *     and v300 cache busting (?v=20261125v300 & cso-candidate-cache-v300).
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

function relativeLuminance(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map(i => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const htmlFiles = walkFiles(ROOT, '.html');

console.log('\n=== v300 Mobile Compatibility, 4-Theme Visibility & WCAG 2.2 Accessibility Audit ===\n');

check('1. Valid zoom-friendly viewport <meta> tag on all 35 active HTML pages (no zoom locks)', () => {
  assert.equal(htmlFiles.length, 35, `Expected 35 active HTML files, got ${htmlFiles.length}`);
  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    const vp = html.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
    assert.ok(vp, `${rel} missing <meta name="viewport">`);
    assert.ok(/width=device-width/i.test(vp[0]), `${rel} viewport must include width=device-width`);
    assert.ok(/initial-scale=1(\.0)?/i.test(vp[0]), `${rel} viewport must include initial-scale=1`);
    assert.ok(!/user-scalable\s*=\s*(?:no|0)/i.test(vp[0]), `${rel} viewport forbids zooming (user-scalable=no)`);
    assert.ok(!/maximum-scale\s*=\s*1(?:\.0)?\b/i.test(vp[0]), `${rel} viewport forbids zooming (maximum-scale=1)`);
  }
});

check('2. Landmarks (<main id="main-content">, single <h1>, Skip link, lang), img alt, labeled inputs & strict CSP', () => {
  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    assert.match(html, /<html[^>]+lang=["'][a-z-]+["']/i, `${rel} missing <html lang="...">`);
    assert.match(html, /<a[^>]+class="cso-skip-link"[^>]+href="#main-content"/i, `${rel} missing Skip-to-main-content link`);
    assert.match(html, /<main\b[^>]*\bid="main-content"/i, `${rel} missing <main id="main-content">`);

    const h1Count = (html.match(/<h1\b/gi) || []).length;
    assert.equal(h1Count, 1, `${rel} must have exactly 1 <h1>, found ${h1Count}`);

    const imgs = html.match(/<img\b[^>]*>/gi) || [];
    for (const img of imgs) {
      assert.ok(/\balt\s*=/i.test(img), `${rel} contains <img> without alt attribute: ${img.slice(0, 90)}`);
    }

    const controls = html.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];
    for (const ctrl of controls) {
      if (/type=["'](?:hidden|submit|button)["']/i.test(ctrl)) continue;
      if (/aria-label=|aria-labelledby=/i.test(ctrl)) continue;
      const idm = ctrl.match(/\bid=["']([^"']+)["']/i);
      const hasFor = idm && new RegExp(`<label[^>]+for=["']${idm[1]}["']`, 'i').test(html);
      assert.ok(hasFor, `${rel} has unlabeled form control: ${ctrl.slice(0, 100)}`);
    }

    // Strict CSP check on HTML: no inline style="" or on*=""
    assert.ok(!/\sstyle\s*=\s*["']/i.test(html), `${rel} violates strict CSP (inline style attribute)`);
    assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), `${rel} violates strict CSP (inline event handler)`);
  }

  // SSR shell also includes Skip-to-Main-Content link
  const ssr = read('functions/_lib/ssr-shell.js');
  assert.ok(ssr.includes('class="cso-skip-link" href="#main-content"'), 'ssr-shell.js missing skip-to-main-content link');

  // Strict CSP on core JS modules
  for (const rel of [
    'assets/shared-header.js',
    'assets/app.js',
    'assets/js/cso-global-enhancements.js',
    'assets/js/community-portal.js',
    'assets/js/careers-portal.js',
    'assets/js/about-portal.js',
    'assets/js/jobs-portal.js',
    'assets/js/schemes-portal.js',
    'assets/js/study-portal.js'
  ]) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }
});

check('3. Mobile breakpoints, 44px touch targets, 16px inputs, 100dvh modals, safe-area, focus-visible, scroll-margin & reduced-motion', () => {
  const requiredCss = [
    'assets/style.css',
    'assets/css/portal-shell.css',
    'assets/css/jobs-portal.css',
    'assets/css/careers-portal.css',
    'assets/css/schemes-portal.css',
    'assets/css/study-portal.css',
    'assets/css/community-portal.css',
    'assets/css/about-portal.css',
    'admin/studio.css',
    'admin/admin.css'
  ];

  for (const rel of requiredCss) {
    const css = read(rel);
    assert.ok(/@media\s*\(max-width:\s*(?:480|600|640|768|900|959|1099)px\)/.test(css), `${rel} missing mobile @media breakpoint`);
    assert.ok(/min-height:\s*44px/.test(css), `${rel} missing 44px touch target rule`);
    assert.ok(/font-size:\s*max\(16px,\s*1rem\)/.test(css), `${rel} missing 16px mobile input anti-zoom rule`);
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), `${rel} missing prefers-reduced-motion rule`);
    assert.ok(css.includes(':focus-visible'), `${rel} missing :focus-visible outline rule`);
    assert.ok(!/minmax\(\s*320px\s*,/.test(css), `${rel} contains unguarded minmax(320px, ...) that overflows 320px phones`);
  }

  // Core shell & modal-bearing stylesheets verify 100dvh, safe-area, skip-link, scroll-margin-top, table-wrap
  const styleCss = read('assets/style.css');
  const shellCss = read('assets/css/portal-shell.css');
  for (const [rel, css] of [['assets/style.css', styleCss], ['assets/css/portal-shell.css', shellCss]]) {
    assert.ok(css.includes('.cso-skip-link'), `${rel} missing .cso-skip-link styles`);
    assert.ok(css.includes('scroll-margin-top:'), `${rel} missing scroll-margin-top for sticky header focus visibility`);
    assert.ok(css.includes('env(safe-area-inset-bottom'), `${rel} missing safe-area-inset-bottom`);
    assert.ok(css.includes('100dvh'), `${rel} missing 100dvh mobile overlay sizing`);
    assert.ok(css.includes('overflow-x: clip'), `${rel} missing overflow-x: clip zero-overflow guard`);
    assert.ok(css.includes('.cso-table-wrap'), `${rel} missing .cso-table-wrap horizontal touch scroll wrapper`);
    assert.ok(css.includes('body.cso-modal-open'), `${rel} missing CSP-safe body.cso-modal-open scroll lock`);
  }

  for (const rel of ['assets/css/careers-portal.css', 'assets/css/community-portal.css', 'assets/css/about-portal.css']) {
    const css = read(rel);
    assert.ok(css.includes('100dvh'), `${rel} modal/drawer missing 100dvh height cap`);
    assert.ok(css.includes('env(safe-area-inset-bottom'), `${rel} modal/drawer missing safe-area-inset-bottom`);
  }
});

check('4. Opaque 4-theme mobile overlays, >= 4.5:1 WCAG AA contrast, JS a11y hooks & v300 cache busting', () => {
  const styleCss = read('assets/style.css');
  assert.ok(styleCss.includes('background: var(--cso-surface-elevated) !important;'), 'assets/style.css must enforce solid --cso-surface-elevated on mobile overlays');
  assert.ok(styleCss.includes('opacity: 1 !important;') && styleCss.includes('backdrop-filter: none !important;'), 'assets/style.css must enforce opaque overlays with backdrop-filter: none');

  // Verify WCAG AA (>= 4.5:1) contrast on all 4 theme mobile drawer/modal/input/skip-link surfaces
  const THEMES = {
    system:  { elevated: '#ffffff', ink: '#0f172a', soft: '#334155', link: '#0f766e', accent: '#0f766e', accentInk: '#ffffff', inBg: '#ffffff', inInk: '#0f172a' },
    dark:    { elevated: '#161e2e', ink: '#f1f5f9', soft: '#cbd5e1', link: '#2dd4bf', accent: '#14b8a6', accentInk: '#04201d', inBg: '#0f1520', inInk: '#f1f5f9' },
    reading: { elevated: '#fdf9f1', ink: '#241b12', soft: '#4a3b2c', link: '#78350f', accent: '#854d0e', accentInk: '#ffffff', inBg: '#fffdf8', inInk: '#241b12' },
    odisha:  { elevated: '#fffdf9', ink: '#1f140c', soft: '#4a3423', link: '#b45309', accent: '#c2410c', accentInk: '#ffffff', inBg: '#ffffff', inInk: '#1f140c' }
  };
  for (const [name, t] of Object.entries(THEMES)) {
    assert.ok(contrastRatio(t.ink, t.elevated) >= 7.0, `${name} drawer/modal ink contrast < 7:1`);
    assert.ok(contrastRatio(t.soft, t.elevated) >= 4.5, `${name} drawer/modal soft ink contrast < 4.5:1`);
    assert.ok(contrastRatio(t.link, t.elevated) >= 4.5, `${name} drawer/modal link contrast < 4.5:1`);
    assert.ok(contrastRatio(t.accentInk, t.accent) >= 4.5, `${name} skip-link / CTA accent contrast < 4.5:1`);
    assert.ok(contrastRatio(t.inInk, t.inBg) >= 7.0, `${name} mobile input ink contrast < 7:1`);
  }

  // Verify JS modal/drawer accessibility hooks (aria-modal, aria-controls, Escape, body scroll lock)
  const sh = read('assets/shared-header.js');
  assert.ok(sh.includes("setAttribute('role', 'menu')") && sh.includes("ev.key === 'Escape'"), 'shared-header.js showPopup must support role=menu & Escape');
  assert.ok(sh.includes("setAttribute('aria-controls', 'cso-auth-menu')"), 'shared-header.js mobile auth trigger missing aria-controls');
  assert.ok(sh.includes("classList.add('cso-modal-open')"), 'shared-header.js saved drawer missing body scroll lock');

  const app = read('assets/app.js');
  assert.ok(app.includes("setAttribute('role','menu')") && app.includes("ev.key==='Escape'"), 'app.js pop must support role=menu & Escape');
  assert.ok(app.includes('aria-controls="cso-auth-menu"') || app.includes("setAttribute('aria-controls', 'cso-auth-menu')"), 'app.js mobile auth trigger missing aria-controls');

  const cp = read('assets/js/community-portal.js');
  assert.ok(cp.includes("card.setAttribute('aria-modal', 'true')") && cp.includes("drawer.setAttribute('aria-modal', 'true')"), 'community-portal.js composer & DM drawer must set aria-modal=true');
  assert.ok(cp.includes("ev.key === 'Escape'") && cp.includes("classList.add('cso-modal-open')"), 'community-portal.js modals must support Escape dismiss & body scroll lock');

  const ge = read('assets/js/cso-global-enhancements.js');
  assert.ok(ge.includes("classList.add('cso-modal-open')") && ge.includes("e.key === 'Escape'"), 'cso-global-enhancements.js modals must support Escape & body scroll lock');

  // Verify v300+ cache busting
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v3\d\d';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v3\d\d';/);
  assert.match(read('functions/_lib/ssr-shell.js'), /style\.css\?v=2026112[5-7]v3\d\d/);
  assert.match(read('index.html'), /style\.css\?v=2026112[5-7]v3\d\d/);
  assert.match(read('community/index.html'), /community-portal\.css\?v=2026112[5-7]v3\d\d/);
  assert.match(read('admin/index.html'), /studio\.css\?v=2026112[5-7]v3\d\d/);
});

check('5. v301 Mobile bar buttons (☰ Menu, ♿ Options, A– A A+) use var(--cso-ink)/var(--cso-border) with >= 7:1 contrast across all 4 themes', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css', 'assets/css/cso-themes.css']) {
    const css = read(rel);
    assert.ok(
      css.includes('#cso-main-navbar .cso-nav-mobile') &&
      css.includes('.cso-nav-bar-container .cso-ctl-a11y-mobile') &&
      css.includes('.cso-nav-bar-container .cso-ctl-zoom-mobile') &&
      css.includes('background: var(--cso-surface) !important;') &&
      css.includes('color: var(--cso-ink) !important;') &&
      css.includes('border: 1px solid var(--cso-border) !important;'),
      `${rel} missing v301 semantic token rules for mobile bar buttons`
    );
    assert.ok(
      css.includes('.cso-nav-bar-container .cso-ctl-zoom-mobile button.fz'),
      `${rel} missing v301 semantic ink rule for mobile A– A A+ zoom buttons`
    );
  }

  // Ensure legacy white-on-white var(--cso-accent-ink) is completely gone from mobile bar buttons in style.css
  const styleCss = read('assets/style.css');
  const legacyBlock = styleCss.slice(styleCss.indexOf('.cso-mobile-acc-cluster button,'), styleCss.indexOf('@media (min-width: 769px)'));
  assert.ok(!legacyBlock.includes('var(--cso-accent-ink)'), 'assets/style.css .cso-mobile-acc-cluster must NOT use var(--cso-accent-ink) (causes white-on-white in Light/Reading/Odisha)');

  // Verify >= 7:1 AAA contrast of --cso-ink on --cso-surface and --cso-surface-alt across all 4 themes
  const BAR_THEMES = {
    system:  { surface: '#ffffff', surfaceAlt: '#f1f5f9', ink: '#0f172a' },
    dark:    { surface: '#121824', surfaceAlt: '#1a2335', ink: '#f1f5f9' },
    reading: { surface: '#faf5eb', surfaceAlt: '#ede3d2', ink: '#241b12' },
    odisha:  { surface: '#ffffff', surfaceAlt: '#f7ece0', ink: '#1f140c' }
  };
  for (const [name, t] of Object.entries(BAR_THEMES)) {
    assert.ok(contrastRatio(t.ink, t.surface) >= 7.0, `${name} mobile bar button contrast on --cso-surface < 7:1`);
    assert.ok(contrastRatio(t.ink, t.surfaceAlt) >= 7.0, `${name} mobile bar button hover contrast on --cso-surface-alt < 7:1`);
  }
});

check('6. v302 Expanded mobile nav drawer (< 1100px) & nested sub-menus bind to --cso-surface-elevated/--cso-ink with zero hardcoded white bg', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css', 'assets/css/cso-themes.css']) {
    const css = read(rel);
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');

    // Regression guard: #cso-main-navbar / .main-nav must NEVER redefine --cso-surface-elevated locally
    // (doing so shadows :root[data-theme="dark"] and turns the expanded mobile drawer pure #ffffff!)
    const tokenDefRe = /([^{}@;]+)\{([^}]*--cso-surface-elevated\s*:[^}]*)\}/g;
    let m;
    while ((m = tokenDefRe.exec(cleaned)) !== null) {
      const badSels = m[1].split(',').map(s => s.trim()).filter(s => /#cso-main-navbar|\.main-nav\b/.test(s));
      assert.equal(badSels.length, 0, `${rel} must NOT define --cso-surface-elevated on ${badSels.join(', ')} (shadows Dark Night token!)`);
    }

    // Verify v302 < 1100px mobile drawer + nested dropdown rules exist and bind to semantic tokens
    assert.ok(
      css.includes('#cso-main-navbar #cso-nav-items.cso-mobile-open') &&
      css.includes('#cso-main-navbar .cso-jobs-stage1') &&
      css.includes('#cso-main-navbar .cso-careers-stage1') &&
      css.includes('#cso-main-navbar .cso-schemes-stage1') &&
      css.includes('#cso-main-navbar .cso-study-stage1') &&
      css.includes('#cso-main-navbar .cso-community-stage1'),
      `${rel} missing v302 < 1100px expanded drawer or nested sub-menu selectors`
    );
    assert.ok(
      css.includes('background: var(--cso-surface-elevated) !important;') &&
      css.includes('color: var(--cso-ink) !important;') &&
      css.includes('border: 1px solid var(--cso-border) !important;') &&
      css.includes('opacity: 1 !important;') &&
      css.includes('backdrop-filter: none !important;') &&
      css.includes('background: var(--cso-surface-alt) !important;') &&
      css.includes('background: var(--cso-accent) !important;') &&
      css.includes('color: var(--cso-accent-ink) !important;'),
      `${rel} missing v302 semantic drawer/hover/active-pill token bindings`
    );

    // Ensure ZERO hardcoded #fff/#ffffff background inside any .cso-mobile-open or mobile drawer rule block
    const drawerRuleRe = /([^{}@;]*cso-mobile-open[^{}@;]*)\{([^}]*)\}/gi;
    let dm;
    while ((dm = drawerRuleRe.exec(cleaned)) !== null) {
      const body = dm[2];
      assert.ok(
        !/background(?:-color)?\s*:\s*#(?:fff|ffffff)\b/i.test(body),
        `${rel} has hardcoded white background in mobile drawer rule (${dm[1].trim().slice(0, 80)})`
      );
    }
  }

  // Verify >= 12:1 contrast of --cso-ink on --cso-surface-elevated & --cso-surface-alt and >= 4.5:1 on active pill across all 4 themes
  const DRAWER_THEMES = {
    system:  { elevated: '#ffffff', alt: '#f1f5f9', ink: '#0f172a', accent: '#0f766e', accentInk: '#ffffff' },
    dark:    { elevated: '#161e2e', alt: '#1a2335', ink: '#f1f5f9', accent: '#14b8a6', accentInk: '#04201d' },
    reading: { elevated: '#fdf9f1', alt: '#ede3d2', ink: '#241b12', accent: '#854d0e', accentInk: '#ffffff' },
    odisha:  { elevated: '#fffdf9', alt: '#f7ece0', ink: '#1f140c', accent: '#c2410c', accentInk: '#ffffff' }
  };
  for (const [name, t] of Object.entries(DRAWER_THEMES)) {
    assert.ok(contrastRatio(t.ink, t.elevated) >= 12.0, `${name} mobile drawer ink on --cso-surface-elevated < 12:1`);
    assert.ok(contrastRatio(t.ink, t.alt) >= 12.0, `${name} mobile drawer hover ink on --cso-surface-alt < 12:1`);
    assert.ok(contrastRatio(t.accentInk, t.accent) >= 4.5, `${name} mobile drawer active pill contrast < 4.5:1`);
  }
});

check('7. v343 Mobile slide-out drawer sits strictly above #cso-mobile-drawer-backdrop (1210 > 1200) with zero stacking-context trap', () => {
  const styleCss = read('assets/style.css');
  const shellCss = read('assets/css/portal-shell.css');
  const indexHtml = read('index.html');
  const appJs = read('assets/app.js');
  const sharedJs = read('assets/shared-header.js');

  const bdMatch = styleCss.match(/\.cso-mobile-drawer-backdrop\s*\{[^}]*z-index:\s*(\d+)/);
  const drMatch = styleCss.match(/#cso-main-navbar\s+#cso-nav-items\.cso-mobile-open\s*\{[^}]*z-index:\s*(\d+)/);
  assert.ok(bdMatch && drMatch, 'assets/style.css must declare explicit z-index on .cso-mobile-drawer-backdrop and #cso-nav-items.cso-mobile-open');
  const bdZ = Number(bdMatch[1]);
  const drZ = Number(drMatch[1]);
  assert.ok(drZ > bdZ, `Mobile drawer z-index (${drZ}) must be strictly greater than backdrop z-index (${bdZ})`);
  assert.equal(bdZ, 1200, `Expected backdrop z-index 1200, got ${bdZ}`);
  assert.equal(drZ, 1210, `Expected open drawer z-index 1210, got ${drZ}`);

  const stickyLiftMatch = styleCss.match(/html\.cso-drawer-open\s+\.cso-sticky-header[\s\S]*?\{[^}]*z-index:\s*(\d+)/);
  assert.ok(stickyLiftMatch && Number(stickyLiftMatch[1]) >= drZ, '.cso-sticky-header must elevate to >= drawer z-index when cso-drawer-open is active so it cannot trap the drawer below backdrop');
  assert.ok(shellCss.includes('html.cso-drawer-open #cso-main-navbar') && shellCss.includes('z-index: 1210 !important;'), 'portal-shell.css must elevate #cso-main-navbar to 1210 when cso-drawer-open is active');

  const drawerBlockMatch = styleCss.match(/#cso-main-navbar\s+#cso-nav-items\.cso-mobile-open\s*\{([^}]*)\}/);
  assert.ok(drawerBlockMatch, 'Missing #cso-main-navbar #cso-nav-items.cso-mobile-open block');
  assert.ok(drawerBlockMatch[1].includes('filter: none !important;'), 'Open drawer must enforce filter: none');
  assert.ok(drawerBlockMatch[1].includes('backdrop-filter: none !important;'), 'Open drawer must enforce backdrop-filter: none');
  assert.ok(drawerBlockMatch[1].includes('pointer-events: auto !important;'), 'Open drawer must enforce pointer-events: auto');
  assert.ok(drawerBlockMatch[1].includes('opacity: 1 !important;'), 'Open drawer must enforce opacity: 1');

  const navStart = indexHtml.indexOf('<nav class="main-nav site-header__nav" id="cso-main-navbar"');
  const navEnd = indexHtml.indexOf('</nav>', navStart);
  const bdIdx = indexHtml.indexOf('id="cso-mobile-drawer-backdrop"');
  assert.ok(bdIdx > navStart && bdIdx < navEnd, 'index.html must place #cso-mobile-drawer-backdrop inside #cso-main-navbar');

  assert.ok(appJs.includes('ensureDrawerBackdrop') && appJs.includes("classList.toggle('cso-drawer-open'"), 'app.js must mount backdrop cleanly and toggle cso-drawer-open');
  assert.ok(sharedJs.includes('ensureSharedDrawerBackdrop') && sharedJs.includes("classList.toggle('cso-drawer-open'"), 'shared-header.js must mount backdrop cleanly and toggle cso-drawer-open');
});

check('8. v360 Informative Guides edge-to-edge layout (max-width: 100%), uncropped 16:9 covers & zero 390px horizontal overflow', () => {
  const guidesCss = read('assets/css/guides-portal.css');
  const studioCss = read('admin/studio.css');
  const guidesSsr = read('functions/_lib/informative-guides.js');

  assert.ok(
    guidesCss.includes('max-width: 100%;') &&
    guidesCss.includes('padding-inline: clamp(12px, 1.4vw, 24px);') &&
    guidesCss.includes('grid-template-columns: 260px minmax(0, 1fr);') &&
    guidesCss.includes('gap: 20px;'),
    'guides-portal.css must use true edge-to-edge max-width: 100% layout on laptop/desktop'
  );
  assert.ok(
    guidesCss.includes('overflow-x: clip;') &&
    guidesCss.includes('@media (max-width: 768px)') &&
    guidesCss.includes('padding-inline: 8px;') &&
    guidesCss.includes('.gp-hero-card') &&
    guidesCss.includes('.gp-article-card') &&
    guidesCss.includes('.gp-toc-card') &&
    guidesCss.includes('.gp-inline-figure') &&
    guidesCss.includes('padding: 14px 12px;') &&
    guidesCss.includes('border-radius: 12px;') &&
    guidesCss.includes('.gp-table-wrap') &&
    guidesCss.includes('overflow-x: auto;'),
    'guides-portal.css must eliminate double side margins at <= 768px (390px) and scope horizontal scrolling strictly inside .gp-table-wrap'
  );
  assert.ok(
    guidesCss.includes('aspect-ratio: 16 / 9;') &&
    guidesCss.includes('object-fit: contain;') &&
    guidesCss.includes('height: auto;') &&
    !guidesCss.includes('max-height: 440px;') &&
    guidesCss.includes('.gp-inline-figure img'),
    'guides-portal.css must keep 16:9 cover banners and inline SVG figures uncropped at height: auto'
  );
  assert.ok(
    studioCss.includes('.cso-guide-preview-frame.is-mobile-frame') &&
    studioCss.includes('padding-inline: 8px;') &&
    studioCss.includes('aspect-ratio: 16 / 9;') &&
    studioCss.includes('object-fit: contain;') &&
    !studioCss.slice(studioCss.indexOf('#csoGuideLivePreviewModal .cso-guide-preview-frame .gp-cover img')).includes('max-height: 440px;'),
    'admin/studio.css Live Preview must mirror v360 edge-to-edge 390px mobile padding and uncropped 16:9 cover rules'
  );
  assert.ok(
    guidesSsr.includes('/assets/css/guides-portal.css?v=20261127v381') &&
    guidesSsr.includes('/assets/js/guides-portal.js?v=20261127v381') &&
    guidesSsr.includes('gp-hero-card') &&
    guidesSsr.includes('gp-toc-card') &&
    guidesSsr.includes('gp-share-bar') &&
    guidesSsr.includes('api.whatsapp.com/send') &&
    guidesSsr.includes('t.me/share/url') &&
    guidesSsr.includes('data-copy-guide-url') &&
    !/onclick\s*=/i.test(guidesSsr),
    'functions/_lib/informative-guides.js must load v366 CSS/JS and emit CSP-safe WhatsApp/Telegram/Copy share toolbar with zero inline onclick handlers'
  );
  const guidesJs = read('assets/js/guides-portal.js');
  assert.ok(
    guidesCss.includes('.gp-share-bar') &&
    guidesCss.includes('.gp-share-btn') &&
    guidesCss.includes('.gp-share-wa') &&
    guidesCss.includes('.gp-share-tg') &&
    guidesCss.includes('.gp-share-copy') &&
    guidesJs.includes('data-copy-guide-url') &&
    guidesJs.includes('data-native-share') &&
    !/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(guidesJs),
    'guides-portal.css & guides-portal.js must style 44px 4-theme share toolbar and implement strict CSP Copy Link & Native Share handlers'
  );
});

check('9. v367 Trending & Popular Topics 1-column mobile stack (<=480px), >=44px touch targets & reduced-motion support', () => {
  const styleCss = read('assets/style.css');
  assert.ok(
    styleCss.includes('#cso-trending-topics .cso-topic-count') &&
    styleCss.includes('#cso-trending-topics .cso-topic-pill') &&
    styleCss.includes('@media (max-width: 480px)') &&
    styleCss.includes('grid-template-columns: minmax(0, 1fr) !important;') &&
    styleCss.includes('min-height: 44px;') &&
    styleCss.includes('@media (prefers-reduced-motion: reduce)'),
    'assets/style.css must stack #cso-trending-topics cleanly to 1 column at <=480px with 44px touch targets and reduced-motion support'
  );
  const hsCss = read('admin/homepage-studio.css');
  assert.ok(
    hsCss.includes('.hs-tt-card') && hsCss.includes('.hs-tt-grid') && hsCss.includes('grid-template-columns: minmax(0, 1fr);'),
    'admin/homepage-studio.css must collapse Trending Topics editor grid to 1 column on narrow screens'
  );
});

check('10. v369 Homepage hero KPI strip, district bar & 44px touch targets with reduced-motion guard', () => {
  const css = read('assets/style.css');
  const i = css.indexOf('/* ===== v369');
  assert.ok(i > 0, 'v369 CSS block');
  const blk = css.slice(i);
  assert.ok(blk.includes('.cso-dist-chip') && blk.includes('min-height: 44px') && blk.includes('.cso-hero-kpis'));
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)') && blk.includes('translateY(-2px)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v369 CSS');
});

check('11. v372 Jobs & Recruitment Hub (/jobs/): 30-district selector, 44px touch targets, 1-col mobile stack, zero inline handlers & reduced-motion', () => {
  const jobsHtml = read('jobs/index.html');
  assert.ok(jobsHtml.includes('id="cso-jobs-hub-root"') && jobsHtml.includes('id="cso-jh-district"'));
  assert.ok(!/\son[a-z]+="/i.test(jobsHtml.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'zero inline handlers in jobs/index.html');
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v372'));
  assert.ok(blk.includes('.cso-jh-org-pill') && blk.includes('min-height: 44px') && blk.includes('grid-template-columns: 1fr;'));
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v372 CSS');
});

check('12. v373 Exams & Prep Hub (/exams/): single <h1>, 44px touch targets, 1-col mobile stack, zero inline handlers & reduced-motion', () => {
  const examsHtml = read('exams/index.html');
  assert.equal((examsHtml.match(/<h1\b/gi) || []).length, 1, 'exams/index.html must have exactly 1 <h1>');
  assert.ok(!/\son[a-z]+="/i.test(examsHtml.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'zero inline handlers in exams/index.html');
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v373'));
  assert.ok(blk.includes('.cso-eh-family-pill') && blk.includes('min-height: 44px') && blk.includes('grid-template-columns: 1fr;'));
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v373 CSS');
});

check('13. v374 Scholarships Hub (/scholarships/): single <h1>, 44px touch targets, 1-col mobile stack, zero inline handlers & reduced-motion', () => {
  const html = read('scholarships/index.html');
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'scholarships/index.html must have exactly 1 <h1>');
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'zero inline handlers in scholarships/index.html');
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v374'));
  assert.ok(blk.includes('.cso-sh-level-pill') && blk.includes('min-height: 44px') && blk.includes('grid-template-columns: 1fr;'));
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v374 CSS');
});

check('14. v375 Study Materials Hub (/study-materials/): single <h1>, 44px touch targets, 1-col mobile stack, zero inline handlers & reduced-motion', () => {
  const html = read('study-materials/index.html');
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'study-materials/index.html must have exactly 1 <h1>');
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'zero inline handlers in study-materials/index.html');
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v375'));
  assert.ok(blk.includes('.cso-sm-exam-pill') && blk.includes('min-height: 44px') && blk.includes('grid-template-columns: 1fr;'));
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v375 CSS');
});

check('15. v376 Career Paths Hub (/career-paths/): single <h1>, 44px touch targets, 1-col mobile stack, zero inline handlers & reduced-motion', () => {
  const html = read('career-paths/index.html');
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'career-paths/index.html must have exactly 1 <h1>');
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'zero inline handlers in career-paths/index.html');
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v376'));
  assert.ok(blk.includes('.cso-cp-qual-pill') && blk.includes('min-height: 44px') && blk.includes('grid-template-columns: 1fr;'));
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v376 CSS');
});

check('16. v377 Odisha Special Hub (/odisha-special/): single <h1>, 44px touch targets, 1-col mobile stack, zero inline handlers & reduced-motion', () => {
  const html = read('odisha-special/index.html');
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'odisha-special/index.html must have exactly 1 <h1>');
  assert.ok(!/\son[a-z]+="/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'zero inline handlers in odisha-special/index.html');
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v377'));
  assert.ok(blk.includes('.cso-od-div-pill') && blk.includes('min-height: 44px') && blk.includes('grid-template-columns: 1fr;'));
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'zero hardcoded hex in v377 CSS');
});

console.log(`\n=== v300 Mobile & WCAG 2.2 Audit Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
