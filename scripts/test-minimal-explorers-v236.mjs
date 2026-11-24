#!/usr/bin/env node
/**
 * Regression & Verification Suite for Minimal Explorer Cleanup (v236)
 * Verifies across all 5 section explorers (schemes/ + schemes-benefits/,
 * jobs/ + jobs-careers/, study-library/, community/, and about/):
 *  1. Left sidebar has zero hardcoded PORTAL LINKS blocks or .sidebar-footer portal piles.
 *  2. Hero headers have zero redundant top-right jump pills or hardcoded filter pills.
 *  3. Search inputs use clean generic placeholders (zero hardcoded example names like Subhadra/KALIA/OPSC).
 *  4. Secondary category panels, filter bars, eligibility bars, and count badges default to `hidden`
 *     in HTML and dynamically toggle via `.hidden` in JS when 0 vs >=1 categories/items exist in D1.
 *  5. Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v236.
 *  6. Strict CSP compliance across all modified HTML & JS files (zero innerHTML, outerHTML,
 *     insertAdjacentHTML, .style.*, or inline style="" / on*="" attributes).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

const EXPLORER_HTML_FILES = [
  'schemes/index.html',
  'schemes-benefits/index.html',
  'jobs/index.html',
  'jobs-careers/index.html',
  'study-library/index.html',
  'community/index.html',
  'about/index.html'
];

const EXPLORER_JS_FILES = [
  'schemes/assets/schemes-explorer.js',
  'schemes-benefits/assets/dashboard.js',
  'jobs/assets/jobs-explorer.js',
  'jobs-careers/assets/dashboard.js',
  'study-library/assets/dashboard.js',
  'community/assets/community-explorer.js',
  'about/assets/about-explorer.js'
];

console.log('=== CSO Minimal Explorer Cleanup Verification Suite (v236) ===');

check('All 7 explorer HTML files remove PORTAL LINKS, .sidebar-footer clutter, and DIRECTORY SECTIONS / ABOUT SECTIONS headings', () => {
  for (const rel of EXPLORER_HTML_FILES) {
    const html = read(rel);
    assert.ok(!/PORTAL LINKS/i.test(html), `${rel} must not contain hardcoded PORTAL LINKS block`);
    assert.ok(!html.includes('class="sidebar-footer"'), `${rel} must not contain .sidebar-footer portal pile`);
    assert.ok(!/>DIRECTORY SECTIONS</i.test(html), `${rel} must not contain hardcoded DIRECTORY SECTIONS label`);
    assert.ok(!/>ABOUT SECTIONS</i.test(html), `${rel} must not contain hardcoded ABOUT SECTIONS label`);
  }
});

check('All 7 explorer JS controllers keep left sidebar clean without hardcoded Overview buttons', () => {
  assert.ok(!read('study-library/assets/dashboard.js').includes("el('span', 'side-link-text', 'Overview')"));
  assert.ok(!read('jobs-careers/assets/dashboard.js').includes("el('a', 'side-link active', 'Overview')"));
  assert.ok(!read('schemes-benefits/assets/dashboard.js').includes("el('span', 'side-title', 'Overview')"));
  assert.ok(!read('schemes-benefits/assets/dashboard.js').includes("ovLink.textContent = 'Overview'"));
  assert.ok(!read('community/assets/community-explorer.js').includes("class: 'cso-comm-rail-label', text: 'Overview'"));
  assert.ok(!read('about/assets/about-explorer.js').includes("pick('Overview', 'ସମୀକ୍ଷା')"));
  assert.ok(!read('jobs/assets/jobs-explorer.js').includes("class: 'cso-jobs-rail-label', text: 'Overview'"));
  assert.ok(!read('schemes/assets/schemes-explorer.js').includes("class: 'cso-schemes-rail-label', text: 'Overview'"));
});

check('All 7 explorer HTML files remove redundant top-right hero jump pills & hardcoded filter pills', () => {
  const forbiddenHeroChrome = [
    'cso-schemes-hero-actions',
    'cso-schemes-quick-pills',
    'scheme-hub-shortcuts',
    'cso-jobs-hero-actions',
    'cso-jobs-quick-pills',
    'cso-jobs-quick-filters',
    'cso-sl-hero-actions',
    'cso-sl-hero-quickjump',
    'cso-comm-hero-actions',
    'cso-comm-quick-pills',
    'cso-about-hero-actions'
  ];
  for (const rel of EXPLORER_HTML_FILES) {
    const html = read(rel);
    for (const cls of forbiddenHeroChrome) {
      assert.ok(!html.includes(cls), `${rel} must not contain redundant hero chrome class "${cls}"`);
    }
  }
});

check('All 7 explorer HTML files use clean generic search placeholders without hardcoded examples', () => {
  const expectedPlaceholders = [
    ['schemes/index.html', 'placeholder="Search schemes..."'],
    ['schemes-benefits/index.html', 'placeholder="Search schemes..."'],
    ['jobs/index.html', 'placeholder="Search jobs..."'],
    ['jobs-careers/index.html', 'placeholder="Search jobs..."'],
    ['study-library/index.html', 'placeholder="Search study materials..."'],
    ['community/index.html', 'placeholder="Search community..."'],
    ['about/index.html', 'placeholder="Search about..."']
  ];
  for (const [rel, expected] of expectedPlaceholders) {
    const html = read(rel);
    assert.ok(html.includes(expected), `${rel} must include ${expected}`);
    assert.ok(!/placeholder="[^"]*(Subhadra|KALIA|OPSC|OSSC|OSSSC)[^"]*"/i.test(html),
      `${rel} search placeholder must not include hardcoded example names`);
  }
});

check('Filter bars, count badges, eligibility bars, and empty category panels default to hidden in HTML', () => {
  const checks = [
    ['schemes/index.html', ['id="schemes-categories-panel"', 'id="schemes-filters-bar"', 'id="schemes-results-count"', 'id="schemes-eligibility-bar"']],
    ['schemes-benefits/index.html', ['id="live-schemes-count"', 'id="scheme-elig-form"', 'id="scheme-quick-chips"', 'id="scheme-status-pills"', 'id="scheme-prep-guide"', 'id="overview"']],
    ['jobs/index.html', ['id="jobs-categories-panel"', 'id="jobs-filters-panel"']],
    ['study-library/index.html', ['id="live-study-count"', 'id="study-header-actions"', 'id="study-filter-bar"', 'id="study-type-pills"', 'id="overview"', 'id="load-status"']],
    ['community/index.html', ['id="community-categories-panel"', 'id="community-filters-bar"', 'id="community-results-count"']],
    ['about/index.html', ['id="about-load-status"']]
  ];
  for (const [rel, ids] of checks) {
    const html = read(rel);
    for (const idAttr of ids) {
      const re = new RegExp(`<[^>]*${idAttr}[^>]*\\bhidden\\b[^>]*>`, 'i');
      assert.match(html, re, `${rel}: element with ${idAttr} must default to hidden`);
    }
  }
});

check('All 7 explorer JS controllers dynamically toggle empty panels & filter bars via .hidden and sync /api/nav/config', () => {
  const schemesJs = read('schemes/assets/schemes-explorer.js');
  assert.ok(schemesJs.includes("catPanel.hidden = !domains.length"));
  assert.ok(schemesJs.includes("filtersBar.hidden = !showControls"));
  assert.ok(schemesJs.includes("eligBar.hidden = !showControls"));
  assert.ok(schemesJs.includes("'/api/nav/config'"));

  const schemesBenJs = read('schemes-benefits/assets/dashboard.js');
  assert.ok(schemesBenJs.includes('if (overview) overview.hidden = true;'));
  assert.ok(schemesBenJs.includes('if (eligForm) eligForm.hidden = !showSchemeControls;'));
  assert.ok(schemesBenJs.includes('if (quickChipsWrap) quickChipsWrap.hidden = !showSchemeControls;'));

  const jobsJs = read('jobs/assets/jobs-explorer.js');
  assert.ok(jobsJs.includes('if (catPanel) catPanel.hidden = !domains.length;'));
  assert.ok(jobsJs.includes('if (filtersPanel) filtersPanel.hidden = !state.lastItems.length && !hasFilter;'));
  assert.ok(jobsJs.includes("'/api/nav/config'"));

  const jobsCarJs = read('jobs-careers/assets/dashboard.js');
  assert.ok(jobsCarJs.includes('if (topSel) topSel.hidden = true;'));
  assert.ok(jobsCarJs.includes('if (matchingEl) matchingEl.hidden = true;'));
  assert.ok(jobsCarJs.includes('if (explorer) explorer.hidden = true;'));

  const studyJs = read('study-library/assets/dashboard.js');
  assert.ok(studyJs.includes('if (studyHeaderActions) studyHeaderActions.hidden = !showControls;'));
  assert.ok(studyJs.includes('if (studyFilterBar) studyFilterBar.hidden = !showControls;'));
  assert.ok(studyJs.includes('if (studyTypePills) studyTypePills.hidden = !showControls;'));
  assert.ok(studyJs.includes('if (overviewEl) overviewEl.hidden = !state.groups.length;'));

  const commJs = read('community/assets/community-explorer.js');
  assert.ok(commJs.includes('if (catPanel) catPanel.hidden = !domains.length;'));
  assert.ok(commJs.includes('if (filtersBar) filtersBar.hidden = !showControls;'));
  assert.ok(commJs.includes("'/api/nav/config'"));

  const aboutJs = read('about/assets/about-explorer.js');
  assert.ok(aboutJs.includes('if (statusEl) statusEl.hidden = true;'));
  assert.ok(aboutJs.includes('statusEl.hidden = false;'));
});

check('Service Worker sw.js & ops-sentinel.js bumped to cso-candidate-cache-v237+', () => {
  assert.match(read('sw.js'), /const CACHE_NAME = 'cso-candidate-cache-v23[7-9]';/);
  assert.match(read('functions/_lib/ops-sentinel.js'), /export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v23[7-9]';/);
});

check('Strict CSP compliance across all 7 explorer HTML & 7 explorer JS files', () => {
  for (const rel of EXPLORER_JS_FILES) {
    const src = read(rel);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${rel} violates CSP (.innerHTML)`);
    assert.ok(!/\.outerHTML\s*=/.test(src), `${rel} violates CSP (.outerHTML)`);
    assert.ok(!/insertAdjacentHTML/.test(src), `${rel} violates CSP (insertAdjacentHTML)`);
    assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(src), `${rel} violates CSP (.style.*)`);
  }
  for (const rel of EXPLORER_HTML_FILES) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `${rel} has inline event handler`);
    assert.ok(!/\sstyle="/i.test(html), `${rel} has inline style attribute`);
  }
});

console.log(`\nALL ${passed} MINIMAL EXPLORER CLEANUP (v236) CHECKS PASSED!`);
