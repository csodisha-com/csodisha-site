// Marketing & Advertising Batch 2 (v109): Modules 05-08
// 05 Referral Tracking | 06 Campaign Analytics | 07 UTM Management | 08 Social Sharing
// Zero cookies and zero raw IPs/PII in referral attribution. Store INR payouts/budgets in integer paise.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  MKT_REV_TABLES,
  ensureMarketingAdvertisingBatch1Schema,
  formatInrFromPaise,
  getMarketingOverview,
  sanitizeBannerText,
  snapshotMktRevision
} from './marketing-advertising-batch1.js';

export const MKT_PARTNER_TYPES = ['campus_ambassador', 'educator_creator', 'coaching_partner', 'telegram_channel', 'alumni_network'];
export const MKT_REFERRAL_STATUSES = ['active', 'paused', 'capped', 'archived'];
export const MKT_ANALYTICS_CHANNELS = ['portal_banners', 'email_digest', 'telegram', 'whatsapp_waba', 'social_organic'];
export const MKT_UTM_STATUSES = ['approved_canonical', 'draft', 'deprecated'];
export const MKT_SOCIAL_PRESETS = ['universal_og', 'whatsapp_preview', 'telegram_instant', 'x_twitter', 'linkedin'];
export const MKT_CARD_STATUSES = ['active_live', 'draft', 'archived'];

const _mkt2Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

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

function normSnake(s, maxLen = 60) {
  return cleanStr(s || '', maxLen).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function buildCanonicalUtmUrl({ base_url = '', utm_source = '', utm_medium = '', utm_campaign = '', utm_term = '', utm_content = '' }) {
  const errors = {};
  let rawBase = cleanStr(base_url || 'https://csodisha.com/study-library/', 300);
  if (rawBase.startsWith('/')) rawBase = `https://csodisha.com${rawBase}`;
  let parsed;
  try {
    parsed = new URL(rawBase);
    if (parsed.hostname !== 'csodisha.com' && !parsed.hostname.endsWith('.csodisha.com')) {
      errors.base_url = 'base_url must be on csodisha.com';
    }
  } catch {
    errors.base_url = 'base_url must be a valid https://csodisha.com/... URL';
  }

  const src = normSnake(utm_source, 50);
  const med = normSnake(utm_medium, 50);
  const cmp = normSnake(utm_campaign, 80);
  const trm = normSnake(utm_term, 60);
  const cnt = normSnake(utm_content, 60);
  if (!src) errors.utm_source = 'utm_source is required';
  if (!med) errors.utm_medium = 'utm_medium is required';
  if (!cmp) errors.utm_campaign = 'utm_campaign is required';
  if (Object.keys(errors).length) throw validationError(errors);

  const params = new URLSearchParams(parsed.search);
  params.set('utm_source', src);
  params.set('utm_medium', med);
  params.set('utm_campaign', cmp);
  if (trm) params.set('utm_term', trm);
  if (cnt) params.set('utm_content', cnt);
  parsed.search = params.toString();

  return {
    base_url: `${parsed.origin}${parsed.pathname}`,
    utm_source: src,
    utm_medium: med,
    utm_campaign: cmp,
    utm_term: trm,
    utm_content: cnt,
    full_tagged_url: parsed.toString()
  };
}

// Extend mkt_revisions table registry for Modules 05, 07, 08
MKT_REV_TABLES['05'] = {
  table: 'mkt_referrals',
  cols: ['referral_code', 'partner_name', 'partner_type', 'district_odisha', 'destination_path', 'clicks_count', 'signups_attributed', 'paid_conversions', 'reward_paise_per_conv', 'total_commission_paise', 'referral_status']
};
MKT_REV_TABLES['07'] = {
  table: 'mkt_utm_links',
  cols: ['utm_code', 'label_en', 'base_url', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'full_tagged_url', 'clicks_count', 'conversions_count', 'governance_status']
};
MKT_REV_TABLES['08'] = {
  table: 'mkt_social_share_cards',
  cols: ['card_code', 'target_path', 'platform_preset', 'og_title_en', 'og_title_or', 'og_description_en', 'og_description_or', 'og_image_url', 'share_cta_text_en', 'share_cta_text_or', 'shares_count', 'clickbacks_count', 'card_status']
};

export async function ensureMarketingAdvertisingBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_mkt2Ready.has(db)) return;
  await ensureMarketingAdvertisingBatch1Schema(db);

  const ddl = [
    `CREATE TABLE IF NOT EXISTS mkt_referrals (
      id TEXT PRIMARY KEY,
      referral_code TEXT NOT NULL UNIQUE,
      partner_name TEXT NOT NULL,
      partner_type TEXT NOT NULL DEFAULT 'campus_ambassador' CHECK (partner_type IN ('campus_ambassador', 'educator_creator', 'coaching_partner', 'telegram_channel', 'alumni_network')),
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      destination_path TEXT NOT NULL DEFAULT '/study-library/',
      clicks_count INTEGER NOT NULL DEFAULT 0,
      signups_attributed INTEGER NOT NULL DEFAULT 0,
      paid_conversions INTEGER NOT NULL DEFAULT 0,
      reward_paise_per_conv INTEGER NOT NULL DEFAULT 0,
      total_commission_paise INTEGER NOT NULL DEFAULT 0,
      referral_status TEXT NOT NULL DEFAULT 'active' CHECK (referral_status IN ('active', 'paused', 'capped', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_referrals_status ON mkt_referrals(partner_type, referral_status)`,
    `CREATE TABLE IF NOT EXISTS mkt_campaign_analytics (
      id TEXT PRIMARY KEY,
      campaign_id TEXT REFERENCES mkt_campaigns(id) ON DELETE CASCADE,
      bucket_date TEXT NOT NULL,
      channel_key TEXT NOT NULL DEFAULT 'portal_banners' CHECK (channel_key IN ('portal_banners', 'email_digest', 'telegram', 'whatsapp_waba', 'social_organic')),
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      signups INTEGER NOT NULL DEFAULT 0,
      paid_conversions INTEGER NOT NULL DEFAULT 0,
      spend_paise INTEGER NOT NULL DEFAULT 0,
      attributed_revenue_paise INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_analytics_cmp ON mkt_campaign_analytics(campaign_id, bucket_date DESC, channel_key)`,
    `CREATE TABLE IF NOT EXISTS mkt_utm_links (
      id TEXT PRIMARY KEY,
      utm_code TEXT NOT NULL UNIQUE,
      label_en TEXT NOT NULL,
      base_url TEXT NOT NULL DEFAULT 'https://csodisha.com/study-library/',
      utm_source TEXT NOT NULL,
      utm_medium TEXT NOT NULL,
      utm_campaign TEXT NOT NULL,
      utm_term TEXT NOT NULL DEFAULT '',
      utm_content TEXT NOT NULL DEFAULT '',
      full_tagged_url TEXT NOT NULL,
      clicks_count INTEGER NOT NULL DEFAULT 0,
      conversions_count INTEGER NOT NULL DEFAULT 0,
      governance_status TEXT NOT NULL DEFAULT 'approved_canonical' CHECK (governance_status IN ('approved_canonical', 'draft', 'deprecated')),
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_utm_status ON mkt_utm_links(governance_status, utm_source)`,
    `CREATE TABLE IF NOT EXISTS mkt_social_share_cards (
      id TEXT PRIMARY KEY,
      card_code TEXT NOT NULL UNIQUE,
      target_path TEXT NOT NULL DEFAULT '/study-library/',
      platform_preset TEXT NOT NULL DEFAULT 'universal_og' CHECK (platform_preset IN ('universal_og', 'whatsapp_preview', 'telegram_instant', 'x_twitter', 'linkedin')),
      og_title_en TEXT NOT NULL,
      og_title_or TEXT NOT NULL DEFAULT '',
      og_description_en TEXT NOT NULL DEFAULT '',
      og_description_or TEXT NOT NULL DEFAULT '',
      og_image_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/brand/cso-og-default.png',
      share_cta_text_en TEXT NOT NULL DEFAULT 'Share with Aspirants',
      share_cta_text_or TEXT NOT NULL DEFAULT 'ସାଥୀଙ୍କ ସହ ସେୟାର୍ କରନ୍ତୁ',
      shares_count INTEGER NOT NULL DEFAULT 0,
      clickbacks_count INTEGER NOT NULL DEFAULT 0,
      card_status TEXT NOT NULL DEFAULT 'active_live' CHECK (card_status IN ('active_live', 'draft', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_social_status ON mkt_social_share_cards(platform_preset, card_status)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 05: Referrals
  const rCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_referrals`).first();
  if (Number(rCnt?.n || 0) === 0) {
    const refs = [
      ['mkt-ref-01', 'CUTTACK-CAMPUS-26', 'Ravenshaw Aspirants Club', 'campus_ambassador', 'Cuttack', '/study-library/', 1420, 310, 48, 5000, 240000, 'active'],
      ['mkt-ref-02', 'BALASORE-ED-26', 'Fakir Mohan Study Circle', 'educator_creator', 'Balasore', '/mock-tests/', 890, 195, 32, 7500, 240000, 'active'],
      ['mkt-ref-03', 'ODISHA-TG-OFFICIAL', 'Odisha Sarkari Alerts TG', 'telegram_channel', 'Khordha', '/jobs/', 3100, 620, 85, 4000, 340000, 'active']
    ];
    for (const r of refs) {
      await db.prepare(
        `INSERT INTO mkt_referrals (id, referral_code, partner_name, partner_type, district_odisha, destination_path, clicks_count, signups_attributed, paid_conversions, reward_paise_per_conv, total_commission_paise, referral_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  // Seed Module 06: Campaign Analytics
  const aCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_campaign_analytics`).first();
  if (Number(aCnt?.n || 0) === 0) {
    const buckets = [
      ['mkt-ana-01', 'mkt-cmp-01', '2026-11-15', 'portal_banners', 18500, 620, 145, 38, 950000, 2850000],
      ['mkt-ana-02', 'mkt-cmp-01', '2026-11-15', 'telegram', 9200, 510, 130, 29, 450000, 2175000],
      ['mkt-ana-03', 'mkt-cmp-02', '2026-11-16', 'email_digest', 12400, 780, 210, 42, 350000, 1680000],
      ['mkt-ana-04', 'mkt-cmp-02', '2026-11-16', 'whatsapp_waba', 6800, 490, 155, 35, 300000, 1400000]
    ];
    for (const b of buckets) {
      await db.prepare(
        `INSERT INTO mkt_campaign_analytics (id, campaign_id, bucket_date, channel_key, impressions, clicks, signups, paid_conversions, spend_paise, attributed_revenue_paise)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...b).run();
    }
  }

  // Seed Module 07: UTM Links
  const uCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_utm_links`).first();
  if (Number(uCnt?.n || 0) === 0) {
    const utms = [
      ['mkt-utm-01', 'UTM-2026-0001', 'Telegram OPSC OAS Prelims Mock', 'https://csodisha.com/mock-tests/', 'telegram', 'social', 'opsc_oas_2026_prelims', '', 'channel_pinned', 'https://csodisha.com/mock-tests/?utm_source=telegram&utm_medium=social&utm_campaign=opsc_oas_2026_prelims&utm_content=channel_pinned', 1840, 215, 'approved_canonical'],
      ['mkt-utm-02', 'UTM-2026-0002', 'YouTube Odia PYQ Walkthrough', 'https://csodisha.com/study-library/', 'youtube', 'social', 'ossc_pyq_series', '', 'video_desc', 'https://csodisha.com/study-library/?utm_source=youtube&utm_medium=social&utm_campaign=ossc_pyq_series&utm_content=video_desc', 960, 118, 'approved_canonical'],
      ['mkt-utm-03', 'UTM-2026-0003', 'Instagram Reels Subhadra Yojana Guide', 'https://csodisha.com/schemes/', 'instagram', 'social', 'subhadra_yojana_ekyc', '', 'bio_link', 'https://csodisha.com/schemes/?utm_source=instagram&utm_medium=social&utm_campaign=subhadra_yojana_ekyc&utm_content=bio_link', 1290, 94, 'approved_canonical']
    ];
    for (const u of utms) {
      await db.prepare(
        `INSERT INTO mkt_utm_links (id, utm_code, label_en, base_url, utm_source, utm_medium, utm_campaign, utm_term, utm_content, full_tagged_url, clicks_count, conversions_count, governance_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system')`
      ).bind(...u).run();
    }
  }

  // Seed Module 08: Social Share Cards
  const scCnt = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_social_share_cards`).first();
  if (Number(scCnt?.n || 0) === 0) {
    const cards = [
      ['mkt-soc-01', 'SOC-2026-0001', '/study-library/opsc-oas/', 'universal_og', 'OPSC OAS 2026 Free Bilingual Study Library & PYQs', 'OPSC OAS ୨୦୨୬ ମାଗଣା ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ', 'Access Odisha History, Polity, Economy notes & 10-year solved papers.', 'ଓଡ଼ିଶା ଇତିହାସ, ରାଜନୀତି, ଅର୍ଥନୀତି ନୋଟ୍ସ ଏବଂ PYQ ପାଆନ୍ତୁ।', 'https://csodisha.com/assets/brand/cso-og-default.png', 'Share Study Pack', 'ଅଧ୍ୟୟନ ପ୍ୟାକ୍ ସେୟାର୍ କରନ୍ତୁ', 640, 1420, 'active_live'],
      ['mkt-soc-02', 'SOC-2026-0002', '/schemes/subhadra-yojana/', 'whatsapp_preview', 'Subhadra Yojana 2026 e-KYC & DBT Status Checklist', 'ସୁଭଦ୍ରା ଯୋଜନା ୨୦୨୬ e-KYC ଏବଂ DBT ସ୍ଥିତି', 'Step-by-step NPCI Aadhaar seeding and installment verification guide.', 'NPCI ଆଧାର ସିଡିଂ ଏବଂ କିସ୍ତି ଯାଞ୍ଚ ମାର୍ଗଦର୍ଶିକା।', 'https://csodisha.com/assets/brand/cso-og-default.png', 'Share on WhatsApp', 'WhatsApp ରେ ସେୟାର୍ କରନ୍ତୁ', 980, 2310, 'active_live']
    ];
    for (const c of cards) {
      await db.prepare(
        `INSERT INTO mkt_social_share_cards (id, card_code, target_path, platform_preset, og_title_en, og_title_or, og_description_en, og_description_or, og_image_url, share_cta_text_en, share_cta_text_or, shares_count, clickbacks_count, card_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...c).run();
    }
  }

  _mkt2Ready.add(db);
}

/* ================= EXTENDED OVERVIEW (01-08) ================= */
export async function getMarketingBatch2Overview(env) {
  const db = env.DB;
  await ensureMarketingAdvertisingBatch2Schema(db);
  const base = await getMarketingOverview(db);

  const [refAct, refTot, refConv, anaAgg, utmGov, utmTot, socClicks, socTot] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_referrals WHERE referral_status = 'active'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_referrals`).first(),
    db.prepare(`SELECT COALESCE(SUM(paid_conversions), 0) AS n, COALESCE(SUM(total_commission_paise), 0) AS comm FROM mkt_referrals`).first(),
    db.prepare(`SELECT COALESCE(SUM(impressions), 0) AS imps, COALESCE(SUM(clicks), 0) AS clks, COALESCE(SUM(spend_paise), 0) AS sp, COALESCE(SUM(attributed_revenue_paise), 0) AS rev FROM mkt_campaign_analytics`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_utm_links WHERE governance_status = 'approved_canonical'`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_utm_links`).first(),
    db.prepare(`SELECT COALESCE(SUM(clickbacks_count), 0) AS n FROM mkt_social_share_cards`).first(),
    db.prepare(`SELECT COUNT(*) AS n FROM mkt_social_share_cards`).first()
  ]);

  const imps = Number(anaAgg?.imps || 0);
  const clks = Number(anaAgg?.clks || 0);
  const sp = Number(anaAgg?.sp || 0);
  const rev = Number(anaAgg?.rev || 0);
  const blendedRoas = sp > 0 ? Math.round((rev / sp) * 100) / 100 : 0;
  const blendedAnalyticsCtrPct = imps > 0 ? Math.round((clks / imps) * 10000) / 100 : 0;

  const modules = {
    ...(base.modules || {}),
    '05': { status: 'active', count: Number(refTot?.n || 0) },
    '06': { status: 'active', count: imps > 0 ? 1 : 0 },
    '07': { status: 'active', count: Number(utmTot?.n || 0) },
    '08': { status: 'active', count: Number(socTot?.n || 0) }
  };

  return {
    ...base,
    active_referral_partners: Number(refAct?.n || 0),
    total_attributed_conversions: Number(refConv?.n || 0),
    total_referral_commission_paise: Number(refConv?.comm || 0),
    total_referral_commission_inr: formatInrFromPaise(Number(refConv?.comm || 0)),
    blended_campaign_roas: blendedRoas,
    blended_analytics_ctr_pct: blendedAnalyticsCtrPct,
    governed_utm_links: Number(utmGov?.n || 0),
    social_share_clickbacks: Number(socClicks?.n || 0),
    modules
  };
}

/* ================= MODULE 05: REFERRAL TRACKING ================= */
function decorateReferral(row) {
  if (!row) return row;
  return {
    ...row,
    reward_per_conv_inr: formatInrFromPaise(row.reward_paise_per_conv),
    total_commission_inr: formatInrFromPaise(row.total_commission_paise)
  };
}

async function handleReferrals(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const pt = (url.searchParams.get('partner_type') || '').trim();
    const st = (url.searchParams.get('referral_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (pt && MKT_PARTNER_TYPES.includes(pt)) { where.push('partner_type = ?'); binds.push(pt); }
    if (st && MKT_REFERRAL_STATUSES.includes(st)) { where.push('referral_status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(referral_code LIKE ? ESCAPE '\\' OR partner_name LIKE ? ESCAPE '\\' OR district_odisha LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM mkt_referrals ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: (results || []).map(decorateReferral) });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 16000);
    const errors = {};
    const code = cleanStr(body.referral_code || '', 50).toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const partner = cleanStr(body.partner_name || '', 140);
    if (!code) errors.referral_code = 'referral_code is required';
    if (!partner) errors.partner_name = 'partner_name is required';
    const pt = pick(body.partner_type, MKT_PARTNER_TYPES, 'partner_type', errors, 'campus_ambassador');
    const st = pick(body.referral_status, MKT_REFERRAL_STATUSES, 'referral_status', errors, 'active');
    const rew = intPaise(body.reward_paise_per_conv, 'reward_paise_per_conv', errors, { min: 0 });
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('mkt-ref');
    const paidConvs = Math.max(0, Number(body.paid_conversions || 0) || 0);
    const totalComm = paidConvs * rew;
    await db.prepare(
      `INSERT INTO mkt_referrals (id, referral_code, partner_name, partner_type, district_odisha, destination_path, clicks_count, signups_attributed, paid_conversions, reward_paise_per_conv, total_commission_paise, referral_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, partner, pt,
      cleanStr(body.district_odisha || 'Khordha', 60),
      cleanStr(body.destination_path || '/study-library/', 200),
      Math.max(0, Number(body.clicks_count || 0) || 0),
      Math.max(0, Number(body.signups_attributed || 0) || 0),
      paidConvs, rew, totalComm, st
    ).run();

    await snapshotMktRevision(db, '05', newId, actor, 'create referral partner');
    await audit(env, request, actor, 'mkt.referral.create', 'mkt_referrals', newId, { referral_code: code });
    const created = await db.prepare(`SELECT * FROM mkt_referrals WHERE id = ?`).bind(newId).first();
    return json({ item: decorateReferral(created) }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM mkt_referrals WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Referral partner not found');
    const body = await readJson(request, 16000);
    const errors = {};
    const pt = body.partner_type !== undefined ? pick(body.partner_type, MKT_PARTNER_TYPES, 'partner_type', errors, ex.partner_type) : ex.partner_type;
    const st = body.referral_status !== undefined ? pick(body.referral_status, MKT_REFERRAL_STATUSES, 'referral_status', errors, ex.referral_status) : ex.referral_status;
    const rew = body.reward_paise_per_conv !== undefined ? intPaise(body.reward_paise_per_conv, 'reward_paise_per_conv', errors, { min: 0 }) : ex.reward_paise_per_conv;
    if (Object.keys(errors).length) throw validationError(errors);

    const paidConvs = body.paid_conversions !== undefined ? Math.max(0, Number(body.paid_conversions || 0)) : ex.paid_conversions;
    const totalComm = paidConvs * rew;
    await snapshotMktRevision(db, '05', sub, actor, 'update referral partner');
    await db.prepare(
      `UPDATE mkt_referrals
       SET partner_name = ?, partner_type = ?, district_odisha = ?, destination_path = ?,
           paid_conversions = ?, reward_paise_per_conv = ?, total_commission_paise = ?,
           referral_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.partner_name !== undefined ? cleanStr(body.partner_name, 140) : ex.partner_name,
      pt,
      body.district_odisha !== undefined ? cleanStr(body.district_odisha, 60) : ex.district_odisha,
      body.destination_path !== undefined ? cleanStr(body.destination_path, 200) : ex.destination_path,
      paidConvs, rew, totalComm, st, sub
    ).run();
    await audit(env, request, actor, 'mkt.referral.update', 'mkt_referrals', sub, {});
    const updated = await db.prepare(`SELECT * FROM mkt_referrals WHERE id = ?`).bind(sub).first();
    return json({ item: decorateReferral(updated) });
  }

  if (sub && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_referrals WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Referral partner not found');
    const body = await readJson(request, 8000).catch(() => ({}));

    if (extra === 'record-hit' || body.action === 'record_hit') {
      const addClicks = Math.max(0, Number(body.clicks || 1) || 0);
      const addSignups = Math.max(0, Number(body.signups || 0) || 0);
      const addConv = Math.max(0, Number(body.paid_conversions || 0) || 0);
      const nextPaid = Number(ex.paid_conversions || 0) + addConv;
      const nextComm = nextPaid * Number(ex.reward_paise_per_conv || 0);

      await snapshotMktRevision(db, '05', sub, actor, 'record referral attribution hit');
      await db.prepare(
        `UPDATE mkt_referrals
         SET clicks_count = clicks_count + ?, signups_attributed = signups_attributed + ?,
             paid_conversions = ?, total_commission_paise = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(addClicks, addSignups, nextPaid, nextComm, sub).run();
      await audit(env, request, actor, 'mkt.referral.hit', 'mkt_referrals', sub, { addClicks, addSignups, addConv });
      const updated = await db.prepare(`SELECT * FROM mkt_referrals WHERE id = ?`).bind(sub).first();
      return json({ item: decorateReferral(updated) });
    }

    const errors = {};
    const st = pick(body.referral_status, MKT_REFERRAL_STATUSES, 'referral_status', errors, ex.referral_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotMktRevision(db, '05', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE mkt_referrals SET referral_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    await audit(env, request, actor, 'mkt.referral.status', 'mkt_referrals', sub, { referral_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_referrals WHERE id = ?`).bind(sub).first();
    return json({ item: decorateReferral(updated) });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotMktRevision(db, '05', sub, actor, 'archive referral partner');
    await db.prepare(`UPDATE mkt_referrals SET referral_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.referral.archive', 'mkt_referrals', sub, {});
    return json({ ok: true, id: sub, referral_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 06: CAMPAIGN ANALYTICS ================= */
function computeMetrics(imps, clks, convs, spendPaise, revPaise) {
  const ctr_pct = imps > 0 ? Math.round((clks / imps) * 10000) / 100 : 0;
  const cvr_pct = clks > 0 ? Math.round((convs / clks) * 10000) / 100 : 0;
  const cpc_paise = clks > 0 ? Math.round(spendPaise / clks) : 0;
  const roas = spendPaise > 0 ? Math.round((revPaise / spendPaise) * 100) / 100 : 0;
  return {
    ctr_pct,
    cvr_pct,
    cpc_paise,
    cpc_inr: formatInrFromPaise(cpc_paise),
    spend_inr: formatInrFromPaise(spendPaise),
    attributed_revenue_inr: formatInrFromPaise(revPaise),
    roas
  };
}

async function handleAnalytics(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const ch = (url.searchParams.get('channel_key') || '').trim();
    const cmpId = (url.searchParams.get('campaign_id') || '').trim();
    const where = [];
    const binds = [];
    if (ch && MKT_ANALYTICS_CHANNELS.includes(ch)) { where.push('a.channel_key = ?'); binds.push(ch); }
    if (cmpId) { where.push('a.campaign_id = ?'); binds.push(cmpId); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ results: rows }, { results: byCh }, { results: byCmp }] = await Promise.all([
      db.prepare(
        `SELECT a.*, c.campaign_code, c.campaign_name_en
         FROM mkt_campaign_analytics a
         LEFT JOIN mkt_campaigns c ON c.id = a.campaign_id
         ${w} ORDER BY a.bucket_date DESC`
      ).bind(...binds).all(),
      db.prepare(
        `SELECT channel_key, SUM(impressions) AS impressions, SUM(clicks) AS clicks,
                SUM(signups) AS signups, SUM(paid_conversions) AS paid_conversions,
                SUM(spend_paise) AS spend_paise, SUM(attributed_revenue_paise) AS attributed_revenue_paise
         FROM mkt_campaign_analytics GROUP BY channel_key ORDER BY attributed_revenue_paise DESC`
      ).all(),
      db.prepare(
        `SELECT a.campaign_id, COALESCE(c.campaign_code, a.campaign_id) AS campaign_code,
                COALESCE(c.campaign_name_en, 'Direct') AS campaign_name_en,
                SUM(a.impressions) AS impressions, SUM(a.clicks) AS clicks,
                SUM(a.signups) AS signups, SUM(a.paid_conversions) AS paid_conversions,
                SUM(a.spend_paise) AS spend_paise, SUM(a.attributed_revenue_paise) AS attributed_revenue_paise
         FROM mkt_campaign_analytics a
         LEFT JOIN mkt_campaigns c ON c.id = a.campaign_id
         GROUP BY a.campaign_id ORDER BY attributed_revenue_paise DESC`
      ).all()
    ]);

    const decorate = r => ({
      ...r,
      ...computeMetrics(
        Number(r.impressions || 0),
        Number(r.clicks || 0),
        Number(r.paid_conversions || 0),
        Number(r.spend_paise || 0),
        Number(r.attributed_revenue_paise || 0)
      )
    });

    return json({
      items: (rows || []).map(decorate),
      by_channel: (byCh || []).map(decorate),
      by_campaign: (byCmp || []).map(decorate)
    });
  }

  if (sub === 'ingest' && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const ch = pick(body.channel_key, MKT_ANALYTICS_CHANNELS, 'channel_key', errors, 'portal_banners');
    const bDate = cleanStr(body.bucket_date || new Date().toISOString().slice(0, 10), 20);
    const spend = intPaise(body.spend_paise, 'spend_paise', errors, { min: 0 });
    const rev = intPaise(body.attributed_revenue_paise, 'attributed_revenue_paise', errors, { min: 0 });
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('mkt-ana');
    await db.prepare(
      `INSERT INTO mkt_campaign_analytics (id, campaign_id, bucket_date, channel_key, impressions, clicks, signups, paid_conversions, spend_paise, attributed_revenue_paise)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId,
      body.campaign_id ? cleanStr(body.campaign_id, 64) : null,
      bDate, ch,
      Math.max(0, Number(body.impressions || 0) || 0),
      Math.max(0, Number(body.clicks || 0) || 0),
      Math.max(0, Number(body.signups || 0) || 0),
      Math.max(0, Number(body.paid_conversions || 0) || 0),
      spend, rev
    ).run();
    await audit(env, request, actor, 'mkt.analytics.ingest', 'mkt_campaign_analytics', newId, { channel_key: ch, bucket_date: bDate });
    const created = await db.prepare(`SELECT * FROM mkt_campaign_analytics WHERE id = ?`).bind(newId).first();
    return json({
      item: {
        ...created,
        ...computeMetrics(created.impressions, created.clicks, created.paid_conversions, created.spend_paise, created.attributed_revenue_paise)
      }
    }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 07: UTM MANAGEMENT ================= */
async function nextUtmCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_utm_links`).first();
  return `UTM-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleUtm(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const st = (url.searchParams.get('governance_status') || '').trim();
    const src = (url.searchParams.get('utm_source') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (st && MKT_UTM_STATUSES.includes(st)) { where.push('governance_status = ?'); binds.push(st); }
    if (src) { where.push('utm_source = ?'); binds.push(normSnake(src, 50)); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(utm_code LIKE ? ESCAPE '\\' OR label_en LIKE ? ESCAPE '\\' OR utm_campaign LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM mkt_utm_links ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 16000);
    const errors = {};
    const labelEn = cleanStr(body.label_en || '', 160);
    if (!labelEn) errors.label_en = 'label_en is required';
    const st = pick(body.governance_status, MKT_UTM_STATUSES, 'governance_status', errors, 'approved_canonical');
    if (Object.keys(errors).length) throw validationError(errors);

    const built = buildCanonicalUtmUrl(body);
    const newId = rid('mkt-utm');
    const code = await nextUtmCode(db);
    await db.prepare(
      `INSERT INTO mkt_utm_links (id, utm_code, label_en, base_url, utm_source, utm_medium, utm_campaign, utm_term, utm_content, full_tagged_url, governance_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code, labelEn, built.base_url, built.utm_source, built.utm_medium,
      built.utm_campaign, built.utm_term, built.utm_content, built.full_tagged_url,
      st, actor?.email || actor?.userId || 'staff'
    ).run();

    await snapshotMktRevision(db, '07', newId, actor, 'create canonical utm link');
    await audit(env, request, actor, 'mkt.utm.create', 'mkt_utm_links', newId, { utm_code: code });
    const created = await db.prepare(`SELECT * FROM mkt_utm_links WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_utm_links WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'UTM link not found');
    const body = await readJson(request, 16000);
    const errors = {};
    const st = body.governance_status !== undefined
      ? pick(body.governance_status, MKT_UTM_STATUSES, 'governance_status', errors, ex.governance_status)
      : ex.governance_status;
    if (Object.keys(errors).length) throw validationError(errors);

    const built = buildCanonicalUtmUrl({
      base_url: body.base_url !== undefined ? body.base_url : ex.base_url,
      utm_source: body.utm_source !== undefined ? body.utm_source : ex.utm_source,
      utm_medium: body.utm_medium !== undefined ? body.utm_medium : ex.utm_medium,
      utm_campaign: body.utm_campaign !== undefined ? body.utm_campaign : ex.utm_campaign,
      utm_term: body.utm_term !== undefined ? body.utm_term : ex.utm_term,
      utm_content: body.utm_content !== undefined ? body.utm_content : ex.utm_content
    });

    await snapshotMktRevision(db, '07', sub, actor, 'update utm link');
    await db.prepare(
      `UPDATE mkt_utm_links
       SET label_en = ?, base_url = ?, utm_source = ?, utm_medium = ?, utm_campaign = ?,
           utm_term = ?, utm_content = ?, full_tagged_url = ?, governance_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.label_en !== undefined ? cleanStr(body.label_en, 160) : ex.label_en,
      built.base_url, built.utm_source, built.utm_medium, built.utm_campaign,
      built.utm_term, built.utm_content, built.full_tagged_url, st, sub
    ).run();
    await audit(env, request, actor, 'mkt.utm.update', 'mkt_utm_links', sub, { governance_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_utm_links WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && method === 'DELETE') {
    await snapshotMktRevision(db, '07', sub, actor, 'deprecate utm link');
    await db.prepare(`UPDATE mkt_utm_links SET governance_status = 'deprecated', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.utm.archive', 'mkt_utm_links', sub, {});
    return json({ ok: true, id: sub, governance_status: 'deprecated' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 08: SOCIAL SHARING ================= */
async function nextCardCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM mkt_social_share_cards`).first();
  return `SOC-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleSocialCards(request, env, actor, sub, extra) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const pre = (url.searchParams.get('platform_preset') || '').trim();
    const st = (url.searchParams.get('card_status') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    const where = [];
    const binds = [];
    if (pre && MKT_SOCIAL_PRESETS.includes(pre)) { where.push('platform_preset = ?'); binds.push(pre); }
    if (st && MKT_CARD_STATUSES.includes(st)) { where.push('card_status = ?'); binds.push(st); }
    if (q) {
      const p = `%${likeEscape(q)}%`;
      where.push(`(card_code LIKE ? ESCAPE '\\' OR og_title_en LIKE ? ESCAPE '\\' OR target_path LIKE ? ESCAPE '\\')`);
      binds.push(p, p, p);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(`SELECT * FROM mkt_social_share_cards ${w} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ items: results || [] });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const titleEn = sanitizeBannerText(body.og_title_en || '', 180);
    if (!titleEn) errors.og_title_en = 'og_title_en is required';
    const pre = pick(body.platform_preset, MKT_SOCIAL_PRESETS, 'platform_preset', errors, 'universal_og');
    const st = pick(body.card_status, MKT_CARD_STATUSES, 'card_status', errors, 'active_live');
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('mkt-soc');
    const code = await nextCardCode(db);
    await db.prepare(
      `INSERT INTO mkt_social_share_cards (id, card_code, target_path, platform_preset, og_title_en, og_title_or, og_description_en, og_description_or, og_image_url, share_cta_text_en, share_cta_text_or, card_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId, code,
      cleanStr(body.target_path || '/study-library/', 200),
      pre, titleEn, sanitizeBannerText(body.og_title_or || '', 220),
      sanitizeBannerText(body.og_description_en || '', 300), sanitizeBannerText(body.og_description_or || '', 340),
      cleanStr(body.og_image_url || 'https://csodisha.com/assets/brand/cso-og-default.png', 300),
      sanitizeBannerText(body.share_cta_text_en || 'Share with Aspirants', 80),
      sanitizeBannerText(body.share_cta_text_or || 'ସାଥୀଙ୍କ ସହ ସେୟାର୍ କରନ୍ତୁ', 100),
      st
    ).run();

    await snapshotMktRevision(db, '08', newId, actor, 'create social share card');
    await audit(env, request, actor, 'mkt.social.create', 'mkt_social_share_cards', newId, { card_code: code });
    const created = await db.prepare(`SELECT * FROM mkt_social_share_cards WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && !extra && method === 'PUT') {
    const ex = await db.prepare(`SELECT * FROM mkt_social_share_cards WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Social card not found');
    const body = await readJson(request, 20000);
    const errors = {};
    const pre = body.platform_preset !== undefined ? pick(body.platform_preset, MKT_SOCIAL_PRESETS, 'platform_preset', errors, ex.platform_preset) : ex.platform_preset;
    const st = body.card_status !== undefined ? pick(body.card_status, MKT_CARD_STATUSES, 'card_status', errors, ex.card_status) : ex.card_status;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotMktRevision(db, '08', sub, actor, 'update social share card');
    await db.prepare(
      `UPDATE mkt_social_share_cards
       SET target_path = ?, platform_preset = ?, og_title_en = ?, og_title_or = ?,
           og_description_en = ?, og_description_or = ?, og_image_url = ?,
           share_cta_text_en = ?, share_cta_text_or = ?, card_status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.target_path !== undefined ? cleanStr(body.target_path, 200) : ex.target_path,
      pre,
      body.og_title_en !== undefined ? sanitizeBannerText(body.og_title_en, 180) : ex.og_title_en,
      body.og_title_or !== undefined ? sanitizeBannerText(body.og_title_or, 220) : ex.og_title_or,
      body.og_description_en !== undefined ? sanitizeBannerText(body.og_description_en, 300) : ex.og_description_en,
      body.og_description_or !== undefined ? sanitizeBannerText(body.og_description_or, 340) : ex.og_description_or,
      body.og_image_url !== undefined ? cleanStr(body.og_image_url, 300) : ex.og_image_url,
      body.share_cta_text_en !== undefined ? sanitizeBannerText(body.share_cta_text_en, 80) : ex.share_cta_text_en,
      body.share_cta_text_or !== undefined ? sanitizeBannerText(body.share_cta_text_or, 100) : ex.share_cta_text_or,
      st, sub
    ).run();
    await audit(env, request, actor, 'mkt.social.update', 'mkt_social_share_cards', sub, {});
    const updated = await db.prepare(`SELECT * FROM mkt_social_share_cards WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && extra === 'status' && method === 'PATCH') {
    const ex = await db.prepare(`SELECT * FROM mkt_social_share_cards WHERE id = ?`).bind(sub).first();
    if (!ex) throw new HttpError(404, 'NOT_FOUND', 'Social card not found');
    const body = await readJson(request, 8000);
    const errors = {};
    const st = pick(body.card_status, MKT_CARD_STATUSES, 'card_status', errors, ex.card_status);
    if (Object.keys(errors).length) throw validationError(errors);
    await snapshotMktRevision(db, '08', sub, actor, `status -> ${st}`);
    await db.prepare(`UPDATE mkt_social_share_cards SET card_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(st, sub).run();
    await audit(env, request, actor, 'mkt.social.status', 'mkt_social_share_cards', sub, { card_status: st });
    const updated = await db.prepare(`SELECT * FROM mkt_social_share_cards WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  if (sub && !extra && method === 'DELETE') {
    await snapshotMktRevision(db, '08', sub, actor, 'archive social share card');
    await db.prepare(`UPDATE mkt_social_share_cards SET card_status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'mkt.social.archive', 'mkt_social_share_cards', sub, {});
    return json({ ok: true, id: sub, card_status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleMarketingAdvertisingBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureMarketingAdvertisingBatch2Schema(env.DB);
  if (id === 'referrals') return handleReferrals(request, env, actor, sub, extra);
  if (id === 'analytics') return handleAnalytics(request, env, actor, sub);
  if (id === 'utm') return handleUtm(request, env, actor, sub);
  if (id === 'social-cards') return handleSocialCards(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown marketing batch 2 route');
}

/* ================= PUBLIC COOKIELESS ATTRIBUTION API ================= */
export async function handlePublicMarketingRefApi(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  await ensureMarketingAdvertisingBatch2Schema(env.DB);
  const body = await readJson(request, 4096).catch(() => ({}));
  const refCode = cleanStr(body.referral_code || '', 50).toUpperCase();
  const utmCode = cleanStr(body.utm_code || '', 50).toUpperCase();
  const cardCode = cleanStr(body.card_code || '', 50).toUpperCase();
  const eventType = cleanStr(body.event_type || 'click', 20);

  let recorded = false;
  if (refCode) {
    const r = await env.DB.prepare(
      `UPDATE mkt_referrals SET clicks_count = clicks_count + 1, updated_at = datetime('now')
       WHERE referral_code = ? AND referral_status = 'active'`
    ).bind(refCode).run();
    recorded = Number(r?.meta?.changes || 0) > 0;
  } else if (utmCode) {
    const r = await env.DB.prepare(
      `UPDATE mkt_utm_links SET clicks_count = clicks_count + 1, updated_at = datetime('now')
       WHERE utm_code = ? AND governance_status = 'approved_canonical'`
    ).bind(utmCode).run();
    recorded = Number(r?.meta?.changes || 0) > 0;
  } else if (cardCode) {
    const col = eventType === 'share' ? 'shares_count' : 'clickbacks_count';
    const r = await env.DB.prepare(
      `UPDATE mkt_social_share_cards SET ${col} = ${col} + 1, updated_at = datetime('now')
       WHERE card_code = ? AND card_status = 'active_live'`
    ).bind(cardCode).run();
    recorded = Number(r?.meta?.changes || 0) > 0;
  }

  return new Response(JSON.stringify({ ok: true, recorded, cookieless: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
