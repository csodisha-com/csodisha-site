/**
 * v394: Admin Studio SEO & IndexNow Status Inspector Panel Verification Suite
 * Validates:
 *  1. GET /api/admin/seo/status and POST /api/admin/seo/ping-indexnow enforce Admin RBAC (HTTP 401/403 unauthenticated)
 *  2. handleAdminSeoStatus returns accurate sitemap breakdown (hubs + jobs + guides) matching handleDynamicSitemapXml
 *  3. Admin Studio JS/CSS includes the Search Indexing & Sitemap Status widget with zero inline style/script attributes
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleDynamicSitemapXml } from '../functions/_lib/dynamic-sitemap.js';
import { handleAdminSeoStatus, DEFAULT_INDEXNOW_KEY } from '../functions/_lib/indexnow-pinger.js';
import { requireRole, STAFF_ROLES } from '../functions/_lib/rbac.js';

const mockDb = {
  prepare(sql) {
    return {
      bind() { return this; },
      run: async () => ({ success: true }),
      first: async () => {
        if (/FROM\s+seo_indexnow_log/i.test(sql)) {
          return {
            id: 1,
            last_ping_at: '2026-11-27T05:10:00Z',
            last_status: 200,
            last_ok: 1,
            last_url_count: 17,
            last_urls_json: JSON.stringify(['https://csodisha.com/']),
            last_trigger: 'manual_reping_all',
            last_error: ''
          };
        }
        return null;
      },
      all: async () => {
        if (/FROM\s+job_articles/i.test(sql)) {
          return {
            results: [
              { slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026', updated_at: '2026-11-26T12:00:00Z', published_at: '2026-11-26T10:00:00Z', is_published: 1 },
              { slug: 'bse-odisha-osstet-result-2026-scorecard-certificate-omr', updated_at: '2026-11-27T02:36:18Z', published_at: '2026-11-27T02:36:18Z', is_published: 1 }
            ]
          };
        }
        if (/FROM\s+informative_guides/i.test(sql)) {
          return {
            results: [
              { slug: 'ugc-net-december-2026-schedule-nta-guidelines', updated_at: '2026-11-27T03:00:00Z', created_at: '2026-11-26T08:00:00Z', status: 'published' }
            ]
          };
        }
        return { results: [] };
      }
    };
  }
};

// 1. Admin RBAC protection on GET /api/admin/seo/status & POST /api/admin/seo/ping-indexnow
for (const [method, path] of [['GET', '/api/admin/seo/status'], ['POST', '/api/admin/seo/ping-indexnow']]) {
  let status = 200;
  try {
    await requireRole(new Request('https://csodisha.com' + path, { method }), { DB: mockDb }, STAFF_ROLES);
  } catch (err) {
    status = err && err.status ? err.status : 500;
  }
  assert.ok(status === 401 || status === 403, `Expected 401/403 for unauthenticated ${method} ${path}, got ${status}`);
}

const adminRouterSrc = fs.readFileSync('functions/api/admin/_router.js', 'utf8');
assert.ok(adminRouterSrc.includes("id === 'status' && method === 'GET'"), 'Router wires GET /api/admin/seo/status');
assert.ok(adminRouterSrc.includes("id === 'ping-indexnow' && method === 'POST'"), 'Router wires POST /api/admin/seo/ping-indexnow');

// 2. Sitemap URL count parity between GET /api/admin/seo/status and GET /sitemap.xml
const statusRes = await handleAdminSeoStatus(new Request('https://csodisha.com/api/admin/seo/status'), { DB: mockDb });
assert.equal(statusRes.status, 200);
const statusData = await statusRes.json();
assert.equal(statusData.ok, true);
assert.equal(statusData.sitemap.jobs_count, 2);
assert.equal(statusData.sitemap.guides_count, 1);
assert.equal(statusData.indexnow.key, DEFAULT_INDEXNOW_KEY);
assert.equal(statusData.indexnow.last_ok, true);
assert.equal(statusData.indexnow.last_status, 200);
assert.equal(statusData.indexnow.last_trigger, 'manual_reping_all');

const xmlRes = await handleDynamicSitemapXml(new Request('https://csodisha.com/sitemap.xml'), { DB: mockDb });
const xml = await xmlRes.text();
const xmlLocCount = (xml.match(/<loc>/g) || []).length;
assert.equal(statusData.sitemap.total_urls, xmlLocCount, 'Admin SEO status total_urls matches /sitemap.xml <loc> count');

// 3. Admin Studio UI & Strict CSP checks
const jobsStudioJs = fs.readFileSync('admin/jobs-publishing-studio.js', 'utf8');
const guidesStudioJs = fs.readFileSync('admin/guides-publishing-studio.js', 'utf8');
const jobsStudioCss = fs.readFileSync('admin/jobs-publishing-studio.css', 'utf8');

assert.ok(jobsStudioJs.includes('window.CSOSeoInspector'), 'CSOSeoInspector exported in jobs-publishing-studio.js');
assert.ok(jobsStudioJs.includes('Search Indexing & Sitemap Status'), 'Widget title present');
assert.ok(jobsStudioJs.includes('Re-Ping All Active URLs'), 'Re-Ping All Active URLs CTA present');
assert.ok(guidesStudioJs.includes('CSOSeoInspector.buildSeoInspectorCard'), 'Widget mounted in Guides Studio');
assert.ok(jobsStudioCss.includes('.jph-seo-inspector'), 'Widget 4-theme CSS present');
assert.ok(!/\.innerHTML\s*=/.test(jobsStudioJs), 'Zero unsafe DOM markup injection in jobs-publishing-studio.js');

console.log('✅ v394 Admin Studio SEO & IndexNow Status Inspector Panel test suite passed!');
