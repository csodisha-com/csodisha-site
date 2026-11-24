-- v252: Community, Interest Circles, Public Content Sharing, Peer Q&A, Direct Messaging & Pro/Permanent Contributor Reward Platform
-- Creates 3-layer Communities of Interest, memberships, public/editorial posts, threaded replies,
-- unique reactions/votes/quiz scores, direct messages & study buddy requests, progressive trust &
-- Pro/Permanent membership preferences, and automated reward rules.

CREATE TABLE IF NOT EXISTS community_taxonomy_nodes (
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
);

CREATE INDEX IF NOT EXISTS idx_comm_tax_level_parent ON community_taxonomy_nodes(level, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_comm_tax_slug ON community_taxonomy_nodes(slug);

CREATE TABLE IF NOT EXISTS community_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_mem_user ON community_memberships(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_mem_node ON community_memberships(node_id);

CREATE TABLE IF NOT EXISTS community_posts (
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
);

CREATE INDEX IF NOT EXISTS idx_comm_posts_mod_cats ON community_posts(moderation_status, category_l1_id, category_l2_id, category_l3_id);
CREATE INDEX IF NOT EXISTS idx_comm_posts_type ON community_posts(moderation_status, post_type, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_posts_author ON community_posts(author_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_replies (
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
);

CREATE INDEX IF NOT EXISTS idx_comm_replies_post ON community_post_replies(post_id, is_best_answer DESC, is_verified_answer DESC, upvotes_count DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS community_post_reactions (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  score_value REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(target_type, target_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_comm_react_user ON community_post_reactions(user_id, target_type, reaction_type);
CREATE INDEX IF NOT EXISTS idx_comm_react_target ON community_post_reactions(target_type, target_id, reaction_type);

CREATE TABLE IF NOT EXISTS community_direct_messages (
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
);

CREATE INDEX IF NOT EXISTS idx_comm_dm_thread ON community_direct_messages(thread_key, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comm_dm_recipient ON community_direct_messages(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_dm_flagged ON community_direct_messages(is_flagged, created_at DESC);

CREATE TABLE IF NOT EXISTS community_user_preferences (
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
);

CREATE INDEX IF NOT EXISTS idx_comm_prefs_tier_xp ON community_user_preferences(membership_tier, reputation_xp DESC);

CREATE TABLE IF NOT EXISTS community_reward_rules (
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
);

-- ============================================================================
-- SEED STARTER REWARD RULES
-- ============================================================================
INSERT OR IGNORE INTO community_reward_rules (
  id, auto_grant_enabled, pro_threshold_posts, permanent_threshold_posts,
  xp_per_approved_post, xp_per_best_answer
) VALUES (
  'default', 1, 3, 10, 40, 50
);

-- ============================================================================
-- SEED STARTER 3-LAYER COMMUNITIES OF INTEREST (IDEMPOTENT)
-- ============================================================================

-- Level 1: Community Circle / Domain
INSERT OR IGNORE INTO community_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, posting_policy, members_count, sort_order, is_published) VALUES
  ('ctax_l1_exam_circles', 1, NULL, 'exam-preparation-circles', 'Exam Preparation Circles', 'ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି ମଣ୍ଡଳୀ', 'Peer Q&A, shared notes, memory questions & answer key watch', 'ପରୀକ୍ଷା ନୋଟ୍ସ, ପ୍ରଶ୍ନୋତ୍ତର ଓ ଉତ୍ତର କୁଞ୍ଜିକା', '🎯', 'emerald', 'open_verified', 124, 10, 1),
  ('ctax_l1_districts', 1, NULL, 'odisha-district-chapters', '30 Odisha District Chapters', 'ଓଡ଼ିଶାର ୩୦ ଜିଲ୍ଲା ଅଧ୍ୟାୟ', 'Local study groups, exam center radar & travel buddies', 'ଜିଲ୍ଲାସ୍ତରୀୟ ଅଧ୍ୟୟନ ଦଳ ଓ ପରୀକ୍ଷା କେନ୍ଦ୍ର ସହାୟତା', '🗺️', 'cobalt', 'open_verified', 96, 20, 1),
  ('ctax_l1_welfare', 1, NULL, 'citizen-welfare-helpdesk', 'Citizen Welfare & Scheme Helpdesk', 'ସରକାରୀ ଯୋଜନା ଓ ନାଗରିକ ସହାୟତା', 'Subhadra, CM-KISAN, Scholarship DBT & NPCI peer playbooks', 'ସୁଭଦ୍ରା, ସିଏମ୍-କିଷାନ ଓ ବୃତ୍ତି ସହାୟତା', '🏛️', 'amber', 'open_verified', 82, 30, 1),
  ('ctax_l1_toppers', 1, NULL, 'topper-spotlights-stories', 'Topper Spotlights & Success Stories', 'ଟପର୍ କାହାଣୀ ଓ ସଫଳତା ଅନୁଭୂତି', 'Strategy interviews, booklists & Odisha rank-holder guidance', 'ସଫଳ ପ୍ରାର୍ଥୀଙ୍କ ରଣନୀତି ଓ ମାର୍ଗଦର୍ଶନ', '🏆', 'violet', 'pre_moderated', 64, 40, 1),
  ('ctax_l1_pods', 1, NULL, 'study-pods-reading-rooms', 'Study Pods & Reading Rooms', 'ଅଧ୍ୟୟନ ପଡ୍ ଓ ପଠନ କକ୍ଷ', 'Daily accountability check-ins, focus timers & peer buddies', 'ଦୈନିକ ଅଧ୍ୟୟନ ଲକ୍ଷ୍ୟ ଓ ସାଥୀ ସନ୍ଧାନ', '📚', 'teal', 'open_verified', 71, 50, 1),
  ('ctax_l1_pro_lounge', 1, NULL, 'pro-permanent-contributors-lounge', 'Pro & Permanent Contributors Lounge', 'ପ୍ରୋ ଓ ସ୍ଥାୟୀ ସଦସ୍ୟ ଲାଉଞ୍ଜ', 'Exclusive circle for CS Odisha Pro ⭐ & Permanent 👑 Members', 'ପ୍ରୋ ଓ ସ୍ଥାୟୀ ଯୋଗଦାନକାରୀଙ୍କ ବିଶେଷ ମଞ୍ଚ', '👑', 'rose', 'pro_only', 18, 60, 1);

-- Level 2: Community of Interest / Group
INSERT OR IGNORE INTO community_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, posting_policy, members_count, sort_order, is_published) VALUES
  ('ctax_l2_opsc_oas', 2, 'ctax_l1_exam_circles', 'opsc-oas-civil-services', 'OPSC OAS & Civil Services', 'OPSC OAS ଓ ପ୍ରଶାସନିକ ସେବା', 'Prelims GS, Mains answer writing & Optional peer reviews', 'ପ୍ରିଲିମ୍ସ, ମେନ୍ସ ଉତ୍ତର ଲେଖା ଓ ଅପ୍ସନାଲ୍', '🏛️', 'emerald', 'open_verified', 58, 10, 1),
  ('ctax_l2_ossc_osssc', 2, 'ctax_l1_exam_circles', 'ossc-osssc-combined', 'OSSC & OSSSC Combined', 'OSSC ଓ OSSSC ମିଳିତ ପରୀକ୍ଷା', 'CGL, RI, ARI, Amin, PEO & Forest Guard aspirant circle', 'CGL, RI, ARI, PEO ପରୀକ୍ଷାର୍ଥୀ ଦଳ', '📋', 'cobalt', 'open_verified', 67, 20, 1),
  ('ctax_l2_teaching_tet', 2, 'ctax_l1_exam_circles', 'teaching-tet-oavs', 'Teaching & TET (OTET / OSSTET / OAVS)', 'ଶିକ୍ଷକ ନିଯୁକ୍ତି (OTET / OSSTET / OAVS)', 'Pedagogy discussions, B.Ed notes & teacher recruitment help', 'ଶିକ୍ଷାଦାନ ବିଜ୍ଞାନ ଓ ଶିକ୍ଷକ ନିଯୁକ୍ତି', '🎓', 'violet', 'open_verified', 44, 30, 1),
  ('ctax_l2_khordha', 2, 'ctax_l1_districts', 'khordha-bhubaneswar', 'Khordha & Bhubaneswar', 'ଖୋର୍ଦ୍ଧା ଓ ଭୁବନେଶ୍ୱର', 'Capital region libraries, exam centers & study meetups', 'ଭୁବନେଶ୍ୱର ପାଠାଗାର ଓ ପରୀକ୍ଷା କେନ୍ଦ୍ର', '🏙️', 'cobalt', 'open_verified', 49, 10, 1),
  ('ctax_l2_cuttack', 2, 'ctax_l1_districts', 'cuttack', 'Cuttack', 'କଟକ', 'OPSC headquarters updates, Cuttack centers & study circles', 'କଟକ ପରୀକ୍ଷା କେନ୍ଦ୍ର ଓ ଅଧ୍ୟୟନ ଦଳ', '🌉', 'emerald', 'open_verified', 35, 20, 1),
  ('ctax_l2_balasore', 2, 'ctax_l1_districts', 'balasore', 'Balasore', 'ବାଲେଶ୍ୱର', 'North Odisha aspirants, exam center tips & travel buddies', 'ଉତ୍ତର ଓଡ଼ିଶା ପ୍ରାର୍ଥୀ ମଣ୍ଡଳୀ', '🌊', 'teal', 'open_verified', 28, 30, 1),
  ('ctax_l2_ganjam', 2, 'ctax_l1_districts', 'ganjam', 'Ganjam', 'ଗଞ୍ଜାମ', 'Berhampur & South Odisha study pods and exam travel', 'ବ୍ରହ୍ମପୁର ଓ ଗଞ୍ଜାମ ଅଧ୍ୟୟନ ଦଳ', '🌴', 'amber', 'open_verified', 31, 40, 1),
  ('ctax_l2_sambalpur', 2, 'ctax_l1_districts', 'sambalpur', 'Sambalpur', 'ସମ୍ବଲପୁର', 'Western Odisha aspirant chapter & coaching library tips', 'ପଶ୍ଚିମ ଓଡ଼ିଶା ପ୍ରାର୍ଥୀ ଅଧ୍ୟାୟ', '⛰️', 'indigo', 'open_verified', 26, 50, 1),
  ('ctax_l2_dbt_help', 2, 'ctax_l1_welfare', 'scholarship-dbt-peer-help', 'Scholarship & DBT Peer Help', 'ବୃତ୍ତି ଓ DBT ସହାୟତା', 'NPCI Aadhaar seeding, OTR errors & income/resident guides', 'NPCI ସିଡିଂ ଓ ଛାତ୍ରବୃତ୍ତି ସମାଧାନ', '💳', 'amber', 'open_verified', 52, 10, 1),
  ('ctax_l2_topper_ama', 2, 'ctax_l1_toppers', 'odisha-rankholders-ama', 'Odisha Rank-Holders & Strategy AMAs', 'ଓଡ଼ିଶା ଟପର୍ ରଣନୀତି', 'Verified rank-holder essays, study timetables & booklists', 'ଟପର୍ ରଣନୀତି ଓ ପୁସ୍ତକ ତାଲିକା', '🌟', 'violet', 'pre_moderated', 41, 10, 1),
  ('ctax_l2_daily_pods', 2, 'ctax_l1_pods', 'daily-accountability-pods', 'Daily Study Accountability Pods', 'ଦୈନିକ ଅଧ୍ୟୟନ ପଡ୍', 'Log daily study hours, targets & find a study partner', 'ଦୈନିକ ପାଠପଢ଼ା ଲକ୍ଷ୍ୟ ଓ ସାଥୀ', '⏱️', 'teal', 'open_verified', 47, 10, 1),
  ('ctax_l2_pro_mentors', 2, 'ctax_l1_pro_lounge', 'pro-contributors-council', 'Pro & Permanent Mentors Council', 'ପ୍ରୋ ଓ ସ୍ଥାୟୀ ମେଣ୍ଟର ପରିଷଦ', 'Co-author Odisha study packs, verify answers & mentor peers', 'ଅଧ୍ୟୟନ ସାମଗ୍ରୀ ଓ ଉତ୍ତର ଯାଞ୍ଚ ପରିଷଦ', '⭐', 'rose', 'pro_only', 18, 10, 1);

-- Level 3: Sub-Topic / Discussion Format
INSERT OR IGNORE INTO community_taxonomy_nodes (id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, posting_policy, members_count, sort_order, is_published) VALUES
  ('ctax_l3_opsc_qa', 3, 'ctax_l2_opsc_oas', 'ask-question-peer-qa', 'Ask a Question / Peer Q&A', 'ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ / ସହପାଠୀ ଉତ୍ତର', 'Post exam doubts with optional +25 XP bounty', 'ସନ୍ଦେହ ପଚାରନ୍ତୁ ଓ ଉତ୍ତର ପାଆନ୍ତୁ', '❓', 'emerald', 'open_verified', 42, 10, 1),
  ('ctax_l3_opsc_notes', 3, 'ctax_l2_opsc_oas', 'share-study-notes-mindmaps', 'Share Study Notes & Mind Maps', 'ଅଧ୍ୟୟନ ନୋଟ୍ସ ଓ ମାଇଣ୍ଡ ମ୍ୟାପ୍', 'Upload handwritten PDFs, charts & summary sheets to earn Pro XP', 'ନିଜର ନୋଟ୍ସ ଓ ପିଡିଏଫ୍ ସେୟାର କରନ୍ତୁ', '📝', 'cobalt', 'open_verified', 39, 20, 1),
  ('ctax_l3_opsc_memory', 3, 'ctax_l2_opsc_oas', 'memory-based-exam-questions', 'Memory-Based Exam Questions', 'ସ୍ମୃତି ଆଧାରିତ ପରୀକ୍ଷା ପ୍ରଶ୍ନ', 'Share shift-wise questions right after the exam hall', 'ପରୀକ୍ଷା ପରେ ସ୍ମୃତି ଆଧାରିତ ପ୍ରଶ୍ନ', '🧠', 'violet', 'open_verified', 34, 30, 1),
  ('ctax_l3_opsc_obj', 3, 'ctax_l2_opsc_oas', 'answer-key-objection-watch', 'Answer Key Objection & Proof Watch', 'ଉତ୍ତର କୁଞ୍ଜିକା ଆପତ୍ତି ଓ ପ୍ରମାଣ', 'Collaborate on NCERT/SCERT documentary proofs for OPSC/OSSC keys', 'ସଠିକ୍ ପ୍ରମାଣ ସହିତ ଉତ୍ତର ଯାଞ୍ଚ', '⚖️', 'amber', 'open_verified', 29, 40, 1),
  ('ctax_l3_ossc_quiz', 3, 'ctax_l2_ossc_osssc', 'peer-quiz-challenge-poll', 'Peer Quiz Challenge / Poll', 'ଦୈନିକ କୁଇଜ୍ ଚ୍ୟାଲେଞ୍ଜ ଓ ପୋଲ୍', 'Timed 5-question peer quizzes & Odisha exam polls', '୫-ପ୍ରଶ୍ନ କୁଇଜ୍ ଚ୍ୟାଲେଞ୍ଜ ଓ ଭୋଟିଂ', '⚡', 'rose', 'open_verified', 51, 10, 1),
  ('ctax_l3_khordha_radar', 3, 'ctax_l2_khordha', 'exam-day-center-radar', 'Exam-Day Center Radar & Travel Buddy', 'ପରୀକ୍ଷା କେନ୍ଦ୍ର ସୂଚନା ଓ ଯାତ୍ରା ସାଥୀ', 'Share center locations, bus routes, stay tips & travel buddies', 'ପରୀକ୍ଷା କେନ୍ଦ୍ର ଓ ଯାତ୍ରା ସାଥୀ', '🚌', 'cobalt', 'open_verified', 37, 10, 1),
  ('ctax_l3_dbt_playbook', 3, 'ctax_l2_dbt_help', 'scheme-resolution-playbook', 'Scheme Resolution Playbook', 'ଯୋଜନା ସମସ୍ୟା ସମାଧାନ ଗାଇଡ୍', 'Step-by-step fixes for NPCI DBT, KYC & verification delays', 'DBT ଓ ଆବେଦନ ସମସ୍ୟାର ସମାଧାନ', '🛠️', 'amber', 'open_verified', 44, 10, 1),
  ('ctax_l3_pods_checkin', 3, 'ctax_l2_daily_pods', 'daily-study-checkin-pod', 'Daily Study Check-In & Pod', 'ଦୈନିକ ଅଧ୍ୟୟନ ଚେକ୍-ଇନ୍', 'Share today''s target, hours studied & stay accountable', 'ଆଜିର ପାଠପଢ଼ା ଲକ୍ଷ୍ୟ ଲେଖନ୍ତୁ', '✅', 'teal', 'open_verified', 43, 10, 1);

-- ============================================================================
-- SEED STARTER EDITORIAL SPOTLIGHT, LIVE POLL & DAILY QUIZ CHALLENGE
-- ============================================================================
INSERT OR IGNORE INTO community_posts (
  id, slug, author_user_id, author_display_name, author_badge, author_membership_tier,
  is_official_spotlight, category_l1_id, category_l2_id, category_l3_id, post_type,
  district_tag, exam_tag, title_en, title_or, body_en, body_or,
  upvotes_count, replies_count, is_pinned, is_featured_collection, moderation_status
) VALUES (
  'cpost_welcome_spotlight',
  'welcome-cs-odisha-community-pro-rewards',
  'system-editorial',
  'CS Odisha Editorial Desk',
  'Official Spotlight',
  'permanent_member',
  1,
  'ctax_l1_exam_circles',
  'ctax_l2_opsc_oas',
  'ctax_l3_opsc_notes',
  'editorial_spotlight',
  'All Odisha',
  'OPSC / OSSC / OSSSC',
  'Welcome to CS Odisha Community Circles — Share Notes & Earn Free Pro / Permanent Membership!',
  'CS ଓଡ଼ିଶା କମ୍ୟୁନିଟିକୁ ସ୍ୱାଗତ — ନୋଟ୍ସ ସେୟାର କରନ୍ତୁ ଓ ମାଗଣା ପ୍ରୋ / ସ୍ଥାୟୀ ସଦସ୍ୟତା ପାଆନ୍ତୁ!',
  '## How Our Community Helps Every Odisha Aspirant\n- Join your **Exam Circle** (OPSC OAS, OSSC/OSSSC, TET) and your **Odisha District Chapter**.\n- Share handwritten **Study Notes PDFs**, **Memory-Based Exam Questions**, **Answer Key Proofs**, or **Scheme Resolution Playbooks**.\n- Every **3 approved helpful contributions** automatically unlock **CS Odisha Pro Member ⭐** (instant publishing + Pro Lounge + Candidate Hub perks), and **10 approved contributions** unlock **Permanent Founding Member 👑**!',
  '## ଆମ କମ୍ୟୁନିଟି କିପରି ଓଡ଼ିଶା ପ୍ରାର୍ଥୀଙ୍କୁ ସାହାଯ୍ୟ କରେ\n- ଆପଣଙ୍କର **ପରୀକ୍ଷା ମଣ୍ଡଳୀ** ଏବଂ **ଜିଲ୍ଲା ଅଧ୍ୟାୟ** ରେ ଯୋଗ ଦିଅନ୍ତୁ।\n- **ଅଧ୍ୟୟନ ନୋଟ୍ସ**, **ସ୍ମୃତି ଆଧାରିତ ପ୍ରଶ୍ନ** କିମ୍ବା **ଯୋଜନା ସମାଧାନ ଗାଇଡ୍** ସେୟାର କରନ୍ତୁ।\n- **୩ଟି ଅନୁମୋଦିତ ଯୋଗଦାନ** ରେ **ପ୍ରୋ ମେମ୍ବର ⭐** ଏବଂ **୧୦ଟି ଯୋଗଦାନ** ରେ **ସ୍ଥାୟୀ ସଦସ୍ୟ 👑** ପଦବୀ ଲାଭ କରନ୍ତୁ!',
  24, 0, 1, 1, 'published'
);

INSERT OR IGNORE INTO community_posts (
  id, slug, author_user_id, author_display_name, author_badge, author_membership_tier,
  is_official_spotlight, category_l1_id, category_l2_id, category_l3_id, post_type,
  district_tag, exam_tag, title_en, title_or, body_en, poll_options_json, poll_votes_json,
  upvotes_count, is_pinned, moderation_status
) VALUES (
  'cpost_odisha_exam_poll',
  'poll-which-odisha-exam-study-pack-next',
  'system-editorial',
  'CS Odisha Editorial Desk',
  'Live Poll',
  'permanent_member',
  1,
  'ctax_l1_exam_circles',
  'ctax_l2_ossc_osssc',
  'ctax_l3_ossc_quiz',
  'poll',
  'All Odisha',
  'OSSC / OSSSC / OPSC',
  'Community Poll: Which High-Yield Odisha Revision Pack should we publish next?',
  'କମ୍ୟୁନିଟି ପୋଲ୍: ଆଗାମୀ କେଉଁ ଓଡ଼ିଶା ପରୀକ୍ଷା ରିଭିଜନ୍ ପ୍ୟାକ୍ ପ୍ରକାଶ କରାଯାଉ?',
  'Vote for the next bilingual A4 revision sheet & solved PYQ bundle you want from our editors and Pro Mentors.',
  '["OPSC OAS Odisha History & Culture 500 One-Liners","OSSC CGL Quantitative & DI Formula Pack","OSSSC RI/ARI/Amin Computer + Odia Grammar Drill","OTET / OSSTET Child Pedagogy Complete Capsule"]',
  '{"0":14,"1":19,"2":16,"3":9}',
  18, 0, 'published'
);

INSERT OR IGNORE INTO community_posts (
  id, slug, author_user_id, author_display_name, author_badge, author_membership_tier,
  is_official_spotlight, category_l1_id, category_l2_id, category_l3_id, post_type,
  district_tag, exam_tag, title_en, title_or, body_en, challenge_mcqs_json,
  upvotes_count, is_featured_collection, moderation_status
) VALUES (
  'cpost_daily_quiz_odisha_gk',
  'daily-peer-quiz-odisha-gk-sprint-1',
  'system-editorial',
  'CS Odisha Editorial Desk',
  'Daily Quiz Challenge',
  'permanent_member',
  1,
  'ctax_l1_exam_circles',
  'ctax_l2_ossc_osssc',
  'ctax_l3_ossc_quiz',
  'quiz_challenge',
  'All Odisha',
  'Odisha GK',
  'Daily 5-Question Peer Quiz Challenge: Odisha Geography, History & Polity Sprint',
  'ଦୈନିକ ୫-ପ୍ରଶ୍ନ କୁଇଜ୍ ଚ୍ୟାଲେଞ୍ଜ: ଓଡ଼ିଶା ଭୂଗୋଳ, ଇତିହାସ ଓ ସମ୍ବିଧାନ',
  'Test your Odisha GK accuracy in 3 minutes and earn Reputation XP on the Community Leaderboard!',
  '[{"id":"cq1","question_en":"Which is the highest mountain peak of Odisha?","options":["Mahendragiri","Deomali","Malayagiri","Gandhamardan"],"correct_index":1,"explanation_en":"Deomali (1,672 m) in Koraput district is the highest peak in Odisha."},{"id":"cq2","question_en":"In which year was the historic Paika Rebellion fought in Khordha?","options":["1803","1817","1857","1866"],"correct_index":1,"explanation_en":"Led by Bakshi Jagabandhu Bidyadhar in March 1817."},{"id":"cq3","question_en":"Utkala Dibasa celebrates the formation of Odisha as a separate province on:","options":["1 April 1936","15 August 1947","26 January 1950","1 November 1956"],"correct_index":0,"explanation_en":"Odisha became India''s first linguistic province on 1 April 1936."},{"id":"cq4","question_en":"Which river is known as the lifeline of Odisha and flows past Hirakud Dam?","options":["Brahmani","Baitarani","Mahanadi","Subarnarekha"],"correct_index":2,"explanation_en":"The Mahanadi river feeds the Hirakud Dam in Sambalpur district."},{"id":"cq5","question_en":"How many administrative districts does Odisha currently have?","options":["24","28","30","32"],"correct_index":2,"explanation_en":"Odisha comprises 30 administrative districts and 314 blocks."}]',
  21, 1, 'published'
);
