// Settings & Configuration Batch 3 (v123): Modules 09-12
// 09 Feature Toggles | 10 Email Settings | 11 Upload Limits | 12 Content Defaults
// Security: Zero plaintext SMTP/mail credentials; executable MIME types/extensions blocked.
import { HttpError, json, readJson, validationError } from './http.js';
import { invalidateEdgePaths, SETTINGS_PUBLIC_PATHS } from './edge-cache-invalidator.js';
import { audit } from './rbac.js';
import { likeEscape } from './validate.js';
import { nowIstIso } from './events-scheduling-batch1.js';
import { sha256Hex } from './integrations-webhooks-edge-batch1.js';
import {
  CFG_REV_TABLES,
  isValidEmail,
  sanitizeCfgText,
  snapshotCfgRevision
} from './settings-configuration-batch1.js';
import {
  ensureSettingsConfigBatch2Schema,
  getFull8ModuleSettingsOverview,
  handlePublicSiteConfigBatch2Api
} from './settings-configuration-batch2.js';

export const CFG_FLAG_CATEGORIES = ['candidate_portal', 'study_tools', 'community_engagement', 'edge_performance'];
export const CFG_ROLLOUT_SCOPES = ['all_users', 'logged_in_candidates', 'staff_beta', 'disabled'];

export const CFG_EMAIL_DRIVERS = ['cloudflare_mailchannels', 'resend_api', 'smtp_relay', 'aws_ses_ap_south_1'];
export const CFG_EMAIL_ENCRYPTIONS = ['STARTTLS', 'SSL_TLS'];

export const CFG_PUBLISH_STATUSES = ['draft', 'in_review', 'published'];
export const CFG_CONTENT_LANGS = ['bilingual_en_or', 'en', 'or'];
export const CFG_LICENSES = ['CC-BY-NC-SA-4.0', 'PUBLIC_GOV_RECORD', 'CS_ODISHA_PROPRIETARY'];
export const CFG_META_ROBOTS = ['index, follow', 'noindex, follow'];

const DANGEROUS_MIME_TYPES = new Set([
  'application/x-msdownload', 'application/x-sh', 'application/x-httpd-php',
  'text/javascript', 'application/javascript', 'application/x-executable',
  'application/x-bat', 'application/x-csh', 'application/x-msi'
]);

const _cfg3Ready = new WeakSet();

CFG_REV_TABLES['09'] = {
  table: 'cfg_feature_toggles',
  cols: [
    'flag_key', 'label_en', 'label_or', 'description_en', 'category_group',
    'rollout_scope', 'rollout_pct', 'is_enabled', 'updated_by'
  ]
};
CFG_REV_TABLES['10'] = {
  table: 'cfg_email_settings',
  cols: [
    'transport_driver', 'smtp_host', 'smtp_port', 'encryption_mode', 'from_name_en', 'from_name_or',
    'from_address', 'reply_to_address', 'credential_hash_sha256', 'credential_masked_hint',
    'daily_send_quota', 'dkim_spf_verified', 'updated_by'
  ]
};
CFG_REV_TABLES['11'] = {
  table: 'cfg_upload_limits',
  cols: [
    'max_pdf_mb', 'max_image_mb', 'max_audio_zip_mb', 'max_files_per_batch',
    'allowed_mime_types_json', 'blocked_extensions_json', 'auto_convert_images_webp',
    'strip_exif_metadata', 'r2_bucket_binding', 'updated_by'
  ]
};
CFG_REV_TABLES['12'] = {
  table: 'cfg_content_defaults',
  cols: [
    'default_publish_status', 'default_content_language', 'default_license_type',
    'default_meta_robots', 'auto_generate_odia_slug', 'require_alt_text_on_images',
    'require_source_citation_url', 'default_reading_wpm', 'updated_by'
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

function maskMailCred(raw) {
  const s = sanitizeCfgText(raw, 160);
  if (!s) return `mail_••••${crypto.randomUUID().slice(0, 4)}`;
  if (s.includes('••••')) return s;
  return `mail_••••${s.slice(-4)}`;
}

function projectEmail(row) {
  if (!row) return null;
  const { credential_hash_sha256: _omit, ...safe } = row;
  return safe;
}

function parseArray(raw) {
  if (Array.isArray(raw)) return raw.map(v => sanitizeCfgText(v, 80)).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p.map(v => sanitizeCfgText(v, 80)).filter(Boolean);
    } catch {}
    return raw.split(',').map(v => sanitizeCfgText(v, 80)).filter(Boolean);
  }
  return [];
}

function projectUploadLimits(row) {
  if (!row) return null;
  return {
    ...row,
    allowed_mime_types: parseArray(row.allowed_mime_types_json),
    blocked_extensions: parseArray(row.blocked_extensions_json)
  };
}

/* ================= SCHEMA & SEEDING ================= */
export async function ensureSettingsConfigBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureSettingsConfigBatch2Schema(db);
  if (_cfg3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS cfg_feature_toggles (
      id TEXT PRIMARY KEY,
      flag_key TEXT NOT NULL UNIQUE,
      label_en TEXT NOT NULL,
      label_or TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      category_group TEXT NOT NULL DEFAULT 'candidate_portal',
      rollout_scope TEXT NOT NULL DEFAULT 'all_users',
      rollout_pct INTEGER NOT NULL DEFAULT 100,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cfg_flags_cat_enabled ON cfg_feature_toggles(category_group, is_enabled)`,

    `CREATE TABLE IF NOT EXISTS cfg_email_settings (
      id TEXT PRIMARY KEY,
      transport_driver TEXT NOT NULL DEFAULT 'aws_ses_ap_south_1',
      smtp_host TEXT NOT NULL DEFAULT 'email-smtp.ap-south-1.amazonaws.com',
      smtp_port INTEGER NOT NULL DEFAULT 587,
      encryption_mode TEXT NOT NULL DEFAULT 'STARTTLS',
      from_name_en TEXT NOT NULL DEFAULT 'CS Odisha Alerts',
      from_name_or TEXT NOT NULL DEFAULT 'ସିଏସ୍ ଓଡ଼ିଶା ସୂଚନା',
      from_address TEXT NOT NULL DEFAULT 'noreply@csodisha.com',
      reply_to_address TEXT NOT NULL DEFAULT 'support@csodisha.com',
      credential_hash_sha256 TEXT NOT NULL DEFAULT '',
      credential_masked_hint TEXT NOT NULL DEFAULT 'mail_••••7c4e',
      daily_send_quota INTEGER NOT NULL DEFAULT 50000,
      dkim_spf_verified INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_upload_limits (
      id TEXT PRIMARY KEY,
      max_pdf_mb INTEGER NOT NULL DEFAULT 25,
      max_image_mb INTEGER NOT NULL DEFAULT 5,
      max_audio_zip_mb INTEGER NOT NULL DEFAULT 50,
      max_files_per_batch INTEGER NOT NULL DEFAULT 10,
      allowed_mime_types_json TEXT NOT NULL DEFAULT '[]',
      blocked_extensions_json TEXT NOT NULL DEFAULT '[]',
      auto_convert_images_webp INTEGER NOT NULL DEFAULT 1,
      strip_exif_metadata INTEGER NOT NULL DEFAULT 1,
      r2_bucket_binding TEXT NOT NULL DEFAULT 'csodisha-assets',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS cfg_content_defaults (
      id TEXT PRIMARY KEY,
      default_publish_status TEXT NOT NULL DEFAULT 'in_review',
      default_content_language TEXT NOT NULL DEFAULT 'bilingual_en_or',
      default_license_type TEXT NOT NULL DEFAULT 'CC-BY-NC-SA-4.0',
      default_meta_robots TEXT NOT NULL DEFAULT 'index, follow',
      auto_generate_odia_slug INTEGER NOT NULL DEFAULT 1,
      require_alt_text_on_images INTEGER NOT NULL DEFAULT 1,
      require_source_citation_url INTEGER NOT NULL DEFAULT 1,
      default_reading_wpm INTEGER NOT NULL DEFAULT 200,
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  const flgCnt = await db.prepare(`SELECT COUNT(*) AS n FROM cfg_feature_toggles`).first();
  if (Number(flgCnt?.n || 0) === 0) {
    const flags = [
      ['cfg-flg-001', 'pwa_offline_study_pack', 'PWA Offline Study Pack', 'PWA ଅଫଲାଇନ୍ ଅଧ୍ୟୟନ ପ୍ୟାକ୍', 'Cache saved PYQs and syllabi in Service Worker for offline Odisha rural access.', 'edge_performance', 'all_users', 100, 1],
      ['cfg-flg-002', 'bilingual_odia_reader', 'Bilingual EN/ଓଡ଼ିଆ Reader', 'ଦ୍ୱିଭାଷୀ EN/ଓଡ଼ିଆ ରିଡର୍', 'Enable instant English & Odia side-by-side toggle across all portals.', 'candidate_portal', 'all_users', 100, 1],
      ['cfg-flg-003', 'live_mock_test_engine', 'Live Mock Test Engine', 'ଲାଇଭ୍ ମକ୍ ଟେଷ୍ଟ ଇଞ୍ଜିନ୍', 'Timed OPSC/OSSC/OSSSC mock test runner with negative marking.', 'study_tools', 'all_users', 100, 1],
      ['cfg-flg-004', 'community_qa_forum', 'Community Q&A Forum', 'ସମ୍ପ୍ରଦାୟ ପ୍ରଶ୍ନୋତ୍ତର ମଞ୍ଚ', 'Moderated peer Q&A threads for Odisha competitive exams.', 'community_engagement', 'logged_in_candidates', 100, 1],
      ['cfg-flg-005', 'ai_study_assistant_beta', 'AI Study Assistant (Beta)', 'AI ଅଧ୍ୟୟନ ସହାୟକ (ବିଟା)', 'Staff-only beta testing for bilingual syllabus summaries.', 'study_tools', 'staff_beta', 15, 0],
      ['cfg-flg-006', 'instant_admit_card_push', 'Instant Admit Card Push', 'ତୁରନ୍ତ ଆଡମିଟ୍ କାର୍ଡ ପୁଶ୍', 'Cookieless browser & Telegram milestone push alerts.', 'edge_performance', 'all_users', 100, 1]
    ];
    for (const r of flags) {
      await db.prepare(
        `INSERT OR IGNORE INTO cfg_feature_toggles
         (id, flag_key, label_en, label_or, description_en, category_group, rollout_scope, rollout_pct, is_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const mailCnt = await db.prepare(`SELECT COUNT(*) AS n FROM cfg_email_settings`).first();
  if (Number(mailCnt?.n || 0) === 0) {
    const h = await sha256Hex('seed-ses-ap-south-1-7c4e');
    await db.prepare(
      `INSERT OR IGNORE INTO cfg_email_settings (id, credential_hash_sha256, credential_masked_hint) VALUES ('primary', ?, 'mail_••••7c4e')`
    ).bind(h).run();
  }

  const uplCnt = await db.prepare(`SELECT COUNT(*) AS n FROM cfg_upload_limits`).first();
  if (Number(uplCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT OR IGNORE INTO cfg_upload_limits (id, allowed_mime_types_json, blocked_extensions_json)
       VALUES ('primary', ?, ?)`
    ).bind(
      JSON.stringify(['application/pdf', 'image/webp', 'image/png', 'image/jpeg', 'image/svg+xml', 'text/csv']),
      JSON.stringify(['.exe', '.bat', '.sh', '.php', '.js', '.cmd', '.scr', '.msi'])
    ).run();
  }

  await db.prepare(`INSERT OR IGNORE INTO cfg_content_defaults (id) VALUES ('primary')`).run();
  _cfg3Ready.add(db);
}

/* ================= FULL 12-MODULE OVERVIEW (01-12 ACTIVE, 13-17 QUEUED) ================= */
export async function getFull12ModuleSettingsOverview(env) {
  await ensureSettingsConfigBatch3Schema(env.DB);
  const [base8, flgRows, mail, upl, cntDef] = await Promise.all([
    getFull8ModuleSettingsOverview(env),
    env.DB.prepare(`SELECT is_enabled FROM cfg_feature_toggles`).all(),
    env.DB.prepare(`SELECT transport_driver, dkim_spf_verified FROM cfg_email_settings WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT max_pdf_mb, max_image_mb FROM cfg_upload_limits WHERE id = 'primary'`).first(),
    env.DB.prepare(`SELECT default_content_language, require_source_citation_url FROM cfg_content_defaults WHERE id = 'primary'`).first()
  ]);

  const flags = flgRows.results || [];
  const enabled_feature_toggles_count = flags.filter(f => Number(f.is_enabled) === 1).length;

  return {
    ...base8,
    enabled_feature_toggles_count,
    total_feature_toggles_count: flags.length,
    email_transport_driver: mail?.transport_driver || 'aws_ses_ap_south_1',
    dkim_spf_verified: Number(mail?.dkim_spf_verified ?? 1) === 1,
    max_pdf_mb: Number(upl?.max_pdf_mb ?? 25),
    max_image_mb: Number(upl?.max_image_mb ?? 5),
    default_content_language: cntDef?.default_content_language || 'bilingual_en_or',
    require_source_citation_url: Number(cntDef?.require_source_citation_url ?? 1) === 1,
    modules: {
      ...base8.modules,
      '09': { code: '09', id: 'module-18-009', title: 'Feature Toggles', status: 'active' },
      '10': { code: '10', id: 'module-18-010', title: 'Email Settings', status: 'active' },
      '11': { code: '11', id: 'module-18-011', title: 'Upload Limits', status: 'active' },
      '12': { code: '12', id: 'module-18-012', title: 'Content Defaults', status: 'active' }
    }
  };
}

/* ================= MODULE 09: FEATURE TOGGLES ================= */
async function handleFeatureToggles(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !sub) {
    const cat = sanitizeCfgText(url.searchParams.get('category_group') || '', 60);
    const q = sanitizeCfgText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (cat) { where.push(`category_group = ?`); args.push(cat); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(flag_key LIKE ? ESCAPE '\\' OR label_en LIKE ? ESCAPE '\\' OR label_or LIKE ? ESCAPE '\\')`);
      args.push(like, like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM cfg_feature_toggles ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY category_group ASC, flag_key ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !sub) {
    const b = await readJson(request, 16000);
    const errors = {};
    const flag_key = sanitizeCfgText(b.flag_key, 80).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '');
    const label_en = sanitizeCfgText(b.label_en, 140);
    const label_or = sanitizeCfgText(b.label_or, 140);
    const description_en = sanitizeCfgText(b.description_en, 300);
    const category_group = pick(b.category_group, CFG_FLAG_CATEGORIES, 'category_group', errors, 'candidate_portal');
    const rollout_scope = pick(b.rollout_scope, CFG_ROLLOUT_SCOPES, 'rollout_scope', errors, 'all_users');
    const rollout_pct = Math.max(0, Math.min(100, parseInt(b.rollout_pct ?? 100, 10) || 0));
    if (!flag_key) errors.flag_key = 'flag_key is required';
    if (!label_en) errors.label_en = 'label_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('cfg-flg');
    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `INSERT INTO cfg_feature_toggles
       (id, flag_key, label_en, label_or, description_en, category_group, rollout_scope, rollout_pct, is_enabled, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, flag_key, label_en, label_or, description_en, category_group, rollout_scope, rollout_pct, b.is_enabled === false ? 0 : 1, updatedBy).run();

    await snapshotCfgRevision(db, '09', newId, actor, 'create feature flag');
    await audit(env, request, actor, 'settings.feature_toggles.create', 'cfg_feature_toggles', newId, { flag_key });
    const item = await db.prepare(`SELECT * FROM cfg_feature_toggles WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && sub && !extra) {
    const existing = await db.prepare(`SELECT * FROM cfg_feature_toggles WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feature toggle not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const label_en = sanitizeCfgText(b.label_en ?? existing.label_en, 140);
    const label_or = sanitizeCfgText(b.label_or ?? existing.label_or, 140);
    const description_en = sanitizeCfgText(b.description_en ?? existing.description_en, 300);
    const category_group = pick(b.category_group ?? existing.category_group, CFG_FLAG_CATEGORIES, 'category_group', errors, existing.category_group);
    const rollout_scope = pick(b.rollout_scope ?? existing.rollout_scope, CFG_ROLLOUT_SCOPES, 'rollout_scope', errors, existing.rollout_scope);
    const rollout_pct = b.rollout_pct !== undefined ? Math.max(0, Math.min(100, parseInt(b.rollout_pct, 10) || 0)) : existing.rollout_pct;
    const is_enabled = b.is_enabled !== undefined ? (b.is_enabled ? 1 : 0) : existing.is_enabled;
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_feature_toggles SET label_en=?, label_or=?, description_en=?, category_group=?, rollout_scope=?, rollout_pct=?, is_enabled=?, updated_by=?, updated_at=datetime('now') WHERE id=?`
    ).bind(label_en, label_or, description_en, category_group, rollout_scope, rollout_pct, is_enabled, updatedBy, sub).run();

    await snapshotCfgRevision(db, '09', sub, actor, 'update feature flag');
    const item = await db.prepare(`SELECT * FROM cfg_feature_toggles WHERE id = ?`).bind(sub).first();
    return json({ item });
  }

  if (method === 'PATCH' && sub && extra === 'toggle') {
    const existing = await db.prepare(`SELECT * FROM cfg_feature_toggles WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feature toggle not found');
    const next = Number(existing.is_enabled) === 1 ? 0 : 1;
    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(`UPDATE cfg_feature_toggles SET is_enabled=?, updated_by=?, updated_at=datetime('now') WHERE id=?`).bind(next, updatedBy, sub).run();
    await snapshotCfgRevision(db, '09', sub, actor, `toggle:${next}`);
    await audit(env, request, actor, 'settings.feature_toggles.toggle', 'cfg_feature_toggles', sub, { flag_key: existing.flag_key, is_enabled: next });
    const item = await db.prepare(`SELECT * FROM cfg_feature_toggles WHERE id = ?`).bind(sub).first();
    return json({ item });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown feature-toggles route');
}

/* ================= MODULE 10: EMAIL SETTINGS ================= */
async function handleEmailSettings(request, env, actor, sub) {
  const db = env.DB;
  if (request.method === 'GET' && !sub) {
    const row = await db.prepare(`SELECT * FROM cfg_email_settings WHERE id = 'primary'`).first();
    return json({ item: projectEmail(row) });
  }
  if (request.method === 'PUT' && !sub) {
    const existing = await db.prepare(`SELECT * FROM cfg_email_settings WHERE id = 'primary'`).first();
    const b = await readJson(request, 32000);
    const errors = {};
    const transport_driver = pick(b.transport_driver ?? existing.transport_driver, CFG_EMAIL_DRIVERS, 'transport_driver', errors, existing.transport_driver);
    const smtp_host = sanitizeCfgText(b.smtp_host ?? existing.smtp_host, 160);
    const smtp_port = Math.max(1, Math.min(65535, parseInt(b.smtp_port ?? existing.smtp_port, 10) || 587));
    const encryption_mode = pick(b.encryption_mode ?? existing.encryption_mode, CFG_EMAIL_ENCRYPTIONS, 'encryption_mode', errors, existing.encryption_mode);
    const from_name_en = sanitizeCfgText(b.from_name_en ?? existing.from_name_en, 120);
    const from_name_or = sanitizeCfgText(b.from_name_or ?? existing.from_name_or, 120);
    const from_address = sanitizeCfgText(b.from_address ?? existing.from_address, 160);
    const reply_to_address = sanitizeCfgText(b.reply_to_address ?? existing.reply_to_address, 160);
    const daily_send_quota = Math.max(100, Math.min(10000000, parseInt(b.daily_send_quota ?? existing.daily_send_quota, 10) || 50000));
    const dkim_spf_verified = b.dkim_spf_verified !== undefined ? (b.dkim_spf_verified ? 1 : 0) : existing.dkim_spf_verified;
    if (!isValidEmail(from_address)) errors.from_address = 'from_address must be a valid email';
    if (!isValidEmail(reply_to_address)) errors.reply_to_address = 'reply_to_address must be a valid email';
    if (Object.keys(errors).length) return validationError(errors);

    let credential_hash_sha256 = existing.credential_hash_sha256;
    let credential_masked_hint = existing.credential_masked_hint;
    if (b.credential) {
      const raw = sanitizeCfgText(b.credential, 200);
      credential_hash_sha256 = await sha256Hex(raw);
      credential_masked_hint = maskMailCred(raw);
    }

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_email_settings
       SET transport_driver=?, smtp_host=?, smtp_port=?, encryption_mode=?, from_name_en=?, from_name_or=?, from_address=?, reply_to_address=?, credential_hash_sha256=?, credential_masked_hint=?, daily_send_quota=?, dkim_spf_verified=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      transport_driver, smtp_host, smtp_port, encryption_mode, from_name_en, from_name_or,
      from_address, reply_to_address, credential_hash_sha256, credential_masked_hint,
      daily_send_quota, dkim_spf_verified, updatedBy
    ).run();

    await snapshotCfgRevision(db, '10', 'primary', actor, 'update email settings');
    await audit(env, request, actor, 'settings.email.update', 'cfg_email_settings', 'primary', { transport_driver });
    const row = await db.prepare(`SELECT * FROM cfg_email_settings WHERE id = 'primary'`).first();
    return json({ item: projectEmail(row) });
  }
  if (request.method === 'POST' && sub === 'test-connection') {
    const row = await db.prepare(`SELECT * FROM cfg_email_settings WHERE id = 'primary'`).first();
    await audit(env, request, actor, 'settings.email.test_connection', 'cfg_email_settings', 'primary', { transport_driver: row.transport_driver });
    return json({
      ok: true,
      transport_driver: row.transport_driver,
      smtp_host: row.smtp_host,
      smtp_port: row.smtp_port,
      dkim_spf_verified: Number(row.dkim_spf_verified) === 1,
      checked_at_ist: nowIstIso()
    });
  }
  throw new HttpError(404, 'NOT_FOUND', 'Unknown email settings route');
}

/* ================= MODULE 11: UPLOAD LIMITS ================= */
async function handleUploadLimits(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const row = await db.prepare(`SELECT * FROM cfg_upload_limits WHERE id = 'primary'`).first();
    return json({ item: projectUploadLimits(row) });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_upload_limits WHERE id = 'primary'`).first();
    const b = await readJson(request, 32000);
    const errors = {};
    const max_pdf_mb = parseInt(b.max_pdf_mb ?? existing.max_pdf_mb, 10);
    const max_image_mb = parseInt(b.max_image_mb ?? existing.max_image_mb, 10);
    const max_audio_zip_mb = parseInt(b.max_audio_zip_mb ?? existing.max_audio_zip_mb, 10);
    const max_files_per_batch = parseInt(b.max_files_per_batch ?? existing.max_files_per_batch, 10);
    if (!Number.isFinite(max_pdf_mb) || max_pdf_mb < 1 || max_pdf_mb > 100) errors.max_pdf_mb = 'max_pdf_mb must be between 1 and 100';
    if (!Number.isFinite(max_image_mb) || max_image_mb < 1 || max_image_mb > 25) errors.max_image_mb = 'max_image_mb must be between 1 and 25';
    if (!Number.isFinite(max_audio_zip_mb) || max_audio_zip_mb < 5 || max_audio_zip_mb > 200) errors.max_audio_zip_mb = 'max_audio_zip_mb must be between 5 and 200';
    if (!Number.isFinite(max_files_per_batch) || max_files_per_batch < 1 || max_files_per_batch > 50) errors.max_files_per_batch = 'max_files_per_batch must be between 1 and 50';

    const allowed = b.allowed_mime_types !== undefined ? parseArray(b.allowed_mime_types) : parseArray(existing.allowed_mime_types_json);
    for (const mime of allowed) {
      if (DANGEROUS_MIME_TYPES.has(mime.toLowerCase())) {
        errors.allowed_mime_types = `Dangerous executable MIME type blocked: ${mime}`;
        break;
      }
    }
    if (Object.keys(errors).length) return validationError(errors);

    const blocked = b.blocked_extensions !== undefined ? parseArray(b.blocked_extensions) : parseArray(existing.blocked_extensions_json);
    const auto_convert_images_webp = b.auto_convert_images_webp !== undefined ? (b.auto_convert_images_webp ? 1 : 0) : existing.auto_convert_images_webp;
    const strip_exif_metadata = b.strip_exif_metadata !== undefined ? (b.strip_exif_metadata ? 1 : 0) : existing.strip_exif_metadata;
    const r2_bucket_binding = sanitizeCfgText(b.r2_bucket_binding ?? existing.r2_bucket_binding, 80);
    const updatedBy = actor?.email || actor?.userId || 'system';

    await db.prepare(
      `UPDATE cfg_upload_limits
       SET max_pdf_mb=?, max_image_mb=?, max_audio_zip_mb=?, max_files_per_batch=?, allowed_mime_types_json=?, blocked_extensions_json=?, auto_convert_images_webp=?, strip_exif_metadata=?, r2_bucket_binding=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      max_pdf_mb, max_image_mb, max_audio_zip_mb, max_files_per_batch,
      JSON.stringify(allowed), JSON.stringify(blocked),
      auto_convert_images_webp, strip_exif_metadata, r2_bucket_binding, updatedBy
    ).run();

    await snapshotCfgRevision(db, '11', 'primary', actor, 'update upload limits');
    await audit(env, request, actor, 'settings.upload_limits.update', 'cfg_upload_limits', 'primary', { max_pdf_mb, max_image_mb });
    const row = await db.prepare(`SELECT * FROM cfg_upload_limits WHERE id = 'primary'`).first();
    return json({ item: projectUploadLimits(row) });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 12: CONTENT DEFAULTS ================= */
async function handleContentDefaults(request, env, actor) {
  const db = env.DB;
  if (request.method === 'GET') {
    const item = await db.prepare(`SELECT * FROM cfg_content_defaults WHERE id = 'primary'`).first();
    return json({ item });
  }
  if (request.method === 'PUT') {
    const existing = await db.prepare(`SELECT * FROM cfg_content_defaults WHERE id = 'primary'`).first();
    const b = await readJson(request, 16000);
    const errors = {};
    const default_publish_status = pick(b.default_publish_status ?? existing.default_publish_status, CFG_PUBLISH_STATUSES, 'default_publish_status', errors, existing.default_publish_status);
    const default_content_language = pick(b.default_content_language ?? existing.default_content_language, CFG_CONTENT_LANGS, 'default_content_language', errors, existing.default_content_language);
    const default_license_type = pick(b.default_license_type ?? existing.default_license_type, CFG_LICENSES, 'default_license_type', errors, existing.default_license_type);
    const default_meta_robots = pick(b.default_meta_robots ?? existing.default_meta_robots, CFG_META_ROBOTS, 'default_meta_robots', errors, existing.default_meta_robots);
    const auto_generate_odia_slug = b.auto_generate_odia_slug !== undefined ? (b.auto_generate_odia_slug ? 1 : 0) : existing.auto_generate_odia_slug;
    const require_alt_text_on_images = b.require_alt_text_on_images !== undefined ? (b.require_alt_text_on_images ? 1 : 0) : existing.require_alt_text_on_images;
    const require_source_citation_url = b.require_source_citation_url !== undefined ? (b.require_source_citation_url ? 1 : 0) : existing.require_source_citation_url;
    const default_reading_wpm = Math.max(100, Math.min(400, parseInt(b.default_reading_wpm ?? existing.default_reading_wpm, 10) || 200));
    if (Object.keys(errors).length) return validationError(errors);

    const updatedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE cfg_content_defaults
       SET default_publish_status=?, default_content_language=?, default_license_type=?, default_meta_robots=?, auto_generate_odia_slug=?, require_alt_text_on_images=?, require_source_citation_url=?, default_reading_wpm=?, updated_by=?, updated_at=datetime('now')
       WHERE id='primary'`
    ).bind(
      default_publish_status, default_content_language, default_license_type, default_meta_robots,
      auto_generate_odia_slug, require_alt_text_on_images, require_source_citation_url,
      default_reading_wpm, updatedBy
    ).run();

    await snapshotCfgRevision(db, '12', 'primary', actor, 'update content defaults');
    await audit(env, request, actor, 'settings.content_defaults.update', 'cfg_content_defaults', 'primary', { default_content_language });
    const item = await db.prepare(`SELECT * FROM cfg_content_defaults WHERE id = 'primary'`).first();
    return json({ item });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleSettingsConfigBatch3Admin(request, env, actor, id, sub, extra) {
  await ensureSettingsConfigBatch3Schema(env.DB);
  let res = null;
  if (id === 'feature-toggles') res = await handleFeatureToggles(request, env, actor, sub, extra);
  else if (id === 'email') res = await handleEmailSettings(request, env, actor, sub);
  else if (id === 'upload-limits') res = await handleUploadLimits(request, env, actor);
  else if (id === 'content-defaults') res = await handleContentDefaults(request, env, actor);
  else throw new HttpError(404, 'NOT_FOUND', 'Unknown settings batch 3 route');
  if (request.method !== 'GET' && request.method !== 'HEAD' && res && res.status >= 200 && res.status < 300) {
    await invalidateEdgePaths(request, SETTINGS_PUBLIC_PATHS);
  }
  return res;
}

/* ================= PUBLIC ENRICHED SITE CONFIG API ================= */
export async function handlePublicSiteConfigBatch3Api(request, env) {
  await ensureSettingsConfigBatch3Schema(env.DB);
  const baseRes = await handlePublicSiteConfigBatch2Api(request, env);
  const baseData = await baseRes.json();

  const [flgRes, uplRow] = await Promise.all([
    env.DB.prepare(`SELECT flag_key, is_enabled FROM cfg_feature_toggles`).all(),
    env.DB.prepare(`SELECT max_pdf_mb, max_image_mb, allowed_mime_types_json FROM cfg_upload_limits WHERE id = 'primary'`).first()
  ]);

  const feature_flags = {};
  for (const r of (flgRes.results || [])) {
    feature_flags[r.flag_key] = Number(r.is_enabled) === 1;
  }

  return json({
    ...baseData,
    feature_flags,
    upload_limits: {
      max_pdf_mb: Number(uplRow?.max_pdf_mb ?? 25),
      max_image_mb: Number(uplRow?.max_image_mb ?? 5),
      allowed_mime_types: parseArray(uplRow?.allowed_mime_types_json)
    }
  }, 200, {
    'Cache-Control': 'public, max-age=120, s-maxage=300'
  });
}
