-- v286: Refine Study Library to 4 Canonical Active L1 Study Tracks (Idempotent)
-- Retires 'skill-coding-digital' and 'previous-papers-mock-tests' (is_published = 0)
-- and ensures ONLY the 4 canonical exam tracks are active (is_published = 1) in exact sort order:
--   1. Central Competitive Exams (central-competitive-exams, sort_order = 10)
--   2. Odisha State Exams        (odisha-state-exams,        sort_order = 20)
--   3. Teaching & Educator Exams (teaching-educator-exams,   sort_order = 30)
--   4. School & Board Exams      (school-board-notes,        sort_order = 40)

UPDATE study_taxonomy_nodes
SET is_published = 0, updated_at = datetime('now')
WHERE level = 1
  AND slug NOT IN (
    'central-competitive-exams',
    'odisha-state-exams',
    'teaching-educator-exams',
    'school-board-notes'
  );

INSERT INTO study_taxonomy_nodes (
  id, level, parent_id, slug, title_en, title_or, subtitle_en, subtitle_or, icon, accent_variant, sort_order, is_published, updated_at
) VALUES
  (
    'stl_l1_central_exams', 1, NULL, 'central-competitive-exams',
    'Central Competitive Exams', 'କେନ୍ଦ୍ରୀୟ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା',
    'UPSC Civil Services, SSC CGL/CHSL/GD, Banking (IBPS/SBI/RBI) & Railways',
    'UPSC, SSC, ବ୍ୟାଙ୍କିଂ (IBPS/SBI/RBI) ଓ ରେଳବାଇ ପରୀକ୍ଷା',
    '🇮🇳', 'indigo', 10, 1, datetime('now')
  ),
  (
    'stl_l1_odisha_state', 1, NULL, 'odisha-state-exams',
    'Odisha State Exams', 'ଓଡ଼ିଶା ରାଜ୍ୟ ପରୀକ୍ଷା',
    'OPSC OAS/ASO, OSSC & OSSSC Combined, Odisha Police & High Court preparation',
    'OPSC, OSSC, OSSSC, ଓଡ଼ିଶା ପୋଲିସ୍ ଓ ହାଇକୋର୍ଟ ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି',
    '🏛️', 'emerald', 20, 1, datetime('now')
  ),
  (
    'stl_l1_teaching_educator', 1, NULL, 'teaching-educator-exams',
    'Teaching & Educator Exams', 'ଶିକ୍ଷକ ଓ ଶିକ୍ଷାଦାନ ପରୀକ୍ଷା',
    'OTET, OSSTET, CTET, KVS/NVS/EMRS, OAVS, LTR, PGT/TGT & B.Ed pedagogy',
    'OTET, OSSTET, CTET, KVS/NVS, OAVS, LTR ଓ B.Ed ପ୍ରସ୍ତୁତି',
    '🎓', 'violet', 30, 1, datetime('now')
  ),
  (
    'stl_l1_school_board', 1, NULL, 'school-board-notes',
    'School & Board Exams', 'ବିଦ୍ୟାଳୟ ଓ ବୋର୍ଡ ପରୀକ୍ଷା',
    'Class 10 BSE Odisha Matric, Class 12 CHSE Science/Commerce/Arts & NCERT',
    'ଦଶମ (BSE Odisha) ଓ ଦ୍ୱାଦଶ (CHSE) ବିଜ୍ଞାନ, ବାଣିଜ୍ୟ, କଳା ଓ NCERT ନୋଟ୍ସ',
    '📘', 'cobalt', 40, 1, datetime('now')
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
  sort_order = excluded.sort_order,
  is_published = 1,
  updated_at = datetime('now');
