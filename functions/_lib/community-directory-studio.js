// Community Directory Suite — Shared 4-Layer D1 Multi-Level Engine
// Modules #01-#10:
//   #01 local-odisha-communities        — Local & Odisha Communities
//   #02 students-educators-mentorship   — Students, Educators & Mentorship
//   #03 careers-business-networks       — Careers, Business & Professional Networks
//   #04 agriculture-rural-livelihoods   — Agriculture & Rural Livelihoods
//   #05 women-families-inclusion        — Women, Families, Health & Inclusion
//   #06 youth-ngos-volunteering         — Youth, NGOs & Volunteering
//   #07 culture-sports-traditional      — Culture, Sports & Traditional Communities
//   #08 environment-science-tech        — Environment, Science & Technology
//   #09 digital-international-forums    — Digital, International & Community Forums
//   #10 community-safety-governance     — Community Directory, Safety & Governance
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape } from './validate.js';

export const COMMUNITY_DOMAINS = [
  'local-odisha-communities',
  'students-educators-mentorship',
  'careers-business-networks',
  'agriculture-rural-livelihoods',
  'women-families-inclusion',
  'youth-ngos-volunteering',
  'culture-sports-traditional',
  'environment-science-tech',
  'digital-international-forums',
  'community-safety-governance'
];

export const COMMUNITY_DOMAIN_META = {
  'local-odisha-communities': {
    num: '01',
    title: 'Local & Odisha Communities',
    publicPath: '/community/local-odisha-communities/',
    summary: '30-district civic chapters, Gram Panchayat & urban ward citizen circles across Odisha.'
  },
  'students-educators-mentorship': {
    num: '02',
    title: 'Students, Educators & Mentorship',
    publicPath: '/community/students-educators-mentorship/',
    summary: 'OPSC/OSSC/OSSSC peer study circles, UGC/CSIR NET research groups & teacher mentorship networks.'
  },
  'careers-business-networks': {
    num: '03',
    title: 'Careers, Business & Professional Networks',
    publicPath: '/community/careers-business-networks/',
    summary: 'Odisha startup & MSME guilds, artisan cooperatives, university alumni & professional chapters.'
  },
  'agriculture-rural-livelihoods': {
    num: '04',
    title: 'Agriculture & Rural Livelihoods',
    publicPath: '/community/agriculture-rural-livelihoods/',
    summary: 'FPOs, Shree Anna millet collectives, Chilika fisherfolk cooperatives & NTFP livelihood groups.'
  },
  'women-families-inclusion': {
    num: '05',
    title: 'Women, Families, Health & Inclusion',
    publicPath: '/community/women-families-inclusion/',
    summary: 'Mission Shakti SHG federations, Women in STEM, maternal nutrition & Divyangjan inclusion circles.'
  },
  'youth-ngos-volunteering': {
    num: '06',
    title: 'Youth, NGOs & Volunteering',
    publicPath: '/community/youth-ngos-volunteering/',
    summary: 'NSS, NYKS, Red Cross youth chapters, disaster response volunteers & verified Odisha NGOs.'
  },
  'culture-sports-traditional': {
    num: '07',
    title: 'Culture, Sports & Traditional Communities',
    publicPath: '/community/culture-sports-traditional/',
    summary: 'Odissi, Sambalpuri & tribal heritage clubs, hockey/athletics academies & Odia literary societies.'
  },
  'environment-science-tech': {
    num: '08',
    title: 'Environment, Science & Technology',
    publicPath: '/community/environment-science-tech/',
    summary: 'Mangrove & Chilika conservation circles, citizen science, open-source Odia tech & makerspaces.'
  },
  'digital-international-forums': {
    num: '09',
    title: 'Digital, International & Community Forums',
    publicPath: '/community/digital-international-forums/',
    summary: 'Global Odia diaspora chapters, verified Telegram/WhatsApp study forums & moderated Q&A spaces.'
  },
  'community-safety-governance': {
    num: '10',
    title: 'Community Directory, Safety & Governance',
    publicPath: '/community/community-safety-governance/',
    summary: 'Verification standards, DPDP privacy charter, anti-spam reporting & community moderation board.'
  }
};

export const COMMUNITY_TYPES = [
  'district_chapter',
  'study_mentorship',
  'professional_network',
  'fpo_cooperative',
  'shg_welfare',
  'ngo_volunteering',
  'cultural_sports',
  'stem_club',
  'online_forum',
  'safety_governance'
];

export const DISTRICT_REGIONS = [
  'All Odisha (30 Districts)',
  'Bhubaneswar & Cuttack',
  'Balasore, Bhadrak & Mayurbhanj',
  'Sambalpur, Burla & Rourkela',
  'Berhampur & Ganjam',
  'Puri & Konark',
  'Koraput & KBK Region',
  'Global Odia Diaspora'
];

export const MEMBERSHIP_MODELS = [
  'Open & Free',
  'Verified Students / Educators',
  'Registered Members',
  'Volunteer Registration'
];

export const PLATFORM_CHANNELS = [
  'In-Person & Local Chapter',
  'Web Forum / Portal',
  'Telegram / WhatsApp Verified',
  'Hybrid'
];

export const COMMUNITY_STATUSES = ['draft', 'published', 'archived'];
export const COMMUNITY_LANGUAGES = ['EN', 'OR', 'EN+OR'];
export const COMMUNITY_SUGGESTION_TYPES = ['new_community', 'correction', 'safety_report'];
export const COMMUNITY_SUGGESTION_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];

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
      label: cleanStr(item.label, 120) || 'Community Link',
      url
    });
    if (out.length >= 15) break;
  }
  return out;
}

export async function purgeCommunityDirectoryCache(env) {
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const origin = (env && env.PUBLIC_ORIGIN) || 'https://csodisha.com';
      const paths = [
        '/community/',
        '/api/public/community-directory/overview',
        '/api/public/community-directory/items',
        '/sitemap-community.xml'
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

async function addMissingColumns(db, tableName, columns) {
  const info = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  const existing = new Set((info.results || []).map(c => c.name));
  for (const [colName, colDef] of columns) {
    if (!existing.has(colName)) {
      await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`).run();
    }
  }
}

const SEED_FOLDERS_BY_DOMAIN = {};

const SEED_ITEMS_BY_DOMAIN = {};

const _schemaReady = new WeakSet();

function mapLegacyCommunityGroup(slugOrTitle) {
  const s = String(slugOrTitle || '').toLowerCase();
  if (s.includes('student') || s.includes('educator') || s.includes('mentor') || s.includes('exam')) return 'students-educators-mentorship';
  if (s.includes('career') || s.includes('business') || s.includes('startup') || s.includes('alumni') || s.includes('msme')) return 'careers-business-networks';
  if (s.includes('agri') || s.includes('rural') || s.includes('fpo') || s.includes('farmer') || s.includes('millet')) return 'agriculture-rural-livelihoods';
  if (s.includes('women') || s.includes('shg') || s.includes('family') || s.includes('health') || s.includes('inclusion') || /\bpwd\b/.test(s)) return 'women-families-inclusion';
  if (s.includes('youth') || s.includes('ngo') || s.includes('volunteer')) return 'youth-ngos-volunteering';
  if (s.includes('culture') || s.includes('sport') || s.includes('heritage') || s.includes('traditional')) return 'culture-sports-traditional';
  if (s.includes('environment') || s.includes('science') || s.includes('tech') || s.includes('climate')) return 'environment-science-tech';
  if (s.includes('digital') || s.includes('international') || s.includes('diaspora') || s.includes('forum')) return 'digital-international-forums';
  if (s.includes('safety') || s.includes('governance') || s.includes('guideline')) return 'community-safety-governance';
  return 'local-odisha-communities';
}

async function getTableColumns(db, tableName) {
  const info = await db.prepare(`PRAGMA table_info(${tableName})`).all().catch(() => ({ results: [] }));
  return new Set((info.results || []).map(c => c.name));
}

async function bridgeLegacyCommunityTables(db, now) {
  try {
    const nodesTbl = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='community_directory_nodes'").first();
    if (nodesTbl) {
      const cols = await getTableColumns(db, 'community_directory_nodes');
      if (cols.has('id') && cols.has('slug') && cols.has('title')) {
        const descCol = cols.has('subtitle') ? 'subtitle' : (cols.has('description') ? 'description' : "'' AS subtitle");
        const descOrCol = cols.has('subtitle_or') ? 'subtitle_or' : (cols.has('description_or') ? 'description_or' : "'' AS subtitle_or");
        const badgeCol = cols.has('badge_text') ? 'badge_text' : "'' AS badge_text";
        const urlCol = cols.has('official_url') ? 'official_url' : "'' AS official_url";
        const statusWhere = cols.has('status') ? "WHERE COALESCE(status, 'published') != 'archived'" : '';
        const orderSql = cols.has('sort_order') ? 'ORDER BY sort_order ASC, id ASC' : 'ORDER BY id ASC';
        const res = await db
          .prepare(`SELECT id, slug, ${cols.has('parent_slug') ? 'parent_slug' : 'NULL AS parent_slug'}, ${cols.has('level') ? 'level' : "'section' AS level"}, title, ${cols.has('title_or') ? 'title_or' : "'' AS title_or"}, ${descCol}, ${descOrCol}, ${badgeCol}, ${urlCol}, ${cols.has('sort_order') ? 'sort_order' : '10 AS sort_order'} FROM community_directory_nodes ${statusWhere} ${orderSql}`)
          .all()
          .catch(() => ({ results: [] }));
        const rows = res.results || [];
        const nonGroup = rows.filter(r => r.level !== 'group');
        const bridged = await db.prepare('SELECT COUNT(*) AS cnt FROM community_directory_folders WHERE legacy_node_id IS NOT NULL').first();
        if (nonGroup.length && Number(bridged?.cnt || 0) < nonGroup.length) {
          const bySlug = new Map(rows.map(r => [r.slug, r]));
          const domainBySlug = new Map();
          for (const r of rows) {
            if (r.level === 'group' || !r.parent_slug) {
              domainBySlug.set(r.slug, mapLegacyCommunityGroup(r.slug + ' ' + r.title));
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
            return mapLegacyCommunityGroup(r.slug + ' ' + r.title);
          }

          const folderIdBySlug = new Map();
          const usedFolderSlugs = new Set();
          const folderStmts = [];
          const order = { section: 1, subcategory: 2, entry: 3 };
          const sorted = nonGroup.slice().sort((a, b) => (order[a.level] || 2) - (order[b.level] || 2));
          for (const r of sorted) {
            const domain = resolveNodeDomain(r);
            const depth = order[r.level] || 1;
            const parentFolderId = r.parent_slug ? (folderIdBySlug.get(r.parent_slug) || null) : null;
            const cleanId = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '');
            const fid = 'cf-leg-' + cleanId;
            folderIdBySlug.set(r.slug, fid);
            let cleanSlug = slugify(r.slug || r.title || fid);
            if (usedFolderSlugs.has(domain + ':' + cleanSlug)) cleanSlug = cleanSlug + '-' + cleanId.slice(-6);
            usedFolderSlugs.add(domain + ':' + cleanSlug);
            const descEn = cleanStr(r.subtitle || r.description || '', 500);
            const descOr = cleanStr(r.subtitle_or || r.description_or || '', 500);
            folderStmts.push(
              db.prepare(`INSERT OR IGNORE INTO community_directory_folders
                (id, domain_slug, parent_id, depth, name_en, title_or, slug, description_en, description_or, seo_title, seo_description, featured_badge, legacy_node_id, legacy_code, sort_order, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
                .bind(
                  fid, domain, parentFolderId, depth,
                  cleanStr(r.title, 160) || 'Community Directory',
                  cleanStr(r.title_or, 180),
                  cleanSlug, descEn, descOr,
                  `${cleanStr(r.title, 120)} — CSOdisha`,
                  descEn || cleanStr(r.title, 180),
                  cleanStr(r.badge_text, 60),
                  String(r.id),
                  cleanStr(r.slug, 120),
                  Number(r.sort_order || 10),
                  now, now
                )
            );
          }
          if (folderStmts.length) await runBatched(db, folderStmts, 45);
        }
      }
    }

    const folderRes = await db.prepare('SELECT id, domain_slug FROM community_directory_folders ORDER BY depth ASC, sort_order ASC').all();
    const firstFolderByDomain = new Map();
    let fallbackFolderId = null;
    for (const f of (folderRes.results || [])) {
      if (!fallbackFolderId) fallbackFolderId = f.id;
      if (!firstFolderByDomain.has(f.domain_slug)) firstFolderByDomain.set(f.domain_slug, f.id);
    }

    const commTbl = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='communities'").first();
    if (commTbl) {
      const bridged = await db.prepare("SELECT COUNT(*) AS cnt FROM community_directory_items WHERE legacy_post_id LIKE 'comm:%'").first();
      if (Number(bridged?.cnt || 0) === 0) {
        const cols = await getTableColumns(db, 'communities');
        if (cols.has('id') && cols.has('title')) {
          const rowsRes = await db
            .prepare(`SELECT id, ${cols.has('slug') ? 'slug' : 'id AS slug'}, title, ${cols.has('title_or') ? 'title_or' : "'' AS title_or"}, ${cols.has('category') ? 'category' : "'' AS category"}, ${cols.has('summary') ? 'summary' : "'' AS summary"}, ${cols.has('district') ? 'district' : "'' AS district"}, ${cols.has('url') ? 'url' : (cols.has('join_url') ? 'join_url AS url' : "'' AS url")} FROM communities LIMIT 500`)
            .all()
            .catch(() => ({ results: [] }));
          const stmts = [];
          for (const c of (rowsRes.results || [])) {
            const domain = mapLegacyCommunityGroup((c.category || '') + ' ' + c.title);
            const folderId = firstFolderByDomain.get(domain) || fallbackFolderId;
            if (!folderId) continue;
            let safeUrl = '';
            try { if (c.url) safeUrl = validateSafePortalUrl(c.url); } catch { safeUrl = ''; }
            stmts.push(
              db.prepare(`INSERT OR IGNORE INTO community_directory_items
                (id, domain_slug, folder_id, title, title_or, slug, community_type, district_region, membership_model, platform_channel,
                 join_or_portal_url, safety_verified, language_parity, summary, legacy_post_id, status, verified_at, published_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'district_chapter', ?, 'Open & Free', 'Hybrid', ?, 1, 'EN+OR', ?, ?, 'published', ?, ?, ?, ?)`)
                .bind(
                  'ci-leg-' + String(c.id),
                  domain,
                  folderId,
                  cleanStr(c.title, 200),
                  cleanStr(c.title_or, 200),
                  slugify(c.slug || c.title) + '-comm',
                  cleanStr(c.district, 80) || 'All Odisha (30 Districts)',
                  safeUrl,
                  redactPii(cleanStr(c.summary, 500)),
                  'comm:' + String(c.id),
                  now, now, now, now
                )
            );
          }
          if (stmts.length) await runBatched(db, stmts, 45);
        }
      }
    }

    const postsTbl = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'").first();
    if (postsTbl) {
      const bridged = await db.prepare("SELECT COUNT(*) AS cnt FROM community_directory_items WHERE legacy_post_id LIKE 'post:%'").first();
      if (Number(bridged?.cnt || 0) === 0) {
        const cols = await getTableColumns(db, 'posts');
        if (cols.has('id') && cols.has('type') && cols.has('title')) {
          const rowsRes = await db
            .prepare(`SELECT id, ${cols.has('slug') ? 'slug' : 'id AS slug'}, title, ${cols.has('summary') ? 'summary' : "'' AS summary"}, ${cols.has('body') ? 'body' : "'' AS body"} FROM posts WHERE type = 'community' AND COALESCE(status, 'published') = 'published' LIMIT 500`)
            .all()
            .catch(() => ({ results: [] }));
          const stmts = [];
          for (const p of (rowsRes.results || [])) {
            const domain = mapLegacyCommunityGroup(p.title + ' ' + (p.summary || ''));
            const folderId = firstFolderByDomain.get(domain) || fallbackFolderId;
            if (!folderId) continue;
            stmts.push(
              db.prepare(`INSERT OR IGNORE INTO community_directory_items
                (id, domain_slug, folder_id, title, slug, community_type, district_region, membership_model, platform_channel,
                 summary, body_html, legacy_post_id, status, published_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'online_forum', 'All Odisha (30 Districts)', 'Open & Free', 'Web Forum / Portal', ?, ?, ?, 'published', ?, ?, ?)`)
                .bind(
                  'ci-post-' + String(p.id),
                  domain,
                  folderId,
                  cleanStr(p.title, 200),
                  slugify(p.slug || p.title) + '-cpost',
                  redactPii(cleanStr(p.summary, 500)),
                  sanitizeEditorialHtml(p.body || ''),
                  'post:' + String(p.id),
                  now, now, now
                )
            );
          }
          if (stmts.length) await runBatched(db, stmts, 45);
        }
      }
    }
  } catch {
    // Non-fatal in unit tests without legacy tables
  }
}

export async function ensureCommunityDirectoryStudioSchema(db) {
  if (_schemaReady.has(db)) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS community_directory_folders (
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
    db.prepare(`CREATE TABLE IF NOT EXISTS community_directory_items (
      id TEXT PRIMARY KEY,
      domain_slug TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      title TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL UNIQUE,
      community_type TEXT NOT NULL DEFAULT 'district_chapter',
      district_region TEXT NOT NULL DEFAULT 'All Odisha (30 Districts)',
      membership_model TEXT NOT NULL DEFAULT 'Open & Free',
      platform_channel TEXT NOT NULL DEFAULT 'Hybrid',
      join_or_portal_url TEXT NOT NULL DEFAULT '',
      safety_verified INTEGER NOT NULL DEFAULT 0,
      language_parity TEXT NOT NULL DEFAULT 'EN',
      summary TEXT NOT NULL DEFAULT '',
      charter_guidelines TEXT NOT NULL DEFAULT '',
      activities_highlights TEXT NOT NULL DEFAULT '',
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
    db.prepare(`CREATE TABLE IF NOT EXISTS community_directory_revisions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      domain_slug TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS community_directory_suggestions (
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

  await addMissingColumns(db, 'community_directory_folders', [
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

  await addMissingColumns(db, 'community_directory_items', [
    ['title_or', "TEXT NOT NULL DEFAULT ''"],
    ['community_type', "TEXT NOT NULL DEFAULT 'district_chapter'"],
    ['district_region', "TEXT NOT NULL DEFAULT 'All Odisha (30 Districts)'"],
    ['membership_model', "TEXT NOT NULL DEFAULT 'Open & Free'"],
    ['platform_channel', "TEXT NOT NULL DEFAULT 'Hybrid'"],
    ['join_or_portal_url', "TEXT NOT NULL DEFAULT ''"],
    ['safety_verified', 'INTEGER NOT NULL DEFAULT 0'],
    ['language_parity', "TEXT NOT NULL DEFAULT 'EN'"],
    ['charter_guidelines', "TEXT NOT NULL DEFAULT ''"],
    ['activities_highlights', "TEXT NOT NULL DEFAULT ''"],
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
    db.prepare('CREATE INDEX IF NOT EXISTS idx_cd_folders_domain ON community_directory_folders(domain_slug, parent_id, sort_order)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_cd_items_domain_folder ON community_directory_items(domain_slug, folder_id, status)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_cd_items_slug ON community_directory_items(slug)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_cd_rev_item ON community_directory_revisions(item_id, created_at DESC)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_cd_sug_domain ON community_directory_suggestions(domain_slug, status)')
  ]);

  // Clean-slate v232: auto-seeding disabled; community_directory_folders and community_directory_items
  // are controlled strictly from Admin Studio (/admin/) via Cloudflare D1.
  _schemaReady.add(db);
}

function resolveDomain(raw) {
  const d = cleanStr(raw, 60);
  if (!d) return 'local-odisha-communities';
  if (!COMMUNITY_DOMAINS.includes(d)) {
    throw validationError('Unknown community directory domain: ' + d);
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
    safety_verified: Boolean(row.safety_verified),
    links: parseJsonArray(row.links_json),
    tags: parseJsonArray(row.tags_json),
    entity_tags: parseJsonArray(row.entity_tags_json)
  };
}

export async function handleCommunityDirectoryStudio(request, env, actor, resource, id, action) {
  await ensureCommunityDirectoryStudioSchema(env.DB);
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  if (resource === 'tree' && method === 'GET') {
    const domain = resolveDomain(url.searchParams.get('domain'));
    const folderIdFilter = cleanStr(url.searchParams.get('folder_id'), 80);
    const statusFilter = cleanStr(url.searchParams.get('status'), 30);
    const q = cleanStr(url.searchParams.get('q'), 120);

    const foldersRes = await env.DB
      .prepare('SELECT * FROM community_directory_folders WHERE domain_slug = ? ORDER BY depth ASC, sort_order ASC, name_en ASC')
      .bind(domain)
      .all();
    const folders = foldersRes.results || [];

    const allItemsRes = await env.DB
      .prepare('SELECT id, folder_id, status, safety_verified, district_region, verified_at, updated_at FROM community_directory_items WHERE domain_slug = ?')
      .bind(domain)
      .all();
    const allItems = allItemsRes.results || [];
    const itemCountByFolder = new Map();
    const staleCutoff = Date.now() - (180 * 86400 * 1000);
    let staleCount = 0;
    let publishedCount = 0;
    let safetyVerifiedCount = 0;
    let allOdishaCount = 0;

    for (const it of allItems) {
      itemCountByFolder.set(it.folder_id, (itemCountByFolder.get(it.folder_id) || 0) + 1);
      if (it.status === 'published') publishedCount++;
      if (Number(it.safety_verified) === 1 || it.verified_at) safetyVerifiedCount++;
      if (it.district_region === 'All Odisha (30 Districts)') allOdishaCount++;
      const refDate = Date.parse(it.verified_at || it.updated_at || '');
      if (!Number.isNaN(refDate) && refDate < staleCutoff) staleCount++;
    }

    const emptyFolderCount = folders.filter(f => (itemCountByFolder.get(f.id) || 0) === 0).length;

    const clauses = ['i.domain_slug = ?'];
    const binds = [domain];
    if (folderIdFilter) {
      clauses.push('i.folder_id = ?');
      binds.push(folderIdFilter);
    }
    if (statusFilter && COMMUNITY_STATUSES.includes(statusFilter)) {
      clauses.push('i.status = ?');
      binds.push(statusFilter);
    }
    if (q) {
      const pat = '%' + likeEscape(q.toLowerCase()) + '%';
      clauses.push("(LOWER(i.title) LIKE ? ESCAPE '\\' OR LOWER(i.district_region) LIKE ? ESCAPE '\\' OR LOWER(i.summary) LIKE ? ESCAPE '\\')");
      binds.push(pat, pat, pat);
    }

    const itemsRes = await env.DB
      .prepare(`SELECT i.*, f.name_en AS folder_title, f.slug AS folder_slug
        FROM community_directory_items i
        LEFT JOIN community_directory_folders f ON f.id = i.folder_id
        WHERE ${clauses.join(' AND ')}
        ORDER BY i.updated_at DESC
        LIMIT 200`)
      .bind(...binds)
      .all();

    const sugRes = await env.DB
      .prepare("SELECT * FROM community_directory_suggestions WHERE domain_slug = ? ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 80")
      .bind(domain)
      .all();
    const suggestions = sugRes.results || [];
    const pendingSug = suggestions.filter(s => s.status === 'pending').length;

    const [crossF, crossI] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS cnt FROM community_directory_folders WHERE is_active = 1').first(),
      env.DB.prepare("SELECT COUNT(*) AS cnt FROM community_directory_items WHERE status = 'published'").first()
    ]);

    return json({
      ok: true,
      domain,
      meta: COMMUNITY_DOMAIN_META[domain],
      folders: folders.map(f => ({ ...f, item_count: itemCountByFolder.get(f.id) || 0 })),
      tree: buildFolderTree(folders, itemCountByFolder),
      items: (itemsRes.results || []).map(hydrateItemRow),
      suggestions,
      kpis: {
        totalDirectories: folders.length,
        emptyDirectories: emptyFolderCount,
        staleItems: staleCount,
        totalItems: allItems.length,
        publishedCommunities: publishedCount,
        safetyVerifiedCircles: safetyVerifiedCount,
        allOdishaChapters: allOdishaCount,
        pendingSuggestions: pendingSug
      },
      crossDomainStats: {
        totalDomains: COMMUNITY_DOMAINS.length,
        totalFolders: Number(crossF?.cnt || 0),
        totalPublished: Number(crossI?.cnt || 0)
      }
    });
  }

  if (resource === 'folders') {
    if (method === 'POST') {
      const body = await readJson(request);
      const domain = resolveDomain(body.domain_slug);
      const nameEn = cleanStr(body.name_en, 160);
      if (!nameEn) throw validationError('Directory name_en is required.');
      const parentId = cleanStr(body.parent_id, 80) || null;
      let depth = 1;
      if (parentId) {
        const parentRow = await env.DB
          .prepare('SELECT id, depth, domain_slug FROM community_directory_folders WHERE id = ?')
          .bind(parentId)
          .first();
        if (!parentRow || parentRow.domain_slug !== domain) {
          throw validationError('Parent directory not found in this domain.');
        }
        depth = Math.min(6, Number(parentRow.depth || 1) + 1);
      }
      const rawSlug = cleanStr(body.slug, 120) || slugify(nameEn);
      const slug = slugify(rawSlug);
      if (!SLUG_RE.test(slug)) throw validationError('Invalid directory slug.');

      const dup = await env.DB
        .prepare('SELECT id FROM community_directory_folders WHERE domain_slug = ? AND slug = ?')
        .bind(domain, slug)
        .first();
      if (dup) throw new HttpError(409, 'SLUG_EXISTS', 'A directory with that slug already exists in this domain.');

      const fid = 'cf-' + crypto.randomUUID().slice(0, 12);
      const now = nowIso();
      await env.DB.prepare(`INSERT INTO community_directory_folders
        (id, domain_slug, parent_id, depth, name_en, title_or, slug, description_en, description_or, seo_title, seo_description, featured_badge, verified_at, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          fid, domain, parentId, depth, nameEn, cleanStr(body.title_or, 180), slug,
          cleanStr(body.description_en, 600), cleanStr(body.description_or, 600),
          cleanStr(body.seo_title, 160) || `${nameEn} — CSOdisha`,
          cleanStr(body.seo_description, 320),
          cleanStr(body.featured_badge, 40),
          body.mark_verified ? now : null,
          Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 10,
          body.is_active === false || Number(body.is_active) === 0 ? 0 : 1,
          now, now
        ).run();

      await audit(env, request, actor, 'community_directory.folder.create', 'community_directory_folders', fid, { domain, slug });
      await purgeCommunityDirectoryCache(env);
      const created = await env.DB.prepare('SELECT * FROM community_directory_folders WHERE id = ?').bind(fid).first();
      return json({ ok: true, folder: created }, 201);
    }

    if (method === 'PUT' && id) {
      const existing = await env.DB.prepare('SELECT * FROM community_directory_folders WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Directory not found.');
      const body = await readJson(request);
      const nameEn = body.name_en !== undefined ? cleanStr(body.name_en, 160) : existing.name_en;
      if (!nameEn) throw validationError('Directory name_en cannot be empty.');
      const slug = body.slug !== undefined ? slugify(body.slug) : existing.slug;
      if (!SLUG_RE.test(slug)) throw validationError('Invalid directory slug.');

      if (slug !== existing.slug) {
        const dup = await env.DB
          .prepare('SELECT id FROM community_directory_folders WHERE domain_slug = ? AND slug = ? AND id != ?')
          .bind(existing.domain_slug, slug, id)
          .first();
        if (dup) throw new HttpError(409, 'SLUG_EXISTS', 'Slug already in use in this domain.');
      }

      const now = nowIso();
      await env.DB.prepare(`UPDATE community_directory_folders
        SET name_en = ?, title_or = ?, slug = ?, description_en = ?, description_or = ?,
            seo_title = ?, seo_description = ?, featured_badge = ?,
            verified_at = ?, sort_order = ?, is_active = ?, updated_at = ?
        WHERE id = ?`)
        .bind(
          nameEn,
          body.title_or !== undefined ? cleanStr(body.title_or, 180) : existing.title_or,
          slug,
          body.description_en !== undefined ? cleanStr(body.description_en, 600) : existing.description_en,
          body.description_or !== undefined ? cleanStr(body.description_or, 600) : existing.description_or,
          body.seo_title !== undefined ? cleanStr(body.seo_title, 160) : existing.seo_title,
          body.seo_description !== undefined ? cleanStr(body.seo_description, 320) : existing.seo_description,
          body.featured_badge !== undefined ? cleanStr(body.featured_badge, 40) : existing.featured_badge,
          body.mark_verified ? now : existing.verified_at,
          body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order,
          body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
          now, id
        ).run();

      await audit(env, request, actor, 'community_directory.folder.update', 'community_directory_folders', id, { slug });
      await purgeCommunityDirectoryCache(env);
      const updated = await env.DB.prepare('SELECT * FROM community_directory_folders WHERE id = ?').bind(id).first();
      return json({ ok: true, folder: updated });
    }

    if (method === 'DELETE' && id) {
      const existing = await env.DB.prepare('SELECT * FROM community_directory_folders WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Directory not found.');
      const childFolder = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM community_directory_folders WHERE parent_id = ?').bind(id).first();
      const childItems = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM community_directory_items WHERE folder_id = ?').bind(id).first();
      if (Number(childFolder?.cnt || 0) > 0 || Number(childItems?.cnt || 0) > 0) {
        throw new HttpError(409, 'FOLDER_NOT_EMPTY', 'Cannot delete a directory that still contains sub-directories or communities.');
      }
      await env.DB.prepare('DELETE FROM community_directory_folders WHERE id = ?').bind(id).run();
      await audit(env, request, actor, 'community_directory.folder.delete', 'community_directory_folders', id, { slug: existing.slug });
      await purgeCommunityDirectoryCache(env);
      return json({ ok: true, deleted: id });
    }
  }

  if (resource === 'items') {
    if (method === 'GET' && id) {
      const row = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Community item not found.');
      const revs = await env.DB
        .prepare('SELECT id, changed_by, change_note, created_at FROM community_directory_revisions WHERE item_id = ? ORDER BY created_at DESC LIMIT 20')
        .bind(id)
        .all();
      return json({ ok: true, item: hydrateItemRow(row), revisions: revs.results || [] });
    }

    if (method === 'POST' && !id) {
      const body = await readJson(request);
      const domain = resolveDomain(body.domain_slug);
      const folderId = cleanStr(body.folder_id, 80);
      if (!folderId) throw validationError('folder_id is required.');
      const folderRow = await env.DB.prepare('SELECT id, domain_slug FROM community_directory_folders WHERE id = ?').bind(folderId).first();
      if (!folderRow || folderRow.domain_slug !== domain) throw validationError('Target directory not found in this domain.');

      const title = redactPii(cleanStr(body.title, 200));
      if (!title) throw validationError('Title is required.');
      const slug = slugify(body.slug || title) || ('community-' + crypto.randomUUID().slice(0, 8));
      if (!SLUG_RE.test(slug)) throw validationError('Invalid slug.');

      const dup = await env.DB.prepare('SELECT id FROM community_directory_items WHERE slug = ?').bind(slug).first();
      if (dup) throw new HttpError(409, 'SLUG_EXISTS', 'A community entry with this slug already exists.');

      const joinUrl = validateSafePortalUrl(body.join_or_portal_url);
      const pdfUrl = validateSafePortalUrl(body.pdf_url);
      const coverUrl = validateSafePortalUrl(body.cover_image_url);
      const links = sanitizeLinks(body.links);
      const tags = parseTags(body.tags);
      const entityTags = parseTags(body.entity_tags);
      const status = COMMUNITY_STATUSES.includes(body.status) ? body.status : 'draft';
      const commType = COMMUNITY_TYPES.includes(body.community_type) ? body.community_type : 'district_chapter';
      const region = cleanStr(body.district_region, 80) || 'All Odisha (30 Districts)';
      const membership = MEMBERSHIP_MODELS.includes(body.membership_model) ? body.membership_model : 'Open & Free';
      const channel = PLATFORM_CHANNELS.includes(body.platform_channel) ? body.platform_channel : 'Hybrid';
      const lang = COMMUNITY_LANGUAGES.includes(body.language_parity) ? body.language_parity : 'EN';
      const now = nowIso();
      const iid = 'ci-' + crypto.randomUUID().slice(0, 12);

      const summary = redactPii(cleanStr(body.summary, 600));
      const charter = redactPii(cleanStr(body.charter_guidelines, 2000));
      const activities = redactPii(cleanStr(body.activities_highlights, 2000));
      const bodyHtml = redactPii(sanitizeEditorialHtml(body.body_html));

      await env.DB.prepare(`INSERT INTO community_directory_items
        (id, domain_slug, folder_id, title, title_or, slug, community_type, district_region, membership_model, platform_channel,
         join_or_portal_url, safety_verified, language_parity, summary, charter_guidelines, activities_highlights, body_html,
         pdf_url, pdf_size_bytes, cover_image_url, links_json, tags_json, entity_tags_json, status, verified_at, published_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          iid, domain, folderId, title, cleanStr(body.title_or, 200), slug, commType, region, membership, channel,
          joinUrl, body.safety_verified ? 1 : 0, lang, summary, charter, activities, bodyHtml,
          pdfUrl, Number(body.pdf_size_bytes || 0), coverUrl, JSON.stringify(links), JSON.stringify(tags), JSON.stringify(entityTags),
          status, body.safety_verified ? now : null, status === 'published' ? now : null, now, now
        ).run();

      const revId = 'crev-' + crypto.randomUUID().slice(0, 12);
      await env.DB.prepare('INSERT INTO community_directory_revisions (id, item_id, domain_slug, snapshot_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(revId, iid, domain, JSON.stringify({ title, status, join_or_portal_url: joinUrl }), actor.email || actor.userId, 'Initial creation', now)
        .run();

      await audit(env, request, actor, 'community_directory.item.create', 'community_directory_items', iid, { domain, slug, status });
      await purgeCommunityDirectoryCache(env);
      const created = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(iid).first();
      return json({ ok: true, item: hydrateItemRow(created) }, 201);
    }

    if (method === 'PUT' && id) {
      const existing = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community item not found.');
      const body = await readJson(request);

      const folderId = body.folder_id !== undefined ? cleanStr(body.folder_id, 80) : existing.folder_id;
      const title = body.title !== undefined ? redactPii(cleanStr(body.title, 200)) : existing.title;
      if (!title) throw validationError('Title cannot be empty.');
      const slug = body.slug !== undefined ? slugify(body.slug) : existing.slug;
      if (!SLUG_RE.test(slug)) throw validationError('Invalid slug.');
      if (slug !== existing.slug) {
        const dup = await env.DB.prepare('SELECT id FROM community_directory_items WHERE slug = ? AND id != ?').bind(slug, id).first();
        if (dup) throw new HttpError(409, 'SLUG_EXISTS', 'Slug already used by another community.');
      }

      const joinUrl = body.join_or_portal_url !== undefined ? validateSafePortalUrl(body.join_or_portal_url) : existing.join_or_portal_url;
      const pdfUrl = body.pdf_url !== undefined ? validateSafePortalUrl(body.pdf_url) : existing.pdf_url;
      const coverUrl = body.cover_image_url !== undefined ? validateSafePortalUrl(body.cover_image_url) : existing.cover_image_url;
      const links = body.links !== undefined ? sanitizeLinks(body.links) : parseJsonArray(existing.links_json);
      const tags = body.tags !== undefined ? parseTags(body.tags) : parseJsonArray(existing.tags_json);
      const entityTags = body.entity_tags !== undefined ? parseTags(body.entity_tags) : parseJsonArray(existing.entity_tags_json);
      const status = body.status !== undefined && COMMUNITY_STATUSES.includes(body.status) ? body.status : existing.status;
      const commType = body.community_type !== undefined && COMMUNITY_TYPES.includes(body.community_type) ? body.community_type : existing.community_type;
      const region = body.district_region !== undefined ? (cleanStr(body.district_region, 80) || existing.district_region) : existing.district_region;
      const membership = body.membership_model !== undefined && MEMBERSHIP_MODELS.includes(body.membership_model) ? body.membership_model : existing.membership_model;
      const channel = body.platform_channel !== undefined && PLATFORM_CHANNELS.includes(body.platform_channel) ? body.platform_channel : existing.platform_channel;
      const lang = body.language_parity !== undefined && COMMUNITY_LANGUAGES.includes(body.language_parity) ? body.language_parity : existing.language_parity;
      const now = nowIso();
      const safetyVerified = body.safety_verified !== undefined ? (body.safety_verified ? 1 : 0) : existing.safety_verified;

      await env.DB.prepare(`UPDATE community_directory_items
        SET folder_id = ?, title = ?, title_or = ?, slug = ?, community_type = ?, district_region = ?, membership_model = ?,
            platform_channel = ?, join_or_portal_url = ?, safety_verified = ?, language_parity = ?, summary = ?,
            charter_guidelines = ?, activities_highlights = ?, body_html = ?, pdf_url = ?, pdf_size_bytes = ?,
            cover_image_url = ?, links_json = ?, tags_json = ?, entity_tags_json = ?, status = ?,
            verified_at = ?, published_at = ?, updated_at = ?
        WHERE id = ?`)
        .bind(
          folderId, title,
          body.title_or !== undefined ? cleanStr(body.title_or, 200) : existing.title_or,
          slug, commType, region, membership, channel, joinUrl, safetyVerified, lang,
          body.summary !== undefined ? redactPii(cleanStr(body.summary, 600)) : existing.summary,
          body.charter_guidelines !== undefined ? redactPii(cleanStr(body.charter_guidelines, 2000)) : existing.charter_guidelines,
          body.activities_highlights !== undefined ? redactPii(cleanStr(body.activities_highlights, 2000)) : existing.activities_highlights,
          body.body_html !== undefined ? redactPii(sanitizeEditorialHtml(body.body_html)) : existing.body_html,
          pdfUrl,
          body.pdf_size_bytes !== undefined ? Number(body.pdf_size_bytes) : existing.pdf_size_bytes,
          coverUrl, JSON.stringify(links), JSON.stringify(tags), JSON.stringify(entityTags), status,
          safetyVerified && !existing.verified_at ? now : existing.verified_at,
          status === 'published' && !existing.published_at ? now : existing.published_at,
          now, id
        ).run();

      const revId = 'crev-' + crypto.randomUUID().slice(0, 12);
      await env.DB.prepare('INSERT INTO community_directory_revisions (id, item_id, domain_slug, snapshot_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(revId, id, existing.domain_slug, JSON.stringify({ title, status, join_or_portal_url: joinUrl }), actor.email || actor.userId, cleanStr(body.change_note, 200) || 'Updated entry', now)
        .run();

      await audit(env, request, actor, 'community_directory.item.update', 'community_directory_items', id, { slug, status });
      await purgeCommunityDirectoryCache(env);
      const updated = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      return json({ ok: true, item: hydrateItemRow(updated) });
    }

    if (method === 'PATCH' && id && action === 'status') {
      const existing = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community item not found.');
      const body = await readJson(request);
      if (!COMMUNITY_STATUSES.includes(body.status)) throw validationError('Invalid status.');
      const now = nowIso();
      await env.DB.prepare('UPDATE community_directory_items SET status = ?, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?')
        .bind(body.status, body.status === 'published' ? now : existing.published_at, now, id)
        .run();
      await audit(env, request, actor, 'community_directory.item.status', 'community_directory_items', id, { from: existing.status, to: body.status });
      await purgeCommunityDirectoryCache(env);
      const updated = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      return json({ ok: true, previous_status: existing.status, item: hydrateItemRow(updated) });
    }

    if (method === 'POST' && id && action === 'verify') {
      const existing = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community item not found.');
      const now = nowIso();
      await env.DB.prepare('UPDATE community_directory_items SET safety_verified = 1, verified_at = ?, updated_at = ? WHERE id = ?')
        .bind(now, now, id)
        .run();
      await audit(env, request, actor, 'community_directory.item.verify', 'community_directory_items', id, { domain: existing.domain_slug });
      await purgeCommunityDirectoryCache(env);
      const updated = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      return json({ ok: true, item: hydrateItemRow(updated) });
    }

    if (method === 'DELETE' && id) {
      const existing = await env.DB.prepare('SELECT * FROM community_directory_items WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community item not found.');
      await env.DB.prepare('DELETE FROM community_directory_items WHERE id = ?').bind(id).run();
      await audit(env, request, actor, 'community_directory.item.delete', 'community_directory_items', id, { slug: existing.slug });
      await purgeCommunityDirectoryCache(env);
      return json({ ok: true, deleted: id });
    }
  }

  if (resource === 'suggestions') {
    if (method === 'GET') {
      const domain = resolveDomain(url.searchParams.get('domain'));
      const res = await env.DB
        .prepare("SELECT * FROM community_directory_suggestions WHERE domain_slug = ? ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 100")
        .bind(domain)
        .all();
      return json({ ok: true, suggestions: res.results || [] });
    }
    if (method === 'PATCH' && id) {
      const body = await readJson(request);
      if (!COMMUNITY_SUGGESTION_STATUSES.includes(body.status)) throw validationError('Invalid suggestion status.');
      const now = nowIso();
      await env.DB.prepare('UPDATE community_directory_suggestions SET status = ?, moderator_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?')
        .bind(body.status, redactPii(cleanStr(body.moderator_note, 400)), actor.email || actor.userId, now, now, id)
        .run();
      await audit(env, request, actor, 'community_directory.suggestion.review', 'community_directory_suggestions', id, { status: body.status });
      return json({ ok: true });
    }
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown community directory studio endpoint.');
}

// ---------- Public Read-Only Resolvers, APIs & XML Sitemap (Batch 2 / v63) ----------

function normalizePublicDomain(raw) {
  const d = cleanStr(raw, 60);
  if (!d) return '';
  return COMMUNITY_DOMAINS.includes(d) ? d : '';
}

export async function resolvePublicCommunityDirectory(env, segments = []) {
  await ensureCommunityDirectoryStudioSchema(env.DB);
  const rawDom = segments[0];
  const domain = normalizePublicDomain(rawDom);
  if (!domain) return null;
  const meta = COMMUNITY_DOMAIN_META[domain];

  const foldersRes = await env.DB
    .prepare('SELECT * FROM community_directory_folders WHERE domain_slug = ? AND is_active = 1 ORDER BY depth ASC, sort_order ASC, name_en ASC')
    .bind(domain)
    .all();
  const activeFolders = foldersRes.results || [];
  const byId = new Map(activeFolders.map(f => [f.id, f]));

  function hasAllAncestorsActive(f) {
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

  const reachableFolders = activeFolders.filter(hasAllAncestorsActive);
  const byParentAndSlug = new Map();
  for (const f of reachableFolders) {
    byParentAndSlug.set(`${f.parent_id || 'root'}:${f.slug}`, f);
  }

  let currentFolder = null;
  const breadcrumbs = [
    { label: 'Community Directory', url: '/community/' },
    { label: meta.title, url: `/community/${domain}/` }
  ];

  const folderSegments = segments.slice(1).filter(Boolean);
  for (const seg of folderSegments) {
    const cleanSeg = slugify(seg);
    const parentKey = currentFolder ? currentFolder.id : 'root';
    let match = byParentAndSlug.get(`${parentKey}:${cleanSeg}`);
    if (!match && folderSegments.length === 1) {
      match = reachableFolders.find(f => f.slug === cleanSeg) || null;
    }
    if (!match) return null;
    currentFolder = match;
    const prevUrl = breadcrumbs[breadcrumbs.length - 1].url;
    breadcrumbs.push({ label: match.name_en, url: `${prevUrl}${encodeURIComponent(match.slug)}/` });
  }

  const children = reachableFolders.filter(f => (f.parent_id || null) === (currentFolder ? currentFolder.id : null));
  const itemCountsRes = await env.DB
    .prepare("SELECT folder_id, COUNT(*) AS cnt FROM community_directory_items WHERE domain_slug = ? AND status = 'published' GROUP BY folder_id")
    .bind(domain)
    .all();
  const countMap = new Map((itemCountsRes.results || []).map(r => [r.folder_id, Number(r.cnt || 0)]));

  let items = [];
  if (currentFolder) {
    const descendantIds = [currentFolder.id];
    const queue = [currentFolder.id];
    while (queue.length) {
      const pid = queue.shift();
      for (const f of reachableFolders) {
        if (f.parent_id === pid) {
          descendantIds.push(f.id);
          queue.push(f.id);
        }
      }
    }
    const placeholders = descendantIds.map(() => '?').join(', ');
    const itemsRes = await env.DB
      .prepare(`SELECT * FROM community_directory_items WHERE domain_slug = ? AND status = 'published' AND folder_id IN (${placeholders}) ORDER BY safety_verified DESC, updated_at DESC LIMIT 80`)
      .bind(domain, ...descendantIds)
      .all();
    items = (itemsRes.results || []).map(hydrateItemRow);
  } else {
    const itemsRes = await env.DB
      .prepare("SELECT * FROM community_directory_items WHERE domain_slug = ? AND status = 'published' ORDER BY safety_verified DESC, updated_at DESC LIMIT 80")
      .bind(domain)
      .all();
    items = (itemsRes.results || []).map(hydrateItemRow);
  }

  return {
    domain,
    meta,
    canonicalPath: breadcrumbs[breadcrumbs.length - 1].url,
    breadcrumbs,
    folder: currentFolder,
    children: children.map(c => ({ ...c, item_count: countMap.get(c.id) || 0 })),
    items
  };
}

export async function resolvePublicCommunityItem(env, slugOrId) {
  await ensureCommunityDirectoryStudioSchema(env.DB);
  const key = cleanStr(slugOrId, 160);
  if (!key) return null;
  const row = await env.DB
    .prepare("SELECT * FROM community_directory_items WHERE (slug = ? OR id = ?) AND status = 'published' LIMIT 1")
    .bind(key, key)
    .first();
  if (!row) return null;

  const folder = await env.DB
    .prepare('SELECT * FROM community_directory_folders WHERE id = ? AND is_active = 1')
    .bind(row.folder_id)
    .first();
  if (!folder) return null;

  const domain = normalizePublicDomain(row.domain_slug) || 'local-odisha-communities';
  const meta = COMMUNITY_DOMAIN_META[domain];
  const breadcrumbs = [
    { label: 'Community Directory', url: '/community/' },
    { label: meta.title, url: `/community/${domain}/` },
    { label: folder.name_en, url: `/community/${domain}/${encodeURIComponent(folder.slug)}/` },
    { label: row.title, url: `/community/item/${encodeURIComponent(row.slug || row.id)}/` }
  ];

  return {
    item: hydrateItemRow(row),
    folder,
    domain,
    meta,
    breadcrumbs
  };
}

export async function listPublicCommunityOverview(env) {
  await ensureCommunityDirectoryStudioSchema(env.DB);
  const [fRes, iRes, rRes, tRes] = await Promise.all([
    env.DB.prepare('SELECT domain_slug, depth, COUNT(*) AS cnt FROM community_directory_folders WHERE is_active = 1 GROUP BY domain_slug, depth').all(),
    env.DB.prepare("SELECT domain_slug, COUNT(*) AS cnt, SUM(CASE WHEN safety_verified = 1 OR verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified_cnt FROM community_directory_items WHERE status = 'published' GROUP BY domain_slug").all(),
    env.DB.prepare("SELECT district_region, COUNT(*) AS cnt FROM community_directory_items WHERE status = 'published' GROUP BY district_region HAVING COUNT(*) >= 2").all(),
    env.DB.prepare("SELECT community_type, COUNT(*) AS cnt FROM community_directory_items WHERE status = 'published' GROUP BY community_type HAVING COUNT(*) >= 2").all()
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
  let totalFolders = 0;
  let totalPublished = 0;
  let totalVerified = 0;

  const domains = COMMUNITY_DOMAINS.map(slug => {
    const meta = COMMUNITY_DOMAIN_META[slug];
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
      publicPath: meta.publicPath,
      folder_count: fcObj.total,
      depth1_count: fcObj.d1,
      depth2_count: fcObj.d2,
      depth3_count: fcObj.d3,
      item_count: ic,
      verified_count: vc
    };
  }).filter(d => d.folder_count > 0 || d.item_count > 0);

  const regionBreakdown = {};
  for (const r of (rRes.results || [])) {
    if (r.district_region) regionBreakdown[r.district_region] = Number(r.cnt || 0);
  }
  const typeBreakdown = {};
  for (const r of (tRes.results || [])) {
    if (r.community_type) typeBreakdown[r.community_type] = Number(r.cnt || 0);
  }

  return {
    domains,
    regionBreakdown,
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

export async function listPublicCommunityItems(env, opts = {}) {
  await ensureCommunityDirectoryStudioSchema(env.DB);
  const domain = normalizePublicDomain(opts.domain);
  const commType = cleanStr(opts.community_type, 40);
  const region = cleanStr(opts.district_region, 80);
  const membership = cleanStr(opts.membership_model, 60);
  const channel = cleanStr(opts.platform_channel, 60);
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
  if (commType && COMMUNITY_TYPES.includes(commType)) {
    clauses.push('i.community_type = ?');
    binds.push(commType);
  }
  if (region) {
    clauses.push("LOWER(i.district_region) LIKE ? ESCAPE '\\'");
    binds.push('%' + likeEscape(region.toLowerCase()) + '%');
  }
  if (membership && MEMBERSHIP_MODELS.includes(membership)) {
    clauses.push('i.membership_model = ?');
    binds.push(membership);
  }
  if (channel && PLATFORM_CHANNELS.includes(channel)) {
    clauses.push('i.platform_channel = ?');
    binds.push(channel);
  }
  if (lang && COMMUNITY_LANGUAGES.includes(lang)) {
    clauses.push("(i.language_parity = ? OR i.language_parity = 'EN+OR')");
    binds.push(lang);
  }
  if (q) {
    const pat = '%' + likeEscape(q.toLowerCase()) + '%';
    clauses.push("(LOWER(i.title) LIKE ? ESCAPE '\\' OR LOWER(i.district_region) LIKE ? ESCAPE '\\' OR LOWER(i.summary) LIKE ? ESCAPE '\\' OR LOWER(i.activities_highlights) LIKE ? ESCAPE '\\')");
    binds.push(pat, pat, pat, pat);
  }

  const whereSql = clauses.join(' AND ');
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM community_directory_items i JOIN community_directory_folders f ON f.id = i.folder_id WHERE ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const sql = `SELECT i.*, f.name_en AS folder_title, f.slug AS folder_slug
    FROM community_directory_items i
    JOIN community_directory_folders f ON f.id = i.folder_id
    WHERE ${whereSql}
    ORDER BY i.safety_verified DESC, i.updated_at DESC
    LIMIT ? OFFSET ?`;
  const res = await env.DB.prepare(sql).bind(...binds, limit, offset).all();
  const items = (res.results || []).map(hydrateItemRow);
  return { items, total, page, limit, totalPages, hasMore: page < totalPages };
}

export async function submitPublicCommunitySuggestion(env, payload = {}) {
  await ensureCommunityDirectoryStudioSchema(env.DB);
  const domain = normalizePublicDomain(payload.domain_slug) || 'local-odisha-communities';
  const message = redactPii(cleanStr(payload.message || payload.details || payload.title, 1000));
  if (!message || message.length < 4) {
    throw validationError('Please enter at least 4 characters describing the community or safety concern.');
  }
  const rawType = payload.suggestion_type || payload.category;
  const sugType = COMMUNITY_SUGGESTION_TYPES.includes(rawType) ? rawType : 'correction';
  const suggestedUrl = payload.suggested_url || payload.source_url
    ? validateSafePortalUrl(payload.suggested_url || payload.source_url)
    : '';
  const sugId = 'csug-' + crypto.randomUUID().slice(0, 12);
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO community_directory_suggestions
    (id, domain_slug, folder_id, item_id, suggestion_type, reporter_name, message, suggested_url, status, moderator_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`)
    .bind(
      sugId, domain, cleanStr(payload.folder_id, 80) || null, cleanStr(payload.item_id, 80) || null,
      sugType, redactPii(cleanStr(payload.reporter_name, 80) || 'Citizen'), message, suggestedUrl, now, now
    ).run();
  return { ok: true, id: sugId };
}

export async function handlePublicCommunityOverviewApi(request, env) {
  const data = await listPublicCommunityOverview(env);
  return json({ ok: true, ...data }, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=300' });
}

export async function handlePublicCommunityItemsApi(request, env) {
  const url = new URL(request.url);
  const data = await listPublicCommunityItems(env, {
    domain: url.searchParams.get('domain'),
    community_type: url.searchParams.get('community_type'),
    district_region: url.searchParams.get('district_region'),
    membership_model: url.searchParams.get('membership_model'),
    platform_channel: url.searchParams.get('platform_channel'),
    language: url.searchParams.get('language'),
    q: url.searchParams.get('q'),
    page: url.searchParams.get('page'),
    limit: url.searchParams.get('limit')
  });
  return json({ ok: true, ...data }, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=300' });
}

export async function handlePublicCommunitySuggestApi(request, env) {
  try {
    const body = await readJson(request);
    const result = await submitPublicCommunitySuggestion(env, body);
    return json(result, 201);
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    return json({ ok: false, message: (err && err.message) || 'Invalid suggestion payload' }, status);
  }
}

export async function handleCommunityDirectorySitemapXml(request, env) {
  await ensureCommunityDirectoryStudioSchema(env.DB);
  const origin = 'https://csodisha.com';
  const [foldersRes, itemsRes] = await Promise.all([
    env.DB.prepare('SELECT id, domain_slug, parent_id, slug, updated_at FROM community_directory_folders WHERE is_active = 1').all(),
    env.DB.prepare("SELECT id, slug, updated_at FROM community_directory_items WHERE status = 'published'").all()
  ]);

  const byId = new Map((foldersRes.results || []).map(f => [f.id, f]));
  function folderPath(f) {
    const parts = [];
    let cur = f;
    const seen = new Set();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      parts.unshift(encodeURIComponent(cur.slug));
      cur = cur.parent_id ? byId.get(cur.parent_id) : null;
    }
    return `${origin}/community/${f.domain_slug}/${parts.join('/')}/`;
  }

  const urls = [
    `<url><loc>${origin}/community/</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    ...COMMUNITY_DOMAINS.map(d => `<url><loc>${origin}/community/${d}/</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`)
  ];
  for (const f of (foldersRes.results || [])) {
    urls.push(`<url><loc>${folderPath(f)}</loc><lastmod>${String(f.updated_at || '').slice(0, 10) || '2026-11-15'}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }
  for (const it of (itemsRes.results || [])) {
    urls.push(`<url><loc>${origin}/community/item/${encodeURIComponent(it.slug || it.id)}/</loc><lastmod>${String(it.updated_at || '').slice(0, 10) || '2026-11-15'}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls.join('\n  ')}\n</urlset>\n`;
  return new Response(request.method === 'HEAD' ? null : xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
