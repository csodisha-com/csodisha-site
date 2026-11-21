/* v162: server-side pre-rendering of live job / scheme cards (zero "Loading…" on first paint).
   Pure string helpers: no inline <style>, style="", executable <script>, event attributes or innerHTML.
   Card DOM mirrors the client renderers in jobs-careers/assets/dashboard.js, jobs-careers/assets/hub.js
   and schemes/assets/schemes-explorer.js so hydration is seamless (no layout shift). */
import { PUBLIC_VISIBLE_SQL } from './validate.js';
import { HUBS, ORIGIN } from './career-hubs-data.js';

export const JOBS_SSR_LIMIT = 12;
export const HUB_SSR_LIMIT = 15;
export const HUB_POOL_LIMIT = 250;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonArr(v) {
  try {
    const p = JSON.parse(v || '[]');
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function mediaUrl(key) {
  if (!key) return null;
  const s = String(key);
  return s.startsWith('external:') ? s.slice(9) : `/api/media/${s}`;
}

export function safeHref(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : '';
}

export const JOB_LIST_COLS = `id, type, slug, title, title_or, summary, summary_or, category, tags, goal_exam_ids, cover_media_key, status, published_at, event_date,
  organisation, vacancies, qualification, last_date, apply_url, notification_media_key, state, age_limit, salary_pay, source_url`;

export const JOB_ORDER_SQL = "(last_date IS NULL OR last_date < date('now')) ASC, last_date ASC, published_at DESC";

/** Same public shape as /api/content/jobs items. */
export function shapeJob(r, todayIso = new Date().toISOString().slice(0, 10)) {
  const expired = r.status === 'expired' || Boolean(r.last_date && r.last_date < todayIso);
  return {
    id: r.id, slug: r.slug, title: r.title, title_or: r.title_or, summary: r.summary,
    category: r.category, tags: safeJsonArr(r.tags), published_at: r.published_at,
    organisation: r.organisation, vacancies: r.vacancies, qualification: r.qualification, last_date: r.last_date,
    apply_url: r.apply_url, notification_url: mediaUrl(r.notification_media_key), state: r.state,
    expired
  };
}

export function formatDateEn(iso) {
  if (!iso) return '';
  const s = String(iso).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const mo = Number(m[2]) - 1;
    if (mo >= 0 && mo < 12) return `${Number(m[3])} ${MONTHS[mo]} ${Number(m[1])}`;
  }
  return s;
}

/** Mirrors formatDeadlineBadge() in dashboard.js (deadline-based states computed in UTC). */
export function deadlineBadge(job, now = new Date()) {
  if (job.expired || job.status === 'expired') {
    const f = formatDateEn(job.last_date);
    return { cls: 'cso-dl-closed', label: f ? `Application Closed (${f})` : 'Application Closed' };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(job.last_date || '').trim());
  if (!m) return job.last_date ? { cls: 'cso-dl-normal', label: formatDateEn(job.last_date) } : null;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  const diff = target - now.getTime();
  const f = formatDateEn(job.last_date);
  if (diff < 0) return { cls: 'cso-dl-closed', label: `Application Closed (${f})` };
  const days = Math.floor(diff / 86400000);
  if (days === 0) return { cls: 'cso-dl-urgent', label: `Closing Soon · Today (${f})` };
  if (days <= 7) return { cls: 'cso-dl-urgent', label: `Closing Soon · Closes in ${days}d (${f})` };
  return { cls: 'cso-dl-open', label: `Last Date: ${f}` };
}

export function renderJobCard(job, now = new Date()) {
  const slug = String(job.slug || job.id || '');
  const title = job.title || 'Untitled Notification';
  const detailPath = `/jobs-careers/?job=${encodeURIComponent(slug)}`;
  const badges = [];
  if (job.organisation) badges.push(`<span class="live-badge live-badge--org">${escapeHtml(job.organisation)}</span>`);
  if (job.state) badges.push(`<span class="live-badge live-badge--state">${escapeHtml(job.state)}</span>`);
  if (job.category) badges.push(`<span class="live-badge">${escapeHtml(job.category)}</span>`);
  const dl = deadlineBadge(job, now);
  if (dl) {
    const dateAttr = job.last_date ? ` data-deadline="${escapeHtml(job.last_date)}"` : '';
    badges.push(`<span class="live-badge ${escapeHtml(dl.cls)}"${dateAttr}>${escapeHtml(dl.label)}</span>`);
  }

  const vac = (job.vacancies !== null && job.vacancies !== undefined && job.vacancies !== '' && Number.isFinite(Number(job.vacancies)))
    ? `👥 ${Number(job.vacancies).toLocaleString('en-IN')} Vacancies`
    : '👥 Vacancies: Refer PDF';
  const meta = [`<span class="live-meta-pill">${escapeHtml(vac)}</span>`];
  if (job.qualification) meta.push(`<span class="live-meta-pill">${escapeHtml(`🎓 ${job.qualification}`)}</span>`);
  if (job.last_date) meta.push(`<span class="live-meta-pill">${escapeHtml(`⏰ Deadline: ${formatDateEn(job.last_date)}`)}</span>`);
  else if (job.published_at) meta.push(`<span class="live-meta-pill">${escapeHtml(`📅 Published: ${formatDateEn(job.published_at)}`)}</span>`);

  const applyHref = safeHref(job.apply_url) || safeHref(job.notification_url);
  const apply = applyHref
    ? `<a class="live-btn" data-action="apply" href="${escapeHtml(applyHref)}" target="_blank" rel="noopener noreferrer">Apply Online ↗</a>`
    : `<a class="live-btn" data-action="info" href="${escapeHtml(detailPath)}">Official Info</a>`;
  const badge = job.organisation || job.category || 'Job Alert';
  const pdf = safeHref(job.notification_url);
  const save = `<button type="button" class="cso-bookmark-btn live-btn live-btn--save" data-bookmark-type="job" data-bookmark-id="${escapeHtml(slug)}" data-bookmark-title="${escapeHtml(title)}" data-bookmark-badge="${escapeHtml(badge)}" data-bookmark-url="${escapeHtml(detailPath)}"${pdf ? ` data-bookmark-pdf="${escapeHtml(pdf)}"` : ''}${job.last_date ? ` data-bookmark-deadline="${escapeHtml(job.last_date)}"` : ''} data-bookmark-idle="★ Save" data-bookmark-saved="★ Saved" title="Save to your Candidate Hub dashboard"><span class="cso-bm-star" aria-hidden="true">☆</span> <span class="cso-bm-text">★ Save</span></button>`;
  const share = `<button type="button" class="live-btn live-btn--wa" data-action="share" data-title="${escapeHtml(title)}"${job.last_date ? ` data-last-date="${escapeHtml(job.last_date)}"` : ''} aria-label="${escapeHtml(`Share ${title}`)}">📲 Share</button>`;

  return `<article class="live-job-card" data-ssr-card data-job-slug="${escapeHtml(slug)}"><div class="live-job-card__top"><div class="live-job-card__badges">${badges.join('')}</div><h3 class="live-job-card__title">${escapeHtml(title)}</h3>${job.title_or ? `<p class="live-job-card__title-or">${escapeHtml(job.title_or)}</p>` : ''}${job.summary ? `<p class="live-job-card__summary">${escapeHtml(job.summary)}</p>` : ''}<div class="live-job-card__meta">${meta.join('')}</div></div><div class="live-job-card__footer"><a class="live-btn live-btn--primary" data-action="details" href="${escapeHtml(detailPath)}">View Details</a>${apply}${share}${save}</div></article>`;
}

export function renderJobsGrid(jobs, now = new Date()) {
  return jobs.map((j) => renderJobCard(j, now)).join('');
}

function safeLdJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** schema.org ItemList of JobPosting for non-expired jobs. */
export function buildJobsJsonLd(jobs, { listName = 'Live Odisha Recruitment Notices', pageUrl = `${ORIGIN}/jobs-careers/` } = {}) {
  const live = jobs.filter((j) => !j.expired && j.slug);
  if (!live.length) return '';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: pageUrl,
    itemListElement: live.map((job, i) => {
      const posting = {
        '@type': 'JobPosting',
        title: job.title || 'Government Recruitment Notice',
        description: job.summary || job.title || 'Official Odisha and Central recruitment notice.',
        datePosted: String(job.published_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
        employmentType: 'FULL_TIME',
        identifier: { '@type': 'PropertyValue', name: 'Common Sense Odisha', value: String(job.slug) },
        hiringOrganization: { '@type': 'Organization', name: job.organisation || job.category || 'Common Sense Odisha Directory' },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressRegion: job.state || 'Odisha', addressCountry: 'IN' } },
        url: `${ORIGIN}/jobs-careers/?job=${encodeURIComponent(job.slug)}`
      };
      if (job.last_date) posting.validThrough = job.last_date;
      return { '@type': 'ListItem', position: i + 1, item: posting };
    })
  };
  return `<script type="application/ld+json" id="cso-jobposting-jsonld">${safeLdJson(data)}</script>`;
}

export function jobHaystack(job) {
  const tags = Array.isArray(job.tags) ? job.tags.join(' ') : '';
  return [job.title, job.summary, job.organisation, job.category, job.qualification, tags].join(' ').toLowerCase();
}

export function hubForPath(pathname) {
  const m = /^\/jobs-careers\/([a-z0-9-]+)\/?(?:index\.html)?$/.exec(pathname);
  return m ? HUBS.find((h) => h.slug === m[1]) || null : null;
}

export function filterJobsForHub(jobs, hub) {
  let re = null;
  try { re = new RegExp(hub.pattern, 'i'); } catch { re = null; }
  return re ? jobs.filter((j) => re.test(jobHaystack(j))) : jobs;
}

/* ---------- HTML injection (pure string transforms, testable in Node) ---------- */
function replaceElementById(html, id, tag, build) {
  const re = new RegExp(`<${tag}\\b([^>]*\\bid="${id}"[^>]*)>([\\s\\S]*?)</${tag}>`);
  return html.replace(re, (m, attrs) => build(attrs));
}

export function injectJobsFeed(html, { ids, jobs, total, shown = jobs.length, ld = '', moreHtml = '', now = new Date() }) {
  if (!jobs.length) return html;
  let out = html;
  const cards = renderJobsGrid(jobs, now);
  out = replaceElementById(out, ids.grid, 'div', (attrs) => `<div${attrs} data-ssr="1" data-ssr-count="${jobs.length}">${cards}</div>`);
  out = replaceElementById(out, ids.status, 'div', (attrs) => `<div${attrs.replace(/\shidden\b/, '')} hidden></div>`);
  const countText = `${Number(total).toLocaleString('en-IN')} ${Number(total) === 1 ? 'Active Notice' : 'Active Notices'}`;
  out = replaceElementById(out, ids.count, 'span', (attrs) => `<span${attrs}>${escapeHtml(countText)}</span>`);
  if (ids.more && moreHtml) {
    out = replaceElementById(out, ids.more, 'div', (attrs) => `<div${attrs.replace(/\shidden\b/, '')}>${moreHtml}</div>`);
  }
  if (ld && !out.includes('id="cso-jobposting-jsonld"')) out = out.replace('</head>', () => `  ${ld}\n</head>`);
  return out;
}

export function hubMoreButton(remaining) {
  return remaining > 0
    ? `<button type="button" id="hub-more-btn" class="live-btn live-btn--primary">Show more notices (${remaining})</button>`
    : '';
}

/* ---------- D1 fetch ---------- */
export async function fetchLiveJobs(db, limit) {
  const rows = await db.prepare(
    `SELECT ${JOB_LIST_COLS} FROM posts WHERE type = 'job' AND ${PUBLIC_VISIBLE_SQL} ORDER BY ${JOB_ORDER_SQL} LIMIT ?`
  ).bind(limit).all();
  return (rows.results || []).map((r) => shapeJob(r));
}

export async function countLiveJobs(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE type = 'job' AND ${PUBLIC_VISIBLE_SQL}`).first();
  return Number(row && row.n) || 0;
}

/** Rewrites /jobs-careers/ (landing) or a Career Hub page; returns the original response when nothing to inject. */
export async function hydrateJobsFeedResponse(res, pathname, url, env) {
  const db = env && env.DB;
  if (!db) return res;
  const isLanding = pathname === '/jobs-careers/' || pathname === '/jobs-careers/index.html';
  const hub = isLanding ? null : hubForPath(pathname);
  if (!isLanding && !hub) return res;
  try {
    let patch;
    if (isLanding) {
      if (url && (url.searchParams.get('q') || url.searchParams.get('job'))) return res;
      const [jobs, total] = await Promise.all([fetchLiveJobs(db, JOBS_SSR_LIMIT), countLiveJobs(db)]);
      if (!jobs.length) return res;
      patch = { ids: { grid: 'live-jobs-grid', status: 'live-jobs-status', count: 'live-jobs-count' }, jobs, total, ld: buildJobsJsonLd(jobs) };
    } else {
      const pool = filterJobsForHub(await fetchLiveJobs(db, HUB_POOL_LIMIT), hub);
      const shown = pool.slice(0, HUB_SSR_LIMIT);
      if (!shown.length) return res;
      patch = {
        ids: { grid: 'hub-grid', status: 'hub-status', count: 'hub-count', more: 'hub-more' },
        jobs: shown, total: pool.length,
        moreHtml: hubMoreButton(pool.length - shown.length),
        ld: buildJobsJsonLd(shown, { listName: `${hub.title} — live notices`, pageUrl: `${ORIGIN}/jobs-careers/${hub.slug}/` })
      };
    }
    const html = await res.text();
    const out = injectJobsFeed(html, patch);
    const headers = new Headers(res.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    return new Response(out, { status: res.status, statusText: res.statusText, headers });
  } catch {
    return res;
  }
}

/* ---------- schemes ---------- */
export function renderSchemeCard(it, cleanTitle) {
  const slug = String(it.slug || it.id || '');
  const meta1 = [
    `<span class="cso-schemes-tag">${escapeHtml(it.sponsor_level || 'Odisha State')}</span>`,
    `<span>${escapeHtml(it.department_name || 'Govt of Odisha')}</span>`
  ];
  if (it.benefit_amount) meta1.push(`<span>${escapeHtml(`Benefit: ${it.benefit_amount}`)}</span>`);
  if (it.application_mode) meta1.push(`<span>${escapeHtml(it.application_mode)}</span>`);
  const meta2 = `${it.beneficiary_group ? `Beneficiaries: ${it.beneficiary_group} · ` : ''}${it.summary || ''}`;
  const apply = safeHref(it.official_apply_url);
  const actions = [`<a class="cso-schemes-btn cso-schemes-btn-primary" href="/schemes/item/${escapeHtml(encodeURIComponent(slug))}/">View Details</a>`];
  if (apply) actions.push(`<a class="cso-schemes-btn" href="${escapeHtml(apply)}" target="_blank" rel="noopener noreferrer">Apply Online ↗</a>`);
  return `<article class="cso-schemes-item-card" data-scheme-slug="${escapeHtml(slug)}"><div class="cso-schemes-item-meta">${meta1.join('')}</div><h3 class="cso-schemes-item-title">${escapeHtml(cleanTitle || it.title)}</h3><div class="cso-schemes-item-meta">${escapeHtml(meta2)}</div><div class="cso-schemes-item-actions">${actions.join('')}</div></article>`;
}
