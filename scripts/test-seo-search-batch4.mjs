import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleSeoSearchDiscoveryBatch1Admin as H1 } from '../functions/_lib/seo-search-discovery-batch1.js';
import {
  ensureSeoSearchDiscoveryBatch4Schema,
  getFull16ModuleSeoOverview,
  handleSeoSearchDiscoveryBatch4Admin as H4,
  transliterateToAsciiSlug
} from '../functions/_lib/seo-search-discovery-batch4.js';
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
const call4 = (method, path, id, sub, extra, body) => H4(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall4 = async (...a) => (await call4(...a)).json();
const call1 = (method, path, id, sub, extra, body) => H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra);
const jcall1 = async (...a) => (await call1(...a)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/rich-snippets`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/link-graph/scan`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);

// 2. Idempotent schema, seeds & Full 16-Module Suite Overview
await ensureSeoSearchDiscoveryBatch4Schema(env.DB);
await ensureSeoSearchDiscoveryBatch4Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('seo_rich_snippet_snapshots'), 3);
assert.equal(await cnt('seo_internal_link_nodes'), 7);
assert.equal(await cnt('seo_slug_transliteration_rules'), 4);
assert.equal(await cnt('seo_search_intent_metrics'), 5);

const ov = await getFull16ModuleSeoOverview(env);
assert.equal(ov.suite_16.total_modules, 16);
assert.equal(ov.suite_16.active_modules, 16);
for (let i = 1; i <= 16; i++) {
  const k = String(i).padStart(2, '0');
  assert.equal(ov.modules[k].status, 'active', `Module ${k} should be active`);
}
assert.equal(ov.orphan_nodes_detected, 1);
assert.ok(ov.blended_search_ctr_pct > 10);

// 3. Module 13: 4-Platform Rich Snippet Simulator & CRUD + rollback
const simRes = await jcall4('POST', 'rich-snippets/simulate', 'rich-snippets', 'simulate', undefined, {
  target_url: 'https://csodisha.com/study-library/ugc-net/',
  title_en: 'NTA UGC NET 2026 Solved PYQs & Study Notes',
  description_en: 'Download free Paper 1 and Odia subject PYQs.',
  og_image_url: 'https://csodisha.com/assets/brand/cso-og-ugc.png',
  schema_badge_type: 'Quiz'
});
assert.ok(simRes.simulation.platforms.google_serp);
assert.ok(simRes.simulation.platforms.whatsapp);
assert.ok(simRes.simulation.platforms.telegram);
assert.ok(simRes.simulation.platforms.x_card);
assert.equal(simRes.simulation.og_card_readiness, 'optimal_ready');

const snpNew = (await jcall4('POST', 'rich-snippets', 'rich-snippets', undefined, undefined, {
  target_url: 'https://csodisha.com/study-library/ugc-net/',
  title_en: 'NTA UGC NET 2026 Solved PYQs',
  description_en: 'Paper 1 & Odia PYQs.',
  schema_badge_type: 'Quiz'
})).item;
await jcall4('PUT', `rich-snippets/${snpNew.id}`, 'rich-snippets', snpNew.id, undefined, { title_en: 'Updated UGC NET 2026 PYQs' });
const revs13 = await jcall1('GET', `revisions?module_code=13&entity_id=${snpNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs13.items[1].id });

// 4. Module 14: Internal Link Graph Scan & Orphan Node Hub Linking
const scanRes = await jcall4('POST', 'link-graph/scan', 'link-graph', 'scan', undefined, {});
assert.equal(scanRes.scanned_count, 7);
assert.equal(scanRes.orphan_count, 1);

const orphans = await jcall4('GET', 'link-graph?resolution_status=orphan_detected', 'link-graph');
assert.equal(orphans.items.length, 1);
const orphanNode = orphans.items[0];
const linked = (await jcall4('PATCH', `link-graph/${orphanNode.id}/link-hub`, 'link-graph', orphanNode.id, 'link-hub', { parent_hub: '/study-library/' })).item;
assert.equal(linked.is_orphan_node, 0);
assert.equal(linked.resolution_status, 'linked_to_hub');
assert.ok(linked.inbound_links_count >= 1);

const revs14 = await jcall1('GET', `revisions?module_code=14&entity_id=${orphanNode.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs14.items[0].id });

// 5. Module 15: Odia & Cyrillic Phonetic URL Slug Transliteration
const odiaSlug = transliterateToAsciiSlug('ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ ୨୦୨୬');
assert.ok(/^[a-z0-9-]+$/.test(odiaSlug));
assert.ok(odiaSlug.includes('2026'));

const trnOd = await jcall4('POST', 'slug-normalizer/transliterate', 'slug-normalizer', 'transliterate', undefined, {
  source_text: 'ଓଡ଼ିଶା ୨୦୨୬'
});
assert.equal(trnOd.script_family, 'odia_unicode');
assert.ok(trnOd.normalized_slug.includes('2026'));

const trnCyr = await jcall4('POST', 'slug-normalizer/transliterate', 'slug-normalizer', 'transliterate', undefined, {
  source_text: 'Одиша Образование 2026'
});
assert.equal(trnCyr.script_family, 'cyrillic_unicode');
assert.equal(trnCyr.normalized_slug, 'odisha-obrazovanie-2026');

const trnNew = (await jcall4('POST', 'slug-normalizer', 'slug-normalizer', undefined, undefined, {
  source_sample: 'କଟକ ଜିଲ୍ଲା ନିଯୁକ୍ତି ୨୦୨୬'
})).item;
await jcall4('PUT', `slug-normalizer/${trnNew.id}`, 'slug-normalizer', trnNew.id, undefined, { max_slug_length: 60 });
const revs15 = await jcall1('GET', `revisions?module_code=15&entity_id=${trnNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs15.items[1].id });

// 6. Module 16: Search Intent Analytics & Recording
const intList = await jcall4('GET', 'search-intent?intent_bucket=exam_syllabus_pyq', 'search-intent');
assert.ok(intList.items.length >= 2);
assert.ok(intList.bucket_summary.length >= 3);

const intNew = (await jcall4('POST', 'search-intent/record', 'search-intent', 'record', undefined, {
  query_cluster: 'OSSSC Forest Guard Syllabus 2026',
  intent_bucket: 'exam_syllabus_pyq',
  lang_script: 'mixed_bilingual',
  impressions_30d: 10000,
  search_clicks_30d: 1500,
  trend_direction: 'rising'
})).item;
assert.equal(intNew.ctr_pct, 1500);

console.log('✅ All SEO, Search & Discovery Batch 4 (13-16) & Full 16-Module Suite tests passed!');
