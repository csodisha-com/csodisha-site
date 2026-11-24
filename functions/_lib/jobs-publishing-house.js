// v249 Jobs Publishing House, 3-Layer Taxonomy, Reusable Bilingual Snippets, Revisions & Public Engine
// Strict D1 + R2 backed. Every write audits to audit_log and immediately invalidates edge & isolate caches.
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit, getActor, STAFF_ROLES } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';

export const LIFECYCLE_STAGES = [
  'notification',
  'exam_date',
  'admit_card',
  'answer_key',
  'result',
  'closed'
];

export const LIFECYCLE_STAGE_LABELS = {
  notification: 'Notification Open',
  exam_date: 'Exam Date Announced',
  admit_card: 'Admit Card Out',
  answer_key: 'Answer Key Released',
  result: 'Result Declared',
  closed: 'Recruitment Completed'
};

export const QUALIFICATION_LEVELS = [
  '10th Pass',
  '12th / +2 Pass',
  'ITI / Diploma',
  'Graduate (Any Discipline)',
  'B.Tech / Engineering',
  'B.Ed / Teaching',
  'Post Graduate / NET',
  'Medical / Nursing / Pharma',
  'Law / Commerce / CA',
  'Other / See Notification'
];

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=60, must-revalidate';
const MB = 1024 * 1024;
const ALLOWED_UPLOAD_MIME = {
  'image/jpeg': { ext: 'jpg', kind: 'image', max: 8 * MB },
  'image/png': { ext: 'png', kind: 'image', max: 8 * MB },
  'image/webp': { ext: 'webp', kind: 'image', max: 8 * MB },
  'application/pdf': { ext: 'pdf', kind: 'pdf', max: 25 * MB }
};

let _schemaReady = false;

export async function ensureJobsPublishingSchema(db) {
  if (!db || _schemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS job_taxonomy_nodes (
      id TEXT PRIMARY KEY,
      level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
      parent_id TEXT,
      slug TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      accent_variant TEXT NOT NULL DEFAULT 'emerald',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS job_articles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      category_l1_id TEXT,
      category_l2_id TEXT,
      category_l3_id TEXT,
      sector_badge TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      organisation_en TEXT NOT NULL DEFAULT '',
      organisation_or TEXT NOT NULL DEFAULT '',
      advt_number TEXT NOT NULL DEFAULT '',
      total_vacancies INTEGER NOT NULL DEFAULT 0,
      qualification_level TEXT NOT NULL DEFAULT '',
      qualification_summary TEXT NOT NULL DEFAULT '',
      min_age INTEGER,
      max_age INTEGER,
      age_cutoff_date TEXT NOT NULL DEFAULT '',
      age_limit_summary TEXT NOT NULL DEFAULT '',
      odisha_domicile_required INTEGER NOT NULL DEFAULT 0,
      salary_pay_scale TEXT NOT NULL DEFAULT '',
      selection_mode TEXT NOT NULL DEFAULT '',
      location_district TEXT NOT NULL DEFAULT 'All Odisha',
      application_start_date TEXT NOT NULL DEFAULT '',
      last_date TEXT NOT NULL DEFAULT '',
      exam_date TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      cover_image_caption TEXT NOT NULL DEFAULT '',
      article_body_en TEXT NOT NULL DEFAULT '',
      article_body_or TEXT NOT NULL DEFAULT '',
      vacancy_breakdown_json TEXT NOT NULL DEFAULT '[]',
      important_dates_json TEXT NOT NULL DEFAULT '[]',
      fee_structure_json TEXT NOT NULL DEFAULT '[]',
      selection_steps_json TEXT NOT NULL DEFAULT '[]',
      cutoff_reference_json TEXT NOT NULL DEFAULT '[]',
      lifecycle_updates_json TEXT NOT NULL DEFAULT '[]',
      linked_study_ids_json TEXT NOT NULL DEFAULT '[]',
      official_apply_url TEXT NOT NULL DEFAULT '',
      official_website_url TEXT NOT NULL DEFAULT '',
      notification_pdf_url TEXT NOT NULL DEFAULT '',
      syllabus_pdf_url TEXT NOT NULL DEFAULT '',
      pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
      extra_attachments_json TEXT NOT NULL DEFAULT '[]',
      lifecycle_stage TEXT NOT NULL DEFAULT 'notification',
      corrigendum_note_en TEXT NOT NULL DEFAULT '',
      corrigendum_note_or TEXT NOT NULL DEFAULT '',
      scheduled_publish_at TEXT NOT NULL DEFAULT '',
      preview_token TEXT NOT NULL DEFAULT '',
      preview_expires_at TEXT NOT NULL DEFAULT '',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      apply_clicks_count INTEGER NOT NULL DEFAULT 0,
      pdf_downloads_count INTEGER NOT NULL DEFAULT 0,
      bookmarks_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS editorial_snippets (
      id TEXT PRIMARY KEY,
      snippet_key TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'general',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS job_article_revisions (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL DEFAULT 1,
      change_summary TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ];
  for (const s of stmts) {
    try { await db.prepare(s).run(); } catch { /* mock db or already exists */ }
  }
  _schemaReady = true;
}

export function resetJobsPublishingSchemaMemo() {
  _schemaReady = false;
}

function str(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function intOrNull(v, min = 0, max = 10000000) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function intOrZero(v, min = 0, max = 10000000) {
  const n = intOrNull(v, min, max);
  return n === null ? 0 : n;
}

function boolInt(v, fallback = 0) {
  if (v === undefined || v === null) return fallback;
  if (v === true || v === 1 || v === '1' || v === 'true' || v === 'published') return 1;
  return 0;
}

export function slugify(raw, fallback = 'item') {
  const s = String(raw || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || fallback;
}

export function safeUrl(raw, allowRelative = true) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript|file)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL uses a disallowed scheme.');
  }
  if (allowRelative && s.startsWith('/') && !s.startsWith('//') && !s.includes('\\')) {
    return s.slice(0, 600);
  }
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a valid https:// URL or relative /api/media/ path.');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 600);
}

export function isOfficialGovUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    return u.protocol === 'https:' && /(^|\.)(gov\.in|nic\.in|odisha\.gov\.in|ac\.in|edu\.in|org\.in)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function safeJsonArray(raw, maxItems = 60) {
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw || '[]'); } catch { arr = []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems);
}

function sanitizeUrlFieldInObject(obj, keys) {
  const out = { ...obj };
  for (const k of keys) {
    if (out[k]) {
      try { out[k] = safeUrl(out[k], true); } catch { out[k] = ''; }
    }
  }
  return out;
}

function randomHex(byteLen = 24) {
  const arr = new Uint8Array(byteLen);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

export function computeExpiryState(article) {
  const lastDate = String(article.last_date || '').trim();
  const stage = String(article.lifecycle_stage || 'notification');
  const today = todayIsoDate();
  const isDatePassed = /^\d{4}-\d{2}-\d{2}$/.test(lastDate) && lastDate < today;
  const isClosed = stage === 'closed' || isDatePassed;
  let daysRemaining = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(lastDate)) {
    const t0 = Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
    const t1 = Date.UTC(Number(lastDate.slice(0, 4)), Number(lastDate.slice(5, 7)) - 1, Number(lastDate.slice(8, 10)));
    daysRemaining = Math.round((t1 - t0) / 86400000);
  }
  let statusBadge = 'Active';
  if (stage === 'closed') statusBadge = 'Recruitment Completed';
  else if (isDatePassed) statusBadge = 'Application Closed · Awaiting Exam/Result';
  else if (daysRemaining === 0) statusBadge = 'Closes Today';
  else if (daysRemaining !== null && daysRemaining <= 7) statusBadge = `Closing in ${daysRemaining}d`;
  else if (stage !== 'notification' && LIFECYCLE_STAGE_LABELS[stage]) statusBadge = LIFECYCLE_STAGE_LABELS[stage];

  return {
    is_expired: isClosed,
    days_remaining: daysRemaining,
    status_badge: statusBadge,
    stage_label: LIFECYCLE_STAGE_LABELS[stage] || 'Notification Open'
  };
}

function formatTaxonomyNode(r) {
  if (!r) return null;
  return {
    id: String(r.id),
    level: Number(r.level || 1),
    parent_id: r.parent_id ? String(r.parent_id) : null,
    slug: String(r.slug || ''),
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    subtitle_en: String(r.subtitle_en || ''),
    subtitle_or: String(r.subtitle_or || ''),
    icon: String(r.icon || ''),
    accent_variant: String(r.accent_variant || 'emerald'),
    sort_order: Number(r.sort_order || 0),
    is_published: r.is_published ? 1 : 0,
    updated_at: String(r.updated_at || '')
  };
}

function formatSnippet(r) {
  if (!r) return null;
  return {
    id: String(r.id),
    snippet_key: String(r.snippet_key || ''),
    category: String(r.category || 'general'),
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    body_en: String(r.body_en || ''),
    body_or: String(r.body_or || ''),
    sort_order: Number(r.sort_order || 0),
    is_published: r.is_published ? 1 : 0,
    updated_at: String(r.updated_at || '')
  };
}

function formatArticle(r, taxMap = null, includePrivate = false) {
  if (!r) return null;
  const expiry = computeExpiryState(r);
  const l1 = taxMap && r.category_l1_id ? taxMap.get(String(r.category_l1_id)) : null;
  const l2 = taxMap && r.category_l2_id ? taxMap.get(String(r.category_l2_id)) : null;
  const l3 = taxMap && r.category_l3_id ? taxMap.get(String(r.category_l3_id)) : null;
  const isScheduled = !r.is_published && Boolean(r.scheduled_publish_at && String(r.scheduled_publish_at) > nowIso().slice(0, 19).replace('T', ' '));
  const out = {
    id: String(r.id),
    slug: String(r.slug || ''),
    category_l1_id: r.category_l1_id ? String(r.category_l1_id) : '',
    category_l2_id: r.category_l2_id ? String(r.category_l2_id) : '',
    category_l3_id: r.category_l3_id ? String(r.category_l3_id) : '',
    taxonomy: {
      l1: l1 ? { id: l1.id, slug: l1.slug, title_en: l1.title_en, title_or: l1.title_or, icon: l1.icon, accent_variant: l1.accent_variant } : null,
      l2: l2 ? { id: l2.id, slug: l2.slug, title_en: l2.title_en, title_or: l2.title_or, icon: l2.icon, accent_variant: l2.accent_variant } : null,
      l3: l3 ? { id: l3.id, slug: l3.slug, title_en: l3.title_en, title_or: l3.title_or, icon: l3.icon, accent_variant: l3.accent_variant } : null
    },
    sector_badge: String(r.sector_badge || (l1 ? l1.title_en : '')),
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    summary_en: String(r.summary_en || ''),
    summary_or: String(r.summary_or || ''),
    organisation_en: String(r.organisation_en || ''),
    organisation_or: String(r.organisation_or || ''),
    advt_number: String(r.advt_number || ''),
    total_vacancies: Number(r.total_vacancies || 0),
    qualification_level: String(r.qualification_level || ''),
    qualification_summary: String(r.qualification_summary || ''),
    min_age: r.min_age === null || r.min_age === undefined ? null : Number(r.min_age),
    max_age: r.max_age === null || r.max_age === undefined ? null : Number(r.max_age),
    age_cutoff_date: String(r.age_cutoff_date || ''),
    age_limit_summary: String(r.age_limit_summary || ''),
    odisha_domicile_required: r.odisha_domicile_required ? 1 : 0,
    salary_pay_scale: String(r.salary_pay_scale || ''),
    selection_mode: String(r.selection_mode || ''),
    location_district: String(r.location_district || 'All Odisha'),
    application_start_date: String(r.application_start_date || ''),
    last_date: String(r.last_date || ''),
    exam_date: String(r.exam_date || ''),
    cover_image_url: String(r.cover_image_url || ''),
    cover_image_caption: String(r.cover_image_caption || ''),
    article_body_en: String(r.article_body_en || ''),
    article_body_or: String(r.article_body_or || ''),
    vacancy_breakdown: safeJsonArray(r.vacancy_breakdown_json),
    important_dates: safeJsonArray(r.important_dates_json),
    fee_structure: safeJsonArray(r.fee_structure_json),
    selection_steps: safeJsonArray(r.selection_steps_json),
    cutoff_reference: safeJsonArray(r.cutoff_reference_json),
    lifecycle_updates: safeJsonArray(r.lifecycle_updates_json),
    linked_study_ids: safeJsonArray(r.linked_study_ids_json),
    official_apply_url: String(r.official_apply_url || ''),
    official_website_url: String(r.official_website_url || ''),
    is_official_gov_url: isOfficialGovUrl(r.official_apply_url || r.official_website_url),
    notification_pdf_url: String(r.notification_pdf_url || ''),
    syllabus_pdf_url: String(r.syllabus_pdf_url || ''),
    pdf_index_bookmarks: safeJsonArray(r.pdf_index_bookmarks_json),
    extra_attachments: safeJsonArray(r.extra_attachments_json),
    lifecycle_stage: String(r.lifecycle_stage || 'notification'),
    corrigendum_note_en: String(r.corrigendum_note_en || ''),
    corrigendum_note_or: String(r.corrigendum_note_or || ''),
    scheduled_publish_at: String(r.scheduled_publish_at || ''),
    is_featured: r.is_featured ? 1 : 0,
    is_published: r.is_published ? 1 : 0,
    publication_status: r.is_published ? 'published' : (isScheduled ? 'scheduled' : 'draft'),
    views_count: Number(r.views_count || 0),
    apply_clicks_count: Number(r.apply_clicks_count || 0),
    pdf_downloads_count: Number(r.pdf_downloads_count || 0),
    bookmarks_count: Number(r.bookmarks_count || 0),
    published_at: String(r.published_at || ''),
    updated_at: String(r.updated_at || ''),
    public_url: `/jobs/?slug=${encodeURIComponent(String(r.slug || ''))}`,
    ...expiry
  };
  if (includePrivate) {
    out.preview_token = String(r.preview_token || '');
    out.preview_expires_at = String(r.preview_expires_at || '');
  }
  return out;
}

async function invalidateJobsCaches(request, slug = '') {
  const extra = [
    '/api/public/jobs',
    '/api/public/jobs/tree',
    '/api/public/jobs/article',
    '/api/events/upcoming',
    '/jobs/',
    '/jobs-careers/',
    '/',
    '/index.html'
  ];
  if (slug) {
    extra.push(`/api/public/jobs/article?slug=${encodeURIComponent(slug)}`);
    extra.push(`/jobs/?slug=${encodeURIComponent(slug)}`);
  }
  try {
    await invalidateAllPublicCaches(request, extra);
  } catch { /* best effort */ }
}

async function loadTaxonomyMap(db) {
  const { results } = await db.prepare(
    'SELECT * FROM job_taxonomy_nodes ORDER BY level ASC, sort_order ASC, title_en ASC'
  ).all().catch(() => ({ results: [] }));
  const map = new Map();
  const list = (results || []).map(formatTaxonomyNode);
  list.forEach(n => map.set(n.id, n));
  return { map, list };
}

export async function publishDueScheduledJobs(db) {
  if (!db) return 0;
  try {
    const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const r = await db.prepare(
      `UPDATE job_articles
       SET is_published = 1,
           published_at = CASE WHEN published_at = '' THEN COALESCE(NULLIF(scheduled_publish_at, ''), datetime('now')) ELSE published_at END,
           updated_at = datetime('now')
       WHERE is_published = 0
         AND scheduled_publish_at != ''
         AND replace(scheduled_publish_at, 'T', ' ') <= ?`
    ).bind(nowUtc).run();
    return Number((r && r.meta && r.meta.changes) || 0);
  } catch {
    return 0;
  }
}

// ============================================================================
// PDF TEXT & METADATA AUTO-DRAFT EXTRACTOR (Zero-dependency, Workers-native)
// ============================================================================
export function extractJobMetadataFromPdfBytes(uint8) {
  const out = {
    advt_number: '',
    total_vacancies: null,
    application_start_date: '',
    last_date: '',
    exam_date: '',
    min_age: null,
    max_age: null,
    qualification_level: '',
    qualification_summary: '',
    official_apply_url: '',
    official_website_url: '',
    organisation_en: '',
    detected_snippets: []
  };
  if (!uint8 || !uint8.length) return out;
  // Decode ASCII/Latin-1 safely over up to first 600KB to keep CPU fast in Workers
  const cap = Math.min(uint8.length, 600000);
  let raw = '';
  for (let i = 0; i < cap; i++) {
    const c = uint8[i];
    raw += (c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9 ? String.fromCharCode(c) : ' ';
  }
  // Also pull PDF parenthesized text tokens `(Hello World)`
  const tokens = [];
  const parenRe = /\(([^()\\]{3,160})\)/g;
  let m;
  while ((m = parenRe.exec(raw)) !== null && tokens.length < 2500) {
    tokens.push(m[1]);
  }
  const text = (tokens.length > 20 ? tokens.join(' ') + '\n' : '') + raw.replace(/\s+/g, ' ');

  // 1. Advt / Notification number
  const advtMatch = text.match(/(?:Advt\.?|Advertisement|Notification|Notice)\s*(?:No\.?|Number|#)\s*[:\-]?\s*([A-Za-z0-9\/\-_.]{1,40}(?:\s+of\s+\d{4}(?:-\d{2,4})?)?)/i);
  if (advtMatch) out.advt_number = advtMatch[1].trim().slice(0, 60);

  // 2. Vacancies
  const vacMatch = text.match(/(?:total\s+(?:no\.?\s*of\s*)?(?:vacancies|posts)|vacancies\s*[:\-]|posts\s*[:\-])\s*[:\-]?\s*(\d{1,6})/i)
    || text.match(/\b(\d{1,5})\s+(?:vacancies|regular\s+posts|posts)\b/i);
  if (vacMatch) {
    const n = Number(vacMatch[1]);
    if (n > 0 && n < 500000) out.total_vacancies = n;
  }

  // 3. Dates helper
  const normDate = (dStr) => {
    const s = String(dStr || '').trim();
    let dm = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (dm) return `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`;
    dm = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (dm) {
      const dd = Number(dm[1]); const mm = Number(dm[2]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return `${dm[3]}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
    }
    return '';
  };
  const lastMatch = text.match(/(?:last\s+date|closing\s+date|apply\s+upto|submission\s+ends)[^0-9]{0,40}(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i);
  if (lastMatch) out.last_date = normDate(lastMatch[1]);

  const startMatch = text.match(/(?:opening\s+date|start\s+date|commencement|apply\s+from)[^0-9]{0,40}(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i);
  if (startMatch) out.application_start_date = normDate(startMatch[1]);

  const examMatch = text.match(/(?:exam(?:ination)?\s+date|written\s+test\s+on|preliminary\s+exam)[^0-9]{0,40}(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i);
  if (examMatch) out.exam_date = normDate(examMatch[1]);

  // 4. Age limit
  const ageMatch = text.match(/(?:age\s+limit|between\s+the\s+age\s+of|attained\s+the\s+age\s+of)[^0-9]{0,30}(\d{2})\s*(?:years?|yrs?)?\s*(?:to|and|-|–)\s*(\d{2})/i)
    || text.match(/\b(1[89]|2[0-5])\s*(?:to|-|–)\s*(3\d|4[0-5])\s*(?:years?|yrs?)\b/i);
  if (ageMatch) {
    const minA = Number(ageMatch[1]);
    const maxA = Number(ageMatch[2]);
    if (minA >= 16 && maxA > minA && maxA <= 65) {
      out.min_age = minA;
      out.max_age = maxA;
    }
  }

  // 5. Qualification
  if (/\b(?:b\.?\s*tech|b\.?\s*e\.?\s+degree|engineering\s+degree)\b/i.test(text)) {
    out.qualification_level = 'B.Tech / Engineering';
    out.qualification_summary = 'Bachelor Degree in Engineering / Technology';
  } else if (/\b(?:b\.?\s*ed|otet|osstet|ctet)\b/i.test(text)) {
    out.qualification_level = 'B.Ed / Teaching';
    out.qualification_summary = 'Graduate / PG with B.Ed / TET as per notification';
  } else if (/\b(?:post\s*graduate|master'?s?\s+degree|ugc\s+net)\b/i.test(text)) {
    out.qualification_level = 'Post Graduate / NET';
    out.qualification_summary = 'Master Degree / Post Graduate qualification';
  } else if (/\b(?:bachelor'?s?\s+degree|graduate|graduation)\b/i.test(text)) {
    out.qualification_level = 'Graduate (Any Discipline)';
    out.qualification_summary = 'Bachelor Degree from a recognised University';
  } else if (/\b(?:diploma|iti|polytechnic)\b/i.test(text)) {
    out.qualification_level = 'ITI / Diploma';
    out.qualification_summary = 'ITI / Diploma from a recognised institution';
  } else if (/\b(?:\+2|12th|higher\s+secondary|chse)\b/i.test(text)) {
    out.qualification_level = '12th / +2 Pass';
    out.qualification_summary = 'Higher Secondary (+2 / 12th) or equivalent';
  } else if (/\b(?:matriculation|10th|hsc)\b/i.test(text)) {
    out.qualification_level = '10th Pass';
    out.qualification_summary = 'HSC / 10th Pass or equivalent';
  }

  // 6. Official .gov.in / .nic.in URLs
  const urlRe = /https?:\/\/[a-z0-9.-]+\.(?:gov\.in|nic\.in|odisha\.gov\.in)(?:\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?/gi;
  const foundUrls = [];
  let um;
  while ((um = urlRe.exec(text)) !== null && foundUrls.length < 5) {
    const clean = um[0].replace(/[.,;)\]]+$/, '');
    if (!foundUrls.includes(clean)) foundUrls.push(clean);
  }
  if (foundUrls.length) {
    out.official_apply_url = foundUrls[0].replace(/^http:\/\//i, 'https://');
    try {
      const parsed = new URL(out.official_apply_url);
      out.official_website_url = parsed.origin + '/';
    } catch { /* ignore */ }
  }

  // 7. Known Odisha/National commissions
  const orgHints = [
    [/\bOPSC\b|Odisha Public Service Commission/i, 'Odisha Public Service Commission (OPSC)'],
    [/\bOSSC\b|Odisha Staff Selection Commission/i, 'Odisha Staff Selection Commission (OSSC)'],
    [/\bOSSSC\b|Odisha Sub-?ordinate Staff Selection Commission/i, 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)'],
    [/\bOPRB\b|Odisha Police Recruitment Board/i, 'Odisha Police Recruitment Board (OPRB)'],
    [/\bUPSC\b|Union Public Service Commission/i, 'Union Public Service Commission (UPSC)'],
    [/\bSSC\b|Staff Selection Commission/i, 'Staff Selection Commission (SSC)'],
    [/\bRRB\b|Railway Recruitment Board/i, 'Railway Recruitment Board (RRB)']
  ];
  for (const [re, label] of orgHints) {
    if (re.test(text)) { out.organisation_en = label; break; }
  }

  return out;
}

// ============================================================================
// ADMIN: 3-LAYER TAXONOMY CRUD (/api/admin/jobs/taxonomy)
// ============================================================================
export async function handleJobsTaxonomyAdmin(request, env, actor, nodeId, action) {
  const db = env.DB;
  await ensureJobsPublishingSchema(db);
  const method = request.method;

  if (!nodeId && method === 'GET') {
    const { list } = await loadTaxonomyMap(db);
    const { results: counts } = await db.prepare(
      `SELECT category_l1_id, category_l2_id, category_l3_id,
              COUNT(*) AS total_count,
              SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) AS published_count
       FROM job_articles
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
      total_jobs: (countMap.get(n.id) || { total: 0 }).total,
      published_jobs: (countMap.get(n.id) || { published: 0 }).published
    }));
    return json({
      ok: true,
      nodes: enriched,
      tree: buildTaxonomyTree(enriched)
    });
  }

  if (!nodeId && method === 'POST') {
    const body = await readJson(request, 20000);
    const level = Number(body.level);
    if (![1, 2, 3].includes(level)) throw validationError({ level: 'Level must be 1, 2, or 3.' });
    const titleEn = str(body.title_en, 120);
    if (!titleEn) throw validationError({ title_en: 'English title is required.' });
    const parentId = level === 1 ? null : str(body.parent_id, 80) || null;
    if (level > 1 && !parentId) throw validationError({ parent_id: 'Parent category is required for Level 2 and Level 3.' });
    if (parentId) {
      const parent = await db.prepare('SELECT id, level FROM job_taxonomy_nodes WHERE id = ?').bind(parentId).first();
      if (!parent || Number(parent.level) !== level - 1) {
        throw validationError({ parent_id: `Parent must be an existing Level ${level - 1} node.` });
      }
    }
    const slug = slugify(body.slug || titleEn, `cat-l${level}`);
    const maxRow = await db.prepare(
      'SELECT COALESCE(MAX(sort_order), 0) AS m FROM job_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, \'\') = ?'
    ).bind(level, parentId || '').first().catch(() => ({ m: 0 }));
    const sortOrder = body.sort_order !== undefined && body.sort_order !== '' ? intOrZero(body.sort_order, 0, 100000) : Number((maxRow && maxRow.m) || 0) + 10;
    const id = `jtax_l${level}_${Date.now().toString(36)}_${randomHex(3)}`;
    await db.prepare(
      `INSERT INTO job_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id, level, parentId, slug, titleEn, str(body.title_or, 140),
      str(body.subtitle_en, 240), str(body.subtitle_or, 240),
      str(body.icon, 24), str(body.accent_variant || 'emerald', 32),
      sortOrder, boolInt(body.is_published, 1)
    ).run();
    const created = formatTaxonomyNode(await db.prepare('SELECT * FROM job_taxonomy_nodes WHERE id = ?').bind(id).first());
    await audit(env, request, actor, 'jobs_taxonomy.create', 'job_taxonomy_nodes', id, { level, parent_id: parentId, title_en: titleEn });
    await invalidateJobsCaches(request);
    const res = json({ ok: true, node: created }, 201);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && action === 'move' && method === 'POST') {
    const body = await readJson(request, 5000);
    const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
    if (!dir) throw validationError({ direction: 'direction must be up or down.' });
    const node = await db.prepare('SELECT * FROM job_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!node) throw new HttpError(404, 'NOT_FOUND', 'Taxonomy node not found');
    const { results: siblings } = await db.prepare(
      `SELECT id FROM job_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ? ORDER BY sort_order ASC, title_en ASC`
    ).bind(node.level, node.parent_id || '').all();
    const ids = (siblings || []).map(s => s.id);
    const idx = ids.indexOf(nodeId);
    const swapIdx = idx + dir;
    if (idx >= 0 && swapIdx >= 0 && swapIdx < ids.length) {
      [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
      await db.batch(ids.map((rid, n) => db.prepare("UPDATE job_taxonomy_nodes SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)));
    }
    await audit(env, request, actor, 'jobs_taxonomy.reorder', 'job_taxonomy_nodes', nodeId, { direction: body.direction });
    await invalidateJobsCaches(request);
    const res = json({ ok: true, id: nodeId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM job_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Taxonomy node not found');
    const body = await readJson(request, 20000);
    const fields = [];
    const vals = [];
    const set = (col, val) => { fields.push(`${col} = ?`); vals.push(val); };
    if (body.title_en !== undefined) {
      const t = str(body.title_en, 120);
      if (!t) throw validationError({ title_en: 'English title is required.' });
      set('title_en', t);
    }
    if (body.slug !== undefined) set('slug', slugify(body.slug || existing.title_en, existing.slug));
    if (body.title_or !== undefined) set('title_or', str(body.title_or, 140));
    if (body.subtitle_en !== undefined) set('subtitle_en', str(body.subtitle_en, 240));
    if (body.subtitle_or !== undefined) set('subtitle_or', str(body.subtitle_or, 240));
    if (body.icon !== undefined) set('icon', str(body.icon, 24));
    if (body.accent_variant !== undefined) set('accent_variant', str(body.accent_variant || 'emerald', 32));
    if (body.sort_order !== undefined) set('sort_order', intOrZero(body.sort_order, 0, 100000));
    if (body.is_published !== undefined) set('is_published', boolInt(body.is_published, 1));
    if (fields.length) {
      await db.prepare(`UPDATE job_taxonomy_nodes SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, nodeId).run();
    }
    const updated = formatTaxonomyNode(await db.prepare('SELECT * FROM job_taxonomy_nodes WHERE id = ?').bind(nodeId).first());
    await audit(env, request, actor, 'jobs_taxonomy.update', 'job_taxonomy_nodes', nodeId, { fields: fields.length });
    await invalidateJobsCaches(request);
    const res = json({ ok: true, node: updated });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT * FROM job_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Taxonomy node not found');
    // Cascade delete child taxonomy nodes cleanly
    const { results: childrenL2 } = await db.prepare('SELECT id FROM job_taxonomy_nodes WHERE parent_id = ?').bind(nodeId).all().catch(() => ({ results: [] }));
    const childIds = (childrenL2 || []).map(c => c.id);
    for (const cid of childIds) {
      await db.prepare('DELETE FROM job_taxonomy_nodes WHERE parent_id = ?').bind(cid).run().catch(() => {});
    }
    await db.prepare('DELETE FROM job_taxonomy_nodes WHERE parent_id = ?').bind(nodeId).run().catch(() => {});
    await db.prepare('DELETE FROM job_taxonomy_nodes WHERE id = ?').bind(nodeId).run();
    await audit(env, request, actor, 'jobs_taxonomy.delete', 'job_taxonomy_nodes', nodeId, { level: existing.level, title_en: existing.title_en });
    await invalidateJobsCaches(request);
    const res = json({ ok: true, deleted: nodeId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown jobs taxonomy route');
}

export function buildTaxonomyTree(nodes) {
  const byParent = new Map();
  nodes.forEach(n => {
    const key = n.parent_id || '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push({ ...n, children: [] });
  });
  const roots = byParent.get('__root__') || [];
  roots.forEach(l1 => {
    const l2s = byParent.get(l1.id) || [];
    l2s.forEach(l2 => {
      l2.children = byParent.get(l2.id) || [];
    });
    l1.children = l2s;
  });
  return roots;
}

// ============================================================================
// ADMIN: REUSABLE BILINGUAL SNIPPETS CRUD (/api/admin/jobs/snippets)
// ============================================================================
export async function handleJobsSnippetsAdmin(request, env, actor, snippetId) {
  const db = env.DB;
  await ensureJobsPublishingSchema(db);
  const method = request.method;

  if (!snippetId && method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM editorial_snippets ORDER BY sort_order ASC, title_en ASC').all().catch(() => ({ results: [] }));
    return json({ ok: true, items: (results || []).map(formatSnippet) });
  }

  if (!snippetId && method === 'POST') {
    const body = await readJson(request, 40000);
    const titleEn = str(body.title_en, 180);
    if (!titleEn) throw validationError({ title_en: 'Snippet English title is required.' });
    const key = slugify(body.snippet_key || titleEn, 'snippet-' + Date.now().toString(36));
    const id = 'snip_' + Date.now().toString(36) + '_' + randomHex(3);
    const maxRow = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM editorial_snippets').first().catch(() => ({ m: 0 }));
    const sortOrder = body.sort_order !== undefined && body.sort_order !== '' ? intOrZero(body.sort_order, 0, 100000) : Number((maxRow && maxRow.m) || 0) + 10;
    await db.prepare(
      `INSERT INTO editorial_snippets (id, snippet_key, category, title_en, title_or, body_en, body_or, sort_order, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id, key, str(body.category || 'general', 60), titleEn, str(body.title_or, 200),
      str(body.body_en, 12000), str(body.body_or, 12000), sortOrder, boolInt(body.is_published, 1)
    ).run();
    const created = formatSnippet(await db.prepare('SELECT * FROM editorial_snippets WHERE id = ?').bind(id).first());
    await audit(env, request, actor, 'jobs_snippet.create', 'editorial_snippets', id, { snippet_key: key });
    await invalidateJobsCaches(request);
    const res = json({ ok: true, item: created }, 201);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (snippetId && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM editorial_snippets WHERE id = ?').bind(snippetId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Snippet not found');
    const body = await readJson(request, 40000);
    const fields = [];
    const vals = [];
    const set = (c, v) => { fields.push(`${c} = ?`); vals.push(v); };
    if (body.title_en !== undefined) {
      const t = str(body.title_en, 180);
      if (!t) throw validationError({ title_en: 'Snippet English title is required.' });
      set('title_en', t);
    }
    if (body.snippet_key !== undefined) set('snippet_key', slugify(body.snippet_key, existing.snippet_key));
    if (body.category !== undefined) set('category', str(body.category || 'general', 60));
    if (body.title_or !== undefined) set('title_or', str(body.title_or, 200));
    if (body.body_en !== undefined) set('body_en', str(body.body_en, 12000));
    if (body.body_or !== undefined) set('body_or', str(body.body_or, 12000));
    if (body.sort_order !== undefined) set('sort_order', intOrZero(body.sort_order, 0, 100000));
    if (body.is_published !== undefined) set('is_published', boolInt(body.is_published, 1));
    if (fields.length) {
      await db.prepare(`UPDATE editorial_snippets SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, snippetId).run();
    }
    const updated = formatSnippet(await db.prepare('SELECT * FROM editorial_snippets WHERE id = ?').bind(snippetId).first());
    await audit(env, request, actor, 'jobs_snippet.update', 'editorial_snippets', snippetId, {});
    await invalidateJobsCaches(request);
    const res = json({ ok: true, item: updated });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (snippetId && method === 'DELETE') {
    await db.prepare('DELETE FROM editorial_snippets WHERE id = ?').bind(snippetId).run();
    await audit(env, request, actor, 'jobs_snippet.delete', 'editorial_snippets', snippetId, {});
    await invalidateJobsCaches(request);
    const res = json({ ok: true, deleted: snippetId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown jobs snippets route');
}

// ============================================================================
// ADMIN: DIRECT R2 UPLOAD + PDF AUTO-DRAFT EXTRACTOR (/api/admin/jobs/upload)
// ============================================================================
function sniffMime(b) {
  const eq = (off, sig) => sig.every((x, i) => b[off + i] === x);
  if (b.length >= 3 && eq(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (b.length >= 8 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (b.length >= 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  if (b.length >= 5 && eq(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

export async function handleJobsMediaUpload(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 MEDIA storage is not configured');
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use multipart/form-data');

  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Invalid multipart payload'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw validationError({ file: 'Select an image or PDF file to upload.' });
  const purpose = str(form.get('purpose') || 'asset', 40).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'asset';
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
  const key = `jobs-publishing/${Date.now()}-${baseName}-${randomHex(3)}.${spec.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: sniffed } });
  const publicUrl = `/api/media/${key}`;

  // Also register in media_files if table exists (best effort)
  try {
    await env.DB.prepare(
      `INSERT INTO media_files (id, original_filename, title_en, file_category, mime_type, file_size_bytes, r2_key, public_url, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind('mf_' + randomHex(6), str(file.name || key, 140), str(file.name || purpose, 140), spec.kind, sniffed, file.size, key, publicUrl, actor.email || actor.userId).run();
  } catch { /* non-fatal if media_files schema differs */ }

  const extractedDraft = spec.kind === 'pdf' ? extractJobMetadataFromPdfBytes(bytes) : null;
  await audit(env, request, actor, 'jobs_media.upload', 'media', key, { purpose, kind: spec.kind, size: file.size });
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
// ADMIN: STUDY / MOCK CROSS-LINK OPTIONS (/api/admin/jobs/study-options)
// ============================================================================
export async function handleJobsStudyOptions(env) {
  const db = env.DB;
  const items = [];
  const safeAll = async (sql) => {
    try { const r = await db.prepare(sql).all(); return r.results || []; } catch { return []; }
  };
  const [studyRows, mockRows, resRows] = await Promise.all([
    safeAll("SELECT id, title, slug, item_type, exam_tag FROM study_library_items WHERE status = 'published' ORDER BY updated_at DESC LIMIT 60"),
    safeAll("SELECT id, title, slug, target_exam FROM mock_tests WHERE deleted_at IS NULL AND status = 'published' ORDER BY published_at DESC LIMIT 40"),
    safeAll("SELECT id, title, kind, exam, media_key FROM resources WHERE deleted_at IS NULL AND status = 'published' ORDER BY year DESC LIMIT 40")
  ]);
  studyRows.forEach(r => items.push({
    id: `study:${r.id}`,
    kind: r.item_type || 'Study Material',
    title: r.title,
    tag: r.exam_tag || 'Study Library',
    url: `/study-library/item/${encodeURIComponent(r.slug || r.id)}/`
  }));
  mockRows.forEach(r => items.push({
    id: `mock:${r.id}`,
    kind: 'Mock Test',
    title: r.title,
    tag: r.target_exam || 'CBT Mock',
    url: `/mock-tests/?test=${encodeURIComponent(r.slug || r.id)}`
  }));
  resRows.forEach(r => items.push({
    id: `resource:${r.id}`,
    kind: r.kind === 'pyq' ? 'PYQ Paper' : 'Syllabus PDF',
    title: r.title,
    tag: r.exam || 'Resource',
    url: r.media_key ? `/api/media/${r.media_key}` : '/resources/'
  }));
  return json({ ok: true, items });
}

// ============================================================================
// ADMIN: JOB ARTICLES CRUD, PREVIEW TOKEN & REVISION HISTORY
// ============================================================================
function normalizeArticlePayload(body, existing = null) {
  const isCreate = !existing;
  const errors = {};
  const titleEn = body.title_en !== undefined ? str(body.title_en, 240) : (existing ? existing.title_en : '');
  if (!titleEn) errors.title_en = 'English job title is required.';

  const slug = body.slug !== undefined
    ? slugify(body.slug || titleEn, 'job-' + Date.now().toString(36))
    : (existing ? existing.slug : slugify(titleEn, 'job-' + Date.now().toString(36)));

  const stage = body.lifecycle_stage !== undefined
    ? str(body.lifecycle_stage, 32)
    : (existing ? existing.lifecycle_stage : 'notification');
  const safeStage = LIFECYCLE_STAGES.includes(stage) ? stage : 'notification';

  const sanitizeJsonTable = (val, fallbackRaw, urlKeys = []) => {
    if (val === undefined) return fallbackRaw || '[]';
    const arr = safeJsonArray(val, 80).map(row => {
      if (!row || typeof row !== 'object') return row;
      return urlKeys.length ? sanitizeUrlFieldInObject(row, urlKeys) : row;
    });
    return JSON.stringify(arr);
  };

  let officialApplyUrl = existing ? existing.official_apply_url : '';
  let officialWebsiteUrl = existing ? existing.official_website_url : '';
  let notificationPdfUrl = existing ? existing.notification_pdf_url : '';
  let syllabusPdfUrl = existing ? existing.syllabus_pdf_url : '';
  let coverImageUrl = existing ? existing.cover_image_url : '';
  try {
    if (body.official_apply_url !== undefined) officialApplyUrl = safeUrl(body.official_apply_url, false);
    if (body.official_website_url !== undefined) officialWebsiteUrl = safeUrl(body.official_website_url, false);
    if (body.notification_pdf_url !== undefined) notificationPdfUrl = safeUrl(body.notification_pdf_url, true);
    if (body.syllabus_pdf_url !== undefined) syllabusPdfUrl = safeUrl(body.syllabus_pdf_url, true);
    if (body.cover_image_url !== undefined) coverImageUrl = safeUrl(body.cover_image_url, true);
  } catch (e) {
    errors.url = e.message;
  }

  if (Object.keys(errors).length) throw validationError(errors);

  const isPub = body.is_published !== undefined ? boolInt(body.is_published, 0) : (existing ? boolInt(existing.is_published, 0) : 0);
  const sched = body.scheduled_publish_at !== undefined ? str(body.scheduled_publish_at, 40) : (existing ? existing.scheduled_publish_at : '');
  const publishedAt = isPub
    ? ((existing && existing.published_at) || nowIso())
    : (existing ? existing.published_at : '');

  const pick = (key, max, def = '') => body[key] !== undefined ? str(body[key], max) : (existing ? String(existing[key] || def) : def);

  return {
    slug,
    category_l1_id: pick('category_l1_id', 80),
    category_l2_id: pick('category_l2_id', 80),
    category_l3_id: pick('category_l3_id', 80),
    sector_badge: pick('sector_badge', 80),
    title_en: titleEn,
    title_or: pick('title_or', 260),
    summary_en: pick('summary_en', 800),
    summary_or: pick('summary_or', 900),
    organisation_en: pick('organisation_en', 180),
    organisation_or: pick('organisation_or', 200),
    advt_number: pick('advt_number', 100),
    total_vacancies: body.total_vacancies !== undefined ? intOrZero(body.total_vacancies, 0, 5000000) : (existing ? Number(existing.total_vacancies || 0) : 0),
    qualification_level: pick('qualification_level', 100),
    qualification_summary: pick('qualification_summary', 400),
    min_age: body.min_age !== undefined ? intOrNull(body.min_age, 14, 70) : (existing ? existing.min_age : null),
    max_age: body.max_age !== undefined ? intOrNull(body.max_age, 14, 75) : (existing ? existing.max_age : null),
    age_cutoff_date: pick('age_cutoff_date', 32),
    age_limit_summary: pick('age_limit_summary', 300),
    odisha_domicile_required: body.odisha_domicile_required !== undefined ? boolInt(body.odisha_domicile_required, 0) : (existing ? boolInt(existing.odisha_domicile_required, 0) : 0),
    salary_pay_scale: pick('salary_pay_scale', 160),
    selection_mode: pick('selection_mode', 200),
    location_district: pick('location_district', 100, 'All Odisha') || 'All Odisha',
    application_start_date: pick('application_start_date', 32),
    last_date: pick('last_date', 32),
    exam_date: pick('exam_date', 40),
    cover_image_url: coverImageUrl,
    cover_image_caption: pick('cover_image_caption', 240),
    article_body_en: pick('article_body_en', 40000),
    article_body_or: pick('article_body_or', 40000),
    vacancy_breakdown_json: sanitizeJsonTable(body.vacancy_breakdown ?? body.vacancy_breakdown_json, existing && existing.vacancy_breakdown_json),
    important_dates_json: sanitizeJsonTable(body.important_dates ?? body.important_dates_json, existing && existing.important_dates_json),
    fee_structure_json: sanitizeJsonTable(body.fee_structure ?? body.fee_structure_json, existing && existing.fee_structure_json),
    selection_steps_json: sanitizeJsonTable(body.selection_steps ?? body.selection_steps_json, existing && existing.selection_steps_json),
    cutoff_reference_json: sanitizeJsonTable(body.cutoff_reference ?? body.cutoff_reference_json, existing && existing.cutoff_reference_json),
    lifecycle_updates_json: sanitizeJsonTable(body.lifecycle_updates ?? body.lifecycle_updates_json, existing && existing.lifecycle_updates_json, ['pdf_url']),
    linked_study_ids_json: sanitizeJsonTable(body.linked_study_ids ?? body.linked_study_ids_json, existing && existing.linked_study_ids_json),
    official_apply_url: officialApplyUrl,
    official_website_url: officialWebsiteUrl,
    notification_pdf_url: notificationPdfUrl,
    syllabus_pdf_url: syllabusPdfUrl,
    pdf_index_bookmarks_json: sanitizeJsonTable(body.pdf_index_bookmarks ?? body.pdf_index_bookmarks_json, existing && existing.pdf_index_bookmarks_json),
    extra_attachments_json: sanitizeJsonTable(body.extra_attachments ?? body.extra_attachments_json, existing && existing.extra_attachments_json, ['url']),
    lifecycle_stage: safeStage,
    corrigendum_note_en: pick('corrigendum_note_en', 1000),
    corrigendum_note_or: pick('corrigendum_note_or', 1000),
    scheduled_publish_at: sched,
    is_featured: body.is_featured !== undefined ? boolInt(body.is_featured, 0) : (existing ? boolInt(existing.is_featured, 0) : 0),
    is_published: isPub,
    published_at: publishedAt,
    isCreate
  };
}

async function saveArticleRevision(db, articleId, snapshotRow, summary, actorEmail) {
  try {
    const revRow = await db.prepare('SELECT COALESCE(MAX(revision_number), 0) AS m FROM job_article_revisions WHERE article_id = ?').bind(articleId).first();
    const nextNum = Number((revRow && revRow.m) || 0) + 1;
    const revId = 'jrev_' + Date.now().toString(36) + '_' + randomHex(3);
    const cleanSnap = { ...snapshotRow };
    delete cleanSnap.preview_token;
    delete cleanSnap.preview_expires_at;
    await db.prepare(
      `INSERT INTO job_article_revisions (id, article_id, revision_number, change_summary, snapshot_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(revId, articleId, nextNum, str(summary || `Revision #${nextNum}`, 240), JSON.stringify(cleanSnap), str(actorEmail || 'staff', 120)).run();
    return nextNum;
  } catch {
    return 1;
  }
}

export async function handleJobsArticlesAdmin(request, env, actor, articleId, action) {
  const db = env.DB;
  await ensureJobsPublishingSchema(db);
  await publishDueScheduledJobs(db);
  const method = request.method;

  // GET /api/admin/jobs/articles
  if (!articleId && method === 'GET') {
    const url = new URL(request.url);
    const l1 = str(url.searchParams.get('l1'), 80);
    const l2 = str(url.searchParams.get('l2'), 80);
    const l3 = str(url.searchParams.get('l3'), 80);
    const stage = str(url.searchParams.get('stage'), 32);
    const status = str(url.searchParams.get('status'), 24).toLowerCase();
    const q = str(url.searchParams.get('q') || url.searchParams.get('search'), 120).toLowerCase();

    const [{ map: taxMap, list: taxList }, allRes] = await Promise.all([
      loadTaxonomyMap(db),
      db.prepare('SELECT * FROM job_articles ORDER BY is_featured DESC, updated_at DESC').all().catch(() => ({ results: [] }))
    ]);
    const allItems = (allRes.results || []).map(r => formatArticle(r, taxMap, true));

    // KPIs over entire dataset
    const kpis = {
      total_jobs: allItems.length,
      published_live: allItems.filter(a => a.is_published === 1).length,
      scheduled_or_draft: allItems.filter(a => a.is_published === 0).length,
      closing_soon: allItems.filter(a => a.is_published === 1 && !a.is_expired && a.days_remaining !== null && a.days_remaining >= 0 && a.days_remaining <= 7).length,
      total_vacancies: allItems.reduce((s, a) => s + Number(a.total_vacancies || 0), 0),
      total_views: allItems.reduce((s, a) => s + Number(a.views_count || 0), 0),
      total_apply_clicks: allItems.reduce((s, a) => s + Number(a.apply_clicks_count || 0), 0),
      total_pdf_downloads: allItems.reduce((s, a) => s + Number(a.pdf_downloads_count || 0), 0),
      total_bookmarks: allItems.reduce((s, a) => s + Number(a.bookmarks_count || 0), 0)
    };

    const filtered = allItems.filter(a => {
      if (l1 && a.category_l1_id !== l1) return false;
      if (l2 && a.category_l2_id !== l2) return false;
      if (l3 && a.category_l3_id !== l3) return false;
      if (stage && a.lifecycle_stage !== stage) return false;
      if (status && a.publication_status !== status) return false;
      if (q) {
        const hay = `${a.title_en} ${a.title_or} ${a.organisation_en} ${a.advt_number} ${a.slug} ${a.location_district}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return json({
      ok: true,
      kpis,
      items: filtered,
      taxonomy_nodes: taxList,
      taxonomy_tree: buildTaxonomyTree(taxList)
    });
  }

  // POST /api/admin/jobs/articles
  if (!articleId && method === 'POST') {
    const body = await readJson(request, 220000);
    const data = normalizeArticlePayload(body, null);
    // Ensure unique slug
    let finalSlug = data.slug;
    const conflict = await db.prepare('SELECT id FROM job_articles WHERE slug = ?').bind(finalSlug).first().catch(() => null);
    if (conflict) finalSlug = `${finalSlug}-${randomHex(2)}`;

    const id = 'jart_' + Date.now().toString(36) + '_' + randomHex(3);
    await db.prepare(
      `INSERT INTO job_articles (
        id, slug, category_l1_id, category_l2_id, category_l3_id, sector_badge,
        title_en, title_or, summary_en, summary_or, organisation_en, organisation_or,
        advt_number, total_vacancies, qualification_level, qualification_summary,
        min_age, max_age, age_cutoff_date, age_limit_summary, odisha_domicile_required,
        salary_pay_scale, selection_mode, location_district,
        application_start_date, last_date, exam_date,
        cover_image_url, cover_image_caption, article_body_en, article_body_or,
        vacancy_breakdown_json, important_dates_json, fee_structure_json,
        selection_steps_json, cutoff_reference_json, lifecycle_updates_json, linked_study_ids_json,
        official_apply_url, official_website_url, notification_pdf_url, syllabus_pdf_url,
        pdf_index_bookmarks_json, extra_attachments_json, lifecycle_stage,
        corrigendum_note_en, corrigendum_note_or, scheduled_publish_at,
        is_featured, is_published, published_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, datetime('now')
      )`
    ).bind(
      id, finalSlug, data.category_l1_id, data.category_l2_id, data.category_l3_id, data.sector_badge,
      data.title_en, data.title_or, data.summary_en, data.summary_or, data.organisation_en, data.organisation_or,
      data.advt_number, data.total_vacancies, data.qualification_level, data.qualification_summary,
      data.min_age, data.max_age, data.age_cutoff_date, data.age_limit_summary, data.odisha_domicile_required,
      data.salary_pay_scale, data.selection_mode, data.location_district,
      data.application_start_date, data.last_date, data.exam_date,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.vacancy_breakdown_json, data.important_dates_json, data.fee_structure_json,
      data.selection_steps_json, data.cutoff_reference_json, data.lifecycle_updates_json, data.linked_study_ids_json,
      data.official_apply_url, data.official_website_url, data.notification_pdf_url, data.syllabus_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json, data.lifecycle_stage,
      data.corrigendum_note_en, data.corrigendum_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_published, data.published_at
    ).run();

    const row = await db.prepare('SELECT * FROM job_articles WHERE id = ?').bind(id).first();
    await saveArticleRevision(db, id, row || data, body.change_summary || (data.is_published ? 'Initial publish' : 'Initial draft'), actor.email);
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, data.is_published ? 'jobs_article.publish' : 'jobs_article.create', 'job_articles', id, { slug: finalSlug, title_en: data.title_en });
    await invalidateJobsCaches(request, finalSlug);
    const res = json({ ok: true, item: formatArticle(row, taxMap, true) }, 201);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // POST /api/admin/jobs/:id/preview-token OR /api/admin/jobs/articles/:id/preview-token
  if (articleId && action === 'preview-token' && method === 'POST') {
    const existing = await db.prepare('SELECT * FROM job_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Job article not found');
    const token = randomHex(32);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await db.prepare(
      "UPDATE job_articles SET preview_token = ?, preview_expires_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(token, expiresAt, articleId).run();
    await audit(env, request, actor, 'jobs_article.preview_token', 'job_articles', articleId, { slug: existing.slug, expires_at: expiresAt });
    return json({
      ok: true,
      article_id: articleId,
      slug: existing.slug,
      preview_token: token,
      preview_expires_at: expiresAt,
      preview_url: `/jobs/?slug=${encodeURIComponent(existing.slug)}&preview_token=${encodeURIComponent(token)}`
    }, 200, { 'Cache-Control': 'no-store' });
  }

  // GET /api/admin/jobs/articles/:id/revisions
  if (articleId && action === 'revisions' && method === 'GET') {
    const { results } = await db.prepare(
      'SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM job_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 30'
    ).bind(articleId).all().catch(() => ({ results: [] }));
    return json({ ok: true, revisions: results || [] });
  }

  // POST /api/admin/jobs/articles/:id/rollback
  if (articleId && action === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = str(body.revision_id, 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required.' });
    const rev = await db.prepare('SELECT * FROM job_article_revisions WHERE id = ? AND article_id = ?').bind(revId, articleId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    let snap = {};
    try { snap = JSON.parse(rev.snapshot_json || '{}'); } catch { throw new HttpError(500, 'CORRUPT_REVISION', 'Snapshot JSON invalid'); }
    const existing = await db.prepare('SELECT * FROM job_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Job article not found');
    const data = normalizeArticlePayload(snap, existing);
    await db.prepare(
      `UPDATE job_articles SET
        category_l1_id = ?, category_l2_id = ?, category_l3_id = ?, sector_badge = ?,
        title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, organisation_en = ?, organisation_or = ?,
        advt_number = ?, total_vacancies = ?, qualification_level = ?, qualification_summary = ?,
        min_age = ?, max_age = ?, age_cutoff_date = ?, age_limit_summary = ?, odisha_domicile_required = ?,
        salary_pay_scale = ?, selection_mode = ?, location_district = ?,
        application_start_date = ?, last_date = ?, exam_date = ?,
        cover_image_url = ?, cover_image_caption = ?, article_body_en = ?, article_body_or = ?,
        vacancy_breakdown_json = ?, important_dates_json = ?, fee_structure_json = ?,
        selection_steps_json = ?, cutoff_reference_json = ?, lifecycle_updates_json = ?, linked_study_ids_json = ?,
        official_apply_url = ?, official_website_url = ?, notification_pdf_url = ?, syllabus_pdf_url = ?,
        pdf_index_bookmarks_json = ?, extra_attachments_json = ?, lifecycle_stage = ?,
        corrigendum_note_en = ?, corrigendum_note_or = ?, scheduled_publish_at = ?,
        is_featured = ?, is_published = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      data.category_l1_id, data.category_l2_id, data.category_l3_id, data.sector_badge,
      data.title_en, data.title_or, data.summary_en, data.summary_or, data.organisation_en, data.organisation_or,
      data.advt_number, data.total_vacancies, data.qualification_level, data.qualification_summary,
      data.min_age, data.max_age, data.age_cutoff_date, data.age_limit_summary, data.odisha_domicile_required,
      data.salary_pay_scale, data.selection_mode, data.location_district,
      data.application_start_date, data.last_date, data.exam_date,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.vacancy_breakdown_json, data.important_dates_json, data.fee_structure_json,
      data.selection_steps_json, data.cutoff_reference_json, data.lifecycle_updates_json, data.linked_study_ids_json,
      data.official_apply_url, data.official_website_url, data.notification_pdf_url, data.syllabus_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json, data.lifecycle_stage,
      data.corrigendum_note_en, data.corrigendum_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_published, articleId
    ).run();
    const row = await db.prepare('SELECT * FROM job_articles WHERE id = ?').bind(articleId).first();
    await saveArticleRevision(db, articleId, row, `Restored from Revision #${rev.revision_number}`, actor.email);
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, 'jobs_article.rollback', 'job_articles', articleId, { restored_revision: rev.revision_number });
    await invalidateJobsCaches(request, existing.slug);
    const res = json({ ok: true, item: formatArticle(row, taxMap, true) });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // GET /api/admin/jobs/articles/:id
  if (articleId && !action && method === 'GET') {
    const row = await db.prepare('SELECT * FROM job_articles WHERE id = ?').bind(articleId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Job article not found');
    const [{ map: taxMap }, revRes] = await Promise.all([
      loadTaxonomyMap(db),
      db.prepare('SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM job_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 20').bind(articleId).all().catch(() => ({ results: [] }))
    ]);
    return json({ ok: true, item: formatArticle(row, taxMap, true), revisions: revRes.results || [] });
  }

  // PUT / PATCH /api/admin/jobs/articles/:id
  if (articleId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM job_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Job article not found');
    const body = await readJson(request, 220000);
    const data = normalizeArticlePayload(body, existing);
    let finalSlug = data.slug;
    if (finalSlug !== existing.slug) {
      const conflict = await db.prepare('SELECT id FROM job_articles WHERE slug = ? AND id != ?').bind(finalSlug, articleId).first().catch(() => null);
      if (conflict) throw validationError({ slug: 'Another job article already uses this slug.' });
    }
    await db.prepare(
      `UPDATE job_articles SET
        slug = ?, category_l1_id = ?, category_l2_id = ?, category_l3_id = ?, sector_badge = ?,
        title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, organisation_en = ?, organisation_or = ?,
        advt_number = ?, total_vacancies = ?, qualification_level = ?, qualification_summary = ?,
        min_age = ?, max_age = ?, age_cutoff_date = ?, age_limit_summary = ?, odisha_domicile_required = ?,
        salary_pay_scale = ?, selection_mode = ?, location_district = ?,
        application_start_date = ?, last_date = ?, exam_date = ?,
        cover_image_url = ?, cover_image_caption = ?, article_body_en = ?, article_body_or = ?,
        vacancy_breakdown_json = ?, important_dates_json = ?, fee_structure_json = ?,
        selection_steps_json = ?, cutoff_reference_json = ?, lifecycle_updates_json = ?, linked_study_ids_json = ?,
        official_apply_url = ?, official_website_url = ?, notification_pdf_url = ?, syllabus_pdf_url = ?,
        pdf_index_bookmarks_json = ?, extra_attachments_json = ?, lifecycle_stage = ?,
        corrigendum_note_en = ?, corrigendum_note_or = ?, scheduled_publish_at = ?,
        is_featured = ?, is_published = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      finalSlug, data.category_l1_id, data.category_l2_id, data.category_l3_id, data.sector_badge,
      data.title_en, data.title_or, data.summary_en, data.summary_or, data.organisation_en, data.organisation_or,
      data.advt_number, data.total_vacancies, data.qualification_level, data.qualification_summary,
      data.min_age, data.max_age, data.age_cutoff_date, data.age_limit_summary, data.odisha_domicile_required,
      data.salary_pay_scale, data.selection_mode, data.location_district,
      data.application_start_date, data.last_date, data.exam_date,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.vacancy_breakdown_json, data.important_dates_json, data.fee_structure_json,
      data.selection_steps_json, data.cutoff_reference_json, data.lifecycle_updates_json, data.linked_study_ids_json,
      data.official_apply_url, data.official_website_url, data.notification_pdf_url, data.syllabus_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json, data.lifecycle_stage,
      data.corrigendum_note_en, data.corrigendum_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_published, data.published_at, articleId
    ).run();

    const row = await db.prepare('SELECT * FROM job_articles WHERE id = ?').bind(articleId).first();
    await saveArticleRevision(db, articleId, row || data, body.change_summary || 'Editorial update', actor.email);
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, data.is_published ? 'jobs_article.publish' : 'jobs_article.update', 'job_articles', articleId, { slug: finalSlug });
    await invalidateJobsCaches(request, finalSlug);
    const res = json({ ok: true, item: formatArticle(row, taxMap, true) });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // DELETE /api/admin/jobs/articles/:id
  if (articleId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT id, slug, title_en FROM job_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Job article not found');
    await db.prepare('DELETE FROM job_article_revisions WHERE article_id = ?').bind(articleId).run().catch(() => {});
    await db.prepare('DELETE FROM job_articles WHERE id = ?').bind(articleId).run();
    await audit(env, request, actor, 'jobs_article.delete', 'job_articles', articleId, { slug: existing.slug, title_en: existing.title_en });
    await invalidateJobsCaches(request, existing.slug);
    const res = json({ ok: true, deleted: articleId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown jobs article route');
}

// ============================================================================
// PUBLIC ENDPOINTS: /api/public/jobs/tree, /api/public/jobs, /api/public/jobs/article, /api/public/jobs/telemetry
// ============================================================================
export async function handlePublicJobsTreeApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, tree: [], nodes: [] }, 200, { 'Cache-Control': 'no-store' });
  await ensureJobsPublishingSchema(env.DB);
  await publishDueScheduledJobs(env.DB);

  const [{ results: rawNodes }, { results: pubArticles }] = await Promise.all([
    env.DB.prepare('SELECT * FROM job_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC').all().catch(() => ({ results: [] })),
    env.DB.prepare('SELECT category_l1_id, category_l2_id, category_l3_id FROM job_articles WHERE is_published = 1').all().catch(() => ({ results: [] }))
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
    return { ...n, published_jobs_count: counts.get(n.id) || 0 };
  });

  return json({
    ok: true,
    total_published_jobs: (pubArticles || []).length,
    nodes,
    tree: buildTaxonomyTree(nodes)
  }, 200, { 'Cache-Control': PUBLIC_CACHE });
}

export async function handlePublicJobsListApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, items: [], total: 0 }, 200, { 'Cache-Control': 'no-store' });
  await ensureJobsPublishingSchema(env.DB);
  await publishDueScheduledJobs(env.DB);

  const url = new URL(request.url);
  const l1 = str(url.searchParams.get('l1'), 80);
  const l2 = str(url.searchParams.get('l2'), 80);
  const l3 = str(url.searchParams.get('l3'), 80);
  const district = str(url.searchParams.get('district'), 80).toLowerCase();
  const qualification = str(url.searchParams.get('qualification'), 80).toLowerCase();
  const stage = str(url.searchParams.get('stage'), 40).toLowerCase();
  const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();
  const featured = url.searchParams.get('featured') === '1';
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50));

  const [{ map: taxMap }, { results }] = await Promise.all([
    loadTaxonomyMap(env.DB),
    env.DB.prepare('SELECT * FROM job_articles WHERE is_published = 1 ORDER BY is_featured DESC, updated_at DESC').all().catch(() => ({ results: [] }))
  ]);

  const all = (results || []).map(r => formatArticle(r, taxMap, false));

  // Build facets from all published jobs
  const districtsSet = new Set();
  const qualsSet = new Set();
  const stagesSet = new Set();
  all.forEach(a => {
    if (a.location_district) districtsSet.add(a.location_district);
    if (a.qualification_level) qualsSet.add(a.qualification_level);
    if (a.lifecycle_stage) stagesSet.add(a.lifecycle_stage);
  });

  const filtered = all.filter(a => {
    if (l1 && a.category_l1_id !== l1 && (!a.taxonomy.l1 || a.taxonomy.l1.slug !== l1)) return false;
    if (l2 && a.category_l2_id !== l2 && (!a.taxonomy.l2 || a.taxonomy.l2.slug !== l2)) return false;
    if (l3 && a.category_l3_id !== l3 && (!a.taxonomy.l3 || a.taxonomy.l3.slug !== l3)) return false;
    if (district && a.location_district.toLowerCase() !== district && a.location_district.toLowerCase() !== 'all odisha') return false;
    if (qualification && !`${a.qualification_level} ${a.qualification_summary}`.toLowerCase().includes(qualification)) return false;
    if (stage && a.lifecycle_stage.toLowerCase() !== stage) return false;
    if (featured && !a.is_featured) return false;
    if (search) {
      const hay = `${a.title_en} ${a.title_or} ${a.summary_en} ${a.organisation_en} ${a.advt_number} ${a.qualification_level} ${a.location_district} ${a.sector_badge}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // Sort active jobs first, then soonest deadline, then newest
  filtered.sort((a, b) => {
    if (a.is_expired !== b.is_expired) return a.is_expired ? 1 : -1;
    if (a.is_featured !== b.is_featured) return b.is_featured - a.is_featured;
    if (a.last_date && b.last_date && !a.is_expired && !b.is_expired) {
      return a.last_date.localeCompare(b.last_date);
    }
    return String(b.published_at || b.updated_at).localeCompare(String(a.published_at || a.updated_at));
  });

  return json({
    ok: true,
    total: filtered.length,
    items: filtered.slice(0, limit),
    facets: {
      districts: [...districtsSet].sort(),
      qualifications: [...qualsSet].sort(),
      stages: [...stagesSet]
    }
  }, 200, { 'Cache-Control': PUBLIC_CACHE });
}

async function resolveLinkedStudyItems(db, linkedIds) {
  if (!Array.isArray(linkedIds) || !linkedIds.length) return [];
  const out = [];
  for (const raw of linkedIds.slice(0, 12)) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const [prefix, id] = s.includes(':') ? s.split(':', 2) : ['study', s];
    try {
      if (prefix === 'study') {
        const r = await db.prepare('SELECT id, title, slug, item_type, exam_tag, summary FROM study_library_items WHERE id = ?').bind(id).first();
        if (r) out.push({ id: s, kind: r.item_type || 'Study Material', title: r.title, tag: r.exam_tag || 'Study Library', summary: r.summary || '', url: `/study-library/item/${encodeURIComponent(r.slug || r.id)}/` });
      } else if (prefix === 'mock') {
        const r = await db.prepare('SELECT id, title, slug, target_exam, duration_minutes, total_marks FROM mock_tests WHERE id = ?').bind(id).first();
        if (r) out.push({ id: s, kind: 'Mock Test', title: r.title, tag: r.target_exam || 'CBT Mock', summary: `${r.duration_minutes || 60} mins · ${r.total_marks || 100} marks`, url: `/mock-tests/?test=${encodeURIComponent(r.slug || r.id)}` });
      } else if (prefix === 'resource') {
        const r = await db.prepare('SELECT id, title, kind, exam, year, media_key FROM resources WHERE id = ?').bind(id).first();
        if (r) out.push({ id: s, kind: r.kind === 'pyq' ? 'PYQ Paper' : 'Syllabus PDF', title: r.title, tag: r.exam || String(r.year || 'PDF'), summary: '', url: r.media_key ? `/api/media/${r.media_key}` : '/resources/' });
      }
    } catch { /* ignore missing linked table */ }
  }
  return out;
}

export async function handlePublicJobsArticleApi(request, env) {
  if (!env || !env.DB) return json({ error: 'Database unavailable' }, 500, { 'Cache-Control': 'no-store' });
  await ensureJobsPublishingSchema(env.DB);
  await publishDueScheduledJobs(env.DB);

  const url = new URL(request.url);
  const slug = str(url.searchParams.get('slug'), 160);
  const previewToken = str(url.searchParams.get('preview_token'), 160);
  if (!slug) return json({ error: 'slug query parameter is required', code: 'VALIDATION_ERROR' }, 400, { 'Cache-Control': 'no-store' });

  const row = await env.DB.prepare('SELECT * FROM job_articles WHERE slug = ?').bind(slug).first();
  if (!row) return json({ error: 'Job article not found', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'no-store' });

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
      return json({ error: 'Job article not found or preview link expired', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'no-store' });
    }
    isPreview = true;
  } else if (previewToken) {
    // Allow preview banner check if explicitly opened with valid token while already published
    if (row.preview_token && constantTimeEqual(previewToken, row.preview_token)) {
      previewExpiresAt = String(row.preview_expires_at || '');
    }
  }

  const [{ map: taxMap }, { results: relRows }] = await Promise.all([
    loadTaxonomyMap(env.DB),
    env.DB.prepare(
      `SELECT * FROM job_articles
       WHERE is_published = 1 AND id != ?
       ORDER BY CASE WHEN category_l2_id = ? THEN 0 WHEN category_l1_id = ? THEN 1 ELSE 2 END, updated_at DESC
       LIMIT 6`
    ).bind(row.id, row.category_l2_id || '', row.category_l1_id || '').all().catch(() => ({ results: [] }))
  ]);

  const article = formatArticle(row, taxMap, false);
  const related = (relRows || [])
    .map(r => formatArticle(r, taxMap, false))
    .sort((a, b) => Number(a.is_expired) - Number(b.is_expired))
    .slice(0, 3);
  const linkedStudyItems = await resolveLinkedStudyItems(env.DB, article.linked_study_ids);

  const cacheHeader = isPreview || previewToken ? 'no-store' : PUBLIC_CACHE;
  return json({
    ok: true,
    is_preview: isPreview,
    preview_expires_at: previewExpiresAt,
    article,
    linked_study_items: linkedStudyItems,
    related_jobs: related
  }, 200, { 'Cache-Control': cacheHeader });
}

export async function handlePublicJobsTelemetryApi(request, env) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env || !env.DB) return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
  await ensureJobsPublishingSchema(env.DB);
  try {
    await rateLimit(env, `jobs-tel:${clientIp(request)}`, 80, 60);
  } catch {
    return json({ ok: false, rate_limited: true }, 429, { 'Cache-Control': 'no-store' });
  }
  const body = await readJson(request, 4000).catch(() => ({}));
  const event = str(body.event, 32).toLowerCase();
  const id = str(body.id, 80);
  const slug = str(body.slug, 160);
  const colMap = {
    view: 'views_count',
    apply_click: 'apply_clicks_count',
    pdf_download: 'pdf_downloads_count',
    bookmark: 'bookmarks_count'
  };
  const col = colMap[event];
  if (!col || (!id && !slug)) {
    return json({ ok: false, error: 'Valid event and id/slug required' }, 400, { 'Cache-Control': 'no-store' });
  }
  if (id) {
    await env.DB.prepare(`UPDATE job_articles SET ${col} = ${col} + 1 WHERE id = ?`).bind(id).run();
  } else {
    await env.DB.prepare(`UPDATE job_articles SET ${col} = ${col} + 1 WHERE slug = ?`).bind(slug).run();
  }
  return json({ ok: true, event }, 200, { 'Cache-Control': 'no-store' });
}
