/**
 * v251: Study Library, Curriculum & EdTech Publishing House Engine
 * - 3-Layer Academic & Exam Taxonomy (Exam Track L1 -> Subject/Paper L2 -> Chapter/Format L3)
 * - Rich Bilingual Study Modules, Syllabus Weightage, Key Facts/Flashcards, PYQ Analysis, Practice MCQs
 * - PDF-to-Study-Notes Auto-Draft Extractor & Direct R2 Uploads
 * - Time-limited Draft Preview Tokens, Revision History & Rollback, Scheduled Auto-Publish
 * - Candidate Syllabus Progress, Study Streak & Practice Quiz Score Sync
 * - Reader Doubts & PYQ Corrections Queue
 * - Real-Time Edge Cache Invalidation & Jobs "Prepare for This Exam" Cross-Linking
 */
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit, getActor, STAFF_ROLES } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';
import { requireCandidateSession } from './candidate-hub-governance.js';

const MB = 1024 * 1024;
const ALLOWED_UPLOAD_MIME = {
  'image/jpeg': { ext: 'jpg', max: 5 * MB, kind: 'image' },
  'image/png': { ext: 'png', max: 5 * MB, kind: 'image' },
  'image/webp': { ext: 'webp', max: 5 * MB, kind: 'image' },
  'application/pdf': { ext: 'pdf', max: 20 * MB, kind: 'pdf' }
};

const RESOURCE_TYPES = [
  'Study Notes',
  'Previous Year Paper (PYQ)',
  'Official Syllabus',
  'Current Affairs Digest',
  'Practice Set / E-Book',
  'Syllabus',
  'PYQ Paper',
  'Practice Set',
  'Revision Sheet',
  'Reference Digest',
  'Current Affairs'
];
const DIFFICULTY_LEVELS = ['Foundation', 'Moderate', 'Advanced'];
const HIGH_YIELD_PRIORITIES = ['Must-Study', 'High', 'Standard'];
const NEGATIVE_MARKING_RULES = ['None', '-0.25 (OSSC/OSSSC)', '-0.33 (OPSC/UPSC)', '-0.50'];
const DOUBT_TYPES = ['chapter_doubt', 'pyq_typo', 'answer_key_error', 'syllabus_update', 'other'];

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=60, must-revalidate';

let _schemaReady = false;

function str(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function intOrZero(v, min = 0, max = 99999999) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function numOrZero(v, min = -1000, max = 100000) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100));
}

function boolInt(v, def = 0) {
  if (v === undefined || v === null || v === '') return def ? 1 : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  return (s === '1' || s === 'true' || s === 'yes' || s === 'on') ? 1 : 0;
}

function slugify(input, fallback = 'study-module') {
  const s = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || fallback;
}

function safeHref(v) {
  const s = str(v, 500);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw || ''));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

function nowIsoSql() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// ============================================================================
// SCHEMA GUARD
// ============================================================================
export async function ensureStudyPublishingSchema(db) {
  if (_schemaReady || !db) return;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS study_taxonomy_nodes (
      id TEXT PRIMARY KEY,
      level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
      parent_id TEXT,
      slug TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      accent_variant TEXT NOT NULL DEFAULT 'indigo',
      sort_order INTEGER NOT NULL DEFAULT 100,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS study_articles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      category_l1_id TEXT NOT NULL DEFAULT '',
      category_l2_id TEXT NOT NULL DEFAULT '',
      category_l3_id TEXT NOT NULL DEFAULT '',
      resource_type_badge TEXT NOT NULL DEFAULT 'Study Notes',
      difficulty_level TEXT NOT NULL DEFAULT 'Moderate',
      high_yield_priority TEXT NOT NULL DEFAULT 'High',
      estimated_read_mins INTEGER NOT NULL DEFAULT 10,
      negative_marking_rule TEXT NOT NULL DEFAULT 'None',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      exam_board_tag TEXT NOT NULL DEFAULT '',
      paper_code TEXT NOT NULL DEFAULT '',
      pyq_year TEXT NOT NULL DEFAULT '',
      language_medium TEXT NOT NULL DEFAULT 'Bilingual (EN + OR)',
      cover_image_url TEXT NOT NULL DEFAULT '',
      cover_image_caption TEXT NOT NULL DEFAULT '',
      article_body_en TEXT NOT NULL DEFAULT '',
      article_body_or TEXT NOT NULL DEFAULT '',
      syllabus_topics_json TEXT NOT NULL DEFAULT '[]',
      key_facts_table_json TEXT NOT NULL DEFAULT '[]',
      pyq_analysis_json TEXT NOT NULL DEFAULT '[]',
      practice_mcqs_json TEXT NOT NULL DEFAULT '[]',
      reference_links_json TEXT NOT NULL DEFAULT '[]',
      linked_job_ids_json TEXT NOT NULL DEFAULT '[]',
      notes_pdf_url TEXT NOT NULL DEFAULT '',
      pyq_pdf_url TEXT NOT NULL DEFAULT '',
      answer_key_pdf_url TEXT NOT NULL DEFAULT '',
      pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
      extra_attachments_json TEXT NOT NULL DEFAULT '[]',
      edition_note_en TEXT NOT NULL DEFAULT '',
      edition_note_or TEXT NOT NULL DEFAULT '',
      scheduled_publish_at TEXT NOT NULL DEFAULT '',
      preview_token TEXT NOT NULL DEFAULT '',
      preview_expires_at TEXT NOT NULL DEFAULT '',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_free_access INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      pdf_downloads_count INTEGER NOT NULL DEFAULT 0,
      completions_count INTEGER NOT NULL DEFAULT 0,
      bookmarks_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS study_article_revisions (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL DEFAULT 1,
      change_summary TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS candidate_study_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      needs_revision INTEGER NOT NULL DEFAULT 0,
      mcq_score REAL NOT NULL DEFAULT 0,
      mcq_total INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 1,
      last_studied_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, article_id)
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS study_reader_doubts (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      reader_name TEXT NOT NULL DEFAULT 'Anonymous Learner',
      doubt_type TEXT NOT NULL DEFAULT 'chapter_doubt',
      message_text TEXT NOT NULL,
      admin_reply TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT NOT NULL DEFAULT ''
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS editorial_snippets (
      id TEXT PRIMARY KEY,
      snippet_key TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'general',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 100,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    _schemaReady = true;
  } catch (e) {
    console.error('ensureStudyPublishingSchema error:', e);
  }
}

async function invalidateStudyCaches(request, slug = '') {
  const extra = [
    '/api/public/study',
    '/api/public/study/tree',
    '/api/public/study/bootstrap',
    '/api/public/study/article',
    '/api/public/study-library/bootstrap',
    '/api/public/study-library/list',
    '/api/public/jobs',
    '/api/public/jobs/article',
    '/study-library/',
    '/study-library/index.html',
    '/study/',
    '/study/index.html',
    '/',
    '/index.html'
  ];
  if (slug) {
    extra.push(`/api/public/study/article?slug=${encodeURIComponent(slug)}`);
  }
  await invalidateAllPublicCaches(request, extra);
}

// ============================================================================
// SCHEDULED AUTO-PUBLISH HELPER
// ============================================================================
export async function publishDueScheduledStudyArticles(db) {
  if (!db) return 0;
  try {
    const nowIso = new Date().toISOString();
    const res = await db.prepare(
      `UPDATE study_articles
       SET is_published = 1,
           published_at = CASE WHEN published_at = '' THEN datetime('now') ELSE published_at END,
           updated_at = datetime('now')
       WHERE is_published = 0
         AND scheduled_publish_at != ''
         AND replace(scheduled_publish_at, 'T', ' ') <= replace(?, 'T', ' ')`
    ).bind(nowIso.slice(0, 19)).run();
    return Number((res && res.meta && res.meta.changes) || 0);
  } catch {
    return 0;
  }
}

// ============================================================================
// TAXONOMY HELPERS
// ============================================================================
function formatTaxonomyNode(row) {
  if (!row) return null;
  return {
    id: row.id,
    level: Number(row.level || 1),
    parent_id: row.parent_id || null,
    slug: row.slug,
    title_en: row.title_en,
    title_or: row.title_or || '',
    subtitle_en: row.subtitle_en || '',
    subtitle_or: row.subtitle_or || '',
    icon: row.icon || '',
    accent_variant: row.accent_variant || 'indigo',
    sort_order: Number(row.sort_order || 100),
    is_published: Boolean(row.is_published),
    updated_at: row.updated_at || ''
  };
}

async function loadTaxonomyMap(db) {
  const { results } = await db.prepare(
    'SELECT * FROM study_taxonomy_nodes ORDER BY level ASC, sort_order ASC, title_en ASC'
  ).all().catch(() => ({ results: [] }));
  const map = new Map();
  const list = (results || []).map(r => {
    const f = formatTaxonomyNode(r);
    map.set(f.id, f);
    return f;
  });
  return { list, map };
}

function buildTaxonomyTree(nodes) {
  const byId = new Map();
  nodes.forEach(n => byId.set(n.id, { ...n, children: [] }));
  const roots = [];
  for (const node of byId.values()) {
    if (node.level === 1 || !node.parent_id || !byId.has(node.parent_id)) {
      if (node.level === 1) roots.push(node);
    } else {
      byId.get(node.parent_id).children.push(node);
    }
  }
  const sortFn = (a, b) => (a.sort_order - b.sort_order) || a.title_en.localeCompare(b.title_en);
  roots.sort(sortFn);
  roots.forEach(l1 => {
    l1.children.sort(sortFn);
    l1.children.forEach(l2 => l2.children.sort(sortFn));
  });
  return roots;
}

// ============================================================================
// STRUCTURED JSON SANITIZERS
// ============================================================================
function sanitizeSyllabusTopics(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 60).map(r => ({
    unit: str(r && r.unit, 80),
    topic_en: str(r && (r.topic_en || r.topic), 220),
    topic_or: str(r && r.topic_or, 220),
    weightage: str(r && r.weightage, 60),
    priority: str(r && r.priority, 40)
  })).filter(r => r.unit || r.topic_en);
}

function sanitizeKeyFacts(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 100).map(r => ({
    term_en: str(r && (r.term_en || r.term || r.label), 180),
    term_or: str(r && r.term_or, 180),
    fact_en: str(r && (r.fact_en || r.fact || r.value), 500),
    fact_or: str(r && r.fact_or, 500),
    tag: str(r && r.tag, 60)
  })).filter(r => r.term_en || r.fact_en);
}

function sanitizePyqAnalysis(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 40).map(r => ({
    year: str(r && r.year, 30),
    exam: str(r && r.exam, 100),
    questions_asked: str(r && (r.questions_asked || r.count), 40),
    difficulty: str(r && r.difficulty, 40),
    cutoff_or_trend: str(r && (r.cutoff_or_trend || r.trend), 220)
  })).filter(r => r.year || r.exam || r.cutoff_or_trend);
}

function sanitizePracticeMcqs(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 60).map((q, idx) => {
    const rawOpts = Array.isArray(q && q.options) ? q.options : [q && q.opt_a, q && q.opt_b, q && q.opt_c, q && q.opt_d];
    const options = rawOpts.slice(0, 4).map(o => str(o, 260));
    while (options.length < 4) options.push('');
    const rawOptsOr = Array.isArray(q && q.options_or) ? q.options_or : [];
    const options_or = rawOptsOr.slice(0, 4).map(o => str(o, 260));
    const correctIndex = Math.max(0, Math.min(3, intOrZero(q && (q.correct_index !== undefined ? q.correct_index : q.answer), 0, 3)));
    return {
      id: str(q && q.id, 40) || `q${idx + 1}`,
      question_en: str(q && (q.question_en || q.question), 500),
      question_or: str(q && q.question_or, 500),
      options,
      options_or,
      correct_index: correctIndex,
      explanation_en: str(q && (q.explanation_en || q.explanation), 600),
      explanation_or: str(q && q.explanation_or, 600)
    };
  }).filter(q => q.question_en && q.options.filter(Boolean).length >= 2);
}

function sanitizeReferenceLinks(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 20).map(r => ({
    label_en: str(r && (r.label_en || r.label), 160),
    label_or: str(r && r.label_or, 160),
    url: safeHref(r && r.url),
    kind: str(r && r.kind, 40) || 'Reference'
  })).filter(r => r.label_en && r.url);
}

function sanitizePdfBookmarks(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 30).map(r => ({
    page: Math.max(1, intOrZero(r && r.page, 1, 2000)),
    label: str(r && r.label, 140)
  })).filter(r => r.label);
}

function sanitizeExtraAttachments(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 15).map(r => ({
    label: str(r && r.label, 140),
    url: safeHref(r && r.url),
    kind: str(r && r.kind, 32) || 'pdf'
  })).filter(r => r.label && r.url);
}

function sanitizeLinkedIds(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => str(x, 120)).filter(Boolean))].slice(0, 20);
}

function formatStudyArticle(row, taxMap = new Map(), includeAdminFields = false) {
  if (!row) return null;
  const l1 = taxMap.get(row.category_l1_id) || null;
  const l2 = taxMap.get(row.category_l2_id) || null;
  const l3 = taxMap.get(row.category_l3_id) || null;
  const isPublished = Boolean(row.is_published);
  const sched = row.scheduled_publish_at || '';
  const statusLabel = isPublished ? 'published' : (sched ? 'scheduled' : 'draft');
  const mcqs = parseJson(row.practice_mcqs_json, []);
  const keyFacts = parseJson(row.key_facts_table_json, []);

  const out = {
    id: row.id,
    slug: row.slug,
    category_l1_id: row.category_l1_id || '',
    category_l2_id: row.category_l2_id || '',
    category_l3_id: row.category_l3_id || '',
    taxonomy: {
      l1: l1 ? { id: l1.id, slug: l1.slug, title_en: l1.title_en, title_or: l1.title_or, icon: l1.icon, accent_variant: l1.accent_variant } : null,
      l2: l2 ? { id: l2.id, slug: l2.slug, title_en: l2.title_en, title_or: l2.title_or, icon: l2.icon, accent_variant: l2.accent_variant } : null,
      l3: l3 ? { id: l3.id, slug: l3.slug, title_en: l3.title_en, title_or: l3.title_or, icon: l3.icon, accent_variant: l3.accent_variant } : null
    },
    resource_type_badge: row.resource_type_badge || 'Study Notes',
    difficulty_level: row.difficulty_level || 'Moderate',
    high_yield_priority: row.high_yield_priority || 'High',
    estimated_read_mins: Number(row.estimated_read_mins || 10),
    negative_marking_rule: row.negative_marking_rule || 'None',
    title_en: row.title_en || '',
    title_or: row.title_or || '',
    subtitle_en: row.subtitle_en || '',
    subtitle_or: row.subtitle_or || '',
    summary_en: row.summary_en || '',
    summary_or: row.summary_or || '',
    exam_board_tag: row.exam_board_tag || '',
    paper_code: row.paper_code || '',
    pyq_year: row.pyq_year || '',
    language_medium: row.language_medium || 'Bilingual (EN + OR)',
    cover_image_url: row.cover_image_url || '',
    cover_image_caption: row.cover_image_caption || '',
    article_body_en: row.article_body_en || '',
    article_body_or: row.article_body_or || '',
    syllabus_topics: parseJson(row.syllabus_topics_json, []),
    key_facts_table: keyFacts,
    pyq_analysis: parseJson(row.pyq_analysis_json, []),
    practice_mcqs: mcqs,
    mcq_count: Array.isArray(mcqs) ? mcqs.length : 0,
    flashcard_count: Array.isArray(keyFacts) ? keyFacts.length : 0,
    reference_links: parseJson(row.reference_links_json, []),
    linked_job_ids: parseJson(row.linked_job_ids_json, []),
    notes_pdf_url: row.notes_pdf_url || '',
    pyq_pdf_url: row.pyq_pdf_url || '',
    answer_key_pdf_url: row.answer_key_pdf_url || '',
    pdf_index_bookmarks: parseJson(row.pdf_index_bookmarks_json, []),
    extra_attachments: parseJson(row.extra_attachments_json, []),
    edition_note_en: row.edition_note_en || '',
    edition_note_or: row.edition_note_or || '',
    scheduled_publish_at: sched,
    is_featured: Boolean(row.is_featured),
    is_free_access: row.is_free_access === undefined ? true : Boolean(row.is_free_access),
    is_published: isPublished,
    status: statusLabel,
    views_count: Number(row.views_count || 0),
    pdf_downloads_count: Number(row.pdf_downloads_count || 0),
    completions_count: Number(row.completions_count || 0),
    bookmarks_count: Number(row.bookmarks_count || 0),
    published_at: row.published_at || '',
    updated_at: row.updated_at || '',
    public_url: `/study-library/?slug=${encodeURIComponent(row.slug)}`
  };
  if (includeAdminFields) {
    out.preview_token = row.preview_token || '';
    out.preview_expires_at = row.preview_expires_at || '';
  }
  return out;
}

// ============================================================================
// PDF-TO-STUDY-NOTES AUTO-DRAFT EXTRACTOR
// ============================================================================
export function extractStudyMetadataFromPdfBytes(bytes) {
  const out = {
    title_en: '',
    exam_board_tag: '',
    paper_code: '',
    pyq_year: '',
    resource_type_badge: '',
    summary_en: '',
    estimated_read_mins: 0
  };
  if (!bytes || !bytes.length) return out;
  const maxLen = Math.min(bytes.length, 300 * 1024);
  let raw = '';
  for (let i = 0; i < maxLen; i++) {
    const c = bytes[i];
    raw += (c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9 ? String.fromCharCode(c) : ' ';
  }
  // Extract PDF literal strings inside parentheses or plain text runs
  const chunks = [];
  const parenRe = /\(([^()]{4,240})\)/g;
  let m;
  while ((m = parenRe.exec(raw)) !== null && chunks.length < 400) {
    const cleaned = m[1].replace(/\\([()\\])/g, '$1').replace(/\s+/g, ' ').trim();
    if (/[a-zA-Z0-9]{3,}/.test(cleaned)) chunks.push(cleaned);
  }
  const text = (chunks.length >= 3 ? chunks.join(' \n ') : raw)
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/[ \t]+/g, ' ');

  // 1. Exam Board detection
  const boardHints = [
    [/\bOPSC\b|Odisha Public Service Commission|OCS|OAS/i, 'OPSC (Odisha Civil Services)'],
    [/\bOSSC\b|Odisha Staff Selection Commission/i, 'OSSC'],
    [/\bOSSSC\b|Odisha Sub-?ordinate Staff Selection/i, 'OSSSC'],
    [/\bOTET\b|\bOSSTET\b|\bOAVS\b|Board of Secondary Education/i, 'BSE Odisha / TET'],
    [/\bCHSE\b|Council of Higher Secondary Education/i, 'CHSE Odisha'],
    [/\bUGC\s*NET\b|\bNTA\b|\bSSB\s*Odisha\b/i, 'NTA UGC NET / SSB'],
    [/\bUPSC\b|Union Public Service Commission/i, 'UPSC'],
    [/\bSSC\s*(?:CGL|CHSL|MTS|GD)\b/i, 'SSC (Central)'],
    [/\bRRB\b|\bIBPS\b|\bSBI\b/i, 'Central Banking / RRB']
  ];
  for (const [re, label] of boardHints) {
    if (re.test(text)) { out.exam_board_tag = label; break; }
  }

  // 2. Paper Code detection
  const paperMatch = text.match(/(?:paper\s*(?:code|no\.?|number)?\s*[:\-]?\s*)((?:GS|CSAT|MIL|ENG|OPT|P|PAPER)[-\s]?[I|V|X|0-9]{1,8})/i)
    || text.match(/\b(GS[-\s]?I{1,3}V?|Paper[-\s]?[1-4I]{1,3}|CSAT[-\s]?II)\b/i);
  if (paperMatch) out.paper_code = str(paperMatch[1], 40).toUpperCase();

  // 3. PYQ Year detection
  const pyqMatch = text.match(/(?:previous\s+year|pyq|question\s+paper|exam(?:ination)?\s+held\s+in|solved\s+paper)[^0-9]{0,30}(20[12]\d)/i)
    || text.match(/\b(202[0-6]|201[5-9])\b/);
  if (pyqMatch) out.pyq_year = str(pyqMatch[1], 12);

  // 4. Resource Type detection
  if (/\bsyllabus\b|exam\s+pattern|scheme\s+of\s+examination/i.test(text)) {
    out.resource_type_badge = 'Syllabus';
  } else if (/\bprevious\s+year|question\s+paper|pyq\b|answer\s+key/i.test(text)) {
    out.resource_type_badge = 'PYQ Paper';
  } else if (/\bpractice\s+set|mock\s+test|multiple\s+choice|mcq\b/i.test(text)) {
    out.resource_type_badge = 'Practice Set';
  } else if (/\brevision\s+sheet|formula\s+sheet|one[-\s]?liner|capsule\b/i.test(text)) {
    out.resource_type_badge = 'Revision Sheet';
  } else {
    out.resource_type_badge = 'Study Notes';
  }

  // 5. Title hint from first meaningful line
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length >= 10 && l.length <= 140 && !/^%PDF|obj$|endobj|stream|xref|trailer/i.test(l));
  if (lines.length) {
    out.title_en = str(lines[0], 180);
  }

  // 6. Structured summary notes from extracted sentences
  const bodyLines = lines.slice(0, 4).join(' — ');
  if (bodyLines) {
    out.summary_en = str(bodyLines, 320);
  }

  // 7. Rough read time estimate
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  out.estimated_read_mins = Math.max(5, Math.min(60, Math.round(wordCount / 180) || 10));

  return out;
}

// ============================================================================
// ADMIN: 3-LAYER CURRICULUM TAXONOMY CRUD (/api/admin/study/taxonomy)
// ============================================================================
export async function handleStudyTaxonomyAdmin(request, env, actor, nodeId, action) {
  const db = env.DB;
  await ensureStudyPublishingSchema(db);
  const method = request.method;

  if (!nodeId && method === 'GET') {
    const { list } = await loadTaxonomyMap(db);
    const { results: counts } = await db.prepare(
      `SELECT category_l1_id, category_l2_id, category_l3_id,
              COUNT(*) AS total_count,
              SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) AS published_count
       FROM study_articles
       GROUP BY category_l1_id, category_l2_id, category_l3_id`
    ).all().catch(() => ({ results: [] }));

    const countMap = new Map();
    const bump = (id, tot, pub) => {
      if (!id) return;
      const cur = countMap.get(id) || { total: 0, published: 0 };
      cur.total += Number(tot || 0);
      cur.published += Number(pub || 0);
      countMap.set(id, cur);
    };
    (counts || []).forEach(r => {
      bump(r.category_l1_id, r.total_count, r.published_count);
      bump(r.category_l2_id, r.total_count, r.published_count);
      bump(r.category_l3_id, r.total_count, r.published_count);
    });

    const enriched = list.map(n => ({
      ...n,
      total_modules: (countMap.get(n.id) || { total: 0 }).total,
      published_modules: (countMap.get(n.id) || { published: 0 }).published
    }));
    return json({ ok: true, nodes: enriched, tree: buildTaxonomyTree(enriched) });
  }

  if (!nodeId && method === 'POST') {
    const body = await readJson(request, 20000);
    const level = Number(body.level);
    if (![1, 2, 3].includes(level)) throw validationError({ level: 'Level must be 1, 2, or 3.' });
    const titleEn = str(body.title_en, 140);
    if (!titleEn) throw validationError({ title_en: 'English title is required.' });
    const parentId = level === 1 ? null : str(body.parent_id, 80) || null;
    if (level > 1 && !parentId) throw validationError({ parent_id: 'Parent node is required for Level 2 and Level 3.' });
    if (parentId) {
      const parent = await db.prepare('SELECT id, level FROM study_taxonomy_nodes WHERE id = ?').bind(parentId).first();
      if (!parent || Number(parent.level) !== level - 1) {
        throw validationError({ parent_id: `Parent must be an existing Level ${level - 1} node.` });
      }
    }
    const slug = slugify(body.slug || titleEn, `study-l${level}`);
    const maxRow = await db.prepare(
      "SELECT COALESCE(MAX(sort_order), 0) AS m FROM study_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ?"
    ).bind(level, parentId || '').first().catch(() => ({ m: 0 }));
    const sortOrder = body.sort_order !== undefined && body.sort_order !== ''
      ? intOrZero(body.sort_order, 0, 100000)
      : Number((maxRow && maxRow.m) || 0) + 10;
    const id = `stax_l${level}_${Date.now().toString(36)}_${randomHex(3)}`;

    await db.prepare(
      `INSERT INTO study_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id, level, parentId, slug, titleEn, str(body.title_or, 160),
      str(body.subtitle_en, 240), str(body.subtitle_or, 240),
      str(body.icon, 24), str(body.accent_variant || 'indigo', 32),
      sortOrder, boolInt(body.is_published, 1)
    ).run();

    const created = formatTaxonomyNode(await db.prepare('SELECT * FROM study_taxonomy_nodes WHERE id = ?').bind(id).first());
    await audit(env, request, actor, 'study_taxonomy.create', 'study_taxonomy_nodes', id, { level, parent_id: parentId, title_en: titleEn });
    await invalidateStudyCaches(request);
    const res = json({ ok: true, node: created }, 201);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && action === 'move' && method === 'POST') {
    const body = await readJson(request, 5000);
    const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
    if (!dir) throw validationError({ direction: 'direction must be up or down.' });
    const node = await db.prepare('SELECT * FROM study_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!node) throw new HttpError(404, 'NOT_FOUND', 'Study taxonomy node not found');
    const { results: siblings } = await db.prepare(
      "SELECT id FROM study_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ? ORDER BY sort_order ASC, title_en ASC"
    ).bind(node.level, node.parent_id || '').all();
    const ids = (siblings || []).map(s => s.id);
    const idx = ids.indexOf(nodeId);
    const swapIdx = idx + dir;
    if (idx >= 0 && swapIdx >= 0 && swapIdx < ids.length) {
      [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
      await db.batch(ids.map((rid, n) =>
        db.prepare("UPDATE study_taxonomy_nodes SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)
      ));
    }
    await audit(env, request, actor, 'study_taxonomy.reorder', 'study_taxonomy_nodes', nodeId, { direction: body.direction });
    await invalidateStudyCaches(request);
    const res = json({ ok: true, id: nodeId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM study_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Study taxonomy node not found');
    const body = await readJson(request, 20000);
    const fields = [];
    const vals = [];
    const set = (col, val) => { fields.push(`${col} = ?`); vals.push(val); };
    if (body.title_en !== undefined) {
      const t = str(body.title_en, 140);
      if (!t) throw validationError({ title_en: 'English title is required.' });
      set('title_en', t);
    }
    if (body.slug !== undefined) set('slug', slugify(body.slug || existing.title_en, existing.slug));
    if (body.title_or !== undefined) set('title_or', str(body.title_or, 160));
    if (body.subtitle_en !== undefined) set('subtitle_en', str(body.subtitle_en, 240));
    if (body.subtitle_or !== undefined) set('subtitle_or', str(body.subtitle_or, 240));
    if (body.icon !== undefined) set('icon', str(body.icon, 24));
    if (body.accent_variant !== undefined) set('accent_variant', str(body.accent_variant || 'indigo', 32));
    if (body.sort_order !== undefined) set('sort_order', intOrZero(body.sort_order, 0, 100000));
    if (body.is_published !== undefined) set('is_published', boolInt(body.is_published, 1));
    if (fields.length) {
      await db.prepare(`UPDATE study_taxonomy_nodes SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, nodeId).run();
    }
    const updated = formatTaxonomyNode(await db.prepare('SELECT * FROM study_taxonomy_nodes WHERE id = ?').bind(nodeId).first());
    await audit(env, request, actor, 'study_taxonomy.update', 'study_taxonomy_nodes', nodeId, { title_en: updated.title_en });
    await invalidateStudyCaches(request);
    const res = json({ ok: true, node: updated });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT * FROM study_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Study taxonomy node not found');
    const childRow = await db.prepare('SELECT COUNT(*) AS n FROM study_taxonomy_nodes WHERE parent_id = ?').bind(nodeId).first().catch(() => ({ n: 0 }));
    if (Number((childRow && childRow.n) || 0) > 0) {
      throw new HttpError(409, 'HAS_CHILDREN', 'Delete child subjects/chapters first before removing this taxonomy node.');
    }
    await db.prepare('DELETE FROM study_taxonomy_nodes WHERE id = ?').bind(nodeId).run();
    await audit(env, request, actor, 'study_taxonomy.delete', 'study_taxonomy_nodes', nodeId, { title_en: existing.title_en });
    await invalidateStudyCaches(request);
    const res = json({ ok: true, deleted: nodeId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown study taxonomy route');
}

// ============================================================================
// ADMIN: DIRECT R2 UPLOAD + PDF AUTO-DRAFT EXTRACTOR (/api/admin/study/upload)
// ============================================================================
function sniffMime(b) {
  const eq = (off, sig) => sig.every((x, i) => b[off + i] === x);
  if (b.length >= 3 && eq(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (b.length >= 8 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (b.length >= 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  if (b.length >= 5 && eq(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

export async function handleStudyMediaUpload(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 MEDIA storage is not configured');
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use multipart/form-data');

  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Invalid multipart payload'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw validationError({ file: 'Select an image or PDF file to upload.' });
  const purpose = str(form.get('purpose') || 'study-asset', 40).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'study-asset';
  if (file.size <= 0) throw validationError({ file: 'Uploaded file is empty.' });

  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const sniffed = sniffMime(bytes.slice(0, 16));
  const declared = (file.type || sniffed || '').toLowerCase();
  const spec = ALLOWED_UPLOAD_MIME[sniffed || declared];
  if (!spec || !sniffed) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP images and PDF files are supported.');
  }
  if (file.size > spec.max) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `File exceeds ${Math.round(spec.max / MB)} MB limit.`);
  }

  const baseName = slugify((file.name || purpose).replace(/\.[^.]+$/, ''), purpose).slice(0, 48);
  const key = `study-publishing/${Date.now()}-${baseName}-${randomHex(3)}.${spec.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: sniffed } });
  const publicUrl = `/api/media/${key}`;

  try {
    await env.DB.prepare(
      `INSERT INTO media_files (id, original_filename, title_en, file_category, mime_type, file_size_bytes, r2_key, public_url, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind('mf_' + randomHex(6), str(file.name || key, 140), str(file.name || purpose, 140), spec.kind, sniffed, file.size, key, publicUrl, actor.email || actor.userId).run();
  } catch { /* non-fatal if media_files schema differs */ }

  const extractedDraft = spec.kind === 'pdf' ? extractStudyMetadataFromPdfBytes(bytes) : null;
  await audit(env, request, actor, 'study_media.upload', 'media', key, { purpose, kind: spec.kind, size: file.size });
  return json({
    ok: true,
    key,
    url: publicUrl,
    kind: spec.kind,
    mime_type: sniffed,
    size_bytes: file.size,
    filename: str(file.name || key, 160),
    extracted_draft: extractedDraft
  }, 201);
}

// ============================================================================
// ADMIN: ACTIVE JOBS CROSS-LINK OPTIONS (/api/admin/study/job-options)
// ============================================================================
export async function handleStudyJobOptions(env) {
  const db = env.DB;
  const rows = await db.prepare(
    'SELECT id, slug, title_en, organisation_en, last_date, is_published FROM job_articles ORDER BY is_published DESC, updated_at DESC LIMIT 80'
  ).all().then(r => r.results || []).catch(() => []);
  return json({
    ok: true,
    items: rows.map(r => ({
      id: r.id,
      slug: r.slug,
      title_en: r.title_en,
      organisation_en: r.organisation_en || '',
      last_date: r.last_date || '',
      is_published: Boolean(r.is_published),
      url: `/jobs/?slug=${encodeURIComponent(r.slug)}`
    }))
  });
}

// ============================================================================
// ADMIN: STUDY ARTICLES CRUD, PREVIEW TOKEN & REVISIONS (/api/admin/study/articles)
// ============================================================================
function normalizeStudyPayload(body, existing = null) {
  const errors = {};
  const titleEn = body.title_en !== undefined ? str(body.title_en, 240) : (existing ? existing.title_en : '');
  if (!titleEn) errors.title_en = 'English title is required.';

  const slug = body.slug !== undefined
    ? slugify(body.slug || titleEn, 'study-' + Date.now().toString(36))
    : (existing ? existing.slug : slugify(titleEn, 'study-' + Date.now().toString(36)));

  const rawType = body.resource_type_badge !== undefined ? str(body.resource_type_badge, 48) : (existing ? existing.resource_type_badge : 'Study Notes');
  const resType = RESOURCE_TYPES.includes(rawType) ? rawType : (rawType || 'Study Notes');

  const rawDiff = body.difficulty_level !== undefined ? str(body.difficulty_level, 32) : (existing ? existing.difficulty_level : 'Moderate');
  const diff = DIFFICULTY_LEVELS.includes(rawDiff) ? rawDiff : 'Moderate';

  const rawPrio = body.high_yield_priority !== undefined ? str(body.high_yield_priority, 32) : (existing ? existing.high_yield_priority : 'High');
  const prio = HIGH_YIELD_PRIORITIES.includes(rawPrio) ? rawPrio : 'High';

  const rawNeg = body.negative_marking_rule !== undefined ? str(body.negative_marking_rule, 48) : (existing ? existing.negative_marking_rule : 'None');
  const negRule = NEGATIVE_MARKING_RULES.includes(rawNeg) ? rawNeg : (rawNeg || 'None');

  const isPublished = body.is_published !== undefined ? boolInt(body.is_published, 0) : (existing ? Number(existing.is_published || 0) : 0);
  const sched = body.scheduled_publish_at !== undefined ? str(body.scheduled_publish_at, 40) : (existing ? existing.scheduled_publish_at : '');

  if (Object.keys(errors).length) throw validationError(errors);

  const pick = (field, max = 500, def = '') => body[field] !== undefined ? str(body[field], max) : (existing ? String(existing[field] || '') : def);
  const pickHref = (field) => body[field] !== undefined ? safeHref(body[field]) : (existing ? String(existing[field] || '') : '');

  const pubAt = isPublished
    ? (existing && existing.published_at ? existing.published_at : nowIsoSql())
    : (existing ? String(existing.published_at || '') : '');

  return {
    slug,
    category_l1_id: pick('category_l1_id', 80),
    category_l2_id: pick('category_l2_id', 80),
    category_l3_id: pick('category_l3_id', 80),
    resource_type_badge: resType,
    difficulty_level: diff,
    high_yield_priority: prio,
    estimated_read_mins: body.estimated_read_mins !== undefined ? Math.max(1, intOrZero(body.estimated_read_mins, 1, 240)) : (existing ? Number(existing.estimated_read_mins || 10) : 10),
    negative_marking_rule: negRule,
    title_en: titleEn,
    title_or: pick('title_or', 260),
    subtitle_en: pick('subtitle_en', 260),
    subtitle_or: pick('subtitle_or', 260),
    summary_en: pick('summary_en', 1200),
    summary_or: pick('summary_or', 1200),
    exam_board_tag: pick('exam_board_tag', 120),
    paper_code: pick('paper_code', 60),
    pyq_year: pick('pyq_year', 24),
    language_medium: pick('language_medium', 60, 'Bilingual (EN + OR)'),
    cover_image_url: pickHref('cover_image_url'),
    cover_image_caption: pick('cover_image_caption', 240),
    article_body_en: body.article_body_en !== undefined ? str(body.article_body_en, 50000) : (existing ? String(existing.article_body_en || '') : ''),
    article_body_or: body.article_body_or !== undefined ? str(body.article_body_or, 50000) : (existing ? String(existing.article_body_or || '') : ''),
    syllabus_topics_json: JSON.stringify(body.syllabus_topics !== undefined ? sanitizeSyllabusTopics(body.syllabus_topics) : (existing ? parseJson(existing.syllabus_topics_json, []) : [])),
    key_facts_table_json: JSON.stringify(body.key_facts_table !== undefined ? sanitizeKeyFacts(body.key_facts_table) : (existing ? parseJson(existing.key_facts_table_json, []) : [])),
    pyq_analysis_json: JSON.stringify(body.pyq_analysis !== undefined ? sanitizePyqAnalysis(body.pyq_analysis) : (existing ? parseJson(existing.pyq_analysis_json, []) : [])),
    practice_mcqs_json: JSON.stringify(body.practice_mcqs !== undefined ? sanitizePracticeMcqs(body.practice_mcqs) : (existing ? parseJson(existing.practice_mcqs_json, []) : [])),
    reference_links_json: JSON.stringify(body.reference_links !== undefined ? sanitizeReferenceLinks(body.reference_links) : (existing ? parseJson(existing.reference_links_json, []) : [])),
    linked_job_ids_json: JSON.stringify(body.linked_job_ids !== undefined ? sanitizeLinkedIds(body.linked_job_ids) : (existing ? parseJson(existing.linked_job_ids_json, []) : [])),
    notes_pdf_url: pickHref('notes_pdf_url'),
    pyq_pdf_url: pickHref('pyq_pdf_url'),
    answer_key_pdf_url: pickHref('answer_key_pdf_url'),
    pdf_index_bookmarks_json: JSON.stringify(body.pdf_index_bookmarks !== undefined ? sanitizePdfBookmarks(body.pdf_index_bookmarks) : (existing ? parseJson(existing.pdf_index_bookmarks_json, []) : [])),
    extra_attachments_json: JSON.stringify(body.extra_attachments !== undefined ? sanitizeExtraAttachments(body.extra_attachments) : (existing ? parseJson(existing.extra_attachments_json, []) : [])),
    edition_note_en: pick('edition_note_en', 400),
    edition_note_or: pick('edition_note_or', 400),
    scheduled_publish_at: sched,
    is_featured: body.is_featured !== undefined ? boolInt(body.is_featured, 0) : (existing ? Number(existing.is_featured || 0) : 0),
    is_free_access: body.is_free_access !== undefined ? boolInt(body.is_free_access, 1) : (existing ? Number(existing.is_free_access ?? 1) : 1),
    is_published: isPublished,
    published_at: pubAt
  };
}

async function saveStudyRevision(db, articleId, snapshotObj, changeSummary, createdBy) {
  try {
    const revRow = await db.prepare('SELECT COALESCE(MAX(revision_number), 0) AS m FROM study_article_revisions WHERE article_id = ?').bind(articleId).first();
    const nextNum = Number((revRow && revRow.m) || 0) + 1;
    await db.prepare(
      `INSERT INTO study_article_revisions (id, article_id, revision_number, change_summary, snapshot_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(`srev_${Date.now().toString(36)}_${randomHex(3)}`, articleId, nextNum, str(changeSummary || 'Editorial update', 240), JSON.stringify(snapshotObj), str(createdBy, 120)).run();
  } catch { /* non-fatal */ }
}

export async function handleStudyArticlesAdmin(request, env, actor, articleId, action) {
  const db = env.DB;
  await ensureStudyPublishingSchema(db);
  await publishDueScheduledStudyArticles(db);
  const method = request.method;
  const url = new URL(request.url);

  // POST /api/admin/study/:id/preview-token
  if (articleId && action === 'preview-token' && method === 'POST') {
    const row = await db.prepare('SELECT id, slug, title_en FROM study_articles WHERE id = ?').bind(articleId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Study module not found');
    const token = randomHex(20);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await db.prepare("UPDATE study_articles SET preview_token = ?, preview_expires_at = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(token, expiresAt, articleId).run();
    await audit(env, request, actor, 'study_article.preview_token', 'study_articles', articleId, { slug: row.slug });
    return json({
      ok: true,
      id: articleId,
      slug: row.slug,
      preview_token: token,
      preview_expires_at: expiresAt,
      preview_url: `/study-library/?slug=${encodeURIComponent(row.slug)}&preview_token=${encodeURIComponent(token)}`
    });
  }

  // GET /api/admin/study/:id/revisions
  if (articleId && action === 'revisions' && method === 'GET') {
    const { results } = await db.prepare(
      'SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM study_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 30'
    ).bind(articleId).all().catch(() => ({ results: [] }));
    return json({ ok: true, items: results || [] });
  }

  // POST /api/admin/study/:id/rollback
  if (articleId && action === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = str(body.revision_id, 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required.' });
    const rev = await db.prepare('SELECT * FROM study_article_revisions WHERE id = ? AND article_id = ?').bind(revId, articleId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const snap = parseJson(rev.snapshot_json, null);
    if (!snap || !snap.title_en) throw new HttpError(400, 'BAD_SNAPSHOT', 'Invalid revision snapshot');
    const existing = await db.prepare('SELECT * FROM study_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Study module not found');

    const data = normalizeStudyPayload(snap, existing);
    await db.prepare(
      `UPDATE study_articles SET
        category_l1_id = ?, category_l2_id = ?, category_l3_id = ?,
        resource_type_badge = ?, difficulty_level = ?, high_yield_priority = ?, estimated_read_mins = ?, negative_marking_rule = ?,
        title_en = ?, title_or = ?, subtitle_en = ?, subtitle_or = ?, summary_en = ?, summary_or = ?,
        exam_board_tag = ?, paper_code = ?, pyq_year = ?, language_medium = ?,
        cover_image_url = ?, cover_image_caption = ?, article_body_en = ?, article_body_or = ?,
        syllabus_topics_json = ?, key_facts_table_json = ?, pyq_analysis_json = ?, practice_mcqs_json = ?,
        reference_links_json = ?, linked_job_ids_json = ?,
        notes_pdf_url = ?, pyq_pdf_url = ?, answer_key_pdf_url = ?,
        pdf_index_bookmarks_json = ?, extra_attachments_json = ?,
        edition_note_en = ?, edition_note_or = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      data.category_l1_id, data.category_l2_id, data.category_l3_id,
      data.resource_type_badge, data.difficulty_level, data.high_yield_priority, data.estimated_read_mins, data.negative_marking_rule,
      data.title_en, data.title_or, data.subtitle_en, data.subtitle_or, data.summary_en, data.summary_or,
      data.exam_board_tag, data.paper_code, data.pyq_year, data.language_medium,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.syllabus_topics_json, data.key_facts_table_json, data.pyq_analysis_json, data.practice_mcqs_json,
      data.reference_links_json, data.linked_job_ids_json,
      data.notes_pdf_url, data.pyq_pdf_url, data.answer_key_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json,
      data.edition_note_en, data.edition_note_or, articleId
    ).run();

    const updatedRow = await db.prepare('SELECT * FROM study_articles WHERE id = ?').bind(articleId).first();
    await saveStudyRevision(db, articleId, updatedRow, `Rolled back to revision #${rev.revision_number}`, actor.email);
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, 'study_article.rollback', 'study_articles', articleId, { revision_number: rev.revision_number });
    await invalidateStudyCaches(request, updatedRow.slug);
    const res = json({ ok: true, item: formatStudyArticle(updatedRow, taxMap, true) });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // GET /api/admin/study/articles — List with KPIs and cascading filters
  if (!articleId && method === 'GET') {
    const l1 = str(url.searchParams.get('l1'), 80);
    const l2 = str(url.searchParams.get('l2'), 80);
    const l3 = str(url.searchParams.get('l3'), 80);
    const type = str(url.searchParams.get('type'), 48);
    const difficulty = str(url.searchParams.get('difficulty'), 32);
    const priority = str(url.searchParams.get('priority'), 32);
    const status = str(url.searchParams.get('status'), 24).toLowerCase();
    const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();

    const [{ map: taxMap }, { results: rows }, doubtsCountRow] = await Promise.all([
      loadTaxonomyMap(db),
      db.prepare('SELECT * FROM study_articles ORDER BY updated_at DESC').all().catch(() => ({ results: [] })),
      db.prepare("SELECT COUNT(*) AS n FROM study_reader_doubts WHERE status = 'open'").first().catch(() => ({ n: 0 }))
    ]);

    const all = (rows || []).map(r => formatStudyArticle(r, taxMap, true));
    const kpis = {
      total_modules: all.length,
      published_live: all.filter(a => a.is_published).length,
      scheduled_drafts: all.filter(a => !a.is_published).length,
      pyq_syllabus_sets: all.filter(a => /pyq|syllabus/i.test(a.resource_type_badge)).length,
      total_pdf_downloads: all.reduce((s, a) => s + a.pdf_downloads_count, 0),
      total_completions: all.reduce((s, a) => s + a.completions_count, 0),
      open_doubts: Number((doubtsCountRow && doubtsCountRow.n) || 0)
    };

    const filtered = all.filter(a => {
      if (l1 && a.category_l1_id !== l1) return false;
      if (l2 && a.category_l2_id !== l2) return false;
      if (l3 && a.category_l3_id !== l3) return false;
      if (type && a.resource_type_badge.toLowerCase() !== type.toLowerCase()) return false;
      if (difficulty && a.difficulty_level.toLowerCase() !== difficulty.toLowerCase()) return false;
      if (priority && a.high_yield_priority.toLowerCase() !== priority.toLowerCase()) return false;
      if (status && a.status !== status) return false;
      if (search) {
        const hay = `${a.title_en} ${a.title_or} ${a.subtitle_en} ${a.exam_board_tag} ${a.paper_code} ${a.pyq_year} ${a.slug}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return json({ ok: true, kpis, items: filtered, total: filtered.length });
  }

  // POST /api/admin/study/articles — Create new study module
  if (!articleId && method === 'POST') {
    const body = await readJson(request, 260000);
    const data = normalizeStudyPayload(body, null);
    let finalSlug = data.slug;
    const conflict = await db.prepare('SELECT id FROM study_articles WHERE slug = ?').bind(finalSlug).first().catch(() => null);
    if (conflict) finalSlug = `${finalSlug}-${randomHex(2)}`;

    const id = `sart_${Date.now().toString(36)}_${randomHex(4)}`;
    await db.prepare(
      `INSERT INTO study_articles (
        id, slug, category_l1_id, category_l2_id, category_l3_id,
        resource_type_badge, difficulty_level, high_yield_priority, estimated_read_mins, negative_marking_rule,
        title_en, title_or, subtitle_en, subtitle_or, summary_en, summary_or,
        exam_board_tag, paper_code, pyq_year, language_medium,
        cover_image_url, cover_image_caption, article_body_en, article_body_or,
        syllabus_topics_json, key_facts_table_json, pyq_analysis_json, practice_mcqs_json,
        reference_links_json, linked_job_ids_json,
        notes_pdf_url, pyq_pdf_url, answer_key_pdf_url,
        pdf_index_bookmarks_json, extra_attachments_json,
        edition_note_en, edition_note_or, scheduled_publish_at,
        is_featured, is_free_access, is_published, published_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, datetime('now')
      )`
    ).bind(
      id, finalSlug, data.category_l1_id, data.category_l2_id, data.category_l3_id,
      data.resource_type_badge, data.difficulty_level, data.high_yield_priority, data.estimated_read_mins, data.negative_marking_rule,
      data.title_en, data.title_or, data.subtitle_en, data.subtitle_or, data.summary_en, data.summary_or,
      data.exam_board_tag, data.paper_code, data.pyq_year, data.language_medium,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.syllabus_topics_json, data.key_facts_table_json, data.pyq_analysis_json, data.practice_mcqs_json,
      data.reference_links_json, data.linked_job_ids_json,
      data.notes_pdf_url, data.pyq_pdf_url, data.answer_key_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json,
      data.edition_note_en, data.edition_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_free_access, data.is_published, data.published_at
    ).run();

    const row = await db.prepare('SELECT * FROM study_articles WHERE id = ?').bind(id).first();
    await saveStudyRevision(db, id, row || data, body.change_summary || 'Initial creation', actor.email);
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, data.is_published ? 'study_article.publish' : 'study_article.create', 'study_articles', id, { slug: finalSlug, title_en: data.title_en });
    await invalidateStudyCaches(request, finalSlug);
    const res = json({ ok: true, item: formatStudyArticle(row, taxMap, true) }, 201);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // GET /api/admin/study/articles/:id
  if (articleId && !action && method === 'GET') {
    const row = await db.prepare('SELECT * FROM study_articles WHERE id = ?').bind(articleId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Study module not found');
    const [{ map: taxMap }, revRes] = await Promise.all([
      loadTaxonomyMap(db),
      db.prepare('SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM study_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 20').bind(articleId).all().catch(() => ({ results: [] }))
    ]);
    return json({ ok: true, item: formatStudyArticle(row, taxMap, true), revisions: revRes.results || [] });
  }

  // PUT / PATCH /api/admin/study/articles/:id
  if (articleId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM study_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Study module not found');
    const body = await readJson(request, 260000);
    const data = normalizeStudyPayload(body, existing);
    let finalSlug = data.slug;
    if (finalSlug !== existing.slug) {
      const conflict = await db.prepare('SELECT id FROM study_articles WHERE slug = ? AND id != ?').bind(finalSlug, articleId).first().catch(() => null);
      if (conflict) throw validationError({ slug: 'Another study module already uses this slug.' });
    }
    await db.prepare(
      `UPDATE study_articles SET
        slug = ?, category_l1_id = ?, category_l2_id = ?, category_l3_id = ?,
        resource_type_badge = ?, difficulty_level = ?, high_yield_priority = ?, estimated_read_mins = ?, negative_marking_rule = ?,
        title_en = ?, title_or = ?, subtitle_en = ?, subtitle_or = ?, summary_en = ?, summary_or = ?,
        exam_board_tag = ?, paper_code = ?, pyq_year = ?, language_medium = ?,
        cover_image_url = ?, cover_image_caption = ?, article_body_en = ?, article_body_or = ?,
        syllabus_topics_json = ?, key_facts_table_json = ?, pyq_analysis_json = ?, practice_mcqs_json = ?,
        reference_links_json = ?, linked_job_ids_json = ?,
        notes_pdf_url = ?, pyq_pdf_url = ?, answer_key_pdf_url = ?,
        pdf_index_bookmarks_json = ?, extra_attachments_json = ?,
        edition_note_en = ?, edition_note_or = ?, scheduled_publish_at = ?,
        is_featured = ?, is_free_access = ?, is_published = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      finalSlug, data.category_l1_id, data.category_l2_id, data.category_l3_id,
      data.resource_type_badge, data.difficulty_level, data.high_yield_priority, data.estimated_read_mins, data.negative_marking_rule,
      data.title_en, data.title_or, data.subtitle_en, data.subtitle_or, data.summary_en, data.summary_or,
      data.exam_board_tag, data.paper_code, data.pyq_year, data.language_medium,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.syllabus_topics_json, data.key_facts_table_json, data.pyq_analysis_json, data.practice_mcqs_json,
      data.reference_links_json, data.linked_job_ids_json,
      data.notes_pdf_url, data.pyq_pdf_url, data.answer_key_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json,
      data.edition_note_en, data.edition_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_free_access, data.is_published, data.published_at, articleId
    ).run();

    const row = await db.prepare('SELECT * FROM study_articles WHERE id = ?').bind(articleId).first();
    await saveStudyRevision(db, articleId, row || data, body.change_summary || 'Editorial update', actor.email);
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, data.is_published ? 'study_article.publish' : 'study_article.update', 'study_articles', articleId, { slug: finalSlug });
    await invalidateStudyCaches(request, finalSlug);
    const res = json({ ok: true, item: formatStudyArticle(row, taxMap, true) });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // DELETE /api/admin/study/articles/:id
  if (articleId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT id, slug, title_en FROM study_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Study module not found');
    await db.prepare('DELETE FROM study_article_revisions WHERE article_id = ?').bind(articleId).run().catch(() => {});
    await db.prepare('DELETE FROM candidate_study_progress WHERE article_id = ?').bind(articleId).run().catch(() => {});
    await db.prepare('DELETE FROM study_reader_doubts WHERE article_id = ?').bind(articleId).run().catch(() => {});
    await db.prepare('DELETE FROM study_articles WHERE id = ?').bind(articleId).run();
    await audit(env, request, actor, 'study_article.delete', 'study_articles', articleId, { slug: existing.slug, title_en: existing.title_en });
    await invalidateStudyCaches(request, existing.slug);
    const res = json({ ok: true, deleted: articleId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown study articles route');
}

// ============================================================================
// ADMIN: READER DOUBTS & PYQ CORRECTIONS QUEUE (/api/admin/study/doubts)
// ============================================================================
export async function handleStudyDoubtsAdmin(request, env, actor, doubtId) {
  const db = env.DB;
  await ensureStudyPublishingSchema(db);
  const method = request.method;
  const url = new URL(request.url);

  if (!doubtId && method === 'GET') {
    const statusFilter = str(url.searchParams.get('status'), 24).toLowerCase();
    const { results } = await db.prepare(
      `SELECT d.*, a.title_en AS article_title, a.slug AS article_slug
       FROM study_reader_doubts d
       LEFT JOIN study_articles a ON a.id = d.article_id
       ORDER BY CASE WHEN d.status = 'open' THEN 0 ELSE 1 END, d.created_at DESC
       LIMIT 200`
    ).all().catch(() => ({ results: [] }));
    const all = results || [];
    const filtered = statusFilter && statusFilter !== 'all'
      ? all.filter(d => String(d.status || '').toLowerCase() === statusFilter)
      : all;
    return json({
      ok: true,
      open_count: all.filter(d => d.status === 'open').length,
      resolved_count: all.filter(d => d.status === 'resolved').length,
      items: filtered
    });
  }

  if (doubtId && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM study_reader_doubts WHERE id = ?').bind(doubtId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Reader doubt not found');
    const body = await readJson(request, 20000);
    const adminReply = body.admin_reply !== undefined ? str(body.admin_reply, 2000) : String(existing.admin_reply || '');
    const status = body.status !== undefined
      ? (String(body.status).toLowerCase() === 'resolved' ? 'resolved' : 'open')
      : (adminReply ? 'resolved' : existing.status);
    const resolvedAt = status === 'resolved' ? nowIsoSql() : '';

    await db.prepare(
      'UPDATE study_reader_doubts SET admin_reply = ?, status = ?, resolved_at = ? WHERE id = ?'
    ).bind(adminReply, status, resolvedAt, doubtId).run();

    const updated = await db.prepare('SELECT * FROM study_reader_doubts WHERE id = ?').bind(doubtId).first();
    await audit(env, request, actor, 'study_doubt.update', 'study_reader_doubts', doubtId, { status });
    return json({ ok: true, item: updated });
  }

  if (doubtId && method === 'DELETE') {
    await db.prepare('DELETE FROM study_reader_doubts WHERE id = ?').bind(doubtId).run();
    await audit(env, request, actor, 'study_doubt.delete', 'study_reader_doubts', doubtId, {});
    return json({ ok: true, deleted: doubtId });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown study doubts route');
}

// ============================================================================
// PUBLIC ENDPOINTS: /api/public/study/tree, /api/public/study, /api/public/study/article,
//                   /api/public/study/telemetry, /api/public/study/doubts
// ============================================================================
const BOOTSTRAP_EDGE_CACHE = 'public, max-age=15, s-maxage=300, stale-while-revalidate=60';

export async function handlePublicStudyBootstrapApi(request, env) {
  if (!env || !env.DB) {
    return json({ ok: false, tree: [], nodes: [], nav_tracks: [], articles: [], items: [], total: 0, facets: { types: [], difficulties: [], priorities: [], mediums: [] }, kpis: {} }, 200, { 'Cache-Control': 'no-store' });
  }
  await ensureStudyPublishingSchema(env.DB);
  await publishDueScheduledStudyArticles(env.DB);

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50));
  const bypass = url.searchParams.has('refresh') || url.searchParams.has('_cb');

  const batchResults = await env.DB.batch([
    env.DB.prepare('SELECT * FROM study_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC'),
    env.DB.prepare('SELECT * FROM study_articles WHERE is_published = 1 ORDER BY is_featured DESC, updated_at DESC')
  ]).catch(() => [{ results: [] }, { results: [] }]);

  const rawNodes = (batchResults[0] && batchResults[0].results) || [];
  const rawArticles = (batchResults[1] && batchResults[1].results) || [];

  const taxMap = new Map();
  const counts = new Map();
  const inc = (id) => { if (id) counts.set(id, (counts.get(id) || 0) + 1); };
  rawArticles.forEach(a => { inc(a.category_l1_id); inc(a.category_l2_id); inc(a.category_l3_id); });

  const nodes = rawNodes.map(r => {
    const n = { ...formatTaxonomyNode(r), published_modules_count: counts.get(r.id) || 0 };
    taxMap.set(n.id, n);
    return n;
  });

  const all = rawArticles.map(r => formatStudyArticle(r, taxMap, false));
  const typesSet = new Set();
  const diffsSet = new Set();
  const prioritiesSet = new Set();
  const mediumsSet = new Set();
  let pyqSylCount = 0;
  let mcqTotal = 0;
  all.forEach(a => {
    if (a.resource_type_badge) typesSet.add(a.resource_type_badge);
    if (a.difficulty_level) diffsSet.add(a.difficulty_level);
    if (a.high_yield_priority) prioritiesSet.add(a.high_yield_priority);
    if (a.language_medium) mediumsSet.add(a.language_medium);
    const badge = String(a.resource_type_badge || '').toLowerCase();
    if (badge.includes('pyq') || badge.includes('syllabus') || a.pyq_pdf_url) pyqSylCount++;
    mcqTotal += Number(a.mcq_count || 0);
  });

  const prioRank = { 'Must-Study': 0, High: 1, Standard: 2 };
  all.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return b.is_featured - a.is_featured;
    const pa = prioRank[a.high_yield_priority] ?? 2;
    const pb = prioRank[b.high_yield_priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return String(b.published_at || b.updated_at).localeCompare(String(a.published_at || a.updated_at));
  });

  const items = all.slice(0, limit);
  const l2ByParent = new Map();
  nodes.forEach(n => {
    if (Number(n.level) === 2 && n.parent_id) {
      if (!l2ByParent.has(n.parent_id)) l2ByParent.set(n.parent_id, []);
      l2ByParent.get(n.parent_id).push({
        id: n.id,
        slug: n.slug,
        title_en: n.title_en,
        title_or: n.title_or,
        subtitle_en: n.subtitle_en,
        subtitle_or: n.subtitle_or,
        icon: n.icon,
        sort_order: n.sort_order,
        published_resources_count: n.published_modules_count || 0
      });
    }
  });
  const navTracks = nodes
    .filter(n => Number(n.level) === 1)
    .sort((a, b) => (a.sort_order - b.sort_order) || a.title_en.localeCompare(b.title_en))
    .map(n => ({
      id: n.id,
      slug: n.slug,
      title_en: n.title_en,
      title_or: n.title_or,
      subtitle_en: n.subtitle_en,
      subtitle_or: n.subtitle_or,
      icon: n.icon,
      accent_variant: n.accent_variant,
      sort_order: n.sort_order,
      published_resources_count: n.published_modules_count || 0,
      published_modules_count: n.published_modules_count || 0,
      subcollections: (l2ByParent.get(n.id) || []).sort((a, b) => (a.sort_order - b.sort_order) || a.title_en.localeCompare(b.title_en))
    }));

  return json({
    ok: true,
    total_published_modules: all.length,
    total: all.length,
    nodes,
    nav_tracks: navTracks,
    tree: buildTaxonomyTree(nodes),
    articles: items,
    items,
    facets: {
      types: [...typesSet].sort(),
      difficulties: [...diffsSet],
      priorities: [...prioritiesSet],
      mediums: [...mediumsSet].sort()
    },
    kpis: {
      study_modules: all.length,
      pyq_syllabus_sets: pyqSylCount,
      practice_mcqs: mcqTotal,
      exam_tracks: nodes.filter(n => Number(n.level) === 1).length
    }
  }, 200, { 'Cache-Control': bypass ? 'no-store, max-age=0' : BOOTSTRAP_EDGE_CACHE });
}

export async function handlePublicStudyTreeApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, tree: [], nodes: [] }, 200, { 'Cache-Control': 'no-store' });
  await ensureStudyPublishingSchema(env.DB);
  await publishDueScheduledStudyArticles(env.DB);

  const [{ results: rawNodes }, { results: pubArticles }] = await Promise.all([
    env.DB.prepare('SELECT * FROM study_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC').all().catch(() => ({ results: [] })),
    env.DB.prepare('SELECT category_l1_id, category_l2_id, category_l3_id FROM study_articles WHERE is_published = 1').all().catch(() => ({ results: [] }))
  ]);

  const counts = new Map();
  const inc = (id) => { if (id) counts.set(id, (counts.get(id) || 0) + 1); };
  (pubArticles || []).forEach(a => {
    inc(a.category_l1_id);
    inc(a.category_l2_id);
    inc(a.category_l3_id);
  });

  const nodes = (rawNodes || []).map(r => {
    const n = formatTaxonomyNode(r);
    return { ...n, published_modules_count: counts.get(n.id) || 0 };
  });

  return json({
    ok: true,
    total_published_modules: (pubArticles || []).length,
    nodes,
    tree: buildTaxonomyTree(nodes)
  }, 200, { 'Cache-Control': PUBLIC_CACHE });
}

export async function handlePublicStudyListApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, items: [], total: 0 }, 200, { 'Cache-Control': 'no-store' });
  await ensureStudyPublishingSchema(env.DB);
  await publishDueScheduledStudyArticles(env.DB);

  const url = new URL(request.url);
  const l1 = str(url.searchParams.get('l1') || url.searchParams.get('track'), 80);
  const l2 = str(url.searchParams.get('l2') || url.searchParams.get('sub'), 80);
  const l3 = str(url.searchParams.get('l3'), 80);
  const type = str(url.searchParams.get('type'), 48).toLowerCase();
  const difficulty = str(url.searchParams.get('difficulty'), 32).toLowerCase();
  const priority = str(url.searchParams.get('priority'), 32).toLowerCase();
  const medium = str(url.searchParams.get('medium'), 60).toLowerCase();
  const jobId = str(url.searchParams.get('job_id'), 80);
  const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();
  const featured = url.searchParams.get('featured') === '1';
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50));

  const [{ map: taxMap }, { results }] = await Promise.all([
    loadTaxonomyMap(env.DB),
    env.DB.prepare('SELECT * FROM study_articles WHERE is_published = 1 ORDER BY is_featured DESC, updated_at DESC').all().catch(() => ({ results: [] }))
  ]);

  const all = (results || []).map(r => formatStudyArticle(r, taxMap, false));

  const typesSet = new Set();
  const diffsSet = new Set();
  const prioritiesSet = new Set();
  const mediumsSet = new Set();
  all.forEach(a => {
    if (a.resource_type_badge) typesSet.add(a.resource_type_badge);
    if (a.difficulty_level) diffsSet.add(a.difficulty_level);
    if (a.high_yield_priority) prioritiesSet.add(a.high_yield_priority);
    if (a.language_medium) mediumsSet.add(a.language_medium);
  });

  const filtered = all.filter(a => {
    if (l1 && a.category_l1_id !== l1 && (!a.taxonomy.l1 || a.taxonomy.l1.slug !== l1)) return false;
    if (l2 && a.category_l2_id !== l2 && (!a.taxonomy.l2 || a.taxonomy.l2.slug !== l2)) return false;
    if (l3 && a.category_l3_id !== l3 && (!a.taxonomy.l3 || a.taxonomy.l3.slug !== l3)) return false;
    if (type && !a.resource_type_badge.toLowerCase().includes(type)) return false;
    if (difficulty && a.difficulty_level.toLowerCase() !== difficulty) return false;
    if (priority && a.high_yield_priority.toLowerCase() !== priority) return false;
    if (medium && !a.language_medium.toLowerCase().includes(medium)) return false;
    if (jobId && !(Array.isArray(a.linked_job_ids) && a.linked_job_ids.includes(jobId))) return false;
    if (featured && !a.is_featured) return false;
    if (search) {
      const hay = `${a.title_en} ${a.title_or} ${a.subtitle_en} ${a.summary_en} ${a.exam_board_tag} ${a.paper_code} ${a.pyq_year} ${a.resource_type_badge}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const prioRank = { 'Must-Study': 0, High: 1, Standard: 2 };
  filtered.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return b.is_featured - a.is_featured;
    const pa = prioRank[a.high_yield_priority] ?? 2;
    const pb = prioRank[b.high_yield_priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return String(b.published_at || b.updated_at).localeCompare(String(a.published_at || a.updated_at));
  });

  return json({
    ok: true,
    total: filtered.length,
    items: filtered.slice(0, limit),
    facets: {
      types: [...typesSet].sort(),
      difficulties: [...diffsSet],
      priorities: [...prioritiesSet],
      mediums: [...mediumsSet].sort()
    }
  }, 200, { 'Cache-Control': PUBLIC_CACHE });
}

async function resolveLinkedJobs(db, linkedJobIds) {
  if (!Array.isArray(linkedJobIds) || !linkedJobIds.length) return [];
  const out = [];
  for (const jid of linkedJobIds.slice(0, 10)) {
    try {
      const r = await db.prepare(
        'SELECT id, slug, title_en, title_or, organisation_en, total_vacancies, last_date, lifecycle_stage FROM job_articles WHERE id = ? AND is_published = 1'
      ).bind(jid).first();
      if (r) {
        out.push({
          id: r.id,
          slug: r.slug,
          title_en: r.title_en,
          title_or: r.title_or || '',
          organisation_en: r.organisation_en || '',
          total_vacancies: Number(r.total_vacancies || 0),
          last_date: r.last_date || '',
          lifecycle_stage: r.lifecycle_stage || 'notification',
          url: `/jobs/?slug=${encodeURIComponent(r.slug)}`
        });
      }
    } catch { /* ignore */ }
  }
  return out;
}

export async function handlePublicStudyArticleApi(request, env) {
  if (!env || !env.DB) return json({ error: 'Database unavailable' }, 500, { 'Cache-Control': 'no-store' });
  await ensureStudyPublishingSchema(env.DB);
  await publishDueScheduledStudyArticles(env.DB);

  const url = new URL(request.url);
  const slug = str(url.searchParams.get('slug'), 160);
  const previewToken = str(url.searchParams.get('preview_token'), 160);
  if (!slug) return json({ error: 'slug query parameter is required', code: 'VALIDATION_ERROR' }, 400, { 'Cache-Control': 'no-store' });

  const row = await env.DB.prepare('SELECT * FROM study_articles WHERE slug = ?').bind(slug).first();
  if (!row) return json({ error: 'Study module not found', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'no-store' });

  let isPreview = false;
  let previewExpiresAt = '';
  if (!row.is_published) {
    let authorized = false;
    if (previewToken && row.preview_token && constantTimeEqual(previewToken, row.preview_token)) {
      const exp = Date.parse(String(row.preview_expires_at || ''));
      if (Number.isFinite(exp) && exp > Date.now()) {
        authorized = true;
        previewExpiresAt = String(row.preview_expires_at || '');
      }
    }
    if (!authorized) {
      const actor = await getActor(request, env).catch(() => null);
      if (actor && STAFF_ROLES.includes(actor.role)) {
        authorized = true;
        previewExpiresAt = String(row.preview_expires_at || new Date(Date.now() + 2 * 3600 * 1000).toISOString());
      }
    }
    if (!authorized) {
      return json({ error: 'Study module not found or preview link expired', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'no-store' });
    }
    isPreview = true;
  } else if (previewToken && row.preview_token && constantTimeEqual(previewToken, row.preview_token)) {
    previewExpiresAt = String(row.preview_expires_at || '');
  }

  const [{ map: taxMap }, { results: siblingRows }, { results: relRows }] = await Promise.all([
    loadTaxonomyMap(env.DB),
    env.DB.prepare(
      `SELECT id, slug, title_en, title_or, resource_type_badge, published_at, updated_at
       FROM study_articles
       WHERE is_published = 1 AND category_l2_id = ?
       ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) ASC, id ASC`
    ).bind(row.category_l2_id || '').all().catch(() => ({ results: [] })),
    env.DB.prepare(
      `SELECT * FROM study_articles
       WHERE is_published = 1 AND id != ?
       ORDER BY CASE WHEN category_l2_id = ? THEN 0 WHEN category_l1_id = ? THEN 1 ELSE 2 END, updated_at DESC
       LIMIT 6`
    ).bind(row.id, row.category_l2_id || '', row.category_l1_id || '').all().catch(() => ({ results: [] }))
  ]);

  const article = formatStudyArticle(row, taxMap, false);
  const siblings = siblingRows || [];
  const curIdx = siblings.findIndex(s => s.id === row.id);
  const prevChapter = curIdx > 0 ? {
    id: siblings[curIdx - 1].id,
    slug: siblings[curIdx - 1].slug,
    title_en: siblings[curIdx - 1].title_en,
    title_or: siblings[curIdx - 1].title_or || '',
    url: `/study-library/?slug=${encodeURIComponent(siblings[curIdx - 1].slug)}`
  } : null;
  const nextChapter = curIdx >= 0 && curIdx < siblings.length - 1 ? {
    id: siblings[curIdx + 1].id,
    slug: siblings[curIdx + 1].slug,
    title_en: siblings[curIdx + 1].title_en,
    title_or: siblings[curIdx + 1].title_or || '',
    url: `/study-library/?slug=${encodeURIComponent(siblings[curIdx + 1].slug)}`
  } : null;

  const related = (relRows || []).map(r => formatStudyArticle(r, taxMap, false)).slice(0, 3);
  const linkedJobs = await resolveLinkedJobs(env.DB, article.linked_job_ids);

  const cacheHeader = isPreview || previewToken ? 'no-store' : PUBLIC_CACHE;
  return json({
    ok: true,
    is_preview: isPreview,
    preview_expires_at: previewExpiresAt,
    article,
    prev_chapter: prevChapter,
    next_chapter: nextChapter,
    related_chapters: related,
    linked_jobs: linkedJobs
  }, 200, { 'Cache-Control': cacheHeader });
}

export async function handlePublicStudyTelemetryApi(request, env) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env || !env.DB) return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
  await ensureStudyPublishingSchema(env.DB);
  try {
    await rateLimit(env, `study-tel:${clientIp(request)}`, 80, 60);
  } catch {
    return json({ ok: false, rate_limited: true }, 429, { 'Cache-Control': 'no-store' });
  }
  const body = await readJson(request, 4000).catch(() => ({}));
  const event = str(body.event, 32).toLowerCase();
  const id = str(body.id, 80);
  const slug = str(body.slug, 160);
  const colMap = {
    view: 'views_count',
    pdf_download: 'pdf_downloads_count',
    completion: 'completions_count',
    bookmark: 'bookmarks_count'
  };
  const col = colMap[event];
  if (!col || (!id && !slug)) {
    return json({ ok: false, error: 'Valid event and id/slug required' }, 400, { 'Cache-Control': 'no-store' });
  }
  if (id) {
    await env.DB.prepare(`UPDATE study_articles SET ${col} = ${col} + 1 WHERE id = ?`).bind(id).run();
  } else {
    await env.DB.prepare(`UPDATE study_articles SET ${col} = ${col} + 1 WHERE slug = ?`).bind(slug).run();
  }
  return json({ ok: true, event }, 200, { 'Cache-Control': 'no-store' });
}

export async function handlePublicStudyDoubtsApi(request, env) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureStudyPublishingSchema(env.DB);
  try {
    await rateLimit(env, `study-doubt:${clientIp(request)}`, 12, 300);
  } catch {
    return json({ ok: false, error: 'Too many submissions. Please wait a few minutes.' }, 429, { 'Cache-Control': 'no-store' });
  }
  const body = await readJson(request, 8000);
  const articleId = str(body.article_id, 80);
  const messageText = str(body.message_text || body.message, 1500);
  if (!articleId) throw validationError({ article_id: 'article_id is required.' });
  if (!messageText || messageText.length < 5) throw validationError({ message_text: 'Please describe your doubt or typo (min 5 characters).' });

  const art = await env.DB.prepare('SELECT id FROM study_articles WHERE id = ?').bind(articleId).first();
  if (!art) throw new HttpError(404, 'NOT_FOUND', 'Study module not found');

  const rawType = str(body.doubt_type, 32).toLowerCase();
  const doubtType = DOUBT_TYPES.includes(rawType) ? rawType : 'chapter_doubt';
  const actor = await getActor(request, env).catch(() => null);
  const userId = actor ? String(actor.userId || '') : '';
  const readerName = str(body.reader_name || (actor && actor.email) || 'Anonymous Learner', 100);
  const id = `sdoubt_${Date.now().toString(36)}_${randomHex(4)}`;

  await env.DB.prepare(
    `INSERT INTO study_reader_doubts (id, article_id, user_id, reader_name, doubt_type, message_text, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', datetime('now'))`
  ).bind(id, articleId, userId, readerName, doubtType, messageText).run();

  return json({ ok: true, id, status: 'open' }, 201, { 'Cache-Control': 'no-store' });
}

// ============================================================================
// CANDIDATE STUDY PROGRESS, STREAKS & REVISION QUEUE (/api/candidate/study-progress)
// ============================================================================
export async function handleCandidateStudyProgressApi(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    await ensureStudyPublishingSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    const uid = session.userId;

    if (request.method === 'GET') {
      const [{ results: progRows }, pubCountRow] = await Promise.all([
        env.DB.prepare(
          `SELECT p.*, a.slug, a.title_en, a.title_or, a.resource_type_badge, a.category_l1_id, a.category_l2_id, a.estimated_read_mins
           FROM candidate_study_progress p
           LEFT JOIN study_articles a ON a.id = p.article_id
           WHERE p.user_id = ?
           ORDER BY p.last_studied_at DESC
           LIMIT 200`
        ).bind(uid).all().catch(() => ({ results: [] })),
        env.DB.prepare('SELECT COUNT(*) AS n FROM study_articles WHERE is_published = 1').first().catch(() => ({ n: 0 }))
      ]);
      const items = (progRows || []).map(r => ({
        id: r.id,
        article_id: r.article_id,
        slug: r.slug || '',
        title_en: r.title_en || '',
        title_or: r.title_or || '',
        resource_type_badge: r.resource_type_badge || '',
        category_l1_id: r.category_l1_id || '',
        category_l2_id: r.category_l2_id || '',
        estimated_read_mins: Number(r.estimated_read_mins || 10),
        status: r.status || 'in_progress',
        needs_revision: Boolean(r.needs_revision),
        mcq_score: Number(r.mcq_score || 0),
        mcq_total: Number(r.mcq_total || 0),
        streak_days: Number(r.streak_days || 1),
        last_studied_at: r.last_studied_at || '',
        url: r.slug ? `/study-library/?slug=${encodeURIComponent(r.slug)}` : '/study-library/'
      }));
      const totalPublished = Number((pubCountRow && pubCountRow.n) || 0);
      const completedCount = items.filter(i => i.status === 'completed').length;
      const revisionCount = items.filter(i => i.needs_revision).length;
      const maxStreak = items.reduce((m, i) => Math.max(m, i.streak_days || 0), 0);
      const completionPct = totalPublished > 0 ? Math.min(100, Math.round((completedCount / totalPublished) * 100)) : 0;

      const byArticle = {};
      items.forEach(i => { byArticle[i.article_id] = i; });

      return json({
        ok: true,
        summary: {
          total_published: totalPublished,
          completed_count: completedCount,
          in_progress_count: items.filter(i => i.status === 'in_progress').length,
          revision_count: revisionCount,
          completion_pct: completionPct,
          streak_days: maxStreak
        },
        by_article: byArticle,
        items
      }, 200, { 'Cache-Control': 'no-store' });
    }

    if (request.method === 'POST') {
      const body = await readJson(request, 10000);
      const articleId = str(body.article_id, 80);
      if (!articleId) throw validationError({ article_id: 'article_id is required.' });

      const existing = await env.DB.prepare(
        'SELECT * FROM candidate_study_progress WHERE user_id = ? AND article_id = ?'
      ).bind(uid, articleId).first().catch(() => null);

      const latestUserRow = await env.DB.prepare(
        'SELECT streak_days, last_studied_at FROM candidate_study_progress WHERE user_id = ? ORDER BY last_studied_at DESC LIMIT 1'
      ).bind(uid).first().catch(() => null);

      const todayStr = new Date().toISOString().slice(0, 10);
      let streakDays = Number((latestUserRow && latestUserRow.streak_days) || 1);
      if (latestUserRow && latestUserRow.last_studied_at) {
        const lastDay = String(latestUserRow.last_studied_at).slice(0, 10);
        if (lastDay !== todayStr) {
          const diffDays = Math.round((Date.parse(todayStr) - Date.parse(lastDay)) / 86400000);
          streakDays = diffDays === 1 ? streakDays + 1 : 1;
        }
      }

      const rawStatus = body.status !== undefined ? str(body.status, 24).toLowerCase() : (existing ? existing.status : 'in_progress');
      const status = ['completed', 'in_progress', 'not_started'].includes(rawStatus) ? rawStatus : 'in_progress';
      const needsRevision = body.needs_revision !== undefined ? boolInt(body.needs_revision, 0) : (existing ? Number(existing.needs_revision || 0) : 0);
      const mcqScore = body.mcq_score !== undefined ? numOrZero(body.mcq_score, -200, 1000) : (existing ? Number(existing.mcq_score || 0) : 0);
      const mcqTotal = body.mcq_total !== undefined ? intOrZero(body.mcq_total, 0, 1000) : (existing ? Number(existing.mcq_total || 0) : 0);

      const wasCompleted = existing && existing.status === 'completed';
      const id = existing ? existing.id : `csp_${Date.now().toString(36)}_${randomHex(4)}`;

      await env.DB.prepare(
        `INSERT INTO candidate_study_progress (id, user_id, article_id, status, needs_revision, mcq_score, mcq_total, streak_days, last_studied_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(user_id, article_id) DO UPDATE SET
           status = excluded.status,
           needs_revision = excluded.needs_revision,
           mcq_score = excluded.mcq_score,
           mcq_total = excluded.mcq_total,
           streak_days = excluded.streak_days,
           last_studied_at = datetime('now'),
           updated_at = datetime('now')`
      ).bind(id, uid, articleId, status, needsRevision, mcqScore, mcqTotal, streakDays).run();

      if (status === 'completed' && !wasCompleted) {
        await env.DB.prepare('UPDATE study_articles SET completions_count = completions_count + 1 WHERE id = ?').bind(articleId).run().catch(() => {});
      }

      const saved = await env.DB.prepare('SELECT * FROM candidate_study_progress WHERE user_id = ? AND article_id = ?').bind(uid, articleId).first();
      return json({
        ok: true,
        progress: {
          id: saved.id,
          article_id: saved.article_id,
          status: saved.status,
          needs_revision: Boolean(saved.needs_revision),
          mcq_score: Number(saved.mcq_score || 0),
          mcq_total: Number(saved.mcq_total || 0),
          streak_days: Number(saved.streak_days || 1),
          last_studied_at: saved.last_studied_at || ''
        }
      }, 200, { 'Cache-Control': 'no-store' });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  } catch (e) {
    const status = (e && e.status) || 500;
    return json({ ok: false, error: (e && e.message) || 'Study progress error', code: (e && e.code) || 'ERROR' }, status, { 'Cache-Control': 'no-store' });
  }
}
