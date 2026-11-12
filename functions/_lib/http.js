// Shared HTTP helpers for CMS routes. Error shape is always { error, code }.
export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

export function errorResponse(e) {
  if (e instanceof HttpError) {
    const headers = e.extra && e.extra.retryAfter ? { 'Retry-After': String(e.extra.retryAfter) } : {};
    const body = { error: e.message, code: e.code };
    if (e.extra && e.extra.fields) body.fields = e.extra.fields;
    return json(body, e.status, headers);
  }
  console.error('Unhandled CMS error:', e && e.stack || e);
  return json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
}

export async function readJson(request, maxBytes = 2_000_000) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  let text;
  try { text = await request.text(); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Unreadable request body'); }
  if (text.length > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  try {
    const v = JSON.parse(text || '{}');
    if (v === null || typeof v !== 'object') throw new Error('not object');
    return v;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
}

export function validationError(fields) {
  const first = Object.values(fields)[0];
  return new HttpError(422, 'VALIDATION_ERROR', first || 'Validation failed', { fields });
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
}
