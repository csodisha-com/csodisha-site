-- Migration 0143: Site-Wide D1 Composite Performance Indexes (v260)
-- Covers all hot filter, taxonomy, slug lookup, and sort columns across Jobs, Schemes,
-- Study Library, Community, and About publishing house tables.

-- 1. Jobs & Careers
CREATE INDEX IF NOT EXISTS idx_perf_job_articles_pub_cat_date
  ON job_articles (is_published, category_l1_id, category_l2_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_job_articles_pub_feat_upd
  ON job_articles (is_published, is_featured DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_job_articles_slug
  ON job_articles (slug);
CREATE INDEX IF NOT EXISTS idx_perf_job_tax_pub_level
  ON job_taxonomy_nodes (is_published, level, sort_order, title_en);

-- 2. Schemes & Benefits
CREATE INDEX IF NOT EXISTS idx_perf_scheme_articles_pub_cat_date
  ON scheme_articles (is_published, category_l1_id, category_l2_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_scheme_articles_pub_feat_upd
  ON scheme_articles (is_published, is_featured DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_scheme_articles_slug
  ON scheme_articles (slug);
CREATE INDEX IF NOT EXISTS idx_perf_scheme_tax_pub_level
  ON scheme_taxonomy_nodes (is_published, level, sort_order, title_en);

-- 3. Study Library
CREATE INDEX IF NOT EXISTS idx_perf_study_articles_pub_cat_date
  ON study_articles (is_published, category_l1_id, category_l2_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_study_articles_pub_feat_upd
  ON study_articles (is_published, is_featured DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_study_articles_slug
  ON study_articles (slug);
CREATE INDEX IF NOT EXISTS idx_perf_study_tax_pub_level
  ON study_taxonomy_nodes (is_published, level, sort_order, title_en);

-- 4. Community & Civic Networks
CREATE INDEX IF NOT EXISTS idx_perf_comm_posts_mod_pin_created
  ON community_posts (moderation_status, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_comm_posts_mod_cat_created
  ON community_posts (moderation_status, category_l1_id, category_l2_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_comm_posts_slug
  ON community_posts (slug);
CREATE INDEX IF NOT EXISTS idx_perf_comm_replies_post_created
  ON community_post_replies (post_id, moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_comm_tax_pub_level
  ON community_taxonomy_nodes (is_published, level, sort_order, title_en);

-- 5. About & Institutional Transparency
CREATE INDEX IF NOT EXISTS idx_perf_about_articles_pub_cat_date
  ON about_articles (is_published, category_l1_id, category_l2_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_about_articles_pub_feat_upd
  ON about_articles (is_published, is_featured DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_about_articles_slug
  ON about_articles (slug);
CREATE INDEX IF NOT EXISTS idx_perf_about_tax_pub_level
  ON about_taxonomy_nodes (is_published, level, sort_order, title_en);
CREATE INDEX IF NOT EXISTS idx_perf_about_sources_pub_sec_sort
  ON about_official_sources (is_published, is_verified, sector, sort_order);
