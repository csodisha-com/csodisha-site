CREATE TABLE IF NOT EXISTS site_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route TEXT NOT NULL UNIQUE,
  title TEXT, meta_description TEXT, category TEXT,
  hero_title TEXT, hero_subtitle TEXT, cta_label TEXT, cta_url TEXT,
  blocks_json TEXT, reusable_sections_json TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  publish_at TEXT, created_by TEXT, updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_site_pages_status ON site_pages(status, publish_at);
CREATE TABLE IF NOT EXISTS site_page_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route TEXT NOT NULL, snapshot_json TEXT NOT NULL, editor_email TEXT, note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_site_page_rev_route ON site_page_revisions(route, id DESC);
