// Verification for v191 single upper search bar across all HTML pages & strict CSP compliance
// Run: node scripts/test-single-searchbar-v191.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = walkHtml(ROOT);
assert.ok(htmlFiles.length > 0, 'Expected HTML files in repo');

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  // Skip admin or offline print-pack templates if any; check all public pages
  const html = fs.readFileSync(file, 'utf8');
  const allSearchInputs = html.match(/<input\b[^>]*type=["']search["'][^>]*>/gi) || [];
  // Exclude the hidden Ctrl+K modal search input (#bp-search-modal-input)
  const visibleSearchInputs = allSearchInputs.filter(
    tag => !/id=["']bp-search-modal-input["']/i.test(tag)
  );
  assert.ok(
    visibleSearchInputs.length <= 1,
    `${rel} has ${visibleSearchInputs.length} visible search inputs (expected <= 1): ${visibleSearchInputs.join(' | ')}`
  );
}

// Verify specific explorer pages & strict CSP compliance
const checkedPages = [
  {
    htmlPath: 'jobs-careers/index.html',
    jsPath: 'jobs-careers/assets/dashboard.js',
    removedId: 'live-jobs-search',
    upperId: 'directory-search',
    assetVersion: '20261122v191'
  },
  {
    htmlPath: 'schemes/index.html',
    jsPath: 'schemes/assets/schemes-explorer.js',
    removedId: 'schemes-search',
    upperId: 'schemes-topbar-search',
    assetVersion: '20261122v191'
  },
  {
    htmlPath: 'schemes-benefits/index.html',
    jsPath: 'schemes-benefits/assets/dashboard.js',
    removedId: 'scheme-q',
    upperId: 'directory-search',
    assetVersion: '20261122v191'
  },
  {
    htmlPath: 'study-library/index.html',
    jsPath: 'study-library/assets/dashboard.js',
    removedId: 'study-q',
    upperId: 'directory-search',
    assetVersion: '20261122v191'
  },
  {
    htmlPath: 'community/index.html',
    jsPath: 'community/assets/community-explorer.js',
    removedId: 'community-search',
    upperId: 'community-topbar-search',
    assetVersion: '20261122v191'
  }
];

for (const page of checkedPages) {
  const html = fs.readFileSync(path.join(ROOT, page.htmlPath), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, page.jsPath), 'utf8');

  assert.ok(html.includes(`id="${page.upperId}"`), `${page.htmlPath} missing upper #${page.upperId}`);
  assert.ok(!html.includes(`id="${page.removedId}"`), `${page.htmlPath} still has duplicate #${page.removedId}`);
  assert.ok(!js.includes(page.removedId), `${page.jsPath} still references removed #${page.removedId}`);
  assert.ok(
    html.includes(`?v=${page.assetVersion}`) || html.includes('?v=20261122v192') || html.includes('?v=20261122v194'),
    `${page.htmlPath} missing ?v=${page.assetVersion} (or v192/v194) asset bump`
  );

  // Strict CSP compliance checks
  assert.ok(!/<style\b/i.test(html), `No inline <style> allowed in ${page.htmlPath}`);
  assert.ok(!/\sstyle\s*=/i.test(html), `No inline style="" allowed in ${page.htmlPath}`);
  assert.ok(!/\sonclick\s*=/i.test(html), `No onclick= allowed in ${page.htmlPath}`);
  const withoutExternalScripts = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
  const withoutJsonLd = withoutExternalScripts.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  assert.ok(!/<script\b/i.test(withoutJsonLd), `No executable inline <script> allowed in ${page.htmlPath}`);
  assert.ok(!/\.innerHTML\b/.test(js), `No .innerHTML allowed in ${page.jsPath}`);
}

const jobsCss = fs.readFileSync(path.join(ROOT, 'jobs-careers', 'assets', 'dashboard.css'), 'utf8');
assert.match(
  jobsCss,
  /\.live-filter-strip\s+\.live-chip\s*\{[^}]*min-height:\s*44px;/,
  'jobs-careers/assets/dashboard.css .live-filter-strip .live-chip must enforce 44px mobile touch target'
);

console.log(`PASS: All ${htmlFiles.length} HTML files have <= 1 visible search input & strict CSP compliance (v191)`);
