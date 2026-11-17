// Payments & Finance Batch 2 (v92): Modules 05-08
// 05 Paid Resources | 06 Products & Pricing | 07 Subscriptions | 08 Memberships
// All money is integer paise (price_paise); `₹X,XXX.XX` strings are display-only helpers.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  ensurePaymentsFinanceBatch1Schema, getPaymentsFinanceOverview, REV_TABLES, snapshotRevision
} from './payments-finance-batch1.js';
import { ensureEduResourcesBatch1Schema } from './edu-resources-batch1.js';
import { ensureEduResourcesBatch4Schema } from './edu-resources-batch4.js';

export const SOURCE_MODULES = ['01', '02', '03', '04', '11', '14', '16'];
export const ACCESS_MODELS = ['one_time_purchase', 'freemium_preview', 'member_only'];
export const PRODUCT_TYPES = ['mock_test_bundle', 'study_kit', 'ebook_pack', 'mentorship_session', 'foundation_batch'];
export const BILLING_INTERVALS = ['monthly', 'quarterly', 'half_yearly', 'annual'];
export const TIER_CODES = ['free_scholar', 'pro_aspirant', 'opsc_elite', 'institutional'];
export const MOCK_ACCESS_LEVELS = ['free_only', 'all_mocks', 'all_mocks_plus_mentorship'];
const STATUSES = ['draft', 'published', 'archived'];
const INTERVAL_MONTHS = { monthly: 1, quarterly: 3, half_yearly: 6, annual: 12 };

const _fin2Ready = new WeakSet();

export function formatInr(paise) {
  const v = Number(paise || 0) / 100;
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function discountPct(price, mrp) {
  const p = Number(price || 0); const m = Number(mrp || 0);
  return m > p && m > 0 ? Math.round((m - p) * 100 / m) : 0;
}
function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }
function slugOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }

// ---------- Field normalisers for JSON columns ----------
function normIncluded(v) {
  if (!Array.isArray(v) || v.length > 50) throw new Error('included_items must be an array (max 50)');
  return v.map(x => {
    const title = cleanStr(x && x.title_en, 200, { required: true });
    if (!title) throw new Error('Each included item needs title_en');
    return { module_code: cleanStr(x.module_code || '', 10), item_id: cleanStr(x.item_id || '', 100), title_en: title };
  });
}
function normPerks(v) {
  if (!Array.isArray(v) || v.length > 30) throw new Error('perks must be an array (max 30)');
  return v.map(x => {
    const en = cleanStr(x && x.perk_en, 200, { required: true });
    if (!en) throw new Error('Each perk needs perk_en');
    return { perk_en: en, perk_or: cleanStr(x.perk_or || '', 200) };
  });
}

// ---------- Entity configuration (single source of truth for CRUD) ----------
const COMMON_PRICE = [
  { n: 'price_paise', k: 'int', min: 0, max: 100000000, def: 0 }
];
const ENTITIES = {
  'paid-resources': {
    mod: '05', table: 'fin_paid_resources', label: 'paid_resource', idPrefix: 'fpr', titleCol: 'title_en',
    search: ['title_en', 'title_or', 'slug', 'source_entity_id'], filters: ['access_model', 'source_module_code'],
    order: 'featured DESC, updated_at DESC', needsPriceToPublish: r => r.access_model === 'one_time_purchase',
    fields: [
      { n: 'slug', k: 'slug', unique: true },
      { n: 'source_module_code', k: 'enum', e: SOURCE_MODULES, def: '01' },
      { n: 'source_entity_id', k: 'str', max: 120, def: '' },
      { n: 'title_en', k: 'str', max: 200, req: true },
      { n: 'title_or', k: 'str', max: 200, def: '' },
      { n: 'access_model', k: 'enum', e: ACCESS_MODELS, def: 'one_time_purchase' },
      ...COMMON_PRICE,
      { n: 'mrp_paise', k: 'int', min: 0, max: 100000000, def: 0 },
      { n: 'gst_rate_pct', k: 'int', min: 0, max: 28, def: 18 },
      { n: 'preview_page_limit', k: 'int', min: 0, max: 1000, def: 0 },
      { n: 'validity_days', k: 'int', min: 0, max: 3650, def: 0 },
      { n: 'sales_count', k: 'int', min: 0, max: 1e9, def: 0 },
      { n: 'revenue_paise', k: 'int', min: 0, max: 1e13, def: 0 },
      { n: 'featured', k: 'bool', def: 0 },
      { n: 'status', k: 'enum', e: STATUSES, def: 'draft' }
    ],
    cross(v, errors) {
      if (v.access_model === 'freemium_preview' && v.preview_page_limit < 1) errors.preview_page_limit = 'freemium_preview needs preview_page_limit >= 1';
    },
    cloneReset: { sales_count: 0, revenue_paise: 0 }
  },
  products: {
    mod: '06', table: 'fin_products', label: 'product', idPrefix: 'fprd', titleCol: 'title_en',
    search: ['title_en', 'title_or', 'slug', 'sku_code'], filters: ['product_type'],
    order: 'featured DESC, updated_at DESC', needsPriceToPublish: () => true,
    fields: [
      { n: 'slug', k: 'slug', unique: true },
      { n: 'sku_code', k: 'str', max: 60, req: true, unique: true, upper: true },
      { n: 'product_type', k: 'enum', e: PRODUCT_TYPES, def: 'study_kit' },
      { n: 'title_en', k: 'str', max: 200, req: true },
      { n: 'title_or', k: 'str', max: 200, def: '' },
      { n: 'summary_en', k: 'str', max: 600, def: '' },
      { n: 'summary_or', k: 'str', max: 600, def: '' },
      ...COMMON_PRICE,
      { n: 'mrp_paise', k: 'int', min: 0, max: 100000000, def: 0 },
      { n: 'gst_rate_pct', k: 'int', min: 0, max: 28, def: 18 },
      { n: 'hsn_sac_code', k: 'str', max: 12, def: '999293' },
      { n: 'included_items_json', key: 'included_items', k: 'json', norm: normIncluded, def: '[]' },
      { n: 'stock_or_seat_limit', k: 'int', min: 0, max: 1e7, def: 0 },
      { n: 'sold_count', k: 'int', min: 0, max: 1e9, def: 0 },
      { n: 'featured', k: 'bool', def: 0 },
      { n: 'status', k: 'enum', e: STATUSES, def: 'draft' }
    ],
    cross(v, errors) {
      if (!/^\d{4,8}$/.test(v.hsn_sac_code)) errors.hsn_sac_code = 'HSN/SAC must be 4-8 digits';
      if (v.stock_or_seat_limit > 0 && v.sold_count > v.stock_or_seat_limit) errors.sold_count = 'sold_count exceeds stock_or_seat_limit';
    },
    cloneReset: { sold_count: 0 }
  },
  subscriptions: {
    mod: '07', table: 'fin_subscription_plans', label: 'subscription', idPrefix: 'fsub', titleCol: 'name_en',
    search: ['name_en', 'name_or', 'slug', 'plan_code'], filters: ['billing_interval'],
    order: 'featured DESC, price_paise ASC', needsPriceToPublish: () => true,
    fields: [
      { n: 'slug', k: 'slug', unique: true },
      { n: 'plan_code', k: 'str', max: 60, req: true, unique: true, upper: true },
      { n: 'name_en', k: 'str', max: 200, req: true },
      { n: 'name_or', k: 'str', max: 200, def: '' },
      { n: 'billing_interval', k: 'enum', e: BILLING_INTERVALS, def: 'monthly' },
      ...COMMON_PRICE,
      { n: 'mrp_paise', k: 'int', min: 0, max: 100000000, def: 0 },
      { n: 'trial_days', k: 'int', min: 0, max: 90, def: 0 },
      { n: 'gst_rate_pct', k: 'int', min: 0, max: 28, def: 18 },
      { n: 'perks_json', key: 'perks', k: 'json', norm: normPerks, def: '[]' },
      { n: 'active_subscribers_count', k: 'int', min: 0, max: 1e9, def: 0 },
      { n: 'auto_renew_default', k: 'bool', def: 1 },
      { n: 'featured', k: 'bool', def: 0 },
      { n: 'status', k: 'enum', e: STATUSES, def: 'draft' }
    ],
    cloneReset: { active_subscribers_count: 0 }
  },
  memberships: {
    mod: '08', table: 'fin_memberships', label: 'membership', idPrefix: 'fmem', titleCol: 'tier_name_en',
    search: ['tier_name_en', 'tier_name_or', 'slug', 'tier_code'], filters: ['tier_code', 'mock_test_access_level'],
    order: 'sort_order ASC, price_paise ASC', needsPriceToPublish: () => false,
    fields: [
      { n: 'slug', k: 'slug', unique: true },
      { n: 'tier_code', k: 'enum', e: TIER_CODES, def: 'pro_aspirant' },
      { n: 'tier_name_en', k: 'str', max: 120, req: true },
      { n: 'tier_name_or', k: 'str', max: 120, def: '' },
      { n: 'badge_label_en', k: 'str', max: 60, def: '' },
      { n: 'badge_label_or', k: 'str', max: 60, def: '' },
      ...COMMON_PRICE,
      { n: 'duration_days', k: 'int', min: 1, max: 3650, def: 365 },
      { n: 'download_quota_daily', k: 'int', min: 0, max: 10000, def: 3 },
      { n: 'mock_test_access_level', k: 'enum', e: MOCK_ACCESS_LEVELS, def: 'free_only' },
      { n: 'offline_packs_allowed', k: 'bool', def: 0 },
      { n: 'ad_free_experience', k: 'bool', def: 0 },
      { n: 'active_members_count', k: 'int', min: 0, max: 1e9, def: 0 },
      { n: 'sort_order', k: 'int', min: 0, max: 100000, def: 100 },
      { n: 'status', k: 'enum', e: STATUSES, def: 'draft' }
    ],
    cloneReset: { active_members_count: 0 }
  }
};
for (const ent of Object.values(ENTITIES)) {
  // Register for revision rollback (shared fin_revisions table, handled by Batch 1 rollback endpoint).
  REV_TABLES[ent.mod] = { table: ent.table, cols: ent.fields.map(f => f.n) };
}

// ---------- Schema + seed ----------
export async function ensurePaymentsFinanceBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensurePaymentsFinanceBatch1Schema(db);
  if (_fin2Ready.has(db)) return;
  const ddl = [
    `CREATE TABLE IF NOT EXISTS fin_paid_resources (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      source_module_code TEXT NOT NULL DEFAULT '01' CHECK (source_module_code IN ('01','02','03','04','11','14','16')),
      source_entity_id TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      access_model TEXT NOT NULL DEFAULT 'one_time_purchase' CHECK (access_model IN ('one_time_purchase','freemium_preview','member_only')),
      price_paise INTEGER NOT NULL DEFAULT 0,
      mrp_paise INTEGER NOT NULL DEFAULT 0,
      gst_rate_pct INTEGER NOT NULL DEFAULT 18,
      preview_page_limit INTEGER NOT NULL DEFAULT 0,
      validity_days INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      revenue_paise INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_paid_res_status ON fin_paid_resources(status, access_model)`,
    `CREATE TABLE IF NOT EXISTS fin_products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      sku_code TEXT NOT NULL UNIQUE,
      product_type TEXT NOT NULL DEFAULT 'study_kit' CHECK (product_type IN ('mock_test_bundle','study_kit','ebook_pack','mentorship_session','foundation_batch')),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      price_paise INTEGER NOT NULL DEFAULT 0,
      mrp_paise INTEGER NOT NULL DEFAULT 0,
      gst_rate_pct INTEGER NOT NULL DEFAULT 18,
      hsn_sac_code TEXT NOT NULL DEFAULT '999293',
      included_items_json TEXT NOT NULL DEFAULT '[]',
      stock_or_seat_limit INTEGER NOT NULL DEFAULT 0,
      sold_count INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_products_status ON fin_products(status, product_type)`,
    `CREATE TABLE IF NOT EXISTS fin_subscription_plans (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      plan_code TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','quarterly','half_yearly','annual')),
      price_paise INTEGER NOT NULL DEFAULT 0,
      mrp_paise INTEGER NOT NULL DEFAULT 0,
      trial_days INTEGER NOT NULL DEFAULT 0,
      gst_rate_pct INTEGER NOT NULL DEFAULT 18,
      perks_json TEXT NOT NULL DEFAULT '[]',
      active_subscribers_count INTEGER NOT NULL DEFAULT 0,
      auto_renew_default INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_sub_plans_status ON fin_subscription_plans(status, billing_interval)`,
    `CREATE TABLE IF NOT EXISTS fin_memberships (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      tier_code TEXT NOT NULL DEFAULT 'pro_aspirant' CHECK (tier_code IN ('free_scholar','pro_aspirant','opsc_elite','institutional')),
      tier_name_en TEXT NOT NULL,
      tier_name_or TEXT NOT NULL DEFAULT '',
      badge_label_en TEXT NOT NULL DEFAULT '',
      badge_label_or TEXT NOT NULL DEFAULT '',
      price_paise INTEGER NOT NULL DEFAULT 0,
      duration_days INTEGER NOT NULL DEFAULT 365,
      download_quota_daily INTEGER NOT NULL DEFAULT 3,
      mock_test_access_level TEXT NOT NULL DEFAULT 'free_only' CHECK (mock_test_access_level IN ('free_only','all_mocks','all_mocks_plus_mentorship')),
      offline_packs_allowed INTEGER NOT NULL DEFAULT 0,
      ad_free_experience INTEGER NOT NULL DEFAULT 0,
      active_members_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_memberships_status ON fin_memberships(status, sort_order)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();
  await seedBatch2(db);
  _fin2Ready.add(db);
}

async function isEmpty(db, table) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first();
  return !r || Number(r.n || 0) === 0;
}

async function seedBatch2(db) {
  const ins = async (ent, row) => {
    const cols = ['id', ...ent.fields.map(f => f.n)];
    await db.prepare(`INSERT OR IGNORE INTO ${ent.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .bind(...cols.map(c => row[c])).run();
  };
  const defaults = ent => Object.fromEntries(ent.fields.map(f => [f.n, f.def !== undefined ? f.def : '']));
  const P = ENTITIES['paid-resources'];
  if (await isEmpty(db, P.table)) {
    const rows = [
      { id: 'fpr-oas-mock', slug: 'opsc-oas-prelims-mock-series', source_module_code: '14', source_entity_id: 'edu-mock-opsc-oas-prelims', title_en: 'OPSC OAS Prelims Mock Test Series (30 Tests)', title_or: 'ଓପିଏସସି ଓଏଏସ ପ୍ରିଲିମ୍ସ ମକ୍ ଟେଷ୍ଟ ସିରିଜ୍', access_model: 'one_time_purchase', price_paise: 49900, mrp_paise: 99900, validity_days: 365, sales_count: 184, revenue_paise: 9181600, featured: 1, status: 'published' },
      { id: 'fpr-eco-ebook', slug: 'odisha-economy-ebook', source_module_code: '01', source_entity_id: 'edu-res-odisha-economy', title_en: 'Odisha Economy & Budget e-Book (OPSC Mains)', title_or: 'ଓଡ଼ିଶା ଅର୍ଥନୀତି ଇ-ବୁକ୍', access_model: 'one_time_purchase', price_paise: 19900, mrp_paise: 29900, gst_rate_pct: 5, sales_count: 96, revenue_paise: 1910400, status: 'published' },
      { id: 'fpr-gk-preview', slug: 'odisha-gk-notes-preview', source_module_code: '01', source_entity_id: 'edu-res-odisha-gk-notes', title_en: 'Odisha GK Complete Notes (Free Preview)', title_or: 'ଓଡ଼ିଶା ଜିକେ ନୋଟ୍ସ', access_model: 'freemium_preview', price_paise: 14900, mrp_paise: 14900, preview_page_limit: 10, status: 'published' },
      { id: 'fpr-mains-member', slug: 'opsc-mains-answer-writing-pack', source_module_code: '16', source_entity_id: 'edu-col-mains-answer-writing', title_en: 'OPSC Mains Answer Writing Collection', title_or: '', access_model: 'member_only', price_paise: 0, status: 'draft' }
    ];
    for (const r of rows) await ins(P, { ...defaults(P), ...r });
  }
  const R = ENTITIES.products;
  if (await isEmpty(db, R.table)) {
    const rows = [
      { id: 'fprd-kit', slug: 'complete-opsc-ossc-study-kit', sku_code: 'CSO-KIT-OPSC-OSSC-2026', product_type: 'study_kit', title_en: 'Complete OPSC/OSSC Study Kit 2026', title_or: 'ସମ୍ପୂର୍ଣ୍ଣ ଓପିଏସସି/ଓଏସଏସସି ଷ୍ଟଡି କିଟ୍', summary_en: 'Syllabus-mapped notes, PYQs and 20 mock tests for Odisha state exams.', price_paise: 149900, mrp_paise: 249900, included_items_json: JSON.stringify([{ module_code: '01', item_id: 'edu-res-odisha-gk-notes', title_en: 'Odisha GK Complete Notes' }, { module_code: '14', item_id: 'edu-mock-opsc-oas-prelims', title_en: 'OPSC OAS Prelims Mock Series' }, { module_code: '01', item_id: 'edu-res-odisha-economy', title_en: 'Odisha Economy e-Book' }]), featured: 1, sold_count: 61, status: 'published' },
      { id: 'fprd-mock-bundle', slug: 'ossc-cgl-mock-bundle', sku_code: 'CSO-MOCK-OSSC-CGL', product_type: 'mock_test_bundle', title_en: 'OSSC CGL Mock Test Bundle (20 Tests)', summary_en: 'Full-length OSSC CGL practice papers with answer keys.', price_paise: 39900, mrp_paise: 59900, sold_count: 138, status: 'published' },
      { id: 'fprd-mentor', slug: 'one-on-one-mentorship-session', sku_code: 'CSO-MENTOR-1ON1', product_type: 'mentorship_session', title_en: '1-on-1 Mentorship Session (60 min)', summary_en: 'Personal strategy session with an Odisha civil services mentor.', price_paise: 79900, mrp_paise: 79900, gst_rate_pct: 18, stock_or_seat_limit: 40, sold_count: 12, status: 'draft' }
    ];
    for (const r of rows) await ins(R, { ...defaults(R), ...r });
  }
  const S = ENTITIES.subscriptions;
  if (await isEmpty(db, S.table)) {
    const perks = [{ perk_en: 'All premium mock tests', perk_or: 'ସମସ୍ତ ପ୍ରିମିୟମ୍ ମକ୍ ଟେଷ୍ଟ' }, { perk_en: 'Ad-free reading', perk_or: 'ବିଜ୍ଞାପନମୁକ୍ତ ପଢ଼ା' }, { perk_en: '10 downloads per day', perk_or: 'ଦୈନିକ ୧୦ଟି ଡାଉନଲୋଡ୍' }];
    const rows = [
      { id: 'fsub-monthly', slug: 'cs-odisha-pro-monthly', plan_code: 'CSO-PRO-M', name_en: 'CS Odisha Pro — Monthly', name_or: 'ସିଏସ୍ ଓଡ଼ିଶା ପ୍ରୋ — ମାସିକ', billing_interval: 'monthly', price_paise: 14900, mrp_paise: 19900, trial_days: 7, perks_json: JSON.stringify(perks), active_subscribers_count: 142, status: 'published' },
      { id: 'fsub-annual', slug: 'cs-odisha-pro-annual', plan_code: 'CSO-PRO-A', name_en: 'CS Odisha Pro — Annual', name_or: 'ସିଏସ୍ ଓଡ଼ିଶା ପ୍ରୋ — ବାର୍ଷିକ', billing_interval: 'annual', price_paise: 119900, mrp_paise: 178800, perks_json: JSON.stringify([...perks, { perk_en: 'Priority doubt support', perk_or: 'ପ୍ରାଥମିକତା ସହାୟତା' }]), active_subscribers_count: 87, featured: 1, status: 'published' }
    ];
    for (const r of rows) await ins(S, { ...defaults(S), ...r });
  }
  const M = ENTITIES.memberships;
  if (await isEmpty(db, M.table)) {
    const rows = [
      { id: 'fmem-free', slug: 'free-scholar', tier_code: 'free_scholar', tier_name_en: 'Free Scholar', tier_name_or: 'ମାଗଣା ଛାତ୍ର', badge_label_en: 'Scholar', badge_label_or: 'ଛାତ୍ର', price_paise: 0, duration_days: 3650, download_quota_daily: 3, mock_test_access_level: 'free_only', active_members_count: 4120, sort_order: 10, status: 'published' },
      { id: 'fmem-pro', slug: 'pro-aspirant', tier_code: 'pro_aspirant', tier_name_en: 'Pro Aspirant', tier_name_or: 'ପ୍ରୋ ଆସ୍ପିରାଣ୍ଟ', badge_label_en: 'Pro', badge_label_or: 'ପ୍ରୋ', price_paise: 99900, download_quota_daily: 15, mock_test_access_level: 'all_mocks', offline_packs_allowed: 1, ad_free_experience: 1, active_members_count: 312, sort_order: 20, status: 'published' },
      { id: 'fmem-elite', slug: 'opsc-elite', tier_code: 'opsc_elite', tier_name_en: 'OPSC Elite', tier_name_or: 'ଓପିଏସସି ଏଲିଟ୍', badge_label_en: 'Elite', badge_label_or: 'ଏଲିଟ୍', price_paise: 249900, download_quota_daily: 50, mock_test_access_level: 'all_mocks_plus_mentorship', offline_packs_allowed: 1, ad_free_experience: 1, active_members_count: 48, sort_order: 30, status: 'published' }
    ];
    for (const r of rows) await ins(M, { ...defaults(M), ...r });
  }
}

// ---------- Presentation ----------
function present(ent, row) {
  if (!row) return row;
  const out = { ...row };
  for (const f of ent.fields) {
    if (f.k === 'json') out[f.key] = parseJson(row[f.n], []);
    if (f.k === 'bool') out[f.n] = Number(row[f.n]) === 1;
  }
  out.price_inr = formatInr(row.price_paise);
  if ('mrp_paise' in row) {
    out.mrp_inr = formatInr(row.mrp_paise);
    out.discount_pct = discountPct(row.price_paise, row.mrp_paise);
  }
  return out;
}

// ---------- Generic validation ----------
function readValues(ent, body, existing, errors) {
  const v = {};
  for (const f of ent.fields) {
    const has = body[f.n] !== undefined || (f.key && body[f.key] !== undefined);
    const raw = f.key && body[f.key] !== undefined ? body[f.key] : body[f.n];
    const cur = existing ? existing[f.n] : (f.def !== undefined ? f.def : '');
    if (!has) { v[f.n] = cur; continue; }
    switch (f.k) {
      case 'str': {
        let s = cleanStr(raw, f.max, { required: !!f.req });
        if (f.req && !s) { errors[f.n] = `${f.n} is required`; break; }
        if (s.length > f.max) { errors[f.n] = `${f.n} must be at most ${f.max} characters`; break; }
        if (f.upper) s = s.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (f.req && !s) { errors[f.n] = `${f.n} is required`; break; }
        v[f.n] = s; break;
      }
      case 'slug': v[f.n] = slugOf(raw); break;
      case 'enum':
        if (!f.e.includes(raw)) { errors[f.n] = `${f.n} must be one of: ${f.e.join(', ')}`; v[f.n] = cur; } else v[f.n] = raw;
        break;
      case 'int': {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < f.min || n > f.max) { errors[f.n] = `${f.n} must be an integer between ${f.min} and ${f.max}`; v[f.n] = cur; } else v[f.n] = n;
        break;
      }
      case 'bool': v[f.n] = raw ? 1 : 0; break;
      case 'json':
        try { v[f.n] = JSON.stringify(f.norm(raw)); } catch (e) { errors[f.key] = e.message; v[f.n] = cur; }
        break;
      default: v[f.n] = cur;
    }
  }
  for (const f of ent.fields) if (f.req && !errors[f.n] && !String(v[f.n] ?? '').trim()) errors[f.n] = `${f.n} is required`;
  if ('mrp_paise' in v) {
    if (Number(v.mrp_paise) === 0) v.mrp_paise = v.price_paise;
    else if (Number(v.mrp_paise) < Number(v.price_paise)) errors.mrp_paise = 'mrp_paise must be >= price_paise';
  }
  if (ent.cross) ent.cross(v, errors);
  if (v.status === 'published' && !errors.price_paise && ent.needsPriceToPublish(v) && Number(v.price_paise) <= 0) errors.price_paise = 'Published items need price_paise > 0';
  return v;
}

async function uniqueValue(env, ent, field, value, excludeId, { suffix = '-copy', upper = false } = {}) {
  let candidate = value; let n = 1;
  for (;;) {
    const row = await env.DB.prepare(`SELECT id FROM ${ent.table} WHERE ${field} = ? AND id != ?`).bind(candidate, excludeId || '').first();
    if (!row) return candidate;
    n++; candidate = `${value}${suffix}${n > 2 ? `-${n}` : ''}`;
    if (upper) candidate = candidate.toUpperCase();
  }
}

async function assertUnique(env, ent, v, excludeId, errors) {
  for (const f of ent.fields.filter(x => x.unique)) {
    const dup = await env.DB.prepare(`SELECT id FROM ${ent.table} WHERE ${f.n} = ? AND id != ?`).bind(v[f.n], excludeId || '').first();
    if (dup) errors[f.n] = `${f.n} "${v[f.n]}" is already in use`;
  }
}

function autoSlug(ent, v, body) {
  if (!v.slug) v.slug = slugOf(body.slug || v[ent.titleCol]);
  if (!v.slug) v.slug = rid('item');
}

async function bulkOrReorder(request, env, actor, ent) {
  const body = await readJson(request, 50_000);
  const ids = Array.isArray(body.ids) ? body.ids.map(i => cleanStr(i, 100)).filter(Boolean).slice(0, 200) : [];
  if (!ids.length) throw validationError({ ids: 'ids must be a non-empty array' });
  if (body.action === 'bulk_status') {
    if (!STATUSES.includes(body.status)) throw validationError({ status: `status must be one of: ${STATUSES.join(', ')}` });
    let updated = 0; const skipped = [];
    for (const id of ids) {
      const row = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE id = ?`).bind(id).first();
      if (!row) { skipped.push({ id, reason: 'not_found' }); continue; }
      if (body.status === 'published' && ent.needsPriceToPublish(row) && Number(row.price_paise) <= 0) { skipped.push({ id, reason: 'price_required' }); continue; }
      await env.DB.prepare(`UPDATE ${ent.table} SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      await snapshotRevision(env, actor, ent.mod, id, `Bulk status -> ${body.status}`);
      updated++;
    }
    await audit(env, request, actor, `finance.${ent.label}.bulk_status`, ent.table, null, { status: body.status, updated, skipped: skipped.length });
    return json({ ok: true, updated, skipped });
  }
  if (body.action === 'reorder' && ent.mod === '08') {
    let i = 0;
    for (const id of ids) {
      i += 10;
      await env.DB.prepare(`UPDATE fin_memberships SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(i, id).run();
      await snapshotRevision(env, actor, '08', id, 'Reordered');
    }
    await audit(env, request, actor, 'finance.membership.reorder', ent.table, null, { count: ids.length });
    return json({ ok: true, reordered: ids.length });
  }
  throw validationError({ action: 'action must be bulk_status' + (ent.mod === '08' ? ' or reorder' : '') });
}

async function handleEntity(ent, request, env, actor, sub) {
  const method = request.method;
  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', `${ent.label} not found`);
      return json({ ok: true, item: present(ent, row) });
    }
    const url = new URL(request.url);
    const where = ['1=1']; const binds = [];
    const q = cleanStr(url.searchParams.get('q') || '', 100);
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(${ent.search.map(c => `${c} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
      ent.search.forEach(() => binds.push(like));
    }
    const status = url.searchParams.get('status');
    if (status) { where.push('status = ?'); binds.push(status); }
    for (const f of ent.filters) { const v = url.searchParams.get(f); if (v) { where.push(`${f} = ?`); binds.push(v); } }
    if (url.searchParams.get('featured') === '1') where.push('featured = 1');
    const { results } = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE ${where.join(' AND ')} ORDER BY ${ent.order} LIMIT 500`).bind(...binds).all();
    const counts = await env.DB.prepare(`SELECT status, COUNT(*) AS n FROM ${ent.table} GROUP BY status`).all();
    const tally = { all: 0, published: 0, draft: 0, archived: 0 };
    for (const c of counts.results || []) { tally[c.status] = Number(c.n); tally.all += Number(c.n); }
    return json({ ok: true, items: (results || []).map(r => present(ent, r)), counts: tally });
  }
  if (method === 'PATCH' && !sub) return bulkOrReorder(request, env, actor, ent);

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 100_000);
    const errors = {};
    const v = readValues(ent, body, null, errors);
    autoSlug(ent, v, body);
    if (!Object.keys(errors).length) await assertUnique(env, ent, v, null, errors);
    if (Object.keys(errors).length) throw validationError(errors);
    const id = rid(ent.idPrefix);
    const cols = ['id', ...ent.fields.map(f => f.n)];
    await env.DB.prepare(`INSERT INTO ${ent.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .bind(id, ...ent.fields.map(f => v[f.n])).run();
    await snapshotRevision(env, actor, ent.mod, id, 'Created');
    await audit(env, request, actor, `finance.${ent.label}.create`, ent.table, id, { slug: v.slug, price_paise: v.price_paise });
    const row = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: present(ent, row) }, 201);
  }

  if (method === 'POST' && sub) {
    const body = await readJson(request, 20_000);
    if (body.action !== 'clone') throw validationError({ action: 'action must be clone' });
    const src = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE id = ?`).bind(sub).first();
    if (!src) throw new HttpError(404, 'NOT_FOUND', `${ent.label} not found`);
    const v = {};
    for (const f of ent.fields) v[f.n] = src[f.n];
    Object.assign(v, ent.cloneReset, { status: 'draft', featured: 0 });
    v[ent.titleCol] = `${src[ent.titleCol]} (Copy)`.slice(0, 200);
    v.slug = await uniqueValue(env, ent, 'slug', src.slug, null);
    for (const f of ent.fields.filter(x => x.unique && x.n !== 'slug')) v[f.n] = await uniqueValue(env, ent, f.n, src[f.n], null, { upper: true });
    if (ent.mod === '08') v.sort_order = Number(src.sort_order || 0) + 1;
    const id = rid(ent.idPrefix);
    const cols = ['id', ...ent.fields.map(f => f.n)];
    await env.DB.prepare(`INSERT INTO ${ent.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .bind(id, ...ent.fields.map(f => v[f.n])).run();
    await snapshotRevision(env, actor, ent.mod, id, `Cloned from ${src.slug}`);
    await audit(env, request, actor, `finance.${ent.label}.clone`, ent.table, id, { source: sub });
    const row = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: present(ent, row) }, 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', `${ent.label} not found`);
    const body = await readJson(request, 100_000);
    const errors = {};
    const v = readValues(ent, body, existing, errors);
    autoSlug(ent, v, body);
    if (!Object.keys(errors).length) await assertUnique(env, ent, v, sub, errors);
    if (Object.keys(errors).length) throw validationError(errors);
    const sets = ent.fields.map(f => `${f.n} = ?`).join(', ');
    await env.DB.prepare(`UPDATE ${ent.table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...ent.fields.map(f => v[f.n]), sub).run();
    await snapshotRevision(env, actor, ent.mod, sub, cleanStr(body.change_note || (existing.status !== v.status ? `Status ${existing.status} -> ${v.status}` : 'Updated'), 300));
    await audit(env, request, actor, `finance.${ent.label}.update`, ent.table, sub, { fields: Object.keys(body) });
    const row = await env.DB.prepare(`SELECT * FROM ${ent.table} WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: present(ent, row) });
  }

  if (method === 'DELETE' && sub) {
    const existing = await env.DB.prepare(`SELECT id FROM ${ent.table} WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', `${ent.label} not found`);
    await env.DB.prepare(`UPDATE ${ent.table} SET status = 'archived', featured = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, ent.mod, sub, 'Archived');
    await audit(env, request, actor, `finance.${ent.label}.archive`, ent.table, sub, null);
    return json({ ok: true, status: 'archived' });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 05: live Educational Resource picker ----------
// Mapping onto source_module_code: edu_resources -> '01', edu_mock_tests -> '14', edu_collections -> '16'.
async function searchEdu(request, env) {
  if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  const url = new URL(request.url);
  const q = cleanStr(url.searchParams.get('q') || '', 80);
  const like = `%${likeEscape(q)}%`;
  const limit = 10;
  const sources = [
    { code: '01', kind: 'resource', table: 'edu_resources', ensure: ensureEduResourcesBatch1Schema, cols: 'id, title_en, title_or, slug' },
    { code: '14', kind: 'mock_test', table: 'edu_mock_tests', ensure: ensureEduResourcesBatch4Schema, cols: 'id, title_en, title_or, slug' },
    { code: '16', kind: 'collection', table: 'edu_collections', ensure: ensureEduResourcesBatch4Schema, cols: 'id, title_en, title_or, slug' }
  ];
  const items = [];
  for (const s of sources) {
    try {
      await s.ensure(env.DB);
      const { results } = await env.DB.prepare(
        `SELECT ${s.cols} FROM ${s.table} WHERE status != 'archived' AND (? = '' OR title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\') ORDER BY updated_at DESC LIMIT ${limit}`
      ).bind(q, like, like, like).all();
      for (const r of results || []) {
        const paid = await env.DB.prepare(`SELECT id FROM fin_paid_resources WHERE source_module_code = ? AND source_entity_id = ? AND status != 'archived'`).bind(s.code, r.id).first();
        items.push({ source_module_code: s.code, source_kind: s.kind, source_entity_id: r.id, title_en: r.title_en, title_or: r.title_or || '', slug: r.slug, already_paid: !!paid });
      }
    } catch (e) { /* source table unavailable: skip */ }
  }
  return json({ ok: true, items });
}

// ---------- Overview extension ----------
export async function getPaymentsFinanceBatch2Overview(env) {
  await ensurePaymentsFinanceBatch2Schema(env.DB);
  const [pr, prd, subs, mem, prAll, prdAll, subAll, memAll] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_paid_resources WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_products WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT billing_interval, price_paise, active_subscribers_count FROM fin_subscription_plans WHERE status = 'published'`).all(),
    env.DB.prepare(`SELECT SUM(active_members_count) AS n FROM fin_memberships WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_paid_resources`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_products`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_subscription_plans`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_memberships`).first()
  ]);
  const plans = subs.results || [];
  const mrr = plans.reduce((s, p) => s + Math.round(Number(p.price_paise) * Number(p.active_subscribers_count) / INTERVAL_MONTHS[p.billing_interval]), 0);
  return {
    paid_resources_count: Number(pr?.n || 0),
    active_product_skus: Number(prd?.n || 0),
    active_subscribers: plans.reduce((s, p) => s + Number(p.active_subscribers_count || 0), 0),
    active_members: Number(mem?.n || 0),
    mrr_estimate_paise: mrr,
    modules: { '05': Number(prAll?.n || 0), '06': Number(prdAll?.n || 0), '07': Number(subAll?.n || 0), '08': Number(memAll?.n || 0) }
  };
}

// ---------- Public catalog ----------
export async function handlePublicFinanceCatalogApi(request, env) {
  await ensurePaymentsFinanceBatch2Schema(env.DB);
  const get = async (ent, cols) => {
    const { results } = await env.DB.prepare(`SELECT ${cols.join(', ')} FROM ${ent.table} WHERE status = 'published' ORDER BY ${ent.order} LIMIT 100`).all();
    return (results || []).map(r => {
      const o = { ...r };
      for (const f of ent.fields) if (f.k === 'json' && f.n in r) { o[f.key] = parseJson(r[f.n], []); delete o[f.n]; }
      for (const k of ['featured', 'offline_packs_allowed', 'ad_free_experience', 'auto_renew_default']) if (k in o) o[k] = Number(o[k]) === 1;
      o.currency_code = 'INR';
      o.price_inr = formatInr(r.price_paise);
      if ('mrp_paise' in r) { o.mrp_inr = formatInr(r.mrp_paise); o.discount_pct = discountPct(r.price_paise, r.mrp_paise); }
      return o;
    });
  };
  const body = {
    ok: true,
    currency_code: 'INR',
    paid_resources: await get(ENTITIES['paid-resources'], ['id', 'slug', 'source_module_code', 'source_entity_id', 'title_en', 'title_or', 'access_model', 'price_paise', 'mrp_paise', 'gst_rate_pct', 'preview_page_limit', 'validity_days', 'featured']),
    products: await get(ENTITIES.products, ['id', 'slug', 'sku_code', 'product_type', 'title_en', 'title_or', 'summary_en', 'summary_or', 'price_paise', 'mrp_paise', 'gst_rate_pct', 'hsn_sac_code', 'included_items_json', 'featured']),
    subscription_plans: await get(ENTITIES.subscriptions, ['id', 'slug', 'plan_code', 'name_en', 'name_or', 'billing_interval', 'price_paise', 'mrp_paise', 'trial_days', 'gst_rate_pct', 'perks_json', 'auto_renew_default', 'featured']),
    membership_tiers: await get(ENTITIES.memberships, ['id', 'slug', 'tier_code', 'tier_name_en', 'tier_name_or', 'badge_label_en', 'badge_label_or', 'price_paise', 'duration_days', 'download_quota_daily', 'mock_test_access_level', 'offline_packs_allowed', 'ad_free_experience', 'sort_order'])
  };
  return json(body, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
}

// ---------- Router entry ----------
export async function handlePaymentsFinanceBatch2Admin(request, env, actor, id, sub) {
  if (id !== 'overview' && !ENTITIES[id]) return null;
  await ensurePaymentsFinanceBatch2Schema(env.DB);
  if (id === 'overview') {
    if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    const b1 = await getPaymentsFinanceOverview(env);
    const b2 = await getPaymentsFinanceBatch2Overview(env);
    return json({ ...b1, ...b2, modules: { ...b1.modules, ...b2.modules } });
  }
  if (id === 'paid-resources' && sub === 'search-edu') return searchEdu(request, env);
  return handleEntity(ENTITIES[id], request, env, actor, sub);
}
