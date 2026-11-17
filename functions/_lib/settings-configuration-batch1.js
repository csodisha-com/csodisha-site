// Settings & Configuration Batch 1 (v121): Modules 01-04
// 01 General Website Settings | 02 Website Identity | 03 Contact Information | 04 Localization
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr } from './validate.js';

export const CFG_SITE_MODES = ['live_production', 'scheduled_maintenance', 'read_only_archive'];
export const CFG_GROUPING_SYSTEMS = ['indian_lakhs_crores', 'international_thousands'];
export const CFG_WEEK_DAYS = ['monday', 'sunday'];

const _cfg1Ready = new WeakSet();

function rid(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 10)}`;
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

export function sanitizeCfgText(raw, maxLen = 320) {
  const stripped = String(raw || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '');
  return cleanStr(stripped, maxLen);
}

export function isValidHexColor(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(hex || '').trim());
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function sanitizeCfgUrl(raw) {
  const s = sanitizeCfgText(raw, 400);
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return '';
}

export const CFG_REV_TABLES = {
  '01': {
    table: 'cfg_general_settings',
    cols: [
      'site_name_en', 'site_name_or', 'tagline_en', 'tagline_or', 'canonical_origin',
      'site_mode', 'maintenance_banner_en', 'maintenance_banner_or',
      'allow_search_indexing', 'pwa_offline_enabled', 'copyright_notice_en', 'copyright_notice_or', 'updated_by'
    ]
  },
  '02': {
    table: 'cfg_website_identity',
    cols: [
      'brand_short_code', 'primary_palette_name', 'primary_hex', 'surface_hex', 'accent_hex',
      'logo_light_url', 'logo_dark_url', 'favicon_svg_url', 'apple_touch_icon_url',
      'og_default_banner_url', 'founder_credit_en', 'founder_credit_or', 'updated_by'
    ]
  },
  '03': {
    table: 'cfg_contact_information',
    cols: [
      'support_email', 'editorial_email', 'grievance_officer_name', 'grievance_email',
      'helpline_phone_display', 'whatsapp_channel_url', 'telegram_channel_url',
      'youtube_channel_url', 'x_twitter_url', 'instagram_url',
      'office_locality_en', 'office_locality_or', 'support_hours_ist', 'updated_by'
    ]
  },
  '04': {
    table: 'cfg_localization_settings',
    cols: [
      'default_country_code', 'default_state_region', 'default_locale', 'secondary_locale',
      'currency_code', 'currency_symbol', 'number_grouping_system', 'first_day_of_week',
      'auto_detect_odia_script', 'bilingual_toggle_visible', 'updated_by'
    ]
  }
};

export async function snapshotCfgRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = CFG_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM cfg_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('cfg-rev');
  await db.prepare(
    `INSERT INTO cfg_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    revId, moduleCode, entityId, nextVer, JSON.stringify(row),
    sanitizeCfgText(changeNote, 200), actor?.email || actor?.userId || 'system'
  ).run();
  return { id: revId, version_num: nextVer };
}

/* ================= SCHEMA & SEEDING ================= */
export async function ensureSettingsConfigBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_cfg1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS cfg_general_settings (
      id TEXT PRIMARY KEY,
      site_name_en TEXT NOT NULL DEFAULT 'CS Odisha (Common Sense Odisha)',
      site_name_or TEXT NOT NULL DEFAULT 'ସିଏସ୍ ଓଡ଼ିଶା (କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା)',
      tagline_en TEXT NOT NULL DEFAULT 'Odisha Government Jobs, Competitive Exams & Citizen Schemes Portal',
      tagline_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି, ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା ଏବଂ ଯୋଜନା ପୋର୍ଟାଲ୍',
      canonical_origin TEXT NOT NULL DEFAULT 'https://csodisha.com',
      site_mode TEXT NOT NULL DEFAULT 'live_production',
      maintenance_banner_en TEXT NOT NULL DEFAULT '',
      maintenance_banner_or TEXT NOT NULL DEFAULT '',
      allow_search_indexing INTEGER NOT NULL DEFAULT 1,
      pwa_offline_enabled INTEGER NOT NULL DEFAULT 1,
      copyright_notice_en TEXT NOT NULL DEFAULT '© 2026 CS Odisha. All rights reserved.',
      copyright_notice_or TEXT NOT NULL DEFAULT '© ୨୦୨୬ CS ଓଡ଼ିଶା। ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ।',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_website_identity (
      id TEXT PRIMARY KEY,
      brand_short_code TEXT NOT NULL DEFAULT 'CSO',
      primary_palette_name TEXT NOT NULL DEFAULT 'Warm Alabaster & Deep Forest Green',
      primary_hex TEXT NOT NULL DEFAULT '#1B4332',
      surface_hex TEXT NOT NULL DEFAULT '#FAF9F6',
      accent_hex TEXT NOT NULL DEFAULT '#D97706',
      logo_light_url TEXT NOT NULL DEFAULT '/assets/logo-light.svg',
      logo_dark_url TEXT NOT NULL DEFAULT '/assets/logo-dark.svg',
      favicon_svg_url TEXT NOT NULL DEFAULT '/assets/favicon.svg',
      apple_touch_icon_url TEXT NOT NULL DEFAULT '/assets/apple-touch-icon.png',
      og_default_banner_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/og-default.png',
      founder_credit_en TEXT NOT NULL DEFAULT 'Founded by Ramesh Biswal · Odisha',
      founder_credit_or TEXT NOT NULL DEFAULT 'ପ୍ରତିଷ୍ଠାତା: ରମେଶ ବିଶ୍ୱାଳ · ଓଡ଼ିଶା',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_contact_information (
      id TEXT PRIMARY KEY,
      support_email TEXT NOT NULL DEFAULT 'support@csodisha.com',
      editorial_email TEXT NOT NULL DEFAULT 'editorial@csodisha.com',
      grievance_officer_name TEXT NOT NULL DEFAULT 'Ramesh Biswal (DPDP Grievance Officer)',
      grievance_email TEXT NOT NULL DEFAULT 'privacy@csodisha.com',
      helpline_phone_display TEXT NOT NULL DEFAULT '+91-6782-••••90',
      whatsapp_channel_url TEXT NOT NULL DEFAULT 'https://whatsapp.com/channel/csodisha',
      telegram_channel_url TEXT NOT NULL DEFAULT 'https://t.me/csodisha_official',
      youtube_channel_url TEXT NOT NULL DEFAULT 'https://youtube.com/@csodisha',
      x_twitter_url TEXT NOT NULL DEFAULT 'https://x.com/csodisha',
      instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com/csodisha',
      office_locality_en TEXT NOT NULL DEFAULT 'Basta, Balasore, Odisha 756029, India',
      office_locality_or TEXT NOT NULL DEFAULT 'ବସ୍ତା, ବାଲେଶ୍ୱର, ଓଡ଼ିଶା ୭୫୬୦୨୯, ଭାରତ',
      support_hours_ist TEXT NOT NULL DEFAULT 'Mon–Sat · 09:30 AM – 06:30 PM IST',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_localization_settings (
      id TEXT PRIMARY KEY,
      default_country_code TEXT NOT NULL DEFAULT 'IN',
      default_state_region TEXT NOT NULL DEFAULT 'Odisha (OD)',
      default_locale TEXT NOT NULL DEFAULT 'en-IN',
      secondary_locale TEXT NOT NULL DEFAULT 'or-IN',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      number_grouping_system TEXT NOT NULL DEFAULT 'indian_lakhs_crores',
      first_day_of_week TEXT NOT NULL DEFAULT 'monday',
      auto_detect_odia_script INTEGER NOT NULL DEFAULT 1,
      bilingual_toggle_visible INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cfg_rev_entity ON cfg_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  await db.prepare(`INSERT OR IGNORE INTO cfg_general_settings (id) VALUES ('primary')`).run();
  await db.prepare(`INSERT OR IGNORE INTO cfg_website_identity (id) VALUES ('primary')`).run();
  await db.prepare(`INSERT OR IGNORE INTO cfg_contact_information (id) VALUES ('primary')`).run();
  await db.prepare(`INSERT OR IGNORE INTO cfg_localization_settings (id) VALUES ('primary')`).run();
  _cfg1Ready.add(db);
}

/* ================= OVERVIEW (MODULES 01-17) ================= */
export async function getSettingsConfigBatch1Overview(env) {
  await ensureSettingsConfigBatch1Schema(env.DB);
  const [gen, iden, con, loc] = await Promise.all([
    env.DB.prepare(`SELECT site_mode, pwa_offline_enabled, allow_search_indexing FROM cfg_general_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT primary_palette_name, primary_hex, surface_hex, accent_hex FROM cfg_website_identity WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT grievance_officer_name, grievance_email FROM cfg_contact_information WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT default_locale, secondary_locale, currency_code, currency_symbol FROM cfg_localization_settings WHERE id = 'primary'`).first()
  ]);

  const titles = [
    ['01', 'module-18-001', 'General Website Settings', 'active'],
    ['02', 'module-18-002', 'Website Identity', 'active'],
    ['03', 'module-18-003', 'Contact Information', 'active'],
    ['04', 'module-18-004', 'Localization', 'active'],
    ['05', 'module-18-005', 'Languages', 'queued'],
    ['06', 'module-18-006', 'Time Zone', 'queued'],
    ['07', 'module-18-007', 'Date & Number Formats', 'queued'],
    ['08', 'module-18-008', 'Homepage Settings', 'queued'],
    ['09', 'module-18-009', 'Feature Toggles', 'queued'],
    ['10', 'module-18-010', 'Email Settings', 'queued'],
    ['11', 'module-18-011', 'Upload Limits', 'queued'],
    ['12', 'module-18-012', 'Content Defaults', 'queued'],
    ['13', 'module-18-013', 'Registration Settings', 'queued'],
    ['14', 'module-18-014', 'Comment Settings', 'queued'],
    ['15', 'module-18-015', 'Social Sharing Defaults', 'queued'],
    ['16', 'module-18-016', 'Legal & Compliance Links', 'queued'],
    ['17', 'module-18-017', 'Configuration Backup & Export', 'queued']
  ];
  const modules = {};
  for (const [code, id, title, status] of titles) {
    modules[code] = { code, id, title, status };
  }

  return {
    site_mode: gen?.site_mode || 'live_production',
    pwa_offline_enabled: Number(gen?.pwa_offline_enabled ?? 1) === 1,
    allow_search_indexing: Number(gen?.allow_search_indexing ?? 1) === 1,
    brand_palette: iden?.primary_palette_name || 'Warm Alabaster & Deep Forest Green',
    primary_hex: iden?.primary_hex || '#1B4332',
    dpdp_grievance_ready: Boolean(con?.grievance_officer_name && isValidEmail(con?.grievance_email)),
    default_locale: loc?.default_locale || 'en-IN',
    secondary_locale: loc?.secondary_locale || 'or-IN',
    currency_code: loc?.currency_code || 'INR',
    currency_symbol: loc?.currency_symbol || '₹',
    modules
  };
}

/* ================= MODULE 01: GENERAL WEBSITE SETTINGS ================= */
async function handleGeneral(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_general_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_general_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 32000);
    const errors = {};
    const site_name_en = sanitizeCfgText(b.site_name_en ?? existing.site_name_en, 160);
    const site_name_or = sanitizeCfgText(b.site_name_or ?? existing.site_name_or, 160);
    const tagline_en = sanitizeCfgText(b.tagline_en ?? existing.tagline_en, 240);
    const tagline_or = sanitizeCfgText(b.tagline_or ?? existing.tagline_or, 240);
    const canonical_origin = sanitizeCfgUrl(b.canonical_origin ?? existing.canonical_origin);
    const site_mode = pick(b.site_mode ?? existing.site_mode, CFG_SITE_MODES, 'site_mode', errors, existing.site_mode);
    const maintenance_banner_en = sanitizeCfgText(b.maintenance_banner_en ?? existing.maintenance_banner_en, 320);
    const maintenance_banner_or = sanitizeCfgText(b.maintenance_banner_or ?? existing.maintenance_banner_or, 320);
    const allow_search_indexing = b.allow_search_indexing !== undefined ? (b.allow_search_indexing ? 1 : 0) : existing.allow_search_indexing;
    const pwa_offline_enabled = b.pwa_offline_enabled !== undefined ? (b.pwa_offline_enabled ? 1 : 0) : existing.pwa_offline_enabled;
    const copyright_notice_en = sanitizeCfgText(b.copyright_notice_en ?? existing.copyright_notice_en, 200);
    const copyright_notice_or = sanitizeCfgText(b.copyright_notice_or ?? existing.copyright_notice_or, 200);
    if (!site_name_en) errors.site_name_en = 'site_name_en is required';
    if (!canonical_origin) errors.canonical_origin = 'canonical_origin must be a valid URL';
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_general_settings
       SET site_name_en=?, site_name_or=?, tagline_en=?, tagline_or=?, canonical_origin=?, site_mode=?, maintenance_banner_en=?, maintenance_banner_or=?, allow_search_indexing=?, pwa_offline_enabled=?, copyright_notice_en=?, copyright_notice_or=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      site_name_en, site_name_or, tagline_en, tagline_or, canonical_origin, site_mode,
      maintenance_banner_en, maintenance_banner_or, allow_search_indexing, pwa_offline_enabled,
      copyright_notice_en, copyright_notice_or, updatedBy
    ).run();

    await snapshotCfgRevision(db, '01', 'primary', actor, 'update general settings');
    await audit(env, request, actor, 'settings.general.update', 'cfg_general_settings', 'primary', { site_mode });
    const item = await db.prepare(`SELECT * FROM cfg_general_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 02: WEBSITE IDENTITY ================= */
async function handleIdentity(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_website_identity WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_website_identity WHERE id = 'primary'`).first();
    const b = await readJson(request, 32000);
    const errors = {};
    const brand_short_code = sanitizeCfgText(b.brand_short_code ?? existing.brand_short_code, 16);
    const primary_palette_name = sanitizeCfgText(b.primary_palette_name ?? existing.primary_palette_name, 120);
    const primary_hex = String(b.primary_hex ?? existing.primary_hex).trim().toUpperCase();
    const surface_hex = String(b.surface_hex ?? existing.surface_hex).trim().toUpperCase();
    const accent_hex = String(b.accent_hex ?? existing.accent_hex).trim().toUpperCase();
    if (!isValidHexColor(primary_hex)) errors.primary_hex = 'primary_hex must be #RRGGBB';
    if (!isValidHexColor(surface_hex)) errors.surface_hex = 'surface_hex must be #RRGGBB';
    if (!isValidHexColor(accent_hex)) errors.accent_hex = 'accent_hex must be #RRGGBB';
    if (Object.keys(errors).length) return validationError(errors);

    const logo_light_url = sanitizeCfgUrl(b.logo_light_url ?? existing.logo_light_url);
    const logo_dark_url = sanitizeCfgUrl(b.logo_dark_url ?? existing.logo_dark_url);
    const favicon_svg_url = sanitizeCfgUrl(b.favicon_svg_url ?? existing.favicon_svg_url);
    const apple_touch_icon_url = sanitizeCfgUrl(b.apple_touch_icon_url ?? existing.apple_touch_icon_url);
    const og_default_banner_url = sanitizeCfgUrl(b.og_default_banner_url ?? existing.og_default_banner_url);
    const founder_credit_en = sanitizeCfgText(b.founder_credit_en ?? existing.founder_credit_en, 160);
    const founder_credit_or = sanitizeCfgText(b.founder_credit_or ?? existing.founder_credit_or, 160);
    const updatedBy = actor?.email || actor?.userId || 'system';

    await db.prepare(
      `UPDATE cfg_website_identity
       SET brand_short_code=?, primary_palette_name=?, primary_hex=?, surface_hex=?, accent_hex=?, logo_light_url=?, logo_dark_url=?, favicon_svg_url=?, apple_touch_icon_url=?, og_default_banner_url=?, founder_credit_en=?, founder_credit_or=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      brand_short_code, primary_palette_name, primary_hex, surface_hex, accent_hex,
      logo_light_url, logo_dark_url, favicon_svg_url, apple_touch_icon_url,
      og_default_banner_url, founder_credit_en, founder_credit_or, updatedBy
    ).run();

    await snapshotCfgRevision(db, '02', 'primary', actor, 'update website identity');
    await audit(env, request, actor, 'settings.identity.update', 'cfg_website_identity', 'primary', { primary_hex });
    const item = await db.prepare(`SELECT * FROM cfg_website_identity WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 03: CONTACT INFORMATION ================= */
async function handleContact(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_contact_information WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_contact_information WHERE id = 'primary'`).first();
    const b = await readJson(request, 32000);
    const errors = {};
    const support_email = sanitizeCfgText(b.support_email ?? existing.support_email, 160);
    const editorial_email = sanitizeCfgText(b.editorial_email ?? existing.editorial_email, 160);
    const grievance_officer_name = sanitizeCfgText(b.grievance_officer_name ?? existing.grievance_officer_name, 160);
    const grievance_email = sanitizeCfgText(b.grievance_email ?? existing.grievance_email, 160);
    if (!isValidEmail(support_email)) errors.support_email = 'support_email must be valid';
    if (!isValidEmail(editorial_email)) errors.editorial_email = 'editorial_email must be valid';
    if (!grievance_officer_name) errors.grievance_officer_name = 'grievance_officer_name is required';
    if (!isValidEmail(grievance_email)) errors.grievance_email = 'grievance_email must be valid';
    if (Object.keys(errors).length) return validationError(errors);

    const helpline_phone_display = sanitizeCfgText(b.helpline_phone_display ?? existing.helpline_phone_display, 60);
    const whatsapp_channel_url = sanitizeCfgUrl(b.whatsapp_channel_url ?? existing.whatsapp_channel_url);
    const telegram_channel_url = sanitizeCfgUrl(b.telegram_channel_url ?? existing.telegram_channel_url);
    const youtube_channel_url = sanitizeCfgUrl(b.youtube_channel_url ?? existing.youtube_channel_url);
    const x_twitter_url = sanitizeCfgUrl(b.x_twitter_url ?? existing.x_twitter_url);
    const instagram_url = sanitizeCfgUrl(b.instagram_url ?? existing.instagram_url);
    const office_locality_en = sanitizeCfgText(b.office_locality_en ?? existing.office_locality_en, 240);
    const office_locality_or = sanitizeCfgText(b.office_locality_or ?? existing.office_locality_or, 240);
    const support_hours_ist = sanitizeCfgText(b.support_hours_ist ?? existing.support_hours_ist, 120);
    const updatedBy = actor?.email || actor?.userId || 'system';

    await db.prepare(
      `UPDATE cfg_contact_information
       SET support_email=?, editorial_email=?, grievance_officer_name=?, grievance_email=?, helpline_phone_display=?, whatsapp_channel_url=?, telegram_channel_url=?, youtube_channel_url=?, x_twitter_url=?, instagram_url=?, office_locality_en=?, office_locality_or=?, support_hours_ist=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      support_email, editorial_email, grievance_officer_name, grievance_email,
      helpline_phone_display, whatsapp_channel_url, telegram_channel_url,
      youtube_channel_url, x_twitter_url, instagram_url,
      office_locality_en, office_locality_or, support_hours_ist, updatedBy
    ).run();

    await snapshotCfgRevision(db, '03', 'primary', actor, 'update contact information');
    await audit(env, request, actor, 'settings.contact.update', 'cfg_contact_information', 'primary', { grievance_email });
    const item = await db.prepare(`SELECT * FROM cfg_contact_information WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 04: LOCALIZATION ================= */
async function handleLocalization(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_localization_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_localization_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const errors = {};
    const default_country_code = sanitizeCfgText(b.default_country_code ?? existing.default_country_code, 8).toUpperCase();
    const default_state_region = sanitizeCfgText(b.default_state_region ?? existing.default_state_region, 80);
    const default_locale = sanitizeCfgText(b.default_locale ?? existing.default_locale, 20);
    const secondary_locale = sanitizeCfgText(b.secondary_locale ?? existing.secondary_locale, 20);
    const currency_code = sanitizeCfgText(b.currency_code ?? existing.currency_code, 10).toUpperCase();
    const currency_symbol = sanitizeCfgText(b.currency_symbol ?? existing.currency_symbol, 8);
    const number_grouping_system = pick(b.number_grouping_system ?? existing.number_grouping_system, CFG_GROUPING_SYSTEMS, 'number_grouping_system', errors, existing.number_grouping_system);
    const first_day_of_week = pick(b.first_day_of_week ?? existing.first_day_of_week, CFG_WEEK_DAYS, 'first_day_of_week', errors, existing.first_day_of_week);
    const auto_detect_odia_script = b.auto_detect_odia_script !== undefined ? (b.auto_detect_odia_script ? 1 : 0) : existing.auto_detect_odia_script;
    const bilingual_toggle_visible = b.bilingual_toggle_visible !== undefined ? (b.bilingual_toggle_visible ? 1 : 0) : existing.bilingual_toggle_visible;
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_localization_settings
       SET default_country_code=?, default_state_region=?, default_locale=?, secondary_locale=?, currency_code=?, currency_symbol=?, number_grouping_system=?, first_day_of_week=?, auto_detect_odia_script=?, bilingual_toggle_visible=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      default_country_code, default_state_region, default_locale, secondary_locale,
      currency_code, currency_symbol, number_grouping_system, first_day_of_week,
      auto_detect_odia_script, bilingual_toggle_visible, updatedBy
    ).run();

    await snapshotCfgRevision(db, '04', 'primary', actor, 'update localization');
    await audit(env, request, actor, 'settings.localization.update', 'cfg_localization_settings', 'primary', { default_locale, currency_code });
    const item = await db.prepare(`SELECT * FROM cfg_localization_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleCfgRevisions(request, env, actor, sub) {
  const db = env.DB;
  const url = new URL(request.url);
  if (request.method === 'GET' && !sub) {
    const moduleCode = sanitizeCfgText(url.searchParams.get('module_code') || '', 10);
    const entityId = sanitizeCfgText(url.searchParams.get('entity_id') || 'primary', 80);
    const where = [];
    const args = [];
    if (moduleCode) { where.push(`module_code = ?`); args.push(moduleCode); }
    if (entityId) { where.push(`entity_id = ?`); args.push(entityId); }
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM cfg_revisions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY version_num DESC LIMIT 40`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (request.method === 'POST' && sub === 'rollback') {
    const b = await readJson(request, 16000);
    const revId = sanitizeCfgText(b.revision_id, 80);
    if (!revId) return validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM cfg_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = CFG_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', 'Revision rollback unsupported for module');

    let snap = {};
    try { snap = JSON.parse(rev.snapshot_json); } catch { throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid snapshot JSON'); }
    const setSql = cfg.cols.map(c => `${c} = ?`).join(', ');
    const vals = cfg.cols.map(c => snap[c] ?? '');
    await db.prepare(`UPDATE ${cfg.table} SET ${setSql}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, rev.entity_id).run();

    await snapshotCfgRevision(db, rev.module_code, rev.entity_id, actor, `rollback to v${rev.version_num}`);
    await audit(env, request, actor, 'settings.revisions.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    const restored = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(rev.entity_id).first();
    return json({ ok: true, restored });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown settings revisions route');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleSettingsConfigBatch1Admin(request, env, actor, id, sub) {
  await ensureSettingsConfigBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json(await getSettingsConfigBatch1Overview(env));
  }
  if (id === 'general') return handleGeneral(request, env, actor);
  if (id === 'identity') return handleIdentity(request, env, actor);
  if (id === 'contact') return handleContact(request, env, actor);
  if (id === 'localization') return handleLocalization(request, env, actor);
  if (id === 'revisions') return handleCfgRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown settings batch 1 route');
}

/* ================= PUBLIC EDGE-CACHED SITE CONFIG API ================= */
export async function handlePublicSiteConfigApi(request, env) {
  await ensureSettingsConfigBatch1Schema(env.DB);
  const [gen, iden, con, loc] = await Promise.all([
    env.DB.prepare(`SELECT site_name_en, site_name_or, tagline_en, tagline_or, canonical_origin, site_mode, maintenance_banner_en, maintenance_banner_or, allow_search_indexing, pwa_offline_enabled, copyright_notice_en, copyright_notice_or FROM cfg_general_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT brand_short_code, primary_palette_name, primary_hex, surface_hex, accent_hex, logo_light_url, logo_dark_url, favicon_svg_url, apple_touch_icon_url, og_default_banner_url, founder_credit_en, founder_credit_or FROM cfg_website_identity WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT support_email, editorial_email, grievance_officer_name, grievance_email, helpline_phone_display, whatsapp_channel_url, telegram_channel_url, youtube_channel_url, x_twitter_url, instagram_url, office_locality_en, office_locality_or, support_hours_ist FROM cfg_contact_information WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT default_country_code, default_state_region, default_locale, secondary_locale, currency_code, currency_symbol, number_grouping_system, first_day_of_week, auto_detect_odia_script, bilingual_toggle_visible FROM cfg_localization_settings WHERE id = 'primary'`).first()
  ]);

  return json({
    general: gen,
    identity: iden,
    contact: con,
    localization: loc
  }, 200, {
    'Cache-Control': 'public, max-age=120, s-maxage=300'
  });
}
