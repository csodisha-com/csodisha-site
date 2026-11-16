// Educational Resources Batch 3 (v80): Modules 09-12
// 09 Admit Cards & Results | 10 Syllabus & Exam Patterns | 11 Previous Year Questions | 12 Question Bank
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import { ensureEduResourcesBatch2Schema } from './edu-resources-batch2.js';
import { ensureJobsDirectoryStudioSchema } from './jobs-directory-studio.js';

export const ADMIT_NOTICE_TYPES = [
  'admit_card', 'exam_city_slip', 'provisional_result', 'final_result', 'merit_list', 'cutoff_scorecard'
];
export const B3_STATUSES = ['draft', 'scheduled', 'published', 'archived'];
export const PYQ_DIFFICULTIES = ['Easy', 'Moderate', 'Hard'];
export const QB_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
export const QB_OPTIONS = ['A', 'B', 'C', 'D'];

const _b3Ready = new WeakSet();

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

async function saveB3Revision(db, moduleCode, entityId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM edu_batch3_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  const revId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO edu_batch3_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(snapshot), cleanStr(note || `Version ${nextVer}`, 200), cleanStr(actorEmail || 'system', 120)).run();
  return nextVer;
}

const STARTER_ADMIT_RESULTS = [
  {
    id: 'adm-opsc-oas-2026', slug: 'opsc-oas-2026-prelims-admit-card-and-cutoff',
    notice_type: 'admit_card', examination_id: 'exam-opsc-oas-2026', conducting_body: 'OPSC',
    title_en: 'OPSC OAS (OCS) Prelims Admit Card & Multi-Year Cut-Off Tracker',
    title_or: 'OPSC OAS (OCS) ପ୍ରିଲିମ୍ସ ଆଡମିଟ୍ କାର୍ଡ ଏବଂ କଟ୍-ଅଫ୍ ସୂଚୀ',
    summary_en: 'Download OPSC OAS Admission Certificate and review category-wise UR/SEBC/SC/ST/PwD/Women cut-off marks.',
    summary_or: 'OPSC OAS ଆଡମିଟ୍ କାର୍ଡ ଡାଉନଲୋଡ୍ କରନ୍ତୁ ଏବଂ ବର୍ଗଭିତ୍ତିକ କଟ୍-ଅଫ୍ ମାର୍କ ଦେଖନ୍ତୁ।',
    release_date: '2026-04-10', exam_date: '2026-04-26',
    download_url: 'https://www.opsc.gov.in/',
    cutoff_table_json: JSON.stringify([
      { year: 2024, category: 'UR', prelims_cutoff: 92.5, mains_cutoff: 880, final_cutoff: 1035, total_marks: 2000 },
      { year: 2024, category: 'SEBC', prelims_cutoff: 88.0, mains_cutoff: 852, final_cutoff: 1002, total_marks: 2000 },
      { year: 2024, category: 'SC', prelims_cutoff: 76.5, mains_cutoff: 790, final_cutoff: 930, total_marks: 2000 },
      { year: 2024, category: 'ST', prelims_cutoff: 68.0, mains_cutoff: 745, final_cutoff: 885, total_marks: 2000 },
      { year: 2024, category: 'Women', prelims_cutoff: 86.0, mains_cutoff: 840, final_cutoff: 990, total_marks: 2000 }
    ]),
    external_links_json: JSON.stringify([{ label: 'OPSC Official Portal', url: 'https://www.opsc.gov.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['opsc', 'oas', 'admit-card', 'cutoff']),
    status: 'published', featured: 1
  }
];

const STARTER_SYLLABI = [
  {
    id: 'syl-ossc-cgl-2026', slug: 'ossc-cglre-2026-syllabus-and-exam-pattern',
    examination_id: 'exam-ossc-cgl-2026', class_grade_id: 'cls-ossc-cgl', conducting_body: 'OSSC',
    title_en: 'OSSC CGLRE 2026 Official Syllabus & Exam Pattern Blueprint',
    title_or: 'OSSC CGLRE ୨୦୨୬ ସରକାରୀ ସିଲାବସ୍ ଏବଂ ପରୀକ୍ଷା ଢାଞ୍ଚା',
    summary_en: 'Preliminary (150 MCQs) and Mains Written Examination pattern with topic-wise weightage checklist.',
    summary_or: 'ପ୍ରିଲିମ୍ସ (୧୫୦ MCQ) ଓ ମେନ୍ସ ପରୀକ୍ଷା ଢାଞ୍ଚା ଏବଂ ବିଷୟଭିତ୍ତିକ ତାଲିକା।',
    exam_pattern_json: JSON.stringify([
      { stage: 'Prelims', paper_name: 'Arithmetic, DI, Reasoning, GK & Computer', subjects: 'Quant, DI, LR, Current Affairs, Computer', total_questions: 150, total_marks: 150, duration_mins: 150, negative_marking: 0.25 },
      { stage: 'Mains', paper_name: 'Paper I (Language) & Paper II (General Studies)', subjects: 'Odia, English, GS', total_questions: 200, total_marks: 200, duration_mins: 180, negative_marking: 0.25 }
    ]),
    topics_checklist_json: JSON.stringify([
      { topic_code: 'QUANT-01', title_en: 'Arithmetic & Data Interpretation', title_or: 'ଗଣିତ ଓ DI', subject_name: 'Quantitative Aptitude', weightage_pct: 30 },
      { topic_code: 'ODIA-01', title_en: 'Odia Grammar & Literature', title_or: 'ଓଡ଼ିଆ ବ୍ୟାକରଣ', subject_name: 'Odia Literature', weightage_pct: 20 },
      { topic_code: 'ODGK-01', title_en: 'Odisha General Studies', title_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ', subject_name: 'Odisha General Studies', weightage_pct: 25 }
    ]),
    external_links_json: JSON.stringify([{ label: 'OSSC Official Syllabus', url: 'https://www.ossc.gov.in/', type: 'official', link_status: 'ok' }]),
    tags_json: JSON.stringify(['ossc', 'cgl', 'syllabus', 'exam-pattern']),
    status: 'published', featured: 1
  }
];

const STARTER_PYQS = [
  {
    id: 'pyq-opsc-oas-2024-gs1', slug: 'opsc-oas-2024-prelims-gs-paper-1-pyq',
    examination_id: 'exam-opsc-oas-2026', class_grade_id: 'cls-opsc-oas', subject_name: 'Odisha General Studies',
    exam_year: 2024, shift_or_paper: 'Prelims GS Paper I',
    title_en: 'OPSC OAS 2024 Prelims GS Paper I Solved PYQ PDF',
    title_or: 'OPSC OAS ୨୦୨୪ ପ୍ରିଲିମ୍ସ GS ପେପର ୧ ପ୍ରଶ୍ନପତ୍ର PDF',
    summary_en: 'Complete 100-question Prelims GS Paper I with official OPSC answer key and Odisha GK explanations.',
    summary_or: 'ସମ୍ପୂର୍ଣ୍ଣ ୧୦୦ଟି ପ୍ରଶ୍ନ ଏବଂ OPSC ସରକାରୀ ଉତ୍ତର ସଙ୍କେତ।',
    question_count: 100, duration_mins: 120, total_marks: 200, difficulty_level: 'Moderate', offline_ready: 1,
    file_url: '/resources/', answer_key_url: 'https://www.opsc.gov.in/',
    tags_json: JSON.stringify(['opsc', 'oas', 'pyq', '2024']),
    status: 'published', featured: 1
  }
];

const STARTER_QUESTIONS = [
  {
    id: 'qb-paika-1817-01', slug: 'paika-rebellion-1817-leader-mcq',
    pyq_paper_id: 'pyq-opsc-oas-2024-gs1', class_grade_id: 'cls-opsc-oas',
    subject_name: 'Odisha General Studies', topic_name: 'Odisha Freedom Struggle',
    exam_tag: 'OPSC OAS', exam_year: 2024, difficulty: 'Easy',
    question_en: 'Who led the historic Paika Rebellion of 1817 in Khordha, Odisha?',
    question_or: '୧୮୧୭ ମସିହାରେ ଓଡ଼ିଶାର ଖୋର୍ଦ୍ଧାରେ ଐତିହାସିକ ପାଇକ ବିଦ୍ରୋହର ନେତୃତ୍ୱ କିଏ ନେଇଥିଲେ?',
    options_json: JSON.stringify({
      A_en: 'Buxi Jagabandhu Bidyadhara', A_or: 'ବକ୍ସି ଜଗବନ୍ଧୁ ବିଦ୍ୟାଧର',
      B_en: 'Veer Surendra Sai', B_or: 'ବୀର ସୁରେନ୍ଦ୍ର ସାଏ',
      C_en: 'Jayee Rajaguru', C_or: 'ଜୟୀ ରାଜଗୁରୁ',
      D_en: 'Madhusudan Das', D_or: 'ମଧୁସୂଦନ ଦାସ'
    }),
    correct_option: 'A',
    explanation_en: 'Buxi Jagabandhu Bidyadhara Mahapatra Bhramarabara Ray led the 1817 Paika Rebellion against British East India Company rule.',
    explanation_or: 'ବକ୍ସି ଜଗବନ୍ଧୁ ୧୮୧୭ ମସିହାରେ ଇଂରେଜ ଶାସନ ବିରୁଦ୍ଧରେ ପାଇକ ବିଦ୍ରୋହର ନେତୃତ୍ୱ ନେଇଥିଲେ।',
    tags_json: JSON.stringify(['opsc', 'paika-rebellion', 'odisha-gk']),
    status: 'published', featured: 1
  }
];

export async function ensureEduResourcesBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureEduResourcesBatch2Schema(db);
  if (_b3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS edu_admit_results (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      notice_type TEXT NOT NULL DEFAULT 'admit_card' CHECK (notice_type IN (
        'admit_card', 'exam_city_slip', 'provisional_result', 'final_result', 'merit_list', 'cutoff_scorecard'
      )),
      examination_id TEXT NOT NULL DEFAULT '',
      conducting_body TEXT NOT NULL DEFAULT 'OPSC',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      release_date TEXT NOT NULL DEFAULT '',
      exam_date TEXT NOT NULL DEFAULT '',
      download_url TEXT NOT NULL DEFAULT '',
      r2_key TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      cutoff_table_json TEXT NOT NULL DEFAULT '[]',
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      publish_at TEXT,
      expires_at TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_admit_type_status ON edu_admit_results(notice_type, status)`,
    `CREATE INDEX IF NOT EXISTS idx_edu_admit_body ON edu_admit_results(conducting_body, status)`,
    `CREATE TABLE IF NOT EXISTS edu_syllabi (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      examination_id TEXT NOT NULL DEFAULT '',
      class_grade_id TEXT NOT NULL DEFAULT '',
      conducting_body TEXT NOT NULL DEFAULT 'OPSC',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      exam_pattern_json TEXT NOT NULL DEFAULT '[]',
      topics_checklist_json TEXT NOT NULL DEFAULT '[]',
      r2_key TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_syllabi_body_status ON edu_syllabi(conducting_body, status)`,
    `CREATE TABLE IF NOT EXISTS edu_pyq_papers (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      examination_id TEXT NOT NULL DEFAULT '',
      class_grade_id TEXT NOT NULL DEFAULT '',
      subject_name TEXT NOT NULL DEFAULT '',
      exam_year INTEGER NOT NULL DEFAULT 2025,
      shift_or_paper TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      question_count INTEGER NOT NULL DEFAULT 0,
      duration_mins INTEGER NOT NULL DEFAULT 120,
      total_marks REAL NOT NULL DEFAULT 100,
      difficulty_level TEXT NOT NULL DEFAULT 'Moderate' CHECK (difficulty_level IN ('Easy', 'Moderate', 'Hard')),
      offline_ready INTEGER NOT NULL DEFAULT 0,
      r2_key TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      answer_key_url TEXT NOT NULL DEFAULT '',
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_pyq_year_subj ON edu_pyq_papers(exam_year DESC, subject_name, status)`,
    `CREATE TABLE IF NOT EXISTS edu_question_bank (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      pyq_paper_id TEXT,
      class_grade_id TEXT NOT NULL DEFAULT '',
      subject_name TEXT NOT NULL DEFAULT '',
      topic_name TEXT NOT NULL DEFAULT '',
      exam_tag TEXT NOT NULL DEFAULT '',
      exam_year INTEGER,
      difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
      question_en TEXT NOT NULL,
      question_or TEXT NOT NULL DEFAULT '',
      options_json TEXT NOT NULL DEFAULT '{}',
      correct_option TEXT NOT NULL DEFAULT 'A' CHECK (correct_option IN ('A', 'B', 'C', 'D')),
      explanation_en TEXT NOT NULL DEFAULT '',
      explanation_or TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_qbank_subj_diff ON edu_question_bank(subject_name, difficulty, status)`,
    `CREATE INDEX IF NOT EXISTS idx_edu_qbank_pyq ON edu_question_bank(pyq_paper_id)`,
    `CREATE TABLE IF NOT EXISTS edu_batch3_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL CHECK (module_code IN ('09', '10', '11', '12')),
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_b3_rev_entity ON edu_batch3_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  const admCnt = await db.prepare(`SELECT COUNT(*) AS n FROM edu_admit_results`).first();
  if (!admCnt || Number(admCnt.n || 0) === 0) {
    for (const a of STARTER_ADMIT_RESULTS) {
      await db.prepare(
        `INSERT OR IGNORE INTO edu_admit_results (id, slug, notice_type, examination_id, conducting_body, title_en, title_or, summary_en, summary_or, release_date, exam_date, download_url, cutoff_table_json, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(a.id, a.slug, a.notice_type, a.examination_id, a.conducting_body, a.title_en, a.title_or, a.summary_en, a.summary_or, a.release_date, a.exam_date, a.download_url, a.cutoff_table_json, a.external_links_json, a.tags_json, a.status, a.featured).run();
    }
  }

  const sylCnt = await db.prepare(`SELECT COUNT(*) AS n FROM edu_syllabi`).first();
  if (!sylCnt || Number(sylCnt.n || 0) === 0) {
    for (const s of STARTER_SYLLABI) {
      await db.prepare(
        `INSERT OR IGNORE INTO edu_syllabi (id, slug, examination_id, class_grade_id, conducting_body, title_en, title_or, summary_en, summary_or, exam_pattern_json, topics_checklist_json, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(s.id, s.slug, s.examination_id, s.class_grade_id, s.conducting_body, s.title_en, s.title_or, s.summary_en, s.summary_or, s.exam_pattern_json, s.topics_checklist_json, s.external_links_json, s.tags_json, s.status, s.featured).run();
    }
  }

  const pyqCnt = await db.prepare(`SELECT COUNT(*) AS n FROM edu_pyq_papers`).first();
  if (!pyqCnt || Number(pyqCnt.n || 0) === 0) {
    for (const p of STARTER_PYQS) {
      await db.prepare(
        `INSERT OR IGNORE INTO edu_pyq_papers (id, slug, examination_id, class_grade_id, subject_name, exam_year, shift_or_paper, title_en, title_or, summary_en, summary_or, question_count, duration_mins, total_marks, difficulty_level, offline_ready, file_url, answer_key_url, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(p.id, p.slug, p.examination_id, p.class_grade_id, p.subject_name, p.exam_year, p.shift_or_paper, p.title_en, p.title_or, p.summary_en, p.summary_or, p.question_count, p.duration_mins, p.total_marks, p.difficulty_level, p.offline_ready, p.file_url, p.answer_key_url, p.tags_json, p.status, p.featured).run();
    }
  }

  const qbCnt = await db.prepare(`SELECT COUNT(*) AS n FROM edu_question_bank`).first();
  if (!qbCnt || Number(qbCnt.n || 0) === 0) {
    for (const q of STARTER_QUESTIONS) {
      await db.prepare(
        `INSERT OR IGNORE INTO edu_question_bank (id, slug, pyq_paper_id, class_grade_id, subject_name, topic_name, exam_tag, exam_year, difficulty, question_en, question_or, options_json, correct_option, explanation_en, explanation_or, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(q.id, q.slug, q.pyq_paper_id, q.class_grade_id, q.subject_name, q.topic_name, q.exam_tag, q.exam_year, q.difficulty, q.question_en, q.question_or, q.options_json, q.correct_option, q.explanation_en, q.explanation_or, q.tags_json, q.status, q.featured).run();
    }
  }

  _b3Ready.add(db);
}

export async function getBatch3Overview(env) {
  await ensureEduResourcesBatch3Schema(env.DB);
  const [adm, syl, pyq, qbAll] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_admit_results`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_syllabi`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_pyq_papers`).first(),
    env.DB.prepare(`SELECT question_or FROM edu_question_bank`).all()
  ]);
  const qRows = qbAll.results || [];
  const biCount = qRows.filter(r => Boolean(String(r.question_or || '').trim())).length;
  return {
    admit_results: Number(adm?.n || 0),
    syllabi: Number(syl?.n || 0),
    pyqs: Number(pyq?.n || 0),
    questions: qRows.length,
    mcq_bilingual_pct: qRows.length ? Math.round((biCount / qRows.length) * 100) : 100
  };
}

// ---------- Module 09: Admit Cards & Results ----------
function formatAdmit(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    cutoff_table: parseJson(row.cutoff_table_json, []),
    external_links: parseJson(row.external_links_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

async function syncAdmitToJobsDirectory(db, item) {
  if (item.status !== 'published') return;
  try {
    await ensureJobsDirectoryStudioSchema(db);
    const now = new Date().toISOString();
    const folder = await db.prepare(`SELECT id FROM jobs_directory_folders WHERE domain_slug = 'jobs-recruitment' LIMIT 1`).first();
    const folderId = folder ? folder.id : 'folder-jobs-recruitment';
    await db.prepare(
      `INSERT INTO jobs_directory_items (
        id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body,
        exam_date, official_apply_url, links_json, tags_json, language, status, featured, summary, created_by, updated_by, created_at, updated_at
      ) VALUES (?, 'jobs-recruitment', ?, ?, ?, ?, 'job-notification', ?, ?, ?, ?, ?, 'EN+OR', 'published', ?, ?, 'edu-batch3', 'edu-batch3', ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, title_or = excluded.title_or, status = 'published', exam_date = excluded.exam_date, updated_at = excluded.updated_at`
    ).bind(
      item.id, folderId, item.title_en, item.title_or || '', item.slug, item.conducting_body || 'OPSC',
      item.exam_date || '', item.download_url || item.file_url || '', item.external_links_json || '[]',
      item.tags_json || '[]', item.featured ? 1 : 0, item.summary_en || '', now, now
    ).run();
  } catch {}
}

async function handleAdmitResults(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const noticeType = url.searchParams.get('notice_type') || '';
      const bodyFilter = url.searchParams.get('conducting_body') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (noticeType && ADMIT_NOTICE_TYPES.includes(noticeType)) { where.push('notice_type = ?'); binds.push(noticeType); }
      if (bodyFilter) { where.push('conducting_body = ?'); binds.push(bodyFilter); }
      if (status && B3_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR conducting_body LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_admit_results WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_admit_results`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatAdmit), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B3_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_admit_results SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const notice_type = ADMIT_NOTICE_TYPES.includes(body.notice_type) ? body.notice_type : 'admit_card';
      const status = B3_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'notice';
      const dup = await env.DB.prepare(`SELECT id FROM edu_admit_results WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `adm-${crypto.randomUUID().slice(0, 10)}`;
      const cutoffs = parseJson(body.cutoff_table ?? body.cutoff_table_json, []);
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_admit_results (
          id, slug, notice_type, examination_id, conducting_body, title_en, title_or, summary_en, summary_or,
          release_date, exam_date, download_url, r2_key, file_url, cutoff_table_json, external_links_json, tags_json,
          status, publish_at, expires_at, featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, notice_type, cleanStr(body.examination_id || '', 120), cleanStr(body.conducting_body || 'OPSC', 60),
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        cleanStr(body.release_date || '', 40), cleanStr(body.exam_date || '', 40), validateSafeUrl(body.download_url || ''),
        cleanStr(body.r2_key || '', 240), validateSafeUrl(body.file_url || ''), JSON.stringify(cutoffs),
        JSON.stringify(links), JSON.stringify(tags), status, cleanStr(body.publish_at || '', 40) || null,
        cleanStr(body.expires_at || '', 40) || null, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_admit_results WHERE id = ?`).bind(newId).first();
      await saveB3Revision(env.DB, '09', newId, created, 'Created admit/result notice', actor.email);
      await syncAdmitToJobsDirectory(env.DB, created);
      await audit(env, request, actor, 'edu.admit_result.create', 'edu_admit_results', newId);
      return json({ ok: true, item: formatAdmit(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_admit_results WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Admit/Result notice not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch3_revisions WHERE module_code = '09' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatAdmit(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const notice_type = ADMIT_NOTICE_TYPES.includes(body.notice_type) ? body.notice_type : existing.notice_type;
    const status = B3_STATUSES.includes(body.status) ? body.status : existing.status;
    const cutoffs = body.cutoff_table !== undefined || body.cutoff_table_json !== undefined ? parseJson(body.cutoff_table ?? body.cutoff_table_json, []) : parseJson(existing.cutoff_table_json, []);
    const links = body.external_links !== undefined ? sanitizeLinks(body.external_links) : parseJson(existing.external_links_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_admit_results SET notice_type = ?, examination_id = ?, conducting_body = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?,
       release_date = ?, exam_date = ?, download_url = ?, r2_key = ?, file_url = ?, cutoff_table_json = ?, external_links_json = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      notice_type, cleanStr(body.examination_id ?? existing.examination_id, 120), cleanStr(body.conducting_body ?? existing.conducting_body, 60),
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      cleanStr(body.release_date ?? existing.release_date, 40), cleanStr(body.exam_date ?? existing.exam_date, 40),
      validateSafeUrl(body.download_url ?? existing.download_url), cleanStr(body.r2_key ?? existing.r2_key, 240),
      validateSafeUrl(body.file_url ?? existing.file_url), JSON.stringify(cutoffs), JSON.stringify(links), JSON.stringify(tags),
      status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_admit_results WHERE id = ?`).bind(id).first();
    await saveB3Revision(env.DB, '09', id, updated, body.change_note || 'Updated admit/result', actor.email);
    await syncAdmitToJobsDirectory(env.DB, updated);
    return json({ ok: true, item: formatAdmit(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `adm-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_admit_results (id, slug, notice_type, examination_id, conducting_body, title_en, title_or, summary_en, summary_or, release_date, exam_date, download_url, r2_key, file_url, cutoff_table_json, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.notice_type, existing.examination_id, existing.conducting_body, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.release_date, existing.exam_date, existing.download_url, existing.r2_key, existing.file_url, existing.cutoff_table_json, existing.external_links_json, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_admit_results WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatAdmit(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch3_revisions WHERE id = ? AND module_code = '09' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(
        `UPDATE edu_admit_results SET title_en = ?, title_or = ?, cutoff_table_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(snap.title_en, snap.title_or || '', snap.cutoff_table_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_admit_results WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatAdmit(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B3_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE edu_admit_results SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_admit_results WHERE id = ?`).bind(id).first();
    await syncAdmitToJobsDirectory(env.DB, patched);
    return json({ ok: true, item: formatAdmit(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_admit_results WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 10: Syllabus & Exam Patterns + Coverage Heatmap ----------
async function computeSyllabusCoverage(db, topicsChecklist) {
  const topics = Array.isArray(topicsChecklist) ? topicsChecklist : [];
  if (!topics.length) return { total_topics: 0, covered_topics: 0, coverage_pct: 0, details: [] };
  const [{ results: notesRows }, { results: pyqRows }, { results: qbRows }] = await Promise.all([
    db.prepare(`SELECT title_en, subject_name, topic_name, tags_json FROM edu_resources WHERE status = 'published'`).all(),
    db.prepare(`SELECT title_en, subject_name, tags_json FROM edu_pyq_papers WHERE status = 'published'`).all(),
    db.prepare(`SELECT subject_name, topic_name, tags_json FROM edu_question_bank WHERE status = 'published'`).all()
  ]);

  let covered = 0;
  const details = topics.map(t => {
    const subj = String(t.subject_name || '').toLowerCase().trim();
    const title = String(t.title_en || '').toLowerCase().trim();
    const hasNotes = (notesRows || []).some(r => (subj && String(r.subject_name || '').toLowerCase().includes(subj)) || (title && String(r.title_en || '').toLowerCase().includes(title)));
    const hasPyq = (pyqRows || []).some(r => (subj && String(r.subject_name || '').toLowerCase().includes(subj)) || (title && String(r.title_en || '').toLowerCase().includes(title)));
    const hasQb = (qbRows || []).some(r => (subj && String(r.subject_name || '').toLowerCase().includes(subj)) || (title && String(r.topic_name || '').toLowerCase().includes(title)));
    const isCovered = hasNotes || hasPyq || hasQb;
    if (isCovered) covered++;
    return { ...t, has_notes: hasNotes, has_pyq: hasPyq, has_questions: hasQb, covered: isCovered };
  });
  return {
    total_topics: topics.length,
    covered_topics: covered,
    coverage_pct: Math.round((covered / topics.length) * 100),
    details
  };
}

function formatSyllabus(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    exam_pattern: parseJson(row.exam_pattern_json, []),
    topics_checklist: parseJson(row.topics_checklist_json, []),
    external_links: parseJson(row.external_links_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleSyllabi(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B3_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR conducting_body LIKE ? ESCAPE '\\')`);
        binds.push(l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_syllabi WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC`).bind(...binds).all();
      const items = [];
      for (const r of results || []) {
        const f = formatSyllabus(r);
        f.heatmap = await computeSyllabusCoverage(env.DB, f.topics_checklist);
        items.push(f);
      }
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_syllabi`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items, counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B3_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_syllabi SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const status = B3_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'syllabus';
      const dup = await env.DB.prepare(`SELECT id FROM edu_syllabi WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `syl-${crypto.randomUUID().slice(0, 10)}`;
      const pattern = parseJson(body.exam_pattern ?? body.exam_pattern_json, []);
      const checklist = parseJson(body.topics_checklist ?? body.topics_checklist_json, []);
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_syllabi (id, slug, examination_id, class_grade_id, conducting_body, title_en, title_or, summary_en, summary_or, exam_pattern_json, topics_checklist_json, r2_key, file_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.examination_id || '', 120), cleanStr(body.class_grade_id || '', 120),
        cleanStr(body.conducting_body || 'OPSC', 60), title_en, cleanStr(body.title_or || '', 220),
        cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        JSON.stringify(pattern), JSON.stringify(checklist), cleanStr(body.r2_key || '', 240),
        validateSafeUrl(body.file_url || ''), JSON.stringify(links), JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_syllabi WHERE id = ?`).bind(newId).first();
      await saveB3Revision(env.DB, '10', newId, created, 'Created syllabus', actor.email);
      const formatted = formatSyllabus(created);
      formatted.heatmap = await computeSyllabusCoverage(env.DB, formatted.topics_checklist);
      return json({ ok: true, item: formatted }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_syllabi WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Syllabus not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch3_revisions WHERE module_code = '10' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    const formatted = formatSyllabus(existing);
    formatted.heatmap = await computeSyllabusCoverage(env.DB, formatted.topics_checklist);
    return json({ ok: true, item: formatted, revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const pattern = body.exam_pattern !== undefined ? parseJson(body.exam_pattern, []) : parseJson(existing.exam_pattern_json, []);
    const checklist = body.topics_checklist !== undefined ? parseJson(body.topics_checklist, []) : parseJson(existing.topics_checklist_json, []);
    const links = body.external_links !== undefined ? sanitizeLinks(body.external_links) : parseJson(existing.external_links_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    const status = B3_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE edu_syllabi SET conducting_body = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, exam_pattern_json = ?, topics_checklist_json = ?, r2_key = ?, file_url = ?, external_links_json = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.conducting_body ?? existing.conducting_body, 60), cleanStr(body.title_en ?? existing.title_en, 220),
      cleanStr(body.title_or ?? existing.title_or, 220), cleanStr(body.summary_en ?? existing.summary_en, 1000),
      cleanStr(body.summary_or ?? existing.summary_or, 1000), JSON.stringify(pattern), JSON.stringify(checklist),
      cleanStr(body.r2_key ?? existing.r2_key, 240), validateSafeUrl(body.file_url ?? existing.file_url),
      JSON.stringify(links), JSON.stringify(tags), status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_syllabi WHERE id = ?`).bind(id).first();
    await saveB3Revision(env.DB, '10', id, updated, body.change_note || 'Updated syllabus', actor.email);
    const formatted = formatSyllabus(updated);
    formatted.heatmap = await computeSyllabusCoverage(env.DB, formatted.topics_checklist);
    return json({ ok: true, item: formatted });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `syl-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_syllabi (id, slug, examination_id, class_grade_id, conducting_body, title_en, title_or, summary_en, summary_or, exam_pattern_json, topics_checklist_json, r2_key, file_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.examination_id, existing.class_grade_id, existing.conducting_body, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.exam_pattern_json, existing.topics_checklist_json, existing.r2_key, existing.file_url, existing.external_links_json, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_syllabi WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatSyllabus(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch3_revisions WHERE id = ? AND module_code = '10' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_syllabi SET title_en = ?, exam_pattern_json = ?, topics_checklist_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.exam_pattern_json || '[]', snap.topics_checklist_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_syllabi WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatSyllabus(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B3_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE edu_syllabi SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_syllabi WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatSyllabus(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_syllabi WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 11: Previous Year Questions + PYQ-to-Question-Bank Parser ----------
function formatPyq(row) {
  if (!row) return null;
  return {
    ...row,
    offline_ready: Boolean(row.offline_ready),
    featured: Boolean(row.featured),
    external_links: parseJson(row.external_links_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

function parseRawMcqBlocks(rawText) {
  const blocks = String(rawText || '').replace(/\r\n/g, '\n').split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
  const parsed = [];
  for (const blk of blocks) {
    const lines = blk.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 5) continue;
    const qLine = lines[0].replace(/^(?:Q\d*[\).:]|\d+[\).:])\s*/i, '').trim();
    const opts = { A_en: '', A_or: '', B_en: '', B_or: '', C_en: '', C_or: '', D_en: '', D_or: '' };
    let ans = 'A';
    let exp = '';
    for (const ln of lines.slice(1)) {
      const mOpt = ln.match(/^([A-D])[\).:]\s*(.+)$/i);
      if (mOpt) { opts[`${mOpt[1].toUpperCase()}_en`] = mOpt[2].trim(); continue; }
      const mAns = ln.match(/^(?:Answer|Ans)\s*:\s*([A-D])/i);
      if (mAns) { ans = mAns[1].toUpperCase(); continue; }
      const mExp = ln.match(/^(?:Explanation|Exp)\s*:\s*(.+)$/i);
      if (mExp) { exp = mExp[1].trim(); }
    }
    if (qLine && opts.A_en && opts.B_en) {
      parsed.push({ question_en: qLine, options: opts, correct_option: ans, explanation_en: exp });
    }
  }
  return parsed;
}

async function handlePyqs(request, env, actor, id) {
  const method = request.method;
  if (id === 'parse-to-bank' && method === 'POST') {
    const body = await readJson(request, 500_000);
    const pyqId = cleanStr(body.pyq_paper_id || '', 120) || null;
    const rawText = String(body.raw_text || '');
    const parsedList = parseRawMcqBlocks(rawText);
    if (!parsedList.length) throw validationError({ raw_text: 'No valid MCQ blocks found (use Q1. / A) B) C) D) / Answer: A)' });
    const subject = cleanStr(body.subject_name || 'General Studies', 120);
    const examTag = cleanStr(body.exam_tag || 'Odisha Exam', 100);
    const examYear = Number(body.exam_year || 2025) || 2025;
    const inserted = [];
    for (const q of parsedList.slice(0, 100)) {
      const qId = `qb-${crypto.randomUUID().slice(0, 10)}`;
      const qSlug = `${slugify(q.question_en).slice(0, 80)}-${crypto.randomUUID().slice(0, 4)}`;
      await env.DB.prepare(
        `INSERT INTO edu_question_bank (id, slug, pyq_paper_id, subject_name, exam_tag, exam_year, difficulty, question_en, options_json, correct_option, explanation_en, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Medium', ?, ?, ?, ?, 'published')`
      ).bind(qId, qSlug, pyqId, subject, examTag, examYear, q.question_en, JSON.stringify(q.options), q.correct_option, q.explanation_en).run();
      inserted.push({ id: qId, question_en: q.question_en, correct_option: q.correct_option });
    }
    await audit(env, request, actor, 'edu.pyq.parse_to_bank', 'edu_question_bank', pyqId, { inserted: inserted.length });
    return json({ ok: true, inserted_count: inserted.length, items: inserted }, 201);
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const year = url.searchParams.get('exam_year') || '';
      const subj = (url.searchParams.get('subject_name') || '').trim();
      const diff = url.searchParams.get('difficulty_level') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (year) { where.push('exam_year = ?'); binds.push(Number(year)); }
      if (subj) { where.push('subject_name = ?'); binds.push(subj); }
      if (diff && PYQ_DIFFICULTIES.includes(diff)) { where.push('difficulty_level = ?'); binds.push(diff); }
      if (status && B3_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title_en LIKE ? ESCAPE '\\' OR subject_name LIKE ? ESCAPE '\\')`);
        binds.push(l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_pyq_papers WHERE ${where.join(' AND ')} ORDER BY exam_year DESC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_pyq_papers`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatPyq), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B3_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_pyq_papers SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const status = B3_STATUSES.includes(body.status) ? body.status : 'draft';
      const diff = PYQ_DIFFICULTIES.includes(body.difficulty_level) ? body.difficulty_level : 'Moderate';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'pyq';
      const dup = await env.DB.prepare(`SELECT id FROM edu_pyq_papers WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `pyq-${crypto.randomUUID().slice(0, 10)}`;
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_pyq_papers (id, slug, examination_id, class_grade_id, subject_name, exam_year, shift_or_paper, title_en, title_or, summary_en, summary_or, question_count, duration_mins, total_marks, difficulty_level, offline_ready, r2_key, file_url, answer_key_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, cleanStr(body.examination_id || '', 120), cleanStr(body.class_grade_id || '', 120),
        cleanStr(body.subject_name || '', 120), Number(body.exam_year || 2025) || 2025, cleanStr(body.shift_or_paper || '', 80),
        title_en, cleanStr(body.title_or || '', 220), cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        Number(body.question_count || 0) || 0, Number(body.duration_mins || 120) || 120, Number(body.total_marks || 100) || 100,
        diff, body.offline_ready ? 1 : 0, cleanStr(body.r2_key || '', 240), validateSafeUrl(body.file_url || ''),
        validateSafeUrl(body.answer_key_url || ''), JSON.stringify(links), JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_pyq_papers WHERE id = ?`).bind(newId).first();
      await saveB3Revision(env.DB, '11', newId, created, 'Created PYQ paper', actor.email);
      return json({ ok: true, item: formatPyq(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_pyq_papers WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'PYQ paper not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch3_revisions WHERE module_code = '11' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatPyq(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const status = B3_STATUSES.includes(body.status) ? body.status : existing.status;
    const diff = PYQ_DIFFICULTIES.includes(body.difficulty_level) ? body.difficulty_level : existing.difficulty_level;
    await env.DB.prepare(
      `UPDATE edu_pyq_papers SET subject_name = ?, exam_year = ?, shift_or_paper = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, question_count = ?, duration_mins = ?, total_marks = ?, difficulty_level = ?, offline_ready = ?, r2_key = ?, file_url = ?, answer_key_url = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.subject_name ?? existing.subject_name, 120), Number(body.exam_year ?? existing.exam_year),
      cleanStr(body.shift_or_paper ?? existing.shift_or_paper, 80), cleanStr(body.title_en ?? existing.title_en, 220),
      cleanStr(body.title_or ?? existing.title_or, 220), cleanStr(body.summary_en ?? existing.summary_en, 1000),
      cleanStr(body.summary_or ?? existing.summary_or, 1000), Number(body.question_count ?? existing.question_count),
      Number(body.duration_mins ?? existing.duration_mins), Number(body.total_marks ?? existing.total_marks),
      diff, body.offline_ready !== undefined ? (body.offline_ready ? 1 : 0) : existing.offline_ready,
      cleanStr(body.r2_key ?? existing.r2_key, 240), validateSafeUrl(body.file_url ?? existing.file_url),
      validateSafeUrl(body.answer_key_url ?? existing.answer_key_url), status,
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_pyq_papers WHERE id = ?`).bind(id).first();
    await saveB3Revision(env.DB, '11', id, updated, body.change_note || 'Updated PYQ', actor.email);
    return json({ ok: true, item: formatPyq(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `pyq-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_pyq_papers (id, slug, examination_id, class_grade_id, subject_name, exam_year, shift_or_paper, title_en, title_or, summary_en, summary_or, question_count, duration_mins, total_marks, difficulty_level, offline_ready, r2_key, file_url, answer_key_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.examination_id, existing.class_grade_id, existing.subject_name, existing.exam_year, existing.shift_or_paper, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.question_count, existing.duration_mins, existing.total_marks, existing.difficulty_level, existing.offline_ready, existing.r2_key, existing.file_url, existing.answer_key_url, existing.external_links_json, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_pyq_papers WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatPyq(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch3_revisions WHERE id = ? AND module_code = '11' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_pyq_papers SET title_en = ?, exam_year = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, Number(snap.exam_year || 2025), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_pyq_papers WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatPyq(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B3_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE edu_pyq_papers SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_pyq_papers WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatPyq(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_pyq_papers WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 12: Question Bank ----------
function formatQuestion(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    options: parseJson(row.options_json, {}),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleQuestions(request, env, actor, id) {
  const method = request.method;
  if (id === 'import' && method === 'POST') {
    const body = await readJson(request, 1_500_000);
    const dryRun = Boolean(body.dry_run);
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) throw validationError({ items: 'Provide a non-empty items array' });

    const { results: existingQs } = await env.DB.prepare(`SELECT LOWER(TRIM(question_en)) AS q FROM edu_question_bank`).all();
    const seen = new Set((existingQs || []).map(r => r.q));

    const valid = [];
    const duplicates = [];
    const errors = [];

    rawItems.slice(0, 200).forEach((entry, idx) => {
      const qEn = cleanStr(entry.question_en || '', 1000);
      if (!qEn) { errors.push({ row: idx + 1, error: 'Missing question_en' }); return; }
      const norm = qEn.toLowerCase();
      if (seen.has(norm)) { duplicates.push({ row: idx + 1, question_en: qEn }); return; }
      seen.add(norm);
      const opt = QB_OPTIONS.includes(String(entry.correct_option || 'A').toUpperCase()) ? String(entry.correct_option).toUpperCase() : 'A';
      valid.push({
        question_en: qEn,
        question_or: cleanStr(entry.question_or || '', 1000),
        subject_name: cleanStr(entry.subject_name || 'General Studies', 120),
        topic_name: cleanStr(entry.topic_name || '', 120),
        exam_tag: cleanStr(entry.exam_tag || '', 100),
        difficulty: QB_DIFFICULTIES.includes(entry.difficulty) ? entry.difficulty : 'Medium',
        options_json: JSON.stringify(entry.options || { A_en: entry.A_en || '', B_en: entry.B_en || '', C_en: entry.C_en || '', D_en: entry.D_en || '' }),
        correct_option: opt,
        explanation_en: cleanStr(entry.explanation_en || '', 1000),
        explanation_or: cleanStr(entry.explanation_or || '', 1000),
        status: ['draft', 'published', 'archived'].includes(entry.status) ? entry.status : 'published'
      });
    });

    if (dryRun) {
      return json({ ok: true, dry_run: true, valid_count: valid.length, duplicate_count: duplicates.length, error_count: errors.length, duplicates, errors });
    }
    let imported = 0;
    for (const q of valid) {
      const qId = `qb-${crypto.randomUUID().slice(0, 10)}`;
      const qSlug = `${slugify(q.question_en).slice(0, 80)}-${crypto.randomUUID().slice(0, 4)}`;
      await env.DB.prepare(
        `INSERT INTO edu_question_bank (id, slug, subject_name, topic_name, exam_tag, difficulty, question_en, question_or, options_json, correct_option, explanation_en, explanation_or, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(qId, qSlug, q.subject_name, q.topic_name, q.exam_tag, q.difficulty, q.question_en, q.question_or, q.options_json, q.correct_option, q.explanation_en, q.explanation_or, q.status).run();
      imported++;
    }
    await audit(env, request, actor, 'edu.qbank.import', 'edu_question_bank', null, { imported, duplicate_count: duplicates.length });
    return json({ ok: true, imported, duplicate_count: duplicates.length, error_count: errors.length }, 201);
  }

  if (id === 'export' && method === 'GET') {
    const { results } = await env.DB.prepare(`SELECT * FROM edu_question_bank ORDER BY updated_at DESC`).all();
    return json({ ok: true, count: (results || []).length, items: (results || []).map(formatQuestion) });
  }

  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const subj = (url.searchParams.get('subject_name') || '').trim();
      const diff = url.searchParams.get('difficulty') || '';
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (subj) { where.push('subject_name = ?'); binds.push(subj); }
      if (diff && QB_DIFFICULTIES.includes(diff)) { where.push('difficulty = ?'); binds.push(diff); }
      if (status && ['draft', 'published', 'archived'].includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(question_en LIKE ? ESCAPE '\\' OR question_or LIKE ? ESCAPE '\\' OR topic_name LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_question_bank WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC LIMIT 200`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_question_bank`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatQuestion), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !['draft', 'published', 'archived'].includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_question_bank SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const question_en = cleanStr(body.question_en || '', 1000);
      if (!question_en) throw validationError({ question_en: 'question_en is required' });
      const correct = QB_OPTIONS.includes(String(body.correct_option || 'A').toUpperCase()) ? String(body.correct_option).toUpperCase() : 'A';
      const diff = QB_DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'Medium';
      const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
      const newId = `qb-${crypto.randomUUID().slice(0, 10)}`;
      const slug = `${slugify(question_en).slice(0, 80)}-${crypto.randomUUID().slice(0, 4)}`;
      const opts = parseJson(body.options ?? body.options_json, {});
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_question_bank (id, slug, pyq_paper_id, class_grade_id, subject_name, topic_name, exam_tag, exam_year, difficulty, question_en, question_or, options_json, correct_option, explanation_en, explanation_or, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, slug, cleanStr(body.pyq_paper_id || '', 120) || null, cleanStr(body.class_grade_id || '', 120),
        cleanStr(body.subject_name || '', 120), cleanStr(body.topic_name || '', 120), cleanStr(body.exam_tag || '', 100),
        body.exam_year ? Number(body.exam_year) : null, diff, question_en, cleanStr(body.question_or || '', 1000),
        JSON.stringify(opts), correct, cleanStr(body.explanation_en || '', 1000), cleanStr(body.explanation_or || '', 1000),
        JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_question_bank WHERE id = ?`).bind(newId).first();
      await saveB3Revision(env.DB, '12', newId, created, 'Created question', actor.email);
      return json({ ok: true, item: formatQuestion(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_question_bank WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Question not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch3_revisions WHERE module_code = '12' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatQuestion(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const correct = QB_OPTIONS.includes(String(body.correct_option ?? existing.correct_option).toUpperCase()) ? String(body.correct_option ?? existing.correct_option).toUpperCase() : existing.correct_option;
    const diff = QB_DIFFICULTIES.includes(body.difficulty) ? body.difficulty : existing.difficulty;
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : existing.status;
    const opts = body.options !== undefined ? parseJson(body.options, {}) : parseJson(existing.options_json, {});
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_question_bank SET subject_name = ?, topic_name = ?, exam_tag = ?, difficulty = ?, question_en = ?, question_or = ?, options_json = ?, correct_option = ?, explanation_en = ?, explanation_or = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.subject_name ?? existing.subject_name, 120), cleanStr(body.topic_name ?? existing.topic_name, 120),
      cleanStr(body.exam_tag ?? existing.exam_tag, 100), diff, cleanStr(body.question_en ?? existing.question_en, 1000),
      cleanStr(body.question_or ?? existing.question_or, 1000), JSON.stringify(opts), correct,
      cleanStr(body.explanation_en ?? existing.explanation_en, 1000), cleanStr(body.explanation_or ?? existing.explanation_or, 1000),
      JSON.stringify(tags), status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_question_bank WHERE id = ?`).bind(id).first();
    await saveB3Revision(env.DB, '12', id, updated, body.change_note || 'Updated question', actor.email);
    return json({ ok: true, item: formatQuestion(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `qb-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_question_bank (id, slug, pyq_paper_id, class_grade_id, subject_name, topic_name, exam_tag, exam_year, difficulty, question_en, question_or, options_json, correct_option, explanation_en, explanation_or, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.pyq_paper_id, existing.class_grade_id, existing.subject_name, existing.topic_name, existing.exam_tag, existing.exam_year, existing.difficulty, `${existing.question_en} (Copy)`, existing.question_or, existing.options_json, existing.correct_option, existing.explanation_en, existing.explanation_or, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_question_bank WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatQuestion(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch3_revisions WHERE id = ? AND module_code = '12' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_question_bank SET question_en = ?, question_or = ?, options_json = ?, correct_option = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.question_en, snap.question_or || '', snap.options_json || '{}', snap.correct_option || 'A', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_question_bank WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatQuestion(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && ['draft', 'published', 'archived'].includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE edu_question_bank SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_question_bank WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatQuestion(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_question_bank WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleEduBatch3Admin(request, env, actor, sub, extra) {
  await ensureEduResourcesBatch3Schema(env.DB);
  if (sub === 'admit-results') return await handleAdmitResults(request, env, actor, extra);
  if (sub === 'syllabi') return await handleSyllabi(request, env, actor, extra);
  if (sub === 'pyqs') return await handlePyqs(request, env, actor, extra);
  if (sub === 'questions') return await handleQuestions(request, env, actor, extra);
  return null;
}

// ---------- Public Cached Endpoints ----------
export async function handlePublicEduAdmitResultsApi(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
  await ensureEduResourcesBatch3Schema(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT * FROM edu_admit_results WHERE status = 'published' ORDER BY featured DESC, updated_at DESC LIMIT 50`
  ).all();
  return json({ ok: true, count: (results || []).length, items: (results || []).map(formatAdmit) }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
}

export async function handlePublicEduSyllabiApi(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
  await ensureEduResourcesBatch3Schema(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT * FROM edu_syllabi WHERE status = 'published' ORDER BY featured DESC, updated_at DESC LIMIT 50`
  ).all();
  return json({ ok: true, count: (results || []).length, items: (results || []).map(formatSyllabus) }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
}

export async function handlePublicEduPyqsApi(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
  await ensureEduResourcesBatch3Schema(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT * FROM edu_pyq_papers WHERE status = 'published' ORDER BY exam_year DESC, updated_at DESC LIMIT 50`
  ).all();
  return json({ ok: true, count: (results || []).length, items: (results || []).map(formatPyq) }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
}
