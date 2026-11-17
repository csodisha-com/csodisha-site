// Analytics, Telemetry & User Feedback Intelligence Batch 2 (v102): Modules 05-08
// 05 District Demographics | 06 Web Vitals & Edge Latency | 07 Citizen CSAT & Sentiment | 08 404 Sentinel Triage
// Strictly zero cookies, zero raw IPs, and zero PII stored.
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  ensureAnalyticsTelemetryBatch1Schema,
  AT_REV_TABLES,
  snapshotAtRevision,
  dailySaltedBucketHash
} from './analytics-telemetry-batch1.js';

export const AT_RDC_ZONES = ['Central', 'Northern', 'Southern'];
export const AT_CWV_ROUTE_GROUPS = ['home', 'study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community'];
export const AT_CWV_DEVICES = ['mobile_android', 'mobile_ios', 'desktop', 'tablet'];
export const AT_CWV_CONNECTIONS = ['4g_5g', 'broadband_wifi', 'slow_3g_2g'];
export const AT_CWV_RATINGS = ['good', 'needs_improvement', 'poor'];
export const AT_FB_TOPICS = ['content_quality', 'odia_translation', 'site_speed', 'exam_coverage', 'ui_accessibility'];
export const AT_FB_STATUSES = ['new', 'acknowledged', 'actioned', 'archived'];
export const AT_404_SOURCES = ['edge_404_hit', 'crawler_bot', 'internal_link_audit', 'external_backlink'];
export const AT_404_STATUSES = ['open', 'redirect_mapped', 'ignored_bot', 'fixed_source'];

const _at2Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }
function todayIso() { return new Date().toISOString().slice(0, 10); }

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

/** Deterministic Core Web Vitals rating from LCP (<=2500ms), INP (<=200ms), CLS (<=100 milli = 0.100). */
export function computeCwvRating(lcpMs, inpMs, clsMilli) {
  const lcp = Number(lcpMs || 0);
  const inp = Number(inpMs || 0);
  const cls = Number(clsMilli || 0);
  if (lcp <= 2500 && inp <= 200 && cls <= 100) return 'good';
  if (lcp > 4000 || inp > 500 || cls > 250) return 'poor';
  return 'needs_improvement';
}

/** Deterministic CSAT + keyword sentiment analyzer. */
export function classifySentiment(csatScore, commentText = '') {
  const score = Number(csatScore || 3);
  const txt = String(commentText || '').toLowerCase();
  const negWords = ['broken', 'slow', 'wrong', 'error', 'bad', 'worst', 'missing', 'bug', 'fail', '404'];
  const posWords = ['great', 'helpful', 'excellent', 'good', 'fast', 'clear', 'thanks', 'thank', 'best', 'love'];
  const hasNeg = negWords.some(w => txt.includes(w));
  const hasPos = posWords.some(w => txt.includes(w));
  if (score <= 2) return 'negative';
  if (score >= 4 && !hasNeg) return 'positive';
  if (score >= 4 && hasNeg) return 'neutral';
  if (hasNeg && !hasPos) return 'negative';
  if (hasPos && !hasNeg) return 'positive';
  return 'neutral';
}

AT_REV_TABLES['07'] = {
  table: 'at_citizen_feedback',
  cols: ['feedback_code', 'portal_section', 'page_url', 'csat_score', 'sentiment_label', 'topic_tag', 'comment_text', 'lang_mode', 'district_odisha', 'triage_status', 'admin_response_note']
};
AT_REV_TABLES['08'] = {
  table: 'at_sentinel_404_inbox',
  cols: ['incident_code', 'missing_path', 'referrer_path', 'source_kind', 'hit_count', 'suggested_redirect_to', 'triage_status', 'resolution_note', 'resolved_by']
};

export async function ensureAnalyticsTelemetryBatch2Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureAnalyticsTelemetryBatch1Schema(db);
  if (_at2Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS at_district_demographics (
      id TEXT PRIMARY KEY,
      district_code TEXT NOT NULL UNIQUE,
      district_name_en TEXT NOT NULL,
      district_name_or TEXT NOT NULL DEFAULT '',
      rdc_zone TEXT NOT NULL DEFAULT 'Central' CHECK (rdc_zone IN ('Central', 'Northern', 'Southern')),
      active_learners_count INTEGER NOT NULL DEFAULT 0,
      pageviews_count INTEGER NOT NULL DEFAULT 0,
      downloads_count INTEGER NOT NULL DEFAULT 0,
      top_portal_section TEXT NOT NULL DEFAULT 'study-library',
      preferred_lang_share_or_pct INTEGER NOT NULL DEFAULT 35,
      growth_delta_pct INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_dist_zone ON at_district_demographics(rdc_zone, active_learners_count DESC)`,
    `CREATE TABLE IF NOT EXISTS at_web_vitals_metrics (
      id TEXT PRIMARY KEY,
      bucket_date TEXT NOT NULL,
      route_group TEXT NOT NULL DEFAULT 'study-library' CHECK (route_group IN ('home', 'study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community')),
      device_class TEXT NOT NULL DEFAULT 'mobile_android' CHECK (device_class IN ('mobile_android', 'mobile_ios', 'desktop', 'tablet')),
      connection_tier TEXT NOT NULL DEFAULT '4g_5g' CHECK (connection_tier IN ('4g_5g', 'broadband_wifi', 'slow_3g_2g')),
      sample_count INTEGER NOT NULL DEFAULT 1,
      p75_ttfb_ms INTEGER NOT NULL DEFAULT 42,
      p75_lcp_ms INTEGER NOT NULL DEFAULT 1450,
      p75_inp_ms INTEGER NOT NULL DEFAULT 85,
      p75_cls_milli INTEGER NOT NULL DEFAULT 35,
      cwv_rating TEXT NOT NULL DEFAULT 'good' CHECK (cwv_rating IN ('good', 'needs_improvement', 'poor')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_cwv_rating ON at_web_vitals_metrics(cwv_rating, device_class, route_group)`,
    `CREATE TABLE IF NOT EXISTS at_citizen_feedback (
      id TEXT PRIMARY KEY,
      feedback_code TEXT NOT NULL UNIQUE,
      portal_section TEXT NOT NULL DEFAULT 'study-library',
      page_url TEXT NOT NULL DEFAULT '/',
      csat_score INTEGER NOT NULL DEFAULT 5 CHECK (csat_score >= 1 AND csat_score <= 5),
      sentiment_label TEXT NOT NULL DEFAULT 'positive' CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
      topic_tag TEXT NOT NULL DEFAULT 'content_quality' CHECK (topic_tag IN ('content_quality', 'odia_translation', 'site_speed', 'exam_coverage', 'ui_accessibility')),
      comment_text TEXT NOT NULL DEFAULT '',
      lang_mode TEXT NOT NULL DEFAULT 'en' CHECK (lang_mode IN ('en', 'or')),
      district_odisha TEXT NOT NULL DEFAULT 'Khordha',
      triage_status TEXT NOT NULL DEFAULT 'new' CHECK (triage_status IN ('new', 'acknowledged', 'actioned', 'archived')),
      admin_response_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_feedback_triage ON at_citizen_feedback(triage_status, sentiment_label, csat_score)`,
    `CREATE TABLE IF NOT EXISTS at_sentinel_404_inbox (
      id TEXT PRIMARY KEY,
      incident_code TEXT NOT NULL UNIQUE,
      missing_path TEXT NOT NULL UNIQUE,
      referrer_path TEXT NOT NULL DEFAULT '',
      source_kind TEXT NOT NULL DEFAULT 'edge_404_hit' CHECK (source_kind IN ('edge_404_hit', 'crawler_bot', 'internal_link_audit', 'external_backlink')),
      hit_count INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      suggested_redirect_to TEXT NOT NULL DEFAULT '',
      triage_status TEXT NOT NULL DEFAULT 'open' CHECK (triage_status IN ('open', 'redirect_mapped', 'ignored_bot', 'fixed_source')),
      resolution_note TEXT NOT NULL DEFAULT '',
      resolved_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_404_triage ON at_sentinel_404_inbox(triage_status, hit_count DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 05 Odisha districts
  const distCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_district_demographics`).first();
  if (Number(distCnt?.n || 0) === 0) {
    const districts = [
      ['at-dist-01', 'OD-KHD', 'Khordha', 'ଖୋର୍ଦ୍ଧା', 'Central', 1420, 4820, 960, 'study-library', 38, 22],
      ['at-dist-02', 'OD-CTC', 'Cuttack', 'କଟକ', 'Central', 1180, 3910, 810, 'study-library', 44, 18],
      ['at-dist-03', 'OD-BLS', 'Balasore', 'ବାଲେଶ୍ୱର', 'Central', 940, 3120, 720, 'jobs-careers', 51, 27],
      ['at-dist-04', 'OD-SBP', 'Sambalpur', 'ସମ୍ବଲପୁର', 'Northern', 710, 2240, 490, 'study-library', 42, 16],
      ['at-dist-05', 'OD-GJM', 'Ganjam', 'ଗଞ୍ଜାମ', 'Southern', 830, 2680, 560, 'schemes', 55, 21],
      ['at-dist-06', 'OD-MBJ', 'Mayurbhanj', 'ମୟୂରଭଞ୍ଜ', 'Central', 520, 1690, 380, 'jobs-careers', 58, 24],
      ['at-dist-07', 'OD-KJR', 'Keonjhar', 'କେନ୍ଦୁଝର', 'Northern', 460, 1410, 310, 'schemes', 49, 14],
      ['at-dist-08', 'OD-KRP', 'Koraput', 'କୋରାପୁଟ', 'Southern', 390, 1180, 260, 'schemes', 62, 19]
    ];
    for (const d of districts) {
      await db.prepare(
        `INSERT INTO at_district_demographics (id, district_code, district_name_en, district_name_or, rdc_zone, active_learners_count, pageviews_count, downloads_count, top_portal_section, preferred_lang_share_or_pct, growth_delta_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...d).run();
    }
  }

  // Seed Module 06 Web Vitals
  const cwvCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_web_vitals_metrics`).first();
  if (Number(cwvCnt?.n || 0) === 0) {
    const today = todayIso();
    const cwvs = [
      ['at-cwv-01', today, 'study-library', 'mobile_android', '4g_5g', 620, 44, 1720, 110, 32, 'good'],
      ['at-cwv-02', today, 'jobs-careers', 'mobile_android', '4g_5g', 480, 41, 1580, 95, 28, 'good'],
      ['at-cwv-03', today, 'schemes', 'desktop', 'broadband_wifi', 290, 28, 980, 55, 18, 'good'],
      ['at-cwv-04', today, 'community', 'mobile_android', 'slow_3g_2g', 140, 135, 2940, 245, 125, 'needs_improvement']
    ];
    for (const c of cwvs) {
      await db.prepare(
        `INSERT INTO at_web_vitals_metrics (id, bucket_date, route_group, device_class, connection_tier, sample_count, p75_ttfb_ms, p75_lcp_ms, p75_inp_ms, p75_cls_milli, cwv_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...c).run();
    }
  }

  // Seed Module 07 Citizen Feedback
  const fbCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_citizen_feedback`).first();
  if (Number(fbCnt?.n || 0) === 0) {
    const fbs = [
      ['at-fb-01', 'FBK-2026-0001', 'study-library', '/study-library/', 5, 'positive', 'content_quality', 'OPSC OAS PYQs with Odia explanations are very helpful!', 'en', 'Balasore', 'acknowledged', 'Thank you for your feedback!'],
      ['at-fb-02', 'FBK-2026-0002', 'schemes', '/schemes/', 4, 'positive', 'odia_translation', 'ଓଡ଼ିଶା ଯୋଜନା ତାଲିକା ବହୁତ ସ୍ପଷ୍ଟ ଏବଂ ସହଜ ଅଟେ।', 'or', 'Cuttack', 'new', ''],
      ['at-fb-03', 'FBK-2026-0003', 'jobs-careers', '/jobs-careers/old-ossc', 2, 'negative', 'site_speed', 'Old OSSC syllabus PDF link was broken on slow 3G.', 'en', 'Sambalpur', 'new', '']
    ];
    for (const f of fbs) {
      await db.prepare(
        `INSERT INTO at_citizen_feedback (id, feedback_code, portal_section, page_url, csat_score, sentiment_label, topic_tag, comment_text, lang_mode, district_odisha, triage_status, admin_response_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...f).run();
    }
  }

  // Seed Module 08 404 Sentinel Inbox
  const s404Cnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_sentinel_404_inbox`).first();
  if (Number(s404Cnt?.n || 0) === 0) {
    const s404s = [
      ['at-404-01', 'ERR404-2026-0001', '/old-opsc-syllabus.html', '/study-library/', 'edge_404_hit', 42, '/study-library/?exam=opsc-oas', 'open', '', ''],
      ['at-404-02', 'ERR404-2026-0002', '/ossc-cgl-2023-pdf', '/jobs-careers/', 'external_backlink', 19, '/study-library/?exam=ossc-cgl', 'open', '', ''],
      ['at-404-03', 'ERR404-2026-0003', '/wp-login.php', '', 'crawler_bot', 128, '', 'ignored_bot', 'Automated WordPress scanner ignored.', 'system']
    ];
    for (const s of s404s) {
      await db.prepare(
        `INSERT INTO at_sentinel_404_inbox (id, incident_code, missing_path, referrer_path, source_kind, hit_count, suggested_redirect_to, triage_status, resolution_note, resolved_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...s).run();
    }
  }

  _at2Ready.add(db);
}

/* ================= MODULE 05: DISTRICT DEMOGRAPHICS ================= */
async function handleDemographics(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const zone = (url.searchParams.get('rdc_zone') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    const where = [];
    const binds = [];
    if (zone) { where.push('rdc_zone = ?'); binds.push(zone); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(district_name_en LIKE ? ESCAPE '\\' OR district_name_or LIKE ? ESCAPE '\\' OR district_code LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ results }, { results: byZone }] = await Promise.all([
      db.prepare(`SELECT * FROM at_district_demographics ${w} ORDER BY active_learners_count DESC`).bind(...binds).all(),
      db.prepare(`SELECT rdc_zone, SUM(active_learners_count) AS learners, SUM(pageviews_count) AS pageviews FROM at_district_demographics GROUP BY rdc_zone ORDER BY learners DESC`).all()
    ]);
    return json({ items: results || [], by_zone: byZone || [] });
  }

  if (sub === 'ingest' && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const code = cleanStr(body.district_code || '', 20).toUpperCase();
    const nameEn = cleanStr(body.district_name_en || '', 80);
    const zone = pick(body.rdc_zone, AT_RDC_ZONES, 'rdc_zone', errors, 'Central');
    const learnersInc = Math.max(0, Number(body.active_learners_inc || 1) || 1);
    const pvInc = Math.max(0, Number(body.pageviews_inc || 1) || 1);
    const dlInc = Math.max(0, Number(body.downloads_inc || 0) || 0);
    if (!code && !nameEn) errors.district_code = 'district_code or district_name_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const existing = await db.prepare(
      `SELECT * FROM at_district_demographics WHERE district_code = ? OR LOWER(district_name_en) = LOWER(?) LIMIT 1`
    ).bind(code, nameEn).first();

    let rowId = existing?.id;
    if (rowId) {
      await db.prepare(
        `UPDATE at_district_demographics
         SET active_learners_count = active_learners_count + ?, pageviews_count = pageviews_count + ?, downloads_count = downloads_count + ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(learnersInc, pvInc, dlInc, rowId).run();
    } else {
      rowId = rid('at-dist');
      await db.prepare(
        `INSERT INTO at_district_demographics (id, district_code, district_name_en, district_name_or, rdc_zone, active_learners_count, pageviews_count, downloads_count, top_portal_section, preferred_lang_share_or_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        rowId, code || `OD-${nameEn.slice(0, 3).toUpperCase()}`, nameEn || code,
        cleanStr(body.district_name_or || '', 80), zone, learnersInc, pvInc, dlInc,
        cleanStr(body.top_portal_section || 'study-library', 60),
        Math.max(0, Math.min(100, Number(body.preferred_lang_share_or_pct || 40) || 40))
      ).run();
    }
    await audit(env, request, actor, 'at.demographics.ingest', 'at_district_demographics', rowId, { district_code: code || nameEn });
    const item = await db.prepare(`SELECT * FROM at_district_demographics WHERE id = ?`).bind(rowId).first();
    return json({ item }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 06: WEB VITALS ================= */
async function handleWebVitals(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const dev = (url.searchParams.get('device_class') || '').trim();
    const route = (url.searchParams.get('route_group') || '').trim();
    const rating = (url.searchParams.get('cwv_rating') || '').trim();
    const where = [];
    const binds = [];
    if (dev) { where.push('device_class = ?'); binds.push(dev); }
    if (route) { where.push('route_group = ?'); binds.push(route); }
    if (rating) { where.push('cwv_rating = ?'); binds.push(rating); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM at_web_vitals_metrics ${w} ORDER BY sample_count DESC, bucket_date DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (sub === 'ingest' && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const route = pick(body.route_group, AT_CWV_ROUTE_GROUPS, 'route_group', errors, 'study-library');
    const dev = pick(body.device_class, AT_CWV_DEVICES, 'device_class', errors, 'mobile_android');
    const conn = pick(body.connection_tier, AT_CWV_CONNECTIONS, 'connection_tier', errors, '4g_5g');
    const ttfb = Math.max(1, Number(body.p75_ttfb_ms || 40) || 40);
    const lcp = Math.max(1, Number(body.p75_lcp_ms || 1500) || 1500);
    const inp = Math.max(1, Number(body.p75_inp_ms || 90) || 90);
    const cls = Math.max(0, Number(body.p75_cls_milli ?? 30) || 0);
    if (Object.keys(errors).length) throw validationError(errors);

    const rating = computeCwvRating(lcp, inp, cls);
    const newId = rid('at-cwv');
    await db.prepare(
      `INSERT INTO at_web_vitals_metrics (id, bucket_date, route_group, device_class, connection_tier, sample_count, p75_ttfb_ms, p75_lcp_ms, p75_inp_ms, p75_cls_milli, cwv_rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, todayIso(), route, dev, conn, Math.max(1, Number(body.sample_count || 1) || 1), ttfb, lcp, inp, cls, rating).run();

    await audit(env, request, actor, 'at.web_vitals.ingest', 'at_web_vitals_metrics', newId, { cwv_rating: rating, device_class: dev });
    const item = await db.prepare(`SELECT * FROM at_web_vitals_metrics WHERE id = ?`).bind(newId).first();
    return json({ item }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 07: CITIZEN FEEDBACK & CSAT ================= */
async function nextFbCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM at_citizen_feedback`).first();
  return `FBK-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleFeedback(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const sent = (url.searchParams.get('sentiment_label') || '').trim();
    const status = (url.searchParams.get('triage_status') || '').trim();
    const csat = url.searchParams.get('csat_score');
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (sent) { where.push('sentiment_label = ?'); binds.push(sent); }
    if (status) { where.push('triage_status = ?'); binds.push(status); }
    if (csat) { where.push('csat_score = ?'); binds.push(Number(csat)); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(feedback_code LIKE ? ESCAPE '\\' OR comment_text LIKE ? ESCAPE '\\' OR portal_section LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM at_citizen_feedback ${w} ORDER BY CASE triage_status WHEN 'new' THEN 0 ELSE 1 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 15000);
    const errors = {};
    const score = Number(body.csat_score || 5);
    if (!Number.isInteger(score) || score < 1 || score > 5) errors.csat_score = 'csat_score must be integer 1..5';
    const topic = pick(body.topic_tag, AT_FB_TOPICS, 'topic_tag', errors, 'content_quality');
    const comment = cleanStr(body.comment_text || '', 1500);
    if (Object.keys(errors).length) throw validationError(errors);

    const sentiment = classifySentiment(score, comment);
    const newId = rid('at-fb');
    const code = await nextFbCode(db);
    await db.prepare(
      `INSERT INTO at_citizen_feedback (id, feedback_code, portal_section, page_url, csat_score, sentiment_label, topic_tag, comment_text, lang_mode, district_odisha, triage_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
    ).bind(
      newId, code, cleanStr(body.portal_section || 'study-library', 60),
      cleanStr(body.page_url || '/', 200), score, sentiment, topic, comment,
      body.lang_mode === 'or' ? 'or' : 'en', cleanStr(body.district_odisha || 'Khordha', 80)
    ).run();

    await snapshotAtRevision(db, '07', newId, actor, 'create citizen feedback');
    await audit(env, request, actor, 'at.feedback.create', 'at_citizen_feedback', newId, { csat_score: score, sentiment_label: sentiment });
    const created = await db.prepare(`SELECT * FROM at_citizen_feedback WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM at_citizen_feedback WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feedback item not found');
    const body = await readJson(request, 15000);
    const errors = {};
    const status = body.triage_status !== undefined ? pick(body.triage_status, AT_FB_STATUSES, 'triage_status', errors, existing.triage_status) : existing.triage_status;
    const note = body.admin_response_note !== undefined ? cleanStr(body.admin_response_note, 500) : existing.admin_response_note;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotAtRevision(db, '07', sub, actor, `triage -> ${status}`);
    await db.prepare(
      `UPDATE at_citizen_feedback SET triage_status = ?, admin_response_note = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(status, note, sub).run();

    await audit(env, request, actor, 'at.feedback.triage', 'at_citizen_feedback', sub, { triage_status: status });
    const updated = await db.prepare(`SELECT * FROM at_citizen_feedback WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 08: 404 SENTINEL INBOX ================= */
async function next404Code(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM at_sentinel_404_inbox`).first();
  return `ERR404-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleSentinel404(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('triage_status') || '').trim();
    const src = (url.searchParams.get('source_kind') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('triage_status = ?'); binds.push(status); }
    if (src) { where.push('source_kind = ?'); binds.push(src); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(incident_code LIKE ? ESCAPE '\\' OR missing_path LIKE ? ESCAPE '\\' OR referrer_path LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM at_sentinel_404_inbox ${w} ORDER BY CASE triage_status WHEN 'open' THEN 0 ELSE 1 END, hit_count DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (sub === 'record' && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const missing = cleanStr(body.missing_path || '', 240);
    const src = pick(body.source_kind, AT_404_SOURCES, 'source_kind', errors, 'edge_404_hit');
    if (!missing) errors.missing_path = 'missing_path is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const ex = await db.prepare(`SELECT id FROM at_sentinel_404_inbox WHERE missing_path = ?`).bind(missing).first();
    let rowId = ex?.id;
    if (rowId) {
      await db.prepare(`UPDATE at_sentinel_404_inbox SET hit_count = hit_count + 1, last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(rowId).run();
    } else {
      rowId = rid('at-404');
      const code = await next404Code(db);
      await db.prepare(
        `INSERT INTO at_sentinel_404_inbox (id, incident_code, missing_path, referrer_path, source_kind, hit_count, triage_status)
         VALUES (?, ?, ?, ?, ?, 1, 'open')`
      ).bind(rowId, code, missing, cleanStr(body.referrer_path || '', 240), src).run();
      await snapshotAtRevision(db, '08', rowId, actor, 'record 404 incident');
    }
    if (actor) await audit(env, request, actor, 'at.sentinel404.record', 'at_sentinel_404_inbox', rowId, { missing_path: missing });
    const item = await db.prepare(`SELECT * FROM at_sentinel_404_inbox WHERE id = ?`).bind(rowId).first();
    return json({ item }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM at_sentinel_404_inbox WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', '404 incident not found');
    const body = await readJson(request, 15000);
    const errors = {};
    const redir = body.suggested_redirect_to !== undefined ? cleanStr(body.suggested_redirect_to, 240) : existing.suggested_redirect_to;
    const defaultStatus = redir && !body.triage_status ? 'redirect_mapped' : existing.triage_status;
    const status = body.triage_status !== undefined ? pick(body.triage_status, AT_404_STATUSES, 'triage_status', errors, defaultStatus) : defaultStatus;
    const note = body.resolution_note !== undefined ? cleanStr(body.resolution_note, 400) : existing.resolution_note;
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotAtRevision(db, '08', sub, actor, `404 triage -> ${status}`);
    await db.prepare(
      `UPDATE at_sentinel_404_inbox
       SET suggested_redirect_to = ?, triage_status = ?, resolution_note = ?, resolved_by = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(redir, status, note, actor?.email || actor?.userId || 'admin', sub).run();

    await audit(env, request, actor, 'at.sentinel404.resolve', 'at_sentinel_404_inbox', sub, { triage_status: status, suggested_redirect_to: redir });
    const updated = await db.prepare(`SELECT * FROM at_sentinel_404_inbox WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= PUBLIC COOKIELESS FEEDBACK SUBMIT ================= */
export async function handlePublicFeedbackSubmitApi(request, env) {
  if (!env || !env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureAnalyticsTelemetryBatch2Schema(env.DB);
  const bucketHash = await dailySaltedBucketHash(clientIp(request));
  await rateLimit(env, `pub-fb:${bucketHash}`, 20, 300);

  const body = await readJson(request, 10000);
  const errors = {};
  const score = Number(body.csat_score || 0);
  if (!Number.isInteger(score) || score < 1 || score > 5) errors.csat_score = 'csat_score must be 1..5';
  const topic = pick(body.topic_tag, AT_FB_TOPICS, 'topic_tag', errors, 'content_quality');
  if (Object.keys(errors).length) throw validationError(errors);

  const comment = cleanStr(body.comment_text || '', 1500);
  const sentiment = classifySentiment(score, comment);
  const newId = rid('at-fb');
  const code = await nextFbCode(env.DB);
  await env.DB.prepare(
    `INSERT INTO at_citizen_feedback (id, feedback_code, portal_section, page_url, csat_score, sentiment_label, topic_tag, comment_text, lang_mode, district_odisha, triage_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
  ).bind(
    newId, code, cleanStr(body.portal_section || 'study-library', 60),
    cleanStr(body.page_url || '/', 200), score, sentiment, topic, comment,
    body.lang_mode === 'or' ? 'or' : 'en', cleanStr(body.district_odisha || 'Khordha', 80)
  ).run();

  return json({ ok: true, feedback_code: code, sentiment_label: sentiment, cookieless: true }, 201);
}

export async function handleAnalyticsBatch2Admin(request, env, actor, id, sub, extra) {
  await ensureAnalyticsTelemetryBatch2Schema(env.DB);
  if (id === 'demographics') return handleDemographics(request, env, actor, sub, extra);
  if (id === 'web-vitals') return handleWebVitals(request, env, actor, sub, extra);
  if (id === 'feedback') return handleFeedback(request, env, actor, sub, extra);
  if (id === 'sentinel-404') return handleSentinel404(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown analytics batch 2 route');
}
