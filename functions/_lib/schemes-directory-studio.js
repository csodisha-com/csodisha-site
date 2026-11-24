// Schemes & Benefits Directory Suite — Shared 4-Layer D1 Multi-Level Engine
// Modules #01-#08:
//   #01 govt-public-welfare         — Government & Public Welfare
//   #02 education-employment        — Education, Employment & Talent
//   #03 agriculture-livelihoods     — Agriculture, Business & Livelihoods
//   #04 health-housing-protection   — Health, Housing & Financial Protection
//   #05 communities-beneficiaries   — Communities & Special Beneficiaries
//   #06 private-global-innovation   — Private, Global & Innovation Support
//   #07 find-schemes-eligibility    — Find Schemes & Check Eligibility
//   #08 citizen-services-verification — Citizen Services & Verification
import { HttpError, json, readJson, validationError } from './http.js';
import { ensureLiveOdishaDirectoryContentSeeded } from './odisha-directory-seed.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape } from './validate.js';

export const SCHEMES_DOMAINS = [
  'govt-public-welfare',
  'education-employment',
  'agriculture-livelihoods',
  'health-housing-protection',
  'communities-beneficiaries',
  'private-global-innovation',
  'find-schemes-eligibility',
  'citizen-services-verification'
];

export const SCHEMES_DOMAIN_META = {
  'govt-public-welfare': {
    num: '01',
    title: 'Government & Public Welfare',
    publicPath: '/schemes/govt-public-welfare/',
    summary: 'Subhadra Yojana, Madhu Babu Pension, Mamata, Mission Shakti, NFSA/SFSS Food Security & Ujjwala.'
  },
  'education-employment': {
    num: '02',
    title: 'Education, Employment & Talent',
    publicPath: '/schemes/education-employment/',
    summary: 'Odisha State Scholarship Portal, NSP, Nua-O, Sudakshya, PMKVY, NAPS & OLM Skill Drives.'
  },
  'agriculture-livelihoods': {
    num: '03',
    title: 'Agriculture, Business & Livelihoods',
    publicPath: '/schemes/agriculture-livelihoods/',
    summary: 'CM-KISAN (KALIA), PM-KISAN, PMFBY Crop Insurance, Startup Odisha, MKUY, PMEGP & PM Vishwakarma.'
  },
  'health-housing-protection': {
    num: '04',
    title: 'Health, Housing & Financial Protection',
    publicPath: '/schemes/health-housing-protection/',
    summary: 'Gopabandhu Jan Arogya Yojana (GJAY), Ayushman Bharat, Niramaya, Antyodaya Gruha, PMAY & APY.'
  },
  'communities-beneficiaries': {
    num: '05',
    title: 'Communities & Special Beneficiaries',
    publicPath: '/schemes/communities-beneficiaries/',
    summary: 'SC/ST, OBC/SEBC, Minority, Senior Citizens, PwD, Construction Workers & PVTG welfare schemes.'
  },
  'private-global-innovation': {
    num: '06',
    title: 'Private, Global & Innovation Support',
    publicPath: '/schemes/private-global-innovation/',
    summary: 'CSR education/livelihood grants, global fellowships, R&D innovation funds & NGO/foundation aid.'
  },
  'find-schemes-eligibility': {
    num: '07',
    title: 'Find Schemes & Check Eligibility',
    publicPath: '/schemes/find-schemes-eligibility/',
    summary: 'Interactive eligibility guides by income, age, gender, occupation, district & social category.'
  },
  'citizen-services-verification': {
    num: '08',
    title: 'Citizen Services & Verification',
    publicPath: '/schemes/citizen-services-verification/',
    summary: 'Mo Seba Kendra, e-District Odisha, Aadhaar NPCI seeding, grievance portals & anti-fraud checks.'
  }
};

export const SCHEME_TYPES = [
  'state_scheme',
  'central_scheme',
  'scholarship',
  'subsidy_loan',
  'health_insurance',
  'pension_social',
  'eligibility_tool',
  'citizen_service'
];

export const SPONSOR_LEVELS = ['Odisha State', 'Central Govt', 'Joint State-Central', 'CSR / Global'];
export const APPLICATION_MODES = ['Online Portal', 'Mo Seba Kendra / CSC', 'Offline / Block Office', 'Hybrid'];
export const SCHEMES_STATUSES = ['draft', 'published', 'archived'];
export const SCHEMES_LANGUAGES = ['EN', 'OR', 'EN+OR'];
export const SCHEMES_SUGGESTION_TYPES = ['topic', 'correction', 'dead_link'];
export const SCHEMES_SUGGESTION_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];

function nowIso() {
  return new Date().toISOString();
}

export function validateSafePortalUrl(raw) {
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
  s = s.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED-AADHAAR]');
  s = s.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[REDACTED-PAN]');
  s = s.replace(/(?:\+91[\s-]?)?[6-9]\d{9}\b/g, '[REDACTED-PHONE]');
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
  return [...new Set(arr.map(x => cleanStr(x, 40)).filter(Boolean))].slice(0, 14);
}

function sanitizeLinks(raw) {
  const list = parseJsonArray(raw);
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const url = validateSafePortalUrl(item.url);
    if (!url) continue;
    out.push({
      label: cleanStr(item.label, 120) || 'Official Link',
      url
    });
    if (out.length >= 15) break;
  }
  return out;
}

export async function purgeSchemesDirectoryCache(env) {
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const origin = (env && env.PUBLIC_ORIGIN) || 'https://csodisha.com';
      const paths = [
        '/schemes/',
        '/schemes-benefits/',
        '/api/public/schemes-directory/overview',
        '/api/public/schemes-directory/items',
        '/api/content/schemes-directory',
        '/sitemap-schemes.xml'
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

// Idempotent depth 1 -> 2 -> 3 Odisha & Central seed for Domains #01-#04
const SEED_FOLDERS_BY_DOMAIN = {};

const SEED_ITEMS_BY_DOMAIN = {};

const _schemaReady = new WeakSet();

export async function ensureSchemesDirectoryStudioSchema(db) {
  if (!db) throw new Error('D1 database binding is required');
  if (_schemaReady.has(db)) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS schemes_directory_folders (
      id TEXT PRIMARY KEY,
      domain_slug TEXT NOT NULL,
      parent_id TEXT,
      depth INTEGER NOT NULL DEFAULT 1,
      name_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL,
      description_en TEXT NOT NULL DEFAULT '',
      description_or TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      featured_badge TEXT NOT NULL DEFAULT '',
      verified_at TEXT,
      legacy_node_id TEXT,
      legacy_code TEXT,
      sort_order INTEGER NOT NULL DEFAULT 10,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(domain_slug, slug)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS schemes_directory_items (
      id TEXT PRIMARY KEY,
      domain_slug TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      title TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL UNIQUE,
      scheme_type TEXT NOT NULL DEFAULT 'state_scheme',
      sponsor_level TEXT NOT NULL DEFAULT 'Odisha State',
      department_name TEXT NOT NULL DEFAULT '',
      beneficiary_group TEXT NOT NULL DEFAULT 'All Citizens',
      benefit_amount TEXT NOT NULL DEFAULT '',
      income_limit TEXT NOT NULL DEFAULT '',
      application_mode TEXT NOT NULL DEFAULT 'Online Portal',
      application_deadline TEXT NOT NULL DEFAULT '',
      official_apply_url TEXT NOT NULL DEFAULT '',
      official_portal_verified INTEGER NOT NULL DEFAULT 0,
      language_parity TEXT NOT NULL DEFAULT 'EN',
      summary TEXT NOT NULL DEFAULT '',
      eligibility_criteria TEXT NOT NULL DEFAULT '',
      documents_required TEXT NOT NULL DEFAULT '',
      body_html TEXT NOT NULL DEFAULT '',
      pdf_url TEXT NOT NULL DEFAULT '',
      pdf_size_bytes INTEGER NOT NULL DEFAULT 0,
      cover_image_url TEXT NOT NULL DEFAULT '',
      links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      entity_tags_json TEXT NOT NULL DEFAULT '[]',
      legacy_post_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      verified_at TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS schemes_directory_revisions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS schemes_directory_suggestions (
      id TEXT PRIMARY KEY,
      domain_slug TEXT NOT NULL,
      folder_id TEXT,
      item_id TEXT,
      suggestion_type TEXT NOT NULL DEFAULT 'correction',
      reporter_name TEXT NOT NULL DEFAULT 'Citizen',
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

  await addMissingColumns(db, 'schemes_directory_folders', [
    ['title_or', "TEXT NOT NULL DEFAULT ''"],
    ['description_en', "TEXT NOT NULL DEFAULT ''"],
    ['description_or', "TEXT NOT NULL DEFAULT ''"],
    ['seo_title', "TEXT NOT NULL DEFAULT ''"],
    ['seo_description', "TEXT NOT NULL DEFAULT ''"],
    ['featured_badge', "TEXT NOT NULL DEFAULT ''"],
    ['verified_at', 'TEXT'],
    ['legacy_node_id', 'TEXT'],
    ['legacy_code', 'TEXT'],
    ['sort_order', 'INTEGER NOT NULL DEFAULT 10'],
    ['is_active', 'INTEGER NOT NULL DEFAULT 1']
  ]);

  await addMissingColumns(db, 'schemes_directory_items', [
    ['title_or', "TEXT NOT NULL DEFAULT ''"],
    ['scheme_type', "TEXT NOT NULL DEFAULT 'state_scheme'"],
    ['sponsor_level', "TEXT NOT NULL DEFAULT 'Odisha State'"],
    ['department_name', "TEXT NOT NULL DEFAULT ''"],
    ['beneficiary_group', "TEXT NOT NULL DEFAULT 'All Citizens'"],
    ['benefit_amount', "TEXT NOT NULL DEFAULT ''"],
    ['income_limit', "TEXT NOT NULL DEFAULT ''"],
    ['application_mode', "TEXT NOT NULL DEFAULT 'Online Portal'"],
    ['application_deadline', "TEXT NOT NULL DEFAULT ''"],
    ['official_apply_url', "TEXT NOT NULL DEFAULT ''"],
    ['official_portal_verified', 'INTEGER NOT NULL DEFAULT 0'],
    ['language_parity', "TEXT NOT NULL DEFAULT 'EN'"],
    ['eligibility_criteria', "TEXT NOT NULL DEFAULT ''"],
    ['documents_required', "TEXT NOT NULL DEFAULT ''"],
    ['pdf_url', "TEXT NOT NULL DEFAULT ''"],
    ['pdf_size_bytes', 'INTEGER NOT NULL DEFAULT 0'],
    ['cover_image_url', "TEXT NOT NULL DEFAULT ''"],
    ['links_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['tags_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['entity_tags_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['legacy_post_id', 'TEXT'],
    ['verified_at', 'TEXT'],
    ['published_at', 'TEXT']
  ]);

  await db.batch([
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sd_folders_domain ON schemes_directory_folders(domain_slug, parent_id, sort_order)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sd_items_domain_folder ON schemes_directory_items(domain_slug, folder_id, status)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sd_items_slug ON schemes_directory_items(slug)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sd_rev_item ON schemes_directory_revisions(item_id, created_at DESC)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sd_sug_domain ON schemes_directory_suggestions(domain_slug, status)')
  ]);

  // Clean-slate v232: auto-seeding disabled; schemes_directory_folders and schemes_directory_items
  // are controlled strictly from Admin Studio (/admin/) via Cloudflare D1.
  _schemaReady.add(db);
}

function mapLegacySchemeGroup(slugOrTitle) {
  const s = String(slugOrTitle || '').toLowerCase();
  if (s.includes('education') || s.includes('employment') || s.includes('scholarship') || s.includes('talent')) return 'education-employment';
  if (s.includes('agri') || s.includes('livelihood') || s.includes('business') || s.includes('msme')) return 'agriculture-livelihoods';
  if (s.includes('health') || s.includes('housing') || s.includes('protection') || s.includes('insurance')) return 'health-housing-protection';
  if (s.includes('communit') || s.includes('beneficiar') || /\bsc\b|\bst\b|\bpwd\b|sc\/st|sebc|obc|minority|senior/.test(s)) return 'communities-beneficiaries';
  if (s.includes('private') || s.includes('global') || s.includes('innovation') || s.includes('csr')) return 'private-global-innovation';
  if (s.includes('find') || s.includes('eligib')) return 'find-schemes-eligibility';
  if (s.includes('service') || s.includes('verif')) return 'citizen-services-verification';
  return 'govt-public-welfare';
}

function safeParseJsonObj(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function bridgeLegacySchemesTables(db, now) {
  try {
    const nodesTbl = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schemes_directory_nodes'").first();
    if (nodesTbl) {
      const res = await db
        .prepare("SELECT id, slug, parent_slug, level, title, title_or, subtitle, subtitle_or, badge_text, official_url, metadata_json, sort_order, status FROM schemes_directory_nodes WHERE COALESCE(status, 'published') != 'archived' ORDER BY sort_order ASC, id ASC")
        .all()
        .catch(() => ({ results: [] }));
      const rows = res.results || [];
      const nonGroupRows = rows.filter(r => r.level !== 'group');
      const bridged = await db.prepare('SELECT COUNT(*) AS cnt FROM schemes_directory_folders WHERE legacy_node_id IS NOT NULL').first();
      if (nonGroupRows.length && Number(bridged?.cnt || 0) < nonGroupRows.length) {
        const bySlug = new Map(rows.map(r => [r.slug, r]));
        const domainBySlug = new Map();
        for (const r of rows) {
          if (r.level === 'group' || !r.parent_slug) {
            domainBySlug.set(r.slug, mapLegacySchemeGroup(r.slug + ' ' + r.title));
          }
        }
        function resolveNodeDomain(r) {
          let cur = r;
          const seen = new Set();
          while (cur && !seen.has(cur.slug)) {
            seen.add(cur.slug);
            if (domainBySlug.has(cur.slug)) return domainBySlug.get(cur.slug);
            cur = cur.parent_slug ? bySlug.get(cur.parent_slug) : null;
          }
          return mapLegacySchemeGroup(r.slug + ' ' + r.title);
        }

        const folderIdBySlug = new Map();
        const usedFolderSlugs = new Set();
        const usedItemSlugs = new Set();
        const folderStmts = [];
        const entryItemStmts = [];
        const order = { section: 1, subcategory: 2, entry: 3 };
        const sorted = nonGroupRows.slice().sort((a, b) => (order[a.level] || 2) - (order[b.level] || 2));

        for (const r of sorted) {
          const domain = resolveNodeDomain(r);
          const depth = order[r.level] || 1;
          const parentFolderId = r.parent_slug ? (folderIdBySlug.get(r.parent_slug) || null) : null;
          const cleanId = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '');
          const fid = 'sf-leg-' + cleanId;
          folderIdBySlug.set(r.slug, fid);
          let cleanSlug = slugify(r.slug || r.title || fid);
          if (usedFolderSlugs.has(domain + ':' + cleanSlug)) {
            cleanSlug = cleanSlug + '-' + cleanId.slice(-6);
          }
          usedFolderSlugs.add(domain + ':' + cleanSlug);

          const descEn = cleanStr(r.subtitle, 500);
          const descOr = cleanStr(r.subtitle_or, 500);
          folderStmts.push(
            db.prepare(`INSERT OR IGNORE INTO schemes_directory_folders
              (id, domain_slug, parent_id, depth, name_en, title_or, slug, description_en, description_or, seo_title, seo_description, featured_badge, legacy_node_id, legacy_code, sort_order, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
              .bind(
                fid, domain, parentFolderId, depth,
                cleanStr(r.title, 160) || 'Scheme Directory',
                cleanStr(r.title_or, 180),
                cleanSlug,
                descEn,
                descOr,
                `${cleanStr(r.title, 120)} — CSOdisha`,
                descEn || cleanStr(r.title, 180),
                cleanStr(r.badge_text, 60),
                String(r.id),
                cleanStr(r.slug, 120),
                Number(r.sort_order || 10),
                now, now
              )
          );

          if (r.level === 'entry') {
            const meta = safeParseJsonObj(r.metadata_json);
            let safeUrl = '';
            try {
              const rawUrl = r.official_url || meta.official_url || meta.apply_url || '';
              if (rawUrl) safeUrl = validateSafePortalUrl(rawUrl);
            } catch {
              safeUrl = '';
            }
            const sponsorRaw = cleanStr(meta.sponsor_level || meta.gov_level || '', 40);
            const sponsorLevel = SPONSOR_LEVELS.includes(sponsorRaw)
              ? sponsorRaw
              : (/central|pm-|national|nsp/i.test(r.title + ' ' + r.slug) ? 'Central Govt' : 'Odisha State');
            const deptName = cleanStr(meta.department || meta.department_name || (sponsorLevel === 'Central Govt' ? 'Govt of India' : 'Govt of Odisha'), 120);
            const benGroup = cleanStr(meta.beneficiary || meta.beneficiary_group || 'Eligible Citizens', 120);
            const benefitAmt = cleanStr(meta.benefit || meta.benefit_amount || '', 200);
            const elig = cleanStr(meta.eligibility || descEn, 1500);
            const docs = cleanStr(Array.isArray(meta.documents) ? meta.documents.join('\n') : (meta.documents || ''), 1500);
            const tagsArr = Array.isArray(meta.tags) ? meta.tags.slice(0, 10) : [sponsorLevel, r.badge_text].filter(Boolean);
            let itemSlug = slugify(r.slug || r.title || cleanId);
            if (usedItemSlugs.has(itemSlug)) itemSlug = itemSlug + '-' + cleanId.slice(-6);
            usedItemSlugs.add(itemSlug);

            entryItemStmts.push(
              db.prepare(`INSERT OR IGNORE INTO schemes_directory_items
                (id, domain_slug, folder_id, title, title_or, slug, scheme_type, sponsor_level, department_name, beneficiary_group,
                 benefit_amount, official_apply_url, official_portal_verified, language_parity, summary, eligibility_criteria, documents_required,
                 tags_json, legacy_post_id, status, verified_at, published_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(
                  'si-node-' + cleanId,
                  domain,
                  fid,
                  cleanStr(r.title, 200) || 'Scheme Entry',
                  cleanStr(r.title_or, 200),
                  itemSlug,
                  cleanStr(meta.scheme_type || (sponsorLevel === 'Central Govt' ? 'central_scheme' : 'state_scheme'), 40),
                  sponsorLevel,
                  deptName,
                  benGroup,
                  benefitAmt,
                  safeUrl,
                  safeUrl ? 1 : 0,
                  r.title_or ? 'EN+OR' : 'EN',
                  descEn || cleanStr(r.title, 240),
                  elig,
                  docs,
                  JSON.stringify(tagsArr),
                  'node:' + String(r.id),
                  r.status === 'draft' ? 'draft' : 'published',
                  safeUrl ? now : null,
                  now, now, now
                )
            );
          }
        }
        if (folderStmts.length) await runBatched(db, folderStmts, 45);
        if (entryItemStmts.length) await runBatched(db, entryItemStmts, 45);
      }
    }

    const folderRes = await db.prepare('SELECT id, domain_slug FROM schemes_directory_folders ORDER BY depth ASC, sort_order ASC').all();
    const firstFolderByDomain = new Map();
    let fallbackFolderId = null;
    for (const f of (folderRes.results || [])) {
      if (!fallbackFolderId) fallbackFolderId = f.id;
      if (!firstFolderByDomain.has(f.domain_slug)) firstFolderByDomain.set(f.domain_slug, f.id);
    }

    const legSchemesTbl = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schemes_directory'").first();
    if (legSchemesTbl) {
      const bridgedItems = await db.prepare("SELECT COUNT(*) AS cnt FROM schemes_directory_items WHERE legacy_post_id IS NOT NULL AND legacy_post_id NOT LIKE 'node:%' AND legacy_post_id NOT LIKE 'post:%'").first();
      if (Number(bridgedItems?.cnt || 0) === 0) {
        const rowsRes = await db
          .prepare("SELECT id, slug, title, title_or, category, gov_level, department, summary, eligibility, benefits, documents, apply_url FROM schemes_directory WHERE status = 'published' AND deleted_at IS NULL")
          .all()
          .catch(() => ({ results: [] }));
        const stmts = [];
        for (const s of (rowsRes.results || [])) {
          const domain = mapLegacySchemeGroup(s.category || s.title);
          const folderId = firstFolderByDomain.get(domain) || fallbackFolderId;
          if (!folderId) continue;
          let safeUrl = '';
          try { safeUrl = s.apply_url ? validateSafePortalUrl(s.apply_url) : ''; } catch { safeUrl = ''; }
          stmts.push(
            db.prepare(`INSERT OR IGNORE INTO schemes_directory_items
              (id, domain_slug, folder_id, title, title_or, slug, scheme_type, sponsor_level, department_name, beneficiary_group,
               benefit_amount, official_apply_url, official_portal_verified, language_parity, summary, eligibility_criteria, documents_required,
               legacy_post_id, status, verified_at, published_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'state_scheme', ?, ?, 'All Citizens', ?, ?, 1, 'EN+OR', ?, ?, ?, ?, 'published', ?, ?, ?, ?)`)
              .bind(
                'si-leg-' + String(s.id),
                domain,
                folderId,
                cleanStr(s.title, 200),
                cleanStr(s.title_or, 200),
                slugify(s.slug || s.title) + '-leg',
                cleanStr(s.gov_level, 40) || 'Odisha State',
                cleanStr(s.department, 120),
                cleanStr(s.benefits, 200),
                safeUrl,
                cleanStr(s.summary, 500),
                cleanStr(s.eligibility, 1500),
                cleanStr(s.documents, 1500),
                String(s.id),
                now, now, now, now
              )
          );
        }
        if (stmts.length) await runBatched(db, stmts, 45);
      }
    }

    const postsTbl = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'").first();
    if (postsTbl) {
      const postBridged = await db.prepare("SELECT COUNT(*) AS cnt FROM schemes_directory_items WHERE legacy_post_id LIKE 'post:%'").first();
      if (Number(postBridged?.cnt || 0) === 0) {
        const postsRes = await db
          .prepare("SELECT id, slug, title, summary, body, status FROM posts WHERE type = 'scheme' AND COALESCE(status, 'published') = 'published' LIMIT 500")
          .all()
          .catch(() => ({ results: [] }));
        const stmts = [];
        for (const p of (postsRes.results || [])) {
          const domain = mapLegacySchemeGroup(p.title + ' ' + (p.summary || ''));
          const folderId = firstFolderByDomain.get(domain) || fallbackFolderId;
          if (!folderId) continue;
          stmts.push(
            db.prepare(`INSERT OR IGNORE INTO schemes_directory_items
              (id, domain_slug, folder_id, title, slug, scheme_type, sponsor_level, department_name, beneficiary_group,
               summary, body_html, legacy_post_id, status, published_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'state_scheme', 'Odisha State', 'Govt of Odisha', 'All Citizens', ?, ?, ?, 'published', ?, ?, ?)`)
              .bind(
                'si-post-' + String(p.id),
                domain,
                folderId,
                cleanStr(p.title, 200),
                slugify(p.slug || p.title) + '-post',
                cleanStr(p.summary, 500),
                String(p.body || ''),
                'post:' + String(p.id),
                now, now, now
              )
          );
        }
        if (stmts.length) await runBatched(db, stmts, 45);
      }
    }
  } catch {
    // Non-fatal in unit tests without legacy tables
  }
}

function resolveDomain(raw) {
  let d = cleanStr(raw, 60);
  if (!d) return 'govt-public-welfare';
  if (d === 'communities-special') d = 'communities-beneficiaries';
  if (d === 'find-check-eligibility') d = 'find-schemes-eligibility';
  if (!SCHEMES_DOMAINS.includes(d)) {
    throw validationError('Unknown schemes directory domain: ' + d);
  }
  return d;
}

function buildFolderTree(folders, itemCountByFolder) {
  const byId = new Map();
  const roots = [];
  for (const f of folders) {
    byId.set(f.id, { ...f, item_count: itemCountByFolder.get(f.id) || 0, children: [] });
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
    official_portal_verified: Boolean(row.official_portal_verified),
    links: parseJsonArray(row.links_json),
    tags: parseJsonArray(row.tags_json),
    entity_tags: parseJsonArray(row.entity_tags_json)
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
    .prepare('SELECT * FROM schemes_directory_folders WHERE domain_slug = ? ORDER BY depth ASC, sort_order ASC, name_en ASC')
    .bind(domain)
    .all();
  const folders = foldersRes.results || [];

  const countsRes = await env.DB
    .prepare('SELECT folder_id, COUNT(*) AS cnt FROM schemes_directory_items WHERE domain_slug = ? GROUP BY folder_id')
    .bind(domain)
    .all();
  const itemCountByFolder = new Map((countsRes.results || []).map(r => [r.folder_id, Number(r.cnt || 0)]));

  const allItemsRes = await env.DB
    .prepare('SELECT * FROM schemes_directory_items WHERE domain_slug = ? ORDER BY updated_at DESC')
    .bind(domain)
    .all();
  const allItems = (allItemsRes.results || []).map(hydrateItemRow);

  const sugRow = await env.DB
    .prepare("SELECT COUNT(*) AS cnt FROM schemes_directory_suggestions WHERE domain_slug = ? AND status = 'pending'")
    .bind(domain)
    .first();

  const [crossF, crossI] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS cnt FROM schemes_directory_folders').first(),
    env.DB.prepare("SELECT COUNT(*) AS cnt FROM schemes_directory_items WHERE status = 'published'").first()
  ]);

  let filteredItems = allItems;
  if (folderFilter) {
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
        if (!allowed.has(ch)) { allowed.add(ch); queue.push(ch); }
      }
    }
    filteredItems = filteredItems.filter(i => allowed.has(i.folder_id));
  }
  if (statusFilter && SCHEMES_STATUSES.includes(statusFilter)) {
    filteredItems = filteredItems.filter(i => i.status === statusFilter);
  }
  if (healthFilter === 'stale') filteredItems = filteredItems.filter(isStaleRow);
  if (q) {
    const ql = q.toLowerCase();
    filteredItems = filteredItems.filter(i =>
      (i.title || '').toLowerCase().includes(ql) ||
      (i.department_name || '').toLowerCase().includes(ql) ||
      (i.beneficiary_group || '').toLowerCase().includes(ql) ||
      (i.summary || '').toLowerCase().includes(ql)
    );
  }

  return json({
    domain,
    meta: SCHEMES_DOMAIN_META[domain] || null,
    tree: buildFolderTree(folders, itemCountByFolder),
    folders: folders.map(f => ({ ...f, item_count: itemCountByFolder.get(f.id) || 0 })),
    items: filteredItems,
    kpis: {
      totalDirectories: folders.length,
      totalItems: allItems.length,
      publishedSchemes: allItems.filter(i => i.status === 'published').length,
      odishaStateSchemes: allItems.filter(i => i.sponsor_level === 'Odisha State').length,
      verifiedPortals: allItems.filter(i => i.official_portal_verified || Boolean(i.verified_at)).length,
      emptyDirectories: folders.filter(f => (itemCountByFolder.get(f.id) || 0) === 0).length,
      staleItems: allItems.filter(isStaleRow).length,
      pendingSuggestions: Number(sugRow?.cnt || 0)
    },
    crossDomainStats: {
      totalDomains: SCHEMES_DOMAINS.length,
      totalFolders: Number(crossF?.cnt || 0),
      totalPublished: Number(crossI?.cnt || 0)
    }
  });
}

async function handleFolders(request, env, actor, id) {
  const method = request.method;
  if (method === 'POST') {
    const body = await readJson(request);
    const domain = resolveDomain(body.domain_slug || body.domain);
    const nameEn = cleanStr(body.name_en || body.title, 160);
    if (!nameEn) throw validationError('Sub-directory name is required.');
    const rawSlug = cleanStr(body.slug, 120) || slugify(nameEn);
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid sub-directory slug.');
    const parentId = cleanStr(body.parent_id, 80) || null;
    let depth = 1;
    if (parentId) {
      const parent = await env.DB.prepare('SELECT id, domain_slug, depth FROM schemes_directory_folders WHERE id = ?').bind(parentId).first();
      if (!parent || parent.domain_slug !== domain) throw validationError('Parent sub-directory not found in this domain.');
      depth = Number(parent.depth || 1) + 1;
      if (depth > 6) throw validationError('Maximum sub-directory nesting depth is 6.');
    }
    const dup = await env.DB.prepare('SELECT id FROM schemes_directory_folders WHERE domain_slug = ? AND slug = ?').bind(domain, rawSlug).first();
    if (dup) throw new HttpError(409, 'SLUG_EXISTS', 'A sub-directory with this slug already exists in this domain.');

    const folderId = 'sf-' + crypto.randomUUID().slice(0, 12);
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO schemes_directory_folders
      (id, domain_slug, parent_id, depth, name_en, title_or, slug, description_en, description_or, seo_title, seo_description, featured_badge, verified_at, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        folderId, domain, parentId, depth, nameEn, cleanStr(body.title_or, 180), rawSlug,
        cleanStr(body.description_en || body.description, 500),
        cleanStr(body.description_or, 500),
        cleanStr(body.seo_title, 160) || `${nameEn} — CSOdisha`,
        cleanStr(body.seo_description, 320) || cleanStr(body.description_en, 320),
        cleanStr(body.featured_badge, 40),
        body.mark_verified ? now : null,
        Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 10,
        body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
        now, now
      ).run();

    await audit(env, request, actor, 'schemes_folder_create', 'schemes_directory_folder', folderId, { domain, nameEn, depth });
    await purgeSchemesDirectoryCache(env);
    const created = await env.DB.prepare('SELECT * FROM schemes_directory_folders WHERE id = ?').bind(folderId).first();
    return json({ folder: created }, 201);
  }

  if (method === 'PUT') {
    if (!id) throw validationError('Folder ID is required.');
    const existing = await env.DB.prepare('SELECT * FROM schemes_directory_folders WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Sub-directory not found.');

    const body = await readJson(request);
    const nameEn = body.name_en !== undefined ? cleanStr(body.name_en, 160) : existing.name_en;
    if (!nameEn) throw validationError('Directory name cannot be empty.');
    const rawSlug = body.slug !== undefined ? (cleanStr(body.slug, 120) || slugify(nameEn)) : existing.slug;
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid slug format.');
    if (rawSlug !== existing.slug) {
      const conflict = await env.DB.prepare('SELECT id FROM schemes_directory_folders WHERE domain_slug = ? AND slug = ? AND id != ?').bind(existing.domain_slug, rawSlug, id).first();
      if (conflict) throw new HttpError(409, 'SLUG_EXISTS', 'Another sub-directory uses that slug.');
    }

    const now = nowIso();
    await env.DB.prepare(`UPDATE schemes_directory_folders
      SET name_en = ?, title_or = ?, slug = ?, description_en = ?, description_or = ?, seo_title = ?, seo_description = ?, featured_badge = ?,
          verified_at = ?, sort_order = ?, is_active = ?, updated_at = ?
      WHERE id = ?`)
      .bind(
        nameEn,
        body.title_or !== undefined ? cleanStr(body.title_or, 180) : existing.title_or,
        rawSlug,
        body.description_en !== undefined ? cleanStr(body.description_en, 500) : existing.description_en,
        body.description_or !== undefined ? cleanStr(body.description_or, 500) : existing.description_or,
        body.seo_title !== undefined ? cleanStr(body.seo_title, 160) : existing.seo_title,
        body.seo_description !== undefined ? cleanStr(body.seo_description, 320) : existing.seo_description,
        body.featured_badge !== undefined ? cleanStr(body.featured_badge, 40) : existing.featured_badge,
        body.mark_verified ? now : existing.verified_at,
        body.sort_order !== undefined && Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : existing.sort_order,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
        now,
        id
      ).run();

    await audit(env, request, actor, 'schemes_folder_update', 'schemes_directory_folder', id, { domain: existing.domain_slug, nameEn });
    await purgeSchemesDirectoryCache(env);
    const updated = await env.DB.prepare('SELECT * FROM schemes_directory_folders WHERE id = ?').bind(id).first();
    return json({ folder: updated });
  }

  if (method === 'DELETE') {
    if (!id) throw validationError('Folder ID is required.');
    const existing = await env.DB.prepare('SELECT * FROM schemes_directory_folders WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Sub-directory not found.');

    const childRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM schemes_directory_folders WHERE parent_id = ?').bind(id).first();
    const itemRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM schemes_directory_items WHERE folder_id = ?').bind(id).first();
    const childCount = Number(childRow?.cnt || 0);
    const itemCount = Number(itemRow?.cnt || 0);
    if (childCount > 0 || itemCount > 0) {
      throw new HttpError(409, 'FOLDER_NOT_EMPTY', `Cannot delete "${existing.name_en}": contains ${childCount} nested sub-directories and ${itemCount} schemes.`);
    }
    await env.DB.prepare('DELETE FROM schemes_directory_folders WHERE id = ?').bind(id).run();
    await audit(env, request, actor, 'schemes_folder_delete', 'schemes_directory_folder', id, { domain: existing.domain_slug, nameEn: existing.name_en });
    await purgeSchemesDirectoryCache(env);
    return json({ deleted: true, id });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed on folders.');
}

async function handleItems(request, env, actor, id, action) {
  const method = request.method;
  if (method === 'GET') {
    if (id) {
      const row = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Scheme item not found.');
      const revRes = await env.DB.prepare('SELECT id, changed_by, change_note, created_at FROM schemes_directory_revisions WHERE item_id = ? ORDER BY created_at DESC LIMIT 20').bind(id).all();
      return json({ item: hydrateItemRow(row), revisions: revRes.results || [] });
    }
    const url = new URL(request.url);
    const domain = resolveDomain(url.searchParams.get('domain'));
    const res = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE domain_slug = ? ORDER BY updated_at DESC LIMIT 200').bind(domain).all();
    return json({ items: (res.results || []).map(hydrateItemRow) });
  }

  if (method === 'POST' && !id) {
    const body = await readJson(request);
    const domain = resolveDomain(body.domain_slug || body.domain);
    const folderId = cleanStr(body.folder_id, 80);
    if (!folderId) throw validationError('Target sub-directory (folder_id) is required.');
    const folder = await env.DB.prepare('SELECT id, domain_slug FROM schemes_directory_folders WHERE id = ?').bind(folderId).first();
    if (!folder || folder.domain_slug !== domain) throw validationError('Selected sub-directory does not belong to this domain.');

    const title = cleanStr(body.title, 200);
    if (!title) throw validationError('Scheme title is required.');
    const rawSlug = cleanStr(body.slug, 140) || slugify(title);
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid slug format.');
    const dup = await env.DB.prepare('SELECT id FROM schemes_directory_items WHERE slug = ?').bind(rawSlug).first();
    const finalSlug = dup ? `${rawSlug}-${crypto.randomUUID().slice(0, 5)}` : rawSlug;

    const officialApplyUrl = validateSafePortalUrl(body.official_apply_url);
    const pdfUrl = validateSafePortalUrl(body.pdf_url);
    const coverUrl = validateSafePortalUrl(body.cover_image_url);
    const links = sanitizeLinks(body.links || body.links_json);
    const tags = parseTags(body.tags || body.tags_json);
    const entityTags = parseTags(body.entity_tags || body.entity_tags_json);
    const schemeType = SCHEME_TYPES.includes(body.scheme_type) ? body.scheme_type : 'state_scheme';
    const sponsorLevel = SPONSOR_LEVELS.includes(body.sponsor_level) ? body.sponsor_level : 'Odisha State';
    const appMode = APPLICATION_MODES.includes(body.application_mode) ? body.application_mode : 'Online Portal';
    const lang = SCHEMES_LANGUAGES.includes(body.language_parity) ? body.language_parity : 'EN';
    const status = SCHEMES_STATUSES.includes(body.status) ? body.status : 'draft';

    const itemId = 'si-' + crypto.randomUUID().slice(0, 12);
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO schemes_directory_items
      (id, domain_slug, folder_id, title, title_or, slug, scheme_type, sponsor_level, department_name, beneficiary_group,
       benefit_amount, income_limit, application_mode, application_deadline, official_apply_url, official_portal_verified,
       language_parity, summary, eligibility_criteria, documents_required, body_html, pdf_url, pdf_size_bytes, cover_image_url,
       links_json, tags_json, entity_tags_json, status, verified_at, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`)
      .bind(
        itemId, domain, folderId, title, cleanStr(body.title_or, 200), finalSlug, schemeType, sponsorLevel,
        cleanStr(body.department_name, 140), cleanStr(body.beneficiary_group, 120) || 'All Citizens',
        cleanStr(body.benefit_amount, 200), cleanStr(body.income_limit, 160), appMode,
        cleanStr(body.application_deadline, 40), officialApplyUrl, body.official_portal_verified ? 1 : 0,
        lang, cleanStr(body.summary, 500), cleanStr(body.eligibility_criteria, 3000), cleanStr(body.documents_required, 3000),
        sanitizeEditorialHtml(body.body_html), pdfUrl, Number(body.pdf_size_bytes || 0), coverUrl,
        JSON.stringify(links), JSON.stringify(tags), JSON.stringify(entityTags), status,
        status === 'published' ? now : null, now, now
      ).run();

    const created = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(itemId).first();
    await env.DB.prepare('INSERT INTO schemes_directory_revisions (id, item_id, snapshot_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('srev-' + crypto.randomUUID().slice(0, 12), itemId, JSON.stringify(created), actor.email, 'Initial creation', now)
      .run();

    await audit(env, request, actor, 'schemes_item_create', 'schemes_directory_item', itemId, { domain, title, status });
    await purgeSchemesDirectoryCache(env);
    return json({ item: hydrateItemRow(created) }, 201);
  }

  if (method === 'PUT' && id) {
    const existing = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme item not found.');

    const body = await readJson(request);
    const folderId = body.folder_id !== undefined ? cleanStr(body.folder_id, 80) : existing.folder_id;
    const title = body.title !== undefined ? cleanStr(body.title, 200) : existing.title;
    if (!title) throw validationError('Title cannot be empty.');
    const rawSlug = body.slug !== undefined ? (cleanStr(body.slug, 140) || slugify(title)) : existing.slug;
    if (!SLUG_RE.test(rawSlug)) throw validationError('Invalid slug format.');
    if (rawSlug !== existing.slug) {
      const dup = await env.DB.prepare('SELECT id FROM schemes_directory_items WHERE slug = ? AND id != ?').bind(rawSlug, id).first();
      if (dup) throw new HttpError(409, 'SLUG_EXISTS', 'Another scheme already uses that slug.');
    }

    const officialApplyUrl = body.official_apply_url !== undefined ? validateSafePortalUrl(body.official_apply_url) : existing.official_apply_url;
    const pdfUrl = body.pdf_url !== undefined ? validateSafePortalUrl(body.pdf_url) : existing.pdf_url;
    const coverUrl = body.cover_image_url !== undefined ? validateSafePortalUrl(body.cover_image_url) : existing.cover_image_url;
    const status = body.status !== undefined && SCHEMES_STATUSES.includes(body.status) ? body.status : existing.status;
    const now = nowIso();

    await env.DB.prepare(`UPDATE schemes_directory_items
      SET folder_id = ?, title = ?, title_or = ?, slug = ?, scheme_type = ?, sponsor_level = ?, department_name = ?, beneficiary_group = ?,
          benefit_amount = ?, income_limit = ?, application_mode = ?, application_deadline = ?, official_apply_url = ?, official_portal_verified = ?,
          language_parity = ?, summary = ?, eligibility_criteria = ?, documents_required = ?, body_html = ?, pdf_url = ?, pdf_size_bytes = ?,
          cover_image_url = ?, links_json = ?, tags_json = ?, entity_tags_json = ?, status = ?, published_at = ?, updated_at = ?
      WHERE id = ?`)
      .bind(
        folderId, title,
        body.title_or !== undefined ? cleanStr(body.title_or, 200) : existing.title_or,
        rawSlug,
        body.scheme_type !== undefined && SCHEME_TYPES.includes(body.scheme_type) ? body.scheme_type : existing.scheme_type,
        body.sponsor_level !== undefined && SPONSOR_LEVELS.includes(body.sponsor_level) ? body.sponsor_level : existing.sponsor_level,
        body.department_name !== undefined ? cleanStr(body.department_name, 140) : existing.department_name,
        body.beneficiary_group !== undefined ? cleanStr(body.beneficiary_group, 120) : existing.beneficiary_group,
        body.benefit_amount !== undefined ? cleanStr(body.benefit_amount, 200) : existing.benefit_amount,
        body.income_limit !== undefined ? cleanStr(body.income_limit, 160) : existing.income_limit,
        body.application_mode !== undefined && APPLICATION_MODES.includes(body.application_mode) ? body.application_mode : existing.application_mode,
        body.application_deadline !== undefined ? cleanStr(body.application_deadline, 40) : existing.application_deadline,
        officialApplyUrl,
        body.official_portal_verified !== undefined ? (body.official_portal_verified ? 1 : 0) : existing.official_portal_verified,
        body.language_parity !== undefined && SCHEMES_LANGUAGES.includes(body.language_parity) ? body.language_parity : existing.language_parity,
        body.summary !== undefined ? cleanStr(body.summary, 500) : existing.summary,
        body.eligibility_criteria !== undefined ? cleanStr(body.eligibility_criteria, 3000) : existing.eligibility_criteria,
        body.documents_required !== undefined ? cleanStr(body.documents_required, 3000) : existing.documents_required,
        body.body_html !== undefined ? sanitizeEditorialHtml(body.body_html) : existing.body_html,
        pdfUrl,
        body.pdf_size_bytes !== undefined ? Number(body.pdf_size_bytes || 0) : existing.pdf_size_bytes,
        coverUrl,
        (body.links !== undefined || body.links_json !== undefined) ? JSON.stringify(sanitizeLinks(body.links !== undefined ? body.links : body.links_json)) : existing.links_json,
        (body.tags !== undefined || body.tags_json !== undefined) ? JSON.stringify(parseTags(body.tags !== undefined ? body.tags : body.tags_json)) : existing.tags_json,
        (body.entity_tags !== undefined || body.entity_tags_json !== undefined) ? JSON.stringify(parseTags(body.entity_tags !== undefined ? body.entity_tags : body.entity_tags_json)) : existing.entity_tags_json,
        status,
        status === 'published' ? (existing.published_at || now) : existing.published_at,
        now,
        id
      ).run();

    const updated = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
    await env.DB.prepare('INSERT INTO schemes_directory_revisions (id, item_id, snapshot_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('srev-' + crypto.randomUUID().slice(0, 12), id, JSON.stringify(updated), actor.email, cleanStr(body.change_note, 120) || 'Updated scheme', now)
      .run();

    await audit(env, request, actor, 'schemes_item_update', 'schemes_directory_item', id, { domain: existing.domain_slug, title, status });
    await purgeSchemesDirectoryCache(env);
    return json({ item: hydrateItemRow(updated) });
  }

  if (method === 'PATCH' && id && action === 'status') {
    const existing = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme item not found.');
    const body = await readJson(request);
    const nextStatus = cleanStr(body.status, 30);
    if (!SCHEMES_STATUSES.includes(nextStatus)) throw validationError('Invalid status.');
    const now = nowIso();
    await env.DB.prepare('UPDATE schemes_directory_items SET status = ?, published_at = ?, updated_at = ? WHERE id = ?')
      .bind(nextStatus, nextStatus === 'published' ? (existing.published_at || now) : existing.published_at, now, id)
      .run();
    await audit(env, request, actor, 'schemes_item_status', 'schemes_directory_item', id, { from: existing.status, to: nextStatus });
    await purgeSchemesDirectoryCache(env);
    const updated = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
    return json({ item: hydrateItemRow(updated), previous_status: existing.status });
  }

  if (method === 'POST' && id && action === 'verify') {
    const existing = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme item not found.');
    const now = nowIso();
    await env.DB.prepare('UPDATE schemes_directory_items SET official_portal_verified = 1, verified_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, id)
      .run();
    await audit(env, request, actor, 'schemes_item_verify', 'schemes_directory_item', id, { domain: existing.domain_slug });
    await purgeSchemesDirectoryCache(env);
    const updated = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
    return json({ item: hydrateItemRow(updated) });
  }

  if (method === 'DELETE' && id) {
    const existing = await env.DB.prepare('SELECT * FROM schemes_directory_items WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme item not found.');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM schemes_directory_revisions WHERE item_id = ?').bind(id),
      env.DB.prepare('DELETE FROM schemes_directory_items WHERE id = ?').bind(id)
    ]);
    await audit(env, request, actor, 'schemes_item_delete', 'schemes_directory_item', id, { domain: existing.domain_slug, title: existing.title });
    await purgeSchemesDirectoryCache(env);
    return json({ deleted: true, id });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed on items.');
}

async function handleSuggestions(request, env, actor, id) {
  const method = request.method;
  if (method === 'GET') {
    const url = new URL(request.url);
    const domain = resolveDomain(url.searchParams.get('domain'));
    const res = await env.DB
      .prepare('SELECT * FROM schemes_directory_suggestions WHERE domain_slug = ? ORDER BY created_at DESC LIMIT 100')
      .bind(domain)
      .all();
    return json({
      suggestions: (res.results || []).map(r => ({
        ...r,
        reporter_name: redactPii(r.reporter_name),
        message: redactPii(r.message)
      }))
    });
  }

  if (method === 'POST') {
    const body = await readJson(request);
    const domain = resolveDomain(body.domain_slug || body.domain);
    const message = redactPii(cleanStr(body.message, 1000));
    if (!message) throw validationError('Suggestion message is required.');
    const sugType = SCHEMES_SUGGESTION_TYPES.includes(body.suggestion_type) ? body.suggestion_type : 'correction';
    const suggestedUrl = body.suggested_url ? validateSafePortalUrl(body.suggested_url) : '';
    const sugId = 'ssug-' + crypto.randomUUID().slice(0, 12);
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO schemes_directory_suggestions
      (id, domain_slug, folder_id, item_id, suggestion_type, reporter_name, message, suggested_url, status, moderator_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`)
      .bind(sugId, domain, cleanStr(body.folder_id, 80) || null, cleanStr(body.item_id, 80) || null, sugType, redactPii(cleanStr(body.reporter_name, 80) || 'Citizen'), message, suggestedUrl, now, now)
      .run();
    const created = await env.DB.prepare('SELECT * FROM schemes_directory_suggestions WHERE id = ?').bind(sugId).first();
    return json({ suggestion: created }, 201);
  }

  if (method === 'PATCH' && id) {
    const existing = await env.DB.prepare('SELECT * FROM schemes_directory_suggestions WHERE id = ?').bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Suggestion not found.');
    const body = await readJson(request);
    const nextStatus = cleanStr(body.status, 30);
    if (!SCHEMES_SUGGESTION_STATUSES.includes(nextStatus)) throw validationError('Invalid status.');
    const now = nowIso();
    await env.DB.prepare('UPDATE schemes_directory_suggestions SET status = ?, moderator_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?')
      .bind(nextStatus, redactPii(cleanStr(body.moderator_note, 400)), actor.email, now, now, id)
      .run();
    await audit(env, request, actor, 'schemes_suggestion_update', 'schemes_directory_suggestion', id, { status: nextStatus });
    const updated = await env.DB.prepare('SELECT * FROM schemes_directory_suggestions WHERE id = ?').bind(id).first();
    return json({ suggestion: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed on suggestions.');
}

export async function handleSchemesDirectoryStudio(request, env, actor, subResource, id, action) {
  await ensureSchemesDirectoryStudioSchema(env.DB);
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
      throw new HttpError(404, 'NOT_FOUND', 'Unknown schemes-directory resource: ' + subResource);
  }
}

// =============================================================================
// Public Read-Only Resolvers, APIs, DPDP-Safe Suggestions & /sitemap-schemes.xml
// =============================================================================

function normalizePublicDomain(raw) {
  let d = cleanStr(raw, 60);
  if (!d) return '';
  if (d === 'communities-special') d = 'communities-beneficiaries';
  if (d === 'find-check-eligibility') d = 'find-schemes-eligibility';
  return SCHEMES_DOMAINS.includes(d) ? d : '';
}

export async function resolvePublicSchemesDirectory(env, segments = []) {
  await ensureSchemesDirectoryStudioSchema(env.DB);
  const cleanSegs = (Array.isArray(segments) ? segments : [])
    .map(s => cleanStr(s, 120))
    .filter(Boolean);
  if (!cleanSegs.length) return null;

  const domain = normalizePublicDomain(cleanSegs[0]);
  if (!domain) return null;
  const meta = SCHEMES_DOMAIN_META[domain];

  const foldersRes = await env.DB
    .prepare('SELECT * FROM schemes_directory_folders WHERE domain_slug = ? AND is_active = 1 ORDER BY depth ASC, sort_order ASC, name_en ASC')
    .bind(domain)
    .all();
  const activeFolders = foldersRes.results || [];
  const byId = new Map(activeFolders.map(f => [f.id, f]));

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
    { title: 'Schemes & Benefits', path: '/schemes/' },
    { title: meta.title, path: `/schemes/${domain}/` }
  ];
  let accPath = `/schemes/${domain}`;

  for (let i = 1; i < cleanSegs.length; i++) {
    const segSlug = cleanSegs[i];
    const parentId = currentFolder ? currentFolder.id : null;
    const match = validFolders.find(f => (f.parent_id || null) === parentId && f.slug === segSlug);
    if (!match) return null;
    currentFolder = match;
    accPath += `/${match.slug}`;
    breadcrumbs.push({ title: match.name_en, path: `${accPath}/` });
  }

  const children = validFolders
    .filter(f => (f.parent_id || null) === (currentFolder ? currentFolder.id : null))
    .map(f => ({ ...f, public_path: `${accPath}/${f.slug}/` }));

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
    .prepare("SELECT * FROM schemes_directory_items WHERE domain_slug = ? AND status = 'published' ORDER BY updated_at DESC")
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

export async function resolvePublicSchemesItem(env, slugOrId) {
  await ensureSchemesDirectoryStudioSchema(env.DB);
  const key = cleanStr(slugOrId, 160);
  if (!key) return null;

  const row = await env.DB
    .prepare("SELECT * FROM schemes_directory_items WHERE (slug = ? OR id = ?) AND status = 'published' LIMIT 1")
    .bind(key, key)
    .first();
  if (!row) return null;

  const foldersRes = await env.DB
    .prepare('SELECT * FROM schemes_directory_folders WHERE domain_slug = ? AND is_active = 1')
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

  const meta = SCHEMES_DOMAIN_META[row.domain_slug];
  const breadcrumbs = [
    { title: 'Schemes & Benefits', path: '/schemes/' },
    { title: meta.title, path: `/schemes/${row.domain_slug}/` }
  ];
  let acc = `/schemes/${row.domain_slug}`;
  for (const f of chain) {
    acc += `/${f.slug}`;
    breadcrumbs.push({ title: f.name_en, path: `${acc}/` });
  }
  breadcrumbs.push({ title: row.title, path: `/schemes/item/${row.slug}/` });

  return {
    item: hydrateItemRow(row),
    folder,
    domain: row.domain_slug,
    meta,
    breadcrumbs
  };
}

export async function listPublicSchemesOverview(env) {
  await ensureSchemesDirectoryStudioSchema(env.DB);
  const [fRes, iRes, sRes, tRes] = await Promise.all([
    env.DB.prepare('SELECT domain_slug, depth, COUNT(*) AS cnt FROM schemes_directory_folders WHERE is_active = 1 GROUP BY domain_slug, depth').all(),
    env.DB.prepare("SELECT domain_slug, COUNT(*) AS cnt, SUM(CASE WHEN official_portal_verified = 1 OR verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified_cnt FROM schemes_directory_items WHERE status = 'published' GROUP BY domain_slug").all(),
    env.DB.prepare("SELECT sponsor_level, COUNT(*) AS cnt FROM schemes_directory_items WHERE status = 'published' GROUP BY sponsor_level HAVING COUNT(*) >= 2").all(),
    env.DB.prepare("SELECT scheme_type, COUNT(*) AS cnt FROM schemes_directory_items WHERE status = 'published' GROUP BY scheme_type HAVING COUNT(*) >= 2").all()
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
  const spMap = new Map((sRes.results || []).map(r => [r.sponsor_level, Number(r.cnt || 0)]));

  let totalFolders = 0;
  let totalPublished = 0;
  let totalVerified = 0;

  const domains = SCHEMES_DOMAINS.map(slug => {
    const meta = SCHEMES_DOMAIN_META[slug];
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
      publicPath: `/schemes/${slug}/`,
      folder_count: fcObj.total,
      depth1_count: fcObj.d1,
      depth2_count: fcObj.d2,
      depth3_count: fcObj.d3,
      item_count: ic,
      verified_count: vc
    };
  }).filter(d => d.folder_count > 0 || d.item_count > 0);

  const typeBreakdown = {};
  for (const r of (tRes.results || [])) {
    if (r.scheme_type) typeBreakdown[r.scheme_type] = Number(r.cnt || 0);
  }

  return {
    domains,
    sponsorBreakdown: {
      odishaState: spMap.get('Odisha State') || 0,
      centralGovt: spMap.get('Central Govt') || 0,
      joint: spMap.get('Joint State-Central') || 0,
      csrGlobal: spMap.get('CSR / Global') || 0
    },
    typeBreakdown,
    totals: {
      totalDomains: domains.length,
      totalSections,
      totalSubcategories,
      totalEntries,
      totalFolders,
      totalPublished,
      totalVerified
    }
  };
}

export async function listPublicSchemesItems(env, opts = {}) {
  await ensureSchemesDirectoryStudioSchema(env.DB);
  const domain = normalizePublicDomain(opts.domain);
  const sponsor = cleanStr(opts.sponsor_level, 40);
  const schemeType = cleanStr(opts.scheme_type, 40);
  const beneficiary = cleanStr(opts.beneficiary_group, 80);
  const mode = cleanStr(opts.application_mode, 40);
  const lang = cleanStr(opts.language, 20);
  const q = cleanStr(opts.q, 120);
  const page = Math.max(1, Number(opts.page || 1));
  const limit = Math.min(100, Math.max(1, Number(opts.limit || 12)));
  const offset = (page - 1) * limit;

  const clauses = ["i.status = 'published'", 'f.is_active = 1'];
  const binds = [];
  if (domain) {
    clauses.push('i.domain_slug = ?');
    binds.push(domain);
  }
  if (sponsor && SPONSOR_LEVELS.includes(sponsor)) {
    clauses.push('i.sponsor_level = ?');
    binds.push(sponsor);
  }
  if (schemeType && SCHEME_TYPES.includes(schemeType)) {
    clauses.push('i.scheme_type = ?');
    binds.push(schemeType);
  }
  if (beneficiary) {
    clauses.push("LOWER(i.beneficiary_group) LIKE ? ESCAPE '\\'");
    binds.push('%' + likeEscape(beneficiary.toLowerCase()) + '%');
  }
  if (mode && APPLICATION_MODES.includes(mode)) {
    clauses.push('i.application_mode = ?');
    binds.push(mode);
  }
  if (lang && SCHEMES_LANGUAGES.includes(lang)) {
    clauses.push('(i.language_parity = ? OR i.language_parity = \'EN+OR\')');
    binds.push(lang);
  }
  if (q) {
    const pat = '%' + likeEscape(q.toLowerCase()) + '%';
    clauses.push("(LOWER(i.title) LIKE ? ESCAPE '\\' OR LOWER(i.department_name) LIKE ? ESCAPE '\\' OR LOWER(i.beneficiary_group) LIKE ? ESCAPE '\\' OR LOWER(i.summary) LIKE ? ESCAPE '\\')");
    binds.push(pat, pat, pat, pat);
  }

  const whereSql = clauses.join(' AND ');
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM schemes_directory_items i JOIN schemes_directory_folders f ON f.id = i.folder_id WHERE ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const sql = `SELECT i.*, f.name_en AS folder_title, f.slug AS folder_slug
    FROM schemes_directory_items i
    JOIN schemes_directory_folders f ON f.id = i.folder_id
    WHERE ${whereSql}
    ORDER BY i.official_portal_verified DESC, i.updated_at DESC
    LIMIT ? OFFSET ?`;
  const res = await env.DB.prepare(sql).bind(...binds, limit, offset).all();
  const items = (res.results || []).map(hydrateItemRow);
  return { items, total, page, limit, totalPages, hasMore: page < totalPages };
}

export async function submitPublicSchemesSuggestion(env, payload = {}) {
  await ensureSchemesDirectoryStudioSchema(env.DB);
  const domain = normalizePublicDomain(payload.domain_slug) || 'govt-public-welfare';
  const message = redactPii(cleanStr(payload.message || payload.details || payload.title, 1000));
  if (!message || message.length < 4) {
    throw validationError('Please enter at least 4 characters describing the correction or update.');
  }
  const sugType = SCHEMES_SUGGESTION_TYPES.includes(payload.suggestion_type || payload.category)
    ? (payload.suggestion_type || payload.category)
    : 'correction';
  const suggestedUrl = payload.suggested_url || payload.source_url
    ? validateSafePortalUrl(payload.suggested_url || payload.source_url)
    : '';
  const sugId = 'ssug-' + crypto.randomUUID().slice(0, 12);
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO schemes_directory_suggestions
    (id, domain_slug, folder_id, item_id, suggestion_type, reporter_name, message, suggested_url, status, moderator_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`)
    .bind(
      sugId, domain, cleanStr(payload.folder_id, 80) || null, cleanStr(payload.item_id, 80) || null,
      sugType, redactPii(cleanStr(payload.reporter_name, 80) || 'Citizen'), message, suggestedUrl, now, now
    ).run();
  return { ok: true, id: sugId, message: 'Submitted for editorial review.' };
}

export async function handlePublicSchemesOverviewApi(request, env) {
  const data = await listPublicSchemesOverview(env);
  return json({ ok: true, ...data }, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=300' });
}

export async function handlePublicSchemesItemsApi(request, env) {
  const url = new URL(request.url);
  const data = await listPublicSchemesItems(env, {
    domain: url.searchParams.get('domain'),
    sponsor_level: url.searchParams.get('sponsor_level'),
    scheme_type: url.searchParams.get('scheme_type'),
    beneficiary_group: url.searchParams.get('beneficiary_group'),
    application_mode: url.searchParams.get('application_mode'),
    language: url.searchParams.get('language'),
    q: url.searchParams.get('q'),
    page: url.searchParams.get('page'),
    limit: url.searchParams.get('limit')
  });
  return json({ ok: true, ...data }, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=300' });
}

export async function handlePublicSchemesSuggestApi(request, env) {
  try {
    const body = await readJson(request);
    const result = await submitPublicSchemesSuggestion(env, body);
    return json(result, 201);
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    return json({ ok: false, message: (err && err.message) || 'Invalid suggestion payload' }, status);
  }
}

export async function handleSchemesDirectorySitemapXml(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  await ensureSchemesDirectoryStudioSchema(env.DB);
  const origin = (env && env.PUBLIC_ORIGIN) || 'https://csodisha.com';
  const urls = [{ loc: `${origin}/schemes/`, priority: '0.9', changefreq: 'daily' }];

  for (const domain of SCHEMES_DOMAINS) {
    urls.push({ loc: `${origin}/schemes/${domain}/`, priority: '0.8', changefreq: 'daily' });
  }

  const foldersRes = await env.DB
    .prepare('SELECT id, domain_slug, parent_id, slug, updated_at FROM schemes_directory_folders WHERE is_active = 1 ORDER BY depth ASC, sort_order ASC')
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
      loc: `${origin}/schemes/${f.domain_slug}/${segs.join('/')}/`,
      lastmod: (f.updated_at || '').slice(0, 10),
      priority: '0.7',
      changefreq: 'weekly'
    });
  }

  const itemsRes = await env.DB
    .prepare("SELECT slug, updated_at FROM schemes_directory_items WHERE status = 'published' ORDER BY updated_at DESC LIMIT 1000")
    .all();
  for (const it of (itemsRes.results || [])) {
    urls.push({
      loc: `${origin}/schemes/item/${it.slug}/`,
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
