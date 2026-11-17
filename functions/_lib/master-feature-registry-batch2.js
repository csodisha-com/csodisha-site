// Master Feature Registry Batch 2 (v126): Modules 05-08
// 05 API Endpoints | 06 Admin Coverage Matrix | 07 Missing Admin Controls | 08 Feature Dependencies
// Security: Cycle detection (400 on self-loop or 2-node cycle); zero secrets in endpoint metadata.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { likeEscape } from './validate.js';
import {
  REG_REV_TABLES,
  ensureMasterFeatureRegistryBatch1Schema,
  getMasterFeatureRegistryBatch1Overview,
  sanitizeRegText,
  snapshotRegRevision
} from './master-feature-registry-batch1.js';

export const REG_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const REG_AUTH_GUARDS = ['admin_rbac_csrf', 'hmac_signature', 'public_edge_cached', 'public_rate_limited'];
export const REG_CACHE_STRATEGIES = ['no_store', 'edge_cache_invalidated', 'sw_stale_while_revalidate'];
export const REG_RATE_TIERS = ['admin_internal', 'public_60_rpm', 'webhook_burst'];
export const REG_CONTRACT_STATUSES = ['verified_live', 'deprecated', 'needs_audit'];

export const REG_SEVERITY_TIERS = ['p1_high', 'p2_medium', 'p3_enhancement'];
export const REG_REMEDIATION_STATUSES = ['open_gap', 'in_development', 'resolved_wired', 'accepted_intentional'];

export const REG_DEP_TYPES = ['requires_d1_schema', 'invalidates_edge_cache', 'consumes_public_config', 'triggers_webhook_alert'];
export const REG_DEP_HEALTH = ['healthy_verified', 'degraded_warning', 'broken_link'];

const _reg2Ready = new WeakSet();

REG_REV_TABLES['05'] = {
  table: 'reg_api_endpoints',
  cols: [
    'endpoint_code', 'http_method', 'endpoint_path', 'domain_suite',
    'auth_guard', 'cache_strategy', 'rate_limit_tier', 'contract_status'
  ]
};
REG_REV_TABLES['06'] = {
  table: 'reg_admin_coverage_matrix',
  cols: [
    'suite_code', 'suite_name', 'total_modules_count', 'implemented_modules_count',
    'd1_backed_count', 'csp_compliant_count', 'coverage_pct', 'release_range', 'matrix_status'
  ]
};
REG_REV_TABLES['07'] = {
  table: 'reg_missing_controls',
  cols: [
    'gap_code', 'surface_area', 'domain_suite', 'severity_tier',
    'gap_description_en', 'recommended_module_target', 'remediation_status', 'resolved_by'
  ]
};
REG_REV_TABLES['08'] = {
  table: 'reg_feature_dependencies',
  cols: [
    'dep_code', 'source_feature_code', 'source_feature_name', 'target_feature_code',
    'target_feature_name', 'dependency_type', 'is_critical_path', 'health_status'
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

/* ================= SCHEMA & SEEDING ================= */
export async function ensureMasterFeatureRegistryBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureMasterFeatureRegistryBatch1Schema(db);
  if (_reg2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS reg_api_endpoints (
      id TEXT PRIMARY KEY,
      endpoint_code TEXT NOT NULL UNIQUE,
      http_method TEXT NOT NULL DEFAULT 'GET',
      endpoint_path TEXT NOT NULL,
      domain_suite TEXT NOT NULL DEFAULT 'Public Edge APIs',
      auth_guard TEXT NOT NULL DEFAULT 'admin_rbac_csrf',
      cache_strategy TEXT NOT NULL DEFAULT 'no_store',
      rate_limit_tier TEXT NOT NULL DEFAULT 'admin_internal',
      contract_status TEXT NOT NULL DEFAULT 'verified_live',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_api_method_auth ON reg_api_endpoints(http_method, auth_guard, contract_status)`,

    `CREATE TABLE IF NOT EXISTS reg_admin_coverage_matrix (
      id TEXT PRIMARY KEY,
      suite_code TEXT NOT NULL UNIQUE,
      suite_name TEXT NOT NULL,
      total_modules_count INTEGER NOT NULL DEFAULT 0,
      implemented_modules_count INTEGER NOT NULL DEFAULT 0,
      d1_backed_count INTEGER NOT NULL DEFAULT 0,
      csp_compliant_count INTEGER NOT NULL DEFAULT 0,
      coverage_pct INTEGER NOT NULL DEFAULT 100,
      release_range TEXT NOT NULL DEFAULT '',
      matrix_status TEXT NOT NULL DEFAULT 'complete_100',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS reg_missing_controls (
      id TEXT PRIMARY KEY,
      gap_code TEXT NOT NULL UNIQUE,
      surface_area TEXT NOT NULL,
      domain_suite TEXT NOT NULL DEFAULT 'Candidate Portal',
      severity_tier TEXT NOT NULL DEFAULT 'p2_medium',
      gap_description_en TEXT NOT NULL DEFAULT '',
      recommended_module_target TEXT NOT NULL DEFAULT '',
      remediation_status TEXT NOT NULL DEFAULT 'open_gap',
      resolved_by TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_gap_status_sev ON reg_missing_controls(remediation_status, severity_tier)`,

    `CREATE TABLE IF NOT EXISTS reg_feature_dependencies (
      id TEXT PRIMARY KEY,
      dep_code TEXT NOT NULL UNIQUE,
      source_feature_code TEXT NOT NULL,
      source_feature_name TEXT NOT NULL DEFAULT '',
      target_feature_code TEXT NOT NULL,
      target_feature_name TEXT NOT NULL DEFAULT '',
      dependency_type TEXT NOT NULL DEFAULT 'requires_d1_schema',
      is_critical_path INTEGER NOT NULL DEFAULT 1,
      health_status TEXT NOT NULL DEFAULT 'healthy_verified',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_dep_type_health ON reg_feature_dependencies(dependency_type, health_status)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  await seedMasterFeatureRegistryBatch2(db);
  _reg2Ready.add(db);
}

async function seedMasterFeatureRegistryBatch2(db) {
  const apiCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_api_endpoints`).first();
  if (Number(apiCnt?.n || 0) === 0) {
    const endpoints = [
      ['reg-api-001', 'API-001', 'GET', '/api/admin/settings/overview', 'Settings & Configuration', 'admin_rbac_csrf', 'no_store', 'admin_internal', 'verified_live'],
      ['reg-api-002', 'API-002', 'GET', '/api/config/public', 'Public Edge APIs', 'public_edge_cached', 'edge_cache_invalidated', 'public_60_rpm', 'verified_live'],
      ['reg-api-003', 'API-003', 'GET', '/api/events/upcoming', 'Events & Scheduling', 'public_edge_cached', 'edge_cache_invalidated', 'public_60_rpm', 'verified_live'],
      ['reg-api-004', 'API-004', 'GET', '/api/seo/sitemap/:key', 'SEO, Search & Discovery', 'public_edge_cached', 'edge_cache_invalidated', 'public_60_rpm', 'verified_live'],
      ['reg-api-005', 'API-005', 'POST', '/api/webhooks/inbound/:slug', 'Integrations & Edge', 'hmac_signature', 'no_store', 'webhook_burst', 'verified_live'],
      ['reg-api-006', 'API-006', 'POST', '/api/admin/registry/db-entities/introspect-live-d1', 'Master Feature Registry', 'admin_rbac_csrf', 'no_store', 'admin_internal', 'verified_live']
    ];
    for (const r of endpoints) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_api_endpoints
         (id, endpoint_code, http_method, endpoint_path, domain_suite, auth_guard, cache_strategy, rate_limit_tier, contract_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const covCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_admin_coverage_matrix`).first();
  if (Number(covCnt?.n || 0) === 0) {
    const suites = [
      ['reg-cov-01', 'SUITE-01', 'Educational Resources', 22, 22, 22, 22, 100, 'v78–v83', 'complete_100'],
      ['reg-cov-02', 'SUITE-02', 'Categories & Navigation', 11, 11, 11, 11, 100, 'v84–v86', 'complete_100'],
      ['reg-cov-03', 'SUITE-03', 'Files, Media & Cloud', 15, 15, 15, 15, 100, 'v87–v90', 'complete_100'],
      ['reg-cov-04', 'SUITE-04', 'Payments & Finance', 18, 18, 18, 18, 100, 'v91–v95', 'complete_100'],
      ['reg-cov-05', 'SUITE-05', 'Users, Roles & Community', 19, 19, 19, 19, 100, 'v96–v100', 'complete_100'],
      ['reg-cov-06', 'SUITE-06', 'Analytics & Telemetry', 14, 14, 14, 14, 100, 'v101–v104', 'complete_100'],
      ['reg-cov-07', 'SUITE-07', 'Communications & Alerts', 12, 12, 12, 12, 100, 'v105–v107', 'complete_100'],
      ['reg-cov-08', 'SUITE-08', 'Marketing & Advertising', 10, 10, 10, 10, 100, 'v108–v110', 'complete_100'],
      ['reg-cov-09', 'SUITE-09', 'SEO, Search & Discovery', 16, 16, 16, 16, 100, 'v111–v114', 'complete_100'],
      ['reg-cov-10', 'SUITE-10', 'Events & Scheduling', 9, 9, 9, 9, 100, 'v115–v117', 'complete_100'],
      ['reg-cov-11', 'SUITE-11', 'Integrations, Webhooks & Edge', 11, 11, 11, 11, 100, 'v118–v120', 'complete_100'],
      ['reg-cov-12', 'SUITE-12', 'Settings & Configuration', 17, 17, 17, 17, 100, 'v121–v124', 'complete_100'],
      ['reg-cov-13', 'SUITE-13', 'Master Feature Registry', 11, 8, 8, 8, 73, 'v125–v127', 'in_progress']
    ];
    for (const r of suites) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_admin_coverage_matrix
         (id, suite_code, suite_name, total_modules_count, implemented_modules_count, d1_backed_count, csp_compliant_count, coverage_pct, release_range, matrix_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const gapCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_missing_controls`).first();
  if (Number(gapCnt?.n || 0) === 0) {
    const gaps = [
      ['reg-gap-001', 'GAP-2026-0001', 'Public Offline Sync Banner', 'Candidate Portal', 'p2_medium', 'Add admin toggle for offline PWA sync toast delay threshold.', 'module-18-009', 'open_gap', ''],
      ['reg-gap-002', 'GAP-2026-0002', 'District Exam Center Pin Map', 'Events & Scheduling', 'p3_enhancement', 'Allow pinning specific Odisha district exam center coordinates on map.', 'module-es-004', 'in_development', ''],
      ['reg-gap-003', 'GAP-2026-0003', 'Candidate Mock Test Bookmark Export', 'Educational Resources', 'p3_enhancement', 'Export candidate saved PYQ/mock test bookmarks as JSON/CSV.', 'module-01-012', 'resolved_wired', 'editor@csodisha.com']
    ];
    for (const r of gaps) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_missing_controls
         (id, gap_code, surface_area, domain_suite, severity_tier, gap_description_en, recommended_module_target, remediation_status, resolved_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const depCnt = await db.prepare(`SELECT COUNT(*) AS n FROM reg_feature_dependencies`).first();
  if (Number(depCnt?.n || 0) === 0) {
    const deps = [
      ['reg-dep-001', 'DEP-001', 'FTR-001', 'State Competitive Exam Calendar', 'FTR-002', 'RFC 5545 .ics Calendar Feed Engine', 'requires_d1_schema', 1, 'healthy_verified'],
      ['reg-dep-002', 'DEP-002', 'FTR-003', 'Outbound HMAC-SHA256 Webhook Dispatcher', 'FTR-001', 'State Competitive Exam Calendar', 'triggers_webhook_alert', 1, 'healthy_verified'],
      ['reg-dep-003', 'DEP-003', 'FTR-007', 'Offline PWA Study Pack & Service Worker', 'FTR-006', 'DPDP Act 2023 Consent & Localization Config', 'consumes_public_config', 1, 'healthy_verified'],
      ['reg-dep-004', 'DEP-004', 'FTR-004', 'Public API Gateway & Token Rate Limiter', 'FTR-006', 'DPDP Act 2023 Consent & Localization Config', 'consumes_public_config', 0, 'healthy_verified'],
      ['reg-dep-005', 'DEP-005', 'FTR-002', 'RFC 5545 .ics Calendar Feed Engine', 'FTR-007', 'Offline PWA Study Pack & Service Worker', 'invalidates_edge_cache', 0, 'healthy_verified'],
      ['reg-dep-006', 'DEP-006', 'FTR-005', 'Zero-PII TRAI DLT SMS & OTP Engine', 'FTR-006', 'DPDP Act 2023 Consent & Localization Config', 'requires_d1_schema', 1, 'healthy_verified']
    ];
    for (const r of deps) {
      await db.prepare(
        `INSERT OR IGNORE INTO reg_feature_dependencies
         (id, dep_code, source_feature_code, source_feature_name, target_feature_code, target_feature_name, dependency_type, is_critical_path, health_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }
}

/* ================= FULL 8-MODULE OVERVIEW (01-08 ACTIVE, 09-11 QUEUED) ================= */
export async function getFull8ModuleRegistryOverview(env) {
  await ensureMasterFeatureRegistryBatch2Schema(env.DB);
  const [base, apiRows, covRows, gapRows, depRows] = await Promise.all([
    getMasterFeatureRegistryBatch1Overview(env),
    env.DB.prepare(`SELECT contract_status FROM reg_api_endpoints`).all(),
    env.DB.prepare(`SELECT total_modules_count, implemented_modules_count FROM reg_admin_coverage_matrix`).all(),
    env.DB.prepare(`SELECT remediation_status FROM reg_missing_controls`).all(),
    env.DB.prepare(`SELECT health_status FROM reg_feature_dependencies`).all()
  ]);

  const apis = apiRows.results || [];
  const covs = covRows.results || [];
  const gaps = gapRows.results || [];
  const deps = depRows.results || [];

  const verified_api_endpoints_count = apis.filter(a => a.contract_status === 'verified_live').length;
  const total_suite_modules = covs.reduce((a, r) => a + Number(r.total_modules_count || 0), 0);
  const implemented_suite_modules = covs.reduce((a, r) => a + Number(r.implemented_modules_count || 0), 0);
  const overall_coverage_pct = total_suite_modules > 0 ? Math.round((implemented_suite_modules / total_suite_modules) * 100) : 100;
  const open_missing_controls_count = gaps.filter(g => g.remediation_status === 'open_gap' || g.remediation_status === 'in_development').length;
  const healthy_dependencies_count = deps.filter(d => d.health_status === 'healthy_verified').length;

  return {
    ...base,
    verified_api_endpoints_count,
    total_suite_modules,
    implemented_suite_modules,
    overall_coverage_pct,
    open_missing_controls_count,
    healthy_dependencies_count,
    modules: {
      ...base.modules,
      '05': { code: '05', id: 'module-19-005', title: 'API Endpoints', status: 'active', count: apis.length },
      '06': { code: '06', id: 'module-19-006', title: 'Admin Coverage Matrix', status: 'active', count: covs.length },
      '07': { code: '07', id: 'module-19-007', title: 'Missing Admin Controls', status: 'active', count: gaps.length },
      '08': { code: '08', id: 'module-19-008', title: 'Feature Dependencies', status: 'active', count: deps.length }
    }
  };
}

/* ================= MODULE 05: API ENDPOINTS ================= */
async function handleApiEndpoints(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const httpM = sanitizeRegText(url.searchParams.get('http_method') || '', 12).toUpperCase();
    const guard = sanitizeRegText(url.searchParams.get('auth_guard') || '', 40);
    const suite = sanitizeRegText(url.searchParams.get('domain_suite') || '', 80);
    const q = sanitizeRegText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (httpM) { where.push(`http_method = ?`); args.push(httpM); }
    if (guard) { where.push(`auth_guard = ?`); args.push(guard); }
    if (suite) { where.push(`domain_suite = ?`); args.push(suite); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(endpoint_path LIKE ? ESCAPE '\\' OR endpoint_code LIKE ? ESCAPE '\\' OR domain_suite LIKE ? ESCAPE '\\')`);
      args.push(like, like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM reg_api_endpoints ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY endpoint_code ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 16000);
    const errors = {};
    const endpoint_code = sanitizeRegText(b.endpoint_code || `API-${Math.floor(100 + Math.random() * 900)}`, 40);
    const http_method = pick(String(b.http_method || 'GET').toUpperCase(), REG_HTTP_METHODS, 'http_method', errors, 'GET');
    const endpoint_path = sanitizeRegText(b.endpoint_path, 200);
    const domain_suite = sanitizeRegText(b.domain_suite || 'Public Edge APIs', 100);
    const auth_guard = pick(b.auth_guard, REG_AUTH_GUARDS, 'auth_guard', errors, 'admin_rbac_csrf');
    const cache_strategy = pick(b.cache_strategy, REG_CACHE_STRATEGIES, 'cache_strategy', errors, 'no_store');
    const rate_limit_tier = pick(b.rate_limit_tier, REG_RATE_TIERS, 'rate_limit_tier', errors, 'admin_internal');
    const contract_status = pick(b.contract_status, REG_CONTRACT_STATUSES, 'contract_status', errors, 'verified_live');
    if (!endpoint_path) errors.endpoint_path = 'endpoint_path is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('reg-api');
    await db.prepare(
      `INSERT INTO reg_api_endpoints
       (id, endpoint_code, http_method, endpoint_path, domain_suite, auth_guard, cache_strategy, rate_limit_tier, contract_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, endpoint_code, http_method, endpoint_path, domain_suite, auth_guard, cache_strategy, rate_limit_tier, contract_status).run();

    await snapshotRegRevision(db, '05', newId, actor, 'create api endpoint');
    await audit(env, request, actor, 'registry.api_endpoints.create', 'reg_api_endpoints', newId, { endpoint_code, endpoint_path });
    const item = await db.prepare(`SELECT * FROM reg_api_endpoints WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM reg_api_endpoints WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'API endpoint not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const http_method = pick(String(b.http_method ?? existing.http_method).toUpperCase(), REG_HTTP_METHODS, 'http_method', errors, existing.http_method);
    const endpoint_path = sanitizeRegText(b.endpoint_path ?? existing.endpoint_path, 200);
    const domain_suite = sanitizeRegText(b.domain_suite ?? existing.domain_suite, 100);
    const auth_guard = pick(b.auth_guard ?? existing.auth_guard, REG_AUTH_GUARDS, 'auth_guard', errors, existing.auth_guard);
    const cache_strategy = pick(b.cache_strategy ?? existing.cache_strategy, REG_CACHE_STRATEGIES, 'cache_strategy', errors, existing.cache_strategy);
    const contract_status = pick(b.contract_status ?? existing.contract_status, REG_CONTRACT_STATUSES, 'contract_status', errors, existing.contract_status);
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE reg_api_endpoints SET http_method=?, endpoint_path=?, domain_suite=?, auth_guard=?, cache_strategy=?, contract_status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(http_method, endpoint_path, domain_suite, auth_guard, cache_strategy, contract_status, id).run();

    await snapshotRegRevision(db, '05', id, actor, 'update api endpoint');
    const item = await db.prepare(`SELECT * FROM reg_api_endpoints WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'status') {
    const existing = await db.prepare(`SELECT * FROM reg_api_endpoints WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'API endpoint not found');
    const b = await readJson(request, 8000);
    const errors = {};
    const contract_status = pick(b.contract_status || b.status, REG_CONTRACT_STATUSES, 'contract_status', errors, null);
    if (!contract_status) errors.contract_status = 'contract_status is required';
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(`UPDATE reg_api_endpoints SET contract_status=?, updated_at=datetime('now') WHERE id=?`).bind(contract_status, id).run();
    await snapshotRegRevision(db, '05', id, actor, `status:${contract_status}`);
    const item = await db.prepare(`SELECT * FROM reg_api_endpoints WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown api-endpoints route');
}

/* ================= MODULE 06: ADMIN COVERAGE MATRIX ================= */
async function handleCoverageMatrix(request, env, actor, id) {
  const db = env.DB;
  if (request.method === 'GET' && !id) {
    const { results } = await db.prepare(`SELECT * FROM reg_admin_coverage_matrix ORDER BY suite_code ASC`).all();
    const items = results || [];
    const total_modules = items.reduce((a, r) => a + Number(r.total_modules_count || 0), 0);
    const implemented_modules = items.reduce((a, r) => a + Number(r.implemented_modules_count || 0), 0);
    const overall_coverage_pct = total_modules > 0 ? Math.round((implemented_modules / total_modules) * 100) : 100;
    return json({ items, total_modules, implemented_modules, overall_coverage_pct });
  }

  if (request.method === 'POST' && id === 'recalculate') {
    const { results } = await db.prepare(`SELECT * FROM reg_admin_coverage_matrix ORDER BY suite_code ASC`).all();
    for (const r of (results || [])) {
      const tot = Math.max(1, Number(r.total_modules_count || 1));
      const imp = Math.min(tot, Math.max(0, Number(r.implemented_modules_count || 0)));
      const pct = Math.round((imp / tot) * 100);
      const st = pct >= 100 ? 'complete_100' : imp > 0 ? 'in_progress' : 'gap_detected';
      await db.prepare(
        `UPDATE reg_admin_coverage_matrix SET coverage_pct=?, matrix_status=?, updated_at=datetime('now') WHERE id=?`
      ).bind(pct, st, r.id).run();
    }
    await audit(env, request, actor, 'registry.coverage_matrix.recalculate', 'reg_admin_coverage_matrix', 'all', {});
    const updated = await db.prepare(`SELECT * FROM reg_admin_coverage_matrix ORDER BY suite_code ASC`).all();
    const items = updated.results || [];
    const total_modules = items.reduce((a, r) => a + Number(r.total_modules_count || 0), 0);
    const implemented_modules = items.reduce((a, r) => a + Number(r.implemented_modules_count || 0), 0);
    const overall_coverage_pct = total_modules > 0 ? Math.round((implemented_modules / total_modules) * 100) : 100;
    return json({ ok: true, items, total_modules, implemented_modules, overall_coverage_pct });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown coverage-matrix route');
}

/* ================= MODULE 07: MISSING ADMIN CONTROLS ================= */
async function handleMissingControls(request, env, actor, id, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const status = sanitizeRegText(url.searchParams.get('remediation_status') || '', 40);
    const sev = sanitizeRegText(url.searchParams.get('severity_tier') || '', 40);
    const q = sanitizeRegText(url.searchParams.get('q') || '', 120);
    const where = [];
    const args = [];
    if (status) { where.push(`remediation_status = ?`); args.push(status); }
    if (sev) { where.push(`severity_tier = ?`); args.push(sev); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(surface_area LIKE ? ESCAPE '\\' OR gap_code LIKE ? ESCAPE '\\' OR gap_description_en LIKE ? ESCAPE '\\')`);
      args.push(like, like, like);
    }
    const { results } = await db.prepare(
      `SELECT * FROM reg_missing_controls ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY gap_code ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 16000);
    const errors = {};
    const gap_code = sanitizeRegText(b.gap_code || `GAP-2026-${Math.floor(1000 + Math.random() * 9000)}`, 40);
    const surface_area = sanitizeRegText(b.surface_area, 160);
    const domain_suite = sanitizeRegText(b.domain_suite || 'Candidate Portal', 100);
    const severity_tier = pick(b.severity_tier, REG_SEVERITY_TIERS, 'severity_tier', errors, 'p2_medium');
    const gap_description_en = sanitizeRegText(b.gap_description_en, 320);
    const recommended_module_target = sanitizeRegText(b.recommended_module_target, 80);
    const remediation_status = pick(b.remediation_status, REG_REMEDIATION_STATUSES, 'remediation_status', errors, 'open_gap');
    if (!surface_area) errors.surface_area = 'surface_area is required';
    if (Object.keys(errors).length) return validationError(errors);

    const newId = rid('reg-gap');
    await db.prepare(
      `INSERT INTO reg_missing_controls
       (id, gap_code, surface_area, domain_suite, severity_tier, gap_description_en, recommended_module_target, remediation_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, gap_code, surface_area, domain_suite, severity_tier, gap_description_en, recommended_module_target, remediation_status).run();

    await snapshotRegRevision(db, '07', newId, actor, 'create gap');
    await audit(env, request, actor, 'registry.missing_controls.create', 'reg_missing_controls', newId, { gap_code });
    const item = await db.prepare(`SELECT * FROM reg_missing_controls WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id && !sub) {
    const existing = await db.prepare(`SELECT * FROM reg_missing_controls WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Control gap not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const surface_area = sanitizeRegText(b.surface_area ?? existing.surface_area, 160);
    const severity_tier = pick(b.severity_tier ?? existing.severity_tier, REG_SEVERITY_TIERS, 'severity_tier', errors, existing.severity_tier);
    const gap_description_en = sanitizeRegText(b.gap_description_en ?? existing.gap_description_en, 320);
    const remediation_status = pick(b.remediation_status ?? existing.remediation_status, REG_REMEDIATION_STATUSES, 'remediation_status', errors, existing.remediation_status);
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE reg_missing_controls SET surface_area=?, severity_tier=?, gap_description_en=?, remediation_status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(surface_area, severity_tier, gap_description_en, remediation_status, id).run();

    await snapshotRegRevision(db, '07', id, actor, 'update gap');
    const item = await db.prepare(`SELECT * FROM reg_missing_controls WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'PATCH' && id && sub === 'resolve') {
    const existing = await db.prepare(`SELECT * FROM reg_missing_controls WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Control gap not found');
    const resolvedBy = actor?.email || actor?.userId || 'system';
    await db.prepare(
      `UPDATE reg_missing_controls SET remediation_status='resolved_wired', resolved_by=?, updated_at=datetime('now') WHERE id=?`
    ).bind(resolvedBy, id).run();

    await snapshotRegRevision(db, '07', id, actor, 'resolve gap');
    await audit(env, request, actor, 'registry.missing_controls.resolve', 'reg_missing_controls', id, { gap_code: existing.gap_code });
    const item = await db.prepare(`SELECT * FROM reg_missing_controls WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown missing-controls route');
}

/* ================= MODULE 08: FEATURE DEPENDENCIES (CYCLE GUARDED) ================= */
async function handleDependencies(request, env, actor, id) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (method === 'GET' && !id) {
    const dtype = sanitizeRegText(url.searchParams.get('dependency_type') || '', 60);
    const health = sanitizeRegText(url.searchParams.get('health_status') || '', 40);
    const where = [];
    const args = [];
    if (dtype) { where.push(`dependency_type = ?`); args.push(dtype); }
    if (health) { where.push(`health_status = ?`); args.push(health); }
    const { results } = await db.prepare(
      `SELECT * FROM reg_feature_dependencies ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY dep_code ASC`
    ).bind(...args).all();
    return json({ items: results || [] });
  }

  if (method === 'POST' && !id) {
    const b = await readJson(request, 16000);
    const errors = {};
    const dep_code = sanitizeRegText(b.dep_code || `DEP-${Math.floor(100 + Math.random() * 900)}`, 40);
    const source_feature_code = sanitizeRegText(b.source_feature_code, 40);
    const source_feature_name = sanitizeRegText(b.source_feature_name, 160);
    const target_feature_code = sanitizeRegText(b.target_feature_code, 40);
    const target_feature_name = sanitizeRegText(b.target_feature_name, 160);
    const dependency_type = pick(b.dependency_type, REG_DEP_TYPES, 'dependency_type', errors, 'requires_d1_schema');
    const is_critical_path = b.is_critical_path === false || b.is_critical_path === 0 ? 0 : 1;
    const health_status = pick(b.health_status, REG_DEP_HEALTH, 'health_status', errors, 'healthy_verified');

    if (!source_feature_code) errors.source_feature_code = 'source_feature_code is required';
    if (!target_feature_code) errors.target_feature_code = 'target_feature_code is required';
    if (Object.keys(errors).length) return validationError(errors);

    if (source_feature_code === target_feature_code) {
      throw new HttpError(400, 'DEPENDENCY_SELF_LOOP', 'Self-loop dependency is forbidden (source === target)');
    }
    const revEdge = await db.prepare(
      `SELECT id FROM reg_feature_dependencies WHERE source_feature_code = ? AND target_feature_code = ?`
    ).bind(target_feature_code, source_feature_code).first();
    if (revEdge) {
      throw new HttpError(400, 'DEPENDENCY_CYCLE', `Direct 2-node dependency cycle detected between ${source_feature_code} and ${target_feature_code}`);
    }

    const newId = rid('reg-dep');
    await db.prepare(
      `INSERT INTO reg_feature_dependencies
       (id, dep_code, source_feature_code, source_feature_name, target_feature_code, target_feature_name, dependency_type, is_critical_path, health_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(newId, dep_code, source_feature_code, source_feature_name, target_feature_code, target_feature_name, dependency_type, is_critical_path, health_status).run();

    await snapshotRegRevision(db, '08', newId, actor, 'create dependency');
    await audit(env, request, actor, 'registry.dependencies.create', 'reg_feature_dependencies', newId, { source_feature_code, target_feature_code });
    const item = await db.prepare(`SELECT * FROM reg_feature_dependencies WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (method === 'PUT' && id) {
    const existing = await db.prepare(`SELECT * FROM reg_feature_dependencies WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Dependency edge not found');
    const b = await readJson(request, 16000);
    const errors = {};
    const dependency_type = pick(b.dependency_type ?? existing.dependency_type, REG_DEP_TYPES, 'dependency_type', errors, existing.dependency_type);
    const health_status = pick(b.health_status ?? existing.health_status, REG_DEP_HEALTH, 'health_status', errors, existing.health_status);
    const is_critical_path = b.is_critical_path !== undefined ? (b.is_critical_path ? 1 : 0) : existing.is_critical_path;
    if (Object.keys(errors).length) return validationError(errors);

    await db.prepare(
      `UPDATE reg_feature_dependencies SET dependency_type=?, health_status=?, is_critical_path=?, updated_at=datetime('now') WHERE id=?`
    ).bind(dependency_type, health_status, is_critical_path, id).run();

    await snapshotRegRevision(db, '08', id, actor, 'update dependency');
    const item = await db.prepare(`SELECT * FROM reg_feature_dependencies WHERE id = ?`).bind(id).first();
    return json({ item });
  }

  if (method === 'DELETE' && id) {
    const existing = await db.prepare(`SELECT * FROM reg_feature_dependencies WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Dependency edge not found');
    await db.prepare(`DELETE FROM reg_feature_dependencies WHERE id = ?`).bind(id).run();
    await audit(env, request, actor, 'registry.dependencies.delete', 'reg_feature_dependencies', id, { dep_code: existing.dep_code });
    return json({ ok: true, id });
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown dependencies route');
}

/* ================= ADMIN ROUTER DISPATCHER ================= */
export async function handleMasterFeatureRegistryBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureMasterFeatureRegistryBatch2Schema(env.DB);
  if (id === 'api-endpoints') return handleApiEndpoints(request, env, actor, sub, extra);
  if (id === 'coverage-matrix') return handleCoverageMatrix(request, env, actor, sub);
  if (id === 'missing-controls') return handleMissingControls(request, env, actor, sub, extra);
  if (id === 'dependencies') return handleDependencies(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown registry batch 2 route');
}
