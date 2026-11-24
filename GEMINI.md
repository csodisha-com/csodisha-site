# CS Odisha Site — Project Instructions

## 1. Architecture & Tech Stack
- This site is built exclusively with **static HTML**, **vanilla JavaScript**, **plain CSS**, and **Cloudflare Pages/Workers** (`_worker.js`, `functions/`) backed by **Cloudflare D1** (`cso-database`, binding `DB` in `wrangler.json`).
- **Never** add React, Vite, Tailwind CSS, frontend build/bundler frameworks, or external CDNs. Keep all assets self-hosted and zero-build.

## 2. Strict CSP Compliance
- All pages must comply with the strict Content Security Policy configured in `_headers` (`default-src 'self'; script-src 'self'; style-src 'self'; ...`).
- **Never** use `.innerHTML`, `.outerHTML`, or `insertAdjacentHTML` — construct DOM nodes safely with `document.createElement`, `textContent`, and `appendChild`/`replaceChildren`.
- **Never** use `.style.*` in JavaScript or inline `style=""` / `onclick=""` (or other `on*=""`) attributes in HTML — use external CSS classes and `addEventListener` in self-hosted JS files instead.

## 3. Clean-Slate 5-Pillar Navigation & Live D1 Sync (`v231`)
- Preserve the **5 clean top-level navigation pillars** in `admin/data/master-navigation.json` (with empty child module/category lists ready to be authored afresh in `/admin/`) and synchronized in D1 via `migrations/0132_clean_slate_navigation_sync.sql` and `functions/_lib/categories-nav-batch1.js`:
  1. **Jobs & Careers** (`/jobs-careers/`)
  2. **Schemes & Benefits** (`/schemes-benefits/`)
  3. **Study Library** (`/study-library/`)
  4. **Community** (`/community/`)
  5. **About** (`/about/`)
- **Never** reintroduce bulky hardcoded static directory trees, mega-menu link piles, or auto-seeding loops (`ensureVerifiedUpscSeedNotice`, `ODISHA_1_2_SEEDS`, `NATIONAL_1_1_SEEDS`). All categories, submenus, and content items are controlled strictly from `/admin/` via Cloudflare D1.
- Every Admin Panel mutation (`POST`, `PUT`, `PATCH`, `DELETE`) must immediately invalidate isolate and edge caches (`invalidateAllPublicCaches`, `resetPublicContentMemo`, `invalidateSitePagesCache`, `resetAboutOverviewMemo`) so public `/api/nav/config` and `/api/content/*` stay in real-time sync.
- When a category or section has `0` items in D1, render a clean, CSP-safe empty state on public pages and keep explorer left sidebars clean (no hardcoded `Overview` buttons, `DIRECTORY SECTIONS` labels, or `PORTAL LINKS`) until dynamic Admin-published categories exist from `/api/nav/config` or D1.

## 3b. Homepage Studio (`v242`) & Executive Command Suite (`v243`)
- Homepage features (Popular Searches, Latest Updates tabs, Opportunity Compass, Trending Topics, Important Tools, Action Hub) live in the D1 `homepage_blocks` table (`migrations/0136_homepage_studio.sql`) and are managed from **Homepage Studio** in `/admin/` (`admin/homepage-studio.js`, `functions/_lib/homepage-studio.js`, `/api/admin/homepage-blocks`).
- The public homepage hydrates from `GET /api/public/homepage-blocks` via `assets/js/homepage-blocks.js` (CSP-safe DOM APIs); the static markup in `index.html` is only the graceful fallback. Click telemetry: `POST /api/public/homepage-blocks/click`.
- **Executive Command Suite (`v243`):** `/admin/` defaults to **Command Overview** (`admin/command-suite.js`, `admin/command-suite.css`, `functions/_lib/command-suite.js`), backed by live D1/R2 endpoints (`/api/admin/overview-stats`, `/api/admin/audit-feed`, `/api/admin/system-diagnostics`, `/api/admin/purge-caches`, `/api/admin/command-index`, `/api/admin/media-library`, `/api/admin/slug-check`, `/api/admin/bulk-content`), with `Ctrl+K` Command Palette, `Alt+0..6` / `Ctrl+S` shortcuts, autosave draft recovery, bilingual/SEO pre-flight validation, R2 media drawer, and bulk CSV/JSON operations.
- **Candidate Hub, Governance & Dashboard UI/Feature Studio (`v244`):** Unified **Candidate Hub** module in `/admin/` (`admin/candidate-hub-studio.js`, `admin/candidate-hub-studio.css`, `functions/_lib/candidate-hub-governance.js`, `migrations/0137_candidate_hub_governance.sql`) with `Alt+7` shortcut & `Ctrl+K` integration controlling `/student-dashboard/` (`/candidate/`) live from D1 (`candidate_hub_modules`, `candidate_hub_ui_config`, `candidate_doc_templates`, `candidate_governance`, `candidate_assigned_items`), including Candidates Roster + 360° Authority Drawer (Block/Unblock, Force Logout `session_version`, Tiers, per-candidate module overrides), 4-Theme Dashboard UI Manager, Custom Feature Builder, Targeted Content Push (R2 Media Picker), and Document Vault Templates.
- Service worker / ops sentinel cache version is `cso-candidate-cache-v246`.

## 4. Required Verification Before Finishing Any Change
Always run the full verification suite before completing any task and ensure all checks pass:

```bash
node scripts/test-candidate-direct-push-v246.mjs && node scripts/test-candidate-hub-polish-v245.mjs && node scripts/test-candidate-hub-governance-v244.mjs && node scripts/test-admin-command-suite-v243.mjs && node scripts/test-homepage-studio-v242.mjs && node scripts/test-admin-homepage-themes-v240.mjs && node scripts/test-zero-leftovers-v238.mjs && node scripts/test-minimal-explorers-v236.mjs && node scripts/test-about-clean-slate-v235.mjs && node scripts/test-explorer-clean-slate-v234.mjs && node scripts/test-full-clean-slate-v233.mjs && node scripts/test-deep-purge-v232.mjs && node scripts/test-clean-slate-live-sync-v231.mjs && node scripts/test-navigation-restructure-v230.mjs && node scripts/test-extended-jobs-details-v229.mjs && node scripts/test-d1-read-optimization-v228.mjs && node scripts/test-odisha-jobs-details-v227.mjs && node scripts/test-ops-sentinel.mjs && node scripts/audit-links.js
```
