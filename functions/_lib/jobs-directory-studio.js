// Jobs & Careers Directory Suite — Shared 4-Layer D1 Multi-Level Engine
// Modules #01-#08:
//   #01 jobs-recruitment       — Jobs & Recruitment
//   #02 career-explorer        — Career Explorer
//   #03 eligibility-explorer   — Eligibility & Qualification Explorer
//   #04 courses-exams          — Courses, Entrance Exams & Certifications
//   #05 scholarships-support   — Scholarships & Financial Support
//   #06 international-overseas — International & Overseas Opportunities
//   #07 career-employability   — Career Development & Employability
//   #08 institutions-portals   — Institutions, Official Portals & Verification
import { HttpError, json, readJson, validationError } from './http.js';
import { ensureLiveOdishaDirectoryContentSeeded } from './odisha-directory-seed.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape } from './validate.js';
import { enrichJobsRecruitmentCategory01 } from './jobs-recruitment-cat01-enrichment.js';
import { enrichCareerExplorerCategory02 } from './jobs-career-cat02-enrichment.js';
import { enrichEligibilityExplorerCategory03 } from './jobs-eligibility-cat03-enrichment.js';
import { enrichCoursesExamsCategory04 } from './jobs-courses-cat04-enrichment.js';
import { enrichScholarshipsCategory05 } from './jobs-scholarships-cat05-enrichment.js';
import { enrichInternationalCategory06 } from './jobs-international-cat06-enrichment.js';
import { enrichCareerDevelopmentCategory07 } from './jobs-employability-cat07-enrichment.js';
import { enrichInstitutionsPortalsCategory08 } from './jobs-institutions-cat08-enrichment.js';

export { enrichJobsRecruitmentCategory01, enrichCareerExplorerCategory02, enrichEligibilityExplorerCategory03, enrichCoursesExamsCategory04, enrichScholarshipsCategory05, enrichInternationalCategory06, enrichCareerDevelopmentCategory07, enrichInstitutionsPortalsCategory08 };

export const JOBS_DOMAINS = [
  'jobs-recruitment',
  'career-explorer',
  'eligibility-explorer',
  'courses-exams',
  'scholarships-support',
  'international-overseas',
  'career-employability',
  'institutions-portals'
];

export const JOBS_DOMAIN_META = {
  'jobs-recruitment': {
    num: '01',
    title: 'Jobs & Recruitment',
    publicPath: '/jobs/',
    summary: 'Odisha Government (OPSC, OSSC, OSSSC, Police, Teaching), Central Govt, PSU, Banking & Private Sector notifications.'
  },
  'career-explorer': {
    num: '02',
    title: 'Career Explorer',
    publicPath: '/jobs/careers/',
    summary: 'Structured career roadmaps across Civil Services, Engineering, Healthcare, Education, Digital Tech & Skilled Trades.'
  },
  'eligibility-explorer': {
    num: '03',
    title: 'Eligibility & Qualification Explorer',
    publicPath: '/jobs/eligibility/',
    summary: 'Qualification-first opportunity finder by 10th/12th, ITI/Diploma, Graduate, PG, Age Limit & Reservation rules.'
  },
  'courses-exams': {
    num: '04',
    title: 'Courses, Entrance Exams & Certifications',
    publicPath: '/jobs/courses-exams/',
    summary: 'OJEE, NEET, JEE, GATE, CAT, UGC-NET, ITI/Polytechnic, OSDA & NSQF skill certification pathways.'
  },
  'scholarships-support': {
    num: '05',
    title: 'Scholarships & Financial Support',
    publicPath: '/jobs/scholarships/',
    summary: 'Odisha State Scholarship Portal, Post-Matric, Pre-Matric, Gopabandhu & Central scholarship schemes.'
  },
  'international-overseas': {
    num: '06',
    title: 'International & Overseas Opportunities',
    publicPath: '/jobs/overseas/',
    summary: 'Verified overseas fellowships, MEA Pravasi Bharatiya guidance, skilled migration & international study tracks.'
  },
  'career-employability': {
    num: '07',
    title: 'Career Development & Employability',
    publicPath: '/jobs/employability/',
    summary: 'Resume building, interview prep, NAPS/NATS apprenticeships, District Employment Exchange & soft-skills toolkits.'
  },
  'institutions-portals': {
    num: '08',
    title: 'Institutions, Official Portals & Verification',
    publicPath: '/jobs/portals/',
    summary: 'Official recruitment commission portals, Odisha universities, skill centres & anti-fraud verification directory.'
  }
};

export const JOBS_ITEM_TYPES = [
  'job-notification',
  'career-guide',
  'eligibility-matrix',
  'course-exam',
  'scholarship',
  'overseas-track',
  'employability-guide',
  'official-portal'
];

export const JOBS_STATUSES = ['draft', 'in_review', 'published', 'archived'];
export const JOBS_LANGUAGES = ['EN', 'OR', 'EN+OR'];
export const JOBS_SUGGESTION_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];

function nowIso() {
  return new Date().toISOString();
}

export function validateSafeCtaUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_CTA_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_CTA_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_CTA_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

function sanitizeEditorialHtml(raw, maxLen = 50000) {
  if (raw === undefined || raw === null) return '';
  let s = String(raw);
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '');
  s = s.replace(/javascript\s*:/gi, '');
  return s.trim().slice(0, maxLen);
}

export function redactPii(raw) {
  let s = String(raw || '');
  // Aadhaar-like 12-digit sequences
  s = s.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED-AADHAAR]');
  // PAN-like sequences
  s = s.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[REDACTED-PAN]');
  // Indian mobile numbers
  s = s.replace(/(?:\+91[\s-]?)?[6-9]\d{9}\b/g, '[REDACTED-PHONE]');
  // Email addresses
  s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED-EMAIL]');
  return s;
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
  return [...new Set(arr.map(x => cleanStr(x, 40)).filter(Boolean))].slice(0, 12);
}

function sanitizeAttachments(raw) {
  const list = parseJsonArray(raw);
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const url = validateSafeCtaUrl(item.url);
    if (!url) continue;
    out.push({
      name: cleanStr(item.name || item.title, 140) || 'Official PDF',
      url,
      size: Number.isFinite(Number(item.size)) ? Math.max(0, Number(item.size)) : 0,
      contentType: cleanStr(item.contentType || 'application/pdf', 80)
    });
    if (out.length >= 10) break;
  }
  return out;
}

function sanitizeLinks(raw) {
  const list = parseJsonArray(raw);
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const url = validateSafeCtaUrl(item.url);
    if (!url) continue;
    out.push({
      label: cleanStr(item.label, 120) || 'Official Link',
      url
    });
    if (out.length >= 15) break;
  }
  return out;
}

async function purgeJobsDirectoryCache(env) {
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const origin = (env && env.PUBLIC_ORIGIN) || 'https://csodisha.com';
      const paths = [
        '/jobs/',
        '/jobs-careers/',
        '/api/public/jobs-directory/overview',
        '/api/public/jobs-directory/items',
        '/api/content/jobs-directory',
        '/sitemap-jobs.xml'
      ];
      await Promise.allSettled(paths.map(p => caches.default.delete(new Request(origin + p))));
    }
  } catch {
    // Non-fatal in local/test runtimes
  }
}

async function runBatched(db, statements, chunkSize = 45) {
  for (let i = 0; i < statements.length; i += chunkSize) {
    await db.batch(statements.slice(i, i + chunkSize));
  }
}

async function addMissingColumns(db, table, columns) {
  const info = await db.prepare(`PRAGMA table_info(${table})`).all();
  const existing = new Set((info.results || []).map(r => r.name));
  for (const [colName, colDef] of columns) {
    if (!existing.has(colName)) {
      await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`).run();
    }
  }
}

// Seed depth 1 -> 2 -> 3 Odisha & national Jobs/Careers hierarchy for Modules #01-#04
const SEED_TREE_BY_DOMAIN = {};

const SEED_ITEMS_BY_DOMAIN = {};

const _schemaReady = new WeakSet();

export async function ensureJobsDirectoryStudioSchema(db) {
  if (!db) throw new Error('D1 database binding is required');
  if (_schemaReady.has(db)) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs_directory_folders (
      id TEXT PRIMARY KEY,
      domain_slug TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      depth INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 10,
      is_published INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      intro_html TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      hero_badge TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(domain_slug, slug)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs_directory_items (
      id TEXT PRIMARY KEY,
      domain_slug TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      item_type TEXT NOT NULL DEFAULT 'job-notification',
      recruiting_body TEXT NOT NULL DEFAULT '',
      qualification_tag TEXT NOT NULL DEFAULT '',
      vacancies TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      deadline_date TEXT NOT NULL DEFAULT '',
      exam_date TEXT NOT NULL DEFAULT '',
      official_apply_url TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      cover_image_alt TEXT NOT NULL DEFAULT '',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'EN',
      status TEXT NOT NULL DEFAULT 'draft',
      featured INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      body_html TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      verified_by TEXT,
      verified_at TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs_directory_revisions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs_directory_suggestions (
      id TEXT PRIMARY KEY,
      domain_slug TEXT NOT NULL,
      folder_id TEXT,
      item_id TEXT,
      reporter_name TEXT NOT NULL DEFAULT 'Citizen',
      category TEXT NOT NULL DEFAULT 'correction',
      message TEXT NOT NULL,
      suggested_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      moderator_note TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
  ]);

  await addMissingColumns(db, 'jobs_directory_folders', [
    ['description', "TEXT NOT NULL DEFAULT ''"],
    ['description_en', "TEXT NOT NULL DEFAULT ''"],
    ['intro_html', "TEXT NOT NULL DEFAULT ''"],
    ['seo_title', "TEXT NOT NULL DEFAULT ''"],
    ['seo_description', "TEXT NOT NULL DEFAULT ''"],
    ['hero_badge', "TEXT NOT NULL DEFAULT ''"],
    ['featured_badge', "TEXT NOT NULL DEFAULT ''"],
    ['verified_at', 'TEXT'],
    ['title_or', "TEXT NOT NULL DEFAULT ''"],
    ['description_or', "TEXT NOT NULL DEFAULT ''"],
    ['legacy_node_id', 'TEXT'],
    ['legacy_code', 'TEXT'],
    ['updated_by', "TEXT NOT NULL DEFAULT 'system'"]
  ]);

  await addMissingColumns(db, 'jobs_directory_items', [
    ['recruiting_body', "TEXT NOT NULL DEFAULT ''"],
    ['conducting_body', "TEXT NOT NULL DEFAULT ''"],
    ['exam_code', "TEXT NOT NULL DEFAULT ''"],
    ['cadre_group', "TEXT NOT NULL DEFAULT ''"],
    ['pay_matrix', "TEXT NOT NULL DEFAULT ''"],
    ['age_limit_relaxation', "TEXT NOT NULL DEFAULT ''"],
    ['qualification_odia_rule', "TEXT NOT NULL DEFAULT ''"],
    ['selection_stages', "TEXT NOT NULL DEFAULT ''"],
    ['pst_pet_skill_norms', "TEXT NOT NULL DEFAULT ''"],
    ['documents_checklist', "TEXT NOT NULL DEFAULT ''"],
    ['application_steps', "TEXT NOT NULL DEFAULT ''"],
    ['academic_pathways', "TEXT NOT NULL DEFAULT ''"],
    ['premier_institutions', "TEXT NOT NULL DEFAULT ''"],
    ['entrance_licensing', "TEXT NOT NULL DEFAULT ''"],
    ['skills_certifications', "TEXT NOT NULL DEFAULT ''"],
    ['salary_progression', "TEXT NOT NULL DEFAULT ''"],
    ['career_ladder', "TEXT NOT NULL DEFAULT ''"],
    ['qualification_tag', "TEXT NOT NULL DEFAULT ''"],
    ['vacancies', "TEXT NOT NULL DEFAULT ''"],
    ['start_date', "TEXT NOT NULL DEFAULT ''"],
    ['deadline_date', "TEXT NOT NULL DEFAULT ''"],
    ['exam_date', "TEXT NOT NULL DEFAULT ''"],
    ['official_apply_url', "TEXT NOT NULL DEFAULT ''"],
    ['official_portal_url', "TEXT NOT NULL DEFAULT ''"],
    ['cover_image_url', "TEXT NOT NULL DEFAULT ''"],
    ['cover_image_alt', "TEXT NOT NULL DEFAULT ''"],
    ['attachments_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['links_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['tags_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['language', "TEXT NOT NULL DEFAULT 'EN'"],
    ['featured', 'INTEGER NOT NULL DEFAULT 0'],
    ['verified_by', 'TEXT'],
    ['verified_at', 'TEXT'],
    ['title_or', "TEXT NOT NULL DEFAULT ''"],
    ['legacy_post_id', 'TEXT'],
    ['state_location', "TEXT NOT NULL DEFAULT 'Odisha'"],
    ['created_by', "TEXT NOT NULL DEFAULT 'system'"],
    ['updated_by', "TEXT NOT NULL DEFAULT 'system'"]
  ]);

  await db.batch([
    db.prepare('CREATE INDEX IF NOT EXISTS idx_jd_folders_domain ON jobs_directory_folders(domain_slug, parent_id, sort_order)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_jd_items_domain_folder ON jobs_directory_items(domain_slug, folder_id, status)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_jd_items_slug ON jobs_directory_items(slug)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_jd_rev_item ON jobs_directory_revisions(item_id, created_at DESC)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_jd_sug_domain ON jobs_directory_suggestions(domain_slug, status)')
  ]);

  // Clean-slate v232: auto-seeding and legacy enrichment disabled; jobs_directory_folders
  // and jobs_directory_items are controlled strictly from Admin Studio (/admin/) via Cloudflare D1.
  _schemaReady.add(db);
}

function mapLegacyGroupToDomain(node) {
  const gs = String(node.group_slug || '').toLowerCase();
  const t = String(node.title || '').toLowerCase();
  if (gs.includes('career-explorer') || t.includes('career explorer')) return 'career-explorer';
  if (gs.includes('eligibility') || t.includes('eligibility')) return 'eligibility-explorer';
  if (gs.includes('course') || gs.includes('exam') || t.includes('entrance')) return 'courses-exams';
  if (gs.includes('scholarship') || t.includes('scholarship')) return 'scholarships-support';
  if (gs.includes('international') || gs.includes('overseas') || t.includes('overseas')) return 'international-overseas';
  if (gs.includes('employability') || gs.includes('development') || t.includes('employability')) return 'career-employability';
  if (gs.includes('institution') || gs.includes('portal') || t.includes('official portal')) return 'institutions-portals';
  return 'jobs-recruitment';
}

async function bridgeLegacyJobsNodes(db, now) {
  try {
    const tblCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs_directory_nodes'").first();
    if (tblCheck) {
      const legacyCount = await db.prepare('SELECT COUNT(*) AS cnt FROM jobs_directory_folders WHERE legacy_node_id IS NOT NULL').first();
      if (Number(legacyCount?.cnt || 0) === 0) {
        const res = await db
          .prepare('SELECT id, parent_id, level, code, title, title_or, description, description_or, group_slug, url, notes_json, tags, sort_order FROM jobs_directory_nodes WHERE is_active = 1 ORDER BY level ASC, sort_order ASC, id ASC')
          .all();
        const rows = res.results || [];
        if (rows.length) {
          const byId = new Map(rows.map(r => [r.id, r]));
          const domainByNodeId = new Map();
          for (const r of rows) {
            if (Number(r.level) === 0) {
              domainByNodeId.set(r.id, mapLegacyGroupToDomain(r));
            } else {
              let cur = r;
              const seen = new Set();
              while (cur && cur.parent_id && !seen.has(cur.id)) {
                seen.add(cur.id);
                if (domainByNodeId.has(cur.parent_id)) {
                  domainByNodeId.set(r.id, domainByNodeId.get(cur.parent_id));
                  break;
                }
                cur = byId.get(cur.parent_id);
              }
              if (!domainByNodeId.has(r.id)) domainByNodeId.set(r.id, mapLegacyGroupToDomain(r));
            }
          }

          const existingSlugsRes = await db.prepare('SELECT domain_slug, slug FROM jobs_directory_folders').all();
          const usedSlugs = new Set((existingSlugsRes.results || []).map(x => `${x.domain_slug}::${x.slug}`));
          const folderIdByLegacyId = new Map();
          const folderStmts = [];
          const itemStmts = [];

          for (const r of rows) {
            if (Number(r.level) === 0) continue; // level 0 maps to the 8 canonical domain roots
            const domain = domainByNodeId.get(r.id) || 'jobs-recruitment';
            const parentNode = r.parent_id ? byId.get(r.parent_id) : null;
            const parentFolderId = (parentNode && Number(parentNode.level) > 0)
              ? (folderIdByLegacyId.get(parentNode.id) || null)
              : null;
            const depth = Math.min(4, Math.max(1, Number(r.level || 1)));
            const folderId = 'jf-leg-' + String(r.id).replace(/[^a-zA-Z0-9_-]/g, '');
            folderIdByLegacyId.set(r.id, folderId);

            let baseSlug = slugify(r.title || ('node-' + r.id)) || ('node-' + r.id);
            let finalSlug = baseSlug;
            if (usedSlugs.has(`${domain}::${finalSlug}`)) {
              finalSlug = `${baseSlug}-${String(r.id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'x'}`;
            }
            usedSlugs.add(`${domain}::${finalSlug}`);

            folderStmts.push(
              db.prepare(`INSERT OR IGNORE INTO jobs_directory_folders
                (id, domain_slug, parent_id, title, slug, depth, sort_order, is_published, description, intro_html, seo_title, seo_description, hero_badge, title_or, description_or, legacy_node_id, legacy_code, updated_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, '', ?, ?, ?, ?, ?, ?, ?, 'legacy-bridge', ?, ?)`)
                .bind(
                  folderId,
                  domain,
                  parentFolderId,
                  cleanStr(r.title, 160) || 'Directory',
                  finalSlug,
                  depth,
                  Number(r.sort_order || 10),
                  cleanStr(r.description, 500),
                  `${cleanStr(r.title, 120)} — CSOdisha`,
                  cleanStr(r.description, 300),
                  cleanStr(r.code, 40),
                  cleanStr(r.title_or, 180),
                  cleanStr(r.description_or, 500),
                  String(r.id),
                  cleanStr(r.code, 40),
                  now,
                  now
                )
            );

            // Bridge level-3 detailed entries into jobs_directory_items
            if (Number(r.level) >= 3) {
              const itemId = 'ji-leg-node-' + String(r.id).replace(/[^a-zA-Z0-9_-]/g, '');
              const itemSlug = `${finalSlug}-${String(r.id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'entry'}`;
              let safeUrl = '';
              try { safeUrl = r.url ? validateSafeCtaUrl(r.url) : ''; } catch { safeUrl = ''; }
              const tags = parseTags(r.tags);
              itemStmts.push(
                db.prepare(`INSERT OR IGNORE INTO jobs_directory_items
                  (id, domain_slug, folder_id, title, slug, item_type, recruiting_body, qualification_tag, vacancies, start_date, deadline_date, exam_date,
                   official_apply_url, cover_image_url, cover_image_alt, attachments_json, links_json, tags_json, language, status, featured,
                   summary, body_html, seo_title, seo_description, verified_by, verified_at, title_or, state_location, created_by, updated_by, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', '', '', ?, '', '', '[]', '[]', ?, 'EN', 'published', 0, ?, ?, ?, ?, 'legacy-bridge@csodisha.com', ?, ?, 'Odisha', 'legacy-bridge', 'legacy-bridge', ?, ?)`)
                  .bind(
                    itemId,
                    domain,
                    folderId,
                    cleanStr(r.title, 200),
                    itemSlug,
                    domain === 'scholarships-support' ? 'scholarship' : (domain === 'institutions-portals' ? 'official-portal' : 'career-guide'),
                    safeUrl,
                    JSON.stringify(tags),
                    cleanStr(r.description, 500),
                    r.description ? `<p>${cleanStr(r.description, 2000)}</p>` : '',
                    `${cleanStr(r.title, 120)} | CSOdisha`,
                    cleanStr(r.description, 300),
                    now,
                    cleanStr(r.title_or, 200),
                    now,
                    now
                  )
              );
            }
          }

          if (folderStmts.length) await runBatched(db, folderStmts, 45);
          if (itemStmts.length) await runBatched(db, itemStmts, 45);
        }
      }
    }

    // Bridge published job posts from legacy posts table if present
    const postsCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'").first();
    if (postsCheck) {
      const legPostCount = await db.prepare('SELECT COUNT(*) AS cnt FROM jobs_directory_items WHERE legacy_post_id IS NOT NULL').first();
      if (Number(legPostCount?.cnt || 0) === 0) {
        const postsRes = await db
          .prepare("SELECT id, slug, title, title_or, organisation, summary, body, apply_url, last_date, qualification, vacancies, status FROM posts WHERE type = 'job' AND status = 'published' LIMIT 100")
          .all()
          .catch(() => ({ results: [] }));
        const defaultFolder = await db
          .prepare("SELECT id FROM jobs_directory_folders WHERE domain_slug = 'jobs-recruitment' ORDER BY depth ASC, sort_order ASC LIMIT 1")
          .first();
        if (defaultFolder && (postsRes.results || []).length) {
          const postStmts = [];
          for (const p of postsRes.results) {
            let safeUrl = '';
            try { safeUrl = p.apply_url ? validateSafeCtaUrl(p.apply_url) : ''; } catch { safeUrl = ''; }
            const pSlug = slugify(p.slug || p.title || ('job-' + p.id)) + '-job';
            postStmts.push(
              db.prepare(`INSERT OR IGNORE INTO jobs_directory_items
                (id, domain_slug, folder_id, title, slug, item_type, recruiting_body, qualification_tag, vacancies, start_date, deadline_date, exam_date,
                 official_apply_url, cover_image_url, cover_image_alt, attachments_json, links_json, tags_json, language, status, featured,
                 summary, body_html, seo_title, seo_description, verified_by, verified_at, title_or, legacy_post_id, state_location, created_by, updated_by, created_at, updated_at)
                VALUES (?, 'jobs-recruitment', ?, ?, ?, 'job-notification', ?, ?, ?, '', ?, '', ?, '', '', '[]', '[]', '["Odisha Govt","Recruitment"]', 'EN', 'published', 1, ?, ?, ?, ?, 'legacy-bridge@csodisha.com', ?, ?, ?, 'Odisha', 'legacy-bridge', 'legacy-bridge', ?, ?)`)
                .bind(
                  'ji-leg-post-' + String(p.id),
                  defaultFolder.id,
                  cleanStr(p.title, 200),
                  pSlug,
                  cleanStr(p.organisation, 160),
                  cleanStr(p.qualification, 120),
                  cleanStr(p.vacancies, 80),
                  cleanStr(p.last_date, 40),
                  safeUrl,
                  cleanStr(p.summary, 500),
                  sanitizeEditorialHtml(p.body || p.summary || ''),
                  `${cleanStr(p.title, 120)} | CSOdisha`,
                  cleanStr(p.summary, 300),
                  now,
                  cleanStr(p.title_or, 200),
                  String(p.id),
                  now,
                  now
                )
            );
          }
          if (postStmts.length) await runBatched(db, postStmts, 45);
        }
      }
    }
  } catch {
    // Non-fatal if legacy tables do not exist in isolated unit tests
  }
}

function resolveDomain(raw) {
  let d = cleanStr(raw, 60);
  if (!d) return 'jobs-recruitment';
  if (d === 'career-development') d = 'career-employability';
  if (!JOBS_DOMAINS.includes(d)) {
    throw validationError('Unknown jobs directory domain: ' + d);
  }
  return d;
}

function buildFolderTree(folders, itemCountByFolder) {
  const byId = new Map();
  const roots = [];
  for (const f of folders) {
    byId.set(f.id, {
      ...f,
      item_count: itemCountByFolder.get(f.id) || 0,
      children: []
    });
  }
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function hydrateItemRow(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    attachments: parseJsonArray(row.attachments_json),
    links: parseJsonArray(row.links_json),
    tags: parseJsonArray(row.tags_json)
  };
}

function isStaleRow(row) {
  const ref = row.verified_at || row.updated_at || row.created_at;
  if (!ref) return true;
  const ageMs = Date.now() - Date.parse(ref);
  return Number.isFinite(ageMs) && ageMs > 180 * 24 * 60 * 60 * 1000;
}

async function handleTree(request, env) {
  const url = new URL(request.url);
  const domain = resolveDomain(url.searchParams.get('domain'));
  const folderFilter = cleanStr(url.searchParams.get('folder_id'), 80);
  const statusFilter = cleanStr(url.searchParams.get('status'), 30);
  const healthFilter = cleanStr(url.searchParams.get('health'), 30);
  const q = cleanStr(url.searchParams.get('q'), 120);

  const foldersRes = await env.DB
    .prepare('SELECT * FROM jobs_directory_folders WHERE domain_slug = ? ORDER BY depth ASC, sort_order ASC, title ASC')
    .bind(domain)
    .all();
  const folders = foldersRes.results || [];

  const countsRes = await env.DB
    .prepare('SELECT folder_id, COUNT(*) AS cnt FROM jobs_directory_items WHERE domain_slug = ? GROUP BY folder_id')
    .bind(domain)
    .all();
  const itemCountByFolder = new Map((countsRes.results || []).map(r => [r.folder_id, Number(r.cnt || 0)]));

  const allItemsRes = await env.DB
    .prepare('SELECT * FROM jobs_directory_items WHERE domain_slug = ? ORDER BY featured DESC, updated_at DESC')
    .bind(domain)
    .all();
  const allItems = (allItemsRes.results || []).map(hydrateItemRow);

  const sugCountRow = await env.DB
    .prepare("SELECT COUNT(*) AS cnt FROM jobs_directory_suggestions WHERE domain_slug = ? AND status = 'pending'")
    .bind(domain)
    .first();
  const pendingSuggestions = Number(sugCountRow?.cnt || 0);

  const crossFolderRow = await env.DB
    .prepare('SELECT COUNT(*) AS cnt FROM jobs_directory_folders')
    .first();
  const crossItemRow = await env.DB
    .prepare("SELECT COUNT(*) AS cnt FROM jobs_directory_items WHERE status = 'published'")
    .first();

  const emptyFolders = folders.filter(f => (itemCountByFolder.get(f.id) || 0) === 0).length;
  const staleItems = allItems.filter(isStaleRow).length;
  const publishedItems = allItems.filter(i => i.status === 'published').length;
  const verifiedItems = allItems.filter(i => Boolean(i.verified_at)).length;

  let filteredItems = allItems;
  if (folderFilter) {
    // Include descendant folders too
    const childMap = new Map();
    for (const f of folders) {
      if (!childMap.has(f.parent_id)) childMap.set(f.parent_id, []);
      childMap.get(f.parent_id).push(f.id);
    }
    const allowed = new Set([folderFilter]);
    const queue = [folderFilter];
    while (queue.length) {
      const cur = queue.shift();
      for (const ch of (childMap.get(cur) || [])) {
        if (!allowed.has(ch)) {
          allowed.add(ch);
          queue.push(ch);
        }
      }
    }
    filteredItems = filteredItems.filter(i => allowed.has(i.folder_id));
  }
  if (statusFilter && JOBS_STATUSES.includes(statusFilter)) {
    filteredItems = filteredItems.filter(i => i.status === statusFilter);
  }
  if (healthFilter === 'stale') {
    filteredItems = filteredItems.filter(isStaleRow);
  } else if (healthFilter === 'verified') {
    filteredItems = filteredItems.filter(i => Boolean(i.verified_at));
  }
  if (q) {
    const ql = q.toLowerCase();
    filteredItems = filteredItems.filter(i =>
      (i.title || '').toLowerCase().includes(ql) ||
      (i.recruiting_body || '').toLowerCase().includes(ql) ||
      (i.qualification_tag || '').toLowerCase().includes(ql) ||
      (i.summary || '').toLowerCase().includes(ql)
    );
  }

  return json({
    domain,
    meta: JOBS_DOMAIN_META[domain] || null,
    tree: buildFolderTree(folders, itemCountByFolder),
    folders: folders.map(f => ({ ...f, item_count: itemCountByFolder.get(f.id) || 0 })),
    items: filteredItems,
    kpis: {
      totalFolders: folders.length,
      totalItems: allItems.length,
      publishedItems,
      verifiedItems,
      emptyFolders,
      staleItems,
      pendingSuggestions
    },
    crossDomainStats: {
      totalDomains: JOBS_DOMAINS.length,
      totalFolders: Number(crossFolderRow?.cnt || 0),
      totalPublished: Number(crossItemRow?.cnt || 0)
    }
  });
}

async function handleFolders(request, env, actor, id) {
  const method = request.method;
  if (method === 'POST') {
    const body = await readJson(request);
    const domain = resolveDomain(body.domain_slug || body.domain);
    const title = cleanStr(body.title, 160);
    if (!title) throw validationError('Sub-directory title is required.');
    const rawSlug = cleanStr(body.slug, 120) || slugify(title);
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid sub-directory slug.');
    const parentId = cleanStr(body.parent_id, 80) || null;
    let depth = 1;
    if (parentId) {
      const parent = await env.DB
        .prepare('SELECT id, domain_slug, depth FROM jobs_directory_folders WHERE id = ?')
        .bind(parentId)
        .first();
      if (!parent || parent.domain_slug !== domain) {
        throw validationError('Parent sub-directory not found in this domain.');
      }
      depth = Number(parent.depth || 1) + 1;
      if (depth > 4) throw validationError('Maximum sub-directory nesting depth is 4.');
    }
    const existing = await env.DB
      .prepare('SELECT id FROM jobs_directory_folders WHERE domain_slug = ? AND slug = ?')
      .bind(domain, rawSlug)
      .first();
    if (existing) throw new HttpError(409, 'SLUG_EXISTS', 'A sub-directory with this slug already exists in this domain.');

    const folderId = 'jf-' + crypto.randomUUID().slice(0, 12);
    const now = nowIso();
    const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 10;
    const isPublished = body.is_published === undefined ? 1 : (body.is_published ? 1 : 0);
    const descriptionEn = cleanStr(body.description_en !== undefined ? body.description_en : body.description, 500);
    const description = cleanStr(body.description !== undefined ? body.description : descriptionEn, 500);
    const descriptionOr = cleanStr(body.description_or, 600);
    const titleOr = cleanStr(body.title_or, 180);
    const introHtml = sanitizeEditorialHtml(body.intro_html, 15000);
    const seoTitle = cleanStr(body.seo_title, 160) || `${title} — CSOdisha`;
    const seoDesc = cleanStr(body.seo_description, 320) || descriptionEn;
    const heroBadge = cleanStr(body.hero_badge !== undefined ? body.hero_badge : body.featured_badge, 40);
    const featuredBadge = cleanStr(body.featured_badge !== undefined ? body.featured_badge : heroBadge, 40);
    const verifiedAt = cleanStr(body.verified_at, 40) || now;

    await env.DB.prepare(`INSERT INTO jobs_directory_folders
      (id, domain_slug, parent_id, title, title_or, slug, depth, sort_order, is_published, description, description_en, description_or, intro_html, seo_title, seo_description, hero_badge, featured_badge, verified_at, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(folderId, domain, parentId, title, titleOr, rawSlug, depth, sortOrder, isPublished, description, descriptionEn, descriptionOr, introHtml, seoTitle, seoDesc, heroBadge, featuredBadge, verifiedAt, actor.email, now, now)
      .run();

    await audit(env, request, actor, 'jobs_folder_create', 'jobs_directory_folder', folderId, { domain, title, parentId, depth }, request);
    await purgeJobsDirectoryCache(env);
    const created = await env.DB.prepare('SELECT * FROM jobs_directory_folders WHERE id = ?').bind(folderId).first();
    return json({ folder: created }, 201);
  }

  if (method === 'PUT') {
    if (!id) throw validationError('Folder ID is required.');
    const existing = await env.DB.prepare('SELECT * FROM jobs_directory_folders WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Sub-directory not found.');

    const body = await readJson(request);
    const title = body.title !== undefined ? cleanStr(body.title, 160) : existing.title;
    if (!title) throw validationError('Title cannot be empty.');
    const rawSlug = body.slug !== undefined ? (cleanStr(body.slug, 120) || slugify(title)) : existing.slug;
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid slug format.');
    if (rawSlug !== existing.slug) {
      const conflict = await env.DB
        .prepare('SELECT id FROM jobs_directory_folders WHERE domain_slug = ? AND slug = ? AND id != ?')
        .bind(existing.domain_slug, rawSlug, id)
        .first();
      if (conflict) throw new HttpError(409, 'SLUG_EXISTS', 'Another sub-directory uses that slug.');
    }

    const descriptionEn = body.description_en !== undefined
      ? cleanStr(body.description_en, 500)
      : (body.description !== undefined ? cleanStr(body.description, 500) : existing.description_en);
    const description = body.description !== undefined ? cleanStr(body.description, 500) : (body.description_en !== undefined ? descriptionEn : existing.description);
    const descriptionOr = body.description_or !== undefined ? cleanStr(body.description_or, 600) : (existing.description_or || '');
    const titleOr = body.title_or !== undefined ? cleanStr(body.title_or, 180) : (existing.title_or || '');
    const introHtml = body.intro_html !== undefined ? sanitizeEditorialHtml(body.intro_html, 15000) : existing.intro_html;
    const seoTitle = body.seo_title !== undefined ? cleanStr(body.seo_title, 160) : existing.seo_title;
    const seoDesc = body.seo_description !== undefined ? cleanStr(body.seo_description, 320) : existing.seo_description;
    const heroBadge = body.hero_badge !== undefined
      ? cleanStr(body.hero_badge, 40)
      : (body.featured_badge !== undefined ? cleanStr(body.featured_badge, 40) : existing.hero_badge);
    const featuredBadge = body.featured_badge !== undefined ? cleanStr(body.featured_badge, 40) : (body.hero_badge !== undefined ? heroBadge : (existing.featured_badge || ''));
    const now = nowIso();
    const verifiedAt = body.verified_at !== undefined ? (cleanStr(body.verified_at, 40) || null) : (existing.verified_at || now);
    const sortOrder = body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))
      ? Number(body.sort_order)
      : existing.sort_order;
    const isPublished = body.is_published !== undefined ? (body.is_published ? 1 : 0) : existing.is_published;

    await env.DB.prepare(`UPDATE jobs_directory_folders
      SET title = ?, title_or = ?, slug = ?, description = ?, description_en = ?, description_or = ?, intro_html = ?, seo_title = ?, seo_description = ?, hero_badge = ?, featured_badge = ?, verified_at = ?, sort_order = ?, is_published = ?, updated_by = ?, updated_at = ?
      WHERE id = ?`)
      .bind(title, titleOr, rawSlug, description, descriptionEn, descriptionOr, introHtml, seoTitle, seoDesc, heroBadge, featuredBadge, verifiedAt, sortOrder, isPublished, actor.email, now, id)
      .run();

    await audit(env, request, actor, 'jobs_folder_update', 'jobs_directory_folder', id, { domain: existing.domain_slug, title }, request);
    await purgeJobsDirectoryCache(env);
    const updated = await env.DB.prepare('SELECT * FROM jobs_directory_folders WHERE id = ?').bind(id).first();
    return json({ folder: updated });
  }

  if (method === 'DELETE') {
    if (!id) throw validationError('Folder ID is required.');
    const existing = await env.DB.prepare('SELECT * FROM jobs_directory_folders WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Sub-directory not found.');

    const childRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM jobs_directory_folders WHERE parent_id = ?').bind(id).first();
    const itemRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM jobs_directory_items WHERE folder_id = ?').bind(id).first();
    const childCount = Number(childRow?.cnt || 0);
    const itemCount = Number(itemRow?.cnt || 0);
    if (childCount > 0 || itemCount > 0) {
      throw new HttpError(
        409,
        'FOLDER_NOT_EMPTY',
        `Cannot delete "${existing.title}": contains ${childCount} nested sub-directories and ${itemCount} items. Move or remove them first.`
      );
    }

    await env.DB.prepare('DELETE FROM jobs_directory_folders WHERE id = ?').bind(id).run();
    await audit(env, request, actor, 'jobs_folder_delete', 'jobs_directory_folder', id, { domain: existing.domain_slug, title: existing.title }, request);
    await purgeJobsDirectoryCache(env);
    return json({ deleted: true, id });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed on folders.');
}

async function handleItems(request, env, actor, id, action) {
  const method = request.method;

  if (method === 'GET') {
    if (id) {
      const row = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Directory item not found.');
      const revRes = await env.DB
        .prepare('SELECT id, changed_by, change_note, created_at FROM jobs_directory_revisions WHERE item_id = ? ORDER BY created_at DESC LIMIT 20')
        .bind(id)
        .all();
      return json({ item: hydrateItemRow(row), revisions: revRes.results || [] });
    }
    const url = new URL(request.url);
    const domain = resolveDomain(url.searchParams.get('domain'));
    const folderId = cleanStr(url.searchParams.get('folder_id'), 80);
    const status = cleanStr(url.searchParams.get('status'), 30);
    const q = cleanStr(url.searchParams.get('q'), 120);

    const clauses = ['domain_slug = ?'];
    const binds = [domain];
    if (folderId) {
      clauses.push('folder_id = ?');
      binds.push(folderId);
    }
    if (status && JOBS_STATUSES.includes(status)) {
      clauses.push('status = ?');
      binds.push(status);
    }
    if (q) {
      const pattern = '%' + likeEscape(q) + '%';
      clauses.push("(title LIKE ? ESCAPE '\\' OR recruiting_body LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\')");
      binds.push(pattern, pattern, pattern);
    }
    const res = await env.DB
      .prepare(`SELECT * FROM jobs_directory_items WHERE ${clauses.join(' AND ')} ORDER BY featured DESC, updated_at DESC LIMIT 200`)
      .bind(...binds)
      .all();
    return json({ items: (res.results || []).map(hydrateItemRow) });
  }

  if (method === 'POST' && !id) {
    const body = await readJson(request);
    const domain = resolveDomain(body.domain_slug || body.domain);
    const folderId = cleanStr(body.folder_id, 80);
    if (!folderId) throw validationError('Target sub-directory (folder_id) is required.');
    const folder = await env.DB.prepare('SELECT id, domain_slug FROM jobs_directory_folders WHERE id = ?').bind(folderId).first();
    if (!folder || folder.domain_slug !== domain) {
      throw validationError('Selected sub-directory does not belong to this domain.');
    }

    const title = cleanStr(body.title, 200);
    if (!title) throw validationError('Title is required.');
    const rawSlug = cleanStr(body.slug, 140) || slugify(title);
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid slug format.');
    const dupSlug = await env.DB.prepare('SELECT id FROM jobs_directory_items WHERE slug = ?').bind(rawSlug).first();
    const finalSlug = dupSlug ? `${rawSlug}-${crypto.randomUUID().slice(0, 5)}` : rawSlug;

    const itemType = JOBS_ITEM_TYPES.includes(body.item_type) ? body.item_type : 'job-notification';
    const language = JOBS_LANGUAGES.includes(body.language) ? body.language : 'EN';
    const status = JOBS_STATUSES.includes(body.status) ? body.status : 'draft';
    const officialApplyUrl = validateSafeCtaUrl(body.official_apply_url || body.official_portal_url);
    const officialPortalUrl = validateSafeCtaUrl(body.official_portal_url || body.official_apply_url);
    const conductingBody = cleanStr(body.conducting_body !== undefined ? body.conducting_body : body.recruiting_body, 160);
    const recruitingBody = cleanStr(body.recruiting_body !== undefined ? body.recruiting_body : conductingBody, 160);
    const coverImageUrl = validateSafeCtaUrl(body.cover_image_url);
    const attachments = sanitizeAttachments(body.attachments || body.attachments_json);
    const links = sanitizeLinks(body.links || body.links_json);
    const tags = parseTags(body.tags || body.tags_json);
    const bodyHtml = sanitizeEditorialHtml(body.body_html);
    const summary = cleanStr(body.summary, 500);

    const itemId = 'ji-' + crypto.randomUUID().slice(0, 12);
    const now = nowIso();

    await env.DB.prepare(`INSERT INTO jobs_directory_items
      (id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, conducting_body,
       exam_code, cadre_group, pay_matrix, age_limit_relaxation, qualification_odia_rule,
       selection_stages, pst_pet_skill_norms, documents_checklist, application_steps,
       academic_pathways, premier_institutions, entrance_licensing, skills_certifications, salary_progression, career_ladder,
       qualification_tag, vacancies, start_date, deadline_date, exam_date,
       official_apply_url, official_portal_url, cover_image_url, cover_image_alt, attachments_json, links_json, tags_json, language, status, featured,
       summary, body_html, seo_title, seo_description, verified_by, verified_at, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`)
      .bind(
        itemId,
        domain,
        folderId,
        title,
        cleanStr(body.title_or, 220),
        finalSlug,
        itemType,
        recruitingBody,
        conductingBody,
        cleanStr(body.exam_code, 120),
        cleanStr(body.cadre_group, 160),
        cleanStr(body.pay_matrix, 400),
        cleanStr(body.age_limit_relaxation, 400),
        cleanStr(body.qualification_odia_rule, 400),
        cleanStr(body.selection_stages, 600),
        cleanStr(body.pst_pet_skill_norms, 400),
        cleanStr(body.documents_checklist, 500),
        cleanStr(body.application_steps, 500),
        cleanStr(body.academic_pathways, 600),
        cleanStr(body.premier_institutions, 600),
        cleanStr(body.entrance_licensing, 500),
        cleanStr(body.skills_certifications, 500),
        cleanStr(body.salary_progression, 500),
        cleanStr(body.career_ladder, 600),
        cleanStr(body.qualification_tag, 120),
        cleanStr(body.vacancies, 80),
        cleanStr(body.start_date, 40),
        cleanStr(body.deadline_date, 40),
        cleanStr(body.exam_date, 80),
        officialApplyUrl,
        officialPortalUrl,
        coverImageUrl,
        cleanStr(body.cover_image_alt, 180),
        JSON.stringify(attachments),
        JSON.stringify(links),
        JSON.stringify(tags),
        language,
        status,
        body.featured ? 1 : 0,
        summary,
        bodyHtml,
        cleanStr(body.seo_title, 160) || `${title} | CSOdisha`,
        cleanStr(body.seo_description, 320) || summary,
        actor.email,
        actor.email,
        now,
        now
      )
      .run();

    const created = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(itemId).first();
    await env.DB.prepare('INSERT INTO jobs_directory_revisions (id, item_id, snapshot_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('jrev-' + crypto.randomUUID().slice(0, 12), itemId, JSON.stringify(created), actor.email, 'Initial creation', now)
      .run();

    await audit(env, request, actor, 'jobs_item_create', 'jobs_directory_item', itemId, { domain, title, status }, request);
    await purgeJobsDirectoryCache(env);
    return json({ item: hydrateItemRow(created) }, 201);
  }

  if (method === 'PUT' && id) {
    const existing = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Directory item not found.');

    const body = await readJson(request);
    const folderId = body.folder_id !== undefined ? cleanStr(body.folder_id, 80) : existing.folder_id;
    const folder = await env.DB.prepare('SELECT id, domain_slug FROM jobs_directory_folders WHERE id = ?').bind(folderId).first();
    if (!folder || folder.domain_slug !== existing.domain_slug) {
      throw validationError('Selected sub-directory does not belong to this domain.');
    }

    const title = body.title !== undefined ? cleanStr(body.title, 200) : existing.title;
    if (!title) throw validationError('Title cannot be empty.');
    const rawSlug = body.slug !== undefined ? (cleanStr(body.slug, 140) || slugify(title)) : existing.slug;
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid slug format.');
    if (rawSlug !== existing.slug) {
      const conflict = await env.DB.prepare('SELECT id FROM jobs_directory_items WHERE slug = ? AND id != ?').bind(rawSlug, id).first();
      if (conflict) throw new HttpError(409, 'SLUG_EXISTS', 'Another item already uses that slug.');
    }

    const itemType = body.item_type !== undefined && JOBS_ITEM_TYPES.includes(body.item_type) ? body.item_type : existing.item_type;
    const language = body.language !== undefined && JOBS_LANGUAGES.includes(body.language) ? body.language : existing.language;
    const status = body.status !== undefined && JOBS_STATUSES.includes(body.status) ? body.status : existing.status;
    const officialApplyUrl = body.official_apply_url !== undefined
      ? validateSafeCtaUrl(body.official_apply_url)
      : (body.official_portal_url !== undefined ? validateSafeCtaUrl(body.official_portal_url) : existing.official_apply_url);
    const officialPortalUrl = body.official_portal_url !== undefined
      ? validateSafeCtaUrl(body.official_portal_url)
      : (body.official_apply_url !== undefined ? officialApplyUrl : (existing.official_portal_url || existing.official_apply_url || ''));
    const conductingBody = body.conducting_body !== undefined
      ? cleanStr(body.conducting_body, 160)
      : (body.recruiting_body !== undefined ? cleanStr(body.recruiting_body, 160) : (existing.conducting_body || existing.recruiting_body || ''));
    const recruitingBody = body.recruiting_body !== undefined
      ? cleanStr(body.recruiting_body, 160)
      : (body.conducting_body !== undefined ? conductingBody : existing.recruiting_body);
    const coverImageUrl = body.cover_image_url !== undefined ? validateSafeCtaUrl(body.cover_image_url) : existing.cover_image_url;
    const attachmentsJson = (body.attachments !== undefined || body.attachments_json !== undefined)
      ? JSON.stringify(sanitizeAttachments(body.attachments !== undefined ? body.attachments : body.attachments_json))
      : existing.attachments_json;
    const linksJson = (body.links !== undefined || body.links_json !== undefined)
      ? JSON.stringify(sanitizeLinks(body.links !== undefined ? body.links : body.links_json))
      : existing.links_json;
    const tagsJson = (body.tags !== undefined || body.tags_json !== undefined)
      ? JSON.stringify(parseTags(body.tags !== undefined ? body.tags : body.tags_json))
      : existing.tags_json;
    const summary = body.summary !== undefined ? cleanStr(body.summary, 500) : existing.summary;
    const bodyHtml = body.body_html !== undefined ? sanitizeEditorialHtml(body.body_html) : existing.body_html;
    const now = nowIso();

    await env.DB.prepare(`UPDATE jobs_directory_items
      SET folder_id = ?, title = ?, title_or = ?, slug = ?, item_type = ?, recruiting_body = ?, conducting_body = ?,
          exam_code = ?, cadre_group = ?, pay_matrix = ?, age_limit_relaxation = ?, qualification_odia_rule = ?,
          selection_stages = ?, pst_pet_skill_norms = ?, documents_checklist = ?, application_steps = ?,
          academic_pathways = ?, premier_institutions = ?, entrance_licensing = ?, skills_certifications = ?, salary_progression = ?, career_ladder = ?,
          qualification_tag = ?, vacancies = ?,
          start_date = ?, deadline_date = ?, exam_date = ?, official_apply_url = ?, official_portal_url = ?, cover_image_url = ?, cover_image_alt = ?,
          attachments_json = ?, links_json = ?, tags_json = ?, language = ?, status = ?, featured = ?,
          summary = ?, body_html = ?, seo_title = ?, seo_description = ?, updated_by = ?, updated_at = ?
      WHERE id = ?`)
      .bind(
        folderId,
        title,
        body.title_or !== undefined ? cleanStr(body.title_or, 220) : (existing.title_or || ''),
        rawSlug,
        itemType,
        recruitingBody,
        conductingBody,
        body.exam_code !== undefined ? cleanStr(body.exam_code, 120) : (existing.exam_code || ''),
        body.cadre_group !== undefined ? cleanStr(body.cadre_group, 160) : (existing.cadre_group || ''),
        body.pay_matrix !== undefined ? cleanStr(body.pay_matrix, 400) : (existing.pay_matrix || ''),
        body.age_limit_relaxation !== undefined ? cleanStr(body.age_limit_relaxation, 400) : (existing.age_limit_relaxation || ''),
        body.qualification_odia_rule !== undefined ? cleanStr(body.qualification_odia_rule, 400) : (existing.qualification_odia_rule || ''),
        body.selection_stages !== undefined ? cleanStr(body.selection_stages, 600) : (existing.selection_stages || ''),
        body.pst_pet_skill_norms !== undefined ? cleanStr(body.pst_pet_skill_norms, 400) : (existing.pst_pet_skill_norms || ''),
        body.documents_checklist !== undefined ? cleanStr(body.documents_checklist, 500) : (existing.documents_checklist || ''),
        body.application_steps !== undefined ? cleanStr(body.application_steps, 500) : (existing.application_steps || ''),
        body.academic_pathways !== undefined ? cleanStr(body.academic_pathways, 600) : (existing.academic_pathways || ''),
        body.premier_institutions !== undefined ? cleanStr(body.premier_institutions, 600) : (existing.premier_institutions || ''),
        body.entrance_licensing !== undefined ? cleanStr(body.entrance_licensing, 500) : (existing.entrance_licensing || ''),
        body.skills_certifications !== undefined ? cleanStr(body.skills_certifications, 500) : (existing.skills_certifications || ''),
        body.salary_progression !== undefined ? cleanStr(body.salary_progression, 500) : (existing.salary_progression || ''),
        body.career_ladder !== undefined ? cleanStr(body.career_ladder, 600) : (existing.career_ladder || ''),
        body.qualification_tag !== undefined ? cleanStr(body.qualification_tag, 120) : existing.qualification_tag,
        body.vacancies !== undefined ? cleanStr(body.vacancies, 80) : existing.vacancies,
        body.start_date !== undefined ? cleanStr(body.start_date, 40) : existing.start_date,
        body.deadline_date !== undefined ? cleanStr(body.deadline_date, 40) : existing.deadline_date,
        body.exam_date !== undefined ? cleanStr(body.exam_date, 80) : existing.exam_date,
        officialApplyUrl,
        officialPortalUrl,
        coverImageUrl,
        body.cover_image_alt !== undefined ? cleanStr(body.cover_image_alt, 180) : existing.cover_image_alt,
        attachmentsJson,
        linksJson,
        tagsJson,
        language,
        status,
        body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured,
        summary,
        bodyHtml,
        body.seo_title !== undefined ? cleanStr(body.seo_title, 160) : existing.seo_title,
        body.seo_description !== undefined ? cleanStr(body.seo_description, 320) : existing.seo_description,
        actor.email,
        now,
        id
      )
      .run();

    const updated = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
    await env.DB.prepare('INSERT INTO jobs_directory_revisions (id, item_id, snapshot_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('jrev-' + crypto.randomUUID().slice(0, 12), id, JSON.stringify(updated), actor.email, cleanStr(body.change_note, 120) || 'Updated item', now)
      .run();

    await audit(env, request, actor, 'jobs_item_update', 'jobs_directory_item', id, { domain: existing.domain_slug, title, status }, request);
    await purgeJobsDirectoryCache(env);
    return json({ item: hydrateItemRow(updated) });
  }

  if (method === 'PATCH' && id && action === 'status') {
    const existing = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Directory item not found.');
    const body = await readJson(request);
    const nextStatus = cleanStr(body.status, 30);
    if (!JOBS_STATUSES.includes(nextStatus)) throw validationError('Invalid status.');
    const now = nowIso();
    await env.DB.prepare('UPDATE jobs_directory_items SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?')
      .bind(nextStatus, actor.email, now, id)
      .run();
    await audit(env, request, actor, 'jobs_item_status', 'jobs_directory_item', id, { from: existing.status, to: nextStatus }, request);
    await purgeJobsDirectoryCache(env);
    const updated = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
    return json({ item: hydrateItemRow(updated), previous_status: existing.status });
  }

  if (method === 'POST' && id && action === 'verify') {
    const existing = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Directory item not found.');
    const now = nowIso();
    await env.DB.prepare('UPDATE jobs_directory_items SET verified_by = ?, verified_at = ?, updated_by = ?, updated_at = ? WHERE id = ?')
      .bind(actor.email, now, actor.email, now, id)
      .run();
    await audit(env, request, actor, 'jobs_item_verify', 'jobs_directory_item', id, { domain: existing.domain_slug, verified_by: actor.email }, request);
    await purgeJobsDirectoryCache(env);
    const updated = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
    return json({ item: hydrateItemRow(updated) });
  }

  if (method === 'DELETE' && id) {
    const existing = await env.DB.prepare('SELECT * FROM jobs_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Directory item not found.');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM jobs_directory_revisions WHERE item_id = ?').bind(id),
      env.DB.prepare('DELETE FROM jobs_directory_items WHERE id = ?').bind(id)
    ]);
    await audit(env, request, actor, 'jobs_item_delete', 'jobs_directory_item', id, { domain: existing.domain_slug, title: existing.title }, request);
    await purgeJobsDirectoryCache(env);
    return json({ deleted: true, id });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed on items.');
}

async function handleSuggestions(request, env, actor, id) {
  const method = request.method;
  if (method === 'GET') {
    const url = new URL(request.url);
    const domain = resolveDomain(url.searchParams.get('domain'));
    const status = cleanStr(url.searchParams.get('status'), 30);
    const clauses = ['domain_slug = ?'];
    const binds = [domain];
    if (status && JOBS_SUGGESTION_STATUSES.includes(status)) {
      clauses.push('status = ?');
      binds.push(status);
    }
    const res = await env.DB
      .prepare(`SELECT * FROM jobs_directory_suggestions WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 100`)
      .bind(...binds)
      .all();
    const rows = (res.results || []).map(r => ({
      ...r,
      reporter_name: redactPii(r.reporter_name),
      message: redactPii(r.message)
    }));
    return json({ suggestions: rows });
  }

  if (method === 'POST') {
    const body = await readJson(request);
    const domain = resolveDomain(body.domain_slug || body.domain);
    const message = redactPii(cleanStr(body.message, 1000));
    if (!message) throw validationError('Suggestion message is required.');
    const suggestedUrl = body.suggested_url ? validateSafeCtaUrl(body.suggested_url) : '';
    const sugId = 'jsug-' + crypto.randomUUID().slice(0, 12);
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO jobs_directory_suggestions
      (id, domain_slug, folder_id, item_id, reporter_name, category, message, suggested_url, status, moderator_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`)
      .bind(
        sugId,
        domain,
        cleanStr(body.folder_id, 80) || null,
        cleanStr(body.item_id, 80) || null,
        redactPii(cleanStr(body.reporter_name, 80) || 'Citizen'),
        cleanStr(body.category, 40) || 'correction',
        message,
        suggestedUrl,
        now,
        now
      )
      .run();
    const created = await env.DB.prepare('SELECT * FROM jobs_directory_suggestions WHERE id = ?').bind(sugId).first();
    return json({ suggestion: created }, 201);
  }

  if (method === 'PATCH' && id) {
    const existing = await env.DB.prepare('SELECT * FROM jobs_directory_suggestions WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Suggestion not found.');
    const body = await readJson(request);
    const nextStatus = cleanStr(body.status, 30);
    if (!JOBS_SUGGESTION_STATUSES.includes(nextStatus)) throw validationError('Invalid suggestion status.');
    const note = redactPii(cleanStr(body.moderator_note, 400));
    const now = nowIso();
    await env.DB.prepare('UPDATE jobs_directory_suggestions SET status = ?, moderator_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?')
      .bind(nextStatus, note, actor.email, now, now, id)
      .run();
    await audit(env, request, actor, 'jobs_suggestion_update', 'jobs_directory_suggestion', id, { status: nextStatus }, request);
    const updated = await env.DB.prepare('SELECT * FROM jobs_directory_suggestions WHERE id = ?').bind(id).first();
    return json({ suggestion: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed on suggestions.');
}

export async function handleJobsDirectoryStudio(request, env, actor, subResource, id, action) {
  await ensureJobsDirectoryStudioSchema(env.DB);
  switch (subResource) {
    case 'tree':
      if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'GET required');
      return await handleTree(request, env);
    case 'folders':
      return await handleFolders(request, env, actor, id);
    case 'items':
      return await handleItems(request, env, actor, id, action);
    case 'suggestions':
      return await handleSuggestions(request, env, actor, id);
    default:
      throw new HttpError(404, 'NOT_FOUND', 'Unknown jobs-directory resource: ' + subResource);
  }
}

// =============================================================================
// Public Read-Only Resolvers, APIs, DPDP-Safe Suggestions & /sitemap-jobs.xml
// =============================================================================

function normalizePublicDomain(raw) {
  let d = cleanStr(raw, 60);
  if (!d) return '';
  if (d === 'career-development') d = 'career-employability';
  return JOBS_DOMAINS.includes(d) ? d : '';
}

export async function resolvePublicJobsDirectory(env, segments = []) {
  await ensureJobsDirectoryStudioSchema(env.DB);
  const cleanSegs = (Array.isArray(segments) ? segments : [])
    .map(s => cleanStr(s, 120))
    .filter(Boolean);
  if (!cleanSegs.length) return null;

  const domain = normalizePublicDomain(cleanSegs[0]);
  if (!domain) return null;
  const meta = JOBS_DOMAIN_META[domain];

  const foldersRes = await env.DB
    .prepare('SELECT * FROM jobs_directory_folders WHERE domain_slug = ? AND is_published = 1 ORDER BY depth ASC, sort_order ASC, title ASC')
    .bind(domain)
    .all();
  const activeFolders = foldersRes.results || [];
  const byId = new Map(activeFolders.map(f => [f.id, f]));

  // Keep only folders whose entire ancestor chain is active
  function isChainActive(f) {
    let cur = f;
    const seen = new Set();
    while (cur && cur.parent_id) {
      if (seen.has(cur.id)) return false;
      seen.add(cur.id);
      const parent = byId.get(cur.parent_id);
      if (!parent) return false;
      cur = parent;
    }
    return true;
  }
  const validFolders = activeFolders.filter(isChainActive);

  let currentFolder = null;
  const breadcrumbs = [
    { title: 'Jobs & Careers', path: '/jobs/' },
    { title: meta.title, path: `/jobs/${domain}/` }
  ];
  let accPath = `/jobs/${domain}`;

  for (let i = 1; i < cleanSegs.length; i++) {
    const segSlug = cleanSegs[i];
    const parentId = currentFolder ? currentFolder.id : null;
    const match = validFolders.find(f => (f.parent_id || null) === parentId && f.slug === segSlug);
    if (!match) return null;
    currentFolder = match;
    accPath += `/${match.slug}`;
    breadcrumbs.push({ title: match.title, path: `${accPath}/` });
  }

  const children = validFolders
    .filter(f => (f.parent_id || null) === (currentFolder ? currentFolder.id : null))
    .map(f => ({ ...f, public_path: `${accPath}/${f.slug}/` }));

  // Gather items in current folder (or all domain folders if at domain root)
  const allowedFolderIds = new Set();
  if (currentFolder) {
    allowedFolderIds.add(currentFolder.id);
    const queue = [currentFolder.id];
    while (queue.length) {
      const pid = queue.shift();
      for (const f of validFolders) {
        if (f.parent_id === pid && !allowedFolderIds.has(f.id)) {
          allowedFolderIds.add(f.id);
          queue.push(f.id);
        }
      }
    }
  } else {
    for (const f of validFolders) allowedFolderIds.add(f.id);
  }

  const itemsRes = await env.DB
    .prepare("SELECT * FROM jobs_directory_items WHERE domain_slug = ? AND status = 'published' ORDER BY featured DESC, updated_at DESC")
    .bind(domain)
    .all();
  const items = (itemsRes.results || [])
    .filter(it => allowedFolderIds.has(it.folder_id))
    .map(hydrateItemRow);

  return {
    domain,
    meta,
    canonicalPath: `${accPath}/`,
    breadcrumbs,
    folder: currentFolder,
    children,
    items
  };
}

export async function resolvePublicJobsItem(env, slugOrId) {
  await ensureJobsDirectoryStudioSchema(env.DB);
  const key = cleanStr(slugOrId, 160);
  if (!key) return null;

  const row = await env.DB
    .prepare("SELECT * FROM jobs_directory_items WHERE (slug = ? OR id = ?) AND status = 'published' LIMIT 1")
    .bind(key, key)
    .first();
  if (!row) return null;

  const foldersRes = await env.DB
    .prepare('SELECT * FROM jobs_directory_folders WHERE domain_slug = ? AND is_published = 1')
    .bind(row.domain_slug)
    .all();
  const byId = new Map((foldersRes.results || []).map(f => [f.id, f]));
  const folder = byId.get(row.folder_id);
  if (!folder) return null;

  const chain = [];
  let cur = folder;
  const seen = new Set();
  while (cur) {
    if (seen.has(cur.id)) return null;
    seen.add(cur.id);
    chain.unshift(cur);
    if (!cur.parent_id) break;
    cur = byId.get(cur.parent_id);
    if (!cur) return null;
  }

  const meta = JOBS_DOMAIN_META[row.domain_slug];
  const breadcrumbs = [
    { title: 'Jobs & Careers', path: '/jobs/' },
    { title: meta.title, path: `/jobs/${row.domain_slug}/` }
  ];
  let acc = `/jobs/${row.domain_slug}`;
  for (const f of chain) {
    acc += `/${f.slug}`;
    breadcrumbs.push({ title: f.title, path: `${acc}/` });
  }
  breadcrumbs.push({ title: row.title, path: `/jobs/item/${row.slug}/` });

  return {
    item: hydrateItemRow(row),
    folder,
    domain: row.domain_slug,
    meta,
    breadcrumbs
  };
}

export async function listPublicJobsOverview(env) {
  await ensureJobsDirectoryStudioSchema(env.DB);
  const [fRes, iRes, tRes] = await Promise.all([
    env.DB.prepare('SELECT domain_slug, depth, COUNT(*) AS cnt FROM jobs_directory_folders WHERE is_published = 1 GROUP BY domain_slug, depth').all(),
    env.DB.prepare("SELECT domain_slug, COUNT(*) AS cnt, SUM(CASE WHEN verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified_cnt FROM jobs_directory_items WHERE status = 'published' GROUP BY domain_slug").all(),
    env.DB.prepare("SELECT item_type, COUNT(*) AS cnt FROM jobs_directory_items WHERE status = 'published' GROUP BY item_type HAVING COUNT(*) >= 2").all()
  ]);
  const fMap = new Map();
  let totalSections = 0;
  let totalSubcategories = 0;
  let totalEntries = 0;
  for (const r of (fRes.results || [])) {
    const cur = fMap.get(r.domain_slug) || { total: 0, d1: 0, d2: 0, d3: 0 };
    const cnt = Number(r.cnt || 0);
    cur.total += cnt;
    if (Number(r.depth) === 1) { cur.d1 += cnt; totalSections += cnt; }
    else if (Number(r.depth) === 2) { cur.d2 += cnt; totalSubcategories += cnt; }
    else { cur.d3 += cnt; totalEntries += cnt; }
    fMap.set(r.domain_slug, cur);
  }
  const iMap = new Map((iRes.results || []).map(r => [r.domain_slug, { cnt: Number(r.cnt || 0), verified: Number(r.verified_cnt || 0) }]));
  const typeMap = new Map((tRes.results || []).map(r => [r.item_type, Number(r.cnt || 0)]));

  const today = new Date().toISOString().slice(0, 10);
  const activeRow = await env.DB
    .prepare("SELECT COUNT(*) AS cnt FROM jobs_directory_items WHERE status = 'published' AND (deadline_date = '' OR deadline_date >= ?)")
    .bind(today)
    .first();

  let totalFolders = 0;
  let totalPublished = 0;
  let totalVerified = 0;

  const domains = JOBS_DOMAINS.map(slug => {
    const meta = JOBS_DOMAIN_META[slug];
    const fcObj = fMap.get(slug) || { total: 0, d1: 0, d2: 0, d3: 0 };
    const ic = iMap.get(slug)?.cnt || 0;
    const vc = iMap.get(slug)?.verified || 0;
    totalFolders += fcObj.total;
    totalPublished += ic;
    totalVerified += vc;
    return {
      slug,
      num: meta.num,
      title: meta.title,
      summary: meta.summary,
      publicPath: `/jobs/${slug}/`,
      folder_count: fcObj.total,
      depth1_count: fcObj.d1,
      depth2_count: fcObj.d2,
      depth3_count: fcObj.d3,
      item_count: ic,
      verified_count: vc
    };
  }).filter(d => d.folder_count > 0 || d.item_count > 0);

  const typeBreakdown = {
    recruitment: (typeMap.get('job-notification') || 0),
    guides: (typeMap.get('career-guide') || 0) + (typeMap.get('eligibility-matrix') || 0) + (typeMap.get('employability-guide') || 0),
    examsAndScholarships: (typeMap.get('course-exam') || 0) + (typeMap.get('scholarship') || 0) + (typeMap.get('overseas-track') || 0),
    portals: (typeMap.get('official-portal') || 0)
  };

  return {
    domains,
    typeBreakdown,
    totals: {
      totalDomains: domains.length,
      totalSections,
      totalSubcategories,
      totalEntries,
      totalFolders,
      totalPublished,
      totalVerified,
      activeDeadlines: Number(activeRow?.cnt || 0)
    }
  };
}

export async function listPublicJobsItems(env, opts = {}) {
  await ensureJobsDirectoryStudioSchema(env.DB);
  const domain = normalizePublicDomain(opts.domain);
  const itemType = cleanStr(opts.item_type, 40);
  const qual = cleanStr(opts.qualification, 80);
  const lang = cleanStr(opts.language, 20);
  const stateLoc = cleanStr(opts.state_location, 60);
  const q = cleanStr(opts.q, 120);
  const activeOnly = opts.active_only === true || opts.active_only === '1' || opts.active_only === 'true';
  const limit = Math.min(200, Math.max(1, Number(opts.limit || 60)));

  const clauses = ["i.status = 'published'", 'f.is_published = 1'];
  const binds = [];
  if (domain) {
    clauses.push('i.domain_slug = ?');
    binds.push(domain);
  }
  if (itemType && JOBS_ITEM_TYPES.includes(itemType)) {
    clauses.push('i.item_type = ?');
    binds.push(itemType);
  }
  if (lang && JOBS_LANGUAGES.includes(lang)) {
    clauses.push('i.language = ?');
    binds.push(lang);
  }
  if (qual) {
    clauses.push("LOWER(i.qualification_tag) LIKE ? ESCAPE '\\'");
    binds.push('%' + likeEscape(qual.toLowerCase()) + '%');
  }
  if (stateLoc) {
    clauses.push("LOWER(i.state_location) LIKE ? ESCAPE '\\'");
    binds.push('%' + likeEscape(stateLoc.toLowerCase()) + '%');
  }
  if (activeOnly) {
    const today = new Date().toISOString().slice(0, 10);
    clauses.push("(i.deadline_date = '' OR i.deadline_date >= ?)");
    binds.push(today);
  }
  if (q) {
    const pat = '%' + likeEscape(q.toLowerCase()) + '%';
    clauses.push("(LOWER(i.title) LIKE ? ESCAPE '\\' OR LOWER(i.recruiting_body) LIKE ? ESCAPE '\\' OR LOWER(i.qualification_tag) LIKE ? ESCAPE '\\' OR LOWER(i.summary) LIKE ? ESCAPE '\\')");
    binds.push(pat, pat, pat, pat);
  }

  const sql = `SELECT i.*, f.title AS folder_title, f.slug AS folder_slug
    FROM jobs_directory_items i
    JOIN jobs_directory_folders f ON f.id = i.folder_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY i.featured DESC, i.updated_at DESC
    LIMIT ?`;
  const res = await env.DB.prepare(sql).bind(...binds, limit).all();
  const items = (res.results || []).map(hydrateItemRow);
  return { items, total: items.length };
}

export async function submitPublicJobsSuggestion(env, payload = {}) {
  await ensureJobsDirectoryStudioSchema(env.DB);
  const domain = normalizePublicDomain(payload.domain_slug) || 'jobs-recruitment';
  const message = redactPii(cleanStr(payload.message || payload.details || payload.title, 1000));
  if (!message || message.length < 4) {
    throw validationError('Please enter at least 4 characters describing the correction or update.');
  }
  const suggestedUrl = payload.suggested_url || payload.source_url
    ? validateSafeCtaUrl(payload.suggested_url || payload.source_url)
    : '';
  const sugId = 'jsug-' + crypto.randomUUID().slice(0, 12);
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO jobs_directory_suggestions
    (id, domain_slug, folder_id, item_id, reporter_name, category, message, suggested_url, status, moderator_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`)
    .bind(
      sugId,
      domain,
      cleanStr(payload.folder_id, 80) || null,
      cleanStr(payload.item_id, 80) || null,
      redactPii(cleanStr(payload.reporter_name, 80) || 'Citizen'),
      cleanStr(payload.category || payload.suggestion_type, 40) || 'correction',
      message,
      suggestedUrl,
      now,
      now
    )
    .run();
  return { ok: true, id: sugId, message: 'Submitted for editorial review.' };
}

export async function handlePublicJobsOverviewApi(request, env) {
  const data = await listPublicJobsOverview(env);
  return json({ ok: true, ...data }, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=300' });
}

export async function handlePublicJobsItemsApi(request, env) {
  const url = new URL(request.url);
  const data = await listPublicJobsItems(env, {
    domain: url.searchParams.get('domain'),
    item_type: url.searchParams.get('item_type'),
    qualification: url.searchParams.get('qualification'),
    language: url.searchParams.get('language'),
    state_location: url.searchParams.get('state_location'),
    q: url.searchParams.get('q'),
    active_only: url.searchParams.get('active_only'),
    limit: url.searchParams.get('limit')
  });
  return json({ ok: true, ...data }, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=300' });
}

export async function handlePublicJobsSuggestApi(request, env) {
  try {
    const body = await readJson(request);
    const result = await submitPublicJobsSuggestion(env, body);
    return json(result, 201);
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    return json({ ok: false, message: (err && err.message) || 'Invalid suggestion payload' }, status);
  }
}

export async function handleJobsDirectorySitemapXml(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  await ensureJobsDirectoryStudioSchema(env.DB);
  const origin = (env && env.PUBLIC_ORIGIN) || 'https://csodisha.com';
  const urls = [{ loc: `${origin}/jobs/`, priority: '0.9', changefreq: 'daily' }];

  for (const domain of JOBS_DOMAINS) {
    urls.push({ loc: `${origin}/jobs/${domain}/`, priority: '0.8', changefreq: 'daily' });
  }

  const foldersRes = await env.DB
    .prepare('SELECT id, domain_slug, parent_id, slug, updated_at FROM jobs_directory_folders WHERE is_published = 1 ORDER BY depth ASC, sort_order ASC')
    .all();
  const byId = new Map((foldersRes.results || []).map(f => [f.id, f]));
  for (const f of (foldersRes.results || [])) {
    const segs = [];
    let cur = f;
    let ok = true;
    const seen = new Set();
    while (cur) {
      if (seen.has(cur.id)) { ok = false; break; }
      seen.add(cur.id);
      segs.unshift(cur.slug);
      if (!cur.parent_id) break;
      cur = byId.get(cur.parent_id);
      if (!cur) { ok = false; break; }
    }
    if (!ok) continue;
    urls.push({
      loc: `${origin}/jobs/${f.domain_slug}/${segs.join('/')}/`,
      lastmod: (f.updated_at || '').slice(0, 10),
      priority: '0.7',
      changefreq: 'weekly'
    });
  }

  const itemsRes = await env.DB
    .prepare("SELECT slug, updated_at FROM jobs_directory_items WHERE status = 'published' ORDER BY updated_at DESC LIMIT 1000")
    .all();
  for (const it of (itemsRes.results || [])) {
    urls.push({
      loc: `${origin}/jobs/item/${it.slug}/`,
      lastmod: (it.updated_at || '').slice(0, 10),
      priority: '0.8',
      changefreq: 'daily'
    });
  }

  const xmlEsc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(u => `  <url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${xmlEsc(u.lastmod)}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
    .join('\n')}\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900'
    }
  });
}
