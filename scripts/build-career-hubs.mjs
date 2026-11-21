// v161: generates the 6 static Career Hub pages and the landing-page Career Hubs grid.
// Usage: node scripts/build-career-hubs.mjs   (idempotent)
import fs from 'node:fs';
import path from 'node:path';
import { HUBS, ORIGIN } from './career-hubs-data.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const V = '20261121v161';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const landingPath = path.join(root, 'jobs-careers/index.html');
let landing = fs.readFileSync(landingPath, 'utf8').replace(/\r\n/g, '\n');

// ---- shell extraction from the landing page ----
const shellStart = landing.indexOf('<div id="csoPublicAnnouncementMount">');
const shellEnd = landing.indexOf('<div class="app-shell">');
const footStart = landing.indexOf('<footer>');
const footEnd = landing.indexOf('</footer>') + '</footer>'.length;
if (shellStart < 0 || shellEnd < 0 || footStart < 0) throw new Error('shell markers not found');
const headerShell = landing.slice(shellStart, shellEnd).trim();
const footerShell = landing.slice(footStart, footEnd).replace(/(href|src)="\.\.\//g, '$1="/');
const faviconLine = landing.match(/<link rel="icon"[^\n]*\n/)[0].trim();

// ---- hub pages ----
function chipButton(label, pattern, active) {
  return `<button type="button" class="live-chip${active ? ' is-active' : ''}" data-hub-chip data-pattern="${esc(pattern)}" aria-pressed="${active ? 'true' : 'false'}">${esc(label)}</button>`;
}

function hubPage(hub) {
  const url = `${ORIGIN}/jobs-careers/${hub.slug}/`;
  const title = `${hub.title} Jobs & Recruitment | Common Sense Odisha`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Jobs & Careers', item: `${ORIGIN}/jobs-careers/` },
          { '@type': 'ListItem', position: 3, name: hub.title, item: url }
        ]
      },
      { '@type': 'CollectionPage', name: hub.title, description: hub.description, url }
    ]
  };
  const ldJson = JSON.stringify(ld).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const portals = hub.portals.map((p) => `<a class="cso-jobs-action-pill" href="${esc(p.href)}" target="_blank" rel="noopener noreferrer">${esc(p.label)} ↗</a>`).join('\n            ');
  const chips = [chipButton('All', '', true), ...hub.chips.map((c) => chipButton(c.label, c.pattern, false))].join('\n            ');
  const related = hub.related.map((r) => `<a class="cso-hub-related-card" href="${esc(r.href)}"><strong>${esc(r.title)}</strong><span>${esc(r.text)}</span></a>`).join('\n            ');
  const others = HUBS.filter((h) => h.slug !== hub.slug).map((h) => `<a class="cso-jobs-action-pill" href="/jobs-careers/${h.slug}/">${h.icon} ${esc(h.title)}</a>`).join('\n            ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <meta name="theme-color" content="#edf4ff">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(hub.description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Common Sense Odisha">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(hub.description)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(hub.description)}">
  <link rel="stylesheet" href="/assets/style.css?v=${V}">
  <link rel="stylesheet" href="/jobs-careers/assets/dashboard.css?v=${V}">
  <link rel="stylesheet" href="/jobs-careers/assets/hub.css?v=${V}">
  <script src="/assets/shared-header.js?v=${V}" defer></script>
  <script src="/assets/js/public-content.js?v=${V}" defer></script>
  <script src="/assets/cso-auth-client.js" defer></script>
  <script src="/assets/js/cso-idb.js" defer></script>
  <script src="/assets/js/bookmark-manager.js" defer></script>
  <script src="/jobs-careers/assets/hub.js?v=${V}" defer></script>
  ${faviconLine}
  <script type="application/ld+json">${ldJson}</script>
</head>
<body>
${headerShell}

<main class="cso-hub-main" id="career-hub" data-hub="${hub.slug}" data-hub-pattern="${esc(hub.pattern)}">
  <section class="cso-jobs-hero cso-hub-hero" aria-label="${esc(hub.title)} hub">
    <nav class="cso-hub-crumb" aria-label="Breadcrumb">
      <a href="/">Home</a> <span aria-hidden="true">›</span> <a href="/jobs-careers/">Jobs &amp; Careers</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(hub.title)}</span>
    </nav>
    <h1><span aria-hidden="true">${hub.icon}</span> ${esc(hub.title)}</h1>
    <p class="cso-jobs-hero-sub">${esc(hub.summary)}</p>
    <div class="cso-hub-portals" role="group" aria-label="Verified official portals">
      <span class="cso-hub-portals__label">Official portals</span>
      ${portals}
    </div>
  </section>

  <section id="live-jobs-section" class="live-jobs-section" aria-labelledby="hub-live-heading">
    <div class="live-jobs-header">
      <div class="live-jobs-title-group">
        <span class="live-pulse-dot" aria-hidden="true"></span>
        <h2 id="hub-live-heading">Live ${esc(hub.title)} Notices</h2>
        <span id="hub-count" class="live-count-badge" aria-live="polite">Loading…</span>
      </div>
    </div>
    <div class="live-search-bar" role="search" aria-label="Search ${esc(hub.title)} notices">
      <span class="live-search-icon" aria-hidden="true">⌕</span>
      <input id="hub-search" class="live-filter-input" type="search" autocomplete="off" placeholder="Search ${esc(hub.title)} notices..." aria-label="Search ${esc(hub.title)} notices">
    </div>
    <div class="live-filter-strip" id="hub-chips" role="group" aria-label="Filter by subcategory">
      ${chips}
    </div>
    <div class="live-jobs-filters" aria-label="Hub filter actions">
      <button id="hub-reset" class="live-filter-btn" type="button" hidden>Reset Filters</button>
    </div>
    <div id="hub-status" class="live-status-box" role="status" aria-live="polite">Loading live recruitment notices…</div>
    <div id="hub-grid" class="live-jobs-grid" aria-live="polite"></div>
  </section>

  <section class="cso-hub-related" aria-labelledby="hub-related-heading">
    <h2 id="hub-related-heading">Related Study &amp; Exam Resources</h2>
    <div class="cso-hub-related-grid">
      ${related}
    </div>
  </section>

  <section class="cso-hub-others" aria-labelledby="hub-others-heading">
    <h2 id="hub-others-heading">Explore Other Career Hubs</h2>
    <div class="cso-hub-others__list">
      ${others}
      <a class="cso-jobs-action-pill" href="/jobs-careers/">All Jobs &amp; Careers</a>
    </div>
  </section>
</main>
${footerShell}
</body>
</html>
`;
}

for (const hub of HUBS) {
  const dir = path.join(root, 'jobs-careers', hub.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), hubPage(hub));
}

// ---- landing Career Hubs grid ----
const cards = HUBS.map((h) => `            <a class="cso-hub-card" href="/jobs-careers/${h.slug}/" data-hub-pattern="${esc(h.pattern)}">
              <span class="cso-hub-card__icon" aria-hidden="true">${h.icon}</span>
              <span class="cso-hub-card__body">
                <span class="cso-hub-card__title">${esc(h.title)}</span>
                <span class="cso-hub-card__boards">${esc(h.boards)}</span>
                <span class="cso-hub-card__count" data-hub-count>Open hub</span>
              </span>
              <span class="cso-hub-card__arrow" aria-hidden="true">›</span>
            </a>`).join('\n');
const hubsBlock = `<!-- career-hubs:start -->
          <h2 id="career-hubs-heading">Career Hubs</h2>
          <div class="cso-hub-grid" id="career-hubs" aria-labelledby="career-hubs-heading">
${cards}
          </div>
          <!-- career-hubs:end -->`;

if (landing.includes('<!-- career-hubs:start -->')) {
  landing = landing.replace(/<!-- career-hubs:start -->[\s\S]*?<!-- career-hubs:end -->/, () => hubsBlock);
} else {
  const ovOpen = '<section id="overview" aria-label="Directory overview">';
  if (!landing.includes(ovOpen)) throw new Error('overview section not found');
  const gridRe = /          <h2>Explore All Categories<\/h2>\n          <div class="dashboard-grid" id="dashboard-grid">[\s\S]*?\n          <\/div>\n/;
  if (!gridRe.test(landing)) throw new Error('dashboard grid not found');
  landing = landing.replace(gridRe, (m) => `          <details class="hub-directory-more">
            <summary>Browse the full directory by section</summary>
${m.replace('<h2>Explore All Categories</h2>', '<h2>Explore All Categories</h2>')}          </details>
`);
  landing = landing.replace(ovOpen, () => `${ovOpen}\n          ${hubsBlock}\n`);
}
landing = landing.replace(/(dashboard\.(?:css|js))\?v=\d+v\d+/g, `$1?v=${V}`);
if (!landing.includes('/jobs-careers/assets/hub.css')) {
  landing = landing.replace(/(  <link rel="stylesheet" href="\.\/assets\/dashboard\.css[^\n]*\n)/, `$1  <link rel="stylesheet" href="/jobs-careers/assets/hub.css?v=${V}">\n`);
}
if (!landing.includes('/jobs-careers/assets/hub.js')) {
  landing = landing.replace(/(  <script src="\.\/assets\/dashboard\.js[^\n]*<\/script>\n)/, `$1  <script src="/jobs-careers/assets/hub.js?v=${V}" defer></script>\n`);
}
fs.writeFileSync(landingPath, landing);
console.log(`Built ${HUBS.length} hub pages and landing hubs grid.`);
