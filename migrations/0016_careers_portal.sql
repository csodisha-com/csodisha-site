-- v269 Careers Portal & Publishing House Schema
-- Tables: careers_articles, career_taxonomy_nodes

CREATE TABLE IF NOT EXISTS careers_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  track_slug TEXT NOT NULL DEFAULT 'civil-services',
  region_scope TEXT NOT NULL DEFAULT 'odisha' CHECK (region_scope IN ('odisha', 'central', 'all-india')),
  career_stage TEXT NOT NULL DEFAULT 'graduate',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_or TEXT NOT NULL DEFAULT '',
  roadmap_body_en TEXT NOT NULL DEFAULT '',
  roadmap_body_or TEXT NOT NULL DEFAULT '',
  eligibility_summary TEXT NOT NULL DEFAULT '',
  salary_band TEXT NOT NULL DEFAULT '',
  key_exams TEXT NOT NULL DEFAULT '',
  official_links_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_careers_articles_status_track
  ON careers_articles(status, track_slug, region_scope, career_stage);

CREATE INDEX IF NOT EXISTS idx_careers_articles_featured
  ON careers_articles(status, featured DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_careers_articles_slug
  ON careers_articles(slug);

CREATE TABLE IF NOT EXISTS career_taxonomy_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('track', 'region', 'stage')),
  slug TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_or TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(kind, slug)
);

CREATE INDEX IF NOT EXISTS idx_career_taxonomy_kind_active
  ON career_taxonomy_nodes(kind, active, sort_order);

-- Pre-seed 6 core Career Tracks
INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, slug, label_en, label_or, sort_order, active) VALUES
  ('ctax-track-civil-services', 'track', 'civil-services', 'Civil Services', 'ସିଭିଲ୍ ସର୍ଭିସେସ୍', 1, 1),
  ('ctax-track-engineering-it', 'track', 'engineering-it', 'Engineering / IT', 'ଇଞ୍ଜିନିୟରିଂ ଓ ଆଇଟି', 2, 1),
  ('ctax-track-banking-finance', 'track', 'banking-finance', 'Banking & Finance', 'ବ୍ୟାଙ୍କିଂ ଓ ଅର୍ଥନୀତି', 3, 1),
  ('ctax-track-healthcare', 'track', 'healthcare', 'Healthcare', 'ସ୍ୱାସ୍ଥ୍ୟସେବା', 4, 1),
  ('ctax-track-agriculture', 'track', 'agriculture', 'Agriculture', 'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ', 5, 1),
  ('ctax-track-pathways', 'track', 'pathways', 'Career Stage & Pathways', 'କ୍ୟାରିୟର ପର୍ଯ୍ୟାୟ ଓ ମାର୍ଗଦର୍ଶନ', 6, 1);

-- Pre-seed 3 Regions / Scopes
INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, slug, label_en, label_or, sort_order, active) VALUES
  ('ctax-region-odisha', 'region', 'odisha', 'Odisha', 'ଓଡ଼ିଶା', 1, 1),
  ('ctax-region-central', 'region', 'central', 'Central', 'କେନ୍ଦ୍ର ସରକାର', 2, 1),
  ('ctax-region-all-india', 'region', 'all-india', 'All Over India', 'ସମଗ୍ର ଭାରତ', 3, 1);

-- Pre-seed 5 Career Stages
INSERT OR IGNORE INTO career_taxonomy_nodes (id, kind, slug, label_en, label_or, sort_order, active) VALUES
  ('ctax-stage-after-10th-12th', 'stage', 'after-10th-12th', 'After 10th / 12th', 'ଦଶମ / ଦ୍ୱାଦଶ ପରେ', 1, 1),
  ('ctax-stage-graduate', 'stage', 'graduate', 'Graduate', 'ସ୍ନାତକ', 2, 1),
  ('ctax-stage-postgraduate', 'stage', 'postgraduate', 'Postgraduate', 'ସ୍ନାତକୋତ୍ତର', 3, 1),
  ('ctax-stage-internship-apprenticeship', 'stage', 'internship-apprenticeship', 'Internship & Apprenticeship', 'ଇଣ୍ଟର୍ନସିପ୍ ଓ ଆପ୍ରେଣ୍ଟିସ୍', 4, 1),
  ('ctax-stage-all-stages', 'stage', 'all-stages', 'All Stages', 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ', 5, 1);
