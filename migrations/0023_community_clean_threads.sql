-- v292: Clean Up Legacy Starter Threads & Map to the 4 Active Community Channels (Idempotent)
-- Ensures all starter threads map cleanly to the 4 canonical L1 channels:
--   1. comm_l1_exam_career_qa       (exam-career-qa)
--   2. comm_l1_schemes_citizen_help (schemes-citizen-help)
--   3. comm_l1_study_groups_notes   (study-groups-notes)
--   4. comm_l1_success_stories      (success-stories-mentorship)
-- Removes outdated "Free Pro / Permanent Membership" promotional wording from starter threads.

-- 1. Clean up Welcome Spotlight thread and map to Exam & Career Q&A
UPDATE community_posts
SET
  category_l1_id = 'comm_l1_exam_career_qa',
  author_badge = 'Official Guide',
  title_en = 'Welcome to CS Odisha Community — Exam Doubts, Scheme Help & Peer Study Circles',
  title_or = 'CS ଓଡ଼ିଶା କମ୍ୟୁନିଟିକୁ ସ୍ୱାଗତ — ପରୀକ୍ଷା ସନ୍ଦେହ, ଯୋଜନା ସହାୟତା ଓ ଅଧ୍ୟୟନ ଦଳ',
  body_en = 'Ask verified doubts on OPSC, OSSC, OSSSC, UPSC, Banking, and Teaching exams, troubleshoot Odisha welfare scheme applications (Subhadra, CM-KISAN, Scholarships), share concise study notes, and learn directly from selected mentors across all 30 districts of Odisha.',
  body_or = 'OPSC, OSSC, OSSSC, UPSC, ବ୍ୟାଙ୍କିଂ ଓ ଶିକ୍ଷକ ପରୀକ୍ଷା ସନ୍ଦେହ ପଚାରନ୍ତୁ, ଓଡ଼ିଶା ସରକାରୀ ଯୋଜନା (ସୁଭଦ୍ରା, ସିଏମ୍-କିଷାନ, ଛାତ୍ରବୃତ୍ତି) ଆବେଦନ ସହାୟତା ପାଆନ୍ତୁ, ଅଧ୍ୟୟନ ନୋଟ୍ସ ସେୟାର କରନ୍ତୁ ଏବଂ ସଫଳ ମେଣ୍ଟରଙ୍କଠାରୁ ମାର୍ଗଦର୍ଶନ ନିଅନ୍ତୁ।',
  updated_at = datetime('now')
WHERE id = 'cpost_welcome_spotlight'
   OR slug = 'welcome-cs-odisha-community-pro-rewards';

-- 2. Map starter Poll to Study Groups & Peer Notes and remove promotional phrasing
UPDATE community_posts
SET
  category_l1_id = 'comm_l1_study_groups_notes',
  body_en = 'Vote for the next bilingual A4 revision sheet and solved previous-year question pack you want published in the Study Library.',
  body_or = 'ଷ୍ଟଡି ଲାଇବ୍ରେରୀରେ ପ୍ରକାଶିତ ହେବାକୁ ଥିବା ଆଗାମୀ ଦ୍ୱିଭାଷୀ ରିଭିଜନ୍ ସିଟ୍ ଓ ସମାଧାନ ହୋଇଥିବା PYQ ପ୍ୟାକ୍ ପାଇଁ ଭୋଟ୍ ଦିଅନ୍ତୁ।',
  updated_at = datetime('now')
WHERE id = 'cpost_odisha_exam_poll'
   OR slug = 'poll-which-odisha-exam-study-pack-next';

-- 3. Map Daily Odisha GK Quiz Challenge to Exam & Career Q&A
UPDATE community_posts
SET
  category_l1_id = 'comm_l1_exam_career_qa',
  body_en = 'Test your Odisha Geography, History, and Polity accuracy with 5 quick MCQs curated for OPSC, OSSC, and OSSSC aspirants.',
  body_or = 'OPSC, OSSC ଓ OSSSC ପରୀକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ ପ୍ରସ୍ତୁତ ୫ଟି ଓଡ଼ିଶା ଭୂଗୋଳ, ଇତିହାସ ଓ ସମ୍ବିଧାନ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେଇ ନିଜର ପ୍ରସ୍ତୁତି ଯାଞ୍ଚ କରନ୍ତୁ।',
  updated_at = datetime('now')
WHERE id = 'cpost_daily_quiz_odisha_gk'
   OR slug = 'daily-peer-quiz-odisha-gk-sprint-1';

-- 4. Remap any remaining posts referencing retired legacy L1 channel IDs onto the 4 active channels
UPDATE community_posts
SET category_l1_id = 'comm_l1_exam_career_qa', updated_at = datetime('now')
WHERE category_l1_id IN ('ctax_l1_exam_circles', 'ctax_l1_districts', '');

UPDATE community_posts
SET category_l1_id = 'comm_l1_schemes_citizen_help', updated_at = datetime('now')
WHERE category_l1_id = 'ctax_l1_welfare';

UPDATE community_posts
SET category_l1_id = 'comm_l1_study_groups_notes', updated_at = datetime('now')
WHERE category_l1_id = 'ctax_l1_pods';

UPDATE community_posts
SET category_l1_id = 'comm_l1_success_stories', updated_at = datetime('now')
WHERE category_l1_id IN ('ctax_l1_toppers', 'ctax_l1_pro_lounge');

-- 5. Seed clean starter discussions for Schemes & Citizen Help and Success Stories & Mentorship (Idempotent)
INSERT OR IGNORE INTO community_posts (
  id, slug, author_user_id, author_display_name, author_badge, author_membership_tier,
  is_official_spotlight, category_l1_id, category_l2_id, category_l3_id, post_type,
  district_tag, exam_tag, title_en, title_or, body_en, body_or,
  upvotes_count, replies_count, is_pinned, is_solved, moderation_status
) VALUES (
  'cpost_scheme_dbt_help_guide',
  'subhadra-cm-kisan-dbt-npci-aadhaar-seeding-checklist',
  'system-editorial',
  'CS Odisha Editorial Desk',
  'Verified Guide',
  'standard',
  1,
  'comm_l1_schemes_citizen_help',
  '',
  '',
  'scheme_playbook',
  'All Odisha',
  'Odisha Schemes',
  'Subhadra Yojana & CM-KISAN DBT: Step-by-Step NPCI Aadhaar Seeding & e-KYC Fix',
  'ସୁଭଦ୍ରା ଯୋଜନା ଓ ସିଏମ୍-କିଷାନ DBT: NPCI ଆଧାର ସିଡିଂ ଓ e-KYC ସମାଧାନ ଗାଇଡ୍',
  'Facing pending DBT instalments or Aadhaar-bank mismatch on Subhadra Yojana, CM-KISAN, or State Scholarship Portal? Check your NPCI mapper status, complete e-KYC at your nearest CSC/Mo Seba Kendra, and verify single-holder savings account seeding before re-checking status.',
  'ସୁଭଦ୍ରା ଯୋଜନା, ସିଏମ୍-କିଷାନ କିମ୍ବା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲରେ DBT କିସ୍ତି ଅଟକି ରହିଛି କି? ନିଜ ବ୍ୟାଙ୍କରେ NPCI ଆଧାର ସିଡିଂ ଯାଞ୍ଚ କରନ୍ତୁ, ନିକଟସ୍ଥ ମୋ ସେବା କେନ୍ଦ୍ରରେ e-KYC ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ ଏବଂ ବ୍ୟାଙ୍କ ଖାତା ବିବରଣୀ ମିଳାନ୍ତୁ।',
  19, 2, 0, 1, 'published'
);

INSERT OR IGNORE INTO community_posts (
  id, slug, author_user_id, author_display_name, author_badge, author_membership_tier,
  is_official_spotlight, category_l1_id, category_l2_id, category_l3_id, post_type,
  district_tag, exam_tag, title_en, title_or, body_en, body_or,
  upvotes_count, replies_count, is_pinned, is_solved, moderation_status
) VALUES (
  'cpost_opsc_mentorship_strategy',
  'opsc-oas-ossc-cgl-6-month-study-strategy-mentorship',
  'system-editorial',
  'CS Odisha Mentors',
  'Mentor Note',
  'standard',
  1,
  'comm_l1_success_stories',
  '',
  '',
  'editorial_spotlight',
  'All Odisha',
  'OPSC OAS / OSSC CGL',
  'OPSC OAS & OSSC CGL: Practical 6-Month Prelims-to-Mains Preparation Roadmap',
  'OPSC OAS ଓ OSSC CGL: ୬ ମାସର ପ୍ରିଲିମ୍ସରୁ ମେନ୍ସ ପ୍ରସ୍ତୁତି ରଣନୀତି ଓ ମାର୍ଗଦର୍ଶନ',
  'Selected Odisha civil service and combined exam candidates share how to balance NCERT fundamentals, Odisha-specific Geography and History, weekly answer writing, and previous-year paper revision without burnout.',
  'ସଫଳ ଓଡ଼ିଶା ପ୍ରଶାସନିକ ଓ ମିଳିତ ପରୀକ୍ଷା ପ୍ରାର୍ଥୀମାନେ NCERT ମୂଳଭିତ୍ତି, ଓଡ଼ିଶା ଭୂଗୋଳ ଓ ଇତିହାସ, ସାପ୍ତାହିକ ଉତ୍ତର ଲେଖା ଏବଂ ପୂର୍ବବର୍ଷ ପ୍ରଶ୍ନପତ୍ର ରିଭିଜନ୍ କରିବାର ସହଜ ରଣନୀତି ସେୟାର କରିଛନ୍ତି।',
  15, 1, 0, 0, 'published'
);
