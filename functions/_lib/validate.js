// Input normalisation helpers. Everything returns cleaned values or records a field error.
export const STATUSES = ['draft', 'published', 'scheduled', 'expired', 'archived'];

export function cleanStr(v, max, { required = false, multiline = false } = {}) {
  if (v === undefined || v === null) return required ? null : '';
  let s = String(v).replace(/\u0000/g, '');
  s = multiline ? s.replace(/\r\n?/g, '\n') : s.replace(/[\r\n\t]+/g, ' ');
  s = s.trim();
  if (required && !s) return null;
  return s.length > max ? s.slice(0, max + 1) : s; // +1 lets callers detect overflow
}

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Accepts ISO-8601 (with Z/offset) or 'YYYY-MM-DD HH:MM[:SS]' as UTC; returns UTC 'YYYY-MM-DD HH:MM:SS'.
export function toUtcSql(input) {
  if (!input) return null;
  const s = String(input).trim();
  const withTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z';
  const d = new Date(withTz);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function nowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// Resolve status + published_at. Returns { status, published_at } or sets errors.
export function resolveStatus(body, existing, errors) {
  const status = body.status === undefined ? (existing ? existing.status : 'draft') : String(body.status);
  if (!STATUSES.includes(status)) { errors.status = 'Status must be draft, published, scheduled, expired or archived'; return {}; }
  let published_at = existing ? existing.published_at : null;
  if (body.published_at !== undefined && body.published_at !== null && body.published_at !== '') {
    published_at = toUtcSql(body.published_at);
    if (!published_at) { errors.published_at = 'Invalid publish date/time'; return {}; }
  }
  if (status === 'scheduled') {
    if (!published_at || published_at <= nowSql()) { errors.published_at = 'Scheduled posts need a future publish date/time'; return {}; }
  } else if (status === 'published' || status === 'expired') {
    if (!published_at || (existing && existing.status !== 'published' && existing.status !== 'expired' && body.published_at === undefined)) published_at = nowSql();
  } else if (body.published_at === '' || body.published_at === null) {
    published_at = null;
  }
  return { status, published_at };
}

// Public-visibility SQL fragment (scheduled items go live at query time; expired jobs stay visible for SEO with closed badge).
export const PUBLIC_VISIBLE_SQL = `deleted_at IS NULL AND (status IN ('published', 'expired') OR (status = 'scheduled' AND published_at <= datetime('now')))`;

export function likeEscape(q) {
  return '%' + String(q).replace(/[\\%_]/g, m => '\\' + m) + '%';
}

export function parsePaging(url, defLimit = 20, maxLimit = 50) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(url.searchParams.get('limit') || String(defLimit), 10) || defLimit));
  return { page, limit, offset: (page - 1) * limit };
}
