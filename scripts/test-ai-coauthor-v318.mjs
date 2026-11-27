import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeAiHtml,
  generateAiCoAuthorDraft,
  generateAiEditorialImage,
  getDailyAiUsage,
  DAILY_FREE_NEURON_BUDGET,
  DAILY_QUOTA_EXHAUSTED_MESSAGE,
  estimateWorkersAiNeurons,
  GEMINI_PRO_FIRST_MODELS,
  WORKERS_AI_PRO_MODELS,
  GEMINI_IMAGE_MODELS,
  WORKERS_AI_IMAGE_MODEL,
  GEMINI_LONG_MAX_OUTPUT_TOKENS,
  WORKERS_AI_70B_MAX_TOKENS,
  MARKDOWN_CHUNK_CHAR_LIMIT,
  BODY_EN_VERBATIM_LOCK_MIN_CHARS,
  parseOrRepairAiJson,
  buildDeterministicGuideMetadata,
  splitMarkdownByH2Sections,
  normalizeTranslatedMarkdownPipes,
  VALID_AI_MODES,
  callOpenAiCompatibleProvider,
  callAnthropicMessagesProvider,
  discoverLiveOpenAiChatModel,
  GROQ_DEFAULT_MODEL,
  GROQ_FALLBACK_MODELS,
  listConfiguredEnvProviders,
  maskApiKey,
  validateProviderBaseUrl,
  testAiProviderConnection
} from '../functions/_lib/ai-coauthor.js';
import { onRequestPost as aiCoauthorPost, handleAdminAiGenerateImage } from '../functions/api/admin/ai-coauthor.js';
import { handleMedia } from '../functions/api/media/_serve.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb(seedNeurons = 0, seedProviders = []) {
  const logs = [];
  const providers = Array.isArray(seedProviders) ? seedProviders.map((p) => ({ ...p })) : [];
  if (seedNeurons > 0) {
    logs.push({
      id: 'seed_1',
      actor_id: 'adm_1',
      target_module: 'job',
      provider: 'cloudflare_workers_ai',
      model: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      estimated_neurons: seedNeurons,
      status: 'ok',
      created_at: new Date().toISOString()
    });
  }

  const execSql = (sql, params = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^SELECT COALESCE\(SUM\(estimated_neurons\), 0\) AS neurons_used/i.test(s)) {
      const dayStart = params[0];
      const okRows = logs.filter((l) => l.created_at >= dayStart && l.status === 'ok');
      return {
        first: {
          neurons_used: okRows.reduce((sum, r) => sum + r.estimated_neurons, 0),
          total_calls: okRows.length
        }
      };
    }
    if (/^SELECT id, label, provider_type, base_url, model_id, api_key, enabled, priority FROM ai_custom_providers/i.test(s)) {
      const includeDisabledId = String(params[0] || '');
      const matched = providers
        .filter((p) => Number(p.enabled) === 1 || (includeDisabledId && String(p.id) === includeDisabledId))
        .sort((a, b) => Number(a.priority || 10) - Number(b.priority || 10));
      return { all: { results: matched } };
    }
    if (/^INSERT INTO ai_generation_logs/i.test(s)) {
      const [id, actor_id, target_module, provider, model, estimated_neurons, status, created_at] = params;
      logs.push({ id, actor_id, target_module, provider, model, estimated_neurons, status, created_at });
      return { run: { success: true } };
    }
    return { first: null, all: { results: [] }, run: { success: true } };
  };

  return {
    logs,
    providers,
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
          return execSql(sql, bound).all || { results: [] };
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

console.log('\n=== Free-Tier AI Co-Author (v318) Verification ===\n');

await test('1. RBAC protection: unauthenticated /api/admin/ai-coauthor rejected with 401', async () => {
  const db = createMockDb();
  await assert.rejects(
    () => aiCoauthorPost({
      request: new Request('https://csodisha.com/api/admin/ai-coauthor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'job', input: 'OPSC OAS Notification 2026' })
      }),
      env: { DB: db }
    }),
    (err) => err && (err.status === 401 || err.statusCode === 401)
  );
  assert.ok(read('functions/api/admin/_router.js').includes("if (resource === 'ai-coauthor')"));
});

await test('2. HTML sanitizer strips scripts, style="", on* handlers & javascript: URIs', async () => {
  const dirty = '<table style="color:red" onclick="alert(1)"><thead><tr><th>Age</th></tr></thead><tbody><tr><td>21-38<script>alert(1)</script><iframe src="javascript:alert(1)"></iframe></td></tr></tbody></table>';
  const clean = sanitizeAiHtml(dirty);
  assert.ok(!clean.includes('<script') && !clean.includes('<iframe'));
  assert.ok(!clean.includes('onclick') && !clean.includes('style=') && !clean.includes('javascript:'));
  assert.ok(clean.includes('<table><thead><tr><th>Age</th></tr></thead><tbody><tr><td>21-38</td></tr></tbody></table>'));
});

await test('3. Free-tier fallback (Gemini 429 -> Workers AI) & all 4 modes (job, scheme, mcq, career)', async () => {
  const db = createMockDb();
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      return new Response('Rate limited', { status: 429 });
    }
    throw new Error('Unexpected fetch');
  };

  const mockAi = {
    async run(_model, { messages }) {
      const userPrompt = messages[1].content;
      if (userPrompt.includes('"questions"')) {
        return {
          response: JSON.stringify({
            title_en: 'Odisha Geography Mock 01',
            title_or: 'ଓଡ଼ିଶା ଭୂଗୋଳ ମକ୍ ୦୧',
            slug: 'odisha-geography-mock-01',
            summary_en: 'Practice Odisha rivers and districts.',
            summary_or: 'ଓଡ଼ିଶାର ନଦୀ ଏବଂ ଜିଲ୍ଲା ଅଭ୍ୟାସ କରନ୍ତୁ।',
            questions: [
              {
                question_en: 'Which is the longest river in Odisha?',
                question_or: 'ଓଡ଼ିଶାର ଦୀର୍ଘତମ ନଦୀ କେଉଁଟି?',
                options_en: ['Mahanadi', 'Brahmani', 'Baitarani', 'Rushikulya'],
                options_or: ['ମହାନଦୀ', 'ବ୍ରାହ୍ମଣୀ', 'ବୈତରଣୀ', 'ଋଷିକୁଲ୍ୟା'],
                correct_index: 0,
                explanation_en: 'Mahanadi is the largest river in Odisha.',
                explanation_or: 'ମହାନଦୀ ଓଡ଼ିଶାର ସବୁଠାରୁ ବଡ଼ ନଦୀ।'
              }
            ]
          })
        };
      }
      return {
        response: JSON.stringify({
          title_en: 'OPSC OAS Recruitment 2026',
          title_or: 'OPSC OAS ନିଯୁକ୍ତି ୨୦୨୬',
          slug: 'opsc-oas-recruitment-2026',
          summary_en: 'Official recruitment summary in English.',
          summary_or: 'ଓଡ଼ିଆରେ ସରକାରୀ ନିଯୁକ୍ତି ସାରାଂଶ।',
          eligibility_table_html: '<table style="bad:1"><thead><tr><th>Post</th><th>Vacancy</th></tr></thead><tbody><tr><td>OAS</td><td>150<script>x()</script></td></tr></tbody></table>'
        })
      };
    }
  };

  try {
    const env = { DB: db, AI: mockAi, GEMINI_API_KEY: 'gm_free_test' };
    for (const mode of ['job', 'scheme', 'career']) {
      const out = await generateAiCoAuthorDraft(env, {
        mode,
        input: 'OPSC OAS Recruitment 2026 for 150 posts across Odisha',
        actorId: 'adm_1'
      });
      assert.equal(out.ok, true);
      assert.equal(out.provider, 'cloudflare_workers_ai');
      assert.ok(out.data.title_en && out.data.title_or && out.data.slug);
      assert.ok(!out.data.eligibility_table_html.includes('<script') && !out.data.eligibility_table_html.includes('style='));
    }

    const mcqOut = await generateAiCoAuthorDraft(env, {
      mode: 'mcq',
      input: 'Odisha Geography & Rivers for OPSC OAS',
      actorId: 'adm_1'
    });
    assert.equal(mcqOut.ok, true);
    assert.equal(mcqOut.data.questions.length, 1);
    assert.equal(mcqOut.data.questions[0].options_en.length, 4);
    assert.equal(db.logs.length, 4);

    const usage = await getDailyAiUsage(env);
    assert.ok(usage.neurons_used > 0 && usage.total_calls === 4);
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('4. Daily free-tier neuron budget cap blocks excess calls with 429', async () => {
  const db = createMockDb(DAILY_FREE_NEURON_BUDGET);
  await assert.rejects(
    () => generateAiCoAuthorDraft({ DB: db, AI: { run: async () => ({}) } }, {
      mode: 'job',
      input: 'OSSC CGL Notification 2026',
      actorId: 'adm_1'
    }),
    (err) => err && err.status === 429
  );
});

await test('5. Wrangler AI binding, migration 0149, CSP compliance & v318 cache sync', async () => {
  const wrangler = JSON.parse(read('wrangler.json'));
  assert.equal(wrangler.ai && wrangler.ai.binding, 'AI');

  const mig = read('migrations/0149_ai_coauthor_v318.sql');
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS ai_generation_logs'));

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v397');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v397';"));

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('window.CSOAiCoAuthor'));
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(adminJs));

  const qcJs = read('admin/quick-create-studio.js');
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(qcJs), 'quick-create-studio.js must be strictly CSP-safe');
  for (const route of ['jobs/new', 'careers/new', 'current-affairs/new', 'mock-tests/new', 'syllabus', 'banner', 'nav-manager']) {
    assert.ok(qcJs.includes(route), `quick-create-studio.js must handle ${route}`);
  }
});

await test('6. v331 Odia quick translation (single + batch) & AI Title/Slug/Tag Suggester (Gemini + Workers AI fallback)', async () => {
  const db = createMockDb();
  const origFetch = globalThis.fetch;
  let geminiCalls = 0;

  globalThis.fetch = async (url, init) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      geminiCalls += 1;
      const bodyStr = String(init && init.body || '');
      if (bodyStr.includes('titles_en')) {
        return new Response(JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  titles_en: [
                    'UGC NET December 2026 Exam City Intimation Slip Released',
                    'NTA UGC NET Dec 2026 City Intimation & Admit Card Schedule',
                    'UGC NET 2026 Exam City Check Link Live on ugcnet.nta.ac.in'
                  ],
                  titles_or: [
                    'UGC NET ଡିସେମ୍ବର 2026 ପରୀକ୍ଷା ସହର ସୂଚନା ସ୍ଲିପ୍ ପ୍ରକାଶିତ',
                    'NTA UGC NET ଡିସେମ୍ବର 2026 ସହର ସୂଚନା ଏବଂ ଆଡମିଟ୍ କାର୍ଡ ସୂଚୀ',
                    'UGC NET 2026 ପରୀକ୍ଷା ସହର ଯାଞ୍ଚ ଲିଙ୍କ୍ ugcnet.nta.ac.in ରେ ଉପଲବ୍ଧ'
                  ],
                  slug: 'ugc-net-december-2026-exam-city-intimation',
                  tags: ['UGC NET', 'Exam City', 'Admit Card', 'NTA 2026', 'Higher Education']
                })
              }]
            }
          }]
        }), { status: 200 });
      }
      if (bodyStr.includes('translations')) {
        return new Response(JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  translations: {
                    title_or: 'OPSC OAS 2026 ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି',
                    summary_or: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା ପରୀକ୍ଷା ପାଇଁ ଅନଲାଇନ୍ ଆବେଦନ https://opsc.gov.in ରେ ଉପଲବ୍ଧ।'
                  }
                })
              }]
            }
          }]
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                translated_or: 'OSSSC PEO ଏବଂ Junior Assistant 2026 ନିଯୁକ୍ତି — ଶେଷ ତାରିଖ 15-12-2026 (https://osssc.gov.in)'
              })
            }]
          }
        }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch');
  };

  try {
    const env = { DB: db, GEMINI_API_KEY: 'gm_v331_test' };

    const trOne = await generateAiCoAuthorDraft(env, {
      mode: 'translate_odia',
      input: 'OSSSC PEO and Junior Assistant 2026 Recruitment — Last Date 15-12-2026 (https://osssc.gov.in)',
      kind: 'title',
      actorId: 'adm_1'
    });
    assert.equal(trOne.ok, true);
    assert.equal(trOne.provider, 'gemini_free');
    assert.ok(trOne.data.translated_or.includes('OSSSC'));
    assert.ok(trOne.data.translated_or.includes('https://osssc.gov.in'));

    const trBatch = await generateAiCoAuthorDraft(env, {
      mode: 'translate_fields',
      fields: {
        title_or: 'OPSC OAS 2026 Recruitment Notification',
        summary_or: 'Apply online for Odisha Administrative Service at https://opsc.gov.in.'
      },
      actorId: 'adm_1'
    });
    assert.equal(trBatch.ok, true);
    assert.ok(trBatch.data.translations.title_or.includes('OPSC OAS'));
    assert.ok(trBatch.data.translations.summary_or.includes('https://opsc.gov.in'));

    const meta = await generateAiCoAuthorDraft(env, {
      mode: 'suggest_meta',
      input: 'UGC NET December 2026 exam city intimation slip released by NTA',
      kind: 'job alert',
      actorId: 'adm_1'
    });
    assert.equal(meta.ok, true);
    assert.equal(meta.data.titles_en.length, 3);
    assert.equal(meta.data.titles_or.length, 3);
    assert.equal(meta.data.slug, 'ugc-net-december-2026-exam-city-intimation');
    assert.ok(meta.data.tags.length >= 5 && meta.data.tags.length <= 8);
    assert.equal(geminiCalls, 3);
  } finally {
    globalThis.fetch = origFetch;
  }

  // Workers AI fallback when Gemini returns 429 for translate_odia
  const origFetch2 = globalThis.fetch;
  globalThis.fetch = async () => new Response('Quota exceeded', { status: 429 });
  try {
    const fallbackOut = await generateAiCoAuthorDraft({
      DB: db,
      GEMINI_API_KEY: 'gm_429_test',
      AI: {
        async run() {
          return {
            response: JSON.stringify({
              translated_or: 'OSSC CGL 2026 ପରୀକ୍ଷା ସୂଚୀ ପ୍ରକାଶିତ।'
            })
          };
        }
      }
    }, {
      mode: 'translate_odia',
      input: 'OSSC CGL 2026 exam schedule published.',
      actorId: 'adm_1'
    });
    assert.equal(fallbackOut.ok, true);
    assert.equal(fallbackOut.provider, 'cloudflare_workers_ai');
    assert.ok(fallbackOut.data.translated_or.includes('OSSC CGL'));
  } finally {
    globalThis.fetch = origFetch2;
  }
});

await test('7. v358/v365 Active Gemini 2.5 Flash REST cascade + low-neuron Workers AI JSON fallback, auto_fix_fill PDF-to-Article schema & POST /api/admin/ai/generate-image R2 storage', async () => {
  assert.ok(VALID_AI_MODES.has('auto_fix_fill'), 'VALID_AI_MODES must include auto_fix_fill');
  const expectedGemini = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];
  assert.deepEqual(GEMINI_PRO_FIRST_MODELS, expectedGemini, 'Gemini cascade must use active 2026 Gemini 2.5 Flash/Lite models only');
  assert.equal(WORKERS_AI_PRO_MODELS[0], '@cf/google/gemma-4-26b-a4b-it', 'Workers AI must prioritize ultra-efficient Gemma 4 26B first');
  assert.equal(WORKERS_AI_PRO_MODELS[1], '@cf/meta/llama-3.1-8b-instruct-fp8-fast', 'Workers AI must prioritize Llama 3.1 8B second');
  assert.equal(WORKERS_AI_PRO_MODELS[2], '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Workers AI must keep Llama 3.3 70B after low-neuron models');
  assert.ok(estimateWorkersAiNeurons('@cf/google/gemma-4-26b-a4b-it', 12000, 12000) < 250, 'Gemma 4 26B full guide must consume < 250 neurons');
  assert.ok(estimateWorkersAiNeurons('@cf/meta/llama-3.1-8b-instruct-fp8-fast', 12000, 12000) < 250, 'Llama 3.1 8B full guide must consume < 250 neurons');
  assert.deepEqual(GEMINI_IMAGE_MODELS, ['imagen-3.0-generate-002', 'gemini-2.5-flash-image']);
  assert.equal(WORKERS_AI_IMAGE_MODEL, '@cf/black-forest-labs/flux-1-schnell');

  // A. Verify v351/v358 high token limits (16384 Gemini / 8192 Workers AI Gemma 4 26B), JSON response_format & two-pass full Odia translation
  assert.equal(GEMINI_LONG_MAX_OUTPUT_TOKENS, 16384, 'Gemini maxOutputTokens must be 16384 for long-form guides');
  assert.equal(WORKERS_AI_70B_MAX_TOKENS, 8192, 'Workers AI long-form max_tokens must be 8192');

  const db = createMockDb();
  const attemptedGemini = [];
  const geminiRequestBodies = [];
  const attemptedWorkers = [];
  const workersCallArgs = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const m = u.match(/\/models\/([^:?]+):generateContent/);
    if (m) {
      attemptedGemini.push(m[1]);
      geminiRequestBodies.push(JSON.parse(String(init && init.body || '{}')));
      return new Response('Quota exceeded', { status: 429 });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    const mockAiCascade = {
      async run(model, args) {
        attemptedWorkers.push(model);
        workersCallArgs.push({ model, max_tokens: args && args.max_tokens, response_format: args && args.response_format });
        if (model === '@cf/google/gemma-4-26b-a4b-it') {
          throw new Error('Temporary Gemma 4 timeout');
        }
        const userMsg = (args && args.messages && args.messages[1] && args.messages[1].content) || '';
        if (userMsg.includes('"translations"')) {
          return {
            response: JSON.stringify({
              translations: {
                body_or: '## ସଂକ୍ଷିପ୍ତ ବିବରଣୀ\nOPSC OAS 2026 ସମ୍ପୂର୍ଣ୍ଣ ନିଯୁକ୍ତି ବିବରଣୀ।\n\n## ପଦବୀ ଓ ବେତନ ତାଲିକା\n| ପଦବୀ | ଶୂନ୍ୟପଦ |\n| --- | --- |\n| OAS | 120 |',
                title_or: 'OPSC OAS 2026 ନିଯୁକ୍ତି ଏବଂ ପ୍ରିଲିମ୍ସ ପରୀକ୍ଷା ରଣନୀତି',
                summary_or: 'OPSC OAS 2026 ପଦବୀ, ଯୋଗ୍ୟତା, ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ତାରିଖ ଏବଂ ପରୀକ୍ଷା ରୋଡମ୍ୟାପ୍।',
                pdf_title_or: 'OPSC OAS 2026 ସରକାରୀ ବିଜ୍ଞପ୍ତି PDF',
                cover_caption_or: 'OPSC OAS 2026 ପରୀକ୍ଷା ମାର୍ଗଦର୍ଶିକା',
                tk_0: 'ଶେଷ ତାରିଖ ପୂର୍ବରୁ opsc.gov.in ରେ ଅନଲାଇନ୍ ଆବେଦନ କରନ୍ତୁ।',
                tk_1: 'ପ୍ରିଲିମ୍ସରେ GS Paper I ଏବଂ CSAT ଅନ୍ତର୍ଭୁକ୍ତ।',
                lnk_0: 'OPSC ସରକାରୀ ପୋର୍ଟାଲ୍',
                lnk_1: 'OSHEC ସିଲାବସ୍ ପୋର୍ଟାଲ୍'
              }
            })
          };
        }
        return {
          response: JSON.stringify({
            category: 'exam-strategy',
            scope: 'Odisha',
            is_exam: true,
            read_minutes: 7,
            title_en: 'OPSC OAS 2026 Recruitment & Prelims Exam Strategy Guide',
            title_or: 'OPSC OAS 2026 ନିଯୁକ୍ତି ଏବଂ ପ୍ରିଲିମ୍ସ ପରୀକ୍ଷା ରଣନୀତି',
            slug: 'opsc-oas-2026-recruitment-prelims-strategy',
            summary_en: 'Complete breakdown of OPSC OAS 2026 vacancies, eligibility, important dates, and exam roadmap.',
            summary_or: 'OPSC OAS 2026 ପଦବୀ, ଯୋଗ୍ୟତା, ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ତାରିଖ ଏବଂ ପରୀକ୍ଷା ରୋଡମ୍ୟାପ୍।',
            tags: ['OPSC', 'OAS 2026', 'Odisha Civil Services', 'Exam Strategy', 'Prelims'],
            takeaways_en: ['Apply online exclusively on opsc.gov.in before closing date.', 'Prelims consists of GS Paper I and CSAT.'],
            takeaways_or: ['ଶେଷ ତାରିଖ ପୂର୍ବରୁ opsc.gov.in ରେ ଅନଲାଇନ୍ ଆବେଦନ କରନ୍ତୁ।'],
            body_en: '## Overview\nOPSC OAS 2026 recruitment details extracted from official PDF.\n\n## Key Vacancy Table\n| Post | Vacancies |\n| --- | --- |\n| OAS | 120 |',
            body_or: '',
            pdf_title_en: 'OPSC OAS 2026 Official Notification PDF',
            pdf_title_or: 'OPSC OAS 2026 ସରକାରୀ ବିଜ୍ଞପ୍ତି PDF',
            official_links: [{ label_en: 'OPSC Official Portal', label_or: 'OPSC ପୋର୍ଟାଲ୍', url: 'https://www.opsc.gov.in/', is_official: true }]
          })
        };
      }
    };

    const autoRes = await generateAiCoAuthorDraft({ DB: db, AI: mockAiCascade, GEMINI_API_KEY: 'gm_pro_test' }, {
      mode: 'auto_fix_fill',
      depth: 'comprehensive',
      pdf_filename: 'opsc-oas-2026-advt.pdf',
      pdf_text: 'Odisha Public Service Commission Advt No 09 of 2026. Total 120 OAS vacancies. Apply online at https://www.opsc.gov.in/ and check syllabus at https://oshec.odisha.gov.in/syllabus.pdf.',
      actorId: 'adm_1'
    });

    assert.deepEqual(attemptedGemini.slice(0, 2), expectedGemini, 'Pass 1 auto_fix_fill must cascade across active Gemini 2.5 Flash/Lite models');
    assert.deepEqual(attemptedGemini.slice(2, 4), expectedGemini, 'Pass 2 translate_fields must also cascade across active Gemini 2.5 Flash/Lite models');
    assert.equal(geminiRequestBodies[0].generationConfig.maxOutputTokens, 16384, 'Gemini Pass 1 must set maxOutputTokens: 16384');
    assert.equal(geminiRequestBodies[0].generationConfig.responseMimeType, 'application/json', 'JSON modes must set responseMimeType: application/json');
    assert.equal(geminiRequestBodies[2].generationConfig.maxOutputTokens, 16384, 'Gemini Pass 2 must set maxOutputTokens: 16384');
    const pass1PromptText = geminiRequestBodies[0].contents[0].parts[0].text;
    assert.ok(pass1PromptText.includes('NEVER summarize, shorten, or omit details') && pass1PromptText.includes('Preserve 100% of every post name'), 'Pass 1 prompt must include strict anti-summarization directive');
    assert.equal(workersCallArgs[0].model, '@cf/google/gemma-4-26b-a4b-it');
    assert.equal(workersCallArgs[0].max_tokens, 8192, 'Workers AI Gemma 4 26B fallback must set max_tokens: 8192');
    assert.deepEqual(workersCallArgs[0].response_format, { type: 'json_object' }, 'Workers AI JSON mode must request response_format: { type: "json_object" }');
    assert.equal(workersCallArgs[1].model, '@cf/meta/llama-3.1-8b-instruct-fp8-fast');
    assert.equal(autoRes.ok, true);
    assert.equal(autoRes.two_pass_translation, true, 'auto_fix_fill must execute dedicated Pass 2 full Odia translation');
    assert.ok(autoRes.estimated_neurons < 250, `Low-neuron Workers AI guide must stay < 250 neurons (got ${autoRes.estimated_neurons})`);
    assert.equal(autoRes.data.category, 'exam-strategy');
    assert.equal(autoRes.data.scope, 'Odisha');
    assert.equal(autoRes.data.slug, 'opsc-oas-2026-recruitment-prelims-strategy');
    assert.ok(autoRes.data.body_or.includes('| ପଦବୀ | ଶୂନ୍ୟପଦ |'), 'Pass 2 must populate full Odia Markdown tables matching body_en');
    assert.equal(autoRes.data.takeaways_or.length, 2, 'takeaways_or must align with takeaways_en');
    assert.ok(autoRes.data.official_links.some((l) => l.url.includes('opsc.gov.in')), 'Must extract opsc.gov.in official link');
    assert.ok(autoRes.data.official_links.some((l) => l.url.includes('oshec.odisha.gov.in')), 'Must deterministically extract additional .gov.in PDF links');

    // Verify friendly IST reset message when BOTH Gemini & Workers AI exhaust daily quotas
    await assert.rejects(
      () => generateAiCoAuthorDraft({
        DB: db,
        GEMINI_API_KEY: 'gm_exhausted',
        AI: {
          async run() {
            const err = new Error('Daily free neurons quota reached (429)');
            err.status = 429;
            throw err;
          }
        }
      }, { mode: 'guide', input: 'OPSC OAS Notification 2026', actorId: 'adm_1' }),
      (err) => err && err.status === 429 && err.message === DAILY_QUOTA_EXHAUSTED_MESSAGE
    );
  } finally {
    globalThis.fetch = origFetch;
  }

  // B. Verify Gemini-First Image Generation -> Workers AI FLUX -> R2 cso-media storage & /api/media/_serve.js delivery
  const r2Store = new Map();
  const mockMediaR2 = {
    async put(key, val, opts) { r2Store.set(key, { bytes: val, opts }); },
    async get(key) {
      const hit = r2Store.get(key);
      if (!hit) return null;
      return { body: hit.bytes, size: hit.bytes.byteLength, httpEtag: 'etag123' };
    }
  };
  const fakeJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const fakeJpegB64 = Buffer.from(fakeJpegBytes).toString('base64');

  const imgModelsTried = [];
  const origFetchImg = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('imagen-3.0-generate-002:predict')) {
      imgModelsTried.push('imagen-3.0-generate-002');
      return new Response('Quota', { status: 429 });
    }
    if (u.includes('gemini-2.5-flash-image:generateContent')) {
      imgModelsTried.push('gemini-2.5-flash-image');
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ inlineData: { mimeType: 'image/jpeg', data: fakeJpegB64 } }]
          }
        }]
      }), { status: 200 });
    }
    throw new Error('Unexpected image fetch: ' + u);
  };

  try {
    const imgRes = await handleAdminAiGenerateImage(
      new Request('https://csodisha.com/api/admin/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_en: 'OPSC OAS Prelims 2026 Guide',
          category: 'exam-strategy',
          scope: 'Odisha',
          aspect_ratio: '16:9'
        })
      }),
      { DB: db, MEDIA: mockMediaR2, GEMINI_API_KEY: 'gm_img_test' },
      { userId: 'adm_1', email: 'admin@csodisha.com' }
    );
    assert.equal(imgRes.status, 201);
    const imgData = await imgRes.json();
    assert.deepEqual(imgModelsTried, ['imagen-3.0-generate-002', 'gemini-2.5-flash-image'], 'Image API must attempt Imagen 3 then gemini-2.5-flash-image');
    assert.equal(imgData.ok, true);
    assert.equal(imgData.provider, 'gemini_image');
    assert.match(imgData.url, /^\/api\/media\/guides\/ai-\d+-opsc-oas-prelims-2026-guide\.jpg$/);
    assert.ok(r2Store.has(imgData.key), 'Generated cover must be stored in cso-media R2');
    assert.ok(imgData.alt_en && imgData.caption_en && imgData.caption_or);

    // Verify /api/media/_serve.js serves the stored guides/ai-*.jpg key with 200 OK
    const serveRes = await handleMedia(
      new Request('https://csodisha.com' + imgData.url, { method: 'GET' }),
      { MEDIA: mockMediaR2 },
      null
    );
    assert.equal(serveRes.status, 200, '/api/media/_serve.js must serve guides/ai-*.jpg with 200 OK');
    assert.equal(serveRes.headers.get('Content-Type'), 'image/jpeg');
  } finally {
    globalThis.fetch = origFetchImg;
  }

  // C. Verify automatic fallback to Workers AI @cf/black-forest-labs/flux-1-schnell when Gemini fails
  const fluxCalls = [];
  const fluxOut = await generateAiEditorialImage(
    {
      DB: db,
      MEDIA: mockMediaR2,
      AI: {
        async run(model, args) {
          fluxCalls.push({ model, steps: args && args.steps });
          return { image: fakeJpegB64 };
        }
      }
    },
    { title_en: 'Subhadra Yojana Guide', category: 'citizen-scheme', scope: 'Odisha', actorId: 'adm_1' }
  );
  assert.equal(fluxOut.ok, true);
  assert.equal(fluxOut.provider, 'cloudflare_workers_ai');
  assert.equal(fluxCalls.length, 1);
  assert.equal(fluxCalls[0].model, '@cf/black-forest-labs/flux-1-schnell');
  assert.equal(fluxCalls[0].steps, 4);
  assert.ok(r2Store.has(fluxOut.key));

  // D. Verify clean offline SVG fallback when neither Gemini nor Workers AI is available
  const svgOut = await generateAiEditorialImage(
    { DB: db, MEDIA: mockMediaR2 },
    { title_en: 'Konark Sun Temple Heritage', category: 'odisha-gk', scope: 'Odisha', actorId: 'adm_1' }
  );
  assert.equal(svgOut.ok, true);
  assert.equal(svgOut.provider, 'svg_fallback');
  assert.match(svgOut.url, /\.svg$/);
  assert.ok(r2Store.has(svgOut.key));
});

await test('8. v354/v364 Markdown-preserving translation (translate_markdown): pipe-table preservation, 4,200-char ## chunking for free-tier TPM safety & 2026 Flash cascade', async () => {
  assert.ok(VALID_AI_MODES.has('translate_markdown'), 'VALID_AI_MODES must include translate_markdown');
  assert.equal(MARKDOWN_CHUNK_CHAR_LIMIT, 4200, 'MARKDOWN_CHUNK_CHAR_LIMIT must be 4200 to stay comfortably under Groq 6K-8K TPM limits');

  // Verify trailing pipe repair while keeping fenced code untouched
  const repaired = normalizeTranslatedMarkdownPipes('| ପଦବୀ | ବେତନ\n| :--- | :---\n| OAS | Level-12 |\n```txt\n| raw | code\n```');
  assert.ok(repaired.includes('| ପଦବୀ | ବେତନ |'), 'Must restore dropped trailing pipe on table row');
  assert.ok(repaired.includes('| :--- | :--- |'), 'Must restore dropped trailing pipe on separator row');
  assert.ok(repaired.includes('```txt\n| raw | code\n```'), 'Must leave fenced code block untouched');

  // Build a realistic ~14,000-char 6-section Markdown guide — would take 5-6 calls at 3,500 chars, but packs into 2 calls at 7,500 chars!
  const fillerPara = 'Candidates applying for Odisha Civil Services Examination must verify Matriculation records, resident certificate validity, category certificates, and Aadhaar-seeded mobile verification well before the portal closing timestamp. '.repeat(9);
  const longMarkdown = [
    '## Overview & Official Schedule',
    fillerPara,
    'Apply exclusively at https://www.opsc.gov.in/ or email helpdesk@opsc.gov.in for OTR queries.',
    '',
    '### Post-Wise Vacancy & Pay Scale Table',
    '| Post Name | Pay Level | Total Vacancies |',
    '| :--- | :--- | :--- |',
    '| OAS Group A | ORSP Level-12 | 120 |',
    '| OFS Group A | ORSP Level-12 | 45 |',
    '',
    '## Eligibility & Document Checklist',
    fillerPara,
    '- **Citizenship:** Must be a citizen of India and able to read, write, and speak Odia.',
    '- *Age Limit:* 21 to 38 years as on 01-01-2026.',
    '',
    '> [!IMPORTANT]',
    '> Keep your OTR registration slip ready before paying examination fees.',
    '',
    '## Application Fee & Payment Rules',
    fillerPara,
    '',
    '## Exam Pattern & Syllabus Structure',
    fillerPara,
    '```text',
    'PRELIMS_GS1 = 200',
    'PRELIMS_CSAT = 200',
    '```',
    '',
    '## Selection Process & Interview Guidelines',
    fillerPara,
    '',
    '## District Exam Centers & Helpline',
    fillerPara
  ].join('\n');

  assert.ok(longMarkdown.length > 12000 && longMarkdown.length <= 15000, `Test Markdown must be ~14K chars (got ${longMarkdown.length})`);
  const chunks = splitMarkdownByH2Sections(longMarkdown);
  assert.ok(chunks.length >= 4 && chunks.length <= 6, `Expected 14K-char guide to pack into 4-6 TPM-safe chunks at 4,200-char limit (got ${chunks.length})`);
  assert.ok(chunks.every((c) => c.length <= 4200), 'Every chunk must stay <= 4,200 chars');
  assert.ok(chunks[0].startsWith('## Overview'), 'Chunk 1 must start at first ## heading');
  assert.ok(chunks.some((c) => c.includes('| Post Name | Pay Level | Total Vacancies |')), 'Table block must stay intact inside its chunk');

  const db = createMockDb();
  const attemptedModels = [];
  const tokenBudgets = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const m = u.match(/\/models\/([^:?]+):generateContent/);
    if (m) {
      attemptedModels.push(m[1]);
      const parsedBody = JSON.parse(String(init && init.body || '{}'));
      tokenBudgets.push(parsedBody.generationConfig && parsedBody.generationConfig.maxOutputTokens);
      assert.equal(parsedBody.generationConfig && parsedBody.generationConfig.responseMimeType, 'text/plain', 'translate_markdown must use text/plain responseMimeType on Gemini');
      const promptText = parsedBody.contents[0].parts[0].text;
      assert.ok(promptText.includes('exact pipe-table column counts') && promptText.includes('https://...'), 'Prompt must enforce strict Markdown pipe-table and URL preservation');
      const marker = 'English Markdown source:\n';
      const srcChunk = promptText.slice(promptText.indexOf(marker) + marker.length);
      // Simulate clean plain-text Markdown-preserving Odia translation keeping exact syntax, pipes, code blocks, URL & email
      const translatedChunk = srcChunk
        .replace('## Overview & Official Schedule', '## ସଂକ୍ଷିପ୍ତ ବିବରଣୀ ଏବଂ ସରକାରୀ ସୂଚୀ')
        .replace('### Post-Wise Vacancy & Pay Scale Table', '### ପଦବୀ ଓ ବେତନ ତାଲିକା')
        .replace('| Post Name | Pay Level | Total Vacancies |', '| ପଦବୀ ନାମ | ବେତନ ସ୍ତର | ମୋଟ ଶୂନ୍ୟପଦ |')
        .replace('## Eligibility & Document Checklist', '## ଯୋଗ୍ୟତା ଏବଂ ଆବଶ୍ୟକୀୟ ଦଲିଲ୍ ତାଲିକା')
        .replace('## Exam Pattern & Syllabus Structure', '## ପରୀକ୍ଷା ଢାଞ୍ଚା ଏବଂ ସିଲାବସ୍');
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: translatedChunk }]
          }
        }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    const res = await generateAiCoAuthorDraft({ DB: db, GEMINI_API_KEY: 'gm_md_v358' }, {
      mode: 'translate_markdown',
      input: longMarkdown,
      actorId: 'adm_1'
    });
    assert.equal(res.ok, true);
    assert.equal(res.mode, 'translate_markdown');
    assert.equal(res.chunks_count, chunks.length, 'Response must report exact 4,200-char batched chunk count');
    assert.equal(attemptedModels[0], 'gemini-2.5-flash', 'translate_markdown must prioritize verified gemini-2.5-flash first');
    assert.ok(tokenBudgets.every((t) => t === 16384), 'translate_markdown must use 16384 Gemini output token cap');

    const md = res.data.translated_markdown;
    assert.ok(md.includes('## ସଂକ୍ଷିପ୍ତ ବିବରଣୀ ଏବଂ ସରକାରୀ ସୂଚୀ'), 'H2 heading must be preserved & translated');
    assert.ok(md.includes('### ପଦବୀ ଓ ବେତନ ତାଲିକା'), 'H3 heading must be preserved & translated');
    assert.ok(md.includes('| ପଦବୀ ନାମ | ବେତନ ସ୍ତର | ମୋଟ ଶୂନ୍ୟପଦ |') && md.includes('| :--- | :--- | :--- |'), 'Pipe table headers & alignment separator row must remain intact');
    assert.ok(md.includes('| OAS Group A | ORSP Level-12 | 120 |'), 'Pipe table cell structure must preserve exact column counts');
    assert.ok(md.includes('> [!IMPORTANT]'), 'Callout syntax must remain intact');
    assert.ok(md.includes('https://www.opsc.gov.in/') && md.includes('helpdesk@opsc.gov.in'), 'Raw URLs and email addresses must remain untouched');
    assert.ok(md.includes('```text\nPRELIMS_GS1 = 200\nPRELIMS_CSAT = 200\n```'), 'Fenced code block must remain verbatim');
  } finally {
    globalThis.fetch = origFetch;
  }

  // Verify guides-publishing-studio.js defaults Auto-generate Cover to unchecked and includes friendly IST quota message
  const studioJs = read('admin/guides-publishing-studio.js');
  assert.ok(studioJs.includes('chkAiAutoCover.checked = false;'), 'Auto-generate AI Cover Photo checkbox must be unchecked by default');
  assert.ok(studioJs.includes('5:30 AM IST (Workers AI) / 1:30 PM IST (Gemini)'), 'Admin UI must surface friendly IST daily quota reset guidance');
});

await test('9. v356 Verbatim Body (EN) Lock: pasted body_en (>=200 chars) preserved byte-for-byte during auto_fix_fill while extracting metadata & chunked Odia', async () => {
  assert.equal(BODY_EN_VERBATIM_LOCK_MIN_CHARS, 200, 'BODY_EN_VERBATIM_LOCK_MIN_CHARS must be 200');
  const exactPastedBody = [
    '## OPSC OAS 2026 Notification — Exact Vacancy Table',
    'Candidates must submit One-Time Registration exclusively on https://www.opsc.gov.in/ and check syllabus updates at https://oshec.odisha.gov.in/curriculum.',
    '',
    '| Post Name | Service Group | Pay Level | UR | SEBC | SC | ST | Total |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    '| Odisha Administrative Service (OAS) | Group A | Level-12 | 52 | 12 | 20 | 26 | 110 |',
    '| Odisha Finance Service (OFS) | Group A | Level-12 | 21 | 6 | 9 | 12 | 48 |',
    '',
    '## Special Reservation & Age Relaxation Rules',
    '- Women candidates receive 33% horizontal reservation across all categories.',
    '- SEBC, SC, ST, and Women candidates receive 5 years upper age relaxation beyond 38 years.'
  ].join('\n');
  assert.ok(exactPastedBody.length >= 200, 'Test pasted body must be >= 200 chars');

  const db = createMockDb();
  const seenPrompts = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('generativelanguage.googleapis.com')) {
      const parsedBody = JSON.parse(String(init && init.body || '{}'));
      const promptText = parsedBody.contents[0].parts[0].text;
      seenPrompts.push(promptText);

      if (promptText.includes('VERBATIM BODY LOCK MODE')) {
        // Even if LLM maliciously tries to return a summarized body_en, server MUST ignore it and keep exactPastedBody verbatim!
        return new Response(JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  category: 'exam-strategy',
                  scope: 'Odisha',
                  is_exam: true,
                  title_en: 'OPSC OAS & OFS 2026 Complete Vacancy & Age Rules Guide',
                  title_or: 'OPSC OAS ଓ OFS 2026 ସମ୍ପୂର୍ଣ୍ଣ ପଦବୀ ଏବଂ ବୟସ ନିୟମ',
                  slug: 'opsc-oas-ofs-2026-vacancy-age-rules',
                  summary_en: 'Complete guide to OPSC OAS and OFS 2026 category-wise vacancies and age relaxation rules. Verify official portal instructions before submitting OTR.',
                  summary_or: 'OPSC OAS ଓ OFS 2026 ଶୂନ୍ୟପଦ ଏବଂ ବୟସ କୋହଳ ନିୟମର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।',
                  tags: ['OPSC', 'OAS 2026', 'OFS', 'Odisha Civil Services', 'Reservation'],
                  takeaways_en: [
                    'Total 110 OAS and 48 OFS Group A vacancies under ORSP Level-12.',
                    'Register online exclusively via https://www.opsc.gov.in/.',
                    '33% horizontal reservation applies for Women candidates.',
                    '5 years age relaxation applies to SEBC, SC, ST, and Women.',
                    'Verify updated syllabus guidelines on oshec.odisha.gov.in.'
                  ],
                  takeaways_or: ['ମୋଟ 110 OAS ଏବଂ 48 OFS ପଦବୀ।'],
                  body_en: 'SHORTENED_BY_LLM_MUST_BE_IGNORED',
                  body_or: '',
                  cover_caption_en: 'OPSC OAS 2026 Recruitment & Vacancy Breakdown',
                  cover_caption_or: 'OPSC OAS 2026 ନିଯୁକ୍ତି ବିବରଣୀ',
                  cover_alt: 'Odisha civil services exam preparation desk banner',
                  official_links: [{ label_en: 'OPSC Official Portal', label_or: 'OPSC ସରକାରୀ ପୋର୍ଟାଲ୍', url: 'https://www.opsc.gov.in/', is_official: true }]
                })
              }]
            }
          }]
        }), { status: 200 });
      }
      if (promptText.includes('English Markdown source:')) {
        return new Response(JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  translated_markdown: '## OPSC OAS 2026 ବିଜ୍ଞପ୍ତି — ସଠିକ୍ ଶୂନ୍ୟପଦ ତାଲିକା\n| ପଦବୀ ନାମ | ସେବା ଗୋଷ୍ଠୀ | ବେତନ ସ୍ତର | UR | SEBC | SC | ST | ମୋଟ |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n| OAS | Group A | Level-12 | 52 | 12 | 20 | 26 | 110 |'
                })
              }]
            }
          }]
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                translations: {
                  title_or: 'OPSC OAS ଓ OFS 2026 ସମ୍ପୂର୍ଣ୍ଣ ପଦବୀ ଏବଂ ବୟସ ନିୟମ',
                  summary_or: 'OPSC OAS ଓ OFS 2026 ଶୂନ୍ୟପଦ ଏବଂ ବୟସ କୋହଳ ନିୟମର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।'
                }
              })
            }]
          }
        }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    const out = await generateAiCoAuthorDraft({ DB: db, GEMINI_API_KEY: 'gm_lock_v356' }, {
      mode: 'auto_fix_fill',
      preserve_body_en: true,
      draft: { body_en: exactPastedBody },
      actorId: 'adm_1'
    });
    assert.equal(out.ok, true);
    assert.equal(out.body_en_locked, true, 'Response must confirm body_en_locked: true');
    assert.equal(out.data.body_en, exactPastedBody, 'Pasted body_en MUST be preserved 100% byte-for-byte verbatim');
    assert.ok(!out.data.body_en.includes('SHORTENED_BY_LLM'), 'LLM-rewritten body_en must never overwrite locked pasted text');
    assert.equal(out.data.takeaways_en.length, 5, 'Must extract 5 key takeaways');
    assert.equal(out.data.cover_alt, 'Odisha civil services exam preparation desk banner');
    assert.ok(out.data.official_links.some((l) => l.url.includes('opsc.gov.in')) && out.data.official_links.some((l) => l.url.includes('oshec.odisha.gov.in')), 'Must extract all .gov.in links from locked pasted body');
    assert.ok(out.data.body_or.includes('| ପଦବୀ ନାମ | ସେବା ଗୋଷ୍ଠୀ |'), 'Pass 2 must translate locked body_en via translate_markdown preserving pipe tables');
    assert.ok(seenPrompts.some((p) => p.includes('VERBATIM BODY LOCK MODE')), 'Pass 1 must use metadata-only VERBATIM BODY LOCK MODE prompt');
    assert.ok(seenPrompts.some((p) => p.includes('English Markdown source:')), 'Pass 2 must route locked body_en through translate_markdown');
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('10. v358 Resilient JSON repair (parseOrRepairAiJson), cascade retry on invalid JSON & deterministic metadata fallback', async () => {
  // A. Direct parser repair tests: <think> blocks, fenced JSON, conversational preamble/postamble, raw newlines/tabs in strings & trailing commas
  const messyOutput = [
    '<think>Let me analyze the Odisha scheme document carefully...</think>',
    'Sure! Here is the structured JSON metadata you requested:',
    '```json',
    '{',
    '  "title_en": "Subhadra Yojana Odisha',
    'Eligibility & DBT Guide",',
    '  "summary_en": "Line one\twith tab and trailing comma.",',
    '  "tags": ["Subhadra Yojana", "Odisha DBT",],',
    '}',
    '```',
    'Hope this helps! Let me know if you need another {format}.'
  ].join('\n');

  const repaired = parseOrRepairAiJson(messyOutput);
  assert.equal(repaired.title_en, 'Subhadra Yojana Odisha\nEligibility & DBT Guide');
  assert.equal(repaired.summary_en, 'Line one\twith tab and trailing comma.');
  assert.deepEqual(repaired.tags, ['Subhadra Yojana', 'Odisha DBT']);

  // B. Cascade retry on HTTP 200 invalid JSON (model 1 returns prose garbage -> model 2 returns valid JSON -> succeeds!)
  const db = createMockDb();
  const triedGemini = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const m = String(url).match(/\/models\/([^:?]+):generateContent/);
    if (m) {
      triedGemini.push(m[1]);
      if (m[1] === 'gemini-2.5-flash') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Sorry, I am unable to format that right now without JSON.' }] } }]
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: 'Here is your JSON:\n{"title_en":"OSSC CGL 2026 Guide","title_or":"OSSC CGL 2026 ମାର୍ଗଦର୍ଶିକା","slug":"ossc-cgl-2026-guide","summary_en":"Complete OSSC CGL overview.","summary_or":"OSSC CGL ବିବରଣୀ।","tags":["OSSC","CGL"],"takeaways_en":["Apply on ossc.gov.in"],"takeaways_or":["ossc.gov.in ରେ ଆବେଦନ କରନ୍ତୁ"],"body_en":"## Overview\\nDetails here.","body_or":"## ବିବରଣୀ\\nତଥ୍ୟ"}'
            }]
          }
        }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch');
  };

  try {
    const retryRes = await generateAiCoAuthorDraft({ DB: db, GEMINI_API_KEY: 'gm_retry_v358' }, {
      mode: 'guide',
      input: 'OSSC CGL 2026 exam pattern and syllabus',
      actorId: 'adm_1'
    });
    assert.equal(retryRes.ok, true);
    assert.deepEqual(triedGemini, ['gemini-2.5-flash', 'gemini-2.5-flash-lite'], 'Invalid JSON from gemini-2.5-flash must automatically retry gemini-2.5-flash-lite');
    assert.equal(retryRes.model, 'gemini-2.5-flash-lite');
    assert.equal(retryRes.data.slug, 'ossc-cgl-2026-guide');
  } finally {
    globalThis.fetch = origFetch;
  }

  // C. Zero-failure deterministic fallback when pasted body_en (>=200 chars) exists and EVERY model fails or returns invalid JSON
  const pastedArticle = [
    '## OSSC Combined Graduate Level (CGL) 2026 Complete Recruitment Handbook',
    'The Odisha Staff Selection Commission has released the official Combined Graduate Level notification for 586 Group B and Group C posts across Odisha. Candidates must complete online registration exclusively on https://www.ossc.gov.in/ and download syllabus updates from https://oshec.odisha.gov.in/cgl-syllabus.',
    '',
    '### Key Highlights & Eligibility',
    '- Educational Qualification: Bachelor degree in any discipline with basic computer proficiency.',
    '- Age Limit: 21 to 38 years with 5 years relaxation for SEBC, SC, ST, and Women candidates.',
    '- Selection Process: Prelims CBT, Mains Written Paper, and Computer Skill Test.',
    '- Application Fee: Zero examination fee for all Odisha state candidates.',
    '- Helpline & Verification: Always verify admission letters strictly on official .gov.in portals.'
  ].join('\n');

  const detDirect = buildDeterministicGuideMetadata(pastedArticle);
  assert.equal(detDirect.title_en, 'OSSC Combined Graduate Level (CGL) 2026 Complete Recruitment Handbook');
  assert.equal(detDirect.category, 'exam-strategy');
  assert.equal(detDirect.scope, 'Odisha');
  assert.equal(detDirect.takeaways_en.length, 5);
  assert.ok(detDirect.official_links.some((l) => l.url.includes('ossc.gov.in')));

  const origFetchFail = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'Totally broken non-JSON conversational prose!' }] } }]
  }), { status: 200 });
  try {
    const fallbackRes = await generateAiCoAuthorDraft({
      DB: db,
      GEMINI_API_KEY: 'gm_broken_v358',
      AI: {
        async run() {
          return { response: 'Workers AI also returned non-JSON text without braces.' };
        }
      }
    }, {
      mode: 'auto_fix_fill',
      skip_body_or: true,
      draft: { body_en: pastedArticle },
      actorId: 'adm_1'
    });

    assert.equal(fallbackRes.ok, true, 'auto_fix_fill with pasted body_en must NEVER fail with invalid JSON error');
    assert.equal(fallbackRes.fallback_used, true);
    assert.equal(fallbackRes.provider, 'deterministic_fallback');
    assert.equal(fallbackRes.body_en_locked, true);
    assert.equal(fallbackRes.data.body_en, pastedArticle, 'Deterministic fallback must preserve pasted body_en 100% verbatim');
    assert.equal(fallbackRes.data.title_en, 'OSSC Combined Graduate Level (CGL) 2026 Complete Recruitment Handbook');
    assert.equal(fallbackRes.data.slug, 'ossc-combined-graduate-level-cgl-2026-complete-recruitment-handbook');
    assert.equal(fallbackRes.data.scope, 'Odisha');
    assert.ok(fallbackRes.data.summary_en.includes('586 Group B'), 'Deterministic summary_en must extract clean opening prose sentences');
    assert.equal(fallbackRes.data.takeaways_en.length, 5, 'Deterministic fallback must extract up to 5 bullet takeaways');
    assert.ok(fallbackRes.data.tags.includes('OSSC') && fallbackRes.data.tags.includes('CGL'));
    assert.ok(fallbackRes.data.official_links.some((l) => l.url.includes('ossc.gov.in')) && fallbackRes.data.official_links.some((l) => l.url.includes('oshec.odisha.gov.in')));
  } finally {
    globalThis.fetch = origFetchFail;
  }
});

await test('11. v359 Quota-bypassing local English metadata fallback (D1 cap + upstream 429) & Guides Studio Pass 2 graceful partial success', async () => {
  const pastedNationalArticle = [
    '## NTA UGC NET December 2026 Complete Examination & Fellowship Guide',
    'The National Testing Agency conducts UGC NET for Assistant Professor and Junior Research Fellowship eligibility across Indian universities. Candidates must apply online at https://ugcnet.nta.nic.in/, review institutional accreditation at https://www.ugc.gov.in/, and check university research guidelines on https://niser.edu.in/academics.',
    '',
    '### Essential Guidelines & Key Rules',
    '- Qualifying Marks: General category candidates need 40% aggregate across both papers.',
    '- Age Limit for JRF: Maximum 30 years with 5 years relaxation for SC, ST, OBC-NCL, PwD, and Women.',
    '- Exam Pattern: Computer Based Test with Paper 1 (100 marks) and Paper 2 (200 marks), zero negative marking.',
    '- E-Certificate Validity: Assistant Professor eligibility remains valid for lifetime.',
    '- Official Verification: Download admit cards and scorecards exclusively from official .nic.in and .gov.in portals.'
  ].join('\n');
  assert.ok(pastedNationalArticle.length >= 200);

  // A. D1 daily neuron budget completely exhausted (>= 9500) -> auto_fix_fill MUST bypass quota block and return all English metadata locally
  const exhaustedDb = createMockDb(9700);
  const d1QuotaRes = await generateAiCoAuthorDraft({
    DB: exhaustedDb,
    GEMINI_API_KEY: 'gm_should_not_even_fail',
    AI: { async run() { throw new Error('Should not be called when D1 budget cap already exhausted'); } }
  }, {
    mode: 'auto_fix_fill',
    skip_body_or: true,
    preserve_body_en: true,
    draft: { category: 'how-to', scope: 'Odisha', body_en: pastedNationalArticle },
    actorId: 'adm_1'
  });

  assert.equal(d1QuotaRes.ok, true, 'auto_fix_fill with pasted body_en must succeed locally even when D1 daily neuron budget is exhausted');
  assert.equal(d1QuotaRes.provider, 'deterministic_fallback');
  assert.equal(d1QuotaRes.quota_exhausted_odia, true, 'Must signal quota_exhausted_odia: true');
  assert.equal(d1QuotaRes.body_en_locked, true);
  assert.equal(d1QuotaRes.data.body_en, pastedNationalArticle, 'Must preserve pasted body_en 100% verbatim');
  assert.equal(d1QuotaRes.data.title_en, 'NTA UGC NET December 2026 Complete Examination & Fellowship Guide');
  assert.equal(d1QuotaRes.data.slug, 'nta-ugc-net-december-2026-complete-examination-fellowship-guide');
  assert.equal(d1QuotaRes.data.category, 'exam-strategy', 'Must infer exam-strategy over default how-to composer value');
  assert.equal(d1QuotaRes.data.scope, 'National', 'Must infer National scope for NTA UGC NET guide');
  assert.ok(d1QuotaRes.data.read_minutes >= 1, 'Must compute read_minutes');
  assert.ok(d1QuotaRes.data.summary_en.includes('National Testing Agency'), 'Must extract summary_en');
  assert.equal(d1QuotaRes.data.takeaways_en.length, 5, 'Must extract 5 takeaways_en');
  assert.ok(d1QuotaRes.data.tags.length >= 4 && d1QuotaRes.data.tags.includes('UGC NET'), 'Must derive relevant tags');
  assert.ok(d1QuotaRes.data.cover_caption_en.includes('NTA UGC NET'), 'Must populate cover_caption_en');
  assert.ok(d1QuotaRes.data.cover_alt.includes('NTA UGC NET'), 'Must populate cover_alt');
  assert.ok(d1QuotaRes.data.official_links.some((l) => l.url.includes('ugcnet.nta.nic.in')), 'Must extract .nic.in link');
  assert.ok(d1QuotaRes.data.official_links.some((l) => l.url.includes('ugc.gov.in')), 'Must extract .gov.in link');
  assert.ok(d1QuotaRes.data.official_links.some((l) => l.url.includes('niser.edu.in')), 'Must extract .edu.in link');

  // B. Both upstream Gemini AND Cloudflare Workers AI return 429 -> MUST still succeed locally with all English metadata
  const freshDb = createMockDb();
  const origFetch429 = globalThis.fetch;
  globalThis.fetch = async () => new Response('RESOURCE_EXHAUSTED', { status: 429 });
  try {
    const upstream429Res = await generateAiCoAuthorDraft({
      DB: freshDb,
      GEMINI_API_KEY: 'gm_429_v359',
      AI: {
        async run() {
          const e = new Error('Daily free neurons limit reached (429)');
          e.status = 429;
          throw e;
        }
      }
    }, {
      mode: 'auto_fix_fill',
      skip_body_or: true,
      draft: { body_en: pastedNationalArticle },
      actorId: 'adm_1'
    });
    assert.equal(upstream429Res.ok, true, 'Upstream 429 on both Gemini and Workers AI must still succeed locally');
    assert.equal(upstream429Res.provider, 'deterministic_fallback');
    assert.equal(upstream429Res.quota_exhausted_odia, true);
    assert.equal(upstream429Res.data.body_en, pastedNationalArticle);
    assert.equal(upstream429Res.data.title_en, 'NTA UGC NET December 2026 Complete Examination & Fellowship Guide');
    assert.equal(upstream429Res.data.official_links.length, 3);
  } finally {
    globalThis.fetch = origFetch429;
  }

  // C. Verify Guides Studio UI wires runGuideAutoFixAndFill() with isolated Pass 2 try/catch and amber notice
  const studioJs = read('admin/guides-publishing-studio.js');
  const studioCss = read('admin/studio.css');
  assert.ok(studioJs.includes('async function runGuideAutoFixAndFill()'), 'guides-publishing-studio.js must define runGuideAutoFixAndFill()');
  assert.ok(studioJs.includes('quota_exhausted_odia'), 'runGuideAutoFixAndFill() must inspect quota_exhausted_odia');
  assert.ok(studioJs.includes('English metadata & links auto-filled locally! (Odia auto-translation skipped: daily AI quota resets at 5:30 AM IST / 1:30 PM IST'), 'guides-publishing-studio.js must display the non-blocking amber quota notice');
  assert.ok(studioJs.includes('is-warn-amber') && studioCss.includes('.cso-guide-ai-progress.is-warn-amber'), 'Amber notice class must be wired in JS and styled in studio.css using semantic tokens');
});

await test('12. v361 Multi-Provider AI Router: SSRF validation, OpenAI-compatible 400 response_format retry, OpenRouter headers, preferred_model routing & GEMINI_API_KEY_2', async () => {
  // A. Key masking & SSRF URL guard
  assert.equal(maskApiKey('gsk_1234567890abcdef9f2a'), 'gsk_...9f2a');
  assert.equal(maskApiKey('sk-or-v1-abcdef1234567890'), 'sk-...7890');
  assert.equal(validateProviderBaseUrl('https://api.groq.com/openai/v1/').url, 'https://api.groq.com/openai/v1');
  assert.equal(validateProviderBaseUrl('http://api.groq.com/openai/v1').ok, false, 'Must reject non-HTTPS URLs');
  assert.equal(validateProviderBaseUrl('https://localhost/v1').ok, false, 'Must block localhost');
  assert.equal(validateProviderBaseUrl('https://127.0.0.1/v1').ok, false, 'Must block loopback IP');
  assert.equal(validateProviderBaseUrl('https://10.0.0.5/v1').ok, false, 'Must block RFC1918 10.x');
  assert.equal(validateProviderBaseUrl('https://192.168.1.10/v1').ok, false, 'Must block RFC1918 192.168.x');
  assert.equal(validateProviderBaseUrl('https://169.254.169.254/latest').ok, false, 'Must block link-local metadata IP');

  // B. callOpenAiCompatibleProvider: Bearer auth, OpenRouter headers, 400 retry without response_format & JSON repair
  const capturedReqs = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const parsedBody = JSON.parse(String(init && init.body || '{}'));
    capturedReqs.push({ url: String(url), headers: init && init.headers, body: parsedBody });
    if (String(url).includes('openrouter.ai') && parsedBody.response_format) {
      return new Response('{"error":"response_format json_object unsupported for this free route"}', { status: 400 });
    }
    if (String(url).includes('openrouter.ai')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Sure!\n```json\n{"translated_or": "ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି ୨୦୨୬",}\n```' } }]
      }), { status: 200 });
    }
    if (String(url).includes('api.groq.com')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'OK' } }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + url);
  };

  try {
    const orOut = await callOpenAiCompatibleProvider(
      {
        id: 'prov_or',
        label: 'OpenRouter Free',
        provider_type: 'openai_compatible',
        base_url: 'https://openrouter.ai/api/v1',
        model_id: 'openrouter/free',
        api_key: 'sk-or-test-key-1234'
      },
      'Return JSON only.',
      'Translate to Odia',
      { jsonMode: true, maxTokens: 512 }
    );
    assert.equal(capturedReqs.length, 2, 'Must retry without response_format after 400 error');
    assert.equal(capturedReqs[0].url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(capturedReqs[0].headers.Authorization, 'Bearer sk-or-test-key-1234');
    assert.equal(capturedReqs[0].headers['HTTP-Referer'], 'https://csodisha.com');
    assert.equal(capturedReqs[0].headers['X-Title'], 'Common Sense Odisha');
    assert.deepEqual(capturedReqs[0].body.response_format, { type: 'json_object' });
    assert.equal(capturedReqs[1].body.response_format, undefined, 'Retry request must omit response_format');
    assert.equal(orOut.parsed.translated_or, 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି ୨୦୨୬');
    assert.ok(orOut.provider_model.includes('OpenRouter Free') && orOut.provider_model.includes('openrouter/free'));

    // Live ping helper testAiProviderConnection()
    const pingOut = await testAiProviderConnection({
      id: 'prov_groq',
      label: 'Groq Free',
      provider_type: 'openai_compatible',
      base_url: 'https://api.groq.com/openai/v1',
      model_id: 'llama-3.3-70b-versatile',
      api_key: 'gsk_test_ping_9999'
    });
    assert.equal(pingOut.ok, true);
    assert.equal(pingOut.model_id, 'llama-3.3-70b-versatile');
    assert.ok(pingOut.latency_ms >= 1);
  } finally {
    globalThis.fetch = origFetch;
  }

  // C. preferred_model routing across custom:<id>, gemini:<model> (+ GEMINI_API_KEY_2), workers:<model> & local:deterministic
  const customRows = [
    {
      id: 'groq_main',
      label: 'Groq Free (Llama 3.3 70B)',
      provider_type: 'openai_compatible',
      base_url: 'https://api.groq.com/openai/v1',
      model_id: 'llama-3.3-70b-versatile',
      api_key: 'gsk_custom_primary_8888',
      enabled: 1,
      priority: 1
    }
  ];
  const dbWithCustom = createMockDb(0, customRows);
  const callLog = [];
  const origFetch2 = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    callLog.push(u);
    if (u.includes('api.groq.com')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ translated_or: 'Groq ଓଡ଼ିଆ ଅନୁବାଦ' }) } }]
      }), { status: 200 });
    }
    if (u.includes('generativelanguage.googleapis.com')) {
      if (u.includes('key=gm_key_1')) {
        return new Response('Quota exceeded', { status: 429 });
      }
      if (u.includes('key=gm_key_2')) {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ translated_or: 'Backup Key Gemini ଓଡ଼ିଆ ଅନୁବାଦ' }) }] } }]
        }), { status: 200 });
      }
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    const workersLog = [];
    const mockWorkers = {
      async run(model) {
        workersLog.push(model);
        return { response: JSON.stringify({ translated_or: 'Workers AI ଓଡ଼ିଆ ଅନୁବାଦ' }) };
      }
    };
    const env = {
      DB: dbWithCustom,
      GEMINI_API_KEY: 'gm_key_1',
      GEMINI_API_KEY_2: 'gm_key_2',
      AI: mockWorkers
    };

    // 1. custom:<id> routes straight to Groq custom provider
    const customRes = await generateAiCoAuthorDraft(env, {
      mode: 'translate_odia',
      input: 'Odisha Government Recruitment Notice 2026',
      preferred_model: 'custom:groq_main',
      actorId: 'adm_1'
    });
    assert.equal(customRes.ok, true);
    assert.equal(customRes.data.translated_or, 'Groq ଓଡ଼ିଆ ଅନୁବାଦ');
    assert.ok(customRes.provider_model.includes('Groq Free') && customRes.provider_model.includes('llama-3.3-70b-versatile'));
    assert.ok(callLog[0].includes('api.groq.com'), 'custom:groq_main must hit Groq endpoint first');

    // 2. gemini:<model_id> targets exact model first & falls over cleanly from GEMINI_API_KEY to GEMINI_API_KEY_2
    callLog.length = 0;
    const gemRes = await generateAiCoAuthorDraft(env, {
      mode: 'translate_odia',
      input: 'Odisha Teacher Recruitment 2026',
      preferred_model: 'gemini:gemini-2.5-flash-lite',
      actorId: 'adm_1'
    });
    assert.equal(gemRes.ok, true);
    assert.equal(gemRes.model, 'gemini-2.5-flash-lite');
    assert.equal(gemRes.data.translated_or, 'Backup Key Gemini ଓଡ଼ିଆ ଅନୁବାଦ');
    assert.ok(callLog[0].includes('/models/gemini-2.5-flash-lite:generateContent?key=gm_key_1'), 'Must try preferred Gemini model on key 1 first');
    assert.ok(callLog.some((u) => u.includes('/models/gemini-2.5-flash-lite:generateContent?key=gm_key_2')), 'Must fail over to GEMINI_API_KEY_2');

    // 3. workers:<model_id> calls Cloudflare Workers AI directly first without touching Gemini or Groq
    callLog.length = 0;
    workersLog.length = 0;
    const wkRes = await generateAiCoAuthorDraft(env, {
      mode: 'translate_odia',
      input: 'Subhadra Yojana Status Check 2026',
      preferred_model: 'workers:@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      actorId: 'adm_1'
    });
    assert.equal(wkRes.ok, true);
    assert.equal(wkRes.provider, 'cloudflare_workers_ai');
    assert.equal(wkRes.model, '@cf/meta/llama-3.1-8b-instruct-fp8-fast');
    assert.equal(callLog.length, 0, 'workers:<model> must bypass external HTTP fetches when Workers AI succeeds');
    assert.equal(workersLog[0], '@cf/meta/llama-3.1-8b-instruct-fp8-fast');

    // 4. local:deterministic makes ZERO network/AI calls and returns provider_model: 'local:deterministic'
    callLog.length = 0;
    workersLog.length = 0;
    const localBody = '## Odisha Police SI 2026 Official Guide\nApply online at https://odishapolice.gov.in/ for Sub-Inspector vacancies across Odisha.\n- Total posts: 933 regular vacancies.\n- Qualification: Graduation in any stream from a recognized university.\n- Written exam consists of Paper I and Paper II.';
    const locRes = await generateAiCoAuthorDraft(env, {
      mode: 'auto_fix_fill',
      preferred_model: 'local:deterministic',
      draft: { body_en: localBody },
      actorId: 'adm_1'
    });
    assert.equal(locRes.ok, true);
    assert.equal(locRes.provider_model, 'local:deterministic');
    assert.equal(callLog.length, 0, 'local:deterministic must make zero HTTP requests');
    assert.equal(workersLog.length, 0, 'local:deterministic must make zero Workers AI calls');
    assert.equal(locRes.data.body_en, localBody);
    assert.ok(locRes.data.official_links.some((l) => l.url.includes('odishapolice.gov.in')));
  } finally {
    globalThis.fetch = origFetch2;
  }
});

await test('13. v362 12-Provider Adapters: Anthropic Messages API, Sarvam/HF/Grok/Meta/OpenAI/DeepSeek endpoints & dormant env filtering', async () => {
  // A. callAnthropicMessagesProvider: /v1/messages, x-api-key, anthropic-version: 2023-06-01, JSON repair & testAiProviderConnection
  const seen = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const bodyObj = JSON.parse(String(init && init.body || '{}'));
    seen.push({ url: String(url), headers: init && init.headers, body: bodyObj });
    if (String(url).includes('api.anthropic.com/v1/messages')) {
      const isPing = bodyObj.messages && bodyObj.messages[0] && bodyObj.messages[0].content === 'Reply with OK';
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: isPing ? 'OK' : '```json\n{"translated_or": "କ୍ଲାଉଡ୍ ଓଡ଼ିଆ ଅନୁବାଦ"}\n```' }]
      }), { status: 200 });
    }
    if (String(url).includes('api.sarvam.ai/v1/chat/completions')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ translated_or: 'ସର୍ବମ୍ ଓଡ଼ିଆ ଅନୁବାଦ' }) } }]
      }), { status: 200 });
    }
    if (String(url).includes('router.huggingface.co/v1/chat/completions')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ translated_or: 'HF Gemma ଓଡ଼ିଆ ଅନୁବାଦ' }) } }]
      }), { status: 200 });
    }
    if (String(url).includes('api.x.ai/v1/chat/completions') || String(url).includes('api.meta.ai/v1/chat/completions') || String(url).includes('api.openai.com/v1/chat/completions') || String(url).includes('api.deepseek.com/v1/chat/completions')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'OK' } }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + url);
  };

  try {
    const claudeOut = await callAnthropicMessagesProvider(
      {
        id: 'prov_claude',
        label: 'Anthropic (Claude Sonnet)',
        provider_type: 'anthropic',
        base_url: 'https://api.anthropic.com/v1',
        model_id: 'claude-3-5-sonnet-latest',
        api_key: 'sk-ant-test-key-4455'
      },
      'Return JSON only.',
      'Translate to Odia',
      { jsonMode: true, maxTokens: 1024 }
    );
    assert.equal(seen[0].url, 'https://api.anthropic.com/v1/messages');
    assert.equal(seen[0].headers['x-api-key'], 'sk-ant-test-key-4455');
    assert.equal(seen[0].headers['anthropic-version'], '2023-06-01');
    assert.equal(seen[0].body.system, 'Return JSON only.');
    assert.deepEqual(seen[0].body.messages, [{ role: 'user', content: 'Translate to Odia' }]);
    assert.equal(claudeOut.parsed.translated_or, 'କ୍ଲାଉଡ୍ ଓଡ଼ିଆ ଅନୁବାଦ');
    assert.ok(claudeOut.provider_model.includes('Anthropic') && claudeOut.provider_model.includes('claude-3-5-sonnet-latest'));

    // testAiProviderConnection works for provider_type: 'anthropic'
    const claudePing = await testAiProviderConnection({
      label: 'Anthropic Claude',
      provider_type: 'anthropic',
      base_url: 'https://api.anthropic.com/v1',
      model_id: 'claude-3-5-sonnet-latest',
      api_key: 'sk-ant-test-key-4455'
    });
    assert.equal(claudePing.ok, true);
    assert.equal(claudePing.model_id, 'claude-3-5-sonnet-latest');

    // Sarvam AI (Odia) & Hugging Face Router via callOpenAiCompatibleProvider
    const sarvamOut = await callOpenAiCompatibleProvider(
      { label: 'Sarvam AI', base_url: 'https://api.sarvam.ai/v1', model_id: 'sarvam-105b', api_key: 'sarvam_live_1234' },
      'Return JSON', 'Translate', { jsonMode: true, maxTokens: 512 }
    );
    assert.equal(sarvamOut.parsed.translated_or, 'ସର୍ବମ୍ ଓଡ଼ିଆ ଅନୁବାଦ');
    const sarvamReq = seen.find((r) => r.url.includes('api.sarvam.ai'));
    assert.equal(sarvamReq.headers.Authorization, 'Bearer sarvam_live_1234');
    assert.equal(sarvamReq.body.model, 'sarvam-105b');

    const hfOut = await callOpenAiCompatibleProvider(
      { label: 'Hugging Face Router', base_url: 'https://router.huggingface.co/v1', model_id: 'google/gemma-4-26b-a4b-it', api_key: 'hf_token_9876' },
      'Return JSON', 'Translate', { jsonMode: true, maxTokens: 512 }
    );
    assert.equal(hfOut.parsed.translated_or, 'HF Gemma ଓଡ଼ିଆ ଅନୁବାଦ');

    // Frontier presets (OpenAI, xAI Grok, Meta Muse, DeepSeek) connection tests
    const frontierProviders = [
      { label: 'OpenAI', base_url: 'https://api.openai.com/v1', model_id: 'gpt-4o-mini', api_key: 'sk-openai-1111' },
      { label: 'xAI Grok', base_url: 'https://api.x.ai/v1', model_id: 'grok-4.7', api_key: 'xai-2222' },
      { label: 'Meta Model API', base_url: 'https://api.meta.ai/v1', model_id: 'muse-spark-1.3', api_key: 'meta-3333' },
      { label: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model_id: 'deepseek-chat', api_key: 'sk-ds-4444' }
    ];
    for (const fp of frontierProviders) {
      const ping = await testAiProviderConnection({ ...fp, provider_type: 'openai_compatible' });
      assert.equal(ping.ok, true, `${fp.label} testAiProviderConnection must succeed`);
      assert.equal(ping.model_id, fp.model_id);
    }

    // B. listConfiguredEnvProviders exposes ONLY active secrets & never exposes raw keys; dormant providers never called
    const activeEnv = listConfiguredEnvProviders({
      SARVAM_API_KEY: 'sarvam_secret_999',
      ANTHROPIC_API_KEY: 'sk-ant-secret-888',
      HF_TOKEN: 'hf_secret_777',
      OPENAI_API_KEY: '',
      XAI_API_KEY: undefined
    });
    assert.equal(activeEnv.length, 3, 'Only the 3 non-empty secrets should be exposed');
    assert.deepEqual(activeEnv.map((x) => x.value).sort(), ['env:anthropic', 'env:huggingface', 'env:sarvam']);
    assert.ok(activeEnv.every((x) => x.api_key === undefined && x.configured === true), 'Never expose raw secret values');

    // C. preferred_model: 'env:anthropic' and 'env:sarvam' route cleanly through generateAiCoAuthorDraft
    const db = createMockDb();
    seen.length = 0;
    const envAnthropicRes = await generateAiCoAuthorDraft(
      { DB: db, ANTHROPIC_API_KEY: 'sk-ant-secret-888', SARVAM_API_KEY: 'sarvam_secret_999' },
      { mode: 'translate_odia', input: 'Odisha Civil Services 2026', preferred_model: 'env:anthropic', actorId: 'adm_1' }
    );
    assert.equal(envAnthropicRes.ok, true);
    assert.equal(envAnthropicRes.data.translated_or, 'କ୍ଲାଉଡ୍ ଓଡ଼ିଆ ଅନୁବାଦ');
    assert.equal(seen.length, 1, 'Dormant or non-selected providers must not be called when preferred env:anthropic succeeds');
    assert.ok(seen[0].url.includes('api.anthropic.com/v1/messages'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('14. v364 Provider-specific diagnostics (no misleading Gemini IST reset on Groq/OpenRouter/HF), Retry-After 429 retry & cross-provider failover', async () => {
  const db = createMockDb();
  const origFetch = globalThis.fetch;

  // A. Groq 429, HF 403 & OpenRouter 429 must surface their exact actionable provider messages (NEVER 5:30 AM / 1:30 PM IST!)
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('api.groq.com')) {
      return new Response('rate_limit_exceeded TPM', { status: 429, headers: { 'Retry-After': '0' } });
    }
    if (u.includes('router.huggingface.co')) {
      return new Response('Forbidden: token lacks Inference Providers scope', { status: 403 });
    }
    if (u.includes('openrouter.ai')) {
      return new Response('Upstream free pool busy', { status: 429, headers: { 'Retry-After': '0' } });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    await assert.rejects(
      () => generateAiCoAuthorDraft({ DB: db, GROQ_API_KEY: 'gsk_test_429' }, {
        mode: 'translate_odia', input: 'Odisha Govt Notice 2026', preferred_model: 'env:groq', auto_failover: false, actorId: 'adm_1'
      }),
      (err) => err
        && err.status === 429
        && /Groq/i.test(err.message)
        && /HTTP 429/i.test(err.message)
        && !err.message.includes('5:30 AM IST')
        && !err.message.includes('1:30 PM IST')
        && err.is_gemini_workers_daily_quota === false
    );

    await assert.rejects(
      () => generateAiCoAuthorDraft({ DB: db, HF_TOKEN: 'hf_test_403' }, {
        mode: 'translate_odia', input: 'Odisha Govt Notice 2026', preferred_model: 'env:huggingface', auto_failover: false, actorId: 'adm_1'
      }),
      (err) => err
        && err.status === 403
        && /Hugging Face/i.test(err.message)
        && /Inference Providers/i.test(err.message)
        && !err.message.includes('5:30 AM IST')
    );

    await assert.rejects(
      () => generateAiCoAuthorDraft({ DB: db, OPENROUTER_API_KEY: 'sk-or-test-429' }, {
        mode: 'translate_odia', input: 'Odisha Govt Notice 2026', preferred_model: 'env:openrouter', auto_failover: false, actorId: 'adm_1'
      }),
      (err) => err
        && err.status === 429
        && /OpenRouter/i.test(err.message)
        && /free pool busy/i.test(err.message)
        && !err.message.includes('5:30 AM IST')
    );

    // When ALL configured external providers fail in auto mode, return combined provider-specific errors (not Gemini/Workers IST text)
    await assert.rejects(
      () => generateAiCoAuthorDraft({ DB: db, GROQ_API_KEY: 'gsk_1', OPENROUTER_API_KEY: 'or_1', HF_TOKEN: 'hf_1' }, {
        mode: 'translate_odia', input: 'Odisha Govt Notice 2026', preferred_model: 'auto', actorId: 'adm_1'
      }),
      (err) => err
        && /Groq/i.test(err.message)
        && /OpenRouter/i.test(err.message)
        && /Hugging Face/i.test(err.message)
        && !err.message.includes('5:30 AM IST')
        && Array.isArray(err.attempted_errors)
        && err.attempted_errors.length === 3
    );
  } finally {
    globalThis.fetch = origFetch;
  }

  // B. Explicitly selected env:groq hitting 429 retries once honoring Retry-After and succeeds without failing over
  let groqAttempts = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.groq.com')) {
      groqAttempts += 1;
      if (groqAttempts === 1) {
        return new Response('TPM burst', { status: 429, headers: { 'Retry-After': '0' } });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ translated_or: 'Groq ପୁନଃଚେଷ୍ଟା ସଫଳ' }) } }]
      }), { status: 200 });
    }
    throw new Error('Should succeed on Groq retry without touching other providers: ' + url);
  };
  try {
    const retryOk = await generateAiCoAuthorDraft(
      { DB: db, GROQ_API_KEY: 'gsk_retry', CEREBRAS_API_KEY: 'cbr_backup' },
      { mode: 'translate_odia', input: 'OPSC OAS Notification 2026', preferred_model: 'env:groq', actorId: 'adm_1' }
    );
    assert.equal(retryOk.ok, true);
    assert.equal(groqAttempts, 2, 'Selected engine must retry once on 429');
    assert.equal(retryOk.data.translated_or, 'Groq ପୁନଃଚେଷ୍ଟା ସଫଳ');
    assert.equal(retryOk.fallback_notice, undefined);
  } finally {
    globalThis.fetch = origFetch;
  }

  // C. Cross-provider failover: Groq 429 + OpenRouter 429 + HF 403 -> automatically fails over to Cerebras & returns fallback_notice!
  const hitOrder = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    hitOrder.push(u);
    if (u.includes('api.groq.com')) return new Response('TPM burst', { status: 429, headers: { 'Retry-After': '0' } });
    if (u.includes('openrouter.ai')) return new Response('Busy', { status: 429 });
    if (u.includes('router.huggingface.co')) return new Response('Forbidden', { status: 403 });
    if (u.includes('api.cerebras.ai')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ translated_or: 'Cerebras ଫେଲଓଭର ସଫଳ' }) } }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + u);
  };
  try {
    const foRes = await generateAiCoAuthorDraft(
      { DB: db, GROQ_API_KEY: 'gsk_1', OPENROUTER_API_KEY: 'or_1', HF_TOKEN: 'hf_1', CEREBRAS_API_KEY: 'cbr_1' },
      { mode: 'translate_odia', input: 'Odisha Civil Services 2026', preferred_model: 'env:groq', actorId: 'adm_1' }
    );
    assert.equal(foRes.ok, true);
    assert.equal(foRes.data.translated_or, 'Cerebras ଫେଲଓଭର ସଫଳ');
    assert.ok(foRes.provider_model.includes('Cerebras'), 'Must report winning fallback engine in provider_model');
    assert.ok(foRes.fallback_notice && /Groq/i.test(foRes.fallback_notice) && /Cerebras/i.test(foRes.fallback_notice), 'Must return actionable fallback_notice');
    assert.ok(hitOrder.some((u) => u.includes('api.groq.com')) && hitOrder.some((u) => u.includes('api.cerebras.ai')));
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('15. v365 OpenRouter Authorization preservation, zero retired gemini-2.0-* models, Groq 2026 defaults & HTTP 404 /models auto-discovery', async () => {
  // A. Zero retired gemini-2.0-* strings across backend & Admin UI + 2026 Groq defaults
  assert.equal(GROQ_DEFAULT_MODEL, 'llama-3.1-8b-instant');
  assert.deepEqual(GROQ_FALLBACK_MODELS, ['openai/gpt-oss-120b', 'meta-llama/llama-4-scout-17b-16e-instruct']);
  for (const relPath of [
    'functions/_lib/ai-coauthor.js',
    'functions/api/admin/_ai.js',
    'admin/guides-publishing-studio.js',
    'admin/studio-translator.js'
  ]) {
    assert.ok(!read(relPath).includes('gemini-2.0-'), `${relPath} must contain zero retired gemini-2.0-* model references`);
  }

  // B. OpenRouter preserves Authorization: Bearer alongside HTTP-Referer/X-Title, trims whitespace/duplicate Bearer, and skips empty keys
  const reqs = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const method = String((init && init.method) || 'GET').toUpperCase();
    const bodyObj = init && init.body ? JSON.parse(String(init.body)) : null;
    reqs.push({ url: u, method, headers: init && init.headers, body: bodyObj });

    if (u === 'https://openrouter.ai/api/v1/chat/completions') {
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ translated_or: 'OpenRouter Auth ସଫଳ' }) } }]
      }), { status: 200 });
    }
    if (u === 'https://api.groq.com/openai/v1/chat/completions') {
      if (bodyObj && bodyObj.model === 'retired-llama-model') {
        return new Response('{"error":"The model retired-llama-model does not exist"}', { status: 404 });
      }
      if (bodyObj && bodyObj.model === 'openai/gpt-oss-120b') {
        return new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ translated_or: 'Auto-Discovered Model ସଫଳ' }) } }]
        }), { status: 200 });
      }
    }
    if (u === 'https://api.groq.com/openai/v1/models') {
      return new Response(JSON.stringify({
        data: [
          { id: 'whisper-large-v3' },
          { id: 'text-embedding-3-small' },
          { id: 'playai-tts' },
          { id: 'openai/gpt-oss-120b' },
          { id: 'meta-llama/llama-4-scout-17b-16e-instruct' }
        ]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    // OpenRouter with padded "Bearer " prefix -> clean single Authorization: Bearer + OpenRouter headers
    const orRes = await callOpenAiCompatibleProvider(
      {
        label: 'OpenRouter Free',
        base_url: 'https://openrouter.ai/api/v1',
        model_id: 'openrouter/free',
        api_key: '  Bearer sk-or-v1-live-token-7788  '
      },
      'Return JSON',
      'Translate',
      { jsonMode: true, maxTokens: 256 }
    );
    assert.equal(orRes.parsed.translated_or, 'OpenRouter Auth ସଫଳ');
    assert.equal(reqs[0].headers.Authorization, 'Bearer sk-or-v1-live-token-7788', 'Authorization: Bearer must be preserved alongside OpenRouter headers');
    assert.equal(reqs[0].headers['HTTP-Referer'], 'https://csodisha.com');
    assert.equal(reqs[0].headers['X-Title'], 'Common Sense Odisha');

    // Empty / whitespace-only api_key must throw MISSING_API_KEY without calling fetch
    const countBeforeEmpty = reqs.length;
    await assert.rejects(
      () => callOpenAiCompatibleProvider(
        { label: 'Empty Key', base_url: 'https://openrouter.ai/api/v1', model_id: 'openrouter/free', api_key: '   ' },
        'Sys', 'User'
      ),
      (err) => err && err.code === 'MISSING_API_KEY'
    );
    assert.equal(reqs.length, countBeforeEmpty, 'Empty API key must NEVER send an unauthenticated network request');

    // C. HTTP 404 model auto-discovery via GET <base_url>/models skips whisper/embedding/tts and retries with live chat model!
    reqs.length = 0;
    const autoDiscRes = await callOpenAiCompatibleProvider(
      {
        label: 'Groq Free',
        base_url: 'https://api.groq.com/openai/v1',
        model_id: 'retired-llama-model',
        api_key: 'gsk_live_404_discovery'
      },
      'Return JSON',
      'Translate',
      { jsonMode: true, maxTokens: 256 }
    );
    assert.equal(autoDiscRes.model, 'openai/gpt-oss-120b', 'Must pick active non-embedding/non-whisper chat model from /models');
    assert.equal(autoDiscRes.discovered_model, 'openai/gpt-oss-120b');
    assert.equal(autoDiscRes.parsed.translated_or, 'Auto-Discovered Model ସଫଳ');
    assert.equal(reqs.length, 3, 'Expected: initial 404 POST -> GET /models -> retried 200 POST');
    assert.equal(reqs[1].method, 'GET');
    assert.equal(reqs[1].url, 'https://api.groq.com/openai/v1/models');
    assert.equal(reqs[1].headers.Authorization, 'Bearer gsk_live_404_discovery');
    assert.equal(reqs[2].body.model, 'openai/gpt-oss-120b');

    // Direct helper test confirming whisper/embedding exclusion
    const picked = await discoverLiveOpenAiChatModel('https://api.groq.com/openai/v1', 'gsk_live_404_discovery', 'retired-llama-model', GROQ_FALLBACK_MODELS);
    assert.equal(picked, 'openai/gpt-oss-120b');
  } finally {
    globalThis.fetch = origFetch;
  }
});

console.log(`\n=== Free-Tier AI Co-Author v318 + v331 + v350 + v354 + v356 + v358 + v359 + v361 + v362 + v364 + v365 Results: ${passed} passed, 0 failed ===\n`);
