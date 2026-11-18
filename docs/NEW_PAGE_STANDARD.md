# New Page Standard (v151)

Start from [`templates/cso-standard-page.html`](../templates/cso-standard-page.html) and copy it to `<slug>/index.html`.

## Mandatory shell checklist
- [ ] `<link rel="stylesheet" href="/assets/style.css">` and `<script src="/assets/shared-header.js" defer></script>` (absolute paths).
- [ ] Homepage 2-tier header: either `<header data-cso-auto-shell></header>` (hydrated automatically) or the static `#header-top.site-header__top` + `<nav id="cso-main-navbar">` markup copied from `index.html`. The bar uses the circular `/assets/img/cso-logo-96.webp` emblem. Never use a green `CS`/`CSO` square badge.
- [ ] 3-zone portal footer: `<footer data-cso-auto-footer></footer>` or the static `.cso-footer-zone1/2/3` markup.
- [ ] Directory / module sub-pages: sticky `.cso-dir-topbar` above content (`← Back to Explorer`, live filter input, active section pill) and v150 hero cards.
- [ ] Do not redefine themes: `system`, `dark`, `reading`, `utkal-bharat` and `A- A A+` come from `shared-header.js`.

## Theme variables (use these, never hard-coded colours)
`--cso-bg`, `--cso-surface`, `--cso-text`, `--cso-hero-bg`, `--cso-hero-title`, `--cso-hero-sub`, `--cso-border`.
Hero card: `border-radius: 20px; padding: 28px 32px; background: var(--cso-hero-bg); border: 1px solid var(--cso-border);`. Card text 14.5–15px.

## CSP rules (strict: `script-src 'self'; style-src 'self'`)
- 0 inline `<script>` (only `application/ld+json` data blocks are allowed). Put code in `/assets/js/pages/<slug>.js`.
- 0 `style=""` attributes and no inline `<style>`. Add classes to `assets/style.css`.
- 0 `.innerHTML`. Build DOM with `document.createElement` + `textContent`, or use `csoSetHtml(el, html)` from `/assets/js/cso-safe-dom.js` for trusted markup.

## Verify before committing
```
node scripts/audit-site-uniformity.mjs   # discovers every .html (incl. templates/)
node scripts/audit-links.js
node scripts/test-ops-sentinel.mjs
```
When shipping, bump `CACHE_NAME` in `sw.js`, `ACTIVE_SW_CACHE_VERSION` in `functions/_lib/ops-sentinel.js` and the expected value in `scripts/test-ops-sentinel.mjs`.
