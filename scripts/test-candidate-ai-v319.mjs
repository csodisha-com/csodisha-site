import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  handleCandidateAiAssistant
} from '../functions/api/candidate/ai-assistant.js';
import {
  CANDIDATE_DAILY_LIMIT,
  ADMIN_RESERVE_NEURON_CAP,
  CANDIDATE_AI_PRIMARY_MODEL,
  CANDIDATE_AI_FALLBACK_MODEL
} from '../functions/_lib/candidate-ai.js';
import { ACTIVE_SW_CACHE_VERSION } from '../functions/_lib/ops-sentinel.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb({ seedNeurons = 0, seedCandQueries = 0 } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = [
    { token: 'a'.repeat(64), user_id: 'cand_1', email: 'cand1@example.com', role: 'candidate', expires_at: Math.floor(Date.now() / 1000) + 3600 }
  ];
  const candidates = [
    { id: 'cand_1', full_name: 'Subham Mohanty', district: 'Khordha (Bhubaneswar)', target_streams: '["opsc"]' }
  ];
  const jobs = [
    { id: 'job_1', slug: 'opsc-oas-2026', title_en: 'OPSC OAS 2026', title_or: 'OPSC OAS ୨୦୨୬', summary_en: 'Graduate civil services', qualification_en: 'Bachelor Degree', age_limit_en: '21-38 years', last_date: '2026-12-31' }
  ];
  const questions = [
    { id: 'q_1', test_id: 't_1', question_en: 'Longest river in Odisha?', question_or: 'ଓଡ଼ିଶାର ଦୀର୍ଘତମ ନଦୀ?', options_json: '["Mahanadi","Brahmani","Baitarani","Rushikulya"]', correct_index: 0, explanation_en: 'Mahanadi is the longest.', explanation_or: 'ମହାନଦୀ ସବୁଠାରୁ ଲମ୍ବା।' }
  ];
  const cache = [];
  const candUsage = seedCandQueries > 0
    ? [{ id: `cand_1_${today}`, candidate_id: 'cand_1', usage_date: today, queries_used: seedCandQueries }]
    : [];
  const aiLogs = seedNeurons > 0
    ? [{ id: 'seed_n', actor_id: 'adm_1', target_module: 'job', provider: 'cloudflare_workers_ai', model: '@cf/meta/llama-3.1-8b-instruct-fp8-fast', estimated_neurons: seedNeurons, status: 'ok', created_at: new Date().toISOString() }]
    : [];

  const execSql = (sql, params = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^SELECT token, user_id, email, role, expires_at FROM sessions WHERE token = \?/i.test(s)) {
      return { first: sessions.find((x) => x.token === params[0]) || null };
    }
    if (/^SELECT id, full_name, district, target_streams FROM candidates WHERE id = \?/i.test(s)) {
      return { first: candidates.find((c) => c.id === params[0]) || null };
    }
    if (/^SELECT .* FROM job_articles WHERE id = \? OR slug = \?/i.test(s)) {
      return { first: jobs.find((j) => j.id === params[0] || j.slug === params[1]) || null };
    }
    if (/^SELECT .* FROM mock_questions WHERE id = \?/i.test(s)) {
      return { first: questions.find((q) => q.id === params[0]) || null };
    }
    if (/^SELECT response_json FROM candidate_ai_cache WHERE cache_key = \?/i.test(s)) {
      return { first: cache.find((c) => c.cache_key === params[0]) || null };
    }
    if (/^UPDATE candidate_ai_cache SET hits = hits \+ 1 WHERE cache_key = \?/i.test(s)) {
      const row = cache.find((c) => c.cache_key === params[0]);
      if (row) row.hits += 1;
      return { run: { success: true } };
    }
    if (/^INSERT OR REPLACE INTO candidate_ai_cache/i.test(s)) {
      const [cache_key, mode, ref_id, response_json, created_at] = params;
      const idx = cache.findIndex((c) => c.cache_key === cache_key);
      const row = { cache_key, mode, ref_id, response_json, hits: 1, created_at };
      if (idx >= 0) cache[idx] = row;
      else cache.push(row);
      return { run: { success: true } };
    }
    if (/^SELECT queries_used FROM candidate_ai_usage WHERE candidate_id = \? AND usage_date = \?/i.test(s)) {
      return { first: candUsage.find((u) => u.candidate_id === params[0] && u.usage_date === params[1]) || null };
    }
    if (/^INSERT INTO candidate_ai_usage/i.test(s)) {
      const [id, candidate_id, usage_date] = params;
      const existing = candUsage.find((u) => u.candidate_id === candidate_id && u.usage_date === usage_date);
      if (existing) existing.queries_used += 1;
      else candUsage.push({ id, candidate_id, usage_date, queries_used: 1 });
      return { run: { success: true } };
    }
    if (/^SELECT COALESCE\(SUM\(estimated_neurons\), 0\) AS neurons_used/i.test(s)) {
      const dayStart = params[0];
      const okRows = aiLogs.filter((l) => l.created_at >= dayStart && l.status === 'ok');
      return { first: { neurons_used: okRows.reduce((a, b) => a + b.estimated_neurons, 0), total_calls: okRows.length } };
    }
    if (/^INSERT INTO ai_generation_logs/i.test(s)) {
      const [id, actor_id, model, estimated_neurons, created_at] = params;
      aiLogs.push({ id, actor_id, target_module: 'candidate_assistant', provider: 'cloudflare_workers_ai', model, estimated_neurons, status: 'ok', created_at });
      return { run: { success: true } };
    }
    return { first: null, run: { success: true } };
  };

  return {
    cache,
    candUsage,
    aiLogs,
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

console.log('\n=== Candidate Hub Free-Tier AI Assistant (v319) Verification ===\n');

await test('1. Candidate auth enforcement: unauthenticated requests rejected with 401', async () => {
  const db = createMockDb();
  const res = await handleCandidateAiAssistant({
    request: new Request('https://csodisha.com/api/candidate/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'eligibility_check', ref_type: 'job', ref_id: 'opsc-oas-2026' })
    }),
    env: { DB: db }
  });
  assert.equal(res.status, 401);
});

await test('2. Grounded eligibility_check & mcq_explain + D1 cache hit (0-neuron bypass)', async () => {
  const db = createMockDb();
  let aiCalls = 0;
  const mockAi = {
    async run(model, { messages }) {
      aiCalls += 1;
      assert.equal(model, CANDIDATE_AI_PRIMARY_MODEL);
      const txt = messages[1].content;
      if (txt.includes('Question:')) {
        return {
          response: JSON.stringify({
            concept_en: 'Mahanadi flows 494 km through Odisha.',
            concept_or: 'ମହାନଦୀ ଓଡ଼ିଶାରେ ୪୯୪ କିମି ପ୍ରବାହିତ ହୁଏ।',
            shortcut_tip_en: 'Remember Mahanadi = Major river of Hirakud Dam.'
          })
        };
      }
      return {
        response: JSON.stringify({
          eligible_status: 'Eligible',
          summary_en: 'You meet the Bachelor Degree and age 21-38 criteria.',
          summary_or: 'ଆପଣ ସ୍ନାତକ ଏବଂ ୨୧-୩୮ ବୟସ ସୀମା ପୂରଣ କରୁଛନ୍ତି।',
          checklist: ['Bachelor Degree Certificate', 'Odisha Domicile'],
          missing_profile_fields: []
        })
      };
    }
  };

  const env = { DB: db, AI: mockAi };
  const authCookie = `cso_session=${'a'.repeat(64)}`;

  // First call: fresh AI generation
  const r1 = await handleCandidateAiAssistant({
    request: new Request('https://csodisha.com/api/candidate/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ mode: 'eligibility_check', ref_type: 'job', ref_id: 'opsc-oas-2026', profile_override: { qualification: 'Graduate', age: 25 } })
    }),
    env
  });
  assert.equal(r1.status, 200);
  const b1 = await r1.json();
  assert.equal(b1.ok, true);
  assert.equal(b1.cached, false);
  assert.equal(b1.usage.remaining, CANDIDATE_DAILY_LIMIT - 1);
  assert.equal(aiCalls, 1);

  // Repeat call: served from candidate_ai_cache at 0 neurons & 0 quota cost
  const r2 = await handleCandidateAiAssistant({
    request: new Request('https://csodisha.com/api/candidate/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ mode: 'eligibility_check', ref_type: 'job', ref_id: 'opsc-oas-2026', profile_override: { qualification: 'Graduate', age: 25 } })
    }),
    env
  });
  assert.equal(r2.status, 200);
  const b2 = await r2.json();
  assert.equal(b2.cached, true);
  assert.equal(b2.neurons_used, 0);
  assert.equal(b2.usage.remaining, CANDIDATE_DAILY_LIMIT - 1);
  assert.equal(aiCalls, 1);

  // MCQ Explain call
  const r3 = await handleCandidateAiAssistant({
    request: new Request('https://csodisha.com/api/candidate/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ mode: 'mcq_explain', question_id: 'q_1', selected_index: 1 })
    }),
    env
  });
  assert.equal(r3.status, 200);
  const b3 = await r3.json();
  assert.equal(b3.ok, true);
  assert.ok(b3.data.concept_en && b3.data.concept_or);
  assert.equal(aiCalls, 2);
});

await test('3. Per-candidate 6/day cap & 8,500-neuron Admin Reserve Guard', async () => {
  const authCookie = `cso_session=${'a'.repeat(64)}`;

  // 6/day cap
  const dbCap = createMockDb({ seedCandQueries: CANDIDATE_DAILY_LIMIT });
  const rCap = await handleCandidateAiAssistant({
    request: new Request('https://csodisha.com/api/candidate/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ mode: 'mcq_explain', question_id: 'q_1', selected_index: 0 })
    }),
    env: { DB: dbCap, AI: { run: async () => ({}) } }
  });
  assert.equal(rCap.status, 429);
  const bCap = await rCap.json();
  assert.equal(bCap.quota_exceeded, true);

  // 8,500-neuron Admin Reserve Guard
  const dbRes = createMockDb({ seedNeurons: ADMIN_RESERVE_NEURON_CAP });
  const rRes = await handleCandidateAiAssistant({
    request: new Request('https://csodisha.com/api/candidate/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ mode: 'mcq_explain', question_id: 'q_1', selected_index: 0 })
    }),
    env: { DB: dbRes, AI: { run: async () => ({}) } }
  });
  assert.equal(rRes.status, 429);
  const bRes = await rRes.json();
  assert.equal(bRes.admin_reserve_reached, true);
});

await test('4. Active models (no deprecated llama-3.2-3b), migration 0150, CSP & v319 cache sync', async () => {
  assert.equal(CANDIDATE_AI_PRIMARY_MODEL, '@cf/ibm-granite/granite-4.0-h-micro');
  assert.equal(CANDIDATE_AI_FALLBACK_MODEL, '@cf/meta/llama-3.1-8b-instruct-fp8-fast');
  assert.ok(!read('functions/_lib/candidate-ai.js').includes('llama-3.2-3b-instruct'));
  assert.ok(!read('functions/_lib/ai-coauthor.js').includes('llama-3.2-3b-instruct'));

  const mig = read('migrations/0150_candidate_ai_assistant_v319.sql');
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS candidate_ai_cache'));
  assert.ok(mig.includes('CREATE TABLE IF NOT EXISTS candidate_ai_usage'));

  assert.equal(ACTIVE_SW_CACHE_VERSION, 'cso-candidate-cache-v433');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v433';"));

  const sdHtml = read('student-dashboard/index.html');
  assert.ok(!/\son[a-z]+\s*=|\sstyle\s*=/i.test(sdHtml), 'student-dashboard/index.html must remain strictly CSP-safe');

  const sdJs = read('assets/js/student-dashboard.js');
  assert.ok(sdJs.includes('Check My Eligibility (Free AI)'));
  assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|\.style\./.test(sdJs));
});

console.log(`\n=== Candidate Hub AI Assistant v319 Results: ${passed} passed, 0 failed ===\n`);
