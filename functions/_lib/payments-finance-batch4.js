// Payments & Finance Batch 4 (v94): Modules 13-16
// 13 Tax Configuration | 14 Payouts & Settlements | 15 Reconciliation | 16 Finance Reports
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import { getPaymentsFinanceOverview, REV_TABLES, snapshotRevision } from './payments-finance-batch1.js';
import { getPaymentsFinanceBatch2Overview, formatInr } from './payments-finance-batch2.js';
import { ensurePaymentsFinanceBatch3Schema, getPaymentsFinanceBatch3Overview } from './payments-finance-batch3.js';

export const TAX_REGIMES = ['indian_gst', 'exempt_educational', 'donation_80g'];
export const TAX_SCOPES = ['all_taxable', 'paid_resources', 'mock_tests', 'subscriptions', 'memberships', 'donations'];
export const GST_SLABS = [0, 5, 12, 18];
export const TAX_STATUSES = ['draft', 'published', 'archived'];
export const SETTLEMENT_STATUSES = ['scheduled', 'processing', 'settled', 'on_hold'];
export const RECON_STATUSES = ['balanced', 'variance_detected', 'resolved'];
export const REPORT_TYPES = ['gst_gstr1_summary', 'revenue_by_product', 'gateway_settlement_ledger', 'refund_chargeback_register', 'donation_80g_ledger'];

const _fin4Ready = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }
function slugOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }

function decorateInr(row) {
  if (!row) return row;
  const out = { ...row };
  for (const [k, v] of Object.entries(row)) {
    if (k.endsWith('_paise') && typeof v === 'number') {
      out[k.replace(/_paise$/, '_inr')] = formatInr(v);
    }
  }
  return out;
}

REV_TABLES['13'] = {
  table: 'fin_tax_rules',
  cols: ['slug', 'rule_code', 'rule_name_en', 'rule_name_or', 'tax_regime', 'hsn_sac_code', 'applicable_scope', 'home_state_code', 'total_gst_pct', 'cgst_pct', 'sgst_pct', 'igst_pct', 'is_tax_inclusive', 'is_default', 'status']
};
REV_TABLES['14'] = {
  table: 'fin_payout_settlements',
  cols: ['settlement_utr', 'gateway_key', 'period_start', 'period_end', 'gross_captured_paise', 'gateway_fee_paise', 'gst_on_fee_paise', 'net_settled_paise', 'txn_count', 'bank_account_masked', 'settlement_status', 'settled_at', 'notes']
};
REV_TABLES['15'] = {
  table: 'fin_reconciliation_runs',
  cols: ['run_code', 'gateway_key', 'period_start', 'period_end', 'expected_ledger_paise', 'gateway_reported_paise', 'settled_bank_paise', 'variance_paise', 'matched_txn_count', 'unmatched_txn_count', 'discrepancy_items_json', 'run_status', 'reconciled_by']
};

export async function ensurePaymentsFinanceBatch4Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensurePaymentsFinanceBatch3Schema(db);
  if (_fin4Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS fin_tax_rules (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      rule_code TEXT NOT NULL UNIQUE,
      rule_name_en TEXT NOT NULL,
      rule_name_or TEXT NOT NULL DEFAULT '',
      tax_regime TEXT NOT NULL DEFAULT 'indian_gst' CHECK (tax_regime IN ('indian_gst', 'exempt_educational', 'donation_80g')),
      hsn_sac_code TEXT NOT NULL DEFAULT '999293',
      applicable_scope TEXT NOT NULL DEFAULT 'all_taxable' CHECK (applicable_scope IN ('all_taxable', 'paid_resources', 'mock_tests', 'subscriptions', 'memberships', 'donations')),
      home_state_code TEXT NOT NULL DEFAULT '21',
      total_gst_pct REAL NOT NULL DEFAULT 18 CHECK (total_gst_pct IN (0, 5, 12, 18)),
      cgst_pct REAL NOT NULL DEFAULT 9,
      sgst_pct REAL NOT NULL DEFAULT 9,
      igst_pct REAL NOT NULL DEFAULT 18,
      is_tax_inclusive INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_tax_rules_status ON fin_tax_rules(status, applicable_scope)`,
    `CREATE TABLE IF NOT EXISTS fin_payout_settlements (
      id TEXT PRIMARY KEY,
      settlement_utr TEXT NOT NULL UNIQUE,
      gateway_key TEXT NOT NULL DEFAULT 'razorpay-live',
      period_start TEXT NOT NULL DEFAULT '',
      period_end TEXT NOT NULL DEFAULT '',
      gross_captured_paise INTEGER NOT NULL DEFAULT 0,
      gateway_fee_paise INTEGER NOT NULL DEFAULT 0,
      gst_on_fee_paise INTEGER NOT NULL DEFAULT 0,
      net_settled_paise INTEGER NOT NULL DEFAULT 0,
      txn_count INTEGER NOT NULL DEFAULT 0,
      bank_account_masked TEXT NOT NULL DEFAULT 'SBI •••• 4821',
      settlement_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (settlement_status IN ('scheduled', 'processing', 'settled', 'on_hold')),
      settled_at TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_settlements_status ON fin_payout_settlements(settlement_status, gateway_key, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS fin_reconciliation_runs (
      id TEXT PRIMARY KEY,
      run_code TEXT NOT NULL UNIQUE,
      gateway_key TEXT NOT NULL DEFAULT 'all',
      period_start TEXT NOT NULL DEFAULT '',
      period_end TEXT NOT NULL DEFAULT '',
      expected_ledger_paise INTEGER NOT NULL DEFAULT 0,
      gateway_reported_paise INTEGER NOT NULL DEFAULT 0,
      settled_bank_paise INTEGER NOT NULL DEFAULT 0,
      variance_paise INTEGER NOT NULL DEFAULT 0,
      matched_txn_count INTEGER NOT NULL DEFAULT 0,
      unmatched_txn_count INTEGER NOT NULL DEFAULT 0,
      discrepancy_items_json TEXT NOT NULL DEFAULT '[]',
      run_status TEXT NOT NULL DEFAULT 'balanced' CHECK (run_status IN ('balanced', 'variance_detected', 'resolved')),
      reconciled_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_recon_status ON fin_reconciliation_runs(run_status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS fin_saved_reports (
      id TEXT PRIMARY KEY,
      report_code TEXT NOT NULL UNIQUE,
      report_type TEXT NOT NULL DEFAULT 'gst_gstr1_summary' CHECK (report_type IN ('gst_gstr1_summary', 'revenue_by_product', 'gateway_settlement_ledger', 'refund_chargeback_register', 'donation_80g_ledger')),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      period_start TEXT NOT NULL DEFAULT '',
      period_end TEXT NOT NULL DEFAULT '',
      summary_metrics_json TEXT NOT NULL DEFAULT '{}',
      generated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_reports_type ON fin_saved_reports(report_type, created_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();
  await seedBatch4(db);
  _fin4Ready.add(db);
}

async function seedBatch4(db) {
  const tCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_tax_rules`).first();
  if (!tCnt || Number(tCnt.n || 0) === 0) {
    const rules = [
      ['ftax-gst18', 'odisha-edu-gst-18', 'GST-EDU-18', 'Odisha Educational Services 18% GST', 'ଓଡ଼ିଶା ଶିକ୍ଷା ସେବା ୧୮% GST', 'indian_gst', '999293', 'all_taxable', '21', 18, 9, 9, 18, 0, 1, 'published'],
      ['ftax-exempt', 'exempt-edu-books-0', 'GST-EXEMPT-0', 'Exempt Educational Books & e-Books (0%)', 'ଟିକସମୁକ୍ତ ଶିକ୍ଷା ପୁସ୍ତକ (୦%)', 'exempt_educational', '4901', 'paid_resources', '21', 0, 0, 0, 0, 0, 0, 'published'],
      ['ftax-80g', 'donation-80g-exempt', 'DON-80G-0', '80G Charitable Donations (0% Exempt)', '80G ଦାନ ଟିକସମୁକ୍ତ (୦%)', 'donation_80g', '999299', 'donations', '21', 0, 0, 0, 0, 0, 0, 'published'],
      ['ftax-gst5', 'printed-study-kit-5', 'GST-KIT-5', 'Printed Study Kit 5% GST', 'ମୁଦ୍ରିତ ଷ୍ଟଡି କିଟ୍ ୫% GST', 'indian_gst', '4901', 'paid_resources', '21', 5, 2.5, 2.5, 5, 1, 0, 'draft']
    ];
    for (const r of rules) {
      await db.prepare(
        `INSERT OR IGNORE INTO fin_tax_rules (id, slug, rule_code, rule_name_en, rule_name_or, tax_regime, hsn_sac_code, applicable_scope, home_state_code, total_gst_pct, cgst_pct, sgst_pct, igst_pct, is_tax_inclusive, is_default, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const sCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_payout_settlements`).first();
  if (!sCnt || Number(sCnt.n || 0) === 0) {
    const rows = [
      ['fset-001', 'UTR-RZP-20260001', 'razorpay-live', '2026-11-01', '2026-11-10', 213198, 846, 152, 212200, 3, 'SBI •••• 4821', 'settled', '2026-11-11T10:30:00Z', 'Razorpay NEFT batch settled to SBI Bhubaneswar'],
      ['fset-002', 'UTR-PHPE-20260002', 'phonepe_upi', '2026-11-11', '2026-11-17', 49900, 0, 0, 49900, 1, 'SBI •••• 4821', 'processing', null, 'Zero-MDR UPI settlement in transit']
    ];
    for (const r of rows) {
      await db.prepare(
        `INSERT OR IGNORE INTO fin_payout_settlements (id, settlement_utr, gateway_key, period_start, period_end, gross_captured_paise, gateway_fee_paise, gst_on_fee_paise, net_settled_paise, txn_count, bank_account_masked, settlement_status, settled_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const rCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_reconciliation_runs`).first();
  if (!rCnt || Number(rCnt.n || 0) === 0) {
    await db.prepare(
      `INSERT OR IGNORE INTO fin_reconciliation_runs (id, run_code, gateway_key, period_start, period_end, expected_ledger_paise, gateway_reported_paise, settled_bank_paise, variance_paise, matched_txn_count, unmatched_txn_count, discrepancy_items_json, run_status, reconciled_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'balanced', 'finance-admin@csodisha.com')`
    ).bind('frec-001', 'REC-2026-0001', 'razorpay-live', '2026-11-01', '2026-11-10', 213198, 213198, 212200, 0, 3, 0).run();
  }

  const rpCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_saved_reports`).first();
  if (!rpCnt || Number(rpCnt.n || 0) === 0) {
    await db.prepare(
      `INSERT OR IGNORE INTO fin_saved_reports (id, report_code, report_type, title_en, title_or, period_start, period_end, summary_metrics_json, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      'frpt-001', 'RPT-GSTR1-2026-11', 'gst_gstr1_summary',
      'Odisha GSTR-1 Tax Summary (Nov 2026)', 'ଓଡ଼ିଶା GSTR-1 ଟିକସ ସାରାଂଶ',
      '2026-11-01', '2026-11-30',
      JSON.stringify({ invoices_count: 2, taxable_paise: 74810, cgst_paise: 4042, sgst_paise: 4042, igst_paise: 5382, total_paise: 88276 }),
      'finance-admin@csodisha.com'
    ).run();
  }
}

// ---------- Overview Extension ----------
export async function getPaymentsFinanceBatch4Overview(env) {
  await ensurePaymentsFinanceBatch4Schema(env.DB);
  const [taxPub, setSettled, recVar, rptRow, tAll, sAll, rAll, rpAll] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_tax_rules WHERE status = 'published'`).first(),
    env.DB.prepare(`SELECT SUM(net_settled_paise) AS s FROM fin_payout_settlements WHERE settlement_status = 'settled'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_reconciliation_runs WHERE run_status = 'variance_detected'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_saved_reports`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_tax_rules`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_payout_settlements`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_reconciliation_runs`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_saved_reports`).first()
  ]);
  const settledPaise = Number(setSettled?.s || 0);
  return {
    active_tax_rules_count: Number(taxPub?.n || 0),
    settled_payouts_paise: settledPaise,
    settled_payouts_inr: formatInr(settledPaise),
    open_variances_count: Number(recVar?.n || 0),
    saved_reports_count: Number(rptRow?.n || 0),
    modules: {
      '13': Number(tAll?.n || 0),
      '14': Number(sAll?.n || 0),
      '15': Number(rAll?.n || 0),
      '16': Number(rpAll?.n || 0)
    }
  };
}

// ---------- Module 13: Tax Configuration ----------
export function calculateGstSplit(amountPaise, { customerState = 'Odisha', gstPct = 18, isTaxInclusive = false, homeStateCode = '21' } = {}) {
  const amt = Math.max(0, Math.round(Number(amountPaise || 0)));
  const rate = Number(gstPct || 0);
  const stateClean = String(customerState || '').trim().toLowerCase();
  const isIntraState = !stateClean || stateClean === 'odisha' || stateClean === String(homeStateCode || '21').toLowerCase() || stateClean === '21';

  let taxablePaise = amt;
  let totalTaxPaise = 0;
  if (rate > 0) {
    if (isTaxInclusive) {
      taxablePaise = Math.round(amt * 100 / (100 + rate));
      totalTaxPaise = amt - taxablePaise;
    } else {
      totalTaxPaise = Math.round(amt * rate / 100);
    }
  }
  const cgstPaise = isIntraState ? Math.round(totalTaxPaise / 2) : 0;
  const sgstPaise = isIntraState ? totalTaxPaise - cgstPaise : 0;
  const igstPaise = isIntraState ? 0 : totalTaxPaise;
  const totalPaise = isTaxInclusive ? amt : taxablePaise + totalTaxPaise;

  return {
    is_intra_state: isIntraState,
    home_state_code: homeStateCode || '21',
    customer_state: customerState || 'Odisha',
    gst_pct: rate,
    is_tax_inclusive: !!isTaxInclusive,
    taxable_paise: taxablePaise,
    cgst_paise: cgstPaise,
    sgst_paise: sgstPaise,
    igst_paise: igstPaise,
    total_tax_paise: totalTaxPaise,
    total_paise: totalPaise,
    taxable_inr: formatInr(taxablePaise),
    cgst_inr: formatInr(cgstPaise),
    sgst_inr: formatInr(sgstPaise),
    igst_inr: formatInr(igstPaise),
    total_tax_inr: formatInr(totalTaxPaise),
    total_inr: formatInr(totalPaise)
  };
}

function presentTaxRule(r) {
  if (!r) return r;
  return {
    ...r,
    is_tax_inclusive: Number(r.is_tax_inclusive) === 1,
    is_default: Number(r.is_default) === 1
  };
}

async function handleTaxRules(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'calculate' && method === 'POST') {
    const body = await readJson(request, 20_000);
    const amountPaise = Number(body.amount_paise ?? 0);
    if (!Number.isInteger(amountPaise) || amountPaise < 0) {
      throw validationError({ amount_paise: 'amount_paise must be an integer >= 0' });
    }
    let gstPct = body.total_gst_pct !== undefined ? Number(body.total_gst_pct) : 18;
    let isInc = !!body.is_tax_inclusive;
    let homeCode = cleanStr(body.home_state_code || '21', 10) || '21';
    if (body.rule_id) {
      const rule = await env.DB.prepare(`SELECT * FROM fin_tax_rules WHERE id = ?`).bind(cleanStr(body.rule_id, 100)).first();
      if (!rule) throw new HttpError(404, 'NOT_FOUND', 'Tax rule not found');
      gstPct = Number(rule.total_gst_pct);
      if (body.is_tax_inclusive === undefined) isInc = Number(rule.is_tax_inclusive) === 1;
      homeCode = rule.home_state_code || '21';
    }
    if (!GST_SLABS.includes(gstPct)) throw validationError({ total_gst_pct: 'total_gst_pct must be 0, 5, 12, or 18' });
    const split = calculateGstSplit(amountPaise, {
      customerState: cleanStr(body.customer_state || 'Odisha', 60) || 'Odisha',
      gstPct,
      isTaxInclusive: isInc,
      homeStateCode: homeCode
    });
    return json({ ok: true, ...split });
  }

  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_tax_rules WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Tax rule not found');
      return json({ ok: true, item: presentTaxRule(row) });
    }
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const q = cleanStr(url.searchParams.get('q') || '', 80);
    const where = ['1=1']; const binds = [];
    if (status) { where.push('status = ?'); binds.push(status); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(rule_name_en LIKE ? ESCAPE '\\' OR rule_code LIKE ? ESCAPE '\\' OR hsn_sac_code LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like);
    }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_tax_rules WHERE ${where.join(' AND ')} ORDER BY is_default DESC, total_gst_pct DESC`).bind(...binds).all();
    return json({ ok: true, items: (results || []).map(presentTaxRule) });
  }

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const errors = {};
    const nameEn = cleanStr(body.rule_name_en, 160, { required: true });
    if (!nameEn) errors.rule_name_en = 'rule_name_en is required';
    const regime = TAX_REGIMES.includes(body.tax_regime || 'indian_gst') ? (body.tax_regime || 'indian_gst') : null;
    if (!regime) errors.tax_regime = `tax_regime must be one of: ${TAX_REGIMES.join(', ')}`;
    const scope = TAX_SCOPES.includes(body.applicable_scope || 'all_taxable') ? (body.applicable_scope || 'all_taxable') : null;
    if (!scope) errors.applicable_scope = `applicable_scope must be one of: ${TAX_SCOPES.join(', ')}`;
    const gstPct = Number(body.total_gst_pct ?? (regime === 'indian_gst' ? 18 : 0));
    if (!GST_SLABS.includes(gstPct)) errors.total_gst_pct = 'total_gst_pct must be 0, 5, 12, or 18';
    const status = TAX_STATUSES.includes(body.status || 'draft') ? (body.status || 'draft') : null;
    if (!status) errors.status = `status must be one of: ${TAX_STATUSES.join(', ')}`;
    const ruleCode = cleanStr(body.rule_code || slugOf(nameEn), 40).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!ruleCode) errors.rule_code = 'rule_code is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const dup = await env.DB.prepare(`SELECT id FROM fin_tax_rules WHERE rule_code = ?`).bind(ruleCode).first();
    if (dup) throw new HttpError(409, 'DUPLICATE_CODE', 'Tax rule code already exists');

    const id = rid('ftax');
    const slug = slugOf(body.slug || `${nameEn}-${id.slice(-4)}`);
    const isDef = body.is_default ? 1 : 0;
    if (isDef) await env.DB.prepare(`UPDATE fin_tax_rules SET is_default = 0`).run();

    await env.DB.prepare(
      `INSERT INTO fin_tax_rules (id, slug, rule_code, rule_name_en, rule_name_or, tax_regime, hsn_sac_code, applicable_scope, home_state_code, total_gst_pct, cgst_pct, sgst_pct, igst_pct, is_tax_inclusive, is_default, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, slug, ruleCode, nameEn, cleanStr(body.rule_name_or || '', 160), regime,
      cleanStr(body.hsn_sac_code || '999293', 12) || '999293', scope,
      cleanStr(body.home_state_code || '21', 10) || '21',
      gstPct, gstPct / 2, gstPct / 2, gstPct, body.is_tax_inclusive ? 1 : 0, isDef, status
    ).run();

    await snapshotRevision(env, actor, '13', id, 'Tax rule created');
    await audit(env, request, actor, 'finance.tax_rule.create', 'fin_tax_rules', id, { rule_code: ruleCode, total_gst_pct: gstPct });
    const row = await env.DB.prepare(`SELECT * FROM fin_tax_rules WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: presentTaxRule(row) }, 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_tax_rules WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tax rule not found');
    const body = await readJson(request, 50_000);
    const errors = {};
    const nameEn = body.rule_name_en !== undefined ? cleanStr(body.rule_name_en, 160, { required: true }) : existing.rule_name_en;
    if (!nameEn) errors.rule_name_en = 'rule_name_en is required';
    const gstPct = body.total_gst_pct !== undefined ? Number(body.total_gst_pct) : Number(existing.total_gst_pct);
    if (!GST_SLABS.includes(gstPct)) errors.total_gst_pct = 'total_gst_pct must be 0, 5, 12, or 18';
    const regime = body.tax_regime !== undefined ? body.tax_regime : existing.tax_regime;
    if (!TAX_REGIMES.includes(regime)) errors.tax_regime = 'Invalid tax_regime';
    const scope = body.applicable_scope !== undefined ? body.applicable_scope : existing.applicable_scope;
    if (!TAX_SCOPES.includes(scope)) errors.applicable_scope = 'Invalid applicable_scope';
    const status = body.status !== undefined ? body.status : existing.status;
    if (!TAX_STATUSES.includes(status)) errors.status = 'Invalid status';
    if (Object.keys(errors).length) throw validationError(errors);

    const isDef = body.is_default !== undefined ? (body.is_default ? 1 : 0) : Number(existing.is_default);
    if (isDef) await env.DB.prepare(`UPDATE fin_tax_rules SET is_default = 0 WHERE id != ?`).bind(sub).run();

    await env.DB.prepare(
      `UPDATE fin_tax_rules SET rule_name_en=?, rule_name_or=?, tax_regime=?, hsn_sac_code=?, applicable_scope=?, home_state_code=?, total_gst_pct=?, cgst_pct=?, sgst_pct=?, igst_pct=?, is_tax_inclusive=?, is_default=?, status=?, updated_at=datetime('now') WHERE id = ?`
    ).bind(
      nameEn, body.rule_name_or !== undefined ? cleanStr(body.rule_name_or, 160) : existing.rule_name_or,
      regime, body.hsn_sac_code !== undefined ? cleanStr(body.hsn_sac_code, 12) : existing.hsn_sac_code,
      scope, body.home_state_code !== undefined ? cleanStr(body.home_state_code, 10) : existing.home_state_code,
      gstPct, gstPct / 2, gstPct / 2, gstPct,
      body.is_tax_inclusive !== undefined ? (body.is_tax_inclusive ? 1 : 0) : existing.is_tax_inclusive,
      isDef, status, sub
    ).run();

    await snapshotRevision(env, actor, '13', sub, cleanStr(body.change_note || 'Tax rule updated', 300));
    await audit(env, request, actor, 'finance.tax_rule.update', 'fin_tax_rules', sub, { total_gst_pct: gstPct, status });
    const row = await env.DB.prepare(`SELECT * FROM fin_tax_rules WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: presentTaxRule(row) });
  }

  if (method === 'DELETE' && sub) {
    const existing = await env.DB.prepare(`SELECT id FROM fin_tax_rules WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tax rule not found');
    await env.DB.prepare(`UPDATE fin_tax_rules SET status = 'archived', is_default = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '13', sub, 'Tax rule archived');
    await audit(env, request, actor, 'finance.tax_rule.archive', 'fin_tax_rules', sub, null);
    return json({ ok: true, status: 'archived' });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 14: Payouts & Settlements ----------
async function handleSettlements(request, env, actor, sub) {
  const method = request.method;
  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_payout_settlements WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Settlement not found');
      return json({ ok: true, item: decorateInr(row) });
    }
    const url = new URL(request.url);
    const st = url.searchParams.get('settlement_status');
    const gw = url.searchParams.get('gateway_key');
    const q = cleanStr(url.searchParams.get('q') || '', 80);
    const where = ['1=1']; const binds = [];
    if (st) { where.push('settlement_status = ?'); binds.push(st); }
    if (gw) { where.push('gateway_key = ?'); binds.push(gw); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(settlement_utr LIKE ? ESCAPE '\\' OR gateway_key LIKE ? ESCAPE '\\' OR bank_account_masked LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like);
    }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_payout_settlements WHERE ${where.join(' AND ')} ORDER BY created_at DESC`).bind(...binds).all();
    return json({ ok: true, items: (results || []).map(decorateInr) });
  }

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const errors = {};
    const utr = cleanStr(body.settlement_utr, 80, { required: true });
    if (!utr) errors.settlement_utr = 'settlement_utr is required';
    const gross = Number(body.gross_captured_paise ?? 0);
    const fee = Number(body.gateway_fee_paise ?? 0);
    const gstFee = Number(body.gst_on_fee_paise ?? Math.round(fee * 0.18));
    if (!Number.isInteger(gross) || gross < 0) errors.gross_captured_paise = 'gross_captured_paise must be integer >= 0';
    if (!Number.isInteger(fee) || fee < 0) errors.gateway_fee_paise = 'gateway_fee_paise must be integer >= 0';
    if (!Number.isInteger(gstFee) || gstFee < 0) errors.gst_on_fee_paise = 'gst_on_fee_paise must be integer >= 0';
    const net = body.net_settled_paise !== undefined ? Number(body.net_settled_paise) : (gross - fee - gstFee);
    if (!Number.isInteger(net) || net < 0) errors.net_settled_paise = 'net_settled_paise must be integer >= 0';
    const status = body.settlement_status || 'scheduled';
    if (!SETTLEMENT_STATUSES.includes(status)) errors.settlement_status = `settlement_status must be one of: ${SETTLEMENT_STATUSES.join(', ')}`;
    if (Object.keys(errors).length) throw validationError(errors);

    const dup = await env.DB.prepare(`SELECT id FROM fin_payout_settlements WHERE settlement_utr = ?`).bind(utr).first();
    if (dup) throw new HttpError(409, 'DUPLICATE_UTR', 'Settlement UTR already exists');

    const id = rid('fset');
    const settledAt = status === 'settled' ? (cleanStr(body.settled_at || '', 40) || new Date().toISOString()) : null;
    await env.DB.prepare(
      `INSERT INTO fin_payout_settlements (id, settlement_utr, gateway_key, period_start, period_end, gross_captured_paise, gateway_fee_paise, gst_on_fee_paise, net_settled_paise, txn_count, bank_account_masked, settlement_status, settled_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, utr, cleanStr(body.gateway_key || 'razorpay-live', 80),
      cleanStr(body.period_start || '', 20), cleanStr(body.period_end || '', 20),
      gross, fee, gstFee, net, Math.max(0, Math.trunc(Number(body.txn_count || 0))),
      cleanStr(body.bank_account_masked || 'SBI •••• 4821', 80), status, settledAt,
      cleanStr(body.notes || '', 500)
    ).run();

    await snapshotRevision(env, actor, '14', id, `Settlement recorded (${status})`);
    await audit(env, request, actor, 'finance.settlement.create', 'fin_payout_settlements', id, { utr, net_settled_paise: net, status });
    const row = await env.DB.prepare(`SELECT * FROM fin_payout_settlements WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: decorateInr(row) }, 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_payout_settlements WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Settlement not found');
    const body = await readJson(request, 50_000);
    const status = body.settlement_status !== undefined ? body.settlement_status : existing.settlement_status;
    if (!SETTLEMENT_STATUSES.includes(status)) throw validationError({ settlement_status: 'Invalid settlement_status' });

    const settledAt = status === 'settled' ? (existing.settled_at || new Date().toISOString()) : existing.settled_at;
    const notes = body.notes !== undefined ? cleanStr(body.notes, 500) : existing.notes;
    const bank = body.bank_account_masked !== undefined ? cleanStr(body.bank_account_masked, 80) : existing.bank_account_masked;

    await env.DB.prepare(
      `UPDATE fin_payout_settlements SET settlement_status = ?, settled_at = ?, notes = ?, bank_account_masked = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(status, settledAt, notes, bank, sub).run();

    await snapshotRevision(env, actor, '14', sub, cleanStr(body.change_note || `Settlement -> ${status}`, 300));
    await audit(env, request, actor, 'finance.settlement.update', 'fin_payout_settlements', sub, { status });
    const row = await env.DB.prepare(`SELECT * FROM fin_payout_settlements WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: decorateInr(row) });
  }

  if (method === 'DELETE' && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_payout_settlements WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Settlement not found');
    if (existing.settlement_status === 'settled') {
      throw new HttpError(409, 'SETTLEMENT_LOCKED', 'Settled bank payouts cannot be deleted');
    }
    await env.DB.prepare(`UPDATE fin_payout_settlements SET settlement_status = 'on_hold', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '14', sub, 'Placed on hold');
    await audit(env, request, actor, 'finance.settlement.hold', 'fin_payout_settlements', sub, null);
    return json({ ok: true, settlement_status: 'on_hold' });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 15: Reconciliation ----------
async function handleReconciliation(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'run' && method === 'POST') {
    const body = await readJson(request, 30_000);
    const gatewayKey = cleanStr(body.gateway_key || 'all', 80) || 'all';
    const pStart = cleanStr(body.period_start || '', 20);
    const pEnd = cleanStr(body.period_end || '', 20);

    const txWhere = [`t.txn_status = 'captured'`];
    const txBinds = [];
    if (gatewayKey !== 'all') { txWhere.push('t.gateway_key = ?'); txBinds.push(gatewayKey); }
    if (pStart) { txWhere.push('t.created_at >= ?'); txBinds.push(pStart); }
    if (pEnd) { txWhere.push('t.created_at <= ?'); txBinds.push(pEnd.length === 10 ? `${pEnd} 23:59:59` : pEnd); }

    const { results: txns } = await env.DB.prepare(
      `SELECT t.id, t.txn_reference, t.order_id, t.gateway_key, t.amount_paise, t.net_settled_paise, o.order_number, o.total_paise AS order_total_paise, o.payment_status AS order_payment_status
       FROM fin_transactions t LEFT JOIN fin_orders o ON o.id = t.order_id WHERE ${txWhere.join(' AND ')}`
    ).bind(...txBinds).all();

    const setWhere = [`settlement_status IN ('settled', 'processing')`];
    const setBinds = [];
    if (gatewayKey !== 'all') { setWhere.push('gateway_key = ?'); setBinds.push(gatewayKey); }
    const { results: settlements } = await env.DB.prepare(
      `SELECT gross_captured_paise, net_settled_paise FROM fin_payout_settlements WHERE ${setWhere.join(' AND ')}`
    ).bind(...setBinds).all();

    let expectedLedgerPaise = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;
    const discrepancies = [];

    for (const t of txns || []) {
      expectedLedgerPaise += Number(t.amount_paise || 0);
      if (!t.order_id || !t.order_number) {
        unmatchedCount++;
        discrepancies.push({
          txn_reference: t.txn_reference,
          order_number: 'UNLINKED',
          issue_type: 'missing_order_link',
          amount_paise: Number(t.amount_paise || 0),
          resolution_note: 'Captured transaction has no linked order'
        });
      } else if (t.order_payment_status !== 'paid' && t.order_payment_status !== 'partially_refunded') {
        unmatchedCount++;
        discrepancies.push({
          txn_reference: t.txn_reference,
          order_number: t.order_number,
          issue_type: 'order_status_mismatch',
          amount_paise: Number(t.amount_paise || 0),
          resolution_note: `Order status is ${t.order_payment_status} despite captured txn`
        });
      } else {
        matchedCount++;
      }
    }

    const gwReportedPaise = body.gateway_reported_paise !== undefined
      ? Math.max(0, Math.trunc(Number(body.gateway_reported_paise)))
      : expectedLedgerPaise;
    const settledBankPaise = (settlements || []).reduce((s, r) => s + Number(r.net_settled_paise || 0), 0);
    const variancePaise = gwReportedPaise - expectedLedgerPaise;
    if (variancePaise !== 0) {
      discrepancies.push({
        txn_reference: 'LEDGER-TOTAL',
        order_number: gatewayKey,
        issue_type: 'ledger_gateway_variance',
        amount_paise: variancePaise,
        resolution_note: 'Difference between gateway reported total and D1 captured ledger'
      });
    }

    const runStatus = discrepancies.length === 0 && variancePaise === 0 ? 'balanced' : 'variance_detected';
    const id = rid('frec');
    const year = new Date().getUTCFullYear();
    const cRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_reconciliation_runs`).first();
    const runCode = `REC-${year}-${String(Number(cRow?.n || 0) + 1).padStart(4, '0')}`;

    await env.DB.prepare(
      `INSERT INTO fin_reconciliation_runs (id, run_code, gateway_key, period_start, period_end, expected_ledger_paise, gateway_reported_paise, settled_bank_paise, variance_paise, matched_txn_count, unmatched_txn_count, discrepancy_items_json, run_status, reconciled_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, runCode, gatewayKey, pStart, pEnd, expectedLedgerPaise, gwReportedPaise, settledBankPaise,
      variancePaise, matchedCount, unmatchedCount, JSON.stringify(discrepancies), runStatus, actor.email || ''
    ).run();

    await snapshotRevision(env, actor, '15', id, `Reconciliation run (${runStatus})`);
    await audit(env, request, actor, 'finance.reconciliation.run', 'fin_reconciliation_runs', id, { run_code: runCode, run_status: runStatus, variance_paise: variancePaise });
    const row = await env.DB.prepare(`SELECT * FROM fin_reconciliation_runs WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: { ...decorateInr(row), discrepancy_items: discrepancies } }, 201);
  }

  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_reconciliation_runs WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Reconciliation run not found');
      return json({ ok: true, item: { ...decorateInr(row), discrepancy_items: parseJson(row.discrepancy_items_json, []) } });
    }
    const url = new URL(request.url);
    const st = url.searchParams.get('run_status');
    const where = st ? ['run_status = ?'] : ['1=1'];
    const binds = st ? [st] : [];
    const { results } = await env.DB.prepare(`SELECT * FROM fin_reconciliation_runs WHERE ${where.join(' AND ')} ORDER BY created_at DESC`).bind(...binds).all();
    return json({
      ok: true,
      items: (results || []).map(r => ({ ...decorateInr(r), discrepancy_items: parseJson(r.discrepancy_items_json, []) }))
    });
  }

  if (method === 'PATCH' && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_reconciliation_runs WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Reconciliation run not found');
    const body = await readJson(request, 30_000);
    const status = body.run_status || 'resolved';
    if (!RECON_STATUSES.includes(status)) throw validationError({ run_status: 'Invalid run_status' });
    const note = cleanStr(body.resolution_note || 'Marked resolved by finance admin', 300);
    const items = parseJson(existing.discrepancy_items_json, []).map(d => ({ ...d, resolution_note: note }));

    await env.DB.prepare(
      `UPDATE fin_reconciliation_runs SET run_status = ?, discrepancy_items_json = ?, reconciled_by = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(status, JSON.stringify(items), actor.email || existing.reconciled_by, sub).run();

    await snapshotRevision(env, actor, '15', sub, note);
    await audit(env, request, actor, 'finance.reconciliation.resolve', 'fin_reconciliation_runs', sub, { run_status: status });
    const row = await env.DB.prepare(`SELECT * FROM fin_reconciliation_runs WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: { ...decorateInr(row), discrepancy_items: items } });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 16: Finance Reports ----------
async function buildLiveReport(db, reportType, periodStart = '', periodEnd = '') {
  const dateFilter = (col) => {
    const w = []; const b = [];
    if (periodStart) { w.push(`${col} >= ?`); b.push(periodStart); }
    if (periodEnd) { w.push(`${col} <= ?`); b.push(periodEnd.length === 10 ? `${periodEnd} 23:59:59` : periodEnd); }
    return { sql: w.length ? ` AND ${w.join(' AND ')}` : '', binds: b };
  };

  if (reportType === 'gst_gstr1_summary') {
    const df = dateFilter('issued_at');
    const { results } = await db.prepare(
      `SELECT invoice_number, customer_name, customer_state, hsn_sac_code, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, status, issued_at FROM fin_invoices WHERE status != 'voided'${df.sql} ORDER BY issued_at DESC`
    ).bind(...df.binds).all();
    const rows = (results || []).map(decorateInr);
    const totals = rows.reduce((a, r) => ({
      taxable_paise: a.taxable_paise + Number(r.taxable_paise || 0),
      cgst_paise: a.cgst_paise + Number(r.cgst_paise || 0),
      sgst_paise: a.sgst_paise + Number(r.sgst_paise || 0),
      igst_paise: a.igst_paise + Number(r.igst_paise || 0),
      total_paise: a.total_paise + Number(r.total_paise || 0)
    }), { taxable_paise: 0, cgst_paise: 0, sgst_paise: 0, igst_paise: 0, total_paise: 0 });
    return { report_type: reportType, columns: ['invoice_number', 'customer_name', 'customer_state', 'hsn_sac_code', 'taxable_inr', 'cgst_inr', 'sgst_inr', 'igst_inr', 'total_inr'], rows, summary: decorateInr({ invoices_count: rows.length, ...totals }) };
  }

  if (reportType === 'revenue_by_product') {
    const df = dateFilter('created_at');
    const { results } = await db.prepare(
      `SELECT order_type, COUNT(*) AS orders_count, SUM(subtotal_paise) AS subtotal_paise, SUM(discount_paise) AS discount_paise, SUM(tax_paise) AS tax_paise, SUM(total_paise) AS total_paise FROM fin_orders WHERE payment_status = 'paid'${df.sql} GROUP BY order_type ORDER BY total_paise DESC`
    ).bind(...df.binds).all();
    const rows = (results || []).map(decorateInr);
    const totalPaise = rows.reduce((s, r) => s + Number(r.total_paise || 0), 0);
    return { report_type: reportType, columns: ['order_type', 'orders_count', 'subtotal_inr', 'discount_inr', 'tax_inr', 'total_inr'], rows, summary: decorateInr({ categories: rows.length, total_paise: totalPaise }) };
  }

  if (reportType === 'gateway_settlement_ledger') {
    const { results } = await db.prepare(
      `SELECT settlement_utr, gateway_key, period_start, period_end, gross_captured_paise, gateway_fee_paise, gst_on_fee_paise, net_settled_paise, settlement_status, bank_account_masked FROM fin_payout_settlements ORDER BY created_at DESC`
    ).all();
    const rows = (results || []).map(decorateInr);
    const settledPaise = rows.filter(r => r.settlement_status === 'settled').reduce((s, r) => s + Number(r.net_settled_paise || 0), 0);
    return { report_type: reportType, columns: ['settlement_utr', 'gateway_key', 'gross_captured_inr', 'gateway_fee_inr', 'gst_on_fee_inr', 'net_settled_inr', 'settlement_status', 'bank_account_masked'], rows, summary: decorateInr({ count: rows.length, settled_paise: settledPaise }) };
  }

  if (reportType === 'refund_chargeback_register') {
    const { results } = await db.prepare(
      `SELECT case_number, case_type, customer_name, amount_paise, reason_code, case_status, gateway_refund_id, created_at FROM fin_refunds_disputes ORDER BY created_at DESC`
    ).all();
    const rows = (results || []).map(decorateInr);
    const totalPaise = rows.reduce((s, r) => s + Number(r.amount_paise || 0), 0);
    return { report_type: reportType, columns: ['case_number', 'case_type', 'customer_name', 'amount_inr', 'reason_code', 'case_status', 'gateway_refund_id'], rows, summary: decorateInr({ cases_count: rows.length, total_paise: totalPaise }) };
  }

  // donation_80g_ledger
  const { results } = await db.prepare(
    `SELECT e.receipt_number, e.donor_name, e.donor_city, e.amount_paise, e.payment_method, e.txn_reference, e.status, c.title_en AS campaign_title FROM fin_donation_entries e LEFT JOIN fin_donation_campaigns c ON c.id = e.campaign_id ORDER BY e.created_at DESC`
  ).all();
  const rows = (results || []).map(decorateInr);
  const totalPaise = rows.filter(r => r.status === 'completed').reduce((s, r) => s + Number(r.amount_paise || 0), 0);
  return { report_type: reportType, columns: ['receipt_number', 'donor_name', 'donor_city', 'campaign_title', 'amount_inr', 'payment_method', 'status'], rows, summary: decorateInr({ donors_count: rows.length, total_paise: totalPaise }) };
}

function toCsv(columns, rows) {
  const esc = v => {
    const s = String(v === undefined || v === null ? '' : v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map(r => columns.map(c => esc(r[c])).join(','))].join('\n');
}

async function handleReports(request, env, actor, sub) {
  const method = request.method;
  const url = new URL(request.url);
  const reportType = REPORT_TYPES.includes(url.searchParams.get('report_type')) ? url.searchParams.get('report_type') : 'gst_gstr1_summary';
  const pStart = cleanStr(url.searchParams.get('period_start') || '', 20);
  const pEnd = cleanStr(url.searchParams.get('period_end') || '', 20);

  if (sub === 'export' && method === 'GET') {
    const fmt = url.searchParams.get('format') === 'json' ? 'json' : 'csv';
    const live = await buildLiveReport(env.DB, reportType, pStart, pEnd);
    const filename = `csodisha-${reportType}-${new Date().toISOString().slice(0, 10)}.${fmt}`;
    if (fmt === 'json') {
      return new Response(JSON.stringify({ ok: true, ...live }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store'
        }
      });
    }
    return new Response(toCsv(live.columns, live.rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  }

  if (method === 'GET') {
    const live = await buildLiveReport(env.DB, reportType, pStart, pEnd);
    const { results } = await env.DB.prepare(`SELECT * FROM fin_saved_reports ORDER BY created_at DESC LIMIT 100`).all();
    const saved = (results || []).map(r => ({ ...r, summary_metrics: parseJson(r.summary_metrics_json, {}) }));
    return json({ ok: true, live_report: live, saved_reports: saved });
  }

  if (method === 'POST' && !sub) {
    const body = await readJson(request, 30_000);
    const rType = REPORT_TYPES.includes(body.report_type) ? body.report_type : 'gst_gstr1_summary';
    const live = await buildLiveReport(env.DB, rType, cleanStr(body.period_start || '', 20), cleanStr(body.period_end || '', 20));
    const id = rid('frpt');
    const code = `RPT-${rType.slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const titleEn = cleanStr(body.title_en || `${rType.replace(/_/g, ' ').toUpperCase()} Snapshot`, 180);

    await env.DB.prepare(
      `INSERT INTO fin_saved_reports (id, report_code, report_type, title_en, title_or, period_start, period_end, summary_metrics_json, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, code, rType, titleEn, cleanStr(body.title_or || '', 180),
      cleanStr(body.period_start || '', 20), cleanStr(body.period_end || '', 20),
      JSON.stringify(live.summary), actor.email || ''
    ).run();

    await audit(env, request, actor, 'finance.report.snapshot', 'fin_saved_reports', id, { report_type: rType, report_code: code });
    const row = await env.DB.prepare(`SELECT * FROM fin_saved_reports WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: { ...row, summary_metrics: parseJson(row.summary_metrics_json, {}) } }, 201);
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Router Entry ----------
export async function handlePaymentsFinanceBatch4Admin(request, env, actor, id, sub) {
  if (!['overview', 'tax-rules', 'settlements', 'reconciliation', 'reports'].includes(id)) return null;
  await ensurePaymentsFinanceBatch4Schema(env.DB);

  if (id === 'overview') {
    if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    const [b1, b2, b3, b4] = await Promise.all([
      getPaymentsFinanceOverview(env),
      getPaymentsFinanceBatch2Overview(env),
      getPaymentsFinanceBatch3Overview(env),
      getPaymentsFinanceBatch4Overview(env)
    ]);
    return json({ ...b1, ...b2, ...b3, ...b4, modules: { ...b1.modules, ...b2.modules, ...b3.modules, ...b4.modules } });
  }
  if (id === 'tax-rules') return handleTaxRules(request, env, actor, sub);
  if (id === 'settlements') return handleSettlements(request, env, actor, sub);
  if (id === 'reconciliation') return handleReconciliation(request, env, actor, sub);
  if (id === 'reports') return handleReports(request, env, actor, sub);
  return null;
}
