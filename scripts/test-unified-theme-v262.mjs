/**
 * Unified Civic & Editorial Color System Verification Suite (v262)
 *
 * Verifies:
 *  1. portal-shell.css defines all 19 canonical --cso-* semantic tokens across all 4 themes (System, Dark Night, Reading Mode, Odisha & Bharat).
 *  2. All 5 portal stylesheets (jobs-portal.css, schemes-portal.css, study-portal.css, community-portal.css, about-portal.css) consume unified --cso-* tokens.
 *  3. All 8 portal HTML pages link portal-shell.css?v=20261124v262 and *-portal.css?v=20261124v262.
 *  4. sw.js & functions/_lib/ops-sentinel.js are bumped to cso-candidate-cache-v262.
 *  5. Strict CSP compliance across all modified CSS & HTML files.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

console.log('\n=== v262 Unified Civic & Editorial Color System Verification ===');

const TOKENS = [
  '--cso-brand-deep',
  '--cso-brand-primary',
  '--cso-brand-accent',
  '--cso-brand-gold',
  '--cso-canvas-bg',
  '--cso-card-bg',
  '--cso-card-subtle',
  '--cso-ink-primary',
  '--cso-ink-secondary',
  '--cso-border-subtle',
  '--cso-hero-gradient',
  '--cso-hero-ink',
  '--cso-pill-active-bg',
  '--cso-pill-active-fg',
  '--cso-cta-bg',
  '--cso-cta-fg',
  '--cso-badge-verified-bg',
  '--cso-badge-verified-fg',
  '--cso-card-shadow'
];

check('1. portal-shell.css defines all 19 canonical --cso-* semantic tokens across all 4 themes', () => {
  const css = read('assets/css/portal-shell.css');
  for (const sel of [
    ':root[data-cso-theme="system"]',
    '[data-theme="dark"]',
    '[data-theme="reading"]',
    '[data-theme="utkal-bharat"]',
    'body.cso-portal-page'
  ]) {
    assert.ok(css.includes(sel), `portal-shell.css missing theme selector ${sel}`);
  }
  for (const tok of TOKENS) {
    const matches = css.match(new RegExp(`${tok}\\s*:`, 'g')) || [];
    assert.ok(matches.length >= 4, `${tok} must be defined across all 4 themes (found ${matches.length})`);
  }
});

check('2. All 5 portal stylesheets consume the unified --cso-* semantic tokens', () => {
  const portals = [
    'assets/css/jobs-portal.css',
    'assets/css/schemes-portal.css',
    'assets/css/study-portal.css',
    'assets/css/community-portal.css',
    'assets/css/about-portal.css'
  ];
  for (const rel of portals) {
    const css = read(rel);
    for (const tok of ['var(--cso-hero-gradient', 'var(--cso-hero-ink', 'var(--cso-cta-bg', 'var(--cso-card-shadow']) {
      assert.ok(css.includes(tok), `${rel} must consume ${tok}`);
    }
  }
});

check('3. All 8 portal HTML pages link portal-shell.css?v=20261124v262 & *-portal.css?v=20261124v262', () => {
  const pages = [
    ['jobs/index.html', 'jobs-portal.css'],
    ['jobs-careers/index.html', 'jobs-portal.css'],
    ['schemes/index.html', 'schemes-portal.css'],
    ['schemes-benefits/index.html', 'schemes-portal.css'],
    ['study-library/index.html', 'study-portal.css'],
    ['study/index.html', 'study-portal.css'],
    ['community/index.html', 'community-portal.css'],
    ['about/index.html', 'about-portal.css']
  ];
  for (const [file, cssName] of pages) {
    const html = read(file);
    assert.ok(/\/assets\/css\/portal-shell\.css\?v=2026112[45]v2(?:6[2-9]|[7-9]\d)/.test(html), `${file} missing portal-shell.css?v=20261124v262+`);
    assert.ok(new RegExp(`/assets/css/${cssName.replace('.', '\\.')}\\?v=20261124v2(?:6[2-9]|[7-9]\\d)`).test(html), `${file} missing ${cssName}?v=20261124v262+`);
  }
});

check('4. sw.js & ops-sentinel.js bumped to cso-candidate-cache-v262+', () => {
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:6[2-9]|[7-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:6[2-9]|[7-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

check('5. Strict CSP compliance across all 8 portal HTML files', () => {
  for (const file of [
    'jobs/index.html',
    'jobs-careers/index.html',
    'schemes/index.html',
    'schemes-benefits/index.html',
    'study-library/index.html',
    'study/index.html',
    'community/index.html',
    'about/index.html'
  ]) {
    const html = read(file);
    assert.ok(!/\sstyle\s*=/i.test(html), `${file} contains inline style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `${file} contains inline on*=`);
  }
});

console.log(`\n=== v262 Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
