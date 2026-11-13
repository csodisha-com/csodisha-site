(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const sectionsNav = $('side-navigation');
  const sidebar = $('sidebar');
  const grid = $('dashboard-grid');
  const overview = $('overview');
  const explorer = $('explorer');
  const explorerTitle = $('explorer-title');
  const explorerDescription = $('explorer-description');
  const explorerItems = $('explorer-items');
  const search = $('directory-search');
  const clearSearch = $('clear-search');
  const clearSearchInline = $('clear-search-inline');
  const searchResults = $('search-results');
  const searchItems = $('search-items');
  const searchStatus = $('search-status');
  const loadStatus = $('load-status');
  const backButton = $('back-button');
  const pageTitle = $('page-title');
  const pageDescription = $('page-description');
  const breadcrumb = $('breadcrumb');
  const menuToggle = $('menu-toggle');

  const SITE_SUFFIX = 'Common Sense Odisha';
  const OVERVIEW_TITLE_EN = 'About Common Sense Odisha';
  const OVERVIEW_TITLE_OR = 'Common Sense Odisha (CSO) ବିଷୟରେ';
  const OVERVIEW_DESC_EN = 'Be Self-Reliant | Build a Better Tomorrow — Verified exam preparation, recruitment tracking, and public welfare guidance across Odisha.';
  const OVERVIEW_DESC_OR = 'ଆତ୍ମନିର୍ଭର ହୁଅନ୍ତୁ | ଉନ୍ନତ ଭବିଷ୍ୟତ ଗଢ଼ନ୍ତୁ — ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀ ଓ ନାଗରିକଙ୍କ ପାଇଁ ଯାଞ୍ଚ ହୋଇଥିବା ଶିକ୍ଷା, ନିଯୁକ୍ତି ଏବଂ ଯୋଜନା ତଥ୍ୟ।';

  const ODISHA_DISTRICTS = [
    { name: 'Angul', or: 'ଅନୁଗୁଳ', zone: 'central' },
    { name: 'Balangir', or: 'ବଲାଙ୍ଗୀର', zone: 'western' },
    { name: 'Balasore', or: 'ବାଲେଶ୍ୱର', zone: 'northern' },
    { name: 'Bargarh', or: 'ବରଗଡ଼', zone: 'western' },
    { name: 'Bhadrak', or: 'ଭଦ୍ରକ', zone: 'coastal' },
    { name: 'Boudh', or: 'ବୌଦ୍ଧ', zone: 'central' },
    { name: 'Cuttack', or: 'କଟକ', zone: 'coastal' },
    { name: 'Deogarh', or: 'ଦେବଗଡ଼', zone: 'northern' },
    { name: 'Dhenkanal', or: 'ଢେଙ୍କାନାଳ', zone: 'central' },
    { name: 'Gajapati', or: 'ଗଜପତି', zone: 'southern' },
    { name: 'Ganjam', or: 'ଗଞ୍ଜାମ', zone: 'coastal' },
    { name: 'Jagatsinghpur', or: 'ଜଗତସିଂହପୁର', zone: 'coastal' },
    { name: 'Jajpur', or: 'ଯାଜପୁର', zone: 'coastal' },
    { name: 'Jharsuguda', or: 'ଝାରସୁଗୁଡ଼ା', zone: 'western' },
    { name: 'Kalahandi', or: 'କଳାହାଣ୍ଡି', zone: 'southern' },
    { name: 'Kandhamal', or: 'କନ୍ଧମାଳ', zone: 'southern' },
    { name: 'Kendrapara', or: 'କେନ୍ଦ୍ରାପଡ଼ା', zone: 'coastal' },
    { name: 'Kendujhar (Keonjhar)', or: 'କେନ୍ଦୁଝର', zone: 'northern' },
    { name: 'Khordha', or: 'ଖୋର୍ଦ୍ଧା', zone: 'coastal' },
    { name: 'Koraput', or: 'କୋରାପୁଟ', zone: 'southern' },
    { name: 'Malkangiri', or: 'ମାଲକାନଗିରି', zone: 'southern' },
    { name: 'Mayurbhanj', or: 'ମୟୂରଭଞ୍ଜ', zone: 'northern' },
    { name: 'Nabarangpur', or: 'ନବରଙ୍ଗପୁର', zone: 'southern' },
    { name: 'Nayagarh', or: 'ନୟାଗଡ଼', zone: 'central' },
    { name: 'Nuapada', or: 'ନୂଆପଡ଼ା', zone: 'western' },
    { name: 'Puri', or: 'ପୁରୀ', zone: 'coastal' },
    { name: 'Rayagada', or: 'ରାୟଗଡ଼ା', zone: 'southern' },
    { name: 'Sambalpur', or: 'ସମ୍ବଲପୁର', zone: 'western' },
    { name: 'Subarnapur (Sonepur)', or: 'ସୁବର୍ଣ୍ଣପୁର', zone: 'western' },
    { name: 'Sundargarh', or: 'ସୁନ୍ଦରଗଡ଼', zone: 'northern' }
  ];

  const TRUSTED_GOV_SUFFIXES = [
    '.gov.in',
    '.nic.in',
    '.ac.in',
    '.edu.in',
    '.res.in'
  ];

  const TRUSTED_OFFICIAL_HOSTS = new Set([
    'ibps.in',
    'ibpsonline.ibps.in',
    'rbi.org.in',
    'opportunities.rbi.org.in',
    'nabard.org',
    'csodisha.com',
    'www.csodisha.com'
  ]);

  let groups = [];
  let totalCounts = { groups: 0, sections: 0, entries: 0 };
  let activeGroupIndex = -1;
  let activeSectionIndex = -1;
  let activeZone = 'all';

  function getLang() {
    try {
      const pref = localStorage.getItem('cso_lang_pref');
      if (pref === 'or' || pref === 'en' || pref === 'hi') return pref;
    } catch {}
    return document.documentElement.dataset.lang === 'or' ? 'or' : 'en';
  }

  function isOdia() {
    return getLang() === 'or';
  }

  function pickText(enText, orText) {
    if (isOdia() && orText && String(orText).trim()) return String(orText);
    return String(enText || '');
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function applyStaticBilingualCopy() {
    const odia = isOdia();
    document.querySelectorAll('[data-i18n-or]').forEach(node => {
      if (!node.dataset.i18nEn) {
        node.dataset.i18nEn = node.textContent;
      }
      node.textContent = odia ? (node.dataset.i18nOr || node.dataset.i18nEn) : node.dataset.i18nEn;
    });
    document.querySelectorAll('[data-i18n-placeholder-or]').forEach(inp => {
      if (!inp.dataset.i18nPlaceholderEn) {
        inp.dataset.i18nPlaceholderEn = inp.getAttribute('placeholder') || '';
      }
      inp.setAttribute(
        'placeholder',
        odia ? (inp.dataset.i18nPlaceholderOr || inp.dataset.i18nPlaceholderEn) : inp.dataset.i18nPlaceholderEn
      );
    });
  }

  function safeUrl(rawUrl) {
    const s = String(rawUrl || '').trim();
    if (!s) return '';
    if (s.startsWith('/') || s.startsWith('#')) return s;
    try {
      const u = new URL(s);
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
    } catch {}
    return '';
  }

  /* --------------------------------------------------------------------------
     Mobile Drawer & Accessibility Navigation
     -------------------------------------------------------------------------- */
  let lastFocusedElement = null;

  function getSidebarFocusables() {
    if (!sidebar) return [];
    return Array.from(sidebar.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(item => item.offsetWidth > 0 || item.offsetHeight > 0 || item === document.activeElement);
  }

  function openMobileMenu() {
    if (!sidebar || !menuToggle) return;
    lastFocusedElement = document.activeElement;
    document.body.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    sidebar.setAttribute('aria-modal', 'true');
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-label', 'About Directory Menu');
    const closeBtn = $('sidebar-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeMobileMenu() {
    if (!sidebar || !menuToggle) return;
    if (!document.body.classList.contains('menu-open')) {
      menuToggle.setAttribute('aria-expanded', 'false');
      return;
    }
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    sidebar.removeAttribute('aria-modal');
    sidebar.removeAttribute('role');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function' && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    } else {
      menuToggle.focus();
    }
  }

  /* --------------------------------------------------------------------------
     Breadcrumb, URL Sync & Directory Explorer (Live D1 + Fallback)
     -------------------------------------------------------------------------- */
  function setActiveSidebar() {
    if (!sectionsNav) return;
    sectionsNav.querySelectorAll('.side-link').forEach(btn => {
      const idx = Number(btn.dataset.groupIndex);
      const isActive = idx === activeGroupIndex;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('on', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  function renderBreadcrumb() {
    if (!breadcrumb) return;
    breadcrumb.replaceChildren();

    const addCrumb = (label, onClick, href, isCurrent = false) => {
      const li = el('li', 'breadcrumb-item');
      if (isCurrent) {
        li.setAttribute('aria-current', 'page');
        li.append(el('strong', 'breadcrumb-current', label));
      } else if (href) {
        const a = el('a', 'breadcrumb-link', label);
        a.href = href;
        li.append(a);
      } else {
        const b = el('button', 'breadcrumb-link', label);
        b.type = 'button';
        b.addEventListener('click', onClick);
        li.append(b);
      }
      breadcrumb.append(li);
    };

    addCrumb('CS Odisha', null, '../', false);

    if (activeGroupIndex < 0) {
      addCrumb(pickText('About CSO', 'CSO ବିଷୟରେ'), null, null, true);
      return;
    }

    addCrumb(pickText('About CSO', 'CSO ବିଷୟରେ'), () => showOverview(true), null, false);
    const grp = groups[activeGroupIndex];
    if (!grp) return;

    const grpTitle = pickText(grp.title, grp.title_or);
    if (activeSectionIndex < 0) {
      addCrumb(grpTitle, null, null, true);
      return;
    }

    addCrumb(grpTitle, () => openGroup(activeGroupIndex, -1, true), null, false);
    const sec = (grp.sections || [])[activeSectionIndex];
    if (sec) {
      addCrumb(pickText(sec.title, sec.title_or), null, null, true);
    }
  }

  function updateUrlState(pushHistory = false) {
    const url = new URL(window.location.href);
    url.searchParams.delete('group');
    url.searchParams.delete('section');
    url.searchParams.delete('path');

    if (activeGroupIndex >= 0 && groups[activeGroupIndex]) {
      const grp = groups[activeGroupIndex];
      url.searchParams.set('group', grp.slug || String(activeGroupIndex));
      if (activeSectionIndex >= 0 && grp.sections && grp.sections[activeSectionIndex]) {
        url.searchParams.set('section', grp.sections[activeSectionIndex].slug || String(activeSectionIndex));
      }
    }

    if (pushHistory) window.history.pushState({ activeGroupIndex, activeSectionIndex }, '', url.toString());
    else window.history.replaceState({ activeGroupIndex, activeSectionIndex }, '', url.toString());
  }

  function renderStatCards() {
    const container = $('stat-cards');
    if (!container) return;
    if (!groups.length && !totalCounts.groups) return;

    const groupCount = Number(totalCounts.groups || groups.length || 0);
    const sectionCount = Number(totalCounts.sections || groups.reduce((s, g) => s + (g.sections || []).length, 0) || 0);
    const entryCount = Number(
      totalCounts.entries ||
      groups.reduce((s, g) => s + (g.sections || []).reduce((ss, sec) => ss + (sec.entries || []).length, 0), 0) ||
      0
    );

    const cards = [
      ['🗂️', pickText('Navigation Groups', 'ଡିରେକ୍ଟୋରୀ ବିଭାଗ'), groupCount.toLocaleString('en-IN')],
      ['📁', pickText('Main Sections', 'ମୁଖ୍ୟ ଅନୁଭାଗ'), sectionCount.toLocaleString('en-IN')],
      ['📝', pickText('Detailed Entries', 'ବିସ୍ତୃତ ତଥ୍ୟ'), entryCount.toLocaleString('en-IN')],
      ['✅', pickText('D1 Verified', 'D1 ଯାଞ୍ଚିତ'), '100%']
    ];

    container.replaceChildren();
    cards.forEach(([icon, label, valueText]) => {
      const card = el('div', 'stat-card');
      card.append(el('span', 'stat-icon', icon));
      const content = el('div', 'stat-content');
      content.append(el('strong', 'stat-value', valueText));
      content.append(el('span', 'stat-label', label));
      card.append(content);
      container.append(card);
    });
  }

  function buildDashboard() {
    if (!sectionsNav || !grid) return;
    sectionsNav.replaceChildren();
    grid.replaceChildren();

    const overviewBtn = el('button', 'side-link');
    overviewBtn.type = 'button';
    overviewBtn.dataset.groupIndex = '-1';
    overviewBtn.append(
      el('span', 'side-icon', '🏠'),
      el('span', 'side-title', pickText('Overview', 'ସାରାଂଶ')),
      el('span', 'side-count', String(groups.length)),
      el('span', 'side-arrow', '›')
    );
    overviewBtn.addEventListener('click', () => {
      showOverview(true);
      closeMobileMenu();
    });
    sectionsNav.append(overviewBtn);

    groups.forEach((grp, idx) => {
      const secCount = (grp.sections || []).length;
      const entryCount = (grp.sections || []).reduce((acc, s) => acc + (s.entries || []).length, 0);
      const grpTitle = pickText(grp.title, grp.title_or);
      const grpSub = pickText(grp.subtitle, grp.subtitle_or);

      const navBtn = el('button', 'side-link');
      navBtn.type = 'button';
      navBtn.dataset.groupIndex = String(idx);
      navBtn.append(
        el('span', 'side-icon', grp.icon_name || '📁'),
        el('span', 'side-title', grpTitle),
        el('span', 'side-count', String(entryCount || secCount)),
        el('span', 'side-arrow', '›')
      );
      navBtn.addEventListener('click', () => {
        openGroup(idx, -1, true);
        closeMobileMenu();
      });
      sectionsNav.append(navBtn);

      const card = el('button', 'dashboard-card');
      card.type = 'button';
      card.append(el('span', 'card-icon', grp.icon_name || '📁'));
      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', grpTitle));
      const metaText = `${secCount} ${pickText('sections', 'ଅନୁଭାଗ')} · ${entryCount} ${pickText('entries', 'ବିଷୟ')}${grpSub ? ' — ' + grpSub : ''}`;
      content.append(el('span', 'card-meta', metaText));
      card.append(content);
      const arrow = el('span', 'card-arrow', '›');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(arrow);
      card.addEventListener('click', () => openGroup(idx, -1, true));
      grid.append(card);
    });

    renderStatCards();
    setActiveSidebar();
  }

  function showOverview(pushHistory = false) {
    activeGroupIndex = -1;
    activeSectionIndex = -1;
    if (overview) overview.hidden = false;
    if (explorer) explorer.hidden = true;
    if (searchResults) searchResults.hidden = true;
    if (pageTitle) pageTitle.textContent = pickText(OVERVIEW_TITLE_EN, OVERVIEW_TITLE_OR);
    if (pageDescription) pageDescription.textContent = pickText(OVERVIEW_DESC_EN, OVERVIEW_DESC_OR);
    document.title = `${OVERVIEW_TITLE_EN} | ${SITE_SUFFIX}`;
    renderBreadcrumb();
    setActiveSidebar();
    if (pushHistory) updateUrlState(true);
  }

  function openGroup(gIdx, sIdx = -1, pushHistory = false) {
    if (gIdx < 0 || gIdx >= groups.length) {
      showOverview(pushHistory);
      return;
    }
    activeGroupIndex = gIdx;
    activeSectionIndex = sIdx;
    if (overview) overview.hidden = true;
    if (searchResults) searchResults.hidden = true;
    if (explorer) explorer.hidden = false;
    renderExplorer();
    if (pushHistory) updateUrlState(true);
    const explorerAnchor = $('directory-explorer');
    if (explorerAnchor && pushHistory) {
      explorerAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderExplorer() {
    if (!explorerItems || activeGroupIndex < 0 || !groups[activeGroupIndex]) return;
    const grp = groups[activeGroupIndex];
    const sections = grp.sections || [];
    explorerItems.replaceChildren();

    if (activeSectionIndex >= 0 && sections[activeSectionIndex]) {
      const sec = sections[activeSectionIndex];
      const secTitle = pickText(sec.title, sec.title_or);
      const secSub = pickText(sec.subtitle, sec.subtitle_or);
      if (pageTitle) pageTitle.textContent = secTitle;
      if (pageDescription) pageDescription.textContent = secSub || pickText(grp.title, grp.title_or);
      if (explorerTitle) explorerTitle.textContent = secTitle;
      if (explorerDescription) {
        explorerDescription.textContent = `${(sec.entries || []).length} ${pickText('detailed charter entries in this section', 'ଟି ବିସ୍ତୃତ ବିବରଣୀ')}`;
      }
      if (backButton) {
        backButton.textContent = `← ${pickText(grp.title, grp.title_or)}`;
      }
      document.title = `${sec.title} | About CSO`;

      (sec.entries || []).forEach(entry => {
        explorerItems.append(buildEntryLeafCard(entry, grp, sec));
      });
      if (!(sec.entries || []).length) {
        explorerItems.append(el('p', 'about-muted', pickText('No published entries in this section yet.', 'ଏହି ବିଭାଗରେ କୌଣସି ପ୍ରକାଶିତ ତଥ୍ୟ ନାହିଁ।')));
      }
    } else {
      const grpTitle = pickText(grp.title, grp.title_or);
      const grpSub = pickText(grp.subtitle, grp.subtitle_or);
      if (pageTitle) pageTitle.textContent = grpTitle;
      if (pageDescription) pageDescription.textContent = grpSub || pickText(OVERVIEW_DESC_EN, OVERVIEW_DESC_OR);
      if (explorerTitle) explorerTitle.textContent = grpTitle;
      if (explorerDescription) {
        explorerDescription.textContent = `${sections.length} ${pickText('sections available — click any section to read verified details', 'ଟି ଅନୁଭାଗ ଉପଲବ୍ଧ')}`;
      }
      if (backButton) {
        backButton.textContent = pickText('← All directory groups', '← ସମସ୍ତ ବିଭାଗ');
      }
      document.title = `${grp.title} | About CSO`;

      sections.forEach((sec, sIdx) => {
        const btn = el('button', 'explorer-item dashboard-card');
        btn.type = 'button';
        btn.append(el('span', 'card-icon', sec.icon_name || grp.icon_name || '📂'));
        const content = el('div', 'card-content');
        content.append(el('span', 'card-title', pickText(sec.title, sec.title_or)));
        const eLen = (sec.entries || []).length;
        const secSub = pickText(sec.subtitle, sec.subtitle_or);
        content.append(el('span', 'card-meta', `${eLen} ${pickText('entries', 'ବିଷୟ')}${secSub ? ' · ' + secSub : ''}`));
        btn.append(content);
        const arrow = el('span', 'card-arrow', '›');
        arrow.setAttribute('aria-hidden', 'true');
        btn.append(arrow);
        btn.addEventListener('click', () => openGroup(activeGroupIndex, sIdx, true));
        explorerItems.append(btn);
      });
    }

    renderBreadcrumb();
    setActiveSidebar();
  }

  function buildEntryLeafCard(entry, grp, sec) {
    const card = el('article', 'explorer-item leaf leaf-rich');
    card.append(el('span', 'card-icon', entry.icon_name || '📌'));
    const content = el('div', 'card-content');
    content.append(el('span', 'card-title', pickText(entry.title, entry.title_or)));
    const bodyCopy = pickText(entry.body_text || entry.subtitle, entry.body_text_or || entry.subtitle_or);
    if (bodyCopy) {
      content.append(el('p', 'leaf-rich-body', bodyCopy));
    }
    const actions = el('div', 'leaf-rich-actions');
    if (entry.badge_text) {
      actions.append(el('span', 'leaf-badge', entry.badge_text));
    }
    if (grp && sec) {
      actions.append(el('span', 'about-muted', `${pickText(grp.title, grp.title_or)} › ${pickText(sec.title, sec.title_or)}`));
    }
    const linkHref = safeUrl(entry.official_url);
    if (linkHref) {
      const a = el('a', 'leaf-link', pickText('Open section / portal →', 'ବିଭାଗ ଖୋଲନ୍ତୁ →'));
      a.href = linkHref;
      if (linkHref.startsWith('http') && !linkHref.startsWith(window.location.origin)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      actions.append(a);
    }
    content.append(actions);
    card.append(content);
    return card;
  }

  function runDirectorySearch() {
    if (!search || !searchResults || !searchItems) return;
    const raw = search.value.trim();
    if (clearSearch) clearSearch.hidden = !raw;

    if (!raw) {
      searchResults.hidden = true;
      if (activeGroupIndex >= 0) {
        if (explorer) explorer.hidden = false;
        if (overview) overview.hidden = true;
      } else {
        if (overview) overview.hidden = false;
        if (explorer) explorer.hidden = true;
      }
      return;
    }

    const q = raw.toLowerCase();
    const matches = [];
    groups.forEach((grp, gIdx) => {
      (grp.sections || []).forEach((sec, sIdx) => {
        const secHay = [sec.title, sec.title_or, sec.subtitle, sec.subtitle_or].join(' ').toLowerCase();
        if (secHay.includes(q)) {
          matches.push({ kind: 'section', grp, gIdx, sec, sIdx, label: pickText(sec.title, sec.title_or), desc: pickText(sec.subtitle, sec.subtitle_or) });
        }
        (sec.entries || []).forEach(entry => {
          const entHay = [entry.title, entry.title_or, entry.subtitle, entry.body_text, entry.body_text_or, entry.badge_text].join(' ').toLowerCase();
          if (entHay.includes(q)) {
            matches.push({ kind: 'entry', grp, gIdx, sec, sIdx, entry, label: pickText(entry.title, entry.title_or), desc: pickText(entry.body_text, entry.body_text_or) });
          }
        });
      });
    });

    if (overview) overview.hidden = true;
    if (explorer) explorer.hidden = true;
    searchResults.hidden = false;
    searchItems.replaceChildren();
    if (searchStatus) {
      searchStatus.textContent = `${matches.length} ${pickText('matches found for', 'ଟି ଫଳାଫଳ ମିଳିଲା:')} "${raw}"`;
    }

    if (!matches.length) {
      searchItems.append(el('p', 'about-muted', pickText('No matching entries found in the About directory. Try Ctrl+K to search jobs, schemes & mock tests.', 'କୌଣସି ଫଳାଫଳ ମିଳିଲା ନାହିଁ। ଚାକିରି ଓ ଯୋଜନା ପାଇଁ Ctrl+K ବ୍ୟବହାର କରନ୍ତୁ।')));
      return;
    }

    matches.slice(0, 40).forEach(m => {
      const btn = el('button', 'explorer-item dashboard-card');
      btn.type = 'button';
      btn.append(el('span', 'card-icon', m.entry ? (m.entry.icon_name || '📌') : (m.grp.icon_name || '📂')));
      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', m.label));
      content.append(el('span', 'card-meta', `${pickText(m.grp.title, m.grp.title_or)} › ${pickText(m.sec.title, m.sec.title_or)}${m.desc ? ' — ' + m.desc.slice(0, 120) : ''}`));
      btn.append(content);
      const arrow = el('span', 'card-arrow', '›');
      arrow.setAttribute('aria-hidden', 'true');
      btn.append(arrow);
      btn.addEventListener('click', () => {
        search.value = '';
        if (clearSearch) clearSearch.hidden = true;
        openGroup(m.gIdx, m.sIdx, true);
      });
      searchItems.append(btn);
    });
  }

  function syncFromUrl(pushHistory = false) {
    const url = new URL(window.location.href);
    const groupParam = (url.searchParams.get('group') || '').trim().toLowerCase();
    const sectionParam = (url.searchParams.get('section') || '').trim().toLowerCase();
    const qParam = (url.searchParams.get('q') || '').trim();

    if (qParam && search) {
      search.value = qParam;
      runDirectorySearch();
      return;
    }

    if (!groupParam) {
      showOverview(pushHistory);
      return;
    }

    let gIdx = -1;
    if (/^\d+$/.test(groupParam)) {
      const n = Number(groupParam);
      if (n >= 0 && n < groups.length) gIdx = n;
    }
    if (gIdx < 0) {
      gIdx = groups.findIndex(g => g.slug === groupParam || slugify(g.title) === groupParam || String(g.id).toLowerCase() === groupParam);
    }
    if (gIdx < 0) {
      showOverview(pushHistory);
      return;
    }

    let sIdx = -1;
    const secs = groups[gIdx].sections || [];
    if (sectionParam) {
      if (/^\d+$/.test(sectionParam)) {
        const n = Number(sectionParam);
        if (n >= 0 && n < secs.length) sIdx = n;
      }
      if (sIdx < 0) {
        sIdx = secs.findIndex(s => s.slug === sectionParam || slugify(s.title) === sectionParam || String(s.id).toLowerCase() === sectionParam);
      }
    }

    openGroup(gIdx, sIdx, pushHistory);
  }

  function convertFallbackDirectoryJson(raw) {
    const nav = Array.isArray(raw && raw.navigation) ? raw.navigation : [];
    const icons = ['🧭', '📐', '🛡️', '🤝', '⚖️', '✉️'];
    return nav.map((g, gIdx) => ({
      id: g.id || `group-${gIdx + 1}`,
      slug: slugify(g.title),
      level: 'group',
      title: g.title,
      title_or: g.title,
      subtitle: '',
      subtitle_or: '',
      icon_name: icons[gIdx % icons.length],
      sections: (g.sections || []).map((s, sIdx) => ({
        id: `sec-${s.number || sIdx}`,
        slug: slugify(s.title),
        level: 'section',
        title: s.title,
        title_or: s.title,
        subtitle: '',
        subtitle_or: '',
        icon_name: icons[gIdx % icons.length],
        entries: (s.children || []).map((ch, eIdx) => ({
          id: `entry-${ch.number || eIdx}`,
          slug: slugify(ch.title),
          level: 'entry',
          title: ch.title,
          title_or: ch.title,
          subtitle: s.title,
          body_text: ((ch.notes || [])[0] && ch.notes[0].text) || '',
          body_text_or: '',
          badge_text: ch.number || '',
          icon_name: '📌',
          official_url: ''
        }))
      }))
    }));
  }

  async function loadAboutDirectory() {
    if (loadStatus) loadStatus.hidden = false;
    try {
      const res = await fetch('/api/content/about-directory', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.groups) && data.groups.length) {
          groups = data.groups;
          totalCounts = data.total_counts || data.counts || totalCounts;
          if (loadStatus) loadStatus.hidden = true;
          buildDashboard();
          syncFromUrl(false);
          return;
        }
      }
    } catch {}

    try {
      const fb = await fetch('./generated/directory.json');
      if (fb.ok) {
        const raw = await fb.json();
        groups = convertFallbackDirectoryJson(raw);
        totalCounts = {
          groups: groups.length,
          sections: groups.reduce((a, g) => a + g.sections.length, 0),
          entries: groups.reduce((a, g) => a + g.sections.reduce((b, s) => b + s.entries.length, 0), 0)
        };
      }
    } catch {}
    if (loadStatus) loadStatus.hidden = true;
    buildDashboard();
    syncFromUrl(false);
  }

  /* --------------------------------------------------------------------------
     Live Platform Telemetry & Changelog (D1)
     -------------------------------------------------------------------------- */
  async function loadPlatformStats() {
    try {
      const res = await fetch('/api/content/platform-stats', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const d = await res.json();
      const setNum = (id, val) => {
        const node = $(id);
        if (node && typeof val === 'number') node.textContent = val.toLocaleString('en-IN');
      };
      setNum('stat-exams-count', d.examsCount);
      setNum('stat-jobs-count', d.activeJobsCount);
      setNum('stat-schemes-count', d.schemesCount);
      setNum('stat-resources-count', d.resourcesCount);
      setNum('stat-tests-count', d.mockTestsCount);
      setNum('stat-dir-count', d.directoryNodesCount);
      setNum('stat-feedback-count', d.resolvedFeedbackCount);
      setNum('stat-districts-count', d.districtsCount || 30);
    } catch {}
  }

  async function loadChangelog() {
    const list = $('about-changelog-list');
    if (!list) return;
    try {
      const res = await fetch('/api/content/changelog?limit=10', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      list.replaceChildren();
      if (!items.length) {
        list.append(el('p', 'about-muted', pickText('No changelog items recorded yet.', 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପରିବର୍ତ୍ତନ ଲଗ୍ ନାହିଁ।')));
        return;
      }
      items.forEach(item => {
        const row = el('a', 'about-changelog-item');
        row.href = safeUrl(item.url) || '/about/';
        const meta = el('div', 'about-changelog-meta');
        const headLine = el('div', 'leaf-rich-actions');
        headLine.append(el('span', 'leaf-badge', item.badge || item.kind || 'Update'));
        headLine.append(el('strong', '', pickText(item.title, item.title_or)));
        meta.append(headLine);
        if (item.summary) meta.append(el('span', 'about-muted', item.summary));
        const tsText = item.timestamp ? String(item.timestamp).slice(0, 10) : 'Live';
        row.append(meta, el('span', 'about-changelog-time', tsText));
        list.append(row);
      });
    } catch {
      list.replaceChildren(el('p', 'about-muted', pickText('Changelog feed temporarily unavailable offline.', 'ଅଫଲାଇନ୍ ଥିବାରୁ ପରିବର୍ତ୍ତନ ଲଗ୍ ଦେଖିହେଉନାହିଁ।')));
    }
  }

  /* --------------------------------------------------------------------------
     Client-Side Anti-Scam Portal URL Verifier
     -------------------------------------------------------------------------- */
  function verifyPortalUrl(rawInput) {
    const out = $('scam-verify-result');
    if (!out) return;
    const raw = String(rawInput || '').trim();
    out.hidden = false;
    out.classList.remove('is-safe', 'is-warn', 'is-info');

    if (!raw) {
      out.classList.add('is-info');
      out.textContent = pickText('Paste any URL above (for example, https://opsc.gov.in) to inspect its domain.', 'ଯାଞ୍ଚ ପାଇଁ ଉପରେ କୌଣସି ଲିଙ୍କ୍ ପେଷ୍ଟ କରନ୍ତୁ।');
      return;
    }

    let normalized = raw;
    if (!/^[a-z]+:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }

    let parsed;
    try {
      parsed = new URL(normalized);
    } catch {
      out.classList.add('is-warn');
      out.textContent = pickText('Invalid URL format. Treat malformed links sent via SMS/WhatsApp with extreme caution.', 'ଅବୈଧ ଲିଙ୍କ୍ ଫର୍ମାଟ୍। ସନ୍ଦେହଜନକ ମେସେଜ୍ ଲିଙ୍କ୍ ଖୋଲନ୍ତୁ ନାହିଁ।');
      return;
    }

    const host = parsed.hostname.toLowerCase();
    const isHttps = parsed.protocol === 'https:';
    const isGovDomain = TRUSTED_GOV_SUFFIXES.some(sfx => host === sfx.slice(1) || host.endsWith(sfx)) || TRUSTED_OFFICIAL_HOSTS.has(host);

    if (isGovDomain && isHttps) {
      out.classList.add('is-safe');
      out.textContent = `✅ ${pickText('Verified Official Government / Exam Domain', 'ଯାଞ୍ଚ ହୋଇଥିବା ସରକାରୀ / ପରୀକ୍ଷା ଡୋମେନ୍')}: ${host} (HTTPS). ${pickText('Double-check the announcement inside the portal before paying any fee.', 'ଫି ପଇଠ ପୂର୍ବରୁ ପୋର୍ଟାଲ୍ ଭିତରେ ବିଜ୍ଞପ୍ତି ଯାଞ୍ଚ କରନ୍ତୁ।')}`;
    } else if (isGovDomain && !isHttps) {
      out.classList.add('is-info');
      out.textContent = `⚠️ ${pickText('Official domain matched', 'ସରକାରୀ ଡୋମେନ୍')}: ${host}, ${pickText('but it uses insecure http:// instead of https://.', 'କିନ୍ତୁ ସୁରକ୍ଷିତ https:// ପରିବର୍ତ୍ତେ http:// ବ୍ୟବହାର ହୋଇଛି।')}`;
    } else {
      out.classList.add('is-warn');
      out.textContent = `🚨 ${pickText('Caution: NOT an official .gov.in / .nic.in portal', 'ସତର୍କତା: ଏହା ସରକାରୀ .gov.in ବା .nic.in ପୋର୍ଟାଲ୍ ନୁହେଁ')}: "${host}". ${pickText('Do NOT enter Aadhaar, OTP, bank details, or application fees here. Verify only via official government portals listed below.', 'ଏଠାରେ ଆଧାର, OTP, ବ୍ୟାଙ୍କ ତଥ୍ୟ ବା ଆବେଦନ ଫି ଦିଅନ୍ତୁ ନାହିଁ।')}`;
    }
  }

  function setupPortalVerifier() {
    const input = $('scam-url-input');
    const btn = $('scam-verify-btn');
    if (!input || !btn) return;
    btn.addEventListener('click', () => verifyPortalUrl(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyPortalUrl(input.value);
      }
    });
    document.querySelectorAll('.about-preset-btn').forEach(preset => {
      preset.addEventListener('click', () => {
        input.value = preset.dataset.testUrl || '';
        verifyPortalUrl(input.value);
      });
    });
  }

  /* --------------------------------------------------------------------------
     30-District Reach Grid
     -------------------------------------------------------------------------- */
  function renderDistricts() {
    const gridEl = $('about-districts-grid');
    if (!gridEl) return;
    const filtered = activeZone === 'all'
      ? ODISHA_DISTRICTS
      : ODISHA_DISTRICTS.filter(d => d.zone === activeZone);
    gridEl.replaceChildren();
    filtered.forEach(d => {
      const a = el('a', 'about-district-chip');
      a.href = `../jobs-careers/?q=${encodeURIComponent(d.name.split(' ')[0])}`;
      a.append(
        el('span', '', isOdia() ? d.or : d.name),
        el('small', '', d.zone.toUpperCase())
      );
      gridEl.append(a);
    });
  }

  function setupDistrictZones() {
    const tabs = $('district-zone-tabs');
    if (!tabs) return;
    tabs.querySelectorAll('.about-zone-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeZone = tab.dataset.zone || 'all';
        tabs.querySelectorAll('.about-zone-tab').forEach(t => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        renderDistricts();
      });
    });
    renderDistricts();
  }

  /* --------------------------------------------------------------------------
     Copy Actions, Print Guide, Editorial Desk CTAs & Global Shortcuts
     -------------------------------------------------------------------------- */
  function showCopyToast(msg) {
    const box = $('about-copy-status');
    if (!box) return;
    box.hidden = false;
    box.textContent = msg;
    window.clearTimeout(box._timer);
    box._timer = window.setTimeout(() => { box.hidden = true; }, 2800);
  }

  async function copyValue(val, label) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(val);
      }
      showCopyToast(`✅ ${pickText('Copied to clipboard:', 'କପି ହୋଇଛି:')} ${label || val}`);
    } catch {
      showCopyToast(`ℹ️ ${val}`);
    }
  }

  function setupUtilities() {
    document.querySelectorAll('.about-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.copyVal || '';
        if (val) copyValue(val);
      });
    });

    document.querySelectorAll('.about-copy-anchor').forEach(btn => {
      btn.addEventListener('click', () => {
        const hash = btn.dataset.copyAnchor || '#mission-charter';
        const fullUrl = `${window.location.origin}/about/${hash}`;
        copyValue(fullUrl, fullUrl);
      });
    });

    const printBtn = $('btnPrintAbout');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }

    const globalSearchBtn = $('btnGlobalSearchShortcut');
    if (globalSearchBtn) {
      globalSearchBtn.addEventListener('click', () => {
        if (window.CSOGlobal && typeof window.CSOGlobal.openSearch === 'function') {
          window.CSOGlobal.openSearch();
        } else if (search) {
          search.focus();
        }
      });
    }

    const reportBtn = $('btnReportError');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        if (window.CSOGlobal && typeof window.CSOGlobal.openFeedback === 'function') {
          window.CSOGlobal.openFeedback('error');
        } else {
          window.location.href = '../support/#report-error';
        }
      });
    }

    const suggestBtn = $('btnSuggestResource');
    if (suggestBtn) {
      suggestBtn.addEventListener('click', () => {
        if (window.CSOGlobal && typeof window.CSOGlobal.openFeedback === 'function') {
          window.CSOGlobal.openFeedback('suggest');
        } else {
          window.location.href = '../support/#suggest-resource';
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     Event Wiring & Boot
     -------------------------------------------------------------------------- */
  if (backButton) {
    backButton.addEventListener('click', () => {
      if (activeSectionIndex >= 0) openGroup(activeGroupIndex, -1, true);
      else showOverview(true);
    });
  }

  const backdrop = $('sidebar-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
  const sidebarClose = $('sidebar-close');
  if (sidebarClose) sidebarClose.addEventListener('click', closeMobileMenu);

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        if (document.body.classList.contains('menu-open')) closeMobileMenu();
        else openMobileMenu();
      } else {
        const collapsed = document.body.classList.toggle('sidebar-collapsed');
        menuToggle.setAttribute('aria-expanded', String(!collapsed));
      }
    });
  }

  if (search) search.addEventListener('input', runDirectorySearch);
  const clearAllSearch = () => {
    if (search) search.value = '';
    if (clearSearch) clearSearch.hidden = true;
    runDirectorySearch();
    if (search) search.focus();
  };
  if (clearSearch) clearSearch.addEventListener('click', clearAllSearch);
  if (clearSearchInline) clearSearchInline.addEventListener('click', clearAllSearch);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
      e.preventDefault();
      closeMobileMenu();
    }
    if (e.key === 'Tab' && document.body.classList.contains('menu-open')) {
      const focusables = getSidebarFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('popstate', () => syncFromUrl(false));

  const onLangRefresh = () => {
    applyStaticBilingualCopy();
    if (groups.length) buildDashboard();
    if (activeGroupIndex >= 0) renderExplorer();
    else showOverview(false);
    renderDistricts();
    loadChangelog();
  };

  window.addEventListener('cso:langchange', onLangRefresh);
  window.addEventListener('storage', e => {
    if (e.key === 'cso_lang_pref') onLangRefresh();
  });

  applyStaticBilingualCopy();
  setupPortalVerifier();
  setupDistrictZones();
  setupUtilities();
  loadAboutDirectory();
  loadPlatformStats();
  loadChangelog();
})();
