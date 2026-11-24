(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const sectionsNav = $('side-navigation');
  const sidebar = $('sidebar');
  const explorer = $('explorer');
  const explorerTitle = $('explorer-title');
  const explorerDescription = $('explorer-description');
  const explorerItems = $('explorer-items');
  const search = $('directory-search');
  const clearSearch = $('clear-search');
  const searchResults = $('search-results');
  const searchItems = $('search-items');
  const searchStatus = $('search-status');
  const loadStatus = $('load-status');
  const backButton = $('back-button');
  const pageTitle = $('page-title');
  const pageDescription = $('page-description');
  const breadcrumb = $('breadcrumb');
  const menuToggle = $('menu-toggle');

  const SUBPAGE_TITLE = 'Jobs & Careers';
  const SITE_SUFFIX = 'Common Sense Odisha';
  const OVERVIEW_DESCRIPTION = 'Explore opportunities, qualifications, courses, scholarships and career pathways.';

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const SECTION_SLUG_BY_INDEX = [
    'jobs-recruitment',
    'career-explorer',
    'eligibility-explorer',
    'courses-exams',
    'scholarships-support',
    'international-overseas',
    'career-development',
    'institutions-portals'
  ];

  function getSectionSlug(section) {
    if (!section) return '';
    if (section.slug) return String(section.slug);
    const idx = Array.isArray(sections) ? sections.indexOf(section) : -1;
    if (idx >= 0 && idx < SECTION_SLUG_BY_INDEX.length) return SECTION_SLUG_BY_INDEX[idx];
    return slugify(section.title);
  }

  function isSingleWrapperSection(sectionIndex) {
    if (sectionIndex < 0 || sectionIndex >= sections.length) return false;
    const ch = sections[sectionIndex].children || [];
    return ch.length === 1 && Array.isArray(ch[0].children) && ch[0].children.length > 0;
  }

  function resolveSectionIndex(val) {
    if (val === null || val === undefined) return -1;
    const raw = String(val).trim();
    if (!raw) return -1;
    if (/^\d+$/.test(raw)) {
      const num = parseInt(raw, 10);
      if (num >= 0 && num < sections.length) return num;
    }
    const cleanVal = slugify(raw);
    if (!cleanVal) return -1;

    // 1. Exact slug match or exact title slug match
    let idx = sections.findIndex(s => {
      const sSlug = getSectionSlug(s);
      return sSlug === cleanVal || slugify(s.title) === cleanVal;
    });
    if (idx !== -1) return idx;

    // 2. Normalized match (ignoring 'and')
    const normVal = cleanVal.replace(/-?and-?/g, '-').replace(/^-+|-+$/g, '');
    if (normVal) {
      idx = sections.findIndex(s => {
        const sNorm = getSectionSlug(s).replace(/-?and-?/g, '-').replace(/^-+|-+$/g, '');
        return sNorm === normVal;
      });
      if (idx !== -1) return idx;
    }

    // 3. Substring match
    idx = sections.findIndex(s => {
      const sSlug = getSectionSlug(s);
      return sSlug.includes(cleanVal) || cleanVal.includes(sSlug);
    });
    if (idx !== -1) return idx;

    // 4. Token overlap match
    const valWords = cleanVal.split('-').filter(w => w.length > 2 && w !== 'and');
    if (valWords.length > 0) {
      idx = sections.findIndex(s => {
        const sSlug = getSectionSlug(s);
        return valWords.some(w => sSlug.includes(w));
      });
      if (idx !== -1) return idx;
    }

    return -1;
  }

  function updateDocumentTitle(title) {
    if (!title || currentSection < 0) {
      document.title = `${SUBPAGE_TITLE} Explorer | ${SITE_SUFFIX}`;
    } else {
      const clean = String(title).replace(/\s+Directory$/i, '').trim();
      if (clean.toLowerCase() === SUBPAGE_TITLE.toLowerCase()) {
        document.title = `${clean} | ${SITE_SUFFIX}`;
      } else {
        document.title = `${clean} - ${SUBPAGE_TITLE} | ${SITE_SUFFIX}`;
      }
    }
  }

  const BOOKMARK_TRACKS_KEY = 'cso_bookmarked_tracks_v1';

  function loadBookmarkedTracks() {
    try {
      const raw = localStorage.getItem(BOOKMARK_TRACKS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveBookmarkedTracks(list) {
    try {
      localStorage.setItem(BOOKMARK_TRACKS_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function isTrackBookmarked(slug) {
    return loadBookmarkedTracks().some(t => t.slug === slug);
  }

  function updateBookmarksPillUI() {
    const count = loadBookmarkedTracks().length;
    const on = Boolean(typeof liveState !== 'undefined' && liveState.bookmarksOnly);
    ['live-jobs-bookmarks-toggle', 'cso-selector-bookmarks-toggle'].forEach(id => {
      const bmPill = document.getElementById(id);
      if (!bmPill) return;
      bmPill.textContent = `★ Saved Bookmarks (${count})`;
      bmPill.classList.toggle('is-active', on);
      bmPill.setAttribute('aria-pressed', String(on));
    });
  }

  function toggleTrackBookmark(track) {
    const list = loadBookmarkedTracks();
    const idx = list.findIndex(t => t.slug === track.slug);
    let saved = false;
    if (idx >= 0) {
      list.splice(idx, 1);
      saved = false;
    } else {
      list.unshift({
        slug: track.slug,
        title: track.title,
        subtitle: track.subtitle || '',
        l1: track.l1 || '',
        l2: track.l2 || '',
        sectionSlug: track.sectionSlug || 'jobs-recruitment'
      });
      saved = true;
    }
    saveBookmarkedTracks(list);
    updateBookmarksPillUI();
    return saved;
  }

  function getNodeCode(node) {
    if (!node) return '';
    return String(node.number || '').trim() || slugify(node.title);
  }

  function findChildIndexByCode(children, code) {
    if (!Array.isArray(children) || !code) return -1;
    const norm = String(code).trim().toLowerCase();
    let idx = children.findIndex(c => String(c.number || '').trim().toLowerCase() === norm);
    if (idx !== -1) return idx;
    const sNorm = slugify(code);
    return children.findIndex(c => slugify(c.title) === sNorm);
  }

  function getEffectiveLayerCodes() {
    if (currentSection < 0 || currentSection >= sections.length) return { l1: '', l2: '', sectionSlug: '' };
    const section = sections[currentSection];
    const hasSingleWrapper = isSingleWrapperSection(currentSection);
    const eff = hasSingleWrapper ? path.slice(1) : path;
    let node = hasSingleWrapper ? section.children[0] : section;
    let l1 = '';
    let l2 = '';
    if (eff.length >= 1 && Array.isArray(node.children) && node.children[eff[0]]) {
      node = node.children[eff[0]];
      l1 = getNodeCode(node);
    }
    if (eff.length >= 2 && Array.isArray(node.children) && node.children[eff[1]]) {
      node = node.children[eff[1]];
      l2 = getNodeCode(node);
    }
    return { l1, l2, sectionSlug: getSectionSlug(section) };
  }

  function updateUrlState(pushHistory = true, replaceUrl = false) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('section');
      url.searchParams.delete('path');
      if (currentSection >= 0 && currentSection < sections.length) {
        const slug = getSectionSlug(sections[currentSection]);
        url.pathname = `/jobs-careers/${slug}`;
        const codes = getEffectiveLayerCodes();
        if (codes.l1) url.searchParams.set('l1', codes.l1);
        else url.searchParams.delete('l1');
        if (codes.l2) url.searchParams.set('l2', codes.l2);
        else url.searchParams.delete('l2');
        if (selectedL3Slug) url.searchParams.set('l3', selectedL3Slug);
        else url.searchParams.delete('l3');

        const state = {
          sectionIndex: currentSection,
          slug,
          l1: codes.l1,
          l2: codes.l2,
          l3: selectedL3Slug,
          path: [...path]
        };

        if (replaceUrl || url.href === window.location.href) {
          window.history.replaceState(state, '', url.toString());
        } else if (pushHistory) {
          window.history.pushState(state, '', url.toString());
        }
      } else {
        url.pathname = '/jobs-careers/';
        url.searchParams.delete('l1');
        url.searchParams.delete('l2');
        url.searchParams.delete('l3');
        const state = { sectionIndex: -1, slug: '', l1: '', l2: '', l3: '', path: [] };
        if (replaceUrl || url.href === window.location.href) {
          window.history.replaceState(state, '', url.toString());
        } else if (pushHistory) {
          window.history.pushState(state, '', url.toString());
        }
      }
    } catch (_) {
      // Safe fallback when window history is restricted
    }
  }

  const icons = ['💼','🧭','📋','📚','🎓','🌍','📈','🏛️'];

  let sections = [];
  let path = [];
  let currentSection = -1;
  let selectedL3Slug = '';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function countNodes(nodes) {
    return nodes.reduce(
      (sum, node) => sum + 1 + countNodes(node.children || []),
      0
    );
  }

  function countNotes(nodes) {
    return nodes.reduce(
      (total, node) =>
        total +
        (node.notes || []).length +
        countNotes(node.children || []),
      0
    );
  }

  let lastFocusedElement = null;

  function ensureDrawerBackdrop() {
    let backdrop = document.getElementById('sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.className = 'sidebar-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      const shell = document.querySelector('.app-shell') || document.body;
      shell.insertBefore(backdrop, shell.firstChild);
    }
    return backdrop;
  }

  function getSidebarFocusables() {
    if (!sidebar) return [];
    return Array.from(sidebar.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
    });
  }

  function openMobileMenu() {
    if (!menuToggle || !sidebar) return;
    lastFocusedElement = document.activeElement;
    document.body.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    sidebar.setAttribute('aria-modal', 'true');
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-label', 'Directory Sections Menu');

    // Focus close button or first actionable element in drawer
    const focusables = getSidebarFocusables();
    if (focusables.length) {
      const closeBtn = document.getElementById('sidebar-close');
      if (closeBtn && focusables.includes(closeBtn)) {
        closeBtn.focus();
      } else {
        focusables[0].focus();
      }
    }
  }

  function closeMobileMenu() {
    if (!document.body.classList.contains('menu-open')) {
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      return;
    }
    document.body.classList.remove('menu-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (sidebar) {
      sidebar.removeAttribute('aria-modal');
      sidebar.removeAttribute('role');
    }

    // Return focus safely to last focused element or toggle button
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function' && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    } else if (menuToggle && typeof menuToggle.focus === 'function') {
      menuToggle.focus();
    }
  }

  function setActiveSidebar() {
    if (!sectionsNav) return;
    sectionsNav.querySelectorAll('.side-link').forEach(button => {
      const index = Number(button.dataset.sectionIndex);
      const isActive = index === currentSection;
      button.classList.toggle('active', isActive);
      button.classList.toggle('on', isActive);
      if (isActive) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function renderBreadcrumb() {
    if (!breadcrumb) return;
    breadcrumb.replaceChildren();

    function addCrumb(label, action, isCurrent = false) {
      const item = el('li', 'breadcrumb-item');

      if (isCurrent) {
        item.setAttribute('aria-current', 'page');
        if (action) {
          let link;
          if (typeof action === 'string') {
            link = el('a', 'breadcrumb-link breadcrumb-current', label);
            link.href = action;
          } else {
            link = el('button', 'breadcrumb-link breadcrumb-current', label);
            link.type = 'button';
            link.addEventListener('click', action);
          }
          link.setAttribute('aria-current', 'page');
          item.append(link);
        } else {
          const current = el('strong', 'breadcrumb-current', label);
          current.setAttribute('aria-current', 'page');
          item.append(current);
        }
      } else {
        let link;
        if (typeof action === 'string') {
          link = el('a', 'breadcrumb-link', label);
          link.href = action;
        } else {
          link = el('button', 'breadcrumb-link', label);
          link.type = 'button';
          link.addEventListener('click', action);
        }
        item.append(link);
      }

      breadcrumb.append(item);
    }

    addCrumb('Home', '../index.html');

    if (currentSection < 0) {
      addCrumb(SUBPAGE_TITLE, () => openSection(0, true), true);
      return;
    }

    addCrumb(SUBPAGE_TITLE, () => openSection(0, true), false);

    const section = sections[currentSection];
    const sectionTitle = section.title.replace(/\s+Directory$/i, '').trim();

    const hasSingleWrapper = isSingleWrapperSection(currentSection);
    const effectivePath = hasSingleWrapper && path.length > 0 && path[0] === 0
      ? path.slice(1)
      : path;
    const isAtSectionRoot = effectivePath.length === 0;

    const resetToSectionRoot = () => {
      path = hasSingleWrapper ? [0] : [];
      updateUrlState(true);
      renderExplorer();
    };

    if (isAtSectionRoot) {
      addCrumb(sectionTitle, resetToSectionRoot, true);
      return;
    }

    addCrumb(sectionTitle, resetToSectionRoot, false);

    let node = hasSingleWrapper ? section.children[0] : section;
    effectivePath.forEach((index, depth) => {
      node = (node.children || [])[index] || node;
      const targetDepth = depth + 1;
      const isLeaf = targetDepth === effectivePath.length;
      const label = (node.number ? node.number + ' ' : '') + String(node.title || '').replace(/\s+Directory$/i, '').trim();

      addCrumb(
        label,
        () => {
          path = hasSingleWrapper
            ? [0, ...effectivePath.slice(0, targetDepth)]
            : effectivePath.slice(0, targetDepth);
          updateUrlState(true);
          renderExplorer();
        },
        isLeaf
      );
    });
  }

  function renderSearchBreadcrumb() {
    if (!breadcrumb) return;
    breadcrumb.replaceChildren();

    const c1 = el('li', 'breadcrumb-item');
    const a1 = el('a', 'breadcrumb-link', 'Home');
    a1.href = '../index.html';
    c1.append(a1);
    breadcrumb.append(c1);

    const c2 = el('li', 'breadcrumb-item');
    const b2 = el('button', 'breadcrumb-link', SUBPAGE_TITLE);
    b2.type = 'button';
    b2.addEventListener('click', () => openSection(0, true));
    c2.append(b2);
    breadcrumb.append(c2);

    const c3 = el('li', 'breadcrumb-item');
    c3.setAttribute('aria-current', 'page');
    const s3 = el('strong', 'breadcrumb-current', 'Search');
    s3.setAttribute('aria-current', 'page');
    c3.append(s3);
    breadcrumb.append(c3);
  }

  const recentSection = $('recent-section');
  const recentGrid = $('recent-grid');
  const clearRecent = $('clear-recent');
  const recentHistory = [];

  function renderRecent() {
    if (!recentGrid || !recentSection) return;
    recentGrid.replaceChildren();
    recentSection.hidden = recentHistory.length === 0;

    recentHistory.forEach(entry => {
      const button = el('button', 'recent-card');
      button.type = 'button';

      button.append(el('span', 'card-icon', '⏱'));
      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', entry.title));
      button.append(content);

      const arrow = el('span', 'card-arrow', '›');
      arrow.setAttribute('aria-hidden', 'true');
      button.append(arrow);

      button.addEventListener('click', () => {
        currentSection = entry.sectionIndex;
        path = [...entry.nodePath];
        search.value = '';
        clearSearch.hidden = true;
        updateUrlState(true);
        renderExplorer();
        closeMobileMenu();
      });

      recentGrid.append(button);
    });
  }

  function rememberCategory() {
    if (currentSection < 0 || path.length === 0) return;

    const node = currentNode();
    const key = currentSection + ':' + path.join('.');
    const existing = recentHistory.findIndex(entry => entry.key === key);

    if (existing !== -1) recentHistory.splice(existing, 1);

    recentHistory.unshift({
      key,
      title: (node.number ? node.number + ' ' : '') + node.title,
      sectionIndex: currentSection,
      nodePath: [...path]
    });

    if (recentHistory.length > 6) recentHistory.length = 6;
    renderRecent();
  }

  if (clearRecent) {
    clearRecent.addEventListener('click', () => {
      recentHistory.length = 0;
      renderRecent();
    });
  }

  const topSearchWrap = document.querySelector('.topbar .top-search');
  function setTopSearchVisible(visible) {
    if (topSearchWrap) topSearchWrap.hidden = !visible;
  }

  function entryText(entry) {
    if (typeof entry === 'string') return entry;
    return entry && entry.text ? String(entry.text) : '';
  }

  function plural(n, one, many) {
    return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
  }

  function findLiveJobsFor(query) {
    if (search) {
      search.value = query;
      if (clearSearch) clearSearch.hidden = String(query || '').length === 0;
    }
    syncTopSearchToLiveJobs(query);
    const liveSection = $('live-jobs-section');
    if (liveSection && typeof liveSection.scrollIntoView === 'function') {
      liveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function buildEntryRow(text) {
    const row = el('div', 'explorer-entry');
    const link = el('a', 'explorer-entry-link', text);
    link.href = `/jobs-careers/?q=${encodeURIComponent(text)}`;
    link.title = 'Find live notices related to this entry';
    link.addEventListener('click', event => {
      event.preventDefault();
      findLiveJobsFor(text);
    });
    row.appendChild(link);

    const bmId = 'job-' + text.substring(0, 32).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const bmBtn = el('button', 'cso-bookmark-btn');
    bmBtn.type = 'button';
    bmBtn.dataset.bookmarkType = 'jobs';
    bmBtn.dataset.bookmarkId = bmId;
    bmBtn.dataset.bookmarkTitle = text;
    bmBtn.dataset.bookmarkBadge = 'Jobs & Careers';
    bmBtn.dataset.bookmarkUrl = window.location.href;
    bmBtn.title = 'Save this entry';
    const star = el('span', 'cso-bm-star', '☆');
    star.setAttribute('aria-hidden', 'true');
    bmBtn.append(star, ' ', el('span', 'cso-bm-text', 'Bookmark'));
    row.appendChild(bmBtn);
    return row;
  }

  function buildAccordion(child, index, symbols) {
    const entries = (child.notes || []).map(entryText).filter(Boolean);
    const details = el('details', 'explorer-item explorer-accordion');
    const summary = el('summary', 'explorer-accordion-summary');
    summary.append(el('span', 'card-icon', symbols[index % symbols.length]));
    const content = el('div', 'card-content');
    content.append(el('span', 'card-title', (child.number ? child.number + ' ' : '') + child.title));
    summary.append(content);
    const arrow = el('span', 'card-arrow', '›');
    arrow.setAttribute('aria-hidden', 'true');
    summary.append(arrow);
    details.append(summary);
    const body = el('div', 'explorer-accordion-body');
    entries.forEach(text => body.appendChild(buildEntryRow(text)));
    details.append(body);
    return details;
  }

  function openSection(index, pushHistory = true) {
    const targetIdx = (index < 0 || index >= sections.length) ? 0 : index;
    currentSection = targetIdx;
    path = isSingleWrapperSection(targetIdx) ? [0] : [];
    selectedL3Slug = '';

    if (search) search.value = '';
    if (clearSearch) clearSearch.hidden = true;
    renderExplorer();
    if (pushHistory) {
      updateUrlState(true);
    }
    closeMobileMenu();
  }

  function currentNode() {
    let node = sections[currentSection];
    for (const index of path) {
      node = node.children[index];
    }
    return node;
  }

  function renderCategoryPagePanel(sectionSlug) {
    const dataApi = window.CSO_JOBS_DIRECTORY_DATA;
    if (!dataApi || typeof dataApi.getItemsBySection !== 'function') return null;
    const secInfo = typeof dataApi.getSectionBySlug === 'function' ? dataApi.getSectionBySlug(sectionSlug) : null;
    const items = dataApi.getItemsBySection(sectionSlug);
    if (!items.length) return null;

    const panel = el('section', 'cso-cat-panel');
    panel.setAttribute('aria-label', `${secInfo ? secInfo.title : sectionSlug} visual summary and pages`);

    const head = el('div', 'cso-cat-panel__head');
    head.appendChild(el('h3', '', `${secInfo ? secInfo.icon + ' ' + secInfo.title : sectionSlug} — Dedicated Dossier Pages`));
    head.appendChild(el('span', 'live-count-badge', `${items.length} Verified Pages`));
    panel.appendChild(head);

    if (secInfo && secInfo.description) {
      panel.appendChild(el('p', 'cso-cat-panel__sub', secInfo.description));
    }

    // Category-specific pure-SVG summary graph
    const chartRows = items.slice(0, 6);
    const maxVac = Math.max(1, ...chartRows.map(i => Number(i.vacancies) || 1));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 640 ' + String(18 + chartRows.length * 26));
    svg.setAttribute('class', 'cso-cat-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${secInfo ? secInfo.title : sectionSlug} summary chart`);
    chartRows.forEach((item, idx) => {
      const y = 10 + idx * 26;
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', '4');
      lbl.setAttribute('y', String(y + 14));
      lbl.setAttribute('class', 'cso-ov-svg__label');
      lbl.textContent = String(item.title || '').slice(0, 26) + (String(item.title || '').length > 26 ? '…' : '');
      svg.appendChild(lbl);

      const track = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      track.setAttribute('x', '210');
      track.setAttribute('y', String(y + 2));
      track.setAttribute('width', '330');
      track.setAttribute('height', '15');
      track.setAttribute('rx', '6');
      track.setAttribute('class', 'cso-ov-svg__track');
      svg.appendChild(track);

      const valNum = Number(item.vacancies) || 1;
      const barW = Math.max(12, Math.round((valNum / maxVac) * 330));
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', '210');
      bar.setAttribute('y', String(y + 2));
      bar.setAttribute('width', String(barW));
      bar.setAttribute('height', '15');
      bar.setAttribute('rx', '6');
      bar.setAttribute('class', 'cso-ov-svg__bar');
      svg.appendChild(bar);

      const valTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valTxt.setAttribute('x', '550');
      valTxt.setAttribute('y', String(y + 14));
      valTxt.setAttribute('class', 'cso-ov-svg__val');
      valTxt.textContent = valNum.toLocaleString('en-IN');
      svg.appendChild(valTxt);
    });
    panel.appendChild(svg);

    // Filter pills
    const stages = ['All'];
    items.forEach(it => {
      const lbl = it.stage_label || it.category || '';
      if (lbl && !stages.includes(lbl)) stages.push(lbl);
    });

    let activeFilter = 'All';
    const filterBar = el('div', 'cso-cat-filters');
    filterBar.setAttribute('role', 'group');
    filterBar.setAttribute('aria-label', 'Filter category entries');

    const cardsGrid = el('div', 'cso-cat-cards');

    function renderCards() {
      cardsGrid.replaceChildren();
      const filtered = activeFilter === 'All'
        ? items
        : items.filter(it => (it.stage_label || it.category || '') === activeFilter);
      filtered.forEach(it => {
        const a = el('a', 'cso-cat-card');
        a.href = `/jobs-careers/detail/${encodeURIComponent(it.slug)}`;
        a.appendChild(el('span', 'live-badge live-badge--org', `${it.stage_label || 'Active'} · ${it.organisation || ''}`));
        a.appendChild(el('strong', 'cso-cat-card__title', it.title));
        if (it.title_or) a.appendChild(el('span', 'cso-cat-card__odia', it.title_or));
        a.appendChild(el('span', 'cso-cat-card__meta', `${it.qualification || 'Check Details'} · Open Visual Dossier →`));
        cardsGrid.appendChild(a);
      });
    }

    stages.forEach(st => {
      const pill = el('button', 'cso-cat-pill' + (st === 'All' ? ' is-active' : ''), st);
      pill.type = 'button';
      pill.setAttribute('aria-pressed', st === 'All' ? 'true' : 'false');
      pill.addEventListener('click', () => {
        activeFilter = st;
        filterBar.querySelectorAll('.cso-cat-pill').forEach(b => {
          const on = b.textContent === st;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        renderCards();
      });
      filterBar.appendChild(pill);
    });

    panel.appendChild(filterBar);
    renderCards();
    panel.appendChild(cardsGrid);
    return panel;
  }

  function collectBranchesUnder(targetNode, baseL1, baseL2, sectionSlug, out = [], limit = 200) {
    if (!targetNode || out.length >= limit) return out;
    const dataApi = window.CSO_JOBS_DIRECTORY_DATA;
    const cleanTitle = String(targetNode.title || '').replace(/\s+Directory$/i, '').trim();
    const subtitleLabel = (targetNode.number ? targetNode.number + ' ' : '') + cleanTitle;
    const notes = (targetNode.notes || []).map(entryText).filter(Boolean);
    for (const text of notes) {
      if (out.length >= limit) break;
      const bSlug = dataApi && typeof dataApi.slugifyBranch === 'function'
        ? dataApi.slugifyBranch(text)
        : slugify(text);
      const portalUrl = dataApi && typeof dataApi.inferPortalForBranch === 'function'
        ? dataApi.inferPortalForBranch(text + ' ' + cleanTitle, sectionSlug)
        : 'https://odisha.gov.in/';
      out.push({
        text,
        slug: bSlug,
        l1: baseL1,
        l2: baseL2,
        subtitle: subtitleLabel,
        sectionSlug,
        portalUrl
      });
    }
    for (const child of targetNode.children || []) {
      if (out.length >= limit) break;
      const childCode = getNodeCode(child);
      const nextL1 = baseL1 || childCode;
      const nextL2 = baseL1 ? (baseL2 || childCode) : '';
      collectBranchesUnder(child, nextL1, nextL2, sectionSlug, out, limit);
    }
    return out;
  }

  function renderTopCategorySelector() {
    const host = document.getElementById('cso-top-category-selector');
    if (!host || currentSection < 0 || currentSection >= sections.length) return;
    host.replaceChildren();

    const section = sections[currentSection];
    const hasSingleWrapper = isSingleWrapperSection(currentSection);
    const rootNode = hasSingleWrapper ? section.children[0] : section;
    const l1Nodes = (rootNode.children || []).filter(c => (c.children || []).length || countNotes([c]) > 0);
    const codes = getEffectiveLayerCodes();

    // 1. Main Category (#cso-select-l1)
    const f1 = el('div', 'cso-top-selector__field');
    const lbl1 = el('label', 'cso-top-selector__label', '1. Main Category');
    lbl1.setAttribute('for', 'cso-select-l1');
    const sel1 = el('select', 'cso-top-selector__select');
    sel1.id = 'cso-select-l1';
    sel1.setAttribute('aria-label', 'Select Main Category');
    const optAll1 = el('option', '', 'All Categories');
    optAll1.value = '';
    sel1.append(optAll1);
    l1Nodes.forEach(n1 => {
      const code = getNodeCode(n1);
      const opt = el('option', '', (n1.number ? n1.number + ' ' : '') + n1.title);
      opt.value = code;
      if (codes.l1 === code) opt.selected = true;
      sel1.append(opt);
    });
    sel1.addEventListener('change', () => {
      const val = sel1.value;
      path = hasSingleWrapper ? [0] : [];
      if (val) {
        const i1 = findChildIndexByCode(rootNode.children, val);
        if (i1 !== -1) path.push(i1);
      }
      selectedL3Slug = '';
      updateUrlState(true);
      renderExplorer();
      if (typeof loadLiveJobs === 'function') loadLiveJobs();
    });
    f1.append(lbl1, sel1);
    host.append(f1);

    // 2. Subcategory (#cso-select-l2)
    const f2 = el('div', 'cso-top-selector__field');
    const lbl2 = el('label', 'cso-top-selector__label', '2. Subcategory');
    lbl2.setAttribute('for', 'cso-select-l2');
    const sel2 = el('select', 'cso-top-selector__select');
    sel2.id = 'cso-select-l2';
    sel2.setAttribute('aria-label', 'Select Subcategory');
    const optAll2 = el('option', '', 'All Subcategories');
    optAll2.value = '';
    sel2.append(optAll2);

    const activeL1Idx = codes.l1 ? findChildIndexByCode(rootNode.children, codes.l1) : -1;
    const activeL1Node = activeL1Idx !== -1 ? rootNode.children[activeL1Idx] : null;
    const l2Nodes = activeL1Node ? (activeL1Node.children || []).filter(c => (c.children || []).length || countNotes([c]) > 0) : [];
    l2Nodes.forEach(n2 => {
      const code2 = getNodeCode(n2);
      const opt = el('option', '', (n2.number ? n2.number + ' ' : '') + n2.title);
      opt.value = code2;
      if (codes.l2 === code2) opt.selected = true;
      sel2.append(opt);
    });
    if (!l2Nodes.length) sel2.disabled = true;
    sel2.addEventListener('change', () => {
      if (activeL1Idx === -1) return;
      path = hasSingleWrapper ? [0, activeL1Idx] : [activeL1Idx];
      if (sel2.value) {
        const i2 = findChildIndexByCode(activeL1Node.children, sel2.value);
        if (i2 !== -1) path.push(i2);
      }
      selectedL3Slug = '';
      updateUrlState(true);
      renderExplorer();
      if (typeof loadLiveJobs === 'function') loadLiveJobs();
    });
    f2.append(lbl2, sel2);
    host.append(f2);

    // 3. Branch / Track (#cso-select-l3)
    const f3 = el('div', 'cso-top-selector__field');
    const lbl3 = el('label', 'cso-top-selector__label', '3. Branch / Track');
    lbl3.setAttribute('for', 'cso-select-l3');
    const sel3 = el('select', 'cso-top-selector__select');
    sel3.id = 'cso-select-l3';
    sel3.setAttribute('aria-label', 'Select Branch or Track');
    const optAll3 = el('option', '', 'All Branches in Subcategory');
    optAll3.value = '';
    sel3.append(optAll3);

    const branchSourceNode = codes.l2 && activeL1Node
      ? (activeL1Node.children[findChildIndexByCode(activeL1Node.children, codes.l2)] || activeL1Node)
      : (activeL1Node || rootNode);
    const l3Options = collectBranchesUnder(branchSourceNode, codes.l1, codes.l2, codes.sectionSlug, [], 150);
    l3Options.forEach(br => {
      const opt = el('option', '', br.text);
      opt.value = br.slug;
      if (selectedL3Slug === br.slug) opt.selected = true;
      sel3.append(opt);
    });
    sel3.addEventListener('change', () => {
      selectedL3Slug = sel3.value || '';
      updateUrlState(true);
      renderExplorer();
      if (typeof loadLiveJobs === 'function') loadLiveJobs();
    });
    f3.append(lbl3, sel3);
    host.append(f3);

    // 4. Action Buttons (Reset + ★ Saved Bookmarks)
    const actions = el('div', 'cso-top-selector__actions');
    const resetBtn = el('button', 'live-btn', 'Reset');
    resetBtn.id = 'cso-select-reset';
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => {
      path = hasSingleWrapper ? [0] : [];
      selectedL3Slug = '';
      if (typeof liveState !== 'undefined') liveState.bookmarksOnly = false;
      updateBookmarksPillUI();
      updateUrlState(true);
      renderExplorer();
      if (typeof loadLiveJobs === 'function') loadLiveJobs();
    });

    const bmCount = loadBookmarkedTracks().length;
    const bmOn = Boolean(typeof liveState !== 'undefined' && liveState.bookmarksOnly);
    const bmBtn = el('button', 'live-chip live-chip--bookmarks' + (bmOn ? ' is-active' : ''), `★ Saved Bookmarks (${bmCount})`);
    bmBtn.id = 'cso-selector-bookmarks-toggle';
    bmBtn.type = 'button';
    bmBtn.setAttribute('aria-pressed', String(bmOn));
    bmBtn.addEventListener('click', () => {
      if (typeof liveState !== 'undefined') liveState.bookmarksOnly = !liveState.bookmarksOnly;
      updateBookmarksPillUI();
      renderExplorer();
      if (typeof loadLiveJobs === 'function') loadLiveJobs();
    });

    actions.append(resetBtn, bmBtn);
    host.append(actions);
  }

  let cachedLiveJobsForSections = null;

  function renderMatchingLiveNotices(sourceItems) {
    const host = document.getElementById('cso-matching-live-notices');
    if (!host || currentSection < 0) return;
    if (Array.isArray(sourceItems)) cachedLiveJobsForSections = sourceItems;

    const codes = getEffectiveLayerCodes();
    const list = Array.isArray(cachedLiveJobsForSections) ? cachedLiveJobsForSections : [];

    let matched = [];
    if (codes.sectionSlug === 'jobs-recruitment') {
      matched = list.filter(job => {
        const br = classifyJobToBranch(job);
        if (br.sectionSlug && br.sectionSlug !== codes.sectionSlug) return false;
        if (selectedL3Slug && br.l3 && br.l3 === selectedL3Slug) return true;
        if (codes.l2 && br.l2 !== codes.l2) return false;
        if (codes.l1 && br.l1 !== codes.l1) return false;
        return true;
      });
    } else if (codes.l1 || codes.l2 || selectedL3Slug) {
      const kw = [codes.l1, codes.l2, selectedL3Slug].filter(Boolean).join(' ').toLowerCase().replace(/[-.]+/g, ' ');
      const tokens = kw.split(/\s+/).filter(w => w.length > 2);
      matched = list.filter(job => {
        if (job.section_slug === codes.sectionSlug) {
          if (codes.l2 && job.l2_code && job.l2_code !== codes.l2) return false;
          if (codes.l1 && job.l1_code && job.l1_code !== codes.l1) return false;
          return true;
        }
        const hay = [job.title, job.category, job.organisation, job.summary].join(' ').toLowerCase();
        return tokens.some(t => hay.includes(t));
      });
    }

    if (typeof liveState !== 'undefined' && liveState.bookmarksOnly) {
      const bmSlugs = new Set(loadBookmarkedTracks().map(t => t.slug));
      matched = matched.filter(job => bmSlugs.has(job.slug || job.id));
    }

    host.replaceChildren();
    const head = el('div', 'cso-matching-live-notices__head');
    head.append(el('h3', '', 'Matching Live Recruitment Notices'));
    head.append(el('span', 'live-count-badge', `${matched.length} Matching`));
    host.append(head);

    if (matched.length) {
      const gridWrap = el('div', 'live-jobs-grid');
      matched.slice(0, 6).forEach(job => {
        if (typeof renderJobCard === 'function') gridWrap.append(renderJobCard(job));
      });
      host.append(gridWrap);
    } else {
      host.append(el('p', 'cso-matching-live-notices__empty', 'No live D1 recruitment notices currently match this specific category/branch selection.'));
    }
  }

  function renderExplorer() {
    setTopSearchVisible(true);
    if (document.body) document.body.classList.add('cso-section-view');
    const node = currentNode();
    rememberCategory();

    searchResults.hidden = true;
    explorer.hidden = false;

    const cleanTitle = node.title
      .replace(/\s+Directory$/i, '')
      .trim();

    if (pageTitle) pageTitle.textContent = cleanTitle;
    if (explorerTitle) explorerTitle.textContent = '';
    if (pageDescription) pageDescription.textContent = '';
    renderBreadcrumb();
    setActiveSidebar();
    updateDocumentTitle(cleanTitle);

    const codes = getEffectiveLayerCodes();
    explorer.dataset.sectionSlug = codes.sectionSlug || '';
    renderTopCategorySelector();

    explorerItems.replaceChildren();

    let branches = collectBranchesUnder(node, codes.l1, codes.l2, codes.sectionSlug, [], 60);
    if (selectedL3Slug) {
      branches = branches.filter(b => b.slug === selectedL3Slug);
    }
    if (typeof liveState !== 'undefined' && liveState.bookmarksOnly) {
      const bmSlugs = new Set(loadBookmarkedTracks().map(t => t.slug));
      branches = branches.filter(b => bmSlugs.has(b.slug));
    }

    if (explorerDescription) {
      explorerDescription.textContent = branches.length
        ? plural(branches.length, 'branch', 'branches') + ' available'
        : 'No matching branches for the current filter.';
    }

    if (branches.length) {
      const branchGrid = el('div', 'cso-branch-grid');
      branches.forEach(br => {
        const card = el('article', 'cso-branch-card');
        card.append(el('span', 'cso-branch-card__sub', br.subtitle));
        card.append(el('h3', 'cso-branch-card__title', br.text));

        const actions = el('div', 'cso-branch-card__actions');

        const qs = new URLSearchParams();
        if (br.sectionSlug) qs.set('section', br.sectionSlug);
        if (br.l1) qs.set('l1', br.l1);
        if (br.l2) qs.set('l2', br.l2);
        const dossierLink = el('a', 'live-btn live-btn--primary', 'View Full Details & Graphs →');
        dossierLink.href = `/jobs-careers/detail/${encodeURIComponent(br.slug)}` + (qs.toString() ? `?${qs.toString()}` : '');
        actions.append(dossierLink);

        const portalA = el('a', 'live-btn', 'Official Portal ↗');
        portalA.href = br.portalUrl;
        portalA.target = '_blank';
        portalA.rel = 'noopener noreferrer';
        actions.append(portalA);

        const bookmarked = isTrackBookmarked(br.slug);
        const bmBtn = el('button', 'live-btn cso-branch-bm', bookmarked ? '★ Bookmarked' : '☆ Bookmark');
        bmBtn.type = 'button';
        bmBtn.setAttribute('aria-pressed', String(bookmarked));
        bmBtn.addEventListener('click', () => {
          const nowSaved = toggleTrackBookmark({
            slug: br.slug,
            title: br.text,
            subtitle: br.subtitle,
            l1: br.l1,
            l2: br.l2,
            sectionSlug: br.sectionSlug
          });
          bmBtn.setAttribute('aria-pressed', String(nowSaved));
          bmBtn.textContent = nowSaved ? '★ Bookmarked' : '☆ Bookmark';
        });
        actions.append(bmBtn);

        card.append(actions);
        branchGrid.append(card);
      });
      explorerItems.append(branchGrid);
    } else {
      explorerItems.append(el('p', '', 'No branches match the current selection. Click Reset to view all branches.'));
    }

    if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
      window.CSOBookmarks.updateUI();
    }

    renderMatchingLiveNotices();

    const hasSingleWrapper = isSingleWrapperSection(currentSection);
    const isAtSectionRoot = path.length === 0 || (hasSingleWrapper && path.length === 1 && path[0] === 0);

    if (backButton) {
      backButton.textContent = !isAtSectionRoot
        ? '← Previous level'
        : '← All sections';
    }

    setActiveSidebar();
  }

  function searchNode(node, query, trail, results, sectionIndex, nodePath) {
    const title = (node.number ? node.number + ' ' : '') + node.title;
    const currentTrail = [...trail, title];

    if (title.toLowerCase().includes(query)) {
      results.push({
        label: title,
        trail: currentTrail.join(' / '),
        sectionIndex,
        nodePath: [...nodePath]
      });
    }

    for (const note of node.notes || []) {
      if (note.text.toLowerCase().includes(query)) {
        results.push({
          label: note.text,
          trail: currentTrail.join(' / '),
          sectionIndex,
          nodePath: [...nodePath]
        });
      }
    }

    (node.children || []).forEach((child, index) => {
      searchNode(
        child, query, currentTrail, results,
        sectionIndex, [...nodePath, index]
      );
    });
  }

  function openSearchResult(result) {
    currentSection = result.sectionIndex;
    path = [...result.nodePath];
    search.value = '';
    clearSearch.hidden = true;
    updateUrlState(true);
    renderExplorer();
    closeMobileMenu();
  }

  function syncTopSearchToLiveJobs(rawQuery) {
    if (typeof loadLiveJobs !== 'function') return;
    const nextQ = String(rawQuery || '').trim();
    if (liveState.q === nextQ) return;
    clearTimeout(liveSearchTimer);
    liveSearchTimer = setTimeout(() => {
      liveState.q = nextQ;
      liveState.page = 1;
      closeJobDetail(false);
      loadLiveJobs();
    }, 220);
  }

  function renderSearch() {
    const query = search.value.trim().toLowerCase();
    clearSearch.hidden = search.value.length === 0;
    syncTopSearchToLiveJobs(search.value);

    if (!query) {
      if (currentSection >= 0) renderExplorer();
      else openSection(0, false);
      return;
    }

    setTopSearchVisible(true);
    explorer.hidden = true;
    searchResults.hidden = false;

    if (pageTitle) pageTitle.textContent = 'Search Jobs & Careers';
    if (pageDescription) pageDescription.textContent = `Results for "${search.value.trim()}"`;
    renderSearchBreadcrumb();
    updateDocumentTitle(`Search: ${search.value.trim()}`);

    const results = [];

    sections.forEach((section, sectionIndex) => {
      if (section.title.toLowerCase().includes(query)) {
        results.push({
          label: section.title,
          trail: 'Main section',
          sectionIndex,
          nodePath: []
        });
      }

      section.children.forEach((node, index) => {
        searchNode(
          node, query, [section.title], results,
          sectionIndex, [index]
        );
      });
    });

    searchItems.replaceChildren();
    searchStatus.textContent = `${results.length} matching entries found`;

    results.slice(0, 200).forEach(result => {
      const item = el('button', 'explorer-item');
      item.type = 'button';

      item.append(el('span', 'card-icon', '🔎'));

      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', result.label));
      content.append(el('span', 'card-meta', result.trail));
      item.append(content);

      const arrow = el('span', 'card-arrow', '›');
      arrow.setAttribute('aria-hidden', 'true');
      item.append(arrow);

      item.addEventListener('click', () => openSearchResult(result));

      searchItems.append(item);
    });

    if (results.length > 200) {
      searchItems.append(
        el('p', '', 'Showing the first 200 results. Refine your search.')
      );
    }

    if (!results.length) {
      searchItems.append(el('p', '', 'No matching entries found.'));
    }
  }

  function buildDashboard() {
    if (sectionsNav) {
      sectionsNav.replaceChildren();
    }

    sections.forEach((section, index) => {
      const secSlug = getSectionSlug(section);
      const secHref = `/jobs-careers/${secSlug}`;
      if (sectionsNav) {
        const navLink = el('a', 'side-link');
        navLink.href = secHref;
        navLink.dataset.sectionIndex = String(index);
        navLink.dataset.sectionSlug = secSlug;
        navLink.append(el('span', 'side-icon', icons[index % icons.length]));
        navLink.append(el('span', 'side-title', section.title));
        const sideArrow = el('span', 'side-arrow', '›');
        sideArrow.setAttribute('aria-hidden', 'true');
        navLink.append(sideArrow);
        navLink.addEventListener('click', (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
          e.preventDefault();
          openSection(index, true);
        });
        sectionsNav.append(navLink);
      }
    });
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      const hasSingleWrapper = isSingleWrapperSection(currentSection);
      const isAtSectionRoot = path.length === 0 || (hasSingleWrapper && path.length === 1 && path[0] === 0);

      if (!isAtSectionRoot && path.length > 0) {
        path.pop();
        updateUrlState(true);
        renderExplorer();
        if (typeof loadLiveJobs === 'function') loadLiveJobs();
      } else {
        openSection(0, true);
      }
    });
  }

  const backdrop = ensureDrawerBackdrop();
  backdrop.addEventListener('click', closeMobileMenu);

  const sidebarClose = document.getElementById('sidebar-close');
  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeMobileMenu);
  }

  const SIDEBAR_PREF_KEY = 'cso_jobs_sidebar_collapsed';
  const sidebarToggleBtn = document.getElementById('cso-sidebar-toggle');
  const sidebarToggleTopBtn = document.getElementById('cso-sidebar-toggle-top');

  function applyDesktopSidebarState(collapsed) {
    document.body.classList.toggle('cso-sidebar-collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const expanded = String(!collapsed);
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', expanded);
      menuToggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
    }
    if (sidebarToggleBtn) {
      sidebarToggleBtn.setAttribute('aria-expanded', expanded);
      sidebarToggleBtn.textContent = collapsed ? '▶' : '◀';
    }
    if (sidebarToggleTopBtn) sidebarToggleTopBtn.setAttribute('aria-expanded', expanded);
  }

  function toggleDesktopSidebar() {
    if (window.matchMedia('(max-width: 768px)').matches) {
      if (document.body.classList.contains('menu-open')) closeMobileMenu();
      else openMobileMenu();
    } else {
      const next = !document.body.classList.contains('cso-sidebar-collapsed');
      applyDesktopSidebarState(next);
      try { localStorage.setItem(SIDEBAR_PREF_KEY, next ? '1' : '0'); } catch {}
    }
  }

  try {
    if (!window.matchMedia('(max-width: 768px)').matches && localStorage.getItem(SIDEBAR_PREF_KEY) === '1') {
      applyDesktopSidebarState(true);
    }
  } catch {}

  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleDesktopSidebar);
  if (sidebarToggleTopBtn) sidebarToggleTopBtn.addEventListener('click', toggleDesktopSidebar);
  if (menuToggle) menuToggle.addEventListener('click', toggleDesktopSidebar);

  search.addEventListener('input', renderSearch);

  clearSearch.addEventListener('click', () => {
    search.value = '';
    clearSearch.hidden = true;
    syncTopSearchToLiveJobs('');
    showOverview();
    search.focus();
  });

  document.addEventListener('keydown', event => {
    // 1. Ctrl + K or Cmd + K search shortcut
    if ((event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      search.focus();
      search.select();
      return;
    }

    // 2. '/' shortcut when not in editable input
    const active = document.activeElement;
    const isEditable = active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable
    );
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditable) {
      event.preventDefault();
      search.focus();
      search.select();
      return;
    }

    if (event.key === 'Escape') {
      if (document.body.classList.contains('menu-open')) {
        event.preventDefault();
        closeMobileMenu();
        return;
      }
      if (search.value) {
        search.value = '';
        clearSearch.hidden = true;
        showOverview();
        search.blur();
      }
    }

    if (event.key === 'Tab' && document.body.classList.contains('menu-open') && sidebar) {
      const focusables = getSidebarFocusables();
      if (!focusables.length) return;

      const firstFocusable = focusables[0];
      const lastFocusable = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable || !sidebar.contains(document.activeElement)) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable || !sidebar.contains(document.activeElement)) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  });

  const mql = window.matchMedia('(min-width: 769px)');
  if (mql && mql.addEventListener) {
    mql.addEventListener('change', e => {
      if (e.matches && document.body.classList.contains('menu-open')) {
        closeMobileMenu();
      }
    });
  }

  function syncFromUrl(pushHistory = false) {
    if (!sections || !sections.length) return;

    const params = new URLSearchParams(window.location.search);
    const pathMatch = String(window.location.pathname || '').match(/^\/jobs-careers\/([a-z0-9-]+)\/?$/i);
    const pathSection = pathMatch && pathMatch[1] !== 'detail' && pathMatch[1] !== 'index.html' ? pathMatch[1] : '';
    const requestedSection = pathSection || params.get('section');

    if (requestedSection !== null && requestedSection !== '') {
      const idx = resolveSectionIndex(requestedSection);
      if (idx !== -1 && idx < sections.length) {
        currentSection = idx;
        path = [];

        const hasSingleWrapper = isSingleWrapperSection(idx);
        const reqL1 = (params.get('l1') || '').trim();
        const reqL2 = (params.get('l2') || '').trim();
        const reqL3 = (params.get('l3') || '').trim();
        const requestedPath = params.get('path');
        selectedL3Slug = reqL3;

        if (hasSingleWrapper) {
          path = [0];
        }

        if (reqL1) {
          const rootNode = hasSingleWrapper ? sections[currentSection].children[0] : sections[currentSection];
          const i1 = findChildIndexByCode(rootNode.children, reqL1);
          if (i1 !== -1) {
            path.push(i1);
            if (reqL2) {
              const l1Node = rootNode.children[i1];
              const i2 = findChildIndexByCode(l1Node.children, reqL2);
              if (i2 !== -1) path.push(i2);
            }
          }
        } else if (requestedPath !== null) {
          const parts = requestedPath.split('.');
          if (
            parts.length > 0 &&
            parts.length <= 30 &&
            parts.every(part => /^(0|[1-9][0-9]*)$/.test(part))
          ) {
            const indexes = parts.map(Number);
            let node = sections[currentSection];
            let valid = true;
            for (const pIdx of indexes) {
              if (!Array.isArray(node.children) || pIdx >= node.children.length) {
                valid = false;
                break;
              }
              node = node.children[pIdx];
            }
            if (valid) {
              path = indexes;
            }
          }
        }

        search.value = '';
        clearSearch.hidden = true;
        renderExplorer();
        updateUrlState(false, true);
        closeMobileMenu();
        if (typeof loadLiveJobs === 'function') loadLiveJobs();
        return;
      }
    }

    // Default directly to 💼 Jobs & Recruitment (section 0) when visiting /jobs-careers/
    const defaultSectionIdx = 0;
    currentSection = defaultSectionIdx;
    const hasSingleWrapper = isSingleWrapperSection(defaultSectionIdx);
    path = hasSingleWrapper ? [0] : [];
    const reqL1 = (params.get('l1') || '').trim();
    const reqL2 = (params.get('l2') || '').trim();
    selectedL3Slug = (params.get('l3') || '').trim();
    if (reqL1 && sections[defaultSectionIdx]) {
      const rootNode = hasSingleWrapper ? sections[defaultSectionIdx].children[0] : sections[defaultSectionIdx];
      const i1 = findChildIndexByCode(rootNode.children, reqL1);
      if (i1 !== -1) {
        path.push(i1);
        if (reqL2) {
          const i2 = findChildIndexByCode(rootNode.children[i1].children, reqL2);
          if (i2 !== -1) path.push(i2);
        }
      }
    }
    if (search) search.value = '';
    if (clearSearch) clearSearch.hidden = true;
    renderExplorer();
    closeMobileMenu();
  }

  window.addEventListener('popstate', () => {
    syncFromUrl(false);
  });

  const brandLink = sidebar ? sidebar.querySelector('.brand') : null;
  if (brandLink) {
    brandLink.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      openSection(0, true);
    });
  }

  function nodeToExplorer(node) {
    const children = (node.children || []).filter(c => c.active !== false && c.status !== "Draft").map(nodeToExplorer);
    return {
      number: node.number || node.syllabusCode || undefined,
      title: node.title,
      titleOdia: node.titleOdia || undefined,
      slug: node.slug,
      description: node.description || node.articleTitle || undefined,
      officialUrl: node.officialUrl || undefined,
      mirrorUrl: node.mirrorUrl || undefined,
      children: children,
      notes: node.contentBody ? [node.contentBody] : []
    };
  }

  function loadSuperStoreTree() {
    try {
      const raw = localStorage.getItem('cso_jobs_master_tree_config');
      if (!raw) return null;
      const cfg = JSON.parse(raw);
      const categories = cfg.categories || cfg.items || [];
      if (!Array.isArray(categories) || categories.length !== 8) return null;
      return categories.map(cat => ({
        number: cat.code || cat.number,
        title: cat.title,
        children: (cat.nodes || []).filter(n => n.active !== false && n.status !== "Draft").map(nodeToExplorer),
        notes: []
      }));
    } catch (_) {
      return null;
    }
  }

  function renderEmptyDirectoryState() {
    if (sectionsNav) {
      sectionsNav.replaceChildren();
      const emptyNav = el('div', 'cso-empty-state', 'No items published yet — add categories or content in Admin Studio.');
      sectionsNav.appendChild(emptyNav);
    }
    if (loadStatus) {
      loadStatus.hidden = false;
      loadStatus.textContent = 'No items published yet — add categories or content in Admin Studio.';
    }
  }

  async function fetchNavSubcategoriesForPillar(pillarSlug) {
    try {
      const res = await fetch('/api/nav/config', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      const cats = Array.isArray(data && data.categories) ? data.categories : [];
      const pillar = cats.find(c => c.slug === pillarSlug || c.target_portal === pillarSlug);
      const subs = pillar && Array.isArray(pillar.subcategories) ? pillar.subcategories : [];
      return subs.map((s, idx) => ({
        id: s.id || ('nav-' + idx),
        number: String(idx + 1),
        title: s.name_en || s.slug || 'Category',
        title_or: s.name_or || '',
        description: s.description_en || '',
        url: s.landing_url || '',
        children: [],
        notes: []
      }));
    } catch {
      return [];
    }
  }

  function tryFetch() {
    Promise.all([
      fetch('/api/content/jobs-directory', { credentials: 'same-origin', cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
      fetchNavSubcategoriesForPillar('jobs-careers')
    ])
      .then(([data, navSubs]) => {
        const dirSections = Array.isArray(data && data.sections) ? data.sections : [];
        sections = dirSections.length ? dirSections : navSubs;
        if (!sections.length) {
          renderEmptyDirectoryState();
          return;
        }
        buildDashboard();
        syncFromUrl(false);
        if (loadStatus) {
          loadStatus.hidden = true;
        }
      })
      .catch(() => {
        sections = [];
        renderEmptyDirectoryState();
      });
  }

  tryFetch();

  // =========================================================================
  // Live Recruitment & Job Notifications (/api/content/jobs)
  // =========================================================================
  const liveCountEl = $('live-jobs-count');
  const liveStateEl = $('live-jobs-state');
  const liveCategoryEl = $('live-jobs-category');
  const liveDistrictEl = $('live-jobs-district');
  const liveDistrictBannerEl = $('live-jobs-district-banner');
  const liveMatchedToggleBtn = $('live-jobs-matched-toggle');
  const liveEditPrefsLink = $('live-jobs-edit-prefs');
  const liveResetBtn = $('live-jobs-reset');
  const liveStatusEl = $('live-jobs-status');
  const liveGridEl = $('live-jobs-grid');
  const livePaginationEl = $('live-jobs-pagination');
  const liveDetailModalEl = $('live-job-detail-modal');
  const liveDetailEl = $('live-job-detail');
  const liveDetailCloseBtn = $('live-job-detail-close');
  const liveDetailActionsEl = $('live-job-detail-actions');
  const liveDetailBadgesEl = $('live-job-detail-badges');
  const liveDetailTitleEl = $('live-job-detail-title');
  const liveDetailTitleOrEl = $('live-job-detail-title-or');
  const liveDetailMetaEl = $('live-job-detail-meta');
  const liveDetailSpecsEl = $('live-job-detail-specs');
  const liveDetailSyllabusEl = $('live-job-syllabus-box');
  const liveDetailSummaryEl = $('live-job-detail-summary');
  const liveDetailBodyEl = $('live-job-detail-body');
  const langToggleBtn = $('jc-lang-toggle');
  const heroSubEl = $('jc-hero-sub');
  if (langToggleBtn && heroSubEl) {
    let heroLang = 'bi';
    langToggleBtn.addEventListener('click', () => {
      heroLang = heroLang === 'or' ? 'en' : 'or';
      heroSubEl.textContent = heroLang === 'or'
        ? 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି (OPSC, OSSC, OSSSC, OPRB, OSEPA), କେନ୍ଦ୍ରୀୟ ଓ PSU ନିଯୁକ୍ତି, ବ୍ୟାଙ୍କିଂ ଏବଂ କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶିକା — ସମସ୍ତ ୮ଟି ଡୋମେନରେ ଯାଞ୍ଚ ହୋଇଥିବା ଯୋଗ୍ୟତା, ବେତନ ମ୍ୟାଟ୍ରିକ୍ସ ଓ ଅଫିସିଆଲ୍ ପୋର୍ଟାଲ୍।'
        : 'Odisha State & Central Government recruitments (OPSC, OSSC, OSSSC, OPRB, OSEPA), PSU jobs, banking, and career roadmaps — verified eligibility, pay matrix, selection stages, and official portals across all 8 domains.';
    });
  }

  const liveStagesWrap = $('live-jobs-stages');
  const liveChipsWrap = $('live-jobs-chips');
  const liveGoalToggleBtn = $('live-jobs-goal-toggle');
  const liveAuthHintEl = $('live-jobs-auth-hint');
  const liveAuthHintTextEl = $('live-jobs-auth-hint-text');

  const pc = window.CSOPublicContent;
  const knownCategories = new Set(['OPSC', 'OSSC', 'OSSSC', 'Teaching', 'Police & Defence', 'Banking & PSU', 'Railway']);
  let liveState = { page: 1, limit: 12, q: '', state: '', category: '', district: '', includeStateWide: true, chip: 'all', stage: 'all', goalMatch: false, matchedOnly: false, bookmarksOnly: false };
  let liveSearchTimer = null;
  let liveTaxonomy = [];
  let liveCandidateUser = null;
  let liveGoalExamIds = [];
  let liveGoalsLoaded = false;

  async function loadCandidateGoalsAndTaxonomy() {
    if (liveGoalsLoaded) return;
    liveGoalsLoaded = true;
    try {
      const taxPromise = fetch('/api/content/exam-taxonomy', { credentials: 'same-origin' })
        .then(r => (r.ok ? r.json() : { items: [] }))
        .catch(() => ({ items: [] }));
      const mePromise = fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null);
      const [taxRes, meRes] = await Promise.all([taxPromise, mePromise]);
      liveTaxonomy = Array.isArray(taxRes && taxRes.items) ? taxRes.items : [];
      if (meRes && meRes.authenticated && meRes.user) {
        liveCandidateUser = meRes.user;
      }
      if (meRes && Array.isArray(meRes.preferences && meRes.preferences.selectedExams)) {
        liveGoalExamIds = meRes.preferences.selectedExams;
      } else if (meRes && Array.isArray(meRes.controls && meRes.controls.assigned_exams)) {
        liveGoalExamIds = meRes.controls.assigned_exams;
      }
      if (!liveGoalExamIds.length && liveCandidateUser) {
        const prefRes = await fetch('/api/user/preferences', { credentials: 'same-origin' })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null);
        if (prefRes && Array.isArray(prefRes.selectedExams)) {
          liveGoalExamIds = prefRes.selectedExams;
        }
      }
      if (!liveGoalExamIds.length) {
        try {
          const localPrefs = JSON.parse(localStorage.getItem('cso_candidate_preferences_v1') || '{}');
          if (Array.isArray(localPrefs.selectedExams)) liveGoalExamIds = localPrefs.selectedExams;
        } catch (_) {}
      }
      if (!liveCandidateUser) {
        try {
          const sess = JSON.parse(localStorage.getItem('cso_candidate_session_v1') || 'null');
          if (sess && (sess.id || sess.email)) liveCandidateUser = sess;
        } catch (_) {}
      }
    } catch (_) {}
  }

  function showAuthHint(msg) {
    if (!liveAuthHintEl) return;
    if (liveAuthHintTextEl && msg) liveAuthHintTextEl.textContent = msg;
    liveAuthHintEl.hidden = false;
  }

  function jobSearchHaystack(job) {
    const tags = Array.isArray(job.tags) ? job.tags.join(' ') : '';
    return `${job.title || ''} ${job.summary || ''} ${job.organisation || ''} ${job.category || ''} ${job.state || ''} ${job.qualification || ''} ${tags}`.toLowerCase();
  }

  function matchesChipFilter(job, chip) {
    if (!chip || chip === 'all') return true;
    const hay = jobSearchHaystack(job);
    if (chip === 'opsc') return /\bopsc\b/.test(hay);
    if (chip === 'ossc') return /\b(ossc|osssc)\b/.test(hay);
    if (chip === 'police') {
      return /\b(police|constable|sub[-\s]?inspector|defen[cs]e|army|navy|air\s*force|fire|jail|excise|agniveer|paramilitary|crpf|bsf|cisf|itbp)\b/.test(hay);
    }
    if (chip === 'psc') {
      return /\b(opsc|ossc|osssc|oas|ocs|aso|peo|ri|ari|amin|sfs|forest)\b/.test(hay);
    }
    if (chip === 'teaching') {
      return /\b(teach|b\.?ed|ct|otet|osstet|cht|ltr|pgt|tgt|lecturer|education|ssb|riem|jt)\b/.test(hay);
    }
    if (chip === 'central-banking') {
      return String(job.state || '').toLowerCase() === 'central' || /\b(upsc|ssc|ibps|sbi|rbi|rrb|railway|bank|banking|defence|psu|central|cgl|chsl|mts)\b/.test(hay);
    }
    if (chip === 'admit-result') {
      return /\b(admit\s*card|hall\s*ticket|result|merit\s*list|score\s*card|cut\s*off|answer\s*key)\b/.test(hay);
    }
    return true;
  }

  function getActiveGoalTerms() {
    if (!liveGoalExamIds.length) return [];
    const terms = new Set();
    liveGoalExamIds.forEach(id => {
      terms.add(String(id).toLowerCase());
      const tax = liveTaxonomy.find(t => t.id === id);
      if (tax) {
        if (tax.short_code) terms.add(String(tax.short_code).toLowerCase());
        if (tax.exam_label) {
          String(tax.exam_label).toLowerCase().split(/[\s/&(),.-]+/).filter(w => w.length >= 3).forEach(w => terms.add(w));
        }
        (tax.parent_tags || []).forEach(tag => terms.add(String(tag).toLowerCase()));
      }
    });
    return Array.from(terms).filter(t => t.length >= 2);
  }

  function matchesGoalFilter(job) {
    const terms = getActiveGoalTerms();
    if (!terms.length) return true;
    const hay = jobSearchHaystack(job);
    return terms.some(term => hay.includes(term));
  }

  function matchJobToTaxonomy(job) {
    if (!liveTaxonomy.length) return null;
    const hay = jobSearchHaystack(job);
    let best = null;
    let bestScore = 0;
    liveTaxonomy.forEach(tax => {
      let score = 0;
      const code = String(tax.short_code || '').toLowerCase();
      if (code && hay.includes(code)) score += 5;
      if (tax.id && hay.includes(String(tax.id).toLowerCase().replace(/-/g, ' '))) score += 4;
      (tax.parent_tags || []).forEach(tag => {
        const tg = String(tag).toLowerCase();
        if (tg.length >= 2 && hay.includes(tg)) score += 2;
      });
      if (tax.domain_label && hay.includes(String(tax.domain_label).toLowerCase().split(' ')[0])) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = tax;
      }
    });
    return bestScore >= 2 ? best : null;
  }

  function formatDeadlineBadge(job) {
    if (job.status === 'expired' || job.expired) {
      const formatted = (job.last_date && pc && typeof pc.formatDate === 'function') ? pc.formatDate(job.last_date) : '';
      return {
        cls: 'cso-dl-closed',
        label: formatted ? `Application Closed (${formatted})` : 'Application Closed'
      };
    }
    if (job.last_date && pc && typeof pc.deadlineInfo === 'function') {
      const dl = pc.deadlineInfo(job.last_date);
      if (dl) {
        const formatted = pc.formatDate(job.last_date);
        if (dl.statusClass === 'cso-dl-urgent') {
          return {
            cls: 'cso-dl-urgent',
            label: dl.label.includes('Today') ? `Closing Soon · Today (${formatted})` : `Closing Soon · ${dl.label}`
          };
        }
        return { cls: dl.statusClass, label: dl.label };
      }
    }
    return null;
  }

  function syncCategoryDropdown(items) {
    if (!liveCategoryEl) return;
    let added = false;
    (items || []).forEach(item => {
      if (item.category && !knownCategories.has(item.category)) {
        knownCategories.add(item.category);
        added = true;
      }
    });
    if (liveCategoryEl.options.length <= 1 || added) {
      const current = liveCategoryEl.value;
      liveCategoryEl.replaceChildren(el('option', '', 'All Categories'));
      liveCategoryEl.options[0].value = '';
      Array.from(knownCategories).sort().forEach(cat => {
        const opt = el('option', '', cat);
        opt.value = cat;
        liveCategoryEl.appendChild(opt);
      });
      liveCategoryEl.value = current;
    }
  }

  function getJobStageInfo(job) {
    if (!job) return { stage: 'new-recruitment', label: 'New Recruitment', cls: 'live-badge--stage-new' };
    const raw = (job.stage || '').toLowerCase().trim();
    if (raw === 'admit-card' || raw === 'admit_card' || raw === 'admit card') {
      return { stage: 'admit-card', label: 'Admit Card', cls: 'live-badge--stage-admit' };
    }
    if (raw === 'answer-key' || raw === 'answer_key' || raw === 'answer key') {
      return { stage: 'answer-key', label: 'Answer Key', cls: 'live-badge--stage-key' };
    }
    if (raw === 'result' || raw === 'final-result' || raw === 'final result') {
      return { stage: 'result', label: 'Final Result', cls: 'live-badge--stage-result' };
    }
    if (raw === 'new-recruitment' || raw === 'new_recruitment' || raw === 'new recruitment') {
      return { stage: 'new-recruitment', label: 'New Recruitment', cls: 'live-badge--stage-new' };
    }
    const hay = [job.title || '', job.title_or || '', job.category || '', job.tags || ''].join(' ').toLowerCase();
    if (hay.includes('admit card') || hay.includes('hall ticket')) {
      return { stage: 'admit-card', label: 'Admit Card', cls: 'live-badge--stage-admit' };
    }
    if (hay.includes('answer key')) {
      return { stage: 'answer-key', label: 'Answer Key', cls: 'live-badge--stage-key' };
    }
    if (hay.includes('result') || hay.includes('merit list') || hay.includes('shortlist')) {
      return { stage: 'result', label: 'Final Result', cls: 'live-badge--stage-result' };
    }
    return { stage: 'new-recruitment', label: 'New Recruitment', cls: 'live-badge--stage-new' };
  }

  function buildJobBadges(job) {
    const frag = document.createDocumentFragment();
    const st = getJobStageInfo(job);
    if (st && st.label) {
      frag.appendChild(el('span', `live-badge ${st.cls}`, st.label));
    }
    if (job.organisation) {
      frag.appendChild(el('span', 'live-badge live-badge--org', job.organisation));
    }
    if (job.state) {
      frag.appendChild(el('span', 'live-badge live-badge--state', job.state));
    }
    if (job.category) {
      frag.appendChild(el('span', 'live-badge', job.category));
    }
    const dl = formatDeadlineBadge(job);
    if (dl) {
      frag.appendChild(el('span', `live-badge ${dl.cls}`, dl.label));
    }
    return frag;
  }

  function makeDashboardBookmarkBtn(job) {
    if (!pc || typeof pc.createBookmarkButton !== 'function') return null;
    const btn = pc.createBookmarkButton({
      type: 'job',
      id: job.slug || job.id,
      title: job.title,
      badge: job.organisation || job.category || 'Job Alert',
      url: `/jobs-careers/?job=${encodeURIComponent(job.slug || job.id)}`,
      pdfUrl: job.notification_url || '',
      deadline: job.last_date || ''
    });
    btn.dataset.bookmarkIdle = '★ Save';
    btn.dataset.bookmarkSaved = '★ Saved';
    btn.classList.add('live-btn', 'live-btn--save');
    btn.title = 'Save to your Candidate Hub dashboard';
    const txtEl = btn.querySelector('.cso-bm-text');
    if (txtEl) txtEl.textContent = '★ Save';
    return btn;
  }

  function classifyJobToBranch(job) {
    if (job && job.l1_code) {
      const secSlug = String(job.section_slug || 'jobs-recruitment').trim();
      const l1 = String(job.l1_code).trim();
      const l2 = String(job.l2_code || '').trim();
      const l3 = String(job.l3_slug || '').trim();
      const label = l2 ? `${l1} › ${l2}` : l1;
      const qs = new URLSearchParams();
      qs.set('l1', l1);
      if (l2) qs.set('l2', l2);
      if (l3) qs.set('l3', l3);
      return { l1, l2, l3, sectionSlug: secSlug, label, href: `/jobs-careers/${encodeURIComponent(secSlug)}?${qs.toString()}` };
    }
    const hay = [job.category, job.organisation, job.organization, job.title, job.state].join(' ').toLowerCase();
    if (hay.includes('upsc') || hay.includes('ias') || hay.includes('ips')) return { l1: '1.1', l2: '1.1.1', label: '1.1 › 1.1.1', href: '/jobs-careers/jobs-recruitment?l1=1.1&l2=1.1.1' };
    if (hay.includes('ssc') && !hay.includes('ossc') && !hay.includes('osssc')) return { l1: '1.1', l2: '1.1.2', label: '1.1 › 1.1.2', href: '/jobs-careers/jobs-recruitment?l1=1.1&l2=1.1.2' };
    if (hay.includes('ibps') || hay.includes('sbi') || hay.includes('rbi') || hay.includes('nabard') || hay.includes('bank')) return { l1: '1.1', l2: '1.1.3', label: '1.1 › 1.1.3', href: '/jobs-careers/jobs-recruitment?l1=1.1&l2=1.1.3' };
    if (hay.includes('rrb') || hay.includes('railway')) return { l1: '1.1', l2: '1.1.4', label: '1.1 › 1.1.4', href: '/jobs-careers/jobs-recruitment?l1=1.1&l2=1.1.4' };
    if (hay.includes('agniveer') || hay.includes('capf') || hay.includes('army') || hay.includes('navy') || hay.includes('defence')) return { l1: '1.1', l2: '1.1.5', label: '1.1 › 1.1.5', href: '/jobs-careers/jobs-recruitment?l1=1.1&l2=1.1.5' };
    if (hay.includes('opsc') || hay.includes('oas') || hay.includes('ocs')) return { l1: '1.2', l2: '1.2.1', label: '1.2 › 1.2.1', href: '/jobs-careers/jobs-recruitment?l1=1.2&l2=1.2.1' };
    if (hay.includes('ossc') && !hay.includes('osssc')) return { l1: '1.2', l2: '1.2.2', label: '1.2 › 1.2.2', href: '/jobs-careers/jobs-recruitment?l1=1.2&l2=1.2.2' };
    if (hay.includes('osssc') || hay.includes('ri ') || hay.includes('ari') || hay.includes('amin') || hay.includes('forest')) return { l1: '1.2', l2: '1.2.3', label: '1.2 › 1.2.3', href: '/jobs-careers/jobs-recruitment?l1=1.2&l2=1.2.3' };
    if (hay.includes('oprb') || hay.includes('police') || hay.includes('constable') || hay.includes('excise')) return { l1: '1.2', l2: '1.2.4', label: '1.2 › 1.2.4', href: '/jobs-careers/jobs-recruitment?l1=1.2&l2=1.2.4' };
    if (hay.includes('teach') || hay.includes('otet') || hay.includes('osstet') || hay.includes('oavs') || hay.includes('osepa') || hay.includes('ssb')) return { l1: '1.2', l2: '1.2.5', label: '1.2 › 1.2.5', href: '/jobs-careers/jobs-recruitment?l1=1.2&l2=1.2.5' };
    if (hay.includes('psu') || hay.includes('nalco') || hay.includes('sail') || hay.includes('drdo') || hay.includes('isro')) return { l1: '1.5', l2: '1.5.1', label: '1.5 › 1.5.1', href: '/jobs-careers/jobs-recruitment?l1=1.5&l2=1.5.1' };
    if (hay.includes('private') || hay.includes('intern') || hay.includes('apprentice') || hay.includes('it ')) return { l1: '1.4', l2: '1.4.1', label: '1.4 › 1.4.1', href: '/jobs-careers/jobs-recruitment?l1=1.4&l2=1.4.1' };
    return { l1: '1.2', l2: '1.2.1', label: '1.2 › 1.2.1', href: '/jobs-careers/jobs-recruitment?l1=1.2&l2=1.2.1' };
  }

  function renderJobCard(job) {
    const card = el('article', 'live-job-card');
    const top = el('div', 'live-job-card__top');

    const badges = el('div', 'live-job-card__badges');
    const branch = classifyJobToBranch(job);
    const branchBadge = el('a', 'live-badge live-badge--branch', branch.label);
    branchBadge.href = branch.href;
    branchBadge.title = `Open ${branch.label} in directory`;
    branchBadge.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      const idx = resolveSectionIndex('jobs-recruitment');
      if (idx !== -1 && sections[idx]) {
        currentSection = idx;
        path = isSingleWrapperSection(idx) ? [0] : [];
        const rootNode = isSingleWrapperSection(idx) ? sections[idx].children[0] : sections[idx];
        const i1 = findChildIndexByCode(rootNode.children, branch.l1);
        if (i1 !== -1) {
          path.push(i1);
          const i2 = findChildIndexByCode(rootNode.children[i1].children, branch.l2);
          if (i2 !== -1) path.push(i2);
        }
        updateUrlState(true);
        renderExplorer();
        loadLiveJobs();
      }
    });
    badges.appendChild(branchBadge);
    badges.appendChild(buildJobBadges(job));
    if (window.CSO_CANDIDATE_PREFS && typeof window.CSO_MATCH_ITEM === 'function') {
      const prefs = window.CSO_CANDIDATE_PREFS.load();
      if (window.CSO_CANDIDATE_PREFS.hasAny(prefs)) {
        const m = window.CSO_MATCH_ITEM(job, prefs);
        if (m.matched) {
          badges.appendChild(el('span', 'cso-matched-badge', `✨ Matched for You${m.reasons.length ? ' · ' + m.reasons.join(' • ') : ''}`));
        }
      }
    }
    top.appendChild(badges);

    top.appendChild(el('h3', 'live-job-card__title', job.title || 'Untitled Notification'));
    if (job.title_or) {
      top.appendChild(el('p', 'live-job-card__title-or', job.title_or));
    }
    if (job.summary) {
      top.appendChild(el('p', 'live-job-card__summary', job.summary));
    }

    const meta = el('div', 'live-job-card__meta');
    const vacText = (job.vacancies !== null && job.vacancies !== undefined && job.vacancies !== '')
      ? `👥 ${Number(job.vacancies).toLocaleString('en-IN')} Vacancies`
      : '👥 Vacancies: Refer PDF';
    meta.appendChild(el('span', 'live-meta-pill', vacText));
    if (job.qualification) {
      meta.appendChild(el('span', 'live-meta-pill', `🎓 ${job.qualification}`));
    }
    if (job.last_date && pc) {
      meta.appendChild(el('span', 'live-meta-pill', `⏰ Deadline: ${pc.formatDate(job.last_date)}`));
    } else if (job.published_at && pc) {
      meta.appendChild(el('span', 'live-meta-pill', `📅 Published: ${pc.formatDate(job.published_at)}`));
    }
    top.appendChild(meta);
    card.appendChild(top);

    if (job.slug) jobCache.set(job.slug, job);
    const footer = el('div', 'live-job-card__footer');
    const detailLink = el('a', 'live-btn live-btn--primary', 'View Details');
    detailLink.href = `/jobs-careers/detail/${encodeURIComponent(job.slug || job.id || '')}`;
    footer.appendChild(detailLink);

    const applyHref = job.apply_url || job.notification_url || '';
    if (applyHref && pc && pc.safeHref(applyHref)) {
      const applyLink = el('a', 'live-btn', 'Apply Online ↗');
      applyLink.href = applyHref;
      applyLink.target = '_blank';
      applyLink.rel = 'noopener noreferrer';
      footer.appendChild(applyLink);
    } else {
      const moreBtn = el('button', 'live-btn', 'Official Info');
      moreBtn.type = 'button';
      moreBtn.addEventListener('click', () => openJobDetail(job.slug));
      footer.appendChild(moreBtn);
    }

    footer.appendChild(makeShareButton(job));

    const bmBtn = makeDashboardBookmarkBtn(job);
    if (bmBtn) footer.appendChild(bmBtn);

    const remindBtn = makeRemindButton(job);
    if (remindBtn) footer.appendChild(remindBtn);

    const tracker = window.CSO_DEADLINE_TRACKER;
    if (tracker && (job.last_date || job.title)) {
      const deadlinePayload = {
        id: job.slug || job.id || job.title,
        title: job.title,
        board: job.organisation || job.organization || job.department || job.category || '',
        district: job.district || job.state || 'Odisha',
        lastDate: job.last_date || '',
        applyUrl: applyHref || ''
      };
      const trackedNow = tracker.isTracked(deadlinePayload.id);
      const trackBtn = el('button', 'live-btn live-btn--track' + (trackedNow ? ' is-tracked' : ''), trackedNow ? '✓ Tracked' : '📌 Track');
      trackBtn.type = 'button';
      trackBtn.setAttribute('aria-pressed', String(trackedNow));
      trackBtn.addEventListener('click', () => {
        const res = tracker.toggleTrack(deadlinePayload);
        trackBtn.classList.toggle('is-tracked', res.tracked);
        trackBtn.setAttribute('aria-pressed', String(res.tracked));
        trackBtn.textContent = res.tracked ? '✓ Tracked' : '📌 Track';
        showToast(res.tracked ? '📌 Deadline added to Candidate Hub' : 'Removed from tracked deadlines');
      });
      footer.appendChild(trackBtn);

      if (job.last_date && tracker.calculateDaysRemaining(job.last_date) !== null) {
        const icsBtn = el('button', 'live-btn live-btn--ics', '📅 .ics');
        icsBtn.type = 'button';
        icsBtn.setAttribute('aria-label', `Download calendar reminder (.ics) for ${job.title}`);
        icsBtn.addEventListener('click', () => {
          const ok = tracker.downloadIcsReminder(deadlinePayload);
          if (ok) showToast('📅 Calendar reminder (.ics) downloaded!');
        });
        footer.appendChild(icsBtn);
      }
    }

    card.appendChild(footer);
    return card;
  }

  const jobCache = new Map();
  let toastTimer = null;

  function showToast(message) {
    let toast = document.getElementById('cso-live-toast');
    if (!toast) {
      toast = el('div', 'cso-live-toast');
      toast.id = 'cso-live-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'cso-offscreen-copy';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function shareJobLink(info) {
    if (window.CSOStudentUtils && typeof window.CSOStudentUtils.openShareSheet === 'function') {
      window.CSOStudentUtils.openShareSheet(info);
      return;
    }
    if (window.CSOStudentUtils && typeof window.CSOStudentUtils.shareWhatsAppFormatted === 'function') {
      await window.CSOStudentUtils.shareWhatsAppFormatted(info);
      return;
    }
    const safeTitle = (info && info.title) || 'Job Notification';
    const shareUrl = (info && info.url) || window.location.href;
    const text = `${safeTitle}${info && info.lastDate ? ' (Last Date: ' + info.lastDate + ')' : ''}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: safeTitle, text, url: shareUrl });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    const ok = await copyToClipboard(shareUrl);
    showToast(ok ? 'Copied for WhatsApp!' : `Copy this link: ${shareUrl}`);
  }

  function makeShareButton(job) {
    const shareUrl = `${window.location.origin}/jobs-careers/?job=${encodeURIComponent(job.slug || '')}`;
    const title = job.title || 'Job Notification';
    const btn = el('button', 'live-btn live-btn--wa', '📲 Share');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Share ${title}`);
    btn.addEventListener('click', () => shareJobLink({
      title,
      organisation: job.organisation || job.category || '',
      qualification: job.qualification || '',
      lastDate: job.last_date || '',
      url: shareUrl
    }));
    return btn;
  }

  function makeRemindButton(job) {
    if (!job || !job.last_date) return null;
    const shareUrl = `${window.location.origin}/jobs-careers/?job=${encodeURIComponent(job.slug || '')}`;
    const btn = el('button', 'live-btn live-btn--remind', '📅 Remind');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Add calendar reminder for ${job.title || 'Job Notification'}`);
    btn.addEventListener('click', () => {
      if (window.CSOStudentUtils && typeof window.CSOStudentUtils.downloadJobIcs === 'function') {
        window.CSOStudentUtils.downloadJobIcs({
          slug: job.slug || job.id || 'job',
          title: job.title || 'Job Notification',
          organisation: job.organisation || job.category || 'Common Sense Odisha',
          lastDate: job.last_date,
          url: shareUrl
        });
      }
    });
    return btn;
  }

  function hydrateSsrJobCards(gridEl) {
    if (!gridEl) return false;
    const cards = gridEl.querySelectorAll('[data-ssr-card]');
    if (!cards.length) return false;
    cards.forEach(card => {
      if (card.dataset.hydrated === '1') return;
      card.dataset.hydrated = '1';
      const slug = card.getAttribute('data-job-slug') || '';
      const detailLink = card.querySelector('[data-action="details"]');
      if (detailLink && slug) {
        detailLink.href = `/jobs-careers/detail/${encodeURIComponent(slug)}`;
      }
      const infoLink = card.querySelector('[data-action="info"]');
      if (infoLink && slug) {
        infoLink.addEventListener('click', (e) => {
          e.preventDefault();
          openJobDetail(slug);
        });
      }
      const shareBtn = card.querySelector('[data-action="share"]');
      if (shareBtn && slug) {
        const title = shareBtn.getAttribute('data-title') || card.querySelector('.live-job-card__title')?.textContent?.trim() || 'Job Notification';
        const organisation = shareBtn.getAttribute('data-org') || '';
        const qualification = shareBtn.getAttribute('data-qual') || '';
        const lastDate = shareBtn.getAttribute('data-last-date') || '';
        const shareUrl = `${window.location.origin}/jobs-careers/?job=${encodeURIComponent(slug)}`;
        shareBtn.addEventListener('click', () => shareJobLink({ title, organisation, qualification, lastDate, url: shareUrl }));
      }
      const remindBtn = card.querySelector('[data-action="remind"]');
      if (remindBtn && slug) {
        const title = remindBtn.getAttribute('data-title') || card.querySelector('.live-job-card__title')?.textContent?.trim() || 'Job Notification';
        const organisation = remindBtn.getAttribute('data-org') || 'Common Sense Odisha';
        const lastDate = remindBtn.getAttribute('data-last-date') || '';
        const shareUrl = `${window.location.origin}/jobs-careers/?job=${encodeURIComponent(slug)}`;
        remindBtn.addEventListener('click', () => {
          if (window.CSOStudentUtils && typeof window.CSOStudentUtils.downloadJobIcs === 'function') {
            window.CSOStudentUtils.downloadJobIcs({ slug, title, organisation, lastDate, url: shareUrl });
          }
        });
      }
    });
    if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
      window.CSOBookmarks.updateUI();
    }
    return true;
  }

  function jobToJsonLd(job) {
    return {
      '@type': 'JobPosting',
      title: job.title || 'Government Recruitment Notice',
      description: job.summary || job.title || 'Official Odisha and Central recruitment notice.',
      datePosted: job.published_at || new Date().toISOString().slice(0, 10),
      validThrough: job.last_date || undefined,
      employmentType: 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: job.organization || job.category || 'Common Sense Odisha Directory'
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressRegion: job.state || 'Odisha',
          addressCountry: 'IN'
        }
      },
      url: `${window.location.origin}/jobs-careers/?job=${encodeURIComponent(job.slug || '')}`
    };
  }

  function injectJobJsonLd(payload) {
    if (!payload || !document.head) return;
    let scriptEl = document.getElementById('cso-jobposting-jsonld');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = 'cso-jobposting-jsonld';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(payload);
  }

  function renderLivePagination(page, limit, total) {
    if (!livePaginationEl) return;
    livePaginationEl.replaceChildren();
    const totalPages = Math.ceil((total || 0) / (limit || 12));
    if (totalPages <= 1) {
      livePaginationEl.hidden = true;
      return;
    }
    livePaginationEl.hidden = false;

    const prev = el('button', 'live-btn', '← Previous');
    prev.type = 'button';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => {
      if (liveState.page > 1) {
        liveState.page--;
        loadLiveJobs();
      }
    });

    const info = el('span', 'live-count-badge', `Page ${page} of ${totalPages}`);

    const next = el('button', 'live-btn', 'Next →');
    next.type = 'button';
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => {
      if (liveState.page < totalPages) {
        liveState.page++;
        loadLiveJobs();
      }
    });

    livePaginationEl.append(prev, info, next);
  }

  function closeJobDetail(pushUrl = true) {
    if (!liveDetailModalEl) return;
    liveDetailModalEl.hidden = true;
    document.body.classList.remove('is-live-modal-open');
    if (pushUrl) {
      try {
        const u = new URL(window.location.href);
        if (u.searchParams.has('job')) {
          u.searchParams.delete('job');
          window.history.replaceState(window.history.state, '', u.toString());
        }
      } catch (_) {}
    }
  }

  function buildDetailSpecBox(label, primary, secondary) {
    const card = el('div', 'live-spec-box');
    card.appendChild(el('span', 'live-spec-label', label));
    card.appendChild(el('strong', 'live-spec-value', primary));
    if (secondary) card.appendChild(el('span', 'live-spec-sub', secondary));
    return card;
  }

  function inferSelectionStages(job) {
    const hay = jobSearchHaystack(job);
    if (/\b(oas|ocs|opsc|assistant\s*section|aso)\b/.test(hay)) {
      return 'Prelims (CBT/OMR) → Mains Written Exam → Viva-Voce / Document Verification';
    }
    if (/\b(police|constable|si|defence|fire|forest)\b/.test(hay)) {
      return 'CBT Written Exam → Physical Measurement & Efficiency (PMT/PET) → Medical & DV';
    }
    if (/\b(teach|b\.?ed|tgt|pgt|lecturer|osstet|otet|cht|ltr)\b/.test(hay)) {
      return 'Computer-Based Test (Paper I & II) → Merit List & Certificate Verification';
    }
    if (/\b(bank|ibps|sbi|ssc|rrb|railway)\b/.test(hay)) {
      return 'Tier-I / Prelims CBT → Tier-II / Mains CBT → Skill Test & Document Verification';
    }
    return 'Written Exam / CBT Screening → Interview / Skill Test → Document Verification';
  }

  async function openJobDetail(slug, pushUrl = true) {
    if (!slug || !liveDetailModalEl) return;
    liveDetailModalEl.hidden = false;
    document.body.classList.add('is-live-modal-open');
    liveDetailBadgesEl.replaceChildren();
    liveDetailTitleEl.textContent = 'Loading notification details…';
    liveDetailTitleOrEl.hidden = true;
    liveDetailMetaEl.replaceChildren();
    if (liveDetailSpecsEl) liveDetailSpecsEl.replaceChildren();
    if (liveDetailSyllabusEl) {
      liveDetailSyllabusEl.replaceChildren();
      liveDetailSyllabusEl.hidden = true;
    }
    liveDetailSummaryEl.hidden = true;
    liveDetailActionsEl.replaceChildren();
    liveDetailBodyEl.replaceChildren(el('p', '', 'Fetching official recruitment details…'));

    if (pushUrl) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('job', slug);
        window.history.pushState({ jobSlug: slug }, '', u.toString());
      } catch (_) {}
    }

    try {
      await loadCandidateGoalsAndTaxonomy();
      let job = null;
      try {
        const res = await fetch(`/api/content/jobs/${encodeURIComponent(slug)}`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(res.status === 404 ? 'Job notification not found or no longer active.' : `HTTP ${res.status}`);
        job = await res.json();
      } catch (fetchErr) {
        job = jobCache.get(slug) || null;
        if (!job) throw fetchErr;
      }

      liveDetailBadgesEl.appendChild(buildJobBadges(job));
      liveDetailTitleEl.textContent = job.title || 'Job Notification';
      if (job.title_or) {
        liveDetailTitleOrEl.textContent = job.title_or;
        liveDetailTitleOrEl.hidden = false;
      }

      if (job.vacancies !== null && job.vacancies !== undefined && job.vacancies !== '') {
        liveDetailMetaEl.appendChild(el('span', '', `👥 Vacancies: ${Number(job.vacancies).toLocaleString('en-IN')}`));
      }
      if (job.qualification) {
        liveDetailMetaEl.appendChild(el('span', '', `🎓 Qualification: ${job.qualification}`));
      }
      if (job.last_date && pc) {
        liveDetailMetaEl.appendChild(el('span', '', `⏰ Last Date: ${pc.formatDate(job.last_date)}`));
      }
      if (job.published_at && pc) {
        liveDetailMetaEl.appendChild(el('span', '', `📅 Published: ${pc.formatDate(job.published_at)}`));
      }

      if (liveDetailSpecsEl) {
        const dl = formatDeadlineBadge(job);
        const pubTxt = (job.published_at && pc) ? `Published ${pc.formatDate(job.published_at)}` : 'Official Notice';
        const lastTxt = (job.last_date && pc) ? pc.formatDate(job.last_date) : 'See Official PDF';
        liveDetailSpecsEl.appendChild(buildDetailSpecBox('Important Dates', `Deadline: ${lastTxt}`, dl ? `${dl.label} · ${pubTxt}` : pubTxt));

        const vacTxt = (job.vacancies !== null && job.vacancies !== undefined && job.vacancies !== '')
          ? `${Number(job.vacancies).toLocaleString('en-IN')} Posts`
          : 'Refer Official Notice';
        liveDetailSpecsEl.appendChild(buildDetailSpecBox('Age & Qualification', job.qualification || 'Check Official Notification', vacTxt));
        liveDetailSpecsEl.appendChild(buildDetailSpecBox('Selection Stages', inferSelectionStages(job), job.organisation || job.category || 'Recruitment Board'));
      }

      if (liveDetailSyllabusEl) {
        const matchedTax = matchJobToTaxonomy(job);
        const targetExamParam = matchedTax ? `?exam=${encodeURIComponent(matchedTax.id)}` : '';
        const copy = el('div', 'live-syllabus-banner__copy');
        copy.appendChild(el('strong', '', matchedTax ? `Matched Track: ${matchedTax.exam_label}` : 'Exam Preparation & Mock Tests'));
        copy.appendChild(el('span', '', matchedTax
          ? `Access structured syllabus checklists, PYQs & CBT drills for ${matchedTax.short_code}.`
          : 'Explore Odisha recruitment syllabi, previous papers, and CBT mock tests.'));
        const links = el('div', 'live-syllabus-banner__actions');
        const sylBtn = el('a', 'live-btn live-btn--primary', 'Open Exam Syllabus & Mock Drill →');
        sylBtn.href = `/resources/${targetExamParam}`;
        const mockBtn = el('a', 'live-btn', 'Practice Mock Tests ↗');
        mockBtn.href = `/mock-tests/${targetExamParam}`;
        links.append(sylBtn, mockBtn);
        liveDetailSyllabusEl.append(copy, links);
        liveDetailSyllabusEl.hidden = false;
      }

      if (job.summary) {
        liveDetailSummaryEl.textContent = job.summary;
        liveDetailSummaryEl.hidden = false;
      }

      if (job.notification_url && pc && pc.safeMediaSrc(job.notification_url)) {
        const pdfLink = el('a', 'live-btn live-btn--pdf', '📄 Download Notification PDF');
        pdfLink.href = job.notification_url;
        pdfLink.target = '_blank';
        pdfLink.rel = 'noopener noreferrer';
        liveDetailActionsEl.appendChild(pdfLink);
      }

      const detailApplyHref = job.apply_url || job.notification_url || '';
      if (detailApplyHref && pc && pc.safeHref(detailApplyHref)) {
        const applyLink = el('a', 'live-btn live-btn--primary', job.apply_url ? 'Apply Online ↗' : 'Official Portal ↗');
        applyLink.href = detailApplyHref;
        applyLink.target = '_blank';
        applyLink.rel = 'noopener noreferrer';
        liveDetailActionsEl.appendChild(applyLink);
      }

      liveDetailActionsEl.appendChild(makeShareButton(job));

      const detailRemindBtn = makeRemindButton(job);
      if (detailRemindBtn) liveDetailActionsEl.appendChild(detailRemindBtn);

      const detailBmBtn = makeDashboardBookmarkBtn(job);
      if (detailBmBtn) liveDetailActionsEl.appendChild(detailBmBtn);

      injectJobJsonLd(Object.assign({ '@context': 'https://schema.org' }, jobToJsonLd(job)));

      if (job.body_html && pc && typeof pc.renderSanitizedHtml === 'function') {
        pc.renderSanitizedHtml(liveDetailBodyEl, job.body_html);
      } else {
        liveDetailBodyEl.replaceChildren(
          el('p', '', job.summary || 'Refer to the official notification PDF or application link above for complete recruitment guidelines.')
        );
      }

      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      liveDetailTitleEl.textContent = 'Unable to load notification';
      liveDetailBodyEl.replaceChildren(el('p', '', err.message || 'Please try again later.'));
    }
  }

  function populateDistrictSelect() {
    if (!liveDistrictEl || !Array.isArray(window.CSO_ODISHA_DISTRICTS)) return;
    window.CSO_ODISHA_DISTRICTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.slug;
      opt.textContent = `${d.name_en} (${d.name_or})`;
      liveDistrictEl.appendChild(opt);
    });
  }

  function syncDistrictQueryParam(slug) {
    try {
      const url = new URL(window.location.href);
      if (slug) url.searchParams.set('district', slug);
      else url.searchParams.delete('district');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (_) {}
  }

  function renderDistrictBanner() {
    if (!liveDistrictBannerEl) return;
    const dist = typeof window.CSO_FIND_ODISHA_DISTRICT === 'function'
      ? window.CSO_FIND_ODISHA_DISTRICT(liveState.district)
      : null;
    if (!dist) {
      liveDistrictBannerEl.hidden = true;
      liveDistrictBannerEl.replaceChildren();
      return;
    }
    liveDistrictBannerEl.hidden = false;
    const info = el('div', 'cso-district-banner__info');
    const title = el('strong', 'cso-district-banner__title', `${dist.name_en} (${dist.name_or}) · ${dist.division} Division`);
    const sub = el('span', 'cso-district-banner__sub', 'Official District Collectorate Recruitment & Notice Portal (.gov.in / .nic.in)');
    info.append(title, sub);

    const actions = el('div', 'cso-district-banner__actions');
    const swBtn = el('button', `cso-district-banner__toggle${liveState.includeStateWide ? ' is-active' : ''}`, liveState.includeStateWide ? '✓ Including State-Wide' : 'District-Only');
    swBtn.type = 'button';
    swBtn.setAttribute('aria-pressed', String(liveState.includeStateWide));
    swBtn.addEventListener('click', () => {
      liveState.includeStateWide = !liveState.includeStateWide;
      liveState.page = 1;
      renderDistrictBanner();
      loadLiveJobs();
    });

    const portalLink = el('a', 'cso-district-banner__link', 'Official District Collectorate Notice Board ↗');
    portalLink.href = dist.notice_url;
    portalLink.target = '_blank';
    portalLink.rel = 'noopener noreferrer';

    actions.append(swBtn, portalLink);
    liveDistrictBannerEl.replaceChildren(info, actions);
  }

  function matchesDistrictFilter(job, districtSlug, includeStateWide) {
    const dist = typeof window.CSO_FIND_ODISHA_DISTRICT === 'function'
      ? window.CSO_FIND_ODISHA_DISTRICT(districtSlug)
      : null;
    if (!dist) return true;
    const hay = [job.title, job.organisation, job.organization, job.summary, job.state, job.district, job.location].join(' ').toLowerCase();
    const hitsDistrict = hay.includes(dist.name_en.toLowerCase()) || hay.includes(dist.slug);
    if (hitsDistrict) return true;
    if (!includeStateWide) return false;
    const list = Array.isArray(window.CSO_ODISHA_DISTRICTS) ? window.CSO_ODISHA_DISTRICTS : [];
    const mentionsOtherDistrict = list.some(other => other.slug !== dist.slug && (hay.includes(other.name_en.toLowerCase()) || hay.includes(other.slug)));
    return !mentionsOtherDistrict;
  }

  async function loadLiveJobs(opts = {}) {
    if (!liveGridEl || !liveStatusEl) return;
    const silent = Boolean(opts && opts.silent);
    const activeCodes = getEffectiveLayerCodes();
    const hasBranchFilter = Boolean(activeCodes.l1 && activeCodes.sectionSlug === 'jobs-recruitment');
    const isClientComposite = (liveState.chip && liveState.chip !== 'all') || (liveState.stage && liveState.stage !== 'all') || Boolean(liveState.goalMatch) || Boolean(liveState.district) || Boolean(liveState.matchedOnly) || Boolean(liveState.bookmarksOnly) || hasBranchFilter;
    const hasFilter = Boolean(liveState.q || liveState.state || liveState.category || liveState.district || (liveState.stage && liveState.stage !== 'all') || isClientComposite);
    if (liveResetBtn) liveResetBtn.hidden = !hasFilter;

    if (!silent) {
      liveStatusEl.hidden = false;
      liveStatusEl.replaceChildren(el('span', '', 'Loading live recruitment notifications…'));
      liveGridEl.replaceChildren();
    }

    const params = new URLSearchParams();
    params.set('page', isClientComposite ? '1' : String(liveState.page));
    params.set('limit', isClientComposite ? '50' : String(liveState.limit));
    if (liveState.q) params.set('q', liveState.q);
    if (liveState.state) params.set('state', liveState.state);
    if (liveState.category) params.set('category', liveState.category);
    if (liveState.stage && liveState.stage !== 'all') params.set('stage', liveState.stage);

    try {
      if (liveState.goalMatch && !liveGoalsLoaded) {
        await loadCandidateGoalsAndTaxonomy();
      }
      const res = await fetch(`/api/content/jobs?${params.toString()}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let items = Array.isArray(data.items) ? data.items : [];
      if (!liveState.q && !liveState.state && !liveState.category && (!liveState.stage || liveState.stage === 'all')) {
        renderMatchingLiveNotices(items);
      }
      syncCategoryDropdown(items);

      if (liveState.stage && liveState.stage !== 'all') {
        items = items.filter(job => getJobStageInfo(job).stage === liveState.stage);
      }
      if (liveState.chip && liveState.chip !== 'all') {
        items = items.filter(job => matchesChipFilter(job, liveState.chip));
      }
      if (liveState.goalMatch) {
        items = items.filter(matchesGoalFilter);
      }
      if (liveState.district) {
        items = items.filter(job => matchesDistrictFilter(job, liveState.district, liveState.includeStateWide));
      }
      if (hasBranchFilter) {
        items = items.filter(job => {
          const br = classifyJobToBranch(job);
          if (activeCodes.l2) return br.l1 === activeCodes.l1 && br.l2 === activeCodes.l2;
          return br.l1 === activeCodes.l1;
        });
      }
      if (liveState.bookmarksOnly) {
        const bmSlugs = new Set(loadBookmarkedTracks().map(t => t.slug));
        items = items.filter(job => bmSlugs.has(job.slug || job.id));
      }
      if (window.CSO_CANDIDATE_PREFS && typeof window.CSO_MATCH_ITEM === 'function') {
        const prefs = window.CSO_CANDIDATE_PREFS.load();
        const hasPrefs = window.CSO_CANDIDATE_PREFS.hasAny(prefs);
        if (liveMatchedToggleBtn) {
          liveMatchedToggleBtn.hidden = !hasPrefs;
          if (hasPrefs) {
            const matchedCount = items.filter(job => window.CSO_MATCH_ITEM(job, prefs).matched).length;
            liveMatchedToggleBtn.textContent = `✨ Matched for You (${matchedCount})`;
            liveMatchedToggleBtn.classList.toggle('is-active', liveState.matchedOnly);
            liveMatchedToggleBtn.setAttribute('aria-pressed', String(liveState.matchedOnly));
          }
        }
        if (liveEditPrefsLink) liveEditPrefsLink.hidden = !hasPrefs;
        if (liveState.matchedOnly && hasPrefs) {
          items = items.filter(job => window.CSO_MATCH_ITEM(job, prefs).matched);
        }
      }

      const total = isClientComposite ? items.length : (Number(data.total) || items.length);
      const displayPage = isClientComposite ? liveState.page : (data.page || liveState.page);
      const displayLimit = liveState.limit;
      const pagedItems = isClientComposite
        ? items.slice((displayPage - 1) * displayLimit, displayPage * displayLimit)
        : items;

      if (liveCountEl) {
        liveCountEl.textContent = `${total.toLocaleString('en-IN')} ${total === 1 ? 'Active Notice' : 'Active Notices'}`;
      }

      if (pagedItems.length === 0) {
        liveGridEl.replaceChildren();
        liveStatusEl.hidden = false;
        const emptyMsg = el('p', '', hasFilter
          ? 'No published job notifications match your current filters.'
          : 'No items published yet — add categories or content in Admin Studio.');
        liveStatusEl.replaceChildren(emptyMsg);
        if (hasFilter) {
          const emptyReset = el('button', 'live-btn live-btn--primary', 'Reset All Filters');
          emptyReset.type = 'button';
          emptyReset.addEventListener('click', resetAllFilters);
          liveStatusEl.appendChild(emptyReset);
        }
        if (livePaginationEl) livePaginationEl.hidden = true;
        return;
      }

      liveStatusEl.hidden = true;
      pagedItems.forEach(job => { if (job.slug) jobCache.set(job.slug, job); });

      if (silent && liveGridEl.dataset.ssr === '1') {
        const ssrSlugs = Array.from(liveGridEl.querySelectorAll('[data-ssr-card]'))
          .map(n => n.getAttribute('data-job-slug') || '')
          .join(',');
        const liveSlugs = pagedItems.map(j => j.slug || j.id || '').join(',');
        if (ssrSlugs && ssrSlugs === liveSlugs) {
          renderLivePagination(displayPage, displayLimit, total);
          if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
            window.CSOBookmarks.updateUI();
          }
          return;
        }
      }

      const frag = document.createDocumentFragment();
      pagedItems.forEach(job => frag.appendChild(renderJobCard(job)));
      liveGridEl.replaceChildren(frag);
      delete liveGridEl.dataset.ssr;
      renderLivePagination(displayPage, displayLimit, total);
      injectJobJsonLd({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: pagedItems.slice(0, 10).map((job, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: jobToJsonLd(job)
        }))
      });

      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      if (silent && liveGridEl.querySelector('[data-ssr-card]')) {
        return;
      }
      if (liveCountEl) liveCountEl.textContent = 'Unavailable';
      liveStatusEl.hidden = false;
      liveStatusEl.replaceChildren();
      const msg = el('p', '', 'Unable to load live job notifications right now.');
      const retry = el('button', 'live-btn', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', () => loadLiveJobs());
      liveStatusEl.append(msg, retry);
    }
  }

  function updateStageButtonsUI() {
    if (liveStagesWrap) {
      liveStagesWrap.querySelectorAll('[data-stage]').forEach(btn => {
        const active = btn.dataset.stage === liveState.stage;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
  }

  function updateChipButtonsUI() {
    if (liveChipsWrap) {
      liveChipsWrap.querySelectorAll('[data-chip]').forEach(btn => {
        const active = btn.dataset.chip === liveState.chip;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
    if (liveGoalToggleBtn) {
      liveGoalToggleBtn.classList.toggle('is-active', liveState.goalMatch);
      liveGoalToggleBtn.setAttribute('aria-pressed', String(liveState.goalMatch));
    }
  }

  if (liveStagesWrap) {
    liveStagesWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-stage]');
      if (!btn) return;
      liveState.stage = btn.dataset.stage || 'all';
      liveState.page = 1;
      updateStageButtonsUI();
      loadLiveJobs();
    });
  }

  if (liveChipsWrap) {
    liveChipsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-chip]');
      if (!btn) return;
      liveState.chip = btn.dataset.chip || 'all';
      liveState.page = 1;
      updateChipButtonsUI();
      loadLiveJobs();
    });
  }

  const liveBookmarksToggleBtn = document.getElementById('live-jobs-bookmarks-toggle');
  if (liveBookmarksToggleBtn) {
    updateBookmarksPillUI();
    liveBookmarksToggleBtn.addEventListener('click', () => {
      liveState.bookmarksOnly = !liveState.bookmarksOnly;
      liveState.page = 1;
      updateBookmarksPillUI();
      loadLiveJobs();
    });
  }

  if (liveGoalToggleBtn) {
    liveGoalToggleBtn.addEventListener('click', async () => {
      await loadCandidateGoalsAndTaxonomy();
      if (!liveState.goalMatch && !liveCandidateUser && !liveGoalExamIds.length) {
        showAuthHint('Sign in and select target exams in Candidate Hub to match jobs with your Dashboard goals.');
        return;
      }
      if (!liveState.goalMatch && !liveGoalExamIds.length) {
        showAuthHint('Set target exams inside Candidate Hub → Change Focus to filter recruitments by your goals.');
        return;
      }
      liveState.goalMatch = !liveState.goalMatch;
      liveState.page = 1;
      updateChipButtonsUI();
      loadLiveJobs();
    });
  }

  // Sync job bookmarks directly to POST /api/candidate/bookmarks + CSOIdb fallback
  window.addEventListener('cso:bookmark-toggled', async (e) => {
    const det = e && e.detail ? e.detail : null;
    if (!det || det.type !== 'job' || !det.id) return;
    await loadCandidateGoalsAndTaxonomy();

    const prefixedId = `jobs:${det.id}`;
    if (!liveCandidateUser) {
      if (det.bookmarked) {
        showAuthHint('Saved on this device! Sign in to sync this recruitment into your Candidate Hub.');
      }
      return;
    }

    const payload = det.bookmarked
      ? {
          action: 'save',
          postId: prefixedId,
          postTitle: det.title || 'Saved Recruitment',
          postUrl: det.url || `/jobs-careers/?job=${encodeURIComponent(det.id)}`,
          category: det.badge || 'Job Alert',
          deadlineDate: det.deadline || null
        }
      : { action: 'remove', postId: prefixedId };

    if (window.CSOIdb) {
      try {
        if (det.bookmarked && typeof window.CSOIdb.saveBookmarkMirror === 'function') {
          await window.CSOIdb.saveBookmarkMirror({
            postId: prefixedId,
            postTitle: payload.postTitle,
            postUrl: payload.postUrl,
            category: payload.category,
            deadlineDate: payload.deadlineDate
          });
        } else if (!det.bookmarked && typeof window.CSOIdb.removeBookmarkMirror === 'function') {
          await window.CSOIdb.removeBookmarkMirror(prefixedId);
        }
      } catch (_) {}
    }

    let syncedOnline = false;
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      try {
        const res = await fetch('/api/candidate/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        syncedOnline = res.ok;
      } catch (_) {}
    }

    if (!syncedOnline && window.CSOIdb && typeof window.CSOIdb.enqueueSyncAction === 'function') {
      try {
        await window.CSOIdb.enqueueSyncAction({
          endpoint: '/api/candidate/bookmarks',
          method: 'POST',
          payload
        });
      } catch (_) {}
    }
  });

  if (liveStateEl) {
    liveStateEl.addEventListener('change', () => {
      liveState.state = liveStateEl.value;
      liveState.page = 1;
      closeJobDetail(false);
      loadLiveJobs();
    });
  }
  if (liveCategoryEl) {
    liveCategoryEl.addEventListener('change', () => {
      liveState.category = liveCategoryEl.value;
      liveState.page = 1;
      closeJobDetail(false);
      loadLiveJobs();
    });
  }
  if (liveDistrictEl) {
    liveDistrictEl.addEventListener('change', () => {
      liveState.district = liveDistrictEl.value;
      liveState.page = 1;
      syncDistrictQueryParam(liveState.district);
      renderDistrictBanner();
      closeJobDetail(false);
      loadLiveJobs();
    });
  }
  if (liveMatchedToggleBtn) {
    liveMatchedToggleBtn.addEventListener('click', () => {
      liveState.matchedOnly = !liveState.matchedOnly;
      liveState.page = 1;
      loadLiveJobs();
    });
  }
  function resetAllFilters() {
    liveState = { page: 1, limit: 12, q: '', state: '', category: '', district: '', includeStateWide: true, chip: 'all', stage: 'all', goalMatch: false, matchedOnly: false };
    if (search) search.value = '';
    if (clearSearch) clearSearch.hidden = true;
    if (liveStateEl) liveStateEl.value = '';
    if (liveCategoryEl) liveCategoryEl.value = '';
    if (liveDistrictEl) liveDistrictEl.value = '';
    syncDistrictQueryParam('');
    renderDistrictBanner();
    if (liveAuthHintEl) liveAuthHintEl.hidden = true;
    updateStageButtonsUI();
    updateChipButtonsUI();
    closeJobDetail(true);
    loadLiveJobs();
  }
  if (liveResetBtn) {
    liveResetBtn.addEventListener('click', resetAllFilters);
  }
  if (liveDetailCloseBtn) {
    liveDetailCloseBtn.addEventListener('click', () => closeJobDetail(true));
  }
  if (liveDetailModalEl) {
    liveDetailModalEl.addEventListener('click', (e) => {
      if (e.target === liveDetailModalEl) closeJobDetail(true);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !liveDetailModalEl.hidden) {
        closeJobDetail(true);
      }
    });
  }

  populateDistrictSelect();
  try {
    const sp = new URLSearchParams(window.location.search);
    const qParam = sp.get('q');
    if (qParam) {
      if (search) search.value = qParam;
      if (clearSearch) clearSearch.hidden = false;
      liveState.q = qParam.trim();
    }
    const distParam = (sp.get('district') || '').trim().toLowerCase();
    const matchedDist = typeof window.CSO_FIND_ODISHA_DISTRICT === 'function'
      ? window.CSO_FIND_ODISHA_DISTRICT(distParam)
      : null;
    if (matchedDist) {
      liveState.district = matchedDist.slug;
      if (liveDistrictEl) liveDistrictEl.value = matchedDist.slug;
    }
    if (sp.get('matched') === '1' && window.CSO_CANDIDATE_PREFS && window.CSO_CANDIDATE_PREFS.hasAny(window.CSO_CANDIDATE_PREFS.load())) {
      liveState.matchedOnly = true;
    }
  } catch (_) {}
  renderDistrictBanner();

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => node.setAttribute(k, String(attrs[k])));
    }
    return node;
  }

  fetch('/api/content/jobs?limit=50', { credentials: 'same-origin' })
    .then(r => (r.ok ? r.json() : { items: [] }))
    .then(d => renderMatchingLiveNotices(Array.isArray(d.items) ? d.items : []))
    .catch(() => renderMatchingLiveNotices([]));

  loadCandidateGoalsAndTaxonomy();
  syncCategoryDropdown([]);
  const hasSsrCards = liveGridEl && liveGridEl.dataset.ssr === '1' && hydrateSsrJobCards(liveGridEl);
  if (hasSsrCards && !liveState.q) {
    loadLiveJobs({ silent: true });
  } else {
    loadLiveJobs();
  }

  try {
    const initialJobSlug = new URLSearchParams(window.location.search).get('job');
    if (initialJobSlug) {
      openJobDetail(initialJobSlug, false);
    }
  } catch (_) {}
})();
