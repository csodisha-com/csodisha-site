/**
 * Regression & Contract Audit Suite — v453 (/careers/ 18-Roadmap Library, Quick-Matcher,
 * Milestone Drawer, Deduplicated Footer, Permanent Ask CSOdisha Bar, Strict CSP & 4-Theme Tokens)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const libCode = read('assets/js/careers-roadmap-library.js');
const portalCode = read('assets/js/careers-portal.js');
const careersHtml = read('careers/index.html');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsSentinelJs = read('functions/_lib/ops-sentinel.js');
const sharedHeaderJs = read('assets/shared-header.js');

// 1. Evaluate careers-roadmap-library.js inside an isolated VM sandbox
const sandbox = { window: {}, globalThis: {} };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(libCode, sandbox);

const lib = sandbox.window.CSOCareersRoadmapLibrary;
assert.ok(lib, 'window.CSOCareersRoadmapLibrary must be exposed');
assert.match(lib.VERSION, /^v45[3-9]$/, 'CSOCareersRoadmapLibrary.VERSION must be v453+');
assert.equal(typeof lib.getAllCareerRoadmaps, 'function', 'getAllCareerRoadmaps must be a function');
assert.equal(typeof lib.filterCareerRoadmaps, 'function', 'filterCareerRoadmaps must be a function');

// 2. Verify all 6 tracks and 18 rich bilingual roadmaps (3 per track, zero empty tracks)
const expectedTracks = [
  'civil-services',
  'engineering-it',
  'banking-finance',
  'healthcare',
  'agriculture',
  'career-pathways'
];
assert.deepEqual(
  Array.from(lib.TRACKS, (t) => t.slug),
  expectedTracks,
  'Must define all 6 canonical career tracks'
);

const allRoadmaps = lib.getAllCareerRoadmaps([]);
assert.equal(allRoadmaps.length, 18, 'Must provide 18 built-in bilingual career roadmaps');

const baseFilter = lib.filterCareerRoadmaps(allRoadmaps, {});
assert.equal(baseFilter.total, 18, 'Default filter must return all 18 roadmaps');
assert.equal(baseFilter.allTracksTotal, 18, 'allTracksTotal must equal 18');

for (const slug of expectedTracks) {
  assert.equal(baseFilter.trackCounts[slug], 3, `Track ${slug} must have exactly 3 built-in roadmaps (never 0)`);
}

// Verify every roadmap carries complete bilingual EN / Odia + milestone drawer fields
for (const rm of allRoadmaps) {
  assert.ok(rm.slug && rm.title_en && rm.title_or, `Roadmap ${rm.slug} must have bilingual EN + Odia titles`);
  assert.ok(/[\u0B00-\u0B7F]/.test(rm.title_or), `Roadmap ${rm.slug} title_or must contain Odia script`);
  assert.ok(/[\u0B00-\u0B7F]/.test(rm.summary_or), `Roadmap ${rm.slug} summary_or must contain Odia script`);
  assert.ok(rm.orsp_level && rm.salary_band, `Roadmap ${rm.slug} must specify pay / ORSP level`);
  assert.ok(rm.eligibility_summary && rm.age_window_en, `Roadmap ${rm.slug} must include eligibility & age window`);
  assert.ok(Array.isArray(rm.milestones) && rm.milestones.length === 3, `Roadmap ${rm.slug} must include 3 visual milestones`);
  assert.ok(Array.isArray(rm.selection_stages_en) && rm.selection_stages_en.length >= 2, `Roadmap ${rm.slug} must include selection stages`);
  assert.ok(Array.isArray(rm.promotion_ladder_en) && rm.promotion_ladder_en.length >= 3, `Roadmap ${rm.slug} must include 5-15 yr promotion ladder`);
  assert.ok(Array.isArray(rm.required_certificates_en) && rm.required_certificates_en.length >= 3, `Roadmap ${rm.slug} must include required certificates`);
  assert.ok(Array.isArray(rm.official_links) && rm.official_links.length >= 2, `Roadmap ${rm.slug} must include official links`);
}

// 3. Verify live D1 merging, legacy `pathways` alias normalization, and matcher filtering
const merged = lib.getAllCareerRoadmaps([
  {
    id: 'live-1',
    slug: 'custom-odisha-railways-guide',
    track_slug: 'pathways',
    region_scope: 'national',
    career_stage: 'after-12th',
    title_en: 'Custom East Coast Railway Pathway',
    title_or: 'ପୂର୍ବତଟ ରେଳବାଇ କ୍ୟାରିୟର୍ ମାର୍ଗ'
  }
]);
assert.equal(merged.length, 19, 'Live D1 item should merge cleanly with 18 built-in roadmaps');
assert.equal(merged[0].track_slug, 'career-pathways', 'Legacy pathways slug must normalize to career-pathways');

const pathwaysFiltered = lib.filterCareerRoadmaps(allRoadmaps, { track: 'pathways' });
assert.equal(pathwaysFiltered.total, 3, 'Filtering by legacy track=pathways must match career-pathways');

const after10th = lib.filterCareerRoadmaps(allRoadmaps, { stage: 'after-10th-12th' });
assert.ok(after10th.total >= 5, 'After 10th / +2 matcher should match multiple roadmaps');

const inService = lib.filterCareerRoadmaps(allRoadmaps, { stage: 'in-service' });
assert.ok(inService.total >= 1 && inService.items.some((x) => /MACP/i.test(x.title_en)), 'In-Service matcher must include MACP track');

const odishaOnly = lib.filterCareerRoadmaps(allRoadmaps, { scope: 'odisha-state' });
assert.ok(odishaOnly.total >= 15, 'Odisha State scope must include State and State+National roadmaps');

const nationalOnly = lib.filterCareerRoadmaps(allRoadmaps, { scope: 'national-central' });
assert.ok(nationalOnly.items.some((x) => /RBI Grade B/i.test(x.title_en)), 'National scope must include RBI Grade B / NABARD / SEBI');

const odiaSearch = lib.filterCareerRoadmaps(allRoadmaps, { q: 'ସମବାୟ' });
assert.ok(odiaSearch.total >= 1 && odiaSearch.items.some((x) => /OSCB/i.test(x.title_en)), 'Odia keyword search must match OSCB roadmap');

// 4. Verify careers/index.html structure, Ask CSOdisha preservation, script wiring & non-duplicated footer
assert.match(careersHtml, /semantic-search\.js\?v=20261128v455/, 'careers/index.html must preserve permanent Ask CSOdisha search script');
assert.match(careersHtml, /careers-roadmap-library\.js\?v=20261128v455/, 'careers/index.html must load careers-roadmap-library.js');
assert.match(careersHtml, /saved-alerts-drawer\.js\?v=20261128v455/, 'careers/index.html must load saved-alerts-drawer.js');
assert.match(careersHtml, /careers-portal\.js\?v=20261128v455/, 'careers/index.html must load careers-portal.js');
assert.match(careersHtml, /cso-candidate-cache-v455/, 'careers/index.html footer must show cso-candidate-cache-v455');

const footerMatch = careersHtml.match(/<footer[\s\S]*?<\/footer>/i);
assert.ok(footerMatch, 'careers/index.html must have a <footer>');
const footerHtml = footerMatch[0];
assert.equal((careersHtml.match(/<footer\b/gi) || []).length, 1, 'careers/index.html must contain exactly one <footer>');
assert.equal((footerHtml.match(/class="cso-footer-title">Common Sense Odisha</g) || []).length, 1, 'Footer must have exactly one Common Sense Odisha title');
assert.equal((footerHtml.match(/<h4>Explore<\/h4>/gi) || []).length, 1, 'Footer must have exactly one Explore heading');
assert.equal((footerHtml.match(/<h4>Quick Hubs<\/h4>/gi) || []).length, 1, 'Footer must have exactly one Quick Hubs heading');
assert.equal((footerHtml.match(/<h4>Support &amp; Legal<\/h4>/gi) || []).length, 1, 'Footer must have exactly one Support & Legal heading');

// Verify shared-header.js dedupeFooterBrand guards against duplicate footers/columns
assert.match(sharedHeaderJs, /seenCols/, 'shared-header.js dedupeFooterBrand must guard against duplicate footer column headings');

// 5. Verify careers-portal.js UI cleanup & integrations
assert.doesNotMatch(portalCode, /crp-lang-toggle/, 'Duplicate hero EN/Odia toggle must be removed from careers-portal.js');
assert.match(portalCode, /cso:lang-change/, 'careers-portal.js must sync language via global cso:lang-change event');
assert.doesNotMatch(portalCode, /Author in Admin Studio/i, 'Public empty state must not render Author in Admin Studio CTA');
assert.match(portalCode, /Explore ORSP 7th Pay Scale/, 'Empty state must include candidate ORSP 7th Pay Scale CTA');
assert.match(portalCode, /Live Recruitment Notices/, 'Empty state & drawer must include Live Recruitment Notices CTA');
assert.match(portalCode, /CSOSavedAlerts/, 'careers-portal.js must wire Save Roadmap button to window.CSOSavedAlerts');
assert.match(portalCode, /role', 'dialog'/, 'Milestone drawer must expose ARIA role="dialog"');

// 6. Strict CSP compliance check across HTML and JS files
for (const [label, src] of [
  ['careers-roadmap-library.js', libCode],
  ['careers-portal.js', portalCode]
]) {
  assert.doesNotMatch(src, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/i, `${label} must not use unsafe markup injection`);
  assert.doesNotMatch(src, /\.style\.[a-zA-Z]/, `${label} must not mutate inline styles via .style.*`);
}
assert.doesNotMatch(careersHtml, /\sstyle\s*=\s*["']/i, 'careers/index.html must not contain inline style=""');
assert.doesNotMatch(careersHtml, /\son[a-z]+\s*=\s*["']/i, 'careers/index.html must not contain inline on*="" handlers');

// 7. Verify v453 CSS block in assets/style.css uses 100% var(--cso-*) semantic tokens (zero hardcoded hex)
const v453CssIdx = styleCss.indexOf('v453 — /careers/');
assert.ok(v453CssIdx > 0, 'assets/style.css must contain v453 /careers/ styles');
const v453Css = styleCss.slice(v453CssIdx);
assert.doesNotMatch(v453Css, /#[0-9a-fA-F]{3,8}\b/, 'v453 CSS block must contain ZERO hardcoded hex colors');
assert.match(v453Css, /repeat\(auto-fit,\s*minmax\(min\(100%,\s*320px\),\s*1fr\)\)/, 'v453 CSS must define responsive card grid');
assert.match(v453Css, /min-height:\s*44px/, 'v453 CSS must enforce >= 44px touch targets');
assert.match(v453Css, /prefers-reduced-motion:\s*reduce/, 'v453 CSS must support prefers-reduced-motion');
assert.match(v453Css, /@media print/, 'v453 CSS must include clean @media print rules');

// 8. Verify SW & ops-sentinel cache version sync
assert.match(swJs, /CACHE_NAME\s*=\s*'cso-candidate-cache-v455'/, 'sw.js CACHE_NAME must be cso-candidate-cache-v455');
assert.match(swJs, /\/assets\/js\/careers-roadmap-library\.js\?v=20261128v455/, 'sw.js CANDIDATE_TOOLKIT_URLS must precache careers-roadmap-library.js?v=20261128v455');
assert.match(opsSentinelJs, /ACTIVE_SW_CACHE_VERSION\s*=\s*'cso-candidate-cache-v455'/, 'ops-sentinel.js must match cso-candidate-cache-v455');

console.log('PASS: v453 /careers/ 18-roadmap library, matcher, milestone drawer, footer cleanup, CSP & SW cache audit passed.');
