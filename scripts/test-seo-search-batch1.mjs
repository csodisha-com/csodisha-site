import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureSeoSearchDiscoveryBatch1Schema,
  handlePublicSeoFeedApi,
  handlePublicSeoMetaApi,
  handlePublicSeoSitemapApi,
  handleSeoSearchDiscoveryBatch1Admin as H,
  validateJsonLdSchema
} from '../functions/_lib/seo-search-discovery-batch1.js';
import { requireRole, verifyCsrf, STAFF_ROLES } from '../functions/_lib/rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
  `);
  return {
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const env = { DB: createMockDb() };
const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/seo';
const call = (method, path, id, sub, extra, body) => H(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall = async (...a) => (await call(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/meta`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/meta`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/schemas`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureSeoSearchDiscoveryBatch1Schema(env.DB);
await ensureSeoSearchDiscoveryBatch1Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('seo_meta_profiles'), 6);
assert.equal(await cnt('seo_jsonld_schemas'), 4);
assert.equal(await cnt('seo_xml_sitemaps'), 5);
assert.equal(await cnt('seo_syndication_feeds'), 4);

const ov = await jcall('GET', 'overview', 'overview');
assert.equal(ov.active_meta_profiles, 6);
assert.equal(ov.valid_jsonld_schemas, 4);
assert.equal(ov.active_syndication_feeds, 4);
assert.equal(ov.modules['01'].status, 'active');
assert.equal(ov.modules['04'].status, 'active');
assert.equal(ov.modules['05'].status, 'queued');

// 3. Module 01: Bilingual meta profile scoring, sanitization & rollback
const mNew = (await jcall('POST', 'meta', 'meta', undefined, undefined, {
  route_pattern: '/mock-tests/',
  portal_section: 'educational-tools',
  meta_title_en: '<script>x</script>CS Odisha OPSC & OSSC Free Mock Tests 2026',
  meta_title_or: 'CS ଓଡ଼ିଶା ମାଗଣା ମକ୍ ଟେଷ୍ଟ ୨୦୨୬',
  meta_description_en: 'Practice full-length OPSC OAS, OSSC CGL, OSSSC RI/ARI & UGC NET mock tests in English and Odia with instant analytics and answer keys.',
  meta_description_or: 'ଇଂରାଜୀ ଏବଂ ଓଡ଼ିଆରେ OPSC OAS, OSSC CGL ମକ୍ ଟେଷ୍ଟ ଅଭ୍ୟାସ କରନ୍ତୁ।',
  keywords_en: 'odisha mock tests, opsc practice'
})).item;
assert.equal(mNew.meta_title_en, 'CS Odisha OPSC & OSSC Free Mock Tests 2026');
assert.equal(mNew.seo_score, 100);
await jcall('PATCH', `meta/${mNew.id}/status`, 'meta', mNew.id, 'status', { status: 'draft' });
const revs01 = await jcall('GET', `revisions?module_code=01&entity_id=${mNew.id}`, 'revisions');
assert.ok(revs01.items.length >= 2);
await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs01.items[0].id });

// 4. Module 02: JSON-LD Schema.org validation & rollback
const valBad = validateJsonLdSchema({ schema_type: 'JobPosting', payload: '{"foo":"bar"}' });
assert.equal(valBad.valid, false);
const ldNew = (await jcall('POST', 'schemas', 'schemas', undefined, undefined, {
  schema_type: 'Quiz',
  target_route_pattern: '/mock-tests/',
  name_en: 'OPSC OAS Mock Quiz Schema',
  schema_payload: {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: '<script>bad()</script>OPSC OAS GS-1 Mock'
  }
})).item;
assert.equal(ldNew.schema_payload.name, 'OPSC OAS GS-1 Mock');
await jcall('PUT', `schemas/${ldNew.id}`, 'schemas', ldNew.id, undefined, { name_en: 'Updated Quiz Schema' });
const revs02 = await jcall('GET', `revisions?module_code=02&entity_id=${ldNew.id}`, 'revisions');
await jcall('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs02.items[1].id });

// 5. Module 03: XML Sitemap regeneration & valid XML output
const regen = await jcall('POST', 'sitemaps/regenerate', 'sitemaps', 'regenerate', undefined, {});
assert.equal(regen.ok, true);

const smIdxRes = await handlePublicSeoSitemapApi(new Request('https://csodisha.com/api/seo/sitemap/sitemap-index'), env, 'sitemap-index');
assert.equal(smIdxRes.status, 200);
assert.ok((smIdxRes.headers.get('Content-Type') || '').includes('application/xml'));
const smIdxXml = await smIdxRes.text();
assert.ok(smIdxXml.includes('<sitemapindex'));

const smStudyRes = await handlePublicSeoSitemapApi(new Request('https://csodisha.com/api/seo/sitemap/sitemap-study-library'), env, 'sitemap-study-library');
const smStudyXml = await smStudyRes.text();
assert.ok(smStudyXml.includes('<urlset'));
assert.ok(smStudyXml.includes('hreflang="or-IN"'));

// 6. Module 04: RSS 2.0, Atom 1.0, JSON Feed 1.1 & rollback
const rssRes = await handlePublicSeoFeedApi(new Request('https://csodisha.com/api/seo/feed/odisha-jobs-rss'), env, 'odisha-jobs-rss');
assert.equal(rssRes.status, 200);
assert.ok((rssRes.headers.get('Content-Type') || '').includes('application/rss+xml'));
assert.ok((await rssRes.text()).includes('<rss version="2.0">'));

const atomRes = await handlePublicSeoFeedApi(new Request('https://csodisha.com/api/seo/feed/odisha-schemes-atom'), env, 'odisha-schemes-atom');
assert.equal(atomRes.status, 200);
assert.ok((atomRes.headers.get('Content-Type') || '').includes('application/atom+xml'));
assert.ok((await atomRes.text()).includes('<feed xmlns="http://www.w3.org/2005/Atom">'));

const jfRes = await handlePublicSeoFeedApi(new Request('https://csodisha.com/api/seo/feed/study-library-updates'), env, 'study-library-updates');
assert.equal(jfRes.status, 200);
const jfBody = await jfRes.json();
assert.equal(jfBody.version, 'https://jsonfeed.org/version/1.1');

// 7. Public /api/seo/meta?route=/
const metaPub = await handlePublicSeoMetaApi(new Request('https://csodisha.com/api/seo/meta?route=/'), env);
assert.equal(metaPub.status, 200);
const metaPubBody = await metaPub.json();
assert.equal(metaPubBody.route, '/');
assert.ok(metaPubBody.meta.seo_score >= 90);
assert.ok(metaPubBody.jsonld_schemas.length >= 1);

console.log('✅ All SEO, Search & Discovery Batch 1 (01-04) tests passed!');
