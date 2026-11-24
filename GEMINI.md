# CS Odisha Site — Project Instructions

## 1. Architecture & Tech Stack
- This site is built exclusively with **static HTML**, **vanilla JavaScript**, **plain CSS**, and **Cloudflare Pages/Workers** (`_worker.js`, `functions/`) backed by **Cloudflare D1** (`cso-database`, binding `DB` in `wrangler.json`).
- **Never** add React, Vite, Tailwind CSS, frontend build/bundler frameworks, or external CDNs. Keep all assets self-hosted and zero-build.

## 2. Strict CSP Compliance
- All pages must comply with the strict Content Security Policy configured in `_headers` (`default-src 'self'; script-src 'self'; style-src 'self'; ...`).
- **Never** use `.innerHTML`, `.outerHTML`, or `insertAdjacentHTML` — construct DOM nodes safely with `document.createElement`, `textContent`, and `appendChild`/`replaceChildren`.
- **Never** use `.style.*` in JavaScript or inline `style=""` / `onclick=""` (or other `on*=""`) attributes in HTML — use external CSS classes and `addEventListener` in self-hosted JS files instead.

## 3. Navigation & Module Integrity (7-Pillar Architecture)
- Preserve all **7 pillars (folders)** and **28 modules** defined in `admin/data/master-navigation.json` (and synchronized in D1 `nav_categories` / `nav_menu_items` via `migrations/0131_restructure_7_pillar_navigation.sql` and `functions/_lib/categories-nav-batch1.js` / `batch2.js`):
  1. **Home & Live Updates** (Homepage Overview, Live Recruitment Alerts, Today's Current Affairs, Annual Exam Calendar)
  2. **Jobs & Recruitment** (Odisha State Govt: OPSC/OSSC/OSSSC/Police, Central Govt: UPSC/SSC/RRB/Banking, PSUs & Apprenticeships, Notification Lifecycle Tracker)
  3. **Study Library & Current Affairs** (Syllabi & Exam Patterns, Solved PYQs, Bilingual Study Notes, Daily Current Affairs & 5-MCQ Capsules)
  4. **Mock Tests & Practice** (Odisha Govt Mock Tests, Central Govt CBT Tests, Sectional & Speed Drills, Scoreboard & Analytics)
  5. **Schemes & Scholarships** (Odisha State Welfare Schemes, Central Govt Schemes, Post-Matric & Merit Scholarships, Eligibility Matcher)
  6. **Student Tools & Verified Portals** (Age Eligibility Calculator, Photo & Signature Resizer, Document Readiness Checklist, Official .gov.in Portals Directory)
  7. **Community & Support** (Student Discussion Forum, Help & FAQs, Report an Error / Suggest Resource, About & Legal Policies)
- Keep `assets/shared-header.js`, `assets/app.js`, and the Admin Studio navigation tree (`admin/admin.js`, `admin/suite-live.js`, `admin/categories-nav-batch1.js`) bilingual-ready (English + Odia) and mapped to verified live routes with zero 404s.

## 4. Required Verification Before Finishing Any Change
Always run the full verification suite before completing any task and ensure all checks pass:

```bash
node scripts/test-navigation-restructure-v230.mjs && node scripts/test-extended-jobs-details-v229.mjs && node scripts/test-d1-read-optimization-v228.mjs && node scripts/test-odisha-jobs-details-v227.mjs && node scripts/audit-links.js
```
