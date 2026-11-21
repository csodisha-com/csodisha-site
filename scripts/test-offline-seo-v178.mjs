// v178: Offline-First PWA & SEO Rich Results Verification.
// Usage: node scripts/test-offline-seo-v178.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildJobsJsonLd } from '../functions/_lib/ssr-feeds.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// 1. offline.html, assets/css/offline.css, assets/js/offline.js + sw.js precache & fallback
const offHtml = read('offline.html');
const offCss = read('assets/css/offline.css');
const offJs = read('assets/js/offline.js');
const swJs = read('sw.js');

ok(offHtml.includes('You are currently offline') && offHtml.includes('id="cso-offline-retry"'), 'offline.html renders status banner and Try Again button');
ok(offHtml.includes('/assets/css/offline.css?v=20261121v178') && offHtml.includes('/assets/js/offline.js?v=20261121v178'), 'offline.html loads v178 external CSS & JS');
ok(offJs.includes('cso_candidate_bookmarks_v1') && offJs.includes('cso_study_mistake_deck') && offJs.includes('window.location.reload()'), 'offline.js wires bookmarks, mistake deck, and reload');
ok(offCss.includes('var(--cso-bg') && offCss.includes('var(--cso-surface') && offCss.includes('min-height: 44px'), 'offline.css uses --cso-* theme tokens and 44px touch targets');

for (const asset of ['/offline.html', '/assets/css/offline.css', '/assets/js/offline.js', '/tools/index.html', '/tools/assets/tools.css', '/tools/assets/tools.js']) {
  ok(swJs.includes(`'${asset}'`), `sw.js PRECACHE_URLS includes ${asset}`);
}
ok(swJs.includes("cache.match('/offline.html')"), 'sw.js falls back to /offline.html on offline navigation');

// 2. JSON-LD Rich Results (JobPosting, FAQPage, Course/CollectionPage)
const jobLdHtml = buildJobsJsonLd([
  { slug: 'opsc-oas-2026', title: 'OPSC OAS 2026', summary: 'Civil Services Exam', organisation: 'OPSC', state: 'Odisha', last_date: '2026-12-31', published_at: '2026-11-01', expired: false }
]);
const jobLdMatch = jobLdHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
ok(jobLdMatch, 'buildJobsJsonLd emits script tag');
const jobLd = JSON.parse(jobLdMatch[1]);
const jp = jobLd.itemListElement[0].item;
ok(jp['@type'] === 'JobPosting' && jp.title === 'OPSC OAS 2026' && jp.validThrough === '2026-12-31' && jp.jobLocation.address.addressRegion === 'Odisha', 'JobPosting JSON-LD parses with required schema.org fields');

function extractJsonLdBlocks(html) {
  const blocks = [];
  for (const m of html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    blocks.push(JSON.parse(m[1]));
  }
  return blocks;
}

const aboutBlocks = extractJsonLdBlocks(read('about/index.html'));
ok(aboutBlocks.some(b => b['@type'] === 'FAQPage' && Array.isArray(b.mainEntity) && b.mainEntity.length >= 2), 'about/index.html has valid FAQPage JSON-LD');

const schemesBlocks = extractJsonLdBlocks(read('schemes/index.html'));
ok(schemesBlocks.some(b => b['@type'] === 'FAQPage' && Array.isArray(b.mainEntity) && b.mainEntity.length >= 2), 'schemes/index.html has valid FAQPage JSON-LD');

const studyBlocks = extractJsonLdBlocks(read('study-library/index.html'));
const studyGraph = studyBlocks.flatMap(b => Array.isArray(b['@graph']) ? b['@graph'] : [b]);
ok(studyGraph.some(b => b['@type'] === 'CollectionPage') && studyGraph.some(b => b['@type'] === 'ItemList' && b.itemListElement.some(x => x.item && x.item['@type'] === 'Course')),
  'study-library/index.html has valid CollectionPage & Course JSON-LD');

// 3. Complete Open Graph Meta Tags + 100% CSP Compliance
const ogPages = [
  'index.html',
  'jobs-careers/index.html',
  'schemes/index.html',
  'study-library/index.html',
  'tools/index.html',
  'student-dashboard/index.html',
  'about/index.html',
  'offline.html'
];
for (const rel of ogPages) {
  const html = read(rel);
  if (rel !== 'offline.html') {
    for (const tag of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'twitter:card']) {
      ok(html.includes(`property="${tag}"`) || html.includes(`name="${tag}"`), `${rel}: includes ${tag}`);
    }
  }
  ok(!/<style[\s>]/i.test(html), `${rel}: zero inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${rel}: zero style="" attributes`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${rel}: zero inline event handlers`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${rel}: zero executable inline <script>`);
  }
}

ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(offJs), 'assets/js/offline.js: zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(offJs), 'assets/js/offline.js: zero onclick=');

// 4. Cache version bump (v178)
ok(/CACHE_NAME = 'cso-candidate-cache-v178'/.test(swJs), 'sw.js bumped to v178');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v178'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v178');
ok(/cso-candidate-cache-v178/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v178');

console.log(`test-offline-seo-v178: ${passed} assertions passed`);
