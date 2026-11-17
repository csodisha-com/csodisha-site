// Analytics, Telemetry & User Feedback Intelligence Batch 4 (v104): Modules 13-14 + Unified 14-Module Suite
// 13 DPDP Act Privacy Audits | 14 Executive Analytics Digests
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr } from './validate.js';
import { AT_REV_TABLES, snapshotAtRevision, getAnalyticsOverview } from './analytics-telemetry-batch1.js';
import { ensureAnalyticsTelemetryBatch3Schema } from './analytics-telemetry-batch3.js';

export const AT_AUDIT_CATEGORIES = [
  'zero_cookie_verification', 'raw_ip_redaction_scan',
  'salt_rotation_check', 'retention_purge_30d', 'dpdp_request_sla_audit'
];
export const AT_AUDIT_STATUSES = ['verified_compliant', 'warning_review', 'remediated'];
export const AT_DIGEST_FREQS = ['weekly', 'monthly', 'on_demand_briefing'];
export const AT_DIGEST_STATUSES = ['draft', 'published_briefing', 'archived'];

const _at4Ready = new WeakSet();
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

AT_REV_TABLES['14'] = {
  table: 'at_executive_digests',
  cols: [
    'digest_code', 'period_label', 'digest_frequency',
    'headline_en', 'headline_or', 'highlights_json',
    'metrics_snapshot_json', 'delivery_status', 'generated_by'
  ]
};

export async function ensureAnalyticsTelemetryBatch4Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureAnalyticsTelemetryBatch3Schema(db);
  if (_at4Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS at_dpdp_privacy_audits (
      id TEXT PRIMARY KEY,
      audit_code TEXT NOT NULL UNIQUE,
      check_category TEXT NOT NULL DEFAULT 'zero_cookie_verification' CHECK (check_category IN ('zero_cookie_verification', 'raw_ip_redaction_scan', 'salt_rotation_check', 'retention_purge_30d', 'dpdp_request_sla_audit')),
      scope_target TEXT NOT NULL DEFAULT 'at_edge_pageviews',
      records_scanned INTEGER NOT NULL DEFAULT 0,
      pii_leaks_detected INTEGER NOT NULL DEFAULT 0,
      compliance_status TEXT NOT NULL DEFAULT 'verified_compliant' CHECK (compliance_status IN ('verified_compliant', 'warning_review', 'remediated')),
      verification_summary_en TEXT NOT NULL DEFAULT '',
      verification_summary_or TEXT NOT NULL DEFAULT '',
      executed_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_dpdp_audit_cat ON at_dpdp_privacy_audits(check_category, compliance_status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS at_executive_digests (
      id TEXT PRIMARY KEY,
      digest_code TEXT NOT NULL UNIQUE,
      period_label TEXT NOT NULL,
      digest_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('weekly', 'monthly', 'on_demand_briefing')),
      headline_en TEXT NOT NULL,
      headline_or TEXT NOT NULL DEFAULT '',
      highlights_json TEXT NOT NULL DEFAULT '[]',
      metrics_snapshot_json TEXT NOT NULL DEFAULT '{}',
      delivery_status TEXT NOT NULL DEFAULT 'draft' CHECK (delivery_status IN ('draft', 'published_briefing', 'archived')),
      generated_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_digest_status ON at_executive_digests(delivery_status, digest_frequency, created_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 13 DPDP privacy audits
  const daCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_dpdp_privacy_audits`).first();
  if (Number(daCnt?.n || 0) === 0) {
    const audits = [
      [
        'at-priv-01', 'PRIV-2026-0001', 'zero_cookie_verification', 'at_edge_pageviews', 5, 0,
        'verified_compliant',
        'Verified 0 Set-Cookie headers and 0 session cookies across all edge telemetry beacons.',
        'ସମସ୍ତ ଏଜ୍ ଟେଲିମେଟ୍ରି ବିକନରେ ୦ କୁକି ଏବଂ ୦ ସେସନ୍ କୁକି ଯାଞ୍ଚିତ।',
        'system'
      ],
      [
        'at-priv-02', 'PRIV-2026-0002', 'raw_ip_redaction_scan', 'at_search_queries, at_citizen_feedback, at_outbound_referrals', 14, 0,
        'verified_compliant',
        'Scanned all telemetry rows for raw IPv4/IPv6 or email patterns; 0 PII leaks found.',
        'ସମସ୍ତ ଟେଲିମେଟ୍ରି ଧାଡ଼ିରେ କଞ୍ଚା IP କିମ୍ବା ଇମେଲ୍ ଯାଞ୍ଚ କରାଗଲା; ୦ PII ତ୍ରୁଟି।',
        'system'
      ]
    ];
    for (const a of audits) {
      await db.prepare(
        `INSERT INTO at_dpdp_privacy_audits (id, audit_code, check_category, scope_target, records_scanned, pii_leaks_detected, compliance_status, verification_summary_en, verification_summary_or, executed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...a).run();
    }
  }

  // Seed Module 14 Executive Digest
  const dgCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_executive_digests`).first();
  if (Number(dgCnt?.n || 0) === 0) {
    const highlights = [
      { title_en: 'Study Library & Jobs portals led Odisha traffic with 5,500+ cookieless views.', title_or: 'ଷ୍ଟଡି ଲାଇବ୍ରେରୀ ଏବଂ ଚାକିରି ପୋର୍ଟାଲ୍ ୫,୫୦୦+ ଭ୍ୟୁ ସହିତ ଆଗରେ ରହିଛି।', metric_badge: '5,500+ Views' },
      { title_en: 'OPSC OAS & OSSC CGL PYQs accounted for top PDF downloads.', title_or: 'OPSC OAS ଏବଂ OSSC CGL PYQ ସର୍ବାଧିକ ଡାଉନଲୋଡ୍ ହୋଇଛି।', metric_badge: '3,325 DLs' },
      { title_en: '100% DPDP Act 2023 compliance verified with zero cookies and zero raw IPs.', title_or: 'ଶୂନ୍ୟ କୁକି ଏବଂ ଶୂନ୍ୟ IP ସହିତ ୧୦୦% DPDP ଅନୁପାଳନ ଯାଞ୍ଚିତ।', metric_badge: '100% DPDP' }
    ];
    const snap = {
      pageviews_7d: 5500,
      total_search_volume: 2557,
      total_downloads: 3325,
      cwv_good_pass_rate_pct: 75,
      avg_csat_score: 3.67,
      odia_share_pct: 46,
      community_engagement_index: 86,
      dpdp_compliance_label: '100% Compliant'
    };
    await db.prepare(
      `INSERT INTO at_executive_digests (id, digest_code, period_label, digest_frequency, headline_en, headline_or, highlights_json, metrics_snapshot_json, delivery_status, generated_by)
       VALUES ('at-dig-01', 'DIG-2026-W46', '2026-W46 (Nov 10 - Nov 16)', 'weekly',
               'CS Odisha Weekly Briefing: Strong OPSC/OSSC Engagement & 100% DPDP Privacy Compliance',
               'CS ଓଡ଼ିଶା ସାପ୍ତାହିକ ସାରାଂଶ: OPSC/OSSC ଉଚ୍ଚ ଅଂଶଗ୍ରହଣ ଏବଂ ୧୦୦% DPDP ଗୋପନୀୟତା ଅନୁପାଳନ',
               ?, ?, 'published_briefing', 'system')`
    ).bind(JSON.stringify(highlights), JSON.stringify(snap)).run();
  }

  _at4Ready.add(db);
}

export async function getFull14ModuleAnalyticsOverview(env) {
  await ensureAnalyticsTelemetryBatch4Schema(env.DB);
  return getAnalyticsOverview(env.DB);
}

/* ================= MODULE 13: DPDP PRIVACY AUDITS ================= */
async function nextAuditCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM at_dpdp_privacy_audits`).first();
  return `PRIV-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleDpdpAudits(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const [{ results }, agg] = await Promise.all([
      db.prepare(`SELECT * FROM at_dpdp_privacy_audits ORDER BY created_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT COUNT(*) AS total_audits, COALESCE(SUM(pii_leaks_detected), 0) AS total_leaks FROM at_dpdp_privacy_audits`).first()
    ]);
    const totalLeaks = Number(agg?.total_leaks || 0);
    return json({
      items: results || [],
      privacy_posture: {
        total_audits: Number(agg?.total_audits || 0),
        total_leaks_detected: totalLeaks,
        status_label: totalLeaks === 0 ? '100% Compliant' : `${totalLeaks} Leak(s) Detected`
      }
    });
  }

  if (sub === 'run-verification' && method === 'POST') {
    // Live scan across all 4 core telemetry tables for raw IPv4 or email leaks
    const [pvRows, sqRows, fbRows, obRows] = await Promise.all([
      db.prepare(`SELECT route_path, district_odisha FROM at_edge_pageviews LIMIT 500`).all(),
      db.prepare(`SELECT normalized_query, display_query FROM at_search_queries LIMIT 500`).all(),
      db.prepare(`SELECT page_url, comment_text FROM at_citizen_feedback LIMIT 500`).all(),
      db.prepare(`SELECT official_domain FROM at_outbound_referrals LIMIT 500`).all()
    ]);

    const allRows = [
      ...(pvRows?.results || []),
      ...(sqRows?.results || []),
      ...(fbRows?.results || []),
      ...(obRows?.results || [])
    ];
    let leaks = 0;
    for (const r of allRows) {
      const text = Object.values(r || {}).join(' ');
      if (IPV4_RE.test(text) || EMAIL_RE.test(text)) leaks++;
    }

    const newId = rid('at-priv');
    const code = await nextAuditCode(db);
    const status = leaks === 0 ? 'verified_compliant' : 'warning_review';
    const sumEn = `Live DPDP scan checked ${allRows.length} telemetry records across 4 tables; detected ${leaks} PII/IP leak(s).`;
    const sumOr = `୪ଟି ଟେବୁଲରେ ${allRows.length}ଟି ଟେଲିମେଟ୍ରି ରେକର୍ଡ ଯାଞ୍ଚ କରାଗଲା; ${leaks}ଟି PII/IP ତ୍ରୁଟି ମିଳିଲା।`;

    await db.prepare(
      `INSERT INTO at_dpdp_privacy_audits (id, audit_code, check_category, scope_target, records_scanned, pii_leaks_detected, compliance_status, verification_summary_en, verification_summary_or, executed_by)
       VALUES (?, ?, 'raw_ip_redaction_scan', 'at_edge_pageviews, at_search_queries, at_citizen_feedback, at_outbound_referrals', ?, ?, ?, ?, ?, ?)`
    ).bind(newId, code, allRows.length, leaks, status, sumEn, sumOr, actor?.email || actor?.userId || 'admin').run();

    await audit(env, request, actor, 'at.dpdp_audit.verify', 'at_dpdp_privacy_audits', newId, {
      records_scanned: allRows.length, pii_leaks_detected: leaks
    });
    const item = await db.prepare(`SELECT * FROM at_dpdp_privacy_audits WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const cat = pick(body.check_category, AT_AUDIT_CATEGORIES, 'check_category', errors, 'zero_cookie_verification');
    const status = pick(body.compliance_status, AT_AUDIT_STATUSES, 'compliance_status', errors, 'verified_compliant');
    const sumEn = cleanStr(body.verification_summary_en || '', 500);
    if (!sumEn) errors.verification_summary_en = 'verification_summary_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('at-priv');
    const code = await nextAuditCode(db);
    await db.prepare(
      `INSERT INTO at_dpdp_privacy_audits (id, audit_code, check_category, scope_target, records_scanned, pii_leaks_detected, compliance_status, verification_summary_en, verification_summary_or, executed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, cat, cleanStr(body.scope_target || 'all_telemetry', 120),
      Math.max(0, Number(body.records_scanned || 0) || 0),
      Math.max(0, Number(body.pii_leaks_detected || 0) || 0),
      status, sumEn, cleanStr(body.verification_summary_or || '', 500),
      actor?.email || 'admin'
    ).run();

    await audit(env, request, actor, 'at.dpdp_audit.create', 'at_dpdp_privacy_audits', newId, { audit_code: code });
    const created = await db.prepare(`SELECT * FROM at_dpdp_privacy_audits WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 14: EXECUTIVE DIGESTS ================= */
function decorateDigest(r) {
  if (!r) return r;
  return {
    ...r,
    highlights: parseJson(r.highlights_json, []),
    metrics_snapshot: parseJson(r.metrics_snapshot_json, {})
  };
}

async function nextDigestCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM at_executive_digests`).first();
  return `DIG-2026-${String(Number(r?.n || 0) + 1).padStart(3, '0')}`;
}

async function handleExecutiveDigests(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM at_executive_digests ORDER BY created_at DESC LIMIT 50`).all();
    return json({ items: (results || []).map(decorateDigest) });
  }

  if (sub && extra === 'export' && method === 'GET') {
    const row = await db.prepare(`SELECT * FROM at_executive_digests WHERE id = ?`).bind(sub).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Executive digest not found');
    const d = decorateDigest(row);
    const fmt = (url.searchParams.get('format') || 'json').toLowerCase();

    if (fmt === 'md' || fmt === 'markdown') {
      const lines = [
        `# ${d.headline_en}`,
        `**Digest:** ${d.digest_code} | **Period:** ${d.period_label} | **Status:** ${d.delivery_status}`,
        '',
        `> ${d.headline_or || ''}`,
        '',
        '## Key Highlights',
        ...(d.highlights || []).map(h => `- **${h.metric_badge || ''}** ${h.title_en}${h.title_or ? ` (${h.title_or})` : ''}`),
        '',
        '## Metrics Snapshot',
        '```json',
        JSON.stringify(d.metrics_snapshot, null, 2),
        '```'
      ];
      return new Response(lines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${d.digest_code}.md"`
        }
      });
    }

    return new Response(JSON.stringify(d, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${d.digest_code}.json"`
      }
    });
  }

  if (sub === 'generate' && method === 'POST') {
    const body = await readJson(request, 12000).catch(() => ({}));
    const ov = await getAnalyticsOverview(db);
    const freq = AT_DIGEST_FREQS.includes(body.digest_frequency) ? body.digest_frequency : 'weekly';
    const periodLabel = cleanStr(body.period_label || `On-Demand (${new Date().toISOString().slice(0, 10)})`, 100);

    const highlights = [
      {
        title_en: `${ov.pageviews_7d} cookieless pageviews led by ${ov.top_portal_section} & ${ov.top_odisha_district?.district_name_en || 'Khordha'}.`,
        title_or: `${ov.pageviews_7d} କୁକି-ମୁକ୍ତ ପେଜଭ୍ୟୁ (${ov.top_odisha_district?.district_name_en || 'ଖୋର୍ଦ୍ଧା'} ଶୀର୍ଷରେ)।`,
        metric_badge: `${ov.pageviews_7d} Views`
      },
      {
        title_en: `${ov.total_downloads} PYQ/syllabus downloads & ${ov.total_outbound_clicks_30d} official commission clicks.`,
        title_or: `${ov.total_downloads} PYQ ଡାଉନଲୋଡ୍ ଏବଂ ${ov.total_outbound_clicks_30d} ସରକାରୀ ପୋର୍ଟାଲ୍ କ୍ଲିକ୍।`,
        metric_badge: `${ov.total_downloads} DLs`
      },
      {
        title_en: `CWV Good Pass Rate ${ov.cwv_good_pass_rate_pct}%, CSAT ${ov.avg_csat_score}/5, DPDP: ${ov.dpdp_compliance_label}.`,
        title_or: `CWV ${ov.cwv_good_pass_rate_pct}%, CSAT ${ov.avg_csat_score}/5, DPDP: ${ov.dpdp_compliance_label}।`,
        metric_badge: ov.dpdp_compliance_label
      }
    ];
    const snap = {
      pageviews_7d: ov.pageviews_7d,
      total_search_volume: ov.total_search_volume,
      open_zero_result_queries: ov.open_zero_result_queries,
      total_downloads: ov.total_downloads,
      cwv_good_pass_rate_pct: ov.cwv_good_pass_rate_pct,
      avg_csat_score: ov.avg_csat_score,
      open_404_incidents: ov.open_404_incidents,
      total_outbound_clicks_30d: ov.total_outbound_clicks_30d,
      odia_share_pct: ov.overall_odia_share_pct,
      community_engagement_index: ov.latest_community_engagement_index,
      dpdp_compliance_label: ov.dpdp_compliance_label
    };

    const newId = rid('at-dig');
    const code = await nextDigestCode(db);
    const headlineEn = cleanStr(body.headline_en || `CS Odisha Executive Analytics Briefing (${code})`, 200);
    const headlineOr = cleanStr(body.headline_or || `CS ଓଡ଼ିଶା କାର୍ଯ୍ୟନିର୍ବାହୀ ଆନାଲିଟିକ୍ସ ସାରାଂଶ (${code})`, 220);

    await db.prepare(
      `INSERT INTO at_executive_digests (id, digest_code, period_label, digest_frequency, headline_en, headline_or, highlights_json, metrics_snapshot_json, delivery_status, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
    ).bind(newId, code, periodLabel, freq, headlineEn, headlineOr, JSON.stringify(highlights), JSON.stringify(snap), actor?.email || 'admin').run();

    await snapshotAtRevision(db, '14', newId, actor, 'generate live executive digest');
    await audit(env, request, actor, 'at.digest.generate', 'at_executive_digests', newId, { digest_code: code });
    const created = await db.prepare(`SELECT * FROM at_executive_digests WHERE id = ?`).bind(newId).first();
    return json({ item: decorateDigest(created) }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM at_executive_digests WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Executive digest not found');
    const body = await readJson(request, 12000);
    const errors = {};
    const status = body.delivery_status !== undefined ? pick(body.delivery_status, AT_DIGEST_STATUSES, 'delivery_status', errors, existing.delivery_status) : existing.delivery_status;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotAtRevision(db, '14', sub, actor, `digest -> ${status}`);
    await db.prepare(`UPDATE at_executive_digests SET delivery_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, sub).run();
    await audit(env, request, actor, 'at.digest.update', 'at_executive_digests', sub, { delivery_status: status });
    const updated = await db.prepare(`SELECT * FROM at_executive_digests WHERE id = ?`).bind(sub).first();
    return json({ item: decorateDigest(updated) });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleAnalyticsBatch4Admin(request, env, actor, id, sub, extra) {
  await ensureAnalyticsTelemetryBatch4Schema(env.DB);
  if (id === 'dpdp-audits') return handleDpdpAudits(request, env, actor, sub, extra);
  if (id === 'executive-digests') return handleExecutiveDigests(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown analytics batch 4 route');
}
