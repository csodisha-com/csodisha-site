-- Educational Resources Batch 5 (v82): Modules 17-20
-- 17 Downloads & Access Rules | 18 Government Schemes | 19 Scholarships | 20 Career Explorer

CREATE TABLE IF NOT EXISTS edu_access_rules (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  rule_name_en TEXT NOT NULL,
  rule_name_or TEXT NOT NULL DEFAULT '',
  target_scope TEXT NOT NULL DEFAULT 'all_resources' CHECK (target_scope IN (
    'all_resources', 'notes_pdf', 'book_reference', 'pyq_paper', 'mock_test', 'collection'
  )),
  access_policy TEXT NOT NULL DEFAULT 'public_open' CHECK (access_policy IN (
    'public_open', 'registered_free', 'verified_student', 'rate_limited'
  )),
  daily_download_limit INTEGER NOT NULL DEFAULT 0,
  watermark_footer_enabled INTEGER NOT NULL DEFAULT 1,
  watermark_text_template TEXT NOT NULL DEFAULT 'Downloaded from Common Sense Odisha (csodisha.com) — Free Public Education',
  offline_cache_allowed INTEGER NOT NULL DEFAULT 1,
  attribution_required INTEGER NOT NULL DEFAULT 1,
  priority_order INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_access_rules_scope ON edu_access_rules(target_scope, status, priority_order);

CREATE TABLE IF NOT EXISTS edu_scholarships (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL DEFAULT 'Odisha State Govt' CHECK (provider_type IN (
    'Odisha State Govt', 'Central Govt / NSP', 'UGC / AICTE / CSIR', 'Private / CSR Foundation'
  )),
  department_or_agency TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  eligible_stages_json TEXT NOT NULL DEFAULT '[]',
  category_eligibility TEXT NOT NULL DEFAULT 'All' CHECK (category_eligibility IN (
    'All', 'SC/ST', 'OBC/SEBC', 'Minority', 'EWS', 'Girls/Women', 'PwD'
  )),
  income_limit_inr INTEGER NOT NULL DEFAULT 0,
  min_marks_pct REAL NOT NULL DEFAULT 0,
  award_amount_text TEXT NOT NULL DEFAULT '',
  application_start TEXT NOT NULL DEFAULT '',
  application_deadline TEXT NOT NULL DEFAULT '',
  apply_url TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_schol_status_cat ON edu_scholarships(status, category_eligibility, application_deadline);

CREATE TABLE IF NOT EXISTS edu_career_paths (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  entry_stage TEXT NOT NULL DEFAULT 'After +2 Science' CHECK (entry_stage IN (
    'After Class 10', 'After +2 Science', 'After +2 Arts', 'After +2 Commerce', 'After Graduation', 'After Post-Graduation'
  )),
  career_domain TEXT NOT NULL DEFAULT 'Civil Services & Admin' CHECK (career_domain IN (
    'Civil Services & Admin', 'Teaching & Academia', 'Engineering & IT', 'Medical & Allied Health', 'Banking & Finance', 'Defence & Police', 'Skill & Entrepreneurship'
  )),
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  roadmap_steps_json TEXT NOT NULL DEFAULT '[]',
  recommended_exams_json TEXT NOT NULL DEFAULT '[]',
  avg_salary_range TEXT NOT NULL DEFAULT '',
  odisha_opportunities_en TEXT NOT NULL DEFAULT '',
  odisha_opportunities_or TEXT NOT NULL DEFAULT '',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_career_stage_dom ON edu_career_paths(entry_stage, career_domain, status);

CREATE TABLE IF NOT EXISTS edu_batch5_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL CHECK (module_code IN ('17', '18', '19', '20')),
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_edu_b5_rev_entity ON edu_batch5_revisions(module_code, entity_id, version_num DESC);
