/**
 * CS Odisha — Public About & Institutional Transparency Portal (v259)
 * Flagship Editorial Hero, Embedded 5-Tile Live Transparency KPI Strip,
 * Pillar Cards with Live Counts, 3-Column Verified .gov.in Registry & Contact Desk.
 * Strict CSP-compliant: zero unsafe HTML string sinks, zero .style.* mutations, zero inline handlers.
 * Hydrates /about/ live from Cloudflare D1 (/api/public/about/*) with cache: 'no-store'.
 */
(function (window, document) {
  'use strict';

  var S = {
    root: null,
    nodes: [],
    transparency: { verified_jobs: 0, active_schemes: 0, study_modules: 0, community_members: 0, verified_portals: 0 },
    institutional: null,
    allPages: [],
    pages: [],
    sources: [],
    sectors: [],
    isAdmin: false,
    lang: 'en',
    activeL1: '',
    sourceSector: '',
    sourceSearch: ''
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function num(v) {
    try { return Number(v || 0).toLocaleString('en-IN'); } catch (_e) { return String(v || 0); }
  }

  function pick(obj, field) {
    if (!obj) return '';
    if (S.lang === 'or' && obj[field + '_or']) return String(obj[field + '_or']);
    return String(obj[field + '_en'] || '');
  }

  function getLangPref() {
    try { return localStorage.getItem('cso_lang_pref') === 'or' ? 'or' : 'en'; } catch (_e) { return 'en'; }
  }

  function setLangPref(l) {
    S.lang = l === 'or' ? 'or' : 'en';
    try { localStorage.setItem('cso_lang_pref', S.lang); } catch (_e) {}
  }

  function safeHref(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  function qsParam(k) {
    try { return new URLSearchParams(window.location.search).get(k) || ''; } catch (_e) { return ''; }
  }

  function estimateReadMins(article) {
    var txt = String((article && (article.article_body_en || article.summary_en)) || '');
    var words = txt.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  }

  async function api(url, opts) {
    var o = Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opts || {});
    var headers = Object.assign({}, o.headers || {});
    if (o.body && typeof o.body === 'object') {
      headers['Content-Type'] = 'application/json';
      o.body = JSON.stringify(o.body);
    }
    o.headers = headers;
    var r = await fetch(url, o);
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || ('Request failed (' + r.status + ')'));
    return d;
  }

  async function detectAdminSession() {
    var hint = false;
    try { hint = localStorage.getItem('cso_admin_active') === '1'; } catch (_e) {}
    if (!hint) return false;
    try {
      var res = await fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return false;
      var d = await res.json();
      S.isAdmin = Boolean(d && d.user);
      return S.isAdmin;
    } catch (_e) {
      S.isAdmin = false;
      return false;
    }
  }

  function fireTelemetry(event, article) {
    try {
      fetch('/api/public/about/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event, id: article.id, slug: article.slug })
      }).catch(function () {});
    } catch (_e) {}
  }

  function injectInstitutionalJsonLd(article) {
    try {
      var prev = document.getElementById('cso-about-org-jsonld');
      if (prev) prev.remove();
      var sc = document.createElement('script');
      sc.type = 'application/ld+json';
      sc.id = 'cso-about-org-jsonld';
      sc.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: 'Common Sense Odisha',
            url: 'https://csodisha.com/',
            logo: 'https://csodisha.com/assets/img/cso-logo.png',
            email: 'contact@csodisha.com',
            areaServed: 'Odisha, India'
          },
          {
            '@type': 'AboutPage',
            name: article ? article.title_en : 'About Common Sense Odisha — Public Charter & Transparency Hub',
            url: article ? ('https://csodisha.com/about/?slug=' + encodeURIComponent(article.slug)) : 'https://csodisha.com/about/',
            description: article ? (article.summary_en || article.title_en) : 'Independent, open-access civic and educational platform for Odisha.'
          }
        ]
      });
      document.head.appendChild(sc);
    } catch (_e) {}
  }

  function appendInlineFormatted(parent, text) {
    var str = String(text || '');
    var tokenRe = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
    var last = 0;
    var m;
    while ((m = tokenRe.exec(str)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      var tok = m[0];
      if (tok.startsWith('**') && tok.endsWith('**')) {
        parent.appendChild(el('strong', '', tok.slice(2, -2)));
      } else if (tok.startsWith('`') && tok.endsWith('`')) {
        parent.appendChild(el('code', '', tok.slice(1, -1)));
      } else if (tok.startsWith('[')) {
        var lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          var href = safeHref(lm[2]);
          if (href) {
            var a = el('a', '', lm[1]); a.href = href;
            if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            parent.appendChild(a);
          } else {
            parent.appendChild(document.createTextNode(lm[1]));
          }
        }
      }
      last = tokenRe.lastIndex;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
  }

  function renderProse(container, text) {
    var box = el('div', 'ap-prose');
    var lines = String(text || '').replace(/\\n/g, '\n').split(/\r?\n/);
    var ul = null;
    function flush() { if (ul) { box.appendChild(ul); ul = null; } }
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { flush(); return; }
      if (line.startsWith('### ')) { flush(); box.appendChild(el('h4', '', line.slice(4).trim())); return; }
      if (line.startsWith('## ') || line.startsWith('# ')) { flush(); box.appendChild(el('h3', '', line.replace(/^#+\s+/, '').trim())); return; }
      if (/^[-*•]\s+/.test(line)) {
        if (!ul) ul = el('ul');
        var li = el('li');
        appendInlineFormatted(li, line.replace(/^[-*•]\s+/, '').trim());
        ul.appendChild(li);
        return;
      }
      flush();
      var p = el('p');
      appendInlineFormatted(p, line);
      box.appendChild(p);
    });
    flush();
    container.appendChild(box);
  }

  function buildEmptyDocSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'ap-empty-svg');
    [
      ['path', { d: 'M12 8h16l10 10v22a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linejoin': 'round' }],
      ['path', { d: 'M28 8v10h10', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linejoin': 'round' }],
      ['path', { d: 'M16 25h16M16 32h11', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round' }]
    ].forEach(function (sp) {
      var node = document.createElementNS(ns, sp[0]);
      Object.keys(sp[1]).forEach(function (k) { node.setAttribute(k, sp[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  function buildLangToggle(onSwitch) {
    var w = el('div', 'ap-lang-toggle');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (lg) {
      var b = el('button', 'ap-lang-btn' + (S.lang === lg[0] ? ' is-active' : ''), lg[1]);
      b.type = 'button';
      b.addEventListener('click', function () { setLangPref(lg[0]); onSwitch(); });
      w.appendChild(b);
    });
    return w;
  }

  async function loadPortalData() {
    var pUrl = '/api/public/about/pages' + (S.activeL1 ? ('?l1=' + encodeURIComponent(S.activeL1)) : '');
    var sQ = new URLSearchParams();
    if (S.sourceSector) sQ.set('sector', S.sourceSector);
    if (S.sourceSearch) sQ.set('search', S.sourceSearch);
    var sUrl = '/api/public/about/sources' + (sQ.toString() ? ('?' + sQ.toString()) : '');

    var res = await Promise.all([
      api('/api/public/about/tree').catch(function () { return { nodes: [], transparency: S.transparency }; }),
      api(pUrl).catch(function () { return { items: [] }; }),
      api(sUrl).catch(function () { return { items: [], sectors: [] }; })
    ]);
    S.nodes = res[0].nodes || [];
    S.transparency = res[0].transparency || S.transparency;
    S.pages = res[1].items || [];
    if (!S.activeL1) S.allPages = S.pages.slice();
    S.sources = res[2].items || [];
    S.sectors = res[2].sectors || [];
  }

  function countPagesForPillar(l1Id) {
    var src = S.allPages.length ? S.allPages : S.pages;
    if (!l1Id) return src.length;
    return src.filter(function (p) { return p.category_l1_id === l1Id; }).length;
  }

  function renderEditorialHero(shell) {
    var inst = S.institutional || {};
    var isOr = S.lang === 'or';
    var hero = el('section', 'ap-hero abt-hero--compact');
    hero.setAttribute('aria-label', 'About Common Sense Odisha');

    var bar = el('div', 'abt-hero-bar');
    var copy = el('div', 'ap-hero-copy');
    copy.appendChild(el('span', 'abt-motto', isOr
      ? (inst.motto_or || 'ଆତ୍ମନିର୍ଭରଶୀଳ ହୁଅନ୍ତୁ | ଏକ ଉନ୍ନତ ଭବିଷ୍ୟତ ଗଢ଼ନ୍ତୁ')
      : (inst.motto_en || 'Be Self-Reliant | Build a Better Tomorrow')));
    copy.appendChild(el('h1', 'ap-hero-title', isOr
      ? (inst.title_or || 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ବିଷୟରେ')
      : (inst.title_en || 'About Common Sense Odisha')));
    copy.appendChild(el('p', 'ap-hero-sub', isOr
      ? (inst.subtitle_or || 'ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀ, ଚାକିରି ଆଶାୟୀ ଏବଂ ନାଗରିକମାନଙ୍କ ପାଇଁ ସ୍ୱାଧୀନ, ଖୋଲା-ପ୍ରବେଶ ଏବଂ ଯାଞ୍ଚିତ ସାର୍ବଜନୀନ ଜ୍ଞାନ ପ୍ଲାଟଫର୍ମ।')
      : (inst.subtitle_en || 'Independent, open-access civic and educational platform empowering Odisha citizens with verified public information.')));
    bar.appendChild(copy);
    bar.appendChild(buildLangToggle(function () { renderOverviewPortal(); }));
    hero.appendChild(bar);
    shell.appendChild(hero);
  }

  function renderOverviewPortal() {
    clear(S.root);
    injectInstitutionalJsonLd(null);
    var isOr = S.lang === 'or';
    var inst = S.institutional || {};
    var shell = el('div', 'ap-root');

    // 1. Compact Institutional Hero Header (v290 — no bloated KPI grid)
    renderEditorialHero(shell);

    // 2. Five Structured Institutional Sections (Solid Cards Across All 4 Themes)
    var grid = el('div', 'abt-sections-grid');

    // Card 1: Mission & Vision
    var cMission = el('section', 'abt-card');
    cMission.setAttribute('aria-label', 'Mission and Vision');
    cMission.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୧ · ଲକ୍ଷ୍ୟ ଓ ଦୃଷ୍ଟିଭଙ୍ଗୀ' : '01 · MISSION & VISION'));
    cMission.appendChild(el('h2', 'abt-card-title', isOr ? 'ଆମର ଲକ୍ଷ୍ୟ ଓ ଦୃଷ୍ଟିଭଙ୍ଗୀ' : 'Mission & Vision'));
    cMission.appendChild(el('p', 'abt-card-body', isOr
      ? (inst.mission_or || 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା (CSO) ହେଉଛି ଏକ ସ୍ୱାଧୀନ, ସମ୍ପୂର୍ଣ୍ଣ ମାଗଣା ସାର୍ବଜନୀନ ଜ୍ଞାନ ପ୍ଲାଟଫର୍ମ, ଯାହା ଓଡ଼ିଶାର ଯୁବକ, ଛାତ୍ରଛାତ୍ରୀ, କୃଷକ ଏବଂ ନାଗରିକମାନଙ୍କୁ ସଠିକ୍ ଓ ଯାଞ୍ଚିତ ସୂଚନା ଯୋଗାଇ ଦିଏ।')
      : (inst.mission_en || 'Common Sense Odisha (CSO) is an independent, open-access, zero-paywall platform built for Odisha’s youth, job seekers, students, farmers, and citizens — making verified public opportunities clear, timely, and accessible to everyone.')));
    grid.appendChild(cMission);

    // Card 2: What We Cover (5 Core Portals)
    var cPortals = el('section', 'abt-card');
    cPortals.setAttribute('aria-label', 'What We Cover — 5 Core Portals');
    cPortals.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୨ · ଆମର ୫ଟି ମୁଖ୍ୟ ପୋର୍ଟାଲ୍' : '02 · WHAT WE COVER'));
    cPortals.appendChild(el('h2', 'abt-card-title', isOr ? '୫ଟି ମୁଖ୍ୟ ସାର୍ବଜନୀନ ପୋର୍ଟାଲ୍' : 'What We Cover (5 Core Portals)'));
    var pList = el('ul', 'abt-portal-list');
    [
      ['/jobs/', '💼', isOr ? 'ଚାକିରି (Jobs)' : 'Jobs', isOr ? 'ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ସରକାରୀ ନିଯୁକ୍ତି, PSU, ବ୍ୟାଙ୍କିଂ ଓ ପ୍ରାଇଭେଟ୍ ଚାକିରି ବିଜ୍ଞପ୍ତି' : 'Verified Odisha & Central Govt, PSU, Private & NGO recruitment alerts'],
      ['/careers/', '🧭', isOr ? 'କ୍ୟାରିୟର (Careers)' : 'Careers', isOr ? 'ପରୀକ୍ଷା ରୋଡମ୍ୟାପ୍, ଦଶମ/+୨ ପରବର୍ତ୍ତୀ ପଥ ଏବଂ ଦକ୍ଷତା ମାର୍ଗଦର୍ଶନ' : 'Structured exam roadmaps, post-10th/12th pathways & career tracks'],
      ['/schemes/', '🏛️', isOr ? 'ଯୋଜନା ଓ ସୁବିଧା (Schemes & Benefits)' : 'Schemes & Benefits', isOr ? 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ କେନ୍ଦ୍ର କଲ୍ୟାଣ ଯୋଜନା, ବୃତ୍ତି ଏବଂ ଯୋଗ୍ୟତା ଯାଞ୍ଚ' : 'Odisha State & Central welfare schemes, scholarships & DBT eligibility'],
      ['/study-library/', '📖', isOr ? 'ଅଧ୍ୟୟନ ପାଠାଗାର (Study Library)' : 'Study Library', isOr ? 'ଦ୍ୱିଭାଷୀ ନୋଟ୍ସ, ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର (PYQ) ଏବଂ ସରକାରୀ ସିଲାବସ୍' : 'Bilingual study notes, solved previous year papers (PYQs) & official syllabi'],
      ['/community/', '👥', isOr ? 'ସମୁଦାୟ (Community)' : 'Community', isOr ? 'ପରୀକ୍ଷା ସନ୍ଦେହ ସମାଧାନ, ଯୋଜନା ସହାୟତା, ଅଧ୍ୟୟନ ଦଳ ଓ ମେଣ୍ଟରଶିପ୍' : 'Exam & career Q&A, Odisha scheme help, peer study groups & mentorship']
    ].forEach(function (item) {
      var li = el('li', 'abt-portal-item');
      var a = el('a', 'abt-portal-link');
      a.href = item[0];
      a.appendChild(el('span', 'abt-portal-icon', item[1]));
      var tx = el('span', 'abt-portal-text');
      tx.appendChild(el('strong', '', item[2]));
      tx.appendChild(el('span', 'abt-portal-desc', item[3]));
      a.appendChild(tx);
      a.appendChild(el('span', 'abt-portal-arrow', '→'));
      li.appendChild(a);
      pList.appendChild(li);
    });
    cPortals.appendChild(pList);
    grid.appendChild(cPortals);

    // Card 3: Editorial & Source Verification Policy
    var cEdit = el('section', 'abt-card');
    cEdit.setAttribute('aria-label', 'Editorial and Source Verification Policy');
    cEdit.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୩ · ସମ୍ପାଦକୀୟ ସ୍ୱଚ୍ଛତା' : '03 · VERIFICATION POLICY'));
    cEdit.appendChild(el('h2', 'abt-card-title', isOr ? 'ସମ୍ପାଦକୀୟ ଓ ସୂଚନା ଯାଞ୍ଚ ନୀତି' : 'Editorial & Source Verification Policy'));
    cEdit.appendChild(el('p', 'abt-card-body', isOr
      ? (inst.editorial_or || 'ପ୍ରତ୍ୟେକ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି, ସରକାରୀ ଯୋଜନା ଏବଂ ସିଲାବସ୍ ସୂଚନା ପ୍ରାଥମିକ .gov.in ଏବଂ .odisha.gov.in ସରକାରୀ ପୋର୍ଟାଲ୍ ସହିତ ଯାଞ୍ଚ କରାଯାଇ ସ୍ପଷ୍ଟ ତାରିଖ ଓ ଲିଙ୍କ୍ ସହିତ ପ୍ରକାଶିତ ହୁଏ।')
      : (inst.editorial_en || 'Every job notification, welfare scheme guide, and syllabus update is verified against primary .gov.in and .odisha.gov.in notifications, published with clear effective dates, direct official links, and strictly non-partisan public-service reporting.')));
    var eUl = el('ul', 'abt-bullet-list');
    [
      isOr ? 'ପ୍ରାଥମିକ .gov.in ଓ .odisha.gov.in ସୂତ୍ରରୁ ସିଧାସଳଖ ଯାଞ୍ଚ' : 'Primary-source verification against .gov.in & .odisha.gov.in portals',
      isOr ? 'ସ୍ପଷ୍ଟ ପ୍ରକାଶନ ତାରିଖ, ଶେଷ ତାରିଖ ଏବଂ ସଂଶୋଧନ ଟିପ୍ପଣୀ' : 'Clear publication dates, application deadlines, and correction logs',
      isOr ? 'ସମ୍ପୂର୍ଣ୍ଣ ନିରପେକ୍ଷ, ବିଜ୍ଞାପନ-ମୁକ୍ତ ସାର୍ବଜନୀନ ସୂଚନା ପ୍ରକାଶନ' : 'Non-partisan, independent public-service reporting with zero paywalls'
    ].forEach(function (pt) { eUl.appendChild(el('li', '', pt)); });
    cEdit.appendChild(eUl);
    grid.appendChild(cEdit);

    // Card 4: Bilingual & Accessibility Design
    var cA11y = el('section', 'abt-card');
    cA11y.setAttribute('aria-label', 'Bilingual and Accessibility Design');
    cA11y.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୪ · ଭାଷା ଓ ସୁଗମତା' : '04 · ACCESSIBILITY'));
    cA11y.appendChild(el('h2', 'abt-card-title', isOr ? 'ଦ୍ୱିଭାଷୀ ଓ ସୁଗମ ଡିଜାଇନ୍' : 'Bilingual & Accessibility Design'));
    cA11y.appendChild(el('p', 'abt-card-body', isOr
      ? 'ଓଡ଼ିଶାର ପ୍ରତ୍ୟେକ ଜିଲ୍ଲା ଓ ଗ୍ରାମାଞ୍ଚଳର ପାଠକଙ୍କ ପାଇଁ ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ଭାଷା, ୪ଟି ଅନୁକୂଳ ଥିମ୍ ଏବଂ କମ୍ ଡାଟାରେ ଦ୍ରୁତ ଖୋଲୁଥିବା ମୋବାଇଲ୍-ପ୍ରଥମ ଡିଜାଇନ୍।'
      : 'Designed for learners across every Odisha district with native English & ଓଡ଼ିଆ support, 4 adaptive reading themes (System, Dark Night, Reading Mode, Odisha & Bharat), keyboard navigation, and mobile-first low-bandwidth performance.'));
    var aUl = el('ul', 'abt-bullet-list');
    [
      isOr ? 'ଇଂରାଜୀ ଏବଂ ଓଡ଼ିଆ (EN + ଓଡ଼ିଆ) ଦ୍ୱିଭାଷୀ ପଠନ ସୁବିଧା' : 'Native English + ଓଡ଼ିଆ bilingual reading experience across portals',
      isOr ? '୪ଟି ଅନୁକୂଳ ଥିମ୍ (System, Dark Night, Reading Mode, Odisha & Bharat)' : '4 high-contrast themes (System, Dark Night, Reading Mode, Odisha & Bharat)',
      isOr ? 'ସ୍ୱଳ୍ପ ଇଣ୍ଟରନେଟ୍ ବେଗରେ ମଧ୍ୟ ଦ୍ରୁତ ଲୋଡିଂ ଓ ମୋବାଇଲ୍-ଅନୁକୂଳ ଲେଆଉଟ୍' : 'Lightweight zero-bloat pages engineered for fast loading on rural mobile networks'
    ].forEach(function (pt) { aUl.appendChild(el('li', '', pt)); });
    cA11y.appendChild(aUl);
    grid.appendChild(cA11y);

    // Card 5: Citizen Desk, Legal & Contact (full width)
    var cDesk = el('section', 'abt-card abt-card--wide');
    cDesk.setAttribute('aria-label', 'Citizen Desk, Legal and Contact');
    cDesk.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୫ · ନାଗରିକ ସହାୟତା ଓ ଯୋଗାଯୋଗ' : '05 · CITIZEN DESK & LEGAL'));
    cDesk.appendChild(el('h2', 'abt-card-title', isOr ? 'ନାଗରିକ ସହାୟତା, ଆଇନଗତ ନୀତି ଓ ଯୋଗାଯୋଗ' : 'Citizen Desk, Legal & Contact'));
    var deskLinks = el('div', 'abt-desk-links');
    [
      ['/support/#contact', isOr ? '📩 ଯୋଗାଯୋଗ (Contact)' : '📩 Contact Us'],
      ['/support/#suggest-resource', isOr ? '💡 ସୂଚନା ପ୍ରସ୍ତାବ ଦିଅନ୍ତୁ (Suggest Resource)' : '💡 Suggest Resource'],
      ['/support/#report-error', isOr ? '🛠️ ତ୍ରୁଟି ଜଣାନ୍ତୁ (Report an Error)' : '🛠️ Report an Error'],
      ['/support/#faqs', isOr ? '❓ ସାଧାରଣ ପ୍ରଶ୍ନ (Help & FAQs)' : '❓ Help & FAQs'],
      ['/privacy-policy/', isOr ? '🔒 ଗୋପନୀୟତା ନୀତି (Privacy Policy)' : '🔒 Privacy Policy'],
      ['/terms-of-use/', isOr ? '⚖️ ବ୍ୟବହାର ସର୍ତ୍ତାବଳୀ (Terms of Use)' : '⚖️ Terms of Use']
    ].forEach(function (lnk) {
      var a = el('a', 'abt-desk-btn', lnk[1]);
      a.href = lnk[0];
      deskLinks.appendChild(a);
    });
    cDesk.appendChild(deskLinks);

    var emailStr = inst.contact_email || 'contact@csodisha.com';
    var emailRow = el('div', 'abt-contact-row');
    emailRow.appendChild(el('span', 'abt-contact-label', isOr ? 'ସରକାରୀ ଯୋଗାଯୋଗ ଇମେଲ୍: ' : 'Official Contact Email: '));
    var mailA = el('a', 'abt-contact-email', emailStr);
    mailA.href = 'mailto:' + emailStr;
    emailRow.appendChild(mailA);
    cDesk.appendChild(emailRow);
    grid.appendChild(cDesk);

    shell.appendChild(grid);

    // Optional Admin-published Institutional Charter Documents (if authored in D1)
    if (S.pages.length) {
      var docSec = el('section', 'ap-panel');
      docSec.setAttribute('aria-label', 'Published Institutional Documents');
      var dHead = el('div', 'ap-panel-head');
      dHead.appendChild(el('h2', 'ap-panel-title', isOr ? '📄 ପ୍ରକାଶିତ ସାଂସ୍ଥାନିକ ଦସ୍ତାବିଜ୍' : '📄 Published Institutional Documents'));
      if (S.isAdmin) {
        var admA = el('a', 'ap-btn ap-btn-sm', '+ Manage in Admin Studio ↗');
        admA.href = '/admin/#folder-about';
        dHead.appendChild(admA);
      }
      docSec.appendChild(dHead);
      var dGrid = el('div', 'ap-cards-grid');
      S.pages.forEach(function (a) {
        var card = el('article', 'ap-card');
        var body = el('div', 'ap-card-main');
        var h3 = el('h3', 'ap-card-title');
        var lnk = el('a', '', pick(a, 'title') || a.title_en);
        lnk.href = '/about/?slug=' + encodeURIComponent(a.slug);
        h3.appendChild(lnk);
        body.appendChild(h3);
        var sum = pick(a, 'summary');
        if (sum) body.appendChild(el('p', 'ap-muted', sum.slice(0, 180)));
        card.appendChild(body);
        var foot = el('div', 'ap-card-foot');
        var aRead = el('a', 'ap-btn ap-btn-sm ap-btn-primary', isOr ? 'ପଢ଼ନ୍ତୁ →' : 'Read Document →');
        aRead.href = '/about/?slug=' + encodeURIComponent(a.slug);
        foot.appendChild(aRead);
        card.appendChild(foot);
        dGrid.appendChild(card);
      });
      docSec.appendChild(dGrid);
      shell.appendChild(docSec);
    }

    S.root.appendChild(shell);
  }

  function renderInquiryDesk() {
    var sec = el('section', 'ap-panel');
    sec.setAttribute('aria-label', 'Contact, Academic Partnership & Editorial Correction Desk');
    var head = el('div', 'ap-panel-head');
    head.appendChild(el('h2', 'ap-panel-title', S.lang === 'or'
      ? '📩 ଯୋଗାଯୋଗ, ଶିକ୍ଷାଗତ ସହଭାଗିତା ଏବଂ ସମ୍ପାଦକୀୟ ସଂଶୋଧନ ଡେସ୍କ'
      : '📩 Contact, Academic Partnership & Editorial Correction Desk'));
    sec.appendChild(head);

    sec.appendChild(el('p', 'ap-muted', S.lang === 'or'
      ? 'ତଥ୍ୟ-ଯାଞ୍ଚ ସଂଶୋଧନ, ଶିକ୍ଷାଗତ ସହଯୋଗ, ପ୍ରେସ୍ ଅନୁସନ୍ଧାନ କିମ୍ବା ଅଭିଯୋଗ ପାଇଁ କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ସମ୍ପାଦକମଣ୍ଡଳୀ ସହିତ ସିଧାସଳଖ ଯୋଗାଯୋଗ କରନ୍ତୁ।'
      : 'Reach Common Sense Odisha editors directly for fact-check corrections, academic collaborations, press inquiries, or citizen grievance escalations.'));

    function wrapField(id, label, control) {
      var f = el('div', 'ap-field');
      var l = el('label', 'ap-label', label);
      l.setAttribute('for', id);
      control.id = id;
      f.append(l, control);
      return f;
    }

    var g = el('div', 'ap-grid-2');
    var selType = el('select', 'ap-select');
    [['general_inquiry', 'General Inquiry'], ['editorial_correction', 'Report Typo / Editorial Correction'], ['academic_partnership', 'Academic / Coaching Partnership'], ['grievance_escalation', 'Citizen Grievance Escalation'], ['press_media', 'Press & Media Inquiry']].forEach(function (p) {
      selType.appendChild(new Option(p[1], p[0]));
    });
    var inName = el('input', 'ap-input'); inName.placeholder = 'Your Full Name';
    var inEmail = el('input', 'ap-input'); inEmail.type = 'email'; inEmail.placeholder = 'name@example.com';
    var inDist = el('input', 'ap-input'); inDist.placeholder = 'e.g. Khordha, Cuttack, Sambalpur';

    g.append(
      wrapField('ap-inq-type', 'Inquiry Category', selType),
      wrapField('ap-inq-name', 'Your Full Name *', inName),
      wrapField('ap-inq-email', 'Email Address (Optional)', inEmail),
      wrapField('ap-inq-district', 'Odisha District (Optional)', inDist)
    );

    var inSub = el('input', 'ap-input'); inSub.placeholder = 'Short subject or page title';
    var inMsg = el('textarea', 'ap-textarea'); inMsg.placeholder = 'Write your message, official .gov.in URL, or correction details (min 10 chars)...';

    var statusEl = el('div', 'ap-muted', '');
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');

    var actions = el('div', 'ap-form-actions');
    var btnSend = el('button', 'ap-btn ap-btn-primary', S.lang === 'or' ? 'ସମ୍ପାଦକୀୟ ଡେସ୍କକୁ ପଠାନ୍ତୁ →' : 'Submit to Editorial Desk →');
    btnSend.type = 'button';
    btnSend.addEventListener('click', async function () {
      var nameVal = inName.value.trim();
      var subVal = inSub.value.trim();
      var msgVal = inMsg.value.trim();
      if (!nameVal || !subVal || msgVal.length < 10) {
        statusEl.className = 'ap-status-msg is-err';
        statusEl.textContent = 'Please provide your name, subject, and at least 10 characters in your message.';
        return;
      }
      try {
        await api('/api/public/about/inquiries', {
          method: 'POST',
          body: { inquiry_type: selType.value, sender_name: nameVal, sender_email: inEmail.value.trim(), district: inDist.value.trim(), subject_text: subVal, message_text: msgVal }
        });
        inName.value = ''; inEmail.value = ''; inDist.value = ''; inSub.value = ''; inMsg.value = '';
        statusEl.className = 'ap-status-msg is-ok';
        statusEl.textContent = S.lang === 'or'
          ? '✅ ଧନ୍ୟବାଦ! ଆପଣଙ୍କ ବାର୍ତ୍ତା କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା ସମ୍ପାଦକୀୟ ଏବଂ ସ୍ୱଚ୍ଛତା ଡେସ୍କରେ ପଞ୍ଜୀକୃତ ହୋଇଛି।'
          : '✅ Thank you! Your inquiry has been received by the Common Sense Odisha Editorial & Transparency Desk for review.';
      } catch (e) {
        statusEl.className = 'ap-status-msg is-err';
        statusEl.textContent = e.message;
      }
    });
    actions.appendChild(btnSend);

    sec.append(
      g,
      wrapField('ap-inq-subject', 'Subject *', inSub),
      wrapField('ap-inq-message', 'Message / Correction Details *', inMsg),
      actions,
      statusEl
    );
    return sec;
  }

  // ============================================================================
  // ARTICLE / PROFILE READER & DRAFT PREVIEW
  // ============================================================================
  async function renderArticleView(slug, previewToken) {
    clear(S.root);
    S.root.appendChild(el('div', 'ap-empty', 'Loading institutional document...'));
    var url = '/api/public/about/article?slug=' + encodeURIComponent(slug);
    if (previewToken) url += '&preview_token=' + encodeURIComponent(previewToken);
    try {
      var data = await api(url);
      var a = data.article;
      document.title = a.title_en + ' | About Common Sense Odisha';
      if (!data.is_preview) { fireTelemetry('view', a); injectInstitutionalJsonLd(a); }
      drawArticleDom(data);
    } catch (e) {
      clear(S.root);
      var nf = el('div', 'ap-empty-card');
      nf.appendChild(el('strong', '', e.message || 'Document not found'));
      var bk = el('a', 'ap-btn ap-btn-primary', '← Back to About Portal'); bk.href = '/about/';
      nf.appendChild(bk);
      S.root.appendChild(nf);
    }
  }

  function drawArticleDom(data) {
    var a = data.article;
    clear(S.root);
    var shell = el('div', 'ap-root');

    if (data.is_preview) {
      var pb = el('div', 'ap-preview-banner');
      pb.append(el('span', '', '👁 ADMIN DRAFT PREVIEW — Not Yet Public'), el('span', '', 'Verify bilingual layout, tables & PDFs before publishing'));
      shell.appendChild(pb);
    }

    var topRow = el('div', 'ap-panel-head');
    var backA = el('a', 'ap-btn ap-btn-sm', '← Back to About Portal'); backA.href = '/about/';
    var lGrp = el('div', 'ap-chips');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (lg) {
      var b = el('button', 'ap-btn ap-btn-sm' + (S.lang === lg[0] ? ' ap-btn-primary' : ''), lg[1]); b.type = 'button';
      b.addEventListener('click', function () { setLangPref(lg[0]); drawArticleDom(data); });
      lGrp.appendChild(b);
    });
    topRow.append(backA, lGrp);
    shell.appendChild(topRow);

    var hero = el('article', 'ap-panel');
    if (a.cover_image_url && safeHref(a.cover_image_url)) {
      var img = el('img', 'ap-cover'); img.src = safeHref(a.cover_image_url); img.alt = a.cover_image_caption || a.title_en; img.loading = 'lazy'; img.decoding = 'async';
      hero.appendChild(img);
    }
    var metaRow = el('div', 'ap-chips');
    metaRow.appendChild(el('span', 'ap-badge', a.doc_type_badge + (a.effective_date ? ' · Effective ' + a.effective_date : '')));
    metaRow.appendChild(el('span', 'ap-badge is-meta', '⏱ ~' + estimateReadMins(a) + ' min read'));
    hero.appendChild(metaRow);
    hero.appendChild(el('h1', 'ap-panel-title', pick(a, 'title') || a.title_en));
    if (a.person_role_en) hero.appendChild(el('div', 'ap-muted', '👤 ' + pick(a, 'person_role') + (a.person_credentials ? ' · ' + a.person_credentials : '') + (a.person_district ? ' · ' + a.person_district : '')));
    var bodyTxt = pick(a, 'article_body') || a.article_body_en;
    renderProse(hero, bodyTxt);
    shell.appendChild(hero);

    if (Array.isArray(a.highlights_table) && a.highlights_table.length) {
      var sH = el('section', 'ap-panel');
      sH.appendChild(el('h2', 'ap-panel-title', 'Core Institutional Principles'));
      var tw = el('div', 'ap-table-wrap'), tbl = el('table', 'ap-table'), tb = el('tbody');
      a.highlights_table.forEach(function (r) {
        var tr = el('tr');
        tr.append(
          el('td', '', S.lang === 'or' && r.principle_or ? r.principle_or : (r.principle_en || r.key_en || '—')),
          el('td', '', S.lang === 'or' && r.detail_or ? r.detail_or : (r.detail_en || r.value_en || '—'))
        );
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); tw.appendChild(tbl); sH.appendChild(tw); shell.appendChild(sH);
    }

    if (Array.isArray(a.verification_steps) && a.verification_steps.length) {
      var sV = el('section', 'ap-panel');
      sV.appendChild(el('h2', 'ap-panel-title', 'Editorial Fact-Checking & Verification Protocol'));
      var gV = el('div', 'ap-cards-grid');
      a.verification_steps.forEach(function (v) {
        var c = el('div', 'ap-card');
        c.append(el('strong', '', v.step + (v.title_en ? ' · ' + v.title_en : '')), el('p', 'ap-muted', S.lang === 'or' && v.detail_or ? v.detail_or : v.detail_en));
        gV.appendChild(c);
      });
      sV.appendChild(gV); shell.appendChild(sV);
    }

    if (Array.isArray(a.faq_items) && a.faq_items.length) {
      var sF = el('section', 'ap-panel');
      sF.appendChild(el('h2', 'ap-panel-title', 'Public FAQs'));
      a.faq_items.forEach(function (fq) {
        var det = el('details', 'ap-faq-item');
        det.append(el('summary', '', S.lang === 'or' && fq.q_or ? fq.q_or : fq.q_en), el('p', 'ap-muted', S.lang === 'or' && fq.a_or ? fq.a_or : fq.a_en));
        sF.appendChild(det);
      });
      shell.appendChild(sF);
    }

    if (a.charter_pdf_url || a.press_kit_pdf_url) {
      var sPdf = el('section', 'ap-panel');
      sPdf.appendChild(el('h2', 'ap-panel-title', '📄 Official Documents & Inline PDF Viewer'));
      var pdfUrl = safeHref(a.charter_pdf_url || a.press_kit_pdf_url);
      var dlRow = el('div', 'ap-chips');
      [['Download Charter / Policy PDF', a.charter_pdf_url], ['Download Brochure / Press Kit PDF', a.press_kit_pdf_url]].forEach(function (pr) {
        var u = safeHref(pr[1]);
        if (!u) return;
        var aDl = el('a', 'ap-btn ap-btn-sm ap-btn-primary', '⬇ ' + pr[0]);
        aDl.href = u; aDl.target = '_blank'; aDl.rel = 'noopener noreferrer';
        aDl.addEventListener('click', function () { fireTelemetry('pdf_download', a); });
        dlRow.appendChild(aDl);
      });
      sPdf.appendChild(dlRow);
      if (pdfUrl) {
        var fr = el('iframe', 'ap-pdf-frame'); fr.src = pdfUrl; fr.title = a.title_en + ' PDF';
        sPdf.appendChild(fr);
      }
      shell.appendChild(sPdf);
    }

    shell.appendChild(renderInquiryDesk());
    S.root.appendChild(shell);
  }

  async function reloadOverview() {
    await loadPortalData();
    renderOverviewPortal();
  }

  function mountOptimisticSkeleton() {
    if (S.root && S.root.querySelector('.cso-portal-skeleton')) return;
    clear(S.root);
    var skel = el('div', 'cso-portal-skeleton');
    skel.setAttribute('aria-busy', 'true');
    skel.appendChild(el('div', 'cso-skel-hero'));
    skel.appendChild(el('div', 'cso-skel-bar'));
    var g = el('div', 'cso-skel-grid');
    g.append(el('div', 'cso-skel-card'), el('div', 'cso-skel-card'));
    skel.appendChild(g);
    S.root.appendChild(skel);
  }

  async function boot() {
    S.root = document.getElementById('cso-about-portal-root');
    if (!S.root) return;
    document.body.classList.add('cso-portal-active', 'cso-portal-about-active');
    S.lang = getLangPref();
    var slug = qsParam('slug');
    var prev = qsParam('preview_token');
    if (slug) {
      await detectAdminSession();
      await renderArticleView(slug, prev);
      return;
    }

    mountOptimisticSkeleton();
    var pair = await Promise.all([
      fetch('/api/public/about/bootstrap', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      detectAdminSession()
    ]);
    var bootRes = pair[0];
    if (bootRes && bootRes.ok) {
      S.nodes = bootRes.nodes || [];
      S.transparency = bootRes.transparency || S.transparency;
      S.institutional = bootRes.institutional || null;
      S.pages = bootRes.pages || bootRes.items || [];
      S.allPages = S.pages.slice();
      S.sources = bootRes.sources || [];
      S.sectors = bootRes.sectors || [];
      renderOverviewPortal();
      return;
    }
    await reloadOverview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
