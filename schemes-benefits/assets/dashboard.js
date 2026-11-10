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
      explorerItems.append(item);
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
      loadStatus.style.display = 'none';
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
})();
