import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

const slHtml = read('study-library/index.html');
const slCss = read('study-library/assets/dashboard.css');
const slJs = read('study-library/assets/dashboard.js');
const jcHtml = read('jobs-careers/index.html');
const jcCss = read('jobs-careers/assets/dashboard.css');
const jcJs = read('jobs-careers/assets/dashboard.js');
const schemesHtml = read('schemes/index.html');
const schemesCss = read('schemes/assets/schemes-explorer.css');
const commHtml = read('community/index.html');
const commCss = read('community/assets/community-explorer.css');
const aboutHtml = read('about/index.html');
const aboutCss = read('about/assets/about-explorer.css');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsSentinel = read('functions/_lib/ops-sentinel.js');

// 1. /study-library/ empty green breadcrumb block removed & uniform top-right cross-portal pills added
assert.ok(!slHtml.includes('<ol class="breadcrumb" id="breadcrumb"></ol>'), 'study-library/index.html has no empty <ol id="breadcrumb"> banner');
assert.ok(slHtml.includes('<div class="cso-sl-crumb"><a href="/">CS ODISHA</a> <span>›</span> <span>STUDY LIBRARY</span></div>'), 'study-library/index.html has uniform uppercase kicker');
assert.ok(slHtml.includes('id="sl-lang-toggle"'), 'study-library/index.html has EN / ଓଡ଼ିଆ hero action pill');
assert.ok(slHtml.includes('href="/jobs/"') && slHtml.includes('href="/schemes/"') && slHtml.includes('href="/community/"'), 'study-library/index.html has right-aligned cross-portal pills');
assert.match(slCss, /\.welcome\.cso-sl-hero-banner,\s*\.study-hero\s*\{[\s\S]*?display:\s*block\s*!important;[\s\S]*?border-radius:\s*20px\s*!important;[\s\S]*?padding:\s*28px\s+32px\s*!important;/, 'study-library hero uses uniform 20px radius and 28px 32px padding');

// 2. /jobs-careers/ bulky green breadcrumb box replaced with uniform clean kicker
assert.ok(!jcHtml.includes('id="breadcrumb"'), 'jobs-careers/index.html no longer has bulky <ol id="breadcrumb"> box');
assert.ok(jcHtml.includes('<div class="cso-jc-crumb"><a href="/">CS ODISHA</a> <span>›</span> <span>JOBS &amp; CAREERS</span></div>'), 'jobs-careers/index.html has uniform uppercase kicker');
assert.match(jcCss, /\.cso-jobs-hero\s*\{\s*border-radius:\s*20px\s*!important;\s*padding:\s*28px\s+32px\s*!important;/, 'jobs-careers hero uses uniform 20px radius and 28px 32px padding');
assert.ok(jcJs.includes('if (!breadcrumb) return;'), 'jobs-careers/assets/dashboard.js guards null breadcrumb');

// 3. /community/ all 8 quick-filter pills single-row sizing
assert.match(commCss, /\.cso-comm-pills,\.cso-comm-quick-pills\{display:flex;gap:7px;align-items:center;flex-wrap:nowrap;/, 'community quick-filter pills use single-row flex-wrap: nowrap with gap: 7px');
assert.match(commCss, /\.cso-comm-pill\{[\s\S]*?padding:7px 13px;font-size:13\.5px;font-weight:600;white-space:nowrap;/, 'community quick-filter pills use padding: 7px 13px and font-size: 13.5px');

// 4. /about/ uniform parchment hero surface, dark-ink contrast & Odia punctuation spacing
assert.match(aboutCss, /\.about-hero,\s*\.cso-about-hero\s*\{[\s\S]*?background:\s*var\(--cso-hero-bg[\s\S]*?border:\s*1px solid var\(--cso-border[\s\S]*?border-radius:\s*20px;[\s\S]*?padding:\s*28px 32px;/, 'about hero uses uniform --cso-hero-bg, 1px solid var(--cso-border), 20px radius, 28px 32px padding');
assert.ok(aboutCss.includes('var(--cso-hero-title'), 'about hero uses --cso-hero-title');
assert.ok(aboutCss.includes('var(--cso-hero-sub'), 'about hero uses --cso-hero-sub');
assert.ok(aboutHtml.includes('ଗଢ଼ନ୍ତୁ । Independent civic knowledge platform'), 'about/index.html has clean space after Odia danda before Independent civic knowledge platform');

// 5. /schemes/ uniform hero card & theme parity in assets/style.css
assert.match(schemesCss, /\.cso-schemes-hero\{[\s\S]*?border-radius:20px;padding:28px 32px;/, 'schemes hero uses 20px radius and 28px 32px padding');
assert.ok(styleCss.includes(':root[data-cso-theme] .cso-about-hero,'), 'assets/style.css includes .cso-about-hero in theme parity rules');

// 6. CSP compliance (zero inline style="", <script>, or .innerHTML)
for (const [name, html] of [
  ['study-library/index.html', slHtml],
  ['jobs-careers/index.html', jcHtml],
  ['schemes/index.html', schemesHtml],
  ['community/index.html', commHtml],
  ['about/index.html', aboutHtml]
]) {
  assert.ok(!/\sstyle\s*=\s*["']/i.test(html), `${name}: zero inline style=""`);
  assert.ok(!/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html), `${name}: zero inline <script>`);
}

for (const [name, js] of [
  ['study-library/assets/dashboard.js', slJs],
  ['jobs-careers/assets/dashboard.js', jcJs]
]) {
  assert.ok(!/\sstyle\s*=\s*["']/i.test(js), `${name}: zero inline style=""`);
  assert.ok(!/\.innerHTML\b/.test(js), `${name}: zero .innerHTML`);
}

// 7. Cache version v150
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v153'"), 'sw.js CACHE_NAME bumped to v150');
assert.ok(opsSentinel.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v153'"), 'ops-sentinel ACTIVE_SW_CACHE_VERSION bumped to v150');

console.log('Uniform Heroes v150 tests passed.');
