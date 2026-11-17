// Analytics, Telemetry & User Feedback Intelligence Batch 3 (v103): Modules 09-12
// 09 Outbound Referrals | 10 Exam Funnels | 11 Bilingual Usage | 12 Community Engagement Index
// Strictly zero cookies, zero raw IPs, and zero PII stored.
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import {
  AT_REV_TABLES,
  snapshotAtRevision,
  dailySaltedBucketHash
} from './analytics-telemetry-batch1.js';
import { ensureAnalyticsTelemetryBatch2Schema } from './analytics-telemetry-batch2.js';

export const AT_AUTHORITIES = ['opsc', 'ossc', 'osssc', 'nta_ugc_net', 'sams_odisha', 'odisha_gov_schemes', 'bse_chse_odisha'];
export const AT_OUTBOUND_SOURCES = ['jobs-careers', 'schemes', 'study-library', 'educational-tools'];
export const AT_OUTBOUND_CATS = ['apply_online', 'official_notification_pdf', 'admit_card', 'result_merit_list', 'scheme_portal'];
export const AT_FUNNEL_KEYS = ['opsc_oas_2026', 'ossc_cgl_2026', 'osssc_ri_ari_2026', 'ugc_net_dec_2026', 'odisha_teacher_tet'];
export const AT_BILINGUAL_SECTIONS = ['study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home'];

const _at3Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

export function computeBiggestDropoffStage(s1, s2, s3, s4, s5) {
  const transitions = [
    ['syllabus_reads', s1 > 0 ? (s1 - s2) / s1 : 0],
    ['pyq_downloads', s2 > 0 ? (s2 - s3) / s2 : 0],
    ['mock_attempts', s3 > 0 ? (s3 - s4) / s3 : 0],
    ['official_apply_clicks', s4 > 0 ? (s4 - s5) / s4 : 0]
  ];
  transitions.sort((a, b) => b[1] - a[1]);
  return transitions[0][0];
}

export function computeOdiaSharePct(enViews, orViews) {
  const total = Number(enViews || 0) + Number(orViews || 0);
  if (total <= 0) return 0;
  return Math.round((Number(orViews || 0) / total) * 100);
}

export function computeEngagementScore({ posts = 0, threads = 0, questions = 0, verifiedAnswers = 0, sharedNotes = 0, contributors = 0 }) {
  const raw = posts * 4 + threads * 5 + questions * 3 + verifiedAnswers * 6 + sharedNotes * 8 + contributors * 2;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

AT_REV_TABLES['10'] = {
  table: 'at_exam_funnels',
  cols: [
    'funnel_key', 'exam_title_en', 'exam_title_or',
    'stage_1_discovery_views', 'stage_2_syllabus_reads', 'stage_3_pyq_downloads',
    'stage_4_mock_attempts', 'stage_5_official_apply_clicks',
    'biggest_dropoff_stage', 'optimization_note_en', 'optimization_note_or'
  ]
};

export async function ensureAnalyticsTelemetryBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureAnalyticsTelemetryBatch2Schema(db);
  if (_at3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS at_outbound_referrals (
      id TEXT PRIMARY KEY,
      authority_key TEXT NOT NULL CHECK (authority_key IN ('opsc', 'ossc', 'osssc', 'nta_ugc_net', 'sams_odisha', 'odisha_gov_schemes', 'bse_chse_odisha')),
      authority_name_en TEXT NOT NULL,
      authority_name_or TEXT NOT NULL DEFAULT '',
      official_domain TEXT NOT NULL,
      source_portal_section TEXT NOT NULL DEFAULT 'jobs-careers' CHECK (source_portal_section IN ('jobs-careers', 'schemes', 'study-library', 'educational-tools')),
      link_category TEXT NOT NULL DEFAULT 'apply_online' CHECK (link_category IN ('apply_online', 'official_notification_pdf', 'admit_card', 'result_merit_list', 'scheme_portal')),
      clicks_7d INTEGER NOT NULL DEFAULT 0,
      clicks_30d INTEGER NOT NULL DEFAULT 0,
      last_clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
      verified_official_ssl INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_outbound_auth ON at_outbound_referrals(authority_key, link_category, clicks_30d DESC)`,
    `CREATE TABLE IF NOT EXISTS at_exam_funnels (
      id TEXT PRIMARY KEY,
      funnel_key TEXT NOT NULL UNIQUE CHECK (funnel_key IN ('opsc_oas_2026', 'ossc_cgl_2026', 'osssc_ri_ari_2026', 'ugc_net_dec_2026', 'odisha_teacher_tet')),
      exam_title_en TEXT NOT NULL,
      exam_title_or TEXT NOT NULL DEFAULT '',
      stage_1_discovery_views INTEGER NOT NULL DEFAULT 0,
      stage_2_syllabus_reads INTEGER NOT NULL DEFAULT 0,
      stage_3_pyq_downloads INTEGER NOT NULL DEFAULT 0,
      stage_4_mock_attempts INTEGER NOT NULL DEFAULT 0,
      stage_5_official_apply_clicks INTEGER NOT NULL DEFAULT 0,
      biggest_dropoff_stage TEXT NOT NULL DEFAULT 'mock_attempts',
      optimization_note_en TEXT NOT NULL DEFAULT '',
      optimization_note_or TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_funnel_key ON at_exam_funnels(funnel_key)`,
    `CREATE TABLE IF NOT EXISTS at_bilingual_usage (
      id TEXT PRIMARY KEY,
      portal_section TEXT NOT NULL UNIQUE CHECK (portal_section IN ('study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home')),
      section_label_en TEXT NOT NULL,
      section_label_or TEXT NOT NULL DEFAULT '',
      english_views INTEGER NOT NULL DEFAULT 0,
      odia_views INTEGER NOT NULL DEFAULT 0,
      bilingual_toggle_switches INTEGER NOT NULL DEFAULT 0,
      odia_share_pct INTEGER NOT NULL DEFAULT 0,
      top_odia_topic TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_bilingual_share ON at_bilingual_usage(odia_share_pct DESC)`,
    `CREATE TABLE IF NOT EXISTS at_community_engagement_index (
      id TEXT PRIMARY KEY,
      bucket_week TEXT NOT NULL UNIQUE,
      posts_created INTEGER NOT NULL DEFAULT 0,
      forum_threads_created INTEGER NOT NULL DEFAULT 0,
      questions_asked INTEGER NOT NULL DEFAULT 0,
      verified_mentor_answers INTEGER NOT NULL DEFAULT 0,
      knowledge_notes_shared INTEGER NOT NULL DEFAULT 0,
      active_contributors INTEGER NOT NULL DEFAULT 0,
      engagement_index_score INTEGER NOT NULL DEFAULT 0,
      top_active_district TEXT NOT NULL DEFAULT 'Khordha',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_at_comm_idx_week ON at_community_engagement_index(bucket_week DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 09 outbound referrals
  const obCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_outbound_referrals`).first();
  if (Number(obCnt?.n || 0) === 0) {
    const obs = [
      ['at-ob-01', 'opsc', 'Odisha Public Service Commission (OPSC)', 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ (OPSC)', 'opsc.gov.in', 'jobs-careers', 'apply_online', 420, 1680, 1],
      ['at-ob-02', 'ossc', 'Odisha Staff Selection Commission (OSSC)', 'ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSC)', 'ossc.gov.in', 'jobs-careers', 'official_notification_pdf', 385, 1490, 1],
      ['at-ob-03', 'osssc', 'Odisha Sub-ordinate Staff Selection Commission', 'ଓଡ଼ିଶା ଅଧସ୍ତନ କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ', 'osssc.gov.in', 'jobs-careers', 'admit_card', 310, 1120, 1],
      ['at-ob-04', 'nta_ugc_net', 'NTA UGC NET Official Portal', 'NTA UGC NET ସରକାରୀ ପୋର୍ଟାଲ୍', 'ugcnet.nta.nic.in', 'study-library', 'apply_online', 195, 740, 1],
      ['at-ob-05', 'sams_odisha', 'SAMS Odisha (+2 / +3 / B.Ed)', 'SAMS ଓଡ଼ିଶା (+୨ / +୩ / B.Ed)', 'samsodisha.gov.in', 'educational-tools', 'scheme_portal', 260, 980, 1]
    ];
    for (const o of obs) {
      await db.prepare(
        `INSERT INTO at_outbound_referrals (id, authority_key, authority_name_en, authority_name_or, official_domain, source_portal_section, link_category, clicks_7d, clicks_30d, verified_official_ssl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...o).run();
    }
  }

  // Seed Module 10 exam funnels
  const fnCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_exam_funnels`).first();
  if (Number(fnCnt?.n || 0) === 0) {
    const funnels = [
      ['at-fn-01', 'opsc_oas_2026', 'OPSC OAS Civil Services 2026', 'OPSC OAS ସିଭିଲ୍ ସର୍ଭିସ୍ ୨୦୨୬', 4200, 2850, 1920, 840, 520, 'mock_attempts', 'Add 15-minute mini mocks right after PYQ download.', 'PYQ ଡାଉନଲୋଡ୍ ପରେ ୧୫ ମିନିଟ୍ ମିନି ମକ୍ ଟେଷ୍ଟ ଯୋଡ଼ନ୍ତୁ।'],
      ['at-fn-02', 'ossc_cgl_2026', 'OSSC CGL Combined Graduate 2026', 'OSSC CGL ୨୦୨୬', 3600, 2400, 1650, 1100, 690, 'official_apply_clicks', 'Highlight direct OSSC apply checklist on mock completion.', 'ମକ୍ ସମାପ୍ତିରେ OSSC ଆବେଦନ ତାଲିକା ଦେଖାନ୍ତୁ।'],
      ['at-fn-03', 'osssc_ri_ari_2026', 'OSSSC RI / ARI / Amin 2026', 'OSSSC RI / ARI / ଅମିନ ୨୦୨୬', 2950, 1800, 1210, 510, 340, 'mock_attempts', 'Provide Odia-medium math practice mocks.', 'ଓଡ଼ିଆ ମାଧ୍ୟମ ଗଣିତ ମକ୍ ଟେଷ୍ଟ ପ୍ରଦାନ କରନ୍ତୁ।'],
      ['at-fn-04', 'ugc_net_dec_2026', 'UGC NET Dec 2026 (Odia & English)', 'UGC NET ଡିସେମ୍ବର ୨୦୨୬', 1800, 1240, 890, 420, 260, 'mock_attempts', 'Add Paper-I Research Aptitude mock series.', 'ପେପର-୧ ଗବେଷଣା ଯୋଗ୍ୟତା ମକ୍ ସିରିଜ୍ ଯୋଡ଼ନ୍ତୁ।']
    ];
    for (const f of funnels) {
      await db.prepare(
        `INSERT INTO at_exam_funnels (id, funnel_key, exam_title_en, exam_title_or, stage_1_discovery_views, stage_2_syllabus_reads, stage_3_pyq_downloads, stage_4_mock_attempts, stage_5_official_apply_clicks, biggest_dropoff_stage, optimization_note_en, optimization_note_or)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...f).run();
    }
  }

  // Seed Module 11 bilingual usage
  const biCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_bilingual_usage`).first();
  if (Number(biCnt?.n || 0) === 0) {
    const bis = [
      ['at-bi-01', 'study-library', 'Study Library', 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ', 2840, 1960, 410, 41, 'Odisha History & Culture PYQs'],
      ['at-bi-02', 'jobs-careers', 'Jobs & Careers', 'ଚାକିରି ଏବଂ କ୍ୟାରିଅର୍', 2190, 1720, 340, 44, 'OSSC / OSSSC Recruitment Alerts'],
      ['at-bi-03', 'schemes', 'Odisha Govt Schemes', 'ଓଡ଼ିଶା ସରକାରୀ ଯୋଜନା', 1120, 2240, 520, 67, 'Subhadra Yojana & CM Kisan'],
      ['at-bi-04', 'educational-tools', 'Educational Tools', 'ଶିକ୍ଷାଗତ ଉପକରଣ', 980, 640, 190, 39, 'Percentage & OPSC Age Calculator'],
      ['at-bi-05', 'community', 'Community & Q&A', 'କମ୍ୟୁନିଟି ଏବଂ ପ୍ରଶ୍ନୋତ୍ତର', 860, 790, 230, 48, 'OPSC Mains Strategy'],
      ['at-bi-06', 'home', 'Portal Home', 'ମୂଳ ପୃଷ୍ଠା', 1940, 1320, 280, 40, 'Odisha Exam Calendar 2026']
    ];
    for (const b of bis) {
      await db.prepare(
        `INSERT INTO at_bilingual_usage (id, portal_section, section_label_en, section_label_or, english_views, odia_views, bilingual_toggle_switches, odia_share_pct, top_odia_topic)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...b).run();
    }
  }

  // Seed Module 12 community engagement index
  const ciCnt = await db.prepare(`SELECT COUNT(*) AS n FROM at_community_engagement_index`).first();
  if (Number(ciCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO at_community_engagement_index (id, bucket_week, posts_created, forum_threads_created, questions_asked, verified_mentor_answers, knowledge_notes_shared, active_contributors, engagement_index_score, top_active_district)
       VALUES ('at-ci-01', '2026-W45', 8, 5, 11, 9, 4, 18, 78, 'Balasore')`
    ).run();
    await db.prepare(
      `INSERT INTO at_community_engagement_index (id, bucket_week, posts_created, forum_threads_created, questions_asked, verified_mentor_answers, knowledge_notes_shared, active_contributors, engagement_index_score, top_active_district)
       VALUES ('at-ci-02', '2026-W46', 11, 7, 14, 12, 6, 24, 86, 'Khordha')`
    ).run();
  }

  _at3Ready.add(db);
}

/* ================= MODULE 09: OUTBOUND REFERRALS ================= */
async function handleOutbound(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const auth = (url.searchParams.get('authority_key') || '').trim();
    const cat = (url.searchParams.get('link_category') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    const where = [];
    const binds = [];
    if (auth) { where.push('authority_key = ?'); binds.push(auth); }
    if (cat) { where.push('link_category = ?'); binds.push(cat); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(authority_name_en LIKE ? ESCAPE '\\' OR official_domain LIKE ? ESCAPE '\\')`);
      binds.push(l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM at_outbound_referrals ${w} ORDER BY clicks_30d DESC`
    ).bind(...binds).all();
    return json({ items: (results || []).map(r => ({ ...r, verified_official_ssl: Number(r.verified_official_ssl || 0) === 1 })) });
  }

  if (sub === 'record' && method === 'POST') {
    const body = await readJson(request, 12000);
    const errors = {};
    const auth = pick(body.authority_key, AT_AUTHORITIES, 'authority_key', errors, 'opsc');
    const cat = pick(body.link_category, AT_OUTBOUND_CATS, 'link_category', errors, 'apply_online');
    const src = pick(body.source_portal_section, AT_OUTBOUND_SOURCES, 'source_portal_section', errors, 'jobs-careers');
    if (Object.keys(errors).length) throw validationError(errors);

    const ex = await db.prepare(
      `SELECT id FROM at_outbound_referrals WHERE authority_key = ? AND link_category = ? LIMIT 1`
    ).bind(auth, cat).first();

    let rowId = ex?.id;
    if (rowId) {
      await db.prepare(
        `UPDATE at_outbound_referrals SET clicks_7d = clicks_7d + 1, clicks_30d = clicks_30d + 1, last_clicked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(rowId).run();
    } else {
      rowId = rid('at-ob');
      await db.prepare(
        `INSERT INTO at_outbound_referrals (id, authority_key, authority_name_en, official_domain, source_portal_section, link_category, clicks_7d, clicks_30d, verified_official_ssl)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1)`
      ).bind(
        rowId, auth, cleanStr(body.authority_name_en || auth.toUpperCase(), 140),
        cleanStr(body.official_domain || `${auth}.gov.in`, 120), src, cat
      ).run();
    }
    if (actor) await audit(env, request, actor, 'at.outbound.record', 'at_outbound_referrals', rowId, { authority_key: auth, link_category: cat });
    const item = await db.prepare(`SELECT * FROM at_outbound_referrals WHERE id = ?`).bind(rowId).first();
    return json({ item: { ...item, verified_official_ssl: Number(item.verified_official_ssl || 0) === 1 } }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM at_outbound_referrals WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Outbound referral not found');
    const body = await readJson(request, 10000);
    const ssl = body.verified_official_ssl !== undefined ? (body.verified_official_ssl ? 1 : 0) : existing.verified_official_ssl;
    await db.prepare(`UPDATE at_outbound_referrals SET verified_official_ssl = ?, updated_at = datetime('now') WHERE id = ?`).bind(ssl, sub).run();
    await audit(env, request, actor, 'at.outbound.update', 'at_outbound_referrals', sub, { verified_official_ssl: ssl });
    const updated = await db.prepare(`SELECT * FROM at_outbound_referrals WHERE id = ?`).bind(sub).first();
    return json({ item: { ...updated, verified_official_ssl: Number(updated.verified_official_ssl || 0) === 1 } });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 10: EXAM FUNNELS ================= */
async function handleFunnels(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM at_exam_funnels ORDER BY stage_1_discovery_views DESC`).all();
    return json({ items: results || [] });
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM at_exam_funnels WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Exam funnel not found');
    const body = await readJson(request, 15000);
    const s1 = body.stage_1_discovery_views !== undefined ? Math.max(0, Number(body.stage_1_discovery_views)) : existing.stage_1_discovery_views;
    const s2 = body.stage_2_syllabus_reads !== undefined ? Math.max(0, Number(body.stage_2_syllabus_reads)) : existing.stage_2_syllabus_reads;
    const s3 = body.stage_3_pyq_downloads !== undefined ? Math.max(0, Number(body.stage_3_pyq_downloads)) : existing.stage_3_pyq_downloads;
    const s4 = body.stage_4_mock_attempts !== undefined ? Math.max(0, Number(body.stage_4_mock_attempts)) : existing.stage_4_mock_attempts;
    const s5 = body.stage_5_official_apply_clicks !== undefined ? Math.max(0, Number(body.stage_5_official_apply_clicks)) : existing.stage_5_official_apply_clicks;
    const dropoff = computeBiggestDropoffStage(s1, s2, s3, s4, s5);
    const noteEn = body.optimization_note_en !== undefined ? cleanStr(body.optimization_note_en, 400) : existing.optimization_note_en;
    const noteOr = body.optimization_note_or !== undefined ? cleanStr(body.optimization_note_or, 400) : existing.optimization_note_or;

    await snapshotAtRevision(db, '10', sub, actor, body.change_note || 'update exam funnel');
    await db.prepare(
      `UPDATE at_exam_funnels
       SET stage_1_discovery_views = ?, stage_2_syllabus_reads = ?, stage_3_pyq_downloads = ?, stage_4_mock_attempts = ?, stage_5_official_apply_clicks = ?,
           biggest_dropoff_stage = ?, optimization_note_en = ?, optimization_note_or = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(s1, s2, s3, s4, s5, dropoff, noteEn, noteOr, sub).run();

    await audit(env, request, actor, 'at.funnel.update', 'at_exam_funnels', sub, { biggest_dropoff_stage: dropoff });
    const updated = await db.prepare(`SELECT * FROM at_exam_funnels WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 11: BILINGUAL USAGE ================= */
async function handleBilingual(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const { results } = await db.prepare(`SELECT * FROM at_bilingual_usage ORDER BY odia_share_pct DESC`).all();
    const items = results || [];
    const totalEn = items.reduce((a, b) => a + Number(b.english_views || 0), 0);
    const totalOr = items.reduce((a, b) => a + Number(b.odia_views || 0), 0);
    return json({
      items,
      totals: {
        english_views: totalEn,
        odia_views: totalOr,
        odia_share_pct: computeOdiaSharePct(totalEn, totalOr)
      }
    });
  }

  if (sub === 'record' && method === 'POST') {
    const body = await readJson(request, 10000);
    const errors = {};
    const section = pick(body.portal_section, AT_BILINGUAL_SECTIONS, 'portal_section', errors, 'study-library');
    const lang = body.lang_mode === 'or' ? 'or' : 'en';
    const isToggle = Boolean(body.is_toggle_switch);
    if (Object.keys(errors).length) throw validationError(errors);

    const existing = await db.prepare(`SELECT * FROM at_bilingual_usage WHERE portal_section = ?`).bind(section).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Portal section not found');
    const nextEn = existing.english_views + (lang === 'en' ? 1 : 0);
    const nextOr = existing.odia_views + (lang === 'or' ? 1 : 0);
    const nextToggles = existing.bilingual_toggle_switches + (isToggle ? 1 : 0);
    const sharePct = computeOdiaSharePct(nextEn, nextOr);

    await db.prepare(
      `UPDATE at_bilingual_usage
       SET english_views = ?, odia_views = ?, bilingual_toggle_switches = ?, odia_share_pct = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(nextEn, nextOr, nextToggles, sharePct, existing.id).run();

    await audit(env, request, actor, 'at.bilingual.record', 'at_bilingual_usage', existing.id, { portal_section: section, lang });
    const updated = await db.prepare(`SELECT * FROM at_bilingual_usage WHERE id = ?`).bind(existing.id).first();
    return json({ item: updated }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 12: COMMUNITY ENGAGEMENT INDEX ================= */
async function readLiveCommunitySnapshot(db) {
  const snap = {
    posts_created: 0,
    forum_threads_created: 0,
    questions_asked: 0,
    verified_mentor_answers: 0,
    knowledge_notes_shared: 0,
    active_contributors: 0
  };
  try {
    const [p, ft, qa, va, sk] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS n FROM urc_community_posts`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_forum_threads`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_student_questions`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_student_questions WHERE is_verified_answer = 1`).first(),
      db.prepare(`SELECT COUNT(*) AS n FROM urc_shared_knowledge`).first()
    ]);
    snap.posts_created = Number(p?.n || 0);
    snap.forum_threads_created = Number(ft?.n || 0);
    snap.questions_asked = Number(qa?.n || 0);
    snap.verified_mentor_answers = Number(va?.n || 0);
    snap.knowledge_notes_shared = Number(sk?.n || 0);
    snap.active_contributors = Math.max(1, snap.posts_created + snap.forum_threads_created);
  } catch { /* URC tables optional in standalone tests */ }
  return snap;
}

async function handleCommunityIndex(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;

  if (!sub && method === 'GET') {
    const [{ results }, live] = await Promise.all([
      db.prepare(`SELECT * FROM at_community_engagement_index ORDER BY bucket_week DESC LIMIT 24`).all(),
      readLiveCommunitySnapshot(db)
    ]);
    return json({ items: results || [], live_snapshot: live });
  }

  if (sub === 'recompute' && method === 'POST') {
    const body = await readJson(request, 10000).catch(() => ({}));
    const live = await readLiveCommunitySnapshot(db);
    const posts = body.posts_created !== undefined ? Number(body.posts_created) : live.posts_created;
    const threads = body.forum_threads_created !== undefined ? Number(body.forum_threads_created) : live.forum_threads_created;
    const questions = body.questions_asked !== undefined ? Number(body.questions_asked) : live.questions_asked;
    const verified = body.verified_mentor_answers !== undefined ? Number(body.verified_mentor_answers) : live.verified_mentor_answers;
    const notes = body.knowledge_notes_shared !== undefined ? Number(body.knowledge_notes_shared) : live.knowledge_notes_shared;
    const contributors = body.active_contributors !== undefined ? Number(body.active_contributors) : live.active_contributors;
    const score = computeEngagementScore({
      posts, threads, questions, verifiedAnswers: verified, sharedNotes: notes, contributors
    });
    const week = cleanStr(body.bucket_week || '2026-W47', 20);
    const dist = cleanStr(body.top_active_district || 'Khordha', 80);

    const ex = await db.prepare(`SELECT id FROM at_community_engagement_index WHERE bucket_week = ?`).bind(week).first();
    let rowId = ex?.id;
    if (rowId) {
      await db.prepare(
        `UPDATE at_community_engagement_index
         SET posts_created = ?, forum_threads_created = ?, questions_asked = ?, verified_mentor_answers = ?,
             knowledge_notes_shared = ?, active_contributors = ?, engagement_index_score = ?, top_active_district = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(posts, threads, questions, verified, notes, contributors, score, dist, rowId).run();
    } else {
      rowId = rid('at-ci');
      await db.prepare(
        `INSERT INTO at_community_engagement_index (id, bucket_week, posts_created, forum_threads_created, questions_asked, verified_mentor_answers, knowledge_notes_shared, active_contributors, engagement_index_score, top_active_district)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(rowId, week, posts, threads, questions, verified, notes, contributors, score, dist).run();
    }
    await audit(env, request, actor, 'at.community_index.recompute', 'at_community_engagement_index', rowId, { bucket_week: week, engagement_index_score: score });
    const item = await db.prepare(`SELECT * FROM at_community_engagement_index WHERE id = ?`).bind(rowId).first();
    return json({ item }, 201);
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= PUBLIC COOKIELESS OUTBOUND BEACON ================= */
export async function handlePublicTelemetryOutboundApi(request, env) {
  if (!env || !env.DB) return json({ ok: false }, 503);
  await ensureAnalyticsTelemetryBatch3Schema(env.DB);
  const bucketHash = await dailySaltedBucketHash(clientIp(request));
  await rateLimit(env, `tel-out:${bucketHash}`, 60, 60);

  const body = await readJson(request, 8000);
  const errors = {};
  const auth = pick(body.authority_key, AT_AUTHORITIES, 'authority_key', errors, null);
  const cat = pick(body.link_category, AT_OUTBOUND_CATS, 'link_category', errors, 'apply_online');
  if (!auth) errors.authority_key = 'Valid authority_key is required';
  if (Object.keys(errors).length) throw validationError(errors);

  const ex = await env.DB.prepare(
    `SELECT id FROM at_outbound_referrals WHERE authority_key = ? AND link_category = ? LIMIT 1`
  ).bind(auth, cat).first();
  if (ex) {
    await env.DB.prepare(
      `UPDATE at_outbound_referrals SET clicks_7d = clicks_7d + 1, clicks_30d = clicks_30d + 1, last_clicked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(ex.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO at_outbound_referrals (id, authority_key, authority_name_en, official_domain, source_portal_section, link_category, clicks_7d, clicks_30d, verified_official_ssl)
       VALUES (?, ?, ?, ?, 'jobs-careers', ?, 1, 1, 1)`
    ).bind(rid('at-ob'), auth, auth.toUpperCase(), `${auth}.gov.in`, cat).run();
  }
  return json({ ok: true, cookieless: true, pii_stored: false }, 202);
}

export async function handleAnalyticsBatch3Admin(request, env, actor, id, sub, extra) {
  await ensureAnalyticsTelemetryBatch3Schema(env.DB);
  if (id === 'outbound') return handleOutbound(request, env, actor, sub, extra);
  if (id === 'funnels') return handleFunnels(request, env, actor, sub, extra);
  if (id === 'bilingual') return handleBilingual(request, env, actor, sub, extra);
  if (id === 'community-index') return handleCommunityIndex(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown analytics batch 3 route');
}
