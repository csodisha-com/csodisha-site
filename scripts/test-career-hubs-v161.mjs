// v161: Career Hubs verification. Usage: node scripts/test-career-hubs-v161.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HUBS, ORIGIN } from './career-hubs-data.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

ok(HUBS.length === 6, 'expected 6 hubs');
const expectedSlugs = ['odisha-state-jobs', 'teaching-education', 'central-ssc-railways-banking', 'police-defence', 'psu-technical-healthcare', 'private-remote-internships'];
ok(JSON.stringify(HUBS.map((h) => h.slug)) === JSON.stringify(expectedSlugs), 'hub slugs/order mismatch');

const hubJs = read('jobs-careers/assets/hub.js');
const hubCss = read('jobs-careers/assets/hub.css');
const dashCss = read('jobs-careers/assets/dashboard.css');
const sitemapXml = read('sitemap.xml');
const seoJs = read('functions/api/content/_seo.js');

function cspChecks(label, html) {
  ok(!/<style[\s>]/i.test(html), `${label}: inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${label}: style= attribute`);
  ok(!/\son[a-z]+\s*=/i.test(html), `${label}: inline event handler`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${label}: inline <script> ${m[1]}`);
  }
  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    ok(m[1] !== '' && m[1] !== '#' && !/^javascript:/i.test(m[1]), `${label}: dead href "${m[1]}"`);
  }
  ok(!/Directory at a Glance/i.test(html), `${label}: Directory at a Glance present`);
}

for (const hub of HUBS) {
  const rel = `jobs-careers/${hub.slug}/index.html`;
  ok(fs.existsSync(path.join(root, rel)), `${rel} missing`);
  const html = read(rel);
  const url = `${ORIGIN}/jobs-careers/${hub.slug}/`;
  ok(new RegExp(`<link rel="canonical" href="${url}">`).test(html), `${hub.slug}: canonical`);
  ok(/<title>[^<]{10,}<\/title>/.test(html), `${hub.slug}: title`);
  ok(/<meta name="description" content="[^"]{40,}">/.test(html), `${hub.slug}: meta description`);
  ok(/<meta property="og:title" content="[^"]+">/.test(html), `${hub.slug}: og:title`);
  ok(/<meta property="og:description" content="[^"]+">/.test(html), `${hub.slug}: og:description`);
  ok(html.includes('aria-label="Breadcrumb"') && html.includes('>Home</a>') && html.includes('>Jobs &amp; Careers</a>') && /aria-current="page"/.test(html), `${hub.slug}: breadcrumb`);
  ok(/<h1>/.test(html), `${hub.slug}: h1`);
  // chips
  const chipCount = (html.match(/data-hub-chip/g) || []).length;
  ok(chipCount === hub.chips.length + 1, `${hub.slug}: chips (${chipCount})`);
  ok((html.match(/aria-pressed="true"/g) || []).length === 1, `${hub.slug}: exactly one pressed chip initially`);
  ok(html.includes('id="hub-reset"') && html.includes('Reset Filters'), `${hub.slug}: reset button`);
  ok(html.includes('id="hub-search"') && html.includes('id="hub-grid"') && html.includes('id="hub-status"'), `${hub.slug}: search/grid/status`);
  // official portals
  const portals = [...html.matchAll(/class="cso-jobs-action-pill" href="(https:\/\/[^"]+)" target="_blank" rel="noopener noreferrer"/g)].map((m) => m[1]);
  ok(portals.length >= 4, `${hub.slug}: official portal links`);
  // related resources link to real internal pages
  const relatedLinks = [...html.matchAll(/class="cso-hub-related-card" href="([^"]+)"/g)].map((m) => m[1]);
  ok(relatedLinks.length === 4 && html.includes('Related Study &amp; Exam Resources'), `${hub.slug}: related strip`);
  for (const l of relatedLinks) ok(fs.existsSync(path.join(root, l.replace(/^\//, ''), 'index.html')), `${hub.slug}: related link missing target ${l}`);
  // assets & scripts
  ok(html.includes('/jobs-careers/assets/hub.js') && html.includes('/jobs-careers/assets/hub.css') && html.includes('/assets/js/bookmark-manager.js'), `${hub.slug}: hub assets / bookmark manager`);
  ok(html.includes('id="header-top"') && html.includes('cso-footer-zone3'), `${hub.slug}: uniform shell`);
  cspChecks(hub.slug, html);
  // sitemap
  ok(sitemapXml.includes(`<loc>${url}</loc>`), `${hub.slug}: missing in sitemap.xml`);
  ok(seoJs.includes(`/jobs-careers/${hub.slug}/`), `${hub.slug}: missing in dynamic sitemap generator`);
  // pattern sanity
  ok(HUBS.every((h) => { try { new RegExp(h.pattern, 'i'); h.chips.forEach((c) => new RegExp(c.pattern, 'i')); return true; } catch { return false; } }), 'pattern compile');
}

// Pattern routing sanity
const samples = {
  'odisha-state-jobs': 'OPSC Odisha Civil Services OAS prelims',
  'teaching-education': 'OSSTET 2026 Junior Teacher recruitment',
  'central-ssc-railways-banking': 'SSC CGL 2026 notification',
  'police-defence': 'Odisha Police Sub-Inspector recruitment',
  'psu-technical-healthcare': 'NHM Odisha Staff Nurse GNM vacancy',
  'private-remote-internships': 'Remote software internship for freshers'
};
for (const hub of HUBS) {
  const text = samples[hub.slug].toLowerCase();
  ok(new RegExp(hub.pattern, 'i').test(text), `${hub.slug}: pattern should match sample`);
  ok(hub.chips.some((c) => new RegExp(c.pattern, 'i').test(text)), `${hub.slug}: at least one chip should match sample`);
}

// hub.js: wired, CSP-safe
for (const needle of ["btn.addEventListener('click'", "search.addEventListener('input'", "resetBtn.addEventListener('click', reset)", "again.addEventListener('click', reset)", 'navigator.share', 'clipboard.writeText', 'Link Copied!', "aria-pressed", "'★ Save'", "'★ Saved'", 'bookmarkIdle', "'Reset Filters'", 'View Details', 'Apply Online', "apply.rel = 'noopener noreferrer'", "apply.target = '_blank'"]) {
  ok(hubJs.includes(needle), `hub.js missing: ${needle}`);
}
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write|\.style\.cssText|setAttribute\(\s*['"]style['"]/.test(hubJs), 'hub.js CSP violation');
ok(!/\bonclick\s*=/.test(hubJs), 'hub.js onclick=');
ok(!/href\s*=\s*['"](#|javascript:)?['"]/.test(hubJs), 'hub.js dead href');
ok(/grid-template-columns:\s*1fr 1fr/.test(dashCss), '2x2 mobile action grid CSS');
ok(!/<style|\.innerHTML/.test(hubCss), 'hub.css clean');

// Landing page
const landing = read('jobs-careers/index.html');
cspChecks('landing', landing);
ok(/class="cso-hub-grid"/.test(landing), 'landing hubs grid missing');
ok(/grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)/.test(hubCss), 'landing grid template');
for (const hub of HUBS) {
  ok(landing.includes(`href="/jobs-careers/${hub.slug}/"`), `landing missing link to ${hub.slug}`);
  ok(landing.includes(hub.boards.replace(/&/g, '&amp;')), `landing missing boards for ${hub.slug}`);
}
ok((landing.match(/data-hub-count/g) || []).length === 6, 'landing live count slots');
ok(landing.includes('/jobs-careers/assets/hub.js') && landing.includes('/jobs-careers/assets/hub.css'), 'landing hub assets');
ok(!/>\s*0 (entries|categories)/.test(landing), 'landing has zero-entry folders');
ok(landing.indexOf('id="live-jobs-section"') < landing.indexOf('id="career-hubs"'), 'hubs grid must be below live feed');
ok(/initLandingCounts/.test(hubJs) && !/Study resources & portals'\s*:\s*'0/.test(hubJs), 'landing counts wired');

// Cache bump
ok(/CACHE_NAME = 'cso-candidate-cache-v161'/.test(read('sw.js')), 'sw.js not v161');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v161'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel not v161');
ok(/cso-candidate-cache-v161/.test(read('scripts/test-ops-sentinel.mjs')), 'ops test not v161');

console.log(`test-career-hubs-v161: ${passed} assertions passed`);
