import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleSeoSearchDiscoveryBatch1Admin as H1 } from '../functions/_lib/seo-search-discovery-batch1.js';
import {
  ensureSeoSearchDiscoveryBatch3Schema,
  getFull12ModuleSeoOverview,
  handlePublicSeoAutocompleteApi,
  handleSeoSearchDiscoveryBatch3Admin as H3
} from '../functions/_lib/seo-search-discovery-batch3.js';
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

const env = { DB: createMockDb(), INDEXNOW_KEY: 'super-secret-indexnow-key-1234' };
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
const call3 = (method, path, id, sub, extra, body) => H3(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall3 = async (...a) => (await call3(...a)).json();
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/autocomplete`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/indexnow/submit`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureSeoSearchDiscoveryBatch3Schema(env.DB);
await ensureSeoSearchDiscoveryBatch3Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('seo_autocomplete_rules'), 5);
assert.equal(await cnt('seo_zero_result_fallbacks'), 3);
assert.equal(await cnt('seo_indexnow_submissions'), 3);
assert.equal(await cnt('seo_edge_prerender_hints'), 4);

const ov = await getFull12ModuleSeoOverview(env.DB);
assert.equal(ov.active_autocomplete_rules, 5);
assert.equal(ov.active_zero_result_fallbacks, 3);
assert.equal(ov.indexnow_urls_pinged, 6);
assert.equal(ov.active_edge_prerender_hints, 4);
assert.equal(ov.modules['09'].status, 'active');
assert.equal(ov.modules['12'].status, 'active');
assert.equal(ov.modules['13'].status, 'queued');

// 3. Module 09: Autocomplete, Levenshtein typo matching, rollback & public API
const typoTest = await jcall3('POST', 'autocomplete/test-suggest', 'autocomplete', 'test-suggest', undefined, { query: 'subhdra' });
assert.ok(typoTest.suggestions.length >= 1);
assert.equal(typoTest.suggestions[0].trigger_prefix, 'subh');

const acNew = (await jcall3('POST', 'autocomplete', 'autocomplete', undefined, undefined, {
  trigger_prefix: 'otet',
  suggestion_label_en: 'OTET Odisha Teacher Eligibility Test 2026',
  target_url: '/study-library/otet/',
  portal_badge: 'Study Library',
  typo_variants: ['ottet', 'otett'],
  max_edit_distance: 1,
  popularity_score: 620
})).item;
await jcall3('PATCH', `autocomplete/${acNew.id}/status`, 'autocomplete', acNew.id, 'status', { is_active: false });
const revs09 = await jcall1('GET', `revisions?module_code=09&entity_id=${acNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs09.items[0].id });

const pubAc = await handlePublicSeoAutocompleteApi(new Request('https://csodisha.com/api/seo/autocomplete?q=opcs'), env);
assert.equal(pubAc.status, 200);
const pubAcBody = await pubAc.json();
assert.ok(pubAcBody.suggestions.some(s => s.trigger_prefix === 'opsc'));

const pubZrf = await handlePublicSeoAutocompleteApi(new Request('https://csodisha.com/api/seo/autocomplete?q=ri%20amin%20admit%20card'), env);
const pubZrfBody = await pubZrf.json();
assert.equal(pubZrfBody.suggestions.length, 0);
assert.ok(pubZrfBody.fallbacks.length >= 1);

// 4. Module 10: Zero-Result Fallbacks CRUD & rollback
const zrfNew = (await jcall3('POST', 'zero-fallbacks', 'zero-fallbacks', undefined, undefined, {
  unmatched_query_pattern: 'peo result 2026',
  fallback_strategy: 'curated_cards',
  fallback_title_en: 'OSSSC PEO & JA Results Hub',
  recommended_links: [{ label_en: 'OSSSC Results', label_or: 'OSSSC ଫଳାଫଳ', url: '/jobs-careers/' }]
})).item;
await jcall3('PUT', `zero-fallbacks/${zrfNew.id}`, 'zero-fallbacks', zrfNew.id, undefined, { fallback_strategy: 'related_exam_hub' });
const revs10 = await jcall1('GET', `revisions?module_code=10&entity_id=${zrfNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs10.items[1].id });

// 5. Module 11: IndexNow same-origin validation & masked key hint
await rej(call3('POST', 'indexnow/submit', 'indexnow', 'submit', undefined, {
  engine_target: 'indexnow_bing_yandex',
  urls: ['https://evil.example/phish']
}), 400);

const idxSub = (await jcall3('POST', 'indexnow/submit', 'indexnow', 'submit', undefined, {
  engine_target: 'indexnow_bing_yandex',
  action_type: 'URL_UPDATED',
  urls: ['https://csodisha.com/jobs-careers/opsc-ocs/', 'https://csodisha.com/schemes/subhadra-yojana/']
})).item;
assert.equal(idxSub.url_count, 2);
assert.ok(!idxSub.key_masked_hint.includes('super-secret'));
assert.ok(idxSub.key_masked_hint.includes('••••'));

// 6. Module 12: Edge Cache & Pre-Rendering Hints CRUD & rollback
const edNew = (await jcall3('POST', 'edge-hints', 'edge-hints', undefined, undefined, {
  route_pattern: '/mock-tests/',
  edge_cache_ttl_sec: 450,
  stale_while_revalidate_sec: 900,
  speculation_prerender_urls: ['/study-library/'],
  priority_tier: 'critical_lcp'
})).item;
await jcall3('PUT', `edge-hints/${edNew.id}`, 'edge-hints', edNew.id, undefined, { edge_cache_ttl_sec: 600 });
const revs12 = await jcall1('GET', `revisions?module_code=12&entity_id=${edNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs12.items[1].id });

console.log('✅ All SEO, Search & Discovery Batch 3 (09-12) tests passed!');
