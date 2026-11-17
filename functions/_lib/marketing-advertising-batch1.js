// Marketing & Advertising Batch 1 (v108): Modules 01-04
// 01 Advertising Placements | 02 Sponsors | 03 Promotional Banners | 04 Campaigns
// Store all INR monetary values in integer paise; never inject raw <script> in banner payloads.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';

export const MKT_PORTAL_SECTIONS = ['study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home'];
export const MKT_POSITION_ZONES = ['top_leaderboard', 'sidebar_card', 'in_feed_native', 'pdf_viewer_footer', 'mock_test_interstitial'];
export const MKT_PRICING_MODELS = ['cpm_paise', 'cpc_paise', 'flat_weekly_paise'];
export const MKT_SLOT_STATUSES = ['active', 'paused', 'reserved_sponsor', 'archived'];

export const MKT_SPONSOR_CATEGORIES = ['odisha_edtech_institute', 'university_college', 'book_publisher', 'skill_academy', 'csr_foundation'];
export const MKT_SPONSOR_TIERS = ['title_partner', 'gold_sponsor', 'portal_sponsor', 'scholarship_supporter'];
export const MKT_SPONSOR_STATUSES = ['active', 'pending_approval', 'renewal_due', 'expired'];

export const MKT_BANNER_THEMES = ['forest_gold', 'alabaster_emerald', 'amber_highlight', 'royal_indigo'];
export const MKT_BANNER_STATUSES = ['draft', 'scheduled', 'active_live', 'paused', 'archived'];

export const MKT_CAMPAIGN_OBJECTIVES = ['mock_test_enrollment', 'study_library_traffic', 'sponsor_brand_awareness', 'scholarship_drive', 'app_pwa_install'];
export const MKT_TARGET_AUDIENCES = ['OPSC OAS', 'OSSC/OSSSC', 'UGC NET', 'CHSE +2', 'All Odisha Aspirants'];
export const MKT_CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];

const _mkt1Ready = new WeakSet();

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

function intPaise(v, field, errors, { min = 0 } = {}) {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min) {
    errors[field] = `${field} must be an integer paise amount >= ${min}`;
    return 0;
  }
  return n;
}

export function formatInrFromPaise(paise) {
  const n = Number(paise || 0) / 100;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function maskGstin(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  if (s.includes('•')) return s.slice(0, 20);
  if (s.length <= 6) return '••••';
  return `${s.slice(0, 7)}••••${s.slice(-3)}`;
}

export function sanitizeBannerText(raw, maxLen = 280) {
  const stripped = String(raw || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '');
  return cleanStr(stripped, maxLen);
}

function safeTargetUrl(raw, field, errors, fallback = 'https://csodisha.com/') {
  const s = cleanStr(raw || '', 400);
  if (!s) return fallback;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  errors[field] = `${field} must be an https://, http://, or / relative URL`;
  return fallback;
}

export const MKT_REV_TABLES = {
  '01': {
    table: 'mkt_ad_placements',
    cols: ['slot_code', 'slot_name_en', 'slot_name_or', 'portal_section', 'position_zone', 'dimensions_label', 'pricing_model', 'rate_paise', 'max_concurrent_ads', 'impressions_30d', 'clicks_30d', 'slot_status']
  },
  '02': {
    table: 'mkt_sponsors',
    cols: ['sponsor_code', 'organization_name', 'brand_display_en', 'brand_display_or', 'sponsor_category', 'contact_person', 'contact_email', 'gstin_masked', 'sponsorship_tier', 'contract_value_paise', 'amount_paid_paise', 'logo_url', 'website_url', 'contract_start_date', 'contract_end_date', 'sponsor_status']
  },
  '03': {
    table: 'mkt_promo_banners',
    cols: ['banner_code', 'placement_id', 'sponsor_id', 'campaign_id', 'headline_en', 'headline_or', 'subcopy_en', 'subcopy_or', 'cta_label_en', 'cta_label_or', 'target_url', 'badge_tag_en', 'badge_tag_or', 'theme_variant', 'impressions_count', 'clicks_count', 'priority_weight', 'banner_status', 'starts_at', 'ends_at']
  },
  '04': {
    table: 'mkt_campaigns',
    cols: ['campaign_code', 'sponsor_id', 'campaign_name_en', 'campaign_name_or', 'objective', 'channels_json', 'target_exam_audience', 'budget_paise', 'spent_paise', 'target_conversions', 'actual_conversions', 'start_date', 'end_date', 'campaign_status']
  }
};

export async function snapshotMktRevision(db, moduleCode, entityId, actor, changeNote = 'update') {
  const cfg = MKT_REV_TABLES[moduleCode];
  if (!cfg || !entityId) return null;
  const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const maxRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS mv FROM mkt_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(maxRow?.mv || 0) + 1;
  const revId = rid('mkt-rev');
  await db.prepare(
    `INSERT INTO mkt_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(row), cleanStr(changeNote, 200), actor?.email || actor?.userId || 'system').run();
  return { id: revId, version_num: nextVer };
}

export async function ensureMarketingAdvertisingBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_mkt1Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS mkt_ad_placements (
      id TEXT PRIMARY KEY,
      slot_code TEXT NOT NULL UNIQUE,
      slot_name_en TEXT NOT NULL,
      slot_name_or TEXT NOT NULL DEFAULT '',
      portal_section TEXT NOT NULL DEFAULT 'study-library' CHECK (portal_section IN ('study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home')),
      position_zone TEXT NOT NULL DEFAULT 'top_leaderboard' CHECK (position_zone IN ('top_leaderboard', 'sidebar_card', 'in_feed_native', 'pdf_viewer_footer', 'mock_test_interstitial')),
      dimensions_label TEXT NOT NULL DEFAULT '728x90 / Responsive',
      pricing_model TEXT NOT NULL DEFAULT 'cpm_paise' CHECK (pricing_model IN ('cpm_paise', 'cpc_paise', 'flat_weekly_paise')),
      rate_paise INTEGER NOT NULL DEFAULT 0,
      max_concurrent_ads INTEGER NOT NULL DEFAULT 2,
      impressions_30d INTEGER NOT NULL DEFAULT 0,
      clicks_30d INTEGER NOT NULL DEFAULT 0,
      slot_status TEXT NOT NULL DEFAULT 'active' CHECK (slot_status IN ('active', 'paused', 'reserved_sponsor', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_placements_section ON mkt_ad_placements(portal_section, slot_status)`,
    `CREATE TABLE IF NOT EXISTS mkt_sponsors (
      id TEXT PRIMARY KEY,
      sponsor_code TEXT NOT NULL UNIQUE,
      organization_name TEXT NOT NULL,
      brand_display_en TEXT NOT NULL,
      brand_display_or TEXT NOT NULL DEFAULT '',
      sponsor_category TEXT NOT NULL DEFAULT 'odisha_edtech_institute' CHECK (sponsor_category IN ('odisha_edtech_institute', 'university_college', 'book_publisher', 'skill_academy', 'csr_foundation')),
      contact_person TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      gstin_masked TEXT NOT NULL DEFAULT '',
      sponsorship_tier TEXT NOT NULL DEFAULT 'portal_sponsor' CHECK (sponsorship_tier IN ('title_partner', 'gold_sponsor', 'portal_sponsor', 'scholarship_supporter')),
      contract_value_paise INTEGER NOT NULL DEFAULT 0,
      amount_paid_paise INTEGER NOT NULL DEFAULT 0,
      logo_url TEXT NOT NULL DEFAULT '',
      website_url TEXT NOT NULL DEFAULT '',
      contract_start_date TEXT NOT NULL DEFAULT '',
      contract_end_date TEXT NOT NULL DEFAULT '',
      sponsor_status TEXT NOT NULL DEFAULT 'active' CHECK (sponsor_status IN ('active', 'pending_approval', 'renewal_due', 'expired')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_sponsors_status ON mkt_sponsors(sponsor_status, sponsorship_tier)`,
    `CREATE TABLE IF NOT EXISTS mkt_campaigns (
      id TEXT PRIMARY KEY,
      campaign_code TEXT NOT NULL UNIQUE,
      sponsor_id TEXT REFERENCES mkt_sponsors(id) ON DELETE SET NULL,
      campaign_name_en TEXT NOT NULL,
      campaign_name_or TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT 'mock_test_enrollment' CHECK (objective IN ('mock_test_enrollment', 'study_library_traffic', 'sponsor_brand_awareness', 'scholarship_drive', 'app_pwa_install')),
      channels_json TEXT NOT NULL DEFAULT '["portal_banners","email_digest"]',
      target_exam_audience TEXT NOT NULL DEFAULT 'All Odisha Aspirants' CHECK (target_exam_audience IN ('OPSC OAS', 'OSSC/OSSSC', 'UGC NET', 'CHSE +2', 'All Odisha Aspirants')),
      budget_paise INTEGER NOT NULL DEFAULT 0,
      spent_paise INTEGER NOT NULL DEFAULT 0,
      target_conversions INTEGER NOT NULL DEFAULT 0,
      actual_conversions INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      campaign_status TEXT NOT NULL DEFAULT 'draft' CHECK (campaign_status IN ('draft', 'active', 'paused', 'completed', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_status ON mkt_campaigns(campaign_status, objective)`,
    `CREATE TABLE IF NOT EXISTS mkt_promo_banners (
      id TEXT PRIMARY KEY,
      banner_code TEXT NOT NULL UNIQUE,
      placement_id TEXT REFERENCES mkt_ad_placements(id) ON DELETE SET NULL,
      sponsor_id TEXT REFERENCES mkt_sponsors(id) ON DELETE SET NULL,
      campaign_id TEXT REFERENCES mkt_campaigns(id) ON DELETE SET NULL,
      headline_en TEXT NOT NULL,
      headline_or TEXT NOT NULL DEFAULT '',
      subcopy_en TEXT NOT NULL DEFAULT '',
      subcopy_or TEXT NOT NULL DEFAULT '',
      cta_label_en TEXT NOT NULL DEFAULT 'Learn More',
      cta_label_or TEXT NOT NULL DEFAULT 'ଅଧିକ ଜାଣନ୍ତୁ',
      target_url TEXT NOT NULL DEFAULT 'https://csodisha.com/',
      badge_tag_en TEXT NOT NULL DEFAULT 'Sponsored',
      badge_tag_or TEXT NOT NULL DEFAULT 'ପ୍ରାୟୋଜିତ',
      theme_variant TEXT NOT NULL DEFAULT 'forest_gold' CHECK (theme_variant IN ('forest_gold', 'alabaster_emerald', 'amber_highlight', 'royal_indigo')),
      impressions_count INTEGER NOT NULL DEFAULT 0,
      clicks_count INTEGER NOT NULL DEFAULT 0,
      priority_weight INTEGER NOT NULL DEFAULT 10,
      banner_status TEXT NOT NULL DEFAULT 'draft' CHECK (banner_status IN ('draft', 'scheduled', 'active_live', 'paused', 'archived')),
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_banners_status ON mkt_promo_banners(banner_status, priority_weight DESC)`,
    `CREATE TABLE IF NOT EXISTS mkt_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_rev_lookup ON mkt_revisions(module_code, entity_id, version_num DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 01: Ad Placements
  const pCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_ad_placements`).first();
  if (Number(pCnt?.n || 0) === 0) {
    const placements = [
      ['mkt-plc-01', 'SLOT-STUDY-TOP-01', 'Study Library Top Leaderboard', 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ ଶୀର୍ଷ ବ୍ୟାନର୍', 'study-library', 'top_leaderboard', '728x90 / Responsive', 'cpm_paise', 4500, 2, 42800, 1190, 'active'],
      ['mkt-plc-02', 'SLOT-JOBS-FEED-01', 'Jobs & Careers In-Feed Native', 'ଚାକିରି ପୋର୍ଟାଲ୍ ଇନ୍-ଫିଡ୍ କାର୍ଡ', 'jobs-careers', 'in_feed_native', '640x160 / Card', 'flat_weekly_paise', 750000, 2, 51200, 1640, 'active'],
      ['mkt-plc-03', 'SLOT-MOCK-INT-01', 'Mock Test Results Interstitial', 'ମକ୍ ଟେଷ୍ଟ ଫଳାଫଳ ବ୍ୟାନର୍', 'educational-tools', 'mock_test_interstitial', '480x240', 'cpc_paise', 1200, 1, 18900, 740, 'reserved_sponsor'],
      ['mkt-plc-04', 'SLOT-SCHEME-SIDE-01', 'Odisha Schemes Sidebar Card', 'ଯୋଜନା ସାଇଡ୍-ବାର୍ କାର୍ଡ', 'schemes', 'sidebar_card', '300x250', 'flat_weekly_paise', 450000, 2, 24100, 610, 'active']
    ];
    for (const p of placements) {
      await db.prepare(
        `INSERT INTO mkt_ad_placements (id, slot_code, slot_name_en, slot_name_or, portal_section, position_zone, dimensions_label, pricing_model, rate_paise, max_concurrent_ads, impressions_30d, clicks_30d, slot_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...p).run();
    }
  }

  // Seed Module 02: Sponsors
  const sCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_sponsors`).first();
  if (Number(sCnt?.n || 0) === 0) {
    const sponsors = [
      ['mkt-spn-01', 'SPN-2026-0001', 'Kalinga Civil Services Academy', 'Kalinga IAS Bhubaneswar', 'କଳିଙ୍ଗ IAS ଭୁବନେଶ୍ୱର', 'odisha_edtech_institute', 'S. Patnaik', 'partners@kalingaias.example', '21AABCK••••1Z5', 'title_partner', 12000000, 9000000, 'https://csodisha.com/assets/brand/cso-mark.svg', 'https://csodisha.com/study-library/', '2026-10-01', '2027-03-31', 'active'],
      ['mkt-spn-02', 'SPN-2026-0002', 'Utkal Vidya Prakashan', 'Utkal Vidya Books Cuttack', 'ଉତ୍କଳ ବିଦ୍ୟା ପ୍ରକାଶନ କଟକ', 'book_publisher', 'R. Mohanty', 'sales@utkalvidya.example', '21AAACU••••9Z2', 'gold_sponsor', 6500000, 6500000, 'https://csodisha.com/assets/brand/cso-mark.svg', 'https://csodisha.com/mock-tests/', '2026-09-01', '2027-02-28', 'active']
    ];
    for (const s of sponsors) {
      await db.prepare(
        `INSERT INTO mkt_sponsors (id, sponsor_code, organization_name, brand_display_en, brand_display_or, sponsor_category, contact_person, contact_email, gstin_masked, sponsorship_tier, contract_value_paise, amount_paid_paise, logo_url, website_url, contract_start_date, contract_end_date, sponsor_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...s).run();
    }
  }

  // Seed Module 04: Campaigns
  const cCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_campaigns`).first();
  if (Number(cCnt?.n || 0) === 0) {
    const campaigns = [
      ['mkt-cmp-01', 'CMP-2026-0001', 'mkt-spn-01', 'OPSC OAS 2026 Prelims Test Series Drive', 'OPSC OAS ୨୦୨୬ ପ୍ରିଲିମ୍ସ ଟେଷ୍ଟ ସିରିଜ୍ ଅଭିଯାନ', 'mock_test_enrollment', JSON.stringify(['portal_banners', 'email_digest', 'telegram']), 'OPSC OAS', 5000000, 2850000, 1200, 740, '2026-11-01', '2026-12-15', 'active'],
      ['mkt-cmp-02', 'CMP-2026-0002', 'mkt-spn-02', 'CS Odisha Bilingual PYQ & Study Library Drive', 'CS ଓଡ଼ିଶା ଦ୍ୱିଭାଷୀ PYQ ଏବଂ ଅଧ୍ୟୟନ ଅଭିଯାନ', 'study_library_traffic', JSON.stringify(['portal_banners', 'web_push']), 'OSSC/OSSSC', 2500000, 1100000, 2500, 1680, '2026-11-05', '2026-12-31', 'active']
    ];
    for (const c of campaigns) {
      await db.prepare(
        `INSERT INTO mkt_campaigns (id, campaign_code, sponsor_id, campaign_name_en, campaign_name_or, objective, channels_json, target_exam_audience, budget_paise, spent_paise, target_conversions, actual_conversions, start_date, end_date, campaign_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...c).run();
    }
  }

  // Seed Module 03: Promotional Banners
  const bCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_banners`).first();
  if (Number(bCnt?.n || 0) === 0) {
    const banners = [
      ['mkt-bnr-01', 'BNR-2026-0001', 'mkt-plc-01', 'mkt-spn-01', 'mkt-cmp-01',
       'OPSC OAS 2026 Bilingual GS-1 & CSAT Free Mock Pack',
       'OPSC OAS ୨୦୨୬ ଦ୍ୱିଭାଷୀ GS-1 ଏବଂ CSAT ମାଗଣା ମକ୍ ଟେଷ୍ଟ',
       'Attempt 50-question OMR & CBT practice sets with Odisha Special explanations.',
       'ଓଡ଼ିଶା ବିଶେଷ ବ୍ୟାଖ୍ୟା ସହିତ ୫୦-ପ୍ରଶ୍ନ ମକ୍ ଟେଷ୍ଟ ଅଭ୍ୟାସ କରନ୍ତୁ।',
       'Start Free Mock', 'ମକ୍ ଟେଷ୍ଟ ଆରମ୍ଭ କରନ୍ତୁ',
       'https://csodisha.com/mock-tests/', 'Sponsored · Kalinga IAS', 'ପ୍ରାୟୋଜିତ · କଳିଙ୍ଗ IAS',
       'forest_gold', 24600, 780, 100, 'active_live', '2026-11-01', '2026-12-31'],
      ['mkt-bnr-02', 'BNR-2026-0002', 'mkt-plc-02', 'mkt-spn-02', 'mkt-cmp-02',
       'OSSC & OSSSC Complete 10-Year Solved PYQ PDF Library',
       'OSSC ଏବଂ OSSSC ୧୦ ବର୍ଷର ସମାଧାନ PYQ PDF ଲାଇବ୍ରେରୀ',
       'Download topic-wise Odia & English solved question banks for RI, ARI & CGL.',
       'RI, ARI ଏବଂ CGL ପାଇଁ ଓଡ଼ିଆ ଓ ଇଂରାଜୀ PYQ PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ।',
       'Browse PYQ PDFs', 'PYQ PDF ଦେଖନ୍ତୁ',
       'https://csodisha.com/study-library/', 'Odisha Study Partner', 'ଓଡ଼ିଶା ଅଧ୍ୟୟନ ସହଯୋଗୀ',
       'alabaster_emerald', 19400, 620, 90, 'active_live', '2026-11-01', '2026-12-31']
    ];
    for (const b of banners) {
      await db.prepare(
        `INSERT INTO mkt_promo_banners (id, banner_code, placement_id, sponsor_id, campaign_id, headline_en, headline_or, subcopy_en, subcopy_or, cta_label_en, cta_label_or, target_url, badge_tag_en, badge_tag_or, theme_variant, impressions_count, clicks_count, priority_weight, banner_status, starts_at, ends_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...b).run();
    }
  }

  _mkt1Ready.add(db);
}

/* ================= OVERVIEW ================= */
export async function getMarketingOverview(db) {
  await ensureMarketingAdvertisingBatch1Schema(db);
  const [plcAct, plcTot, spnAct, spnTot, spnVal, bnrLive, bnrTot, cmpAct, cmpTot, impClicks] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_ad_placements WHERE slot_status IN ('active','reserved_sponsor')`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_ad_placements`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_sponsors WHERE sponsor_status = 'active'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_sponsors`).first(),
    db.prepare(`SELECT COALESCE(SUM(contract_value_paise), 0) AS cv, COALESCE(SUM(amount_paid_paise), 0) AS pv FROM mkt_sponsors`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_banners WHERE banner_status = 'active_live'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_banners`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_campaigns WHERE campaign_status = 'active'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_campaigns`).first(),
    db.prepare(`SELECT COALESCE(SUM(impressions_count), 0) AS imps, COALESCE(SUM(clicks_count), 0) AS clks FROM mkt_promo_banners`).first()
  ]);

  const imps = Number(impClicks?.imps || 0);
  const clks = Number(impClicks?.clks || 0);
  const blendedCtrPct = imps > 0 ? Math.round((clks / imps) * 10000) / 100 : 0;
  const contractPaise = Number(spnVal?.cv || 0);

  const modules = {};
  for (let i = 1; i <= 10; i++) {
    const k = String(i).padStart(2, '0');
    const active = i <= 4;
    let count = 0;
    if (i === 1) count = Number(plcTot?.n || 0);
    else if (i === 2) count = Number(spnTot?.n || 0);
    else if (i === 3) count = Number(bnrTot?.n || 0);
    else if (i === 4) count = Number(cmpTot?.n || 0);
    modules[k] = { status: active ? 'active' : 'queued', count };
  }

  return {
    active_ad_placements: Number(plcAct?.n || 0),
    active_sponsors: Number(spnAct?.n || 0),
    total_sponsor_contract_paise: contractPaise,
    total_sponsor_contract_inr: formatInrFromPaise(contractPaise),
    total_sponsor_paid_paise: Number(spnVal?.pv || 0),
    live_promotional_banners: Number(bnrLive?.n || 0),
    active_campaigns: Number(cmpAct?.n || 0),
    blended_ctr_pct: blendedCtrPct,
    modules
  };
}

/* ================= MODULE 01: AD PLACEMENTS ================= */
function decoratePlacement(row) {
  if (!row) return row;
  const imps = Number(row.impressions_30d || 0);
  const clks = Number(row.clicks_30d || 0);
  return {
    ...row,
    rate_inr: formatInrFromPaise(row.rate_paise),
    ctr_pct: imps > 0 ? Math.round((clks / imps) * 10000) / 100 : 0
  };
}

async function nextPlacementCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_ad_placements`).first();
  return `SLOT-CSO-${String(Number(r?.n || 0) + 1).padStart(3, '0')}`;
}

async function handlePlacements(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const sec = (url.searchParams.get('portal_section') || '').trim();
    const st = (url.searchParams.get('slot_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (sec && MKT_PORTAL_SECTIONS.includes(sec)) { where.push('portal_section = ?'); binds.push(sec); }
    if (st && MKT_SLOT_STATUSES.includes(st)) { where.push('slot_status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(slot_code LIKE ? ESCAPE '\\' OR slot_name_en LIKE ? ESCAPE '\\')`);
      binds.push(p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM mkt_ad_placements ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decoratePlacement) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 16000);
    const errors = {};
    const nameEn = cleanStr(body.slot_name_en || '', 160);
    if (!nameEn) errors.slot_name_en = 'slot_name_en is required';
    const sec = pick(body.portal_section, MKT_PORTAL_SECTIONS, 'portal_section', errors, 'study-library');
    const zone = pick(body.position_zone, MKT_POSITION_ZONES, 'position_zone', errors, 'top_leaderboard');
    const model = pick(body.pricing_model, MKT_PRICING_MODELS, 'pricing_model', errors, 'cpm_paise');
    const st = pick(body.slot_status, MKT_SLOT_STATUSES, 'slot_status', errors, 'active');
    const rate = intPaise(body.rate_paise, 'rate_paise', errors, { min: 0 });
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('mkt-plc');
    const code = cleanStr(body.slot_code || '', 60).toUpperCase() || await nextPlacementCode(db);
    await db.prepare(
      `INSERT INTO mkt_ad_placements (id, slot_code, slot_name_en, slot_name_or, portal_section, position_zone, dimensions_label, pricing_model, rate_paise, max_concurrent_ads, slot_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, nameEn, cleanStr(body.slot_name_or || '', 200), sec, zone,
      cleanStr(body.dimensions_label || '728x90 / Responsive', 80), model, rate,
      Math.max(1, Number(body.max_concurrent_ads || 2) || 2), st
    ).run();

    await snapshotMktRevision(db, '01', newId, actor, 'create ad placement');
    await audit(env, request, actor, 'mkt.placement.create', 'mkt_ad_placements', newId, { slot_code: code });
    const created = await db.prepare(`SELECT * FROM mkt_ad_placements WHERE id = ?`).bind(newId).first();
    return json({ item: decoratePlacement(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM mkt_ad_placements WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Placement not found');
    const body = await readJson(request, 16000);
    const errors = {};
    const sec = body.portal_section !== undefined ? pick(body.portal_section, MKT_PORTAL_SECTIONS, 'portal_section', errors, ex.portal_section) : ex.portal_section;
    const zone = body.position_zone !== undefined ? pick(body.position_zone, MKT_POSITION_ZONES, 'position_zone', errors, ex.position_zone) : ex.position_zone;
    const model = body.pricing_model !== undefined ? pick(body.pricing_model, MKT_PRICING_MODELS, 'pricing_model', errors, ex.pricing_model) : ex.pricing_model;
    const st = body.slot_status !== undefined ? pick(body.slot_status, MKT_SLOT_STATUSES, 'slot_status', errors, ex.slot_status) : ex.slot_status;
    const rate = body.rate_paise !== undefined ? intPaise(body.rate_paise, 'rate_paise', errors, { min: 0 }) : ex.rate_paise;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotMktRevision(db, '01', sub, actor, 'update ad placement');
    await db.prepare(
      `UPDATE mkt_ad_placements
       SET slot_name_en = ?, slot_name_or = ?, portal_section = ?, position_zone = ?, dimensions_label = ?,
           pricing_model = ?, rate_paise = ?, max_concurrent_ads = ?, slot_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.slot_name_en !== undefined ? cleanStr(body.slot_name_en, 160) : ex.slot_name_en,
      body.slot_name_or !== undefined ? cleanStr(body.slot_name_or, 200) : ex.slot_name_or,
      sec, zone,
      body.dimensions_label !== undefined ? cleanStr(body.dimensions_label, 80) : ex.dimensions_label,
      model, rate,
      body.max_concurrent_ads !== undefined ? Math.max(1, Number(body.max_concurrent_ads || 1)) : ex.max_concurrent_ads,
      st, sub
    ).run();
    await audit(env, request, actor, 'mkt.placement.update', 'mkt_ad_placements', sub, {});
    const updated = await db.prepare(`SELECT * FROM mkt_ad_placements WHERE id = ?`).bind(sub).first();
    return json({ item: decoratePlacement(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_ad_placements WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Placement not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.slot_status, MKT_SLOT_STATUSES, 'slot_status', errors, ex.slot_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotMktRevision(db, '01', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE mkt_ad_placements SET slot_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    await audit(env, request, actor, 'mkt.placement.status', 'mkt_ad_placements', sub, { slot_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_ad_placements WHERE id = ?`).bind(sub).first();
    return json({ item: decoratePlacement(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotMktRevision(db, '01', sub, actor, 'archive ad placement');
    await db.prepare(`UPDATE mkt_ad_placements SET slot_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.placement.archive', 'mkt_ad_placements', sub, {});
    return json({ ok: true, id: sub, slot_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 02: SPONSORS ================= */
function decorateSponsor(row) {
  if (!row) return row;
  const cv = Number(row.contract_value_paise || 0);
  const pv = Number(row.amount_paid_paise || 0);
  return {
    ...row,
    contract_value_inr: formatInrFromPaise(cv),
    amount_paid_inr: formatInrFromPaise(pv),
    paid_pct: cv > 0 ? Math.min(100, Math.round((pv / cv) * 1000) / 10) : 0
  };
}

async function nextSponsorCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_sponsors`).first();
  return `SPN-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleSponsors(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const tier = (url.searchParams.get('sponsorship_tier') || '').trim();
    const st = (url.searchParams.get('sponsor_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (tier && MKT_SPONSOR_TIERS.includes(tier)) { where.push('sponsorship_tier = ?'); binds.push(tier); }
    if (st && MKT_SPONSOR_STATUSES.includes(st)) { where.push('sponsor_status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(sponsor_code LIKE ? ESCAPE '\\' OR organization_name LIKE ? ESCAPE '\\' OR brand_display_en LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM mkt_sponsors ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decorateSponsor) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 16000);
    const errors = {};
    const org = cleanStr(body.organization_name || '', 160);
    const brandEn = cleanStr(body.brand_display_en || org, 160);
    if (!org) errors.organization_name = 'organization_name is required';
    const cat = pick(body.sponsor_category, MKT_SPONSOR_CATEGORIES, 'sponsor_category', errors, 'odisha_edtech_institute');
    const tier = pick(body.sponsorship_tier, MKT_SPONSOR_TIERS, 'sponsorship_tier', errors, 'portal_sponsor');
    const st = pick(body.sponsor_status, MKT_SPONSOR_STATUSES, 'sponsor_status', errors, 'active');
    const cv = intPaise(body.contract_value_paise, 'contract_value_paise', errors, { min: 0 });
    const pv = intPaise(body.amount_paid_paise, 'amount_paid_paise', errors, { min: 0 });
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('mkt-spn');
    const code = await nextSponsorCode(db);
    await db.prepare(
      `INSERT INTO mkt_sponsors (id, sponsor_code, organization_name, brand_display_en, brand_display_or, sponsor_category, contact_person, contact_email, gstin_masked, sponsorship_tier, contract_value_paise, amount_paid_paise, logo_url, website_url, contract_start_date, contract_end_date, sponsor_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, org, brandEn, cleanStr(body.brand_display_or || '', 200), cat,
      cleanStr(body.contact_person || '', 120), cleanStr(body.contact_email || '', 160),
      maskGstin(body.gstin || body.gstin_masked || ''), tier, cv, pv,
      cleanStr(body.logo_url || '', 300), cleanStr(body.website_url || '', 300),
      cleanStr(body.contract_start_date || '', 30), cleanStr(body.contract_end_date || '', 30), st
    ).run();

    await snapshotMktRevision(db, '02', newId, actor, 'create sponsor');
    await audit(env, request, actor, 'mkt.sponsor.create', 'mkt_sponsors', newId, { sponsor_code: code });
    const created = await db.prepare(`SELECT * FROM mkt_sponsors WHERE id = ?`).bind(newId).first();
    return json({ item: decorateSponsor(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM mkt_sponsors WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Sponsor not found');
    const body = await readJson(request, 16000);
    const errors = {};
    const cat = body.sponsor_category !== undefined ? pick(body.sponsor_category, MKT_SPONSOR_CATEGORIES, 'sponsor_category', errors, ex.sponsor_category) : ex.sponsor_category;
    const tier = body.sponsorship_tier !== undefined ? pick(body.sponsorship_tier, MKT_SPONSOR_TIERS, 'sponsorship_tier', errors, ex.sponsorship_tier) : ex.sponsorship_tier;
    const st = body.sponsor_status !== undefined ? pick(body.sponsor_status, MKT_SPONSOR_STATUSES, 'sponsor_status', errors, ex.sponsor_status) : ex.sponsor_status;
    const cv = body.contract_value_paise !== undefined ? intPaise(body.contract_value_paise, 'contract_value_paise', errors, { min: 0 }) : ex.contract_value_paise;
    const pv = body.amount_paid_paise !== undefined ? intPaise(body.amount_paid_paise, 'amount_paid_paise', errors, { min: 0 }) : ex.amount_paid_paise;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotMktRevision(db, '02', sub, actor, 'update sponsor');
    await db.prepare(
      `UPDATE mkt_sponsors
       SET organization_name = ?, brand_display_en = ?, brand_display_or = ?, sponsor_category = ?,
           contact_person = ?, contact_email = ?, gstin_masked = ?, sponsorship_tier = ?,
           contract_value_paise = ?, amount_paid_paise = ?, logo_url = ?, website_url = ?,
           contract_start_date = ?, contract_end_date = ?, sponsor_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.organization_name !== undefined ? cleanStr(body.organization_name, 160) : ex.organization_name,
      body.brand_display_en !== undefined ? cleanStr(body.brand_display_en, 160) : ex.brand_display_en,
      body.brand_display_or !== undefined ? cleanStr(body.brand_display_or, 200) : ex.brand_display_or,
      cat,
      body.contact_person !== undefined ? cleanStr(body.contact_person, 120) : ex.contact_person,
      body.contact_email !== undefined ? cleanStr(body.contact_email, 160) : ex.contact_email,
      (body.gstin || body.gstin_masked) !== undefined ? maskGstin(body.gstin || body.gstin_masked) : ex.gstin_masked,
      tier, cv, pv,
      body.logo_url !== undefined ? cleanStr(body.logo_url, 300) : ex.logo_url,
      body.website_url !== undefined ? cleanStr(body.website_url, 300) : ex.website_url,
      body.contract_start_date !== undefined ? cleanStr(body.contract_start_date, 30) : ex.contract_start_date,
      body.contract_end_date !== undefined ? cleanStr(body.contract_end_date, 30) : ex.contract_end_date,
      st, sub
    ).run();
    await audit(env, request, actor, 'mkt.sponsor.update', 'mkt_sponsors', sub, {});
    const updated = await db.prepare(`SELECT * FROM mkt_sponsors WHERE id = ?`).bind(sub).first();
    return json({ item: decorateSponsor(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_sponsors WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Sponsor not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.sponsor_status, MKT_SPONSOR_STATUSES, 'sponsor_status', errors, ex.sponsor_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotMktRevision(db, '02', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE mkt_sponsors SET sponsor_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    await audit(env, request, actor, 'mkt.sponsor.status', 'mkt_sponsors', sub, { sponsor_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_sponsors WHERE id = ?`).bind(sub).first();
    return json({ item: decorateSponsor(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotMktRevision(db, '02', sub, actor, 'expire sponsor');
    await db.prepare(`UPDATE mkt_sponsors SET sponsor_status = 'expired', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.sponsor.archive', 'mkt_sponsors', sub, {});
    return json({ ok: true, id: sub, sponsor_status: 'expired' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 03: PROMOTIONAL BANNERS ================= */
function decorateBanner(row) {
  if (!row) return row;
  const imps = Number(row.impressions_count || 0);
  const clks = Number(row.clicks_count || 0);
  return {
    ...row,
    ctr_pct: imps > 0 ? Math.round((clks / imps) * 10000) / 100 : 0
  };
}

async function nextBannerCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_promo_banners`).first();
  return `BNR-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleBanners(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const st = (url.searchParams.get('banner_status') || '').trim();
    const th = (url.searchParams.get('theme_variant') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (st && MKT_BANNER_STATUSES.includes(st)) { where.push('b.banner_status = ?'); binds.push(st); }
    if (th && MKT_BANNER_THEMES.includes(th)) { where.push('b.theme_variant = ?'); binds.push(th); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(b.banner_code LIKE ? ESCAPE '\\' OR b.headline_en LIKE ? ESCAPE '\\')`);
      binds.push(p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT b.*, p.slot_code, p.portal_section, s.brand_display_en AS sponsor_name
       FROM mkt_promo_banners b
       LEFT JOIN mkt_ad_placements p ON p.id = b.placement_id
       LEFT JOIN mkt_sponsors s ON s.id = b.sponsor_id
       ${w} ORDER BY b.priority_weight DESC, b.created_at DESC`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateBanner) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 24000);
    const errors = {};
    const headEn = sanitizeBannerText(body.headline_en || '', 180);
    if (!headEn) errors.headline_en = 'headline_en is required';
    const theme = pick(body.theme_variant, MKT_BANNER_THEMES, 'theme_variant', errors, 'forest_gold');
    const st = pick(body.banner_status, MKT_BANNER_STATUSES, 'banner_status', errors, 'draft');
    const targetUrl = safeTargetUrl(body.target_url, 'target_url', errors);
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('mkt-bnr');
    const code = await nextBannerCode(db);
    await db.prepare(
      `INSERT INTO mkt_promo_banners (id, banner_code, placement_id, sponsor_id, campaign_id, headline_en, headline_or, subcopy_en, subcopy_or, cta_label_en, cta_label_or, target_url, badge_tag_en, badge_tag_or, theme_variant, priority_weight, banner_status, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code,
      body.placement_id ? cleanStr(body.placement_id, 64) : null,
      body.sponsor_id ? cleanStr(body.sponsor_id, 64) : null,
      body.campaign_id ? cleanStr(body.campaign_id, 64) : null,
      headEn, sanitizeBannerText(body.headline_or || '', 220),
      sanitizeBannerText(body.subcopy_en || '', 300), sanitizeBannerText(body.subcopy_or || '', 340),
      sanitizeBannerText(body.cta_label_en || 'Learn More', 60), sanitizeBannerText(body.cta_label_or || 'ଅଧିକ ଜାଣନ୍ତୁ', 80),
      targetUrl, sanitizeBannerText(body.badge_tag_en || 'Sponsored', 60), sanitizeBannerText(body.badge_tag_or || 'ପ୍ରାୟୋଜିତ', 80),
      theme, Math.max(1, Number(body.priority_weight || 10) || 10), st,
      body.starts_at ? cleanStr(body.starts_at, 40) : null,
      body.ends_at ? cleanStr(body.ends_at, 40) : null
    ).run();

    await snapshotMktRevision(db, '03', newId, actor, 'create promotional banner');
    await audit(env, request, actor, 'mkt.banner.create', 'mkt_promo_banners', newId, { banner_code: code });
    const created = await db.prepare(`SELECT * FROM mkt_promo_banners WHERE id = ?`).bind(newId).first();
    return json({ item: decorateBanner(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM mkt_promo_banners WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Banner not found');
    const body = await readJson(request, 24000);
    const errors = {};
    const theme = body.theme_variant !== undefined ? pick(body.theme_variant, MKT_BANNER_THEMES, 'theme_variant', errors, ex.theme_variant) : ex.theme_variant;
    const st = body.banner_status !== undefined ? pick(body.banner_status, MKT_BANNER_STATUSES, 'banner_status', errors, ex.banner_status) : ex.banner_status;
    const targetUrl = body.target_url !== undefined ? safeTargetUrl(body.target_url, 'target_url', errors, ex.target_url) : ex.target_url;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotMktRevision(db, '03', sub, actor, 'update promotional banner');
    await db.prepare(
      `UPDATE mkt_promo_banners
       SET placement_id = ?, sponsor_id = ?, campaign_id = ?, headline_en = ?, headline_or = ?,
           subcopy_en = ?, subcopy_or = ?, cta_label_en = ?, cta_label_or = ?, target_url = ?,
           badge_tag_en = ?, badge_tag_or = ?, theme_variant = ?, priority_weight = ?,
           banner_status = ?, starts_at = ?, ends_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.placement_id !== undefined ? (body.placement_id || null) : ex.placement_id,
      body.sponsor_id !== undefined ? (body.sponsor_id || null) : ex.sponsor_id,
      body.campaign_id !== undefined ? (body.campaign_id || null) : ex.campaign_id,
      body.headline_en !== undefined ? sanitizeBannerText(body.headline_en, 180) : ex.headline_en,
      body.headline_or !== undefined ? sanitizeBannerText(body.headline_or, 220) : ex.headline_or,
      body.subcopy_en !== undefined ? sanitizeBannerText(body.subcopy_en, 300) : ex.subcopy_en,
      body.subcopy_or !== undefined ? sanitizeBannerText(body.subcopy_or, 340) : ex.subcopy_or,
      body.cta_label_en !== undefined ? sanitizeBannerText(body.cta_label_en, 60) : ex.cta_label_en,
      body.cta_label_or !== undefined ? sanitizeBannerText(body.cta_label_or, 80) : ex.cta_label_or,
      targetUrl,
      body.badge_tag_en !== undefined ? sanitizeBannerText(body.badge_tag_en, 60) : ex.badge_tag_en,
      body.badge_tag_or !== undefined ? sanitizeBannerText(body.badge_tag_or, 80) : ex.badge_tag_or,
      theme,
      body.priority_weight !== undefined ? Math.max(1, Number(body.priority_weight || 10)) : ex.priority_weight,
      st,
      body.starts_at !== undefined ? (body.starts_at || null) : ex.starts_at,
      body.ends_at !== undefined ? (body.ends_at || null) : ex.ends_at,
      sub
    ).run();
    await audit(env, request, actor, 'mkt.banner.update', 'mkt_promo_banners', sub, {});
    const updated = await db.prepare(`SELECT * FROM mkt_promo_banners WHERE id = ?`).bind(sub).first();
    return json({ item: decorateBanner(updated) });
  }

  if (sub === 'bulk_status' && (method === 'PATCH' || method === 'POST')) {
    const body = await readJson(request, 12000);
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean).slice(0, 50) : [];
    const errors = {};
    if (!ids.length) errors.ids = 'ids array is required';
    const st = pick(body.banner_status, MKT_BANNER_STATUSES, 'banner_status', errors, 'paused');
    if (Object.keys(errors).length) throw validationError(errors);
    for (const id of ids) {
      await snapshotMktRevision(db, '03', id, actor, `bulk status -> ${st}`);
      await db.prepare(`UPDATE mkt_promo_banners SET banner_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, id).run();
    }
    await audit(env, request, actor, 'mkt.banner.bulk_status', 'mkt_promo_banners', ids.join(','), { banner_status: st });
    return json({ ok: true, updated_count: ids.length, banner_status: st });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_promo_banners WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Banner not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.banner_status, MKT_BANNER_STATUSES, 'banner_status', errors, ex.banner_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotMktRevision(db, '03', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE mkt_promo_banners SET banner_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    await audit(env, request, actor, 'mkt.banner.status', 'mkt_promo_banners', sub, { banner_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_promo_banners WHERE id = ?`).bind(sub).first();
    return json({ item: decorateBanner(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotMktRevision(db, '03', sub, actor, 'archive banner');
    await db.prepare(`UPDATE mkt_promo_banners SET banner_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.banner.archive', 'mkt_promo_banners', sub, {});
    return json({ ok: true, id: sub, banner_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 04: CAMPAIGNS ================= */
function decorateCampaign(row) {
  if (!row) return row;
  const b = Number(row.budget_paise || 0);
  const s = Number(row.spent_paise || 0);
  const tc = Number(row.target_conversions || 0);
  const ac = Number(row.actual_conversions || 0);
  return {
    ...row,
    channels: parseJson(row.channels_json, []),
    budget_inr: formatInrFromPaise(b),
    spent_inr: formatInrFromPaise(s),
    budget_used_pct: b > 0 ? Math.min(100, Math.round((s / b) * 1000) / 10) : 0,
    conversion_pct: tc > 0 ? Math.min(100, Math.round((ac / tc) * 1000) / 10) : 0
  };
}

async function nextCampaignCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_campaigns`).first();
  return `CMP-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleCampaigns(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const obj = (url.searchParams.get('objective') || '').trim();
    const st = (url.searchParams.get('campaign_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (obj && MKT_CAMPAIGN_OBJECTIVES.includes(obj)) { where.push('objective = ?'); binds.push(obj); }
    if (st && MKT_CAMPAIGN_STATUSES.includes(st)) { where.push('campaign_status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(campaign_code LIKE ? ESCAPE '\\' OR campaign_name_en LIKE ? ESCAPE '\\')`);
      binds.push(p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM mkt_campaigns ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decorateCampaign) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const nameEn = cleanStr(body.campaign_name_en || '', 180);
    if (!nameEn) errors.campaign_name_en = 'campaign_name_en is required';
    const obj = pick(body.objective, MKT_CAMPAIGN_OBJECTIVES, 'objective', errors, 'mock_test_enrollment');
    const aud = pick(body.target_exam_audience, MKT_TARGET_AUDIENCES, 'target_exam_audience', errors, 'All Odisha Aspirants');
    const st = pick(body.campaign_status, MKT_CAMPAIGN_STATUSES, 'campaign_status', errors, 'draft');
    const budget = intPaise(body.budget_paise, 'budget_paise', errors, { min: 0 });
    const spent = intPaise(body.spent_paise, 'spent_paise', errors, { min: 0 });
    if (Object.keys(errors).length) throw validationError(errors);

    const channels = Array.isArray(body.channels) ? body.channels : ['portal_banners', 'email_digest'];
    const newId = rid('mkt-cmp');
    const code = await nextCampaignCode(db);
    await db.prepare(
      `INSERT INTO mkt_campaigns (id, campaign_code, sponsor_id, campaign_name_en, campaign_name_or, objective, channels_json, target_exam_audience, budget_paise, spent_paise, target_conversions, actual_conversions, start_date, end_date, campaign_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, body.sponsor_id ? cleanStr(body.sponsor_id, 64) : null,
      nameEn, cleanStr(body.campaign_name_or || '', 220), obj, JSON.stringify(channels), aud,
      budget, spent,
      Math.max(0, Number(body.target_conversions || 0) || 0),
      Math.max(0, Number(body.actual_conversions || 0) || 0),
      cleanStr(body.start_date || '', 30), cleanStr(body.end_date || '', 30), st
    ).run();

    await snapshotMktRevision(db, '04', newId, actor, 'create campaign');
    await audit(env, request, actor, 'mkt.campaign.create', 'mkt_campaigns', newId, { campaign_code: code });
    const created = await db.prepare(`SELECT * FROM mkt_campaigns WHERE id = ?`).bind(newId).first();
    return json({ item: decorateCampaign(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM mkt_campaigns WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Campaign not found');
    const body = await readJson(request, 20000);
    const errors = {};
    const obj = body.objective !== undefined ? pick(body.objective, MKT_CAMPAIGN_OBJECTIVES, 'objective', errors, ex.objective) : ex.objective;
    const aud = body.target_exam_audience !== undefined ? pick(body.target_exam_audience, MKT_TARGET_AUDIENCES, 'target_exam_audience', errors, ex.target_exam_audience) : ex.target_exam_audience;
    const st = body.campaign_status !== undefined ? pick(body.campaign_status, MKT_CAMPAIGN_STATUSES, 'campaign_status', errors, ex.campaign_status) : ex.campaign_status;
    const budget = body.budget_paise !== undefined ? intPaise(body.budget_paise, 'budget_paise', errors, { min: 0 }) : ex.budget_paise;
    const spent = body.spent_paise !== undefined ? intPaise(body.spent_paise, 'spent_paise', errors, { min: 0 }) : ex.spent_paise;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotMktRevision(db, '04', sub, actor, 'update campaign');
    await db.prepare(
      `UPDATE mkt_campaigns
       SET sponsor_id = ?, campaign_name_en = ?, campaign_name_or = ?, objective = ?, channels_json = ?,
           target_exam_audience = ?, budget_paise = ?, spent_paise = ?, target_conversions = ?,
           actual_conversions = ?, start_date = ?, end_date = ?, campaign_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.sponsor_id !== undefined ? (body.sponsor_id || null) : ex.sponsor_id,
      body.campaign_name_en !== undefined ? cleanStr(body.campaign_name_en, 180) : ex.campaign_name_en,
      body.campaign_name_or !== undefined ? cleanStr(body.campaign_name_or, 220) : ex.campaign_name_or,
      obj,
      Array.isArray(body.channels) ? JSON.stringify(body.channels) : ex.channels_json,
      aud, budget, spent,
      body.target_conversions !== undefined ? Math.max(0, Number(body.target_conversions || 0)) : ex.target_conversions,
      body.actual_conversions !== undefined ? Math.max(0, Number(body.actual_conversions || 0)) : ex.actual_conversions,
      body.start_date !== undefined ? cleanStr(body.start_date, 30) : ex.start_date,
      body.end_date !== undefined ? cleanStr(body.end_date, 30) : ex.end_date,
      st, sub
    ).run();
    await audit(env, request, actor, 'mkt.campaign.update', 'mkt_campaigns', sub, {});
    const updated = await db.prepare(`SELECT * FROM mkt_campaigns WHERE id = ?`).bind(sub).first();
    return json({ item: decorateCampaign(updated) });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_campaigns WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Campaign not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.campaign_status, MKT_CAMPAIGN_STATUSES, 'campaign_status', errors, ex.campaign_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotMktRevision(db, '04', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE mkt_campaigns SET campaign_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    await audit(env, request, actor, 'mkt.campaign.status', 'mkt_campaigns', sub, { campaign_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_campaigns WHERE id = ?`).bind(sub).first();
    return json({ item: decorateCampaign(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotMktRevision(db, '04', sub, actor, 'archive campaign');
    await db.prepare(`UPDATE mkt_campaigns SET campaign_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.campaign.archive', 'mkt_campaigns', sub, {});
    return json({ ok: true, id: sub, campaign_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= REVISIONS & ROLLBACK ================= */
async function handleMktRevisions(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const modCode = (url.searchParams.get('module_code') || '').trim();
    const entityId = (url.searchParams.get('entity_id') || '').trim();
    const where = [];
    const binds = [];
    if (modCode) { where.push('module_code = ?'); binds.push(modCode); }
    if (entityId) { where.push('entity_id = ?'); binds.push(entityId); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM mkt_revisions ${w} ORDER BY version_num DESC LIMIT 50`
    ).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (sub === 'rollback' && method === 'POST') {
    const body = await readJson(request, 10000);
    const revId = cleanStr(body.revision_id || '', 80);
    if (!revId) throw validationError({ revision_id: 'revision_id is required' });
    const rev = await db.prepare(`SELECT * FROM mkt_revisions WHERE id = ?`).bind(revId).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const cfg = MKT_REV_TABLES[rev.module_code];
    if (!cfg) throw new HttpError(400, 'UNSUPPORTED_MODULE', `Rollback unsupported for module ${rev.module_code}`);
    const snap = parseJson(rev.snapshot_json, null);
    if (!snap) throw new HttpError(500, 'CORRUPT_SNAPSHOT', 'Invalid revision snapshot');

    await snapshotMktRevision(db, rev.module_code, rev.entity_id, actor, `pre-rollback to v${rev.version_num}`);
    const setCols = cfg.cols.filter(c => c in snap);
    const sets = setCols.map(c => `${c} = ?`).join(', ');
    await db.prepare(`UPDATE ${cfg.table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...setCols.map(c => snap[c]), rev.entity_id).run();
    await audit(env, request, actor, 'mkt.revision.rollback', cfg.table, rev.entity_id, { revision_id: revId, version_num: rev.version_num });
    return json({ ok: true, module_code: rev.module_code, entity_id: rev.entity_id, restored_version: rev.version_num });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleMarketingAdvertisingBatch1Admin(request, env, actor, id, sub, extra) {
  await ensureMarketingAdvertisingBatch1Schema(env.DB);
  if (id === 'overview' && request.method === 'GET') return json(await getMarketingOverview(env.DB));
  if (id === 'placements') return handlePlacements(request, env, actor, sub, extra);
  if (id === 'sponsors') return handleSponsors(request, env, actor, sub, extra);
  if (id === 'banners') return handleBanners(request, env, actor, sub, extra);
  if (id === 'campaigns') return handleCampaigns(request, env, actor, sub, extra);
  if (id === 'revisions') return handleMktRevisions(request, env, actor, sub);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown marketing route');
}

/* ================= PUBLIC EDGE-CACHED AD-SERVE API ================= */
export async function handlePublicMarketingBannersApi(request, env) {
  await ensureMarketingAdvertisingBatch1Schema(env.DB);
  const url = new URL(request.url);
  const sec = (url.searchParams.get('portal_section') || '').trim();
  const where = [`b.banner_status = 'active_live'`];
  const binds = [];
  if (sec && MKT_PORTAL_SECTIONS.includes(sec)) {
    where.push(`p.portal_section = ?`);
    binds.push(sec);
  }
  const { results } = await env.DB.prepare(
    `SELECT b.id, b.banner_code, b.headline_en, b.headline_or, b.subcopy_en, b.subcopy_or,
            b.cta_label_en, b.cta_label_or, b.target_url, b.badge_tag_en, b.badge_tag_or,
            b.theme_variant, b.priority_weight, p.slot_code, p.portal_section, p.position_zone,
            s.brand_display_en AS sponsor_name_en, s.brand_display_or AS sponsor_name_or
     FROM mkt_promo_banners b
     LEFT JOIN mkt_ad_placements p ON p.id = b.placement_id
     LEFT JOIN mkt_sponsors s ON s.id = b.sponsor_id
     WHERE ${where.join(' AND ')}
     ORDER BY b.priority_weight DESC, b.created_at DESC
     LIMIT 20`
  ).bind(...binds).all();

  return new Response(JSON.stringify({ items: results || [] }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=300'
    }
  });
}
