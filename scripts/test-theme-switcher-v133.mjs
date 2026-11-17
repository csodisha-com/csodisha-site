import assert from 'node:assert/strict';
import fs from 'node:fs';

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const sharedHeader = fs.readFileSync('assets/shared-header.js', 'utf8');

// 1. Verify all 4 [data-cso-theme="..."] CSS blocks and custom properties
const THEMES = ['alabaster-forest', 'forest-gold', 'chilika-teal', 'konark-sandstone'];
const REQUIRED_VARS = [
  '--cso-bg', '--cso-hero-bg', '--cso-hero-border',
  '--cso-word-1', '--cso-word-2', '--cso-word-3',
  '--cso-tagline', '--cso-subtext',
  '--cso-search-bg', '--cso-search-border', '--cso-search-btn', '--cso-search-btn-fg',
  '--cso-pill-bg', '--cso-pill-border', '--cso-pill-text',
  '--cso-pill-hover-bg', '--cso-pill-hover-fg'
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

// 2. Verify hero CSS variable bindings & index.html typographic lockup
assert.ok(styleCss.includes('var(--cso-hero-bg)'));
assert.ok(styleCss.includes('var(--cso-word-1)'));
assert.ok(styleCss.includes('var(--cso-word-2)'));
assert.ok(styleCss.includes('var(--cso-word-3)'));
assert.ok(styleCss.includes('var(--cso-search-btn)'));
assert.ok(styleCss.includes('var(--cso-pill-hover-bg)'));

assert.ok(indexHtml.includes('cso-hero-w1'));
assert.ok(indexHtml.includes('cso-hero-w2'));
assert.ok(indexHtml.includes('cso-hero-w3'));
const heroSection = indexHtml.slice(indexHtml.indexOf('<section class="hero"'), indexHtml.indexOf('</section>', indexHtml.indexOf('<section class="hero"')));
assert.ok(!heroSection.includes('style='), 'Hero section must have zero inline style="" attributes');

// 3. Verify shared-header.js 4-theme switcher, localStorage & /api/config/public default
for (const t of THEMES) {
  assert.ok(sharedHeader.includes(`'${t}'`), `Missing theme key ${t} in shared-header.js`);
}
assert.ok(sharedHeader.includes("localStorage.getItem('cso_portal_theme')"));
assert.ok(sharedHeader.includes("localStorage.setItem('cso_portal_theme'"));
assert.ok(sharedHeader.includes("setAttribute('data-cso-theme'"));
assert.ok(sharedHeader.includes("fetch('/api/config/public'"));
assert.ok(sharedHeader.includes('primary_palette_name'));

// 4. Verify zero CSP violations in shared-header.js
assert.ok(!sharedHeader.includes('innerHTML'), 'shared-header.js must not use innerHTML');
assert.ok(!sharedHeader.includes('style='), 'shared-header.js must not set inline style=');

console.log('ALL 4-THEME SWITCHER & HERO TRANSFORMATION (v133) TESTS PASSED');
