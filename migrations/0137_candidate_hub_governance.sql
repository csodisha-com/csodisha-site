-- v244 Candidate Hub, Governance & Dashboard UI/Feature Studio
-- Unified D1 schema controlling /student-dashboard/ UI, core + custom features,
-- document checklist templates, candidate governance (block/unblock/tier/session revocation),
-- and targeted content provisioning.

CREATE TABLE IF NOT EXISTS candidate_hub_modules (
  id TEXT PRIMARY KEY,
  module_key TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  title_or TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  subtitle_or TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '📌',
  module_type TEXT NOT NULL DEFAULT 'core',
  layout_slot TEXT NOT NULL DEFAULT 'both',
  card_span TEXT NOT NULL DEFAULT 'half',
  accent_variant TEXT NOT NULL DEFAULT 'primary',
  required_access_tier TEXT NOT NULL DEFAULT 'standard',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cand_hub_modules_order ON candidate_hub_modules(is_enabled, sort_order);

CREATE TABLE IF NOT EXISTS candidate_hub_ui_config (
  id TEXT PRIMARY KEY,
  hero_title_en TEXT NOT NULL DEFAULT 'Candidate Workspace',
  hero_title_or TEXT NOT NULL DEFAULT 'ପ୍ରାର୍ଥୀ କାର୍ଯ୍ୟକ୍ଷେତ୍ର',
  hero_subtitle_en TEXT NOT NULL DEFAULT 'Live D1 synced workspace for Odisha exams, schemes, documents & assigned packs',
  hero_subtitle_or TEXT NOT NULL DEFAULT 'ଓଡ଼ିଶା ପରୀକ୍ଷା, ଯୋଜନା, କାଗଜପତ୍ର ଓ ଅଧ୍ୟୟନ ସାମଗ୍ରୀର ବ୍ୟକ୍ତିଗତ କେନ୍ଦ୍ର',
  announcement_banner_en TEXT NOT NULL DEFAULT '',
  announcement_banner_or TEXT NOT NULL DEFAULT '',
  announcement_type TEXT NOT NULL DEFAULT 'info',
  show_announcement INTEGER NOT NULL DEFAULT 0,
  layout_mode TEXT NOT NULL DEFAULT 'sidebar_workspace',
  grid_columns INTEGER NOT NULL DEFAULT 2,
  default_theme TEXT NOT NULL DEFAULT 'system',
  allow_theme_switch INTEGER NOT NULL DEFAULT 1,
  show_quick_stats INTEGER NOT NULL DEFAULT 1,
  show_sidebar INTEGER NOT NULL DEFAULT 1,
  custom_empty_title_en TEXT NOT NULL DEFAULT 'Your workspace is clean — save items from published sections or add modules in Admin Studio.',
  custom_empty_title_or TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidate_doc_templates (
  id TEXT PRIMARY KEY,
  doc_key TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  title_or TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'identity',
  notes_en TEXT NOT NULL DEFAULT '',
  notes_or TEXT NOT NULL DEFAULT '',
  is_required INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cand_doc_templates_order ON candidate_doc_templates(is_published, sort_order);

CREATE TABLE IF NOT EXISTS candidate_governance (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  account_status TEXT NOT NULL DEFAULT 'active',
  block_reason TEXT NOT NULL DEFAULT '',
  access_tier TEXT NOT NULL DEFAULT 'standard',
  granted_modules_json TEXT NOT NULL DEFAULT '{}',
  session_version INTEGER NOT NULL DEFAULT 1,
  admin_notes TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cand_gov_status_tier ON candidate_governance(account_status, access_tier);

CREATE TABLE IF NOT EXISTS candidate_assigned_items (
  id TEXT PRIMARY KEY,
  target_scope TEXT NOT NULL DEFAULT 'all',
  target_user_id TEXT NOT NULL DEFAULT '',
  target_district TEXT NOT NULL DEFAULT '',
  target_exam_board TEXT NOT NULL DEFAULT '',
  item_type TEXT NOT NULL DEFAULT 'study_pdf',
  title_en TEXT NOT NULL DEFAULT '',
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  resource_url TEXT NOT NULL DEFAULT '',
  r2_file_key TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal',
  expires_at TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cand_assigned_scope ON candidate_assigned_items(is_published, target_scope, target_user_id);

-- Seed default UI config row (idempotent)
INSERT OR IGNORE INTO candidate_hub_ui_config (
  id, hero_title_en, hero_title_or, hero_subtitle_en, hero_subtitle_or,
  announcement_banner_en, announcement_banner_or, announcement_type, show_announcement,
  layout_mode, grid_columns, default_theme, allow_theme_switch, show_quick_stats, show_sidebar,
  custom_empty_title_en, custom_empty_title_or
) VALUES (
  'default',
  'Candidate Workspace',
  'ପ୍ରାର୍ଥୀ କାର୍ଯ୍ୟକ୍ଷେତ୍ର',
  'Personalised hub for Odisha exams, schemes, documents & assigned study resources',
  'ଓଡ଼ିଶା ପରୀକ୍ଷା, ଯୋଜନା, କାଗଜପତ୍ର ଓ ଅଧ୍ୟୟନ ସାମଗ୍ରୀର ବ୍ୟକ୍ତିଗତ କେନ୍ଦ୍ର',
  '',
  '',
  'info',
  0,
  'sidebar_workspace',
  2,
  'system',
  1,
  1,
  1,
  'Your workspace is clean — save items from published sections or add modules in Admin Studio.',
  'ଆପଣଙ୍କ କାର୍ଯ୍ୟକ୍ଷେତ୍ର ସଫା ଅଛି — ପ୍ରକାଶିତ ବିଭାଗରୁ ଆଇଟମ୍ ସଂରକ୍ଷଣ କରନ୍ତୁ କିମ୍ବା Admin Studio ରେ ମଡ୍ୟୁଲ୍ ଯୋଡ଼ନ୍ତୁ।'
);

-- Seed 8 core Candidate Hub modules (idempotent)
INSERT OR IGNORE INTO candidate_hub_modules (id, module_key, title_en, title_or, subtitle_en, subtitle_or, icon, module_type, layout_slot, card_span, accent_variant, required_access_tier, sort_order, is_enabled, config_json) VALUES
('chm_overview', 'overview', 'Workspace Overview', 'କାର୍ଯ୍ୟକ୍ଷେତ୍ର ସାରାଂଶ', 'Quick stats, assigned alerts & enabled workspace modules', 'ତ୍ୱରିତ ପରିସଂଖ୍ୟାନ, ନିର୍ଦ୍ଧାରିତ ସୂଚନା ଓ ସକ୍ରିୟ ମଡ୍ୟୁଲ୍', '📊', 'core', 'sidebar', 'full', 'primary', 'standard', 10, 1, '{}'),
('chm_assigned_content', 'assigned_content', 'Assigned For You', 'ଆପଣଙ୍କ ପାଇଁ ନିର୍ଦ୍ଧାରିତ', 'Study PDFs, notices, mock tests & personal guidance from CSO', 'CSO ତରଫରୁ ଅଧ୍ୟୟନ PDF, ବିଜ୍ଞପ୍ତି ଓ ବ୍ୟକ୍ତିଗତ ମାର୍ଗଦର୍ଶନ', '📬', 'core', 'both', 'full', 'accent', 'standard', 20, 1, '{}'),
('chm_eligibility_matcher', 'eligibility_matcher', 'Eligibility & Age Matcher', 'ଯୋଗ୍ୟତା ଓ ବୟସ ମ୍ୟାଚର୍', 'Match live D1 Jobs & Schemes with Odisha age-relaxation norms', 'ଓଡ଼ିଶା ବୟସ ଛାଡ଼ ନିୟମ ସହିତ ଲାଇଭ୍ ଚାକିରି ଓ ଯୋଜନା ମିଳାନ୍ତୁ', '🎯', 'core', 'both', 'half', 'primary', 'standard', 30, 1, '{}'),
('chm_saved_deadlines', 'saved_deadlines', 'Saved Items & Deadlines', 'ସଂରକ୍ଷିତ ଓ ଶେଷ ତାରିଖ', 'Track bookmarked vacancies & closing date countdowns', 'ସଂରକ୍ଷିତ ବିଜ୍ଞପ୍ତି ଓ ଶେଷ ତାରିଖ କାଉଣ୍ଟଡାଉନ୍ ଟ୍ରାକ୍ କରନ୍ତୁ', '⏳', 'core', 'both', 'half', 'amber', 'standard', 40, 1, '{}'),
('chm_document_vault', 'document_vault', 'Document Readiness Vault', 'କାଗଜପତ୍ର ପ୍ରସ୍ତୁତି ଭଲ୍ଟ', 'Verify required certificates for Odisha & Central applications', 'ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ଆବେଦନ ପାଇଁ ଆବଶ୍ୟକ ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ କରନ୍ତୁ', '🗂️', 'core', 'both', 'half', 'emerald', 'standard', 50, 1, '{}'),
('chm_mock_analytics', 'mock_analytics', 'Mock Test Analytics', 'ମକ୍ ଟେଷ୍ଟ ବିଶ୍ଳେଷଣ', 'Review accuracy trends & past test performance', 'ସଠିକତା ଧାରା ଓ ପୂର୍ବ ପରୀକ୍ଷା ଫଳାଫଳ ସମୀକ୍ଷା କରନ୍ତୁ', '📈', 'core', 'both', 'half', 'blue', 'standard', 60, 1, '{}'),
('chm_study_notes', 'study_notes', 'Study Notes & Scratchpad', 'ଅଧ୍ୟୟନ ନୋଟ୍ସ', 'Cloud-synced revision notes saved to your D1 workspace', 'ଆପଣଙ୍କ D1 କାର୍ଯ୍ୟକ୍ଷେତ୍ରରେ ସଂରକ୍ଷିତ ରିଭିଜନ୍ ନୋଟ୍ସ', '📝', 'core', 'both', 'half', 'primary', 'standard', 70, 1, '{}'),
('chm_profile_preferences', 'profile_preferences', 'Profile & Exam Preferences', 'ପ୍ରୋଫାଇଲ୍ ଓ ପରୀକ୍ଷା ପସନ୍ଦ', 'Update district, qualification, category & target exam boards', 'ଜିଲ୍ଲା, ଯୋଗ୍ୟତା, ବର୍ଗ ଓ ଲକ୍ଷ୍ୟ ପରୀକ୍ଷା ବୋର୍ଡ ଅପଡେଟ୍ କରନ୍ତୁ', '👤', 'core', 'sidebar', 'full', 'primary', 'standard', 80, 1, '{}');

-- Seed 8 Odisha & Central exam document checklist templates (idempotent)
INSERT OR IGNORE INTO candidate_doc_templates (id, doc_key, title_en, title_or, category, notes_en, notes_or, is_required, sort_order, is_published) VALUES
('cdt_aadhaar', 'aadhaar_id', 'Aadhaar Card / Valid Photo ID', 'ଆଧାର କାର୍ଡ / ବୈଧ ଫଟୋ ପରିଚୟ ପତ୍ର', 'identity', 'Name & DOB must match Matriculation certificate', 'ନାମ ଓ ଜନ୍ମ ତାରିଖ ମାଟ୍ରିକ୍ ପ୍ରମାଣପତ୍ର ସହିତ ମିଳିବା ଉଚିତ', 1, 10, 1),
('cdt_matric', 'matric_cert', '10th / HSE Certificate & Marksheet', 'ଦଶମ / ମାଟ୍ରିକ୍ ପ୍ରମାଣପତ୍ର ଓ ମାର୍କସିଟ୍', 'academic', 'Primary proof of Date of Birth & Odia subject pass', 'ଜନ୍ମ ତାରିଖ ଓ ଓଡ଼ିଆ ବିଷୟ ଉତ୍ତୀର୍ଣ୍ଣର ମୁଖ୍ୟ ପ୍ରମାଣ', 1, 20, 1),
('cdt_grad', 'grad_cert', 'Graduation / Highest Qualification Certificate', 'ସ୍ନାତକ / ଉଚ୍ଚତମ ଯୋଗ୍ୟତା ପ୍ରମାଣପତ୍ର', 'academic', 'Keep provisional/original degree & semester marksheets ready', 'ଅସ୍ଥାୟୀ/ମୂଳ ଡିଗ୍ରୀ ଓ ସେମିଷ୍ଟାର୍ ମାର୍କସିଟ୍ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ', 1, 30, 1),
('cdt_resident', 'resident_odisha', 'Odisha Resident / Nativity Certificate', 'ଓଡ଼ିଶା ସ୍ଥାୟୀ ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର', 'odisha_state', 'Issued via e-District Odisha by Tahasildar', 'ତହସିଲଦାରଙ୍କ ଦ୍ୱାରା e-District ଓଡ଼ିଶାରୁ ଜାରି', 1, 40, 1),
('cdt_caste', 'caste_sebc_cert', 'Caste / SEBC / EWS Certificate (if applicable)', 'ଜାତି / SEBC / EWS ପ୍ରମାଣପତ୍ର (ପ୍ରଯୁଜ୍ୟ ହେଲେ)', 'category', 'Verify validity window for SEBC/EWS before form submission', 'ଆବେଦନ ପୂର୍ବରୁ SEBC/EWS ବୈଧତା ଅବଧି ଯାଞ୍ଚ କରନ୍ତୁ', 0, 50, 1),
('cdt_odia', 'odia_pass_cert', 'Odia Language Pass Proof (ME Standard / HSC)', 'ଓଡ଼ିଆ ଭାଷା ଉତ୍ତୀର୍ଣ୍ଣ ପ୍ରମାଣ (ME / HSC)', 'odisha_state', 'Mandatory for OPSC, OSSC & OSSSC state recruitment', 'OPSC, OSSC ଓ OSSSC ନିଯୁକ୍ତି ପାଇଁ ବାଧ୍ୟତାମୂଳକ', 1, 60, 1),
('cdt_employment', 'employment_reg', 'Odisha Employment Exchange Registration', 'ଓଡ଼ିଶା ନିୟୋଜନ କାର୍ଯ୍ୟାଳୟ ପଞ୍ଜୀକରଣ', 'odisha_state', 'Valid registration card for state group-B/C posts', 'ରାଜ୍ୟ ଗ୍ରୁପ୍-B/C ପଦବୀ ପାଇଁ ବୈଧ ପଞ୍ଜୀକରଣ କାର୍ଡ', 0, 70, 1),
('cdt_photo', 'passport_photo_sig', 'Scanned Passport Photo & Signature (JPG)', 'ସ୍କାନ୍ ପାସପୋର୍ଟ ଫଟୋ ଓ ଦସ୍ତଖତ (JPG)', 'application', 'White background photo (20–50 KB) & clear signature (10–20 KB)', 'ଧଳା ପୃଷ୍ଠଭୂମି ଫଟୋ (20–50 KB) ଓ ସ୍ପଷ୍ଟ ଦସ୍ତଖତ', 1, 80, 1);
