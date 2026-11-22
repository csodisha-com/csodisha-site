// Verification for v191 single search bar on /jobs-careers/ & strict CSP compliance
// Run: node scripts/test-single-searchbar-v191.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'jobs-careers', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'jobs-careers', 'assets', 'dashboard.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'jobs-careers', 'assets', 'dashboard.css'), 'utf8');

// 1. Exactly one search input with the placeholder in /jobs-careers/index.html (the upper #directory-search)
const placeholderMatches = html.match(/Search jobs, recruitments, eligibility, entrance exams\.\.\./g) || [];
assert.equal(
  placeholderMatches.length,
  1,
  `Expected exactly 1 search input placeholder in jobs-careers/index.html, found ${placeholderMatches.length}`
);
assert.ok(html.includes('id="directory-search"'), 'Upper #directory-search must remain');
assert.ok(!html.includes('id="live-jobs-search"'), 'Duplicate #live-jobs-search must be removed');
assert.ok(!html.includes('class="live-search-bar"'), 'Duplicate .live-search-bar wrapper must be removed');

// 2. Asset cache-busting & 44px mobile touch target for category pills
assert.ok(html.includes('./assets/dashboard.css?v=20261122v191'), 'dashboard.css must be bumped to v20261122v191');
assert.ok(html.includes('./assets/dashboard.js?v=20261122v191'), 'dashboard.js must be bumped to v20261122v191');
assert.match(
  css,
  /\.live-filter-strip\s+\.live-chip\s*\{[^}]*min-height:\s*44px;/,
  '.live-filter-strip .live-chip must enforce 44px mobile touch target'
);

// 3. No stale #live-jobs-search references in dashboard.js and upper search syncs cleanly
assert.ok(!js.includes('live-jobs-search'), 'dashboard.js must not reference removed #live-jobs-search');
assert.ok(js.includes('syncTopSearchToLiveJobs('), 'dashboard.js must sync upper search to live jobs');
assert.ok(js.includes("search.addEventListener('input', renderSearch)"), 'upper #directory-search must stay wired');

// 4. Strict CSP compliance on jobs-careers/index.html & dashboard.js
assert.ok(!/<style\b/i.test(html), 'No inline <style> allowed in jobs-careers/index.html');
assert.ok(!/\sstyle\s*=/i.test(html), 'No inline style="" attributes allowed in jobs-careers/index.html');
assert.ok(!/\sonclick\s*=/i.test(html), 'No onclick= attributes allowed in jobs-careers/index.html');

// Strip <script src="..." defer></script> external tags and verify no executable inline <script>
const withoutExternalScripts = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
assert.ok(!/<script\b/i.test(withoutExternalScripts), 'No executable inline <script> allowed in jobs-careers/index.html');

assert.ok(!/\.innerHTML\b/.test(js), 'No .innerHTML allowed in jobs-careers/assets/dashboard.js');

console.log('PASS: /jobs-careers/ single search bar & strict CSP compliance verified (v191)');
