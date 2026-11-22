// Payments & Finance Batch 5 (v95): Modules 17-18 + Full 18-Module Suite
// 17 Payment Webhooks | 18 Fraud & Risk Events
// Raw webhook secrets and sensitive tokens are NEVER stored or returned.
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import { getPaymentsFinanceOverview, REV_TABLES, snapshotRevision } from './payments-finance-batch1.js';
import { getPaymentsFinanceBatch2Overview, formatInr } from './payments-finance-batch2.js';
import { getPaymentsFinanceBatch3Overview } from './payments-finance-batch3.js';
import { ensurePaymentsFinanceBatch4Schema, getPaymentsFinanceBatch4Overview } from './payments-finance-batch4.js';

export const WEBHOOK_GATEWAYS = ['razorpay', 'cashfree', 'phonepe_upi', 'stripe'];
export const WEBHOOK_EVENTS = ['payment.captured', 'payment.failed', 'order.paid', 'refund.processed', 'dispute.created', 'settlement.processed'];
export const WEBHOOK_STATUSES = ['processed', 'ignored_duplicate', 'failed_signature', 'retry_queued', 'replayed'];
export const FRAUD_RULES = ['velocity_burst_ip', 'high_value_anomaly', 'multiple_failed_cards', 'geo_mismatch_upi', 'chargeback_repeat_email'];
export const FRAUD_SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const FRAUD_ACTIONS = ['flagged_review', 'auto_blocked', 'otp_challenged', 'cleared_safe'];
export const FRAUD_STATUSES = ['open', 'investigating', 'blocked_confirmed', 'false_positive_cleared'];
export const RULE_AUTO_ACTIONS = ['flag', 'challenge', 'block'];

const _fin5Ready = new WeakSet();
const SENSITIVE_KEY_RE = /secret|token|password|api_?key|authorization|signature|private_key/i;

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function decorateInr(row) {
  if (!row) return row;
  const out = { ...row };
  for (const [k, v] of Object.entries(row)) {
    if (k.endsWith('_paise') && typeof v === 'number') out[k.replace(/_paise$/, '_inr')] = formatInr(v);
  }
  return out;
}

/** Recursively strip secret/token/signature fields before persisting or returning webhook payloads. */
export function sanitizeWebhookPayload(val) {
  if (Array.isArray(val)) return val.map(sanitizeWebhookPayload);
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_RE.test(k)) out[k] = '[REDACTED]';
      else out[k] = sanitizeWebhookPayload(v);
    }
    return out;
  }
  return val;
}

export async function verifyHmacSha256(payloadStr, signatureHex, secret) {
  if (!signatureHex || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
  const expected = [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  return diff === 0;
}

REV_TABLES['18'] = {
  table: 'fin_fraud_risk_events',
  cols: ['alert_code', 'rule_triggered', 'severity', 'risk_score', 'order_number', 'txn_reference', 'customer_email', 'ip_hash_masked', 'amount_paise', 'action_taken', 'resolution_status', 'analyst_notes', 'resolved_by', 'resolved_at']
};

export async function ensurePaymentsFinanceBatch5Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensurePaymentsFinanceBatch4Schema(db);
  if (_fin5Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS fin_webhook_events (
      id TEXT PRIMARY KEY,
      event_uid TEXT NOT NULL UNIQUE,
      gateway_key TEXT NOT NULL DEFAULT 'razorpay' CHECK (gateway_key IN ('razorpay', 'cashfree', 'phonepe_upi', 'stripe')),
      event_type TEXT NOT NULL DEFAULT 'payment.captured' CHECK (event_type IN ('payment.captured', 'payment.failed', 'order.paid', 'refund.processed', 'dispute.created', 'settlement.processed')),
      signature_verified INTEGER NOT NULL DEFAULT 0,
      http_status_returned INTEGER NOT NULL DEFAULT 200,
      processing_status TEXT NOT NULL DEFAULT 'processed' CHECK (processing_status IN ('processed', 'ignored_duplicate', 'failed_signature', 'retry_queued', 'replayed')),
      linked_order_number TEXT NOT NULL DEFAULT '',
      linked_txn_reference TEXT NOT NULL DEFAULT '',
      amount_paise INTEGER NOT NULL DEFAULT 0,
      sanitized_payload_json TEXT NOT NULL DEFAULT '{}',
      error_message TEXT NOT NULL DEFAULT '',
      replay_count INTEGER NOT NULL DEFAULT 0,
      received_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_webhooks_status ON fin_webhook_events(gateway_key, processing_status, received_at DESC)`,
    `CREATE TABLE IF NOT EXISTS fin_fraud_risk_events (
      id TEXT PRIMARY KEY,
      alert_code TEXT NOT NULL UNIQUE,
      rule_triggered TEXT NOT NULL DEFAULT 'high_value_anomaly' CHECK (rule_triggered IN ('velocity_burst_ip', 'high_value_anomaly', 'multiple_failed_cards', 'geo_mismatch_upi', 'chargeback_repeat_email')),
      severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      risk_score INTEGER NOT NULL DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
      order_number TEXT NOT NULL DEFAULT '',
      txn_reference TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      ip_hash_masked TEXT NOT NULL DEFAULT '',
      amount_paise INTEGER NOT NULL DEFAULT 0,
      action_taken TEXT NOT NULL DEFAULT 'flagged_review' CHECK (action_taken IN ('flagged_review', 'auto_blocked', 'otp_challenged', 'cleared_safe')),
      resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'blocked_confirmed', 'false_positive_cleared')),
      analyst_notes TEXT NOT NULL DEFAULT '',
      resolved_by TEXT NOT NULL DEFAULT '',
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fin_fraud_status ON fin_fraud_risk_events(resolution_status, severity, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS fin_fraud_rules (
      id TEXT PRIMARY KEY,
      rule_key TEXT NOT NULL UNIQUE CHECK (rule_key IN ('velocity_burst_ip', 'high_value_anomaly', 'multiple_failed_cards', 'geo_mismatch_upi', 'chargeback_repeat_email')),
      rule_name_en TEXT NOT NULL,
      rule_name_or TEXT NOT NULL DEFAULT '',
      threshold_value INTEGER NOT NULL DEFAULT 5,
      window_minutes INTEGER NOT NULL DEFAULT 15,
      auto_action TEXT NOT NULL DEFAULT 'flag' CHECK (auto_action IN ('flag', 'challenge', 'block')),
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ];
  for (const sql of ddl) await db.prepare(sql).run();
  await seedBatch5(db);
  _fin5Ready.add(db);
}

async function seedBatch5(db) {
  const wCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_webhook_events`).first();
  if (!wCnt || Number(wCnt.n || 0) === 0) {
    const events = [
      ['fwhk-001', 'evt_rzp_20260001', 'razorpay', 'payment.captured', 1, 200, 'processed', 'CSO-ORD-2026-0001', 'TXN-RZP-20260001', 52982, JSON.stringify({ event: 'payment.captured', gateway: 'razorpay', order_number: 'CSO-ORD-2026-0001', method: 'upi', amount_paise: 52982 }), '', 0, '2026-11-15T10:12:00Z'],
      ['fwhk-002', 'evt_phpe_20260002', 'phonepe_upi', 'order.paid', 1, 200, 'processed', 'CSO-ORD-2026-0002', 'TXN-RZP-20260002', 42895, JSON.stringify({ event: 'order.paid', gateway: 'phonepe_upi', order_number: 'CSO-ORD-2026-0002', method: 'card', amount_paise: 42895 }), '', 0, '2026-11-16T09:30:00Z'],
      ['fwhk-003', 'evt_rzp_20260003', 'razorpay', 'payment.captured', 0, 401, 'failed_signature', 'CSO-ORD-2026-0005', 'TXN-RZP-20260005', 26145, JSON.stringify({ event: 'payment.captured', gateway: 'razorpay', order_number: 'CSO-ORD-2026-0005', method: 'upi', amount_paise: 26145 }), 'HMAC signature mismatch in test mode', 0, null]
    ];
    for (const e of events) {
      await db.prepare(
        `INSERT OR IGNORE INTO fin_webhook_events (id, event_uid, gateway_key, event_type, signature_verified, http_status_returned, processing_status, linked_order_number, linked_txn_reference, amount_paise, sanitized_payload_json, error_message, replay_count, processed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...e).run();
    }
  }

  const rCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_fraud_rules`).first();
  if (!rCnt || Number(rCnt.n || 0) === 0) {
    const rules = [
      ['ffrl-001', 'velocity_burst_ip', 'IP Velocity Burst (>N orders / window)', 'ଆଇପି ଭେଲୋସିଟି ବର୍ଷ୍ଟ', 5, 15, 'challenge', 1],
      ['ffrl-002', 'high_value_anomaly', 'High Value Order Anomaly (INR paise)', 'ଉଚ୍ଚ ମୂଲ୍ୟ ଅର୍ଡର', 500000, 60, 'flag', 1],
      ['ffrl-003', 'multiple_failed_cards', 'Multiple Failed Card Attempts', 'ଏକାଧିକ ବିଫଳ କାର୍ଡ ଚେଷ୍ଟା', 3, 15, 'block', 1],
      ['ffrl-004', 'geo_mismatch_upi', 'Geo Mismatch on UPI VPA', 'ଜିଓ ମେଳ ନଖାଉଥିବା UPI', 1, 30, 'challenge', 1],
      ['ffrl-005', 'chargeback_repeat_email', 'Repeat Chargeback Email', 'ପୁନରାବୃତ୍ତି ଚାର୍ଜବ୍ୟାକ୍ ଇମେଲ୍', 2, 1440, 'block', 1]
    ];
    for (const r of rules) {
      await db.prepare(
        `INSERT OR IGNORE INTO fin_fraud_rules (id, rule_key, rule_name_en, rule_name_or, threshold_value, window_minutes, auto_action, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...r).run();
    }
  }

  const fCnt = await db.prepare(`SELECT COUNT(*) AS n FROM fin_fraud_risk_events`).first();
  if (!fCnt || Number(fCnt.n || 0) === 0) {
    await db.prepare(
      `INSERT OR IGNORE INTO fin_fraud_risk_events (id, alert_code, rule_triggered, severity, risk_score, order_number, txn_reference, customer_email, ip_hash_masked, amount_paise, action_taken, resolution_status, analyst_notes, resolved_by, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('ffrd-001', 'RSK-2026-0001', 'high_value_anomaly', 'low', 22, 'CSO-ORD-2026-0003', 'TXN-RZP-20260003', 'lipsa.behera@csodisha.com', 'ip_103.84.••.12', 117882, 'cleared_safe', 'false_positive_cleared', 'Verified annual Pro membership purchase from Bhubaneswar', 'finance-admin@csodisha.com', '2026-11-15T12:00:00Z').run();

    await db.prepare(
      `INSERT OR IGNORE INTO fin_fraud_risk_events (id, alert_code, rule_triggered, severity, risk_score, order_number, txn_reference, customer_email, ip_hash_masked, amount_paise, action_taken, resolution_status, analyst_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('ffrd-002', 'RSK-2026-0002', 'multiple_failed_cards', 'high', 78, 'CSO-ORD-2026-0004', 'TXN-RZP-20260004', 'subhashree.nayak@csodisha.com', 'ip_49.37.••.89', 47082, 'flagged_review', 'open', '3 consecutive failed card attempts in 10 minutes').run();
  }
}

// ---------- Overview Extension & 18-Module Aggregation ----------
export async function getPaymentsFinanceBatch5Overview(env) {
  await ensurePaymentsFinanceBatch5Schema(env.DB);
  const [whRes, frOpen, frAll] = await Promise.all([
    env.DB.prepare(`SELECT processing_status FROM fin_webhook_events`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_fraud_risk_events WHERE resolution_status IN ('open', 'investigating')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM fin_fraud_risk_events`).first()
  ]);
  const wh = whRes.results || [];
  const okWh = wh.filter(w => w.processing_status === 'processed' || w.processing_status === 'replayed').length;
  const deliveryPct = wh.length ? Number((okWh * 100 / wh.length).toFixed(1)) : 100;
  return {
    webhook_events_count: wh.length,
    webhook_delivery_success_pct: deliveryPct,
    open_fraud_alerts_count: Number(frOpen?.n || 0),
    modules: { '17': wh.length, '18': Number(frAll?.n || 0) }
  };
}

export async function getFull18ModuleFinanceOverview(env) {
  await ensurePaymentsFinanceBatch5Schema(env.DB);
  const [b1, b2, b3, b4, b5] = await Promise.all([
    getPaymentsFinanceOverview(env),
    getPaymentsFinanceBatch2Overview(env),
    getPaymentsFinanceBatch3Overview(env),
    getPaymentsFinanceBatch4Overview(env),
    getPaymentsFinanceBatch5Overview(env)
  ]);
  const modules = { ...b1.modules, ...b2.modules, ...b3.modules, ...b4.modules, ...b5.modules };
  return {
    ...b1,
    ...b2,
    ...b3,
    ...b4,
    ...b5,
    modules,
    suite_18: {
      total_modules: Object.keys(modules).length,
      modules,
      gross_revenue_paise: b1.gross_revenue_paise,
      net_settled_paise: b1.net_settled_paise,
      mrr_estimate_paise: b2.mrr_estimate_paise,
      total_donations_raised_paise: b3.total_donations_raised_paise,
      settled_payouts_paise: b4.settled_payouts_paise,
      open_variances_count: b4.open_variances_count,
      webhook_delivery_success_pct: b5.webhook_delivery_success_pct,
      open_fraud_alerts_count: b5.open_fraud_alerts_count
    }
  };
}

// ---------- Module 17: Payment Webhooks ----------
function presentWebhook(row) {
  if (!row) return row;
  return {
    ...decorateInr(row),
    signature_verified: Number(row.signature_verified) === 1,
    sanitized_payload: sanitizeWebhookPayload(parseJson(row.sanitized_payload_json, {}))
  };
}

async function handleWebhooks(request, env, actor, sub, extra) {
  const method = request.method;
  if (sub && extra === 'replay' && method === 'POST') {
    const existing = await env.DB.prepare(`SELECT * FROM fin_webhook_events WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Webhook event not found');
    const now = new Date().toISOString();
    const newCount = Number(existing.replay_count || 0) + 1;
    await env.DB.prepare(
      `UPDATE fin_webhook_events SET processing_status = 'replayed', signature_verified = 1, http_status_returned = 200, error_message = '', replay_count = ?, processed_at = ? WHERE id = ?`
    ).bind(newCount, now, sub).run();
    await audit(env, request, actor, 'finance.webhook.replay', 'fin_webhook_events', sub, { event_uid: existing.event_uid, replay_count: newCount });
    const row = await env.DB.prepare(`SELECT * FROM fin_webhook_events WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: presentWebhook(row) });
  }

  if (sub === 'simulate' && method === 'POST') {
    const body = await readJson(request, 50_000);
    const errors = {};
    const gw = WEBHOOK_GATEWAYS.includes(body.gateway_key || 'razorpay') ? (body.gateway_key || 'razorpay') : null;
    if (!gw) errors.gateway_key = `gateway_key must be one of: ${WEBHOOK_GATEWAYS.join(', ')}`;
    const evType = WEBHOOK_EVENTS.includes(body.event_type || 'payment.captured') ? (body.event_type || 'payment.captured') : null;
    if (!evType) errors.event_type = `event_type must be one of: ${WEBHOOK_EVENTS.join(', ')}`;
    const amt = Number(body.amount_paise ?? 0);
    if (!Number.isInteger(amt) || amt < 0) errors.amount_paise = 'amount_paise must be an integer >= 0';
    if (Object.keys(errors).length) throw validationError(errors);

    const eventUid = cleanStr(body.event_uid || `evt_${gw.slice(0, 3)}_${Date.now()}`, 100);
    const dup = await env.DB.prepare(`SELECT id FROM fin_webhook_events WHERE event_uid = ?`).bind(eventUid).first();
    const rawPayload = sanitizeWebhookPayload(body.payload && typeof body.payload === 'object' ? body.payload : {
      event: evType, gateway: gw, order_number: body.linked_order_number || '', amount_paise: amt
    });

    let sigVerified = body.simulate_valid_signature !== false;
    if (body.signature && body.webhook_secret) {
      sigVerified = await verifyHmacSha256(JSON.stringify(rawPayload), String(body.signature), String(body.webhook_secret));
    }

    let procStatus = 'processed';
    let httpCode = 200;
    let errMsg = '';
    if (!sigVerified) {
      procStatus = 'failed_signature';
      httpCode = 401;
      errMsg = 'HMAC-SHA256 webhook signature verification failed';
    } else if (dup) {
      procStatus = 'ignored_duplicate';
      httpCode = 200;
      errMsg = 'Duplicate event_uid ignored idempotently';
    }

    const id = rid('fwhk');
    const uniqueUid = dup ? `${eventUid}_dup_${id.slice(-4)}` : eventUid;
    await env.DB.prepare(
      `INSERT INTO fin_webhook_events (id, event_uid, gateway_key, event_type, signature_verified, http_status_returned, processing_status, linked_order_number, linked_txn_reference, amount_paise, sanitized_payload_json, error_message, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, uniqueUid, gw, evType, sigVerified ? 1 : 0, httpCode, procStatus,
      cleanStr(body.linked_order_number || '', 80), cleanStr(body.linked_txn_reference || '', 80),
      amt, JSON.stringify(rawPayload), errMsg, sigVerified ? new Date().toISOString() : null
    ).run();

    await audit(env, request, actor, 'finance.webhook.simulate', 'fin_webhook_events', id, { gateway_key: gw, event_type: evType, processing_status: procStatus });
    const row = await env.DB.prepare(`SELECT * FROM fin_webhook_events WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: presentWebhook(row) }, 201);
  }

  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_webhook_events WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Webhook event not found');
      return json({ ok: true, item: presentWebhook(row) });
    }
    const url = new URL(request.url);
    const gw = url.searchParams.get('gateway_key');
    const st = url.searchParams.get('processing_status');
    const q = cleanStr(url.searchParams.get('q') || '', 80);
    const where = ['1=1']; const binds = [];
    if (gw) { where.push('gateway_key = ?'); binds.push(gw); }
    if (st) { where.push('processing_status = ?'); binds.push(st); }
    if (q) {
      const like = `%${likeEscape(q)}%`;
      where.push(`(event_uid LIKE ? ESCAPE '\\' OR linked_order_number LIKE ? ESCAPE '\\' OR linked_txn_reference LIKE ? ESCAPE '\\')`);
      binds.push(like, like, like);
    }
    const { results } = await env.DB.prepare(`SELECT * FROM fin_webhook_events WHERE ${where.join(' AND ')} ORDER BY received_at DESC LIMIT 200`).bind(...binds).all();
    return json({ ok: true, items: (results || []).map(presentWebhook) });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 18: Fraud & Risk Events ----------
function presentRule(r) {
  return r ? { ...r, enabled: Number(r.enabled) === 1 } : r;
}

async function handleFraud(request, env, actor, sub) {
  const method = request.method;
  if (sub === 'rules' && method === 'PUT') {
    const body = await readJson(request, 30_000);
    const ruleKey = cleanStr(body.rule_key || '', 60);
    const existing = await env.DB.prepare(`SELECT * FROM fin_fraud_rules WHERE rule_key = ? OR id = ?`).bind(ruleKey, cleanStr(body.id || '', 60)).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Fraud rule not found');
    const enabled = body.enabled !== undefined ? (body.enabled ? 1 : 0) : existing.enabled;
    const threshold = body.threshold_value !== undefined ? Math.max(1, Math.trunc(Number(body.threshold_value))) : existing.threshold_value;
    const winMin = body.window_minutes !== undefined ? Math.max(1, Math.trunc(Number(body.window_minutes))) : existing.window_minutes;
    const autoAction = body.auto_action && RULE_AUTO_ACTIONS.includes(body.auto_action) ? body.auto_action : existing.auto_action;

    await env.DB.prepare(
      `UPDATE fin_fraud_rules SET enabled = ?, threshold_value = ?, window_minutes = ?, auto_action = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(enabled, threshold, winMin, autoAction, existing.id).run();
    await audit(env, request, actor, 'finance.fraud_rule.update', 'fin_fraud_rules', existing.id, { rule_key: existing.rule_key, enabled: !!enabled, threshold_value: threshold });
    const row = await env.DB.prepare(`SELECT * FROM fin_fraud_rules WHERE id = ?`).bind(existing.id).first();
    return json({ ok: true, rule: presentRule(row) });
  }

  if (sub === 'evaluate' && method === 'POST') {
    const body = await readJson(request, 30_000);
    const amountPaise = Math.max(0, Math.trunc(Number(body.amount_paise ?? 0)));
    const failedCards = Math.max(0, Math.trunc(Number(body.failed_attempts_15m ?? 0)));
    const ipReqs = Math.max(0, Math.trunc(Number(body.ip_requests_15m ?? 1)));
    const geoMismatch = !!body.geo_mismatch;
    const repeatChargeback = !!body.repeat_chargeback;

    const { results: rulesRows } = await env.DB.prepare(`SELECT * FROM fin_fraud_rules WHERE enabled = 1`).all();
    const active = Object.fromEntries((rulesRows || []).map(r => [r.rule_key, r]));

    let score = 5;
    let triggered = 'high_value_anomaly';
    let topAction = 'cleared_safe';
    const reasons = [];

    if (active.multiple_failed_cards && failedCards >= Number(active.multiple_failed_cards.threshold_value)) {
      score += 45; triggered = 'multiple_failed_cards'; topAction = active.multiple_failed_cards.auto_action; reasons.push('Multiple failed card attempts');
    }
    if (active.velocity_burst_ip && ipReqs >= Number(active.velocity_burst_ip.threshold_value)) {
      score += 30; if (topAction === 'cleared_safe') { triggered = 'velocity_burst_ip'; topAction = active.velocity_burst_ip.auto_action; } reasons.push('IP velocity burst');
    }
    if (active.high_value_anomaly && amountPaise >= Number(active.high_value_anomaly.threshold_value)) {
      score += 25; if (topAction === 'cleared_safe') { triggered = 'high_value_anomaly'; topAction = active.high_value_anomaly.auto_action; } reasons.push('High value transaction');
    }
    if (active.geo_mismatch_upi && geoMismatch) {
      score += 20; if (topAction === 'cleared_safe') { triggered = 'geo_mismatch_upi'; topAction = active.geo_mismatch_upi.auto_action; } reasons.push('UPI geo mismatch');
    }
    if (active.chargeback_repeat_email && repeatChargeback) {
      score += 50; triggered = 'chargeback_repeat_email'; topAction = active.chargeback_repeat_email.auto_action; reasons.push('Repeat chargeback email');
    }

    score = Math.min(100, score);
    const severity = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
    const actionTaken = topAction === 'block' ? 'auto_blocked' : topAction === 'challenge' ? 'otp_challenged' : topAction === 'flag' ? 'flagged_review' : 'cleared_safe';

    let createdAlert = null;
    if (body.record !== false && score >= 30) {
      const id = rid('ffrd');
      const alertCode = `RSK-${new Date().getUTCFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      await env.DB.prepare(
        `INSERT INTO fin_fraud_risk_events (id, alert_code, rule_triggered, severity, risk_score, order_number, txn_reference, customer_email, ip_hash_masked, amount_paise, action_taken, resolution_status, analyst_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`
      ).bind(
        id, alertCode, triggered, severity, score,
        cleanStr(body.order_number || '', 80), cleanStr(body.txn_reference || '', 80),
        cleanStr(body.customer_email || '', 160), cleanStr(body.ip_hash_masked || 'ip_103.84.••.01', 60),
        amountPaise, actionTaken, reasons.join('; ') || 'Automated risk evaluation'
      ).run();
      await snapshotRevision(env, actor, '18', id, `Evaluated risk (${severity}, score ${score})`);
      createdAlert = decorateInr(await env.DB.prepare(`SELECT * FROM fin_fraud_risk_events WHERE id = ?`).bind(id).first());
    }

    await audit(env, request, actor, 'finance.fraud.evaluate', 'fin_fraud_risk_events', createdAlert?.id || null, { risk_score: score, severity, action_taken: actionTaken });
    return json({ ok: true, risk_score: score, severity, rule_triggered: triggered, action_taken: actionTaken, reasons, alert: createdAlert });
  }

  if (method === 'GET') {
    if (sub) {
      const row = await env.DB.prepare(`SELECT * FROM fin_fraud_risk_events WHERE id = ?`).bind(sub).first();
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Fraud event not found');
      return json({ ok: true, item: decorateInr(row) });
    }
    const url = new URL(request.url);
    const resSt = url.searchParams.get('resolution_status');
    const sev = url.searchParams.get('severity');
    const where = ['1=1']; const binds = [];
    if (resSt) { where.push('resolution_status = ?'); binds.push(resSt); }
    if (sev) { where.push('severity = ?'); binds.push(sev); }
    const [alertsRes, rulesRes] = await Promise.all([
      env.DB.prepare(`SELECT * FROM fin_fraud_risk_events WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`).bind(...binds).all(),
      env.DB.prepare(`SELECT * FROM fin_fraud_rules ORDER BY rule_key ASC`).all()
    ]);
    return json({
      ok: true,
      items: (alertsRes.results || []).map(decorateInr),
      rules: (rulesRes.results || []).map(presentRule)
    });
  }

  if (method === 'PATCH' && sub) {
    const existing = await env.DB.prepare(`SELECT * FROM fin_fraud_risk_events WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Fraud event not found');
    const body = await readJson(request, 30_000);
    const resStatus = body.resolution_status || existing.resolution_status;
    if (!FRAUD_STATUSES.includes(resStatus)) throw validationError({ resolution_status: `resolution_status must be one of: ${FRAUD_STATUSES.join(', ')}` });

    const actionTaken = resStatus === 'blocked_confirmed' ? 'auto_blocked' : resStatus === 'false_positive_cleared' ? 'cleared_safe' : existing.action_taken;
    const notes = body.analyst_notes !== undefined ? cleanStr(body.analyst_notes, 500) : existing.analyst_notes;
    const isResolved = resStatus === 'blocked_confirmed' || resStatus === 'false_positive_cleared';

    await env.DB.prepare(
      `UPDATE fin_fraud_risk_events SET resolution_status = ?, action_taken = ?, analyst_notes = ?, resolved_by = ?, resolved_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(resStatus, actionTaken, notes, isResolved ? (actor.email || '') : existing.resolved_by, isResolved ? new Date().toISOString() : existing.resolved_at, sub).run();

    if (resStatus === 'blocked_confirmed' && body.hold_order !== false && existing.order_number) {
      await env.DB.prepare(`UPDATE fin_orders SET fulfillment_status = 'cancelled', updated_at = datetime('now') WHERE order_number = ?`).bind(existing.order_number).run();
    }

    await snapshotRevision(env, actor, '18', sub, `Resolution -> ${resStatus}`);
    await audit(env, request, actor, 'finance.fraud.resolve', 'fin_fraud_risk_events', sub, { resolution_status: resStatus });
    const row = await env.DB.prepare(`SELECT * FROM fin_fraud_risk_events WHERE id = ?`).bind(sub).first();
    return json({ ok: true, item: decorateInr(row) });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Router Entry ----------
export async function handlePaymentsFinanceBatch5Admin(request, env, actor, id, sub, extra) {
  if (!['overview', 'webhooks', 'fraud'].includes(id)) return null;
  await ensurePaymentsFinanceBatch5Schema(env.DB);
  if (id === 'overview') {
    if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    return json(await getFull18ModuleFinanceOverview(env));
  }
  if (id === 'webhooks') return handleWebhooks(request, env, actor, sub, extra);
  if (id === 'fraud') return handleFraud(request, env, actor, sub);
  return null;
}
