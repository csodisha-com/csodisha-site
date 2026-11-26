/**
 * 100% Free-Tier Admin Studio AI Co-Author Service (v331)
 * - Uses Google Gemini $0 Free-Tier pool (`gemini-3.5-flash-lite` -> `gemini-3.6-flash` ->
 *   `gemini-3.8-flash` -> `gemini-3.1-flash-lite` -> `gemma-4-31b-it`) ONLY if env.GEMINI_API_KEY is bound.
 * - Automatically falls back to Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct-fp8-fast
 *   or @cf/ibm-granite/granite-4.0-h-micro) when GEMINI_API_KEY is absent or rate-limited (429/5xx).
 * - Supports structured drafting (`job`, `scheme`, `mcq`, `career`), Odisha gov/exam EN->Odia
 *   translation (`translate_odia`, `translate_fields`), and AI Title/Slug/Tag suggestions (`suggest_meta`).
 * - Tracks daily neuron usage in D1 `ai_generation_logs` against Cloudflare's 10,000 Neurons/day free allowance.
 */

export const DAILY_FREE_NEURON_LIMIT = 10000;
export const DAILY_FREE_NEURON_BUDGET = 9500;
export const VALID_AI_MODES = new Set([
  'job',
  'scheme',
  'mcq',
  'career',
  'guide',
  'translate_odia',
  'translate_fields',
  'suggest_meta'
]);

const WORKERS_AI_PRIMARY_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const WORKERS_AI_FALLBACK_MODEL = '@cf/ibm-granite/granite-4.0-h-micro';
export const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemma-4-31b-it'];

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

function buildPromptForMode(mode, rawInput, extra = {}) {
  if (mode === 'translate_odia') {
    const text = String(rawInput || '').trim().slice(0, 6000);
    return [
      'You are an expert Odisha Government and competitive exam translator (English to Odia / ଓଡ଼ିଆ) for Common Sense Odisha.',
      'Translate the English text below into natural, accurate, official Odia script (ଓଡ଼ିଆ) used in Odisha government notifications, OPSC/OSSC/OSSSC/OTET/UGC NET exams, welfare schemes, and news.',
      'STRICT RULES:',
      '- Preserve exact dates, numbers, percentages, currency amounts (e.g. ₹56,100), and URLs verbatim.',
      '- Keep standard exam, board, and government acronyms in English Latin script (e.g. OPSC, OSSSC, OSSC, UPSC, UGC NET, NTA, OTET, OSSTET, IBPS, SBI, RRB, DBT, NPCI, OTR, OAS, CGL, RI, PDF, CBT).',
      '- Preserve Markdown headings (##), bullet lines (-), and newline breaks exactly.',
      '- Return ONLY a valid JSON object (no markdown fences): { "translated_or": "accurate Odia translation" }',
      'English source text:',
      text
    ].join('\n');
  }

  if (mode === 'translate_fields') {
    const fieldsObj = extra.fields || {};
    return [
      'You are an expert Odisha Government and competitive exam translator (English to Odia / ଓଡ଼ିଆ) for Common Sense Odisha.',
      'Translate every English value in the JSON map below into natural, accurate, official Odia script (ଓଡ଼ିଆ).',
      'STRICT RULES:',
      '- Return ONLY a valid JSON object (no markdown fences) with schema: { "translations": { "<same_key>": "<odia_translation>" } }.',
      '- Keep every exact key name unchanged.',
      '- Preserve exact dates, numbers, currency amounts, URLs, Markdown formatting, and newlines.',
      '- Keep standard acronyms in English script (OPSC, OSSSC, OSSC, UPSC, UGC NET, NTA, OTET, OSSTET, IBPS, SBI, RRB, DBT, NPCI, OTR, OAS, CGL, RI, PDF, CBT).',
      'English fields JSON:',
      JSON.stringify(fieldsObj)
    ].join('\n');
  }

  if (mode === 'suggest_meta') {
    const text = String(rawInput || '').trim().slice(0, 5000);
    const kindHint = String(extra.kind || 'public portal article').trim().slice(0, 40);
    return [
      `You are an expert bilingual SEO editor for Common Sense Odisha creating headlines, URL slug, and tags for a ${kindHint}.`,
      'Given the rough topic phrase or pasted official notification text below, return ONLY a valid JSON object (no markdown fences) with this exact schema:',
      '{',
      '  "titles_en": ["Crisp, clear English headline option 1", "Headline option 2", "Headline option 3"],',
      '  "titles_or": ["ସଠିକ୍ ଓଡ଼ିଆ ଶୀର୍ଷକ ୧", "ଓଡ଼ିଆ ଶୀର୍ଷକ ୨", "ଓଡ଼ିଆ ଶୀର୍ଷକ ୩"],',
      '  "slug": "clean-lowercase-seo-slug-with-hyphens",',
      '  "summary_en": "2-sentence SEO summary in English",',
      '  "summary_or": "2-sentence SEO summary in Odia (ଓଡ଼ିଆ)",',
      '  "read_minutes": 5,',
      '  "tags": ["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5", "Tag 6"]',
      '}',
      'RULES:',
      '- Provide exactly 3 distinct, high-clarity English headlines (45–95 chars each) and 3 matching natural Odia headlines preserving acronyms (OPSC, OSSC, OSSSC, UGC NET, NTA, etc.).',
      '- slug must be lowercase ASCII letters, digits, and single hyphens only (max 80 chars, no stopword bloat).',
      '- tags must contain 5 to 8 concise, high-signal exam/department/topic tags (each <= 30 chars).',
      'Input topic / notification text:',
      text
    ].join('\n');
  }

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

  if (mode === 'guide') {
    return [
      'You are an expert Odisha & National editorial guide author for Common Sense Odisha.',
      'Draft a well-structured, accurate informative guide from the topic or official notes below.',
      'Return ONLY a valid JSON object (no markdown fences) with this exact schema:',
      '{',
      '  "title_en": "Clear SEO-friendly English guide title",',
      '  "title_or": "Natural Odia (ଓଡ଼ିଆ) translation of the title",',
      '  "slug": "lowercase-hyphenated-slug",',
      '  "summary_en": "Concise 2-sentence English summary",',
      '  "summary_or": "Concise 2-sentence Odia summary",',
      '  "read_minutes": 6,',
      '  "tags": ["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5"],',
      '  "takeaways_en": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3", "Key takeaway 4"],',
      '  "takeaways_or": ["ମୁଖ୍ୟ ତଥ୍ୟ ୧", "ମୁଖ୍ୟ ତଥ୍ୟ ୨", "ମୁଖ୍ୟ ତଥ୍ୟ ୩", "ମୁଖ୍ୟ ତଥ୍ୟ ୪"],',
      '  "body_en": "## Overview\\nClear intro...\\n\\n## Step-by-Step Process\\n1. Step one...\\n\\n> [!TIP]\\n> Practical tip...\\n\\n## Quick Summary Table\\n| Item | Details |\\n| --- | --- |\\n| Authority | ... |",',
      '  "body_or": "## ସଂକ୍ଷିପ୍ତ ବିବରଣୀ\\n..."',
      '}',
      'RULES: Use clean Markdown headings (## / ###), bullet lists, callout boxes (> [!TIP]), and Markdown tables. Never invent fake URLs.',
      'Topic / Official Notes:',
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

function getResponseSchemaForMode(mode) {
  if (mode === 'translate_odia') {
    return {
      type: 'OBJECT',
      properties: { translated_or: { type: 'STRING' } },
      required: ['translated_or']
    };
  }
  if (mode === 'suggest_meta') {
    return {
      type: 'OBJECT',
      properties: {
        titles_en: { type: 'ARRAY', items: { type: 'STRING' } },
        titles_or: { type: 'ARRAY', items: { type: 'STRING' } },
        slug: { type: 'STRING' },
        summary_en: { type: 'STRING' },
        summary_or: { type: 'STRING' },
        read_minutes: { type: 'INTEGER' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } }
      },
      required: ['titles_en', 'titles_or', 'slug', 'tags']
    };
  }
  return null;
}

function normalizeStructuredOutput(mode, rawObj, fallbackInput, extra = {}) {
  const obj = rawObj && typeof rawObj === 'object' ? rawObj : {};

  if (mode === 'translate_odia') {
    const translated = String(
      obj.translated_or || obj.odia || obj.translation || obj.text || fallbackInput || ''
    ).trim().slice(0, 12000);
    return { translated_or: translated };
  }

  if (mode === 'translate_fields') {
    const srcFields = extra.fields || {};
    const rawMap = (obj.translations && typeof obj.translations === 'object' && !Array.isArray(obj.translations))
      ? obj.translations
      : obj;
    const translations = {};
    for (const k of Object.keys(srcFields)) {
      const val = rawMap[k];
      translations[k] = String(val !== undefined && val !== null ? val : srcFields[k]).trim().slice(0, 12000);
    }
    return { translations };
  }

  if (mode === 'suggest_meta') {
    const cleanSeed = String(fallbackInput || '').trim().split(/\r?\n/)[0].slice(0, 110) || 'Odisha Update';
    let titlesEn = Array.isArray(obj.titles_en)
      ? obj.titles_en.map((t) => String(t || '').trim().slice(0, 160)).filter(Boolean).slice(0, 3)
      : [];
    if (!titlesEn.length) titlesEn = [cleanSeed];
    let titlesOr = Array.isArray(obj.titles_or)
      ? obj.titles_or.map((t) => String(t || '').trim().slice(0, 200)).filter(Boolean).slice(0, 3)
      : [];
    while (titlesOr.length < titlesEn.length) {
      titlesOr.push(titlesEn[titlesOr.length]);
    }
    const slug = slugifyText(obj.slug || titlesEn[0] || cleanSeed) || ('post-' + Date.now().toString(36));
    const rawTags = Array.isArray(obj.tags) ? obj.tags : [];
    const seenTags = new Set();
    const tags = [];
    for (const t of rawTags) {
      const clean = String(t || '').replace(/^#+/, '').trim().slice(0, 36);
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seenTags.has(key)) continue;
      seenTags.add(key);
      tags.push(clean);
      if (tags.length >= 8) break;
    }
    const summaryEn = String(obj.summary_en || '').trim().slice(0, 600);
    const summaryOr = String(obj.summary_or || '').trim().slice(0, 800);
    const wordEst = Math.max(1, Math.min(60, Math.ceil(String(fallbackInput || '').trim().split(/\s+/).filter(Boolean).length / 200) || 5));
    const readMinutes = Number.isFinite(Number(obj.read_minutes)) && Number(obj.read_minutes) >= 1
      ? Math.min(60, Math.round(Number(obj.read_minutes)))
      : wordEst;
    return { titles_en: titlesEn, titles_or: titlesOr, slug, summary_en: summaryEn, summary_or: summaryOr, read_minutes: readMinutes, tags };
  }

  const titleEn = String(obj.title_en || fallbackInput.slice(0, 80) || 'Untitled Draft').trim().slice(0, 180);
  const titleOr = String(obj.title_or || titleEn).trim().slice(0, 220);
  const slug = slugifyText(obj.slug || titleEn) || ('draft-' + Date.now().toString(36));
  const summaryEn = String(obj.summary_en || '').trim().slice(0, 2000);
  const summaryOr = String(obj.summary_or || '').trim().slice(0, 2500);

  if (mode === 'guide') {
    const rawTags = Array.isArray(obj.tags) ? obj.tags : String(obj.tags || '').split(',');
    const tags = rawTags.map((t) => String(t || '').trim().slice(0, 36)).filter(Boolean).slice(0, 8);
    const takeawaysEn = (Array.isArray(obj.takeaways_en) ? obj.takeaways_en : [])
      .map((t) => String(t || '').trim().slice(0, 300)).filter(Boolean).slice(0, 10);
    const takeawaysOr = (Array.isArray(obj.takeaways_or) ? obj.takeaways_or : [])
      .map((t) => String(t || '').trim().slice(0, 380)).filter(Boolean).slice(0, 10);
    const bodyEn = String(obj.body_en || '').trim().slice(0, 32000);
    const bodyOr = String(obj.body_or || '').trim().slice(0, 40000);
    const readMinutes = Number.isFinite(Number(obj.read_minutes)) && Number(obj.read_minutes) >= 1
      ? Math.min(60, Math.round(Number(obj.read_minutes)))
      : Math.max(2, Math.ceil(bodyEn.split(/\s+/).filter(Boolean).length / 200) || 5);
    return {
      title_en: titleEn,
      title_or: titleOr,
      slug,
      summary_en: summaryEn,
      summary_or: summaryOr,
      read_minutes: readMinutes,
      tags,
      takeaways_en: takeawaysEn,
      takeaways_or: takeawaysOr,
      body_en: bodyEn,
      body_or: bodyOr
    };
  }

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

async function callGeminiFreeTier(apiKey, prompt, mode) {
  let lastErr = null;
  const schema = getResponseSchemaForMode(mode);
  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const generationConfig = {
      temperature: mode === 'translate_odia' || mode === 'translate_fields' ? 0.15 : 0.3,
      maxOutputTokens: (mode === 'guide' || mode === 'translate_fields') ? 4096 : 2048,
      responseMimeType: 'application/json'
    };
    if (schema) generationConfig.responseSchema = schema;
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

function unwrapWorkersAiPayload(resp) {
  if (typeof resp === 'string') return resp;
  if (resp && typeof resp === 'object') {
    if (Array.isArray(resp.choices) && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content !== undefined) {
      const c = resp.choices[0].message.content;
      return typeof c === 'string' ? c : JSON.stringify(c);
    }
    const inner = resp.response !== undefined ? resp.response : (resp.result && resp.result.response !== undefined ? resp.result.response : null);
    if (typeof inner === 'string') return inner;
    if (inner && typeof inner === 'object') return JSON.stringify(inner);
  }
  return '';
}

async function callWorkersAi(aiBinding, prompt, mode) {
  if (!aiBinding || typeof aiBinding.run !== 'function') {
    throw new Error('Cloudflare Workers AI binding (env.AI) is not configured.');
  }
  const messages = [
    { role: 'system', content: 'You output strictly valid JSON objects without markdown fences.' },
    { role: 'user', content: prompt }
  ];
  const temp = (mode === 'translate_odia' || mode === 'translate_fields') ? 0.15 : 0.3;
  const maxTok = (mode === 'guide' || mode === 'translate_fields') ? 2800 : 1400;
  let modelUsed = WORKERS_AI_PRIMARY_MODEL;
  let resp;
  try {
    resp = await aiBinding.run(WORKERS_AI_PRIMARY_MODEL, { messages, max_tokens: maxTok, temperature: temp, repetition_penalty: 1.1 });
  } catch (_primaryErr) {
    modelUsed = WORKERS_AI_FALLBACK_MODEL;
    resp = await aiBinding.run(WORKERS_AI_FALLBACK_MODEL, { messages, max_tokens: maxTok, temperature: temp, repetition_penalty: 1.1 });
  }
  const text = unwrapWorkersAiPayload(resp);
  if (!text) throw new Error('Workers AI returned an empty response.');
  return { text, model: modelUsed, provider: 'cloudflare_workers_ai' };
}

function normalizeBatchFields(fieldsInput, rawInput) {
  let obj = fieldsInput;
  if (!obj && typeof rawInput === 'string' && rawInput.trim().startsWith('{')) {
    try { obj = JSON.parse(rawInput); } catch (_e) { obj = null; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const clean = {};
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k || '').trim().slice(0, 64);
    const limit = key === 'body_or' ? 8000 : 3500;
    const val = String(v || '').trim().slice(0, limit);
    if (!key || !val) continue;
    clean[key] = val;
    count += 1;
    if (count >= 36) break;
  }
  return clean;
}

export async function generateAiCoAuthorDraft(env, { mode, input, fields, kind, actorId }) {
  const cleanMode = String(mode || '').trim().toLowerCase();
  if (!VALID_AI_MODES.has(cleanMode)) {
    const err = new Error('Invalid AI Co-Author mode. Expected job, scheme, mcq, career, guide, translate_odia, translate_fields, or suggest_meta.');
    err.status = 400;
    throw err;
  }

  let cleanInput = String(input || '').trim();
  let cleanFields = null;

  if (cleanMode === 'translate_fields') {
    cleanFields = normalizeBatchFields(fields, cleanInput);
    if (!Object.keys(cleanFields).length) {
      const err = new Error('Provide at least one non-empty English field in `fields` to translate.');
      err.status = 400;
      throw err;
    }
    cleanInput = JSON.stringify(cleanFields);
  } else {
    const minLen = cleanMode === 'translate_odia' ? 2 : (cleanMode === 'suggest_meta' ? 3 : 8);
    if (cleanInput.length < minLen) {
      const err = new Error(`Provide at least ${minLen} characters of source notice text or topic.`);
      err.status = 400;
      throw err;
    }
  }

  const usageBefore = await getDailyAiUsage(env);
  if (usageBefore.neurons_used >= DAILY_FREE_NEURON_BUDGET) {
    const err = new Error('Daily free-tier AI neuron budget (9,500 / 10,000) reached. Resets at 00:00 UTC.');
    err.status = 429;
    throw err;
  }

  const extra = { fields: cleanFields, kind };
  const prompt = buildPromptForMode(cleanMode, cleanInput, extra);
  const geminiKey = env && env.GEMINI_API_KEY ? String(env.GEMINI_API_KEY).trim() : '';

  let result = null;
  if (geminiKey) {
    try {
      result = await callGeminiFreeTier(geminiKey, prompt, cleanMode);
    } catch (_geminiErr) {
      // Automatic fallback to 100% free Cloudflare Workers AI on 429/5xx/error
      if (env && env.AI) {
        result = await callWorkersAi(env.AI, prompt, cleanMode);
      } else {
        throw _geminiErr;
      }
    }
  } else {
    result = await callWorkersAi(env && env.AI, prompt, cleanMode);
  }

  let parsed;
  try {
    parsed = extractJsonObject(result.text);
  } catch (parseErr) {
    if (cleanMode === 'translate_odia') {
      const salvaged = String(result.text || '')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^\{?\s*"translated_or"\s*:\s*"?/i, '')
        .replace(/"?\s*\}?$/i, '')
        .trim();
      if (salvaged) parsed = { translated_or: salvaged };
      else throw parseErr;
    } else {
      throw parseErr;
    }
  }

  const normalized = normalizeStructuredOutput(cleanMode, parsed, cleanInput, extra);
  const estimatedNeurons = result.provider === 'gemini_free'
    ? 0
    : Math.max(40, Math.min(450, Math.ceil((prompt.length + result.text.length) / 16)));

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
