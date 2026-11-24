#!/usr/bin/env node
/**
 * v252 Community, Interest Circles, Public Content Sharing, Peer Q&A,
 * Direct Messaging & Pro/Permanent Contributor Reward Platform Verification Suite
 *
 * Tests:
 *  1. Migration 0141 creates all 8 tables, starter 3-layer Odisha Communities of Interest,
 *     starter reward rules, and starter spotlight / poll / daily quiz challenge
 *  2. Zero-Stale-Cache Architecture & Full End-to-End Backend Flow:
 *     - 3-layer taxonomy CRUD + posting_policy + Cache-Control: no-store, max-age=0 + X-CSO-Cache-Purged: 1
 *     - Official Spotlight / Poll / Daily Quiz creation + Draft Preview Token
 *     - Approve / Pin / Promote Memory Question -> Study Library Draft
 *     - Grant Pro ⭐ & Permanent 👑 Membership syncing candidate_governance + Assigned For You notification
 *     - Reward Rules update & Moderation Queue (Verify/Best Answer + Flagged DMs)
 *  3. Full Wiring across Admin Studio (5 Tabs), Public Community Portal, Candidate Hub & Homepage
 *  4. Strict CSP Compliance across all v252 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v252
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  handleCommunityTaxonomyAdmin,
  handleCommunityPostsAdmin,
  handleCommunityRewardRulesAdmin,
  handleCommunityGrantMembershipAdmin,
  handleCommunityModerationAdmin,
  handlePublicCommunityTreeApi,
  handlePublicCommunityFeedApi,
  handlePublicCommunityPostDetailApi
} from '../functions/_lib/community-platform.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${err && err.stack ? err.stack : err}`);
  }
}

console.log('\n=== v252 Community, Interest Circles, Peer Q&A, DMs & Pro Rewards Verification ===');

function createMockD1() {
  const state = {
    community_taxonomy_nodes: [],
    community_memberships: [],
    community_posts: [],
    community_post_replies: [],
    community_post_reactions: [],
    community_direct_messages: [],
    community_user_preferences: [],
    community_reward_rules: [{
      id: 'default', auto_grant_enabled: 1, pro_threshold_posts: 3, permanent_threshold_posts: 10,
      xp_per_approved_post: 40, xp_per_best_answer: 50,
      pro_perks_summary_en: 'Pro perks', pro_perks_summary_or: '',
      permanent_perks_summary_en: 'Permanent perks', permanent_perks_summary_or: '',
      updated_at: new Date().toISOString()
    }],
    candidate_governance: [],
    candidate_assigned_items: [],
    study_articles: [],
    users: [{ id: 'cand-1', email: 'aspirant@odisha.in' }],
    audit_log: []
  };

  function makeStmt(sql) {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    return {
      _binds: [],
      bind(...args) { this._binds = args; return this; },
      async run() {
        const b = this._binds;
        if (/^CREATE TABLE/i.test(cleanSql)) return { success: true, meta: { changes: 0 } };
        if (/^INSERT INTO audit_log/i.test(cleanSql)) { state.audit_log.push({ binds: b }); return { success: true, meta: { changes: 1 } }; }
        if (/^INSERT INTO community_taxonomy_nodes/i.test(cleanSql)) {
          state.community_taxonomy_nodes.push({
            id: b[0], level: b[1], parent_id: b[2], slug: b[3],
            title_en: b[4], title_or: b[5], subtitle_en: b[6], subtitle_or: b[7],
            icon: b[8], accent_variant: b[9], posting_policy: b[10], members_count: 0,
            sort_order: b[11], is_published: b[12], updated_at: new Date().toISOString()
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT INTO community_posts/i.test(cleanSql)) {
          state.community_posts.push({
            id: b[0], slug: b[1], author_user_id: b[2], author_display_name: b[3], author_badge: b[4],
            author_membership_tier: 'permanent_member', is_official_spotlight: 1,
            category_l1_id: b[5], category_l2_id: b[6], category_l3_id: b[7], post_type: b[8],
            district_tag: b[9], exam_tag: b[10], linked_entity_type: b[11], linked_entity_id: b[12], bounty_xp: b[13],
            title_en: b[14], title_or: b[15], body_en: b[16], body_or: b[17],
            attachment_url: b[18], attachment_label: b[19], cover_image_url: b[20],
            poll_options_json: b[21], poll_votes_json: '{}', challenge_mcqs_json: b[22],
            upvotes_count: 0, replies_count: 0, views_count: 0,
            is_pinned: b[23], is_locked: b[24], is_solved: 0, is_featured_collection: b[25],
            moderation_status: b[26], moderator_note: '', promoted_study_id: '', reward_granted_tier: '',
            preview_token: '', preview_expires_at: '',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString()
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^UPDATE community_posts SET preview_token = \?/i.test(cleanSql)) {
          const p = state.community_posts.find(x => x.id === b[2]);
          if (p) { p.preview_token = b[0]; p.preview_expires_at = b[1]; }
          return { success: true, meta: { changes: p ? 1 : 0 } };
        }
        if (/^UPDATE community_posts SET promoted_study_id = \?/i.test(cleanSql)) {
          const p = state.community_posts.find(x => x.id === b[1]);
          if (p) { p.promoted_study_id = b[0]; p.is_featured_collection = 1; }
          return { success: true, meta: { changes: p ? 1 : 0 } };
        }
        if (/^UPDATE community_posts SET reward_granted_tier = \?/i.test(cleanSql)) {
          const p = state.community_posts.find(x => x.id === b[1]);
          if (p) p.reward_granted_tier = b[0];
          return { success: true, meta: { changes: p ? 1 : 0 } };
        }
        if (/^UPDATE community_posts SET/i.test(cleanSql)) {
          const id = b[b.length - 1];
          const p = state.community_posts.find(x => x.id === id);
          if (p) {
            if (cleanSql.includes('moderation_status = ?')) p.moderation_status = b[0];
            if (cleanSql.includes('views_count = views_count + 1')) p.views_count += 1;
          }
          return { success: true, meta: { changes: p ? 1 : 0 } };
        }
        if (/^INSERT INTO study_articles/i.test(cleanSql)) {
          state.study_articles.push({ id: b[0], slug: b[1], title_en: b[3], is_published: 0 });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT OR IGNORE INTO community_user_preferences/i.test(cleanSql)) {
          if (!state.community_user_preferences.find(x => x.user_id === b[0])) {
            state.community_user_preferences.push({
              user_id: b[0], allow_direct_messages: 1, bio_headline: '', trust_level: 1,
              reputation_xp: 0, approved_contributions_count: 0, membership_tier: 'standard',
              pro_granted_reason: '', pro_granted_at: '', earned_badges_json: '[]'
            });
          }
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT INTO community_user_preferences/i.test(cleanSql)) {
          let row = state.community_user_preferences.find(x => x.user_id === b[0]);
          if (!row) {
            row = { user_id: b[0], allow_direct_messages: 1, bio_headline: '', trust_level: 1, reputation_xp: 0, approved_contributions_count: 0, earned_badges_json: '[]' };
            state.community_user_preferences.push(row);
          }
          row.membership_tier = b[1]; row.pro_granted_reason = b[2]; row.pro_granted_at = b[3]; row.earned_badges_json = b[4];
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT INTO candidate_governance/i.test(cleanSql)) {
          let g = state.candidate_governance.find(x => x.user_id === b[0]);
          if (!g) { g = { user_id: b[0], email: b[1] }; state.candidate_governance.push(g); }
          g.access_tier = b[2];
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT INTO candidate_assigned_items/i.test(cleanSql)) {
          state.candidate_assigned_items.push({ id: b[0], target_user_id: b[1], title_en: b[2] });
          return { success: true, meta: { changes: 1 } };
        }
        if (/^INSERT INTO community_reward_rules/i.test(cleanSql)) {
          state.community_reward_rules[0] = {
            ...state.community_reward_rules[0],
            auto_grant_enabled: b[0], pro_threshold_posts: b[1], permanent_threshold_posts: b[2],
            xp_per_approved_post: b[3], xp_per_best_answer: b[4]
          };
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      },
      async first() {
        const b = this._binds;
        if (/FROM community_taxonomy_nodes WHERE id = \?/i.test(cleanSql)) return state.community_taxonomy_nodes.find(x => x.id === b[0]) || null;
        if (/MAX\(sort_order\) AS m FROM community_taxonomy_nodes/i.test(cleanSql)) return { m: 0 };
        if (/FROM community_posts WHERE slug = \?/i.test(cleanSql)) return state.community_posts.find(x => x.slug === b[0]) || null;
        if (/FROM community_posts WHERE id = \?/i.test(cleanSql)) return state.community_posts.find(x => x.id === b[0]) || null;
        if (/FROM community_user_preferences WHERE user_id = \?/i.test(cleanSql)) return state.community_user_preferences.find(x => x.user_id === b[0]) || null;
        if (/FROM community_reward_rules/i.test(cleanSql)) return state.community_reward_rules[0];
        if (/FROM users WHERE id = \?/i.test(cleanSql)) return state.users.find(x => x.id === b[0]) || null;
        if (/COUNT\(DISTINCT user_id\) AS n FROM community_memberships/i.test(cleanSql)) return { n: state.community_memberships.length };
        if (/COUNT\(\*\) AS n FROM community_user_preferences/i.test(cleanSql)) return { n: state.community_user_preferences.filter(x => x.membership_tier === 'pro_member' || x.membership_tier === 'permanent_member').length };
        return null;
      },
      async all() {
        if (/FROM community_taxonomy_nodes WHERE is_published = 1/i.test(cleanSql)) return { results: state.community_taxonomy_nodes.filter(x => x.is_published) };
        if (/FROM community_taxonomy_nodes/i.test(cleanSql)) return { results: [...state.community_taxonomy_nodes] };
        if (/FROM community_posts WHERE moderation_status = 'published'/i.test(cleanSql)) return { results: state.community_posts.filter(x => x.moderation_status === 'published') };
        if (/FROM community_posts/i.test(cleanSql)) return { results: [...state.community_posts] };
        if (/FROM community_user_preferences/i.test(cleanSql)) return { results: [...state.community_user_preferences] };
        if (/FROM community_post_replies/i.test(cleanSql)) return { results: [...state.community_post_replies] };
        if (/FROM community_direct_messages/i.test(cleanSql)) return { results: [...state.community_direct_messages] };
        return { results: [] };
      }
    };
  }

  return {
    state,
    prepare: (sql) => makeStmt(sql),
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; }
  };
}

// 1. Migration 0141 check
await check('1. Migration 0141 creates all 8 tables, starter 3-layer Odisha Interest Circles, reward rules & starter posts', () => {
  const sql = read('migrations/0141_community_platform.sql');
  [
    'CREATE TABLE IF NOT EXISTS community_taxonomy_nodes',
    'CREATE TABLE IF NOT EXISTS community_memberships',
    'CREATE TABLE IF NOT EXISTS community_posts',
    'CREATE TABLE IF NOT EXISTS community_post_replies',
    'CREATE TABLE IF NOT EXISTS community_post_reactions',
    'CREATE TABLE IF NOT EXISTS community_direct_messages',
    'CREATE TABLE IF NOT EXISTS community_user_preferences',
    'CREATE TABLE IF NOT EXISTS community_reward_rules',
    'Exam Preparation Circles',
    '30 Odisha District Chapters',
    'Citizen Welfare & Scheme Helpdesk',
    'Pro & Permanent Contributors Lounge',
    'welcome-cs-odisha-community-pro-rewards',
    'poll-which-odisha-exam-study-pack-next',
    'daily-peer-quiz-odisha-gk-sprint-1'
  ].forEach(tok => assert.ok(sql.includes(tok), `Migration 0141 missing: ${tok}`));
});

// 2. End-to-End Zero-Stale-Cache & Rewards Lifecycle
await check('2. End-to-end 3-Layer Taxonomy, Zero-Stale-Cache (no-store + X-CSO-Cache-Purged), Preview Token, Promote to Study Library & Pro/Permanent Grant', async () => {
  const db = createMockD1();
  const env = { DB: db };
  const actor = { userId: 'adm-1', email: 'admin@csodisha.com', role: 'admin' };
  const req = (url, method = 'GET', body = null) => new Request('https://csodisha.com' + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });

  // Create 3-layer Community Circle -> Group -> Sub-Topic
  const rL1 = await handleCommunityTaxonomyAdmin(req('/api/admin/community/taxonomy', 'POST', { level: 1, title_en: 'Exam Circles', posting_policy: 'open_verified' }), env, actor);
  assert.equal(rL1.headers.get('X-CSO-Cache-Purged'), '1');
  const l1 = await rL1.json();
  const l2 = await (await handleCommunityTaxonomyAdmin(req('/api/admin/community/taxonomy', 'POST', { level: 2, parent_id: l1.node.id, title_en: 'OPSC OAS Circle' }), env, actor)).json();
  const l3 = await (await handleCommunityTaxonomyAdmin(req('/api/admin/community/taxonomy', 'POST', { level: 3, parent_id: l2.node.id, title_en: 'Memory Questions' }), env, actor)).json();
  assert.ok(l1.ok && l2.ok && l3.ok);

  // Public Tree returns Cache-Control: no-store, max-age=0
  const pubTreeRes = await handlePublicCommunityTreeApi(req('/api/public/community/tree'), env);
  assert.equal(pubTreeRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const pubTree = await pubTreeRes.json();
  assert.equal(pubTree.total_communities, 3);

  // Draft Spotlight -> Preview Token -> Authorized Preview
  const created = await (await handleCommunityPostsAdmin(req('/api/admin/community/posts', 'POST', {
    post_type: 'memory_question',
    category_l1_id: l1.node.id, category_l2_id: l2.node.id, category_l3_id: l3.node.id,
    title_en: 'OPSC OAS 2025 Shift-1 Memory Questions',
    body_en: '1. Highest peak of Odisha? 2. Paika Rebellion year?',
    moderation_status: 'pending_review'
  }), env, actor)).json();
  assert.equal(created.item.moderation_status, 'pending_review');

  const unauthDraft = await handlePublicCommunityPostDetailApi(req(`/api/public/community/post?slug=${created.item.slug}`), env);
  assert.equal(unauthDraft.status, 404);

  const prevTok = await (await handleCommunityPostsAdmin(req(`/api/admin/community/${created.item.id}/preview-token`, 'POST', {}), env, actor, created.item.id, 'preview-token')).json();
  const prevRes = await handlePublicCommunityPostDetailApi(req(`/api/public/community/post?slug=${created.item.slug}&preview_token=${prevTok.preview_token}`), env);
  assert.equal(prevRes.status, 200);
  assert.equal(prevRes.headers.get('Cache-Control'), 'no-store, max-age=0');

  // Approve & Publish Live -> Immediate reflection on Public Feed
  const pubPut = await handleCommunityPostsAdmin(req(`/api/admin/community/posts/${created.item.id}`, 'PUT', { moderation_status: 'published' }), env, actor, created.item.id);
  assert.equal(pubPut.headers.get('X-CSO-Cache-Purged'), '1');
  const feedRes = await handlePublicCommunityFeedApi(req('/api/public/community/posts'), env);
  assert.equal(feedRes.headers.get('Cache-Control'), 'no-store, max-age=0');
  const feed = await feedRes.json();
  assert.equal(feed.total, 1);

  // Promote Memory Question -> Study Library Draft
  const promRes = await handleCommunityPostsAdmin(req(`/api/admin/community/${created.item.id}/promote-study`, 'POST', {}), env, actor, created.item.id, 'promote-study');
  assert.equal(promRes.status, 201);
  assert.equal(db.state.study_articles.length, 1);

  // Grant Permanent Member -> Syncs candidate_governance + Assigned For You notification
  const grantRes = await handleCommunityGrantMembershipAdmin(req('/api/admin/community/grant-membership', 'POST', {
    user_id: 'cand-1',
    membership_tier: 'permanent_member',
    post_id: created.item.id,
    reason: 'Top OPSC memory-question contributor'
  }), env, actor);
  assert.equal(grantRes.headers.get('X-CSO-Cache-Purged'), '1');
  assert.equal(db.state.candidate_governance[0].access_tier, 'permanent_member');
  assert.equal(db.state.candidate_assigned_items.length, 1);
  assert.ok(db.state.candidate_assigned_items[0].title_en.includes('Permanent Founding Member'));

  // Update Reward Rules
  const ruleRes = await handleCommunityRewardRulesAdmin(req('/api/admin/community/reward-rules', 'PUT', {
    auto_grant_enabled: 1, pro_threshold_posts: 2, permanent_threshold_posts: 8, xp_per_approved_post: 50, xp_per_best_answer: 60
  }), env, actor);
  assert.equal(ruleRes.headers.get('X-CSO-Cache-Purged'), '1');
  const ruleJson = await ruleRes.json();
  assert.equal(ruleJson.rules.pro_threshold_posts, 2);

  // Moderation Queue loads cleanly
  const modRes = await handleCommunityModerationAdmin(req('/api/admin/community/moderation'), env, actor);
  assert.equal(modRes.status, 200);
});

// 3. Full Wiring Verification
await check('3. Admin Studio (5 Tabs), Public Community Portal, Candidate Hub & Homepage wiring verified', () => {
  assert.ok(read('admin/index.html').includes('community-publishing-studio.js?v=20261124v252'));
  assert.ok(read('admin/admin.js').includes('CSOCommunityPublishingStudio') && read('admin/admin.js').includes('openCommunityPublishingTab'));
  assert.ok(read('admin/command-suite.js').includes('Community Studio') && read('admin/command-suite.js').includes('community_posts'));
  assert.ok(read('admin/candidate-hub-studio.js').includes('pro_member') && read('admin/candidate-hub-studio.js').includes('permanent_member'));
  assert.ok(read('functions/api/admin/_router.js').includes("case 'community':") && read('functions/api/admin/_router.js').includes('handleCommunityGrantMembershipAdmin'));
  assert.ok(read('_worker.js').includes('/api/public/community/tree') && read('_worker.js').includes('/api/community/messages') && read('_worker.js').includes('/api/community/join'));
  assert.ok(read('functions/_lib/edge-cache-invalidator.js').includes('/api/public/community/posts'));
  assert.ok(read('functions/api/media/_serve.js').includes('community-publishing'));
  assert.ok(read('community/index.html').includes('id="cso-community-portal-root"') && read('community/index.html').includes('community-portal.js?v=20261124v252'));
  assert.ok(read('assets/js/community-portal.js').includes('DiscussionForumPosting') && read('assets/js/community-portal.js').includes('Path to Pro'));
  assert.ok(read('assets/js/student-dashboard.js').includes('communityProfile') && read('assets/js/student-dashboard.js').includes('Community Tier'));
  assert.ok(read('assets/app.js').includes('/api/public/community/posts?limit=8') && read('assets/app.js').includes('csoMapCommunityPostsToUpdates'));
});

// 4. Strict CSP Compliance + Service Worker v252
await check('4. Strict CSP compliance across all v252 files + sw.js & ops-sentinel.js bumped to cso-candidate-cache-v252', () => {
  const badSinkRe = /\.(?:innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(|\.style\.[a-zA-Z]+\s*=/;
  for (const rel of ['admin/community-publishing-studio.js', 'assets/js/community-portal.js', 'assets/js/student-dashboard.js']) {
    assert.ok(!badSinkRe.test(read(rel)), `CSP violation found in ${rel}`);
  }
  for (const rel of ['community/index.html', 'admin/index.html', 'student-dashboard/index.html']) {
    const html = read(rel);
    assert.ok(!/\son(?:click|change|input|submit|load|error)=/i.test(html), `Inline handler found in ${rel}`);
    assert.ok(!/\sstyle="/i.test(html), `Inline style attribute found in ${rel}`);
  }
  const sw = read('sw.js');
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v25[2-9]';/.test(sw), 'sw.js must be bumped to v252+');
  assert.ok(sw.includes("'/assets/js/community-portal.js'") && sw.includes("'/assets/css/community-portal.css'"));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v25[2-9]';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
