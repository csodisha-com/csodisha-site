-- v287: Canonical 4-Channel Community Taxonomy (Idempotent)
-- Retires legacy starter L1 channels (is_published = 0) and upserts the 4 canonical
-- active L1 Community Channels in exact sort order:
--   1. Exam & Career Q&A             (exam-career-qa,            sort_order = 10)
--   2. Odisha Schemes & Citizen Help (schemes-citizen-help,      sort_order = 20)
--   3. Study Groups & Peer Notes     (study-groups-notes,        sort_order = 30)
--   4. Success Stories & Mentorship  (success-stories-mentorship, sort_order = 40)

UPDATE community_taxonomy_nodes
SET is_published = 0, updated_at = datetime('now')
WHERE level = 1
  AND slug NOT IN (
    'exam-career-qa',
    'schemes-citizen-help',
    'study-groups-notes',
    'success-stories-mentorship'
  );

INSERT INTO community_taxonomy_nodes (
  id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or,
  icon, accent_variant, posting_policy, members_count, sort_order, is_published, updated_at
) VALUES
  (
    'comm_l1_exam_career_qa', 1, NULL, 'exam-career-qa',
    'Exam & Career Q&A', 'ପରୀକ୍ଷା ଓ କ୍ୟାରିୟର ପ୍ରଶ୍ନୋତ୍ତର',
    'Doubts on OPSC, OSSC, OSSSC, UPSC, SSC, Banking & Teaching exams',
    'OPSC, OSSC, OSSSC, UPSC, SSC, ବ୍ୟାଙ୍କିଂ ଓ ଶିକ୍ଷକ ପରୀକ୍ଷା ସନ୍ଦେହ ସମାଧାନ',
    '❓', 'emerald', 'open_verified', 124, 10, 1, datetime('now')
  ),
  (
    'comm_l1_schemes_citizen_help', 1, NULL, 'schemes-citizen-help',
    'Odisha Schemes & Citizen Help', 'ଓଡ଼ିଶା ଯୋଜନା ଓ ନାଗରିକ ସହାୟତା',
    'Application help, DBT/e-KYC troubleshooting & grievance guidance',
    'ଆବେଦନ ସହାୟତା, DBT/e-KYC ସମାଧାନ ଓ ଅଭିଯୋଗ ମାର୍ଗଦର୍ଶନ',
    '🏛️', 'amber', 'open_verified', 96, 20, 1, datetime('now')
  ),
  (
    'comm_l1_study_groups_notes', 1, NULL, 'study-groups-notes',
    'Study Groups & Peer Notes', 'ଅଧ୍ୟୟନ ଦଳ ଓ ସହପାଠୀ ନୋଟ୍ସ',
    'Syllabus planning, booklists, answer writing & peer study circles',
    'ସିଲାବସ୍ ଯୋଜନା, ବହି ତାଲିକା, ଉତ୍ତର ଲେଖା ଓ ଅଧ୍ୟୟନ ଚକ୍ର',
    '📚', 'cobalt', 'open_verified', 88, 30, 1, datetime('now')
  ),
  (
    'comm_l1_success_stories', 1, NULL, 'success-stories-mentorship',
    'Success Stories & Mentorship', 'ସଫଳତା କାହାଣୀ ଓ ମାର୍ଗଦର୍ଶନ',
    'Selected candidate strategies, interview experiences & mentor AMAs',
    'ସଫଳ ପ୍ରାର୍ଥୀଙ୍କ ରଣନୀତି, ଇଣ୍ଟରଭ୍ୟୁ ଅନୁଭୂତି ଓ ମେଣ୍ଟର ସହାୟତା',
    '🏆', 'violet', 'open_verified', 72, 40, 1, datetime('now')
  )
ON CONFLICT(id) DO UPDATE SET
  level = excluded.level,
  parent_id = excluded.parent_id,
  slug = excluded.slug,
  title_en = excluded.title_en,
  title_or = excluded.title_or,
  subtitle_en = excluded.subtitle_en,
  subtitle_or = excluded.subtitle_or,
  icon = excluded.icon,
  accent_variant = excluded.accent_variant,
  posting_policy = excluded.posting_policy,
  sort_order = excluded.sort_order,
  is_published = 1,
  updated_at = datetime('now');
