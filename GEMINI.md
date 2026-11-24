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
- When a category or section has `0` items in D1, render a clean, CSP-safe empty state on public pages rather than falling back to hardcoded dummy/directory data.

## 4. Required Verification Before Finishing Any Change
Always run the full verification suite before completing any task and ensure all checks pass:

```bash
node scripts/test-deep-purge-v232.mjs && node scripts/test-clean-slate-live-sync-v231.mjs && node scripts/test-navigation-restructure-v230.mjs && node scripts/test-extended-jobs-details-v229.mjs && node scripts/test-d1-read-optimization-v228.mjs && node scripts/test-odisha-jobs-details-v227.mjs && node scripts/audit-links.js
```
