// GET /api/media/<key> — public, immutable-cached R2 delivery.
import { json } from '../../_lib/http.js';

const KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/;
const SAFE_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

export async function handleMedia(request, env, ctx) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET, HEAD' });
  }
  const key = decodeURIComponent(new URL(request.url).pathname.replace(/^\/api\/media\//, ''));
  if (!KEY_RE.test(key) || !env.MEDIA) return json({ error: 'Not found', code: 'NOT_FOUND' }, 404);

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(new URL(request.url).origin + '/api/media/' + key, { method: 'GET' });
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return request.method === 'HEAD' ? new Response(null, hit) : hit;
  }
  const obj = await env.MEDIA.get(key);
  if (!obj) return json({ error: 'Not found', code: 'NOT_FOUND' }, 404);

  const ext = key.split('.').pop();
  const headers = {
    'Content-Type': SAFE_TYPES[ext],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Length': String(obj.size),
    ETag: `"${obj.httpEtag ? obj.httpEtag.replace(/"/g, '') : key}"`
  };
  headers['Content-Disposition'] = ext === 'pdf' ? 'inline; filename="notification.pdf"' : 'inline';
  if (ext === 'pdf') delete headers['Content-Security-Policy']; // sandbox CSP would break in-browser PDF viewers
  const res = new Response(obj.body, { status: 200, headers });
  if (cache && ctx && request.method === 'GET') ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return request.method === 'HEAD' ? new Response(null, res) : res;
}
