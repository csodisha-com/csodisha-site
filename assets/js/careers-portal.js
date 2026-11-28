/**
 * Common Sense Odisha — Public Careers Explorer Portal & Milestone Drawer (v453)
 * Powered by window.CSOCareersRoadmapLibrary (18 bilingual roadmaps across 6 tracks)
 * merged seamlessly with live Cloudflare D1 career guides, interactive Career Matcher,
 * ARIA milestone drawer, and window.CSOSavedAlerts integration.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection, zero inline style
 * mutations, zero inline event handlers.
 */
(function (window, document) {
  'use strict';

  var root = document.getElementById('cso-careers-portal-root');
  if (!root) return;

  var COPY = {
    en: {
      title: 'Odisha & National Career Roadmaps',
      sub: 'Verified bilingual roadmaps across Civil Services, Engineering & IT, Banking, Healthcare, Agriculture & Career Stage Pathways.',
      statRoadmaps: 'Verified Roadmaps',
      statTracks: 'Career Tracks',
      statFee: '₹0 Odisha State Fee',
      matcherHeading: 'Find My Career Path',
      matcherStageLabel: 'Qualification / Stage',
      matcherScopeLabel: 'Scope',
      matcherSearchLabel: 'Keyword Search',
      allTracks: 'All Tracks',
      searchPlaceholder: 'Search OPSC, OSSC, GATE, SBI, Nursing, AAO, MACP...',
      resetBtn: '✕ Reset',
      resetFiltersBtn: 'Reset All Filters',
      showingPrefix: 'Showing',
      showingOf: 'of',
      showingSuffix: 'career roadmaps',
      openRoadmap: 'View Full Roadmap',
      saveRoadmap: '☆ Save Roadmap',
      savedRoadmap: '★ Saved',
      eligibility: 'Eligibility & Age Window',
      selectionStages: 'Selection Stages',
      payAllowances: 'Pay Band & Allowances',
      promotionLadder: '5–15 Year Promotion Ladder',
      certificates: 'Required Certificates & Proofs',
      roadmapNotes: 'Preparation & Strategy Notes',
      linksHeading: 'Verified Official Portals & Tools',
      orspCta: 'Explore ORSP 7th Pay Scale →',
      jobsCta: 'Live Recruitment Notices →',
      orspDrawerCta: 'ORSP 7th Pay Calculator →',
      emptyTitle: 'No career roadmaps match this filter combination',
      emptySub: 'Reset your filters to browse all 18 Odisha & National career roadmaps, or jump directly to the ORSP 7th Pay Explorer and Live Recruitment Notices.',
      previewNote: 'UNPUBLISHED DRAFT PREVIEW — Temporary review mode (not visible to public visitors).',
      exitPreview: 'Exit Preview',
      close: 'Close'
    },
    or: {
      title: 'ଓଡ଼ିଶା ଓ ଜାତୀୟ କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍',
      sub: 'ସିଭିଲ୍ ସର୍ଭିସେସ୍, ଇଞ୍ଜିନିୟରିଂ ଓ ଆଇଟି, ବ୍ୟାଙ୍କିଂ, ସ୍ୱାସ୍ଥ୍ୟସେବା, କୃଷି ଓ କ୍ୟାରିୟର୍ ପର୍ଯ୍ୟାୟ ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ଦ୍ୱିଭାଷୀ ରୋଡମ୍ୟାପ୍।',
      statRoadmaps: 'ଯାଞ୍ଚକୃତ ରୋଡମ୍ୟାପ୍',
      statTracks: 'କ୍ୟାରିୟର୍ କ୍ଷେତ୍ର',
      statFee: '₹୦ ଓଡ଼ିଶା ରାଜ୍ୟ ଫିସ୍',
      matcherHeading: 'ମୋର କ୍ୟାରିୟର୍ ପଥ ଖୋଜନ୍ତୁ',
      matcherStageLabel: 'ଯୋଗ୍ୟତା / ପର୍ଯ୍ୟାୟ',
      matcherScopeLabel: 'ସ୍କୋପ୍',
      matcherSearchLabel: 'କିୱାର୍ଡ ଖୋଜ',
      allTracks: 'ସମସ୍ତ କ୍ଷେତ୍ର',
      searchPlaceholder: 'OPSC, OSSC, GATE, SBI, ନର୍ସିଂ, AAO, MACP ଖୋଜନ୍ତୁ...',
      resetBtn: '✕ ରିସେଟ୍',
      resetFiltersBtn: 'ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ',
      showingPrefix: 'ଦେଖାଯାଉଛି',
      showingOf: 'ମଧ୍ୟରୁ',
      showingSuffix: 'କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍',
      openRoadmap: 'ସମ୍ପୂର୍ଣ୍ଣ ରୋଡମ୍ୟାପ୍ ଦେଖନ୍ତୁ',
      saveRoadmap: '☆ ରୋଡମ୍ୟାପ୍ ସେଭ୍',
      savedRoadmap: '★ ସେଭ୍ ହୋଇଛି',
      eligibility: 'ଯୋଗ୍ୟତା ଓ ବୟସ ସୀମା',
      selectionStages: 'ଚୟନ ପର୍ଯ୍ୟାୟ',
      payAllowances: 'ବେତନ ଓ ଭତ୍ତା',
      promotionLadder: '୫–୧୫ ବର୍ଷ ପଦୋନ୍ନତି ସୋପାନ',
      certificates: 'ଆବଶ୍ୟକ ପ୍ରମାଣପତ୍ର',
      roadmapNotes: 'ପ୍ରସ୍ତୁତି ଓ କୌଶଳ',
      linksHeading: 'ସରକାରୀ ପୋର୍ଟାଲ୍ ଓ ଉପକରଣ',
      orspCta: 'ORSP ୭ମ ବେତନ ସ୍କେଲ୍ ଦେଖନ୍ତୁ →',
      jobsCta: 'ତାଜା ଚାକିରି ବିଜ୍ଞପ୍ତି ଦେଖନ୍ତୁ →',
      orspDrawerCta: 'ORSP ୭ମ ବେତନ କାଲକୁଲେଟର୍ →',
      emptyTitle: 'ଏହି ଫିଲ୍ଟର୍ ପାଇଁ କୌଣସି କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍ ମିଳିଲା ନାହିଁ',
      emptySub: 'ସମସ୍ତ ୧୮ଟି ଓଡ଼ିଶା ଓ ଜାତୀୟ ରୋଡମ୍ୟାପ୍ ଦେଖିବା ପାଇଁ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ କିମ୍ବା ORSP ବେତନ ଓ ତାଜା ଚାକିରି ବିଜ୍ଞପ୍ତି ଦେଖନ୍ତୁ।',
      previewNote: 'ଅପ୍ରକାଶିତ ଡ୍ରାଫ୍ଟ ପ୍ରିଭ୍ୟୁ — କେବଳ ସମୀକ୍ଷା ପାଇଁ।',
      exitPreview: 'ପ୍ରିଭ୍ୟୁ ବନ୍ଦ କରନ୍ତୁ',
      close: 'ବନ୍ଦ କରନ୍ତୁ'
    }
  };

  function getLib() {
    return window.CSOCareersRoadmapLibrary || null;
  }

  function detectLang() {
    var htmlLang = (document.documentElement && (document.documentElement.getAttribute('data-cso-lang') || document.documentElement.getAttribute('lang'))) || '';
    if (String(htmlLang).toLowerCase().indexOf('or') === 0) return 'or';
    try {
      var pref = localStorage.getItem('cso_lang_pref') || localStorage.getItem('cso_lang');
      if (pref === 'or') return 'or';
    } catch (_e) {}
    return 'en';
  }

  var urlParams = new URLSearchParams(window.location.search);
  var libInit = getLib();
  var initialTrack = urlParams.get('track') || '';
  if (libInit && initialTrack) initialTrack = libInit.normalizeTrackSlug(initialTrack);

  var state = {
    lang: detectLang(),
    track: initialTrack,
    subtrack: urlParams.get('subtrack') || '',
    scope: libInit ? libInit.normalizeScope(urlParams.get('scope') || urlParams.get('region') || '') : (urlParams.get('scope') || urlParams.get('region') || ''),
    stage: libInit ? libInit.normalizeStage(urlParams.get('stage') || '') : (urlParams.get('stage') || ''),
    q: urlParams.get('q') || '',
    slug: urlParams.get('slug') || '',
    previewId: urlParams.get('preview_id') || '',
    previewToken: urlParams.get('preview_token') || '',
    previewMode: false,
    previewExpiresAt: '',
    previewError: '',
    liveD1Items: [],
    allRoadmaps: libInit ? libInit.getAllCareerRoadmaps([]) : [],
    filteredResult: null,
    activeItem: null,
    lastFocusedEl: null
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

  function syncBodyClass() {
    if (document.body) {
      document.body.classList.add('cso-portal-active', 'cso-portal-careers-active');
    }
  }

  function getFilteredState() {
    var lib = getLib();
    if (state.previewMode && state.liveD1Items.length) {
      var counts = {};
      if (lib) {
        lib.TRACKS.forEach(function (tr) { counts[tr.slug] = 0; });
      }
      var previewItem = state.liveD1Items[0];
      var tSlug = lib ? lib.normalizeTrackSlug(previewItem.track_slug) : (previewItem.track_slug || 'career-pathways');
      counts[tSlug] = 1;
      return {
        items: [previewItem],
        total: 1,
        allTracksTotal: 1,
        trackCounts: counts,
        track_counts: counts
      };
    }
    if (lib) {
      return lib.filterCareerRoadmaps(state.allRoadmaps, {
        track: state.track,
        subtrack: state.subtrack,
        scope: state.scope,
        stage: state.stage,
        q: state.q
      });
    }
    return {
      items: state.allRoadmaps,
      total: state.allRoadmaps.length,
      allTracksTotal: state.allRoadmaps.length,
      trackCounts: {},
      track_counts: {}
    };
  }

  function getSavedAlertPayload(item) {
    return {
      id: 'career:' + item.slug,
      slug: item.slug,
      url: '/careers/?slug=' + encodeURIComponent(item.slug),
      title_en: item.title_en,
      title_or: item.title_or || item.title_en,
      org: item.scope_label_en || 'Common Sense Odisha',
      category: 'guide',
      venue_or_mode: item.orsp_level || item.salary_band || 'Career Roadmap'
    };
  }

  function isRoadmapSaved(slug) {
    var saveId = 'career:' + slug;
    if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.isSaved === 'function') {
      return Boolean(window.CSOSavedAlerts.isSaved(saveId));
    }
    try {
      var raw = localStorage.getItem('cso_saved_alerts_v1');
      if (!raw) return false;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.some(function (x) { return x && x.id === saveId; });
    } catch (_e) {
      return false;
    }
  }

  function toggleSaveRoadmap(item, btn) {
    var t = c();
    var payload = getSavedAlertPayload(item);
    var savedNow = false;
    if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.toggleAlert === 'function') {
      var res = window.CSOSavedAlerts.toggleAlert(payload);
      savedNow = Boolean(res && res.saved);
    } else {
      try {
        var raw = localStorage.getItem('cso_saved_alerts_v1');
        var list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
        var idx = list.findIndex(function (x) { return x && x.id === payload.id; });
        if (idx >= 0) {
          list.splice(idx, 1);
          savedNow = false;
        } else {
          payload.saved_at = new Date().toISOString();
          list.unshift(payload);
          savedNow = true;
        }
        localStorage.setItem('cso_saved_alerts_v1', JSON.stringify(list));
      } catch (_e) {}
    }
    if (btn) {
      btn.textContent = savedNow ? t.savedRoadmap : t.saveRoadmap;
      btn.setAttribute('aria-pressed', savedNow ? 'true' : 'false');
      btn.classList.toggle('is-saved', savedNow);
    }
    syncSaveButtons();
  }

  function syncSaveButtons() {
    var t = c();
    document.querySelectorAll('[data-crp-save-slug]').forEach(function (btn) {
      var slug = btn.getAttribute('data-crp-save-slug');
      var saved = isRoadmapSaved(slug);
      btn.textContent = saved ? t.savedRoadmap : t.saveRoadmap;
      btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      btn.classList.toggle('is-saved', saved);
    });
  }

  function createSaveButton(item) {
    var t = c();
    var saved = isRoadmapSaved(item.slug);
    var btn = el('button', 'crp-btn crp-save-btn' + (saved ? ' is-saved' : ''), saved ? t.savedRoadmap : t.saveRoadmap);
    btn.type = 'button';
    btn.setAttribute('data-crp-save-slug', item.slug);
    btn.setAttribute('data-cso-save-id', 'career:' + item.slug);
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    btn.setAttribute('aria-label', (saved ? 'Remove saved roadmap: ' : 'Save roadmap: ') + item.title_en);
    btn.addEventListener('click', function () {
      toggleSaveRoadmap(item, btn);
    });
    return btn;
  }

  function renderProseInto(container, rawText) {
    container.replaceChildren();
    var text = String(rawText || '').trim();
    if (!text) return;
    var blocks = text.split(/\n{2,}/);
    blocks.forEach(function (blk) {
      var trimmed = blk.trim();
      if (!trimmed) return;
      var lines = trimmed.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
        container.appendChild(el('h4', 'crp-prose-subhead', lines[0].replace(/^#{1,3}\s+/, '')));
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
        container.appendChild(el('h4', 'crp-prose-subhead', lines[0].replace(/^#{1,3}\s+/, '')));
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

    var drawer = el('aside', 'crp-drawer crp-drawer--v453');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'crp-drawer-title');

    var head = el('div', 'crp-drawer-head');
    var headText = el('div', 'crp-drawer-head-copy');
    var headBadges = el('div', 'crp-card-badges');
    var title = el('h2', 'crp-drawer-title', '');
    title.id = 'crp-drawer-title';
    var subtitle = el('p', 'crp-drawer-alt-title', '');
    headText.append(headBadges, title, subtitle);

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

    drawerRefs = {
      backdrop: backdrop,
      drawer: drawer,
      headBadges: headBadges,
      title: title,
      subtitle: subtitle,
      closeBtn: closeBtn,
      body: body,
      foot: foot
    };
    return drawerRefs;
  }

  function closeDrawer() {
    state.activeItem = null;
    if (drawerRefs) drawerRefs.backdrop.hidden = true;
    document.body.classList.remove('cso-modal-open');
    if (state.lastFocusedEl && typeof state.lastFocusedEl.focus === 'function') {
      try { state.lastFocusedEl.focus(); } catch (_e) {}
    }
    state.lastFocusedEl = null;
  }

  function buildDrawerListSection(headingText, iconText, listItems, ordered) {
    if (!Array.isArray(listItems) || !listItems.length) return null;
    var sec = el('section', 'crp-drawer-section');
    var h = el('h3', 'crp-drawer-sec-title');
    var ico = el('span', 'crp-drawer-sec-ico', iconText);
    ico.setAttribute('aria-hidden', 'true');
    h.append(ico, document.createTextNode(' ' + headingText));
    sec.appendChild(h);
    var listEl = document.createElement(ordered ? 'ol' : 'ul');
    listEl.className = ordered ? 'crp-drawer-ol' : 'crp-drawer-ul';
    listItems.forEach(function (entry) {
      listEl.appendChild(el('li', '', entry));
    });
    sec.appendChild(listEl);
    return sec;
  }

  function openDrawer(item) {
    if (!item) return;
    state.lastFocusedEl = document.activeElement;
    state.activeItem = item;
    var refs = ensureDrawer();
    document.body.classList.add('cso-modal-open');
    var t = c();
    var lib = getLib();
    var trackMeta = lib ? lib.getTrackMeta(item.track_slug) : { icon: '🧭', label_en: item.track_slug, label_or: item.track_slug };

    refs.headBadges.replaceChildren();
    refs.headBadges.appendChild(el('span', 'crp-badge', (trackMeta.icon || '🧭') + ' ' + pick(trackMeta.label_en, trackMeta.label_or)));
    refs.headBadges.appendChild(el('span', 'crp-badge', pick(item.scope_label_en, item.scope_label_or)));
    refs.headBadges.appendChild(el('span', 'crp-badge', pick(item.stage_label_en, item.stage_label_or)));
    if (item.status && item.status !== 'published') {
      refs.headBadges.appendChild(el('span', 'crp-preview-badge', 'UNPUBLISHED ' + item.status.toUpperCase()));
    }

    var primaryTitle = pick(item.title_en, item.title_or);
    var secondaryTitle = state.lang === 'or' ? item.title_en : item.title_or;
    refs.title.textContent = primaryTitle;
    refs.subtitle.textContent = secondaryTitle && secondaryTitle !== primaryTitle ? secondaryTitle : '';
    refs.subtitle.hidden = !refs.subtitle.textContent;

    refs.body.replaceChildren();

    var summary = pick(item.summary_en, item.summary_or);
    if (summary) {
      refs.body.appendChild(el('p', 'crp-drawer-lead', summary));
    }

    // 3-Step Visual Milestone Bar inside Drawer
    if (Array.isArray(item.milestones) && item.milestones.length) {
      var msRow = el('div', 'crp-drawer-milestones');
      msRow.setAttribute('aria-label', 'Key Roadmap Milestones');
      item.milestones.forEach(function (ms) {
        var stepEl = el('div', 'crp-drawer-ms-item');
        stepEl.append(
          el('span', 'crp-ms-num', String(ms.step || '')),
          el('span', 'crp-ms-text', pick(ms.label_en, ms.label_or))
        );
        msRow.appendChild(stepEl);
      });
      refs.body.appendChild(msRow);
    }

    // Core Fact Grid: Eligibility & Age Window + Pay & Allowances
    var factGrid = el('div', 'crp-fact-grid');
    [
      [t.eligibility, pick(item.eligibility_summary, item.eligibility_summary_or) + (item.age_window_en ? ' · ' + pick(item.age_window_en, item.age_window_or) : '')],
      [t.payAllowances, pick(item.pay_allowances_en, item.pay_allowances_or) || pick(item.salary_band, item.salary_band_or)]
    ].forEach(function (pair) {
      var box = el('div', 'crp-fact-box');
      box.append(
        el('span', 'crp-fact-label', pair[0]),
        el('span', 'crp-fact-val', pair[1])
      );
      factGrid.appendChild(box);
    });
    refs.body.appendChild(factGrid);

    // Structured Sections: Selection Stages, 5-15 Yr Promotion Ladder, Required Certificates
    var stagesSec = buildDrawerListSection(
      t.selectionStages,
      '🎯',
      state.lang === 'or' && item.selection_stages_or && item.selection_stages_or.length ? item.selection_stages_or : item.selection_stages_en,
      true
    );
    if (stagesSec) refs.body.appendChild(stagesSec);

    var promoSec = buildDrawerListSection(
      t.promotionLadder,
      '📈',
      state.lang === 'or' && item.promotion_ladder_or && item.promotion_ladder_or.length ? item.promotion_ladder_or : item.promotion_ladder_en,
      true
    );
    if (promoSec) refs.body.appendChild(promoSec);

    var certSec = buildDrawerListSection(
      t.certificates,
      '📄',
      state.lang === 'or' && item.required_certificates_or && item.required_certificates_or.length ? item.required_certificates_or : item.required_certificates_en,
      false
    );
    if (certSec) refs.body.appendChild(certSec);

    // Strategy / Roadmap Prose
    var bodyText = pick(item.roadmap_body_en, item.roadmap_body_or);
    if (bodyText) {
      var notesSec = el('section', 'crp-drawer-section');
      var nh = el('h3', 'crp-drawer-sec-title', '🧭 ' + t.roadmapNotes);
      var prose = el('div', 'crp-prose');
      renderProseInto(prose, bodyText);
      notesSec.append(nh, prose);
      refs.body.appendChild(notesSec);
    }

    // Verified Official Portals + Built-in CSO Tool Cross-Links
    var links = Array.isArray(item.official_links) ? item.official_links : [];
    var linksSec = el('section', 'crp-drawer-section');
    linksSec.appendChild(el('h3', 'crp-drawer-sec-title', '🔗 ' + t.linksHeading));
    var linksWrap = el('div', 'crp-links-list');

    var orspToolLink = el('a', 'crp-btn crp-btn-secondary', t.orspDrawerCta);
    orspToolLink.href = '/career-paths/#cso-orsp-salary-root';
    linksWrap.appendChild(orspToolLink);

    links.forEach(function (lk) {
      if (!lk || !lk.url || /^(javascript|data|vbscript)\s*:/i.test(lk.url)) return;
      var a = el('a', 'crp-btn', (lk.label || lk.url) + (/^https?:\/\//i.test(lk.url) ? ' ↗' : ' →'));
      a.href = lk.url;
      if (/^https?:\/\//i.test(lk.url)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      linksWrap.appendChild(a);
    });
    linksSec.appendChild(linksWrap);
    refs.body.appendChild(linksSec);

    // Drawer Footer Actions
    refs.foot.replaceChildren();
    var leftFoot = el('div', 'crp-drawer-foot-actions');
    var jobsCta = el('a', 'crp-btn crp-btn-primary', t.jobsCta);
    jobsCta.href = '/jobs/';
    var saveBtn = createSaveButton(item);
    leftFoot.append(jobsCta, saveBtn);

    var closeAction = el('button', 'crp-btn', t.close);
    closeAction.type = 'button';
    closeAction.addEventListener('click', closeDrawer);
    refs.foot.append(leftFoot, closeAction);

    refs.backdrop.hidden = false;
    try { refs.closeBtn.focus(); } catch (_e) {}
  }

  function renderHero(totalCount) {
    var t = c();
    var hero = el('section', 'crp-hero crp-hero--compact crp-hero--v453');
    hero.setAttribute('aria-label', t.title);

    var top = el('div', 'crp-hero-top');
    var copy = el('div', 'crp-hero-copy');
    copy.append(
      el('h1', 'crp-hero-title', t.title),
      el('p', 'crp-hero-sub', t.sub)
    );

    var statsWrap = el('div', 'crp-hero-stat-pills');
    statsWrap.setAttribute('aria-label', 'Career Explorer Summary');
    [
      String(totalCount) + ' ' + t.statRoadmaps,
      '6 ' + t.statTracks,
      t.statFee
    ].forEach(function (txt) {
      statsWrap.appendChild(el('span', 'crp-hero-stat-pill', txt));
    });

    top.append(copy, statsWrap);
    hero.appendChild(top);
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

  function renderFilterPanel(result) {
    var t = c();
    var lib = getLib();
    var tracks = lib ? lib.TRACKS : [];
    var stageOptions = lib ? lib.STAGE_OPTIONS : [];
    var scopeOptions = lib ? lib.SCOPE_OPTIONS : [];
    var counts = (result && result.trackCounts) || {};
    var allTotal = result ? result.allTracksTotal : state.allRoadmaps.length;

    var panel = el('section', 'crp-filter-panel crp-matcher-panel');
    panel.setAttribute('aria-label', t.matcherHeading);

    // 1. Compact "Find My Career Path" Matcher Header + Controls
    var matcherHead = el('div', 'crp-matcher-head');
    matcherHead.appendChild(el('h2', 'crp-matcher-title', '🧭 ' + t.matcherHeading));
    var countMeta = el('div', 'crp-results-meta', t.showingPrefix + ' ' + result.total + ' ' + t.showingOf + ' ' + state.allRoadmaps.length + ' ' + t.showingSuffix);
    countMeta.id = 'crp-results-meta';
    countMeta.setAttribute('aria-live', 'polite');
    matcherHead.appendChild(countMeta);
    panel.appendChild(matcherHead);

    var hasFilter = Boolean(state.track || state.subtrack || state.scope || state.stage || state.q);
    var matcherRow = el('div', 'crp-matcher-grid' + (hasFilter ? ' has-reset' : ''));

    // Qualification / Stage Matcher
    var stageField = el('div', 'crp-field');
    var stageLbl = el('label', 'crp-field-label', t.matcherStageLabel);
    stageLbl.setAttribute('for', 'crp-filter-stage');
    var sStage = el('select', 'crp-select');
    sStage.id = 'crp-filter-stage';
    stageOptions.forEach(function (opt) {
      sStage.appendChild(new Option(pick(opt.label_en, opt.label_or), opt.slug));
    });
    sStage.value = state.stage;
    sStage.addEventListener('change', function () {
      state.stage = sStage.value;
      renderAll();
    });
    stageField.append(stageLbl, sStage);

    // Scope Matcher
    var scopeField = el('div', 'crp-field');
    var scopeLbl = el('label', 'crp-field-label', t.matcherScopeLabel);
    scopeLbl.setAttribute('for', 'crp-filter-scope');
    var sScope = el('select', 'crp-select');
    sScope.id = 'crp-filter-scope';
    scopeOptions.forEach(function (opt) {
      sScope.appendChild(new Option(pick(opt.label_en, opt.label_or), opt.slug));
    });
    sScope.value = state.scope;
    sScope.addEventListener('change', function () {
      state.scope = sScope.value;
      renderAll();
    });
    scopeField.append(scopeLbl, sScope);

    // Keyword Search
    var searchField = el('div', 'crp-field');
    var searchLbl = el('label', 'crp-field-label', t.matcherSearchLabel);
    searchLbl.setAttribute('for', 'crp-filter-search');
    var inp = el('input', 'crp-input');
    inp.id = 'crp-filter-search';
    inp.type = 'search';
    inp.placeholder = t.searchPlaceholder;
    inp.value = state.q;
    inp.addEventListener('input', function () {
      state.q = inp.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderAll, 140);
    });
    searchField.append(searchLbl, inp);

    matcherRow.append(stageField, scopeField, searchField);

    if (hasFilter) {
      var resetWrap = el('div', 'crp-field crp-field-reset');
      var resetBtn = el('button', 'crp-btn crp-reset-btn', t.resetBtn);
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', resetAllFilters);
      resetWrap.appendChild(resetBtn);
      matcherRow.appendChild(resetWrap);
    }
    panel.appendChild(matcherRow);

    // 2. Dynamic 6-Track Pill Strip (never shows 0 on default load)
    var trackStrip = el('div', 'crp-track-strip');
    trackStrip.setAttribute('role', 'group');
    trackStrip.setAttribute('aria-label', 'Career Tracks');

    var allBtn = el('button', 'crp-track-pill' + (!state.track ? ' is-active' : ''));
    allBtn.type = 'button';
    allBtn.setAttribute('data-track', '');
    allBtn.setAttribute('aria-pressed', !state.track ? 'true' : 'false');
    allBtn.append(
      el('span', 'crp-track-pill-label', '🏛️ ' + t.allTracks),
      el('span', 'crp-track-pill-count', String(allTotal))
    );
    allBtn.addEventListener('click', function () {
      state.track = '';
      state.subtrack = '';
      renderAll();
    });
    trackStrip.appendChild(allBtn);

    tracks.forEach(function (tr) {
      var isActive = state.track === tr.slug;
      var btn = el('button', 'crp-track-pill crp-track-pill--' + (tr.accent || 'civil') + (isActive ? ' is-active' : ''));
      btn.type = 'button';
      btn.setAttribute('data-track', tr.slug);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.append(
        el('span', 'crp-track-pill-label', (tr.icon || '🧭') + ' ' + pick(tr.label_en, tr.label_or)),
        el('span', 'crp-track-pill-count', String(counts[tr.slug] || 0))
      );
      btn.addEventListener('click', function () {
        state.track = state.track === tr.slug ? '' : tr.slug;
        state.subtrack = '';
        renderAll();
      });
      trackStrip.appendChild(btn);
    });
    panel.appendChild(trackStrip);

    return panel;
  }

  function resetAllFilters() {
    state.track = '';
    state.subtrack = '';
    state.scope = '';
    state.stage = '';
    state.q = '';
    renderAll();
  }

  function renderCardsArea(result) {
    var t = c();
    var lib = getLib();
    var items = (result && Array.isArray(result.items)) ? result.items : [];

    if (!items.length) {
      var empty = el('section', 'crp-empty crp-empty--v453');
      empty.setAttribute('aria-label', 'Career Roadmaps Status');
      var icon = el('div', 'crp-empty-icon', '🧭');
      icon.setAttribute('aria-hidden', 'true');
      empty.append(
        icon,
        el('h2', 'crp-empty-title', t.emptyTitle),
        el('p', 'crp-empty-sub', t.emptySub)
      );
      var actRow = el('div', 'crp-empty-actions');
      var clrBtn = el('button', 'crp-btn crp-btn-primary', t.resetFiltersBtn);
      clrBtn.type = 'button';
      clrBtn.addEventListener('click', resetAllFilters);
      actRow.appendChild(clrBtn);

      var orspBtn = el('a', 'crp-btn', t.orspCta);
      orspBtn.href = '/career-paths/';
      actRow.appendChild(orspBtn);

      var jobsBtn = el('a', 'crp-btn', t.jobsCta);
      jobsBtn.href = '/jobs/';
      actRow.appendChild(jobsBtn);

      empty.appendChild(actRow);
      return empty;
    }

    var grid = el('section', 'crp-cards-grid crp-cards-grid--v453');
    grid.setAttribute('aria-label', 'Odisha & National Career Roadmaps');

    items.forEach(function (item) {
      var trackMeta = lib ? lib.getTrackMeta(item.track_slug) : { icon: '🧭', accent: 'civil', label_en: item.track_slug, label_or: item.track_slug };
      var card = el('article', 'crp-card crp-card--v453 crp-card--accent-' + (trackMeta.accent || 'civil'));
      card.setAttribute('data-roadmap-slug', item.slug);
      card.setAttribute('data-track-slug', item.track_slug);

      var accentBar = el('div', 'crp-card-accent-bar');
      accentBar.setAttribute('aria-hidden', 'true');
      card.appendChild(accentBar);

      var badges = el('div', 'crp-card-badges');
      badges.appendChild(el('span', 'crp-badge crp-badge-track', (trackMeta.icon || '🧭') + ' ' + pick(trackMeta.label_en, trackMeta.label_or)));
      badges.appendChild(el('span', 'crp-badge crp-badge-subtle', pick(item.scope_label_en, item.scope_label_or)));
      badges.appendChild(el('span', 'crp-badge crp-badge-subtle', pick(item.stage_label_en, item.stage_label_or)));
      if (item.status && item.status !== 'published') {
        badges.appendChild(el('span', 'crp-preview-badge', 'UNPUBLISHED ' + item.status.toUpperCase()));
      }

      var primaryTitle = pick(item.title_en, item.title_or);
      var altTitle = state.lang === 'or' ? item.title_en : item.title_or;
      var titleBlock = el('div', 'crp-card-title-block');
      titleBlock.appendChild(el('h3', 'crp-card-title', primaryTitle));
      if (altTitle && altTitle !== primaryTitle) {
        var altEl = el('p', 'crp-card-title-alt', altTitle);
        if (state.lang !== 'or') altEl.setAttribute('lang', 'or');
        titleBlock.appendChild(altEl);
      }

      var payStrip = el('div', 'crp-card-pay-badge');
      var payIco = el('span', 'crp-pay-ico', '₹');
      payIco.setAttribute('aria-hidden', 'true');
      payStrip.append(payIco, el('span', 'crp-pay-text', item.orsp_level || pick(item.salary_band, item.salary_band_or)));

      var summary = el('p', 'crp-card-summary', pick(item.summary_en, item.summary_or));

      // 3-Step Visual Milestone Preview
      var msList = el('ol', 'crp-card-milestones');
      msList.setAttribute('aria-label', 'Roadmap 3-Step Preview');
      (item.milestones || []).slice(0, 3).forEach(function (ms, idx) {
        var li = el('li', 'crp-card-ms-step');
        li.append(
          el('span', 'crp-card-ms-dot', String(ms.step || (idx + 1))),
          el('span', 'crp-card-ms-lbl', pick(ms.label_en, ms.label_or))
        );
        msList.appendChild(li);
      });

      var foot = el('div', 'crp-card-foot crp-card-foot--v453');
      var openBtn = el('button', 'crp-btn crp-btn-primary', t.openRoadmap);
      openBtn.type = 'button';
      openBtn.addEventListener('click', function () {
        openDrawer(item);
      });
      var saveBtn = createSaveButton(item);
      foot.append(openBtn, saveBtn);

      card.append(badges, titleBlock, payStrip, summary, msList, foot);
      grid.appendChild(card);
    });

    return grid;
  }

  function renderAll() {
    var focusId = document.activeElement && document.activeElement.id;
    var selStart = focusId === 'crp-filter-search' && document.activeElement.selectionStart;

    var result = getFilteredState();
    state.filteredResult = result;

    var wrap = el('div', 'crp-portal crp-root crp-root--v453');
    wrap.appendChild(renderHero(state.allRoadmaps.length));
    var prevBanner = renderPreviewBanner();
    if (prevBanner) wrap.appendChild(prevBanner);
    wrap.appendChild(renderFilterPanel(result));
    wrap.appendChild(renderCardsArea(result));

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

  function bindGlobalLanguageSync() {
    window.addEventListener('cso:lang-change', function (ev) {
      var nextLang = (ev && ev.detail && ev.detail.lang) ? String(ev.detail.lang).toLowerCase() : detectLang();
      var mapped = nextLang.indexOf('or') === 0 ? 'or' : 'en';
      if (mapped !== state.lang) {
        state.lang = mapped;
        renderAll();
        if (state.activeItem) openDrawer(state.activeItem);
      }
    });
    window.addEventListener('storage', function (ev) {
      if (!ev || ev.key === 'cso_saved_alerts_v1') {
        syncSaveButtons();
      }
      if (ev && (ev.key === 'cso_lang_pref' || ev.key === 'cso_lang')) {
        var next = detectLang();
        if (next !== state.lang) {
          state.lang = next;
          renderAll();
        }
      }
    });
  }

  function boot() {
    syncBodyClass();
    bindGlobalLanguageSync();

    // Instant zero-blank render of all 18 built-in bilingual roadmaps
    var lib = getLib();
    if (lib) {
      state.allRoadmaps = lib.getAllCareerRoadmaps([]);
      if (!state.previewId && !state.previewToken) {
        renderAll();
      }
    }

    var bootReq = fetch('/api/public/careers/bootstrap', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });

    var previewReq = null;
    if (state.previewId || state.previewToken) {
      var pqs = new URLSearchParams();
      if (state.previewId) pqs.set('preview_id', state.previewId);
      if (state.previewToken) pqs.set('preview_token', state.previewToken);
      if (state.slug) pqs.set('slug', state.slug);
      previewReq = fetch('/api/public/careers/list?' + pqs.toString(), { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) {
          return r.json().catch(function () { return null; }).then(function (d) {
            return { status: r.status, ok: r.ok, data: d };
          });
        })
        .catch(function () { return { status: 500, ok: false, data: null }; });
    }

    Promise.all([bootReq, previewReq]).then(function (res) {
      var bootData = res[0];
      var previewRes = res[1];
      var liveItems = (bootData && Array.isArray(bootData.latest)) ? bootData.latest : [];
      var curLib = getLib();

      if ((state.previewId || state.previewToken) && previewRes) {
        if (previewRes.ok && previewRes.data && previewRes.data.preview_item) {
          state.previewMode = true;
          state.previewExpiresAt = previewRes.data.preview_expires_at || '';
          var normPreview = curLib ? curLib.getAllCareerRoadmaps([previewRes.data.preview_item])[0] : previewRes.data.preview_item;
          state.liveD1Items = [normPreview];
          state.allRoadmaps = [normPreview];
          renderAll();
          openDrawer(normPreview);
          return;
        }
        state.previewError = (previewRes.data && previewRes.data.error) || 'Temporary preview link is invalid or expired.';
      }

      state.liveD1Items = liveItems;
      state.allRoadmaps = curLib ? curLib.getAllCareerRoadmaps(liveItems) : liveItems;
      renderAll();

      if (state.slug) {
        var target = state.allRoadmaps.find(function (it) { return it.slug === state.slug; });
        if (target) openDrawer(target);
      }
    }).catch(function () {
      try { renderAll(); } catch (_e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
