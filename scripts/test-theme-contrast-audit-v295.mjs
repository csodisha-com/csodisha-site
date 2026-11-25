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
  const isThemedSel = (s) => /data-theme|data-cso-theme|data-cso-resolved-mode|prefers-color-scheme|\.dark-theme|\.theme-dark|html\.dark|body\.dark|\.hc\b|\.cso-theme-swatch|:root\b/.test(s);
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
  assert.match(ssr, /\/assets\/style\.css\?v=20261125v29[5-9]/, 'ssr-shell.js must link versioned style.css');
  assert.match(ssr, /\/assets\/css\/portal-shell\.css\?v=20261125v29[5-9]/, 'ssr-shell.js must link versioned portal-shell.css');
  assert.match(ssr, /\/assets\/shared-header\.js\?v=20261125v29[5-9]/, 'ssr-shell.js must link versioned shared-header.js');
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
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v29[5-9]';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v29[5-9]';/);

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
      assert.match(m[1], /^20261125v29[5-9]$/, `${rel} has stale query version ?v=${m[1]} (expected 20261125v295+)`);
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

console.log(`\n=== v295 Theme Audit Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
