// Educational Resources Batch 1 (v78): Modules 01-04
// 01 Digital Library | 02 Study Materials | 03 Notes & PDFs | 04 Books & References
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape } from './validate.js';
import { sniffMime } from '../api/admin/_media.js';

export const EDU_RESOURCE_TYPES = [
  'digital_library',
  'study_material',
  'notes_pdf',
  'book_reference'
];

export const EDU_STATUSES = ['draft', 'scheduled', 'published', 'archived'];
export const EDU_LANGUAGES = ['en', 'or', 'bilingual'];
export const EDU_ACCESS_TIERS = ['free', 'registered', 'featured'];
export const EDU_RELATION_TYPES = ['notes_for', 'book_for', 'syllabus_for', 'pyq_for', 'mock_for', 'related'];

const MODULE_BY_TYPE = {
  digital_library: '01',
  study_material: '02',
  notes_pdf: '03',
  book_reference: '04'
};

const MB = 1024 * 1024;
const UPLOAD_LIMIT_BYTES = 25 * MB;
const ALLOWED_UPLOAD_TYPES = {
  'application/pdf': { ext: 'pdf', kind: 'pdf', max: 25 * MB },
  'image/jpeg': { ext: 'jpg', kind: 'image', max: 10 * MB },
  'image/png': { ext: 'png', kind: 'image', max: 10 * MB },
  'image/webp': { ext: 'webp', kind: 'image', max: 10 * MB }
};

const _schemaReady = new WeakSet();

function validateSafeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

function sanitizeMarkdown(raw, maxLen = 60000) {
  if (raw === undefined || raw === null) return '';
  return String(raw)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript\s*:/gi, '')
    .trim()
    .slice(0, maxLen);
}

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseTags(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) {
      try { arr = JSON.parse(t); } catch { arr = t.split(','); }
    } else {
      arr = t ? t.split(',') : [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => cleanStr(x, 48).toLowerCase()).filter(Boolean))].slice(0, 16);
}

function sanitizeExternalLinks(raw) {
  const list = parseJsonArray(raw);
  const out = [];
  for (const entry of list.slice(0, 15)) {
    if (!entry || typeof entry !== 'object') continue;
    const label = cleanStr(entry.label || entry.title || 'Reference Link', 100);
    const url = validateSafeUrl(entry.url || '');
    if (!url) continue;
    const type = cleanStr(entry.type || 'official', 30) || 'official';
    const link_status = cleanStr(entry.link_status || 'unchecked', 20) || 'unchecked';
    out.push({ label, url, type, link_status });
  }
  return out;
}

function computeParity(row) {
  const hasEn = Boolean(String(row.title_en || '').trim() && (String(row.summary_en || '').trim() || String(row.content_md_en || '').trim()));
  const hasOr = Boolean(String(row.title_or || '').trim() && (String(row.summary_or || '').trim() || String(row.content_md_or || '').trim()));
  const hasFileOrLink = Boolean(String(row.file_url || '').trim() || parseJsonArray(row.external_links_json).length > 0);
  if (hasEn && hasOr && hasFileOrLink) return { pct: 100, label: '100%', complete: true };
  const missing = [];
  if (!hasOr) missing.push('Odia');
  if (!hasFileOrLink) missing.push('File/Link');
  if (!hasEn) missing.push('EN');
  const pct = Math.round(((hasEn ? 40 : 0) + (hasOr ? 40 : 0) + (hasFileOrLink ? 20 : 0)));
  return { pct, label: `Missing ${missing.join('/')}`, complete: false };
}

function formatResourceRow(row) {
  if (!row) return null;
  const external_links = parseJsonArray(row.external_links_json);
  const tags = parseJsonArray(row.tags_json);
  const parity = computeParity(row);
  return {
    ...row,
    offline_ready: Boolean(row.offline_ready),
    watermark_enabled: Boolean(row.watermark_enabled),
    featured: Boolean(row.featured),
    external_links,
    tags,
    parity_pct: parity.pct,
    parity_label: parity.label,
    parity_complete: parity.complete
  };
}

const STARTER_RESOURCES = [
  {
    id: 'edu-dl-bse-odia-textbook-10',
    slug: 'bse-odisha-class-10-odia-sahitya-sindhu',
    resource_type: 'digital_library',
    stage_or_class: 'Class 10 (BSE Odisha)',
    subject_name: 'Odia Literature',
    topic_name: 'Sahitya Sindhu Complete E-Book',
    exam_tag: 'HSC / OTET / OSSTET',
    title_en: 'BSE Odisha Class 10 Odia Sahitya Sindhu Digital Textbook',
    title_or: 'BSE ଓଡ଼ିଶା ଦଶମ ଶ୍ରେଣୀ ସାହିତ୍ୟ ସିନ୍ଧୁ ଡିଜିଟାଲ୍ ପାଠ୍ୟପୁସ୍ତକ',
    author_or_board: 'Board of Secondary Education (BSE), Odisha',
    publisher_or_source: 'OSEPA / Odisha State Bureau of Textbook Preparation',
    publication_year: 2026,
    edition_or_isbn: '2026 Revised Edition',
    language_code: 'bilingual',
    summary_en: 'Official digital textbook covering prose, poetry, and Odia grammar modules prescribed by BSE Odisha for Class 10 and teacher eligibility aspirants.',
    summary_or: 'ମାଧ୍ୟମିକ ଶିକ୍ଷା ପରିଷଦ (BSE) ଓଡ଼ିଶା ଦ୍ୱାରା ପ୍ରଣୀତ ଦଶମ ଶ୍ରେଣୀ ଗଦ୍ୟ, ପଦ୍ୟ ଓ ଓଡ଼ିଆ ବ୍ୟାକରଣର ସମ୍ପୂର୍ଣ୍ଣ ଡିଜିଟାଲ୍ ପାଠ୍ୟପୁସ୍ତକ।',
    content_md_en: '# BSE Class 10 Odia Textbook\n\nIncludes all chapters of **Sahitya Sindhu** with chapter-wise comprehension exercises, Sandhi, Samasa, and Alankara reference tables.',
    content_md_or: '# ଦଶମ ଶ୍ରେଣୀ ସାହିତ୍ୟ ସିନ୍ଧୁ\n\nସମସ୍ତ ଗଦ୍ୟ, ପଦ୍ୟ ଏବଂ ସନ୍ଧି, ସମାସ, ଅଳଙ୍କାର ଅଭ୍ୟାସ ପ୍ରଶ୍ନୋତ୍ତର ସହିତ।',
    file_url: '/resources/',
    external_links_json: JSON.stringify([{ label: 'BSE Odisha Official Textbooks', url: 'https://www.bseodisha.ac.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['bse-odisha', 'class-10', 'odia', 'textbook', 'otet']),
    access_tier: 'free',
    offline_ready: 1,
    status: 'published',
    featured: 1,
    page_count: 184
  },
  {
    id: 'edu-sm-opsc-oas-prelims-pack',
    slug: 'opsc-oas-prelims-gs-odisha-special-study-pack',
    resource_type: 'study_material',
    stage_or_class: 'Competitive Exams (OPSC)',
    subject_name: 'Odisha General Studies',
    topic_name: 'Odisha History, Geography & Polity',
    exam_tag: 'OPSC OAS',
    title_en: 'OPSC OAS Prelims Complete Odisha Special Study Material',
    title_or: 'OPSC OAS ପ୍ରିଲିମ୍ସ ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର ଅଧ୍ୟୟନ ସାମଗ୍ରୀ',
    author_or_board: 'CS Odisha Editorial Board',
    publisher_or_source: 'Common Sense Odisha',
    publication_year: 2026,
    edition_or_isbn: 'OAS-2026-V2',
    language_code: 'bilingual',
    summary_en: 'Structured bilingual study material covering Kalinga history, Odisha physiography, 30-district administrative profile, and state economic survey highlights.',
    summary_or: 'କଳିଙ୍ଗ ଇତିହାସ, ଓଡ଼ିଶାର ଭୂଗୋଳ, ୩୦ଟି ଜିଲ୍ଲାର ପ୍ରଶାସନିକ ତଥ୍ୟ ଏବଂ ଅର୍ଥନୈତିକ ସର୍ବେକ୍ଷଣ ଉପରେ ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ସାମଗ୍ରୀ।',
    content_md_en: '# OPSC OAS Odisha Special\n\n- Ancient & Medieval Odisha (Kalinga, Kharavela, Ganga & Gajapati Dynasties)\n- Rivers, Biosphere Reserves & Mineral Belts\n- Panchayati Raj & State Governance',
    content_md_or: '# OPSC OAS ଓଡ଼ିଶା ବିଶେଷ\n\n- ପ୍ରାଚୀନ ଓ ମଧ୍ୟଯୁଗୀୟ ଓଡ଼ିଶା ଇତିହାସ\n- ନଦୀ, ଜୈବମଣ୍ଡଳ ଓ ଖଣିଜ ସମ୍ପଦ\n- ପଞ୍ଚାୟତିରାଜ ଓ ରାଜ୍ୟ ଶାସନ ବ୍ୟବସ୍ଥା',
    file_url: '/study-library/',
    external_links_json: JSON.stringify([{ label: 'OPSC Official Portal', url: 'https://www.opsc.gov.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['opsc', 'oas', 'odisha-gk', 'prelims', 'study-material']),
    access_tier: 'free',
    offline_ready: 1,
    status: 'published',
    featured: 1,
    page_count: 96
  },
  {
    id: 'edu-np-ossc-cgl-arithmetic-notes',
    slug: 'ossc-cgl-arithmetic-di-shortcut-notes-pdf',
    resource_type: 'notes_pdf',
    stage_or_class: 'Competitive Exams (OSSC/OSSSC)',
    subject_name: 'Quantitative Aptitude',
    topic_name: 'Arithmetic & Data Interpretation Formulas',
    exam_tag: 'OSSC CGL / OSSSC RI',
    title_en: 'OSSC CGLRE & OSSSC RI/ARI Arithmetic & DI Revision Notes PDF',
    title_or: 'OSSC CGLRE ଓ OSSSC RI/ARI ଗଣିତ ଏବଂ DI ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ PDF',
    author_or_board: 'CS Odisha Quant Faculty',
    publisher_or_source: 'Common Sense Odisha',
    publication_year: 2026,
    edition_or_isbn: 'QUANT-2026',
    language_code: 'bilingual',
    summary_en: 'Printable high-yield revision PDF with percentage, ratio, profit-loss, time-work, and data interpretation shortcuts tailored to OSSC CGLRE patterns.',
    summary_or: 'OSSC CGLRE ଏବଂ OSSSC RI/ARI ପରୀକ୍ଷା ପାଇଁ ଶତକଡ଼ା, ଅନୁପାତ, ଲାଭ-କ୍ଷତି, ସମୟ-କାର୍ଯ୍ୟ ଓ DI ସୂତ୍ରର ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ।',
    content_md_en: '# Arithmetic & DI Quick Notes\n\nIncludes 45 solved model problems and ratio-to-percentage conversion tables.',
    content_md_or: '# ଗଣିତ ଓ DI ସଂକ୍ଷିପ୍ତ ନୋଟ୍ସ\n\n୪୫ଟି ସମାଧାନ ହୋଇଥିବା ଉଦାହରଣ ଏବଂ ଶତକଡ଼ା ସାରଣୀ ସହିତ।',
    file_url: '/resources/',
    external_links_json: JSON.stringify([{ label: 'OSSC Official Website', url: 'https://www.ossc.gov.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['ossc', 'osssc', 'arithmetic', 'notes-pdf', 'cgl']),
    access_tier: 'free',
    offline_ready: 1,
    watermark_enabled: 1,
    status: 'published',
    featured: 0,
    page_count: 32
  },
  {
    id: 'edu-br-chse-plus2-history-ref',
    slug: 'chse-odisha-plus2-history-reference-compendium',
    resource_type: 'book_reference',
    stage_or_class: 'Class 12 (+2 CHSE)',
    subject_name: 'History',
    topic_name: 'Indian & Odisha Freedom Movement',
    exam_tag: 'CHSE +2 Arts / UGC NET',
    title_en: 'CHSE +2 History & Freedom Struggle in Odisha Reference Book',
    title_or: 'CHSE +୨ ଇତିହାସ ଏବଂ ଓଡ଼ିଶାର ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ ସନ୍ଦର୍ଭ ପୁସ୍ତକ',
    author_or_board: 'Odisha State Bureau of Textbook Preparation & Production',
    publisher_or_source: 'CHSE Odisha Recommended Reference',
    publication_year: 2025,
    edition_or_isbn: 'ISBN 978-81-948210-4-2',
    language_code: 'bilingual',
    summary_en: 'Authoritative reference guide covering Paika Rebellion (1817), Utkal Sammilani, Quit India movement in Odisha, and 1936 Province Formation.',
    summary_or: 'ପାଇକ ବିଦ୍ରୋହ (୧୮୧୭), ଉତ୍କଳ ସମ୍ମିଳନୀ, ଓଡ଼ିଶାରେ ଭାରତ ଛାଡ଼ ଆନ୍ଦୋଳନ ଏବଂ ୧୯୩୬ ସ୍ୱତନ୍ତ୍ର ଓଡ଼ିଶା ପ୍ରଦେଶ ଗଠନର ସନ୍ଦର୍ଭ ପୁସ୍ତକ।',
    content_md_en: '# Freedom Movement in Odisha\n\nComprehensive timeline from Buxi Jagabandhu (1817) to Harekrushna Mahatab and Nabakrushna Choudhury.',
    content_md_or: '# ଓଡ଼ିଶାର ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ\n\nବକ୍ସି ଜଗବନ୍ଧୁଙ୍କଠାରୁ ହରେକୃଷ୍ଣ ମହତାବଙ୍କ ପର୍ଯ୍ୟନ୍ତ ସମ୍ପୂର୍ଣ୍ଣ ଇତିହାସ।',
    file_url: '/study-library/',
    external_links_json: JSON.stringify([{ label: 'CHSE Odisha Portal', url: 'https://chseodisha.nic.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['chse', 'plus-2', 'history', 'book-reference', 'odisha-freedom']),
    access_tier: 'free',
    offline_ready: 0,
    status: 'published',
    featured: 0,
    page_count: 240
  }
];

async function tableExists(db, name) {
  const row = await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).bind(name).first();
  return Boolean(row);
}

export async function ensureEduResourcesBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_schemaReady.has(db)) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS edu_resources (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('digital_library', 'study_material', 'notes_pdf', 'book_reference')),
      stage_or_class TEXT NOT NULL DEFAULT '',
      subject_name TEXT NOT NULL DEFAULT '',
      topic_name TEXT NOT NULL DEFAULT '',
      exam_tag TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      author_or_board TEXT NOT NULL DEFAULT '',
      publisher_or_source TEXT NOT NULL DEFAULT '',
      publication_year INTEGER,
      edition_or_isbn TEXT NOT NULL DEFAULT '',
      language_code TEXT NOT NULL DEFAULT 'bilingual' CHECK (language_code IN ('en', 'or', 'bilingual')),
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      content_md_en TEXT NOT NULL DEFAULT '',
      content_md_or TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      r2_key TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      page_count INTEGER NOT NULL DEFAULT 0,
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      access_tier TEXT NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free', 'registered', 'featured')),
      offline_ready INTEGER NOT NULL DEFAULT 0,
      watermark_enabled INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      publish_at TEXT,
      expires_at TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_resources_type_status ON edu_resources(resource_type, status)`,
    `CREATE INDEX IF NOT EXISTS idx_edu_resources_stage_subject ON edu_resources(stage_or_class, subject_name)`,
    `CREATE INDEX IF NOT EXISTS idx_edu_resources_featured ON edu_resources(featured, status)`,
    `CREATE TABLE IF NOT EXISTS edu_resource_revisions (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resource_id) REFERENCES edu_resources(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_revisions_res ON edu_resource_revisions(resource_id, version_num DESC)`,
    `CREATE TABLE IF NOT EXISTS edu_resource_links (
      id TEXT PRIMARY KEY,
      source_module TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_module TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL CHECK (relation_type IN ('notes_for', 'book_for', 'syllabus_for', 'pyq_for', 'mock_for', 'related')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_links_source ON edu_resource_links(source_module, source_id)`,
    `CREATE INDEX IF NOT EXISTS idx_edu_links_target ON edu_resource_links(target_module, target_id)`,
    `CREATE TABLE IF NOT EXISTS edu_resource_reports (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      report_type TEXT NOT NULL CHECK (report_type IN ('typo', 'broken_pdf', 'broken_link', 'outdated')),
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resource_id) REFERENCES edu_resources(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_reports_res_status ON edu_resource_reports(resource_id, status)`
  ];

  for (const sql of statements) {
    await db.prepare(sql).run();
  }

  // Clean-slate v233: auto-seeding & legacy study_library_items bridging disabled;
  // edu_resources are managed strictly via Admin Studio (/admin/).
  _schemaReady.add(db);
}

async function saveRevisionSnapshot(db, resourceRow, changeNote, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM edu_resource_revisions WHERE resource_id = ?`
  ).bind(resourceRow.id).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  const revId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO edu_resource_revisions (id, resource_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    revId,
    resourceRow.id,
    nextVer,
    JSON.stringify(resourceRow),
    cleanStr(changeNote || `Version ${nextVer}`, 200),
    cleanStr(actorEmail || 'system', 120)
  ).run();
  return { id: revId, version_num: nextVer };
}

function normalizeResourcePayload(body, existing = null) {
  const resource_type = String(body.resource_type ?? existing?.resource_type ?? '').trim();
  if (!EDU_RESOURCE_TYPES.includes(resource_type)) {
    throw validationError({ resource_type: `resource_type must be one of: ${EDU_RESOURCE_TYPES.join(', ')}` });
  }
  const title_en = cleanStr(body.title_en ?? existing?.title_en ?? '', 240);
  if (!title_en) throw validationError({ title_en: 'English title (title_en) is required' });

  const rawSlug = cleanStr(body.slug ?? existing?.slug ?? '', 120);
  const slug = slugify(rawSlug || title_en).slice(0, 110);
  if (!slug || !SLUG_RE.test(slug)) {
    throw validationError({ slug: 'Slug must contain lowercase letters, numbers, and hyphens' });
  }

  const language_code = String(body.language_code ?? existing?.language_code ?? 'bilingual').trim();
  if (!EDU_LANGUAGES.includes(language_code)) {
    throw validationError({ language_code: 'Invalid language_code' });
  }
  const access_tier = String(body.access_tier ?? existing?.access_tier ?? 'free').trim();
  if (!EDU_ACCESS_TIERS.includes(access_tier)) {
    throw validationError({ access_tier: 'Invalid access_tier' });
  }
  const status = String(body.status ?? existing?.status ?? 'draft').trim();
  if (!EDU_STATUSES.includes(status)) {
    throw validationError({ status: 'Invalid status' });
  }

  const pubYearRaw = body.publication_year ?? existing?.publication_year;
  const publication_year = pubYearRaw !== undefined && pubYearRaw !== null && String(pubYearRaw).trim() !== ''
    ? Math.max(1900, Math.min(2100, Number(pubYearRaw) || 2026))
    : null;

  const publish_at = body.publish_at !== undefined ? (cleanStr(body.publish_at, 40) || null) : (existing?.publish_at || null);
  const expires_at = body.expires_at !== undefined ? (cleanStr(body.expires_at, 40) || null) : (existing?.expires_at || null);
  if (status === 'scheduled' && !publish_at) {
    throw validationError({ publish_at: 'Scheduled items require a publish_at timestamp' });
  }

  const external_links = body.external_links !== undefined || body.external_links_json !== undefined
    ? sanitizeExternalLinks(body.external_links ?? body.external_links_json)
    : parseJsonArray(existing?.external_links_json);

  const tags = body.tags !== undefined || body.tags_json !== undefined
    ? parseTags(body.tags ?? body.tags_json)
    : parseJsonArray(existing?.tags_json);

  return {
    slug,
    resource_type,
    stage_or_class: cleanStr(body.stage_or_class ?? existing?.stage_or_class ?? '', 120),
    subject_name: cleanStr(body.subject_name ?? existing?.subject_name ?? '', 120),
    topic_name: cleanStr(body.topic_name ?? existing?.topic_name ?? '', 160),
    exam_tag: cleanStr(body.exam_tag ?? existing?.exam_tag ?? '', 120),
    title_en,
    title_or: cleanStr(body.title_or ?? existing?.title_or ?? '', 240),
    author_or_board: cleanStr(body.author_or_board ?? existing?.author_or_board ?? '', 160),
    publisher_or_source: cleanStr(body.publisher_or_source ?? existing?.publisher_or_source ?? '', 160),
    publication_year,
    edition_or_isbn: cleanStr(body.edition_or_isbn ?? existing?.edition_or_isbn ?? '', 120),
    language_code,
    summary_en: cleanStr(body.summary_en ?? existing?.summary_en ?? '', 1000),
    summary_or: cleanStr(body.summary_or ?? existing?.summary_or ?? '', 1000),
    content_md_en: sanitizeMarkdown(body.content_md_en ?? existing?.content_md_en ?? ''),
    content_md_or: sanitizeMarkdown(body.content_md_or ?? existing?.content_md_or ?? ''),
    file_url: validateSafeUrl(body.file_url ?? existing?.file_url ?? ''),
    r2_key: cleanStr(body.r2_key ?? existing?.r2_key ?? '', 240),
    cover_image_url: validateSafeUrl(body.cover_image_url ?? existing?.cover_image_url ?? ''),
    file_size_bytes: Math.max(0, Number(body.file_size_bytes ?? existing?.file_size_bytes ?? 0) || 0),
    page_count: Math.max(0, Number(body.page_count ?? existing?.page_count ?? 0) || 0),
    external_links_json: JSON.stringify(external_links),
    tags_json: JSON.stringify(tags),
    access_tier,
    offline_ready: (body.offline_ready !== undefined ? Boolean(body.offline_ready) : Boolean(existing?.offline_ready)) ? 1 : 0,
    watermark_enabled: (body.watermark_enabled !== undefined ? Boolean(body.watermark_enabled) : Boolean(existing?.watermark_enabled)) ? 1 : 0,
    status,
    publish_at,
    expires_at,
    featured: (body.featured !== undefined ? Boolean(body.featured) : Boolean(existing?.featured)) ? 1 : 0
  };
}

async function handleOverview(env) {
  const { results } = await env.DB.prepare(`SELECT * FROM edu_resources`).all();
  const rows = results || [];
  let published = 0, drafts = 0, scheduled = 0, archived = 0, parityComplete = 0, r2Bytes = 0;
  const byType = { digital_library: 0, study_material: 0, notes_pdf: 0, book_reference: 0 };
  for (const r of rows) {
    if (r.resource_type in byType) byType[r.resource_type]++;
    if (r.status === 'published') published++;
    else if (r.status === 'draft') drafts++;
    else if (r.status === 'scheduled') scheduled++;
    else if (r.status === 'archived') archived++;
    if (computeParity(r).complete) parityComplete++;
    r2Bytes += Number(r.file_size_bytes || 0);
  }
  const repRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_resource_reports WHERE status = 'open'`).first();
  const bilingualPct = rows.length ? Math.round((parityComplete / rows.length) * 100) : 100;
  return json({
    ok: true,
    total: rows.length,
    published,
    drafts,
    scheduled,
    archived,
    bilingual_pct: bilingualPct,
    r2_storage_bytes: r2Bytes,
    open_reports: Number(repRow?.n || 0),
    by_type: byType
  });
}

async function handleListResources(request, env) {
  const url = new URL(request.url);
  const resourceType = url.searchParams.get('resource_type') || '';
  const status = url.searchParams.get('status') || '';
  const stage = (url.searchParams.get('stage_or_class') || '').trim();
  const subject = (url.searchParams.get('subject_name') || '').trim();
  const tag = (url.searchParams.get('tag') || '').trim().toLowerCase();
  const lang = url.searchParams.get('language_code') || '';
  const incompleteOnly = url.searchParams.get('incomplete_only') === '1' || url.searchParams.get('incomplete_only') === 'true';
  const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 100) || 100));
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0);

  const where = ['1=1'];
  const binds = [];
  if (resourceType && EDU_RESOURCE_TYPES.includes(resourceType)) {
    where.push('resource_type = ?');
    binds.push(resourceType);
  }
  if (status && EDU_STATUSES.includes(status)) {
    where.push('status = ?');
    binds.push(status);
  }
  if (stage) {
    where.push('stage_or_class = ?');
    binds.push(stage);
  }
  if (subject) {
    where.push('subject_name = ?');
    binds.push(subject);
  }
  if (lang && EDU_LANGUAGES.includes(lang)) {
    where.push('language_code = ?');
    binds.push(lang);
  }
  if (tag) {
    where.push(`LOWER(tags_json) LIKE ? ESCAPE '\\'`);
    binds.push(`%${likeEscape(tag)}%`);
  }
  if (q) {
    const l = `%${likeEscape(q)}%`;
    where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR subject_name LIKE ? ESCAPE '\\' OR exam_tag LIKE ? ESCAPE '\\' OR tags_json LIKE ? ESCAPE '\\')`);
    binds.push(l, l, l, l, l);
  }

  const { results } = await env.DB.prepare(
    `SELECT * FROM edu_resources WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC, created_at DESC`
  ).bind(...binds).all();

  let items = (results || []).map(formatResourceRow);
  if (incompleteOnly) {
    items = items.filter(it => !it.parity_complete);
  }

  const total = items.length;
  const paged = items.slice(offset, offset + limit);

  // Facets & counts for current resource_type (or all)
  const facetBind = resourceType && EDU_RESOURCE_TYPES.includes(resourceType) ? [resourceType] : [];
  const { results: allForType } = await env.DB.prepare(
    `SELECT status, stage_or_class, subject_name, title_en, title_or, summary_en, summary_or, content_md_en, content_md_or, file_url, external_links_json
     FROM edu_resources ${facetBind.length ? 'WHERE resource_type = ?' : ''}`
  ).bind(...facetBind).all();

  const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0, incomplete: 0 };
  const stages = new Set();
  const subjects = new Set();
  for (const r of allForType || []) {
    counts.all++;
    if (r.status in counts) counts[r.status]++;
    if (!computeParity(r).complete) counts.incomplete++;
    if (r.stage_or_class) stages.add(r.stage_or_class);
    if (r.subject_name) subjects.add(r.subject_name);
  }

  return json({
    ok: true,
    items: paged,
    total,
    counts,
    facets: {
      stages: [...stages].sort(),
      subjects: [...subjects].sort()
    }
  });
}

async function handleGetResource(env, id) {
  const row = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ? OR slug = ?`).bind(id, id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Educational resource not found');
  const { results: revisions } = await env.DB.prepare(
    `SELECT id, resource_id, version_num, change_note, created_by, created_at FROM edu_resource_revisions WHERE resource_id = ? ORDER BY version_num DESC LIMIT 30`
  ).bind(row.id).all();
  const { results: interlinks } = await env.DB.prepare(
    `SELECT l.*, r.title_en AS linked_title_en, r.resource_type AS linked_resource_type
     FROM edu_resource_links l
     LEFT JOIN edu_resources r ON (r.id = CASE WHEN l.source_id = ? THEN l.target_id ELSE l.source_id END)
     WHERE l.source_id = ? OR l.target_id = ?
     ORDER BY l.created_at DESC`
  ).bind(row.id, row.id, row.id).all();
  const { results: reports } = await env.DB.prepare(
    `SELECT * FROM edu_resource_reports WHERE resource_id = ? ORDER BY created_at DESC LIMIT 20`
  ).bind(row.id).all();

  return json({
    ok: true,
    item: formatResourceRow(row),
    revisions: revisions || [],
    interlinks: interlinks || [],
    reports: reports || []
  });
}

async function handleUploadFile(request, env, actor) {
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 MEDIA binding is not configured');
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.toLowerCase().startsWith('multipart/form-data')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use multipart/form-data');
  }
  const declaredLen = Number(request.headers.get('Content-Length') || 0);
  if (declaredLen > UPLOAD_LIMIT_BYTES + MB) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'File exceeds 25 MB limit');
  }
  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Invalid multipart payload'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw validationError({ file: 'Choose a PDF or image file to upload' });

  const rawType = String(form.get('resource_type') || 'study_material').trim();
  const resourceType = EDU_RESOURCE_TYPES.includes(rawType) ? rawType : 'study_material';
  const year = new Date().getUTCFullYear();
  const declared = (file.type || '').toLowerCase();
  const spec = ALLOWED_UPLOAD_TYPES[declared];
  if (!spec) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only PDF, JPEG, PNG, and WebP files are allowed');
  }
  if (file.size === 0) throw validationError({ file: 'Uploaded file is empty' });
  if (file.size > spec.max) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `File exceeds ${Math.round(spec.max / MB)} MB limit`);
  }

  const buf = await file.arrayBuffer();
  const sniffed = sniffMime(new Uint8Array(buf.slice(0, 16)));
  if (sniffed !== declared) {
    throw new HttpError(415, 'CONTENT_MISMATCH', 'File magic bytes do not match declared MIME type');
  }

  const key = `edu-resources/${resourceType}/${year}/${crypto.randomUUID()}.${spec.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: declared } });
  const file_url = `/api/media/${key}`;

  await audit(env, request, actor, 'edu.resource.upload', 'edu_resources', key, {
    resource_type: resourceType,
    mime_type: declared,
    size_bytes: file.size
  });

  return json({
    ok: true,
    r2_key: key,
    file_url,
    file_size_bytes: file.size,
    mime_type: declared,
    kind: spec.kind
  }, 201);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsvItems(csvText) {
  const lines = String(csvText || '').replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = vals[idx] !== undefined ? vals[idx].trim() : '';
    });
    rows.push(obj);
  }
  return rows;
}

async function handleImportResources(request, env, actor) {
  const body = await readJson(request, 2_000_000);
  const dryRun = Boolean(body.dry_run);
  let rawItems = Array.isArray(body.items) ? body.items : null;
  if (!rawItems && typeof body.csv === 'string') {
    rawItems = parseCsvItems(body.csv);
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw validationError({ items: 'Provide a non-empty JSON items array or CSV payload' });
  }
  if (rawItems.length > 200) {
    throw validationError({ items: 'Maximum 200 items per bulk import batch' });
  }

  const errors = [];
  const validRows = [];
  rawItems.forEach((entry, index) => {
    try {
      const normalized = normalizeResourcePayload(entry);
      validRows.push(normalized);
    } catch (e) {
      errors.push({ row: index + 1, error: e.message || 'Validation failed' });
    }
  });

  if (dryRun) {
    return json({
      ok: errors.length === 0,
      dry_run: true,
      valid_count: validRows.length,
      error_count: errors.length,
      errors
    });
  }

  let imported = 0;
  let skipped = 0;
  const createdItems = [];
  for (const data of validRows) {
    const id = `edu-${crypto.randomUUID().slice(0, 12)}`;
    try {
      await env.DB.prepare(
        `INSERT INTO edu_resources (
          id, slug, resource_type, stage_or_class, subject_name, topic_name, exam_tag,
          title_en, title_or, author_or_board, publisher_or_source, publication_year, edition_or_isbn,
          language_code, summary_en, summary_or, content_md_en, content_md_or,
          file_url, r2_key, cover_image_url, file_size_bytes, page_count,
          external_links_json, tags_json, access_tier, offline_ready, watermark_enabled,
          status, publish_at, expires_at, featured, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, data.slug, data.resource_type, data.stage_or_class, data.subject_name, data.topic_name, data.exam_tag,
        data.title_en, data.title_or, data.author_or_board, data.publisher_or_source, data.publication_year, data.edition_or_isbn,
        data.language_code, data.summary_en, data.summary_or, data.content_md_en, data.content_md_or,
        data.file_url, data.r2_key, data.cover_image_url, data.file_size_bytes, data.page_count,
        data.external_links_json, data.tags_json, data.access_tier, data.offline_ready, data.watermark_enabled,
        data.status, data.publish_at, data.expires_at, data.featured, actor.email || actor.userId
      ).run();
      await saveRevisionSnapshot(env.DB, { id, ...data }, 'Bulk import', actor.email);
      imported++;
      createdItems.push({ id, slug: data.slug, title_en: data.title_en });
    } catch (err) {
      skipped++;
      errors.push({ slug: data.slug, error: err && err.message ? err.message : 'Insert conflict' });
    }
  }

  await audit(env, request, actor, 'edu.resource.import', 'edu_resources', null, { imported, skipped, errors: errors.length });
  return json({ ok: true, imported, skipped, errors, items: createdItems }, 201);
}

async function handleExportResources(request, env) {
  const url = new URL(request.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  const resourceType = url.searchParams.get('resource_type') || '';
  const binds = [];
  let where = '1=1';
  if (resourceType && EDU_RESOURCE_TYPES.includes(resourceType)) {
    where = 'resource_type = ?';
    binds.push(resourceType);
  }
  const { results } = await env.DB.prepare(
    `SELECT * FROM edu_resources WHERE ${where} ORDER BY updated_at DESC`
  ).bind(...binds).all();
  const items = (results || []).map(formatResourceRow);

  if (format === 'csv') {
    const cols = ['id', 'slug', 'resource_type', 'stage_or_class', 'subject_name', 'topic_name', 'exam_tag', 'title_en', 'title_or', 'author_or_board', 'language_code', 'file_url', 'status', 'offline_ready', 'featured'];
    const escCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.join(',')];
    for (const it of items) {
      lines.push(cols.map(c => escCsv(it[c])).join(','));
    }
    return new Response(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="edu-resources-export.csv"',
        'Cache-Control': 'no-store'
      }
    });
  }

  return json({ ok: true, count: items.length, items });
}

async function handleInterlinks(request, env, actor, linkId) {
  const method = request.method;
  if (method === 'GET') {
    const url = new URL(request.url);
    const sourceId = (url.searchParams.get('source_id') || '').trim();
    const { results: links } = sourceId
      ? await env.DB.prepare(
          `SELECT l.*,
                  s.title_en AS source_title_en, s.resource_type AS source_resource_type,
                  t.title_en AS target_title_en, t.resource_type AS target_resource_type
           FROM edu_resource_links l
           LEFT JOIN edu_resources s ON s.id = l.source_id
           LEFT JOIN edu_resources t ON t.id = l.target_id
           WHERE l.source_id = ? OR l.target_id = ?
           ORDER BY l.created_at DESC`
        ).bind(sourceId, sourceId).all()
      : await env.DB.prepare(
          `SELECT l.*,
                  s.title_en AS source_title_en, s.resource_type AS source_resource_type,
                  t.title_en AS target_title_en, t.resource_type AS target_resource_type
           FROM edu_resource_links l
           LEFT JOIN edu_resources s ON s.id = l.source_id
           LEFT JOIN edu_resources t ON t.id = l.target_id
           ORDER BY l.created_at DESC LIMIT 100`
        ).all();

    // Auto-match suggestions based on overlapping tags or subject_name
    let suggestions = [];
    if (sourceId) {
      const src = await env.DB.prepare(`SELECT id, subject_name, exam_tag, tags_json FROM edu_resources WHERE id = ?`).bind(sourceId).first();
      if (src) {
        const srcTags = new Set(parseJsonArray(src.tags_json).map(x => String(x).toLowerCase()));
        const { results: candidates } = await env.DB.prepare(
          `SELECT id, slug, resource_type, title_en, subject_name, exam_tag, tags_json FROM edu_resources WHERE id != ? LIMIT 100`
        ).bind(sourceId).all();
        suggestions = (candidates || [])
          .map(c => {
            const cTags = parseJsonArray(c.tags_json).map(x => String(x).toLowerCase());
            let score = 0;
            if (src.subject_name && c.subject_name === src.subject_name) score += 2;
            if (src.exam_tag && c.exam_tag && c.exam_tag === src.exam_tag) score += 2;
            for (const t of cTags) if (srcTags.has(t)) score += 1;
            return { ...c, target_module: MODULE_BY_TYPE[c.resource_type] || '01', match_score: score };
          })
          .filter(c => c.match_score > 0)
          .sort((a, b) => b.match_score - a.match_score)
          .slice(0, 8);
      }
    }
    return json({ ok: true, links: links || [], suggestions });
  }

  if (method === 'POST') {
    const body = await readJson(request, 50_000);
    const source_module = cleanStr(body.source_module || '01', 10);
    const source_id = cleanStr(body.source_id || '', 120);
    const target_module = cleanStr(body.target_module || '02', 10);
    const target_id = cleanStr(body.target_id || '', 120);
    const relation_type = cleanStr(body.relation_type || 'related', 30);
    if (!source_id || !target_id) throw validationError({ target_id: 'source_id and target_id are required' });
    if (source_id === target_id) throw validationError({ target_id: 'Cannot link a resource to itself' });
    if (!EDU_RELATION_TYPES.includes(relation_type)) throw validationError({ relation_type: 'Invalid relation_type' });

    const existing = await env.DB.prepare(
      `SELECT id FROM edu_resource_links WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)`
    ).bind(source_id, target_id, target_id, source_id).first();
    if (existing) {
      return json({ ok: true, id: existing.id, duplicate: true });
    }

    const id = `link-${crypto.randomUUID().slice(0, 12)}`;
    await env.DB.prepare(
      `INSERT INTO edu_resource_links (id, source_module, source_id, target_module, target_id, relation_type)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, source_module, source_id, target_module, target_id, relation_type).run();
    await audit(env, request, actor, 'edu.interlink.create', 'edu_resource_links', id, { source_id, target_id, relation_type });
    return json({ ok: true, id, source_module, source_id, target_module, target_id, relation_type }, 201);
  }

  if (method === 'DELETE' && linkId) {
    await env.DB.prepare(`DELETE FROM edu_resource_links WHERE id = ?`).bind(linkId).run();
    await audit(env, request, actor, 'edu.interlink.delete', 'edu_resource_links', linkId);
    return json({ ok: true, deleted: linkId });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

async function handleLinkCheck(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  const body = await readJson(request, 50_000);
  const resourceId = cleanStr(body.resource_id || '', 120);
  if (!resourceId) throw validationError({ resource_id: 'resource_id is required' });
  const row = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ?`).bind(resourceId).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Resource not found');

  const links = parseJsonArray(row.external_links_json);
  const checkedLinks = [];
  let brokenCount = 0;

  for (const link of links) {
    let statusLabel = 'ok';
    try {
      const targetUrl = validateSafeUrl(link.url);
      if (targetUrl.startsWith('/')) {
        statusLabel = 'ok';
      } else {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        try {
          const res = await fetch(targetUrl, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
          if (res.status === 404 || res.status === 503 || res.status >= 500) {
            statusLabel = String(res.status);
            brokenCount++;
          } else {
            statusLabel = 'ok';
          }
        } catch {
          statusLabel = '503';
          brokenCount++;
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {
      statusLabel = '404';
      brokenCount++;
    }
    checkedLinks.push({ ...link, link_status: statusLabel });
  }

  await env.DB.prepare(
    `UPDATE edu_resources SET external_links_json = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(JSON.stringify(checkedLinks), row.id).run();

  await audit(env, request, actor, 'edu.resource.link_check', 'edu_resources', row.id, { checked: checkedLinks.length, broken_count: brokenCount });
  return json({ ok: true, resource_id: row.id, checked: checkedLinks.length, broken_count: brokenCount, links: checkedLinks });
}

export async function handleEduBatch1Admin(request, env, actor, sub, extra, tail) {
  await ensureEduResourcesBatch1Schema(env.DB);
  const method = request.method;

  if (sub === 'overview' && method === 'GET') {
    return await handleOverview(env);
  }

  if (sub === 'interlinks') {
    return await handleInterlinks(request, env, actor, extra);
  }

  if (sub === 'link-check') {
    return await handleLinkCheck(request, env, actor);
  }

  if (sub === 'resources') {
    if (extra === 'upload' && method === 'POST') {
      return await handleUploadFile(request, env, actor);
    }
    if (extra === 'import' && method === 'POST') {
      return await handleImportResources(request, env, actor);
    }
    if (extra === 'export' && method === 'GET') {
      return await handleExportResources(request, env);
    }

    if (!extra) {
      if (method === 'GET') return await handleListResources(request, env);
      if (method === 'POST') {
        const body = await readJson(request, 500_000);
        if (body.action === 'bulk_status') {
          const ids = Array.isArray(body.ids) ? body.ids.map(x => cleanStr(x, 120)).filter(Boolean) : [];
          const nextStatus = String(body.status || '').trim();
          if (!ids.length || !EDU_STATUSES.includes(nextStatus)) {
            throw validationError({ status: 'Valid ids array and status are required' });
          }
          for (const itemId of ids.slice(0, 100)) {
            await env.DB.prepare(
              `UPDATE edu_resources SET status = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(nextStatus, itemId).run();
          }
          await audit(env, request, actor, 'edu.resource.bulk_status', 'edu_resources', null, { count: ids.length, status: nextStatus });
          return json({ ok: true, updated: ids.length, status: nextStatus });
        }

        const data = normalizeResourcePayload(body);
        const dup = await env.DB.prepare(`SELECT id FROM edu_resources WHERE slug = ?`).bind(data.slug).first();
        const finalSlug = dup ? `${data.slug.slice(0, 95)}-${crypto.randomUUID().slice(0, 6)}` : data.slug;
        const id = `edu-${crypto.randomUUID().slice(0, 12)}`;
        await env.DB.prepare(
          `INSERT INTO edu_resources (
            id, slug, resource_type, stage_or_class, subject_name, topic_name, exam_tag,
            title_en, title_or, author_or_board, publisher_or_source, publication_year, edition_or_isbn,
            language_code, summary_en, summary_or, content_md_en, content_md_or,
            file_url, r2_key, cover_image_url, file_size_bytes, page_count,
            external_links_json, tags_json, access_tier, offline_ready, watermark_enabled,
            status, publish_at, expires_at, featured, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, finalSlug, data.resource_type, data.stage_or_class, data.subject_name, data.topic_name, data.exam_tag,
          data.title_en, data.title_or, data.author_or_board, data.publisher_or_source, data.publication_year, data.edition_or_isbn,
          data.language_code, data.summary_en, data.summary_or, data.content_md_en, data.content_md_or,
          data.file_url, data.r2_key, data.cover_image_url, data.file_size_bytes, data.page_count,
          data.external_links_json, data.tags_json, data.access_tier, data.offline_ready, data.watermark_enabled,
          data.status, data.publish_at, data.expires_at, data.featured, actor.email || actor.userId
        ).run();

        const created = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ?`).bind(id).first();
        await saveRevisionSnapshot(env.DB, created, body.change_note || 'Initial creation', actor.email);
        await audit(env, request, actor, 'edu.resource.create', 'edu_resources', id, { resource_type: data.resource_type, status: data.status });
        return json({ ok: true, item: formatResourceRow(created) }, 201);
      }
    }

    if (extra && !tail) {
      if (method === 'GET') return await handleGetResource(env, extra);

      const existing = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ?`).bind(extra).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Educational resource not found');

      if (method === 'PUT') {
        const body = await readJson(request, 500_000);
        const data = normalizeResourcePayload(body, existing);
        if (data.slug !== existing.slug) {
          const dup = await env.DB.prepare(`SELECT id FROM edu_resources WHERE slug = ? AND id != ?`).bind(data.slug, existing.id).first();
          if (dup) throw validationError({ slug: 'Another resource already uses this slug' });
        }
        await env.DB.prepare(
          `UPDATE edu_resources SET
            slug = ?, resource_type = ?, stage_or_class = ?, subject_name = ?, topic_name = ?, exam_tag = ?,
            title_en = ?, title_or = ?, author_or_board = ?, publisher_or_source = ?, publication_year = ?, edition_or_isbn = ?,
            language_code = ?, summary_en = ?, summary_or = ?, content_md_en = ?, content_md_or = ?,
            file_url = ?, r2_key = ?, cover_image_url = ?, file_size_bytes = ?, page_count = ?,
            external_links_json = ?, tags_json = ?, access_tier = ?, offline_ready = ?, watermark_enabled = ?,
            status = ?, publish_at = ?, expires_at = ?, featured = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          data.slug, data.resource_type, data.stage_or_class, data.subject_name, data.topic_name, data.exam_tag,
          data.title_en, data.title_or, data.author_or_board, data.publisher_or_source, data.publication_year, data.edition_or_isbn,
          data.language_code, data.summary_en, data.summary_or, data.content_md_en, data.content_md_or,
          data.file_url, data.r2_key, data.cover_image_url, data.file_size_bytes, data.page_count,
          data.external_links_json, data.tags_json, data.access_tier, data.offline_ready, data.watermark_enabled,
          data.status, data.publish_at, data.expires_at, data.featured, existing.id
        ).run();

        const updated = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ?`).bind(existing.id).first();
        await saveRevisionSnapshot(env.DB, updated, body.change_note || 'Editorial update', actor.email);
        await audit(env, request, actor, 'edu.resource.update', 'edu_resources', existing.id, { status: data.status });
        return json({ ok: true, item: formatResourceRow(updated) });
      }

      if (method === 'PATCH') {
        const body = await readJson(request, 50_000);
        if (body.action === 'clone') {
          const cloneId = `edu-${crypto.randomUUID().slice(0, 12)}`;
          const cloneSlug = `${existing.slug.slice(0, 88)}-copy-${crypto.randomUUID().slice(0, 4)}`;
          await env.DB.prepare(
            `INSERT INTO edu_resources (
              id, slug, resource_type, stage_or_class, subject_name, topic_name, exam_tag,
              title_en, title_or, author_or_board, publisher_or_source, publication_year, edition_or_isbn,
              language_code, summary_en, summary_or, content_md_en, content_md_or,
              file_url, r2_key, cover_image_url, file_size_bytes, page_count,
              external_links_json, tags_json, access_tier, offline_ready, watermark_enabled,
              status, featured, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?)`
          ).bind(
            cloneId, cloneSlug, existing.resource_type, existing.stage_or_class, existing.subject_name, existing.topic_name, existing.exam_tag,
            `${existing.title_en} (Copy)`, existing.title_or ? `${existing.title_or} (ନକଲ)` : '',
            existing.author_or_board, existing.publisher_or_source, existing.publication_year, existing.edition_or_isbn,
            existing.language_code, existing.summary_en, existing.summary_or, existing.content_md_en, existing.content_md_or,
            existing.file_url, existing.r2_key, existing.cover_image_url, existing.file_size_bytes, existing.page_count,
            existing.external_links_json, existing.tags_json, existing.access_tier, existing.offline_ready, existing.watermark_enabled,
            actor.email || actor.userId
          ).run();
          const cloned = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ?`).bind(cloneId).first();
          await saveRevisionSnapshot(env.DB, cloned, `Cloned from ${existing.id}`, actor.email);
          await audit(env, request, actor, 'edu.resource.clone', 'edu_resources', cloneId, { source_id: existing.id });
          return json({ ok: true, item: formatResourceRow(cloned) }, 201);
        }

        if (body.action === 'rollback') {
          const revId = cleanStr(body.revision_id || '', 120);
          if (!revId) throw validationError({ revision_id: 'revision_id is required' });
          const rev = await env.DB.prepare(
            `SELECT * FROM edu_resource_revisions WHERE id = ? AND resource_id = ?`
          ).bind(revId, existing.id).first();
          if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision snapshot not found');
          let snap;
          try { snap = JSON.parse(rev.snapshot_json); } catch { throw new HttpError(500, 'CORRUPT_REVISION', 'Invalid revision snapshot'); }
          const data = normalizeResourcePayload(snap, existing);
          await env.DB.prepare(
            `UPDATE edu_resources SET
              resource_type = ?, stage_or_class = ?, subject_name = ?, topic_name = ?, exam_tag = ?,
              title_en = ?, title_or = ?, author_or_board = ?, publisher_or_source = ?, publication_year = ?, edition_or_isbn = ?,
              language_code = ?, summary_en = ?, summary_or = ?, content_md_en = ?, content_md_or = ?,
              file_url = ?, r2_key = ?, cover_image_url = ?, file_size_bytes = ?, page_count = ?,
              external_links_json = ?, tags_json = ?, access_tier = ?, offline_ready = ?, watermark_enabled = ?,
              status = ?, publish_at = ?, expires_at = ?, featured = ?, updated_at = datetime('now')
             WHERE id = ?`
          ).bind(
            data.resource_type, data.stage_or_class, data.subject_name, data.topic_name, data.exam_tag,
            data.title_en, data.title_or, data.author_or_board, data.publisher_or_source, data.publication_year, data.edition_or_isbn,
            data.language_code, data.summary_en, data.summary_or, data.content_md_en, data.content_md_or,
            data.file_url, data.r2_key, data.cover_image_url, data.file_size_bytes, data.page_count,
            data.external_links_json, data.tags_json, data.access_tier, data.offline_ready, data.watermark_enabled,
            data.status, data.publish_at, data.expires_at, data.featured, existing.id
          ).run();
          const rolled = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ?`).bind(existing.id).first();
          await saveRevisionSnapshot(env.DB, rolled, `Rolled back to v${rev.version_num}`, actor.email);
          await audit(env, request, actor, 'edu.resource.rollback', 'edu_resources', existing.id, { revision_id: revId, version_num: rev.version_num });
          return json({ ok: true, item: formatResourceRow(rolled), rolled_back_to: rev.version_num });
        }

        const updates = [];
        const vals = [];
        if (body.status !== undefined) {
          if (!EDU_STATUSES.includes(body.status)) throw validationError({ status: 'Invalid status' });
          updates.push('status = ?');
          vals.push(body.status);
        }
        if (body.featured !== undefined) {
          updates.push('featured = ?');
          vals.push(body.featured ? 1 : 0);
        }
        if (body.offline_ready !== undefined) {
          updates.push('offline_ready = ?');
          vals.push(body.offline_ready ? 1 : 0);
        }
        if (!updates.length) throw validationError({ status: 'No valid patch fields supplied' });
        updates.push(`updated_at = datetime('now')`);
        vals.push(existing.id);

        await env.DB.prepare(`UPDATE edu_resources SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
        const patched = await env.DB.prepare(`SELECT * FROM edu_resources WHERE id = ?`).bind(existing.id).first();
        await audit(env, request, actor, 'edu.resource.patch', 'edu_resources', existing.id, body);
        return json({ ok: true, item: formatResourceRow(patched) });
      }

      if (method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM edu_resource_links WHERE source_id = ? OR target_id = ?`).bind(existing.id, existing.id).run();
        await env.DB.prepare(`DELETE FROM edu_resources WHERE id = ?`).bind(existing.id).run();
        await audit(env, request, actor, 'edu.resource.delete', 'edu_resources', existing.id, { slug: existing.slug });
        return json({ ok: true, deleted: existing.id });
      }
    }
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown edu admin route');
}

function buildSchemaOrg(item) {
  const typeMap = {
    digital_library: 'DigitalDocument',
    study_material: 'LearningResource',
    notes_pdf: 'DigitalDocument',
    book_reference: 'Book'
  };
  return {
    '@context': 'https://schema.org',
    '@type': typeMap[item.resource_type] || 'LearningResource',
    name: item.title_en,
    alternateName: item.title_or || undefined,
    description: item.summary_en || item.summary_or || undefined,
    inLanguage: item.language_code === 'or' ? 'or' : item.language_code === 'bilingual' ? ['en', 'or'] : 'en',
    educationalLevel: item.stage_or_class || undefined,
    about: item.subject_name || undefined,
    author: item.author_or_board ? { '@type': 'Organization', name: item.author_or_board } : undefined,
    publisher: item.publisher_or_source ? { '@type': 'Organization', name: item.publisher_or_source } : undefined,
    isbn: item.edition_or_isbn || undefined,
    url: `https://csodisha.com/study-library/?resource=${encodeURIComponent(item.slug || item.id)}`
  };
}

export async function handlePublicEduResourcesApi(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET, HEAD' });
  }
  await ensureEduResourcesBatch1Schema(env.DB);
  const url = new URL(request.url);
  const resourceType = url.searchParams.get('resource_type') || '';
  const stage = (url.searchParams.get('stage_or_class') || '').trim();
  const subject = (url.searchParams.get('subject_name') || '').trim();
  const tag = (url.searchParams.get('tag') || '').trim().toLowerCase();
  const slug = (url.searchParams.get('slug') || '').trim();
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50) || 50));
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0);

  const where = [
    `(status = 'published' OR (status = 'scheduled' AND publish_at <= datetime('now')))`,
    `(expires_at IS NULL OR expires_at = '' OR expires_at > datetime('now'))`
  ];
  const binds = [];
  if (resourceType && EDU_RESOURCE_TYPES.includes(resourceType)) {
    where.push('resource_type = ?');
    binds.push(resourceType);
  }
  if (stage) {
    where.push('stage_or_class = ?');
    binds.push(stage);
  }
  if (subject) {
    where.push('subject_name = ?');
    binds.push(subject);
  }
  if (slug) {
    where.push('(slug = ? OR id = ?)');
    binds.push(slug, slug);
  }
  if (tag) {
    where.push(`LOWER(tags_json) LIKE ? ESCAPE '\\'`);
    binds.push(`%${likeEscape(tag)}%`);
  }
  if (q) {
    const l = `%${likeEscape(q)}%`;
    where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR subject_name LIKE ? ESCAPE '\\' OR exam_tag LIKE ? ESCAPE '\\')`);
    binds.push(l, l, l, l);
  }

  const { results } = await env.DB.prepare(
    `SELECT * FROM edu_resources WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  const items = [];
  for (const r of results || []) {
    const formatted = formatResourceRow(r);
    const { results: links } = await env.DB.prepare(
      `SELECT l.id, l.source_module, l.source_id, l.target_module, l.target_id, l.relation_type,
              other.slug AS linked_slug, other.title_en AS linked_title_en, other.title_or AS linked_title_or, other.resource_type AS linked_resource_type
       FROM edu_resource_links l
       LEFT JOIN edu_resources other ON other.id = CASE WHEN l.source_id = ? THEN l.target_id ELSE l.source_id END
       WHERE l.source_id = ? OR l.target_id = ?`
    ).bind(r.id, r.id, r.id).all();
    formatted.interlinks = links || [];
    formatted.json_ld = buildSchemaOrg(formatted);
    items.push(formatted);
  }

  return json({ ok: true, count: items.length, items }, 200, {
    'Cache-Control': 'public, max-age=60, s-maxage=300'
  });
}
