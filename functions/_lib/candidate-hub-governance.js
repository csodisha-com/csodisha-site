// v244 Candidate Hub, Governance & Dashboard UI/Feature Studio
// Unified D1 backend for:
//  - Candidate access enforcement (block/suspend + session_version revocation)
//  - Candidate Hub config, eligibility matcher, workspace sync & profile update (/api/candidate/*)
//  - Admin Roster & 360° Governance, Dashboard UI Manager, Custom Feature Builder,
//    Targeted Content Provisioning & Document Vault Templates (/api/admin/candidates & /api/admin/candidate-hub/*)
import { HttpError, json, errorResponse, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape, parsePaging } from './validate.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';
import { getCandidateControls, logCandidateAudit, normalizePermissions, ACCOUNT_STATUSES as LEGACY_STATUSES, NOTICE_LEVELS } from './candidate-controls.js';
import { getSessionFromRequest } from '../api/auth/_utils.js';
import { getMatchingDistrictAssignments } from '../api/admin/candidate-ops.js';

export const GOV_STATUSES = ['active', 'blocked', 'suspended', 'pending_review'];
export const ACCESS_TIERS = ['standard', 'verified', 'mentor', 'pro_member', 'permanent_member', 'vip'];
export const TIER_RANK = { standard: 0, verified: 1, mentor: 2, pro_member: 3, permanent_member: 4, vip: 5 };
export const MODULE_TYPES = ['core', 'custom_feature', 'custom_tool', 'custom_checklist', 'custom_resource_hub', 'custom_announcement'];
export const LAYOUT_SLOTS = ['sidebar', 'overview', 'both'];
export const CARD_SPANS = ['half', 'full'];
export const LAYOUT_MODES = ['sidebar_workspace', 'top_tabs_cards'];
export const ALLOWED_THEMES = ['system', 'dark', 'reading', 'utkal-bharat'];
export const TARGET_SCOPES = ['all', 'user', 'individual', 'selected_users', 'district', 'exam_board'];
export const ASSIGNED_ITEM_TYPES = ['study_pack', 'study_pdf', 'mock_test', 'official_notice', 'admit_card_alert', 'personal_guidance', 'fee_waiver', 'action_alert', 'guidance'];
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const HUB_CACHE_PATHS = ['/api/candidate/hub-config', '/api/candidate/assigned-items'];

let _schemaReady = false;

export async function ensureCandidateHubSchema(db) {
  if (!db || _schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS candidate_hub_modules (
      id TEXT PRIMARY KEY,
      module_key TEXT UNIQUE NOT NULL,
      title_en TEXT NOT NULL DEFAULT '',
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '📌',
      module_type TEXT NOT NULL DEFAULT 'core',
      layout_slot TEXT NOT NULL DEFAULT 'both',
      card_span TEXT NOT NULL DEFAULT 'half',
      accent_variant TEXT NOT NULL DEFAULT 'primary',
      required_access_tier TEXT NOT NULL DEFAULT 'standard',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      config_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS candidate_hub_ui_config (
      id TEXT PRIMARY KEY,
      hero_title_en TEXT NOT NULL DEFAULT 'Candidate Workspace',
      hero_title_or TEXT NOT NULL DEFAULT 'ପ୍ରାର୍ଥୀ କାର୍ଯ୍ୟକ୍ଷେତ୍ର',
      hero_subtitle_en TEXT NOT NULL DEFAULT 'Personalised hub for Odisha exams, schemes, documents & assigned study resources',
      hero_subtitle_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ପରୀକ୍ଷା, ଯୋଜନା, କାଗଜପତ୍ର ଓ ଅଧ୍ୟୟନ ସାମଗ୍ରୀର ବ୍ୟକ୍ତିଗତ କେନ୍ଦ୍ର',
      announcement_banner_en TEXT NOT NULL DEFAULT '',
      announcement_banner_or TEXT NOT NULL DEFAULT '',
      announcement_type TEXT NOT NULL DEFAULT 'info',
      show_announcement INTEGER NOT NULL DEFAULT 0,
      layout_mode TEXT NOT NULL DEFAULT 'sidebar_workspace',
      grid_columns INTEGER NOT NULL DEFAULT 2,
      default_theme TEXT NOT NULL DEFAULT 'system',
      allow_theme_switch INTEGER NOT NULL DEFAULT 1,
      show_quick_stats INTEGER NOT NULL DEFAULT 1,
      show_sidebar INTEGER NOT NULL DEFAULT 1,
      custom_empty_title_en TEXT NOT NULL DEFAULT 'Your workspace is clean — save items from published sections or add modules in Admin Studio.',
      custom_empty_title_or TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS candidate_doc_templates (
      id TEXT PRIMARY KEY,
      doc_key TEXT UNIQUE NOT NULL,
      title_en TEXT NOT NULL DEFAULT '',
      title_or TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'identity',
      notes_en TEXT NOT NULL DEFAULT '',
      notes_or TEXT NOT NULL DEFAULT '',
      is_required INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS candidate_governance (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      account_status TEXT NOT NULL DEFAULT 'active',
      block_reason TEXT NOT NULL DEFAULT '',
      access_tier TEXT NOT NULL DEFAULT 'standard',
      granted_modules_json TEXT NOT NULL DEFAULT '{}',
      session_version INTEGER NOT NULL DEFAULT 1,
      admin_notes TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS candidate_assigned_items (
      id TEXT PRIMARY KEY,
      target_scope TEXT NOT NULL DEFAULT 'all',
      target_user_id TEXT NOT NULL DEFAULT '',
      target_district TEXT NOT NULL DEFAULT '',
      target_exam_board TEXT NOT NULL DEFAULT '',
      item_type TEXT NOT NULL DEFAULT 'study_pdf',
      title_en TEXT NOT NULL DEFAULT '',
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      resource_url TEXT NOT NULL DEFAULT '',
      r2_file_key TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal',
      expires_at TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS candidate_assigned_acks (
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      seen_at TEXT NOT NULL DEFAULT '',
      downloaded_at TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (item_id, user_id)
    )`)
  ]);
  _schemaReady = true;
}

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : fallback;
  } catch {
    return fallback;
  }
}

function safeHref(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s === '#' || s.startsWith('/') || s.startsWith('#')) return s.slice(0, 600);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 600);
}

const DISTRICT_ALIASES = {
  'balasore (baleswar)': 'Balasore',
  baleswar: 'Balasore',
  balasore: 'Balasore',
  khurda: 'Khordha',
  khordha: 'Khordha',
  sonepur: 'Subarnapur',
  subarnapur: 'Subarnapur',
  nowrangpur: 'Nabarangpur',
  nabarangpur: 'Nabarangpur',
  jajapur: 'Jajpur',
  jajpur: 'Jajpur',
  keonjhar: 'Kendujhar',
  kendujhar: 'Kendujhar',
  bolangir: 'Balangir',
  balangir: 'Balangir'
};

const DISTRICT_REVERSE_ALIASES = {
  Balasore: ['Balasore', 'Balasore (Baleswar)', 'Baleswar'],
  Khordha: ['Khordha', 'Khurda'],
  Subarnapur: ['Subarnapur', 'Sonepur'],
  Nabarangpur: ['Nabarangpur', 'Nowrangpur'],
  Jajpur: ['Jajpur', 'Jajapur'],
  Kendujhar: ['Kendujhar', 'Keonjhar'],
  Balangir: ['Balangir', 'Bolangir']
};

export function normalizeOdishaDistrict(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const mapped = DISTRICT_ALIASES[s.toLowerCase()];
  return mapped || s;
}

const EXAM_SLUG_LABELS = {
  'ugc-net': 'UGC NET',
  'odisha-bed': 'Odisha B.Ed',
  'b-ed': 'B.Ed',
  opsc: 'OPSC',
  ossc: 'OSSC',
  osssc: 'OSSSC',
  oavs: 'OAVS',
  otet: 'OTET',
  osstet: 'OSSTET',
  ctet: 'CTET',
  upsc: 'UPSC',
  ssc: 'SSC',
  'bse-odisha': 'BSE Odisha',
  chse: 'CHSE',
  banking: 'Banking',
  railways: 'Railways'
};

export function formatTargetExamLabel(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (EXAM_SLUG_LABELS[lower]) return EXAM_SLUG_LABELS[lower];
  if (!s.includes('-') && !s.includes('_')) return s;
  return s.split(/[-_]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function makeKey(raw, prefix = 'custom') {
  const slug = String(raw || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
  return slug || `${prefix}_${Date.now().toString(36)}`;
}

async function safeFirst(db, sql, binds = []) {
  try { return await db.prepare(sql).bind(...binds).first(); } catch { return null; }
}
async function safeAll(db, sql, binds = []) {
  try { const r = await db.prepare(sql).bind(...binds).all(); return r.results || []; } catch { return []; }
}

function formatModule(r) {
  return {
    id: String(r.id),
    module_key: String(r.module_key),
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    subtitle_en: String(r.subtitle_en || ''),
    subtitle_or: String(r.subtitle_or || ''),
    icon: String(r.icon || '📌'),
    module_type: MODULE_TYPES.includes(r.module_type) ? r.module_type : 'custom_feature',
    layout_slot: LAYOUT_SLOTS.includes(r.layout_slot) ? r.layout_slot : 'both',
    card_span: CARD_SPANS.includes(r.card_span) ? r.card_span : 'half',
    accent_variant: String(r.accent_variant || 'primary'),
    required_access_tier: ACCESS_TIERS.includes(r.required_access_tier) ? r.required_access_tier : 'standard',
    sort_order: Number(r.sort_order || 0),
    is_enabled: r.is_enabled ? 1 : 0,
    config: parseJson(r.config_json, {}),
    updated_at: String(r.updated_at || '')
  };
}

function defaultUiConfig() {
  return {
    id: 'default',
    hero_title_en: 'Candidate Workspace',
    hero_title_or: 'ପ୍ରାର୍ଥୀ କାର୍ଯ୍ୟକ୍ଷେତ୍ର',
    hero_subtitle_en: 'Personalised hub for Odisha exams, schemes, documents & assigned study resources',
    hero_subtitle_or: 'ଓଡ଼ିଶା ପରୀକ୍ଷା, ଯୋଜନା, କାଗଜପତ୍ର ଓ ଅଧ୍ୟୟନ ସାମଗ୍ରୀର ବ୍ୟକ୍ତିଗତ କେନ୍ଦ୍ର',
    announcement_banner_en: '',
    announcement_banner_or: '',
    announcement_type: 'info',
    show_announcement: 0,
    layout_mode: 'sidebar_workspace',
    grid_columns: 2,
    default_theme: 'system',
    allow_theme_switch: 1,
    show_quick_stats: 1,
    show_sidebar: 1,
    custom_empty_title_en: 'Your workspace is clean — save items from published sections or add modules in Admin Studio.',
    custom_empty_title_or: '',
    updated_at: ''
  };
}

function formatUiConfig(r) {
  if (!r) return defaultUiConfig();
  return {
    id: String(r.id || 'default'),
    hero_title_en: String(r.hero_title_en || 'Candidate Workspace'),
    hero_title_or: String(r.hero_title_or || ''),
    hero_subtitle_en: String(r.hero_subtitle_en || ''),
    hero_subtitle_or: String(r.hero_subtitle_or || ''),
    announcement_banner_en: String(r.announcement_banner_en || ''),
    announcement_banner_or: String(r.announcement_banner_or || ''),
    announcement_type: ['info', 'success', 'warning'].includes(r.announcement_type) ? r.announcement_type : 'info',
    show_announcement: r.show_announcement ? 1 : 0,
    layout_mode: LAYOUT_MODES.includes(r.layout_mode) ? r.layout_mode : 'sidebar_workspace',
    grid_columns: [1, 2, 3].includes(Number(r.grid_columns)) ? Number(r.grid_columns) : 2,
    default_theme: ALLOWED_THEMES.includes(r.default_theme) ? r.default_theme : 'system',
    allow_theme_switch: r.allow_theme_switch === 0 ? 0 : 1,
    show_quick_stats: r.show_quick_stats === 0 ? 0 : 1,
    show_sidebar: r.show_sidebar === 0 ? 0 : 1,
    custom_empty_title_en: String(r.custom_empty_title_en || 'Your workspace is clean — save items from published sections or add modules in Admin Studio.'),
    custom_empty_title_or: String(r.custom_empty_title_or || ''),
    updated_at: String(r.updated_at || '')
  };
}

function formatDocTemplate(r) {
  return {
    id: String(r.id),
    doc_key: String(r.doc_key),
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    category: String(r.category || 'identity'),
    notes_en: String(r.notes_en || ''),
    notes_or: String(r.notes_or || ''),
    is_required: r.is_required ? 1 : 0,
    sort_order: Number(r.sort_order || 0),
    is_published: r.is_published ? 1 : 0,
    updated_at: String(r.updated_at || '')
  };
}

function inferFileExt(url, key) {
  const s = String(key || url || '').split('?')[0].split('#')[0];
  const m = s.match(/\.([a-z0-9]{1,8})$/i);
  return m ? m[1].toUpperCase() : '';
}

function formatAssignedItem(r) {
  const url = String(r.resource_url || '');
  const r2Key = String(r.r2_file_key || '');
  return {
    id: String(r.id),
    target_scope: TARGET_SCOPES.includes(r.target_scope) ? r.target_scope : 'all',
    target_user_id: String(r.target_user_id || ''),
    target_district: normalizeOdishaDistrict(r.target_district || ''),
    target_exam_board: String(r.target_exam_board || ''),
    item_type: ASSIGNED_ITEM_TYPES.includes(r.item_type) ? r.item_type : 'study_pdf',
    title_en: String(r.title_en || ''),
    title_or: String(r.title_or || ''),
    summary_en: String(r.summary_en || ''),
    summary_or: String(r.summary_or || ''),
    resource_url: url,
    r2_file_key: r2Key,
    file_ext: inferFileExt(url, r2Key),
    file_size_bytes: Number(r.file_size_bytes || 0),
    priority: PRIORITIES.includes(r.priority) ? r.priority : 'normal',
    expires_at: String(r.expires_at || ''),
    is_published: r.is_published ? 1 : 0,
    seen_count: Number(r.seen_count || 0),
    download_count: Number(r.download_count || 0),
    completed_count: Number(r.completed_count || 0),
    seen: Boolean(r.user_seen_at),
    downloaded: Boolean(r.user_downloaded_at),
    completed: Boolean(r.user_completed),
    created_by: String(r.created_by || ''),
    created_at: String(r.created_at || '')
  };
}

// =========================================================================
// 1. SHARED ACCESS & SESSION ENFORCEMENT
// =========================================================================
export async function getCandidateGovernance(env, userId, email = '') {
  const defaults = {
    user_id: userId,
    email: email || '',
    account_status: 'active',
    block_reason: '',
    access_tier: 'standard',
    granted_modules: {},
    session_version: 1,
    admin_notes: '',
    updated_by: '',
    updated_at: ''
  };
  if (!env || !env.DB || !userId) return defaults;
  await ensureCandidateHubSchema(env.DB);
  const [gov, legacy] = await Promise.all([
    safeFirst(env.DB, 'SELECT * FROM candidate_governance WHERE user_id = ?', [userId]),
    getCandidateControls(env, userId).catch(() => null)
  ]);

  let status = gov && GOV_STATUSES.includes(gov.account_status) ? gov.account_status : 'active';
  let reason = gov && gov.block_reason ? String(gov.block_reason) : '';
  let sessionVersion = gov ? Number(gov.session_version || 1) : 1;

  if (legacy) {
    if (status === 'active' && (legacy.account_status === 'banned' || legacy.account_status === 'suspended')) {
      status = legacy.account_status === 'banned' ? 'blocked' : 'suspended';
      if (!reason && legacy.restriction_reason) reason = legacy.restriction_reason;
    }
    if (legacy.session_version > sessionVersion) sessionVersion = legacy.session_version;
  }

  return {
    user_id: userId,
    email: (gov && gov.email) || email || '',
    account_status: status,
    block_reason: reason,
    access_tier: gov && ACCESS_TIERS.includes(gov.access_tier) ? gov.access_tier : 'standard',
    granted_modules: gov ? parseJson(gov.granted_modules_json, {}) : {},
    session_version: sessionVersion,
    admin_notes: (gov && gov.admin_notes) || '',
    updated_by: (gov && gov.updated_by) || (legacy && legacy.updated_by) || '',
    updated_at: (gov && gov.updated_at) || (legacy && legacy.updated_at) || ''
  };
}

export async function enforceCandidateAccess(env, sessionOrUserId, { sessionVersion = null } = {}) {
  const userId = typeof sessionOrUserId === 'string' ? sessionOrUserId : (sessionOrUserId && sessionOrUserId.userId);
  const email = typeof sessionOrUserId === 'object' && sessionOrUserId ? (sessionOrUserId.email || '') : '';
  const sessVer = sessionVersion !== null
    ? sessionVersion
    : (typeof sessionOrUserId === 'object' && sessionOrUserId && sessionOrUserId.sessionVersion !== undefined
      ? Number(sessionOrUserId.sessionVersion) : null);

  if (!userId) throw new HttpError(401, 'UNAUTHENTICATED', 'Candidate sign-in required.');
  const gov = await getCandidateGovernance(env, userId, email);

  if (gov.account_status === 'blocked' || gov.account_status === 'suspended') {
    throw new HttpError(
      403,
      'ACCOUNT_RESTRICTED',
      gov.block_reason || `Your account is currently ${gov.account_status}. Please contact CS Odisha support.`,
      {
        restricted: true,
        account_status: gov.account_status,
        block_reason: gov.block_reason || `Account is ${gov.account_status}.`
      }
    );
  }

  if (sessVer !== null && Number.isFinite(sessVer) && sessVer < gov.session_version) {
    throw new HttpError(401, 'SESSION_REVOKED', 'Your session has been revoked by an administrator. Please sign in again.');
  }

  return gov;
}

export function canCandidateAccessModule(mod, accessTier, grantedModules = {}) {
  if (!mod || !mod.is_enabled) return false;
  const overrides = grantedModules && typeof grantedModules === 'object' ? grantedModules : {};
  if (Object.prototype.hasOwnProperty.call(overrides, mod.module_key)) {
    return Boolean(overrides[mod.module_key]);
  }
  const candRank = TIER_RANK[accessTier] !== undefined ? TIER_RANK[accessTier] : 0;
  const reqRank = TIER_RANK[mod.required_access_tier] !== undefined ? TIER_RANK[mod.required_access_tier] : 0;
  return candRank >= reqRank;
}

// =========================================================================
// 2. CANDIDATE-FACING APIs (/api/candidate/*)
// =========================================================================
export async function requireCandidateSession(request, env) {
  const session = await getSessionFromRequest(request, env);
  if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Unauthorized: Missing or invalid candidate session');
  const headerVer = request.headers.get('X-CSO-Session-Version');
  const sessionVersion = headerVer ? Number(headerVer) : null;
  const gov = await enforceCandidateAccess(env, session, { sessionVersion });
  return { session, gov };
}

function restrictedResponse(e) {
  if (e instanceof HttpError && e.status === 403 && e.code === 'ACCOUNT_RESTRICTED') {
    return json({
      ok: false,
      restricted: true,
      code: e.code,
      error: e.message,
      account_status: e.extra.account_status,
      block_reason: e.extra.block_reason
    }, 403);
  }
  return errorResponse(e);
}

async function loadCandidateProfile(db, userId, email) {
  const [cand, prefs] = await Promise.all([
    safeFirst(db, 'SELECT id, full_name, email, phone, district, target_streams, last_login_at, created_at FROM candidates WHERE id = ? OR email = ? LIMIT 1', [userId, email]),
    safeFirst(db, 'SELECT domain_slug, track_slug, primary_exam, selected_exams_json, selected_streams_json, updated_at FROM candidate_exam_preferences WHERE user_id = ?', [userId])
  ]);
  const extra = prefs ? parseJson(prefs.selected_streams_json, {}) : {};
  const streams = cand ? parseJson(cand.target_streams, []) : [];
  const selectedExams = prefs ? parseJson(prefs.selected_exams_json, []) : [];
  return {
    id: userId,
    email: email || (cand && cand.email) || '',
    fullName: (cand && cand.full_name) || 'Candidate',
    phone: (cand && cand.phone) || '',
    district: (cand && cand.district) || '',
    qualification: String(extra.qualification || ''),
    category: String(extra.category || 'UR'),
    age: extra.age ? Number(extra.age) : null,
    dob: String(extra.dob || ''),
    gender: String(extra.gender || ''),
    primaryExam: (prefs && prefs.primary_exam) || (Array.isArray(selectedExams) && selectedExams[0]) || (Array.isArray(streams) && streams[0]) || '',
    selectedExams: Array.isArray(selectedExams) ? selectedExams : [],
    targetStreams: Array.isArray(streams) ? streams : []
  };
}

function filterAssignedItemsForCandidate(assignedRows, ackRows, profile, userId) {
  const nowIso = new Date().toISOString().slice(0, 10);
  const candDist = normalizeOdishaDistrict(profile.district).trim().toLowerCase();
  const candBoards = new Set([profile.primaryExam, ...profile.selectedExams, ...profile.targetStreams].map(s => String(s || '').trim().toLowerCase()).filter(Boolean));
  const ackMap = new Map((ackRows || []).map(a => [a.item_id, a]));

  return assignedRows.map(r => {
    const ack = ackMap.get(r.id);
    return formatAssignedItem({
      ...r,
      user_seen_at: ack ? ack.seen_at : '',
      user_downloaded_at: ack ? ack.downloaded_at : '',
      user_completed: ack ? ack.completed : 0
    });
  }).filter(item => {
    if (item.expires_at && item.expires_at < nowIso) return false;
    if (item.target_scope === 'all') return true;
    if (item.target_scope === 'user' || item.target_scope === 'individual') return item.target_user_id === userId;
    if (item.target_scope === 'district') return Boolean(candDist && item.target_district.trim().toLowerCase() === candDist);
    if (item.target_scope === 'exam_board') {
      const b = item.target_exam_board.trim().toLowerCase();
      return Boolean(b && [...candBoards].some(cb => cb === b || cb.includes(b) || b.includes(cb)));
    }
    return false;
  });
}

export async function handleCandidateHubConfigApi(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    await ensureCandidateHubSchema(env.DB);
    const { session, gov } = await requireCandidateSession(request, env);
    const profile = await loadCandidateProfile(env.DB, session.userId, session.email);

    const [uiRow, modRows, docRows, assignedRows, ackRows, controls] = await Promise.all([
      safeFirst(env.DB, "SELECT * FROM candidate_hub_ui_config WHERE id = 'default'"),
      safeAll(env.DB, 'SELECT * FROM candidate_hub_modules WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC'),
      safeAll(env.DB, 'SELECT * FROM candidate_doc_templates WHERE is_published = 1 ORDER BY sort_order ASC, id ASC'),
      safeAll(env.DB, `SELECT cai.*, COALESCE(mf.file_size_bytes, 0) AS file_size_bytes
                       FROM candidate_assigned_items cai
                       LEFT JOIN media_files mf ON (mf.r2_key = cai.r2_file_key OR mf.id = cai.r2_file_key) AND cai.r2_file_key != ''
                       WHERE cai.is_published = 1 ORDER BY cai.created_at DESC LIMIT 200`),
      safeAll(env.DB, 'SELECT item_id, seen_at, downloaded_at, completed FROM candidate_assigned_acks WHERE user_id = ?', [session.userId]),
      getCandidateControls(env, session.userId).catch(() => null)
    ]);

    const modules = modRows.map(formatModule).filter(m => canCandidateAccessModule(m, gov.access_tier, gov.granted_modules));
    const legacyAssigned = filterAssignedItemsForCandidate(assignedRows, ackRows, profile, session.userId);
    const districtAssignments = await getMatchingDistrictAssignments(env.DB, {
      district: profile.district,
      examGoals: [profile.primaryExam, ...profile.selectedExams, ...profile.targetStreams]
    });
    const ackMap = new Map((ackRows || []).map(a => [a.item_id, a]));
    const enrichedDistrictAssignments = districtAssignments.map(it => {
      const ack = ackMap.get(it.id);
      return {
        ...it,
        seen: Boolean(ack && ack.seen_at),
        downloaded: Boolean(ack && ack.downloaded_at),
        completed: Boolean(ack && ack.completed)
      };
    });
    const assignedItems = [...enrichedDistrictAssignments, ...legacyAssigned];

    return json({
      ok: true,
      ui_config: formatUiConfig(uiRow),
      modules,
      doc_templates: docRows.map(formatDocTemplate),
      assigned_items: assignedItems,
      profile,
      governance: {
        account_status: gov.account_status,
        access_tier: gov.access_tier,
        session_version: gov.session_version
      },
      controls: controls ? {
        admin_notice_text: controls.admin_notice_text,
        admin_notice_level: controls.admin_notice_level,
        permissions: controls.permissions
      } : {}
    });
  } catch (e) {
    return restrictedResponse(e);
  }
}

export async function handleCandidateAssignedItemsApi(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    await ensureCandidateHubSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    const profile = await loadCandidateProfile(env.DB, session.userId, session.email);
    const [assignedRows, ackRows] = await Promise.all([
      safeAll(env.DB, `SELECT cai.*, COALESCE(mf.file_size_bytes, 0) AS file_size_bytes
                       FROM candidate_assigned_items cai
                       LEFT JOIN media_files mf ON (mf.r2_key = cai.r2_file_key OR mf.id = cai.r2_file_key) AND cai.r2_file_key != ''
                       WHERE cai.is_published = 1 ORDER BY cai.created_at DESC LIMIT 200`),
      safeAll(env.DB, 'SELECT item_id, seen_at, downloaded_at, completed FROM candidate_assigned_acks WHERE user_id = ?', [session.userId])
    ]);
    const legacyItems = filterAssignedItemsForCandidate(assignedRows, ackRows, profile, session.userId);
    const districtAssignments = await getMatchingDistrictAssignments(env.DB, {
      district: profile.district,
      examGoals: [profile.primaryExam, ...profile.selectedExams, ...profile.targetStreams]
    });
    const ackMap = new Map((ackRows || []).map(a => [a.item_id, a]));
    const enrichedDistrict = districtAssignments.map(it => {
      const ack = ackMap.get(it.id);
      return {
        ...it,
        seen: Boolean(ack && ack.seen_at),
        downloaded: Boolean(ack && ack.downloaded_at),
        completed: Boolean(ack && ack.completed)
      };
    });
    return json({ ok: true, items: [...enrichedDistrict, ...legacyItems] });
  } catch (e) {
    return restrictedResponse(e);
  }
}

export async function handleCandidateAssignedAckApi(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    await ensureCandidateHubSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    const body = await readJson(request, 5000);
    const itemId = cleanStr(body.item_id, 120);
    const action = cleanStr(body.action || 'seen', 30);
    if (!itemId) throw validationError({ item_id: 'item_id is required.' });
    if (!['seen', 'download', 'complete', 'uncomplete'].includes(action)) {
      throw validationError({ action: 'action must be seen, download, complete, or uncomplete.' });
    }
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    if (action === 'seen') {
      await env.DB.prepare(
        `INSERT INTO candidate_assigned_acks (item_id, user_id, seen_at, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(item_id, user_id) DO UPDATE SET
           seen_at = CASE WHEN candidate_assigned_acks.seen_at = '' THEN excluded.seen_at ELSE candidate_assigned_acks.seen_at END,
           updated_at = datetime('now')`
      ).bind(itemId, session.userId, now).run();
    } else if (action === 'download') {
      await env.DB.prepare(
        `INSERT INTO candidate_assigned_acks (item_id, user_id, seen_at, downloaded_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(item_id, user_id) DO UPDATE SET
           seen_at = CASE WHEN candidate_assigned_acks.seen_at = '' THEN excluded.seen_at ELSE candidate_assigned_acks.seen_at END,
           downloaded_at = excluded.downloaded_at,
           updated_at = datetime('now')`
      ).bind(itemId, session.userId, now, now).run();
    } else {
      const done = action === 'complete' ? 1 : 0;
      await env.DB.prepare(
        `INSERT INTO candidate_assigned_acks (item_id, user_id, seen_at, completed, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(item_id, user_id) DO UPDATE SET
           seen_at = CASE WHEN candidate_assigned_acks.seen_at = '' THEN excluded.seen_at ELSE candidate_assigned_acks.seen_at END,
           completed = excluded.completed,
           updated_at = datetime('now')`
      ).bind(itemId, session.userId, now, done).run();
    }
    const row = await safeFirst(env.DB, 'SELECT * FROM candidate_assigned_acks WHERE item_id = ? AND user_id = ?', [itemId, session.userId]);
    return json({ ok: true, item_id: itemId, action, ack: row || null });
  } catch (e) {
    return restrictedResponse(e);
  }
}

// Smart Eligibility & Odisha Age-Relaxation Matcher against live D1 Jobs & Schemes
const ODISHA_AGE_RELAXATION = { UR: 0, EWS: 0, SEBC: 5, SC: 5, ST: 5, WOMEN: 5, PWBD: 10, EX_SERVICEMEN: 5 };

export async function handleCandidateMatchesApi(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    const { session } = await requireCandidateSession(request, env);
    const profile = await loadCandidateProfile(env.DB, session.userId, session.email);
    const url = new URL(request.url);
    const qual = cleanStr(url.searchParams.get('qualification') || profile.qualification, 60).toLowerCase();
    const cat = cleanStr(url.searchParams.get('category') || profile.category || 'UR', 20).toUpperCase();
    const age = Number(url.searchParams.get('age') || profile.age || 0);
    const dist = cleanStr(url.searchParams.get('district') || profile.district, 60).toLowerCase();
    const relax = ODISHA_AGE_RELAXATION[cat] || 0;
    const effectiveMaxAge = 38 + relax; // Standard Odisha Group-B/C upper limit + category relaxation

    const [jobs, jobArticles, schemes, schemeArticles, studyArticles] = await Promise.all([
      safeAll(env.DB, "SELECT id, title, title_or, slug, recruiting_body, qualification_tag, vacancies, deadline_date, official_apply_url, summary, state_location, age_limit_relaxation FROM jobs_directory_items WHERE status = 'published' ORDER BY updated_at DESC LIMIT 40"),
      safeAll(env.DB, "SELECT id, slug, title_en, title_or, organisation_en, qualification_level, qualification_summary, total_vacancies, last_date, official_apply_url, summary_en, location_district, min_age, max_age FROM job_articles WHERE is_published = 1 ORDER BY updated_at DESC LIMIT 40"),
      safeAll(env.DB, "SELECT id, title, title_or, slug, scheme_type, department_name, beneficiary_group, benefit_amount, application_deadline, official_apply_url, summary FROM schemes_directory_items WHERE status = 'published' ORDER BY updated_at DESC LIMIT 40"),
      safeAll(env.DB, "SELECT id, slug, title_en, title_or, department_en, target_beneficiaries, benefit_amount_summary, last_date, is_ongoing, official_apply_url, summary_en, min_age, max_age, max_annual_income, allowed_categories_json, occupation_tag FROM scheme_articles WHERE is_published = 1 ORDER BY updated_at DESC LIMIT 40"),
      safeAll(env.DB, "SELECT id, slug, title_en, title_or, resource_type_badge, difficulty_level, high_yield_priority, exam_board_tag, estimated_read_mins FROM study_articles WHERE is_published = 1 ORDER BY is_featured DESC, updated_at DESC LIMIT 20")
    ]);

    const scoreItem = (hay, itemQual) => {
      let score = 60;
      const reasons = [];
      if (qual) {
        if (hay.includes(qual) || (itemQual && itemQual.toLowerCase().includes(qual))) {
          score += 25;
          reasons.push('Matches qualification');
        } else if (qual.includes('10th') && /graduate|post-graduate|b\.tech|mbbs/.test(hay) && !/10th|matric/.test(hay)) {
          score -= 40;
          reasons.push('Higher degree required');
        }
      }
      if (dist && hay.includes(dist)) { score += 10; reasons.push('District match'); }
      if (age > 0) {
        if (age <= effectiveMaxAge) {
          score += 5;
          reasons.push(relax > 0 ? `Age OK (+${relax} yrs ${cat} relaxation)` : 'Within standard age limit');
        } else {
          score -= 25;
          reasons.push('Check upper age criteria');
        }
      }
      return { score: Math.max(0, Math.min(100, score)), reasons };
    };

    const matchedFromDir = jobs.map(j => {
      const hay = `${j.title} ${j.recruiting_body || ''} ${j.qualification_tag || ''} ${j.summary || ''} ${j.state_location || ''}`.toLowerCase();
      const s = scoreItem(hay, j.qualification_tag);
      return {
        id: j.id, kind: 'job', title: j.title, title_or: j.title_or || '',
        body: j.recruiting_body || '', qualification: j.qualification_tag || '',
        vacancies: j.vacancies || '', deadline: j.deadline_date || '',
        url: j.official_apply_url || (j.slug ? `/jobs/${j.slug}` : '/jobs-careers/'),
        match_score: s.score, reasons: s.reasons
      };
    });
    const matchedFromArticles = (jobArticles || []).map(a => {
      const hay = `${a.title_en} ${a.organisation_en || ''} ${a.qualification_level || ''} ${a.qualification_summary || ''} ${a.summary_en || ''} ${a.location_district || ''}`.toLowerCase();
      const s = scoreItem(hay, a.qualification_level || a.qualification_summary);
      if (age > 0 && a.max_age && age <= (Number(a.max_age) + relax) && (!a.min_age || age >= Number(a.min_age))) {
        s.score = Math.min(100, s.score + 8);
      }
      return {
        id: a.id, kind: 'job', title: a.title_en, title_or: a.title_or || '',
        body: a.organisation_en || '', qualification: a.qualification_level || a.qualification_summary || '',
        vacancies: a.total_vacancies ? String(a.total_vacancies) : '', deadline: a.last_date || '',
        url: `/jobs/?slug=${encodeURIComponent(a.slug)}`,
        match_score: s.score, reasons: s.reasons
      };
    });
    const matchedJobs = [...matchedFromArticles, ...matchedFromDir].sort((a, b) => b.match_score - a.match_score).slice(0, 15);

    const matchedFromSchemeDir = schemes.map(sc => {
      const hay = `${sc.title} ${sc.scheme_type || ''} ${sc.beneficiary_group || ''} ${sc.summary || ''}`.toLowerCase();
      const s = scoreItem(hay, sc.beneficiary_group);
      return {
        id: sc.id, kind: 'scheme', title: sc.title, title_or: sc.title_or || '',
        department: sc.department_name || '', benefit: sc.benefit_amount || '',
        deadline: sc.application_deadline || '',
        url: sc.official_apply_url || (sc.slug ? `/schemes/${sc.slug}` : '/schemes-benefits/'),
        match_score: s.score, reasons: s.reasons
      };
    });
    const matchedFromSchemeArts = (schemeArticles || []).map(sc => {
      const hay = `${sc.title_en} ${sc.department_en || ''} ${sc.target_beneficiaries || ''} ${sc.occupation_tag || ''} ${sc.summary_en || ''}`.toLowerCase();
      const s = scoreItem(hay, sc.target_beneficiaries || sc.occupation_tag);
      let cats = [];
      try { cats = JSON.parse(sc.allowed_categories_json || '[]'); } catch {}
      if (Array.isArray(cats) && cats.length && cats.map(c => String(c).toUpperCase()).includes(cat)) {
        s.score = Math.min(100, s.score + 10);
        s.reasons.push(`Category ${cat} eligible`);
      }
      if (age > 0 && (sc.min_age || sc.max_age)) {
        const okMin = !sc.min_age || age >= Number(sc.min_age);
        const okMax = !sc.max_age || age <= Number(sc.max_age);
        if (okMin && okMax) s.score = Math.min(100, s.score + 6);
      }
      return {
        id: sc.id, kind: 'scheme', title: sc.title_en, title_or: sc.title_or || '',
        department: sc.department_en || '', benefit: sc.benefit_amount_summary || '',
        deadline: sc.is_ongoing ? 'Ongoing' : (sc.last_date || ''),
        url: `/schemes/?slug=${encodeURIComponent(sc.slug)}`,
        match_score: s.score, reasons: s.reasons
      };
    });
    const matchedSchemes = [...matchedFromSchemeArts, ...matchedFromSchemeDir].sort((a, b) => b.match_score - a.match_score).slice(0, 15);

    const matchedStudy = (studyArticles || []).map(st => ({
      id: st.id,
      kind: 'study',
      title: st.title_en,
      title_or: st.title_or || '',
      resource_type: st.resource_type_badge || 'Study Notes',
      priority: st.high_yield_priority || 'High',
      board: st.exam_board_tag || 'Study Library',
      read_mins: Number(st.estimated_read_mins || 10),
      url: `/study-library/?slug=${encodeURIComponent(st.slug)}`
    })).slice(0, 12);

    return json({
      ok: true,
      criteria: { qualification: qual, category: cat, age: age || null, district: dist, relaxation_years: relax, effective_max_age: effectiveMaxAge },
      jobs: matchedJobs,
      schemes: matchedSchemes,
      study_materials: matchedStudy
    });
  } catch (e) {
    return restrictedResponse(e);
  }
}

export async function handleCandidateWorkspaceApi(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    const { session } = await requireCandidateSession(request, env);
    const uid = session.userId;

    if (request.method === 'GET') {
      const [lockerRow, notesRow, mocks, bookmarks, studyProgRows, studyTotalRow, commPrefRow, commJoinedRow, commUnreadRow] = await Promise.all([
        safeFirst(env.DB, 'SELECT locker_data, updated_at FROM candidate_lockers WHERE candidate_id = ?', [uid]),
        safeFirst(env.DB, 'SELECT notes_content, updated_at FROM candidate_notes WHERE candidate_id = ?', [uid]),
        safeAll(env.DB, 'SELECT id, exam_name, score, total_marks, accuracy_rate, tested_at FROM candidate_mock_scores WHERE candidate_id = ? ORDER BY tested_at DESC LIMIT 50', [uid]),
        safeAll(env.DB, 'SELECT id, post_id, category, post_title, post_url, deadline_date, created_at FROM candidate_bookmarks WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 100', [uid]),
        safeAll(env.DB, 'SELECT p.article_id, p.status, p.needs_revision, p.mcq_score, p.mcq_total, p.streak_days, p.last_studied_at, a.slug, a.title_en FROM candidate_study_progress p LEFT JOIN study_articles a ON a.id = p.article_id WHERE p.user_id = ? ORDER BY p.last_studied_at DESC LIMIT 50', [uid]),
        safeFirst(env.DB, 'SELECT COUNT(*) AS n FROM study_articles WHERE is_published = 1'),
        safeFirst(env.DB, 'SELECT membership_tier, reputation_xp, approved_contributions_count, allow_direct_messages, bio_headline, earned_badges_json FROM community_user_preferences WHERE user_id = ?', [uid]),
        safeFirst(env.DB, 'SELECT COUNT(*) AS n FROM community_memberships WHERE user_id = ?', [uid]),
        safeFirst(env.DB, 'SELECT COUNT(*) AS n FROM community_direct_messages WHERE recipient_user_id = ? AND is_read = 0', [uid])
      ]);
      const locker = lockerRow ? parseJson(lockerRow.locker_data, {}) : {};
      const sProg = studyProgRows || [];
      const sCompleted = sProg.filter(x => x.status === 'completed').length;
      const sTotal = Number((studyTotalRow && studyTotalRow.n) || 0);
      const sStreak = sProg.reduce((m, x) => Math.max(m, Number(x.streak_days || 0)), 0);
      return json({
        ok: true,
        locker,
        notes: notesRow ? String(notesRow.notes_content || '') : '',
        mock_scores: mocks,
        bookmarks: bookmarks.map(b => ({
          id: b.id, postId: b.post_id, category: b.category,
          postTitle: b.post_title, postUrl: b.post_url || '', deadlineDate: b.deadline_date || null, createdAt: b.created_at
        })),
        study_progress: {
          total_published: sTotal,
          completed_count: sCompleted,
          completion_pct: sTotal > 0 ? Math.min(100, Math.round((sCompleted / sTotal) * 100)) : 0,
          streak_days: sStreak,
          revision_queue: sProg.filter(x => x.needs_revision).map(x => ({
            article_id: x.article_id,
            title_en: x.title_en || '',
            url: x.slug ? `/study-library/?slug=${encodeURIComponent(x.slug)}` : '/study-library/'
          })),
          recent: sProg.slice(0, 6)
        },
        community_profile: {
          membership_tier: (commPrefRow && commPrefRow.membership_tier) || 'standard',
          reputation_xp: Number((commPrefRow && commPrefRow.reputation_xp) || 0),
          approved_contributions_count: Number((commPrefRow && commPrefRow.approved_contributions_count) || 0),
          joined_communities_count: Number((commJoinedRow && commJoinedRow.n) || 0),
          unread_messages_count: Number((commUnreadRow && commUnreadRow.n) || 0),
          earned_badges: commPrefRow ? parseJson(commPrefRow.earned_badges_json, []) : []
        }
      });
    }

    if (request.method === 'POST') {
      const body = await readJson(request, 200_000);
      const nowIso = new Date().toISOString().replace('T', ' ').split('.')[0];
      if (body.locker && typeof body.locker === 'object') {
        await env.DB.prepare(
          `INSERT INTO candidate_lockers (candidate_id, locker_data, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(candidate_id) DO UPDATE SET locker_data = excluded.locker_data, updated_at = excluded.updated_at`
        ).bind(uid, JSON.stringify(body.locker).slice(0, 50000), nowIso).run();
      }
      if (typeof body.notes === 'string') {
        await env.DB.prepare(
          `INSERT INTO candidate_notes (candidate_id, notes_content, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(candidate_id) DO UPDATE SET notes_content = excluded.notes_content, updated_at = excluded.updated_at`
        ).bind(uid, body.notes.slice(0, 40000), nowIso).run();
      }
      return json({ ok: true, saved_at: nowIso });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  } catch (e) {
    return restrictedResponse(e);
  }
}

export async function handleCandidateProfileApi(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    if (request.method !== 'POST' && request.method !== 'PUT') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    const { session } = await requireCandidateSession(request, env);
    const body = await readJson(request, 20000);

    const fullName = cleanStr(body.fullName || body.full_name, 120);
    const phone = cleanStr(body.phone || body.mobile, 20);
    const district = cleanStr(body.district, 80);
    const qualification = cleanStr(body.qualification, 80);
    const category = cleanStr(body.category || 'UR', 20).toUpperCase();
    const age = body.age ? Math.max(14, Math.min(70, Number(body.age) || 0)) : null;
    const dob = cleanStr(body.dob, 20);
    const primaryExam = cleanStr(body.primaryExam || body.primary_exam, 80);
    const targetStreams = Array.isArray(body.targetStreams)
      ? body.targetStreams.map(s => cleanStr(s, 60)).filter(Boolean).slice(0, 12)
      : (primaryExam ? [primaryExam] : []);

    if (!fullName) throw validationError({ fullName: 'Full name is required.' });

    const existingCand = await safeFirst(env.DB, 'SELECT id FROM candidates WHERE id = ? OR email = ? LIMIT 1', [session.userId, session.email]);
    if (existingCand) {
      await env.DB.prepare(
        `UPDATE candidates SET full_name = ?, phone = ?, district = ?, target_streams = ? WHERE id = ?`
      ).bind(fullName, phone, district, JSON.stringify(targetStreams), existingCand.id).run();
    }
    const existingPrefs = await safeFirst(env.DB, 'SELECT selected_streams_json, selected_exams_json FROM candidate_exam_preferences WHERE user_id = ?', [session.userId]);
    const prevExtra = existingPrefs ? parseJson(existingPrefs.selected_streams_json, {}) : {};
    const mergedExtra = { ...prevExtra, qualification, category, age, dob };
    const examsList = targetStreams.length ? targetStreams : (existingPrefs ? parseJson(existingPrefs.selected_exams_json, []) : []);

    await env.DB.prepare(
      `INSERT INTO candidate_exam_preferences (user_id, primary_exam, selected_exams_json, selected_streams_json, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         primary_exam = excluded.primary_exam,
         selected_exams_json = excluded.selected_exams_json,
         selected_streams_json = excluded.selected_streams_json,
         updated_at = datetime('now')`
    ).bind(session.userId, primaryExam || examsList[0] || '', JSON.stringify(examsList), JSON.stringify(mergedExtra)).run();

    const profile = await loadCandidateProfile(env.DB, session.userId, session.email);
    return json({ ok: true, profile });
  } catch (e) {
    return restrictedResponse(e);
  }
}

// =========================================================================
// 3. ADMIN CANDIDATE ROSTER & 360° GOVERNANCE (/api/admin/candidates)
// =========================================================================
async function invalidateHub(request) {
  try { await invalidateAllPublicCaches(request, HUB_CACHE_PATHS); } catch {}
}

async function ensureCandidateUserRow(db, id) {
  const user = await safeFirst(
    db,
    `SELECT u.id, u.email, u.role, u.created_at,
            c.full_name, c.phone, c.district, c.target_streams, c.last_login_at
     FROM users u
     LEFT JOIN candidates c ON c.id = u.id OR c.email = u.email
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'Candidate account not found');
  return user;
}

async function computeRosterKpis(db, filteredTotal = null) {
  const [totRow, blockedRow, tierRow, modRow, assignedRow] = await Promise.all([
    safeFirst(db, 'SELECT COUNT(*) AS n FROM users'),
    safeFirst(db, "SELECT COUNT(*) AS n FROM candidate_governance WHERE account_status IN ('blocked', 'suspended')"),
    safeFirst(db, "SELECT COUNT(*) AS n FROM candidate_governance WHERE access_tier IN ('verified', 'mentor', 'pro_member', 'permanent_member', 'vip')"),
    safeFirst(db, 'SELECT COUNT(*) AS n FROM candidate_hub_modules WHERE is_enabled = 1'),
    safeFirst(db, 'SELECT COUNT(*) AS n FROM candidate_assigned_items WHERE is_published = 1')
  ]);
  const allUsersTotal = Number((totRow && totRow.n) || 0);
  const total = filteredTotal !== null ? Number(filteredTotal) : allUsersTotal;
  const blocked = Number((blockedRow && blockedRow.n) || 0);
  return {
    total_candidates: total,
    active_candidates: Math.max(0, allUsersTotal - blocked),
    blocked_suspended: blocked,
    verified_mentor: Number((tierRow && tierRow.n) || 0),
    active_features: Number((modRow && modRow.n) || 0),
    assigned_items: Number((assignedRow && assignedRow.n) || 0)
  };
}

export async function handleAdminCandidatesV244(request, env, actor, id) {
  await ensureCandidateHubSchema(env.DB);
  const url = new URL(request.url);
  const method = request.method;

  // POST /api/admin/candidates/bulk — Bulk Block / Unblock / Tier / Assign Content / Export CSV
  if (id === 'bulk' && method === 'POST') {
    const body = await readJson(request, 100_000);
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean).slice(0, 200) : [];
    const action = cleanStr(body.action, 40);
    if (!ids.length) throw validationError({ ids: 'Select at least one candidate.' });

    if (action === 'block' || action === 'unblock') {
      const targetIds = action === 'block' && actor && actor.userId ? ids.filter(uid => uid !== actor.userId) : ids;
      if (action === 'block' && !targetIds.length) {
        throw new HttpError(400, 'SELF_LOCKOUT_PREVENTED', 'You cannot block your own active admin account.');
      }
      const status = action === 'block' ? 'blocked' : 'active';
      const legacyStatus = action === 'block' ? 'banned' : 'active';
      const reason = action === 'block' ? cleanStr(body.block_reason || 'Blocked by administrator', 500) : '';
      const stmts = [];
      for (const uid of targetIds) {
        stmts.push(env.DB.prepare(
          `INSERT INTO candidate_governance (user_id, account_status, block_reason, session_version, updated_by, updated_at)
           VALUES (?, ?, ?, 1, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             account_status = excluded.account_status,
             block_reason = excluded.block_reason,
             session_version = CASE WHEN excluded.account_status = 'blocked' THEN candidate_governance.session_version + 1 ELSE candidate_governance.session_version END,
             updated_by = excluded.updated_by,
             updated_at = datetime('now')`
        ).bind(uid, status, reason, actor.email));
        stmts.push(env.DB.prepare(
          `INSERT INTO candidate_controls (user_id, account_status, restriction_reason, updated_by, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET account_status = excluded.account_status, restriction_reason = excluded.restriction_reason, updated_by = excluded.updated_by, updated_at = datetime('now')`
        ).bind(uid, legacyStatus, reason || null, actor.email));
        if (action === 'block') stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(uid));
      }
      await env.DB.batch(stmts);
      await audit(env, request, actor, `candidate.bulk_${action}`, 'candidate_governance', null, { count: ids.length, reason });
      await invalidateHub(request);
      return json({ ok: true, action, affected: ids.length });
    }

    if (action === 'change_tier') {
      const tier = cleanStr(body.access_tier, 30);
      if (!ACCESS_TIERS.includes(tier)) throw validationError({ access_tier: 'Invalid access tier.' });
      await env.DB.batch(ids.map(uid => env.DB.prepare(
        `INSERT INTO candidate_governance (user_id, access_tier, updated_by, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET access_tier = excluded.access_tier, updated_by = excluded.updated_by, updated_at = datetime('now')`
      ).bind(uid, tier, actor.email)));
      await audit(env, request, actor, 'candidate.bulk_change_tier', 'candidate_governance', null, { count: ids.length, access_tier: tier });
      await invalidateHub(request);
      return json({ ok: true, action, access_tier: tier, affected: ids.length });
    }

    if (action === 'assign_content') {
      const titleEn = cleanStr(body.title_en, 180);
      if (!titleEn) throw validationError({ title_en: 'Content title is required.' });
      const titleOr = cleanStr(body.title_or, 180);
      const summaryEn = cleanStr(body.summary_en, 400);
      const summaryOr = cleanStr(body.summary_or, 400);
      const itemType = ASSIGNED_ITEM_TYPES.includes(body.item_type) ? body.item_type : 'study_pdf';
      const resourceUrl = safeHref(body.resource_url || '');
      const r2Key = cleanStr(body.r2_file_key, 260);
      const priority = PRIORITIES.includes(body.priority) ? body.priority : 'normal';
      const expiresAt = cleanStr(body.expires_at, 30);
      const stmts = ids.map((uid, idx) => env.DB.prepare(
        `INSERT INTO candidate_assigned_items (id, target_scope, target_user_id, item_type, title_en, title_or, summary_en, summary_or, resource_url, r2_file_key, priority, expires_at, is_published, created_by)
         VALUES (?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).bind(`cai_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).slice(2, 5)}`, uid, itemType, titleEn, titleOr, summaryEn, summaryOr, resourceUrl, r2Key, priority, expiresAt, actor.email));
      await env.DB.batch(stmts);
      await audit(env, request, actor, 'candidate.bulk_assign_content', 'candidate_assigned_items', null, { count: ids.length, title_en: titleEn });
      await invalidateHub(request);
      return json({ ok: true, action, affected: ids.length });
    }

    throw validationError({ action: 'Unsupported bulk candidate action.' });
  }

  // GET /api/admin/candidates — Master Candidate Roster with Governance, Activity & KPIs
  if (!id && method === 'GET') {
    const { page, limit, offset } = parsePaging(url, 25, 100);
    const q = cleanStr(url.searchParams.get('q'), 100);
    const status = cleanStr(url.searchParams.get('status'), 30);
    const tier = cleanStr(url.searchParams.get('tier'), 30);
    const district = cleanStr(url.searchParams.get('district'), 80);
    const exam = cleanStr(url.searchParams.get('exam'), 80);

    const where = [];
    const binds = [];
    if (q) {
      where.push("(u.email LIKE ? ESCAPE '\\' OR c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.district LIKE ? ESCAPE '\\')");
      const l = likeEscape(q);
      binds.push(l, l, l, l);
    }
    if (status) {
      if (status === 'active') {
        where.push("(COALESCE(cg.account_status, cc.account_status, 'active') = 'active')");
      } else if (status === 'blocked') {
        where.push("(cg.account_status = 'blocked' OR cc.account_status = 'banned')");
      } else {
        where.push('(cg.account_status = ? OR cc.account_status = ?)');
        binds.push(status, status);
      }
    }
    if (tier && ACCESS_TIERS.includes(tier)) {
      if (tier === 'standard') where.push("(cg.access_tier IS NULL OR cg.access_tier = 'standard')");
      else { where.push('cg.access_tier = ?'); binds.push(tier); }
    }
    if (district) {
      const canonicalDist = normalizeOdishaDistrict(district);
      const variants = DISTRICT_REVERSE_ALIASES[canonicalDist];
      if (variants && variants.length) {
        where.push(`(${variants.map(() => "c.district LIKE ? ESCAPE '\\'").join(' OR ')})`);
        variants.forEach(v => binds.push(likeEscape(v)));
      } else {
        where.push("c.district LIKE ? ESCAPE '\\'");
        binds.push(likeEscape(canonicalDist));
      }
    }
    if (exam) {
      where.push("(cp.primary_exam LIKE ? ESCAPE '\\' OR cp.selected_exams_json LIKE ? ESCAPE '\\' OR c.target_streams LIKE ? ESCAPE '\\')");
      const l = likeEscape(exam);
      binds.push(l, l, l);
    }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const fromSql = `
      FROM users u
      LEFT JOIN candidates c ON c.id = u.id OR c.email = u.email
      LEFT JOIN candidate_governance cg ON cg.user_id = u.id
      LEFT JOIN candidate_controls cc ON cc.user_id = u.id
      LEFT JOIN candidate_exam_preferences cp ON cp.user_id = u.id
    `;

    const [totalRow, docTotalRow, rowsRes] = await Promise.all([
      safeFirst(env.DB, `SELECT COUNT(DISTINCT u.id) AS n ${fromSql} ${w}`, binds),
      safeFirst(env.DB, 'SELECT COUNT(*) AS n FROM candidate_doc_templates WHERE is_published = 1'),
      env.DB.prepare(
        `SELECT u.id, u.email, u.role, u.created_at,
                MAX(c.full_name) AS full_name, MAX(c.phone) AS phone, MAX(c.district) AS district,
                MAX(c.last_login_at) AS last_login_at, MAX(c.target_streams) AS target_streams,
                MAX(cg.account_status) AS gov_status, MAX(cg.block_reason) AS block_reason,
                MAX(cg.access_tier) AS access_tier, MAX(cg.granted_modules_json) AS granted_modules_json,
                MAX(cg.session_version) AS gov_sv, MAX(cg.admin_notes) AS admin_notes,
                MAX(cc.account_status) AS legacy_status, MAX(cc.session_version) AS legacy_sv,
                MAX(cc.lock_exam_preferences) AS lock_exam_preferences, MAX(cc.admin_notice_text) AS admin_notice_text,
                MAX(cp.primary_exam) AS primary_exam, MAX(cp.selected_exams_json) AS selected_exams_json,
                MAX(cp.selected_streams_json) AS selected_streams_json,
                (SELECT COUNT(*) FROM candidate_bookmarks cb WHERE cb.candidate_id = u.id) AS cand_bm_count,
                (SELECT COUNT(*) FROM user_bookmarks ub WHERE ub.user_id = u.id) AS user_bm_count,
                (SELECT COUNT(*) FROM candidate_mock_scores cms WHERE cms.candidate_id = u.id) AS mock_count,
                (SELECT COUNT(*) FROM test_attempts ta WHERE ta.user_id = u.id) AS attempts_count,
                (SELECT locker_data FROM candidate_lockers cl WHERE cl.candidate_id = u.id LIMIT 1) AS locker_data,
                (SELECT COUNT(*) FROM candidate_assigned_items cai WHERE cai.is_published = 1 AND (cai.target_scope = 'all' OR (cai.target_scope = 'user' AND cai.target_user_id = u.id))) AS assigned_count
         ${fromSql} ${w}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all()
    ]);

    const total = Number((totalRow && totalRow.n) || 0);
    const kpis = await computeRosterKpis(env.DB, total);
    const actorId = actor && actor.userId ? String(actor.userId) : '';
    const totalDocs = Math.max(1, Number((docTotalRow && docTotalRow.n) || 0));
    const items = (rowsRes.results || []).map(r => {
      const extra = parseJson(r.selected_streams_json, {});
      const locker = parseJson(r.locker_data, {});
      const readyDocs = Object.values(locker).filter(v => v === true || v === 'ready' || v === 'verified').length;
      const docsPct = Math.min(100, Math.round((readyDocs / totalDocs) * 100));
      let accStatus = r.gov_status || (r.legacy_status === 'banned' ? 'blocked' : r.legacy_status) || 'active';
      const selectedExams = parseJson(r.selected_exams_json, []);
      const streams = parseJson(r.target_streams, []);
      const rawExam = r.primary_exam || (Array.isArray(selectedExams) && selectedExams[0]) || (Array.isArray(streams) && streams[0]) || '';
      return {
        id: r.id,
        email: r.email,
        role: r.role,
        is_self: Boolean(actorId && r.id === actorId),
        full_name: r.full_name || 'Candidate Aspirant',
        phone: r.phone || '',
        district: normalizeOdishaDistrict(r.district || ''),
        qualification: String(extra.qualification || ''),
        category: String(extra.category || ''),
        target_exam: formatTargetExamLabel(rawExam),
        selected_exams: Array.isArray(selectedExams) ? selectedExams.map(formatTargetExamLabel) : [],
        access_tier: ACCESS_TIERS.includes(r.access_tier) ? r.access_tier : 'standard',
        account_status: accStatus,
        block_reason: r.block_reason || '',
        granted_modules: parseJson(r.granted_modules_json, {}),
        admin_notes: r.admin_notes || '',
        session_version: Math.max(Number(r.gov_sv || 1), Number(r.legacy_sv || 1)),
        lock_exam_preferences: Boolean(r.lock_exam_preferences),
        has_notice: Boolean(r.admin_notice_text),
        bookmarks_count: Number(r.cand_bm_count || 0) + Number(r.user_bm_count || 0),
        docs_pct: docsPct,
        attempts_count: Number(r.mock_count || 0) + Number(r.attempts_count || 0),
        assigned_count: Number(r.assigned_count || 0),
        last_login_at: r.last_login_at || null,
        created_at: r.created_at
      };
    });

    return json({ ok: true, items, kpis, page, limit, total, current_actor_id: actorId });
  }

  // GET /api/admin/candidates/:id — 360° Candidate Inspection
  if (id && method === 'GET') {
    const user = await ensureCandidateUserRow(env.DB, id);
    const [governance, controls, prefsRow, lockerRow, notesRow, bookmarks, mocks, assigned, logs, modules] = await Promise.all([
      getCandidateGovernance(env, id, user.email),
      getCandidateControls(env, id).catch(() => null),
      safeFirst(env.DB, 'SELECT * FROM candidate_exam_preferences WHERE user_id = ?', [id]),
      safeFirst(env.DB, 'SELECT locker_data, updated_at FROM candidate_lockers WHERE candidate_id = ?', [id]),
      safeFirst(env.DB, 'SELECT notes_content, updated_at FROM candidate_notes WHERE candidate_id = ?', [id]),
      safeAll(env.DB, 'SELECT id, post_id, category, post_title, post_url, deadline_date, created_at FROM candidate_bookmarks WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 30', [id]),
      safeAll(env.DB, 'SELECT id, exam_name, score, total_marks, accuracy_rate, tested_at FROM candidate_mock_scores WHERE candidate_id = ? ORDER BY tested_at DESC LIMIT 20', [id]),
      safeAll(env.DB, "SELECT * FROM candidate_assigned_items WHERE target_scope = 'user' AND target_user_id = ? ORDER BY created_at DESC LIMIT 30", [id]),
      safeAll(env.DB, 'SELECT id, action, actor, details, created_at FROM candidate_audit_logs WHERE user_id = ? ORDER BY id DESC LIMIT 40', [id]),
      safeAll(env.DB, 'SELECT * FROM candidate_hub_modules ORDER BY sort_order ASC')
    ]);

    const extra = prefsRow ? parseJson(prefsRow.selected_streams_json, {}) : {};
    return json({
      ok: true,
      candidate: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_self: Boolean(actor && actor.userId && user.id === actor.userId),
        full_name: user.full_name || 'Candidate Aspirant',
        phone: user.phone || '',
        district: normalizeOdishaDistrict(user.district || ''),
        qualification: String(extra.qualification || ''),
        category: String(extra.category || ''),
        last_login_at: user.last_login_at || null,
        created_at: user.created_at,
        target_streams: parseJson(user.target_streams, [])
      },
      governance,
      controls,
      preferences: prefsRow ? {
        primary_exam: prefsRow.primary_exam || '',
        selected_exams: parseJson(prefsRow.selected_exams_json, []),
        extra
      } : null,
      workspace: {
        bookmarks,
        locker: lockerRow ? parseJson(lockerRow.locker_data, {}) : {},
        notes_length: notesRow && notesRow.notes_content ? notesRow.notes_content.length : 0,
        mock_scores: mocks,
        assigned_items: assigned.map(formatAssignedItem)
      },
      modules: modules.map(formatModule),
      audit_logs: logs
    });
  }

  // POST /api/admin/candidates/:id — Governance & Authority Actions
  if (id && method === 'POST') {
    const user = await ensureCandidateUserRow(env.DB, id);
    const body = await readJson(request, 40000);
    const action = cleanStr(body.action, 50) || 'update_governance';

    if (action === 'force_logout') {
      if (actor && actor.userId && id === actor.userId) {
        throw new HttpError(400, 'SELF_LOCKOUT_PREVENTED', 'You cannot force-logout your own active admin account.');
      }
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
        env.DB.prepare(
          `INSERT INTO candidate_governance (user_id, email, session_version, updated_by, updated_at)
           VALUES (?, ?, 2, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             session_version = candidate_governance.session_version + 1,
             updated_by = excluded.updated_by,
             updated_at = datetime('now')`
        ).bind(id, user.email, actor.email),
        env.DB.prepare(
          `INSERT INTO candidate_controls (user_id, session_version, updated_by, updated_at)
           VALUES (?, 2, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             session_version = candidate_controls.session_version + 1,
             updated_by = excluded.updated_by,
             updated_at = datetime('now')`
        ).bind(id, actor.email)
      ]);
      await logCandidateAudit(env, id, 'session.force_logout', actor.email, { email: user.email });
      await audit(env, request, actor, 'candidate.force_logout', 'candidate_governance', id, { email: user.email });
      await invalidateHub(request);
      return json({ ok: true, action, governance: await getCandidateGovernance(env, id, user.email) });
    }

    if (action === 'block' || action === 'unblock' || action === 'update_governance') {
      const current = await getCandidateGovernance(env, id, user.email);
      const nextStatus = action === 'block'
        ? 'blocked'
        : action === 'unblock'
          ? 'active'
          : (body.account_status !== undefined ? cleanStr(body.account_status, 30) : current.account_status);
      if (actor && actor.userId && id === actor.userId && (nextStatus === 'blocked' || nextStatus === 'suspended')) {
        throw new HttpError(400, 'SELF_LOCKOUT_PREVENTED', 'You cannot block or suspend your own active admin account.');
      }
      if (!GOV_STATUSES.includes(nextStatus)) {
        throw validationError({ account_status: 'account_status must be active, blocked, suspended, or pending_review' });
      }
      const nextTier = body.access_tier !== undefined ? cleanStr(body.access_tier, 30) : current.access_tier;
      if (!ACCESS_TIERS.includes(nextTier)) {
        throw validationError({ access_tier: 'access_tier must be standard, verified, mentor, or vip' });
      }
      const nextReason = action === 'unblock'
        ? ''
        : (body.block_reason !== undefined ? cleanStr(body.block_reason, 500) : current.block_reason);
      const nextGranted = body.granted_modules !== undefined
        ? parseJson(body.granted_modules, {})
        : current.granted_modules;
      const nextNotes = body.admin_notes !== undefined ? cleanStr(body.admin_notes, 1000) : current.admin_notes;
      const bumpSession = nextStatus === 'blocked' || nextStatus === 'suspended';

      const legacyStatus = nextStatus === 'blocked' ? 'banned' : (nextStatus === 'suspended' ? 'suspended' : 'active');
      const stmts = [
        env.DB.prepare(
          `INSERT INTO candidate_governance (user_id, email, account_status, block_reason, access_tier, granted_modules_json, session_version, admin_notes, updated_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             email = excluded.email,
             account_status = excluded.account_status,
             block_reason = excluded.block_reason,
             access_tier = excluded.access_tier,
             granted_modules_json = excluded.granted_modules_json,
             session_version = CASE WHEN ? = 1 THEN candidate_governance.session_version + 1 ELSE candidate_governance.session_version END,
             admin_notes = excluded.admin_notes,
             updated_by = excluded.updated_by,
             updated_at = datetime('now')`
        ).bind(id, user.email, nextStatus, nextReason, nextTier, JSON.stringify(nextGranted), bumpSession ? current.session_version + 1 : current.session_version, nextNotes, actor.email, bumpSession ? 1 : 0),
        env.DB.prepare(
          `INSERT INTO candidate_controls (user_id, account_status, restriction_reason, updated_by, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET account_status = excluded.account_status, restriction_reason = excluded.restriction_reason, updated_by = excluded.updated_by, updated_at = datetime('now')`
        ).bind(id, legacyStatus, nextReason || null, actor.email)
      ];
      if (bumpSession) stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
      await env.DB.batch(stmts);
      await logCandidateAudit(env, id, `governance.${action}`, actor.email, { account_status: nextStatus, access_tier: nextTier, block_reason: nextReason });
      await audit(env, request, actor, `candidate.${action}`, 'candidate_governance', id, { email: user.email, account_status: nextStatus, access_tier: nextTier });
      await invalidateHub(request);
      return json({ ok: true, action, governance: await getCandidateGovernance(env, id, user.email) });
    }

    if (action === 'reset_workspace') {
      const scope = cleanStr(body.scope || 'all', 40);
      const stmts = [];
      if (scope === 'all' || scope === 'bookmarks') stmts.push(env.DB.prepare('DELETE FROM candidate_bookmarks WHERE candidate_id = ?').bind(id));
      if (scope === 'all' || scope === 'locker') stmts.push(env.DB.prepare('DELETE FROM candidate_lockers WHERE candidate_id = ?').bind(id));
      if (scope === 'all' || scope === 'notes') stmts.push(env.DB.prepare('DELETE FROM candidate_notes WHERE candidate_id = ?').bind(id));
      if (scope === 'all' || scope === 'cbt') {
        stmts.push(env.DB.prepare('DELETE FROM candidate_mock_scores WHERE candidate_id = ?').bind(id));
        stmts.push(env.DB.prepare('DELETE FROM test_attempts WHERE user_id = ?').bind(id));
      }
      if (scope === 'all' || scope === 'checklist') stmts.push(env.DB.prepare('DELETE FROM candidate_checklist WHERE candidate_id = ?').bind(id));
      if (stmts.length) await env.DB.batch(stmts);
      await logCandidateAudit(env, id, 'workspace.reset', actor.email, { scope });
      await audit(env, request, actor, 'candidate.reset_workspace', 'candidate_governance', id, { email: user.email, scope });
      return json({ ok: true, action, scope });
    }

    // Legacy compatibility actions
    if (action === 'reset_cbt') {
      const res = await env.DB.prepare('DELETE FROM test_attempts WHERE user_id = ?').bind(id).run();
      await logCandidateAudit(env, id, 'cbt.reset', actor.email, { deleted_attempts: Number(res?.meta?.changes || 0) });
      await audit(env, request, actor, 'candidate.reset_cbt', 'user', id, { email: user.email });
      return json({ ok: true, action, deleted: Number(res?.meta?.changes || 0) });
    }
    if (action === 'reset_checklist') {
      const res = await env.DB.prepare('DELETE FROM candidate_checklist WHERE candidate_id = ?').bind(id).run();
      await logCandidateAudit(env, id, 'checklist.reset', actor.email, { deleted_milestones: Number(res?.meta?.changes || 0) });
      await audit(env, request, actor, 'candidate.reset_checklist', 'user', id, { email: user.email });
      return json({ ok: true, action, deleted: Number(res?.meta?.changes || 0) });
    }
    if (action === 'update_controls') {
      const current = await getCandidateControls(env, id);
      const account_status = body.account_status !== undefined ? String(body.account_status) : current.account_status;
      if (!LEGACY_STATUSES.includes(account_status)) throw validationError({ account_status: 'Invalid account_status' });
      const notice_level = body.admin_notice_level !== undefined ? String(body.admin_notice_level) : current.admin_notice_level;
      if (!NOTICE_LEVELS.includes(notice_level)) throw validationError({ admin_notice_level: 'Invalid notice level' });
      const permissions = body.permissions !== undefined ? normalizePermissions(body.permissions) : current.permissions;
      await env.DB.prepare(
        `INSERT INTO candidate_controls (user_id, account_status, restriction_reason, suspended_until, permissions_json, assigned_exams_json, lock_exam_preferences, admin_notice_text, admin_notice_level, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET account_status = excluded.account_status, restriction_reason = excluded.restriction_reason, suspended_until = excluded.suspended_until, permissions_json = excluded.permissions_json, assigned_exams_json = excluded.assigned_exams_json, lock_exam_preferences = excluded.lock_exam_preferences, admin_notice_text = excluded.admin_notice_text, admin_notice_level = excluded.admin_notice_level, updated_by = excluded.updated_by, updated_at = datetime('now')`
      ).bind(id, account_status, body.restriction_reason || current.restriction_reason, body.suspended_until || current.suspended_until, JSON.stringify(permissions), JSON.stringify(body.assigned_exams || current.assigned_exams), body.lock_exam_preferences ? 1 : 0, body.admin_notice_text !== undefined ? cleanStr(body.admin_notice_text, 600) : current.admin_notice_text, notice_level, actor.email).run();
      await audit(env, request, actor, 'candidate.controls_update', 'user', id, { email: user.email, account_status });
      await invalidateHub(request);
      return json({ ok: true, action, controls: await getCandidateControls(env, id) });
    }

    throw validationError({ action: 'Unsupported candidate governance action' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// =========================================================================
// 4. ADMIN CANDIDATE HUB STUDIO (/api/admin/candidate-hub/*)
//    ui-config | modules | assigned-items | doc-templates
// =========================================================================
export async function handleAdminCandidateHubStudio(request, env, actor, section, id, sub) {
  await ensureCandidateHubSchema(env.DB);
  const db = env.DB;
  const method = request.method;
  const isWrite = method !== 'GET' && method !== 'HEAD';
  let res;

  // --- UI Config ---
  if (section === 'ui-config') {
    if (method === 'GET') {
      const row = await safeFirst(db, "SELECT * FROM candidate_hub_ui_config WHERE id = 'default'");
      return json({ ok: true, ui_config: formatUiConfig(row) });
    }
    if (method === 'PUT' || method === 'POST') {
      const body = await readJson(request, 30000);
      const cur = formatUiConfig(await safeFirst(db, "SELECT * FROM candidate_hub_ui_config WHERE id = 'default'"));
      const next = {
        hero_title_en: body.hero_title_en !== undefined ? cleanStr(body.hero_title_en, 160) : cur.hero_title_en,
        hero_title_or: body.hero_title_or !== undefined ? cleanStr(body.hero_title_or, 160) : cur.hero_title_or,
        hero_subtitle_en: body.hero_subtitle_en !== undefined ? cleanStr(body.hero_subtitle_en, 300) : cur.hero_subtitle_en,
        hero_subtitle_or: body.hero_subtitle_or !== undefined ? cleanStr(body.hero_subtitle_or, 300) : cur.hero_subtitle_or,
        announcement_banner_en: body.announcement_banner_en !== undefined ? cleanStr(body.announcement_banner_en, 400) : cur.announcement_banner_en,
        announcement_banner_or: body.announcement_banner_or !== undefined ? cleanStr(body.announcement_banner_or, 400) : cur.announcement_banner_or,
        announcement_type: ['info', 'success', 'warning'].includes(body.announcement_type) ? body.announcement_type : cur.announcement_type,
        show_announcement: body.show_announcement !== undefined ? (body.show_announcement ? 1 : 0) : cur.show_announcement,
        layout_mode: LAYOUT_MODES.includes(body.layout_mode) ? body.layout_mode : cur.layout_mode,
        grid_columns: [1, 2, 3].includes(Number(body.grid_columns)) ? Number(body.grid_columns) : cur.grid_columns,
        default_theme: ALLOWED_THEMES.includes(body.default_theme) ? body.default_theme : cur.default_theme,
        allow_theme_switch: body.allow_theme_switch !== undefined ? (body.allow_theme_switch ? 1 : 0) : cur.allow_theme_switch,
        show_quick_stats: body.show_quick_stats !== undefined ? (body.show_quick_stats ? 1 : 0) : cur.show_quick_stats,
        show_sidebar: body.show_sidebar !== undefined ? (body.show_sidebar ? 1 : 0) : cur.show_sidebar,
        custom_empty_title_en: body.custom_empty_title_en !== undefined ? cleanStr(body.custom_empty_title_en, 240) : cur.custom_empty_title_en,
        custom_empty_title_or: body.custom_empty_title_or !== undefined ? cleanStr(body.custom_empty_title_or, 240) : cur.custom_empty_title_or
      };
      await db.prepare(
        `INSERT INTO candidate_hub_ui_config (
           id, hero_title_en, hero_title_or, hero_subtitle_en, hero_subtitle_or,
           announcement_banner_en, announcement_banner_or, announcement_type, show_announcement,
           layout_mode, grid_columns, default_theme, allow_theme_switch, show_quick_stats, show_sidebar,
           custom_empty_title_en, custom_empty_title_or, updated_at
         ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           hero_title_en = excluded.hero_title_en, hero_title_or = excluded.hero_title_or,
           hero_subtitle_en = excluded.hero_subtitle_en, hero_subtitle_or = excluded.hero_subtitle_or,
           announcement_banner_en = excluded.announcement_banner_en, announcement_banner_or = excluded.announcement_banner_or,
           announcement_type = excluded.announcement_type, show_announcement = excluded.show_announcement,
           layout_mode = excluded.layout_mode, grid_columns = excluded.grid_columns,
           default_theme = excluded.default_theme, allow_theme_switch = excluded.allow_theme_switch,
           show_quick_stats = excluded.show_quick_stats, show_sidebar = excluded.show_sidebar,
           custom_empty_title_en = excluded.custom_empty_title_en, custom_empty_title_or = excluded.custom_empty_title_or,
           updated_at = datetime('now')`
      ).bind(
        next.hero_title_en, next.hero_title_or, next.hero_subtitle_en, next.hero_subtitle_or,
        next.announcement_banner_en, next.announcement_banner_or, next.announcement_type, next.show_announcement,
        next.layout_mode, next.grid_columns, next.default_theme, next.allow_theme_switch, next.show_quick_stats, next.show_sidebar,
        next.custom_empty_title_en, next.custom_empty_title_or
      ).run();
      await audit(env, request, actor, 'candidate_hub.ui_config_update', 'candidate_hub_ui_config', 'default', { layout_mode: next.layout_mode, grid_columns: next.grid_columns });
      res = json({ ok: true, ui_config: formatUiConfig(await safeFirst(db, "SELECT * FROM candidate_hub_ui_config WHERE id = 'default'")) });
    }
  }

  // --- Modules & Custom Feature Builder ---
  if (section === 'modules') {
    if (!id && method === 'GET') {
      const rows = await safeAll(db, 'SELECT * FROM candidate_hub_modules ORDER BY sort_order ASC, id ASC');
      return json({ ok: true, items: rows.map(formatModule) });
    }
    if (!id && method === 'POST') {
      const body = await readJson(request, 50000);
      const titleEn = cleanStr(body.title_en, 160);
      if (!titleEn) throw validationError({ title_en: 'English title is required.' });
      const modType = MODULE_TYPES.includes(body.module_type) && body.module_type !== 'core' ? body.module_type : 'custom_feature';
      const layoutSlot = LAYOUT_SLOTS.includes(body.layout_slot) ? body.layout_slot : 'both';
      const cardSpan = CARD_SPANS.includes(body.card_span) ? body.card_span : 'half';
      const tier = ACCESS_TIERS.includes(body.required_access_tier) ? body.required_access_tier : 'standard';
      const cfg = parseJson(body.config !== undefined ? body.config : body.config_json, {});
      if (cfg.target_url) cfg.target_url = safeHref(cfg.target_url);
      const maxRow = await safeFirst(db, 'SELECT COALESCE(MAX(sort_order), 0) AS m FROM candidate_hub_modules');
      const sortOrder = Number(body.sort_order) > 0 ? Number(body.sort_order) : Number((maxRow && maxRow.m) || 0) + 10;
      const newId = `chm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const modKey = makeKey(body.module_key || titleEn, 'feat') + '_' + Math.random().toString(36).slice(2, 5);
      await db.prepare(
        `INSERT INTO candidate_hub_modules (id, module_key, title_en, title_or, subtitle_en, subtitle_or, icon, module_type, layout_slot, card_span, accent_variant, required_access_tier, sort_order, is_enabled, config_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        newId, modKey, titleEn, cleanStr(body.title_or, 160), cleanStr(body.subtitle_en, 300), cleanStr(body.subtitle_or, 300),
        cleanStr(body.icon || '✨', 16), modType, layoutSlot, cardSpan, cleanStr(body.accent_variant || 'primary', 30),
        tier, sortOrder, body.is_enabled === 0 || body.is_enabled === false ? 0 : 1, JSON.stringify(cfg).slice(0, 8000)
      ).run();
      await audit(env, request, actor, 'candidate_hub.module_create', 'candidate_hub_modules', newId, { module_type: modType, title_en: titleEn });
      res = json({ ok: true, item: formatModule(await safeFirst(db, 'SELECT * FROM candidate_hub_modules WHERE id = ?', [newId])) }, 201);
    } else if (id && !sub && (method === 'PUT' || method === 'PATCH')) {
      const existing = await safeFirst(db, 'SELECT * FROM candidate_hub_modules WHERE id = ?', [id]);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Module not found');
      const cur = formatModule(existing);
      const body = await readJson(request, 50000);
      const cfg = body.config !== undefined || body.config_json !== undefined
        ? parseJson(body.config !== undefined ? body.config : body.config_json, {})
        : cur.config;
      if (cfg.target_url) cfg.target_url = safeHref(cfg.target_url);
      await db.prepare(
        `UPDATE candidate_hub_modules SET
           title_en = ?, title_or = ?, subtitle_en = ?, subtitle_or = ?, icon = ?,
           module_type = ?, layout_slot = ?, card_span = ?, accent_variant = ?,
           required_access_tier = ?, sort_order = ?, is_enabled = ?, config_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(
        body.title_en !== undefined ? cleanStr(body.title_en, 160) || cur.title_en : cur.title_en,
        body.title_or !== undefined ? cleanStr(body.title_or, 160) : cur.title_or,
        body.subtitle_en !== undefined ? cleanStr(body.subtitle_en, 300) : cur.subtitle_en,
        body.subtitle_or !== undefined ? cleanStr(body.subtitle_or, 300) : cur.subtitle_or,
        body.icon !== undefined ? cleanStr(body.icon, 16) || cur.icon : cur.icon,
        cur.module_type === 'core' ? 'core' : (MODULE_TYPES.includes(body.module_type) ? body.module_type : cur.module_type),
        LAYOUT_SLOTS.includes(body.layout_slot) ? body.layout_slot : cur.layout_slot,
        CARD_SPANS.includes(body.card_span) ? body.card_span : cur.card_span,
        body.accent_variant !== undefined ? cleanStr(body.accent_variant, 30) : cur.accent_variant,
        ACCESS_TIERS.includes(body.required_access_tier) ? body.required_access_tier : cur.required_access_tier,
        body.sort_order !== undefined ? Math.max(0, Number(body.sort_order) || 0) : cur.sort_order,
        body.is_enabled !== undefined ? (body.is_enabled ? 1 : 0) : cur.is_enabled,
        JSON.stringify(cfg).slice(0, 8000),
        id
      ).run();
      await audit(env, request, actor, 'candidate_hub.module_update', 'candidate_hub_modules', id);
      res = json({ ok: true, item: formatModule(await safeFirst(db, 'SELECT * FROM candidate_hub_modules WHERE id = ?', [id])) });
    } else if (id && sub === 'toggle' && method === 'POST') {
      const existing = await safeFirst(db, 'SELECT is_enabled FROM candidate_hub_modules WHERE id = ?', [id]);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Module not found');
      const next = existing.is_enabled ? 0 : 1;
      await db.prepare("UPDATE candidate_hub_modules SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?").bind(next, id).run();
      await audit(env, request, actor, next ? 'candidate_hub.module_publish' : 'candidate_hub.module_unpublish', 'candidate_hub_modules', id);
      res = json({ ok: true, item: formatModule(await safeFirst(db, 'SELECT * FROM candidate_hub_modules WHERE id = ?', [id])) });
    } else if (id && sub === 'move' && method === 'POST') {
      const body = await readJson(request, 5000);
      const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
      if (!dir) throw validationError({ direction: 'direction must be up or down' });
      const all = await safeAll(db, 'SELECT id FROM candidate_hub_modules ORDER BY sort_order ASC, id ASC');
      const idx = all.findIndex(r => r.id === id);
      const swap = idx + dir;
      if (idx >= 0 && swap >= 0 && swap < all.length) {
        const order = all.map(r => r.id);
        [order[idx], order[swap]] = [order[swap], order[idx]];
        await db.batch(order.map((rid, n) => db.prepare("UPDATE candidate_hub_modules SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)));
      }
      await audit(env, request, actor, 'candidate_hub.module_reorder', 'candidate_hub_modules', id, { direction: body.direction });
      res = json({ ok: true, items: (await safeAll(db, 'SELECT * FROM candidate_hub_modules ORDER BY sort_order ASC, id ASC')).map(formatModule) });
    } else if (id && sub === 'duplicate' && method === 'POST') {
      const src = await safeFirst(db, 'SELECT * FROM candidate_hub_modules WHERE id = ?', [id]);
      if (!src) throw new HttpError(404, 'NOT_FOUND', 'Module not found');
      const maxRow = await safeFirst(db, 'SELECT COALESCE(MAX(sort_order), 0) AS m FROM candidate_hub_modules');
      const copyId = `chm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const copyKey = `${src.module_key}_copy_${Math.random().toString(36).slice(2, 5)}`;
      const copyType = src.module_type === 'core' ? 'custom_feature' : src.module_type;
      await db.prepare(
        `INSERT INTO candidate_hub_modules (id, module_key, title_en, title_or, subtitle_en, subtitle_or, icon, module_type, layout_slot, card_span, accent_variant, required_access_tier, sort_order, is_enabled, config_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))`
      ).bind(copyId, copyKey, `${src.title_en} (Copy)`.slice(0, 160), src.title_or, src.subtitle_en, src.subtitle_or, src.icon, copyType, src.layout_slot, src.card_span, src.accent_variant, src.required_access_tier, Number((maxRow && maxRow.m) || 0) + 10, src.config_json).run();
      await audit(env, request, actor, 'candidate_hub.module_duplicate', 'candidate_hub_modules', copyId, { from: id });
      res = json({ ok: true, item: formatModule(await safeFirst(db, 'SELECT * FROM candidate_hub_modules WHERE id = ?', [copyId])) }, 201);
    } else if (id && !sub && method === 'DELETE') {
      const existing = await safeFirst(db, 'SELECT module_type FROM candidate_hub_modules WHERE id = ?', [id]);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Module not found');
      if (existing.module_type === 'core') throw new HttpError(400, 'CORE_MODULE_PROTECTED', 'Core modules cannot be deleted — toggle them off instead.');
      await db.prepare('DELETE FROM candidate_hub_modules WHERE id = ?').bind(id).run();
      await audit(env, request, actor, 'candidate_hub.module_delete', 'candidate_hub_modules', id);
      res = json({ ok: true, deleted: id });
    }
  }

  // --- One-Step Direct File Upload & Instant Push (POST /api/admin/candidate-hub/upload-and-push) ---
  if (section === 'upload-and-push' && method === 'POST') {
    const ALLOWED_EXTS = {
      pdf: { mime: 'application/pdf', cat: 'pdf' },
      png: { mime: 'image/png', cat: 'image' },
      jpg: { mime: 'image/jpeg', cat: 'image' },
      jpeg: { mime: 'image/jpeg', cat: 'image' },
      webp: { mime: 'image/webp', cat: 'image' },
      doc: { mime: 'application/msword', cat: 'document' },
      docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', cat: 'document' },
      txt: { mime: 'text/plain; charset=utf-8', cat: 'document' },
      mp3: { mime: 'audio/mpeg', cat: 'audio' },
      zip: { mime: 'application/zip', cat: 'archive' }
    };
    const MAX_BYTES = 25 * 1024 * 1024;
    const ctype = (request.headers.get('Content-Type') || '').toLowerCase();

    let fields = {};
    let fileObj = null;
    if (ctype.includes('multipart/form-data')) {
      const fd = await request.formData();
      const rawFile = fd.get('file') || fd.getAll('files')[0] || null;
      if (rawFile && typeof rawFile === 'object' && typeof rawFile.arrayBuffer === 'function' && rawFile.size > 0) {
        fileObj = rawFile;
      }
      for (const k of ['target_scope', 'target_user_id', 'target_user_ids', 'target_district', 'target_exam_board',
        'item_type', 'title_en', 'title_or', 'summary_en', 'summary_or', 'resource_url', 'r2_file_key',
        'priority', 'expires_at', 'is_published']) {
        const v = fd.get(k);
        if (v !== null && v !== undefined) fields[k] = String(v);
      }
    } else {
      fields = await readJson(request, 50_000);
    }

    let uploadedUrl = safeHref(fields.resource_url || '');
    let r2Key = cleanStr(fields.r2_file_key, 260);
    let fileName = '';
    let fileSizeBytes = 0;
    let mimeType = '';

    if (fileObj) {
      const buf = await fileObj.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > MAX_BYTES) {
        throw new HttpError(400, 'INVALID_FILE_SIZE', 'File is empty or exceeds the 25 MB limit.');
      }
      fileName = cleanStr(fileObj.name || 'resource.pdf', 200);
      const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : '';
      const meta = ALLOWED_EXTS[ext];
      if (!meta) {
        throw new HttpError(400, 'UNSUPPORTED_FILE', 'Allowed file types: PDF, PNG, JPG, WEBP, DOC, DOCX, TXT, MP3, ZIP.');
      }
      const baseSlug = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
      r2Key = `candidate-assigned/${Date.now()}-${baseSlug}.${ext}`;
      if (env.MEDIA && typeof env.MEDIA.put === 'function') {
        await env.MEDIA.put(r2Key, buf, { httpMetadata: { contentType: meta.mime } });
      }
      uploadedUrl = `/api/media/${r2Key}`;
      fileSizeBytes = buf.byteLength;
      mimeType = meta.mime;

      const mediaId = `mfile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const mediaSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const titleFromFile = cleanStr(fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), 160) || 'Uploaded Resource';
      await db.prepare(
        `INSERT OR IGNORE INTO media_files (id, slug, file_category, storage_provider, r2_key, public_url, original_filename, title_en, mime_type, file_size_bytes, offline_ready, access_tier, status, uploaded_by)
         VALUES (?, ?, ?, 'r2_primary', ?, ?, ?, ?, ?, ?, ?, 'public', 'published', ?)`
      ).bind(mediaId, mediaSlug, meta.cat, r2Key, uploadedUrl, fileName, titleFromFile, mimeType, fileSizeBytes, ext === 'pdf' ? 1 : 0, cleanStr(actor.email || 'staff', 120)).run().catch(() => {});

      await db.prepare(
        `INSERT OR IGNORE INTO media_assets (id, object_key, kind, mime_type, size_bytes, original_name, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(mediaId, r2Key, meta.cat === 'image' ? 'image' : 'pdf', mimeType, fileSizeBytes, fileName, cleanStr(actor.email || 'staff', 120)).run().catch(() => {});
    }

    const rawTitleEn = cleanStr(fields.title_en, 180);
    const derivedTitle = fileName ? cleanStr(fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), 180) : '';
    const titleEn = rawTitleEn || derivedTitle;
    if (!titleEn) throw validationError({ title_en: 'Title (EN) or a file is required.' });

    const rawScope = cleanStr(fields.target_scope || 'all', 40);
    const scope = TARGET_SCOPES.includes(rawScope) ? rawScope : 'all';
    const itemType = ASSIGNED_ITEM_TYPES.includes(fields.item_type) ? fields.item_type : 'study_pack';
    const priority = PRIORITIES.includes(fields.priority) ? fields.priority : 'normal';
    const titleOr = cleanStr(fields.title_or, 180);
    const summaryEn = cleanStr(fields.summary_en, 400);
    const summaryOr = cleanStr(fields.summary_or, 400);
    const expiresAt = cleanStr(fields.expires_at, 30);
    const isPublished = fields.is_published === '0' || fields.is_published === 0 || fields.is_published === false ? 0 : 1;
    const dist = normalizeOdishaDistrict(cleanStr(fields.target_district, 80));
    const board = cleanStr(fields.target_exam_board, 80);

    let targetUserIds = [];
    if (scope === 'selected_users') {
      if (Array.isArray(fields.target_user_ids)) targetUserIds = fields.target_user_ids.map(String).filter(Boolean);
      else if (typeof fields.target_user_ids === 'string' && fields.target_user_ids.trim()) {
        try {
          const parsed = JSON.parse(fields.target_user_ids);
          if (Array.isArray(parsed)) targetUserIds = parsed.map(String).filter(Boolean);
        } catch {
          targetUserIds = fields.target_user_ids.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      if (!targetUserIds.length) throw validationError({ target_user_ids: 'Select at least one candidate for bulk push.' });
    }

    const createdIds = [];
    if (scope === 'selected_users') {
      const stmts = targetUserIds.slice(0, 200).map((uid, idx) => {
        const nid = `cai_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).slice(2, 5)}`;
        createdIds.push(nid);
        return db.prepare(
          `INSERT INTO candidate_assigned_items (id, target_scope, target_user_id, target_district, target_exam_board, item_type, title_en, title_or, summary_en, summary_or, resource_url, r2_file_key, priority, expires_at, is_published, created_by)
           VALUES (?, 'user', ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(nid, uid, itemType, titleEn, titleOr, summaryEn, summaryOr, uploadedUrl, r2Key, priority, expiresAt, isPublished, actor.email);
      });
      await db.batch(stmts);
    } else {
      const storeScope = scope === 'individual' ? 'user' : scope;
      const uid = storeScope === 'user' ? cleanStr(fields.target_user_id, 120) : '';
      if (storeScope === 'user' && !uid) throw validationError({ target_user_id: 'Candidate User ID is required for individual push.' });
      const nid = `cai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      createdIds.push(nid);
      await db.prepare(
        `INSERT INTO candidate_assigned_items (id, target_scope, target_user_id, target_district, target_exam_board, item_type, title_en, title_or, summary_en, summary_or, resource_url, r2_file_key, priority, expires_at, is_published, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(nid, storeScope, uid, storeScope === 'district' ? dist : '', storeScope === 'exam_board' ? board : '',
        itemType, titleEn, titleOr, summaryEn, summaryOr, uploadedUrl, r2Key, priority, expiresAt, isPublished, actor.email).run();
    }

    await audit(env, request, actor, 'candidate_hub.upload_and_push', 'candidate_assigned_items', createdIds[0], {
      scope, count: createdIds.length, item_type: itemType, r2_file_key: r2Key, file_size_bytes: fileSizeBytes
    });
    await invalidateHub(request);
    return json({
      ok: true,
      url: uploadedUrl,
      r2_file_key: r2Key,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      mime_type: mimeType,
      pushed_count: createdIds.length,
      item_ids: createdIds
    }, 201);
  }

  // --- Assigned Content & Targeted Push ---
  if (section === 'assigned-items') {
    if (!id && method === 'GET') {
      const rows = await safeAll(db,
        `SELECT cai.*,
                COALESCE(mf.file_size_bytes, 0) AS file_size_bytes,
                COALESCE((SELECT COUNT(*) FROM candidate_assigned_acks a WHERE a.item_id = cai.id AND a.seen_at != ''), 0) AS seen_count,
                COALESCE((SELECT COUNT(*) FROM candidate_assigned_acks a WHERE a.item_id = cai.id AND a.downloaded_at != ''), 0) AS download_count,
                COALESCE((SELECT COUNT(*) FROM candidate_assigned_acks a WHERE a.item_id = cai.id AND a.completed = 1), 0) AS completed_count
         FROM candidate_assigned_items cai
         LEFT JOIN media_files mf ON (mf.r2_key = cai.r2_file_key OR mf.id = cai.r2_file_key) AND cai.r2_file_key != ''
         ORDER BY cai.created_at DESC LIMIT 200`
      );
      return json({ ok: true, items: rows.map(formatAssignedItem) });
    }
    if (!id && method === 'POST') {
      const body = await readJson(request, 40000);
      const titleEn = cleanStr(body.title_en, 180);
      if (!titleEn) throw validationError({ title_en: 'Title (EN) is required.' });
      const scope = TARGET_SCOPES.includes(body.target_scope) ? body.target_scope : 'all';
      const itemType = ASSIGNED_ITEM_TYPES.includes(body.item_type) ? body.item_type : 'study_pdf';
      const priority = PRIORITIES.includes(body.priority) ? body.priority : 'normal';
      const newId = `cai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await db.prepare(
        `INSERT INTO candidate_assigned_items (id, target_scope, target_user_id, target_district, target_exam_board, item_type, title_en, title_or, summary_en, summary_or, resource_url, r2_file_key, priority, expires_at, is_published, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, scope, cleanStr(body.target_user_id, 120), cleanStr(body.target_district, 80), cleanStr(body.target_exam_board, 80),
        itemType, titleEn, cleanStr(body.title_or, 180), cleanStr(body.summary_en, 400), cleanStr(body.summary_or, 400),
        safeHref(body.resource_url || ''), cleanStr(body.r2_file_key, 260), priority, cleanStr(body.expires_at, 30),
        body.is_published === 0 || body.is_published === false ? 0 : 1, actor.email
      ).run();
      await audit(env, request, actor, 'candidate_hub.assigned_create', 'candidate_assigned_items', newId, { scope, item_type: itemType });
      res = json({ ok: true, item: formatAssignedItem(await safeFirst(db, 'SELECT * FROM candidate_assigned_items WHERE id = ?', [newId])) }, 201);
    } else if (id && !sub && (method === 'PUT' || method === 'PATCH')) {
      const curRow = await safeFirst(db, 'SELECT * FROM candidate_assigned_items WHERE id = ?', [id]);
      if (!curRow) throw new HttpError(404, 'NOT_FOUND', 'Assigned item not found');
      const cur = formatAssignedItem(curRow);
      const body = await readJson(request, 40000);
      await db.prepare(
        `UPDATE candidate_assigned_items SET
           target_scope = ?, target_user_id = ?, target_district = ?, target_exam_board = ?,
           item_type = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?,
           resource_url = ?, r2_file_key = ?, priority = ?, expires_at = ?, is_published = ?
         WHERE id = ?`
      ).bind(
        TARGET_SCOPES.includes(body.target_scope) ? body.target_scope : cur.target_scope,
        body.target_user_id !== undefined ? cleanStr(body.target_user_id, 120) : cur.target_user_id,
        body.target_district !== undefined ? cleanStr(body.target_district, 80) : cur.target_district,
        body.target_exam_board !== undefined ? cleanStr(body.target_exam_board, 80) : cur.target_exam_board,
        ASSIGNED_ITEM_TYPES.includes(body.item_type) ? body.item_type : cur.item_type,
        body.title_en !== undefined ? cleanStr(body.title_en, 180) || cur.title_en : cur.title_en,
        body.title_or !== undefined ? cleanStr(body.title_or, 180) : cur.title_or,
        body.summary_en !== undefined ? cleanStr(body.summary_en, 400) : cur.summary_en,
        body.summary_or !== undefined ? cleanStr(body.summary_or, 400) : cur.summary_or,
        body.resource_url !== undefined ? safeHref(body.resource_url) : cur.resource_url,
        body.r2_file_key !== undefined ? cleanStr(body.r2_file_key, 260) : cur.r2_file_key,
        PRIORITIES.includes(body.priority) ? body.priority : cur.priority,
        body.expires_at !== undefined ? cleanStr(body.expires_at, 30) : cur.expires_at,
        body.is_published !== undefined ? (body.is_published ? 1 : 0) : cur.is_published,
        id
      ).run();
      await audit(env, request, actor, 'candidate_hub.assigned_update', 'candidate_assigned_items', id);
      res = json({ ok: true, item: formatAssignedItem(await safeFirst(db, 'SELECT * FROM candidate_assigned_items WHERE id = ?', [id])) });
    } else if (id && sub === 'toggle' && method === 'POST') {
      const curRow = await safeFirst(db, 'SELECT is_published FROM candidate_assigned_items WHERE id = ?', [id]);
      if (!curRow) throw new HttpError(404, 'NOT_FOUND', 'Assigned item not found');
      const next = curRow.is_published ? 0 : 1;
      await db.prepare('UPDATE candidate_assigned_items SET is_published = ? WHERE id = ?').bind(next, id).run();
      await audit(env, request, actor, next ? 'candidate_hub.assigned_publish' : 'candidate_hub.assigned_unpublish', 'candidate_assigned_items', id);
      res = json({ ok: true, item: formatAssignedItem(await safeFirst(db, 'SELECT * FROM candidate_assigned_items WHERE id = ?', [id])) });
    } else if (id && !sub && method === 'DELETE') {
      await db.prepare('DELETE FROM candidate_assigned_items WHERE id = ?').bind(id).run();
      await audit(env, request, actor, 'candidate_hub.assigned_delete', 'candidate_assigned_items', id);
      res = json({ ok: true, deleted: id });
    }
  }

  // --- Document Vault Templates ---
  if (section === 'doc-templates') {
    if (!id && method === 'GET') {
      const rows = await safeAll(db, 'SELECT * FROM candidate_doc_templates ORDER BY sort_order ASC, id ASC');
      return json({ ok: true, items: rows.map(formatDocTemplate) });
    }
    if (!id && method === 'POST') {
      const body = await readJson(request, 20000);
      const titleEn = cleanStr(body.title_en, 160);
      if (!titleEn) throw validationError({ title_en: 'Document title (EN) is required.' });
      const maxRow = await safeFirst(db, 'SELECT COALESCE(MAX(sort_order), 0) AS m FROM candidate_doc_templates');
      const newId = `cdt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const docKey = makeKey(body.doc_key || titleEn, 'doc') + '_' + Math.random().toString(36).slice(2, 4);
      await db.prepare(
        `INSERT INTO candidate_doc_templates (id, doc_key, title_en, title_or, category, notes_en, notes_or, is_required, sort_order, is_published, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        newId, docKey, titleEn, cleanStr(body.title_or, 160), cleanStr(body.category || 'identity', 40),
        cleanStr(body.notes_en, 300), cleanStr(body.notes_or, 300),
        body.is_required === 0 || body.is_required === false ? 0 : 1,
        Number(body.sort_order) > 0 ? Number(body.sort_order) : Number((maxRow && maxRow.m) || 0) + 10,
        body.is_published === 0 || body.is_published === false ? 0 : 1
      ).run();
      await audit(env, request, actor, 'candidate_hub.doc_template_create', 'candidate_doc_templates', newId);
      res = json({ ok: true, item: formatDocTemplate(await safeFirst(db, 'SELECT * FROM candidate_doc_templates WHERE id = ?', [newId])) }, 201);
    } else if (id && !sub && (method === 'PUT' || method === 'PATCH')) {
      const curRow = await safeFirst(db, 'SELECT * FROM candidate_doc_templates WHERE id = ?', [id]);
      if (!curRow) throw new HttpError(404, 'NOT_FOUND', 'Document template not found');
      const cur = formatDocTemplate(curRow);
      const body = await readJson(request, 20000);
      await db.prepare(
        `UPDATE candidate_doc_templates SET
           title_en = ?, title_or = ?, category = ?, notes_en = ?, notes_or = ?,
           is_required = ?, sort_order = ?, is_published = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(
        body.title_en !== undefined ? cleanStr(body.title_en, 160) || cur.title_en : cur.title_en,
        body.title_or !== undefined ? cleanStr(body.title_or, 160) : cur.title_or,
        body.category !== undefined ? cleanStr(body.category, 40) : cur.category,
        body.notes_en !== undefined ? cleanStr(body.notes_en, 300) : cur.notes_en,
        body.notes_or !== undefined ? cleanStr(body.notes_or, 300) : cur.notes_or,
        body.is_required !== undefined ? (body.is_required ? 1 : 0) : cur.is_required,
        body.sort_order !== undefined ? Math.max(0, Number(body.sort_order) || 0) : cur.sort_order,
        body.is_published !== undefined ? (body.is_published ? 1 : 0) : cur.is_published,
        id
      ).run();
      await audit(env, request, actor, 'candidate_hub.doc_template_update', 'candidate_doc_templates', id);
      res = json({ ok: true, item: formatDocTemplate(await safeFirst(db, 'SELECT * FROM candidate_doc_templates WHERE id = ?', [id])) });
    } else if (id && sub === 'toggle' && method === 'POST') {
      const curRow = await safeFirst(db, 'SELECT is_published FROM candidate_doc_templates WHERE id = ?', [id]);
      if (!curRow) throw new HttpError(404, 'NOT_FOUND', 'Document template not found');
      const next = curRow.is_published ? 0 : 1;
      await db.prepare("UPDATE candidate_doc_templates SET is_published = ?, updated_at = datetime('now') WHERE id = ?").bind(next, id).run();
      await audit(env, request, actor, next ? 'candidate_hub.doc_template_publish' : 'candidate_hub.doc_template_unpublish', 'candidate_doc_templates', id);
      res = json({ ok: true, item: formatDocTemplate(await safeFirst(db, 'SELECT * FROM candidate_doc_templates WHERE id = ?', [id])) });
    } else if (id && sub === 'move' && method === 'POST') {
      const body = await readJson(request, 5000);
      const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
      if (!dir) throw validationError({ direction: 'direction must be up or down' });
      const all = await safeAll(db, 'SELECT id FROM candidate_doc_templates ORDER BY sort_order ASC, id ASC');
      const idx = all.findIndex(r => r.id === id);
      const swap = idx + dir;
      if (idx >= 0 && swap >= 0 && swap < all.length) {
        const order = all.map(r => r.id);
        [order[idx], order[swap]] = [order[swap], order[idx]];
        await db.batch(order.map((rid, n) => db.prepare("UPDATE candidate_doc_templates SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)));
      }
      await audit(env, request, actor, 'candidate_hub.doc_template_reorder', 'candidate_doc_templates', id);
      res = json({ ok: true, items: (await safeAll(db, 'SELECT * FROM candidate_doc_templates ORDER BY sort_order ASC, id ASC')).map(formatDocTemplate) });
    } else if (id && !sub && method === 'DELETE') {
      await db.prepare('DELETE FROM candidate_doc_templates WHERE id = ?').bind(id).run();
      await audit(env, request, actor, 'candidate_hub.doc_template_delete', 'candidate_doc_templates', id);
      res = json({ ok: true, deleted: id });
    }
  }

  if (!res) throw new HttpError(404, 'NOT_FOUND', 'Unknown candidate-hub studio route');
  if (isWrite && res.status >= 200 && res.status < 400) await invalidateHub(request);
  return res;
}
