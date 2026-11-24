-- Migration 0132: Clean-Slate Reset & Live Admin Sync (v231)
-- Clears all legacy seeded subcategories, mega-menu piles, and auto-seeded job notices
-- so Cloudflare D1 stays strictly controlled by what is authored in /admin/.
-- Preserves ONLY the 5 clean top-level navigation pillars:
--   Jobs & Careers | Schemes & Benefits | Study Library | Community | About

DELETE FROM nav_menu_items;
DELETE FROM nav_categories;
DELETE FROM nav_tags;
DELETE FROM posts WHERE id LIKE 'seed-%';

-- 5 Clean Top-Level Master Categories (0 pre-seeded subcategories)
INSERT OR REPLACE INTO nav_categories (id, parent_id, slug, code, name_en, name_or, description_en, target_portal, landing_url, icon_key, sort_order, featured, status) VALUES
  ('ncat-jobs-careers', NULL, 'jobs-careers', 'JOB', 'Jobs & Careers', 'ଚାକିରି ଓ କ୍ୟାରିୟର୍', 'Verified job notifications and career opportunities authored in Admin Studio.', 'jobs-careers', '/jobs-careers/', 'briefcase', 1, 1, 'published'),
  ('ncat-schemes-benefits', NULL, 'schemes-benefits', 'SCH', 'Schemes & Benefits', 'ଯୋଜନା ଓ ସୁବିଧା', 'Odisha State and Central Government welfare schemes and scholarships.', 'schemes', '/schemes-benefits/', 'landmark', 2, 1, 'published'),
  ('ncat-study-library', NULL, 'study-library', 'LIB', 'Study Library', 'ଅଧ୍ୟୟନ ପାଠାଗାର', 'Syllabi, PYQs, bilingual notes, and mock test study resources.', 'study-library', '/study-library/', 'book', 3, 1, 'published'),
  ('ncat-community', NULL, 'community', 'COM', 'Community', 'ସମୁଦାୟ', 'Student discussions, mentorship circles, and public help.', 'community', '/community/', 'users', 4, 1, 'published'),
  ('ncat-about', NULL, 'about', 'ABT', 'About', 'ଆମ ବିଷୟରେ', 'About Common Sense Odisha, editorial standards, and legal policies.', 'about', '/about/', 'info', 5, 1, 'published');

-- 5 Clean Top-Level Header Pillars (0 pre-seeded mega_menu rows)
INSERT OR REPLACE INTO nav_menu_items (id, menu_location, label_en, label_or, url, icon_key, badge_text_en, highlight_style, sort_order, status) VALUES
  ('nmenu-jobs-careers', 'header', 'Jobs & Careers', 'ଚାକିରି ଓ କ୍ୟାରିୟର୍', '/jobs-careers/', '💼', '', 'default', 1, 'published'),
  ('nmenu-schemes-benefits', 'header', 'Schemes & Benefits', 'ଯୋଜନା ଓ ସୁବିଧା', '/schemes-benefits/', '🏛', '', 'default', 2, 'published'),
  ('nmenu-study-library', 'header', 'Study Library', 'ଅଧ୍ୟୟନ ପାଠାଗାର', '/study-library/', '📖', '', 'default', 3, 'published'),
  ('nmenu-community', 'header', 'Community', 'ସମୁଦାୟ', '/community/', '👥', '', 'default', 4, 'published'),
  ('nmenu-about', 'header', 'About', 'ଆମ ବିଷୟରେ', '/about/', 'ⓘ', '', 'default', 5, 'published');
