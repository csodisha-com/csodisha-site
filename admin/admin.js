/**
 * Common Sense Odisha — Editorial Studio & Master Command Suite Controller (admin/admin.js)
 * Strict CSP-compliant: zero HTML string injection, zero inline style props, zero inline handlers, zero mock data.
 */
(function (window, document) {
  'use strict';

  var masterNavigationSchema = null;

  var CSOState = {
    activeFolderId: 'folder-jobs-careers',
    activeModuleId: 'folder-jobs-careers',
    activeJobsSubTab: 'articles',
    activeJobsSectorId: '',
    jobsSectorNodes: [],
    activeCareersSubTab: 'list',
    expandedFolders: new Set(['folder-jobs-careers']),
    searchQuery: '',
    startTime: Date.now(),
    homepageCount: null,
    candidateCount: null,
    jobsCount: null,
    careersCount: null,
    schemesCount: null,
    studyCount: null,
    communityCount: null,
    aboutCount: null,
    liveBrandSummary: ''
  };

  var DEFAULT_JOBS_SECTORS = [
    { id: 'jtax_l1_government', slug: 'government', icon: '🏛️', title_en: 'Government', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_private', slug: 'private', icon: '💼', title_en: 'Private', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_psu', slug: 'psu', icon: '🏭', title_en: 'PSUs', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_ngo', slug: 'ngo', icon: '🤝', title_en: 'NGOs / Non-Profit', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_foreign', slug: 'foreign', icon: '✈️', title_en: 'Foreign Jobs', published_jobs: 0, total_jobs: 0 }
  ];

  var OV_FOLDER_ID = 'folder-command-overview';
  var OV_MODULE_ID = 'module-command-overview';
  function isOverviewId(id) {
    return id === OV_FOLDER_ID || id === OV_MODULE_ID || id === 'command-overview' || id === 'overview';
  }
  var CR_FOLDER_ID = 'folder-careers-studio';
  var CR_MODULE_ID = 'module-careers-studio';
  function isCareersStudioId(id) {
    return id === CR_FOLDER_ID || id === CR_MODULE_ID || id === 'careers' || id === 'careers-studio';
  }
  var HS_FOLDER_ID = 'folder-homepage-studio';
  var HS_MODULE_ID = 'module-homepage-studio';
  function isHomepageStudioId(id) {
    return id === HS_FOLDER_ID || id === HS_MODULE_ID || id === 'homepage-studio';
  }
  var CH_FOLDER_ID = 'folder-candidate-hub';
  var CH_MODULE_ID = 'module-candidate-hub';
  function isCandidateHubId(id) {
    return id === CH_FOLDER_ID || id === CH_MODULE_ID || id === 'candidate-hub' || id === 'candidates';
  }

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
    themeMenuWrap: document.getElementById('themeMenuWrap'),
    themeMenuBtn: document.getElementById('themeMenuBtn'),
    themeMenuPopover: document.getElementById('themeMenuPopover'),
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

  function getFolderDisplayTitle(folder) {
    if (!folder) return '';
    if (folder.id === 'folder-jobs-careers') return 'Jobs';
    return String(folder.title || '');
  }

  function getFolderDisplayTitleOr(folder) {
    if (!folder) return '';
    if (folder.id === 'folder-jobs-careers') return 'ଚାକିରି';
    return String(folder.title_or || '');
  }

  function syncModuleCountLabels() {
    if (!masterNavigationSchema || !Array.isArray(masterNavigationSchema.folders)) return;
    var pillarCount = masterNavigationSchema.folders.length + 1;
    document.title = 'CS Odisha — Editorial Studio & Command Suite (' + pillarCount + ' Pillars · Live D1 Sync)';
    var brandSub = document.querySelector('.cso-brand-sub');
    if (brandSub) {
      brandSub.textContent = CSOState.liveBrandSummary || (pillarCount + '-Pillar Live D1 Studio');
    }
    var searchLabel = document.querySelector('label[for="moduleSearchInput"]');
    if (searchLabel) searchLabel.textContent = 'Filter ' + pillarCount + ' pillars';
    if (dom.moduleSearchInput) dom.moduleSearchInput.placeholder = 'Filter ' + pillarCount + ' pillars...';
    if (dom.accordionNav) dom.accordionNav.setAttribute('aria-label', pillarCount + ' Pillars Live Tree');
    var coverageStrong = document.querySelector('.cso-sidebar-footer .cso-text-accent');
    if (coverageStrong) coverageStrong.textContent = pillarCount + ' / ' + pillarCount;
  }

  function refreshBrandSummary() {
    Promise.all([
      fetch('/api/admin/overview-stats', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/admin/jobs/taxonomy', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/admin/schemes/taxonomy', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/admin/study/taxonomy', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/admin/community/taxonomy', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/admin/about/taxonomy', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (arr) {
      var ov = arr[0];
      var jTax = arr[1];
      var sTax = arr[2];
      var stTax = arr[3];
      var cTax = arr[4];
      var aTax = arr[5];
      var pillarCount = ((masterNavigationSchema && Array.isArray(masterNavigationSchema.folders)) ? masterNavigationSchema.folders.length : 5) + 1;
      var liveItems = ov && ov.totals ? Number(ov.totals.published || 0) : 0;
      var activeCats = (ov && ov.categories ? Number(ov.categories.published || 0) : 0)
        + (jTax && Array.isArray(jTax.nodes) ? jTax.nodes.length : 0)
        + (sTax && Array.isArray(sTax.nodes) ? sTax.nodes.length : 0)
        + (stTax && Array.isArray(stTax.nodes) ? stTax.nodes.length : 0)
        + (cTax && Array.isArray(cTax.nodes) ? cTax.nodes.length : 0)
        + (aTax && Array.isArray(aTax.nodes) ? aTax.nodes.length : 0);
      var jobsPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'jobs'; }) : null;
      if (jobsPillar) { CSOState.jobsCount = jobsPillar.total; }
      var schemesPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'schemes'; }) : null;
      if (schemesPillar) { CSOState.schemesCount = schemesPillar.total; }
      var studyPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'study'; }) : null;
      if (studyPillar) { CSOState.studyCount = studyPillar.total; }
      var commPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'community'; }) : null;
      if (commPillar) { CSOState.communityCount = commPillar.total; }
      var aboutPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'about'; }) : null;
      if (aboutPillar) { CSOState.aboutCount = aboutPillar.total; }
      CSOState.liveBrandSummary = pillarCount + '-Pillar Live D1 Studio · ' + activeCats + ' Categories · ' + liveItems + ' Live';
      syncModuleCountLabels();
      renderNavigationTree();
    }).catch(function () {});
  }

  async function loadMasterNavigation() {
    if (masterNavigationSchema) return masterNavigationSchema;
    try {
      var res = await fetch('./data/master-navigation.json', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      masterNavigationSchema = await res.json();
      syncModuleCountLabels();
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
        try { localStorage.setItem('cso_admin_active', '1'); } catch (_) {}
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

    var ovLabel = 'command overview telemetry dashboard';
    if (!query || ovLabel.indexOf(query) !== -1) {
      matchCount += 1;
      var ovActive = CSOState.activeModuleId === OV_MODULE_ID;
      var ovWrap = el('div', 'cso-nav-folder cso-nav-command-overview' + (ovActive ? ' is-current' : ''));
      var ovBtn = el('button', 'cso-nav-folder-btn' + (ovActive ? ' is-active' : ''));
      ovBtn.type = 'button';
      ovBtn.title = 'Command Overview — live platform telemetry (Alt+0)';
      var ovLeft = el('span', 'cso-nav-folder-left');
      ovLeft.appendChild(el('span', 'cso-nav-dot'));
      ovLeft.appendChild(el('span', 'cso-nav-folder-title', '\uD83D\uDCCA Command Overview'));
      var ovRight = el('span', 'cso-nav-folder-right');
      ovRight.appendChild(el('kbd', 'cs-kbd', 'Alt 0'));
      ovBtn.appendChild(ovLeft);
      ovBtn.appendChild(ovRight);
      ovBtn.addEventListener('click', function () {
        selectModule(OV_FOLDER_ID, OV_MODULE_ID);
        if (window.innerWidth <= 900) closeMobileDrawer();
      });
      ovWrap.appendChild(ovBtn);
      dom.accordionNav.appendChild(ovWrap);
    }

    masterNavigationSchema.folders.forEach(function (folder) {
      var folderTitle = getFolderDisplayTitle(folder);
      var folderTitleOr = getFolderDisplayTitleOr(folder);
      var folderMatches = !query || folderTitle.toLowerCase().includes(query) || folderTitleOr.toLowerCase().includes(query);
      var folderModules = Array.isArray(folder.modules) ? folder.modules : [];
      var filteredModules = folderModules.filter(function (m) {
        return folderMatches || m.title.toLowerCase().includes(query) || String(m.title_or || '').toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
      });

      if (!query || folderMatches || filteredModules.length > 0) {
        matchCount += filteredModules.length || (folderMatches ? 1 : 0);

        var isExpanded = query ? true : CSOState.expandedFolders.has(folder.id);
        var isCurrentFolder = CSOState.activeFolderId === folder.id;

        var folderWrap = el('div', 'cso-nav-folder' + (isCurrentFolder ? ' is-current' : ''));
        var folderBtn = el('button', 'cso-nav-folder-btn' + (isCurrentFolder ? ' is-active' : ''));
        folderBtn.type = 'button';
        folderBtn.setAttribute('aria-expanded', String(isExpanded));
        if (folderTitleOr) folderBtn.title = folderTitle + ' · ' + folderTitleOr;

        var left = el('span', 'cso-nav-folder-left');
        left.appendChild(el('span', 'cso-nav-dot'));
        left.appendChild(el('span', 'cso-nav-folder-title', (folder.icon ? folder.icon + ' ' : '') + folderTitle));

        var right = el('span', 'cso-nav-folder-right');
        var badgeVal = folder.id === 'folder-jobs-careers' && CSOState.jobsCount !== null
          ? CSOState.jobsCount
          : (folder.id === 'folder-schemes-benefits' && CSOState.schemesCount !== null
            ? CSOState.schemesCount
            : (folder.id === 'folder-study-library' && CSOState.studyCount !== null
              ? CSOState.studyCount
              : (folder.id === 'folder-community' && CSOState.communityCount !== null
                ? CSOState.communityCount
                : (folder.id === 'folder-about' && CSOState.aboutCount !== null ? CSOState.aboutCount : filteredModules.length))));
        right.appendChild(el('span', 'cso-nav-count cso-tabular', String(badgeVal)));
        right.appendChild(el('span', 'cso-nav-chevron' + (isExpanded ? ' is-open' : ''), '›'));

        folderBtn.appendChild(left);
        folderBtn.appendChild(right);
        folderBtn.addEventListener('click', function () {
          if (folder.id === 'folder-jobs-careers') {
            if (CSOState.expandedFolders.has(folder.id)) CSOState.expandedFolders.delete(folder.id);
            else CSOState.expandedFolders.add(folder.id);
            persistOpenGroups();
            if (!isCurrentFolder) {
              openJobsPublishingStudio('articles');
            } else {
              renderNavigationTree();
            }
            if (window.innerWidth <= 900) closeMobileDrawer();
            return;
          }
          if (!folderModules.length) {
            selectModule(folder.id, folder.id);
            if (window.innerWidth <= 900) closeMobileDrawer();
            return;
          }
          if (CSOState.expandedFolders.has(folder.id)) CSOState.expandedFolders.delete(folder.id);
          else CSOState.expandedFolders.add(folder.id);
          persistOpenGroups();
          renderNavigationTree();
        });

        var modList = el('div', 'cso-nav-modules' + (isExpanded ? '' : ' is-collapsed'));
        if (folder.id === 'folder-jobs-careers') {
          modList.id = 'jobsSidebarSubnav';
          [
            { tab: 'articles', num: '01', title: 'Published & Draft Jobs', tag: 'D1' },
            { tab: 'taxonomy', num: '02', title: '5-Sector & 3-Layer Hierarchy', tag: 'L1-L3' },
            { tab: 'snippets', num: '03', title: 'Reusable Bilingual Snippets', tag: 'EN/OR' },
            { tab: 'new', num: '04', title: '+ Publish New Job Alert', tag: 'NEW' }
          ].forEach(function (jSub) {
            var isJActive = isCurrentFolder && CSOState.activeJobsSubTab === jSub.tab && !(jSub.tab === 'articles' && CSOState.activeJobsSectorId);
            var jBtn = el('button', 'cso-nav-mod-btn' + (isJActive ? ' is-active' : ''));
            jBtn.type = 'button';
            jBtn.setAttribute('data-jobs-tab', jSub.tab);
            jBtn.appendChild(el('span', 'cso-nav-mod-num', jSub.num));
            jBtn.appendChild(el('span', 'cso-nav-mod-title', jSub.title));
            jBtn.appendChild(el('span', 'cso-nav-mod-tag is-live', jSub.tag));
            jBtn.addEventListener('click', function () {
              openJobsPublishingStudio(jSub.tab, '');
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(jBtn);
          });

          var sectorHeading = el('div', 'cso-nav-jobs-sector-sep', 'Public Jobs ▾ Menu Sectors');
          modList.appendChild(sectorHeading);

          var l1Sectors = (CSOState.jobsSectorNodes && CSOState.jobsSectorNodes.length)
            ? CSOState.jobsSectorNodes
            : DEFAULT_JOBS_SECTORS;
          l1Sectors.forEach(function (sec) {
            var isSecActive = isCurrentFolder && CSOState.activeJobsSubTab === 'articles' && CSOState.activeJobsSectorId === sec.id;
            var sBtn = el('button', 'cso-nav-mod-btn cso-nav-mod-btn--sector' + (isSecActive ? ' is-active' : ''));
            sBtn.type = 'button';
            sBtn.setAttribute('data-jobs-sector', sec.slug || sec.id);
            sBtn.title = sec.title_en + ' — synced live to Public Jobs ▾ dropdown';
            sBtn.appendChild(el('span', 'cso-nav-mod-num', sec.icon || '💼'));
            sBtn.appendChild(el('span', 'cso-nav-mod-title', sec.title_en));
            var secCount = Number(sec.published_jobs !== undefined ? sec.published_jobs : (sec.total_jobs || 0));
            sBtn.appendChild(el('span', 'cso-nav-mod-tag cso-tabular' + (sec.is_published === 0 ? '' : ' is-live'), String(secCount)));
            sBtn.addEventListener('click', function () {
              openJobsPublishingStudio('articles', sec.id);
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(sBtn);
          });
        }
        filteredModules.forEach(function (mod, idx) {
          var isActiveMod = CSOState.activeModuleId === mod.id;
          var isLiveRoute = !!(window.CSOLive && window.CSOLive.routes && window.CSOLive.routes[mod.id]);
          var modBtn = el('button', 'cso-nav-mod-btn' + (isActiveMod ? ' is-active' : ''));
          modBtn.type = 'button';
          if (mod.title_or) modBtn.title = mod.title + ' · ' + mod.title_or;
          var numMatch = String(mod.id || '').match(/-(\d{2,3})$/);
          var modNum = numMatch ? String(Number(numMatch[1])).padStart(2, '0') : String(idx + 1).padStart(2, '0');
          modBtn.appendChild(el('span', 'cso-nav-mod-num', modNum));
          modBtn.appendChild(el('span', 'cso-nav-mod-title', mod.title));
          modBtn.appendChild(el('span', 'cso-nav-mod-tag' + (isLiveRoute ? ' is-live' : ''), isLiveRoute ? 'D1' : 'CMS'));
          modBtn.addEventListener('click', function () {
            selectModule(folder.id, mod.id);
            if (window.innerWidth <= 900) closeMobileDrawer();
          });
          modList.appendChild(modBtn);
        });

        folderWrap.appendChild(folderBtn);
        folderWrap.appendChild(modList);
        dom.accordionNav.appendChild(folderWrap);
      }

      if (folder.id === 'folder-jobs-careers') {
        var careersSubItems = [
          { tab: 'list', num: '01', title: 'Published & Draft Guides', tag: 'D1', kw: 'published draft guides career roadmaps list' },
          { tab: 'taxonomy', num: '02', title: '3-Layer Career Hierarchy', tag: 'L1-L3', kw: '3-layer career hierarchy taxonomy tracks subtracks roles' },
          { tab: 'snippets', num: '03', title: 'Reusable Bilingual Snippets', tag: 'EN/OR', kw: 'reusable bilingual snippets eligibility salary odia' },
          { tab: 'new', num: '04', title: '+ Publish New Career Guide', tag: 'NEW', kw: 'publish new career guide roadmap composer author' }
        ];
        var crLabel = 'careers publishing house roadmaps tracks pathways କ୍ୟାରିୟର୍';
        var crParentMatch = !query || crLabel.indexOf(query) !== -1;
        var filteredCrSubs = careersSubItems.filter(function (s) {
          return crParentMatch || s.title.toLowerCase().indexOf(query) !== -1 || s.kw.indexOf(query) !== -1;
        });
        if (!query || crParentMatch || filteredCrSubs.length > 0) {
          matchCount += filteredCrSubs.length || 1;
          var crActive = CSOState.activeFolderId === CR_FOLDER_ID || CSOState.activeModuleId === CR_MODULE_ID;
          var crExpanded = query ? true : CSOState.expandedFolders.has(CR_FOLDER_ID);
          var crWrap = el('div', 'cso-nav-folder cso-nav-careers-studio' + (crActive ? ' is-current' : ''));
          var crBtn = el('button', 'cso-nav-folder-btn' + (crActive ? ' is-active' : ''));
          crBtn.type = 'button';
          crBtn.id = 'navTabCareers';
          crBtn.setAttribute('aria-expanded', String(crExpanded));
          crBtn.title = 'Careers Publishing House — bilingual roadmaps & 3-layer taxonomy (Alt+8)';
          var crLeft = el('span', 'cso-nav-folder-left');
          crLeft.appendChild(el('span', 'cso-nav-dot'));
          crLeft.appendChild(el('span', 'cso-nav-folder-title', '\uD83E\uDDED Careers'));
          var crRight = el('span', 'cso-nav-folder-right');
          crRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.careersCount === null ? '\u2026' : String(CSOState.careersCount)));
          crRight.appendChild(el('span', 'cso-nav-chevron' + (crExpanded ? ' is-open' : ''), '▾'));
          crBtn.appendChild(crLeft);
          crBtn.appendChild(crRight);
          crBtn.addEventListener('click', function () {
            if (CSOState.expandedFolders.has(CR_FOLDER_ID)) CSOState.expandedFolders.delete(CR_FOLDER_ID);
            else CSOState.expandedFolders.add(CR_FOLDER_ID);
            persistOpenGroups();
            if (!crActive) {
              openCareersPublishingStudio('list');
            } else {
              renderNavigationTree();
            }
            if (window.innerWidth <= 900) closeMobileDrawer();
          });

          var crModList = el('div', 'cso-nav-modules' + (crExpanded ? '' : ' is-collapsed'));
          crModList.id = 'careersSidebarSubnav';
          filteredCrSubs.forEach(function (sub) {
            var isSubActive = crActive && CSOState.activeCareersSubTab === sub.tab;
            var subBtn = el('button', 'cso-nav-mod-btn' + (isSubActive ? ' is-active' : ''));
            subBtn.type = 'button';
            subBtn.setAttribute('data-careers-tab', sub.tab);
            subBtn.appendChild(el('span', 'cso-nav-mod-num', sub.num));
            subBtn.appendChild(el('span', 'cso-nav-mod-title', sub.title));
            subBtn.appendChild(el('span', 'cso-nav-mod-tag is-live', sub.tag));
            subBtn.addEventListener('click', function () {
              openCareersPublishingStudio(sub.tab);
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            crModList.appendChild(subBtn);
          });

          crWrap.appendChild(crBtn);
          crWrap.appendChild(crModList);
          dom.accordionNav.appendChild(crWrap);
        }
      }
    });

    var hsLabel = 'homepage studio homepage & features';
    if (!query || hsLabel.indexOf(query) !== -1) {
      matchCount += 1;
      var hsActive = CSOState.activeModuleId === HS_MODULE_ID;
      var hsWrap = el('div', 'cso-nav-folder cso-nav-homepage-studio' + (hsActive ? ' is-current' : ''));
      var hsBtn = el('button', 'cso-nav-folder-btn' + (hsActive ? ' is-active' : ''));
      hsBtn.type = 'button';
      hsBtn.title = 'Homepage & Features — manage every homepage block live from D1';
      var hsLeft = el('span', 'cso-nav-folder-left');
      hsLeft.appendChild(el('span', 'cso-nav-dot'));
      hsLeft.appendChild(el('span', 'cso-nav-folder-title', '\uD83C\uDFE0 Homepage Studio'));
      var hsRight = el('span', 'cso-nav-folder-right');
      hsRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.homepageCount === null ? '\u2026' : String(CSOState.homepageCount)));
      hsBtn.appendChild(hsLeft);
      hsBtn.appendChild(hsRight);
      hsBtn.addEventListener('click', function () {
        selectModule(HS_FOLDER_ID, HS_MODULE_ID);
        if (window.innerWidth <= 900) closeMobileDrawer();
      });
      hsWrap.appendChild(hsBtn);
      dom.accordionNav.appendChild(hsWrap);
    }

    var chLabel = 'candidate hub roster governance ui features documents';
    if (!query || chLabel.indexOf(query) !== -1) {
      matchCount += 1;
      var chActive = CSOState.activeModuleId === CH_MODULE_ID;
      var chWrap = el('div', 'cso-nav-folder cso-nav-candidate-hub' + (chActive ? ' is-current' : ''));
      var chBtn = el('button', 'cso-nav-folder-btn' + (chActive ? ' is-active' : ''));
      chBtn.type = 'button';
      chBtn.title = 'Candidate Hub — Roster, Governance, Dashboard UI & Features (Alt+7)';
      var chLeft = el('span', 'cso-nav-folder-left');
      chLeft.appendChild(el('span', 'cso-nav-dot'));
      chLeft.appendChild(el('span', 'cso-nav-folder-title', '\uD83C\uDF93 Candidate Hub'));
      var chRight = el('span', 'cso-nav-folder-right');
      chRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.candidateCount === null ? '\u2026' : String(CSOState.candidateCount)));
      chBtn.appendChild(chLeft);
      chBtn.appendChild(chRight);
      chBtn.addEventListener('click', function () {
        selectModule(CH_FOLDER_ID, CH_MODULE_ID);
        if (window.innerWidth <= 900) closeMobileDrawer();
      });
      chWrap.appendChild(chBtn);
      dom.accordionNav.appendChild(chWrap);
    }

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
    if (isCareersStudioId(targetId)) return { folderId: CR_FOLDER_ID, moduleId: CR_MODULE_ID };
    if (isHomepageStudioId(targetId)) return { folderId: HS_FOLDER_ID, moduleId: HS_MODULE_ID };
    if (isCandidateHubId(targetId)) return { folderId: CH_FOLDER_ID, moduleId: CH_MODULE_ID };
    if (isOverviewId(targetId)) return { folderId: OV_FOLDER_ID, moduleId: OV_MODULE_ID };
    if (!masterNavigationSchema || !Array.isArray(masterNavigationSchema.folders) || !masterNavigationSchema.folders.length) return null;
    for (var i = 0; i < masterNavigationSchema.folders.length; i++) {
      var f = masterNavigationSchema.folders[i];
      if (f.id === targetId || f.slug === targetId) return { folderId: f.id, moduleId: f.id };
      var m = (f.modules || []).find(function (x) { return x.id === targetId; });
      if (m) return { folderId: f.id, moduleId: m.id };
    }
    return null;
  }

  function goDashboardHome() {
    selectModule(OV_FOLDER_ID, OV_MODULE_ID);
    if (dom.workspaceRoot && dom.workspaceRoot.scrollIntoView) {
      dom.workspaceRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function openCommandOverview() {
    CSOState.activeFolderId = OV_FOLDER_ID;
    CSOState.activeModuleId = OV_MODULE_ID;
    try { localStorage.setItem('cso_active_module_id', OV_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#command-overview' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#command-overview');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Executive Command Suite';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Command Overview';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Command Overview';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live D1 / R2';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOCommandSuite) {
      window.CSOCommandSuite.render(dom.workspaceRoot, dom.moduleHeaderActions);
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'Command Overview unavailable'));
      card.appendChild(el('p', '', 'The Command Suite script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function openHomepageStudio() {
    CSOState.activeFolderId = HS_FOLDER_ID;
    CSOState.activeModuleId = HS_MODULE_ID;
    try { localStorage.setItem('cso_active_module_id', HS_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#homepage-studio' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#homepage-studio');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Homepage & Features';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Homepage Studio';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Homepage Studio';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live D1 Sync';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOHomepageStudio) {
      window.CSOHomepageStudio.render(dom.workspaceRoot, dom.moduleHeaderActions);
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'Homepage Studio unavailable'));
      card.appendChild(el('p', '', 'The Homepage Studio script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function openCandidateHubStudio(initialTab) {
    CSOState.activeFolderId = CH_FOLDER_ID;
    CSOState.activeModuleId = CH_MODULE_ID;
    try { localStorage.setItem('cso_active_module_id', CH_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#candidate-hub' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#candidate-hub');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Candidate Hub';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Roster, Governance & UI Studio';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Candidate Hub';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live D1 / R2';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOCandidateHubStudio) {
      window.CSOCandidateHubStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, initialTab || 'roster');
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'Candidate Hub Studio unavailable'));
      card.appendChild(el('p', '', 'The Candidate Hub script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function openCareersPublishingStudio(initialTab) {
    var tabKey = initialTab || 'list';
    CSOState.activeFolderId = CR_FOLDER_ID;
    CSOState.activeModuleId = CR_MODULE_ID;
    CSOState.activeCareersSubTab = tabKey;
    CSOState.expandedFolders.add(CR_FOLDER_ID);
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', CR_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#careers-studio' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#careers-studio');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Careers';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Careers Publishing House';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Careers Publishing House';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '3-Layer D1 · Live Sync';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOCareersPublishingStudio) {
      window.CSOCareersPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey);
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'Careers Publishing House unavailable'));
      card.appendChild(el('p', '', 'The Careers Publishing Studio script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function refreshHomepageCount() {
    fetch('/api/admin/jobs/taxonomy', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.nodes)) {
          CSOState.jobsSectorNodes = d.nodes.filter(function (n) { return Number(n.level) === 1; });
          renderNavigationTree();
        }
      })
      .catch(function () {});
    fetch('/api/admin/careers', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.stats) { CSOState.careersCount = d.stats.total; renderNavigationTree(); }
      })
      .catch(function () {});
    fetch('/api/admin/homepage-blocks', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.stats) { CSOState.homepageCount = d.stats.published; renderNavigationTree(); }
      })
      .catch(function () {});
    fetch('/api/admin/candidates?limit=1', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.kpis) { CSOState.candidateCount = d.kpis.total_candidates; renderNavigationTree(); }
      })
      .catch(function () {});
  }

  function selectModule(folderId, moduleId) {
    if (isOverviewId(moduleId) || isOverviewId(folderId)) { openCommandOverview(); return; }
    if (isCareersStudioId(moduleId) || isCareersStudioId(folderId)) { openCareersPublishingStudio(); return; }
    if (isHomepageStudioId(moduleId) || isHomepageStudioId(folderId)) { openHomepageStudio(); return; }
    if (isCandidateHubId(moduleId) || isCandidateHubId(folderId)) { openCandidateHubStudio(); return; }
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

    if (folder) {
      var folderDisplayTitle = getFolderDisplayTitle(folder);
      var activeLabel = (mod && mod.title) || folderDisplayTitle;
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = folderDisplayTitle;
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = mod ? mod.title : 'Live D1 Workspace';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = activeLabel;
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = mod ? (folderDisplayTitle || 'Studio') : 'Live D1 Sync';
    }

    renderNavigationTree();
    renderWorkspaceView(folderId, moduleId);
  }

  function openJobsPublishingStudio(initialTab, initialSectorId) {
    var tabKey = initialTab || 'articles';
    CSOState.activeFolderId = 'folder-jobs-careers';
    CSOState.activeModuleId = 'folder-jobs-careers';
    CSOState.activeJobsSubTab = tabKey;
    CSOState.activeJobsSectorId = tabKey === 'articles' ? (initialSectorId || '') : '';
    CSOState.expandedFolders.add('folder-jobs-careers');
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', 'folder-jobs-careers'); } catch (_e) {}
    if (window.location.hash !== '#folder-jobs-careers' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#folder-jobs-careers');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Jobs';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Jobs Publishing House';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Jobs Publishing House';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live Synced · Public Jobs ▾';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOJobsPublishingStudio) {
      window.CSOJobsPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey, CSOState.activeJobsSectorId);
    }
  }

  function openSchemesPublishingStudio(initialTab) {
    CSOState.activeFolderId = 'folder-schemes-benefits';
    CSOState.activeModuleId = 'folder-schemes-benefits';
    try { localStorage.setItem('cso_active_module_id', 'folder-schemes-benefits'); } catch (_e) {}
    if (window.location.hash !== '#folder-schemes-benefits' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#folder-schemes-benefits');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Schemes & Benefits';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Schemes & Welfare Publishing House';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Schemes & Welfare Publishing House';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '3-Layer D1 · R2';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOSchemesPublishingStudio) {
      window.CSOSchemesPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, initialTab || 'articles');
    }
  }

  function openStudyPublishingStudio(initialTab) {
    CSOState.activeFolderId = 'folder-study-library';
    CSOState.activeModuleId = 'folder-study-library';
    try { localStorage.setItem('cso_active_module_id', 'folder-study-library'); } catch (_e) {}
    if (window.location.hash !== '#folder-study-library' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#folder-study-library');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Study Library';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Study Library Publishing House';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Study Library & Curriculum Studio';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '3-Layer D1 · R2';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOStudyPublishingStudio) {
      window.CSOStudyPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, initialTab || 'articles');
    }
  }

  function openCommunityPublishingStudio(initialTab) {
    CSOState.activeFolderId = 'folder-community';
    CSOState.activeModuleId = 'folder-community';
    try { localStorage.setItem('cso_active_module_id', 'folder-community'); } catch (_e) {}
    if (window.location.hash !== '#folder-community' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#folder-community');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Community';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Community, Interest Circles & Pro Rewards';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Community & Pro Rewards Studio';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live Instant Sync';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOCommunityPublishingStudio) {
      window.CSOCommunityPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, initialTab || 'feed');
    }
  }

  function openAboutPublishingStudio(initialTab) {
    CSOState.activeFolderId = 'folder-about';
    CSOState.activeModuleId = 'folder-about';
    try { localStorage.setItem('cso_active_module_id', 'folder-about'); } catch (_e) {}
    if (window.location.hash !== '#folder-about' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#folder-about');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'About';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Institutional Transparency & Governance Studio';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'About & Institutional Transparency Studio';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live Instant Sync';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOAboutPublishingStudio) {
      window.CSOAboutPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, initialTab || 'pages');
    }
  }

  function renderWorkspaceView(folderId, moduleId) {
    if (folderId === 'folder-jobs-careers' && window.CSOJobsPublishingStudio) {
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Jobs';
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Jobs Publishing House';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Jobs Publishing House';
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '3-Layer D1 · R2';
      clearNode(dom.workspaceRoot);
      clearNode(dom.moduleHeaderActions);
      window.CSOJobsPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, 'articles');
      return;
    }
    if (folderId === 'folder-schemes-benefits' && window.CSOSchemesPublishingStudio) {
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Schemes & Benefits';
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Schemes & Welfare Publishing House';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Schemes & Welfare Publishing House';
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '3-Layer D1 · R2';
      clearNode(dom.workspaceRoot);
      clearNode(dom.moduleHeaderActions);
      window.CSOSchemesPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, 'articles');
      return;
    }
    if (folderId === 'folder-study-library' && window.CSOStudyPublishingStudio) {
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Study Library';
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Study Library Publishing House';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Study Library & Curriculum Studio';
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '3-Layer D1 · R2';
      clearNode(dom.workspaceRoot);
      clearNode(dom.moduleHeaderActions);
      window.CSOStudyPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, 'articles');
      return;
    }
    if (folderId === 'folder-community' && window.CSOCommunityPublishingStudio) {
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Community';
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Community, Interest Circles & Pro Rewards';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Community & Pro Rewards Studio';
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live Instant Sync';
      clearNode(dom.workspaceRoot);
      clearNode(dom.moduleHeaderActions);
      window.CSOCommunityPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, 'feed');
      return;
    }
    if (folderId === 'folder-about' && window.CSOAboutPublishingStudio) {
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'About';
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Institutional Transparency & Governance Studio';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'About & Institutional Transparency Studio';
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live Instant Sync';
      clearNode(dom.workspaceRoot);
      clearNode(dom.moduleHeaderActions);
      window.CSOAboutPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, 'pages');
      return;
    }
    var caCard = document.getElementById('cso-ca-publisher-card');
    var jobCard = document.getElementById('cso-job-publisher-card');
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);

    if (window.CSOLive && window.CSOLive.render(folderId, moduleId, dom.workspaceRoot, dom.moduleHeaderActions)) {
      if (caCard && (folderId === 'folder-study-library' || moduleId === 'module-01-001')) {
        dom.workspaceRoot.appendChild(caCard);
        if (window.CSOFastPublish && window.CSOFastPublish.initCurrentAffairsPublisher) {
          window.CSOFastPublish.initCurrentAffairsPublisher(caCard);
        }
      }
      if (jobCard && (folderId === 'folder-jobs-careers' || moduleId === 'module-01-001')) {
        dom.workspaceRoot.appendChild(jobCard);
        if (window.CSOFastPublish && window.CSOFastPublish.initJobsDirectoryPublisher) {
          window.CSOFastPublish.initJobsDirectoryPublisher(jobCard);
        }
      }
      return;
    }

    var card = el('div', 'cso-empty-state');
    card.appendChild(el('h2', '', 'Module Ready'));
    card.appendChild(el('p', '', 'Select a live editorial section from the navigation tree or use + Create New.'));
    dom.workspaceRoot.appendChild(card);
    if (caCard) {
      dom.workspaceRoot.appendChild(caCard);
      if (window.CSOFastPublish && window.CSOFastPublish.initCurrentAffairsPublisher) {
        window.CSOFastPublish.initCurrentAffairsPublisher(caCard);
      }
    }
    if (jobCard) {
      dom.workspaceRoot.appendChild(jobCard);
      if (window.CSOFastPublish && window.CSOFastPublish.initJobsDirectoryPublisher) {
        window.CSOFastPublish.initJobsDirectoryPublisher(jobCard);
      }
    }
  }

  function openQuickCreateRoute(targetRoute) {
    if (targetRoute === 'careers/new' && window.CSOCareersPublishingStudio) {
      closeCreateDropdown();
      openCareersPublishingStudio('new');
      if (window.innerWidth <= 900) closeMobileDrawer();
      return;
    }
    if (targetRoute === 'jobs/new' && window.CSOJobsPublishingStudio) {
      closeCreateDropdown();
      openJobsPublishingStudio('new');
      if (window.innerWidth <= 900) closeMobileDrawer();
      return;
    }
    if (targetRoute === 'nav-manager') {
      closeCreateDropdown();
      clearNode(dom.workspaceRoot);
      clearNode(dom.moduleHeaderActions);
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Navigation Architecture';
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = '5-Pillar Header & Categories';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Navigation Manager';
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '5 Pillars · Live D1';
      if (window.CSORestoredModules && window.CSORestoredModules.render) {
        window.CSORestoredModules.render('nav-manager', 'module-nav-004', dom.workspaceRoot, dom.moduleHeaderActions);
      }
      if (window.innerWidth <= 900) closeMobileDrawer();
      return;
    }
    if (!window.CSOCms) return;
    var caCard = document.getElementById('cso-ca-publisher-card');
    var jobCard = document.getElementById('cso-job-publisher-card');
    closeCreateDropdown();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);

    var routeLabels = {
      'jobs/new': ['Jobs & Recruitment', 'New Job Alert', 'module-02-001', [['current-affairs', 'Current Affairs'], ['jobs', 'Job Alerts']]],
      'current-affairs/new': ['Study Library & Current Affairs', 'New Current Affairs Post', 'module-03-004', [['current-affairs', 'Current Affairs'], ['jobs', 'Job Alerts']]],
      'mock-tests/new': ['Mock Tests & Practice', 'New Mock Test', 'module-04-001', [['mock-tests', 'Mock Tests'], ['syllabus', 'Syllabus'], ['pyq', 'PYQs']]],
      'syllabus': ['Study Library & Current Affairs', 'Syllabus & PYQ Upload', 'module-03-001', [['mock-tests', 'Mock Tests'], ['syllabus', 'Syllabus'], ['pyq', 'PYQs']]],
      'banner': ['Home & Live Updates', 'Homepage Broadcast Banner', 'module-01-001', null]
    };

    var meta = routeLabels[targetRoute] || ['Studio', 'Create Content', 'studio-new', null];
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = meta[0];
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = meta[1];
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = meta[1];
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = meta[0];

    var pill = el('span', 'cso-live-pill', '● Live · D1 / R2');
    dom.moduleHeaderActions.appendChild(pill);

    var host = el('div', 'cms-embed');
    dom.workspaceRoot.appendChild(host);
    window.CSOCms.mount(host, targetRoute, meta[3]);
    if (targetRoute === 'current-affairs/new' && caCard) {
      dom.workspaceRoot.appendChild(caCard);
      if (window.CSOFastPublish && window.CSOFastPublish.initCurrentAffairsPublisher) {
        window.CSOFastPublish.initCurrentAffairsPublisher(caCard);
      }
    }
    if (targetRoute === 'jobs/new' && jobCard) {
      dom.workspaceRoot.appendChild(jobCard);
      if (window.CSOFastPublish && window.CSOFastPublish.initJobsDirectoryPublisher) {
        window.CSOFastPublish.initJobsDirectoryPublisher(jobCard);
      }
    }
    if (window.innerWidth <= 900) closeMobileDrawer();
  }

  function closeCreateDropdown() {
    if (dom.createNewDropdown) dom.createNewDropdown.hidden = true;
    if (dom.btnCreateNewMenu) dom.btnCreateNewMenu.setAttribute('aria-expanded', 'false');
  }

  var PORTAL_THEMES = [
    { key: 'system', label: 'System', fullLabel: 'System (Auto Light/Dark)' },
    { key: 'dark', label: 'Dark', fullLabel: 'Dark Night' },
    { key: 'reading', label: 'Reading', fullLabel: 'Reading Mode' },
    { key: 'utkal-bharat', label: 'Odisha & Bharat', fullLabel: 'Odisha & Bharat' }
  ];
  var THEME_ORDER = PORTAL_THEMES.map(function (t) { return t.key; });

  function normalizeTheme(raw) {
    var val = String(raw || '').toLowerCase();
    if (THEME_ORDER.indexOf(val) !== -1) return val;
    return 'system';
  }

  function resolveEffectiveMode(themeKey) {
    if (themeKey === 'dark') return 'dark';
    if (themeKey === 'reading' || themeKey === 'utkal-bharat') return 'light';
    try {
      return (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    } catch (_e) {
      return 'light';
    }
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem('cso_portal_theme'));
    } catch (_e) {
      return 'system';
    }
  }

  function syncThemeButtonUi(safe) {
    if (!dom.themeMenuBtn) return;
    var cur = PORTAL_THEMES.find(function (t) { return t.key === safe; }) || PORTAL_THEMES[0];
    dom.themeMenuBtn.textContent = '';
    var sw = document.createElement('span');
    sw.className = 'cso-theme-swatch is-' + cur.key;
    sw.setAttribute('aria-hidden', 'true');
    dom.themeMenuBtn.appendChild(sw);
    dom.themeMenuBtn.appendChild(document.createTextNode(' ' + cur.label + ' ▾'));
    dom.themeMenuBtn.title = 'Theme: ' + cur.fullLabel + ' (Alt+T)';
  }

  function applyTheme(theme) {
    var safe = normalizeTheme(theme);
    var resolved = resolveEffectiveMode(safe);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.setAttribute('data-cso-theme', safe);
    document.documentElement.setAttribute('data-cso-resolved-mode', resolved);
    syncThemeButtonUi(safe);
    if (dom.themeMenuPopover) {
      dom.themeMenuPopover.querySelectorAll('.cso-theme-option').forEach(function (opt) {
        opt.setAttribute('aria-checked', opt.getAttribute('data-theme-value') === safe ? 'true' : 'false');
      });
    }
    return safe;
  }

  function closeThemePopover() {
    if (dom.themeMenuPopover) dom.themeMenuPopover.hidden = true;
    if (dom.themeMenuBtn) dom.themeMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function setTheme(theme, persist) {
    var safe = applyTheme(theme);
    if (persist !== false) {
      try { localStorage.setItem('cso_portal_theme', safe); } catch (_e) {}
    }
    return safe;
  }

  function cycleTheme() {
    var cur = normalizeTheme(document.documentElement.getAttribute('data-cso-theme'));
    var idx = THEME_ORDER.indexOf(cur);
    return setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length], true);
  }

  window.CSOTheme = {
    THEMES: PORTAL_THEMES,
    getTheme: function () { return normalizeTheme(document.documentElement.getAttribute('data-cso-theme')); },
    getResolvedMode: function () { return resolveEffectiveMode(normalizeTheme(document.documentElement.getAttribute('data-cso-theme'))); },
    setTheme: function (key, persist) { return setTheme(key, persist); },
    apply: function () { return applyTheme(readStoredTheme()); }
  };

  try {
    if (typeof window.matchMedia === 'function') {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onMqChange = function () {
        if (normalizeTheme(document.documentElement.getAttribute('data-cso-theme')) === 'system') {
          document.documentElement.setAttribute('data-cso-resolved-mode', resolveEffectiveMode('system'));
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMqChange);
    }
  } catch (_e) {}

  window.addEventListener('storage', function (e) {
    if (e.key === 'cso_portal_theme' && e.newValue && THEME_ORDER.indexOf(e.newValue) !== -1) {
      applyTheme(e.newValue);
    }
  });

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
        closeThemePopover();
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

    if (dom.themeMenuBtn && dom.themeMenuPopover) {
      dom.themeMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var nextHidden = !dom.themeMenuPopover.hidden;
        dom.themeMenuPopover.hidden = nextHidden;
        dom.themeMenuBtn.setAttribute('aria-expanded', String(!nextHidden));
      });

      dom.themeMenuPopover.querySelectorAll('.cso-theme-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          setTheme(opt.getAttribute('data-theme-value'));
          closeThemePopover();
        });
      });

      document.addEventListener('click', function (e) {
        if (!dom.themeMenuPopover.hidden && dom.themeMenuWrap && !dom.themeMenuWrap.contains(e.target)) {
          closeThemePopover();
        }
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
    var drawerCloseBtn = document.getElementById('sidebarCloseBtn');
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeMobileDrawer);
    if (dom.btnModalClose) dom.btnModalClose.addEventListener('click', closeModal);
  }

  window.showToast = showToast;
  window.closeModal = closeModal;
  window.selectModule = selectModule;
  window.CSOStudio = {
    openRoute: openQuickCreateRoute,
    selectModule: selectModule,
    getActiveFolderId: function () { return CSOState.activeFolderId; },
    getActiveModuleId: function () { return CSOState.activeModuleId; },
    setHomepageCount: function (n) {
      if (CSOState.homepageCount !== n) { CSOState.homepageCount = n; renderNavigationTree(); }
    },
    setCandidateCount: function (n) {
      if (CSOState.candidateCount !== n) { CSOState.candidateCount = n; renderNavigationTree(); }
    },
    setStudyCount: function (n) {
      if (CSOState.studyCount !== n) { CSOState.studyCount = n; renderNavigationTree(); }
    },
    setCommunityCount: function (n) {
      if (CSOState.communityCount !== n) { CSOState.communityCount = n; renderNavigationTree(); }
    },
    setAboutCount: function (n) {
      if (CSOState.aboutCount !== n) { CSOState.aboutCount = n; renderNavigationTree(); }
    },
    setCareersCount: function (n) {
      if (CSOState.careersCount !== n) { CSOState.careersCount = n; renderNavigationTree(); }
    },
    setJobsSubTab: function (tab) {
      if (tab && CSOState.activeJobsSubTab !== tab) { CSOState.activeJobsSubTab = tab; renderNavigationTree(); }
    },
    setJobsSectorNodes: function (nodes) {
      if (!Array.isArray(nodes)) return;
      CSOState.jobsSectorNodes = nodes.filter(function (n) { return Number(n.level) === 1; });
      renderNavigationTree();
    },
    setJobsActiveSector: function (l1Id) {
      var next = l1Id || '';
      if (CSOState.activeJobsSectorId !== next) { CSOState.activeJobsSectorId = next; renderNavigationTree(); }
    },
    openJobsSector: function (l1Id) { openJobsPublishingStudio('articles', l1Id || ''); },
    setCareersSubTab: function (tab) {
      if (tab && CSOState.activeCareersSubTab !== tab) { CSOState.activeCareersSubTab = tab; renderNavigationTree(); }
    },
    openCandidateHubTab: function (tab) { openCandidateHubStudio(tab); },
    openJobsPublishingTab: function (tab) { openJobsPublishingStudio(tab); },
    openCareersPublishingTab: function (tab) { openCareersPublishingStudio(tab); },
    openSchemesPublishingTab: function (tab) { openSchemesPublishingStudio(tab); },
    openStudyPublishingTab: function (tab) { openStudyPublishingStudio(tab); },
    openCommunityPublishingTab: function (tab) { openCommunityPublishingStudio(tab); },
    openAboutPublishingTab: function (tab) { openAboutPublishingStudio(tab); },
    refreshBrandSummary: refreshBrandSummary,
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
    var target = resolveModuleTarget(hashId) || resolveModuleTarget(storedId) || { folderId: OV_FOLDER_ID, moduleId: OV_MODULE_ID };
    renderNavigationTree();
    selectModule(target.folderId, target.moduleId);
    refreshHomepageCount();
    refreshBrandSummary();
  });
})(window, document);
