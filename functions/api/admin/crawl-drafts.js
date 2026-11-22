import { HttpError, json, errorResponse, readJson } from '../../_lib/http.js';
import { requireRole, STAFF_ROLES } from '../../_lib/rbac.js';

const GOV_DOMAIN_RE = /(^|\.)(gov\.in|nic\.in|odisha\.gov\.in)$/i;

export async function ensureCrawlDraftsSchema(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS crawl_gov_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      official_url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      agency TEXT,
      source_domain TEXT,
      last_date TEXT,
      important_dates TEXT,
      summary TEXT,
      status TEXT DEFAULT 'pending',
      fetched_at TEXT,
      synced_at TEXT
    )`
  ).run();
}

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || !sb || sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

function extractSyncToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  const hdr = request.headers.get('X-Crawl-Sync-Token') || '';
  return hdr.trim();
}

function extractGovDomain(url) {
  const u = String(url || '').trim();
  if (!/^https:\/\/[^\s/]+\.[^\s/]+/i.test(u)) return '';
  try {
    const host = new URL(u).hostname.toLowerCase().replace(/\.$/, '');
    return GOV_DOMAIN_RE.test(host) ? host : '';
  } catch {
    return '';
  }
}

async function authenticateCrawlOrAdmin(request, env, { allowToken = true } = {}) {
  const token = allowToken ? extractSyncToken(request) : '';
  if (token) {
    const configured = String(env.CSO_CRAWL_SYNC_TOKEN || '').trim();
    if (!configured) {
      throw new HttpError(
        401,
        'SYNC_TOKEN_NOT_CONFIGURED',
        'CSO_CRAWL_SYNC_TOKEN is not configured in Cloudflare Pages environment; sign in to Admin Studio or set CSO_CRAWL_SYNC_TOKEN.'
      );
    }
    if (!constantTimeEqual(token, configured)) {
      throw new HttpError(401, 'INVALID_SYNC_TOKEN', 'Invalid crawl sync token');
    }
    return { mode: 'token', userId: 'crawl-sync', role: 'admin' };
  }
  return await requireRole(request, env, STAFF_ROLES);
}

export async function handleCrawlDrafts(request, env) {
  try {
    if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    await ensureCrawlDraftsSchema(env.DB);
    const method = request.method;

    if (method === 'GET') {
      await authenticateCrawlOrAdmin(request, env, { allowToken: true });
      const { results } = await env.DB.prepare(
        `SELECT id, official_url, title, agency, source_domain, last_date, important_dates, summary, status, fetched_at, synced_at
         FROM crawl_gov_drafts
         WHERE status = 'pending'
         ORDER BY COALESCE(fetched_at, synced_at) DESC, id DESC
         LIMIT 100`
      ).all();
      const drafts = (results || []).map(row => {
        let dates = [];
        try {
          const parsed = JSON.parse(row.important_dates || '[]');
          if (Array.isArray(parsed)) dates = parsed;
        } catch {}
        return { ...row, important_dates: dates };
      });
      return json({ ok: true, drafts });
    }

    if (method === 'POST') {
      await authenticateCrawlOrAdmin(request, env, { allowToken: true });
      const body = await readJson(request, 2_000_000);
      const rawList = Array.isArray(body) ? body : (Array.isArray(body.drafts) ? body.drafts : []);
      const nowIso = new Date().toISOString();
      let inserted = 0;
      let updated = 0;

      for (const item of rawList) {
        if (!item || typeof item !== 'object') continue;
        const title = String(item.title || '').trim().slice(0, 150);
        const officialUrl = String(item.official_url || '').trim();
        const domain = extractGovDomain(officialUrl);
        if (!title || !domain) continue;

        const agency = String(item.agency || 'Odisha Govt').trim().slice(0, 120);
        const lastDate = String(item.last_date || '').trim().slice(0, 32);
        const datesJson = JSON.stringify(Array.isArray(item.important_dates) ? item.important_dates : []);
        const summary = String(item.summary || '').trim().slice(0, 500);
        const fetchedAt = String(item.fetched_at || nowIso).trim();

        const existing = await env.DB.prepare(
          `SELECT id FROM crawl_gov_drafts WHERE official_url = ?`
        ).bind(officialUrl).first();

        if (existing) {
          await env.DB.prepare(
            `UPDATE crawl_gov_drafts
             SET title = ?, agency = ?, source_domain = ?, last_date = ?, important_dates = ?, summary = ?, fetched_at = ?, synced_at = ?
             WHERE official_url = ?`
          ).bind(title, agency, domain, lastDate, datesJson, summary, fetchedAt, nowIso, officialUrl).run();
          updated += 1;
        } else {
          await env.DB.prepare(
            `INSERT INTO crawl_gov_drafts
             (official_url, title, agency, source_domain, last_date, important_dates, summary, status, fetched_at, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
          ).bind(officialUrl, title, agency, domain, lastDate, datesJson, summary, fetchedAt, nowIso).run();
          inserted += 1;
        }
      }

      const cntRow = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM crawl_gov_drafts WHERE status = 'pending'`
      ).first();
      return json({ ok: true, inserted, updated, total_pending: Number(cntRow?.n || 0) });
    }

    if (method === 'DELETE') {
      await authenticateCrawlOrAdmin(request, env, { allowToken: false });
      const body = await readJson(request, 50_000);
      const nextStatus = body.status === 'imported' ? 'imported' : 'dismissed';
      const id = Number(body.id || 0);
      const officialUrl = String(body.official_url || '').trim();
      if (id > 0) {
        await env.DB.prepare(`UPDATE crawl_gov_drafts SET status = ? WHERE id = ?`).bind(nextStatus, id).run();
      } else if (officialUrl) {
        await env.DB.prepare(`UPDATE crawl_gov_drafts SET status = ? WHERE official_url = ?`).bind(nextStatus, officialUrl).run();
      } else {
        throw new HttpError(400, 'MISSING_DRAFT_KEY', 'Provide id or official_url');
      }
      return json({ ok: true, status: nextStatus });
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  } catch (e) {
    return errorResponse(e);
  }
}
