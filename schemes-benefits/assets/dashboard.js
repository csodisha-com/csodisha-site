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

  const icons = ['💼','🧭','📋','📚','🎓','🌍','📈','🏛️'];

  let sections = [];
  let path = [];
  let currentSection = -1;

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
    const cleanTitle = node.title
      .replace(/\s+Directory$/i, '')
      .trim();

    pageTitle.textContent = cleanTitle;
    explorerTitle.textContent = '';
    pageDescription.textContent = '';
    renderBreadcrumb();
    setActiveSidebar();
    updateDocumentTitle(cleanTitle);

    explorerDescription.textContent =
      children.length
        ? `${children.length} subcategories available`
        : 'Detailed schemes and benefits categories';

    explorerItems.replaceChildren();

    children.forEach((child, index) => {
      const button = el('button', 'explorer-item dashboard-card');
      button.type = 'button';

      const symbols = [
        '💼', '🧭', '📋', '📚',
        '🎓', '🌍', '📈', '🏛️',
        '📝', '🔎', '💡', '🏆',
        '🗂️', '⚙️', '📌', '🎯'
      ];

      const icon = symbols[index % symbols.length];
      const title = (child.number ? child.number + ' ' : '') + child.title;
      const nested = countNodes(child.children || []);
      const notes = countNotes([child]);

      button.append(el('span', 'card-icon', icon));

      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', title));

      const metaParts = [];
      if (nested > 0) metaParts.push(`${nested.toLocaleString('en-IN')} categories`);
      if (notes > 0) metaParts.push(`${notes.toLocaleString('en-IN')} entries`);
      content.append(el('span', 'card-meta', metaParts.length ? metaParts.join(' · ') : 'Explore category'));
      button.append(content);

      const arrow = el('span', 'card-arrow', '›');
      arrow.setAttribute('aria-hidden', 'true');
      button.append(arrow);

      button.addEventListener('click', () => {
        path.push(index);
        updateUrlState(true);
        renderExplorer();
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
    searchStatus.textContent = `${results.length} matching categories found`;

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
      searchItems.append(el('p', '', 'No matching categories found.'));
    }
  }

  function renderStatistics(data) {
    const container = $('statistics-grid');

    const mainCount = sections.reduce(
      (total, group) => total + (group.children || []).length,
      0
    );

    const subCount = sections.reduce(
      (total, group) => total + (group.children || []).reduce(
        (sum, section) => sum + (section.children || []).length,
        0
      ),
      0
    );

    const detailCount = sections.reduce(
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
      ['🗂️', 'Navigation Groups', sections.length],
      ['📁', 'Original Main Sections', mainCount],
      ['📋', 'Subcategories', subCount],
      ['📝', 'Detailed Categories', detailCount]
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
      const navButton = el('button', 'side-link');
      navButton.type = 'button';
      navButton.dataset.sectionIndex = String(index);
      navButton.append(el('span', 'side-icon', icons[index % icons.length]));
      navButton.append(el('span', 'side-title', section.title));
      const categories = countNodes(section.children || []);
      if (categories > 0) {
        navButton.append(el('span', 'side-count', String(categories)));
      }
      const sideArrow = el('span', 'side-arrow', '›');
      sideArrow.setAttribute('aria-hidden', 'true');
      navButton.append(sideArrow);
      navButton.addEventListener('click', () => openSection(index, true));
      sectionsNav.append(navButton);

      const card = el('button', 'dashboard-card');
      card.type = 'button';
      card.append(el('span', 'card-icon', icons[index % icons.length]));

      const content = el('div', 'card-content');
      content.append(el('span', 'card-title', section.title));
      const entries = countNotes(section.children || []);
      const metaParts = [];
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

  menuToggle.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      if (document.body.classList.contains('menu-open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    } else {
      const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      menuToggle.setAttribute('aria-expanded', String(!isCollapsed));
      menuToggle.setAttribute(
        'aria-label',
        isCollapsed ? 'Expand navigation' : 'Collapse navigation'
      );
    }
  });

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
    const requestedSection = params.get('section');

    if (requestedSection !== null && requestedSection !== '') {
      const idx = resolveSectionIndex(requestedSection);
      if (idx !== -1 && idx < sections.length) {
        currentSection = idx;
        path = [];

        const hasSingleWrapper = isSingleWrapperSection(idx);
        const requestedPath = params.get('path');
        if (requestedPath !== null) {
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

  // 1. Prioritize SuperStore dynamic state engine
  const liveSections = loadSuperStoreTree();
  if (liveSections) {
    sections = liveSections;
    buildDashboard();
    renderStatistics({ navigation: liveSections });
    syncFromUrl(false);
    if (loadStatus) {
      loadStatus.hidden = true;
    }
  } else {
    // 2. Fallback to static JSON
    fetch('./generated/directory.json')
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(data => {
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

        loadStatus.hidden = true;
      })
      .catch(error => {
        loadStatus.textContent = 'Unable to load directory: ' + error.message;
      });
  }

  // Live D1 Schemes Directory + Interactive Check My Scheme Eligibility + Detail Modal
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

  const modalOverlay = document.getElementById('live-scheme-detail-modal');
  const modalCloseBtn = document.getElementById('live-scheme-detail-close');
  const modalActionsEl = document.getElementById('live-scheme-detail-actions');
  const modalBadgesEl = document.getElementById('live-scheme-detail-badges');
  const modalTitleEl = document.getElementById('live-scheme-detail-title');
  const modalTitleOrEl = document.getElementById('live-scheme-detail-title-or');
  const modalMetaEl = document.getElementById('live-scheme-detail-meta');
  const modalSummaryEl = document.getElementById('live-scheme-detail-summary');
  const modalSpecsEl = document.getElementById('live-scheme-detail-specs');
  const modalDocsEl = document.getElementById('live-scheme-detail-docs');
  const modalBodyEl = document.getElementById('live-scheme-detail-body');

  let schemeFilterState = { q: '', gov: '', group: '', gender: '', beneficiary: '', age: '', income: '' };
  let liveSchemesCache = [];

  function getActiveLang() {
    try {
      return localStorage.getItem('cso_lang_pref') === 'or' ? 'or' : 'en';
    } catch (_) {
      return 'en';
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
    document.body.classList.remove('is-scheme-modal-open');
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
    if (modalDocsEl) { modalDocsEl.hidden = true; modalDocsEl.replaceChildren(); }
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
          { label: 'Age Limit', val: (scheme.min_age != null || scheme.max_age != null) ? `${scheme.min_age != null ? scheme.min_age : 0} – ${scheme.max_age != null ? scheme.max_age : 'No upper'} yrs` : 'All eligible ages' },
          { label: 'Income Ceiling', val: scheme.max_income != null ? `Up to ₹${Number(scheme.max_income).toLocaleString('en-IN')}/yr` : 'Refer scheme norms' }
        ];
        specs.forEach(sp => {
          const box = el('div', 'live-spec-box');
          box.appendChild(el('span', 'live-spec-label', sp.label));
          box.appendChild(el('span', 'live-spec-value', sp.val));
          modalSpecsEl.appendChild(box);
        });
      }

      if (Array.isArray(scheme.documents_required) && scheme.documents_required.length && modalDocsEl) {
        const h4 = el('h4', '', '📋 Required Documents Checklist');
        const ul = el('ul');
        scheme.documents_required.forEach(doc => ul.appendChild(el('li', '', doc)));
        modalDocsEl.append(h4, ul);
        modalDocsEl.hidden = false;
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
    if (scheme.is_featured) badges.appendChild(el('span', 'live-badge live-badge--featured', '★ Flagship'));
    top.appendChild(badges);

    top.appendChild(el('h3', 'live-scheme-card__title', (isOdia && scheme.title_or) ? scheme.title_or : scheme.title));
    if (scheme.title_or && !isOdia) {
      top.appendChild(el('p', 'live-scheme-card__title-or', scheme.title_or));
    }
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
        liveSchemesStatus.textContent = 'No schemes match those exact age, income, or category filters. Try broadening or resetting your filters.';
        return;
      }

      liveSchemesStatus.hidden = true;
      const frag = document.createDocumentFragment();
      items.forEach(s => frag.appendChild(renderSchemeCard(s)));
      liveSchemesGrid.appendChild(frag);
      injectSchemesJsonLd({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: items.slice(0, 12).map((s, idx) => ({
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

  if (eligResetBtn) {
    eligResetBtn.addEventListener('click', () => {
      schemeFilterState = { q: '', gov: '', group: '', gender: '', beneficiary: '', age: '', income: '' };
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

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeSchemeDetail(true));
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeSchemeDetail(true);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modalOverlay.hidden) closeSchemeDetail(true);
    });
  }

  window.addEventListener('cso:langchange', loadLiveSchemes);

  loadLiveSchemes();
  try {
    const sp = new URLSearchParams(window.location.search);
    const initialScheme = sp.get('scheme');
    if (initialScheme) openSchemeDetail(initialScheme, false);
  } catch (_) {}
})();
