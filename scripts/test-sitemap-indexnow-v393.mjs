/**
 * v393: Dynamic XML Sitemap (/sitemap.xml), /robots.txt & IndexNow Auto-Ping Verification Suite
 * Validates:
 *  1. GET /sitemap.xml returns HTTP 200 application/xml with valid Sitemaps.org 0.9 <urlset>,
 *     zero duplicate <loc> entries, valid ISO 8601 <lastmod>, zero drafts, all core hubs,
 *     MMU Bhawanipatna, OSSTET Result 2026, and /guides/ detail URLs.
 *  2. GET /robots.txt returns HTTP 200 text/plain advertising Sitemap: https://csodisha.com/sitemap.xml
 *     and disallowing /admin/ & /api/admin/.
 *  3. GET /<INDEXNOW_KEY>.txt returns HTTP 200 text/plain matching the exact verification key.
 *  4. POST /api/admin/seo/ping-indexnow enforces Admin RBAC (401 unauthenticated).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  handleDynamicSitemapXml,
  handleDynamicRobotsTxt,
  CORE_SITEMAP_HUBS
} from '../functions/_lib/dynamic-sitemap.js';
import {
  DEFAULT_INDEXNOW_KEY,
  getIndexNowKey,
  isIndexNowKeyPath,
  handleIndexNowKeyTxt
} from '../functions/_lib/indexnow-pinger.js';
import { requireRole, STAFF_ROLES } from '../functions/_lib/rbac.js';

const mockDb = {
  prepare(sql) {
    return {
      bind() { return this; },
      first: async () => null,
      all: async () => {
        if (/FROM\s+job_articles/i.test(sql)) {
          return {
            results: [
              {
                slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
                updated_at: '2026-11-26 12:00:00',
                published_at: '2026-11-26 10:00:00',
                is_published: 1
              },
              {
                slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
                updated_at: '2026-11-27T02:36:18Z',
                published_at: '2026-11-27T02:36:18Z',
                is_published: 1
              },
              {
                slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr',
                updated_at: '2026-11-27T02:36:18Z',
                published_at: '2026-11-27T02:36:18Z',
                is_published: 1
              },
              {
                slug: 'secret-unpublished-draft-job',
                updated_at: '2026-11-27T00:00:00Z',
                is_published: 0
              }
            ]
          };
        }
        if (/FROM\s+informative_guides/i.test(sql)) {
          return {
            results: [
              {
                slug: 'ugc-net-december-2026-schedule-nta-guidelines',
                updated_at: '2026-11-27T03:00:00Z',
                created_at: '2026-11-26T08:00:00Z',
                status: 'published'
              },
              {
                slug: 'draft-guide-should-not-appear',
                updated_at: '2026-11-27T03:00:00Z',
                status: 'draft'
              }
            ]
          };
        }
        return { results: [] };
      }
    };
  }
};

// 1. Dynamic /sitemap.xml
const sitemapRes = await handleDynamicSitemapXml(new Request('https://csodisha.com/sitemap.xml'), { DB: mockDb });
assert.equal(sitemapRes.status, 200);
assert.match(sitemapRes.headers.get('Content-Type') || '', /application\/xml/i);
const xml = await sitemapRes.text();
assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Valid XML declaration');
assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Valid Sitemaps.org 0.9 urlset');
assert.ok(xml.trim().endsWith('</urlset>'));

const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert.equal(locs.length, new Set(locs).size, 'Zero duplicate <loc> entries in sitemap.xml');
for (const hub of CORE_SITEMAP_HUBS) {
  assert.ok(locs.includes(`https://csodisha.com${hub.path}`), `Sitemap includes core hub ${hub.path}`);
}
assert.ok(locs.includes('https://csodisha.com/jobs/mmu-bhawanipatna-itep-teaching-recruitment-2026'));
assert.ok(locs.includes('https://csodisha.com/jobs/bse-odisha-osstet-result-2026-scorecard-certificate-omr'));
assert.ok(locs.includes('https://csodisha.com/guides/ugc-net-december-2026-schedule-nta-guidelines'));
assert.ok(!xml.includes('secret-unpublished-draft-job'), 'Never emits unpublished job drafts');
assert.ok(!xml.includes('draft-guide-should-not-appear'), 'Never emits unpublished guide drafts');

const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
assert.equal(lastmods.length, locs.length);
for (const lm of lastmods) {
  assert.match(lm, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, `Valid ISO 8601 <lastmod>: ${lm}`);
}

// 2. /robots.txt
const robotsRes = handleDynamicRobotsTxt();
assert.equal(robotsRes.status, 200);
assert.match(robotsRes.headers.get('Content-Type') || '', /text\/plain/i);
const robotsTxt = await robotsRes.text();
assert.ok(robotsTxt.includes('Sitemap: https://csodisha.com/sitemap.xml'));
assert.ok(robotsTxt.includes('Disallow: /admin/'));
assert.ok(robotsTxt.includes('Disallow: /api/admin/'));

// 3. IndexNow key verification endpoint
const key = getIndexNowKey({});
assert.equal(key, DEFAULT_INDEXNOW_KEY);
assert.equal(isIndexNowKeyPath(`/${key}.txt`, {}), true);
const keyRes = handleIndexNowKeyTxt({});
assert.equal(keyRes.status, 200);
assert.match(keyRes.headers.get('Content-Type') || '', /text\/plain/i);
assert.equal(await keyRes.text(), key);

// 4. POST /api/admin/seo/ping-indexnow RBAC protection
let authStatus = 200;
try {
  await requireRole(
    new Request('https://csodisha.com/api/admin/seo/ping-indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: ['https://csodisha.com/'] })
    }),
    { DB: mockDb },
    STAFF_ROLES
  );
} catch (err) {
  authStatus = err && err.status ? err.status : 500;
}
assert.ok(authStatus === 401 || authStatus === 403, `Expected 401/403 for unauthenticated ping-indexnow, got ${authStatus}`);

// 5. Router & Admin Studio wiring checks
const adminRouterSrc = fs.readFileSync('functions/api/admin/_router.js', 'utf8');
const jobsStudioSrc = fs.readFileSync('admin/jobs-publishing-studio.js', 'utf8');
const guidesStudioSrc = fs.readFileSync('admin/guides-publishing-studio.js', 'utf8');
assert.ok(adminRouterSrc.includes("id === 'ping-indexnow'"), 'Admin router wires POST /api/admin/seo/ping-indexnow');
assert.ok(jobsStudioSrc.includes('Sitemap & IndexNow Pinged'), 'Jobs Studio displays Sitemap & IndexNow Pinged toast');
assert.ok(guidesStudioSrc.includes('Sitemap & IndexNow Pinged'), 'Guides Studio displays Sitemap & IndexNow Pinged toast');

console.log('✅ v393 Dynamic XML Sitemap, robots.txt & IndexNow Auto-Ping test suite passed!');
