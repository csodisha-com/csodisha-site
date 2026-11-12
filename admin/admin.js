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
    breadcrumbModule: document.getElementById('breadcrumbModule'),
    activeModuleHeading: document.getElementById('activeModuleHeading'),
    activeModuleTitleText: document.getElementById('activeModuleTitleText'),
    activeModuleIdPill: document.getElementById('activeModuleIdPill'),
    moduleHeaderActions: document.getElementById('moduleHeaderActions'),
    sessionTimer: document.getElementById('sessionTimer'),
    btnToggleSidebar: document.getElementById('btnToggleSidebar'),
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
  }

  function selectModule(folderId, moduleId) {
    if (!masterNavigationSchema || !Array.isArray(masterNavigationSchema.folders)) return;
    CSOState.activeFolderId = folderId;
    CSOState.activeModuleId = moduleId;
    CSOState.expandedFolders.add(folderId);

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
      }
    });

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
    wireTopbarEvents();
    await Promise.all([loadMasterNavigation(), hydrateSessionIdentity()]);
    renderNavigationTree();
    selectModule('folder-01', 'module-01-001');
  });
})(window, document);
