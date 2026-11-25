/**
 * 100% Free-Tier Candidate Hub Study & Eligibility Assistant (v319)
 * - Uses active low-neuron Cloudflare Workers AI models:
 *   @cf/ibm-granite/granite-4.0-h-micro (primary)
 *   @cf/meta/llama-3.1-8b-instruct-fp8-fast (fallback)
 * - Reserves Admin Studio priority: pauses fresh candidate AI calls when
 *   combined daily usage in `ai_generation_logs` reaches 8,500 / 10,000 neurons.
 * - Enforces 6 fresh AI queries/day per candidate in `candidate_ai_usage`.
 * - Serves repeat queries from `candidate_ai_cache` at 0 neurons & 0 quota cost.
 */

import { bufToHex } from '../api/auth/_utils.js';
import { getDailyAiUsage, extractJsonObject, ensureAiCoauthorSchema } from './ai-coauthor.js';

export const CANDIDATE_DAILY_LIMIT = 6;
export const ADMIN_RESERVE_NEURON_CAP = 8500;
export const CANDIDATE_AI_PRIMARY_MODEL = '@cf/ibm-granite/granite-4.0-h-micro';
export const CANDIDATE_AI_FALLBACK_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

let _schemaReadyDb = null;

export async function ensureCandidateAiSchema(env) {
  if (!env || !env.DB) return;
  if (_schemaReadyDb === env.DB) return;
  await ensureAiCoauthorSchema(env);
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS candidate_ai_cache (
        cache_key TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        ref_id TEXT,
        response_json TEXT NOT NULL,
        hits INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS candidate_ai_usage (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        usage_date TEXT NOT NULL,
        queries_used INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_ai_usage_unique
       ON candidate_ai_usage(candidate_id, usage_date)`
    )
  ]);
  _schemaReadyDb = env.DB;
}

async function sha256Hex(raw) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(raw)));
  return bufToHex(digest);
}

export async function getCandidateDailyUsage(env, candidateId) {
  await ensureCandidateAiSchema(env);
  const usageDate = new Date().toISOString().slice(0, 10);
  let queriesUsed = 0;
  if (env && env.DB && candidateId) {
    try {
      const row = await env.DB.prepare(
        'SELECT queries_used FROM candidate_ai_usage WHERE candidate_id = ? AND usage_date = ? LIMIT 1'
      ).bind(String(candidateId), usageDate).first();
      queriesUsed = Number((row && row.queries_used) || 0);
    } catch (_e) {}
  }
  return {
    queries_used: queriesUsed,
    daily_limit: CANDIDATE_DAILY_LIMIT,
    remaining: Math.max(0, CANDIDATE_DAILY_LIMIT - queriesUsed),
    usage_date: usageDate
  };
}

async function incrementCandidateDailyUsage(env, candidateId) {
  const usageDate = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO candidate_ai_usage (id, candidate_id, usage_date, queries_used, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(candidate_id, usage_date) DO UPDATE SET
       queries_used = queries_used + 1,
       updated_at = excluded.updated_at`
  ).bind(`${candidateId}_${usageDate}`, String(candidateId), usageDate, nowIso).run();
}

async function runCandidateWorkersAi(env, prompt) {
  if (!env || !env.AI || typeof env.AI.run !== 'function') {
    const err = new Error('Free-tier Workers AI binding is unavailable in this environment.');
    err.status = 503;
    throw err;
  }
  const messages = [
    { role: 'system', content: 'You output strictly valid JSON grounded ONLY in the provided D1 facts. Never invent dates, fees, or vacancies.' },
    { role: 'user', content: prompt }
  ];
  let modelUsed = CANDIDATE_AI_PRIMARY_MODEL;
  let resp;
  try {
    resp = await env.AI.run(CANDIDATE_AI_PRIMARY_MODEL, { messages, max_tokens: 900, temperature: 0.2 });
  } catch (_primaryErr) {
    modelUsed = CANDIDATE_AI_FALLBACK_MODEL;
    resp = await env.AI.run(CANDIDATE_AI_FALLBACK_MODEL, { messages, max_tokens: 900, temperature: 0.2 });
  }
  const text = typeof resp === 'string'
    ? resp
    : String((resp && (resp.response || (resp.result && resp.result.response))) || '');
  if (!text) throw new Error('Workers AI returned an empty response.');
  return { text, model: modelUsed };
}

async function logCandidateAiNeurons(env, { actorId, model, promptLen, outputLen }) {
  if (!env || !env.DB) return;
  const estimatedNeurons = Math.max(40, Math.min(280, Math.ceil((promptLen + outputLen) / 18)));
  try {
    await env.DB.prepare(
      `INSERT INTO ai_generation_logs (id, actor_id, target_module, provider, model, estimated_neurons, status, created_at)
       VALUES (?, ?, 'candidate_assistant', 'cloudflare_workers_ai', ?, ?, 'ok', ?)`
    ).bind(
      crypto.randomUUID(),
      String(actorId || 'candidate'),
      String(model),
      estimatedNeurons,
      new Date().toISOString()
    ).run();
  } catch (_e) {}
}

export async function runCandidateAiAssistant(env, { candidateId, mode, payload }) {
  await ensureCandidateAiSchema(env);
  const cleanMode = String(mode || '').trim().toLowerCase();
  if (cleanMode !== 'eligibility_check' && cleanMode !== 'mcq_explain') {
    const err = new Error('Invalid mode. Expected eligibility_check or mcq_explain.');
    err.status = 400;
    throw err;
  }

  let cacheKey = '';
  let refId = '';
  let prompt = '';
  let normalizeFn = null;

  if (cleanMode === 'eligibility_check') {
    const refType = String((payload && payload.ref_type) || 'job').toLowerCase() === 'scheme' ? 'scheme' : 'job';
    const rawRef = String((payload && (payload.ref_id || payload.slug || payload.id)) || '').trim();
    if (!rawRef) {
      const err = new Error('Missing job or scheme reference ID.');
      err.status = 400;
      throw err;
    }

    const cand = await env.DB.prepare(
      'SELECT id, full_name, district, target_streams FROM candidates WHERE id = ? LIMIT 1'
    ).bind(String(candidateId)).first().catch(() => null);

    const ov = (payload && payload.profile_override && typeof payload.profile_override === 'object')
      ? payload.profile_override
      : {};
    const profile = {
      district: String(ov.district || (cand && cand.district) || '').trim(),
      qualification: String(ov.qualification || '').trim(),
      category: String(ov.category || '').trim(),
      age: ov.age !== undefined && ov.age !== '' ? Number(ov.age) : null
    };

    let record = null;
    if (refType === 'scheme') {
      record = await env.DB.prepare(
        'SELECT id, slug, title_en, title_or, summary_en, eligibility_en, deadline FROM scheme_articles WHERE id = ? OR slug = ? LIMIT 1'
      ).bind(rawRef, rawRef).first().catch(() => null);
    } else {
      record = await env.DB.prepare(
        'SELECT id, slug, title_en, title_or, summary_en, qualification_en, age_limit_en, last_date FROM job_articles WHERE id = ? OR slug = ? LIMIT 1'
      ).bind(rawRef, rawRef).first().catch(() => null);
    }

    if (!record) {
      const err = new Error(`Selected ${refType} record was not found in D1.`);
      err.status = 404;
      throw err;
    }

    refId = String(record.id || record.slug);
    cacheKey = await sha256Hex(JSON.stringify({
      v: 'v319',
      mode: 'eligibility_check',
      refType,
      refId,
      profile
    }));

    prompt = [
      'Compare the candidate profile against this verified Odisha D1 record. Never invent dates, fees, or vacancies.',
      'Return ONLY a JSON object with keys: eligible_status ("Eligible"|"Likely Eligible"|"Check Criteria"|"Not Eligible"), summary_en, summary_or (Odia), checklist (array of short strings), missing_profile_fields (array of strings).',
      `Record (${refType}): ${JSON.stringify(record)}`,
      `Candidate Profile: ${JSON.stringify(profile)}`
    ].join('\n');

    normalizeFn = (obj) => ({
      eligible_status: String((obj && obj.eligible_status) || 'Check Criteria').slice(0, 40),
      summary_en: String((obj && obj.summary_en) || '').trim().slice(0, 1200),
      summary_or: String((obj && obj.summary_or) || '').trim().slice(0, 1400),
      checklist: Array.isArray(obj && obj.checklist) ? obj.checklist.slice(0, 8).map((s) => String(s).trim()) : [],
      missing_profile_fields: Array.isArray(obj && obj.missing_profile_fields)
        ? obj.missing_profile_fields.slice(0, 6).map((s) => String(s).trim())
        : []
    });
  } else {
    const qId = String((payload && (payload.question_id || payload.id)) || '').trim();
    if (!qId) {
      const err = new Error('Missing mock test question_id.');
      err.status = 400;
      throw err;
    }
    const q = await env.DB.prepare(
      'SELECT id, test_id, question_en, question_or, options_json, correct_index, explanation_en, explanation_or FROM mock_questions WHERE id = ? LIMIT 1'
    ).bind(qId).first().catch(() => null);

    if (!q) {
      const err = new Error('Mock test question not found in D1.');
      err.status = 404;
      throw err;
    }

    const selIdx = payload && payload.selected_index !== undefined && payload.selected_index !== null
      ? Number(payload.selected_index)
      : -1;
    refId = String(q.id);
    cacheKey = await sha256Hex(JSON.stringify({
      v: 'v319',
      mode: 'mcq_explain',
      refId,
      selected_index: selIdx
    }));

    prompt = [
      'Explain why the correct answer is right and why the selected option (if any) is wrong, grounded strictly in this question.',
      'Return ONLY a JSON object with keys: concept_en, concept_or (Odia), shortcut_tip_en.',
      `Question: ${JSON.stringify({
        question_en: q.question_en,
        options_json: q.options_json,
        correct_index: q.correct_index,
        selected_index: selIdx,
        explanation_en: q.explanation_en
      })}`
    ].join('\n');

    normalizeFn = (obj) => ({
      concept_en: String((obj && obj.concept_en) || q.explanation_en || '').trim().slice(0, 1200),
      concept_or: String((obj && obj.concept_or) || q.explanation_or || '').trim().slice(0, 1400),
      shortcut_tip_en: String((obj && obj.shortcut_tip_en) || '').trim().slice(0, 500)
    });
  }

  // 1. Check D1 cache FIRST (0 Neurons, 0 Candidate Quota cost)
  const cachedRow = await env.DB.prepare(
    'SELECT response_json FROM candidate_ai_cache WHERE cache_key = ? LIMIT 1'
  ).bind(cacheKey).first().catch(() => null);

  if (cachedRow && cachedRow.response_json) {
    await env.DB.prepare(
      'UPDATE candidate_ai_cache SET hits = hits + 1 WHERE cache_key = ?'
    ).bind(cacheKey).run().catch(() => {});
    const usage = await getCandidateDailyUsage(env, candidateId);
    return {
      ok: true,
      mode: cleanMode,
      cached: true,
      neurons_used: 0,
      usage,
      data: JSON.parse(cachedRow.response_json)
    };
  }

  // 2. Admin Studio Priority Reserve Guard (8,500 / 10,000 free neurons)
  const globalUsage = await getDailyAiUsage(env);
  if (globalUsage.neurons_used >= ADMIN_RESERVE_NEURON_CAP) {
    const err = new Error('Daily free AI capacity is reserved for Admin updates right now. Cached answers remain available.');
    err.status = 429;
    err.admin_reserve_reached = true;
    throw err;
  }

  // 3. Per-Candidate Daily Quota (6 fresh queries/day)
  const candUsageBefore = await getCandidateDailyUsage(env, candidateId);
  if (candUsageBefore.queries_used >= CANDIDATE_DAILY_LIMIT) {
    const err = new Error(`You have used all ${CANDIDATE_DAILY_LIMIT}/${CANDIDATE_DAILY_LIMIT} Free AI Checks for today. Repeat checks from cache remain free!`);
    err.status = 429;
    err.quota_exceeded = true;
    throw err;
  }

  // 4. Execute low-neuron Workers AI model
  const aiResult = await runCandidateWorkersAi(env, prompt);
  const parsed = extractJsonObject(aiResult.text);
  const normalized = normalizeFn(parsed);

  await env.DB.prepare(
    `INSERT OR REPLACE INTO candidate_ai_cache (cache_key, mode, ref_id, response_json, hits, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`
  ).bind(cacheKey, cleanMode, refId, JSON.stringify(normalized), new Date().toISOString()).run();

  await incrementCandidateDailyUsage(env, candidateId);
  await logCandidateAiNeurons(env, {
    actorId: candidateId,
    model: aiResult.model,
    promptLen: prompt.length,
    outputLen: aiResult.text.length
  });

  const usageAfter = await getCandidateDailyUsage(env, candidateId);
  return {
    ok: true,
    mode: cleanMode,
    cached: false,
    model: aiResult.model,
    usage: usageAfter,
    data: normalized
  };
}
