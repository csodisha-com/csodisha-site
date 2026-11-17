import assert from 'node:assert/strict';
import fs from 'node:fs';

const styleCss = fs.readFileSync('assets/style.css', 'utf8');
const sharedHeader = fs.readFileSync('assets/shared-header.js', 'utf8');
const appJs = fs.readFileSync('assets/app.js', 'utf8');
const adminSettings1 = fs.readFileSync('admin/settings-configuration-batch1.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// 1. Verify .cso-hero-theme-bar / mountHeroThemeBar are completely removed
assert.ok(!styleCss.includes('.cso-hero-theme-bar'), 'Duplicate hero theme bar CSS must be removed');
assert.ok(!sharedHeader.includes('mountHeroThemeBar'), 'mountHeroThemeBar must be removed');
assert.ok(!sharedHeader.includes('cso-hero-theme-bar'), 'cso-hero-theme-bar must be removed from shared-header.js');
assert.ok(!appJs.includes('csoMountHeroThemeBar'), 'csoMountHeroThemeBar must be removed');
assert.ok(!appJs.includes('cso-hero-theme-bar'), 'cso-hero-theme-bar must be removed from app.js');

// 2. Verify all 4 final themes (system, dark, reading, utkal-bharat) & prefers-color-scheme listener
const THEMES = ['system', 'dark', 'reading', 'utkal-bharat'];
for (const t of THEMES) {
  assert.ok(styleCss.includes(`:root[data-cso-theme="${t}"]`), `Missing CSS block for ${t}`);
  assert.ok(sharedHeader.includes(`'${t}'`), `Missing ${t} in shared-header.js`);
  assert.ok(appJs.includes(`'${t}'`), `Missing ${t} in app.js`);
}
assert.ok(styleCss.includes('@media (prefers-color-scheme: dark)'));
assert.ok(sharedHeader.includes('matchMedia'));
assert.ok(sharedHeader.includes('data-cso-resolved-mode'));
assert.ok(appJs.includes('matchMedia'));
assert.ok(appJs.includes('data-cso-resolved-mode'));

// 3. Verify top-of-file hardcoded #0f172a/#1e293b overrides are removed & lower cards use var(--cso-surface)/var(--cso-text)
const topCss = styleCss.slice(0, 1000);
assert.ok(!topCss.includes('#0f172a'), 'Top :root must not hardcode #0f172a');
assert.ok(!topCss.includes('#1e293b'), 'Top :root must not hardcode #1e293b');
for (const sel of ['.cso-compass-section', '.cso-topic-card', '.tool-card', '.cso-hub-card']) {
  assert.ok(styleCss.includes(sel), `Missing lower card selector ${sel}`);
}
assert.ok(styleCss.includes('background: var(--cso-surface) !important;'));
assert.ok(styleCss.includes('color: var(--cso-text) !important;'));

// 4. Verify Admin Website Identity presets
for (const label of ['System (Auto Light/Dark)', 'Dark Night', 'Reading Mode (Kalinga Paper)', 'Odisha & Bharat Heritage']) {
  assert.ok(adminSettings1.includes(label), `Missing admin identity preset: ${label}`);
}

// 5. Verify zero CSP violations
assert.ok(!sharedHeader.includes('innerHTML'));
assert.ok(!sharedHeader.includes('style='));
assert.ok(!adminSettings1.split('\n').slice(1).join('\n').match(/innerHTML|<script|style=/));
const heroStart = indexHtml.indexOf('<section class="hero"');
const heroEnd = indexHtml.indexOf('</section>', heroStart);
assert.ok(!indexHtml.slice(heroStart, heroEnd).includes('style='));

console.log('ALL UNIFIED 4-THEME (SYSTEM/DARK/READING/UTKAL-BHARAT, v136) TESTS PASSED');
