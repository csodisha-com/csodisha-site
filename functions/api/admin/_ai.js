// POST /api/admin/ai/generate-page — Workers AI / Gemini / deterministic Odisha draft generator.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import { cleanStr } from '../../_lib/validate.js';

function slugify(s) {
  const k = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  return '/' + (k || 'odisha-guide') + '/';
}

function deterministicDraft(topic, sourceNotes, category, style, language) {
  const isOdia = language === 'Odia (ଓଡ଼ିଆ)';
  const isBi = language === 'Bilingual English + Odia';
  const baseTitle = topic.length > 56 ? topic.slice(0, 56).trim() : topic;
  const title = (isOdia ? baseTitle + ' | CS Odisha (ଓଡ଼ିଆ)' : baseTitle + ' | CS Odisha').slice(0, 60);
  const slug = slugify(topic);
  const metaDesc = (
    'Complete ' + topic + ' guide on Common Sense Odisha: eligibility, key dates, official notification links, and free CBT preparation resources.'
  ).slice(0, 158);
  const odiaSub = (isOdia || isBi) ? (topic + ' — ଓଡ଼ିଶା ପରୀକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା ଓ ମାର୍ଗଦର୍ଶିକା') : '';
  const notesSnippet = sourceNotes ? sourceNotes.slice(0, 320) : ('Detailed ' + style.toLowerCase() + ' for ' + topic + ' in ' + category + '.');

  return {
    title,
    slug,
    meta_description: metaDesc,
    hero_title: baseTitle,
    hero_subtitle: isOdia ? odiaSub : ('Verified ' + style.toLowerCase() + ' for Odisha aspirants (' + category + ').'),
    odia_subtitle: odiaSub,
    blocks: [
      { type: 'richtext', heading: isOdia ? 'ସଂକ୍ଷିପ୍ତ ବିବରଣୀ (Overview)' : 'Overview & Highlights', body: notesSnippet },
      { type: 'key_dates', heading: 'Important Dates & Schedule', body: 'Notification: Open | Last Date: Verify Official PDF | Exam Date: As Notified', rows: [
        { label: 'Notification Release', value: 'Published' },
        { label: 'Online Application Window', value: 'Active — Check Official Portal' },
        { label: 'Exam / Selection Stage', value: 'To Be Announced' }
      ] },
      { type: 'notice', heading: 'Verification Notice', body: 'Always cross-check final dates and fee rules on the official Odisha commission portal before applying.' },
      { type: 'faq', heading: 'Frequently Asked Questions', question: 'Where can candidates verify official updates for ' + baseTitle + '?', answer: 'Visit the official Odisha commission portal linked on this page and bookmark CS Odisha for live alerts.' }
    ],
    provider: 'structured-fallback'
  };
}

function normalizeAiPayload(raw, fallback) {
  const out = raw && typeof raw === 'object' ? raw : {};
  const title = cleanStr(out.title || fallback.title, 70) || fallback.title;
  const slug = slugify(out.slug || title);
  const meta = cleanStr(out.meta_description || fallback.meta_description, 165) || fallback.meta_description;
  const heroTitle = cleanStr(out.hero_title || title, 120) || title;
  const heroSub = cleanStr(out.hero_subtitle || fallback.hero_subtitle, 220) || fallback.hero_subtitle;
  const odiaSub = cleanStr(out.odia_subtitle || fallback.odia_subtitle, 220);
  const rawBlocks = Array.isArray(out.blocks) && out.blocks.length ? out.blocks : fallback.blocks;
  const blocks = rawBlocks.slice(0, 12).map(b => ({
    type: ['richtext', 'notice', 'key_dates', 'faq', 'official_links'].includes(b && b.type) ? b.type : 'richtext',
    heading: cleanStr((b && (b.heading || b.title)) || 'Section', 120),
    body: cleanStr((b && (b.body || b.text)) || '', 1500),
    rows: Array.isArray(b && b.rows) ? b.rows.slice(0, 20).map(r => ({ label: cleanStr(r.label, 80), value: cleanStr(r.value, 120) })) : undefined,
    question: b && b.question ? cleanStr(b.question, 200) : undefined,
    answer: b && b.answer ? cleanStr(b.answer, 600) : undefined
  }));
  return { title, slug, meta_description: meta, hero_title: heroTitle, hero_subtitle: heroSub, odia_subtitle: odiaSub, blocks };
}

function extractJson(text) {
  const s = String(text || '');
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function handleAiGeneratePage(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  const body = await readJson(request, 50000);
  const topic = cleanStr(body.topic, 300);
  if (!topic || topic.length < 3) throw validationError({ topic: 'Enter a topic or exam name (min 3 chars)' });
  const sourceNotes = cleanStr(body.sourceNotes || '', 4000);
  const category = cleanStr(body.category || 'Exam Guide', 60);
  const contentStyle = cleanStr(body.contentStyle || 'Exam Recruitment Guide', 80);
  const language = cleanStr(body.language || 'English', 60);

  const fallback = deterministicDraft(topic, sourceNotes, category, contentStyle, language);
  const prompt = [
    'You are an editorial assistant for Common Sense Odisha (csodisha.com), an Odisha government jobs and exam portal.',
    `Topic: ${topic}`,
    `Category: ${category}`,
    `Content Style: ${contentStyle}`,
    `Language: ${language}`,
    sourceNotes ? `Source Notes:\n${sourceNotes}` : '',
    'Return ONLY valid JSON matching this exact schema:',
    '{"title":"50-60 char SEO title","slug":"/kebab-case/","meta_description":"145-160 char meta description","hero_title":"Hero H1","hero_subtitle":"Hero subtitle","odia_subtitle":"Optional Odia subtitle if Odia or Bilingual","blocks":[{"type":"richtext|notice|key_dates|faq","heading":"Heading","body":"Body text","rows":[{"label":"Label","value":"Value"}],"question":"FAQ Q","answer":"FAQ A"}]}'
  ].filter(Boolean).join('\n\n');

  let parsed = null;
  let provider = 'structured-fallback';

  if (env.AI && typeof env.AI.run === 'function') {
    try {
      const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'Output strictly valid JSON with no markdown fences.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1400
      });
      parsed = extractJson(aiRes && (aiRes.response || JSON.stringify(aiRes)));
      if (parsed) provider = 'workers-ai';
    } catch (_) {}
  }

  if (!parsed && env.GEMINI_API_KEY) {
    try {
      const gr = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (gr.ok) {
        const gj = await gr.json();
        const txt = gj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        parsed = extractJson(txt);
        if (parsed) provider = 'gemini';
      }
    } catch (_) {}
  }

  const result = normalizeAiPayload(parsed, fallback);
  result.provider = provider;
  await audit(env, request, actor, 'ai.generate_page', 'site_pages', result.slug, { topic, language, provider });
  return json(result);
}
