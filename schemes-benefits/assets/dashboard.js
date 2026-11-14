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
  const searchResults = $('search-results');
  const searchItems = $('search-items');
  const searchStatus = $('search-status');
  const loadStatus = $('load-status');
  const backButton = $('back-button');
  const pageTitle = $('page-title');
  const pageDescription = $('page-description');
  const breadcrumb = $('breadcrumb');
  const menuToggle = $('menu-toggle');

  const SUBPAGE_TITLE = 'Schemes & Benefits';
  const SITE_SUFFIX = 'Common Sense Odisha';
  const OVERVIEW_DESCRIPTION = 'Explore government schemes, welfare benefits, eligibility and support categories.';

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getSectionSlug(section) {
    if (!section) return '';
    if (section.slug) return String(section.slug);
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

  function updateUrlState(pushHistory = true, replaceUrl = false) {
    try {
      const url = new URL(window.location.href);
      if (currentSection >= 0 && currentSection < sections.length) {
        const slug = getSectionSlug(sections[currentSection]);
        url.searchParams.set('section', slug);
        const hasSingleWrapper = isSingleWrapperSection(currentSection);
        const isWrapperOnly = hasSingleWrapper && path.length === 1 && path[0] === 0;

        if (path.length > 0 && !isWrapperOnly) {
          url.searchParams.set('path', path.join('.'));
        } else {
          url.searchParams.delete('path');
        }

        const state = {
          sectionIndex: currentSection,
          slug,
          path: [...path]
        };

        if (replaceUrl || url.href === window.location.href) {
          window.history.replaceState(state, '', url.toString());
        } else if (pushHistory) {
          window.history.pushState(state, '', url.toString());
        }
      } else {
        url.searchParams.delete('section');
        url.searchParams.delete('group');
        url.searchParams.delete('path');
        const state = { sectionIndex: -1, slug: '', path: [] };
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

  const icons = ['🏛️', '🎓', '🌾', '🏥', '🤝', '🔬', '🎯', '🛡️'];

  let sections = [];
  let treeCountsCache = null;
  let path = [];
  let currentSection = -1;

  function getActiveLang() {
    try {
      return localStorage.getItem('cso_lang_pref') === 'or' ? 'or' : 'en';
    } catch (_) {
      return 'en';
    }
  }

  function localizedNodeTitle(node) {
    if (!node) return '';
    const isOr = getActiveLang() === 'or';
    return (isOr && node.title_or) ? node.title_or : (node.title || '');
  }

  function localizedNodeSub(node) {
    if (!node) return '';
    const isOr = getActiveLang() === 'or';
    return (isOr && node.subtitle_or) ? node.subtitle_or : (node.subtitle || node.description || '');
  }

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

  function countEntries(nodes) {
    return nodes.reduce((sum, node) => {
      const ch = node.children || [];
      if (ch.length === 0) return sum + 1;
      return sum + countEntries(ch);
    }, 0);
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
      menuToggle.setAttribute('aria-expanded', 'false');
      return;
    }
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    sidebar.removeAttribute('aria-modal');
    sidebar.removeAttribute('role');

    // Return focus safely to last focused element or toggle button
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function' && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    } else if (menuToggle && typeof menuToggle.focus === 'function') {
      menuToggle.focus();
    }
  }

  function setActiveSidebar() {
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

    addCrumb('CS Odisha', '../index.html');

    if (currentSection < 0) {
      addCrumb(SUBPAGE_TITLE, () => showOverview(true), true);
      return;
    }

    addCrumb(SUBPAGE_TITLE, () => showOverview(true), false);

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
    breadcrumb.replaceChildren();

    const c1 = el('li', 'breadcrumb-item');
    const a1 = el('a', 'breadcrumb-link', 'CS Odisha');
    a1.href = '../index.html';
    c1.append(a1);
    breadcrumb.append(c1);

    const c2 = el('li', 'breadcrumb-item');
    const b2 = el('button', 'breadcrumb-link', SUBPAGE_TITLE);
    b2.type = 'button';
    b2.addEventListener('click', () => showOverview(true));
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

  clearRecent.addEventListener('click', () => {
    recentHistory.length = 0;
    renderRecent();
  });

  function showOverview(pushHistory = true) {
    currentSection = -1;
    path = [];
    searchResults.hidden = true;
    explorer.hidden = true;
    overview.hidden = false;
    renderRecent();
    pageTitle.textContent = `${SUBPAGE_TITLE} Explorer`;
    pageDescription.textContent = OVERVIEW_DESCRIPTION;
    renderBreadcrumb();
    setActiveSidebar();
    updateDocumentTitle('');
    if (pushHistory) {
      updateUrlState(true);
    }
    closeMobileMenu();
  }

  function openSection(index, pushHistory = true) {
    if (index < 0 || index >= sections.length) {
      showOverview(pushHistory);
      return;
    }
    currentSection = index;
    path = isSingleWrapperSection(index) ? [0] : [];

    search.value = '';
    clearSearch.hidden = true;
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

  function renderExplorer() {
    const node = currentNode();
    const children = node.children || [];
    rememberCategory();

    overview.hidden = true;
    searchResults.hidden = true;
    explorer.hidden = false;

    // Display the current category title only once.
    const cleanTitle = localizedNodeTitle(node)
      .replace(/\s+Directory$/i, '')
      .trim();

    pageTitle.textContent = cleanTitle;
    explorerTitle.textContent = '';
    pageDescription.textContent = '';
    renderBreadcrumb();
    setActiveSidebar();
    updateDocumentTitle(cleanTitle);

    const subText = localizedNodeSub(node);
    explorerDescription.hidden = false;
    explorerDescription.textContent = children.length
      ? `${children.length} categories${subText ? ' · ' + subText : ''}`
      : (subText || 'Detailed schemes and benefits categories');

    explorerItems.replaceChildren();

    if (node.official_url && (!window.CSOPublicContent || window.CSOPublicContent.safeHref(node.official_url))) {
      const portalBanner = el('div', 'live-scheme-helpline');
      portalBanner.appendChild(el('span', '', '🔗 Official Government Portal for this Section'));
      const portalLink = el('a', 'scheme-btn scheme-btn--primary', 'Open Official Portal ↗');
      portalLink.href = node.official_url;
      portalLink.target = '_blank';
      portalLink.rel = 'noopener noreferrer nofollow';
      portalBanner.appendChild(portalLink);
      explorerItems.append(portalBanner);
    }

    children.forEach((child, index) => {
      const button = el('button', 'explorer-item dashboard-card');
      button.type = 'button';

      const symbols = [
        '💼', '🧭', '📋', '📚',
        '🎓', '🌍', '📈', '🏛️',
        '📝', '🔎', '💡', '🏆',
        '🗂️', '⚙️', '📌', '🎯'
      ];

      const icon = child.icon_name || symbols[index % symbols.length];
      const childTitleText = localizedNodeTitle(child);
      const title = (child.number ? child.number + ' ' : '') + childTitleText;
      const nested = (child.children || []).length ? countNodes(child.children || []) : 0;
      const entries = (child.children || []).length ? countEntries(child.children || []) : 0;

      button.append(el('span', 'card-icon', icon));

      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', title));

      const metaParts = [];
      if (nested > 0) metaParts.push(`${nested.toLocaleString('en-IN')} categories`);
      if (entries > 0) metaParts.push(`${entries.toLocaleString('en-IN')} entries`);
      const childSub = localizedNodeSub(child);
      if (!metaParts.length && childSub) metaParts.push(childSub);
      content.append(el('span', 'card-meta', metaParts.length ? metaParts.join(' · ') : 'View scheme entry details'));
      button.append(content);

      const arrow = el('span', 'card-arrow', '›');
      arrow.setAttribute('aria-hidden', 'true');
      button.append(arrow);

      button.addEventListener('click', () => {
        if ((child.children || []).length > 0 || (child.notes || []).length > 0) {
          path.push(index);
          updateUrlState(true);
          renderExplorer();
        } else if (schemeQEl) {
          schemeQEl.value = childTitleText;
          schemeFilterState.q = childTitleText;
          loadLiveSchemes();
          const secEl = document.getElementById('live-schemes-section');
          if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      explorerItems.append(button);
    });

    for (const entry of node.notes || []) {
      const item = el('div', 'explorer-item leaf');
      item.append(el('span', 'card-icon', '📌'));
      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', entry.text));
      item.append(content);

      // Bookmark action button
      const bmId = 'sch-' + (entry.id || entry.text.substring(0, 32).toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      const bmBtn = el('button', 'cso-bookmark-btn cso-bookmark-btn--inline');
      bmBtn.type = 'button';
      bmBtn.dataset.bookmarkType = 'schemes';
      bmBtn.dataset.bookmarkId = bmId;
      bmBtn.dataset.bookmarkTitle = entry.text;
      bmBtn.dataset.bookmarkBadge = 'Schemes & Benefits';
      bmBtn.dataset.bookmarkUrl = window.location.href;
      bmBtn.title = 'Bookmark this welfare scheme';
      const starSpan = el('span', 'cso-bm-star', '☆');
      starSpan.setAttribute('aria-hidden', 'true');
      const labelSpan = el('span', 'cso-bm-text', 'Save');
      bmBtn.append(starSpan, document.createTextNode(' '), labelSpan);
      item.append(bmBtn);

      explorerItems.append(item);
    }

    if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
      window.CSOBookmarks.updateUI();
    }

    if (!children.length && !(node.notes || []).length) {
      explorerItems.append(
        el('p', '', 'This category is ready for future information.')
      );
    }

    const hasSingleWrapper = isSingleWrapperSection(currentSection);
    const isAtSectionRoot = path.length === 0 || (hasSingleWrapper && path.length === 1 && path[0] === 0);

    backButton.textContent = !isAtSectionRoot
      ? '← Previous level'
      : '← All sections';

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

  function renderSearch() {
    const query = search.value.trim().toLowerCase();
    clearSearch.hidden = search.value.length === 0;

    if (!query) {
      if (currentSection >= 0) renderExplorer();
      else showOverview();
      return;
    }

    overview.hidden = true;
    explorer.hidden = true;
    searchResults.hidden = false;

    pageTitle.textContent = 'Search Schemes & Benefits';
    pageDescription.textContent = `Results for "${search.value.trim()}"`;
    renderSearchBreadcrumb();
    updateDocumentTitle(`Search: ${search.value.trim()}`);

    const results = [];

    sections.forEach((section, sectionIndex) => {
      const sTitle = localizedNodeTitle(section);
      if (sTitle.toLowerCase().includes(query) || String(section.title || '').toLowerCase().includes(query)) {
        results.push({
          label: sTitle,
          trail: 'Main group',
          sectionIndex,
          nodePath: []
        });
      }

      (section.children || []).forEach((node, index) => {
        searchNode(
          node, query, [sTitle], results,
          sectionIndex, [index]
        );
      });
    });

    const matchingFlagship = (liveSchemesCache || []).filter(s => {
      const hay = [s.title, s.title_or, s.summary, s.summary_or, s.benefit_summary, s.department, s.category]
        .map(v => String(v || '').toLowerCase())
        .join(' ');
      return hay.includes(query);
    });

    searchItems.replaceChildren();
    searchStatus.textContent = `${matchingFlagship.length} flagship D1 schemes & ${results.length} directory categories found`;

    if (matchingFlagship.length) {
      const flagshipWrap = el('div', 'search-schemes-section');
      flagshipWrap.appendChild(el('h3', 'search-section-label', `Verified Flagship Schemes (${matchingFlagship.length})`));
      matchingFlagship.slice(0, 12).forEach(s => {
        const item = el('button', 'explorer-item');
        item.type = 'button';
        item.append(el('span', 'card-icon', '🏛️'));
        const content = el('div', 'card-content');
        content.append(el('span', 'card-title', (getActiveLang() === 'or' && s.title_or) ? s.title_or : s.title));
        content.append(el('span', 'card-meta', `${s.gov_level || 'Odisha'} · ${s.category} · ${s.benefit_summary || s.department}`));
        item.append(content);
        const arrow = el('span', 'card-arrow', '›');
        arrow.setAttribute('aria-hidden', 'true');
        item.append(arrow);
        item.addEventListener('click', () => openSchemeDetail(s.slug || s.id));
        flagshipWrap.appendChild(item);
      });
      searchItems.appendChild(flagshipWrap);
    }

    if (results.length) {
      searchItems.appendChild(el('h3', 'search-section-label', `Directory Categories & Schemes (${results.length})`));
    }

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
        el('p', '', 'Showing the first 200 directory results. Refine your search.')
      );
    }

    if (!results.length && !matchingFlagship.length) {
      searchItems.append(el('p', '', 'No matching schemes or directory categories found.'));
    }
  }

  function renderStatistics(data) {
    const container = $('statistics-grid');

    const tc = treeCountsCache || (data && data.counts) || null;
    const mainCount = tc && tc.sections != null
      ? Number(tc.sections)
      : sections.reduce((total, group) => total + (group.children || []).length, 0);

    const subCount = tc && tc.subcategories != null
      ? Number(tc.subcategories)
      : sections.reduce(
        (total, group) => total + (group.children || []).reduce(
          (sum, section) => sum + (section.children || []).length,
          0
        ),
        0
      );

    const detailCount = tc && tc.entries != null
      ? Number(tc.entries)
      : sections.reduce(
        (total, group) => total + (group.children || []).reduce(
          (sectionTotal, section) =>
            sectionTotal + (section.children || []).reduce(
              (subTotal, sub) => subTotal + (sub.children || []).length,
              0
            ),
          0
        ),
        0
      );

    const items = [
      ['🗂️', 'Navigation Groups', tc && tc.groups != null ? Number(tc.groups) : sections.length],
      ['📁', 'Main Scheme Sections', mainCount],
      ['📋', 'Subcategories', subCount],
      ['📝', 'Scheme Entries', detailCount]
    ];

    container.replaceChildren();

    items.forEach(([icon, label, value]) => {
      const card = el('div', 'stat-card');
      const symbol = el('span', 'stat-icon', icon);
      const content = el('div', 'stat-content');

      content.append(
        el('strong', 'stat-value', value.toLocaleString('en-IN'))
      );

      content.append(el('span', 'stat-label', label));
      card.append(symbol, content);
      container.append(card);
    });
  }

  function buildDashboard() {
    sectionsNav.replaceChildren();
    grid.replaceChildren();

    const overviewButton = el('button', 'side-link');
    overviewButton.type = 'button';
    overviewButton.dataset.sectionIndex = '-1';
    overviewButton.append(el('span', 'side-icon', '🏠'));
    overviewButton.append(el('span', 'side-title', 'Overview'));
    overviewButton.append(el('span', 'side-count', String(sections.length)));
    const overviewArrow = el('span', 'side-arrow', '›');
    overviewArrow.setAttribute('aria-hidden', 'true');
    overviewButton.append(overviewArrow);
    overviewButton.addEventListener('click', () => showOverview(true));
    sectionsNav.append(overviewButton);

    sections.forEach((section, index) => {
      const sectionIcon = section.icon_name || icons[index % icons.length];
      const sectionLabel = localizedNodeTitle(section);
      const navButton = el('button', 'side-link');
      navButton.type = 'button';
      navButton.dataset.sectionIndex = String(index);
      navButton.append(el('span', 'side-icon', sectionIcon));
      navButton.append(el('span', 'side-title', sectionLabel));
      const directSections = (section.children || []).length;
      const categories = countNodes(section.children || []);
      const entries = countEntries(section.children || []);
      if (categories > 0) {
        navButton.append(el('span', 'side-count', String(entries || categories)));
      }
      const sideArrow = el('span', 'side-arrow', '›');
      sideArrow.setAttribute('aria-hidden', 'true');
      navButton.append(sideArrow);
      navButton.addEventListener('click', () => openSection(index, true));
      sectionsNav.append(navButton);

      const card = el('button', 'dashboard-card');
      card.type = 'button';
      card.append(el('span', 'card-icon', sectionIcon));

      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', sectionLabel));
      const metaParts = [];
      if (directSections > 0) metaParts.push(`${directSections} sections`);
      if (categories > 0) metaParts.push(`${categories.toLocaleString('en-IN')} categories`);
      if (entries > 0) metaParts.push(`${entries.toLocaleString('en-IN')} entries`);
      content.append(el('span', 'card-meta', metaParts.length ? metaParts.join(' · ') : 'Explore category'));
      card.append(content);

      const arrow = el('span', 'card-arrow', '›');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(arrow);

      card.addEventListener('click', () => openSection(index, true));
      grid.append(card);
    });
  }

  backButton.addEventListener('click', () => {
    const hasSingleWrapper = isSingleWrapperSection(currentSection);
    const isAtSectionRoot = path.length === 0 || (hasSingleWrapper && path.length === 1 && path[0] === 0);

    if (!isAtSectionRoot && path.length > 0) {
      path.pop();
      updateUrlState(true);
      renderExplorer();
    } else {
      showOverview(true);
    }
  });

  const backdrop = ensureDrawerBackdrop();
  backdrop.addEventListener('click', closeMobileMenu);

  const sidebarClose = document.getElementById('sidebar-close');
  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeMobileMenu);
  }

  const SIDEBAR_PREF_KEY = 'cso_schemes_sidebar_collapsed';
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
    showOverview();
    search.focus();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (document.body.classList.contains('menu-open')) {
        event.preventDefault();
        closeMobileMenu();
        return;
      }
    }

    if (event.key === 'Tab' && document.body.classList.contains('menu-open')) {
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
    const requestedQ = params.get('q');
    if (requestedQ && search) {
      search.value = requestedQ;
      renderSearch();
      return;
    }

    const requestedGroup = params.get('group');
    const requestedSection = params.get('section');
    const targetSlug = requestedGroup || requestedSection;

    if (targetSlug !== null && targetSlug !== '') {
      let idx = resolveSectionIndex(targetSlug);
      let directPath = null;
      if (idx === -1 && requestedSection) {
        sections.forEach((grp, gIdx) => {
          (grp.children || []).forEach((sec, sIdx) => {
            if (idx === -1 && (sec.slug === requestedSection || slugify(sec.title) === slugify(requestedSection))) {
              idx = gIdx;
              directPath = [sIdx];
            }
          });
        });
      }
      if (idx !== -1 && idx < sections.length) {
        currentSection = idx;
        path = directPath || [];

        const hasSingleWrapper = isSingleWrapperSection(idx);
        const requestedPath = params.get('path');
        if (!directPath && requestedPath !== null) {
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

        if (path.length === 0 && hasSingleWrapper) {
          path = [0];
        }

        search.value = '';
        clearSearch.hidden = true;
        renderExplorer();
        updateUrlState(false, true);
        closeMobileMenu();
        return;
      }
    }

    showOverview(false);
  }

  window.addEventListener('popstate', () => {
    syncFromUrl(false);
  });

  const homeLink = document.querySelector('.home-link');
  if (homeLink) {
    homeLink.addEventListener('click', e => {
      e.preventDefault();
      showOverview(true);
    });
  }

  const brandLink = sidebar.querySelector('.brand');
  if (brandLink) {
    brandLink.addEventListener('click', e => {
      e.preventDefault();
      showOverview(true);
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
      const raw = localStorage.getItem('cso_schemes_recursive_tree_v2') || localStorage.getItem('cso_schemes_recursive_tree_v1');
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

  async function loadDirectoryFromD1OrStatic() {
    const liveSections = loadSuperStoreTree();
    if (liveSections) {
      sections = liveSections;
      buildDashboard();
      renderStatistics({ navigation: liveSections });
      syncFromUrl(false);
      if (loadStatus) loadStatus.hidden = true;
      return;
    }

    try {
      const apiRes = await fetch('/api/content/schemes-directory', { credentials: 'same-origin' });
      if (apiRes.ok) {
        const d1Data = await apiRes.json();
        if (Array.isArray(d1Data.groups) && d1Data.groups.length > 0) {
          treeCountsCache = d1Data.total_counts || d1Data.counts || null;
          sections = d1Data.groups.map(group => ({
            id: group.id,
            slug: group.slug,
            number: group.number,
            title: group.title,
            title_or: group.title_or || '',
            subtitle: group.subtitle || '',
            subtitle_or: group.subtitle_or || '',
            icon_name: group.icon_name || '🗂️',
            official_url: group.official_url || '',
            children: group.sections || [],
            notes: []
          }));
          buildDashboard();
          renderStatistics(d1Data);
          syncFromUrl(false);
          if (loadStatus) loadStatus.hidden = true;
          return;
        }
      }
    } catch (_) {}

    try {
      const response = await fetch('./generated/directory.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.navigation) || data.navigation.length !== 8) {
        throw new Error('Invalid Schemes & Benefits directory structure');
      }
      sections = data.navigation.map(group => ({
        number: group.number,
        title: group.title,
        children: group.sections || [],
        notes: []
      }));
      buildDashboard();
      renderStatistics(data);
      syncFromUrl(false);
      if (loadStatus) loadStatus.hidden = true;
    } catch (error) {
      if (loadStatus) loadStatus.textContent = 'Unable to load directory: ' + error.message;
    }
  }

  loadDirectoryFromD1OrStatic();

  // Live D1 Schemes Directory + Interactive Check My Scheme Eligibility + Compare + Detail Modal
  const liveSchemesGrid = document.getElementById('live-schemes-grid');
  const liveSchemesStatus = document.getElementById('live-schemes-status');
  const liveSchemesCount = document.getElementById('live-schemes-count');
  const eligForm = document.getElementById('scheme-elig-form');
  const eligResetBtn = document.getElementById('scheme-elig-reset');
  const schemeQEl = document.getElementById('scheme-q');
  const schemeGovEl = document.getElementById('scheme-gov');
  const schemeGroupEl = document.getElementById('scheme-group');
  const schemeGenderEl = document.getElementById('scheme-gender');
  const schemeBenEl = document.getElementById('scheme-beneficiary');
  const schemeAgeEl = document.getElementById('scheme-age');
  const schemeIncomeEl = document.getElementById('scheme-income');
  const quickChips = Array.from(document.querySelectorAll('.scheme-chip[data-group]'));
  const statusPills = Array.from(document.querySelectorAll('.scheme-status-pill[data-status-label]'));

  const modalOverlay = document.getElementById('live-scheme-detail-modal');
  const modalCloseBtn = document.getElementById('live-scheme-detail-close');
  const modalActionsEl = document.getElementById('live-scheme-detail-actions');
  const modalBadgesEl = document.getElementById('live-scheme-detail-badges');
  const modalTitleEl = document.getElementById('live-scheme-detail-title');
  const modalTitleOrEl = document.getElementById('live-scheme-detail-title-or');
  const modalMetaEl = document.getElementById('live-scheme-detail-meta');
  const modalSummaryEl = document.getElementById('live-scheme-detail-summary');
  const modalSpecsEl = document.getElementById('live-scheme-detail-specs');
  const modalHelplineEl = document.getElementById('live-scheme-detail-helpline-bar');
  const modalDocsEl = document.getElementById('live-scheme-detail-docs');
  const modalTimelineEl = document.getElementById('live-scheme-detail-timeline');
  const modalExamCtaEl = document.getElementById('live-scheme-detail-exam-cta');
  const modalBodyEl = document.getElementById('live-scheme-detail-body');

  const compareBar = document.getElementById('scheme-compare-bar');
  const compareSummary = document.getElementById('scheme-compare-summary');
  const compareOpenBtn = document.getElementById('scheme-compare-open');
  const compareClearBtn = document.getElementById('scheme-compare-clear');
  const compareModal = document.getElementById('scheme-compare-modal');
  const compareCloseBtn = document.getElementById('scheme-compare-close');
  const comparePrintBtn = document.getElementById('scheme-compare-print');
  const compareTableWrap = document.getElementById('scheme-compare-table-wrap');

  const DOCS_CHECKED_KEY = 'cso_scheme_docs_checked_v1';
  const DOC_LOCKER_KEY = 'cso_doc_locker_v1';

  let schemeFilterState = { q: '', gov: '', group: '', gender: '', beneficiary: '', age: '', income: '', status_label: '' };
  let liveSchemesCache = [];
  let compareList = [];

  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJsonStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  function statusBadgeClass(label) {
    const t = String(label || '').toLowerCase();
    if (t.includes('closing')) return 'live-badge--closing';
    if (t.includes('renewal')) return 'live-badge--renewal';
    return 'live-badge--open';
  }

  function getNormalizedDocs(scheme) {
    if (Array.isArray(scheme.required_docs_json) && scheme.required_docs_json.length) {
      return scheme.required_docs_json.map(item => {
        if (item && typeof item === 'object') {
          return {
            doc: String(item.doc || item.name || ''),
            where: String(item.where || item.source || ''),
            mandatory: item.mandatory !== false
          };
        }
        return { doc: String(item || ''), where: '', mandatory: true };
      }).filter(d => d.doc);
    }
    if (Array.isArray(scheme.documents_required)) {
      return scheme.documents_required.map(d => ({ doc: String(d || ''), where: '', mandatory: true })).filter(d => d.doc);
    }
    return [];
  }

  async function pinDocsToLocker(scheme, docs, triggerBtn) {
    const entry = {
      scheme_slug: scheme.slug || scheme.id,
      scheme_title: scheme.title,
      apply_url: scheme.apply_url || '',
      helpline: scheme.helpline || '',
      pinned_at: new Date().toISOString(),
      docs: docs.map(d => d.doc)
    };

    const existing = readJsonStorage(DOC_LOCKER_KEY, []);
    const next = [entry, ...(Array.isArray(existing) ? existing.filter(x => x.scheme_slug !== entry.scheme_slug) : [])].slice(0, 40);
    writeJsonStorage(DOC_LOCKER_KEY, next);

    try {
      if (window.CSOIdb && typeof window.CSOIdb.put === 'function') {
        await window.CSOIdb.put('bookmarks', {
          id: 'locker:' + entry.scheme_slug,
          type: 'scheme_docs',
          title: 'Docs Checklist: ' + scheme.title,
          badge: docs.length + ' Documents',
          url: '/schemes-benefits/?scheme=' + encodeURIComponent(entry.scheme_slug),
          updatedAt: Date.now()
        });
      }
    } catch (_) {}

    try {
      await fetch('/api/candidate/bookmarks', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmark_type: 'schemes',
          item_id: 'docs-' + String(scheme.slug || scheme.id || '').slice(0, 60),
          title: 'Docs: ' + String(scheme.title || '').slice(0, 140),
          url: '/schemes-benefits/?scheme=' + encodeURIComponent(entry.scheme_slug)
        })
      });
    } catch (_) {}

    if (triggerBtn) {
      triggerBtn.textContent = '✓ Pinned to Dashboard Locker';
      triggerBtn.disabled = true;
      setTimeout(() => {
        triggerBtn.textContent = '📌 Pin Required Docs to My Dashboard Locker';
        triggerBtn.disabled = false;
      }, 2600);
    }
  }

  function makeSchemeBookmarkBtn(scheme) {
    const btn = el('button', 'cso-bookmark-btn scheme-btn');
    btn.type = 'button';
    btn.dataset.bookmarkType = 'schemes';
    btn.dataset.bookmarkId = String(scheme.id || scheme.slug || '');
    btn.dataset.bookmarkTitle = String(scheme.title || 'Govt Scheme');
    btn.dataset.bookmarkBadge = `${scheme.gov_level || 'Odisha'} Scheme`;
    btn.dataset.bookmarkUrl = `/schemes-benefits/?scheme=${encodeURIComponent(scheme.slug || scheme.id || '')}`;
    const star = el('span', 'cso-bm-star', '☆');
    star.setAttribute('aria-hidden', 'true');
    const lbl = el('span', 'cso-bm-text', 'Save');
    btn.append(star, document.createTextNode(' '), lbl);
    return btn;
  }

  function makeSchemeWhatsAppBtn(scheme) {
    const url = `${window.location.origin}/schemes-benefits/?scheme=${encodeURIComponent(scheme.slug || scheme.id || '')}`;
    const text = `${scheme.title} — ${scheme.benefit_summary || scheme.summary || 'Govt Welfare Scheme'} ${url}`;
    const a = el('a', 'scheme-btn scheme-btn--wa', '📲 Share');
    a.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Share scheme on WhatsApp');
    return a;
  }

  function syncCompareUI() {
    if (!compareBar || !compareSummary) return;
    if (compareList.length === 0) {
      compareBar.hidden = true;
    } else {
      compareBar.hidden = false;
      compareSummary.textContent = `${compareList.length} of 3 schemes selected for comparison`;
    }
    if (liveSchemesGrid) {
      liveSchemesGrid.querySelectorAll('.scheme-btn--compare').forEach(btn => {
        const key = btn.dataset.schemeSlug;
        const active = compareList.some(s => (s.slug || s.id) === key);
        btn.classList.toggle('is-selected', active);
        btn.textContent = active ? '✓ Comparing' : '+ Compare';
        btn.setAttribute('aria-pressed', String(active));
      });
    }
  }

  function toggleCompareScheme(scheme) {
    const key = scheme.slug || scheme.id;
    const idx = compareList.findIndex(s => (s.slug || s.id) === key);
    if (idx !== -1) {
      compareList.splice(idx, 1);
    } else {
      if (compareList.length >= 3) compareList.shift();
      compareList.push(scheme);
    }
    syncCompareUI();
  }

  function openCompareModal() {
    if (!compareModal || !compareTableWrap || compareList.length === 0) return;
    compareTableWrap.replaceChildren();
    const table = el('table', 'scheme-compare-table');
    const thead = el('thead');
    const headRow = el('tr');
    headRow.appendChild(el('th', '', 'Parameter'));
    compareList.forEach(s => {
      headRow.appendChild(el('th', '', (getActiveLang() === 'or' && s.title_or) ? s.title_or : s.title));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    const rows = [
      ['Government Level', s => `${s.gov_level || 'Odisha'} (${s.category || 'Welfare'})`],
      ['Financial / Key Benefit', s => (getActiveLang() === 'or' && s.benefit_summary_or) ? s.benefit_summary_or : (s.benefit_summary || 'See portal')],
      ['Age Limit', s => (s.min_age != null || s.max_age != null) ? `${s.min_age != null ? s.min_age : 0}–${s.max_age != null ? s.max_age : 'No limit'} yrs` : 'All ages'],
      ['Income Limit', s => s.max_income != null ? `≤ ₹${Number(s.max_income).toLocaleString('en-IN')}/yr` : 'Refer guidelines'],
      ['Disbursement Mode', s => s.disbursement_mode || 'DBT / Portal Transfer'],
      ['Application Window', s => s.application_status_label || 'Open Year-Round'],
      ['Required Documents', s => `${getNormalizedDocs(s).length} core docs (${getNormalizedDocs(s).slice(0, 2).map(d => d.doc).join(', ')}…)`],
      ['Official Helpline', s => s.helpline || 'See portal'],
      ['Official Apply Link', s => s.apply_url || 'Check scheme details']
    ];

    rows.forEach(([label, fn]) => {
      const tr = el('tr');
      tr.appendChild(el('th', '', label));
      compareList.forEach(s => {
        const val = fn(s);
        const td = el('td');
        if (label === 'Official Apply Link' && s.apply_url && (!window.CSOPublicContent || window.CSOPublicContent.safeHref(s.apply_url))) {
          const a = el('a', 'scheme-btn scheme-btn--primary', 'Apply Portal ↗');
          a.href = s.apply_url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer nofollow';
          td.appendChild(a);
        } else {
          td.textContent = val;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    compareTableWrap.appendChild(table);
    compareModal.hidden = false;
    document.body.classList.add('is-scheme-modal-open');
  }

  function closeCompareModal() {
    if (!compareModal) return;
    compareModal.hidden = true;
    if (!modalOverlay || modalOverlay.hidden) {
      document.body.classList.remove('is-scheme-modal-open');
    }
  }

  function schemeToJsonLd(scheme) {
    return {
      '@type': 'GovernmentService',
      name: scheme.title,
      serviceType: scheme.category || 'Welfare Scheme',
      description: scheme.summary || scheme.benefit_summary || scheme.title,
      provider: {
        '@type': 'GovernmentOrganization',
        name: scheme.department || (scheme.gov_level === 'Central' ? 'Government of India' : 'Government of Odisha')
      },
      areaServed: {
        '@type': 'AdministrativeArea',
        name: scheme.gov_level === 'Central' ? 'India' : 'Odisha, India'
      },
      url: `${window.location.origin}/schemes-benefits/?scheme=${encodeURIComponent(scheme.slug || scheme.id || '')}`
    };
  }

  function injectSchemesJsonLd(payload) {
    if (!payload || !document.head) return;
    let tag = document.getElementById('cso-scheme-jsonld');
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = 'cso-scheme-jsonld';
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(payload);
  }

  function closeSchemeDetail(pushHistory) {
    if (!modalOverlay) return;
    modalOverlay.hidden = true;
    if (!compareModal || compareModal.hidden) {
      document.body.classList.remove('is-scheme-modal-open');
    }
    if (pushHistory) {
      try {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('scheme');
        window.history.replaceState({}, '', nextUrl.toString());
      } catch (_) {}
    }
  }

  async function openSchemeDetail(slugOrId, updateUrl = true) {
    if (!modalOverlay || !slugOrId) return;
    modalOverlay.hidden = false;
    document.body.classList.add('is-scheme-modal-open');
    modalTitleEl.textContent = 'Loading scheme details…';
    if (modalTitleOrEl) { modalTitleOrEl.hidden = true; modalTitleOrEl.textContent = ''; }
    if (modalBadgesEl) modalBadgesEl.replaceChildren();
    if (modalMetaEl) modalMetaEl.replaceChildren();
    if (modalSummaryEl) { modalSummaryEl.hidden = true; modalSummaryEl.textContent = ''; }
    if (modalSpecsEl) modalSpecsEl.replaceChildren();
    if (modalHelplineEl) { modalHelplineEl.hidden = true; modalHelplineEl.replaceChildren(); }
    if (modalDocsEl) { modalDocsEl.hidden = true; modalDocsEl.replaceChildren(); }
    if (modalTimelineEl) { modalTimelineEl.hidden = true; modalTimelineEl.replaceChildren(); }
    if (modalExamCtaEl) { modalExamCtaEl.hidden = true; modalExamCtaEl.replaceChildren(); }
    if (modalActionsEl) modalActionsEl.replaceChildren();
    if (modalBodyEl) modalBodyEl.replaceChildren();

    if (updateUrl) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('scheme', slugOrId);
        window.history.replaceState({}, '', u.toString());
      } catch (_) {}
    }

    try {
      let scheme = liveSchemesCache.find(s => s.slug === slugOrId || s.id === slugOrId);
      const res = await fetch(`/api/content/schemes/${encodeURIComponent(slugOrId)}`, { credentials: 'same-origin' });
      if (res.ok) scheme = await res.json();
      if (!scheme) throw new Error('Scheme not found');

      const isOdia = getActiveLang() === 'or';
      modalTitleEl.textContent = (isOdia && scheme.title_or) ? scheme.title_or : scheme.title;
      if (scheme.title_or && !isOdia && modalTitleOrEl) {
        modalTitleOrEl.textContent = scheme.title_or;
        modalTitleOrEl.hidden = false;
      }

      if (modalBadgesEl) {
        modalBadgesEl.appendChild(el('span', `live-badge ${scheme.gov_level === 'Central' ? 'live-badge--central' : ''}`, scheme.gov_level === 'Central' ? '🇮🇳 Central Govt' : '🟢 Odisha Govt'));
        if (scheme.category) modalBadgesEl.appendChild(el('span', 'live-badge', scheme.category));
        if (scheme.application_status_label) {
          modalBadgesEl.appendChild(el('span', `live-badge ${statusBadgeClass(scheme.application_status_label)}`, scheme.application_status_label));
        }
        if (scheme.verified_date) {
          modalBadgesEl.appendChild(el('span', 'live-badge live-badge--verified', `✓ Verified ${scheme.verified_date}`));
        }
        if (scheme.is_featured) modalBadgesEl.appendChild(el('span', 'live-badge live-badge--featured', '★ Flagship'));
      }

      if (modalMetaEl) {
        if (scheme.department) modalMetaEl.appendChild(el('span', '', `🏛 ${scheme.department}`));
        if (scheme.gender_eligible && scheme.gender_eligible !== 'all') {
          modalMetaEl.appendChild(el('span', '', `👤 Eligible Gender: ${scheme.gender_eligible}`));
        }
      }

      const summaryTxt = (isOdia && scheme.summary_or) ? scheme.summary_or : (scheme.summary || scheme.benefit_summary);
      if (summaryTxt && modalSummaryEl) {
        modalSummaryEl.textContent = summaryTxt;
        modalSummaryEl.hidden = false;
      }

      if (modalSpecsEl) {
        const specs = [
          { label: 'Financial / Key Benefit', val: (isOdia && scheme.benefit_summary_or) ? scheme.benefit_summary_or : (scheme.benefit_summary || 'See portal guidelines') },
          { label: 'Age & Income Criteria', val: `${(scheme.min_age != null || scheme.max_age != null) ? `${scheme.min_age != null ? scheme.min_age : 0}–${scheme.max_age != null ? scheme.max_age : 'Any'} yrs` : 'All ages'} · ${scheme.max_income != null ? `≤ ₹${Number(scheme.max_income).toLocaleString('en-IN')}/yr` : 'Refer norms'}` },
          { label: 'Disbursement Mode', val: scheme.disbursement_mode || 'DBT / Official Portal' }
        ];
        specs.forEach(sp => {
          const box = el('div', 'live-spec-box');
          box.appendChild(el('span', 'live-spec-label', sp.label));
          box.appendChild(el('span', 'live-spec-value', sp.val));
          modalSpecsEl.appendChild(box);
        });
      }

      if (modalHelplineEl && (scheme.helpline || scheme.verified_date)) {
        const metaWrap = el('div', 'live-scheme-helpline__meta');
        if (scheme.helpline) metaWrap.appendChild(el('strong', '', `📞 Helpline: ${scheme.helpline}`));
        if (scheme.verified_date) metaWrap.appendChild(el('span', '', `Verified on Official Portal: ${scheme.verified_date}`));
        modalHelplineEl.appendChild(metaWrap);
        if (scheme.helpline) {
          const copyBtn = el('button', 'scheme-btn', '📋 Copy Helpline');
          copyBtn.type = 'button';
          copyBtn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(scheme.helpline);
              copyBtn.textContent = '✓ Helpline Copied';
            } catch (_) {
              copyBtn.textContent = scheme.helpline;
            }
            setTimeout(() => { copyBtn.textContent = '📋 Copy Helpline'; }, 2200);
          });
          modalHelplineEl.appendChild(copyBtn);
        }
        modalHelplineEl.hidden = false;
      }

      const docsList = getNormalizedDocs(scheme);
      if (docsList.length && modalDocsEl) {
        const head = el('div', 'live-scheme-docs__head');
        head.appendChild(el('h4', '', '📋 Interactive Required Documents Checklist'));
        const pinBtn = el('button', 'scheme-btn scheme-btn--primary', '📌 Pin Required Docs to My Dashboard Locker');
        pinBtn.type = 'button';
        pinBtn.addEventListener('click', () => pinDocsToLocker(scheme, docsList, pinBtn));
        head.appendChild(pinBtn);

        const ul = el('ul', 'live-scheme-checklist');
        const checkedMap = readJsonStorage(DOCS_CHECKED_KEY, {});
        const schemeKey = scheme.slug || scheme.id;
        docsList.forEach((item, idx) => {
          const li = el('li');
          const lbl = el('label', 'live-scheme-check-item');
          const cb = el('input');
          cb.type = 'checkbox';
          const checkKey = `${schemeKey}:${idx}`;
          cb.checked = Boolean(checkedMap[checkKey]);
          cb.addEventListener('change', () => {
            const latest = readJsonStorage(DOCS_CHECKED_KEY, {});
            if (cb.checked) latest[checkKey] = true;
            else delete latest[checkKey];
            writeJsonStorage(DOCS_CHECKED_KEY, latest);
          });
          const textWrap = el('div');
          textWrap.appendChild(el('strong', '', `${item.doc}${item.mandatory === false ? ' (If applicable)' : ''}`));
          if (item.where) {
            textWrap.appendChild(el('span', 'live-scheme-check-item__where', `Source: ${item.where}`));
          }
          lbl.append(cb, textWrap);
          li.appendChild(lbl);
          ul.appendChild(li);
        });
        modalDocsEl.append(head, ul);
        modalDocsEl.hidden = false;
      }

      const steps = Array.isArray(scheme.application_steps_json) ? scheme.application_steps_json : [];
      if (steps.length && modalTimelineEl) {
        modalTimelineEl.appendChild(el('h4', '', '🗓 Application Steps & Verification Flow'));
        const ol = el('ol', 'live-scheme-steps');
        steps.forEach(st => ol.appendChild(el('li', '', String(st))));
        modalTimelineEl.appendChild(ol);
        modalTimelineEl.hidden = false;
      }

      if (scheme.exam_slug && modalExamCtaEl) {
        modalExamCtaEl.appendChild(el('span', '', `🎓 Preparing for ${scheme.exam_slug.toUpperCase()} scholarship or civil service test?`));
        const examLinkWrap = el('div', 'live-scheme-detail__actions');
        const resLink = el('a', 'scheme-btn scheme-btn--primary', 'Open Exam Syllabus & PYQs →');
        resLink.href = `/resources/?exam=${encodeURIComponent(scheme.exam_slug)}`;
        const mockLink = el('a', 'scheme-btn', 'Practice Mock Drill →');
        mockLink.href = `/mock-tests/?exam=${encodeURIComponent(scheme.exam_slug)}`;
        examLinkWrap.append(resLink, mockLink);
        modalExamCtaEl.appendChild(examLinkWrap);
        modalExamCtaEl.hidden = false;
      }

      const pc = window.CSOPublicContent;
      if (scheme.apply_url && modalActionsEl && (!pc || pc.safeHref(scheme.apply_url))) {
        const applyA = el('a', 'scheme-btn scheme-btn--primary', 'Official Portal / Apply ↗');
        applyA.href = scheme.apply_url;
        applyA.target = '_blank';
        applyA.rel = 'noopener noreferrer nofollow';
        modalActionsEl.appendChild(applyA);
      }
      if (modalActionsEl) {
        const printBtn = el('button', 'scheme-btn', '🖨 Print / Save Slip');
        printBtn.type = 'button';
        printBtn.addEventListener('click', () => window.print());
        modalActionsEl.appendChild(printBtn);
        modalActionsEl.appendChild(makeSchemeWhatsAppBtn(scheme));
        modalActionsEl.appendChild(makeSchemeBookmarkBtn(scheme));
      }

      const bodyHtml = (isOdia && scheme.body_html_or) ? scheme.body_html_or : scheme.body_html;
      if (bodyHtml && pc && typeof pc.renderSanitizedHtml === 'function') {
        pc.renderSanitizedHtml(modalBodyEl, bodyHtml);
      } else if (modalBodyEl) {
        modalBodyEl.replaceChildren(el('p', '', scheme.benefit_summary || scheme.summary || 'Visit the official government portal linked above for application steps and verification guidelines.'));
      }

      injectSchemesJsonLd(Object.assign({ '@context': 'https://schema.org' }, schemeToJsonLd(scheme)));
      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      modalTitleEl.textContent = 'Unable to load scheme';
      if (modalBodyEl) modalBodyEl.replaceChildren(el('p', '', err.message || 'Please try again.'));
    }
  }

  function renderSchemeCard(scheme) {
    const isOdia = getActiveLang() === 'or';
    const card = el('article', 'live-scheme-card');
    const top = el('div');

    const badges = el('div', 'live-scheme-card__badges');
    badges.appendChild(el('span', `live-badge ${scheme.gov_level === 'Central' ? 'live-badge--central' : ''}`, scheme.gov_level === 'Central' ? '🇮🇳 Central' : '🟢 Odisha'));
    if (scheme.category) badges.appendChild(el('span', 'live-badge', scheme.category));
    if (scheme.application_status_label) {
      badges.appendChild(el('span', `live-badge ${statusBadgeClass(scheme.application_status_label)}`, scheme.application_status_label));
    }
    if (scheme.verified_date) {
      badges.appendChild(el('span', 'live-badge live-badge--verified', `✓ ${scheme.verified_date}`));
    }
    if (scheme.is_featured) badges.appendChild(el('span', 'live-badge live-badge--featured', '★ Flagship'));
    top.appendChild(badges);

    top.appendChild(el('h3', 'live-scheme-card__title', (isOdia && scheme.title_or) ? scheme.title_or : scheme.title));
    const summaryText = (isOdia && scheme.summary_or) ? scheme.summary_or : (scheme.summary || scheme.benefit_summary || '');
    if (summaryText) top.appendChild(el('p', 'live-scheme-card__summary', summaryText));

    const meta = el('div', 'live-scheme-card__meta');
    if (scheme.benefit_summary) meta.appendChild(el('span', 'live-meta-pill', `💰 ${(isOdia && scheme.benefit_summary_or) ? scheme.benefit_summary_or : scheme.benefit_summary}`));
    if (scheme.min_age != null || scheme.max_age != null) {
      meta.appendChild(el('span', 'live-meta-pill', `🎂 Age: ${scheme.min_age != null ? scheme.min_age : 0}–${scheme.max_age != null ? scheme.max_age : 'Any'}`));
    }
    if (scheme.max_income != null) {
      meta.appendChild(el('span', 'live-meta-pill', `📊 Income ≤ ₹${Number(scheme.max_income).toLocaleString('en-IN')}`));
    }
    top.appendChild(meta);
    card.appendChild(top);

    const footer = el('div', 'live-scheme-card__footer');
    const detailsBtn = el('button', 'scheme-btn scheme-btn--primary', 'View Eligibility & Docs');
    detailsBtn.type = 'button';
    detailsBtn.addEventListener('click', () => openSchemeDetail(scheme.slug || scheme.id));
    footer.appendChild(detailsBtn);

    const pc = window.CSOPublicContent;
    if (scheme.apply_url && (!pc || pc.safeHref(scheme.apply_url))) {
      const applyA = el('a', 'scheme-btn', 'Apply ↗');
      applyA.href = scheme.apply_url;
      applyA.target = '_blank';
      applyA.rel = 'noopener noreferrer nofollow';
      footer.appendChild(applyA);
    }

    const compareBtn = el('button', 'scheme-btn scheme-btn--compare', '+ Compare');
    compareBtn.type = 'button';
    compareBtn.dataset.schemeSlug = String(scheme.slug || scheme.id || '');
    const isSelected = compareList.some(s => (s.slug || s.id) === compareBtn.dataset.schemeSlug);
    if (isSelected) {
      compareBtn.classList.add('is-selected');
      compareBtn.textContent = '✓ Comparing';
    }
    compareBtn.setAttribute('aria-pressed', String(isSelected));
    compareBtn.addEventListener('click', () => toggleCompareScheme(scheme));
    footer.appendChild(compareBtn);

    footer.appendChild(makeSchemeWhatsAppBtn(scheme));
    footer.appendChild(makeSchemeBookmarkBtn(scheme));
    card.appendChild(footer);
    return card;
  }

  async function loadLiveSchemes() {
    if (!liveSchemesGrid || !liveSchemesStatus) return;
    const hasFilter = Object.values(schemeFilterState).some(v => String(v || '').trim() !== '');
    if (eligResetBtn) eligResetBtn.hidden = !hasFilter;

    liveSchemesStatus.hidden = false;
    liveSchemesStatus.textContent = 'Checking scheme eligibility in live D1 directory…';
    liveSchemesGrid.replaceChildren();

    const params = new URLSearchParams();
    if (schemeFilterState.q) params.set('q', schemeFilterState.q);
    if (schemeFilterState.gov) params.set('gov', schemeFilterState.gov);
    if (schemeFilterState.group) params.set('group', schemeFilterState.group);
    if (schemeFilterState.gender) params.set('gender', schemeFilterState.gender);
    if (schemeFilterState.beneficiary) params.set('beneficiary', schemeFilterState.beneficiary);
    if (schemeFilterState.age) params.set('age', schemeFilterState.age);
    if (schemeFilterState.income) params.set('income', schemeFilterState.income);
    if (schemeFilterState.status_label) params.set('status_label', schemeFilterState.status_label);

    try {
      const res = await fetch(`/api/content/schemes${params.toString() ? '?' + params.toString() : ''}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      liveSchemesCache = items;

      if (liveSchemesCount) {
        liveSchemesCount.textContent = `${items.length} ${items.length === 1 ? 'Eligible Scheme' : 'Eligible Schemes'}`;
      }

      if (items.length === 0) {
        liveSchemesStatus.hidden = false;
        liveSchemesStatus.textContent = 'No schemes match those exact age, income, or window filters. Try broadening or resetting your filters.';
        return;
      }

      liveSchemesStatus.hidden = true;
      const frag = document.createDocumentFragment();
      items.forEach(s => frag.appendChild(renderSchemeCard(s)));
      liveSchemesGrid.appendChild(frag);
      syncCompareUI();
      injectSchemesJsonLd({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: items.slice(0, 15).map((s, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: schemeToJsonLd(s)
        }))
      });
      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      if (liveSchemesCount) liveSchemesCount.textContent = 'Unavailable';
      liveSchemesStatus.hidden = false;
      liveSchemesStatus.textContent = `Unable to load schemes: ${err.message}`;
    }
  }

  function syncChipUI() {
    quickChips.forEach(chip => {
      const isAct = (chip.dataset.group || '') === schemeFilterState.group;
      chip.classList.toggle('is-active', isAct);
      chip.setAttribute('aria-pressed', String(isAct));
    });
    statusPills.forEach(pill => {
      const isAct = (pill.dataset.statusLabel || '') === schemeFilterState.status_label;
      pill.classList.toggle('is-active', isAct);
      pill.setAttribute('aria-pressed', String(isAct));
    });
  }

  if (eligForm) {
    eligForm.addEventListener('submit', e => {
      e.preventDefault();
      schemeFilterState.q = schemeQEl ? schemeQEl.value.trim() : '';
      schemeFilterState.gov = schemeGovEl ? schemeGovEl.value : '';
      schemeFilterState.group = schemeGroupEl ? schemeGroupEl.value : schemeFilterState.group;
      schemeFilterState.gender = schemeGenderEl ? schemeGenderEl.value : '';
      schemeFilterState.beneficiary = schemeBenEl ? schemeBenEl.value : '';
      schemeFilterState.age = schemeAgeEl ? schemeAgeEl.value.trim() : '';
      schemeFilterState.income = schemeIncomeEl ? schemeIncomeEl.value.trim() : '';
      syncChipUI();
      loadLiveSchemes();
    });
  }

  [schemeGovEl, schemeGroupEl, schemeGenderEl, schemeBenEl].forEach(sel => {
    if (sel) {
      sel.addEventListener('change', () => {
        if (sel === schemeGroupEl) schemeFilterState.group = sel.value;
        if (sel === schemeGovEl) schemeFilterState.gov = sel.value;
        if (sel === schemeGenderEl) schemeFilterState.gender = sel.value;
        if (sel === schemeBenEl) schemeFilterState.beneficiary = sel.value;
        syncChipUI();
        loadLiveSchemes();
      });
    }
  });

  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      schemeFilterState.group = chip.dataset.group || '';
      if (schemeGroupEl) schemeGroupEl.value = schemeFilterState.group;
      syncChipUI();
      loadLiveSchemes();
    });
  });

  statusPills.forEach(pill => {
    pill.addEventListener('click', () => {
      schemeFilterState.status_label = pill.dataset.statusLabel || '';
      syncChipUI();
      loadLiveSchemes();
    });
  });

  if (eligResetBtn) {
    eligResetBtn.addEventListener('click', () => {
      schemeFilterState = { q: '', gov: '', group: '', gender: '', beneficiary: '', age: '', income: '', status_label: '' };
      if (schemeQEl) schemeQEl.value = '';
      if (schemeGovEl) schemeGovEl.value = '';
      if (schemeGroupEl) schemeGroupEl.value = '';
      if (schemeGenderEl) schemeGenderEl.value = '';
      if (schemeBenEl) schemeBenEl.value = '';
      if (schemeAgeEl) schemeAgeEl.value = '';
      if (schemeIncomeEl) schemeIncomeEl.value = '';
      syncChipUI();
      loadLiveSchemes();
    });
  }

  if (compareOpenBtn) compareOpenBtn.addEventListener('click', openCompareModal);
  if (compareClearBtn) compareClearBtn.addEventListener('click', () => { compareList = []; syncCompareUI(); });
  if (compareCloseBtn) compareCloseBtn.addEventListener('click', closeCompareModal);
  if (comparePrintBtn) comparePrintBtn.addEventListener('click', () => window.print());
  if (compareModal) {
    compareModal.addEventListener('click', e => {
      if (e.target === compareModal) closeCompareModal();
    });
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeSchemeDetail(true));
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeSchemeDetail(true);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (compareModal && !compareModal.hidden) closeCompareModal();
        else if (!modalOverlay.hidden) closeSchemeDetail(true);
      }
    });
  }

  window.addEventListener('cso:langchange', () => {
    loadLiveSchemes();
    if (sections.length) {
      buildDashboard();
      if (currentSection >= 0) renderExplorer();
      else setActiveSidebar();
    }
  });

  loadLiveSchemes();
  try {
    const sp = new URLSearchParams(window.location.search);
    const initialScheme = sp.get('scheme');
    if (initialScheme) openSchemeDetail(initialScheme, false);
  } catch (_) {}
})();
