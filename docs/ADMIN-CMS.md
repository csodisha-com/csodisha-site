# Admin CMS & Content Portal

Protected `/admin/` portal for publishing **current affairs**, **job alerts** and **mock tests** to D1, with media in R2.

## Architecture
- Worker `_worker.js` dispatches: `/admin/*` → `functions/_lib/admin-pages.js` (server-side role gate + headers), `/api/admin/*` → `functions/api/admin/_router.js`, `/api/content/*` → `functions/api/content/_public.js`, `/api/media/*` → `functions/api/media/_serve.js`.
- Roles live in `users.role` (`candidate` default, `editor`, `admin`) and are re-read on every request (demotion is immediate). `sessions.role` is ignored.
- `/admin/` and `/admin/cms/*`: editor + admin, strict CSP (`script-src 'self'`). The pre-existing console (`/admin/legacy`, `/admin/admin.js`, …) is **admin-only** with a looser CSP (it needs inline scripts + Tailwind CDN). TODO: migrate it to the strict CSP.
- The old client-side token guard and the hard-coded login in `admin/login.html` were removed; `/admin/login` now uses the normal `/api/auth/login` and then checks `/api/admin/session`. The static fake API (`api/admin/*`) moved to `admin/data/legacy-api/` (admin-only); `api/admin/index.js` was deleted.
- The Worker now returns 404 for `/functions`, `/migrations`, `/scripts`, `/docs`, `schema.sql`, `wrangler.*` (the assets directory is the repo root).
- Mutations require same-origin `Origin`/`Referer` **and** header `X-CSO-CSRF: 1`. Writes are rate-limited in D1 (120/5 min per user; uploads 30/10 min). Every change is written to `audit_log`.

## Setup
```bash
# 1. R2 bucket (once)
wrangler r2 bucket create cso-media          # name must match wrangler.json "MEDIA"

# 2. Migrations — LOCAL
wrangler d1 migrations apply cso-database --local

# 3. Migrations — REMOTE (only with approval; run BEFORE deploying the new Worker,
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
node scripts/verify-admin-cms.mjs        # 51 integration checks
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
| `GET /api/admin/users`, `PUT /api/admin/users/:id/role` | **admin only** |

### Public
| Path | Notes |
|---|---|
| `GET /api/content/current-affairs[/:slug]` | `page, limit, category, q` |
| `GET /api/content/jobs[/:slug]` | `+ state` |
| `GET /api/content/mock-tests[/:slug-or-id]` | detail **omits correct answers/explanations** (a future test engine should grade server-side) |
| `GET /api/media/:uuid.ext` | `Cache-Control: public, max-age=31536000, immutable` |

List/detail: `Cache-Control: public, max-age=60, s-maxage=300`.

## Wiring public pages (TODO)
Not wired yet to keep risk low. Example: `fetch('/api/content/jobs?limit=10').then(r => r.json())`; render `items[].title`, `organisation`, `last_date`, `apply_url`, `notification_url`.

## Manual verification checklist
- [ ] Anonymous `/admin/` redirects to `/admin/login`; candidate account gets 403.
- [ ] Editor can sign in, create/edit/publish/schedule/unpublish/delete each content type.
- [ ] Markdown preview updates live; `<script>` and `javascript:` links are neutralised.
- [ ] Cover image and PDF upload (drag-drop and click); a renamed `.exe` → `.png` is rejected.
- [ ] Mock test: add a question, bulk-import a CSV with one bad row, see the preview, import valid rows, publish.
- [ ] Scheduled item stays hidden, then appears in `/api/content/*` after its time.
- [ ] Editor cannot open Users & roles or the legacy console; admin can.
- [ ] Audit log lists each action with actor and IP.
- [ ] Keyboard-only: skip link, nav, modals (Esc closes), upload zone (Enter/Space).
- [ ] Existing login, password reset, dashboard sync and offline mode still work.
