// Verification for v190 legacy /study-library/group-01/..group-10/ 301 redirects
// Run: node scripts/test-legacy-study-redirects-v190.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handlePublicStudyLibraryRoute,
  LEGACY_STUDY_GROUP_REDIRECTS
} from '../functions/_lib/study-library-ssr.js';
import { DOMAIN_TO_GROUP_SLUG } from '../functions/_lib/study-library-studio.js';
import { handleSitemapXml } from '../functions/api/content/_seo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://csodisha.com';

const EXPECTED_GROUPS = [
  ['group-01', 'early-childhood-primary-education'],
  ['group-02', 'school-higher-secondary-education'],
  ['group-03', 'undergraduate-postgraduate-research'],
  ['group-04', 'competitive-exams-teacher-education'],
  ['group-05', 'professional-vocational-digital-skills'],
  ['group-06', 'subjects-languages-study-materials'],
  ['group-07', 'international-inclusive-education'],
  ['group-08', 'life-skills-culture-lifelong-learning'],
  ['group-09', 'libraries-educators-learning-support'],
  ['group-10', 'odisha-study-hub-resource-organisation']
];

// 1. Verify 1-to-1 order matches DOMAIN_TO_GROUP_SLUG in study-library-studio.js
const studioSlugs = Object.values(DOMAIN_TO_GROUP_SLUG);
assert.equal(studioSlugs.length, 10, 'Expected 10 study library groups in DOMAIN_TO_GROUP_SLUG');
EXPECTED_GROUPS.forEach(([legacyKey, slug], idx) => {
  assert.equal(studioSlugs[idx], slug, `Order mismatch at index ${idx} for ${legacyKey}`);
  assert.equal(
    LEGACY_STUDY_GROUP_REDIRECTS[legacyKey],
    `/study-library/?group=${slug}`,
    `Redirect map mismatch for ${legacyKey}`
  );
});

// 2. Verify handleSitemapXml emits the exact target URLs for all 10 groups
const mockEnv = {
  DB: {
    prepare(sql) {
      return {
        bind() {
          return this;
        },
        async all() {
          if (sql.includes('FROM study_library_nodes')) {
            return {
              results: EXPECTED_GROUPS.map(([, slug]) => ({
                slug,
                updated_at: '2026-11-22T00:00:00Z'
              }))
            };
          }
          return { results: [] };
        }
      };
    }
  }
};

const sitemapRes = await handleSitemapXml(new Request(`${SITE_ORIGIN}/sitemap.xml`), mockEnv);
assert.equal(sitemapRes.status, 200, 'sitemap.xml should return 200');
const sitemapXml = await sitemapRes.text();

// 3. Verify both /study-library/group-XX and /study-library/group-XX/ return 301 to sitemap.xml target
const redirectsTxt = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');

for (const [legacyKey, slug] of EXPECTED_GROUPS) {
  const expectedLocation = `${SITE_ORIGIN}/study-library/?group=${slug}`;
  assert.ok(
    sitemapXml.includes(`<loc>${expectedLocation}</loc>`),
    `sitemap.xml missing <loc>${expectedLocation}</loc>`
  );

  for (const variant of [`/study-library/${legacyKey}`, `/study-library/${legacyKey}/`]) {
    for (const method of ['GET', 'HEAD']) {
      const reqUrl = new URL(`${SITE_ORIGIN}${variant}`);
      const res = await handlePublicStudyLibraryRoute(new Request(reqUrl.toString(), { method }), {}, reqUrl);
      assert.ok(res, `Expected response for ${method} ${variant}`);
      assert.equal(res.status, 301, `Expected 301 for ${method} ${variant}, got ${res.status}`);
      assert.equal(
        res.headers.get('location'),
        expectedLocation,
        `Location mismatch for ${method} ${variant}`
      );
    }

    assert.ok(
      redirectsTxt.includes(`${variant} /study-library/?group=${slug} 301`),
      `_redirects missing rule for ${variant}`
    );
  }
}

// 4. Verify non-legacy paths are not hijacked by the legacy redirect map
const nonLegacyUrl = new URL(`${SITE_ORIGIN}/study-library/early-childhood-education/`);
const passthroughRes = await handlePublicStudyLibraryRoute(
  new Request(nonLegacyUrl.toString(), { method: 'GET' }),
  {},
  nonLegacyUrl
);
assert.equal(passthroughRes, null, 'Static passthrough route must still return null');

console.log('PASS: All 10 legacy /study-library/group-01..group-10 301 redirects verified against sitemap.xml');
