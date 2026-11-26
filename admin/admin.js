/**
 * Common Sense Odisha — Editorial Studio & Master Command Suite Controller (admin/admin.js)
 * Strict CSP-compliant: zero HTML string injection, zero inline style props, zero inline handlers, zero mock data.
 */
(function (window, document) {
  'use strict';

  var masterNavigationSchema = null;

  var CSOState = {
    activeFolderId: 'folder-command-overview',
    activeModuleId: 'module-command-overview',
    activeJobsSubTab: 'articles',
    activeJobsSectorId: '',
    jobsSectorNodes: [],
    activeCareersSubTab: 'list',
    activeCareersTrackSlug: '',
    careersTrackNodes: [],
    careersTrackCounts: {},
    activeSchemesSubTab: 'articles',
    activeSchemesCategoryId: '',
    schemesCategoryNodes: [],
    activeStudySubTab: 'articles',
    activeStudyTrackId: '',
    studyTrackNodes: [],
    activeGuidesSubTab: 'all',
    guidesCount: null,
    guidesSubCounts: {},
    activeCommunitySubTab: 'feed',
    activeCommunityChannelId: '',
    communityChannelNodes: [],
    communityModerationCount: 0,
    expandedFolders: new Set(),
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
    webStudioCount: null,
    filesCount: null,
    systemOpsCount: null,
    activeWebStudioSubTab: 'homepage',
    activeSystemOpsSubTab: 'security',
    liveBrandSummary: ''
  };

  var DEFAULT_JOBS_SECTORS = [
    { id: 'jtax_l1_government', slug: 'government', icon: '🏛️', title_en: 'Government', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_private', slug: 'private', icon: '💼', title_en: 'Private', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_psu', slug: 'psu', icon: '🏭', title_en: 'PSUs', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_ngo', slug: 'ngo', icon: '🤝', title_en: 'NGOs / Non-Profit', published_jobs: 0, total_jobs: 0 },
    { id: 'jtax_l1_foreign', slug: 'foreign', icon: '✈️', title_en: 'Foreign Jobs', published_jobs: 0, total_jobs: 0 }
  ];

  var DEFAULT_SCHEMES_CATEGORIES = [
    { id: 'stax_l1_odisha_welfare', slug: 'odisha-state-welfare', icon: '🏛️', title_en: 'Odisha State Welfare', published_schemes: 0, total_schemes: 0 },
    { id: 'stax_l1_central_welfare', slug: 'central-welfare', icon: '🇮🇳', title_en: 'Central Welfare Schemes', published_schemes: 0, total_schemes: 0 },
    { id: 'stax_l1_agriculture_farmers', slug: 'agriculture-farmers', icon: '🌾', title_en: 'Agriculture & Farmers', published_schemes: 0, total_schemes: 0 },
    { id: 'stax_l1_education_scholarships', slug: 'education-scholarships', icon: '🎓', title_en: 'Education & Scholarships', published_schemes: 0, total_schemes: 0 },
    { id: 'stax_l1_women_child_social', slug: 'women-child-social', icon: '👩', title_en: 'Women, Child & Social Security', published_schemes: 0, total_schemes: 0 },
    { id: 'stax_l1_health_msme_livelihoods', slug: 'health-msme-livelihoods', icon: '🏥', title_en: 'Health, MSME & Livelihoods', published_schemes: 0, total_schemes: 0 }
  ];

  var DEFAULT_STUDY_TRACKS = [
    { id: 'stl_l1_central_exams', slug: 'central-competitive-exams', icon: '🇮🇳', title_en: 'Central Competitive Exams', published_modules: 0, total_modules: 0 },
    { id: 'stl_l1_odisha_state', slug: 'odisha-state-exams', icon: '🏛️', title_en: 'Odisha State Exams', published_modules: 0, total_modules: 0 },
    { id: 'stl_l1_teaching_educator', slug: 'teaching-educator-exams', icon: '🎓', title_en: 'Teaching & Educator Exams', published_modules: 0, total_modules: 0 },
    { id: 'stl_l1_school_board', slug: 'school-board-notes', icon: '📘', title_en: 'School & Board Exams', published_modules: 0, total_modules: 0 }
  ];

  var DEFAULT_COMMUNITY_CHANNELS = [
    { id: 'comm_l1_exam_career_qa', slug: 'exam-career-qa', icon: '❓', title_en: 'Exam & Career Q&A', published_posts: 0, total_posts: 0 },
    { id: 'comm_l1_schemes_citizen_help', slug: 'schemes-citizen-help', icon: '🏛️', title_en: 'Odisha Schemes & Citizen Help', published_posts: 0, total_posts: 0 },
    { id: 'comm_l1_study_groups_notes', slug: 'study-groups-notes', icon: '📚', title_en: 'Study Groups & Peer Notes', published_posts: 0, total_posts: 0 },
    { id: 'comm_l1_success_stories', slug: 'success-stories-mentorship', icon: '🏆', title_en: 'Success Stories & Mentorship', published_posts: 0, total_posts: 0 }
  ];

  var DEFAULT_CAREERS_TRACKS = [
    { id: 'ctax-track-civil-services', slug: 'civil-services', icon: '🏛️', label_en: 'Civil Services' },
    { id: 'ctax-track-engineering-it', slug: 'engineering-it', icon: '💻', label_en: 'Engineering & IT' },
    { id: 'ctax-track-banking-finance', slug: 'banking-finance', icon: '🏦', label_en: 'Banking & Finance' },
    { id: 'ctax-track-healthcare', slug: 'healthcare', icon: '🩺', label_en: 'Healthcare' },
    { id: 'ctax-track-agriculture', slug: 'agriculture', icon: '🌾', label_en: 'Agriculture' },
    { id: 'ctax-track-pathways', slug: 'pathways', icon: '🧭', label_en: 'Post-10th/12th Pathways' }
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
  var IG_FOLDER_ID = 'folder-informative-guides';
  var IG_MODULE_ID = 'module-informative-guides';
  function isInformativeGuidesId(id) {
    return id === IG_FOLDER_ID || id === IG_MODULE_ID || id === 'guides' || id === 'informative-guides';
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
  var WS_FOLDER_ID = 'folder-web-studio';
  var WS_MODULE_ID = 'module-web-studio';
  function isWebStudioId(id) {
    return id === WS_FOLDER_ID || id === WS_MODULE_ID || id === 'web-studio';
  }
  var FM_FOLDER_ID = 'folder-file-manager';
  var FM_MODULE_ID = 'module-file-manager';
  function isFileManagerId(id) {
    return id === FM_FOLDER_ID || id === FM_MODULE_ID || id === 'file-manager' || id === 'files';
  }
  var SO_FOLDER_ID = 'folder-system-ops';
  var SO_MODULE_ID = 'module-system-ops';
  function isSystemOpsId(id) {
    return id === SO_FOLDER_ID || id === SO_MODULE_ID || id === 'system-ops' || id === 'system';
  }

  var dom = {
    accordionNav: document.getElementById('accordionNav'),
    moduleSearchInput: document.getElementById('moduleSearchInput'),
    moduleSearchClearBtn: document.getElementById('moduleSearchClearBtn'),
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
    adminUserMenuWrap: document.getElementById('adminUserMenuWrap'),
    btnAdminUserMenu: document.getElementById('btnAdminUserMenu'),
    adminUserDropdown: document.getElementById('adminUserDropdown'),
    adminUserEmail: document.getElementById('adminUserEmail'),
    adminUserRole: document.getElementById('adminUserRole'),
    adminUserInitials: document.getElementById('adminUserInitials'),
    adminDropdownEmail: document.getElementById('adminDropdownEmail'),
    adminDropdownRole: document.getElementById('adminDropdownRole')
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

  function createChevronEl(isOpen, isPlaceholder) {
    var wrap = el('span', 'cso-nav-chevron cso-folder-chevron' + (isOpen ? ' is-open is-expanded' : '') + (isPlaceholder ? ' is-placeholder' : ''));
    wrap.setAttribute('aria-hidden', 'true');
    if (isPlaceholder) return wrap;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M6 4l4 4-4 4');
    svg.appendChild(path);
    wrap.appendChild(svg);
    return wrap;
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
    var folderCount = 10;
    document.title = 'CS Odisha — 10-Folder Editorial Studio & Command Suite (Live D1 / R2)';
    var brandSub = document.querySelector('.cso-brand-sub');
    if (brandSub) {
      brandSub.textContent = CSOState.liveBrandSummary || (folderCount + '-Folder Live D1 Studio');
    }
    var searchLabel = document.querySelector('label[for="moduleSearchInput"]');
    if (searchLabel) searchLabel.textContent = 'Filter ' + folderCount + ' studio folders';
    if (dom.moduleSearchInput) dom.moduleSearchInput.placeholder = 'Filter ' + folderCount + ' studio folders...';
    if (dom.accordionNav) dom.accordionNav.setAttribute('aria-label', folderCount + '-Folder Studio Tree');
    var coverageStrong = document.querySelector('.cso-sidebar-footer .cso-text-accent');
    if (coverageStrong) coverageStrong.textContent = folderCount + ' / ' + folderCount;
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
      var liveItems = ov && ov.totals ? Number(ov.totals.published || 0) : 0;
      var activeCats = (ov && ov.categories ? Number(ov.categories.published || 0) : 0)
        + (jTax && Array.isArray(jTax.nodes) ? jTax.nodes.length : 0)
        + (sTax && Array.isArray(sTax.nodes) ? sTax.nodes.length : 0)
        + (stTax && Array.isArray(stTax.nodes) ? stTax.nodes.length : 0)
        + (cTax && Array.isArray(cTax.nodes) ? cTax.nodes.length : 0)
        + (aTax && Array.isArray(aTax.nodes) ? aTax.nodes.length : 0);
      var jobsPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'jobs'; }) : null;
      if (jobsPillar) { CSOState.jobsCount = jobsPillar.total; }
      var careersPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'careers'; }) : null;
      if (careersPillar && CSOState.careersCount === null) { CSOState.careersCount = careersPillar.total; }
      var schemesPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'schemes'; }) : null;
      if (schemesPillar) { CSOState.schemesCount = schemesPillar.total; }
      var studyPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'study'; }) : null;
      if (studyPillar) { CSOState.studyCount = studyPillar.total; }
      var guidesPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'guides'; }) : null;
      if (guidesPillar && CSOState.guidesCount === null) { CSOState.guidesCount = guidesPillar.total; }
      var commPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'community'; }) : null;
      if (commPillar) { CSOState.communityCount = commPillar.total; }
      var aboutPillar = ov && Array.isArray(ov.pillars) ? ov.pillars.find(function (p) { return p.key === 'about'; }) : null;
      if (aboutPillar) { CSOState.aboutCount = aboutPillar.total; }
      if (ov && ov.web_studio) {
        CSOState.webStudioCount = Number(ov.web_studio.homepage_blocks || 0) + Number(ov.web_studio.institutional_pages || 0) + Number(ov.web_studio.site_snippets || 0);
      }
      if (ov && ov.files) {
        CSOState.filesCount = Number(ov.files.total || 0);
      }
      if (ov && ov.system_ops) {
        CSOState.systemOpsCount = Number(ov.system_ops.active_admin_sessions || 0) + Number(ov.system_ops.redirects_active || 0);
      }
      CSOState.liveBrandSummary = '10-Folder Live D1 Studio · ' + activeCats + ' Categories · ' + liveItems + ' Live';
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
        var userEmail = d.user.email || 'Staff Account';
        var userRole = String(d.user.role || 'staff').toUpperCase();
        if (dom.adminUserEmail) dom.adminUserEmail.textContent = userEmail;
        if (dom.adminUserRole) dom.adminUserRole.textContent = userRole;
        if (dom.adminDropdownEmail) dom.adminDropdownEmail.textContent = userEmail;
        if (dom.adminDropdownRole) dom.adminDropdownRole.textContent = userRole + ' • Live D1 / R2';
        if (dom.btnAdminUserMenu) dom.btnAdminUserMenu.title = userEmail + ' (' + userRole + ')';
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
      if (ovActive) ovBtn.setAttribute('aria-current', 'page');
      ovBtn.title = 'Command Overview — live platform telemetry (Alt+0)';
      var ovLeft = el('span', 'cso-nav-folder-left');
      ovLeft.appendChild(el('span', 'cso-nav-folder-icon', '\uD83D\uDCCA'));
      ovLeft.appendChild(el('span', 'cso-nav-folder-title', 'Command Overview'));
      var ovRight = el('span', 'cso-nav-folder-right');
      ovRight.appendChild(el('kbd', 'cs-kbd', 'Alt 0'));
      ovRight.appendChild(createChevronEl(false, true));
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
      // Folder #8 consolidates About into Web & Page Studio -> Institutional & Legal Pages
      if (folder.id === 'folder-about') return;
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
        if (isCurrentFolder) folderBtn.setAttribute('aria-current', 'page');
        if (folderTitleOr) folderBtn.title = folderTitle + ' · ' + folderTitleOr;

        var left = el('span', 'cso-nav-folder-left');
        left.appendChild(el('span', 'cso-nav-folder-icon', folder.icon || '\uD83D\uDCC1'));
        left.appendChild(el('span', 'cso-nav-folder-title', folderTitle));

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
        right.appendChild(createChevronEl(isExpanded, false));

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
          if (folder.id === 'folder-schemes-benefits') {
            if (CSOState.expandedFolders.has(folder.id)) CSOState.expandedFolders.delete(folder.id);
            else CSOState.expandedFolders.add(folder.id);
            persistOpenGroups();
            if (!isCurrentFolder) {
              openSchemesPublishingStudio('articles', '');
            } else {
              renderNavigationTree();
            }
            if (window.innerWidth <= 900) closeMobileDrawer();
            return;
          }
          if (folder.id === 'folder-study-library') {
            if (CSOState.expandedFolders.has(folder.id)) CSOState.expandedFolders.delete(folder.id);
            else CSOState.expandedFolders.add(folder.id);
            persistOpenGroups();
            if (!isCurrentFolder) {
              openStudyPublishingStudio('articles', '');
            } else {
              renderNavigationTree();
            }
            if (window.innerWidth <= 900) closeMobileDrawer();
            return;
          }
          if (folder.id === 'folder-community') {
            if (CSOState.expandedFolders.has(folder.id)) CSOState.expandedFolders.delete(folder.id);
            else CSOState.expandedFolders.add(folder.id);
            persistOpenGroups();
            if (!isCurrentFolder) {
              openCommunityPublishingStudio('feed', '');
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
        modList.hidden = !isExpanded;
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
            var isForeignSec = String(sec.slug || '').toLowerCase() === 'foreign';
            sBtn.title = sec.title_en + (isForeignSec ? ' (Overseas / Foreign · region_scope = foreign)' : '') + ' — synced live to Public Jobs ▾ dropdown';
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
        } else if (folder.id === 'folder-schemes-benefits') {
          modList.id = 'schemesSidebarSubnav';
          [
            { tab: 'articles', num: '01', title: 'Published & Draft Schemes', tag: 'D1' },
            { tab: 'taxonomy', num: '02', title: '6-Category & 3-Layer Hierarchy', tag: 'L1-L3' },
            { tab: 'snippets', num: '03', title: 'Reusable Bilingual Snippets', tag: 'EN/OR' },
            { tab: 'new', num: '04', title: '+ Publish New Scheme Guide', tag: 'NEW' }
          ].forEach(function (sSub) {
            var isSActive = isCurrentFolder && CSOState.activeSchemesSubTab === sSub.tab && !(sSub.tab === 'articles' && CSOState.activeSchemesCategoryId);
            var sBtn = el('button', 'cso-nav-mod-btn' + (isSActive ? ' is-active' : ''));
            sBtn.type = 'button';
            sBtn.setAttribute('data-schemes-tab', sSub.tab);
            sBtn.appendChild(el('span', 'cso-nav-mod-num', sSub.num));
            sBtn.appendChild(el('span', 'cso-nav-mod-title', sSub.title));
            sBtn.appendChild(el('span', 'cso-nav-mod-tag is-live', sSub.tag));
            sBtn.addEventListener('click', function () {
              openSchemesPublishingStudio(sSub.tab, '');
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(sBtn);
          });

          var schCatSep = el('div', 'cso-nav-jobs-sector-sep', 'Public Schemes ▾ Menu Categories');
          modList.appendChild(schCatSep);

          var l1Cats = (CSOState.schemesCategoryNodes && CSOState.schemesCategoryNodes.length)
            ? CSOState.schemesCategoryNodes
            : DEFAULT_SCHEMES_CATEGORIES;
          l1Cats.forEach(function (cat) {
            var isCatActive = isCurrentFolder && CSOState.activeSchemesSubTab === 'articles' && CSOState.activeSchemesCategoryId === cat.id;
            var cBtn = el('button', 'cso-nav-mod-btn cso-nav-mod-btn--sector' + (isCatActive ? ' is-active' : ''));
            cBtn.type = 'button';
            cBtn.setAttribute('data-schemes-category', cat.slug || cat.id);
            cBtn.title = (cat.title_en || cat.slug) + ' — synced live to Public Schemes ▾ dropdown';
            cBtn.appendChild(el('span', 'cso-nav-mod-num', cat.icon || '🏛️'));
            cBtn.appendChild(el('span', 'cso-nav-mod-title', cat.title_en || cat.slug));
            var catCnt = Number(cat.published_schemes !== undefined ? cat.published_schemes : (cat.total_schemes || 0));
            cBtn.appendChild(el('span', 'cso-nav-mod-tag cso-tabular' + (cat.is_published === 0 ? '' : ' is-live'), String(catCnt)));
            cBtn.addEventListener('click', function () {
              openSchemesPublishingStudio('articles', cat.id);
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(cBtn);
          });
        } else if (folder.id === 'folder-study-library') {
          modList.id = 'studyLibrarySidebarSubnav';
          [
            { tab: 'articles', num: '01', title: 'Published & Draft Resources', tag: 'D1' },
            { tab: 'mock_tests', num: '02', title: 'CBT Mock Tests', tag: 'CBT' },
            { tab: 'taxonomy', num: '03', title: '4-Track & 3-Layer Hierarchy', tag: 'L1-L3' },
            { tab: 'snippets', num: '04', title: 'Reusable Bilingual Snippets', tag: 'EN/OR' },
            { tab: 'doubts', num: '05', title: 'Reader Doubts & PYQ Queue', tag: 'Q&A' },
            { tab: 'new', num: '06', title: '+ Publish Study Resource', tag: 'NEW' }
          ].forEach(function (stSub) {
            var isStActive = isCurrentFolder && CSOState.activeStudySubTab === stSub.tab && !(stSub.tab === 'articles' && CSOState.activeStudyTrackId);
            var stBtn = el('button', 'cso-nav-mod-btn' + (isStActive ? ' is-active' : ''));
            stBtn.type = 'button';
            stBtn.setAttribute('data-study-tab', stSub.tab);
            stBtn.appendChild(el('span', 'cso-nav-mod-num', stSub.num));
            stBtn.appendChild(el('span', 'cso-nav-mod-title', stSub.title));
            stBtn.appendChild(el('span', 'cso-nav-mod-tag is-live', stSub.tag));
            stBtn.addEventListener('click', function () {
              openStudyPublishingStudio(stSub.tab, '');
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(stBtn);
          });

          var stTrackSep = el('div', 'cso-nav-jobs-sector-sep', 'Public Study Library ▾ Tracks');
          modList.appendChild(stTrackSep);

          var l1Tracks = (CSOState.studyTrackNodes && CSOState.studyTrackNodes.length)
            ? CSOState.studyTrackNodes
            : DEFAULT_STUDY_TRACKS;
          l1Tracks.forEach(function (trk) {
            var isTrkActive = isCurrentFolder && CSOState.activeStudySubTab === 'articles' && CSOState.activeStudyTrackId === trk.id;
            var tBtn = el('button', 'cso-nav-mod-btn cso-nav-mod-btn--sector' + (isTrkActive ? ' is-active' : ''));
            tBtn.type = 'button';
            tBtn.setAttribute('data-study-track', trk.slug || trk.id);
            tBtn.title = (trk.title_en || trk.slug) + ' — synced live to Public Study Library ▾ dropdown';
            tBtn.appendChild(el('span', 'cso-nav-mod-num', trk.icon || '📚'));
            tBtn.appendChild(el('span', 'cso-nav-mod-title', trk.title_en || trk.slug));
            var trkCnt = Number(trk.published_modules !== undefined ? trk.published_modules : (trk.total_modules || 0));
            tBtn.appendChild(el('span', 'cso-nav-mod-tag cso-tabular' + (trk.is_published === 0 ? '' : ' is-live'), String(trkCnt)));
            tBtn.addEventListener('click', function () {
              openStudyPublishingStudio('articles', trk.id);
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(tBtn);
          });
        } else if (folder.id === 'folder-community') {
          modList.id = 'communitySidebarSubnav';
          [
            { tab: 'feed', num: '01', title: 'Community Feed & Spotlights', tag: 'D1' },
            { tab: 'safety', num: '02', title: 'Moderation Queue', tag: String(CSOState.communityModerationCount || 0) },
            { tab: 'taxonomy', num: '03', title: '4-Channel Hierarchy', tag: 'L1-L3' },
            { tab: 'rewards', num: '04', title: 'Pro & Permanent Rewards', tag: 'XP' },
            { tab: 'new', num: '05', title: '+ Publish Spotlight / AMA', tag: 'NEW' }
          ].forEach(function (cSub) {
            var isCActive = isCurrentFolder && CSOState.activeCommunitySubTab === cSub.tab && !(cSub.tab === 'feed' && CSOState.activeCommunityChannelId);
            var cBtn = el('button', 'cso-nav-mod-btn' + (isCActive ? ' is-active' : ''));
            cBtn.type = 'button';
            cBtn.setAttribute('data-community-tab', cSub.tab);
            cBtn.appendChild(el('span', 'cso-nav-mod-num', cSub.num));
            cBtn.appendChild(el('span', 'cso-nav-mod-title', cSub.title));
            cBtn.appendChild(el('span', 'cso-nav-mod-tag is-live', cSub.tag));
            cBtn.addEventListener('click', function () {
              openCommunityPublishingStudio(cSub.tab, '');
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(cBtn);
          });

          var commSep = el('div', 'cso-nav-jobs-sector-sep', 'Public Community ▾ Channels');
          modList.appendChild(commSep);

          var l1Channels = (CSOState.communityChannelNodes && CSOState.communityChannelNodes.length)
            ? CSOState.communityChannelNodes
            : DEFAULT_COMMUNITY_CHANNELS;
          l1Channels.forEach(function (ch) {
            var isChActive = isCurrentFolder && CSOState.activeCommunitySubTab === 'feed' && CSOState.activeCommunityChannelId === ch.id;
            var chBtn = el('button', 'cso-nav-mod-btn cso-nav-mod-btn--sector' + (isChActive ? ' is-active' : ''));
            chBtn.type = 'button';
            chBtn.setAttribute('data-community-channel', ch.slug || ch.id);
            chBtn.title = (ch.title_en || ch.slug) + ' — synced live to Public Community ▾ dropdown';
            chBtn.appendChild(el('span', 'cso-nav-mod-num', ch.icon || '💬'));
            chBtn.appendChild(el('span', 'cso-nav-mod-title', ch.title_en || ch.slug));
            var chCnt = Number(ch.published_posts !== undefined ? ch.published_posts : (ch.posts_count !== undefined ? ch.posts_count : (ch.total_posts || 0)));
            chBtn.appendChild(el('span', 'cso-nav-mod-tag cso-tabular' + (ch.is_published === 0 ? '' : ' is-live'), String(chCnt)));
            chBtn.addEventListener('click', function () {
              openCommunityPublishingStudio('feed', ch.id);
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            modList.appendChild(chBtn);
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
          if (crActive) crBtn.setAttribute('aria-current', 'page');
          crBtn.title = 'Careers Publishing House — bilingual roadmaps & 3-layer taxonomy (Alt+8)';
          var crLeft = el('span', 'cso-nav-folder-left');
          crLeft.appendChild(el('span', 'cso-nav-folder-icon', '\uD83E\uDDED'));
          crLeft.appendChild(el('span', 'cso-nav-folder-title', 'Careers'));
          var crRight = el('span', 'cso-nav-folder-right');
          crRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.careersCount === null ? '\u2026' : String(CSOState.careersCount)));
          crRight.appendChild(createChevronEl(crExpanded, false));
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
          crModList.hidden = !crExpanded;
          filteredCrSubs.forEach(function (sub) {
            var isSubActive = crActive && CSOState.activeCareersSubTab === sub.tab && !(sub.tab === 'list' && CSOState.activeCareersTrackSlug);
            var subBtn = el('button', 'cso-nav-mod-btn' + (isSubActive ? ' is-active' : ''));
            subBtn.type = 'button';
            subBtn.setAttribute('data-careers-tab', sub.tab);
            subBtn.appendChild(el('span', 'cso-nav-mod-num', sub.num));
            subBtn.appendChild(el('span', 'cso-nav-mod-title', sub.title));
            subBtn.appendChild(el('span', 'cso-nav-mod-tag is-live', sub.tag));
            subBtn.addEventListener('click', function () {
              openCareersPublishingStudio(sub.tab, '');
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            crModList.appendChild(subBtn);
          });

          var crTrackSep = el('div', 'cso-nav-jobs-sector-sep', 'Public Careers ▾ Menu Tracks');
          crModList.appendChild(crTrackSep);

          var l1Tracks = (CSOState.careersTrackNodes && CSOState.careersTrackNodes.length)
            ? CSOState.careersTrackNodes
            : DEFAULT_CAREERS_TRACKS;
          l1Tracks.forEach(function (tr) {
            var isTrActive = crActive && CSOState.activeCareersSubTab === 'list' && CSOState.activeCareersTrackSlug === tr.slug;
            var tBtn = el('button', 'cso-nav-mod-btn cso-nav-mod-btn--sector' + (isTrActive ? ' is-active' : ''));
            tBtn.type = 'button';
            tBtn.setAttribute('data-careers-track', tr.slug);
            tBtn.title = (tr.label_en || tr.slug) + ' — synced live to Public Careers ▾ dropdown';
            tBtn.appendChild(el('span', 'cso-nav-mod-num', tr.icon || '🧭'));
            tBtn.appendChild(el('span', 'cso-nav-mod-title', tr.label_en || tr.slug));
            var trCnt = Number((CSOState.careersTrackCounts && CSOState.careersTrackCounts[tr.slug]) || 0);
            tBtn.appendChild(el('span', 'cso-nav-mod-tag cso-tabular' + (Number(tr.active ?? 1) === 0 ? '' : ' is-live'), String(trCnt)));
            tBtn.addEventListener('click', function () {
              openCareersPublishingStudio('list', tr.slug);
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            crModList.appendChild(tBtn);
          });

          crWrap.appendChild(crBtn);
          crWrap.appendChild(crModList);
          dom.accordionNav.appendChild(crWrap);
        }
      }

      if (folder.id === 'folder-study-library') {
        var guidesSubItems = [
          { tab: 'all', num: '01', title: 'All Articles & Guides', tag: 'ALL', kw: 'all informative articles guides hub' },
          { tab: 'how-to', num: '02', title: 'Step-by-Step How-To Guides', tag: 'HOW-TO', kw: 'step by step how-to walkthrough application guides' },
          { tab: 'exam-strategy', num: '03', title: 'Exam Strategy & Study Handbooks', tag: 'EXAM', kw: 'exam strategy study handbook roadmap pyq' },
          { tab: 'citizen-scheme', num: '04', title: 'Citizen & Scheme Explainers', tag: 'SCHEME', kw: 'citizen government scheme explainers benefits dbt' },
          { tab: 'odisha-gk', num: '05', title: 'Odisha GK & Heritage', tag: 'GK', kw: 'odisha gk heritage history geography culture' },
          { tab: 'drafts', num: '06', title: 'Drafts', tag: 'DRAFT', kw: 'drafts unpublished guides review' }
        ];
        var igLabel = 'informative articles guides how-to exam strategy handbooks citizen scheme explainers odisha gk heritage drafts ମାର୍ଗଦର୍ଶିକା';
        var igParentMatch = !query || igLabel.indexOf(query) !== -1;
        var filteredIgSubs = guidesSubItems.filter(function (s) {
          return igParentMatch || s.title.toLowerCase().indexOf(query) !== -1 || s.kw.indexOf(query) !== -1;
        });
        if (!query || igParentMatch || filteredIgSubs.length > 0) {
          matchCount += filteredIgSubs.length || 1;
          var igActive = CSOState.activeFolderId === IG_FOLDER_ID || CSOState.activeModuleId === IG_MODULE_ID;
          var igExpanded = query ? true : CSOState.expandedFolders.has(IG_FOLDER_ID);
          var igWrap = el('div', 'cso-nav-folder cso-nav-informative-guides' + (igActive ? ' is-current' : ''));
          var igBtn = el('button', 'cso-nav-folder-btn' + (igActive ? ' is-active' : ''));
          igBtn.type = 'button';
          igBtn.id = 'navTabInformativeGuides';
          igBtn.setAttribute('aria-expanded', String(igExpanded));
          if (igActive) igBtn.setAttribute('aria-current', 'page');
          igBtn.title = 'Informative Articles & Guides — Starter Templates, Photos, PDFs, AI & Live Preview';
          var igLeft = el('span', 'cso-nav-folder-left');
          igLeft.appendChild(el('span', 'cso-nav-folder-icon', '\uD83D\uDCDA'));
          igLeft.appendChild(el('span', 'cso-nav-folder-title', 'Informative Articles & Guides'));
          var igRight = el('span', 'cso-nav-folder-right');
          igRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.guidesCount === null ? '\u2026' : String(CSOState.guidesCount)));
          igRight.appendChild(createChevronEl(igExpanded, false));
          igBtn.appendChild(igLeft);
          igBtn.appendChild(igRight);
          igBtn.addEventListener('click', function () {
            if (CSOState.expandedFolders.has(IG_FOLDER_ID)) CSOState.expandedFolders.delete(IG_FOLDER_ID);
            else CSOState.expandedFolders.add(IG_FOLDER_ID);
            persistOpenGroups();
            if (!igActive) {
              openInformativeGuidesStudio('all');
            } else {
              renderNavigationTree();
            }
            if (window.innerWidth <= 900) closeMobileDrawer();
          });

          var igModList = el('div', 'cso-nav-modules' + (igExpanded ? '' : ' is-collapsed'));
          igModList.id = 'informativeGuidesSidebarSubnav';
          igModList.hidden = !igExpanded;
          filteredIgSubs.forEach(function (sub) {
            var isSubActive = igActive && CSOState.activeGuidesSubTab === sub.tab;
            var subBtn = el('button', 'cso-nav-mod-btn' + (isSubActive ? ' is-active' : ''));
            subBtn.type = 'button';
            subBtn.setAttribute('data-guides-tab', sub.tab);
            subBtn.appendChild(el('span', 'cso-nav-mod-num', sub.num));
            subBtn.appendChild(el('span', 'cso-nav-mod-title', sub.title));
            var subCnt = CSOState.guidesSubCounts && CSOState.guidesSubCounts[sub.tab] !== undefined
              ? String(CSOState.guidesSubCounts[sub.tab])
              : sub.tag;
            subBtn.appendChild(el('span', 'cso-nav-mod-tag is-live cso-tabular', subCnt));
            subBtn.addEventListener('click', function () {
              openInformativeGuidesStudio(sub.tab);
              if (window.innerWidth <= 900) closeMobileDrawer();
            });
            igModList.appendChild(subBtn);
          });

          igWrap.appendChild(igBtn);
          igWrap.appendChild(igModList);
          dom.accordionNav.appendChild(igWrap);
        }
      }
    });

    // 7. Candidate Hub
    var chLabel = 'candidate hub roster governance ui features documents';
    if (!query || chLabel.indexOf(query) !== -1) {
      matchCount += 1;
      var chActive = CSOState.activeModuleId === CH_MODULE_ID;
      var chWrap = el('div', 'cso-nav-folder cso-nav-candidate-hub' + (chActive ? ' is-current' : ''));
      var chBtn = el('button', 'cso-nav-folder-btn' + (chActive ? ' is-active' : ''));
      chBtn.type = 'button';
      chBtn.id = 'navTabCandidateHub';
      if (chActive) chBtn.setAttribute('aria-current', 'page');
      chBtn.title = 'Candidate Hub — Roster, Governance, Dashboard UI & Features (Alt+7)';
      var chLeft = el('span', 'cso-nav-folder-left');
      chLeft.appendChild(el('span', 'cso-nav-folder-icon', '\uD83C\uDF93'));
      chLeft.appendChild(el('span', 'cso-nav-folder-title', 'Candidate Hub'));
      var chRight = el('span', 'cso-nav-folder-right');
      chRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.candidateCount === null ? '\u2026' : String(CSOState.candidateCount)));
      chRight.appendChild(createChevronEl(false, true));
      chBtn.appendChild(chLeft);
      chBtn.appendChild(chRight);
      chBtn.addEventListener('click', function () {
        selectModule(CH_FOLDER_ID, CH_MODULE_ID);
        if (window.innerWidth <= 900) closeMobileDrawer();
      });
      chWrap.appendChild(chBtn);
      dom.accordionNav.appendChild(chWrap);
    }

    // 8. Web & Page Studio (Homepage & Blocks, Institutional & Legal Pages, Global Snippets & Menus)
    var wsSubs = [
      { tab: 'homepage', num: '01', title: 'Homepage & Blocks', tag: 'HOME', kw: 'homepage blocks popular searches latest updates' },
      { tab: 'legal', num: '02', title: 'Institutional & Legal Pages', tag: 'D1', kw: 'about terms privacy copyright disclaimer contact legal institutional' },
      { tab: 'snippets', num: '03', title: 'Global Snippets & Menus', tag: 'EDGE', kw: 'global snippets footer copyright disclaimer navigation menus' }
    ];
    var wsLabel = 'web page studio homepage blocks institutional legal pages about terms privacy copyright disclaimer contact snippets menus';
    var wsMatch = !query || wsLabel.indexOf(query) !== -1;
    var filteredWsSubs = wsSubs.filter(function (s) {
      return wsMatch || s.title.toLowerCase().indexOf(query) !== -1 || s.kw.indexOf(query) !== -1;
    });
    if (!query || wsMatch || filteredWsSubs.length > 0) {
      matchCount += filteredWsSubs.length || 1;
      var wsActive = CSOState.activeFolderId === WS_FOLDER_ID || CSOState.activeFolderId === HS_FOLDER_ID || CSOState.activeFolderId === 'folder-about';
      var wsExpanded = query ? true : CSOState.expandedFolders.has(WS_FOLDER_ID);
      var wsWrap = el('div', 'cso-nav-folder cso-nav-web-studio' + (wsActive ? ' is-current' : ''));
      var wsBtn = el('button', 'cso-nav-folder-btn' + (wsActive ? ' is-active' : ''));
      wsBtn.type = 'button';
      wsBtn.id = 'navTabWebStudio';
      wsBtn.setAttribute('aria-expanded', String(wsExpanded));
      if (wsActive) wsBtn.setAttribute('aria-current', 'page');
      wsBtn.title = 'Web & Page Studio — Homepage Blocks, Institutional & Legal Pages, Global Snippets (Alt+6)';
      var wsLeft = el('span', 'cso-nav-folder-left');
      wsLeft.appendChild(el('span', 'cso-nav-folder-icon', '\uD83C\uDFE0'));
      wsLeft.appendChild(el('span', 'cso-nav-folder-title', 'Web & Page Studio'));
      var wsRight = el('span', 'cso-nav-folder-right');
      var wsCntVal = CSOState.webStudioCount !== null ? CSOState.webStudioCount : (CSOState.homepageCount !== null ? CSOState.homepageCount : null);
      wsRight.appendChild(el('span', 'cso-nav-count cso-tabular', wsCntVal === null ? '\u2026' : String(wsCntVal)));
      wsRight.appendChild(createChevronEl(wsExpanded, false));
      wsBtn.appendChild(wsLeft);
      wsBtn.appendChild(wsRight);
      wsBtn.addEventListener('click', function () {
        if (CSOState.expandedFolders.has(WS_FOLDER_ID)) CSOState.expandedFolders.delete(WS_FOLDER_ID);
        else CSOState.expandedFolders.add(WS_FOLDER_ID);
        persistOpenGroups();
        if (!wsActive) openWebStudio(CSOState.activeWebStudioSubTab || 'homepage');
        else renderNavigationTree();
        if (window.innerWidth <= 900) closeMobileDrawer();
      });

      var wsModList = el('div', 'cso-nav-modules' + (wsExpanded ? '' : ' is-collapsed'));
      wsModList.id = 'webStudioSidebarSubnav';
      wsModList.hidden = !wsExpanded;
      filteredWsSubs.forEach(function (sub) {
        var isSubActive = wsActive && CSOState.activeWebStudioSubTab === sub.tab;
        var sb = el('button', 'cso-nav-mod-btn' + (isSubActive ? ' is-active' : ''));
        sb.type = 'button';
        sb.setAttribute('data-web-studio-tab', sub.tab);
        sb.appendChild(el('span', 'cso-nav-mod-num', sub.num));
        sb.appendChild(el('span', 'cso-nav-mod-title', sub.title));
        sb.appendChild(el('span', 'cso-nav-mod-tag is-live', sub.tag));
        sb.addEventListener('click', function () {
          openWebStudio(sub.tab);
          if (window.innerWidth <= 900) closeMobileDrawer();
        });
        wsModList.appendChild(sb);
      });
      wsWrap.appendChild(wsBtn);
      wsWrap.appendChild(wsModList);
      dom.accordionNav.appendChild(wsWrap);
    }

    // 9. File & Media Manager (Cloudflare R2 CSO_FILES + /files/:key)
    var fmLabel = 'file media manager r2 uploads pdf images storage links';
    if (!query || fmLabel.indexOf(query) !== -1) {
      matchCount += 1;
      var fmActive = CSOState.activeFolderId === FM_FOLDER_ID || CSOState.activeModuleId === FM_MODULE_ID;
      var fmWrap = el('div', 'cso-nav-folder cso-nav-file-manager' + (fmActive ? ' is-current' : ''));
      var fmBtn = el('button', 'cso-nav-folder-btn' + (fmActive ? ' is-active' : ''));
      fmBtn.type = 'button';
      fmBtn.id = 'navTabFileManager';
      if (fmActive) fmBtn.setAttribute('aria-current', 'page');
      fmBtn.title = 'File & Media Manager — Cloudflare R2 uploads & /files/:key links (Alt+9)';
      var fmLeft = el('span', 'cso-nav-folder-left');
      fmLeft.appendChild(el('span', 'cso-nav-folder-icon', '\uD83D\uDCC1'));
      fmLeft.appendChild(el('span', 'cso-nav-folder-title', 'File & Media Manager'));
      var fmRight = el('span', 'cso-nav-folder-right');
      fmRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.filesCount === null ? '\u2026' : String(CSOState.filesCount)));
      fmRight.appendChild(createChevronEl(false, true));
      fmBtn.appendChild(fmLeft);
      fmBtn.appendChild(fmRight);
      fmBtn.addEventListener('click', function () {
        openFileManager();
        if (window.innerWidth <= 900) closeMobileDrawer();
      });
      fmWrap.appendChild(fmBtn);
      dom.accordionNav.appendChild(fmWrap);
    }

    // 10. System, Security & Billing
    var soSubs = [
      { tab: 'security', num: '01', title: 'Security & Audit Logs', tag: '2FA', kw: 'security totp 2fa audit logs sessions force revoke logins' },
      { tab: 'system', num: '02', title: 'System, Flags & SEO', tag: 'EDGE', kw: 'system feature flags maintenance redirects 301 302 cache purge sitemap backup d1' },
      { tab: 'billing', num: '03', title: 'Payments & Ads', tag: 'LIVE', kw: 'payments ads billing monetization sponsors coupons plans orders razorpay upi' }
    ];
    var soLabel = 'system security billing audit logs sessions feature flags redirects cache purge sitemap backup payments ads';
    var soMatch = !query || soLabel.indexOf(query) !== -1;
    var filteredSoSubs = soSubs.filter(function (s) {
      return soMatch || s.title.toLowerCase().indexOf(query) !== -1 || s.kw.indexOf(query) !== -1;
    });
    if (!query || soMatch || filteredSoSubs.length > 0) {
      matchCount += filteredSoSubs.length || 1;
      var soActive = CSOState.activeFolderId === SO_FOLDER_ID || CSOState.activeModuleId === SO_MODULE_ID;
      var soExpanded = query ? true : CSOState.expandedFolders.has(SO_FOLDER_ID);
      var soWrap = el('div', 'cso-nav-folder cso-nav-system-ops' + (soActive ? ' is-current' : ''));
      var soBtn = el('button', 'cso-nav-folder-btn' + (soActive ? ' is-active' : ''));
      soBtn.type = 'button';
      soBtn.id = 'navTabSystemOps';
      soBtn.setAttribute('aria-expanded', String(soExpanded));
      if (soActive) soBtn.setAttribute('aria-current', 'page');
      soBtn.title = 'System, Security & Billing — Audit Logs, Sessions, Flags, Redirects & Backups';
      var soLeft = el('span', 'cso-nav-folder-left');
      soLeft.appendChild(el('span', 'cso-nav-folder-icon', '\u2699\uFE0F'));
      soLeft.appendChild(el('span', 'cso-nav-folder-title', 'System, Security & Billing'));
      var soRight = el('span', 'cso-nav-folder-right');
      soRight.appendChild(el('span', 'cso-nav-count cso-tabular', CSOState.systemOpsCount === null ? '\u2026' : String(CSOState.systemOpsCount)));
      soRight.appendChild(createChevronEl(soExpanded, false));
      soBtn.appendChild(soLeft);
      soBtn.appendChild(soRight);
      soBtn.addEventListener('click', function () {
        if (CSOState.expandedFolders.has(SO_FOLDER_ID)) CSOState.expandedFolders.delete(SO_FOLDER_ID);
        else CSOState.expandedFolders.add(SO_FOLDER_ID);
        persistOpenGroups();
        if (!soActive) openSystemOps(CSOState.activeSystemOpsSubTab || 'security');
        else renderNavigationTree();
        if (window.innerWidth <= 900) closeMobileDrawer();
      });

      var soModList = el('div', 'cso-nav-modules' + (soExpanded ? '' : ' is-collapsed'));
      soModList.id = 'systemOpsSidebarSubnav';
      soModList.hidden = !soExpanded;
      filteredSoSubs.forEach(function (sub) {
        var isSoSubActive = soActive && CSOState.activeSystemOpsSubTab === sub.tab;
        var sb = el('button', 'cso-nav-mod-btn' + (isSoSubActive ? ' is-active' : ''));
        sb.type = 'button';
        sb.setAttribute('data-system-ops-tab', sub.tab);
        sb.appendChild(el('span', 'cso-nav-mod-num', sub.num));
        sb.appendChild(el('span', 'cso-nav-mod-title', sub.title));
        sb.appendChild(el('span', 'cso-nav-mod-tag is-live', sub.tag));
        sb.addEventListener('click', function () {
          openSystemOps(sub.tab);
          if (window.innerWidth <= 900) closeMobileDrawer();
        });
        soModList.appendChild(sb);
      });
      soWrap.appendChild(soBtn);
      soWrap.appendChild(soModList);
      dom.accordionNav.appendChild(soWrap);
    }

    if (dom.searchCountBadge) {
      if (query) {
        dom.searchCountBadge.hidden = false;
        dom.searchCountBadge.textContent = String(matchCount);
      } else {
        dom.searchCountBadge.hidden = true;
      }
    }
    if (dom.moduleSearchClearBtn) {
      dom.moduleSearchClearBtn.hidden = !query;
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
    if (isInformativeGuidesId(targetId)) return { folderId: IG_FOLDER_ID, moduleId: IG_MODULE_ID };
    if (isHomepageStudioId(targetId)) return { folderId: WS_FOLDER_ID, moduleId: WS_MODULE_ID };
    if (isWebStudioId(targetId)) return { folderId: WS_FOLDER_ID, moduleId: WS_MODULE_ID };
    if (isFileManagerId(targetId)) return { folderId: FM_FOLDER_ID, moduleId: FM_MODULE_ID };
    if (isSystemOpsId(targetId)) return { folderId: SO_FOLDER_ID, moduleId: SO_MODULE_ID };
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
    openWebStudio('homepage');
  }

  function openWebStudio(initialTab, initialLegalView) {
    var tabKey = initialTab || CSOState.activeWebStudioSubTab || 'homepage';
    CSOState.activeFolderId = WS_FOLDER_ID;
    CSOState.activeModuleId = WS_MODULE_ID;
    CSOState.activeWebStudioSubTab = tabKey;
    CSOState.expandedFolders.add(WS_FOLDER_ID);
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', WS_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#web-studio' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#web-studio');
    }
    var subLabels = { homepage: 'Homepage & Blocks', legal: 'Institutional & Legal Pages', snippets: 'Global Snippets & Menus' };
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Web & Page Studio';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = subLabels[tabKey] || 'Web & Page Studio';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Web & Page Studio';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live D1 · Edge HTML';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOWebStudio) {
      window.CSOWebStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey, initialLegalView);
    } else if (window.CSOHomepageStudio) {
      window.CSOHomepageStudio.render(dom.workspaceRoot, dom.moduleHeaderActions);
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'Web & Page Studio unavailable'));
      card.appendChild(el('p', '', 'The Web & Page Studio script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function openFileManager() {
    CSOState.activeFolderId = FM_FOLDER_ID;
    CSOState.activeModuleId = FM_MODULE_ID;
    try { localStorage.setItem('cso_active_module_id', FM_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#file-manager' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#file-manager');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'File & Media Manager';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Cloudflare R2 Storage';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'File & Media Manager';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'R2 CSO_FILES · /files/:key';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOFileManager) {
      window.CSOFileManager.render(dom.workspaceRoot, dom.moduleHeaderActions);
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'File & Media Manager unavailable'));
      card.appendChild(el('p', '', 'The File Manager script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function openSystemOps(initialTab) {
    var tabKey = initialTab || CSOState.activeSystemOpsSubTab || 'security';
    CSOState.activeFolderId = SO_FOLDER_ID;
    CSOState.activeModuleId = SO_MODULE_ID;
    CSOState.activeSystemOpsSubTab = tabKey;
    CSOState.expandedFolders.add(SO_FOLDER_ID);
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', SO_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#system-ops' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#system-ops');
    }
    var subLabels = { security: 'Security & Audit Logs', system: 'System, Flags & SEO', billing: 'Payments & Ads' };
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'System, Security & Billing';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = subLabels[tabKey] || 'Security & Audit Logs';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'System, Security & Billing';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Edge Guard · Live D1';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOSystemOps) {
      window.CSOSystemOps.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey);
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'System & Security Ops unavailable'));
      card.appendChild(el('p', '', 'The System Ops script failed to load. Reload the page.'));
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

  function openCareersPublishingStudio(initialTab, initialTrackSlug) {
    var tabKey = initialTab || 'list';
    CSOState.activeFolderId = CR_FOLDER_ID;
    CSOState.activeModuleId = CR_MODULE_ID;
    CSOState.activeCareersSubTab = tabKey;
    CSOState.activeCareersTrackSlug = tabKey === 'list' ? (initialTrackSlug || '') : '';
    CSOState.expandedFolders.add(CR_FOLDER_ID);
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', CR_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#careers-studio' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#careers-studio');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Careers';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Careers Publishing House';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Careers Publishing House';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live Synced · Public Careers ▾';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOCareersPublishingStudio) {
      window.CSOCareersPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey, CSOState.activeCareersTrackSlug);
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'Careers Publishing House unavailable'));
      card.appendChild(el('p', '', 'The Careers Publishing Studio script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function openInformativeGuidesStudio(initialTab, existingGuide) {
    var tabKey = initialTab || 'all';
    CSOState.activeFolderId = IG_FOLDER_ID;
    CSOState.activeModuleId = IG_MODULE_ID;
    CSOState.activeGuidesSubTab = tabKey === 'new' ? 'all' : tabKey;
    CSOState.expandedFolders.add(IG_FOLDER_ID);
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', IG_MODULE_ID); } catch (_e) {}
    if (window.location.hash !== '#informative-guides' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#informative-guides');
    }
    var subLabels = {
      all: 'All Articles & Guides',
      'how-to': 'Step-by-Step How-To Guides',
      'exam-strategy': 'Exam Strategy & Study Handbooks',
      'citizen-scheme': 'Citizen & Scheme Explainers',
      'odisha-gk': 'Odisha GK & Heritage',
      drafts: 'Drafts',
      new: 'New Informative Article / Guide'
    };
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Informative Articles & Guides';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = subLabels[tabKey] || 'All Articles & Guides';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = tabKey === 'new' ? 'New Informative Article / Guide' : 'Informative Articles & Guides';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = 'Live /guides/ · R2 · Vectorize';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOGuidesPublishingStudio) {
      if (tabKey === 'new' || existingGuide) {
        window.CSOGuidesPublishingStudio.renderComposer(dom.workspaceRoot, dom.moduleHeaderActions, existingGuide || null, {
          onBack: function () { openInformativeGuidesStudio(CSOState.activeGuidesSubTab || 'all'); }
        });
      } else {
        window.CSOGuidesPublishingStudio.renderFolderView(dom.workspaceRoot, dom.moduleHeaderActions, tabKey);
      }
    } else {
      var card = el('div', 'cso-empty-state');
      card.appendChild(el('h2', '', 'Informative Articles & Guides Studio unavailable'));
      card.appendChild(el('p', '', 'The Guides Publishing Studio script failed to load. Reload the page.'));
      dom.workspaceRoot.appendChild(card);
    }
  }

  function refreshGuideCount() {
    fetch('/api/admin/guides?limit=1', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.counts) {
          CSOState.guidesCount = Number(d.counts.all || 0);
          CSOState.guidesSubCounts = d.counts;
          renderNavigationTree();
        }
      })
      .catch(function () {});
  }
  window.CSOStudioRefreshGuideCount = refreshGuideCount;
  window.CSOStudioUpdateGuideCounts = function (counts) {
    if (!counts || typeof counts !== 'object') return;
    CSOState.guidesCount = Number(counts.all || 0);
    CSOState.guidesSubCounts = counts;
    renderNavigationTree();
  };

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
    fetch('/api/admin/schemes/taxonomy', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.nodes)) {
          CSOState.schemesCategoryNodes = d.nodes.filter(function (n) { return Number(n.level) === 1 && Number(n.is_published) === 1; });
          renderNavigationTree();
        }
      })
      .catch(function () {});
    fetch('/api/admin/study/taxonomy', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.nodes)) {
          CSOState.studyTrackNodes = d.nodes.filter(function (n) { return Number(n.level) === 1 && Number(n.is_published) === 1; });
          renderNavigationTree();
        }
      })
      .catch(function () {});
    fetch('/api/admin/community/taxonomy', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.nodes)) {
          CSOState.communityChannelNodes = d.nodes.filter(function (n) { return Number(n.level) === 1 && Number(n.is_published) === 1; });
          renderNavigationTree();
        }
      })
      .catch(function () {});
    fetch('/api/admin/careers', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.stats) { CSOState.careersCount = d.stats.total; }
        if (d && d.taxonomy && Array.isArray(d.taxonomy.tracks)) {
          CSOState.careersTrackNodes = d.taxonomy.tracks;
        }
        if (d && Array.isArray(d.items)) {
          var tMap = {};
          d.items.forEach(function (it) {
            if (it && it.track_slug && it.status === 'published') tMap[it.track_slug] = (tMap[it.track_slug] || 0) + 1;
          });
          CSOState.careersTrackCounts = tMap;
        }
        if (d) renderNavigationTree();
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
    refreshGuideCount();
  }

  function selectModule(folderId, moduleId) {
    if (isOverviewId(moduleId) || isOverviewId(folderId)) { openCommandOverview(); return; }
    if (isCareersStudioId(moduleId) || isCareersStudioId(folderId)) { openCareersPublishingStudio(); return; }
    if (isInformativeGuidesId(moduleId) || isInformativeGuidesId(folderId)) { openInformativeGuidesStudio('all'); return; }
    if (isWebStudioId(moduleId) || isWebStudioId(folderId)) { openWebStudio(); return; }
    if (isHomepageStudioId(moduleId) || isHomepageStudioId(folderId)) { openWebStudio('homepage'); return; }
    if (isFileManagerId(moduleId) || isFileManagerId(folderId)) { openFileManager(); return; }
    if (isSystemOpsId(moduleId) || isSystemOpsId(folderId)) { openSystemOps(); return; }
    if (folderId === 'folder-about' || moduleId === 'folder-about') { openWebStudio('legal', 'about_studio'); return; }
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

  function openSchemesPublishingStudio(initialTab, categoryId) {
    var tabKey = initialTab || 'articles';
    CSOState.activeFolderId = 'folder-schemes-benefits';
    CSOState.activeModuleId = 'folder-schemes-benefits';
    CSOState.activeSchemesSubTab = tabKey;
    if (categoryId !== undefined) CSOState.activeSchemesCategoryId = categoryId || '';
    CSOState.expandedFolders.add('folder-schemes-benefits');
    persistOpenGroups();
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
      window.CSOSchemesPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey, CSOState.activeSchemesCategoryId);
    }
  }

  function openStudyPublishingStudio(initialTab, initialTrackId) {
    var tabKey = initialTab || 'articles';
    CSOState.activeFolderId = 'folder-study-library';
    CSOState.activeModuleId = 'folder-study-library';
    CSOState.activeStudySubTab = tabKey;
    CSOState.activeStudyTrackId = (tabKey === 'articles' && initialTrackId) ? String(initialTrackId) : '';
    CSOState.expandedFolders.add('folder-study-library');
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', 'folder-study-library'); } catch (_e) {}
    if (window.location.hash !== '#folder-study-library' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#folder-study-library');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Study Library';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Study Library Publishing House';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Study Library & Curriculum Studio';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '4-Track D1 · R2';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOStudyPublishingStudio) {
      window.CSOStudyPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey, CSOState.activeStudyTrackId);
    }
  }

  function openCommunityPublishingStudio(initialTab, initialChannelId) {
    var tabKey = initialTab || 'feed';
    CSOState.activeFolderId = 'folder-community';
    CSOState.activeModuleId = 'folder-community';
    CSOState.activeCommunitySubTab = tabKey;
    CSOState.activeCommunityChannelId = (tabKey === 'feed' && initialChannelId) ? String(initialChannelId) : '';
    CSOState.expandedFolders.add('folder-community');
    persistOpenGroups();
    try { localStorage.setItem('cso_active_module_id', 'folder-community'); } catch (_e) {}
    if (window.location.hash !== '#folder-community' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#folder-community');
    }
    if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = 'Community';
    if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = 'Community Moderation & Publishing Studio';
    if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = 'Community Moderation & Publishing Studio';
    if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = '4-Channel Live Sync';
    renderNavigationTree();
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);
    if (window.CSOCommunityPublishingStudio) {
      window.CSOCommunityPublishingStudio.render(dom.workspaceRoot, dom.moduleHeaderActions, tabKey, CSOState.activeCommunityChannelId);
    }
  }

  function openAboutPublishingStudio(initialTab) {
    openWebStudio('legal', 'about_studio');
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
        caCard.hidden = false;
        dom.workspaceRoot.appendChild(caCard);
        if (window.CSOFastPublish && window.CSOFastPublish.initCurrentAffairsPublisher) {
          window.CSOFastPublish.initCurrentAffairsPublisher(caCard);
        }
      }
      if (jobCard && (folderId === 'folder-jobs-careers' || moduleId === 'module-01-001')) {
        jobCard.hidden = false;
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
      caCard.hidden = false;
      dom.workspaceRoot.appendChild(caCard);
      if (window.CSOFastPublish && window.CSOFastPublish.initCurrentAffairsPublisher) {
        window.CSOFastPublish.initCurrentAffairsPublisher(caCard);
      }
    }
    if (jobCard) {
      jobCard.hidden = false;
      dom.workspaceRoot.appendChild(jobCard);
      if (window.CSOFastPublish && window.CSOFastPublish.initJobsDirectoryPublisher) {
        window.CSOFastPublish.initJobsDirectoryPublisher(jobCard);
      }
    }
  }

  function openQuickCreateRoute(targetRoute) {
    if (window.CSOQuickCreate && window.CSOQuickCreate.ROUTE_META && window.CSOQuickCreate.ROUTE_META[targetRoute]) {
      closeCreateDropdown();
      clearNode(dom.workspaceRoot);
      clearNode(dom.moduleHeaderActions);
      var qMeta = window.CSOQuickCreate.ROUTE_META[targetRoute];
      if (dom.breadcrumbFolder) dom.breadcrumbFolder.textContent = qMeta.folder || 'Quick Create';
      if (dom.breadcrumbModule) dom.breadcrumbModule.textContent = qMeta.title || 'Create Content';
      if (dom.activeModuleTitleText) dom.activeModuleTitleText.textContent = qMeta.title || 'Create Content';
      if (dom.activeModuleIdPill) dom.activeModuleIdPill.textContent = qMeta.pill || 'Live D1 / R2';
      window.CSOQuickCreate.open(targetRoute, dom.workspaceRoot, dom.moduleHeaderActions);
      if (window.innerWidth <= 900) closeMobileDrawer();
      return;
    }
    if (targetRoute === 'guides/new' && window.CSOGuidesPublishingStudio) {
      closeCreateDropdown();
      openInformativeGuidesStudio('new');
      if (window.innerWidth <= 900) closeMobileDrawer();
      return;
    }
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
    if (targetRoute === 'mock-tests/new' && window.CSOStudyPublishingStudio) {
      closeCreateDropdown();
      openStudyPublishingStudio('mock_tests', '');
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
      caCard.hidden = false;
      dom.workspaceRoot.appendChild(caCard);
      if (window.CSOFastPublish && window.CSOFastPublish.initCurrentAffairsPublisher) {
        window.CSOFastPublish.initCurrentAffairsPublisher(caCard);
      }
    }
    if (targetRoute === 'jobs/new' && jobCard) {
      jobCard.hidden = false;
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
    if (val === 'odisha') return 'utkal-bharat';
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
    var dataTheme = safe === 'utkal-bharat' ? 'odisha' : safe;
    document.documentElement.setAttribute('data-theme', dataTheme);
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

  function closeAdminUserMenu() {
    if (dom.adminUserDropdown) dom.adminUserDropdown.hidden = true;
    if (dom.btnAdminUserMenu) dom.btnAdminUserMenu.setAttribute('aria-expanded', 'false');
  }

  function wireTopbarEvents() {
    if (dom.btnCreateNewMenu && dom.createNewDropdown) {
      dom.btnCreateNewMenu.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAdminUserMenu();
        closeThemePopover();
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

    if (dom.btnAdminUserMenu && dom.adminUserDropdown) {
      dom.btnAdminUserMenu.addEventListener('click', function (e) {
        e.stopPropagation();
        closeCreateDropdown();
        closeThemePopover();
        var nextHidden = !dom.adminUserDropdown.hidden;
        dom.adminUserDropdown.hidden = nextHidden;
        dom.btnAdminUserMenu.setAttribute('aria-expanded', String(!nextHidden));
      });

      dom.adminUserDropdown.querySelectorAll('[data-admin-menu-action]').forEach(function (item) {
        item.addEventListener('click', function () {
          var action = item.getAttribute('data-admin-menu-action');
          closeAdminUserMenu();
          if (action === 'palette') {
            if (window.CSOCommandSuite && typeof window.CSOCommandSuite.openPalette === 'function') {
              window.CSOCommandSuite.openPalette();
            }
          } else if (action === 'users') {
            selectModule(CH_FOLDER_ID, CH_MODULE_ID);
          } else if (action === 'ops') {
            selectModule(SO_FOLDER_ID, SO_MODULE_ID);
            fetch('/api/admin/purge-caches', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
              body: '{}'
            })
              .then(function (r) { if (r.ok) showToast('Public edge caches purged!', 'ok'); })
              .catch(function () {});
          } else if (action === 'signout') {
            var signOutBtn = document.getElementById('btnSignOut');
            if (signOutBtn) signOutBtn.click();
          }
        });
      });

      document.addEventListener('click', function (e) {
        if (!dom.adminUserDropdown.hidden && dom.adminUserMenuWrap && !dom.adminUserMenuWrap.contains(e.target)) {
          closeAdminUserMenu();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var wasUserMenuOpen = dom.adminUserDropdown && !dom.adminUserDropdown.hidden;
        closeCreateDropdown();
        closeThemePopover();
        closeAdminUserMenu();
        closeModal();
        closeMobileDrawer();
        if (wasUserMenuOpen && dom.btnAdminUserMenu) dom.btnAdminUserMenu.focus();
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
    if (dom.moduleSearchClearBtn && dom.moduleSearchInput) {
      dom.moduleSearchClearBtn.addEventListener('click', function () {
        dom.moduleSearchInput.value = '';
        CSOState.searchQuery = '';
        renderNavigationTree();
        dom.moduleSearchInput.focus();
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
  window.CSOAiCoAuthor = {
    renderDrawer: function (opts) {
      var o = opts || {};
      var details = document.createElement('details');
      details.className = 'cso-ai-drawer';

      var summary = document.createElement('summary');
      summary.className = 'cso-ai-drawer-summary';
      var titleSpan = document.createElement('span');
      titleSpan.textContent = '\u2728 AI Co-Author (Free Tier)';
      var badgeSpan = document.createElement('span');
      badgeSpan.className = 'cso-ai-badge';
      badgeSpan.textContent = '$0 Free Quota';
      summary.appendChild(titleSpan);
      summary.appendChild(badgeSpan);
      details.appendChild(summary);

      var body = document.createElement('div');
      body.className = 'cso-ai-drawer-body';

      var hint = document.createElement('p');
      hint.className = 'cso-ai-hint';
      hint.textContent = o.hint || 'Paste raw official notice text or enter a topic. Generates bilingual English + ଓଡ଼ିଆ fields using free-tier AI.';
      body.appendChild(hint);

      var textarea = document.createElement('textarea');
      textarea.className = 'cso-ai-textarea';
      textarea.rows = 4;
      textarea.placeholder = o.placeholder || 'Paste notification text, eligibility criteria, or exam topic...';
      body.appendChild(textarea);

      var actions = document.createElement('div');
      actions.className = 'cso-ai-actions';

      var genBtn = document.createElement('button');
      genBtn.type = 'button';
      genBtn.className = 'cso-btn-primary cso-ai-gen-btn';
      genBtn.textContent = '\u2728 Generate Bilingual Draft (Free)';
      actions.appendChild(genBtn);

      var statusEl = document.createElement('span');
      statusEl.className = 'cso-ai-status';
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
      actions.appendChild(statusEl);
      body.appendChild(actions);

      genBtn.addEventListener('click', function () {
        var raw = textarea.value.trim();
        if (raw.length < 8) {
          statusEl.textContent = 'Enter at least 8 characters of source text or topic.';
          textarea.focus();
          return;
        }
        genBtn.disabled = true;
        genBtn.textContent = 'Generating…';
        statusEl.textContent = 'Contacting free-tier AI…';
        fetch('/api/admin/ai-coauthor', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: o.mode || 'job', input: raw })
        })
          .then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (d) {
              if (!r.ok || !d.ok) throw new Error(d.error || 'AI generation failed.');
              return d;
            });
          })
          .then(function (res) {
            if (typeof o.onApply === 'function') o.onApply(res.data || {}, res);
            var u = res.usage || {};
            statusEl.textContent = 'Applied via ' + (res.provider === 'gemini_free' ? 'Gemini 2.5 Flash (Free)' : 'Workers AI') +
              (u.neurons_used !== undefined ? (' · ' + u.neurons_used + ' / ' + (u.daily_limit || 10000) + ' neurons today') : '');
            showToast('AI Co-Author draft applied!', 'ok');
          })
          .catch(function (err) {
            statusEl.textContent = err.message || 'Generation failed.';
            showToast(err.message || 'AI generation failed.', 'crimson');
          })
          .finally(function () {
            genBtn.disabled = false;
            genBtn.textContent = '\u2728 Generate Bilingual Draft (Free)';
          });
      });

      details.appendChild(body);
      return details;
    },
    translateToOdia: function (txt) {
      return window.CSOAiTools ? window.CSOAiTools.translateToOdia(txt) : Promise.reject(new Error('AI Tools unavailable'));
    },
    translateFieldsBatch: function (map) {
      return window.CSOAiTools ? window.CSOAiTools.translateFieldsBatch(map) : Promise.reject(new Error('AI Tools unavailable'));
    },
    suggestMeta: function (txt, kind) {
      return window.CSOAiTools ? window.CSOAiTools.suggestMeta(txt, kind) : Promise.reject(new Error('AI Tools unavailable'));
    },
    createOdiaTranslateBtn: function (opts) {
      return window.CSOAiTools ? window.CSOAiTools.createOdiaTranslateBtn(opts) : document.createDocumentFragment();
    },
    createTranslateAllBtn: function (pairsFn, onDone) {
      return window.CSOAiTools ? window.CSOAiTools.createTranslateAllBtn(pairsFn, onDone) : document.createDocumentFragment();
    },
    renderMetaSuggester: function (opts) {
      return window.CSOAiTools ? window.CSOAiTools.renderMetaSuggester(opts) : document.createDocumentFragment();
    },
    createQuickModeToggle: function (initialOn, onChange) {
      return window.CSOAiTools ? window.CSOAiTools.createQuickModeToggle(initialOn, onChange) : null;
    }
  };
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
    setCareersTrackNodes: function (tracks, countsMap) {
      if (Array.isArray(tracks)) CSOState.careersTrackNodes = tracks;
      if (countsMap && typeof countsMap === 'object') CSOState.careersTrackCounts = countsMap;
      renderNavigationTree();
    },
    setCareersActiveTrack: function (slug) {
      var next = slug || '';
      if (CSOState.activeCareersTrackSlug !== next) { CSOState.activeCareersTrackSlug = next; renderNavigationTree(); }
    },
    openCareersTrack: function (slug) { openCareersPublishingStudio('list', slug || ''); },
    setSchemesSubTab: function (tab) {
      if (tab && CSOState.activeSchemesSubTab !== tab) { CSOState.activeSchemesSubTab = tab; renderNavigationTree(); }
    },
    setSchemesCategoryNodes: function (nodes) {
      if (!Array.isArray(nodes)) return;
      CSOState.schemesCategoryNodes = nodes.filter(function (n) { return Number(n.level) === 1 && Number(n.is_published) === 1; });
      renderNavigationTree();
    },
    setSchemesActiveCategory: function (l1Id) {
      var next = l1Id || '';
      if (CSOState.activeSchemesCategoryId !== next) { CSOState.activeSchemesCategoryId = next; renderNavigationTree(); }
    },
    openSchemesCategory: function (l1Id) { openSchemesPublishingStudio('articles', l1Id || ''); },
    setStudySubTab: function (tab) {
      if (tab && CSOState.activeStudySubTab !== tab) { CSOState.activeStudySubTab = tab; renderNavigationTree(); }
    },
    setStudyTrackNodes: function (nodes) {
      if (!Array.isArray(nodes)) return;
      CSOState.studyTrackNodes = nodes.filter(function (n) { return Number(n.level) === 1 && Number(n.is_published) === 1; });
      renderNavigationTree();
    },
    setStudyActiveTrack: function (l1Id) {
      var next = l1Id || '';
      if (CSOState.activeStudyTrackId !== next) { CSOState.activeStudyTrackId = next; renderNavigationTree(); }
    },
    openStudyTrack: function (l1Id) { openStudyPublishingStudio('articles', l1Id || ''); },
    setCommunitySubTab: function (tab) {
      if (tab && CSOState.activeCommunitySubTab !== tab) { CSOState.activeCommunitySubTab = tab; renderNavigationTree(); }
    },
    setCommunityChannelNodes: function (nodes) {
      if (!Array.isArray(nodes)) return;
      CSOState.communityChannelNodes = nodes.filter(function (n) { return Number(n.level) === 1 && Number(n.is_published) === 1; });
      renderNavigationTree();
    },
    setCommunityActiveChannel: function (l1Id) {
      var next = l1Id || '';
      if (CSOState.activeCommunityChannelId !== next) { CSOState.activeCommunityChannelId = next; renderNavigationTree(); }
    },
    setCommunityModerationCount: function (n) {
      var next = Number(n || 0);
      if (CSOState.communityModerationCount !== next) { CSOState.communityModerationCount = next; renderNavigationTree(); }
    },
    openCommunityChannel: function (l1Id) { openCommunityPublishingStudio('feed', l1Id || ''); },
    openCandidateHubTab: function (tab) { openCandidateHubStudio(tab); },
    openJobsPublishingTab: function (tab) { openJobsPublishingStudio(tab); },
    openCareersPublishingTab: function (tab) { openCareersPublishingStudio(tab); },
    openSchemesPublishingTab: function (tab) { openSchemesPublishingStudio(tab); },
    openStudyPublishingTab: function (tab) { openStudyPublishingStudio(tab); },
    openGuidesPublishingTab: function (tab) { openInformativeGuidesStudio(tab || 'all'); },
    openGuidesComposer: function (guide) { openInformativeGuidesStudio('new', guide || null); },
    setGuidesSubTab: function (tab) {
      if (tab && CSOState.activeGuidesSubTab !== tab) { CSOState.activeGuidesSubTab = tab; renderNavigationTree(); }
    },
    openCommunityPublishingTab: function (tab) { openCommunityPublishingStudio(tab); },
    openAboutPublishingTab: function (tab) { openAboutPublishingStudio(tab); },
    openWebStudioTab: function (tab, legalView) { openWebStudio(tab, legalView); },
    openFileManager: function () { openFileManager(); },
    openSystemOpsTab: function (tab) { openSystemOps(tab); },
    setFilesCount: function (n) {
      if (CSOState.filesCount !== n) { CSOState.filesCount = n; renderNavigationTree(); }
    },
    setWebStudioSubTab: function (tab) {
      if (tab && CSOState.activeWebStudioSubTab !== tab) { CSOState.activeWebStudioSubTab = tab; renderNavigationTree(); }
    },
    setSystemOpsSubTab: function (tab) {
      if (tab && CSOState.activeSystemOpsSubTab !== tab) { CSOState.activeSystemOpsSubTab = tab; renderNavigationTree(); }
    },
    refreshBrandSummary: refreshBrandSummary,
    getSchema: function () { return masterNavigationSchema; }
  };

  window.addEventListener('DOMContentLoaded', async function () {
    initSessionTimer();
    applyTheme(readStoredTheme());
    wireTopbarEvents();
    try {
      if (localStorage.getItem('cso_sidebar_collapsed') === '1') setSidebarCollapsed(true);
    } catch (_e) {}
    await Promise.all([loadMasterNavigation(), hydrateSessionIdentity()]);
    var hashId = (window.location.hash || '').replace(/^#/, '');
    var folderParam = '';
    try { folderParam = new URLSearchParams(window.location.search).get('folder') || ''; } catch (_e) {}
    var explicitTarget = resolveModuleTarget(hashId) || resolveModuleTarget(folderParam);
    var target = explicitTarget || { folderId: OV_FOLDER_ID, moduleId: OV_MODULE_ID };
    if (explicitTarget && explicitTarget.folderId && !isOverviewId(explicitTarget.folderId)) {
      CSOState.expandedFolders.add(explicitTarget.folderId);
    }
    renderNavigationTree();
    selectModule(target.folderId, target.moduleId);
    refreshHomepageCount();
    refreshBrandSummary();
  });
})(window, document);
