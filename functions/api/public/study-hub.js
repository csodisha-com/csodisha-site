/**
 * Common Sense Odisha — Unified Live Study Materials, PYQs & PDFs Hub API (v375)
 * Endpoint: GET /api/public/study-hub
 *
 * Aggregates published study resources from D1:
 *   1. `study_articles` (published, non-future-scheduled)
 *   2. `resources` (published, non-deleted)
 *   3. `informative_guides` (published & matched to study-notes / syllabus / pyq / exam-prep)
 *   4. `mock_tests` (published)
 * Merged with 7 structured Odisha core syllabus, notes & PYQ packs.
 */
import { json } from '../../_lib/http.js';
import { matchGuideToTopic } from '../../_lib/trending-topics.js';

function cleanText(val, max = 260) {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

export const CORE_STUDY_PACKS = [
  {
    id: 'core-opsc-oas-pyq',
    title_en: 'OPSC OAS Prelims & Mains Previous Year Papers (2018–2025) Solved Pack',
    title_or: 'OPSC OAS ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନପତ୍ର (୨୦୧୮–୨୦୨୫)',
    resource_type: 'Previous Year Paper (PYQ)',
    format_tab: 'pyq',
    exam_tag: 'OPSC',
    exam_key: 'opsc',
    subject: 'General Studies',
    subject_key: 'gs',
    language: 'Bilingual EN + ଓଡ଼ିଆ',
    language_key: 'bilingual',
    file_format: 'PDF',
    page_or_question_count: '68 Pages · PYQ Pack',
    year: '2025',
    pdf_url: '',
    detail_url: '/study-library/?q=OPSC',
    is_offline_ready: true,
    source_type: 'study'
  },
  {
    id: 'core-ossc-cgl-solved',
    title_en: 'OSSC CGLRE Solved Question Papers & Quantitative Reasoning Handbook',
    title_or: 'OSSC CGL ସମାଧାନ ପ୍ରଶ୍ନପତ୍ର ଓ ଗଣିତ-ତର୍କଶାସ୍ତ୍ର ପୁସ୍ତିକା',
    resource_type: 'Previous Year Paper (PYQ)',
    format_tab: 'pyq',
    exam_tag: 'OSSC',
    exam_key: 'ossc',
    subject: 'Reasoning & Math',
    subject_key: 'math-reasoning',
    language: 'Bilingual EN + ଓଡ଼ିଆ',
    language_key: 'bilingual',
    file_format: 'PDF',
    page_or_question_count: '54 Pages · Solved PYQs',
    year: '2025',
    pdf_url: '',
    detail_url: '/study-library/?q=OSSC',
    is_offline_ready: true,
    source_type: 'study'
  },
  {
    id: 'core-osssc-ri-peo-notes',
    title_en: 'OSSSC RI, ARI, Amin & PEO Complete Syllabus + Computer & Odia Notes',
    title_or: 'OSSSC RI, ARI, ଅମିନ୍ ଓ PEO ସମ୍ପୂର୍ଣ୍ଣ ସିଲାବସ୍ ଓ ନୋଟ୍ସ',
    resource_type: 'Official Syllabus PDF',
    format_tab: 'syllabus',
    exam_tag: 'OSSSC',
    exam_key: 'osssc',
    subject: 'Computer & Current Affairs',
    subject_key: 'gs',
    language: 'Bilingual EN + ଓଡ଼ିଆ',
    language_key: 'bilingual',
    file_format: 'PDF',
    page_or_question_count: '42 Pages · PDF',
    year: '2026',
    pdf_url: '',
    detail_url: '/study-library/?q=OSSSC',
    is_offline_ready: true,
    source_type: 'study'
  },
  {
    id: 'core-otet-osstet-cdp',
    title_en: 'OTET & OSSTET Child Development & Pedagogy (CDP) Bilingual Master Notes',
    title_or: 'OTET ଓ OSSTET ଶିଶୁ ବିକାଶ ଓ ଶିକ୍ଷାଶାସ୍ତ୍ର (CDP) ମାଷ୍ଟର ନୋଟ୍ସ',
    resource_type: 'Study Notes',
    format_tab: 'notes',
    exam_tag: 'OTET / OSSTET',
    exam_key: 'otet-osstet',
    subject: 'Teaching Pedagogy',
    subject_key: 'pedagogy',
    language: 'Bilingual EN + ଓଡ଼ିଆ',
    language_key: 'bilingual',
    file_format: 'Interactive Guide',
    page_or_question_count: '48 Pages · Notes + MCQs',
    year: '2026',
    pdf_url: '',
    detail_url: '/guides/?category=study-notes&q=OTET',
    is_offline_ready: true,
    source_type: 'study'
  },
  {
    id: 'core-oavs-odia-grammar',
    title_en: 'OAVS Teaching Aptitude, NEP 2020 & Odia Grammar High-Yield Notes',
    title_or: 'OAVS ଶିକ୍ଷଣ ଯୋଗ୍ୟତା, NEP ୨୦୨୦ ଓ ଓଡ଼ିଆ ବ୍ୟାକରଣ ନୋଟ୍ସ',
    resource_type: 'Study Notes',
    format_tab: 'notes',
    exam_tag: 'OAVS',
    exam_key: 'oavs',
    subject: 'English & Odia Grammar',
    subject_key: 'odia-english',
    language: 'Bilingual EN + ଓଡ଼ିଆ',
    language_key: 'bilingual',
    file_format: 'Interactive Guide',
    page_or_question_count: '36 Pages · Revision Pack',
    year: '2026',
    pdf_url: '',
    detail_url: '/guides/?category=study-notes&q=OAVS',
    is_offline_ready: true,
    source_type: 'study'
  },
  {
    id: 'core-odisha-gk-capsule',
    title_en: 'Odisha History, Geography, Polity & 30-District GK Bilingual Capsule',
    title_or: 'ଓଡ଼ିଶା ଇତିହାସ, ଭୂଗୋଳ, ରାଜନୀତି ଓ ୩୦ ଜିଲ୍ଲା ସାଧାରଣ ଜ୍ଞାନ କ୍ୟାପସୁଲ୍',
    resource_type: 'Bilingual Capsule',
    format_tab: 'notes',
    exam_tag: 'Odisha GK',
    exam_key: 'odisha-gk',
    subject: 'Odisha GK & History',
    subject_key: 'odisha-gk',
    language: 'Bilingual EN + ଓଡ଼ିଆ',
    language_key: 'bilingual',
    file_format: 'Interactive Guide',
    page_or_question_count: '60 Pages · Bilingual Capsule',
    year: '2026',
    pdf_url: '',
    detail_url: '/guides/?category=odisha-gk',
    is_offline_ready: true,
    source_type: 'study'
  },
  {
    id: 'core-ugc-net-paper1',
    title_en: 'NTA UGC NET Paper-I Teaching, Research Aptitude & ICT Complete Notes',
    title_or: 'NTA UGC NET ପେପର୍-୧ ଶିକ୍ଷଣ, ଗବେଷଣା ଓ ICT ସମ୍ପୂର୍ଣ୍ଣ ନୋଟ୍ସ',
    resource_type: 'Study Notes',
    format_tab: 'notes',
    exam_tag: 'UGC NET',
    exam_key: 'ugc-net',
    subject: 'Teaching Pedagogy',
    subject_key: 'pedagogy',
    language: 'English',
    language_key: 'en',
    file_format: 'PDF',
    page_or_question_count: '52 Pages · Paper-I Notes',
    year: '2026',
    pdf_url: '',
    detail_url: '/guides/?category=study-notes&q=UGC+NET',
    is_offline_ready: true,
    source_type: 'study'
  }
];

function inferExam(blob) {
  const hay = String(blob || '').toLowerCase();
  if (/\bopsc\b|\boas\b|\bocs\b/.test(hay)) return { exam_tag: 'OPSC', exam_key: 'opsc' };
  if (/\bosssc\b|\bpeo\b|\bari\b|\bamin\b/.test(hay)) return { exam_tag: 'OSSSC', exam_key: 'osssc' };
  if (/\bossc\b|\bcgl\b/.test(hay)) return { exam_tag: 'OSSC', exam_key: 'ossc' };
  if (/\boavs\b|adarsha/.test(hay)) return { exam_tag: 'OAVS', exam_key: 'oavs' };
  if (/\botet\b|\bosstet\b|\btet\b|\bb\.?ed\b/.test(hay)) return { exam_tag: 'OTET / OSSTET', exam_key: 'otet-osstet' };
  if (/\bugc\b|\bnet\b|\bjrf\b|\bnta\b/.test(hay)) return { exam_tag: 'UGC NET', exam_key: 'ugc-net' };
  return { exam_tag: 'Odisha GK', exam_key: 'odisha-gk' };
}

function inferSubject(blob) {
  const hay = String(blob || '').toLowerCase();
  if (/odisha|utkal|district|heritage|chilika|history|geography/.test(hay)) return { subject: 'Odisha GK & History', subject_key: 'odisha-gk' };
  if (/pedagogy|cdp|child development|teaching|nep|research aptitude/.test(hay)) return { subject: 'Teaching Pedagogy', subject_key: 'pedagogy' };
  if (/math|quant|reasoning|arithmetic|di\b/.test(hay)) return { subject: 'Reasoning & Math', subject_key: 'math-reasoning' };
  if (/odia|grammar|english|vyakarana|comprehension/.test(hay)) return { subject: 'English & Odia Grammar', subject_key: 'odia-english' };
  if (/computer|ict|current affairs/.test(hay)) return { subject: 'Computer & Current Affairs', subject_key: 'gs' };
  return { subject: 'General Studies', subject_key: 'gs' };
}

function inferResourceType(rawType, blob, sourceType) {
  if (sourceType === 'mock') return { resource_type: 'MCQ Practice Set', format_tab: 'mcq', file_format: 'CBT Quiz' };
  const hay = `${rawType || ''} ${blob || ''}`.toLowerCase();
  if (/\bpyq\b|previous\s*year|solved\s*paper|question\s*paper/.test(hay)) {
    return { resource_type: 'Previous Year Paper (PYQ)', format_tab: 'pyq', file_format: 'PDF' };
  }
  if (/\bsyllabus\b|exam\s*pattern/.test(hay)) {
    return { resource_type: 'Official Syllabus PDF', format_tab: 'syllabus', file_format: 'PDF' };
  }
  if (/\bmcq\b|\bquiz\b|practice\s*set/.test(hay)) {
    return { resource_type: 'MCQ Practice Set', format_tab: 'mcq', file_format: 'CBT Quiz' };
  }
  if (/capsule|gk\b/.test(hay)) {
    return { resource_type: 'Bilingual Capsule', format_tab: 'notes', file_format: 'Interactive Guide' };
  }
  return { resource_type: 'Study Notes', format_tab: 'notes', file_format: 'Interactive Guide' };
}

function inferLanguage(titleOr, summaryOr) {
  if (cleanText(titleOr, 20) || cleanText(summaryOr, 20)) {
    return { language: 'Bilingual EN + ଓଡ଼ିଆ', language_key: 'bilingual' };
  }
  return { language: 'English', language_key: 'en' };
}

function extractYear(rawYear, blob) {
  const y = String(rawYear || '').match(/\b(202[0-9])\b/);
  if (y) return y[1];
  const m = String(blob || '').match(/\b(202[0-9])\b/);
  return m ? m[1] : '2026';
}

export async function buildStudyHubPayload(db) {
  const [studyRows, resourceRows, guideRows, mockRows] = db
    ? await Promise.all([
        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, exam_tag, resource_type,
                  pdf_url, published_at, updated_at
           FROM study_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 100`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title, title_or, summary, exam_tag, resource_type, file_url, year,
                  published_at, updated_at
           FROM resources
           WHERE status = 'published' AND deleted_at IS NULL
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 80`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, tags, scope,
                  read_minutes, published_at, updated_at
           FROM informative_guides
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 120`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, exam_category, duration_minutes,
                  published_at, updated_at
           FROM mock_tests
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 60`
        ).all().then((r) => r.results || []).catch(() => [])
      ])
    : [[], [], [], []];

  const items = [];
  const seen = new Set();

  for (const s of studyRows) {
    const slug = cleanText(s.slug || s.id, 140);
    const detailUrl = slug ? `/study-library/?slug=${encodeURIComponent(slug)}` : '/study-library/';
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    const blob = `${s.title_en || ''} ${s.summary_en || ''} ${s.exam_tag || ''} ${s.resource_type || ''}`;
    const exam = inferExam(blob);
    const subj = inferSubject(blob);
    const rt = inferResourceType(s.resource_type, blob, 'study');
    const lang = inferLanguage(s.title_or, s.summary_or);
    const pdfUrl = safeUrl(s.pdf_url);

    items.push({
      id: `study_${s.id || slug}`,
      title_en: cleanText(s.title_en, 220),
      title_or: cleanText(s.title_or, 220),
      resource_type: rt.resource_type,
      format_tab: rt.format_tab,
      exam_tag: cleanText(s.exam_tag, 40) || exam.exam_tag,
      exam_key: exam.exam_key,
      subject: subj.subject,
      subject_key: subj.subject_key,
      language: lang.language,
      language_key: lang.language_key,
      file_format: pdfUrl ? 'PDF' : rt.file_format,
      page_or_question_count: pdfUrl ? 'Downloadable PDF' : 'Study Module',
      year: extractYear('', blob),
      pdf_url: pdfUrl,
      detail_url: detailUrl,
      is_offline_ready: true,
      source_type: 'study'
    });
  }

  for (const r of resourceRows) {
    const slug = cleanText(r.slug || r.id, 140);
    const pdfUrl = safeUrl(r.file_url);
    const detailUrl = pdfUrl || `/resources/`;
    const dedupeKey = `res_${slug}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const blob = `${r.title || ''} ${r.summary || ''} ${r.exam_tag || ''} ${r.resource_type || ''}`;
    const exam = inferExam(blob);
    const subj = inferSubject(blob);
    const rt = inferResourceType(r.resource_type, blob, 'study');
    const lang = inferLanguage(r.title_or, '');

    items.push({
      id: dedupeKey,
      title_en: cleanText(r.title, 220),
      title_or: cleanText(r.title_or, 220),
      resource_type: rt.resource_type,
      format_tab: rt.format_tab,
      exam_tag: cleanText(r.exam_tag, 40) || exam.exam_tag,
      exam_key: exam.exam_key,
      subject: subj.subject,
      subject_key: subj.subject_key,
      language: lang.language,
      language_key: lang.language_key,
      file_format: pdfUrl ? 'PDF' : rt.file_format,
      page_or_question_count: pdfUrl ? 'PDF Pack' : 'Study Resource',
      year: extractYear(r.year, blob),
      pdf_url: pdfUrl,
      detail_url: detailUrl,
      is_offline_ready: true,
      source_type: 'study'
    });
  }

  for (const g of guideRows) {
    const blob = `${g.title_en || ''} ${g.summary_en || ''} ${g.tags || ''} ${g.category || ''}`;
    const isStudy =
      matchGuideToTopic(g, 'study-notes') ||
      matchGuideToTopic(g, 'exam-prep') ||
      /(study-notes|syllabus|pyq|notes|revision)/i.test(`${g.category || ''} ${g.tags || ''}`);
    if (!isStudy) continue;

    const slug = cleanText(g.slug || g.id, 140);
    const detailUrl = slug ? `/guides/${encodeURIComponent(slug)}` : '/guides/?category=study-notes';
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    const exam = inferExam(blob);
    const subj = inferSubject(blob);
    const rt = inferResourceType(g.category, blob, 'guide');
    const lang = inferLanguage(g.title_or, g.summary_or);
    const mins = Number(g.read_minutes || 6);

    items.push({
      id: `guide_${g.id || slug}`,
      title_en: cleanText(g.title_en, 220),
      title_or: cleanText(g.title_or, 220),
      resource_type: rt.resource_type,
      format_tab: rt.format_tab,
      exam_tag: exam.exam_tag,
      exam_key: exam.exam_key,
      subject: subj.subject,
      subject_key: subj.subject_key,
      language: lang.language,
      language_key: lang.language_key,
      file_format: 'Interactive Guide',
      page_or_question_count: `${mins} min read · Guide`,
      year: extractYear('', blob),
      pdf_url: '',
      detail_url: detailUrl,
      is_offline_ready: true,
      source_type: 'guide'
    });
  }

  for (const m of mockRows) {
    const slug = cleanText(m.slug || m.id, 140);
    const detailUrl = `/mock-tests/?test=${encodeURIComponent(slug)}`;
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    const blob = `${m.title_en || ''} ${m.exam_category || ''}`;
    const exam = inferExam(blob);
    const subj = inferSubject(blob);
    const lang = inferLanguage(m.title_or, '');

    items.push({
      id: `mock_${m.id || slug}`,
      title_en: cleanText(m.title_en, 220),
      title_or: cleanText(m.title_or, 220),
      resource_type: 'MCQ Practice Set',
      format_tab: 'mcq',
      exam_tag: cleanText(m.exam_category, 40) || exam.exam_tag,
      exam_key: exam.exam_key,
      subject: subj.subject,
      subject_key: subj.subject_key,
      language: lang.language,
      language_key: lang.language_key,
      file_format: 'CBT Quiz',
      page_or_question_count: `${Number(m.duration_minutes || 45)} mins · CBT MCQs`,
      year: '2026',
      pdf_url: '',
      detail_url: detailUrl,
      is_offline_ready: true,
      source_type: 'mock'
    });
  }

  // Merge structured Odisha core syllabus & PYQ packs
  for (const pack of CORE_STUDY_PACKS) {
    if (seen.has(pack.id)) continue;
    items.push({ ...pack });
  }

  return {
    ok: true,
    version: 'v375',
    generated_at: new Date().toISOString(),
    summary: {
      total_resources: items.length,
      pyq_count: items.filter((i) => i.format_tab === 'pyq').length,
      bilingual_count: items.filter((i) => i.language_key === 'bilingual').length,
      pdf_count: items.filter((i) => i.file_format === 'PDF').length
    },
    items
  };
}

function filterStudyItems(items, params) {
  const q = cleanText(params.get('q') || params.get('search'), 120).toLowerCase();
  const format = cleanText(params.get('format') || params.get('tab'), 40).toLowerCase();
  const exam = cleanText(params.get('exam'), 40).toLowerCase();
  const subject = cleanText(params.get('subject'), 40).toLowerCase();
  const lang = cleanText(params.get('lang') || params.get('language'), 40).toLowerCase();

  return items.filter((it) => {
    if (q) {
      const hay = `${it.title_en} ${it.title_or} ${it.exam_tag} ${it.subject} ${it.resource_type} ${it.year}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (format && format !== 'all' && it.format_tab !== format) return false;
    if (exam && exam !== 'all' && it.exam_key !== exam) return false;
    if (subject && subject !== 'all' && it.subject_key !== subject) return false;
    if (lang && lang !== 'all' && it.language_key !== lang) return false;
    return true;
  });
}

export async function handlePublicStudyHubApi(request, env) {
  const url = new URL(request.url);
  const payload = await buildStudyHubPayload(env && env.DB);
  const filtered = filterStudyItems(payload.items, url.searchParams);
  return json(
    {
      ...payload,
      filtered_count: filtered.length,
      items: filtered
    },
    200,
    {
      'Cache-Control': 'public, max-age=15, s-maxage=120, stale-while-revalidate=60',
      'X-CSO-Study-Hub': 'v375'
    }
  );
}

export async function onRequestGet({ request, env }) {
  return handlePublicStudyHubApi(request, env);
}
