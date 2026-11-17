import assert from 'node:assert/strict';
import fs from 'node:fs';

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const sharedHeader = fs.readFileSync('assets/shared-header.js', 'utf8');
const appJs = fs.readFileSync('assets/app.js', 'utf8');
const adminSettings1 = fs.readFileSync('admin/settings-configuration-batch1.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// 1. Verify squashed legacy blocks & exactly 1 authoritative block per [data-cso-theme="..."]
assert.ok(!styleCss.includes(':root[data-theme="reading"] {'), 'Legacy reading theme block must be squashed');
assert.ok(!styleCss.includes(':root[data-theme="sepia"] {'), 'Legacy sepia theme block must be squashed');

const THEMES = ['alabaster-forest', 'forest-gold', 'chilika-teal', 'konark-sandstone'];
const REQUIRED_TOKENS = [
  '--cso-bg', '--cso-surface', '--cso-surface-alt', '--cso-hero-bg', '--cso-border',
  '--cso-text', '--cso-muted', '--cso-primary', '--cso-primary-fg', '--cso-accent',
  '--cso-highlight-bg', '--cso-highlight-fg', '--cso-highlight-ring',
  '--cso-card-hover-border', '--cso-card-hover-shadow',
  '--cso-selection-bg', '--cso-selection-fg',
  '--cso-scene-wheel', '--cso-scene-temple', '--cso-scene-water', '--cso-scene-boat'
];

for (const t of THEMES) {
  const sel = `:root[data-cso-theme="${t}"]`;
  const firstIdx = styleCss.indexOf(sel);
  assert.ok(firstIdx !== -1, `Missing ${sel}`);
  assert.equal(styleCss.indexOf(sel, firstIdx + 1), -1, `Duplicate block found for ${sel}`);
  const block = styleCss.slice(firstIdx, styleCss.indexOf('}', firstIdx) + 1);
  for (const tok of REQUIRED_TOKENS) {
    assert.ok(block.includes(tok), `Missing token ${tok} in ${sel}`);
  }
}

// 2. Verify ::selection, hover, focus-within & highlight rules
assert.ok(styleCss.includes('::selection'));
assert.ok(styleCss.includes('var(--cso-selection-bg)'));
assert.ok(styleCss.includes('var(--cso-highlight-bg)'));
assert.ok(styleCss.includes('var(--cso-highlight-ring)'));
assert.ok(styleCss.includes('var(--cso-card-hover-border)'));
assert.ok(styleCss.includes('.hero-brand-title::after'));
assert.ok(styleCss.includes('.cso-theme-pill'));
assert.ok(styleCss.includes('.cso-theme-swatch'));

// 3. Verify window.CSOTheme, cross-tab storage sync, labeled pills & /api/config/public fallback
for (const src of [sharedHeader, appJs]) {
  assert.ok(src.includes('window.CSOTheme'));
  assert.ok(src.includes("addEventListener('storage'"));
  assert.ok(src.includes('cso_portal_theme'));
  assert.ok(src.includes('/api/config/public'));
  assert.ok(src.includes('cso-theme-swatch'));
  assert.ok(src.includes('Alabaster'));
  assert.ok(src.includes('Forest Gold'));
  assert.ok(src.includes('Chilika Teal'));
  assert.ok(src.includes('Sandstone'));
}

// 4. Verify Admin Website Identity (module-18-002) includes all 4 presets
assert.ok(adminSettings1.includes('Warm Alabaster & Deep Forest Green'));
assert.ok(adminSettings1.includes('Forest Gold'));
assert.ok(adminSettings1.includes('Chilika Teal'));
assert.ok(adminSettings1.includes('Konark Sandstone'));

// 5. Verify zero CSP violations in shared-header.js, admin settings batch 1, and index.html hero
assert.ok(!sharedHeader.includes('innerHTML'));
assert.ok(!sharedHeader.includes('style='));
assert.ok(!adminSettings1.split('\n').slice(1).join('\n').match(/innerHTML|<script|style=/));
const heroStart = indexHtml.indexOf('<section class="hero"');
const heroEnd = indexHtml.indexOf('</section>', heroStart);
assert.ok(!indexHtml.slice(heroStart, heroEnd).includes('style='));

console.log('ALL UNIFIED 4-THEME DESIGN SYSTEM & SITE SYNC (v135) TESTS PASSED');
