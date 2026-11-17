// Marketing & Advertising Batch 3 (v110): Modules 09-10
// 09 Promotional Landing Pages | 10 Advertising Reports
// Store all INR revenue/spend metrics in integer paise; never inject raw <script> in landing page payloads.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  MKT_BANNER_THEMES,
  MKT_REV_TABLES,
  ensureMarketingAdvertisingBatch1Schema,
  formatInrFromPaise,
  sanitizeBannerText,
  snapshotMktRevision
} from './marketing-advertising-batch1.js';
import {
  ensureMarketingAdvertisingBatch2Schema,
  getMarketingBatch2Overview
} from './marketing-advertising-batch2.js';

export const MKT_LP_STATUSES = ['draft', 'published_live', 'scheduled', 'archived'];
export const MKT_REPORT_TYPES = [
  'sponsor_roi_statement',
  'campaign_performance_ledger',
  'placement_yield_audit',
  'referral_commission_payouts',
  'utm_channel_attribution'
];

const _mkt3Ready = new WeakSet();

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

function normSlug(raw) {
  return cleanStr(raw || '', 120).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function sanitizeHighlights(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 12).map(h => ({
    title_en: sanitizeBannerText(h?.title_en || '', 120),
    title_or: sanitizeBannerText(h?.title_or || '', 140),
    desc_en: sanitizeBannerText(h?.desc_en || '', 240),
    desc_or: sanitizeBannerText(h?.desc_or || '', 260)
  })).filter(h => h.title_en || h.desc_en);
}

function safeCtaUrl(raw, field, errors, fallback = 'https://csodisha.com/study-library/') {
  const s = cleanStr(raw || '', 400);
  if (!s) return fallback;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  errors[field] = `${field} must be an https://, http://, or / relative URL`;
  return fallback;
}

MKT_REV_TABLES['09'] = {
  table: 'mkt_promo_landing_pages',
  cols: [
    'page_code', 'slug', 'campaign_id', 'sponsor_id', 'hero_badge_en', 'hero_badge_or',
    'hero_title_en', 'hero_title_or', 'hero_subtitle_en', 'hero_subtitle_or',
    'highlights_json', 'primary_cta_label_en', 'primary_cta_label_or', 'primary_cta_url',
    'theme_variant', 'views_count', 'conversions_count', 'page_status', 'published_at'
  ]
};

export async function ensureMarketingAdvertisingBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_mkt3Ready.has(db)) return;
  await ensureMarketingAdvertisingBatch1Schema(db);
  await ensureMarketingAdvertisingBatch2Schema(db);

  const ddl = [
    `CREATE TABLE IF NOT EXISTS mkt_promo_landing_pages (
      id TEXT PRIMARY KEY,
      page_code TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      campaign_id TEXT REFERENCES mkt_campaigns(id) ON DELETE SET NULL,
      sponsor_id TEXT REFERENCES mkt_sponsors(id) ON DELETE SET NULL,
      hero_badge_en TEXT NOT NULL DEFAULT 'Odisha Exam Special',
      hero_badge_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ପରୀକ୍ଷା ବିଶେଷ',
      hero_title_en TEXT NOT NULL,
      hero_title_or TEXT NOT NULL DEFAULT '',
      hero_subtitle_en TEXT NOT NULL DEFAULT '',
      hero_subtitle_or TEXT NOT NULL DEFAULT '',
      highlights_json TEXT NOT NULL DEFAULT '[]',
      primary_cta_label_en TEXT NOT NULL DEFAULT 'Explore Now',
      primary_cta_label_or TEXT NOT NULL DEFAULT 'ବର୍ତ୍ତମାନ ଦେଖନ୍ତୁ',
      primary_cta_url TEXT NOT NULL DEFAULT 'https://csodisha.com/study-library/',
      theme_variant TEXT NOT NULL DEFAULT 'forest_gold' CHECK (theme_variant IN ('forest_gold', 'alabaster_emerald', 'amber_highlight', 'royal_indigo')),
      views_count INTEGER NOT NULL DEFAULT 0,
      conversions_count INTEGER NOT NULL DEFAULT 0,
      page_status TEXT NOT NULL DEFAULT 'draft' CHECK (page_status IN ('draft', 'published_live', 'scheduled', 'archived')),
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_lp_status ON mkt_promo_landing_pages(page_status, slug)`,
    `CREATE TABLE IF NOT EXISTS mkt_advertising_reports (
      id TEXT PRIMARY KEY,
      report_code TEXT NOT NULL UNIQUE,
      report_type TEXT NOT NULL DEFAULT 'sponsor_roi_statement' CHECK (report_type IN ('sponsor_roi_statement', 'campaign_performance_ledger', 'placement_yield_audit', 'referral_commission_payouts', 'utm_channel_attribution')),
      period_label TEXT NOT NULL DEFAULT '2026-Q4 / Nov 2026',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_metrics_json TEXT NOT NULL DEFAULT '{}',
      rows_snapshot_json TEXT NOT NULL DEFAULT '[]',
      generated_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_reports_type ON mkt_advertising_reports(report_type, created_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 09: Promotional Landing Pages
  const lpCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_landing_pages`).first();
  if (Number(lpCnt?.n || 0) === 0) {
    const h1 = [
      { title_en: '50-Question GS-1 & CSAT Bilingual Mock', title_or: '୫୦-ପ୍ରଶ୍ନ GS-1 ଏବଂ CSAT ମକ୍ ଟେଷ୍ଟ', desc_en: 'Instant OMR scoring with Odia & English explanations.', desc_or: 'ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ବ୍ୟାଖ୍ୟା ସହିତ ତୁରନ୍ତ ଫଳାଫଳ।' },
      { title_en: 'Odisha History & Polity Revision Pack', title_or: 'ଓଡ଼ିଶା ଇତିହାସ ଓ ରାଜନୀତି ରିଭିଜନ୍ ପ୍ୟାକ୍', desc_en: 'Curated PYQ notes from 2015-2025 OPSC papers.', desc_or: '୨୦୧୫-୨୦୨୫ OPSC ପ୍ରଶ୍ନପତ୍ରରୁ ସଂଗୃହୀତ ନୋଟ୍ସ।' }
    ];
    const h2 = [
      { title_en: 'Post-Matric & Gopabandhu Scholarship Check', title_or: 'ପୋଷ୍ଟ-ମାଟ୍ରିକ୍ ଓ ଗୋପବନ୍ଧୁ ବୃତ୍ତି ଯାଞ୍ଚ', desc_en: 'Verify eligibility, NPCI Aadhaar seeding, and deadlines.', desc_or: 'ଯୋଗ୍ୟତା, NPCI ଆଧାର ସିଡିଂ ଏବଂ ଶେଷ ତାରିଖ ଯାଞ୍ଚ କରନ୍ତୁ।' }
    ];
    await db.prepare(
      `INSERT INTO mkt_promo_landing_pages (id, page_code, slug, campaign_id, sponsor_id, hero_badge_en, hero_badge_or, hero_title_en, hero_title_or, hero_subtitle_en, hero_subtitle_or, highlights_json, primary_cta_label_en, primary_cta_label_or, primary_cta_url, theme_variant, views_count, conversions_count, page_status, published_at)
       VALUES ('mkt-lp-01', 'LP-2026-0001', 'opsc-oas-2026-crash-kit', 'mkt-cmp-01', 'mkt-spn-01',
               'OPSC OAS 2026 · Prelims Special', 'OPSC OAS ୨୦୨୬ · ପ୍ରିଲିମ୍ସ ବିଶେଷ',
               'OPSC OAS 2026 Bilingual Crash Kit & Free Mock Series',
               'OPSC OAS ୨୦୨୬ ଦ୍ୱିଭାଷୀ କ୍ରାସ୍ କିଟ୍ ଏବଂ ମାଗଣା ମକ୍ ସିରିଜ୍',
               'Complete GS Paper-1, Odisha Special GK, and CSAT practice sets.',
               'ସମ୍ପୂର୍ଣ୍ଣ GS ପେପର୍-୧, ଓଡ଼ିଶା GK ଏବଂ CSAT ଅଭ୍ୟାସ ସେଟ୍।',
               ?, 'Start Free Crash Kit', 'ମାଗଣା କ୍ରାସ୍ କିଟ୍ ଆରମ୍ଭ କରନ୍ତୁ',
               'https://csodisha.com/mock-tests/', 'forest_gold', 3840, 612, 'published_live', datetime('now'))`
    ).bind(JSON.stringify(h1)).run();

    await db.prepare(
      `INSERT INTO mkt_promo_landing_pages (id, page_code, slug, campaign_id, sponsor_id, hero_badge_en, hero_badge_or, hero_title_en, hero_title_or, hero_subtitle_en, hero_subtitle_or, highlights_json, primary_cta_label_en, primary_cta_label_or, primary_cta_url, theme_variant, views_count, conversions_count, page_status, published_at)
       VALUES ('mkt-lp-02', 'LP-2026-0002', 'odisha-scholarship-guide-2026', 'mkt-cmp-02', 'mkt-spn-02',
               'Odisha Student Welfare 2026', 'ଓଡ଼ିଶା ଛାତ୍ର କଲ୍ୟାଣ ୨୦୨୬',
               'Odisha State Scholarship & Direct Benefit Sanction Guide',
               'ଓଡ଼ିଶା ରାଜ୍ୟ ବୃତ୍ତି ଏବଂ DBT ମଞ୍ଜୁରୀ ମାର୍ଗଦର୍ଶିକା',
               'Track application windows, e-KYC checklist, and official portals.',
               'ଆବେଦନ ସମୟସୀମା, e-KYC ତାଲିକା ଏବଂ ସରକାରୀ ପୋର୍ଟାଲ୍ ଦେଖନ୍ତୁ।',
               ?, 'Check Scholarship Eligibility', 'ବୃତ୍ତି ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ',
               'https://csodisha.com/schemes/', 'alabaster_emerald', 2710, 445, 'published_live', datetime('now'))`
    ).bind(JSON.stringify(h2)).run();
  }

  // Seed Module 10: Initial Advertising Report
  const repCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_advertising_reports`).first();
  if (Number(repCnt?.n || 0) === 0) {
    const built = await aggregateReportData(db, 'sponsor_roi_statement');
    await db.prepare(
      `INSERT INTO mkt_advertising_reports (id, report_code, report_type, period_label, title_en, title_or, summary_metrics_json, rows_snapshot_json, generated_by)
       VALUES ('mkt-rep-01', 'ADR-2026-0001', 'sponsor_roi_statement', '2026-Q4 / Nov 2026',
               'Odisha Sponsors ROI & Contract Settlement Statement',
               'ଓଡ଼ିଶା ପ୍ରାୟୋଜକ ROI ଏବଂ ଚୁକ୍ତି ବିବରଣୀ',
               ?, ?, 'system')`
    ).bind(JSON.stringify(built.summary), JSON.stringify(built.rows)).run();
  }

  _mkt3Ready.add(db);
}

/* ================= UNIFIED 10-MODULE OVERVIEW ================= */
export async function getFull10ModuleMarketingOverview(env) {
  const db = env.DB;
  await ensureMarketingAdvertisingBatch3Schema(db);
  const base = await getMarketingBatch2Overview(env);

  const [lpLive, lpTot, repTot] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_landing_pages WHERE page_status = 'published_live'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_landing_pages`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_advertising_reports`).first()
  ]);

  const modules = {
    ...(base.modules || {}),
    '09': { status: 'active', count: Number(lpTot?.n || 0) },
    '10': { status: 'active', count: Number(repTot?.n || 0) }
  };

  return {
    ...base,
    live_landing_pages: Number(lpLive?.n || 0),
    saved_advertising_reports: Number(repTot?.n || 0),
    modules,
    suite_10: {
      total_modules: 10,
      active_modules: 10,
      active_ad_placements: base.active_ad_placements,
      active_sponsors: base.active_sponsors,
      total_sponsor_contract_paise: base.total_sponsor_contract_paise,
      total_sponsor_contract_inr: base.total_sponsor_contract_inr,
      live_promotional_banners: base.live_promotional_banners,
      active_campaigns: base.active_campaigns,
      active_referral_partners: base.active_referral_partners,
      total_attributed_conversions: base.total_attributed_conversions,
      blended_campaign_roas: base.blended_campaign_roas,
      governed_utm_links: base.governed_utm_links,
      social_share_clickbacks: base.social_share_clickbacks,
      live_landing_pages: Number(lpLive?.n || 0),
      saved_advertising_reports: Number(repTot?.n || 0)
    }
  };
}

/* ================= MODULE 09: PROMOTIONAL LANDING PAGES ================= */
function decorateLandingPage(row) {
  if (!row) return row;
  const views = Number(row.views_count || 0);
  const convs = Number(row.conversions_count || 0);
  return {
    ...row,
    highlights: parseJson(row.highlights_json, []),
    conversion_rate_pct: views > 0 ? Math.round((convs / views) * 10000) / 100 : 0
  };
}

async function nextLpCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_landing_pages`).first();
  return `LP-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleLandingPages(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const st = (url.searchParams.get('page_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (st && MKT_LP_STATUSES.includes(st)) { where.push('page_status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(page_code LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\' OR hero_title_en LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM mkt_promo_landing_pages ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decorateLandingPage) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 28000);
    const errors = {};
    const slug = normSlug(body.slug || body.hero_title_en || '');
    const titleEn = sanitizeBannerText(body.hero_title_en || '', 200);
    if (!slug) errors.slug = 'slug is required';
    if (!titleEn) errors.hero_title_en = 'hero_title_en is required';
    const theme = pick(body.theme_variant, MKT_BANNER_THEMES, 'theme_variant', errors, 'forest_gold');
    const st = pick(body.page_status, MKT_LP_STATUSES, 'page_status', errors, 'draft');
    const ctaUrl = safeCtaUrl(body.primary_cta_url, 'primary_cta_url', errors);
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('mkt-lp');
    const code = await nextLpCode(db);
    const highlights = sanitizeHighlights(body.highlights || []);
    const pubAt = st === 'published_live' ? new Date().toISOString() : null;

    await db.prepare(
      `INSERT INTO mkt_promo_landing_pages (id, page_code, slug, campaign_id, sponsor_id, hero_badge_en, hero_badge_or, hero_title_en, hero_title_or, hero_subtitle_en, hero_subtitle_or, highlights_json, primary_cta_label_en, primary_cta_label_or, primary_cta_url, theme_variant, page_status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, slug,
      body.campaign_id ? cleanStr(body.campaign_id, 64) : null,
      body.sponsor_id ? cleanStr(body.sponsor_id, 64) : null,
      sanitizeBannerText(body.hero_badge_en || 'Odisha Exam Special', 80),
      sanitizeBannerText(body.hero_badge_or || 'ଓଡ଼ିଶା ପରୀକ୍ଷା ବିଶେଷ', 100),
      titleEn, sanitizeBannerText(body.hero_title_or || '', 240),
      sanitizeBannerText(body.hero_subtitle_en || '', 320),
      sanitizeBannerText(body.hero_subtitle_or || '', 360),
      JSON.stringify(highlights),
      sanitizeBannerText(body.primary_cta_label_en || 'Explore Now', 80),
      sanitizeBannerText(body.primary_cta_label_or || 'ବର୍ତ୍ତମାନ ଦେଖନ୍ତୁ', 100),
      ctaUrl, theme, st, pubAt
    ).run();

    await snapshotMktRevision(db, '09', newId, actor, 'create promotional landing page');
    await audit(env, request, actor, 'mkt.lp.create', 'mkt_promo_landing_pages', newId, { page_code: code, slug });
    const created = await db.prepare(`SELECT * FROM mkt_promo_landing_pages WHERE id = ?`).bind(newId).first();
    return json({ item: decorateLandingPage(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM mkt_promo_landing_pages WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Landing page not found');
    const body = await readJson(request, 28000);
    const errors = {};
    const theme = body.theme_variant !== undefined ? pick(body.theme_variant, MKT_BANNER_THEMES, 'theme_variant', errors, ex.theme_variant) : ex.theme_variant;
    const st = body.page_status !== undefined ? pick(body.page_status, MKT_LP_STATUSES, 'page_status', errors, ex.page_status) : ex.page_status;
    const ctaUrl = body.primary_cta_url !== undefined ? safeCtaUrl(body.primary_cta_url, 'primary_cta_url', errors, ex.primary_cta_url) : ex.primary_cta_url;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotMktRevision(db, '09', sub, actor, 'update promotional landing page');
    const highlightsJson = Array.isArray(body.highlights) ? JSON.stringify(sanitizeHighlights(body.highlights)) : ex.highlights_json;
    const pubAt = st === 'published_live' && !ex.published_at ? new Date().toISOString() : ex.published_at;

    await db.prepare(
      `UPDATE mkt_promo_landing_pages
       SET hero_badge_en = ?, hero_badge_or = ?, hero_title_en = ?, hero_title_or = ?,
           hero_subtitle_en = ?, hero_subtitle_or = ?, highlights_json = ?,
           primary_cta_label_en = ?, primary_cta_label_or = ?, primary_cta_url = ?,
           theme_variant = ?, page_status = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.hero_badge_en !== undefined ? sanitizeBannerText(body.hero_badge_en, 80) : ex.hero_badge_en,
      body.hero_badge_or !== undefined ? sanitizeBannerText(body.hero_badge_or, 100) : ex.hero_badge_or,
      body.hero_title_en !== undefined ? sanitizeBannerText(body.hero_title_en, 200) : ex.hero_title_en,
      body.hero_title_or !== undefined ? sanitizeBannerText(body.hero_title_or, 240) : ex.hero_title_or,
      body.hero_subtitle_en !== undefined ? sanitizeBannerText(body.hero_subtitle_en, 320) : ex.hero_subtitle_en,
      body.hero_subtitle_or !== undefined ? sanitizeBannerText(body.hero_subtitle_or, 360) : ex.hero_subtitle_or,
      highlightsJson,
      body.primary_cta_label_en !== undefined ? sanitizeBannerText(body.primary_cta_label_en, 80) : ex.primary_cta_label_en,
      body.primary_cta_label_or !== undefined ? sanitizeBannerText(body.primary_cta_label_or, 100) : ex.primary_cta_label_or,
      ctaUrl, theme, st, pubAt, sub
    ).run();
    await audit(env, request, actor, 'mkt.lp.update', 'mkt_promo_landing_pages', sub, {});
    const updated = await db.prepare(`SELECT * FROM mkt_promo_landing_pages WHERE id = ?`).bind(sub).first();
    return json({ item: decorateLandingPage(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_promo_landing_pages WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Landing page not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.page_status, MKT_LP_STATUSES, 'page_status', errors, ex.page_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotMktRevision(db, '09', sub, actor, `status -> ${st}`);
    const pubAt = st === 'published_live' && !ex.published_at ? new Date().toISOString() : ex.published_at;
    await db.prepare(
      `UPDATE mkt_promo_landing_pages SET page_status = ?, published_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(st, pubAt, sub).run();
    await audit(env, request, actor, 'mkt.lp.status', 'mkt_promo_landing_pages', sub, { page_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_promo_landing_pages WHERE id = ?`).bind(sub).first();
    return json({ item: decorateLandingPage(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotMktRevision(db, '09', sub, actor, 'archive landing page');
    await db.prepare(`UPDATE mkt_promo_landing_pages SET page_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.lp.archive', 'mkt_promo_landing_pages', sub, {});
    return json({ ok: true, id: sub, page_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 10: ADVERTISING REPORTS & EXPORTS ================= */
export async function aggregateReportData(db, reportType) {
  if (reportType === 'sponsor_roi_statement') {
    const { results } = await db.prepare(`SELECT * FROM mkt_sponsors ORDER BY contract_value_paise DESC`).all();
    const rows = (results || []).map(s => ({
      code: s.sponsor_code,
      name: s.organization_name,
      tier: s.sponsorship_tier,
      status: s.sponsor_status,
      contract_paise: Number(s.contract_value_paise || 0),
      contract_inr: formatInrFromPaise(s.contract_value_paise),
      paid_paise: Number(s.amount_paid_paise || 0),
      paid_inr: formatInrFromPaise(s.amount_paid_paise)
    }));
    const totContract = rows.reduce((a, r) => a + r.contract_paise, 0);
    const totPaid = rows.reduce((a, r) => a + r.paid_paise, 0);
    return {
      summary: {
        total_sponsors: rows.length,
        total_contract_paise: totContract,
        total_contract_inr: formatInrFromPaise(totContract),
        total_paid_paise: totPaid,
        total_paid_inr: formatInrFromPaise(totPaid)
      },
      rows
    };
  }

  if (reportType === 'campaign_performance_ledger') {
    const { results } = await db.prepare(
      `SELECT c.campaign_code, c.campaign_name_en, c.objective, c.campaign_status,
              COALESCE(SUM(a.impressions), 0) AS impressions,
              COALESCE(SUM(a.clicks), 0) AS clicks,
              COALESCE(SUM(a.paid_conversions), 0) AS conversions,
              COALESCE(SUM(a.spend_paise), c.spent_paise) AS spend_paise,
              COALESCE(SUM(a.attributed_revenue_paise), 0) AS revenue_paise
       FROM mkt_campaigns c
       LEFT JOIN mkt_campaign_analytics a ON a.campaign_id = c.id
       GROUP BY c.id ORDER BY revenue_paise DESC`
    ).all();
    const rows = (results || []).map(r => {
      const imps = Number(r.impressions || 0);
      const clks = Number(r.clicks || 0);
      const sp = Number(r.spend_paise || 0);
      const rev = Number(r.revenue_paise || 0);
      return {
        code: r.campaign_code,
        name: r.campaign_name_en,
        objective: r.objective,
        status: r.campaign_status,
        impressions: imps,
        clicks: clks,
        ctr_pct: imps > 0 ? Math.round((clks / imps) * 10000) / 100 : 0,
        conversions: Number(r.conversions || 0),
        spend_paise: sp,
        spend_inr: formatInrFromPaise(sp),
        revenue_paise: rev,
        revenue_inr: formatInrFromPaise(rev),
        roas: sp > 0 ? Math.round((rev / sp) * 100) / 100 : 0
      };
    });
    const totImps = rows.reduce((a, r) => a + r.impressions, 0);
    const totClks = rows.reduce((a, r) => a + r.clicks, 0);
    const totSp = rows.reduce((a, r) => a + r.spend_paise, 0);
    const totRev = rows.reduce((a, r) => a + r.revenue_paise, 0);
    return {
      summary: {
        impressions: totImps,
        clicks: totClks,
        ctr_pct: totImps > 0 ? Math.round((totClks / totImps) * 10000) / 100 : 0,
        conversions: rows.reduce((a, r) => a + r.conversions, 0),
        total_spend_paise: totSp,
        total_spend_inr: formatInrFromPaise(totSp),
        total_revenue_paise: totRev,
        total_revenue_inr: formatInrFromPaise(totRev),
        roas: totSp > 0 ? Math.round((totRev / totSp) * 100) / 100 : 0
      },
      rows
    };
  }

  if (reportType === 'placement_yield_audit') {
    const { results } = await db.prepare(`SELECT * FROM mkt_ad_placements ORDER BY impressions_30d DESC`).all();
    const rows = (results || []).map(p => {
      const imps = Number(p.impressions_30d || 0);
      const clks = Number(p.clicks_30d || 0);
      return {
        code: p.slot_code,
        name: p.slot_name_en,
        section: p.portal_section,
        pricing_model: p.pricing_model,
        rate_paise: Number(p.rate_paise || 0),
        rate_inr: formatInrFromPaise(p.rate_paise),
        impressions_30d: imps,
        clicks_30d: clks,
        ctr_pct: imps > 0 ? Math.round((clks / imps) * 10000) / 100 : 0,
        status: p.slot_status
      };
    });
    return { summary: { total_placements: rows.length, total_impressions_30d: rows.reduce((a, r) => a + r.impressions_30d, 0) }, rows };
  }

  if (reportType === 'referral_commission_payouts') {
    const { results } = await db.prepare(`SELECT * FROM mkt_referrals ORDER BY total_commission_paise DESC`).all();
    const rows = (results || []).map(r => ({
      code: r.referral_code,
      partner: r.partner_name,
      district: r.district_odisha,
      clicks: Number(r.clicks_count || 0),
      signups: Number(r.signups_attributed || 0),
      paid_conversions: Number(r.paid_conversions || 0),
      commission_paise: Number(r.total_commission_paise || 0),
      commission_inr: formatInrFromPaise(r.total_commission_paise),
      status: r.referral_status
    }));
    const totComm = rows.reduce((a, r) => a + r.commission_paise, 0);
    return {
      summary: {
        total_partners: rows.length,
        total_conversions: rows.reduce((a, r) => a + r.paid_conversions, 0),
        total_commission_paise: totComm,
        total_commission_inr: formatInrFromPaise(totComm)
      },
      rows
    };
  }

  // utm_channel_attribution
  const { results } = await db.prepare(`SELECT * FROM mkt_utm_links ORDER BY clicks_count DESC`).all();
  const rows = (results || []).map(u => ({
    code: u.utm_code,
    label: u.label_en,
    source: u.utm_source,
    medium: u.utm_medium,
    campaign: u.utm_campaign,
    clicks: Number(u.clicks_count || 0),
    conversions: Number(u.conversions_count || 0),
    status: u.governance_status
  }));
  return {
    summary: {
      total_utm_links: rows.length,
      total_clicks: rows.reduce((a, r) => a + r.clicks, 0),
      total_conversions: rows.reduce((a, r) => a + r.conversions, 0)
    },
    rows
  };
}

function toCsv(rows) {
  if (!Array.isArray(rows) || !rows.length) return 'empty\n';
  const keys = Object.keys(rows[0]);
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
}

async function nextReportCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_advertising_reports`).first();
  return `ADR-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleReports(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const errors = {};
    const rType = pick(url.searchParams.get('report_type'), MKT_REPORT_TYPES, 'report_type', errors, 'sponsor_roi_statement');
    if (Object.keys(errors).length) throw validationError(errors);

    const [live, { results: saved }] = await Promise.all([
      aggregateReportData(db, rType),
      db.prepare(`SELECT * FROM mkt_advertising_reports ORDER BY created_at DESC LIMIT 30`).all()
    ]);

    return json({
      report_type: rType,
      live_summary: live.summary,
      live_rows: live.rows,
      saved_reports: (saved || []).map(r => ({
        ...r,
        summary_metrics: parseJson(r.summary_metrics_json, {}),
        rows_snapshot: parseJson(r.rows_snapshot_json, [])
      }))
    });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 16000);
    const errors = {};
    const rType = pick(body.report_type, MKT_REPORT_TYPES, 'report_type', errors, 'sponsor_roi_statement');
    const titleEn = cleanStr(body.title_en || `Advertising Report (${rType})`, 180);
    if (Object.keys(errors).length) throw validationError(errors);

    const built = await aggregateReportData(db, rType);
    const newId = rid('mkt-rep');
    const code = await nextReportCode(db);
    await db.prepare(
      `INSERT INTO mkt_advertising_reports (id, report_code, report_type, period_label, title_en, title_or, summary_metrics_json, rows_snapshot_json, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, rType,
      cleanStr(body.period_label || '2026-Q4 / Nov 2026', 60),
      titleEn, cleanStr(body.title_or || '', 200),
      JSON.stringify(built.summary), JSON.stringify(built.rows),
      actor?.email || actor?.userId || 'staff'
    ).run();

    await audit(env, request, actor, 'mkt.report.generate', 'mkt_advertising_reports', newId, { report_code: code, report_type: rType });
    const created = await db.prepare(`SELECT * FROM mkt_advertising_reports WHERE id = ?`).bind(newId).first();
    return json({
      item: {
        ...created,
        summary_metrics: built.summary,
        rows_snapshot: built.rows
      }
    }, 201);
  }

  if (sub && extra === 'export' && method === 'GET') {
    const fmt = (url.searchParams.get('format') || 'csv').toLowerCase();
    const rep = await db.prepare(`SELECT * FROM mkt_advertising_reports WHERE id = ?`).bind(sub).first();
    if (!rep) throw new HttpError(404, 'NOT_FOUND', 'Report not found');
    const rows = parseJson(rep.rows_snapshot_json, []);
    const summary = parseJson(rep.summary_metrics_json, {});

    if (fmt === 'json') {
      return new Response(JSON.stringify({
        report_code: rep.report_code,
        report_type: rep.report_type,
        period_label: rep.period_label,
        title_en: rep.title_en,
        summary_metrics: summary,
        rows
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${rep.report_code}.json"`
        }
      });
    }

    return new Response(toCsv(rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${rep.report_code}.csv"`
      }
    });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleMarketingAdvertisingBatch3Admin(request, env, actor, id, sub, extra) {
  await ensureMarketingAdvertisingBatch3Schema(env.DB);
  if (id === 'landing-pages') return handleLandingPages(request, env, actor, sub, extra);
  if (id === 'reports') return handleReports(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown marketing batch 3 route');
}

/* ================= PUBLIC EDGE-CACHED LANDING PAGES API ================= */
export async function handlePublicMarketingLandingPagesApi(request, env) {
  await ensureMarketingAdvertisingBatch3Schema(env.DB);
  const url = new URL(request.url);
  const slug = normSlug(url.searchParams.get('slug') || '');

  if (slug) {
    const row = await env.DB.prepare(
      `SELECT lp.*, s.brand_display_en AS sponsor_name_en, s.brand_display_or AS sponsor_name_or
       FROM mkt_promo_landing_pages lp
       LEFT JOIN mkt_sponsors s ON s.id = lp.sponsor_id
       WHERE lp.slug = ? AND lp.page_status = 'published_live'`
    ).bind(slug).first();
    if (!row) return json({ error: 'Landing page not found' }, 404);
    await env.DB.prepare(`UPDATE mkt_promo_landing_pages SET views_count = views_count + 1 WHERE id = ?`).bind(row.id).run();
    return new Response(JSON.stringify({ item: decorateLandingPage(row) }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=120, s-maxage=300'
      }
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT lp.*, s.brand_display_en AS sponsor_name_en, s.brand_display_or AS sponsor_name_or
     FROM mkt_promo_landing_pages lp
     LEFT JOIN mkt_sponsors s ON s.id = lp.sponsor_id
     WHERE lp.page_status = 'published_live'
     ORDER BY lp.published_at DESC, lp.created_at DESC
     LIMIT 20`
  ).all();

  return new Response(JSON.stringify({ items: (results || []).map(decorateLandingPage) }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=300'
    }
  });
}
