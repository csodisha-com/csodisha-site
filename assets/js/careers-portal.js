/* Common Sense Odisha — Public Careers Explorer Portal (v269)
 * Strict CSP-compliant: zero innerHTML, outerHTML, insertAdjacentHTML, .style.*, or inline handlers. */
(function (window, document) {
  'use strict';

  var root = document.getElementById('cso-careers-portal-root');
  if (!root) return;

  var DOMAIN_META = {
    'civil-services': {
      icon: '🏛️',
      descEn: 'OAS, IAS, OPS, OPSC & UPSC administrative services',
      descOr: 'OAS, IAS, OPSC ଓ UPSC ପ୍ରଶାସନିକ ସେବା'
    },
    'engineering-it': {
      icon: '💻',
      descEn: 'GATE, PSU, AEE, Software, AI & technical cadres',
      descOr: 'GATE, PSU, AEE, ସଫ୍ଟୱେର୍ ଓ ଟେକ୍ନିକାଲ୍ କ୍ୟାରିୟର୍'
    },
    'banking-finance': {
      icon: '🏦',
      descEn: 'RBI, SBI, IBPS, NABARD, CA & financial services',
      descOr: 'RBI, SBI, IBPS, NABARD ଓ ଅର୍ଥନୀତି ସେବା'
    },
    'healthcare': {
      icon: '🩺',
      descEn: 'MBBS, Nursing, Pharmacy, AYUSH & Odisha Health Cadre',
      descOr: 'MBBS, ନର୍ସିଂ, ଫାର୍ମାସୀ ଓ ସ୍ୱାସ୍ଥ୍ୟ ସେବା'
    },
    'agriculture': {
      icon: '🌾',
      descEn: 'OUAT, AAO, Fisheries, Forestry & Rural Livelihoods',
      descOr: 'OUAT, AAO, ମତ୍ସ୍ୟ, ବନ ଓ କୃଷି ସେବା'
    },
    'pathways': {
      icon: '🧭',
      descEn: 'After 10th/12th, Degree, Skill & Apprenticeship guides',
      descOr: 'ଦଶମ/ଦ୍ୱାଦଶ, ସ୍ନାତକ ଓ ଦକ୍ଷତା ମାର୍ଗଦର୍ଶନ'
    }
  };

  var COPY = {
    en: {
      eyebrow: 'ODISHA & NATIONAL CAREER ROADMAPS · ELIGIBILITY, PAY BANDS & EXAM PATHWAYS',
      title: 'Odisha & National Careers Explorer',
      sub: 'Step-by-step career roadmaps across Civil Services, Engineering & IT, Banking & Finance, Healthcare, Agriculture, and Post-10th/12th/Graduate pathways.',
      kpiGuides: 'Career Roadmaps',
      kpiDomains: 'Core Career Domains',
      kpiFeatured: 'Featured Guides',
      kpiScopes: 'Regional Scopes',
      allTracks: 'All Career Tracks',
      allRegions: 'All Regions / Scopes',
      allStages: 'All Career Stages',
      lblTrack: '1. Career Track',
      lblRegion: '2. Region / Scope',
      lblStage: '3. Career Stage',
      lblSearch: '4. Search Role, Exam or Skill',
      searchPlaceholder: 'Search OAS, GATE, IBPS, Nursing, After 12th...',
      resetBtn: 'Reset Filters',
      jobsLink: 'Browse Live Job Notifications →',
      openRoadmap: 'View Full Roadmap →',
      eligibility: 'Eligibility',
      salary: 'Salary / Pay Band',
      exams: 'Key Exams',
      roadmapHeading: 'Structured Career Roadmap',
      linksHeading: 'Verified Official Portals & Resources',
      emptyTitle: 'No career roadmaps match this filter yet',
      emptySub: 'Career guides authored and published in Admin Studio appear here instantly. Meanwhile, explore active Odisha & Central government recruitments.',
      adminCta: 'Author in Admin Studio ↗',
      previewNote: 'UNPUBLISHED DRAFT PREVIEW — Temporary review mode (not visible to public visitors).',
      exitPreview: 'Exit Preview',
      close: 'Close'
    },
    or: {
      eyebrow: 'ଓଡ଼ିଶା ଓ ଜାତୀୟ କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶିକା · ଯୋଗ୍ୟତା, ଦରମା ଓ ପରୀକ୍ଷା ସୂଚନା',
      title: 'ଓଡ଼ିଶା ଓ ଜାତୀୟ କ୍ୟାରିୟର୍ ଏକ୍ସପ୍ଲୋରର୍',
      sub: 'ସିଭିଲ୍ ସର୍ଭିସେସ୍, ଇଞ୍ଜିନିୟରିଂ ଓ ଆଇଟି, ବ୍ୟାଙ୍କିଂ, ସ୍ୱାସ୍ଥ୍ୟସେବା, କୃଷି ଏବଂ ଦଶମ/ଦ୍ୱାଦଶ/ସ୍ନାତକ ପରବର୍ତ୍ତୀ କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶନ।',
      kpiGuides: 'କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶିକା',
      kpiDomains: 'ମୁଖ୍ୟ କ୍ଷେତ୍ର',
      kpiFeatured: 'ବିଶେଷ ଗାଇଡ୍',
      kpiScopes: 'ଆଞ୍ଚଳିକ ପରିସର',
      allTracks: 'ସମସ୍ତ କ୍ୟାରିୟର୍ କ୍ଷେତ୍ର',
      allRegions: 'ସମସ୍ତ ଅଞ୍ଚଳ',
      allStages: 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ',
      lblTrack: '୧. କ୍ୟାରିୟର୍ କ୍ଷେତ୍ର',
      lblRegion: '୨. ଅଞ୍ଚଳ / ପରିସର',
      lblStage: '୩. ଶିକ୍ଷାଗତ ପର୍ଯ୍ୟାୟ',
      lblSearch: '୪. ପଦବୀ ବା ପରୀକ୍ଷା ଖୋଜନ୍ତୁ',
      searchPlaceholder: 'OAS, GATE, IBPS, ନର୍ସିଂ ଖୋଜନ୍ତୁ...',
      resetBtn: 'ଫିଲ୍ଟର୍ ରିସେଟ୍',
      jobsLink: 'ତାଜା ଚାକିରି ବିଜ୍ଞପ୍ତି ଦେଖନ୍ତୁ →',
      openRoadmap: 'ସମ୍ପୂର୍ଣ୍ଣ ରୋଡମ୍ୟାପ୍ ଦେଖନ୍ତୁ →',
      eligibility: 'ଯୋଗ୍ୟତା',
      salary: 'ଦରମା / ପେ-ଲେଭେଲ୍',
      exams: 'ମୁଖ୍ୟ ପରୀକ୍ଷା',
      roadmapHeading: 'ସମ୍ପୂର୍ଣ୍ଣ କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍',
      linksHeading: 'ସରକାରୀ ୱେବସାଇଟ୍ ଓ ସମ୍ବଳ',
      emptyTitle: 'ଏହି ଫିଲ୍ଟର୍ ପାଇଁ କୌଣସି କ୍ୟାରିୟର୍ ଗାଇଡ୍ ମିଳିଲା ନାହିଁ',
      emptySub: 'Admin Studio ରେ ପ୍ରକାଶିତ କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶିକା ଏଠାରେ ତୁରନ୍ତ ଦେଖାଯିବ। ବର୍ତ୍ତମାନ ତାଜା ଚାକିରି ବିଜ୍ଞପ୍ତି ଦେଖନ୍ତୁ।',
      adminCta: 'Admin Studio ରେ ଲେଖନ୍ତୁ ↗',
      previewNote: 'ଅପ୍ରକାଶିତ ଡ୍ରାଫ୍ଟ ପ୍ରିଭ୍ୟୁ — କେବଳ ସମୀକ୍ଷା ପାଇଁ (ସାଧାରଣ ପାଠକଙ୍କୁ ଦେଖାଯିବ ନାହିଁ)।',
      exitPreview: 'ପ୍ରିଭ୍ୟୁ ବନ୍ଦ କରନ୍ତୁ',
      close: 'ବନ୍ଦ କରନ୍ତୁ'
    }
  };

  var urlParams = new URLSearchParams(window.location.search);
  var state = {
    lang: (function () {
      try {
        var pref = localStorage.getItem('cso_lang_pref');
        if (pref === 'or') return 'or';
      } catch (_e) {}
      return 'en';
    })(),
    track: urlParams.get('track') || '',
    subtrack: urlParams.get('subtrack') || '',
    region: urlParams.get('region') || '',
    stage: urlParams.get('stage') || '',
    q: urlParams.get('q') || '',
    slug: urlParams.get('slug') || '',
    previewId: urlParams.get('preview_id') || '',
    previewToken: urlParams.get('preview_token') || '',
    previewMode: false,
    previewExpiresAt: '',
    previewError: '',
    stats: { total_published: 0, featured_count: 0, tracks_count: 6, regions_count: 3, track_counts: {}, subtrack_counts: {} },
    taxonomy: { tracks: [], subtracks: [], role_streams: [], regions: [], stages: [] },
    items: [],
    loading: false,
    activeItem: null
  };

  var searchTimer = null;
  var drawerRefs = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function c() {
    return COPY[state.lang] || COPY.en;
  }

  function pick(enVal, orVal) {
    if (state.lang === 'or' && orVal && String(orVal).trim()) return String(orVal);
    return String(enVal || orVal || '');
  }

  function findTaxLabel(kindList, slugVal) {
    var found = (kindList || []).find(function (n) { return n.slug === slugVal; });
    if (!found) return slugVal || '';
    return pick(found.label_en, found.label_or);
  }

  function isAdminHint() {
    try { return localStorage.getItem('cso_admin_active') === '1'; } catch (_e) { return false; }
  }

  function syncBodyClass() {
    if (document.body) {
      document.body.classList.add('cso-portal-active', 'cso-portal-careers-active');
    }
  }

  function renderProseInto(container, rawText) {
    container.replaceChildren();
    var text = String(rawText || '').trim();
    if (!text) {
      container.appendChild(el('p', '', 'Detailed step-by-step guidance will be published shortly.'));
      return;
    }
    var blocks = text.split(/\n{2,}/);
    blocks.forEach(function (blk) {
      var trimmed = blk.trim();
      if (!trimmed) return;
      var lines = trimmed.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
        container.appendChild(el('h3', '', lines[0].replace(/^#{1,3}\s+/, '')));
        return;
      }
      if (lines.every(function (l) { return /^[-*•]\s+/.test(l); })) {
        var ul = document.createElement('ul');
        lines.forEach(function (l) {
          ul.appendChild(el('li', '', l.replace(/^[-*•]\s+/, '')));
        });
        container.appendChild(ul);
        return;
      }
      if (/^#{1,3}\s+/.test(lines[0])) {
        container.appendChild(el('h3', '', lines[0].replace(/^#{1,3}\s+/, '')));
        var restLines = lines.slice(1);
        if (restLines.length && restLines.every(function (l) { return /^[-*•]\s+/.test(l); })) {
          var ul2 = document.createElement('ul');
          restLines.forEach(function (l) {
            ul2.appendChild(el('li', '', l.replace(/^[-*•]\s+/, '')));
          });
          container.appendChild(ul2);
        } else if (restLines.length) {
          container.appendChild(el('p', '', restLines.join(' ')));
        }
        return;
      }
      container.appendChild(el('p', '', lines.join(' ')));
    });
  }

  function ensureDrawer() {
    if (drawerRefs) return drawerRefs;
    var backdrop = el('div', 'crp-drawer-backdrop');
    backdrop.id = 'crp-roadmap-drawer-backdrop';
    backdrop.hidden = true;

    var drawer = el('aside', 'crp-drawer');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'crp-drawer-title');

    var head = el('div', 'crp-drawer-head');
    var headText = el('div');
    var headBadges = el('div', 'crp-card-badges');
    var title = el('h2', 'crp-drawer-title', '');
    title.id = 'crp-drawer-title';
    headText.append(headBadges, title);

    var closeBtn = el('button', 'crp-drawer-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close career roadmap');
    closeBtn.addEventListener('click', closeDrawer);
    head.append(headText, closeBtn);

    var body = el('div', 'crp-drawer-body');
    var foot = el('div', 'crp-drawer-foot');

    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeDrawer();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !backdrop.hidden) closeDrawer();
    });
    document.body.appendChild(backdrop);

    drawerRefs = { backdrop: backdrop, headBadges: headBadges, title: title, body: body, foot: foot };
    return drawerRefs;
  }

  function closeDrawer() {
    state.activeItem = null;
    if (drawerRefs) drawerRefs.backdrop.hidden = true;
  }

  function openDrawer(item) {
    if (!item) return;
    state.activeItem = item;
    var refs = ensureDrawer();
    var t = c();

    refs.headBadges.replaceChildren();
    refs.headBadges.appendChild(el('span', 'crp-badge', findTaxLabel(state.taxonomy.tracks, item.track_slug)));
    if (item.subtrack_slug) {
      refs.headBadges.appendChild(el('span', 'crp-badge', findTaxLabel(state.taxonomy.subtracks, item.subtrack_slug)));
    }
    if (item.role_stream_slug) {
      refs.headBadges.appendChild(el('span', 'crp-badge', findTaxLabel(state.taxonomy.role_streams, item.role_stream_slug)));
    }
    refs.headBadges.appendChild(el('span', 'crp-badge', findTaxLabel(state.taxonomy.regions, item.region_scope)));
    refs.headBadges.appendChild(el('span', 'crp-badge', findTaxLabel(state.taxonomy.stages, item.career_stage)));
    if (item.status && item.status !== 'published') {
      refs.headBadges.appendChild(el('span', 'crp-preview-badge', 'UNPUBLISHED ' + item.status.toUpperCase()));
    }

    refs.title.textContent = pick(item.title_en, item.title_or);

    refs.body.replaceChildren();
    var summary = pick(item.summary_en, item.summary_or);
    if (summary) {
      refs.body.appendChild(el('p', 'crp-card-summary', summary));
    }

    var factGrid = el('div', 'crp-fact-grid');
    [
      [t.eligibility, item.eligibility_summary || 'See roadmap details'],
      [t.salary, item.salary_band || 'As per Govt / Industry Pay Matrix'],
      [t.exams, item.key_exams || 'Direct / Competitive Entry']
    ].forEach(function (pair) {
      var box = el('div', 'crp-fact-box');
      box.appendChild(el('span', 'crp-fact-label', pair[0]));
      box.appendChild(el('span', 'crp-fact-val', pair[1]));
      factGrid.appendChild(box);
    });
    refs.body.appendChild(factGrid);

    var roadmapSection = el('div');
    roadmapSection.appendChild(el('h3', '', t.roadmapHeading));
    var prose = el('div', 'crp-prose');
    renderProseInto(prose, pick(item.roadmap_body_en, item.roadmap_body_or));
    roadmapSection.appendChild(prose);
    refs.body.appendChild(roadmapSection);

    var links = Array.isArray(item.official_links) ? item.official_links : [];
    if (links.length) {
      var linksSec = el('div');
      linksSec.appendChild(el('h3', '', t.linksHeading));
      var linksWrap = el('div', 'crp-links-list');
      links.forEach(function (lk) {
        if (!lk || !lk.url || /^(javascript|data|vbscript)\s*:/i.test(lk.url)) return;
        var a = el('a', 'crp-btn', (lk.label || lk.url) + ' ↗');
        a.href = lk.url;
        if (/^https?:\/\//i.test(lk.url)) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        linksWrap.appendChild(a);
      });
      linksSec.appendChild(linksWrap);
      refs.body.appendChild(linksSec);
    }

    refs.foot.replaceChildren();
    var jobsCta = el('a', 'crp-btn crp-btn-primary', t.jobsLink);
    jobsCta.href = '/jobs/';
    var closeAction = el('button', 'crp-btn', t.close);
    closeAction.type = 'button';
    closeAction.addEventListener('click', closeDrawer);
    refs.foot.append(jobsCta, closeAction);

    refs.backdrop.hidden = false;
  }

  function renderHero() {
    var t = c();
    var hero = el('section', 'crp-hero');
    hero.setAttribute('aria-label', t.title);

    var top = el('div', 'crp-hero-top');
    var eyebrow = el('span', 'crp-eyebrow');
    eyebrow.append(el('span', 'crp-eyebrow-dot'), el('span', '', t.eyebrow));

    var langToggle = el('div', 'crp-lang-toggle');
    langToggle.setAttribute('role', 'group');
    langToggle.setAttribute('aria-label', 'Portal Language');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (pair) {
      var b = el('button', 'crp-lang-btn' + (state.lang === pair[0] ? ' is-active' : ''), pair[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', state.lang === pair[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.lang = pair[0];
        try { localStorage.setItem('cso_lang_pref', pair[0]); } catch (_e) {}
        renderAll();
        if (state.activeItem) openDrawer(state.activeItem);
      });
      langToggle.appendChild(b);
    });
    top.append(eyebrow, langToggle);

    var copy = el('div', 'crp-hero-copy');
    copy.append(el('h1', 'crp-hero-title', t.title), el('p', 'crp-hero-sub', t.sub));

    var kpis = el('div', 'crp-hero-kpis');
    [
      [String(state.stats.total_published || 0), t.kpiGuides],
      [String((state.taxonomy.tracks || []).length || 6), t.kpiDomains],
      [String(state.stats.featured_count || 0), t.kpiFeatured],
      [String((state.taxonomy.regions || []).length || 3), t.kpiScopes]
    ].forEach(function (pair) {
      var tile = el('div', 'crp-hero-kpi');
      tile.append(el('strong', 'crp-hero-kpi-val', pair[0]), el('span', 'crp-hero-kpi-label', pair[1]));
      kpis.appendChild(tile);
    });

    hero.append(top, copy, kpis);
    return hero;
  }

  function renderPreviewBanner() {
    if (!state.previewMode && !state.previewError) return null;
    var t = c();
    var bar = el('div', 'crp-preview-banner');
    bar.setAttribute('role', 'status');
    var left = el('div');
    var badge = el('span', 'crp-preview-badge', state.previewError ? 'PREVIEW RESTRICTED' : 'UNPUBLISHED DRAFT PREVIEW');
    var expText = '';
    if (!state.previewError && state.previewExpiresAt) {
      try {
        expText = ' · Link expires ' + new Date(state.previewExpiresAt).toLocaleString();
      } catch (_e) {}
    }
    left.append(badge, document.createTextNode(' ' + (state.previewError || (t.previewNote + expText))));
    var exitA = el('a', 'crp-btn', t.exitPreview);
    exitA.href = '/careers/';
    bar.append(left, exitA);
    return bar;
  }

  function renderSubtrackPills() {
    if (!state.track) return null;
    var trackObj = (state.taxonomy.tracks || []).find(function (tr) { return tr.slug === state.track; });
    if (!trackObj) return null;
    var subs = (state.taxonomy.subtracks || []).filter(function (s) { return s.parent_id === trackObj.id; });
    if (!subs.length) return null;

    var bar = el('div', 'crp-subtracks-bar');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Sub-Tracks');
    var allBtn = el('button', 'crp-subtrack-pill' + (!state.subtrack ? ' is-active' : ''), state.lang === 'or' ? 'ସମସ୍ତ ଉପ-ବିଭାଗ' : 'All Sub-Tracks');
    allBtn.type = 'button';
    allBtn.addEventListener('click', function () {
      state.subtrack = '';
      fetchFilteredList();
    });
    bar.appendChild(allBtn);

    subs.forEach(function (sb) {
      var b = el('button', 'crp-subtrack-pill' + (state.subtrack === sb.slug ? ' is-active' : ''), pick(sb.label_en, sb.label_or));
      b.type = 'button';
      b.addEventListener('click', function () {
        state.subtrack = state.subtrack === sb.slug ? '' : sb.slug;
        fetchFilteredList();
      });
      bar.appendChild(b);
    });
    return bar;
  }

  function renderDomainCards() {
    var grid = el('section', 'crp-domains-grid');
    grid.setAttribute('aria-label', 'Career Domains');
    var tracks = state.taxonomy.tracks || [];
    var counts = (state.stats && state.stats.track_counts) || {};

    tracks.forEach(function (tr) {
      var meta = DOMAIN_META[tr.slug] || { icon: '🧭', descEn: 'Structured career roadmap & exams', descOr: 'କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶିକା ଓ ପରୀକ୍ଷା' };
      var isActive = state.track === tr.slug;
      var btn = el('button', 'crp-domain-card' + (isActive ? ' is-active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.dataset.track = tr.slug;

      var head = el('div', 'crp-domain-head');
      var icon = el('span', 'crp-domain-icon', meta.icon);
      icon.setAttribute('aria-hidden', 'true');
      var cnt = el('span', 'crp-domain-count', String(counts[tr.slug] || 0));
      head.append(icon, cnt);

      var title = el('h2', 'crp-domain-title', pick(tr.label_en, tr.label_or));
      var desc = el('p', 'crp-domain-desc', state.lang === 'or' ? meta.descOr : meta.descEn);
      btn.append(head, title, desc);

      btn.addEventListener('click', function () {
        state.track = state.track === tr.slug ? '' : tr.slug;
        state.subtrack = '';
        fetchFilteredList();
      });
      grid.appendChild(btn);
    });
    return grid;
  }

  function renderFilterPanel() {
    var t = c();
    var panel = el('section', 'crp-filter-panel');
    panel.setAttribute('aria-label', 'Filter Career Roadmaps');

    var grid = el('div', 'crp-filter-grid');

    // 1. Track
    var fTrack = el('div', 'crp-field');
    var lTrack = el('label', 'crp-field-label', t.lblTrack);
    lTrack.setAttribute('for', 'crp-filter-track');
    var sTrack = el('select', 'crp-select');
    sTrack.id = 'crp-filter-track';
    sTrack.appendChild(new Option(t.allTracks, ''));
    (state.taxonomy.tracks || []).forEach(function (n) {
      sTrack.appendChild(new Option(pick(n.label_en, n.label_or), n.slug));
    });
    sTrack.value = state.track;
    sTrack.addEventListener('change', function () {
      state.track = sTrack.value;
      state.subtrack = '';
      fetchFilteredList();
    });
    fTrack.append(lTrack, sTrack);

    // 2. Region
    var fRegion = el('div', 'crp-field');
    var lRegion = el('label', 'crp-field-label', t.lblRegion);
    lRegion.setAttribute('for', 'crp-filter-region');
    var sRegion = el('select', 'crp-select');
    sRegion.id = 'crp-filter-region';
    sRegion.appendChild(new Option(t.allRegions, ''));
    (state.taxonomy.regions || []).forEach(function (n) {
      sRegion.appendChild(new Option(pick(n.label_en, n.label_or), n.slug));
    });
    sRegion.value = state.region;
    sRegion.addEventListener('change', function () {
      state.region = sRegion.value;
      fetchFilteredList();
    });
    fRegion.append(lRegion, sRegion);

    // 3. Career Stage
    var fStage = el('div', 'crp-field');
    var lStage = el('label', 'crp-field-label', t.lblStage);
    lStage.setAttribute('for', 'crp-filter-stage');
    var sStage = el('select', 'crp-select');
    sStage.id = 'crp-filter-stage';
    sStage.appendChild(new Option(t.allStages, ''));
    (state.taxonomy.stages || []).forEach(function (n) {
      sStage.appendChild(new Option(pick(n.label_en, n.label_or), n.slug));
    });
    sStage.value = state.stage;
    sStage.addEventListener('change', function () {
      state.stage = sStage.value;
      fetchFilteredList();
    });
    fStage.append(lStage, sStage);

    // 4. Search
    var fSearch = el('div', 'crp-field');
    var lSearch = el('label', 'crp-field-label', t.lblSearch);
    lSearch.setAttribute('for', 'crp-filter-search');
    var inp = el('input', 'crp-input');
    inp.id = 'crp-filter-search';
    inp.type = 'search';
    inp.placeholder = t.searchPlaceholder;
    inp.value = state.q;
    inp.addEventListener('input', function () {
      state.q = inp.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(fetchFilteredList, 180);
    });
    fSearch.append(lSearch, inp);

    grid.append(fTrack, fRegion, fStage, fSearch);

    var foot = el('div', 'crp-filter-foot');
    var countText = state.loading
      ? 'Updating roadmaps…'
      : ('Showing ' + state.items.length + ' career roadmap' + (state.items.length === 1 ? '' : 's'));
    var meta = el('span', 'crp-results-meta', countText);
    meta.id = 'crp-results-meta';

    var actions = el('div', 'crp-filter-actions');
    if (state.track || state.subtrack || state.region || state.stage || state.q) {
      var resetBtn = el('button', 'crp-btn', t.resetBtn);
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        state.track = '';
        state.subtrack = '';
        state.region = '';
        state.stage = '';
        state.q = '';
        fetchFilteredList();
      });
      actions.appendChild(resetBtn);
    }
    var jobsA = el('a', 'crp-btn', t.jobsLink);
    jobsA.href = '/jobs/';
    actions.appendChild(jobsA);

    foot.append(meta, actions);
    panel.append(grid, foot);
    return panel;
  }

  function renderCardsArea() {
    var t = c();
    if (!state.items.length) {
      var empty = el('section', 'crp-empty');
      empty.appendChild(el('div', 'crp-empty-icon', '🧭'));
      empty.appendChild(el('h2', 'crp-empty-title', t.emptyTitle));
      empty.appendChild(el('p', 'crp-empty-sub', t.emptySub));
      var actRow = el('div', 'crp-empty-actions');
      var jobsBtn = el('a', 'crp-btn crp-btn-primary', t.jobsLink);
      jobsBtn.href = '/jobs/';
      actRow.appendChild(jobsBtn);
      if (state.track || state.subtrack || state.region || state.stage || state.q) {
        var clrBtn = el('button', 'crp-btn', t.resetBtn);
        clrBtn.type = 'button';
        clrBtn.addEventListener('click', function () {
          state.track = '';
          state.subtrack = '';
          state.region = '';
          state.stage = '';
          state.q = '';
          fetchFilteredList();
        });
        actRow.appendChild(clrBtn);
      }
      if (isAdminHint()) {
        var admBtn = el('a', 'crp-btn', t.adminCta);
        admBtn.href = '/admin/#module-careers-studio';
        actRow.appendChild(admBtn);
      }
      empty.appendChild(actRow);
      return empty;
    }

    var grid = el('section', 'crp-cards-grid');
    grid.setAttribute('aria-label', 'Published Career Roadmaps');

    state.items.forEach(function (item) {
      var card = el('article', 'crp-card');

      var badges = el('div', 'crp-card-badges');
      badges.appendChild(el('span', 'crp-badge', findTaxLabel(state.taxonomy.tracks, item.track_slug)));
      if (item.subtrack_slug) {
        badges.appendChild(el('span', 'crp-badge crp-badge-subtle', findTaxLabel(state.taxonomy.subtracks, item.subtrack_slug)));
      }
      if (item.role_stream_slug) {
        badges.appendChild(el('span', 'crp-badge crp-badge-subtle', findTaxLabel(state.taxonomy.role_streams, item.role_stream_slug)));
      }
      badges.appendChild(el('span', 'crp-badge crp-badge-subtle', findTaxLabel(state.taxonomy.regions, item.region_scope)));
      badges.appendChild(el('span', 'crp-badge crp-badge-subtle', findTaxLabel(state.taxonomy.stages, item.career_stage)));
      if (item.featured) badges.appendChild(el('span', 'crp-badge crp-badge-featured', '★ Featured'));
      if (item.status && item.status !== 'published') badges.appendChild(el('span', 'crp-preview-badge', 'UNPUBLISHED ' + item.status.toUpperCase()));

      var title = el('h3', 'crp-card-title', pick(item.title_en, item.title_or));
      var summaryText = pick(item.summary_en, item.summary_or);
      var summary = el('p', 'crp-card-summary', summaryText || 'Structured eligibility, exam strategy, and pay progression guide.');

      var metaBox = el('div', 'crp-card-meta');
      [
        [t.eligibility, item.eligibility_summary || 'See roadmap'],
        [t.salary, item.salary_band || 'Govt / Industry Scale'],
        [t.exams, item.key_exams || 'Direct / Exam Entry']
      ].forEach(function (pair) {
        var row = el('div', 'crp-meta-row');
        row.append(el('span', 'crp-meta-key', pair[0]), el('span', 'crp-meta-val', pair[1]));
        metaBox.appendChild(row);
      });

      var foot = el('div', 'crp-card-foot');
      var openBtn = el('button', 'crp-btn crp-btn-primary', t.openRoadmap);
      openBtn.type = 'button';
      openBtn.addEventListener('click', function () {
        openDrawer(item);
      });
      foot.appendChild(openBtn);

      card.append(badges, title, summary, metaBox, foot);
      grid.appendChild(card);
    });

    return grid;
  }

  function renderAll() {
    var focusId = document.activeElement && document.activeElement.id;
    var selStart = focusId === 'crp-filter-search' && document.activeElement.selectionStart;

    var wrap = el('div', 'crp-portal crp-root');
    wrap.appendChild(renderHero());
    var prevBanner = renderPreviewBanner();
    if (prevBanner) wrap.appendChild(prevBanner);
    wrap.appendChild(renderDomainCards());
    var subBar = renderSubtrackPills();
    if (subBar) wrap.appendChild(subBar);
    wrap.appendChild(renderFilterPanel());
    wrap.appendChild(renderCardsArea());

    root.replaceChildren(wrap);

    if (focusId === 'crp-filter-search') {
      var nextInp = document.getElementById('crp-filter-search');
      if (nextInp) {
        nextInp.focus();
        if (typeof selStart === 'number') {
          try { nextInp.setSelectionRange(selStart, selStart); } catch (_e) {}
        }
      }
    }
  }

  function fetchFilteredList() {
    state.loading = true;
    var metaEl = document.getElementById('crp-results-meta');
    if (metaEl) metaEl.textContent = 'Updating roadmaps…';

    var qs = new URLSearchParams();
    if (state.track) qs.set('track', state.track);
    if (state.subtrack) qs.set('subtrack', state.subtrack);
    if (state.region) qs.set('region', state.region);
    if (state.stage) qs.set('stage', state.stage);
    if (state.q) qs.set('q', state.q);

    fetch('/api/public/careers/list' + (qs.toString() ? '?' + qs.toString() : ''), { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        state.loading = false;
        state.items = (d && Array.isArray(d.items)) ? d.items : [];
        renderAll();
      })
      .catch(function () {
        state.loading = false;
        renderAll();
      });
  }

  function boot() {
    syncBodyClass();
    // Preserve pre-rendered .cso-portal-skeleton until /bootstrap resolves (CLS = 0)
    var hasSkeleton = Boolean(root.querySelector('.cso-portal-skeleton'));
    if (!hasSkeleton) {
      var sk = el('div', 'cso-portal-skeleton');
      sk.setAttribute('aria-busy', 'true');
      root.replaceChildren(sk);
    }

    var bootReq = fetch('/api/public/careers/bootstrap', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });

    var listReq = null;
    if (state.previewId || state.previewToken) {
      var pqs = new URLSearchParams();
      if (state.previewId) pqs.set('preview_id', state.previewId);
      if (state.previewToken) pqs.set('preview_token', state.previewToken);
      if (state.slug) pqs.set('slug', state.slug);
      listReq = fetch('/api/public/careers/list?' + pqs.toString(), { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) {
          return r.json().catch(function () { return null; }).then(function (d) {
            return { status: r.status, ok: r.ok, data: d };
          });
        })
        .catch(function () { return { status: 500, ok: false, data: null }; });
    } else if (state.track || state.subtrack || state.region || state.stage || state.q || state.slug) {
      var qs = new URLSearchParams();
      if (state.track) qs.set('track', state.track);
      if (state.subtrack) qs.set('subtrack', state.subtrack);
      if (state.region) qs.set('region', state.region);
      if (state.stage) qs.set('stage', state.stage);
      if (state.q) qs.set('q', state.q);
      if (state.slug) qs.set('slug', state.slug);
      listReq = fetch('/api/public/careers/list?' + qs.toString(), { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { return { status: 200, ok: true, data: d }; })
        .catch(function () { return { status: 500, ok: false, data: null }; });
    }

    Promise.all([bootReq, listReq]).then(function (res) {
      var bootData = res[0];
      var listRes = res[1];

      if (bootData && bootData.taxonomy) {
        state.taxonomy = bootData.taxonomy;
      }
      if (bootData && bootData.stats) {
        state.stats = bootData.stats;
      }

      if ((state.previewId || state.previewToken) && listRes) {
        if (listRes.ok && listRes.data && listRes.data.preview_item) {
          state.previewMode = true;
          state.previewExpiresAt = listRes.data.preview_expires_at || '';
          state.items = [listRes.data.preview_item];
          renderAll();
          openDrawer(listRes.data.preview_item);
          return;
        }
        state.previewError = (listRes.data && listRes.data.error) || 'Temporary preview link is invalid or expired. Sign in to Admin Studio to generate a fresh link.';
        state.items = (bootData && Array.isArray(bootData.latest)) ? bootData.latest : [];
        renderAll();
        return;
      }

      if (listRes && listRes.data && Array.isArray(listRes.data.items)) {
        state.items = listRes.data.items;
      } else {
        state.items = (bootData && Array.isArray(bootData.latest)) ? bootData.latest : [];
      }

      renderAll();
      if (state.slug && state.items.length === 1) {
        openDrawer(state.items[0]);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
