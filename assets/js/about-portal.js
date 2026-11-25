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

  function dedupeParagraphs(summary, body) {
    var s = String(summary || '').trim();
    var b = String(body || '').trim();
    if (!s) return b;
    if (!b) return s;
    var normS = s.replace(/\s+/g, ' ').toLowerCase();
    var normB = b.replace(/\s+/g, ' ').toLowerCase();
    if (normB.indexOf(normS) === 0 || normS === normB) return b;
    return s + '\n\n' + b;
  }

  function openCharterModal(page) {
    var existing = document.getElementById('abt-charter-modal');
    if (existing) existing.remove();
    var isOr = S.lang === 'or';
    var backdrop = el('div', 'abt-modal-backdrop');
    backdrop.id = 'abt-charter-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', pick(page, 'title') || page.title_en || 'Official Charter');

    var dialog = el('div', 'abt-modal');
    var head = el('div', 'abt-modal-head');
    head.appendChild(el('h3', 'abt-modal-title', pick(page, 'title') || page.title_en || 'Official Charter'));
    var btnClose = el('button', 'abt-modal-close', '✕');
    btnClose.type = 'button';
    btnClose.setAttribute('aria-label', isOr ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close charter');
    head.appendChild(btnClose);
    dialog.appendChild(head);

    var bodyWrap = el('div', 'abt-modal-body');
    var combined = dedupeParagraphs(pick(page, 'summary'), pick(page, 'article_body'));
    if (combined) {
      renderProse(bodyWrap, combined.slice(0, 1200));
    } else {
      bodyWrap.appendChild(el('p', 'abt-card-body', isOr
        ? 'ସମ୍ପୂର୍ଣ୍ଣ ଦସ୍ତାବିଜ୍ ପଢ଼ିବା ପାଇଁ ତଳେ ଥିବା ଲିଙ୍କ୍ ଖୋଲନ୍ତୁ।'
        : 'Open the full institutional document below to read all verified sections.'));
    }
    dialog.appendChild(bodyWrap);

    var foot = el('div', 'abt-modal-foot');
    var fullLink = el('a', 'ap-btn ap-btn-sm ap-btn-primary', isOr ? 'ସମ୍ପୂର୍ଣ୍ଣ ଦସ୍ତାବିଜ୍ ପଢ଼ନ୍ତୁ →' : 'Open Full Document →');
    fullLink.href = '/about/?slug=' + encodeURIComponent(page.slug);
    var closeBtn2 = el('button', 'ap-btn ap-btn-sm', isOr ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close');
    closeBtn2.type = 'button';
    foot.append(fullLink, closeBtn2);
    dialog.appendChild(foot);
    backdrop.appendChild(dialog);

    function closeModal() {
      backdrop.remove();
      document.body.classList.remove('cso-modal-open');
      document.removeEventListener('keydown', onEsc);
    }
    function onEsc(e) {
      if (e && e.key === 'Escape') closeModal();
    }
    btnClose.addEventListener('click', closeModal);
    closeBtn2.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', onEsc);
    document.body.classList.add('cso-modal-open');
    document.body.appendChild(backdrop);
  }

  function renderOverviewPortal() {
    clear(S.root);
    injectInstitutionalJsonLd(null);
    var isOr = S.lang === 'or';
    var inst = S.institutional || {};
    var shell = el('div', 'ap-root');

    // 0. Compact Institutional Hero Header
    renderEditorialHero(shell);

    // Section 1: Two Equal-Height Summary Cards (2-Column Balanced Grid)
    var summaryGrid = el('div', 'abt-summary-grid');

    // Left Card: Mission & Editorial Standards
    var cMission = el('section', 'abt-card');
    cMission.setAttribute('aria-label', 'Mission and Editorial Standards');
    cMission.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୧ · ଲକ୍ଷ୍ୟ ଓ ସମ୍ପାଦକୀୟ ମାନଦଣ୍ଡ' : '01 · MISSION & EDITORIAL STANDARDS'));
    cMission.appendChild(el('h2', 'abt-card-title', isOr ? 'ଆମର ଲକ୍ଷ୍ୟ ଓ ସମ୍ପାଦକୀୟ ମାନଦଣ୍ଡ' : 'Mission & Editorial Standards'));
    cMission.appendChild(el('p', 'abt-card-body', isOr
      ? (inst.mission_or || 'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା (CSO) ହେଉଛି ଏକ ସ୍ୱାଧୀନ, ଖୋଲା-ପ୍ରବେଶ ସାର୍ବଜନୀନ ପ୍ଲାଟଫର୍ମ, ଯାହା ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀ, ଚାକିରି ଆଶାୟୀ ଏବଂ ନାଗରିକମାନଙ୍କୁ ସଠିକ୍ ଓ ଯାଞ୍ଚିତ ସୂଚନା ଯୋଗାଇ ଦିଏ। ପ୍ରତ୍ୟେକ ନିଯୁକ୍ତି, ଯୋଜନା ଓ ଅଧ୍ୟୟନ ସୂଚନା ନିରପେକ୍ଷ ଭାବରେ ପ୍ରକାଶିତ ହୁଏ।')
      : (inst.mission_en || 'Common Sense Odisha (CSO) is an independent, open-access civic platform helping Odisha students, job seekers, and citizens navigate public opportunities with clarity. Every alert, scheme guide, and syllabus update is verified against primary government releases before publication.')));
    var mUl = el('ul', 'abt-bullet-list');
    [
      isOr ? 'ପ୍ରାଥମିକ .gov.in ଓ .odisha.gov.in ସରକାରୀ ପୋର୍ଟାଲ୍ ସହିତ ଯାଞ୍ଚ' : 'Primary verification against .gov.in & .odisha.gov.in notifications',
      isOr ? 'ସ୍ପଷ୍ଟ ପ୍ରକାଶନ ତାରିଖ, ଆବେଦନ ଶେଷ ତାରିଖ ଓ ସଂଶୋଧନ ସୂଚନା' : 'Clear publication dates, application deadlines, and update timestamps',
      isOr ? 'ସମ୍ପୂର୍ଣ୍ଣ ମାଗଣା, ପେୱାଲ୍-ମୁକ୍ତ ଓ ନିରପେକ୍ଷ ସାର୍ବଜନୀନ ପ୍ରବେଶ' : 'Zero-paywall, non-partisan public access for every citizen'
    ].forEach(function (pt) { mUl.appendChild(el('li', '', pt)); });
    cMission.appendChild(mUl);
    summaryGrid.appendChild(cMission);

    // Right Card: Bilingual & Accessible Design
    var cA11y = el('section', 'abt-card');
    cA11y.setAttribute('aria-label', 'Bilingual and Accessible Design');
    cA11y.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୨ · ଦ୍ୱିଭାଷୀ ଓ ସୁଗମ ଡିଜାଇନ୍' : '02 · BILINGUAL & ACCESSIBLE DESIGN'));
    cA11y.appendChild(el('h2', 'abt-card-title', isOr ? 'ଦ୍ୱିଭାଷୀ ଓ ସୁଗମ ଡିଜାଇନ୍' : 'Bilingual & Accessible Design'));
    cA11y.appendChild(el('p', 'abt-card-body', isOr
      ? 'ଓଡ଼ିଶାର ପ୍ରତ୍ୟେକ ଜିଲ୍ଲା ଓ ଗ୍ରାମାଞ୍ଚଳର ପାଠକଙ୍କ ପାଇଁ ସହଜ ପଠନ, ଉଚ୍ଚ-କଣ୍ଟ୍ରାଷ୍ଟ ଦୃଶ୍ୟମାନତା ଏବଂ ଦ୍ରୁତ ମୋବାଇଲ୍ ଅନୁଭବ ପାଇଁ ନିର୍ମିତ।'
      : 'Built for effortless reading across all 30 Odisha districts with native bilingual support, accessible contrast, and lightweight performance on every device.'));
    var aUl = el('ul', 'abt-bullet-list');
    [
      isOr ? 'ଇଂରାଜୀ ଏବଂ ଓଡ଼ିଆ (English + ଓଡ଼ିଆ) ଦ୍ୱିଭାଷୀ ପଠନ ସୁବିଧା' : 'Native English + ଓଡ଼ିଆ bilingual reading across all portals',
      isOr ? '୪ଟି ଉଚ୍ଚ-କଣ୍ଟ୍ରାଷ୍ଟ ଥିମ୍ (System, Dark Night, Reading Mode, Odisha & Bharat)' : '4 high-contrast themes: System, Dark Night, Reading Mode & Odisha & Bharat',
      isOr ? 'କମ୍ ଡାଟାରେ ଦ୍ରୁତ ଖୋଲୁଥିବା ମୋବାଇଲ୍-ପ୍ରଥମ ଲେଆଉଟ୍' : 'Fast mobile-first loading engineered for rural & low-bandwidth networks'
    ].forEach(function (pt) { aUl.appendChild(el('li', '', pt)); });
    cA11y.appendChild(aUl);
    summaryGrid.appendChild(cA11y);

    shell.appendChild(summaryGrid);

    // Section 2: Explore Our 5 Core Portals (Compact Horizontal 5-Card Strip)
    var portalsSec = el('section', 'abt-portals-section');
    portalsSec.setAttribute('aria-label', 'Explore Our 5 Core Portals');
    var pHead = el('div', 'abt-section-head');
    pHead.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୩ · ଆମର ୫ଟି ମୁଖ୍ୟ ପୋର୍ଟାଲ୍' : '03 · EXPLORE OUR 5 CORE PORTALS'));
    pHead.appendChild(el('h2', 'abt-card-title', isOr ? '୫ଟି ମୁଖ୍ୟ ସାର୍ବଜନୀନ ପୋର୍ଟାଲ୍' : 'Explore Our 5 Core Portals'));
    portalsSec.appendChild(pHead);

    var pStrip = el('div', 'abt-portals-strip');
    [
      ['/jobs/', '💼', isOr ? 'ଚାକିରି (Jobs)' : 'Jobs', isOr ? 'ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ସରକାରୀ, PSU ଓ ପ୍ରାଇଭେଟ୍ ନିଯୁକ୍ତି' : 'Verified Odisha, Central Govt, PSU & Private alerts'],
      ['/careers/', '🧭', isOr ? 'କ୍ୟାରିୟର (Careers)' : 'Careers', isOr ? 'ପରୀକ୍ଷା ରୋଡମ୍ୟାପ୍ ଓ ଦଶମ/+୨ ପରବର୍ତ୍ତୀ ପଥ' : 'Exam roadmaps, post-10th/12th & skill tracks'],
      ['/schemes/', '🏛️', isOr ? 'ଯୋଜନା ଓ ସୁବିଧା' : 'Schemes & Benefits', isOr ? 'ରାଜ୍ୟ ଓ କେନ୍ଦ୍ର କଲ୍ୟାଣ ଯୋଜନା ଏବଂ ବୃତ୍ତି' : 'Odisha & Central welfare schemes & scholarships'],
      ['/study-library/', '📖', isOr ? 'ଅଧ୍ୟୟନ ପାଠାଗାର' : 'Study Library', isOr ? 'ଦ୍ୱିଭାଷୀ ନୋଟ୍ସ, ବିଗତ ପ୍ରଶ୍ନପତ୍ର (PYQ) ଓ ସିଲାବସ୍' : 'Bilingual notes, solved PYQs & official syllabi'],
      ['/community/', '👥', isOr ? 'ସମୁଦାୟ (Community)' : 'Community', isOr ? 'ପରୀକ୍ଷା ପ୍ରଶ୍ନୋତ୍ତର, ଯୋଜନା ସହାୟତା ଓ ଅଧ୍ୟୟନ ଦଳ' : 'Exam Q&A, scheme help & peer study groups']
    ].forEach(function (item) {
      var a = el('a', 'abt-portal-card');
      a.href = item[0];
      var top = el('div', 'abt-portal-card-top');
      top.appendChild(el('span', 'abt-portal-icon', item[1]));
      top.appendChild(el('span', 'abt-portal-arrow', '→'));
      a.appendChild(top);
      a.appendChild(el('strong', 'abt-portal-name', item[2]));
      a.appendChild(el('span', 'abt-portal-desc', item[3]));
      pStrip.appendChild(a);
    });
    portalsSec.appendChild(pStrip);
    shell.appendChild(portalsSec);

    // Section 3: Citizen Desk, Legal & Official Charters (Single Clean Footer Card)
    var cDesk = el('section', 'abt-card abt-desk-card');
    cDesk.setAttribute('aria-label', 'Citizen Desk, Legal and Official Charters');
    var deskHead = el('div', 'abt-desk-head');
    var deskHeadCopy = el('div', 'abt-desk-head-copy');
    deskHeadCopy.appendChild(el('span', 'abt-card-kicker', isOr ? '୦୪ · ନାଗରିକ ସହାୟତା, ଆଇନଗତ ନୀତି ଓ ଦସ୍ତାବିଜ୍' : '04 · CITIZEN DESK, LEGAL & OFFICIAL CHARTERS'));
    deskHeadCopy.appendChild(el('h2', 'abt-card-title', isOr ? 'ନାଗରିକ ସହାୟତା, ଆଇନଗତ ନୀତି ଓ ଯୋଗାଯୋଗ' : 'Citizen Desk, Legal & Official Charters'));
    deskHead.appendChild(deskHeadCopy);
    if (S.isAdmin) {
      var admA = el('a', 'ap-btn ap-btn-sm', '+ Manage in Admin Studio ↗');
      admA.href = '/admin/#folder-about';
      deskHead.appendChild(admA);
    }
    cDesk.appendChild(deskHead);

    var deskLinks = el('div', 'abt-desk-links');
    [
      ['/support/#contact', isOr ? '📩 ଯୋଗାଯୋଗ (Contact)' : '📩 Contact Us'],
      ['/support/#suggest-resource', isOr ? '💡 ସୂଚନା ପ୍ରସ୍ତାବ ଦିଅନ୍ତୁ' : '💡 Suggest Resource'],
      ['/support/#report-error', isOr ? '🛠️ ତ୍ରୁଟି ଜଣାନ୍ତୁ' : '🛠️ Report an Error'],
      ['/support/#faqs', isOr ? '❓ ସାଧାରଣ ପ୍ରଶ୍ନ (FAQs)' : '❓ Help & FAQs'],
      ['/privacy-policy/', isOr ? '🔒 ଗୋପନୀୟତା ନୀତି' : '🔒 Privacy Policy'],
      ['/terms-of-use/', isOr ? '⚖️ ବ୍ୟବହାର ସର୍ତ୍ତାବଳୀ' : '⚖️ Terms of Use']
    ].forEach(function (lnk) {
      var a = el('a', 'abt-desk-btn', lnk[1]);
      a.href = lnk[0];
      deskLinks.appendChild(a);
    });
    cDesk.appendChild(deskLinks);

    // Inline Official Charters (if published in D1 — opens clean modal, zero duplicate cards)
    if (S.pages.length) {
      var chartersRow = el('div', 'abt-charters-row');
      chartersRow.appendChild(el('span', 'abt-charters-label', isOr ? 'ସାଂସ୍ଥାନିକ ଦସ୍ତାବିଜ୍:' : 'Official Charters:'));
      S.pages.forEach(function (pg) {
        var btn = el('button', 'abt-charter-btn', '📄 ' + (pick(pg, 'title') || pg.title_en));
        btn.type = 'button';
        btn.addEventListener('click', function () { openCharterModal(pg); });
        chartersRow.appendChild(btn);
      });
      cDesk.appendChild(chartersRow);
    }

    var emailStr = inst.contact_email || 'contact@csodisha.com';
    var emailRow = el('div', 'abt-contact-row');
    emailRow.appendChild(el('span', 'abt-contact-label', isOr ? 'ସରକାରୀ ଯୋଗାଯୋଗ ଇମେଲ୍: ' : 'Official Contact Email: '));
    var mailA = el('a', 'abt-contact-email', emailStr);
    mailA.href = 'mailto:' + emailStr;
    emailRow.appendChild(mailA);
    cDesk.appendChild(emailRow);

    shell.appendChild(cDesk);
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
