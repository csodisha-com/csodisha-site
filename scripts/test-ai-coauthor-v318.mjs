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
  splitMarkdownByH2Sections,
  normalizeTranslatedMarkdownPipes,
  VALID_AI_MODES
} from '../functions/_lib/ai-coauthor.js';
import { onRequestPost as aiCoauthorPost, handleAdminAiGenerateImage } from '../functions/api/admin/ai-coauthor.js';
import { handleMedia } from '../functions/api/media/_serve.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb(seedNeurons = 0) {
  const logs = [];
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
    if (/^INSERT INTO ai_generation_logs/i.test(s)) {
      const [id, actor_id, target_module, provider, model, estimated_neurons, status, created_at] = params;
      logs.push({ id, actor_id, target_module, provider, model, estimated_neurons, status, created_at });
      return { run: { success: true } };
    }
    return { first: null, run: { success: true } };
  };

  return {
    logs,
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

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v357');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v357';"));

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

await test('7. v357 2026 free-tier Gemini Flash + low-neuron Workers AI cascade, auto_fix_fill PDF-to-Article schema & POST /api/admin/ai/generate-image R2 storage', async () => {
  assert.ok(VALID_AI_MODES.has('auto_fix_fill'), 'VALID_AI_MODES must include auto_fix_fill');
  const expectedGemini = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ];
  assert.deepEqual(GEMINI_PRO_FIRST_MODELS, expectedGemini, 'Gemini cascade must prioritize 2026 free-tier Flash/Flash-Lite models');
  assert.equal(WORKERS_AI_PRO_MODELS[0], '@cf/google/gemma-4-26b-a4b-it', 'Workers AI must prioritize ultra-efficient Gemma 4 26B first');
  assert.equal(WORKERS_AI_PRO_MODELS[1], '@cf/meta/llama-3.1-8b-instruct-fp8-fast', 'Workers AI must prioritize Llama 3.1 8B second');
  assert.equal(WORKERS_AI_PRO_MODELS[2], '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Workers AI must keep Llama 3.3 70B after low-neuron models');
  assert.ok(estimateWorkersAiNeurons('@cf/google/gemma-4-26b-a4b-it', 12000, 12000) < 250, 'Gemma 4 26B full guide must consume < 250 neurons');
  assert.ok(estimateWorkersAiNeurons('@cf/meta/llama-3.1-8b-instruct-fp8-fast', 12000, 12000) < 250, 'Llama 3.1 8B full guide must consume < 250 neurons');
  assert.deepEqual(GEMINI_IMAGE_MODELS, ['imagen-3.0-generate-002', 'gemini-2.5-flash-image']);
  assert.equal(WORKERS_AI_IMAGE_MODEL, '@cf/black-forest-labs/flux-1-schnell');

  // A. Verify v351/v357 high token limits (16384 Gemini / 8192 Workers AI Gemma 4 26B), anti-summarization prompt & two-pass full Odia translation
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
        workersCallArgs.push({ model, max_tokens: args && args.max_tokens });
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

    assert.deepEqual(attemptedGemini.slice(0, 6), expectedGemini, 'Pass 1 auto_fix_fill must cascade across 2026 free-tier Gemini Flash/Lite models');
    assert.deepEqual(attemptedGemini.slice(6, 12), expectedGemini, 'Pass 2 translate_fields must also cascade across 2026 free-tier Gemini Flash/Lite models');
    assert.equal(geminiRequestBodies[0].generationConfig.maxOutputTokens, 16384, 'Gemini Pass 1 must set maxOutputTokens: 16384');
    assert.equal(geminiRequestBodies[6].generationConfig.maxOutputTokens, 16384, 'Gemini Pass 2 must set maxOutputTokens: 16384');
    const pass1PromptText = geminiRequestBodies[0].contents[0].parts[0].text;
    assert.ok(pass1PromptText.includes('NEVER summarize, shorten, or omit details') && pass1PromptText.includes('Preserve 100% of every post name'), 'Pass 1 prompt must include strict anti-summarization directive');
    assert.equal(workersCallArgs[0].model, '@cf/google/gemma-4-26b-a4b-it');
    assert.equal(workersCallArgs[0].max_tokens, 8192, 'Workers AI Gemma 4 26B fallback must set max_tokens: 8192');
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

await test('8. v354/v357 Markdown-preserving translation (translate_markdown): pipe-table preservation, 7,500-char ## chunking (15K -> 2 calls) & 2026 Flash cascade', async () => {
  assert.ok(VALID_AI_MODES.has('translate_markdown'), 'VALID_AI_MODES must include translate_markdown');
  assert.equal(MARKDOWN_CHUNK_CHAR_LIMIT, 7500, 'MARKDOWN_CHUNK_CHAR_LIMIT must be 7500');

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
  assert.ok(splitMarkdownByH2Sections(longMarkdown, 3500).length >= 5, 'At legacy 3,500 limit, 14K guide took 5-6 API calls');
  const chunks = splitMarkdownByH2Sections(longMarkdown);
  assert.equal(chunks.length, 2, `Expected 14K-char guide to pack into exactly 2 chunks at 7,500-char limit (got ${chunks.length})`);
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
      const promptText = parsedBody.contents[0].parts[0].text;
      assert.ok(promptText.includes('exact pipe-table column counts') && promptText.includes('https://...'), 'Prompt must enforce strict Markdown pipe-table and URL preservation');
      const marker = 'English Markdown source:\n';
      const srcChunk = promptText.slice(promptText.indexOf(marker) + marker.length);
      // Simulate clean Markdown-preserving Odia translation keeping exact syntax, pipes, code blocks, URL & email
      const translatedChunk = srcChunk
        .replace('## Overview & Official Schedule', '## ସଂକ୍ଷିପ୍ତ ବିବରଣୀ ଏବଂ ସରକାରୀ ସୂଚୀ')
        .replace('### Post-Wise Vacancy & Pay Scale Table', '### ପଦବୀ ଓ ବେତନ ତାଲିକା')
        .replace('| Post Name | Pay Level | Total Vacancies |', '| ପଦବୀ ନାମ | ବେତନ ସ୍ତର | ମୋଟ ଶୂନ୍ୟପଦ |')
        .replace('## Eligibility & Document Checklist', '## ଯୋଗ୍ୟତା ଏବଂ ଆବଶ୍ୟକୀୟ ଦଲିଲ୍ ତାଲିକା')
        .replace('## Exam Pattern & Syllabus Structure', '## ପରୀକ୍ଷା ଢାଞ୍ଚା ଏବଂ ସିଲାବସ୍');
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ translated_markdown: translatedChunk }) }]
          }
        }]
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    const res = await generateAiCoAuthorDraft({ DB: db, GEMINI_API_KEY: 'gm_md_v357' }, {
      mode: 'translate_markdown',
      input: longMarkdown,
      actorId: 'adm_1'
    });
    assert.equal(res.ok, true);
    assert.equal(res.mode, 'translate_markdown');
    assert.equal(res.chunks_count, 2, 'Response must report 2 batched chunks');
    assert.equal(attemptedModels[0], 'gemini-3.8-flash', 'translate_markdown must prioritize 2026 free-tier gemini-3.8-flash first');
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

console.log(`\n=== Free-Tier AI Co-Author v318 + v331 + v350 + v354 + v356 Results: ${passed} passed, 0 failed ===\n`);
