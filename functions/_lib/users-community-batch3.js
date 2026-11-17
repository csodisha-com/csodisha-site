// Users, Roles & Community Batch 3 (v98): Modules 09-12
// 09 Comments & Replies | 10 Moderation Queue | 11 User Reports | 12 Blocked Accounts
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, likeEscape } from './validate.js';
import { REV_TABLES, snapshotRevision } from './users-community-batch1.js';
import { ensureUsersCommunityBatch2Schema } from './users-community-batch2.js';

export const URC_COMMENT_STATUSES = ['published', 'pending_review', 'hidden_spam', 'archived'];
export const URC_MOD_CONTENT_TYPES = ['community_post', 'comment_reply', 'forum_thread', 'shared_note', 'profile_bio'];
export const URC_MOD_FLAG_SOURCES = ['pre_publish_filter', 'keyword_guard', 'community_flag', 'new_account_hold'];
export const URC_MOD_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
export const URC_MOD_DECISIONS = ['pending', 'approved', 'rejected', 'escalated'];
export const URC_REPORT_CATEGORIES = ['spam_promotion', 'harassment_abuse', 'misinformation_exam', 'copyright_piracy', 'impersonation'];
export const URC_REPORT_SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const URC_REPORT_STATUSES = ['open', 'investigating', 'action_taken', 'dismissed'];
export const URC_BLOCK_SCOPES = ['full_account', 'community_posting_only', 'ip_rate_block'];
export const URC_BLOCK_REASONS = ['repeated_spam', 'exam_leak_fraud', 'harassment', 'payment_chargeback_abuse', 'bot_scraping'];
export const URC_BLOCK_STATUSES = ['active', 'expired', 'unblocked'];

const _urc3Ready = new WeakSet();

function rid(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 10)}`; }

function pick(val, allowed, field, errors, def) {
  if (val === undefined || val === null || val === '') return def;
  if (!allowed.includes(val)) {
    errors[field] = `${field} must be one of: ${allowed.join(', ')}`;
    return def;
  }
  return val;
}

REV_TABLES['09'] = {
  table: 'urc_comments',
  cols: ['post_id', 'parent_comment_id', 'author_user_id', 'author_name', 'author_badge', 'body_en', 'body_or', 'is_official_mentor_reply', 'upvotes_count', 'status']
};
REV_TABLES['11'] = {
  table: 'urc_user_reports',
  cols: ['report_code', 'reported_user_id', 'reported_user_name', 'reported_email', 'reporter_name', 'reporter_email', 'violation_category', 'target_url_or_ref', 'description_text', 'severity', 'report_status', 'action_summary', 'resolved_by', 'resolved_at']
};
REV_TABLES['12'] = {
  table: 'urc_blocked_accounts',
  cols: ['block_code', 'user_id', 'blocked_email', 'blocked_ip_hash', 'block_scope', 'reason_category', 'reason_notes', 'is_permanent', 'expires_at', 'block_status', 'blocked_by', 'unblocked_by', 'unblocked_at']
};

export async function ensureUsersCommunityBatch3Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureUsersCommunityBatch2Schema(db);
  if (_urc3Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS urc_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      parent_comment_id TEXT,
      author_user_id TEXT,
      author_name TEXT NOT NULL,
      author_badge TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL,
      body_or TEXT NOT NULL DEFAULT '',
      is_official_mentor_reply INTEGER NOT NULL DEFAULT 0,
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review', 'hidden_spam', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_comments_post ON urc_comments(post_id, status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_moderation_queue (
      id TEXT PRIMARY KEY,
      queue_code TEXT NOT NULL UNIQUE,
      content_type TEXT NOT NULL DEFAULT 'community_post' CHECK (content_type IN ('community_post', 'comment_reply', 'forum_thread', 'shared_note', 'profile_bio')),
      source_table TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL DEFAULT '',
      author_user_id TEXT,
      author_name TEXT NOT NULL DEFAULT '',
      excerpt_text TEXT NOT NULL DEFAULT '',
      flag_source TEXT NOT NULL DEFAULT 'pre_publish_filter' CHECK (flag_source IN ('pre_publish_filter', 'keyword_guard', 'community_flag', 'new_account_hold')),
      risk_reason TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      decision_status TEXT NOT NULL DEFAULT 'pending' CHECK (decision_status IN ('pending', 'approved', 'rejected', 'escalated')),
      moderator_note TEXT NOT NULL DEFAULT '',
      decided_by TEXT NOT NULL DEFAULT '',
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_mod_queue_status ON urc_moderation_queue(decision_status, priority, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_user_reports (
      id TEXT PRIMARY KEY,
      report_code TEXT NOT NULL UNIQUE,
      reported_user_id TEXT,
      reported_user_name TEXT NOT NULL DEFAULT '',
      reported_email TEXT NOT NULL DEFAULT '',
      reporter_name TEXT NOT NULL DEFAULT '',
      reporter_email TEXT NOT NULL DEFAULT '',
      violation_category TEXT NOT NULL DEFAULT 'spam_promotion' CHECK (violation_category IN ('spam_promotion', 'harassment_abuse', 'misinformation_exam', 'copyright_piracy', 'impersonation')),
      target_url_or_ref TEXT NOT NULL DEFAULT '',
      description_text TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      report_status TEXT NOT NULL DEFAULT 'open' CHECK (report_status IN ('open', 'investigating', 'action_taken', 'dismissed')),
      action_summary TEXT NOT NULL DEFAULT '',
      resolved_by TEXT NOT NULL DEFAULT '',
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reported_user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_reports_status ON urc_user_reports(report_status, severity, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS urc_blocked_accounts (
      id TEXT PRIMARY KEY,
      block_code TEXT NOT NULL UNIQUE,
      user_id TEXT,
      blocked_email TEXT NOT NULL DEFAULT '',
      blocked_ip_hash TEXT NOT NULL DEFAULT '',
      block_scope TEXT NOT NULL DEFAULT 'full_account' CHECK (block_scope IN ('full_account', 'community_posting_only', 'ip_rate_block')),
      reason_category TEXT NOT NULL DEFAULT 'repeated_spam' CHECK (reason_category IN ('repeated_spam', 'exam_leak_fraud', 'harassment', 'payment_chargeback_abuse', 'bot_scraping')),
      reason_notes TEXT NOT NULL DEFAULT '',
      is_permanent INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      block_status TEXT NOT NULL DEFAULT 'active' CHECK (block_status IN ('active', 'expired', 'unblocked')),
      blocked_by TEXT NOT NULL DEFAULT '',
      unblocked_by TEXT NOT NULL DEFAULT '',
      unblocked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES urc_users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_urc_blocked_status ON urc_blocked_accounts(block_status, block_scope, created_at DESC)`
  ];
  for (const sql of ddl) await db.prepare(sql).run();

  // Seed Module 09 comments
  const cmtCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_comments`).first();
  if (Number(cmtCnt?.n || 0) === 0) {
    const comments = [
      [
        'urc-cmt-001', 'urc-post-001', null, 'urc-u-004', 'Ananya Senapati', 'OAS Aspirant',
        'Thank you Sir! Could you also share the 1936 Odisha Province formation timeline notes?',
        'ଧନ୍ୟବାଦ ସାର୍! ୧୯୩୬ ସ୍ୱତନ୍ତ୍ର ଓଡ଼ିଶା ପ୍ରଦେଶ ଗଠନର ସମୟସୀମା ନୋଟ୍ସ ମଧ୍ୟ ସେୟାର କରିବେ କି?',
        0, 9, 'published'
      ],
      [
        'urc-cmt-002', 'urc-post-001', 'urc-cmt-001', 'urc-u-003', 'Prof. Biswajit Panigrahi', 'Verified Educator',
        'Yes Ananya, I have uploaded the 1903-1936 Utkal Sammilani chronology in the Study Library.',
        'ହଁ ଅନନ୍ୟା, ମୁଁ ଷ୍ଟଡି ଲାଇବ୍ରେରୀରେ ୧୯୦୩-୧୯୩୬ ଉତ୍କଳ ସମ୍ମିଳନୀ କ୍ରମ ଅପଲୋଡ୍ କରିଛି।',
        1, 14, 'published'
      ],
      [
        'urc-cmt-003', 'urc-post-002', null, 'urc-u-005', 'Debasis Pradhan', 'Aspirant',
        'Check out this external telegram group for leaked mock PDFs!',
        '',
        0, 0, 'pending_review'
      ]
    ];
    for (const c of comments) {
      await db.prepare(
        `INSERT INTO urc_comments (id, post_id, parent_comment_id, author_user_id, author_name, author_badge, body_en, body_or, is_official_mentor_reply, upvotes_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...c).run();
    }
  }

  // Seed Module 10 moderation queue
  const modCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_moderation_queue`).first();
  if (Number(modCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_moderation_queue (id, queue_code, content_type, source_table, source_id, author_user_id, author_name, excerpt_text, flag_source, risk_reason, priority, decision_status)
       VALUES ('urc-mod-001', 'MOD-2026-0001', 'comment_reply', 'urc_comments', 'urc-cmt-003', 'urc-u-005', 'Debasis Pradhan', 'Check out this external telegram group for leaked mock PDFs!', 'keyword_guard', 'Matched external telegram + leaked PDF keywords', 'high', 'pending')`
    ).run();
    await db.prepare(
      `INSERT INTO urc_moderation_queue (id, queue_code, content_type, source_table, source_id, author_user_id, author_name, excerpt_text, flag_source, risk_reason, priority, decision_status)
       VALUES ('urc-mod-002', 'MOD-2026-0002', 'community_post', 'urc_community_posts', 'urc-post-003', 'urc-u-006', 'Smita Naik', 'OTET & OSSTET Odia Pedagogy Revision Checklist', 'pre_publish_filter', 'First-time author pre-publish review', 'normal', 'pending')`
    ).run();
  }

  // Seed Module 11 user reports
  const rptCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_user_reports`).first();
  if (Number(rptCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_user_reports (id, report_code, reported_user_id, reported_user_name, reported_email, reporter_name, reporter_email, violation_category, target_url_or_ref, description_text, severity, report_status, action_summary)
       VALUES ('urc-rpt-001', 'RPT-USR-2026-0001', 'urc-u-005', 'Debasis Pradhan', 'debasis.khordha@example.in', 'Ananya Senapati', 'ananya.balasore@example.in', 'spam_promotion', 'urc-cmt-003', 'Posting unauthorized Telegram links in OSSC CGL thread.', 'high', 'open', '')`
    ).run();
    await db.prepare(
      `INSERT INTO urc_user_reports (id, report_code, reported_user_id, reported_user_name, reported_email, reporter_name, reporter_email, violation_category, target_url_or_ref, description_text, severity, report_status, action_summary, resolved_by, resolved_at)
       VALUES ('urc-rpt-002', 'RPT-USR-2026-0002', null, 'External Guest', 'guest.spam@example.net', 'Subhashree Mohanty', 'moderator@csodisha.com', 'misinformation_exam', '/community/opsc-date-rumor', 'False OPSC OAS exam postponement rumor.', 'medium', 'action_taken', 'Content removed and domain added to spam filter.', 'moderator@csodisha.com', datetime('now'))`
    ).run();
  }

  // Seed Module 12 blocked accounts
  const blkCnt = await db.prepare(`SELECT COUNT(*) AS n FROM urc_blocked_accounts`).first();
  if (Number(blkCnt?.n || 0) === 0) {
    await db.prepare(
      `INSERT INTO urc_blocked_accounts (id, block_code, user_id, blocked_email, blocked_ip_hash, block_scope, reason_category, reason_notes, is_permanent, block_status, blocked_by)
       VALUES ('urc-blk-001', 'BLK-2026-0001', null, 'spam.bot.odisha@example.net', 'sha256:9f86d08188', 'ip_rate_block', 'bot_scraping', 'Automated scraper hitting PYQ endpoints.', 1, 'active', 'founder@csodisha.com')`
    ).run();
  }

  _urc3Ready.add(db);
}

/** Guard against blocking self or primary super_admin. */
async function assertSafeToBlock(db, actor, userId, email) {
  if (userId && userId === actor?.userId) {
    throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot block your own active admin account');
  }
  if (email && email.toLowerCase() === String(actor?.email || '').toLowerCase()) {
    throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot block your own active admin account');
  }
  if (userId) {
    const u = await db.prepare(`SELECT id, email, role_key FROM urc_users WHERE id = ?`).bind(userId).first();
    if (u && u.role_key === 'super_admin') {
      throw new HttpError(409, 'PRIMARY_SUPER_ADMIN', 'Primary Super Admin cannot be blocked');
    }
    return u;
  }
  if (email) {
    const u = await db.prepare(`SELECT id, email, role_key FROM urc_users WHERE email = ?`).bind(email.toLowerCase()).first();
    if (u && u.role_key === 'super_admin') {
      throw new HttpError(409, 'PRIMARY_SUPER_ADMIN', 'Primary Super Admin cannot be blocked');
    }
    return u;
  }
  return null;
}

/* ================= MODULE 09: COMMENTS & REPLIES ================= */
function decorateComment(r) {
  if (!r) return r;
  return {
    ...r,
    is_official_mentor_reply: Number(r.is_official_mentor_reply || 0) === 1,
    upvotes_count: Number(r.upvotes_count || 0)
  };
}

async function handleComments(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('status') || '').trim();
    const postId = (url.searchParams.get('post_id') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('status = ?'); binds.push(status); }
    if (postId) { where.push('post_id = ?'); binds.push(postId); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(author_name LIKE ? ESCAPE '\\' OR body_en LIKE ? ESCAPE '\\' OR body_or LIKE ? ESCAPE '\\' OR post_id LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_comments ${w} ORDER BY created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateComment), total: (results || []).length });
  }

  if (sub === 'bulk-status' && (method === 'PATCH' || method === 'POST')) {
    const body = await readJson(request, 20000);
    const ids = Array.isArray(body.ids) ? body.ids.map(x => cleanStr(x, 80)).filter(Boolean) : [];
    const errors = {};
    const status = pick(body.status, URC_COMMENT_STATUSES, 'status', errors, null);
    if (!ids.length) errors.ids = 'Select at least one comment';
    if (!status) errors.status = 'Valid status is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let updated = 0;
    for (const cid of ids) {
      await snapshotRevision(db, '09', cid, actor, `bulk status -> ${status}`);
      await db.prepare(`UPDATE urc_comments SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, cid).run();
      updated++;
    }
    await audit(env, request, actor, 'urc.comments.bulk_status', 'urc_comments', ids.join(','), { status, updated });
    return json({ ok: true, updated, status });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 25000);
    const errors = {};
    const postId = cleanStr(body.post_id || 'urc-post-001', 120);
    const parentId = body.parent_comment_id ? cleanStr(body.parent_comment_id, 80) : null;
    const bodyEn = cleanStr(body.body_en || '', 2000);
    const bodyOr = cleanStr(body.body_or || '', 2000);
    const isMentor = body.is_official_mentor_reply ? 1 : 0;
    const status = pick(body.status, URC_COMMENT_STATUSES, 'status', errors, 'published');
    if (!bodyEn) errors.body_en = 'body_en is required';
    if (Object.keys(errors).length) throw validationError(errors);

    let authorId = body.author_user_id ? cleanStr(body.author_user_id, 80) : null;
    let authorName = cleanStr(body.author_name || '', 120);
    let authorBadge = cleanStr(body.author_badge || (isMentor ? 'Official Mentor' : ''), 80);
    if (!authorName) {
      const u = await db.prepare(`SELECT id, full_name FROM urc_users WHERE id = ? OR email = ? LIMIT 1`)
        .bind(authorId || actor?.userId || '', actor?.email || '').first();
      if (u) { authorId = u.id; authorName = u.full_name; }
      else authorName = 'CS Odisha Mentor';
    }

    const newId = rid('urc-cmt');
    await db.prepare(
      `INSERT INTO urc_comments (id, post_id, parent_comment_id, author_user_id, author_name, author_badge, body_en, body_or, is_official_mentor_reply, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, postId, parentId, authorId, authorName, authorBadge, bodyEn, bodyOr, isMentor, status).run();

    await db.prepare(`UPDATE urc_community_posts SET replies_count = replies_count + 1 WHERE id = ?`).bind(postId).run();
    await snapshotRevision(db, '09', newId, actor, 'create comment');
    await audit(env, request, actor, 'urc.comment.create', 'urc_comments', newId, { post_id: postId, is_mentor: isMentor });
    const created = await db.prepare(`SELECT * FROM urc_comments WHERE id = ?`).bind(newId).first();
    return json({ item: decorateComment(created) }, 201);
  }

  if (sub && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare(`SELECT * FROM urc_comments WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Comment not found');
    const body = await readJson(request, 25000);
    const errors = {};
    const bodyEn = body.body_en !== undefined ? cleanStr(body.body_en, 2000) : existing.body_en;
    const bodyOr = body.body_or !== undefined ? cleanStr(body.body_or, 2000) : existing.body_or;
    const isMentor = body.is_official_mentor_reply !== undefined ? (body.is_official_mentor_reply ? 1 : 0) : existing.is_official_mentor_reply;
    const status = body.status !== undefined ? pick(body.status, URC_COMMENT_STATUSES, 'status', errors, existing.status) : existing.status;
    if (!bodyEn) errors.body_en = 'body_en cannot be empty';
    if (Object.keys(errors).length) throw validationError(errors);

    await snapshotRevision(db, '09', sub, actor, body.change_note || 'update comment');
    await db.prepare(
      `UPDATE urc_comments SET body_en = ?, body_or = ?, is_official_mentor_reply = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(bodyEn, bodyOr, isMentor, status, sub).run();
    await audit(env, request, actor, 'urc.comment.update', 'urc_comments', sub, { status, is_mentor: isMentor });
    const updated = await db.prepare(`SELECT * FROM urc_comments WHERE id = ?`).bind(sub).first();
    return json({ item: decorateComment(updated) });
  }

  if (sub && method === 'DELETE') {
    const existing = await db.prepare(`SELECT * FROM urc_comments WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Comment not found');
    await snapshotRevision(db, '09', sub, actor, 'archive comment');
    await db.prepare(`UPDATE urc_comments SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(sub).run();
    await audit(env, request, actor, 'urc.comment.archive', 'urc_comments', sub, {});
    return json({ ok: true, id: sub, status: 'archived' });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 10: MODERATION QUEUE ================= */
async function nextQueueCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_moderation_queue`).first();
  return `MOD-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleModeration(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const decision = (url.searchParams.get('decision_status') || '').trim();
    const contentType = (url.searchParams.get('content_type') || '').trim();
    const priority = (url.searchParams.get('priority') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (decision) { where.push('decision_status = ?'); binds.push(decision); }
    if (contentType) { where.push('content_type = ?'); binds.push(contentType); }
    if (priority) { where.push('priority = ?'); binds.push(priority); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(queue_code LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\' OR excerpt_text LIKE ? ESCAPE '\\' OR risk_reason LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_moderation_queue ${w}
       ORDER BY CASE decision_status WHEN 'pending' THEN 0 WHEN 'escalated' THEN 1 ELSE 2 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const contentType = pick(body.content_type, URC_MOD_CONTENT_TYPES, 'content_type', errors, 'community_post');
    const flagSource = pick(body.flag_source, URC_MOD_FLAG_SOURCES, 'flag_source', errors, 'pre_publish_filter');
    const priority = pick(body.priority, URC_MOD_PRIORITIES, 'priority', errors, 'normal');
    const excerpt = cleanStr(body.excerpt_text || '', 600);
    const risk = cleanStr(body.risk_reason || '', 300);
    if (!excerpt) errors.excerpt_text = 'excerpt_text is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-mod');
    const qCode = await nextQueueCode(db);
    await db.prepare(
      `INSERT INTO urc_moderation_queue (id, queue_code, content_type, source_table, source_id, author_user_id, author_name, excerpt_text, flag_source, risk_reason, priority, decision_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(
      newId, qCode, contentType, cleanStr(body.source_table || '', 80), cleanStr(body.source_id || '', 80),
      body.author_user_id ? cleanStr(body.author_user_id, 80) : null, cleanStr(body.author_name || 'Guest', 120),
      excerpt, flagSource, risk, priority
    ).run();

    await audit(env, request, actor, 'urc.moderation.enqueue', 'urc_moderation_queue', newId, { queue_code: qCode });
    const created = await db.prepare(`SELECT * FROM urc_moderation_queue WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PATCH') {
    const item = await db.prepare(`SELECT * FROM urc_moderation_queue WHERE id = ?`).bind(sub).first();
    if (!item) throw new HttpError(404, 'NOT_FOUND', 'Moderation item not found');
    const body = await readJson(request, 15000);
    const errors = {};
    const decision = pick(body.decision || body.decision_status, URC_MOD_DECISIONS, 'decision', errors, null);
    const note = cleanStr(body.moderator_note || '', 400);
    if (!decision) errors.decision = 'Valid decision (approved, rejected, escalated) is required';
    if (Object.keys(errors).length) throw validationError(errors);

    // Cascade decision to linked source post or comment
    if (item.source_id && (decision === 'approved' || decision === 'rejected')) {
      if (item.source_table === 'urc_comments') {
        const nextCmtSt = decision === 'approved' ? 'published' : 'hidden_spam';
        await snapshotRevision(db, '09', item.source_id, actor, `moderation ${decision}`);
        await db.prepare(`UPDATE urc_comments SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(nextCmtSt, item.source_id).run();
      } else if (item.source_table === 'urc_community_posts') {
        const nextPostSt = decision === 'approved' ? 'published' : 'archived';
        await snapshotRevision(db, '08', item.source_id, actor, `moderation ${decision}`);
        await db.prepare(`UPDATE urc_community_posts SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(nextPostSt, item.source_id).run();
      }
    }

    await db.prepare(
      `UPDATE urc_moderation_queue SET decision_status = ?, moderator_note = ?, decided_by = ?, decided_at = datetime('now') WHERE id = ?`
    ).bind(decision, note, actor?.email || actor?.userId || 'moderator', sub).run();

    await audit(env, request, actor, `urc.moderation.${decision}`, 'urc_moderation_queue', sub, {
      source_table: item.source_table, source_id: item.source_id
    });
    const updated = await db.prepare(`SELECT * FROM urc_moderation_queue WHERE id = ?`).bind(sub).first();
    return json({ item: updated });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 11: USER REPORTS ================= */
async function nextReportCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_user_reports`).first();
  return `RPT-USR-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function nextBlockCode(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM urc_blocked_accounts`).first();
  return `BLK-2026-${String(Number(r?.n || 0) + 1).padStart(4, '0')}`;
}

async function handleReports(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('report_status') || '').trim();
    const cat = (url.searchParams.get('violation_category') || '').trim();
    const sev = (url.searchParams.get('severity') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('report_status = ?'); binds.push(status); }
    if (cat) { where.push('violation_category = ?'); binds.push(cat); }
    if (sev) { where.push('severity = ?'); binds.push(sev); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(report_code LIKE ? ESCAPE '\\' OR reported_user_name LIKE ? ESCAPE '\\' OR reported_email LIKE ? ESCAPE '\\' OR description_text LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_user_reports ${w}
       ORDER BY CASE report_status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 ELSE 2 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: results || [], total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const category = pick(body.violation_category, URC_REPORT_CATEGORIES, 'violation_category', errors, 'spam_promotion');
    const severity = pick(body.severity, URC_REPORT_SEVERITIES, 'severity', errors, 'medium');
    const desc = cleanStr(body.description_text || '', 1000);
    if (!desc) errors.description_text = 'description_text is required';
    if (Object.keys(errors).length) throw validationError(errors);

    const newId = rid('urc-rpt');
    const rCode = await nextReportCode(db);
    await db.prepare(
      `INSERT INTO urc_user_reports (id, report_code, reported_user_id, reported_user_name, reported_email, reporter_name, reporter_email, violation_category, target_url_or_ref, description_text, severity, report_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
    ).bind(
      newId, rCode,
      body.reported_user_id ? cleanStr(body.reported_user_id, 80) : null,
      cleanStr(body.reported_user_name || '', 120),
      cleanStr(body.reported_email || '', 160).toLowerCase(),
      cleanStr(body.reporter_name || 'Community Member', 120),
      cleanStr(body.reporter_email || '', 160).toLowerCase(),
      category, cleanStr(body.target_url_or_ref || '', 200), desc, severity
    ).run();

    await snapshotRevision(db, '11', newId, actor, 'create report');
    await audit(env, request, actor, 'urc.report.create', 'urc_user_reports', newId, { report_code: rCode, category });
    const created = await db.prepare(`SELECT * FROM urc_user_reports WHERE id = ?`).bind(newId).first();
    return json({ item: created }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM urc_user_reports WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Report not found');
    const body = await readJson(request, 20000);
    const errors = {};
    const status = body.report_status !== undefined ? pick(body.report_status, URC_REPORT_STATUSES, 'report_status', errors, existing.report_status) : existing.report_status;
    const summary = body.action_summary !== undefined ? cleanStr(body.action_summary, 500) : existing.action_summary;
    if (Object.keys(errors).length) throw validationError(errors);

    let autoBlockId = null;
    if (body.auto_block_user) {
      const targetUser = await assertSafeToBlock(db, actor, existing.reported_user_id, existing.reported_email);
      const targetUid = targetUser?.id || existing.reported_user_id || null;
      const targetEmail = (targetUser?.email || existing.reported_email || '').toLowerCase();
      if (!targetUid && !targetEmail) {
        throw validationError({ auto_block_user: 'Report has no reported_user_id or reported_email to block' });
      }
      autoBlockId = rid('urc-blk');
      const bCode = await nextBlockCode(db);
      await db.prepare(
        `INSERT INTO urc_blocked_accounts (id, block_code, user_id, blocked_email, block_scope, reason_category, reason_notes, is_permanent, block_status, blocked_by)
         VALUES (?, ?, ?, ?, 'full_account', 'repeated_spam', ?, 0, 'active', ?)`
      ).bind(autoBlockId, bCode, targetUid, targetEmail, `Auto-blocked from report ${existing.report_code}: ${summary || existing.description_text}`, actor?.email || 'admin').run();

      if (targetUid) {
        await db.prepare(`UPDATE urc_users SET account_status = 'blocked', updated_at = datetime('now') WHERE id = ?`).bind(targetUid).run();
      }
    }

    await snapshotRevision(db, '11', sub, actor, `resolve report -> ${status}`);
    await db.prepare(
      `UPDATE urc_user_reports
       SET report_status = ?, action_summary = ?, resolved_by = ?, resolved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(status, summary, actor?.email || actor?.userId || 'admin', sub).run();

    await audit(env, request, actor, 'urc.report.resolve', 'urc_user_reports', sub, {
      report_status: status, auto_block_id: autoBlockId
    });
    const updated = await db.prepare(`SELECT * FROM urc_user_reports WHERE id = ?`).bind(sub).first();
    return json({ item: updated, auto_block_id: autoBlockId });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

/* ================= MODULE 12: BLOCKED ACCOUNTS ================= */
function decorateBlock(r) {
  if (!r) return r;
  return { ...r, is_permanent: Number(r.is_permanent || 0) === 1 };
}

async function handleBlockedAccounts(request, env, actor, sub) {
  const db = env.DB;
  const method = request.method;
  const url = new URL(request.url);

  if (!sub && method === 'GET') {
    const status = (url.searchParams.get('block_status') || '').trim();
    const scope = (url.searchParams.get('block_scope') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = [];
    const binds = [];
    if (status) { where.push('block_status = ?'); binds.push(status); }
    if (scope) { where.push('block_scope = ?'); binds.push(scope); }
    if (q) {
      const l = likeEscape(q);
      where.push(`(block_code LIKE ? ESCAPE '\\' OR blocked_email LIKE ? ESCAPE '\\' OR blocked_ip_hash LIKE ? ESCAPE '\\' OR reason_notes LIKE ? ESCAPE '\\')`);
      binds.push(l, l, l, l);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { results } = await db.prepare(
      `SELECT * FROM urc_blocked_accounts ${w} ORDER BY CASE block_status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 200`
    ).bind(...binds).all();
    return json({ items: (results || []).map(decorateBlock), total: (results || []).length });
  }

  if (!sub && method === 'POST') {
    const body = await readJson(request, 20000);
    const errors = {};
    const scope = pick(body.block_scope, URC_BLOCK_SCOPES, 'block_scope', errors, 'full_account');
    const reason = pick(body.reason_category, URC_BLOCK_REASONS, 'reason_category', errors, 'repeated_spam');
    const notes = cleanStr(body.reason_notes || '', 500);
    const email = cleanStr(body.blocked_email || '', 160).toLowerCase();
    const ipHash = cleanStr(body.blocked_ip_hash || '', 120);
    const userId = body.user_id ? cleanStr(body.user_id, 80) : null;
    const isPerm = body.is_permanent ? 1 : 0;
    const expiresAt = !isPerm && body.expires_at ? cleanStr(body.expires_at, 40) : null;

    if (!userId && !email && !ipHash) errors.blocked_email = 'Provide user_id, blocked_email, or blocked_ip_hash';
    if (Object.keys(errors).length) throw validationError(errors);

    const linkedUser = await assertSafeToBlock(db, actor, userId, email);
    const resolvedUid = linkedUser?.id || userId || null;
    const resolvedEmail = email || linkedUser?.email || '';

    const newId = rid('urc-blk');
    const bCode = await nextBlockCode(db);
    await db.prepare(
      `INSERT INTO urc_blocked_accounts (id, block_code, user_id, blocked_email, blocked_ip_hash, block_scope, reason_category, reason_notes, is_permanent, expires_at, block_status, blocked_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    ).bind(newId, bCode, resolvedUid, resolvedEmail, ipHash, scope, reason, notes, isPerm, expiresAt, actor?.email || 'admin').run();

    if (resolvedUid && scope === 'full_account') {
      await db.prepare(`UPDATE urc_users SET account_status = 'blocked', updated_at = datetime('now') WHERE id = ?`).bind(resolvedUid).run();
    }

    await snapshotRevision(db, '12', newId, actor, 'create block rule');
    await audit(env, request, actor, 'urc.block.create', 'urc_blocked_accounts', newId, { block_code: bCode, block_scope: scope });
    const created = await db.prepare(`SELECT * FROM urc_blocked_accounts WHERE id = ?`).bind(newId).first();
    return json({ item: decorateBlock(created) }, 201);
  }

  if (sub && method === 'PATCH') {
    const existing = await db.prepare(`SELECT * FROM urc_blocked_accounts WHERE id = ?`).bind(sub).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Block record not found');
    const body = await readJson(request, 15000);
    const action = cleanStr(body.action || '', 20).toLowerCase();

    await snapshotRevision(db, '12', sub, actor, action || 'update block rule');

    if (action === 'unblock') {
      await db.prepare(
        `UPDATE urc_blocked_accounts
         SET block_status = 'unblocked', unblocked_by = ?, unblocked_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      ).bind(actor?.email || actor?.userId || 'admin', sub).run();

      if (existing.user_id) {
        await db.prepare(`UPDATE urc_users SET account_status = 'active', updated_at = datetime('now') WHERE id = ?`).bind(existing.user_id).run();
      }
      await audit(env, request, actor, 'urc.block.unblock', 'urc_blocked_accounts', sub, { block_code: existing.block_code });
    } else if (action === 'extend') {
      const exp = cleanStr(body.expires_at || '', 40) || null;
      await db.prepare(
        `UPDATE urc_blocked_accounts
         SET block_status = 'active', is_permanent = 0, expires_at = COALESCE(?, datetime('now', '+30 days')), updated_at = datetime('now')
         WHERE id = ?`
      ).bind(exp, sub).run();
      await audit(env, request, actor, 'urc.block.extend', 'urc_blocked_accounts', sub, { block_code: existing.block_code });
    } else {
      const notes = body.reason_notes !== undefined ? cleanStr(body.reason_notes, 500) : existing.reason_notes;
      await db.prepare(`UPDATE urc_blocked_accounts SET reason_notes = ?, updated_at = datetime('now') WHERE id = ?`).bind(notes, sub).run();
    }

    const updated = await db.prepare(`SELECT * FROM urc_blocked_accounts WHERE id = ?`).bind(sub).first();
    return json({ item: decorateBlock(updated) });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleUsersCommunityBatch3Admin(request, env, actor, id, sub, extra) {
  await ensureUsersCommunityBatch3Schema(env.DB);
  if (id === 'comments') return handleComments(request, env, actor, sub, extra);
  if (id === 'moderation') return handleModeration(request, env, actor, sub, extra);
  if (id === 'reports') return handleReports(request, env, actor, sub, extra);
  if (id === 'blocked-accounts') return handleBlockedAccounts(request, env, actor, sub, extra);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown users & community batch 3 route');
}
