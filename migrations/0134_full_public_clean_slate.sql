-- Migration 0134: 100% Full Public Clean-Slate Purge (v233)
-- Wipes all pre-seeded and legacy public content, directory trees, community threads,
-- events, mock tests, and educational resources across Cloudflare D1 so the entire
-- public site starts 100% clean and is authored afresh from Admin Studio (/admin/).
-- Preserves ONLY the 5 clean top-level navigation pillars in nav_categories & nav_menu_items.

-- Ensure runtime-initialized studio tables exist with their exact production DDL before wiping
CREATE TABLE IF NOT EXISTS jobs_directory_folders (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  parent_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_published INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT '',
  intro_html TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  hero_badge TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(domain_slug, slug)
);

CREATE TABLE IF NOT EXISTS jobs_directory_items (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL DEFAULT 'job-notification',
  recruiting_body TEXT NOT NULL DEFAULT '',
  qualification_tag TEXT NOT NULL DEFAULT '',
  vacancies TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  deadline_date TEXT NOT NULL DEFAULT '',
  exam_date TEXT NOT NULL DEFAULT '',
  official_apply_url TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_alt TEXT NOT NULL DEFAULT '',
  attachments_json TEXT NOT NULL DEFAULT '[]',
  links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  language TEXT NOT NULL DEFAULT 'EN',
  status TEXT NOT NULL DEFAULT 'draft',
  featured INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  verified_by TEXT,
  verified_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs_directory_suggestions (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT,
  item_id TEXT,
  reporter_name TEXT NOT NULL DEFAULT 'Citizen',
  category TEXT NOT NULL DEFAULT 'correction',
  message TEXT NOT NULL,
  suggested_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  moderator_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schemes_directory_folders (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  parent_id TEXT,
  depth INTEGER NOT NULL DEFAULT 1,
  name_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  featured_badge TEXT NOT NULL DEFAULT '',
  verified_at TEXT,
  legacy_node_id TEXT,
  legacy_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(domain_slug, slug)
);

CREATE TABLE IF NOT EXISTS schemes_directory_items (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  scheme_type TEXT NOT NULL DEFAULT 'state_scheme',
  sponsor_level TEXT NOT NULL DEFAULT 'Odisha State',
  department_name TEXT NOT NULL DEFAULT '',
  beneficiary_group TEXT NOT NULL DEFAULT 'All Citizens',
  benefit_amount TEXT NOT NULL DEFAULT '',
  income_limit TEXT NOT NULL DEFAULT '',
  application_mode TEXT NOT NULL DEFAULT 'Online Portal',
  application_deadline TEXT NOT NULL DEFAULT '',
  official_apply_url TEXT NOT NULL DEFAULT '',
  official_portal_verified INTEGER NOT NULL DEFAULT 0,
  language_parity TEXT NOT NULL DEFAULT 'EN',
  summary TEXT NOT NULL DEFAULT '',
  eligibility_criteria TEXT NOT NULL DEFAULT '',
  documents_required TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  pdf_size_bytes INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT NOT NULL DEFAULT '',
  links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  entity_tags_json TEXT NOT NULL DEFAULT '[]',
  legacy_post_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  verified_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schemes_directory_suggestions (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT,
  item_id TEXT,
  suggestion_type TEXT NOT NULL DEFAULT 'correction',
  reporter_name TEXT NOT NULL DEFAULT 'Citizen',
  message TEXT NOT NULL,
  suggested_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  moderator_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_library_folders (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  parent_id TEXT,
  depth INTEGER DEFAULT 1,
  name TEXT NOT NULL,
  title_or TEXT DEFAULT '',
  slug TEXT NOT NULL,
  node_slug TEXT DEFAULT '',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(domain_slug, parent_id, slug)
);

CREATE TABLE IF NOT EXISTS study_library_items (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT,
  folder_path TEXT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  resource_type TEXT DEFAULT 'notes',
  board_or_exam TEXT,
  subject_tag TEXT,
  language_parity TEXT DEFAULT 'EN',
  summary TEXT,
  body_html TEXT,
  pdf_url TEXT,
  pdf_size_bytes INTEGER DEFAULT 0,
  cover_image_url TEXT,
  links_json TEXT DEFAULT '[]',
  tags_json TEXT DEFAULT '[]',
  seo_title TEXT,
  seo_description TEXT,
  is_featured INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS study_library_suggestions (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT DEFAULT '',
  item_slug TEXT DEFAULT '',
  suggestion_type TEXT NOT NULL DEFAULT 'topic',
  title TEXT NOT NULL,
  details TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  reviewed_by TEXT DEFAULT '',
  reviewed_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS community_directory_nodes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  parent_slug TEXT,
  level TEXT NOT NULL DEFAULT 'section',
  title TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT '',
  official_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS community_directory_folders (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  parent_id TEXT,
  depth INTEGER NOT NULL DEFAULT 1,
  name_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  featured_badge TEXT NOT NULL DEFAULT '',
  verified_at TEXT,
  legacy_node_id TEXT,
  legacy_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(domain_slug, slug)
);

CREATE TABLE IF NOT EXISTS community_directory_items (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  community_type TEXT NOT NULL DEFAULT 'district_chapter',
  district_region TEXT NOT NULL DEFAULT 'All Odisha (30 Districts)',
  membership_model TEXT NOT NULL DEFAULT 'Open & Free',
  platform_channel TEXT NOT NULL DEFAULT 'Hybrid',
  join_or_portal_url TEXT NOT NULL DEFAULT '',
  safety_verified INTEGER NOT NULL DEFAULT 0,
  language_parity TEXT NOT NULL DEFAULT 'EN',
  summary TEXT NOT NULL DEFAULT '',
  charter_guidelines TEXT NOT NULL DEFAULT '',
  activities_highlights TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  pdf_size_bytes INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT NOT NULL DEFAULT '',
  links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  entity_tags_json TEXT NOT NULL DEFAULT '[]',
  legacy_post_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  verified_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_directory_suggestions (
  id TEXT PRIMARY KEY,
  domain_slug TEXT NOT NULL,
  folder_id TEXT,
  item_id TEXT,
  suggestion_type TEXT NOT NULL DEFAULT 'correction',
  reporter_name TEXT NOT NULL DEFAULT 'Citizen',
  message TEXT NOT NULL,
  suggested_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  moderator_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cso_current_affairs (
  id TEXT PRIMARY KEY,
  capsule_date TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  highlights_en TEXT NOT NULL DEFAULT '[]',
  highlights_or TEXT NOT NULL DEFAULT '[]',
  quiz_json TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'Odisha',
  status TEXT NOT NULL DEFAULT 'published',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. Wipe Jobs & Careers directories & items
DELETE FROM jobs_directory_suggestions;
DELETE FROM jobs_directory_items;
DELETE FROM jobs_directory_folders;
DELETE FROM jobs_directory_nodes;

-- 2. Wipe Schemes & Benefits directories & items
DELETE FROM schemes_directory_suggestions;
DELETE FROM schemes_directory_items;
DELETE FROM schemes_directory_folders;
DELETE FROM schemes_directory_nodes;
DELETE FROM schemes_directory;

-- 3. Wipe Study Library directories & items
DELETE FROM study_library_suggestions;
DELETE FROM study_library_items;
DELETE FROM study_library_folders;
DELETE FROM study_library_nodes;

-- 4. Wipe Community directories, feedback, posts, threads & shared knowledge
DELETE FROM community_directory_suggestions;
DELETE FROM community_directory_items;
DELETE FROM community_directory_folders;
DELETE FROM community_directory_nodes;
DELETE FROM community_feedback;
DELETE FROM urc_community_posts;
DELETE FROM urc_forum_threads;
DELETE FROM urc_shared_knowledge;

-- 5. Wipe About directory nodes
DELETE FROM about_directory_nodes;

-- 6. Wipe core CMS posts, resources, current affairs & mock tests
DELETE FROM mock_questions;
DELETE FROM mock_tests;
DELETE FROM cso_current_affairs;
DELETE FROM resources;
DELETE FROM posts;

-- 7. Wipe Educational Resources Batches 1–6 tables
DELETE FROM edu_answer_keys;
DELETE FROM edu_collections;
DELETE FROM edu_mock_tests;
DELETE FROM edu_quizzes;
DELETE FROM edu_pyq_papers;
DELETE FROM edu_syllabi;
DELETE FROM edu_admit_results;
DELETE FROM edu_examinations;
DELETE FROM edu_subjects_topics;
DELETE FROM edu_classes_grades;
DELETE FROM edu_career_paths;
DELETE FROM edu_scholarships;
DELETE FROM edu_resources;

-- 8. Wipe Events & Scheduling tables
DELETE FROM evt_district_meetups;
DELETE FROM evt_live_webinars;
DELETE FROM evt_results_dv_rosters;
DELETE FROM evt_answer_key_challenges;
DELETE FROM evt_admit_card_releases;
DELETE FROM evt_deadline_countdowns;
DELETE FROM evt_admission_milestones;
DELETE FROM evt_exam_calendar;

-- 9. Reset Navigation tables to ONLY the 5 clean top-level pillars
DELETE FROM nav_internal_links;
DELETE FROM nav_tags;
DELETE FROM nav_menu_items;
DELETE FROM nav_categories;

INSERT OR REPLACE INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, target_portal, landing_url, icon_key, sort_order, featured, status) VALUES
  ('ncat-jobs-careers', NULL, 'jobs-careers', 'JOB', 'Jobs & Careers', 'ଚାକିରି ଓ କ୍ୟାରିୟର୍', 'Verified job notifications and career opportunities authored in Admin Studio.', 'jobs-careers', '/jobs-careers/', 'briefcase', 1, 1, 'published'),
  ('ncat-schemes-benefits', NULL, 'schemes-benefits', 'SCH', 'Schemes & Benefits', 'ଯୋଜନା ଓ ସୁବିଧା', 'Odisha State and Central Government welfare schemes and scholarships.', 'schemes', '/schemes-benefits/', 'landmark', 2, 1, 'published'),
  ('ncat-study-library', NULL, 'study-library', 'LIB', 'Study Library', 'ଅଧ୍ୟୟନ ପାଠାଗାର', 'Syllabi, PYQs, bilingual notes, and mock test study resources.', 'study-library', '/study-library/', 'book', 3, 1, 'published'),
  ('ncat-community', NULL, 'community', 'COM', 'Community', 'ସମୁଦାୟ', 'Student discussions, mentorship circles, and public help.', 'community', '/community/', 'users', 4, 1, 'published'),
  ('ncat-about', NULL, 'about', 'ABT', 'About', 'ଆମ ବିଷୟରେ', 'About Common Sense Odisha, editorial standards, and legal policies.', 'about', '/about/', 'info', 5, 1, 'published');

INSERT OR REPLACE INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, highlight_style, sort_order, status) VALUES
  ('nmenu-jobs-careers', 'header', 'Jobs & Careers', 'ଚାକିରି ଓ କ୍ୟାରିୟର୍', '/jobs-careers/', '💼', '', 'default', 1, 'published'),
  ('nmenu-schemes-benefits', 'header', 'Schemes & Benefits', 'ଯୋଜନା ଓ ସୁବିଧା', '/schemes-benefits/', '🏛', '', 'default', 2, 'published'),
  ('nmenu-study-library', 'header', 'Study Library', 'ଅଧ୍ୟୟନ ପାଠାଗାର', '/study-library/', '📖', '', 'default', 3, 'published'),
  ('nmenu-community', 'header', 'Community', 'ସମୁଦାୟ', '/community/', '👥', '', 'default', 4, 'published'),
  ('nmenu-about', 'header', 'About', 'ଆମ ବିଷୟରେ', '/about/', 'ⓘ', '', 'default', 5, 'published');
