import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleSeoSearchDiscoveryBatch1Admin as H1 } from '../functions/_lib/seo-search-discovery-batch1.js';
import {
  ensureSeoSearchDiscoveryBatch2Schema,
  getFull8ModuleSeoOverview,
  handlePublicSeoRobotsTxt,
  handleSeoSearchDiscoveryBatch2Admin as H2
} from '../functions/_lib/seo-search-discovery-batch2.js';
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
const call2 = (method, path, id, sub, extra, body) => H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall2 = async (...a) => (await call2(...a)).json();
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/redirects`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/redirects`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureSeoSearchDiscoveryBatch2Schema(env.DB);
await ensureSeoSearchDiscoveryBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('seo_redirects_canonicals'), 4);
assert.equal(await cnt('seo_robots_directives'), 8);
assert.equal(await cnt('seo_search_tokenizer_configs'), 3);
assert.equal(await cnt('seo_keyword_synonyms'), 7);

const ov = await getFull8ModuleSeoOverview(env.DB);
assert.equal(ov.active_redirects_canonicals, 4);
assert.equal(ov.active_robots_rules, 8);
assert.equal(ov.active_search_indexes, 3);
assert.equal(ov.active_synonym_clusters, 7);
assert.equal(ov.modules['05'].status, 'active');
assert.equal(ov.modules['08'].status, 'active');
assert.equal(ov.modules['09'].status, 'queued');

// 3. Module 05: Redirects CRUD, self-loop rejection, chain rejection & rollback
await rej(call2('POST', 'redirects', 'redirects', undefined, undefined, {
  rule_kind: 'redirect_301',
  source_path: '/same-path',
  target_url: 'https://csodisha.com/same-path/'
}), 400);

await rej(call2('POST', 'redirects', 'redirects', undefined, undefined, {
  rule_kind: 'redirect_301',
  source_path: '/another-old',
  target_url: '/jobs/opsc-oas-old'
}), 400);

const rdr = (await jcall2('POST', 'redirects', 'redirects', undefined, undefined, {
  rule_kind: 'redirect_301',
  source_path: '/old-osssc-peo',
  target_url: '/jobs-careers/osssc-peo-2026/',
  reason_note: 'Consolidate PEO URL'
})).item;
assert.equal(rdr.source_path, '/old-osssc-peo');
await jcall2('PATCH', `redirects/${rdr.id}/status`, 'redirects', rdr.id, 'status', { rule_status: 'paused' });
const revs05 = await jcall1('GET', `revisions?module_code=05&entity_id=${rdr.id}`, 'revisions');
assert.ok(revs05.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs05.items[0].id });

// 4. Module 06: Robots.txt safety-rule lock & public compilation
const robList = await jcall2('GET', 'robots', 'robots');
const lockedAdmin = robList.items.find(r => r.path_or_value === '/admin/');
assert.ok(lockedAdmin && lockedAdmin.is_locked_safety_rule === 1);
await rej(call2('DELETE', `robots/${lockedAdmin.id}`, 'robots', lockedAdmin.id), 409);
await rej(call2('PUT', `robots/${lockedAdmin.id}`, 'robots', lockedAdmin.id, undefined, { is_active: false }), 409);
await rej(call2('POST', 'robots', 'robots', undefined, undefined, {
  user_agent: '*',
  directive_type: 'Allow',
  path_or_value: '/admin/secret'
}), 422);

const robNew = (await jcall2('POST', 'robots', 'robots', undefined, undefined, {
  rule_order: 95,
  user_agent: 'Bingbot',
  directive_type: 'Allow',
  path_or_value: '/study-library/',
  policy_purpose: 'core_search_allow'
})).item;
await jcall2('PUT', `robots/${robNew.id}`, 'robots', robNew.id, undefined, { rule_order: 92 });
const revs06 = await jcall1('GET', `revisions?module_code=06&entity_id=${robNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs06.items[1].id });

const pubRob = await handlePublicSeoRobotsTxt(new Request('https://csodisha.com/api/seo/robots.txt'), env);
assert.equal(pubRob.status, 200);
assert.ok((pubRob.headers.get('Content-Type') || '').includes('text/plain'));
const pubRobTxt = await pubRob.text();
assert.ok(pubRobTxt.includes('Disallow: /admin/'));
assert.ok(pubRobTxt.includes('Disallow: /api/'));
assert.ok(pubRobTxt.includes('Sitemap: https://csodisha.com/sitemap-index.xml'));

// 5. Module 07: Bilingual Search Index & Odia Tokenizer
const tokRes = await jcall2('POST', 'tokenizer/test-tokenize', 'tokenizer', 'test-tokenize', undefined, {
  query: 'ଓଡ଼ିଶା ଚାକିରି OPSC OAS ଏବଂ ସୁଭଦ୍ରା ଯୋଜନା'
});
assert.equal(tokRes.unicode_normalization, 'NFC');
assert.ok(tokRes.tokens.includes('opsc'));
assert.ok(!tokRes.tokens.includes('ଏବଂ'));
assert.ok(tokRes.bridge_tokens.includes('odisha'));
assert.ok(tokRes.bridge_tokens.includes('jobs'));

const tokList = await jcall2('GET', 'tokenizer', 'tokenizer');
const firstTok = tokList.items[0];
await jcall2('PUT', `tokenizer/${firstTok.id}`, 'tokenizer', firstTok.id, undefined, { title_weight: 10 });
const revs07 = await jcall1('GET', `revisions?module_code=07&entity_id=${firstTok.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs07.items[0].id });

// 6. Module 08: Keyword Boosting & Synonyms (OCS, CGL, RI, ARI, Amin)
const expRes = await jcall2('POST', 'synonyms/expand-query', 'synonyms', 'expand-query', undefined, {
  query: 'ri ari amin pyq'
});
assert.ok(expRes.max_boost_factor >= 3.0);
assert.ok(expRes.expanded_terms.includes('Revenue Inspector'));
assert.ok(expRes.expanded_terms.includes('Assistant Revenue Inspector'));
assert.ok(expRes.expanded_terms.includes('OSSSC Amin'));

const synNew = (await jcall2('POST', 'synonyms', 'synonyms', undefined, undefined, {
  exam_or_domain: 'OSSTET/OTET',
  primary_term: 'OTET',
  synonyms: ['Odisha Teacher Eligibility Test', 'BSE Odisha OTET'],
  boost_factor: 2.8,
  pinned_target_url: '/study-library/otet/'
})).item;
assert.equal(synNew.boost_factor, 2.8);
await jcall2('PUT', `synonyms/${synNew.id}`, 'synonyms', synNew.id, undefined, { boost_factor: 3.1 });
const revs08 = await jcall1('GET', `revisions?module_code=08&entity_id=${synNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs08.items[1].id });

console.log('✅ All SEO, Search & Discovery Batch 2 (05-08) tests passed!');
