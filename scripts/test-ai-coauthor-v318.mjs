import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeAiHtml,
  generateAiCoAuthorDraft,
  generateAiEditorialImage,
  getDailyAiUsage,
  DAILY_FREE_NEURON_BUDGET,
  GEMINI_PRO_FIRST_MODELS,
  WORKERS_AI_PRO_MODELS,
  GEMINI_IMAGE_MODELS,
  WORKERS_AI_IMAGE_MODEL,
  GEMINI_LONG_MAX_OUTPUT_TOKENS,
  WORKERS_AI_70B_MAX_TOKENS,
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

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v351');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v351';"));

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

await test('7. v350 Gemini Pro-first fallback ordering, auto_fix_fill PDF-to-Article schema & POST /api/admin/ai/generate-image R2 storage', async () => {
  assert.ok(VALID_AI_MODES.has('auto_fix_fill'), 'VALID_AI_MODES must include auto_fix_fill');
  assert.deepEqual(GEMINI_PRO_FIRST_MODELS.slice(0, 4), ['gemini-2.5-pro', 'gemini-pro-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']);
  assert.equal(WORKERS_AI_PRO_MODELS[0], '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal(WORKERS_AI_PRO_MODELS[1], '@cf/meta/llama-3.1-8b-instruct-fp8-fast');
  assert.deepEqual(GEMINI_IMAGE_MODELS, ['imagen-3.0-generate-002', 'gemini-2.5-flash-image']);
  assert.equal(WORKERS_AI_IMAGE_MODEL, '@cf/black-forest-labs/flux-1-schnell');

  // A. Verify v351 high token limits (16384 Gemini / 8192 Workers AI 70B), anti-summarization prompt & two-pass full Odia translation
  assert.equal(GEMINI_LONG_MAX_OUTPUT_TOKENS, 16384, 'Gemini maxOutputTokens must be 16384 for long-form guides');
  assert.equal(WORKERS_AI_70B_MAX_TOKENS, 8192, 'Workers AI 70B max_tokens must be 8192 for long-form guides');

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
        if (model === '@cf/meta/llama-3.3-70b-instruct-fp8-fast') {
          throw new Error('Temporary 70B timeout');
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

    assert.deepEqual(attemptedGemini.slice(0, 4), ['gemini-2.5-pro', 'gemini-pro-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'], 'Pass 1 auto_fix_fill must attempt Gemini Pro first, then Gemini Flash');
    assert.deepEqual(attemptedGemini.slice(4, 8), ['gemini-2.5-pro', 'gemini-pro-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'], 'Pass 2 translate_fields must also attempt Gemini Pro first');
    assert.equal(geminiRequestBodies[0].generationConfig.maxOutputTokens, 16384, 'Gemini Pass 1 must set maxOutputTokens: 16384');
    assert.equal(geminiRequestBodies[4].generationConfig.maxOutputTokens, 16384, 'Gemini Pass 2 must set maxOutputTokens: 16384');
    const pass1PromptText = geminiRequestBodies[0].contents[0].parts[0].text;
    assert.ok(pass1PromptText.includes('NEVER summarize, shorten, or omit details') && pass1PromptText.includes('Preserve 100% of every post name'), 'Pass 1 prompt must include strict anti-summarization directive');
    assert.equal(workersCallArgs[0].model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    assert.equal(workersCallArgs[0].max_tokens, 8192, 'Workers AI 70B fallback must set max_tokens: 8192');
    assert.equal(autoRes.ok, true);
    assert.equal(autoRes.two_pass_translation, true, 'auto_fix_fill must execute dedicated Pass 2 full Odia translation');
    assert.equal(autoRes.data.category, 'exam-strategy');
    assert.equal(autoRes.data.scope, 'Odisha');
    assert.equal(autoRes.data.slug, 'opsc-oas-2026-recruitment-prelims-strategy');
    assert.ok(autoRes.data.body_or.includes('| ପଦବୀ | ଶୂନ୍ୟପଦ |'), 'Pass 2 must populate full Odia Markdown tables matching body_en');
    assert.equal(autoRes.data.takeaways_or.length, 2, 'takeaways_or must align with takeaways_en');
    assert.ok(autoRes.data.official_links.some((l) => l.url.includes('opsc.gov.in')), 'Must extract opsc.gov.in official link');
    assert.ok(autoRes.data.official_links.some((l) => l.url.includes('oshec.odisha.gov.in')), 'Must deterministically extract additional .gov.in PDF links');
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

console.log(`\n=== Free-Tier AI Co-Author v318 + v331 + v350 Results: ${passed} passed, 0 failed ===\n`);
