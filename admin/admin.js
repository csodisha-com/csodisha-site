/**
 * Common Sense Odisha — Editorial Studio & Master Command Suite Controller (admin/admin.js)
 * Strict CSP-compliant: ZERO .innerHTML, ZERO .style.*, ZERO inline handlers, ZERO mock data.
 */
(function (window, document) {
  'use strict';

  var masterNavigationSchema = null;

  var CSOState = {
    activeFolderId: 'folder-01',
    activeModuleId: 'module-01-001',
    expandedFolders: new Set(['folder-01']),
    searchQuery: '',
    startTime: Date.now()
  };

  var dom = {
    accordionNav: document.getElementById('accordionNav'),
    moduleSearchInput: document.getElementById('moduleSearchInput'),
    searchCountBadge: document.getElementById('searchCountBadge'),
    workspaceRoot: document.getElementById('workspaceRoot'),
    breadcrumbFolder: document.getElementById('breadcrumbFolder'),
    breadcrumbHomeBtn: document.getElementById('breadcrumbHomeBtn'),
    breadcrumbModule: document.getElementById('breadcrumbModule'),
    activeModuleHeading: document.getElementById('activeModuleHeading'),
    activeModuleTitleText: document.getElementById('activeModuleTitleText'),
    activeModuleIdPill: document.getElementById('activeModuleIdPill'),
    moduleHeaderActions: document.getElementById('moduleHeaderActions'),
    sessionTimer: document.getElementById('sessionTimer'),
    btnToggleSidebar: document.getElementById('btnToggleSidebar'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    brandHomeBtn: document.getElementById('brandHomeBtn'),
    shell: document.querySelector('.cso-shell'),
    sidebarConsole: document.getElementById('sidebarConsole'),
    mobileDrawerBackdrop: document.getElementById('mobileDrawerBackdrop'),
    toastContainer: document.getElementById('toastContainer'),
    globalModal: document.getElementById('globalModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalFooter: document.getElementById('modalFooter'),
    btnModalClose: document.getElementById('btnModalClose'),
    btnCreateNewMenu: document.getElementById('btnCreateNewMenu'),
    createNewDropdown: document.getElementById('createNewDropdown'),
    themeSelect: document.getElementById('themeSelect'),
    adminUserEmail: document.getElementById('adminUserEmail'),
    adminUserRole: document.getElementById('adminUserRole'),
    adminUserInitials: document.getElementById('adminUserInitials')
  };

  function clearNode(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function initSessionTimer() {
    if (!dom.sessionTimer) return;
    setInterval(function () {
      var diff = Math.floor((Date.now() - CSOState.startTime) / 1000);
      var hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
      var mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      var secs = String(diff % 60).padStart(2, '0');
      dom.sessionTimer.textContent = hrs + ':' + mins + ':' + secs;
    }, 1000);
  }

  function showToast(message, type) {
    if (!dom.toastContainer) return;
    var kind = type || 'info';
    var toast = el('div', 'cso-toast cso-toast-' + kind);
    var dot = el('span', 'cso-toast-dot');
    var txt = el('span', 'cso-toast-msg', message);
    toast.appendChild(dot);
    toast.appendChild(txt);
    dom.toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('is-visible');
    }, 10);

    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 280);
    }, 3600);
  }

  function closeModal() {
    if (dom.globalModal) dom.globalModal.hidden = true;
  }

  function openMobileDrawer() {
    if (dom.sidebarConsole) dom.sidebarConsole.classList.add('is-open');
    if (dom.mobileDrawerBackdrop) dom.mobileDrawerBackdrop.hidden = false;
    if (dom.btnToggleSidebar) dom.btnToggleSidebar.setAttribute('aria-expanded', 'true');
  }

  function closeMobileDrawer() {
    if (dom.sidebarConsole) dom.sidebarConsole.classList.remove('is-open');
    if (dom.mobileDrawerBackdrop) dom.mobileDrawerBackdrop.hidden = true;
    if (dom.btnToggleSidebar) dom.btnToggleSidebar.setAttribute('aria-expanded', 'false');
  }

  async function loadMasterNavigation() {
    if (masterNavigationSchema) return masterNavigationSchema;
    try {
      var res = await fetch('./data/master-navigation.json', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      masterNavigationSchema = await res.json();
      return masterNavigationSchema;
    } catch (err) {
      showToast('Failed to load navigation schema: ' + err.message, 'crimson');
      return null;
    }
  }

  async function hydrateSessionIdentity() {
    try {
      var res = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (!res.ok) return;
      var d = await res.json();
      if (d && d.user) {
        if (dom.adminUserEmail) dom.adminUserEmail.textContent = d.user.email || 'Staff Account';
        if (dom.adminUserRole) dom.adminUserRole.textContent = String(d.user.role || 'staff').toUpperCase();
        if (dom.adminUserInitials) {
          var email = String(d.user.email || 'ST');
          dom.adminUserInitials.textContent = email.slice(0, 2).toUpperCase();
        }
      }
    } catch (_) {}
  }

  function renderNavigationTree() {
    if (!dom.accordionNav || !masterNavigationSchema || !Array.isArray(masterNavigationSchema.folders)) return;
    var prevNavScroll = dom.accordionNav.scrollTop;
    var query = CSOState.searchQuery.toLowerCase().trim();
    var matchCount = 0;
    clearNode(dom.accordionNav);

    masterNavigationSchema.folders.forEach(function (folder) {
      var folderMatches = folder.title.toLowerCase().includes(query);
      var filteredModules = folder.modules.filter(function (m) {
        return folderMatches || m.title.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
      });

      if (query && filteredModules.length === 0) return;
      matchCount += filteredModules.length;

      var isExpanded = query ? true : CSOState.expandedFolders.has(folder.id);
      var isCurrentFolder = CSOState.activeFolderId === folder.id;

      var folderWrap = el('div', 'cso-nav-folder' + (isCurrentFolder ? ' is-current' : ''));
      var folderBtn = el('button', 'cso-nav-folder-btn' + (isCurrentFolder ? ' is-active' : ''));
      folderBtn.type = 'button';
      folderBtn.setAttribute('aria-expanded', String(isExpanded));

      var left = el('span', 'cso-nav-folder-left');
      left.appendChild(el('span', 'cso-nav-dot'));
      left.appendChild(el('span', 'cso-nav-folder-title', folder.title));

      var right = el('span', 'cso-nav-folder-right');
      right.appendChild(el('span', 'cso-nav-count cso-tabular', String(filteredModules.length)));
      right.appendChild(el('span', 'cso-nav-chevron' + (isExpanded ? ' is-open' : ''), '›'));

      folderBtn.appendChild(left);
      folderBtn.appendChild(right);
      folderBtn.addEventListener('click', function () {
        if (CSOState.expandedFolders.has(folder.id)) CSOState.expandedFolders.delete(folder.id);
        else CSOState.expandedFolders.add(folder.id);
        persistOpenGroups();
        renderNavigationTree();
      });

      var modList = el('div', 'cso-nav-modules' + (isExpanded ? '' : ' is-collapsed'));
      filteredModules.forEach(function (mod) {
        var isActiveMod = CSOState.activeModuleId === mod.id;
        var isLiveRoute = !!(window.CSOLive && window.CSOLive.routes && window.CSOLive.routes[mod.id]);
        var modBtn = el('button', 'cso-nav-mod-btn' + (isActiveMod ? ' is-active' : ''));
        modBtn.type = 'button';
        modBtn.appendChild(el('span', 'cso-nav-mod-title', mod.title));
        modBtn.appendChild(el('span', 'cso-nav-mod-tag' + (isLiveRoute ? ' is-live' : ''), isLiveRoute ? 'D1' : 'CMS'));
        modBtn.addEventListener('click', function () {
          selectModule(folder.id, mod.id);
          if (window.innerWidth < 900) closeMobileDrawer();
        });
        modList.appendChild(modBtn);
      });

      folderWrap.appendChild(folderBtn);
      folderWrap.appendChild(modList);
      dom.accordionNav.appendChild(folderWrap);
    });

    if (dom.searchCountBadge) {
      if (query) {
        dom.searchCountBadge.hidden = false;
        dom.searchCountBadge.textContent = String(matchCount);
      } else {
        dom.searchCountBadge.hidden = true;
      }
    }
    dom.accordionNav.scrollTop = prevNavScroll;
  }

  function persistOpenGroups() {
    try { localStorage.setItem('cso_open_sidebar_groups', JSON.stringify(Array.from(CSOState.expandedFolders))); } catch (_e) {}
  }

  function setSidebarCollapsed(collapsed) {
    if (dom.shell) dom.shell.classList.toggle('cso-sidebar-collapsed', !!collapsed);
    document.body.classList.toggle('cso-sidebar-collapsed', !!collapsed);
    if (dom.sidebarToggleBtn) dom.sidebarToggleBtn.setAttribute('aria-expanded', String(!collapsed));
    try { localStorage.setItem('cso_sidebar_collapsed', collapsed ? '1' : '0'); } catch (_e) {}
  }

  function resolveModuleTarget(targetId) {
    var normalizedId = targetId === 'module-00-001' ? 'module-01-001' : targetId;
    if (!masterNavigationSchema || !Array.isArray(masterNavigationSchema.folders)) return null;
    for (var i = 0; i < masterNavigationSchema.folders.length; i++) {
      var f = masterNavigationSchema.folders[i];
      var m = (f.modules || []).find(function (x) { return x.id === normalizedId; });
      if (m) return { folderId: f.id, moduleId: m.id };
    }
    return null;
  }

  function goDashboardHome() {
    var target = resolveModuleTarget('module-01-001') || { folderId: 'folder-01', moduleId: 'module-01-001' };
    selectModule(target.folderId, target.moduleId);
    if (dom.workspaceRoot && dom.workspaceRoot.scrollIntoView) {
      dom.workspaceRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function selectModule(folderId, moduleId) {
    if (!masterNavigationSchema || !Array.isArray(masterNavigationSchema.folders)) return;
    CSOState.activeFolderId = folderId;
    CSOState.activeModuleId = moduleId;
    CSOState.expandedFolders.add(folderId);
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', moduleId); } catch (_e) {}
    if (window.location.hash !== '#' + moduleId && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + moduleId);
    }

    var folder = masterNavigationSchema.folders.find(function (f) { return f.id === folderId; });
    var mod = folder && folder.modules ? folder.modules.find(function (m) { return m.id === moduleId; }) : null;

    if (folder && mod) {
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = folder.title;
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = mod.title;
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = mod.title;
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = mod.id;
    }

    renderNavigationTree();
    renderWorkspaceView(folderId, moduleId);
  }

  function renderWorkspaceView(folderId, moduleId) {
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);

    if (window.CSOLive && window.CSOLive.render(folderId, moduleId, dom.workspaceRoot, dom.moduleHeaderActions)) {
      return;
    }

    var card = el('div', 'cso-empty-state');
    card.appendChild(el('h2', '', 'Module Ready'));
    card.appendChild(el('p', '', 'Select a live editorial section from the navigation tree or use + Create New.'));
    dom.workspaceRoot.appendChild(card);
  }

  function openQuickCreateRoute(targetRoute) {
    if (!window.CSOCms) return;
    closeCreateDropdown();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);

    var routeLabels = {
      'jobs/new': ['Content & Recruitment', 'New Job Alert', 'module-05-008', [['current-affairs', 'Current Affairs'], ['jobs', 'Job Alerts']]],
      'current-affairs/new': ['Content & Publishing', 'New Current Affairs Post', 'module-04-004', [['current-affairs', 'Current Affairs'], ['jobs', 'Job Alerts']]],
      'mock-tests/new': ['Mock Tests & Question Bank', 'New Mock Test', 'module-05-014', [['mock-tests', 'Mock Tests'], ['syllabus', 'Syllabus'], ['pyq', 'PYQs']]],
      'syllabus': ['Educational Resources', 'Syllabus & PYQ Upload', 'module-05-010', [['mock-tests', 'Mock Tests'], ['syllabus', 'Syllabus'], ['pyq', 'PYQs']]],
      'banner': ['Site Broadcast', 'Homepage Broadcast Banner', 'module-04-005', null]
    };

    var meta = routeLabels[targetRoute] || ['Studio', 'Create Content', 'studio-new', null];
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = meta[0];
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = meta[1];
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = meta[1];
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = meta[2];

    var pill = el('span', 'cso-live-pill', '● Live · D1 / R2');
    dom.moduleHeaderActions.appendChild(pill);

    var host = el('div', 'cms-embed');
    dom.workspaceRoot.appendChild(host);
    window.CSOCms.mount(host, targetRoute, meta[3]);
    if (window.innerWidth < 900) closeMobileDrawer();
  }

  function closeCreateDropdown() {
    if (dom.createNewDropdown) dom.createNewDropdown.hidden = true;
    if (dom.btnCreateNewMenu) dom.btnCreateNewMenu.setAttribute('aria-expanded', 'false');
  }

  var THEME_ORDER = ['apex', 'volt', 'cobalt', 'lime'];

  function normalizeTheme(raw) {
    if (raw === 'apex' || raw === 'volt' || raw === 'cobalt' || raw === 'lime') return raw;
    if (raw === 'light') return 'cobalt';
    return 'apex';
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem('cso_studio_theme'));
    } catch (_e) {
      return 'apex';
    }
  }

  function applyTheme(theme) {
    var safe = normalizeTheme(theme);
    document.documentElement.dataset.theme = safe;
    if (dom.themeSelect) dom.themeSelect.value = safe;
    return safe;
  }

  function setTheme(theme) {
    var safe = applyTheme(theme);
    try { localStorage.setItem('cso_studio_theme', safe); } catch (_e) {}
    return safe;
  }

  function cycleTheme() {
    var cur = normalizeTheme(document.documentElement.dataset.theme);
    var idx = THEME_ORDER.indexOf(cur);
    return setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }

  function wireTopbarEvents() {
    if (dom.btnCreateNewMenu && dom.createNewDropdown) {
      dom.btnCreateNewMenu.addEventListener('click', function (e) {
        e.stopPropagation();
        var nextHidden = !dom.createNewDropdown.hidden;
        dom.createNewDropdown.hidden = nextHidden;
        dom.btnCreateNewMenu.setAttribute('aria-expanded', String(!nextHidden));
      });

      dom.createNewDropdown.querySelectorAll('[data-create-target]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openQuickCreateRoute(btn.getAttribute('data-create-target'));
        });
      });

      document.addEventListener('click', function (e) {
        if (!dom.createNewDropdown.hidden && !dom.createNewDropdown.contains(e.target) && e.target !== dom.btnCreateNewMenu) {
          closeCreateDropdown();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeCreateDropdown();
        closeModal();
        closeMobileDrawer();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        var nextCollapsed = !(dom.shell && dom.shell.classList.contains('cso-sidebar-collapsed'));
        setSidebarCollapsed(nextCollapsed);
      } else if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        goDashboardHome();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T')) {
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
        e.preventDefault();
        cycleTheme();
      }
    });

    if (dom.themeSelect) {
      dom.themeSelect.addEventListener('change', function () {
        setTheme(dom.themeSelect.value);
      });
    }

    if (dom.brandHomeBtn) {
      dom.brandHomeBtn.addEventListener('click', goDashboardHome);
      dom.brandHomeBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goDashboardHome();
        }
      });
    }

    if (dom.breadcrumbHomeBtn) {
      dom.breadcrumbHomeBtn.addEventListener('click', goDashboardHome);
    }

    if (dom.breadcrumbFolder) {
      dom.breadcrumbFolder.addEventListener('click', function () {
        if (!CSOState.activeFolderId) return;
        if (dom.shell && dom.shell.classList.contains('cso-sidebar-collapsed')) setSidebarCollapsed(false);
        CSOState.expandedFolders.add(CSOState.activeFolderId);
        persistOpenGroups();
        renderNavigationTree();
        var activeFolderEl = dom.accordionNav && dom.accordionNav.querySelector('.cso-nav-folder.is-current');
        if (activeFolderEl && activeFolderEl.scrollIntoView) {
          activeFolderEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    if (dom.sidebarToggleBtn) {
      dom.sidebarToggleBtn.addEventListener('click', function () {
        var nextCollapsed = !(dom.shell && dom.shell.classList.contains('cso-sidebar-collapsed'));
        setSidebarCollapsed(nextCollapsed);
      });
    }

    function syncFromHash() {
      var hashId = (window.location.hash || '').replace(/^#/, '');
      if (!hashId) return;
      var resolved = resolveModuleTarget(hashId);
      if (resolved && resolved.moduleId !== CSOState.activeModuleId) {
        selectModule(resolved.folderId, resolved.moduleId);
      }
    }
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);

    if (dom.moduleSearchInput) {
      dom.moduleSearchInput.addEventListener('input', function (e) {
        CSOState.searchQuery = e.target.value;
        renderNavigationTree();
      });
    }

    if (dom.btnToggleSidebar) {
      dom.btnToggleSidebar.addEventListener('click', function () {
        if (dom.sidebarConsole && dom.sidebarConsole.classList.contains('is-open')) closeMobileDrawer();
        else openMobileDrawer();
      });
    }
    if (dom.mobileDrawerBackdrop) dom.mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);
    if (dom.btnModalClose) dom.btnModalClose.addEventListener('click', closeModal);
  }

  window.showToast = showToast;
  window.closeModal = closeModal;
  window.selectModule = selectModule;
  window.CSOStudio = {
    openRoute: openQuickCreateRoute,
    selectModule: selectModule,
    getSchema: function () { return masterNavigationSchema; }
  };

  window.addEventListener('DOMContentLoaded', async function () {
    initSessionTimer();
    applyTheme(readStoredTheme());
    wireTopbarEvents();
    try {
      if (localStorage.getItem('cso_sidebar_collapsed') === '1') setSidebarCollapsed(true);
      var savedGroups = JSON.parse(localStorage.getItem('cso_open_sidebar_groups') || '[]');
      if (Array.isArray(savedGroups)) savedGroups.forEach(function (g) { CSOState.expandedFolders.add(g); });
    } catch (_e) {}
    await Promise.all([loadMasterNavigation(), hydrateSessionIdentity()]);
    var hashId = (window.location.hash || '').replace(/^#/, '');
    var storedId = '';
    try { storedId = localStorage.getItem('cso_active_module_id') || ''; } catch (_e) {}
    var target = resolveModuleTarget(hashId) || resolveModuleTarget(storedId) || resolveModuleTarget('module-00-001') || { folderId: 'folder-01', moduleId: 'module-01-001' };
    renderNavigationTree();
    selectModule(target.folderId, target.moduleId);
  });
})(window, document);
