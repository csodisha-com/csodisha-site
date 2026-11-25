// Public Ad Slot Delivery & Real Impression/Click Telemetry API (v312)
//   GET  /api/public/ads         (optional ?slot_key=... or ?slots=key1,key2) -> active in-window ad slots
//   POST /api/public/ads/track   ({ id, event: 'impression' | 'click' })      -> increments real D1 counters
import { HttpError, json, readJson, validationError, errorResponse } from '../../_lib/http.js';
import { ensureBillingAdsSchema } from '../admin/billing-ads.js';

function isSlotWithinWindow(slot, nowMs, todayStr) {
  const startRaw = String(slot.starts_at || '').trim();
  if (startRaw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(startRaw)) {
      if (startRaw > todayStr) return false;
    } else {
      const ts = Date.parse(startRaw);
      if (Number.isFinite(ts) && ts > nowMs) return false;
    }
  }
  const endRaw = String(slot.ends_at || '').trim();
  if (endRaw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
      if (endRaw < todayStr) return false;
    } else {
      const ts = Date.parse(endRaw);
      if (Number.isFinite(ts) && ts < nowMs) return false;
    }
  }
  return true;
}

export async function handlePublicAdsApi(request, env, sub = '') {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
    await ensureBillingAdsSchema(env.DB);
    const method = request.method;
    const url = new URL(request.url);

    // 1. GET /api/public/ads
    if (!sub && (method === 'GET' || method === 'HEAD')) {
      const slotKey = (url.searchParams.get('slot_key') || '').trim();
      const slotsCsv = (url.searchParams.get('slots') || '').trim();
      const wantedSlots = new Set();
      if (slotKey) wantedSlots.add(slotKey);
      if (slotsCsv) {
        slotsCsv.split(',').map(s => s.trim()).filter(Boolean).forEach(s => wantedSlots.add(s));
      }

      const { results } = await env.DB.prepare(
        `SELECT id, slot_key, title, image_url, target_url, badge_text, starts_at, ends_at, active, impressions, clicks, created_at
         FROM ad_slots
         WHERE active = 1
         ORDER BY created_at DESC LIMIT 50`
      ).all();

      const nowMs = Date.now();
      const todayStr = new Date(nowMs).toISOString().slice(0, 10);

      const items = (results || []).filter(r => {
        if (!isSlotWithinWindow(r, nowMs, todayStr)) return false;
        if (wantedSlots.size > 0 && !wantedSlots.has(r.slot_key)) return false;
        return true;
      }).map(r => ({
        id: String(r.id),
        slot_key: String(r.slot_key),
        title: String(r.title || ''),
        image_url: String(r.image_url || ''),
        target_url: String(r.target_url || ''),
        badge_text: String(r.badge_text || 'Sponsored'),
        rel: 'sponsored noopener noreferrer',
        starts_at: String(r.starts_at || ''),
        ends_at: String(r.ends_at || '')
      }));

      return json({ ok: true, items, total: items.length });
    }

    // 2. POST /api/public/ads/track — record real impression or outbound click
    if (sub === 'track' && method === 'POST') {
      const body = await readJson(request, 8000);
      const id = String(body.id || '').trim();
      const event = String(body.event || '').trim().toLowerCase();
      if (!id) throw validationError({ id: 'Ad slot id is required.' });
      if (event !== 'impression' && event !== 'click') {
        throw validationError({ event: 'event must be impression or click.' });
      }

      const col = event === 'click' ? 'clicks' : 'impressions';
      const upd = await env.DB.prepare(
        `UPDATE ad_slots SET ${col} = ${col} + 1 WHERE id = ? AND active = 1`
      ).bind(id).run();
      const changes = Number((upd && upd.meta && upd.meta.changes) || (upd && upd.changes) || 0);
      if (!changes) {
        return json({ ok: false, error: 'Active ad slot not found' }, 404, { 'Cache-Control': 'no-store' });
      }

      const row = await env.DB.prepare('SELECT id, impressions, clicks FROM ad_slots WHERE id = ?').bind(id).first();
      return json({
        ok: true,
        id,
        event,
        impressions: Number((row && row.impressions) || 0),
        clicks: Number((row && row.clicks) || 0)
      }, 200, { 'Cache-Control': 'no-store' });
    }

    throw new HttpError(404, 'NOT_FOUND', 'Unknown public ads route');
  } catch (err) {
    return errorResponse(err);
  }
}
