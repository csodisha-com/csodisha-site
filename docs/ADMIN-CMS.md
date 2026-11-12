# Admin CMS & Master Command Suite

`/admin/` is the **Master Command Suite (241 modules)**. A set of its modules is wired to the real D1/R2 backend (listed below); the remaining modules are still the original localStorage-backed workspaces. The lightweight single-purpose portal that preceded it is kept at `/admin/portal` (same APIs).

## Live (D1/R2-backed) modules
Routing lives in `admin/suite-live.js` (`ROUTES`); views are in `admin/cms/cms.js` (mounted via `window.CSOCms.mount`). `renderWorkspaceView()` in `admin/admin.js` calls `CSOLive.render()` first.

| Suite module | Backend |
|---|---|
| 01-001 Overview | `GET /api/admin/stats` (content, accounts, sessions, media, resources, audit 24h, open incidents, banner) |
| 01-004 Recent Activity, 16-012 Security Audit Logs | `GET /api/admin/audit?kind=all|content|security|incident&q=` |
| 04-001 / 04-004 Current Affairs, 05-008 Recruitment & Jobs (Job Alerts) | `/api/admin/current-affairs`, `/api/admin/jobs`, `/api/admin/preview` (Markdown), `/api/admin/media/upload` (R2 cover image / notification PDF) |
| 05-010 Syllabus, 05-011 PYQ | `/api/admin/resources` (table `resources`) + R2 upload |
| 05-012 / 05-014 Mock Tests | `/api/admin/mock-tests` (+ questions, CSV/JSON dry-run import) |
| 07-001 / 07-004 / 07-005 Files, PDFs, Images | `GET /api/admin/media`, upload |
| 09-001 / 09-006 Accounts & Registrations (admin only) | `GET /api/admin/users` (joins `candidates`), `PUT /api/admin/users/:id/role` |
| 04-005 / 10-011 Announcement Banners, Quick Actions → Flash broadcast | `GET/PUT /api/admin/banner` → `site_settings` → public `GET /api/content/banner` |
| 16-013 Incident Response | `/api/admin/incidents` (stored in `audit_log` as `incident.<severity>`; `…/:id/resolve`) |

The public homepage (`index.html`) and `assets/app.js` read the banner from `/api/content/banner` (cache 15 s, re-polled every 60 s). Banner text is rendered with `textContent` (never `innerHTML`). The old `cso_active_announcement` localStorage key is no longer read by the public site.

## CSP compliance of the suite
`/admin/**` is served with one strict policy (`script-src 'self'; style-src 'self'`, no CDN, no `unsafe-*`). To get there:
- Tailwind is **compiled** (`admin/suite.css`) instead of the CDN runtime; fonts fall back to the system stack. Rebuild after changing classes: `node scripts/build-admin-css.mjs` (also regenerates `admin/cms/cms-embed.css`, the scoped copy of `cms.css`). Tailwind scans `admin/index.html`, `admin/admin.js`, `admin/cms/cms.js`, `admin/suite-live.js`.
- `admin.js` templates emit `data-onclick="fn('x')"` / `data-style="margin-left: 8px"` instead of the blocked native attributes. `admin/suite-boot.js` applies `data-style` through the CSSOM and dispatches `data-onclick` to a **whitelist** of globals (no `eval`). New templates must use the `data-*` forms.
- Inline `<script>`/`<style>` blocks were moved to files; the old client-side token guard was removed.
Static assets under `/admin/` use `Cache-Control: private, no-cache` (revalidated through the role gate); HTML and API stay `no-store`.

## Architecture
- Worker `_worker.js` dispatches: `/admin/*` → `functions/_lib/admin-pages.js` (server-side role gate + headers), `/api/admin/*` → `functions/api/admin/_router.js`, `/api/content/*` → `functions/api/content/_public.js`, `/api/media/*` → `functions/api/media/_serve.js`.
- Roles live in `users.role` (`candidate` default, `editor`, `admin`) and are re-read on every request (demotion is immediate). `sessions.role` is ignored.
- Everything under `/admin/` (suite, assets, portal): editor + admin, strict CSP. Only `/admin/data/legacy-api/` (old static fixtures) is admin-only. Per-feature rights are enforced by the API (`/api/admin/users` is admin-only, so editors see a notice in the accounts module). `/admin/legacy` 301-redirects to `/admin/`.
- The old client-side token guard and the hard-coded login in `admin/login.html` were removed; `/admin/login` now uses the normal `/api/auth/login` and then checks `/api/admin/session`. The static fake API (`api/admin/*`) moved to `admin/data/legacy-api/` (admin-only); `api/admin/index.js` was deleted.
- The Worker now returns 404 for `/functions`, `/migrations`, `/scripts`, `/docs`, `schema.sql`, `wrangler.*` (the assets directory is the repo root).
- Mutations require same-origin `Origin`/`Referer` **and** header `X-CSO-CSRF: 1`. Writes are rate-limited in D1 (120/5 min per user; uploads 30/10 min). Every change is written to `audit_log`.

## Setup
```bash
# 1. R2 bucket (once)
wrangler r2 bucket create cso-media          # name must match wrangler.json "MEDIA"

# 2. Migrations — LOCAL
wrangler d1 migrations apply cso-database --local

# 3. Migrations — REMOTE (0004 adds site_settings + resources; no ALTERs, safe to re-run)
#     (only with approval; run BEFORE deploying the new Worker,
#    because login now selects users.role)
wrangler d1 migrations list cso-database --remote
wrangler d1 migrations apply cso-database --remote
```
`0001_baseline.sql` is idempotent (`IF NOT EXISTS`), so it is safe on the existing database. `0002` uses `ALTER TABLE … ADD COLUMN` — it fails if `users.role` already exists.

### Promote the first admin
Replace the email with a real, already-registered account (never put passwords in SQL):
```bash
wrangler d1 execute cso-database --remote --command \
  "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
```
Use `--local` for local testing. Afterwards, admins can promote editors in **Users & roles**.

### Local development
`wrangler dev` here needs `--compatibility-date 2026-10-19` if the installed workerd is older than `wrangler.json`'s date:
```bash
wrangler dev --local --port 8799 --compatibility-date 2026-10-19
node scripts/seed-local-users.mjs > /tmp/seed.sql && wrangler d1 execute cso-database --local --file /tmp/seed.sql   # admin@/editor@/cand@test.local, pw Test-Pass-12345
node scripts/verify-admin-cms.mjs        # 84 integration checks
```

## Statuses & scheduling
`draft`, `published`, `scheduled`. Public queries use
`deleted_at IS NULL AND (status='published' OR (status='scheduled' AND published_at <= datetime('now')))`, so scheduled items go live without a cron. Times are stored in UTC.

## API reference
Errors: `{ "error": "message", "code": "CODE" }` (+ `fields` for `VALIDATION_ERROR`).

### Admin (`editor`/`admin`, JSON; writes need CSRF headers)
| Method & path | Notes |
|---|---|
| `GET /api/admin/session` | current user + role |
| `GET /api/admin/stats` | counts + recent audit |
| `GET /api/admin/audit?page&limit` | audit log |
| `POST /api/admin/preview` | `{markdown}` → sanitised `{html}` |
| `GET/POST /api/admin/current-affairs` | list (`q,status,category,page,limit`) / create |
| `GET/PUT/DELETE /api/admin/current-affairs/:id` | DELETE = soft delete |
| `POST /api/admin/current-affairs/:id/status` | `{status, published_at?}` |
| `…/jobs` (same shape) | job fields: `organisation, vacancies, qualification, last_date, apply_url, notification_media_key, state` |
| `GET/POST /api/admin/mock-tests`, `GET/PUT/DELETE …/:id`, `POST …/:id/status` | cannot publish with 0 questions |
| `GET/POST /api/admin/mock-tests/:id/questions` | |
| `PUT/DELETE /api/admin/questions/:id` | |
| `POST /api/admin/mock-tests/:id/import` | `{rows, dry_run (default true), skip_invalid}`; max 500 rows |
| `POST /api/admin/media/upload` | multipart `file`; JPEG/PNG/WebP ≤ 5 MB, PDF ≤ 15 MB; magic bytes verified |
| `GET /api/admin/users?q&role`, `PUT /api/admin/users/:id/role` | **admin only**; list joins candidate profile (name, phone, district, last login) |
| `GET/PUT /api/admin/banner` | homepage broadcast banner `{active, headline, context, severity: info\|notice\|urgent, ctaText, ctaUrl}` |
| `GET/POST/PUT/DELETE /api/admin/resources[/:id]` | syllabus / PYQ (`kind`, `title`, `exam`, `year`, `media_key`, `status` draft\|published) |
| `GET /api/admin/media?kind&page` | R2 asset library |
| `GET/POST /api/admin/incidents`, `POST …/:id/resolve` | incident stream (audit_log based) |
| `GET /api/admin/audit?kind&q` | `kind` = all, content, security, incident |

### Public
| Path | Notes |
|---|---|
| `GET /api/content/current-affairs[/:slug]` | `page, limit, category, q` |
| `GET /api/content/jobs[/:slug]` | `+ state` |
| `GET /api/content/mock-tests[/:slug-or-id]` | detail **omits correct answers/explanations** |
| `POST /api/content/mock-tests/:id/submit` | server-side CBT grading (`X-CSO-CSRF: 1` required); persists to `test_attempts` & computes rank/percentile when signed in |
| `GET /api/content/mock-tests/:id/leaderboard` | top 10 users (best score per user, tie-broken by lowest `time_taken_sec`) with masked display names |
| `GET /api/user/attempts` | authenticated user's recent CBT attempts joined with mock test title & target exam |
| `GET/POST /api/user/bookmarks`, `DELETE /api/user/bookmarks/:type/:id`, `POST /api/user/bookmarks/sync` | authenticated cross-device D1 bookmarks (`job`, `current-affair`, `mock-test`, `resource`) + guest localStorage sync |
| `GET /api/content/banner` | `{active:false}` or the live banner; `max-age=15` |
| `GET /api/content/resources?kind&exam` | published syllabus/PYQ with `file_url` |
| `GET /api/media/:uuid.ext` | `Cache-Control: public, max-age=31536000, immutable` |
| `GET /sitemap.xml` | dynamic XML sitemap covering static routes + live D1 jobs, current affairs, and mock tests |
| `GET /feed.xml` (`/rss.xml`) | dynamic RSS 2.0 feed of the 30 most recent live jobs and current affairs |

List/detail: `Cache-Control: public, max-age=60, s-maxage=300`.

## Wired public pages
All four public content portals are wired to `/api/content/*` and served with strict CSP (`script-src 'self'; style-src 'self'`, no inline scripts/styles):
- `/jobs-careers/` (`jobs-careers/index.html`, `jobs-careers/assets/dashboard.js`) → `GET /api/content/jobs` + `GET /api/content/jobs/:slug`
- `/current-affairs/` (`current-affairs/index.html`, `current-affairs/assets/current-affairs.js`) → `GET /api/content/current-affairs` + `GET /api/content/current-affairs/:slug`
- `/mock-tests/` (`mock-tests/index.html`, `mock-tests/assets/mock-tests.js`) → `GET /api/content/mock-tests` + `GET /api/content/mock-tests/:slug-or-id` (interactive CBT practice workspace)
- `/resources/` (`resources/index.html`, `resources/assets/resources.js`) → `GET /api/content/resources` (official syllabi & PYQ PDFs served from `/api/media/*`)
- Shared CSP-safe DOM & allowlist HTML renderer: `assets/js/public-content.js` + `assets/css/public-content.css`. Plain fields use `textContent`; server-sanitised Markdown HTML (`body_html`) is parsed via `DOMParser` and reconstructed through an explicit tag/attribute allowlist without `innerHTML`.

## Manual verification checklist
- [ ] Anonymous `/admin/` redirects to `/admin/login`; candidate account gets 403.
- [ ] Editor can sign in, create/edit/publish/schedule/unpublish/delete each content type.
- [ ] Markdown preview updates live; `<script>` and `javascript:` links are neutralised.
- [ ] Cover image and PDF upload (drag-drop and click); a renamed `.exe` → `.png` is rejected.
- [ ] Mock test: add a question, bulk-import a CSV with one bad row, see the preview, import valid rows, publish.
- [ ] Scheduled item stays hidden, then appears in `/api/content/*` after its time.
- [ ] Editor sees a notice (and the API returns 403) in Candidate Accounts; admin can list accounts and change roles.
- [ ] Banner saved in the suite appears on the homepage within ~15 s and disappears when deactivated.
- [ ] Audit log lists each action with actor and IP.
- [ ] Keyboard-only: skip link, nav, modals (Esc closes), upload zone (Enter/Space).
- [ ] Existing login, password reset, dashboard sync and offline mode still work.
