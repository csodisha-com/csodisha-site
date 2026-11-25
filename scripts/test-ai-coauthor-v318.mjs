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

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v323');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v323';"));

  const adminJs = read('admin/admin.js');
  assert.ok(adminJs.includes('window.CSOAiCoAuthor'));
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(adminJs));
});

console.log(`\n=== Free-Tier AI Co-Author v318 Results: ${passed} passed, 0 failed ===\n`);
