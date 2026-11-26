/**
 * 100% Free-Tier Admin Studio AI Co-Author & Editorial Image Service (v350)
 * - Gemini Pro-First Text & PDF-to-Article Pool (`gemini-2.5-pro` -> `gemini-pro-latest` ->
 *   `gemini-2.5-flash` -> `gemini-2.0-flash`) for `auto_fix_fill`, `guide`, and `translate_fields`,
 *   cascading automatically on quota/429/error to Cloudflare Workers AI
 *   (`@cf/meta/llama-3.3-70b-instruct-fp8-fast` -> `@cf/meta/llama-3.1-8b-instruct-fp8-fast`).
 * - Gemini-First Native Image Generation (`imagen-3.0-generate-002` -> `gemini-2.5-flash-image`),
 *   cascading automatically to Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell`
 *   (and clean editorial SVG banner fallback if offline/local), uploaded directly to `cso-media` R2.
 * - Supports structured drafting (`job`, `scheme`, `mcq`, `career`, `guide`, `auto_fix_fill`),
 *   Odisha gov/exam EN->Odia translation (`translate_odia`, `translate_fields`),
 *   and AI Title/Slug/Tag suggestions (`suggest_meta`).
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
  'auto_fix_fill',
  'translate_odia',
  'translate_fields',
  'suggest_meta'
]);

export const PRO_FIRST_MODES = new Set(['auto_fix_fill', 'guide', 'translate_fields']);
export const GEMINI_PRO_FIRST_MODELS = ['gemini-2.5-pro', 'gemini-pro-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
export const GEMINI_FLASH_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-pro-latest'];
export const GEMINI_MODELS = GEMINI_PRO_FIRST_MODELS;

export const WORKERS_AI_PRO_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/ibm-granite/granite-4.0-h-micro'
];
export const WORKERS_AI_DEFAULT_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/ibm-granite/granite-4.0-h-micro'
];

export const GEMINI_IMAGE_MODELS = ['imagen-3.0-generate-002', 'gemini-2.5-flash-image'];
export const WORKERS_AI_IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

export const GEMINI_LONG_MAX_OUTPUT_TOKENS = 16384;
export const WORKERS_AI_70B_MAX_TOKENS = 8192;
export const WORKERS_AI_8B_MAX_TOKENS = 4096;

const VALID_GUIDE_CATEGORIES = new Set(['how-to', 'exam-strategy', 'citizen-scheme', 'odisha-gk']);

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
      '- NEVER summarize, condense, shorten, or omit ANY section, paragraph, bullet item, callout note, or Markdown table row. Translate 100% of the content section-for-section and table-for-table.',
      '- Preserve exact dates, numbers, vacancy counts, fees, pay levels, cutoffs, percentages, currency amounts, URLs, Markdown headings (## / ###), Markdown table pipes (`| ... |` and `| --- |`), callouts (`> [!TIP]`, `> [!WARNING]`, `> [!IMPORTANT]`), and newlines verbatim.',
      '- Keep standard acronyms in English script (OPSC, OSSSC, OSSC, UPSC, UGC NET, NTA, OTET, OSSTET, IBPS, SBI, RRB, DBT, NPCI, OTR, OAS, CGL, RI, PDF, CBT, UR, SEBC, SC, ST, PwD, EWS).',
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

  if (mode === 'auto_fix_fill') {
    const pdfText = String(extra.pdf_text || '').trim().slice(0, 56000);
    const pdfFilename = String(extra.pdf_filename || '').trim().slice(0, 180);
    const depth = String(extra.depth || 'comprehensive').trim().toLowerCase() === 'standard' ? 'standard' : 'comprehensive';
    const englishFirstPass = Boolean(extra.english_first_pass);
    const draft = extra.draft && typeof extra.draft === 'object' ? extra.draft : {};
    const draftBrief = {
      category: draft.category || '',
      scope: draft.scope || '',
      title_en: String(draft.title_en || '').slice(0, 220),
      title_or: String(draft.title_or || '').slice(0, 260),
      slug: String(draft.slug || '').slice(0, 120),
      summary_en: String(draft.summary_en || '').slice(0, 800),
      tags: String(draft.tags || '').slice(0, 240),
      body_en: String(draft.body_en || '').slice(0, 36000)
    };
    const longRawInput = String(rawInput || '').trim().slice(0, 40000);

    const antiSummaryRules = depth === 'comprehensive'
      ? [
          'CRITICAL ANTI-SUMMARIZATION DIRECTIVE (MANDATORY):',
          '- Keep `summary_en` and `summary_or` as concise 2-sentence meta descriptions, but NEVER summarize, shorten, or omit details in `body_en` or `body_or`.',
          '- Preserve 100% of every post name, pay level, vacancy count, category reservation, educational qualification, age relaxation, fee figure, exam stage, qualifying cutoff, exam city, and date from the source text/PDF.',
          '- Expand thin explanations into clear, detailed, well-organized Markdown sections with `##` and `###` headings, complete Markdown tables, bullet checklists, and `>` callout notes.',
          '- NEVER write "etc.", "various posts", "see official PDF for table", or collapse multi-row tables. Reproduce EVERY single row, category-wise breakup, syllabus topic, exam center, and instruction completely.'
        ].join('\n')
      : 'Keep `summary_en` and `summary_or` concise (2 sentences) and organize `body_en` clearly with `##`/`###` headings, Markdown tables, bullet checklists, and `>` callout notes without omitting key facts or dates.';

    return [
      'You are the Senior Bilingual Editor for Common Sense Odisha (csodisha.com).',
      pdfText
        ? `An official PDF document ("${pdfFilename || 'official-notification.pdf'}") was uploaded. Systematically extract ALL verified details (every post name, pay level, vacancy breakup, category reservation, educational qualification, age limit & relaxation, fee figure, exam pattern, syllabus, qualifying cutoff, exam cities, important dates, selection stages, application steps, helpline, and official .gov.in/.edu.in/.nic.in URLs) and build an extensive, publication-grade guide.`
        : 'Repair, expand, structure, and auto-complete the draft guide below into an extensive, publication-grade article. Fix broken Markdown headings (## / ###), align all Markdown tables cleanly, remove messy copy-paste artifacts, and extract every official .gov.in/.edu.in/.nic.in link present in the source.',
      antiSummaryRules,
      englishFirstPass
        ? 'TWO-PASS MODE (PASS 1 — EXHAUSTIVE ENGLISH + METADATA): Dedicate 100% of your output budget to making `body_en` completely exhaustive, richly structured, and zero-omission. Set `body_or` to "" (a dedicated full-length Odia translation pass will immediately translate `body_en` section-for-section).'
        : 'Produce BOTH exhaustive `body_en` and full section-for-section `body_or` matching every heading and table row.',
      'Return ONLY a valid JSON object (no markdown fences) matching this exact schema:',
      '{',
      '  "category": "how-to | exam-strategy | citizen-scheme | odisha-gk",',
      '  "scope": "Odisha | National",',
      '  "is_exam": true,',
      '  "read_minutes": 10,',
      '  "title_en": "Clear SEO-friendly English guide title (50-95 chars)",',
      '  "title_or": "Natural, accurate Odia (ଓଡ଼ିଆ) title keeping standard acronyms (OPSC, OSSC, OSSSC, NTA, UGC NET, DBT, PDF, CBT)",',
      '  "slug": "clean-lowercase-hyphenated-slug",',
      '  "summary_en": "Concise 2-sentence SEO meta description in English",',
      '  "summary_or": "Concise 2-sentence SEO meta description in Odia (ଓଡ଼ିଆ)",',
      '  "tags": ["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5", "Tag 6"],',
      '  "takeaways_en": ["Actionable takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4", "Takeaway 5"],',
      '  "takeaways_or": ["ମୁଖ୍ୟ ବିନ୍ଦୁ ୧", "ମୁଖ୍ୟ ବିନ୍ଦୁ ୨", "ମୁଖ୍ୟ ବିନ୍ଦୁ ୩", "ମୁଖ୍ୟ ବିନ୍ଦୁ ୪", "ମୁଖ୍ୟ ବିନ୍ଦୁ ୫"],',
      '  "body_en": "## Overview\\n...\\n\\n## Post-Wise Vacancy & Pay Scale Breakdown\\n| Post | Pay Level | UR | SEBC | SC | ST | Total |\\n| --- | --- | --- | --- | --- | --- | --- |\\n| ... |\\n\\n## Eligibility, Age Limit & Relaxation\\n...\\n\\n## Exam Pattern, Qualifying Cutoff & Syllabus\\n...\\n\\n## Important Dates, Application Fee & Exam Cities\\n...\\n\\n> [!IMPORTANT]\\n> Exact official rule or critical reminder...",',
      englishFirstPass ? '  "body_or": "",' : '  "body_or": "## ସଂକ୍ଷିପ୍ତ ବିବରଣୀ\\n...",',
      '  "pdf_title_en": "Clean human title for the uploaded PDF (e.g., OPSC OAS Official Notification PDF)",',
      '  "pdf_title_or": "ଅପଲୋଡ୍ ହୋଇଥିବା PDF ର ଓଡ଼ିଆ ଶୀର୍ଷକ",',
      '  "official_links": [{ "label_en": "Official Portal Name", "label_or": "ସରକାରୀ ପୋର୍ଟାଲ୍", "url": "https://...", "is_official": true }],',
      '  "image_prompt": "Clean editorial photography scene description matching this topic (no text, no logos, no letters)",',
      '  "cover_caption_en": "Short editorial caption in English",',
      '  "cover_caption_or": "ଓଡ଼ିଆରେ ସଂକ୍ଷିପ୍ତ କ୍ୟାପ୍ସନ୍"',
      '}',
      'STRICT RULES:',
      '- Never invent fake dates, vacancy numbers, or fake URLs. Only place URLs into official_links that appear verbatim in the source text/PDF.',
      '- Preserve exact numbers, dates, fees, pay scales, cutoffs, and acronyms verbatim.',
      '- Format all tabular data as valid GitHub-Flavored Markdown tables (`| Col 1 | Col 2 |` + `| --- | --- |`).',
      pdfText ? `Extracted PDF Text (${pdfFilename || 'document.pdf'}):\n${pdfText}` : '',
      longRawInput ? `Additional Editorial Notes / Pasted Draft:\n${longRawInput}` : '',
      (draftBrief.title_en || draftBrief.body_en) ? `Existing Composer Fields JSON:\n${JSON.stringify(draftBrief)}` : ''
    ].filter(Boolean).join('\n\n');
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
  if (mode === 'auto_fix_fill') {
    return {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING' },
        scope: { type: 'STRING' },
        is_exam: { type: 'BOOLEAN' },
        read_minutes: { type: 'INTEGER' },
        title_en: { type: 'STRING' },
        title_or: { type: 'STRING' },
        slug: { type: 'STRING' },
        summary_en: { type: 'STRING' },
        summary_or: { type: 'STRING' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } },
        takeaways_en: { type: 'ARRAY', items: { type: 'STRING' } },
        takeaways_or: { type: 'ARRAY', items: { type: 'STRING' } },
        body_en: { type: 'STRING' },
        body_or: { type: 'STRING' },
        pdf_title_en: { type: 'STRING' },
        pdf_title_or: { type: 'STRING' },
        official_links: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              label_en: { type: 'STRING' },
              label_or: { type: 'STRING' },
              url: { type: 'STRING' },
              is_official: { type: 'BOOLEAN' }
            },
            required: ['label_en', 'url']
          }
        },
        image_prompt: { type: 'STRING' },
        cover_caption_en: { type: 'STRING' },
        cover_caption_or: { type: 'STRING' }
      },
      required: [
        'category', 'scope', 'title_en', 'title_or', 'slug',
        'summary_en', 'summary_or', 'tags', 'takeaways_en', 'takeaways_or',
        'body_en'
      ]
    };
  }
  return null;
}

export function extractOfficialUrlsFromText(rawText) {
  const src = String(rawText || '');
  if (!src) return [];
  const matches = src.match(/(?:https?:\/\/|www\.)[a-z0-9.-]+\.(?:gov\.in|nic\.in|edu\.in|ac\.in|org\.in)(?:\/[^\s<>"')\]},;]*)?/gi) || [];
  const seen = new Set();
  const out = [];
  for (const raw of matches) {
    let url = String(raw || '').replace(/[.,;:!?)]+$/, '').trim();
    if (!url) continue;
    if (/^www\./i.test(url)) url = 'https://' + url;
    let parsed;
    try { parsed = new URL(url); } catch { continue; }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue;
    const norm = parsed.toString().slice(0, 400);
    const key = norm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const host = parsed.hostname.replace(/^www\./i, '');
    const isGov = /(?:^|\.)(gov\.in|nic\.in|edu\.in|ac\.in)$/i.test(host);
    out.push({
      label_en: `${host} Official Portal`,
      label_or: `${host} ସରକାରୀ ପୋର୍ଟାଲ୍`,
      url: norm,
      is_official: isGov
    });
    if (out.length >= 12) break;
  }
  return out;
}

function inferGuideCategory(rawCat, textCorpus) {
  const c = String(rawCat || '').trim().toLowerCase();
  if (VALID_GUIDE_CATEGORIES.has(c)) return c;
  const hay = `${c} ${String(textCorpus || '').slice(0, 2000)}`.toLowerCase();
  if (/\b(scheme|yojana|dbt|scholarship|subsidy|pension|ration|beneficiary|subhadra|kalia|cm kisan)\b/.test(hay)) return 'citizen-scheme';
  if (/\b(syllabus|exam pattern|prelims|mains|pyq|cbt|mock test|opsc|ossc|osssc|otet|osstet|ugc net|cut-?off|roadmap|strategy)\b/.test(hay)) return 'exam-strategy';
  if (/\b(odisha gk|heritage|konark|chilika|dynasty|kalinga|district|river|sanctuary|temple|history of odisha)\b/.test(hay)) return 'odisha-gk';
  return 'how-to';
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
      const maxLen = k === 'body_or' ? 96000 : 12000;
      translations[k] = String(val !== undefined && val !== null ? val : srcFields[k]).trim().slice(0, maxLen);
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

  if (mode === 'auto_fix_fill' || mode === 'guide') {
    const rawTags = Array.isArray(obj.tags) ? obj.tags : String(obj.tags || '').split(',');
    const tags = [...new Set(rawTags.map((t) => String(t || '').replace(/^#+/, '').trim().slice(0, 36)).filter(Boolean))].slice(0, 8);
    const takeawaysEn = (Array.isArray(obj.takeaways_en) ? obj.takeaways_en : [])
      .map((t) => String(t || '').trim().slice(0, 300)).filter(Boolean).slice(0, 10);
    const takeawaysOr = (Array.isArray(obj.takeaways_or) ? obj.takeaways_or : [])
      .map((t) => String(t || '').trim().slice(0, 380)).filter(Boolean).slice(0, 10);
    while (takeawaysOr.length < takeawaysEn.length) {
      takeawaysOr.push(takeawaysEn[takeawaysOr.length]);
    }
    const bodyEn = String(obj.body_en || '').trim().slice(0, 80000);
    const bodyOr = String(obj.body_or || '').trim().slice(0, 96000);
    const computedWords = bodyEn.split(/\s+/).filter(Boolean).length;
    const readMinutes = computedWords >= 40
      ? Math.max(1, Math.min(60, Math.ceil(computedWords / 200)))
      : (Number.isFinite(Number(obj.read_minutes)) && Number(obj.read_minutes) >= 1
        ? Math.min(60, Math.round(Number(obj.read_minutes)))
        : 5);

    if (mode === 'guide') {
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

    const corpus = `${titleEn} ${summaryEn} ${bodyEn.slice(0, 1800)} ${String(extra.pdf_text || '').slice(0, 1800)}`;
    const category = inferGuideCategory(obj.category, corpus);
    const scope = /^national/i.test(String(obj.scope || '')) ? 'National' : 'Odisha';
    const isExam = typeof obj.is_exam === 'boolean'
      ? obj.is_exam
      : (category === 'exam-strategy' || category === 'odisha-gk');

    const seenUrls = new Set();
    const mergedLinks = [];
    const pushLink = (item) => {
      if (!item || !item.url) return;
      const u = String(item.url || '').trim();
      if (!/^https?:\/\//i.test(u) && !(u.startsWith('/') && !u.startsWith('//'))) return;
      const key = u.toLowerCase();
      if (seenUrls.has(key)) return;
      seenUrls.add(key);
      const isOfficial = typeof item.is_official === 'boolean'
        ? item.is_official
        : /\.(?:gov|nic|edu|ac)\.in\b/i.test(u);
      mergedLinks.push({
        label_en: String(item.label_en || item.label || u).trim().slice(0, 160),
        label_or: String(item.label_or || item.label_en || item.label || u).trim().slice(0, 200),
        url: u.slice(0, 400),
        is_official: isOfficial
      });
    };

    if (Array.isArray(obj.official_links)) {
      obj.official_links.slice(0, 12).forEach(pushLink);
    }
    extractOfficialUrlsFromText(`${extra.pdf_text || ''}\n${fallbackInput || ''}`).forEach(pushLink);

    const rawPdfName = String(extra.pdf_filename || '').replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
    const pdfTitleEn = String(obj.pdf_title_en || (rawPdfName ? `${rawPdfName} (Official PDF)` : '')).trim().slice(0, 180);
    const pdfTitleOr = String(obj.pdf_title_or || (pdfTitleEn ? `${pdfTitleEn} (ସରକାରୀ PDF)` : '')).trim().slice(0, 220);

    return {
      category,
      scope,
      is_exam: isExam,
      read_minutes: readMinutes,
      title_en: titleEn,
      title_or: titleOr,
      slug,
      summary_en: summaryEn,
      summary_or: summaryOr,
      tags,
      takeaways_en: takeawaysEn,
      takeaways_or: takeawaysOr,
      body_en: bodyEn,
      body_or: bodyOr,
      pdf_title_en: pdfTitleEn,
      pdf_title_or: pdfTitleOr,
      official_links: mergedLinks.slice(0, 12),
      image_prompt: String(obj.image_prompt || '').trim().slice(0, 500),
      cover_caption_en: String(obj.cover_caption_en || titleEn).trim().slice(0, 220),
      cover_caption_or: String(obj.cover_caption_or || titleOr || titleEn).trim().slice(0, 260)
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

function getGeminiModelPoolForMode(mode) {
  return PRO_FIRST_MODES.has(mode) ? GEMINI_PRO_FIRST_MODELS : GEMINI_FLASH_MODELS;
}

function getWorkersAiPoolForMode(mode) {
  return PRO_FIRST_MODES.has(mode) ? WORKERS_AI_PRO_MODELS : WORKERS_AI_DEFAULT_MODELS;
}

async function callGeminiFreeTier(apiKey, prompt, mode) {
  let lastErr = null;
  const schema = getResponseSchemaForMode(mode);
  const pool = getGeminiModelPoolForMode(mode);
  const maxOut = PRO_FIRST_MODES.has(mode) ? GEMINI_LONG_MAX_OUTPUT_TOKENS : 2048;

  for (const model of pool) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const generationConfig = {
      temperature: mode === 'translate_odia' || mode === 'translate_fields' ? 0.15 : 0.25,
      maxOutputTokens: maxOut,
      responseMimeType: 'application/json'
    };
    if (schema) generationConfig.responseSchema = schema;
    try {
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
        const parts = data &&
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts;
        const text = Array.isArray(parts)
          ? parts.map((p) => (p && typeof p.text === 'string' ? p.text : '')).join('').trim()
          : '';
        if (text) {
          return {
            text,
            model,
            provider: 'gemini_free',
            provider_label: model.includes('pro') ? 'Gemini Pro' : 'Gemini Flash'
          };
        }
        lastErr = new Error(`Gemini ${model} returned empty content.`);
        continue;
      }
      const err = new Error(`Gemini ${model} returned HTTP ${res.status}`);
      err.status = res.status;
      lastErr = err;
    } catch (netErr) {
      lastErr = netErr;
    }
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
  const temp = (mode === 'translate_odia' || mode === 'translate_fields') ? 0.15 : 0.25;
  const pool = getWorkersAiPoolForMode(mode);
  let lastErr = null;
  for (const model of pool) {
    const maxTok = PRO_FIRST_MODES.has(mode)
      ? (model.includes('70b') ? WORKERS_AI_70B_MAX_TOKENS : WORKERS_AI_8B_MAX_TOKENS)
      : 1400;
    try {
      const resp = await aiBinding.run(model, {
        messages,
        max_tokens: maxTok,
        temperature: temp,
        repetition_penalty: 1.06
      });
      const text = unwrapWorkersAiPayload(resp);
      if (text) {
        return {
          text,
          model,
          provider: 'cloudflare_workers_ai',
          provider_label: 'Workers AI'
        };
      }
      lastErr = new Error(`Workers AI ${model} returned an empty response.`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Workers AI failed.');
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
    const limit = key === 'body_or' ? 64000 : 4000;
    const val = String(v || '').trim().slice(0, limit);
    if (!key || !val) continue;
    clean[key] = val;
    count += 1;
    if (count >= 48) break;
  }
  return clean;
}

async function runModelCascade(env, prompt, mode) {
  const geminiKey = env && env.GEMINI_API_KEY ? String(env.GEMINI_API_KEY).trim() : '';
  if (geminiKey) {
    try {
      return await callGeminiFreeTier(geminiKey, prompt, mode);
    } catch (_geminiErr) {
      if (env && env.AI) {
        return await callWorkersAi(env.AI, prompt, mode);
      }
      throw _geminiErr;
    }
  }
  return await callWorkersAi(env && env.AI, prompt, mode);
}

export async function generateAiCoAuthorDraft(env, { mode, input, fields, kind, actorId, pdf_text, pdf_filename, draft, overwrite, depth, skip_body_or }) {
  const cleanMode = String(mode || '').trim().toLowerCase();
  if (!VALID_AI_MODES.has(cleanMode)) {
    const err = new Error('Invalid AI Co-Author mode. Expected job, scheme, mcq, career, guide, auto_fix_fill, translate_odia, translate_fields, or suggest_meta.');
    err.status = 400;
    throw err;
  }

  let cleanInput = String(input || '').trim();
  const cleanPdfText = String(pdf_text || '').trim().slice(0, 64000);
  const cleanPdfFilename = String(pdf_filename || '').trim().slice(0, 180);
  const cleanDraft = (draft && typeof draft === 'object') ? draft : null;
  const cleanDepth = String(depth || 'comprehensive').trim().toLowerCase() === 'standard' ? 'standard' : 'comprehensive';
  const skipBodyOr = Boolean(skip_body_or);
  let cleanFields = null;

  if (cleanMode === 'translate_fields') {
    cleanFields = normalizeBatchFields(fields, cleanInput);
    if (!Object.keys(cleanFields).length) {
      const err = new Error('Provide at least one non-empty English field in `fields` to translate.');
      err.status = 400;
      throw err;
    }
    cleanInput = JSON.stringify(cleanFields);
  } else if (cleanMode === 'auto_fix_fill') {
    const combinedLen = cleanPdfText.length + cleanInput.length
      + String((cleanDraft && cleanDraft.title_en) || '').trim().length
      + String((cleanDraft && cleanDraft.body_en) || '').trim().length
      + String((cleanDraft && cleanDraft.summary_en) || '').trim().length;
    if (combinedLen < 8) {
      const err = new Error('Upload a PDF or enter at least a title, notes, or rough draft before running AI Auto-Fix & Fill.');
      err.status = 400;
      throw err;
    }
    if (!cleanInput && cleanDraft && cleanDraft.title_en) {
      cleanInput = String(cleanDraft.title_en).trim();
    }
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

  // Pass 1: Exhaustive English + Metadata (dedicates 100% of Pass 1 tokens to body_en when auto_fix_fill)
  const useTwoPass = cleanMode === 'auto_fix_fill';
  const extra = {
    fields: cleanFields,
    kind,
    pdf_text: cleanPdfText,
    pdf_filename: cleanPdfFilename,
    draft: cleanDraft,
    overwrite: Boolean(overwrite),
    depth: cleanDepth,
    english_first_pass: useTwoPass
  };
  const prompt = buildPromptForMode(cleanMode, cleanInput, extra);
  const result = await runModelCascade(env, prompt, cleanMode);

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

  const normalized = normalizeStructuredOutput(cleanMode, parsed, cleanInput || cleanPdfFilename || 'Odisha Guide', extra);
  let estimatedNeurons = result.provider === 'gemini_free'
    ? 0
    : Math.max(40, Math.min(450, Math.ceil((prompt.length + result.text.length) / 16)));
  let twoPassTranslation = false;

  // Pass 2 (Server-Side Dedicated Full Odia Translation Pass for auto_fix_fill when caller did not split passes)
  if (useTwoPass && !skipBodyOr && normalized.body_en) {
    const pass2Fields = { body_or: normalized.body_en };
    if (normalized.title_en) pass2Fields.title_or = normalized.title_en;
    if (normalized.summary_en) pass2Fields.summary_or = normalized.summary_en;
    if (normalized.pdf_title_en) pass2Fields.pdf_title_or = normalized.pdf_title_en;
    if (normalized.cover_caption_en) pass2Fields.cover_caption_or = normalized.cover_caption_en;
    (normalized.takeaways_en || []).forEach((tk, idx) => {
      if (tk) pass2Fields[`tk_${idx}`] = tk;
    });
    (normalized.official_links || []).forEach((lnk, idx) => {
      if (lnk && lnk.label_en) pass2Fields[`lnk_${idx}`] = lnk.label_en;
    });

    try {
      const trPrompt = buildPromptForMode('translate_fields', JSON.stringify(pass2Fields), { fields: pass2Fields });
      const trRes = await runModelCascade(env, trPrompt, 'translate_fields');
      const trParsed = extractJsonObject(trRes.text);
      const trNorm = normalizeStructuredOutput('translate_fields', trParsed, '', { fields: pass2Fields });
      const tr = (trNorm && trNorm.translations) || {};
      if (tr.body_or) normalized.body_or = tr.body_or;
      if (tr.title_or) normalized.title_or = tr.title_or;
      if (tr.summary_or) normalized.summary_or = tr.summary_or;
      if (tr.pdf_title_or) normalized.pdf_title_or = tr.pdf_title_or;
      if (tr.cover_caption_or) normalized.cover_caption_or = tr.cover_caption_or;
      if (Array.isArray(normalized.takeaways_en) && normalized.takeaways_en.length) {
        normalized.takeaways_or = normalized.takeaways_en.map((tk, idx) => tr[`tk_${idx}`] || (normalized.takeaways_or && normalized.takeaways_or[idx]) || tk);
      }
      if (Array.isArray(normalized.official_links)) {
        normalized.official_links = normalized.official_links.map((lnk, idx) => ({
          ...lnk,
          label_or: tr[`lnk_${idx}`] || lnk.label_or || lnk.label_en
        }));
      }
      twoPassTranslation = true;
      if (trRes.provider !== 'gemini_free') {
        estimatedNeurons += Math.max(40, Math.min(450, Math.ceil((trPrompt.length + trRes.text.length) / 16)));
      }
    } catch (_pass2Err) {
      // Keep Pass 1 result intact even if Pass 2 encounters a transient error
    }
  }

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
    depth: cleanDepth,
    two_pass_translation: twoPassTranslation,
    provider: result.provider,
    provider_label: result.provider_label || (result.provider === 'gemini_free' ? 'Gemini' : 'Workers AI'),
    model: result.model,
    estimated_neurons: estimatedNeurons,
    usage: usageAfter,
    data: normalized
  };
}

// ============================================================================
// GEMINI-FIRST EDITORIAL IMAGE GENERATION -> WORKERS AI FLUX -> SVG FALLBACK
// Stores directly in `cso-media` R2 (`guides/ai-<timestamp>-<slug>.<ext>`)
// ============================================================================

function base64ToUint8Array(b64) {
  const clean = String(b64 || '').replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  if (!clean) return null;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out.byteLength ? out : null;
}

function detectImageBytesFormat(bytes, fallbackMime = 'image/jpeg') {
  if (bytes && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (bytes && bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (bytes && bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  const lower = String(fallbackMime || '').toLowerCase();
  if (lower.includes('png')) return { mime: 'image/png', ext: 'png' };
  if (lower.includes('webp')) return { mime: 'image/webp', ext: 'webp' };
  if (lower.includes('svg')) return { mime: 'image/svg+xml', ext: 'svg' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

export function synthesizeEditorialImagePrompt({ prompt, title_en, category, scope }) {
  const custom = String(prompt || '').trim().slice(0, 600);
  const title = String(title_en || 'Odisha Education and Governance Guide').trim().slice(0, 160);
  const cat = String(category || 'how-to').trim().toLowerCase();
  const region = /^national/i.test(String(scope || '')) ? 'India National' : 'Odisha, India';

  if (custom) {
    return `${custom}. Clean editorial photography style, crisp lighting, balanced composition, strictly no text, no letters, no numbers, no watermark.`;
  }

  const sceneByCat = {
    'how-to': `Warm daylight editorial photograph of a student and citizen in ${region} calmly using a laptop at a clean modern study desk with neat folders, teal and sandstone civic tones, shallow depth of field`,
    'exam-strategy': `Clean editorial photograph of a focused civil services study desk in ${region} with organized notebooks, wooden pen, modern tablet showing abstract geometric progress visuals, warm natural window light, university library atmosphere`,
    'citizen-scheme': `Uplifting daylight editorial photograph representing public welfare and digital governance in ${region}, vibrant green campus and community center, hopeful students and citizens, crisp documentary lighting`,
    'odisha-gk': `Stunning editorial magazine photograph inspired by Odisha heritage architecture, carved sandstone artistry, serene coastal rivers, and lush Eastern Ghats landscape at golden sunrise`
  };
  const baseScene = sceneByCat[cat] || sceneByCat['how-to'];
  return `${baseScene}, visually themed around "${title}". High-resolution editorial cover banner, strictly no text, no typography, no words, no numbers, no watermarks, no logos.`;
}

function escSvgXml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEditorialSvgBanner({ title_en, category, scope }) {
  const title = String(title_en || 'Common Sense Odisha Informative Guide').trim().slice(0, 84);
  const catLabels = {
    'how-to': 'STEP-BY-STEP HOW-TO GUIDE',
    'exam-strategy': 'EXAM STRATEGY & STUDY HANDBOOK',
    'citizen-scheme': 'CITIZEN & SCHEME EXPLAINER',
    'odisha-gk': 'ODISHA GK & HERITAGE'
  };
  const badge = catLabels[String(category || '').toLowerCase()] || 'INFORMATIVE GUIDE';
  const region = /^national/i.test(String(scope || '')) ? 'NATIONAL · INDIA' : 'ODISHA STATE PORTAL';
  const words = title.split(/\s+/);
  const line1 = [];
  const line2 = [];
  for (const w of words) {
    if (line1.join(' ').length + w.length + 1 <= 40 || line1.length === 0) line1.push(w);
    else line2.push(w);
  }
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" role="img" aria-label="' + escSvgXml(title) + '">',
    '  <defs>',
    '    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
    '      <stop offset="0%" stop-color="#0b2545"/>',
    '      <stop offset="55%" stop-color="#0f766e"/>',
    '      <stop offset="100%" stop-color="#134e4a"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <rect width="1200" height="675" fill="url(#bg)"/>',
    '  <circle cx="1040" cy="140" r="190" fill="#ffffff" fill-opacity="0.06"/>',
    '  <circle cx="1040" cy="140" r="120" fill="none" stroke="#f59e0b" stroke-opacity="0.35" stroke-width="3"/>',
    '  <circle cx="160" cy="590" r="220" fill="#ffffff" fill-opacity="0.05"/>',
    '  <rect x="76" y="76" width="440" height="44" rx="22" fill="#ffffff" fill-opacity="0.14"/>',
    '  <text x="102" y="105" fill="#fef3c7" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" letter-spacing="1.5">' + escSvgXml(badge) + '</text>',
    '  <text x="76" y="275" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="800">' + escSvgXml(line1.join(' ')) + '</text>',
    line2.length ? '  <text x="76" y="340" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700">' + escSvgXml(line2.join(' ').slice(0, 44)) + '</text>' : '',
    '  <line x1="76" y1="415" x2="310" y2="415" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/>',
    '  <text x="76" y="565" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700">COMMON SENSE ODISHA · ' + escSvgXml(region) + '</text>',
    '</svg>'
  ].filter(Boolean).join('\n');
  return new TextEncoder().encode(svg);
}

async function callGeminiNativeImage(apiKey, finalPrompt, aspectRatio) {
  let lastErr = null;

  // 1. Primary: Imagen 3 (`imagen-3.0-generate-002:predict`)
  try {
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(imagenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: finalPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectRatio || '16:9',
          outputOptions: { mimeType: 'image/jpeg' }
        }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const pred = data && Array.isArray(data.predictions) ? data.predictions[0] : null;
      const b64 = pred && (pred.bytesBase64Encoded || (pred.image && pred.image.bytesBase64Encoded));
      const bytes = base64ToUint8Array(b64);
      if (bytes) {
        const fmt = detectImageBytesFormat(bytes, (pred && pred.mimeType) || 'image/jpeg');
        return { bytes, mime: fmt.mime, ext: fmt.ext, provider: 'gemini_imagen', provider_label: 'Gemini', model: 'imagen-3.0-generate-002' };
      }
    } else {
      lastErr = new Error(`Gemini Imagen 3 returned HTTP ${res.status}`);
    }
  } catch (err) {
    lastErr = err;
  }

  // 2. Secondary: Gemini Native Image (`gemini-2.5-flash-image:generateContent`)
  try {
    const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(nativeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          const inl = p && (p.inlineData || p.inline_data);
          if (inl && inl.data) {
            const bytes = base64ToUint8Array(inl.data);
            if (bytes) {
              const fmt = detectImageBytesFormat(bytes, inl.mimeType || inl.mime_type || 'image/jpeg');
              return { bytes, mime: fmt.mime, ext: fmt.ext, provider: 'gemini_image', provider_label: 'Gemini', model: 'gemini-2.5-flash-image' };
            }
          }
        }
      }
      lastErr = new Error('Gemini 2.5 Flash Image returned no image data.');
    } else {
      lastErr = new Error(`Gemini 2.5 Flash Image returned HTTP ${res.status}`);
    }
  } catch (err) {
    lastErr = err;
  }

  throw lastErr || new Error('Gemini image generation failed.');
}

async function callWorkersAiFluxImage(aiBinding, finalPrompt) {
  if (!aiBinding || typeof aiBinding.run !== 'function') {
    throw new Error('Workers AI binding unavailable.');
  }
  const resp = await aiBinding.run(WORKERS_AI_IMAGE_MODEL, {
    prompt: finalPrompt,
    steps: 4
  });
  let bytes = null;
  if (resp && typeof resp === 'object' && typeof resp.image === 'string') {
    bytes = base64ToUint8Array(resp.image);
  } else if (resp instanceof Uint8Array) {
    bytes = resp;
  } else if (resp instanceof ArrayBuffer) {
    bytes = new Uint8Array(resp);
  } else if (resp && typeof resp.getReader === 'function') {
    const ab = await new Response(resp).arrayBuffer();
    bytes = new Uint8Array(ab);
  }
  if (!bytes || !bytes.byteLength) {
    throw new Error('Workers AI FLUX returned empty image bytes.');
  }
  const fmt = detectImageBytesFormat(bytes, 'image/jpeg');
  return {
    bytes,
    mime: fmt.mime,
    ext: fmt.ext,
    provider: 'cloudflare_workers_ai',
    provider_label: 'Workers AI',
    model: WORKERS_AI_IMAGE_MODEL
  };
}

export async function generateAiEditorialImage(env, { prompt, title_en, category, scope, aspect_ratio, actorId, actorEmail }) {
  const cleanTitle = String(title_en || '').trim().slice(0, 180) || 'Common Sense Odisha Guide';
  const cleanCat = VALID_GUIDE_CATEGORIES.has(String(category || '').trim().toLowerCase())
    ? String(category).trim().toLowerCase()
    : 'how-to';
  const cleanScope = /^national/i.test(String(scope || '')) ? 'National' : 'Odisha';
  const cleanAspect = ['16:9', '4:3', '1:1', '3:2'].includes(String(aspect_ratio || '')) ? String(aspect_ratio) : '16:9';
  const finalPrompt = synthesizeEditorialImagePrompt({
    prompt,
    title_en: cleanTitle,
    category: cleanCat,
    scope: cleanScope
  });

  const geminiKey = env && env.GEMINI_API_KEY ? String(env.GEMINI_API_KEY).trim() : '';
  let generated = null;

  if (geminiKey) {
    try {
      generated = await callGeminiNativeImage(geminiKey, finalPrompt, cleanAspect);
    } catch (_gemErr) {
      generated = null;
    }
  }

  if (!generated && env && env.AI) {
    try {
      generated = await callWorkersAiFluxImage(env.AI, finalPrompt);
    } catch (_cfErr) {
      generated = null;
    }
  }

  if (!generated) {
    const svgBytes = buildEditorialSvgBanner({ title_en: cleanTitle, category: cleanCat, scope: cleanScope });
    generated = {
      bytes: svgBytes,
      mime: 'image/svg+xml',
      ext: 'svg',
      provider: 'svg_fallback',
      provider_label: 'Editorial Banner Fallback',
      model: 'editorial-svg-banner'
    };
  }

  const ts = Date.now();
  const baseSlug = slugifyText(cleanTitle).slice(0, 56) || 'guide-cover';
  const ext = generated.ext || 'jpg';
  const filename = `ai-${ts}-${baseSlug}.${ext}`;
  const r2Key = `guides/${filename}`;
  const publicUrl = `/api/media/${r2Key}`;

  if (env && env.MEDIA && typeof env.MEDIA.put === 'function') {
    await env.MEDIA.put(r2Key, generated.bytes, {
      httpMetadata: {
        contentType: generated.mime,
        cacheControl: 'public, max-age=31536000, immutable'
      }
    });
  }

  const altEn = `${cleanTitle} — editorial illustration (${cleanScope})`;
  const captionEn = `${cleanTitle} — Common Sense Odisha Editorial Guide`;
  const captionOr = `${cleanTitle} — କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ମାର୍ଗଦର୍ଶିକା`;

  // Register metadata in Admin Media Library (`media_files` + legacy `media_assets`, best-effort)
  if (env && env.DB) {
    const fileId = `mfile-ai-${ts.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const fileSlug = `${baseSlug}-ai-${ts.toString(36)}`.slice(0, 96);
    try {
      await env.DB.prepare(
        `INSERT INTO media_files (id, slug, folder_id, file_category, storage_provider, r2_key, public_url, original_filename, title_en, title_or, alt_or_caption_en, alt_or_caption_or, mime_type, file_size_bytes, access_tier, tags_json, status, uploaded_by)
         VALUES (?, ?, 'mf-branding-images', 'image', 'r2_primary', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', ?, 'published', ?)`
      ).bind(
        fileId, fileSlug, r2Key, publicUrl, filename, cleanTitle, captionOr, altEn, captionOr,
        generated.mime, generated.bytes.byteLength,
        JSON.stringify(['ai-generated', 'guide', cleanCat]),
        String(actorEmail || actorId || 'admin').slice(0, 120)
      ).run();
    } catch (_e1) {}
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO media_assets (id, object_key, kind, mime_type, size_bytes, original_name, uploaded_by)
         VALUES (?, ?, 'image', ?, ?, ?, ?)`
      ).bind(
        fileId, r2Key, generated.mime, generated.bytes.byteLength, filename, String(actorId || 'admin')
      ).run();
    } catch (_e2) {}
  }

  await ensureAiCoauthorSchema(env);
  await logAiGeneration(env, {
    actorId: actorId || 'admin',
    targetModule: 'generate_image',
    provider: generated.provider,
    model: generated.model,
    estimatedNeurons: generated.provider === 'cloudflare_workers_ai' ? 120 : 0,
    status: 'ok'
  });

  return {
    ok: true,
    url: publicUrl,
    key: r2Key,
    filename,
    mime_type: generated.mime,
    size_bytes: generated.bytes.byteLength,
    provider: generated.provider,
    provider_label: generated.provider_label,
    model: generated.model,
    prompt: finalPrompt,
    alt_en: altEn,
    caption_en: captionEn,
    caption_or: captionOr
  };
}
