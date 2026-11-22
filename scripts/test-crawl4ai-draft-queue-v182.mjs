import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const fp = require(path.join(root, 'admin/fast-publish.js'));

// 1. Verify Crawl4AI blueprint files exist and target only verified .gov.in domains
const sourcesPath = path.join(root, 'scripts/crawl4ai/sources.json');
const pyPath = path.join(root, 'scripts/crawl4ai/watch_gov_notices.py');
const samplePath = path.join(root, 'scripts/crawl4ai/sample-drafts-queue.json');
const readmePath = path.join(root, 'scripts/crawl4ai/README.md');

for (const p of [sourcesPath, pyPath, samplePath, readmePath]) {
  assert.ok(fs.existsSync(p), `Missing Crawl4AI blueprint file: ${p}`);
}

const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
assert.equal(sources.length, 3, 'sources.json must define OPSC, OSSC, and OSSSC');
for (const src of sources) {
  assert.ok(fp.isVerifiedGovDomain(src.url), `Source URL must be verified .gov.in: ${src.url}`);
}

const pySrc = fs.readFileSync(pyPath, 'utf8');
assert.ok(pySrc.includes('AsyncWebCrawler'), 'watch_gov_notices.py must use crawl4ai AsyncWebCrawler');
assert.ok(pySrc.includes('seen_urls.json'), 'watch_gov_notices.py must deduplicate with seen_urls.json');
assert.ok(pySrc.includes('drafts-queue.json'), 'watch_gov_notices.py must write drafts-queue.json');

const readmeSrc = fs.readFileSync(readmePath, 'utf8');
assert.ok(readmeSrc.includes('pip install crawl4ai'), 'README.md must document crawl4ai install');
assert.ok(readmeSrc.includes('watch_gov_notices.py'), 'README.md must document watcher command');

// 2. Verify Admin Studio Draft Queue validator accepts .gov.in and rejects spoofed/non-gov domains
const sampleRaw = fs.readFileSync(samplePath, 'utf8');
const parsedSample = fp.parseDraftQueueJson(sampleRaw);
assert.equal(parsedSample.error, null);
assert.equal(parsedSample.validDrafts.length, 3);
assert.equal(parsedSample.rejectedCount, 0);

const mixedQueue = JSON.stringify([
  {
    title: 'Valid OPSC Notice',
    agency: 'OPSC',
    official_url: 'https://www.opsc.gov.in/Public/OPSC/Default.aspx',
    last_date: '2026-12-20',
    important_dates: [{ label: 'Last Date', date: '2026-12-20' }]
  },
  {
    title: 'Spoofed Gov Lookalike',
    agency: 'FAKE',
    official_url: 'https://opsc-gov-in.example.com/notice.pdf',
    last_date: '2026-12-20'
  },
  {
    title: 'Insecure HTTP Gov',
    agency: 'OSSC',
    official_url: 'http://www.ossc.gov.in/notice.pdf',
    last_date: '2026-12-20'
  }
]);

const mixedRes = fp.parseDraftQueueJson(mixedQueue);
assert.equal(mixedRes.validDrafts.length, 1, 'Must accept only HTTPS .gov.in/.nic.in drafts');
assert.equal(mixedRes.rejectedCount, 2, 'Must reject spoofed and insecure URLs');
assert.equal(mixedRes.validDrafts[0].source_domain, 'www.opsc.gov.in');

// 3. Verify 100% CSP compliance and Load into Editor wiring
const adminHtml = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const fpJs = fs.readFileSync(path.join(root, 'admin/fast-publish.js'), 'utf8');
const cmsJs = fs.readFileSync(path.join(root, 'admin/cms/cms.js'), 'utf8');

assert.equal(/<style\b/i.test(adminHtml), false, 'Zero <style> in admin/index.html');
assert.equal(/\sstyle="/i.test(adminHtml), false, 'Zero style="" in admin/index.html');
assert.equal(/\sonclick=/i.test(adminHtml), false, 'Zero onclick= in admin/index.html');
const nonLdScripts = [...adminHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for (const s of nonLdScripts) {
  assert.equal(s[2].trim(), '', 'Executable scripts in admin/index.html must be external');
}
assert.equal(/\.innerHTML\b|insertAdjacentHTML/i.test(fpJs), false, 'Zero innerHTML in admin/fast-publish.js');
assert.ok(cmsJs.includes('createGovDraftQueuePanel'), 'cms.js must mount createGovDraftQueuePanel');
assert.ok(adminHtml.includes('/admin/studio.css?v=20261122v182'), 'admin/index.html must bump studio.css to v182');
assert.ok(adminHtml.includes('/admin/fast-publish.js?v=20261122v182'), 'admin/index.html must bump fast-publish.js to v182');
assert.ok(adminHtml.includes('/admin/cms/cms.js?v=20261122v182'), 'admin/index.html must bump cms.js to v182');

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v182'"), 'sw.js must be bumped to v182');

console.log('test-crawl4ai-draft-queue-v182: ALL CHECKS PASSED');
