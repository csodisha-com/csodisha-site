// Master Feature Registry Batch 1 (v125): Modules 01-04
// 01 All Discovered Features | 02 Page & Route Inventory | 03 Public UI Components | 04 Database Entities
// Security: Introspects D1 schema metadata & row counts only—never exposes raw table row contents.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import { nowIstIso } from './events-scheduling-batch1.js';

export const REG_SURFACE_LAYERS = ['public_pwa', 'admin_command_center', 'cloudflare_worker_api', 'd1_r2_storage'];
export const REG_DISCOVERY_SOURCES = ['master_navigation_scan', 'worker_router_ast', 'manual_architect_entry'];
export const REG_LIFECYCLE_STATES = ['production_live', 'beta_rollout', 'planned', 'deprecated'];

export const REG_ROUTE_KINDS = ['static_html_page', 'dynamic_worker_route', 'public_json_api', 'admin_rbac_api'];
export const REG_AUTH_REQS = ['public_open', 'candidate_session', 'admin_rbac_csrf'];
export const REG_CACHE_POLICIES = ['sw_stale_while_revalidate', 'edge_cached_invalidated', 'no_store_private'];
export const REG_AUDIT_STATUSES = ['verified_200', 'redirect_301', 'needs_review'];

export const REG_COMPONENT_STATUSES = ['active_live', 'refactoring', 'archived'];

const _reg1Ready = new WeakSet();

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

export function sanitizeRegText(raw, maxLen = 320) {
  const stripped = String(raw || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '');
  return cleanStr(stripped, maxLen);
}

export const REG_REV_TABLES = {
  '01': {
    table: 'reg_discovered_features',
    cols: [
      'feature_code', 'feature_name_en', 'feature_name_or', 'domain_suite', 'surface_layer',
      'discovery_source', 'has_admin_control', 'csp_compliant', 'lifecycle_state', 'release_tag'
    ]
  },
  '02': {
    table: 'reg_page_route_inventory',
    cols: [
      'route_path', 'file_or_handler', 'route_kind', 'auth_requirement',
      'edge_cache_policy', 'bilingual_ready', 'audit_status'
    ]
  },
  '03': {
    table: 'reg_public_ui_components',
    cols: [
      'component_code', 'component_name', 'asset_script_path', 'css_stylesheet_path',
      'csp_zero_inline_verified', 'wcag_aa_verified', 'used_on_pages_count', 'status'
    ]
  }
};

export async function snapshotRegRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = REG_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM reg_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('reg-rev');
  await db.prepare(
    `INSERT INTO reg_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    revId, moduleCode, entityId, nextVer, JSON.stringify(row),
    sanitizeRegText(changeNote, 200), actor?.email || actor?.userId || 'system'
  ).run();
  return { id: revId, version_num: nextVer };
}

function inferSuiteOwner(tableName) {
  if (tableName.startsWith('edu_')) return 'Educational Resources';
  if (tableName.startsWith('cat_') || tableName.startsWith('nav_')) return 'Categories & Navigation';
  if (tableName.startsWith('fmc_') || tableName.startsWith('file_') || tableName.startsWith('media_')) return 'Files, Media & Cloud';
  if (tableName.startsWith('pay_') || tableName.startsWith('fin_')) return 'Payments & Finance';
  if (tableName.startsWith('usr_') || tableName === 'users' || tableName === 'sessions') return 'Users, Roles & Community';
  if (tableName.startsWith('ana_') || tableName.startsWith('tel_')) return 'Analytics, Telemetry & User Feedback Intelligence';
  if (tableName.startsWith('comm_') || tableName.startsWith('notif_')) return 'Communications, Alerts & Candidate Notifications';
  if (tableName.startsWith('mkt_') || tableName.startsWith('ads_')) return 'Marketing & Advertising';
  if (tableName.startsWith('seo_')) return 'SEO, Search & Discovery';
  if (tableName.startsWith('evt_')) return 'Events & Scheduling';
  if (tableName.startsWith('int_')) return 'Integrations, Webhooks & Cloudflare Edge Suite';
  if (tableName.startsWith('sec_') || tableName.startsWith('rbac_') || tableName === 'audit_log' || tableName === 'admin_rate_limits') return 'Security, Privacy & RBAC Suite';
  if (tableName.startsWith('ops_')) return 'Operations, Backups & Disaster Recovery Suite';
  if (tableName.startsWith('cfg_')) return 'Settings & Configuration';
  if (tableName.startsWith('reg_')) return 'Master Feature Registry';
  if (tableName.startsWith('job_')) return 'Jobs & Careers Directory';
  if (tableName.startsWith('sch_')) return 'Schemes & Benefits Directory';
  if (tableName.startsWith('lib_') || tableName.startsWith('study_')) return 'Study Library Directory';
  if (tableName.startsWith('com_')) return 'Community Directory';
  if (tableName.startsWith('cms_') || tableName.startsWith('page_')) return 'Content & Publishing';
  return 'Platform Core';
}

function inferMigrationFile(tableName) {
  if (tableName.startsWith('reg_implementation_') || tableName.startsWith('reg_regression_') || tableName.startsWith('reg_feature_doc')) return 'migrations/0127_master_feature_registry_batch3.sql';
  if (tableName.startsWith('reg_api_') || tableName.startsWith('reg_admin_') || tableName.startsWith('reg_missing_') || tableName.startsWith('reg_feature_dep')) return 'migrations/0126_master_feature_registry_batch2.sql';
  if (tableName.startsWith('reg_')) return 'migrations/0125_master_feature_registry_batch1.sql';
  if (tableName.startsWith('cfg_')) return 'migrations/0121_0124_settings_configuration.sql';
  if (tableName.startsWith('int_')) return 'migrations/0118_0120_integrations_edge.sql';
  if (tableName.startsWith('evt_')) return 'migrations/0115_0117_events_scheduling.sql';
  if (tableName.startsWith('seo_')) return 'migrations/0111_0114_seo_search_discovery.sql';
  if (tableName.startsWith('edu_')) return 'migrations/0078_0083_edu_resources.sql';
  return 'migrations/auto_ensure_runtime.sql';
}

function inferDpdpPolicy(tableName) {
  if (tableName === 'users' || tableName === 'sessions' || tableName.includes('token') || tableName.includes('webhook') || tableName.includes('sms') || tableName.includes('payment')) {
    return 'sha256_hashed_only';
  }
  if (tableName.includes('audit') || tableName.includes('log')) {
    return 'audit_365d_retention';
  }
  return 'non_pii_public_catalog';
}

/* ================= SCHEMA & SEEDING ================= */
export async function ensureMasterFeatureRegistryBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_reg1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS reg_discovered_features (
      id TEXT PRIMARY KEY,
      feature_code TEXT NOT NULL UNIQUE,
      feature_name_en TEXT NOT NULL,
      feature_name_or TEXT NOT NULL DEFAULT '',
      domain_suite TEXT NOT NULL DEFAULT 'Educational Resources',
      surface_layer TEXT NOT NULL DEFAULT 'admin_command_center',
      discovery_source TEXT NOT NULL DEFAULT 'master_navigation_scan',
      has_admin_control INTEGER NOT NULL DEFAULT 1,
      csp_compliant INTEGER NOT NULL DEFAULT 1,
      lifecycle_state TEXT NOT NULL DEFAULT 'production_live',
      release_tag TEXT NOT NULL DEFAULT 'v125',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_ftr_suite_layer ON reg_discovered_features(domain_suite, surface_layer, lifecycle_state)`,

    `CREATE TABLE IF NOT EXISTS reg_page_route_inventory (
      id TEXT PRIMARY KEY,
      route_path TEXT NOT NULL UNIQUE,
      file_or_handler TEXT NOT NULL DEFAULT '',
      route_kind TEXT NOT NULL DEFAULT 'static_html_page',
      auth_requirement TEXT NOT NULL DEFAULT 'public_open',
      edge_cache_policy TEXT NOT NULL DEFAULT 'sw_stale_while_revalidate',
      bilingual_ready INTEGER NOT NULL DEFAULT 1,
      audit_status TEXT NOT NULL DEFAULT 'verified_200',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_rte_kind_auth ON reg_page_route_inventory(route_kind, auth_requirement, audit_status)`,

    `CREATE TABLE IF NOT EXISTS reg_public_ui_components (
      id TEXT PRIMARY KEY,
      component_code TEXT NOT NULL UNIQUE,
      component_name TEXT NOT NULL,
      asset_script_path TEXT NOT NULL DEFAULT '',
      css_stylesheet_path TEXT NOT NULL DEFAULT '',
      csp_zero_inline_verified INTEGER NOT NULL DEFAULT 1,
      wcag_aa_verified INTEGER NOT NULL DEFAULT 1,
      used_on_pages_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active_live',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_cmp_status ON reg_public_ui_components(status)`,

    `CREATE TABLE IF NOT EXISTS reg_database_entities (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL UNIQUE,
      suite_owner TEXT NOT NULL DEFAULT 'Platform Core',
      migration_file TEXT NOT NULL DEFAULT '',
      column_count INTEGER NOT NULL DEFAULT 0,
      live_row_count INTEGER NOT NULL DEFAULT 0,
      contains_pii_or_hashes INTEGER NOT NULL DEFAULT 0,
      dpdp_retention_policy TEXT NOT NULL DEFAULT 'non_pii_public_catalog',
      schema_health TEXT NOT NULL DEFAULT 'synced_verified',
      last_introspected_at TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_db_suite_health ON reg_database_entities(suite_owner, schema_health)`,

    `CREATE TABLE IF NOT EXISTS reg_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_rev_entity ON reg_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  await seedMasterFeatureRegistryBatch1(db);
  _reg1Ready.add(db);
}

async function seedMasterFeatureRegistryBatch1(db) {
  const ftrCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_discovered_features`).first();
  if (Number(ftrCnt?.n || 0) === 0) {
    const features = [
      ['reg-ftr-001', 'FTR-001', 'State Competitive Exam Calendar', 'ରାଜ୍ୟ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର', 'Events & Scheduling', 'admin_command_center', 'master_navigation_scan', 1, 1, 'production_live', 'v115'],
      ['reg-ftr-002', 'FTR-002', 'RFC 5545 .ics Calendar Feed Engine', 'RFC 5545 .ics କ୍ୟାଲେଣ୍ଡର ଫିଡ୍', 'Events & Scheduling', 'cloudflare_worker_api', 'worker_router_ast', 1, 1, 'production_live', 'v117'],
      ['reg-ftr-003', 'FTR-003', 'Outbound HMAC-SHA256 Webhook Dispatcher', 'ଆଉଟବାଉଣ୍ଡ HMAC-SHA256 ୱେବହୁକ୍', 'Integrations & Edge', 'cloudflare_worker_api', 'worker_router_ast', 1, 1, 'production_live', 'v118'],
      ['reg-ftr-004', 'FTR-004', 'Public API Gateway & Token Rate Limiter', 'ପବ୍ଲିକ୍ API ଗେଟୱେ ଏବଂ ରେଟ୍ ଲିମିଟର୍', 'Integrations & Edge', 'cloudflare_worker_api', 'worker_router_ast', 1, 1, 'production_live', 'v119'],
      ['reg-ftr-005', 'FTR-005', 'Zero-PII TRAI DLT SMS & OTP Engine', 'ଜିରୋ-PII TRAI DLT SMS ଏବଂ OTP ଇଞ୍ଜିନ୍', 'Integrations & Edge', 'd1_r2_storage', 'master_navigation_scan', 1, 1, 'production_live', 'v120'],
      ['reg-ftr-006', 'FTR-006', 'DPDP Act 2023 Consent & Localization Config', 'DPDP ଆଇନ ୨୦୨୩ ସମ୍ମତି ଏବଂ ସ୍ଥାନୀୟକରଣ', 'Settings & Configuration', 'admin_command_center', 'master_navigation_scan', 1, 1, 'production_live', 'v124'],
      ['reg-ftr-007', 'FTR-007', 'Offline PWA Study Pack & Service Worker', 'ଅଫଲାଇନ୍ PWA ଅଧ୍ୟୟନ ପ୍ୟାକ୍', 'Candidate Portal', 'public_pwa', 'manual_architect_entry', 1, 1, 'production_live', 'v124']
    ];
    for (const r of features) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_discovered_features
         (id, feature_code, feature_name_en, feature_name_or, domain_suite, surface_layer, discovery_source, has_admin_control, csp_compliant, lifecycle_state, release_tag)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const rteCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_page_route_inventory`).first();
  if (Number(rteCnt?.n || 0) === 0) {
    const routes = [
      ['reg-rte-001', '/', 'index.html', 'static_html_page', 'public_open', 'sw_stale_while_revalidate', 1, 'verified_200'],
      ['reg-rte-002', '/study-library/', 'study-library/index.html', 'static_html_page', 'public_open', 'sw_stale_while_revalidate', 1, 'verified_200'],
      ['reg-rte-003', '/jobs-careers/', 'jobs-careers/index.html', 'static_html_page', 'public_open', 'sw_stale_while_revalidate', 1, 'verified_200'],
      ['reg-rte-004', '/schemes/', 'schemes/index.html', 'static_html_page', 'public_open', 'sw_stale_while_revalidate', 1, 'verified_200'],
      ['reg-rte-005', '/admin/', 'admin/index.html', 'static_html_page', 'admin_rbac_csrf', 'no_store_private', 1, 'verified_200'],
      ['reg-rte-006', '/api/events/upcoming', '_worker.js -> handlePublicEventsUpcomingBatch2Api', 'public_json_api', 'public_open', 'edge_cached_invalidated', 1, 'verified_200'],
      ['reg-rte-007', '/api/config/public', '_worker.js -> handlePublicSiteConfigBatch4Api', 'public_json_api', 'public_open', 'edge_cached_invalidated', 1, 'verified_200'],
      ['reg-rte-008', '/api/admin/registry/overview', 'functions/api/admin/_router.js', 'admin_rbac_api', 'admin_rbac_csrf', 'no_store_private', 1, 'verified_200']
    ];
    for (const r of routes) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_page_route_inventory
         (id, route_path, file_or_handler, route_kind, auth_requirement, edge_cache_policy, bilingual_ready, audit_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const cmpCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_public_ui_components`).first();
  if (Number(cmpCnt?.n || 0) === 0) {
    const comps = [
      ['reg-cmp-001', 'CMP-001', 'Bilingual EN/OR Switcher Pill', 'assets/shared-header.js', 'assets/style.css', 1, 1, 49, 'active_live'],
      ['reg-cmp-002', 'CMP-002', 'Live Exam Countdown Ticker', 'assets/js/cso-countdown.js', 'assets/css/public-content.css', 1, 1, 18, 'active_live'],
      ['reg-cmp-003', 'CMP-003', 'Odisha Scheme Eligibility Card', 'assets/js/cso-global-enhancements.js', 'assets/css/public-content.css', 1, 1, 12, 'active_live'],
      ['reg-cmp-004', 'CMP-004', 'PYQ PDF Reader & Bookmark Drawer', 'assets/js/bookmark-manager.js', 'study-library/assets/dashboard.css', 1, 1, 24, 'active_live'],
      ['reg-cmp-005', 'CMP-005', 'Offline PWA Sync Status Toast', 'assets/js/candidate-sync.js', 'assets/css/student-dashboard-bp.css', 1, 1, 16, 'active_live'],
      ['reg-cmp-006', 'CMP-006', 'Accessible Skip-to-Content & Breadcrumb Nav', 'assets/shared-header.js', 'assets/style.css', 1, 1, 49, 'active_live']
    ];
    for (const r of comps) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_public_ui_components
         (id, component_code, component_name, asset_script_path, css_stylesheet_path, csp_zero_inline_verified, wcag_aa_verified, used_on_pages_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const dbCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_database_entities`).first();
  if (Number(dbCnt?.n || 0) === 0) {
    const now = nowIstIso();
    const entities = [
      ['reg-db-001', 'evt_exam_calendar', 'Events & Scheduling', 'migrations/0115_events_scheduling_batch1.sql', 15, 4, 0, 'non_pii_public_catalog', 'synced_verified', now],
      ['reg-db-002', 'int_outbound_webhooks', 'Integrations & Edge', 'migrations/0118_integrations_webhooks_edge_batch1.sql', 14, 2, 1, 'sha256_hashed_only', 'synced_verified', now],
      ['reg-db-003', 'cfg_general_settings', 'Settings & Configuration', 'migrations/0121_settings_configuration_batch1.sql', 15, 1, 0, 'non_pii_public_catalog', 'synced_verified', now],
      ['reg-db-004', 'reg_discovered_features', 'Master Feature Registry', 'migrations/0125_master_feature_registry_batch1.sql', 12, 7, 0, 'non_pii_public_catalog', 'synced_verified', now]
    ];
    for (const r of entities) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_database_entities
         (id, table_name, suite_owner, migration_file, column_count, live_row_count, contains_pii_or_hashes, dpdp_retention_policy, schema_health, last_introspected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }
}

/* ================= OVERVIEW (MODULES 01-11) ================= */
export async function getMasterFeatureRegistryBatch1Overview(env) {
  await ensureMasterFeatureRegistryBatch1Schema(env.DB);
  const [ftrRows, rteRows, cmpRows, dbRows] = await Promise.all([
    env.DB.prepare(`SELECT lifecycle_state, csp_compliant FROM reg_discovered_features`).all(),
    env.DB.prepare(`SELECT audit_status FROM reg_page_route_inventory`).all(),
    env.DB.prepare(`SELECT status, csp_zero_inline_verified FROM reg_public_ui_components WHERE status != 'archived'`).all(),
    env.DB.prepare(`SELECT schema_health FROM reg_database_entities`).all()
  ]);

  const ftrs = ftrRows.results || [];
  const rtes = rteRows.results || [];
  const cmps = cmpRows.results || [];
  const dbs = dbRows.results || [];

  const titles = [
    ['01', 'module-19-001', 'All Discovered Features', 'active', ftrs.length],
    ['02', 'module-19-002', 'Page & Route Inventory', 'active', rtes.length],
    ['03', 'module-19-003', 'Public UI Components', 'active', cmps.length],
    ['04', 'module-19-004', 'Database Entities', 'active', dbs.length],
    ['05', 'module-19-005', 'API Endpoints', 'queued', 0],
    ['06', 'module-19-006', 'Admin Coverage Matrix', 'queued', 0],
    ['07', 'module-19-007', 'Missing Admin Controls', 'queued', 0],
    ['08', 'module-19-008', 'Feature Dependencies', 'queued', 0],
    ['09', 'module-19-009', 'Implementation Status', 'queued', 0],
    ['10', 'module-19-010', 'Regression Test Coverage', 'queued', 0],
    ['11', 'module-19-011', 'Feature Documentation', 'queued', 0]
  ];
  const modules = {};
  for (const [code, id, title, status, count] of titles) {
    modules[code] = { code, id, title, status, count };
  }

  return {
    total_discovered_features: ftrs.length,
    production_live_features: ftrs.filter(f => f.lifecycle_state === 'production_live').length,
    verified_routes_count: rtes.filter(r => r.audit_status === 'verified_200').length,
    csp_verified_components_count: cmps.filter(c => Number(c.csp_zero_inline_verified) === 1).length,
    introspected_tables_count: dbs.length,
    modules
  };
}

/* ================= MODULE 01: ALL DISCOVERED FEATURES ================= */
async function handleFeatures(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const suite = sanitizeRegText(url.searchParams.get('domain_suite') || '', 80);
    const layer = sanitizeRegText(url.searchParams.get('surface_layer') || '', 60);
    const state = sanitizeRegText(url.searchParams.get('lifecycle_state') || '', 40);
    const q = sanitizeRegText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (suite) { where.push(`domain_suite = ?`); args.push(suite); }
    if (layer) { where.push(`surface_layer = ?`); args.push(layer); }
    if (state) { where.push(`lifecycle_state = ?`); args.push(state); }
    else { where.push(`lifecycle_state != 'deprecated'`); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(feature_name_en LIKE ? ESCAPE '\\' OR feature_name_or LIKE ? ESCAPE '\\' OR feature_code LIKE ? ESCAPE '\\' OR domain_suite LIKE ? ESCAPE '\\')`);
      args.push(like, like, like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM reg_discovered_features ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY feature_code ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 32000);
    const errors = {};
    const feature_code = sanitizeRegText(b.feature_code || `FTR-${Math.floor(100 + Math.random() * 900)}`, 40);
    const feature_name_en = sanitizeRegText(b.feature_name_en, 200);
    const feature_name_or = sanitizeRegText(b.feature_name_or, 200);
    const domain_suite = sanitizeRegText(b.domain_suite || 'Platform Core', 100);
    const surface_layer = pick(b.surface_layer, REG_SURFACE_LAYERS, 'surface_layer', errors, 'admin_command_center');
    const discovery_source = pick(b.discovery_source, REG_DISCOVERY_SOURCES, 'discovery_source', errors, 'manual_architect_entry');
    const has_admin_control = b.has_admin_control === false || b.has_admin_control === 0 ? 0 : 1;
    const csp_compliant = b.csp_compliant === false || b.csp_compliant === 0 ? 0 : 1;
    const lifecycle_state = pick(b.lifecycle_state, REG_LIFECYCLE_STATES, 'lifecycle_state', errors, 'production_live');
    const release_tag = sanitizeRegText(b.release_tag || 'v125', 24);
    if (!feature_name_en) errors.feature_name_en = 'feature_name_en is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('reg-ftr');
    await db.prepare(
      `INSERT INTO reg_discovered_features
       (id, feature_code, feature_name_en, feature_name_or, domain_suite, surface_layer, discovery_source, has_admin_control, csp_compliant, lifecycle_state, release_tag, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, feature_code, feature_name_en, feature_name_or, domain_suite, surface_layer, discovery_source, has_admin_control, csp_compliant, lifecycle_state, release_tag).run();

    await snapshotRegRevision(db, '01', newId, actor, 'create feature');
    await audit(env, request, actor, 'registry.features.create', 'reg_discovered_features', newId, { feature_code });
    const item = await db.prepare(`SELECT * FROM reg_discovered_features WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM reg_discovered_features WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feature not found');
    const b = await readJson(request, 32000);
    const errors = {};
    const feature_name_en = sanitizeRegText(b.feature_name_en ?? existing.feature_name_en, 200);
    const feature_name_or = sanitizeRegText(b.feature_name_or ?? existing.feature_name_or, 200);
    const domain_suite = sanitizeRegText(b.domain_suite ?? existing.domain_suite, 100);
    const surface_layer = pick(b.surface_layer ?? existing.surface_layer, REG_SURFACE_LAYERS, 'surface_layer', errors, existing.surface_layer);
    const lifecycle_state = pick(b.lifecycle_state ?? existing.lifecycle_state, REG_LIFECYCLE_STATES, 'lifecycle_state', errors, existing.lifecycle_state);
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE reg_discovered_features SET feature_name_en=?, feature_name_or=?, domain_suite=?, surface_layer=?, lifecycle_state=?, updated_at=datetime('now') WHERE id=?`
    ).bind(feature_name_en, feature_name_or, domain_suite, surface_layer, lifecycle_state, id).run();

    await snapshotRegRevision(db, '01', id, actor, 'update feature');
    const item = await db.prepare(`SELECT * FROM reg_discovered_features WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM reg_discovered_features WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feature not found');
    const b = await readJson(request, 8000);
    const errors = {};
    const lifecycle_state = pick(b.lifecycle_state || b.status, REG_LIFECYCLE_STATES, 'lifecycle_state', errors, null);
    if (!lifecycle_state) errors.lifecycle_state = 'lifecycle_state is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE reg_discovered_features SET lifecycle_state=?, updated_at=datetime('now') WHERE id=?`).bind(lifecycle_state, id).run();
    await snapshotRegRevision(db, '01', id, actor, `status:${lifecycle_state}`);
    const item = await db.prepare(`SELECT * FROM reg_discovered_features WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'DELETE' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM reg_discovered_features WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feature not found');
    await db.prepare(`UPDATE reg_discovered_features SET lifecycle_state='deprecated', updated_at=datetime('now') WHERE id=?`).bind(id).run();
    await snapshotRegRevision(db, '01', id, actor, 'deprecate');
    return json({ ok: true, id, lifecycle_state: 'deprecated' });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown features route');
}

/* ================= MODULE 02: PAGE & ROUTE INVENTORY ================= */
async function handleRoutes(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const kind = sanitizeRegText(url.searchParams.get('route_kind') || '', 40);
    const auth = sanitizeRegText(url.searchParams.get('auth_requirement') || '', 40);
    const q = sanitizeRegText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (kind) { where.push(`route_kind = ?`); args.push(kind); }
    if (auth) { where.push(`auth_requirement = ?`); args.push(auth); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(route_path LIKE ? ESCAPE '\\' OR file_or_handler LIKE ? ESCAPE '\\')`);
      args.push(like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM reg_page_route_inventory ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY route_path ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 16000);
    const errors = {};
    const route_path = sanitizeRegText(b.route_path, 200);
    const file_or_handler = sanitizeRegText(b.file_or_handler, 200);
    const route_kind = pick(b.route_kind, REG_ROUTE_KINDS, 'route_kind', errors, 'static_html_page');
    const auth_requirement = pick(b.auth_requirement, REG_AUTH_REQS, 'auth_requirement', errors, 'public_open');
    const edge_cache_policy = pick(b.edge_cache_policy, REG_CACHE_POLICIES, 'edge_cache_policy', errors, 'sw_stale_while_revalidate');
    const bilingual_ready = b.bilingual_ready === false || b.bilingual_ready === 0 ? 0 : 1;
    const audit_status = pick(b.audit_status, REG_AUDIT_STATUSES, 'audit_status', errors, 'verified_200');
    if (!route_path) errors.route_path = 'route_path is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('reg-rte');
    await db.prepare(
      `INSERT INTO reg_page_route_inventory
       (id, route_path, file_or_handler, route_kind, auth_requirement, edge_cache_policy, bilingual_ready, audit_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, route_path, file_or_handler, route_kind, auth_requirement, edge_cache_policy, bilingual_ready, audit_status).run();

    await snapshotRegRevision(db, '02', newId, actor, 'create route');
    await audit(env, request, actor, 'registry.routes.create', 'reg_page_route_inventory', newId, { route_path });
    const item = await db.prepare(`SELECT * FROM reg_page_route_inventory WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM reg_page_route_inventory WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Route not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const file_or_handler = sanitizeRegText(b.file_or_handler ?? existing.file_or_handler, 200);
    const route_kind = pick(b.route_kind ?? existing.route_kind, REG_ROUTE_KINDS, 'route_kind', errors, existing.route_kind);
    const auth_requirement = pick(b.auth_requirement ?? existing.auth_requirement, REG_AUTH_REQS, 'auth_requirement', errors, existing.auth_requirement);
    const edge_cache_policy = pick(b.edge_cache_policy ?? existing.edge_cache_policy, REG_CACHE_POLICIES, 'edge_cache_policy', errors, existing.edge_cache_policy);
    const audit_status = pick(b.audit_status ?? existing.audit_status, REG_AUDIT_STATUSES, 'audit_status', errors, existing.audit_status);
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE reg_page_route_inventory SET file_or_handler=?, route_kind=?, auth_requirement=?, edge_cache_policy=?, audit_status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(file_or_handler, route_kind, auth_requirement, edge_cache_policy, audit_status, id).run();

    await snapshotRegRevision(db, '02', id, actor, 'update route');
    const item = await db.prepare(`SELECT * FROM reg_page_route_inventory WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM reg_page_route_inventory WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Route not found');
    const b = await readJson(request, 8000);
    const errors = {};
    const audit_status = pick(b.audit_status || b.status, REG_AUDIT_STATUSES, 'audit_status', errors, null);
    if (!audit_status) errors.audit_status = 'audit_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE reg_page_route_inventory SET audit_status=?, updated_at=datetime('now') WHERE id=?`).bind(audit_status, id).run();
    await snapshotRegRevision(db, '02', id, actor, `status:${audit_status}`);
    const item = await db.prepare(`SELECT * FROM reg_page_route_inventory WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown routes route');
}

/* ================= MODULE 03: PUBLIC UI COMPONENTS ================= */
async function handleUiComponents(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const status = sanitizeRegText(url.searchParams.get('status') || '', 40);
    const where = status ? [`status = ?`] : [`status != 'archived'`];
    const args = status ? [status] : [];
    const { results } = await db.prepare(
      `SELECT * FROM reg_public_ui_components WHERE ${where.join(' AND ')} ORDER BY component_code ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 16000);
    const errors = {};
    const component_code = sanitizeRegText(b.component_code || `CMP-${Math.floor(100 + Math.random() * 900)}`, 40);
    const component_name = sanitizeRegText(b.component_name, 160);
    const asset_script_path = sanitizeRegText(b.asset_script_path, 200);
    const css_stylesheet_path = sanitizeRegText(b.css_stylesheet_path, 200);
    const csp_zero_inline_verified = b.csp_zero_inline_verified === false || b.csp_zero_inline_verified === 0 ? 0 : 1;
    const wcag_aa_verified = b.wcag_aa_verified === false || b.wcag_aa_verified === 0 ? 0 : 1;
    const used_on_pages_count = Math.max(0, parseInt(b.used_on_pages_count ?? 1, 10) || 1);
    const status = pick(b.status, REG_COMPONENT_STATUSES, 'status', errors, 'active_live');
    if (!component_name) errors.component_name = 'component_name is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('reg-cmp');
    await db.prepare(
      `INSERT INTO reg_public_ui_components
       (id, component_code, component_name, asset_script_path, css_stylesheet_path, csp_zero_inline_verified, wcag_aa_verified, used_on_pages_count, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, component_code, component_name, asset_script_path, css_stylesheet_path, csp_zero_inline_verified, wcag_aa_verified, used_on_pages_count, status).run();

    await snapshotRegRevision(db, '03', newId, actor, 'create component');
    await audit(env, request, actor, 'registry.ui_components.create', 'reg_public_ui_components', newId, { component_code });
    const item = await db.prepare(`SELECT * FROM reg_public_ui_components WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM reg_public_ui_components WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'UI component not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const component_name = sanitizeRegText(b.component_name ?? existing.component_name, 160);
    const asset_script_path = sanitizeRegText(b.asset_script_path ?? existing.asset_script_path, 200);
    const css_stylesheet_path = sanitizeRegText(b.css_stylesheet_path ?? existing.css_stylesheet_path, 200);
    const status = pick(b.status ?? existing.status, REG_COMPONENT_STATUSES, 'status', errors, existing.status);
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE reg_public_ui_components SET component_name=?, asset_script_path=?, css_stylesheet_path=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(component_name, asset_script_path, css_stylesheet_path, status, id).run();

    await snapshotRegRevision(db, '03', id, actor, 'update component');
    const item = await db.prepare(`SELECT * FROM reg_public_ui_components WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM reg_public_ui_components WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'UI component not found');
    const b = await readJson(request, 8000);
    const errors = {};
    const status = pick(b.status, REG_COMPONENT_STATUSES, 'status', errors, null);
    if (!status) errors.status = 'status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE reg_public_ui_components SET status=?, updated_at=datetime('now') WHERE id=?`).bind(status, id).run();
    await snapshotRegRevision(db, '03', id, actor, `status:${status}`);
    const item = await db.prepare(`SELECT * FROM reg_public_ui_components WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown ui-components route');
}

/* ================= MODULE 04: LIVE D1 SCHEMA INTROSPECTION ================= */
async function handleDbEntities(request, env, actor, id) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const suite = sanitizeRegText(url.searchParams.get('suite_owner') || '', 80);
    const where = suite ? [`suite_owner = ?`] : [];
    const args = suite ? [suite] : [];
    const { results } = await db.prepare(
      `SELECT * FROM reg_database_entities ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY suite_owner ASC, table_name ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && id === 'introspect-live-d1') {
    const tblsRes = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`
    ).all();
    const tableNames = (tblsRes.results || []).map(r => r.name).filter(n => /^[a-zA-Z0-9_]+$/.test(n));
    const ts = nowIstIso();

    for (const tbl of tableNames) {
      const colsRes = await db.prepare(`PRAGMA table_info("${tbl}")`).all();
      const colCount = (colsRes.results || []).length;
      const cntRow = await db.prepare(`SELECT COUNT(*) AS n FROM "${tbl}"`).first();
      const rowCount = Number(cntRow?.n || 0);
      const suite = inferSuiteOwner(tbl);
      const migFile = inferMigrationFile(tbl);
      const dpdp = inferDpdpPolicy(tbl);
      const hasPii = dpdp === 'sha256_hashed_only' ? 1 : 0;

      await db.prepare(
        `INSERT INTO reg_database_entities
         (id, table_name, suite_owner, migration_file, column_count, live_row_count, contains_pii_or_hashes, dpdp_retention_policy, schema_health, last_introspected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced_verified', ?)
         ON CONFLICT(table_name) DO UPDATE SET
           suite_owner = excluded.suite_owner,
           migration_file = CASE WHEN COALESCE(reg_database_entities.migration_file, '') = '' THEN excluded.migration_file ELSE reg_database_entities.migration_file END,
           column_count = excluded.column_count,
           live_row_count = excluded.live_row_count,
           contains_pii_or_hashes = excluded.contains_pii_or_hashes,
           dpdp_retention_policy = excluded.dpdp_retention_policy,
           schema_health = 'synced_verified',
           last_introspected_at = excluded.last_introspected_at`
      ).bind(`reg-db-${tbl}`, tbl, suite, migFile, colCount, rowCount, hasPii, dpdp, ts).run();
    }

    await audit(env, request, actor, 'registry.db_entities.introspect', 'reg_database_entities', 'all', { tables_introspected: tableNames.length });
    const { results } = await db.prepare(`SELECT * FROM reg_database_entities ORDER BY suite_owner ASC, table_name ASC`).all();
    const items = results || [];
    const suites_covered = new Set(items.map(i => i.suite_owner)).size;
    return json({ ok: true, tables_introspected: tableNames.length, suites_covered, introspected_at_ist: ts, items });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown db-entities route');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleRegRevisions(request, env, actor, sub) {
  const db = env.DB;
  const url = new URL(request.url);
  if (request.method === 'GET' && !sub) {
    const moduleCode = sanitizeRegText(url.searchParams.get('module_code') || '', 10);
    const entityId = sanitizeRegText(url.searchParams.get('entity_id') || '', 80);
    const where = [];
    const args = [];
    if (moduleCode) { where.push(`module_code = ?`); args.push(moduleCode); }
    if (entityId) { where.push(`entity_id = ?`); args.push(entityId); }
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM reg_revisions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY version_num DESC LIMIT 40`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (request.method === 'POST' && sub === 'rollback') {
    const b = await readJson(request, 16000);
    const revId = sanitizeRegText(b.revision_id, 80);
    if (!revId) return validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM reg_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = REG_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', 'Revision rollback unsupported for module');

    let snap = {};
    try { snap = JSON.parse(rev.snapshot_json); } catch { throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid snapshot JSON'); }
    const setSql = cfg.cols.map(c => `${c} = ?`).join(', ');
    const vals = cfg.cols.map(c => snap[c] ?? '');
    await db.prepare(`UPDATE ${cfg.table} SET ${setSql}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, rev.entity_id).run();

    await snapshotRegRevision(db, rev.module_code, rev.entity_id, actor, `rollback to v${rev.version_num}`);
    await audit(env, request, actor, 'registry.revisions.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    const restored = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(rev.entity_id).first();
    return json({ ok: true, restored });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown registry revisions route');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleMasterFeatureRegistryBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureMasterFeatureRegistryBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') {
    return json(await getMasterFeatureRegistryBatch1Overview(env));
  }
  if (id === 'features') return handleFeatures(request, env, actor, sub, extra);
  if (id === 'routes') return handleRoutes(request, env, actor, sub, extra);
  if (id === 'ui-components') return handleUiComponents(request, env, actor, sub, extra);
  if (id === 'db-entities') return handleDbEntities(request, env, actor, sub);
  if (id === 'revisions') return handleRegRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown registry admin route');
}
