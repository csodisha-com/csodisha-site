# Full-Stack Code & Architecture Audit Report — `csodisha.com`

**Scope:** Cloudflare Workers (`_worker.js`), Cloudflare D1 (`functions/_lib/`, `functions/api/`), and Static/Client Templates (`index.html`, `schemes/`, `jobs-careers/`, `community/`, `about/`, `about.html`, `signup.html`, `login.html`, `assets/shared-header.js`, `assets/app.js`).  
**Constraint:** Read-only audit. No application source files were modified.

---

## Executive Summary

| Area | Primary Findings | Highest Severity |
|---|---|---|
| 1. SSR vs. CSR Rendering Gaps | `/schemes/`, `/jobs-careers/`, `/community/`, and `/about/` serve empty CSR shells (`"Loading directory..."`, `"Unavailable"`, empty `#about-kpis`) instead of Worker-batched (`env.DB.batch()`) SSR HTML. | **P0** |
| 2. Routing, Canonicalization & Protocol Hygiene | No Worker-level HTTP→HTTPS 301 redirect in `_worker.js`; `?section=0` / `?section=1` / `?group=` query routes lack canonical consolidation; `JobPosting` JSON-LD is only on item pages (not `/jobs-careers/` listing). | **P0** |
| 3. Taxonomy & D1 Category Pruning | Zero `HAVING COUNT(...) >= 2` filtering across all 4 directory studios (`schemes`, `jobs`, `community`, `study-library`), exposing `0`-item and `1`-item buckets. | **P1** |
| 4. Global Header, Navigation Bloat & Duplicate DOM | Public exposure of Admin Portal button (missing `.cso-adm-stealth` class); duplicate `Login / Sign Up` DOM across desktop `#auth`, mobile drawer, and `#cso-nav-mobile-auth`; inconsistent `EN / ଓଡ଼ିଆ / हिन्दी` vs `EN / ଓଡ଼ିଆ` labels. | **P0** |
| 5. Template Consolidation (`/about/` vs `/about/?section=0` & `/about.html`) | Duplicate legacy `/about.html` alongside `/about/index.html`; `/about/` relies on CSR `/api/public/about-overview` and exposes internal folder/node engineering counts. | **P1** |
| 6. Form Security & Accessibility (`/signup` & `/login`) | `/signup.html` honeypot `#signup-website` uses off-screen CSS `.cso-u-b766d9af` and `aria-hidden="true"`, but lacks `aria-describedby` / `aria-invalid` on form inputs and client-side district list omits 9 of Odisha's 30 districts. | **P1** |

---

## 1. SSR vs. CSR Rendering Gaps (`/schemes/`, `/jobs-careers/`, `/community/`, `/about/`)

### Finding 1.1 — `/schemes/`, `/community/`, and `/about/` Serve Empty CSR Containers in Initial HTML
- **Severity:** **P0**
- **Exact File & Line:**
  - `schemes/index.html:100` (`<div id="schemes-domain-grid" class="cso-schemes-domain-grid"></div>`)
  - `community/index.html:100` (`<div id="community-domain-grid" class="cso-comm-domain-grid"></div>`)
  - `about/index.html:123-124` (`<div id="about-kpis" ...></div>`, `<div id="about-telemetry-bars" ...></div>`)
  - `_worker.js:1005-1019` (falls through to `env.ASSETS.fetch(request)` when `pathname` is `/schemes/`, `/community/`, `/about/`)
- **Current Code Pattern:**
  - `_worker.js` delegates `/schemes/*` to `handlePublicSchemesRoute` and `/community/*` to `handlePublicCommunityRoute`, which return `null` for the root `/schemes/` and `/community/` index paths. The static HTML files ship empty `<div>` containers populated only after client JS fetches `/api/public/schemes-directory/overview`, `/api/public/community-directory/overview`, and `/api/public/about-overview`.
- **Proposed Fix:**
  - Hydrate `/schemes/`, `/jobs-careers/`, `/community/`, and `/about/` server-side in `_worker.js` (or via `HTMLRewriter` / SSR renderer) using a single `env.DB.batch([...])` call per route so crawlers and low-bandwidth mobile users receive populated domain cards, live recruitment feeds, and `"CS Odisha by the Numbers"` KPIs in the initial HTTP 200 HTML response.

### Finding 1.2 — `/jobs-careers/` Renders `"Loading directory..."` & `"Unavailable"` Fallback on Initial Load
- **Severity:** **P0**
- **Exact File & Line:**
  - `jobs-careers/index.html:352` (`<p id="load-status" role="status" hidden>Loading directory...</p>`)
  - `jobs-careers/assets/dashboard.js:1793` (`if (liveCountEl) liveCountEl.textContent = 'Unavailable';`)
- **Current Code Pattern:**
  - `/jobs-careers/` is served as a static asset (`_worker.js:1019`), and `dashboard.js` populates the live recruitment count and directory items via client-side `fetch()`. If the API call is slow or fails, `#live-count` displays `"Unavailable"`.
- **Proposed Fix:**
  - Pre-render the initial top 12 published job notifications and live count on the server in `_worker.js` using `env.DB.batch()` and `HTMLRewriter`, passing the initial count in `data-initial-count` so `"Unavailable"` never flashes on initial load.

### Finding 1.3 — Sequential/Unbatched `Promise.all` D1 Queries Instead of `env.DB.batch()`
- **Severity:** **P1**
- **Exact File & Line:**
  - `functions/api/public/about-overview.js:18-42` (11 separate `safeCount(db, ...)` calls via `Promise.all`)
  - `functions/_lib/schemes-directory-studio.js:1641-1646` (4 separate `.all()` queries via `Promise.all`)
  - `functions/_lib/jobs-directory-studio.js:1770-1774` (3 separate `.all()` queries via `Promise.all`)
  - `functions/_lib/community-directory-studio.js:1494-1499` (4 separate `.all()` queries via `Promise.all`)
- **Current Code Pattern:**
  - Each overview endpoint issues 3–11 independent D1 round-trips inside `Promise.all(...)` rather than a single `env.DB.batch([...])` call.
- **Proposed Fix:**
  - Consolidate read-only overview queries into `await env.DB.batch([...])` (with `try/catch` fallback for optional tables) to cut D1 round-trip latency and Worker CPU time.

---

## 2. Routing, URL Canonicalization & Protocol Hygiene

### Finding 2.1 — Missing Worker-Level HTTP → HTTPS 301 Redirect
- **Severity:** **P0**
- **Exact File & Line:**
  - `_worker.js:340-355` (`export default { async fetch(request, env, ctx) { const url = new URL(request.url); ... } }`)
- **Current Code Pattern:**
  - `_worker.js` inspects `url.pathname` immediately without checking `url.protocol === 'http:'` (or `request.headers.get('x-forwarded-proto') === 'http'`).
- **Proposed Fix:**
  - Add an early guard at the top of `fetch()` in `_worker.js` (excluding `localhost` / `127.0.0.1` for local dev):
    ```js
    if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    ```

### Finding 2.2 — Query-Parameter Routes (`?section=`, `?group=`, `?resource=`) & Canonical Tags
- **Severity:** **P1**
- **Exact File & Line:**
  - `study-library/assets/dashboard.js:1149` (`// Handle URL Deep-Links (?group=, ?section=, ?q=, ?exam=, ?resource=)`)
  - `functions/api/content/_seo.js:546, 569, 585, 611` (`canonicalUrl: ${SITE_ORIGIN}/study-library/?group=...`, `/about/?group=...`, `/current-affairs/?slug=...`, `/mock-tests/?test=...`)
  - `about.html:1-12` (missing `<link rel="canonical">` completely)
- **Current Code Pattern:**
  - `_seo.js` emits query-parameter canonicals (`?group=`, `?slug=`, `?test=`) instead of clean path canonicals (`/study-library/<slug>/`, `/about/`), while legacy `?section=0`..`?section=9` URLs in `admin/data/seed-study-library*.json` are only handled client-side in `dashboard.js` and fall back to the static `/study-library/` canonical. `about.html` has no `<link rel="canonical">`.
- **Proposed Fix:**
  - 301-redirect legacy `?section=N` and `?group=<slug>` requests on `/about/` and `/study-library/` to clean path URLs (e.g., `/about/` or `/study-library/<group-slug>/`), add `<link rel="canonical" href="https://csodisha.com/about/">` to `about.html` (or 301 `/about.html` → `/about/`), and update `_seo.js` canonicals to clean path URLs.

### Finding 2.3 — Sitemap & JSON-LD Coverage (`JobPosting` / `BreadcrumbList`)
- **Severity:** **P2**
- **Exact File & Line:**
  - `_worker.js:856-865` (`/sitemap.xml`, `/sitemap-study-library.xml`, `/sitemap-jobs.xml`, `/sitemap-schemes.xml`, `/sitemap-community.xml` are all implemented)
  - `functions/_lib/jobs-directory-ssr.js:92, 218-222` (`BreadcrumbList` and `JobPosting` JSON-LD are emitted on SSR directory/item pages)
  - `jobs-careers/index.html` (lacks server-emitted `BreadcrumbList` / `ItemList` JSON-LD; `jobs-careers/assets/dashboard.js:1481` injects `JobPosting` only client-side)
- **Current Code Pattern:**
  - `/sitemap.xml` and SSR item `JobPosting` + `BreadcrumbList` schemas exist, but `/jobs-careers/` relies on client-side JS (`dashboard.js:1481`) to inject `JobPosting` JSON-LD.
- **Proposed Fix:**
  - Emit `BreadcrumbList` and `ItemList` (referencing `JobPosting` URLs) directly in `/jobs-careers/` SSR HTML so search engines index structured job data without executing JS.

---

## 3. Taxonomy & D1 Category Pruning

### Finding 3.1 — Unpruned `0`-Item and `1`-Item Category Buckets in D1 Queries
- **Severity:** **P1**
- **Exact File & Line:**
  - `functions/_lib/schemes-directory-studio.js:653, 1049, 1642-1645`
  - `functions/_lib/jobs-directory-studio.js:652, 998, 1771-1773`
  - `functions/_lib/community-directory-studio.js:850, 1415, 1495-1498`
  - `functions/_lib/study-library-studio.js:595, 767, 1469`
- **Current Code Pattern:**
  - All 4 directory studios query `SELECT ... FROM *_folders WHERE is_active = 1` and `SELECT folder_id, COUNT(*) AS cnt FROM *_items WHERE status = 'published' GROUP BY folder_id` separately without `HAVING COUNT(*) >= 2` (or filtering out empty/thin leaf buckets in public explorer responses).
- **Proposed Fix:**
  - For public category/filter facets (e.g., `sponsor_level`, `scheme_type`, `item_type`, `district_region`, `community_type`, and leaf folders), add `HAVING COUNT(*) >= 2` (or filter `item_count >= 2` on public overview responses while preserving full tree visibility in `/admin/`), and cache aggregated counts in KV/Edge Cache (`s-maxage=300`).

---

## 4. Global Header, Navigation Bloat & Duplicate DOM

### Finding 4.1 — Public Exposure of the `Admin Portal` Button (`.cso-adm-stealth` Omitted)
- **Severity:** **P0**
- **Exact File & Line:**
  - `index.html:75` (`<a class="adm cso-adm-icon-only" href="/admin/" role="button" aria-label="Admin" title="Admin">`)
  - `functions/_lib/ssr-shell.js:14` (`<a class="adm cso-adm-icon-only" href="/admin/" role="button" aria-label="Admin" title="Admin">`)
  - `assets/shared-header.js:1181` (`const adm = el('a', 'adm cso-adm-icon-only');`)
  - `assets/shared-header.js:1322` (`var links=document.querySelectorAll('.top .adm.cso-adm-stealth');`)
- **Current Code Pattern:**
  - `csoRevealAdminLink()` in `assets/shared-header.js:1320-1335` (and `assets/app.js:2430`) is designed to hide the Admin link unless `localStorage.getItem('cso_admin_active') === '1'` and `/api/admin/session` succeeds—**but** it queries `.top .adm.cso-adm-stealth`, whereas `index.html:75`, `ssr-shell.js:14`, and `shared-header.js:1181` omit `cso-adm-stealth`, leaving the `/admin/` shield button publicly visible to all visitors.
- **Proposed Fix:**
  - Add `cso-adm-stealth` to the `<a class="adm cso-adm-icon-only cso-adm-stealth" ...>` element in `index.html:75`, `functions/_lib/ssr-shell.js:14`, `assets/shared-header.js:1181`, and all static `.html` pages, and ensure `.adm.cso-adm-stealth:not(.is-admin-visible) { display: none; }` is enforced in `assets/style.css`.

### Finding 4.2 — Duplicate `Login / Sign Up` DOM Across Desktop & Mobile Containers
- **Severity:** **P1**
- **Exact File & Line:**
  - `assets/shared-header.js:663-665` (desktop `#auth` Login/Sign Up)
  - `assets/shared-header.js:687-691` (mobile account drawer Login/Sign Up)
  - `assets/shared-header.js:852-856` (`#cso-nav-mobile-auth` inside mobile nav drawer)
  - `assets/shared-header.js:942-946` (duplicate `#cso-nav-mobile-auth` block in `renderNav`)
- **Current Code Pattern:**
  - `Login` and `Sign Up` buttons/links are created in 4 separate places across `shared-header.js` (and duplicated again in `assets/app.js:286-291, 590-601`).
- **Proposed Fix:**
  - Extract a single `createAuthActionPair(className)` helper in `assets/shared-header.js` and `assets/app.js`, and remove the redundant mobile auth drawer duplication so only one mobile auth block and one desktop `#auth` block exist.

### Finding 4.3 — Language Switcher Consistency (`EN / ଓଡ଼ିଆ / हिन्दी` vs `EN / ଓଡ଼ିଆ`)
- **Severity:** **P2**
- **Exact File & Line:**
  - `assets/shared-header.js:96, 441-443, 1278` (`LN = { en: 'English', or: 'ଓଡ଼ିଆ', hi: 'हिन्दी' }`)
  - `about/assets/about-explorer.js:62, 77-79` (only supports `'en'` and `'or'`, ignoring `'hi'`)
- **Current Code Pattern:**
  - The global header and footer offer 3 languages (`English`, `ଓଡ଼ିଆ`, `हिन्दी`), while explorer modules like `about-explorer.js` and `schemes-explorer.js` only have `en` / `or` dictionaries, causing `hi` selections to silently fall back to English.
- **Proposed Fix:**
  - Standardize the public portal language switcher or add clear fallback notices / Hindi translations where `hi` is offered, and audit `assets/shared-header.js` for any unused icon+text labels.

---

## 5. Template Consolidation (`/about/` vs `/about/?section=0` & `/about.html`)

### Finding 5.1 — Duplicate `/about.html` & `/about/index.html` + Internal Engineering Jargon
- **Severity:** **P1**
- **Exact File & Line:**
  - `about.html:1-111` (legacy static About page with `.cso-u-bfa03e44` / `.cso-u-8b816fa1` utility classes and no canonical tag)
  - `about/index.html:1-523` (newer 4-pillar About portal)
  - `functions/api/public/about-overview.js:44-45, 91-92` (`totalFolders`, `totalDirectoryItems` folder/node counts)
- **Current Code Pattern:**
  - Both `/about.html` and `/about/index.html` exist as separate templates. `/about/?section=0` renders `about/index.html` (because query params are ignored by static asset routing), while `about-overview.js` exposes internal `folders` / `totalFolders` taxonomy counts.
- **Proposed Fix:**
  - 301-redirect `/about.html` → `/about/` (and `/about/?section=*` → `/about/`) in `_worker.js`, delete or deprecate `about.html`, and replace internal `folders`/`totalFolders` jargon in `about-overview.js` & `about/assets/about-explorer.js` with citizen-facing labels (`"Verified Guides"`, `"Active Districts"`, `"Official Portals"`).

---

## 6. Form Security & Accessibility (`/signup` & `/login`)

### Finding 6.1 — `/signup.html` Honeypot & Missing `aria-describedby` / `aria-invalid` Attributes
- **Severity:** **P1**
- **Exact File & Line:**
  - `signup.html:122-125` (`<div class="cso-u-b766d9af" aria-hidden="true"><label for="signup-website">Website</label><input type="text" id="signup-website" name="website" tabindex="-1" autocomplete="off"></div>`)
  - `assets/style.css:8919` (`html body .cso-u-b766d9af{position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden}`)
  - `signup.html:72-94` (`#signup-district` `<select>` lists only 21 of Odisha's 30 districts)
  - `signup.html:40-119` & `login.html:45-80` (password hints and error boxes are not linked via `aria-describedby` or `aria-invalid`)
- **Current Code Pattern:**
  - The honeypot `#signup-website` is hidden via `.cso-u-b766d9af` (`left:-9999px;height:0`), which works if `style.css` loads, but if CSS fails or in reader mode it renders as a visible `"Website"` input; `signup.html` also omits 9 Odisha districts (`Boudh`, `Deogarh`, `Gajapati`, `Kandhamal`, `Malkangiri`, `Nabarangpur`, `Nayagarh`, `Nuapada`, `Subarnapur`) and lacks `aria-describedby` linking inputs to `.form-hint` / `#auth-error` and `aria-invalid="true"` on validation failure in `assets/js/pages/signup.js`.
- **Proposed Fix:**
  - Add `hidden` attribute (or `clip: rect(0 0 0 0); clip-path: inset(50%);`) on `.cso-u-b766d9af` so the honeypot stays hidden even without CSS, populate all 30 Odisha districts in `#signup-district`, and wire `aria-describedby` + `aria-invalid` in `signup.html`, `login.html`, and `assets/js/pages/signup.js`.
