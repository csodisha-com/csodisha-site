-- 0111_seo_search_discovery_batch1.sql
-- SEO, Search & Discovery Batch 1 (v111): Modules 01-04
-- 01 Meta Tags & OpenGraph | 02 Dynamic JSON-LD | 03 XML Sitemaps | 04 RSS/Atom Syndication

CREATE TABLE IF NOT EXISTS seo_meta_profiles (
  id TEXT PRIMARY KEY,
  route_pattern TEXT NOT NULL UNIQUE,
  portal_section TEXT NOT NULL DEFAULT 'home',
  meta_title_en TEXT NOT NULL,
  meta_title_or TEXT NOT NULL DEFAULT '',
  meta_description_en TEXT NOT NULL DEFAULT '',
  meta_description_or TEXT NOT NULL DEFAULT '',
  keywords_en TEXT NOT NULL DEFAULT '',
  keywords_or TEXT NOT NULL DEFAULT '',
  og_type TEXT NOT NULL DEFAULT 'website' CHECK (og_type IN ('website', 'article', 'educational_resource')),
  og_image_url TEXT NOT NULL DEFAULT 'https://csodisha.com/assets/brand/cso-og-default.png',
  twitter_card TEXT NOT NULL DEFAULT 'summary_large_image' CHECK (twitter_card IN ('summary_large_image', 'summary')),
  robots_directive TEXT NOT NULL DEFAULT 'index, follow' CHECK (robots_directive IN ('index, follow', 'noindex, follow', 'noindex, nofollow')),
  title_char_count INTEGER NOT NULL DEFAULT 0,
  desc_char_count INTEGER NOT NULL DEFAULT 0,
  seo_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active_live' CHECK (status IN ('active_live', 'draft', 'archived')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_meta_status ON seo_meta_profiles(portal_section, status);

CREATE TABLE IF NOT EXISTS seo_jsonld_schemas (
  id TEXT PRIMARY KEY,
  schema_code TEXT NOT NULL UNIQUE,
  schema_type TEXT NOT NULL DEFAULT 'EducationalOrganization' CHECK (schema_type IN ('EducationalOrganization', 'JobPosting', 'GovernmentService', 'Quiz', 'FAQPage', 'Article', 'BreadcrumbList')),
  target_route_pattern TEXT NOT NULL DEFAULT '/',
  name_en TEXT NOT NULL,
  name_or TEXT NOT NULL DEFAULT '',
  schema_payload_json TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'valid_schema_org' CHECK (validation_status IN ('valid_schema_org', 'warning_missing_optional', 'invalid_json')),
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_jsonld_route ON seo_jsonld_schemas(target_route_pattern, is_active);

CREATE TABLE IF NOT EXISTS seo_xml_sitemaps (
  id TEXT PRIMARY KEY,
  sitemap_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  portal_scope TEXT NOT NULL DEFAULT 'all',
  changefreq TEXT NOT NULL DEFAULT 'daily' CHECK (changefreq IN ('always', 'hourly', 'daily', 'weekly', 'monthly')),
  priority_decimal TEXT NOT NULL DEFAULT '0.8',
  include_odia_hreflang INTEGER NOT NULL DEFAULT 1,
  url_count INTEGER NOT NULL DEFAULT 0,
  last_generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_sitemaps_status ON seo_xml_sitemaps(status, sitemap_key);

CREATE TABLE IF NOT EXISTS seo_syndication_feeds (
  id TEXT PRIMARY KEY,
  feed_slug TEXT NOT NULL UNIQUE,
  feed_format TEXT NOT NULL DEFAULT 'rss_2_0' CHECK (feed_format IN ('rss_2_0', 'atom_1_0', 'json_feed_1_1')),
  portal_source TEXT NOT NULL DEFAULT 'all' CHECK (portal_source IN ('jobs-careers', 'schemes', 'study-library', 'all')),
  title_en TEXT NOT NULL,
  title_or TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_or TEXT NOT NULL DEFAULT '',
  language_mode TEXT NOT NULL DEFAULT 'bilingual' CHECK (language_mode IN ('en-IN', 'or-IN', 'bilingual')),
  max_items INTEGER NOT NULL DEFAULT 30,
  cache_ttl_sec INTEGER NOT NULL DEFAULT 300,
  subscribers_approx INTEGER NOT NULL DEFAULT 0,
  feed_status TEXT NOT NULL DEFAULT 'active_live' CHECK (feed_status IN ('active_live', 'paused', 'archived')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_feeds_status ON seo_syndication_feeds(feed_status, feed_format);

CREATE TABLE IF NOT EXISTS seo_revisions (
  id TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_rev_lookup ON seo_revisions(module_code, entity_id, version_num DESC);
