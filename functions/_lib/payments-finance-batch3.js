// Payments & Finance Batch 3 (v93): Modules 09-12
// 09 Donations | 10 Coupons & Offers | 11 Refunds & Disputes | 12 Invoices & Receipts
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  ensurePaymentsFinanceBatch1Schema, getPaymentsFinanceOverview, REV_TABLES, snapshotRevision
} from './payments-finance-batch1.js';
import {
  ensurePaymentsFinanceBatch2Schema, getPaymentsFinanceBatch2Overview, formatInr, discountPct
} from './payments-finance-batch2.js';

export const CAUSE_CATEGORIES = ['free_odia_textbooks', 'rural_student_scholarships', 'open_pyq_digitization', 'platform_sustainability'];
export const DISCOUNT_TYPES = ['percent', 'flat_paise'];
export const COUPON_SCOPES = ['all', 'paid_resources', 'products', 'subscriptions', 'memberships'];
export const REFUND_CASE_TYPES = ['refund_request', 'partial_refund', 'gateway_chargeback', 'upi_dispute'];
export const REFUND_REASONS = ['duplicate_payment', 'accidental_purchase', 'content_mismatch', 'technical_access_issue', 'bank_chargeback'];
export const REFUND_STATUSES = ['open', 'under_review', 'approved_processed', 'rejected', 'won_dispute', 'lost_dispute'];
export const INVOICE_DOC_TYPES = ['tax_invoice', 'payment_receipt', 'donation_receipt', 'credit_note'];
export const INVOICE_STATUSES = ['draft', 'issued', 'voided'];

const _fin3Ready = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }
function slugOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }

// Revision tables registration
REV_TABLES['09'] = {
  table: 'fin_donation_campaigns',
  cols: ['slug', 'campaign_code', 'title_en', 'title_or', 'cause_category', 'summary_en', 'summary_or', 'goal_paise', 'raised_paise', 'donor_count', 'suggested_amounts_json', 'allow_custom_amount', 'show_donor_wall', 'featured', 'status']
};
REV_TABLES['10'] = {
  table: 'fin_coupons',
  cols: ['code', 'title_en', 'title_or', 'discount_type', 'discount_value', 'max_discount_paise', 'min_order_paise', 'applicable_scope', 'usage_limit_total', 'usage_limit_per_user', 'used_count', 'valid_from', 'valid_until', 'status']
};
REV_TABLES['11'] = {
  table: 'fin_refunds_disputes',
  cols: ['case_number', 'case_type', 'order_id', 'transaction_id', 'customer_name', 'customer_email', 'amount_paise', 'reason_code', 'reason_notes', 'gateway_refund_id', 'evidence_notes', 'case_status', 'revoke_digital_access', 'resolved_by', 'resolved_at']
};
REV_TABLES['12'] = {
  table: 'fin_invoices',
  cols: ['invoice_number', 'doc_type', 'order_id', 'transaction_id', 'customer_name', 'customer_email', 'customer_state', 'customer_gstin', 'supplier_gstin', 'hsn_sac_code', 'taxable_paise', 'cgst_paise', 'sgst_paise', 'igst_paise', 'total_paise', 'line_items_json', 'issued_at', 'status']
};

export async function ensurePaymentsFinanceBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensurePaymentsFinanceBatch2Schema(db);
  if (_fin3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS fin_donation_campaigns (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      campaign_code TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      cause_category TEXT NOT NULL DEFAULT 'free_odia_textbooks' CHECK (cause_category IN ('free_odia_textbooks', 'rural_student_scholarships', 'open_pyq_digitization', 'platform_sustainability')),
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      goal_paise INTEGER NOT NULL DEFAULT 0,
      raised_paise INTEGER NOT NULL DEFAULT 0,
      donor_count INTEGER NOT NULL DEFAULT 0,
      suggested_amounts_json TEXT NOT NULL DEFAULT '[10100, 25100, 50100, 110000]',
      allow_custom_amount INTEGER NOT NULL DEFAULT 1,
      show_donor_wall INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_don_camp_status ON fin_donation_campaigns(status, featured)`,
    `CREATE TABLE IF NOT EXISTS fin_donation_entries (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES fin_donation_campaigns(id) ON DELETE CASCADE,
      donor_name TEXT NOT NULL,
      donor_email TEXT NOT NULL DEFAULT '',
      donor_city TEXT NOT NULL DEFAULT '',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      amount_paise INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'upi',
      txn_reference TEXT NOT NULL DEFAULT '',
      message_note TEXT NOT NULL DEFAULT '',
      receipt_number TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_don_entries_camp ON fin_donation_entries(campaign_id, status)`,
    `CREATE TABLE IF NOT EXISTS fin_coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'flat_paise')),
      discount_value INTEGER NOT NULL DEFAULT 10,
      max_discount_paise INTEGER NOT NULL DEFAULT 0,
      min_order_paise INTEGER NOT NULL DEFAULT 0,
      applicable_scope TEXT NOT NULL DEFAULT 'all' CHECK (applicable_scope IN ('all', 'paid_resources', 'products', 'subscriptions', 'memberships')),
      usage_limit_total INTEGER NOT NULL DEFAULT 0,
      usage_limit_per_user INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      valid_from TEXT,
      valid_until TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_coupons_code ON fin_coupons(code, status)`,
    `CREATE TABLE IF NOT EXISTS fin_refunds_disputes (
      id TEXT PRIMARY KEY,
      case_number TEXT NOT NULL UNIQUE,
      case_type TEXT NOT NULL DEFAULT 'refund_request' CHECK (case_type IN ('refund_request', 'partial_refund', 'gateway_chargeback', 'upi_dispute')),
      order_id TEXT NOT NULL REFERENCES fin_orders(id) ON DELETE RESTRICT,
      transaction_id TEXT REFERENCES fin_transactions(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      amount_paise INTEGER NOT NULL DEFAULT 0,
      reason_code TEXT NOT NULL DEFAULT 'accidental_purchase' CHECK (reason_code IN ('duplicate_payment', 'accidental_purchase', 'content_mismatch', 'technical_access_issue', 'bank_chargeback')),
      reason_notes TEXT NOT NULL DEFAULT '',
      gateway_refund_id TEXT NOT NULL DEFAULT '',
      evidence_notes TEXT NOT NULL DEFAULT '',
      case_status TEXT NOT NULL DEFAULT 'open' CHECK (case_status IN ('open', 'under_review', 'approved_processed', 'rejected', 'won_dispute', 'lost_dispute')),
      revoke_digital_access INTEGER NOT NULL DEFAULT 1,
      resolved_by TEXT NOT NULL DEFAULT '',
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_refunds_status ON fin_refunds_disputes(case_status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS fin_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      doc_type TEXT NOT NULL DEFAULT 'tax_invoice' CHECK (doc_type IN ('tax_invoice', 'payment_receipt', 'donation_receipt', 'credit_note')),
      order_id TEXT REFERENCES fin_orders(id) ON DELETE SET NULL,
      transaction_id TEXT REFERENCES fin_transactions(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      customer_state TEXT NOT NULL DEFAULT 'Odisha',
      customer_gstin TEXT NOT NULL DEFAULT '',
      supplier_gstin TEXT NOT NULL DEFAULT '21AAACC1234D1Z5',
      hsn_sac_code TEXT NOT NULL DEFAULT '999293',
      taxable_paise INTEGER NOT NULL DEFAULT 0,
      cgst_paise INTEGER NOT NULL DEFAULT 0,
      sgst_paise INTEGER NOT NULL DEFAULT 0,
      igst_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL DEFAULT 0,
      line_items_json TEXT NOT NULL DEFAULT '[]',
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'voided')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_invoices_order ON fin_invoices(order_id, status)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();
  await seedBatch3(db);
  _fin3Ready.add(db);
}

async function seedBatch3(db) {
  const cCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_donation_campaigns`).first();
  if (!cCnt || Number(cCnt.n || 0) === 0) {
    const cId = 'fdon-camp-001';
    await db.prepare(`
      INSERT INTO fin_donation_campaigns (id, slug, campaign_code, title_en, title_or, cause_category, summary_en, summary_or, goal_paise, raised_paise, donor_count, suggested_amounts_json, allow_custom_amount, show_donor_wall, featured, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      cId, 'rural-odisha-digital-library', 'CSO-DON-DIGILIB',
      'Rural Odisha Student Digital Library Drive', 'ଗ୍ରାମୀଣ ଓଡ଼ିଶା ଛାତ୍ର ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ ଅଭିଯାନ',
      'rural_student_scholarships',
      'Enabling free tablets and high-speed mock test access for underprivileged aspirants across Mayurbhanj, Kalahandi, and Koraput districts.',
      'ଗ୍ରାମାଞ୍ଚଳର ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀମାନଙ୍କୁ ମାଗଣା ଟ୍ୟାବ୍ଲେଟ୍ ଏବଂ ମକ୍ ଟେଷ୍ଟ ପ୍ରଦାନ କରିବା।',
      50000000, 3600000, 3, '[10100, 25100, 50100, 110000]', 1, 1, 1, 'published'
    ).run();

    const donors = [
      ['fdon-ent-001', cId, 'Amiya Kumar Jena', 'amiya.jena@example.com', 'Bhubaneswar', 0, 1500000, 'upi', 'TXN-DON-2026-001', 'Proud to support our rural youth.', 'CSO-REC-2026-001', 'completed'],
      ['fdon-ent-002', cId, 'Subrat Mohapatra', 'subrat.m@example.com', 'Cuttack', 0, 1100000, 'upi', 'TXN-DON-2026-002', 'May every OAS aspirant succeed.', 'CSO-REC-2026-002', 'completed'],
      ['fdon-ent-003', cId, 'Anonymous Well-wisher', '', 'Rourkela', 1, 1000000, 'netbanking', 'TXN-DON-2026-003', 'Keep up the genuine work for Odisha.', 'CSO-REC-2026-003', 'completed']
    ];
    for (const d of donors) {
      await db.prepare(`
        INSERT INTO fin_donation_entries (id, campaign_id, donor_name, donor_email, donor_city, is_anonymous, amount_paise, payment_method, txn_reference, message_note, receipt_number, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(...d).run();
    }
  }

  const cpCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_coupons`).first();
  if (!cpCnt || Number(cpCnt.n || 0) === 0) {
    const coupons = [
      ['fcpn-001', 'ODISHA20', 'Odisha Day 20% Special', 'ଓଡ଼ିଶା ଦିବସ ସ୍ୱତନ୍ତ୍ର ୨୦% ରିହାତି', 'percent', 20, 10000, 29900, 'all', 1000, 1, 48, '2026-01-01', '2026-12-31', 'published'],
      ['fcpn-002', 'WELCOME100', 'Flat ₹100 Off on First Pack', 'ପ୍ରଥମ କ୍ରୟରେ ₹୧୦୦ ଛାଡ଼', 'flat_paise', 10000, 10000, 49900, 'all', 500, 1, 19, '2026-01-01', '2026-12-31', 'published'],
      ['fcpn-003', 'OAS50', 'OPSC OAS Mock Special 50% Off', 'ଓଏଏସ ମକ୍ ସ୍ୱତନ୍ତ୍ର', 'percent', 50, 25000, 49900, 'paid_resources', 200, 1, 0, '2026-01-01', '2026-12-31', 'draft']
    ];
    for (const c of coupons) {
      await db.prepare(`
        INSERT INTO fin_coupons (id, code, title_en, title_or, discount_type, discount_value, max_discount_paise, min_order_paise, applicable_scope, usage_limit_total, usage_limit_per_user, used_count, valid_from, valid_until, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(...c).run();
    }
  }

  const rfCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_refunds_disputes`).first();
  if (!rfCnt || Number(rfCnt.n || 0) === 0) {
    // Seed 1 resolved refund and 1 open refund case
    await db.prepare(`
      INSERT INTO fin_refunds_disputes (id, case_number, case_type, order_id, transaction_id, customer_name, customer_email, amount_paise, reason_code, reason_notes, gateway_refund_id, evidence_notes, case_status, revoke_digital_access, resolved_by, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'frfd-001', 'CSO-RFD-2026-0001', 'refund_request', 'ford-004', 'ftxn-004',
      'Subhashree Nayak', 'subhashree.nayak@example.com', 47082,
      'accidental_purchase', 'Candidate mistakenly double purchased OSSC CGL Mock Test Series.',
      'rfnd_RZP_2026_001', 'Bank verification screenshot provided.', 'approved_processed', 1,
      'finance-admin@csodisha.com', new Date().toISOString()
    ).run();

    await db.prepare(`
      INSERT INTO fin_refunds_disputes (id, case_number, case_type, order_id, transaction_id, customer_name, customer_email, amount_paise, reason_code, reason_notes, gateway_refund_id, evidence_notes, case_status, revoke_digital_access, resolved_by, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'frfd-002', 'CSO-RFD-2026-0002', 'upi_dispute', 'ford-005', 'ftxn-005',
      'Rakesh Dash', 'rakesh.dash@example.com', 26145,
      'duplicate_payment', 'Candidate claims UPI debited twice on Axis Bank.',
      '', 'Pending bank reconciliation file.', 'open', 1,
      '', null
    ).run();
  }

  const invCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_invoices`).first();
  if (!invCnt || Number(invCnt.n || 0) === 0) {
    // Intra-state Odisha: CGST 9% + SGST 9%
    const items1 = [{ title: 'OPSC OAS Prelims Mock Test Series', qty: 1, taxable_paise: 44910, gst_rate: 18, total_paise: 52994 }];
    await db.prepare(`
      INSERT INTO fin_invoices (id, invoice_number, doc_type, order_id, transaction_id, customer_name, customer_email, customer_state, customer_gstin, supplier_gstin, hsn_sac_code, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, line_items_json, issued_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'finv-001', 'CSO-INV-2026-0001', 'tax_invoice', 'ford-001', 'ftxn-001',
      'Sasmita Mohanty', 'sasmita.mohanty@example.com', 'Odisha', '',
      '21AAACC1234D1Z5', '999293', 44910, 4042, 4042, 0, 52994,
      JSON.stringify(items1), new Date().toISOString(), 'issued'
    ).run();

    // Inter-state (e.g. West Bengal): IGST 18%
    const items2 = [{ title: 'Odisha GK Complete Study Pack', qty: 1, taxable_paise: 29900, gst_rate: 18, total_paise: 35282 }];
    await db.prepare(`
      INSERT INTO fin_invoices (id, invoice_number, doc_type, order_id, transaction_id, customer_name, customer_email, customer_state, customer_gstin, supplier_gstin, hsn_sac_code, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, line_items_json, issued_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'finv-002', 'CSO-INV-2026-0002', 'tax_invoice', 'ford-002', 'ftxn-002',
      'Anirban Ghosh', 'anirban.g@example.com', 'West Bengal', '',
      '21AAACC1234D1Z5', '999293', 29900, 0, 0, 5382, 35282,
      JSON.stringify(items2), new Date().toISOString(), 'issued'
    ).run();
  }
}

// Helper to decorate objects with formatted inr
function decorateInr(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith('_paise') && typeof v === 'number') {
      out[k.replace(/_paise$/, '_inr')] = formatInr(v);
    }
  }
  return out;
}

// ---------- Overview Extension for Batch 3 ----------
export async function getPaymentsFinanceBatch3Overview(env) {
  await ensurePaymentsFinanceBatch3Schema(env.DB);
  const [donRes, cpnRes, rfdRes, invRes, cAll, cpAll, rfAll, invAll] = await Promise.all([
    env.DB.prepare(`SELECT SUM(raised_paise) AS total_raised FROM fin_donation_campaigns WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS active_coupons FROM fin_coupons WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS open_refunds FROM fin_refunds_disputes WHERE case_status IN ('open', 'under_review')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS issued_invoices FROM fin_invoices WHERE status = 'issued'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_donation_campaigns`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_coupons`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_refunds_disputes`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_invoices`).first()
  ]);

  return {
    total_donations_raised_paise: Number(donRes?.total_raised || 0),
    total_donations_raised_inr: formatInr(donRes?.total_raised || 0),
    active_coupons_count: Number(cpnRes?.active_coupons || 0),
    open_refunds_count: Number(rfdRes?.open_refunds || 0),
    issued_invoices_count: Number(invRes?.issued_invoices || 0),
    modules: {
      '09': Number(cAll?.n || 0),
      '10': Number(cpAll?.n || 0),
      '11': Number(rfAll?.n || 0),
      '12': Number(invAll?.n || 0)
    }
  };
}

// ---------- Module 09: Donations ----------
async function handleDonations(request, env, actor, sub) {
  const method = request.method;
  const url = new URL(request.url);

  // Sub-route: /api/admin/finance/donations/entries -> Donor Ledger
  if (sub === 'entries' || url.searchParams.get('view') === 'entries') {
    if (method === 'GET') {
      const campId = url.searchParams.get('campaign_id');
      const where = campId ? `WHERE campaign_id = ?` : ``;
      const binds = campId ? [campId] : [];
      const { results } = await env.DB.prepare(`
        SELECT e.*, c.title_en as campaign_title
        FROM fin_donation_entries e
        LEFT JOIN fin_donation_campaigns c ON c.id = e.campaign_id
        ${where}
        ORDER BY e.created_at DESC LIMIT 500
      `).bind(...binds).all();
      return json({ ok: true, items: (results || []).map(decorateInr) });
    }
    if (method === 'POST') {
      const body = await readJson(request, 50_000);
      const campId = cleanStr(body.campaign_id, 100, { required: true });
      const donorName = cleanStr(body.donor_name, 120, { required: true });
      const amountPaise = Number(body.amount_paise || 0);
      if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
        throw validationError({ amount_paise: 'Amount must be positive integer paise' });
      }
      const camp = await env.DB.prepare(`SELECT * FROM fin_donation_campaigns WHERE id = ?`).bind(campId).first();
      if (!camp) throw new HttpError(404, 'NOT_FOUND', 'Campaign not found');

      const entryId = rid('fdon-ent');
      const recNum = `CSO-REC-${new Date().getUTCFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      await env.DB.prepare(`
        INSERT INTO fin_donation_entries (id, campaign_id, donor_name, donor_email, donor_city, is_anonymous, amount_paise, payment_method, txn_reference, message_note, receipt_number, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `).bind(
        entryId, campId, donorName, cleanStr(body.donor_email || '', 160), cleanStr(body.donor_city || '', 80),
        body.is_anonymous ? 1 : 0, amountPaise, cleanStr(body.payment_method || 'upi', 40),
        cleanStr(body.txn_reference || '', 120), cleanStr(body.message_note || '', 500), recNum
      ).run();

      // Atomically tally campaign raised_paise and donor_count
      await env.DB.prepare(`
        UPDATE fin_donation_campaigns
        SET raised_paise = raised_paise + ?, donor_count = donor_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).bind(amountPaise, campId).run();

      await snapshotRevision(env, actor, '09', campId, `New donation of ${formatInr(amountPaise)} by ${donorName}`);
      await audit(env, request, actor, 'finance.donation.record', 'fin_donation_entries', entryId, { amount_paise: amountPaise, campaign_id: campId });

      const row = await env.DB.prepare(`SELECT * FROM fin_donation_entries WHERE id = ?`).bind(entryId).first();
      return json({ ok: true, item: decorateInr(row) }, 201);
    }
  }

  // Campaigns CRUD
  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_donation_campaigns WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Donation campaign not found');
      const out = decorateInr(row);
      out.suggested_amounts = parseJson(row.suggested_amounts_json, []);
      out.allow_custom_amount = Number(row.allow_custom_amount) === 1;
      out.show_donor_wall = Number(row.show_donor_wall) === 1;
      out.featured = Number(row.featured) === 1;
      return json({ ok: true, item: out });
    }
    const q = cleanStr(url.searchParams.get('q') || '', 100);
    const status = url.searchParams.get('status');
    const where = ['1=1']; const binds = [];
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(title_en LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR campaign_code LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like);
    }
    if (status) { where.push(`status = ?`); binds.push(status); }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_donation_campaigns WHERE ${where.join(' AND ')} ORDER BY featured DESC, created_at DESC`).bind(...binds).all();
    const items = (results || []).map(r => {
      const o = decorateInr(r);
      o.suggested_amounts = parseJson(r.suggested_amounts_json, []);
      o.allow_custom_amount = Number(r.allow_custom_amount) === 1;
      o.show_donor_wall = Number(r.show_donor_wall) === 1;
      o.featured = Number(r.featured) === 1;
      return o;
    });
    return json({ ok: true, items });
  }

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const titleEn = cleanStr(body.title_en, 200, { required: true });
    if (!titleEn) throw validationError({ title_en: 'Title is required' });
    const code = cleanStr(body.campaign_code || slugOf(titleEn), 60).toUpperCase();
    const slug = slugOf(body.slug || titleEn);
    const cause = CAUSE_CATEGORIES.includes(body.cause_category) ? body.cause_category : 'free_odia_textbooks';
    const goalPaise = Number(body.goal_paise || 0);
    if (!Number.isInteger(goalPaise) || goalPaise < 0) throw validationError({ goal_paise: 'Goal paise must be integer >= 0' });

    let suggested = [10100, 25100, 50100, 110000];
    if (Array.isArray(body.suggested_amounts)) suggested = body.suggested_amounts.map(Number).filter(n => Number.isInteger(n) && n > 0);

    const id = rid('fdon');
    await env.DB.prepare(`
      INSERT INTO fin_donation_campaigns (id, slug, campaign_code, title_en, title_or, cause_category, summary_en, summary_or, goal_paise, suggested_amounts_json, allow_custom_amount, show_donor_wall, featured, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, slug, code, titleEn, cleanStr(body.title_or || '', 200), cause,
      cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
      goalPaise, JSON.stringify(suggested), body.allow_custom_amount !== false ? 1 : 0,
      body.show_donor_wall !== false ? 1 : 0, body.featured ? 1 : 0, body.status || 'draft'
    ).run();

    await snapshotRevision(env, actor, '09', id, 'Campaign created');
    await audit(env, request, actor, 'finance.donation_campaign.create', 'fin_donation_campaigns', id, { code, slug });
    const row = await env.DB.prepare(`SELECT * FROM fin_donation_campaigns WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: decorateInr(row) }, 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_donation_campaigns WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Campaign not found');
    const body = await readJson(request, 50_000);

    const titleEn = body.title_en !== undefined ? cleanStr(body.title_en, 200, { required: true }) : existing.title_en;
    const titleOr = body.title_or !== undefined ? cleanStr(body.title_or, 200) : existing.title_or;
    const summaryEn = body.summary_en !== undefined ? cleanStr(body.summary_en, 1000) : existing.summary_en;
    const summaryOr = body.summary_or !== undefined ? cleanStr(body.summary_or, 1000) : existing.summary_or;
    const cause = body.cause_category !== undefined && CAUSE_CATEGORIES.includes(body.cause_category) ? body.cause_category : existing.cause_category;
    const goalPaise = body.goal_paise !== undefined ? Number(body.goal_paise) : existing.goal_paise;
    const status = body.status !== undefined ? body.status : existing.status;
    const featured = body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured;
    const allowCustom = body.allow_custom_amount !== undefined ? (body.allow_custom_amount ? 1 : 0) : existing.allow_custom_amount;
    const showWall = body.show_donor_wall !== undefined ? (body.show_donor_wall ? 1 : 0) : existing.show_donor_wall;

    let suggestedJson = existing.suggested_amounts_json;
    if (Array.isArray(body.suggested_amounts)) {
      suggestedJson = JSON.stringify(body.suggested_amounts.map(Number).filter(n => Number.isInteger(n) && n > 0));
    }

    await env.DB.prepare(`
      UPDATE fin_donation_campaigns
      SET title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, cause_category = ?, goal_paise = ?, suggested_amounts_json = ?, allow_custom_amount = ?, show_donor_wall = ?, featured = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(titleEn, titleOr, summaryEn, summaryOr, cause, goalPaise, suggestedJson, allowCustom, showWall, featured, status, sub).run();

    await snapshotRevision(env, actor, '09', sub, cleanStr(body.change_note || 'Campaign updated', 300));
    await audit(env, request, actor, 'finance.donation_campaign.update', 'fin_donation_campaigns', sub, { title_en: titleEn, status });
    const row = await env.DB.prepare(`SELECT * FROM fin_donation_campaigns WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: decorateInr(row) });
  }

  if (method === 'DELETE' && sub) {
    await env.DB.prepare(`UPDATE fin_donation_campaigns SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '09', sub, 'Campaign archived');
    await audit(env, request, actor, 'finance.donation_campaign.archive', 'fin_donation_campaigns', sub, null);
    return json({ ok: true, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 10: Coupons & Offers ----------
export function calculateCouponDiscount(coupon, orderPaise) {
  if (!coupon || coupon.status !== 'published') {
    return { valid: false, reason: 'Coupon inactive or invalid', discount_paise: 0 };
  }
  const now = new Date().toISOString().slice(0, 10);
  if (coupon.valid_from && now < coupon.valid_from.slice(0, 10)) {
    return { valid: false, reason: 'Coupon is not yet active', discount_paise: 0 };
  }
  if (coupon.valid_until && now > coupon.valid_until.slice(0, 10)) {
    return { valid: false, reason: 'Coupon has expired', discount_paise: 0 };
  }
  if (coupon.usage_limit_total > 0 && coupon.used_count >= coupon.usage_limit_total) {
    return { valid: false, reason: 'Coupon total usage limit reached', discount_paise: 0 };
  }
  if (orderPaise < Number(coupon.min_order_paise || 0)) {
    return { valid: false, reason: `Minimum order amount of ${formatInr(coupon.min_order_paise)} required`, discount_paise: 0 };
  }

  let disc = 0;
  if (coupon.discount_type === 'percent') {
    disc = Math.round(orderPaise * Number(coupon.discount_value) / 100);
  } else {
    disc = Number(coupon.discount_value);
  }
  if (Number(coupon.max_discount_paise || 0) > 0 && disc > Number(coupon.max_discount_paise)) {
    disc = Number(coupon.max_discount_paise);
  }
  if (disc > orderPaise) disc = orderPaise;

  return {
    valid: true,
    discount_paise: disc,
    discount_inr: formatInr(disc),
    final_paise: orderPaise - disc,
    final_inr: formatInr(orderPaise - disc)
  };
}

async function handleCoupons(request, env, actor, sub) {
  const method = request.method;

  // Simulator endpoint: /api/admin/finance/coupons/validate
  if (sub === 'validate' && method === 'POST') {
    const body = await readJson(request, 20_000);
    const code = cleanStr(body.code || '', 60).toUpperCase();
    const orderPaise = Number(body.order_paise || 0);
    if (!code) throw validationError({ code: 'Coupon code is required' });
    const coupon = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE code = ?`).bind(code).first();
    if (!coupon) {
      return json({ ok: false, valid: false, reason: 'Coupon code not found', discount_paise: 0 });
    }
    const res = calculateCouponDiscount(coupon, orderPaise);
    return json({ ok: true, coupon: decorateInr(coupon), ...res });
  }

  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Coupon not found');
      return json({ ok: true, item: decorateInr(row) });
    }
    const url = new URL(request.url);
    const q = cleanStr(url.searchParams.get('q') || '', 100);
    const status = url.searchParams.get('status');
    const where = ['1=1']; const binds = [];
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(code LIKE ? ESCAPE '\\' OR title_en LIKE ? ESCAPE '\\')`);
      binds.push(like, like);
    }
    if (status) { where.push(`status = ?`); binds.push(status); }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE ${where.join(' AND ')} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ ok: true, items: (results || []).map(decorateInr) });
  }

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const code = cleanStr(body.code, 60, { required: true }).toUpperCase();
    const titleEn = cleanStr(body.title_en, 200, { required: true });
    if (!code) throw validationError({ code: 'Code is required' });
    if (!titleEn) throw validationError({ title_en: 'Title is required' });

    const discType = DISCOUNT_TYPES.includes(body.discount_type) ? body.discount_type : 'percent';
    const discVal = Number(body.discount_value || 0);
    if (discType === 'percent' && (discVal <= 0 || discVal > 100)) throw validationError({ discount_value: 'Percent discount must be 1..100' });
    if (discType === 'flat_paise' && discVal <= 0) throw validationError({ discount_value: 'Flat discount must be > 0' });

    const existing = await env.DB.prepare(`SELECT id FROM fin_coupons WHERE code = ?`).bind(code).first();
    if (existing) throw new HttpError(409, 'DUPLICATE_CODE', 'Coupon code already exists');

    const id = rid('fcpn');
    await env.DB.prepare(`
      INSERT INTO fin_coupons (id, code, title_en, title_or, discount_type, discount_value, max_discount_paise, min_order_paise, applicable_scope, usage_limit_total, usage_limit_per_user, valid_from, valid_until, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, code, titleEn, cleanStr(body.title_or || '', 200), discType, discVal,
      Number(body.max_discount_paise || 0), Number(body.min_order_paise || 0),
      cleanStr(body.applicable_scope || 'all', 40), Number(body.usage_limit_total || 0),
      Number(body.usage_limit_per_user || 1), cleanStr(body.valid_from || '', 30) || null,
      cleanStr(body.valid_until || '', 30) || null, body.status || 'draft'
    ).run();

    await snapshotRevision(env, actor, '10', id, 'Coupon created');
    await audit(env, request, actor, 'finance.coupon.create', 'fin_coupons', id, { code });
    const row = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: decorateInr(row) }, 201);
  }

  // Clone action: POST /api/admin/finance/coupons/:id with { action: 'clone' }
  if (method === 'POST' && sub) {
    const body = await readJson(request, 20_000);
    if (body.action !== 'clone') throw validationError({ action: 'action must be clone' });
    const src = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE id = ?`).bind(sub).first();
    if (!src) throw new HttpError(404, 'NOT_FOUND', 'Coupon not found');

    const newCode = `${src.code}_COPY_${Math.floor(100 + Math.random() * 900)}`;
    const id = rid('fcpn');
    await env.DB.prepare(`
      INSERT INTO fin_coupons (id, code, title_en, title_or, discount_type, discount_value, max_discount_paise, min_order_paise, applicable_scope, usage_limit_total, usage_limit_per_user, used_count, valid_from, valid_until, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'draft')
    `).bind(
      id, newCode, `${src.title_en} (Copy)`, src.title_or, src.discount_type, src.discount_value,
      src.max_discount_paise, src.min_order_paise, src.applicable_scope, src.usage_limit_total,
      src.usage_limit_per_user, src.valid_from, src.valid_until
    ).run();

    await snapshotRevision(env, actor, '10', id, `Cloned from ${src.code}`);
    await audit(env, request, actor, 'finance.coupon.clone', 'fin_coupons', id, { source_id: sub, new_code: newCode });
    const row = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: decorateInr(row) }, 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Coupon not found');
    const body = await readJson(request, 50_000);

    const titleEn = body.title_en !== undefined ? cleanStr(body.title_en, 200, { required: true }) : existing.title_en;
    const titleOr = body.title_or !== undefined ? cleanStr(body.title_or, 200) : existing.title_or;
    const discType = body.discount_type !== undefined ? body.discount_type : existing.discount_type;
    const discVal = body.discount_value !== undefined ? Number(body.discount_value) : existing.discount_value;
    const maxPaise = body.max_discount_paise !== undefined ? Number(body.max_discount_paise) : existing.max_discount_paise;
    const minPaise = body.min_order_paise !== undefined ? Number(body.min_order_paise) : existing.min_order_paise;
    const scope = body.applicable_scope !== undefined ? body.applicable_scope : existing.applicable_scope;
    const totalLim = body.usage_limit_total !== undefined ? Number(body.usage_limit_total) : existing.usage_limit_total;
    const userLim = body.usage_limit_per_user !== undefined ? Number(body.usage_limit_per_user) : existing.usage_limit_per_user;
    const status = body.status !== undefined ? body.status : existing.status;
    const validFrom = body.valid_from !== undefined ? (cleanStr(body.valid_from, 30) || null) : existing.valid_from;
    const validUntil = body.valid_until !== undefined ? (cleanStr(body.valid_until, 30) || null) : existing.valid_until;

    await env.DB.prepare(`
      UPDATE fin_coupons
      SET title_en = ?, title_or = ?, discount_type = ?, discount_value = ?, max_discount_paise = ?, min_order_paise = ?, applicable_scope = ?, usage_limit_total = ?, usage_limit_per_user = ?, valid_from = ?, valid_until = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(titleEn, titleOr, discType, discVal, maxPaise, minPaise, scope, totalLim, userLim, validFrom, validUntil, status, sub).run();

    await snapshotRevision(env, actor, '10', sub, cleanStr(body.change_note || 'Coupon updated', 300));
    await audit(env, request, actor, 'finance.coupon.update', 'fin_coupons', sub, { code: existing.code, status });
    const row = await env.DB.prepare(`SELECT * FROM fin_coupons WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: decorateInr(row) });
  }

  if (method === 'DELETE' && sub) {
    await env.DB.prepare(`UPDATE fin_coupons SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '10', sub, 'Coupon archived');
    await audit(env, request, actor, 'finance.coupon.archive', 'fin_coupons', sub, null);
    return json({ ok: true, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 11: Refunds & Disputes ----------
async function handleRefunds(request, env, actor, sub) {
  const method = request.method;

  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`
        SELECT r.*, o.order_number, o.total_paise as order_total_paise, o.payment_status as order_payment_status, o.fulfillment_status as order_fulfillment_status
        FROM fin_refunds_disputes r
        LEFT JOIN fin_orders o ON o.id = r.order_id
        WHERE r.id = ?
      `).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Refund record not found');
      return json({ ok: true, item: decorateInr(row) });
    }
    const url = new URL(request.url);
    const q = cleanStr(url.searchParams.get('q') || '', 100);
    const status = url.searchParams.get('case_status');
    const where = ['1=1']; const binds = [];
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(r.case_number LIKE ? ESCAPE '\\' OR r.customer_name LIKE ? ESCAPE '\\' OR r.customer_email LIKE ? ESCAPE '\\' OR o.order_number LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like);
    }
    if (status) { where.push(`r.case_status = ?`); binds.push(status); }
    const { results } = await env.DB.prepare(`
      SELECT r.*, o.order_number
      FROM fin_refunds_disputes r
      LEFT JOIN fin_orders o ON o.id = r.order_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC
    `).bind(...binds).all();
    return json({ ok: true, items: (results || []).map(decorateInr) });
  }

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const orderId = cleanStr(body.order_id, 100, { required: true });
    const order = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(orderId).first();
    if (!order) throw new HttpError(404, 'NOT_FOUND', 'Order not found');

    const amountPaise = Number(body.amount_paise || order.total_paise);
    if (!Number.isInteger(amountPaise) || amountPaise <= 0 || amountPaise > Number(order.total_paise)) {
      throw validationError({ amount_paise: `Refund amount must be between 1 and order total (${formatInr(order.total_paise)})` });
    }

    const id = rid('frfd');
    const caseNum = `CSO-RFD-${new Date().getUTCFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const txnId = cleanStr(body.transaction_id || '', 100) || null;

    await env.DB.prepare(`
      INSERT INTO fin_refunds_disputes (id, case_number, case_type, order_id, transaction_id, customer_name, customer_email, amount_paise, reason_code, reason_notes, gateway_refund_id, evidence_notes, case_status, revoke_digital_access)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).bind(
      id, caseNum, cleanStr(body.case_type || 'refund_request', 40), orderId, txnId,
      cleanStr(body.customer_name || order.customer_name, 120),
      cleanStr(body.customer_email || order.customer_email, 160),
      amountPaise, cleanStr(body.reason_code || 'accidental_purchase', 50),
      cleanStr(body.reason_notes || '', 1000), cleanStr(body.gateway_refund_id || '', 120),
      cleanStr(body.evidence_notes || '', 1000), body.revoke_digital_access !== false ? 1 : 0
    ).run();

    await snapshotRevision(env, actor, '11', id, 'Refund case opened');
    await audit(env, request, actor, 'finance.refund.create', 'fin_refunds_disputes', id, { case_number: caseNum, amount_paise: amountPaise });
    const row = await env.DB.prepare(`SELECT * FROM fin_refunds_disputes WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: decorateInr(row) }, 201);
  }

  // Updating / Approving / Rejecting
  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_refunds_disputes WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Refund case not found');
    const body = await readJson(request, 50_000);

    const targetStatus = cleanStr(body.case_status || existing.case_status, 40);
    if (!REFUND_STATUSES.includes(targetStatus)) {
      throw validationError({ case_status: `Status must be one of: ${REFUND_STATUSES.join(', ')}` });
    }

    const gwRefundId = body.gateway_refund_id !== undefined ? cleanStr(body.gateway_refund_id, 120) : existing.gateway_refund_id;
    const evidenceNotes = body.evidence_notes !== undefined ? cleanStr(body.evidence_notes, 1000) : existing.evidence_notes;
    const revokeAccess = body.revoke_digital_access !== undefined ? (body.revoke_digital_access ? 1 : 0) : existing.revoke_digital_access;

    let resolvedBy = existing.resolved_by;
    let resolvedAt = existing.resolved_at;

    // Cascade approval to Order & Transaction
    if (targetStatus === 'approved_processed' && existing.case_status !== 'approved_processed') {
      resolvedBy = actor.email;
      resolvedAt = new Date().toISOString();

      const order = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(existing.order_id).first();
      if (order) {
        const isFull = existing.amount_paise >= Number(order.total_paise);
        const newPayStatus = isFull ? 'refunded' : 'partially_refunded';
        const newFulfillStatus = (revokeAccess && isFull) ? 'cancelled' : order.fulfillment_status;

        await env.DB.prepare(`
          UPDATE fin_orders
          SET payment_status = ?, fulfillment_status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(newPayStatus, newFulfillStatus, order.id).run();

        await snapshotRevision(env, actor, '04', order.id, `Refund approved: payment marked ${newPayStatus}`);
      }

      // Update linked transaction if present
      if (existing.transaction_id) {
        await env.DB.prepare(`
          UPDATE fin_transactions
          SET txn_status = 'refunded'
          WHERE id = ?
        `).bind(existing.transaction_id).run();
        await snapshotRevision(env, actor, '03', existing.transaction_id, 'Refund approved via dispute case');
      }
    } else if (targetStatus === 'rejected') {
      resolvedBy = actor.email;
      resolvedAt = new Date().toISOString();
    }

    await env.DB.prepare(`
      UPDATE fin_refunds_disputes
      SET case_status = ?, gateway_refund_id = ?, evidence_notes = ?, revoke_digital_access = ?, resolved_by = ?, resolved_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(targetStatus, gwRefundId, evidenceNotes, revokeAccess, resolvedBy, resolvedAt, sub).run();

    await snapshotRevision(env, actor, '11', sub, `Status -> ${targetStatus}`);
    await audit(env, request, actor, 'finance.refund.update', 'fin_refunds_disputes', sub, { status: targetStatus, resolved_by: resolvedBy });

    const row = await env.DB.prepare(`SELECT * FROM fin_refunds_disputes WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: decorateInr(row) });
  }

  if (method === 'DELETE' && sub) {
    // Soft-mark rejected or delete record
    await env.DB.prepare(`UPDATE fin_refunds_disputes SET case_status = 'rejected', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '11', sub, 'Refund case rejected/closed');
    return json({ ok: true, case_status: 'rejected' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 12: Invoices & Receipts ----------
export function calculateGstBreakdown(taxablePaise, customerState = 'Odisha', gstRatePct = 18) {
  const isIntraState = !customerState || customerState.toLowerCase().trim() === 'odisha';
  const totalTax = Math.round(taxablePaise * gstRatePct / 100);
  let cgst = 0, sgst = 0, igst = 0;

  if (isIntraState) {
    cgst = Math.round(totalTax / 2);
    sgst = totalTax - cgst;
  } else {
    igst = totalTax;
  }

  return {
    isIntraState,
    taxable_paise: taxablePaise,
    cgst_paise: cgst,
    sgst_paise: sgst,
    igst_paise: igst,
    total_tax_paise: totalTax,
    total_paise: taxablePaise + totalTax
  };
}

async function handleInvoices(request, env, actor, sub) {
  const method = request.method;

  // Auto-generate invoice from paid order: POST /api/admin/finance/invoices/generate-from-order
  if (sub === 'generate-from-order' && method === 'POST') {
    const body = await readJson(request, 30_000);
    const orderId = cleanStr(body.order_id, 100, { required: true });
    const order = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(orderId).first();
    if (!order) throw new HttpError(404, 'NOT_FOUND', 'Order not found');

    const invNum = `CSO-INV-${new Date().getUTCFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const id = rid('finv');
    const items = parseJson(order.items_json, []);

    // Derive taxable portion (subtotal minus discount)
    const taxablePaise = Math.max(0, Number(order.subtotal_paise || 0) - Number(order.discount_paise || 0));
    const gstCalc = calculateGstBreakdown(taxablePaise, order.customer_state || 'Odisha', 18);

    await env.DB.prepare(`
      INSERT INTO fin_invoices (id, invoice_number, doc_type, order_id, customer_name, customer_email, customer_state, customer_gstin, supplier_gstin, hsn_sac_code, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, line_items_json, issued_at, status)
      VALUES (?, ?, 'tax_invoice', ?, ?, ?, ?, ?, '21AAACC1234D1Z5', '999293', ?, ?, ?, ?, ?, ?, datetime('now'), 'issued')
    `).bind(
      id, invNum, order.id, order.customer_name, order.customer_email,
      order.customer_state || 'Odisha', cleanStr(body.customer_gstin || '', 30),
      gstCalc.taxable_paise, gstCalc.cgst_paise, gstCalc.sgst_paise, gstCalc.igst_paise, gstCalc.total_paise,
      JSON.stringify(items)
    ).run();

    await snapshotRevision(env, actor, '12', id, `Generated from order ${order.order_number}`);
    await audit(env, request, actor, 'finance.invoice.generate', 'fin_invoices', id, { order_id: order.id, invoice_number: invNum });
    const row = await env.DB.prepare(`SELECT * FROM fin_invoices WHERE id = ?`).bind(id).first();
    const out = decorateInr(row);
    out.line_items = parseJson(row.line_items_json, []);
    return json({ ok: true, item: out }, 201);
  }

  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_invoices WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Invoice not found');
      const out = decorateInr(row);
      out.line_items = parseJson(row.line_items_json, []);
      return json({ ok: true, item: out });
    }
    const url = new URL(request.url);
    const q = cleanStr(url.searchParams.get('q') || '', 100);
    const status = url.searchParams.get('status');
    const docType = url.searchParams.get('doc_type');
    const where = ['1=1']; const binds = [];
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(invoice_number LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR customer_email LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like);
    }
    if (status) { where.push(`status = ?`); binds.push(status); }
    if (docType) { where.push(`doc_type = ?`); binds.push(docType); }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_invoices WHERE ${where.join(' AND ')} ORDER BY issued_at DESC`).bind(...binds).all();
    const items = (results || []).map(r => {
      const o = decorateInr(r);
      o.line_items = parseJson(r.line_items_json, []);
      return o;
    });
    return json({ ok: true, items });
  }

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const cName = cleanStr(body.customer_name, 120, { required: true });
    if (!cName) throw validationError({ customer_name: 'Customer name is required' });

    const invNum = `CSO-INV-${new Date().getUTCFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const id = rid('finv');
    const docType = INVOICE_DOC_TYPES.includes(body.doc_type) ? body.doc_type : 'tax_invoice';
    const cState = cleanStr(body.customer_state || 'Odisha', 60);
    const taxablePaise = Number(body.taxable_paise || 0);

    const gstCalc = calculateGstBreakdown(taxablePaise, cState, Number(body.gst_rate_pct || 18));
    const items = Array.isArray(body.line_items) ? body.line_items : [];

    await env.DB.prepare(`
      INSERT INTO fin_invoices (id, invoice_number, doc_type, order_id, transaction_id, customer_name, customer_email, customer_state, customer_gstin, supplier_gstin, hsn_sac_code, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, line_items_json, issued_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '21AAACC1234D1Z5', ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `).bind(
      id, invNum, docType, cleanStr(body.order_id || '', 100) || null,
      cleanStr(body.transaction_id || '', 100) || null, cName,
      cleanStr(body.customer_email || '', 160), cState, cleanStr(body.customer_gstin || '', 30),
      cleanStr(body.hsn_sac_code || '999293', 20), gstCalc.taxable_paise, gstCalc.cgst_paise,
      gstCalc.sgst_paise, gstCalc.igst_paise, gstCalc.total_paise, JSON.stringify(items),
      body.status || 'issued'
    ).run();

    await snapshotRevision(env, actor, '12', id, 'Invoice created');
    await audit(env, request, actor, 'finance.invoice.create', 'fin_invoices', id, { invoice_number: invNum });
    const row = await env.DB.prepare(`SELECT * FROM fin_invoices WHERE id = ?`).bind(id).first();
    const out = decorateInr(row);
    out.line_items = parseJson(row.line_items_json, []);
    return json({ ok: true, item: out }, 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_invoices WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Invoice not found');
    const body = await readJson(request, 50_000);

    const status = body.status !== undefined ? body.status : existing.status;
    const notes = cleanStr(body.customer_gstin || existing.customer_gstin, 30);

    await env.DB.prepare(`UPDATE fin_invoices SET status = ?, customer_gstin = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, notes, sub).run();
    await snapshotRevision(env, actor, '12', sub, `Status -> ${status}`);
    await audit(env, request, actor, 'finance.invoice.update', 'fin_invoices', sub, { status });

    const row = await env.DB.prepare(`SELECT * FROM fin_invoices WHERE id = ?`).bind(sub).first();
    const out = decorateInr(row);
    out.line_items = parseJson(row.line_items_json, []);
    return json({ ok: true, item: out });
  }

  if (method === 'DELETE' && sub) {
    // Void invoice
    await env.DB.prepare(`UPDATE fin_invoices SET status = 'voided', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '12', sub, 'Invoice voided');
    return json({ ok: true, status: 'voided' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Main Router Entry for Batch 3 ----------
export async function handlePaymentsFinanceBatch3Admin(request, env, actor, id, sub) {
  if (!['overview', 'donations', 'coupons', 'refunds', 'invoices'].includes(id)) return null;
  await ensurePaymentsFinanceBatch3Schema(env.DB);

  if (id === 'overview') {
    if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    const b1 = await getPaymentsFinanceOverview(env);
    const b2 = await getPaymentsFinanceBatch2Overview(env);
    const b3 = await getPaymentsFinanceBatch3Overview(env);
    return json({ ...b1, ...b2, ...b3, modules: { ...b1.modules, ...b2.modules, ...b3.modules } });
  }

  if (id === 'donations') return handleDonations(request, env, actor, sub);
  if (id === 'coupons') return handleCoupons(request, env, actor, sub);
  if (id === 'refunds') return handleRefunds(request, env, actor, sub);
  if (id === 'invoices') return handleInvoices(request, env, actor, sub);

  return null;
}
