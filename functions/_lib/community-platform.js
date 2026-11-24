/**
 * v252: Community, Interest Circles, Public Content Sharing, Peer Q&A,
 *       Direct Messaging & Pro/Permanent Contributor Reward Platform Engine
 *
 * ZERO-STALE-CACHE GUARANTEE:
 *  - Every Admin mutation writes atomically to D1, logs to audit_log, and calls
 *    invalidateAllPublicCaches(request) immediately.
 *  - Every /api/public/community/* and /api/community/* response returns
 *    Cache-Control: no-store, max-age=0 so changes reflect instantaneously.
 */
import { HttpError, json, readJson, validationError, clientIp } from './http.js';
import { audit, rateLimit, getActor, STAFF_ROLES } from './rbac.js';
import { invalidateAllPublicCaches } from './edge-cache-invalidator.js';
import { requireCandidateSession } from './candidate-hub-governance.js';
import { ensureStudyPublishingSchema } from './study-publishing-house.js';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };

const MB = 1024 * 1024;
const ALLOWED_UPLOAD_MIME = {
  'image/jpeg': { ext: 'jpg', max: 5 * MB, kind: 'image' },
  'image/png': { ext: 'png', max: 5 * MB, kind: 'image' },
  'image/webp': { ext: 'webp', max: 5 * MB, kind: 'image' },
  'application/pdf': { ext: 'pdf', max: 10 * MB, kind: 'pdf' }
};

export const POSTING_POLICIES = ['open_verified', 'pre_moderated', 'pro_only', 'admin_only'];
export const COMMUNITY_POST_TYPES = [
  'question',
  'shared_notes',
  'memory_question',
  'answer_key_objection',
  'center_radar',
  'scheme_playbook',
  'daily_checkin',
  'editorial_spotlight',
  'poll',
  'quiz_challenge'
];
export const MEMBERSHIP_TIERS = ['standard', 'pro_member', 'permanent_member'];
const MODERATION_STATUSES = ['published', 'pending_review', 'hidden', 'flagged'];

let _schemaReady = false;

function str(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function intOrZero(v, min = 0, max = 99999999) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function boolInt(v, def = 0) {
  if (v === undefined || v === null || v === '') return def ? 1 : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  return (s === '1' || s === 'true' || s === 'yes' || s === 'on') ? 1 : 0;
}

function slugify(input, fallback = 'community-post') {
  const s = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || fallback;
}

function safeHref(v) {
  const s = str(v, 500);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw || ''));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

function tierBadgeLabel(tier) {
  if (tier === 'permanent_member') return 'Permanent Founding Member 👑';
  if (tier === 'pro_member') return 'CS Odisha Pro Member ⭐';
  return '';
}

function makeThreadKey(u1, u2) {
  const pair = [String(u1 || '').trim(), String(u2 || '').trim()].sort();
  return pair[0] + '::' + pair[1];
}

// ============================================================================
// SCHEMA GUARD
// ============================================================================
export async function ensureCommunityPlatformSchema(db) {
  if (_schemaReady || !db) return;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS community_taxonomy_nodes (
      id TEXT PRIMARY KEY,
      level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
      parent_id TEXT,
      slug TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      accent_variant TEXT NOT NULL DEFAULT 'emerald',
      posting_policy TEXT NOT NULL DEFAULT 'open_verified',
      members_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 100,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS community_memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, node_id)
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      author_user_id TEXT NOT NULL DEFAULT '',
      author_display_name TEXT NOT NULL DEFAULT 'CS Odisha Member',
      author_badge TEXT NOT NULL DEFAULT '',
      author_membership_tier TEXT NOT NULL DEFAULT 'standard',
      is_official_spotlight INTEGER NOT NULL DEFAULT 0,
      category_l1_id TEXT NOT NULL DEFAULT '',
      category_l2_id TEXT NOT NULL DEFAULT '',
      category_l3_id TEXT NOT NULL DEFAULT '',
      post_type TEXT NOT NULL DEFAULT 'question',
      district_tag TEXT NOT NULL DEFAULT '',
      exam_tag TEXT NOT NULL DEFAULT '',
      linked_entity_type TEXT NOT NULL DEFAULT '',
      linked_entity_id TEXT NOT NULL DEFAULT '',
      bounty_xp INTEGER NOT NULL DEFAULT 0,
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      attachment_url TEXT NOT NULL DEFAULT '',
      attachment_label TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      poll_options_json TEXT NOT NULL DEFAULT '[]',
      poll_votes_json TEXT NOT NULL DEFAULT '{}',
      challenge_mcqs_json TEXT NOT NULL DEFAULT '[]',
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      replies_count INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      is_solved INTEGER NOT NULL DEFAULT 0,
      is_featured_collection INTEGER NOT NULL DEFAULT 0,
      moderation_status TEXT NOT NULL DEFAULT 'published',
      moderator_note TEXT NOT NULL DEFAULT '',
      promoted_study_id TEXT NOT NULL DEFAULT '',
      reward_granted_tier TEXT NOT NULL DEFAULT '',
      preview_token TEXT NOT NULL DEFAULT '',
      preview_expires_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS community_post_replies (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_user_id TEXT NOT NULL DEFAULT '',
      author_display_name TEXT NOT NULL DEFAULT 'CS Odisha Member',
      author_badge TEXT NOT NULL DEFAULT '',
      author_membership_tier TEXT NOT NULL DEFAULT 'standard',
      body_text TEXT NOT NULL,
      attachment_url TEXT NOT NULL DEFAULT '',
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      is_verified_answer INTEGER NOT NULL DEFAULT 0,
      is_best_answer INTEGER NOT NULL DEFAULT 0,
      moderation_status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS community_post_reactions (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL,
      score_value REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(target_type, target_id, user_id, reaction_type)
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS community_direct_messages (
      id TEXT PRIMARY KEY,
      thread_key TEXT NOT NULL,
      sender_user_id TEXT NOT NULL,
      sender_name TEXT NOT NULL DEFAULT '',
      recipient_user_id TEXT NOT NULL,
      recipient_name TEXT NOT NULL DEFAULT '',
      context_post_id TEXT NOT NULL DEFAULT '',
      request_type TEXT NOT NULL DEFAULT 'direct_message',
      request_status TEXT NOT NULL DEFAULT 'active',
      message_text TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      is_flagged INTEGER NOT NULL DEFAULT 0,
      flag_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS community_user_preferences (
      user_id TEXT PRIMARY KEY,
      allow_direct_messages INTEGER NOT NULL DEFAULT 1,
      bio_headline TEXT NOT NULL DEFAULT '',
      trust_level INTEGER NOT NULL DEFAULT 1,
      reputation_xp INTEGER NOT NULL DEFAULT 0,
      approved_contributions_count INTEGER NOT NULL DEFAULT 0,
      membership_tier TEXT NOT NULL DEFAULT 'standard',
      pro_granted_reason TEXT NOT NULL DEFAULT '',
      pro_granted_at TEXT NOT NULL DEFAULT '',
      earned_badges_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    await db.prepare(`CREATE TABLE IF NOT EXISTS community_reward_rules (
      id TEXT PRIMARY KEY,
      auto_grant_enabled INTEGER NOT NULL DEFAULT 1,
      pro_threshold_posts INTEGER NOT NULL DEFAULT 3,
      permanent_threshold_posts INTEGER NOT NULL DEFAULT 10,
      xp_per_approved_post INTEGER NOT NULL DEFAULT 40,
      xp_per_best_answer INTEGER NOT NULL DEFAULT 50,
      pro_perks_summary_en TEXT NOT NULL DEFAULT 'Golden Pro Member badge, instant zero-queue publishing, exclusive Pro Lounge access & Candidate Hub Pro tools.',
      pro_perks_summary_or TEXT NOT NULL DEFAULT 'ସୁବର୍ଣ୍ଣ ପ୍ରୋ ମେମ୍ବର ବ୍ୟାଜ୍, ତତକ୍ଷଣାତ୍ ପ୍ରକାଶନ ଓ ପ୍ରାର୍ଥୀ ହବ୍ ପ୍ରୋ ସୁବିଧା।',
      permanent_perks_summary_en TEXT NOT NULL DEFAULT 'Lifetime Permanent Founding Member crown, priority mentorship highlight, zero-queue publishing & permanent Candidate Hub VIP access.',
      permanent_perks_summary_or TEXT NOT NULL DEFAULT 'ଆଜୀବନ ସ୍ଥାୟୀ ପ୍ରତିଷ୍ଠାତା ସଦସ୍ୟ ମୁକୁଟ ଓ ସମ୍ପୂର୍ଣ୍ଣ ପ୍ରାର୍ଥୀ ହବ୍ ସୁବିଧା।',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();

    _schemaReady = true;
  } catch (e) {
    console.error('ensureCommunityPlatformSchema error:', e);
  }
}

async function invalidateCommunityCaches(request, slug = '') {
  const extra = [
    '/community/',
    '/community/index.html',
    '/',
    '/index.html',
    '/student-dashboard/',
    '/student-dashboard/index.html',
    '/api/public/community/tree',
    '/api/public/community/posts',
    '/api/public/community/post',
    '/api/community/posts',
    '/api/community/qna',
    '/api/candidate/hub-config',
    '/api/candidate/assigned-items'
  ];
  if (slug) extra.push(`/api/public/community/post?slug=${encodeURIComponent(slug)}`);
  await invalidateAllPublicCaches(request, extra);
}

// ============================================================================
// REWARD RULES, PREFERENCES & AUTOMATIC MILESTONE PRO / PERMANENT UPGRADE
// ============================================================================
export async function getRewardRules(db) {
  const row = await db.prepare("SELECT * FROM community_reward_rules WHERE id = 'default'").first().catch(() => null);
  return {
    id: 'default',
    auto_grant_enabled: row ? Boolean(row.auto_grant_enabled) : true,
    pro_threshold_posts: Number((row && row.pro_threshold_posts) || 3),
    permanent_threshold_posts: Number((row && row.permanent_threshold_posts) || 10),
    xp_per_approved_post: Number((row && row.xp_per_approved_post) || 40),
    xp_per_best_answer: Number((row && row.xp_per_best_answer) || 50),
    pro_perks_summary_en: (row && row.pro_perks_summary_en) || 'Golden Pro Member badge, instant zero-queue publishing, exclusive Pro Lounge access & Candidate Hub Pro tools.',
    pro_perks_summary_or: (row && row.pro_perks_summary_or) || 'ସୁବର୍ଣ୍ଣ ପ୍ରୋ ମେମ୍ବର ବ୍ୟାଜ୍, ତତକ୍ଷଣାତ୍ ପ୍ରକାଶନ ଓ ପ୍ରାର୍ଥୀ ହବ୍ ପ୍ରୋ ସୁବିଧା।',
    permanent_perks_summary_en: (row && row.permanent_perks_summary_en) || 'Lifetime Permanent Founding Member crown, priority mentorship highlight, zero-queue publishing & permanent Candidate Hub VIP access.',
    permanent_perks_summary_or: (row && row.permanent_perks_summary_or) || 'ଆଜୀବନ ସ୍ଥାୟୀ ପ୍ରତିଷ୍ଠାତା ସଦସ୍ୟ ମୁକୁଟ ଓ ସମ୍ପୂର୍ଣ୍ଣ ପ୍ରାର୍ଥୀ ହବ୍ ସୁବିଧା।',
    updated_at: (row && row.updated_at) || ''
  };
}

export async function getOrCreateUserPrefs(db, userId) {
  if (!userId) return null;
  let row = await db.prepare('SELECT * FROM community_user_preferences WHERE user_id = ?').bind(userId).first().catch(() => null);
  if (!row) {
    await db.prepare(
      `INSERT OR IGNORE INTO community_user_preferences (user_id, allow_direct_messages, trust_level, reputation_xp, approved_contributions_count, membership_tier, earned_badges_json, updated_at)
       VALUES (?, 1, 1, 0, 0, 'standard', '[]', datetime('now'))`
    ).bind(userId).run().catch(() => {});
    row = await db.prepare('SELECT * FROM community_user_preferences WHERE user_id = ?').bind(userId).first().catch(() => null);
  }
  return row ? {
    user_id: row.user_id,
    allow_direct_messages: Boolean(row.allow_direct_messages),
    bio_headline: row.bio_headline || '',
    trust_level: Number(row.trust_level || 1),
    reputation_xp: Number(row.reputation_xp || 0),
    approved_contributions_count: Number(row.approved_contributions_count || 0),
    membership_tier: MEMBERSHIP_TIERS.includes(row.membership_tier) ? row.membership_tier : 'standard',
    pro_granted_reason: row.pro_granted_reason || '',
    pro_granted_at: row.pro_granted_at || '',
    earned_badges: parseJson(row.earned_badges_json, [])
  } : {
    user_id: userId, allow_direct_messages: true, bio_headline: '', trust_level: 1,
    reputation_xp: 0, approved_contributions_count: 0, membership_tier: 'standard',
    pro_granted_reason: '', pro_granted_at: '', earned_badges: []
  };
}

async function grantMembershipTierInternal(env, request, actor, targetUserId, targetTier, reason) {
  const db = env.DB;
  if (!MEMBERSHIP_TIERS.includes(targetTier)) {
    throw validationError({ membership_tier: 'Tier must be standard, pro_member, or permanent_member.' });
  }
  const prefs = await getOrCreateUserPrefs(db, targetUserId);
  const badges = new Set(Array.isArray(prefs.earned_badges) ? prefs.earned_badges : []);
  if (targetTier === 'pro_member') badges.add('CS Odisha Pro Member ⭐');
  if (targetTier === 'permanent_member') {
    badges.add('CS Odisha Pro Member ⭐');
    badges.add('Permanent Founding Member 👑');
  }
  const grantedAt = targetTier === 'standard' ? '' : new Date().toISOString();
  const cleanReason = str(reason || (targetTier === 'permanent_member' ? 'Top community contributor reward' : 'Approved helpful community contributions'), 300);

  await db.prepare(
    `INSERT INTO community_user_preferences (user_id, membership_tier, pro_granted_reason, pro_granted_at, earned_badges_json, trust_level, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       membership_tier = excluded.membership_tier,
       pro_granted_reason = excluded.pro_granted_reason,
       pro_granted_at = excluded.pro_granted_at,
       earned_badges_json = excluded.earned_badges_json,
       trust_level = 1,
       updated_at = datetime('now')`
  ).bind(targetUserId, targetTier, cleanReason, grantedAt, JSON.stringify([...badges])).run();

  // Sync directly into candidate_governance.access_tier
  const userRow = await db.prepare('SELECT email FROM users WHERE id = ?').bind(targetUserId).first().catch(() => null);
  const userEmail = (userRow && userRow.email) || '';
  await db.prepare(
    `INSERT INTO candidate_governance (user_id, email, access_tier, updated_by, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       access_tier = excluded.access_tier,
       updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).bind(targetUserId, userEmail, targetTier, (actor && actor.email) || 'system:rewards').run().catch(() => {});

  // Update existing posts & replies badges for this author so public site reflects instantly
  const newBadge = tierBadgeLabel(targetTier);
  await db.prepare('UPDATE community_posts SET author_membership_tier = ?, author_badge = CASE WHEN is_official_spotlight = 1 THEN author_badge ELSE ? END WHERE author_user_id = ?')
    .bind(targetTier, newBadge, targetUserId).run().catch(() => {});
  await db.prepare('UPDATE community_post_replies SET author_membership_tier = ?, author_badge = ? WHERE author_user_id = ?')
    .bind(targetTier, newBadge, targetUserId).run().catch(() => {});

  // Send congratulatory Assigned For You notification to Candidate Hub when upgrading to Pro or Permanent
  if (targetTier === 'pro_member' || targetTier === 'permanent_member') {
    const isPerm = targetTier === 'permanent_member';
    const titleEn = isPerm ? '👑 Congratulations! You Unlocked Permanent Founding Member Status' : '⭐ Congratulations! You Unlocked CS Odisha Pro Membership';
    const titleOr = isPerm ? '👑 ଅଭିନନ୍ଦନ! ଆପଣ ସ୍ଥାୟୀ ପ୍ରତିଷ୍ଠାତା ସଦସ୍ୟ ପଦବୀ ଲାଭ କଲେ' : '⭐ ଅଭିନନ୍ଦନ! ଆପଣ CS ଓଡ଼ିଶା ପ୍ରୋ ମେମ୍ବରସିପ୍ ଲାଭ କଲେ';
    const summaryEn = cleanReason + ' — Instant publishing, golden badge & Pro Lounge access are now active!';
    const summaryOr = 'ଆପଣଙ୍କର ଉତ୍କୃଷ୍ଟ କମ୍ୟୁନିଟି ଯୋଗଦାନ ପାଇଁ ପ୍ରୋ ବ୍ୟାଜ୍ ଓ ବିଶେଷ ସୁବିଧା ସକ୍ରିୟ କରାଯାଇଛି।';
    await db.prepare(
      `INSERT INTO candidate_assigned_items (id, target_scope, target_user_id, item_type, title_en, title_or, summary_en, summary_or, resource_url, priority, is_published, created_by, created_at)
       VALUES (?, 'user', ?, 'guidance', ?, ?, ?, ?, '/community/', 'high', 1, ?, datetime('now'))`
    ).bind(`cai_rew_${Date.now().toString(36)}_${randomHex(3)}`, targetUserId, titleEn, titleOr, summaryEn, summaryOr, (actor && actor.email) || 'system:rewards').run().catch(() => {});
  }

  await audit(env, request, actor || { userId: 'system', email: 'system:rewards' }, 'community.grant_membership', 'community_user_preferences', targetUserId, {
    membership_tier: targetTier,
    reason: cleanReason
  });

  return getOrCreateUserPrefs(db, targetUserId);
}

async function rewardApprovedContribution(env, request, actor, authorUserId, xpBonus = 0) {
  if (!authorUserId || authorUserId === 'system-editorial') return null;
  const db = env.DB;
  const rules = await getRewardRules(db);
  const prefs = await getOrCreateUserPrefs(db, authorUserId);
  const nextCount = prefs.approved_contributions_count + 1;
  const nextXp = prefs.reputation_xp + rules.xp_per_approved_post + xpBonus;

  await db.prepare(
    `UPDATE community_user_preferences
     SET approved_contributions_count = ?, reputation_xp = ?, trust_level = 1, updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(nextCount, nextXp, authorUserId).run();

  if (rules.auto_grant_enabled) {
    if (nextCount >= rules.permanent_threshold_posts && prefs.membership_tier !== 'permanent_member') {
      return await grantMembershipTierInternal(env, request, actor, authorUserId, 'permanent_member', `Auto-upgraded after ${nextCount} approved helpful community contributions`);
    }
    if (nextCount >= rules.pro_threshold_posts && prefs.membership_tier === 'standard') {
      return await grantMembershipTierInternal(env, request, actor, authorUserId, 'pro_member', `Auto-upgraded after ${nextCount} approved helpful community contributions`);
    }
  }
  return getOrCreateUserPrefs(db, authorUserId);
}

// ============================================================================
// TAXONOMY & POST FORMATTERS
// ============================================================================
function formatTaxNode(row) {
  if (!row) return null;
  return {
    id: row.id,
    level: Number(row.level || 1),
    parent_id: row.parent_id || null,
    slug: row.slug,
    title_en: row.title_en,
    title_or: row.title_or || '',
    subtitle_en: row.subtitle_en || '',
    subtitle_or: row.subtitle_or || '',
    icon: row.icon || '',
    accent_variant: row.accent_variant || 'emerald',
    posting_policy: POSTING_POLICIES.includes(row.posting_policy) ? row.posting_policy : 'open_verified',
    members_count: Number(row.members_count || 0),
    sort_order: Number(row.sort_order || 100),
    is_published: Boolean(row.is_published),
    updated_at: row.updated_at || ''
  };
}

async function loadTaxonomyMap(db) {
  const { results } = await db.prepare('SELECT * FROM community_taxonomy_nodes ORDER BY level ASC, sort_order ASC, title_en ASC').all().catch(() => ({ results: [] }));
  const map = new Map();
  const list = (results || []).map(r => {
    const f = formatTaxNode(r);
    map.set(f.id, f);
    return f;
  });
  return { list, map };
}

function buildTaxonomyTree(nodes) {
  const byId = new Map();
  nodes.forEach(n => byId.set(n.id, { ...n, children: [] }));
  const roots = [];
  for (const node of byId.values()) {
    if (node.level === 1 || !node.parent_id || !byId.has(node.parent_id)) {
      if (node.level === 1) roots.push(node);
    } else {
      byId.get(node.parent_id).children.push(node);
    }
  }
  const sortFn = (a, b) => (a.sort_order - b.sort_order) || a.title_en.localeCompare(b.title_en);
  roots.sort(sortFn);
  roots.forEach(l1 => {
    l1.children.sort(sortFn);
    l1.children.forEach(l2 => l2.children.sort(sortFn));
  });
  return roots;
}

function sanitizePollOptions(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.map(x => str(typeof x === 'string' ? x : (x && x.label), 160)).filter(Boolean).slice(0, 8);
}

function sanitizeChallengeMcqs(input) {
  const arr = Array.isArray(input) ? input : parseJson(input, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 15).map((q, idx) => {
    const rawOpts = Array.isArray(q && q.options) ? q.options : [q && q.opt_a, q && q.opt_b, q && q.opt_c, q && q.opt_d];
    const options = rawOpts.slice(0, 4).map(o => str(o, 220));
    while (options.length < 4) options.push('');
    return {
      id: str(q && q.id, 40) || `cq${idx + 1}`,
      question_en: str(q && (q.question_en || q.question), 400),
      question_or: str(q && q.question_or, 400),
      options,
      correct_index: Math.max(0, Math.min(3, intOrZero(q && q.correct_index, 0, 3))),
      explanation_en: str(q && (q.explanation_en || q.explanation), 500)
    };
  }).filter(q => q.question_en && q.options.filter(Boolean).length >= 2);
}

function formatCommunityPost(row, taxMap = new Map(), includeAdminFields = false) {
  if (!row) return null;
  const l1 = taxMap.get(row.category_l1_id) || null;
  const l2 = taxMap.get(row.category_l2_id) || null;
  const l3 = taxMap.get(row.category_l3_id) || null;
  const pollOpts = parseJson(row.poll_options_json, []);
  const pollVotes = parseJson(row.poll_votes_json, {});
  const challengeMcqs = parseJson(row.challenge_mcqs_json, []);
  const out = {
    id: row.id,
    slug: row.slug,
    author_user_id: row.author_user_id || '',
    author_display_name: row.author_display_name || 'CS Odisha Member',
    author_badge: row.author_badge || tierBadgeLabel(row.author_membership_tier),
    author_membership_tier: row.author_membership_tier || 'standard',
    is_official_spotlight: Boolean(row.is_official_spotlight),
    category_l1_id: row.category_l1_id || '',
    category_l2_id: row.category_l2_id || '',
    category_l3_id: row.category_l3_id || '',
    taxonomy: {
      l1: l1 ? { id: l1.id, slug: l1.slug, title_en: l1.title_en, title_or: l1.title_or, icon: l1.icon } : null,
      l2: l2 ? { id: l2.id, slug: l2.slug, title_en: l2.title_en, title_or: l2.title_or, icon: l2.icon } : null,
      l3: l3 ? { id: l3.id, slug: l3.slug, title_en: l3.title_en, title_or: l3.title_or, icon: l3.icon } : null
    },
    post_type: row.post_type || 'question',
    district_tag: row.district_tag || '',
    exam_tag: row.exam_tag || '',
    linked_entity_type: row.linked_entity_type || '',
    linked_entity_id: row.linked_entity_id || '',
    bounty_xp: Number(row.bounty_xp || 0),
    title_en: row.title_en || '',
    title_or: row.title_or || '',
    body_en: row.body_en || '',
    body_or: row.body_or || '',
    attachment_url: row.attachment_url || '',
    attachment_label: row.attachment_label || '',
    cover_image_url: row.cover_image_url || '',
    poll_options: Array.isArray(pollOpts) ? pollOpts : [],
    poll_votes: pollVotes && typeof pollVotes === 'object' ? pollVotes : {},
    challenge_mcqs: Array.isArray(challengeMcqs) ? challengeMcqs : [],
    upvotes_count: Number(row.upvotes_count || 0),
    replies_count: Number(row.replies_count || 0),
    views_count: Number(row.views_count || 0),
    is_pinned: Boolean(row.is_pinned),
    is_locked: Boolean(row.is_locked),
    is_solved: Boolean(row.is_solved),
    is_featured_collection: Boolean(row.is_featured_collection),
    moderation_status: row.moderation_status || 'published',
    moderator_note: row.moderator_note || '',
    promoted_study_id: row.promoted_study_id || '',
    reward_granted_tier: row.reward_granted_tier || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    public_url: `/community/?slug=${encodeURIComponent(row.slug)}`
  };
  if (includeAdminFields) {
    out.preview_token = row.preview_token || '';
    out.preview_expires_at = row.preview_expires_at || '';
  }
  return out;
}

// ============================================================================
// R2 DIRECT UPLOAD HELPER (SHARED BY ADMIN & AUTHENTICATED MEMBERS)
// ============================================================================
function sniffMime(b) {
  const eq = (off, sig) => sig.every((x, i) => b[off + i] === x);
  if (b.length >= 3 && eq(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (b.length >= 8 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (b.length >= 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  if (b.length >= 5 && eq(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

async function storeCommunityMediaFile(env, file, purpose, uploadedBy) {
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'R2 MEDIA storage is not configured');
  if (!file || typeof file === 'string' || file.size <= 0) throw validationError({ file: 'Select a valid image or PDF file.' });
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const sniffed = sniffMime(bytes.slice(0, 16));
  const declared = (file.type || sniffed || '').toLowerCase();
  const spec = ALLOWED_UPLOAD_MIME[sniffed || declared];
  if (!spec || !sniffed) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP images and PDF files up to 10 MB are allowed.');
  }
  if (file.size > spec.max) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `File exceeds ${Math.round(spec.max / MB)} MB limit.`);
  }
  const baseName = slugify((file.name || purpose).replace(/\.[^.]+$/, ''), purpose).slice(0, 48);
  const key = `community-publishing/${Date.now()}-${baseName}-${randomHex(3)}.${spec.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: sniffed } });
  const publicUrl = `/api/media/${key}`;
  try {
    await env.DB.prepare(
      `INSERT INTO media_files (id, original_filename, title_en, file_category, mime_type, file_size_bytes, r2_key, public_url, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind('mf_' + randomHex(6), str(file.name || key, 140), str(file.name || purpose, 140), spec.kind, sniffed, file.size, key, publicUrl, str(uploadedBy, 120)).run();
  } catch { /* best effort */ }
  return { key, url: publicUrl, kind: spec.kind, mime_type: sniffed, size_bytes: file.size, filename: str(file.name || key, 160) };
}

export async function handleCommunityMediaUpload(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use multipart/form-data');
  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Invalid multipart payload'); }
  const file = form.get('file');
  const purpose = str(form.get('purpose') || 'community-asset', 40).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'community-asset';
  const stored = await storeCommunityMediaFile(env, file, purpose, actor.email || actor.userId);
  await audit(env, request, actor, 'community_media.upload', 'media', stored.key, { purpose, kind: stored.kind, size: stored.size_bytes });
  return json({ ok: true, ...stored }, 201, NO_STORE_HEADERS);
}

// ============================================================================
// ADMIN: 3-LAYER COMMUNITIES OF INTEREST TAXONOMY (/api/admin/community/taxonomy)
// ============================================================================
export async function handleCommunityTaxonomyAdmin(request, env, actor, nodeId, action) {
  const db = env.DB;
  await ensureCommunityPlatformSchema(db);
  const method = request.method;

  if (!nodeId && method === 'GET') {
    const { list } = await loadTaxonomyMap(db);
    const { results: postCounts } = await db.prepare(
      `SELECT category_l1_id, category_l2_id, category_l3_id, COUNT(*) AS n
       FROM community_posts WHERE moderation_status = 'published'
       GROUP BY category_l1_id, category_l2_id, category_l3_id`
    ).all().catch(() => ({ results: [] }));
    const pMap = new Map();
    const bump = (id, n) => { if (id) pMap.set(id, (pMap.get(id) || 0) + Number(n || 0)); };
    (postCounts || []).forEach(r => { bump(r.category_l1_id, r.n); bump(r.category_l2_id, r.n); bump(r.category_l3_id, r.n); });
    const enriched = list.map(n => ({ ...n, posts_count: pMap.get(n.id) || 0 }));
    return json({ ok: true, nodes: enriched, tree: buildTaxonomyTree(enriched) }, 200, NO_STORE_HEADERS);
  }

  if (!nodeId && method === 'POST') {
    const body = await readJson(request, 20000);
    const level = Number(body.level);
    if (![1, 2, 3].includes(level)) throw validationError({ level: 'Level must be 1, 2, or 3.' });
    const titleEn = str(body.title_en, 140);
    if (!titleEn) throw validationError({ title_en: 'English title is required.' });
    const parentId = level === 1 ? null : str(body.parent_id, 80) || null;
    if (level > 1 && !parentId) throw validationError({ parent_id: 'Parent community is required for Level 2 and Level 3.' });
    if (parentId) {
      const parent = await db.prepare('SELECT id, level FROM community_taxonomy_nodes WHERE id = ?').bind(parentId).first();
      if (!parent || Number(parent.level) !== level - 1) {
        throw validationError({ parent_id: `Parent must be an existing Level ${level - 1} node.` });
      }
    }
    const slug = slugify(body.slug || titleEn, `comm-l${level}`);
    const policy = POSTING_POLICIES.includes(body.posting_policy) ? body.posting_policy : 'open_verified';
    const maxRow = await db.prepare(
      "SELECT COALESCE(MAX(sort_order), 0) AS m FROM community_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ?"
    ).bind(level, parentId || '').first().catch(() => ({ m: 0 }));
    const sortOrder = body.sort_order !== undefined && body.sort_order !== '' ? intOrZero(body.sort_order, 0, 100000) : Number((maxRow && maxRow.m) || 0) + 10;
    const id = `ctax_l${level}_${Date.now().toString(36)}_${randomHex(3)}`;

    await db.prepare(
      `INSERT INTO community_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, posting_policy, members_count, sort_order, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, datetime('now'))`
    ).bind(
      id, level, parentId, slug, titleEn, str(body.title_or, 160),
      str(body.subtitle_en, 240), str(body.subtitle_or, 240),
      str(body.icon, 24), str(body.accent_variant || 'emerald', 32),
      policy, sortOrder, boolInt(body.is_published, 1)
    ).run();

    const created = formatTaxNode(await db.prepare('SELECT * FROM community_taxonomy_nodes WHERE id = ?').bind(id).first());
    await audit(env, request, actor, 'community_taxonomy.create', 'community_taxonomy_nodes', id, { level, title_en: titleEn, posting_policy: policy });
    await invalidateCommunityCaches(request);
    const res = json({ ok: true, node: created }, 201, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && action === 'move' && method === 'POST') {
    const body = await readJson(request, 5000);
    const dir = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
    if (!dir) throw validationError({ direction: 'direction must be up or down.' });
    const node = await db.prepare('SELECT * FROM community_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!node) throw new HttpError(404, 'NOT_FOUND', 'Community taxonomy node not found');
    const { results: siblings } = await db.prepare(
      "SELECT id FROM community_taxonomy_nodes WHERE level = ? AND COALESCE(parent_id, '') = ? ORDER BY sort_order ASC, title_en ASC"
    ).bind(node.level, node.parent_id || '').all();
    const ids = (siblings || []).map(s => s.id);
    const idx = ids.indexOf(nodeId);
    const swapIdx = idx + dir;
    if (idx >= 0 && swapIdx >= 0 && swapIdx < ids.length) {
      [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
      await db.batch(ids.map((rid, n) =>
        db.prepare("UPDATE community_taxonomy_nodes SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind((n + 1) * 10, rid)
      ));
    }
    await audit(env, request, actor, 'community_taxonomy.reorder', 'community_taxonomy_nodes', nodeId, { direction: body.direction });
    await invalidateCommunityCaches(request);
    const res = json({ ok: true, id: nodeId }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM community_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community taxonomy node not found');
    const body = await readJson(request, 20000);
    const fields = [];
    const vals = [];
    const set = (c, v) => { fields.push(`${c} = ?`); vals.push(v); };
    if (body.title_en !== undefined) {
      const t = str(body.title_en, 140);
      if (!t) throw validationError({ title_en: 'English title is required.' });
      set('title_en', t);
    }
    if (body.slug !== undefined) set('slug', slugify(body.slug || existing.title_en, existing.slug));
    if (body.title_or !== undefined) set('title_or', str(body.title_or, 160));
    if (body.subtitle_en !== undefined) set('subtitle_en', str(body.subtitle_en, 240));
    if (body.subtitle_or !== undefined) set('subtitle_or', str(body.subtitle_or, 240));
    if (body.icon !== undefined) set('icon', str(body.icon, 24));
    if (body.accent_variant !== undefined) set('accent_variant', str(body.accent_variant || 'emerald', 32));
    if (body.posting_policy !== undefined && POSTING_POLICIES.includes(body.posting_policy)) set('posting_policy', body.posting_policy);
    if (body.sort_order !== undefined) set('sort_order', intOrZero(body.sort_order, 0, 100000));
    if (body.is_published !== undefined) set('is_published', boolInt(body.is_published, 1));
    if (fields.length) {
      await db.prepare(`UPDATE community_taxonomy_nodes SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, nodeId).run();
    }
    const updated = formatTaxNode(await db.prepare('SELECT * FROM community_taxonomy_nodes WHERE id = ?').bind(nodeId).first());
    await audit(env, request, actor, 'community_taxonomy.update', 'community_taxonomy_nodes', nodeId, { title_en: updated.title_en });
    await invalidateCommunityCaches(request);
    const res = json({ ok: true, node: updated }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (nodeId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT * FROM community_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community taxonomy node not found');
    const childRow = await db.prepare('SELECT COUNT(*) AS n FROM community_taxonomy_nodes WHERE parent_id = ?').bind(nodeId).first().catch(() => ({ n: 0 }));
    if (Number((childRow && childRow.n) || 0) > 0) {
      throw new HttpError(409, 'HAS_CHILDREN', 'Remove child community groups/sub-topics first.');
    }
    await db.prepare('DELETE FROM community_memberships WHERE node_id = ?').bind(nodeId).run().catch(() => {});
    await db.prepare('DELETE FROM community_taxonomy_nodes WHERE id = ?').bind(nodeId).run();
    await audit(env, request, actor, 'community_taxonomy.delete', 'community_taxonomy_nodes', nodeId, { title_en: existing.title_en });
    await invalidateCommunityCaches(request);
    const res = json({ ok: true, deleted: nodeId }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown community taxonomy route');
}

// ============================================================================
// ADMIN: POSTS, SPOTLIGHTS, MODERATION, PREVIEW TOKEN & PROMOTE TO STUDY LIBRARY
// ============================================================================
export async function handleCommunityPostsAdmin(request, env, actor, postId, action) {
  const db = env.DB;
  await ensureCommunityPlatformSchema(db);
  const method = request.method;
  const url = new URL(request.url);

  // POST /api/admin/community/:id/preview-token
  if (postId && action === 'preview-token' && method === 'POST') {
    const row = await db.prepare('SELECT id, slug FROM community_posts WHERE id = ?').bind(postId).first();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Community post not found');
    const token = randomHex(20);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await db.prepare("UPDATE community_posts SET preview_token = ?, preview_expires_at = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(token, expiresAt, postId).run();
    await audit(env, request, actor, 'community_post.preview_token', 'community_posts', postId, { slug: row.slug });
    return json({
      ok: true,
      id: postId,
      slug: row.slug,
      preview_token: token,
      preview_expires_at: expiresAt,
      preview_url: `/community/?slug=${encodeURIComponent(row.slug)}&preview_token=${encodeURIComponent(token)}`
    }, 200, NO_STORE_HEADERS);
  }

  // POST /api/admin/community/:id/promote-study — Promote Memory Question / Shared Notes into Study Library Draft
  if (postId && action === 'promote-study' && method === 'POST') {
    const post = await db.prepare('SELECT * FROM community_posts WHERE id = ?').bind(postId).first();
    if (!post) throw new HttpError(404, 'NOT_FOUND', 'Community post not found');
    await ensureStudyPublishingSchema(db);
    const studyId = `sart_comm_${Date.now().toString(36)}_${randomHex(3)}`;
    const studySlug = slugify(post.title_en, 'study-from-community') + '-' + randomHex(2);
    const resBadge = post.post_type === 'memory_question' ? 'PYQ Paper' : 'Study Notes';
    const attribution = `\n\n> **Community Contributor Credit:** Originally shared by **${post.author_display_name}** in CS Odisha Community.`;
    await db.prepare(
      `INSERT INTO study_articles (
        id, slug, resource_type_badge, difficulty_level, high_yield_priority, estimated_read_mins,
        title_en, title_or, summary_en, exam_board_tag, cover_image_url,
        article_body_en, article_body_or, notes_pdf_url, is_published, updated_at
      ) VALUES (?, ?, ?, 'Moderate', 'High', 10, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`
    ).bind(
      studyId, studySlug, resBadge,
      post.title_en, post.title_or || '',
      str(post.body_en, 280), post.exam_tag || 'Odisha Exam',
      post.cover_image_url || '',
      (post.body_en || '') + attribution, post.body_or || '',
      post.attachment_url || ''
    ).run();

    await db.prepare("UPDATE community_posts SET promoted_study_id = ?, is_featured_collection = 1, updated_at = datetime('now') WHERE id = ?")
      .bind(studyId, postId).run();
    await audit(env, request, actor, 'community_post.promote_study', 'community_posts', postId, { promoted_study_id: studyId });
    await invalidateCommunityCaches(request, post.slug);
    const res = json({ ok: true, post_id: postId, promoted_study_id: studyId, study_slug: studySlug }, 201, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // GET /api/admin/community/posts — Feed + KPIs
  if (!postId && method === 'GET') {
    const l1 = str(url.searchParams.get('l1'), 80);
    const l2 = str(url.searchParams.get('l2'), 80);
    const l3 = str(url.searchParams.get('l3'), 80);
    const type = str(url.searchParams.get('type'), 40).toLowerCase();
    const status = str(url.searchParams.get('status'), 30).toLowerCase();
    const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();

    const [{ list: taxList, map: taxMap }, { results: rows }, memRow, proRow] = await Promise.all([
      loadTaxonomyMap(db),
      db.prepare('SELECT * FROM community_posts ORDER BY is_pinned DESC, created_at DESC LIMIT 300').all().catch(() => ({ results: [] })),
      db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM community_memberships').first().catch(() => ({ n: 0 })),
      db.prepare("SELECT COUNT(*) AS n FROM community_user_preferences WHERE membership_tier IN ('pro_member', 'permanent_member')").first().catch(() => ({ n: 0 }))
    ]);

    const all = (rows || []).map(r => formatCommunityPost(r, taxMap, true));
    const questions = all.filter(p => p.post_type === 'question');
    const answeredQs = questions.filter(p => p.is_solved || p.replies_count > 0);
    const answerRatePct = questions.length ? Math.round((answeredQs.length / questions.length) * 100) : 100;

    const kpis = {
      total_communities: taxList.length,
      active_members: Number((memRow && memRow.n) || 0) + taxList.filter(n => n.level === 1).reduce((s, n) => s + n.members_count, 0),
      answer_rate_pct: answerRatePct,
      pro_permanent_granted: Number((proRow && proRow.n) || 0),
      pending_moderation: all.filter(p => p.moderation_status === 'pending_review' || p.moderation_status === 'flagged').length,
      memory_ready_promote: all.filter(p => (p.post_type === 'memory_question' || p.post_type === 'shared_notes') && !p.promoted_study_id).length,
      total_posts: all.length
    };

    const filtered = all.filter(p => {
      if (l1 && p.category_l1_id !== l1) return false;
      if (l2 && p.category_l2_id !== l2) return false;
      if (l3 && p.category_l3_id !== l3) return false;
      if (type && p.post_type !== type) return false;
      if (status && p.moderation_status !== status) return false;
      if (search) {
        const hay = `${p.title_en} ${p.title_or} ${p.body_en} ${p.author_display_name} ${p.district_tag} ${p.exam_tag}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return json({ ok: true, kpis, items: filtered, total: filtered.length }, 200, NO_STORE_HEADERS);
  }

  // POST /api/admin/community/posts — Publish Official Spotlight / Poll / Daily Quiz Challenge
  if (!postId && method === 'POST') {
    const body = await readJson(request, 200000);
    const titleEn = str(body.title_en, 240);
    if (!titleEn) throw validationError({ title_en: 'English title is required.' });
    const postType = COMMUNITY_POST_TYPES.includes(body.post_type) ? body.post_type : 'editorial_spotlight';
    const modStatus = MODERATION_STATUSES.includes(body.moderation_status) ? body.moderation_status : 'published';
    let slug = slugify(body.slug || titleEn, 'comm-' + Date.now().toString(36));
    const conflict = await db.prepare('SELECT id FROM community_posts WHERE slug = ?').bind(slug).first().catch(() => null);
    if (conflict) slug = `${slug}-${randomHex(2)}`;

    const id = `cpost_${Date.now().toString(36)}_${randomHex(4)}`;
    const pollOpts = sanitizePollOptions(body.poll_options);
    const challengeMcqs = sanitizeChallengeMcqs(body.challenge_mcqs);
    const badge = postType === 'poll' ? 'Live Poll' : (postType === 'quiz_challenge' ? 'Daily Quiz Challenge' : 'Official Spotlight');

    await db.prepare(
      `INSERT INTO community_posts (
        id, slug, author_user_id, author_display_name, author_badge, author_membership_tier,
        is_official_spotlight, category_l1_id, category_l2_id, category_l3_id, post_type,
        district_tag, exam_tag, linked_entity_type, linked_entity_id, bounty_xp,
        title_en, title_or, body_en, body_or, attachment_url, attachment_label, cover_image_url,
        poll_options_json, poll_votes_json, challenge_mcqs_json,
        is_pinned, is_locked, is_featured_collection, moderation_status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, 'permanent_member', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )`
    ).bind(
      id, slug, actor.userId || 'admin', str(body.author_display_name || 'CS Odisha Editorial Desk', 100), badge,
      str(body.category_l1_id, 80), str(body.category_l2_id, 80), str(body.category_l3_id, 80), postType,
      str(body.district_tag, 80), str(body.exam_tag, 80), str(body.linked_entity_type, 40), str(body.linked_entity_id, 80),
      intOrZero(body.bounty_xp, 0, 500),
      titleEn, str(body.title_or, 260), str(body.body_en, 40000), str(body.body_or, 40000),
      safeHref(body.attachment_url), str(body.attachment_label, 140), safeHref(body.cover_image_url),
      JSON.stringify(pollOpts), JSON.stringify(challengeMcqs),
      boolInt(body.is_pinned, 0), boolInt(body.is_locked, 0), boolInt(body.is_featured_collection, 0), modStatus
    ).run();

    const row = await db.prepare('SELECT * FROM community_posts WHERE id = ?').bind(id).first();
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, 'community_post.create', 'community_posts', id, { slug, post_type: postType, moderation_status: modStatus });
    await invalidateCommunityCaches(request, slug);
    const res = json({ ok: true, item: formatCommunityPost(row, taxMap, true) }, 201, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // PUT / PATCH /api/admin/community/posts/:id
  if (postId && !action && (method === 'PUT' || method === 'PATCH')) {
    const existing = await db.prepare('SELECT * FROM community_posts WHERE id = ?').bind(postId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community post not found');
    const body = await readJson(request, 200000);
    const fields = [];
    const vals = [];
    const set = (c, v) => { fields.push(`${c} = ?`); vals.push(v); };

    if (body.title_en !== undefined) set('title_en', str(body.title_en, 240) || existing.title_en);
    if (body.title_or !== undefined) set('title_or', str(body.title_or, 260));
    if (body.body_en !== undefined) set('body_en', str(body.body_en, 40000));
    if (body.body_or !== undefined) set('body_or', str(body.body_or, 40000));
    if (body.category_l1_id !== undefined) set('category_l1_id', str(body.category_l1_id, 80));
    if (body.category_l2_id !== undefined) set('category_l2_id', str(body.category_l2_id, 80));
    if (body.category_l3_id !== undefined) set('category_l3_id', str(body.category_l3_id, 80));
    if (body.post_type !== undefined && COMMUNITY_POST_TYPES.includes(body.post_type)) set('post_type', body.post_type);
    if (body.district_tag !== undefined) set('district_tag', str(body.district_tag, 80));
    if (body.exam_tag !== undefined) set('exam_tag', str(body.exam_tag, 80));
    if (body.cover_image_url !== undefined) set('cover_image_url', safeHref(body.cover_image_url));
    if (body.attachment_url !== undefined) set('attachment_url', safeHref(body.attachment_url));
    if (body.attachment_label !== undefined) set('attachment_label', str(body.attachment_label, 140));
    if (body.poll_options !== undefined) set('poll_options_json', JSON.stringify(sanitizePollOptions(body.poll_options)));
    if (body.challenge_mcqs !== undefined) set('challenge_mcqs_json', JSON.stringify(sanitizeChallengeMcqs(body.challenge_mcqs)));
    if (body.is_pinned !== undefined) set('is_pinned', boolInt(body.is_pinned, 0));
    if (body.is_locked !== undefined) set('is_locked', boolInt(body.is_locked, 0));
    if (body.is_solved !== undefined) set('is_solved', boolInt(body.is_solved, 0));
    if (body.is_featured_collection !== undefined) set('is_featured_collection', boolInt(body.is_featured_collection, 0));
    if (body.moderator_note !== undefined) set('moderator_note', str(body.moderator_note, 400));
    const nextModStatus = body.moderation_status !== undefined && MODERATION_STATUSES.includes(body.moderation_status) ? body.moderation_status : existing.moderation_status;
    if (body.moderation_status !== undefined && MODERATION_STATUSES.includes(body.moderation_status)) set('moderation_status', nextModStatus);

    if (fields.length) {
      await db.prepare(`UPDATE community_posts SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals, postId).run();
    }

    // If transitioning from pending_review -> published for a community member, credit XP & check milestone upgrade!
    if (existing.moderation_status !== 'published' && nextModStatus === 'published' && existing.author_user_id && !existing.is_official_spotlight) {
      await rewardApprovedContribution(env, request, actor, existing.author_user_id);
    }

    const updated = await db.prepare('SELECT * FROM community_posts WHERE id = ?').bind(postId).first();
    const { map: taxMap } = await loadTaxonomyMap(db);
    await audit(env, request, actor, 'community_post.update', 'community_posts', postId, { moderation_status: updated.moderation_status, is_pinned: updated.is_pinned });
    await invalidateCommunityCaches(request, updated.slug);
    const res = json({ ok: true, item: formatCommunityPost(updated, taxMap, true) }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  // DELETE /api/admin/community/posts/:id
  if (postId && !action && method === 'DELETE') {
    const existing = await db.prepare('SELECT id, slug, title_en FROM community_posts WHERE id = ?').bind(postId).first();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Community post not found');
    await db.prepare('DELETE FROM community_post_replies WHERE post_id = ?').bind(postId).run().catch(() => {});
    await db.prepare("DELETE FROM community_post_reactions WHERE target_type = 'post' AND target_id = ?").bind(postId).run().catch(() => {});
    await db.prepare('DELETE FROM community_posts WHERE id = ?').bind(postId).run();
    await audit(env, request, actor, 'community_post.delete', 'community_posts', postId, { slug: existing.slug, title_en: existing.title_en });
    await invalidateCommunityCaches(request, existing.slug);
    const res = json({ ok: true, deleted: postId }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown community posts admin route');
}

// ============================================================================
// ADMIN: REWARD RULES & PRO / PERMANENT MEMBERSHIP MANAGER
// ============================================================================
export async function handleCommunityRewardRulesAdmin(request, env, actor) {
  const db = env.DB;
  await ensureCommunityPlatformSchema(db);
  if (request.method === 'GET') {
    return json({ ok: true, rules: await getRewardRules(db) }, 200, NO_STORE_HEADERS);
  }
  if (request.method === 'PUT' || request.method === 'POST') {
    const body = await readJson(request, 20000);
    const autoGrant = boolInt(body.auto_grant_enabled, 1);
    const proThr = Math.max(1, intOrZero(body.pro_threshold_posts, 1, 100));
    const permThr = Math.max(proThr + 1, intOrZero(body.permanent_threshold_posts, 2, 500));
    const xpPost = intOrZero(body.xp_per_approved_post, 5, 500);
    const xpBest = intOrZero(body.xp_per_best_answer, 5, 500);
    const proEn = str(body.pro_perks_summary_en, 400);
    const proOr = str(body.pro_perks_summary_or, 400);
    const permEn = str(body.permanent_perks_summary_en, 400);
    const permOr = str(body.permanent_perks_summary_or, 400);

    await db.prepare(
      `INSERT INTO community_reward_rules (id, auto_grant_enabled, pro_threshold_posts, permanent_threshold_posts, xp_per_approved_post, xp_per_best_answer, pro_perks_summary_en, pro_perks_summary_or, permanent_perks_summary_en, permanent_perks_summary_or, updated_at)
       VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         auto_grant_enabled = excluded.auto_grant_enabled,
         pro_threshold_posts = excluded.pro_threshold_posts,
         permanent_threshold_posts = excluded.permanent_threshold_posts,
         xp_per_approved_post = excluded.xp_per_approved_post,
         xp_per_best_answer = excluded.xp_per_best_answer,
         pro_perks_summary_en = COALESCE(NULLIF(excluded.pro_perks_summary_en, ''), community_reward_rules.pro_perks_summary_en),
         pro_perks_summary_or = COALESCE(NULLIF(excluded.pro_perks_summary_or, ''), community_reward_rules.pro_perks_summary_or),
         permanent_perks_summary_en = COALESCE(NULLIF(excluded.permanent_perks_summary_en, ''), community_reward_rules.permanent_perks_summary_en),
         permanent_perks_summary_or = COALESCE(NULLIF(excluded.permanent_perks_summary_or, ''), community_reward_rules.permanent_perks_summary_or),
         updated_at = datetime('now')`
    ).bind(autoGrant, proThr, permThr, xpPost, xpBest, proEn, proOr, permEn, permOr).run();

    await audit(env, request, actor, 'community_rewards.update_rules', 'community_reward_rules', 'default', { pro_threshold_posts: proThr, permanent_threshold_posts: permThr });
    await invalidateCommunityCaches(request);
    const res = json({ ok: true, rules: await getRewardRules(db) }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleCommunityGrantMembershipAdmin(request, env, actor) {
  const db = env.DB;
  await ensureCommunityPlatformSchema(db);
  if (request.method === 'GET') {
    const { results } = await db.prepare(
      `SELECT p.*, u.email, c.full_name, c.district
       FROM community_user_preferences p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN candidates c ON c.id = p.user_id OR c.email = u.email
       ORDER BY CASE p.membership_tier WHEN 'permanent_member' THEN 0 WHEN 'pro_member' THEN 1 ELSE 2 END, p.reputation_xp DESC
       LIMIT 150`
    ).all().catch(() => ({ results: [] }));
    const items = (results || []).map(r => ({
      user_id: r.user_id,
      email: r.email || '',
      full_name: r.full_name || r.email || r.user_id,
      district: r.district || '',
      membership_tier: r.membership_tier || 'standard',
      reputation_xp: Number(r.reputation_xp || 0),
      approved_contributions_count: Number(r.approved_contributions_count || 0),
      pro_granted_reason: r.pro_granted_reason || '',
      pro_granted_at: r.pro_granted_at || '',
      earned_badges: parseJson(r.earned_badges_json, [])
    }));
    return json({ ok: true, items }, 200, NO_STORE_HEADERS);
  }

  if (request.method === 'POST') {
    const body = await readJson(request, 10000);
    const userId = str(body.user_id, 120);
    const tier = str(body.membership_tier, 32);
    const postId = str(body.post_id, 80);
    if (!userId) throw validationError({ user_id: 'user_id is required.' });
    const updated = await grantMembershipTierInternal(env, request, actor, userId, tier, body.reason);
    if (postId) {
      await db.prepare("UPDATE community_posts SET reward_granted_tier = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(tier, postId).run().catch(() => {});
    }
    await invalidateCommunityCaches(request);
    const res = json({ ok: true, preferences: updated }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ============================================================================
// ADMIN: Q&A, ANSWER KEY, MEMORY QUESTIONS & DM SAFETY QUEUE
// ============================================================================
export async function handleCommunityModerationAdmin(request, env, actor, targetType, targetId) {
  const db = env.DB;
  await ensureCommunityPlatformSchema(db);
  if (!targetType && request.method === 'GET') {
    const [qaRes, objRes, memRes, flagRepliesRes, flagDmRes] = await Promise.all([
      db.prepare("SELECT * FROM community_posts WHERE post_type = 'question' AND is_solved = 0 ORDER BY bounty_xp DESC, created_at DESC LIMIT 40").all().catch(() => ({ results: [] })),
      db.prepare("SELECT * FROM community_posts WHERE post_type = 'answer_key_objection' ORDER BY created_at DESC LIMIT 40").all().catch(() => ({ results: [] })),
      db.prepare("SELECT * FROM community_posts WHERE post_type IN ('memory_question', 'shared_notes') AND promoted_study_id = '' ORDER BY upvotes_count DESC, created_at DESC LIMIT 40").all().catch(() => ({ results: [] })),
      db.prepare("SELECT r.*, p.title_en AS post_title, p.slug AS post_slug FROM community_post_replies r LEFT JOIN community_posts p ON p.id = r.post_id ORDER BY r.is_verified_answer ASC, r.created_at DESC LIMIT 50").all().catch(() => ({ results: [] })),
      db.prepare('SELECT * FROM community_direct_messages WHERE is_flagged = 1 ORDER BY created_at DESC LIMIT 50').all().catch(() => ({ results: [] }))
    ]);
    return json({
      ok: true,
      open_questions: qaRes.results || [],
      answer_key_watch: objRes.results || [],
      memory_promote_queue: memRes.results || [],
      recent_replies: flagRepliesRes.results || [],
      flagged_messages: flagDmRes.results || []
    }, 200, NO_STORE_HEADERS);
  }

  if (targetType === 'reply' && targetId && (request.method === 'PUT' || request.method === 'PATCH')) {
    const reply = await db.prepare('SELECT * FROM community_post_replies WHERE id = ?').bind(targetId).first();
    if (!reply) throw new HttpError(404, 'NOT_FOUND', 'Reply not found');
    const body = await readJson(request, 10000);
    const isVerified = body.is_verified_answer !== undefined ? boolInt(body.is_verified_answer, 0) : Number(reply.is_verified_answer || 0);
    const isBest = body.is_best_answer !== undefined ? boolInt(body.is_best_answer, 0) : Number(reply.is_best_answer || 0);
    const modStat = body.moderation_status && MODERATION_STATUSES.includes(body.moderation_status) ? body.moderation_status : reply.moderation_status;

    if (isBest) {
      await db.prepare('UPDATE community_post_replies SET is_best_answer = 0 WHERE post_id = ?').bind(reply.post_id).run();
      await db.prepare("UPDATE community_posts SET is_solved = 1, updated_at = datetime('now') WHERE id = ?").bind(reply.post_id).run();
      if (!reply.is_best_answer && reply.author_user_id) {
        const rules = await getRewardRules(db);
        const post = await db.prepare('SELECT bounty_xp FROM community_posts WHERE id = ?').bind(reply.post_id).first().catch(() => null);
        const awardXp = rules.xp_per_best_answer + Number((post && post.bounty_xp) || 0);
        await db.prepare("UPDATE community_user_preferences SET reputation_xp = reputation_xp + ?, updated_at = datetime('now') WHERE user_id = ?")
          .bind(awardXp, reply.author_user_id).run().catch(() => {});
      }
    }
    await db.prepare('UPDATE community_post_replies SET is_verified_answer = ?, is_best_answer = ?, moderation_status = ? WHERE id = ?')
      .bind(isVerified, isBest, modStat, targetId).run();
    await audit(env, request, actor, 'community_reply.moderate', 'community_post_replies', targetId, { is_verified_answer: isVerified, is_best_answer: isBest, moderation_status: modStat });
    await invalidateCommunityCaches(request);
    const res = json({ ok: true, id: targetId, is_verified_answer: Boolean(isVerified), is_best_answer: Boolean(isBest), moderation_status: modStat }, 200, NO_STORE_HEADERS);
    res.headers.set('X-CSO-Cache-Purged', '1');
    return res;
  }

  if (targetType === 'dm' && targetId && (request.method === 'PUT' || request.method === 'DELETE')) {
    if (request.method === 'DELETE') {
      await db.prepare('DELETE FROM community_direct_messages WHERE id = ?').bind(targetId).run();
    } else {
      await db.prepare("UPDATE community_direct_messages SET is_flagged = 0, request_status = 'resolved' WHERE id = ?").bind(targetId).run();
    }
    await audit(env, request, actor, 'community_dm.moderate', 'community_direct_messages', targetId, { method: request.method });
    return json({ ok: true, id: targetId }, 200, NO_STORE_HEADERS);
  }

  throw new HttpError(404, 'NOT_FOUND', 'Unknown moderation route');
}

// ============================================================================
// PUBLIC ENDPOINTS (ALWAYS Cache-Control: no-store, max-age=0)
// ============================================================================
const BOOTSTRAP_EDGE_CACHE = 'public, max-age=15, s-maxage=300, stale-while-revalidate=60';

export async function handlePublicCommunityBootstrapApi(request, env) {
  if (!env || !env.DB) {
    return json({ ok: false, tree: [], nodes: [], joined_node_ids: [], posts: [], items: [], total: 0, leaderboard: [], reward_rules: null, my_profile: null, kpis: {} }, 200, NO_STORE_HEADERS);
  }
  await ensureCommunityPlatformSchema(env.DB);
  const actor = await getActor(request, env).catch(() => null);
  const uid = actor ? actor.userId : '';
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(80, Number(url.searchParams.get('limit')) || 40));
  const bypass = url.searchParams.has('refresh') || url.searchParams.has('_cb') || Boolean(uid);

  const stmts = [
    env.DB.prepare('SELECT * FROM community_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC'),
    env.DB.prepare("SELECT * FROM community_posts WHERE moderation_status = 'published' ORDER BY is_pinned DESC, created_at DESC LIMIT 200"),
    env.DB.prepare("SELECT * FROM community_reward_rules WHERE id = 'default'"),
    env.DB.prepare(
      `SELECT p.user_id, p.reputation_xp, p.approved_contributions_count, p.membership_tier, p.bio_headline,
              COALESCE(c.full_name, u.email, p.user_id) AS display_name, COALESCE(c.district, '') AS district
       FROM community_user_preferences p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN candidates c ON c.id = p.user_id OR c.email = u.email
       ORDER BY p.reputation_xp DESC, p.approved_contributions_count DESC
       LIMIT 10`
    )
  ];
  if (uid) {
    stmts.push(
      env.DB.prepare('SELECT node_id FROM community_memberships WHERE user_id = ?').bind(uid),
      env.DB.prepare('SELECT COUNT(*) AS n FROM community_direct_messages WHERE recipient_user_id = ? AND is_read = 0').bind(uid)
    );
  }

  const batchResults = await env.DB.batch(stmts).catch(() => stmts.map(() => ({ results: [] })));
  const rawNodes = (batchResults[0] && batchResults[0].results) || [];
  const rawPosts = (batchResults[1] && batchResults[1].results) || [];
  const rawRule = (batchResults[2] && batchResults[2].results && batchResults[2].results[0]) || null;
  const leaderRows = (batchResults[3] && batchResults[3].results) || [];
  const joinedRows = uid && batchResults[4] ? (batchResults[4].results || []) : [];
  const unreadDmRow = uid && batchResults[5] && batchResults[5].results ? (batchResults[5].results[0] || { n: 0 }) : { n: 0 };

  const rules = rawRule ? {
    auto_grant_enabled: Boolean(rawRule.auto_grant_enabled),
    pro_threshold_posts: Number(rawRule.pro_threshold_posts || 3),
    permanent_threshold_posts: Number(rawRule.permanent_threshold_posts || 10),
    xp_per_approved_post: Number(rawRule.xp_per_approved_post || 40),
    xp_per_best_answer: Number(rawRule.xp_per_best_answer || 50),
    pro_perks_summary_en: rawRule.pro_perks_summary_en || '',
    pro_perks_summary_or: rawRule.pro_perks_summary_or || '',
    permanent_perks_summary_en: rawRule.permanent_perks_summary_en || '',
    permanent_perks_summary_or: rawRule.permanent_perks_summary_or || ''
  } : await getRewardRules(env.DB);

  const joinedSet = new Set(joinedRows.map(r => r.node_id));
  const pCounts = new Map();
  const inc = (id) => { if (id) pCounts.set(id, (pCounts.get(id) || 0) + 1); };
  rawPosts.forEach(p => { inc(p.category_l1_id); inc(p.category_l2_id); inc(p.category_l3_id); });

  const taxMap = new Map();
  const nodes = rawNodes.map(r => {
    const n = { ...formatTaxNode(r), posts_count: pCounts.get(r.id) || 0, is_joined: joinedSet.has(r.id) };
    taxMap.set(n.id, n);
    return n;
  });

  const allPosts = rawPosts.map(r => formatCommunityPost(r, taxMap, false));
  const userPrefs = uid ? await getOrCreateUserPrefs(env.DB, uid).catch(() => null) : null;
  const myProgress = userPrefs ? {
    ...userPrefs,
    badge_label: tierBadgeLabel(userPrefs.membership_tier) || 'Standard Member',
    joined_count: joinedSet.size,
    unread_messages: Number((unreadDmRow && unreadDmRow.n) || 0),
    pro_threshold_posts: rules.pro_threshold_posts,
    permanent_threshold_posts: rules.permanent_threshold_posts,
    next_tier: userPrefs.membership_tier === 'permanent_member' ? null : (userPrefs.membership_tier === 'pro_member' ? 'permanent_member' : 'pro_member'),
    next_threshold: userPrefs.membership_tier === 'pro_member' ? rules.permanent_threshold_posts : rules.pro_threshold_posts,
    pro_perks_summary_en: rules.pro_perks_summary_en,
    pro_perks_summary_or: rules.pro_perks_summary_or,
    permanent_perks_summary_en: rules.permanent_perks_summary_en,
    permanent_perks_summary_or: rules.permanent_perks_summary_or
  } : null;

  const leaderboard = leaderRows.map(l => ({
    user_id: l.user_id,
    display_name: l.display_name,
    district: l.district,
    reputation_xp: Number(l.reputation_xp || 0),
    approved_contributions_count: Number(l.approved_contributions_count || 0),
    membership_tier: l.membership_tier || 'standard',
    badge_label: tierBadgeLabel(l.membership_tier)
  }));

  const proSet = new Set();
  leaderboard.forEach(m => { if (m.membership_tier === 'pro_member' || m.membership_tier === 'permanent_member') proSet.add(m.user_id || m.display_name); });
  allPosts.forEach(p => { if (p.author_membership_tier === 'pro_member' || p.author_membership_tier === 'permanent_member') proSet.add(p.author_user_id || p.author_display_name); });

  const posts = allPosts.slice(0, limit);
  return json({
    ok: true,
    total_communities: nodes.length,
    joined_node_ids: [...joinedSet],
    nodes,
    tree: buildTaxonomyTree(nodes),
    total: allPosts.length,
    posts,
    items: posts,
    reward_rules: rules,
    my_profile: myProgress,
    leaderboard,
    kpis: {
      interest_circles: nodes.filter(n => Number(n.level) === 1 || Number(n.level) === 2).length,
      active_discussions: allPosts.length,
      pro_contributors: proSet.size,
      solved_qnas: allPosts.filter(p => p.is_solved).length
    }
  }, 200, { 'Cache-Control': bypass ? 'no-store, max-age=0' : BOOTSTRAP_EDGE_CACHE });
}

export async function handlePublicCommunityTreeApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, tree: [], nodes: [] }, 200, NO_STORE_HEADERS);
  await ensureCommunityPlatformSchema(env.DB);
  const actor = await getActor(request, env).catch(() => null);
  const uid = actor ? actor.userId : '';

  const [{ results: rawNodes }, { results: pubPosts }, joinedRows] = await Promise.all([
    env.DB.prepare('SELECT * FROM community_taxonomy_nodes WHERE is_published = 1 ORDER BY level ASC, sort_order ASC, title_en ASC').all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT category_l1_id, category_l2_id, category_l3_id FROM community_posts WHERE moderation_status = 'published'").all().catch(() => ({ results: [] })),
    uid ? env.DB.prepare('SELECT node_id FROM community_memberships WHERE user_id = ?').bind(uid).all().then(r => r.results || []).catch(() => []) : Promise.resolve([])
  ]);

  const joinedSet = new Set(joinedRows.map(r => r.node_id));
  const pCounts = new Map();
  const inc = (id) => { if (id) pCounts.set(id, (pCounts.get(id) || 0) + 1); };
  (pubPosts || []).forEach(p => { inc(p.category_l1_id); inc(p.category_l2_id); inc(p.category_l3_id); });

  const nodes = (rawNodes || []).map(r => {
    const n = formatTaxNode(r);
    return { ...n, posts_count: pCounts.get(n.id) || 0, is_joined: joinedSet.has(n.id) };
  });

  return json({
    ok: true,
    total_communities: nodes.length,
    joined_node_ids: [...joinedSet],
    nodes,
    tree: buildTaxonomyTree(nodes)
  }, 200, NO_STORE_HEADERS);
}

export async function handlePublicCommunityFeedApi(request, env) {
  if (!env || !env.DB) return json({ ok: false, items: [], total: 0 }, 200, NO_STORE_HEADERS);
  await ensureCommunityPlatformSchema(env.DB);
  const actor = await getActor(request, env).catch(() => null);
  const uid = actor ? actor.userId : '';
  const url = new URL(request.url);

  const l1 = str(url.searchParams.get('l1'), 80);
  const l2 = str(url.searchParams.get('l2'), 80);
  const l3 = str(url.searchParams.get('l3'), 80);
  const type = str(url.searchParams.get('type'), 40).toLowerCase();
  const district = str(url.searchParams.get('district'), 80).toLowerCase();
  const joinedOnly = url.searchParams.get('joined_only') === '1';
  const unansweredOnly = url.searchParams.get('unanswered_only') === '1';
  const featuredCollections = url.searchParams.get('featured_collections') === '1';
  const proContributors = url.searchParams.get('pro_contributors') === '1';
  const sort = str(url.searchParams.get('sort') || 'latest', 24).toLowerCase();
  const search = str(url.searchParams.get('search') || url.searchParams.get('q'), 120).toLowerCase();
  const limit = Math.max(1, Math.min(80, Number(url.searchParams.get('limit')) || 40));

  const [{ map: taxMap }, { results: rows }, rules, joinedRows, leaderRows, userPrefs, unreadDmRow] = await Promise.all([
    loadTaxonomyMap(env.DB),
    env.DB.prepare("SELECT * FROM community_posts WHERE moderation_status = 'published' ORDER BY is_pinned DESC, created_at DESC LIMIT 200").all().catch(() => ({ results: [] })),
    getRewardRules(env.DB),
    uid ? env.DB.prepare('SELECT node_id FROM community_memberships WHERE user_id = ?').bind(uid).all().then(r => r.results || []).catch(() => []) : Promise.resolve([]),
    env.DB.prepare(
      `SELECT p.user_id, p.reputation_xp, p.approved_contributions_count, p.membership_tier, p.bio_headline,
              COALESCE(c.full_name, u.email, p.user_id) AS display_name, COALESCE(c.district, '') AS district
       FROM community_user_preferences p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN candidates c ON c.id = p.user_id OR c.email = u.email
       ORDER BY p.reputation_xp DESC, p.approved_contributions_count DESC
       LIMIT 10`
    ).all().then(r => r.results || []).catch(() => []),
    uid ? getOrCreateUserPrefs(env.DB, uid) : Promise.resolve(null),
    uid ? env.DB.prepare('SELECT COUNT(*) AS n FROM community_direct_messages WHERE recipient_user_id = ? AND is_read = 0').bind(uid).first().catch(() => ({ n: 0 })) : Promise.resolve({ n: 0 })
  ]);

  const joinedSet = new Set(joinedRows.map(r => r.node_id));
  const all = (rows || []).map(r => formatCommunityPost(r, taxMap, false));

  const filtered = all.filter(p => {
    if (l1 && p.category_l1_id !== l1 && (!p.taxonomy.l1 || p.taxonomy.l1.slug !== l1)) return false;
    if (l2 && p.category_l2_id !== l2 && (!p.taxonomy.l2 || p.taxonomy.l2.slug !== l2)) return false;
    if (l3 && p.category_l3_id !== l3 && (!p.taxonomy.l3 || p.taxonomy.l3.slug !== l3)) return false;
    if (type && p.post_type !== type) return false;
    if (district && p.district_tag.toLowerCase() !== district) return false;
    if (joinedOnly && joinedSet.size > 0 && !joinedSet.has(p.category_l1_id) && !joinedSet.has(p.category_l2_id) && !joinedSet.has(p.category_l3_id)) return false;
    if (unansweredOnly && (p.post_type !== 'question' || p.is_solved || p.replies_count > 0)) return false;
    if (featuredCollections && !p.is_featured_collection) return false;
    if (proContributors && p.author_membership_tier !== 'pro_member' && p.author_membership_tier !== 'permanent_member') return false;
    if (search) {
      const hay = `${p.title_en} ${p.title_or} ${p.body_en} ${p.author_display_name} ${p.district_tag} ${p.exam_tag}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
    if (sort === 'top_voted') return b.upvotes_count - a.upvotes_count;
    if (sort === 'most_discussed') return b.replies_count - a.replies_count;
    if (sort === 'bounty') return b.bounty_xp - a.bounty_xp;
    return String(b.created_at).localeCompare(String(a.created_at));
  });

  const myProgress = userPrefs ? {
    ...userPrefs,
    badge_label: tierBadgeLabel(userPrefs.membership_tier) || 'Standard Member',
    joined_count: joinedSet.size,
    unread_messages: Number((unreadDmRow && unreadDmRow.n) || 0),
    pro_threshold_posts: rules.pro_threshold_posts,
    permanent_threshold_posts: rules.permanent_threshold_posts,
    next_tier: userPrefs.membership_tier === 'permanent_member' ? null : (userPrefs.membership_tier === 'pro_member' ? 'permanent_member' : 'pro_member'),
    next_threshold: userPrefs.membership_tier === 'pro_member' ? rules.permanent_threshold_posts : rules.pro_threshold_posts,
    pro_perks_summary_en: rules.pro_perks_summary_en,
    pro_perks_summary_or: rules.pro_perks_summary_or,
    permanent_perks_summary_en: rules.permanent_perks_summary_en,
    permanent_perks_summary_or: rules.permanent_perks_summary_or
  } : null;

  return json({
    ok: true,
    total: filtered.length,
    items: filtered.slice(0, limit),
    reward_rules: rules,
    my_profile: myProgress,
    leaderboard: leaderRows.map(l => ({
      user_id: l.user_id,
      display_name: l.display_name,
      district: l.district,
      reputation_xp: Number(l.reputation_xp || 0),
      approved_contributions_count: Number(l.approved_contributions_count || 0),
      membership_tier: l.membership_tier || 'standard',
      badge_label: tierBadgeLabel(l.membership_tier)
    }))
  }, 200, NO_STORE_HEADERS);
}

export async function handlePublicCommunityPostDetailApi(request, env) {
  if (!env || !env.DB) return json({ error: 'Database unavailable' }, 500, NO_STORE_HEADERS);
  await ensureCommunityPlatformSchema(env.DB);
  const url = new URL(request.url);
  const slug = str(url.searchParams.get('slug'), 160);
  const id = str(url.searchParams.get('id'), 80);
  const previewToken = str(url.searchParams.get('preview_token'), 160);
  if (!slug && !id) return json({ error: 'slug or id query parameter is required' }, 400, NO_STORE_HEADERS);

  const row = slug
    ? await env.DB.prepare('SELECT * FROM community_posts WHERE slug = ?').bind(slug).first()
    : await env.DB.prepare('SELECT * FROM community_posts WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'Community post not found' }, 404, NO_STORE_HEADERS);

  let isPreview = false;
  let previewExpiresAt = '';
  if (row.moderation_status !== 'published') {
    let authorized = false;
    if (previewToken && row.preview_token && constantTimeEqual(previewToken, row.preview_token)) {
      const exp = Date.parse(String(row.preview_expires_at || ''));
      if (Number.isFinite(exp) && exp > Date.now()) {
        authorized = true;
        previewExpiresAt = String(row.preview_expires_at || '');
      }
    }
    if (!authorized) {
      const actor = await getActor(request, env).catch(() => null);
      if (actor && STAFF_ROLES.includes(actor.role)) {
        authorized = true;
        previewExpiresAt = String(row.preview_expires_at || new Date(Date.now() + 2 * 3600 * 1000).toISOString());
      }
    }
    if (!authorized) return json({ error: 'Community post not found or preview link expired' }, 404, NO_STORE_HEADERS);
    isPreview = true;
  } else {
    await env.DB.prepare('UPDATE community_posts SET views_count = views_count + 1 WHERE id = ?').bind(row.id).run().catch(() => {});
  }

  const [{ map: taxMap }, { results: replyRows }] = await Promise.all([
    loadTaxonomyMap(env.DB),
    env.DB.prepare(
      `SELECT * FROM community_post_replies
       WHERE post_id = ? AND moderation_status = 'published'
       ORDER BY is_best_answer DESC, is_verified_answer DESC, upvotes_count DESC, created_at ASC`
    ).bind(row.id).all().catch(() => ({ results: [] }))
  ]);

  const replies = (replyRows || []).map(r => ({
    id: r.id,
    post_id: r.post_id,
    author_user_id: r.author_user_id || '',
    author_display_name: r.author_display_name || 'Member',
    author_badge: r.author_badge || tierBadgeLabel(r.author_membership_tier),
    author_membership_tier: r.author_membership_tier || 'standard',
    body_text: r.body_text || '',
    attachment_url: r.attachment_url || '',
    upvotes_count: Number(r.upvotes_count || 0),
    is_verified_answer: Boolean(r.is_verified_answer),
    is_best_answer: Boolean(r.is_best_answer),
    created_at: r.created_at || ''
  }));

  return json({
    ok: true,
    is_preview: isPreview,
    preview_expires_at: previewExpiresAt,
    post: formatCommunityPost(row, taxMap, false),
    best_answer: replies.find(r => r.is_best_answer || r.is_verified_answer) || null,
    replies
  }, 200, NO_STORE_HEADERS);
}

// ============================================================================
// AUTHENTICATED MEMBER ENDPOINTS (ENFORCING enforceCandidateAccess)
// ============================================================================
export async function handleMemberCommunityJoinApi(request, env) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
    await ensureCommunityPlatformSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    const body = await readJson(request, 8000);

    // Profile preference update (DM privacy / bio headline)
    if (body.action === 'update_preferences') {
      await getOrCreateUserPrefs(env.DB, session.userId);
      const allowDm = body.allow_direct_messages !== undefined ? boolInt(body.allow_direct_messages, 1) : 1;
      const bio = str(body.bio_headline, 180);
      await env.DB.prepare("UPDATE community_user_preferences SET allow_direct_messages = ?, bio_headline = ?, updated_at = datetime('now') WHERE user_id = ?")
        .bind(allowDm, bio, session.userId).run();
      return json({ ok: true, preferences: await getOrCreateUserPrefs(env.DB, session.userId) }, 200, NO_STORE_HEADERS);
    }

    const nodeId = str(body.node_id, 80);
    if (!nodeId) throw validationError({ node_id: 'node_id is required.' });
    const node = await env.DB.prepare('SELECT id, members_count FROM community_taxonomy_nodes WHERE id = ? AND is_published = 1').bind(nodeId).first();
    if (!node) throw new HttpError(404, 'NOT_FOUND', 'Community not found');

    const existing = await env.DB.prepare('SELECT id FROM community_memberships WHERE user_id = ? AND node_id = ?').bind(session.userId, nodeId).first();
    let joined = false;
    if (existing && body.action !== 'join') {
      await env.DB.prepare('DELETE FROM community_memberships WHERE id = ?').bind(existing.id).run();
      await env.DB.prepare('UPDATE community_taxonomy_nodes SET members_count = MAX(0, members_count - 1) WHERE id = ?').bind(nodeId).run();
      joined = false;
    } else if (!existing) {
      await env.DB.prepare("INSERT INTO community_memberships (id, user_id, node_id, role, joined_at) VALUES (?, ?, ?, 'member', datetime('now'))")
        .bind(`cmem_${Date.now().toString(36)}_${randomHex(3)}`, session.userId, nodeId).run();
      await env.DB.prepare('UPDATE community_taxonomy_nodes SET members_count = members_count + 1 WHERE id = ?').bind(nodeId).run();
      joined = true;
    } else {
      joined = true;
    }
    const updatedNode = await env.DB.prepare('SELECT members_count FROM community_taxonomy_nodes WHERE id = ?').bind(nodeId).first();
    return json({ ok: true, node_id: nodeId, joined, members_count: Number((updatedNode && updatedNode.members_count) || 0) }, 200, NO_STORE_HEADERS);
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || 'Join failed', code: (e && e.code) || 'ERROR' }, (e && e.status) || 500, NO_STORE_HEADERS);
  }
}

export async function handleMemberCommunityPostCreateApi(request, env) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
    await ensureCommunityPlatformSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    await rateLimit(env, `comm-post:${session.userId}`, 15, 600);

    const ct = (request.headers.get('Content-Type') || '').toLowerCase();
    let body = {};
    let attachmentUrl = '';
    let attachmentLabel = '';
    if (ct.startsWith('multipart/form-data')) {
      const form = await request.formData();
      for (const [k, v] of form.entries()) {
        if (typeof v === 'string') body[k] = v;
      }
      const file = form.get('attachment');
      if (file && typeof file !== 'string' && file.size > 0) {
        const stored = await storeCommunityMediaFile(env, file, 'member-share', session.email || session.userId);
        attachmentUrl = stored.url;
        attachmentLabel = stored.filename;
      }
    } else {
      body = await readJson(request, 60000);
      attachmentUrl = safeHref(body.attachment_url);
      attachmentLabel = str(body.attachment_label, 140);
    }

    const titleEn = str(body.title_en, 240);
    const bodyEn = str(body.body_en, 25000);
    if (!titleEn || titleEn.length < 5) throw validationError({ title_en: 'Please enter a descriptive title (min 5 characters).' });
    if (!bodyEn || bodyEn.length < 10) throw validationError({ body_en: 'Please add details (min 10 characters).' });

    const prefs = await getOrCreateUserPrefs(env.DB, session.userId);
    const isProOrPerm = prefs.membership_tier === 'pro_member' || prefs.membership_tier === 'permanent_member' || STAFF_ROLES.includes(session.role);

    // Check community posting policy
    const targetNodeId = str(body.category_l3_id || body.category_l2_id || body.category_l1_id, 80);
    let policy = 'open_verified';
    if (targetNodeId) {
      const tn = await env.DB.prepare('SELECT posting_policy FROM community_taxonomy_nodes WHERE id = ?').bind(targetNodeId).first().catch(() => null);
      if (tn && tn.posting_policy) policy = tn.posting_policy;
    }
    if (policy === 'admin_only' && !STAFF_ROLES.includes(session.role)) {
      throw new HttpError(403, 'ADMIN_ONLY_CIRCLE', 'Only Admin editors can post in this spotlight circle.');
    }
    if (policy === 'pro_only' && !isProOrPerm) {
      throw new HttpError(403, 'PRO_ONLY_CIRCLE', 'This exclusive circle is unlocked for CS Odisha Pro ⭐ & Permanent 👑 Members.');
    }

    const allowedMemberTypes = ['question', 'shared_notes', 'memory_question', 'answer_key_objection', 'center_radar', 'scheme_playbook', 'daily_checkin'];
    const postType = allowedMemberTypes.includes(body.post_type) ? body.post_type : 'question';
    const moderationStatus = (policy === 'pre_moderated' && !isProOrPerm) ? 'pending_review' : 'published';

    const cand = await env.DB.prepare('SELECT full_name, district FROM candidates WHERE id = ? OR email = ? LIMIT 1').bind(session.userId, session.email || '').first().catch(() => null);
    const displayName = str((cand && cand.full_name) || session.email || 'CS Odisha Aspirant', 100);
    const districtTag = str(body.district_tag || (cand && cand.district) || '', 80);

    // Optional +25 XP priority doubt bounty
    let bountyXp = 0;
    if (postType === 'question' && Number(body.bounty_xp) > 0) {
      const wanted = Math.min(50, intOrZero(body.bounty_xp, 0, 50));
      if (prefs.reputation_xp >= wanted) {
        bountyXp = wanted;
        await env.DB.prepare("UPDATE community_user_preferences SET reputation_xp = MAX(0, reputation_xp - ?), updated_at = datetime('now') WHERE user_id = ?")
          .bind(bountyXp, session.userId).run();
      }
    }

    const id = `cpost_${Date.now().toString(36)}_${randomHex(4)}`;
    const slug = `${slugify(titleEn, 'post')}-${randomHex(3)}`;

    await env.DB.prepare(
      `INSERT INTO community_posts (
        id, slug, author_user_id, author_display_name, author_badge, author_membership_tier,
        is_official_spotlight, category_l1_id, category_l2_id, category_l3_id, post_type,
        district_tag, exam_tag, bounty_xp, title_en, title_or, body_en, body_or,
        attachment_url, attachment_label, moderation_status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )`
    ).bind(
      id, slug, session.userId, displayName, tierBadgeLabel(prefs.membership_tier), prefs.membership_tier,
      str(body.category_l1_id, 80), str(body.category_l2_id, 80), str(body.category_l3_id, 80), postType,
      districtTag, str(body.exam_tag, 80), bountyXp, titleEn, str(body.title_or, 260), bodyEn, str(body.body_or, 25000),
      attachmentUrl, attachmentLabel, moderationStatus
    ).run();

    let updatedPrefs = prefs;
    if (moderationStatus === 'published') {
      updatedPrefs = await rewardApprovedContribution(env, request, null, session.userId);
    }

    const row = await env.DB.prepare('SELECT * FROM community_posts WHERE id = ?').bind(id).first();
    const { map: taxMap } = await loadTaxonomyMap(env.DB);
    await invalidateCommunityCaches(request, slug);
    return json({
      ok: true,
      moderation_status: moderationStatus,
      item: formatCommunityPost(row, taxMap, false),
      my_profile: updatedPrefs
    }, 201, NO_STORE_HEADERS);
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || 'Post creation failed', code: (e && e.code) || 'ERROR' }, (e && e.status) || 500, NO_STORE_HEADERS);
  }
}

export async function handleMemberCommunityReplyApi(request, env, postId) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
    await ensureCommunityPlatformSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    await rateLimit(env, `comm-reply:${session.userId}`, 30, 600);

    const post = await env.DB.prepare('SELECT id, slug, is_locked, moderation_status FROM community_posts WHERE id = ?').bind(postId).first();
    if (!post || post.moderation_status !== 'published') throw new HttpError(404, 'NOT_FOUND', 'Discussion thread not found');
    if (post.is_locked) throw new HttpError(403, 'THREAD_LOCKED', 'This thread is locked by moderators.');

    const body = await readJson(request, 20000);
    const bodyText = str(body.body_text || body.body, 8000);
    if (!bodyText || bodyText.length < 3) throw validationError({ body_text: 'Reply text is required.' });

    const prefs = await getOrCreateUserPrefs(env.DB, session.userId);
    const cand = await env.DB.prepare('SELECT full_name FROM candidates WHERE id = ? OR email = ? LIMIT 1').bind(session.userId, session.email || '').first().catch(() => null);
    const displayName = str((cand && cand.full_name) || session.email || 'CS Odisha Aspirant', 100);
    const id = `crep_${Date.now().toString(36)}_${randomHex(4)}`;

    await env.DB.prepare(
      `INSERT INTO community_post_replies (id, post_id, author_user_id, author_display_name, author_badge, author_membership_tier, body_text, attachment_url, moderation_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'))`
    ).bind(id, postId, session.userId, displayName, tierBadgeLabel(prefs.membership_tier), prefs.membership_tier, bodyText, safeHref(body.attachment_url)).run();

    await env.DB.prepare("UPDATE community_posts SET replies_count = replies_count + 1, updated_at = datetime('now') WHERE id = ?").bind(postId).run();
    await env.DB.prepare("UPDATE community_user_preferences SET reputation_xp = reputation_xp + 10, updated_at = datetime('now') WHERE user_id = ?").bind(session.userId).run().catch(() => {});

    const created = await env.DB.prepare('SELECT * FROM community_post_replies WHERE id = ?').bind(id).first();
    await invalidateCommunityCaches(request, post.slug);
    return json({ ok: true, reply: created }, 201, NO_STORE_HEADERS);
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || 'Reply failed', code: (e && e.code) || 'ERROR' }, (e && e.status) || 500, NO_STORE_HEADERS);
  }
}

export async function handleMemberCommunityReactApi(request, env) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
    await ensureCommunityPlatformSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    const body = await readJson(request, 10000);
    const reactionType = str(body.reaction_type, 32).toLowerCase();
    const targetType = str(body.target_type || 'post', 24).toLowerCase();
    const targetId = str(body.target_id, 80);
    if (!targetId) throw validationError({ target_id: 'target_id is required.' });

    // 1. Mark Best Answer (by post author or staff)
    if (reactionType === 'best_answer') {
      const reply = await env.DB.prepare('SELECT * FROM community_post_replies WHERE id = ?').bind(targetId).first();
      if (!reply) throw new HttpError(404, 'NOT_FOUND', 'Reply not found');
      const post = await env.DB.prepare('SELECT id, slug, author_user_id, bounty_xp FROM community_posts WHERE id = ?').bind(reply.post_id).first();
      if (!post) throw new HttpError(404, 'NOT_FOUND', 'Post not found');
      if (post.author_user_id !== session.userId && !STAFF_ROLES.includes(session.role)) {
        throw new HttpError(403, 'FORBIDDEN', 'Only the question author or moderators can mark Best Answer.');
      }
      await env.DB.prepare('UPDATE community_post_replies SET is_best_answer = 0 WHERE post_id = ?').bind(post.id).run();
      await env.DB.prepare('UPDATE community_post_replies SET is_best_answer = 1 WHERE id = ?').bind(targetId).run();
      await env.DB.prepare("UPDATE community_posts SET is_solved = 1, updated_at = datetime('now') WHERE id = ?").bind(post.id).run();
      if (reply.author_user_id && reply.author_user_id !== session.userId) {
        const rules = await getRewardRules(env.DB);
        const xpAward = rules.xp_per_best_answer + Number(post.bounty_xp || 0);
        await env.DB.prepare("UPDATE community_user_preferences SET reputation_xp = reputation_xp + ?, updated_at = datetime('now') WHERE user_id = ?")
          .bind(xpAward, reply.author_user_id).run().catch(() => {});
      }
      await invalidateCommunityCaches(request, post.slug);
      return json({ ok: true, reaction_type: 'best_answer', reply_id: targetId }, 200, NO_STORE_HEADERS);
    }

    // 2. Poll Vote (unique 1-vote per user)
    if (reactionType === 'poll_vote') {
      const optionIdx = intOrZero(body.option_index, 0, 10);
      const post = await env.DB.prepare('SELECT id, slug, poll_options_json, poll_votes_json FROM community_posts WHERE id = ?').bind(targetId).first();
      if (!post) throw new HttpError(404, 'NOT_FOUND', 'Poll not found');
      const existing = await env.DB.prepare("SELECT id FROM community_post_reactions WHERE target_type = 'post' AND target_id = ? AND user_id = ? AND reaction_type = 'poll_vote'")
        .bind(targetId, session.userId).first();
      if (existing) throw new HttpError(409, 'ALREADY_VOTED', 'You have already voted in this poll.');
      await env.DB.prepare("INSERT INTO community_post_reactions (id, target_type, target_id, user_id, reaction_type, score_value, created_at) VALUES (?, 'post', ?, ?, 'poll_vote', ?, datetime('now'))")
        .bind(`creact_${Date.now().toString(36)}_${randomHex(3)}`, targetId, session.userId, optionIdx).run();
      const votes = parseJson(post.poll_votes_json, {});
      votes[String(optionIdx)] = Number(votes[String(optionIdx)] || 0) + 1;
      await env.DB.prepare("UPDATE community_posts SET poll_votes_json = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(votes), targetId).run();
      await invalidateCommunityCaches(request, post.slug);
      return json({ ok: true, poll_votes: votes }, 200, NO_STORE_HEADERS);
    }

    // 3. Daily Quiz Challenge Submission (unique 1-attempt XP award per user)
    if (reactionType === 'quiz_attempt') {
      const score = Number(body.score || 0);
      const total = Math.max(1, intOrZero(body.total, 1, 50));
      const existing = await env.DB.prepare("SELECT id, score_value FROM community_post_reactions WHERE target_type = 'post' AND target_id = ? AND user_id = ? AND reaction_type = 'quiz_attempt'")
        .bind(targetId, session.userId).first();
      if (existing) {
        return json({ ok: true, already_attempted: true, best_score: Number(existing.score_value || 0), xp_awarded: 0 }, 200, NO_STORE_HEADERS);
      }
      await env.DB.prepare("INSERT INTO community_post_reactions (id, target_type, target_id, user_id, reaction_type, score_value, created_at) VALUES (?, 'post', ?, ?, 'quiz_attempt', ?, datetime('now'))")
        .bind(`creact_${Date.now().toString(36)}_${randomHex(3)}`, targetId, session.userId, score).run();
      const xpAward = Math.max(5, Math.round((score / total) * 25));
      await getOrCreateUserPrefs(env.DB, session.userId);
      await env.DB.prepare("UPDATE community_user_preferences SET reputation_xp = reputation_xp + ?, updated_at = datetime('now') WHERE user_id = ?")
        .bind(xpAward, session.userId).run();
      return json({ ok: true, score, total, xp_awarded: xpAward }, 200, NO_STORE_HEADERS);
    }

    // 4. Upvote (Post or Reply) & Bookmark toggle
    if (reactionType === 'upvote' || reactionType === 'bookmark') {
      const existing = await env.DB.prepare('SELECT id FROM community_post_reactions WHERE target_type = ? AND target_id = ? AND user_id = ? AND reaction_type = ?')
        .bind(targetType, targetId, session.userId, reactionType).first();
      let active = false;
      if (existing) {
        await env.DB.prepare('DELETE FROM community_post_reactions WHERE id = ?').bind(existing.id).run();
        if (reactionType === 'upvote') {
          const tbl = targetType === 'reply' ? 'community_post_replies' : 'community_posts';
          await env.DB.prepare(`UPDATE ${tbl} SET upvotes_count = MAX(0, upvotes_count - 1) WHERE id = ?`).bind(targetId).run();
        }
        active = false;
      } else {
        await env.DB.prepare("INSERT INTO community_post_reactions (id, target_type, target_id, user_id, reaction_type, score_value, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))")
          .bind(`creact_${Date.now().toString(36)}_${randomHex(3)}`, targetType, targetId, session.userId, reactionType).run();
        if (reactionType === 'upvote') {
          const tbl = targetType === 'reply' ? 'community_post_replies' : 'community_posts';
          await env.DB.prepare(`UPDATE ${tbl} SET upvotes_count = upvotes_count + 1 WHERE id = ?`).bind(targetId).run();
        }
        active = true;
      }
      return json({ ok: true, reaction_type: reactionType, target_type: targetType, target_id: targetId, active }, 200, NO_STORE_HEADERS);
    }

    throw validationError({ reaction_type: 'Unsupported reaction type.' });
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || 'Reaction failed', code: (e && e.code) || 'ERROR' }, (e && e.status) || 500, NO_STORE_HEADERS);
  }
}

// ============================================================================
// AUTHENTICATED PEER DIRECT MESSAGING & STUDY BUDDY REQUESTS (/api/community/messages)
// ============================================================================
export async function handleMemberCommunityMessagesApi(request, env) {
  try {
    await ensureCommunityPlatformSchema(env.DB);
    const { session } = await requireCandidateSession(request, env);
    const uid = session.userId;

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT * FROM community_direct_messages
         WHERE sender_user_id = ? OR recipient_user_id = ?
         ORDER BY created_at DESC LIMIT 120`
      ).bind(uid, uid).all().catch(() => ({ results: [] }));
      const messages = results || [];
      const unreadCount = messages.filter(m => m.recipient_user_id === uid && !m.is_read).length;
      const prefs = await getOrCreateUserPrefs(env.DB, uid);
      return json({
        ok: true,
        allow_direct_messages: prefs.allow_direct_messages,
        unread_count: unreadCount,
        messages
      }, 200, NO_STORE_HEADERS);
    }

    if (request.method === 'POST') {
      await rateLimit(env, `comm-dm:${uid}`, 30, 600);
      const body = await readJson(request, 12000);
      const action = str(body.action || 'send', 32).toLowerCase();

      if (action === 'mark_read') {
        const threadKey = str(body.thread_key, 160);
        if (threadKey) {
          await env.DB.prepare('UPDATE community_direct_messages SET is_read = 1 WHERE thread_key = ? AND recipient_user_id = ?').bind(threadKey, uid).run();
        }
        return json({ ok: true }, 200, NO_STORE_HEADERS);
      }

      if (action === 'respond_request') {
        const msgId = str(body.message_id, 80);
        const decision = ['accepted', 'declined', 'muted'].includes(body.decision) ? body.decision : 'accepted';
        await env.DB.prepare('UPDATE community_direct_messages SET request_status = ?, is_read = 1 WHERE id = ? AND recipient_user_id = ?')
          .bind(decision, msgId, uid).run();
        return json({ ok: true, message_id: msgId, request_status: decision }, 200, NO_STORE_HEADERS);
      }

      if (action === 'report') {
        const msgId = str(body.message_id, 80);
        const reason = str(body.flag_reason || 'Reported by recipient', 300);
        await env.DB.prepare('UPDATE community_direct_messages SET is_flagged = 1, flag_reason = ? WHERE id = ? AND (recipient_user_id = ? OR sender_user_id = ?)')
          .bind(reason, msgId, uid, uid).run();
        return json({ ok: true, flagged: true }, 200, NO_STORE_HEADERS);
      }

      const recipientId = str(body.recipient_user_id, 120);
      const messageText = str(body.message_text, 2000);
      if (!recipientId || recipientId === uid) throw validationError({ recipient_user_id: 'Valid recipient is required.' });
      if (!messageText || messageText.length < 2) throw validationError({ message_text: 'Message cannot be empty.' });

      const recPrefs = await getOrCreateUserPrefs(env.DB, recipientId);
      if (!recPrefs.allow_direct_messages) {
        throw new HttpError(403, 'DM_DISABLED', 'This member has disabled incoming direct messages.');
      }

      const [senderCand, recCand] = await Promise.all([
        env.DB.prepare('SELECT full_name FROM candidates WHERE id = ? OR email = ? LIMIT 1').bind(uid, session.email || '').first().catch(() => null),
        env.DB.prepare('SELECT full_name FROM candidates WHERE id = ? LIMIT 1').bind(recipientId).first().catch(() => null)
      ]);
      const senderName = str((senderCand && senderCand.full_name) || session.email || 'Member', 100);
      const recipientName = str(body.recipient_name || (recCand && recCand.full_name) || 'Member', 100);
      const reqType = ['direct_message', 'study_partner_request', 'exam_buddy_request'].includes(body.request_type) ? body.request_type : 'direct_message';
      const reqStatus = reqType === 'direct_message' ? 'active' : 'pending';
      const threadKey = makeThreadKey(uid, recipientId);
      const id = `cdm_${Date.now().toString(36)}_${randomHex(4)}`;

      await env.DB.prepare(
        `INSERT INTO community_direct_messages (id, thread_key, sender_user_id, sender_name, recipient_user_id, recipient_name, context_post_id, request_type, request_status, message_text, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`
      ).bind(id, threadKey, uid, senderName, recipientId, recipientName, str(body.context_post_id, 80), reqType, reqStatus, messageText).run();

      const created = await env.DB.prepare('SELECT * FROM community_direct_messages WHERE id = ?').bind(id).first();
      return json({ ok: true, message: created }, 201, NO_STORE_HEADERS);
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || 'Messaging error', code: (e && e.code) || 'ERROR' }, (e && e.status) || 500, NO_STORE_HEADERS);
  }
}
