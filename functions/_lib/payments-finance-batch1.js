// Payments & Finance Batch 1 (v91): Modules 01-04
// 01 Payment Overview | 02 Payment Gateway Settings | 03 Transactions | 04 Orders
// Raw gateway secrets are NEVER stored or returned: only a masked hint is persisted.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';

export const PROVIDER_KEYS = ['razorpay', 'cashfree', 'phonepe_upi', 'paytm_business', 'stripe', 'manual_upi_qr'];
export const ENV_MODES = ['test_sandbox', 'live_production'];
export const HEALTH_STATUSES = ['connected', 'sandbox_ready', 'disabled'];
export const RECORD_STATUSES = ['draft', 'published', 'archived'];
export const PAY_METHODS = ['upi', 'card', 'netbanking', 'wallet', 'manual_bank'];
export const TXN_STATUSES = ['initiated', 'authorized', 'captured', 'failed', 'refunded'];
export const ORDER_TYPES = ['study_pack', 'mock_test_series', 'membership', 'ebook', 'donation'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];
export const FULFILLMENT_STATUSES = ['unfulfilled', 'access_granted', 'cancelled'];
const GW_METHODS = ['upi', 'cards', 'netbanking', 'wallet'];

const GW_COLS = ['slug', 'provider_key', 'display_name_en', 'display_name_or', 'environment_mode', 'merchant_id_or_key_id',
  'secret_masked_hint', 'webhook_endpoint_path', 'supported_methods_json', 'currency_code', 'convenience_fee_pct',
  'is_primary', 'health_status', 'priority_order', 'status'];
const ORD_COLS = ['order_number', 'customer_name', 'customer_email', 'customer_phone', 'customer_state', 'user_id', 'order_type',
  'items_json', 'subtotal_paise', 'discount_paise', 'tax_paise', 'total_paise', 'currency_code', 'coupon_code',
  'payment_status', 'fulfillment_status', 'notes'];
const TXN_COLS = ['txn_reference', 'order_id', 'gateway_key', 'gateway_payment_id', 'gateway_order_id', 'payment_method',
  'upi_vpa_or_last4', 'amount_paise', 'gateway_fee_paise', 'net_settled_paise', 'currency_code', 'txn_status',
  'failure_reason', 'captured_at'];
const REV_TABLES = {
  '02': { table: 'fin_gateways', cols: GW_COLS },
  '03': { table: 'fin_transactions', cols: TXN_COLS },
  '04': { table: 'fin_orders', cols: ORD_COLS }
};

const _finReady = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function intPaise(v, field, errors, { min = 0, required = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) errors[field] = `${field} is required`;
    return 0;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min) {
    errors[field] = `${field} must be an integer paise amount >= ${min}`;
    return 0;
  }
  return n;
}

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) { errors[field] = `${field} must be one of: ${allowed.join(', ')}`; return def; }
  return val;
}

/** Mask a raw secret / key id: keeps only a short prefix and last 4 chars. Raw value is discarded. */
export function maskSecret(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.length <= 6) return '••••';
  return `${s.slice(0, 4)}••••••${s.slice(-4)}`;
}

/** Strip anything secret-like before sending a gateway row to a client. */
function publicGateway(row) {
  if (!row) return row;
  const out = { ...row };
  delete out.secret;
  delete out.secret_key;
  out.supported_methods = parseJson(row.supported_methods_json, []);
  out.is_primary = Number(row.is_primary || 0) === 1;
  return out;
}

function publicOrder(row) {
  return row ? { ...row, items: parseJson(row.items_json, []) } : row;
}

export function computeOrderTotals(items, discountPaise = 0) {
  let subtotal = 0; let tax = 0;
  for (const it of items) {
    const line = it.qty * it.unit_price_paise;
    subtotal += line;
    tax += Math.round(line * (it.gst_rate_pct || 0) / 100);
  }
  const discount = Math.min(Math.max(0, discountPaise), subtotal);
  const taxAdj = subtotal > 0 ? Math.round(tax * (subtotal - discount) / subtotal) : 0;
  return { subtotal_paise: subtotal, discount_paise: discount, tax_paise: taxAdj, total_paise: subtotal - discount + taxAdj };
}

function feeFor(method, gatewayKey, amount) {
  if (gatewayKey === 'manual_upi_qr' || method === 'manual_bank' || method === 'upi') return 0;
  return Math.round(amount * 0.02);
}

// ---------- Schema ----------
export async function ensurePaymentsFinanceBatch1Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  if (_finReady.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS fin_gateways (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      provider_key TEXT NOT NULL DEFAULT 'razorpay' CHECK (provider_key IN ('razorpay','cashfree','phonepe_upi','paytm_business','stripe','manual_upi_qr')),
      display_name_en TEXT NOT NULL,
      display_name_or TEXT NOT NULL DEFAULT '',
      environment_mode TEXT NOT NULL DEFAULT 'test_sandbox' CHECK (environment_mode IN ('test_sandbox','live_production')),
      merchant_id_or_key_id TEXT NOT NULL DEFAULT '',
      secret_masked_hint TEXT NOT NULL DEFAULT '',
      webhook_endpoint_path TEXT NOT NULL DEFAULT '',
      supported_methods_json TEXT NOT NULL DEFAULT '["upi","cards","netbanking","wallet"]',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      convenience_fee_pct REAL NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      health_status TEXT NOT NULL DEFAULT 'sandbox_ready' CHECK (health_status IN ('connected','sandbox_ready','disabled')),
      priority_order INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_gateways_status ON fin_gateways(status, priority_order)`,
    `CREATE TABLE IF NOT EXISTS fin_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      customer_state TEXT NOT NULL DEFAULT 'Odisha',
      user_id TEXT,
      order_type TEXT NOT NULL DEFAULT 'study_pack' CHECK (order_type IN ('study_pack','mock_test_series','membership','ebook','donation')),
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotal_paise INTEGER NOT NULL DEFAULT 0,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL DEFAULT 0,
      currency_code TEXT NOT NULL DEFAULT 'INR',
      coupon_code TEXT NOT NULL DEFAULT '',
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded','partially_refunded')),
      fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled','access_granted','cancelled')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_orders_status ON fin_orders(payment_status, fulfillment_status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS fin_transactions (
      id TEXT PRIMARY KEY,
      txn_reference TEXT NOT NULL UNIQUE,
      order_id TEXT REFERENCES fin_orders(id) ON DELETE SET NULL,
      gateway_key TEXT NOT NULL DEFAULT '',
      gateway_payment_id TEXT NOT NULL DEFAULT '',
      gateway_order_id TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi','card','netbanking','wallet','manual_bank')),
      upi_vpa_or_last4 TEXT NOT NULL DEFAULT '',
      amount_paise INTEGER NOT NULL DEFAULT 0,
      gateway_fee_paise INTEGER NOT NULL DEFAULT 0,
      net_settled_paise INTEGER NOT NULL DEFAULT 0,
      currency_code TEXT NOT NULL DEFAULT 'INR',
      txn_status TEXT NOT NULL DEFAULT 'initiated' CHECK (txn_status IN ('initiated','authorized','captured','failed','refunded')),
      failure_reason TEXT NOT NULL DEFAULT '',
      captured_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_txn_status ON fin_transactions(txn_status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_fin_txn_order ON fin_transactions(order_id)`,
    `CREATE TABLE IF NOT EXISTS fin_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL DEFAULT 1,
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_rev_entity ON fin_revisions(module_code, entity_id, version_num DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  await seedFinance(db);
  _finReady.add(db);
}

async function seedFinance(db) {
  const gcnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_gateways`).first();
  if (!gcnt || Number(gcnt.n || 0) === 0) {
    const gws = [
      ['fgw-rzp-live', 'razorpay-live', 'razorpay', 'Razorpay (Live)', 'ରେଜରପେ (ଲାଇଭ)', 'live_production', 'rzp_live_CSOdisha01', 'rzp_live_••••••h7Qa', '/api/webhooks/razorpay', 2.0, 1, 'connected', 10, 'published'],
      ['fgw-rzp-test', 'razorpay-sandbox', 'razorpay', 'Razorpay (Sandbox)', 'ରେଜରପେ (ସ୍ୟାଣ୍ଡବକ୍ସ)', 'test_sandbox', 'rzp_test_CSOdisha01', 'rzp_••••••x2Lm', '/api/webhooks/razorpay-test', 0, 0, 'sandbox_ready', 20, 'published'],
      ['fgw-upi-qr', 'manual-upi-qr', 'manual_upi_qr', 'Manual UPI QR (csodisha@okaxis)', 'ମାନୁଆଲ UPI QR', 'live_production', 'csodisha@okaxis', '', '/api/webhooks/manual-upi', 0, 0, 'connected', 30, 'published'],
      ['fgw-cashfree', 'cashfree-sandbox', 'cashfree', 'Cashfree Payments (Sandbox)', 'କ୍ୟାସଫ୍ରି', 'test_sandbox', 'CF_TEST_CSO01', 'CF_T••••••9aKd', '/api/webhooks/cashfree', 1.9, 0, 'sandbox_ready', 40, 'draft']
    ];
    for (const g of gws) {
      await db.prepare(
        `INSERT OR IGNORE INTO fin_gateways (id, slug, provider_key, display_name_en, display_name_or, environment_mode, merchant_id_or_key_id, secret_masked_hint, webhook_endpoint_path, supported_methods_json, convenience_fee_pct, is_primary, health_status, priority_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '["upi","cards","netbanking","wallet"]', ?, ?, ?, ?, ?)`
      ).bind(...g).run();
    }
  }

  const ocnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_orders`).first();
  if (!ocnt || Number(ocnt.n || 0) === 0) {
    const item = (type, id, title, qty, price, gst) => ({ item_type: type, item_id: id, title_en: title, qty, unit_price_paise: price, gst_rate_pct: gst });
    const orders = [
      ['ford-001', 'CSO-ORD-2026-0001', 'Sasmita Mohanty', 'sasmita.mohanty@example.com', '9437012345', 'Odisha', 'mock_test_series', [item('mock_test_series', 'mts-opsc-oas', 'OPSC OAS Prelims Mock Test Series (30 Tests)', 1, 49900, 18)], 5000, 'ODISHA10', 'paid', 'access_granted'],
      ['ford-002', 'CSO-ORD-2026-0002', 'Biswajit Panda', 'biswajit.panda@example.com', '9861098765', 'Odisha', 'study_pack', [item('study_pack', 'sp-odisha-gk', 'Odisha GK Complete Study Pack', 1, 29900, 5), item('ebook', 'eb-oas-ca', 'OAS Current Affairs 2026 e-Book', 1, 9900, 0)], 0, '', 'paid', 'unfulfilled'],
      ['ford-003', 'CSO-ORD-2026-0003', 'Lipsa Behera', 'lipsa.behera@example.com', '9178055501', 'Odisha', 'membership', [item('membership', 'mem-pro-annual', 'CSOdisha Pro Annual Membership', 1, 99900, 18)], 0, '', 'paid', 'access_granted'],
      ['ford-004', 'CSO-ORD-2026-0004', 'Subhashree Nayak', 'subhashree.nayak@example.com', '9556012399', 'Odisha', 'mock_test_series', [item('mock_test_series', 'mts-ossc-cgl', 'OSSC CGL Mock Test Series (20 Tests)', 1, 39900, 18)], 0, '', 'failed', 'unfulfilled'],
      ['ford-005', 'CSO-ORD-2026-0005', 'Rakesh Dash', 'rakesh.dash@example.com', '9777044410', 'Odisha', 'study_pack', [item('study_pack', 'sp-osssc-cre', 'OSSSC RI/ARI/AMIN Study Pack', 1, 24900, 5)], 0, '', 'pending', 'unfulfilled']
    ];
    const totalsById = {};
    for (const o of orders) {
      const t = computeOrderTotals(o[7], o[8]);
      totalsById[o[0]] = t;
      await db.prepare(
        `INSERT OR IGNORE INTO fin_orders (id, order_number, customer_name, customer_email, customer_phone, customer_state, order_type, items_json, subtotal_paise, discount_paise, tax_paise, total_paise, coupon_code, payment_status, fulfillment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(o[0], o[1], o[2], o[3], o[4], o[5], o[6], JSON.stringify(o[7]), t.subtotal_paise, t.discount_paise, t.tax_paise, t.total_paise, o[9], o[10], o[11]).run();
    }
    const txns = [
      ['ftxn-001', 'TXN-RZP-20260001', 'ford-001', 'razorpay-live', 'pay_Odi26A001', 'order_Odi26A001', 'upi', 'sasmita@okicici', 'captured'],
      ['ftxn-002', 'TXN-RZP-20260002', 'ford-002', 'razorpay-live', 'pay_Odi26A002', 'order_Odi26A002', 'card', '4242', 'captured'],
      ['ftxn-003', 'TXN-RZP-20260003', 'ford-003', 'razorpay-live', 'pay_Odi26A003', 'order_Odi26A003', 'upi', 'lipsa.b@oksbi', 'captured'],
      ['ftxn-004', 'TXN-RZP-20260004', 'ford-004', 'razorpay-live', 'pay_Odi26A004', 'order_Odi26A004', 'card', '1881', 'failed'],
      ['ftxn-005', 'TXN-RZP-20260005', 'ford-005', 'razorpay-live', 'pay_Odi26A005', 'order_Odi26A005', 'upi', 'rakesh.dash@ybl', 'authorized']
    ];
    for (const t of txns) {
      const amt = totalsById[t[2]].total_paise;
      const fee = t[8] === 'captured' ? feeFor(t[6], t[3], amt) : 0;
      const net = t[8] === 'captured' ? amt - fee : 0;
      await db.prepare(
        `INSERT OR IGNORE INTO fin_transactions (id, txn_reference, order_id, gateway_key, gateway_payment_id, gateway_order_id, payment_method, upi_vpa_or_last4, amount_paise, gateway_fee_paise, net_settled_paise, txn_status, failure_reason, captured_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], amt, fee, net, t[8],
        t[8] === 'failed' ? 'Card declined by issuing bank' : '', t[8] === 'captured' ? new Date().toISOString() : null).run();
    }
  }
}

// ---------- Revisions ----------
async function snapshotRevision(env, actor, moduleCode, entityId, note) {
  const def = REV_TABLES[moduleCode];
  const row = await env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).bind(entityId).first();
  if (!row) return null;
  const snap = {};
  for (const c of def.cols) snap[c] = row[c];
  const last = await env.DB.prepare(`SELECT MAX(version_num) AS v FROM fin_revisions WHERE module_code = ? AND entity_id = ?`).bind(moduleCode, entityId).first();
  const ver = Number(last?.v || 0) + 1;
  await env.DB.prepare(
    `INSERT INTO fin_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(rid('frev'), moduleCode, entityId, ver, JSON.stringify(snap), String(note || '').slice(0, 300), actor?.email || '').run();
  return ver;
}

async function handleRevisions(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'rollback' && method === 'POST') {
    const body = await readJson(request, 20_000);
    const rev = await env.DB.prepare(`SELECT * FROM fin_revisions WHERE id = ?`).bind(cleanStr(body.revision_id, 100)).first();
    if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
    const def = REV_TABLES[rev.module_code];
    if (!def) throw new HttpError(400, 'UNSUPPORTED', 'Module does not support rollback');
    const snap = parseJson(rev.snapshot_json, {});
    const sets = def.cols.map(c => `${c} = ?`).join(', ');
    const res = await env.DB.prepare(`UPDATE ${def.table} SET ${sets}${def.table === 'fin_transactions' ? '' : `, updated_at = datetime('now')`} WHERE id = ?`)
      .bind(...def.cols.map(c => (snap[c] === undefined ? null : snap[c])), rev.entity_id).run();
    if (res.meta && res.meta.changes === 0) throw new HttpError(404, 'NOT_FOUND', 'Entity no longer exists');
    if (def.table === 'fin_gateways' && Number(snap.is_primary) === 1) {
      await env.DB.prepare(`UPDATE fin_gateways SET is_primary = 0 WHERE id != ?`).bind(rev.entity_id).run();
    }
    const ver = await snapshotRevision(env, actor, rev.module_code, rev.entity_id, `Rollback to v${rev.version_num}`);
    await audit(env, request, actor, 'finance.rollback', def.table, rev.entity_id, { to_version: rev.version_num, new_version: ver });
    return json({ ok: true, module_code: rev.module_code, entity_id: rev.entity_id, restored_version: rev.version_num, version_num: ver });
  }
  if (method === 'GET') {
    const url = new URL(request.url);
    const mod = url.searchParams.get('module_code') || '';
    const ent = url.searchParams.get('entity_id') || '';
    const where = ['1=1']; const binds = [];
    if (mod) { where.push('module_code = ?'); binds.push(mod); }
    if (ent) { where.push('entity_id = ?'); binds.push(ent); }
    const { results } = await env.DB.prepare(`SELECT id, module_code, entity_id, version_num, change_note, created_by, created_at FROM fin_revisions WHERE ${where.join(' AND ')} ORDER BY created_at DESC, version_num DESC LIMIT 100`).bind(...binds).all();
    return json({ ok: true, items: results || [] });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 01: Overview ----------
export async function getPaymentsFinanceOverview(env) {
  await ensurePaymentsFinanceBatch1Schema(env.DB);
  const [txRes, ordRes, gwRes, recentOrd, recentTx] = await Promise.all([
    env.DB.prepare(`SELECT txn_status, payment_method, amount_paise, net_settled_paise FROM fin_transactions`).all(),
    env.DB.prepare(`SELECT payment_status, fulfillment_status FROM fin_orders`).all(),
    env.DB.prepare(`SELECT status, health_status FROM fin_gateways`).all(),
    env.DB.prepare(`SELECT id, order_number, customer_name, order_type, total_paise, payment_status, fulfillment_status, created_at FROM fin_orders ORDER BY created_at DESC, order_number DESC LIMIT 5`).all(),
    env.DB.prepare(`SELECT id, txn_reference, gateway_key, payment_method, amount_paise, txn_status, created_at FROM fin_transactions ORDER BY created_at DESC, txn_reference DESC LIMIT 5`).all()
  ]);
  const txs = txRes.results || [];
  const orders = ordRes.results || [];
  const gws = gwRes.results || [];
  const captured = txs.filter(t => t.txn_status === 'captured');
  const failed = txs.filter(t => t.txn_status === 'failed');
  const gross = captured.reduce((s, t) => s + Number(t.amount_paise || 0), 0);
  const net = captured.reduce((s, t) => s + Number(t.net_settled_paise || 0), 0);
  const methods = {};
  for (const t of captured) {
    const m = methods[t.payment_method] || (methods[t.payment_method] = { count: 0, amount_paise: 0 });
    m.count++; m.amount_paise += Number(t.amount_paise || 0);
  }
  const breakdown = Object.entries(methods).map(([method, v]) => ({
    method, count: v.count, amount_paise: v.amount_paise, share_pct: gross ? Number((v.amount_paise * 100 / gross).toFixed(1)) : 0
  })).sort((a, b) => b.amount_paise - a.amount_paise);
  const activeGw = gws.filter(g => g.status === 'published' && g.health_status !== 'disabled').length;
  const attempts = txs.length;
  return {
    ok: true,
    gross_revenue_paise: gross,
    net_settled_paise: net,
    captured_count: captured.length,
    failed_count: failed.length,
    conversion_rate_pct: attempts ? Number((captured.length * 100 / attempts).toFixed(1)) : 0,
    pending_orders: orders.filter(o => o.payment_status === 'pending').length,
    active_gateways: activeGw,
    total_gateways: gws.length,
    gateway_health: activeGw > 0 ? 'healthy' : 'degraded',
    payment_method_breakdown: breakdown,
    recent_orders: recentOrd.results || [],
    recent_transactions: recentTx.results || [],
    modules: {
      '01': attempts,
      '02': gws.length,
      '03': txs.length,
      '04': orders.length
    }
  };
}

// ---------- Module 02: Gateways ----------
function readGatewayBody(body, existing, errors) {
  const g = {};
  g.provider_key = pick(body.provider_key, PROVIDER_KEYS, 'provider_key', errors, existing?.provider_key || 'razorpay');
  g.display_name_en = body.display_name_en !== undefined ? cleanStr(body.display_name_en, 120, { required: true }) : existing?.display_name_en;
  if (!g.display_name_en) errors.display_name_en = 'display_name_en is required';
  g.display_name_or = body.display_name_or !== undefined ? cleanStr(body.display_name_or, 120) : (existing?.display_name_or || '');
  g.environment_mode = pick(body.environment_mode, ENV_MODES, 'environment_mode', errors, existing?.environment_mode || 'test_sandbox');
  g.merchant_id_or_key_id = body.merchant_id_or_key_id !== undefined ? cleanStr(body.merchant_id_or_key_id, 120) : (existing?.merchant_id_or_key_id || '');
  g.webhook_endpoint_path = body.webhook_endpoint_path !== undefined ? cleanStr(body.webhook_endpoint_path, 200) : (existing?.webhook_endpoint_path || '');
  if (g.webhook_endpoint_path && !/^\/[A-Za-z0-9/_\-.]*$/.test(g.webhook_endpoint_path)) errors.webhook_endpoint_path = 'Webhook path must be a relative path starting with /';
  let methods = existing ? parseJson(existing.supported_methods_json, []) : GW_METHODS;
  if (body.supported_methods !== undefined) {
    if (!Array.isArray(body.supported_methods) || body.supported_methods.some(m => !GW_METHODS.includes(m))) errors.supported_methods = `supported_methods must be a subset of ${GW_METHODS.join(', ')}`;
    else methods = [...new Set(body.supported_methods)];
  }
  g.supported_methods_json = JSON.stringify(methods);
  g.currency_code = 'INR';
  const fee = body.convenience_fee_pct !== undefined ? Number(body.convenience_fee_pct) : Number(existing?.convenience_fee_pct || 0);
  if (!Number.isFinite(fee) || fee < 0 || fee > 10) errors.convenience_fee_pct = 'convenience_fee_pct must be between 0 and 10';
  g.convenience_fee_pct = fee;
  g.priority_order = body.priority_order !== undefined ? Math.trunc(Number(body.priority_order)) : Number(existing?.priority_order ?? 100);
  if (!Number.isFinite(g.priority_order)) errors.priority_order = 'priority_order must be a number';
  g.status = pick(body.status, RECORD_STATUSES, 'status', errors, existing?.status || 'draft');
  g.is_primary = body.is_primary !== undefined ? (body.is_primary ? 1 : 0) : Number(existing?.is_primary || 0);
  const modeDefault = g.environment_mode === 'live_production' ? 'connected' : 'sandbox_ready';
  g.health_status = pick(body.health_status, HEALTH_STATUSES, 'health_status', errors, existing?.health_status || modeDefault);
  // Raw secret is accepted write-only: only a masked hint survives.
  const rawSecret = body.secret_key ?? body.secret;
  g.secret_masked_hint = rawSecret !== undefined && String(rawSecret).trim() ? maskSecret(rawSecret) : (existing?.secret_masked_hint || '');
  return g;
}

async function gatewayPing(request, env, actor) {
  const body = await readJson(request, 20_000);
  const gw = await env.DB.prepare(`SELECT * FROM fin_gateways WHERE id = ? OR slug = ?`).bind(cleanStr(body.id || '', 100), cleanStr(body.id || '', 100)).first();
  if (!gw) throw new HttpError(404, 'NOT_FOUND', 'Gateway not found');
  const manual = gw.provider_key === 'manual_upi_qr';
  const checks = [
    { check: 'merchant_id_configured', ok: !!gw.merchant_id_or_key_id },
    { check: 'secret_configured', ok: manual || !!gw.secret_masked_hint },
    { check: 'webhook_path_configured', ok: !!gw.webhook_endpoint_path && gw.webhook_endpoint_path.startsWith('/') },
    { check: 'currency_inr', ok: gw.currency_code === 'INR' },
    { check: 'published', ok: gw.status === 'published' }
  ];
  const ready = checks.every(c => c.ok);
  const health = !ready ? (gw.status === 'archived' ? 'disabled' : gw.health_status) : (gw.environment_mode === 'live_production' ? 'connected' : 'sandbox_ready');
  await env.DB.prepare(`UPDATE fin_gateways SET health_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(health, gw.id).run();
  await audit(env, request, actor, 'finance.gateway.ping', 'fin_gateways', gw.id, { ready, health });
  return json({ ok: true, ready, webhook_ready: checks[2].ok, health_status: health, checks });
}

async function handleGateways(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'ping') {
    if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    return gatewayPing(request, env, actor);
  }
  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_gateways WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Gateway not found');
      return json({ ok: true, item: publicGateway(row) });
    }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_gateways ORDER BY priority_order ASC, created_at ASC`).all();
    return json({ ok: true, items: (results || []).map(publicGateway) });
  }
  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const errors = {};
    const g = readGatewayBody(body, null, errors);
    let slug = cleanStr(body.slug || g.display_name_en || '', 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug) errors.slug = 'slug is required';
    if (Object.keys(errors).length) throw validationError(errors);
    const dup = await env.DB.prepare(`SELECT id FROM fin_gateways WHERE slug = ?`).bind(slug).first();
    if (dup) throw new HttpError(409, 'DUPLICATE_SLUG', 'A gateway with this slug already exists');
    const id = rid('fgw');
    if (g.is_primary) await env.DB.prepare(`UPDATE fin_gateways SET is_primary = 0`).run();
    await env.DB.prepare(
      `INSERT INTO fin_gateways (id, slug, provider_key, display_name_en, display_name_or, environment_mode, merchant_id_or_key_id, secret_masked_hint, webhook_endpoint_path, supported_methods_json, currency_code, convenience_fee_pct, is_primary, health_status, priority_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, slug, g.provider_key, g.display_name_en, g.display_name_or, g.environment_mode, g.merchant_id_or_key_id, g.secret_masked_hint, g.webhook_endpoint_path, g.supported_methods_json, g.currency_code, g.convenience_fee_pct, g.is_primary, g.health_status, g.priority_order, g.status).run();
    await snapshotRevision(env, actor, '02', id, 'Gateway created');
    await audit(env, request, actor, 'finance.gateway.create', 'fin_gateways', id, { slug, provider_key: g.provider_key });
    const row = await env.DB.prepare(`SELECT * FROM fin_gateways WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: publicGateway(row) }, 201);
  }
  if ((method === 'PUT' || method === 'PATCH') && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_gateways WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Gateway not found');
    const body = await readJson(request, 50_000);
    const errors = {};
    const g = readGatewayBody(body, existing, errors);
    if (Object.keys(errors).length) throw validationError(errors);
    if (g.is_primary) await env.DB.prepare(`UPDATE fin_gateways SET is_primary = 0 WHERE id != ?`).bind(sub).run();
    await env.DB.prepare(
      `UPDATE fin_gateways SET provider_key=?, display_name_en=?, display_name_or=?, environment_mode=?, merchant_id_or_key_id=?, secret_masked_hint=?, webhook_endpoint_path=?, supported_methods_json=?, convenience_fee_pct=?, is_primary=?, health_status=?, priority_order=?, status=?, updated_at=datetime('now') WHERE id = ?`
    ).bind(g.provider_key, g.display_name_en, g.display_name_or, g.environment_mode, g.merchant_id_or_key_id, g.secret_masked_hint, g.webhook_endpoint_path, g.supported_methods_json, g.convenience_fee_pct, g.is_primary, g.health_status, g.priority_order, g.status, sub).run();
    await snapshotRevision(env, actor, '02', sub, cleanStr(body.change_note || 'Gateway updated', 300));
    await audit(env, request, actor, 'finance.gateway.update', 'fin_gateways', sub, { fields: Object.keys(body).filter(k => k !== 'secret_key' && k !== 'secret') });
    const row = await env.DB.prepare(`SELECT * FROM fin_gateways WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: publicGateway(row) });
  }
  if (method === 'DELETE' && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_gateways WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Gateway not found');
    // Soft-archive keeps historic transactions resolvable and revision history intact.
    await env.DB.prepare(`UPDATE fin_gateways SET status = 'archived', health_status = 'disabled', is_primary = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '02', sub, 'Gateway archived');
    await audit(env, request, actor, 'finance.gateway.archive', 'fin_gateways', sub, null);
    return json({ ok: true, status: 'archived' });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 03: Transactions ----------
async function syncOrderPayment(env, orderId) {
  if (!orderId) return null;
  const order = await env.DB.prepare(`SELECT id, total_paise, payment_status FROM fin_orders WHERE id = ?`).bind(orderId).first();
  if (!order) return null;
  const { results } = await env.DB.prepare(`SELECT txn_status, amount_paise FROM fin_transactions WHERE order_id = ?`).bind(orderId).all();
  const txs = results || [];
  const capturedAmt = txs.filter(t => t.txn_status === 'captured').reduce((s, t) => s + Number(t.amount_paise), 0);
  const refunded = txs.some(t => t.txn_status === 'refunded');
  let status = order.payment_status;
  if (capturedAmt >= Number(order.total_paise) && capturedAmt > 0) status = 'paid';
  else if (refunded && capturedAmt > 0) status = 'partially_refunded';
  else if (refunded) status = 'refunded';
  else if (txs.length && txs.every(t => t.txn_status === 'failed')) status = 'failed';
  else if (capturedAmt === 0) status = 'pending';
  if (status !== order.payment_status) {
    await env.DB.prepare(`UPDATE fin_orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, orderId).run();
  }
  return status;
}

async function nextTxnReference(env, tag) {
  const year = new Date().getUTCFullYear();
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_transactions`).first();
  let n = Number(row?.n || 0) + 1;
  for (;;) {
    const ref = `TXN-${tag}-${year}${String(n).padStart(4, '0')}`;
    const dup = await env.DB.prepare(`SELECT id FROM fin_transactions WHERE txn_reference = ?`).bind(ref).first();
    if (!dup) return ref;
    n++;
  }
}

async function handleTransactions(request, env, actor, sub) {
  const method = request.method;
  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT t.*, o.order_number, o.customer_name FROM fin_transactions t LEFT JOIN fin_orders o ON o.id = t.order_id WHERE t.id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
      return json({ ok: true, item: row });
    }
    const url = new URL(request.url);
    const q = cleanStr(url.searchParams.get('q') || '', 100);
    const where = ['1=1']; const binds = [];
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(t.txn_reference LIKE ? ESCAPE '\\' OR t.gateway_payment_id LIKE ? ESCAPE '\\' OR t.upi_vpa_or_last4 LIKE ? ESCAPE '\\' OR o.order_number LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like, like);
    }
    for (const [param, col] of [['txn_status', 't.txn_status'], ['gateway_key', 't.gateway_key'], ['payment_method', 't.payment_method']]) {
      const v = url.searchParams.get(param);
      if (v) { where.push(`${col} = ?`); binds.push(v); }
    }
    const from = url.searchParams.get('date_from'); const to = url.searchParams.get('date_to');
    if (from) { where.push('t.created_at >= ?'); binds.push(from); }
    if (to) { where.push('t.created_at <= ?'); binds.push(to.length === 10 ? `${to} 23:59:59` : to); }
    const { results } = await env.DB.prepare(
      `SELECT t.*, o.order_number, o.customer_name FROM fin_transactions t LEFT JOIN fin_orders o ON o.id = t.order_id WHERE ${where.join(' AND ')} ORDER BY t.created_at DESC, t.txn_reference DESC LIMIT 500`
    ).bind(...binds).all();
    return json({ ok: true, items: results || [] });
  }
  if (method === 'POST' && !sub) {
    const body = await readJson(request, 50_000);
    const errors = {};
    const amount = intPaise(body.amount_paise, 'amount_paise', errors, { min: 1, required: true });
    const pm = pick(body.payment_method, PAY_METHODS, 'payment_method', errors, 'upi');
    const status = pick(body.txn_status, TXN_STATUSES, 'txn_status', errors, 'captured');
    const fee = body.gateway_fee_paise !== undefined ? intPaise(body.gateway_fee_paise, 'gateway_fee_paise', errors) : 0;
    if (fee > amount) errors.gateway_fee_paise = 'Fee cannot exceed amount';
    const orderId = cleanStr(body.order_id || '', 100);
    if (orderId) {
      const o = await env.DB.prepare(`SELECT id FROM fin_orders WHERE id = ?`).bind(orderId).first();
      if (!o) errors.order_id = 'Order not found';
    }
    if (Object.keys(errors).length) throw validationError(errors);
    const gatewayKey = cleanStr(body.gateway_key || 'manual-upi-qr', 80);
    const id = rid('ftxn');
    const ref = await nextTxnReference(env, 'MAN');
    await env.DB.prepare(
      `INSERT INTO fin_transactions (id, txn_reference, order_id, gateway_key, gateway_payment_id, gateway_order_id, payment_method, upi_vpa_or_last4, amount_paise, gateway_fee_paise, net_settled_paise, txn_status, failure_reason, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, ref, orderId || null, gatewayKey, cleanStr(body.gateway_payment_id || body.utr || '', 120), cleanStr(body.gateway_order_id || '', 120), pm,
      cleanStr(body.upi_vpa_or_last4 || '', 80), amount, fee, status === 'captured' ? amount - fee : 0, status,
      cleanStr(body.failure_reason || '', 300), status === 'captured' ? new Date().toISOString() : null).run();
    await syncOrderPayment(env, orderId);
    await snapshotRevision(env, actor, '03', id, 'Manual receipt recorded');
    await audit(env, request, actor, 'finance.transaction.record', 'fin_transactions', id, { txn_reference: ref, amount_paise: amount, payment_method: pm });
    const row = await env.DB.prepare(`SELECT * FROM fin_transactions WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: row }, 201);
  }
  if (method === 'PATCH' && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_transactions WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    const body = await readJson(request, 20_000);
    const errors = {};
    if (body.action === 'sync') {
      // Re-derive the linked order's payment state from the ledger.
      const st = await syncOrderPayment(env, existing.order_id);
      await audit(env, request, actor, 'finance.transaction.sync', 'fin_transactions', sub, { order_payment_status: st });
      return json({ ok: true, synced: true, order_payment_status: st, txn_status: existing.txn_status });
    }
    const status = pick(body.txn_status, TXN_STATUSES, 'txn_status', errors, existing.txn_status);
    if (body.txn_status === undefined) errors.txn_status = 'txn_status or action=sync is required';
    if (Object.keys(errors).length) throw validationError(errors);
    const fee = Number(existing.gateway_fee_paise || 0);
    const net = status === 'captured' ? Number(existing.amount_paise) - fee : (status === 'refunded' || status === 'failed' || status === 'initiated' || status === 'authorized' ? 0 : Number(existing.net_settled_paise));
    await env.DB.prepare(
      `UPDATE fin_transactions SET txn_status = ?, net_settled_paise = ?, failure_reason = ?, captured_at = ? WHERE id = ?`
    ).bind(status, net, status === 'failed' ? cleanStr(body.failure_reason || existing.failure_reason || 'Marked failed by admin', 300) : '',
      status === 'captured' ? (existing.captured_at || new Date().toISOString()) : existing.captured_at, sub).run();
    const orderStatus = await syncOrderPayment(env, existing.order_id);
    await snapshotRevision(env, actor, '03', sub, cleanStr(body.change_note || `Status ${existing.txn_status} -> ${status}`, 300));
    await audit(env, request, actor, 'finance.transaction.update', 'fin_transactions', sub, { from: existing.txn_status, to: status });
    const row = await env.DB.prepare(`SELECT * FROM fin_transactions WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: row, order_payment_status: orderStatus });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 04: Orders ----------
function readItems(raw, errors) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 50) { errors.items = 'items must be a non-empty array (max 50)'; return []; }
  const out = [];
  for (const it of raw) {
    const qty = Number(it?.qty ?? 1);
    const price = Number(it?.unit_price_paise);
    const gst = Number(it?.gst_rate_pct ?? 0);
    const title = cleanStr(it?.title_en, 200, { required: true });
    if (!title || !Number.isInteger(qty) || qty < 1 || qty > 1000 || !Number.isInteger(price) || price < 0 || !Number.isFinite(gst) || gst < 0 || gst > 28) {
      errors.items = 'Each item needs title_en, integer qty >= 1, integer unit_price_paise >= 0 and gst_rate_pct 0-28';
      return [];
    }
    out.push({ item_type: cleanStr(it.item_type || 'study_pack', 40), item_id: cleanStr(it.item_id || '', 100), title_en: title, qty, unit_price_paise: price, gst_rate_pct: gst });
  }
  return out;
}

async function nextOrderNumber(env) {
  const year = new Date().getUTCFullYear();
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_orders`).first();
  let n = Number(row?.n || 0) + 1;
  for (;;) {
    const num = `CSO-ORD-${year}-${String(n).padStart(4, '0')}`;
    const dup = await env.DB.prepare(`SELECT id FROM fin_orders WHERE order_number = ?`).bind(num).first();
    if (!dup) return num;
    n++;
  }
}

async function handleOrders(request, env, actor, sub) {
  const method = request.method;
  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
      const { results } = await env.DB.prepare(`SELECT * FROM fin_transactions WHERE order_id = ? ORDER BY created_at DESC`).bind(sub).all();
      return json({ ok: true, item: publicOrder(row), transactions: results || [] });
    }
    const url = new URL(request.url);
    const q = cleanStr(url.searchParams.get('q') || '', 100);
    const where = ['1=1']; const binds = [];
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(order_number LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR customer_email LIKE ? ESCAPE '\\' OR customer_phone LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like, like);
    }
    for (const col of ['payment_status', 'fulfillment_status', 'order_type']) {
      const v = url.searchParams.get(col);
      if (v) { where.push(`${col} = ?`); binds.push(v); }
    }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_orders WHERE ${where.join(' AND ')} ORDER BY created_at DESC, order_number DESC LIMIT 500`).bind(...binds).all();
    return json({ ok: true, items: (results || []).map(publicOrder) });
  }
  if (method === 'POST' && !sub) {
    const body = await readJson(request, 100_000);
    const errors = {};
    const name = cleanStr(body.customer_name, 120, { required: true });
    if (!name) errors.customer_name = 'customer_name is required';
    const email = cleanStr(body.customer_email || '', 160);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.customer_email = 'customer_email is invalid';
    const type = pick(body.order_type, ORDER_TYPES, 'order_type', errors, 'study_pack');
    const items = readItems(body.items, errors);
    const discount = intPaise(body.discount_paise, 'discount_paise', errors);
    if (Object.keys(errors).length) throw validationError(errors);
    const totals = computeOrderTotals(items, discount);
    const id = rid('ford');
    const number = await nextOrderNumber(env);
    await env.DB.prepare(
      `INSERT INTO fin_orders (id, order_number, customer_name, customer_email, customer_phone, customer_state, user_id, order_type, items_json, subtotal_paise, discount_paise, tax_paise, total_paise, coupon_code, payment_status, fulfillment_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unfulfilled', ?)`
    ).bind(id, number, name, email, cleanStr(body.customer_phone || '', 20), cleanStr(body.customer_state || 'Odisha', 60) || 'Odisha', cleanStr(body.user_id || '', 100) || null, type,
      JSON.stringify(items), totals.subtotal_paise, totals.discount_paise, totals.tax_paise, totals.total_paise, cleanStr(body.coupon_code || '', 40).toUpperCase(),
      cleanStr(body.notes || '', 1000, { multiline: true })).run();
    await snapshotRevision(env, actor, '04', id, 'Assisted order created');
    await audit(env, request, actor, 'finance.order.create', 'fin_orders', id, { order_number: number, total_paise: totals.total_paise });
    const row = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: publicOrder(row) }, 201);
  }
  if (method === 'PATCH' && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    const body = await readJson(request, 50_000);
    const errors = {};
    let fulfillment = existing.fulfillment_status;
    let payment = existing.payment_status;
    let note = 'Order updated';
    if (body.action === 'grant_access') {
      if (existing.fulfillment_status === 'cancelled') throw new HttpError(409, 'ORDER_CANCELLED', 'Cancelled orders cannot be fulfilled');
      if (existing.payment_status !== 'paid') throw new HttpError(409, 'PAYMENT_REQUIRED', 'Digital access can only be granted for paid orders');
      fulfillment = 'access_granted'; note = 'Digital access granted';
    } else if (body.action === 'revoke_access') {
      fulfillment = 'unfulfilled'; note = 'Digital access revoked';
    } else {
      fulfillment = pick(body.fulfillment_status, FULFILLMENT_STATUSES, 'fulfillment_status', errors, fulfillment);
      payment = pick(body.payment_status, PAYMENT_STATUSES, 'payment_status', errors, payment);
      if (fulfillment === 'access_granted' && payment !== 'paid') errors.fulfillment_status = 'Access can only be granted when payment_status is paid';
      if (body.fulfillment_status === undefined && body.payment_status === undefined && body.notes === undefined) errors.action = 'Provide action, fulfillment_status, payment_status or notes';
    }
    if (Object.keys(errors).length) throw validationError(errors);
    if ((payment === 'refunded' || payment === 'failed') && fulfillment === 'access_granted') fulfillment = 'unfulfilled';
    const notes = body.notes !== undefined ? cleanStr(body.notes, 1000, { multiline: true }) : existing.notes;
    await env.DB.prepare(`UPDATE fin_orders SET fulfillment_status = ?, payment_status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`).bind(fulfillment, payment, notes, sub).run();
    await snapshotRevision(env, actor, '04', sub, cleanStr(body.change_note || note, 300));
    await audit(env, request, actor, 'finance.order.update', 'fin_orders', sub, { fulfillment_status: fulfillment, payment_status: payment, action: body.action || null });
    const row = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: publicOrder(row) });
  }
  if (method === 'DELETE' && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_orders WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    if (existing.payment_status !== 'pending') throw new HttpError(409, 'ORDER_NOT_DRAFT', 'Only unpaid pending orders can be cancelled; use refund workflow for paid orders');
    await env.DB.prepare(`UPDATE fin_orders SET fulfillment_status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await snapshotRevision(env, actor, '04', sub, 'Order cancelled');
    await audit(env, request, actor, 'finance.order.cancel', 'fin_orders', sub, null);
    return json({ ok: true, fulfillment_status: 'cancelled' });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handlePaymentsFinanceBatch1Admin(request, env, actor, id, sub) {
  await ensurePaymentsFinanceBatch1Schema(env.DB);
  if (id === 'overview') {
    if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    return json(await getPaymentsFinanceOverview(env));
  }
  if (id === 'gateways') return handleGateways(request, env, actor, sub);
  if (id === 'transactions') return handleTransactions(request, env, actor, sub);
  if (id === 'orders') return handleOrders(request, env, actor, sub);
  if (id === 'revisions') return handleRevisions(request, env, actor, sub);
  return null;
}
