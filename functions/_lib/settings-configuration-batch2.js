// Settings & Configuration Batch 2 (v122): Modules 05-08
// 05 Languages | 06 Time Zone | 07 Date & Number Formats | 08 Homepage Settings
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { nowIstIso } from './events-scheduling-batch1.js';
import {
  CFG_REV_TABLES,
  ensureSettingsConfigBatch1Schema,
  getSettingsConfigBatch1Overview,
  handlePublicSiteConfigApi,
  sanitizeCfgText,
  snapshotCfgRevision
} from './settings-configuration-batch1.js';

export const CFG_SCRIPTS = ['Latin', 'Odia', 'Devanagari'];
export const CFG_DATE_PATTERNS = ['DD-MM-YYYY', 'DD MMM YYYY', 'YYYY-MM-DD'];
export const CFG_TIME_PATTERNS = ['12h_am_pm', '24h_military'];
export const CFG_NUMBER_GROUPINGS = ['indian_lakhs_crores', 'international_thousands'];
export const CFG_CURR_POSITIONS = ['prefix_no_space', 'prefix_space'];
export const CFG_ODIA_NUMERALS = ['latin_digits_default', 'bilingual_odia_digits'];

const _cfg2Ready = new WeakSet();

CFG_REV_TABLES['05'] = {
  table: 'cfg_languages',
  cols: [
    'lang_code', 'iso_639_1', 'english_name', 'native_name', 'script_name',
    'direction', 'fallback_lang_code', 'translation_coverage_pct', 'is_default', 'is_enabled', 'sort_order'
  ]
};
CFG_REV_TABLES['06'] = {
  table: 'cfg_timezone_settings',
  cols: [
    'iana_timezone', 'tz_abbreviation', 'utc_offset_label', 'enforce_ist_on_deadlines',
    'show_ist_badge_on_timers', 'academic_session_start_month', 'academic_session_label', 'ntp_sync_note', 'updated_by'
  ]
};
CFG_REV_TABLES['07'] = {
  table: 'cfg_date_number_formats',
  cols: [
    'date_format_pattern', 'time_format_pattern', 'datetime_separator', 'number_grouping',
    'currency_code', 'currency_symbol', 'currency_position', 'decimal_places', 'odia_numerals_mode', 'updated_by'
  ]
};
CFG_REV_TABLES['08'] = {
  table: 'cfg_homepage_settings',
  cols: [
    'hero_badge_en', 'hero_badge_or', 'hero_headline_en', 'hero_headline_or',
    'hero_subheadline_en', 'hero_subheadline_or', 'primary_cta_label_en', 'primary_cta_label_or',
    'primary_cta_url', 'show_live_deadline_ticker', 'show_featured_exams_grid',
    'show_odisha_schemes_strip', 'show_daily_pyq_widget', 'featured_cards_limit', 'updated_by'
  ]
};

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

function sanitizeCfgUrl(raw) {
  const s = sanitizeCfgText(raw, 400);
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return '';
}

export function formatPreviewSamples(fmt = {}) {
  const datePat = fmt.date_format_pattern || 'DD-MM-YYYY';
  const timePat = fmt.time_format_pattern || '12h_am_pm';
  const sep = fmt.datetime_separator ?? ' · ';
  const grouping = fmt.number_grouping || 'indian_lakhs_crores';
  const sym = fmt.currency_symbol || '₹';
  const pos = fmt.currency_position || 'prefix_no_space';
  const dec = Number(fmt.decimal_places ?? 2) === 0 ? 0 : 2;

  const date_sample = datePat === 'DD MMM YYYY' ? '17 Nov 2026' : datePat === 'YYYY-MM-DD' ? '2026-11-17' : '17-11-2026';
  const time_sample = timePat === '24h_military' ? '17:30 IST' : '05:30 PM IST';
  const datetime_sample = `${date_sample}${sep}${time_sample}`;

  const loc = grouping === 'international_thousands' ? 'en-US' : 'en-IN';
  const formattedNum = new Intl.NumberFormat(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(123456);
  const currency_sample = pos === 'prefix_space' ? `${sym} ${formattedNum}` : `${sym}${formattedNum}`;

  return { date_sample, time_sample, datetime_sample, currency_sample };
}

/* ================= SCHEMA & SEEDING ================= */
export async function ensureSettingsConfigBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureSettingsConfigBatch1Schema(db);
  if (_cfg2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS cfg_languages (
      id TEXT PRIMARY KEY,
      lang_code TEXT NOT NULL UNIQUE,
      iso_639_1 TEXT NOT NULL DEFAULT 'en',
      english_name TEXT NOT NULL,
      native_name TEXT NOT NULL,
      script_name TEXT NOT NULL DEFAULT 'Latin',
      direction TEXT NOT NULL DEFAULT 'ltr',
      fallback_lang_code TEXT NOT NULL DEFAULT 'en-IN',
      translation_coverage_pct INTEGER NOT NULL DEFAULT 100,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_timezone_settings (
      id TEXT PRIMARY KEY,
      iana_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      tz_abbreviation TEXT NOT NULL DEFAULT 'IST',
      utc_offset_label TEXT NOT NULL DEFAULT 'UTC+05:30',
      enforce_ist_on_deadlines INTEGER NOT NULL DEFAULT 1,
      show_ist_badge_on_timers INTEGER NOT NULL DEFAULT 1,
      academic_session_start_month INTEGER NOT NULL DEFAULT 4,
      academic_session_label TEXT NOT NULL DEFAULT '2026-27 (Apr – Mar)',
      ntp_sync_note TEXT NOT NULL DEFAULT 'Cloudflare Edge Worker Clock (IST +05:30)',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_date_number_formats (
      id TEXT PRIMARY KEY,
      date_format_pattern TEXT NOT NULL DEFAULT 'DD-MM-YYYY',
      time_format_pattern TEXT NOT NULL DEFAULT '12h_am_pm',
      datetime_separator TEXT NOT NULL DEFAULT ' · ',
      number_grouping TEXT NOT NULL DEFAULT 'indian_lakhs_crores',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      currency_position TEXT NOT NULL DEFAULT 'prefix_no_space',
      decimal_places INTEGER NOT NULL DEFAULT 2,
      odia_numerals_mode TEXT NOT NULL DEFAULT 'latin_digits_default',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_homepage_settings (
      id TEXT PRIMARY KEY,
      hero_badge_en TEXT NOT NULL DEFAULT 'Odisha Education, Exams & Welfare Portal',
      hero_badge_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ଶିକ୍ଷା, ପରୀକ୍ଷା ଓ ଜନକଲ୍ୟାଣ ପୋର୍ଟାଲ',
      hero_headline_en TEXT NOT NULL DEFAULT 'Your Trusted Odisha Competitive Exam, Jobs & Citizen Schemes Hub',
      hero_headline_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶାର ବିଶ୍ୱସ୍ତ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା, ନିଯୁକ୍ତି ଏବଂ ଯୋଜନା କେନ୍ଦ୍ର',
      hero_subheadline_en TEXT NOT NULL DEFAULT 'Verified OPSC, OSSC, OSSSC schedules, free bilingual mock tests, PYQs, and Odisha DBT schemes in English and ଓଡ଼ିଆ.',
      hero_subheadline_or TEXT NOT NULL DEFAULT 'ଯାଞ୍ଚ ହୋଇଥିବା OPSC, OSSC, OSSSC ସମୟସୂଚୀ, ମାଗଣା ମକ୍ ଟେଷ୍ଟ, PYQ ଏବଂ ଓଡ଼ିଶା DBT ଯୋଜନା।',
      primary_cta_label_en TEXT NOT NULL DEFAULT 'Explore Study Library',
      primary_cta_label_or TEXT NOT NULL DEFAULT 'ଅଧ୍ୟୟନ ପାଠାଗାର ଦେଖନ୍ତୁ',
      primary_cta_url TEXT NOT NULL DEFAULT '/study-library/',
      show_live_deadline_ticker INTEGER NOT NULL DEFAULT 1,
      show_featured_exams_grid INTEGER NOT NULL DEFAULT 1,
      show_odisha_schemes_strip INTEGER NOT NULL DEFAULT 1,
      show_daily_pyq_widget INTEGER NOT NULL DEFAULT 1,
      featured_cards_limit INTEGER NOT NULL DEFAULT 6,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  const langCnt = await db.prepare(`SELECT COUNT(*) AS n FROM cfg_languages`).first();
  if (Number(langCnt?.n || 0) === 0) {
    const langs = [
      ['cfg-lang-en', 'en-IN', 'en', 'English (India)', 'English', 'Latin', 'ltr', 'en-IN', 100, 1, 1, 1],
      ['cfg-lang-or', 'or-IN', 'or', 'Odia', 'ଓଡ଼ିଆ', 'Odia', 'ltr', 'en-IN', 98, 0, 1, 2],
      ['cfg-lang-hi', 'hi-IN', 'hi', 'Hindi', 'हिन्दी', 'Devanagari', 'ltr', 'en-IN', 45, 0, 0, 3]
    ];
    for (const r of langs) {
      await db.prepare(
        `INSERT OR IGNORE INTO cfg_languages
         (id, lang_code, iso_639_1, english_name, native_name, script_name, direction, fallback_lang_code, translation_coverage_pct, is_default, is_enabled, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  await db.prepare(`INSERT OR IGNORE INTO cfg_timezone_settings (id) VALUES ('primary')`).run();
  await db.prepare(`INSERT OR IGNORE INTO cfg_date_number_formats (id) VALUES ('primary')`).run();
  await db.prepare(`INSERT OR IGNORE INTO cfg_homepage_settings (id) VALUES ('primary')`).run();
  _cfg2Ready.add(db);
}

/* ================= FULL 8-MODULE OVERVIEW (01-08 ACTIVE, 09-17 QUEUED) ================= */
export async function getFull8ModuleSettingsOverview(env) {
  await ensureSettingsConfigBatch2Schema(env.DB);
  const [base, langRows, tz, fmt, hp] = await Promise.all([
    getSettingsConfigBatch1Overview(env),
    env.DB.prepare(`SELECT lang_code, translation_coverage_pct, is_enabled FROM cfg_languages`).all(),
    env.DB.prepare(`SELECT iana_timezone, academic_session_label FROM cfg_timezone_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT number_grouping, date_format_pattern FROM cfg_date_number_formats WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT show_live_deadline_ticker, show_featured_exams_grid, show_odisha_schemes_strip, show_daily_pyq_widget FROM cfg_homepage_settings WHERE id = 'primary'`).first()
  ]);

  const langs = langRows.results || [];
  const enabled_languages_count = langs.filter(l => Number(l.is_enabled) === 1).length;
  const odiaRow = langs.find(l => l.lang_code === 'or-IN');
  const odia_coverage_pct = Number(odiaRow?.translation_coverage_pct ?? 98);
  const homepage_active_sections_count = [
    hp?.show_live_deadline_ticker, hp?.show_featured_exams_grid,
    hp?.show_odisha_schemes_strip, hp?.show_daily_pyq_widget
  ].filter(v => Number(v) === 1).length;

  return {
    ...base,
    enabled_languages_count,
    odia_coverage_pct,
    iana_timezone: tz?.iana_timezone || 'Asia/Kolkata',
    academic_session_label: tz?.academic_session_label || '2026-27 (Apr – Mar)',
    number_grouping: fmt?.number_grouping || 'indian_lakhs_crores',
    date_format_pattern: fmt?.date_format_pattern || 'DD-MM-YYYY',
    homepage_active_sections_count,
    modules: {
      ...base.modules,
      '05': { code: '05', id: 'module-18-005', title: 'Languages', status: 'active' },
      '06': { code: '06', id: 'module-18-006', title: 'Time Zone', status: 'active' },
      '07': { code: '07', id: 'module-18-007', title: 'Date & Number Formats', status: 'active' },
      '08': { code: '08', id: 'module-18-008', title: 'Homepage Settings', status: 'active' }
    }
  };
}

/* ================= MODULE 05: LANGUAGES ================= */
async function handleLanguages(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;

  if (method === 'GET' && !sub) {
    const { results } = await db.prepare(`SELECT * FROM cfg_languages ORDER BY sort_order ASC, lang_code ASC`).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !sub) {
    const b = await readJson(request, 16000);
    const errors = {};
    const lang_code = sanitizeCfgText(b.lang_code, 20);
    const iso_639_1 = sanitizeCfgText(b.iso_639_1 || lang_code.slice(0, 2), 8).toLowerCase();
    const english_name = sanitizeCfgText(b.english_name, 80);
    const native_name = sanitizeCfgText(b.native_name, 80);
    const script_name = pick(b.script_name, CFG_SCRIPTS, 'script_name', errors, 'Latin');
    const translation_coverage_pct = Math.max(0, Math.min(100, parseInt(b.translation_coverage_pct ?? 50, 10) || 50));
    if (!lang_code) errors.lang_code = 'lang_code is required';
    if (!english_name) errors.english_name = 'english_name is required';
    if (!native_name) errors.native_name = 'native_name is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('cfg-lang');
    await db.prepare(
      `INSERT INTO cfg_languages
       (id, lang_code, iso_639_1, english_name, native_name, script_name, direction, fallback_lang_code, translation_coverage_pct, is_default, is_enabled, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ltr', 'en-IN', ?, 0, ?, 10, datetime('now'))`
    ).bind(newId, lang_code, iso_639_1, english_name, native_name, script_name, translation_coverage_pct, b.is_enabled === false ? 0 : 1).run();

    await snapshotCfgRevision(db, '05', newId, actor, 'create language');
    await audit(env, request, actor, 'settings.languages.create', 'cfg_languages', newId, { lang_code });
    const item = await db.prepare(`SELECT * FROM cfg_languages WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && sub && !extra) {
    const existing = await db.prepare(`SELECT * FROM cfg_languages WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Language not found');
    const b = await readJson(request, 16000);
    const english_name = sanitizeCfgText(b.english_name ?? existing.english_name, 80);
    const native_name = sanitizeCfgText(b.native_name ?? existing.native_name, 80);
    const translation_coverage_pct = b.translation_coverage_pct !== undefined
      ? Math.max(0, Math.min(100, parseInt(b.translation_coverage_pct, 10) || 0))
      : existing.translation_coverage_pct;

    await db.prepare(
      `UPDATE cfg_languages SET english_name=?, native_name=?, translation_coverage_pct=?, updated_at=datetime('now') WHERE id=?`
    ).bind(english_name, native_name, translation_coverage_pct, sub).run();
    await snapshotCfgRevision(db, '05', sub, actor, 'update language');
    const item = await db.prepare(`SELECT * FROM cfg_languages WHERE id = ?`).bind(sub).first();
    return json({ item });
  }

  if (method === 'PATCH' && sub && extra === 'toggle') {
    const existing = await db.prepare(`SELECT * FROM cfg_languages WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Language not found');
    const nextEnabled = Number(existing.is_enabled) === 1 ? 0 : 1;
    if (Number(existing.is_default) === 1 && nextEnabled === 0) {
      throw new HttpError(409, 'DEFAULT_LANGUAGE_REQUIRED', 'Cannot disable the default language');
    }
    await db.prepare(`UPDATE cfg_languages SET is_enabled=?, updated_at=datetime('now') WHERE id=?`).bind(nextEnabled, sub).run();
    await snapshotCfgRevision(db, '05', sub, actor, `toggle:${nextEnabled}`);
    await audit(env, request, actor, 'settings.languages.toggle', 'cfg_languages', sub, { is_enabled: nextEnabled });
    const item = await db.prepare(`SELECT * FROM cfg_languages WHERE id = ?`).bind(sub).first();
    return json({ item });
  }

  if (method === 'PATCH' && sub && extra === 'set-default') {
    const existing = await db.prepare(`SELECT * FROM cfg_languages WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Language not found');
    await db.prepare(`UPDATE cfg_languages SET is_default=0`).run();
    await db.prepare(`UPDATE cfg_languages SET is_default=1, is_enabled=1, updated_at=datetime('now') WHERE id=?`).bind(sub).run();
    await snapshotCfgRevision(db, '05', sub, actor, 'set-default');
    await audit(env, request, actor, 'settings.languages.set_default', 'cfg_languages', sub, { lang_code: existing.lang_code });
    const item = await db.prepare(`SELECT * FROM cfg_languages WHERE id = ?`).bind(sub).first();
    return json({ item });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown languages route');
}

/* ================= MODULE 06: TIME ZONE ================= */
async function handleTimezone(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_timezone_settings WHERE id = 'primary'`).first();
    return json({ item, server_ist_now: nowIstIso() });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_timezone_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const iana_timezone = sanitizeCfgText(b.iana_timezone ?? existing.iana_timezone, 60);
    const tz_abbreviation = sanitizeCfgText(b.tz_abbreviation ?? existing.tz_abbreviation, 12);
    const utc_offset_label = sanitizeCfgText(b.utc_offset_label ?? existing.utc_offset_label, 20);
    const enforce_ist_on_deadlines = b.enforce_ist_on_deadlines !== undefined ? (b.enforce_ist_on_deadlines ? 1 : 0) : existing.enforce_ist_on_deadlines;
    const show_ist_badge_on_timers = b.show_ist_badge_on_timers !== undefined ? (b.show_ist_badge_on_timers ? 1 : 0) : existing.show_ist_badge_on_timers;
    const academic_session_start_month = Math.max(1, Math.min(12, parseInt(b.academic_session_start_month ?? existing.academic_session_start_month, 10) || 4));
    const academic_session_label = sanitizeCfgText(b.academic_session_label ?? existing.academic_session_label, 60);
    const ntp_sync_note = sanitizeCfgText(b.ntp_sync_note ?? existing.ntp_sync_note, 160);
    const updatedBy = actor?.email || actor?.userId || 'system';

    await db.prepare(
      `UPDATE cfg_timezone_settings
       SET iana_timezone=?, tz_abbreviation=?, utc_offset_label=?, enforce_ist_on_deadlines=?, show_ist_badge_on_timers=?, academic_session_start_month=?, academic_session_label=?, ntp_sync_note=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      iana_timezone, tz_abbreviation, utc_offset_label, enforce_ist_on_deadlines,
      show_ist_badge_on_timers, academic_session_start_month, academic_session_label, ntp_sync_note, updatedBy
    ).run();

    await snapshotCfgRevision(db, '06', 'primary', actor, 'update timezone');
    await audit(env, request, actor, 'settings.timezone.update', 'cfg_timezone_settings', 'primary', { iana_timezone });
    const item = await db.prepare(`SELECT * FROM cfg_timezone_settings WHERE id = 'primary'`).first();
    return json({ item, server_ist_now: nowIstIso() });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 07: DATE & NUMBER FORMATS ================= */
async function handleFormats(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_date_number_formats WHERE id = 'primary'`).first();
    return json({ item, preview_samples: formatPreviewSamples(item) });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_date_number_formats WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const errors = {};
    const date_format_pattern = pick(b.date_format_pattern ?? existing.date_format_pattern, CFG_DATE_PATTERNS, 'date_format_pattern', errors, existing.date_format_pattern);
    const time_format_pattern = pick(b.time_format_pattern ?? existing.time_format_pattern, CFG_TIME_PATTERNS, 'time_format_pattern', errors, existing.time_format_pattern);
    const datetime_separator = sanitizeCfgText(b.datetime_separator ?? existing.datetime_separator, 12) || ' · ';
    const number_grouping = pick(b.number_grouping ?? existing.number_grouping, CFG_NUMBER_GROUPINGS, 'number_grouping', errors, existing.number_grouping);
    const currency_code = sanitizeCfgText(b.currency_code ?? existing.currency_code, 8).toUpperCase();
    const currency_symbol = sanitizeCfgText(b.currency_symbol ?? existing.currency_symbol, 6);
    const currency_position = pick(b.currency_position ?? existing.currency_position, CFG_CURR_POSITIONS, 'currency_position', errors, existing.currency_position);
    const decimal_places = Number(b.decimal_places ?? existing.decimal_places) === 0 ? 0 : 2;
    const odia_numerals_mode = pick(b.odia_numerals_mode ?? existing.odia_numerals_mode, CFG_ODIA_NUMERALS, 'odia_numerals_mode', errors, existing.odia_numerals_mode);
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_date_number_formats
       SET date_format_pattern=?, time_format_pattern=?, datetime_separator=?, number_grouping=?, currency_code=?, currency_symbol=?, currency_position=?, decimal_places=?, odia_numerals_mode=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      date_format_pattern, time_format_pattern, datetime_separator, number_grouping,
      currency_code, currency_symbol, currency_position, decimal_places, odia_numerals_mode, updatedBy
    ).run();

    await snapshotCfgRevision(db, '07', 'primary', actor, 'update formats');
    await audit(env, request, actor, 'settings.formats.update', 'cfg_date_number_formats', 'primary', { number_grouping, date_format_pattern });
    const item = await db.prepare(`SELECT * FROM cfg_date_number_formats WHERE id = 'primary'`).first();
    return json({ item, preview_samples: formatPreviewSamples(item) });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 08: HOMEPAGE SETTINGS ================= */
async function handleHomepage(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_homepage_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_homepage_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 32000);
    const errors = {};
    const hero_badge_en = sanitizeCfgText(b.hero_badge_en ?? existing.hero_badge_en, 160);
    const hero_badge_or = sanitizeCfgText(b.hero_badge_or ?? existing.hero_badge_or, 160);
    const hero_headline_en = sanitizeCfgText(b.hero_headline_en ?? existing.hero_headline_en, 240);
    const hero_headline_or = sanitizeCfgText(b.hero_headline_or ?? existing.hero_headline_or, 240);
    const hero_subheadline_en = sanitizeCfgText(b.hero_subheadline_en ?? existing.hero_subheadline_en, 320);
    const hero_subheadline_or = sanitizeCfgText(b.hero_subheadline_or ?? existing.hero_subheadline_or, 320);
    const primary_cta_label_en = sanitizeCfgText(b.primary_cta_label_en ?? existing.primary_cta_label_en, 80);
    const primary_cta_label_or = sanitizeCfgText(b.primary_cta_label_or ?? existing.primary_cta_label_or, 80);
    const primary_cta_url = sanitizeCfgUrl(b.primary_cta_url ?? existing.primary_cta_url);
    const show_live_deadline_ticker = b.show_live_deadline_ticker !== undefined ? (b.show_live_deadline_ticker ? 1 : 0) : existing.show_live_deadline_ticker;
    const show_featured_exams_grid = b.show_featured_exams_grid !== undefined ? (b.show_featured_exams_grid ? 1 : 0) : existing.show_featured_exams_grid;
    const show_odisha_schemes_strip = b.show_odisha_schemes_strip !== undefined ? (b.show_odisha_schemes_strip ? 1 : 0) : existing.show_odisha_schemes_strip;
    const show_daily_pyq_widget = b.show_daily_pyq_widget !== undefined ? (b.show_daily_pyq_widget ? 1 : 0) : existing.show_daily_pyq_widget;
    const featured_cards_limit = Math.max(4, Math.min(12, parseInt(b.featured_cards_limit ?? existing.featured_cards_limit, 10) || 6));
    if (!hero_headline_en) errors.hero_headline_en = 'hero_headline_en is required';
    if (!primary_cta_url) errors.primary_cta_url = 'primary_cta_url must be a valid URL or path';
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_homepage_settings
       SET hero_badge_en=?, hero_badge_or=?, hero_headline_en=?, hero_headline_or=?, hero_subheadline_en=?, hero_subheadline_or=?, primary_cta_label_en=?, primary_cta_label_or=?, primary_cta_url=?, show_live_deadline_ticker=?, show_featured_exams_grid=?, show_odisha_schemes_strip=?, show_daily_pyq_widget=?, featured_cards_limit=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      hero_badge_en, hero_badge_or, hero_headline_en, hero_headline_or,
      hero_subheadline_en, hero_subheadline_or, primary_cta_label_en, primary_cta_label_or,
      primary_cta_url, show_live_deadline_ticker, show_featured_exams_grid,
      show_odisha_schemes_strip, show_daily_pyq_widget, featured_cards_limit, updatedBy
    ).run();

    await snapshotCfgRevision(db, '08', 'primary', actor, 'update homepage settings');
    await audit(env, request, actor, 'settings.homepage.update', 'cfg_homepage_settings', 'primary', { featured_cards_limit });
    const item = await db.prepare(`SELECT * FROM cfg_homepage_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleSettingsConfigBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureSettingsConfigBatch2Schema(env.DB);
  if (id === 'languages') return handleLanguages(request, env, actor, sub, extra);
  if (id === 'timezone') return handleTimezone(request, env, actor);
  if (id === 'formats') return handleFormats(request, env, actor);
  if (id === 'homepage') return handleHomepage(request, env, actor);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown settings batch 2 route');
}

/* ================= PUBLIC ENRICHED SITE CONFIG API ================= */
export async function handlePublicSiteConfigBatch2Api(request, env) {
  await ensureSettingsConfigBatch2Schema(env.DB);
  const baseRes = await handlePublicSiteConfigApi(request, env);
  const baseData = await baseRes.json();

  const [langsRes, tz, fmt, hp] = await Promise.all([
    env.DB.prepare(`SELECT lang_code, iso_639_1, english_name, native_name, script_name, direction, translation_coverage_pct, is_default FROM cfg_languages WHERE is_enabled = 1 ORDER BY sort_order ASC`).all(),
    env.DB.prepare(`SELECT iana_timezone, tz_abbreviation, utc_offset_label, enforce_ist_on_deadlines, show_ist_badge_on_timers, academic_session_start_month, academic_session_label FROM cfg_timezone_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT date_format_pattern, time_format_pattern, datetime_separator, number_grouping, currency_code, currency_symbol, currency_position, decimal_places, odia_numerals_mode FROM cfg_date_number_formats WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT hero_badge_en, hero_badge_or, hero_headline_en, hero_headline_or, hero_subheadline_en, hero_subheadline_or, primary_cta_label_en, primary_cta_label_or, primary_cta_url, show_live_deadline_ticker, show_featured_exams_grid, show_odisha_schemes_strip, show_daily_pyq_widget, featured_cards_limit FROM cfg_homepage_settings WHERE id = 'primary'`).first()
  ]);

  return json({
    ...baseData,
    languages: langsRes.results || [],
    timezone: tz,
    formats: { ...fmt, preview_samples: formatPreviewSamples(fmt) },
    homepage: hp
  }, 200, {
    'Cache-Control': 'public, max-age=120, s-maxage=300'
  });
}
