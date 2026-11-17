import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const sharedHeader = read('assets/shared-header.js');
const styleCss = read('assets/style.css');
const schemesCss = read('schemes/assets/schemes-explorer.css');
const commCss = read('community/assets/community-explorer.css');
const jobsCss = read('jobs-careers/assets/dashboard.css');
const studyCss = read('study-library/assets/dashboard.css');

// 1. Unplanned Student Hub nav item is filtered out from .main-nav
assert.ok(sharedHeader.includes("urlStr.includes('student-hub')"), 'shared-header.js must filter out student-hub URLs');
assert.ok(sharedHeader.includes('/student\\s*hub/'), 'shared-header.js must filter out Student Hub labels');
assert.equal(sharedHeader.includes('.innerHTML'), false, 'shared-header.js must obey zero .innerHTML CSP rule');

// 2. All 7 hero-contrast tokens defined in assets/style.css across all 4 theme states
const heroTokens = [
  '--cso-hero-title:',
  '--cso-hero-text:',
  '--cso-hero-pill-bg:',
  '--cso-hero-pill-fg:',
  '--cso-hero-pill-border:',
  '--cso-hero-pill-active-bg:',
  '--cso-hero-pill-active-fg:',
];
for (const token of heroTokens) {
  const count = styleCss.split(token).length - 1;
  assert.ok(count >= 5, `assets/style.css must define ${token} in system, dark, system-dark, reading, and utkal-bharat blocks (found ${count})`);
}

// 3. All 4 explorer stylesheets use --cso-hero-* tokens and have zero hardcoded #fff / rgba(255,255,255) in hero blocks
for (const [name, css] of [
  ['schemes/assets/schemes-explorer.css', schemesCss],
  ['community/assets/community-explorer.css', commCss],
  ['jobs-careers/assets/dashboard.css', jobsCss],
  ['study-library/assets/dashboard.css', studyCss],
]) {
  assert.ok(css.includes('--cso-hero-title'), `${name} must use --cso-hero-title`);
  assert.ok(css.includes('--cso-hero-text'), `${name} must use --cso-hero-text`);
  assert.ok(css.includes('--cso-hero-pill-bg'), `${name} must use --cso-hero-pill-bg`);
  assert.ok(css.includes('--cso-hero-pill-fg'), `${name} must use --cso-hero-pill-fg`);
  assert.ok(css.includes('--cso-hero-pill-active-bg'), `${name} must use --cso-hero-pill-active-bg`);
}

// Verify schemes-explorer.css and community-explorer.css hero blocks have no hardcoded white/mint text or translucent white pills
const schemesHeroBlock = schemesCss.slice(schemesCss.indexOf('.cso-schemes-hero{'), schemesCss.indexOf('.cso-schemes-kpis{'));
assert.equal(/color:\s*#fff|#bbf7d0|#ecfdf5|#dcfce7|rgba\(255,255,255/i.test(schemesHeroBlock), false, 'schemes hero block must not hardcode white/mint text or translucent white pills');

const commHeroBlock = commCss.slice(commCss.indexOf('.cso-comm-hero{'), commCss.indexOf('.cso-comm-kpis{'));
assert.equal(/color:\s*#fff|#bbf7d0|#ecfdf5|#dcfce7|rgba\(255,255,255/i.test(commHeroBlock), false, 'community hero block must not hardcode white/mint text or translucent white pills');

console.log('✅ test-explorer-hero-contrast-v138 passed');
