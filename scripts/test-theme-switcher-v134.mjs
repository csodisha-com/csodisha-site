import assert from 'node:assert/strict';
import fs from 'node:fs';

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const sharedHeader = fs.readFileSync('assets/shared-header.js', 'utf8');
const appJs = fs.readFileSync('assets/app.js', 'utf8');

// 1. Verify all 4 [data-cso-theme="..."] CSS blocks include scene & badge variables
const THEMES = ['alabaster-forest', 'forest-gold', 'chilika-teal', 'konark-sandstone'];
const REQUIRED_VARS = [
  '--cso-bg', '--cso-hero-bg', '--cso-hero-border',
  '--cso-word-1', '--cso-word-2', '--cso-word-3',
  '--cso-tagline', '--cso-subtext',
  '--cso-search-bg', '--cso-search-border', '--cso-search-btn', '--cso-search-btn-fg',
  '--cso-pill-bg', '--cso-pill-border', '--cso-pill-text',
  '--cso-pill-hover-bg', '--cso-pill-hover-fg',
  '--cso-badge-bg', '--cso-badge-fg',
  '--cso-scene-sky', '--cso-scene-wheel', '--cso-scene-temple', '--cso-scene-water', '--cso-scene-boat'
];

for (const t of THEMES) {
  const sel = `:root[data-cso-theme="${t}"]`;
  const idx = styleCss.indexOf(sel);
  assert.ok(idx !== -1, `Missing CSS theme block for ${sel}`);
  const block = styleCss.slice(idx, styleCss.indexOf('}', idx) + 1);
  for (const v of REQUIRED_VARS) {
    assert.ok(block.includes(v), `Missing CSS variable ${v} in ${sel}`);
  }
}

// 2. Verify SVG scene animations, reduced motion, and badge rules in style.css
assert.ok(styleCss.includes('@keyframes cso-chakra-rotate'));
assert.ok(styleCss.includes('@keyframes cso-water-drift'));
assert.ok(styleCss.includes('@media (prefers-reduced-motion: reduce)'));
assert.ok(styleCss.includes('var(--cso-badge-bg)'));
assert.ok(styleCss.includes('var(--cso-badge-fg)'));
assert.ok(styleCss.includes('.cso-hero-theme-bar'));
assert.ok(styleCss.includes('.cso-hero-theme-dot'));

// 3. Verify inline SVG scene in index.html hero with zero inline style=""
const heroStart = indexHtml.indexOf('<section class="hero"');
const heroEnd = indexHtml.indexOf('</section>', heroStart);
const heroSection = indexHtml.slice(heroStart, heroEnd);
assert.ok(heroSection.includes('<svg class="cso-hero-scene" viewBox="0 0 1200 420"'));
assert.ok(heroSection.includes('cso-scene-chakra-group'));
assert.ok(heroSection.includes('cso-scene-temple-group'));
assert.ok(heroSection.includes('cso-scene-water-group'));
assert.ok(!heroSection.includes('style='), 'Hero section must have zero inline style="" attributes');

// 4. Verify shared-header.js & app.js dual theme sync + hero 4-dot pill bar
assert.ok(sharedHeader.includes('mountHeroThemeBar'));
assert.ok(sharedHeader.includes('cso-hero-theme-dot'));
assert.ok(sharedHeader.includes('dot.dataset.themeChoice'));
assert.ok(!sharedHeader.includes('innerHTML'));
assert.ok(!sharedHeader.includes('style='));
assert.ok(appJs.includes("setAttribute('data-cso-theme'"));
assert.ok(appJs.includes("localStorage.setItem('cso_portal_theme'"));

console.log('ALL VECTOR HERO ARTWORK & 4-THEME SWITCHER (v134) TESTS PASSED');
