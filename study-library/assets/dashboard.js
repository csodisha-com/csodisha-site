/* Study Library Ecosystem v2 — Strict CSP DOM Builder */
(function () {
  'use strict';

  const RECENT_CONTINUE_KEY = 'cso_recent_study_v1';
  const RECENT_DIR_KEY = 'cso_study_recent_dir_v1';
  const SIDEBAR_COLLAPSE_KEY = 'cso_study_sidebar_collapsed';
  const LANG_PREF_KEY = 'cso_lang_pref';
  const SAVED_ITEMS_KEY = 'cso_saved_items_v1';
  const OFFLINE_INDEX_KEY = 'cso_study_offline_v1';

  const GROUP_ICONS = ['🧒', '🏫', '🎓', '📝', '💻', '📖', '🌍', '🏛️', '🗂️', '🧭'];

  const $ = id => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  // DOM Elements
  const sidebar = $('sidebar');
  const sideNav = $('side-navigation');
  const sidebarToggle = $('cso-sidebar-toggle');
  const sidebarToggleTop = $('cso-sidebar-toggle-top');
  const menuToggle = $('menu-toggle');
  const sidebarClose = $('sidebar-close');
  const sidebarBackdrop = $('sidebar-backdrop');
  const dirSearch = $('directory-search');
  const clearSearchBtn = $('clear-search');
  const breadcrumb = $('breadcrumb');
  const pageTitle = $('page-title');
  const pageDesc = $('page-description');
  const continueStrip = $('study-continue-strip');
  const continueList = $('study-continue-list');
  const continueClearBtn = $('study-continue-clear');
  const liveStudySection = $('live-study-section');
  const liveStudyCount = $('live-study-count');
  const studyQInput = $('study-q');
  const studyExamSelect = $('study-exam-filter');
  const studyTypePills = $('study-type-pills');
  const studyGoalBtn = $('study-goal-match');
  const studyResetBtn = $('study-filter-reset');
  const studyMaterialsGrid = $('study-materials-grid');
  const overviewEl = $('overview');
  const dashboardGrid = $('dashboard-grid');
  const syncBadge = $('directory-sync-badge');
  const statsGrid = $('statistics-grid');
  const recentSection = $('recent-section');
  const recentGrid = $('recent-grid');
  const clearRecentBtn = $('clear-recent');
  const explorerEl = $('explorer');
  const explorerTitle = $('explorer-title');
  const explorerDesc = $('explorer-description');
  const explorerItems = $('explorer-items');
  const backBtn = $('back-button');
  const searchResultsEl = $('search-results');
  const searchStatusEl = $('search-status');
  const searchLiveWrap = $('search-live-materials');
  const searchMaterialsGrid = $('search-materials-grid');
  const searchItemsEl = $('search-items');
  const loadStatusEl = $('load-status');
  const modalBackdrop = $('study-reader-modal');
  const modalBadges = $('study-modal-badges');
  const modalTitle = $('study-modal-title');
  const modalSub = $('study-modal-subtitle');
  const modalBody = $('study-modal-body');
  const modalCloseBtn = $('study-modal-close');
  const modalMockBtn = $('study-modal-mock-btn');
  const modalFlashBtn = $('study-modal-flashcard-btn');
  const modalOfflineBtn = $('study-modal-offline-btn');
  const modalPrintBtn = $('study-modal-print-btn');
  const modalOfficialBtn = $('study-modal-official-btn');
  const toastEl = $('study-toast');

  // Application State
  const state = {
    lang: getInitialLang(),
    resources: [],
    taxonomy: [],
    groups: [],
    counts: { groups: 0, sections: 0, subcategories: 0, entries: 0, totalNodes: 0 },
    filterType: '',
    filterExam: '',
    filterQ: '',
    goalMatchOnly: false,
    candidateGoals: [],
    savedIds: loadSavedIds(),
    offlineIds: loadOfflineIds(),
    view: 'overview', // 'overview' | 'group' | 'section' | 'subcategory' | 'search'
    groupIdx: -1,
    sectionIdx: -1,
    subIdx: -1,
    activeModalItem: null,
    toastTimer: null
  };

  function getInitialLang() {
    try {
      const pref = localStorage.getItem(LANG_PREF_KEY);
      if (pref === 'or' || pref === 'en') return pref;
    } catch {}
    return 'en';
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = String(msg);
    toastEl.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
  }

  function loadJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJsonStorage(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function loadSavedIds() {
    const arr = loadJsonStorage(SAVED_ITEMS_KEY, []);
    const set = new Set();
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (typeof item === 'string') set.add(item);
        else if (item && item.id) set.add(String(item.id));
      });
    }
    return set;
  }

  function loadOfflineIds() {
    const arr = loadJsonStorage(OFFLINE_INDEX_KEY, []);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  }

  function mockExamQuery(examSlug, examLabel) {
    const s = String(examSlug || examLabel || '').toLowerCase();
    if (s.includes('opsc') || s.includes('oas') || s.includes('ocs')) return 'OPSC';
    if (s.includes('ossc')) return 'OSSC';
    if (s.includes('osssc') || s.includes('ri-amin')) return 'OSSSC';
    if (s.includes('osstet')) return 'OSSTET';
    if (s.includes('otet') || s.includes('bed')) return 'OTET';
    if (s.includes('ctet')) return 'CTET';
    return examLabel ? String(examLabel).split(' ')[0] : '';
  }

  function formatResourceType(type) {
    if (type === 'pyq') return 'Previous Year Paper';
    if (type === 'study_notes') return 'Study Notes';
    if (type === 'odisha_gk') return 'Odisha GK';
    return 'Syllabus';
  }

  function isGoalMatchedResource(item) {
    if (!state.candidateGoals.length) return false;
    const hay = `${item.exam_slug || ''} ${item.exam || ''} ${item.title || ''}`.toLowerCase();
    return state.candidateGoals.some(g => g && hay.includes(String(g).toLowerCase()));
  }

  // ---- Sidebar Collapse & Mobile Drawer ----
  function applySidebarCollapsed(collapsed) {
    document.body.classList.toggle('cso-sidebar-collapsed', collapsed);
    [sidebarToggle, sidebarToggleTop].forEach(btn => {
      if (!btn) return;
      btn.setAttribute('aria-expanded', String(!collapsed));
      if (btn === sidebarToggle) btn.textContent = collapsed ? '▶' : '◀';
    });
    try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0'); } catch {}
  }

  function initSidebarControls() {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1' && window.innerWidth >= 769) {
        applySidebarCollapsed(true);
      }
    } catch {}
    [sidebarToggle, sidebarToggleTop].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        applySidebarCollapsed(!document.body.classList.contains('cso-sidebar-collapsed'));
      });
    });

    const closeMobile = () => {
      document.body.classList.remove('menu-open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    };
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        const open = !document.body.classList.contains('menu-open');
        document.body.classList.toggle('menu-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
      });
    }
    if (sidebarClose) sidebarClose.addEventListener('click', closeMobile);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobile);
  }

  // ---- Continue Where You Left Off ----
  function pushContinueItem(entry) {
    const list = loadJsonStorage(RECENT_CONTINUE_KEY, []);
    const filtered = (Array.isArray(list) ? list : []).filter(x => x && x.id !== entry.id);
    filtered.unshift({ ...entry, ts: Date.now() });
    saveJsonStorage(RECENT_CONTINUE_KEY, filtered.slice(0, 3));
    renderContinueStrip();
  }

  function renderContinueStrip() {
    if (!continueStrip || !continueList) return;
    const list = loadJsonStorage(RECENT_CONTINUE_KEY, []);
    continueList.replaceChildren();
    if (!Array.isArray(list) || !list.length) {
      continueStrip.hidden = true;
      return;
    }
    continueStrip.hidden = false;
    list.slice(0, 3).forEach(entry => {
      const btn = el('button', 'study-continue-chip', `${entry.icon || '📘'} ${entry.title}`);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (entry.kind === 'resource') {
          const found = state.resources.find(r => r.id === entry.id);
          if (found) { openStudyModal(found); return; }
        }
        if (typeof entry.groupIdx === 'number' && entry.groupIdx >= 0 && state.groups[entry.groupIdx]) {
          navigateToGroup(entry.groupIdx, typeof entry.sectionIdx === 'number' ? entry.sectionIdx : -1);
        }
      });
      continueList.appendChild(btn);
    });
  }

  // ---- Bookmarks, Offline & Flashcard Actions ----
  async function sendToFlashcards(title, backText, examLabel) {
    if (!window.CSOIdb || typeof window.CSOIdb.saveFlashcard !== 'function') {
      showToast('Flashcard store unavailable in this browser');
      return;
    }
    try {
      await window.CSOIdb.saveFlashcard({
        id: `study-fc-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
        front: title,
        back: backText || 'Verified Study Library note on Common Sense Odisha.',
        exam: examLabel || 'Odisha Study',
        intervalDays: 1
      });
      showToast('✓ Added to Student Dashboard Flashcards');
    } catch {
      showToast('Could not save flashcard locally');
    }
  }

  async function saveResourceOffline(item, btnEl) {
    const id = String(item.id);
    if (window.CSOIdb && typeof window.CSOIdb.putRecord === 'function') {
      try {
        await window.CSOIdb.putRecord(window.CSOIdb.STORE_META, {
          key: `study_offline:${id}`,
          value: { ...item, savedAt: new Date().toISOString() }
        });
      } catch {}
    }
    state.offlineIds.add(id);
    saveJsonStorage(OFFLINE_INDEX_KEY, [...state.offlineIds]);
    if (btnEl) {
      btnEl.textContent = '✓ Saved Offline';
      btnEl.classList.add('is-active');
    }
    if (modalOfflineBtn && state.activeModalItem && state.activeModalItem.id === id) {
      modalOfflineBtn.textContent = '✓ Saved Offline';
      modalOfflineBtn.classList.add('is-active');
    }
    showToast('📥 Saved to browser IndexedDB for offline revision');
  }

  async function toggleSaveResource(item, btnEl) {
    const id = String(item.id);
    const wasSaved = state.savedIds.has(id);
    if (wasSaved) state.savedIds.delete(id);
    else state.savedIds.add(id);

    const arr = loadJsonStorage(SAVED_ITEMS_KEY, []);
    const next = Array.isArray(arr) ? arr.filter(x => (typeof x === 'string' ? x : x.id) !== id) : [];
    if (!wasSaved) {
      next.unshift({
        id,
        type: 'resources',
        title: item.title,
        exam: item.exam,
        url: `./?resource=${encodeURIComponent(id)}`
      });
    }
    saveJsonStorage(SAVED_ITEMS_KEY, next);

    if (btnEl) {
      btnEl.textContent = wasSaved ? '☆ Save' : '★ Saved';
      btnEl.classList.toggle('is-active', !wasSaved);
    }

    // Best-effort sync to candidate bookmarks API if authenticated
    try {
      if (!wasSaved) {
        await fetch('/api/candidate/bookmarks', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookmark_type: 'resources',
            item_id: id,
            title: item.title,
            url: `/study-library/?resource=${encodeURIComponent(id)}`
          })
        });
      } else {
        await fetch(`/api/candidate/bookmarks/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        });
      }
    } catch {}
    showToast(wasSaved ? 'Removed from saved materials' : '★ Saved to Candidate Bookmarks');
  }

  async function shareResource(item) {
    const shareUrl = `${window.location.origin}/study-library/?resource=${encodeURIComponent(item.id)}`;
    const shareText = `${item.title} (${item.exam}) — Verified on Common Sense Odisha`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: shareText, url: shareUrl });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showToast('📲 Study link copied to clipboard');
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank', 'noopener');
    }
  }

  // ---- Study Brief & Syllabus Reader Modal ----
  function openStudyModal(item) {
    if (!modalBackdrop || !item) return;
    state.activeModalItem = item;
    pushContinueItem({ id: item.id, kind: 'resource', title: item.title, icon: '📖' });

    const useOdia = state.lang === 'or' && item.title_or;
    modalTitle.textContent = useOdia ? item.title_or : item.title;
    modalSub.textContent = useOdia ? item.title : (item.title_or || `${item.exam} · Verified Study Brief`);

    modalBadges.replaceChildren();
    modalBadges.append(
      el('span', 'study-badge study-badge--type', formatResourceType(item.resource_type)),
      el('span', 'study-badge study-badge--exam', item.exam || 'Odisha Exam')
    );
    if (item.verified_date) {
      modalBadges.append(el('span', 'study-badge study-badge--verified', `✓ Verified ${item.verified_date}`));
    }

    modalBody.replaceChildren();

    const overviewBox = el('div', 'study-modal-box');
    overviewBox.appendChild(el('h3', '', 'Overview & Official Scope'));
    const descText = state.lang === 'or' && item.description_or ? item.description_or : (item.description || '');
    overviewBox.appendChild(el('p', 'study-card-desc', descText));
    if (state.lang === 'en' && item.description_or) {
      overviewBox.appendChild(el('p', 'study-card-alt', item.description_or));
    }
    modalBody.appendChild(overviewBox);

    if (Array.isArray(item.syllabus_units) && item.syllabus_units.length) {
      const unitsBox = el('div', 'study-modal-box');
      unitsBox.appendChild(el('h3', '', 'Structured Syllabus & Paper Units'));
      const list = el('div', 'study-unit-list');
      item.syllabus_units.forEach(u => {
        const unitRow = el('div', 'study-unit-item');
        unitRow.appendChild(el('strong', '', u.unit || 'Unit'));
        unitRow.appendChild(el('span', '', u.topics || ''));
        list.appendChild(unitRow);
      });
      unitsBox.appendChild(list);
      modalBody.appendChild(unitsBox);
    }

    if (Array.isArray(item.key_takeaways) && item.key_takeaways.length) {
      const tkBox = el('div', 'study-modal-box');
      tkBox.appendChild(el('h3', '', 'High-Yield Exam Takeaways'));
      const ul = el('ul', 'study-takeaways-list');
      item.key_takeaways.forEach(pt => ul.appendChild(el('li', '', pt)));
      tkBox.appendChild(ul);
      modalBody.appendChild(tkBox);
    }

    const q = mockExamQuery(item.exam_slug, item.exam);
    if (modalMockBtn) modalMockBtn.href = q ? `../mock-tests/?exam=${encodeURIComponent(q)}` : '../mock-tests/';
    if (modalOfficialBtn) modalOfficialBtn.href = item.official_source_url || item.file_url || 'https://csodisha.com/study-library/';
    if (modalOfflineBtn) {
      const isOff = state.offlineIds.has(String(item.id));
      modalOfflineBtn.textContent = isOff ? '✓ Saved Offline' : '📥 Save Offline';
      modalOfflineBtn.classList.toggle('is-active', isOff);
    }

    modalBackdrop.hidden = false;
    if (modalCloseBtn) modalCloseBtn.focus();
  }

  function closeStudyModal() {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    state.activeModalItem = null;
  }

  // ---- Live Verified Study Materials Rendering ----
  function createMaterialCard(item) {
    const card = el('article', 'study-material-card');
    const goalMatch = isGoalMatchedResource(item);
    if (goalMatch) card.classList.add('is-goal-match');

    const top = el('div', 'study-card-top');
    top.append(
      el('span', 'study-badge study-badge--type', formatResourceType(item.resource_type)),
      el('span', 'study-badge study-badge--exam', item.exam || 'Exam')
    );
    if (item.verified_date) {
      top.append(el('span', 'study-badge study-badge--verified', `✓ ${item.verified_date}`));
    }
    if (goalMatch) {
      top.append(el('span', 'study-badge study-badge--goal', '★ Goal Match'));
    }
    card.appendChild(top);

    const showOr = state.lang === 'or';
    const primaryTitle = showOr && item.title_or ? item.title_or : item.title;
    const secondaryTitle = showOr ? item.title : item.title_or;
    card.appendChild(el('h3', 'study-card-title', primaryTitle));
    if (secondaryTitle) card.appendChild(el('p', 'study-card-alt', secondaryTitle));

    const primaryDesc = showOr && item.description_or ? item.description_or : item.description;
    if (primaryDesc) card.appendChild(el('p', 'study-card-desc', primaryDesc));

    const metaRow = el('div', 'study-card-meta');
    if (item.year) metaRow.appendChild(el('span', '', `📅 ${item.year} Cycle`));
    const unitCount = Array.isArray(item.syllabus_units) ? item.syllabus_units.length : 0;
    if (unitCount) metaRow.appendChild(el('span', '', `📚 ${unitCount} Units`));
    if (item.official_source_url) {
      try {
        const host = new URL(item.official_source_url).hostname.replace(/^www\./, '');
        metaRow.appendChild(el('span', '', `🏛 ${host}`));
      } catch {}
    }
    card.appendChild(metaRow);

    // Single-Row Action Bar
    const actions = el('div', 'study-card-actions');

    const readBtn = el('button', 'study-btn study-btn--primary', 'Read Brief');
    readBtn.type = 'button';
    readBtn.addEventListener('click', () => openStudyModal(item));

    const q = mockExamQuery(item.exam_slug, item.exam);
    const mockLink = el('a', 'study-btn', 'Start Mock →');
    mockLink.href = q ? `../mock-tests/?exam=${encodeURIComponent(q)}` : '../mock-tests/';

    const fcBtn = el('button', 'study-btn', '+ Flashcards');
    fcBtn.type = 'button';
    fcBtn.addEventListener('click', () => {
      const summary = Array.isArray(item.key_takeaways) && item.key_takeaways.length
        ? item.key_takeaways[0]
        : (item.description || '');
      sendToFlashcards(`${item.exam}: ${item.title}`, summary, item.exam);
    });

    const isOff = state.offlineIds.has(String(item.id));
    const offBtn = el('button', isOff ? 'study-btn is-active' : 'study-btn', isOff ? '✓ Saved Offline' : '📥 Offline');
    offBtn.type = 'button';
    offBtn.addEventListener('click', () => saveResourceOffline(item, offBtn));

    const shareBtn = el('button', 'study-btn', '📲 Share');
    shareBtn.type = 'button';
    shareBtn.addEventListener('click', () => shareResource(item));

    const isSaved = state.savedIds.has(String(item.id));
    const saveBtn = el('button', isSaved ? 'study-btn is-active' : 'study-btn', isSaved ? '★ Saved' : '☆ Save');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => toggleSaveResource(item, saveBtn));

    actions.append(readBtn, mockLink, fcBtn, offBtn, shareBtn, saveBtn);
    card.appendChild(actions);
    return card;
  }

  function filterResources(list) {
    const q = state.filterQ.trim().toLowerCase();
    return list.filter(item => {
      if (state.filterType && item.resource_type !== state.filterType) return false;
      if (state.filterExam) {
        const es = String(item.exam_slug || '').toLowerCase();
        const ex = String(item.exam || '').toLowerCase();
        const target = state.filterExam.toLowerCase();
        if (es !== target && !ex.includes(target.replace(/-/g, ' '))) return false;
      }
      if (state.goalMatchOnly && state.candidateGoals.length && !isGoalMatchedResource(item)) return false;
      if (q) {
        const hay = [
          item.title, item.title_or, item.exam, item.exam_slug, item.description, item.description_or,
          ...(Array.isArray(item.key_takeaways) ? item.key_takeaways : [])
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => Number(isGoalMatchedResource(b)) - Number(isGoalMatchedResource(a)));
  }

  function renderMaterials() {
    if (!studyMaterialsGrid) return;
    const filtered = filterResources(state.resources);
    if (liveStudyCount) {
      liveStudyCount.textContent = `${filtered.length} Verified Material${filtered.length === 1 ? '' : 's'}`;
    }
    if (studyResetBtn) {
      studyResetBtn.hidden = !(state.filterType || state.filterExam || state.filterQ || state.goalMatchOnly);
    }
    studyMaterialsGrid.replaceChildren();
    if (!filtered.length) {
      const empty = el('div', 'study-modal-box');
      empty.appendChild(el('p', 'study-card-desc', 'No verified study materials match this filter combination. Reset filters to view all 14 curated syllabi, PYQs, and Odisha GK capsules.'));
      studyMaterialsGrid.appendChild(empty);
      return;
    }
    filtered.forEach(item => studyMaterialsGrid.appendChild(createMaterialCard(item)));
  }

  // ---- Directory Tree Navigation, Breadcrumb & Explorer ----
  function renderSidebar() {
    if (!sideNav) return;
    sideNav.replaceChildren();
    state.groups.forEach((g, idx) => {
      const btn = el('button', 'side-link');
      btn.type = 'button';
      if (state.view !== 'overview' && state.view !== 'search' && state.groupIdx === idx) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
      }
      const icon = el('span', 'side-icon', g.icon_name || GROUP_ICONS[idx % GROUP_ICONS.length]);
      const label = el('span', 'side-link-text', g.title);
      btn.append(icon, label);
      btn.addEventListener('click', () => {
        navigateToGroup(idx, -1);
        document.body.classList.remove('menu-open');
      });
      sideNav.appendChild(btn);
    });
  }

  function renderBreadcrumb() {
    if (!breadcrumb) return;
    breadcrumb.replaceChildren();

    const addItem = (label, handler, isCurrent) => {
      const li = el('li', 'breadcrumb-item');
      if (isCurrent) {
        const strong = el('strong', 'breadcrumb-current', label);
        strong.setAttribute('aria-current', 'page');
        li.appendChild(strong);
      } else if (typeof handler === 'string') {
        const a = el('a', 'breadcrumb-link', label);
        a.href = handler;
        li.appendChild(a);
      } else {
        const btn = el('button', 'breadcrumb-link', label);
        btn.type = 'button';
        btn.addEventListener('click', handler);
        li.appendChild(btn);
      }
      breadcrumb.appendChild(li);
    };

    addItem('CS Odisha', '../index.html', false);
    if (state.view === 'overview') {
      addItem('Study Library', null, true);
      return;
    }
    addItem('Study Library', () => showOverview(true), false);

    if (state.view === 'search') {
      addItem(`Search: "${dirSearch ? dirSearch.value.trim() : ''}"`, null, true);
      return;
    }

    const group = state.groups[state.groupIdx];
    if (!group) return;
    if (state.view === 'group') {
      addItem(group.title, null, true);
      return;
    }
    addItem(group.title, () => navigateToGroup(state.groupIdx, -1), false);

    const sec = (group.sections || [])[state.sectionIdx];
    if (!sec) return;
    if (state.view === 'section') {
      addItem(sec.title, null, true);
      return;
    }
    addItem(sec.title, () => navigateToGroup(state.groupIdx, state.sectionIdx), false);

    const sub = (sec.children || [])[state.subIdx];
    if (sub) addItem(sub.title, null, true);
  }

  function updateUrlState(push) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('group');
      url.searchParams.delete('section');
      url.searchParams.delete('q');
      if (state.view === 'search' && dirSearch && dirSearch.value.trim()) {
        url.searchParams.set('q', dirSearch.value.trim());
      } else if (state.groupIdx >= 0 && state.groups[state.groupIdx]) {
        const g = state.groups[state.groupIdx];
        url.searchParams.set('group', g.slug || g.id);
        if (state.sectionIdx >= 0 && g.sections && g.sections[state.sectionIdx]) {
          const s = g.sections[state.sectionIdx];
          url.searchParams.set('section', s.number || s.slug || s.id);
        }
      }
      const method = push ? 'pushState' : 'replaceState';
      window.history[method]({}, '', url.toString());
    } catch {}
  }

  function renderOverview() {
    if (!dashboardGrid || !statsGrid) return;
    dashboardGrid.replaceChildren();
    state.groups.forEach((g, idx) => {
      const secs = g.sections || [];
      const subCount = secs.reduce((sum, s) => sum + ((s.children || []).length), 0);
      const entCount = secs.reduce((sum, s) => sum + (s.children || []).reduce((acc, sub) => acc + ((sub.children || []).length), 0), 0);

      const card = el('button', 'dashboard-card');
      card.type = 'button';
      const icon = el('span', 'card-icon', g.icon_name || GROUP_ICONS[idx % GROUP_ICONS.length]);
      const title = el('span', 'card-title', state.lang === 'or' && g.title_or ? g.title_or : g.title);
      card.append(icon, title);
      if (g.title_or && state.lang === 'en') {
        card.appendChild(el('span', 'card-sub-or', g.title_or));
      } else if (g.title && state.lang === 'or') {
        card.appendChild(el('span', 'card-sub-or', g.title));
      }
      card.appendChild(el('span', 'card-count', `${secs.length} Sections · ${subCount} Categories · ${entCount} Topics`));
      card.appendChild(el('span', 'card-arrow', '→'));
      card.addEventListener('click', () => navigateToGroup(idx, -1));
      dashboardGrid.appendChild(card);
    });

    // Clean single-value Directory at a Glance cards (zero stray 0 placeholder)
    statsGrid.replaceChildren();
    const metrics = [
      { value: state.counts.groups || state.groups.length, label: 'Academic Track Groups' },
      { value: state.counts.sections, label: 'Curriculum Sections' },
      { value: state.counts.subcategories, label: 'Subject Categories' },
      { value: state.counts.entries, label: 'Indexed Topics & Guides' },
      { value: state.resources.length, label: 'Verified Live Resources' }
    ];
    metrics.forEach(m => {
      const box = el('div', 'stat-card');
      box.appendChild(el('strong', 'stat-value', String(m.value || 0)));
      box.appendChild(el('span', 'stat-label', m.label));
      statsGrid.appendChild(box);
    });
  }

  function renderRecentNodes() {
    if (!recentSection || !recentGrid) return;
    const list = loadJsonStorage(RECENT_DIR_KEY, []);
    recentGrid.replaceChildren();
    if (!Array.isArray(list) || !list.length) {
      recentSection.hidden = true;
      return;
    }
    recentSection.hidden = false;
    list.slice(0, 4).forEach(r => {
      const btn = el('button', 'recent-card');
      btn.type = 'button';
      btn.appendChild(el('span', 'recent-icon', r.icon || '📂'));
      btn.appendChild(el('span', 'recent-title', r.title));
      btn.addEventListener('click', () => {
        if (typeof r.groupIdx === 'number' && state.groups[r.groupIdx]) {
          navigateToGroup(r.groupIdx, typeof r.sectionIdx === 'number' ? r.sectionIdx : -1);
        }
      });
      recentGrid.appendChild(btn);
    });
  }

  function recordRecentNode(entry) {
    const list = loadJsonStorage(RECENT_DIR_KEY, []);
    const next = (Array.isArray(list) ? list : []).filter(x => x && x.title !== entry.title);
    next.unshift(entry);
    saveJsonStorage(RECENT_DIR_KEY, next.slice(0, 6));
    renderRecentNodes();
  }

  function renderNodeCard(title, subtitle, badgeText, actionHandler, extraNode) {
    const card = el('div', 'explorer-item');
    const info = el('div', 'item-info');
    if (badgeText) info.appendChild(el('span', 'item-number', badgeText));
    info.appendChild(el('strong', 'item-title', title));
    if (subtitle) info.appendChild(el('p', 'item-description', subtitle));
    if (extraNode) info.appendChild(extraNode);
    card.appendChild(info);
    if (actionHandler) {
      const btn = el('button', 'item-open-btn', 'Open →');
      btn.type = 'button';
      btn.addEventListener('click', actionHandler);
      card.appendChild(btn);
    }
    return card;
  }

  function renderExplorer() {
    if (!explorerEl || !explorerItems) return;
    overviewEl.hidden = true;
    searchResultsEl.hidden = true;
    if (liveStudySection) liveStudySection.hidden = true;
    explorerEl.hidden = false;
    explorerItems.replaceChildren();

    const group = state.groups[state.groupIdx];
    if (!group) { showOverview(false); return; }

    if (state.view === 'group') {
      if (pageTitle) pageTitle.textContent = group.title;
      if (explorerTitle) explorerTitle.textContent = group.title;
      if (explorerDesc) {
        explorerDesc.textContent = group.subtitle || '';
        explorerDesc.hidden = !group.subtitle;
      }
      (group.sections || []).forEach((sec, sIdx) => {
        const subLen = (sec.children || []).length;
        const entLen = (sec.children || []).reduce((acc, sub) => acc + ((sub.children || []).length), 0);
        explorerItems.appendChild(renderNodeCard(
          sec.title,
          `${subLen} Subject Categories · ${entLen} Study Topics`,
          sec.number ? `Sec ${sec.number}` : sec.badge_text,
          () => navigateToGroup(state.groupIdx, sIdx)
        ));
      });
    } else if (state.view === 'section') {
      const sec = (group.sections || [])[state.sectionIdx];
      if (!sec) { navigateToGroup(state.groupIdx, -1); return; }
      if (pageTitle) pageTitle.textContent = sec.title;
      if (explorerTitle) explorerTitle.textContent = sec.title;
      if (explorerDesc) {
        explorerDesc.textContent = `Group: ${group.title}`;
        explorerDesc.hidden = false;
      }
      (sec.children || []).forEach((sub, subIdx) => {
        const entLen = (sub.children || []).length;
        explorerItems.appendChild(renderNodeCard(
          sub.title,
          `${entLen} Indexed Topics`,
          sub.badge_text || `${entLen} Topics`,
          () => navigateToSubcategory(state.groupIdx, state.sectionIdx, subIdx)
        ));
      });
    } else if (state.view === 'subcategory') {
      const sec = (group.sections || [])[state.sectionIdx];
      const sub = sec && (sec.children || [])[state.subIdx];
      if (!sub) { navigateToGroup(state.groupIdx, state.sectionIdx); return; }
      if (pageTitle) pageTitle.textContent = sub.title;
      if (explorerTitle) explorerTitle.textContent = sub.title;
      if (explorerDesc) {
        explorerDesc.textContent = `${group.title} › ${sec.title}`;
        explorerDesc.hidden = false;
      }
      (sub.children || []).forEach(ent => {
        const actionRow = el('div', 'study-card-actions');
        const q = mockExamQuery(ent.exam_slug || sub.exam_slug || group.exam_slug, ent.title);
        if (q) {
          const mBtn = el('a', 'study-btn', 'Start Mock →');
          mBtn.href = `../mock-tests/?exam=${encodeURIComponent(q)}`;
          actionRow.appendChild(mBtn);
        }
        const fcBtn = el('button', 'study-btn', '+ Flashcard');
        fcBtn.type = 'button';
        fcBtn.addEventListener('click', () => {
          sendToFlashcards(ent.title, `${sub.title} (${sec.title}) — Study Library Topic`, q || group.title);
        });
        actionRow.appendChild(fcBtn);
        if (ent.resource_url) {
          const ext = el('a', 'study-btn', 'Official Portal ↗');
          ext.href = ent.resource_url;
          ext.target = '_blank';
          ext.rel = 'noopener';
          actionRow.appendChild(ext);
        }
        explorerItems.appendChild(renderNodeCard(
          ent.title,
          `${sub.title} · ${sec.title}`,
          ent.number || ent.badge_text,
          null,
          actionRow
        ));
      });
    }
    renderSidebar();
    renderBreadcrumb();
  }

  function showOverview(push) {
    state.view = 'overview';
    state.groupIdx = -1;
    state.sectionIdx = -1;
    state.subIdx = -1;
    if (pageTitle) pageTitle.textContent = 'Study Library Explorer';
    if (overviewEl) overviewEl.hidden = false;
    if (liveStudySection) liveStudySection.hidden = false;
    if (explorerEl) explorerEl.hidden = true;
    if (searchResultsEl) searchResultsEl.hidden = true;
    renderSidebar();
    renderBreadcrumb();
    renderOverview();
    if (push) updateUrlState(true);
  }

  function navigateToGroup(gIdx, sIdx) {
    state.groupIdx = gIdx;
    state.sectionIdx = typeof sIdx === 'number' ? sIdx : -1;
    state.subIdx = -1;
    state.view = state.sectionIdx >= 0 ? 'section' : 'group';
    const g = state.groups[gIdx];
    const sec = state.sectionIdx >= 0 && g ? g.sections[state.sectionIdx] : null;
    if (g) {
      recordRecentNode({
        icon: g.icon_name || '📂',
        title: sec ? sec.title : g.title,
        groupIdx: gIdx,
        sectionIdx: state.sectionIdx
      });
      pushContinueItem({
        id: sec ? sec.slug : g.slug,
        kind: 'directory',
        title: sec ? sec.title : g.title,
        icon: g.icon_name || '📚',
        groupIdx: gIdx,
        sectionIdx: state.sectionIdx
      });
    }
    renderExplorer();
    updateUrlState(true);
  }

  function navigateToSubcategory(gIdx, sIdx, subIdx) {
    state.groupIdx = gIdx;
    state.sectionIdx = sIdx;
    state.subIdx = subIdx;
    state.view = 'subcategory';
    renderExplorer();
    updateUrlState(true);
  }

  // ---- Simultaneous Live Search across Materials + 1,681 Nodes ----
  function runUnifiedDirectorySearch(rawQuery) {
    const q = String(rawQuery || '').trim();
    if (clearSearchBtn) clearSearchBtn.hidden = !q;
    if (!q) {
      if (state.view === 'search') showOverview(true);
      return;
    }

    state.view = 'search';
    overviewEl.hidden = true;
    explorerEl.hidden = true;
    if (liveStudySection) liveStudySection.hidden = true;
    searchResultsEl.hidden = false;
    renderSidebar();
    renderBreadcrumb();

    const ql = q.toLowerCase();

    // 1. Live verified study materials matches
    const resMatches = state.resources.filter(r => {
      const hay = [r.title, r.title_or, r.exam, r.exam_slug, r.description, r.description_or, ...(r.key_takeaways || [])].join(' ').toLowerCase();
      return hay.includes(ql);
    });
    searchMaterialsGrid.replaceChildren();
    if (resMatches.length) {
      searchLiveWrap.hidden = false;
      resMatches.forEach(item => searchMaterialsGrid.appendChild(createMaterialCard(item)));
    } else {
      searchLiveWrap.hidden = true;
    }

    // 2. Directory tree node matches (capped to 60 for snappy UI)
    const nodeHits = [];
    state.groups.forEach((g, gIdx) => {
      if ([g.title, g.title_or, g.subtitle].some(v => String(v || '').toLowerCase().includes(ql))) {
        nodeHits.push({ level: 'Group', badge: 'Track', title: g.title, path: 'Overview', open: () => navigateToGroup(gIdx, -1) });
      }
      (g.sections || []).forEach((s, sIdx) => {
        if (s.title.toLowerCase().includes(ql)) {
          nodeHits.push({ level: 'Section', badge: s.number ? `Sec ${s.number}` : 'Section', title: s.title, path: g.title, open: () => navigateToGroup(gIdx, sIdx) });
        }
        (s.children || []).forEach((sub, subIdx) => {
          if (sub.title.toLowerCase().includes(ql)) {
            nodeHits.push({ level: 'Category', badge: sub.badge_text || 'Category', title: sub.title, path: `${g.title} › ${s.title}`, open: () => navigateToSubcategory(gIdx, sIdx, subIdx) });
          }
          (sub.children || []).forEach(ent => {
            if (nodeHits.length < 60 && ent.title.toLowerCase().includes(ql)) {
              nodeHits.push({ level: 'Topic', badge: ent.number || 'Topic', title: ent.title, path: `${s.title} › ${sub.title}`, open: () => navigateToSubcategory(gIdx, sIdx, subIdx) });
            }
          });
        });
      });
    });

    searchItemsEl.replaceChildren();
    nodeHits.slice(0, 60).forEach(h => {
      searchItemsEl.appendChild(renderNodeCard(h.title, h.path, `${h.level} · ${h.badge}`, h.open));
    });
    if (searchStatusEl) {
      searchStatusEl.textContent = `Found ${resMatches.length} verified study materials and ${nodeHits.length}${nodeHits.length >= 60 ? '+' : ''} directory nodes matching "${q}".`;
    }
    updateUrlState(false);
  }

  // ---- Data Hydration (D1 APIs + Fallback) ----
  async function loadCandidateGoals() {
    const goals = [];
    try {
      const localGoals = loadJsonStorage('cso_candidate_goals_v1', []);
      if (Array.isArray(localGoals)) goals.push(...localGoals);
    } catch {}
    try {
      const res = await fetch('/api/user/profile', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        const raw = data && (data.target_exams || (data.profile && data.profile.target_exams));
        if (Array.isArray(raw)) goals.push(...raw);
        else if (typeof raw === 'string' && raw.trim()) {
          raw.split(',').forEach(s => goals.push(s.trim()));
        }
      }
    } catch {}
    state.candidateGoals = [...new Set(goals.map(String).filter(Boolean))];
  }

  async function hydrateData() {
    if (loadStatusEl) loadStatusEl.hidden = false;

    const [resResp, taxResp, dirResp] = await Promise.allSettled([
      fetch('/api/content/resources?limit=50'),
      fetch('/api/content/exam-taxonomy'),
      fetch('/api/content/study-library-directory')
    ]);

    if (resResp.status === 'fulfilled' && resResp.value.ok) {
      const data = await resResp.value.json();
      state.resources = Array.isArray(data.items) ? data.items : [];
    }

    if (taxResp.status === 'fulfilled' && taxResp.value.ok && studyExamSelect) {
      const taxData = await taxResp.value.json();
      const tracks = Array.isArray(taxData.items) ? taxData.items : (Array.isArray(taxData) ? taxData : []);
      state.taxonomy = tracks;
      const seen = new Set();
      const preset = [
        ['opsc-oas', 'OPSC Civil Services (OAS)'],
        ['ossc-cgl', 'OSSC CGL & Combined Tech'],
        ['osssc-ri-amin', 'OSSSC RI / ARI / Amin / ICDS'],
        ['ugc-net', 'UGC NET (English & Education)'],
        ['odisha-bed-otet', 'Odisha B.Ed. / OTET / OSSTET'],
        ['bse-odisha-10', 'BSE Odisha Class 10 (Matric)'],
        ['chse-odisha-12', 'CHSE Odisha +2 (Class 12)']
      ];
      preset.forEach(([val, label]) => {
        seen.add(val);
        studyExamSelect.appendChild(el('option', '', label)).value = val;
      });
      tracks.forEach(t => {
        const code = (t.short_code || t.track_slug || '').toLowerCase();
        if (code && !seen.has(code)) {
          seen.add(code);
          const opt = el('option', '', `${t.short_code || t.track_label} — ${t.exam_label || t.track_label}`);
          opt.value = code;
          studyExamSelect.appendChild(opt);
        }
      });
    }

    let dirLoadedFromD1 = false;
    if (dirResp.status === 'fulfilled' && dirResp.value.ok) {
      const dirData = await dirResp.value.json();
      if (Array.isArray(dirData.groups) && dirData.groups.length) {
        state.groups = dirData.groups;
        state.counts = dirData.total_counts || dirData.counts || state.counts;
        dirLoadedFromD1 = true;
      }
    }

    if (!dirLoadedFromD1) {
      try {
        const fb = await fetch('./generated/directory.json');
        if (fb.ok) {
          const raw = await fb.json();
          const nav = Array.isArray(raw.navigation) ? raw.navigation : [];
          state.groups = nav.map((g, idx) => ({
            id: g.id || `group-${idx + 1}`,
            slug: g.id || `group-${idx + 1}`,
            title: g.title,
            title_or: '',
            icon_name: GROUP_ICONS[idx % GROUP_ICONS.length],
            sections: g.sections || []
          }));
          const secs = state.groups.flatMap(g => g.sections);
          const subs = secs.flatMap(s => s.children || []);
          const ents = subs.flatMap(sub => sub.children || []);
          state.counts = { groups: state.groups.length, sections: secs.length, subcategories: subs.length, entries: ents.length };
        }
      } catch {}
    }

    if (syncBadge) {
      syncBadge.textContent = dirLoadedFromD1
        ? `● Live from D1 (${state.counts.totalNodes || 1681} Nodes)`
        : `Offline Fallback (${state.groups.length} Groups)`;
    }

    await loadCandidateGoals();
    if (loadStatusEl) loadStatusEl.hidden = true;

    renderMaterials();
    renderContinueStrip();
    renderRecentNodes();

    // Handle URL Deep-Links (?group=, ?section=, ?q=, ?exam=, ?resource=)
    const params = new URLSearchParams(window.location.search);
    const examParam = params.get('exam');
    if (examParam && studyExamSelect) {
      state.filterExam = examParam;
      studyExamSelect.value = examParam;
      renderMaterials();
    }
    const qParam = params.get('q');
    const groupParam = params.get('group');
    const secParam = params.get('section');
    const resParam = params.get('resource');

    if (qParam && dirSearch) {
      dirSearch.value = qParam;
      runUnifiedDirectorySearch(qParam);
    } else if (groupParam) {
      const gIdx = state.groups.findIndex(g => g.slug === groupParam || g.id === groupParam || (g.metadata && g.metadata.legacy_id === groupParam));
      if (gIdx >= 0) {
        let sIdx = -1;
        if (secParam) {
          sIdx = (state.groups[gIdx].sections || []).findIndex(s => s.number === secParam || s.slug === secParam || s.id === secParam);
        }
        navigateToGroup(gIdx, sIdx);
      } else {
        showOverview(false);
      }
    } else {
      showOverview(false);
    }

    if (resParam) {
      const found = state.resources.find(r => r.id === resParam);
      if (found) openStudyModal(found);
    }
  }

  // ---- Event Wiring ----
  function wireEvents() {
    initSidebarControls();

    // Language toggle buttons
    document.querySelectorAll('.study-lang-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.lang === state.lang);
      btn.addEventListener('click', () => {
        state.lang = btn.dataset.lang === 'or' ? 'or' : 'en';
        try { localStorage.setItem(LANG_PREF_KEY, state.lang); } catch {}
        document.querySelectorAll('.study-lang-btn').forEach(b => b.classList.toggle('is-active', b.dataset.lang === state.lang));
        renderMaterials();
        renderOverview();
        if (state.activeModalItem) openStudyModal(state.activeModalItem);
      });
    });

    if (studyQInput) {
      let t;
      studyQInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { state.filterQ = studyQInput.value; renderMaterials(); }, 180);
      });
    }
    if (studyExamSelect) {
      studyExamSelect.addEventListener('change', () => { state.filterExam = studyExamSelect.value; renderMaterials(); });
    }
    if (studyTypePills) {
      studyTypePills.querySelectorAll('.study-type-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          state.filterType = btn.dataset.type || '';
          studyTypePills.querySelectorAll('.study-type-pill').forEach(p => {
            const active = p === btn;
            p.classList.toggle('is-active', active);
            p.setAttribute('aria-selected', String(active));
          });
          renderMaterials();
        });
      });
    }
    if (studyGoalBtn) {
      studyGoalBtn.addEventListener('click', () => {
        if (!state.candidateGoals.length) {
          state.candidateGoals = ['OPSC', 'OSSC', 'OSSSC'];
          showToast('Showing Odisha Govt Exam priority matches (OPSC, OSSC, OSSSC)');
        }
        state.goalMatchOnly = !state.goalMatchOnly;
        studyGoalBtn.setAttribute('aria-pressed', String(state.goalMatchOnly));
        renderMaterials();
      });
    }
    if (studyResetBtn) {
      studyResetBtn.addEventListener('click', () => {
        state.filterType = '';
        state.filterExam = '';
        state.filterQ = '';
        state.goalMatchOnly = false;
        if (studyQInput) studyQInput.value = '';
        if (studyExamSelect) studyExamSelect.value = '';
        if (studyGoalBtn) studyGoalBtn.setAttribute('aria-pressed', 'false');
        if (studyTypePills) {
          studyTypePills.querySelectorAll('.study-type-pill').forEach(p => {
            const active = (p.dataset.type || '') === '';
            p.classList.toggle('is-active', active);
            p.setAttribute('aria-selected', String(active));
          });
        }
        renderMaterials();
      });
    }

    if (dirSearch) {
      let st;
      dirSearch.addEventListener('input', () => {
        clearTimeout(st);
        st = setTimeout(() => runUnifiedDirectorySearch(dirSearch.value), 200);
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (dirSearch) dirSearch.value = '';
        clearSearchBtn.hidden = true;
        showOverview(true);
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (state.view === 'subcategory') navigateToGroup(state.groupIdx, state.sectionIdx);
        else if (state.view === 'section') navigateToGroup(state.groupIdx, -1);
        else showOverview(true);
      });
    }

    if (continueClearBtn) {
      continueClearBtn.addEventListener('click', () => {
        saveJsonStorage(RECENT_CONTINUE_KEY, []);
        renderContinueStrip();
      });
    }
    if (clearRecentBtn) {
      clearRecentBtn.addEventListener('click', () => {
        saveJsonStorage(RECENT_DIR_KEY, []);
        renderRecentNodes();
      });
    }

    // Modal wiring
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeStudyModal);
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeStudyModal(); });
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.hidden) closeStudyModal();
    });
    if (modalFlashBtn) {
      modalFlashBtn.addEventListener('click', () => {
        const it = state.activeModalItem;
        if (!it) return;
        const back = (it.key_takeaways && it.key_takeaways[0]) || it.description || '';
        sendToFlashcards(`${it.exam}: ${it.title}`, back, it.exam);
      });
    }
    if (modalOfflineBtn) {
      modalOfflineBtn.addEventListener('click', () => {
        if (state.activeModalItem) saveResourceOffline(state.activeModalItem, modalOfflineBtn);
      });
    }
    if (modalPrintBtn) {
      modalPrintBtn.addEventListener('click', () => window.print());
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    hydrateData().catch(() => {
      if (loadStatusEl) loadStatusEl.textContent = 'Offline mode active — cached study tools ready.';
    });
  });
})();
