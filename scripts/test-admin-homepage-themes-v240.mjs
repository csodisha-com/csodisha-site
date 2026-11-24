#!/usr/bin/env node
/**
 * v240 Admin Studio Homepage Theme Parity Verification
 * Ensures:
 *  1. Shared homepage theme tokens exist in assets/css/cso-themes.css with all 4 homepage themes
 *     (system, dark, reading, utkal-bharat) and swatches, and are linked in index.html & admin/*.html.
 *  2. All legacy Admin-only themes (apex, volt, cobalt, lime, cso_studio_theme) are completely removed
 *     from admin/ HTML, CSS, and JS files.
 *  3. admin/index.html, admin/login.html, admin/admin.js, and admin/cms/login.js use the exact
 *     homepage storage key ('cso_portal_theme'), attributes (data-cso-theme, data-cso-resolved-mode),
 *     and 4 theme menu options (system, dark, reading, utkal-bharat).
 *  4. Service Worker sw.js & functions/_lib/ops-sentinel.js are bumped to cso-candidate-cache-v240.
 *  5. Strict CSP compliance across all modified admin/ HTML & JS files (no innerHTML/outerHTML/
 *     insertAdjacentHTML, no .style.* mutations, no inline style="" or on*="" handlers).
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  PASS: ${label}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${label}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log('\n=== v240 Admin Studio Homepage Theme Parity Verification ===');

check('Shared assets/css/cso-themes.css defines all 4 homepage themes, resolved modes, and swatches', () => {
  const css = read('assets/css/cso-themes.css');
  for (const token of [
    ':root[data-cso-theme="system"]',
    ':root[data-cso-theme="dark"]',
    ':root[data-cso-theme="reading"]',
    ':root[data-cso-theme="utkal-bharat"]',
    ':root[data-cso-theme="system"][data-cso-resolved-mode="dark"]',
    '--cso-bg:',
    '--cso-surface:',
    '--cso-card-bg:',
    '--cso-text:',
    '--cso-primary:',
    '.cso-theme-swatch.is-system',
    '.cso-theme-swatch.is-dark',
    '.cso-theme-swatch.is-reading',
    '.cso-theme-swatch.is-utkal-bharat'
  ]) {
    assert.ok(css.includes(token), `assets/css/cso-themes.css missing ${token}`);
  }
});

check('index.html and admin pages link /assets/css/cso-themes.css', () => {
  for (const rel of ['index.html', 'admin/index.html', 'admin/login.html', 'admin/portal.html']) {
    const html = read(rel);
    assert.ok(html.includes('/assets/css/cso-themes.css'), `${rel} must link /assets/css/cso-themes.css`);
  }
});

check('Zero legacy Admin-only theme references remain in admin/ files', () => {
  const legacyPattern = /cso_studio_theme|is-apex|is-volt|is-cobalt|is-lime|Apex Carbon|Volt Noir|Cobalt Enterprise|Botanical Light|data-theme="(?:apex|volt|cobalt|lime)"/;
  const files = [
    'admin/index.html',
    'admin/login.html',
    'admin/portal.html',
    'admin/admin.js',
    'admin/cms/login.js',
    'admin/studio.css',
    'admin/cms/cms.css',
    'admin/cms/cms-embed.css',
    'admin/admin.css',
    'admin/edu-resources-batch1.css'
  ];
  for (const rel of files) {
    const content = read(rel);
    const m = content.match(legacyPattern);
    assert.equal(m, null, `Legacy admin theme reference "${m && m[0]}" found in ${rel}`);
  }
});

check('admin/index.html and admin/login.html expose exact 4 homepage theme options', () => {
  for (const rel of ['admin/index.html', 'admin/login.html']) {
    const html = read(rel);
    for (const marker of [
      'data-theme-value="system"',
      'data-theme-value="dark"',
      'data-theme-value="reading"',
      'data-theme-value="utkal-bharat"',
      'System (Auto Light/Dark)',
      'Dark Night',
      'Reading Mode',
      'Odisha &amp; Bharat',
      'cso-theme-swatch is-system',
      'cso-theme-swatch is-dark',
      'cso-theme-swatch is-reading',
      'cso-theme-swatch is-utkal-bharat'
    ]) {
      assert.ok(html.includes(marker), `${rel} missing homepage theme option marker: ${marker}`);
    }
  }
});

check('admin/admin.js and admin/cms/login.js use exact homepage theme storage key, attributes & cross-tab sync', () => {
  for (const rel of ['admin/admin.js', 'admin/cms/login.js']) {
    const js = read(rel);
    for (const token of [
      'cso_portal_theme',
      'data-cso-theme',
      'data-cso-resolved-mode',
      'utkal-bharat',
      'prefers-color-scheme: dark',
      "addEventListener('storage'"
    ]) {
      assert.ok(js.includes(token), `${rel} missing homepage theme engine token: ${token}`);
    }
  }
});

check('Admin CSS maps studio/cms variables directly to --cso-* homepage tokens', () => {
  assert.ok(read('admin/studio.css').includes('var(--cso-bg'), 'admin/studio.css must use --cso-bg');
  assert.ok(read('admin/studio.css').includes(':root[data-cso-theme]'), 'admin/studio.css must style homepage data-cso-theme');
  assert.ok(read('admin/studio.css').includes(':root[data-cso-resolved-mode="dark"]'), 'admin/studio.css must style dark resolved mode');
  assert.ok(read('admin/cms/cms.css').includes('var(--cso-bg'), 'admin/cms/cms.css must use --cso-bg');
  assert.ok(read('admin/cms/cms-embed.css').includes('var(--cso-bg'), 'admin/cms/cms-embed.css must use --cso-bg');
  assert.ok(read('admin/admin.css').includes('var(--cso-bg'), 'admin/admin.css must use --cso-bg');
});

check('Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v248', () => {
  const sw = read('sw.js');
  assert.ok(sw.includes("const CACHE_NAME = 'cso-candidate-cache-v248';"), 'sw.js must be v248');
  assert.ok(sw.includes("'/assets/css/cso-themes.css'"), 'sw.js should precache /assets/css/cso-themes.css');
  assert.ok(
    read('functions/_lib/ops-sentinel.js').includes("export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v248';"),
    'ops-sentinel.js must be v248'
  );
});

check('v241: No unguarded white/light-only text colors remain on non-button elements in admin/*.css', () => {
  const adminCssFiles = [
    'admin/studio.css',
    'admin/admin.css',
    'admin/cms/cms.css',
    'admin/cms/cms-embed.css',
    'admin/edu-resources-batch1.css'
  ];
  const allowedWhiteTextSelectors = /(\.cso-brand-mark|\.cso-btn-forest|\.cso-social-trigger:hover|\.cso-social-trigger:focus-visible|\.btn-danger|\.cso-mkt-banner-cta)/;
  for (const rel of adminCssFiles) {
    const css = read(rel);
    assert.equal(css.includes('--cso-ink-muted'), false, `${rel} must not reference undefined --cso-ink-muted`);
    const lines = css.split('\n');
    let currentSelector = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('{') && !line.trim().startsWith('/*')) {
        currentSelector = line.split('{')[0].trim();
      }
      if (/\bcolor\s*:\s*(#fff\b|#ffffff\b|#f8fafc\b|#f1f5f9\b|#e2e8f0\b|#cbd5e1\b|#94a3b8\b)/i.test(line)) {
        const context = `${currentSelector} ${line}`;
        assert.ok(
          allowedWhiteTextSelectors.test(context),
          `Unguarded light/white text color in ${rel}:${i + 1} (${currentSelector}): ${line.trim()}`
        );
      }
    }
  }
});

check('Strict CSP compliance on modified admin HTML & JS files', () => {
  for (const rel of ['admin/index.html', 'admin/login.html', 'admin/portal.html']) {
    const html = read(rel);
    assert.equal(/\sstyle\s*=\s*["']/i.test(html), false, `${rel} must not contain inline style=""`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(html), false, `${rel} must not contain inline on*="" handlers`);
  }
  for (const rel of ['admin/admin.js', 'admin/cms/login.js']) {
    const js = read(rel);
    assert.equal(/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(js), false, `${rel} must not use innerHTML/outerHTML/insertAdjacentHTML`);
    assert.equal(/\.style\.[a-zA-Z]/.test(js), false, `${rel} must not mutate .style.* directly`);
  }
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
