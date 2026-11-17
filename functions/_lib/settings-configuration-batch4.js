// Settings & Configuration Batch 4 (v124): Modules 13-17
// 13 Registration Settings | 14 Comment Settings | 15 Payment Settings | 16 Environment Status | 17 Administrative Preferences
// Security: DPDP Act 2023 explicit consent & age guardrails; zero plaintext payment secrets or raw env secrets.
import { HttpError, json, readJson, validationError } from './http.js';
import { invalidateEdgePaths, SETTINGS_PUBLIC_PATHS } from './edge-cache-invalidator.js';
import { audit } from './rbac.js';
import { nowIstIso } from './events-scheduling-batch1.js';
import { formatInrFromPaise } from './events-scheduling-batch2.js';
import { sha256Hex } from './integrations-webhooks-edge-batch1.js';
import { ACTIVE_SW_CACHE_VERSION } from './ops-sentinel.js';
import {
  CFG_REV_TABLES,
  sanitizeCfgText,
  snapshotCfgRevision
} from './settings-configuration-batch1.js';
import {
  ensureSettingsConfigBatch3Schema,
  getFull12ModuleSettingsOverview,
  handlePublicSiteConfigBatch3Api
} from './settings-configuration-batch3.js';

export const CFG_REG_MODES = ['open_self_signup', 'otp_verified_signup', 'invite_only', 'paused'];
export const CFG_AUTH_METHODS = ['email_otp', 'mobile_sms_otp', 'google_oauth'];
export const CFG_MODERATION_MODES = ['pre_approve_all', 'auto_publish_verified_filter_links', 'trusted_users_only'];
export const CFG_PAYMENT_GATEWAYS = ['razorpay_india', 'cashfree_india', 'upi_intent_direct'];
export const CFG_GATEWAY_MODES = ['live_production', 'test_sandbox'];
export const CFG_UI_DENSITIES = ['comfortable_alabaster', 'compact_ops'];
export const CFG_PAGE_SIZES = [10, 20, 50, 100];

const _cfg4Ready = new WeakSet();

CFG_REV_TABLES['13'] = {
  table: 'cfg_registration_settings',
  cols: [
    'registration_mode', 'auth_methods_json', 'require_dpdp_explicit_consent',
    'minimum_age_years', 'default_candidate_role', 'collect_home_district_odisha',
    'session_ttl_hours', 'max_failed_login_attempts', 'updated_by'
  ]
};
CFG_REV_TABLES['14'] = {
  table: 'cfg_comment_settings',
  cols: [
    'comments_enabled_globally', 'moderation_mode', 'block_external_urls',
    'odia_english_profanity_filter', 'max_comment_length_chars', 'rate_limit_comments_per_hour',
    'allow_nested_replies_depth', 'auto_lock_threads_after_days', 'updated_by'
  ]
};
CFG_REV_TABLES['15'] = {
  table: 'cfg_payment_settings',
  cols: [
    'primary_gateway', 'gateway_mode', 'key_id_masked_hint', 'key_secret_hash_sha256',
    'currency_code', 'gst_enabled', 'gst_rate_bps', 'gstin_masked_hint',
    'min_order_paise', 'max_order_paise', 'refund_window_days', 'invoice_prefix', 'updated_by'
  ]
};
CFG_REV_TABLES['17'] = {
  table: 'cfg_admin_preferences',
  cols: [
    'admin_ui_density', 'default_admin_landing_module', 'table_rows_per_page',
    'confirm_before_destructive_action', 'show_odia_bilingual_fields_expanded',
    'audit_trail_retention_days', 'keyboard_shortcuts_enabled', 'updated_by'
  ]
};

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

function parseAuthMethods(raw) {
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p : raw.split(',');
    } catch {
      arr = raw.split(',');
    }
  }
  return arr.map(v => sanitizeCfgText(v, 40)).filter(v => CFG_AUTH_METHODS.includes(v));
}

function maskPayKey(raw, prefix = 'rzp_live_') {
  const s = sanitizeCfgText(raw, 120);
  if (!s) return `${prefix}••••8f3d`;
  if (s.includes('••••')) return s;
  return `${prefix}••••${s.slice(-4)}`;
}

function projectReg(row) {
  if (!row) return null;
  return { ...row, auth_methods: parseAuthMethods(row.auth_methods_json) };
}

function projectPay(row) {
  if (!row) return null;
  const { key_secret_hash_sha256: _omit, ...safe } = row;
  return {
    ...safe,
    gst_rate_pct: Number((Number(row.gst_rate_bps || 0) / 100).toFixed(2)),
    min_order_inr: formatInrFromPaise(row.min_order_paise || 0),
    max_order_inr: formatInrFromPaise(row.max_order_paise || 0)
  };
}

/* ================= SCHEMA & SEEDING ================= */
export async function ensureSettingsConfigBatch4Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureSettingsConfigBatch3Schema(db);
  if (_cfg4Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS cfg_registration_settings (
      id TEXT PRIMARY KEY,
      registration_mode TEXT NOT NULL DEFAULT 'otp_verified_signup',
      auth_methods_json TEXT NOT NULL DEFAULT '[]',
      require_dpdp_explicit_consent INTEGER NOT NULL DEFAULT 1,
      minimum_age_years INTEGER NOT NULL DEFAULT 16,
      default_candidate_role TEXT NOT NULL DEFAULT 'candidate_learner',
      collect_home_district_odisha INTEGER NOT NULL DEFAULT 1,
      session_ttl_hours INTEGER NOT NULL DEFAULT 168,
      max_failed_login_attempts INTEGER NOT NULL DEFAULT 5,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_comment_settings (
      id TEXT PRIMARY KEY,
      comments_enabled_globally INTEGER NOT NULL DEFAULT 1,
      moderation_mode TEXT NOT NULL DEFAULT 'auto_publish_verified_filter_links',
      block_external_urls INTEGER NOT NULL DEFAULT 1,
      odia_english_profanity_filter INTEGER NOT NULL DEFAULT 1,
      max_comment_length_chars INTEGER NOT NULL DEFAULT 1500,
      rate_limit_comments_per_hour INTEGER NOT NULL DEFAULT 10,
      allow_nested_replies_depth INTEGER NOT NULL DEFAULT 2,
      auto_lock_threads_after_days INTEGER NOT NULL DEFAULT 90,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_payment_settings (
      id TEXT PRIMARY KEY,
      primary_gateway TEXT NOT NULL DEFAULT 'razorpay_india',
      gateway_mode TEXT NOT NULL DEFAULT 'live_production',
      key_id_masked_hint TEXT NOT NULL DEFAULT 'rzp_live_••••8f3d',
      key_secret_hash_sha256 TEXT NOT NULL DEFAULT '',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      gst_enabled INTEGER NOT NULL DEFAULT 1,
      gst_rate_bps INTEGER NOT NULL DEFAULT 1800,
      gstin_masked_hint TEXT NOT NULL DEFAULT '21•••••1Z5',
      min_order_paise INTEGER NOT NULL DEFAULT 1000,
      max_order_paise INTEGER NOT NULL DEFAULT 5000000,
      refund_window_days INTEGER NOT NULL DEFAULT 7,
      invoice_prefix TEXT NOT NULL DEFAULT 'CSO-INV-2026-',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_admin_preferences (
      id TEXT PRIMARY KEY,
      admin_ui_density TEXT NOT NULL DEFAULT 'comfortable_alabaster',
      default_admin_landing_module TEXT NOT NULL DEFAULT 'module-18-001',
      table_rows_per_page INTEGER NOT NULL DEFAULT 20,
      confirm_before_destructive_action INTEGER NOT NULL DEFAULT 1,
      show_odia_bilingual_fields_expanded INTEGER NOT NULL DEFAULT 1,
      audit_trail_retention_days INTEGER NOT NULL DEFAULT 365,
      keyboard_shortcuts_enabled INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  const regCnt = await db.prepare(`SELECT COUNT(*) AS n FROM cfg_registration_settings`).first();
  if (Number(regCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT OR IGNORE INTO cfg_registration_settings (id, auth_methods_json) VALUES ('primary', ?)`
    ).bind(JSON.stringify(['email_otp', 'mobile_sms_otp', 'google_oauth'])).run();
  }

  await db.prepare(`INSERT OR IGNORE INTO cfg_comment_settings (id) VALUES ('primary')`).run();

  const payCnt = await db.prepare(`SELECT COUNT(*) AS n FROM cfg_payment_settings`).first();
  if (Number(payCnt?.n || 0) === 0) {
    const h = await sha256Hex('seed-rzp-live-secret-8f3d');
    await db.prepare(
      `INSERT OR IGNORE INTO cfg_payment_settings (id, key_secret_hash_sha256) VALUES ('primary', ?)`
    ).bind(h).run();
  }

  await db.prepare(`INSERT OR IGNORE INTO cfg_admin_preferences (id) VALUES ('primary')`).run();
  _cfg4Ready.add(db);
}

/* ================= LIVE ENVIRONMENT DIAGNOSTICS (MODULE 16) ================= */
export async function runLiveEnvironmentDiagnostics(env) {
  const db = env.DB;
  const t0 = Date.now();
  await db.prepare(`SELECT 1 AS ok`).first();
  const d1_latency_ms = Math.max(1, Date.now() - t0);
  const tblRes = await db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).first();
  const table_count = Number(tblRes?.n || 0);

  return {
    runtime: 'Cloudflare Worker (Edge V8)',
    d1_database: { binding: 'DB (csodisha-prod)', status: 'healthy', latency_ms: d1_latency_ms, table_count },
    r2_storage: { binding: 'R2 (csodisha-assets)', configured: Boolean(env.R2), status: env.R2 ? 'bound_ready' : 'fallback_manifest_mode' },
    service_worker: { active_cache_version: ACTIVE_SW_CACHE_VERSION },
    csp_shield: { policy: 'strict_zero_inline_csp', inline_scripts_allowed: false, inline_styles_allowed: false },
    server_clock_ist: nowIstIso(),
    checked_at_ist: nowIstIso()
  };
}

/* ================= UNIFIED 17-MODULE OVERVIEW (01-17 ALL ACTIVE) ================= */
export async function getFull17ModuleSettingsOverview(env) {
  await ensureSettingsConfigBatch4Schema(env.DB);
  const [base12, reg, cmt, pay, adm, envDiag] = await Promise.all([
    getFull12ModuleSettingsOverview(env),
    env.DB.prepare(`SELECT registration_mode, minimum_age_years, require_dpdp_explicit_consent FROM cfg_registration_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT comments_enabled_globally, moderation_mode FROM cfg_comment_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT primary_gateway, gst_rate_bps FROM cfg_payment_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT admin_ui_density, table_rows_per_page FROM cfg_admin_preferences WHERE id = 'primary'`).first(),
    runLiveEnvironmentDiagnostics(env)
  ]);

  const modules = {
    ...base12.modules,
    '13': { code: '13', id: 'module-18-013', title: 'Registration Settings', status: 'active' },
    '14': { code: '14', id: 'module-18-014', title: 'Comment Settings', status: 'active' },
    '15': { code: '15', id: 'module-18-015', title: 'Payment Settings', status: 'active' },
    '16': { code: '16', id: 'module-18-016', title: 'Environment Status', status: 'active' },
    '17': { code: '17', id: 'module-18-017', title: 'Administrative Preferences', status: 'active' }
  };

  const suite_17 = {
    total_modules: 17,
    active_modules: 17,
    site_mode: base12.site_mode,
    brand_palette: base12.brand_palette,
    dpdp_grievance_ready: base12.dpdp_grievance_ready,
    default_locale: base12.default_locale,
    currency_code: base12.currency_code,
    enabled_languages_count: base12.enabled_languages_count,
    odia_coverage_pct: base12.odia_coverage_pct,
    iana_timezone: base12.iana_timezone,
    number_grouping: base12.number_grouping,
    homepage_active_sections_count: base12.homepage_active_sections_count,
    enabled_feature_toggles_count: base12.enabled_feature_toggles_count,
    email_transport_driver: base12.email_transport_driver,
    max_pdf_mb: base12.max_pdf_mb,
    require_source_citation_url: base12.require_source_citation_url,
    registration_mode: reg?.registration_mode || 'otp_verified_signup',
    comment_moderation_mode: cmt?.moderation_mode || 'auto_publish_verified_filter_links',
    primary_payment_gateway: pay?.primary_gateway || 'razorpay_india',
    gst_rate_pct: Number((Number(pay?.gst_rate_bps ?? 1800) / 100).toFixed(2)),
    active_sw_cache_version: ACTIVE_SW_CACHE_VERSION,
    admin_ui_density: adm?.admin_ui_density || 'comfortable_alabaster'
  };

  return {
    ...base12,
    registration_mode: suite_17.registration_mode,
    comment_moderation_mode: suite_17.comment_moderation_mode,
    primary_payment_gateway: suite_17.primary_payment_gateway,
    gst_rate_pct: suite_17.gst_rate_pct,
    admin_ui_density: suite_17.admin_ui_density,
    environment_health: envDiag.d1_database.status,
    suite_17,
    modules
  };
}

/* ================= MODULE 13: REGISTRATION SETTINGS ================= */
async function handleRegistration(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const row = await db.prepare(`SELECT * FROM cfg_registration_settings WHERE id = 'primary'`).first();
    return json({ item: projectReg(row) });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_registration_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const errors = {};
    const registration_mode = pick(b.registration_mode ?? existing.registration_mode, CFG_REG_MODES, 'registration_mode', errors, existing.registration_mode);
    const auth_methods = b.auth_methods !== undefined ? parseAuthMethods(b.auth_methods) : parseAuthMethods(existing.auth_methods_json);
    const require_dpdp_explicit_consent = b.require_dpdp_explicit_consent !== undefined ? (b.require_dpdp_explicit_consent ? 1 : 0) : existing.require_dpdp_explicit_consent;
    const minimum_age_years = parseInt(b.minimum_age_years ?? existing.minimum_age_years, 10);
    const default_candidate_role = sanitizeCfgText(b.default_candidate_role ?? existing.default_candidate_role, 60);
    const collect_home_district_odisha = b.collect_home_district_odisha !== undefined ? (b.collect_home_district_odisha ? 1 : 0) : existing.collect_home_district_odisha;
    const session_ttl_hours = Math.max(1, Math.min(720, parseInt(b.session_ttl_hours ?? existing.session_ttl_hours, 10) || 168));
    const max_failed_login_attempts = Math.max(3, Math.min(10, parseInt(b.max_failed_login_attempts ?? existing.max_failed_login_attempts, 10) || 5));

    if (require_dpdp_explicit_consent !== 1) {
      errors.require_dpdp_explicit_consent = 'DPDP Act 2023 explicit consent is mandatory for candidate registration';
    }
    if (!Number.isFinite(minimum_age_years) || minimum_age_years < 14 || minimum_age_years > 21) {
      errors.minimum_age_years = 'minimum_age_years must be between 14 and 21';
    }
    if (auth_methods.length === 0) {
      errors.auth_methods = 'At least one authentication method is required';
    }
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_registration_settings
       SET registration_mode=?, auth_methods_json=?, require_dpdp_explicit_consent=?, minimum_age_years=?, default_candidate_role=?, collect_home_district_odisha=?, session_ttl_hours=?, max_failed_login_attempts=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      registration_mode, JSON.stringify(auth_methods), require_dpdp_explicit_consent,
      minimum_age_years, default_candidate_role, collect_home_district_odisha,
      session_ttl_hours, max_failed_login_attempts, updatedBy
    ).run();

    await snapshotCfgRevision(db, '13', 'primary', actor, 'update registration settings');
    await audit(env, request, actor, 'settings.registration.update', 'cfg_registration_settings', 'primary', { registration_mode, minimum_age_years });
    const row = await db.prepare(`SELECT * FROM cfg_registration_settings WHERE id = 'primary'`).first();
    return json({ item: projectReg(row) });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 14: COMMENT SETTINGS ================= */
async function handleComments(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_comment_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_comment_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const errors = {};
    const comments_enabled_globally = b.comments_enabled_globally !== undefined ? (b.comments_enabled_globally ? 1 : 0) : existing.comments_enabled_globally;
    const moderation_mode = pick(b.moderation_mode ?? existing.moderation_mode, CFG_MODERATION_MODES, 'moderation_mode', errors, existing.moderation_mode);
    const block_external_urls = b.block_external_urls !== undefined ? (b.block_external_urls ? 1 : 0) : existing.block_external_urls;
    const odia_english_profanity_filter = b.odia_english_profanity_filter !== undefined ? (b.odia_english_profanity_filter ? 1 : 0) : existing.odia_english_profanity_filter;
    const max_comment_length_chars = Math.max(200, Math.min(4000, parseInt(b.max_comment_length_chars ?? existing.max_comment_length_chars, 10) || 1500));
    const rate_limit_comments_per_hour = Math.max(1, Math.min(60, parseInt(b.rate_limit_comments_per_hour ?? existing.rate_limit_comments_per_hour, 10) || 10));
    const allow_nested_replies_depth = Math.max(1, Math.min(4, parseInt(b.allow_nested_replies_depth ?? existing.allow_nested_replies_depth, 10) || 2));
    const auto_lock_threads_after_days = Math.max(0, Math.min(365, parseInt(b.auto_lock_threads_after_days ?? existing.auto_lock_threads_after_days, 10) || 90));
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_comment_settings
       SET comments_enabled_globally=?, moderation_mode=?, block_external_urls=?, odia_english_profanity_filter=?, max_comment_length_chars=?, rate_limit_comments_per_hour=?, allow_nested_replies_depth=?, auto_lock_threads_after_days=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      comments_enabled_globally, moderation_mode, block_external_urls, odia_english_profanity_filter,
      max_comment_length_chars, rate_limit_comments_per_hour, allow_nested_replies_depth,
      auto_lock_threads_after_days, updatedBy
    ).run();

    await snapshotCfgRevision(db, '14', 'primary', actor, 'update comment settings');
    await audit(env, request, actor, 'settings.comments.update', 'cfg_comment_settings', 'primary', { moderation_mode });
    const item = await db.prepare(`SELECT * FROM cfg_comment_settings WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 15: PAYMENT SETTINGS ================= */
async function handlePayments(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const row = await db.prepare(`SELECT * FROM cfg_payment_settings WHERE id = 'primary'`).first();
    return json({ item: projectPay(row) });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_payment_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const errors = {};
    const primary_gateway = pick(b.primary_gateway ?? existing.primary_gateway, CFG_PAYMENT_GATEWAYS, 'primary_gateway', errors, existing.primary_gateway);
    const gateway_mode = pick(b.gateway_mode ?? existing.gateway_mode, CFG_GATEWAY_MODES, 'gateway_mode', errors, existing.gateway_mode);
    const key_id_masked_hint = b.key_id ? maskPayKey(b.key_id, primary_gateway === 'razorpay_india' ? 'rzp_live_' : 'pay_') : existing.key_id_masked_hint;
    const gst_enabled = b.gst_enabled !== undefined ? (b.gst_enabled ? 1 : 0) : existing.gst_enabled;
    const gst_rate_bps = Math.max(0, Math.min(2800, parseInt(b.gst_rate_bps ?? existing.gst_rate_bps, 10) || 0));
    const gstin_masked_hint = sanitizeCfgText(b.gstin_masked_hint ?? existing.gstin_masked_hint, 30);
    const min_order_paise = parseInt(b.min_order_paise ?? existing.min_order_paise, 10);
    const max_order_paise = parseInt(b.max_order_paise ?? existing.max_order_paise, 10);
    const refund_window_days = Math.max(0, Math.min(30, parseInt(b.refund_window_days ?? existing.refund_window_days, 10) || 7));
    const invoice_prefix = sanitizeCfgText(b.invoice_prefix ?? existing.invoice_prefix, 40);

    if (!Number.isFinite(min_order_paise) || min_order_paise < 100) errors.min_order_paise = 'min_order_paise must be at least 100 (₹1.00)';
    if (!Number.isFinite(max_order_paise) || max_order_paise < min_order_paise) errors.max_order_paise = 'max_order_paise must be >= min_order_paise';
    if (Object.keys(errors).length) return validationError(errors);

    let key_secret_hash_sha256 = existing.key_secret_hash_sha256;
    if (b.key_secret) {
      key_secret_hash_sha256 = await sha256Hex(sanitizeCfgText(b.key_secret, 200));
    }

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_payment_settings
       SET primary_gateway=?, gateway_mode=?, key_id_masked_hint=?, key_secret_hash_sha256=?, gst_enabled=?, gst_rate_bps=?, gstin_masked_hint=?, min_order_paise=?, max_order_paise=?, refund_window_days=?, invoice_prefix=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      primary_gateway, gateway_mode, key_id_masked_hint, key_secret_hash_sha256,
      gst_enabled, gst_rate_bps, gstin_masked_hint, min_order_paise, max_order_paise,
      refund_window_days, invoice_prefix, updatedBy
    ).run();

    await snapshotCfgRevision(db, '15', 'primary', actor, 'update payment settings');
    await audit(env, request, actor, 'settings.payments.update', 'cfg_payment_settings', 'primary', { primary_gateway, gateway_mode });
    const row = await db.prepare(`SELECT * FROM cfg_payment_settings WHERE id = 'primary'`).first();
    return json({ item: projectPay(row) });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 16: ENVIRONMENT STATUS ================= */
async function handleEnvironment(request, env, actor, sub) {
  if (request.method === 'GET' && !sub) {
    return json({ diagnostics: await runLiveEnvironmentDiagnostics(env) });
  }
  if (request.method === 'POST' && sub === 'run-diagnostics') {
    const diagnostics = await runLiveEnvironmentDiagnostics(env);
    await audit(env, request, actor, 'settings.environment.diagnostics', 'environment', 'primary', {
      d1_latency_ms: diagnostics.d1_database.latency_ms,
      table_count: diagnostics.d1_database.table_count
    });
    return json({ ok: true, diagnostics });
  }
  throw new HttpError(404, 'NOT_FOUND', 'Unknown environment route');
}

/* ================= MODULE 17: ADMINISTRATIVE PREFERENCES ================= */
async function handleAdminPreferences(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_admin_preferences WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_admin_preferences WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const errors = {};
    const admin_ui_density = pick(b.admin_ui_density ?? existing.admin_ui_density, CFG_UI_DENSITIES, 'admin_ui_density', errors, existing.admin_ui_density);
    const default_admin_landing_module = sanitizeCfgText(b.default_admin_landing_module ?? existing.default_admin_landing_module, 60);
    const table_rows_per_page = CFG_PAGE_SIZES.includes(Number(b.table_rows_per_page)) ? Number(b.table_rows_per_page) : existing.table_rows_per_page;
    const confirm_before_destructive_action = b.confirm_before_destructive_action !== undefined ? (b.confirm_before_destructive_action ? 1 : 0) : existing.confirm_before_destructive_action;
    const show_odia_bilingual_fields_expanded = b.show_odia_bilingual_fields_expanded !== undefined ? (b.show_odia_bilingual_fields_expanded ? 1 : 0) : existing.show_odia_bilingual_fields_expanded;
    const audit_trail_retention_days = Math.max(90, Math.min(3650, parseInt(b.audit_trail_retention_days ?? existing.audit_trail_retention_days, 10) || 365));
    const keyboard_shortcuts_enabled = b.keyboard_shortcuts_enabled !== undefined ? (b.keyboard_shortcuts_enabled ? 1 : 0) : existing.keyboard_shortcuts_enabled;
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_admin_preferences
       SET admin_ui_density=?, default_admin_landing_module=?, table_rows_per_page=?, confirm_before_destructive_action=?, show_odia_bilingual_fields_expanded=?, audit_trail_retention_days=?, keyboard_shortcuts_enabled=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      admin_ui_density, default_admin_landing_module, table_rows_per_page,
      confirm_before_destructive_action, show_odia_bilingual_fields_expanded,
      audit_trail_retention_days, keyboard_shortcuts_enabled, updatedBy
    ).run();

    await snapshotCfgRevision(db, '17', 'primary', actor, 'update admin preferences');
    await audit(env, request, actor, 'settings.admin_preferences.update', 'cfg_admin_preferences', 'primary', { admin_ui_density });
    const item = await db.prepare(`SELECT * FROM cfg_admin_preferences WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleSettingsConfigBatch4Admin(request, env, actor, id, sub) {
  await ensureSettingsConfigBatch4Schema(env.DB);
  let res = null;
  if (id === 'registration') res = await handleRegistration(request, env, actor);
  else if (id === 'comments') res = await handleComments(request, env, actor);
  else if (id === 'payments') res = await handlePayments(request, env, actor);
  else if (id === 'environment') res = await handleEnvironment(request, env, actor, sub);
  else if (id === 'admin-preferences') res = await handleAdminPreferences(request, env, actor);
  else throw new HttpError(404, 'NOT_FOUND', 'Unknown settings batch 4 route');
  if (request.method !== 'GET' && request.method !== 'HEAD' && res && res.status >= 200 && res.status < 300) {
    await invalidateEdgePaths(request, SETTINGS_PUBLIC_PATHS);
  }
  return res;
}

/* ================= PUBLIC ENRICHED SITE CONFIG API ================= */
export async function handlePublicSiteConfigBatch4Api(request, env) {
  await ensureSettingsConfigBatch4Schema(env.DB);
  const baseRes = await handlePublicSiteConfigBatch3Api(request, env);
  const baseData = await baseRes.json();

  const [reg, cmt, pay] = await Promise.all([
    env.DB.prepare(`SELECT registration_mode, auth_methods_json, minimum_age_years, require_dpdp_explicit_consent FROM cfg_registration_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT comments_enabled_globally, moderation_mode, max_comment_length_chars FROM cfg_comment_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT primary_gateway, currency_code, gst_enabled, gst_rate_bps, min_order_paise FROM cfg_payment_settings WHERE id = 'primary'`).first()
  ]);

  return json({
    ...baseData,
    registration_policy: {
      registration_mode: reg?.registration_mode || 'otp_verified_signup',
      auth_methods: parseAuthMethods(reg?.auth_methods_json),
      minimum_age_years: Number(reg?.minimum_age_years ?? 16),
      require_dpdp_explicit_consent: Number(reg?.require_dpdp_explicit_consent ?? 1) === 1
    },
    comment_policy: {
      comments_enabled_globally: Number(cmt?.comments_enabled_globally ?? 1) === 1,
      moderation_mode: cmt?.moderation_mode || 'auto_publish_verified_filter_links',
      max_comment_length_chars: Number(cmt?.max_comment_length_chars ?? 1500)
    },
    payment_policy: {
      primary_gateway: pay?.primary_gateway || 'razorpay_india',
      currency_code: pay?.currency_code || 'INR',
      gst_enabled: Number(pay?.gst_enabled ?? 1) === 1,
      gst_rate_pct: Number((Number(pay?.gst_rate_bps ?? 1800) / 100).toFixed(2)),
      min_order_inr: formatInrFromPaise(pay?.min_order_paise ?? 1000)
    }
  }, 200, {
    'Cache-Control': 'public, max-age=120, s-maxage=300'
  });
}
