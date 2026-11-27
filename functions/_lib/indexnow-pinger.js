/**
 * Common Sense Odisha — IndexNow Verification Key & Auto-Ping on Publish (v393)
 * - Serves GET /<INDEXNOW_KEY>.txt with exact plain-text key verification body
 * - Non-blocking `pingIndexNowUrls(env, urls, ctx)` via ctx.waitUntil with 5s AbortController timeout
 * - Admin-authenticated manual re-ping via POST /api/admin/seo/ping-indexnow
 */
import { json, readJson, validationError } from './http.js';

export const DEFAULT_INDEXNOW_KEY = 'cso2026indexnow8f3a9d4e7b1c5024';
export const INDEXNOW_HOST = 'csodisha.com';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export function getIndexNowKey(env) {
  const fromEnv = env && typeof env.INDEXNOW_KEY === 'string' ? env.INDEXNOW_KEY.trim() : '';
  return /^[a-zA-Z0-9-]{8,128}$/.test(fromEnv) ? fromEnv : DEFAULT_INDEXNOW_KEY;
}

export function isIndexNowKeyPath(pathname, env) {
  const key = getIndexNowKey(env);
  return pathname === `/${key}.txt`;
}

export function handleIndexNowKeyTxt(env) {
  const key = getIndexNowKey(env);
  return new Response(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function normalizeUrlList(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of (Array.isArray(urls) ? urls : [urls])) {
    const s = String(raw || '').trim();
    if (!s) continue;
    let abs = s;
    if (s.startsWith('/') && !s.startsWith('//')) {
      abs = `https://${INDEXNOW_HOST}${s}`;
    }
    if (!/^https:\/\/csodisha\.com\//i.test(abs) && abs !== `https://${INDEXNOW_HOST}`) continue;
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
    if (out.length >= 100) break;
  }
  return out;
}

/**
 * Queues a non-blocking IndexNow JSON POST (5s AbortController timeout) via ctx.waitUntil.
 * Never throws or blocks Admin Studio publish latency.
 */
export function pingIndexNowUrls(env, urls, ctx = null) {
  const key = getIndexNowKey(env);
  const urlList = normalizeUrlList(urls);
  if (!urlList.length) {
    return { queued: false, urls: [], reason: 'no_valid_urls' };
  }
  const keyLocation = `https://${INDEXNOW_HOST}/${key}.txt`;
  const payload = {
    host: INDEXNOW_HOST,
    key,
    keyLocation,
    urlList
  };

  const task = (async () => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });
      return { ok: res.ok || res.status === 202, status: res.status };
    } catch {
      return { ok: false, status: 0 };
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  }
  return { queued: true, key_location: keyLocation, urls: urlList };
}

/**
 * POST /api/admin/seo/ping-indexnow
 * Body: { urls: ["/jobs/...", "https://csodisha.com/guides/..."] }
 */
export async function handleAdminPingIndexNow(request, env, ctx = null) {
  const body = await readJson(request, 32000);
  const rawUrls = Array.isArray(body && body.urls)
    ? body.urls
    : (body && body.url ? [body.url] : []);
  const urlList = normalizeUrlList(rawUrls);
  if (!urlList.length) {
    throw validationError({ urls: 'Provide at least one valid https://csodisha.com/... or /... URL to ping.' });
  }
  const result = pingIndexNowUrls(env, urlList, ctx);
  return json({ ok: true, indexnow: result });
}
