-- Migration 0131: Restructure Navigation to Clean 7-Pillar / 28-Module Architecture (v230)
-- Synchronizes D1 nav_categories and nav_menu_items with admin/data/master-navigation.json.
-- Safe & idempotent: deletes legacy starter rows and upserts the 7 pillars + 28 bilingual modules.

DELETE FROM nav_menu_items WHERE menu_location IN ('header', 'mega_menu');
DELETE FROM nav_categories WHERE id LIKE 'ncat-%' OR id LIKE 'nsub-%';

-- 7 Pillar Master Categories
INSERT OR REPLACE INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, target_portal, landing_url, icon_key, sort_order, featured, status) VALUES
  ('ncat-pillar-01', NULL, 'home-live-updates', 'HOM', 'Home & Live Updates', 'ମୂଳପୃଷ୍ଠା ଓ ତାଜା ଅପଡେଟ୍', 'Homepage overview, live recruitment alerts, daily current affairs, and annual exam calendar.', 'all', '/', 'home', 1, 1, 'published'),
  ('ncat-pillar-02', NULL, 'jobs-recruitment', 'JOB', 'Jobs & Recruitment', 'ଚାକିରି ଓ ନିଯୁକ୍ତି', 'Odisha State Govt (OPSC/OSSC/OSSSC/Police), Central Govt, PSUs, and lifecycle tracking.', 'jobs-careers', '/jobs-careers/', 'briefcase', 2, 1, 'published'),
  ('ncat-pillar-03', NULL, 'study-library-ca', 'LIB', 'Study Library & Current Affairs', 'ଅଧ୍ୟୟନ ପାଠାଗାର ଓ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', 'Official syllabi, solved PYQs, bilingual study notes, and daily 5-MCQ capsules.', 'study-library', '/study-library/', 'book', 3, 1, 'published'),
  ('ncat-pillar-04', NULL, 'mock-tests-practice', 'CBT', 'Mock Tests & Practice', 'ମକ୍ ଟେଷ୍ଟ ଓ ଅଭ୍ୟାସ', 'Odisha & Central CBT mock tests, sectional speed drills, and performance analytics.', 'study-library', '/mock-tests/', 'award', 4, 1, 'published'),
  ('ncat-pillar-05', NULL, 'schemes-scholarships', 'SCH', 'Schemes & Scholarships', 'ଯୋଜନା ଓ ଛାତ୍ରବୃତ୍ତି', 'Odisha welfare schemes, Central Govt schemes, post-matric scholarships, and eligibility matcher.', 'schemes', '/schemes-benefits/', 'landmark', 5, 1, 'published'),
  ('ncat-pillar-06', NULL, 'student-tools-portals', 'TLS', 'Student Tools & Verified Portals', 'ଛାତ୍ର ଉପକରଣ ଓ ସରକାରୀ ପୋର୍ଟାଲ୍', 'Age calculator, photo/signature resizer, document checklist, and official .gov.in portals.', 'all', '/tools/', 'wrench', 6, 1, 'published'),
  ('ncat-pillar-07', NULL, 'community-support', 'COM', 'Community & Support', 'ସମୁଦାୟ ଓ ସହାୟତା', 'Student forum, help & FAQs, error reports, resource suggestions, and legal policies.', 'community', '/community/', 'users', 7, 1, 'published');

-- 28 Pillar Subcategories
INSERT OR REPLACE INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, target_portal, landing_url, icon_key, sort_order, featured, status) VALUES
  ('nsub-01-01', 'ncat-pillar-01', 'homepage-overview', 'P1M1', 'Homepage Overview', 'ମୂଳପୃଷ୍ଠା ବିବରଣୀ', 'CS Odisha portal overview and quick discovery.', 'all', '/', 'home', 1, 1, 'published'),
  ('nsub-01-02', 'ncat-pillar-01', 'live-recruitment-alerts', 'P1M2', 'Live Recruitment Alerts', 'ତାଜା ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି', 'Latest Odisha and Central recruitment alerts.', 'jobs-careers', '/jobs/', 'bell', 2, 1, 'published'),
  ('nsub-01-03', 'ncat-pillar-01', 'todays-current-affairs', 'P1M3', 'Today''s Current Affairs', 'ଆଜିର ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', 'Daily Odisha and national news briefs.', 'study-library', '/current-affairs/', 'newspaper', 3, 1, 'published'),
  ('nsub-01-04', 'ncat-pillar-01', 'annual-exam-calendar', 'P1M4', 'Annual Exam Calendar', 'ବାର୍ଷିକ ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର୍', 'OPSC, OSSC, OSSSC and national exam schedule.', 'study-library', '/study/examinations/', 'calendar', 4, 1, 'published'),

  ('nsub-02-01', 'ncat-pillar-02', 'odisha-state-govt-jobs', 'P2M1', 'Odisha State Govt: OPSC/OSSC/OSSSC/Police', 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରୀ: OPSC/OSSC/OSSSC/ପୋଲିସ୍', 'State commissions, police, and district recruitments.', 'jobs-careers', '/jobs-careers/?track=odisha-govt', 'briefcase', 1, 1, 'published'),
  ('nsub-02-02', 'ncat-pillar-02', 'central-govt-jobs', 'P2M2', 'Central Govt: UPSC/SSC/RRB/Banking', 'କେନ୍ଦ୍ର ସରକାରୀ: UPSC/SSC/RRB/ବ୍ୟାଙ୍କିଂ', 'All-India civil services, staff selection, railway, and banking jobs.', 'jobs-careers', '/jobs-careers/?track=central-govt', 'landmark', 2, 1, 'published'),
  ('nsub-02-03', 'ncat-pillar-02', 'psus-apprenticeships', 'P2M3', 'PSUs & Apprenticeships', 'PSU ଓ ଆପ୍ରେଣ୍ଟିସଶିପ୍', 'NALCO, MCL, SAIL, NTPC, OPGC and NATS/NAPS apprenticeships.', 'jobs-careers', '/jobs-careers/?track=psu-apprenticeship', 'factory', 3, 1, 'published'),
  ('nsub-02-04', 'ncat-pillar-02', 'notification-lifecycle-tracker', 'P2M4', 'Notification Lifecycle Tracker', 'ବିଜ୍ଞପ୍ତି ସ୍ଥିତି ଟ୍ରାକର୍', 'Track advertisements, admit cards, answer keys, and final results.', 'jobs-careers', '/jobs/', 'check', 4, 1, 'published'),

  ('nsub-03-01', 'ncat-pillar-03', 'syllabi-exam-patterns', 'P3M1', 'Syllabi & Exam Patterns', 'ସିଲାବସ୍ ଓ ପରୀକ୍ଷା ପଦ୍ଧତି', 'Official syllabus PDFs and stage-wise marking patterns.', 'study-library', '/resources/?kind=syllabus', 'file', 1, 1, 'published'),
  ('nsub-03-02', 'ncat-pillar-03', 'solved-pyqs', 'P3M2', 'Solved PYQs', 'ସମାଧାନ ହୋଇଥିବା PYQ', 'Previous year question papers with answer keys.', 'study-library', '/resources/?kind=pyq', 'archive', 2, 1, 'published'),
  ('nsub-03-03', 'ncat-pillar-03', 'bilingual-study-notes', 'P3M3', 'Bilingual Study Notes', 'ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ନୋଟ୍ସ', 'English & Odia study notes, Odisha GK, and textbooks.', 'study-library', '/study-library/', 'book', 3, 1, 'published'),
  ('nsub-03-04', 'ncat-pillar-03', 'daily-ca-5mcq-capsules', 'P3M4', 'Daily Current Affairs & 5-MCQ Capsules', 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ଓ 5-MCQ', 'Daily digest with 5 exam-ready bilingual MCQs.', 'study-library', '/current-affairs/', 'zap', 4, 1, 'published'),

  ('nsub-04-01', 'ncat-pillar-04', 'odisha-govt-mock-tests', 'P4M1', 'Odisha Govt Mock Tests', 'ଓଡ଼ିଶା ସରକାରୀ ମକ୍ ଟେଷ୍ଟ', 'Full-length OPSC, OSSC, OSSSC, OTET & Police practice tests.', 'study-library', '/mock-tests/?track=odisha', 'award', 1, 1, 'published'),
  ('nsub-04-02', 'ncat-pillar-04', 'central-govt-cbt-tests', 'P4M2', 'Central Govt CBT Tests', 'କେନ୍ଦ୍ର ସରକାରୀ CBT ଟେଷ୍ଟ', 'Timed CBT mock exams for SSC, RRB, Banking & CTET.', 'study-library', '/study-library/cbt-mock-test/', 'monitor', 2, 1, 'published'),
  ('nsub-04-03', 'ncat-pillar-04', 'sectional-speed-drills', 'P4M3', 'Sectional & Speed Drills', 'ବିଭାଗୀୟ ଓ ସ୍ପିଡ୍ ଡ୍ରିଲ୍', 'Targeted topic quizzes for Reasoning, Math, Odia & GK.', 'study-library', '/mock-tests/?mode=sectional', 'clock', 3, 1, 'published'),
  ('nsub-04-04', 'ncat-pillar-04', 'scoreboard-analytics', 'P4M4', 'Scoreboard & Analytics', 'ସ୍କୋରବୋର୍ଡ ଓ ବିଶ୍ଳେଷଣ', 'Track accuracy, attempt history, and exam readiness.', 'study-library', '/student-dashboard/', 'chart', 4, 1, 'published'),

  ('nsub-05-01', 'ncat-pillar-05', 'odisha-state-welfare-schemes', 'P5M1', 'Odisha State Welfare Schemes', 'ଓଡ଼ିଶା ରାଜ୍ୟ କଲ୍ୟାଣ ଯୋଜନା', 'State welfare, agriculture, health, and women empowerment schemes.', 'schemes', '/schemes-benefits/?scope=odisha', 'landmark', 1, 1, 'published'),
  ('nsub-05-02', 'ncat-pillar-05', 'central-govt-schemes', 'P5M2', 'Central Govt Schemes', 'କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା', 'Union ministry welfare, education, and livelihood schemes.', 'schemes', '/schemes-benefits/?scope=central', 'globe', 2, 1, 'published'),
  ('nsub-05-03', 'ncat-pillar-05', 'post-matric-merit-scholarships', 'P5M3', 'Post-Matric & Merit Scholarships', 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଓ ମେଧା ଛାତ୍ରବୃତ୍ତି', 'Odisha State Scholarship Portal, Gopabandhu & NSP scholarships.', 'schemes', '/scholarship-guidance/', 'graduation', 3, 1, 'published'),
  ('nsub-05-04', 'ncat-pillar-05', 'eligibility-matcher', 'P5M4', 'Eligibility Matcher', 'ଯୋଗ୍ୟତା ଯାଞ୍ଚ', 'Interactive scheme and scholarship eligibility finder.', 'schemes', '/scheme-opportunity-finder/', 'filter', 4, 1, 'published'),

  ('nsub-06-01', 'ncat-pillar-06', 'age-eligibility-calculator', 'P6M1', 'Age Eligibility Calculator', 'ବୟସ ଯୋଗ୍ୟତା କ୍ୟାଲକୁଲେଟର୍', 'Verify exact age and Odisha category relaxations.', 'all', '/tools/#age-calculator', 'calculator', 1, 1, 'published'),
  ('nsub-06-02', 'ncat-pillar-06', 'photo-signature-resizer', 'P6M2', 'Photo & Signature Resizer', 'ଫଟୋ ଓ ଦସ୍ତଖତ ରିସାଇଜର୍', 'Offline browser photo and signature resizer for exam portals.', 'all', '/tools/#photo-resizer', 'image', 2, 1, 'published'),
  ('nsub-06-03', 'ncat-pillar-06', 'document-readiness-checklist', 'P6M3', 'Document Readiness Checklist', 'ଡକ୍ୟୁମେଣ୍ଟ୍ ପ୍ରସ୍ତୁତି ତାଲିକା', 'Mandatory Odisha certificates and OTR readiness tracker.', 'all', '/tools/#doc-readiness-card', 'clipboard', 3, 1, 'published'),
  ('nsub-06-04', 'ncat-pillar-06', 'official-gov-portals-directory', 'P6M4', 'Official .gov.in Portals Directory', 'ଅଫିସିଆଲ୍ .gov.in ପୋର୍ଟାଲ୍', 'Verified government URLs and anti-scam link checker.', 'all', '/tools/#scam-checker', 'shield', 4, 1, 'published'),

  ('nsub-07-01', 'ncat-pillar-07', 'student-discussion-forum', 'P7M1', 'Student Discussion Forum', 'ଛାତ୍ର ଆଲୋଚନା ମଞ୍ଚ', 'Peer Q&A, exam circles, and district study communities.', 'community', '/community/', 'users', 1, 1, 'published'),
  ('nsub-07-02', 'ncat-pillar-07', 'help-and-faqs', 'P7M2', 'Help & FAQs', 'ସହାୟତା ଓ ସାଧାରଣ ପ୍ରଶ୍ନ', 'Getting started guides and frequently asked questions.', 'community', '/support/#faqs', 'help', 2, 1, 'published'),
  ('nsub-07-03', 'ncat-pillar-07', 'report-error-suggest-resource', 'P7M3', 'Report an Error / Suggest Resource', 'ତ୍ରୁଟି ଜଣାନ୍ତୁ / ସମ୍ବଳ ପ୍ରସ୍ତାବ', 'Report outdated notices or suggest verified resources.', 'community', '/support/#report-error', 'flag', 3, 1, 'published'),
  ('nsub-07-04', 'ncat-pillar-07', 'about-legal-policies', 'P7M4', 'About & Legal Policies', 'ଆମ ବିଷୟରେ ଓ ଆଇନଗତ ନୀତି', 'About CS Odisha, editorial standards, privacy, and terms.', 'about', '/about/', 'info', 4, 1, 'published');

-- 7 Header Navigation Pillars
INSERT OR REPLACE INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, highlight_style, sort_order, status) VALUES
  ('nmenu-pillar-01', 'header', 'Home', 'ମୂଳପୃଷ୍ଠା', '/', '🏠', '', 'default', 1, 'published'),
  ('nmenu-pillar-02', 'header', 'Jobs', 'ଚାକିରି', '/jobs-careers/', '💼', 'LIVE', 'pill', 2, 'published'),
  ('nmenu-pillar-03', 'header', 'Study Library', 'ପାଠାଗାର', '/study-library/', '📖', '', 'default', 3, 'published'),
  ('nmenu-pillar-04', 'header', 'Mock Tests', 'ମକ୍ ଟେଷ୍ଟ', '/mock-tests/', '📝', '', 'default', 4, 'published'),
  ('nmenu-pillar-05', 'header', 'Schemes', 'ଯୋଜନା', '/schemes-benefits/', '🏛', '', 'default', 5, 'published'),
  ('nmenu-pillar-06', 'header', 'Tools', 'ଉପକରଣ', '/tools/', '🧰', '', 'default', 6, 'published'),
  ('nmenu-pillar-07', 'header', 'Community', 'ସମୁଦାୟ', '/community/', '👥', '', 'default', 7, 'published');

-- 28 Mega-Menu Dropdown Items (4 per Pillar)
INSERT OR REPLACE INTO nav_menu_items (id, menu_location, parent_item_id, column_group, label_en, label_or, url, icon_key, badge_text_en, sort_order, status) VALUES
  ('mm-p1-01', 'mega_menu', 'nmenu-pillar-01', 'Column 1: Quick Tracks', 'Homepage Overview', 'ମୂଳପୃଷ୍ଠା ବିବରଣୀ', '/', '🏠', '', 1, 'published'),
  ('mm-p1-02', 'mega_menu', 'nmenu-pillar-01', 'Column 1: Quick Tracks', 'Live Recruitment Alerts', 'ତାଜା ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି', '/jobs/', '🔔', 'LIVE', 2, 'published'),
  ('mm-p1-03', 'mega_menu', 'nmenu-pillar-01', 'Column 1: Quick Tracks', 'Today''s Current Affairs', 'ଆଜିର ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', '/current-affairs/', '📰', '', 3, 'published'),
  ('mm-p1-04', 'mega_menu', 'nmenu-pillar-01', 'Column 1: Quick Tracks', 'Annual Exam Calendar', 'ବାର୍ଷିକ ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର୍', '/study/examinations/', '📅', '', 4, 'published'),

  ('mm-p2-01', 'mega_menu', 'nmenu-pillar-02', 'Column 2: Exam Bodies', 'Odisha State Govt: OPSC/OSSC/OSSSC/Police', 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରୀ: OPSC/OSSC/OSSSC/ପୋଲିସ୍', '/jobs-careers/?track=odisha-govt', '🏛️', 'LIVE', 1, 'published'),
  ('mm-p2-02', 'mega_menu', 'nmenu-pillar-02', 'Column 2: Exam Bodies', 'Central Govt: UPSC/SSC/RRB/Banking', 'କେନ୍ଦ୍ର ସରକାରୀ: UPSC/SSC/RRB/ବ୍ୟାଙ୍କିଂ', '/jobs-careers/?track=central-govt', '🇮🇳', '', 2, 'published'),
  ('mm-p2-03', 'mega_menu', 'nmenu-pillar-02', 'Column 2: Exam Bodies', 'PSUs & Apprenticeships', 'PSU ଓ ଆପ୍ରେଣ୍ଟିସଶିପ୍', '/jobs-careers/?track=psu-apprenticeship', '🏭', '', 3, 'published'),
  ('mm-p2-04', 'mega_menu', 'nmenu-pillar-02', 'Column 2: Exam Bodies', 'Notification Lifecycle Tracker', 'ବିଜ୍ଞପ୍ତି ସ୍ଥିତି ଟ୍ରାକର୍', '/jobs/', '📌', '', 4, 'published'),

  ('mm-p3-01', 'mega_menu', 'nmenu-pillar-03', 'Column 1: Quick Tracks', 'Syllabi & Exam Patterns', 'ସିଲାବସ୍ ଓ ପରୀକ୍ଷା ପଦ୍ଧତି', '/resources/?kind=syllabus', '📋', 'PDF', 1, 'published'),
  ('mm-p3-02', 'mega_menu', 'nmenu-pillar-03', 'Column 2: Exam Bodies', 'Solved PYQs', 'ସମାଧାନ ହୋଇଥିବା PYQ', '/resources/?kind=pyq', '📝', 'FREE', 2, 'published'),
  ('mm-p3-03', 'mega_menu', 'nmenu-pillar-03', 'Column 1: Quick Tracks', 'Bilingual Study Notes', 'ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ନୋଟ୍ସ', '/study-library/', '📖', '', 3, 'published'),
  ('mm-p3-04', 'mega_menu', 'nmenu-pillar-03', 'Featured Spotlight', 'Daily Current Affairs & 5-MCQ Capsules', 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ଓ 5-MCQ', '/current-affairs/', '⚡', 'DAILY', 4, 'published'),

  ('mm-p4-01', 'mega_menu', 'nmenu-pillar-04', 'Column 2: Exam Bodies', 'Odisha Govt Mock Tests', 'ଓଡ଼ିଶା ସରକାରୀ ମକ୍ ଟେଷ୍ଟ', '/mock-tests/?track=odisha', '📝', '', 1, 'published'),
  ('mm-p4-02', 'mega_menu', 'nmenu-pillar-04', 'Column 2: Exam Bodies', 'Central Govt CBT Tests', 'କେନ୍ଦ୍ର ସରକାରୀ CBT ଟେଷ୍ଟ', '/study-library/cbt-mock-test/', '💻', 'CBT', 2, 'published'),
  ('mm-p4-03', 'mega_menu', 'nmenu-pillar-04', 'Column 3: Study Tools', 'Sectional & Speed Drills', 'ବିଭାଗୀୟ ଓ ସ୍ପିଡ୍ ଡ୍ରିଲ୍', '/mock-tests/?mode=sectional', '⏱️', '', 3, 'published'),
  ('mm-p4-04', 'mega_menu', 'nmenu-pillar-04', 'Column 3: Study Tools', 'Scoreboard & Analytics', 'ସ୍କୋରବୋର୍ଡ ଓ ବିଶ୍ଳେଷଣ', '/student-dashboard/', '📊', '', 4, 'published'),

  ('mm-p5-01', 'mega_menu', 'nmenu-pillar-05', 'Column 1: Quick Tracks', 'Odisha State Welfare Schemes', 'ଓଡ଼ିଶା ରାଜ୍ୟ କଲ୍ୟାଣ ଯୋଜନା', '/schemes-benefits/?scope=odisha', '🏛️', '', 1, 'published'),
  ('mm-p5-02', 'mega_menu', 'nmenu-pillar-05', 'Column 1: Quick Tracks', 'Central Govt Schemes', 'କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା', '/schemes-benefits/?scope=central', '🇮🇳', '', 2, 'published'),
  ('mm-p5-03', 'mega_menu', 'nmenu-pillar-05', 'Featured Spotlight', 'Post-Matric & Merit Scholarships', 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଓ ମେଧା ଛାତ୍ରବୃତ୍ତି', '/scholarship-guidance/', '🎓', 'OPEN', 3, 'published'),
  ('mm-p5-04', 'mega_menu', 'nmenu-pillar-05', 'Column 3: Study Tools', 'Eligibility Matcher', 'ଯୋଗ୍ୟତା ଯାଞ୍ଚ', '/scheme-opportunity-finder/', '✅', '', 4, 'published'),

  ('mm-p6-01', 'mega_menu', 'nmenu-pillar-06', 'Column 3: Study Tools', 'Age Eligibility Calculator', 'ବୟସ ଯୋଗ୍ୟତା କ୍ୟାଲକୁଲେଟର୍', '/tools/#age-calculator', '🎂', '', 1, 'published'),
  ('mm-p6-02', 'mega_menu', 'nmenu-pillar-06', 'Column 3: Study Tools', 'Photo & Signature Resizer', 'ଫଟୋ ଓ ଦସ୍ତଖତ ରିସାଇଜର୍', '/tools/#photo-resizer', '📸', 'OFFLINE', 2, 'published'),
  ('mm-p6-03', 'mega_menu', 'nmenu-pillar-06', 'Column 3: Study Tools', 'Document Readiness Checklist', 'ଡକ୍ୟୁମେଣ୍ଟ୍ ପ୍ରସ୍ତୁତି ତାଲିକା', '/tools/#doc-readiness-card', '📋', '', 3, 'published'),
  ('mm-p6-04', 'mega_menu', 'nmenu-pillar-06', 'Column 3: Study Tools', 'Official .gov.in Portals Directory', 'ଅଫିସିଆଲ୍ .gov.in ପୋର୍ଟାଲ୍', '/tools/#scam-checker', '🛡️', '', 4, 'published'),

  ('mm-p7-01', 'mega_menu', 'nmenu-pillar-07', 'Column 1: Quick Tracks', 'Student Discussion Forum', 'ଛାତ୍ର ଆଲୋଚନା ମଞ୍ଚ', '/community/', '💬', '', 1, 'published'),
  ('mm-p7-02', 'mega_menu', 'nmenu-pillar-07', 'Column 1: Quick Tracks', 'Help & FAQs', 'ସହାୟତା ଓ ସାଧାରଣ ପ୍ରଶ୍ନ', '/support/#faqs', '❓', '', 2, 'published'),
  ('mm-p7-03', 'mega_menu', 'nmenu-pillar-07', 'Column 1: Quick Tracks', 'Report an Error / Suggest Resource', 'ତ୍ରୁଟି ଜଣାନ୍ତୁ / ସମ୍ବଳ ପ୍ରସ୍ତାବ', '/support/#report-error', '🚩', '', 3, 'published'),
  ('mm-p7-04', 'mega_menu', 'nmenu-pillar-07', 'Column 1: Quick Tracks', 'About & Legal Policies', 'ଆମ ବିଷୟରେ ଓ ଆଇନଗତ ନୀତି', '/about/', 'ⓘ', '', 4, 'published');
