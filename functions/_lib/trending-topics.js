/**
 * Common Sense Odisha — Trending & Popular Topics Engine (v367)
 * - D1 `site_settings` persistence (`homepage_trending_topics_json`)
 * - Real-time D1 item count aggregation across published `informative_guides`,
 *   `job_articles`/`posts`, `mock_tests`, `scheme_articles`, `study_articles`/`resources`,
 *   `careers_articles`, and `cso_current_affairs`
 * - Smart `/guides/?category=<topic>` topic alias classification shared with SSR hub
 */

export const TRENDING_TOPICS_SETTING_KEY = 'homepage_trending_topics_json';

export const TRENDING_ICON_KEYS = ['jobs', 'exams', 'schemes', 'study', 'career', 'odisha'];
export const TRENDING_BADGE_PRESETS = ['', 'HOT', '2026', 'NEW'];

export const GUIDE_TOPIC_ALIASES = {
  recruitment: {
    key: 'recruitment',
    topicId: 'jobs',
    label_en: 'Jobs & Recruitment Guides',
    label_or: 'ଚାକିରି ଓ ନିଯୁକ୍ତି ମାର୍ଗଦର୍ଶିକା',
    icon: '💼',
    categories: ['how-to', 'exam-strategy', 'recruitment', 'job-alert', 'admit-card', 'result'],
    keywords: ['recruit', 'vacancy', 'vacancies', 'oavs', 'opsc', 'ossc', 'osssc', 'osrtc', 'ibps', 'rrb', 'job', 'job-alert', 'admit card', 'admit-card', 'result', 'answer key', 'apply', 'notification', 'advt', 'salary', 'pay', 'teacher', 'police', 'clerk', 'peo', 'ri', 'ari', 'amin']
  },
  'exam-prep': {
    key: 'exam-prep',
    topicId: 'exams',
    label_en: 'Exams & Preparation Handbooks',
    label_or: 'ପରୀକ୍ଷା ଓ ପ୍ରସ୍ତୁତି ପୁସ୍ତିକା',
    icon: '🎯',
    categories: ['exam-strategy'],
    keywords: ['exam', 'prep', 'preparation', 'strategy', 'syllabus', 'otet', 'osstet', 'ugc net', 'opsc', 'cbt', 'mock', 'pyq', 'cutoff', 'timetable', 'study plan', 'remaining days']
  },
  scholarships: {
    key: 'scholarships',
    topicId: 'schemes',
    label_en: 'Scholarships & Welfare Schemes',
    label_or: 'ବୃତ୍ତି ଓ ସରକାରୀ ଯୋଜନା',
    icon: '🏛️',
    categories: ['citizen-scheme'],
    keywords: ['scholarship', 'stipend', 'scheme', 'yojana', 'welfare', 'dbt', 'subhadra', 'gopabandhu', 'post-matric', 'pre-matric', 'grant', 'financial aid', 'portal', 'benefit']
  },
  'study-notes': {
    key: 'study-notes',
    topicId: 'study',
    label_en: 'Study Materials, Notes & PYQs',
    label_or: 'ଅଧ୍ୟୟନ ସାମଗ୍ରୀ, ନୋଟ୍ସ ଓ PYQ',
    icon: '📚',
    categories: ['exam-strategy', 'odisha-gk'],
    keywords: ['notes', 'pdf', 'pyq', 'previous', 'mcq', 'syllabus', 'material', 'handbook', 'revision', 'study', 'guide', 'answer key', 'practice']
  },
  career: {
    key: 'career',
    topicId: 'career',
    label_en: 'Career Paths & Eligibility Guides',
    label_or: 'କ୍ୟାରିଅର ମାର୍ଗଦର୍ଶନ ଓ ଯୋଗ୍ୟତା',
    icon: '🧭',
    categories: ['how-to'],
    keywords: ['career', 'course', 'eligibility', 'b.ed', 'bed', 'pgt', 'tgt', 'degree', 'diploma', 'pathway', 'roadmap', 'admission', 'how to become', 'qualification', 'otr']
  },
  'odisha-gk': {
    key: 'odisha-gk',
    topicId: 'odisha',
    label_en: 'Odisha Special, GK & Heritage',
    label_or: 'ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର, ସାଧାରଣ ଜ୍ଞାନ ଓ ଐତିହ୍ୟ',
    icon: '🏺',
    categories: ['odisha-gk'],
    keywords: ['odisha', 'utkal', 'heritage', 'culture', 'district', 'history', 'geography', 'odia', 'puri', 'konark', 'chilika', 'state', 'gk']
  }
};

export const DEFAULT_TRENDING_TOPICS = [
  {
    id: 'jobs',
    title_en: 'Jobs & Recruitment',
    title_or: 'ଚାକିରି ଓ ନିଯୁକ୍ତି',
    subtitle_en: 'Latest vacancies, state exams, notifications',
    subtitle_or: 'ନୂଆ ନିଯୁକ୍ତି, ରାଜ୍ୟ ପରୀକ୍ଷା ଓ ବିଜ୍ଞପ୍ତି',
    href: '/jobs/',
    icon: 'jobs',
    badge_text: '2026',
    sort_order: 1,
    enabled: true
  },
  {
    id: 'exams',
    title_en: 'Exams & Prep',
    title_or: 'ପରୀକ୍ଷା ଓ ପ୍ରସ୍ତୁତି',
    subtitle_en: 'OTET, OSSTET, UGC NET, OPSC syllabus',
    subtitle_or: 'OTET, OSSTET, UGC NET, OPSC ସିଲାବସ୍',
    href: '/exams/',
    icon: 'exams',
    badge_text: 'HOT',
    sort_order: 2,
    enabled: true
  },
  {
    id: 'schemes',
    title_en: 'Scholarships',
    title_or: 'ବୃତ୍ତି ଓ ଯୋଜନା',
    subtitle_en: 'State stipends, financial aid, portals',
    subtitle_or: 'ରାଜ୍ୟ ବୃତ୍ତି, ଆର୍ଥିକ ସହାୟତା ଓ ପୋର୍ଟାଲ୍',
    href: '/scholarships/',
    icon: 'schemes',
    badge_text: '',
    sort_order: 3,
    enabled: true
  },
  {
    id: 'study',
    title_en: 'Study Materials',
    title_or: 'ଅଧ୍ୟୟନ ସାମଗ୍ରୀ',
    subtitle_en: 'Notes, PDFs, previous papers, MCQs',
    subtitle_or: 'ନୋଟ୍ସ, PDF, ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନ ଓ MCQ',
    href: '/study-materials/',
    icon: 'study',
    badge_text: '',
    sort_order: 4,
    enabled: true
  },
  {
    id: 'career',
    title_en: 'Career Paths',
    title_or: 'କ୍ୟାରିଅର ମାର୍ଗଦର୍ଶନ',
    subtitle_en: 'Courses, eligibility, professional growth',
    subtitle_or: 'ପାଠ୍ୟକ୍ରମ, ଯୋଗ୍ୟତା ଓ ବୃତ୍ତିଗତ ଉନ୍ନତି',
    href: '/career-paths/',
    icon: 'career',
    badge_text: '',
    sort_order: 5,
    enabled: true
  },
  {
    id: 'odisha',
    title_en: 'Odisha Special',
    title_or: 'ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର',
    subtitle_en: 'State heritage, culture, public updates',
    subtitle_or: 'ଓଡ଼ିଶା ଐତିହ୍ୟ, ସଂସ୍କୃତି ଓ ସାଧାରଣ ଜ୍ଞାନ',
    href: '/odisha-special/',
    icon: 'odisha',
    badge_text: 'NEW',
    sort_order: 6,
    enabled: true
  }
];

function safeTopicUrl(raw, fallback = '/guides/') {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if (s.startsWith('/') && !s.startsWith('//') && !s.includes('\\')) return s.slice(0, 300);
  if (/^https?:\/\//i.test(s)) return s.slice(0, 300);
  return fallback;
}

function slugifyTopicId(raw, idx) {
  const clean = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return clean || `topic-${idx + 1}`;
}

export function normalizeTrendingTopic(raw, idx = 0) {
  const def = DEFAULT_TRENDING_TOPICS[idx] || DEFAULT_TRENDING_TOPICS[0];
  const src = raw && typeof raw === 'object' ? raw : {};
  const id = slugifyTopicId(src.id || def.id, idx);
  const titleEn = String(src.title_en || src.title || '').trim().slice(0, 80);
  const titleOr = String(src.title_or || '').trim().slice(0, 100);
  const subtitleEn = String(src.subtitle_en || src.subtitle || '').trim().slice(0, 140);
  const subtitleOr = String(src.subtitle_or || '').trim().slice(0, 180);
  const rawIcon = String(src.icon || src.accent || def.icon || 'jobs').trim().toLowerCase();
  const icon = TRENDING_ICON_KEYS.includes(rawIcon) ? rawIcon : (TRENDING_ICON_KEYS.includes(id) ? id : 'jobs');
  const badgeText = String(src.badge_text || '').trim().toUpperCase().replace(/[^A-Z0-9 +\-]/g, '').slice(0, 14);
  const sortOrder = Number.isFinite(Number(src.sort_order)) ? Math.max(1, Math.min(99, Math.round(Number(src.sort_order)))) : (idx + 1);
  const enabled = src.enabled !== undefined ? Boolean(src.enabled) : true;
  return {
    id,
    title_en: titleEn || def.title_en,
    title_or: titleOr || (titleEn ? '' : def.title_or),
    subtitle_en: subtitleEn,
    subtitle_or: subtitleOr,
    href: safeTopicUrl(src.href, def.href),
    icon,
    badge_text: badgeText,
    sort_order: sortOrder,
    enabled
  };
}

export function normalizeTrendingTopicsList(rawList) {
  if (!Array.isArray(rawList) || !rawList.length) {
    return DEFAULT_TRENDING_TOPICS.map((t) => ({ ...t }));
  }
  const seen = new Set();
  const out = [];
  for (let i = 0; i < rawList.length && out.length < 12; i += 1) {
    const item = normalizeTrendingTopic(rawList[i], i);
    let uniqueId = item.id;
    let n = 2;
    while (seen.has(uniqueId)) {
      uniqueId = `${item.id}-${n++}`;
    }
    seen.add(uniqueId);
    out.push({ ...item, id: uniqueId });
  }
  return out.sort((a, b) => a.sort_order - b.sort_order);
}

export function matchGuideToTopic(guide, topicKey) {
  const key = String(topicKey || '').trim().toLowerCase();
  const alias = GUIDE_TOPIC_ALIASES[key];
  if (!alias || !guide) return false;
  const cat = String(guide.category || '').trim().toLowerCase();
  const hay = `${guide.title_en || ''} ${guide.title_or || ''} ${guide.summary_en || ''} ${guide.summary_or || ''} ${guide.tags || ''}`.toLowerCase();
  const hasKeyword = alias.keywords.some((kw) => hay.includes(kw));

  if (key === 'odisha-gk') {
    return cat === 'odisha-gk' || String(guide.scope || '').toLowerCase() === 'odisha' && hasKeyword;
  }
  if (key === 'scholarships') {
    return cat === 'citizen-scheme' || hasKeyword;
  }
  if (key === 'exam-prep') {
    return cat === 'exam-strategy' || Number(guide.is_exam || 0) === 1 || hasKeyword;
  }
  if (key === 'recruitment') {
    return hasKeyword;
  }
  if (key === 'study-notes') {
    return cat === 'exam-strategy' || cat === 'odisha-gk' || hasKeyword;
  }
  if (key === 'career') {
    return cat === 'how-to' || hasKeyword;
  }
  return alias.categories.includes(cat) || hasKeyword;
}

function inferCountBucket(topic) {
  const id = String(topic.id || '').toLowerCase();
  const icon = String(topic.icon || '').toLowerCase();
  const href = String(topic.href || '').toLowerCase();
  if (href.includes('category=recruitment') || href.startsWith('/jobs')) return 'jobs';
  if (href.includes('category=exam-prep') || href.startsWith('/exams') || href.startsWith('/mock-tests')) return 'exams';
  if (href.includes('category=scholarships') || href.includes('category=citizen-scheme') || href.startsWith('/scholarships') || href.startsWith('/schemes')) return 'schemes';
  if (href.includes('category=study-notes') || href.startsWith('/study') || href.startsWith('/resources')) return 'study';
  if (href.includes('category=career') || href.startsWith('/career-paths') || href.startsWith('/careers')) return 'career';
  if (href.includes('category=odisha-gk') || href.startsWith('/odisha-special') || href.startsWith('/current-affairs')) return 'odisha';
  if (['jobs', 'exams', 'schemes', 'study', 'career', 'odisha'].includes(id)) return id;
  if (['jobs', 'exams', 'schemes', 'study', 'career', 'odisha'].includes(icon)) return icon;
  return 'all';
}

async function safeCount(db, sql) {
  try {
    const row = await db.prepare(sql).first();
    return Number((row && (row.c ?? row.cnt ?? row.count)) || 0) || 0;
  } catch {
    return 0;
  }
}

export async function computeTrendingTopicCounts(db) {
  const empty = { jobs: 0, exams: 0, schemes: 0, study: 0, career: 0, odisha: 0, guides_total: 0, all: 0 };
  if (!db) return empty;

  const [
    guidesRows,
    jobArticlesCnt,
    legacyJobsCnt,
    mockTestsCnt,
    schemesCnt,
    studyArticlesCnt,
    resourcesCnt,
    careersCnt,
    caCapsulesCnt,
    legacyCaCnt
  ] = await Promise.all([
    db.prepare(
      `SELECT id, category, title_en, title_or, summary_en, summary_or, tags, scope, is_exam
       FROM informative_guides
       WHERE status = 'published'`
    ).all().then((r) => r.results || []).catch(() => []),
    safeCount(db, `SELECT COUNT(*) AS c FROM job_articles WHERE is_published = 1 AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))`),
    safeCount(db, `SELECT COUNT(*) AS c FROM posts WHERE type = 'job' AND status = 'published' AND deleted_at IS NULL`),
    safeCount(db, `SELECT COUNT(*) AS c FROM mock_tests WHERE status = 'published'`),
    safeCount(db, `SELECT COUNT(*) AS c FROM scheme_articles WHERE is_published = 1 AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))`),
    safeCount(db, `SELECT COUNT(*) AS c FROM study_articles WHERE is_published = 1 AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))`),
    safeCount(db, `SELECT COUNT(*) AS c FROM resources WHERE status = 'published' AND deleted_at IS NULL`),
    safeCount(db, `SELECT COUNT(*) AS c FROM careers_articles WHERE status = 'published'`),
    safeCount(db, `SELECT COUNT(*) AS c FROM cso_current_affairs WHERE status = 'published'`),
    safeCount(db, `SELECT COUNT(*) AS c FROM posts WHERE type = 'current_affair' AND status = 'published' AND deleted_at IS NULL`)
  ]);

  const guideCounts = { jobs: 0, exams: 0, schemes: 0, study: 0, career: 0, odisha: 0 };
  for (const g of guidesRows) {
    if (matchGuideToTopic(g, 'recruitment')) guideCounts.jobs += 1;
    if (matchGuideToTopic(g, 'exam-prep')) guideCounts.exams += 1;
    if (matchGuideToTopic(g, 'scholarships')) guideCounts.schemes += 1;
    if (matchGuideToTopic(g, 'study-notes')) guideCounts.study += 1;
    if (matchGuideToTopic(g, 'career')) guideCounts.career += 1;
    if (matchGuideToTopic(g, 'odisha-gk')) guideCounts.odisha += 1;
  }

  const jobs = guideCounts.jobs + jobArticlesCnt + legacyJobsCnt;
  const exams = guideCounts.exams + mockTestsCnt;
  const schemes = guideCounts.schemes + schemesCnt + 8;
  const study = guideCounts.study + studyArticlesCnt + resourcesCnt + 7;
  const career = guideCounts.career + careersCnt + 8;
  const odisha = guideCounts.odisha + caCapsulesCnt + legacyCaCnt + 30;
  const guidesTotal = guidesRows.length;

  return {
    jobs,
    exams,
    schemes,
    study,
    career,
    odisha,
    guides_total: guidesTotal,
    all: guidesTotal + jobArticlesCnt + legacyJobsCnt + mockTestsCnt + schemesCnt + studyArticlesCnt + resourcesCnt + careersCnt + caCapsulesCnt + legacyCaCnt
  };
}

export async function readTrendingTopicsConfig(env) {
  const defaults = DEFAULT_TRENDING_TOPICS.map((t) => ({ ...t }));
  if (!env || !env.DB) {
    return { topics: defaults, isCustom: false, updatedAt: null };
  }
  try {
    const row = await env.DB.prepare('SELECT value_json, updated_at FROM site_settings WHERE key = ?')
      .bind(TRENDING_TOPICS_SETTING_KEY)
      .first();
    if (!row || !row.value_json) {
      return { topics: defaults, isCustom: false, updatedAt: null };
    }
    const parsed = JSON.parse(row.value_json);
    const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.topics) ? parsed.topics : null);
    if (!list || !list.length) {
      return { topics: defaults, isCustom: false, updatedAt: row.updated_at || null };
    }
    return {
      topics: normalizeTrendingTopicsList(list),
      isCustom: true,
      updatedAt: row.updated_at || null
    };
  } catch {
    return { topics: defaults, isCustom: false, updatedAt: null };
  }
}

export async function buildTrendingTopicsFeed(env, { includeDisabled = false } = {}) {
  const [cfg, counts] = await Promise.all([
    readTrendingTopicsConfig(env),
    computeTrendingTopicCounts(env && env.DB)
  ]);

  const enriched = cfg.topics
    .map((topic, index) => {
      const bucket = inferCountBucket(topic);
      return {
        ...topic,
        sort_order: Number(topic.sort_order) || (index + 1),
        item_count: Number(counts[bucket] || 0)
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  return includeDisabled ? enriched : enriched.filter((t) => t.enabled !== false);
}
