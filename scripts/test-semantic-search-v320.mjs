import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EMBEDDING_MODEL,
  ANSWER_PRIMARY_MODEL,
  SEMANTIC_NEURON_CAP,
  upsertSemanticVector,
  deleteSemanticVector,
  scheduleSemanticSync,
  cleanSectionPathsInText,
  runSemanticSearch
} from '../functions/_lib/semantic-search.js';
import { onRequestPost as reindexPost } from '../functions/api/admin/semantic-reindex.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb({ seedNeurons = 0 } = {}) {
  const indexItems = [];
  const answerCache = [];
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
    if (/^SELECT answer_en, answer_or, source_mode, created_at FROM semantic_answer_cache WHERE cache_key = \?/i.test(s)) {
      return { first: answerCache.find((c) => c.cache_key === params[0]) || null };
    }
    if (/^UPDATE semantic_answer_cache SET hits = hits \+ 1 WHERE cache_key = \?/i.test(s)) {
      const row = answerCache.find((c) => c.cache_key === params[0]);
      if (row) row.hits += 1;
      return { run: { success: true } };
    }
    if (/^INSERT OR REPLACE INTO semantic_answer_cache/i.test(s)) {
      const [cache_key, query_text, filter_type, answer_en, answer_or, source_mode, created_at] = params;
      const idx = answerCache.findIndex((c) => c.cache_key === cache_key);
      const row = { cache_key, query_text, filter_type, answer_en, answer_or, source_mode, hits: 1, created_at };
      if (idx >= 0) answerCache[idx] = row;
      else answerCache.push(row);
      return { run: { success: true } };
    }
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
    if (/^DELETE FROM semantic_index_items WHERE vector_id = \?/i.test(s)) {
      const idx = indexItems.findIndex((i) => i.vector_id === params[0]);
      if (idx >= 0) indexItems.splice(idx, 1);
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
      const [id, actor_id, target_module, provider, model, estimated_neurons, created_at] = params;
      aiLogs.push({ id, actor_id, target_module, provider, model, estimated_neurons, status: 'ok', created_at });
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
    answerCache,
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

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v368');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v368';"));
  assert.ok(read('migrations/0152_ask_ai_answer_cache_v321.sql').includes('CREATE TABLE IF NOT EXISTS semantic_answer_cache'));

  const js = read('assets/js/semantic-search.js');
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(js));
  for (const page of ['index.html', 'jobs/index.html', 'schemes/index.html', 'study-library/index.html', 'careers/index.html']) {
    assert.ok(read(page).includes('semantic-search.js'), `${page} must load semantic-search.js`);
  }
});

await test('5. v321 Hybrid RAG grounded answer, general-query fallback & 7-day D1 cache hit (0 neurons)', async () => {
  const db = createMockDb();
  let llmCalls = 0;
  const mockAi = {
    async run(model) {
      llmCalls += 1;
      assert.equal(model, ANSWER_PRIMARY_MODEL);
      return {
        response: JSON.stringify({
          answer_en: 'Odisha Police SI recruitment requires a bachelor degree. Verify official dates on the linked page.',
          answer_or: 'ଓଡ଼ିଶା ପୋଲିସ SI ନିଯୁକ୍ତି ପାଇଁ ସ୍ନାତକ ଯୋଗ୍ୟତା ଆବଶ୍ୟକ।'
        })
      };
    }
  };
  const env = { DB: db, AI: mockAi };

  // 5a. Grounded RAG answer when matching article exists
  const rGrounded = await runSemanticSearch(env, { q: 'Odisha Police', type: 'job', clientIp: '198.51.100.1' });
  assert.equal(rGrounded.ok, true);
  assert.equal(rGrounded.results.length, 1);
  assert.ok(rGrounded.ai_answer);
  assert.equal(rGrounded.ai_answer.grounded, true);
  assert.equal(rGrounded.ai_answer.cached, false);
  assert.equal(llmCalls, 1);

  // 5b. Repeat query served from semantic_answer_cache at 0 neurons
  const rCached = await runSemanticSearch(env, { q: 'Odisha Police', type: 'job', clientIp: '198.51.100.1' });
  assert.ok(rCached.ai_answer);
  assert.equal(rCached.ai_answer.cached, true);
  assert.equal(llmCalls, 1);

  // 5c. General Odisha guidance when no published article matches (results === [])
  const rGeneral = await runSemanticSearch(env, { q: 'How to prepare for OPSC OAS prelims', type: 'all', clientIp: '198.51.100.2' });
  assert.equal(rGeneral.results.length, 0);
  assert.ok(rGeneral.ai_answer);
  assert.equal(rGeneral.ai_answer.grounded, false);
  assert.equal(llmCalls, 2);

  // 5d. v322: Workers AI returning parsed object + plain text fallback + Gemini primary (0 neurons)
  const dbObj = createMockDb();
  const rObj = await runSemanticSearch({
    DB: dbObj,
    AI: {
      async run() {
        return { response: { answer_en: 'Object response works.', answer_or: 'ଅବଜେକ୍ଟ ଉତ୍ତର କାମ କରେ।' } };
      }
    }
  }, { q: 'OSSC CGL syllabus overview', type: 'all', clientIp: '198.51.100.3' });
  assert.equal(rObj.ai_answer.answer_en, 'Object response works.');

  const rPlain = await runSemanticSearch({
    DB: createMockDb(),
    AI: {
      async run() {
        return { response: 'Plain text fallback answer without JSON braces.' };
      }
    }
  }, { q: 'OSSSC PEO exam pattern', type: 'all', clientIp: '198.51.100.4' });
  assert.equal(rPlain.ai_answer.answer_en, 'Plain text fallback answer without JSON braces.');
  assert.ok(rPlain.ai_answer.answer_or.length > 0);

  // 5e. v324: OpenAI-compatible choices[0].message.content envelope unwrapping
  const rOpenAi = await runSemanticSearch({
    DB: createMockDb(),
    AI: {
      async run() {
        return {
          id: 'chatcmpl_123',
          choices: [{
            message: {
              role: 'assistant',
              content: JSON.stringify({
                answer_en: 'Unwrapped OpenAI envelope answer.',
                answer_or: 'ଓପନ୍ଏଆଇ ଏନଭେଲପ୍ ଉତ୍ତର।'
              })
            }
          }]
        };
      }
    }
  }, { q: 'OPSC OAS age limit', type: 'all', clientIp: '198.51.100.6' });
  assert.equal(rOpenAi.ai_answer.answer_en, 'Unwrapped OpenAI envelope answer.');
  assert.equal(rOpenAi.ai_answer.answer_or, 'ଓପନ୍ଏଆଇ ଏନଭେଲପ୍ ଉତ୍ତର।');

  // 5f. v327: Regex salvage for truncated JSON without leaking raw "answer_en": keys
  const rSalvage = await runSemanticSearch({
    DB: createMockDb(),
    AI: {
      async run() {
        return {
          response: '{"answer_en":"OPSC OAS age limit is 21 to 38 years.","answer_or":"ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ'
        };
      }
    }
  }, { q: 'OPSC OAS truncated test', type: 'all', clientIp: '198.51.100.7' });
  assert.equal(rSalvage.ai_answer.answer_en, 'OPSC OAS age limit is 21 to 38 years.');
  assert.ok(!rSalvage.ai_answer.answer_en.includes('"answer_en"'));

  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      assert.equal(init.headers['x-goog-api-key'], 'gm_key_v322');
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ answer_en: 'Gemini primary answer.', answer_or: 'ଜେମିନି ଉତ୍ତର।' }) }] } }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch');
  };
  try {
    const dbGem = createMockDb();
    const rGem = await runSemanticSearch({
      DB: dbGem,
      GEMINI_API_KEY: 'gm_key_v322'
    }, { q: 'What is Subhadra Yojana eligibility', type: 'all', clientIp: '198.51.100.5', debug: true });
    assert.equal(rGem.ai_answer.answer_en, 'Gemini primary answer.');
    assert.equal(dbGem.aiLogs[0].provider, 'google_gemini');
    assert.equal(dbGem.aiLogs[0].estimated_neurons, 0);
    assert.ok(rGem.debug_info && rGem.debug_info.gemini_status === 'http_200');
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('6. v331 Auto Vectorize sync on publish/update/archive/delete via ctx.waitUntil + current_affairs entity_type', async () => {
  const db = createMockDb();
  const vectors = new Map();
  const deletedIds = [];
  const waitPromises = [];
  const ctx = { waitUntil: (p) => waitPromises.push(p) };

  const env = {
    DB: db,
    AI: {
      async run() {
        return { data: [new Array(1024).fill(0.25)] };
      }
    },
    VECTORIZE: {
      async upsert(items) {
        items.forEach((it) => vectors.set(it.id, it));
      },
      async deleteByIds(ids) {
        ids.forEach((id) => {
          deletedIds.push(id);
          vectors.delete(id);
        });
      }
    }
  };

  // Upsert a Current Affairs item via scheduleSemanticSync + ctx.waitUntil
  scheduleSemanticSync(ctx, env, {
    action: 'upsert',
    type: 'current_affairs',
    row: {
      id: 'ca_2026_11',
      slug: 'odisha-budget-2026-highlights',
      title_en: 'Odisha State Budget 2026 Highlights',
      title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ବଜେଟ୍ 2026 ମୁଖ୍ୟ ଅଂଶ',
      summary_en: 'Key schemes and allocations for education and agriculture.',
      category: 'Odisha'
    },
    actorId: 'adm_1'
  });
  assert.equal(waitPromises.length, 1);
  await Promise.all(waitPromises);
  assert.ok(vectors.has('current_affairs:ca_2026_11'));
  assert.equal(vectors.get('current_affairs:ca_2026_11').metadata.entity_type, 'current_affairs');
  assert.equal(db.indexItems.length, 1);

  // Archive / delete removes the vector via deleteSemanticVector
  scheduleSemanticSync(ctx, env, {
    action: 'delete',
    type: 'current_affairs',
    id: 'ca_2026_11'
  });
  await Promise.all(waitPromises);
  assert.ok(deletedIds.includes('current_affairs:ca_2026_11'));
  assert.equal(vectors.has('current_affairs:ca_2026_11'), false);
  assert.equal(db.indexItems.length, 0);

  // Verify direct deleteSemanticVector export
  const delRes = await deleteSemanticVector(env, 'job', 'job_999');
  assert.equal(delRes.deleted, true);
  assert.equal(delRes.vector_id, 'job:job_999');

  // Verify automatic sync hooks are wired across all publish endpoints
  for (const relPath of [
    'functions/_lib/jobs-publishing-house.js',
    'functions/_lib/schemes-publishing-house.js',
    'functions/_lib/study-publishing-house.js',
    'functions/_lib/careers-portal.js',
    'functions/api/admin/current-affairs.js',
    'functions/api/admin/_posts.js',
    'functions/api/admin/_site.js'
  ]) {
    assert.ok(read(relPath).includes('scheduleSemanticSync'), `${relPath} must hook scheduleSemanticSync`);
  }

  // v336: Raw slash section paths cleaned into human-readable section names
  const cleaned = cleanSectionPathsInText('Check /jobs/, /schemes/, /study-library/, and /mock-tests/ for updates.');
  assert.equal(cleaned, 'Check Jobs, Government Schemes, Study Library, and CBT Mock Tests for updates.');
});

console.log(`\n=== Smart Semantic Search v320 + v331 Results: ${passed} passed, 0 failed ===\n`);
