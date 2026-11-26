#!/usr/bin/env node
/**
 * v295 Full-Website 4-Theme Accuracy, WCAG 2.1 Contrast & Leak Audit
 *
 * Verifies:
 *  1. Exact 4-Theme Token Contract in assets/style.css, assets/css/portal-shell.css,
 *     and assets/css/cso-themes.css across System Light, Dark Night (+ OS dark),
 *     Reading Mode, and Odisha & Bharat.
 *  2. Exact WCAG 2.1 contrast ratios for EVERY text/surface pair across all 4 themes:
 *     - Primary ink (--cso-ink) on --cso-bg / --cso-surface / --cso-surface-elevated >= 7.0:1
 *     - Soft ink (--cso-ink-soft), muted ink (--cso-ink-muted), link (--cso-link),
 *       accent button (--cso-accent-ink on --cso-accent), status badges, and footer >= 4.5:1
 *     - Input ink (--cso-input-ink on --cso-input-bg) >= 7.0:1
 *  3. Zero unguarded hardcoded hex light/dark collisions across ALL CSS files in
 *     assets/ and admin/ plus functions/_lib/ssr-shell.js.
 *  4. 100% solid opaque elevated surfaces (opacity: 1; backdrop-filter: none;).
 *  5. 100% strict CSP compliance + ?v=20261125v295 cache busting + cso-candidate-cache-v295.
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

const EXPECTED_THEMES = {
  system: {
    '--cso-bg': '#f8fafc',
    '--cso-surface': '#ffffff',
    '--cso-surface-elevated': '#ffffff',
    '--cso-ink': '#0f172a',
    '--cso-ink-soft': '#334155',
    '--cso-ink-muted': '#475569',
    '--cso-accent': '#0f766e',
    '--cso-accent-ink': '#ffffff',
    '--cso-link': '#0f766e',
    '--cso-border': '#cbd5e1',
    '--cso-input-bg': '#ffffff',
    '--cso-input-ink': '#0f172a',
    '--cso-ok-bg': '#dcfce7',
    '--cso-ok-fg': '#14532d',
    '--cso-warn-bg': '#fef3c7',
    '--cso-warn-fg': '#78350f',
    '--cso-err-bg': '#fee2e2',
    '--cso-err-fg': '#991b1b',
    '--cso-info-bg': '#e0f2fe',
    '--cso-info-fg': '#0c4a6e',
    '--cso-footer-bg': '#0f172a',
    '--cso-footer-ink': '#e2e8f0',
    '--cso-footer-title-ink': '#ffffff'
  },
  dark: {
    '--cso-bg': '#0b0f17',
    '--cso-surface': '#121824',
    '--cso-surface-elevated': '#161e2e',
    '--cso-ink': '#f1f5f9',
    '--cso-ink-soft': '#cbd5e1',
    '--cso-ink-muted': '#94a3b8',
    '--cso-accent': '#14b8a6',
    '--cso-accent-ink': '#04201d',
    '--cso-link': '#2dd4bf',
    '--cso-border': '#263245',
    '--cso-input-bg': '#0f1520',
    '--cso-input-ink': '#f1f5f9',
    '--cso-ok-bg': '#0f2922',
    '--cso-ok-fg': '#6ee7b7',
    '--cso-warn-bg': '#2c2110',
    '--cso-warn-fg': '#fcd34d',
    '--cso-err-bg': '#31151b',
    '--cso-err-fg': '#fca5a5',
    '--cso-info-bg': '#112538',
    '--cso-info-fg': '#7dd3fc',
    '--cso-footer-bg': '#070a10',
    '--cso-footer-ink': '#cbd5e1',
    '--cso-footer-title-ink': '#f1f5f9'
  },
  reading: {
    '--cso-bg': '#f4ede1',
    '--cso-surface': '#faf5eb',
    '--cso-surface-elevated': '#fdf9f1',
    '--cso-ink': '#241b12',
    '--cso-ink-soft': '#4a3b2c',
    '--cso-ink-muted': '#63503d',
    '--cso-accent': '#854d0e',
    '--cso-accent-ink': '#ffffff',
    '--cso-link': '#78350f',
    '--cso-border': '#d6c8b2',
    '--cso-input-bg': '#fffdf8',
    '--cso-input-ink': '#241b12',
    '--cso-ok-bg': '#e7eedd',
    '--cso-ok-fg': '#2b4a1e',
    '--cso-warn-bg': '#f5e6c8',
    '--cso-warn-fg': '#6b3b09',
    '--cso-err-bg': '#f6dfdb',
    '--cso-err-fg': '#8c2318',
    '--cso-info-bg': '#ebe3d5',
    '--cso-info-fg': '#4a3520',
    '--cso-footer-bg': '#2a1d12',
    '--cso-footer-ink': '#f0e6d8',
    '--cso-footer-title-ink': '#fdf9f1'
  },
  odisha: {
    '--cso-bg': '#fdf7f0',
    '--cso-surface': '#ffffff',
    '--cso-surface-elevated': '#fffdf9',
    '--cso-ink': '#1f140c',
    '--cso-ink-soft': '#4a3423',
    '--cso-ink-muted': '#694c35',
    '--cso-accent': '#c2410c',
    '--cso-accent-ink': '#ffffff',
    '--cso-link': '#b45309',
    '--cso-border': '#e4d1bc',
    '--cso-input-bg': '#ffffff',
    '--cso-input-ink': '#1f140c',
    '--cso-ok-bg': '#dcfce7',
    '--cso-ok-fg': '#14532d',
    '--cso-warn-bg': '#ffedd5',
    '--cso-warn-fg': '#9a3412',
    '--cso-err-bg': '#fee2e2',
    '--cso-err-fg': '#991b1b',
    '--cso-info-bg': '#fef3c7',
    '--cso-info-fg': '#78350f',
    '--cso-footer-bg': '#2c150c',
    '--cso-footer-ink': '#f7e6d6',
    '--cso-footer-title-ink': '#fffdf9'
  }
};

function walkFiles(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

console.log('\n=== v295 Full-Website 4-Theme WCAG 2.1 Contrast & Leak Audit ===\n');

check('1. Exact 4-theme token contract defined across style.css, portal-shell.css & cso-themes.css', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css', 'assets/css/cso-themes.css']) {
    const css = read(rel);
    assert.ok(css.includes('@media (prefers-color-scheme: dark)'), `${rel} missing @media (prefers-color-scheme: dark)`);
    assert.ok(css.includes('[data-theme="dark"]'), `${rel} missing [data-theme="dark"]`);
    assert.ok(css.includes('[data-theme="reading"]'), `${rel} missing [data-theme="reading"]`);
    assert.ok(css.includes('[data-theme="odisha"]'), `${rel} missing [data-theme="odisha"]`);
    for (const [themeName, tokens] of Object.entries(EXPECTED_THEMES)) {
      for (const [tok, val] of Object.entries(tokens)) {
        assert.ok(css.toLowerCase().includes(`${tok}: ${val.toLowerCase()};`), `${rel} missing ${themeName} token ${tok}: ${val};`);
      }
    }
  }
});

check('2. WCAG 2.1 contrast ratios: primary ink >= 7.0:1 and all text/link/button/status/footer pairs >= 4.5:1 across all 4 themes', () => {
  for (const [themeName, t] of Object.entries(EXPECTED_THEMES)) {
    const primaryChecks = [
      ['ink/bg', t['--cso-ink'], t['--cso-bg'], 7.0],
      ['ink/surface', t['--cso-ink'], t['--cso-surface'], 7.0],
      ['ink/elevated', t['--cso-ink'], t['--cso-surface-elevated'], 7.0],
      ['input-ink/input-bg', t['--cso-input-ink'], t['--cso-input-bg'], 7.0]
    ];
    for (const [label, fg, bg, min] of primaryChecks) {
      const r = contrastRatio(fg, bg);
      assert.ok(r >= min, `${themeName} ${label} (${fg} on ${bg}) contrast ${r.toFixed(2)}:1 < ${min}:1`);
    }

    const aaChecks = [
      ['ink-soft/bg', t['--cso-ink-soft'], t['--cso-bg']],
      ['ink-soft/surface', t['--cso-ink-soft'], t['--cso-surface']],
      ['ink-muted/bg', t['--cso-ink-muted'], t['--cso-bg']],
      ['ink-muted/surface', t['--cso-ink-muted'], t['--cso-surface']],
      ['ink-muted/elevated', t['--cso-ink-muted'], t['--cso-surface-elevated']],
      ['accent-ink/accent', t['--cso-accent-ink'], t['--cso-accent']],
      ['link/bg', t['--cso-link'], t['--cso-bg']],
      ['link/surface', t['--cso-link'], t['--cso-surface']],
      ['ok-fg/ok-bg', t['--cso-ok-fg'], t['--cso-ok-bg']],
      ['warn-fg/warn-bg', t['--cso-warn-fg'], t['--cso-warn-bg']],
      ['err-fg/err-bg', t['--cso-err-fg'], t['--cso-err-bg']],
      ['info-fg/info-bg', t['--cso-info-fg'], t['--cso-info-bg']],
      ['footer-ink/footer-bg', t['--cso-footer-ink'], t['--cso-footer-bg']],
      ['footer-title/footer-bg', t['--cso-footer-title-ink'], t['--cso-footer-bg']]
    ];
    for (const [label, fg, bg] of aaChecks) {
      const r = contrastRatio(fg, bg);
      assert.ok(r >= 4.5, `${themeName} ${label} (${fg} on ${bg}) contrast ${r.toFixed(2)}:1 < 4.5:1`);
    }
  }
});

check('3. Zero unguarded hardcoded hex light/dark collisions across ALL CSS files (assets/ + admin/) & SSR shell', () => {
  const isThemedSel = (s) => /data-theme|data-cso-theme|data-cso-resolved-mode|prefers-color-scheme|\.dark-theme|\.theme-dark|html\.dark|body\.dark|\.hc\b|\.cso-theme-swatch|:root\b|\.cso-btn-admin-studio|\.cso-btn-candidate-hub|\.btn-dashboard|\.btn-header-logout|\.cso-logout-button|\.cso-auth-logout-btn|#cso-header-logout-btn|\.cso-login-link|\.login-btn|\.btn-login|\.header-login-btn|\.cso-login-button|\.cso-signup-pill|\.signup-btn|\.cso-adm-icon-only|\.adm\b|\.cso-auth-trigger|\.cso-auth-item--(?:admin|hub|login|signup|logout|saved)|\.cso-auth-item-link/.test(s);
  const cssFiles = [...walkFiles(path.join(ROOT, 'assets'), '.css'), ...walkFiles(path.join(ROOT, 'admin'), '.css')];
  const violations = [];

  for (const full of cssFiles) {
    const rel = path.relative(ROOT, full);
    if (rel === 'assets/css/cso-themes.css') continue;
    const src = fs.readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const stack = [];
    let buf = '', inPrint = false, pDepth = 0, depth = 0;

    function scanDecl(decl, sel) {
      const m = decl.match(/^\s*(background|background-color|color|border(?:-(?:top|bottom|left|right))?(?:-color)?)\s*:\s*([\s\S]+)$/i);
      if (!m) return;
      const val = m[2].replace(/var\([^)]+\)/g, 'VAR');
      if (/gradient\(/i.test(val)) return;
      const hxs = (val.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => h.length !== 5 && h.length !== 9);
      if (hxs.length) {
        violations.push(`${rel} :: ${sel.slice(0, 48)} => ${m[1]}: ${m[2].trim().slice(0, 60)}`);
      }
    }

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') {
        const sel = buf.trim(); buf = ''; depth++;
        if (/^@media\s+print\b/i.test(sel)) { inPrint = true; pDepth = depth; }
        stack.push(sel);
      } else if (ch === '}') {
        const sel = stack.join(' ');
        if (!inPrint && !isThemedSel(sel)) scanDecl(buf, sel);
        buf = '';
        if (inPrint && depth === pDepth) inPrint = false;
        stack.pop();
        depth = Math.max(0, depth - 1);
      } else if (ch === ';' && stack.length && !stack[stack.length - 1].startsWith('@')) {
        const sel = stack.join(' ');
        if (!inPrint && !isThemedSel(sel)) scanDecl(buf, sel);
        buf = '';
      } else {
        buf += ch;
      }
    }
  }
  assert.equal(violations.length, 0, `Found ${violations.length} unguarded hex color leaks:\n  ${violations.slice(0, 10).join('\n  ')}`);

  const ssr = read('functions/_lib/ssr-shell.js');
  assert.match(ssr, /\/assets\/style\.css\?v=20261125v(?:29[5-9]|3\d\d)/, 'ssr-shell.js must link versioned style.css');
  assert.match(ssr, /\/assets\/css\/portal-shell\.css\?v=20261125v(?:29[5-9]|3\d\d)/, 'ssr-shell.js must link versioned portal-shell.css');
  assert.match(ssr, /\/assets\/shared-header\.js\?v=20261125v(?:29[5-9]|3\d\d)/, 'ssr-shell.js must link versioned shared-header.js');
});

check('4. Elevated overlays enforce opacity: 1 & backdrop-filter: none; JS syncs data-theme + data-cso-theme', () => {
  const styleCss = read('assets/style.css');
  assert.ok(styleCss.includes('opacity: 1;') && styleCss.includes('backdrop-filter: none;'), 'assets/style.css must enforce opaque overlays');
  assert.ok(styleCss.includes('background-color: var(--cso-input-bg);') && styleCss.includes('color: var(--cso-input-ink);'), 'assets/style.css must theme form inputs');
  assert.ok(styleCss.includes('background-color: var(--cso-footer-bg);'), 'assets/style.css must theme site footer');

  assert.ok(read('assets/shared-header.js').includes("setAttribute('data-theme', mapToDataThemeAttr(key))"), 'shared-header.js must sync data-theme');
  assert.ok(read('assets/app.js').includes("setAttribute('data-theme',csoDataThemeAttr(k))"), 'app.js must sync data-theme');
  assert.ok(read('admin/admin.js').includes("setAttribute('data-theme', dataTheme)"), 'admin/admin.js must sync data-theme');
});

check('5. Strict CSP compliance & cache busting across all active HTML pages, sw.js & ops-sentinel.js', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v(?:29[5-9]|3\d\d)';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v(?:29[5-9]|3\d\d)';/);

  for (const rel of ['assets/shared-header.js', 'assets/app.js', 'admin/admin.js', 'assets/js/community-portal.js', 'assets/js/careers-portal.js']) {
    const codeOnly = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const bad of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', '.style.']) {
      assert.ok(!codeOnly.includes(bad), `${rel} violates strict CSP (${bad})`);
    }
  }

  const htmlFiles = walkFiles(ROOT, '.html');
  assert.ok(htmlFiles.length >= 25, `Expected >=25 active HTML files, got ${htmlFiles.length}`);
  const coreAssetRe = /\/(?:assets\/(?:style\.css|app\.js|shared-header\.js|css\/(?:portal-shell|cso-themes|jobs-portal|careers-portal|schemes-portal|study-portal|community-portal|about-portal)\.css|js\/(?:jobs-portal|careers-portal|schemes-portal|study-portal|community-portal|about-portal)\.js)|admin\/(?:admin\.js|studio\.css|admin\.css|[a-z-]+-studio\.(?:css|js)))\?v=([^"'>\s]+)/g;
  let checked = 0;
  for (const full of htmlFiles) {
    const rel = path.relative(ROOT, full);
    const html = fs.readFileSync(full, 'utf8');
    let m;
    while ((m = coreAssetRe.exec(html)) !== null) {
      checked++;
      assert.match(m[1], /^2026112[56]v(?:29[5-9]|3\d\d)$/, `${rel} has stale query version ?v=${m[1]} (expected 20261125v295+)`);
    }
  }
  assert.ok(checked >= 60, `Expected >=60 versioned core/portal/admin assets across HTML pages, got ${checked}`);
});

check('6. v298 Dark Night mode-only top utility bar (#f1f5f9 / #cbd5e1) & inactive hero lang toggle (#e2e8f0) legibility', () => {
  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css', 'assets/css/cso-themes.css']) {
    const css = read(rel);
    assert.ok(css.includes(':root[data-theme="dark"] #header-top .pill') && css.includes('color: #f1f5f9 !important;'), `${rel} missing Dark Night top utility bar #f1f5f9 rule`);
    assert.ok(css.includes(':root[data-theme="dark"] #header-top kbd') && css.includes('color: #cbd5e1 !important;'), `${rel} missing Dark Night top utility bar <kbd> #cbd5e1 rule`);
  }
  const portalLangChecks = [
    ['assets/css/community-portal.css', '.cp-lang-btn:not(.is-active)'],
    ['assets/css/study-portal.css', '.sp-lang-btn:not(.is-active)'],
    ['assets/css/about-portal.css', '.ap-lang-btn:not(.is-active)'],
    ['assets/css/schemes-portal.css', '.sp-hero .sp-lang-btn:not(.is-active)'],
    ['assets/css/jobs-portal.css', '.jp-hero .jp-lang-btn:not(.is-active)'],
    ['assets/css/careers-portal.css', '.crp-lang-btn:not(.is-active)']
  ];
  for (const [rel, sel] of portalLangChecks) {
    const css = read(rel);
    assert.ok(css.includes(`:root[data-theme="dark"] ${sel}`) && css.includes('color: #e2e8f0;') && css.includes('opacity: 1;'), `${rel} missing Dark Night inactive lang toggle rule for ${sel}`);
  }
  assert.ok(contrastRatio('#f1f5f9', '#070a10') >= 14, 'Dark top bar label contrast must be >= 14:1');
  assert.ok(contrastRatio('#cbd5e1', '#070a10') >= 10, 'Dark top bar kbd contrast must be >= 10:1');
  assert.ok(contrastRatio('#e2e8f0', '#0c1724') >= 12, 'Dark hero inactive lang button contrast must be >= 12:1');
});

check('7. v299 Institutional top-bar auth & admin button hierarchy & >= 4.5:1 WCAG AA contrast across all 4 themes', () => {
  const sh = read('assets/shared-header.js');
  const app = read('assets/app.js');
  for (const [rel, src] of [['assets/shared-header.js', sh], ['assets/app.js', app]]) {
    for (const cls of ['cso-btn-admin-studio', 'cso-btn-candidate-hub', 'btn-header-logout', 'cso-auth-item--admin', 'cso-auth-item--hub', 'cso-auth-item--login', 'cso-auth-item--signup', 'cso-auth-item--logout']) {
      assert.ok(src.includes(cls), `${rel} missing semantic auth/admin class ${cls}`);
    }
  }

  for (const rel of ['assets/style.css', 'assets/css/portal-shell.css', 'assets/css/cso-themes.css']) {
    const css = read(rel);
    assert.ok(css.includes('#header-top .cso-btn-admin-studio') && css.includes('background: #991b1b !important;'), `${rel} missing Admin Studio #991b1b rule`);
    assert.ok(css.includes('#header-top .adm.cso-adm-icon-only') && css.includes('background: #450a0a !important;') && css.includes('color: #fca5a5 !important;'), `${rel} missing Admin Shield #450a0a/#fca5a5 rule`);
    assert.ok(css.includes('#header-top .cso-login-link') && css.includes('border: 1px solid #64748b !important;') && css.includes('color: #f1f5f9 !important;'), `${rel} missing Login ghost button rule`);
    assert.ok(css.includes('#header-top .btn-header-logout') && css.includes('border: 1px solid #475569 !important;') && css.includes('color: #e2e8f0 !important;'), `${rel} missing Logout high-contrast ghost rule`);
    assert.ok(css.includes('border-color: #f97316 !important;') && css.includes('color: #fdba74 !important;'), `${rel} missing Logout hover amber accent rule`);
    assert.ok(css.includes('#header-top .cso-btn-candidate-hub') && css.includes('background: var(--cso-accent) !important;') && css.includes('color: var(--cso-accent-ink) !important;'), `${rel} missing Sign Up / Candidate Hub accent rule`);
  }

  // Verify >= 4.5:1 WCAG AA contrast for all 6 controls across all 4 top-bar backgrounds
  const TOP_BAR_BGS = {
    system: '#0f172a',
    dark: '#070a10',
    reading: '#2e1f12',
    odisha: '#3b190d'
  };
  for (const [themeName, barBg] of Object.entries(TOP_BAR_BGS)) {
    const t = EXPECTED_THEMES[themeName];
    assert.ok(contrastRatio(t['--cso-accent-ink'], t['--cso-accent']) >= 4.5, `${themeName} Sign Up / Candidate Hub contrast < 4.5:1`);
    assert.ok(contrastRatio('#f1f5f9', barBg) >= 4.5, `${themeName} Login ghost label on top bar (${barBg}) contrast < 4.5:1`);
    assert.ok(contrastRatio('#e2e8f0', barBg) >= 4.5, `${themeName} Logout ghost label on top bar (${barBg}) contrast < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-ink'], t['--cso-surface-elevated']) >= 4.5, `${themeName} mobile dropdown Login item contrast < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-err-fg'], t['--cso-surface-elevated']) >= 4.5, `${themeName} mobile dropdown Logout item contrast < 4.5:1`);
  }
  assert.ok(contrastRatio('#ffffff', '#1e293b') >= 4.5, 'Login hover contrast < 4.5:1');
  assert.ok(contrastRatio('#ffffff', '#991b1b') >= 4.5, 'Admin Studio normal contrast < 4.5:1');
  assert.ok(contrastRatio('#ffffff', '#b91c1c') >= 4.5, 'Admin Studio hover contrast < 4.5:1');
  assert.ok(contrastRatio('#fca5a5', '#450a0a') >= 4.5, 'Admin Shield icon normal contrast < 4.5:1');
  assert.ok(contrastRatio('#ffffff', '#7f1d1d') >= 4.5, 'Admin Shield icon hover contrast < 4.5:1');
  assert.ok(contrastRatio('#fdba74', '#2b2728') >= 4.5, 'Logout hover contrast < 4.5:1');
});

check('8. v303 Candidate Hub sidebar nav container, items & mobile drawer bind to semantic 4-theme tokens (>= 12:1 AAA ink, zero dark-teal nav leak)', () => {
  const styleCss = read('assets/style.css');
  // Bare `nav { background: linear-gradient(...) }` must never leak a dark teal fill onto #bp-sidebar-nav
  assert.ok(
    !/^nav\s*\{[^}]*linear-gradient/m.test(styleCss.replace(/\/\*[\s\S]*?\*\//g, '')),
    'assets/style.css must NOT apply bare nav { background: linear-gradient(...) } (leaks dark teal onto #bp-sidebar-nav)'
  );

  for (const rel of [
    'assets/css/candidate-hub-v244.css',
    'assets/css/student-dashboard-bp.css',
    'assets/style.css',
    'assets/css/cso-themes.css'
  ]) {
    const css = read(rel);
    assert.ok(
      css.includes('#bp-sidebar-nav') &&
      /background:\s*var\(--cso-surface\)/.test(css) &&
      /border:\s*1px solid var\(--cso-border\)/.test(css) &&
      /background:\s*transparent/.test(css) &&
      /color:\s*var\(--cso-ink\)/.test(css) &&
      /background:\s*var\(--cso-surface-alt\)/.test(css) &&
      /background:\s*var\(--cso-accent\)/.test(css) &&
      /color:\s*var\(--cso-accent-ink\)/.test(css) &&
      /font-weight:\s*600/.test(css),
      `${rel} missing v303 Candidate Hub sidebar semantic container/item/hover/active bindings`
    );
    assert.ok(
      css.includes('.bp-sidebar.mobile-open') &&
      /background:\s*var\(--cso-surface-elevated\)/.test(css) &&
      /opacity:\s*1/.test(css) &&
      /backdrop-filter:\s*none/.test(css),
      `${rel} missing v303 Candidate Hub < 1100px mobile drawer elevated opaque surface rules`
    );
  }

  // Verify no circular `--cso-ink: var(--cso-text);` in student-dashboard-bp.css
  assert.ok(!read('assets/css/student-dashboard-bp.css').includes('--cso-ink: var(--cso-text);'), 'student-dashboard-bp.css must not declare circular --cso-ink: var(--cso-text)');

  // Verify >= 12:1 AAA contrast on --cso-surface / --cso-surface-elevated / --cso-surface-alt and >= 4.5:1 active pill across all 4 themes
  const HUB_THEMES = {
    system:  { surface: '#ffffff', elevated: '#ffffff', alt: '#f1f5f9', ink: '#0f172a', accent: '#0f766e', accentInk: '#ffffff' },
    dark:    { surface: '#121824', elevated: '#161e2e', alt: '#1a2335', ink: '#f1f5f9', accent: '#14b8a6', accentInk: '#04201d' },
    reading: { surface: '#faf5eb', elevated: '#fdf9f1', alt: '#ede3d2', ink: '#241b12', accent: '#854d0e', accentInk: '#ffffff' },
    odisha:  { surface: '#ffffff', elevated: '#fffdf9', alt: '#f7ece0', ink: '#1f140c', accent: '#c2410c', accentInk: '#ffffff' }
  };
  for (const [name, t] of Object.entries(HUB_THEMES)) {
    assert.ok(contrastRatio(t.ink, t.surface) >= 12.0, `${name} Candidate Hub sidebar ink on --cso-surface < 12:1`);
    assert.ok(contrastRatio(t.ink, t.elevated) >= 12.0, `${name} Candidate Hub mobile drawer ink on --cso-surface-elevated < 12:1`);
    assert.ok(contrastRatio(t.ink, t.alt) >= 12.0, `${name} Candidate Hub sidebar hover ink on --cso-surface-alt < 12:1`);
    assert.ok(contrastRatio(t.accentInk, t.accent) >= 4.5, `${name} Candidate Hub active nav pill contrast < 4.5:1`);
  }

  // Verify student-dashboard/index.html loads v303+ assets
  const hubHtml = read('student-dashboard/index.html');
  assert.match(hubHtml, /student-dashboard-bp\.css\?v=20261125v3(?:0[3-9]|[1-9]\d)/);
  assert.match(hubHtml, /candidate-hub-v244\.css\?v=20261125v3(?:0[3-9]|[1-9]\d)/);
  assert.match(hubHtml, /student-dashboard\.js\?v=2026112[56]v3(?:0[3-9]|[1-9]\d)/);
});

check('9. v349/v360 Informative Guides edge-to-edge uncropped 16:9 cover containment & high-contrast WCAG AAA tbody td across all 4 themes', () => {
  const guidesCss = read('assets/css/guides-portal.css');
  assert.ok(
    guidesCss.includes('.gp-shell') &&
    guidesCss.includes('.gp-detail-shell') &&
    guidesCss.includes('max-width: 100%;') &&
    guidesCss.includes('.gp-cover,') &&
    guidesCss.includes('.gp-cover-frame') &&
    guidesCss.includes('.gp-hero-media') &&
    guidesCss.includes('overflow: hidden;') &&
    guidesCss.includes('height: auto;') &&
    guidesCss.includes('aspect-ratio: 16 / 9;') &&
    guidesCss.includes('object-fit: contain;') &&
    !guidesCss.includes('max-height: 440px;'),
    'assets/css/guides-portal.css must enforce edge-to-edge max-width: 100% and uncropped 16:9 height: auto + object-fit: contain covers'
  );
  assert.ok(
    guidesCss.includes('.gp-takeaways') &&
    guidesCss.includes('position: relative;') &&
    guidesCss.includes('z-index: 1;') &&
    guidesCss.includes('clear: both;'),
    'assets/css/guides-portal.css must isolate .gp-takeaways below cover image'
  );
  assert.ok(
    guidesCss.includes('.gp-table-wrap') &&
    guidesCss.includes('overflow-x: auto;') &&
    guidesCss.includes('.gp-body table tbody td') &&
    guidesCss.includes('.gp-article table tbody td') &&
    guidesCss.includes('background: var(--gp-surface, var(--cso-surface)) !important;') &&
    guidesCss.includes('color: var(--gp-ink, var(--cso-ink)) !important;') &&
    guidesCss.includes('opacity: 1 !important;') &&
    guidesCss.includes('tbody tr:nth-child(even) td') &&
    guidesCss.includes('background: var(--gp-surface-alt, var(--cso-surface-alt)) !important;'),
    'assets/css/guides-portal.css must enforce high-contrast tbody td & zebra row contrast across all 4 themes'
  );
  assert.ok(
    guidesCss.includes('.gp-breadcrumb') && guidesCss.includes('gap: 6px;'),
    'assets/css/guides-portal.css must style .gp-breadcrumb with gap: 6px'
  );

  const studioCss = read('admin/studio.css');
  for (const th of ['system', 'dark', 'reading', 'odisha']) {
    assert.ok(
      studioCss.includes(`.cso-guide-preview-frame[data-theme="${th}"]`),
      `admin/studio.css missing 4-theme preview token block for ${th}`
    );
  }
  assert.ok(
    studioCss.includes('--gp-ink:') &&
    studioCss.includes('--gp-surface:') &&
    studioCss.includes('--gp-surface-alt:') &&
    studioCss.includes('--cso-text:') &&
    studioCss.includes('#csoGuideLivePreviewModal .cso-guide-preview-frame table tbody td'),
    'admin/studio.css must isolate #csoGuideLivePreviewModal table tokens & tbody td contrast from Admin Studio theme leaks'
  );

  const GUIDE_TABLE_THEMES = {
    system:  { surface: '#ffffff', alt: '#f1f5f9', ink: '#0f172a' },
    dark:    { surface: '#121824', alt: '#1a2335', ink: '#f1f5f9' },
    reading: { surface: '#faf5eb', alt: '#ede3d2', ink: '#241b12' },
    odisha:  { surface: '#ffffff', alt: '#f7ece0', ink: '#1f140c' }
  };
  for (const [name, t] of Object.entries(GUIDE_TABLE_THEMES)) {
    assert.ok(contrastRatio(t.ink, t.surface) >= 12.0, `${name} guide tbody td ink/surface contrast < 12:1`);
    assert.ok(contrastRatio(t.ink, t.alt) >= 12.0, `${name} guide zebra tbody td & thead th ink/surface-alt contrast < 12:1`);
  }
});

check('10. v367 Trending & Popular Topics semantic 4-theme tokens & WCAG AA/AAA badge/pill contrast', () => {
  const styleCss = read('assets/style.css');
  const v367Block = styleCss.slice(styleCss.indexOf('v340 / v367 Trending & Popular Topics'), styleCss.indexOf('v341 Sticky Single-Row Header'));
  assert.ok(v367Block.length > 500, 'Missing v367 Trending & Popular Topics CSS block in assets/style.css');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v367Block), 'v367 Trending & Popular Topics CSS must use zero hardcoded hex colors');
  assert.ok(
    v367Block.includes('var(--cso-surface-alt)') &&
    v367Block.includes('var(--cso-ink)') &&
    v367Block.includes('var(--cso-accent)') &&
    v367Block.includes('var(--cso-accent-ink)') &&
    v367Block.includes('var(--cso-warn-bg)') &&
    v367Block.includes('var(--cso-warn-fg)') &&
    v367Block.includes('var(--cso-ok-bg)') &&
    v367Block.includes('var(--cso-ok-fg)') &&
    v367Block.includes('var(--cso-info-bg)') &&
    v367Block.includes('var(--cso-info-fg)'),
    'v367 Trending Topics pills & icon badges must bind semantic 4-theme tokens'
  );

  const hsCss = read('admin/homepage-studio.css');
  const hsV367Block = hsCss.slice(hsCss.indexOf('v367 Trending & Popular Topics'));
  assert.ok(hsV367Block.length > 200, 'Missing v367 Trending Topics Editor CSS in admin/homepage-studio.css');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(hsV367Block), 'v367 Admin Trending Topics Editor CSS must use zero hardcoded hex colors');

  for (const [name, t] of Object.entries(EXPECTED_THEMES)) {
    assert.ok(contrastRatio(t['--cso-ok-fg'], t['--cso-ok-bg']) >= 4.5, `${name} NEW pill contrast < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-warn-fg'], t['--cso-warn-bg']) >= 4.5, `${name} HOT pill contrast < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-info-fg'], t['--cso-info-bg']) >= 4.5, `${name} 2026/info pill contrast < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-accent-ink'], t['--cso-accent']) >= 4.5, `${name} accent pill contrast < 4.5:1`);
  }
});

check('v369 Homepage section badges, action pills & hero hairline use semantic --cso-* tokens only', () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v369'));
  assert.ok(blk.includes('var(--cso-accent)') && blk.includes('var(--cso-warn-fg)') && blk.includes('var(--cso-info-bg)'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'v369 CSS must contain zero hardcoded hex');
  assert.ok(blk.includes('.cso-hf-ic') && blk.includes('.cso-hf-row__act'));
});

check('v370 category-coded hover/focus: semantic tokens only, reduced-motion guard, >= 4.5:1 fill/on pairs in all 4 themes', () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v370'));
  assert.ok(blk.length > 500, 'v370 CSS block present');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'v370 CSS must contain zero hardcoded hex');
  assert.ok(blk.includes('--card-accent') && blk.includes('--card-on') && blk.includes('color-mix(in srgb'));
  for (const sel of ['.cso-topic-card:hover', '.cso-hf-section:hover', '.cso-hf-row:hover', '.cso-hf-row__act', '.cso-lu-cta', '.cso-tools-sec .card.tl:hover', '.hero .search-chip:hover', '.cso-dist-chip:hover']) assert.ok(blk.includes(sel), `missing ${sel}`);
  assert.ok(blk.includes('@media (prefers-reduced-motion: reduce)'));
  const mix = (a, b, pa) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * pa + parseInt(b.slice(i, i + 2), 16) * (1 - pa)).toString(16).padStart(2, '0')).join('');
  for (const [name, t] of Object.entries(EXPECTED_THEMES)) {
    const pairs = [
      [t['--cso-accent'], t['--cso-accent-ink']],
      [t['--cso-ok-fg'], t['--cso-ok-bg']],
      [t['--cso-info-fg'], t['--cso-info-bg']],
      [t['--cso-warn-fg'], t['--cso-warn-bg']],
      [t['--cso-err-fg'], t['--cso-err-bg']],
      [mix(t['--cso-info-fg'], t['--cso-err-fg'], 0.52), mix(t['--cso-info-bg'], t['--cso-err-bg'], 0.52)]
    ];
    for (const [fill, on] of pairs) assert.ok(contrastRatio(fill, on) >= 4.5, `${name} v370 solid pill ${fill}/${on} < 4.5:1`);
  }
});

check('v371 sharpened colored hover: ID-scoped topic cards, purple Exams, 16% wash + ring + glow, zero hex, >= 4.5:1 accent title on tinted wash in all 4 themes', () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v371'));
  assert.ok(blk.length > 500, 'v371 CSS block present');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk.replace(/#main-content|#cso-trending-topics|#cso-tools/g, '')), 'v371 CSS must contain zero hardcoded hex');
  assert.ok(blk.includes('#main-content #cso-trending-topics .cso-topic-card--exams { --card-accent: color-mix(in srgb, var(--cso-info-fg) 52%, var(--cso-err-fg) 48%)'), 'Exams purple accent');
  assert.ok(blk.includes('color-mix(in srgb, var(--card-accent) 65%, var(--cso-ink))'), 'title uses contrast-safe accent/ink mix');
  assert.ok(blk.includes('0 0 0 1px var(--card-accent), 0 10px 24px -6px color-mix(in srgb, var(--card-accent) 34%, transparent)'));
  assert.ok(blk.includes('linear-gradient(135deg, color-mix(in srgb, var(--card-accent) 16%, var(--cso-surface)), color-mix(in srgb, var(--card-accent) 8%, var(--cso-surface)))'));
  const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, pa) => '#' + hex2(a).map((v, i) => Math.round(v * pa + hex2(b)[i] * (1 - pa)).toString(16).padStart(2, '0')).join('');
  for (const [name, t] of Object.entries(EXPECTED_THEMES)) {
    const accents = [t['--cso-accent'], t['--cso-ok-fg'], t['--cso-info-fg'], t['--cso-warn-fg'], t['--cso-err-fg'], mix(t['--cso-info-fg'], t['--cso-err-fg'], 0.52)];
    for (const a of accents) {
      const wash = mix(a, t['--cso-surface'], 0.16);
      const title = mix(a, t['--cso-ink'], 0.65);
      assert.ok(contrastRatio(title, wash) >= 4.5, `${name} accent title mix ${title} on 16% wash ${wash} < 4.5:1`);
      assert.ok(contrastRatio(t['--cso-ink'], wash) >= 7, `${name} body ink on wash < 7:1`);
    }
  }
});

check('v372 Jobs & Recruitment Hub CSS: semantic --cso-* tokens only, zero hardcoded hex & >= 4.5:1 urgency/verified badges in all 4 themes', () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v372'));
  assert.ok(blk.length > 500, 'v372 CSS block present');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'v372 CSS must contain zero hardcoded hex');
  for (const cls of ['.cso-jh-hero', '.cso-jh-summary', '.cso-jh-card:hover', '.cso-jh-deadline--urgent', '.cso-jh-deadline--active', '.cso-jh-pill--gov']) {
    assert.ok(blk.includes(cls), `v372 CSS missing ${cls}`);
  }
  for (const [name, t] of Object.entries(EXPECTED_THEMES)) {
    assert.ok(contrastRatio(t['--cso-err-fg'], t['--cso-err-bg']) >= 4.5, `${name} urgent deadline badge < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-ok-fg'], t['--cso-ok-bg']) >= 4.5, `${name} verified/active badge < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-info-fg'], t['--cso-info-bg']) >= 4.5, `${name} guide badge < 4.5:1`);
  }
});

check('v373 Exams & Prep Hub CSS: semantic --cso-* tokens only, zero hardcoded hex & >= 4.5:1 countdown/MCQ feedback contrast in all 4 themes', () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v373'));
  assert.ok(blk.length > 500, 'v373 CSS block present');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'v373 CSS must contain zero hardcoded hex');
  for (const cls of ['.cso-eh-hero', '.cso-eh-track:hover', '.cso-eh-countdown--urgent', '.cso-eh-q-opt.is-correct', '.cso-eh-q-opt.is-wrong']) {
    assert.ok(blk.includes(cls), `v373 CSS missing ${cls}`);
  }
  for (const [name, t] of Object.entries(EXPECTED_THEMES)) {
    assert.ok(contrastRatio(t['--cso-ok-fg'], t['--cso-ok-bg']) >= 4.5, `${name} MCQ correct contrast < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-err-fg'], t['--cso-err-bg']) >= 4.5, `${name} MCQ wrong / urgent countdown contrast < 4.5:1`);
  }
});

check('v374 Scholarships Hub CSS: emerald green hover, semantic --cso-* tokens only, zero hardcoded hex & >= 4.5:1 badge contrast in all 4 themes', () => {
  const css = read('assets/style.css');
  const blk = css.slice(css.indexOf('/* ===== v374'));
  assert.ok(blk.length > 500, 'v374 CSS block present');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(blk), 'v374 CSS must contain zero hardcoded hex');
  for (const cls of ['.cso-sh-hero', '.cso-sh-card:hover', '.cso-sh-amount', '.cso-sh-docs', '.cso-sh-status--urgent']) {
    assert.ok(blk.includes(cls), `v374 CSS missing ${cls}`);
  }
  for (const [name, t] of Object.entries(EXPECTED_THEMES)) {
    assert.ok(contrastRatio(t['--cso-ok-fg'], t['--cso-ok-bg']) >= 4.5, `${name} scholarship emerald badge contrast < 4.5:1`);
    assert.ok(contrastRatio(t['--cso-err-fg'], t['--cso-err-bg']) >= 4.5, `${name} closing soon contrast < 4.5:1`);
  }
});

console.log(`\n=== v295 Theme Audit Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
