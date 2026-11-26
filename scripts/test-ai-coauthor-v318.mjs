import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeAiHtml,
  generateAiCoAuthorDraft,
  getDailyAiUsage,
  DAILY_FREE_NEURON_BUDGET
} from '../functions/_lib/ai-coauthor.js';
import { onRequestPost as aiCoauthorPost } from '../functions/api/admin/ai-coauthor.js';
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

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v333');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v333';"));

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

console.log(`\n=== Free-Tier AI Co-Author v318 + v331 Results: ${passed} passed, 0 failed ===\n`);
