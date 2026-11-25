// Folder #10 Backend (v312): Live Ad Slot Manager, Membership Plans, Promo Coupons & Real Order Ledger
// Zero fake orders, zero synthetic impressions/clicks — every metric comes strictly from D1.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { cleanStr, slugify, SLUG_RE } from '../../_lib/validate.js';
import { recordAdminAuditLog } from './system-ops.js';

export const CANONICAL_AD_SLOTS = [
  'site_banner',
  'home_mid_banner',
  'jobs_top_sponsor',
  'careers_top_sponsor',
  'schemes_top_sponsor',
  'study_top_sponsor',
  'mock_tests_banner',
  'community_top_sponsor'
];

const ORDER_STATUSES = ['created', 'pending', 'paid', 'failed', 'refunded'];
let _schemaReadyDb = null;

export async function ensureBillingAdsSchema(db) {
  if (!db || _schemaReadyDb === db) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS ad_slots (
        id TEXT PRIMARY KEY,
        slot_key TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        target_url TEXT NOT NULL DEFAULT '',
        badge_text TEXT NOT NULL DEFAULT 'Sponsored',
        starts_at TEXT NOT NULL DEFAULT '',
        ends_at TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        impressions INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS monetization_plans (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        price_inr INTEGER NOT NULL DEFAULT 0,
        validity_days INTEGER NOT NULL DEFAULT 30,
        features_json TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS payment_coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT NOT NULL DEFAULT 'percent',
        discount_value REAL NOT NULL DEFAULT 0,
        max_uses INTEGER NOT NULL DEFAULT 0,
        used_count INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS payment_orders (
        id TEXT PRIMARY KEY,
        order_ref TEXT UNIQUE NOT NULL,
        candidate_id TEXT NOT NULL DEFAULT '',
        plan_id TEXT NOT NULL DEFAULT '',
        coupon_code TEXT NOT NULL DEFAULT '',
        amount_inr REAL NOT NULL DEFAULT 0,
        gateway TEXT NOT NULL DEFAULT 'razorpay',
        gateway_payment_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'created',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    _schemaReadyDb = db;
  } catch {
    // Graceful skip if DB unavailable
  }
}

function validateSafeUrl(raw, fieldName, allowEmpty = false) {
  const s = String(raw || '').trim();
  if (!s) {
    if (allowEmpty) return '';
    throw validationError({ [fieldName]: `${fieldName} is required.` });
  }
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw validationError({ [fieldName]: 'Unsafe URL scheme is not allowed.' });
  }
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 600);
  let u;
  try { u = new URL(s); } catch {
    throw validationError({ [fieldName]: 'Provide a valid /path or https:// URL.' });
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw validationError({ [fieldName]: 'URL must use http:// or https://.' });
  }
  return u.toString().slice(0, 600);
}

export function getGatewayReadiness(env) {
  const e = env || {};
  const rzKey = Boolean(String(e.RAZORPAY_KEY_ID || '').trim());
  const rzSec = Boolean(String(e.RAZORPAY_KEY_SECRET || '').trim());
  const rzHook = Boolean(String(e.RAZORPAY_WEBHOOK_SECRET || '').trim());
  const upiVpa = Boolean(String(e.CSO_UPI_VPA || e.UPI_VPA || '').trim());
  return {
    razorpay_ready: rzKey && rzSec,
    razorpay_key_id_present: rzKey,
    razorpay_key_secret_present: rzSec,
    razorpay_webhook_secret_present: rzHook,
    upi_ready: upiVpa
  };
}

function parseFeatures(raw) {
  if (Array.isArray(raw)) {
    return raw.map(x => String(x || '').trim()).filter(Boolean).slice(0, 30);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) return arr.map(x => String(x || '').trim()).filter(Boolean).slice(0, 30);
      } catch { /* fall through */ }
    }
    return trimmed.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 30);
  }
  return [];
}

// ============================================================================
// ADMIN API: /api/admin/billing-ads/*
// ============================================================================
export async function handleAdminBillingAdsApi(request, env, actor, section, id, ctx) {
  await ensureBillingAdsSchema(env.DB);
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  // 1. GET /api/admin/billing-ads/overview (or root GET)
  if ((!section || section === 'overview') && !id && method === 'GET') {
    const [adRow, planRow, coupRow, ordRow] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(active), 0) AS active, COALESCE(SUM(impressions), 0) AS impressions, COALESCE(SUM(clicks), 0) AS clicks FROM ad_slots').first(),
      db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(active), 0) AS active FROM monetization_plans').first(),
      db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(active), 0) AS active, COALESCE(SUM(used_count), 0) AS uses FROM payment_coupons').first(),
      db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_count, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_inr ELSE 0 END), 0) AS paid_revenue_inr FROM payment_orders").first()
    ]);

    return json({
      ok: true,
      gateway_readiness: getGatewayReadiness(env),
      slot_keys: CANONICAL_AD_SLOTS,
      stats: {
        ads_total: Number((adRow && adRow.total) || 0),
        ads_active: Number((adRow && adRow.active) || 0),
        total_impressions: Number((adRow && adRow.impressions) || 0),
        total_clicks: Number((adRow && adRow.clicks) || 0),
        plans_total: Number((planRow && planRow.total) || 0),
        plans_active: Number((planRow && planRow.active) || 0),
        coupons_total: Number((coupRow && coupRow.total) || 0),
        coupons_active: Number((coupRow && coupRow.active) || 0),
        coupons_used: Number((coupRow && coupRow.uses) || 0),
        orders_total: Number((ordRow && ordRow.total) || 0),
        orders_paid: Number((ordRow && ordRow.paid_count) || 0),
        paid_revenue_inr: Number((ordRow && ordRow.paid_revenue_inr) || 0)
      }
    });
  }

  // 2. Ad Slots CRUD: /api/admin/billing-ads/ads[/:id]
  if (section === 'ads') {
    if (!id && method === 'GET') {
      const { results } = await db.prepare(
        'SELECT * FROM ad_slots ORDER BY active DESC, created_at DESC LIMIT 200'
      ).all();
      return json({ ok: true, items: results || [], total: (results || []).length, slot_keys: CANONICAL_AD_SLOTS });
    }

    if (!id && method === 'POST') {
      const body = await readJson(request, 20000);
      const slotKey = cleanStr(body.slot_key, 80, { required: true });
      const title = cleanStr(body.title, 180, { required: true });
      if (!slotKey || !title) throw validationError({ title: 'Slot key and banner title are required.' });

      const imageUrl = validateSafeUrl(body.image_url, 'image_url', true);
      const targetUrl = validateSafeUrl(body.target_url, 'target_url', false);
      const badgeText = cleanStr(body.badge_text, 40) || 'Sponsored';
      const startsAt = cleanStr(body.starts_at, 40) || '';
      const endsAt = cleanStr(body.ends_at, 40) || '';
      const active = body.active === false || Number(body.active) === 0 ? 0 : 1;

      const newId = `ad_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const nowIso = new Date().toISOString();
      await db.prepare(
        `INSERT INTO ad_slots (id, slot_key, title, image_url, target_url, badge_text, starts_at, ends_at, active, impressions, clicks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
      ).bind(newId, slotKey, title, imageUrl, targetUrl, badgeText, startsAt, endsAt, active, nowIso).run();

      recordAdminAuditLog(env, request, actor, 'billing_ads.ad.create', newId, { slot_key: slotKey, title }, ctx);
      const item = await db.prepare('SELECT * FROM ad_slots WHERE id = ?').bind(newId).first();
      return json({ ok: true, id: newId, item }, 201);
    }

    if (id && method === 'PUT') {
      const existing = await db.prepare('SELECT * FROM ad_slots WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Ad slot not found');
      const body = await readJson(request, 20000);

      const slotKey = body.slot_key !== undefined ? cleanStr(body.slot_key, 80, { required: true }) : existing.slot_key;
      const title = body.title !== undefined ? cleanStr(body.title, 180, { required: true }) : existing.title;
      const imageUrl = body.image_url !== undefined ? validateSafeUrl(body.image_url, 'image_url', true) : existing.image_url;
      const targetUrl = body.target_url !== undefined ? validateSafeUrl(body.target_url, 'target_url', false) : existing.target_url;
      const badgeText = body.badge_text !== undefined ? (cleanStr(body.badge_text, 40) || 'Sponsored') : existing.badge_text;
      const startsAt = body.starts_at !== undefined ? (cleanStr(body.starts_at, 40) || '') : existing.starts_at;
      const endsAt = body.ends_at !== undefined ? (cleanStr(body.ends_at, 40) || '') : existing.ends_at;
      const active = body.active !== undefined ? (body.active === false || Number(body.active) === 0 ? 0 : 1) : existing.active;

      await db.prepare(
        `UPDATE ad_slots
         SET slot_key = ?, title = ?, image_url = ?, target_url = ?, badge_text = ?, starts_at = ?, ends_at = ?, active = ?
         WHERE id = ?`
      ).bind(slotKey, title, imageUrl, targetUrl, badgeText, startsAt, endsAt, active, id).run();

      recordAdminAuditLog(env, request, actor, 'billing_ads.ad.update', id, { slot_key: slotKey, active }, ctx);
      const item = await db.prepare('SELECT * FROM ad_slots WHERE id = ?').bind(id).first();
      return json({ ok: true, id, item });
    }

    if (id && method === 'DELETE') {
      const existing = await db.prepare('SELECT id FROM ad_slots WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Ad slot not found');
      await db.prepare('DELETE FROM ad_slots WHERE id = ?').bind(id).run();
      recordAdminAuditLog(env, request, actor, 'billing_ads.ad.delete', id, null, ctx);
      return json({ ok: true, id, deleted: true });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // 3. Monetization Plans CRUD: /api/admin/billing-ads/plans[/:id]
  if (section === 'plans') {
    if (!id && method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM monetization_plans ORDER BY active DESC, price_inr ASC').all();
      return json({
        ok: true,
        items: (results || []).map(r => ({ ...r, features: parseFeatures(r.features_json) })),
        total: (results || []).length
      });
    }

    if (!id && method === 'POST') {
      const body = await readJson(request, 20000);
      const name = cleanStr(body.name, 140, { required: true });
      if (!name) throw validationError({ name: 'Plan name is required.' });
      const slug = cleanStr(body.slug, 80).toLowerCase() || slugify(name) || `plan-${Date.now().toString(36)}`;
      if (!SLUG_RE.test(slug)) throw validationError({ slug: 'Slug may contain lowercase letters, numbers, and hyphens only.' });

      const priceInr = Math.max(0, Math.round(Number(body.price_inr || 0)));
      const validityDays = Math.max(1, Math.min(3650, Math.round(Number(body.validity_days || 30))));
      const features = parseFeatures(body.features !== undefined ? body.features : body.features_json);
      const active = body.active === false || Number(body.active) === 0 ? 0 : 1;

      const dup = await db.prepare('SELECT id FROM monetization_plans WHERE slug = ?').bind(slug).first();
      if (dup) throw validationError({ slug: 'A monetization plan with this slug already exists.' });

      const newId = `plan_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
      await db.prepare(
        `INSERT INTO monetization_plans (id, slug, name, price_inr, validity_days, features_json, active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId, slug, name, priceInr, validityDays, JSON.stringify(features), active).run();

      recordAdminAuditLog(env, request, actor, 'billing_ads.plan.create', newId, { slug, price_inr: priceInr }, ctx);
      const item = await db.prepare('SELECT * FROM monetization_plans WHERE id = ?').bind(newId).first();
      return json({ ok: true, id: newId, item: { ...item, features } }, 201);
    }

    if (id && method === 'PUT') {
      const existing = await db.prepare('SELECT * FROM monetization_plans WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Plan not found');
      const body = await readJson(request, 20000);

      const name = body.name !== undefined ? cleanStr(body.name, 140, { required: true }) : existing.name;
      const slug = body.slug !== undefined ? cleanStr(body.slug, 80).toLowerCase() : existing.slug;
      if (!SLUG_RE.test(slug)) throw validationError({ slug: 'Invalid slug format.' });
      const priceInr = body.price_inr !== undefined ? Math.max(0, Math.round(Number(body.price_inr))) : existing.price_inr;
      const validityDays = body.validity_days !== undefined ? Math.max(1, Math.min(3650, Math.round(Number(body.validity_days)))) : existing.validity_days;
      const features = (body.features !== undefined || body.features_json !== undefined)
        ? parseFeatures(body.features !== undefined ? body.features : body.features_json)
        : parseFeatures(existing.features_json);
      const active = body.active !== undefined ? (body.active === false || Number(body.active) === 0 ? 0 : 1) : existing.active;

      await db.prepare(
        `UPDATE monetization_plans SET slug = ?, name = ?, price_inr = ?, validity_days = ?, features_json = ?, active = ? WHERE id = ?`
      ).bind(slug, name, priceInr, validityDays, JSON.stringify(features), active, id).run();

      recordAdminAuditLog(env, request, actor, 'billing_ads.plan.update', id, { slug, active }, ctx);
      const item = await db.prepare('SELECT * FROM monetization_plans WHERE id = ?').bind(id).first();
      return json({ ok: true, id, item: { ...item, features } });
    }

    if (id && method === 'DELETE') {
      const existing = await db.prepare('SELECT id FROM monetization_plans WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Plan not found');
      await db.prepare('DELETE FROM monetization_plans WHERE id = ?').bind(id).run();
      recordAdminAuditLog(env, request, actor, 'billing_ads.plan.delete', id, null, ctx);
      return json({ ok: true, id, deleted: true });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // 4. Promo Coupons CRUD: /api/admin/billing-ads/coupons[/:id]
  if (section === 'coupons') {
    if (!id && method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM payment_coupons ORDER BY active DESC, code ASC').all();
      return json({ ok: true, items: results || [], total: (results || []).length });
    }

    if (!id && method === 'POST') {
      const body = await readJson(request, 20000);
      const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
      if (!code || code.length < 3) throw validationError({ code: 'Coupon code must be at least 3 alphanumeric characters.' });
      const discountType = body.discount_type === 'flat' ? 'flat' : 'percent';
      const discountValue = Number(body.discount_value || 0);
      if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percent' && discountValue > 100)) {
        throw validationError({ discount_value: discountType === 'percent' ? 'Percent discount must be 1–100.' : 'Flat discount must be > 0.' });
      }
      const maxUses = Math.max(0, Math.floor(Number(body.max_uses || 0)));
      const expiresAt = cleanStr(body.expires_at, 40) || '';
      const active = body.active === false || Number(body.active) === 0 ? 0 : 1;

      const dup = await db.prepare('SELECT id FROM payment_coupons WHERE code = ?').bind(code).first();
      if (dup) throw validationError({ code: 'Coupon code already exists.' });

      const newId = `cpn_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
      await db.prepare(
        `INSERT INTO payment_coupons (id, code, discount_type, discount_value, max_uses, used_count, expires_at, active)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      ).bind(newId, code, discountType, discountValue, maxUses, expiresAt, active).run();

      recordAdminAuditLog(env, request, actor, 'billing_ads.coupon.create', newId, { code, discount_type: discountType, discount_value: discountValue }, ctx);
      const item = await db.prepare('SELECT * FROM payment_coupons WHERE id = ?').bind(newId).first();
      return json({ ok: true, id: newId, item }, 201);
    }

    if (id && method === 'PUT') {
      const existing = await db.prepare('SELECT * FROM payment_coupons WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Coupon not found');
      const body = await readJson(request, 20000);

      const discountType = body.discount_type !== undefined ? (body.discount_type === 'flat' ? 'flat' : 'percent') : existing.discount_type;
      const discountValue = body.discount_value !== undefined ? Number(body.discount_value) : existing.discount_value;
      const maxUses = body.max_uses !== undefined ? Math.max(0, Math.floor(Number(body.max_uses))) : existing.max_uses;
      const expiresAt = body.expires_at !== undefined ? (cleanStr(body.expires_at, 40) || '') : existing.expires_at;
      const active = body.active !== undefined ? (body.active === false || Number(body.active) === 0 ? 0 : 1) : existing.active;

      await db.prepare(
        `UPDATE payment_coupons SET discount_type = ?, discount_value = ?, max_uses = ?, expires_at = ?, active = ? WHERE id = ?`
      ).bind(discountType, discountValue, maxUses, expiresAt, active, id).run();

      recordAdminAuditLog(env, request, actor, 'billing_ads.coupon.update', id, { code: existing.code, active }, ctx);
      const item = await db.prepare('SELECT * FROM payment_coupons WHERE id = ?').bind(id).first();
      return json({ ok: true, id, item });
    }

    if (id && method === 'DELETE') {
      const existing = await db.prepare('SELECT id FROM payment_coupons WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Coupon not found');
      await db.prepare('DELETE FROM payment_coupons WHERE id = ?').bind(id).run();
      recordAdminAuditLog(env, request, actor, 'billing_ads.coupon.delete', id, null, ctx);
      return json({ ok: true, id, deleted: true });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // 5. Real Payment Orders Ledger: /api/admin/billing-ads/orders[/:id]
  if (section === 'orders') {
    if (!id && method === 'GET') {
      const status = (url.searchParams.get('status') || '').trim().toLowerCase();
      const where = status && ORDER_STATUSES.includes(status) ? 'WHERE status = ?' : '';
      const binds = where ? [status] : [];
      const { results } = await db.prepare(
        `SELECT o.*, p.name AS plan_name
         FROM payment_orders o
         LEFT JOIN monetization_plans p ON p.id = o.plan_id
         ${where}
         ORDER BY o.created_at DESC LIMIT 200`
      ).bind(...binds).all();

      return json({
        ok: true,
        items: results || [],
        total: (results || []).length,
        gateway_readiness: getGatewayReadiness(env)
      });
    }

    if (id && method === 'PUT') {
      const existing = await db.prepare('SELECT * FROM payment_orders WHERE id = ?').bind(id).first();
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
      const body = await readJson(request, 10000);
      const nextStatus = String(body.status || '').trim().toLowerCase();
      if (!ORDER_STATUSES.includes(nextStatus)) {
        throw validationError({ status: 'Status must be created, pending, paid, failed, or refunded.' });
      }
      const gwPayId = body.gateway_payment_id !== undefined ? cleanStr(body.gateway_payment_id, 120) : existing.gateway_payment_id;
      await db.prepare('UPDATE payment_orders SET status = ?, gateway_payment_id = ? WHERE id = ?')
        .bind(nextStatus, gwPayId, id).run();
      recordAdminAuditLog(env, request, actor, 'billing_ads.order.update', id, { from: existing.status, to: nextStatus }, ctx);
      const item = await db.prepare('SELECT * FROM payment_orders WHERE id = ?').bind(id).first();
      return json({ ok: true, id, item });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown billing-ads route');
}
