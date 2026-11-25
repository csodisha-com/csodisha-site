/**
 * 100% Free-Tier Admin Studio AI Co-Author Service (v318)
 * - Uses Google Gemini 2.5 Flash Free-Tier API ONLY if env.GEMINI_API_KEY is bound.
 * - Automatically falls back to Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct-fp8-fast
 *   or @cf/ibm-granite/granite-4.0-h-micro) when GEMINI_API_KEY is absent or rate-limited (429/5xx).
 * - Tracks daily neuron usage in D1 `ai_generation_logs` against Cloudflare's 10,000 Neurons/day free allowance.
 */

export const DAILY_FREE_NEURON_LIMIT = 10000;
export const DAILY_FREE_NEURON_BUDGET = 9500;
export const VALID_AI_MODES = new Set(['job', 'scheme', 'mcq', 'career']);

const WORKERS_AI_PRIMARY_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const WORKERS_AI_FALLBACK_MODEL = '@cf/ibm-granite/granite-4.0-h-micro';
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemma-4-31b-it'];

let _schemaReadyDb = null;

export async function ensureAiCoauthorSchema(env) {
  if (!env || !env.DB) return;
  if (_schemaReadyDb === env.DB) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS ai_generation_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        target_module TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        estimated_neurons INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created
       ON ai_generation_logs(created_at)`
    )
  ]);
  _schemaReadyDb = env.DB;
}

export async function getDailyAiUsage(env) {
  await ensureAiCoauthorSchema(env);
  const dayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
  let neuronsUsed = 0;
  let totalCalls = 0;
  if (env && env.DB) {
    try {
      const row = await env.DB.prepare(
        `SELECT COALESCE(SUM(estimated_neurons), 0) AS neurons_used, COUNT(*) AS total_calls
         FROM ai_generation_logs
         WHERE created_at >= ? AND status = 'ok'`
      ).bind(dayStart).first();
      neuronsUsed = Number((row && row.neurons_used) || 0);
      totalCalls = Number((row && row.total_calls) || 0);
    } catch (_e) {}
  }
  return {
    neurons_used: neuronsUsed,
    daily_limit: DAILY_FREE_NEURON_LIMIT,
    budget_cap: DAILY_FREE_NEURON_BUDGET,
    remaining_neurons: Math.max(0, DAILY_FREE_NEURON_LIMIT - neuronsUsed),
    total_calls: totalCalls,
    day_utc: dayStart.slice(0, 10)
  };
}

export function slugifyText(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Strict server-side HTML sanitizer for AI-generated eligibility/summary tables.
 * Strips dangerous tags, inline style="", on* handlers, and javascript: URIs.
 */
export function sanitizeAiHtml(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|meta|link)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|meta|link)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');

  const allowedTags = new Set(['table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br']);
  s = s.replace(/<\/?([a-z0-9-]+)(\s[^>]*)?>/gi, (full, tagName) => {
    const lower = String(tagName || '').toLowerCase();
    if (!allowedTags.has(lower)) return '';
    if (full.startsWith('</')) return `</${lower}>`;
    if (lower === 'br') return '<br>';
    return `<${lower}>`;
  });
  return s.slice(0, 12000);
}

export function extractJsonObject(rawText) {
  const cleaned = String(rawText || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('AI response did not contain valid JSON.');
  }
}

function buildPromptForMode(mode, rawInput) {
  const text = String(rawInput || '').trim().slice(0, 6000);
  if (mode === 'mcq') {
    return [
      'You are an expert Odisha & National competitive exam educator (OPSC, OSSC, OSSSC, OTET).',
      'Return ONLY a valid JSON object (no markdown fences) with this exact schema:',
      '{',
      '  "title_en": "Mock test title in English",',
      '  "title_or": "Mock test title in Odia (ଓଡ଼ିଆ)",',
      '  "slug": "url-friendly-slug",',
      '  "summary_en": "2-sentence overview in English",',
      '  "summary_or": "2-sentence overview in Odia (ଓଡ଼ିଆ)",',
      '  "questions": [',
      '    {',
      '      "question_en": "Question text in English",',
      '      "question_or": "Question text in Odia",',
      '      "options_en": ["Option A", "Option B", "Option C", "Option D"],',
      '      "options_or": ["ବିକଳ୍ପ A", "ବିକଳ୍ପ B", "ବିକଳ୍ପ C", "ବିକଳ୍ପ D"],',
      '      "correct_index": 0,',
      '      "explanation_en": "Brief explanation in English",',
      '      "explanation_or": "Brief explanation in Odia"',
      '    }',
      '  ]',
      '}',
      'Generate 5 high-accuracy MCQs based on this input:',
      text
    ].join('\n');
  }

  const domainLabel = mode === 'scheme'
    ? 'Odisha & Central Government Welfare Scheme'
    : (mode === 'career' ? 'Odisha & National Career Roadmap' : 'Odisha & National Government Job Recruitment');

  return [
    `You are an expert bilingual editorial assistant for Common Sense Odisha writing a ${domainLabel} brief.`,
    'Return ONLY a valid JSON object (no markdown fences) with this exact schema:',
    '{',
    '  "title_en": "Concise clear English title",',
    '  "title_or": "Accurate Odia (ଓଡ଼ିଆ) translation of the title",',
    '  "slug": "lowercase-hyphenated-slug",',
    '  "summary_en": "3-4 sentence plain-language English summary",',
    '  "summary_or": "3-4 sentence Odia (ଓଡ଼ିଆ) summary",',
    '  "eligibility_table_html": "<table><thead><tr><th>Criteria</th><th>Details</th></tr></thead><tbody><tr><td>Eligibility</td><td>...</td></tr></tbody></table>"',
    '}',
    'Extract accurate facts from this source text / topic (do not invent fake official URLs):',
    text
  ].join('\n');
}

function normalizeStructuredOutput(mode, rawObj, fallbackInput) {
  const obj = rawObj && typeof rawObj === 'object' ? rawObj : {};
  const titleEn = String(obj.title_en || fallbackInput.slice(0, 80) || 'Untitled Draft').trim().slice(0, 180);
  const titleOr = String(obj.title_or || titleEn).trim().slice(0, 220);
  const slug = slugifyText(obj.slug || titleEn) || ('draft-' + Date.now().toString(36));
  const summaryEn = String(obj.summary_en || '').trim().slice(0, 2000);
  const summaryOr = String(obj.summary_or || '').trim().slice(0, 2500);

  if (mode === 'mcq') {
    const rawQs = Array.isArray(obj.questions) ? obj.questions : [];
    const questions = rawQs.slice(0, 10).map((q) => {
      const optsEn = Array.isArray(q.options_en) ? q.options_en.slice(0, 4).map((o) => String(o || '').trim()) : ['Option A', 'Option B', 'Option C', 'Option D'];
      while (optsEn.length < 4) optsEn.push(`Option ${String.fromCharCode(65 + optsEn.length)}`);
      const optsOr = Array.isArray(q.options_or) ? q.options_or.slice(0, 4).map((o) => String(o || '').trim()) : optsEn.slice();
      while (optsOr.length < 4) optsOr.push(optsEn[optsOr.length]);
      const cIdx = Number.isInteger(Number(q.correct_index)) ? Math.max(0, Math.min(3, Number(q.correct_index))) : 0;
      return {
        question_en: String(q.question_en || '').trim(),
        question_or: String(q.question_or || q.question_en || '').trim(),
        options_en: optsEn,
        options_or: optsOr,
        correct_index: cIdx,
        explanation_en: String(q.explanation_en || '').trim(),
        explanation_or: String(q.explanation_or || q.explanation_en || '').trim()
      };
    }).filter((q) => q.question_en);

    return {
      title_en: titleEn,
      title_or: titleOr,
      slug,
      summary_en: summaryEn,
      summary_or: summaryOr,
      questions
    };
  }

  return {
    title_en: titleEn,
    title_or: titleOr,
    slug,
    summary_en: summaryEn,
    summary_or: summaryOr,
    eligibility_table_html: sanitizeAiHtml(obj.eligibility_table_html || '')
  };
}

async function logAiGeneration(env, { actorId, targetModule, provider, model, estimatedNeurons, status }) {
  if (!env || !env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO ai_generation_logs (id, actor_id, target_module, provider, model, estimated_neurons, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      String(actorId || 'admin'),
      String(targetModule || 'job'),
      String(provider),
      String(model),
      Math.max(0, Math.round(Number(estimatedNeurons) || 0)),
      String(status),
      new Date().toISOString()
    ).run();
  } catch (_e) {}
}

async function callGeminiFreeTier(apiKey, prompt) {
  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const generationConfig = {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    };
    if (model.startsWith('gemini-3') || model.startsWith('gemini-4')) {
      generationConfig.thinkingConfig = { thinkingLevel: 'low' };
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig
      })
    });
    if (res.ok) {
      const data = await res.json();
      const text = data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text;
      if (!text) throw new Error('Gemini API returned empty content.');
      return { text, model, provider: 'gemini_free' };
    }
    const err = new Error(`Gemini API returned HTTP ${res.status}`);
    err.status = res.status;
    lastErr = err;
    if (res.status !== 404 && res.status !== 429 && res.status !== 503) throw err;
  }
  throw lastErr || new Error('Gemini API failed');
}

async function callWorkersAi(aiBinding, prompt) {
  if (!aiBinding || typeof aiBinding.run !== 'function') {
    throw new Error('Cloudflare Workers AI binding (env.AI) is not configured.');
  }
  const messages = [
    { role: 'system', content: 'You output strictly valid JSON objects without markdown fences.' },
    { role: 'user', content: prompt }
  ];
  let modelUsed = WORKERS_AI_PRIMARY_MODEL;
  let resp;
  try {
    resp = await aiBinding.run(WORKERS_AI_PRIMARY_MODEL, { messages, max_tokens: 1400, temperature: 0.3 });
  } catch (_primaryErr) {
    modelUsed = WORKERS_AI_FALLBACK_MODEL;
    resp = await aiBinding.run(WORKERS_AI_FALLBACK_MODEL, { messages, max_tokens: 1400, temperature: 0.3 });
  }
  const text = typeof resp === 'string'
    ? resp
    : String((resp && (resp.response || (resp.result && resp.result.response))) || '');
  if (!text) throw new Error('Workers AI returned an empty response.');
  return { text, model: modelUsed, provider: 'cloudflare_workers_ai' };
}

export async function generateAiCoAuthorDraft(env, { mode, input, actorId }) {
  const cleanMode = String(mode || '').trim().toLowerCase();
  if (!VALID_AI_MODES.has(cleanMode)) {
    const err = new Error('Invalid AI Co-Author mode. Expected job, scheme, mcq, or career.');
    err.status = 400;
    throw err;
  }
  const cleanInput = String(input || '').trim();
  if (cleanInput.length < 8) {
    const err = new Error('Provide at least 8 characters of source notice text or topic.');
    err.status = 400;
    throw err;
  }

  const usageBefore = await getDailyAiUsage(env);
  if (usageBefore.neurons_used >= DAILY_FREE_NEURON_BUDGET) {
    const err = new Error('Daily free-tier AI neuron budget (9,500 / 10,000) reached. Resets at 00:00 UTC.');
    err.status = 429;
    throw err;
  }

  const prompt = buildPromptForMode(cleanMode, cleanInput);
  const geminiKey = env && env.GEMINI_API_KEY ? String(env.GEMINI_API_KEY).trim() : '';

  let result = null;
  if (geminiKey) {
    try {
      result = await callGeminiFreeTier(geminiKey, prompt);
    } catch (_geminiErr) {
      // Automatic fallback to 100% free Cloudflare Workers AI on 429/5xx/error
      if (env && env.AI) {
        result = await callWorkersAi(env.AI, prompt);
      } else {
        throw _geminiErr;
      }
    }
  } else {
    result = await callWorkersAi(env && env.AI, prompt);
  }

  const parsed = extractJsonObject(result.text);
  const normalized = normalizeStructuredOutput(cleanMode, parsed, cleanInput);
  const estimatedNeurons = result.provider === 'gemini_free'
    ? 0
    : Math.max(80, Math.min(450, Math.ceil((prompt.length + result.text.length) / 16)));

  await logAiGeneration(env, {
    actorId,
    targetModule: cleanMode,
    provider: result.provider,
    model: result.model,
    estimatedNeurons,
    status: 'ok'
  });

  const usageAfter = await getDailyAiUsage(env);
  return {
    ok: true,
    mode: cleanMode,
    provider: result.provider,
    model: result.model,
    estimated_neurons: estimatedNeurons,
    usage: usageAfter,
    data: normalized
  };
}
