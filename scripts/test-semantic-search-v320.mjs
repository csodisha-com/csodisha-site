import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EMBEDDING_MODEL,
  SEMANTIC_NEURON_CAP,
  upsertSemanticVector,
  runSemanticSearch
} from '../functions/_lib/semantic-search.js';
import { onRequestPost as reindexPost } from '../functions/api/admin/semantic-reindex.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb({ seedNeurons = 0 } = {}) {
  const indexItems = [];
  const aiLogs = seedNeurons > 0
    ? [{ id: 'seed_n', actor_id: 'adm_1', target_module: 'job', provider: 'cloudflare_workers_ai', model: EMBEDDING_MODEL, estimated_neurons: seedNeurons, status: 'ok', created_at: new Date().toISOString() }]
    : [];
  const jobs = [
    { id: 'job_1', slug: 'odisha-police-si-2026', title_en: 'Odisha Police SI Recruitment 2026', title_or: 'ଓଡ଼ିଶା ପୋଲିସ SI ନିଯୁକ୍ତି ୨୦୨୬', summary_en: 'Sub-Inspector recruitment eligibility and physical test.', summary_or: 'ସବ୍-ଇନ୍ସପେକ୍ଟର ଯୋଗ୍ୟତା।', is_published: 1 }
  ];
  const schemes = [
    { id: 'sch_1', slug: 'subhadra-scholarship-odisha', title_en: 'Odisha Plus 2 Girls Scholarship', title_or: 'ଓଡ଼ିଶା +୨ ଛାତ୍ରୀ ବୃତ୍ତି', summary_en: 'Financial assistance for +2 girl students in Odisha.', summary_or: 'ଓଡ଼ିଶାର +୨ ଛାତ୍ରୀମାନଙ୍କ ପାଇଁ ବୃତ୍ତି।', is_published: 1 }
  ];

  const execSql = (sql, params = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^SELECT content_hash FROM semantic_index_items WHERE vector_id = \?/i.test(s)) {
      return { first: indexItems.find((i) => i.vector_id === params[0]) || null };
    }
    if (/^INSERT OR REPLACE INTO semantic_index_items/i.test(s)) {
      const [vector_id, entity_type, entity_id, title_en, title_or, url, content_hash, indexed_at] = params;
      const idx = indexItems.findIndex((i) => i.vector_id === vector_id);
      const row = { vector_id, entity_type, entity_id, title_en, title_or, url, content_hash, indexed_at };
      if (idx >= 0) indexItems[idx] = row;
      else indexItems.push(row);
      return { run: { success: true } };
    }
    if (/^SELECT COUNT\(\*\) AS cnt FROM semantic_index_items/i.test(s)) {
      return { first: { cnt: indexItems.length } };
    }
    if (/^SELECT COALESCE\(SUM\(estimated_neurons\), 0\) AS neurons_used/i.test(s)) {
      const dayStart = params[0];
      const okRows = aiLogs.filter((l) => l.created_at >= dayStart && l.status === 'ok');
      return { first: { neurons_used: okRows.reduce((a, b) => a + b.estimated_neurons, 0), total_calls: okRows.length } };
    }
    if (/^INSERT INTO ai_generation_logs/i.test(s)) {
      const [id, actor_id, target_module, model, estimated_neurons, created_at] = params;
      aiLogs.push({ id, actor_id, target_module, provider: 'cloudflare_workers_ai', model, estimated_neurons, status: 'ok', created_at });
      return { run: { success: true } };
    }
    if (/FROM job_articles WHERE id = \?/i.test(s)) {
      return { first: jobs.find((j) => j.id === params[0]) || null };
    }
    if (/FROM scheme_articles WHERE id = \?/i.test(s)) {
      return { first: schemes.find((x) => x.id === params[0]) || null };
    }
    if (/FROM job_articles\s+WHERE is_published = 1/i.test(s)) {
      const q = String(params[0] || '').replace(/%/g, '').toLowerCase();
      return { results: jobs.filter((j) => (j.title_en + j.title_or + j.summary_en).toLowerCase().includes(q)) };
    }
    if (/FROM scheme_articles\s+WHERE is_published = 1/i.test(s)) {
      const q = String(params[0] || '').replace(/%/g, '').toLowerCase();
      return { results: schemes.filter((x) => (x.title_en + x.title_or + x.summary_en).toLowerCase().includes(q)) };
    }
    return { first: null, results: [], run: { success: true } };
  };

  return {
    indexItems,
    aiLogs,
    jobs,
    schemes,
    prepare(sql) {
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async first() {
          return execSql(sql, bound).first;
        },
        async all() {
          return { results: execSql(sql, bound).results || [] };
        },
        async run() {
          return execSql(sql, bound).run;
        },
        _exec() {
          return execSql(sql, bound);
        }
      };
    },
    async batch(stmts) {
      return stmts.map((st) => st._exec());
    }
  };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`  PASS  ${name}`);
  passed += 1;
}

console.log('\n=== Smart Semantic Search ("Ask CSOdisha" v320) Verification ===\n');

await test('1. Vectorize query flow, content_hash deduplication & 0-neuron skip on unchanged content', async () => {
  const db = createMockDb();
  const vectors = new Map();
  let aiCalls = 0;
  const mockAi = {
    async run(model) {
      aiCalls += 1;
      assert.equal(model, EMBEDDING_MODEL);
      return { data: [new Array(1024).fill(0.1)] };
    }
  };
  const mockVectorize = {
    async upsert(items) {
      items.forEach((it) => vectors.set(it.id, it));
    },
    async query() {
      return {
        matches: Array.from(vectors.values()).map((v) => ({ id: v.id, score: 0.91, metadata: v.metadata }))
      };
    }
  };

  const env = { DB: db, AI: mockAi, VECTORIZE: mockVectorize };
  const idx1 = await upsertSemanticVector(env, 'scheme', db.schemes[0], 'adm_1');
  assert.equal(idx1.indexed, true);
  assert.equal(aiCalls, 1);

  // Repeat upsert of unchanged content: skipped at 0 neurons
  const idx2 = await upsertSemanticVector(env, 'scheme', db.schemes[0], 'adm_1');
  assert.equal(idx2.skipped, true);
  assert.equal(idx2.reason, 'unchanged');
  assert.equal(aiCalls, 1);

  const searchRes = await runSemanticSearch(env, { q: 'scholarship for +2 girls in Odisha', type: 'all' });
  assert.equal(searchRes.ok, true);
  assert.equal(searchRes.mode, 'semantic');
  assert.equal(searchRes.results.length, 1);
  assert.equal(searchRes.results[0].type, 'scheme');
});

await test('2. Automatic D1 keyword fallback when Vectorize is unbound or 9,000-neuron cap is reached', async () => {
  const db = createMockDb();
  // 2a. Vectorize unbound
  const resNoVec = await runSemanticSearch({ DB: db }, { q: 'Odisha Police', type: 'all' });
  assert.equal(resNoVec.ok, true);
  assert.equal(resNoVec.mode, 'keyword_fallback');
  assert.equal(resNoVec.results.length, 1);
  assert.equal(resNoVec.results[0].type, 'job');

  // 2b. Neuron cap reached (9,000)
  const dbCap = createMockDb({ seedNeurons: SEMANTIC_NEURON_CAP });
  const resCap = await runSemanticSearch({
    DB: dbCap,
    AI: { run: async () => { throw new Error('Should not call AI at cap'); } },
    VECTORIZE: { query: async () => { throw new Error('Should not call Vectorize at cap'); } }
  }, { q: 'Odisha Police', type: 'job' });
  assert.equal(resCap.ok, true);
  assert.equal(resCap.mode, 'keyword_fallback');
  assert.equal(resCap.results.length, 1);
});

await test('3. RBAC protection on /api/admin/semantic-reindex rejects unauthenticated calls with 401', async () => {
  const db = createMockDb();
  await assert.rejects(
    () => reindexPost({
      request: new Request('https://csodisha.com/api/admin/semantic-reindex', { method: 'POST' }),
      env: { DB: db }
    }),
    (err) => err && (err.status === 401 || err.statusCode === 401)
  );
  assert.ok(read('functions/api/admin/_router.js').includes("if (resource === 'semantic-reindex')"));
});

await test('4. Wrangler Vectorize binding, migration 0151, CSP compliance & v320 cache sync', async () => {
  const wrangler = JSON.parse(read('wrangler.json'));
  assert.ok(Array.isArray(wrangler.vectorize) && wrangler.vectorize[0].binding === 'VECTORIZE');
  assert.equal(wrangler.vectorize[0].index_name, 'csodisha-semantic-index');

  const mig = read('migrations/0151_semantic_search_v320.sql');
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS semantic_index_items'));

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v320');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v320';"));

  const js = read('assets/js/semantic-search.js');
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(js));
  for (const page of ['index.html', 'jobs/index.html', 'schemes/index.html', 'study-library/index.html', 'careers/index.html']) {
    assert.ok(read(page).includes('semantic-search.js'), `${page} must load semantic-search.js`);
  }
});

console.log(`\n=== Smart Semantic Search v320 Results: ${passed} passed, 0 failed ===\n`);
