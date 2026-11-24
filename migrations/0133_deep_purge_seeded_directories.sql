-- Migration 0133: Site-Wide Deep Purge of Legacy Auto-Seeded Directories & Content (v232)
-- Clears pre-seeded folders/items across Jobs, Schemes, Study Library, Community, and Edu Resources
-- so Cloudflare D1 is 100% controlled by content authored in Admin Studio (/admin/).
-- Note: Preserves the 5 clean top-level navigation pillars in nav_categories & nav_menu_items from 0132.

DELETE FROM jobs_directory_items WHERE created_by IN ('seed', 'system', 'system-seed-v129') OR verified_by IN ('seed', 'system-seed-v129', 'system@csodisha.com');
DELETE FROM jobs_directory_folders WHERE updated_by IN ('seed', 'system', 'enrichment') OR id LIKE 'jf-%';

DELETE FROM schemes_directory_items WHERE id LIKE 'sch-live-%' OR id LIKE 'si-%';
DELETE FROM schemes_directory_folders WHERE id LIKE 'sf-%';

DELETE FROM study_library_items WHERE created_by IN ('seed', 'system') OR id LIKE 'std-live-%' OR id LIKE 'ec-item-%';
DELETE FROM study_library_folders WHERE id LIKE 'sl-%' OR id LIKE 'ec-%';

DELETE FROM community_directory_items WHERE id LIKE 'ci-%' OR id LIKE 'comm-seed-%';
DELETE FROM community_directory_folders WHERE id LIKE 'cf-%';

DELETE FROM edu_resources WHERE created_by = 'system';
DELETE FROM edu_scholarships WHERE id LIKE 'schol-%';
DELETE FROM edu_career_paths WHERE id LIKE 'car-%';
DELETE FROM edu_mock_tests WHERE id LIKE 'mt-%';
DELETE FROM edu_quizzes WHERE id LIKE 'qz-%';
DELETE FROM edu_syllabi WHERE id LIKE 'syl-%';
DELETE FROM edu_pyq_papers WHERE id LIKE 'pyq-%';
