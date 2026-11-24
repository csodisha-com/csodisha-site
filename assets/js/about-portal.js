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
    var t = S.transparency || {};
    var hero = el('section', 'ap-hero');
    hero.setAttribute('aria-label', 'About Common Sense Odisha — Public Charter & Transparency Hub');

    var top = el('div', 'ap-hero-top');
    var eyebrow = el('span', 'ap-eyebrow');
    eyebrow.appendChild(el('span', 'ap-eyebrow-dot'));
    eyebrow.appendChild(el('span', '', S.lang === 'or'
      ? 'ସ୍ୱାଧୀନ ସାର୍ବଜନୀନ ଜ୍ଞାନ ଚାର୍ଟର · ଯାଞ୍ଚିତ .GOV.IN ଏବଂ ସମ୍ପାଦକୀୟ ସ୍ୱଚ୍ଛତା'
      : 'INDEPENDENT PUBLIC KNOWLEDGE CHARTER · VERIFIED .GOV.IN & EDITORIAL TRANSPARENCY'));
    top.appendChild(eyebrow);
    top.appendChild(buildLangToggle(function () { renderOverviewPortal(); }));
    hero.appendChild(top);

    var copy = el('div', 'ap-hero-copy');
    copy.appendChild(el('h1', 'ap-hero-title', S.lang === 'or'
      ? 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା — ସାର୍ବଜନୀନ ଚାର୍ଟର ଏବଂ ସ୍ୱଚ୍ଛତା କେନ୍ଦ୍ର'
      : 'About Common Sense Odisha — Public Charter & Transparency Hub'));
    copy.appendChild(el('p', 'ap-hero-sub', S.lang === 'or'
      ? 'ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀ, ଚାକିରି ଆଶାୟୀ, କୃଷକ, ମହିଳା ଏବଂ ନାଗରିକମାନଙ୍କୁ ଯାଞ୍ଚିତ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି, ସରକାରୀ ଯୋଜନା, ଅଧ୍ୟୟନ ସାମଗ୍ରୀ ଏବଂ ସହପାଠୀ ସମୁଦାୟ ଯୋଗାଇ ଦେଉଥିବା ଏକ ସ୍ୱାଧୀନ, ଖୋଲା-ପ୍ରବେଶ ପ୍ଲାଟଫର୍ମ।'
      : 'An independent, open-access civic and educational platform empowering Odisha students, job seekers, farmers, women, and citizens with verified recruitment notifications, welfare schemes, study resources, and peer communities.'));
    hero.appendChild(copy);

    // 5-Tile Live Platform Transparency KPI Strip embedded in Hero
    var kpiRow = el('div', 'ap-hero-kpis');
    kpiRow.setAttribute('aria-label', 'Live Platform Transparency Counters');
    [
      [num(t.verified_jobs || 0), S.lang === 'or' ? 'ଯାଞ୍ଚିତ ସକ୍ରିୟ ଚାକିରି' : 'Verified Jobs Live'],
      [num(t.active_schemes || 0), S.lang === 'or' ? 'ସକ୍ରିୟ କଲ୍ୟାଣ ଯୋଜନା' : 'Active Welfare Schemes'],
      [num(t.study_modules || 0), S.lang === 'or' ? 'ଅଧ୍ୟୟନ ମଡ୍ୟୁଲ୍ ଓ PYQ' : 'Study Modules & PYQs'],
      [num(t.community_members || 0), S.lang === 'or' ? 'ପଞ୍ଜୀକୃତ ସଦସ୍ୟ' : 'Registered Members'],
      [num(t.verified_portals || S.sources.length), S.lang === 'or' ? 'ଯାଞ୍ଚିତ .gov.in ପୋର୍ଟାଲ୍' : 'Verified .gov.in Portals']
    ].forEach(function (pair) {
      var tile = el('div', 'ap-hero-kpi');
      tile.appendChild(el('strong', 'ap-hero-kpi-val', pair[0]));
      tile.appendChild(el('span', 'ap-hero-kpi-label', pair[1]));
      kpiRow.appendChild(tile);
    });
    hero.appendChild(kpiRow);
    shell.appendChild(hero);
  }

  function renderOverviewPortal() {
    var activeEl = document.activeElement;
    var restoreFocusId = (activeEl && activeEl.id === 'ap-source-search') ? activeEl.id : '';

    clear(S.root);
    injectInstitutionalJsonLd(null);
    var shell = el('div', 'ap-root');

    // 1. Flagship Editorial Hero Banner & Embedded 5-Tile Live Platform Transparency KPI Strip
    renderEditorialHero(shell);

    // 2. 3-Layer Institutional Charter, Policies & Mentor Profiles
    var navPanel = el('section', 'ap-panel');
    navPanel.setAttribute('aria-label', 'Institutional Charter, Policies & Mentor Profiles');
    var nHead = el('div', 'ap-panel-head');
    nHead.appendChild(el('h2', 'ap-panel-title', S.lang === 'or'
      ? '🏛 ସାଂସ୍ଥାନିକ ଚାର୍ଟର, ନୀତି ଏବଂ ମେଣ୍ଟର ପ୍ରୋଫାଇଲ୍'
      : '🏛 Institutional Charter, Policies & Mentor Profiles'));
    if (S.isAdmin) {
      var admAdd = el('a', 'ap-btn ap-btn-sm', '+ Author Page in Admin Studio ↗');
      admAdd.href = '/admin/#folder-about';
      nHead.appendChild(admAdd);
    }
    navPanel.appendChild(nHead);

    var l1Pills = el('div', 'ap-chips');
    var bAll = el('button', 'ap-pill' + (!S.activeL1 ? ' is-active' : ''));
    bAll.type = 'button';
    bAll.appendChild(el('span', '', S.lang === 'or' ? 'ସମସ୍ତ ସ୍ତମ୍ଭ' : 'All Pillars'));
    bAll.appendChild(el('span', 'ap-pill-count', num(countPagesForPillar(''))));
    bAll.addEventListener('click', function () { S.activeL1 = ''; reloadOverview(); });
    l1Pills.appendChild(bAll);

    S.nodes.filter(function (n) { return Number(n.level) === 1; }).forEach(function (n) {
      var lbl = (n.icon ? n.icon + ' ' : '') + pick(n, 'title');
      var cnt = countPagesForPillar(n.id);
      var b = el('button', 'ap-pill' + (S.activeL1 === n.id ? ' is-active' : ''));
      b.type = 'button';
      b.appendChild(el('span', '', lbl));
      b.appendChild(el('span', 'ap-pill-count', num(cnt)));
      b.addEventListener('click', function () { S.activeL1 = n.id; reloadOverview(); });
      l1Pills.appendChild(b);
    });
    navPanel.appendChild(l1Pills);

    if (!S.pages.length) {
      var empCard = el('div', 'ap-empty-card');
      var art = el('div', 'ap-empty-art');
      art.appendChild(buildEmptyDocSvg());
      empCard.appendChild(art);
      empCard.appendChild(el('h3', 'ap-card-title', S.lang === 'or'
        ? 'ଏହି ସ୍ତମ୍ଭରେ ସାଂସ୍ଥାନିକ ଦସ୍ତାବିଜ୍ ଶୀଘ୍ର ପ୍ରକାଶିତ ହେବ'
        : 'Institutional Documents in This Pillar Coming Soon'));
      empCard.appendChild(el('p', 'ap-muted', S.lang === 'or'
        ? 'ଅନ୍ୟ ସମସ୍ତ ସାଂସ୍ଥାନିକ ଚାର୍ଟର, ସମ୍ପାଦକୀୟ ମାନଦଣ୍ଡ ଏବଂ ଯାଞ୍ଚିତ ସରକାରୀ ପୋର୍ଟାଲ୍ ଦେଖିବାକୁ ସମସ୍ତ ସ୍ତମ୍ଭ ଚୟନ କରନ୍ତୁ।'
        : 'All published public charters, fact-checking standards, and mentor disclosures are available across our institutional pillars.'));
      var eActs = el('div', 'ap-chips');
      if (S.activeL1) {
        var rAll = el('button', 'ap-btn ap-btn-sm ap-btn-primary', S.lang === 'or' ? 'ସମସ୍ତ ସ୍ତମ୍ଭ ଦେଖନ୍ତୁ' : 'Show All Pillars');
        rAll.type = 'button';
        rAll.addEventListener('click', function () { S.activeL1 = ''; reloadOverview(); });
        eActs.appendChild(rAll);
      }
      if (S.isAdmin) {
        var aPub = el('a', 'ap-btn ap-btn-sm ap-btn-primary', '+ Author Page in Admin Studio ↗');
        aPub.href = '/admin/#folder-about';
        eActs.appendChild(aPub);
      }
      empCard.appendChild(eActs);
      navPanel.appendChild(empCard);
    } else {
      var grid = el('div', 'ap-cards-grid');
      S.pages.forEach(function (a) {
        var card = el('article', 'ap-card');
        var body = el('div', 'ap-card-main');

        var badges = el('div', 'ap-chips');
        badges.appendChild(el('span', 'ap-badge', a.doc_type_badge || 'Institutional Charter'));
        if (a.effective_date) {
          badges.appendChild(el('span', 'ap-badge is-meta', '📅 Effective ' + a.effective_date));
        } else {
          badges.appendChild(el('span', 'ap-badge is-meta', '⏱ ~' + estimateReadMins(a) + ' min read'));
        }
        body.appendChild(badges);

        var h3 = el('h3', 'ap-card-title');
        var lnk = el('a', '', pick(a, 'title') || a.title_en);
        lnk.href = '/about/?slug=' + encodeURIComponent(a.slug);
        h3.appendChild(lnk);
        body.appendChild(h3);

        if (a.person_role_en) {
          body.appendChild(el('div', 'ap-muted', '👤 ' + pick(a, 'person_role') + (a.person_district ? ' · ' + a.person_district : '')));
        }
        var sum = pick(a, 'summary');
        if (sum) body.appendChild(el('p', 'ap-muted', sum.slice(0, 195)));
        card.appendChild(body);

        var foot = el('div', 'ap-card-foot');
        foot.appendChild(el('span', 'ap-muted', '⏱ ' + estimateReadMins(a) + ' min read'));
        var aRead = el('a', 'ap-btn ap-btn-sm ap-btn-primary', S.lang === 'or' ? 'ସମ୍ପୂର୍ଣ୍ଣ ଦସ୍ତାବିଜ୍ ପଢ଼ନ୍ତୁ →' : 'Read Full Document →');
        aRead.href = '/about/?slug=' + encodeURIComponent(a.slug);
        foot.appendChild(aRead);
        card.appendChild(foot);

        grid.appendChild(card);
      });
      navPanel.appendChild(grid);
    }
    shell.appendChild(navPanel);

    // 3. Verified Official Government Portals Registry (Anti-Fraud Directory — 3-Column Aligned)
    var srcPanel = el('section', 'ap-panel');
    srcPanel.setAttribute('aria-label', 'Verified Official Government Portals Registry');
    var sHead = el('div', 'ap-panel-head');
    sHead.appendChild(el('h2', 'ap-panel-title', S.lang === 'or'
      ? '🛡️ ଯାଞ୍ଚିତ ସରକାରୀ ପୋର୍ଟାଲ୍ ରେଜିଷ୍ଟ୍ରି (ଠକେଇ-ବିରୋଧୀ ତାଲିକା)'
      : '🛡️ Verified Official Government Portals Registry (Anti-Fraud Directory)'));

    var sBox = el('div', 'ap-search-box');
    var sSearch = el('input', 'ap-input');
    sSearch.id = 'ap-source-search';
    sSearch.type = 'search';
    sSearch.setAttribute('aria-label', 'Filter verified official government portals');
    sSearch.placeholder = S.lang === 'or' ? 'ପୋର୍ଟାଲ୍ ଖୋଜନ୍ତୁ (ଯଥା: OPSC, Subhadra, Scholarship)...' : 'Verify portal (e.g. OPSC, Subhadra, Scholarship)...';
    sSearch.value = S.sourceSearch;
    var sTimer = null;
    sSearch.addEventListener('input', function () {
      S.sourceSearch = sSearch.value.trim();
      clearTimeout(sTimer);
      sTimer = setTimeout(function () { reloadOverview(); }, 260);
    });
    sSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(sTimer); S.sourceSearch = sSearch.value.trim(); reloadOverview(); }
    });
    sBox.appendChild(sSearch);
    if (S.sourceSearch || S.sourceSector) {
      var bClr = el('button', 'ap-btn ap-btn-sm', 'Reset');
      bClr.type = 'button';
      bClr.addEventListener('click', function () { S.sourceSearch = ''; S.sourceSector = ''; reloadOverview(); });
      sBox.appendChild(bClr);
    }
    sHead.appendChild(sBox);
    srcPanel.appendChild(sHead);

    var secPills = el('div', 'ap-chips');
    var bSAll = el('button', 'ap-pill' + (!S.sourceSector ? ' is-active' : ''), S.lang === 'or' ? 'ସମସ୍ତ କ୍ଷେତ୍ର' : 'All Sectors');
    bSAll.type = 'button';
    bSAll.addEventListener('click', function () { S.sourceSector = ''; reloadOverview(); });
    secPills.appendChild(bSAll);
    (S.sectors || []).forEach(function (sec) {
      var b = el('button', 'ap-pill' + (S.sourceSector === sec ? ' is-active' : ''), sec);
      b.type = 'button';
      b.addEventListener('click', function () { S.sourceSector = sec; reloadOverview(); });
      secPills.appendChild(b);
    });
    srcPanel.appendChild(secPills);

    if (!S.sources.length) {
      srcPanel.appendChild(el('div', 'ap-empty', S.lang === 'or' ? 'ଆପଣଙ୍କ ସନ୍ଧାନ ସହିତ କୌଣସି ଯାଞ୍ଚିତ ପୋର୍ଟାଲ୍ ମିଳିଲା ନାହିଁ।' : 'No verified government portals match your current search or sector filter.'));
    } else {
      var sGrid = el('div', 'ap-sources-grid');
      S.sources.forEach(function (src) {
        var c = el('article', 'ap-card');
        var main = el('div', 'ap-card-main');
        var top = el('div', 'ap-chips');
        top.append(
          el('span', 'ap-badge is-gov', '✓ Verified ' + (src.domain_badge || '.gov.in')),
          el('span', 'ap-badge', src.sector || 'Official')
        );
        main.appendChild(top);
        main.appendChild(el('h3', 'ap-card-title', pick(src, 'authority_name') || src.authority_name_en));
        main.appendChild(el('p', 'ap-muted', pick(src, 'purpose') || src.purpose_en));
        if (src.helpline_info) {
          main.appendChild(el('div', 'ap-helpline', '☎ Helpline: ' + src.helpline_info));
        }
        c.appendChild(main);

        var foot = el('div', 'ap-card-foot');
        var href = safeHref(src.official_url);
        var aExt = el('a', 'ap-btn ap-btn-sm ap-btn-primary', S.lang === 'or' ? 'ସରକାରୀ ପୋର୍ଟାଲ୍ ଖୋଲନ୍ତୁ ↗' : 'Visit Official Portal ↗');
        if (href) {
          aExt.href = href;
          aExt.target = '_blank';
          aExt.rel = 'noopener noreferrer';
        }
        foot.appendChild(aExt);
        c.appendChild(foot);
        sGrid.appendChild(c);
      });
      srcPanel.appendChild(sGrid);
    }
    shell.appendChild(srcPanel);

    // 4. Interactive Contact, Partnership & Editorial Correction Desk
    shell.appendChild(renderInquiryDesk());

    S.root.appendChild(shell);

    if (restoreFocusId) {
      var refocus = document.getElementById(restoreFocusId);
      if (refocus && typeof refocus.focus === 'function') refocus.focus();
    }
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
      var img = el('img', 'ap-cover'); img.src = safeHref(a.cover_image_url); img.alt = a.cover_image_caption || a.title_en;
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

  async function boot() {
    S.root = document.getElementById('cso-about-portal-root');
    if (!S.root) return;
    document.body.classList.add('cso-portal-active', 'cso-portal-about-active');
    S.lang = getLangPref();
    await detectAdminSession();
    var slug = qsParam('slug');
    var prev = qsParam('preview_token');
    if (slug) { await renderArticleView(slug, prev); return; }
    await reloadOverview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
