import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

// 1. About page topbar, emblem, and CSP compliance
const aboutHtml = read('about/index.html');
assert.ok(aboutHtml.includes('class="cso-dir-topbar"'), 'about/index.html has cso-dir-topbar');
assert.ok(aboutHtml.includes('id="about-topbar-search"'), 'about/index.html has search input');
assert.ok(aboutHtml.includes('id="about-topbar-clear"'), 'about/index.html has clear button');
assert.ok(aboutHtml.includes('id="about-context-pill"'), 'about/index.html has context pill');
assert.ok(aboutHtml.includes('id="about-topbar-toggle"'), 'about/index.html has sidebar toggle');
assert.ok(aboutHtml.includes('Search CSO citizen charter, verification rules, districts, helplines, FAQs...'), 'about search placeholder');
assert.ok(aboutHtml.includes('⌂ Overview'), 'about Overview context pill');
assert.ok(!aboutHtml.includes('cso-about-badge'), 'green CSO square badge removed from about/index.html');
assert.ok((aboutHtml.match(/\/assets\/img\/cso-logo-96\.webp/g) || []).length >= 3, 'about/index.html uses cso-logo-96.webp including sidebar');
assert.ok(!/\sstyle\s*=\s*["']/i.test(aboutHtml), 'about/index.html: no inline style=""');
assert.ok(!/\sonerror\s*=/i.test(aboutHtml), 'about/index.html: no inline onerror');
assert.ok(!/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(aboutHtml), 'about/index.html: no inline <script>');

const jobsHtml = read('jobs/index.html');
assert.ok(!jobsHtml.includes('cso-jobs-badge'), 'green CSO square badge removed from jobs/index.html');
assert.ok(jobsHtml.includes('/assets/img/cso-logo-96.webp'), 'jobs/index.html uses cso-logo-96.webp');

// 2. About JS & CSS
const aboutJs = read('about/assets/about-explorer.js');
assert.ok(aboutJs.includes('initTopSearchAndContext') && aboutJs.includes('initEmblemFallback'), 'about-explorer.js wires topbar & emblem fallback');
assert.ok(aboutJs.includes("addEventListener('input'") && aboutJs.includes("addEventListener('keydown'"), 'about-explorer.js handles input + keydown');
assert.ok(aboutJs.includes("addEventListener('scroll'"), 'about-explorer.js updates context pill on scroll');
assert.ok(!/\.innerHTML\b/.test(aboutJs), 'about-explorer.js: no .innerHTML');

const aboutCss = read('about/assets/about-explorer.css');
assert.ok(aboutCss.includes('.cso-dir-topbar'), 'about-explorer.css styles cso-dir-topbar');
for (const v of ['--cso-surface', '--cso-border', '--cso-text', '--cso-highlight-ring']) {
  assert.ok(aboutCss.slice(aboutCss.indexOf('v145')).includes(`var(${v}`), `about-explorer.css uses ${v}`);
}

// 3. Shared header dropdown overlap fix & theme tokens
const sharedJs = read('assets/shared-header.js');
assert.ok(sharedJs.includes("window.addEventListener('scroll'"), 'shared-header.js dismisses dropdowns on scroll');
assert.ok(sharedJs.includes("e.key === 'Escape'"), 'shared-header.js dismisses dropdowns on Escape');
assert.ok(sharedJs.includes('activeElement.blur()'), 'shared-header.js blurs focused nav on closeDropdowns');
assert.ok(!/\.innerHTML\b/.test(sharedJs), 'shared-header.js: no .innerHTML');

const styleCss = read('assets/style.css');
const ddBlock = styleCss.slice(styleCss.indexOf('.cso-nav-items .dd,\n.dd,\n.cso-site-dropdown'), styleCss.indexOf('Hero Brand Title'));
assert.ok(ddBlock.includes('opacity: 0;') && ddBlock.includes('visibility: hidden;') && ddBlock.includes('pointer-events: none;'), 'dropdowns strictly hidden by default');
assert.ok(!ddBlock.includes('#0f1e33'), 'dropdown background is no longer hardcoded #0f1e33');
assert.ok(ddBlock.includes('var(--cso-surface)') && ddBlock.includes('var(--cso-border)') && ddBlock.includes('var(--cso-text)'), 'dropdowns use theme tokens');

// 4. Cache version v145
assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v145'"), 'sw.js CACHE_NAME v145');
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v145'"), 'ops-sentinel v145');

console.log('About & Nav v145 checks passed.');
