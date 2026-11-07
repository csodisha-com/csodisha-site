(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const sectionsNav = $('side-navigation');
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

  function closeMobileMenu() {
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  function setActiveSidebar() {
    sectionsNav.querySelectorAll('.side-link').forEach(button => {
      const index = Number(button.dataset.sectionIndex);
      button.classList.toggle('active', index === currentSection);
      if (index === currentSection) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function renderBreadcrumb() {
    breadcrumb.replaceChildren();

    function addCrumb(label, action, isCurrent = false) {
      if (breadcrumb.childNodes.length) {
        breadcrumb.append(el('span', '', ' / '));
      }

      if (isCurrent) {
        const current = el('strong', '', label);
        current.setAttribute('aria-current', 'page');
        breadcrumb.append(current);
      } else {
        const button = el('button', 'breadcrumb-link', label);
        button.type = 'button';
        button.addEventListener('click', action);
        breadcrumb.append(button);
      }
    }

    addCrumb('CS Odisha', () => {
      window.location.href = '../index.html';
    });

    if (currentSection < 0) {
      addCrumb('Jobs & Careers', showOverview, true);
      return;
    }

    addCrumb('Jobs & Careers', showOverview);

    const section = sections[currentSection];
    addCrumb(
      section.title,
      () => {
        path = [];
        renderExplorer();
      },
      path.length === 0
    );

    let node = section;

    path.forEach((index, depth) => {
      node = node.children[index];
      const targetDepth = depth + 1;
      const label = (node.number ? node.number + ' ' : '') + node.title;

      addCrumb(
        label,
        () => {
          path = path.slice(0, targetDepth);
          renderExplorer();
        },
        targetDepth === path.length
      );
    });
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

      const label = el('span', '', entry.title);
      const arrow = el('span', '', '→');
      arrow.setAttribute('aria-hidden', 'true');

      button.append(label, arrow);
      button.addEventListener('click', () => {
        currentSection = entry.sectionIndex;
        path = [...entry.nodePath];
        search.value = '';
        clearSearch.hidden = true;
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

  function showOverview() {
    currentSection = -1;
    path = [];
    searchResults.hidden = true;
    explorer.hidden = true;
    overview.hidden = false;
    renderRecent();
    pageTitle.textContent = 'Jobs & Careers Explorer';
    pageDescription.textContent =
      'Explore opportunities, qualifications, courses, scholarships and career pathways.';
    renderBreadcrumb();
    setActiveSidebar();
    closeMobileMenu();
  }

  function openSection(index) {
    currentSection = index;
    path = [];

    // Skip a single redundant directory wrapper when it has subcategories.
    const children = sections[index].children || [];
    if (
      children.length === 1 &&
      (children[0].children || []).length > 0
    ) {
      path = [0];
    }

    search.value = '';
    clearSearch.hidden = true;
    renderExplorer();
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

    explorerDescription.textContent =
      children.length
        ? `${children.length} subcategories available`
        : 'Individual directory entries and supporting information';

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

      button.append(
        el('span', 'card-icon', icon),
        el('span', 'card-arrow', '›'),
        el('span', 'card-title', title)
      );

      if (nested > 0) {
        button.append(
          el('span', 'card-count',
            `${nested.toLocaleString('en-IN')} categories`)
        );
      }

      if (notes > 0) {
        button.append(
          el('span', 'card-count',
            `${notes.toLocaleString('en-IN')} entries & notes`)
        );
      }

      if (nested === 0 && notes === 0) {
        button.append(
          el('span', 'card-count', 'Explore category')
        );
      }

      button.addEventListener('click', () => {
        path.push(index);
        renderExplorer();
      });

      explorerItems.append(button);
    });

    for (const entry of node.notes || []) {
      const item = el('div', 'explorer-item leaf', entry.text);
      explorerItems.append(item);
    }

    if (!children.length && !(node.notes || []).length) {
      explorerItems.append(
        el('p', '', 'This category is ready for future information.')
      );
    }

    backButton.textContent = path.length
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

    pageTitle.textContent = 'Search Jobs & Careers';
    pageDescription.textContent = `Results for "${search.value.trim()}"`;
    breadcrumb.textContent = 'CS Odisha / Jobs & Careers / Search';

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

      const content = el('span');
      content.append(el('strong', '', result.label));
      content.append(el('div', '', result.trail));

      item.append(content);
      item.append(el('span', '', '›'));
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

  function renderStatistics(data) {
    const container = $('statistics-grid');
    const stats = data.statistics || {};

    const topLevelCount = sections.reduce(
      (total, section) => total + (section.children || []).length,
      0
    );

    const numberedCount = sections.reduce(
      (total, section) => total + countNodes(section.children || []),
      0
    );

    const noteCount = Number(stats.unnumbered_entries_and_notes);

    const items = [
      ['🗂️', 'Main Sections', sections.length],
      ['📁', 'Top-Level Categories', topLevelCount],
      ['📋', 'Numbered Categories', numberedCount],
      [
        '📝',
        'Entries & Notes',
        Number.isFinite(noteCount) ? noteCount : '—'
      ]
    ];

    container.replaceChildren();

    items.forEach(([icon, label, value]) => {
      const card = el('div', 'stat-card');
      const symbol = el('span', 'stat-icon', icon);
      const content = el('div', 'stat-content');

      content.append(
        el(
          'strong',
          'stat-value',
          typeof value === 'number'
            ? value.toLocaleString('en-IN')
            : value
        )
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
    overviewButton.append(el('span', '', 'Overview'));
    overviewButton.append(el('span', 'side-arrow', '›'));
    overviewButton.addEventListener('click', showOverview);
    sectionsNav.append(overviewButton);

    sections.forEach((section, index) => {
      const navButton = el('button', 'side-link');
      navButton.type = 'button';
      navButton.dataset.sectionIndex = String(index);
      navButton.append(el('span', 'side-icon', icons[index]));
      navButton.append(el('span', '', section.title));
      navButton.append(el('span', 'side-arrow', '›'));
      navButton.addEventListener('click', () => openSection(index));
      sectionsNav.append(navButton);

      const card = el('button', 'dashboard-card');
      card.type = 'button';
      card.append(el('span', 'card-icon', icons[index]));
      card.append(el('span', 'card-arrow', '›'));
      card.append(el('span', 'card-title', section.title));
      const categories = countNodes(section.children || []);
      const entries = countNotes(section.children || []);

      card.append(
        el(
          'span',
          'card-count',
          `${categories.toLocaleString('en-IN')} categories`
        )
      );

      card.append(
        el(
          'span',
          'card-count',
          `${entries.toLocaleString('en-IN')} entries & notes`
        )
      );
      card.addEventListener('click', () => openSection(index));
      grid.append(card);
    });
  }

  backButton.addEventListener('click', () => {
    if (path.length) {
      path.pop();
      renderExplorer();
    } else {
      showOverview();
    }
  });

  menuToggle.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 760px)').matches) {
      const isOpen = document.body.classList.toggle('menu-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
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
    if (event.key === 'Escape') closeMobileMenu();
  });

  fetch('./generated/directory.json')
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.sections) || data.sections.length !== 8) {
        throw new Error('Invalid directory structure');
      }

      sections = data.sections;
      buildDashboard();
      renderStatistics(data);

      // Open a section selected from the homepage dropdown.
      // Without a section parameter, show the dashboard Overview.
      const requestedSection = new URLSearchParams(
        window.location.search
      ).get('section');

      if (
        requestedSection !== null &&
        /^[0-7]$/.test(requestedSection) &&
        Number(requestedSection) < sections.length
      ) {
        openSection(Number(requestedSection));

        // Optional deep link to a nested directory entry.
        // Example: ?section=0&path=0.1.2
        const requestedPath = new URLSearchParams(
          window.location.search
        ).get('path');

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

            for (const index of indexes) {
              if (
                !Array.isArray(node.children) ||
                index >= node.children.length
              ) {
                valid = false;
                break;
              }

              node = node.children[index];
            }

            if (valid) {
              path = indexes;
              renderExplorer();
            }
          }
        }
      } else {
        showOverview();
      }

      loadStatus.hidden = true;
    })
    .catch(error => {
      loadStatus.textContent = 'Unable to load directory: ' + error.message;
    });
})();
