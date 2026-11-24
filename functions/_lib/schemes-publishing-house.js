// v250 Schemes & Welfare Publishing House, 3-Layer Taxonomy, Revisions & Citizen Eligibility Engine
// Strict D1 + R2 backed. Every write audits to audit_log and immediately invalidates edge & isolate caches.
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit, getActor, STAFF_ROLES } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';

export const SCHEME_STATUSES = ['active', 'ongoing', 'upcoming', 'closed'];
export const SCHEME_STATUS_LABELS = {
  active: 'Active / Open',
  ongoing: 'Ongoing Year-Round',
  upcoming: 'Upcoming',
  closed: 'Application Closed'
};

export const RENEWAL_TYPES = ['Fresh', 'Renewal', 'Fresh & Renewal', 'One-Time'];
export const APPLICATION_MODES = ['Online Portal', 'Mo Seba Kendra / CSC', 'Block / District Office', 'Hybrid (Online + MSK/Offline)'];

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=60, must-revalidate';
const MB = 1024 * 1024;
const ALLOWED_UPLOAD_MIME = {
  'image/jpeg': { ext: 'jpg', kind: 'image', max: 8 * MB },
  'image/png': { ext: 'png', kind: 'image', max: 8 * MB },
  'image/webp': { ext: 'webp', kind: 'image', max: 8 * MB },
  'application/pdf': { ext: 'pdf', kind: 'pdf', max: 25 * MB }
};

let _schemaReady = false;

export async function ensureSchemesPublishingSchema(db) {
  if (!db || _schemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS scheme_taxonomy_nodes (
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
    `CREATE TABLE IF NOT EXISTS scheme_articles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      category_l1_id TEXT,
      category_l2_id TEXT,
      category_l3_id TEXT,
      gov_badge TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      department_en TEXT NOT NULL DEFAULT '',
      department_or TEXT NOT NULL DEFAULT '',
      scheme_code TEXT NOT NULL DEFAULT '',
      benefit_amount_summary TEXT NOT NULL DEFAULT '',
      benefit_frequency TEXT NOT NULL DEFAULT '',
      dbt_mode TEXT NOT NULL DEFAULT '',
      npci_seeding_required INTEGER NOT NULL DEFAULT 0,
      prerequisite_otr_label TEXT NOT NULL DEFAULT '',
      prerequisite_otr_url TEXT NOT NULL DEFAULT '',
      target_beneficiaries TEXT NOT NULL DEFAULT '',
      min_age INTEGER,
      max_age INTEGER,
      gender_eligibility TEXT NOT NULL DEFAULT 'All',
      allowed_categories_json TEXT NOT NULL DEFAULT '[]',
      max_annual_income INTEGER,
      min_qualifying_marks REAL,
      occupation_tag TEXT NOT NULL DEFAULT '',
      odisha_domicile_required INTEGER NOT NULL DEFAULT 1,
      renewal_type TEXT NOT NULL DEFAULT 'Fresh & Renewal',
      stackable_policy TEXT NOT NULL DEFAULT '',
      application_mode TEXT NOT NULL DEFAULT 'Online Portal',
      application_start_date TEXT NOT NULL DEFAULT '',
      last_date TEXT NOT NULL DEFAULT '',
      institute_verification_date TEXT NOT NULL DEFAULT '',
      dwo_sanction_date TEXT NOT NULL DEFAULT '',
      is_ongoing INTEGER NOT NULL DEFAULT 0,
      helpline_number TEXT NOT NULL DEFAULT '',
      grievance_url TEXT NOT NULL DEFAULT '',
      track_status_url TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      cover_image_caption TEXT NOT NULL DEFAULT '',
      article_body_en TEXT NOT NULL DEFAULT '',
      article_body_or TEXT NOT NULL DEFAULT '',
      benefits_breakdown_json TEXT NOT NULL DEFAULT '[]',
      eligibility_rules_json TEXT NOT NULL DEFAULT '[]',
      required_documents_json TEXT NOT NULL DEFAULT '[]',
      application_steps_json TEXT NOT NULL DEFAULT '[]',
      important_dates_json TEXT NOT NULL DEFAULT '[]',
      faq_items_json TEXT NOT NULL DEFAULT '[]',
      official_apply_url TEXT NOT NULL DEFAULT '',
      official_portal_url TEXT NOT NULL DEFAULT '',
      guidelines_pdf_url TEXT NOT NULL DEFAULT '',
      application_form_pdf_url TEXT NOT NULL DEFAULT '',
      pdf_index_bookmarks_json TEXT NOT NULL DEFAULT '[]',
      extra_attachments_json TEXT NOT NULL DEFAULT '[]',
      scheme_status TEXT NOT NULL DEFAULT 'active',
      amendment_note_en TEXT NOT NULL DEFAULT '',
      amendment_note_or TEXT NOT NULL DEFAULT '',
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
    `CREATE TABLE IF NOT EXISTS scheme_article_revisions (
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
    try { await db.prepare(s).run(); } catch { /* mock or already exists */ }
  }
  _schemaReady = true;
}

export function resetSchemesPublishingSchemaMemo() {
  _schemaReady = false;
}

function str(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function intOrNull(v, min = 0, max = 100000000) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function numOrNull(v, min = 0, max = 100) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Number(n.toFixed(2))));
}

function intOrZero(v, min = 0, max = 100000000) {
  const n = intOrNull(v, min, max);
  return n === null ? 0 : n;
}

function boolInt(v, fallback = 0) {
  if (v === undefined || v === null) return fallback;
  if (v === true || v === 1 || v === '1' || v === 'true' || v === 'published') return 1;
  return 0;
}

export function slugify(raw, fallback = 'scheme') {
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

function safeJsonArray(raw, maxItems = 80) {
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw || '[]'); } catch { arr = []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems);
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
  for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

export function computeSchemeWindowState(row) {
  const isOngoing = Boolean(row.is_ongoing) || String(row.scheme_status || '') === 'ongoing';
  const lastDate = String(row.last_date || '').trim();
  const status = String(row.scheme_status || 'active');
  const today = todayIsoDate();
  const isDatePassed = !isOngoing && /^\d{4}-\d{2}-\d{2}$/.test(lastDate) && lastDate < today;
  const isClosed = status === 'closed' || isDatePassed;
  let daysRemaining = null;
  if (!isOngoing && /^\d{4}-\d{2}-\d{2}$/.test(lastDate)) {
    const t0 = Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
    const t1 = Date.UTC(Number(lastDate.slice(0, 4)), Number(lastDate.slice(5, 7)) - 1, Number(lastDate.slice(8, 10)));
    daysRemaining = Math.round((t1 - t0) / 86400000);
  }
  let statusBadge = SCHEME_STATUS_LABELS[status] || 'Active / Open';
  if (isOngoing && status !== 'closed') statusBadge = 'Ongoing Year-Round';
  else if (isClosed) statusBadge = 'Window Closed · Check Next Cycle';
  else if (daysRemaining === 0) statusBadge = 'Closes Today';
  else if (daysRemaining !== null && daysRemaining <= 7) statusBadge = `Closing in ${daysRemaining}d`;

  return {
    is_expired: isClosed,
    days_remaining: daysRemaining,
    status_badge: statusBadge,
    scheme_status_label: SCHEME_STATUS_LABELS[status] || 'Active / Open'
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

export function buildSchemeTaxonomyTree(nodes) {
  const byParent = new Map();
  nodes.forEach(n => {
    const k = n.parent_id || '__root__';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push({ ...n, children: [] });
  });
  const roots = byParent.get('__root__') || [];
  roots.forEach(l1 => {
    const l2s = byParent.get(l1.id) || [];
    l2s.forEach(l2 => { l2.children = byParent.get(l2.id) || []; });
    l1.children = l2s;
  });
  return roots;
}

function formatSchemeArticle(r, taxMap = null, includePrivate = false) {
  if (!r) return null;
  const win = computeSchemeWindowState(r);
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
    gov_badge: String(r.gov_badge || (l1 ? l1.title_en : '')),
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    summary_en: String(r.summary_en || ''),
    summary_or: String(r.summary_or || ''),
    department_en: String(r.department_en || ''),
    department_or: String(r.department_or || ''),
    scheme_code: String(r.scheme_code || ''),
    benefit_amount_summary: String(r.benefit_amount_summary || ''),
    benefit_frequency: String(r.benefit_frequency || ''),
    dbt_mode: String(r.dbt_mode || ''),
    npci_seeding_required: r.npci_seeding_required ? 1 : 0,
    prerequisite_otr_label: String(r.prerequisite_otr_label || ''),
    prerequisite_otr_url: String(r.prerequisite_otr_url || ''),
    target_beneficiaries: String(r.target_beneficiaries || ''),
    min_age: r.min_age === null || r.min_age === undefined ? null : Number(r.min_age),
    max_age: r.max_age === null || r.max_age === undefined ? null : Number(r.max_age),
    gender_eligibility: String(r.gender_eligibility || 'All'),
    allowed_categories: safeJsonArray(r.allowed_categories_json),
    max_annual_income: r.max_annual_income === null || r.max_annual_income === undefined ? null : Number(r.max_annual_income),
    min_qualifying_marks: r.min_qualifying_marks === null || r.min_qualifying_marks === undefined ? null : Number(r.min_qualifying_marks),
    occupation_tag: String(r.occupation_tag || ''),
    odisha_domicile_required: r.odisha_domicile_required ? 1 : 0,
    renewal_type: String(r.renewal_type || 'Fresh & Renewal'),
    stackable_policy: String(r.stackable_policy || ''),
    application_mode: String(r.application_mode || 'Online Portal'),
    application_start_date: String(r.application_start_date || ''),
    last_date: String(r.last_date || ''),
    institute_verification_date: String(r.institute_verification_date || ''),
    dwo_sanction_date: String(r.dwo_sanction_date || ''),
    is_ongoing: r.is_ongoing ? 1 : 0,
    helpline_number: String(r.helpline_number || ''),
    grievance_url: String(r.grievance_url || ''),
    track_status_url: String(r.track_status_url || ''),
    cover_image_url: String(r.cover_image_url || ''),
    cover_image_caption: String(r.cover_image_caption || ''),
    article_body_en: String(r.article_body_en || ''),
    article_body_or: String(r.article_body_or || ''),
    benefits_breakdown: safeJsonArray(r.benefits_breakdown_json),
    eligibility_rules: safeJsonArray(r.eligibility_rules_json),
    required_documents: safeJsonArray(r.required_documents_json),
    application_steps: safeJsonArray(r.application_steps_json),
    important_dates: safeJsonArray(r.important_dates_json),
    faq_items: safeJsonArray(r.faq_items_json),
    official_apply_url: String(r.official_apply_url || ''),
    official_portal_url: String(r.official_portal_url || ''),
    is_official_gov_url: isOfficialGovUrl(r.official_apply_url || r.official_portal_url),
    guidelines_pdf_url: String(r.guidelines_pdf_url || ''),
    application_form_pdf_url: String(r.application_form_pdf_url || ''),
    pdf_index_bookmarks: safeJsonArray(r.pdf_index_bookmarks_json),
    extra_attachments: safeJsonArray(r.extra_attachments_json),
    scheme_status: String(r.scheme_status || 'active'),
    amendment_note_en: String(r.amendment_note_en || ''),
    amendment_note_or: String(r.amendment_note_or || ''),
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
    public_url: `/schemes/?slug=${encodeURIComponent(String(r.slug || ''))}`,
    ...win
  };
  if (includePrivate) {
    out.preview_token = String(r.preview_token || '');
    out.preview_expires_at = String(r.preview_expires_at || '');
  }
  return out;
}

async function invalidateSchemesCaches(request, slug = '') {
  const extra = [
    '/api/public/schemes',
    '/api/public/schemes/tree',
    '/api/public/schemes/article',
    '/api/events/upcoming',
    '/schemes/',
    '/schemes-benefits/',
    '/',
    '/index.html'
  ];
  if (slug) {
    extra.push(`/api/public/schemes/article?slug=${encodeURIComponent(slug)}`);
    extra.push(`/schemes/?slug=${encodeURIComponent(slug)}`);
  }
  try { await invalidateAllPublicCaches(request, extra); } catch { /* best effort */ }
}

async function loadSchemeTaxonomyMap(db) {
  const { results } = await db.prepare(
    'SELECT * FROM scheme_taxonomy_nodes ORDER BY level ASC, sort_order ASC, title_en ASC'
  ).all().catch(() => ({ results: [] }));
  const map = new Map();
  const list = (results || []).map(formatTaxonomyNode);
  list.forEach(n => map.set(n.id, n));
  return { map, list };
}

export async function publishDueScheduledSchemes(db) {
  if (!db) return 0;
  try {
    const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const r = await db.prepare(
      `UPDATE scheme_articles
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
// PDF-TO-SCHEME AUTO-DRAFT EXTRACTOR (Zero-dependency, Workers-native)
// ============================================================================
export function extractSchemeMetadataFromPdfBytes(uint8) {
  const out = {
    department_en: '',
    benefit_amount_summary: '',
    max_annual_income: null,
    min_qualifying_marks: null,
    min_age: null,
    max_age: null,
    application_start_date: '',
    last_date: '',
    helpline_number: '',
    official_portal_url: '',
    official_apply_url: '',
    npci_seeding_required: 0
  };
  if (!uint8 || !uint8.length) return out;
  const cap = Math.min(uint8.length, 600000);
  let raw = '';
  for (let i = 0; i < cap; i++) {
    const c = uint8[i];
    raw += (c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9 ? String.fromCharCode(c) : ' ';
  }
  const tokens = [];
  const parenRe = /\(([^()\\]{3,160})\)/g;
  let m;
  while ((m = parenRe.exec(raw)) !== null && tokens.length < 2500) tokens.push(m[1]);
  const text = (tokens.length > 12 ? tokens.join(' ') + '\n' : '') + raw.replace(/\s+/g, ' ');

  // 1. Department
  const deptMatch = text.match(/(?:Department\s+of\s+[A-Za-z&,\s]{3,70}|[A-Za-z&,\s]{3,50}\s+Department,\s*Government\s+of\s+(?:Odisha|India))/i);
  if (deptMatch) out.department_en = deptMatch[0].replace(/\s+/g, ' ').trim().slice(0, 120);

  // 2. Benefit Amount
  const benMatch = text.match(/(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]+)?(?:\s*(?:lakh|lakhs|thousand|crore|per\s+annum|\/-\s*(?:per\s+(?:year|month|annum))?))?)/i);
  if (benMatch) out.benefit_amount_summary = '₹' + benMatch[1].trim().slice(0, 80);

  // 3. Annual Family Income limit
  const incLakh = text.match(/(?:annual\s+(?:family\s+)?income|income\s+(?:limit|ceiling))[^0-9]{0,35}(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lakhs)/i);
  if (incLakh) {
    out.max_annual_income = Math.round(Number(incLakh[1]) * 100000);
  } else {
    const incNum = text.match(/(?:annual\s+(?:family\s+)?income|income\s+(?:limit|ceiling))[^0-9]{0,35}(?:Rs\.?|INR|₹)?\s*([0-9,]{5,10})/i);
    if (incNum) {
      const n = Number(incNum[1].replace(/,/g, ''));
      if (n >= 10000 && n <= 50000000) out.max_annual_income = n;
    }
  }

  // 4. Qualifying Marks %
  const marksMatch = text.match(/(?:minimum\s+(?:of\s+)?|at\s+least\s+)(\d{2}(?:\.\d+)?)\s*%\s*(?:marks|aggregate)/i)
    || text.match(/(\d{2}(?:\.\d+)?)\s*%\s*(?:or\s+above|marks\s+in\s+(?:last|qualifying))/i);
  if (marksMatch) {
    const mk = Number(marksMatch[1]);
    if (mk >= 30 && mk <= 100) out.min_qualifying_marks = mk;
  }

  // 5. Age range
  const ageMatch = text.match(/(?:age\s+(?:limit|group|between)|between\s+the\s+age\s+of)[^0-9]{0,30}(\d{1,2})\s*(?:years?|yrs?)?\s*(?:to|and|-|–)\s*(\d{2})/i);
  if (ageMatch) {
    const a1 = Number(ageMatch[1]); const a2 = Number(ageMatch[2]);
    if (a1 >= 0 && a2 > a1 && a2 <= 100) { out.min_age = a1; out.max_age = a2; }
  }

  // 6. Dates
  const normDate = (dStr) => {
    const s = String(dStr || '').trim();
    let dm = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (dm) return `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`;
    dm = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (dm) {
      const dd = Number(dm[1]); const mm = Number(dm[2]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return `${dm[3]}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    return '';
  };
  const startMatch = text.match(/(?:opening\s+date|start\s+date|commencement|apply\s+from)[^0-9]{0,40}(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i);
  if (startMatch) out.application_start_date = normDate(startMatch[1]);
  const lastMatch = text.match(/(?:last\s+date|closing\s+date|apply\s+upto|submission\s+ends)[^0-9]{0,40}(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i);
  if (lastMatch) out.last_date = normDate(lastMatch[1]);

  // 7. Toll-free Helpline
  const helpMatch = text.match(/(?:helpline|toll[\s-]?free|call\s+centre)[^0-9]{0,25}((?:1800|14678|155335|1967|104)[0-9\-\s]{0,14})/i);
  if (helpMatch) out.helpline_number = helpMatch[1].replace(/\s+/g, '').trim().slice(0, 32);

  // 8. Official .gov.in / .nic.in URL
  const urlRe = /https?:\/\/[a-z0-9.-]+\.(?:gov\.in|nic\.in|odisha\.gov\.in)(?:\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?/gi;
  const urls = [];
  let um;
  while ((um = urlRe.exec(text)) !== null && urls.length < 4) {
    const u = um[0].replace(/[.,;)\]]+$/, '').replace(/^http:\/\//i, 'https://');
    if (!urls.includes(u)) urls.push(u);
  }
  if (urls.length) {
    out.official_apply_url = urls[0];
    try { out.official_portal_url = new URL(urls[0]).origin + '/'; } catch {}
  }

  // 9. NPCI DBT detection
  if (/\b(?:NPCI|Aadhaar[\s-]?seeded|DBT\s+enabled|Direct\s+Benefit\s+Transfer)\b/i.test(text)) {
    out.npci_seeding_required = 1;
  }

  return out;
}

// ============================================================================
// ADMIN: 3-LAYER SCHEME TAXONOMY CRUD (/api/admin/schemes/taxonomy)
// ============================================================================
export async function handleSchemesTaxonomyAdmin(request, env, actor, nodeId, action) {
  const db = env.DB;
  await ensureSchemesPublishingSchema(db);
  const method = request.method;

  if (!nodeId && method === 'GET') {
    const { list } = await loadSchemeTaxonomyMap(db);
    const { results: counts } = await db.prepare(
      `SELECT category_l1_id, category_l2_id, category_l3_id,
              COUNT(*) AS total_count,
              SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) AS published_count
       FROM scheme_articles
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
      total_schemes: (countMap.get(n.id) || { total: 0 }).total,
      published_schemes: (countMap.get(n.id) || { published: 0 }).published
    }));
    return json({ ok: true, nodes: enriched, tree: buildSchemeTaxonomyTree(enriched) });
  }

  if (!nodeId && method === 'POST') {
    const body = await readJson(request, 20000);
    const level = Number(body.level);
    if (![1, 2, 3].includes(level)) throw validationError({ level: 'Level must be 1, 2, or 3.' });
    const titleEn = str(body.title_en, 140);
    if (!titleEn) throw validationError({ title_en: 'English title is required.' });
    const parentId = level === 1 ? null : str(body.parent_id, 80) || null;
    if (level > 1 && !parentId) throw validationError({ parent_id: 'Parent category is required for Level 2 and Level 3.' });
    if (parentId) {
      const parent = await db.prepare('SELECT id, level FROM scheme_taxonomy_nodes WHERE id = ?').bind(parentId).first();
      if (!parent || Number(parent.level) !== level - 1) {
        throw validationError({ parent_id: `Parent must be an existing Level ${level - 1} node.` });
      }
    }
    const slug = slugify(body.slug || titleEn, `scheme-cat-l${level}`);
    const maxRow = await db.prepare(
      "SELECT COALESCE(MAX(sort_order), 0) AS m FROM scheme_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ?"
    ).bind(level, parentId || '').first().catch(() => ({ m: 0 }));
    const sortOrder = body.sort_order !== undefined && body.sort_order !== '' ? intOrZero(body.sort_order, 0, 100000) : Number((maxRow && maxRow.m) || 0) + 10;
    const id = `stax_l${level}_${Date.now().toString(36)}_${randomHex(3)}`;
    await db.prepare(
      `INSERT INTO scheme_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id, level, parentId, slug, titleEn, str(body.title_or, 160),
      str(body.subtitle_en, 240), str(body.subtitle_or, 240),
      str(body.icon, 24), str(body.accent_variant || 'emerald', 32),
      sortOrder, boolInt(body.is_published, 1)
    ).run();
    const created = formatTaxonomyNode(await db.prepare('SELECT * FROM scheme_taxonomy_nodes WHERE id = ?').bind(id).first());
    await audit(env, request, actor, 'schemes_taxonomy.create', 'scheme_taxonomy_nodes', id, { level, parent_id: parentId, title_en: titleEn });
    await invalidateSchemesCaches(request);
    const res = json({ ok: true, node: created }, 201);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && action === 'move' && method === 'POST') {
    const body = await readJson(request, 5000);
    const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
    if (!dir) throw validationError({ direction: 'direction must be up or down.' });
    const node = await db.prepare('SELECT * FROM scheme_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!node) throw new HttpError(404, 'NOT_FOUND', 'Scheme taxonomy node not found');
    const { results: siblings } = await db.prepare(
      "SELECT id FROM scheme_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ? ORDER BY sort_order ASC, title_en ASC"
    ).bind(node.level, node.parent_id || '').all();
    const ids = (siblings || []).map(s => s.id);
    const idx = ids.indexOf(nodeId);
    const swapIdx = idx + dir;
    if (idx >= 0 && swapIdx >= 0 && swapIdx < ids.length) {
      [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
      await db.batch(ids.map((rid, n) => db.prepare("UPDATE scheme_taxonomy_nodes SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)));
    }
    await audit(env, request, actor, 'schemes_taxonomy.reorder', 'scheme_taxonomy_nodes', nodeId, { direction: body.direction });
    await invalidateSchemesCaches(request);
    const res = json({ ok: true, id: nodeId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM scheme_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme taxonomy node not found');
    const body = await readJson(request, 20000);
    const fields = [];
    const vals = [];
    const set = (c, v) => { fields.push(`${c} = ?`); vals.push(v); };
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
    if (body.accent_variant !== undefined) set('accent_variant', str(body.accent_variant || 'emerald', 32));
    if (body.sort_order !== undefined) set('sort_order', intOrZero(body.sort_order, 0, 100000));
    if (body.is_published !== undefined) set('is_published', boolInt(body.is_published, 1));
    if (fields.length) {
      await db.prepare(`UPDATE scheme_taxonomy_nodes SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, nodeId).run();
    }
    const updated = formatTaxonomyNode(await db.prepare('SELECT * FROM scheme_taxonomy_nodes WHERE id = ?').bind(nodeId).first());
    await audit(env, request, actor, 'schemes_taxonomy.update', 'scheme_taxonomy_nodes', nodeId, {});
    await invalidateSchemesCaches(request);
    const res = json({ ok: true, node: updated });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT * FROM scheme_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme taxonomy node not found');
    const { results: childL2 } = await db.prepare('SELECT id FROM scheme_taxonomy_nodes WHERE parent_id = ?').bind(nodeId).all().catch(() => ({ results: [] }));
    for (const c of (childL2 || [])) {
      await db.prepare('DELETE FROM scheme_taxonomy_nodes WHERE parent_id = ?').bind(c.id).run().catch(() => {});
    }
    await db.prepare('DELETE FROM scheme_taxonomy_nodes WHERE parent_id = ?').bind(nodeId).run().catch(() => {});
    await db.prepare('DELETE FROM scheme_taxonomy_nodes WHERE id = ?').bind(nodeId).run();
    await audit(env, request, actor, 'schemes_taxonomy.delete', 'scheme_taxonomy_nodes', nodeId, { title_en: existing.title_en });
    await invalidateSchemesCaches(request);
    const res = json({ ok: true, deleted: nodeId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown schemes taxonomy route');
}

// ============================================================================
// ADMIN: DIRECT R2 UPLOAD + PDF-TO-SCHEME AUTO-DRAFT (/api/admin/schemes/upload)
// ============================================================================
function sniffMime(b) {
  const eq = (off, sig) => sig.every((x, i) => b[off + i] === x);
  if (b.length >= 3 && eq(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (b.length >= 8 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (b.length >= 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  if (b.length >= 5 && eq(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

export async function handleSchemesMediaUpload(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 MEDIA storage is not configured');
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use multipart/form-data');

  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Invalid multipart payload'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw validationError({ file: 'Select an image or PDF file to upload.' });
  const purpose = str(form.get('purpose') || 'scheme-asset', 40).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'scheme-asset';
  if (file.size <= 0) throw validationError({ file: 'Uploaded file is empty.' });

  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const sniffed = sniffMime(bytes.slice(0, 16));
  const spec = ALLOWED_UPLOAD_MIME[sniffed];
  if (!spec || !sniffed) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP images and PDF files are allowed.');
  if (file.size > spec.max) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `File exceeds ${Math.round(spec.max / MB)} MB limit.`);

  const baseName = slugify((file.name || purpose).replace(/\.[^.]+$/, ''), purpose).slice(0, 48);
  const key = `schemes-publishing/${Date.now()}-${baseName}-${randomHex(3)}.${spec.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: sniffed } });
  const publicUrl = `/api/media/${key}`;

  try {
    await env.DB.prepare(
      `INSERT INTO media_files (id, original_filename, title_en, file_category, mime_type, file_size_bytes, r2_key, public_url, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind('mf_' + randomHex(6), str(file.name || key, 140), str(file.name || purpose, 140), spec.kind, sniffed, file.size, key, publicUrl, actor.email || actor.userId).run();
  } catch { /* non-fatal */ }

  const extractedDraft = spec.kind === 'pdf' ? extractSchemeMetadataFromPdfBytes(bytes) : null;
  await audit(env, request, actor, 'schemes_media.upload', 'media', key, { purpose, kind: spec.kind, size: file.size });
  return json({
    ok: true, key, url: publicUrl, kind: spec.kind, mime_type: sniffed,
    size_bytes: file.size, filename: str(file.name || key, 160), extracted_draft: extractedDraft
  }, 201);
}

// ============================================================================
// ADMIN: SCHEME ARTICLES CRUD, PREVIEW TOKEN & REVISION ROLLBACK
// ============================================================================
function normalizeSchemePayload(body, existing = null) {
  const errors = {};
  const titleEn = body.title_en !== undefined ? str(body.title_en, 240) : (existing ? existing.title_en : '');
  if (!titleEn) errors.title_en = 'English scheme title is required.';

  const slug = body.slug !== undefined
    ? slugify(body.slug || titleEn, 'scheme-' + Date.now().toString(36))
    : (existing ? existing.slug : slugify(titleEn, 'scheme-' + Date.now().toString(36)));

  const rawStatus = body.scheme_status !== undefined ? str(body.scheme_status, 24).toLowerCase() : (existing ? existing.scheme_status : 'active');
  const schemeStatus = SCHEME_STATUSES.includes(rawStatus) ? rawStatus : 'active';

  const urlVal = (key, allowRel) => {
    if (body[key] === undefined) return existing ? String(existing[key] || '') : '';
    try { return safeUrl(body[key], allowRel); } catch (e) { errors[key] = e.message; return ''; }
  };

  const officialApplyUrl = urlVal('official_apply_url', false);
  const officialPortalUrl = urlVal('official_portal_url', false);
  const prerequisiteOtrUrl = urlVal('prerequisite_otr_url', false);
  const grievanceUrl = urlVal('grievance_url', false);
  const trackStatusUrl = urlVal('track_status_url', false);
  const guidelinesPdfUrl = urlVal('guidelines_pdf_url', true);
  const applicationFormPdfUrl = urlVal('application_form_pdf_url', true);
  const coverImageUrl = urlVal('cover_image_url', true);

  if (Object.keys(errors).length) throw validationError(errors);

  const sanitizeArr = (val, fallbackRaw) => {
    if (val === undefined) return fallbackRaw || '[]';
    return JSON.stringify(safeJsonArray(val, 80));
  };

  const pick = (k, max, def = '') => body[k] !== undefined ? str(body[k], max) : (existing ? String(existing[k] || def) : def);
  const isPub = body.is_published !== undefined ? boolInt(body.is_published, 0) : (existing ? boolInt(existing.is_published, 0) : 0);
  const publishedAt = isPub ? ((existing && existing.published_at) || nowIso()) : (existing ? existing.published_at : '');

  return {
    slug,
    category_l1_id: pick('category_l1_id', 80),
    category_l2_id: pick('category_l2_id', 80),
    category_l3_id: pick('category_l3_id', 80),
    gov_badge: pick('gov_badge', 80),
    title_en: titleEn,
    title_or: pick('title_or', 260),
    summary_en: pick('summary_en', 800),
    summary_or: pick('summary_or', 900),
    department_en: pick('department_en', 180),
    department_or: pick('department_or', 200),
    scheme_code: pick('scheme_code', 80),
    benefit_amount_summary: pick('benefit_amount_summary', 160),
    benefit_frequency: pick('benefit_frequency', 80),
    dbt_mode: pick('dbt_mode', 100),
    npci_seeding_required: body.npci_seeding_required !== undefined ? boolInt(body.npci_seeding_required, 0) : (existing ? boolInt(existing.npci_seeding_required, 0) : 0),
    prerequisite_otr_label: pick('prerequisite_otr_label', 160),
    prerequisite_otr_url: prerequisiteOtrUrl,
    target_beneficiaries: pick('target_beneficiaries', 200),
    min_age: body.min_age !== undefined ? intOrNull(body.min_age, 0, 100) : (existing ? existing.min_age : null),
    max_age: body.max_age !== undefined ? intOrNull(body.max_age, 0, 110) : (existing ? existing.max_age : null),
    gender_eligibility: pick('gender_eligibility', 40, 'All') || 'All',
    allowed_categories_json: sanitizeArr(body.allowed_categories ?? body.allowed_categories_json, existing && existing.allowed_categories_json),
    max_annual_income: body.max_annual_income !== undefined ? intOrNull(body.max_annual_income, 0, 100000000) : (existing ? existing.max_annual_income : null),
    min_qualifying_marks: body.min_qualifying_marks !== undefined ? numOrNull(body.min_qualifying_marks, 0, 100) : (existing ? existing.min_qualifying_marks : null),
    occupation_tag: pick('occupation_tag', 80),
    odisha_domicile_required: body.odisha_domicile_required !== undefined ? boolInt(body.odisha_domicile_required, 1) : (existing ? boolInt(existing.odisha_domicile_required, 1) : 1),
    renewal_type: pick('renewal_type', 60, 'Fresh & Renewal') || 'Fresh & Renewal',
    stackable_policy: pick('stackable_policy', 240),
    application_mode: pick('application_mode', 80, 'Online Portal') || 'Online Portal',
    application_start_date: pick('application_start_date', 32),
    last_date: pick('last_date', 32),
    institute_verification_date: pick('institute_verification_date', 32),
    dwo_sanction_date: pick('dwo_sanction_date', 32),
    is_ongoing: body.is_ongoing !== undefined ? boolInt(body.is_ongoing, 0) : (existing ? boolInt(existing.is_ongoing, 0) : 0),
    helpline_number: pick('helpline_number', 60),
    grievance_url: grievanceUrl,
    track_status_url: trackStatusUrl,
    cover_image_url: coverImageUrl,
    cover_image_caption: pick('cover_image_caption', 240),
    article_body_en: pick('article_body_en', 40000),
    article_body_or: pick('article_body_or', 40000),
    benefits_breakdown_json: sanitizeArr(body.benefits_breakdown ?? body.benefits_breakdown_json, existing && existing.benefits_breakdown_json),
    eligibility_rules_json: sanitizeArr(body.eligibility_rules ?? body.eligibility_rules_json, existing && existing.eligibility_rules_json),
    required_documents_json: sanitizeArr(body.required_documents ?? body.required_documents_json, existing && existing.required_documents_json),
    application_steps_json: sanitizeArr(body.application_steps ?? body.application_steps_json, existing && existing.application_steps_json),
    important_dates_json: sanitizeArr(body.important_dates ?? body.important_dates_json, existing && existing.important_dates_json),
    faq_items_json: sanitizeArr(body.faq_items ?? body.faq_items_json, existing && existing.faq_items_json),
    official_apply_url: officialApplyUrl,
    official_portal_url: officialPortalUrl,
    guidelines_pdf_url: guidelinesPdfUrl,
    application_form_pdf_url: applicationFormPdfUrl,
    pdf_index_bookmarks_json: sanitizeArr(body.pdf_index_bookmarks ?? body.pdf_index_bookmarks_json, existing && existing.pdf_index_bookmarks_json),
    extra_attachments_json: sanitizeArr(body.extra_attachments ?? body.extra_attachments_json, existing && existing.extra_attachments_json),
    scheme_status: schemeStatus,
    amendment_note_en: pick('amendment_note_en', 1000),
    amendment_note_or: pick('amendment_note_or', 1000),
    scheduled_publish_at: pick('scheduled_publish_at', 40),
    is_featured: body.is_featured !== undefined ? boolInt(body.is_featured, 0) : (existing ? boolInt(existing.is_featured, 0) : 0),
    is_published: isPub,
    published_at: publishedAt
  };
}

async function saveSchemeRevision(db, articleId, snapshotRow, summary, actorEmail) {
  try {
    const revRow = await db.prepare('SELECT COALESCE(MAX(revision_number), 0) AS m FROM scheme_article_revisions WHERE article_id = ?').bind(articleId).first();
    const nextNum = Number((revRow && revRow.m) || 0) + 1;
    const revId = 'srev_' + Date.now().toString(36) + '_' + randomHex(3);
    const snap = { ...snapshotRow };
    delete snap.preview_token;
    delete snap.preview_expires_at;
    await db.prepare(
      `INSERT INTO scheme_article_revisions (id, article_id, revision_number, change_summary, snapshot_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(revId, articleId, nextNum, str(summary || `Revision #${nextNum}`, 240), JSON.stringify(snap), str(actorEmail || 'staff', 120)).run();
    return nextNum;
  } catch {
    return 1;
  }
}

export async function handleSchemesArticlesAdmin(request, env, actor, articleId, action) {
  const db = env.DB;
  await ensureSchemesPublishingSchema(db);
  await publishDueScheduledSchemes(db);
  const method = request.method;

  if (!articleId && method === 'GET') {
    const url = new URL(request.url);
    const l1 = str(url.searchParams.get('l1'), 80);
    const l2 = str(url.searchParams.get('l2'), 80);
    const l3 = str(url.searchParams.get('l3'), 80);
    const renewal = str(url.searchParams.get('renewal'), 40).toLowerCase();
    const schemeStatus = str(url.searchParams.get('scheme_status'), 32).toLowerCase();
    const status = str(url.searchParams.get('status'), 24).toLowerCase();
    const q = str(url.searchParams.get('q') || url.searchParams.get('search'), 120).toLowerCase();

    const [{ map: taxMap, list: taxList }, allRes] = await Promise.all([
      loadSchemeTaxonomyMap(db),
      db.prepare('SELECT * FROM scheme_articles ORDER BY is_featured DESC, updated_at DESC').all().catch(() => ({ results: [] }))
    ]);
    const allItems = (allRes.results || []).map(r => formatSchemeArticle(r, taxMap, true));

    const kpis = {
      total_schemes: allItems.length,
      published_live: allItems.filter(a => a.is_published === 1).length,
      scheduled_or_draft: allItems.filter(a => a.is_published === 0).length,
      active_or_ongoing: allItems.filter(a => a.is_published === 1 && !a.is_expired).length,
      total_views: allItems.reduce((s, a) => s + Number(a.views_count || 0), 0),
      total_apply_clicks: allItems.reduce((s, a) => s + Number(a.apply_clicks_count || 0), 0),
      total_pdf_downloads: allItems.reduce((s, a) => s + Number(a.pdf_downloads_count || 0), 0),
      total_bookmarks: allItems.reduce((s, a) => s + Number(a.bookmarks_count || 0), 0)
    };

    const filtered = allItems.filter(a => {
      if (l1 && a.category_l1_id !== l1) return false;
      if (l2 && a.category_l2_id !== l2) return false;
      if (l3 && a.category_l3_id !== l3) return false;
      if (renewal && !a.renewal_type.toLowerCase().includes(renewal)) return false;
      if (schemeStatus && a.scheme_status.toLowerCase() !== schemeStatus) return false;
      if (status && a.publication_status !== status) return false;
      if (q) {
        const hay = `${a.title_en} ${a.title_or} ${a.department_en} ${a.scheme_code} ${a.benefit_amount_summary} ${a.target_beneficiaries} ${a.slug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return json({ ok: true, kpis, items: filtered, taxonomy_nodes: taxList, taxonomy_tree: buildSchemeTaxonomyTree(taxList) });
  }

  if (!articleId && method === 'POST') {
    const body = await readJson(request, 240000);
    const data = normalizeSchemePayload(body, null);
    let finalSlug = data.slug;
    const conflict = await db.prepare('SELECT id FROM scheme_articles WHERE slug = ?').bind(finalSlug).first().catch(() => null);
    if (conflict) finalSlug = `${finalSlug}-${randomHex(2)}`;

    const id = 'sart_' + Date.now().toString(36) + '_' + randomHex(3);
    await db.prepare(
      `INSERT INTO scheme_articles (
        id, slug, category_l1_id, category_l2_id, category_l3_id, gov_badge,
        title_en, title_or, summary_en, summary_or, department_en, department_or, scheme_code,
        benefit_amount_summary, benefit_frequency, dbt_mode, npci_seeding_required,
        prerequisite_otr_label, prerequisite_otr_url, target_beneficiaries,
        min_age, max_age, gender_eligibility, allowed_categories_json, max_annual_income,
        min_qualifying_marks, occupation_tag, odisha_domicile_required, renewal_type,
        stackable_policy, application_mode, application_start_date, last_date,
        institute_verification_date, dwo_sanction_date, is_ongoing,
        helpline_number, grievance_url, track_status_url,
        cover_image_url, cover_image_caption, article_body_en, article_body_or,
        benefits_breakdown_json, eligibility_rules_json, required_documents_json,
        application_steps_json, important_dates_json, faq_items_json,
        official_apply_url, official_portal_url, guidelines_pdf_url, application_form_pdf_url,
        pdf_index_bookmarks_json, extra_attachments_json, scheme_status,
        amendment_note_en, amendment_note_or, scheduled_publish_at,
        is_featured, is_published, published_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, datetime('now')
      )`
    ).bind(
      id, finalSlug, data.category_l1_id, data.category_l2_id, data.category_l3_id, data.gov_badge,
      data.title_en, data.title_or, data.summary_en, data.summary_or, data.department_en, data.department_or, data.scheme_code,
      data.benefit_amount_summary, data.benefit_frequency, data.dbt_mode, data.npci_seeding_required,
      data.prerequisite_otr_label, data.prerequisite_otr_url, data.target_beneficiaries,
      data.min_age, data.max_age, data.gender_eligibility, data.allowed_categories_json, data.max_annual_income,
      data.min_qualifying_marks, data.occupation_tag, data.odisha_domicile_required, data.renewal_type,
      data.stackable_policy, data.application_mode, data.application_start_date, data.last_date,
      data.institute_verification_date, data.dwo_sanction_date, data.is_ongoing,
      data.helpline_number, data.grievance_url, data.track_status_url,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.benefits_breakdown_json, data.eligibility_rules_json, data.required_documents_json,
      data.application_steps_json, data.important_dates_json, data.faq_items_json,
      data.official_apply_url, data.official_portal_url, data.guidelines_pdf_url, data.application_form_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json, data.scheme_status,
      data.amendment_note_en, data.amendment_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_published, data.published_at
    ).run();

    const row = await db.prepare('SELECT * FROM scheme_articles WHERE id = ?').bind(id).first();
    await saveSchemeRevision(db, id, row || data, body.change_summary || (data.is_published ? 'Initial publish' : 'Initial draft'), actor.email);
    const { map: taxMap } = await loadSchemeTaxonomyMap(db);
    await audit(env, request, actor, data.is_published ? 'schemes_article.publish' : 'schemes_article.create', 'scheme_articles', id, { slug: finalSlug, title_en: data.title_en });
    await invalidateSchemesCaches(request, finalSlug);
    const res = json({ ok: true, item: formatSchemeArticle(row, taxMap, true) }, 201);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // POST /api/admin/schemes/:id/preview-token OR /api/admin/schemes/articles/:id/preview-token
  if (articleId && action === 'preview-token' && method === 'POST') {
    const existing = await db.prepare('SELECT * FROM scheme_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme article not found');
    const token = randomHex(32);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await db.prepare(
      "UPDATE scheme_articles SET preview_token = ?, preview_expires_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(token, expiresAt, articleId).run();
    await audit(env, request, actor, 'schemes_article.preview_token', 'scheme_articles', articleId, { slug: existing.slug, expires_at: expiresAt });
    return json({
      ok: true,
      article_id: articleId,
      slug: existing.slug,
      preview_token: token,
      preview_expires_at: expiresAt,
      preview_url: `/schemes/?slug=${encodeURIComponent(existing.slug)}&preview_token=${encodeURIComponent(token)}`
    }, 200, { 'Cache-Control': 'no-store' });
  }

  if (articleId && action === 'revisions' && method === 'GET') {
    const { results } = await db.prepare(
      'SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM scheme_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 30'
    ).bind(articleId).all().catch(() => ({ results: [] }));
    return json({ ok: true, revisions: results || [] });
  }

  if (articleId && action === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = str(body.revision_id, 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required.' });
    const rev = await db.prepare('SELECT * FROM scheme_article_revisions WHERE id = ? AND article_id = ?').bind(revId, articleId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    let snap = {};
    try { snap = JSON.parse(rev.snapshot_json || '{}'); } catch { throw new HttpError(500, 'CORRUPT_REVISION', 'Invalid snapshot JSON'); }
    const existing = await db.prepare('SELECT * FROM scheme_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme article not found');
    const data = normalizeSchemePayload(snap, existing);
    await db.prepare(
      `UPDATE scheme_articles SET
        category_l1_id = ?, category_l2_id = ?, category_l3_id = ?, gov_badge = ?,
        title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, department_en = ?, department_or = ?, scheme_code = ?,
        benefit_amount_summary = ?, benefit_frequency = ?, dbt_mode = ?, npci_seeding_required = ?,
        prerequisite_otr_label = ?, prerequisite_otr_url = ?, target_beneficiaries = ?,
        min_age = ?, max_age = ?, gender_eligibility = ?, allowed_categories_json = ?, max_annual_income = ?,
        min_qualifying_marks = ?, occupation_tag = ?, odisha_domicile_required = ?, renewal_type = ?,
        stackable_policy = ?, application_mode = ?, application_start_date = ?, last_date = ?,
        institute_verification_date = ?, dwo_sanction_date = ?, is_ongoing = ?,
        helpline_number = ?, grievance_url = ?, track_status_url = ?,
        cover_image_url = ?, cover_image_caption = ?, article_body_en = ?, article_body_or = ?,
        benefits_breakdown_json = ?, eligibility_rules_json = ?, required_documents_json = ?,
        application_steps_json = ?, important_dates_json = ?, faq_items_json = ?,
        official_apply_url = ?, official_portal_url = ?, guidelines_pdf_url = ?, application_form_pdf_url = ?,
        pdf_index_bookmarks_json = ?, extra_attachments_json = ?, scheme_status = ?,
        amendment_note_en = ?, amendment_note_or = ?, scheduled_publish_at = ?,
        is_featured = ?, is_published = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      data.category_l1_id, data.category_l2_id, data.category_l3_id, data.gov_badge,
      data.title_en, data.title_or, data.summary_en, data.summary_or, data.department_en, data.department_or, data.scheme_code,
      data.benefit_amount_summary, data.benefit_frequency, data.dbt_mode, data.npci_seeding_required,
      data.prerequisite_otr_label, data.prerequisite_otr_url, data.target_beneficiaries,
      data.min_age, data.max_age, data.gender_eligibility, data.allowed_categories_json, data.max_annual_income,
      data.min_qualifying_marks, data.occupation_tag, data.odisha_domicile_required, data.renewal_type,
      data.stackable_policy, data.application_mode, data.application_start_date, data.last_date,
      data.institute_verification_date, data.dwo_sanction_date, data.is_ongoing,
      data.helpline_number, data.grievance_url, data.track_status_url,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.benefits_breakdown_json, data.eligibility_rules_json, data.required_documents_json,
      data.application_steps_json, data.important_dates_json, data.faq_items_json,
      data.official_apply_url, data.official_portal_url, data.guidelines_pdf_url, data.application_form_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json, data.scheme_status,
      data.amendment_note_en, data.amendment_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_published, articleId
    ).run();
    const row = await db.prepare('SELECT * FROM scheme_articles WHERE id = ?').bind(articleId).first();
    await saveSchemeRevision(db, articleId, row, `Restored from Revision #${rev.revision_number}`, actor.email);
    const { map: taxMap } = await loadSchemeTaxonomyMap(db);
    await audit(env, request, actor, 'schemes_article.rollback', 'scheme_articles', articleId, { restored_revision: rev.revision_number });
    await invalidateSchemesCaches(request, existing.slug);
    const res = json({ ok: true, item: formatSchemeArticle(row, taxMap, true) });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (articleId && !action && method === 'GET') {
    const row = await db.prepare('SELECT * FROM scheme_articles WHERE id = ?').bind(articleId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Scheme article not found');
    const [{ map: taxMap }, revRes] = await Promise.all([
      loadSchemeTaxonomyMap(db),
      db.prepare('SELECT id, article_id, revision_number, change_summary, created_by, created_at FROM scheme_article_revisions WHERE article_id = ? ORDER BY revision_number DESC LIMIT 20').bind(articleId).all().catch(() => ({ results: [] }))
    ]);
    return json({ ok: true, item: formatSchemeArticle(row, taxMap, true), revisions: revRes.results || [] });
  }

  if (articleId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM scheme_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme article not found');
    const body = await readJson(request, 240000);
    const data = normalizeSchemePayload(body, existing);
    let finalSlug = data.slug;
    if (finalSlug !== existing.slug) {
      const conflict = await db.prepare('SELECT id FROM scheme_articles WHERE slug = ? AND id != ?').bind(finalSlug, articleId).first().catch(() => null);
      if (conflict) throw validationError({ slug: 'Another scheme article already uses this slug.' });
    }
    await db.prepare(
      `UPDATE scheme_articles SET
        slug = ?, category_l1_id = ?, category_l2_id = ?, category_l3_id = ?, gov_badge = ?,
        title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, department_en = ?, department_or = ?, scheme_code = ?,
        benefit_amount_summary = ?, benefit_frequency = ?, dbt_mode = ?, npci_seeding_required = ?,
        prerequisite_otr_label = ?, prerequisite_otr_url = ?, target_beneficiaries = ?,
        min_age = ?, max_age = ?, gender_eligibility = ?, allowed_categories_json = ?, max_annual_income = ?,
        min_qualifying_marks = ?, occupation_tag = ?, odisha_domicile_required = ?, renewal_type = ?,
        stackable_policy = ?, application_mode = ?, application_start_date = ?, last_date = ?,
        institute_verification_date = ?, dwo_sanction_date = ?, is_ongoing = ?,
        helpline_number = ?, grievance_url = ?, track_status_url = ?,
        cover_image_url = ?, cover_image_caption = ?, article_body_en = ?, article_body_or = ?,
        benefits_breakdown_json = ?, eligibility_rules_json = ?, required_documents_json = ?,
        application_steps_json = ?, important_dates_json = ?, faq_items_json = ?,
        official_apply_url = ?, official_portal_url = ?, guidelines_pdf_url = ?, application_form_pdf_url = ?,
        pdf_index_bookmarks_json = ?, extra_attachments_json = ?, scheme_status = ?,
        amendment_note_en = ?, amendment_note_or = ?, scheduled_publish_at = ?,
        is_featured = ?, is_published = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      finalSlug, data.category_l1_id, data.category_l2_id, data.category_l3_id, data.gov_badge,
      data.title_en, data.title_or, data.summary_en, data.summary_or, data.department_en, data.department_or, data.scheme_code,
      data.benefit_amount_summary, data.benefit_frequency, data.dbt_mode, data.npci_seeding_required,
      data.prerequisite_otr_label, data.prerequisite_otr_url, data.target_beneficiaries,
      data.min_age, data.max_age, data.gender_eligibility, data.allowed_categories_json, data.max_annual_income,
      data.min_qualifying_marks, data.occupation_tag, data.odisha_domicile_required, data.renewal_type,
      data.stackable_policy, data.application_mode, data.application_start_date, data.last_date,
      data.institute_verification_date, data.dwo_sanction_date, data.is_ongoing,
      data.helpline_number, data.grievance_url, data.track_status_url,
      data.cover_image_url, data.cover_image_caption, data.article_body_en, data.article_body_or,
      data.benefits_breakdown_json, data.eligibility_rules_json, data.required_documents_json,
      data.application_steps_json, data.important_dates_json, data.faq_items_json,
      data.official_apply_url, data.official_portal_url, data.guidelines_pdf_url, data.application_form_pdf_url,
      data.pdf_index_bookmarks_json, data.extra_attachments_json, data.scheme_status,
      data.amendment_note_en, data.amendment_note_or, data.scheduled_publish_at,
      data.is_featured, data.is_published, data.published_at, articleId
    ).run();

    const row = await db.prepare('SELECT * FROM scheme_articles WHERE id = ?').bind(articleId).first();
    await saveSchemeRevision(db, articleId, row || data, body.change_summary || 'Editorial update', actor.email);
    const { map: taxMap } = await loadSchemeTaxonomyMap(db);
    await audit(env, request, actor, data.is_published ? 'schemes_article.publish' : 'schemes_article.update', 'scheme_articles', articleId, { slug: finalSlug });
    await invalidateSchemesCaches(request, finalSlug);
    const res = json({ ok: true, item: formatSchemeArticle(row, taxMap, true) });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (articleId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT id, slug, title_en FROM scheme_articles WHERE id = ?').bind(articleId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme article not found');
    await db.prepare('DELETE FROM scheme_article_revisions WHERE article_id = ?').bind(articleId).run().catch(() => {});
    await db.prepare('DELETE FROM scheme_articles WHERE id = ?').bind(articleId).run();
    await audit(env, request, actor, 'schemes_article.delete', 'scheme_articles', articleId, { slug: existing.slug, title_en: existing.title_en });
    await invalidateSchemesCaches(request, existing.slug);
    const res = json({ ok: true, deleted: articleId });
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown schemes article route');
}

// ============================================================================
// PUBLIC ENDPOINTS: /api/public/schemes/tree, /api/public/schemes, /api/public/schemes/article, /api/public/schemes/telemetry
// ============================================================================
export async function handlePublicSchemesTreeApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, tree: [], nodes: [] }, 200, { 'Cache-Control': 'no-store' });
  await ensureSchemesPublishingSchema(env.DB);
  await publishDueScheduledSchemes(env.DB);

  const [{ results: rawNodes }, { results: pubArticles }] = await Promise.all([
    env.DB.prepare('SELECT * FROM scheme_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC').all().catch(() => ({ results: [] })),
    env.DB.prepare('SELECT category_l1_id, category_l2_id, category_l3_id FROM scheme_articles WHERE is_published = 1').all().catch(() => ({ results: [] }))
  ]);

  const counts = new Map();
  const inc = (id) => { if (id) counts.set(id, (counts.get(id) || 0) + 1); };
  (pubArticles || []).forEach(a => { inc(a.category_l1_id); inc(a.category_l2_id); inc(a.category_l3_id); });

  const nodes = (rawNodes || []).map(r => {
    const n = formatTaxonomyNode(r);
    return { ...n, published_schemes_count: counts.get(n.id) || 0 };
  });

  return json({
    ok: true,
    total_published_schemes: (pubArticles || []).length,
    nodes,
    tree: buildSchemeTaxonomyTree(nodes)
  }, 200, { 'Cache-Control': PUBLIC_CACHE });
}

export async function handlePublicSchemesListApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, items: [], total: 0 }, 200, { 'Cache-Control': 'no-store' });
  await ensureSchemesPublishingSchema(env.DB);
  await publishDueScheduledSchemes(env.DB);

  const url = new URL(request.url);
  const l1 = str(url.searchParams.get('l1'), 80);
  const l2 = str(url.searchParams.get('l2'), 80);
  const l3 = str(url.searchParams.get('l3'), 80);
  const beneficiary = str(url.searchParams.get('beneficiary'), 80).toLowerCase();
  const mode = str(url.searchParams.get('mode'), 80).toLowerCase();
  const renewal = str(url.searchParams.get('renewal'), 40).toLowerCase();
  const status = str(url.searchParams.get('status'), 32).toLowerCase();
  const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50));

  const [{ map: taxMap }, { results }] = await Promise.all([
    loadSchemeTaxonomyMap(env.DB),
    env.DB.prepare('SELECT * FROM scheme_articles WHERE is_published = 1 ORDER BY is_featured DESC, updated_at DESC').all().catch(() => ({ results: [] }))
  ]);

  const all = (results || []).map(r => formatSchemeArticle(r, taxMap, false));
  const modesSet = new Set();
  const occupationsSet = new Set();
  all.forEach(a => {
    if (a.application_mode) modesSet.add(a.application_mode);
    if (a.occupation_tag) occupationsSet.add(a.occupation_tag);
  });

  const filtered = all.filter(a => {
    if (l1 && a.category_l1_id !== l1 && (!a.taxonomy.l1 || a.taxonomy.l1.slug !== l1)) return false;
    if (l2 && a.category_l2_id !== l2 && (!a.taxonomy.l2 || a.taxonomy.l2.slug !== l2)) return false;
    if (l3 && a.category_l3_id !== l3 && (!a.taxonomy.l3 || a.taxonomy.l3.slug !== l3)) return false;
    if (beneficiary && !`${a.target_beneficiaries} ${a.occupation_tag} ${a.allowed_categories.join(' ')}`.toLowerCase().includes(beneficiary)) return false;
    if (mode && !a.application_mode.toLowerCase().includes(mode)) return false;
    if (renewal && !a.renewal_type.toLowerCase().includes(renewal)) return false;
    if (status) {
      if (status === 'ongoing' && !a.is_ongoing && a.scheme_status !== 'ongoing') return false;
      else if (status !== 'ongoing' && a.scheme_status.toLowerCase() !== status) return false;
    }
    if (search) {
      const hay = `${a.title_en} ${a.title_or} ${a.summary_en} ${a.department_en} ${a.scheme_code} ${a.benefit_amount_summary} ${a.target_beneficiaries} ${a.occupation_tag}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (a.is_expired !== b.is_expired) return a.is_expired ? 1 : -1;
    if (a.is_featured !== b.is_featured) return b.is_featured - a.is_featured;
    return String(b.published_at || b.updated_at).localeCompare(String(a.published_at || a.updated_at));
  });

  return json({
    ok: true,
    total: filtered.length,
    items: filtered.slice(0, limit),
    facets: { modes: [...modesSet].sort(), occupations: [...occupationsSet].sort() }
  }, 200, { 'Cache-Control': PUBLIC_CACHE });
}

export async function handlePublicSchemesArticleApi(request, env) {
  if (!env || !env.DB) return json({ error: 'Database unavailable' }, 500, { 'Cache-Control': 'no-store' });
  await ensureSchemesPublishingSchema(env.DB);
  await publishDueScheduledSchemes(env.DB);

  const url = new URL(request.url);
  const slug = str(url.searchParams.get('slug'), 160);
  const previewToken = str(url.searchParams.get('preview_token'), 160);
  if (!slug) return json({ error: 'slug query parameter is required', code: 'VALIDATION_ERROR' }, 400, { 'Cache-Control': 'no-store' });

  const row = await env.DB.prepare('SELECT * FROM scheme_articles WHERE slug = ?').bind(slug).first();
  if (!row) return json({ error: 'Scheme article not found', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'no-store' });

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
      return json({ error: 'Scheme article not found or preview link expired', code: 'NOT_FOUND' }, 404, { 'Cache-Control': 'no-store' });
    }
    isPreview = true;
  }

  const [{ map: taxMap }, { results: relRows }] = await Promise.all([
    loadSchemeTaxonomyMap(env.DB),
    env.DB.prepare(
      `SELECT * FROM scheme_articles
       WHERE is_published = 1 AND id != ?
       ORDER BY CASE WHEN category_l2_id = ? THEN 0 WHEN category_l1_id = ? THEN 1 ELSE 2 END, updated_at DESC
       LIMIT 6`
    ).bind(row.id, row.category_l2_id || '', row.category_l1_id || '').all().catch(() => ({ results: [] }))
  ]);

  const article = formatSchemeArticle(row, taxMap, false);
  const related = (relRows || []).map(r => formatSchemeArticle(r, taxMap, false)).slice(0, 3);
  const cacheHeader = isPreview || previewToken ? 'no-store' : PUBLIC_CACHE;

  return json({
    ok: true,
    is_preview: isPreview,
    preview_expires_at: previewExpiresAt,
    article,
    related_schemes: related
  }, 200, { 'Cache-Control': cacheHeader });
}

export async function handlePublicSchemesTelemetryApi(request, env) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!env || !env.DB) return json({ ok: false }, 200, { 'Cache-Control': 'no-store' });
  await ensureSchemesPublishingSchema(env.DB);
  try {
    await rateLimit(env, `schemes-tel:${clientIp(request)}`, 80, 60);
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
    await env.DB.prepare(`UPDATE scheme_articles SET ${col} = ${col} + 1 WHERE id = ?`).bind(id).run();
  } else {
    await env.DB.prepare(`UPDATE scheme_articles SET ${col} = ${col} + 1 WHERE slug = ?`).bind(slug).run();
  }
  return json({ ok: true, event }, 200, { 'Cache-Control': 'no-store' });
}
