import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const fp = require(path.join(root, 'admin/fast-publish.js'));

// 1. Verify all 30 Odisha districts + 7 state boards (37 total) in sources.json
const sources = JSON.parse(fs.readFileSync(path.join(root, 'scripts/crawl4ai/sources.json'), 'utf8'));
assert.equal(sources.length, 37, 'sources.json must contain 7 state boards + 30 Odisha districts = 37 sources');

const EXPECTED_DISTRICTS = [
  'angul', 'balangir', 'balasore', 'bargarh', 'bhadrak', 'boudh',
  'cuttack', 'deogarh', 'dhenkanal', 'gajapati', 'ganjam', 'jagatsinghpur',
  'jajpur', 'jharsuguda', 'kalahandi', 'kandhamal', 'kendrapara', 'kendujhar',
  'khordha', 'koraput', 'malkangiri', 'mayurbhanj', 'nabarangpur', 'nayagarh',
  'nuapada', 'puri', 'rayagada', 'sambalpur', 'subarnapur', 'sundargarh'
];

const seenIds = new Set();
const seenUrls = new Set();
for (const src of sources) {
  assert.ok(src.id && !seenIds.has(src.id), `Duplicate or missing id: ${src.id}`);
  assert.ok(src.url && !seenUrls.has(src.url), `Duplicate or missing url: ${src.url}`);
  seenIds.add(src.id);
  seenUrls.add(src.url);
  assert.ok(src.url.startsWith('https://'), `URL must use https://: ${src.url}`);
  assert.ok(fp.isVerifiedGovDomain(src.url), `URL must be .gov.in / .nic.in / .odisha.gov.in: ${src.url}`);
}
for (const d of EXPECTED_DISTRICTS) {
  assert.ok(seenIds.has(d), `Missing Odisha district in sources.json: ${d}`);
}

// 2. Verify formatBroadcastDigest (English, Odia, Closing Soon filtering)
const nowMs = Date.parse('2026-11-22T06:00:00+05:30');
const sampleJobs = [
  { id: 'j1', slug: 'opsc-oas-2026', title: 'OPSC OAS 2026', organisation: 'OPSC', status: 'published', last_date: '2026-11-25' },
  { id: 'j2', slug: 'ossc-cgl-2026', title: 'OSSC CGL 2026', organisation: 'OSSC', status: 'published', last_date: '2026-12-15' },
  { id: 'j3', slug: 'expired-job', title: 'Expired Notice', organisation: 'OSSSC', status: 'published', last_date: '2026-11-01' },
  { id: 'j4', slug: 'archived-job', title: 'Archived Notice', organisation: 'OPRB', status: 'archived', last_date: '2026-12-20' }
];

const enActive = fp.formatBroadcastDigest(sampleJobs, { lang: 'en', filter: 'active', nowMs });
assert.ok(enActive.includes('OPSC OAS 2026'));
assert.ok(enActive.includes('OSSC CGL 2026'));
assert.equal(enActive.includes('Expired Notice'), false);
assert.equal(enActive.includes('Archived Notice'), false);
assert.ok(enActive.includes('https://csodisha.com/jobs-careers/?item=opsc-oas-2026'));

const enClosing = fp.formatBroadcastDigest(sampleJobs, { lang: 'en', filter: 'closing-soon', nowMs });
assert.ok(enClosing.includes('OPSC OAS 2026'));
assert.equal(enClosing.includes('OSSC CGL 2026'), false);

const orDigest = fp.formatBroadcastDigest(sampleJobs, { lang: 'or', filter: 'active', nowMs });
assert.ok(orDigest.includes('କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା'));
assert.ok(orDigest.includes('ଶେଷ ତାରିଖ'));

// 3. Verify 100% CSP compliance and Admin Studio wiring
const adminHtml = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const fpJs = fs.readFileSync(path.join(root, 'admin/fast-publish.js'), 'utf8');
const cmsJs = fs.readFileSync(path.join(root, 'admin/cms/cms.js'), 'utf8');

assert.equal(/<style\b/i.test(adminHtml), false);
assert.equal(/\sstyle="/i.test(adminHtml), false);
assert.equal(/\sonclick=/i.test(adminHtml), false);
assert.equal(/\.innerHTML\b|insertAdjacentHTML/i.test(fpJs), false);
assert.ok(cmsJs.includes('renderBroadcastDigestPanel'));
assert.ok(adminHtml.includes('/admin/studio.css?v=20261122v184'));
assert.ok(adminHtml.includes('/admin/fast-publish.js?v=20261122v184'));
assert.ok(adminHtml.includes('/admin/cms/cms.js?v=20261122v184'));

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v\d+'/.test(swJs));

console.log('test-30district-digest-v184: ALL CHECKS PASSED');
