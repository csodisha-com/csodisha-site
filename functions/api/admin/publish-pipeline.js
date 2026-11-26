// Phase 2 (v311): Pre-Publish Sanity Check, Single-Click Publish Chain,
// Bulk CSV/JSON Importer (Dry-Run + Commit), and Duplicate-as-Template API.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { invalidateAllPublicCaches } from '../../_lib/edge-cache-invalidator.js';
import { handleSitemapXml } from '../content/_seo.js';
import { recordAdminAuditLog } from './system-ops.js';
import { ensureV311ContentColumns, probeExternalUrl } from '../../_lib/radars-v311.js';
import { scheduleSemanticSync } from '../../_lib/semantic-search.js';

const PILLAR_CONFIG = {
  jobs: {
    table: 'job_articles',
    publicPrefix: '/jobs/?slug=',
    homepageCategory: 'jobs',
    categoryField: 'category_l1_id',
    label: 'Job Alert'
  },
  careers: {
    table: 'careers_articles',
    publicPrefix: '/careers/?slug=',
    homepageCategory: 'education',
    categoryField: 'track_slug',
    label: 'Career Roadmap'
  },
  schemes: {
    table: 'scheme_articles',
    publicPrefix: '/schemes/?slug=',
    homepageCategory: 'schemes',
    categoryField: 'category_l1_id',
    label: 'Government Scheme'
  },
  study: {
    table: 'study_articles',
    publicPrefix: '/study-library/?slug=',
    homepageCategory: 'education',
    categoryField: 'category_l1_id',
    label: 'Study Material'
  }
};

function slugify(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
}

function parseDateMs(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const t = Date.parse(`${s}T23:59:59Z`);
    return Number.isNaN(t) ? null : t;
  }
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function collectUrlsFromItem(item) {
  const keys = [
    'notification_url', 'notification_pdf_url', 'apply_url', 'official_apply_url',
    'official_website_url', 'admit_card_url', 'answer_key_url', 'result_url',
    'syllabus_pdf_url', 'cover_image_url', 'official_portal_url', 'guidelines_pdf_url',
    'application_form_pdf_url', 'notes_pdf_url', 'pyq_pdf_url', 'answer_key_pdf_url'
  ];
  const r2Files = [];
  const externalUrls = [];

  const classify = (field, raw) => {
    const v = String(raw || '').trim();
    if (!v) return;
    if (v.startsWith('/files/')) {
      r2Files.push({ field, url: v, key: v.slice('/files/'.length) });
    } else if (/^https?:\/\//i.test(v)) {
      externalUrls.push({ field, url: v });
    }
  };

  for (const k of keys) classify(k, item[k]);
  if (Array.isArray(item.official_links)) {
    item.official_links.forEach((lk, i) => classify(`official_links[${i}]`, typeof lk === 'string' ? lk : (lk && lk.url)));
  }
  return { r2Files, externalUrls };
}

// ============================================================================
// 1. PRE-PUBLISH SANITY CHECK (`POST /api/admin/sanity-check`)
// ============================================================================
export async function handleSanityCheckApi(request, env, actor, fetchFn = fetch) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'POST required');
  const body = await readJson(request, 200000);
  const pillar = String(body.pillar || '').trim().toLowerCase();
  const cfg = PILLAR_CONFIG[pillar];
  if (!cfg) throw validationError({ pillar: 'Pillar must be jobs, careers, schemes, or study' });

  const item = (body.item && typeof body.item === 'object') ? body.item : {};
  const checks = [];

  // Check 1: Required title, slug & category
  const titleEn = String(item.title_en || item.title || '').trim();
  const slug = slugify(item.slug || titleEn);
  const categoryVal = String(item[cfg.categoryField] || item.category || item.track_slug || '').trim();

  checks.push({
    id: 'title',
    label: 'Required English Title',
    status: titleEn.length >= 4 ? 'pass' : 'fail',
    detail: titleEn.length >= 4 ? `Title ready (${titleEn.length} chars)` : 'Title must be at least 4 characters.'
  });

  // Check 2: Slug format & D1 uniqueness
  if (!slug) {
    checks.push({ id: 'slug', label: 'Unique URL Slug', status: 'fail', detail: 'Slug is empty or invalid.' });
  } else {
    let conflict = null;
    try {
      const existing = await env.DB.prepare(`SELECT id, title_en FROM ${cfg.table} WHERE slug = ?`).bind(slug).first();
      if (existing && String(existing.id) !== String(item.id || '')) conflict = existing;
    } catch { /* ignore if table absent */ }
    checks.push({
      id: 'slug',
      label: 'Unique URL Slug',
      status: conflict ? 'fail' : 'pass',
      detail: conflict ? `Slug "${slug}" already used by "${conflict.title_en || conflict.id}".` : `Slug "${slug}" is unique and ready.`
    });
  }

  checks.push({
    id: 'category',
    label: 'Primary Category / Track Assigned',
    status: categoryVal ? 'pass' : 'warn',
    detail: categoryVal ? `Assigned: ${categoryVal}` : 'No L1 category/track selected — assign one for clean portal filtering.'
  });

  // Check 3: Future closing / expiry date (when provided)
  const expRaw = String(item.expires_at || item.last_date || '').trim();
  if (expRaw) {
    const expMs = parseDateMs(expRaw);
    const nowMs = Date.now();
    if (expMs === null) {
      checks.push({ id: 'expires_at', label: 'Closing / Expiry Date', status: 'fail', detail: `Unparseable date format: "${expRaw}". Use YYYY-MM-DD or ISO timestamp.` });
    } else if (expMs <= nowMs) {
      checks.push({ id: 'expires_at', label: 'Closing / Expiry Date', status: 'fail', detail: `Closing date (${expRaw}) is already in the past.` });
    } else {
      const days = Math.ceil((expMs - nowMs) / 86400000);
      checks.push({ id: 'expires_at', label: 'Closing / Expiry Date', status: 'pass', detail: `Valid future deadline (${expRaw} · ${days} day(s) remaining).` });
    }
  } else if (pillar === 'jobs' || pillar === 'schemes') {
    checks.push({ id: 'expires_at', label: 'Closing / Expiry Date', status: 'warn', detail: 'No closing/expiry date set (item will not appear in Expiring Deadlines Radar).' });
  }

  // Check 4: Verify attached /files/... keys exist in D1 media_files and/or R2 CSO_FILES
  const { r2Files, externalUrls } = collectUrlsFromItem(item);
  for (const rf of r2Files) {
    let existsInD1 = false;
    let existsInR2 = false;
    try {
      const row = await env.DB.prepare('SELECT id FROM media_files WHERE file_key = ?').bind(rf.key).first();
      existsInD1 = Boolean(row);
    } catch { /* ignore */ }
    if (env.CSO_FILES && typeof env.CSO_FILES.head === 'function') {
      try {
        const h = await env.CSO_FILES.head(rf.key);
        existsInR2 = Boolean(h);
      } catch { existsInR2 = false; }
    } else if (env.CSO_FILES && typeof env.CSO_FILES.get === 'function') {
      try {
        const g = await env.CSO_FILES.get(rf.key);
        existsInR2 = Boolean(g);
      } catch { existsInR2 = false; }
    }
    const ok = env.CSO_FILES ? (existsInD1 || existsInR2) : existsInD1;
    checks.push({
      id: `r2_${rf.field}`,
      label: `R2 Attachment (${rf.field})`,
      status: ok ? 'pass' : 'fail',
      detail: ok ? `Verified ${rf.url} exists in storage.` : `File "${rf.url}" was not found in R2 / media_files.`
    });
  }

  // Check 5: Verify external official URLs via real server-side HEAD/GET
  if (!body.skip_network && externalUrls.length) {
    const probed = await Promise.all(externalUrls.slice(0, 6).map(async (eu) => {
      const res = await probeExternalUrl(eu.url, fetchFn, 5000);
      return {
        id: `url_${eu.field}`,
        label: `Official URL (${eu.field})`,
        status: res.ok ? 'pass' : 'fail',
        detail: res.ok ? `HTTP ${res.status} OK — ${eu.url}` : `Unreachable (${res.error || 'HTTP ' + res.status}) — ${eu.url}`
      };
    }));
    checks.push(...probed);
  }

  const blockingCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warn').length;

  return json({
    ok: true,
    pillar,
    slug,
    passed: blockingCount === 0,
    blocking_count: blockingCount,
    warning_count: warningCount,
    checks
  });
}

// ============================================================================
// 2. SINGLE-CLICK PUBLISH CHAIN (`POST /api/admin/publish-chain`)
// ============================================================================
export function buildWhatsAppTelegramCard({ pillar, title_en, title_or, slug, summary_en, expires_at, last_date, official_url }) {
  const cfg = PILLAR_CONFIG[pillar] || PILLAR_CONFIG.jobs;
  const csoLink = `https://csodisha.com${cfg.publicPrefix}${encodeURIComponent(slug || '')}`;
  const deadline = String(expires_at || last_date || '').trim();
  const icon = pillar === 'jobs' ? '💼' : pillar === 'schemes' ? '🏛️' : pillar === 'study' ? '📚' : '🧭';
  const lines = [
    `${icon} *${String(title_en || cfg.label).trim()}*`,
    title_or ? `📌 ${String(title_or).trim()}` : '',
    summary_en ? `\n${String(summary_en).trim().slice(0, 220)}` : '',
    deadline ? `🗓️ *Last Date / Deadline:* ${deadline}` : '',
    official_url ? `🏛️ *Official Portal:* ${String(official_url).trim()}` : '',
    `🔗 *Full Bilingual Guide & Free PDF:* ${csoLink}`,
    `\n— *Common Sense Odisha* (csodisha.com)`
  ].filter(Boolean);
  return lines.join('\n');
}

function normalizeRequiredDocs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(d => (typeof d === 'string' ? d.trim() : String((d && (d.title_en || d.name || d.doc)) || '').trim())).filter(Boolean);
  }
  const s = String(raw).trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return normalizeRequiredDocs(parsed);
    } catch { /* fallback to CSV split */ }
  }
  return s.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

export async function handlePublishChainApi(request, env, actor, ctx = null) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'POST required');
  const body = await readJson(request, 120000);
  const pillar = String(body.pillar || '').trim().toLowerCase();
  const cfg = PILLAR_CONFIG[pillar];
  if (!cfg) throw validationError({ pillar: 'Pillar must be jobs, careers, schemes, or study' });

  const itemId = String(body.id || '').trim();
  const titleEn = String(body.title_en || body.title || '').trim().slice(0, 220);
  const titleOr = String(body.title_or || '').trim().slice(0, 240);
  const slug = slugify(body.slug || titleEn);
  if (!titleEn || !slug) throw validationError({ title_en: 'title_en and slug are required' });

  const summaryEn = String(body.summary_en || '').trim().slice(0, 400);
  const expiresAt = String(body.expires_at || body.last_date || '').trim();
  const officialUrl = String(body.official_url || body.apply_url || body.official_apply_url || '').trim();
  const targetUrl = `${cfg.publicPrefix}${encodeURIComponent(slug)}`;
  const nowIso = new Date().toISOString();

  // 1. Sync to Homepage Latest Updates (`All` + pillar category) in homepage_blocks (0136 schema)
  let homepageSynced = false;
  const blockId = `lu_chain_${pillar}_${(itemId || slug).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)}`;
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS homepage_blocks (
        id TEXT PRIMARY KEY,
        section_key TEXT NOT NULL,
        title_en TEXT NOT NULL DEFAULT '',
        title_or TEXT NOT NULL DEFAULT '',
        subtitle_en TEXT NOT NULL DEFAULT '',
        subtitle_or TEXT NOT NULL DEFAULT '',
        badge_en TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '',
        href TEXT NOT NULL DEFAULT '',
        cta_label_en TEXT NOT NULL DEFAULT '',
        cta_label_or TEXT NOT NULL DEFAULT '',
        accent_variant TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 1,
        clicks_count INTEGER NOT NULL DEFAULT 0,
        meta_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    const badge = expiresAt ? `Last Date: ${expiresAt.slice(0, 10)}` : cfg.label;
    const metaJson = JSON.stringify({ pillar, category: cfg.homepageCategory, slug, synced_by: 'publish_chain_v311' });
    await env.DB.prepare(
      `INSERT INTO homepage_blocks (id, section_key, title_en, title_or, subtitle_en, badge_en, href, accent_variant, sort_order, is_published, meta_json, updated_at)
       VALUES (?, 'latest_updates', ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title_en = excluded.title_en,
         title_or = excluded.title_or,
         subtitle_en = excluded.subtitle_en,
         badge_en = excluded.badge_en,
         href = excluded.href,
         accent_variant = excluded.accent_variant,
         is_published = 1,
         meta_json = excluded.meta_json,
         updated_at = excluded.updated_at`
    ).bind(blockId, titleEn, titleOr, summaryEn, badge, targetUrl, cfg.homepageCategory, metaJson, nowIso).run();
    homepageSynced = true;
  } catch {
    homepageSynced = false;
  }

  // 2. Link any selected required documents into Candidate Hub Document Readiness Vault
  const docsList = normalizeRequiredDocs(body.required_docs);
  const syncedDocs = [];
  if (docsList.length) {
    try {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS candidate_doc_templates (
          id TEXT PRIMARY KEY,
          doc_key TEXT UNIQUE NOT NULL,
          title_en TEXT NOT NULL DEFAULT '',
          title_or TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'identity',
          notes_en TEXT NOT NULL DEFAULT '',
          notes_or TEXT NOT NULL DEFAULT '',
          is_required INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_published INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`
      ).run();
      for (let i = 0; i < docsList.length; i++) {
        const docTitle = docsList[i].slice(0, 140);
        const docKey = slugify(docTitle).replace(/-/g, '_').slice(0, 64);
        if (!docKey) continue;
        const docId = `doc_tpl_${docKey}`;
        await env.DB.prepare(
          `INSERT INTO candidate_doc_templates (id, doc_key, title_en, category, notes_en, is_required, sort_order, is_published, updated_at)
           VALUES (?, ?, ?, 'certificates', ?, 1, ?, 1, ?)
           ON CONFLICT(doc_key) DO UPDATE SET
             is_published = 1,
             updated_at = excluded.updated_at`
        ).bind(docId, docKey, docTitle, `Required for ${titleEn}`, 50 + i, nowIso).run();
        syncedDocs.push({ doc_key: docKey, title_en: docTitle });
      }
    } catch { /* non-fatal if table restricted */ }
  }

  // 3. Trigger /sitemap.xml refresh & purge all public edge caches
  let sitemapUrls = 0;
  try {
    const smRes = await handleSitemapXml(new Request(new URL('/sitemap.xml', request.url).toString()), env);
    const smXml = await smRes.text();
    sitemapUrls = (smXml.match(/<loc>/g) || []).length;
  } catch { sitemapUrls = 0; }

  const inv = await invalidateAllPublicCaches(request, ['/sitemap.xml', targetUrl, '/api/public/study/offline-pack']);

  // 3b. Automatic Vectorize sync for Ask CSOdisha via ctx.waitUntil
  const semanticTypeMap = { jobs: 'job', schemes: 'scheme', study: 'study', careers: 'career' };
  const semType = semanticTypeMap[pillar];
  if (semType && (itemId || slug)) {
    scheduleSemanticSync(ctx, env, {
      action: 'upsert',
      type: semType,
      row: {
        id: itemId || slug,
        slug,
        title_en: titleEn,
        title_or: titleOr,
        summary_en: summaryEn,
        summary_or: String(body.summary_or || '').trim().slice(0, 400)
      },
      actorId: actor && actor.userId
    });
  }

  // 4. Generate ready-to-copy WhatsApp & Telegram Announcement Card
  const cardText = buildWhatsAppTelegramCard({
    pillar,
    title_en: titleEn,
    title_or: titleOr,
    slug,
    summary_en: summaryEn,
    expires_at: expiresAt,
    official_url: officialUrl
  });

  recordAdminAuditLog(env, request, actor, 'publish_chain.run', `${pillar}:${slug}`, {
    homepage_synced: homepageSynced,
    docs_synced: syncedDocs.length,
    sitemap_urls: sitemapUrls
  }, ctx);

  return json({
    ok: true,
    pillar,
    slug,
    public_url: targetUrl,
    homepage_synced: homepageSynced,
    homepage_block_id: blockId,
    vault_docs_synced: syncedDocs,
    sitemap_urls: sitemapUrls,
    cache_purged: true,
    invalidated: inv && inv.invalidated ? inv.invalidated : 0,
    whatsapp_telegram_card: cardText
  }, 200, { 'X-CSO-Cache-Purged': '1' });
}

// ============================================================================
// 3. BULK CSV / JSON IMPORTER WITH DRY-RUN PREVIEW (`POST /api/admin/bulk-import`)
// ============================================================================
export function parseCsvRows(rawCsv) {
  const text = String(rawCsv || '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some(c => c !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, ''));
  return rows.slice(1).map(cols => {
    const obj = {};
    headers.forEach((h, idx) => { if (h) obj[h] = cols[idx] !== undefined ? cols[idx] : ''; });
    return obj;
  });
}

export async function handleBulkImportApi(request, env, actor, ctx = null) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'POST required');
  const body = await readJson(request, 500000);
  const pillar = String(body.pillar || '').trim().toLowerCase();
  const cfg = PILLAR_CONFIG[pillar];
  if (!cfg) throw validationError({ pillar: 'Pillar must be jobs, careers, schemes, or study' });

  const format = String(body.format || 'json').toLowerCase();
  const dryRun = body.dry_run !== false;
  let records = [];

  if (Array.isArray(body.rows)) {
    records = body.rows;
  } else if (format === 'csv') {
    records = parseCsvRows(body.raw || '');
  } else {
    try {
      const parsed = JSON.parse(String(body.raw || '[]'));
      records = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
    } catch {
      throw validationError({ raw: 'Invalid JSON payload. Provide an array of objects.' });
    }
  }

  if (!records.length) {
    throw validationError({ raw: 'No rows found to import.' });
  }
  if (records.length > 200) {
    throw validationError({ raw: 'Maximum 200 rows per bulk import batch.' });
  }

  await ensureV311ContentColumns(env.DB);

  // Fetch existing slugs once for duplicate-slug protection
  const existingSlugs = new Set();
  try {
    const { results } = await env.DB.prepare(`SELECT slug FROM ${cfg.table}`).all();
    for (const r of (results || [])) if (r && r.slug) existingSlugs.add(String(r.slug).toLowerCase());
  } catch { /* ignore */ }

  const seenInBatch = new Set();
  const preview = [];
  const validRows = [];

  records.forEach((raw, idx) => {
    const rowNum = idx + 1;
    const errors = [];
    const titleEn = String(raw.title_en || raw.title || '').trim().slice(0, 220);
    const titleOr = String(raw.title_or || '').trim().slice(0, 240);
    const slug = slugify(raw.slug || titleEn);
    const summaryEn = String(raw.summary_en || raw.summary || '').trim().slice(0, 600);
    const applyUrl = String(raw.apply_url || raw.official_apply_url || '').trim();
    const expiresAt = String(raw.expires_at || raw.last_date || '').trim();
    const publishAt = String(raw.publish_at || raw.scheduled_publish_at || '').trim();

    if (titleEn.length < 4) errors.push('title_en must be at least 4 characters');
    if (!slug) errors.push('slug could not be derived');
    else if (existingSlugs.has(slug)) errors.push(`duplicate slug "${slug}" already exists in D1`);
    else if (seenInBatch.has(slug)) errors.push(`duplicate slug "${slug}" repeated inside this import batch`);

    if (applyUrl && !(/^https?:\/\//i.test(applyUrl) || applyUrl.startsWith('/'))) {
      errors.push('apply_url must start with https:// or /');
    }
    if (expiresAt && parseDateMs(expiresAt) === null) {
      errors.push(`invalid expires_at date "${expiresAt}"`);
    }
    if (publishAt && parseDateMs(publishAt) === null) {
      errors.push(`invalid publish_at date "${publishAt}"`);
    }

    if (slug) seenInBatch.add(slug);

    const status = errors.length ? 'error' : 'valid';
    preview.push({ row_number: rowNum, title_en: titleEn, slug, status, errors });
    if (status === 'valid') {
      validRows.push({
        raw,
        title_en: titleEn,
        title_or: titleOr,
        slug,
        summary_en: summaryEn,
        apply_url: applyUrl,
        expires_at: expiresAt,
        publish_at: publishAt
      });
    }
  });

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      pillar,
      total_rows: records.length,
      valid_count: validRows.length,
      error_count: records.length - validRows.length,
      preview
    });
  }

  let inserted = 0;
  const nowIso = new Date().toISOString();
  for (const v of validRows) {
    const rand = new Uint8Array(4);
    crypto.getRandomValues(rand);
    const id = `${pillar.slice(0, 3)}_${Date.now()}_${Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    const isPub = v.raw.is_published === 1 || v.raw.is_published === true || String(v.raw.status || '').toLowerCase() === 'published' ? 1 : 0;

    if (pillar === 'jobs') {
      await env.DB.prepare(
        `INSERT INTO job_articles (id, slug, category_l1_id, title_en, title_or, summary_en, organisation_en, last_date, official_apply_url, apply_url, notification_url, publish_at, scheduled_publish_at, expires_at, is_published, published_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, v.slug, String(v.raw.category_l1_id || 'jtax_l1_government'),
        v.title_en, v.title_or, v.summary_en, String(v.raw.organisation_en || v.raw.organisation || ''),
        v.expires_at, v.apply_url, v.apply_url, String(v.raw.notification_url || ''),
        v.publish_at, v.publish_at, v.expires_at, isPub, isPub ? nowIso : '', nowIso
      ).run();
    } else if (pillar === 'schemes') {
      await env.DB.prepare(
        `INSERT INTO scheme_articles (id, slug, category_l1_id, title_en, title_or, summary_en, department_en, last_date, official_apply_url, publish_at, scheduled_publish_at, expires_at, district_codes, required_docs, is_published, published_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, v.slug, String(v.raw.category_l1_id || 'stax_l1_odisha_welfare'),
        v.title_en, v.title_or, v.summary_en, String(v.raw.department_en || v.raw.department || ''),
        v.expires_at, v.apply_url, v.publish_at, v.publish_at, v.expires_at,
        String(v.raw.district_codes || ''), JSON.stringify(normalizeRequiredDocs(v.raw.required_docs)),
        isPub, isPub ? nowIso : '', nowIso
      ).run();
    } else if (pillar === 'study') {
      const offlineFlag = v.raw.offline_pack === 1 || v.raw.offline_pack === true || String(v.raw.offline_pack) === '1' ? 1 : 0;
      await env.DB.prepare(
        `INSERT INTO study_articles (id, slug, category_l1_id, title_en, title_or, summary_en, exam_board_tag, notes_pdf_url, scheduled_publish_at, offline_pack, is_published, published_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, v.slug, String(v.raw.category_l1_id || 'stl_l1_odisha_state'),
        v.title_en, v.title_or, v.summary_en, String(v.raw.exam_board_tag || ''),
        String(v.raw.notes_pdf_url || v.apply_url || ''), v.publish_at, offlineFlag,
        isPub, isPub ? nowIso : '', nowIso
      ).run();
    } else if (pillar === 'careers') {
      const region = ['odisha', 'central', 'all-india'].includes(String(v.raw.region_scope || '').toLowerCase()) ? String(v.raw.region_scope).toLowerCase() : 'odisha';
      await env.DB.prepare(
        `INSERT INTO careers_articles (id, slug, title_en, title_or, track_slug, region_scope, career_stage, summary_en, status, published_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, v.slug, v.title_en, v.title_or, String(v.raw.track_slug || 'civil-services'),
        region, String(v.raw.career_stage || 'graduate'), v.summary_en,
        isPub ? 'published' : 'draft', isPub ? nowIso : null, nowIso
      ).run();
    }
    inserted += 1;
  }

  await invalidateAllPublicCaches(request);
  recordAdminAuditLog(env, request, actor, 'bulk_import.commit', pillar, { inserted, skipped: records.length - inserted }, ctx);

  return json({
    ok: true,
    dry_run: false,
    pillar,
    inserted_count: inserted,
    skipped_count: records.length - inserted,
    preview
  }, 201, { 'X-CSO-Cache-Purged': '1' });
}

// ============================================================================
// 4. ONE-CLICK DUPLICATE AS TEMPLATE (`POST /api/admin/duplicate-item`)
// ============================================================================
export async function handleDuplicateItemApi(request, env, actor, ctx = null) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'POST required');
  const body = await readJson(request, 20000);
  const pillar = String(body.pillar || '').trim().toLowerCase();
  const id = String(body.id || '').trim();
  const cfg = PILLAR_CONFIG[pillar];
  if (!cfg || !id) throw validationError({ id: 'Valid pillar and id required' });

  const row = await env.DB.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).bind(id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Source item not found');

  const rand = new Uint8Array(4);
  crypto.getRandomValues(rand);
  const suffix = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  const newId = `${pillar.slice(0, 3)}_tpl_${Date.now()}_${suffix}`;
  const newSlug = `${String(row.slug || 'item').slice(0, 88)}-copy-${suffix}`;
  const newTitle = `Copy of ${String(row.title_en || 'Untitled').slice(0, 190)}`;
  const nowIso = new Date().toISOString();

  const cloned = { ...row };
  cloned.id = newId;
  cloned.slug = newSlug;
  cloned.title_en = newTitle;
  cloned.updated_at = nowIso;
  if ('is_published' in cloned) cloned.is_published = 0;
  if ('status' in cloned) cloned.status = 'draft';
  if ('published_at' in cloned) cloned.published_at = pillar === 'careers' ? null : '';
  if ('preview_token' in cloned) cloned.preview_token = '';
  if ('preview_expires_at' in cloned) cloned.preview_expires_at = '';
  if ('views_count' in cloned) cloned.views_count = 0;
  if ('apply_clicks_count' in cloned) cloned.apply_clicks_count = 0;
  if ('pdf_downloads_count' in cloned) cloned.pdf_downloads_count = 0;
  if ('bookmarks_count' in cloned) cloned.bookmarks_count = 0;

  const cols = Object.keys(cloned);
  const placeholders = cols.map(() => '?').join(', ');
  await env.DB.prepare(`INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${placeholders})`)
    .bind(...cols.map(c => cloned[c])).run();

  recordAdminAuditLog(env, request, actor, 'content.duplicate', `${pillar}:${newId}`, { source_id: id, slug: newSlug }, ctx);

  return json({ ok: true, pillar, item: cloned }, 201);
}
