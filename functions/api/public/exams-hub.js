/**
 * Common Sense Odisha — Unified Live Exams & Prep Hub API (v373)
 * Endpoint: GET /api/public/exams-hub
 *
 * Aggregates:
 *   1. Published exam guides (`informative_guides` matched to exam-prep / syllabus / admit-card / strategy)
 *   2. Active `mock_tests`
 *   3. Published `study_articles` (syllabus & PYQs)
 *   4. Exam-related `cso_current_affairs` and `job_articles`
 *
 * Returns:
 *   - `summary`: { active_tracks, live_guides, cbt_mocks, daily_mcqs }
 *   - `exam_tracks[]`: 7 flagship Odisha & National exam tracks with IST countdowns
 *   - `items[]`: multi-facet prep resources (strategy, admit-card, syllabus, mock)
 *   - `daily_quiz[]`: 5 bilingual EN / ଓଡ଼ିଆ exam-grade practice MCQs
 */
import { json } from '../../_lib/http.js';
import { matchGuideToTopic } from '../../_lib/trending-topics.js';
import { computeDaysRemaining, getIstDateYmd } from './jobs-hub.js';

function cleanText(val, max = 260) {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const FLAGSHIP_EXAM_TRACKS = [
  {
    id: 'oavs-2026',
    code: 'OAVS 2026',
    family: 'teaching',
    name_en: 'OAVS Teacher & Principal Recruitment 2026',
    name_or: 'OAVS ଶିକ୍ଷକ ଓ ପ୍ରଧାନଶିକ୍ଷକ ନିଯୁକ୍ତି ୨୦୨୬',
    conducting_body: 'OAVS (Govt. of Odisha)',
    stage: '25-Day Prep Sprint',
    exam_date: '2026-12-21',
    eligibility_short: 'Graduate + B.Ed / PG + B.Ed',
    pattern_summary: 'CBT • 200 Marks • English, Odia, GK, Reasoning & Subject',
    keywords: ['oavs', 'adarsha vidyalaya', 'tgt', 'pgt', 'principal'],
    default_guide_url: '/guides/?category=exam-prep&q=OAVS',
    mock_test_url: '/mock-tests/?exam=oavs',
    syllabus_url: '/study-library/?q=OAVS'
  },
  {
    id: 'opsc-oas',
    code: 'OPSC OAS',
    family: 'odisha-civil',
    name_en: 'OPSC Odisha Civil Services (OAS)',
    name_or: 'OPSC ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OAS)',
    conducting_body: 'OPSC',
    stage: 'Notification Out',
    exam_date: '2027-02-14',
    eligibility_short: 'Any Graduate (21–38 yrs)',
    pattern_summary: 'Prelims (GS + CSAT) • Mains (9 Papers) • Personality Test',
    keywords: ['opsc', 'oas', 'ocs', 'civil services'],
    default_guide_url: '/guides/?category=exam-prep&q=OPSC',
    mock_test_url: '/mock-tests/?exam=opsc',
    syllabus_url: '/study-library/?q=OPSC'
  },
  {
    id: 'ossc-cgl',
    code: 'OSSC CGL',
    family: 'odisha-civil',
    name_en: 'OSSC Combined Graduate Level (CGLRE)',
    name_or: 'OSSC କମ୍ବାଇଣ୍ଡ୍ ଗ୍ରାଜୁଏଟ୍ ଲେଭଲ୍ (CGL)',
    conducting_body: 'OSSC',
    stage: 'Exam City / Admit Card',
    exam_date: '2026-12-13',
    eligibility_short: 'Graduate + Computer Knowledge',
    pattern_summary: 'Prelims (150 Marks, -0.25) • Mains (Odia, English, Maths, GK)',
    keywords: ['ossc', 'cgl', 'cglre', 'chsl'],
    default_guide_url: '/guides/?category=exam-prep&q=OSSC',
    mock_test_url: '/mock-tests/?exam=ossc',
    syllabus_url: '/study-library/?q=OSSC'
  },
  {
    id: 'osssc-ri-peo',
    code: 'OSSSC RI / ARI / Amin / PEO',
    family: 'odisha-civil',
    name_en: 'OSSSC Combined RI, ARI, Amin, ICDS & PEO',
    name_or: 'OSSSC RI, ARI, ଅମିନ୍ ଓ PEO ପରୀକ୍ଷା',
    conducting_body: 'OSSSC',
    stage: 'Mock Series',
    exam_date: '2027-01-18',
    eligibility_short: '+2 / Graduate + Computer',
    pattern_summary: 'CBT Prelims (100 Marks) • Mains (180 Marks) • Skill Test',
    keywords: ['osssc', 'peo', 'ri', 'ari', 'amin', 'icds', 'forest guard'],
    default_guide_url: '/guides/?category=exam-prep&q=OSSSC',
    mock_test_url: '/mock-tests/?exam=osssc',
    syllabus_url: '/study-library/?q=OSSSC'
  },
  {
    id: 'otet-osstet',
    code: 'OTET / OSSTET',
    family: 'teaching',
    name_en: 'OTET & OSSTET Teacher Eligibility Test',
    name_or: 'OTET ଓ OSSTET ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା',
    conducting_body: 'BSE Odisha',
    stage: 'Syllabus & PYQ',
    exam_date: '2027-01-25',
    eligibility_short: '+2 + D.El.Ed / Graduate + B.Ed',
    pattern_summary: '150 MCQs • 150 Mins • No Negative Marking • CDP, Odia, Eng, Subject',
    keywords: ['otet', 'osstet', 'bse odisha', 'tet', 'bed', 'b.ed'],
    default_guide_url: '/guides/?category=exam-prep&q=OTET',
    mock_test_url: '/mock-tests/?exam=otet',
    syllabus_url: '/study-library/?q=OTET'
  },
  {
    id: 'ugc-net-dec-2026',
    code: 'UGC NET Dec 2026',
    family: 'national',
    name_en: 'NTA UGC NET / JRF December 2026',
    name_or: 'NTA UGC NET / JRF ଡିସେମ୍ବର ୨୦୨୬',
    conducting_body: 'NTA',
    stage: 'Exam City / Admit Card',
    exam_date: '2026-12-28',
    eligibility_short: 'Master’s Degree (55% / 50% Reserved)',
    pattern_summary: 'CBT • Paper 1 (50 Qs) + Paper 2 (100 Qs) • 3 Hours • No Negative',
    keywords: ['ugc net', 'net', 'jrf', 'nta'],
    default_guide_url: '/guides/?category=exam-prep&q=UGC+NET',
    mock_test_url: '/mock-tests/?exam=ugc-net',
    syllabus_url: '/study-library/?q=UGC+NET'
  },
  {
    id: 'ssc-banking-rrb',
    code: 'SSC / Banking / RRB',
    family: 'national',
    name_en: 'SSC CGL/CHSL, IBPS PO/Clerk & RRB NTPC',
    name_or: 'SSC, ବ୍ୟାଙ୍କିଙ୍ଗ୍ (IBPS/SBI) ଓ ରେଳବାଇ (RRB)',
    conducting_body: 'SSC / IBPS / RRB',
    stage: 'Mock Series',
    exam_date: '2027-02-05',
    eligibility_short: '+2 / Graduate',
    pattern_summary: 'Tier-1 & Tier-2 CBT • Quant, Reasoning, English, GA & Computer',
    keywords: ['ssc', 'ibps', 'sbi', 'rrb', 'ntpc', 'banking', 'railway'],
    default_guide_url: '/guides/?category=exam-prep&q=SSC',
    mock_test_url: '/mock-tests/?exam=central',
    syllabus_url: '/study-library/?q=SSC'
  }
];

export const DAILY_QUIZ_BANK = [
  {
    id: 'dq1',
    exam_tag: 'OPSC OAS / Odisha GK',
    question_en: 'Which Odisha wetland is Asia’s largest brackish water lagoon and India’s first Ramsar site (1981)?',
    question_or: 'ଓଡ଼ିଶାର କେଉଁ ଆର୍ଦ୍ରଭୂମି ଏସିଆର ବୃହତ୍ତମ ଲୁଣିଆ ହ୍ରଦ ଏବଂ ଭାରତର ପ୍ରଥମ ରାମସାର ସ୍ଥଳ (୧୯୮୧)?',
    options_en: ['Bhitarkanika', 'Chilika Lake', 'Ansupa Lake', 'Tampara Lake'],
    options_or: ['ଭିତରକନିକା', 'ଚିଲିକା ହ୍ରଦ', 'ଅଂଶୁପା ହ୍ରଦ', 'ତାମ୍ପରା ହ୍ରଦ'],
    correct_index: 1,
    explanation_en: 'Chilika Lake (spread across Puri, Khordha & Ganjam) was designated India’s first Ramsar site in 1981.',
    explanation_or: 'ପୁରୀ, ଖୋର୍ଦ୍ଧା ଓ ଗଞ୍ଜାମ ଜିଲ୍ଲାରେ ବିସ୍ତୃତ ଚିଲିକା ହ୍ରଦ ୧୯୮୧ରେ ଭାରତର ପ୍ରଥମ ରାମସାର ସ୍ଥଳ ଭାବେ ଘୋଷିତ ହୋଇଥିଲା।'
  },
  {
    id: 'dq2',
    exam_tag: 'Indian Polity (OPSC / OSSC)',
    question_en: 'Which Article of the Indian Constitution deals with the establishment of a Public Service Commission for each State (such as OPSC)?',
    question_or: 'ଭାରତୀୟ ସମ୍ବିଧାନର କେଉଁ ଅନୁଚ୍ଛେଦ ପ୍ରତ୍ୟେକ ରାଜ୍ୟ ପାଇଁ ଲୋକସେବା ଆୟୋଗ (ଯେପରିକି OPSC) ଗଠନ ବିଷୟରେ ଉଲ୍ଲେଖ କରେ?',
    options_en: ['Article 280', 'Article 315', 'Article 324', 'Article 352'],
    options_or: ['ଅନୁଚ୍ଛେଦ ୨୮୦', 'ଅନୁଚ୍ଛେଦ ୩୧୫', 'ଅନୁଚ୍ଛେଦ ୩୨୪', 'ଅନୁଚ୍ଛେଦ ୩୫୨'],
    correct_index: 1,
    explanation_en: 'Article 315 provides for Public Service Commissions for the Union (UPSC) and for the States (OPSC).',
    explanation_or: 'ଅନୁଚ୍ଛେଦ ୩୧୫ କେନ୍ଦ୍ର (UPSC) ଏବଂ ରାଜ୍ୟ (OPSC) ପାଇଁ ଲୋକସେବା ଆୟୋଗ ଗଠନର ବ୍ୟବସ୍ଥା କରେ।'
  },
  {
    id: 'dq3',
    exam_tag: 'UGC NET Paper 1',
    question_en: 'In NEP 2020, the existing 10+2 school curricular structure is replaced by which pedagogical framework?',
    question_or: 'ଜାତୀୟ ଶିକ୍ଷା ନୀତି (NEP) ୨୦୨୦ରେ ପୂର୍ବତନ ୧୦+୨ ବିଦ୍ୟାଳୟ ଢାଞ୍ଚା ବଦଳରେ କେଉଁ ଢାଞ୍ଚା ଗ୍ରହଣ କରାଯାଇଛି?',
    options_en: ['5+3+3+4', '5+4+3+2', '6+3+3+2', '4+4+4+3'],
    options_or: ['୫+୩+୩+୪', '୫+୪+୩+୨', '୬+୩+୩+୨', '୪+୪+୪+୩'],
    correct_index: 0,
    explanation_en: 'NEP 2020 introduces the 5+3+3+4 structure: Foundational (5), Preparatory (3), Middle (3), and Secondary (4).',
    explanation_or: 'NEP ୨୦୨୦ରେ ୫+୩+୩+୪ ଢାଞ୍ଚା (ମୌଳିକ, ପ୍ରସ୍ତୁତି, ମଧ୍ୟମ ଓ ମାଧ୍ୟମିକ) ପ୍ରବର୍ତ୍ତନ କରାଯାଇଛି।'
  },
  {
    id: 'dq4',
    exam_tag: 'OAVS / OTET Pedagogy',
    question_en: 'Who proposed the theory of Zone of Proximal Development (ZPD) and Scaffolding in educational psychology?',
    question_or: 'ଶିକ୍ଷା ମନୋବିଜ୍ଞାନରେ Zone of Proximal Development (ZPD) ଓ Scaffolding ତତ୍ତ୍ୱ କିଏ ପ୍ରସ୍ତାବ କରିଥିଲେ?',
    options_en: ['Jean Piaget', 'Lev Vygotsky', 'B.F. Skinner', 'Lawrence Kohlberg'],
    options_or: ['ଜିନ୍ ପିଆଜେ', 'ଲେଭ୍ ଭାଇଗୋଟ୍ସକି', 'ବି.ଏଫ୍. ସ୍କିନର', 'ଲରେନ୍ସ କୋହଲବର୍ଗ'],
    correct_index: 1,
    explanation_en: 'Lev Vygotsky’s sociocultural theory defines ZPD as the gap between independent ability and guided potential.',
    explanation_or: 'ଲେଭ୍ ଭାଇଗୋଟ୍ସକିଙ୍କ ସାମାଜିକ-ସାଂସ୍କୃତିକ ତତ୍ତ୍ୱରେ ZPD ଓ ସ୍କାଫୋଲ୍ଡିଂର ଅବଧାରଣା ଦିଆଯାଇଛି।'
  },
  {
    id: 'dq5',
    exam_tag: 'OSSC CGL / OSSSC Quant',
    question_en: 'If a candidate increases their daily study speed by 25%, by what percentage does the time taken to cover the same syllabus decrease?',
    question_or: 'ଯଦି ଜଣେ ପରୀକ୍ଷାର୍ଥୀ ନିଜ ଦୈନିକ ଅଧ୍ୟୟନ ଗତି ୨୫% ବୃଦ୍ଧି କରନ୍ତି, ତେବେ ସମାନ ସିଲାବସ୍ ଶେଷ କରିବାକୁ ସମୟ କେତେ ପ୍ରତିଶତ କମିବ?',
    options_en: ['15%', '20%', '25%', '30%'],
    options_or: ['୧୫%', '୨୦%', '୨୫%', '୩୦%'],
    correct_index: 1,
    explanation_en: 'Time is inversely proportional to speed: 1 / 1.25 = 0.80, which is a 20% reduction in time.',
    explanation_or: 'ସମୟ ଗତିର ବିପରୀତାନୁପାତୀ: ୧ / ୧.୨୫ = ୦.୮୦, ଅର୍ଥାତ୍ ସମୟ ୨୦% କମିବ।'
  }
];

function classifyResourceType(rawCat, textBlob, sourceType) {
  if (sourceType === 'mock') return 'mock';
  if (sourceType === 'study') return 'syllabus';
  const hay = `${rawCat || ''} ${textBlob || ''}`.toLowerCase();
  if (/\badmit\s*card\b|\bexam\s*city\b|\bhall\s*ticket\b|\bintimation\b/.test(hay)) return 'admit-card';
  if (/\bsyllabus\b|\bpyq\b|\bprevious\s*year\b|\banswer\s*key\b/.test(hay)) return 'syllabus';
  return 'strategy';
}

function detectExamTag(textBlob) {
  const hay = String(textBlob || '').toLowerCase();
  for (const tr of FLAGSHIP_EXAM_TRACKS) {
    if (tr.keywords.some((kw) => hay.includes(kw))) return tr.code;
  }
  return 'Odisha Exams';
}

function matchesTrack(textBlob, track) {
  const hay = String(textBlob || '').toLowerCase();
  return track.keywords.some((kw) => hay.includes(kw));
}

export async function buildExamsHubPayload(db, { nowIso } = {}) {
  const istToday = getIstDateYmd(nowIso);

  const [guides, mocks, studyArticles, caItems, jobItems] = db
    ? await Promise.all([
        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, tags, scope,
                  is_exam, published_at, updated_at
           FROM informative_guides
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 120`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, exam_category, duration_minutes, negative_marking,
                  published_at, updated_at
           FROM mock_tests
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 80`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, exam_tag, resource_type,
                  published_at, updated_at
           FROM study_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 80`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, publish_date, updated_at
           FROM cso_current_affairs
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(publish_date, ''), updated_at) DESC
           LIMIT 40`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, organisation_en,
                  lifecycle_stage, exam_date, published_at, updated_at
           FROM job_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 60`
        ).all().then((r) => r.results || []).catch(() => [])
      ])
    : [[], [], [], [], []];

  const items = [];
  const seen = new Set();

  // 1. Exam Guides
  const matchedGuides = [];
  for (const g of guides) {
    const cat = String(g.category || '').toLowerCase();
    const tags = String(g.tags || '').toLowerCase();
    const isExamGuide =
      matchGuideToTopic(g, 'exam-prep') ||
      ['exam-strategy', 'syllabus', 'admit-card', 'strategy'].includes(cat) ||
      /(syllabus|admit-card|strategy|exam-prep|exam-city)/.test(tags);
    if (!isExamGuide) continue;
    matchedGuides.push(g);

    const slug = cleanText(g.slug || g.id, 140);
    const detailUrl = slug ? `/guides/${encodeURIComponent(slug)}` : '/guides/?category=exam-prep';
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    const blob = `${g.title_en || ''} ${g.summary_en || ''} ${g.tags || ''} ${g.category || ''}`;
    items.push({
      id: `guide_${g.id || slug}`,
      title_en: cleanText(g.title_en, 220) || 'Exam Prep Guide',
      title_or: cleanText(g.title_or, 220),
      summary_en: cleanText(g.summary_en, 240),
      summary_or: cleanText(g.summary_or, 240),
      resource_type: classifyResourceType(g.category, blob, 'guide'),
      exam_tag: detectExamTag(blob),
      detail_url: detailUrl,
      source_type: 'guide',
      published_at: cleanText(g.published_at || g.updated_at, 40)
    });
  }

  // 2. CBT Mock Tests
  for (const m of mocks) {
    const slug = cleanText(m.slug || m.id, 140);
    const detailUrl = `/mock-tests/?test=${encodeURIComponent(slug)}`;
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    const blob = `${m.title_en || ''} ${m.exam_category || ''}`;
    const meta = [
      Number(m.duration_minutes || 0) > 0 ? `${m.duration_minutes} mins` : 'Timed CBT',
      Number(m.negative_marking || 0) > 0 ? `-${m.negative_marking} negative` : 'Instant score'
    ].join(' • ');

    items.push({
      id: `mock_${m.id || slug}`,
      title_en: cleanText(m.title_en, 220) || 'Live CBT Mock Test',
      title_or: cleanText(m.title_or, 220),
      summary_en: meta,
      summary_or: '',
      resource_type: 'mock',
      exam_tag: cleanText(m.exam_category, 60) || detectExamTag(blob),
      detail_url: detailUrl,
      source_type: 'mock',
      published_at: cleanText(m.published_at || m.updated_at, 40)
    });
  }

  // 3. Syllabus & PYQ study_articles
  for (const s of studyArticles) {
    const slug = cleanText(s.slug || s.id, 140);
    const detailUrl = slug ? `/study-library/?slug=${encodeURIComponent(slug)}` : '/study-library/';
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    const blob = `${s.title_en || ''} ${s.summary_en || ''} ${s.exam_tag || ''} ${s.resource_type || ''}`;
    items.push({
      id: `study_${s.id || slug}`,
      title_en: cleanText(s.title_en, 220) || 'Syllabus & PYQ Pack',
      title_or: cleanText(s.title_or, 220),
      summary_en: cleanText(s.summary_en, 240),
      summary_or: cleanText(s.summary_or, 240),
      resource_type: 'syllabus',
      exam_tag: cleanText(s.exam_tag, 60) || detectExamTag(blob),
      detail_url: detailUrl,
      source_type: 'study',
      published_at: cleanText(s.published_at || s.updated_at, 40)
    });
  }

  // 4. Exam-stage job_articles (admit card / exam date / answer key)
  for (const j of jobItems) {
    const st = String(j.lifecycle_stage || '').toLowerCase();
    const blob = `${j.title_en || ''} ${j.summary_en || ''} ${j.organisation_en || ''}`;
    if (!['admit_card', 'exam_date', 'answer_key', 'result'].includes(st) && !/(admit card|exam city|exam date|syllabus|answer key|result)/i.test(blob)) {
      continue;
    }
    const slug = cleanText(j.slug || j.id, 140);
    const detailUrl = slug ? `/jobs/?slug=${encodeURIComponent(slug)}` : '/jobs/';
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    items.push({
      id: `examjob_${j.id || slug}`,
      title_en: cleanText(j.title_en, 220) || 'Exam Bulletin',
      title_or: cleanText(j.title_or, 220),
      summary_en: cleanText(j.summary_en, 240),
      summary_or: cleanText(j.summary_or, 240),
      resource_type: classifyResourceType(st, blob, 'job'),
      exam_tag: detectExamTag(blob),
      detail_url: detailUrl,
      source_type: 'job',
      published_at: cleanText(j.published_at || j.updated_at, 40)
    });
  }

  // 5. Exam-special Current Affairs briefs
  for (const ca of caItems) {
    const blob = `${ca.title_en || ''} ${ca.summary_en || ''} ${ca.category || ''}`;
    if (!/(exam|opsc|ossc|osssc|oavs|ugc|otet|revision|quiz|prelims|mains)/i.test(blob)) continue;
    const slug = cleanText(ca.slug || ca.id, 140);
    const detailUrl = slug ? `/current-affairs/?slug=${encodeURIComponent(slug)}` : '/current-affairs/';
    if (seen.has(detailUrl)) continue;
    seen.add(detailUrl);

    items.push({
      id: `ca_${ca.id || slug}`,
      title_en: cleanText(ca.title_en, 220) || 'Exam Special Digest',
      title_or: cleanText(ca.title_or, 220),
      summary_en: cleanText(ca.summary_en, 240),
      summary_or: cleanText(ca.summary_or, 240),
      resource_type: 'strategy',
      exam_tag: detectExamTag(blob),
      detail_url: detailUrl,
      source_type: 'current_affairs',
      published_at: cleanText(ca.publish_date || ca.updated_at, 40)
    });
  }

  items.sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));

  // Enrich 7 flagship tracks with live counts, IST countdowns & matched primary guide URL
  const examTracks = FLAGSHIP_EXAM_TRACKS.map((tr) => {
    const matchingGuides = matchedGuides.filter((g) => matchesTrack(`${g.title_en} ${g.summary_en} ${g.tags}`, tr));
    const matchingMocks = mocks.filter((m) => matchesTrack(`${m.title_en} ${m.exam_category}`, tr));
    const matchingJobDate = jobItems.find((j) => j.exam_date && matchesTrack(`${j.title_en} ${j.organisation_en}`, tr));

    const effectiveExamDate = (matchingJobDate && matchingJobDate.exam_date) ? String(matchingJobDate.exam_date).slice(0, 10) : tr.exam_date;
    const daysToExam = computeDaysRemaining(effectiveExamDate, nowIso);
    const primaryGuideUrl = matchingGuides.length && matchingGuides[0].slug
      ? `/guides/${encodeURIComponent(matchingGuides[0].slug)}`
      : tr.default_guide_url;

    return {
      id: tr.id,
      code: tr.code,
      family: tr.family,
      name_en: tr.name_en,
      name_or: tr.name_or,
      conducting_body: tr.conducting_body,
      stage: tr.stage,
      exam_date: effectiveExamDate,
      days_to_exam: daysToExam,
      eligibility_short: tr.eligibility_short,
      pattern_summary: tr.pattern_summary,
      mock_count: matchingMocks.length,
      guide_count: matchingGuides.length,
      primary_guide_url: primaryGuideUrl,
      mock_test_url: tr.mock_test_url,
      syllabus_url: tr.syllabus_url
    };
  });

  return {
    ok: true,
    version: 'v373',
    ist_date: istToday,
    generated_at: new Date().toISOString(),
    summary: {
      active_tracks: examTracks.length,
      live_guides: matchedGuides.length,
      cbt_mocks: mocks.length,
      daily_mcqs: DAILY_QUIZ_BANK.length
    },
    exam_tracks: examTracks,
    items,
    daily_quiz: DAILY_QUIZ_BANK
  };
}

export async function handlePublicExamsHubApi(request, env) {
  const url = new URL(request.url);
  const payload = await buildExamsHubPayload(env && env.DB);
  const family = cleanText(url.searchParams.get('family'), 40).toLowerCase();
  const type = cleanText(url.searchParams.get('type') || url.searchParams.get('tab'), 40).toLowerCase();
  const q = cleanText(url.searchParams.get('q') || url.searchParams.get('search'), 120).toLowerCase();

  let tracks = payload.exam_tracks;
  if (family && family !== 'all') {
    tracks = tracks.filter((t) => t.family === family);
  }

  let items = payload.items;
  if (type && type !== 'all') {
    items = items.filter((it) => it.resource_type === type);
  }
  if (q) {
    items = items.filter((it) => `${it.title_en} ${it.title_or} ${it.summary_en} ${it.exam_tag}`.toLowerCase().includes(q));
  }

  return json(
    {
      ...payload,
      exam_tracks: tracks,
      items
    },
    200,
    {
      'Cache-Control': 'public, max-age=15, s-maxage=120, stale-while-revalidate=60',
      'X-CSO-Exams-Hub': 'v373'
    }
  );
}

export async function onRequestGet({ request, env }) {
  return handlePublicExamsHubApi(request, env);
}
