-- Migration 0130: Composite Indexes for D1 Read Quota Optimization (v228)
-- Strictly idempotent (safe for both --local and --remote execution).

CREATE INDEX IF NOT EXISTS idx_posts_type_l1_active ON posts(type, l1_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_taxonomy_pub ON posts(type, section_slug, l1_code, l2_code, status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_pages_route_status ON site_pages(route, status);
CREATE INDEX IF NOT EXISTS idx_site_redirects_old_route ON site_redirects(old_route);
