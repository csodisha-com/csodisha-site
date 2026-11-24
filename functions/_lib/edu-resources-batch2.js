// Educational Resources Batch 2 (v79): Modules 05-08
// 05 Subjects & Topics | 06 Class / Grade Management | 07 Examination Management | 08 Recruitment & Jobs
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape } from './validate.js';
import { ensureEduResourcesBatch1Schema } from './edu-resources-batch1.js';
import { ensureJobsDirectoryStudioSchema } from './jobs-directory-studio.js';

export const STAGE_GROUPS = [
  'school_1_10',
  'higher_secondary_11_12',
  'ug_pg',
  'competitive_odisha',
  'competitive_national',
  'teaching_eligibility'
];

export const CONDUCTING_BODIES = [
  'OPSC', 'OSSC', 'OSSSC', 'BSE Odisha', 'CHSE Odisha', 'NTA', 'UPSC', 'SSC', 'IBPS', 'Other'
];

export const EXAM_LEVELS = ['State', 'National', 'Board', 'Entrance'];
export const CLASS_STATUSES = ['draft', 'published', 'archived'];
export const EXAM_STATUSES = ['draft', 'scheduled', 'published', 'archived'];

const _b2Ready = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function parseTags(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) { try { arr = JSON.parse(t); } catch { arr = t.split(','); } }
    else arr = t ? t.split(',') : [];
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => cleanStr(x, 48).toLowerCase()).filter(Boolean))].slice(0, 16);
}

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

function sanitizeLinks(raw) {
  const list = parseJson(raw, []);
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list.slice(0, 15)) {
    if (!entry || typeof entry !== 'object') continue;
    const label = cleanStr(entry.label || entry.title || 'Official Link', 100);
    const url = validateSafeUrl(entry.url || '');
    if (!url) continue;
    out.push({
      label,
      url,
      type: cleanStr(entry.type || 'official', 30) || 'official',
      link_status: cleanStr(entry.link_status || 'unchecked', 20) || 'unchecked'
    });
  }
  return out;
}

async function saveRevision(db, resourceId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM edu_batch2_revisions WHERE resource_id = ?`
  ).bind(resourceId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  const revId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO edu_batch2_revisions (id, resource_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(revId, resourceId, nextVer, JSON.stringify(snapshot), cleanStr(note || `Version ${nextVer}`, 200), cleanStr(actorEmail || 'system', 120)).run();
  return nextVer;
}

const STARTER_CLASSES = [
  { id: 'cls-bse-6-10', slug: 'bse-odisha-class-6-to-10', code: 'BSE-6-10', name_en: 'Classes 6–10 (BSE Odisha)', name_or: 'ଷଷ୍ଠ ରୁ ଦଶମ ଶ୍ରେଣୀ (BSE ଓଡ଼ିଶା)', stage_group: 'school_1_10', board_or_body: 'BSE Odisha', description_en: 'High school curriculum, SCERT/OSEPA textbooks, Odia, English, Mathematics, Science & Social Studies.', description_or: 'ମାଧ୍ୟମିକ ଶିକ୍ଷା ପରିଷଦ (BSE) ଓଡ଼ିଶା ଦ୍ୱାରା ପ୍ରଣୀତ ଷଷ୍ଠ ରୁ ଦଶମ ଶ୍ରେଣୀ ପାଠ୍ୟକ୍ରମ।', sort_order: 1, featured: 1 },
  { id: 'cls-chse-11-12', slug: 'chse-odisha-plus2-arts-science-commerce', code: 'CHSE-12', name_en: '+2 Arts / Science / Commerce (CHSE)', name_or: '+୨ କଳା / ବିଜ୍ଞାନ / ବାଣିଜ୍ୟ (CHSE ଓଡ଼ିଶା)', stage_group: 'higher_secondary_11_12', board_or_body: 'CHSE Odisha', description_en: 'Higher Secondary (+2) Arts, Science, and Commerce syllabi, reference books, and board exam papers.', description_or: 'CHSE ଓଡ଼ିଶା +୨ କଳା, ବିଜ୍ଞାନ ଓ ବାଣିଜ୍ୟ ପାଠ୍ୟକ୍ରମ ଏବଂ ପ୍ରଶ୍ନପତ୍ର।', sort_order: 2, featured: 1 },
  { id: 'cls-ug-pg', slug: 'odisha-ug-pg-university-courses', code: 'UG-PG', name_en: 'UG & PG University Tracks', name_or: 'ସ୍ନାତକ (UG) ଓ ସ୍ନାତକୋତ୍ତର (PG)', stage_group: 'ug_pg', board_or_body: 'Odisha State Universities', description_en: 'CBCS / NEP 2020 Honours, Core papers, and PG entrance preparation across Odisha universities.', description_or: 'ଓଡ଼ିଶାର ବିଶ୍ୱବିଦ୍ୟାଳୟଗୁଡ଼ିକର UG (CBCS/NEP) ଓ PG ପାଠ୍ୟକ୍ରମ।', sort_order: 3, featured: 0 },
  { id: 'cls-opsc-oas', slug: 'opsc-oas-civil-services', code: 'OPSC-OAS', name_en: 'OPSC OAS /OCS', name_or: 'OPSC OAS (ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା)', stage_group: 'competitive_odisha', board_or_body: 'OPSC', description_en: 'Odisha Civil Services Prelims, Mains GS I–IV, Optional subjects, and Odisha Special modules.', description_or: 'ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ (OPSC) OAS ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ ପ୍ରସ୍ତୁତି।', sort_order: 4, featured: 1 },
  { id: 'cls-ossc-cgl', slug: 'ossc-cglre-graduate-level', code: 'OSSC-CGL', name_en: 'OSSC CGLRE', name_or: 'OSSC CGLRE (ସ୍ନାତକ ସ୍ତରୀୟ)', stage_group: 'competitive_odisha', board_or_body: 'OSSC', description_en: 'Combined Graduate Level Recruitment Exam Arithmetic, DI, Reasoning, Odia, and Computer Skill modules.', description_or: 'OSSC CGLRE ଗଣିତ, DI, ରିଜନିଂ, ଓଡ଼ିଆ ଓ କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା।', sort_order: 5, featured: 1 },
  { id: 'cls-osssc-ri', slug: 'osssc-ri-ari-amin-icds', code: 'OSSSC-RI', name_en: 'OSSSC RI / ARI / Amin', name_or: 'OSSSC RI / ARI / ଅମିନ', stage_group: 'competitive_odisha', board_or_body: 'OSSSC', description_en: 'District cadre Revenue Inspector, ARI, Amin, SFS & Livestock Inspector recruitment preparation.', description_or: 'ଜିଲ୍ଲା ସ୍ତରୀୟ RI, ARI, ଅମିନ ଓ ICDS ସୁପରଭାଇଜର ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି।', sort_order: 6, featured: 0 },
  { id: 'cls-ugc-net', slug: 'nta-ugc-net-jrf', code: 'UGC-NET', name_en: 'UGC NET / JRF', name_or: 'UGC NET / JRF (ଜାତୀୟ ଯୋଗ୍ୟତା)', stage_group: 'competitive_national', board_or_body: 'NTA', description_en: 'Paper 1 Teaching & Research Aptitude plus Paper 2 Odia, English, History, Political Science & Education.', description_or: 'NTA UGC NET ପେପର-୧ ଏବଂ ପେପର-୨ ବିଷୟଭିତ୍ତିକ ଅଧ୍ୟୟନ।', sort_order: 7, featured: 0 },
  { id: 'cls-otet-osstet', slug: 'bse-otet-osstet-teacher-eligibility', code: 'OTET-OSSTET', name_en: 'OTET / OSSTET', name_or: 'OTET / OSSTET (ଶିକ୍ଷକ ଯୋଗ୍ୟତା)', stage_group: 'teaching_eligibility', board_or_body: 'BSE Odisha', description_en: 'Child Development & Pedagogy, Odia, English, Mathematics, Science & Social Studies for Odisha teacher eligibility.', description_or: 'ଓଡ଼ିଶା ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା (OTET / OSSTET) ଶିଶୁ ବିକାଶ ଓ ଶିକ୍ଷାଦାନ।', sort_order: 8, featured: 1 }
];

const STARTER_SUBJECTS = [
  { id: 'subj-odisha-gs', slug: 'odisha-general-studies', class_grade_id: 'cls-opsc-oas', parent_topic_id: null, code: 'OD-GS', title_en: 'Odisha General Studies', title_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ', description_en: 'Complete Odisha History, Geography, Polity, Economy & Culture.', description_or: 'ଓଡ଼ିଶାର ଇତିହାସ, ଭୂଗୋଳ, ରାଜନୀତି, ଅର୍ଥନୀତି ଓ ସଂସ୍କୃତି।', tags_json: '["opsc","odisha-gk"]', sort_order: 1, featured: 1 },
  { id: 'subj-odisha-gs-u1', slug: 'odisha-history-and-heritage', class_grade_id: 'cls-opsc-oas', parent_topic_id: 'subj-odisha-gs', code: 'OD-GS-U1', title_en: 'Unit 1: Odisha History & Freedom Struggle', title_or: 'ଏକକ ୧: ଓଡ଼ିଶା ଇତିହାସ ଓ ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ', description_en: 'Kalinga War, Kharavela, Ganga/Gajapati era, Paika Rebellion & Utkal Sammilani.', description_or: 'କଳିଙ୍ଗ ଯୁଦ୍ଧ, ଖାରବେଳ, ଗଙ୍ଗ/ଗଜପତି ବଂଶ, ପାଇକ ବିଦ୍ରୋହ ଓ ଉତ୍କଳ ସମ୍ମିଳନୀ।', tags_json: '["history","kalinga","paika"]', sort_order: 1, featured: 0 },
  { id: 'subj-odisha-gs-u1-t1', slug: 'paika-rebellion-1817-buxi-jagabandhu', class_grade_id: 'cls-opsc-oas', parent_topic_id: 'subj-odisha-gs-u1', code: 'OD-GS-U1-T1', title_en: 'Topic: Paika Rebellion (1817) & Buxi Jagabandhu', title_or: 'ବିଷୟ: ପାଇକ ବିଦ୍ରୋହ (୧୮୧୭) ଓ ବକ୍ସି ଜଗବନ୍ଧୁ', description_en: 'Causes, Khordha uprising, and historical significance.', description_or: 'ଖୋର୍ଦ୍ଧା ପାଇକ ବିଦ୍ରୋହର କାରଣ ଓ ଐତିହାସିକ ମହତ୍ତ୍ୱ।', tags_json: '["paika-rebellion","1817"]', sort_order: 1, featured: 0 },
  { id: 'subj-quant-ossc', slug: 'quantitative-aptitude-and-di', class_grade_id: 'cls-ossc-cgl', parent_topic_id: null, code: 'QUANT', title_en: 'Quantitative Aptitude & Data Interpretation', title_or: 'ଗଣିତ ଏବଂ ଡାଟା ଇଣ୍ଟରପ୍ରିଟେସନ୍', description_en: 'Arithmetic, Percentages, Ratio, Profit & Loss, Charts & Tables.', description_or: 'ଶତକଡ଼ା, ଅନୁପାତ, ଲାଭ-କ୍ଷତି, ସମୟ-କାର୍ଯ୍ୟ ଓ DI।', tags_json: '["ossc","arithmetic","di"]', sort_order: 2, featured: 1 },
  { id: 'subj-odia-bse', slug: 'odia-grammar-and-literature', class_grade_id: 'cls-bse-6-10', parent_topic_id: null, code: 'ODIA', title_en: 'Odia Grammar & Literature', title_or: 'ଓଡ଼ିଆ ବ୍ୟାକରଣ ଏବଂ ସାହିତ୍ୟ', description_en: 'Sandhi, Samasa, Krudanta, Taddhita, Alankara & Sahitya.', description_or: 'ସନ୍ଧି, ସମାସ, କୃଦନ୍ତ, ତଦ୍ଧିତ, ଅଳଙ୍କାର ଓ ସାହିତ୍ୟ।', tags_json: '["odia","bse","otet"]', sort_order: 3, featured: 1 },
  { id: 'subj-cdp-otet', slug: 'child-development-and-pedagogy', class_grade_id: 'cls-otet-osstet', parent_topic_id: null, code: 'CDP', title_en: 'Child Development & Pedagogy', title_or: 'ଶିଶୁ ବିକାଶ ଏବଂ ଶିକ୍ଷାଦାନ', description_en: 'Learning theories, inclusive education, NCF & NEP 2020 pedagogy.', description_or: 'ଶିକ୍ଷଣ ତତ୍ତ୍ୱ, ଅନ୍ତର୍ନିବେଶୀ ଶିକ୍ଷା ଓ NEP ୨୦୨୦।', tags_json: '["otet","osstet","pedagogy"]', sort_order: 4, featured: 1 }
];

const STARTER_EXAMS = [
  {
    id: 'exam-opsc-oas-2026', slug: 'opsc-oas-ocs-2026', exam_code: 'OPSC-OCS-2026', conducting_body: 'OPSC', exam_level: 'State',
    title_en: 'OPSC Odisha Civil Services (OAS / OFS / OPS) Examination',
    title_or: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS / OPS) ପରୀକ୍ଷା',
    summary_en: 'Premier Odisha State Civil Services recruitment conducted by OPSC in Prelims, Mains (written), and Personality Test stages.',
    summary_or: 'ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ (OPSC) ଦ୍ୱାରା ପରିଚାଳିତ ପ୍ରିଲିମ୍ସ, ମେନ୍ସ ଓ ସାକ୍ଷାତକାର ପରୀକ୍ଷା।',
    eligibility_en: 'Bachelor’s Degree from a recognised university; Odia proficiency up to ME/Class 7 standard.',
    eligibility_or: 'ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ବିଶ୍ୱବିଦ୍ୟାଳୟରୁ ସ୍ନାତକ ଡିଗ୍ରୀ ଏବଂ ଓଡ଼ିଆ ଭାଷାରେ ଦକ୍ଷତା।',
    age_limit_text: '21–38 years (relaxation for SC/ST/SEBC/Women/PwD as per Odisha Govt rules)',
    fee_structure_json: JSON.stringify({ general: '₹500 (exempted as per Odisha Govt notification)', sc_st_pwd: 'Exempted' }),
    important_dates_json: JSON.stringify({ notification_date: '2026-01-15', apply_start: '2026-01-20', apply_end: '2026-02-20', admit_card_date: '2026-04-10', exam_date: '2026-04-26', result_date: '2026-06-15' }),
    external_links_json: JSON.stringify([{ label: 'OPSC Official Website', url: 'https://www.opsc.gov.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['opsc', 'oas', 'odisha-gk', 'civil-services']),
    status: 'published', featured: 1
  },
  {
    id: 'exam-ossc-cgl-2026', slug: 'ossc-cglre-2026', exam_code: 'OSSC-CGL-2026', conducting_body: 'OSSC', exam_level: 'State',
    title_en: 'OSSC Combined Graduate Level Recruitment Examination (CGLRE)',
    title_or: 'OSSC ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ ନିଯୁକ୍ତି ପରୀକ୍ଷା (CGLRE)',
    summary_en: 'Group-B and Group-C specialist & executive posts across Odisha Government departments.',
    summary_or: 'ଓଡ଼ିଶା ସରକାରଙ୍କ ବିଭିନ୍ନ ବିଭାଗରେ ଗ୍ରୁପ୍-B ଓ ଗ୍ରୁପ୍-C ପଦବୀ ପାଇଁ ନିଯୁକ୍ତି ପରୀକ୍ଷା।',
    eligibility_en: 'Graduate in any discipline + Basic Computer Knowledge + Odia up to HSC.',
    eligibility_or: 'ସ୍ନାତକ ଡିଗ୍ରୀ, କମ୍ପ୍ୟୁଟର ଜ୍ଞାନ ଏବଂ ଦଶମ ସ୍ତରୀୟ ଓଡ଼ିଆ।',
    age_limit_text: '21–38 years',
    fee_structure_json: JSON.stringify({ all_categories: 'Zero Application Fee (Odisha Govt Policy)' }),
    important_dates_json: JSON.stringify({ notification_date: '2026-02-01', apply_start: '2026-02-05', apply_end: '2026-03-05', admit_card_date: '2026-04-20', exam_date: '2026-05-03', result_date: '2026-06-30' }),
    external_links_json: JSON.stringify([{ label: 'OSSC Official Website', url: 'https://www.ossc.gov.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['ossc', 'cgl', 'arithmetic', 'di']),
    status: 'published', featured: 1
  },
  {
    id: 'exam-bse-otet-2026', slug: 'bse-odisha-otet-2026', exam_code: 'BSE-OTET-2026', conducting_body: 'BSE Odisha', exam_level: 'State',
    title_en: 'Odisha Teacher Eligibility Test (OTET) — Paper I & II',
    title_or: 'ଓଡ଼ିଶା ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା (OTET) — ପେପର ୧ ଓ ୨',
    summary_en: 'Mandatory eligibility test conducted by BSE Odisha for Class I–VIII teachers in Odisha.',
    summary_or: 'BSE ଓଡ଼ିଶା ଦ୍ୱାରା ପରିଚାଳିତ ପ୍ରାଥମିକ ଓ ଉଚ୍ଚ ପ୍ରାଥମିକ ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା।',
    eligibility_en: '+2 / Graduation with D.El.Ed. or B.Ed. as per NCTE norms.',
    eligibility_or: '+୨ / ସ୍ନାତକ ସହିତ D.El.Ed. କିମ୍ବା B.Ed. ଯୋଗ୍ୟତା।',
    age_limit_text: 'No upper age bar for TET qualification',
    fee_structure_json: JSON.stringify({ general_sebc: '₹600', sc_st: '₹400' }),
    important_dates_json: JSON.stringify({ notification_date: '2026-03-01', apply_start: '2026-03-05', apply_end: '2026-03-25', admit_card_date: '2026-04-25', exam_date: '2026-05-10', result_date: '2026-06-20' }),
    external_links_json: JSON.stringify([{ label: 'BSE Odisha Portal', url: 'https://www.bseodisha.ac.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['otet', 'bse-odisha', 'pedagogy', 'odia']),
    status: 'published', featured: 1
  }
];

export async function ensureEduResourcesBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureEduResourcesBatch1Schema(db);
  if (_b2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS edu_classes_grades (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL DEFAULT '',
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      stage_group TEXT NOT NULL DEFAULT 'school_1_10' CHECK (stage_group IN (
        'school_1_10', 'higher_secondary_11_12', 'ug_pg',
        'competitive_odisha', 'competitive_national', 'teaching_eligibility'
      )),
      board_or_body TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_classes_stage_status ON edu_classes_grades(stage_group, status, sort_order)`,
    `CREATE TABLE IF NOT EXISTS edu_subjects_topics (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      class_grade_id TEXT NOT NULL DEFAULT '',
      parent_topic_id TEXT,
      code TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_subjects_class_parent ON edu_subjects_topics(class_grade_id, parent_topic_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_edu_subjects_status ON edu_subjects_topics(status)`,
    `CREATE TABLE IF NOT EXISTS edu_examinations (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      exam_code TEXT NOT NULL DEFAULT '',
      conducting_body TEXT NOT NULL DEFAULT 'OPSC' CHECK (conducting_body IN (
        'OPSC', 'OSSC', 'OSSSC', 'BSE Odisha', 'CHSE Odisha', 'NTA', 'UPSC', 'SSC', 'IBPS', 'Other'
      )),
      exam_level TEXT NOT NULL DEFAULT 'State' CHECK (exam_level IN ('State', 'National', 'Board', 'Entrance')),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      eligibility_en TEXT NOT NULL DEFAULT '',
      eligibility_or TEXT NOT NULL DEFAULT '',
      age_limit_text TEXT NOT NULL DEFAULT '',
      fee_structure_json TEXT NOT NULL DEFAULT '{}',
      important_dates_json TEXT NOT NULL DEFAULT '{}',
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      r2_key TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      publish_at TEXT,
      expires_at TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_exams_body_level ON edu_examinations(conducting_body, exam_level, status)`,
    `CREATE INDEX IF NOT EXISTS idx_edu_exams_featured ON edu_examinations(featured, status)`,
    `CREATE TABLE IF NOT EXISTS edu_batch2_revisions (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_b2_rev_res ON edu_batch2_revisions(resource_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  // Clean-slate v232: starter auto-seeding disabled; classes, subjects, and exams are managed via Admin Studio (/admin/).
  _b2Ready.add(db);
}

// ---------- Batch 2 Overview ----------
export async function getBatch2Overview(env) {
  await ensureEduResourcesBatch2Schema(env.DB);
  const cls = await env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_classes_grades`).first();
  const sub = await env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_subjects_topics`).first();
  const exm = await env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_examinations`).first();
  let recCount = 0;
  try {
    await ensureJobsDirectoryStudioSchema(env.DB);
    const rec = await env.DB.prepare(`SELECT COUNT(*) AS n FROM jobs_directory_items WHERE item_type = 'job-notification'`).first();
    recCount = Number(rec?.n || 0);
  } catch {}
  return {
    classes: Number(cls?.n || 0),
    subjects: Number(sub?.n || 0),
    examinations: Number(exm?.n || 0),
    recruitments: recCount
  };
}

// ---------- Module 06: Class / Grade Management ----------
async function handleClasses(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const stage = url.searchParams.get('stage_group') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1'];
      const binds = [];
      if (stage && STAGE_GROUPS.includes(stage)) { where.push('stage_group = ?'); binds.push(stage); }
      if (status && CLASS_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(name_en LIKE ? ESCAPE '\\' OR name_or LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\' OR board_or_body LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l, l);
      }
      const { results } = await env.DB.prepare(
        `SELECT * FROM edu_classes_grades WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, name_en ASC`
      ).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_classes_grades`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(r => ({ ...r, featured: Boolean(r.featured) })), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !CLASS_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_classes_grades SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        await audit(env, request, actor, 'edu.class.bulk_status', 'edu_classes_grades', null, { count: ids.length, status: body.status });
        return json({ ok: true, updated: ids.length });
      }
      const name_en = cleanStr(body.name_en || '', 160);
      if (!name_en) throw validationError({ name_en: 'name_en is required' });
      const stage_group = STAGE_GROUPS.includes(body.stage_group) ? body.stage_group : 'school_1_10';
      const status = CLASS_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || name_en).slice(0, 90) || 'class';
      const dup = await env.DB.prepare(`SELECT id FROM edu_classes_grades WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `cls-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_classes_grades (id, slug, code, name_en, name_or, stage_group, board_or_body, description_en, description_or, sort_order, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.code || '', 40), name_en, cleanStr(body.name_or || '', 160),
        stage_group, cleanStr(body.board_or_body || '', 120), cleanStr(body.description_en || '', 600),
        cleanStr(body.description_or || '', 600), Number(body.sort_order || 0) || 0, status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_classes_grades WHERE id = ?`).bind(newId).first();
      await saveRevision(env.DB, newId, created, 'Created class/grade', actor.email);
      await audit(env, request, actor, 'edu.class.create', 'edu_classes_grades', newId);
      return json({ ok: true, item: { ...created, featured: Boolean(created.featured) } }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_classes_grades WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Class/grade not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch2_revisions WHERE resource_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: { ...existing, featured: Boolean(existing.featured) }, revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const name_en = cleanStr(body.name_en ?? existing.name_en, 160);
    const stage_group = STAGE_GROUPS.includes(body.stage_group) ? body.stage_group : existing.stage_group;
    const status = CLASS_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE edu_classes_grades SET code = ?, name_en = ?, name_or = ?, stage_group = ?, board_or_body = ?, description_en = ?, description_or = ?, sort_order = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.code ?? existing.code, 40), name_en, cleanStr(body.name_or ?? existing.name_or, 160),
      stage_group, cleanStr(body.board_or_body ?? existing.board_or_body, 120),
      cleanStr(body.description_en ?? existing.description_en, 600), cleanStr(body.description_or ?? existing.description_or, 600),
      body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order,
      status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_classes_grades WHERE id = ?`).bind(id).first();
    await saveRevision(env.DB, id, updated, body.change_note || 'Updated class/grade', actor.email);
    await audit(env, request, actor, 'edu.class.update', 'edu_classes_grades', id);
    return json({ ok: true, item: { ...updated, featured: Boolean(updated.featured) } });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `cls-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_classes_grades (id, slug, code, name_en, name_or, stage_group, board_or_body, description_en, description_or, sort_order, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.code, `${existing.name_en} (Copy)`, existing.name_or, existing.stage_group, existing.board_or_body, existing.description_en, existing.description_or, existing.sort_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_classes_grades WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: cloned }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch2_revisions WHERE id = ? AND resource_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(
        `UPDATE edu_classes_grades SET name_en = ?, name_or = ?, code = ?, stage_group = ?, board_or_body = ?, description_en = ?, description_or = ?, sort_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(snap.name_en, snap.name_or || '', snap.code || '', snap.stage_group, snap.board_or_body || '', snap.description_en || '', snap.description_or || '', Number(snap.sort_order || 0), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_classes_grades WHERE id = ?`).bind(id).first();
      await saveRevision(env.DB, id, rolled, `Rolled back to v${rev.version_num}`, actor.email);
      return json({ ok: true, item: rolled });
    }
    const updates = []; const vals = [];
    if (body.status && CLASS_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (body.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(Number(body.sort_order) || 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE edu_classes_grades SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_classes_grades WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: { ...patched, featured: Boolean(patched.featured) } });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_classes_grades WHERE id = ?`).bind(id).run();
    await audit(env, request, actor, 'edu.class.delete', 'edu_classes_grades', id);
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 05: Subjects & Topics ----------
function buildSubjectTree(rows) {
  const byId = new Map();
  const roots = [];
  for (const r of rows) {
    byId.set(r.id, { ...r, tags: parseJson(r.tags_json, []), featured: Boolean(r.featured), children: [] });
  }
  for (const node of byId.values()) {
    if (node.parent_topic_id && byId.has(node.parent_topic_id)) {
      byId.get(node.parent_topic_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

async function handleSubjects(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const classId = url.searchParams.get('class_grade_id') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1'];
      const binds = [];
      if (classId) { where.push('class_grade_id = ?'); binds.push(classId); }
      if (status && CLASS_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\' OR tags_json LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l, l);
      }
      const { results } = await env.DB.prepare(
        `SELECT * FROM edu_subjects_topics WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, title_en ASC`
      ).bind(...binds).all();
      const rows = (results || []).map(r => ({ ...r, tags: parseJson(r.tags_json, []), featured: Boolean(r.featured) }));
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_subjects_topics`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: rows, tree: buildSubjectTree(results || []), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !CLASS_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_subjects_topics SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 200);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'subject';
      const dup = await env.DB.prepare(`SELECT id FROM edu_subjects_topics WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `subj-${crypto.randomUUID().slice(0, 10)}`;
      const parentId = cleanStr(body.parent_topic_id || '', 120) || null;
      const tags = parseTags(body.tags ?? body.tags_json);
      const status = CLASS_STATUSES.includes(body.status) ? body.status : 'draft';
      await env.DB.prepare(
        `INSERT INTO edu_subjects_topics (id, slug, class_grade_id, parent_topic_id, code, title_en, title_or, description_en, description_or, tags_json, sort_order, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.class_grade_id || '', 120), parentId, cleanStr(body.code || '', 40),
        title_en, cleanStr(body.title_or || '', 200), cleanStr(body.description_en || '', 600),
        cleanStr(body.description_or || '', 600), JSON.stringify(tags), Number(body.sort_order || 0) || 0, status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_subjects_topics WHERE id = ?`).bind(newId).first();
      await saveRevision(env.DB, newId, created, 'Created subject/topic', actor.email);
      await audit(env, request, actor, 'edu.subject.create', 'edu_subjects_topics', newId);
      return json({ ok: true, item: { ...created, tags, featured: Boolean(created.featured) } }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_subjects_topics WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Subject/topic not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch2_revisions WHERE resource_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: { ...existing, tags: parseJson(existing.tags_json, []), featured: Boolean(existing.featured) }, revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const title_en = cleanStr(body.title_en ?? existing.title_en, 200);
    const status = CLASS_STATUSES.includes(body.status) ? body.status : existing.status;
    const tags = body.tags !== undefined || body.tags_json !== undefined ? parseTags(body.tags ?? body.tags_json) : parseJson(existing.tags_json, []);
    const parentId = body.parent_topic_id !== undefined ? (cleanStr(body.parent_topic_id, 120) || null) : existing.parent_topic_id;
    await env.DB.prepare(
      `UPDATE edu_subjects_topics SET class_grade_id = ?, parent_topic_id = ?, code = ?, title_en = ?, title_or = ?, description_en = ?, description_or = ?, tags_json = ?, sort_order = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.class_grade_id ?? existing.class_grade_id, 120), parentId, cleanStr(body.code ?? existing.code, 40),
      title_en, cleanStr(body.title_or ?? existing.title_or, 200),
      cleanStr(body.description_en ?? existing.description_en, 600), cleanStr(body.description_or ?? existing.description_or, 600),
      JSON.stringify(tags), body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order,
      status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_subjects_topics WHERE id = ?`).bind(id).first();
    await saveRevision(env.DB, id, updated, body.change_note || 'Updated subject/topic', actor.email);
    return json({ ok: true, item: { ...updated, tags, featured: Boolean(updated.featured) } });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `subj-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_subjects_topics (id, slug, class_grade_id, parent_topic_id, code, title_en, title_or, description_en, description_or, tags_json, sort_order, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.class_grade_id, existing.parent_topic_id, existing.code, `${existing.title_en} (Copy)`, existing.title_or, existing.description_en, existing.description_or, existing.tags_json, existing.sort_order + 1).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_subjects_topics WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: cloned }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch2_revisions WHERE id = ? AND resource_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(
        `UPDATE edu_subjects_topics SET title_en = ?, title_or = ?, code = ?, class_grade_id = ?, parent_topic_id = ?, description_en = ?, description_or = ?, tags_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(snap.title_en, snap.title_or || '', snap.code || '', snap.class_grade_id || '', snap.parent_topic_id || null, snap.description_en || '', snap.description_or || '', snap.tags_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_subjects_topics WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: rolled });
    }
    const updates = []; const vals = [];
    if (body.status && CLASS_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE edu_subjects_topics SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_subjects_topics WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: { ...patched, tags: parseJson(patched.tags_json, []), featured: Boolean(patched.featured) } });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_subjects_topics WHERE id = ?`).bind(id).run();
    await audit(env, request, actor, 'edu.subject.delete', 'edu_subjects_topics', id);
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Smart Auto-Matcher (01-06 resources matching Exam/Recruitment) ----------
async function findAutoMatchedResources(db, queryTokens, limit = 8) {
  const tokens = [...new Set(queryTokens.map(t => String(t || '').toLowerCase().trim()).filter(t => t.length >= 2))];
  if (!tokens.length) return [];
  const { results } = await db.prepare(
    `SELECT id, slug, resource_type, title_en, title_or, exam_tag, subject_name, tags_json FROM edu_resources WHERE status = 'published' LIMIT 150`
  ).all();
  return (results || [])
    .map(r => {
      const hay = `${r.title_en} ${r.exam_tag} ${r.subject_name} ${r.tags_json}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) if (hay.includes(tok)) score++;
      return { ...r, match_score: score };
    })
    .filter(r => r.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);
}

// ---------- Module 07: Examination Management ----------
function formatExam(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    fee_structure: parseJson(row.fee_structure_json, {}),
    important_dates: parseJson(row.important_dates_json, {}),
    external_links: parseJson(row.external_links_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleExaminations(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const bodyFilter = url.searchParams.get('conducting_body') || '';
      const levelFilter = url.searchParams.get('exam_level') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1'];
      const binds = [];
      if (bodyFilter && CONDUCTING_BODIES.includes(bodyFilter)) { where.push('conducting_body = ?'); binds.push(bodyFilter); }
      if (levelFilter && EXAM_LEVELS.includes(levelFilter)) { where.push('exam_level = ?'); binds.push(levelFilter); }
      if (status && EXAM_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR exam_code LIKE ? ESCAPE '\\' OR tags_json LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l, l);
      }
      const { results } = await env.DB.prepare(
        `SELECT * FROM edu_examinations WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC`
      ).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_examinations`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatExam), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !EXAM_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_examinations SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const conducting_body = CONDUCTING_BODIES.includes(body.conducting_body) ? body.conducting_body : 'OPSC';
      const exam_level = EXAM_LEVELS.includes(body.exam_level) ? body.exam_level : 'State';
      const status = EXAM_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'exam';
      const dup = await env.DB.prepare(`SELECT id FROM edu_examinations WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `exam-${crypto.randomUUID().slice(0, 10)}`;
      const dates = parseJson(body.important_dates ?? body.important_dates_json, {});
      const fees = parseJson(body.fee_structure ?? body.fee_structure_json, {});
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_examinations (
          id, slug, exam_code, conducting_body, exam_level, title_en, title_or, summary_en, summary_or,
          eligibility_en, eligibility_or, age_limit_text, fee_structure_json, important_dates_json,
          external_links_json, tags_json, r2_key, file_url, status, publish_at, expires_at, featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.exam_code || '', 60), conducting_body, exam_level,
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        cleanStr(body.eligibility_en || '', 600), cleanStr(body.eligibility_or || '', 600), cleanStr(body.age_limit_text || '', 200),
        JSON.stringify(fees), JSON.stringify(dates), JSON.stringify(links), JSON.stringify(tags),
        cleanStr(body.r2_key || '', 240), validateSafeUrl(body.file_url || ''), status,
        cleanStr(body.publish_at || '', 40) || null, cleanStr(body.expires_at || '', 40) || null, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_examinations WHERE id = ?`).bind(newId).first();
      await saveRevision(env.DB, newId, created, 'Created examination', actor.email);
      await audit(env, request, actor, 'edu.exam.create', 'edu_examinations', newId);
      return json({ ok: true, item: formatExam(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_examinations WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch2_revisions WHERE resource_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    const { results: interlinks } = await env.DB.prepare(
      `SELECT l.*, r.title_en AS linked_title_en FROM edu_resource_links l LEFT JOIN edu_resources r ON r.id = l.target_id WHERE l.source_id = ? OR l.target_id = ?`
    ).bind(id, id).all();
    const tokens = [existing.conducting_body, existing.exam_code, ...parseJson(existing.tags_json, [])];
    const smart_matches = await findAutoMatchedResources(env.DB, tokens);
    return json({ ok: true, item: formatExam(existing), revisions: revisions || [], interlinks: interlinks || [], smart_matches });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const title_en = cleanStr(body.title_en ?? existing.title_en, 220);
    const conducting_body = CONDUCTING_BODIES.includes(body.conducting_body) ? body.conducting_body : existing.conducting_body;
    const exam_level = EXAM_LEVELS.includes(body.exam_level) ? body.exam_level : existing.exam_level;
    const status = EXAM_STATUSES.includes(body.status) ? body.status : existing.status;
    const dates = body.important_dates !== undefined || body.important_dates_json !== undefined ? parseJson(body.important_dates ?? body.important_dates_json, {}) : parseJson(existing.important_dates_json, {});
    const fees = body.fee_structure !== undefined || body.fee_structure_json !== undefined ? parseJson(body.fee_structure ?? body.fee_structure_json, {}) : parseJson(existing.fee_structure_json, {});
    const links = body.external_links !== undefined || body.external_links_json !== undefined ? sanitizeLinks(body.external_links ?? body.external_links_json) : parseJson(existing.external_links_json, []);
    const tags = body.tags !== undefined || body.tags_json !== undefined ? parseTags(body.tags ?? body.tags_json) : parseJson(existing.tags_json, []);

    await env.DB.prepare(
      `UPDATE edu_examinations SET
        exam_code = ?, conducting_body = ?, exam_level = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?,
        eligibility_en = ?, eligibility_or = ?, age_limit_text = ?, fee_structure_json = ?, important_dates_json = ?,
        external_links_json = ?, tags_json = ?, r2_key = ?, file_url = ?, status = ?, publish_at = ?, expires_at = ?, featured = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      cleanStr(body.exam_code ?? existing.exam_code, 60), conducting_body, exam_level,
      title_en, cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      cleanStr(body.eligibility_en ?? existing.eligibility_en, 600), cleanStr(body.eligibility_or ?? existing.eligibility_or, 600),
      cleanStr(body.age_limit_text ?? existing.age_limit_text, 200), JSON.stringify(fees), JSON.stringify(dates),
      JSON.stringify(links), JSON.stringify(tags), cleanStr(body.r2_key ?? existing.r2_key, 240),
      validateSafeUrl(body.file_url ?? existing.file_url), status,
      body.publish_at !== undefined ? (cleanStr(body.publish_at, 40) || null) : existing.publish_at,
      body.expires_at !== undefined ? (cleanStr(body.expires_at, 40) || null) : existing.expires_at,
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_examinations WHERE id = ?`).bind(id).first();
    await saveRevision(env.DB, id, updated, body.change_note || 'Updated examination', actor.email);
    return json({ ok: true, item: formatExam(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `exam-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_examinations (id, slug, exam_code, conducting_body, exam_level, title_en, title_or, summary_en, summary_or, eligibility_en, eligibility_or, age_limit_text, fee_structure_json, important_dates_json, external_links_json, tags_json, r2_key, file_url, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.exam_code, existing.conducting_body, existing.exam_level, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.eligibility_en, existing.eligibility_or, existing.age_limit_text, existing.fee_structure_json, existing.important_dates_json, existing.external_links_json, existing.tags_json, existing.r2_key, existing.file_url).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_examinations WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatExam(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch2_revisions WHERE id = ? AND resource_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(
        `UPDATE edu_examinations SET title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, important_dates_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(snap.title_en, snap.title_or || '', snap.summary_en || '', snap.summary_or || '', snap.important_dates_json || '{}', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_examinations WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatExam(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && EXAM_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE edu_examinations SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_examinations WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatExam(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_examinations WHERE id = ?`).bind(id).run();
    await audit(env, request, actor, 'edu.exam.delete', 'edu_examinations', id);
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 08: Recruitment & Jobs (Bridged with jobs_directory_items) ----------
function formatRecruitment(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title_en: row.title || '',
    title_or: row.title_or || '',
    recruiting_body: row.recruiting_body || '',
    qualification_tag: row.qualification_tag || '',
    vacancies: row.vacancies || '',
    start_date: row.start_date || '',
    deadline_date: row.deadline_date || '',
    exam_date: row.exam_date || '',
    official_apply_url: row.official_apply_url || '',
    file_url: (parseJson(row.attachments_json, [])[0] && parseJson(row.attachments_json, [])[0].url) || '',
    summary_en: row.summary || '',
    summary_or: '',
    external_links: parseJson(row.links_json, []),
    tags: parseJson(row.tags_json, []),
    status: row.status || 'draft',
    featured: Boolean(row.featured),
    updated_at: row.updated_at
  };
}

async function handleRecruitments(request, env, actor, id) {
  await ensureJobsDirectoryStudioSchema(env.DB);
  const method = request.method;

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = [`item_type = 'job-notification'`];
      const binds = [];
      if (status && EXAM_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title LIKE ? ESCAPE '\\' OR recruiting_body LIKE ? ESCAPE '\\' OR qualification_tag LIKE ? ESCAPE '\\' OR tags_json LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l, l);
      }
      const { results } = await env.DB.prepare(
        `SELECT * FROM jobs_directory_items WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC LIMIT 150`
      ).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(
        `SELECT status FROM jobs_directory_items WHERE item_type = 'job-notification'`
      ).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatRecruitment), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      const now = new Date().toISOString();
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !EXAM_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE jobs_directory_items SET status = ?, updated_at = ? WHERE id = ?`).bind(body.status, now, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title = cleanStr(body.title_en || body.title || '', 220);
      if (!title) throw validationError({ title_en: 'title_en is required' });
      const baseSlug = slugify(body.slug || title).slice(0, 90) || 'job';
      const dup = await env.DB.prepare(`SELECT id FROM jobs_directory_items WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `job-${crypto.randomUUID().slice(0, 10)}`;
      const folder = await env.DB.prepare(`SELECT id FROM jobs_directory_folders WHERE domain_slug = 'jobs-recruitment' LIMIT 1`).first();
      const folderId = folder ? folder.id : 'folder-jobs-recruitment';
      const attachments = body.file_url ? [{ label: 'Official Notification PDF', url: validateSafeUrl(body.file_url), type: 'pdf' }] : [];
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      const status = EXAM_STATUSES.includes(body.status) ? body.status : 'draft';

      await env.DB.prepare(
        `INSERT INTO jobs_directory_items (
          id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, qualification_tag,
          vacancies, start_date, deadline_date, exam_date, official_apply_url, attachments_json, links_json, tags_json,
          language, status, featured, summary, created_by, updated_by, created_at, updated_at
        ) VALUES (?, 'jobs-recruitment', ?, ?, ?, ?, 'job-notification', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN+OR', ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, folderId, title, cleanStr(body.title_or || '', 220), finalSlug,
        cleanStr(body.recruiting_body || '', 160), cleanStr(body.qualification_tag || '', 120),
        cleanStr(body.vacancies || '', 60), cleanStr(body.start_date || '', 40), cleanStr(body.deadline_date || '', 40),
        cleanStr(body.exam_date || '', 40), validateSafeUrl(body.official_apply_url || ''),
        JSON.stringify(attachments), JSON.stringify(links), JSON.stringify(tags),
        status, body.featured ? 1 : 0, cleanStr(body.summary_en || '', 1000),
        actor.email || 'admin', actor.email || 'admin', now, now
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM jobs_directory_items WHERE id = ?`).bind(newId).first();
      await saveRevision(env.DB, newId, created, 'Created recruitment notification', actor.email);
      await audit(env, request, actor, 'edu.recruitment.create', 'jobs_directory_items', newId);
      return json({ ok: true, item: formatRecruitment(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM jobs_directory_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Recruitment item not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch2_revisions WHERE resource_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    const { results: interlinks } = await env.DB.prepare(
      `SELECT l.*, r.title_en AS linked_title_en FROM edu_resource_links l LEFT JOIN edu_resources r ON r.id = l.target_id WHERE l.source_id = ? OR l.target_id = ?`
    ).bind(id, id).all();
    const tokens = [existing.recruiting_body, existing.qualification_tag, ...parseJson(existing.tags_json, [])];
    const smart_matches = await findAutoMatchedResources(env.DB, tokens);
    return json({ ok: true, item: formatRecruitment(existing), revisions: revisions || [], interlinks: interlinks || [], smart_matches });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const now = new Date().toISOString();
    const title = cleanStr(body.title_en ?? body.title ?? existing.title, 220);
    const status = EXAM_STATUSES.includes(body.status) ? body.status : existing.status;
    const links = body.external_links !== undefined ? sanitizeLinks(body.external_links) : parseJson(existing.links_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    const attachments = body.file_url !== undefined
      ? (body.file_url ? [{ label: 'Official Notification PDF', url: validateSafeUrl(body.file_url), type: 'pdf' }] : [])
      : parseJson(existing.attachments_json, []);

    await env.DB.prepare(
      `UPDATE jobs_directory_items SET
        title = ?, title_or = ?, recruiting_body = ?, qualification_tag = ?, vacancies = ?,
        start_date = ?, deadline_date = ?, exam_date = ?, official_apply_url = ?,
        attachments_json = ?, links_json = ?, tags_json = ?, status = ?, featured = ?,
        summary = ?, updated_by = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      title, cleanStr(body.title_or ?? existing.title_or ?? '', 220),
      cleanStr(body.recruiting_body ?? existing.recruiting_body, 160), cleanStr(body.qualification_tag ?? existing.qualification_tag, 120),
      cleanStr(body.vacancies ?? existing.vacancies, 60), cleanStr(body.start_date ?? existing.start_date, 40),
      cleanStr(body.deadline_date ?? existing.deadline_date, 40), cleanStr(body.exam_date ?? existing.exam_date, 40),
      validateSafeUrl(body.official_apply_url ?? existing.official_apply_url),
      JSON.stringify(attachments), JSON.stringify(links), JSON.stringify(tags),
      status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured,
      cleanStr(body.summary_en ?? existing.summary, 1000),
      actor.email || 'admin', now, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM jobs_directory_items WHERE id = ?`).bind(id).first();
    await saveRevision(env.DB, id, updated, body.change_note || 'Updated recruitment', actor.email);
    return json({ ok: true, item: formatRecruitment(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    const now = new Date().toISOString();
    if (body.action === 'clone') {
      const cloneId = `job-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO jobs_directory_items (id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, qualification_tag, vacancies, start_date, deadline_date, exam_date, official_apply_url, attachments_json, links_json, tags_json, language, status, featured, summary, created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?, ?, ?)`
      ).bind(cloneId, existing.domain_slug, existing.folder_id, `${existing.title} (Copy)`, existing.title_or || '', `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.item_type, existing.recruiting_body, existing.qualification_tag, existing.vacancies, existing.start_date, existing.deadline_date, existing.exam_date, existing.official_apply_url, existing.attachments_json, existing.links_json, existing.tags_json, existing.language, existing.summary, actor.email || 'admin', actor.email || 'admin', now, now).run();
      const cloned = await env.DB.prepare(`SELECT * FROM jobs_directory_items WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatRecruitment(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch2_revisions WHERE id = ? AND resource_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(
        `UPDATE jobs_directory_items SET title = ?, title_or = ?, summary = ?, status = ?, updated_by = ?, updated_at = ? WHERE id = ?`
      ).bind(snap.title, snap.title_or || '', snap.summary || '', snap.status || 'draft', actor.email || 'admin', now, id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM jobs_directory_items WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatRecruitment(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && EXAM_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push('updated_at = ?');
    vals.push(now, id);
    await env.DB.prepare(`UPDATE jobs_directory_items SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM jobs_directory_items WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatRecruitment(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM jobs_directory_items WHERE id = ?`).bind(id).run();
    await audit(env, request, actor, 'edu.recruitment.delete', 'jobs_directory_items', id);
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleEduBatch2Admin(request, env, actor, sub, extra) {
  await ensureEduResourcesBatch2Schema(env.DB);
  if (sub === 'classes') return await handleClasses(request, env, actor, extra);
  if (sub === 'subjects') return await handleSubjects(request, env, actor, extra);
  if (sub === 'examinations') return await handleExaminations(request, env, actor, extra);
  if (sub === 'recruitments') return await handleRecruitments(request, env, actor, extra);
  return null;
}

// ---------- Public Cached APIs ----------
export async function handlePublicEduTaxonomyApi(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
  }
  await ensureEduResourcesBatch2Schema(env.DB);
  const { results: classes } = await env.DB.prepare(
    `SELECT * FROM edu_classes_grades WHERE status = 'published' ORDER BY sort_order ASC, name_en ASC`
  ).all();
  const { results: subjects } = await env.DB.prepare(
    `SELECT * FROM edu_subjects_topics WHERE status = 'published' ORDER BY sort_order ASC, title_en ASC`
  ).all();
  return json({
    ok: true,
    classes: (classes || []).map(c => ({ ...c, featured: Boolean(c.featured) })),
    subjects_tree: buildSubjectTree(subjects || [])
  }, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=300' });
}

export async function handlePublicEduExaminationsApi(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
  }
  await ensureEduResourcesBatch2Schema(env.DB);
  const { results: exams } = await env.DB.prepare(
    `SELECT * FROM edu_examinations
     WHERE (status = 'published' OR (status = 'scheduled' AND publish_at <= datetime('now')))
       AND (expires_at IS NULL OR expires_at = '' OR expires_at > datetime('now'))
     ORDER BY featured DESC, updated_at DESC`
  ).all();
  const items = [];
  for (const ex of exams || []) {
    const formatted = formatExam(ex);
    const { results: linked } = await env.DB.prepare(
      `SELECT l.relation_type, r.id, r.slug, r.resource_type, r.title_en, r.title_or, r.file_url
       FROM edu_resource_links l
       JOIN edu_resources r ON (r.id = CASE WHEN l.source_id = ? THEN l.target_id ELSE l.source_id END)
       WHERE (l.source_id = ? OR l.target_id = ?) AND r.status = 'published'`
    ).bind(ex.id, ex.id, ex.id).all();
    formatted.interlinked_resources = linked || [];
    items.push(formatted);
  }
  return json({ ok: true, count: items.length, items }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
}
