-- Payments & Finance Batch 2 (v92): Modules 05-08
-- 05 Paid Resources | 06 Products & Pricing | 07 Subscriptions | 08 Memberships
-- Idempotent. fin_revisions (Batch 1) is reused with module_code '05'..'08'. All money is integer paise.
-- Odisha INR starter records are seeded by ensurePaymentsFinanceBatch2Schema() when tables are empty.

CREATE TABLE IF NOT EXISTS fin_paid_resources (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      source_module_code TEXT NOT NULL DEFAULT '01' CHECK (source_module_code IN ('01','02','03','04','11','14','16')),
      source_entity_id TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      access_model TEXT NOT NULL DEFAULT 'one_time_purchase' CHECK (access_model IN ('one_time_purchase','freemium_preview','member_only')),
      price_paise INTEGER NOT NULL DEFAULT 0,
      mrp_paise INTEGER NOT NULL DEFAULT 0,
      gst_rate_pct INTEGER NOT NULL DEFAULT 18,
      preview_page_limit INTEGER NOT NULL DEFAULT 0,
      validity_days INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      revenue_paise INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_paid_res_status ON fin_paid_resources(status, access_model);

CREATE TABLE IF NOT EXISTS fin_products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      sku_code TEXT NOT NULL UNIQUE,
      product_type TEXT NOT NULL DEFAULT 'study_kit' CHECK (product_type IN ('mock_test_bundle','study_kit','ebook_pack','mentorship_session','foundation_batch')),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      price_paise INTEGER NOT NULL DEFAULT 0,
      mrp_paise INTEGER NOT NULL DEFAULT 0,
      gst_rate_pct INTEGER NOT NULL DEFAULT 18,
      hsn_sac_code TEXT NOT NULL DEFAULT '999293',
      included_items_json TEXT NOT NULL DEFAULT '[]',
      stock_or_seat_limit INTEGER NOT NULL DEFAULT 0,
      sold_count INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_products_status ON fin_products(status, product_type);

CREATE TABLE IF NOT EXISTS fin_subscription_plans (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      plan_code TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_or TEXT NOT NULL DEFAULT '',
      billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','quarterly','half_yearly','annual')),
      price_paise INTEGER NOT NULL DEFAULT 0,
      mrp_paise INTEGER NOT NULL DEFAULT 0,
      trial_days INTEGER NOT NULL DEFAULT 0,
      gst_rate_pct INTEGER NOT NULL DEFAULT 18,
      perks_json TEXT NOT NULL DEFAULT '[]',
      active_subscribers_count INTEGER NOT NULL DEFAULT 0,
      auto_renew_default INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_sub_plans_status ON fin_subscription_plans(status, billing_interval);

CREATE TABLE IF NOT EXISTS fin_memberships (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      tier_code TEXT NOT NULL DEFAULT 'pro_aspirant' CHECK (tier_code IN ('free_scholar','pro_aspirant','opsc_elite','institutional')),
      tier_name_en TEXT NOT NULL,
      tier_name_or TEXT NOT NULL DEFAULT '',
      badge_label_en TEXT NOT NULL DEFAULT '',
      badge_label_or TEXT NOT NULL DEFAULT '',
      price_paise INTEGER NOT NULL DEFAULT 0,
      duration_days INTEGER NOT NULL DEFAULT 365,
      download_quota_daily INTEGER NOT NULL DEFAULT 3,
      mock_test_access_level TEXT NOT NULL DEFAULT 'free_only' CHECK (mock_test_access_level IN ('free_only','all_mocks','all_mocks_plus_mentorship')),
      offline_packs_allowed INTEGER NOT NULL DEFAULT 0,
      ad_free_experience INTEGER NOT NULL DEFAULT 0,
      active_members_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE INDEX IF NOT EXISTS idx_fin_memberships_status ON fin_memberships(status, sort_order);
